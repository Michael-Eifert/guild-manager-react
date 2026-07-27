import {
  GUILD_FACTION,
  GUILD_SERVER_POPULATION,
  GUILD_SERVER_STYLE,
} from "../constants";

export const REALM_TYPES = Object.freeze({
  PVE: GUILD_SERVER_STYLE.PVE,
  PVP: GUILD_SERVER_STYLE.PVP,
});

export const NPC_GUILD_ARCHETYPES = Object.freeze({
  HARDCORE_RAIDERS: "Hardcore Raiders",
  CASUAL_ADVENTURERS: "Casual Adventurers",
  DUNGEON_RUNNERS: "Dungeon Runners",
  LEVELING_GUILD: "Leveling Guild",
  SOCIAL_GUILD: "Social Guild",
});

export const NPC_GUILD_ARCHETYPE_ORDER = Object.freeze([
  NPC_GUILD_ARCHETYPES.HARDCORE_RAIDERS,
  NPC_GUILD_ARCHETYPES.CASUAL_ADVENTURERS,
  NPC_GUILD_ARCHETYPES.DUNGEON_RUNNERS,
  NPC_GUILD_ARCHETYPES.LEVELING_GUILD,
  NPC_GUILD_ARCHETYPES.SOCIAL_GUILD,
]);

export const REALM_NEWS_LIMIT = 25;
export const REALM_GUILD_DENSITY_PROFILE = Object.freeze({
  few: Object.freeze({
    initialRange: Object.freeze([5, 6]),
    mediumTargetRange: Object.freeze([16, 20]),
    highTargetRange: Object.freeze([22, 28]),
    rosterMultiplier: 1.55,
  }),
  medium: Object.freeze({
    initialRange: Object.freeze([8, 10]),
    mediumTargetRange: Object.freeze([24, 32]),
    highTargetRange: Object.freeze([32, 44]),
    rosterMultiplier: 1,
  }),
  many: Object.freeze({
    initialRange: Object.freeze([11, 14]),
    mediumTargetRange: Object.freeze([36, 46]),
    highTargetRange: Object.freeze([48, 60]),
    rosterMultiplier: 0.72,
  }),
});
export const REALM_GUILD_DYNAMICS_PROFILE = Object.freeze({
  low: Object.freeze({
    foundingIntervalDays: 5,
    foundingChance: 0.35,
    fusionWeakDays: 14,
    dissolutionWeakDays: 28,
    structureCooldownDays: 10,
    transferIntervalDays: 3,
    maxTransfers: 1,
  }),
  medium: Object.freeze({
    foundingIntervalDays: 2,
    foundingChance: 0.6,
    fusionWeakDays: 7,
    dissolutionWeakDays: 14,
    structureCooldownDays: 5,
    transferIntervalDays: 1,
    maxTransfers: 1,
  }),
  high: Object.freeze({
    foundingIntervalDays: 1,
    foundingChance: 0.85,
    fusionWeakDays: 4,
    dissolutionWeakDays: 8,
    structureCooldownDays: 2,
    transferIntervalDays: 1,
    maxTransfers: 2,
  }),
});
export const normalizeRealmGuildDensity = (value: unknown) =>
  Object.prototype.hasOwnProperty.call(
    REALM_GUILD_DENSITY_PROFILE,
    String(value),
  )
    ? (value as keyof typeof REALM_GUILD_DENSITY_PROFILE)
    : "medium";
export const normalizeRealmGuildDynamics = (value: unknown) =>
  Object.prototype.hasOwnProperty.call(
    REALM_GUILD_DYNAMICS_PROFILE,
    String(value),
  )
    ? (value as keyof typeof REALM_GUILD_DYNAMICS_PROFILE)
    : "medium";
export const getRealmGuildDensityProfile = (density: unknown) =>
  REALM_GUILD_DENSITY_PROFILE[normalizeRealmGuildDensity(density)];
export const getRealmGuildDynamicsProfile = (dynamics: unknown) =>
  REALM_GUILD_DYNAMICS_PROFILE[normalizeRealmGuildDynamics(dynamics)];
export const REALM_NPC_GUILD_INITIAL_RANGE =
  REALM_GUILD_DENSITY_PROFILE.medium.initialRange;
export const REALM_NPC_GUILD_TARGET_RANGE =
  REALM_GUILD_DENSITY_PROFILE.medium.mediumTargetRange;
export const REALM_NPC_GUILD_HIGH_POP_TARGET_RANGE =
  REALM_GUILD_DENSITY_PROFILE.medium.highTargetRange;
export const REALM_NPC_GUILD_FOUNDED_ROSTER_RANGE = Object.freeze([6, 10]);
export const DEFAULT_NPC_GUILD_COUNT = REALM_NPC_GUILD_INITIAL_RANGE[1];
export const REALM_GUILD_ROSTER_CAP = 80;
export const REALM_GUILD_APPLICATION_CAP = 8;
export const REALM_GUILD_APPLICATION_LIFETIME_DAYS = 7;
export const REALM_DEPARTED_PLAYER_LIMIT = 100;
export const REALM_RETURN_MINIMUM_DAYS = 14;
export const REALM_DAILY_NPC_GUILD_EXIT_CAP = 3;
export const REALM_DAILY_DEPARTURE_CAP = 2;
export const REALM_DAILY_RETIREMENT_CAP = 1;
export const REALM_DAILY_RETURNER_CAP = 2;
export const REALM_POPULATION_START = 200;
export const REALM_POPULATION_SOFT_CAP = 1500;
export const REALM_HIGH_POPULATION_SOFT_CAP = 2000;
export const REALM_POPULATION_SOFT_CAP_VARIANCE = 100;
export const REALM_DAILY_ARRIVAL_RANGE = Object.freeze([50, 100]);

