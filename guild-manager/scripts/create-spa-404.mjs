import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = resolve(rootDir, "dist", "index.html");
const fallbackPath = resolve(rootDir, "dist", "404.html");

await mkdir(dirname(fallbackPath), { recursive: true });
await copyFile(indexPath, fallbackPath);
