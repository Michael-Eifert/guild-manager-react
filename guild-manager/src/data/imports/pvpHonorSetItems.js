import { GUILD_FACTION } from "../../constants";

export const PVP_HONOR_SET_ID = "pvp_honor_sets";
export const PVP_HONOR_SET_NAME = "PvP Honor Sets";

const wowItemIcon = (iconCode) =>
  `https://wow.zamimg.com/images/wow/icons/large/${String(iconCode || "inv_misc_questionmark").toLowerCase()}.jpg`;

const PVP_HONOR_QUALITY = Object.freeze({
  RARE: "rare",
  EPIC: "epic",
});

const PVP_HONOR_ITEM_LEVEL = Object.freeze({
  [PVP_HONOR_QUALITY.RARE]: 68,
  [PVP_HONOR_QUALITY.EPIC]: 74,
});

const PVP_HONOR_ITEM_QUALITY = Object.freeze({
  [PVP_HONOR_QUALITY.RARE]: 3,
  [PVP_HONOR_QUALITY.EPIC]: 4,
});

const PVP_HONOR_SLOT_ORDER = Object.freeze([
  "head",
  "shoulder",
  "chest",
  "legs",
  "feet",
  "hands",
]);

const PVP_HONOR_RANK_BY_SLOT = Object.freeze({
  feet: 7,
  hands: 7,
  chest: 8,
  legs: 8,
  head: 10,
  shoulder: 10,
});

const EPIC_RANK_BY_SLOT = Object.freeze({
  feet: 12,
  hands: 12,
  legs: 12,
  head: 13,
  chest: 13,
  shoulder: 13,
});

const ICON_BY_ARMOR_AND_SLOT = Object.freeze({
  Cloth: {
    head: "inv_helmet_30",
    shoulder: "inv_shoulder_02",
    chest: "inv_chest_cloth_10",
    legs: "inv_pants_11",
    feet: "inv_boots_07",
    hands: "inv_gauntlets_05",
  },
  Leather: {
    head: "inv_helmet_08",
    shoulder: "inv_shoulder_07",
    chest: "inv_chest_leather_04",
    legs: "inv_pants_02",
    feet: "inv_boots_05",
    hands: "inv_gauntlets_04",
  },
  Mail: {
    head: "inv_helmet_03",
    shoulder: "inv_shoulder_14",
    chest: "inv_chest_chain_05",
    legs: "inv_pants_03",
    feet: "inv_boots_09",
    hands: "inv_gauntlets_10",
  },
  Plate: {
    head: "inv_helmet_03",
    shoulder: "inv_shoulder_14",
    chest: "inv_chest_plate03",
    legs: "inv_pants_plate_05",
    feet: "inv_boots_plate_03",
    hands: "inv_gauntlets_10",
  },
});

