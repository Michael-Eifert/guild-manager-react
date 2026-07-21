import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type MigrationManifest = {
  legacyJavaScriptFiles: string[];
};

const JAVASCRIPT_EXTENSION = /\.(?:js|jsx|mjs)$/i;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");

const collectJavaScriptFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return collectJavaScriptFiles(absolutePath);
    return JAVASCRIPT_EXTENSION.test(entry.name) ? [absolutePath] : [];
  }));
  return files.flat();
};

const manifestPath = join(projectRoot, "typescript-migration.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as MigrationManifest;
const approvedLegacyFiles = new Set(manifest.legacyJavaScriptFiles);
const sourceRoots = ["src", "server", "scripts"];
const currentFiles = (await Promise.all(
  sourceRoots.map((directory) => collectJavaScriptFiles(join(projectRoot, directory))),
))
  .flat()
  .map((file) => relative(projectRoot, file).replaceAll("\\", "/"))
  .sort();

const unexpectedFiles = currentFiles.filter((file) => !approvedLegacyFiles.has(file));
if (unexpectedFiles.length > 0) {
  throw new Error(
    `New JavaScript files are not allowed during the TypeScript migration:\n${unexpectedFiles.join("\n")}`,
  );
}

const migratedCount = manifest.legacyJavaScriptFiles.length - currentFiles.length;
console.log(
  `TypeScript migration: ${migratedCount}/${manifest.legacyJavaScriptFiles.length} legacy files migrated; ${currentFiles.length} remaining.`,
);