export const getRealmPopulationProfile = (
  serverPopulation: string,
  guildDensity: unknown = "medium",
) => {
  const isHighPopulation = serverPopulation === GUILD_SERVER_POPULATION.HIGH;
  const densityProfile = getRealmGuildDensityProfile(guildDensity);
  return {
    populationLabel: isHighPopulation
      ? GUILD_SERVER_POPULATION.HIGH
      : GUILD_SERVER_POPULATION.MEDIUM,
    softCap: isHighPopulation
      ? REALM_HIGH_POPULATION_SOFT_CAP
      : REALM_POPULATION_SOFT_CAP,
    guildTargetRange: isHighPopulation
      ? densityProfile.highTargetRange
      : densityProfile.mediumTargetRange,
    guildInitialRange: densityProfile.initialRange,
    rosterMultiplier: densityProfile.rosterMultiplier,
  };
};

export const REALM_MARKET_STATUS = Object.freeze({
  FREE_AGENT: "free_agent",
  GUILDED: "guilded",
  OPEN_TO_OFFERS: "open_to_offers",
});

export const REALM_RAID_TRACKS = Object.freeze([
  Object.freeze({
    id: "molten_core",
    name: "Molten Core",
    shortName: "MC",
    totalBosses: 10,
  }),
  Object.freeze({
    id: "zul_gurub",
    name: "Zul'Gurub",
    shortName: "ZG",
    totalBosses: 9,
  }),
  Object.freeze({
    id: "ahn_qiraj_ruins",
    name: "Ruins of Ahn'Qiraj",
    shortName: "AQ20",
    totalBosses: 6,
  }),
  Object.freeze({
    id: "onyxias_lair",
    name: "Onyxia's Lair",
    shortName: "Ony",
    totalBosses: 1,
  }),
  Object.freeze({
    id: "blackwing_lair",
    name: "Blackwing Lair",
    shortName: "BWL",
    totalBosses: 8,
  }),
  Object.freeze({
    id: "ahn_qiraj_temple",
    name: "Temple of Ahn'Qiraj",
    shortName: "AQ40",
    totalBosses: 9,
  }),
  Object.freeze({
    id: "naxxramas",
    name: "Naxxramas",
    shortName: "Naxx",
    totalBosses: 15,
  }),
]);

export const NPC_GUILD_NAME_POOL = Object.freeze([
  "Liquid",
  "Method",
  "Echo",
  "Vanilla Oath",
  "Progress Optional",
  "Wipe Insurance",
  "Pull Timer Heroes",
  "Bench Warmers",
  "Loot Council Survivors",
  "Casual World First",
  "Fresh Boars",
  "One More Pull",
  "Dawnspire",
  "Night Oath",
  "Ember Vanguard",
  "Silver Covenant",
  "Ashen Banner",
  "Moonlit Order",
  "Iron Hearth",
  "Stormcallers",
  "Red Mesa Clan",
  "Gilded Gryphons",
  "Cinder Watch",
  "Azure Sigil",
  "Runebound",
  "Ebon Lantern",
  "Wildhammer Pact",
  "Sunless Choir",
  "Frostwake",
  "Crimson Ledger",
  "Old World Order",
  "Molten Promise",
  "Hearthstone Heroes",
  "Scarlet Deadline",
  "Stormforge Union",
  "Midnight Buffet",
  "The Repair Bill",
  "Mana Break",
  "Graveyard Shift",
  "No Flask No Problem",
]);

export const NPC_GUILD_ARCHETYPE_PROFILE = Object.freeze({
  [NPC_GUILD_ARCHETYPES.HARDCORE_RAIDERS]: Object.freeze({
    rosterSize: [28, 44],
    averageLevel: [1, 1],
    averageGearScore: [1, 3],
    activityLevel: [74, 98],
    raidProgress: [0, 0],
    dungeonScore: [0, 0],
    reputation: [48, 76],
  }),
  [NPC_GUILD_ARCHETYPES.CASUAL_ADVENTURERS]: Object.freeze({
    rosterSize: [24, 40],
    averageLevel: [1, 1],
    averageGearScore: [1, 2],
    activityLevel: [30, 62],
    raidProgress: [0, 0],
    dungeonScore: [0, 0],
    reputation: [50, 82],
  }),
  [NPC_GUILD_ARCHETYPES.DUNGEON_RUNNERS]: Object.freeze({
    rosterSize: [20, 34],
    averageLevel: [1, 1],
    averageGearScore: [1, 3],
    activityLevel: [58, 88],
    raidProgress: [0, 0],
    dungeonScore: [0, 0],
    reputation: [42, 70],
  }),
  [NPC_GUILD_ARCHETYPES.LEVELING_GUILD]: Object.freeze({
    rosterSize: [36, 56],
    averageLevel: [1, 1],
    averageGearScore: [1, 2],
    activityLevel: [50, 82],
    raidProgress: [0, 0],
    dungeonScore: [0, 0],
    reputation: [46, 76],
  }),
  [NPC_GUILD_ARCHETYPES.SOCIAL_GUILD]: Object.freeze({
    rosterSize: [48, 70],
    averageLevel: [1, 1],
    averageGearScore: [1, 2],
    activityLevel: [36, 66],
    raidProgress: [0, 0],
    dungeonScore: [0, 0],
    reputation: [74, 98],
  }),
});

export const REALM_FACTION_ORDER = Object.freeze([
  GUILD_FACTION.ALLIANCE,
  GUILD_FACTION.HORDE,
]);
