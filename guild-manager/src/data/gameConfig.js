import { buildDungeonMissions } from "../missions/dungeonDefinitions";

const GAME_MAX_SUPPORTED_LEVEL = 60;

const roundDownToHundred = (value) => Math.floor(value / 100) * 100;
const roundUpToHundred = (value) => Math.ceil(value / 100) * 100;

const interpolateSecondsByLevel = (level, points) => {
  const safeLevel = Math.max(1, Math.min(GAME_MAX_SUPPORTED_LEVEL, Number(level) || 1));
  const safePoints = Array.isArray(points) ? points : [];
  if (safePoints.length === 0) return 60;
  if (safeLevel <= safePoints[0].level) return safePoints[0].seconds;

  for (let index = 1; index < safePoints.length; index += 1) {
    const previous = safePoints[index - 1];
    const current = safePoints[index];
    if (safeLevel > current.level) continue;
    const span = Math.max(1, current.level - previous.level);
    const progress = (safeLevel - previous.level) / span;
    return previous.seconds + (current.seconds - previous.seconds) * progress;
  }

  return safePoints[safePoints.length - 1].seconds;
};

const QUEST_TARGET_SECONDS_POINTS = [
  { level: 1, seconds: 10 },
  { level: 10, seconds: 20 },
  { level: 20, seconds: 60 },
  { level: 30, seconds: 80 },
  { level: 40, seconds: 100 },
  { level: 50, seconds: 180 },
  { level: 58, seconds: 240 },
  { level: 60, seconds: 240 },
];

const ELITE_TARGET_SECONDS_POINTS = [
  { level: 1, seconds: 10 },
  { level: 10, seconds: 20 },
  { level: 20, seconds: 30 },
  { level: 30, seconds: 60 },
  { level: 40, seconds: 90 },
  { level: 50, seconds: 150 },
  { level: 58, seconds: 220 },
  { level: 60, seconds: 220 },
];

const getXpToNextLevel = (level) => {
  const cl = Math.max(
    1,
    Math.min(GAME_MAX_SUPPORTED_LEVEL, Number(level) || 1),
  );
  const mxp = 45 + 5 * cl;

  let diff = 0;
  if (cl === 29) diff = 1;
  else if (cl === 30) diff = 3;
  else if (cl === 31) diff = 6;
  else if (cl >= 32 && cl <= 59) diff = 5 * (cl - 30);

  let rf = 1;
  if (cl >= 11 && cl <= 27) rf = 1 - (cl - 10) / 100;
  else if (cl >= 28 && cl <= 59) rf = 0.82;

  return roundDownToHundred((8 * cl + diff) * mxp * rf);
};

const buildXpTable = (maxLevel) => {
  const table = [0];
  for (let level = 1; level <= maxLevel; level++) {
    table.push(getXpToNextLevel(level));
  }
  return table;
};

const getQuestDurationForLevel = (level, elite = false) => {
  let baseDuration;
  if (level < 10) {
    // Early leveling stays fast: 8s - 15s
    baseDuration = Math.min(15, 8 + Math.max(0, level - 1));
  } else if (level < 20) {
    // Mid band: 15s - 20s
    baseDuration = Math.min(20, 15 + Math.floor((level - 10) / 2));
  } else {
    // High band: 20s - 30s
    baseDuration = Math.min(30, 20 + Math.floor((level - 20) * 1.5));
  }
  return elite ? baseDuration * 2 : baseDuration;
};

const getQuestMissionExp = (level, elite = false) => {
  const minExp = elite ? 300 : 200;
  const targetSeconds = interpolateSecondsByLevel(
    level,
    elite ? ELITE_TARGET_SECONDS_POINTS : QUEST_TARGET_SECONDS_POINTS,
  );
  const duration = getQuestDurationForLevel(level, elite);
  const xpToLevel = getXpToNextLevel(level);
  const tunedExp = roundDownToHundred((xpToLevel * duration) / targetSeconds);
  return Math.max(minExp, tunedExp);
};

const DUNGEON_EXP_BASELINE_LEVEL = 59;
const DUNGEON_SECONDS_PER_LEVEL_TARGET = 150;
const DUNGEON_BASELINE_LEVEL_EXP = getXpToNextLevel(DUNGEON_EXP_BASELINE_LEVEL);

