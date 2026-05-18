import { GUILD_FACTION, GUILD_SERVER_STYLE } from "../constants";

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
export const DEFAULT_NPC_GUILD_COUNT = 12;
export const REALM_GUILD_ROSTER_CAP = 80;
export const REALM_GUILD_APPLICATION_CAP = 8;
export const REALM_POPULATION_START = 600;
export const REALM_POPULATION_SOFT_CAP = 1000;
export const REALM_DAILY_ARRIVAL_RANGE = Object.freeze([12, 33]);

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
    rosterSize: [32, 48],
    averageLevel: [36, 54],
    averageGearScore: [34, 55],
    activityLevel: [74, 98],
    pveScore: [520, 820],
    raidProgress: [8, 30],
    dungeonScore: [320, 520],
    reputation: [48, 76],
  }),
  [NPC_GUILD_ARCHETYPES.CASUAL_ADVENTURERS]: Object.freeze({
    rosterSize: [42, 64],
    averageLevel: [18, 42],
    averageGearScore: [16, 36],
    activityLevel: [30, 62],
    pveScore: [170, 380],
    raidProgress: [0, 8],
    dungeonScore: [90, 260],
    reputation: [50, 82],
  }),
  [NPC_GUILD_ARCHETYPES.DUNGEON_RUNNERS]: Object.freeze({
    rosterSize: [24, 42],
    averageLevel: [28, 50],
    averageGearScore: [28, 50],
    activityLevel: [58, 88],
    pveScore: [360, 660],
    raidProgress: [2, 18],
    dungeonScore: [360, 660],
    reputation: [42, 70],
  }),
  [NPC_GUILD_ARCHETYPES.LEVELING_GUILD]: Object.freeze({
    rosterSize: [34, 56],
    averageLevel: [12, 34],
    averageGearScore: [12, 30],
    activityLevel: [50, 82],
    pveScore: [120, 320],
    raidProgress: [0, 3],
    dungeonScore: [80, 220],
    reputation: [46, 76],
  }),
  [NPC_GUILD_ARCHETYPES.SOCIAL_GUILD]: Object.freeze({
    rosterSize: [48, 72],
    averageLevel: [16, 40],
    averageGearScore: [14, 34],
    activityLevel: [36, 66],
    pveScore: [110, 300],
    raidProgress: [0, 5],
    dungeonScore: [70, 210],
    reputation: [74, 98],
  }),
});

export const REALM_FACTION_ORDER = Object.freeze([
  GUILD_FACTION.ALLIANCE,
  GUILD_FACTION.HORDE,
]);
