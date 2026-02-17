export const SOURCE_WORLD = "World";

export const getItemSource = (item) =>
  item?.dungeon || item?.dungeonSetName || SOURCE_WORLD;

export const getMissionLootSource = (mission) =>
  mission?.dungeonSetName || mission?.name || SOURCE_WORLD;

export const parseRecommendedRange = (recommended) => {
  if (typeof recommended !== "string") return null;
  const values = recommended.match(/\d+/g);
  if (!values || values.length < 2) return null;
  const min = Number(values[0]);
  const max = Number(values[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
};

export const groupByQuality = (items) =>
  items.reduce((acc, item) => {
    const key = item.quality;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

export const sortLootItems = (items) =>
  [...items].sort((a, b) => {
    if (a.quality !== b.quality) return b.quality - a.quality;
    if (a.minLevel !== b.minLevel) return a.minLevel - b.minLevel;
    if (a.slot !== b.slot) return a.slot.localeCompare(b.slot);
    return a.name.localeCompare(b.name);
  });
