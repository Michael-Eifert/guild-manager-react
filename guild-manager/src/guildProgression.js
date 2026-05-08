import { CONFIG } from "./constants";

export const GUILD_POINT_LABEL = "Guild Renown";
export const GUILD_LEVEL_MILESTONES = [10, 20, 30, 40, 50, 60];
export const GUILD_LEVEL_MILESTONE_REWARDS = {
  10: 1,
  20: 1,
  30: 2,
  40: 2,
  50: 3,
  60: 5,
};
export const GUILD_ROSTER_SIZE_MILESTONES = [
  { target: 10, reward: 1, label: "One small step..." },
  { target: 20, reward: 1, label: "Now We Need a Bigger Inn" },
  { target: 40, reward: 2, label: "Raid Roster" },
];
export const GUILD_DUNGEON_CLEAR_MILESTONES = [
  { target: 1, reward: 1, label: "First dungeon clear" },
  { target: 5, reward: 2, label: "5 dungeon clears" },
  { target: 10, reward: 3, label: "10 dungeon clears" },
];
export const GUILD_DUNGEON_WIPE_MILESTONE = {
  reward: 1,
  label: "First dungeon wipe",
};
export const GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE = {
  reward: 5,
  label: "Cleared Scarlet Monastery",
  dungeonSetName: "Scarlet Monastery",
  wingNames: ["Graveyard", "Library", "Armory", "Cathedral"],
};
export const GUILD_GNOMEREGAN_CLEAR_MILESTONE = {
  reward: 1,
  label: "Clear Gnomeregan",
  dungeonName: "Gnomeregan",
};
export const GUILD_BLACKROCK_DEPTHS_CLEAR_MILESTONE = {
  reward: 5,
  label: "Cleared Blackrock Depths",
  dungeonSetName: "Blackrock Depths",
  missionNamePrefix: "BRD:",
  wingNames: ["Arena & Prison", "Shadowforge", "Shadowforge City"],
};
export const GUILD_SCOURGE_CLEAR_MILESTONE = {
  reward: 5,
  label: "Cleared The Scourge - Stratholme & Scholomance",
  stratholmeSetName: "Stratholme",
  stratholmeWingNames: ["Scarlet Side", "Undead Side"],
  scholomanceDungeonName: "Scholomance",
};
export const GUILD_MOLTEN_CORE_CLEAR_MILESTONE = {
  key: "moltenCoreCleared",
  reward: 5,
  label: "Cleared Molten Core",
  dungeonName: "Molten Core",
};
export const GUILD_RAID_CLEAR_MILESTONES = [
  GUILD_MOLTEN_CORE_CLEAR_MILESTONE,
  {
    key: "zulGurubCleared",
    reward: 3,
    label: "Cleared ZG",
    dungeonName: "Zul'Gurub",
  },
  {
    key: "ahnQirajRuinsCleared",
    reward: 3,
    label: "Cleared AQ20",
    dungeonName: "Ruins of Ahn'Qiraj",
  },
  {
    key: "onyxiasLairCleared",
    reward: 3,
    label: "Cleared Onyxia",
    dungeonName: "Onyxia's Lair",
  },
  {
    key: "blackwingLairCleared",
    reward: 5,
    label: "Cleared BWL",
    dungeonName: "Blackwing Lair",
  },
  {
    key: "ahnQirajTempleCleared",
    reward: 5,
    label: "Cleared AQ40",
    dungeonName: "Temple of Ahn'Qiraj",
  },
];

export const GUILD_TALENT_DEFS = {
  rosterCap: {
    key: "rosterCap",
    category: "roster",
    title: "War Council",
    description: "Increase maximum guild roster size.",
    suffix: "slots",
    ranks: [
      { value: 10, displayValue: 10, cost: 1 },
      { value: 30, displayValue: 20, cost: 2 },
      { value: 70, displayValue: 40, cost: 4 },
    ],
  },
  expBoost: {
    key: "expBoost",
    category: "roster",
    title: "Drill Doctrine",
    description: "All members gain additional experience.",
    suffix: "% XP",
    ranks: [
      { value: 5, cost: 1 },
      { value: 10, cost: 2 },
      { value: 15, cost: 4 },
    ],
  },
  raidAttunement: {
    key: "raidAttunement",
    category: "roster",
    title: "Raid Attunement",
    description: "Unlock raid missions on the mission board.",
    suffix: "unlock",
    ranks: [{ value: 1, cost: 5 }],
  },
  goldCap: {
    key: "goldCap",
    category: "economy",
    title: "Vault Expansion",
    description: "Increase guild bank gold capacity.",
    suffix: "gold cap",
    ranks: [
      { value: 500, cost: 1 },
      { value: 1500, cost: 2 },
      { value: 3000, cost: 4 },
    ],
  },
  goldGain: {
    key: "goldGain",
    category: "economy",
    title: "Trade Network",
    description: "Missions grant additional gold.",
    suffix: "% gold",
    ranks: [
      { value: 25, cost: 1 },
      { value: 50, cost: 2 },
      { value: 100, cost: 4 },
    ],
  },
};

export const GUILD_TALENT_CATEGORY_META = {
  roster: {
    title: "Guild Roster",
    subtitle: "Expand and empower your roster.",
  },
  economy: {
    title: "Economy",
    subtitle: "Scale treasury growth and storage.",
  },
};

