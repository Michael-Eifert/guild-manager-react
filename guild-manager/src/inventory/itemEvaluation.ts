import {
  getClassArmorTypes,
  isItemUsableByClass,
} from "../utils";
import {
  ensureGuildInventory,
  getItemQuantity,
  removeItemFromGuildInventory,
} from "./guildInventoryUtils";
import {
  INVENTORY_ITEM_CATEGORY,
  getInventoryItemDefinition,
  toEquipmentItem,
} from "./itemDefinitions";
import type { Character } from "../types/characterTypes";
import type {
  GuildInventory,
  InventoryItemDefinition,
} from "../types/itemTypes";
import { optimizeCharacterEquipment } from "../equipment/equipmentLoadouts";

export interface StashPolicy {
  keepPotentialUpgrades: boolean;
  keepRareAndEpic: boolean;
  keepCraftedGear: boolean;
  autoSellObsoleteGear: boolean;
  maxStoredEquipmentStacks: number;
}

export const DEFAULT_STASH_POLICY = Object.freeze({
  keepPotentialUpgrades: true,
  keepRareAndEpic: true,
  keepCraftedGear: false,
  autoSellObsoleteGear: true,
  maxStoredEquipmentStacks: 40,
});

export const ensureStashPolicy = (
  existingPolicy: Partial<StashPolicy> | null = null,
): StashPolicy => ({
  ...DEFAULT_STASH_POLICY,
  ...(existingPolicy && typeof existingPolicy === "object" ? existingPolicy : {}),
});

export const getStableInventoryItemId = (
  item: { id?: unknown; itemId?: unknown } | null | undefined,
) =>
  String(item?.id || item?.itemId || "").trim();

export const canCharacterUseInventoryEquipment = (
  character: Character | null | undefined,
  definition: InventoryItemDefinition | null | undefined,
) => {
  if (!character || !definition) return false;
  if (definition.category !== INVENTORY_ITEM_CATEGORY.EQUIPMENT) return false;
  const requiredLevel = Number(definition.levelRequirement || definition.minLevel) || 1;
  if ((Number(character.level) || 1) < requiredLevel) return false;
  const equipmentItem = toEquipmentItem(definition);
  if (!isItemUsableByClass(equipmentItem, character.charClass)) return false;
  const allowedArmorTypes = getClassArmorTypes(character.charClass, character.level);
  const armorType = definition.armorType || definition.type || "Generic";
  return armorType === "Generic" || allowedArmorTypes.includes(armorType);
};

export const getBestUpgradeCandidate = ({ itemId, roster }: {
  itemId: unknown;
  roster: readonly Character[];
}) => {
  const definition = getInventoryItemDefinition(itemId);
  const equipmentItem = toEquipmentItem(definition);
  if (!equipmentItem?.slot) return null;
  const equipmentSlot = equipmentItem.slot;

  return (Array.isArray(roster) ? roster : [])
    .filter((character) => canCharacterUseInventoryEquipment(character, definition))
    .map((character) => {
      const currentItem = character?.equipment?.[equipmentSlot];
      const optimized = optimizeCharacterEquipment({
        character,
        incomingItem: equipmentItem,
      });
      return {
        character,
        currentItem,
        item: equipmentItem,
        optimizedCharacter: optimized.character,
        outcome: optimized.outcome,
        soldGold: optimized.soldGold,
        gain:
          optimized.outcome === "equipped"
            ? Math.max(0.01, optimized.loadoutGain)
            : optimized.outcome === "stored"
              ? 0.01
              : 0,
      };
    })
    .filter((candidate) => candidate.gain > 0)
    .sort((left, right) => {
      if (right.gain !== left.gain) return right.gain - left.gain;
      return String(left.character?.name || "").localeCompare(
        String(right.character?.name || ""),
      );
    })[0] || null;
};

export const isPotentialUpgrade = (itemId: unknown, roster: readonly Character[]) =>
  Boolean(getBestUpgradeCandidate({ itemId, roster }));

