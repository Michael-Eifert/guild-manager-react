import {
  getDungeonBossCount,
  getDungeonBossNames,
  getMissionMaxAttempts,
} from "../missions/missionHelpers";

const MIN_DUNGEON_TOTAL_DURATION_MS = 4000;
const MIN_DUNGEON_STEP_DURATION_MS = 1000;

export const getDungeonBossLabel = (mission, stepIndex) => {
  const bossNames = getDungeonBossNames(mission);
  return bossNames[stepIndex] || `Boss ${stepIndex + 1}`;
};

export const getDefaultDungeonProgress = (mission, startTime, totalDuration) => {
  const dungeonBossCount = getDungeonBossCount(mission);
  const safeDuration = Math.max(
    MIN_DUNGEON_TOTAL_DURATION_MS,
    Number(totalDuration) || 0,
  );
  const stepDuration = Math.max(
    MIN_DUNGEON_STEP_DURATION_MS,
    Math.floor(safeDuration / dungeonBossCount),
  );
  const maxAttempts = getMissionMaxAttempts(mission);
  return {
    currentStep: 0,
    clearedSteps: 0,
    failedAtStep: null,
    stepResults: [],
    stepDuration,
    nextStepAt: startTime + stepDuration,
    finished: false,
    maxAttempts,
    attemptsUsed: 0,
  };
};

export const advanceDungeonMission = (mission, now, instant = false) => {
  if (mission.type !== "dungeon") {
    return { mission, stepLogs: [] };
  }

  const dungeonBossCount = getDungeonBossCount(mission);
  const baseProgress =
    mission.dungeonProgress ||
    getDefaultDungeonProgress(mission, mission.startTime || now, mission.totalDuration);
  const missionAttemptCap = getMissionMaxAttempts(mission);
  const progress = {
    ...baseProgress,
    stepResults: Array.isArray(baseProgress.stepResults)
      ? [...baseProgress.stepResults]
      : [],
    maxAttempts: missionAttemptCap,
    attemptsUsed: Math.max(
      0,
      Math.min(
        missionAttemptCap,
        Math.floor(Number(baseProgress.attemptsUsed) || 0),
      ),
    ),
  };
  const stepLogs = [];
  let adjustedTotalDuration = Number(mission.totalDuration);
  if (!Number.isFinite(adjustedTotalDuration) || adjustedTotalDuration <= 0) {
    adjustedTotalDuration = Math.max(
      MIN_DUNGEON_STEP_DURATION_MS,
      progress.stepDuration * Math.max(1, dungeonBossCount),
    );
  }
  let adjustedFinishTime = Number(mission.finishTime);
  if (!Number.isFinite(adjustedFinishTime)) {
    const start = Number(mission.startTime);
    adjustedFinishTime =
      (Number.isFinite(start) ? start : now) + adjustedTotalDuration;
  }
  const successChance =
    typeof mission.successChance === "number" ? mission.successChance : 100;

  while (
    !progress.finished &&
    progress.currentStep < dungeonBossCount &&
    (instant || now >= progress.nextStepAt)
  ) {
    const stepIndex = progress.currentStep;
    const bossName = getDungeonBossLabel(mission, stepIndex);
    const succeeded = Math.random() * 100 < successChance;
    const attemptForStep =
      progress.stepResults.filter((result) => result?.step === stepIndex + 1).length + 1;

    progress.stepResults.push({
      step: stepIndex + 1,
      bossName,
      attempt: attemptForStep,
      outcome: succeeded ? "cleared" : "failed",
    });
    stepLogs.push({
      type: "dungeon-step",
      missionInstanceId: mission.instanceId,
      missionId: mission.questId ?? mission.id,
      missionName: mission.name,
      bossName,
      step: stepIndex + 1,
      attempt: attemptForStep,
      outcome: succeeded ? "cleared" : "failed",
    });

    if (!succeeded) {
      if (missionAttemptCap > 0) {
        progress.attemptsUsed = Math.min(
          missionAttemptCap,
          progress.attemptsUsed + 1,
        );
        const attemptsRemaining = Math.max(
          0,
          missionAttemptCap - progress.attemptsUsed,
        );
        stepLogs.push({
          type: "mission-attempt",
          missionInstanceId: mission.instanceId,
          missionId: mission.questId ?? mission.id,
          missionName: mission.name,
          bossName,
          step: stepIndex + 1,
          attemptsUsed: progress.attemptsUsed,
          maxAttempts: missionAttemptCap,
          attemptsRemaining,
        });
        if (attemptsRemaining <= 0) {
          progress.failedAtStep = stepIndex + 1;
          progress.finished = true;
          break;
        }
        adjustedTotalDuration += progress.stepDuration;
        adjustedFinishTime += progress.stepDuration;
        progress.failedAtStep = stepIndex + 1;
        progress.nextStepAt = Math.max(
          progress.nextStepAt + progress.stepDuration,
          now + progress.stepDuration,
        );
        if (!instant) break;
        continue;
      }
      progress.failedAtStep = stepIndex + 1;
      progress.finished = true;
      break;
    }

    progress.clearedSteps = stepIndex + 1;
    progress.currentStep = stepIndex + 1;
    progress.failedAtStep = null;
    if (progress.currentStep >= dungeonBossCount) {
      progress.finished = true;
      progress.failedAtStep = null;
      break;
    }

    progress.nextStepAt += progress.stepDuration;
  }

  const resolvedMission = {
    ...mission,
    totalDuration: adjustedTotalDuration,
    finishTime: adjustedFinishTime,
    dungeonProgress: progress,
  };
  if (progress.finished) {
    resolvedMission.missionSuccess = progress.clearedSteps >= dungeonBossCount;
    resolvedMission.finishTime = Math.min(now, mission.finishTime || now);
  }

  return { mission: resolvedMission, stepLogs };
};
