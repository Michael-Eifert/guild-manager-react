export const cloneMissionTemplate = (mission) => ({
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
});
