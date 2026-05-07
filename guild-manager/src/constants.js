export {
  CONFIG,
  GUILD_FACTION,
  GUILD_FACTION_OPTIONS,
  GUILD_SERVER_STYLE,
  GUILD_SERVER,
  GUILD_SERVER_OPTIONS,
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
});

export const PROFESSIONS_LIST = Object.values(PROFESSIONS);

export const DEFAULT_PROF_PAIR = [
  PROFESSIONS.MINING,
  PROFESSIONS.HERBALISM,
];

export const PROF_PAIRS = {
  Warrior: [PROFESSIONS.MINING, PROFESSIONS.BLACKSMITHING],
  Paladin: [PROFESSIONS.MINING, PROFESSIONS.BLACKSMITHING],
  Hunter: [PROFESSIONS.SKINNING, PROFESSIONS.LEATHERWORKING],
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
};

const wowItemIcon = (iconCode) =>
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
});

export { DB_CLASSES } from './data/classes';
export { DB_RACES } from './data/races';
export { DB_NAMES, DB_FUNNY_NAMES } from './data/names';
