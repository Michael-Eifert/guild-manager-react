export const WORLD_PVP_PROFILE_TYPE = Object.freeze({
  SAFE: "safe",
  HOSTILE: "hostile",
  CONTESTED: "contested",
});

export const WORLD_PVP_PROFILE_LABEL = Object.freeze({
  [WORLD_PVP_PROFILE_TYPE.SAFE]: "Safe Territory",
  [WORLD_PVP_PROFILE_TYPE.HOSTILE]: "Hostile Territory",
  [WORLD_PVP_PROFILE_TYPE.CONTESTED]: "Contested Territory",
});

export const WORLD_PVP_EVENT_TYPES = Object.freeze([
  "Ambush",
  "Skirmish",
  "Rival Guild Clash",
  "Gank Attempt",
  "Patrol Encounter",
  "Counterattack",
]);

export const WORLD_PVP_OUTCOME = Object.freeze({
  VICTORY: "victory",
  CLOSE_VICTORY: "close_victory",
  DRAW: "draw",
  RETREAT: "retreat",
  DEFEAT: "defeat",
});

export const WORLD_PVP_REWARD_TABLE = Object.freeze({
  [WORLD_PVP_OUTCOME.VICTORY]: {
    honor: 24,
    weeklyHonor: 24,
    pvpReputation: 3,
    zoneProgressDelta: 2,
    moraleDelta: 0,
  },
  [WORLD_PVP_OUTCOME.CLOSE_VICTORY]: {
    honor: 16,
    weeklyHonor: 16,
    pvpReputation: 2,
    zoneProgressDelta: 1,
    moraleDelta: 0,
  },
  [WORLD_PVP_OUTCOME.DRAW]: {
    honor: 8,
    weeklyHonor: 8,
    pvpReputation: 1,
    zoneProgressDelta: 0,
    moraleDelta: 0,
  },
  [WORLD_PVP_OUTCOME.RETREAT]: {
    honor: 3,
    weeklyHonor: 3,
    pvpReputation: 0,
    zoneProgressDelta: -1,
    moraleDelta: 0,
  },
  [WORLD_PVP_OUTCOME.DEFEAT]: {
    honor: 1,
    weeklyHonor: 1,
    pvpReputation: 0,
    zoneProgressDelta: -2,
    moraleDelta: -2,
  },
});

export const WORLD_PVP_TUNING = Object.freeze({
  MAX_EVENTS_PER_ZONE_PER_DAY: 1,
  MAX_EVENTS_PER_DAY: 3,
  HOSTILE_DISADVANTAGE: 0.05,
  BASE_CHANCE: Object.freeze({
    [WORLD_PVP_PROFILE_TYPE.SAFE]: 0,
    [WORLD_PVP_PROFILE_TYPE.HOSTILE]: 0.1,
    [WORLD_PVP_PROFILE_TYPE.CONTESTED]: 0.2,
  }),
  SOLO_RISK_BONUS: 0.05,
  GROUP_RISK_REDUCTION: 0.05,
  UNDERLEVEL_RISK_BONUS: 0.05,
});

export const WORLD_PVP_STATE_DEFAULTS = Object.freeze({
  totalHonor: 0,
  weeklyHonor: 0,
  pvpReputation: 0,
  zoneStats: Object.freeze({}),
  lastProcessedDayIndex: 0,
  lastWeeklyRolloverDayIndex: 0,
});
