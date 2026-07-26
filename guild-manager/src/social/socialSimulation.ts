import { GUILD_DUNGEON_ACTIVITY } from "../constants";
import { isMissionBoardAvailableStatus } from "../missions/missionRosterGuards";
import {
  evaluateMissionKeyAccess,
  getCharacterOwnedKeys,
} from "../missions/missionHelpers";
import type { Character } from "../types/characterTypes";
import type { Mission } from "../types/missionTypes";
import { getDeterministicResponseDelayMs, renderChatTemplate } from "./chatTemplates";
import type {
  ChatChannel,
  ChatIntent,
  ChatMessage,
  LfgSearch,
  PartyParticipant,
  ReadyLfgGroup,
  SocialState,
} from "./chatTypes";

export const MAX_CHAT_MESSAGES = 200;
export const MAX_LFG_SEARCH_HISTORY = 20;
export const MAX_ACTIVE_LFG_SEARCHES = 3;
export const LFG_GUILD_SEARCH_DURATION_MS = 15_000;
export const LFG_GENERAL_SEARCH_DURATION_MS = 60_000;
export const LFG_SEARCH_CHECKPOINT_MS = 30_000;

const EMPTY_READ_STATE = { guild: 0, general: 0 } as const;

export const createInitialSocialState = (): SocialState => ({
  messages: [],
  searches: [],
  reservedRealmPlayerIds: [],
  nextSequence: 1,
  lastSearchCheckpoint: -1,
  lastReadSequenceByChannel: { ...EMPTY_READ_STATE },
});

const ACTIVE_SEARCH_PHASES = new Set([
  "guild",
  "general",
  "ready",
  "in-progress",
]);

export const ensureSocialState = (value: unknown): SocialState => {
  const input =
    value && typeof value === "object"
      ? (value as Partial<SocialState>)
      : createInitialSocialState();
  const messages = (Array.isArray(input.messages) ? input.messages : [])
    .filter((message): message is ChatMessage => Boolean(message?.id && message?.channel))
    .slice(-MAX_CHAT_MESSAGES);
  const searches = (Array.isArray(input.searches) ? input.searches : [])
    .filter((search): search is LfgSearch => Boolean(search?.id && search?.missionId))
    .slice(-MAX_LFG_SEARCH_HISTORY);
  const highestSequence = messages.reduce(
    (maximum, message) => Math.max(maximum, Number(message.sequence) || 0),
    0,
  );
  const reservedRealmPlayerIds = [
    ...new Set(
      searches
        .filter((search) => ACTIVE_SEARCH_PHASES.has(search.phase))
        .flatMap((search) =>
          search.participants
            .filter((participant) => participant.source === "realm")
            .map((participant) => participant.id),
        ),
    ),
  ];
  const rawLastSearchCheckpoint = Number(input.lastSearchCheckpoint);

  return {
    messages,
    searches,
    reservedRealmPlayerIds,
    nextSequence: Math.max(
      highestSequence + 1,
      Math.floor(Number(input.nextSequence) || 1),
    ),
    lastSearchCheckpoint: Number.isFinite(rawLastSearchCheckpoint)
      ? Math.floor(rawLastSearchCheckpoint)
      : -1,
    lastReadSequenceByChannel: {
      guild: Math.max(
        0,
        Math.floor(Number(input.lastReadSequenceByChannel?.guild) || 0),
      ),
      general: Math.max(
        0,
        Math.floor(Number(input.lastReadSequenceByChannel?.general) || 0),
      ),
    },
  };
};

const toParticipant = (
  character: Record<string, unknown>,
  source: "guild" | "realm",
  realmGuildName?: string | null,
): PartyParticipant => ({
  id: String(character.id || ""),
  source,
  name: String(character.name || "Unknown Adventurer"),
  faction: character.faction ? String(character.faction) : undefined,
  race: character.race ? String(character.race) : undefined,
  gender: character.gender ? String(character.gender) : undefined,
  charClass: character.charClass ? String(character.charClass) : undefined,
  role: character.role ? String(character.role) : "DPS",
  level: Math.max(1, Math.floor(Number(character.level) || 1)),
  itemLevel: Math.max(
    0,
    Number(character.itemLevel ?? character.averageItemLevel) || 0,
  ),
  guildName:
    source === "guild"
      ? null
      : realmGuildName ||
        (character.sourceGuildName ? String(character.sourceGuildName) : null),
  personalityTraits: Array.isArray(character.personalityTraits)
    ? (character.personalityTraits as Character["personalityTraits"])
    : [],
});

