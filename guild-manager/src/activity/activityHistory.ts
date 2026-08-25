import type { ContentPhase, ContentRoute } from "../content/contentRules";
import { normalizeContentState, type ContentState } from "../content/contentState";

export const ACTIVITY_HISTORY_LIMIT_PER_KIND = 30;
export const ACTIVITY_EVENT_LIMIT_PER_RUN = 100;

export type ActivityKind = "dungeon" | "raid" | "battleground";
export type ActivityRunSource = "manual" | "calendar" | "automation";
export type ActivityRunOutcome = "success" | "failure" | "draw";

export type ActivityParticipantSnapshot = {
  id: string;
  name: string;
  charClass: string | null;
  role: string | null;
  level: number | null;
  itemLevel: number | null;
};

export type ActivityRunEvent = {
  sequence: number;
  atGameTimeMs: number | null;
  type: "boss_attempt" | "score" | "reward" | "system";
  label: string;
  outcome?: "cleared" | "failed";
  playerScore?: number;
  enemyScore?: number;
};

export type DungeonRunDetails = {
  kind: "dungeon";
  clearedBosses: number;
  totalBosses: number;
  wipeCount: number;
  preparationSummary: string | null;
  wipeCost: number;
};

export type RaidRunDetails = Omit<DungeonRunDetails, "kind"> & {
  kind: "raid";
  lockoutId: string | null;
};

export type BattlegroundRunDetails = {
  kind: "battleground";
  playerScore: number;
  enemyScore: number;
  honorPerParticipant: number;
  bracketLabel: string | null;
};

export type ActivityRunRecord = {
  id: string;
  kind: ActivityKind;
  definitionId: string;
  name: string;
  contentRoute: ContentRoute;
  contentPhase: ContentPhase;
  source: ActivityRunSource;
  startedAtGameTimeMs: number;
  completedAtGameTimeMs: number;
  dayIndex: number;
  outcome: ActivityRunOutcome;
  participants: ActivityParticipantSnapshot[];
  events: ActivityRunEvent[];
  rewardGold: number;
  rewardItemIds: string[];
  details: DungeonRunDetails | RaidRunDetails | BattlegroundRunDetails;
};

export type ActivityHistoryState = { records: ActivityRunRecord[] };

type LooseRecord = Record<string, unknown>;

const asRecord = (value: unknown): LooseRecord =>
  value && typeof value === "object" ? (value as LooseRecord) : {};

const snapshotParticipants = (
  participantIds: unknown,
  roster: unknown,
): ActivityParticipantSnapshot[] => {
  const ids = new Set(
    (Array.isArray(participantIds) ? participantIds : [])
      .map((id) => String(id || ""))
      .filter(Boolean),
  );
  const byId = new Map(
    (Array.isArray(roster) ? roster : []).map((entry) => {
      const character = asRecord(entry);
      return [String(character.id || ""), character];
    }),
  );
  return [...ids].map((id) => {
    const character = byId.get(id) || {};
    return {
      id,
      name: String(character.name || id),
      charClass: character.charClass ? String(character.charClass) : null,
      role: character.role ? String(character.role) : null,
      level: Number.isFinite(Number(character.level)) ? Number(character.level) : null,
      itemLevel: Number.isFinite(Number(character.itemLevel))
        ? Number(character.itemLevel)
        : null,
    };
  });
};

const normalizeEvents = (events: ActivityRunEvent[]) =>
  events
    .filter(Boolean)
    .slice(-ACTIVITY_EVENT_LIMIT_PER_RUN)
    .map((event, index) => ({ ...event, sequence: index + 1 }));

export const ensureActivityHistory = (value: unknown): ActivityHistoryState => {
  const safe = asRecord(value);
  const records = (Array.isArray(safe.records) ? safe.records : [])
    .filter((record) => record && typeof record === "object")
    .map((record) => record as ActivityRunRecord);
  const retained = (["dungeon", "raid", "battleground"] as const).flatMap(
    (kind) =>
      records
        .filter((record) => record.kind === kind)
        .sort(
          (left, right) =>
            right.completedAtGameTimeMs - left.completedAtGameTimeMs,
        )
        .slice(0, ACTIVITY_HISTORY_LIMIT_PER_KIND),
  );
  return {
    records: retained.sort(
      (left, right) => right.completedAtGameTimeMs - left.completedAtGameTimeMs,
    ),
  };
};

export const appendActivityRun = (
  state: ActivityHistoryState,
  record: ActivityRunRecord | null,
) =>
  record
    ? ensureActivityHistory({ records: [record, ...state.records] })
    : state;

