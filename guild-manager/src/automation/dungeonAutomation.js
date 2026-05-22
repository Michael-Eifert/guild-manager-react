import { GUILD_DUNGEON_ACTIVITY, GUILD_FOCUS } from "../constants";
import { CALENDAR_DAY_MS } from "../calendar/calendarLogic";
import { evaluateMissionKeyAccess } from "../missions/missionHelpers";
import { isMissionBoardAvailableStatus } from "../missions/missionRosterGuards";
import { getCharacterPowerScore } from "../utils";
import {
  ADVENTURE_GOAL_TYPE,
  getAdventureGoalQueue,
  hasCharacterKey,
} from "./adventureGoals";

export const AUTO_DUNGEON_MIN_SUCCESS_CHANCE = 70;

export const AUTO_DUNGEON_INTERVAL_DAY_MULTIPLIER = Object.freeze({
  [GUILD_DUNGEON_ACTIVITY.MINIMAL]: 2,
  [GUILD_DUNGEON_ACTIVITY.BALANCED]: 1,
  [GUILD_DUNGEON_ACTIVITY.ALWAYS]: 0.5,
});
export const AUTO_DUNGEON_DAY_CHECKPOINTS = Object.freeze([0.2, 0.4, 0.6, 0.8]);

const AUTO_DUNGEON_REPEAT_MEMBER_PENALTY = 10_000;
const AUTO_DUNGEON_SAME_SEARCH_MISSION_PENALTY = 50_000;

const getAutoDungeonCheckpointKey = (now, calendarEpochGameTimeMs = 0) => {
  const safeNow = Math.max(0, Number(now) || 0);
  const safeEpoch = Math.max(0, Number(calendarEpochGameTimeMs) || 0);
  const elapsedMs = Math.max(0, safeNow - safeEpoch);
  const dayIndex = Math.floor(elapsedMs / CALENDAR_DAY_MS);
  const dayProgress = (elapsedMs % CALENDAR_DAY_MS) / CALENDAR_DAY_MS;
  const checkpointIndex = AUTO_DUNGEON_DAY_CHECKPOINTS.findIndex(
    (checkpoint) => dayProgress >= checkpoint && dayProgress < checkpoint + 0.2,
  );

  if (checkpointIndex < 0) return null;
  return `${dayIndex}:${checkpointIndex}`;
};

const parseRecommendedLevelRange = (mission) => {
  const values = String(mission?.recommended || "")
    .match(/\d+/g)
    ?.map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!values || values.length === 0) return null;
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
};

export const getAutoDungeonLevelRange = (mission) => {
  const recommended = parseRecommendedLevelRange(mission);
  const minimumLevel = Math.max(
    1,
    Math.floor(
      Number(
        mission?.entryLevel ?? mission?.minLevel ?? recommended?.min ?? 1,
      ) || 1,
    ),
  );
  const maximumLevel = Math.max(
    minimumLevel,
    Math.floor(
      Number(recommended?.max ?? mission?.level ?? minimumLevel + 5) ||
        minimumLevel + 5,
    ),
  );

  return {
    min: minimumLevel,
    max: maximumLevel,
  };
};

const getMissionPartyBounds = (mission) => {
  const recommendedPartySize = Math.max(
    1,
    Math.floor(Number(mission?.requiredPartySize) || 5),
  );
  const minimumPartySize = Math.max(
    1,
    Math.floor(
      Number(mission?.minPartySize) || Math.min(5, recommendedPartySize),
    ),
  );
  return {
    min: minimumPartySize,
    max: Math.max(minimumPartySize, recommendedPartySize),
  };
};

const sortDungeonMissionsByProgression = (left, right) => {
  if ((left?.level || 0) !== (right?.level || 0)) {
    return (left?.level || 0) - (right?.level || 0);
  }
  const leftWingOrder = Number(left?.wingOrder) || 0;
  const rightWingOrder = Number(right?.wingOrder) || 0;
  if (leftWingOrder !== rightWingOrder) return leftWingOrder - rightWingOrder;
  return String(left?.name || "").localeCompare(String(right?.name || ""));
};

