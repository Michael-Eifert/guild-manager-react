import type { GuildIncident } from "../guildRelations/guildRelations";
import { getRelationshipPairKey, normalizeGuildRelationships } from "./relationshipSystem";
import { getDeterministicResponseDelayMs, renderChatTemplate } from "./chatTemplates";
import type {
  ChatMessage,
  PartyParticipant,
  RpScene,
  RpSceneTurn,
  SocialState,
} from "./chatTypes";

export const MAX_RP_SCENES = 50;
export const MAX_RP_QUEUE = 5;
export const MAX_PROCESSED_RP_EVENTS = 100;
export const MAX_NON_INTERACTIVE_RP_SCENES_PER_DAY = 2;

type RelationshipEntry = { points?: number };

const getRelationshipPoints = (
  relationships: unknown,
  firstId: string,
  secondId: string,
) => {
  const key = getRelationshipPairKey(firstId, secondId);
  const normalized = normalizeGuildRelationships(relationships) as Record<
    string,
    RelationshipEntry
  >;
  return Number(normalized[key]?.points) || 0;
};

export const findRelationshipPair = ({
  participants,
  relationships,
  mode,
}: {
  participants: readonly PartyParticipant[];
  relationships: unknown;
  mode: "lowest" | "highest";
}) => {
  const guildMembers = participants.filter(
    (participant) => participant.source === "guild",
  );
  let selected:
    | { actor: PartyParticipant; subject: PartyParticipant; points: number }
    | null = null;
  for (let left = 0; left < guildMembers.length; left += 1) {
    for (let right = left + 1; right < guildMembers.length; right += 1) {
      const actor = guildMembers[left];
      const subject = guildMembers[right];
      const points = getRelationshipPoints(
        relationships,
        actor.id,
        subject.id,
      );
      if (
        !selected ||
        (mode === "lowest" ? points < selected.points : points > selected.points) ||
        (points === selected.points &&
          `${actor.id}:${subject.id}` < `${selected.actor.id}:${selected.subject.id}`)
      ) {
        selected = { actor, subject, points };
      }
    }
  }
  return selected;
};

const getFailedBossName = (mission: {
  dungeonProgress?: { failedAtStep?: number | null };
  dungeonBosses?: string[];
}) => {
  const bosses = Array.isArray(mission.dungeonBosses)
    ? mission.dungeonBosses
    : [];
  const failedAtStep = Math.max(
    1,
    Math.floor(Number(mission.dungeonProgress?.failedAtStep) || bosses.length || 1),
  );
  return bosses[failedAtStep - 1] || bosses[bosses.length - 1] || "the final foe";
};

const getSuccessBossName = (mission: { dungeonBosses?: string[] }) => {
  const bosses = Array.isArray(mission.dungeonBosses)
    ? mission.dungeonBosses
    : [];
  return bosses[bosses.length - 1] || "the final foe";
};

const getSubjectiveClaim = (participant: PartyParticipant) => {
  if (participant.role === "Healer") return "the healing came too late when we needed it most.";
  if (participant.role === "Tank") return "the enemies got away from you at the worst moment.";
  if (participant.role === "DPS") return "the pressure on the target disappeared when it mattered.";
  const className = String(participant.charClass || "").toLowerCase();
  if (["priest", "druid", "paladin", "shaman"].includes(className)) {
    return "your support was missing when the group started to fall.";
  }
  return "your positioning left the rest of us exposed.";
};

const capScenes = (scenes: RpScene[]) => {
  const active = scenes.filter((scene) => scene.status !== "completed");
  const completed = scenes
    .filter((scene) => scene.status === "completed")
    .slice(-MAX_RP_SCENES);
  return [...active, ...completed].slice(-(MAX_RP_SCENES + MAX_RP_QUEUE));
};

