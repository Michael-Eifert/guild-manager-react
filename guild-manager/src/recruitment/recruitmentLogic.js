import {
  getClassArmorTypes,
  getItemEffectiveLevel,
  isItemUsableByClass,
} from "../utils";
import { getCharacterMorale } from "../game/characterMorale";

const RECRUITMENT_GEAR_SLOTS = Object.freeze([
  "head",
  "chest",
  "legs",
  "feet",
  "hands",
  "mainHand",
]);

const RECRUITMENT_GEAR_BANDS = Object.freeze([
  { level: 10, min: 1, max: 12 },
  { level: 20, min: 15, max: 22 },
  { level: 30, min: 25, max: 32 },
  { level: 40, min: 35, max: 42 },
  { level: 50, min: 45, max: 52 },
  { level: 59, min: 50, max: 58 },
  { level: 60, min: 55, max: 62 },
]);

const SLOT_LABELS = Object.freeze({
  head: "Headpiece",
  chest: "Armor",
  legs: "Leggings",
  feet: "Boots",
  hands: "Gloves",
  mainHand: "Weapon",
});

const getRecruitmentGearBand = (level) => {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const matchedBand = RECRUITMENT_GEAR_BANDS.find(
    (band) => safeLevel <= band.level,
  );
  if (matchedBand) return matchedBand;
  return RECRUITMENT_GEAR_BANDS[RECRUITMENT_GEAR_BANDS.length - 1];
};

const getRecruitmentQualityWeights = (level, epicBudget = 0) => {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  if (safeLevel >= 60 && epicBudget > 0) {
    return [
      { quality: 4, weight: 15 },
      { quality: 3, weight: 55 },
      { quality: 2, weight: 30 },
    ];
  }
  if (safeLevel >= 60) {
    return [
      { quality: 3, weight: 55 },
      { quality: 2, weight: 45 },
    ];
  }
  if (safeLevel >= 50) {
    return [
      { quality: 3, weight: 35 },
      { quality: 2, weight: 65 },
    ];
  }
  if (safeLevel >= 30) {
    return [
      { quality: 3, weight: 20 },
      { quality: 2, weight: 80 },
    ];
  }
  if (safeLevel >= 11) {
    return [
      { quality: 3, weight: 8 },
      { quality: 2, weight: 92 },
    ];
  }
  return [
    { quality: 2, weight: 35 },
    { quality: 1, weight: 65 },
  ];
};

const pickWeightedQuality = (weights) => {
  const totalWeight = weights.reduce(
    (sum, entry) => sum + Math.max(0, Number(entry.weight) || 0),
    0,
  );
  if (totalWeight <= 0) return 1;
  let roll = Math.random() * totalWeight;
  for (const entry of weights) {
    roll -= Math.max(0, Number(entry.weight) || 0);
    if (roll <= 0) return entry.quality;
  }
  return weights[weights.length - 1]?.quality || 1;
};

const pickRandom = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return entries[Math.floor(Math.random() * entries.length)] || null;
};

const createFallbackRecruitmentItem = ({
  slot,
  type,
  quality,
  itemLevel,
  level,
}) => ({
  id: `recruit_${slot}_${level}_${quality}_${Math.floor(Math.random() * 100000)}`,
  name: `Recruit's ${SLOT_LABELS[slot] || "Gear"}`,
  slot,
  quality,
  type,
  minLevel: Math.max(1, Math.min(level, itemLevel - (quality >= 3 ? 7 : quality >= 2 ? 5 : 0))),
  itemLevel,
  stats: {},
});

const getRecruitmentItemCandidates = ({
  itemDatabase,
  character,
  slot,
  quality,
  band,
  allowEpicOverflow = false,
}) => {
  const safeLevel = Math.max(1, Math.floor(Number(character?.level) || 1));
  const allowedArmorTypes = getClassArmorTypes(character?.charClass, safeLevel);
  const minItemLevel = allowEpicOverflow ? band.min : band.min;
  const maxItemLevel = allowEpicOverflow ? Math.max(band.max, 70) : band.max;

  return (Array.isArray(itemDatabase) ? itemDatabase : []).filter((item) => {
    if (!item || item.slot !== slot) return false;
    if (Number(item.quality) !== quality) return false;
    if ((Number(item.minLevel) || 1) > safeLevel) return false;
    if (!isItemUsableByClass(item, character?.charClass)) return false;
    if (
      slot !== "mainHand" &&
      item.type !== "Generic" &&
      !allowedArmorTypes.includes(item.type)
    ) {
      return false;
    }
    const itemLevel = getItemEffectiveLevel(item);
    return itemLevel >= minItemLevel && itemLevel <= maxItemLevel;
  });
};

const chooseRecruitmentItemForSlot = ({
  itemDatabase,
  character,
  slot,
  band,
  epicBudget,
}) => {
  const safeLevel = Math.max(1, Math.floor(Number(character?.level) || 1));
  const weights = getRecruitmentQualityWeights(safeLevel, epicBudget);
  const qualities = [
    pickWeightedQuality(weights),
    ...weights.map((entry) => entry.quality),
    ...(safeLevel >= 11 ? [2] : [1]),
  ].filter((quality, index, arr) => arr.indexOf(quality) === index);

  for (const quality of qualities) {
    const allowEpicOverflow = quality === 4;
    const candidates = getRecruitmentItemCandidates({
      itemDatabase,
      character,
      slot,
      quality,
      band,
      allowEpicOverflow,
    });
    const pickedItem = pickRandom(candidates);
    if (pickedItem) {
      return { item: { ...pickedItem }, usedEpic: quality === 4 };
    }
  }

  const fallbackQuality = safeLevel >= 11 ? 2 : 1;
  const fallbackType =
    slot === "mainHand"
      ? "Generic"
      : getClassArmorTypes(character?.charClass, safeLevel)[0] || "Cloth";
  const fallbackItemLevel =
    band.min + Math.floor(Math.random() * Math.max(1, band.max - band.min + 1));
  return {
    item: createFallbackRecruitmentItem({
      slot,
      type: fallbackType,
      quality: fallbackQuality,
      itemLevel: fallbackItemLevel,
      level: safeLevel,
    }),
    usedEpic: false,
  };
};

