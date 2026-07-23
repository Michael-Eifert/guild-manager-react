import { getMissionLootLevelRange } from "../missions/missionHelpers";
import type { Character } from "../types/characterTypes";
import type { Mission } from "../types/missionTypes";

type LevelRange = { minLevel?: number; maxLevel?: number };

export const DEFAULT_MORALE = 50;
export const MORALE_MIN = 0;
export const MORALE_MAX = 100;
export const MORALE_WIPE_DELTA = -5;
export const MORALE_DUNGEON_CLEAR_DELTA = 8;
export const MORALE_ZONE_CLEAR_DELTA = 4;
export const MORALE_ELITE_SUCCESS_DELTA = 4;
export const MORALE_ELITE_FAILURE_DELTA = -4;
export const MORALE_PARTY_BONUS_CAP = 5;

export const MORALE_BAND = Object.freeze({
  LOW: "low",
  STEADY: "steady",
  HIGH: "high",
});

export const clampMorale = (value: unknown) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return DEFAULT_MORALE;
  return Math.max(MORALE_MIN, Math.min(MORALE_MAX, Math.round(numericValue)));
};

export const getCharacterMorale = (character: Pick<Character, "morale"> | null | undefined) =>
  clampMorale(character?.morale ?? DEFAULT_MORALE);

export const getMoraleBand = (moraleValue: unknown) => {
  const morale = clampMorale(moraleValue);
  if (morale <= 25) return MORALE_BAND.LOW;
  if (morale >= 75) return MORALE_BAND.HIGH;
  return MORALE_BAND.STEADY;
};

export const getMoraleLabel = (moraleValue: unknown) => {
  const band = getMoraleBand(moraleValue);
  if (band === MORALE_BAND.LOW) return "\u2193 Low";
  if (band === MORALE_BAND.HIGH) return "\u2191 High";
  return "\u2192 Steady";
};

export const getMoraleSuccessModifier = (character: Character) => {
  const band = getMoraleBand(getCharacterMorale(character));
  if (band === MORALE_BAND.HIGH) return 1;
  if (band === MORALE_BAND.LOW) return -1;
  return 0;
};

export const getPartyMoraleSuccessBonus = (members: readonly Character[]) => {
  const rawBonus = (Array.isArray(members) ? members : []).reduce(
    (sum, member) => sum + getMoraleSuccessModifier(member),
    0,
  );
  return Math.max(
    -MORALE_PARTY_BONUS_CAP,
    Math.min(MORALE_PARTY_BONUS_CAP, rawBonus),
  );
};

export const applyMoraleDelta = <T extends Character>(character: T, delta: unknown): T => ({
  ...character,
  morale: clampMorale(getCharacterMorale(character) + (Number(delta) || 0)),
}) as T;

export const isCharacterInZoneLevelRange = (character: Character, zone: LevelRange) => {
  const level = Math.max(1, Number(character?.level) || 1);
  const minLevel = Math.max(1, Number(zone?.minLevel) || 1);
  const maxLevel = Math.max(minLevel, Number(zone?.maxLevel) || minLevel);
  return level >= minLevel && level <= maxLevel;
};

export const isCharacterInMissionLevelRange = (character: Character, mission: Mission) => {
  const level = Math.max(1, Number(character?.level) || 1);
  const range = getMissionLootLevelRange(mission);
  const minLevel = Math.max(1, Number(range?.minLevel) || 1);
  const maxLevel = Math.max(minLevel, Number(range?.maxLevel) || minLevel);
  return level >= minLevel && level <= maxLevel;
};
