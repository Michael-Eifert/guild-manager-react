import { DB_NAMES, GUILD_FACTION } from "../constants";

type RandomSource = () => number;

const ALLIANCE_GUILD_PREFIXES = Object.freeze([
  "Azure",
  "Dawn",
  "Golden",
  "Gryphon",
  "Ironforge",
  "Lionheart",
  "Silver",
  "Stormwind",
]);

const HORDE_GUILD_PREFIXES = Object.freeze([
  "Ashen",
  "Blood",
  "Crimson",
  "Darkspear",
  "Iron",
  "Thunder",
  "Warsong",
  "Wolfheart",
]);

const GUILD_SUFFIXES = Object.freeze([
  "Banner",
  "Clan",
  "Company",
  "Covenant",
  "Guard",
  "Order",
  "Pact",
  "Vanguard",
]);

const pickIndex = (length: number, random: RandomSource) =>
  Math.min(length - 1, Math.floor(Math.max(0, random()) * length));

const pickDifferent = (
  values: readonly string[],
  currentValue: string,
  random: RandomSource,
) => {
  const alternatives = values.filter((value) => value !== currentValue);
  const pool = alternatives.length > 0 ? alternatives : values;
  return pool[pickIndex(pool.length, random)] || "";
};

export const generateRandomGuildName = (
  faction: string,
  currentName = "",
  random: RandomSource = Math.random,
) => {
  const prefixes =
    faction === GUILD_FACTION.HORDE
      ? HORDE_GUILD_PREFIXES
      : ALLIANCE_GUILD_PREFIXES;
  const names = prefixes.flatMap((prefix) =>
    GUILD_SUFFIXES.map((suffix) => `${prefix} ${suffix}`),
  );
  return pickDifferent(names, currentName.trim(), random);
};

export const generateRandomCharacterName = (
  race: string,
  gender: "Male" | "Female",
  currentName = "",
  random: RandomSource = Math.random,
) => {
  const raceNames = DB_NAMES[race as keyof typeof DB_NAMES];
  const names = raceNames?.[gender] || DB_NAMES.Human[gender];
  return pickDifferent(names, currentName.trim(), random);
};
