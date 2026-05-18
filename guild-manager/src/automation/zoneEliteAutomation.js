import { getCharacterPowerScore } from "../utils";
import { getZoneEliteQuestTemplates } from "../zones/zoneDefinitions";

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

const buildZoneEliteParty = ({ quest, zoneMembers }) => {
  const bounds = getPartyBounds(quest);
  const minimumLevel = Math.max(1, Math.floor(Number(quest?.minLevel) || 1));
  const eligibleMembers = zoneMembers.filter(
    (member) => Math.max(1, Number(member?.level) || 1) >= minimumLevel,
  );
  const starters = eligibleMembers
    .filter((member) => !hasCompletedZoneEliteQuest(member, quest))
    .sort(sortByRoleThenPower);

  if (starters.length === 0 || eligibleMembers.length < bounds.min) return null;

  const party = [];
  const addMember = (member) => {
    if (!member || party.some((entry) => entry.id === member.id)) return;
    if (party.length >= bounds.max) return;
    party.push(member);
  };

  addMember(starters[0]);
  ["Tank", "Healer", "DPS"].forEach((role) => {
    addMember(eligibleMembers.find((member) => member?.role === role));
  });

  [...starters, ...eligibleMembers].sort(sortByRoleThenPower).forEach(addMember);

  if (party.length < bounds.min) return null;
  return {
    party,
    starterMemberIds: party
      .filter((member) => !hasCompletedZoneEliteQuest(member, quest))
      .map((member) => member.id),
    supporterMemberIds: party
      .filter((member) => hasCompletedZoneEliteQuest(member, quest))
      .map((member) => member.id),
  };
};

export const resolveAutoZoneEliteGroups = ({
  roster = [],
  activeMissions = [],
} = {}) => {
  const busyMemberIds = getBusyMemberIds(activeMissions);
  const activeQuestIds = getActiveZoneEliteQuestIds(activeMissions);
  const consumedMemberIds = new Set();
  const zoneMembersByZoneId = new Map();

  (Array.isArray(roster) ? roster : []).forEach((member) => {
    const memberId = String(member?.id || "");
    const zoneId = String(member?.currentZoneId || "").trim();
    if (!member || !memberId || !zoneId) return;
    if (member.status === "Questing" || busyMemberIds.has(memberId)) return;
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
          zoneId,
          questId,
        });
      });
    });

  return candidates;
};
