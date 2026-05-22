import { GUILD_FACTION, GUILD_SERVER_STYLE } from "../constants";

export const ZONE_FACTION = Object.freeze({
  ALLIANCE: GUILD_FACTION.ALLIANCE,
  HORDE: GUILD_FACTION.HORDE,
  NEUTRAL: "Neutral",
});

export const ZONE_PROGRESS_CHECKPOINTS = Object.freeze([25, 50, 75, 100]);
export const ZONE_PVP_TERRITORY = Object.freeze({
  SAFE: "Safe Territory",
  HOSTILE: "Hostile Territory",
  CONTESTED: "Contested Territory",
});
export const ZONE_COMPLETION_ARCHETYPE = Object.freeze({
  GEAR_SEEKER: "gear_seeker",
  COMPLETIONIST: "completionist",
  WANDERER: "wanderer",
  AVOIDANT: "avoidant",
});

const ZONE_COMPLETION_ARCHETYPES = Object.freeze([
  ZONE_COMPLETION_ARCHETYPE.GEAR_SEEKER,
  ZONE_COMPLETION_ARCHETYPE.COMPLETIONIST,
  ZONE_COMPLETION_ARCHETYPE.WANDERER,
  ZONE_COMPLETION_ARCHETYPE.AVOIDANT,
]);
const ZONE_BIOME_POOL = Object.freeze([
  "barren",
  "coast",
  "desert",
  "forest",
  "jungle",
  "mountain",
  "plague",
  "plains",
  "ruins",
  "snow",
  "swamp",
  "volcanic",
]);
const ZONE_ENEMY_POOL = Object.freeze([
  "beasts",
  "demons",
  "dragons",
  "elementals",
  "humanoids",
  "naga",
  "silithid",
  "trolls",
  "undead",
]);

const ZONE_CHECKPOINT_SPLITS = Object.freeze({
  25: 0.2,
  50: 0.2,
  75: 0.25,
  100: 0.35,
});
const ITEM_QUALITY = Object.freeze({
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
});

const STARTER_ZONE_BY_RACE = Object.freeze({
  Human: "elwynn_forest",
  Dwarf: "dun_morogh",
  Gnome: "dun_morogh",
  "Night Elf": "teldrassil",
  Orc: "durotar",
  Troll: "durotar",
  Tauren: "mulgore",
  Undead: "tirisfal_glades",
});
const STARTER_ZONE_IDS = new Set(Object.values(STARTER_ZONE_BY_RACE));
const LEGACY_ZONE_ID = Object.freeze({
  STRANGLETHORN_VALE: "stranglethorn_vale",
});
const SPLIT_ZONE_ID = Object.freeze({
  STRANGLETHORN_NORTH: "stranglethorn_vale_north",
  STRANGLETHORN_SOUTH: "stranglethorn_vale_south",
});

