import type { GuildInventory, InventoryEntry } from "../types/itemTypes";

type LegacyInventorySources = {
  materialInventory?: Record<string, number>;
  consumableInventory?: Record<string, number>;
};

export const EMPTY_GUILD_INVENTORY: Readonly<GuildInventory> = Object.freeze({
  items: Object.freeze({}),
});

const normalizeItemId = (itemId: unknown) => String(itemId || "").trim();

const normalizeQuantity = (quantity: unknown) => {
  const numeric = Number(quantity);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
};

export const cleanupZeroQuantityItems = (guildInventory: GuildInventory | null | undefined): GuildInventory => {
  const safeItems =
    guildInventory?.items && typeof guildInventory.items === "object"
      ? guildInventory.items
      : {};
  const items = Object.entries(safeItems).reduce<Record<string, number>>((acc, [itemId, quantity]) => {
    const normalizedItemId = normalizeItemId(itemId);
    const normalizedQuantity = normalizeQuantity(quantity);
    if (normalizedItemId && normalizedQuantity > 0) {
      acc[normalizedItemId] = normalizedQuantity;
    }
    return acc;
  }, {});
  return { items };
};

export const ensureGuildInventory = (
  existingInventory: GuildInventory | null | undefined = null,
  fallbackSources: LegacyInventorySources = {},
): GuildInventory => {
  const baseInventory = cleanupZeroQuantityItems(existingInventory);
  const mergedItems: Record<string, number> = { ...baseInventory.items };

  [fallbackSources.materialInventory, fallbackSources.consumableInventory]
    .forEach((source) => {
      if (!source) return;
      Object.entries(source).forEach(([itemId, quantity]) => {
        const normalizedItemId = normalizeItemId(itemId);
        const normalizedQuantity = normalizeQuantity(quantity);
        if (!normalizedItemId || normalizedQuantity <= 0) return;
        mergedItems[normalizedItemId] =
          (mergedItems[normalizedItemId] || 0) + normalizedQuantity;
      });
    });

  return cleanupZeroQuantityItems({ items: mergedItems });
};

export const getItemQuantity = (guildInventory: GuildInventory | null | undefined, itemId: unknown) => {
  const normalizedItemId = normalizeItemId(itemId);
  if (!normalizedItemId) return 0;
  return normalizeQuantity(guildInventory?.items?.[normalizedItemId]);
};

export const hasItem = (guildInventory: GuildInventory | null | undefined, itemId: unknown, quantity: unknown = 1) =>
  getItemQuantity(guildInventory, itemId) >= normalizeQuantity(quantity || 1);

export const addItemToGuildInventory = (
  guildInventory: GuildInventory | null | undefined,
  itemId: unknown,
  quantity: unknown = 1,
): GuildInventory => {
  const normalizedItemId = normalizeItemId(itemId);
  const normalizedQuantity = normalizeQuantity(quantity);
  const safeInventory = ensureGuildInventory(guildInventory);
  if (!normalizedItemId || normalizedQuantity <= 0) return safeInventory;
  return {
    items: {
      ...safeInventory.items,
      [normalizedItemId]:
        (safeInventory.items[normalizedItemId] || 0) + normalizedQuantity,
    },
  };
};

export const removeItemFromGuildInventory = (
  guildInventory: GuildInventory | null | undefined,
  itemId: unknown,
  quantity: unknown = 1,
): GuildInventory => {
  const normalizedItemId = normalizeItemId(itemId);
  const normalizedQuantity = normalizeQuantity(quantity);
  const safeInventory = ensureGuildInventory(guildInventory);
  if (!normalizedItemId || normalizedQuantity <= 0) return safeInventory;

  const currentQuantity = getItemQuantity(safeInventory, normalizedItemId);
  const nextQuantity = Math.max(0, currentQuantity - normalizedQuantity);
  const nextItems = { ...safeInventory.items };
  if (nextQuantity <= 0) {
    delete nextItems[normalizedItemId];
  } else {
    nextItems[normalizedItemId] = nextQuantity;
  }
  return { items: nextItems };
};

export const addItemsToGuildInventory = (
  guildInventory: GuildInventory | null | undefined,
  entries: readonly InventoryEntry[] = [],
) =>
  (Array.isArray(entries) ? entries : []).reduce(
    (inventory, entry) =>
      addItemToGuildInventory(inventory, entry?.itemId, entry?.amount ?? entry?.quantity ?? 1),
    ensureGuildInventory(guildInventory),
  );

export const removeItemsFromGuildInventory = (
  guildInventory: GuildInventory | null | undefined,
  entries: readonly InventoryEntry[] = [],
) =>
  (Array.isArray(entries) ? entries : []).reduce(
    (inventory, entry) =>
      removeItemFromGuildInventory(
        inventory,
        entry?.itemId,
        entry?.amount ?? entry?.quantity ?? 1,
      ),
    ensureGuildInventory(guildInventory),
  );
