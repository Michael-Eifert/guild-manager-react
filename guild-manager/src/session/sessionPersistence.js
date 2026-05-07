import { getMissionMaxAttempts } from "../missions/missionHelpers";
import {
  createInitialCalendarState,
  normalizeCalendarState,
} from "../calendar/calendarLogic";

export const SESSION_FORMAT = "guild-manager-session";
export const SESSION_VERSION = 5;
const MAX_GUILD_LOG_ENTRIES = 50;
const MIN_MISSION_DURATION_MS = 1000;
const DEFAULT_DUNGEON_STEP_COUNT = 4;

const toObject = (value) =>
  value && typeof value === "object" ? value : {};

const clampNonNegativeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, numeric);
};

const buildMergedGuildProgress = (payloadData) => {
  const safePayload = toObject(payloadData);
  const snapshotMilestones =
    safePayload.milestones || safePayload.achievements || null;
  const rawGuildProgress = toObject(safePayload.guildProgress);
  if (Object.keys(rawGuildProgress).length === 0) {
    return snapshotMilestones ? { milestones: snapshotMilestones } : null;
  }

  return {
    ...rawGuildProgress,
    milestones: {
      ...toObject(rawGuildProgress.milestones),
      ...toObject(snapshotMilestones),
      dungeon: {
        ...toObject(rawGuildProgress.milestones?.dungeon),
        ...toObject(snapshotMilestones?.dungeon),
      },
    },
  };
};

const normalizeDungeonProgressForLoad = ({
  mission,
  totalDuration,
  loadBaseTime,
  resolveDungeonBossCount,
}) => {
  const resolvedBossCount = Number(
    typeof resolveDungeonBossCount === "function"
      ? resolveDungeonBossCount(mission)
      : DEFAULT_DUNGEON_STEP_COUNT,
  );
  const dungeonStepCount =
    Number.isFinite(resolvedBossCount) && resolvedBossCount > 0
      ? Math.floor(resolvedBossCount)
      : DEFAULT_DUNGEON_STEP_COUNT;
  const progress = toObject(mission.dungeonProgress);
  const stepDuration =
    Number(progress.stepDuration) > 0
      ? Number(progress.stepDuration)
      : Math.max(
          MIN_MISSION_DURATION_MS,
          Math.floor(totalDuration / dungeonStepCount),
        );
  const stepResults = Array.isArray(progress.stepResults)
    ? progress.stepResults
    : [];
  const clearedFromResults = stepResults.filter(
    (step) => step?.outcome === "cleared",
  ).length;
  const clearedSteps = Math.max(
    0,
    Math.min(
      dungeonStepCount,
      Number(progress.clearedSteps) || clearedFromResults,
    ),
  );
  const failedAtStep = Number.isFinite(progress.failedAtStep)
    ? Number(progress.failedAtStep)
    : null;
  const maxAttempts = getMissionMaxAttempts(mission);
  const failedAttemptsFromResults = stepResults.filter(
    (step) => step?.outcome === "failed",
  ).length;
  const attemptsUsed =
    maxAttempts > 0
      ? Math.max(
          0,
          Math.min(
            maxAttempts,
            Math.floor(
              Number(progress.attemptsUsed) || Number(failedAttemptsFromResults) || 0,
            ),
          ),
        )
      : 0;
  const finished =
    Boolean(progress.finished) ||
    Boolean(failedAtStep) ||
    clearedSteps >= dungeonStepCount ||
    (maxAttempts > 0 && attemptsUsed >= maxAttempts);
  const currentStep = finished
    ? clearedSteps
    : Math.max(
        0,
        Math.min(
          dungeonStepCount - 1,
          Number(progress.currentStep) || clearedSteps,
        ),
      );

  return {
    currentStep,
    clearedSteps,
    failedAtStep,
    stepResults,
    lootAwardedSteps: Array.isArray(progress.lootAwardedSteps)
      ? [
          ...new Set(
            progress.lootAwardedSteps
              .map((step) => Math.floor(Number(step) || 0))
              .filter((step) => step > 0 && step <= dungeonStepCount),
          ),
        ].sort((left, right) => left - right)
      : [],
    stepDuration,
    nextStepAt: finished ? loadBaseTime : loadBaseTime + stepDuration,
    finished,
    maxAttempts,
    attemptsUsed,
  };
};

export const buildSessionPayload = ({
  roster,
  activeMissions,
  missionList,
  guildLog,
  guildGold,
  guildProgress,
  guildSetup,
  calendarState,
  gameSpeed,
  isPaused,
  gameTimeMs,
}) => {
  const now = clampNonNegativeNumber(gameTimeMs, Date.now());
  const serializedActiveMissions = (Array.isArray(activeMissions)
    ? activeMissions
    : []
  ).map((mission) => {
    const missionFinishTime = clampNonNegativeNumber(mission?.finishTime, now);
    return {
      ...mission,
      remainingMs: Math.max(0, missionFinishTime - now),
    };
  });

  return {
    format: SESSION_FORMAT,
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    data: {
      roster: Array.isArray(roster) ? roster : [],
      activeMissions: serializedActiveMissions,
      missionList: Array.isArray(missionList) ? missionList : [],
      guildLog: Array.isArray(guildLog) ? guildLog : [],
      guildGold: clampNonNegativeNumber(guildGold, 0),
      guildProgress: toObject(guildProgress),
      guildSetup: toObject(guildSetup),
      calendarState: normalizeCalendarState(
        calendarState || createInitialCalendarState(now),
        now,
      ),
      milestones: guildProgress?.milestones || null,
      achievements: guildProgress?.milestones || null,
      progression: {
        gameSpeed,
        isPaused: Boolean(isPaused),
        gameTimeMs: now,
      },
    },
  };
};

