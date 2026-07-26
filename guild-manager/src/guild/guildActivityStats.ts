export type GuildActivityStats = {
  trackingStartedDayIndex: number;
  startedRuns: number;
  completedRuns: number;
  successfulRuns: number;
  failedRuns: number;
  dungeonRuns: number;
  successfulDungeonRuns: number;
  failedDungeonRuns: number;
  raidRuns: number;
  successfulRaidRuns: number;
  failedRaidRuns: number;
  raidBossesCleared: number;
  eliteQuestRuns: number;
  successfulEliteQuestRuns: number;
  failedEliteQuestRuns: number;
  guildDungeonClears: Record<
    string,
    {
      missionId: string;
      name: string;
      clearCount: number;
      lastClearedDayIndex: number;
    }
  >;
  guildRaidProgress: Record<
    string,
    {
      raidId: string;
      name: string;
      totalBosses: number;
      defeatedBossNames: string[];
      lastProgressDayIndex: number;
    }
  >;
  processedStartedRunIds: string[];
  processedCompletedRunIds: string[];
};

const RUN_ID_LIMIT = 300;

export const createInitialGuildActivityStats = (
  trackingStartedDayIndex = 0,
): GuildActivityStats => ({
  trackingStartedDayIndex: Math.max(0, Math.floor(trackingStartedDayIndex)),
  startedRuns: 0,
  completedRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
  dungeonRuns: 0,
  successfulDungeonRuns: 0,
  failedDungeonRuns: 0,
  raidRuns: 0,
  successfulRaidRuns: 0,
  failedRaidRuns: 0,
  raidBossesCleared: 0,
  eliteQuestRuns: 0,
  successfulEliteQuestRuns: 0,
  failedEliteQuestRuns: 0,
  guildDungeonClears: {},
  guildRaidProgress: {},
  processedStartedRunIds: [],
  processedCompletedRunIds: [],
});

export const normalizeGuildActivityStats = (
  value: unknown,
  trackingStartedDayIndex = 0,
): GuildActivityStats => {
  const base = createInitialGuildActivityStats(trackingStartedDayIndex);
  if (!value || typeof value !== "object") return base;
  const raw = value as Record<string, unknown>;
  const numericKeys = Object.keys(base).filter(
    (key) =>
      key !== "processedStartedRunIds" &&
      key !== "processedCompletedRunIds" &&
      key !== "guildDungeonClears" &&
      key !== "guildRaidProgress" &&
      key !== "trackingStartedDayIndex",
  ) as Array<keyof GuildActivityStats>;
  numericKeys.forEach((key) => {
    (base[key] as number) = Math.max(0, Math.floor(Number(raw[key]) || 0));
  });
  base.trackingStartedDayIndex = Math.max(
    0,
    Math.floor(Number(raw.trackingStartedDayIndex) || trackingStartedDayIndex),
  );
  base.processedStartedRunIds = Array.isArray(raw.processedStartedRunIds)
    ? raw.processedStartedRunIds.map(String).slice(-RUN_ID_LIMIT)
    : [];
  base.processedCompletedRunIds = Array.isArray(raw.processedCompletedRunIds)
    ? raw.processedCompletedRunIds.map(String).slice(-RUN_ID_LIMIT)
    : [];
  base.guildDungeonClears =
    raw.guildDungeonClears && typeof raw.guildDungeonClears === "object"
      ? Object.fromEntries(
          Object.entries(raw.guildDungeonClears as Record<string, any>).map(
            ([key, entry]) => [
              key,
              {
                missionId: String(entry?.missionId || key),
                name: String(entry?.name || "Dungeon"),
                clearCount: Math.max(
                  0,
                  Math.floor(Number(entry?.clearCount) || 0),
                ),
                lastClearedDayIndex: Math.max(
                  0,
                  Math.floor(Number(entry?.lastClearedDayIndex) || 0),
                ),
              },
            ],
          ),
        )
      : {};
  base.guildRaidProgress =
    raw.guildRaidProgress && typeof raw.guildRaidProgress === "object"
      ? Object.fromEntries(
          Object.entries(raw.guildRaidProgress as Record<string, any>).map(
            ([key, entry]) => [
              key,
              {
                raidId: String(entry?.raidId || key),
                name: String(entry?.name || "Raid"),
                totalBosses: Math.max(
                  1,
                  Math.floor(Number(entry?.totalBosses) || 1),
                ),
                defeatedBossNames: [
                  ...new Set(
                    (Array.isArray(entry?.defeatedBossNames)
                      ? entry.defeatedBossNames
                      : []
                    )
                      .map(String)
                      .filter(Boolean),
                  ),
                ] as string[],
                lastProgressDayIndex: Math.max(
                  0,
                  Math.floor(Number(entry?.lastProgressDayIndex) || 0),
                ),
              },
            ],
          ),
        )
      : {};
  return base;
};

const getRunId = (mission: Record<string, any>) =>
  String(mission.instanceId || mission.runId || mission.id || "").trim();

export const registerStartedGuildRuns = (
  current: GuildActivityStats,
  missions: Array<Record<string, any>>,
) => {
  const state = normalizeGuildActivityStats(
    current,
    current.trackingStartedDayIndex,
  );
  const processed = new Set(state.processedStartedRunIds);
  const newIds = missions.map(getRunId).filter((id) => {
    if (!id || processed.has(id)) return false;
    processed.add(id);
    return true;
  });
  if (newIds.length === 0) return state;
  return {
    ...state,
    startedRuns: state.startedRuns + newIds.length,
    processedStartedRunIds: [...state.processedStartedRunIds, ...newIds].slice(
      -RUN_ID_LIMIT,
    ),
  };
};

