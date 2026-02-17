export const DEFAULT_DUNGEON_BOSS_NAMES = Object.freeze([
  "Boss 1",
  "Boss 2",
  "Boss 3",
  "Endboss",
]);
export const DEFAULT_DUNGEON_MAX_ATTEMPTS = 4;
export const DEFAULT_RAID_MAX_ATTEMPTS = 10;

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
  (mission?.isRaid
    ? "Raid"
    : mission?.type === "dungeon"
      ? "Dungeon"
      : mission?.elite
        ? "Elite Quest"
        : "Quest");

export const getMissionMetaText = (mission) =>
  `${getMissionTypeLabel(mission)} • Lvl ${mission?.recommended || mission?.level} • ${mission?.duration}s`;

export const getMissionMaxAttempts = (mission) => {
  if (mission?.type !== "dungeon") return 0;

  const explicitMaxAttempts = Number(mission?.maxAttempts);
  if (Number.isFinite(explicitMaxAttempts) && explicitMaxAttempts > 0) {
    return Math.max(1, Math.floor(explicitMaxAttempts));
  }

  if (mission?.isRaid === true) {
    const raidAttempts = Number(mission?.raidMaxAttempts);
    if (Number.isFinite(raidAttempts) && raidAttempts > 0) {
      return Math.max(1, Math.floor(raidAttempts));
    }
    return DEFAULT_RAID_MAX_ATTEMPTS;
  }

  return DEFAULT_DUNGEON_MAX_ATTEMPTS;
};

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

  // Quest/Elite quest XP is already tuned per-level in constants.
  // Keep additional mission-level multiplier neutral here.
  if (missionType === "quest") return 1;

  const safeLevel = Math.max(1, Number(characterLevel) || 1);
  const dungeonMultiplierPoints = [
    { level: 10, multiplier: 0.66 },
    { level: 20, multiplier: 0.6 },
    { level: 30, multiplier: 0.68 },
    { level: 40, multiplier: 0.72 },
    { level: 50, multiplier: 0.88 },
    { level: 58, multiplier: 0.72 },
    { level: 60, multiplier: 0.72 },
  ];

  if (safeLevel <= dungeonMultiplierPoints[0].level) {
    return dungeonMultiplierPoints[0].multiplier;
  }

  for (let index = 1; index < dungeonMultiplierPoints.length; index += 1) {
    const previous = dungeonMultiplierPoints[index - 1];
    const current = dungeonMultiplierPoints[index];
    if (safeLevel > current.level) continue;
    const span = Math.max(1, current.level - previous.level);
    const progress = (safeLevel - previous.level) / span;
    return (
      previous.multiplier +
      (current.multiplier - previous.multiplier) * progress
    );
  }

  return dungeonMultiplierPoints[dungeonMultiplierPoints.length - 1].multiplier;
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
  const partyKeyMap = new Map();
  selectedPartyMembers.forEach((member) => {
    const keySet = new Set(getCharacterOwnedKeys(member));
    partyKeyMap.set(member?.id, keySet);
    keySet.forEach((keyId) => initialKeySet.add(keyId));
  });

  const activeKeySet = new Set(initialKeySet);
  const requiredKeySet = new Set();
  const unlockedDuringSequenceSet = new Set();
  const missingRequirements = [];
  let requiresAllMembers = false;

  for (const mission of missionSequence) {
    const requiredKeys = getMissionRequiredKeys(mission);
    requiredKeys.forEach((keyId) => requiredKeySet.add(keyId));
    const requiresAllMembersForMission = mission?.requiresKeyForAllMembers === true;
    requiresAllMembers = requiresAllMembers || requiresAllMembersForMission;

    const missingKeys = requiredKeys.filter((keyId) => {
      if (requiresAllMembersForMission) {
        if (selectedPartyMembers.length === 0) return !activeKeySet.has(keyId);
        return selectedPartyMembers.some((member) => {
          const memberKeys = partyKeyMap.get(member?.id);
          return !memberKeys?.has(keyId);
        });
      }
      return !activeKeySet.has(keyId);
    });
    if (missingKeys.length > 0) {
      missingRequirements.push({
        missionId: mission?.id || null,
        missionName: mission?.name || "Mission",
        keyIds: missingKeys,
        requiresAllMembers: requiresAllMembersForMission,
      });
      break;
    }

    getMissionRewardKeys(mission).forEach((keyId) => {
      if (!activeKeySet.has(keyId)) unlockedDuringSequenceSet.add(keyId);
      activeKeySet.add(keyId);
      selectedPartyMembers.forEach((member) => {
        const memberKeys = partyKeyMap.get(member?.id);
        if (memberKeys) memberKeys.add(keyId);
      });
    });
  }

  const missingKeySet = new Set();
  missingRequirements.forEach((entry) => {
    entry.keyIds.forEach((keyId) => missingKeySet.add(keyId));
  });

  const requiredKeyIds = [...requiredKeySet];
  const initialKeyIds = [...initialKeySet];
  const unlockedDuringSequence = [...unlockedDuringSequenceSet];
  const partyHasAllRequiredKeys =
    requiredKeyIds.length === 0 ||
    selectedPartyMembers.every((member) => {
      const memberKeys = partyKeyMap.get(member?.id);
      if (!memberKeys) return false;
      return requiredKeyIds.every((keyId) => memberKeys.has(keyId));
    });

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
    requiresAllMembers,
    partyHasAnyRequiredKey: requiredKeyIds.some((keyId) => initialKeySet.has(keyId)),
    partyHasAllRequiredKeys,
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
