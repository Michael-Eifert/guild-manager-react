import { GUILD_FACTION } from "../constants";
import { normalizeEquipmentSlots } from "../utils";
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
import type { Character, CharacterPvpState } from "../types/characterTypes";
import type { ItemDefinition } from "../types/itemTypes";
import { optimizeCharacterEquipment } from "../equipment/equipmentLoadouts";

export const PVP_PROGRESS_PER_HONOR = 0.25;
export const PVP_WEEKLY_PROGRESS_CAP = 1200;
export const PVP_WEEK_LENGTH_DAYS = 7;

const normalizeFaction = (faction: unknown): string =>
  faction === GUILD_FACTION.HORDE ? GUILD_FACTION.HORDE : GUILD_FACTION.ALLIANCE;

const normalizeDayIndex = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));

export const awardCharacterHonor = (
  character: Character,
  { honor, honorableKills = 0 }: { honor?: number; honorableKills?: number } = {},
  faction: string = GUILD_FACTION.ALLIANCE,
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
}: { currentDay?: number; lastRolloverDayIndex?: number } = {}) => {
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
}: {
  character: Character;
  oldRank: number;
  nextCharacter: Character & { pvp: CharacterPvpState };
  newRewardTiers: Array<{ label: string }>;
  equippedItems: ItemDefinition[];
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

const applyPvpAutoEquip = ({ character, unlockedItems }: {
  character: Character & { pvp: CharacterPvpState };
  unlockedItems: readonly ItemDefinition[];
}) => {
  const equippedItems: ItemDefinition[] = [];
  let soldGold = 0;
  let nextCharacter = {
    ...character,
    equipment: normalizeEquipmentSlots(character?.equipment),
  };

  (Array.isArray(unlockedItems) ? unlockedItems : []).forEach((item) => {
    const optimized = optimizeCharacterEquipment({
      character: nextCharacter,
      incomingItem: item,
    });
    nextCharacter = optimized.character as typeof nextCharacter;
    soldGold += optimized.soldGold;
    if (optimized.outcome === "equipped") equippedItems.push(item);
  });

  return {
    character: nextCharacter,
    equippedItems,
    soldGold,
  };
};

export const applyWeeklyPvpRollover = ({
  characters = [],
  currentDay,
  faction = GUILD_FACTION.ALLIANCE,
  allItems = [],
  lastRolloverDayIndex = 0,
}: {
  characters?: Character[];
  currentDay?: number;
  faction?: string;
  allItems?: readonly ItemDefinition[];
  lastRolloverDayIndex?: number;
} = {}) => {
  const safeDay = normalizeDayIndex(currentDay);
  const safeFaction = normalizeFaction(faction);
  const didRollover = shouldApplyWeeklyPvpRollover({
    currentDay: safeDay,
    lastRolloverDayIndex,
  });
  const logs: Array<{
    type: string;
    characterId: string;
    characterName?: string;
    rank: number;
    title: string;
    message: string;
  }> = [];
  let soldGold = 0;

  if (!didRollover) {
    return {
      didRollover: false,
      currentDayIndex: safeDay,
      characters: (Array.isArray(characters) ? characters : []).map((character) =>
        ensureCharacterPvpData(character, safeFaction),
      ),
      logs,
      soldGold: 0,
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
    const {
      character: nextCharacter,
      equippedItems,
      soldGold: characterSoldGold,
    } = applyPvpAutoEquip({
      character: nextCharacterWithUnlocks,
      unlockedItems: unlockedPvpGear,
    });
    soldGold += characterSoldGold;
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
    soldGold,
  };
};
