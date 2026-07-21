import { craftRecipe } from "../professions/craftingEngine";
import { getRecipeDefinition } from "../professions/recipeDefinitions";
import {
  cleanupGuildStash,
  shouldStoreItem,
  tryAutoEquipItemFromGuildStash,
} from "./itemEvaluation";
import { getInventoryItemDefinition, INVENTORY_ITEM_CATEGORY } from "./itemDefinitions";
import { getItemQuantity, removeItemFromGuildInventory } from "./guildInventoryUtils";
import type { GuildLogEntry } from "../app/gameTypes";
import type { Character } from "../types/characterTypes";
import type { GuildInventory } from "../types/itemTypes";
import type { StashPolicy } from "./itemEvaluation";

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

  return {
    crafted: true as const,
    roster: nextRoster,
    guildInventory: inventory,
    guildGold: gold,
    logs,
    message: logs[0]?.message || `${character?.name || "Crafter"} completed a recipe.`,
  };
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
