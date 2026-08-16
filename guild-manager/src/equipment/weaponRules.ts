import type {
  EquipmentKind,
  EquipmentSlot,
  ItemDefinition,
  WeaponHandedness,
  WeaponType,
} from "../types/itemTypes";
import type { Character } from "../types/characterTypes";

const MELEE_WEAPONS: Readonly<Record<string, readonly WeaponType[]>> = Object.freeze({
  Warrior: ["dagger", "fist", "axe1h", "axe2h", "mace1h", "mace2h", "sword1h", "sword2h", "polearm", "staff"],
  Paladin: ["axe1h", "axe2h", "mace1h", "mace2h", "sword1h", "sword2h", "polearm"],
  Hunter: ["dagger", "fist", "axe1h", "axe2h", "sword1h", "sword2h", "polearm", "staff"],
  Rogue: ["dagger", "fist", "mace1h", "sword1h"],
  Shaman: ["dagger", "fist", "axe1h", "axe2h", "mace1h", "mace2h", "staff"],
  Priest: ["dagger", "mace1h", "staff"],
  Mage: ["dagger", "sword1h", "staff"],
  Warlock: ["dagger", "sword1h", "staff"],
  Druid: ["dagger", "fist", "mace1h", "mace2h", "staff"],
});

const RANGED_WEAPONS: Readonly<Record<string, readonly WeaponType[]>> = Object.freeze({
  Warrior: ["bow", "crossbow", "gun", "thrown"],
  Hunter: ["bow", "crossbow", "gun", "thrown"],
  Rogue: ["bow", "crossbow", "gun", "thrown"],
  Priest: ["wand"],
  Mage: ["wand"],
  Warlock: ["wand"],
  Druid: ["idol"],
  Paladin: ["libram"],
  Shaman: ["totem"],
});

const DUAL_WIELD_LEVEL: Readonly<Record<string, number>> = Object.freeze({
  Rogue: 10,
  Warrior: 20,
  Hunter: 20,
});

const SHIELD_CLASSES = new Set(["Warrior", "Paladin", "Shaman"]);
const TWO_HAND_TYPES = new Set<WeaponType>([
  "axe2h", "mace2h", "sword2h", "polearm", "staff",
]);
const RANGED_TYPES = new Set<WeaponType>([
  "bow", "crossbow", "gun", "thrown", "wand", "idol", "libram", "totem",
]);

const normalizeClassName = (characterOrClass: Character | string | null | undefined) =>
  typeof characterOrClass === "string"
    ? characterOrClass
    : String(characterOrClass?.charClass || characterOrClass?.className || "");

const getCharacterLevel = (characterOrClass: Character | string | null | undefined) =>
  typeof characterOrClass === "string"
    ? 60
    : Math.max(1, Number(characterOrClass?.level) || 1);

export const inferEquipmentKind = (item?: ItemDefinition | null): EquipmentKind => {
  if (item?.equipmentKind) return item.equipmentKind;
  if (item?.weaponType === "wand") return "wand";
  if (item?.weaponType && ["idol", "libram", "totem"].includes(item.weaponType)) return "relic";
  if (item?.weaponType && ["bow", "crossbow", "gun", "thrown"].includes(item.weaponType)) return "rangedWeapon";
  if (item?.slot === "offHand") return "offHandFrill";
  if (item?.slot === "ranged") return "rangedWeapon";
  if (item?.slot === "mainHand") return "weapon";
  return "armor";
};

export const inferHandedness = (item?: ItemDefinition | null): WeaponHandedness | null => {
  if (item?.handedness) return item.handedness;
  if (item?.weaponType && TWO_HAND_TYPES.has(item.weaponType)) return "twoHand";
  if (item?.weaponType && RANGED_TYPES.has(item.weaponType)) return "ranged";
  if (item?.slot === "offHand") return "offHand";
  if (item?.slot === "ranged") return "ranged";
  if (item?.slot === "mainHand") return "mainHand";
  return null;
};

