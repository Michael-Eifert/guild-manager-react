import { describe, expect, it } from "vitest";
import { optimizeCharacterEquipment } from "../equipment/equipmentLoadouts";
import type { Character } from "../types/characterTypes";
import type { ItemDefinition } from "../types/itemTypes";

const item = (
  id: string,
  itemLevel: number,
  weaponType: ItemDefinition["weaponType"],
  handedness: ItemDefinition["handedness"],
  extra: Partial<ItemDefinition> = {},
): ItemDefinition => ({
  id,
  name: id,
  slot: handedness === "offHand" ? "offHand" : "mainHand",
  quality: 2,
  type: "Generic",
  minLevel: 1,
  itemLevel,
  equipmentKind:
    extra.equipmentKind || (handedness === "offHand" ? "shield" : "weapon"),
  weaponType,
  handedness,
  ...extra,
});

const warrior = (role: "Tank" | "DPS" = "DPS"): Character =>
  ({
    id: "warrior",
    name: "Warrior",
    charClass: "Warrior",
    level: 60,
    role,
    equipment: {},
    personalInventory: [],
  }) as Character;

describe("automatic equipment loadouts", () => {
  it("stores a promising one-hander until a matching offhand arrives", () => {
    const twoHand = item("two-hand", 40, "sword2h", "twoHand");
    const oneHand = item("one-hand", 70, "sword1h", "oneHand");
    const first = optimizeCharacterEquipment({
      character: { ...warrior(), equipment: { mainHand: twoHand } },
      incomingItem: oneHand,
    });
    expect(first.character.equipment?.mainHand?.id).toBe("two-hand");
    expect(first.character.personalInventory?.map((entry) => entry.id)).toContain("one-hand");
    expect(first.outcome).toBe("stored");

    const shield = item("shield", 30, undefined, "offHand", {
      equipmentKind: "shield",
      stats: { stamina: 15, defense: 10 },
    });
    const second = optimizeCharacterEquipment({
      character: first.character,
      incomingItem: shield,
    });
    expect(second.character.equipment?.mainHand?.id).toBe("one-hand");
    expect(second.character.equipment?.offHand?.id).toBe("shield");
  });

  it("switches between a tank pair and a physical DPS two-hander", () => {
    const twoHand = item("dps-two-hand", 55, "sword2h", "twoHand", {
      stats: { strength: 20 },
    });
    const tankMain = item("tank-main", 45, "sword1h", "oneHand", {
      stats: { stamina: 15 },
    });
    const shield = item("tank-shield", 45, undefined, "offHand", {
      equipmentKind: "shield",
      stats: { stamina: 30, defense: 20 },
    });
    const tank = optimizeCharacterEquipment({
      character: {
        ...warrior("Tank"),
        equipment: { mainHand: twoHand },
        personalInventory: [tankMain, shield],
      },
    }).character;
    expect(tank.equipment?.mainHand?.id).toBe("tank-main");
    expect(tank.equipment?.offHand?.id).toBe("tank-shield");

    const dps = optimizeCharacterEquipment({
      character: { ...tank, role: "DPS" },
    }).character;
    expect(dps.equipment?.mainHand?.id).toBe("dps-two-hand");
    expect(dps.equipment?.offHand).toBeNull();
  });

  it("sells a dominated item exactly once", () => {
    const strong = item("strong", 60, "sword2h", "twoHand");
    const weak = item("weak", 10, "sword2h", "twoHand", { sellValue: 7 });
    const result = optimizeCharacterEquipment({
      character: { ...warrior(), equipment: { mainHand: strong } },
      incomingItem: weak,
    });
    expect(result.outcome).toBe("sold");
    expect(result.soldItems.map((entry) => entry.id)).toEqual(["weak"]);
    expect(result.soldGold).toBe(7);

    const again = optimizeCharacterEquipment({ character: result.character });
    expect(again.soldGold).toBe(0);
  });

  it("keeps relevant set pieces and caps the reserve inventory", () => {
    const setPiece = item("set-piece", 5, "sword1h", "oneHand", {
      setId: "future-set",
    });
    const result = optimizeCharacterEquipment({
      character: {
        ...warrior(),
        equipment: { mainHand: item("active", 80, "sword1h", "oneHand") },
        personalInventory: [
          setPiece,
          ...Array.from({ length: 60 }, (_, index) =>
            item(`reserve-${index}`, 10 + index, "sword1h", "oneHand"),
          ),
        ],
      },
    });
    expect(result.character.personalInventory?.map((entry) => entry.id)).toContain("set-piece");
    expect(result.character.personalInventory?.length).toBeLessThanOrEqual(48);
  });

  it("grandfathers invalid legacy gear until a valid replacement exists", () => {
    const legacyWand = item("legacy-wand", 50, "wand", "ranged", {
      slot: "mainHand",
      equipmentKind: "wand",
      legacyCompatibility: true,
    });
    const preserved = optimizeCharacterEquipment({
      character: { ...warrior(), equipment: { mainHand: legacyWand } },
    });
    expect(preserved.character.equipment?.mainHand?.id).toBe("legacy-wand");

    const replacement = item("valid-sword", 20, "sword1h", "oneHand");
    const replaced = optimizeCharacterEquipment({
      character: preserved.character,
      incomingItem: replacement,
    });
    expect(replaced.character.equipment?.mainHand?.id).toBe("valid-sword");
    expect(
      replaced.character.personalInventory?.map((entry) => entry.id),
    ).toContain("legacy-wand");
  });
});