const enqueueScene = ({
  state,
  scene,
  dayIndex,
}: {
  state: SocialState;
  scene: RpScene;
  dayIndex: number;
}) => {
  if (
    state.processedRpEventIds.includes(scene.sourceEventId) ||
    state.rpScenes.some((entry) => entry.sourceEventId === scene.sourceEventId)
  ) {
    return state;
  }
  const safeDay = Math.max(0, Math.floor(Number(dayIndex) || 0));
  const counters =
    state.rpDailyCounters.dayIndex === safeDay
      ? state.rpDailyCounters
      : { dayIndex: safeDay, nonInteractiveScenes: 0 };
  if (
    !scene.interactive &&
    counters.nonInteractiveScenes >= MAX_NON_INTERACTIVE_RP_SCENES_PER_DAY
  ) {
    return {
      ...state,
      processedRpEventIds: [
        ...state.processedRpEventIds,
        scene.sourceEventId,
      ].slice(-MAX_PROCESSED_RP_EVENTS),
      rpDailyCounters: counters,
    };
  }
  const waiting = state.rpScenes.filter(
    (entry) => entry.status === "queued" || entry.status === "active",
  );
  if (waiting.length >= MAX_RP_QUEUE) {
    return {
      ...state,
      processedRpEventIds: [
        ...state.processedRpEventIds,
        scene.sourceEventId,
      ].slice(-MAX_PROCESSED_RP_EVENTS),
      rpDailyCounters: counters,
    };
  }
  return {
    ...state,
    rpScenes: capScenes([...state.rpScenes, scene]),
    processedRpEventIds: [
      ...state.processedRpEventIds,
      scene.sourceEventId,
    ].slice(-MAX_PROCESSED_RP_EVENTS),
    rpDailyCounters: scene.interactive
      ? counters
      : {
          ...counters,
          nonInteractiveScenes: counters.nonInteractiveScenes + 1,
        },
  };
};

export const enqueueMissionRpScene = ({
  state,
  mission,
  participants,
  relationships,
  succeeded,
  now,
  dayIndex,
}: {
  state: SocialState;
  mission: {
    id?: string | number;
    instanceId?: string;
    name?: string;
    dungeonWing?: string;
    dungeonProgress?: { failedAtStep?: number | null };
    dungeonBosses?: string[];
  };
  participants: PartyParticipant[];
  relationships?: unknown;
  succeeded: boolean;
  now: number;
  dayIndex: number;
}) => {
  if (participants.length < 2) return state;
  const sourceEventId = `run:${mission.instanceId || mission.id}:${succeeded ? "success" : "failure"}`;
  const pair = findRelationshipPair({
    participants,
    relationships,
    mode: succeeded ? "highest" : "lowest",
  });
  const primary = pair?.actor || participants[0];
  const secondary = pair?.subject || participants[1];
  const hasPersonalConflict = !succeeded && Boolean(pair && pair.points < 0);
  const turns: RpSceneTurn[] = succeeded
    ? [
        { speakerId: primary.id, intent: pair && pair.points > 0 ? "rp-praise" : "rp-run-success" },
        { speakerId: secondary.id, intent: "rp-run-success" },
      ]
    : hasPersonalConflict
      ? [
          {
            speakerId: primary.id,
            intent: "rp-blame",
            subjectiveClaim: getSubjectiveClaim(secondary),
          },
          { speakerId: secondary.id, intent: "rp-defense" },
        ]
      : [
          { speakerId: primary.id, intent: "rp-run-failure" },
          { speakerId: secondary.id, intent: "rp-run-failure" },
        ];
  const scene: RpScene = {
    id: `rp:${sourceEventId}`,
    sourceEventId,
    kind: succeeded ? "run-success" : "run-failure",
    tag: succeeded ? "Run Accomplished" : "Run Failed",
    priority: 2,
    status: "queued",
    createdAt: now,
    nextTurnAt: now,
    participants,
    turns,
    nextTurnIndex: 0,
    missionName: mission.dungeonWing || mission.name || "the mission",
    bossName: succeeded
      ? getSuccessBossName(mission)
      : getFailedBossName(mission),
    relationshipPoints: pair?.points || 0,
  };
  return enqueueScene({ state, scene, dayIndex });
};

const incidentIntent: Record<GuildIncident["kind"], RpSceneTurn["intent"]> = {
  blame: "rp-blame",
  praise: "rp-praise",
  dispute: "rp-dispute",
  morale: "rp-morale",
  reconciliation: "rp-reconciliation",
};

