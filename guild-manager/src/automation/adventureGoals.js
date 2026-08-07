import {
  evaluateMissionKeyAccess,
  getCharacterOwnedKeys,
  getMissionRequiredKeys,
  getMissionRecommendedRange,
  getMissionRewardKeys,
} from "../missions/missionHelpers";
import {
  ZONE_DEFINITIONS,
  getZoneEliteQuestTemplates,
} from "../zones/zoneDefinitions";

export const ADVENTURE_GOAL_TYPE = Object.freeze({
  ATTUNEMENT: "attunement",
});

export const normalizeAdventureGoalQueue = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((goal, index) => {
      const type = String(goal?.type || "").trim();
      const keyId = String(goal?.keyId || "").trim();
      const sourceMissionId = String(goal?.sourceMissionId || "").trim();
      const targetMissionId = String(goal?.targetMissionId || "").trim();
      if (type !== ADVENTURE_GOAL_TYPE.ATTUNEMENT || !keyId || !sourceMissionId) {
        return null;
      }
      const id = String(goal?.id || "").trim();
      const createdAt = Number(goal?.createdAt);
      return {
        id:
          id ||
          `${ADVENTURE_GOAL_TYPE.ATTUNEMENT}:${keyId}:${sourceMissionId}:${
            targetMissionId || "target"
          }:${index}`,
        type,
        keyId,
        sourceMissionId,
        targetMissionId,
        createdAt: Number.isFinite(createdAt) ? createdAt : 0,
      };
    })
    .filter(Boolean);
};

export const getAdventureGoalQueue = (character) =>
  normalizeAdventureGoalQueue(character?.adventureGoalQueue);

export const hasCharacterKey = (character, keyId) =>
  getCharacterOwnedKeys(character).some(
    (ownedKeyId) => String(ownedKeyId) === String(keyId),
  );

const getCharacterLevel = (character) =>
  Math.max(1, Math.floor(Number(character?.level) || 1));

export const getAttunementSourceMinimumLevel = (sourceMission) => {
  const recommended = getMissionRecommendedRange(sourceMission);
  return Math.max(
    1,
    Math.floor(
      Number(
        sourceMission?.entryLevel ??
          sourceMission?.minLevel ??
          recommended?.minLevel ??
          1,
      ) || 1,
    ),
  );
};

export const canCharacterStartAttunementSource = ({ character, target }) => {
  if (
    !character ||
    !target?.sourceMission ||
    hasCharacterKey(character, target.keyId)
  ) {
    return false;
  }
  if (
    getCharacterLevel(character) <
    getAttunementSourceMinimumLevel(target.sourceMission)
  ) {
    return false;
  }
  return evaluateMissionKeyAccess({
    missions: [target.sourceMission],
    partyMembers: [character],
  }).canEnter;
};

export const getAttunementEligibleMembers = ({ members, target }) =>
  (Array.isArray(members) ? members : []).filter((member) =>
    canCharacterStartAttunementSource({ character: member, target }),
  );

export const getAttunementPlanningMembers = ({ members, target }) => {
  const keyId = String(target?.keyId || "").trim();
  if (!keyId) return [];
  return (Array.isArray(members) ? members : []).filter(
    (member) => !hasCharacterKey(member, keyId),
  );
};

export const hasMatchingAdventureGoal = (character, goal) => {
  const keyId = String(goal?.keyId || "").trim();
  const sourceMissionId = String(goal?.sourceMissionId || "").trim();
  const targetMissionId = String(goal?.targetMissionId || "").trim();
  if (!keyId || !sourceMissionId) return false;
  return getAdventureGoalQueue(character).some(
    (entry) =>
      entry.type === ADVENTURE_GOAL_TYPE.ATTUNEMENT &&
      entry.keyId === keyId &&
      entry.sourceMissionId === sourceMissionId &&
      entry.targetMissionId === targetMissionId,
  );
};

export const buildAdventureGoal = ({
  id,
  keyId,
  sourceMissionId,
  targetMissionId,
  createdAt = 0,
}) => ({
  id,
  type: ADVENTURE_GOAL_TYPE.ATTUNEMENT,
  keyId: String(keyId || "").trim(),
  sourceMissionId: String(sourceMissionId || "").trim(),
  targetMissionId: String(targetMissionId || "").trim(),
  createdAt: Number.isFinite(Number(createdAt)) ? Number(createdAt) : 0,
});

export const addAdventureGoalToCharacter = ({ character, goal }) => {
  const normalizedGoal = normalizeAdventureGoalQueue([goal])[0];
  if (!normalizedGoal || hasCharacterKey(character, normalizedGoal.keyId)) {
    return character;
  }
  const currentQueue = getAdventureGoalQueue(character);
  if (hasMatchingAdventureGoal(character, normalizedGoal)) return character;
  return {
    ...character,
    adventureGoalQueue: [...currentQueue, normalizedGoal],
  };
};