export const createMissionActivityRun = ({
  mission,
  roster,
  succeeded,
  completedAtGameTimeMs,
  dayIndex,
  contentState,
  rewardGold = 0,
  rewardItemIds = [],
}: {
  mission: unknown;
  roster: unknown;
  succeeded: boolean;
  completedAtGameTimeMs: number;
  dayIndex: number;
  contentState: ContentState;
  rewardGold?: number;
  rewardItemIds?: string[];
}): ActivityRunRecord | null => {
  const run = asRecord(mission);
  if (run.type !== "dungeon") return null;
  const progress = asRecord(run.dungeonProgress);
  const stepResults = Array.isArray(progress.stepResults)
    ? progress.stepResults.map(asRecord)
    : [];
  const isRaid = run.isRaid === true;
  const kind: "dungeon" | "raid" = isRaid ? "raid" : "dungeon";
  const normalizedContent = normalizeContentState(contentState);
  const events = normalizeEvents(
    stepResults.map((step, index) => ({
      sequence: index + 1,
      atGameTimeMs: null,
      type: "boss_attempt" as const,
      label: String(step.bossName || `Boss ${Number(step.step) || index + 1}`),
      outcome: step.outcome === "cleared" ? "cleared" : "failed",
    })),
  );
  const totalBosses = Math.max(
    Number(progress.clearedSteps) || 0,
    ...stepResults.map((step) => Number(step.step) || 0),
  );
  const baseDetails = {
    clearedBosses: Math.max(0, Number(progress.clearedSteps) || 0),
    totalBosses,
    wipeCount: stepResults.filter((step) => step.outcome === "failed").length,
    preparationSummary: run.consumableSummary
      ? String(run.consumableSummary)
      : null,
    wipeCost: Math.max(0, Number(run.wipeCost) || 0),
  };
  return {
    id: String(run.instanceId || run.id || `${kind}:${completedAtGameTimeMs}`),
    kind,
    definitionId: String(run.questId || run.id || "unknown"),
    name: String(run.name || (isRaid ? "Raid" : "Dungeon")),
    contentRoute: normalizedContent.route,
    contentPhase: normalizedContent.phase,
    source: run.calendarEventId
      ? "calendar"
      : run.runSource === "automation"
        ? "automation"
        : "manual",
    startedAtGameTimeMs: Math.max(0, Number(run.startTime) || 0),
    completedAtGameTimeMs: Math.max(0, completedAtGameTimeMs),
    dayIndex: Math.max(0, Math.floor(dayIndex)),
    outcome: succeeded ? "success" : "failure",
    participants: snapshotParticipants(run.memberIds, roster),
    events,
    rewardGold: Math.max(0, rewardGold),
    rewardItemIds: rewardItemIds.map(String),
    details: isRaid
      ? { kind: "raid", ...baseDetails, lockoutId: run.lockoutId ? String(run.lockoutId) : null }
      : { kind: "dungeon", ...baseDetails },
  };
};

export const createBattlegroundActivityRun = ({
  battle,
  roster,
  contentState,
  dayIndex,
}: {
  battle: unknown;
  roster: unknown;
  contentState: ContentState;
  dayIndex: number;
}): ActivityRunRecord => {
  const run = asRecord(battle);
  const normalizedContent = normalizeContentState(contentState);
  const rawEvents = Array.isArray(run.events) ? run.events.map(asRecord) : [];
  const result = String(run.result || "draw");
  const reward = asRecord(run.reward);
  return {
    id: String(run.id || `battleground:${run.completedAt || Date.now()}`),
    kind: "battleground",
    definitionId: String(run.battlefieldId || "unknown"),
    name: String(run.name || "Battleground"),
    contentRoute: normalizedContent.route,
    contentPhase: normalizedContent.phase,
    source: run.runSource === "automation" ? "automation" : "manual",
    startedAtGameTimeMs: Math.max(0, Number(run.startTime) || 0),
    completedAtGameTimeMs: Math.max(
      0,
      Number(run.completedAt) || Number(run.finishTime) || 0,
    ),
    dayIndex: Math.max(0, Math.floor(dayIndex)),
    outcome:
      result === "victory" ? "success" : result === "defeat" ? "failure" : "draw",
    participants: snapshotParticipants(run.participantIds, roster),
    events: normalizeEvents(
      rawEvents.map((event, index) => ({
        sequence: index + 1,
        atGameTimeMs: null,
        type: "score" as const,
        label: String(event.summary || event.type || "Battleground event"),
        playerScore: Number(event.playerScore) || 0,
        enemyScore: Number(event.enemyScore) || 0,
      })),
    ),
    rewardGold: 0,
    rewardItemIds: [],
    details: {
      kind: "battleground",
      playerScore: Math.max(0, Number(run.playerScore) || 0),
      enemyScore: Math.max(0, Number(run.enemyScore) || 0),
      honorPerParticipant: Math.max(
        0,
        Number(reward.honorPerParticipant) || 0,
      ),
      bracketLabel: run.bracketLabel ? String(run.bracketLabel) : null,
    },
  };
};
