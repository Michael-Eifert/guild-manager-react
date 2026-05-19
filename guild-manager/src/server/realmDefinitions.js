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
export const REALM_NPC_GUILD_INITIAL_RANGE = Object.freeze([4, 6]);
export const REALM_NPC_GUILD_TARGET_RANGE = Object.freeze([10, 15]);
export const REALM_NPC_GUILD_HIGH_POP_TARGET_RANGE = Object.freeze([15, 20]);
export const REALM_NPC_GUILD_FOUNDED_ROSTER_RANGE = Object.freeze([6, 10]);
export const DEFAULT_NPC_GUILD_COUNT = REALM_NPC_GUILD_INITIAL_RANGE[1];
export const REALM_GUILD_ROSTER_CAP = 80;
export const REALM_GUILD_APPLICATION_CAP = 8;
export const REALM_POPULATION_START = 200;
export const REALM_POPULATION_SOFT_CAP = 1000;
export const REALM_HIGH_POPULATION_SOFT_CAP = 1500;
export const REALM_POPULATION_SOFT_CAP_VARIANCE = 100;
export const REALM_DAILY_ARRIVAL_RANGE = Object.freeze([50, 100]);

export const getRealmPopulationProfile = (serverPopulation) => {
  const isHighPopulation = serverPopulation === GUILD_SERVER_POPULATION.HIGH;
  return {
    populationLabel: isHighPopulation
      ? GUILD_SERVER_POPULATION.HIGH
      : GUILD_SERVER_POPULATION.MEDIUM,
    softCap: isHighPopulation
      ? REALM_HIGH_POPULATION_SOFT_CAP
      : REALM_POPULATION_SOFT_CAP,
    guildTargetRange: isHighPopulation
      ? REALM_NPC_GUILD_HIGH_POP_TARGET_RANGE
      : REALM_NPC_GUILD_TARGET_RANGE,
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
    rosterSize: [8, 14],
    averageLevel: [1, 1],
    averageGearScore: [1, 3],
    activityLevel: [74, 98],
    pveScore: [20, 45],
    raidProgress: [0, 0],
    dungeonScore: [0, 12],
    reputation: [48, 76],
  }),
  [NPC_GUILD_ARCHETYPES.CASUAL_ADVENTURERS]: Object.freeze({
    rosterSize: [8, 15],
    averageLevel: [1, 1],
    averageGearScore: [1, 2],
    activityLevel: [30, 62],
    pveScore: [8, 28],
    raidProgress: [0, 0],
    dungeonScore: [0, 8],
    reputation: [50, 82],
  }),
  [NPC_GUILD_ARCHETYPES.DUNGEON_RUNNERS]: Object.freeze({
    rosterSize: [7, 13],
    averageLevel: [1, 1],
    averageGearScore: [1, 3],
    activityLevel: [58, 88],
    pveScore: [16, 38],
    raidProgress: [0, 0],
    dungeonScore: [4, 16],
    reputation: [42, 70],
  }),
  [NPC_GUILD_ARCHETYPES.LEVELING_GUILD]: Object.freeze({
    rosterSize: [9, 15],
    averageLevel: [1, 1],
    averageGearScore: [1, 2],
    activityLevel: [50, 82],
    pveScore: [14, 34],
    raidProgress: [0, 0],
    dungeonScore: [0, 10],
    reputation: [46, 76],
  }),
  [NPC_GUILD_ARCHETYPES.SOCIAL_GUILD]: Object.freeze({
    rosterSize: [10, 15],
    averageLevel: [1, 1],
    averageGearScore: [1, 2],
    activityLevel: [36, 66],
    pveScore: [8, 26],
    raidProgress: [0, 0],
    dungeonScore: [0, 8],
    reputation: [74, 98],
  }),
});

export const REALM_FACTION_ORDER = Object.freeze([
  GUILD_FACTION.ALLIANCE,
  GUILD_FACTION.HORDE,
]);