const PVP_ITEM_METADATA_BY_NAME = Object.freeze({
  "Marshal's Silk Footwraps": {
    "id": 16437,
    "icon": "inv_boots_cloth_03"
  },
  "Marshal's Silk Gloves": {
    "id": 16440,
    "icon": "inv_gauntlets_14"
  },
  "Field Marshal's Coronet": {
    "id": 16441,
    "icon": "inv_helmet_24"
  },
  "Marshal's Silk Leggings": {
    "id": 16442,
    "icon": "inv_pants_08"
  },
  "Field Marshal's Silk Vestments": {
    "id": 16443,
    "icon": "inv_chest_cloth_12"
  },
  "Field Marshal's Silk Spaulders": {
    "id": 16444,
    "icon": "inv_shoulder_23"
  },
  "Marshal's Leather Footguards": {
    "id": 16446,
    "icon": "inv_boots_08"
  },
  "Marshal's Dragonhide Gauntlets": {
    "id": 16448,
    "icon": "inv_gauntlets_21"
  },
  "Field Marshal's Dragonhide Spaulders": {
    "id": 16449,
    "icon": "inv_shoulder_23"
  },
  "Marshal's Dragonhide Legguards": {
    "id": 16450,
    "icon": "inv_pants_06"
  },
  "Field Marshal's Dragonhide Helmet": {
    "id": 16451,
    "icon": "inv_helmet_41"
  },
  "Field Marshal's Dragonhide Breastplate": {
    "id": 16452,
    "icon": "inv_chest_cloth_07"
  },
  "Field Marshal's Leather Chestpiece": {
    "id": 16453,
    "icon": "inv_chest_cloth_07"
  },
  "Marshal's Leather Handgrips": {
    "id": 16454,
    "icon": "inv_gauntlets_21"
  },
  "Field Marshal's Leather Mask": {
    "id": 16455,
    "icon": "inv_helmet_41"
  },
  "Marshal's Leather Leggings": {
    "id": 16456,
    "icon": "inv_pants_06"
  },
  "Field Marshal's Leather Epaulets": {
    "id": 16457,
    "icon": "inv_shoulder_23"
  },
  "Marshal's Dragonhide Boots": {
    "id": 16459,
    "icon": "inv_boots_08"
  },
  "Marshal's Chain Boots": {
    "id": 16462,
    "icon": "inv_boots_plate_07"
  },
  "Marshal's Chain Grips": {
    "id": 16463,
    "icon": "inv_gauntlets_10"
  },
  "Field Marshal's Chain Helm": {
    "id": 16465,
    "icon": "inv_helmet_05"
  },
  "Field Marshal's Chain Breastplate": {
    "id": 16466,
    "icon": "inv_chest_chain_03"
  },
  "Marshal's Chain Legguards": {
    "id": 16467,
    "icon": "inv_pants_mail_17"
  },
  "Field Marshal's Chain Spaulders": {
    "id": 16468,
    "icon": "inv_shoulder_10"
  },
  "Marshal's Lamellar Gloves": {
    "id": 16471,
    "icon": "inv_gauntlets_29"
  },
  "Marshal's Lamellar Boots": {
    "id": 16472,
    "icon": "inv_boots_plate_09"
  },
  "Field Marshal's Lamellar Chestplate": {
    "id": 16473,
    "icon": "inv_chest_plate03"
  },
  "Field Marshal's Lamellar Faceguard": {
    "id": 16474,
    "icon": "inv_helmet_05"
  },
  "Marshal's Lamellar Legplates": {
    "id": 16475,
    "icon": "inv_pants_04"
  },
  "Field Marshal's Lamellar Pauldrons": {
    "id": 16476,
    "icon": "inv_shoulder_20"
  },
  "Field Marshal's Plate Armor": {
    "id": 16477,
    "icon": "inv_chest_plate03"
  },
  "Field Marshal's Plate Helm": {
    "id": 16478,
    "icon": "inv_helmet_05"
  },
  "Marshal's Plate Legguards": {
    "id": 16479,
    "icon": "inv_pants_04"
  },
  "Field Marshal's Plate Shoulderguards": {
    "id": 16480,
    "icon": "inv_shoulder_20"
  },
  "Marshal's Plate Boots": {
    "id": 16483,
    "icon": "inv_boots_plate_09"
  },
  "Marshal's Plate Gauntlets": {
    "id": 16484,
    "icon": "inv_gauntlets_29"
  },
  "Warlord's Silk Cowl": {
    "id": 16533,
    "icon": "inv_helmet_08"
  },
  "General's Silk Trousers": {
    "id": 16534,
    "icon": "inv_pants_07"
  },
  "Warlord's Silk Raiment": {
    "id": 16535,
    "icon": "inv_chest_leather_01"
  },
  "Warlord's Silk Amice": {
    "id": 16536,
    "icon": "inv_shoulder_19"
  },
  "General's Silk Boots": {
    "id": 16539,
    "icon": "inv_boots_05"
  },
  "General's Silk Handguards": {
    "id": 16540,
    "icon": "inv_gauntlets_19"
  },
  "Warlord's Plate Armor": {
    "id": 16541,
    "icon": "inv_chest_plate16"
  },
  "Warlord's Plate Headpiece": {
    "id": 16542,
    "icon": "inv_helmet_09"
  },
  "General's Plate Leggings": {
    "id": 16543,
    "icon": "inv_pants_04"
  },
  "Warlord's Plate Shoulders": {
    "id": 16544,
    "icon": "inv_shoulder_11"
  },
  "General's Plate Boots": {
    "id": 16545,
    "icon": "inv_boots_plate_04"
  },
  "General's Plate Gauntlets": {
    "id": 16548,
    "icon": "inv_gauntlets_10"
  },
  "Warlord's Dragonhide Hauberk": {
    "id": 16549,
    "icon": "inv_chest_chain_16"
  },
  "Warlord's Dragonhide Helmet": {
    "id": 16550,
    "icon": "inv_helmet_09"
  },
  "Warlord's Dragonhide Epaulets": {
    "id": 16551,
    "icon": "inv_shoulder_07"
  },
  "General's Dragonhide Leggings": {
    "id": 16552,
    "icon": "inv_pants_06"
  },
  "General's Dragonhide Boots": {
    "id": 16554,
    "icon": "inv_boots_08"
  },
  "General's Dragonhide Gloves": {
    "id": 16555,
    "icon": "inv_gauntlets_25"
  },
  "General's Leather Treads": {
    "id": 16558,
    "icon": "inv_boots_08"
  },
  "General's Leather Mitts": {
    "id": 16560,
    "icon": "inv_gauntlets_25"
  },
  "Warlord's Leather Helm": {
    "id": 16561,
    "icon": "inv_helmet_09"
  },
  "Warlord's Leather Spaulders": {
    "id": 16562,
    "icon": "inv_shoulder_07"
  },
  "Warlord's Leather Breastplate": {
    "id": 16563,
    "icon": "inv_chest_chain_16"
  },
  "General's Leather Legguards": {
    "id": 16564,
    "icon": "inv_pants_06"
  },
  "Warlord's Chain Chestpiece": {
    "id": 16565,
    "icon": "inv_chest_chain_11"
  },
  "Warlord's Chain Helmet": {
    "id": 16566,
    "icon": "inv_helmet_09"
  },
  "General's Chain Legguards": {
    "id": 16567,
    "icon": "inv_pants_mail_16"
  },
  "Warlord's Chain Shoulders": {
    "id": 16568,
    "icon": "inv_shoulder_29"
  },
  "General's Chain Sabatons": {
    "id": 16569,
    "icon": "inv_boots_plate_06"
  },
  "General's Chain Gloves": {
    "id": 16571,
    "icon": "inv_gauntlets_11"
  },
  "General's Mail Boots": {
    "id": 16573,
    "icon": "inv_boots_plate_06"
  },
  "General's Mail Gauntlets": {
    "id": 16574,
    "icon": "inv_gauntlets_11"
  },
  "Warlord's Mail Armor": {
    "id": 16577,
    "icon": "inv_chest_chain_11"
  },
  "Warlord's Mail Helm": {
    "id": 16578,
    "icon": "inv_helmet_09"
  },
  "General's Mail Leggings": {
    "id": 16579,
    "icon": "inv_pants_mail_15"
  },
  "Warlord's Mail Spaulders": {
    "id": 16580,
    "icon": "inv_shoulder_29"
  },
  "Field Marshal's Coronal": {
    "id": 17578,
    "icon": "inv_helmet_24"
  },
  "Marshal's Dreadweave Leggings": {
    "id": 17579,
    "icon": "inv_pants_cloth_09"
  },
  "Field Marshal's Dreadweave Shoulders": {
    "id": 17580,
    "icon": "inv_shoulder_02"
  },
  "Field Marshal's Dreadweave Robe": {
    "id": 17581,
    "icon": "inv_chest_cloth_09"
  },
  "Marshal's Dreadweave Boots": {
    "id": 17583,
    "icon": "inv_boots_07"
  },
  "Marshal's Dreadweave Gloves": {
    "id": 17584,
    "icon": "inv_gauntlets_14"
  },
  "General's Dreadweave Boots": {
    "id": 17586,
    "icon": "inv_boots_05"
  },
  "General's Dreadweave Gloves": {
    "id": 17588,
    "icon": "inv_gauntlets_19"
  },
  "Warlord's Dreadweave Mantle": {
    "id": 17590,
    "icon": "inv_shoulder_19"
  },
  "Warlord's Dreadweave Hood": {
    "id": 17591,
    "icon": "inv_helmet_08"
  },
  "Warlord's Dreadweave Robe": {
    "id": 17592,
    "icon": "inv_chest_leather_01"
  },
  "General's Dreadweave Pants": {
    "id": 17593,
    "icon": "inv_pants_07"
  },
  "Field Marshal's Headdress": {
    "id": 17602,
    "icon": "inv_helmet_24"
  },
  "Marshal's Satin Pants": {
    "id": 17603,
    "icon": "inv_pants_06"
  },
  "Field Marshal's Satin Mantle": {
    "id": 17604,
    "icon": "inv_shoulder_02"
  },
  "Field Marshal's Satin Vestments": {
    "id": 17605,
    "icon": "inv_chest_cloth_02"
  },
  "Marshal's Satin Sandals": {
    "id": 17607,
    "icon": "inv_boots_07"
  },
  "Marshal's Satin Gloves": {
    "id": 17608,
    "icon": "inv_gauntlets_14"
  },
  "General's Satin Boots": {
    "id": 17618,
    "icon": "inv_boots_05"
  },
  "General's Satin Gloves": {
    "id": 17620,
    "icon": "inv_gauntlets_27"
  },
  "Warlord's Satin Mantle": {
    "id": 17622,
    "icon": "inv_shoulder_19"
  },
  "Warlord's Satin Cowl": {
    "id": 17623,
    "icon": "inv_helmet_08"
  },
  "Warlord's Satin Robes": {
    "id": 17624,
    "icon": "inv_chest_leather_01"
  },
  "General's Satin Leggings": {
    "id": 17625,
    "icon": "inv_pants_07"
  },
  "Blood Guard's Chain Greaves": {
    "id": 22843,
    "icon": "inv_boots_05"
  },
  "Blood Guard's Dragonhide Treads": {
    "id": 22852,
    "icon": "inv_boots_08"
  },
  "Blood Guard's Dreadweave Walkers": {
    "id": 22855,
    "icon": "inv_boots_05"
  },
  "Blood Guard's Leather Walkers": {
    "id": 22856,
    "icon": "inv_boots_05"
  },
  "Blood Guard's Mail Greaves": {
    "id": 22857,
    "icon": "inv_boots_07"
  },
  "Blood Guard's Plate Greaves": {
    "id": 22858,
    "icon": "inv_boots_plate_09"
  },
  "Blood Guard's Satin Walkers": {
    "id": 22859,
    "icon": "inv_boots_05"
  },
  "Blood Guard's Silk Walkers": {
    "id": 22860,
    "icon": "inv_boots_05"
  },
  "Blood Guard's Chain Vices": {
    "id": 22862,
    "icon": "inv_gauntlets_17"
  },
  "Blood Guard's Dragonhide Grips": {
    "id": 22863,
    "icon": "inv_gauntlets_25"
  },
  "Blood Guard's Leather Grips": {
    "id": 22864,
    "icon": "inv_gauntlets_15"
  },
  "Blood Guard's Dreadweave Handwraps": {
    "id": 22865,
    "icon": "inv_gauntlets_19"
  },
  "Blood Guard's Mail Vices": {
    "id": 22867,
    "icon": "inv_gauntlets_11"
  },
  "Blood Guard's Plate Gauntlets": {
    "id": 22868,
    "icon": "inv_gauntlets_26"
  },
  "Blood Guard's Satin Handwraps": {
    "id": 22869,
    "icon": "inv_gauntlets_17"
  },
  "Blood Guard's Silk Handwraps": {
    "id": 22870,
    "icon": "inv_gauntlets_06"
  },
  "Legionnaire's Plate Hauberk": {
    "id": 22872,
    "icon": "inv_chest_plate16"
  },
  "Legionnaire's Plate Leggings": {
    "id": 22873,
    "icon": "inv_pants_06"
  },
  "Legionnaire's Chain Hauberk": {
    "id": 22874,
    "icon": "inv_chest_chain_04"
  },
  "Legionnaire's Chain Legguards": {
    "id": 22875,
    "icon": "inv_pants_03"
  },
  "Legionnaire's Mail Hauberk": {
    "id": 22876,
    "icon": "inv_chest_chain_16"
  },
  "Legionnaire's Dragonhide Chestpiece": {
    "id": 22877,
    "icon": "inv_chest_leather_07"
  },
  "Legionnaire's Dragonhide Leggings": {
    "id": 22878,
    "icon": "inv_pants_06"
  },
  "Legionnaire's Leather Chestpiece": {
    "id": 22879,
    "icon": "inv_chest_leather_05"
  },
  "Legionnaire's Leather Legguards": {
    "id": 22880,
    "icon": "inv_pants_08"
  },
  "Legionnaire's Dreadweave Legguards": {
    "id": 22881,
    "icon": "inv_pants_06"
  },
  "Legionnaire's Satin Legguards": {
    "id": 22882,
    "icon": "inv_pants_11"
  },
  "Legionnaire's Silk Legguards": {
    "id": 22883,
    "icon": "inv_pants_11"
  },
  "Legionnaire's Dreadweave Tunic": {
    "id": 22884,
    "icon": "inv_chest_leather_01"
  },
  "Legionnaire's Satin Tunic": {
    "id": 22885,
    "icon": "inv_chest_leather_01"
  },
  "Legionnaire's Silk Tunic": {
    "id": 22886,
    "icon": "inv_chest_cloth_28"
  },
  "Legionnaire's Mail Legguards": {
    "id": 22887,
    "icon": "inv_pants_09"
  },
  "Champion's Plate Shoulders": {
    "id": 23243,
    "icon": "inv_shoulder_11"
  },
  "Champion's Plate Helm": {
    "id": 23244,
    "icon": "inv_helmet_09"
  },
  "Champion's Chain Helm": {
    "id": 23251,
    "icon": "inv_helmet_03"
  },
  "Champion's Chain Shoulders": {
    "id": 23252,
    "icon": "inv_shoulder_01"
  },
  "Champion's Dragonhide Headguard": {
    "id": 23253,
    "icon": "inv_helmet_09"
  },
  "Champion's Dragonhide Shoulders": {
    "id": 23254,
    "icon": "inv_shoulder_07"
  },
  "Champion's Dreadweave Cowl": {
    "id": 23255,
    "icon": "inv_helmet_08"
  },
  "Champion's Dreadweave Spaulders": {
    "id": 23256,
    "icon": "inv_shoulder_01"
  },
  "Champion's Leather Helm": {
    "id": 23257,
    "icon": "inv_helmet_09"
  },
  "Champion's Leather Shoulders": {
    "id": 23258,
    "icon": "inv_shoulder_14"
  },
  "Champion's Mail Headguard": {
    "id": 23259,
    "icon": "inv_helmet_09"
  },
  "Champion's Mail Pauldrons": {
    "id": 23260,
    "icon": "inv_shoulder_04"
  },
  "Champion's Satin Hood": {
    "id": 23261,
    "icon": "inv_helmet_17"
  },
  "Champion's Satin Mantle": {
    "id": 23262,
    "icon": "inv_shoulder_01"
  },
  "Champion's Silk Cowl": {
    "id": 23263,
    "icon": "inv_helmet_06"
  },
  "Champion's Silk Mantle": {
    "id": 23264,
    "icon": "inv_shoulder_02"
  },
  "Knight-Captain's Lamellar Breastplate": {
    "id": 23272,
    "icon": "inv_chest_plate03"
  },
  "Knight-Captain's Lamellar Leggings": {
    "id": 23273,
    "icon": "inv_pants_06"
  },
  "Knight-Lieutenant's Lamellar Gauntlets": {
    "id": 23274,
    "icon": "inv_gauntlets_29"
  },
  "Knight-Lieutenant's Lamellar Sabatons": {
    "id": 23275,
    "icon": "inv_boots_plate_03"
  },
  "Lieutenant Commander's Lamellar Headguard": {
    "id": 23276,
    "icon": "inv_helmet_05"
  },
  "Lieutenant Commander's Lamellar Shoulders": {
    "id": 23277,
    "icon": "inv_shoulder_28"
  },
  "Knight-Lieutenant's Chain Greaves": {
    "id": 23278,
    "icon": "inv_boots_05"
  },
  "Knight-Lieutenant's Chain Vices": {
    "id": 23279,
    "icon": "inv_gauntlets_17"
  },
  "Knight-Lieutenant's Dragonhide Grips": {
    "id": 23280,
    "icon": "inv_gauntlets_25"
  },
  "Knight-Lieutenant's Dragonhide Treads": {
    "id": 23281,
    "icon": "inv_boots_08"
  },
  "Knight-Lieutenant's Dreadweave Handwraps": {
    "id": 23282,
    "icon": "inv_gauntlets_19"
  },
  "Knight-Lieutenant's Dreadweave Walkers": {
    "id": 23283,
    "icon": "inv_boots_05"
  },
  "Knight-Lieutenant's Leather Grips": {
    "id": 23284,
    "icon": "inv_gauntlets_15"
  },
  "Knight-Lieutenant's Leather Walkers": {
    "id": 23285,
    "icon": "inv_boots_05"
  },
  "Knight-Lieutenant's Plate Gauntlets": {
    "id": 23286,
    "icon": "inv_gauntlets_26"
  },
  "Knight-Lieutenant's Plate Greaves": {
    "id": 23287,
    "icon": "inv_boots_plate_09"
  },
  "Knight-Lieutenant's Satin Handwraps": {
    "id": 23288,
    "icon": "inv_gauntlets_17"
  },
  "Knight-Lieutenant's Satin Walkers": {
    "id": 23289,
    "icon": "inv_boots_05"
  },
  "Knight-Lieutenant's Silk Handwraps": {
    "id": 23290,
    "icon": "inv_gauntlets_06"
  },
  "Knight-Lieutenant's Silk Walkers": {
    "id": 23291,
    "icon": "inv_boots_05"
  },
  "Knight-Captain's Chain Hauberk": {
    "id": 23292,
    "icon": "inv_chest_chain_04"
  },
  "Knight-Captain's Chain Legguards": {
    "id": 23293,
    "icon": "inv_pants_03"
  },
  "Knight-Captain's Dragonhide Chestpiece": {
    "id": 23294,
    "icon": "inv_chest_leather_07"
  },
  "Knight-Captain's Dragonhide Leggings": {
    "id": 23295,
    "icon": "inv_pants_06"
  },
  "Knight-Captain's Dreadweave Legguards": {
    "id": 23296,
    "icon": "inv_pants_06"
  },
  "Knight-Captain's Dreadweave Tunic": {
    "id": 23297,
    "icon": "inv_chest_leather_01"
  },
  "Knight-Captain's Leather Chestpiece": {
    "id": 23298,
    "icon": "inv_chest_leather_05"
  },
  "Knight-Captain's Leather Legguards": {
    "id": 23299,
    "icon": "inv_pants_08"
  },
  "Knight-Captain's Plate Hauberk": {
    "id": 23300,
    "icon": "inv_chest_plate16"
  },
  "Knight-Captain's Plate Leggings": {
    "id": 23301,
    "icon": "inv_pants_06"
  },
  "Knight-Captain's Satin Legguards": {
    "id": 23302,
    "icon": "inv_pants_11"
  },
  "Knight-Captain's Satin Tunic": {
    "id": 23303,
    "icon": "inv_chest_leather_01"
  },
  "Knight-Captain's Silk Legguards": {
    "id": 23304,
    "icon": "inv_pants_11"
  },
  "Knight-Captain's Silk Tunic": {
    "id": 23305,
    "icon": "inv_chest_cloth_28"
  },
  "Lieutenant Commander's Chain Helm": {
    "id": 23306,
    "icon": "inv_helmet_21"
  },
  "Lieutenant Commander's Chain Shoulders": {
    "id": 23307,
    "icon": "inv_shoulder_16"
  },
  "Lieutenant Commander's Dragonhide Headguard": {
    "id": 23308,
    "icon": "inv_helmet_09"
  },
  "Lieutenant Commander's Dragonhide Shoulders": {
    "id": 23309,
    "icon": "inv_shoulder_07"
  },
  "Lieutenant Commander's Dreadweave Cowl": {
    "id": 23310,
    "icon": "inv_helmet_08"
  },
  "Lieutenant Commander's Dreadweave Spaulders": {
    "id": 23311,
    "icon": "inv_shoulder_01"
  },
  "Lieutenant Commander's Leather Helm": {
    "id": 23312,
    "icon": "inv_helmet_09"
  },
  "Lieutenant Commander's Leather Shoulders": {
    "id": 23313,
    "icon": "inv_shoulder_14"
  },
  "Lieutenant Commander's Plate Helm": {
    "id": 23314,
    "icon": "inv_helmet_09"
  },
  "Lieutenant Commander's Plate Shoulders": {
    "id": 23315,
    "icon": "inv_shoulder_11"
  },
  "Lieutenant Commander's Satin Hood": {
    "id": 23316,
    "icon": "inv_helmet_17"
  },
  "Lieutenant Commander's Satin Mantle": {
    "id": 23317,
    "icon": "inv_shoulder_01"
  },
  "Lieutenant Commander's Silk Cowl": {
    "id": 23318,
    "icon": "inv_helmet_06"
  },
  "Lieutenant Commander's Silk Mantle": {
    "id": 23319,
    "icon": "inv_shoulder_02"
  }
});

