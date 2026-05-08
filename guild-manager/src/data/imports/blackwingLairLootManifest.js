const BLACKWING_LAIR_SET_ID = "blackwing_lair";
const BLACKWING_LAIR_SET_NAME = "Blackwing Lair";

const wowItemIcon = (iconCode) =>
  `https://wow.zamimg.com/images/wow/icons/large/${String(iconCode || "inv_misc_questionmark").toLowerCase()}.jpg`;

const BOSS = Object.freeze({
  RAZORGORE: "Razorgore the Untamed",
  VAELASTRASZ: "Vaelastrasz the Corrupt",
  BROODLORD: "Broodlord Lashlayer",
  FIREMAW: "Firemaw",
  EBONROC: "Ebonroc",
  FLAMEGOR: "Flamegor",
  CHROMAGGUS: "Chromaggus",
  NEFARIAN: "Nefarian",
});

const DRAKE_BOSSES = Object.freeze([BOSS.FIREMAW, BOSS.EBONROC, BOSS.FLAMEGOR]);

const TIER_TWO_CLASS_SETS = Object.freeze([
  {
    className: "Druid",
    type: "Leather",
    setId: "t2_stormrage_raiment",
    setName: "Stormrage Raiment",
    stats: { intellect: 24, spirit: 16, stamina: 20 },
    pieces: {
      chest: [16897, "Stormrage Chestguard"],
      feet: [16898, "Stormrage Boots"],
      hands: [16899, "Stormrage Handguards"],
      shoulder: [16902, "Stormrage Pauldrons"],
      waist: [16903, "Stormrage Belt"],
      wrist: [16904, "Stormrage Bracers"],
    },
  },
  {
    className: "Hunter",
    type: "Mail",
    setId: "t2_dragonstalker_armor",
    setName: "Dragonstalker Armor",
    stats: { agility: 24, stamina: 20, intellect: 12 },
    pieces: {
      chest: [16942, "Dragonstalker's Breastplate"],
      feet: [16941, "Dragonstalker's Greaves"],
      hands: [16940, "Dragonstalker's Gauntlets"],
      shoulder: [16937, "Dragonstalker's Spaulders"],
      waist: [16936, "Dragonstalker's Belt"],
      wrist: [16935, "Dragonstalker's Bracers"],
    },
  },
  {
    className: "Mage",
    type: "Cloth",
    setId: "t2_netherwind_regalia",
    setName: "Netherwind Regalia",
    stats: { intellect: 26, spirit: 14, stamina: 18 },
    pieces: {
      chest: [16916, "Netherwind Robes"],
      feet: [16912, "Netherwind Boots"],
      hands: [16913, "Netherwind Gloves"],
      shoulder: [16917, "Netherwind Mantle"],
      waist: [16818, "Netherwind Belt"],
      wrist: [16918, "Netherwind Bindings"],
    },
  },
  {
    className: "Paladin",
    type: "Plate",
    setId: "t2_judgment_armor",
    setName: "Judgment Armor",
    stats: { strength: 18, intellect: 20, stamina: 20 },
    pieces: {
      chest: [16958, "Judgment Breastplate"],
      feet: [16957, "Judgment Sabatons"],
      hands: [16956, "Judgment Gauntlets"],
      shoulder: [16953, "Judgment Spaulders"],
      waist: [16952, "Judgment Belt"],
      wrist: [16951, "Judgment Bindings"],
    },
  },
  {
    className: "Priest",
    type: "Cloth",
    setId: "t2_vestments_of_transcendence",
    setName: "Vestments of Transcendence",
    stats: { intellect: 25, spirit: 18, stamina: 17 },
    pieces: {
      chest: [16923, "Robes of Transcendence"],
      feet: [16919, "Boots of Transcendence"],
      hands: [16920, "Handguards of Transcendence"],
      shoulder: [16924, "Pauldrons of Transcendence"],
      waist: [16925, "Belt of Transcendence"],
      wrist: [16926, "Bindings of Transcendence"],
    },
  },
  {
    className: "Rogue",
    type: "Leather",
    setId: "t2_bloodfang_armor",
    setName: "Bloodfang Armor",
    stats: { agility: 26, stamina: 18, strength: 8 },
    pieces: {
      chest: [16905, "Bloodfang Chestpiece"],
      feet: [16906, "Bloodfang Boots"],
      hands: [16907, "Bloodfang Gloves"],
      shoulder: [16832, "Bloodfang Spaulders"],
      waist: [16910, "Bloodfang Belt"],
      wrist: [16911, "Bloodfang Bracers"],
    },
  },
  {
    className: "Shaman",
    type: "Mail",
    setId: "t2_the_ten_storms",
    setName: "The Ten Storms",
    stats: { intellect: 22, spirit: 16, stamina: 20 },
    pieces: {
      chest: [16950, "Breastplate of Ten Storms"],
      feet: [16949, "Greaves of Ten Storms"],
      hands: [16948, "Gauntlets of Ten Storms"],
      shoulder: [16945, "Epaulets of Ten Storms"],
      waist: [16944, "Belt of Ten Storms"],
      wrist: [16943, "Bracers of Ten Storms"],
    },
  },
  {
    className: "Warlock",
    type: "Cloth",
    setId: "t2_nemesis_raiment",
    setName: "Nemesis Raiment",
    stats: { intellect: 25, stamina: 22, spirit: 10 },
    pieces: {
      chest: [16931, "Nemesis Robes"],
      feet: [16927, "Nemesis Boots"],
      hands: [16928, "Nemesis Gloves"],
      shoulder: [16932, "Nemesis Spaulders"],
      waist: [16933, "Nemesis Belt"],
      wrist: [16934, "Nemesis Bracers"],
    },
  },
  {
    className: "Warrior",
    type: "Plate",
    setId: "t2_battlegear_of_wrath",
    setName: "Battlegear of Wrath",
    stats: { strength: 24, stamina: 24 },
    pieces: {
      chest: [16966, "Breastplate of Wrath"],
      feet: [16965, "Sabatons of Wrath"],
      hands: [16964, "Gauntlets of Wrath"],
      shoulder: [16961, "Pauldrons of Wrath"],
      waist: [16960, "Waistband of Wrath"],
      wrist: [16959, "Bracelets of Wrath"],
    },
  },
]);