export const removeAdventureGoalFromCharacter = ({
  character,
  goalId,
  keyId,
  sourceMissionId,
  targetMissionId,
}) => {
  const currentQueue = getAdventureGoalQueue(character);
  const nextQueue = currentQueue.filter((goal) => {
    if (goalId && String(goal.id) === String(goalId)) return false;
    if (keyId && String(goal.keyId) !== String(keyId)) return true;
    if (
      sourceMissionId &&
      String(goal.sourceMissionId) !== String(sourceMissionId)
    ) {
      return true;
    }
    if (
      targetMissionId &&
      String(goal.targetMissionId) !== String(targetMissionId)
    ) {
      return true;
    }
    return goalId ? true : !(keyId || sourceMissionId || targetMissionId);
  });
  return nextQueue.length === currentQueue.length
    ? character
    : { ...character, adventureGoalQueue: nextQueue };
};

export const clearCompletedAdventureGoals = ({ character, awardedKeyIds }) => {
  const awardedKeySet = new Set(
    (Array.isArray(awardedKeyIds) ? awardedKeyIds : [])
      .map((keyId) => String(keyId || "").trim())
      .filter(Boolean),
  );
  if (awardedKeySet.size === 0) return character;
  const currentQueue = getAdventureGoalQueue(character);
  const nextQueue = currentQueue.filter(
    (goal) => !awardedKeySet.has(String(goal.keyId)),
  );
  return nextQueue.length === currentQueue.length
    ? character
    : { ...character, adventureGoalQueue: nextQueue };
};

export const buildDungeonAttunementTargets = ({ missionList, roster = [] }) => {
  const zoneEliteMissions = ZONE_DEFINITIONS.flatMap((zone) =>
    getZoneEliteQuestTemplates(zone.id),
  );
  const missions = [
    ...(Array.isArray(missionList) ? missionList.filter(Boolean) : []),
    ...zoneEliteMissions,
  ];
  const dungeonMissions = missions.filter((mission) => mission?.type === "dungeon");
  const sourceMissionsByKey = new Map();
  const targetMissionsByKey = new Map();

  missions.forEach((mission) => {
    getMissionRewardKeys(mission).forEach((keyId) => {
      if (!sourceMissionsByKey.has(keyId)) sourceMissionsByKey.set(keyId, []);
      sourceMissionsByKey.get(keyId).push(mission);
    });
  });

  dungeonMissions
    .filter((mission) => mission?.requiresKey)
    .forEach((targetMission) => {
      getMissionRequiredKeys(targetMission).forEach((keyId) => {
        if (!targetMissionsByKey.has(keyId)) targetMissionsByKey.set(keyId, []);
        targetMissionsByKey.get(keyId).push(targetMission);
      });
    });

  const sortMissions = (entries) =>
    [...entries].sort((left, right) => {
      if ((left?.level || 0) !== (right?.level || 0)) {
        return (left?.level || 0) - (right?.level || 0);
      }
      const leftWingOrder = Number(left?.wingOrder) || 0;
      const rightWingOrder = Number(right?.wingOrder) || 0;
      if (leftWingOrder !== rightWingOrder) return leftWingOrder - rightWingOrder;
      return String(left?.name || "").localeCompare(String(right?.name || ""));
    });

  const targets = [...targetMissionsByKey.entries()].map(
    ([keyId, targetMissionEntries]) => {
      const targetMissions = sortMissions(targetMissionEntries);
      const targetMission = targetMissions[0] || null;
      const targetMissionIds = targetMissions
        .map((mission) => String(mission?.id || ""))
        .filter(Boolean);
      const sourceMissions = sortMissions(sourceMissionsByKey.get(keyId) || []);
      const sourceMission = sourceMissions[0] || null;
      const goalTargetId = `key:${keyId}`;
      const holders = roster.filter((member) => hasCharacterKey(member, keyId));
      const missing = roster.filter((member) => !hasCharacterKey(member, keyId));
      const queued = roster.filter((member) =>
        getAdventureGoalQueue(member).some(
          (goal) =>
            goal.keyId === keyId &&
            (!sourceMission || goal.sourceMissionId === String(sourceMission.id)) &&
            (goal.targetMissionId === goalTargetId ||
              !goal.targetMissionId ||
              targetMissionIds.includes(String(goal.targetMissionId))),
        ),
      );
      return {
        id: `key:${keyId}`,
        keyId,
        goalTargetId,
        targetMission,
        targetMissions,
        targetMissionIds,
        sourceMission,
        sourceMissions,
        holders,
        missing,
        queued,
        isRaidTarget: targetMissions.some((mission) => mission?.isRaid === true),
        isReady: Boolean(sourceMission),
      };
    },
  );

  return targets.sort((left, right) => {
    if (left.isReady !== right.isReady) return left.isReady ? -1 : 1;
    if (left.isRaidTarget !== right.isRaidTarget) return left.isRaidTarget ? -1 : 1;
    if ((left.targetMission?.level || 0) !== (right.targetMission?.level || 0)) {
      return (left.targetMission?.level || 0) - (right.targetMission?.level || 0);
    }
    return String(left.targetMission?.name || "").localeCompare(
      String(right.targetMission?.name || ""),
    );
  });
};