export const GUILD_TALENT_TREE_TIERS = Object.freeze([
  Object.freeze([
    Object.freeze({ id: "wc1", talentKey: "rosterCap", targetRank: 1, label: "War Council I" }),
    Object.freeze({ id: "dd1", talentKey: "expBoost", targetRank: 1, label: "Drill Doctrine I" }),
    Object.freeze({ id: "ve1", talentKey: "goldCap", targetRank: 1, label: "Vault Expansion I" }),
  ]),
  Object.freeze([
    Object.freeze({ id: "wc2", talentKey: "rosterCap", targetRank: 2, label: "War Council II" }),
    Object.freeze({ id: "dd2", talentKey: "expBoost", targetRank: 2, label: "Drill Doctrine II" }),
    Object.freeze({ id: "tn1", talentKey: "goldGain", targetRank: 1, label: "Trade Network I" }),
  ]),
  Object.freeze([
    Object.freeze({ id: "wc3", talentKey: "rosterCap", targetRank: 3, label: "War Council III" }),
    Object.freeze({ id: "dd3", talentKey: "expBoost", targetRank: 3, label: "Drill Doctrine III" }),
    Object.freeze({ id: "ve2", talentKey: "goldCap", targetRank: 2, label: "Vault Expansion II" }),
    Object.freeze({ id: "tn2", talentKey: "goldGain", targetRank: 2, label: "Trade Network II" }),
  ]),
  Object.freeze([
    Object.freeze({ id: "ve3", talentKey: "goldCap", targetRank: 3, label: "Vault Expansion III" }),
    Object.freeze({ id: "tn3", talentKey: "goldGain", targetRank: 3, label: "Trade Network III" }),
  ]),
  Object.freeze([
    Object.freeze({ id: "ra1", talentKey: "raidAttunement", targetRank: 1, label: "Raid Attunement" }),
  ]),
]);

const GUILD_TALENT_NODE_TIER_BY_KEY = (() => {
  const entries = [];
  GUILD_TALENT_TREE_TIERS.forEach((tierNodes, tierIndex) => {
    const tier = tierIndex + 1;
    tierNodes.forEach((node) => {
      if (!node?.talentKey || !Number.isFinite(node?.targetRank)) return;
      entries.push([`${node.talentKey}:${node.targetRank}`, tier]);
    });
  });
  return new Map(entries);
})();

const getGuildTalentNodeTier = (talentKey, targetRank) =>
  Math.max(
    1,
    Number(GUILD_TALENT_NODE_TIER_BY_KEY.get(`${talentKey}:${targetRank}`)) || 1,
  );

export const getGuildTalentTierGoldCost = (tier) => {
  const safeTier = Math.max(1, Math.floor(Number(tier) || 1));
  return safeTier * 10;
};

const createLevelMilestoneMap = () =>
  Object.fromEntries(GUILD_LEVEL_MILESTONES.map((level) => [level, false]));

const createRosterSizeMilestoneMap = () =>
  Object.fromEntries(
    GUILD_ROSTER_SIZE_MILESTONES.map((milestone) => [
      milestone.target,
      false,
    ]),
  );

const createDungeonClearMilestoneMap = () =>
  Object.fromEntries(
    GUILD_DUNGEON_CLEAR_MILESTONES.map((milestone) => [milestone.target, false]),
  );

const createWingMap = (wingNames = []) =>
  Object.fromEntries(wingNames.map((wing) => [wing, false]));

const getFallbackWingSetState = (wingSetState, wingNames) => {
  const rawState =
    wingSetState && typeof wingSetState === "object" ? wingSetState : {};
  const rawWings =
    rawState.wingsCleared && typeof rawState.wingsCleared === "object"
      ? rawState.wingsCleared
      : {};
  const wingsCleared = {
    ...createWingMap(wingNames),
    ...rawWings,
  };
  const fullClear = Boolean(
    rawState.fullClear || Object.values(wingsCleared).every(Boolean),
  );

  if (fullClear) {
    Object.keys(wingsCleared).forEach((wing) => {
      wingsCleared[wing] = true;
    });
  }

  return {
    wingsCleared,
    fullClear,
  };
};

const getFallbackScarletMonasteryState = (scarletState) =>
  getFallbackWingSetState(
    scarletState,
    GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.wingNames,
  );
const getFallbackBlackrockDepthsState = (blackrockDepthsState) =>
  getFallbackWingSetState(
    blackrockDepthsState,
    GUILD_BLACKROCK_DEPTHS_CLEAR_MILESTONE.wingNames,
  );
const getFallbackStratholmeState = (stratholmeState) =>
  getFallbackWingSetState(
    stratholmeState,
    GUILD_SCOURGE_CLEAR_MILESTONE.stratholmeWingNames,
  );

const escapeRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveWingNameForSet = ({
  missionName,
  missionSetName,
  missionWing,
  dungeonSetName,
  missionNamePrefix = "",
  wingNames = [],
}) => {
  const missionLabel = String(missionName || "");
  const setLabel = String(missionSetName || "");
  const wingLabel = String(missionWing || "");
  const normalizedSetName = String(dungeonSetName || "").toLowerCase();
  const normalizedPrefix = String(missionNamePrefix || "").toLowerCase();
  const normalizedMissionName = missionLabel.toLowerCase();
  const normalizedMissionSet = setLabel.toLowerCase();

  const isMissionInSet =
    (normalizedSetName &&
      (normalizedMissionSet === normalizedSetName ||
        normalizedMissionName.startsWith(`${normalizedSetName}:`))) ||
    (normalizedPrefix && normalizedMissionName.startsWith(normalizedPrefix));
  if (!isMissionInSet) return null;

  let candidateWingName = wingLabel;
  if (!candidateWingName) {
    if (normalizedSetName && normalizedMissionName.startsWith(`${normalizedSetName}:`)) {
      candidateWingName = missionLabel
        .replace(new RegExp(`^${escapeRegExp(dungeonSetName)}:\\s*`, "i"), "")
        .trim();
    } else if (normalizedPrefix && normalizedMissionName.startsWith(normalizedPrefix)) {
      candidateWingName = missionLabel
        .replace(new RegExp(`^${escapeRegExp(missionNamePrefix)}\\s*`, "i"), "")
        .trim();
    }
  }
  const normalized = candidateWingName.toLowerCase();
  return wingNames.find((wing) => wing.toLowerCase() === normalized) || null;
};

