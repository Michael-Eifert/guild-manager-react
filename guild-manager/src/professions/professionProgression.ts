import { getItemEffectiveLevel } from "../utils";
import { addItemToGuildInventory, ensureGuildInventory, getItemQuantity, removeItemFromGuildInventory, removeItemsFromGuildInventory } from "../inventory/guildInventoryUtils";
import { getInventoryItemDefinition, toEquipmentItem } from "../inventory/itemDefinitions";
import { applyProfessionSkillGain, getCharacterProfession, getCharacterProfessionSkill } from "./professionUtils";
import { getRecipeDefinition, getRecipeScrollItemId, isDroppedRecipe, RECIPE_DEFINITIONS, type RecipeDefinition } from "./recipeDefinitions";
import type { Character } from "../types/characterTypes";
import type { GuildInventory, ItemDefinition } from "../types/itemTypes";
import { getSkillCap } from "../game/characterActivity";

export const SUPPLY_PRICES = Object.freeze({ simple_thread: 1, coarse_thread: 1, fine_thread: 2, rune_thread: 3, empty_vial: 1, crystal_vial: 3, weak_flux: 1, strong_flux: 3, mild_spices: 1, hot_spices: 2, soothing_spices: 3, refreshing_spring_water: 2, wooden_stock: 1, unstable_trigger: 3, fused_wiring: 8 });

export const SECONDARY_PROFESSION_TRAINING_COST = 1;

export const learnSecondaryProfession = ({ character, professionName, guildGold }: { character: Character; professionName: string; guildGold: number }) => {
  if (!["Cooking", "Fishing", "First Aid"].includes(professionName)) return { learned: false as const, reason: "This is not a secondary profession." };
  if (getCharacterProfession(character, professionName)) return { learned: false as const, reason: `${character.name} already knows ${professionName}.` };
  if ((Number(guildGold) || 0) < SECONDARY_PROFESSION_TRAINING_COST) return { learned: false as const, reason: `Requires ${SECONDARY_PROFESSION_TRAINING_COST}g.` };
  const knownRecipeIds = professionName === "Fishing" ? [] : RECIPE_DEFINITIONS.filter((recipe) => recipe.profession === professionName && recipe.acquisition.kind === "starter").map((recipe) => recipe.id);
  const profession = { name: professionName, skill: 1, kind: "secondary" as const, knownRecipeIds };
  return { learned: true as const, character: { ...character, professions: [...(character.professions || []), profession] }, guildGold: guildGold - SECONDARY_PROFESSION_TRAINING_COST, log: { type: "profession", message: `${character.name} learned ${professionName} for ${SECONDARY_PROFESSION_TRAINING_COST}g.` } };
};

const recipeKnown = (character: Character, recipe: RecipeDefinition) => {
  const profession = getCharacterProfession(character, recipe.profession);
  return !Array.isArray(profession?.knownRecipeIds) || profession.knownRecipeIds.includes(recipe.id);
};

const addKnownRecipe = (character: Character, recipe: RecipeDefinition): Character => ({
  ...character,
  professions: (character.professions || []).map((profession) => profession.name !== recipe.profession ? profession : {
    ...profession,
    knownRecipeIds: [...new Set([...(profession.knownRecipeIds || []), recipe.id])],
  }),
});

export const learnTrainerRecipe = ({ character, recipeId, guildGold }: { character: Character; recipeId: string; guildGold: number }) => {
  const recipe = getRecipeDefinition(recipeId);
  if (!recipe || recipe.acquisition.kind !== "trainer") return { learned: false as const, reason: "This recipe is not sold by a trainer." };
  if (!getCharacterProfession(character, recipe.profession)) return { learned: false as const, reason: `${character.name} does not know ${recipe.profession}.` };
  if (recipeKnown(character, recipe)) return { learned: false as const, reason: `${character.name} already knows ${recipe.name}.` };
  if (getCharacterProfessionSkill(character, recipe.profession) < recipe.requiredSkill) return { learned: false as const, reason: `Requires ${recipe.profession} ${recipe.requiredSkill}.` };
  const cost = Math.max(0, Number(recipe.acquisition.trainerCost) || 0);
  if ((Number(guildGold) || 0) < cost) return { learned: false as const, reason: `Requires ${cost}g.` };
  return { learned: true as const, character: addKnownRecipe(character, recipe), guildGold: guildGold - cost, log: { type: "profession", message: `${character.name} learned ${recipe.name} from a trainer for ${cost}g.` } };
};

