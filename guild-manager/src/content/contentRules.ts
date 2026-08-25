import { DB_RACES } from "../data/races";
import { FACTION_RACES, GUILD_FACTION } from "../data/gameConfig";

export const CONTENT_ROUTE = Object.freeze({
  UNCOMMITTED: "uncommitted",
  BURNING_CRUSADE: "burning_crusade",
  CLASSIC_PLUS: "classic_plus",
} as const);

export const CONTENT_PHASE = Object.freeze({
  CLASSIC: "classic",
  TBC_PREPATCH: "tbc_prepatch",
  CLASSIC_PLUS: "classic_plus",
} as const);

export type ContentRoute = typeof CONTENT_ROUTE[keyof typeof CONTENT_ROUTE];
export type ContentPhase = typeof CONTENT_PHASE[keyof typeof CONTENT_PHASE];

export const CONTENT_ROUTE_OPTIONS = Object.freeze([
  Object.freeze({
    value: CONTENT_ROUTE.UNCOMMITTED,
    label: "Classic Era",
    description: "The original eight races and faction-exclusive Paladins and Shamans.",
  }),
  Object.freeze({
    value: CONTENT_ROUTE.BURNING_CRUSADE,
    label: "TBC Pre-Patch",
    description: "Adds Draenei, Blood Elves, their 1–20 regions, and both faction class unlocks.",
  }),
]);

const PREPATCH_RACE_CLASSES = Object.freeze({
  Draenei: Object.freeze(["Warrior", "Paladin", "Hunter", "Priest", "Shaman", "Mage"]),
  "Blood Elf": Object.freeze(["Paladin", "Hunter", "Rogue", "Priest", "Mage", "Warlock"]),
});

export const normalizeContentRoute = (value: unknown): ContentRoute =>
  value === CONTENT_ROUTE.BURNING_CRUSADE ||
  value === CONTENT_ROUTE.CLASSIC_PLUS
    ? value
    : CONTENT_ROUTE.UNCOMMITTED;

export const normalizeContentPhase = (
  value: unknown,
  route: unknown = CONTENT_ROUTE.UNCOMMITTED,
): ContentPhase =>
  normalizeContentRoute(route) === CONTENT_ROUTE.CLASSIC_PLUS ||
  value === CONTENT_PHASE.CLASSIC_PLUS
    ? CONTENT_PHASE.CLASSIC_PLUS
    : value === CONTENT_PHASE.TBC_PREPATCH ||
        normalizeContentRoute(route) === CONTENT_ROUTE.BURNING_CRUSADE
      ? CONTENT_PHASE.TBC_PREPATCH
      : CONTENT_PHASE.CLASSIC;

export const getContentPhaseForRoute = (route: unknown): ContentPhase =>
  normalizeContentRoute(route) === CONTENT_ROUTE.BURNING_CRUSADE
    ? CONTENT_PHASE.TBC_PREPATCH
    : normalizeContentRoute(route) === CONTENT_ROUTE.CLASSIC_PLUS
      ? CONTENT_PHASE.CLASSIC_PLUS
      : CONTENT_PHASE.CLASSIC;

export const isTbcPrepatchActive = (phase: unknown) =>
  normalizeContentPhase(phase) === CONTENT_PHASE.TBC_PREPATCH;

export const getRaceClassesForContent = (
  race: unknown,
  phase: unknown = CONTENT_PHASE.CLASSIC,
): readonly string[] => {
  const normalizedRace = String(race || "");
  if (isTbcPrepatchActive(phase) && normalizedRace in PREPATCH_RACE_CLASSES) {
    return PREPATCH_RACE_CLASSES[normalizedRace as keyof typeof PREPATCH_RACE_CLASSES];
  }
  return DB_RACES[normalizedRace as keyof typeof DB_RACES] || [];
};

export const getFactionRacesForContent = (
  faction: unknown,
  phase: unknown = CONTENT_PHASE.CLASSIC,
): string[] => {
  const normalizedFaction =
    faction === GUILD_FACTION.HORDE ? GUILD_FACTION.HORDE : GUILD_FACTION.ALLIANCE;
  const classic = [...FACTION_RACES[normalizedFaction]];
  if (!isTbcPrepatchActive(phase)) return classic;
  return normalizedFaction === GUILD_FACTION.HORDE
    ? [...classic, "Blood Elf"]
    : [...classic, "Draenei"];
};

export const isRaceClassAvailableInContent = ({
  faction,
  race,
  charClass,
  phase = CONTENT_PHASE.CLASSIC,
}: {
  faction: unknown;
  race: unknown;
  charClass: unknown;
  phase?: unknown;
}) =>
  getFactionRacesForContent(faction, phase).includes(String(race || "")) &&
  getRaceClassesForContent(race, phase).includes(String(charClass || ""));

export const getContentPhaseLabel = (phase: unknown) =>
  isTbcPrepatchActive(phase)
    ? "TBC Pre-Patch"
    : normalizeContentPhase(phase) === CONTENT_PHASE.CLASSIC_PLUS
      ? "Classic+"
      : "Classic Era";
