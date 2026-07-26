import { describe, expect, it } from "vitest";

import { createItemCatalog } from "../data/itemCatalog";
import { DB_ITEMS } from "../data/items";

describe("item catalog", () => {
  const items = Object.freeze([
    {
      id: 1,
      name: "Forest Band",
      slot: "ring",
      quality: 2,
      type: "Generic",
      minLevel: 12,
      itemLevel: 18,
    },
    {
      id: 2,
      name: "Molten Helm",
      slot: "head",
      quality: 4,
      type: "Plate",
      minLevel: 60,
      itemLevel: 70,
      dungeonSetName: "Molten Core",
      dungeonSetId: "molten_core",
      setId: "t1_warrior",
      classes: ["Warrior"],
    },
  ]);

  it("loads stable item lookups", () => {
    const catalog = createItemCatalog(items);

    expect(catalog.all()).toHaveLength(2);
    expect(catalog.byId(2)?.name).toBe("Molten Helm");
    expect(catalog.byId("missing")).toBeNull();
  });

  it("queries common item filters", () => {
    const catalog = createItemCatalog(items);

    expect(catalog.query({ worldOnly: true }).map((item) => item.name)).toEqual([
      "Forest Band",
    ]);
    expect(
      catalog.query({ source: "Molten Core", setPiecesOnly: true }).map(
        (item) => item.name,
      ),
    ).toEqual(["Molten Helm"]);
    expect(catalog.query({ quality: [4], className: "Warrior" })).toHaveLength(1);
  });

  it("summarizes loot level ranges by source", () => {
    const catalog = createItemCatalog(items);
    const ranges = catalog.getLootLevelRangesBySource();

    expect(ranges.get("World")).toEqual({ min: 18, max: 18 });
    expect(ranges.get("Molten Core")).toEqual({ min: 70, max: 70 });
  });

  it("keeps generated catalog ids unique and covers every class-specific third slot", () => {
    expect(new Set(DB_ITEMS.map((item) => String(item.id))).size).toBe(
      DB_ITEMS.length,
    );
    DB_ITEMS.filter(
      (item) =>
        ["offHand", "ranged"].includes(String(item.slot)) &&
        item.wowheadId !== undefined,
    ).forEach((item) => {
      expect(Number(item.wowheadId), item.name).toBeGreaterThan(0);
    });
    const expectedTypes = {
      Warrior: ["bow", "crossbow", "gun", "thrown"],
      Hunter: ["bow", "crossbow", "gun", "thrown"],
      Rogue: ["bow", "crossbow", "gun", "thrown"],
      Mage: ["wand"],
      Priest: ["wand"],
      Warlock: ["wand"],
      Druid: ["idol"],
      Paladin: ["libram"],
      Shaman: ["totem"],
    };
    Object.entries(expectedTypes).forEach(([charClass, weaponTypes]) => {
      expect(
        DB_ITEMS.some(
          (item) =>
            item.slot === "ranged" &&
            weaponTypes.includes(String(item.weaponType)) &&
            item.allowedClasses?.includes(charClass),
        ),
        charClass,
      ).toBe(true);
    });
  });
});