export const recordCompletedGuildRun = ({
  stats,
  mission,
  succeeded,
  dayIndex = 0,
}: {
  stats: GuildActivityStats;
  mission: Record<string, any>;
  succeeded: boolean;
  dayIndex?: number;
}) => {
  const state = normalizeGuildActivityStats(
    stats,
    stats.trackingStartedDayIndex,
  );
  const runId = getRunId(mission);
  if (!runId || state.processedCompletedRunIds.includes(runId)) return state;
  const isRaid = mission.isRaid === true;
  const isElite =
    !isRaid &&
    (mission.isZoneElite === true || mission.type === "elite-quest");
  const isDungeon = mission.type === "dungeon" && !isRaid && !isElite;
  const participantIds = Array.isArray(mission.partyParticipants)
    ? mission.partyParticipants
    : [];
  const memberIds = Array.isArray(mission.memberIds)
    ? mission.memberIds.map(String)
    : [];
  const partySize =
    participantIds.length > 0 ? participantIds.length : memberIds.length;
  const hasOnlyGuildParticipants =
    participantIds.length === 0 ||
    participantIds.every(
      (participant: Record<string, unknown>) =>
        participant?.source === "guild" &&
        memberIds.includes(String(participant.id)),
    );
  const requiredPartySize = Math.max(
    1,
    Math.floor(Number(mission.requiredPartySize) || (isRaid ? 40 : 5)),
  );
  const isFullGuildGroup =
    hasOnlyGuildParticipants &&
    memberIds.length === partySize &&
    partySize >= requiredPartySize;
  let guildDungeonClears = state.guildDungeonClears;
  let guildRaidProgress = state.guildRaidProgress;
  if (isDungeon && succeeded && isFullGuildGroup) {
    const missionId = String(mission.questId ?? mission.id ?? runId);
    const current = guildDungeonClears[missionId];
    guildDungeonClears = {
      ...guildDungeonClears,
      [missionId]: {
        missionId,
        name: String(
          mission.dungeonWing || mission.name || "Unknown Dungeon",
        ),
        clearCount: Math.max(0, Number(current?.clearCount) || 0) + 1,
        lastClearedDayIndex: Math.max(0, Math.floor(dayIndex)),
      },
    };
  }
  if (isRaid && isFullGuildGroup) {
    const raidId = String(
      mission.raidLockoutId ||
        mission.dungeonSetId ||
        mission.dungeonSetName ||
        mission.name ||
        mission.id,
    );
    const current = guildRaidProgress[raidId];
    const bossNames = Array.isArray(mission.dungeonBosses)
      ? mission.dungeonBosses.map(String)
      : [];
    const clearedSteps = Math.max(
      0,
      Math.min(
        bossNames.length,
        Math.floor(Number(mission.dungeonProgress?.clearedSteps) || 0),
      ),
    );
    const defeatedBossNames = [
      ...new Set([
        ...(current?.defeatedBossNames || []),
        ...bossNames.slice(0, clearedSteps),
      ]),
    ];
    guildRaidProgress = {
      ...guildRaidProgress,
      [raidId]: {
        raidId,
        name: String(mission.dungeonSetName || mission.name || "Unknown Raid"),
        totalBosses: Math.max(
          1,
          Number(current?.totalBosses) || 0,
          Math.floor(
            Number(mission.raidLockoutTotalBosses) || bossNames.length || 1,
          ),
          defeatedBossNames.length,
        ),
        defeatedBossNames,
        lastProgressDayIndex: Math.max(0, Math.floor(dayIndex)),
      },
    };
  }
  return {
    ...state,
    completedRuns: state.completedRuns + 1,
    successfulRuns: state.successfulRuns + (succeeded ? 1 : 0),
    failedRuns: state.failedRuns + (succeeded ? 0 : 1),
    dungeonRuns: state.dungeonRuns + (isDungeon ? 1 : 0),
    successfulDungeonRuns:
      state.successfulDungeonRuns + (isDungeon && succeeded ? 1 : 0),
    failedDungeonRuns:
      state.failedDungeonRuns + (isDungeon && !succeeded ? 1 : 0),
    raidRuns: state.raidRuns + (isRaid ? 1 : 0),
    successfulRaidRuns:
      state.successfulRaidRuns + (isRaid && succeeded ? 1 : 0),
    failedRaidRuns:
      state.failedRaidRuns + (isRaid && !succeeded ? 1 : 0),
    raidBossesCleared:
      state.raidBossesCleared +
      (isRaid
        ? Math.max(
            0,
            Math.floor(
              Number(
                mission.dungeonProgress?.clearedSteps ??
                  mission.bossesCleared ??
                  0,
              ) || 0,
            ),
          )
        : 0),
    eliteQuestRuns: state.eliteQuestRuns + (isElite ? 1 : 0),
    successfulEliteQuestRuns:
      state.successfulEliteQuestRuns + (isElite && succeeded ? 1 : 0),
    failedEliteQuestRuns:
      state.failedEliteQuestRuns + (isElite && !succeeded ? 1 : 0),
    guildDungeonClears,
    guildRaidProgress,
    processedCompletedRunIds: [
      ...state.processedCompletedRunIds,
      runId,
    ].slice(-RUN_ID_LIMIT),
  };
};