const SLOT_SOURCE = Object.freeze({
  chest: { slot: "chest", sourceBosses: [BOSS.NEFARIAN], iconCode: "inv_chest_chain_05" },
  feet: { slot: "feet", sourceBosses: [BOSS.BROODLORD], iconCode: "inv_boots_plate_03" },
  hands: { slot: "hands", sourceBosses: DRAKE_BOSSES, iconCode: "inv_gauntlets_30" },
  shoulder: { unsupportedSlot: "shoulder", sourceBosses: [BOSS.CHROMAGGUS] },
  waist: { unsupportedSlot: "waist", sourceBosses: [BOSS.VAELASTRASZ] },
  wrist: { unsupportedSlot: "wrist", sourceBosses: [BOSS.RAZORGORE] },
});

const getSlotIcon = (slot, armorType) => {
  if (slot === "chest") return armorType === "Cloth" ? "inv_chest_cloth_03" : "inv_chest_chain_05";
  if (slot === "feet") return armorType === "Cloth" ? "inv_boots_07" : "inv_boots_plate_03";
  if (slot === "hands") return armorType === "Cloth" ? "inv_gauntlets_17" : "inv_gauntlets_30";
  return "inv_misc_questionmark";
};

const TIER_TWO_PIECES = TIER_TWO_CLASS_SETS.flatMap((classSet, classIndex) =>
  Object.entries(classSet.pieces).map(([pieceSlot, [wowheadId, name]], slotIndex) => ({
    internalId: 402000 + classIndex * 10 + slotIndex,
    wowheadId,
    name,
    quality: 4,
    type: classSet.type,
    minLevel: 60,
    itemLevel: 76,
    iconCode: getSlotIcon(pieceSlot, classSet.type),
    allowedClasses: [classSet.className],
    setId: classSet.setId,
    setName: classSet.setName,
    stats: { ...classSet.stats },
    ...SLOT_SOURCE[pieceSlot],
  })),
);

