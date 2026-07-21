import type { Mission } from "../types/missionTypes";

export const getActiveDungeonRunMissions = (activeMissions: readonly Mission[] = []) =>
  (Array.isArray(activeMissions) ? activeMissions : []).filter(
    (mission) => mission?.type === "dungeon" || mission?.isRaid === true,
  );

export const getActiveDungeonRunCount = (activeMissions: readonly Mission[] = []) =>
  getActiveDungeonRunMissions(activeMissions).length;