const getMissionLevelRange = (mission: Mission) => {
  const recommendedValues = String(mission.recommended || "")
    .match(/\d+/g)
    ?.map(Number)
    .filter((value) => Number.isFinite(value));
  const minimum = Math.max(
    1,
    Math.floor(
      Number(
        mission.entryLevel ??
          mission.minLevel ??
          recommendedValues?.[0] ??
          mission.level ??
          1,
      ) || 1,
    ),
  );
  const maximum = Math.max(
    minimum,
    Math.floor(
      Number(
        recommendedValues?.[recommendedValues.length - 1] ??
          mission.level ??
          minimum + 5,
      ) || minimum + 5,
    ),
  );
  return { minimum, maximum };
};

const getMissionTargetSize = (mission: Mission) =>
  Math.max(
    2,
    Math.floor(
      Number(mission.requiredPartySize ?? mission.minPartySize) ||
        (mission.type === "dungeon" ? 5 : 3),
    ),
  );

const isSupportedLfgMission = (mission: Mission) =>
  mission?.isRaid !== true &&
  mission?.requiresKeyForAllMembers !== true &&
  ((mission?.type === "dungeon" && getMissionTargetSize(mission) === 5) ||
    mission?.isZoneElite === true ||
    mission?.elite === true);

const isCharacterEligible = (
  character: Record<string, unknown>,
  mission: Mission,
) => {
  const level = Math.max(1, Number(character.level) || 1);
  const range = getMissionLevelRange(mission);
  return level >= range.minimum && level <= range.maximum;
};

const getNeededRole = (participants: PartyParticipant[], mission: Mission) => {
  if (mission.type !== "dungeon") return null;
  const roles = participants.map((participant) => participant.role);
  if (!roles.includes("Tank")) return "Tank";
  if (!roles.includes("Healer")) return "Healer";
  return "DPS";
};

const getRequiredRoleForRemainingSlots = (
  search: LfgSearch,
  mission: Mission,
) => {
  if (mission.type !== "dungeon") return null;
  const roles = new Set(search.participants.map((participant) => participant.role));
  const missingRoles = ["Tank", "Healer"].filter((role) => !roles.has(role));
  const remainingSlots = Math.max(
    0,
    search.targetSize - search.participants.length,
  );
  return remainingSlots <= missingRoles.length ? missingRoles[0] || null : null;
};

const hasRequiredDungeonRoles = (
  participants: PartyParticipant[],
  mission: Mission,
) =>
  mission.type !== "dungeon" ||
  (participants.some((participant) => participant.role === "Tank") &&
    participants.some((participant) => participant.role === "Healer"));

const appendMessage = ({
  state,
  channel,
  intent,
  speaker,
  search,
  now,
  deferText,
}: {
  state: SocialState;
  channel: ChatChannel;
  intent: ChatIntent;
  speaker: PartyParticipant | null;
  search: LfgSearch;
  now: number;
  deferText: boolean;
}) => {
  const sequence = state.nextSequence;
  const fallbackText = renderChatTemplate({
    channel,
    intent,
    speaker,
    missionName: search.missionName,
    currentSize: search.participants.length,
    targetSize: search.targetSize,
    neededRole: getNeededRole(search.participants, {
      id: search.missionId,
      type: search.missionType === "dungeon" ? "dungeon" : "elite",
    }),
  });
  const message: ChatMessage = {
    id: `chat:${sequence}`,
    sequence,
    channel,
    intent,
    text: deferText ? "" : fallbackText,
    fallbackText,
    textSource: "template",
    generationStatus: deferText ? "pending" : "ready",
    gameTimeMs: now,
    speaker,
    searchId: search.id,
  };
  return {
    ...state,
    messages: [...state.messages, message].slice(-MAX_CHAT_MESSAGES),
    nextSequence: sequence + 1,
  };
};

