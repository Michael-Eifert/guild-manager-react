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
  ENGINEERING_STRATEGY,
  consumeMissionConsumables,
  getConsumableMissionModifiers,
} from "../professions/consumableEffects";
import { getRecipeDefinition, getRecipeScrollItemId, RECIPE_DEFINITIONS } from "../professions/recipeDefinitions";
import { generatePassiveProfessionMaterial } from "../professions/professionUtils";
import {
  applyEquipmentEnchant,
  disenchantUnequippedItem,
  learnDroppedRecipe,
  learnSecondaryProfession,
  learnTrainerRecipe,
  rollRecipeDrop,
} from "../professions/professionProgression";
import { getItemRoleUtility } from "../equipment/equipmentLoadouts";
import { applyMissionWipeCosts } from "../missions/missionRuntime";
import { getInventoryItemDefinition } from "../inventory/itemDefinitions";

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
  it("ships a validated catalog of 55 recipes across eight production professions", () => {
    expect(RECIPE_DEFINITIONS).toHaveLength(55);
    expect(new Set(RECIPE_DEFINITIONS.map((recipe) => recipe.profession))).toEqual(
      new Set(["Alchemy", "Blacksmithing", "Cooking", "Enchanting", "Engineering", "First Aid", "Leatherworking", "Tailoring"]),
    );
    expect(RECIPE_DEFINITIONS.every((recipe) => recipe.materials.length > 0)).toBe(true);
    expect(RECIPE_DEFINITIONS.every((recipe) => recipe.requiredSkill >= 1 && recipe.requiredSkill <= 300)).toBe(true);
    expect(RECIPE_DEFINITIONS.every((recipe) =>
      recipe.materials.every((entry) => Boolean(getInventoryItemDefinition(entry.itemId))))).toBe(true);
    expect(RECIPE_DEFINITIONS.every((recipe) =>
      recipe.type === "enchant" || Boolean(getInventoryItemDefinition(recipe.outputItemId)))).toBe(true);
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

  it("generates tiered fish through the gathering progression", () => {
    const result = generatePassiveProfessionMaterial({
      character: makeCharacter({ professions: [{ name: "Fishing", skill: 300, kind: "secondary" }] }),
      professionName: "Fishing",
      guildInventory: ensureGuildInventory(),
      random: () => 0.999,
    });
    expect(result.material).toBe("stonescale_eel");
    expect(result.quantity).toBe(4);
  });

  it("adds level-appropriate stone as a Mining byproduct", () => {
    const result = generatePassiveProfessionMaterial({
      character: makeCharacter({ professions: [{ name: "Mining", skill: 230, kind: "primary" }] }),
      professionName: "Mining",
      guildInventory: ensureGuildInventory(),
      random: () => 0,
    });
    expect(result.material).toBe("copper_ore");
    expect(result.byproduct).toBe("dense_stone");
    expect(getItemQuantity(result.guildInventory, "dense_stone")).toBe(1);
  });
});

