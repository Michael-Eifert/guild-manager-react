export const CONFIG = {
  MAX_ROSTER: 10,
  // Active progression phase for now. Raise this toward MAX_SUPPORTED_LEVEL over time.
  LEVEL_CAP: 20,
  MAX_SUPPORTED_LEVEL: 60,
  TICK_RATE: 1000,
  XP_TABLE: [
    0, 400, 900, 1400, 2100, 2800, 3600, 4500, 5400, 6500, 7600, 8700, 9800,
    11000, 12300, 13600, 15000, 16400, 17800, 19200, 20800,
  ],
};

export const INITIAL_MISSIONS = [
  {
    id: 1,
    type: "quest",
    name: "Clear Kobold Mine",
    level: 1,
    duration: 10,
    exp: 450,
    elite: false,
  },
  {
    id: 2,
    type: "quest",
    name: "Gather Herbs",
    level: 2,
    duration: 15,
    exp: 600,
    elite: false,
  },
  {
    id: 3,
    type: "quest",
    name: "Wolf Hunt",
    level: 5,
    duration: 30,
    exp: 1200,
    elite: false,
  },
  {
    id: 4,
    type: "quest",
    name: "Elite: Defeat Hogger",
    level: 10,
    duration: 60,
    exp: 4000,
    elite: true,
  },
  {
    id: 5,
    type: "dungeon",
    name: "The Deadmines",
    level: 17,
    minLevel: 10,
    duration: 120,
    exp: 17000,
    elite: true,
    recommended: "17-23",
  },
  {
    id: 6,
    type: "dungeon",
    name: "Wailing Caverns",
    level: 18,
    minLevel: 10,
    duration: 150,
    exp: 20000,
    elite: true,
    recommended: "17-24",
  },
];

export const PROFESSIONS_LIST = [
  "Mining",
  "Herbalism",
  "Skinning",
  "Blacksmithing",
  "Leatherworking",
  "Tailoring",
  "Enchanting",
  "Alchemy",
];

export const PROF_PAIRS = {
  Warrior: ["Mining", "Blacksmithing"],
  Paladin: ["Mining", "Blacksmithing"],
  Hunter: ["Skinning", "Leatherworking"],
  Rogue: ["Skinning", "Leatherworking"],
  Druid: ["Herbalism", "Alchemy"],
  Priest: ["Tailoring", "Enchanting"],
  Mage: ["Tailoring", "Enchanting"],
  Warlock: ["Tailoring", "Enchanting"],
};

export const PROF_ACTIONS = {
  Mining: "⛏️ Mining Ore...",
  Herbalism: "🌿 Gathering Herbs...",
  Skinning: "🔪 Skinning...",
  Blacksmithing: "🔨 Forging...",
  Leatherworking: "🧵 Stitching...",
  Tailoring: "🧶 Weaving...",
  Enchanting: "✨ Disenchanting...",
  Alchemy: "⚗️ Brewing...",
};

export const DB_ITEMS = [
  {
    id: 101,
    name: "Worn Shortsword",
    slot: "mainHand",
    quality: 1,
    type: "Generic",
    minLevel: 1,
  },
  {
    id: 103,
    name: "Apprentice Robe",
    slot: "chest",
    quality: 1,
    type: "Cloth",
    minLevel: 1,
  },
  {
    id: 106,
    name: "Thug's Vest",
    slot: "chest",
    quality: 1,
    type: "Leather",
    minLevel: 1,
  },
  {
    id: 109,
    name: "Rusty Chain Vest",
    slot: "chest",
    quality: 1,
    type: "Mail",
    minLevel: 1,
  },
  {
    id: 120,
    name: "Militia Hammer",
    slot: "mainHand",
    quality: 1,
    type: "Generic",
    minLevel: 6,
  },
  {
    id: 200,
    name: "Kobold Mining Mallet",
    slot: "mainHand",
    quality: 2,
    type: "Generic",
    minLevel: 5,
  },
  {
    id: 225,
    name: "Silvered Bronze Breastplate",
    slot: "chest",
    quality: 2,
    type: "Mail",
    minLevel: 13,
  },
  {
    id: 300,
    name: "Cookie's Tenderizer",
    slot: "mainHand",
    quality: 3,
    type: "Generic",
    minLevel: 15,
  },
  {
    id: 302,
    name: "Cruel Barb",
    slot: "mainHand",
    quality: 3,
    type: "Generic",
    minLevel: 17,
  },
  {
    id: 304,
    name: "Blackened Defias Armor",
    slot: "chest",
    quality: 3,
    type: "Leather",
    minLevel: 17,
  },
];

export const DB_CLASSES = {
  Warrior: {
    color: "#C79C6E",
    allowedRoles: ["Tank", "DPS"],
    proficiencies: ["Mail", "Leather", "Cloth"],
  },
  Paladin: {
    color: "#F58CBA",
    allowedRoles: ["Tank", "Healer", "DPS"],
    proficiencies: ["Mail", "Leather", "Cloth"],
  },
  Hunter: {
    color: "#ABD473",
    allowedRoles: ["DPS"],
    proficiencies: ["Leather", "Cloth"],
  },
  Rogue: {
    color: "#FFF569",
    allowedRoles: ["DPS"],
    proficiencies: ["Leather", "Cloth"],
  },
  Priest: {
    color: "#FFFFFF",
    allowedRoles: ["Healer", "DPS"],
    proficiencies: ["Cloth"],
  },
  Mage: { color: "#40C7EB", allowedRoles: ["DPS"], proficiencies: ["Cloth"] },
  Warlock: {
    color: "#8787ED",
    allowedRoles: ["DPS"],
    proficiencies: ["Cloth"],
  },
  Druid: {
    color: "#FF7D0A",
    allowedRoles: ["Tank", "Healer", "DPS"],
    proficiencies: ["Leather", "Cloth"],
  },
};

export const DB_RACES = {
  Human: ["Warrior", "Paladin", "Rogue", "Priest", "Mage", "Warlock"],
  Dwarf: ["Warrior", "Paladin", "Hunter", "Rogue", "Priest"],
  "Night Elf": ["Warrior", "Hunter", "Rogue", "Priest", "Druid"],
  Gnome: ["Warrior", "Rogue", "Mage", "Warlock"],
};

export const DB_NAMES = {
  Human: {
    Male: ["Varian", "Anduin", "Bolvar"],
    Female: ["Jaina", "Vanessa", "Tess"],
  },
  "Night Elf": {
    Male: ["Malfurion", "Illidan", "Jarod"],
    Female: ["Tyrande", "Shandris", "Maiev"],
  },
  Dwarf: {
    Male: ["Magni", "Muradin", "Brann"],
    Female: ["Moira", "Fenella", "Dorna"],
  },
  Gnome: {
    Male: ["Gelbin", "Mekkatorque", "Sicco"],
    Female: ["Kinndy", "Kelsey", "Pippi"],
  },
};

export const DB_LASTNAMES = [
  "Lightbringer",
  "Proudmoore",
  "Bronzebeard",
  "Whisperwind",
  "Stormrage",
  "Hellscream",
  "Menethil",
  "Fordring",
];
export const ITEM_ICONS = {
  head: "🧢",
  chest: "👕",
  legs: "👖",
  feet: "👢",
  hands: "🧤",
  mainHand: "⚔️",
};
