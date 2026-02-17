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

export const GUILD_TALENT_DEFS = {
  rosterCap: {
    key: "rosterCap",
    category: "roster",
    title: "War Council",
    description: "Increase maximum guild roster size.",
    suffix: "slots",
    ranks: [
      { value: 5, cost: 1 },
      { value: 15, cost: 2 },
      { value: 30, cost: 4 },
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

const createLevelMilestoneMap = () =>
  Object.fromEntries(GUILD_LEVEL_MILESTONES.map((level) => [level, false]));

const createDungeonClearMilestoneMap = () =>
  Object.fromEntries(
    GUILD_DUNGEON_CLEAR_MILESTONES.map((milestone) => [milestone.target, false]),
  );

const createScarletWingMap = () =>
  Object.fromEntries(
    GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.wingNames.map((wing) => [wing, false]),
  );

const getFallbackScarletMonasteryState = (scarletState) => {
  const rawState =
    scarletState && typeof scarletState === "object" ? scarletState : {};
  const rawWings =
    rawState.wingsCleared && typeof rawState.wingsCleared === "object"
      ? rawState.wingsCleared
      : {};
  const wingsCleared = {
    ...createScarletWingMap(),
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

const resolveScarletWingName = ({ missionName, missionSetName, missionWing }) => {
  const missionLabel = String(missionName || "");
  const setLabel = String(missionSetName || "");
  const wingLabel = String(missionWing || "");
  const isScarletMission =
    setLabel.toLowerCase() ===
      GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.dungeonSetName.toLowerCase() ||
    missionLabel.toLowerCase().startsWith("scarlet monastery:");
  if (!isScarletMission) return null;

  const candidateWingName =
    wingLabel ||
    missionLabel.replace(/^scarlet monastery:\s*/i, "").trim();
  const normalized = candidateWingName.toLowerCase();
  return (
    GUILD_SCARLET_MONASTERY_CLEAR_MILESTONE.wingNames.find(
      (wing) => wing.toLowerCase() === normalized,
    ) || null
  );
};

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
  const goldCapIncrease = getTalentCurrentValue(guildProgress, "goldCap");
  const goldGainPercent = getTalentCurrentValue(guildProgress, "goldGain");
  return {
    maxRoster: CONFIG.MAX_ROSTER + rosterCapIncrease,
    goldCap: CONFIG.GOLD_CAP + goldCapIncrease,
    expBoostPercent,
    goldGainPercent,
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
      dungeon: {
        clearCount,
        clearReached,
        firstWipe,
        gnomereganCleared,
        scarletMonastery: {
          wingsCleared: scarletWingsCleared,
          fullClear: scarletMonasteryFullClear,
        },
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

export const upgradeGuildTalent = (guildProgress, talentKey) => {
  const normalized = normalizeGuildProgress(guildProgress);
  const talentDef = GUILD_TALENT_DEFS[talentKey];

  if (!talentDef) {
    return {
      upgraded: false,
      guildProgress: guildProgress || normalized,
      talent: null,
      spentCost: 0,
      nextValue: 0,
    };
  }

  const currentRank = clampTalentRank(talentKey, normalized.talents[talentKey]);
  if (currentRank >= talentDef.ranks.length) {
    return {
      upgraded: false,
      guildProgress: guildProgress || normalized,
      talent: talentDef,
      spentCost: 0,
      nextValue: 0,
    };
  }

  const nextRankData = talentDef.ranks[currentRank];
  if (!nextRankData || normalized.renownPoints < nextRankData.cost) {
    return {
      upgraded: false,
      guildProgress: guildProgress || normalized,
      talent: talentDef,
      spentCost: 0,
      nextValue: 0,
    };
  }

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
    nextValue: nextRankData.value,
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

  return [
    ...GUILD_LEVEL_MILESTONES.map((level) => ({
      key: `level-${level}`,
      label: `First level ${level} character`,
      unlocked: Boolean(normalized?.milestones?.levelReached?.[level]),
      reward: `+${GUILD_LEVEL_MILESTONE_REWARDS[level]} ${GUILD_POINT_LABEL}`,
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
      key: "dungeon-first-wipe",
      label: GUILD_DUNGEON_WIPE_MILESTONE.label,
      unlocked: Boolean(normalized?.milestones?.dungeon?.firstWipe),
      reward: `+${GUILD_DUNGEON_WIPE_MILESTONE.reward} ${GUILD_POINT_LABEL}`,
    },
  ];
};
