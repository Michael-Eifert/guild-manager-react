import type { Mission } from "../types/missionTypes";

export const cloneMissionTemplate = <T extends Mission>(mission: T): T => ({
  ...mission,
  rewardQualities: Array.isArray(mission.rewardQualities)
    ? [...mission.rewardQualities]
    : mission.rewardQualities,
  rewardKeys: Array.isArray(mission.rewardKeys)
    ? [...mission.rewardKeys]
    : mission.rewardKeys,
  dungeonBosses: Array.isArray(mission.dungeonBosses)
    ? [...mission.dungeonBosses]
    : mission.dungeonBosses,
  dungeonLootTable: mission.dungeonLootTable
    ? JSON.parse(JSON.stringify(mission.dungeonLootTable))
    : mission.dungeonLootTable,
  bonusDrops: Array.isArray(mission.bonusDrops)
    ? JSON.parse(JSON.stringify(mission.bonusDrops))
    : mission.bonusDrops,
  raidRoleRequirement:
    mission.raidRoleRequirement &&
    typeof mission.raidRoleRequirement === "object"
      ? { ...mission.raidRoleRequirement }
      : mission.raidRoleRequirement,
}) as T;

export const mergeCanonicalMissionTemplates = (
  missionList: readonly Mission[] | null | undefined,
  canonicalMissionList: readonly Mission[],
) => {
  const canonicalById = new Map(
    canonicalMissionList.map((mission) => [String(mission.id), mission]),
  );
  const merged = (Array.isArray(missionList) ? missionList : []).map((mission) => {
    const canonical = canonicalById.get(String(mission.id));
    if (!canonical) return cloneMissionTemplate(mission);

    return {
      ...cloneMissionTemplate(canonical),
      ...cloneMissionTemplate(mission),
      ...(canonical.requiredFaction
        ? { requiredFaction: canonical.requiredFaction }
        : {}),
      ...(canonical.zoneId ? { zoneId: canonical.zoneId } : {}),
    };
  });
  const presentIds = new Set(merged.map((mission) => String(mission.id)));

  canonicalMissionList.forEach((mission) => {
    if (!presentIds.has(String(mission.id))) {
      merged.push(cloneMissionTemplate(mission));
    }
  });

  return merged;
};
