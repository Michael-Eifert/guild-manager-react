import { getItemSource } from "../loot/lootTableHelpers";
import {
  getItemEffectiveLevel,
  isItemUsableByClass,
} from "../utils";
import type { ItemDefinition } from "../types/itemTypes";

export interface ItemCatalogFilters {
  source?: string | string[];
  quality?: number | number[] | string;
  minLevel?: number;
  maxLevel?: number;
  className?: string;
  slot?: string | string[];
  setPiecesOnly?: boolean;
  worldOnly?: boolean;
  dungeonOnly?: boolean;
}

export interface ItemCatalog {
  all: () => readonly ItemDefinition[];
  byId: (id: unknown) => ItemDefinition | null;
  query: (filters?: ItemCatalogFilters) => ItemDefinition[];
  getLootLevelRangesBySource: () => Map<string, { min: number; max: number }>;
}

const EMPTY_ITEMS: readonly ItemDefinition[] = Object.freeze([]);

let itemCatalogPromise: Promise<ItemCatalog> | null = null;

const hasDungeonSource = (item: ItemDefinition) =>
  Boolean(
    (typeof item?.dungeon === "string" && item.dungeon.trim()) ||
      (typeof item?.dungeonSetId === "string" && item.dungeonSetId.trim()),
  );

const matchesQuality = (item: ItemDefinition, quality: ItemCatalogFilters["quality"]) => {
  if (quality === undefined || quality === null || quality === "") return true;
  const qualities = Array.isArray(quality) ? quality : [quality];
  const qualitySet = new Set(
    qualities
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value)),
  );
  return qualitySet.size === 0 || qualitySet.has(Number(item?.quality));
};

const matchesLevelRange = (
  item: ItemDefinition,
  minLevel: number | undefined,
  maxLevel: number | undefined,
) => {
  const itemLevel = Number(item?.minLevel) || 0;
  const min = Number(minLevel);
  const max = Number(maxLevel);
  if (Number.isFinite(min) && itemLevel < min) return false;
  if (Number.isFinite(max) && itemLevel > max) return false;
  return true;
};

const matchesSource = (item: ItemDefinition, source: ItemCatalogFilters["source"]) => {
  if (!source) return true;
  const sourceValues = Array.isArray(source) ? source : [source];
  const sourceSet = new Set(
    sourceValues.map((value) => String(value || "").trim()).filter(Boolean),
  );
  if (sourceSet.size === 0) return true;
  return sourceSet.has(getItemSource(item));
};

const matchesClass = (item: ItemDefinition, className: string | undefined) => {
  const normalizedClassName = String(className || "").trim();
  return !normalizedClassName || isItemUsableByClass(item, normalizedClassName);
};

const matchesSlot = (item: ItemDefinition, slot: ItemCatalogFilters["slot"]) => {
  if (!slot) return true;
  const slots = Array.isArray(slot) ? slot : [slot];
  const slotSet = new Set(
    slots.map((value) => String(value || "").trim()).filter(Boolean),
  );
  return slotSet.size === 0 || slotSet.has(String(item?.slot || ""));
};

export const createItemCatalog = (
  items: readonly ItemDefinition[] = EMPTY_ITEMS,
): ItemCatalog => {
  const allItems = Object.freeze([...(Array.isArray(items) ? items : [])]);
  const itemsById = new Map(
    allItems
      .filter((item) => item?.id !== undefined && item?.id !== null)
      .map((item) => [String(item.id), item]),
  );
  let lootLevelRangesBySource: Map<string, { min: number; max: number }> | null = null;

  return Object.freeze({
    all() {
      return allItems;
    },

    byId(id: unknown) {
      return itemsById.get(String(id)) || null;
    },

    query(filters: ItemCatalogFilters = {}) {
      const {
        source,
        quality,
        minLevel,
        maxLevel,
        className,
        slot,
        setPiecesOnly = false,
        worldOnly = false,
        dungeonOnly = false,
      } = filters || {};

      return allItems.filter((item) => {
        const isDungeonItem = hasDungeonSource(item);
        if (worldOnly && isDungeonItem) return false;
        if (dungeonOnly && !isDungeonItem) return false;
        if (setPiecesOnly && !(item?.setId || item?.pvpGear)) return false;
        if (!matchesSource(item, source)) return false;
        if (!matchesQuality(item, quality)) return false;
        if (!matchesLevelRange(item, minLevel, maxLevel)) return false;
        if (!matchesClass(item, className)) return false;
        if (!matchesSlot(item, slot)) return false;
        return true;
      });
    },

    getLootLevelRangesBySource() {
      if (lootLevelRangesBySource) return lootLevelRangesBySource;
      const calculatedRanges = allItems.reduce((ranges, item) => {
        const source = getItemSource(item);
        const itemLevel = getItemEffectiveLevel(item);
        if (!source || !Number.isFinite(itemLevel) || itemLevel <= 0) {
          return ranges;
        }
        const current = ranges.get(source);
        if (!current) {
          ranges.set(source, { min: itemLevel, max: itemLevel });
          return ranges;
        }
        current.min = Math.min(current.min, itemLevel);
        current.max = Math.max(current.max, itemLevel);
        return ranges;
      }, new Map<string, { min: number; max: number }>());
      lootLevelRangesBySource = calculatedRanges;
      return calculatedRanges;
    },
  });
};

export const loadItemCatalog = () => {
  if (!itemCatalogPromise) {
    const loadItems =
      import.meta.env.MODE === "test"
        ? import("./items").then(({ DB_ITEMS }) => DB_ITEMS)
        : fetch(
            `${import.meta.env.BASE_URL}generated/item-catalog-v15.json`,
            { cache: "force-cache" },
          ).then(async (response) => {
            if (!response.ok) {
              throw new Error(
                `Item catalog request failed (${response.status}).`,
              );
            }
            return (await response.json()) as ItemDefinition[];
          });
    itemCatalogPromise = loadItems
      .then((items) => createItemCatalog(items))
      .catch((error) => {
        itemCatalogPromise = null;
        throw error;
      });
  }
  return itemCatalogPromise;
};