const buildDungeonMissionSequences = (missionList) => {
  const dungeonMissions = (Array.isArray(missionList) ? missionList : [])
    .filter(
      (mission) =>
        mission?.type === "dungeon" &&
        mission?.isRaid !== true &&
        typeof mission?.id !== "undefined",
    )
    .sort(sortDungeonMissionsByProgression);
  const sequences = dungeonMissions.map((mission) => [mission]);
  const groupedBySet = new Map();

  dungeonMissions.forEach((mission) => {
    const setId = String(mission?.dungeonSetId || "").trim();
    if (!setId) return;
    if (!groupedBySet.has(setId)) groupedBySet.set(setId, []);
    groupedBySet.get(setId).push(mission);
  });

  groupedBySet.forEach((missions) => {
    const sortedMissions = [...missions].sort(sortDungeonMissionsByProgression);
    sortedMissions.forEach((mission, index) => {
      const nextMission = sortedMissions[index + 1];
      if (!nextMission) return;
      sequences.push([mission, nextMission]);
    });
  });

  return sequences;
};

const getMissionRewardKeyIds = (mission) =>
  Array.isArray(mission?.rewardKeys)
    ? mission.rewardKeys.map((keyId) => String(keyId || "")).filter(Boolean)
    : [];

const getAutoDungeonMissionHistoryKey = (mission) => {
  const id = String(mission?.id ?? mission?.questId ?? "").trim();
  if (id) return id;
  return String(mission?.name || "").trim();
};

const getRaidAttunementKeyIds = (missionList) => {
  const missions = Array.isArray(missionList) ? missionList : [];
  const attunementKeyIds = new Set(
    missions
      .filter((mission) => mission?.isRaid && mission?.requiresKey)
      .map((mission) => String(mission?.keyId || ""))
      .filter(Boolean),
  );

  let changed = true;
  while (changed) {
    changed = false;
    missions
      .filter((mission) => mission?.type === "dungeon" && mission?.isRaid !== true)
      .forEach((mission) => {
        const rewardsTargetKey = getMissionRewardKeyIds(mission).some((keyId) =>
          attunementKeyIds.has(keyId),
        );
        if (!rewardsTargetKey) return;
        const requiredKeyId = String(mission?.keyId || "");
        if (
          mission?.requiresKey &&
          requiredKeyId &&
          !attunementKeyIds.has(requiredKeyId)
        ) {
          attunementKeyIds.add(requiredKeyId);
          changed = true;
        }
      });
  }

  return attunementKeyIds;
};

const isRaidAttunementSequence = (missions, attunementKeyIds) =>
  missions.some((mission) =>
    getMissionRewardKeyIds(mission).some((keyId) => attunementKeyIds.has(keyId)),
  );

const getSequenceLevelRange = (missions) =>
  missions.reduce(
    (range, mission) => {
      const missionRange = getAutoDungeonLevelRange(mission);
      return {
        min: Math.max(range.min, missionRange.min),
        max: Math.min(range.max, missionRange.max),
      };
    },
    { min: 1, max: Number.POSITIVE_INFINITY },
  );

const getSequencePartyBounds = (missions) =>
  missions.reduce(
    (bounds, mission) => {
      const missionBounds = getMissionPartyBounds(mission);
      return {
        min: Math.max(bounds.min, missionBounds.min),
        max: Math.max(bounds.max, missionBounds.max),
      };
    },
    { min: 1, max: 1 },
  );

const memberMeetsSequenceKeyRequirements = (member, missions) =>
  missions.every((mission) => {
    if (mission?.requiresKeyForAllMembers !== true) return true;
    return Array.isArray(member?.keys)
      ? member.keys.some((keyId) => String(keyId) === String(mission.keyId))
      : false;
  });