const BASE_ZONE_DEFINITIONS = Object.freeze([
  { id: "teldrassil", name: "Teldrassil", faction: ZONE_FACTION.ALLIANCE, minLevel: 1, maxLevel: 10, biomes: ["forest"], enemies: ["beasts", "humanoids"] },
  { id: "dun_morogh", name: "Dun Morogh", faction: ZONE_FACTION.ALLIANCE, minLevel: 1, maxLevel: 10, biomes: ["snow", "mountain"], enemies: ["beasts", "humanoids"] },
  { id: "elwynn_forest", name: "Elwynn Forest", faction: ZONE_FACTION.ALLIANCE, minLevel: 1, maxLevel: 10, biomes: ["forest"], enemies: ["beasts", "humanoids"] },
  { id: "durotar", name: "Durotar", faction: ZONE_FACTION.HORDE, minLevel: 1, maxLevel: 10, biomes: ["barren"], enemies: ["beasts", "humanoids"] },
  { id: "mulgore", name: "Mulgore", faction: ZONE_FACTION.HORDE, minLevel: 1, maxLevel: 10, biomes: ["plains"], enemies: ["beasts", "humanoids"] },
  { id: "tirisfal_glades", name: "Tirisfal Glades", faction: ZONE_FACTION.HORDE, minLevel: 1, maxLevel: 10, biomes: ["forest", "plague"], enemies: ["undead", "humanoids"] },

  { id: "darkshore", name: "Darkshore", faction: ZONE_FACTION.ALLIANCE, minLevel: 10, maxLevel: 20, biomes: ["forest", "coast"], enemies: ["naga", "beasts", "demons"] },
  { id: "loch_modan", name: "Loch Modan", faction: ZONE_FACTION.ALLIANCE, minLevel: 10, maxLevel: 20, biomes: ["mountain", "forest"], enemies: ["beasts", "humanoids"] },
  { id: "westfall", name: "Westfall", faction: ZONE_FACTION.ALLIANCE, minLevel: 10, maxLevel: 20, biomes: ["plains", "coast"], enemies: ["humanoids", "undead"] },
  { id: "silverpine_forest", name: "Silverpine Forest", faction: ZONE_FACTION.HORDE, minLevel: 10, maxLevel: 20, biomes: ["forest"], enemies: ["undead", "humanoids"] },
  { id: "the_barrens", name: "The Barrens", faction: ZONE_FACTION.HORDE, minLevel: 10, maxLevel: 25, biomes: ["barren", "plains"], enemies: ["beasts", "humanoids"] },
  { id: "redridge_mountains", name: "Redridge Mountains", faction: ZONE_FACTION.ALLIANCE, minLevel: 15, maxLevel: 25, biomes: ["mountain", "forest"], enemies: ["dragons", "humanoids"] },
  { id: "stonetalon_mountains", name: "Stonetalon Mountains", faction: ZONE_FACTION.NEUTRAL, minLevel: 15, maxLevel: 27, biomes: ["mountain", "forest"], enemies: ["beasts", "humanoids"] },
  { id: "ashenvale", name: "Ashenvale", faction: ZONE_FACTION.NEUTRAL, minLevel: 18, maxLevel: 30, biomes: ["forest"], enemies: ["demons", "beasts", "humanoids"] },
  { id: "duskwood", name: "Duskwood", faction: ZONE_FACTION.ALLIANCE, minLevel: 20, maxLevel: 30, biomes: ["forest"], enemies: ["undead", "beasts"] },
  { id: "hillsbrad_foothills", name: "Hillsbrad Foothills", faction: ZONE_FACTION.NEUTRAL, minLevel: 20, maxLevel: 30, biomes: ["plains", "forest"], enemies: ["humanoids", "undead"] },
  { id: "wetlands", name: "Wetlands", faction: ZONE_FACTION.ALLIANCE, minLevel: 20, maxLevel: 30, biomes: ["swamp", "coast"], enemies: ["dragons", "beasts", "humanoids"] },
  { id: "thousand_needles", name: "Thousand Needles", faction: ZONE_FACTION.NEUTRAL, minLevel: 25, maxLevel: 35, biomes: ["barren", "mountain"], enemies: ["beasts", "humanoids"] },
  { id: "alterac_mountains", name: "Alterac Mountains", faction: ZONE_FACTION.NEUTRAL, minLevel: 30, maxLevel: 40, biomes: ["snow", "mountain"], enemies: ["humanoids", "elementals"] },
  { id: "arathi_highlands", name: "Arathi Highlands", faction: ZONE_FACTION.NEUTRAL, minLevel: 30, maxLevel: 40, biomes: ["plains", "ruins"], enemies: ["humanoids", "elementals"] },
  { id: "desolace", name: "Desolace", faction: ZONE_FACTION.NEUTRAL, minLevel: 30, maxLevel: 40, biomes: ["barren", "desert"], enemies: ["demons", "beasts", "humanoids"] },
  { id: "stranglethorn_vale_north", name: "Stranglethorn Vale North", faction: ZONE_FACTION.NEUTRAL, minLevel: 30, maxLevel: 40, biomes: ["jungle", "ruins"], enemies: ["beasts", "trolls"] },
  { id: "stranglethorn_vale_south", name: "Stranglethorn Vale South", faction: ZONE_FACTION.NEUTRAL, minLevel: 40, maxLevel: 45, biomes: ["jungle", "coast"], enemies: ["naga", "trolls", "beasts"] },
  { id: "badlands", name: "Badlands", faction: ZONE_FACTION.NEUTRAL, minLevel: 35, maxLevel: 45, biomes: ["barren", "desert"], enemies: ["dragons", "elementals", "humanoids"] },
  { id: "dustwallow_marsh", name: "Dustwallow Marsh", faction: ZONE_FACTION.NEUTRAL, minLevel: 35, maxLevel: 45, biomes: ["swamp"], enemies: ["dragons", "beasts", "humanoids"] },
  { id: "swamp_of_sorrows", name: "Swamp of Sorrows", faction: ZONE_FACTION.NEUTRAL, minLevel: 35, maxLevel: 45, biomes: ["swamp"], enemies: ["demons", "beasts", "humanoids"] },
  { id: "feralas", name: "Feralas", faction: ZONE_FACTION.NEUTRAL, minLevel: 40, maxLevel: 50, biomes: ["forest", "ruins"], enemies: ["beasts", "humanoids"] },
  { id: "the_hinterlands", name: "The Hinterlands", faction: ZONE_FACTION.NEUTRAL, minLevel: 40, maxLevel: 50, biomes: ["forest", "mountain"], enemies: ["trolls", "beasts"] },
  { id: "tanaris", name: "Tanaris", faction: ZONE_FACTION.NEUTRAL, minLevel: 40, maxLevel: 50, biomes: ["desert", "coast"], enemies: ["trolls", "humanoids", "beasts"] },
  { id: "searing_gorge", name: "Searing Gorge", faction: ZONE_FACTION.NEUTRAL, minLevel: 45, maxLevel: 50, biomes: ["volcanic", "mountain"], enemies: ["elementals", "humanoids"] },
  { id: "azshara", name: "Azshara", faction: ZONE_FACTION.NEUTRAL, minLevel: 45, maxLevel: 55, biomes: ["coast", "ruins"], enemies: ["naga", "demons", "dragons"] },
  { id: "felwood", name: "Felwood", faction: ZONE_FACTION.NEUTRAL, minLevel: 48, maxLevel: 55, biomes: ["forest", "plague"], enemies: ["demons", "beasts"] },
  { id: "un_goro_crater", name: "Un'Goro Crater", faction: ZONE_FACTION.NEUTRAL, minLevel: 48, maxLevel: 55, biomes: ["jungle"], enemies: ["beasts", "elementals"] },
  { id: "blasted_lands", name: "Blasted Lands", faction: ZONE_FACTION.NEUTRAL, minLevel: 50, maxLevel: 55, biomes: ["barren"], enemies: ["demons", "humanoids"] },
  { id: "burning_steppes", name: "Burning Steppes", faction: ZONE_FACTION.NEUTRAL, minLevel: 50, maxLevel: 58, biomes: ["volcanic", "mountain"], enemies: ["dragons", "elementals", "humanoids"] },
  { id: "western_plaguelands", name: "Western Plaguelands", faction: ZONE_FACTION.NEUTRAL, minLevel: 50, maxLevel: 58, biomes: ["plague", "ruins"], enemies: ["undead", "humanoids"] },
  { id: "eastern_plaguelands", name: "Eastern Plaguelands", faction: ZONE_FACTION.NEUTRAL, minLevel: 53, maxLevel: 60, biomes: ["plague", "ruins"], enemies: ["undead"] },
  { id: "winterspring", name: "Winterspring", faction: ZONE_FACTION.NEUTRAL, minLevel: 53, maxLevel: 60, biomes: ["snow", "forest"], enemies: ["beasts", "demons"] },
  { id: "moonglade", name: "Moonglade", faction: ZONE_FACTION.NEUTRAL, minLevel: 55, maxLevel: 60, biomes: ["forest"], enemies: ["beasts", "dragons"] },
  { id: "deadwind_pass", name: "Deadwind Pass", faction: ZONE_FACTION.NEUTRAL, minLevel: 55, maxLevel: 60, biomes: ["ruins", "barren"], enemies: ["undead", "demons"] },
  { id: "silithus", name: "Silithus", faction: ZONE_FACTION.NEUTRAL, minLevel: 55, maxLevel: 60, biomes: ["desert", "ruins"], enemies: ["silithid", "elementals"] },
]);

