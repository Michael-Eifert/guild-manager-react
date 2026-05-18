export const RELATIONSHIP_LEVEL = Object.freeze({
  HATED: "Hated",
  UNFRIENDLY: "Unfriendly",
  STRANGER: "Stranger",
  ACQUAINTED: "Acquainted",
  LIKED: "Liked",
  FRIEND: "Friend",
  GOOD_FRIEND: "Good Friend",
});

export const RELATIONSHIP_THRESHOLDS = Object.freeze({
  HATED: -40,
  ACQUAINTED: 10,
  LIKED: 20,
  FRIEND: 35,
  GOOD_FRIEND: 80,
});

export const RELATIONSHIP_PROGRESS = Object.freeze({
  SHARED_ATTEMPT: 3,
  SUCCESS_BONUS: 2,
  FAILURE_PENALTY: -6,
});

export const RELATIONSHIP_POINT_RANGE = Object.freeze({
  MIN: -100,
  MAX: 100,
});

export const RELATIONSHIP_SUCCESS_MODIFIER = Object.freeze({
  HATED: -5,
  UNFRIENDLY: -2,
  LIKED: 2,
  FRIEND: 5,
});

const EMPTY_RELATIONSHIP_COUNTERS = Object.freeze({
  points: 0,
  runsTogether: 0,
  successfulRuns: 0,
  failedRuns: 0,
  dungeonRuns: 0,
  raidRuns: 0,
  eliteRuns: 0,
  successfulDungeonRuns: 0,
  failedDungeonRuns: 0,
  successfulRaidRuns: 0,
  failedRaidRuns: 0,
  successfulEliteRuns: 0,
  failedEliteRuns: 0,
});

const MAX_RELATIONSHIP_EVENTS = 30;

const normalizeId = (value) => String(value || "").trim();

const clampRelationshipPoints = (value) =>
  Math.max(
    RELATIONSHIP_POINT_RANGE.MIN,
    Math.min(
      RELATIONSHIP_POINT_RANGE.MAX,
      Math.floor(Number(value) || 0),
    ),
  );

const getNonNegativeInteger = (value) =>
  Math.max(0, Math.floor(Number(value) || 0));

const uniqueSortedIds = (ids) =>
  [...new Set((Array.isArray(ids) ? ids : []).map(normalizeId).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));

export const getRelationshipPairKey = (leftId, rightId) => {
  const ids = uniqueSortedIds([leftId, rightId]);
  return ids.length === 2 ? `${ids[0]}::${ids[1]}` : "";
};

export const getRelationshipLevel = (relationship) => {
  const points = Math.floor(Number(relationship?.points) || 0);
  if (points <= RELATIONSHIP_THRESHOLDS.HATED) {
    return RELATIONSHIP_LEVEL.HATED;
  }
  if (points < 0) {
    return RELATIONSHIP_LEVEL.UNFRIENDLY;
  }
  if (points >= RELATIONSHIP_THRESHOLDS.GOOD_FRIEND) {
    return RELATIONSHIP_LEVEL.GOOD_FRIEND;
  }
  if (points >= RELATIONSHIP_THRESHOLDS.FRIEND) {
    return RELATIONSHIP_LEVEL.FRIEND;
  }
  if (points >= RELATIONSHIP_THRESHOLDS.LIKED) {
    return RELATIONSHIP_LEVEL.LIKED;
  }
  if (points >= RELATIONSHIP_THRESHOLDS.ACQUAINTED) {
    return RELATIONSHIP_LEVEL.ACQUAINTED;
  }
  return RELATIONSHIP_LEVEL.STRANGER;
};

export const getRelationshipLevelSuccessModifier = (level) => {
  if (level === RELATIONSHIP_LEVEL.HATED) {
    return RELATIONSHIP_SUCCESS_MODIFIER.HATED;
  }
  if (level === RELATIONSHIP_LEVEL.UNFRIENDLY) {
    return RELATIONSHIP_SUCCESS_MODIFIER.UNFRIENDLY;
  }
  if (
    level === RELATIONSHIP_LEVEL.FRIEND ||
    level === RELATIONSHIP_LEVEL.GOOD_FRIEND
  ) {
    return RELATIONSHIP_SUCCESS_MODIFIER.FRIEND;
  }
  if (level === RELATIONSHIP_LEVEL.LIKED) {
    return RELATIONSHIP_SUCCESS_MODIFIER.LIKED;
  }
  return 0;
};

