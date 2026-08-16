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
import { getRecipeDefinition, getRecipeScrollItemId, RECIPE_DEFINITIONS } from "../professions/recipeDefinitions";
import { generatePassiveProfessionMaterial } from "../professions/professionUtils";
import {
  applyEquipmentEnchant,
  disenchantUnequippedItem,
  learnDroppedRecipe,
  learnTrainerRecipe,
  rollRecipeDrop,
} from "../professions/professionProgression";
import { getItemRoleUtility } from "../equipment/equipmentLoadouts";

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
  it("ships a validated catalog of 35 recipes across five production professions", () => {
    expect(RECIPE_DEFINITIONS).toHaveLength(35);
    expect(new Set(RECIPE_DEFINITIONS.map((recipe) => recipe.profession))).toEqual(
      new Set(["Alchemy", "Blacksmithing", "Enchanting", "Leatherworking", "Tailoring"]),
    );
    expect(RECIPE_DEFINITIONS.every((recipe) => recipe.materials.length > 0)).toBe(true);
  });

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
      character: makeCharacter({ professions: [{ name: "Skinning", skill: 125 }] }),
      professionName: "Skinning",
      guildInventory: ensureGuildInventory(),
      random: () => 0,
    });

    expect(result.material).toBe("light_leather");
    expect(result.quantity).toBe(2);
    expect(getItemQuantity(result.guildInventory, "light_leather")).toBe(2);
  });
});

describe("recipe progression and enchanting", () => {
  it("learns trainer recipes for gold and dropped recipes from the stash", () => {
    const tailor = makeCharacter({
      level: 60,
      professions: [{ name: "Tailoring", skill: 300, knownRecipeIds: ["recipe_apprentice_cloth_robe"] }],
    });
    const trained = learnTrainerRecipe({
      character: tailor,
      recipeId: "recipe_mystic_woolen_gloves",
      guildGold: 20,
    });
    expect(trained.learned).toBe(true);
    expect(trained.guildGold).toBe(15);

    const recipeId = "recipe_robe_of_the_archmage";
    const scrollId = getRecipeScrollItemId(recipeId);
    const learned = learnDroppedRecipe({
      character: trained.character,
      recipeId,
      guildInventory: ensureGuildInventory({ items: { [scrollId]: 1 } }),
    });
    expect(learned.learned).toBe(true);
    expect(getItemQuantity(learned.guildInventory, scrollId)).toBe(0);
    expect(learned.character.professions[0].knownRecipeIds).toContain(recipeId);
  });

  it("rolls boss-specific recipes independently into the guild stash", () => {
    const drop = rollRecipeDrop({
      context: {
        kind: "dungeon",
        dungeonSetId: "blackrock_depths",
        bossName: "Pyromancer Loregrain",
      },
      guildInventory: ensureGuildInventory(),
      random: () => 0,
    });
    expect(drop.dropped).toBe(true);
    expect(drop.recipe?.id).toBe("recipe_enchant_fiery_weapon");
    expect(getItemQuantity(drop.guildInventory, getRecipeScrollItemId(drop.recipe.id))).toBe(1);
  });

  it("disenchants unequipped gear and applies a persistent scored enchant", () => {
    const enchanter = makeCharacter({
      level: 60,
      professions: [{ name: "Enchanting", skill: 300, knownRecipeIds: ["recipe_enchant_crusader"] }],
      equipment: {
        mainHand: { id: "test-sword", name: "Test Sword", slot: "mainHand", type: "Generic", equipmentKind: "weapon", weaponType: "sword1h", handedness: "oneHand", minLevel: 1, itemLevel: 40, stats: { strength: 2 } },
      },
    });
    const itemOwner = makeCharacter({
      id: "char-2",
      name: "Borin",
      charClass: "Warrior",
      professions: [{ name: "Mining", skill: 200 }],
      personalInventory: [
        { id: "old-robe", name: "Old Robe", slot: "chest", type: "Cloth", quality: 2, itemLevel: 20 },
      ],
    });
    const disenchanted = disenchantUnequippedItem({
      character: itemOwner,
      enchanter,
      itemId: "old-robe",
      guildInventory: ensureGuildInventory(),
      random: () => 0,
    });
    expect(disenchanted.disenchanted).toBe(true);
    expect(disenchanted.character.personalInventory).toHaveLength(0);
    expect(getItemQuantity(disenchanted.guildInventory, "vision_dust")).toBe(1);

    const inventory = ensureGuildInventory({ items: { large_brilliant_shard: 2, essence_of_light: 2 } });
    const before = getItemRoleUtility(enchanter, enchanter.equipment.mainHand, "Physical DPS");
    const enchanted = applyEquipmentEnchant({
      enchanter,
      target: enchanter,
      slot: "mainHand",
      recipeId: "recipe_enchant_crusader",
      guildInventory: inventory,
      random: () => 1,
    });
    expect(enchanted.enchanted).toBe(true);
    expect(enchanted.target.equipment.mainHand.enchant?.recipeId).toBe("recipe_enchant_crusader");
    expect(getItemRoleUtility(enchanted.target, enchanted.target.equipment.mainHand, "Physical DPS")).toBeGreaterThan(before);
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