export const learnDroppedRecipe = ({ character, recipeId, guildInventory }: { character: Character; recipeId: string; guildInventory: GuildInventory }) => {
  const recipe = getRecipeDefinition(recipeId);
  if (!recipe || !isDroppedRecipe(recipe)) return { learned: false as const, reason: "This is not a dropped recipe." };
  if (!getCharacterProfession(character, recipe.profession)) return { learned: false as const, reason: `${character.name} does not know ${recipe.profession}.` };
  if (recipeKnown(character, recipe)) return { learned: false as const, reason: `${character.name} already knows ${recipe.name}.` };
  if (getCharacterProfessionSkill(character, recipe.profession) < recipe.requiredSkill) return { learned: false as const, reason: `Requires ${recipe.profession} ${recipe.requiredSkill}.` };
  const itemId = getRecipeScrollItemId(recipe.id);
  if (getItemQuantity(guildInventory, itemId) < 1) return { learned: false as const, reason: "The recipe is not in the Guild Stash." };
  return { learned: true as const, character: addKnownRecipe(character, recipe), guildInventory: removeItemFromGuildInventory(guildInventory, itemId, 1), log: { type: "profession", message: `${character.name} learned ${recipe.name}.` } };
};

export const purchaseProfessionSupply = ({ itemId, quantity, guildInventory, guildGold }: { itemId: string; quantity: number; guildInventory: GuildInventory; guildGold: number }) => {
  const amount = Math.max(1, Math.floor(Number(quantity) || 1));
  const unitPrice = (SUPPLY_PRICES as Record<string, number>)[itemId];
  if (!unitPrice) return { purchased: false as const, reason: "This item is not a profession supply." };
  const cost = unitPrice * amount;
  if ((Number(guildGold) || 0) < cost) return { purchased: false as const, reason: `Requires ${cost}g.` };
  const definition = getInventoryItemDefinition(itemId);
  return { purchased: true as const, guildInventory: addItemToGuildInventory(guildInventory, itemId, amount), guildGold: guildGold - cost, log: { type: "profession", message: `Purchased ${amount} ${definition?.name || itemId} for ${cost}g.` } };
};

const getDisenchantYield = (item: ItemDefinition, random: () => number) => {
  const level = getItemEffectiveLevel(item);
  const quality = Number(item.quality) || 1;
  const amount = 1 + Math.floor(random() * 2);
  if (quality >= 4) return { itemId: "large_brilliant_shard", amount };
  if (quality >= 3) return { itemId: level >= 50 ? "small_brilliant_shard" : level >= 30 ? "dream_dust" : "vision_dust", amount };
  return { itemId: level >= 50 ? "illusion_dust" : level >= 30 ? "dream_dust" : level >= 15 ? "vision_dust" : "strange_dust", amount };
};

