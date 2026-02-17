import {
  CONFIG,
  DB_CLASSES,
  DB_RACES,
  DB_NAMES,
  DB_LASTNAMES,
  PROF_PAIRS,
  DEFAULT_PROF_PAIR,
  KEY_DEFINITIONS,
} from "./constants";

const ARMOR_HIERARCHY = ["Plate", "Mail", "Leather", "Cloth"];
const WOW_ICON_BASE_URL = "https://wow.zamimg.com/images/wow/icons/large";
const SLOT_FALLBACK_ICONS = {
  head: "inv_helmet_03",
  chest: "inv_chest_chain_05",
  legs: "inv_pants_03",
  feet: "inv_boots_09",
  hands: "inv_gauntlets_04",
  mainHand: "inv_sword_04",
};
const SLOT_TYPE_FALLBACK_ICONS = {
  head: {
    Plate: "inv_helmet_03",
    Cloth: "inv_crown_01",
    Leather: "inv_helmet_08",
    Mail: "inv_helmet_03",
    Generic: "inv_helmet_03",
  },
  chest: {
    Plate: "inv_chest_chain_05",
    Cloth: "inv_chest_cloth_10",
    Leather: "inv_chest_leather_04",
    Mail: "inv_chest_chain_05",
    Generic: "inv_chest_chain_05",
  },
  legs: {
    Plate: "inv_pants_mail_15",
    Cloth: "inv_pants_11",
    Leather: "inv_pants_02",
    Mail: "inv_pants_03",
    Generic: "inv_pants_03",
  },
  feet: {
    Plate: "inv_boots_plate_03",
    Cloth: "inv_boots_04",
    Leather: "inv_boots_05",
    Mail: "inv_boots_09",
    Generic: "inv_boots_09",
  },
  hands: {
    Plate: "inv_gauntlets_10",
    Cloth: "inv_gauntlets_05",
    Leather: "inv_gauntlets_04",
    Mail: "inv_gauntlets_10",
    Generic: "inv_gauntlets_04",
  },
  mainHand: {
    Generic: "inv_sword_04",
  },
};
const ITEM_QUALITY_LEVEL_BONUS = {
  0: 0, // Poor (gray)
  1: 0, // Common (white)
  2: 7, // Uncommon (green)
  3: 12, // Rare (blue)
  4: 20, // Epic (purple)
  5: 40, // Legendary (orange)
};
const RACE_GENDER_ICON_CODES = {
  Human: {
    Male: "achievement_character_human_male",
    Female: "achievement_character_human_female",
  },
  Dwarf: {
    Male: "achievement_character_dwarf_male",
    Female: "achievement_character_dwarf_female",
  },
  Gnome: {
    Male: "achievement_character_gnome_male",
    Female: "achievement_character_gnome_female",
  },
  "Night Elf": {
    Male: "achievement_character_nightelf_male",
    Female: "achievement_character_nightelf_female",
  },
};
const STAT_LABELS = {
  strength: "Str",
  agility: "Agi",
  stamina: "Sta",
  intellect: "Int",
  spirit: "Spi",
  armor: "Armor",
};

export const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const getQualityColor = (q) =>
  q === 5
    ? "var(--q-legendary)"
    : q === 4
      ? "var(--q-epic)"
      : q === 3
    ? "var(--q-rare)"
    : q === 2
      ? "var(--q-uncommon)"
      : q === 1
        ? "var(--q-common)"
        : "var(--q-poor)";
export const getQualityClass = (q) =>
  q === 5
    ? "text-orange-400"
    : q === 4
      ? "text-purple-400"
      : q === 3
    ? "text-blue-400"
    : q === 2
      ? "text-green-400"
      : q === 1
        ? "text-white"
        : "text-gray-400";
export const getQualityLabel = (quality) =>
  quality === 5
    ? "Legendary item"
    : quality === 4
      ? "Epic item"
      : quality === 1
    ? "Common item"
    : quality === 2
      ? "Uncommon item"
      : quality === 3
        ? "Rare item"
        : "Poor item";
