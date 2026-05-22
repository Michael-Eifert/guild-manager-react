import {
  ensureGuildInventory,
  getItemQuantity,
  removeItemFromGuildInventory,
} from "../inventory/guildInventoryUtils";
import { getInventoryItemDefinition } from "../inventory/itemDefinitions";

export const CONSUMABLE_MODE = Object.freeze({
  NONE: "none",
  BASIC: "basic",
  BEST: "best",
});

export const CONSUMABLE_MODE_OPTIONS = Object.freeze([
  { value: CONSUMABLE_MODE.NONE, label: "No Consumables" },
  { value: CONSUMABLE_MODE.BASIC, label: "Basic Consumables" },
  { value: CONSUMABLE_MODE.BEST, label: "Best Available" },
]);

export const CONSUMABLE_EFFECTS = Object.freeze({
  minor_healing_potion: {
    dungeonSuccessBonus: 0.02,
    raidSuccessBonus: 0.01,
    wipeChanceReduction: 0.02,
  },
  healing_potion: {
    dungeonSuccessBonus: 0.04,
    raidSuccessBonus: 0.02,
    wipeChanceReduction: 0.04,
  },
  elixir_of_fortitude: {
    dungeonSuccessBonus: 0.03,
    raidSuccessBonus: 0.03,
    wipeChanceReduction: 0.03,
  },
  elixir_of_power: {
    dungeonSuccessBonus: 0.03,
    raidSuccessBonus: 0.04,
    wipeChanceReduction: 0.02,
  },
});

const getEffectForItem = (itemId) =>
  CONSUMABLE_EFFECTS[getInventoryItemDefinition(itemId)?.effect || itemId] || null;

const takeAvailable = ({ guildInventory, itemId, desiredQuantity }) => {
  const available = getItemQuantity(guildInventory, itemId);
  return Math.max(0, Math.min(available, Math.floor(Number(desiredQuantity) || 0)));
};

export const getConsumableMissionModifiers = ({
  mode = CONSUMABLE_MODE.NONE,
  mission,
  partySize = 0,
  guildInventory,
}) => {
  const safeInventory = ensureGuildInventory(guildInventory);
  const safePartySize = Math.max(1, Math.floor(Number(partySize) || 1));
  const groupCount = Math.max(1, Math.ceil(safePartySize / 5));
  const isRaid = mission?.isRaid === true;
  const selected = [];

  if (mode === CONSUMABLE_MODE.BASIC) {
    selected.push({
      itemId: "minor_healing_potion",
      quantity: takeAvailable({
        guildInventory: safeInventory,
        itemId: "minor_healing_potion",
        desiredQuantity: safePartySize,
      }),
      coverageDenominator: safePartySize,
    });
  } else if (mode === CONSUMABLE_MODE.BEST) {
    const healingPotionQuantity = takeAvailable({
      guildInventory: safeInventory,
      itemId: "healing_potion",
      desiredQuantity: safePartySize,
    });
    selected.push({
      itemId: healingPotionQuantity > 0 ? "healing_potion" : "minor_healing_potion",
      quantity:
        healingPotionQuantity > 0
          ? healingPotionQuantity
          : takeAvailable({
              guildInventory: safeInventory,
              itemId: "minor_healing_potion",
              desiredQuantity: safePartySize,
            }),
      coverageDenominator: safePartySize,
    });
    const preferredElixir = isRaid ? "elixir_of_power" : "elixir_of_fortitude";
    const fallbackElixir = isRaid ? "elixir_of_fortitude" : "elixir_of_power";
    const preferredElixirQuantity = takeAvailable({
      guildInventory: safeInventory,
      itemId: preferredElixir,
      desiredQuantity: groupCount,
    });
    selected.push({
      itemId: preferredElixirQuantity > 0 ? preferredElixir : fallbackElixir,
      quantity:
        preferredElixirQuantity > 0
          ? preferredElixirQuantity
          : takeAvailable({
              guildInventory: safeInventory,
              itemId: fallbackElixir,
              desiredQuantity: groupCount,
            }),
      coverageDenominator: groupCount,
    });
  }

  const consumedItems = selected
    .filter((entry) => entry.quantity > 0)
    .map((entry) => {
      const definition = getInventoryItemDefinition(entry.itemId);
      return {
        ...entry,
        name: definition?.name || entry.itemId,
      };
    });

  const totals = consumedItems.reduce(
    (acc, entry) => {
      const effect = getEffectForItem(entry.itemId);
      if (!effect) return acc;
      const coverage = Math.max(
        0,
        Math.min(1, entry.quantity / Math.max(1, entry.coverageDenominator)),
      );
      acc.dungeonSuccessBonus += (effect.dungeonSuccessBonus || 0) * coverage;
      acc.raidSuccessBonus += (effect.raidSuccessBonus || 0) * coverage;
      acc.wipeChanceReduction += (effect.wipeChanceReduction || 0) * coverage;
      return acc;
    },
    { dungeonSuccessBonus: 0, raidSuccessBonus: 0, wipeChanceReduction: 0 },
  );

  const successBonus =
    (isRaid ? totals.raidSuccessBonus : totals.dungeonSuccessBonus) +
    totals.wipeChanceReduction;
  const successBonusPercent = Math.round(successBonus * 100);

  return {
    mode,
    consumedItems,
    effects: totals,
    successBonusPercent,
    failReductionPercent: successBonusPercent,
    hasConsumables: consumedItems.length > 0,
  };
};

export const consumeMissionConsumables = ({
  guildInventory,
  modifiers,
}) => {
  let nextInventory = ensureGuildInventory(guildInventory);
  (Array.isArray(modifiers?.consumedItems) ? modifiers.consumedItems : []).forEach(
    (entry) => {
      nextInventory = removeItemFromGuildInventory(
        nextInventory,
        entry.itemId,
        entry.quantity,
      );
    },
  );
  return nextInventory;
};

export const formatConsumableUseSummary = (modifiers) => {
  const consumedItems = Array.isArray(modifiers?.consumedItems)
    ? modifiers.consumedItems
    : [];
  if (consumedItems.length === 0) return "";
  const itemSummary = consumedItems
    .map((entry) => `${entry.quantity} ${entry.name}`)
    .join(", ");
  const bonus = Number(modifiers?.successBonusPercent) || 0;
  return `${itemSummary}. Success chance +${bonus}%, fail chance -${bonus}%.`;
};