const findMission = (missionList: Mission[], missionId: Mission["id"]) =>
  missionList.find((mission) => String(mission.id) === String(missionId));

const getBusyGuildMemberIds = (activeMissions: Mission[]) =>
  new Set(
    activeMissions.flatMap((mission) =>
      Array.isArray(mission.memberIds) ? mission.memberIds.map(String) : [],
    ),
  );

const selectGuildCandidate = ({
  roster,
  search,
  mission,
  activeMissions,
  reservedGuildIds,
}: {
  roster: Character[];
  search: LfgSearch;
  mission: Mission;
  activeMissions: Mission[];
  reservedGuildIds: Set<string>;
}) => {
  const participantIds = new Set(search.participantIds.map(String));
  const busyIds = getBusyGuildMemberIds(activeMissions);
  const neededRole = getNeededRole(search.participants, mission);
  const finalSlotRole = getRequiredRoleForRemainingSlots(search, mission);
  return roster
    .filter(
      (member) =>
        member?.id &&
        !participantIds.has(String(member.id)) &&
        !busyIds.has(String(member.id)) &&
        !reservedGuildIds.has(String(member.id)) &&
        isMissionBoardAvailableStatus(member.status) &&
        (!finalSlotRole || member.role === finalSlotRole) &&
        isCharacterEligible(member as unknown as Record<string, unknown>, mission),
    )
    .sort((left, right) => {
      const leftMatches = left.role === neededRole ? 1 : 0;
      const rightMatches = right.role === neededRole ? 1 : 0;
      if (leftMatches !== rightMatches) return rightMatches - leftMatches;
      return (Number(right.level) || 1) - (Number(left.level) || 1);
    })[0];
};

const selectRealmCandidate = ({
  realmState,
  search,
  mission,
  guildFaction,
  reservedRealmIds,
}: {
  realmState: Record<string, any>;
  search: LfgSearch;
  mission: Mission;
  guildFaction: string;
  reservedRealmIds: Set<string>;
}) => {
  const participantIds = new Set(search.participantIds.map(String));
  const neededRole = getNeededRole(search.participants, mission);
  const finalSlotRole = getRequiredRoleForRemainingSlots(search, mission);
  const guildNames = new Map(
    (Array.isArray(realmState?.npcGuilds) ? realmState.npcGuilds : []).map(
      (guild: Record<string, unknown>) => [String(guild.id || ""), String(guild.name || "")],
    ),
  );
  const candidate = (
    Array.isArray(realmState?.population?.players)
      ? realmState.population.players
      : []
  )
    .filter(
      (player: Record<string, unknown>) =>
        player?.id &&
        String(player.faction || "") === String(guildFaction || "") &&
        !participantIds.has(String(player.id)) &&
        !reservedRealmIds.has(String(player.id)) &&
        (!finalSlotRole || player.role === finalSlotRole) &&
        isCharacterEligible(player, mission),
    )
    .sort((left: Record<string, unknown>, right: Record<string, unknown>) => {
      const leftMatches = left.role === neededRole ? 1 : 0;
      const rightMatches = right.role === neededRole ? 1 : 0;
      if (leftMatches !== rightMatches) return rightMatches - leftMatches;
      return (Number(right.level) || 1) - (Number(left.level) || 1);
    })[0];
  if (!candidate) return null;
  return toParticipant(
    candidate,
    "realm",
    guildNames.get(String(candidate.guildId || "")) || null,
  );
};

