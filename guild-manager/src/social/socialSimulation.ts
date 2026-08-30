import { GUILD_DUNGEON_ACTIVITY } from "../constants";
import { isMissionBoardAvailableStatus } from "../missions/missionRosterGuards";
import {
  evaluateMissionKeyAccess,
  getCharacterOwnedKeys,
} from "../missions/missionHelpers";
import type { Character } from "../types/characterTypes";
import type { ItemDefinition } from "../types/itemTypes";
import type { Mission } from "../types/missionTypes";
import { getDeterministicResponseDelayMs, renderChatTemplate } from "./chatTemplates";
import {
  canInitiateDungeonAsHelper,
  getLfgCandidateKind,
  getLfgHelperInterest,
  MAX_LFG_HELPERS,
  passesDeterministicLfgChance,
} from "./dungeonLfgInterest";
import {
  getRelationshipPairKey,
  normalizeGuildRelationships,
} from "./relationshipSystem";
import {
  advanceRpScenes,
  enqueueMissionRpScene,
  enqueueRealmNewsRpScene,
  MAX_PROCESSED_RP_EVENTS,
  MAX_RP_QUEUE,
  MAX_RP_SCENES,
} from "./rpSimulation";
import type {
  ChatChannel,
  ChatIntent,
  ChatMessage,
  LfgSearch,
  PartyParticipant,
  ReadyLfgGroup,
  SocialState,
} from "./chatTypes";
import { isMissionAccessibleForGuild } from "../missions/missionAvailability";

export const MAX_CHAT_MESSAGES = 300;
export const MAX_LFG_SEARCH_HISTORY = 20;
export const MAX_ACTIVE_LFG_SEARCHES = 3;
export const LFG_GUILD_SEARCH_DURATION_MS = 15_000;
export const LFG_GENERAL_SEARCH_DURATION_MS = 60_000;
export const LFG_SEARCH_CHECKPOINT_MS = 30_000;

const EMPTY_READ_STATE = { guild: 0, general: 0, tavern: 0 } as const;

export const createInitialSocialState = (): SocialState => ({
  messages: [],
  searches: [],
  reservedRealmPlayerIds: [],
  nextSequence: 1,
  lastSearchCheckpoint: -1,
  lastReadSequenceByChannel: { ...EMPTY_READ_STATE },
  rpScenes: [],
  processedRpEventIds: [],
  rpDailyCounters: { dayIndex: -1, nonInteractiveScenes: 0 },
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
    .map((message) => {
      const contentKind =
        message.contentKind === "roleplay" ? "roleplay" as const : "system" as const;
      const wasLegacyPending =
        contentKind === "system" && message.generationStatus === "pending";
      return {
        ...message,
        contentKind,
        generationStatus: wasLegacyPending ? "ready" as const : message.generationStatus,
        text: wasLegacyPending ? message.text || message.fallbackText : message.text,
      };
    })
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
  const rpScenes = (Array.isArray(input.rpScenes) ? input.rpScenes : [])
    .filter((scene) => Boolean(scene?.id && scene?.sourceEventId))
    .slice(-(MAX_RP_SCENES + MAX_RP_QUEUE));

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
      tavern: Math.max(
        0,
        Math.floor(Number(input.lastReadSequenceByChannel?.tavern) || 0),
      ),
    },
    rpScenes,
    processedRpEventIds: (Array.isArray(input.processedRpEventIds)
      ? input.processedRpEventIds.map(String)
      : []
    ).slice(-MAX_PROCESSED_RP_EVENTS),
    rpDailyCounters: {
      dayIndex: Math.floor(Number(input.rpDailyCounters?.dayIndex) || -1),
      nonInteractiveScenes: Math.max(
        0,
        Math.floor(Number(input.rpDailyCounters?.nonInteractiveScenes) || 0),
      ),
    },
  };
};

export const toParticipant = (
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
) => getLfgCandidateKind(character, mission) === "core";

const getHelperCount = (search: LfgSearch, mission: Mission) =>
  search.participants.filter(
    (participant) =>
      getLfgCandidateKind(
        participant as unknown as Record<string, unknown>,
        mission,
      ) === "helper",
  ).length;