const resolveScarletWingName = (missionData) =>
  resolveWingNameForSet({
    ...missionData,
    dungeonSetName: GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.dungeonSetName,
    missionNamePrefix: "Scarlet Monastery:",
    wingNames: GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.wingNames,
  });
const resolveBlackrockDepthsWingName = (missionData) =>
  resolveWingNameForSet({
    ...missionData,
    dungeonSetName: GUILD_BLACKROCK_DEPTHS_CLEAR_MILESTONE.dungeonSetName,
    missionNamePrefix: GUILD_BLACKROCK_DEPTHS_CLEAR_MILESTONE.missionNamePrefix,
    wingNames: GUILD_BLACKROCK_DEPTHS_CLEAR_MILESTONE.wingNames,
  });
const resolveStratholmeWingName = (missionData) =>
  resolveWingNameForSet({
    ...missionData,
    dungeonSetName: GUILD_SCOURGE_CLEAR_MILESTONE.stratholmeSetName,
    missionNamePrefix: "Stratholme ",
    wingNames: GUILD_SCOURGE_CLEAR_MILESTONE.stratholmeWingNames,
  });

const getFallbackDungeonState = (dungeonState) => ({
  clearCount: Math.max(0, Math.floor(Number(dungeonState?.clearCount) || 0)),
  clearReached: {
    ...createDungeonClearMilestoneMap(),
    ...(dungeonState?.clearReached || {}),
  },
  firstWipe: Boolean(dungeonState?.firstWipe),
  gnomereganCleared: Boolean(dungeonState?.gnomereganCleared),
  scarletMonastery: getFallbackScarletMonasteryState(
    dungeonState?.scarletMonastery,
  ),
  blackrockDepths: getFallbackBlackrockDepthsState(
    dungeonState?.blackrockDepths,
  ),
  stratholme: getFallbackStratholmeState(dungeonState?.stratholme),
  scholomanceCleared: Boolean(dungeonState?.scholomanceCleared),
  scourgeCleared: Boolean(dungeonState?.scourgeCleared),
  moltenCoreCleared: Boolean(dungeonState?.moltenCoreCleared),
  zulGurubCleared: Boolean(dungeonState?.zulGurubCleared),
  ahnQirajRuinsCleared: Boolean(dungeonState?.ahnQirajRuinsCleared),
  onyxiasLairCleared: Boolean(dungeonState?.onyxiasLairCleared),
  blackwingLairCleared: Boolean(dungeonState?.blackwingLairCleared),
  ahnQirajTempleCleared: Boolean(dungeonState?.ahnQirajTempleCleared),
});

export const createInitialGuildProgress = () => ({
  renownPoints: 0,
  totalRenown: 0,
  talents: Object.keys(GUILD_TALENT_DEFS).reduce(
    (acc, key) => ({ ...acc, [key]: 0 }),
    {},
  ),
  milestones: {
    levelReached: createLevelMilestoneMap(),
    rosterSizeReached: createRosterSizeMilestoneMap(),
    dungeon: getFallbackDungeonState(),
  },
});

export const clampTalentRank = (talentKey, rank) => {
  const talentDef = GUILD_TALENT_DEFS[talentKey];
  if (!talentDef) return 0;
  const numericRank = Number(rank);
  if (!Number.isFinite(numericRank)) return 0;
  return Math.max(0, Math.min(talentDef.ranks.length, Math.floor(numericRank)));
};

const getTalentTitle = (talentKey) =>
  GUILD_TALENT_DEFS[talentKey]?.title || talentKey;

const hasTalentRank = (talents, talentKey, minRank) =>
  clampTalentRank(talentKey, talents?.[talentKey] || 0) >= Math.max(1, Number(minRank) || 1);

const getPrerequisiteStatusForUpgrade = (talents, talentKey, targetRank) => {
  const blockers = [];
  const addBlocker = (text) => {
    if (!text) return;
    blockers.push(text);
  };

  if (talentKey === "rosterCap" && targetRank === 2) {
    if (!hasTalentRank(talents, "expBoost", 1)) {
      addBlocker("Requires Drill Doctrine I.");
    }
  }
  if (talentKey === "expBoost" && targetRank === 3) {
    if (!hasTalentRank(talents, "rosterCap", 2)) {
      addBlocker("Requires War Council II.");
    }
  }
  if (talentKey === "goldGain" && targetRank === 1) {
    if (!hasTalentRank(talents, "goldCap", 1)) {
      addBlocker("Requires Vault Expansion I.");
    }
  }
  if (talentKey === "goldCap" && targetRank === 2) {
    if (!hasTalentRank(talents, "goldGain", 1)) {
      addBlocker("Requires Trade Network I.");
    }
  }
  if (talentKey === "goldCap" && targetRank === 3) {
    if (!hasTalentRank(talents, "goldGain", 2)) {
      addBlocker("Requires Trade Network II.");
    }
  }
  if (talentKey === "goldGain" && targetRank === 3) {
    if (!hasTalentRank(talents, "goldCap", 2)) {
      addBlocker("Requires Vault Expansion II.");
    }
  }
  if (talentKey === "raidAttunement" && targetRank === 1) {
    const hasMidTier = hasTalentRank(talents, "rosterCap", 2) || hasTalentRank(talents, "expBoost", 2);
    const hasDeepTier = hasTalentRank(talents, "rosterCap", 3) || hasTalentRank(talents, "expBoost", 3);
    if (!hasMidTier) {
      addBlocker("Requires War Council II or Drill Doctrine II.");
    }
    if (!hasDeepTier) {
      addBlocker("Requires War Council III or Drill Doctrine III.");
    }
  }

  return {
    meets: blockers.length === 0,
    blockers,
  };
};

