import { renderToStaticMarkup } from "react-dom/server";

import { CALENDAR_STATUS } from "../../calendar/calendarLogic";
import { GUILD_FACTION, GUILD_FOCUS, GUILD_SERVER_STYLE } from "../../constants";
import {
  createInitialGuildProgress,
  getGuildDerivedStats,
} from "../../guildProgression";

export { CALENDAR_STATUS, GUILD_FACTION, GUILD_SERVER_STYLE };

export const noop = () => {};
export const render = (element) => renderToStaticMarkup(element);

export const makeHero = (overrides = {}) => ({
  id: "hero-1",
  name: "Aela",
  race: "Human",
  gender: "Female",
  charClass: "Warrior",
  role: "Tank",
  level: 20,
  exp: 450,
  maxExp: 1000,
  status: "Idle",
  statusText: "Ready for orders.",
  equipment: {},
  professions: {},
  keys: [],
  history: [],
  clearedMissionIds: [],
  zonesCleared: [],
  currentZoneId: "westfall",
  currentZoneProgress: 42,
  morale: 55,
  ...overrides,
});

export const makeDungeonMission = (overrides = {}) => ({
  id: "deadmines",
  name: "The Deadmines",
  type: "dungeon",
  level: 20,
  minLevel: 15,
  recommended: "15 - 20",
  exp: 1200,
  requiredPartySize: 5,
  minPartySize: 1,
  baseFailChance: 20,
  successChance: 84,
  startTime: 0,
  finishTime: 10000,
  totalDuration: 10000,
  memberIds: ["hero-1"],
  dungeonBosses: ["Rhahk'Zor", "Edwin VanCleef"],
  dungeonProgress: {
    clearedSteps: 1,
    currentStep: 1,
    stepResults: [{ step: 1, outcome: "cleared" }],
    maxAttempts: 3,
    attemptsUsed: 1,
  },
  ...overrides,
});

export const makeRaidMission = (overrides = {}) =>
  makeDungeonMission({
    id: "molten-core",
    name: "Molten Core",
    isRaid: true,
    level: 60,
    minLevel: 58,
    recommended: "58 - 60",
    requiredPartySize: 40,
    minPartySize: 5,
    raidRoleRequirement: { Tank: 2, Healer: 8, DPS: 30 },
    raidReset: { type: "weekly", weekday: 2 },
    dungeonBosses: ["Lucifron", "Ragnaros"],
    ...overrides,
  });

export const zoneMission = {
  id: "zone-westfall",
  type: "zone",
  zoneId: "westfall",
  name: "Zone: Westfall",
  level: 12,
  minLevel: 10,
  recommended: "10 - 15",
};

export const guildSetup = {
  name: "Test Guild",
  faction: GUILD_FACTION.ALLIANCE,
  focus: GUILD_FOCUS.LEVELING,
  server: "Ashbringer",
};

export const guildProgress = createInitialGuildProgress();
export const guildDerivedStats = getGuildDerivedStats(guildProgress);
export const hero = makeHero();
export const roster = [
  hero,
  makeHero({ id: "hero-2", name: "Borin", role: "Healer" }),
];
export const dungeonMission = makeDungeonMission();
export const raidMission = makeRaidMission();
export const missionList = [zoneMission, dungeonMission, raidMission];