export const buildRecruitmentEquipment = ({ character, itemDatabase }) => {
  const safeCharacter = character && typeof character === "object" ? character : {};
  const safeLevel = Math.max(1, Math.floor(Number(safeCharacter.level) || 1));
  const band = getRecruitmentGearBand(safeLevel);
  let epicBudget = safeLevel >= 60 && Math.random() < 0.05
    ? 1 + Math.floor(Math.random() * 2)
    : 0;

  return RECRUITMENT_GEAR_SLOTS.reduce((equipment, slot) => {
    const result = chooseRecruitmentItemForSlot({
      itemDatabase,
      character: safeCharacter,
      slot,
      band,
      epicBudget,
    });
    equipment[slot] = result.item;
    if (result.usedEpic) {
      epicBudget = Math.max(0, epicBudget - 1);
    }
    return equipment;
  }, {});
};

export const RECRUITMENT_TIERS = Object.freeze([
  Object.freeze({
    id: "level_1_10",
    label: "Lv 1 - 10",
    minLevel: 1,
    maxLevel: 10,
    scoutCostGold: 1,
    recruitCostGold: 1,
    unlockLevel: 1,
  }),
  Object.freeze({
    id: "level_11_20",
    label: "Lv 11 - 20",
    minLevel: 11,
    maxLevel: 20,
    scoutCostGold: 5,
    recruitCostGold: 2,
    unlockLevel: 20,
  }),
  Object.freeze({
    id: "level_21_30",
    label: "Lv 21 - 30",
    minLevel: 21,
    maxLevel: 30,
    scoutCostGold: 10,
    recruitCostGold: 5,
    unlockLevel: 30,
  }),
  Object.freeze({
    id: "level_31_40",
    label: "Lv 31 - 40",
    minLevel: 31,
    maxLevel: 40,
    scoutCostGold: 15,
    recruitCostGold: 8,
    unlockLevel: 40,
  }),
  Object.freeze({
    id: "level_41_50",
    label: "Lv 41 - 50",
    minLevel: 41,
    maxLevel: 50,
    scoutCostGold: 20,
    recruitCostGold: 10,
    unlockLevel: 50,
  }),
  Object.freeze({
    id: "level_51_60",
    label: "Lv 51 - 60",
    minLevel: 51,
    maxLevel: 60,
    scoutCostGold: 25,
    recruitCostGold: 12,
    unlockLevel: 60,
  }),
  Object.freeze({
    id: "level_60",
    label: "Lv 60",
    minLevel: 60,
    maxLevel: 60,
    scoutCostGold: 30,
    recruitCostGold: 15,
    unlockLevel: 60,
    requiresRaidAttunement: true,
  }),
]);

export const getRecruitmentTierById = (tierId) =>
  RECRUITMENT_TIERS.find((tier) => tier.id === tierId) || RECRUITMENT_TIERS[0];

export const getRecruitmentTierUnlockStatus = ({
  tier,
  guildProgress,
  raidUnlocked = false,
}) => {
  const safeTier = tier || RECRUITMENT_TIERS[0];
  const unlockLevel = Math.max(1, Number(safeTier.unlockLevel) || 1);
  const levelReached =
    unlockLevel <= 1 ||
    Boolean(guildProgress?.milestones?.levelReached?.[unlockLevel]);
  const raidRequirementMet =
    !safeTier.requiresRaidAttunement || Boolean(raidUnlocked);
  const blockers = [];
  if (!levelReached) {
    blockers.push(`Requires first level ${unlockLevel} character.`);
  }
  if (!raidRequirementMet) {
    blockers.push("Requires Raid Attunement unlocked.");
  }
  return {
    unlocked: levelReached && raidRequirementMet,
    blockers,
  };
};

export const getRecruitmentTierOptions = ({
  guildProgress,
  raidUnlocked = false,
} = {}) =>
  RECRUITMENT_TIERS.map((tier) => ({
    ...tier,
    ...getRecruitmentTierUnlockStatus({ tier, guildProgress, raidUnlocked }),
  }));

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

  const recruits = candidateList.slice(0, availableSlots).map((candidate) => ({
    ...candidate,
    status: candidate?.status || "Idle",
    statusText: candidate?.statusText || "Waiting for orders...",
    activityMode: candidate?.activityMode || "Auto",
    morale: getCharacterMorale(candidate),
    history: Array.isArray(candidate?.history) ? candidate.history : [],
    keys: Array.isArray(candidate?.keys) ? candidate.keys : [],
    adventureGoalQueue: Array.isArray(candidate?.adventureGoalQueue)
      ? candidate.adventureGoalQueue
      : [],
    clearedMissionIds: Array.isArray(candidate?.clearedMissionIds)
      ? candidate.clearedMissionIds
      : [],
  }));
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
