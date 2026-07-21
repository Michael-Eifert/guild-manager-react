import { advanceDungeonMission } from "./dungeonEngine";
import type { GuildLogEntry, Mission } from "../app/gameTypes";

type RuntimeMission = Mission & Record<string, any>;

export type MissionTickResult = {
  activeMissions: RuntimeMission[];
  finishedMissions: RuntimeMission[];
  stepLogs: GuildLogEntry[];
  guildGold: number;
};

type MissionWipeCostResult = {
  updatedGold: number;
  wipeCostLog: GuildLogEntry | null;
};

export const advanceActiveMissionsForTick = ({
  activeMissions,
  now,
  currentGold,
  applyMissionWipeCosts,
  random = Math.random,
}: {
  activeMissions: RuntimeMission[];
  now: number;
  currentGold: number;
  applyMissionWipeCosts?: (
    mission: RuntimeMission,
    logs: GuildLogEntry[],
    gold: number,
  ) => MissionWipeCostResult;
  random?: () => number;
}): MissionTickResult => {
  const safeMissions = Array.isArray(activeMissions) ? activeMissions : [];
  let updatedGold = Math.max(0, Number(currentGold) || 0);
  const stepLogs: GuildLogEntry[] = [];
  const active: RuntimeMission[] = [];
  const finished: RuntimeMission[] = [];

  safeMissions.forEach((mission) => {
    let currentMission = mission;
    if (currentMission.type === "dungeon") {
      const dungeonAdvance = advanceDungeonMission(currentMission, now, false, random);
      currentMission = dungeonAdvance.mission;
      if (dungeonAdvance.stepLogs.length > 0) {
        const wipeCostResult = applyMissionWipeCosts
          ? applyMissionWipeCosts(currentMission, dungeonAdvance.stepLogs, updatedGold)
          : { updatedGold, wipeCostLog: null };
        updatedGold = wipeCostResult.updatedGold;
        if (wipeCostResult.wipeCostLog) stepLogs.push(wipeCostResult.wipeCostLog);
        stepLogs.push(...dungeonAdvance.stepLogs);
      }
    }

    const dungeonFinished = Boolean(currentMission.dungeonProgress?.finished);
    if (Number(currentMission.finishTime) <= now || dungeonFinished) finished.push(currentMission);
    else active.push(currentMission);
  });

  return { activeMissions: active, finishedMissions: finished, stepLogs, guildGold: updatedGold };
};

export const appendRuntimeLogs = (
  existingLogs: GuildLogEntry[],
  newLogs: GuildLogEntry[],
  time: string,
  maximumEntries = 50,
) => [
  ...newLogs.map((log) => ({ time, ...log })),
  ...existingLogs,
].slice(0, maximumEntries);