const createSearch = ({
  state,
  now,
  roster,
  missionList,
  activeMissions,
  guildFaction,
  deferText,
}: {
  state: SocialState;
  now: number;
  roster: Character[];
  missionList: Mission[];
  activeMissions: Mission[];
  guildFaction: string;
  deferText: boolean;
}) => {
  const busyIds = getBusyGuildMemberIds(activeMissions);
  const reservedGuildIds = new Set(
    state.searches
      .filter((search) => ACTIVE_SEARCH_PHASES.has(search.phase))
      .flatMap((search) =>
        search.participants
          .filter((participant) => participant.source === "guild")
          .map((participant) => participant.id),
      ),
  );
  const availableRoster = roster.filter(
    (member) =>
      member?.id &&
      !busyIds.has(String(member.id)) &&
      !reservedGuildIds.has(String(member.id)) &&
      isMissionBoardAvailableStatus(member.status),
  );
  const missions = missionList
    .filter(isSupportedLfgMission)
    .sort((left, right) => (Number(left.level) || 1) - (Number(right.level) || 1));

  for (const mission of missions) {
    const eligible = availableRoster.filter((member) =>
      isCharacterEligible(member as unknown as Record<string, unknown>, mission),
    );
    const targetSize = getMissionTargetSize(mission);
    if (eligible.length === 0 || eligible.length >= targetSize) continue;
    if (
      !evaluateMissionKeyAccess({
        missions: [mission],
        partyMembers: eligible,
      }).canEnter
    ) {
      continue;
    }
    const requiredKeyId = mission.requiresKey
      ? String(mission.keyId || "")
      : "";
    const initiator =
      (requiredKeyId
        ? eligible.find((member) =>
            getCharacterOwnedKeys(member).includes(requiredKeyId),
          )
        : null) || eligible[0];
    if (
      mission.isZoneElite === true &&
      Array.isArray((initiator as any).clearedMissionIds) &&
      (initiator as any).clearedMissionIds.some(
        (id: unknown) => String(id) === String(mission.id),
      )
    ) {
      continue;
    }

    const participant = toParticipant(
      { ...initiator, faction: initiator.faction || guildFaction },
      "guild",
    );
    const searchSequence = state.nextSequence;
    const search: LfgSearch = {
      id: `lfg:${searchSequence}`,
      missionId: mission.id,
      missionName: mission.dungeonWing || mission.name || "Unknown Mission",
      missionType: mission.type === "dungeon" ? "dungeon" : "elite",
      targetSize,
      phase: "guild",
      createdAt: now,
      guildSearchEndsAt: now + LFG_GUILD_SEARCH_DURATION_MS,
      expiresAt:
        now +
        LFG_GUILD_SEARCH_DURATION_MS +
        LFG_GENERAL_SEARCH_DURATION_MS,
      nextResponseAt:
        now + getDeterministicResponseDelayMs(`lfg:${searchSequence}:guild`),
      participantIds: [participant.id],
      participants: [participant],
      initiatorId: participant.id,
    };
    let nextState = {
      ...state,
      searches: [...state.searches, search].slice(-MAX_LFG_SEARCH_HISTORY),
    };
    nextState = appendMessage({
      state: nextState,
      channel: "guild",
      intent: "lfg-request",
      speaker: participant,
      search,
      now,
      deferText,
    });
    return nextState;
  }

  return state;
};

