import { GUILD_SERVER_STYLE } from "../constants";
import {
  ZONE_DEFINITIONS,
  getZoneById,
} from "../zones/zoneDefinitions";
import {
  WORLD_PVP_PROFILE_TYPE,
} from "./worldPvpDefinitions";
import {
  getWorldPvpProfile,
} from "./worldPvpUtils";
import type { Character } from "../types/characterTypes";

export const WORLD_PVP_ROAMING_MIN_LEVEL = 50;

const WORLD_PVP_ROAMING_ZONE_IDS = Object.freeze([
  "searing_gorge",
  "azshara",
  "felwood",
  "un_goro_crater",
  "blasted_lands",
  "burning_steppes",
  "western_plaguelands",
  "eastern_plaguelands",
  "winterspring",
  "silithus",
]);

type ZoneDefinition = (typeof ZONE_DEFINITIONS)[number];

const clampLevel = (level: unknown) => Math.max(1, Number(level) || 1);

const getStableCharacterRoamingHash = (character: Character | null | undefined) => {
  const source = String(
    character?.id ||
      character?.name ||
      character?.race ||
      character?.charClass ||
      "world-pvp-roamer",
  );
  return [...source].reduce(
    (hash, letter, index) => (hash + letter.charCodeAt(0) * (index + 17)) % 9973,
    0,
  );
};

export const isWorldPvpRoamingEligible = ({
  character,
  realmType = GUILD_SERVER_STYLE.PVE,
}: {
  character?: Character | null;
  realmType?: string;
} = {}) => {
  if (realmType !== GUILD_SERVER_STYLE.PVP) return false;
  if (!character || character.status === "Questing") return false;
  return clampLevel(character.level) >= WORLD_PVP_ROAMING_MIN_LEVEL;
};

const isZoneActiveForWorldPvp = ({
  zone,
  faction,
  realmType,
}: {
  zone: ZoneDefinition;
  faction?: string;
  realmType: string;
}) => {
  const profile = getWorldPvpProfile({
    zone,
    characterFaction: faction,
    realmType,
  });
  return profile.active && profile.pvpType === WORLD_PVP_PROFILE_TYPE.CONTESTED;
};

export const getWorldPvpRoamingZoneCandidates = ({
  level = 1,
  faction,
  realmType = GUILD_SERVER_STYLE.PVE,
}: {
  level?: number;
  faction?: string;
  realmType?: string;
} = {}) => {
  const safeLevel = clampLevel(level);
  const minimumMaxLevel = safeLevel >= 60 ? 55 : Math.max(45, safeLevel - 5);
  const preferredZoneIds = new Set(WORLD_PVP_ROAMING_ZONE_IDS);
  return ZONE_DEFINITIONS.filter((zone) => {
    if (!preferredZoneIds.has(zone.id)) return false;
    if (zone.minLevel > safeLevel) return false;
    if (zone.maxLevel < minimumMaxLevel) return false;
    return isZoneActiveForWorldPvp({ zone, faction, realmType });
  }).sort((left, right) => {
    const levelFitDiff =
      Math.abs(safeLevel - right.maxLevel) - Math.abs(safeLevel - left.maxLevel);
    if (levelFitDiff !== 0) return levelFitDiff;
    if (right.maxLevel !== left.maxLevel) return right.maxLevel - left.maxLevel;
    return left.name.localeCompare(right.name);
  });
};

export const pickWorldPvpRoamingZone = ({
  character,
  faction,
  realmType = GUILD_SERVER_STYLE.PVE,
}: {
  character?: Character | null;
  faction?: string;
  realmType?: string;
} = {}) => {
  const candidates = getWorldPvpRoamingZoneCandidates({
    level: character?.level,
    faction,
    realmType,
  });
  if (candidates.length === 0) return null;
  const topCandidateCount = Math.min(4, candidates.length);
  const topCandidates = candidates.slice(0, topCandidateCount);
  const index = getStableCharacterRoamingHash(character) % topCandidates.length;
  return topCandidates[index];
};

export const resolveWorldPvpRoamingAssignment = ({
  character,
  faction,
  realmType = GUILD_SERVER_STYLE.PVE,
}: {
  character?: Character | null;
  faction?: string;
  realmType?: string;
} = {}): Character | null | undefined => {
  if (!character || !isWorldPvpRoamingEligible({ character, realmType })) {
    return character;
  }
  if (character?.zoneManualOverride) return character;

  const currentZone = getZoneById(character.currentZoneId);
  if (currentZone && isZoneActiveForWorldPvp({ zone: currentZone, faction, realmType })) {
    return {
      ...character,
      status: "Idle",
      statusText: `World PvP: ${currentZone.name}`,
    };
  }

  const roamingZone = pickWorldPvpRoamingZone({ character, faction, realmType });
  if (!roamingZone) return character;

  const zoneProgressById =
    character.zoneProgressById && typeof character.zoneProgressById === "object"
      ? { ...character.zoneProgressById }
      : {};
  const currentZoneProgress = Math.max(
    0,
    Math.min(100, Number(zoneProgressById[roamingZone.id]) || 0),
  );
  zoneProgressById[roamingZone.id] = currentZoneProgress;

  return {
    ...character,
    status: "Idle",
    statusText: `World PvP: ${roamingZone.name}`,
    currentZoneId: roamingZone.id,
    currentZoneProgress,
    zoneProgress: currentZoneProgress,
    zoneProgressById,
  };
};