const getLastAutoDungeonAt = (member) => {
  const timestamp = Number(member?.autoDungeonLastStartedAt);
  return Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : 0;
};

const hasAutoDungeonTimestamp = (member) =>
  Number.isFinite(Number(member?.autoDungeonLastStartedAt));

const getMemberLastAutoDungeonMissionKey = (member) =>
  String(member?.autoDungeonLastMissionId || member?.autoDungeonLastMissionName || "")
    .trim();

const sortByRecentDungeonThenPower = (left, right) => {
  const leftLastRun = getLastAutoDungeonAt(left);
  const rightLastRun = getLastAutoDungeonAt(right);
  if (leftLastRun !== rightLastRun) return leftLastRun - rightLastRun;
  const rightPower = getCharacterPowerScore(right);
  const leftPower = getCharacterPowerScore(left);
  if (rightPower !== leftPower) return rightPower - leftPower;
  return String(left?.name || "").localeCompare(String(right?.name || ""));
};

const addMember = (party, member) => {
  if (!member || party.some((entry) => entry.id === member.id)) return false;
  party.push(member);
  return true;
};

const buildDungeonParty = ({ missions, eligibleMembers, partySize, initiator }) => {
  const party = [];
  const sortedMembers = [...eligibleMembers].sort(sortByRecentDungeonThenPower);
  addMember(party, initiator);

  missions
    .filter((mission) => mission?.requiresKey && mission?.requiresKeyForAllMembers !== true)
    .forEach((mission) => {
      const keyHolder = sortedMembers.find((member) =>
        Array.isArray(member?.keys)
          ? member.keys.some((keyId) => String(keyId) === String(mission.keyId))
          : false,
      );
      addMember(party, keyHolder);
    });

  ["Tank", "Healer", "DPS"].forEach((role) => {
    if (party.length >= partySize) return;
    addMember(
      party,
      sortedMembers.find((member) => member?.role === role),
    );
  });

  sortedMembers.forEach((member) => {
    if (party.length >= partySize) return;
    addMember(party, member);
  });

  return party;
};

const getAvailableDungeonMembers = ({ roster, activeMissions }) => {
  const busyMemberIds = new Set(
    (Array.isArray(activeMissions) ? activeMissions : []).flatMap((mission) =>
      Array.isArray(mission?.memberIds)
        ? mission.memberIds.map((id) => String(id || "")).filter(Boolean)
        : [],
    ),
  );
  return (Array.isArray(roster) ? roster : []).filter(
    (member) =>
      member &&
      isMissionBoardAvailableStatus(member.status) &&
      !busyMemberIds.has(String(member.id || "")),
  );
};

const buildAttunementGoalParty = ({
  mission,
  eligibleMembers,
  queuedMembers,
  partySize,
}) => {
  const party = [];
  const sortedQueuedMembers = [...queuedMembers].sort(sortByRecentDungeonThenPower);
  const sortedMembers = [...eligibleMembers].sort(sortByRecentDungeonThenPower);

  sortedQueuedMembers.forEach((member) => {
    if (party.length < partySize) addMember(party, member);
  });

  if (mission?.requiresKey && mission?.requiresKeyForAllMembers !== true) {
    addMember(
      party,
      sortedMembers.find((member) => hasCharacterKey(member, mission.keyId)),
    );
  }

  ["Tank", "Healer", "DPS"].forEach((role) => {
    if (party.length >= partySize) return;
    addMember(
      party,
      sortedMembers.find((member) => member?.role === role),
    );
  });

  sortedMembers.forEach((member) => {
    if (party.length >= partySize) return;
    addMember(party, member);
  });

  return party;
};

