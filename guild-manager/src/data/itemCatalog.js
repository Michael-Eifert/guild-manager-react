import { getItemSource } from "../loot/lootTableHelpers";
import {
  getItemEffectiveLevel,
  isItemUsableByClass,
} from "../utils";

const EMPTY_ITEMS = Object.freeze([]);

let itemCatalogPromise = null;

const hasDungeonSource = (item) =>
  Boolean(
    (typeof item?.dungeon === "string" && item.dungeon.trim()) ||
      (typeof item?.dungeonSetId === "string" && item.dungeonSetId.trim()),
  );

const matchesQuality = (item, quality) => {
  if (quality === undefined || quality === null || quality === "") return true;
  const qualities = Array.isArray(quality) ? quality : [quality];
  const qualitySet = new Set(
    qualities
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value)),
  );
  return qualitySet.size === 0 || qualitySet.has(Number(item?.quality));
};

const matchesLevelRange = (item, minLevel, maxLevel) => {
  const itemLevel = Number(item?.minLevel) || 0;
  const min = Number(minLevel);
  const max = Number(maxLevel);
  if (Number.isFinite(min) && itemLevel < min) return false;
  if (Number.isFinite(max) && itemLevel > max) return false;
  return true;
};

const matchesSource = (item, source) => {
  if (!source) return true;
  const sourceValues = Array.isArray(source) ? source : [source];
  const sourceSet = new Set(
    sourceValues.map((value) => String(value || "").trim()).filter(Boolean),
  );
  if (sourceSet.size === 0) return true;
  return sourceSet.has(getItemSource(item));
};

const matchesClass = (item, className) => {
  const normalizedClassName = String(className || "").trim();
  return !normalizedClassName || isItemUsableByClass(item, normalizedClassName);
};

const matchesSlot = (item, slot) => {
  if (!slot) return true;
  const slots = Array.isArray(slot) ? slot : [slot];
  const slotSet = new Set(
    slots.map((value) => String(value || "").trim()).filter(Boolean),
  );
  return slotSet.size === 0 || slotSet.has(String(item?.slot || ""));
};

export const createItemCatalog = (items = EMPTY_ITEMS) => {
  const allItems = Object.freeze([...(Array.isArray(items) ? items : [])]);
  const itemsById = new Map(
    allItems
      .filter((item) => item?.id !== undefined && item?.id !== null)
      .map((item) => [String(item.id), item]),
  );
  let lootLevelRangesBySource = null;

  return Object.freeze({
    all() {
      return allItems;
    },

    byId(id) {
      return itemsById.get(String(id)) || null;
    },

    query(filters = {}) {
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
      lootLevelRangesBySource = allItems.reduce((ranges, item) => {
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
      }, new Map());
      return lootLevelRangesBySource;
    },
  });
};

export const loadItemCatalog = () => {
  if (!itemCatalogPromise) {
    itemCatalogPromise = import("./items").then(({ DB_ITEMS }) =>
      createItemCatalog(DB_ITEMS),
    );
  }
  return itemCatalogPromise;
};
