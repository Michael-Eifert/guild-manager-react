import { GUILD_FACTION } from "../../constants";

export const BATTLEFIELD_STATUS = Object.freeze({
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
});

export const BATTLEFIELD_CHARACTER_STATUS = "Battleground";

export const BATTLEFIELD_IDS = Object.freeze({
  WARSONG_GULCH: "warsong_gulch",
});

export const WARSONG_GULCH = Object.freeze({
  id: BATTLEFIELD_IDS.WARSONG_GULCH,
  name: "Warsong Gulch",
  type: "capture_the_flag",
  teamSize: 10,
  maxScore: 3,
  maxDurationMinutes: 25,
  minLevel: 10,
  description:
    "A 10v10 capture-the-flag battlefield. First team to capture 3 flags wins.",
});

export const BATTLEFIELD_DEFINITIONS = Object.freeze({
  [BATTLEFIELD_IDS.WARSONG_GULCH]: WARSONG_GULCH,
});

export const BATTLEGROUND_BRACKETS = Object.freeze([
  Object.freeze({ id: "10-19", label: "10-19", minLevel: 10, maxLevel: 19 }),
  Object.freeze({ id: "20-29", label: "20-29", minLevel: 20, maxLevel: 29 }),
  Object.freeze({ id: "30-39", label: "30-39", minLevel: 30, maxLevel: 39 }),
  Object.freeze({ id: "40-49", label: "40-49", minLevel: 40, maxLevel: 49 }),
  Object.freeze({ id: "50-59", label: "50-59", minLevel: 50, maxLevel: 59 }),
  Object.freeze({ id: "60", label: "60", minLevel: 60, maxLevel: 60 }),
]);

export const PVP_ACTIVITY_FOCUS = Object.freeze({
  AVOID: "avoid",
  LOW: "25",
  MEDIUM: "50",
  HIGH: "75",
  MAX: "max",
});

export const PVP_ACTIVITY_FOCUS_OPTIONS = Object.freeze([
  Object.freeze({
    value: PVP_ACTIVITY_FOCUS.AVOID,
    label: "Avoid",
    description: "Never auto-queue battlegrounds.",
  }),
  Object.freeze({
    value: PVP_ACTIVITY_FOCUS.LOW,
    label: "25%",
    description: "Queue rarely, and only with a full strong team.",
  }),
  Object.freeze({
    value: PVP_ACTIVITY_FOCUS.MEDIUM,
    label: "50%",
    description: "Queue regularly when a good partial premade is available.",
  }),
  Object.freeze({
    value: PVP_ACTIVITY_FOCUS.HIGH,
    label: "75%",
    description: "Queue often and let PvP compete with PvE activity.",
  }),
  Object.freeze({
    value: PVP_ACTIVITY_FOCUS.MAX,
    label: "As much as possible",
    description: "Queue whenever enough eligible heroes are available.",
  }),
]);

export const DEFAULT_PVP_ACTIVITY_FOCUS = PVP_ACTIVITY_FOCUS.LOW;

export const getOpposingFaction = (faction: string) =>
  faction === GUILD_FACTION.HORDE ? GUILD_FACTION.ALLIANCE : GUILD_FACTION.HORDE;