const EXTRA_BLACKWING_DROPS = Object.freeze([
  {
    internalId: 402101,
    name: "The Untamed Blade",
    slot: "mainHand",
    quality: 4,
    type: "Generic",
    minLevel: 60,
    itemLevel: 76,
    iconCode: "inv_sword_50",
    sourceBosses: [BOSS.RAZORGORE],
    allowedClasses: ["Warrior", "Paladin"],
    stats: { strength: 30, stamina: 18 },
  },
  {
    internalId: 402102,
    name: "Maladath, Runed Blade of the Black Flight",
    slot: "mainHand",
    quality: 4,
    type: "Generic",
    minLevel: 60,
    itemLevel: 76,
    iconCode: "inv_sword_49",
    sourceBosses: [BOSS.BROODLORD],
    allowedClasses: ["Warrior", "Rogue", "Hunter"],
    stats: { agility: 28, stamina: 14 },
  },
  {
    internalId: 402103,
    name: "Chromatically Tempered Sword",
    slot: "mainHand",
    quality: 4,
    type: "Generic",
    minLevel: 60,
    itemLevel: 76,
    iconCode: "inv_sword_53",
    sourceBosses: [BOSS.CHROMAGGUS],
    allowedClasses: ["Warrior", "Rogue", "Paladin"],
    stats: { agility: 24, strength: 12, stamina: 16 },
  },
  {
    internalId: 402104,
    name: "Ashkandi, Greatsword of the Brotherhood",
    slot: "mainHand",
    quality: 4,
    type: "Generic",
    minLevel: 60,
    itemLevel: 76,
    iconCode: "inv_sword_50",
    sourceBosses: [BOSS.NEFARIAN],
    allowedClasses: ["Warrior", "Paladin", "Hunter"],
    stats: { strength: 34, stamina: 24 },
  },
  {
    internalId: 402105,
    name: "Mish'undare, Circlet of the Mind Flayer",
    slot: "head",
    quality: 4,
    type: "Cloth",
    minLevel: 60,
    itemLevel: 76,
    iconCode: "inv_crown_01",
    sourceBosses: [BOSS.NEFARIAN],
    allowedClasses: ["Mage", "Warlock", "Priest"],
    stats: { intellect: 28, spirit: 12, stamina: 18 },
  },
]);

export const BLACKWING_LAIR_ACTIVE_LOOT_MANIFEST = Object.freeze([
  ...TIER_TWO_PIECES.filter((entry) => entry.slot),
  ...EXTRA_BLACKWING_DROPS,
]);

export const unsupportedBlackwingLairDrops = Object.freeze(
  TIER_TWO_PIECES.filter((entry) => entry.unsupportedSlot),
);

export const convertBlackwingLairManifestEntry = (entry) => ({
  id: entry.internalId,
  wowheadId: entry.wowheadId,
  name: entry.name,
  slot: entry.slot,
  quality: entry.quality,
  type: entry.type,
  minLevel: entry.minLevel,
  itemLevel: entry.itemLevel,
  dungeonSetId: BLACKWING_LAIR_SET_ID,
  dungeonSetName: BLACKWING_LAIR_SET_NAME,
  icon: wowItemIcon(entry.iconCode),
  sourceBosses: Array.isArray(entry.sourceBosses) ? [...entry.sourceBosses] : [],
  allowedClasses: Array.isArray(entry.allowedClasses)
    ? [...entry.allowedClasses]
    : undefined,
  setId: entry.setId,
  setName: entry.setName,
  stats: entry.stats ? { ...entry.stats } : undefined,
});

export const BLACKWING_LAIR_ITEMS = Object.freeze(
  BLACKWING_LAIR_ACTIVE_LOOT_MANIFEST.map(convertBlackwingLairManifestEntry),
);