export const attachGuildIncidentToScene = ({
  state,
  incident,
  participants,
  guildMaster,
  relationshipPoints = 0,
  now,
}: {
  state: SocialState;
  incident: GuildIncident;
  participants: PartyParticipant[];
  guildMaster?: PartyParticipant | null;
  relationshipPoints?: number;
  now: number;
}) => {
  const actor = participants.find((entry) => entry.id === incident.actorId);
  const subject = participants.find((entry) => entry.id === incident.subjectId);
  if (!actor || !subject) return state;
  const existingIndex = state.rpScenes
    .map((scene, index) => ({ scene, index }))
    .reverse()
    .find(
      ({ scene }) =>
        scene.sourceEventId.startsWith("run:") &&
        scene.participants.some((entry) => entry.id === actor.id) &&
        scene.participants.some((entry) => entry.id === subject.id) &&
        scene.status !== "completed",
    )?.index ?? -1;
  const choice = incident.choices.find(
    (entry) => entry.id === incident.resolvedChoiceId,
  );
  const turns: RpSceneTurn[] = [
    {
      speakerId: actor.id,
      intent: incidentIntent[incident.kind],
      ...(incident.kind === "blame"
        ? { subjectiveClaim: getSubjectiveClaim(subject) }
        : {}),
    },
    {
      speakerId: subject.id,
      intent:
        incident.kind === "blame" || incident.kind === "dispute"
          ? "rp-defense"
          : incidentIntent[incident.kind],
    },
    ...(incident.status === "resolved" && guildMaster
      ? [
          {
            speakerId: guildMaster.id,
            intent: "rp-leadership" as const,
            choiceLabel: choice?.label || "resolve this constructively",
          },
        ]
      : []),
  ];
  if (existingIndex >= 0) {
    return {
      ...state,
      rpScenes: state.rpScenes.map((scene, index) =>
        index === existingIndex
          ? {
              ...scene,
              kind: "guild-incident",
              tag: incident.title,
              priority: 3,
              interactive: incident.status === "pending",
              incidentId: incident.id,
              relationshipPoints,
              turns,
              nextTurnIndex: 0,
              nextTurnAt: now,
              status: "queued",
            }
          : scene,
      ),
    };
  }
  const sourceEventId = `incident:${incident.id}`;
  return enqueueScene({
    state,
    dayIndex: incident.dayIndex,
    scene: {
      id: `rp:${sourceEventId}`,
      sourceEventId,
      kind: "guild-incident",
      tag: incident.title,
      priority: 3,
      status: "queued",
      createdAt: now,
      nextTurnAt: now,
      participants: [...participants, ...(guildMaster ? [guildMaster] : [])].filter(
        (entry, index, all) =>
          all.findIndex((candidate) => candidate.id === entry.id) === index,
      ),
      turns,
      nextTurnIndex: 0,
      incidentId: incident.id,
      relationshipPoints,
      interactive: incident.status === "pending",
    },
  });
};

export const resolveGuildIncidentRpScene = ({
  state,
  incident,
  guildMaster,
  now,
}: {
  state: SocialState;
  incident: GuildIncident;
  guildMaster?: PartyParticipant | null;
  now: number;
}) => {
  const choice = incident.choices.find(
    (entry) => entry.id === incident.resolvedChoiceId,
  );
  return {
    ...state,
    rpScenes: state.rpScenes.map((scene) => {
      if (scene.incidentId !== incident.id || scene.status === "completed") {
        return scene;
      }
      const hasLeaderTurn = scene.turns.some(
        (turn) => turn.intent === "rp-leadership",
      );
      const turns =
        guildMaster && !hasLeaderTurn
          ? [
              ...scene.turns,
              {
                speakerId: guildMaster.id,
                intent: "rp-leadership" as const,
                choiceLabel: choice?.label || "resolve this constructively",
              },
            ]
          : scene.turns;
      return {
        ...scene,
        participants:
          guildMaster &&
          !scene.participants.some((entry) => entry.id === guildMaster.id)
            ? [...scene.participants, guildMaster]
            : scene.participants,
        turns,
        status: "queued" as const,
        nextTurnAt: now,
        interactive: false,
      };
    }),
  };
};