export const tryAutoEquipItemFromGuildStash = ({
  itemId,
  roster,
  guildInventory,
}: {
  itemId: unknown;
  roster: Character[];
  guildInventory: GuildInventory;
}) => {
  const safeInventory = ensureGuildInventory(guildInventory);
  const definition = getInventoryItemDefinition(itemId);
  if (getItemQuantity(safeInventory, itemId) <= 0) {
    return { roster, guildInventory: safeInventory, equipped: false, log: null };
  }

  const candidate = getBestUpgradeCandidate({ itemId, roster });
  if (!candidate) {
    return { roster, guildInventory: safeInventory, equipped: false, log: null };
  }

  const nextInventory = removeItemFromGuildInventory(safeInventory, itemId, 1);

  const nextRoster = roster.map((character) => {
    if (character.id !== candidate.character.id) return character;
    if (definition?.binding !== "bindOnEquip") return candidate.optimizedCharacter;
    const bindItem = (item: typeof candidate.item | null | undefined) =>
      item && String(item.id) === String(candidate.item.id)
        ? { ...item, boundCharacterId: character.id }
        : item;
    return {
      ...candidate.optimizedCharacter,
      equipment: Object.fromEntries(
        Object.entries(candidate.optimizedCharacter.equipment || {}).map(([slot, item]) => [slot, bindItem(item)]),
      ),
      personalInventory: (candidate.optimizedCharacter.personalInventory || [])
        .map(bindItem)
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    };
  });

  return {
    roster: nextRoster,
    guildInventory: nextInventory,
    equipped: true,
    soldGold: candidate.soldGold,
    log: {
      type: "profession",
      message: `${candidate.character.name} ${
        candidate.outcome === "stored" ? "stored" : "equipped"
      } ${candidate.item.name} from the Guild Stash.`,
    },
  };
};

export const shouldStoreItem = ({
  itemId,
  roster,
  policy = DEFAULT_STASH_POLICY,
}: {
  itemId: unknown;
  roster: readonly Character[];
  policy?: StashPolicy;
}) => {
  const definition = getInventoryItemDefinition(itemId);
  if (!definition) return false;
  if (definition.category !== INVENTORY_ITEM_CATEGORY.EQUIPMENT) return true;
  const safePolicy = ensureStashPolicy(policy);
  if (safePolicy.keepRareAndEpic && Number(definition.quality) >= 3) return true;
  if (safePolicy.keepPotentialUpgrades && isPotentialUpgrade(itemId, roster)) {
    return true;
  }
  return safePolicy.keepCraftedGear;
};

export const cleanupGuildStash = ({
  guildInventory,
  roster,
  policy = DEFAULT_STASH_POLICY,
}: {
  guildInventory: GuildInventory;
  roster: readonly Character[];
  policy?: StashPolicy;
}) => {
  const safePolicy = ensureStashPolicy(policy);
  let nextInventory = ensureGuildInventory(guildInventory);
  let soldQuantity = 0;
  let goldGained = 0;

  if (!safePolicy.autoSellObsoleteGear) {
    return { guildInventory: nextInventory, soldQuantity, goldGained, logs: [] };
  }

  Object.entries(nextInventory.items).forEach(([itemId, quantity]) => {
    const definition = getInventoryItemDefinition(itemId);
    if (!definition || definition.category !== INVENTORY_ITEM_CATEGORY.EQUIPMENT) {
      return;
    }
    if (shouldStoreItem({ itemId, roster, policy: safePolicy })) return;
    const sellQuantity = Math.max(0, Math.floor(Number(quantity) || 0));
    if (sellQuantity <= 0) return;
    nextInventory = removeItemFromGuildInventory(nextInventory, itemId, sellQuantity);
    soldQuantity += sellQuantity;
    goldGained += sellQuantity * Math.max(0, Number(definition.sellValue) || 0);
  });

  return {
    guildInventory: nextInventory,
    soldQuantity,
    goldGained,
    logs:
      soldQuantity > 0
        ? [
            {
              type: "profession",
              message: `Guild Stash cleanup sold ${soldQuantity} obsolete item${soldQuantity === 1 ? "" : "s"} for ${goldGained}g.`,
            },
          ]
        : [],
  };
};