export const getRelationshipFlairs = (relationship) => {
  if (!relationship) return [];
  const flairs = [];
  const netDungeonSuccess =
    getNonNegativeInteger(relationship.successfulDungeonRuns) -
    getNonNegativeInteger(relationship.failedDungeonRuns);
  const netRaidSuccess =
    getNonNegativeInteger(relationship.successfulRaidRuns) -
    getNonNegativeInteger(relationship.failedRaidRuns);
  const netEliteSuccess =
    getNonNegativeInteger(relationship.successfulEliteRuns) -
    getNonNegativeInteger(relationship.failedEliteRuns);
  const netTotalSuccess =
    getNonNegativeInteger(relationship.successfulRuns) -
    getNonNegativeInteger(relationship.failedRuns);

  if (netDungeonSuccess >= 3) flairs.push("Dungeon Mate");
  if (netRaidSuccess >= 2) flairs.push("Raid Companion");
  if (netEliteSuccess >= 2) flairs.push("Elite Duo");
  if (netTotalSuccess >= 5) flairs.push("Reliable Pair");
  return flairs;
};

const normalizeRelationshipEvent = (event) => {
  if (!event || typeof event !== "object") return null;
  const missionName = String(event.missionName || "").trim();
  const activityType = String(event.activityType || "").trim();
  const pointsDelta = Math.floor(Number(event.pointsDelta) || 0);
  const occurredAt = Math.max(0, Math.floor(Number(event.occurredAt) || 0));
  if (!missionName && !activityType && pointsDelta === 0 && occurredAt === 0) {
    return null;
  }
  return {
    missionName,
    activityType,
    missionSucceeded: event.missionSucceeded === true,
    pointsDelta,
    occurredAt,
  };
};

const normalizeRelationshipEvents = (events) =>
  (Array.isArray(events) ? events : [])
    .map(normalizeRelationshipEvent)
    .filter(Boolean)
    .sort((left, right) => right.occurredAt - left.occurredAt)
    .slice(0, MAX_RELATIONSHIP_EVENTS);

const normalizeRelationshipEntry = (key, entry) => {
  const pairIds = uniqueSortedIds(entry?.memberIds || key.split("::"));
  if (pairIds.length !== 2) return null;
  const normalizedKey = getRelationshipPairKey(pairIds[0], pairIds[1]);
  if (!normalizedKey) return null;
  const successfulRuns = getNonNegativeInteger(entry?.successfulRuns);
  const failedRuns = getNonNegativeInteger(entry?.failedRuns);
  const dungeonRuns = getNonNegativeInteger(entry?.dungeonRuns);
  const raidRuns = getNonNegativeInteger(entry?.raidRuns);
  const eliteRuns = getNonNegativeInteger(entry?.eliteRuns);
  const successfulDungeonRuns = Number.isFinite(Number(entry?.successfulDungeonRuns))
    ? getNonNegativeInteger(entry.successfulDungeonRuns)
    : Math.min(dungeonRuns, successfulRuns);
  const failedDungeonRuns = Number.isFinite(Number(entry?.failedDungeonRuns))
    ? getNonNegativeInteger(entry.failedDungeonRuns)
    : Math.max(0, dungeonRuns - successfulDungeonRuns);
  const successfulRaidRuns = Number.isFinite(Number(entry?.successfulRaidRuns))
    ? getNonNegativeInteger(entry.successfulRaidRuns)
    : Math.min(raidRuns, successfulRuns);
  const failedRaidRuns = Number.isFinite(Number(entry?.failedRaidRuns))
    ? getNonNegativeInteger(entry.failedRaidRuns)
    : Math.max(0, raidRuns - successfulRaidRuns);
  const successfulEliteRuns = Number.isFinite(Number(entry?.successfulEliteRuns))
    ? getNonNegativeInteger(entry.successfulEliteRuns)
    : Math.min(eliteRuns, successfulRuns);
  const failedEliteRuns = Number.isFinite(Number(entry?.failedEliteRuns))
    ? getNonNegativeInteger(entry.failedEliteRuns)
    : Math.max(0, eliteRuns - successfulEliteRuns);

  return [
    normalizedKey,
    {
      memberIds: pairIds,
      points: clampRelationshipPoints(entry?.points),
      runsTogether: getNonNegativeInteger(entry?.runsTogether),
      successfulRuns,
      failedRuns,
      dungeonRuns,
      raidRuns,
      eliteRuns,
      successfulDungeonRuns,
      failedDungeonRuns,
      successfulRaidRuns,
      failedRaidRuns,
      successfulEliteRuns,
      failedEliteRuns,
      lastMissionName: String(entry?.lastMissionName || "").trim(),
      lastInteractionAt: Math.max(0, Math.floor(Number(entry?.lastInteractionAt) || 0)),
      events: normalizeRelationshipEvents(entry?.events),
    },
  ];
};