export const downloadSessionPayload = (
  payload,
  filenamePrefix = "guild-session",
) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${filenamePrefix}-${timestamp}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const parseSessionPayload = (rawInput) => {
  const parsed = JSON.parse(String(rawInput || "{}"));
  return parsed && typeof parsed === "object" ? parsed.data || parsed : {};
};

export const hydrateSessionData = ({
  payloadData,
  initialMissions,
  normalizeGuildProgress,
  normalizeGuildSetup,
  getGuildDerivedStats,
  normalizeProgressionState,
  defaultGameSpeed,
  defaultGuildSetup,
  createId,
  resolveDungeonBossCount,
}) => {
  const safePayload = toObject(payloadData);

  const loadedRoster = Array.isArray(safePayload.roster) ? safePayload.roster : [];
  const loadedMissionList =
    Array.isArray(safePayload.missionList) && safePayload.missionList.length > 0
      ? safePayload.missionList
      : initialMissions;
  const loadedGuildLog = Array.isArray(safePayload.guildLog)
    ? safePayload.guildLog.slice(0, MAX_GUILD_LOG_ENTRIES)
    : [];

  const rawGuildProgress = buildMergedGuildProgress(safePayload);
  const loadedGuildProgress = normalizeGuildProgress(rawGuildProgress);
  const loadedGuildStats = getGuildDerivedStats(loadedGuildProgress);
  const loadedGuildGold =
    typeof safePayload.guildGold === "number"
      ? Math.max(0, Math.min(loadedGuildStats.goldCap, safePayload.guildGold))
      : 0;
  const loadedGuildSetup = normalizeGuildSetup(
    safePayload.guildSetup || defaultGuildSetup,
    safePayload,
  );

  const loadedProgression = normalizeProgressionState(
    safePayload.progression || {
      gameSpeed: safePayload.gameSpeed ?? defaultGameSpeed,
      isPaused: safePayload.isPaused ?? false,
      gameTimeMs: safePayload.gameTimeMs,
    },
  );
  const loadBaseTime = loadedProgression.gameTimeMs;
  const loadedCalendarState = normalizeCalendarState(
    safePayload.calendarState,
    loadBaseTime,
  );

  const loadedActiveMissions = Array.isArray(safePayload.activeMissions)
    ? safePayload.activeMissions.map((mission) => {
        const missionRemainingMs =
          typeof mission.remainingMs === "number"
            ? Math.max(0, mission.remainingMs)
            : Math.max(
                0,
                clampNonNegativeNumber(mission.finishTime, loadBaseTime) - loadBaseTime,
              );
        const totalDuration =
          typeof mission.totalDuration === "number" && mission.totalDuration > 0
            ? mission.totalDuration
            : Math.max(MIN_MISSION_DURATION_MS, missionRemainingMs);
        return {
          ...mission,
          instanceId: mission.instanceId || createId(),
          startTime: loadBaseTime,
          finishTime: loadBaseTime + missionRemainingMs,
          totalDuration,
          dungeonProgress:
            mission.type === "dungeon"
              ? normalizeDungeonProgressForLoad({
                  mission,
                  totalDuration,
                  loadBaseTime,
                  resolveDungeonBossCount,
                })
              : null,
        };
      })
    : [];

  const activeMemberIds = new Set(
    loadedActiveMissions.flatMap((mission) =>
      Array.isArray(mission.memberIds) ? mission.memberIds : [],
    ),
  );
  const normalizedRoster = loadedRoster.map((char) => {
    const normalizedKeys = Array.isArray(char?.keys)
      ? [...new Set(char.keys.map((keyId) => String(keyId || "").trim()).filter(Boolean))]
      : [];
    const normalizedClearedMissionIds = Array.isArray(char?.clearedMissionIds)
      ? [
          ...new Set(
            char.clearedMissionIds
              .map((missionId) => String(missionId || "").trim())
              .filter(Boolean),
          ),
        ]
      : [];
    if (activeMemberIds.has(char.id)) {
      return {
        ...char,
        keys: normalizedKeys,
        clearedMissionIds: normalizedClearedMissionIds,
        status: "Questing",
        statusText: "On Mission",
      };
    }
    if (char.status === "Questing") {
      return {
        ...char,
        keys: normalizedKeys,
        clearedMissionIds: normalizedClearedMissionIds,
        status: "Idle",
        statusText: "Awaiting Orders",
      };
    }
    return {
      ...char,
      keys: normalizedKeys,
      clearedMissionIds: normalizedClearedMissionIds,
    };
  });

  return {
    normalizedRoster,
    loadedActiveMissions,
    loadedMissionList,
    loadedGuildLog,
    loadedGuildProgress,
    loadedGuildGold,
    loadedGuildSetup,
    loadedProgression,
    loadedCalendarState,
  };
};
