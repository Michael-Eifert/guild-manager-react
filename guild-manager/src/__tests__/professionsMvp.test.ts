import { describe, expect, it } from "vitest";

import {
  addItemToGuildInventory,
  ensureGuildInventory,
  getItemQuantity,
  hasItem,
  removeItemFromGuildInventory,
} from "../inventory/guildInventoryUtils";
import {
  cleanupGuildStash,
  tryAutoEquipItemFromGuildStash,
} from "../inventory/itemEvaluation";
import { craftRecipe } from "../professions/craftingEngine";
import {
  CONSUMABLE_MODE,
  consumeMissionConsumables,
  getConsumableMissionModifiers,
} from "../professions/consumableEffects";
import { getRecipeDefinition } from "../professions/recipeDefinitions";
import { generatePassiveProfessionMaterial } from "../professions/professionUtils";

const makeCharacter = (overrides = {}) => ({
  id: "char-1",
  name: "Aelira",
  charClass: "Mage",
  level: 20,
  equipment: { chest: null },
  professions: [{ name: "Tailoring", skill: 1 }],
  ...overrides,
});

describe("guild inventory utilities", () => {
  it("normalizes old saves and keeps stack counts non-negative", () => {
    const inventory = ensureGuildInventory(null, {
      materialInventory: { linen_cloth: 4 },
      consumableInventory: { healing_potion: 2 },
    });
    const withMoreCloth = addItemToGuildInventory(inventory, "linen_cloth", 3);
    const afterRemoval = removeItemFromGuildInventory(
      withMoreCloth,
      "linen_cloth",
      99,
    );

    expect(getItemQuantity(inventory, "linen_cloth")).toBe(4);
    expect(getItemQuantity(withMoreCloth, "linen_cloth")).toBe(7);
    expect(getItemQuantity(afterRemoval, "linen_cloth")).toBe(0);
    expect(afterRemoval.items).not.toHaveProperty("linen_cloth");
    expect(hasItem(inventory, "healing_potion", 2)).toBe(true);
  });
});

describe("crafting engine", () => {
  it("consumes materials, creates output, and can increase profession skill", () => {
    const character = makeCharacter();
    const recipe = getRecipeDefinition("recipe_apprentice_cloth_robe");
    const guildInventory = ensureGuildInventory({
      items: { linen_cloth: 6, simple_thread: 1 },
    });
    const result = craftRecipe({
      character,
      recipe,
      guildInventory,
      random: () => 0,
    });

    expect(result.crafted).toBe(true);
    expect(getItemQuantity(result.guildInventory, "linen_cloth")).toBe(0);
    expect(getItemQuantity(result.guildInventory, "apprentice_cloth_robe")).toBe(1);
    expect(result.character.professions[0].skill).toBe(2);
    expect(result.logs[0].message).toContain("crafted Apprentice Cloth Robe");
  });

  it("generates passive material from profession activity", () => {
    const result = generatePassiveProfessionMaterial({
      character: makeCharacter({ professions: [{ name: "Tailoring", skill: 125 }] }),
      professionName: "Tailoring",
      guildInventory: ensureGuildInventory(),
      random: () => 0,
    });

    expect(result.material).toBe("linen_cloth");
    expect(result.quantity).toBe(2);
    expect(getItemQuantity(result.guildInventory, "linen_cloth")).toBe(2);
  });
});

describe("guild stash equipment handling", () => {
  it("auto-equips useful gear and returns replaced profession gear to the stash", () => {
    const roster = [
      makeCharacter({
        level: 30,
        equipment: {
          chest: {
            id: "apprentice_cloth_robe",
            name: "Apprentice Cloth Robe",
            slot: "chest",
            type: "Cloth",
            itemLevel: 16,
          },
        },
      }),
    ];
    const guildInventory = ensureGuildInventory({
      items: { mystic_woolen_gloves: 1, apprentice_cloth_robe: 0 },
    });
    const result = tryAutoEquipItemFromGuildStash({
      itemId: "mystic_woolen_gloves",
      roster,
      guildInventory,
    });

    expect(result.equipped).toBe(true);
    expect(result.roster[0].equipment.hands.name).toBe("Mystic Woolen Gloves");
    expect(getItemQuantity(result.guildInventory, "mystic_woolen_gloves")).toBe(0);
  });

  it("cleans up obsolete stored equipment and reports gold gained", () => {
    const cleanup = cleanupGuildStash({
      guildInventory: ensureGuildInventory({
        items: { apprentice_cloth_robe: 2, linen_cloth: 10 },
      }),
      roster: [makeCharacter({ level: 1 })],
    });

    expect(cleanup.soldQuantity).toBe(2);
    expect(cleanup.goldGained).toBe(6);
    expect(getItemQuantity(cleanup.guildInventory, "linen_cloth")).toBe(10);
  });
});

describe("mission consumables", () => {
  it("calculates and consumes basic dungeon consumables safely", () => {
    const guildInventory = ensureGuildInventory({
      items: { minor_healing_potion: 3 },
    });
    const modifiers = getConsumableMissionModifiers({
      mode: CONSUMABLE_MODE.BASIC,
      mission: { type: "dungeon", name: "The Deadmines" },
      partySize: 5,
      guildInventory,
    });
    const nextInventory = consumeMissionConsumables({
      guildInventory,
      modifiers,
    });

    expect(modifiers.hasConsumables).toBe(true);
    expect(modifiers.successBonusPercent).toBeGreaterThan(0);
    expect(getItemQuantity(nextInventory, "minor_healing_potion")).toBe(0);
  });
});
