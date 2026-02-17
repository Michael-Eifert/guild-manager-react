export const DEFAULT_DUNGEON_BOSS_NAMES = Object.freeze([
  "Boss 1",
  "Boss 2",
  "Boss 3",
  "Endboss",
]);

export const resolveMissionRewardQualities = (mission) => {
  if (Array.isArray(mission?.rewardQualities) && mission.rewardQualities.length) {
    return mission.rewardQualities;
  }
  if (mission?.type === "dungeon") return [2, 3];
  if (mission?.elite) return [2];
  return [1];
};

export const getMissionGoldReward = (mission) =>
  typeof mission?.gold === "number" ? Math.max(0, mission.gold) : 0;

export const getMissionTypeLabel = (mission) =>
  mission?.typeLabel ||
  (mission?.type === "dungeon" ? "Dungeon" : mission?.elite ? "Elite Quest" : "Quest");

export const getMissionMetaText = (mission) =>
  `${getMissionTypeLabel(mission)} • Lvl ${mission?.recommended || mission?.level} • ${mission?.duration}s`;

export const getMissionRecommendedRange = (mission) => {
  if (typeof mission?.recommended !== "string") return null;
  const rangeValues = mission.recommended.match(/\d+/g);
  if (!rangeValues || rangeValues.length < 2) return null;

  const minLevel = Number(rangeValues[0]);
  const maxLevel = Number(rangeValues[1]);
  if (!Number.isFinite(minLevel) || !Number.isFinite(maxLevel)) return null;

  return { minLevel, maxLevel };
};

export const getMissionLootLevelRange = (mission) => {
  if (mission?.type === "dungeon") {
    const recommendedRange = getMissionRecommendedRange(mission);
    const recommendedMax = recommendedRange ? recommendedRange.maxLevel : null;
    const fallbackMissionLevel = Number(mission?.level) || 1;
    const minLevel = Number.isFinite(mission?.minLevel)
      ? Math.max(1, Number(mission.minLevel))
      : Math.max(1, fallbackMissionLevel - 6);
    const maxLevel =
      Number.isFinite(recommendedMax) && recommendedMax > 0
        ? recommendedMax
        : fallbackMissionLevel;
    return { minLevel, maxLevel };
  }

  const missionLevel = Number(mission?.level) || 1;
  return {
    minLevel: Math.max(1, missionLevel - 6),
    maxLevel: missionLevel,
  };
};

export const getDungeonOverlevelExpMultiplier = (characterLevel, mission) => {
  if (mission?.type !== "dungeon") return 1;

  const range = getMissionRecommendedRange(mission);
  const maxRecommendedLevel = range ? range.maxLevel : Number(mission?.level) || 1;
  const levelsAbove = (Number(characterLevel) || 1) - maxRecommendedLevel;

  if (levelsAbove <= 0) return 1;
  if (levelsAbove >= 10) return 0;
  if (levelsAbove >= 5) return 0.5;
  return 0.75;
};

export const getMissionLevelExpMultiplier = (characterLevel, mission) => {
  const missionType = String(mission?.type || "").toLowerCase();
  if (missionType !== "quest" && missionType !== "dungeon") return 1;

  const level = Number(characterLevel) || 1;
  if (level >= 50) return 0.5;
  if (level >= 40) return 0.75;
  return 1;
};

export const getMissionRewardQualities = (mission) =>
  resolveMissionRewardQualities(mission);

export const getMissionRewardKeys = (mission) =>
  Array.isArray(mission?.rewardKeys)
    ? mission.rewardKeys
        .map((keyId) => String(keyId || "").trim())
        .filter(Boolean)
    : [];

export const getMissionRequiredKeys = (mission) => {
  if (!mission?.requiresKey) return [];
  const keyId = String(mission?.keyId || "").trim();
  return keyId ? [keyId] : [];
};

export const getCharacterOwnedKeys = (character) =>
  Array.isArray(character?.keys)
    ? character.keys
        .map((keyId) => String(keyId || "").trim())
        .filter(Boolean)
    : [];

