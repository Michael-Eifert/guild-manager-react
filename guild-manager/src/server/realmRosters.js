import {
  CONFIG,
  FACTION_RACES,
  GUILD_FACTION,
} from "../constants";
import {
  buildCharacterNamePool,
  getCharacterAverageItemLevel,
  pickUniqueCharacterName,
} from "../utils";
import { rollCharacterPersonalityTraits } from "../game/characterPersonality";
import { REALM_GUILD_ROSTER_CAP } from "./realmDefinitions";

const NPC_NAME_PARTS = Object.freeze({
  prefixes: Object.freeze([
    "Ael",
    "Bal",
    "Cor",
    "Drek",
    "Eld",
    "Fen",
    "Gar",
    "Hal",
    "Iri",
    "Jor",
    "Kel",
    "Lor",
    "Mor",
    "Nim",
    "Or",
    "Rok",
    "Sel",
    "Tor",
    "Val",
    "Zan",
  ]),
  suffixes: Object.freeze([
    "dor",
    "grim",
    "hart",
    "jin",
    "lane",
    "more",
    "nath",
    "ra",
    "ren",
    "ric",
    "sha",
    "stone",
    "thorn",
    "vak",
    "wyn",
  ]),
});

const CLASS_POOL_BY_FACTION = Object.freeze({
  [GUILD_FACTION.ALLIANCE]: Object.freeze([
    "Warrior",
    "Paladin",
    "Hunter",
    "Rogue",
    "Priest",
    "Mage",
    "Warlock",
    "Druid",
  ]),
  [GUILD_FACTION.HORDE]: Object.freeze([
    "Warrior",
    "Shaman",
    "Hunter",
    "Rogue",
    "Priest",
    "Mage",
    "Warlock",
    "Druid",
  ]),
});

const ROLE_BY_CLASS = Object.freeze({
  Warrior: "Tank",
  Paladin: "Healer",
  Shaman: "Healer",
  Priest: "Healer",
  Druid: "Healer",
});

const clampNumber = (value, min, max) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const pickFrom = (items, random) =>
  items[Math.floor(random() * items.length) % items.length];

const makeNpcName = ({ guildName, random }) => {
  const prefix = pickFrom(NPC_NAME_PARTS.prefixes, random);
  const suffix = pickFrom(NPC_NAME_PARTS.suffixes, random);
  const guildHint = String(guildName || "Realm")
    .replace(/[^a-z]/gi, "")
    .slice(0, 2);
  return `${prefix}${suffix}${guildHint}`;
};

export const getRealmRosterCap = () => REALM_GUILD_ROSTER_CAP;

export const getRealmMaxLevelCount = (roster = []) =>
  (Array.isArray(roster) ? roster : []).filter(
    (member) => Math.floor(Number(member?.level) || 0) >= CONFIG.LEVEL_CAP,
  ).length;

export const generateNpcGuildRoster = ({
  guildId,
  guildName,
  faction = GUILD_FACTION.ALLIANCE,
  rosterSize = 1,
  averageLevel = 1,
  averageGearScore = 1,
  archetype,
  random = Math.random,
  usedNameKeys = new Set(),
} = {}) => {
  const safeRandom = typeof random === "function" ? random : Math.random;
  const safeRosterSize = Math.max(
    1,
    Math.min(REALM_GUILD_ROSTER_CAP, Math.round(Number(rosterSize) || 1)),
  );
  const races = FACTION_RACES[faction] || FACTION_RACES[GUILD_FACTION.ALLIANCE];
  const classPool =
    CLASS_POOL_BY_FACTION[faction] || CLASS_POOL_BY_FACTION[GUILD_FACTION.ALLIANCE];
  const levelSpread = archetype === "Hardcore Raiders" ? 6 : 12;

  return Array.from({ length: safeRosterSize }, (_, index) => {
    const charClass = pickFrom(classPool, safeRandom);
    const race = pickFrom(races, safeRandom);
    const gender = safeRandom() > 0.5 ? "Male" : "Female";
    const levelRoll =
      Number(averageLevel) +
      Math.round((safeRandom() - 0.5) * levelSpread) +
      (safeRandom() < 0.12 ? 2 : 0);
    const level = Math.round(clampNumber(levelRoll, 1, CONFIG.LEVEL_CAP));
    const itemLevel = Math.round(
      clampNumber(
        Number(averageGearScore) +
          (level - Number(averageLevel || level)) * 0.45 +
          (safeRandom() - 0.5) * 8,
        0,
        100,
      ),
    );
    return {
      id: `${guildId || "npc"}:member:${index + 1}`,
      name: pickUniqueCharacterName({
        race,
        gender,
        curatedPool: buildCharacterNamePool({
          race,
          gender,
          charClass,
          includeFunnyName: safeRandom() < 0.08,
        }),
        fallbackPool: [makeNpcName({ guildName, random: safeRandom })],
        usedNameKeys,
        random: safeRandom,
      }),
      level,
      itemLevel,
      race,
      gender,
      charClass,
      role: ROLE_BY_CLASS[charClass] || "DPS",
      personalityTraits: rollCharacterPersonalityTraits({ random: safeRandom }),
    };
  });
};

export const normalizeRealmGuildRoster = (roster = [], fallbackRoster = []) => {
  const source = Array.isArray(roster) && roster.length > 0 ? roster : fallbackRoster;
  return (Array.isArray(source) ? source : [])
    .slice(0, REALM_GUILD_ROSTER_CAP)
    .map((member, index) => {
      const fallback = fallbackRoster[index] || {};
      const charClass = String(member?.charClass || member?.class || fallback.charClass || "Warrior");
      return {
        id: String(member?.id || fallback.id || `realm-member:${index + 1}`),
        name: String(member?.name || fallback.name || `Member ${index + 1}`),
        level: Math.round(
          clampNumber(member?.level ?? fallback.level, 1, CONFIG.LEVEL_CAP),
        ),
        itemLevel: Math.round(
          clampNumber(member?.itemLevel ?? fallback.itemLevel, 0, 100),
        ),
        race: String(member?.race || fallback.race || "Human"),
        charClass,
        role: String(member?.role || fallback.role || ROLE_BY_CLASS[charClass] || "DPS"),
      };
    });
};

export const buildPlayerRealmRoster = (roster = []) =>
  (Array.isArray(roster) ? roster : []).slice(0, REALM_GUILD_ROSTER_CAP).map(
    (member, index) => ({
      id: String(member?.id || `player-member:${index + 1}`),
      name: String(member?.name || `Member ${index + 1}`),
      level: Math.round(clampNumber(member?.level, 1, CONFIG.LEVEL_CAP)),
      itemLevel: Math.round(clampNumber(getCharacterAverageItemLevel(member), 0, 100)),
      race: String(member?.race || "Unknown"),
      charClass: String(member?.charClass || member?.class || "Adventurer"),
      role: String(member?.role || "DPS"),
    }),
  );

export const advanceNpcGuildRosterForDay = ({
  roster = [],
  averageLevel = 1,
  random = Math.random,
} = {}) => {
  const safeRandom = typeof random === "function" ? random : Math.random;
  const targetAverage = Number(averageLevel) || 1;
  return normalizeRealmGuildRoster(roster).map((member) => {
    const currentLevel = Math.max(1, Number(member.level) || 1);
    const shouldCatchUp =
      currentLevel < CONFIG.LEVEL_CAP &&
      (currentLevel < targetAverage - 2 || safeRandom() < 0.025);
    return {
      ...member,
      level: shouldCatchUp
        ? Math.min(CONFIG.LEVEL_CAP, currentLevel + 1)
        : currentLevel,
    };
  });
};
