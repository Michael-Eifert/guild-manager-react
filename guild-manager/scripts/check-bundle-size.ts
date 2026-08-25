import { readdir, readFile, stat } from "node:fs/promises";

type BundleMetrics = {
  totalJsBytes: number;
  largestJsBytes: number;
};

type BundleBaseline = BundleMetrics & { allowedIncreasePercent: number };
type DataAssetBaseline = {
  maxDataAssetBytes?: number;
  maxContentPackBytes?: number;
};

const baseline = JSON.parse(
  await readFile(new URL("./bundle-size-baseline.json", import.meta.url), "utf8"),
) as BundleBaseline & DataAssetBaseline;
const assetsDirectory = new URL("../dist/assets/", import.meta.url);
const files = (await readdir(assetsDirectory)).filter((file) => file.endsWith(".js"));
const sizes = await Promise.all(
  files.map(async (file) => (await stat(new URL(file, assetsDirectory))).size),
);
const actual = {
  totalJsBytes: sizes.reduce((total, size) => total + size, 0),
  largestJsBytes: Math.max(0, ...sizes),
};
const failures = (Object.entries(actual) as Array<[
  keyof BundleMetrics,
  number,
]>).filter(([key, value]) => {
  const allowed = Math.ceil(baseline[key] * (1 + baseline.allowedIncreasePercent / 100));
  return value > allowed;
});

console.log(JSON.stringify({ ...actual, chunks: files.length }, null, 2));
if (failures.length > 0) {
  failures.forEach(([key, value]) => {
    const allowed = Math.ceil(baseline[key] * (1 + baseline.allowedIncreasePercent / 100));
    console.error(`${key} is ${value} bytes; allowed maximum is ${allowed} bytes.`);
  });
  process.exitCode = 1;
}

const itemCatalogFile = new URL(
  "../dist/generated/item-catalog-v15.json",
  import.meta.url,
);
const itemCatalogBytes = (await stat(itemCatalogFile)).size;
console.log(JSON.stringify({ itemCatalogBytes }, null, 2));
if (
  Number.isFinite(baseline.maxDataAssetBytes) &&
  itemCatalogBytes > Number(baseline.maxDataAssetBytes)
) {
  console.error(
    `itemCatalogBytes is ${itemCatalogBytes} bytes; allowed maximum is ${baseline.maxDataAssetBytes} bytes.`,
  );
  process.exitCode = 1;
}

const contentPackDirectory = new URL(
  "../dist/generated/content-packs/",
  import.meta.url,
);
const contentPackFiles = (await readdir(contentPackDirectory)).filter((file) =>
  file.endsWith(".json"),
);
const contentPackSizes: Record<string, number> = Object.fromEntries(
  await Promise.all(
    contentPackFiles.map(async (file) => [
      file,
      (await stat(new URL(file, contentPackDirectory))).size,
    ]),
  ),
);
console.log(JSON.stringify({ contentPackSizes }, null, 2));
if (Number.isFinite(baseline.maxContentPackBytes)) {
  Object.entries(contentPackSizes).forEach(([file, bytes]) => {
    if (bytes <= Number(baseline.maxContentPackBytes)) return;
    console.error(
      `${file} is ${bytes} bytes; allowed maximum is ${baseline.maxContentPackBytes} bytes.`,
    );
    process.exitCode = 1;
  });
}