const resolveQueuedAttunementCandidates = ({
  missionList,
  availableMembers,
  minSuccessChance,
  getSuccessPreview,
}) => {
  const missionLookup = new Map(
    (Array.isArray(missionList) ? missionList : [])
      .filter((mission) => mission?.id != null)
      .map((mission) => [String(mission.id), mission]),
  );
  const queuedGoalGroups = new Map();

  availableMembers.forEach((member) => {
    getAdventureGoalQueue(member).forEach((goal) => {
      if (
        goal.type !== ADVENTURE_GOAL_TYPE.ATTUNEMENT ||
        hasCharacterKey(member, goal.keyId)
      ) {
        return;
      }
      const mission = missionLookup.get(String(goal.sourceMissionId));
      if (!mission || mission.type !== "dungeon") return;
      if (!getMissionRewardKeyIds(mission).includes(goal.keyId)) return;
      const groupKey = `${goal.sourceMissionId}:${goal.keyId}:${
        goal.targetMissionId || ""
      }`;
      if (!queuedGoalGroups.has(groupKey)) {
        queuedGoalGroups.set(groupKey, {
          goal,
          mission,
          members: [],
        });
      }
      queuedGoalGroups.get(groupKey).members.push(member);
    });
  });

  const previewMission =
    typeof getSuccessPreview === "function" ? getSuccessPreview : null;
  const candidates = [];

  queuedGoalGroups.forEach(({ goal, mission, members }) => {
    const levelRange = getAutoDungeonLevelRange(mission);
    const partyBounds = getMissionPartyBounds(mission);
    const queuedMembers = members.filter((member) => {
      const level = Math.max(1, Number(member?.level) || 1);
      return level >= levelRange.min && level <= levelRange.max;
    });
    if (queuedMembers.length === 0) return;

    const eligibleMembers = availableMembers.filter((member) => {
      const level = Math.max(1, Number(member?.level) || 1);
      if (level < levelRange.min || level > levelRange.max) return false;
      return memberMeetsSequenceKeyRequirements(member, [mission]);
    });
    if (eligibleMembers.length < partyBounds.min) return;

    for (
      let partySize = partyBounds.min;
      partySize <= Math.min(partyBounds.max, eligibleMembers.length);
      partySize += 1
    ) {
      const party = buildAttunementGoalParty({
        mission,
        eligibleMembers,
        queuedMembers,
        partySize,
      });
      if (party.length < partySize) continue;
      if (!party.some((member) => queuedMembers.includes(member))) continue;

      const keyAccess = evaluateMissionKeyAccess({
        missions: [mission],
        partyMembers: party,
      });
      if (!keyAccess.canEnter) continue;

      const successChance = Math.max(
        0,
        Math.min(
          100,
          Number(previewMission?.(mission, party)?.successChance) || 0,
        ),
      );
      if (successChance < minSuccessChance) continue;

      const queuedGoalMemberIds = party
        .filter((member) =>
          queuedMembers.some((queuedMember) => queuedMember.id === member.id),
        )
        .map((member) => member.id);
      candidates.push({
        mission,
        missions: [mission],
        chainMissionIds: [],
        memberIds: party.map((member) => member.id),
        party,
        partySize,
        successChance,
        initiatorId: queuedGoalMemberIds[0] || party[0]?.id,
        goalType: ADVENTURE_GOAL_TYPE.ATTUNEMENT,
        keyId: goal.keyId,
        targetMissionId: goal.targetMissionId,
        sourceMissionId: goal.sourceMissionId,
        queuedGoalMemberIds,
        score:
          queuedGoalMemberIds.length * 1_000_000 +
          (mission?.isRaid ? 100_000 : 0) +
          successChance * 100 +
          (Number(mission?.level) || 0),
      });
      break;
    }
  });

  candidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.successChance !== left.successChance) {
      return right.successChance - left.successChance;
    }
    return String(left.mission?.name || "").localeCompare(
      String(right.mission?.name || ""),
    );
  });

  const selectedCandidates = [];
  let remainingCandidates = [...candidates];
  while (remainingCandidates.length > 0) {
    const nextCandidate = remainingCandidates[0];
    selectedCandidates.push(nextCandidate);
    const reservedMemberIds = new Set(
      nextCandidate.memberIds.map((memberId) => String(memberId)),
    );
    remainingCandidates = remainingCandidates.filter(
      (candidate) =>
        !candidate.memberIds.some((memberId) =>
          reservedMemberIds.has(String(memberId)),
        ),
    );
  }

  return selectedCandidates;
};

