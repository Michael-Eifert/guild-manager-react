import { optimizeCharacterEquipment } from "../equipment/equipmentLoadouts";
import { getItemEffectiveLevel } from "../utils";
import type { Character } from "../types/characterTypes";
import type { ItemDefinition } from "../types/itemTypes";
import type { Mission } from "../types/missionTypes";

export const MAX_LFG_HELPERS = 2;
export const LFG_LEVEL_TOLERANCE = 2;
export const LFG_UPGRADE_LEVEL_TOLERANCE = 10;
export const MAX_NON_MAX_LEVEL_HELPER_INITIATOR_DELTA = 3;

export type LfgCandidateKind = "below-range" | "core" | "helper";

export type LfgLevelRange = {
  minimum: number;
  maximum: number;
};

export type LfgHelperInterest = {
  chance: number;
  baseChance: number;
  upgradeBonus: number;
  relationshipBonus: number;
  hasUpgrade: boolean;
  overlevelDelta: number;
};

const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, Math.floor(Number(value) || 0)));

const getRecommendedValues = (mission: Mission) =>
  String(mission.recommended || "")
    .match(/\d+/g)
    ?.map(Number)
    .filter((value) => Number.isFinite(value)) || [];

export const getLfgLevelRange = (mission: Mission): LfgLevelRange => {
  const recommendedValues = getRecommendedValues(mission);
  const recommendedMinimum = recommendedValues[0];
  const entryMinimum = Math.max(
    1,
    Math.floor(
      Number(
        mission.entryLevel ??
          mission.minLevel ??
          recommendedMinimum ??
          mission.level ??
          1,
      ) || 1,
    ),
  );
  const minimum =
    mission.type === "dungeon" && Number.isFinite(recommendedMinimum)
      ? Math.max(
          entryMinimum,
          Math.floor(recommendedMinimum) - LFG_LEVEL_TOLERANCE,
        )
      : entryMinimum;
  const maximum = Math.max(
    minimum,
    Math.floor(
      Number(
        recommendedValues[recommendedValues.length - 1] ??
          mission.level ??
          minimum + 5,
      ) || minimum + 5,
    ),
  );

  return { minimum, maximum };
};

export const getLfgCandidateKind = (
  character: Record<string, unknown>,
  mission: Mission,
): LfgCandidateKind => {
  const level = Math.max(1, Math.floor(Number(character.level) || 1));
  const range = getLfgLevelRange(mission);
  if (level < range.minimum) return "below-range";
  if (level <= range.maximum) return "core";
  return mission.type === "dungeon" ? "helper" : "below-range";
};

const normalizeSourceKey = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getMissionSourceKeys = (mission: Mission) =>
  new Set(
    [mission.name, mission.dungeonSetId, mission.dungeonSetName]
      .map(normalizeSourceKey)
      .filter(Boolean),
  );

const isMissionDungeonItem = (item: ItemDefinition, mission: Mission) => {
  const missionKeys = getMissionSourceKeys(mission);
  const itemKeys = [item.dungeon, item.dungeonSetId, item.dungeonSetName]
    .map(normalizeSourceKey)
    .filter(Boolean);
  if (!itemKeys.some((key) => missionKeys.has(key))) return false;

  const itemWing = normalizeSourceKey(item.dungeonWing);
  return !itemWing || itemWing === normalizeSourceKey(mission.dungeonWing);
};

const hasDetailedEquipment = (character: Record<string, unknown>) =>
  Boolean(
    character.equipment &&
      typeof character.equipment === "object" &&
      Object.values(character.equipment).some(Boolean),
  );

const isItemUpgrade = (
  character: Record<string, unknown>,
  item: ItemDefinition,
) => {
  const characterLevel = Math.max(
    1,
    Math.floor(Number(character.level) || 1),
  );
  if (
    getItemEffectiveLevel(item) <
    characterLevel - LFG_UPGRADE_LEVEL_TOLERANCE
  ) {
    return false;
  }
  if (!hasDetailedEquipment(character)) {
    const summarizedItemLevel = Number(
      character.itemLevel ?? character.averageItemLevel,
    );
    if (Number.isFinite(summarizedItemLevel) && summarizedItemLevel > 0) {
      return getItemEffectiveLevel(item) > summarizedItemLevel;
    }
  }

  const result = optimizeCharacterEquipment({
    character: character as unknown as Character,
    incomingItem: item,
  });
  return result.outcome === "equipped" && result.loadoutGain > 0;
};

export const canInitiateDungeonAsHelper = ({
  character,
  mission,
  interest,
}: {
  character: Record<string, unknown>;
  mission: Mission;
  interest: LfgHelperInterest;
}) => {
  if (mission.type !== "dungeon") return false;
  const level = Math.max(1, Math.floor(Number(character.level) || 1));
  const clearedMissionIds = Array.isArray(character.clearedMissionIds)
    ? character.clearedMissionIds
    : [];
  const hasClear = clearedMissionIds.some(
    (missionId) => String(missionId) === String(mission.id),
  );
  if (level >= 60) return interest.hasUpgrade || !hasClear;
  return (
    interest.hasUpgrade &&
    interest.overlevelDelta <= MAX_NON_MAX_LEVEL_HELPER_INITIATOR_DELTA
  );
};

export const hasDungeonEquipmentUpgrade = ({
  character,
  mission,
  itemDatabase,
}: {
  character: Record<string, unknown>;
  mission: Mission;
  itemDatabase: readonly ItemDefinition[];
}) =>
  mission.type === "dungeon" &&
  (Array.isArray(itemDatabase) ? itemDatabase : []).some(
    (item) =>
      isMissionDungeonItem(item, mission) &&
      isItemUpgrade(character, item),
  );

export const getLfgHelperInterest = ({
  character,
  mission,
  itemDatabase = [],
  relationshipPoints = 0,
}: {
  character: Record<string, unknown>;
  mission: Mission;
  itemDatabase?: readonly ItemDefinition[];
  relationshipPoints?: number;
}): LfgHelperInterest => {
  const range = getLfgLevelRange(mission);
  const level = Math.max(1, Math.floor(Number(character.level) || 1));
  const overlevelDelta = Math.max(0, level - range.maximum);
  const baseChance = Math.max(2, 12 - overlevelDelta * 2);
  const hasUpgrade = hasDungeonEquipmentUpgrade({
    character,
    mission,
    itemDatabase,
  });
  const upgradeBonus = hasUpgrade ? 30 : 0;
  const relationshipBonus = Math.min(
    25,
    Math.max(0, Math.floor(Number(relationshipPoints) || 0) / 4),
  );

  return {
    chance: Math.min(
      60,
      clampPercent(baseChance + upgradeBonus + relationshipBonus),
    ),
    baseChance,
    upgradeBonus,
    relationshipBonus,
    hasUpgrade,
    overlevelDelta,
  };
};

const hashText = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const passesDeterministicLfgChance = (
  seed: string,
  chance: number,
) => hashText(seed) % 100 < clampPercent(chance);
