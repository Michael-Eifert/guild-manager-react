import { mkdir, writeFile } from "node:fs/promises";

const outputDirectory = new URL(
  "../public/generated/content-packs/",
  import.meta.url,
);

const packs = {
  "burning-crusade-v1.json": {
    schemaVersion: 1,
    races: [],
    classes: [],
    zones: [],
    dungeons: [],
    raids: [],
    battlegrounds: [],
    items: [],
    recipes: [],
  },
  "classic-plus-v1.json": {
    schemaVersion: 1,
    races: [],
    classes: [],
    zones: [],
    dungeons: [],
    raids: [],
    battlegrounds: [],
    items: [],
    recipes: [],
  },
};

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  Object.entries(packs).map(([fileName, pack]) =>
    writeFile(
      new URL(fileName, outputDirectory),
      `${JSON.stringify(pack, null, 2)}\n`,
      "utf8",
    ),
  ),
);

console.log(`Generated ${Object.keys(packs).length} content pack manifests.`);
