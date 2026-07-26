import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/soak/**/*.soak.ts"],
    environment: "node",
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
