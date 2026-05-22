import { getCharacterPowerScore } from "../utils";
import { isMissionBoardAvailableStatus } from "../missions/missionRosterGuards";
import {
  ADVENTURE_GOAL_TYPE,
  getAdventureGoalQueue,
  hasCharacterKey,
} from "./adventureGoals";
import {
  ZONE_DEFINITIONS,
  getZoneEliteQuestTemplates,
} from "../zones/zoneDefinitions";

export const AUTO_ZONE_ELITE_MIN_SUCCESS_CHANCE = 70;

const getMissionQuestId = (mission) =>
  String(
    mission?.questId ??
      mission?.quest?.id ??
      mission?.missionId ??
      mission?.id ??
      "",
  ).trim();

const getMemberClearedMissionIds = (member) =>
  new Set(
    (Array.isArray(member?.clearedMissionIds) ? member.clearedMissionIds : [])
      .map((missionId) => String(missionId || "").trim())
      .filter(Boolean),
  );

export const hasCompletedZoneEliteQuest = (member, quest) => {
  const questId = getMissionQuestId(quest);
  if (!questId) return false;
  return getMemberClearedMissionIds(member).has(questId);
};

const getBusyMemberIds = (activeMissions) =>
  new Set(
    (Array.isArray(activeMissions) ? activeMissions : []).flatMap((mission) =>
      Array.isArray(mission?.memberIds)
        ? mission.memberIds.map((memberId) => String(memberId || "")).filter(Boolean)
        : [],
    ),
  );

const getActiveZoneEliteQuestIds = (activeMissions) =>
  new Set(
    (Array.isArray(activeMissions) ? activeMissions : [])
      .filter((mission) => mission?.isZoneElite === true)
      .map(getMissionQuestId)
      .filter(Boolean),
  );

const getPartyBounds = (quest) => {
  const recommended = Math.max(1, Math.floor(Number(quest?.requiredPartySize) || 5));
  const minimum = Math.max(
    1,
    Math.floor(Number(quest?.minPartySize) || Math.min(recommended, 5)),
  );
  return {
    min: Math.min(minimum, recommended),
    max: Math.max(minimum, recommended),
  };
};

const sortByRoleThenPower = (left, right) => {
  const roleOrder = { Tank: 0, Healer: 1, DPS: 2 };
  const leftRole = roleOrder[left?.role] ?? 3;
  const rightRole = roleOrder[right?.role] ?? 3;
  if (leftRole !== rightRole) return leftRole - rightRole;
  const rightPower = getCharacterPowerScore(right);
  const leftPower = getCharacterPowerScore(left);
  if (rightPower !== leftPower) return rightPower - leftPower;
  return String(left?.name || "").localeCompare(String(right?.name || ""));
};

const clampSuccessChance = (value) =>
  Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const normalizeMinSuccessChance = (value) =>
  Math.max(
    0,
    Math.min(
      100,
      Math.round(Number(value) || AUTO_ZONE_ELITE_MIN_SUCCESS_CHANCE),
    ),
  );

const buildZoneEliteParty = ({
  quest,
  zoneMembers,
  minSuccessChance = AUTO_ZONE_ELITE_MIN_SUCCESS_CHANCE,
  getSuccessPreview,
}) => {
  const bounds = getPartyBounds(quest);
  const minimumLevel = Math.max(1, Math.floor(Number(quest?.minLevel) || 1));
  const safeMinSuccessChance = normalizeMinSuccessChance(minSuccessChance);
  const previewMission =
    typeof getSuccessPreview === "function" ? getSuccessPreview : null;
  const eligibleMembers = zoneMembers.filter(
    (member) => Math.max(1, Number(member?.level) || 1) >= minimumLevel,
  );
  const starters = eligibleMembers
    .filter((member) => !hasCompletedZoneEliteQuest(member, quest))
    .sort(sortByRoleThenPower);

  if (starters.length === 0 || eligibleMembers.length < bounds.min) return null;

  const partyOrder = [];
  const addMember = (member) => {
    if (!member || partyOrder.some((entry) => entry.id === member.id)) return;
    if (partyOrder.length >= bounds.max) return;
    partyOrder.push(member);
  };

  addMember(starters[0]);
  ["Tank", "Healer", "DPS"].forEach((role) => {
    addMember(eligibleMembers.find((member) => member?.role === role));
  });

  [...starters, ...eligibleMembers].sort(sortByRoleThenPower).forEach(addMember);

  if (partyOrder.length < bounds.min) return null;

  for (
    let partySize = bounds.min;
    partySize <= Math.min(bounds.max, partyOrder.length);
    partySize += 1
  ) {
    const party = partyOrder.slice(0, partySize);
    const successChance = previewMission
      ? clampSuccessChance(previewMission(quest, party)?.successChance)
      : 100;
    if (successChance < safeMinSuccessChance) continue;

    return {
      party,
      successChance,
      starterMemberIds: party
        .filter((member) => !hasCompletedZoneEliteQuest(member, quest))
        .map((member) => member.id),
      supporterMemberIds: party
        .filter((member) => hasCompletedZoneEliteQuest(member, quest))
        .map((member) => member.id),
    };
  }

  return null;
};

const getMissionRewardKeyIds = (mission) =>
  Array.isArray(mission?.rewardKeys)
    ? mission.rewardKeys.map((keyId) => String(keyId || "")).filter(Boolean)
    : [];

const getAvailableMembers = ({ roster, activeMissions }) => {
  const busyMemberIds = getBusyMemberIds(activeMissions);
  return (Array.isArray(roster) ? roster : []).filter((member) => {
    const memberId = String(member?.id || "");
    return (
      member &&
      memberId &&
      isMissionBoardAvailableStatus(member.status) &&
      !busyMemberIds.has(memberId)
    );
  });
};

