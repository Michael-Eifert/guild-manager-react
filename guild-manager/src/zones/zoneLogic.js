import { GAMEPLAY_TUNING, GUILD_FACTION, ZONE_TUNING } from "../constants";
import { CONTENT_PHASE } from "../content/contentRules";
import {
  ZONE_PROGRESS_CHECKPOINTS,
  getCanonicalZoneId,
  getStarterZoneIdForRace,
  getZoneById,
  getZoneOverlevel,
  mergeZoneMissionsIntoList,
  pickNextZoneForCharacter,
} from "./zoneDefinitions";

const {
  ENABLE_ZONE_QUESTING,
} = GAMEPLAY_TUNING;

const {
  STARTER_DURATION_VARIANCE_MIN: STARTER_ZONE_DURATION_VARIANCE_MIN,
  STARTER_DURATION_VARIANCE_MAX: STARTER_ZONE_DURATION_VARIANCE_MAX,
  OVERLEVEL_MOVE_THRESHOLD_MIN: ZONE_OVERLEVEL_MOVE_THRESHOLD_MIN,
  OVERLEVEL_MOVE_THRESHOLD_MAX: ZONE_OVERLEVEL_MOVE_THRESHOLD_MAX,
} = ZONE_TUNING;

export const getClampedZoneProgress = (value) =>
  Math.max(0, Math.min(100, Number(value) || 0));

export const getRandomStarterZoneDurationVariance = () =>
  STARTER_ZONE_DURATION_VARIANCE_MIN +
  Math.random() *
    (STARTER_ZONE_DURATION_VARIANCE_MAX - STARTER_ZONE_DURATION_VARIANCE_MIN);

export const getRandomZoneOverlevelMoveThreshold = () =>
  ZONE_OVERLEVEL_MOVE_THRESHOLD_MIN +
  Math.floor(
    Math.random() *
      (ZONE_OVERLEVEL_MOVE_THRESHOLD_MAX -
        ZONE_OVERLEVEL_MOVE_THRESHOLD_MIN +
        1),
  );

export const normalizeZoneOverlevelMoveThreshold = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  const roundedValue = Math.floor(numericValue);
  if (
    roundedValue < ZONE_OVERLEVEL_MOVE_THRESHOLD_MIN ||
    roundedValue > ZONE_OVERLEVEL_MOVE_THRESHOLD_MAX
  ) {
    return null;
  }
  return roundedValue;
};

export const resolveZoneAutoTransition = ({
  character = null,
  faction,
  level,
  currentZoneId,
  currentZoneProgress,
  zoneProgressById,
  zonesCleared,
  zoneCheckpointRewardsClaimedByZone,
  zoneManualOverride,
  zoneOverlevelMoveThreshold,
  forceAdvance = false,
  contentPhase = String(CONTENT_PHASE.CLASSIC),
}) => {
  const currentZone = currentZoneId
    ? getZoneById(currentZoneId, level, contentPhase)
    : null;
  const safeThreshold =
    normalizeZoneOverlevelMoveThreshold(zoneOverlevelMoveThreshold) ??
    ZONE_OVERLEVEL_MOVE_THRESHOLD_MIN;

  if (!currentZone) {
    return {
      currentZoneId: currentZoneId || null,
      currentZoneProgress: getClampedZoneProgress(currentZoneProgress),
      zoneProgressById,
      zonesCleared,
      zoneCheckpointRewardsClaimedByZone,
      zoneManualOverride: Boolean(zoneManualOverride),
      zoneOverlevelMoveThreshold: safeThreshold,
      currentZone: null,
    };
  }

  const currentZoneCleared = (Array.isArray(zonesCleared) ? zonesCleared : [])
    .map((zoneId) => String(zoneId || "").trim())
    .includes(currentZone.id);
  const shouldAdvanceByOverlevel =
    getZoneOverlevel(level, currentZone) >= safeThreshold;
  if (!forceAdvance && !currentZoneCleared && !shouldAdvanceByOverlevel) {
    return {
      currentZoneId: currentZone.id,
      currentZoneProgress: getClampedZoneProgress(currentZoneProgress),
      zoneProgressById,
      zonesCleared,
      zoneCheckpointRewardsClaimedByZone,
      zoneManualOverride: Boolean(zoneManualOverride),
      zoneOverlevelMoveThreshold: safeThreshold,
      currentZone,
    };
  }

  const nextZone = pickNextZoneForCharacter({
    character,
    faction,
    level,
    zonesCleared,
    currentZoneId: currentZone.id,
    contentPhase,
  });
  if (!nextZone?.id || nextZone.id === currentZone.id) {
    return {
      currentZoneId: currentZone.id,
      currentZoneProgress: getClampedZoneProgress(currentZoneProgress),
      zoneProgressById,
      zonesCleared,
      zoneCheckpointRewardsClaimedByZone,
      zoneManualOverride: Boolean(zoneManualOverride),
      zoneOverlevelMoveThreshold: safeThreshold,
      currentZone,
    };
  }

  const nextZoneProgressById = {
    ...(zoneProgressById && typeof zoneProgressById === "object"
      ? zoneProgressById
      : {}),
  };
  const nextZoneProgress = getClampedZoneProgress(
    nextZoneProgressById[nextZone.id] ?? 0,
  );
  nextZoneProgressById[nextZone.id] = Math.max(
    nextZoneProgressById[nextZone.id] || 0,
    nextZoneProgress,
  );

  const nextCheckpointMap = {
    ...(zoneCheckpointRewardsClaimedByZone &&
    typeof zoneCheckpointRewardsClaimedByZone === "object"
      ? zoneCheckpointRewardsClaimedByZone
      : {}),
  };
  if (!Array.isArray(nextCheckpointMap[nextZone.id])) {
    nextCheckpointMap[nextZone.id] = [];
  }

  return {
    currentZoneId: nextZone.id,
    currentZoneProgress: nextZoneProgress,
    zoneProgressById: nextZoneProgressById,
    zonesCleared,
    zoneCheckpointRewardsClaimedByZone: nextCheckpointMap,
    zoneManualOverride: false,
    zoneOverlevelMoveThreshold: getRandomZoneOverlevelMoveThreshold(),
    currentZone: nextZone,
  };
};

