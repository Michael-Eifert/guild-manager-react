import {
  CONFIG,
  DB_CLASSES,
  DB_RACES,
  DB_NAMES,
  DB_CLASS_NAMES,
  DB_RACE_CLASS_NAMES,
  DB_FUNNY_NAMES,
  PROF_PAIRS,
  DEFAULT_PROF_PAIR,
  KEY_DEFINITIONS,
  GUILD_FACTION,
  FACTION_RACES,
} from "./constants";
import {
  getCharacterDungeonSuccessBonus,
  getCharacterRaidSuccessBonus,
  rollCharacterPersonalityTraits,
} from "./game/characterPersonality";
import { createDefaultPvpData } from "./pvp/pvpCharacterUtils";
import { canCharacterEquipItem } from "./equipment/weaponRules";

const ARMOR_HIERARCHY = ["Plate", "Mail", "Leather", "Cloth"];
const WOW_ICON_BASE_URL = "https://wow.zamimg.com/images/wow/icons/large";
const SLOT_FALLBACK_ICONS = {
  head: "inv_helmet_03",
  neck: "inv_jewelry_necklace_01",
  shoulder: "inv_shoulder_14",
  back: "inv_misc_cape_11",
  chest: "inv_chest_chain_05",
  wrist: "inv_bracer_07",
  belt: "inv_belt_09",
  legs: "inv_pants_03",
  feet: "inv_boots_09",
  hands: "inv_gauntlets_04",
  trinket: "inv_jewelry_talisman_01",
  ring: "inv_jewelry_ring_03",
  mainHand: "inv_sword_04",
  offHand: "inv_misc_book_09",
  ranged: "inv_weapon_bow_07",
};
const SLOT_TYPE_FALLBACK_ICONS = {
  head: {
    Plate: "inv_helmet_03",
    Cloth: "inv_crown_01",
    Leather: "inv_helmet_08",
    Mail: "inv_helmet_03",
    Generic: "inv_helmet_03",
  },
  shoulder: {
    Plate: "inv_shoulder_14",
    Cloth: "inv_shoulder_02",
    Leather: "inv_shoulder_07",
    Mail: "inv_shoulder_14",
    Generic: "inv_shoulder_14",
  },
  neck: {
    Generic: "inv_jewelry_necklace_01",
  },
  back: {
    Generic: "inv_misc_cape_11",
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
  wrist: {
    Plate: "inv_bracer_18",
    Cloth: "inv_bracer_09",
    Leather: "inv_bracer_07",
    Mail: "inv_bracer_18",
    Generic: "inv_bracer_07",
  },
  belt: {
    Plate: "inv_belt_13",
    Cloth: "inv_belt_22",
    Leather: "inv_belt_23",
    Mail: "inv_belt_09",
    Generic: "inv_belt_09",
  },
  trinket: {
    Generic: "inv_jewelry_talisman_01",
  },
  ring: {
    Generic: "inv_jewelry_ring_03",
  },
  mainHand: {
    Generic: "inv_sword_04",
  },
  offHand: {
    Generic: "inv_misc_book_09",
  },
  ranged: {
    Generic: "inv_weapon_bow_07",
  },
};
export const EQUIPMENT_SLOT_ORDER = Object.freeze([
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "wrist",
  "belt",
  "hands",
  "legs",
  "feet",
  "trinket",
  "ring",
  "mainHand",
  "offHand",
  "ranged",
]);
const ITEM_QUALITY_LEVEL_BONUS = {
  0: 0, // Poor (gray)
  1: 0, // Common (white)
  2: 5, // Uncommon (green)
  3: 7, // Rare (blue)
  4: 10, // Epic (purple)
  5: 20, // Legendary (orange)
};
const ITEM_SET_BONUS_TIERS = Object.freeze([
  { pieces: 4, bonus: 10 },
  { pieces: 2, bonus: 5 },
]);
const SET_CLASS_RESTRICTIONS = Object.freeze({
  t0_wildheart_raiment: ["Druid"],
  t0_beaststalker_armor: ["Hunter"],
  t0_magisters_regalia: ["Mage"],
  t0_lightforge_armor: ["Paladin"],
  t0_vestments_of_the_devout: ["Priest"],
  t0_shadowcraft_armor: ["Rogue"],
  t0_the_elements: ["Shaman"],
  t0_dreadmist_raiment: ["Warlock"],
  t0_battlegear_of_valor: ["Warrior"],
  t1_cenarion_raiment: ["Druid"],
  t1_giantstalker_armor: ["Hunter"],
  t1_arcanist_regalia: ["Mage"],
  t1_lawbringer_armor: ["Paladin"],
  t1_prophecy_vestments: ["Priest"],
  t1_nightslayer_armor: ["Rogue"],
  t1_earthfury: ["Shaman"],
  t1_felheart_raiment: ["Warlock"],
  t1_battlegear_of_might: ["Warrior"],
  t2_stormrage_raiment: ["Druid"],
  t2_dragonstalker_armor: ["Hunter"],
  t2_netherwind_regalia: ["Mage"],
  t2_judgment_armor: ["Paladin"],
  t2_vestments_of_transcendence: ["Priest"],
  t2_bloodfang_armor: ["Rogue"],
  t2_the_ten_storms: ["Shaman"],
  t2_nemesis_raiment: ["Warlock"],
  t2_battlegear_of_wrath: ["Warrior"],
});
const ITEM_SET_ARMOR_SLOTS = Object.freeze([
  "head",
  "shoulder",
  "chest",
  "wrist",
  "belt",
  "legs",
  "feet",
  "hands",
  "ring",
]);
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
  Orc: {
    Male: "achievement_character_orc_male",
    Female: "achievement_character_orc_female",
  },
  Undead: {
    Male: "achievement_character_undead_male",
    Female: "achievement_character_undead_female",
  },
  Tauren: {
    Male: "achievement_character_tauren_male",
    Female: "achievement_character_tauren_female",
  },
  Troll: {
    Male: "achievement_character_troll_male",
    Female: "achievement_character_troll_female",
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
const FUNNY_NAME_CHANCE = 0.12;

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
  r === "Human"
    ? "🛡️"
    : r === "Dwarf"
      ? "🍺"
      : r === "Night Elf"
        ? "🌙"
        : r === "Gnome"
          ? "⚙️"
          : r === "Orc"
            ? "🪓"
            : r === "Undead"
              ? "☠️"
              : r === "Tauren"
                ? "🐂"
                : "🗡️";
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
export const getKeySourceQuestLabel = (keyId) =>
  getKeyDefinition(keyId)?.sourceQuest || "";

export const getItemEffectiveLevel = (item) => {
  if (!item || typeof item !== "object") return 0;
  const explicitItemLevel = Number(item.itemLevel);
  if (Number.isFinite(explicitItemLevel) && explicitItemLevel > 0) {
    return Math.max(0, Math.floor(explicitItemLevel));
  }
  const minLevel = Number(item.minLevel) || 0;
  const quality = Number(item.quality) || 0;
  const qualityBonus = ITEM_QUALITY_LEVEL_BONUS[quality] || 0;
  // Optional per-item tuning for later balancing (e.g. stronger/weaker epics at same req level).
  const itemLevelBonus = Number(item.itemLevelBonus) || 0;
  return Math.max(0, minLevel + qualityBonus + itemLevelBonus);
};

export const getItemAllowedClasses = (item) => {
  if (!item || typeof item !== "object") return [];

  if (Array.isArray(item.allowedClasses) && item.allowedClasses.length > 0) {
    return [...new Set(item.allowedClasses.map(String).map((name) => name.trim()).filter(Boolean))];
  }

  const setId = String(item.setId || "").trim();
  if (setId && Array.isArray(SET_CLASS_RESTRICTIONS[setId])) {
    return [...SET_CLASS_RESTRICTIONS[setId]];
  }

  return [];
};

export const isItemUsableByClass = (item, charClass) => {
  const allowedClasses = getItemAllowedClasses(item);
  const normalizedClass = String(charClass || "").trim();
  if (!normalizedClass) return false;
  if (allowedClasses.length > 0 && !allowedClasses.includes(normalizedClass)) {
    return false;
  }
  return canCharacterEquipItem(
    { charClass: normalizedClass, level: 60 },
    item,
  );
};

export const isItemUsableByCharacter = (item, character, targetSlot) =>
  canCharacterEquipItem(character, item, targetSlot);

const getEquipmentBaseAverageItemLevel = (equipment) => {
  if (!equipment || typeof equipment !== "object") return 0;
  const slots = Object.entries(equipment)
    .filter(([, item]) => Boolean(item))
    .flatMap(([slotName, item]) =>
      slotName === "mainHand" &&
      (item?.handedness === "twoHand" ||
        ["axe2h", "mace2h", "sword2h", "polearm", "staff"].includes(item?.weaponType))
        ? [item, item]
        : [item],
    );
  if (slots.length === 0) return 0;
  const totalItemLevel = slots.reduce(
    (sum, item) => sum + getItemEffectiveLevel(item),
    0,
  );
  return totalItemLevel / slots.length;
};

const getSetBonusForPieceCount = (pieces) => {
  const pieceCount = Math.max(0, Number(pieces) || 0);
  const matchedTier = ITEM_SET_BONUS_TIERS.find(
    (tier) => pieceCount >= tier.pieces,
  );
  return matchedTier ? matchedTier.bonus : 0;
};

export const getEquipmentSetBonuses = (equipment) => {
  if (!equipment || typeof equipment !== "object") return [];
  const entries = Object.entries(equipment).filter(
    ([slotName, item]) =>
      ITEM_SET_ARMOR_SLOTS.includes(slotName) &&
      item &&
      typeof item === "object",
  );
  const setAggregation = entries.reduce((acc, [, item]) => {
    const setId = String(item?.setId || "").trim();
    if (!setId) return acc;
    if (!acc[setId]) {
      acc[setId] = {
        setId,
        setName: String(item?.setName || setId).trim(),
        pieces: 0,
      };
    }
    acc[setId].pieces += 1;
    return acc;
  }, {});

  return Object.values(setAggregation)
    .map((entry) => ({
      ...entry,
      bonus: getSetBonusForPieceCount(entry.pieces),
    }))
    .filter((entry) => entry.bonus > 0)
    .sort((left, right) => {
      if (right.bonus !== left.bonus) return right.bonus - left.bonus;
      if (right.pieces !== left.pieces) return right.pieces - left.pieces;
      return left.setName.localeCompare(right.setName);
    });
};

export const getEquipmentSetBonus = (equipment) =>
  getEquipmentSetBonuses(equipment).reduce(
    (sum, entry) => sum + (Number(entry.bonus) || 0),
    0,
  );

export const getEquipmentAverageItemLevel = (equipment) =>
  getEquipmentBaseAverageItemLevel(equipment) + getEquipmentSetBonus(equipment);

export const getCharacterSetBonus = (char) =>
  getEquipmentSetBonus(char?.equipment);

export const getCharacterAverageItemLevel = (char) =>
  char?.equipment
    ? getEquipmentAverageItemLevel(char.equipment)
    : Math.max(0, Number(char?.itemLevel) || 0);

export const getCharacterPowerScore = (char) => {
  const level = Number(char?.level) || 1;
  const baseItemLevel = char?.equipment
    ? getEquipmentBaseAverageItemLevel(char.equipment)
    : Math.max(0, Number(char?.itemLevel) || 0);
  const setBonus = getEquipmentSetBonus(char?.equipment);
  return level * 0.6 + baseItemLevel * 0.4 + setBonus;
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
    if (mission.isRaid) {
      if (range) return (range.low + range.high) / 2 + 8;
      return (Number(mission.level) || 1) + 8;
    }
    if (range) return (range.low + range.high) / 2 + 2;
    return (Number(mission.level) || 1) + 2;
  }
  const level = Number(mission.level) || 1;
  return mission.elite ? level + 3 : level;
};

export const getMissionBaseFailChance = (mission) => {
  if (!mission || typeof mission !== "object") return 5;
  if (Number.isFinite(mission.baseFailChance)) {
    return Math.max(0, Math.min(95, Number(mission.baseFailChance)));
  }
  if (mission.type === "dungeon") return 25;
  if (mission.elite) return 15;
  return 5;
};

export const getMissionVeteranCoverage = (mission, partyMembers) => {
  const members = Array.isArray(partyMembers) ? partyMembers : [];
  if (!mission || mission.type !== "dungeon" || members.length === 0) {
    return {
      missionKey: null,
      experiencedCount: 0,
      partySize: members.length,
      coverageRatio: 0,
      successBonus: 0,
    };
  }

  const rawMissionKey = mission?.questId ?? mission?.id;
  const missionKey = rawMissionKey == null ? null : String(rawMissionKey);
  if (!missionKey) {
    return {
      missionKey: null,
      experiencedCount: 0,
      partySize: members.length,
      coverageRatio: 0,
      successBonus: 0,
    };
  }

  const experiencedCount = members.reduce((count, member) => {
    const clearedMissionIds = Array.isArray(member?.clearedMissionIds)
      ? member.clearedMissionIds
      : [];
    const hasClear = clearedMissionIds.some(
      (missionId) => String(missionId) === missionKey,
    );
    return hasClear ? count + 1 : count;
  }, 0);

  const partySize = Math.max(0, members.length);
  const coverageRatio = partySize > 0 ? experiencedCount / partySize : 0;
  const successBonus = coverageRatio >= 0.5 ? 10 : 0;

  return {
    missionKey,
    experiencedCount,
    partySize,
    coverageRatio,
    successBonus,
  };
};

export const getMissionSuccessPreview = (mission, partyMembers) => {
  const members = Array.isArray(partyMembers) ? partyMembers : [];
  const missionPower = getMissionPowerTarget(mission);
  const baseFail = getMissionBaseFailChance(mission);
  const isRaid = mission?.isRaid === true;
  const roleCounts = {
    Tank: members.filter((member) => member?.role === "Tank").length,
    Healer: members.filter((member) => member?.role === "Healer").length,
    DPS: members.filter((member) => member?.role === "DPS").length,
  };
  const defaultRaidRequirement = {
    Tank: 4,
    Healer: 8,
    DPS: 18,
    bonus: 20,
  };
  const configuredRaidRequirement =
    mission?.raidRoleRequirement &&
    typeof mission.raidRoleRequirement === "object"
      ? mission.raidRoleRequirement
      : {};
  const raidRoleRequirement = {
    Tank: Math.max(
      0,
      Math.floor(
        Number(configuredRaidRequirement.Tank ?? defaultRaidRequirement.Tank) || 0,
      ),
    ),
    Healer: Math.max(
      0,
      Math.floor(
        Number(
          configuredRaidRequirement.Healer ?? defaultRaidRequirement.Healer,
        ) || 0,
      ),
    ),
    DPS: Math.max(
      0,
      Math.floor(Number(configuredRaidRequirement.DPS ?? defaultRaidRequirement.DPS) || 0),
    ),
    bonus: Math.max(
      0,
      Number(configuredRaidRequirement.bonus ?? defaultRaidRequirement.bonus) || 0,
    ),
  };
  const hasRaidRoleCoverage =
    roleCounts.Tank >= raidRoleRequirement.Tank &&
    roleCounts.Healer >= raidRoleRequirement.Healer &&
    roleCounts.DPS >= raidRoleRequirement.DPS;
  const raidRoleRequirementBonus = hasRaidRoleCoverage
    ? raidRoleRequirement.bonus
    : 0;
  const hasTank = members.some((member) => member?.role === "Tank");
  const hasHealer = members.some((member) => member?.role === "Healer");
  const hasDps = members.some((member) => member?.role === "DPS");
  const hasCoreRoleComposition = hasTank && hasHealer && hasDps;
  const roleCompositionBonus =
    !isRaid && hasCoreRoleComposition ? 20 : 0;

  if (members.length === 0) {
    return {
      missionPower,
      partyPower: 0,
      averagePartyLevel: 0,
      averagePartyItemLevel: 0,
      partySizeBonus: 0,
      roleCompositionBonus,
      personalitySuccessBonus: 0,
      raidRoleRequirement,
      raidRoleRequirementBonus: 0,
      hasRaidRoleCoverage: false,
      roleCounts,
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
  const requiredPartySize = isRaid
    ? Math.max(1, Number(mission?.requiredPartySize) || 40)
    : 5;
  const partySizeBonus = isRaid
    ? Math.min(12, (Math.max(0, members.length) / requiredPartySize) * 12)
    : Math.max(0, members.length - 1) * 2.5;
  const raidMissingTank = Math.max(0, raidRoleRequirement.Tank - roleCounts.Tank);
  const raidMissingHealer = Math.max(
    0,
    raidRoleRequirement.Healer - roleCounts.Healer,
  );
  const raidMissingDps = Math.max(0, raidRoleRequirement.DPS - roleCounts.DPS);
  const raidRoleDeficitPenalty = isRaid
    ? raidMissingTank * 3 + raidMissingHealer * 2 + raidMissingDps
    : 0;
  const personalityBonusSource = isRaid
    ? getCharacterRaidSuccessBonus
    : getCharacterDungeonSuccessBonus;
  const personalitySuccessBonus = members.reduce(
    (sum, member) => sum + personalityBonusSource(member),
    0,
  );
  const rawFailChance = isRaid
    ? baseFail +
      (missionPower - partyPower) * 4 +
      raidRoleDeficitPenalty -
      partySizeBonus -
      raidRoleRequirementBonus -
      personalitySuccessBonus
    : baseFail +
      (missionPower - partyPower) * 5 -
      partySizeBonus -
      roleCompositionBonus -
      personalitySuccessBonus;
  const failChance = Math.max(0, Math.min(95, Math.round(rawFailChance)));

  return {
    missionPower,
    partyPower,
    averagePartyLevel,
    averagePartyItemLevel,
    partySizeBonus,
    roleCompositionBonus,
    personalitySuccessBonus,
    raidRoleRequirement,
    raidRoleRequirementBonus,
    hasRaidRoleCoverage,
    roleCounts,
    hasCoreRoleComposition,
    baseFailChance: baseFail,
    failChance,
    successChance: 100 - failChance,
  };
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

export const getFactionRaces = (faction = GUILD_FACTION.ALLIANCE) => {
  const factionRaces = FACTION_RACES[faction];
  if (Array.isArray(factionRaces) && factionRaces.length > 0) {
    return [...factionRaces];
  }
  const allianceFallback = FACTION_RACES[GUILD_FACTION.ALLIANCE];
  if (Array.isArray(allianceFallback) && allianceFallback.length > 0) {
    return [...allianceFallback];
  }
  return Object.keys(DB_RACES);
};

export const normalizeEquipmentSlots = (equipment = {}) => {
  const safeEquipment =
    equipment && typeof equipment === "object" ? equipment : {};
  const normalized = EQUIPMENT_SLOT_ORDER.reduce((slots, slot) => {
    slots[slot] = null;
    return slots;
  }, {});
  return {
    ...normalized,
    ...safeEquipment,
  };
};

export const getValidRaceClassCombinations = ({
  faction = GUILD_FACTION.ALLIANCE,
  preferredRole = null,
} = {}) => {
  const normalizedPreferredRole = normalizePreferredRole(preferredRole);
  const races = getFactionRaces(faction).filter((race) =>
    Object.prototype.hasOwnProperty.call(DB_RACES, race),
  );
  const candidateRaces = races.length > 0 ? races : Object.keys(DB_RACES);
  return candidateRaces.flatMap((race) =>
    (Array.isArray(DB_RACES[race]) ? DB_RACES[race] : [])
      .filter((charClass) => {
        if (!normalizedPreferredRole) return true;
        const classRoles = Array.isArray(DB_CLASSES?.[charClass]?.allowedRoles)
          ? DB_CLASSES[charClass].allowedRoles
          : [];
        return classRoles.includes(normalizedPreferredRole);
      })
      .map((charClass) => ({ race, charClass })),
  );
};

export const pickValidRaceClassCombination = ({
  faction = GUILD_FACTION.ALLIANCE,
  preferredRole = null,
  random = Math.random,
} = {}) => {
  const safeRandom = typeof random === "function" ? random : Math.random;
  const combinations = getValidRaceClassCombinations({ faction, preferredRole });
  const fallbackCombinations =
    combinations.length > 0
      ? combinations
      : getValidRaceClassCombinations({ faction: GUILD_FACTION.ALLIANCE });
  return fallbackCombinations[
    Math.floor(safeRandom() * fallbackCombinations.length)
  ] || { race: "Human", charClass: "Warrior" };
};

export const getStarterGear = (charClass) => {
  const armorTypes = getClassArmorTypes(charClass);
  const armor = armorTypes[0] || "Cloth";
  const gear = normalizeEquipmentSlots();
  gear.feet = { name: "Worn Boots", quality: 0, type: armor, minLevel: 1 };
  const starterWeapons = {
    Warrior: ["Worn Shortsword", "sword1h", "oneHand"],
    Paladin: ["Worn Warhammer", "mace1h", "oneHand"],
    Hunter: ["Worn Hand Axe", "axe1h", "oneHand"],
    Rogue: ["Worn Dagger", "dagger", "oneHand"],
    Shaman: ["Worn Mace", "mace1h", "oneHand"],
    Priest: ["Worn Mace", "mace1h", "oneHand"],
    Mage: ["Worn Dagger", "dagger", "oneHand"],
    Warlock: ["Worn Dagger", "dagger", "oneHand"],
    Druid: ["Worn Mace", "mace1h", "oneHand"],
  };
  const [weaponName, weaponType, handedness] =
    starterWeapons[charClass] || starterWeapons.Warrior;
  gear.mainHand = {
    id: `starter_${String(charClass || "warrior").toLowerCase()}_main`,
    name: weaponName,
    slot: "mainHand",
    quality: 0,
    type: "Generic",
    minLevel: 1,
    itemLevel: 1,
    equipmentKind: "weapon",
    weaponType,
    handedness,
    allowedClasses: [charClass],
  };
  if (charClass === "Hunter") {
    gear.ranged = {
      id: "starter_hunter_bow",
      name: "Worn Shortbow",
      slot: "ranged",
      quality: 0,
      type: "Generic",
      minLevel: 1,
      itemLevel: 1,
      equipmentKind: "rangedWeapon",
      weaponType: "bow",
      handedness: "ranged",
      allowedClasses: ["Hunter"],
    };
  }
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

const ROLE_POOL = Object.freeze(["Tank", "Healer", "DPS"]);
const ACCENT_VARIANTS = Object.freeze({
  a: ["a", "á", "à"],
  e: ["e", "é", "è"],
  i: ["i", "í", "ì"],
  o: ["o", "ó", "ò"],
  u: ["u", "ú", "ù"],
  y: ["y", "ý", "ỳ"],
});
const DEFAULT_NAME_SYLLABLES = Object.freeze({
  Male: Object.freeze({
    start: Object.freeze(["Ar", "Bel", "Cor", "Dor", "Fen", "Gar", "Tor"]),
    mid: Object.freeze(["a", "e", "i", "o", "an", "en", "or"]),
    end: Object.freeze(["an", "ar", "en", "or", "ric", "th", "us"]),
  }),
  Female: Object.freeze({
    start: Object.freeze(["Al", "Ca", "El", "Li", "Ma", "Na", "Va"]),
    mid: Object.freeze(["ra", "la", "na", "ri", "ly", "el"]),
    end: Object.freeze(["a", "ia", "ra", "la", "elle", "yn"]),
  }),
});
const RACE_NAME_SYLLABLES = Object.freeze({
  Human: Object.freeze({
    Male: Object.freeze({
      start: Object.freeze(["Ar", "Bol", "Dan", "Mar", "Rol", "Tur", "Var"]),
      mid: Object.freeze(["a", "e", "en", "or", "al", "ri"]),
      end: Object.freeze(["an", "ard", "don", "ric", "th", "ion"]),
    }),
    Female: Object.freeze({
      start: Object.freeze(["Ali", "Bry", "Cal", "Ela", "Jai", "Katha", "Tae"]),
      mid: Object.freeze(["ra", "la", "na", "ri", "ly", "el"]),
      end: Object.freeze(["a", "ia", "ra", "elle", "yn"]),
    }),
  }),
  "Night Elf": Object.freeze({
    Male: Object.freeze({
      start: Object.freeze(["Ala", "Cena", "Del", "Illa", "Malf", "Neri", "Tha"]),
      mid: Object.freeze(["ra", "ri", "la", "ne", "the", "dra"]),
      end: Object.freeze(["dor", "ion", "thus", "riel", "ndar", "mir"]),
    }),
    Female: Object.freeze({
      start: Object.freeze(["Ari", "Elyn", "Lyr", "Mai", "Nai", "Sha", "Tyr"]),
      mid: Object.freeze(["ra", "la", "ri", "the", "dra", "lyn"]),
      end: Object.freeze(["a", "ra", "elle", "is", "iel", "wyn"]),
    }),
  }),
  Dwarf: Object.freeze({
    Male: Object.freeze({
      start: Object.freeze(["Bra", "Dur", "Fal", "Gim", "Kur", "Mur", "Thra"]),
      mid: Object.freeze(["a", "o", "ur", "ar", "or"]),
      end: Object.freeze(["din", "gar", "grim", "rik", "sson", "thor"]),
    }),
    Female: Object.freeze({
      start: Object.freeze(["Bry", "Fen", "Hel", "Kil", "Mor", "Sig", "Tor"]),
      mid: Object.freeze(["a", "i", "ra", "ri", "ga"]),
      end: Object.freeze(["a", "da", "dis", "ga", "hild", "ra"]),
    }),
  }),
  Gnome: Object.freeze({
    Male: Object.freeze({
      start: Object.freeze(["Bix", "Cog", "Fizz", "Gel", "Nub", "Raz", "Tink"]),
      mid: Object.freeze(["a", "i", "o", "ik", "oz", "er"]),
      end: Object.freeze(["bin", "bot", "fix", "gon", "ik", "zo"]),
    }),
    Female: Object.freeze({
      start: Object.freeze(["Bub", "Fizz", "Gad", "Kin", "Nix", "Pip", "Zip"]),
      mid: Object.freeze(["a", "i", "ee", "la", "ri"]),
      end: Object.freeze(["a", "ette", "i", "ika", "la", "zi"]),
    }),
  }),
  Orc: Object.freeze({
    Male: Object.freeze({
      start: Object.freeze(["Brox", "Dra", "Gar", "Grom", "Karg", "Naz", "Thr"]),
      mid: Object.freeze(["a", "o", "or", "ug", "ar"]),
      end: Object.freeze(["ash", "gar", "gul", "ok", "rak", "th"]),
    }),
    Female: Object.freeze({
      start: Object.freeze(["Agg", "Dra", "Gar", "Geya", "Kor", "Naz", "Zae"]),
      mid: Object.freeze(["a", "ra", "ga", "ka", "za"]),
      end: Object.freeze(["a", "ga", "ra", "sha", "za"]),
    }),
  }),
  Undead: Object.freeze({
    Male: Object.freeze({
      start: Object.freeze(["Al", "Bel", "Dar", "Hel", "Mor", "Nath", "Var"]),
      mid: Object.freeze(["a", "e", "or", "ul", "en"]),
      end: Object.freeze(["den", "grim", "mar", "reth", "voss", "wyn"]),
    }),
    Female: Object.freeze({
      start: Object.freeze(["Ama", "Lili", "Mor", "Nyx", "Rave", "Syl", "Velo"]),
      mid: Object.freeze(["a", "e", "ra", "ri", "ve"]),
      end: Object.freeze(["a", "elle", "ia", "ra", "voss", "wyn"]),
    }),
  }),
  Tauren: Object.freeze({
    Male: Object.freeze({
      start: Object.freeze(["Bai", "Cair", "Ham", "Kar", "Rath", "Tal", "Tor"]),
      mid: Object.freeze(["a", "o", "u", "an", "or"]),
      end: Object.freeze(["ak", "an", "horn", "ok", "totem", "ul"]),
    }),
    Female: Object.freeze({
      start: Object.freeze(["Apo", "Kaya", "Mag", "May", "Nara", "Tama", "Tora"]),
      mid: Object.freeze(["a", "e", "ra", "la", "na"]),
      end: Object.freeze(["a", "ha", "la", "na", "ra"]),
    }),
  }),
  Troll: Object.freeze({
    Male: Object.freeze({
      start: Object.freeze(["Bwom", "Jin", "Ras", "Rok", "Tal", "Vol", "Zul"]),
      mid: Object.freeze(["a", "i", "o", "an", "ok"]),
      end: Object.freeze(["do", "jin", "kan", "mon", "rok", "zan"]),
    }),
    Female: Object.freeze({
      start: Object.freeze(["Hex", "Loti", "Noka", "Talan", "Yaz", "Zeka", "Zul"]),
      mid: Object.freeze(["a", "i", "ra", "li", "za"]),
      end: Object.freeze(["a", "ji", "la", "na", "ra"]),
    }),
  }),
});

const normalizePreferredRole = (preferredRole) => {
  const safeRole = String(preferredRole || "").trim();
  return ROLE_POOL.includes(safeRole) ? safeRole : null;
};

const normalizeNameValue = (value) => String(value || "").trim();
const normalizeNameKey = (value) => normalizeNameValue(value).toLocaleLowerCase();
const stripNameDigits = (value) => normalizeNameValue(value).replace(/\d+/g, "");

export const buildUsedNameKeySet = (usedNames) => {
  if (usedNames instanceof Set) {
    const normalizedSet = new Set();
    usedNames.forEach((name) => {
      const key = normalizeNameKey(name);
      if (key) normalizedSet.add(key);
    });
    return normalizedSet;
  }
  if (!Array.isArray(usedNames)) return new Set();
  return new Set(
    usedNames
      .map((name) => normalizeNameKey(name))
      .filter(Boolean),
  );
};

const pickRandomEntry = (entries, fallback = "", random = Math.random) => {
  if (!Array.isArray(entries) || entries.length === 0) return fallback;
  const safeRandom = typeof random === "function" ? random : Math.random;
  return entries[Math.floor(safeRandom() * entries.length)] || fallback;
};

const buildNameVariants = (baseName) => {
  const source = stripNameDigits(baseName);
  if (!source) return [];
  const variants = new Set([source]);
  const vowelIndexes = [...source.matchAll(/[aeiouy]/gi)].map(
    (match) => match.index,
  );
  vowelIndexes.forEach((vowelIndex) => {
    if (vowelIndex == null) return;
    const originalChar = source[vowelIndex];
    const lowerOriginal = originalChar.toLocaleLowerCase();
    const accentOptions = ACCENT_VARIANTS[lowerOriginal] || [];
    accentOptions.forEach((option) => {
      if (option === lowerOriginal) return;
      const casedOption =
        originalChar === originalChar.toUpperCase()
          ? option.toUpperCase()
          : option;
      variants.add(`${source.slice(0, vowelIndex)}${casedOption}${source.slice(vowelIndex + 1)}`);
    });
    if (vowelIndex > 1) {
      variants.add(`${source.slice(0, vowelIndex)}'${source.slice(vowelIndex)}`);
    }
  });
  [...source.matchAll(/[a-z]/gi)].forEach((match) => {
    const letterIndex = match.index;
    if (letterIndex == null) return;
    variants.add(
      `${source.slice(0, letterIndex + 1)}${source[letterIndex]}${source.slice(letterIndex + 1)}`,
    );
  });
  return [...variants];
};

const buildAlphabeticNameMutation = (baseName, mutationIndex) => {
  const source = stripNameDigits(baseName).replace(/[^A-Za-zÀ-ÿ']/g, "");
  const fallback = source || "Adventurer";
  const letterIndexes = [...fallback.matchAll(/[A-Za-zÀ-ÿ]/g)].map(
    (match) => match.index,
  );
  if (letterIndexes.length === 0) return "Adventurer";
  if (mutationIndex <= 0) return fallback;
  const targetIndex = letterIndexes[(mutationIndex - 1) % letterIndexes.length];
  const repeatCount = Math.floor((mutationIndex - 1) / letterIndexes.length) + 1;
  const repeatedLetter = fallback[targetIndex].repeat(repeatCount);
  return `${fallback.slice(0, targetIndex + 1)}${repeatedLetter}${fallback.slice(targetIndex + 1)}`;
};

const reserveAlphabeticNameVariants = ({
  baseName,
  reserveIfAvailable,
  maxAttempts = 10000,
}) => {
  for (let mutationIndex = 0; mutationIndex < maxAttempts; mutationIndex += 1) {
    const candidate = buildAlphabeticNameMutation(baseName, mutationIndex);
    const variants = buildNameVariants(candidate);
    for (const variant of variants) {
      const reserved = reserveIfAvailable(variant);
      if (reserved) return reserved;
    }
  }
  return null;
};

const buildProceduralName = (race, gender, random = Math.random) => {
  const safeRandom = typeof random === "function" ? random : Math.random;
  const raceBank = RACE_NAME_SYLLABLES[race] || DEFAULT_NAME_SYLLABLES;
  const genderBank =
    raceBank[gender] || raceBank.Male || raceBank.Female || DEFAULT_NAME_SYLLABLES.Male;
  const start = pickRandomEntry(genderBank.start, "Ar", safeRandom);
  const mid = pickRandomEntry(genderBank.mid, "a", safeRandom);
  const end = pickRandomEntry(genderBank.end, "an", safeRandom);
  const includeMiddle = safeRandom() < 0.65;
  const raw = `${start}${includeMiddle ? mid : ""}${end}`.replace(/[^A-Za-z]/g, "");
  if (!raw) return "Adventurer";
  const normalized = raw.length > 12 ? raw.slice(0, 12) : raw;
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
};

export const buildCharacterNamePool = ({
  race,
  gender,
  charClass,
  includeFunnyName = false,
} = {}) => {
  const raceNames = DB_NAMES[race] || DB_NAMES.Human || {};
  const genderNames = raceNames[gender] || raceNames.Male || [];
  const raceClassNames = DB_RACE_CLASS_NAMES?.[race]?.[charClass] || [];
  const classNames = DB_CLASS_NAMES?.[charClass] || [];
  const funnyNames =
    includeFunnyName && Array.isArray(DB_FUNNY_NAMES) ? DB_FUNNY_NAMES : [];
  return [
    ...raceClassNames,
    ...classNames,
    ...genderNames,
    ...funnyNames,
  ];
};

export const pickUniqueCharacterName = ({
  race,
  gender,
  curatedPool,
  fallbackPool,
  usedNameKeys,
  random = Math.random,
}) => {
  const safeRandom = typeof random === "function" ? random : Math.random;
  const reserveIfAvailable = (candidate) => {
    const cleanCandidate = stripNameDigits(candidate);
    if (!cleanCandidate) return null;
    const key = normalizeNameKey(cleanCandidate);
    if (!key || usedNameKeys.has(key)) return null;
    usedNameKeys.add(key);
    return cleanCandidate;
  };

  const selectedPool = Array.isArray(curatedPool) && curatedPool.length > 0
    ? curatedPool
    : fallbackPool;
  const poolAttempts = Math.max(30, (selectedPool?.length || 0) * 3);
  for (let attempt = 0; attempt < poolAttempts; attempt += 1) {
    const baseName = pickRandomEntry(selectedPool, "Adventurer", safeRandom);
    const variants = buildNameVariants(baseName);
    for (const variant of variants) {
      const reserved = reserveIfAvailable(variant);
      if (reserved) return reserved;
    }
  }

  const proceduralAttempts = 220;
  for (let attempt = 0; attempt < proceduralAttempts; attempt += 1) {
    const generatedName = buildProceduralName(race, gender, safeRandom);
    const variants = buildNameVariants(generatedName);
    for (const variant of variants) {
      const reserved = reserveIfAvailable(variant);
      if (reserved) return reserved;
    }
  }

  const selectedFallbackBase = stripNameDigits(
    pickRandomEntry(fallbackPool, "Adventurer", safeRandom),
  );
  const alphabeticFallback = reserveAlphabeticNameVariants({
    baseName: selectedFallbackBase || "Adventurer",
    reserveIfAvailable,
  });
  if (alphabeticFallback) return alphabeticFallback;

  return buildAlphabeticNameMutation("Adventurer", 10000 + usedNameKeys.size);
};

export const generateCharacter = (
  faction = GUILD_FACTION.ALLIANCE,
  preferredRoleOrOptions = null,
  maybeOptions = {},
) => {
  const preferredRole =
    typeof preferredRoleOrOptions === "string" || preferredRoleOrOptions == null
      ? preferredRoleOrOptions
      : null;
  const options =
    preferredRoleOrOptions &&
    typeof preferredRoleOrOptions === "object" &&
    !Array.isArray(preferredRoleOrOptions)
      ? preferredRoleOrOptions
      : maybeOptions;
  const usedNameKeys =
    options?.usedNameKeys instanceof Set
      ? options.usedNameKeys
      : buildUsedNameKeySet(options?.usedNames);
  const random =
    typeof options?.random === "function" ? options.random : Math.random;
  const characterIdFactory =
    typeof options?.createId === "function" ? options.createId : createId;
  const normalizedPreferredRole = normalizePreferredRole(preferredRole);
  const selectedCombination = pickValidRaceClassCombination({
    faction,
    preferredRole: normalizedPreferredRole,
    random,
  });
  const selectedRace = selectedCombination.race;
  const charClass = selectedCombination.charClass;
  const gender = random() > 0.5 ? "Male" : "Female";
  const fallbackPool =
    DB_NAMES?.Human?.Male && DB_NAMES.Human.Male.length > 0
      ? DB_NAMES.Human.Male
      : ["Adventurer"];
  const funnyPool =
    Array.isArray(DB_FUNNY_NAMES) && DB_FUNNY_NAMES.length > 0
      ? DB_FUNNY_NAMES
      : null;
  const useFunnyName = Boolean(funnyPool) && random() < FUNNY_NAME_CHANCE;
  const selectedPool = buildCharacterNamePool({
    race: selectedRace,
    gender,
    charClass,
    includeFunnyName: useFunnyName,
  });
  const firstName = pickUniqueCharacterName({
    race: selectedRace,
    gender,
    curatedPool: selectedPool.length > 0 ? selectedPool : fallbackPool,
    fallbackPool,
    usedNameKeys,
    random,
  });
  const allowedRoles = Array.isArray(DB_CLASSES?.[charClass]?.allowedRoles)
    ? DB_CLASSES[charClass].allowedRoles
    : ["DPS"];
  const role =
    normalizedPreferredRole && allowedRoles.includes(normalizedPreferredRole)
      ? normalizedPreferredRole
      : allowedRoles[Math.floor(random() * allowedRoles.length)];

  const starterProfs = PROF_PAIRS[charClass] || DEFAULT_PROF_PAIR;
  const professions = starterProfs.map((p) => ({ name: p, skill: 1 }));

  return {
    id: characterIdFactory(),
    name: firstName,
    race: selectedRace,
    gender,
    charClass,
    role,
    level: 1,
    exp: 0,
    maxExp: CONFIG.XP_TABLE[1],
    status: "Idle",
    statusText: "Waiting for orders...",
    activityMode: "Auto",
    morale: 50,
    personalityTraits: rollCharacterPersonalityTraits({ random }),
    professions: professions,
    history: [],
    keys: [],
    adventureGoalQueue: [],
    clearedMissionIds: [],
    pvp: createDefaultPvpData(faction),
    equipment: getStarterGear(charClass),
    lastLevelUp: 0,
    backstory: null,
  };
};

export const generateCharacters = (
  count = 1,
  faction = GUILD_FACTION.ALLIANCE,
  rolePlanOrOptions = [],
  maybeOptions = {},
) => {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  const safeRolePlan = Array.isArray(rolePlanOrOptions) ? rolePlanOrOptions : [];
  const options =
    rolePlanOrOptions &&
    typeof rolePlanOrOptions === "object" &&
    !Array.isArray(rolePlanOrOptions)
      ? rolePlanOrOptions
      : maybeOptions;
  const usedNameKeys =
    options?.usedNameKeys instanceof Set
      ? options.usedNameKeys
      : buildUsedNameKeySet(options?.usedNames);
  return Array.from({ length: safeCount }, (_, index) =>
    generateCharacter(
      faction,
      safeRolePlan[index] || null,
      { ...options, usedNameKeys },
    ),
  );
};