export const getWowIconUrl = (iconCode) =>
  `${WOW_ICON_BASE_URL}/${String(iconCode || "inv_misc_questionmark").toLowerCase()}.jpg`;
const resolveFallbackIconCode = (item, slotName) => {
  const slot = slotName || item?.slot;
  if (!slot) return "inv_misc_questionmark";

  const itemType = item?.type || "Generic";
  if (slot === "chest" && itemType === "Cloth") {
    const itemName = String(item?.name || "");
    if (/robe|vestment/i.test(itemName)) return "inv_chest_cloth_17";
  }

  const slotTypeMap = SLOT_TYPE_FALLBACK_ICONS[slot];
  if (slotTypeMap) {
    return slotTypeMap[itemType] || slotTypeMap.Generic || SLOT_FALLBACK_ICONS[slot];
  }

  return SLOT_FALLBACK_ICONS[slot] || "inv_misc_questionmark";
};
export const getItemIconUrl = (item, slotName) => {
  if (item?.icon) return item.icon;
  const fallbackCode = resolveFallbackIconCode(item, slotName);
  return getWowIconUrl(fallbackCode);
};
export const formatItemStats = (stats) => {
  if (!stats || typeof stats !== "object") return "";
  return Object.entries(stats)
    .filter(([, value]) => typeof value === "number" && value !== 0)
    .map(([stat, value]) => {
      const label = STAT_LABELS[stat] || stat;
      const needsSign = stat !== "armor";
      return `${needsSign && value > 0 ? "+" : ""}${value} ${label}`;
    })
    .join(" • ");
};
export const getReqExp = (l) => {
  if (l >= CONFIG.LEVEL_CAP) return 999999;
  if (typeof CONFIG.XP_TABLE[l] === "number") return CONFIG.XP_TABLE[l];
  // Fallback keeps progression working when LEVEL_CAP is raised before table expansion.
  return 20800 + Math.max(0, l - 20) * 1500;
};
export const getRaceIcon = (r) =>
  r === "Human" ? "🛡️" : r === "Dwarf" ? "🍺" : r === "Night Elf" ? "🌙" : "⚙️";
export const getRacePortraitUrl = (race, gender) => {
  const raceIcons = RACE_GENDER_ICON_CODES[race];
  if (!raceIcons) return getWowIconUrl("inv_misc_questionmark");
  const normalizedGender = String(gender || "Male").toLowerCase().startsWith("f")
    ? "Female"
    : "Male";
  const iconCode = raceIcons[normalizedGender] || raceIcons.Male;
  return getWowIconUrl(iconCode);
};
export const getRoleIcon = (r) =>
  r === "Tank" ? "🛡️" : r === "Healer" ? "➕" : "⚔️";
export const getKeyDefinition = (keyId) => {
  const normalizedId = String(keyId || "").trim();
  if (!normalizedId) return null;
  const configured = KEY_DEFINITIONS[normalizedId];
  if (configured) return configured;
  return {
    id: normalizedId,
    name: normalizedId.replace(/_/g, " "),
    icon: getWowIconUrl("inv_misc_key_03"),
  };
};
export const getKeyLabel = (keyId) => getKeyDefinition(keyId)?.name || "";
export const getKeyIconUrl = (keyId) =>
  getKeyDefinition(keyId)?.icon || getWowIconUrl("inv_misc_key_03");

export const getItemEffectiveLevel = (item) => {
  if (!item || typeof item !== "object") return 0;
  const minLevel = Number(item.minLevel) || 0;
  const quality = Number(item.quality) || 0;
  const qualityBonus = ITEM_QUALITY_LEVEL_BONUS[quality] || 0;
  // Optional per-item tuning for later balancing (e.g. stronger/weaker epics at same req level).
  const itemLevelBonus = Number(item.itemLevelBonus) || 0;
  return Math.max(0, minLevel + qualityBonus + itemLevelBonus);
};

