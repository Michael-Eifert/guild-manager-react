export const getActiveDungeonRunMissions = (activeMissions = []) =>
  (Array.isArray(activeMissions) ? activeMissions : []).filter(
    (mission) => mission?.type === "dungeon" || mission?.isRaid === true,
  );

export const getActiveDungeonRunCount = (activeMissions = []) =>
  getActiveDungeonRunMissions(activeMissions).length;
