import type { Mission } from "../../types/missionTypes";

export interface DungeonMissionGroup {
  key: string;
  type: "set" | "single";
  name: string;
  missions: Mission[];
}

export const getDungeonMissionGroups = (missions: readonly Mission[]) => {
  const groups: DungeonMissionGroup[] = [];
  const groupedSets = new Map<string, DungeonMissionGroup>();
  missions.forEach((mission) => {
    if (mission?.dungeonSetId && mission?.dungeonSetName) {
      const groupKey = `set:${mission.dungeonSetId}`;
      if (!groupedSets.has(groupKey)) {
        const group: DungeonMissionGroup = {
          key: groupKey,
          type: "set",
          name: mission.dungeonSetName,
          missions: [],
        };
        groupedSets.set(groupKey, group);
        groups.push(group);
      }
      groupedSets.get(groupKey)?.missions.push(mission);
      return;
    }
    groups.push({ key: `mission:${mission.id}`, type: "single", name: mission?.name || "Dungeon", missions: [mission] });
  });

  groups.forEach((group) => group.missions.sort((left, right) => {
    const leftWingOrder = Number(left?.wingOrder) || 0;
    const rightWingOrder = Number(right?.wingOrder) || 0;
    if (leftWingOrder !== rightWingOrder) return leftWingOrder - rightWingOrder;
    if ((left?.level || 0) !== (right?.level || 0)) return (left?.level || 0) - (right?.level || 0);
    return String(left?.name || "").localeCompare(String(right?.name || ""));
  }));

  return groups.map((group) => group.type === "set" && group.missions.length === 1
    ? { key: `mission:${group.missions[0].id}`, type: "single", name: group.missions[0]?.name || "Dungeon", missions: group.missions }
    : group);
};

export const sortDungeonWingsByProgression = (left: Mission, right: Mission) => {
  if ((left?.level || 0) !== (right?.level || 0)) return (left?.level || 0) - (right?.level || 0);
  const leftWingOrder = Number(left?.wingOrder) || 0;
  const rightWingOrder = Number(right?.wingOrder) || 0;
  if (leftWingOrder !== rightWingOrder) return leftWingOrder - rightWingOrder;
  return String(left?.name || "").localeCompare(String(right?.name || ""));
};