export const normalizeZoneIdList = (
  value,
  characterLevel = 1,
  contentPhase = String(CONTENT_PHASE.CLASSIC),
) =>
  [
    ...new Set(
      (Array.isArray(value) ? value : [])
        .map((zoneId) => getCanonicalZoneId(zoneId, characterLevel))
        .map((zoneId) => String(zoneId || "").trim()),
    ),
  ]
    .filter(Boolean)
    .filter((zoneId) =>
      Boolean(getZoneById(zoneId, characterLevel, contentPhase)),
    );

export const normalizeZoneProgressMap = (
  value,
  characterLevel = 1,
  contentPhase = String(CONTENT_PHASE.CLASSIC),
) => {
  const source = value && typeof value === "object" ? value : {};
  return Object.entries(source).reduce((acc, [zoneId, progress]) => {
    const canonicalZoneId = getCanonicalZoneId(zoneId, characterLevel);
    if (!getZoneById(canonicalZoneId, characterLevel, contentPhase)) return acc;
    acc[canonicalZoneId] = Math.max(
      getClampedZoneProgress(acc[canonicalZoneId]),
      getClampedZoneProgress(progress),
    );
    return acc;
  }, {});
};

export const normalizeZoneCheckpointMap = (
  value,
  characterLevel = 1,
  contentPhase = String(CONTENT_PHASE.CLASSIC),
) => {
  const source = value && typeof value === "object" ? value : {};
  return Object.entries(source).reduce((acc, [zoneId, checkpointValues]) => {
    const canonicalZoneId = getCanonicalZoneId(zoneId, characterLevel);
    if (!getZoneById(canonicalZoneId, characterLevel, contentPhase)) return acc;
    const checkpoints = [
      ...new Set(
        [
          ...(Array.isArray(acc[canonicalZoneId]) ? acc[canonicalZoneId] : []),
          ...(Array.isArray(checkpointValues) ? checkpointValues : []),
        ]
          .map((checkpoint) => Number(checkpoint))
          .filter((checkpoint) =>
            ZONE_PROGRESS_CHECKPOINTS.includes(checkpoint),
          ),
      ),
    ].sort((left, right) => left - right);
    if (checkpoints.length > 0) {
      acc[canonicalZoneId] = checkpoints;
    }
    return acc;
  }, {});
};