const getDungeonMissionExp = (_recommended, _fallbackLevel, durationSeconds = 100) => {
  // Global dungeon scaling: 150 seconds ~= one level worth of XP,
  // where "one level" uses the XP needed from level 59 -> 60.
  const safeDuration = Math.max(1, Number(durationSeconds) || 100);
  const durationMultiplier = safeDuration / DUNGEON_SECONDS_PER_LEVEL_TARGET;
  return Math.max(
    1000,
    roundUpToHundred(DUNGEON_BASELINE_LEVEL_EXP * durationMultiplier),
  );
};

// Dungeon duration normalization from community reference:
// "1h30" => 90s, "0h50" => 50s
const getDungeonDurationFromReference = (durationText, fallbackSeconds = 120) => {
  const match = String(durationText || "").match(/^(\d+)h(\d{1,2})$/i);
  if (!match) return fallbackSeconds;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallbackSeconds;
  return Math.max(1, hours * 60 + minutes);
};

export const CONFIG = {
  MAX_ROSTER: 10,
  GOLD_CAP: 1000,
  LEVEL_CAP: 60,
  MAX_SUPPORTED_LEVEL: GAME_MAX_SUPPORTED_LEVEL,
  TICK_RATE: 1000,
  XP_TABLE: buildXpTable(GAME_MAX_SUPPORTED_LEVEL),
};

export const GUILD_FACTION = Object.freeze({
  ALLIANCE: "Alliance",
  HORDE: "Horde",
});

export const GUILD_FACTION_OPTIONS = Object.freeze(Object.values(GUILD_FACTION));

export const GUILD_SERVER_STYLE = Object.freeze({
  PVE: "PvE",
  PVP: "PvP",
});

export const GUILD_SERVER = Object.freeze({
  EVERLOOK: "Everlook",
  FIREMAW: "Firemaw",
});

export const GUILD_SERVER_OPTIONS = Object.freeze([
  {
    value: GUILD_SERVER.EVERLOOK,
    label: `${GUILD_SERVER.EVERLOOK} (${GUILD_SERVER_STYLE.PVE})`,
    style: GUILD_SERVER_STYLE.PVE,
  },
  {
    value: GUILD_SERVER.FIREMAW,
    label: `${GUILD_SERVER.FIREMAW} (${GUILD_SERVER_STYLE.PVP})`,
    style: GUILD_SERVER_STYLE.PVP,
  },
]);

export const FACTION_RACES = Object.freeze({
  [GUILD_FACTION.ALLIANCE]: Object.freeze([
    "Human",
    "Dwarf",
    "Night Elf",
    "Gnome",
  ]),
  [GUILD_FACTION.HORDE]: Object.freeze([
    "Orc",
    "Undead",
    "Tauren",
    "Troll",
  ]),
});

const getQuestDuration = (level, elite = false) =>
  getQuestDurationForLevel(level, elite);

const getQuestRewardQualities = (level, elite = false) => {
  if (elite) return level >= 18 ? [3] : [2];
  return level >= 12 ? [2] : [1];
};

