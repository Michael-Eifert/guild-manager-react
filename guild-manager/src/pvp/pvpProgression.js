import { GUILD_FACTION } from "../constants";
import { getItemEffectiveLevel, normalizeEquipmentSlots } from "../utils";
import { ensureCharacterPvpData } from "./pvpCharacterUtils";
import {
  getNewPvpRewardTiers,
  getUnlockedPvpGearForCharacter,
  getUnlockedPvpGearIdsForCharacter,
} from "./pvpGearUnlocks";
import {
  getPvpRankByProgress,
  getPvpTitleForRank,
} from "./pvpRanks";

export const PVP_PROGRESS_PER_HONOR = 0.25;
export const PVP_WEEKLY_PROGRESS_CAP = 1200;
export const PVP_WEEK_LENGTH_DAYS = 7;

const normalizeFaction = (faction) =>
  faction === GUILD_FACTION.HORDE ? GUILD_FACTION.HORDE : GUILD_FACTION.ALLIANCE;

const normalizeDayIndex = (value) => Math.max(0, Math.floor(Number(value) || 0));

export const awardCharacterHonor = (
  character,
  { honor, honorableKills = 0 } = {},
  faction = GUILD_FACTION.ALLIANCE,
) => {
  const normalized = ensureCharacterPvpData(character, faction);
  const honorGain = Math.max(0, Math.floor(Number(honor) || 0));
  const killGain = Math.max(0, Math.floor(Number(honorableKills) || 0));
  return {
    ...normalized,
    pvp: {
      ...normalized.pvp,
      lifetimeHonor: normalized.pvp.lifetimeHonor + honorGain,
      weeklyHonor: normalized.pvp.weeklyHonor + honorGain,
      honorableKills: normalized.pvp.honorableKills + killGain,
    },
  };
};

export const shouldApplyWeeklyPvpRollover = ({
  currentDay,
  lastRolloverDayIndex = 0,
} = {}) => {
  const safeDay = normalizeDayIndex(currentDay);
  const lastDay = normalizeDayIndex(lastRolloverDayIndex);
  return (
    safeDay > 0 &&
    Math.floor(safeDay / PVP_WEEK_LENGTH_DAYS) >
      Math.floor(lastDay / PVP_WEEK_LENGTH_DAYS)
  );
};

const buildUnlockLog = ({
  character,
  oldRank,
  nextCharacter,
  newRewardTiers,
  equippedItems,
}) => {
  const rankChanged = nextCharacter.pvp.rank > oldRank;
  const unlockedCount = Math.max(
    0,
    nextCharacter.pvp.unlockedPvpGearIds.length -
      (character?.pvp?.unlockedPvpGearIds?.length || 0),
  );
  if (
    !rankChanged &&
    unlockedCount <= 0 &&
    newRewardTiers.length === 0 &&
    equippedItems.length === 0
  ) {
    return null;
  }
  const rewardText = newRewardTiers.length > 0
    ? ` Rewards: ${newRewardTiers.map((tier) => tier.label).join(", ")}.`
    : "";
  const gearText = unlockedCount > 0
    ? ` ${unlockedCount} PvP gear piece${unlockedCount === 1 ? "" : "s"} became available.`
    : "";
  const equipText = equippedItems.length > 0
    ? ` Equipped: ${equippedItems.map((item) => item.name).join(", ")}.`
    : "";
  return {
    type: "pvp",
    characterId: nextCharacter.id,
    characterName: nextCharacter.name,
    rank: nextCharacter.pvp.rank,
    title: nextCharacter.pvp.title,
    message: `${nextCharacter.name} reached ${nextCharacter.pvp.title} (Rank ${nextCharacter.pvp.rank}).${rewardText}${gearText}${equipText}`,
  };
};

const applyPvpAutoEquip = ({ character, unlockedItems }) => {
  const equipment = normalizeEquipmentSlots(character?.equipment);
  const equippedItems = [];
  const nextEquipment = { ...equipment };

  (Array.isArray(unlockedItems) ? unlockedItems : []).forEach((item) => {
    const slot = String(item?.slot || "").trim();
    if (!slot) return;
    const currentItem = nextEquipment[slot];
    if (getItemEffectiveLevel(item) <= getItemEffectiveLevel(currentItem)) return;
    nextEquipment[slot] = item;
    equippedItems.push(item);
  });

  return {
    character: {
      ...character,
      equipment: nextEquipment,
    },
    equippedItems,
  };
};

export const applyWeeklyPvpRollover = ({
  characters = [],
  currentDay,
  faction = GUILD_FACTION.ALLIANCE,
  allItems = [],
  lastRolloverDayIndex = 0,
} = {}) => {
  const safeDay = normalizeDayIndex(currentDay);
  const safeFaction = normalizeFaction(faction);
  const didRollover = shouldApplyWeeklyPvpRollover({
    currentDay: safeDay,
    lastRolloverDayIndex,
  });
  const logs = [];

  if (!didRollover) {
    return {
      didRollover: false,
      currentDayIndex: safeDay,
      characters: (Array.isArray(characters) ? characters : []).map((character) =>
        ensureCharacterPvpData(character, safeFaction),
      ),
      logs,
    };
  }

  const nextCharacters = (Array.isArray(characters) ? characters : []).map((character) => {
    const normalized = ensureCharacterPvpData(character, safeFaction);
    const oldRank = normalized.pvp.rank;
    const oldHighestRank = normalized.pvp.highestRank;
    const progressGain = Math.min(
      Math.floor(normalized.pvp.weeklyHonor * PVP_PROGRESS_PER_HONOR),
      PVP_WEEKLY_PROGRESS_CAP,
    );
    const rankProgress = normalized.pvp.rankProgress + Math.max(0, progressGain);
    const rankInfo = getPvpRankByProgress(rankProgress, safeFaction);
    const highestRank = Math.max(oldHighestRank, rankInfo.rank);
    const nextCharacterWithRank = {
      ...normalized,
      pvp: {
        ...normalized.pvp,
        weeklyHonor: 0,
        rankProgress,
        rank: rankInfo.rank,
        title: rankInfo.title,
        highestRank,
        highestTitle: getPvpTitleForRank(highestRank, safeFaction),
      },
    };
    const unlockedPvpGear = getUnlockedPvpGearForCharacter(
      nextCharacterWithRank,
      allItems,
      safeFaction,
    );
    const unlockedPvpGearIds = getUnlockedPvpGearIdsForCharacter(
      nextCharacterWithRank,
      allItems,
      safeFaction,
    );
    const nextCharacterWithUnlocks = {
      ...nextCharacterWithRank,
      pvp: {
        ...nextCharacterWithRank.pvp,
        unlockedPvpGearIds,
      },
    };
    const { character: nextCharacter, equippedItems } = applyPvpAutoEquip({
      character: nextCharacterWithUnlocks,
      unlockedItems: unlockedPvpGear,
    });
    const newRewardTiers = getNewPvpRewardTiers(oldHighestRank, highestRank);
    const log = buildUnlockLog({
      character: normalized,
      oldRank,
      nextCharacter,
      newRewardTiers,
      equippedItems,
    });
    if (log) logs.push(log);
    return nextCharacter;
  });

  return {
    didRollover,
    currentDayIndex: safeDay,
    characters: nextCharacters,
    logs,
  };
};