export const disenchantUnequippedItem = ({ character, enchanter = character, itemId, guildInventory, source = "personal", random = Math.random }: { character: Character; enchanter?: Character; itemId: string; guildInventory: GuildInventory; source?: "personal" | "stash"; random?: () => number }) => {
  if (!getCharacterProfession(enchanter, "Enchanting")) return { disenchanted: false as const, reason: `${enchanter.name} does not know Enchanting.` };
  let item: ItemDefinition | null = null;
  let nextCharacter = character;
  let nextInventory = ensureGuildInventory(guildInventory);
  if (source === "stash") {
    const definition = getInventoryItemDefinition(itemId);
    item = toEquipmentItem(definition);
    if (!item || getItemQuantity(nextInventory, itemId) < 1) return { disenchanted: false as const, reason: "That equipment is not in the Guild Stash." };
    nextInventory = removeItemFromGuildInventory(nextInventory, itemId, 1);
  } else {
    const items = Array.isArray(character.personalInventory) ? character.personalInventory : [];
    const index = items.findIndex((entry) => String(entry.id) === String(itemId));
    if (index < 0) return { disenchanted: false as const, reason: "Only unequipped personal items can be disenchanted." };
    item = items[index];
    nextCharacter = { ...character, personalInventory: items.filter((_, itemIndex) => itemIndex !== index) };
  }
  const output = getDisenchantYield(item, random);
  nextInventory = addItemToGuildInventory(nextInventory, output.itemId, output.amount);
  const outputDefinition = getInventoryItemDefinition(output.itemId);
  return { disenchanted: true as const, character: nextCharacter, guildInventory: nextInventory, output, log: { type: "profession", message: `${enchanter.name} disenchanted ${character.name}'s ${item.name} into ${output.amount} ${outputDefinition?.name || output.itemId}.` } };
};

export const applyEquipmentEnchant = ({ enchanter, target, slot, recipeId, guildInventory, random = Math.random }: { enchanter: Character; target: Character; slot: string; recipeId: string; guildInventory: GuildInventory; random?: () => number }) => {
  const recipe = getRecipeDefinition(recipeId);
  if (!recipe || recipe.type !== "enchant" || !recipe.enchant) return { enchanted: false as const, reason: "Unknown enchant." };
  if (!recipeKnown(enchanter, recipe)) return { enchanted: false as const, reason: `${enchanter.name} has not learned ${recipe.name}.` };
  const skill = getCharacterProfessionSkill(enchanter, recipe.profession);
  if (skill < recipe.requiredSkill) return { enchanted: false as const, reason: `Requires Enchanting ${recipe.requiredSkill}.` };
  if (!recipe.enchant.slots.includes(slot)) return { enchanted: false as const, reason: `${recipe.name} cannot be applied to ${slot}.` };
  const item = target.equipment?.[slot];
  if (!item) return { enchanted: false as const, reason: `${target.name} has no item equipped in ${slot}.` };
  const missing = recipe.materials.find((entry) => getItemQuantity(guildInventory, entry.itemId) < entry.amount);
  if (missing) return { enchanted: false as const, reason: `Missing ${getInventoryItemDefinition(missing.itemId)?.name || missing.itemId}.` };
  const enchantedItem: ItemDefinition = { ...item, enchant: { recipeId: recipe.id, name: recipe.name, stats: recipe.enchant.stats, effectiveLevelBonus: recipe.enchant.effectiveLevelBonus }, boundCharacterId: item.binding === "bindOnEquip" ? target.id : item.boundCharacterId };
  const nextTarget = { ...target, equipment: { ...target.equipment, [slot]: enchantedItem } };
  const maxSkill = Math.min(300, getSkillCap(enchanter.level || 1));
  const gainedSkill = skill < maxSkill && random() < (skill - recipe.requiredSkill >= 75 ? 0 : skill - recipe.requiredSkill >= 50 ? 0.25 : skill - recipe.requiredSkill >= 25 ? 0.6 : 1);
  const nextEnchanter = gainedSkill ? applyProfessionSkillGain({ character: enchanter, professionName: "Enchanting", amount: 1, maxSkill }) : enchanter;
  return { enchanted: true as const, enchanter: nextEnchanter, target: enchanter.id === target.id ? { ...nextTarget, professions: nextEnchanter.professions } : nextTarget, guildInventory: removeItemsFromGuildInventory(guildInventory, recipe.materials), log: { type: "profession", message: `${enchanter.name} applied ${recipe.name} to ${target.name}'s ${item.name}.${gainedSkill ? " Enchanting +1." : ""}` } };
};