export const enqueueRealmNewsRpScene = ({
  state,
  news,
  participants,
  now,
  dayIndex,
}: {
  state: SocialState;
  news: { id?: string; message?: string; type?: string };
  participants: PartyParticipant[];
  now: number;
  dayIndex: number;
}) => {
  const message = String(news.message || "").trim();
  if (!message || participants.length < 2) return state;
  const sourceEventId = `realm:${news.id || `${dayIndex}:${message}`}`;
  return enqueueScene({
    state,
    dayIndex,
    scene: {
      id: `rp:${sourceEventId}`,
      sourceEventId,
      kind: "realm-news",
      tag: news.type === "raid-clear" ? "Realm First" : "Realm News",
      priority: 1,
      status: "queued",
      createdAt: now,
      nextTurnAt: now,
      participants: participants.slice(0, 2),
      turns: participants.slice(0, 2).map((participant) => ({
        speakerId: participant.id,
        intent: "rp-world-rumor" as const,
        subjectiveClaim: message,
      })),
      nextTurnIndex: 0,
    },
  });
};

export const advanceRpScenes = ({
  state,
  now,
  deferText,
}: {
  state: SocialState;
  now: number;
  deferText: boolean;
}) => {
  const current =
    state.rpScenes.find((scene) => scene.status === "active") ||
    [...state.rpScenes]
      .filter((scene) => scene.status === "queued")
      .sort(
        (left, right) =>
          right.priority - left.priority || left.createdAt - right.createdAt,
      )[0];
  if (!current || now < current.nextTurnAt) return state;
  const turn = current.turns[current.nextTurnIndex];
  if (!turn) {
    return {
      ...state,
      rpScenes: state.rpScenes.map((scene) =>
        scene.id === current.id
          ? {
              ...scene,
              status:
                scene.interactive && scene.incidentId
                  ? ("awaiting-choice" as const)
                  : ("completed" as const),
              completedAt:
                scene.interactive && scene.incidentId ? undefined : now,
            }
          : scene,
      ),
    };
  }
  const speaker =
    current.participants.find((entry) => entry.id === turn.speakerId) || null;
  const otherSpeaker = current.participants.find(
    (entry) => entry.id !== turn.speakerId,
  );
  const context = {
    missionName: current.missionName,
    bossName: current.bossName,
    otherSpeakerName: otherSpeaker?.name,
    relationshipPoints: current.relationshipPoints,
    relationshipLabel:
      (current.relationshipPoints || 0) < 0 ? "strained" : "positive",
    subjectiveClaim: turn.subjectiveClaim,
    choiceLabel: turn.choiceLabel,
  };
  const fallbackText = renderChatTemplate({
    channel: "tavern",
    intent: turn.intent,
    speaker,
    ...context,
  });
  const previousSceneMessage = [...state.messages]
    .reverse()
    .find((message) => message.sceneId === current.id);
  const sequence = state.nextSequence;
  const message: ChatMessage = {
    id: `chat:${sequence}`,
    sequence,
    channel: "tavern",
    intent: turn.intent,
    contentKind: "roleplay",
    text: deferText ? "" : fallbackText,
    fallbackText,
    textSource: "template",
    generationStatus: deferText ? "pending" : "ready",
    gameTimeMs: now,
    speaker,
    sceneId: current.id,
    sceneTag: current.tag,
    ...(previousSceneMessage ? { replyToMessageId: previousSceneMessage.id } : {}),
    ...(current.incidentId ? { incidentId: current.incidentId } : {}),
    rpContext: context,
  };
  const nextTurnIndex = current.nextTurnIndex + 1;
  return {
    ...state,
    messages: [...state.messages, message].slice(-300),
    nextSequence: sequence + 1,
    rpScenes: state.rpScenes.map((scene) =>
      scene.id === current.id
        ? {
            ...scene,
            status: "active" as const,
            nextTurnIndex,
            nextTurnAt:
              now +
              getDeterministicResponseDelayMs(
                `${scene.id}:${nextTurnIndex}:${speaker?.id || "system"}`,
              ),
          }
        : scene,
    ),
  };
};
