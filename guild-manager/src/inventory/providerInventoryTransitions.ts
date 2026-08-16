import { craftRecipe } from "../professions/craftingEngine";
import { getRecipeDefinition } from "../professions/recipeDefinitions";
import {
  cleanupGuildStash,
  shouldStoreItem,
  tryAutoEquipItemFromGuildStash,
} from "./itemEvaluation";
import { getInventoryItemDefinition, INVENTORY_ITEM_CATEGORY, toEquipmentItem } from "./itemDefinitions";
import { getItemQuantity, removeItemFromGuildInventory } from "./guildInventoryUtils";
import type { GuildLogEntry } from "../app/gameTypes";
import type { Character } from "../types/characterTypes";
import type { GuildInventory } from "../types/itemTypes";
import type { StashPolicy } from "./itemEvaluation";
import { optimizeCharacterEquipment } from "../equipment/equipmentLoadouts";
import {
  applyEquipmentEnchant,
  disenchantUnequippedItem,
  learnDroppedRecipe,
  learnTrainerRecipe,
  purchaseProfessionSupply,
} from "../professions/professionProgression";

export const craftInventoryRecipe = ({
  characterId,
  recipeId,
  roster,
  guildInventory,
  stashPolicy,
  guildGold,
}: {
  characterId: string;
  recipeId: string;
  roster: Character[];
  guildInventory: GuildInventory;
  stashPolicy: StashPolicy;
  guildGold: number;
}) => {
  const recipe = getRecipeDefinition(recipeId);
  const character = roster.find((member) => member.id === characterId);
  if (!recipe || !character) {
    return { crafted: false as const, reason: "Missing crafter or recipe." };
  }
  const result = craftRecipe({ character, recipe, guildInventory });
  if (!result.crafted) return { crafted: false as const, reason: result.reason };

  let inventory = result.guildInventory;
  let nextRoster = roster.map((member) => member.id === characterId ? result.character : member);
  let gold = guildGold;
  const logs: GuildLogEntry[] = [...result.logs];
  const outputDefinition = getInventoryItemDefinition(result.outputItemId);

  if (outputDefinition?.category === INVENTORY_ITEM_CATEGORY.EQUIPMENT) {
    if (recipe.binding === "bindOnCraft") {
      inventory = removeItemFromGuildInventory(inventory, result.outputItemId, 1);
      const craftedItem = toBoundCraftedItem(outputDefinition, character.id);
      const crafter = nextRoster.find((member) => member.id === character.id);
      if (craftedItem && crafter) {
        const optimized = optimizeBoundCraftedItem(crafter, craftedItem);
        nextRoster = nextRoster.map((member) => member.id === character.id ? optimized.character : member);
        gold += optimized.soldGold;
        logs.push({ type: "profession", message: `${character.name} received bound ${outputDefinition.name}.` });
      }
    } else {
    const equipResult = tryAutoEquipItemFromGuildStash({
      itemId: result.outputItemId,
      roster: nextRoster,
      guildInventory: inventory,
    });
    inventory = equipResult.guildInventory;
    nextRoster = equipResult.roster;
    if (equipResult.log) logs.push(equipResult.log);

    if (
      !equipResult.equipped &&
      recipe?.purpose === "skillup" &&
      !shouldStoreItem({
        itemId: result.outputItemId,
        roster: nextRoster,
        policy: stashPolicy,
      })
    ) {
      const quantity = Math.min(
        result.outputQuantity || 1,
        getItemQuantity(inventory, result.outputItemId),
      );
      if (quantity > 0) {
        inventory = removeItemFromGuildInventory(inventory, result.outputItemId, quantity);
        const saleGold = quantity * Math.max(0, Number(outputDefinition.sellValue) || 0);
        gold += saleGold;
        logs.push({
          type: "profession",
          message: `Sold ${quantity} obsolete ${outputDefinition.name} for ${saleGold}g.`,
        });
      }
    }
    }
  }

  return {
    crafted: true as const,
    roster: nextRoster,
    guildInventory: inventory,
    guildGold: gold,
    logs,
    message: logs[0]?.message || `${character?.name || "Crafter"} completed a recipe.`,
  };
};

const toBoundCraftedItem = (definition: ReturnType<typeof getInventoryItemDefinition>, characterId: string) => {
  if (!definition) return null;
  const item = toEquipmentItem(definition);
  return item ? { ...item, boundCharacterId: characterId } : null;
};