const getBestRelationshipPoints = ({
  candidateId,
  search,
  relationships,
}: {
  candidateId: unknown;
  search: LfgSearch;
  relationships: unknown;
}) => {
  const normalized = normalizeGuildRelationships(relationships) as Record<
    string,
    { points?: number }
  >;
  return search.participants
    .filter((participant) => participant.source === "guild")
    .reduce((best, participant) => {
      const pairKey = getRelationshipPairKey(candidateId, participant.id);
      return Math.max(best, Number(normalized[pairKey]?.points) || 0);
    }, 0);
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
    text: fallbackText,
    fallbackText,
    textSource: "template",
    generationStatus: "ready",
    gameTimeMs: now,
    speaker,
    contentKind: "system",
    ...(search.id ? { searchId: search.id } : {}),
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

const selectLfgCandidate = <T extends Record<string, any>>({
  candidates,
  search,
  mission,
  itemDatabase,
  relationships,
  source,
}: {
  candidates: T[];
  search: LfgSearch;
  mission: Mission;
  itemDatabase: readonly ItemDefinition[];
  relationships: unknown;
  source: "guild" | "realm";
}) => {
  const neededRole = getNeededRole(search.participants, mission);
  const finalSlotRole = getRequiredRoleForRemainingSlots(search, mission);
  const helperSlotsAvailable =
    getHelperCount(search, mission) < MAX_LFG_HELPERS;
  const eligible = candidates.filter((candidate) => {
    const kind = getLfgCandidateKind(candidate, mission);
    if (kind === "below-range") return false;
    if (kind === "helper" && !helperSlotsAvailable) return false;
    return !finalSlotRole || candidate.role === finalSlotRole;
  });

  const selectFromPool = (pool: T[], seedSuffix: string) => {
    const coreCandidate = pool
      .filter((candidate) => getLfgCandidateKind(candidate, mission) === "core")
      .sort(
        (left, right) =>
          (Number(right.level) || 1) - (Number(left.level) || 1) ||
          String(left.id).localeCompare(String(right.id)),
      )[0];
    const helperCandidates = pool
      .filter(
        (candidate) =>
          getLfgCandidateKind(candidate, mission) === "helper",
      )
      .map((candidate) => {
        const relationshipPoints =
          source === "guild"
            ? getBestRelationshipPoints({
                candidateId: candidate.id,
                search,
                relationships,
              })
            : 0;
        return {
          candidate,
          interest: getLfgHelperInterest({
            character: candidate,
            mission,
            itemDatabase,
            relationshipPoints,
          }),
        };
      })
      .sort(
        (left, right) =>
          right.interest.chance - left.interest.chance ||
          left.interest.overlevelDelta - right.interest.overlevelDelta ||
          String(left.candidate.id).localeCompare(
            String(right.candidate.id),
          ),
      );
    const helper = helperCandidates[0];
    if (coreCandidate) return coreCandidate;
    if (
      helper &&
      passesDeterministicLfgChance(
        `${search.id}:${search.nextResponseAt}:${source}:${seedSuffix}:${helper.candidate.id}:${search.participants.length}`,
        helper.interest.chance,
      )
    ) {
      return helper.candidate;
    }
    return null;
  };

  if (neededRole && !finalSlotRole) {
    const neededCandidates = eligible.filter(
      (candidate) => candidate.role === neededRole,
    );
    const selectedNeeded = selectFromPool(neededCandidates, neededRole);
    if (selectedNeeded) return selectedNeeded;
    return selectFromPool(
      eligible.filter((candidate) => candidate.role !== neededRole),
      "fallback",
    );
  }

  return selectFromPool(eligible, finalSlotRole || "open");
};

const selectGuildCandidate = ({
  roster,
  search,
  mission,
  activeMissions,
  reservedGuildIds,
  onlineGuildMemberIds,
  itemDatabase,
  relationships,
}: {
  roster: Character[];
  search: LfgSearch;
  mission: Mission;
  activeMissions: Mission[];
  reservedGuildIds: Set<string>;
  onlineGuildMemberIds?: Set<string> | null;
  itemDatabase: readonly ItemDefinition[];
  relationships: unknown;
}) => {
  const participantIds = new Set(search.participantIds.map(String));
  const busyIds = getBusyGuildMemberIds(activeMissions);
  const candidates = roster
    .filter(
      (member) =>
        member?.id &&
        !participantIds.has(String(member.id)) &&
        !busyIds.has(String(member.id)) &&
        !reservedGuildIds.has(String(member.id)) &&
        (!onlineGuildMemberIds ||
          onlineGuildMemberIds.has(String(member.id))) &&
        isMissionBoardAvailableStatus(member.status),
    );
  return selectLfgCandidate({
    candidates,
    search,
    mission,
    itemDatabase,
    relationships,
    source: "guild",
  });
};

const selectRealmCandidate = ({
  realmState,
  search,
  mission,
  guildFaction,
  reservedRealmIds,
  onlineRealmPlayerIds,
  itemDatabase,
}: {
  realmState: Record<string, any>;
  search: LfgSearch;
  mission: Mission;
  guildFaction: string;
  reservedRealmIds: Set<string>;
  onlineRealmPlayerIds?: Set<string> | null;
  itemDatabase: readonly ItemDefinition[];
}) => {
  const participantIds = new Set(search.participantIds.map(String));
  const guildNames = new Map(
    (Array.isArray(realmState?.npcGuilds) ? realmState.npcGuilds : []).map(
      (guild: Record<string, unknown>) => [String(guild.id || ""), String(guild.name || "")],
    ),
  );
  const candidates = (
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
        (!onlineRealmPlayerIds ||
          onlineRealmPlayerIds.has(String(player.id))),
    );
  const candidate = selectLfgCandidate({
    candidates,
    search,
    mission,
    itemDatabase,
    relationships: {},
    source: "realm",
  });
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
  contentPhase,
  deferText,
  itemDatabase,
}: {
  state: SocialState;
  now: number;
  roster: Character[];
  missionList: Mission[];
  activeMissions: Mission[];
  guildFaction: string;
  contentPhase?: string;
  deferText: boolean;
  itemDatabase: readonly ItemDefinition[];
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
    .filter((mission) =>
      isMissionAccessibleForGuild(mission, guildFaction, contentPhase),
    )
    .sort((left, right) => (Number(left.level) || 1) - (Number(right.level) || 1));
  const missionContexts = missions
    .map((mission) => {
      const coreEligible = availableRoster.filter((member) =>
        isCharacterEligible(
          member as unknown as Record<string, unknown>,
          mission,
        ),
      );
      return {
        mission,
        coreEligible,
        targetSize: getMissionTargetSize(mission),
        requiredKeyId: mission.requiresKey
          ? String(mission.keyId || "")
          : "",
      };
    })
    .filter(({ coreEligible, targetSize }) => coreEligible.length < targetSize);

  const startSearch = ({
    mission,
    coreEligible,
    targetSize,
    initiator,
  }: {
    mission: Mission;
    coreEligible: Character[];
    targetSize: number;
    initiator: Character;
  }) => {
    const accessMembers = coreEligible.includes(initiator)
      ? coreEligible
      : [initiator];
    if (
      !evaluateMissionKeyAccess({
        missions: [mission],
        partyMembers: accessMembers,
      }).canEnter
    ) {
      return null;
    }
    if (
      mission.isZoneElite === true &&
      Array.isArray((initiator as any).clearedMissionIds) &&
      (initiator as any).clearedMissionIds.some(
        (id: unknown) => String(id) === String(mission.id),
      )
    ) {
      return null;
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
  };

  for (const context of missionContexts) {
    const initiator =
      (context.requiredKeyId
        ? context.coreEligible.find((member) =>
            getCharacterOwnedKeys(member).includes(context.requiredKeyId),
          )
        : null) ||
      context.coreEligible[0] ||
      null;
    if (!initiator) continue;
    const nextState = startSearch({ ...context, initiator });
    if (nextState) return nextState;
  }

  const helperOptions = missionContexts
    .filter(({ mission }) => mission.type === "dungeon")
    .flatMap((context) => {
      const candidates = availableRoster
        .filter(
          (member) =>
            getLfgCandidateKind(
              member as unknown as Record<string, unknown>,
              context.mission,
            ) === "helper" &&
            (!context.requiredKeyId ||
              getCharacterOwnedKeys(member).includes(context.requiredKeyId)),
        )
        .map((member) => {
          const interest = getLfgHelperInterest({
            character: member as unknown as Record<string, unknown>,
            mission: context.mission,
            itemDatabase,
          });
          return { ...context, member, interest };
        })
        .filter(({ member, mission, interest }) =>
          canInitiateDungeonAsHelper({
            character: member as unknown as Record<string, unknown>,
            mission,
            interest,
          }),
        )
        .sort(
          (left, right) =>
            right.interest.chance - left.interest.chance ||
            left.interest.overlevelDelta - right.interest.overlevelDelta ||
            String(left.member.id).localeCompare(String(right.member.id)),
        );
      return candidates.slice(0, 1);
    })
    .sort(
      (left, right) =>
        Number(right.interest.hasUpgrade) -
          Number(left.interest.hasUpgrade) ||
        left.interest.overlevelDelta - right.interest.overlevelDelta ||
        (Number(right.mission.level) || 1) -
          (Number(left.mission.level) || 1) ||
        String(left.mission.id).localeCompare(String(right.mission.id)) ||
        String(left.member.id).localeCompare(String(right.member.id)),
    );
  const helperOption = helperOptions[0];
  if (
    helperOption &&
    passesDeterministicLfgChance(
      `lfg:${state.nextSequence}:init:${helperOption.mission.id}:${helperOption.member.id}:${now}`,
      helperOption.interest.chance,
    )
  ) {
    const nextState = startSearch({
      ...helperOption,
      initiator: helperOption.member,
    });
    if (nextState) return nextState;
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
  onlineGuildMemberIds = null,
  onlineRealmPlayerIds = null,
  currentDayIndex = 0,
  itemDatabase = [],
  relationships = {},
}: {
  socialState: unknown;
  now: number;
  roster: Character[];
  realmState: Record<string, any>;
  activeMissions: Mission[];
  missionList: Mission[];
  guildSetup: Record<string, any>;
  deferText?: boolean;
  onlineGuildMemberIds?: Set<string> | null;
  onlineRealmPlayerIds?: Set<string> | null;
  currentDayIndex?: number;
  itemDatabase?: readonly ItemDefinition[];
  relationships?: unknown;
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
        onlineGuildMemberIds,
        itemDatabase,
        relationships,
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
        onlineRealmPlayerIds,
        itemDatabase,
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
      roster: onlineGuildMemberIds
        ? nextRoster.filter((member) =>
            onlineGuildMemberIds.has(String(member.id)),
          )
        : nextRoster,
      missionList,
      activeMissions,
      guildFaction: guildSetup.faction,
      contentPhase: guildSetup.contentPhase,
      deferText,
      itemDatabase,
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

  const eligibleRealmNewsTypes = new Set([
    "raid-clear",
    "raid-progress",
    "dungeon",
    "ranking",
    "player",
    "return",
    "returner",
    "realm-return",
    "guild-exit",
    "npc-guild-exit",
    "transfer",
    "npc-guild-founded",
    "npc-guild-merger",
    "npc-guild-acquisition",
    "npc-guild-dissolution",
  ]);
  const structuralRealmNewsTypes = new Set([
    "npc-guild-founded",
    "npc-guild-merger",
    "npc-guild-acquisition",
    "npc-guild-dissolution",
  ]);
  const safeCurrentDayIndex = Math.max(
    0,
    Math.floor(currentDayIndex),
  );
  const realmNews = (Array.isArray(realmState?.news) ? realmState.news : [])
    .filter(
      (entry: Record<string, unknown>) =>
        entry?.message &&
        (Number(entry.dayIndex) === safeCurrentDayIndex ||
          (structuralRealmNewsTypes.has(String(entry.type || "")) &&
            safeCurrentDayIndex - Number(entry.dayIndex) >= 0 &&
            safeCurrentDayIndex - Number(entry.dayIndex) <= 3)) &&
        eligibleRealmNewsTypes.has(String(entry.type || "")) &&
        !state.processedRpEventIds.includes(
          `realm:${String(entry.id || `${entry.dayIndex}:${entry.message}`)}`,
        ),
    )
    .sort(
      (left: Record<string, unknown>, right: Record<string, unknown>) =>
        (Number(right.dayIndex) || 0) - (Number(left.dayIndex) || 0) ||
        String(left.id || "").localeCompare(String(right.id || "")),
    )[0];
  if (realmNews) {
    const guildSpeaker = nextRoster
      .filter(
        (member) =>
          !onlineGuildMemberIds ||
          onlineGuildMemberIds.has(String(member.id)),
      )
      .sort((left, right) =>
        String(left.id).localeCompare(String(right.id)),
      )[0];
    const guildNames = new Map(
      (Array.isArray(realmState?.npcGuilds) ? realmState.npcGuilds : []).map(
        (guild: Record<string, unknown>) => [
          String(guild.id || ""),
          String(guild.name || ""),
        ],
      ),
    );
    const realmSpeaker = (
      Array.isArray(realmState?.population?.players)
        ? realmState.population.players
        : []
    )
      .filter(
        (player: Record<string, unknown>) =>
          player?.id &&
          String(player.faction || "") === String(guildSetup.faction || "") &&
          (!onlineRealmPlayerIds ||
            onlineRealmPlayerIds.has(String(player.id))),
      )
      .sort((left: Record<string, unknown>, right: Record<string, unknown>) =>
        String(left.id).localeCompare(String(right.id)),
      )[0];
    if (guildSpeaker && realmSpeaker) {
      state = enqueueRealmNewsRpScene({
        state,
        news: realmNews,
        participants: [
          toParticipant(
            {
              ...guildSpeaker,
              faction: guildSpeaker.faction || guildSetup.faction,
            },
            "guild",
          ),
          toParticipant(
            realmSpeaker,
            "realm",
            guildNames.get(String(realmSpeaker.guildId || "")) || null,
          ),
        ],
        now,
        dayIndex: currentDayIndex,
      });
    }
  }
  state = advanceRpScenes({ state, now, deferText });

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

export const completeMissionSocialActivity = ({
  socialState,
  mission,
  succeeded,
  now,
  deferText = false,
  roster = [],
  relationships = {},
  dayIndex = 0,
}: {
  socialState: unknown;
  mission: Mission;
  succeeded: boolean;
  now: number;
  deferText?: boolean;
  roster?: readonly Character[];
  relationships?: unknown;
  dayIndex?: number;
}) => {
  let state = ensureSocialState(socialState);
  const searchId = mission.lfgSearchId;
  const search = searchId
    ? state.searches.find((entry) => entry.id === searchId)
    : null;
  let completedSearch: LfgSearch | null = null;

  if (search) {
    completedSearch = { ...search, phase: "completed" as const };
    state = {
      ...state,
      searches: state.searches.map((entry) =>
        entry.id === searchId ? completedSearch! : entry,
      ),
      reservedRealmPlayerIds: state.reservedRealmPlayerIds.filter(
        (id) =>
          !search.participants.some(
            (participant) =>
              participant.source === "realm" && participant.id === id,
          ),
      ),
    };
  } else {
    const memberIds = new Set(
      (Array.isArray(mission.memberIds) ? mission.memberIds : []).map(String),
    );
    const guildParticipants = (Array.isArray(roster) ? roster : [])
      .filter((member) => memberIds.has(String(member.id)))
      .map((member) =>
        toParticipant(
          member as Character & Record<string, unknown>,
          "guild",
        ),
      );
    const participants =
      Array.isArray(mission.partyParticipants) &&
      mission.partyParticipants.length > 0
        ? mission.partyParticipants
        : guildParticipants;
    completedSearch = {
      id: "",
      missionId: mission.id,
      missionName: mission.name || "the mission",
      missionType: mission.type === "dungeon" ? "dungeon" : "elite",
      targetSize: Math.max(1, participants.length),
      phase: "completed",
      createdAt: now,
      guildSearchEndsAt: now,
      expiresAt: now,
      nextResponseAt: now,
      participantIds: participants.map((participant) => participant.id),
      participants,
      initiatorId: participants[0]?.id || "",
      missionInstanceId: mission.instanceId,
    };
  }

  state = appendMessage({
    state,
    channel: "guild",
    intent: succeeded ? "mission-success" : "mission-failed",
    speaker:
      completedSearch.participants.find(
        (participant) => participant.source === "guild",
      ) ||
      completedSearch.participants[0] ||
      null,
    search: completedSearch,
    now,
    deferText,
  });
  if (mission.type !== "dungeon" && mission.type !== "raid" && mission.isRaid !== true) {
    return state;
  }
  return enqueueMissionRpScene({
    state,
    mission,
    participants: completedSearch.participants,
    relationships,
    succeeded,
    now,
    dayIndex,
  });
};

export const appendGuildElectionMessage = ({
  socialState,
  winner,
  guildName,
  now,
}: {
  socialState: unknown;
  winner: Character;
  guildName: string;
  now: number;
}) => {
  const state = ensureSocialState(socialState);
  const sequence = state.nextSequence;
  const text = `${winner.name || "A guild member"} has been elected Guild Master of ${guildName || "the guild"}.`;
  return ensureSocialState({
    ...state,
    nextSequence: sequence + 1,
    messages: [
      ...state.messages,
      {
        id: `chat:${sequence}`,
        sequence,
        channel: "guild",
        intent: "guild-election",
        text,
        fallbackText: text,
        textSource: "template",
        generationStatus: "ready",
        gameTimeMs: Math.max(0, Number(now) || 0),
        speaker: toParticipant(
          winner as unknown as Record<string, unknown>,
          "guild",
        ),
        contentKind: "system",
      },
    ],
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