export const normalizeGuildRelationships = (relationships) => {
  if (!relationships || typeof relationships !== "object") return {};
  return Object.entries(relationships).reduce((acc, [key, entry]) => {
    const normalized = normalizeRelationshipEntry(key, entry);
    if (!normalized) return acc;
    const [normalizedKey, normalizedEntry] = normalized;
    acc[normalizedKey] = normalizedEntry;
    return acc;
  }, {});
};

const getMissionRelationshipActivityType = (mission, activityType = "") => {
  const explicitType = String(activityType || "").trim();
  if (explicitType) return explicitType;
  if (mission?.type === "dungeon") return mission?.isRaid ? "raid" : "dungeon";
  if (mission?.elite === true || mission?.isZoneElite === true) return "elite";
  return "";
};

export const isRelationshipEligibleMission = (mission, memberIds) => {
  const safeMemberIds = uniqueSortedIds(memberIds || mission?.memberIds);
  if (safeMemberIds.length < 2) return false;
  return Boolean(getMissionRelationshipActivityType(mission));
};

const getPairCombinations = (ids) => {
  const normalizedIds = uniqueSortedIds(ids);
  const pairs = [];
  for (let leftIndex = 0; leftIndex < normalizedIds.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < normalizedIds.length;
      rightIndex += 1
    ) {
      pairs.push([normalizedIds[leftIndex], normalizedIds[rightIndex]]);
    }
  }
  return pairs;
};

export const getRelationshipSuccessModifier = ({
  relationships,
  memberIds,
} = {}) => {
  const pairs = getPairCombinations(memberIds);
  if (pairs.length === 0) {
    return {
      successModifier: 0,
      level: RELATIONSHIP_LEVEL.STRANGER,
      affectedPairKey: "",
    };
  }

  const normalized = normalizeGuildRelationships(relationships);
  const pairModifiers = pairs
    .map(([leftId, rightId]) => {
      const pairKey = getRelationshipPairKey(leftId, rightId);
      const relationship = normalized[pairKey];
      const level = getRelationshipLevel(relationship);
      return {
        pairKey,
        level,
        relationship,
        successModifier: getRelationshipLevelSuccessModifier(level),
      };
    })
    .filter((entry) => entry.successModifier !== 0);

  if (pairModifiers.length === 0) {
    return {
      successModifier: 0,
      level: RELATIONSHIP_LEVEL.STRANGER,
      affectedPairKey: "",
    };
  }

  const strongestPenalty = pairModifiers
    .filter((entry) => entry.successModifier < 0)
    .sort((left, right) => left.successModifier - right.successModifier)[0];
  const dominantModifier =
    strongestPenalty ||
    pairModifiers
      .filter((entry) => entry.successModifier > 0)
      .sort((left, right) => right.successModifier - left.successModifier)[0];

  return {
    ...dominantModifier,
    affectedPairKey: dominantModifier?.pairKey || "",
  };
};

export const updateRelationshipsForSharedActivity = (
  relationships,
  {
    mission,
    memberIds = mission?.memberIds,
    missionSucceeded = false,
    occurredAt = 0,
    activityType = "",
  } = {},
) => {
  const safeMemberIds = uniqueSortedIds(memberIds);
  const resolvedActivityType = getMissionRelationshipActivityType(
    mission,
    activityType,
  );
  if (safeMemberIds.length < 2 || !resolvedActivityType) {
    return normalizeGuildRelationships(relationships);
  }

  const baseRelationships = normalizeGuildRelationships(relationships);
  const nextRelationships = { ...baseRelationships };
  const pointChange =
    RELATIONSHIP_PROGRESS.SHARED_ATTEMPT +
    (missionSucceeded
      ? RELATIONSHIP_PROGRESS.SUCCESS_BONUS
      : RELATIONSHIP_PROGRESS.FAILURE_PENALTY);
  const missionName = String(mission?.name || "").trim();
  const timestamp = Math.max(0, Math.floor(Number(occurredAt) || Date.now()));

  getPairCombinations(safeMemberIds).forEach(([leftId, rightId]) => {
    const key = getRelationshipPairKey(leftId, rightId);
    if (!key) return;
    const current = nextRelationships[key] || {
      memberIds: [leftId, rightId],
      ...EMPTY_RELATIONSHIP_COUNTERS,
      lastMissionName: "",
      lastInteractionAt: 0,
      events: [],
    };
    const events = normalizeRelationshipEvents([
      {
        missionName,
        activityType: resolvedActivityType,
        missionSucceeded,
        pointsDelta: pointChange,
        occurredAt: timestamp,
      },
      ...(Array.isArray(current.events) ? current.events : []),
    ]);
    nextRelationships[key] = {
      ...current,
      memberIds: [leftId, rightId],
      points: clampRelationshipPoints(current.points + pointChange),
      runsTogether: current.runsTogether + 1,
      successfulRuns: current.successfulRuns + (missionSucceeded ? 1 : 0),
      failedRuns: current.failedRuns + (missionSucceeded ? 0 : 1),
      dungeonRuns:
        current.dungeonRuns + (resolvedActivityType === "dungeon" ? 1 : 0),
      raidRuns: current.raidRuns + (resolvedActivityType === "raid" ? 1 : 0),
      eliteRuns: current.eliteRuns + (resolvedActivityType === "elite" ? 1 : 0),
      successfulDungeonRuns:
        current.successfulDungeonRuns +
        (resolvedActivityType === "dungeon" && missionSucceeded ? 1 : 0),
      failedDungeonRuns:
        current.failedDungeonRuns +
        (resolvedActivityType === "dungeon" && !missionSucceeded ? 1 : 0),
      successfulRaidRuns:
        current.successfulRaidRuns +
        (resolvedActivityType === "raid" && missionSucceeded ? 1 : 0),
      failedRaidRuns:
        current.failedRaidRuns +
        (resolvedActivityType === "raid" && !missionSucceeded ? 1 : 0),
      successfulEliteRuns:
        current.successfulEliteRuns +
        (resolvedActivityType === "elite" && missionSucceeded ? 1 : 0),
      failedEliteRuns:
        current.failedEliteRuns +
        (resolvedActivityType === "elite" && !missionSucceeded ? 1 : 0),
      lastMissionName: missionName,
      lastInteractionAt: timestamp,
      events,
    };
  });

  return nextRelationships;
};