const clampLevel = (value) => Math.max(1, Number(value) || 1);

const getZoneBaseDurationSeconds = (zone) => {
  if (Number.isFinite(zone?.baseDurationSeconds) && zone.baseDurationSeconds > 0) {
    return Math.max(30, Math.floor(zone.baseDurationSeconds));
  }
  const cappedMax = Math.min(60, Math.max(10, clampLevel(zone?.maxLevel)));
  return Math.round(120 + cappedMax * 2.8);
};

const getZoneTotalGoldReward = (zone) => {
  if (Number.isFinite(zone?.totalGoldReward) && zone.totalGoldReward >= 0) {
    return Math.floor(zone.totalGoldReward);
  }
  const midpoint = (clampLevel(zone?.minLevel) + clampLevel(zone?.maxLevel)) / 2;
  if (midpoint <= 10) return 3;
  if (midpoint <= 20) return 5;
  if (midpoint <= 30) return 7;
  if (midpoint <= 40) return 10;
  if (midpoint <= 50) return 13;
  return 16;
};

const buildCheckpointGoldRewards = (totalGoldReward) => {
  const total = Math.max(0, Math.floor(Number(totalGoldReward) || 0));
  const rows = ZONE_PROGRESS_CHECKPOINTS.map((checkpoint) => {
    const share = Number(ZONE_CHECKPOINT_SPLITS[checkpoint]) || 0;
    const raw = total * share;
    return {
      checkpoint,
      reward: Math.floor(raw),
      remainder: raw - Math.floor(raw),
    };
  });

  let allocated = rows.reduce((sum, row) => sum + row.reward, 0);
  let remainderBudget = Math.max(0, total - allocated);
  const remainderOrder = [...rows]
    .sort((left, right) => right.remainder - left.remainder)
    .map((row) => row.checkpoint);

  let index = 0;
  while (remainderBudget > 0 && remainderOrder.length > 0) {
    const checkpoint = remainderOrder[index % remainderOrder.length];
    const row = rows.find((entry) => entry.checkpoint === checkpoint);
    if (row) {
      row.reward += 1;
      allocated += 1;
      remainderBudget = Math.max(0, total - allocated);
    }
    index += 1;
  }

  return rows.reduce((acc, row) => {
    acc[row.checkpoint] = row.reward;
    return acc;
  }, {});
};

const buildZoneCheckpointLootQualities = (zone) => {
  const safeMinLevel = clampLevel(zone?.minLevel);
  const safeMaxLevel = clampLevel(zone?.maxLevel);
  if (safeMaxLevel >= 60) {
    return {
      25: [ITEM_QUALITY.UNCOMMON],
      50: [ITEM_QUALITY.UNCOMMON],
      75: [ITEM_QUALITY.RARE],
      100: [ITEM_QUALITY.RARE],
    };
  }
  if (safeMinLevel >= 50) {
    return {
      25: [ITEM_QUALITY.UNCOMMON],
      50: [ITEM_QUALITY.UNCOMMON],
      75: [ITEM_QUALITY.UNCOMMON],
      100: [ITEM_QUALITY.RARE],
    };
  }
  if (safeMinLevel >= 40) {
    return {
      25: [ITEM_QUALITY.UNCOMMON],
      50: [ITEM_QUALITY.UNCOMMON],
      75: [ITEM_QUALITY.UNCOMMON],
      100: [ITEM_QUALITY.RARE],
    };
  }
  if (safeMinLevel >= 30) {
    return {
      25: [ITEM_QUALITY.UNCOMMON],
      50: [ITEM_QUALITY.UNCOMMON],
      75: [ITEM_QUALITY.UNCOMMON],
      100: [ITEM_QUALITY.UNCOMMON],
    };
  }
  if (safeMinLevel >= 20) {
    return {
      25: [ITEM_QUALITY.COMMON],
      50: [ITEM_QUALITY.UNCOMMON],
      75: [ITEM_QUALITY.UNCOMMON],
      100: [ITEM_QUALITY.UNCOMMON],
    };
  }
  if (safeMinLevel >= 10) {
    return {
      25: [ITEM_QUALITY.COMMON],
      50: [ITEM_QUALITY.COMMON],
      75: [ITEM_QUALITY.UNCOMMON],
      100: [ITEM_QUALITY.UNCOMMON],
    };
  }
  return {
    25: [ITEM_QUALITY.COMMON],
    50: [ITEM_QUALITY.COMMON],
    75: [ITEM_QUALITY.COMMON],
    100: [ITEM_QUALITY.UNCOMMON],
  };
};