export const evaluateMissionKeyAccess = ({ missions, partyMembers }) => {
  const missionSequence = (Array.isArray(missions) ? missions : []).filter(Boolean);
  const selectedPartyMembers = Array.isArray(partyMembers) ? partyMembers : [];

  const initialKeySet = new Set();
  selectedPartyMembers.forEach((member) => {
    getCharacterOwnedKeys(member).forEach((keyId) => initialKeySet.add(keyId));
  });

  const activeKeySet = new Set(initialKeySet);
  const requiredKeySet = new Set();
  const unlockedDuringSequenceSet = new Set();
  const missingRequirements = [];

  for (const mission of missionSequence) {
    const requiredKeys = getMissionRequiredKeys(mission);
    requiredKeys.forEach((keyId) => requiredKeySet.add(keyId));
    const missingKeys = requiredKeys.filter((keyId) => !activeKeySet.has(keyId));
    if (missingKeys.length > 0) {
      missingRequirements.push({
        missionId: mission?.id || null,
        missionName: mission?.name || "Mission",
        keyIds: missingKeys,
      });
      break;
    }

    getMissionRewardKeys(mission).forEach((keyId) => {
      if (!activeKeySet.has(keyId)) unlockedDuringSequenceSet.add(keyId);
      activeKeySet.add(keyId);
    });
  }

  const missingKeySet = new Set();
  missingRequirements.forEach((entry) => {
    entry.keyIds.forEach((keyId) => missingKeySet.add(keyId));
  });

  const requiredKeyIds = [...requiredKeySet];
  const initialKeyIds = [...initialKeySet];
  const unlockedDuringSequence = [...unlockedDuringSequenceSet];

  return {
    canEnter: missingRequirements.length === 0,
    missingRequirements,
    firstBlockingRequirement: missingRequirements[0] || null,
    missingKeyIds: [...missingKeySet],
    requiredKeyIds,
    initialKeyIds,
    activeKeyIds: [...activeKeySet],
    unlockedDuringSequence,
    unlockedRequiredKeyIds: requiredKeyIds.filter(
      (keyId) =>
        unlockedDuringSequenceSet.has(keyId) && !initialKeySet.has(keyId),
    ),
    partyHasAnyRequiredKey: requiredKeyIds.some((keyId) => initialKeySet.has(keyId)),
  };
};

export const getDungeonQuarterExpMultiplier = (clearedBosses, totalBosses) => {
  const safeTotalBosses = Math.max(1, Number(totalBosses) || 0);
  const safeClearedBosses = Math.max(
    0,
    Math.min(safeTotalBosses, Number(clearedBosses) || 0),
  );
  const progressRatio = safeClearedBosses / safeTotalBosses;
  const unlockedQuarterSteps = Math.floor(progressRatio * 4);
  return Math.max(0, Math.min(1, unlockedQuarterSteps / 4));
};

export const getDungeonBossNames = (mission) => {
  const configuredBosses = Array.isArray(mission?.dungeonBosses)
    ? mission.dungeonBosses
        .map((bossName) => String(bossName || "").trim())
        .filter(Boolean)
    : [];
  const configuredBossCount = Number(mission?.dungeonBossCount);
  const hasCustomBossCount = Number.isFinite(configuredBossCount);
  const normalizedBossCount = hasCustomBossCount
    ? Math.max(1, Math.floor(configuredBossCount))
    : configuredBosses.length > 0
      ? configuredBosses.length
      : DEFAULT_DUNGEON_BOSS_NAMES.length;

  if (configuredBosses.length >= normalizedBossCount) {
    return configuredBosses.slice(0, normalizedBossCount);
  }

  if (configuredBosses.length > 0) {
    const generatedFallbacks = Array.from(
      { length: normalizedBossCount - configuredBosses.length },
      (_, index) => {
        const overallIndex = configuredBosses.length + index;
        return overallIndex === normalizedBossCount - 1
          ? "Endboss"
          : `Boss ${overallIndex + 1}`;
      },
    );
    return [...configuredBosses, ...generatedFallbacks];
  }

  if (normalizedBossCount === DEFAULT_DUNGEON_BOSS_NAMES.length) {
    return [...DEFAULT_DUNGEON_BOSS_NAMES];
  }

  return Array.from({ length: normalizedBossCount }, (_, index) =>
    index === normalizedBossCount - 1 ? "Endboss" : `Boss ${index + 1}`,
  );
};

export const getDungeonBossCount = (mission) => getDungeonBossNames(mission).length;
