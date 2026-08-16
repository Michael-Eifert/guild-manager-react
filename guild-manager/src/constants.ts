export {
  CONFIG,
  GUILD_FACTION,
  GUILD_FACTION_OPTIONS,
  GUILD_SERVER_STYLE,
  GUILD_SERVER_POPULATION,
  GUILD_SERVER,
  GUILD_SERVER_OPTIONS,
  REALM_DIFFICULTY,
  REALM_DIFFICULTY_OPTIONS,
  normalizeRealmDifficulty,
  getRealmDifficultyProfile,
  GAMEPLAY_TUNING,
  GUILD_ACTIVITY_MODES,
  GUILD_DUNGEON_ACTIVITY,
  GUILD_DUNGEON_ACTIVITY_OPTIONS,
  AUTO_GROUP_SUCCESS_RATE,
  MEMBER_RANKING_MODES,
  GUILD_MEMBER_SORT,
  GUILD_MEMBER_SORT_OPTIONS,
  GUILD_FOCUS,
  GUILD_FOCUS_OPTIONS,
  DEFAULT_GUILD_SETUP,
  GUILD_STARTING_CONFIG,
  RECRUITMENT_CONFIG,
  WORLD_DROP_CONFIG,
  ZONE_TUNING,
  DEFAULT_DUNGEON_LOOT_TABLE,
  FACTION_EMBLEM_ICON,
  FACTION_RACES,
  INITIAL_MISSIONS,
} from './data/gameConfig';

export const PROFESSIONS = Object.freeze({
  MINING: "Mining",
  HERBALISM: "Herbalism",
  SKINNING: "Skinning",
  BLACKSMITHING: "Blacksmithing",
  LEATHERWORKING: "Leatherworking",
  TAILORING: "Tailoring",
  ENCHANTING: "Enchanting",
  ALCHEMY: "Alchemy",
  ENGINEERING: "Engineering",
  COOKING: "Cooking",
  FISHING: "Fishing",
  FIRST_AID: "First Aid",
});

export const SECONDARY_PROFESSIONS_LIST = Object.freeze([
  PROFESSIONS.COOKING,
  PROFESSIONS.FISHING,
  PROFESSIONS.FIRST_AID,
]);

export const PROFESSIONS_LIST = Object.freeze(
  Object.values(PROFESSIONS).filter(
    (profession) => !(SECONDARY_PROFESSIONS_LIST as readonly string[]).includes(profession),
  ),
);

export const DEFAULT_PROF_PAIR = [
  PROFESSIONS.MINING,
  PROFESSIONS.HERBALISM,
];

export const PROF_PAIRS = {
  Warrior: [PROFESSIONS.MINING, PROFESSIONS.BLACKSMITHING],
  Paladin: [PROFESSIONS.MINING, PROFESSIONS.BLACKSMITHING],
  Hunter: [PROFESSIONS.MINING, PROFESSIONS.ENGINEERING],
  Rogue: [PROFESSIONS.SKINNING, PROFESSIONS.LEATHERWORKING],
  Shaman: [PROFESSIONS.HERBALISM, PROFESSIONS.ALCHEMY],
  Druid: [PROFESSIONS.HERBALISM, PROFESSIONS.ALCHEMY],
  Priest: [PROFESSIONS.TAILORING, PROFESSIONS.ENCHANTING],
  Mage: [PROFESSIONS.TAILORING, PROFESSIONS.ENCHANTING],
  Warlock: [PROFESSIONS.TAILORING, PROFESSIONS.ENCHANTING],
};

export const PROF_ACTIONS = {
  [PROFESSIONS.MINING]: "⛏️ Mining Ore...",
  [PROFESSIONS.HERBALISM]: "🌿 Gathering Herbs...",
  [PROFESSIONS.SKINNING]: "🔪 Skinning...",
  [PROFESSIONS.BLACKSMITHING]: "🔨 Forging...",
  [PROFESSIONS.LEATHERWORKING]: "🧵 Stitching...",
  [PROFESSIONS.TAILORING]: "🧶 Weaving...",
  [PROFESSIONS.ENCHANTING]: "✨ Disenchanting...",
  [PROFESSIONS.ALCHEMY]: "⚗️ Brewing...",
  [PROFESSIONS.ENGINEERING]: "💣 Tinkering...",
  [PROFESSIONS.COOKING]: "🍲 Cooking...",
  [PROFESSIONS.FISHING]: "🎣 Fishing...",
  [PROFESSIONS.FIRST_AID]: "🩹 Making bandages...",
};

const wowItemIcon = (iconCode: string) =>
  `https://wow.zamimg.com/images/wow/icons/large/${iconCode.toLowerCase()}.jpg`;

export const KEY_DEFINITIONS = Object.freeze({
  scarlet_monastery_key: {
    id: "scarlet_monastery_key",
    name: "Scarlet Monastery Key",
    icon: wowItemIcon("INV_Misc_Key_03"),
  },
  scholomance_key: {
    id: "scholomance_key",
    name: "Scholomance Key",
    icon: wowItemIcon("INV_Misc_Key_13"),
    sourceQuest: "The Key to Scholomance - Araj's Scarab",
  },
  key_to_the_city: {
    id: "key_to_the_city",
    name: "Key to the City",
    icon: wowItemIcon("INV_Misc_Key_11"),
  },
  molten_core_attunement: {
    id: "molten_core_attunement",
    name: "Molten Core Attunement",
    icon: wowItemIcon("INV_Misc_Key_13"),
  },
  shadowforge_key: {
    id: "shadowforge_key",
    name: "Shadowforge Key",
    icon: wowItemIcon("INV_Misc_Key_11"),
  },
  crescent_key: {
    id: "crescent_key",
    name: "Crescent Key",
    icon: wowItemIcon("INV_Misc_Key_10"),
    sourceQuest: "Dire Maul East - Pusillin",
  },
  seal_of_ascension: {
    id: "seal_of_ascension",
    name: "Seal of Ascension",
    icon: wowItemIcon("INV_Jewelry_Ring_15"),
    sourceQuest: "Lower Blackrock Spire - Seal of Ascension",
  },
  blackwing_lair_attunement: {
    id: "blackwing_lair_attunement",
    name: "Orb of Ascension",
    icon: wowItemIcon("INV_Misc_Orb_05"),
    sourceQuest: "Upper Blackrock Spire - Blackhand's Command",
  },
});

export { DB_CLASSES } from './data/classes';
export { DB_RACES } from './data/races';
export {
  DB_NAMES,
  DB_CLASS_NAMES,
  DB_RACE_CLASS_NAMES,
  DB_FUNNY_NAMES,
} from './data/names';