const buildZoneLootRewardCounts = (checkpointLootQualitiesByCheckpoint) => {
  const qualityCounts = {
    [ITEM_QUALITY.COMMON]: 0,
    [ITEM_QUALITY.UNCOMMON]: 0,
    [ITEM_QUALITY.RARE]: 0,
  };

  ZONE_PROGRESS_CHECKPOINTS.forEach((checkpoint) => {
    const qualities = Array.isArray(checkpointLootQualitiesByCheckpoint?.[checkpoint])
      ? checkpointLootQualitiesByCheckpoint[checkpoint]
      : [];
    qualities.forEach((quality) => {
      if (qualityCounts[quality] == null) return;
      qualityCounts[quality] += 1;
    });
  });

  return {
    common: qualityCounts[ITEM_QUALITY.COMMON],
    uncommon: qualityCounts[ITEM_QUALITY.UNCOMMON],
    rare: qualityCounts[ITEM_QUALITY.RARE],
  };
};

const ZONE_ELITE_TITLE_POOL = Object.freeze([
  "Hunt the Warband",
  "Break the Stronghold",
  "Silence the Warlord",
]);
const SPECIAL_ZONE_ELITE_QUESTS = Object.freeze({
  elwynn_forest: Object.freeze([
    Object.freeze({
      id: "zone_elite:elwynn_forest:hogger",
      type: "quest",
      typeLabel: "Zone Elite",
      name: "Elwynn Forest Elite: Hogger",
      zoneId: "elwynn_forest",
      isZoneElite: true,
      level: 11,
      minLevel: 6,
      recommended: "8-11",
      duration: 55,
      exp: 560,
      gold: 3,
      rewardQualities: [1, 2],
      elite: true,
      requiredPartySize: 5,
    }),
  ]),
  western_plaguelands: Object.freeze([
    Object.freeze({
      id: "zone_elite:western_plaguelands:scholomance_key",
      type: "quest",
      typeLabel: "Zone Elite",
      name: "The Key to Scholomance - Araj's Scarab",
      zoneId: "western_plaguelands",
      isZoneElite: true,
      level: 60,
      minLevel: 56,
      recommended: "58-60",
      duration: 60,
      exp: 45100,
      gold: 35,
      rewardQualities: [3],
      rewardKeys: ["scholomance_key"],
      baseFailChance: 25,
      elite: true,
      requiredPartySize: 5,
    }),
  ]),
});

const getZoneEliteQuestCount = (zone) => {
  const safeMinLevel = clampLevel(zone?.minLevel);
  if (safeMinLevel >= 40) return 3;
  if (safeMinLevel >= 20) return 2;
  return 1;
};

const getZoneEliteRewardQualities = (zone) => {
  const safeMinLevel = clampLevel(zone?.minLevel);
  if (safeMinLevel >= 40) return [2, 3];
  if (safeMinLevel >= 20) return [2];
  return [1, 2];
};

const getZoneEliteExpReward = (zone, tierIndex) => {
  const midpoint = (clampLevel(zone?.minLevel) + clampLevel(zone?.maxLevel)) / 2;
  return Math.max(120, Math.floor(midpoint * 55 + tierIndex * 80 + 180));
};

const getZoneEliteGoldReward = (zone, tierIndex) => {
  const baseZoneGold = Math.max(0, Number(zone?.totalGoldReward) || 0);
  const baseline = Math.max(2, Math.floor(baseZoneGold * 0.6));
  return baseline + tierIndex;
};

const getZoneElitePartySizing = () => {
  return { requiredPartySize: 5, minPartySize: 3 };
};

const getZoneEliteBaseFailChance = (zone) => {
  if (zone.maxLevel <= 40) return 22;
  return 25;
};

const buildZoneEliteQuestTemplates = (zone) => {
  const count = getZoneEliteQuestCount(zone);
  const rewardQualities = getZoneEliteRewardQualities(zone);
  const partySizing = getZoneElitePartySizing(zone);
  const generated = Array.from({ length: count }, (_, index) => {
    const tierIndex = index + 1;
    const title = ZONE_ELITE_TITLE_POOL[index] || `Elite Objective ${tierIndex}`;
    const recommendedMin = Math.max(
      clampLevel(zone?.minLevel),
      clampLevel(zone?.maxLevel) - 3 + index,
    );
    const recommendedMax = Math.min(
      60,
      Math.max(recommendedMin, clampLevel(zone?.maxLevel) + Math.floor(index / 2)),
    );
    return {
      id: `zone_elite:${zone.id}:${tierIndex}`,
      type: "quest",
      typeLabel: "Zone Elite",
      name: `${zone.name} Elite: ${title}`,
      zoneId: zone.id,
      isZoneElite: true,
      level: recommendedMax,
      minLevel: Math.max(1, recommendedMin - 4),
      recommended: `${recommendedMin}-${recommendedMax}`,
      duration: Math.max(45, Math.round(zone.baseDurationSeconds / 3) + index * 10),
      exp: getZoneEliteExpReward(zone, tierIndex),
      gold: getZoneEliteGoldReward(zone, tierIndex),
      baseFailChance: getZoneEliteBaseFailChance(zone),
      elite: true,
      rewardQualities: [...rewardQualities],
      ...partySizing,
    };
  });

  const overrides = Array.isArray(SPECIAL_ZONE_ELITE_QUESTS[zone.id])
    ? SPECIAL_ZONE_ELITE_QUESTS[zone.id].map((mission) => ({
        ...mission,
        requiredPartySize:
          mission.requiredPartySize ?? partySizing.requiredPartySize,
        minPartySize: mission.minPartySize ?? partySizing.minPartySize,
        baseFailChance:
          mission.baseFailChance ?? getZoneEliteBaseFailChance(zone),
        rewardQualities: Array.isArray(mission.rewardQualities)
          ? [...mission.rewardQualities]
          : [],
        rewardKeys: Array.isArray(mission.rewardKeys) ? [...mission.rewardKeys] : [],
      }))
    : [];

  if (overrides.length === 0) return generated;
  return [...overrides, ...generated].slice(0, count);
};