const optimizeBoundCraftedItem = (character: Character, item: NonNullable<ReturnType<typeof toEquipmentItem>>) => {
  const result = optimizeCharacterEquipment({ character, incomingItem: item });
  if (result.outcome !== "sold") return result;
  return {
    ...result,
    character: {
      ...result.character,
      personalInventory: [...(result.character.personalInventory || []), item],
    },
    soldGold: 0,
    outcome: "stored" as const,
  };
};

export const trainProfessionRecipe = ({ characterId, recipeId, roster, guildGold }: { characterId: string; recipeId: string; roster: Character[]; guildGold: number }) => {
  const character = roster.find((member) => member.id === characterId);
  if (!character) return { learned: false as const, reason: "Missing crafter." };
  const result = learnTrainerRecipe({ character, recipeId, guildGold });
  if (!result.learned) return result;
  return { ...result, roster: roster.map((member) => member.id === characterId ? result.character : member) };
};

export const learnProfessionRecipeFromStash = ({ characterId, recipeId, roster, guildInventory }: { characterId: string; recipeId: string; roster: Character[]; guildInventory: GuildInventory }) => {
  const character = roster.find((member) => member.id === characterId);
  if (!character) return { learned: false as const, reason: "Missing crafter." };
  const result = learnDroppedRecipe({ character, recipeId, guildInventory });
  if (!result.learned) return result;
  return { ...result, roster: roster.map((member) => member.id === characterId ? result.character : member) };
};

export const buyProfessionSupply = purchaseProfessionSupply;

export const disenchantProfessionItem = ({ enchanterId, ownerId, itemId, source, roster, guildInventory }: { enchanterId: string; ownerId?: string; itemId: string; source: "personal" | "stash"; roster: Character[]; guildInventory: GuildInventory }) => {
  const enchanter = roster.find((member) => member.id === enchanterId);
  const owner = source === "personal" ? roster.find((member) => member.id === ownerId) : enchanter;
  if (!enchanter || !owner) return { disenchanted: false as const, reason: "Missing enchanter or item owner." };
  const result = disenchantUnequippedItem({ character: owner, enchanter, itemId, guildInventory, source });
  if (!result.disenchanted) return result;
  return { ...result, roster: roster.map((member) => member.id === owner.id ? result.character : member) };
};

export const enchantProfessionEquipment = ({ enchanterId, targetId, slot, recipeId, roster, guildInventory }: { enchanterId: string; targetId: string; slot: string; recipeId: string; roster: Character[]; guildInventory: GuildInventory }) => {
  const enchanter = roster.find((member) => member.id === enchanterId);
  const target = roster.find((member) => member.id === targetId);
  if (!enchanter || !target) return { enchanted: false as const, reason: "Missing enchanter or target." };
  const result = applyEquipmentEnchant({ enchanter, target, slot, recipeId, guildInventory });
  if (!result.enchanted) return result;
  const nextRoster = roster.map((member) => member.id === enchanterId ? result.enchanter : member).map((member) => member.id === targetId ? result.target : member);
  return { ...result, roster: nextRoster };
};

export const sellGuildStashItem = ({
  itemId,
  quantity = 1,
  guildInventory,
  guildGold,
}: {
  itemId: string;
  quantity?: number;
  guildInventory: GuildInventory;
  guildGold: number;
}) => {
  const definition = getInventoryItemDefinition(itemId);
  const sellQuantity = Math.min(
    Math.max(1, Math.floor(Number(quantity) || 1)),
    getItemQuantity(guildInventory, itemId),
  );
  if (!definition || sellQuantity <= 0) return null;
  const saleGold = sellQuantity * Math.max(0, Number(definition.sellValue) || 0);
  return {
    guildInventory: removeItemFromGuildInventory(guildInventory, itemId, sellQuantity),
    guildGold: guildGold + saleGold,
    log: {
      type: "profession",
      message: `Sold ${sellQuantity} ${definition.name} for ${saleGold}g.`,
    } satisfies GuildLogEntry,
  };
};

export const autoEquipGuildStashItem = ({
  itemId,
  roster,
  guildInventory,
}: {
  itemId: string;
  roster: Character[];
  guildInventory: GuildInventory;
}) => tryAutoEquipItemFromGuildStash({ itemId, roster, guildInventory });

export const cleanGuildStash = ({
  roster,
  guildInventory,
  stashPolicy,
  guildGold,
}: {
  roster: Character[];
  guildInventory: GuildInventory;
  stashPolicy: StashPolicy;
  guildGold: number;
}) => {
  const cleanup = cleanupGuildStash({
    guildInventory,
    roster,
    policy: stashPolicy,
  });
  return { ...cleanup, guildGold: guildGold + cleanup.goldGained };
};
