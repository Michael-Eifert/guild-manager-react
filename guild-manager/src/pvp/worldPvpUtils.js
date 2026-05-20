import { GUILD_FACTION, GUILD_SERVER_STYLE } from "../constants";
import {
  ZONE_FACTION,
  isStarterZone,
} from "../zones/zoneDefinitions";
import {
  WORLD_PVP_PROFILE_LABEL,
  WORLD_PVP_PROFILE_TYPE,
  WORLD_PVP_STATE_DEFAULTS,
  WORLD_PVP_TUNING,
} from "./worldPvpDefinitions";

const clampNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
};

const clampProgress = (value) => Math.round(clampNumber(value, 0, 100));

const normalizeDayIndex = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.floor(numeric));
};

export const getOpposingFaction = (faction) =>
  faction === GUILD_FACTION.HORDE ? GUILD_FACTION.ALLIANCE : GUILD_FACTION.HORDE;

const normalizeFaction = (faction, fallback = GUILD_FACTION.ALLIANCE) =>
  faction === GUILD_FACTION.HORDE || faction === GUILD_FACTION.ALLIANCE
    ? faction
    : fallback;

export const ensureWorldPvpState = (state, currentDayIndex = null) => {
  const safe = state && typeof state === "object" ? state : {};
  const zoneStatsSource =
    safe.zoneStats && typeof safe.zoneStats === "object" ? safe.zoneStats : {};
  const zoneStats = Object.entries(zoneStatsSource).reduce((next, [zoneId, stats]) => {
    if (!zoneId || !stats || typeof stats !== "object") return next;
    next[zoneId] = {
      eventsTriggered: Math.max(0, Math.floor(Number(stats.eventsTriggered) || 0)),
      victories: Math.max(0, Math.floor(Number(stats.victories) || 0)),
      defeats: Math.max(0, Math.floor(Number(stats.defeats) || 0)),
      honorEarned: Math.max(0, Math.floor(Number(stats.honorEarned) || 0)),
      lastEventDay: Number.isFinite(Number(stats.lastEventDay))
        ? Math.max(0, Math.floor(Number(stats.lastEventDay)))
        : null,
    };
    return next;
  }, {});
  const fallbackProcessedDay =
    currentDayIndex === null || currentDayIndex === undefined
      ? WORLD_PVP_STATE_DEFAULTS.lastProcessedDayIndex
      : normalizeDayIndex(currentDayIndex);

  return {
    totalHonor: Math.max(0, Math.floor(Number(safe.totalHonor) || 0)),
    weeklyHonor: Math.max(0, Math.floor(Number(safe.weeklyHonor) || 0)),
    pvpReputation: Math.max(0, Math.floor(Number(safe.pvpReputation) || 0)),
    zoneStats,
    lastProcessedDayIndex: Number.isFinite(Number(safe.lastProcessedDayIndex))
      ? normalizeDayIndex(safe.lastProcessedDayIndex)
      : fallbackProcessedDay,
    lastWeeklyRolloverDayIndex: Number.isFinite(Number(safe.lastWeeklyRolloverDayIndex))
      ? normalizeDayIndex(safe.lastWeeklyRolloverDayIndex)
      : WORLD_PVP_STATE_DEFAULTS.lastWeeklyRolloverDayIndex,
  };
};

export const getWorldPvpProfile = ({
  zone,
  characterFaction = GUILD_FACTION.ALLIANCE,
  realmType = GUILD_SERVER_STYLE.PVE,
} = {}) => {
  const faction = normalizeFaction(characterFaction);
  const zoneFaction = zone?.faction || ZONE_FACTION.NEUTRAL;
  const isPvpRealm = realmType === GUILD_SERVER_STYLE.PVP;
  const zoneId = zone?.id || null;
  const recommendedLevelMin = Math.max(1, Number(zone?.minLevel) || 1);
  const recommendedLevelMax = Math.max(
    recommendedLevelMin,
    Number(zone?.maxLevel) || recommendedLevelMin,
  );

  let pvpType = WORLD_PVP_PROFILE_TYPE.CONTESTED;
  let controllingFaction = zoneFaction;
  let description = "Contested territory. Characters are PvP flagged on PvP realms.";
  let hostileDisadvantage = 0;

  if (isStarterZone(zone)) {
    pvpType = WORLD_PVP_PROFILE_TYPE.SAFE;
    controllingFaction = zoneFaction === ZONE_FACTION.NEUTRAL ? faction : zoneFaction;
    description = "Friendly territory. PvP is not expected here.";
  }

  return {
    zoneId,
    key: pvpType,
    pvpType,
    label: WORLD_PVP_PROFILE_LABEL[pvpType],
    description,
    controllingFaction,
    recommendedLevelMin,
    recommendedLevelMax,
    hostileDisadvantage,
    active: isPvpRealm && pvpType !== WORLD_PVP_PROFILE_TYPE.SAFE,
    realmType,
  };
};

export const applyWorldPvpZoneProgressDelta = (character, zoneId, delta) => {
  if (!character || !zoneId || !delta) return character;
  const currentZoneId = String(character.currentZoneId || "");
  const zoneProgressById = {
    ...(character.zoneProgressById && typeof character.zoneProgressById === "object"
      ? character.zoneProgressById
      : {}),
  };
  const currentStored = clampProgress(
    zoneProgressById[zoneId] ??
      (currentZoneId === zoneId ? character.currentZoneProgress : 0),
  );
  const nextProgress = clampProgress(currentStored + delta);
  zoneProgressById[zoneId] = nextProgress;
  if (currentZoneId !== zoneId) {
    return { ...character, zoneProgressById };
  }
  return {
    ...character,
    currentZoneProgress: nextProgress,
    zoneProgress: nextProgress,
    zoneProgressById,
  };
};

export const getWorldPvpRiskChance = ({ profile, characters = [] } = {}) => {
  if (!profile?.active) return 0;
  const partySize = Array.isArray(characters) ? characters.length : 0;
  const underleveled = (Array.isArray(characters) ? characters : []).some(
    (character) =>
      Math.max(1, Number(character?.level) || 1) <
      Math.max(1, Number(profile.recommendedLevelMin) || 1),
  );
  let chance = WORLD_PVP_TUNING.BASE_CHANCE[profile.pvpType] || 0;
  if (partySize === 1) chance += WORLD_PVP_TUNING.SOLO_RISK_BONUS;
  if (partySize >= 3) chance -= WORLD_PVP_TUNING.GROUP_RISK_REDUCTION;
  if (underleveled) chance += WORLD_PVP_TUNING.UNDERLEVEL_RISK_BONUS;
  return Math.max(0, Math.min(1, chance));
};