export const ZONE_DEFINITIONS = Object.freeze(
  BASE_ZONE_DEFINITIONS.map((zone) => {
    const normalized = {
      ...zone,
      minLevel: clampLevel(zone.minLevel),
      maxLevel: clampLevel(zone.maxLevel),
      biomes: Object.freeze(
        (Array.isArray(zone.biomes) ? zone.biomes : [])
          .map((biome) => String(biome || "").trim())
          .filter(Boolean),
      ),
      enemies: Object.freeze(
        (Array.isArray(zone.enemies) ? zone.enemies : [])
          .map((enemy) => String(enemy || "").trim())
          .filter(Boolean),
      ),
      baseDurationSeconds: getZoneBaseDurationSeconds(zone),
      totalGoldReward: getZoneTotalGoldReward(zone),
      isStarterZone: STARTER_ZONE_IDS.has(zone.id),
    };
    const checkpointLootQualitiesByCheckpoint = buildZoneCheckpointLootQualities(normalized);
    return {
      ...normalized,
      checkpointGoldRewards: buildCheckpointGoldRewards(normalized.totalGoldReward),
      checkpointLootQualitiesByCheckpoint,
      lootRewardCounts: buildZoneLootRewardCounts(checkpointLootQualitiesByCheckpoint),
    };
  }),
);
const ZONE_ELITE_QUESTS_BY_ZONE_ID = new Map(
  ZONE_DEFINITIONS.map((zone) => [zone.id, buildZoneEliteQuestTemplates(zone)]),
);

const ZONE_BY_ID = new Map(ZONE_DEFINITIONS.map((zone) => [zone.id, zone]));
const resolveLegacyZoneId = (zoneId, characterLevel = 1) => {
  const normalizedId = String(zoneId || "").trim();
  if (!normalizedId) return "";
  if (normalizedId !== LEGACY_ZONE_ID.STRANGLETHORN_VALE) return normalizedId;
  return clampLevel(characterLevel) >= 40
    ? SPLIT_ZONE_ID.STRANGLETHORN_SOUTH
    : SPLIT_ZONE_ID.STRANGLETHORN_NORTH;
};

export const ZONE_MISSION_TEMPLATES = Object.freeze(
  ZONE_DEFINITIONS.map((zone) => ({
    id: `zone:${zone.id}`,
    type: "zone",
    typeLabel: "Zone Leveling",
    name: `Zone: ${zone.name}`,
    zoneId: zone.id,
    level: zone.maxLevel,
    minLevel: 1,
    recommended: `${zone.minLevel}-${zone.maxLevel}`,
    duration: Math.max(15, Math.round(zone.baseDurationSeconds / 3)),
    exp: 0,
    gold: zone.totalGoldReward,
    elite: false,
    rewardQualities: [1],
    requiredPartySize: 999,
  })),
);

export const isZoneMission = (mission) => mission?.type === "zone" && Boolean(mission?.zoneId);

export const getCanonicalZoneId = (zoneId, characterLevel = 1) =>
  resolveLegacyZoneId(zoneId, characterLevel);

export const getZoneById = (zoneId, characterLevel = 1) => {
  const canonicalId = getCanonicalZoneId(zoneId, characterLevel);
  return canonicalId ? ZONE_BY_ID.get(canonicalId) || null : null;
};

export const getZoneEliteQuestTemplates = (zoneId, characterLevel = 1) => {
  const zone = getZoneById(zoneId, characterLevel);
  if (!zone) return [];
  const templates = ZONE_ELITE_QUESTS_BY_ZONE_ID.get(zone.id) || [];
  return templates.map((mission) => ({
    ...mission,
    rewardQualities: Array.isArray(mission.rewardQualities)
      ? [...mission.rewardQualities]
      : [],
  }));
};

export const getStarterZoneIdForRace = (race) =>
  STARTER_ZONE_BY_RACE[String(race || "").trim()] || null;

export const getZoneOverlevel = (characterLevel, zone) => {
  const safeZone = zone && typeof zone === "object" ? zone : null;
  if (!safeZone) return 0;
  return Math.max(0, clampLevel(characterLevel) - clampLevel(safeZone.maxLevel));
};

export const getZoneExpMultiplier = (characterLevel, zone) => {
  const overlevel = getZoneOverlevel(characterLevel, zone);
  if (overlevel <= 0) return 1;
  if (overlevel >= 10) return 0.1;
  if (overlevel >= 5) return 0.5;
  return 0.75;
};

export const getZoneProgressSpeedMultiplier = (characterLevel, zone) => {
  const overlevel = getZoneOverlevel(characterLevel, zone);
  if (overlevel <= 0) return 1;
  if (overlevel >= 10) return 2;
  if (overlevel >= 5) return 1.6;
  return 1.25;
};

export const getZoneProgressPerTick = ({
  zone,
  characterLevel,
  durationVariance = 1,
}) => {
  if (!zone) return 0;
  const safeVariance = Math.max(0.85, Math.min(1.2, Number(durationVariance) || 1));
  const base = 100 / Math.max(1, Number(zone.baseDurationSeconds) || 150);
  const speedMultiplier = getZoneProgressSpeedMultiplier(characterLevel, zone);
  return base * speedMultiplier / safeVariance;
};

