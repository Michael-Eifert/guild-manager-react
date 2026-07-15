const DIRE_MAUL_SET_ID = "dire_maul";
const DIRE_MAUL_SET_NAME = "Dire Maul";

const wowItemIcon = (iconCode) =>
  `https://wow.zamimg.com/images/wow/icons/large/${String(iconCode || "inv_misc_questionmark").toLowerCase()}.jpg`;

export const DIRE_MAUL_BOSSES = Object.freeze({
  PUSILLIN: "Pusillin",
  LETHTENDRIS: "Lethtendris",
  HYDROSPAWN: "Hydrospawn",
  ZEVRIM: "Zevrim Thornhoof",
  ALZZIN: "Alzzin the Wildshaper",
  TENDRIS: "Tendris Warpwood",
  KALENDRIS: "Magister Kalendris",
  ILLYANNA: "Illyanna Ravenoak",
  IMMOLTHAR: "Immol'thar",
  TORTHELDRIN: "Prince Tortheldrin",
  MOLDAR: "Guard Mol'dar",
  KREEG: "Stomper Kreeg",
  FENGUS: "Guard Fengus",
  SLIPKIK: "Guard Slip'kik",
  KROMCRUSH: "Captain Kromcrush",
  KING: "King Gordok & Cho'Rush the Observer",
});

