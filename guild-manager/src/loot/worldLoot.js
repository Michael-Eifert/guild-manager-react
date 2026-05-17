import { DB_CLASSES } from "../constants";
import {
  getClassArmorTypes,
  getItemEffectiveLevel,
  isItemUsableByClass,
} from "../utils";

const generateWorldLootForCharacter = ({
  char,
  quality,
  minLevel,
  maxLevel,
  itemDatabase,
}) => {
  const classInfo = DB_CLASSES[char.charClass];
  if (!classInfo) return null;

  const allowedTypes = getClassArmorTypes(char.charClass, char.level);
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

export const generateWorldTickLoot = (char, quality, itemDatabase) =>
  generateWorldLootForCharacter({
    char,
    quality,
    minLevel: Math.max(1, char.level - 6),
    maxLevel: char.level,
    itemDatabase,
  });

export const generateZoneCheckpointLoot = (char, zone, quality, itemDatabase) => {
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
}) => {
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