export const getZoneCheckpointGoldReward = (zone, checkpoint) => {
  if (!zone?.checkpointGoldRewards || typeof zone.checkpointGoldRewards !== "object") {
    return 0;
  }
  const cp = Number(checkpoint);
  if (!Number.isFinite(cp)) return 0;
  return Math.max(0, Math.floor(zone.checkpointGoldRewards[cp] || 0));
};

export const getZoneCheckpointLootQualities = (zone, checkpoint) => {
  if (!zone || typeof zone !== "object") return [];
  const cp = Number(checkpoint);
  if (!Number.isFinite(cp)) return [];
  const source =
    zone.checkpointLootQualitiesByCheckpoint &&
    typeof zone.checkpointLootQualitiesByCheckpoint === "object"
      ? zone.checkpointLootQualitiesByCheckpoint
      : buildZoneCheckpointLootQualities(zone);
  const qualities = Array.isArray(source[cp]) ? source[cp] : [];
  return qualities
    .map((quality) => Number(quality))
    .filter((quality) => Number.isFinite(quality) && quality > 0);
};

export const getZoneLootRewardCounts = (zone) => {
  if (!zone || typeof zone !== "object") return { common: 0, uncommon: 0, rare: 0 };
  if (zone.lootRewardCounts && typeof zone.lootRewardCounts === "object") {
    return {
      common: Math.max(0, Math.floor(Number(zone.lootRewardCounts.common) || 0)),
      uncommon: Math.max(0, Math.floor(Number(zone.lootRewardCounts.uncommon) || 0)),
      rare: Math.max(0, Math.floor(Number(zone.lootRewardCounts.rare) || 0)),
    };
  }
  const checkpointLootQualitiesByCheckpoint = buildZoneCheckpointLootQualities(zone);
  return buildZoneLootRewardCounts(checkpointLootQualitiesByCheckpoint);
};

export const getZonesForFaction = (faction, includeNeutral = true) =>
  ZONE_DEFINITIONS.filter(
    (zone) =>
      zone.faction === faction || (includeNeutral && zone.faction === ZONE_FACTION.NEUTRAL),
  );

export const isZoneAccessibleForFaction = (zone, faction) => {
  if (!zone || !faction) return false;
  if (zone.faction === ZONE_FACTION.NEUTRAL) return true;
  return zone.faction === faction;
};

export const isStarterZone = (zone) =>
  Boolean(zone?.id && STARTER_ZONE_IDS.has(zone.id));

export const getZonePvpTerritory = (zone, realmType, faction = null) => {
  if (realmType !== GUILD_SERVER_STYLE.PVP) return null;
  if (isStarterZone(zone)) {
    const isEnemyStarterZone =
      faction &&
      zone?.faction &&
      zone.faction !== ZONE_FACTION.NEUTRAL &&
      zone.faction !== faction;
    if (isEnemyStarterZone) {
      return {
        key: "hostile",
        label: ZONE_PVP_TERRITORY.HOSTILE,
        description: "Enemy starting area - your faction is exposed here.",
      };
    }
    return {
      key: "safe",
      label: ZONE_PVP_TERRITORY.SAFE,
      description: "Starting area - PvP pressure is suppressed here.",
    };
  }
  return {
    key: "contested",
    label: ZONE_PVP_TERRITORY.CONTESTED,
    description: "PvP realm territory - future world PvP events can happen here.",
  };
};

const getStableCharacterZoneHash = (character) => {
  const source = String(
    character?.id ||
      character?.name ||
      `${character?.race || ""}:${character?.charClass || ""}` ||
      "character",
  );
  return [...source].reduce(
    (hash, letter, index) => hash + letter.charCodeAt(0) * (index + 7),
    0,
  );
};