// Active equipment from the notable/boss loot tables in the three Wowhead guides.
// Stats use the game's compact stat model while names, wings, and boss sources mirror Classic.
export const DIRE_MAUL_ACTIVE_LOOT_MANIFEST = Object.freeze([
  // Dire Maul East
  [18317, "Tempest Talisman", "neck", "Generic", 56, "inv_jewelry_necklace_05", "East", DIRE_MAUL_BOSSES.HYDROSPAWN, { intellect: 12, spirit: 8, stamina: 7 }],
  [18322, "Waterspout Boots", "feet", "Mail", 56, "inv_boots_chain_05", "East", DIRE_MAUL_BOSSES.HYDROSPAWN, { agility: 12, stamina: 10 }],
  [18313, "Helm of Awareness", "head", "Plate", 56, "inv_helmet_19", "East", DIRE_MAUL_BOSSES.ZEVRIM, { strength: 13, stamina: 11 }],
  [18323, "Satyr's Bow", "mainHand", "Generic", 55, "inv_weapon_bow_08", "East", DIRE_MAUL_BOSSES.ZEVRIM, { agility: 14, stamina: 8 }],
  [18308, "Clever Hat", "head", "Leather", 55, "inv_helmet_31", "East", DIRE_MAUL_BOSSES.ZEVRIM, { agility: 12, intellect: 8, stamina: 8 }],
  [18312, "Energized Chestplate", "chest", "Plate", 57, "inv_chest_plate16", "East", DIRE_MAUL_BOSSES.ALZZIN, { strength: 14, stamina: 12 }],
  [18310, "Fiendish Machete", "mainHand", "Generic", 56, "inv_sword_30", "East", DIRE_MAUL_BOSSES.ALZZIN, { strength: 14, stamina: 9 }],
  [18309, "Gloves of Restoration", "hands", "Leather", 56, "inv_gauntlets_23", "East", DIRE_MAUL_BOSSES.ALZZIN, { intellect: 11, spirit: 11, stamina: 8 }],
  [18328, "Shadewood Cloak", "back", "Generic", 56, "inv_misc_cape_17", "East", DIRE_MAUL_BOSSES.ALZZIN, { agility: 10, stamina: 9 }],
  [18327, "Whipvine Cord", "belt", "Cloth", 57, "inv_belt_17", "East", DIRE_MAUL_BOSSES.ALZZIN, { intellect: 12, spirit: 10, stamina: 8 }],

  // Dire Maul West
  [18393, "Warpwood Binding", "belt", "Mail", 56, "inv_belt_18", "West", DIRE_MAUL_BOSSES.TENDRIS, { strength: 12, stamina: 10 }],
  [18371, "Mindtap Talisman", "trinket", "Generic", 58, "inv_jewelry_talisman_05", "West", DIRE_MAUL_BOSSES.KALENDRIS, { intellect: 13, spirit: 9 }],
  [18350, "Amplifying Cloak", "back", "Generic", 58, "inv_misc_cape_18", "West", DIRE_MAUL_BOSSES.KALENDRIS, { intellect: 11, stamina: 9 }],
  [18383, "Force Imbued Gauntlets", "hands", "Plate", 58, "inv_gauntlets_09", "West", DIRE_MAUL_BOSSES.ILLYANNA, { strength: 14, stamina: 11 }],
  [18386, "Padre's Trousers", "legs", "Cloth", 58, "inv_pants_09", "West", DIRE_MAUL_BOSSES.ILLYANNA, { intellect: 14, spirit: 12, stamina: 9 }],
  [18370, "Vigilance Charm", "trinket", "Generic", 58, "inv_jewelry_talisman_08", "West", DIRE_MAUL_BOSSES.IMMOLTHAR, { stamina: 13, spirit: 7 }],
  [18381, "Evil Eye Pendant", "neck", "Generic", 58, "inv_jewelry_necklace_07", "West", DIRE_MAUL_BOSSES.IMMOLTHAR, { intellect: 12, stamina: 9 }],
  [18384, "Bile-Etched Spaulders", "shoulder", "Plate", 58, "inv_shoulder_04", "West", DIRE_MAUL_BOSSES.IMMOLTHAR, { strength: 14, stamina: 12 }],
  [18389, "Cloak of the Cosmos", "back", "Generic", 58, "inv_misc_cape_18", "West", DIRE_MAUL_BOSSES.IMMOLTHAR, { intellect: 12, spirit: 8, stamina: 8 }],
  [18385, "Robe of Everlasting Night", "chest", "Cloth", 58, "inv_chest_cloth_51", "West", DIRE_MAUL_BOSSES.IMMOLTHAR, { intellect: 15, spirit: 12, stamina: 9 }],
  [18372, "Blade of the New Moon", "mainHand", "Generic", 58, "inv_weapon_shortblade_18", "West", DIRE_MAUL_BOSSES.IMMOLTHAR, { agility: 15, stamina: 9 }],
  [18377, "Bracers of the Eclipse", "wrist", "Leather", 58, "inv_bracer_05", "West", DIRE_MAUL_BOSSES.TORTHELDRIN, { agility: 13, stamina: 10 }],
  [18380, "Eldritch Reinforced Legplates", "legs", "Plate", 58, "inv_pants_04", "West", DIRE_MAUL_BOSSES.TORTHELDRIN, { strength: 15, stamina: 13 }],
  [18376, "Timeworn Mace", "mainHand", "Generic", 58, "inv_mace_07", "West", DIRE_MAUL_BOSSES.TORTHELDRIN, { strength: 15, stamina: 10 }],

  // Dire Maul North, including the notable Gordok Tribute rewards on the final step.
  [18493, "Bulky Iron Spaulders", "shoulder", "Plate", 58, "inv_shoulder_11", "North", DIRE_MAUL_BOSSES.MOLDAR, { strength: 14, stamina: 12 }],
  [18498, "Hedgecutter", "mainHand", "Generic", 58, "inv_axe_18", "North", DIRE_MAUL_BOSSES.MOLDAR, { strength: 15, stamina: 10 }],
  [18497, "Sublime Wristguards", "wrist", "Cloth", 58, "inv_bracer_13", "North", DIRE_MAUL_BOSSES.MOLDAR, { intellect: 12, spirit: 10, stamina: 8 }],
  [18503, "Kromcrush's Chestplate", "chest", "Plate", 58, "inv_chest_plate16", "North", DIRE_MAUL_BOSSES.KROMCRUSH, { strength: 15, stamina: 13 }],
  [18505, "Mugger's Belt", "belt", "Leather", 58, "inv_belt_02", "North", DIRE_MAUL_BOSSES.KROMCRUSH, { agility: 14, stamina: 10 }],
  [18507, "Boots of the Full Moon", "feet", "Leather", 58, "inv_boots_05", "North", DIRE_MAUL_BOSSES.KROMCRUSH, { intellect: 13, spirit: 10, stamina: 9 }],
  [18490, "Insightful Hood", "head", "Leather", 58, "inv_helmet_41", "North", DIRE_MAUL_BOSSES.KING, { intellect: 13, spirit: 11, stamina: 9 }],
  [18525, "Bracers of Prosperity", "wrist", "Leather", 58, "inv_bracer_12", "North", DIRE_MAUL_BOSSES.KING, { agility: 13, stamina: 10 }],
  [18527, "Harmonious Gauntlets", "hands", "Mail", 58, "inv_gauntlets_10", "North", DIRE_MAUL_BOSSES.KING, { intellect: 12, spirit: 10, stamina: 9 }],
  [18520, "Barbarous Blade", "mainHand", "Generic", 58, "inv_sword_11", "North", DIRE_MAUL_BOSSES.KING, { strength: 16, stamina: 10 }],
  [18523, "Brightly Glowing Stone", "trinket", "Generic", 58, "inv_misc_gem_pearl_06", "North", DIRE_MAUL_BOSSES.KING, { intellect: 13, spirit: 9 }],
  [18500, "Tarnished Elven Ring", "ring", "Generic", 58, "inv_jewelry_ring_13", "North", DIRE_MAUL_BOSSES.KING, { agility: 11, stamina: 9 }],
  [18475, "Oddly Magical Belt", "belt", "Cloth", 58, "inv_belt_17", "North", DIRE_MAUL_BOSSES.KING, { intellect: 13, spirit: 10, stamina: 8 }],
  [18495, "Redoubt Cloak", "back", "Generic", 58, "inv_misc_cape_21", "North", DIRE_MAUL_BOSSES.KING, { stamina: 13, strength: 6 }],
  [18499, "Barrier Shield", "mainHand", "Generic", 58, "inv_shield_10", "North", DIRE_MAUL_BOSSES.KING, { stamina: 14, strength: 7 }],
  [18531, "Unyielding Maul", "mainHand", "Generic", 58, "inv_hammer_22", "North", DIRE_MAUL_BOSSES.KING, { strength: 16, stamina: 11 }],
  [18534, "Rod of the Ogre Magi", "mainHand", "Generic", 58, "inv_staff_32", "North", DIRE_MAUL_BOSSES.KING, { intellect: 15, spirit: 12, stamina: 9 }],
  [18537, "Counterattack Lodestone", "trinket", "Generic", 58, "inv_stone_15", "North", DIRE_MAUL_BOSSES.KING, { agility: 12, stamina: 10 }],
  [18538, "Treant's Bane", "mainHand", "Generic", 58, "inv_axe_17", "North", DIRE_MAUL_BOSSES.KING, { strength: 17, stamina: 10 }],
]);

export const convertDireMaulManifestEntry = (entry) => {
  const [wowheadId, name, slot, type, minLevel, iconCode, dungeonWing, sourceBoss, stats] = entry;
  return {
    id: wowheadId,
    wowheadId,
    name,
    slot,
    quality: 3,
    type,
    minLevel,
    dungeonSetId: DIRE_MAUL_SET_ID,
    dungeonSetName: DIRE_MAUL_SET_NAME,
    dungeonWing,
    sourceBosses: [sourceBoss],
    icon: wowItemIcon(iconCode),
    stats: { ...stats },
  };
};

export const DIRE_MAUL_ITEMS = Object.freeze(
  DIRE_MAUL_ACTIVE_LOOT_MANIFEST.map(convertDireMaulManifestEntry),
);