export const getGuildTalentUpgradeStatus = (guildProgress, talentKey) => {
  const normalized = normalizeGuildProgress(guildProgress);
  const talentDef = GUILD_TALENT_DEFS[talentKey];

  if (!talentDef) {
    return {
      talent: null,
      currentRank: 0,
      nextRankData: null,
      canUpgrade: false,
      blockedByPrerequisite: false,
      blockers: ["Unknown talent."],
      missingCost: 0,
      tier: 0,
      goldCost: 0,
    };
  }

  const currentRank = clampTalentRank(talentKey, normalized.talents[talentKey]);
  const nextRankData = talentDef.ranks[currentRank] || null;
  if (!nextRankData) {
    return {
      talent: talentDef,
      currentRank,
      nextRankData: null,
      canUpgrade: false,
      blockedByPrerequisite: false,
      blockers: [],
      missingCost: 0,
      tier: 0,
      goldCost: 0,
    };
  }

  const targetRank = currentRank + 1;
  const tier = getGuildTalentNodeTier(talentKey, targetRank);
  const goldCost = getGuildTalentTierGoldCost(tier);
  const prerequisiteStatus = getPrerequisiteStatusForUpgrade(
    normalized.talents,
    talentKey,
    targetRank,
  );
  const missingCost = Math.max(0, (nextRankData.cost || 0) - normalized.renownPoints);
  const canUpgrade = prerequisiteStatus.meets && missingCost <= 0;

  return {
    talent: talentDef,
    currentRank,
    nextRankData,
    canUpgrade,
    blockedByPrerequisite: !prerequisiteStatus.meets,
    blockers: prerequisiteStatus.blockers,
    missingCost,
    tier,
    goldCost,
  };
};

export const getGuildTalentTreeNodeStatus = (guildProgress, node) => {
  const normalized = normalizeGuildProgress(guildProgress);
  const talentDef = GUILD_TALENT_DEFS[node?.talentKey];
  if (!talentDef) {
    return {
      unlocked: false,
      isCurrentTarget: false,
      canUnlockNow: false,
      blockers: ["Unknown talent."],
      cost: 0,
      goldCost: 0,
      title: node?.label || "Talent",
    };
  }

  const currentRank = clampTalentRank(node.talentKey, normalized.talents[node.talentKey]);
  const unlocked = currentRank >= node.targetRank;
  const isCurrentTarget = currentRank + 1 === node.targetRank;
  const nextStatus = getGuildTalentUpgradeStatus(normalized, node.talentKey);
  const canUnlockNow = isCurrentTarget && nextStatus.canUpgrade;
  const blockers = isCurrentTarget ? nextStatus.blockers : [];
  const cost = isCurrentTarget ? nextStatus.nextRankData?.cost || 0 : 0;
  const goldCost = isCurrentTarget ? nextStatus.goldCost || 0 : 0;

  return {
    unlocked,
    isCurrentTarget,
    canUnlockNow,
    blockers,
    cost,
    goldCost,
    title: node.label || `${getTalentTitle(node.talentKey)} ${node.targetRank}`,
  };
};

export const getTalentCurrentValue = (guildProgress, talentKey) => {
  const talentDef = GUILD_TALENT_DEFS[talentKey];
  if (!talentDef) return 0;
  const rank = clampTalentRank(talentKey, guildProgress?.talents?.[talentKey] || 0);
  if (rank <= 0) return 0;
  return talentDef.ranks[rank - 1]?.value || 0;
};

export const getGuildDerivedStats = (guildProgress) => {
  const rosterCapIncrease = getTalentCurrentValue(guildProgress, "rosterCap");
  const expBoostPercent = getTalentCurrentValue(guildProgress, "expBoost");
  const raidAttunementRank = getTalentCurrentValue(
    guildProgress,
    "raidAttunement",
  );
  const goldCapIncrease = getTalentCurrentValue(guildProgress, "goldCap");
  const goldGainPercent = getTalentCurrentValue(guildProgress, "goldGain");
  return {
    maxRoster: CONFIG.MAX_ROSTER + rosterCapIncrease,
    goldCap: CONFIG.GOLD_CAP + goldCapIncrease,
    expBoostPercent,
    goldGainPercent,
    raidUnlocked: raidAttunementRank > 0,
    expMultiplier: 1 + expBoostPercent / 100,
    goldMultiplier: 1 + goldGainPercent / 100,
  };
};