export interface RecipeDropContext { kind: "world" | "dungeon" | "raid"; level?: number; zoneId?: string; dungeonSetId?: string; bossName?: string; isEndboss?: boolean }
export const rollRecipeDrop = ({ context, guildInventory, random = Math.random }: { context: RecipeDropContext; guildInventory: GuildInventory; random?: () => number }) => {
  const eligible = RECIPE_DEFINITIONS.filter((recipe) => {
    const source = recipe.acquisition;
    if (source.kind !== context.kind) return false;
    if (context.kind === "world") {
      if ((Number(context.level) || 1) < Math.max(1, recipe.requiredSkill / 5 - 5)) return false;
      return !source.zoneIds?.length || source.zoneIds.includes(String(context.zoneId || ""));
    }
    if (source.dungeonSetIds?.length && !source.dungeonSetIds.includes(String(context.dungeonSetId || ""))) return false;
    if (!source.bossNames?.length) return true;
    const bossName = String(context.bossName || "").toLowerCase();
    if (source.bossNames.some((name) => bossName.includes(name.toLowerCase()) || name.toLowerCase().includes(bossName))) return true;
    return source.strictBossSource !== true && context.isEndboss === true;
  });
  if (eligible.length === 0) return { dropped: false as const, guildInventory: ensureGuildInventory(guildInventory), recipe: null, log: null };
  const successful = eligible.filter((recipe) => random() < Math.max(0, Math.min(1, Number(recipe.acquisition.chance) || 0)));
  if (successful.length === 0) return { dropped: false as const, guildInventory: ensureGuildInventory(guildInventory), recipe: null, log: null };
  const recipe = successful[Math.floor(random() * successful.length)];
  const itemId = getRecipeScrollItemId(recipe.id);
  return { dropped: true as const, guildInventory: addItemToGuildInventory(guildInventory, itemId, 1), recipe, itemId, log: { type: "profession", message: `Found Recipe: ${recipe.name} (${recipe.acquisition.label}).`, itemName: `Recipe: ${recipe.name}`, source: recipe.acquisition.label } };
};

export const rollAdventureMaterial = ({ level, guildInventory, random = Math.random }: { level: number; guildInventory: GuildInventory; random?: () => number }) => {
  if (random() >= 0.18) return { dropped: false as const, guildInventory };
  const cloth = level >= 50 ? "runecloth" : level >= 40 ? "mageweave_cloth" : level >= 30 ? "silk_cloth" : level >= 20 ? "wool_cloth" : "linen_cloth";
  const amount = 1 + Math.floor(random() * 3);
  return { dropped: true as const, guildInventory: addItemToGuildInventory(guildInventory, cloth, amount), itemId: cloth, amount };
};

export const rollCookingIngredientDrop = ({ level, zoneId, dungeonSetId, guildInventory, random = Math.random }: { level: number; zoneId?: string; dungeonSetId?: string; guildInventory: GuildInventory; random?: () => number }) => {
  if (random() >= 0.12) return { dropped: false as const, guildInventory };
  const source = String(dungeonSetId || zoneId || "");
  const itemId = source === "dire_maul"
    ? "runn_tum_tuber"
    : source === "silithus"
      ? "sandworm_meat"
      : level >= 45
        ? "giant_egg"
        : level >= 20
          ? "raptor_egg"
          : "chunk_of_boar_meat";
  const amount = 1 + Math.floor(random() * 2);
  return { dropped: true as const, guildInventory: addItemToGuildInventory(guildInventory, itemId, amount), itemId, amount };
};

export const rollSourceMaterialDrop = ({ dungeonSetId, guildInventory, random = Math.random }: { dungeonSetId?: string; guildInventory: GuildInventory; random?: () => number }) => {
  const source = String(dungeonSetId || "");
  const candidate = source === "molten_core"
    ? { itemId: "fiery_core", chance: 0.35 }
    : source === "scholomance"
      ? { itemId: "essence_of_undeath", chance: 0.2 }
      : source === "blackrock_depths"
        ? { itemId: "dark_iron_ore", chance: 0.25 }
        : null;
  if (!candidate || random() >= candidate.chance) return { dropped: false as const, guildInventory };
  const amount = candidate.itemId === "dark_iron_ore" ? 2 : 1;
  return { dropped: true as const, guildInventory: addItemToGuildInventory(guildInventory, candidate.itemId, amount), itemId: candidate.itemId, amount };
};