const CLASS_STATS = Object.freeze({
  Druid: { strength: 14, agility: 12, stamina: 16, intellect: 12, spirit: 6 },
  Hunter: { agility: 24, stamina: 18, intellect: 8 },
  Mage: { intellect: 18, stamina: 18, spirit: 8 },
  Paladin: { strength: 14, stamina: 18, intellect: 14 },
  Priest: { intellect: 18, stamina: 18, spirit: 12 },
  Rogue: { strength: 14, agility: 22, stamina: 16 },
  Shaman: { strength: 16, stamina: 18, intellect: 12 },
  Warlock: { intellect: 16, stamina: 22, spirit: 8 },
  Warrior: { strength: 24, stamina: 20 },
});

const SETS = Object.freeze([
  {
    className: "Druid",
    type: "Leather",
    variants: [
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_lieutenant_commanders_refuge",
        setName: "Lieutenant Commander's Refuge",
        pieces: {
          head: "Lieutenant Commander's Dragonhide Headguard",
          shoulder: "Lieutenant Commander's Dragonhide Shoulders",
          chest: "Knight-Captain's Dragonhide Chestpiece",
          legs: "Knight-Captain's Dragonhide Leggings",
          feet: "Knight-Lieutenant's Dragonhide Treads",
          hands: "Knight-Lieutenant's Dragonhide Grips",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_champions_refuge",
        setName: "Champion's Refuge",
        pieces: {
          head: "Champion's Dragonhide Headguard",
          shoulder: "Champion's Dragonhide Shoulders",
          chest: "Legionnaire's Dragonhide Chestpiece",
          legs: "Legionnaire's Dragonhide Leggings",
          feet: "Blood Guard's Dragonhide Treads",
          hands: "Blood Guard's Dragonhide Grips",
        },
      },
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_field_marshals_sanctuary",
        setName: "Field Marshal's Sanctuary",
        pieces: {
          head: "Field Marshal's Dragonhide Helmet",
          shoulder: "Field Marshal's Dragonhide Spaulders",
          chest: "Field Marshal's Dragonhide Breastplate",
          legs: "Marshal's Dragonhide Legguards",
          feet: "Marshal's Dragonhide Boots",
          hands: "Marshal's Dragonhide Gauntlets",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_warlords_sanctuary",
        setName: "Warlord's Sanctuary",
        pieces: {
          head: "Warlord's Dragonhide Helmet",
          shoulder: "Warlord's Dragonhide Epaulets",
          chest: "Warlord's Dragonhide Hauberk",
          legs: "General's Dragonhide Leggings",
          feet: "General's Dragonhide Boots",
          hands: "General's Dragonhide Gloves",
        },
      },
    ],
  },
  {
    className: "Hunter",
    type: "Mail",
    variants: [
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_lieutenant_commanders_pursuance",
        setName: "Lieutenant Commander's Pursuance",
        pieces: {
          head: "Lieutenant Commander's Chain Helm",
          shoulder: "Lieutenant Commander's Chain Shoulders",
          chest: "Knight-Captain's Chain Hauberk",
          legs: "Knight-Captain's Chain Legguards",
          feet: "Knight-Lieutenant's Chain Greaves",
          hands: "Knight-Lieutenant's Chain Vices",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_champions_pursuance",
        setName: "Champion's Pursuance",
        pieces: {
          head: "Champion's Chain Helm",
          shoulder: "Champion's Chain Shoulders",
          chest: "Legionnaire's Chain Hauberk",
          legs: "Legionnaire's Chain Legguards",
          feet: "Blood Guard's Chain Greaves",
          hands: "Blood Guard's Chain Vices",
        },
      },
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_field_marshals_pursuit",
        setName: "Field Marshal's Pursuit",
        pieces: {
          head: "Field Marshal's Chain Helm",
          shoulder: "Field Marshal's Chain Spaulders",
          chest: "Field Marshal's Chain Breastplate",
          legs: "Marshal's Chain Legguards",
          feet: "Marshal's Chain Boots",
          hands: "Marshal's Chain Grips",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_warlords_pursuit",
        setName: "Warlord's Pursuit",
        pieces: {
          head: "Warlord's Chain Helmet",
          shoulder: "Warlord's Chain Shoulders",
          chest: "Warlord's Chain Chestpiece",
          legs: "General's Chain Legguards",
          feet: "General's Chain Sabatons",
          hands: "General's Chain Gloves",
        },
      },
    ],
  },
  {
    className: "Mage",
    type: "Cloth",
    variants: [
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_lieutenant_commanders_arcanum",
        setName: "Lieutenant Commander's Arcanum",
        pieces: {
          head: "Lieutenant Commander's Silk Cowl",
          shoulder: "Lieutenant Commander's Silk Mantle",
          chest: "Knight-Captain's Silk Tunic",
          legs: "Knight-Captain's Silk Legguards",
          feet: "Knight-Lieutenant's Silk Walkers",
          hands: "Knight-Lieutenant's Silk Handwraps",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_champions_arcanum",
        setName: "Champion's Arcanum",
        pieces: {
          head: "Champion's Silk Cowl",
          shoulder: "Champion's Silk Mantle",
          chest: "Legionnaire's Silk Tunic",
          legs: "Legionnaire's Silk Legguards",
          feet: "Blood Guard's Silk Walkers",
          hands: "Blood Guard's Silk Handwraps",
        },
      },
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_field_marshals_regalia",
        setName: "Field Marshal's Regalia",
        pieces: {
          head: "Field Marshal's Coronet",
          shoulder: "Field Marshal's Silk Spaulders",
          chest: "Field Marshal's Silk Vestments",
          legs: "Marshal's Silk Leggings",
          feet: "Marshal's Silk Footwraps",
          hands: "Marshal's Silk Gloves",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_warlords_regalia",
        setName: "Warlord's Regalia",
        pieces: {
          head: "Warlord's Silk Cowl",
          shoulder: "Warlord's Silk Amice",
          chest: "Warlord's Silk Raiment",
          legs: "General's Silk Trousers",
          feet: "General's Silk Boots",
          hands: "General's Silk Handguards",
        },
      },
    ],
  },
  {
    className: "Paladin",
    type: "Plate",
    variants: [
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_lieutenant_commanders_redoubt",
        setName: "Lieutenant Commander's Redoubt",
        pieces: {
          head: "Lieutenant Commander's Lamellar Headguard",
          shoulder: "Lieutenant Commander's Lamellar Shoulders",
          chest: "Knight-Captain's Lamellar Breastplate",
          legs: "Knight-Captain's Lamellar Leggings",
          feet: "Knight-Lieutenant's Lamellar Sabatons",
          hands: "Knight-Lieutenant's Lamellar Gauntlets",
        },
      },
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_field_marshals_aegis",
        setName: "Field Marshal's Aegis",
        pieces: {
          head: "Field Marshal's Lamellar Faceguard",
          shoulder: "Field Marshal's Lamellar Pauldrons",
          chest: "Field Marshal's Lamellar Chestplate",
          legs: "Marshal's Lamellar Legplates",
          feet: "Marshal's Lamellar Boots",
          hands: "Marshal's Lamellar Gloves",
        },
      },
    ],
  },
  {
    className: "Priest",
    type: "Cloth",
    variants: [
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_lieutenant_commanders_investiture",
        setName: "Lieutenant Commander's Investiture",
        pieces: {
          head: "Lieutenant Commander's Satin Hood",
          shoulder: "Lieutenant Commander's Satin Mantle",
          chest: "Knight-Captain's Satin Tunic",
          legs: "Knight-Captain's Satin Legguards",
          feet: "Knight-Lieutenant's Satin Walkers",
          hands: "Knight-Lieutenant's Satin Handwraps",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_champions_investiture",
        setName: "Champion's Investiture",
        pieces: {
          head: "Champion's Satin Hood",
          shoulder: "Champion's Satin Mantle",
          chest: "Legionnaire's Satin Tunic",
          legs: "Legionnaire's Satin Legguards",
          feet: "Blood Guard's Satin Walkers",
          hands: "Blood Guard's Satin Handwraps",
        },
      },
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_field_marshals_raiment",
        setName: "Field Marshal's Raiment",
        pieces: {
          head: "Field Marshal's Headdress",
          shoulder: "Field Marshal's Satin Mantle",
          chest: "Field Marshal's Satin Vestments",
          legs: "Marshal's Satin Pants",
          feet: "Marshal's Satin Sandals",
          hands: "Marshal's Satin Gloves",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_warlords_raiment",
        setName: "Warlord's Raiment",
        pieces: {
          head: "Warlord's Satin Cowl",
          shoulder: "Warlord's Satin Mantle",
          chest: "Warlord's Satin Robes",
          legs: "General's Satin Leggings",
          feet: "General's Satin Boots",
          hands: "General's Satin Gloves",
        },
      },
    ],
  },
  {
    className: "Rogue",
    type: "Leather",
    variants: [
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_lieutenant_commanders_guard",
        setName: "Lieutenant Commander's Guard",
        pieces: {
          head: "Lieutenant Commander's Leather Helm",
          shoulder: "Lieutenant Commander's Leather Shoulders",
          chest: "Knight-Captain's Leather Chestpiece",
          legs: "Knight-Captain's Leather Legguards",
          feet: "Knight-Lieutenant's Leather Walkers",
          hands: "Knight-Lieutenant's Leather Grips",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_champions_guard",
        setName: "Champion's Guard",
        pieces: {
          head: "Champion's Leather Helm",
          shoulder: "Champion's Leather Shoulders",
          chest: "Legionnaire's Leather Chestpiece",
          legs: "Legionnaire's Leather Legguards",
          feet: "Blood Guard's Leather Walkers",
          hands: "Blood Guard's Leather Grips",
        },
      },
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_field_marshals_vestments",
        setName: "Field Marshal's Vestments",
        pieces: {
          head: "Field Marshal's Leather Mask",
          shoulder: "Field Marshal's Leather Epaulets",
          chest: "Field Marshal's Leather Chestpiece",
          legs: "Marshal's Leather Leggings",
          feet: "Marshal's Leather Footguards",
          hands: "Marshal's Leather Handgrips",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_warlords_vestments",
        setName: "Warlord's Vestments",
        pieces: {
          head: "Warlord's Leather Helm",
          shoulder: "Warlord's Leather Spaulders",
          chest: "Warlord's Leather Breastplate",
          legs: "General's Leather Legguards",
          feet: "General's Leather Treads",
          hands: "General's Leather Mitts",
        },
      },
    ],
  },
  {
    className: "Shaman",
    type: "Mail",
    variants: [
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_champions_stormcaller",
        setName: "Champion's Stormcaller",
        pieces: {
          head: "Champion's Mail Headguard",
          shoulder: "Champion's Mail Pauldrons",
          chest: "Legionnaire's Mail Hauberk",
          legs: "Legionnaire's Mail Legguards",
          feet: "Blood Guard's Mail Greaves",
          hands: "Blood Guard's Mail Vices",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_warlords_earthshaker",
        setName: "Warlord's Earthshaker",
        pieces: {
          head: "Warlord's Mail Helm",
          shoulder: "Warlord's Mail Spaulders",
          chest: "Warlord's Mail Armor",
          legs: "General's Mail Leggings",
          feet: "General's Mail Boots",
          hands: "General's Mail Gauntlets",
        },
      },
    ],
  },
  {
    className: "Warlock",
    type: "Cloth",
    variants: [
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_lieutenant_commanders_dreadgear",
        setName: "Lieutenant Commander's Dreadgear",
        pieces: {
          head: "Lieutenant Commander's Dreadweave Cowl",
          shoulder: "Lieutenant Commander's Dreadweave Spaulders",
          chest: "Knight-Captain's Dreadweave Tunic",
          legs: "Knight-Captain's Dreadweave Legguards",
          feet: "Knight-Lieutenant's Dreadweave Walkers",
          hands: "Knight-Lieutenant's Dreadweave Handwraps",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_champions_dreadgear",
        setName: "Champion's Dreadgear",
        pieces: {
          head: "Champion's Dreadweave Cowl",
          shoulder: "Champion's Dreadweave Spaulders",
          chest: "Legionnaire's Dreadweave Tunic",
          legs: "Legionnaire's Dreadweave Legguards",
          feet: "Blood Guard's Dreadweave Walkers",
          hands: "Blood Guard's Dreadweave Handwraps",
        },
      },
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_field_marshals_threads",
        setName: "Field Marshal's Threads",
        pieces: {
          head: "Field Marshal's Coronal",
          shoulder: "Field Marshal's Dreadweave Shoulders",
          chest: "Field Marshal's Dreadweave Robe",
          legs: "Marshal's Dreadweave Leggings",
          feet: "Marshal's Dreadweave Boots",
          hands: "Marshal's Dreadweave Gloves",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_warlords_threads",
        setName: "Warlord's Threads",
        pieces: {
          head: "Warlord's Dreadweave Hood",
          shoulder: "Warlord's Dreadweave Mantle",
          chest: "Warlord's Dreadweave Robe",
          legs: "General's Dreadweave Pants",
          feet: "General's Dreadweave Boots",
          hands: "General's Dreadweave Gloves",
        },
      },
    ],
  },
  {
    className: "Warrior",
    type: "Plate",
    variants: [
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_lieutenant_commanders_battlearmor",
        setName: "Lieutenant Commander's Battlearmor",
        pieces: {
          head: "Lieutenant Commander's Plate Helm",
          shoulder: "Lieutenant Commander's Plate Shoulders",
          chest: "Knight-Captain's Plate Hauberk",
          legs: "Knight-Captain's Plate Leggings",
          feet: "Knight-Lieutenant's Plate Greaves",
          hands: "Knight-Lieutenant's Plate Gauntlets",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.RARE,
        setId: "pvp_rare_champions_battlearmor",
        setName: "Champion's Battlearmor",
        pieces: {
          head: "Champion's Plate Helm",
          shoulder: "Champion's Plate Shoulders",
          chest: "Legionnaire's Plate Hauberk",
          legs: "Legionnaire's Plate Leggings",
          feet: "Blood Guard's Plate Greaves",
          hands: "Blood Guard's Plate Gauntlets",
        },
      },
      {
        faction: GUILD_FACTION.ALLIANCE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_field_marshals_battlegear",
        setName: "Field Marshal's Battlegear",
        pieces: {
          head: "Field Marshal's Plate Helm",
          shoulder: "Field Marshal's Plate Shoulderguards",
          chest: "Field Marshal's Plate Armor",
          legs: "Marshal's Plate Legguards",
          feet: "Marshal's Plate Boots",
          hands: "Marshal's Plate Gauntlets",
        },
      },
      {
        faction: GUILD_FACTION.HORDE,
        quality: PVP_HONOR_QUALITY.EPIC,
        setId: "pvp_epic_warlords_battlegear",
        setName: "Warlord's Battlegear",
        pieces: {
          head: "Warlord's Plate Headpiece",
          shoulder: "Warlord's Plate Shoulders",
          chest: "Warlord's Plate Armor",
          legs: "General's Plate Leggings",
          feet: "General's Plate Boots",
          hands: "General's Plate Gauntlets",
        },
      },
    ],
  },
]);

