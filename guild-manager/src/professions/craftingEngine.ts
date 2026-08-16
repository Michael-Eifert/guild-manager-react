import { getSkillCap } from "../game/characterActivity";
import {
  addItemToGuildInventory,
  ensureGuildInventory,
  hasItem,
  removeItemsFromGuildInventory,
} from "../inventory/guildInventoryUtils";
import { getInventoryItemDefinition } from "../inventory/itemDefinitions";
import {
  applyProfessionSkillGain,
  characterHasProfession,
  getCharacterProfessionSkill,
} from "./professionUtils";
import type { Character } from "../types/characterTypes";
import type { GuildInventory } from "../types/itemTypes";
import { getRecipeSkillGainChance, type RecipeDefinition } from "./recipeDefinitions";

interface CraftRecipeInput {
  character: Character;
  recipe: RecipeDefinition;
  guildInventory: GuildInventory;
}

export const canCraftRecipe = ({ character, recipe, guildInventory }: CraftRecipeInput) => {
  if (!character || !recipe) {
    return { canCraft: false, reason: "Missing crafter or recipe." };
  }
  if (!characterHasProfession(character, recipe.profession)) {
    return { canCraft: false, reason: `${character.name} does not know ${recipe.profession}.` };
  }
  const profession = (character.professions || []).find(
    (entry) => entry?.name === recipe.profession,
  );
  if (
    Array.isArray(profession?.knownRecipeIds) &&
    !profession.knownRecipeIds.includes(recipe.id)
  ) {
    return { canCraft: false, reason: `${character.name} has not learned ${recipe.name}.` };
  }
  const skill = getCharacterProfessionSkill(character, recipe.profession);
  if (skill < recipe.requiredSkill) {
    return {
      canCraft: false,
      reason: `Requires ${recipe.profession} ${recipe.requiredSkill}.`,
    };
  }
  if (
    recipe.binding === "bindOnCraft" &&
    Array.isArray(recipe.classRestrictions) &&
    recipe.classRestrictions.length > 0 &&
    !recipe.classRestrictions.includes(String(character.charClass || ""))
  ) {
    return { canCraft: false, reason: `${recipe.name} is restricted to ${recipe.classRestrictions.join(", ")}.` };
  }
  const safeInventory = ensureGuildInventory(guildInventory);
  const missingMaterial = (Array.isArray(recipe.materials) ? recipe.materials : []).find(
    (material) => !hasItem(safeInventory, material.itemId, material.amount),
  );
  if (missingMaterial) {
    const definition = getInventoryItemDefinition(missingMaterial.itemId);
    return {
      canCraft: false,
      reason: `Missing ${definition?.name || missingMaterial.itemId}.`,
    };
  }
  return { canCraft: true, reason: "" };
};

export const craftRecipe = ({
  character,
  recipe,
  guildInventory,
  random = Math.random,
}: CraftRecipeInput & { random?: () => number }) => {
  const craftCheck = canCraftRecipe({ character, recipe, guildInventory });
  const safeInventory = ensureGuildInventory(guildInventory);
  if (!craftCheck.canCraft) {
    return {
      crafted: false,
      reason: craftCheck.reason,
      character,
      guildInventory: safeInventory,
      logs: [],
    };
  }

  let nextInventory = removeItemsFromGuildInventory(safeInventory, recipe.materials);
  if (recipe.type !== "enchant" && recipe.outputItemId) {
    nextInventory = addItemToGuildInventory(
      nextInventory,
      recipe.outputItemId,
      recipe.outputQuantity || 1,
    );
  }

  const roll = typeof random === "function" ? random : Math.random;
  const skill = getCharacterProfessionSkill(character, recipe.profession);
  const maxSkill = getSkillCap(character.level);
  const canGainSkill = skill < maxSkill && skill < 300;
  const gainedSkill = canGainSkill && roll() < getRecipeSkillGainChance(recipe, skill);
  const nextCharacter = gainedSkill
    ? applyProfessionSkillGain({
        character,
        professionName: recipe.profession,
        amount: 1,
        maxSkill,
      })
    : character;
  const outputDefinition = getInventoryItemDefinition(recipe.outputItemId);

  return {
    crafted: true,
    reason: "",
    character: nextCharacter,
    guildInventory: nextInventory,
    outputItemId: recipe.outputItemId,
    outputQuantity: recipe.outputQuantity || 1,
    gainedSkill,
    logs: [
      {
        type: "profession",
        message: `${character.name} crafted ${outputDefinition?.name || recipe.name}.${gainedSkill ? ` ${recipe.profession} +1.` : ""}`,
      },
    ],
  };
};
