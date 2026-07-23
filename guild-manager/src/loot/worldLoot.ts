import { DB_CLASSES } from "../constants";
import {
  getClassArmorTypes,
  getItemEffectiveLevel,
  isItemUsableByClass,
} from "../utils";
import type { Character } from "../types/characterTypes";
import type { ItemDefinition } from "../types/itemTypes";

type WorldLootItem = ItemDefinition & {
  slot: string;
  quality: number;
  minLevel: number;
  type: string;
};
type LootCharacter = Character & { charClass: string; level: number };

export type WorldLootLogEntry = {
  type: "loot";
  characterName?: string;
  itemName: string;
  itemQuality: number;
  missionName: string;
  bossName: string | null;
  equipped: boolean;
};

const generateWorldLootForCharacter = ({
  char,
  quality,
  minLevel,
  maxLevel,
  itemDatabase,
}: {
  char: LootCharacter;
  quality: number;
  minLevel: number;
  maxLevel: number;
  itemDatabase: WorldLootItem[];
}): WorldLootItem | null => {
  const classInfo = (DB_CLASSES as Record<string, unknown>)[char.charClass || ""];
  if (!classInfo) return null;

  const allowedTypes = getClassArmorTypes(
    char.charClass,
    char.level,
  ) as string[];
  const safeMinLevel = Math.max(1, Number(minLevel) || 1);
  const safeMaxLevel = Math.max(safeMinLevel, Number(maxLevel) || safeMinLevel);

  const possibleItems = (
    Array.isArray(itemDatabase) ? itemDatabase : []
  ).filter((item) => {
    if (
      (typeof item.dungeon === "string" && item.dungeon.trim()) ||
      (typeof item.dungeonSetId === "string" && item.dungeonSetId.trim())
    ) {
      return false;
    }
    if (item.quality !== quality) return false;
    if (item.minLevel < safeMinLevel || item.minLevel > safeMaxLevel)
      return false;
    if (!isItemUsableByClass(item, char.charClass)) return false;
    return item.type === "Generic" || allowedTypes.includes(item.type);
  });

  if (possibleItems.length === 0) return null;
  return possibleItems[Math.floor(Math.random() * possibleItems.length)];
};

export const generateWorldTickLoot = (
  char: LootCharacter,
  quality: number,
  itemDatabase: WorldLootItem[],
) =>
  generateWorldLootForCharacter({
    char,
    quality,
    minLevel: Math.max(1, char.level - 6),
    maxLevel: char.level,
    itemDatabase,
  });

export const generateZoneCheckpointLoot = (
  char: LootCharacter,
  zone: { minLevel?: number; maxLevel?: number } | null | undefined,
  quality: number,
  itemDatabase: WorldLootItem[],
) => {
  if (!zone) return null;
  return generateWorldLootForCharacter({
    char,
    quality,
    minLevel: Math.max(1, Number(zone?.minLevel) || 1),
    maxLevel: Math.max(1, Number(zone?.maxLevel) || 1),
    itemDatabase,
  });
};

export const applyLootRewardToCharacter = ({
  char,
  lootItem,
  logCollector,
  missionName,
  bossName = null,
  updateStatusText = false,
  logDiscarded = false,
}: {
  char: Character;
  lootItem: WorldLootItem | null | undefined;
  logCollector: WorldLootLogEntry[];
  missionName: string;
  bossName?: string | null;
  updateStatusText?: boolean;
  logDiscarded?: boolean;
}): Character => {
  if (!lootItem) return char;

  const currentItem = char.equipment?.[lootItem.slot];
  const currentItemLevel = getItemEffectiveLevel(currentItem);
  const newItemLevel = getItemEffectiveLevel(lootItem);
  const willEquip = !currentItem || newItemLevel > currentItemLevel;

  if (willEquip || logDiscarded) {
    logCollector.push({
      type: "loot",
      characterName: char.name,
      itemName: lootItem.name,
      itemQuality: lootItem.quality,
      missionName,
      bossName,
      equipped: willEquip,
    });
  }

  if (!willEquip) return char;
  const nextEquipment = { ...char.equipment, [lootItem.slot]: lootItem };
  return {
    ...char,
    equipment: nextEquipment,
    statusText: updateStatusText
      ? `Found [${lootItem.name}] while adventuring.`
      : char.statusText,
  };
};
