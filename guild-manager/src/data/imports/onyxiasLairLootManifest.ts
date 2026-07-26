import type { LootManifestEntry } from "../../types/itemTypes";

const ONYXIAS_LAIR_SET_ID = "onyxias_lair";
const ONYXIAS_LAIR_SET_NAME = "Onyxia's Lair";

const wowItemIcon = (iconCode: string) =>
  `https://wow.zamimg.com/images/wow/icons/large/${String(iconCode || "inv_misc_questionmark").toLowerCase()}.jpg`;

const BOSS = Object.freeze({
  ONYXIA: "Onyxia",
});

const TIER_TWO_HELMS = Object.freeze([
  {
    internalId: 401001,
    wowheadId: 16900,
    name: "Stormrage Cover",
    type: "Leather",
    allowedClasses: ["Druid"],
    setId: "t2_stormrage_raiment",
    setName: "Stormrage Raiment",
    iconCode: "inv_helmet_09",
    stats: { intellect: 24, spirit: 16, stamina: 20 },
  },
  {
    internalId: 401002,
    wowheadId: 16939,
    name: "Dragonstalker's Helm",
    type: "Mail",
    allowedClasses: ["Hunter"],
    setId: "t2_dragonstalker_armor",
    setName: "Dragonstalker Armor",
    iconCode: "inv_helmet_05",
    stats: { agility: 24, stamina: 20, intellect: 12 },
  },
  {
    internalId: 401003,
    wowheadId: 16914,
    name: "Netherwind Crown",
    type: "Cloth",
    allowedClasses: ["Mage"],
    setId: "t2_netherwind_regalia",
    setName: "Netherwind Regalia",
    iconCode: "inv_crown_01",
    stats: { intellect: 26, spirit: 14, stamina: 18 },
  },
  {
    internalId: 401004,
    wowheadId: 16955,
    name: "Judgement Crown",
    type: "Plate",
    allowedClasses: ["Paladin"],
    setId: "t2_judgment_armor",
    setName: "Judgement Armor",
    iconCode: "inv_helmet_74",
    stats: { strength: 18, intellect: 20, stamina: 20 },
  },
  {
    internalId: 401005,
    wowheadId: 16921,
    name: "Halo of Transcendence",
    type: "Cloth",
    allowedClasses: ["Priest"],
    setId: "t2_vestments_of_transcendence",
    setName: "Vestments of Transcendence",
    iconCode: "inv_crown_01",
    stats: { intellect: 25, spirit: 18, stamina: 17 },
  },
  {
    internalId: 401006,
    wowheadId: 16908,
    name: "Bloodfang Hood",
    type: "Leather",
    allowedClasses: ["Rogue"],
    setId: "t2_bloodfang_armor",
    setName: "Bloodfang Armor",
    iconCode: "inv_helmet_41",
    stats: { agility: 26, stamina: 18, strength: 8 },
  },
  {
    internalId: 401007,
    wowheadId: 16947,
    name: "Helmet of Ten Storms",
    type: "Mail",
    allowedClasses: ["Shaman"],
    setId: "t2_the_ten_storms",
    setName: "The Ten Storms",
    iconCode: "inv_helmet_69",
    stats: { intellect: 22, spirit: 16, stamina: 20 },
  },
  {
    internalId: 401008,
    wowheadId: 16929,
    name: "Nemesis Skullcap",
    type: "Cloth",
    allowedClasses: ["Warlock"],
    setId: "t2_nemesis_raiment",
    setName: "Nemesis Raiment",
    iconCode: "inv_helmet_08",
    stats: { intellect: 25, stamina: 22, spirit: 10 },
  },
  {
    internalId: 401009,
    wowheadId: 16963,
    name: "Helm of Wrath",
    type: "Plate",
    allowedClasses: ["Warrior"],
    setId: "t2_battlegear_of_wrath",
    setName: "Battlegear of Wrath",
    iconCode: "inv_helmet_09",
    stats: { strength: 24, stamina: 24 },
  },
]);

