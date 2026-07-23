import { DEFAULT_DUNGEON_LOOT_TABLE } from "../constants";
import { getDungeonBossCount } from "../missions/missionHelpers";
import type { Mission } from "../types/missionTypes";

type LootWeightInput = { quality?: unknown; chance?: unknown };
type DungeonStepLootConfig = {
  weights?: LootWeightInput[];
  source?: string;
  includeWorldDrops?: boolean;
  dungeonOnly?: boolean;
  worldOnly?: boolean;
};
type DungeonLootTable = {
  steps?: unknown[];
  boss?: unknown;
  endboss?: unknown;
};

const parseDungeonStepLootConfig = (
  entry: unknown,
): DungeonStepLootConfig => {
  if (Array.isArray(entry)) {
    return { weights: entry };
  }
  if (!entry || typeof entry !== "object") {
    return {};
  }
  const record = entry as Record<string, unknown>;
  return {
    weights: Array.isArray(record.weights) ? record.weights : [],
    source: typeof record.source === "string" ? record.source : undefined,
    includeWorldDrops:
      typeof record.includeWorldDrops === "boolean"
        ? record.includeWorldDrops
        : undefined,
    dungeonOnly:
      typeof record.dungeonOnly === "boolean" ? record.dungeonOnly : undefined,
    worldOnly:
      typeof record.worldOnly === "boolean" ? record.worldOnly : undefined,
  };
};

const resolveDungeonDropSource = (
  stepConfig: DungeonStepLootConfig,
  isEndboss: boolean,
) => {
  const defaultSource = isEndboss ? "dungeon" : "mixed";
  const source = String(stepConfig.source || defaultSource).toLowerCase();

  let sourceOptions;
  if (source === "dungeon") {
    sourceOptions = {
      includeWorldDrops: false,
      dungeonOnly: true,
      worldOnly: false,
    };
  } else if (source === "world") {
    sourceOptions = {
      includeWorldDrops: true,
      dungeonOnly: false,
      worldOnly: true,
    };
  } else {
    sourceOptions = {
      includeWorldDrops: true,
      dungeonOnly: false,
      worldOnly: false,
    };
  }

  if (typeof stepConfig.includeWorldDrops === "boolean") {
    sourceOptions.includeWorldDrops = stepConfig.includeWorldDrops;
  }
  if (typeof stepConfig.dungeonOnly === "boolean") {
    sourceOptions.dungeonOnly = stepConfig.dungeonOnly;
  }
  if (typeof stepConfig.worldOnly === "boolean") {
    sourceOptions.worldOnly = stepConfig.worldOnly;
  }

  return sourceOptions;
};

export const getDungeonStepLootConfig = (
  mission: Mission,
  stepIndex: number,
) => {
  const table: DungeonLootTable =
    mission && typeof mission.dungeonLootTable === "object"
      ? mission.dungeonLootTable as DungeonLootTable
      : {};
  const bossCount = getDungeonBossCount(mission);
  const isEndboss = stepIndex === bossCount - 1;

  const stepOverrides = Array.isArray(table.steps) ? table.steps : [];
  const explicitStepConfig = parseDungeonStepLootConfig(
    stepOverrides[stepIndex],
  );
  if (
    Array.isArray(explicitStepConfig.weights) &&
    explicitStepConfig.weights.length > 0
  ) {
    return {
      weights: explicitStepConfig.weights,
      ...resolveDungeonDropSource(explicitStepConfig, isEndboss),
    };
  }

  const phaseConfig = parseDungeonStepLootConfig(
    isEndboss ? table.endboss : table.boss,
  );
  if (Array.isArray(phaseConfig.weights) && phaseConfig.weights.length > 0) {
    return {
      weights: phaseConfig.weights,
      ...resolveDungeonDropSource(phaseConfig, isEndboss),
    };
  }

  return {
    weights: isEndboss
      ? DEFAULT_DUNGEON_LOOT_TABLE.endboss
      : DEFAULT_DUNGEON_LOOT_TABLE.boss,
    ...resolveDungeonDropSource({}, isEndboss),
  };
};

const normalizeLootWeights = (weights: unknown) =>
  (Array.isArray(weights) ? weights : [])
    .map((entry) => ({
      quality: Number(entry?.quality),
      chance: Number(entry?.chance),
    }))
    .filter(
      (entry) =>
        Number.isFinite(entry.quality) &&
        entry.quality > 0 &&
        Number.isFinite(entry.chance) &&
        entry.chance > 0,
    );

const rollQualityFromWeights = (
  weights: unknown,
  fallbackQuality = 2,
  random: () => number = Math.random,
) => {
  const normalized = normalizeLootWeights(weights);
  if (normalized.length === 0) return fallbackQuality;

  const totalChance = normalized.reduce((sum, entry) => sum + entry.chance, 0);
  if (totalChance <= 0) return fallbackQuality;

  let roll = random() * totalChance;
  for (const entry of normalized) {
    roll -= entry.chance;
    if (roll <= 0) return entry.quality;
  }

  return normalized[normalized.length - 1]?.quality || fallbackQuality;
};

export const getDungeonStepQualityPriority = (
  mission: Mission,
  stepIndex: number,
  random: () => number = Math.random,
) => {
  const stepConfig = getDungeonStepLootConfig(mission, stepIndex);
  const stepWeights = stepConfig.weights;
  const normalized = normalizeLootWeights(stepWeights);
  const rolledQuality = rollQualityFromWeights(stepWeights, 2, random);
  const fallbackOrder = [5, 4, 3, 2, 1];
  const configuredFallbacks = normalized
    .filter((entry) => entry.quality !== rolledQuality)
    .sort((a, b) => b.chance - a.chance)
    .map((entry) => entry.quality);
  return [
    ...new Set([rolledQuality, ...configuredFallbacks, ...fallbackOrder]),
  ];
};