describe("recipe progression and enchanting", () => {
  it("learns secondary professions without replacing either primary slot", () => {
    const character = makeCharacter({
      professions: [
        { name: "Mining", skill: 1, kind: "primary", knownRecipeIds: [] },
        { name: "Engineering", skill: 1, kind: "primary", knownRecipeIds: ["recipe_rough_dynamite"] },
      ],
    });
    const result = learnSecondaryProfession({ character, professionName: "Cooking", guildGold: 5 });
    expect(result.learned).toBe(true);
    expect(result.guildGold).toBe(4);
    expect(result.character.professions).toHaveLength(3);
    expect(result.character.professions[2]).toEqual({
      name: "Cooking",
      skill: 1,
      kind: "secondary",
      knownRecipeIds: ["recipe_roasted_boar_meat"],
    });
    expect(learnSecondaryProfession({ character: result.character, professionName: "Cooking", guildGold: 5 }).learned).toBe(false);
  });

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

  it("keeps new dungeon recipes on their exact boss sources", () => {
    const wrongBoss = rollRecipeDrop({
      context: { kind: "dungeon", dungeonSetId: "dire_maul", bossName: "Alzzin the Wildshaper", isEndboss: true },
      guildInventory: ensureGuildInventory(),
      random: () => 0,
    });
    const pusillin = rollRecipeDrop({
      context: { kind: "dungeon", dungeonSetId: "dire_maul", bossName: "Pusillin" },
      guildInventory: ensureGuildInventory(),
      random: () => 0,
    });
    expect(wrongBoss.recipe?.id).not.toBe("recipe_runn_tum_tuber_surprise");
    expect(pusillin.recipe?.id).toBe("recipe_runn_tum_tuber_surprise");
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

  it("caps fully covered multi-profession chain preparation at fifteen percent", () => {
    const party = Array.from({ length: 5 }, (_, index) => makeCharacter({
      id: `prepared-${index}`,
      charClass: "Warrior",
      role: index === 0 ? "Tank" : "DPS",
      professions: [
        { name: "Engineering", skill: 300, kind: "primary", knownRecipeIds: [] },
        { name: "First Aid", skill: 225, kind: "secondary", knownRecipeIds: [] },
      ],
    }));
    const guildInventory = ensureGuildInventory({ items: {
      healing_potion: 10,
      flask_of_the_titans: 10,
      smoked_desert_dumplings: 10,
      heavy_runecloth_bandage: 10,
      dense_dynamite: 2,
      field_repair_bot_74a: 2,
      rough_sharpening_stone: 10,
    } });
    const modifiers = getConsumableMissionModifiers({
      mode: CONSUMABLE_MODE.BEST,
      selection: {
        mode: CONSUMABLE_MODE.BEST,
        enabledCategories: { alchemy: true, food: true, firstAid: true, engineering: true, weapon: true },
        engineeringStrategy: ENGINEERING_STRATEGY.OFFENSE,
      },
      mission: { type: "dungeon", name: "Dire Maul East" },
      partySize: 5,
      partyMembers: party,
      chainMultiplier: 2,
      guildInventory,
    });
    const nextInventory = consumeMissionConsumables({ guildInventory, modifiers });

    expect(modifiers.successBonusPercent).toBe(15);
    expect(modifiers.rawBonusPercent).toBe(15);
    expect(modifiers.repairCostMultiplier).toBe(0.5);
    expect(modifiers.categoryBreakdown.map((entry) => entry.bonusPercent)).toEqual([6, 3, 2, 3, 1]);
    expect(modifiers.categoryBreakdown.find((entry) => entry.category === "weapon")).toMatchObject({
      usedUnits: 10,
      requiredUnits: 10,
      eligibleParticipants: 5,
    });
    expect(getItemQuantity(nextInventory, "smoked_desert_dumplings")).toBe(0);
    expect(getItemQuantity(nextInventory, "field_repair_bot_74a")).toBe(0);
  });

  it("requires participant profession skills and applies repair bots to wipe costs", () => {
    const noProfessions = Array.from({ length: 5 }, (_, index) => makeCharacter({ id: `unprepared-${index}`, professions: [] }));
    const modifiers = getConsumableMissionModifiers({
      mode: CONSUMABLE_MODE.BEST,
      mission: { type: "dungeon", name: "Blackrock Depths" },
      partySize: 5,
      partyMembers: noProfessions,
      guildInventory: ensureGuildInventory({ items: { heavy_runecloth_bandage: 5, dense_dynamite: 1 } }),
    });
    expect(modifiers.categoryBreakdown.find((entry) => entry.category === "firstAid")?.bonusPercent).toBe(0);
    expect(modifiers.categoryBreakdown.find((entry) => entry.category === "engineering")?.bonusPercent).toBe(0);
    expect(modifiers.warnings).toHaveLength(2);

    const wipe = applyMissionWipeCosts(
      { type: "dungeon", name: "Blackrock Depths", payoutGold: 100, runPreparation: { repairCostMultiplier: 0.5 } },
      [{ type: "mission-attempt" }],
      100,
    );
    expect(wipe.updatedGold).toBe(95);
    expect(wipe.wipeCostLog?.wipeCost).toBe(5);
  });

  it("excludes untrained heroes from First Aid coverage and consumes one weapon supply per physical hero", () => {
    const party = [
      makeCharacter({ id: "medic", charClass: "Warrior", professions: [{ name: "First Aid", skill: 225, kind: "secondary", knownRecipeIds: [] }] }),
      ...Array.from({ length: 4 }, (_, index) => makeCharacter({ id: `caster-${index}`, charClass: "Mage", professions: [] })),
    ];
    const modifiers = getConsumableMissionModifiers({
      mode: CONSUMABLE_MODE.BEST,
      mission: { type: "dungeon", name: "Scholomance" },
      partySize: 5,
      partyMembers: party,
      guildInventory: ensureGuildInventory({ items: { heavy_runecloth_bandage: 1, rough_sharpening_stone: 1 } }),
    });

    expect(modifiers.categoryBreakdown.find((entry) => entry.category === "firstAid")).toMatchObject({
      bonusPercent: 2,
      coverage: 1,
      usedUnits: 1,
      requiredUnits: 1,
      eligibleParticipants: 1,
    });
    expect(modifiers.categoryBreakdown.find((entry) => entry.category === "weapon")).toMatchObject({
      bonusPercent: 1,
      usedUnits: 1,
      requiredUnits: 1,
      eligibleParticipants: 1,
    });
  });

  it("does not consume Alchemy units whose contribution would exceed the category cap", () => {
    const guildInventory = ensureGuildInventory({ items: {
      major_healing_potion: 5,
      flask_of_the_titans: 5,
    } });
    const modifiers = getConsumableMissionModifiers({
      selection: {
        mode: CONSUMABLE_MODE.BEST,
        enabledCategories: { alchemy: true, food: false, firstAid: false, engineering: false, weapon: false },
        engineeringStrategy: ENGINEERING_STRATEGY.AUTO,
      },
      mission: { type: "dungeon", name: "Upper Blackrock Spire" },
      partySize: 5,
      guildInventory,
    });

    expect(modifiers.successBonusPercent).toBe(5.4);
    expect(modifiers.consumedItems.find((entry) => entry.itemId === "major_healing_potion")?.quantity).toBe(5);
    expect(modifiers.consumedItems.find((entry) => entry.itemId === "flask_of_the_titans")?.quantity).toBe(3);
    const nextInventory = consumeMissionConsumables({ guildInventory, modifiers });
    expect(getItemQuantity(nextInventory, "flask_of_the_titans")).toBe(2);
  });

  it("requires one eligible Engineer per five-player raid group", () => {
    const party = Array.from({ length: 40 }, (_, index) => makeCharacter({
      id: `raider-${index}`,
      professions: index < 8 ? [{ name: "Engineering", skill: 300, kind: "primary", knownRecipeIds: [] }] : [],
    }));
    const modifiers = getConsumableMissionModifiers({
      selection: {
        mode: CONSUMABLE_MODE.BEST,
        enabledCategories: { alchemy: false, food: false, firstAid: false, engineering: true, weapon: false },
        engineeringStrategy: ENGINEERING_STRATEGY.OFFENSE,
      },
      mission: { type: "dungeon", name: "Molten Core", isRaid: true },
      partySize: 40,
      partyMembers: party,
      guildInventory: ensureGuildInventory({ items: { dense_dynamite: 8 } }),
    });

    expect(modifiers.categoryBreakdown.find((entry) => entry.category === "engineering")).toMatchObject({
      bonusPercent: 3,
      coverage: 1,
      usedUnits: 8,
      requiredUnits: 8,
      eligibleParticipants: 8,
    });
  });

  it("uses safety Engineering for dungeon Auto and offense Engineering for raid Auto", () => {
    const engineer = makeCharacter({
      professions: [{ name: "Engineering", skill: 300, kind: "primary", knownRecipeIds: [] }],
    });
    const guildInventory = ensureGuildInventory({ items: { advanced_target_dummy: 1, dense_dynamite: 1 } });
    const getAutoPlan = (isRaid) => getConsumableMissionModifiers({
      selection: {
        mode: CONSUMABLE_MODE.BEST,
        enabledCategories: { alchemy: false, food: false, firstAid: false, engineering: true, weapon: false },
        engineeringStrategy: ENGINEERING_STRATEGY.AUTO,
      },
      mission: { type: "dungeon", name: isRaid ? "Molten Core" : "Blackrock Depths", isRaid },
      partySize: 5,
      partyMembers: [engineer],
      guildInventory,
    });

    expect(getAutoPlan(false).consumedItems.some((entry) => entry.itemId === "advanced_target_dummy")).toBe(true);
    expect(getAutoPlan(true).consumedItems.some((entry) => entry.itemId === "dense_dynamite")).toBe(true);
  });

  it("selects Best food by class preference", () => {
    const modifiers = getConsumableMissionModifiers({
      selection: {
        mode: CONSUMABLE_MODE.BEST,
        enabledCategories: { alchemy: false, food: true, firstAid: false, engineering: false, weapon: false },
        engineeringStrategy: ENGINEERING_STRATEGY.AUTO,
      },
      mission: { type: "dungeon", name: "Dire Maul" },
      partySize: 2,
      partyMembers: [
        makeCharacter({ id: "warrior", charClass: "Warrior", role: "DPS" }),
        makeCharacter({ id: "mage", charClass: "Mage", role: "DPS" }),
      ],
      guildInventory: ensureGuildInventory({ items: { smoked_desert_dumplings: 1, nightfin_soup: 1 } }),
    });

    expect(modifiers.consumedItems.map((entry) => entry.itemId)).toEqual([
      "smoked_desert_dumplings",
      "nightfin_soup",
    ]);
    expect(modifiers.successBonusPercent).toBe(3);
  });
});