const EXTRA_ONYXIA_DROPS = Object.freeze([
  {
    internalId: 401101,
    wowheadId: 17068,
    name: "Deathbringer",
    slot: "mainHand",
    quality: 4,
    type: "Generic",
    minLevel: 60,
    iconCode: "inv_axe_15",
    sourceBosses: [BOSS.ONYXIA],
    allowedClasses: ["Warrior", "Paladin", "Shaman", "Rogue", "Hunter"],
    stats: { strength: 26, stamina: 14 },
  },
  {
    internalId: 401102,
    wowheadId: 17075,
    name: "Vis'kag the Bloodletter",
    slot: "mainHand",
    quality: 4,
    type: "Generic",
    minLevel: 60,
    iconCode: "inv_sword_18",
    sourceBosses: [BOSS.ONYXIA],
    allowedClasses: ["Warrior", "Paladin", "Rogue", "Hunter"],
    stats: { agility: 24, stamina: 14 },
  },
  {
    internalId: 401103,
    wowheadId: 17067,
    name: "Ancient Cornerstone Grimoire",
    unsupportedSlot: "offHand",
    sourceBosses: [BOSS.ONYXIA],
  },
  {
    internalId: 401104,
    wowheadId: 17064,
    name: "Shard of the Scale",
    slot: "trinket",
    quality: 4,
    type: "Generic",
    minLevel: 60,
    iconCode: "inv_misc_monsterscales_15",
    sourceBosses: [BOSS.ONYXIA],
    allowedClasses: ["Priest", "Druid", "Shaman", "Paladin"],
    stats: { intellect: 20, spirit: 22, stamina: 10 },
  },
  {
    internalId: 401106,
    wowheadId: 18205,
    name: "Eskhandar's Collar",
    slot: "neck",
    quality: 4,
    type: "Generic",
    minLevel: 60,
    iconCode: "inv_jewelry_necklace_07",
    sourceBosses: [BOSS.ONYXIA],
    allowedClasses: ["Rogue", "Hunter", "Warrior", "Paladin", "Druid"],
    stats: { agility: 22, stamina: 14, strength: 8 },
  },
  {
    internalId: 401107,
    wowheadId: 17078,
    name: "Sapphiron Drape",
    slot: "back",
    quality: 4,
    type: "Generic",
    minLevel: 60,
    iconCode: "inv_misc_cape_17",
    sourceBosses: [BOSS.ONYXIA],
    stats: { stamina: 22, intellect: 8, strength: 8 },
  },
]);

export const ONYXIAS_LAIR_ACTIVE_LOOT_MANIFEST = Object.freeze([
  ...TIER_TWO_HELMS.map((entry) => ({
    ...entry,
    slot: "head",
    quality: 4,
    minLevel: 60,
    sourceBosses: [BOSS.ONYXIA],
    itemLevel: 76,
  })),
  ...EXTRA_ONYXIA_DROPS
    .filter((entry) => entry.slot)
    .map((entry) => ({ ...entry, itemLevel: 76 })),
]);

export const unsupportedOnyxiasLairDrops = Object.freeze(
  EXTRA_ONYXIA_DROPS.filter((entry) => entry.unsupportedSlot),
);

export const convertOnyxiasLairManifestEntry = (
  entry: LootManifestEntry,
) => ({
  id: entry.internalId as number,
  wowheadId: entry.wowheadId,
  name: entry.name,
  slot: entry.slot,
  quality: entry.quality,
  type: entry.type,
  minLevel: entry.minLevel,
  itemLevel: entry.itemLevel,
  dungeonSetId: ONYXIAS_LAIR_SET_ID,
  dungeonSetName: ONYXIAS_LAIR_SET_NAME,
  icon: wowItemIcon(entry.iconCode || "inv_misc_questionmark"),
  sourceBosses: Array.isArray(entry.sourceBosses) ? [...entry.sourceBosses] : [],
  allowedClasses: Array.isArray(entry.allowedClasses)
    ? [...entry.allowedClasses]
    : undefined,
  setId: entry.setId,
  setName: entry.setName,
  stats: entry.stats ? { ...entry.stats } : undefined,
});

export const ONYXIAS_LAIR_ITEMS = Object.freeze(
  ONYXIAS_LAIR_ACTIVE_LOOT_MANIFEST.map(convertOnyxiasLairManifestEntry),
);
