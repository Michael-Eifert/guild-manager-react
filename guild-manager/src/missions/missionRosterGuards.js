const normalizeIdList = (value) => [
  ...new Set(
    (Array.isArray(value) ? value : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  ),
];

export const getMissionMemberIds = (mission) =>
  normalizeIdList(mission?.memberIds);

export const getActiveMissionMemberIdSet = (activeMissions) =>
  new Set(
    (Array.isArray(activeMissions) ? activeMissions : []).flatMap((mission) =>
      getMissionMemberIds(mission),
    ),
  );

export const isMissionMemberGroupAvailable = ({
  memberIds,
  roster = [],
  activeMissions = [],
}) => {
  const requestedMemberIds = normalizeIdList(memberIds);
  if (requestedMemberIds.length === 0) return false;

  const busyMemberIds = getActiveMissionMemberIdSet(activeMissions);
  const rosterById = new Map(
    (Array.isArray(roster) ? roster : [])
      .filter((member) => member?.id)
      .map((member) => [String(member.id), member]),
  );

  return requestedMemberIds.every((memberId) => {
    if (busyMemberIds.has(memberId)) return false;
    return rosterById.get(memberId)?.status !== "Questing";
  });
};

export const pruneOverlappingActiveMissions = (activeMissions) => {
  const occupiedMemberIds = new Set();
  const prunedMissions = [];
  const canceledMissions = [];

  (Array.isArray(activeMissions) ? activeMissions : []).forEach((mission) => {
    const memberIds = getMissionMemberIds(mission);
    const hasOverlap = memberIds.some((memberId) =>
      occupiedMemberIds.has(memberId),
    );

    if (hasOverlap) {
      canceledMissions.push(mission);
      return;
    }

    prunedMissions.push(mission);
    memberIds.forEach((memberId) => occupiedMemberIds.add(memberId));
  });

  return {
    activeMissions: prunedMissions,
    canceledMissions,
    occupiedMemberIds,
  };
};