export const advanceSocialSimulation = ({
  socialState,
  now,
  roster,
  realmState,
  activeMissions,
  missionList,
  guildSetup,
  deferText = false,
}: {
  socialState: unknown;
  now: number;
  roster: Character[];
  realmState: Record<string, any>;
  activeMissions: Mission[];
  missionList: Mission[];
  guildSetup: Record<string, any>;
  deferText?: boolean;
}) => {
  let state = ensureSocialState(socialState);
  let nextRoster = [...roster];
  const readyGroups: ReadyLfgGroup[] = [];
  const reservedGuildIds = new Set(
    state.searches
      .filter((search) => ACTIVE_SEARCH_PHASES.has(search.phase))
      .flatMap((search) =>
        search.participants
          .filter((participant) => participant.source === "guild")
          .map((participant) => participant.id),
      ),
  );
  const reservedRealmIds = new Set(state.reservedRealmPlayerIds);

  const nextSearches = state.searches.map((originalSearch) => {
    const search = {
      ...originalSearch,
      participants: [...originalSearch.participants],
    };
    if (search.phase !== "guild" && search.phase !== "general") return search;
    const mission = findMission(missionList, search.missionId);
    if (!mission) {
      search.phase = "expired";
      return search;
    }

    if (search.phase === "guild" && now >= search.guildSearchEndsAt) {
      search.phase = "general";
      search.nextResponseAt =
        now + getDeterministicResponseDelayMs(`${search.id}:general`);
      state = appendMessage({
        state,
        channel: "general",
        intent: "general-search",
        speaker: search.participants[0] || null,
        search,
        now,
        deferText,
      });
      return search;
    }

    if (search.phase === "general" && now >= search.expiresAt) {
      search.phase = "expired";
      state = appendMessage({
        state,
        channel: "guild",
        intent: "search-expired",
        speaker: search.participants[0] || null,
        search,
        now,
        deferText,
      });
      return search;
    }

    if (now < search.nextResponseAt) return search;
    if (search.participants.length >= search.targetSize) {
      search.nextResponseAt =
        now + getDeterministicResponseDelayMs(`${search.id}:${now}:role-wait`);
      return search;
    }

    let participant: PartyParticipant | null = null;
    if (search.phase === "guild") {
      const member = selectGuildCandidate({
        roster: nextRoster,
        search,
        mission,
        activeMissions,
        reservedGuildIds,
      });
      if (member) {
        participant = toParticipant(
          { ...member, faction: member.faction || guildSetup.faction },
          "guild",
        );
        reservedGuildIds.add(participant.id);
      }
    } else {
      participant = selectRealmCandidate({
        realmState,
        search,
        mission,
        guildFaction: guildSetup.faction,
        reservedRealmIds,
      });
      if (participant) reservedRealmIds.add(participant.id);
    }

    if (!participant) {
      search.nextResponseAt =
        now + getDeterministicResponseDelayMs(`${search.id}:${now}:retry`);
      if (search.phase === "guild") {
        const neededRole = getNeededRole(search.participants, mission);
        if (neededRole) {
          state = appendMessage({
            state,
            channel: "guild",
            intent: "role-needed",
            speaker: search.participants[0] || null,
            search,
            now,
            deferText,
          });
        }
      }
      return search;
    }

    search.participants.push(participant);
    search.participantIds.push(participant.id);
    search.nextResponseAt =
      now + getDeterministicResponseDelayMs(`${search.id}:${participant.id}`);
    state = appendMessage({
      state,
      channel: search.phase === "guild" ? "guild" : "general",
      intent: "join",
      speaker: participant,
      search,
      now,
      deferText,
    });

    if (
      search.participants.length >= search.targetSize &&
      hasRequiredDungeonRoles(search.participants, mission)
    ) {
      search.phase = "ready";
      state = appendMessage({
        state,
        channel: search.participants.some(
          (entry) => entry.source === "realm",
        )
          ? "general"
          : "guild",
        intent: "group-ready",
        speaker: search.participants[0] || null,
        search,
        now,
        deferText,
      });
      readyGroups.push({
        searchId: search.id,
        mission,
        participants: search.participants.slice(0, search.targetSize),
        guildMemberIds: search.participants
          .filter((entry) => entry.source === "guild")
          .map((entry) => entry.id),
      });
    }
    return search;
  });

  state = {
    ...state,
    searches: nextSearches.slice(-MAX_LFG_SEARCH_HISTORY),
    reservedRealmPlayerIds: [...reservedRealmIds],
  };

  const activeSearchCount = state.searches.filter((search) =>
    ACTIVE_SEARCH_PHASES.has(search.phase),
  ).length;
  const checkpoint = Math.floor(Math.max(0, now) / LFG_SEARCH_CHECKPOINT_MS);
  const lfgEnabled =
    guildSetup?.dungeonActivity &&
    guildSetup.dungeonActivity !== GUILD_DUNGEON_ACTIVITY.NONE;
  if (
    lfgEnabled &&
    checkpoint !== state.lastSearchCheckpoint &&
    activeSearchCount < MAX_ACTIVE_LFG_SEARCHES
  ) {
    state = {
      ...state,
      lastSearchCheckpoint: checkpoint,
    };
    state = createSearch({
      state,
      now,
      roster: nextRoster,
      missionList,
      activeMissions,
      guildFaction: guildSetup.faction,
      deferText,
    });
  }

  state = {
    ...state,
    reservedRealmPlayerIds: [
      ...new Set(
        state.searches
          .filter((search) => ACTIVE_SEARCH_PHASES.has(search.phase))
          .flatMap((search) =>
            search.participants
              .filter((participant) => participant.source === "realm")
              .map((participant) => participant.id),
          ),
      ),
    ],
  };

  const activeGuildParticipantIds = new Set(
    state.searches
      .filter((search) => search.phase === "guild" || search.phase === "general")
      .flatMap((search) =>
        search.participants
          .filter((participant) => participant.source === "guild")
          .map((participant) => participant.id),
      ),
  );
  nextRoster = nextRoster.map((member) => {
    const isSearching = activeGuildParticipantIds.has(String(member.id));
    if (isSearching) {
      return {
        ...member,
        status: "LFG",
        statusText: "Looking for Group...",
      };
    }
    if (member.status === "LFG") {
      return { ...member, status: "Idle", statusText: "Resting..." };
    }
    return member;
  });

  return { socialState: state, roster: nextRoster, readyGroups };
};