export const isTwoHandedItem = (item?: ItemDefinition | null) =>
  inferHandedness(item) === "twoHand";

export const canCharacterDualWield = (character: Character | null | undefined) => {
  const className = normalizeClassName(character);
  const requiredLevel = DUAL_WIELD_LEVEL[className];
  return Number.isFinite(requiredLevel) && getCharacterLevel(character) >= requiredLevel;
};

export const getThirdWeaponSlotLabel = (characterOrClass: Character | string) => {
  const className = normalizeClassName(characterOrClass);
  if (className === "Druid") return "Idol";
  if (className === "Paladin") return "Libram";
  if (className === "Shaman") return "Totem";
  if (["Mage", "Priest", "Warlock"].includes(className)) return "Wand";
  return "Ranged";
};

export const getItemEquipTargets = (
  character: Character,
  item: ItemDefinition,
): EquipmentSlot[] => {
  const kind = inferEquipmentKind(item);
  const handedness = inferHandedness(item);
  if (kind === "armor") return item.slot ? [item.slot as EquipmentSlot] : [];
  if (kind === "shield" || kind === "offHandFrill" || handedness === "offHand") return ["offHand"];
  if (kind === "rangedWeapon" || kind === "wand" || kind === "relic" || handedness === "ranged") return ["ranged"];
  if (handedness === "oneHand" && canCharacterDualWield(character)) return ["mainHand", "offHand"];
  return ["mainHand"];
};

export const canCharacterEquipItem = (
  character: Character | null | undefined,
  item: ItemDefinition | null | undefined,
  targetSlot?: EquipmentSlot,
) => {
  if (!character || !item) return false;
  if (item.boundCharacterId && String(item.boundCharacterId) !== String(character.id)) return false;
  if (item.legacyCompatibility && !targetSlot) return true;
  const level = getCharacterLevel(character);
  if (level < Math.max(1, Number(item.minLevel) || 1)) return false;
  const className = normalizeClassName(character);
  if (Array.isArray(item.allowedClasses) && item.allowedClasses.length > 0 && !item.allowedClasses.includes(className)) {
    return false;
  }

  const kind = inferEquipmentKind(item);
  if (kind === "armor") {
    return !targetSlot || getItemEquipTargets(character, item).includes(targetSlot);
  }
  if (kind === "shield" && !SHIELD_CLASSES.has(className)) return false;
  if (kind === "offHandFrill") {
    if (!["Druid", "Paladin", "Shaman", "Priest", "Mage", "Warlock"].includes(className)) return false;
  }

  const weaponType = item.weaponType;
  if (weaponType) {
    const allowed = RANGED_TYPES.has(weaponType)
      ? RANGED_WEAPONS[className] || []
      : MELEE_WEAPONS[className] || [];
    if (!allowed.includes(weaponType)) return false;
    if (weaponType === "polearm" && level < 20) return false;
    if (className === "Shaman" && ["axe2h", "mace2h"].includes(weaponType) && level < 20) return false;
  }

  const targets = getItemEquipTargets(character, item);
  return !targetSlot || targets.includes(targetSlot);
};

export const isValidWeaponLoadout = (
  character: Character,
  mainHand?: ItemDefinition | null,
  offHand?: ItemDefinition | null,
) => {
  if (mainHand && !canCharacterEquipItem(character, mainHand, "mainHand")) return false;
  if (offHand && !canCharacterEquipItem(character, offHand, "offHand")) return false;
  if (!offHand) return true;
  if (
    mainHand &&
    String(mainHand.id ?? "") === String(offHand.id ?? "") &&
    mainHand === offHand
  ) {
    return false;
  }
  if (!mainHand || isTwoHandedItem(mainHand)) return false;
  const offKind = inferEquipmentKind(offHand);
  if (offKind === "weapon" && !canCharacterDualWield(character)) return false;
  return true;
};