export const getEquipmentAverageItemLevel = (equipment) => {
  if (!equipment || typeof equipment !== "object") return 0;
  const slots = Object.values(equipment);
  if (slots.length === 0) return 0;
  const totalItemLevel = slots.reduce(
    (sum, item) => sum + getItemEffectiveLevel(item),
    0,
  );
  return totalItemLevel / slots.length;
};

export const getCharacterAverageItemLevel = (char) =>
  getEquipmentAverageItemLevel(char?.equipment);

export const getCharacterPowerScore = (char) => {
  const level = Number(char?.level) || 1;
  const avgItemLevel = getCharacterAverageItemLevel(char);
  return level * 0.6 + avgItemLevel * 0.4;
};

const parseRecommendedRange = (recommended) => {
  if (typeof recommended !== "string") return null;
  const values = recommended.match(/\d+/g);
  if (!values || values.length < 2) return null;
  const low = Number(values[0]);
  const high = Number(values[1]);
  if (Number.isNaN(low) || Number.isNaN(high)) return null;
  return { low, high };
};

export const getMissionPowerTarget = (mission) => {
  if (!mission || typeof mission !== "object") return 1;
  if (mission.type === "dungeon") {
    const range = parseRecommendedRange(mission.recommended);
    if (range) return (range.low + range.high) / 2 + 2;
    return (Number(mission.level) || 1) + 2;
  }
  const level = Number(mission.level) || 1;
  return mission.elite ? level + 3 : level;
};

export const getMissionBaseFailChance = (mission) => {
  if (!mission || typeof mission !== "object") return 5;
  if (mission.type === "dungeon") return 25;
  if (mission.elite) return 15;
  return 5;
};

export const getMissionSuccessPreview = (mission, partyMembers) => {
  const members = Array.isArray(partyMembers) ? partyMembers : [];
  const missionPower = getMissionPowerTarget(mission);
  const baseFail = getMissionBaseFailChance(mission);
  const hasTank = members.some((member) => member?.role === "Tank");
  const hasHealer = members.some((member) => member?.role === "Healer");
  const hasDps = members.some((member) => member?.role === "DPS");
  const hasCoreRoleComposition = hasTank && hasHealer && hasDps;
  const roleCompositionBonus = hasCoreRoleComposition ? 20 : 0;

  if (members.length === 0) {
    return {
      missionPower,
      partyPower: 0,
      averagePartyLevel: 0,
      averagePartyItemLevel: 0,
      partySizeBonus: 0,
      roleCompositionBonus,
      hasCoreRoleComposition: false,
      baseFailChance: baseFail,
      failChance: 100,
      successChance: 0,
    };
  }

  const totalPartyPower = members.reduce(
    (sum, member) => sum + getCharacterPowerScore(member),
    0,
  );
  const totalPartyLevel = members.reduce(
    (sum, member) => sum + (Number(member?.level) || 1),
    0,
  );
  const totalPartyItemLevel = members.reduce(
    (sum, member) => sum + getCharacterAverageItemLevel(member),
    0,
  );

  const partyPower = totalPartyPower / members.length;
  const averagePartyLevel = totalPartyLevel / members.length;
  const averagePartyItemLevel = totalPartyItemLevel / members.length;
  const partySizeBonus = Math.max(0, members.length - 1) * 2.5;
  const rawFailChance =
    baseFail +
    (missionPower - partyPower) * 5 -
    partySizeBonus -
    roleCompositionBonus;
  const failChance = Math.max(0, Math.min(95, Math.round(rawFailChance)));

  return {
    missionPower,
    partyPower,
    averagePartyLevel,
    averagePartyItemLevel,
    partySizeBonus,
    roleCompositionBonus,
    hasCoreRoleComposition,
    baseFailChance: baseFail,
    failChance,
    successChance: 100 - failChance,
  };
};

export const getSkillCap = (level) => {
  if (level >= 30) return 300;
  if (level >= 20) return 225;
  if (level >= 10) return 150;
  return 75;
};

export const getAutoSkillTarget = (level) => {
  if (level >= 20) return 225;
  if (level >= 15) return 150;
  if (level >= 10) return 100;
  if (level >= 5) return 50;
  return 0;
};