export const getAutoDungeonIntervalMs = (mode) =>
  Math.max(
    0,
    CALENDAR_DAY_MS *
      (AUTO_DUNGEON_INTERVAL_DAY_MULTIPLIER[mode] || 0),
  );

export const resolveAutoDungeonAttempt = ({
  mode,
  guildFocus,
  now,
  nextAttemptAt = 0,
  lastCheckpointKey = null,
  calendarEpochGameTimeMs = 0,
  missionList,
  roster,
  activeMissions,
  minSuccessChance = AUTO_DUNGEON_MIN_SUCCESS_CHANCE,
  getSuccessPreview,
}) => {
  const intervalMs = getAutoDungeonIntervalMs(mode);
  const safeMinSuccessChance =
    Number.isFinite(Number(minSuccessChance)) && Number(minSuccessChance) > 0
      ? Number(minSuccessChance)
      : AUTO_DUNGEON_MIN_SUCCESS_CHANCE;
  const safeNow = Math.max(0, Number(now) || 0);
  const safeNextAttemptAt = Math.max(0, Number(nextAttemptAt) || 0);
  const availableMembers = getAvailableDungeonMembers({ roster, activeMissions });
  const queuedAttunementCandidates = resolveQueuedAttunementCandidates({
    missionList,
    availableMembers,
    minSuccessChance: safeMinSuccessChance,
    getSuccessPreview,
  });
  if (queuedAttunementCandidates.length > 0) {
    return {
      nextAttemptAt: safeNextAttemptAt,
      lastCheckpointKey,
      candidate: queuedAttunementCandidates[0],
      candidates: queuedAttunementCandidates,
    };
  }

  if (!intervalMs) {
    return {
      nextAttemptAt: Number.POSITIVE_INFINITY,
      lastCheckpointKey,
      candidate: null,
      candidates: [],
    };
  }

  const checkpointKey = getAutoDungeonCheckpointKey(
    safeNow,
    calendarEpochGameTimeMs,
  );
  if (!checkpointKey || checkpointKey === lastCheckpointKey) {
    return {
      nextAttemptAt: safeNextAttemptAt,
      lastCheckpointKey: lastCheckpointKey || checkpointKey,
      candidate: null,
      candidates: [],
    };
  }

  const previewMission =
    typeof getSuccessPreview === "function" ? getSuccessPreview : null;
  const searchingMembers = availableMembers
    .filter(
      (member) =>
        !hasAutoDungeonTimestamp(member) ||
        safeNow - getLastAutoDungeonAt(member) >= intervalMs,
    )
    .sort(sortByRecentDungeonThenPower);
  const missionSequences = buildDungeonMissionSequences(missionList);
  const raidAttunementFocus = guildFocus === GUILD_FOCUS.RAID_ATTUNEMENTS;
  const raidAttunementKeyIds = raidAttunementFocus
    ? getRaidAttunementKeyIds(missionList)
    : new Set();
  const focusedMissionSequences =
    raidAttunementFocus && raidAttunementKeyIds.size > 0
      ? missionSequences.filter((missions) =>
          isRaidAttunementSequence(missions, raidAttunementKeyIds),
        )
      : missionSequences;

  const collectCandidates = (memberPool, searcherPool) => {
    const candidates = [];
    const selectedOpeningMissionKeys = new Set(
      selectedCandidates
        .map((candidate) => getAutoDungeonMissionHistoryKey(candidate.mission))
        .filter(Boolean),
    );
    searcherPool.forEach((initiator) => {
      focusedMissionSequences.forEach((missions) => {
      const openingMission = missions[0];
      const openingMissionKey = getAutoDungeonMissionHistoryKey(openingMission);
      const levelRange = getSequenceLevelRange(missions);
      if (levelRange.min > levelRange.max) return;
      const partyBounds = getSequencePartyBounds(missions);
      const initiatorLevel = Math.max(1, Number(initiator?.level) || 1);
      if (initiatorLevel < levelRange.min || initiatorLevel > levelRange.max) {
        return;
      }
      const eligibleMembers = memberPool.filter((member) => {
        const level = Math.max(1, Number(member?.level) || 1);
        if (level < levelRange.min || level > levelRange.max) return false;
        return memberMeetsSequenceKeyRequirements(member, missions);
      });

      if (eligibleMembers.length < partyBounds.min) return;

      for (
        let partySize = partyBounds.min;
        partySize <= Math.min(partyBounds.max, eligibleMembers.length);
        partySize += 1
      ) {
        const party = buildDungeonParty({
          missions,
          eligibleMembers,
          partySize,
          initiator,
        });
        if (party.length < partySize) continue;

        const keyAccess = evaluateMissionKeyAccess({
          missions,
          partyMembers: party,
        });
        if (!keyAccess.canEnter) continue;

        const previews = missions.map((mission) =>
          previewMission ? previewMission(mission, party) : { successChance: 0 },
        );
        const successChance = Math.max(
          0,
          Math.min(
            100,
            ...previews.map((preview) => Number(preview?.successChance) || 0),
          ),
        );
        if (successChance < safeMinSuccessChance) continue;

        const level =
          Math.max(...missions.map((mission) => Number(mission?.level) || 0)) ||
          levelRange.max;
        const exp = missions.reduce(
          (sum, mission) => sum + (Number(mission?.exp) || 0),
          0,
        );
        const repeatMemberPenalty =
          party.filter(
            (member) =>
              openingMissionKey &&
              getMemberLastAutoDungeonMissionKey(member) === openingMissionKey,
          ).length * AUTO_DUNGEON_REPEAT_MEMBER_PENALTY;
        const sameSearchPenalty =
          openingMissionKey && selectedOpeningMissionKeys.has(openingMissionKey)
            ? AUTO_DUNGEON_SAME_SEARCH_MISSION_PENALTY
            : 0;
        candidates.push({
          mission: openingMission,
          missions,
          chainMissionIds:
            missions.length > 1 ? missions.map((mission) => mission.id) : [],
          memberIds: party.map((member) => member.id),
          party,
          partySize,
          successChance,
          initiatorId: initiator.id,
          score:
            level * 10_000 +
            exp * (successChance / 100) +
            (raidAttunementFocus ? 1_000_000 : 0) +
            missions.length * 1_000 +
            partySize -
            repeatMemberPenalty -
            sameSearchPenalty -
            getLastAutoDungeonAt(initiator) / 1_000_000,
        });
      }
    });
    });

    candidates.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.successChance !== left.successChance) {
        return right.successChance - left.successChance;
      }
      return String(left.mission?.name || "").localeCompare(
        String(right.mission?.name || ""),
      );
    });

    return candidates;
  };

  let remainingMembers = [...availableMembers];
  let remainingSearchers = [...searchingMembers];
  const selectedCandidates = [];
  while (remainingMembers.length > 0 && remainingSearchers.length > 0) {
    const bestCandidate = collectCandidates(
      remainingMembers,
      remainingSearchers,
    )[0];
    if (!bestCandidate) break;

    selectedCandidates.push(bestCandidate);
    const reservedMemberIds = new Set(
      bestCandidate.memberIds.map((memberId) => String(memberId)),
    );
    remainingMembers = remainingMembers.filter(
      (member) => !reservedMemberIds.has(String(member.id)),
    );
    remainingSearchers = remainingSearchers.filter(
      (member) => !reservedMemberIds.has(String(member.id)),
    );
  }

  return {
    nextAttemptAt: safeNextAttemptAt,
    lastCheckpointKey: checkpointKey,
    candidate: selectedCandidates[0] || null,
    candidates: selectedCandidates,
  };
};