export const normalizeGuildProgress = (rawGuildProgress) => {
  const initial = createInitialGuildProgress();
  if (!rawGuildProgress || typeof rawGuildProgress !== "object") {
    return initial;
  }

  const talents = Object.keys(GUILD_TALENT_DEFS).reduce((acc, key) => {
    acc[key] = clampTalentRank(key, rawGuildProgress?.talents?.[key]);
    return acc;
  }, {});

  const levelReached = createLevelMilestoneMap();
  GUILD_LEVEL_MILESTONES.forEach((level) => {
    if (rawGuildProgress?.milestones?.levelReached?.[level]) {
      levelReached[level] = true;
    }
  });
  const rosterSizeReached = createRosterSizeMilestoneMap();
  GUILD_ROSTER_SIZE_MILESTONES.forEach((milestone) => {
    if (rawGuildProgress?.milestones?.rosterSizeReached?.[milestone.target]) {
      rosterSizeReached[milestone.target] = true;
    }
  });

  const rawDungeonMilestones = rawGuildProgress?.milestones?.dungeon || {};
  const clearReached = createDungeonClearMilestoneMap();
  GUILD_DUNGEON_CLEAR_MILESTONES.forEach((milestone) => {
    if (
      rawDungeonMilestones?.clearReached?.[milestone.target] ||
      rawGuildProgress?.milestones?.dungeonClearReached?.[milestone.target]
    ) {
      clearReached[milestone.target] = true;
    }
  });
  if (rawGuildProgress?.milestones?.firstDungeonClear) {
    clearReached[1] = true;
  }
  const clearCount = Math.max(
    0,
    Math.floor(
      Number(
        rawDungeonMilestones?.clearCount ||
          rawGuildProgress?.milestones?.dungeonClearCount ||
          (rawGuildProgress?.milestones?.firstDungeonClear ? 1 : 0),
      ) || 0,
    ),
  );
  GUILD_DUNGEON_CLEAR_MILESTONES.forEach((milestone) => {
    if (clearCount >= milestone.target) {
      clearReached[milestone.target] = true;
    }
  });
  const firstWipe = Boolean(
    rawDungeonMilestones?.firstWipe ||
      rawGuildProgress?.milestones?.firstDungeonWipe,
  );
  const gnomereganCleared = Boolean(
    rawDungeonMilestones?.gnomereganCleared ||
      rawGuildProgress?.milestones?.gnomereganCleared ||
      rawGuildProgress?.milestones?.gnomereganClear,
  );
  const rawScarletState = getFallbackScarletMonasteryState(
    rawDungeonMilestones?.scarletMonastery,
  );
  const legacyScarletWings =
    rawDungeonMilestones?.scarletMonasteryWingsCleared &&
    typeof rawDungeonMilestones.scarletMonasteryWingsCleared === "object"
      ? rawDungeonMilestones.scarletMonasteryWingsCleared
      : {};
  const scarletWingsCleared = {
    ...rawScarletState.wingsCleared,
    ...legacyScarletWings,
  };
  const legacyScarletFullClear = Boolean(
    rawDungeonMilestones?.scarletMonasteryCleared ||
      rawGuildProgress?.milestones?.scarletMonasteryCleared,
  );
  const scarletMonasteryFullClear =
    legacyScarletFullClear || Object.values(scarletWingsCleared).every(Boolean);
  if (scarletMonasteryFullClear) {
    Object.keys(scarletWingsCleared).forEach((wing) => {
      scarletWingsCleared[wing] = true;
    });
  }

  const rawBlackrockDepthsState = getFallbackBlackrockDepthsState(
    rawDungeonMilestones?.blackrockDepths,
  );
  const legacyBlackrockDepthsWings =
    rawDungeonMilestones?.blackrockDepthsWingsCleared &&
    typeof rawDungeonMilestones.blackrockDepthsWingsCleared === "object"
      ? rawDungeonMilestones.blackrockDepthsWingsCleared
      : {};
  const blackrockDepthsWingsCleared = {
    ...rawBlackrockDepthsState.wingsCleared,
    ...legacyBlackrockDepthsWings,
  };
  const legacyBlackrockDepthsFullClear = Boolean(
    rawDungeonMilestones?.blackrockDepthsCleared ||
      rawGuildProgress?.milestones?.blackrockDepthsCleared,
  );
  const blackrockDepthsFullClear =
    legacyBlackrockDepthsFullClear ||
    Object.values(blackrockDepthsWingsCleared).every(Boolean);
  if (blackrockDepthsFullClear) {
    Object.keys(blackrockDepthsWingsCleared).forEach((wing) => {
      blackrockDepthsWingsCleared[wing] = true;
    });
  }

  const rawStratholmeState = getFallbackStratholmeState(
    rawDungeonMilestones?.stratholme,
  );
  const legacyStratholmeWings =
    rawDungeonMilestones?.stratholmeWingsCleared &&
    typeof rawDungeonMilestones.stratholmeWingsCleared === "object"
      ? rawDungeonMilestones.stratholmeWingsCleared
      : {};
  const stratholmeWingsCleared = {
    ...rawStratholmeState.wingsCleared,
    ...legacyStratholmeWings,
  };
  const legacyStratholmeFullClear = Boolean(
    rawDungeonMilestones?.stratholmeCleared ||
      rawGuildProgress?.milestones?.stratholmeCleared,
  );
  const stratholmeFullClear =
    legacyStratholmeFullClear || Object.values(stratholmeWingsCleared).every(Boolean);
  if (stratholmeFullClear) {
    Object.keys(stratholmeWingsCleared).forEach((wing) => {
      stratholmeWingsCleared[wing] = true;
    });
  }

  const scholomanceCleared = Boolean(
    rawDungeonMilestones?.scholomanceCleared ||
      rawGuildProgress?.milestones?.scholomanceCleared ||
      rawGuildProgress?.milestones?.scholomanceClear,
  );
  const scourgeCleared = Boolean(
    rawDungeonMilestones?.scourgeCleared ||
      rawGuildProgress?.milestones?.scourgeCleared ||
      (stratholmeFullClear && scholomanceCleared),
  );
  const getRaidClearState = (key) =>
    Boolean(rawDungeonMilestones?.[key] || rawGuildProgress?.milestones?.[key]);
  const raidClearStates = Object.fromEntries(
    GUILD_RAID_CLEAR_MILESTONES.map((milestone) => [
      milestone.key,
      getRaidClearState(milestone.key),
    ]),
  );

  const renownPoints = Math.max(
    0,
    Math.floor(Number(rawGuildProgress.renownPoints) || 0),
  );
  const totalRenown = Math.max(
    renownPoints,
    Math.floor(Number(rawGuildProgress.totalRenown) || 0),
  );

  return {
    renownPoints,
    totalRenown,
    talents,
    milestones: {
      levelReached,
      rosterSizeReached,
      dungeon: {
        clearCount,
        clearReached,
        firstWipe,
        gnomereganCleared,
        scarletMonastery: {
          wingsCleared: scarletWingsCleared,
          fullClear: scarletMonasteryFullClear,
        },
        blackrockDepths: {
          wingsCleared: blackrockDepthsWingsCleared,
          fullClear: blackrockDepthsFullClear,
        },
        stratholme: {
          wingsCleared: stratholmeWingsCleared,
          fullClear: stratholmeFullClear,
        },
        scholomanceCleared,
        scourgeCleared,
        ...raidClearStates,
      },
    },
  };
};