export const removeMemberRelationships = (relationships, memberId) => {
  const normalizedMemberId = normalizeId(memberId);
  if (!normalizedMemberId) return normalizeGuildRelationships(relationships);
  return Object.fromEntries(
    Object.entries(normalizeGuildRelationships(relationships)).filter(([, entry]) =>
      !entry.memberIds.includes(normalizedMemberId),
    ),
  );
};

export const getCharacterRelationshipRows = ({
  relationships,
  characterId,
  roster,
}) => {
  const normalizedCharacterId = normalizeId(characterId);
  if (!normalizedCharacterId) return [];
  const rosterById = new Map(
    (Array.isArray(roster) ? roster : [])
      .filter((member) => normalizeId(member?.id))
      .map((member) => [normalizeId(member.id), member]),
  );

  return Object.values(normalizeGuildRelationships(relationships))
    .filter((entry) => entry.memberIds.includes(normalizedCharacterId))
    .map((entry) => {
      const otherMemberId = entry.memberIds.find(
        (memberId) => memberId !== normalizedCharacterId,
      );
      const otherMember = rosterById.get(otherMemberId);
      if (!otherMember) return null;
      return {
        relationship: entry,
        otherMember,
        level: getRelationshipLevel(entry),
        flairs: getRelationshipFlairs(entry),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.relationship.points !== left.relationship.points) {
        return right.relationship.points - left.relationship.points;
      }
      return String(left.otherMember.name || "").localeCompare(
        String(right.otherMember.name || ""),
      );
    });
};

export const buildRelationshipAdjacency = (relationships) => {
  const adjacency = {};
  Object.values(normalizeGuildRelationships(relationships)).forEach((entry) => {
    const [leftId, rightId] = entry.memberIds;
    if (!leftId || !rightId) return;
    if (!adjacency[leftId]) adjacency[leftId] = [];
    if (!adjacency[rightId]) adjacency[rightId] = [];
    adjacency[leftId].push({ memberId: rightId, relationship: entry });
    adjacency[rightId].push({ memberId: leftId, relationship: entry });
  });
  return adjacency;
};

export const findRelationshipClusters = ({
  relationships,
  minimumPoints = RELATIONSHIP_THRESHOLDS.FRIEND,
} = {}) => {
  const normalized = normalizeGuildRelationships(relationships);
  const adjacency = buildRelationshipAdjacency(
    Object.fromEntries(
      Object.entries(normalized).filter(
        ([, entry]) => (Number(entry.points) || 0) >= minimumPoints,
      ),
    ),
  );
  const visited = new Set();
  const clusters = [];

  Object.keys(adjacency).forEach((memberId) => {
    if (visited.has(memberId)) return;
    const stack = [memberId];
    const cluster = [];
    visited.add(memberId);
    while (stack.length > 0) {
      const currentId = stack.pop();
      cluster.push(currentId);
      (adjacency[currentId] || []).forEach((edge) => {
        if (visited.has(edge.memberId)) return;
        visited.add(edge.memberId);
        stack.push(edge.memberId);
      });
    }
    if (cluster.length >= 2) clusters.push(cluster.sort());
  });

  return clusters.sort((left, right) => right.length - left.length);
};