const pickPreferenceTags = ({ pool, hash, count, offset, excluded = [] }) => {
  const excludedSet = new Set(
    (Array.isArray(excluded) ? excluded : [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean),
  );
  const source = pool.filter((entry) => !excludedSet.has(entry));
  if (source.length === 0) return [];
  return Array.from({ length: Math.min(count, source.length) }, (_, index) => {
    const seed = hash + offset * (index + 1) + index * 17;
    return source[Math.abs(seed) % source.length];
  }).filter((entry, index, picked) => picked.indexOf(entry) === index);
};

const normalizePreferenceTags = (values, pool, fallback) => {
  const allowed = new Set(pool);
  const normalized = (Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter((value) => allowed.has(value));
  return normalized.length > 0 ? [...new Set(normalized)] : fallback;
};

export const getCharacterZonePreference = (character = {}) => {
  const hash = getStableCharacterZoneHash(character);
  const rawPreference =
    character?.zonePreference && typeof character.zonePreference === "object"
      ? character.zonePreference
      : {};
  const archetype = ZONE_COMPLETION_ARCHETYPES.includes(rawPreference.archetype)
    ? rawPreference.archetype
    : ZONE_COMPLETION_ARCHETYPES[hash % ZONE_COMPLETION_ARCHETYPES.length];
  const likedBiomes = normalizePreferenceTags(
    rawPreference.likedBiomes,
    ZONE_BIOME_POOL,
    pickPreferenceTags({ pool: ZONE_BIOME_POOL, hash, count: 2, offset: 11 }),
  );
  const dislikedBiomes = normalizePreferenceTags(
    rawPreference.dislikedBiomes,
    ZONE_BIOME_POOL,
    pickPreferenceTags({
      pool: ZONE_BIOME_POOL,
      hash,
      count: 1,
      offset: 23,
      excluded: likedBiomes,
    }),
  );
  const likedEnemies = normalizePreferenceTags(
    rawPreference.likedEnemies,
    ZONE_ENEMY_POOL,
    pickPreferenceTags({ pool: ZONE_ENEMY_POOL, hash, count: 2, offset: 31 }),
  );
  const dislikedEnemies = normalizePreferenceTags(
    rawPreference.dislikedEnemies,
    ZONE_ENEMY_POOL,
    pickPreferenceTags({
      pool: ZONE_ENEMY_POOL,
      hash,
      count: 1,
      offset: 43,
      excluded: likedEnemies,
    }),
  );

  return {
    archetype,
    likedBiomes,
    dislikedBiomes,
    likedEnemies,
    dislikedEnemies,
    hash,
  };
};

const sortZonesForPathing = (zones, faction) =>
  [...zones].sort((left, right) => {
    const leftFactionPriority =
      left.faction === faction ? 0 : left.faction === ZONE_FACTION.NEUTRAL ? 1 : 2;
    const rightFactionPriority =
      right.faction === faction ? 0 : right.faction === ZONE_FACTION.NEUTRAL ? 1 : 2;
    if (leftFactionPriority !== rightFactionPriority) {
      return leftFactionPriority - rightFactionPriority;
    }
    if (left.minLevel !== right.minLevel) return left.minLevel - right.minLevel;
    if (left.maxLevel !== right.maxLevel) return left.maxLevel - right.maxLevel;
    return left.name.localeCompare(right.name);
  });

const countTagMatches = (source, preferences) => {
  const preferenceSet = new Set(Array.isArray(preferences) ? preferences : []);
  return (Array.isArray(source) ? source : []).filter((tag) =>
    preferenceSet.has(tag),
  ).length;
};

const getZonePreferenceTieBreaker = (zone, preference) => {
  const zoneHash = [...String(zone?.id || "")].reduce(
    (hash, letter, index) => hash + letter.charCodeAt(0) * (index + 3),
    0,
  );
  return ((zoneHash + (Number(preference?.hash) || 0)) % 97) / 1000;
};

const ZONE_ROUTE_WEIGHTS_BY_ZONE_ID = Object.freeze({
  elwynn_forest: Object.freeze([
    ["westfall", 72],
    ["loch_modan", 12],
    ["darkshore", 10],
    ["redridge_mountains", 6],
  ]),
  dun_morogh: Object.freeze([
    ["loch_modan", 70],
    ["westfall", 14],
    ["darkshore", 10],
    ["redridge_mountains", 6],
  ]),
  teldrassil: Object.freeze([
    ["darkshore", 72],
    ["loch_modan", 12],
    ["westfall", 10],
    ["ashenvale", 6],
  ]),
  westfall: Object.freeze([
    ["redridge_mountains", 46],
    ["duskwood", 30],
    ["loch_modan", 14],
    ["darkshore", 10],
  ]),
  loch_modan: Object.freeze([
    ["redridge_mountains", 40],
    ["wetlands", 28],
    ["westfall", 18],
    ["darkshore", 14],
  ]),
  darkshore: Object.freeze([
    ["ashenvale", 42],
    ["loch_modan", 22],
    ["westfall", 20],
    ["redridge_mountains", 16],
  ]),
  redridge_mountains: Object.freeze([
    ["duskwood", 48],
    ["wetlands", 22],
    ["ashenvale", 16],
    ["hillsbrad_foothills", 14],
  ]),
  duskwood: Object.freeze([
    ["stranglethorn_vale_north", 40],
    ["wetlands", 24],
    ["ashenvale", 20],
    ["hillsbrad_foothills", 16],
  ]),
  wetlands: Object.freeze([
    ["arathi_highlands", 34],
    ["hillsbrad_foothills", 28],
    ["duskwood", 20],
    ["stranglethorn_vale_north", 18],
  ]),
  ashenvale: Object.freeze([
    ["stonetalon_mountains", 34],
    ["hillsbrad_foothills", 24],
    ["stranglethorn_vale_north", 22],
    ["thousand_needles", 20],
  ]),
});

const pickWeightedRouteCandidate = ({
  candidates,
  currentZoneId,
  zonePreference,
}) => {
  const route = ZONE_ROUTE_WEIGHTS_BY_ZONE_ID[currentZoneId];
  if (!Array.isArray(route) || route.length === 0) return null;
  const candidateById = new Map(candidates.map((zone) => [zone.id, zone]));
  const routeCandidates = route
    .map(([zoneId, weight]) => ({
      zone: candidateById.get(zoneId),
      weight: Math.max(0, Math.floor(Number(weight) || 0)),
    }))
    .filter((entry) => entry.zone && entry.weight > 0);
  if (routeCandidates.length === 0) return null;

  const totalWeight = routeCandidates.reduce(
    (sum, entry) => sum + entry.weight,
    0,
  );
  if (totalWeight <= 0) return null;

  let roll = Math.abs(Number(zonePreference?.hash) || 0) % totalWeight;
  for (const entry of routeCandidates) {
    if (roll < entry.weight) return entry.zone;
    roll -= entry.weight;
  }
  return routeCandidates[0].zone;
};

const pickPreferredZoneCandidate = ({
  candidates,
  level,
  faction,
  currentZoneId,
  zonePreference,
}) => {
  if (candidates.length === 0) return null;
  const routeCandidate = pickWeightedRouteCandidate({
    candidates,
    currentZoneId,
    zonePreference,
  });
  if (routeCandidate) return routeCandidate;

  return [...candidates].sort((left, right) => {
    const scoreDiff =
      scoreZoneForCharacterPreference({
        zone: right,
        level,
        faction,
        zonePreference,
      }) -
      scoreZoneForCharacterPreference({
        zone: left,
        level,
        faction,
        zonePreference,
      });
    if (scoreDiff !== 0) return scoreDiff;
    if (left.minLevel !== right.minLevel) return left.minLevel - right.minLevel;
    if (left.maxLevel !== right.maxLevel) return left.maxLevel - right.maxLevel;
    return left.name.localeCompare(right.name);
  })[0];
};

export const scoreZoneForCharacterPreference = ({
  zone,
  level,
  faction,
  zonePreference,
}) => {
  if (!zone) return Number.NEGATIVE_INFINITY;
  const safeLevel = clampLevel(level);
  const preference =
    zonePreference && typeof zonePreference === "object"
      ? zonePreference
      : getCharacterZonePreference();
  const overlevel = Math.max(0, safeLevel - clampLevel(zone.maxLevel));
  let score = 0;

  if (zone.faction === faction) score += 8;
  if (zone.faction === ZONE_FACTION.NEUTRAL) score += 4;

  if (preference.archetype === ZONE_COMPLETION_ARCHETYPE.GEAR_SEEKER) {
    score += zone.maxLevel >= 50 ? 900 : 0;
    score += zone.maxLevel * 10 + zone.minLevel;
  } else if (preference.archetype === ZONE_COMPLETION_ARCHETYPE.COMPLETIONIST) {
    score += 900 - zone.minLevel * 10;
    score += overlevel * 4;
  } else {
    score += Math.max(0, 60 - Math.abs(zone.maxLevel - safeLevel));
  }

  const likedBiomeMatches = countTagMatches(zone.biomes, preference.likedBiomes);
  const likedEnemyMatches = countTagMatches(zone.enemies, preference.likedEnemies);
  const dislikedBiomeMatches = countTagMatches(
    zone.biomes,
    preference.dislikedBiomes,
  );
  const dislikedEnemyMatches = countTagMatches(
    zone.enemies,
    preference.dislikedEnemies,
  );
  if (preference.archetype === ZONE_COMPLETION_ARCHETYPE.WANDERER) {
    score += likedBiomeMatches * 220 + likedEnemyMatches * 120;
    score -= dislikedBiomeMatches * 45 + dislikedEnemyMatches * 30;
  } else if (preference.archetype === ZONE_COMPLETION_ARCHETYPE.AVOIDANT) {
    score += likedBiomeMatches * 60 + likedEnemyMatches * 35;
    score -= dislikedBiomeMatches * 260 + dislikedEnemyMatches * 160;
  } else {
    score += likedBiomeMatches * 35 + likedEnemyMatches * 25;
    score -= dislikedBiomeMatches * 20 + dislikedEnemyMatches * 15;
  }

  return score + getZonePreferenceTieBreaker(zone, preference);
};

export const pickNextZoneForCharacter = ({
  faction,
  level,
  zonesCleared = [],
  currentZoneId = null,
  character = null,
  zonePreference = null,
}) => {
  const clearedZoneIds = (Array.isArray(zonesCleared) ? zonesCleared : [])
    .map((zoneId) => String(zoneId || "").trim())
    .filter(Boolean);
  const clearedSet = new Set(clearedZoneIds);
  const hasClearedStarterZone = clearedZoneIds.some((zoneId) =>
    STARTER_ZONE_IDS.has(zoneId),
  );

  let candidates = sortZonesForPathing(getZonesForFaction(faction, true), faction).filter(
    (zone) => !clearedSet.has(zone.id),
  );
  if (hasClearedStarterZone) {
    const nonStarterCandidates = candidates.filter((zone) => !zone.isStarterZone);
    if (nonStarterCandidates.length > 0) {
      candidates = nonStarterCandidates;
    }
  }

  if (candidates.length === 0) return getZoneById(currentZoneId);

  const safeLevel = clampLevel(level);
  const preference =
    zonePreference && typeof zonePreference === "object"
      ? zonePreference
      : getCharacterZonePreference(character || {});
  if (safeLevel >= 60) {
    return [...candidates].sort((left, right) => {
      const scoreDiff =
        scoreZoneForCharacterPreference({
          zone: right,
          level: safeLevel,
          faction,
          zonePreference: preference,
        }) -
        scoreZoneForCharacterPreference({
          zone: left,
          level: safeLevel,
          faction,
          zonePreference: preference,
        });
      if (scoreDiff !== 0) return scoreDiff;
      if (left.minLevel !== right.minLevel) return left.minLevel - right.minLevel;
      return left.name.localeCompare(right.name);
    })[0];
  }

  const inRange = candidates.filter(
    (zone) => safeLevel >= zone.minLevel && safeLevel <= zone.maxLevel,
  );
  if (inRange.length > 0) {
    return pickPreferredZoneCandidate({
      candidates: inRange,
      level: safeLevel,
      faction,
      currentZoneId,
      zonePreference: preference,
    });
  }

  const upcoming = candidates.filter((zone) => zone.minLevel > safeLevel);
  if (upcoming.length > 0) {
    return pickPreferredZoneCandidate({
      candidates: upcoming,
      level: safeLevel,
      faction,
      currentZoneId,
      zonePreference: preference,
    });
  }

  return pickPreferredZoneCandidate({
    candidates,
    level: safeLevel,
    faction,
    currentZoneId,
    zonePreference: preference,
  });
};

export const mergeZoneMissionsIntoList = (missionList) => {
  const source = (Array.isArray(missionList) ? missionList : []).filter((mission) => {
    if (mission?.type !== "zone") return true;
    const zoneId = String(mission?.zoneId || "").trim();
    return zoneId && ZONE_BY_ID.has(zoneId);
  });
  const existingMissionIds = new Set(source.map((mission) => String(mission?.id || "")));

  ZONE_MISSION_TEMPLATES.forEach((zoneMission) => {
    if (existingMissionIds.has(String(zoneMission.id))) return;
    source.push({ ...zoneMission, rewardQualities: [...zoneMission.rewardQualities] });
  });

  return source;
};