const buildStatsForItem = ({ className, slot, quality }) => {
  const baseStats = CLASS_STATS[className] || { stamina: 16 };
  const slotScale =
    slot === "chest" || slot === "legs" ? 1.1 : slot === "head" ? 1 : 0.85;
  const qualityScale = quality === PVP_HONOR_QUALITY.EPIC ? 1.18 : 1;
  return Object.entries(baseStats).reduce((stats, [stat, value]) => {
    stats[stat] = Math.max(1, Math.round(value * slotScale * qualityScale));
    return stats;
  }, {});
};

const getHonorRankForItem = (quality, slot) =>
  quality === PVP_HONOR_QUALITY.EPIC
    ? EPIC_RANK_BY_SLOT[slot]
    : PVP_HONOR_RANK_BY_SLOT[slot];

const getPvpItemMetadata = (itemName) => PVP_ITEM_METADATA_BY_NAME[itemName] || {};

const buildVariantItems = ({ className, type, variant, variantIndex, classIndex }) =>
  PVP_HONOR_SLOT_ORDER.map((slot, slotIndex) => {
    const itemName = variant.pieces[slot];
    const metadata = getPvpItemMetadata(itemName);
    const iconCode = metadata.icon || ICON_BY_ARMOR_AND_SLOT[type]?.[slot];

    return {
      id: 404000 + classIndex * 100 + variantIndex * 10 + slotIndex,
      wowheadId: metadata.id,
      name: itemName,
      slot,
      quality: PVP_HONOR_ITEM_QUALITY[variant.quality],
      type,
      minLevel: 60,
      itemLevel: PVP_HONOR_ITEM_LEVEL[variant.quality],
      dungeonSetId: PVP_HONOR_SET_ID,
      dungeonSetName: PVP_HONOR_SET_NAME,
      icon: wowItemIcon(iconCode),
      allowedClasses: [className],
      faction: variant.faction,
      pvpGear: true,
      pvpHonorRank: getHonorRankForItem(variant.quality, slot),
      setId: variant.setId,
      setName: variant.setName,
      stats: buildStatsForItem({ className, slot, quality: variant.quality }),
    };
  });

export const PVP_HONOR_SET_ITEMS = Object.freeze(
  SETS.flatMap((classSet, classIndex) =>
    classSet.variants.flatMap((variant, variantIndex) =>
      buildVariantItems({
        ...classSet,
        variant,
        variantIndex,
        classIndex,
      }),
    ),
  ),
);