export const getNextTierLevel = (level) => {
  if (level < 10) return 10;
  if (level < 20) return 20;
  if (level < 30) return 30;
  return "Max";
};

export const getClassArmorTypes = (charClass, level = 1) => {
  const classInfo = DB_CLASSES[charClass];
  if (!classInfo) return [];
  const charLevel = Math.max(1, Number(level) || 1);
  const rawArmorTypes = classInfo.armorTypes || classInfo.proficiencies || [];
  const armorUnlocks =
    classInfo.armorUnlocks && typeof classInfo.armorUnlocks === "object"
      ? classInfo.armorUnlocks
      : {};
  return ARMOR_HIERARCHY.filter((armorType) => {
    if (!rawArmorTypes.includes(armorType)) return false;
    const unlockLevel = Number(armorUnlocks[armorType]);
    if (!Number.isFinite(unlockLevel) || unlockLevel <= 1) return true;
    return charLevel >= unlockLevel;
  });
};

export const getClassArmorText = (charClass, level = 1) =>
  getClassArmorTypes(charClass, level).join(", ");

export const getStarterGear = (charClass) => {
  const armorTypes = getClassArmorTypes(charClass);
  const armor = armorTypes[0] || "Cloth";
  const gear = {
    head: null,
    chest: null,
    legs: null,
    feet: null,
    hands: null,
    mainHand: null,
  };
  gear.feet = { name: "Worn Boots", quality: 0, type: armor, minLevel: 1 };
  gear.mainHand = { name: "Dull Blade", quality: 0, type: "Generic", minLevel: 1 };
  if (armor === "Cloth") {
    gear.chest = { name: "Apprentice Robe", quality: 1, type: "Cloth", minLevel: 1 };
    gear.legs = { name: "Apprentice Pants", quality: 0, type: "Cloth", minLevel: 1 };
  } else if (armor === "Leather") {
    gear.chest = { name: "Thug's Vest", quality: 1, type: "Leather", minLevel: 1 };
    gear.legs = { name: "Thug's Pants", quality: 0, type: "Leather", minLevel: 1 };
  } else {
    gear.chest = { name: "Rusty Chain Vest", quality: 1, type: "Mail", minLevel: 1 };
    gear.legs = { name: "Rusty Chain Pants", quality: 0, type: "Mail", minLevel: 1 };
  }
  return gear;
};

export const generateCharacter = () => {
  const races = Object.keys(DB_RACES);
  const race = races[Math.floor(Math.random() * races.length)];
  const allowedClasses = DB_RACES[race];
  const charClass =
    allowedClasses[Math.floor(Math.random() * allowedClasses.length)];
  const gender = Math.random() > 0.5 ? "Male" : "Female";
  const raceNames = DB_NAMES[race] || DB_NAMES["Human"];
  const namesList = raceNames[gender] || raceNames["Male"];
  const firstName = namesList[Math.floor(Math.random() * namesList.length)];
  const lastName =
    Math.random() > 0.4
      ? " " + DB_LASTNAMES[Math.floor(Math.random() * DB_LASTNAMES.length)]
      : "";
  const allowedRoles = DB_CLASSES[charClass].allowedRoles;
  const role = allowedRoles[Math.floor(Math.random() * allowedRoles.length)];

  const starterProfs = PROF_PAIRS[charClass] || DEFAULT_PROF_PAIR;
  const professions = starterProfs.map((p) => ({ name: p, skill: 1 }));

  return {
    id: createId(),
    name: firstName + lastName,
    race,
    gender,
    charClass,
    role,
    level: 1,
    exp: 0,
    maxExp: CONFIG.XP_TABLE[1],
    status: "Idle",
    statusText: "Waiting for orders...",
    activityMode: "Auto",
    professions: professions,
    history: [],
    keys: [],
    equipment: getStarterGear(charClass),
    lastLevelUp: 0,
    backstory: null,
  };
};

export const generateCharacters = (count = 1) => {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  return Array.from({ length: safeCount }, () => generateCharacter());
};