export const applyLevelMilestones = (guildProgress, roster) => {
  const normalized = normalizeGuildProgress(guildProgress);
  const unlocked = [];
  const levelReached = { ...normalized.milestones.levelReached };

  let gained = 0;
  GUILD_LEVEL_MILESTONES.forEach((level) => {
    if (levelReached[level]) return;
    if (!Array.isArray(roster) || !roster.some((char) => (char?.level || 0) >= level)) {
      return;
    }
    const reward = GUILD_LEVEL_MILESTONE_REWARDS[level] || 0;
    levelReached[level] = true;
    gained += reward;
    unlocked.push({ level, reward });
  });

  if (unlocked.length === 0) return { guildProgress: guildProgress || normalized, unlocked };

  return {
    unlocked,
    guildProgress: {
      ...normalized,
      renownPoints: normalized.renownPoints + gained,
      totalRenown: normalized.totalRenown + gained,
      milestones: {
        ...normalized.milestones,
        levelReached,
      },
    },
  };
};

export const applyRosterSizeMilestones = (guildProgress, roster) => {
  const normalized = normalizeGuildProgress(guildProgress);
  const rosterSizeReached = {
    ...createRosterSizeMilestoneMap(),
    ...normalized.milestones.rosterSizeReached,
  };
  const rosterSize = Array.isArray(roster) ? roster.length : 0;
  const unlocked = [];
  let gained = 0;

  GUILD_ROSTER_SIZE_MILESTONES.forEach((milestone) => {
    if (rosterSizeReached[milestone.target]) return;
    if (rosterSize < milestone.target) return;
    rosterSizeReached[milestone.target] = true;
    gained += milestone.reward;
    unlocked.push(milestone);
  });

  if (unlocked.length === 0) {
    return { guildProgress: guildProgress || normalized, unlocked };
  }

  return {
    unlocked,
    guildProgress: {
      ...normalized,
      renownPoints: normalized.renownPoints + gained,
      totalRenown: normalized.totalRenown + gained,
      milestones: {
        ...normalized.milestones,
        rosterSizeReached,
      },
    },
  };
};

export const applyDungeonClearMilestones = (guildProgress, missionContext = "") => {
  const normalized = normalizeGuildProgress(guildProgress);
  const dungeon = getFallbackDungeonState(normalized.milestones.dungeon);
  const missionName =
    typeof missionContext === "string"
      ? missionContext
      : missionContext?.name || "";
  const missionSetName =
    typeof missionContext === "object" ? missionContext?.dungeonSetName : "";
  const missionWing =
    typeof missionContext === "object" ? missionContext?.dungeonWing : "";
  const clearCount = dungeon.clearCount + 1;
  const clearReached = {
    ...createDungeonClearMilestoneMap(),
    ...dungeon.clearReached,
  };
  const scarletMonastery = getFallbackScarletMonasteryState(
    dungeon.scarletMonastery,
  );
  const scarletWingsCleared = { ...scarletMonastery.wingsCleared };
  const scarletWing = resolveScarletWingName({
    missionName,
    missionSetName,
    missionWing,
  });
  if (scarletWing) {
    scarletWingsCleared[scarletWing] = true;
  }
  const scarletMonasteryFullClear =
    scarletMonastery.fullClear || Object.values(scarletWingsCleared).every(Boolean);
  const blackrockDepths = getFallbackBlackrockDepthsState(
    dungeon.blackrockDepths,
  );
  const blackrockDepthsWingsCleared = { ...blackrockDepths.wingsCleared };
  const blackrockDepthsWing = resolveBlackrockDepthsWingName({
    missionName,
    missionSetName,
    missionWing,
  });
  if (blackrockDepthsWing) {
    blackrockDepthsWingsCleared[blackrockDepthsWing] = true;
  }
  const blackrockDepthsFullClear =
    blackrockDepths.fullClear || Object.values(blackrockDepthsWingsCleared).every(Boolean);
  const stratholme = getFallbackStratholmeState(dungeon.stratholme);
  const stratholmeWingsCleared = { ...stratholme.wingsCleared };
  const stratholmeWing = resolveStratholmeWingName({
    missionName,
    missionSetName,
    missionWing,
  });
  if (stratholmeWing) {
    stratholmeWingsCleared[stratholmeWing] = true;
  }
  const stratholmeFullClear =
    stratholme.fullClear || Object.values(stratholmeWingsCleared).every(Boolean);
  const scholomanceTargetName =
    GUILD_SCOURGE_CLEAR_MILESTONE.scholomanceDungeonName.toLowerCase();
  const scholomanceCleared =
    dungeon.scholomanceCleared ||
    [missionName, missionSetName].some(
      (label) => String(label || "").toLowerCase() === scholomanceTargetName,
    );
  const scourgeCleared =
    dungeon.scourgeCleared || (stratholmeFullClear && scholomanceCleared);
  const missionLabels = [missionName, missionSetName].map((label) =>
    String(label || "").toLowerCase(),
  );
  const raidClearStates = Object.fromEntries(
    GUILD_RAID_CLEAR_MILESTONES.map((milestone) => {
      const targetName = String(milestone.dungeonName || "").toLowerCase();
      return [
        milestone.key,
        Boolean(dungeon[milestone.key]) || missionLabels.includes(targetName),
      ];
    }),
  );

  let gained = 0;
  const unlocked = [];
  GUILD_DUNGEON_CLEAR_MILESTONES.forEach((milestone) => {
    if (clearReached[milestone.target]) return;
    if (clearCount < milestone.target) return;
    clearReached[milestone.target] = true;
    gained += milestone.reward;
    unlocked.push(milestone);
  });

  const gnomereganCleared =
    dungeon.gnomereganCleared ||
    String(missionName).toLowerCase() ===
      GUILD_GNOMEREGAN_CLEAR_MILESTONE.dungeonName.toLowerCase();
  if (!dungeon.gnomereganCleared && gnomereganCleared) {
    gained += GUILD_GNOMEREGAN_CLEAR_MILESTONE.reward;
    unlocked.push({
      label: GUILD_GNOMEREGAN_CLEAR_MILESTONE.label,
      reward: GUILD_GNOMEREGAN_CLEAR_MILESTONE.reward,
    });
  }
  if (!scarletMonastery.fullClear && scarletMonasteryFullClear) {
    gained += GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.reward;
    unlocked.push({
      label: GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.label,
      reward: GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.reward,
    });
  }
  if (!blackrockDepths.fullClear && blackrockDepthsFullClear) {
    gained += GUILD_BLACKROCK_DEPTHS_CLEAR_MILESTONE.reward;
    unlocked.push({
      label: GUILD_BLACKROCK_DEPTHS_CLEAR_MILESTONE.label,
      reward: GUILD_BLACKROCK_DEPTHS_CLEAR_MILESTONE.reward,
    });
  }
  if (!dungeon.scourgeCleared && scourgeCleared) {
    gained += GUILD_SCOURGE_CLEAR_MILESTONE.reward;
    unlocked.push({
      label: GUILD_SCOURGE_CLEAR_MILESTONE.label,
      reward: GUILD_SCOURGE_CLEAR_MILESTONE.reward,
    });
  }
  GUILD_RAID_CLEAR_MILESTONES.forEach((milestone) => {
    if (dungeon[milestone.key] || !raidClearStates[milestone.key]) return;
    gained += milestone.reward;
    unlocked.push({
      label: milestone.label,
      reward: milestone.reward,
    });
  });

  return {
    unlocked,
    guildProgress: {
      ...normalized,
      renownPoints: normalized.renownPoints + gained,
      totalRenown: normalized.totalRenown + gained,
      milestones: {
        ...normalized.milestones,
        dungeon: {
          clearCount,
          clearReached,
          firstWipe: dungeon.firstWipe,
          gnomereganCleared,
          scarletMonastery: {
            wingsCleared: scarletWingsCleared,
            fullClear: scarletMonasteryFullClear,
          },
          blackrockDepths: {
            wingsCleared: blackrockDepthsWingsCleared,
            fullClear: blackrockDepthsFullClear,
          },
          stratholme: {
            wingsCleared: stratholmeWingsCleared,
            fullClear: stratholmeFullClear,
          },
          scholomanceCleared,
          scourgeCleared,
          ...raidClearStates,
        },
      },
    },
  };
};

