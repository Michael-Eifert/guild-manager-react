export const getRecruitmentCapacity = ({
  rosterSize,
  maxRoster,
  guildGold,
  recruitCostGold,
}) => {
  const safeRosterSize = Math.max(0, Number(rosterSize) || 0);
  const safeMaxRoster = Math.max(0, Number(maxRoster) || 0);
  const safeGuildGold = Math.max(0, Number(guildGold) || 0);
  const safeRecruitCost = Math.max(1, Number(recruitCostGold) || 1);

  const openSlots = Math.max(0, safeMaxRoster - safeRosterSize);
  const affordableSlots = Math.max(0, Math.floor(safeGuildGold / safeRecruitCost));
  const freeRecruitSlots = openSlots > 0 ? 1 : 0;
  const availableSlots = Math.min(openSlots, freeRecruitSlots + affordableSlots);

  return {
    openSlots,
    affordableSlots,
    availableSlots,
  };
};

export const resolveRecruitmentResult = ({
  currentRoster,
  currentGold,
  selectedCandidates,
  maxRoster,
  recruitCostGold,
}) => {
  const rosterList = Array.isArray(currentRoster) ? currentRoster : [];
  const candidateList = Array.isArray(selectedCandidates) ? selectedCandidates : [];
  const safeGold = Math.max(0, Number(currentGold) || 0);
  const safeRecruitCost = Math.max(1, Number(recruitCostGold) || 1);

  const { availableSlots } = getRecruitmentCapacity({
    rosterSize: rosterList.length,
    maxRoster,
    guildGold: safeGold,
    recruitCostGold: safeRecruitCost,
  });

  const recruits = candidateList.slice(0, availableSlots);
  const spentGold = Math.max(0, recruits.length - 1) * safeRecruitCost;
  const updatedGold = Math.max(0, safeGold - spentGold);
  const updatedRoster = [...rosterList, ...recruits];

  return {
    recruits,
    spentGold,
    updatedGold,
    updatedRoster,
  };
};