export const normalizeCharacterZoneState = (
  char,
  fallbackFaction = GUILD_FACTION.ALLIANCE,
  contentPhase = String(CONTENT_PHASE.CLASSIC),
) => {
  const characterLevel = Math.max(1, Number(char?.level) || 1);
  const rawClearedZoneIds = (
    Array.isArray(char?.zonesCleared) ? char.zonesCleared : []
  )
    .map((zoneId) => String(zoneId || "").trim())
    .filter(Boolean);
  const zoneProgressById = normalizeZoneProgressMap(
    char?.zoneProgressById,
    characterLevel,
    contentPhase,
  );
  const zonesCleared = normalizeZoneIdList(
    rawClearedZoneIds,
    characterLevel,
    contentPhase,
  );
  if (rawClearedZoneIds.includes("stranglethorn_vale")) {
    if (!zonesCleared.includes("stranglethorn_vale_north")) {
      zonesCleared.push("stranglethorn_vale_north");
    }
    if (!zonesCleared.includes("stranglethorn_vale_south")) {
      zonesCleared.push("stranglethorn_vale_south");
    }
  }
  const zoneCheckpointRewardsClaimedByZone = normalizeZoneCheckpointMap(
    char?.zoneCheckpointRewardsClaimedByZone,
    characterLevel,
    contentPhase,
  );

  const explicitCurrentZoneId = getCanonicalZoneId(
    char?.currentZoneId,
    characterLevel,
  );
  const starterZoneId = getStarterZoneIdForRace(char?.race, contentPhase);
  const starterZone = getZoneById(
    starterZoneId,
    characterLevel,
    contentPhase,
  );
  const eligibleStarterZoneId =
    starterZone && characterLevel <= starterZone.maxLevel
      ? starterZone.id
      : null;
  const pickedZoneId = pickNextZoneForCharacter({
    character: char,
    faction: fallbackFaction,
    level: char?.level,
    zonesCleared,
    currentZoneId: eligibleStarterZoneId,
    contentPhase,
  })?.id;
  const currentZoneId = getZoneById(
    explicitCurrentZoneId,
    characterLevel,
    contentPhase,
  )
    ? explicitCurrentZoneId
    : eligibleStarterZoneId || pickedZoneId || null;
  const currentZone = getZoneById(currentZoneId, characterLevel, contentPhase);

  const legacyZoneProgress = getClampedZoneProgress(char?.zoneProgress);
  const currentZoneProgress = getClampedZoneProgress(
    char?.currentZoneProgress ??
      (currentZoneId ? zoneProgressById[currentZoneId] : legacyZoneProgress) ??
      legacyZoneProgress,
  );

  if (currentZoneId) {
    zoneProgressById[currentZoneId] = Math.max(
      zoneProgressById[currentZoneId] || 0,
      currentZoneProgress,
    );
    if (!zoneCheckpointRewardsClaimedByZone[currentZoneId]) {
      zoneCheckpointRewardsClaimedByZone[currentZoneId] = [];
    }
  }

  const normalizedDurationVariance = Number(char?.zoneDurationVariance);
  const zoneDurationVariance =
    Number.isFinite(normalizedDurationVariance) &&
    normalizedDurationVariance >= 0.85 &&
    normalizedDurationVariance <= 1.2
      ? normalizedDurationVariance
      : getRandomStarterZoneDurationVariance();
  const zoneOverlevelMoveThreshold =
    normalizeZoneOverlevelMoveThreshold(char?.zoneOverlevelMoveThreshold) ??
    getRandomZoneOverlevelMoveThreshold();

  return {
    ...char,
    currentZoneId: currentZone?.id || null,
    currentZoneProgress,
    zoneProgressById,
    zonesCleared,
    zoneCheckpointRewardsClaimedByZone,
    zoneDurationVariance,
    zoneOverlevelMoveThreshold,
    zoneManualOverride: Boolean(char?.zoneManualOverride),
  };
};

export const normalizeRosterZones = (
  rosterSnapshot,
  fallbackFaction = GUILD_FACTION.ALLIANCE,
  contentPhase = String(CONTENT_PHASE.CLASSIC),
) =>
  (Array.isArray(rosterSnapshot) ? rosterSnapshot : []).map((member) =>
    normalizeCharacterZoneState(member, fallbackFaction, contentPhase),
  );

export const getZoneProgressLabel = (zone, progress) => {
  if (!zone) return "";
  return `${zone.name} (${Math.floor(getClampedZoneProgress(progress))}%)`;
};

export const assignZoneToRoster = ({
  rosterSnapshot,
  memberIds,
  zoneId,
  fallbackFaction = GUILD_FACTION.ALLIANCE,
  contentPhase = String(CONTENT_PHASE.CLASSIC),
}) => {
  const zone = getZoneById(zoneId, 1, contentPhase);
  if (!zone) return rosterSnapshot;

  const targetMemberIds = new Set(
    (Array.isArray(memberIds) ? memberIds : []).map((memberId) =>
      String(memberId || ""),
    ),
  );
  if (targetMemberIds.size === 0) return rosterSnapshot;

  return (Array.isArray(rosterSnapshot) ? rosterSnapshot : []).map((char) => {
    if (!targetMemberIds.has(String(char?.id || ""))) return char;
    const normalizedChar = normalizeCharacterZoneState(
      char,
      fallbackFaction,
      contentPhase,
    );
    const existingProgress = getClampedZoneProgress(
      normalizedChar.zoneProgressById?.[zone.id] ?? 0,
    );
    return {
      ...normalizedChar,
      currentZoneId: zone.id,
      currentZoneProgress: existingProgress,
      statusText: `\uD83E\uDDED Zone: ${getZoneProgressLabel(zone, existingProgress)}`,
      zoneOverlevelMoveThreshold: getRandomZoneOverlevelMoveThreshold(),
      zoneManualOverride: true,
    };
  });
};

export const getMissionListWithZones = (
  missions,
  contentPhase = String(CONTENT_PHASE.CLASSIC),
) =>
  ENABLE_ZONE_QUESTING
    ? mergeZoneMissionsIntoList(missions, contentPhase)
    : missions;