export const applyDungeonWipeMilestone = (guildProgress) => {
  const normalized = normalizeGuildProgress(guildProgress);
  const dungeon = getFallbackDungeonState(normalized.milestones.dungeon);
  if (dungeon.firstWipe) {
    return { unlocked: null, guildProgress: guildProgress || normalized };
  }

  return {
    unlocked: GUILD_DUNGEON_WIPE_MILESTONE,
    guildProgress: {
      ...normalized,
      renownPoints: normalized.renownPoints + GUILD_DUNGEON_WIPE_MILESTONE.reward,
      totalRenown: normalized.totalRenown + GUILD_DUNGEON_WIPE_MILESTONE.reward,
      milestones: {
        ...normalized.milestones,
        dungeon: {
          ...dungeon,
          firstWipe: true,
        },
      },
    },
  };
};

export const upgradeGuildTalent = (guildProgress, talentKey, options = {}) => {
  const normalized = normalizeGuildProgress(guildProgress);
  const safeGoldRaw = Number(options?.guildGold);
  const hasGoldConstraint = Number.isFinite(safeGoldRaw);
  const availableGold = hasGoldConstraint ? Math.max(0, Math.floor(safeGoldRaw)) : 0;
  const upgradeStatus = getGuildTalentUpgradeStatus(normalized, talentKey);
  const talentDef = upgradeStatus.talent;
  const nextRankData = upgradeStatus.nextRankData;
  const goldCost = Math.max(0, Math.floor(Number(upgradeStatus.goldCost) || 0));
  const missingGold = hasGoldConstraint
    ? Math.max(0, goldCost - availableGold)
    : 0;

  if (!talentDef || !nextRankData || !upgradeStatus.canUpgrade || missingGold > 0) {
    return {
      upgraded: false,
      guildProgress: guildProgress || normalized,
      talent: talentDef || null,
      spentCost: 0,
      spentGold: 0,
      nextValue: 0,
      blockedByPrerequisite: Boolean(upgradeStatus?.blockedByPrerequisite),
      blockers: Array.isArray(upgradeStatus?.blockers) ? upgradeStatus.blockers : [],
      missingCost: upgradeStatus?.missingCost || 0,
      missingGold,
      goldCost,
    };
  }

  const currentRank = upgradeStatus.currentRank;

  return {
    upgraded: true,
    guildProgress: {
      ...normalized,
      renownPoints: normalized.renownPoints - nextRankData.cost,
      talents: {
        ...normalized.talents,
        [talentKey]: currentRank + 1,
      },
    },
    talent: talentDef,
    spentCost: nextRankData.cost,
    spentGold: goldCost,
    nextValue: nextRankData.value,
    blockedByPrerequisite: false,
    blockers: [],
    missingCost: 0,
    missingGold: 0,
    goldCost,
  };
};

