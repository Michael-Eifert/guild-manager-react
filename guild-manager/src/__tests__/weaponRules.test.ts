import { describe, expect, it } from "vitest";
import {
  canCharacterDualWield,
  canCharacterEquipItem,
  getThirdWeaponSlotLabel,
  isValidWeaponLoadout,
} from "../equipment/weaponRules";
import type { Character } from "../types/characterTypes";
import type { ItemDefinition, WeaponType } from "../types/itemTypes";
import { getCharacterAverageItemLevel } from "../utils";

const character = (
  charClass: string,
  level = 60,
  role: "Tank" | "Healer" | "DPS" = "DPS",
) => ({ id: `${charClass}-${level}`, name: charClass, charClass, level, role }) as Character;

const weapon = (
  weaponType: WeaponType,
  handedness: ItemDefinition["handedness"] = "oneHand",
): ItemDefinition => ({
  id: `${weaponType}-${handedness}`,
  name: weaponType,
  slot: handedness === "ranged" ? "ranged" : "mainHand",
  minLevel: 1,
  itemLevel: 20,
  equipmentKind:
    weaponType === "wand"
      ? "wand"
      : ["idol", "libram", "totem"].includes(weaponType)
        ? "relic"
        : ["bow", "crossbow", "gun", "thrown"].includes(weaponType)
          ? "rangedWeapon"
          : "weapon",
  weaponType,
  handedness,
});

describe("Classic weapon rules", () => {
  it.each([
    ["Warrior", "sword2h"],
    ["Paladin", "polearm"],
    ["Hunter", "staff"],
    ["Rogue", "fist"],
    ["Shaman", "mace2h"],
    ["Priest", "mace1h"],
    ["Mage", "sword1h"],
    ["Warlock", "dagger"],
    ["Druid", "mace2h"],
  ] as const)("allows %s to use %s", (charClass, weaponType) => {
    expect(canCharacterEquipItem(character(charClass), weapon(weaponType))).toBe(true);
  });

  it.each([
    ["Druid", "polearm"],
    ["Druid", "sword1h"],
    ["Mage", "mace1h"],
    ["Priest", "sword1h"],
    ["Rogue", "axe1h"],
    ["Paladin", "dagger"],
    ["Shaman", "sword1h"],
    ["Hunter", "mace1h"],
    ["Warrior", "wand"],
  ] as const)("rejects %s using %s", (charClass, weaponType) => {
    expect(canCharacterEquipItem(character(charClass), weapon(weaponType))).toBe(false);
  });

  it("enforces the level gates for polearms, dual wield, and shaman two-handers", () => {
    expect(canCharacterEquipItem(character("Paladin", 19), weapon("polearm"))).toBe(false);
    expect(canCharacterEquipItem(character("Paladin", 20), weapon("polearm"))).toBe(true);
    expect(canCharacterDualWield(character("Rogue", 9))).toBe(false);
    expect(canCharacterDualWield(character("Rogue", 10))).toBe(true);
    expect(canCharacterDualWield(character("Warrior", 19))).toBe(false);
    expect(canCharacterDualWield(character("Hunter", 20))).toBe(true);
    expect(canCharacterEquipItem(character("Shaman", 19), weapon("mace2h", "twoHand"))).toBe(false);
    expect(canCharacterEquipItem(character("Shaman", 20), weapon("mace2h", "twoHand"))).toBe(true);
  });

  it("validates shields, frills, dual wield, and two-hand blocking", () => {
    const warrior = character("Warrior");
    const mage = character("Mage");
    const sword = weapon("sword1h");
    const secondSword = { ...sword, id: "second-sword" };
    const shield: ItemDefinition = {
      id: "shield", name: "Shield", slot: "offHand", minLevel: 1,
      equipmentKind: "shield", handedness: "offHand",
    };
    const frill: ItemDefinition = {
      id: "frill", name: "Orb", slot: "offHand", minLevel: 1,
      equipmentKind: "offHandFrill", handedness: "offHand",
    };
    expect(isValidWeaponLoadout(warrior, sword, secondSword)).toBe(true);
    expect(isValidWeaponLoadout(warrior, weapon("sword2h", "twoHand"), shield)).toBe(false);
    expect(canCharacterEquipItem(warrior, shield, "offHand")).toBe(true);
    expect(canCharacterEquipItem(mage, shield, "offHand")).toBe(false);
    expect(canCharacterEquipItem(mage, frill, "offHand")).toBe(true);
  });

  it("uses class-specific labels for the third slot", () => {
    expect(getThirdWeaponSlotLabel("Druid")).toBe("Idol");
    expect(getThirdWeaponSlotLabel("Paladin")).toBe("Libram");
    expect(getThirdWeaponSlotLabel("Shaman")).toBe("Totem");
    expect(getThirdWeaponSlotLabel("Mage")).toBe("Wand");
    expect(getThirdWeaponSlotLabel("Hunter")).toBe("Ranged");
  });

  it("counts a two-hander for both hand slots without penalizing legacy empty slots", () => {
    const twoHand = weapon("staff", "twoHand");
    twoHand.itemLevel = 12;
    const ranged = weapon("wand", "ranged");
    ranged.itemLevel = 24;
    expect(
      getCharacterAverageItemLevel({
        equipment: { mainHand: twoHand, ranged },
      }),
    ).toBe(16);
    expect(
      getCharacterAverageItemLevel({
        equipment: { mainHand: { ...twoHand, handedness: "oneHand" } },
      }),
    ).toBe(12);
  });
});