export const markLfgSearchStarted = ({
  socialState,
  searchId,
  missionInstanceId,
  now,
  deferText = false,
}: {
  socialState: unknown;
  searchId: string;
  missionInstanceId: string;
  now: number;
  deferText?: boolean;
}) => {
  let state = ensureSocialState(socialState);
  const search = state.searches.find((entry) => entry.id === searchId);
  if (!search) return state;
  const updatedSearch = { ...search, phase: "in-progress" as const, missionInstanceId };
  state = {
    ...state,
    searches: state.searches.map((entry) =>
      entry.id === searchId ? updatedSearch : entry,
    ),
  };
  return appendMessage({
    state,
    channel: search.participants.some((entry) => entry.source === "realm")
      ? "general"
      : "guild",
    intent: "group-start",
    speaker: search.participants[0] || null,
    search: updatedSearch,
    now,
    deferText,
  });
};

export const completeLfgMission = ({
  socialState,
  mission,
  succeeded,
  now,
  deferText = false,
}: {
  socialState: unknown;
  mission: Mission;
  succeeded: boolean;
  now: number;
  deferText?: boolean;
}) => {
  let state = ensureSocialState(socialState);
  const searchId = mission.lfgSearchId;
  if (!searchId) return state;
  const search = state.searches.find((entry) => entry.id === searchId);
  if (!search) return state;
  const completedSearch = { ...search, phase: "completed" as const };
  state = {
    ...state,
    searches: state.searches.map((entry) =>
      entry.id === searchId ? completedSearch : entry,
    ),
    reservedRealmPlayerIds: state.reservedRealmPlayerIds.filter(
      (id) =>
        !search.participants.some(
          (participant) =>
            participant.source === "realm" && participant.id === id,
        ),
    ),
  };
  return appendMessage({
    state,
    channel: "guild",
    intent: succeeded ? "mission-success" : "mission-failed",
    speaker: search.participants[0] || null,
    search: completedSearch,
    now,
    deferText,
  });
};

export const markChatChannelRead = (
  socialState: unknown,
  channel: ChatChannel,
) => {
  const state = ensureSocialState(socialState);
  const lastSequence = state.messages
    .filter((message) => message.channel === channel)
    .reduce(
      (maximum, message) => Math.max(maximum, Number(message.sequence) || 0),
      0,
    );
  return {
    ...state,
    lastReadSequenceByChannel: {
      ...state.lastReadSequenceByChannel,
      [channel]: lastSequence,
    },
  };
};

export const getUnreadChatCount = (socialState: unknown) => {
  const state = ensureSocialState(socialState);
  return state.messages.filter(
    (message) =>
      message.sequence >
      (state.lastReadSequenceByChannel[message.channel] || 0),
  ).length;
};

export const resolveChatMessageText = ({
  socialState,
  messageId,
  text,
  source,
}: {
  socialState: unknown;
  messageId: string;
  text?: string | null;
  source: ChatMessage["textSource"];
}) => {
  const state = ensureSocialState(socialState);
  return {
    ...state,
    messages: state.messages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            text: String(text || message.fallbackText).slice(0, 240),
            textSource: text ? source : "template",
            generationStatus: "ready" as const,
          }
        : message,
    ),
  };
};