export const INITIAL_MISSIONS = [
  {
    id: 1,
    type: "quest",
    typeLabel: "Quest",
    name: "Clear Kobold Mine",
    level: 2,
    duration: getQuestDuration(2),
    exp: getQuestMissionExp(2),
    gold: 1,
    rewardQualities: getQuestRewardQualities(2),
    elite: false,
  },
  {
    id: 3,
    type: "quest",
    typeLabel: "Quest",
    name: "Wolf Hunt",
    level: 5,
    duration: getQuestDuration(5),
    exp: getQuestMissionExp(5),
    gold: 2,
    rewardQualities: getQuestRewardQualities(5),
    elite: false,
  },
  {
    id: 4,
    type: "quest",
    typeLabel: "Elite Quest",
    name: "Elite: Defeat Hogger",
    level: 10,
    duration: getQuestDuration(10, true),
    exp: getQuestMissionExp(10, true),
    gold: 5,
    rewardQualities: getQuestRewardQualities(10, true),
    elite: true,
  },
  {
    id: 8,
    type: "quest",
    typeLabel: "Quest",
    name: "Secure the Westfall Roads",
    level: 8,
    duration: getQuestDuration(8),
    exp: getQuestMissionExp(8),
    gold: 2,
    rewardQualities: getQuestRewardQualities(8),
    elite: false,
  },
  {
    id: 9,
    type: "quest",
    typeLabel: "Quest",
    name: "Purge the Moonbrook Cellar",
    level: 12,
    duration: getQuestDuration(12),
    exp: getQuestMissionExp(12),
    gold: 4,
    rewardQualities: getQuestRewardQualities(12),
    elite: false,
  },
  {
    id: 10,
    type: "quest",
    typeLabel: "Quest",
    name: "Escort the Iron Caravan",
    level: 14,
    duration: getQuestDuration(14),
    exp: getQuestMissionExp(14),
    gold: 4,
    rewardQualities: getQuestRewardQualities(14),
    elite: false,
  },
  {
    id: 11,
    type: "quest",
    typeLabel: "Quest",
    name: "Recover Stolen Reagents",
    level: 16,
    duration: getQuestDuration(16),
    exp: getQuestMissionExp(16),
    gold: 4,
    rewardQualities: getQuestRewardQualities(16),
    elite: false,
  },
  {
    id: 12,
    type: "quest",
    typeLabel: "Quest",
    name: "Hunt the Darkfang Pack",
    level: 18,
    duration: getQuestDuration(18),
    exp: getQuestMissionExp(18),
    gold: 6,
    rewardQualities: getQuestRewardQualities(18),
    elite: false,
  },
  {
    id: 13,
    type: "quest",
    typeLabel: "Quest",
    name: "Defend Sentinel Hill",
    level: 21,
    duration: getQuestDuration(21),
    exp: getQuestMissionExp(21),
    gold: 6,
    rewardQualities: getQuestRewardQualities(21),
    elite: false,
  },
  {
    id: 14,
    type: "quest",
    typeLabel: "Quest",
    name: "Assault on Ravenclaw Camp",
    level: 24,
    duration: getQuestDuration(24),
    exp: getQuestMissionExp(24),
    gold: 7,
    rewardQualities: getQuestRewardQualities(24),
    elite: false,
  },
  {
    id: 15,
    type: "quest",
    typeLabel: "Elite Quest",
    name: "Elite: Break the Defias Siege",
    level: 14,
    duration: getQuestDuration(14, true),
    exp: getQuestMissionExp(14, true),
    gold: 6,
    rewardQualities: getQuestRewardQualities(14, true),
    elite: true,
  },
  {
    id: 16,
    type: "quest",
    typeLabel: "Elite Quest",
    name: "Elite: Slay the Nightbane Alpha",
    level: 18,
    duration: getQuestDuration(18, true),
    exp: getQuestMissionExp(18, true),
    gold: 7,
    rewardQualities: getQuestRewardQualities(18, true),
    elite: true,
  },
  {
    id: 17,
    type: "quest",
    typeLabel: "Elite Quest",
    name: "Elite: Hold the Bridge at Dawn",
    level: 21,
    duration: getQuestDuration(21, true),
    exp: getQuestMissionExp(21, true),
    gold: 7,
    rewardQualities: getQuestRewardQualities(21, true),
    elite: true,
  },
  {
    id: 18,
    type: "quest",
    typeLabel: "Elite Quest",
    name: "Elite: Purge the Shadow Altar",
    level: 24,
    duration: getQuestDuration(24, true),
    exp: getQuestMissionExp(24, true),
    gold: 9,
    rewardQualities: getQuestRewardQualities(24, true),
    elite: true,
  },
  {
    id: 19,
    type: "quest",
    typeLabel: "Quest",
    name: "Stabilize the Redridge Front",
    level: 26,
    duration: getQuestDuration(26),
    exp: getQuestMissionExp(26),
    gold: 7,
    rewardQualities: getQuestRewardQualities(26),
    elite: false,
  },
  {
    id: 20,
    type: "quest",
    typeLabel: "Elite Quest",
    name: "Elite: Silence the Dread Cult",
    level: 27,
    duration: getQuestDuration(27, true),
    exp: getQuestMissionExp(27, true),
    gold: 10,
    rewardQualities: getQuestRewardQualities(27, true),
    elite: true,
  },
  {
    id: 21,
    type: "quest",
    typeLabel: "Quest",
    name: "Hold the Arathi Pass",
    level: 30,
    duration: getQuestDuration(30),
    exp: getQuestMissionExp(30),
    gold: 8,
    rewardQualities: getQuestRewardQualities(30),
    elite: false,
  },
  {
    id: 25,
    type: "quest",
    typeLabel: "Quest",
    name: "Secure the Stranglethorn Trade Route",
    level: 34,
    duration: getQuestDuration(34),
    exp: getQuestMissionExp(34),
    gold: 8,
    rewardQualities: getQuestRewardQualities(34),
    elite: false,
  },
  {
    id: 26,
    type: "quest",
    typeLabel: "Quest",
    name: "Sweep the Hinterlands Watchposts",
    level: 38,
    duration: getQuestDuration(38),
    exp: getQuestMissionExp(38),
    gold: 9,
    rewardQualities: getQuestRewardQualities(38),
    elite: false,
  },
  {
    id: 27,
    type: "quest",
    typeLabel: "Quest",
    name: "Fortify the Feralas Expedition",
    level: 42,
    duration: getQuestDuration(42),
    exp: getQuestMissionExp(42),
    gold: 10,
    rewardQualities: getQuestRewardQualities(42),
    elite: false,
  },
  {
    id: 28,
    type: "quest",
    typeLabel: "Quest",
    name: "Purge the Tanaris Smuggler Ring",
    level: 46,
    duration: getQuestDuration(46),
    exp: getQuestMissionExp(46),
    gold: 11,
    rewardQualities: getQuestRewardQualities(46),
    elite: false,
  },
  {
    id: 29,
    type: "quest",
    typeLabel: "Quest",
    name: "Stabilize the Searing Gorge Front",
    level: 50,
    duration: getQuestDuration(50),
    exp: getQuestMissionExp(50),
    gold: 12,
    rewardQualities: getQuestRewardQualities(50),
    elite: false,
  },
  {
    id: 30,
    type: "quest",
    typeLabel: "Quest",
    name: "Disrupt the Burning Steppes Warband",
    level: 54,
    duration: getQuestDuration(54),
    exp: getQuestMissionExp(54),
    gold: 13,
    rewardQualities: getQuestRewardQualities(54),
    elite: false,
  },
  {
    id: 31,
    type: "quest",
    typeLabel: "Quest",
    name: "Hold the Winterspring Perimeter",
    level: 58,
    duration: getQuestDuration(58),
    exp: getQuestMissionExp(58),
    gold: 14,
    rewardQualities: getQuestRewardQualities(58),
    elite: false,
  },
  {
    id: 32,
    type: "quest",
    typeLabel: "Elite Quest",
    name: "Elite: Break the Razorfen High Guard",
    level: 31,
    duration: getQuestDuration(31, true),
    exp: getQuestMissionExp(31, true),
    gold: 11,
    rewardQualities: getQuestRewardQualities(31, true),
    elite: true,
  },
  {
    id: 33,
    type: "quest",
    typeLabel: "Elite Quest",
    name: "Elite: Silence the Dragonmaw Warlord",
    level: 35,
    duration: getQuestDuration(35, true),
    exp: getQuestMissionExp(35, true),
    gold: 13,
    rewardQualities: getQuestRewardQualities(35, true),
    elite: true,
  },
  {
    id: 34,
    type: "quest",
    typeLabel: "Elite Quest",
    name: "Elite: Defeat the Temple Bloodbinder",
    level: 40,
    duration: getQuestDuration(40, true),
    exp: getQuestMissionExp(40, true),
    gold: 15,
    rewardQualities: getQuestRewardQualities(40, true),
    elite: true,
  },
  {
    id: 35,
    type: "quest",
    typeLabel: "Elite Quest",
    name: "Elite: Crush the Zul'Farrak Vanguard",
    level: 45,
    duration: getQuestDuration(45, true),
    exp: getQuestMissionExp(45, true),
    gold: 18,
    rewardQualities: getQuestRewardQualities(45, true),
    elite: true,
  },
  {
    id: 36,
    type: "quest",
    typeLabel: "Elite Quest",
    name: "Elite: Destroy the Blackrock Taskmaster",
    level: 50,
    duration: getQuestDuration(50, true),
    exp: getQuestMissionExp(50, true),
    gold: 23,
    rewardQualities: getQuestRewardQualities(50, true),
    elite: true,
  },
  {
    id: 37,
    type: "quest",
    typeLabel: "Elite Quest",
    name: "Elite: Slay the Plaguelands Abomination",
    level: 55,
    duration: getQuestDuration(55, true),
    exp: getQuestMissionExp(55, true),
    gold: 30,
    rewardQualities: getQuestRewardQualities(55, true),
    elite: true,
  },
  {
    id: 38,
    type: "quest",
    typeLabel: "Elite Quest",
    name: "Elite: Rout the Twilight Overlord",
    level: 60,
    duration: getQuestDuration(60, true),
    exp: getQuestMissionExp(60, true),
    gold: 35,
    rewardQualities: getQuestRewardQualities(60, true),
    elite: true,
  },
  ...buildDungeonMissions({
    getDungeonDurationFromReference,
    getDungeonMissionExp,
  }),
];

