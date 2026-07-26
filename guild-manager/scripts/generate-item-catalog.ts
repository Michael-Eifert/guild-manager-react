import { mkdir, writeFile } from "node:fs/promises";
import { DB_ITEMS } from "../src/data/items.js";

const ids = new Set<string>();
const validSlots = new Set([
  "head", "neck", "shoulder", "back", "chest", "wrist", "belt",
  "hands", "legs", "feet", "trinket", "ring", "mainHand", "offHand", "ranged",
]);
for (const item of DB_ITEMS) {
  const id = String(item?.id ?? "").trim();
  if (!id) throw new Error("Every catalog item needs a stable id.");
  if (ids.has(id)) throw new Error(`Duplicate catalog item id: ${id}`);
  ids.add(id);
  const slot = String(item?.slot || "").trim();
  if (!validSlots.has(slot)) {
    throw new Error(`Catalog item ${id} has no equipment slot.`);
  }
  if (["offHand", "ranged"].includes(slot)) {
    if (!item.equipmentKind || !item.handedness) {
      throw new Error(`Weapon-slot item ${id} has incomplete equipment metadata.`);
    }
    if (!Number.isFinite(Number(item.wowheadId)) || Number(item.wowheadId) <= 0) {
      throw new Error(`Weapon-slot item ${id} needs a valid Wowhead id.`);
    }
  }
}

const outputDirectory = new URL("../public/generated/", import.meta.url);
const outputFile = new URL("item-catalog-v15.json", outputDirectory);
await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, JSON.stringify(DB_ITEMS), "utf8");
console.log(`Generated ${DB_ITEMS.length} items at ${outputFile.pathname}.`);