export const buildGuildAchievementEntries = (guildProgress) => {
  const normalized = normalizeGuildProgress(guildProgress);
  const dungeonClearCount = Math.max(
    0,
    Math.floor(Number(normalized?.milestones?.dungeon?.clearCount) || 0),
  );
  const scarletMonastery = getFallbackScarletMonasteryState(
    normalized?.milestones?.dungeon?.scarletMonastery,
  );
  const clearedScarletWings = GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.wingNames.filter(
    (wing) => scarletMonastery.wingsCleared[wing],
  );
  const missingScarletWings = GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.wingNames.filter(
    (wing) => !scarletMonastery.wingsCleared[wing],
  );
  const scarletProgress = `${clearedScarletWings.length}/${GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.wingNames.length}${
    missingScarletWings.length > 0
      ? ` • Missing: ${missingScarletWings.join(", ")}`
      : ""
  }`;
  const blackrockDepths = getFallbackBlackrockDepthsState(
    normalized?.milestones?.dungeon?.blackrockDepths,
  );
  const clearedBlackrockDepthsWings =
    GUILD_BLACKROCK_DEPTHS_CLEAR_MILESTONE.wingNames.filter(
      (wing) => blackrockDepths.wingsCleared[wing],
    );
  const missingBlackrockDepthsWings =
    GUILD_BLACKROCK_DEPTHS_CLEAR_MILESTONE.wingNames.filter(
      (wing) => !blackrockDepths.wingsCleared[wing],
    );
  const blackrockDepthsProgress = `${clearedBlackrockDepthsWings.length}/${GUILD_BLACKROCK_DEPTHS_CLEAR_MILESTONE.wingNames.length}${
    missingBlackrockDepthsWings.length > 0
      ? ` • Missing: ${missingBlackrockDepthsWings.join(", ")}`
      : ""
  }`;
  const stratholme = getFallbackStratholmeState(
    normalized?.milestones?.dungeon?.stratholme,
  );
  const clearedStratholmeWings = GUILD_SCOURGE_CLEAR_MILESTONE.stratholmeWingNames.filter(
    (wing) => stratholme.wingsCleared[wing],
  );
  const missingStratholmeWings = GUILD_SCOURGE_CLEAR_MILESTONE.stratholmeWingNames.filter(
    (wing) => !stratholme.wingsCleared[wing],
  );
  const scholomanceCleared = Boolean(normalized?.milestones?.dungeon?.scholomanceCleared);
  const scourgeProgress = `${clearedStratholmeWings.length}/${GUILD_SCOURGE_CLEAR_MILESTONE.stratholmeWingNames.length} Stratholme wings • Scholomance ${scholomanceCleared ? 1 : 0}/1${
    missingStratholmeWings.length > 0
      ? ` • Missing: ${missingStratholmeWings.join(", ")}`
      : ""
  }`;

  return [
    ...GUILD_LEVEL_MILESTONES.map((level) => ({
      key: `level-${level}`,
      label: `First level ${level} character`,
      unlocked: Boolean(normalized?.milestones?.levelReached?.[level]),
      reward: `+${GUILD_LEVEL_MILESTONE_REWARDS[level]} ${GUILD_POINT_LABEL}`,
    })),
    ...GUILD_ROSTER_SIZE_MILESTONES.map((milestone) => ({
      key: `roster-size-${milestone.target}`,
      label: milestone.label,
      unlocked: Boolean(
        normalized?.milestones?.rosterSizeReached?.[milestone.target],
      ),
      progress: `${normalized?.milestones?.rosterSizeReached?.[milestone.target] ? milestone.target : 0}/${milestone.target}`,
      reward: `+${milestone.reward} ${GUILD_POINT_LABEL}`,
    })),
    ...GUILD_DUNGEON_CLEAR_MILESTONES.map((milestone) => ({
      key: `dungeon-clear-${milestone.target}`,
      label: milestone.label,
      unlocked: Boolean(normalized?.milestones?.dungeon?.clearReached?.[milestone.target]),
      progress: `${Math.min(dungeonClearCount, milestone.target)}/${milestone.target}`,
      reward: `+${milestone.reward} ${GUILD_POINT_LABEL}`,
    })),
    {
      key: "dungeon-clear-gnomeregan",
      label: GUILD_GNOMEREGAN_CLEAR_MILESTONE.label,
      unlocked: Boolean(normalized?.milestones?.dungeon?.gnomereganCleared),
      progress: `${normalized?.milestones?.dungeon?.gnomereganCleared ? 1 : 0}/1`,
      reward: `+${GUILD_GNOMEREGAN_CLEAR_MILESTONE.reward} ${GUILD_POINT_LABEL}`,
    },
    {
      key: "dungeon-clear-scarlet-monastery",
      label: GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.label,
      unlocked: Boolean(scarletMonastery.fullClear),
      progress: scarletProgress,
      reward: `+${GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.reward} ${GUILD_POINT_LABEL}`,
    },
    {
      key: "dungeon-clear-blackrock-depths",
      label: GUILD_BLACKROCK_DEPTHS_CLEAR_MILESTONE.label,
      unlocked: Boolean(blackrockDepths.fullClear),
      progress: blackrockDepthsProgress,
      reward: `+${GUILD_BLACKROCK_DEPTHS_CLEAR_MILESTONE.reward} ${GUILD_POINT_LABEL}`,
    },
    {
      key: "dungeon-clear-the-scourge",
      label: GUILD_SCOURGE_CLEAR_MILESTONE.label,
      unlocked: Boolean(normalized?.milestones?.dungeon?.scourgeCleared),
      progress: scourgeProgress,
      reward: `+${GUILD_SCOURGE_CLEAR_MILESTONE.reward} ${GUILD_POINT_LABEL}`,
    },
    ...GUILD_RAID_CLEAR_MILESTONES.map((milestone) => ({
      key: `raid-clear-${milestone.key}`,
      label: milestone.label,
      unlocked: Boolean(normalized?.milestones?.dungeon?.[milestone.key]),
      progress: `${normalized?.milestones?.dungeon?.[milestone.key] ? 1 : 0}/1`,
      reward: `+${milestone.reward} ${GUILD_POINT_LABEL}`,
    })),
    {
      key: "dungeon-first-wipe",
      label: GUILD_DUNGEON_WIPE_MILESTONE.label,
      unlocked: Boolean(normalized?.milestones?.dungeon?.firstWipe),
      reward: `+${GUILD_DUNGEON_WIPE_MILESTONE.reward} ${GUILD_POINT_LABEL}`,
    },
  ];
};