const getAllZoneEliteQuestTemplates = () =>
  ZONE_DEFINITIONS.flatMap((zone) => getZoneEliteQuestTemplates(zone.id));

const resolveQueuedZoneEliteAttunementGroups = ({
  roster,
  activeMissions,
  missionList,
  minSuccessChance,
  getSuccessPreview,
}) => {
  const availableMembers = getAvailableMembers({ roster, activeMissions });
  const activeQuestIds = getActiveZoneEliteQuestIds(activeMissions);
  const consumedMemberIds = new Set();
  const missionLookup = new Map(
    [...(Array.isArray(missionList) ? missionList : []), ...getAllZoneEliteQuestTemplates()]
      .filter((mission) => mission?.id != null)
      .map((mission) => [String(mission.id), mission]),
  );
  const queuedGroups = new Map();

  availableMembers.forEach((member) => {
    getAdventureGoalQueue(member).forEach((goal) => {
      if (
        goal.type !== ADVENTURE_GOAL_TYPE.ATTUNEMENT ||
        hasCharacterKey(member, goal.keyId)
      ) {
        return;
      }
      const quest = missionLookup.get(String(goal.sourceMissionId));
      if (!quest?.isZoneElite) return;
      if (!getMissionRewardKeyIds(quest).includes(goal.keyId)) return;
      const questId = getMissionQuestId(quest);
      if (!questId || activeQuestIds.has(questId)) return;
      const groupKey = `${goal.sourceMissionId}:${goal.keyId}`;
      if (!queuedGroups.has(groupKey)) {
        queuedGroups.set(groupKey, { quest, keyId: goal.keyId, members: [] });
      }
      queuedGroups.get(groupKey).members.push(member);
    });
  });

  const candidates = [];
  [...queuedGroups.values()].forEach(({ quest, keyId, members }) => {
    const availableQueuedMembers = members.filter(
      (member) => !consumedMemberIds.has(String(member.id)),
    );
    const queuedMemberIds = new Set(
      availableQueuedMembers.map((member) => String(member.id)),
    );
    if (queuedMemberIds.size === 0) return;
    const partyResult = buildZoneEliteParty({
      quest,
      zoneMembers: availableMembers.filter(
        (member) =>
          !consumedMemberIds.has(String(member.id)) &&
          (queuedMemberIds.has(String(member.id)) || !hasCharacterKey(member, keyId)),
      ),
      minSuccessChance,
      getSuccessPreview,
    });
    if (!partyResult) return;
    const hasQueuedStarter = partyResult.party.some((member) =>
      queuedMemberIds.has(String(member.id)),
    );
    if (!hasQueuedStarter) return;
    const memberIds = partyResult.party.map((member) => member.id);
    memberIds.forEach((memberId) => consumedMemberIds.add(String(memberId)));
    activeQuestIds.add(getMissionQuestId(quest));
    candidates.push({
      mission: quest,
      memberIds,
      starterMemberIds: partyResult.starterMemberIds,
      supporterMemberIds: partyResult.supporterMemberIds,
      successChance: partyResult.successChance,
      zoneId: quest.zoneId,
      questId: getMissionQuestId(quest),
      goalType: ADVENTURE_GOAL_TYPE.ATTUNEMENT,
      keyId,
    });
  });

  return candidates;
};

export const resolveAutoZoneEliteGroups = ({
  roster = [],
  activeMissions = [],
  missionList = [],
  minSuccessChance = AUTO_ZONE_ELITE_MIN_SUCCESS_CHANCE,
  getSuccessPreview,
} = {}) => {
  const queuedGroups = resolveQueuedZoneEliteAttunementGroups({
    roster,
    activeMissions,
    missionList,
    minSuccessChance,
    getSuccessPreview,
  });
  if (queuedGroups.length > 0) return queuedGroups;

  const busyMemberIds = getBusyMemberIds(activeMissions);
  const activeQuestIds = getActiveZoneEliteQuestIds(activeMissions);
  const consumedMemberIds = new Set();
  const zoneMembersByZoneId = new Map();

  (Array.isArray(roster) ? roster : []).forEach((member) => {
    const memberId = String(member?.id || "");
    const zoneId = String(member?.currentZoneId || "").trim();
    if (!member || !memberId || !zoneId) return;
    if (!isMissionBoardAvailableStatus(member.status) || busyMemberIds.has(memberId)) return;
    if (!zoneMembersByZoneId.has(zoneId)) zoneMembersByZoneId.set(zoneId, []);
    zoneMembersByZoneId.get(zoneId).push(member);
  });

  const candidates = [];
  [...zoneMembersByZoneId.entries()]
    .sort(([leftZoneId], [rightZoneId]) => leftZoneId.localeCompare(rightZoneId))
    .forEach(([zoneId, zoneMembers]) => {
      const availableZoneMembers = () =>
        zoneMembers.filter((member) => !consumedMemberIds.has(String(member.id)));

      getZoneEliteQuestTemplates(zoneId).forEach((quest) => {
        const questId = getMissionQuestId(quest);
        if (!questId || activeQuestIds.has(questId)) return;
        const partyResult = buildZoneEliteParty({
          quest,
          zoneMembers: availableZoneMembers(),
          minSuccessChance,
          getSuccessPreview,
        });
        if (!partyResult) return;

        const memberIds = partyResult.party.map((member) => member.id);
        memberIds.forEach((memberId) => consumedMemberIds.add(String(memberId)));
        activeQuestIds.add(questId);
        candidates.push({
          mission: quest,
          memberIds,
          starterMemberIds: partyResult.starterMemberIds,
          supporterMemberIds: partyResult.supporterMemberIds,
          successChance: partyResult.successChance,
          zoneId,
          questId,
        });
      });
    });

  return candidates;
};
