import { advanceDungeonMission } from "./dungeonEngine";

export const advanceActiveMissionsForTick = ({
  activeMissions,
  now,
  currentGold,
  applyMissionWipeCosts,
}) => {
  const safeMissions = Array.isArray(activeMissions) ? activeMissions : [];
  let updatedGold = Math.max(0, Number(currentGold) || 0);
  let stepLogs = [];
  const active = [];
  const finished = [];

  safeMissions.forEach((mission) => {
    let currentMission = mission;
    if (currentMission.type === "dungeon") {
      const dungeonAdvance = advanceDungeonMission(currentMission, now);
      currentMission = dungeonAdvance.mission;
      if (dungeonAdvance.stepLogs.length > 0) {
        const wipeCostResult =
          typeof applyMissionWipeCosts === "function"
            ? applyMissionWipeCosts(
                currentMission,
                dungeonAdvance.stepLogs,
                updatedGold,
              )
            : { updatedGold, wipeCostLog: null };
        updatedGold = wipeCostResult.updatedGold;
        if (wipeCostResult.wipeCostLog) {
          stepLogs = [...stepLogs, wipeCostResult.wipeCostLog];
        }
        stepLogs = [...stepLogs, ...dungeonAdvance.stepLogs];
      }
    }

    const dungeonFinished = Boolean(currentMission.dungeonProgress?.finished);
    if (currentMission.finishTime <= now || dungeonFinished) {
      finished.push(currentMission);
    } else {
      active.push(currentMission);
    }
  });

  return {
    activeMissions: active,
    finishedMissions: finished,
    stepLogs,
    guildGold: updatedGold,
  };
};
