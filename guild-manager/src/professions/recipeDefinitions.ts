export const CRAFTING_PROFESSIONS = Object.freeze({
  TAILORING: "Tailoring",
  LEATHERWORKING: "Leatherworking",
  ALCHEMY: "Alchemy",
});

export type CraftingProfession =
  typeof CRAFTING_PROFESSIONS[keyof typeof CRAFTING_PROFESSIONS];

export interface RecipeMaterial {
  itemId: string;
  amount: number;
}

export interface RecipeDefinition {
  id: string;
  name: string;
  profession: CraftingProfession;
  requiredSkill: number;
  type: "gear" | "consumable";
  outputItemId: string;
  outputQuantity: number;
  materials: RecipeMaterial[];
  skillGainChance: number;
  purpose: "skillup" | "upgrade" | "consumable";
}

export const RECIPE_DEFINITIONS = Object.freeze([
  {
    id: "recipe_apprentice_cloth_robe",
    name: "Apprentice Cloth Robe",
    profession: CRAFTING_PROFESSIONS.TAILORING,
    requiredSkill: 1,
    type: "gear",
    outputItemId: "apprentice_cloth_robe",
    outputQuantity: 1,
    materials: [
      { itemId: "linen_cloth", amount: 6 },
      { itemId: "simple_thread", amount: 1 },
    ],
    skillGainChance: 0.7,
    purpose: "skillup",
  },
  {
    id: "recipe_mystic_woolen_gloves",
    name: "Mystic Woolen Gloves",
    profession: CRAFTING_PROFESSIONS.TAILORING,
    requiredSkill: 75,
    type: "gear",
    outputItemId: "mystic_woolen_gloves",
    outputQuantity: 1,
    materials: [
      { itemId: "wool_cloth", amount: 8 },
      { itemId: "coarse_thread", amount: 2 },
    ],
    skillGainChance: 0.55,
    purpose: "upgrade",
  },
  {
    id: "recipe_runecloth_mantle",
    name: "Runecloth Mantle",
    profession: CRAFTING_PROFESSIONS.TAILORING,
    requiredSkill: 225,
    type: "gear",
    outputItemId: "runecloth_mantle",
    outputQuantity: 1,
    materials: [
      { itemId: "silk_cloth", amount: 12 },
      { itemId: "coarse_thread", amount: 4 },
    ],
    skillGainChance: 0.35,
    purpose: "upgrade",
  },
  {
    id: "recipe_stitched_leather_vest",
    name: "Stitched Leather Vest",
    profession: CRAFTING_PROFESSIONS.LEATHERWORKING,
    requiredSkill: 1,
    type: "gear",
    outputItemId: "stitched_leather_vest",
    outputQuantity: 1,
    materials: [
      { itemId: "light_leather", amount: 6 },
      { itemId: "coarse_thread", amount: 1 },
    ],
    skillGainChance: 0.7,
    purpose: "skillup",
  },
  {
    id: "recipe_rangers_hunting_gloves",
    name: "Ranger's Hunting Gloves",
    profession: CRAFTING_PROFESSIONS.LEATHERWORKING,
    requiredSkill: 80,
    type: "gear",
    outputItemId: "rangers_hunting_gloves",
    outputQuantity: 1,
    materials: [
      { itemId: "medium_leather", amount: 8 },
      { itemId: "coarse_thread", amount: 2 },
    ],
    skillGainChance: 0.5,
    purpose: "upgrade",
  },
  {
    id: "recipe_wildhide_boots",
    name: "Wildhide Boots",
    profession: CRAFTING_PROFESSIONS.LEATHERWORKING,
    requiredSkill: 220,
    type: "gear",
    outputItemId: "wildhide_boots",
    outputQuantity: 1,
    materials: [
      { itemId: "heavy_leather", amount: 12 },
      { itemId: "coarse_thread", amount: 4 },
    ],
    skillGainChance: 0.35,
    purpose: "upgrade",
  },
  {
    id: "recipe_minor_healing_potion",
    name: "Minor Healing Potion",
    profession: CRAFTING_PROFESSIONS.ALCHEMY,
    requiredSkill: 1,
    type: "consumable",
    outputItemId: "minor_healing_potion",
    outputQuantity: 2,
    materials: [
      { itemId: "peacebloom", amount: 2 },
      { itemId: "empty_vial", amount: 1 },
    ],
    skillGainChance: 0.7,
    purpose: "consumable",
  },
  {
    id: "recipe_healing_potion",
    name: "Healing Potion",
    profession: CRAFTING_PROFESSIONS.ALCHEMY,
    requiredSkill: 75,
    type: "consumable",
    outputItemId: "healing_potion",
    outputQuantity: 2,
    materials: [
      { itemId: "briarthorn", amount: 2 },
      { itemId: "empty_vial", amount: 1 },
    ],
    skillGainChance: 0.5,
    purpose: "consumable",
  },
  {
    id: "recipe_elixir_of_fortitude",
    name: "Elixir of Fortitude",
    profession: CRAFTING_PROFESSIONS.ALCHEMY,
    requiredSkill: 110,
    type: "consumable",
    outputItemId: "elixir_of_fortitude",
    outputQuantity: 1,
    materials: [
      { itemId: "silverleaf", amount: 2 },
      { itemId: "briarthorn", amount: 1 },
      { itemId: "empty_vial", amount: 1 },
    ],
    skillGainChance: 0.45,
    purpose: "consumable",
  },
  {
    id: "recipe_elixir_of_power",
    name: "Elixir of Power",
    profession: CRAFTING_PROFESSIONS.ALCHEMY,
    requiredSkill: 180,
    type: "consumable",
    outputItemId: "elixir_of_power",
    outputQuantity: 1,
    materials: [
      { itemId: "briarthorn", amount: 3 },
      { itemId: "empty_vial", amount: 1 },
    ],
    skillGainChance: 0.4,
    purpose: "consumable",
  },
] satisfies readonly RecipeDefinition[]);

export const getRecipeDefinition = (recipeId: string) =>
  RECIPE_DEFINITIONS.find((recipe) => recipe.id === recipeId) || null;

export const getRecipesForProfession = (professionName: string) =>
  RECIPE_DEFINITIONS.filter((recipe) => recipe.profession === professionName);
