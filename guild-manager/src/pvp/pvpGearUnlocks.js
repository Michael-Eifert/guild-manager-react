import { GUILD_FACTION } from "../constants";
import { isItemUsableByClass } from "../utils";
import { getPvpTitleForRank } from "./pvpRanks";

export const PVP_RANK_REWARD_TIERS = Object.freeze([
  Object.freeze({ rank: 1, label: "Title", itemSlots: [] }),
  Object.freeze({ rank: 2, label: "Trinket", itemSlots: ["trinket"] }),
  Object.freeze({ rank: 3, label: "Cloak", itemSlots: ["back"] }),
  Object.freeze({ rank: 4, label: "PvP Accessory", itemSlots: ["neck"] }),
  Object.freeze({ rank: 5, label: "Bracers", itemSlots: ["wrist"] }),
  Object.freeze({ rank: 6, label: "Officer Belt", itemSlots: ["belt"] }),
  Object.freeze({ rank: 7, label: "Rare Gloves and Boots", itemSlots: ["hands", "feet"] }),
  Object.freeze({ rank: 8, label: "Rare Chest and Legs", itemSlots: ["chest", "legs"] }),
  Object.freeze({ rank: 9, label: "Battle Signet", itemSlots: ["ring"] }),
  Object.freeze({ rank: 10, label: "Rare Helm and Shoulders", itemSlots: ["head", "shoulder"] }),
  Object.freeze({ rank: 11, label: "Epic Battle Standard", itemSlots: ["trinket"] }),
  Object.freeze({ rank: 12, label: "Epic Boots, Gloves, and Legs", itemSlots: ["feet", "hands", "legs"] }),
  Object.freeze({ rank: 13, label: "Epic Helm, Chest, and Shoulders", itemSlots: ["head", "chest", "shoulder"] }),
  Object.freeze({ rank: 14, label: "Epic Weapon", itemSlots: ["mainHand"] }),
]);

const normalizeFaction = (faction) =>
  faction === GUILD_FACTION.HORDE ? GUILD_FACTION.HORDE : GUILD_FACTION.ALLIANCE;

export const getPvpRewardTiersForRank = (rank) => {
  const safeRank = Math.max(0, Math.floor(Number(rank) || 0));
  return PVP_RANK_REWARD_TIERS.filter((tier) => tier.rank <= safeRank);
};

export const getNewPvpRewardTiers = (oldRank, newRank) => {
  const previousRank = Math.max(0, Math.floor(Number(oldRank) || 0));
  const safeNewRank = Math.max(0, Math.floor(Number(newRank) || 0));
  return PVP_RANK_REWARD_TIERS.filter(
    (tier) => tier.rank > previousRank && tier.rank <= safeNewRank,
  );
};

export const getPvpRewardSummaryForRank = (
  rank,
  faction = GUILD_FACTION.ALLIANCE,
) => {
  const safeRank = Math.max(0, Math.floor(Number(rank) || 0));
  if (safeRank <= 0) return "No PvP rewards unlocked yet.";
  const tiers = getPvpRewardTiersForRank(safeRank);
  const latestTier = tiers.at(-1);
  const title = getPvpTitleForRank(safeRank, faction);
  return latestTier
    ? `${title}: ${latestTier.label}`
    : `${title}: PvP title unlocked`;
};

export const getItemRequiredPvpRank = (item) =>
  Math.max(
    0,
    Math.floor(Number(item?.requiredPvpRank ?? item?.pvpHonorRank) || 0),
  );

export const isPvpGearUnlockedForCharacter = ({
  character,
  item,
  faction = GUILD_FACTION.ALLIANCE,
} = {}) => {
  if (!item?.pvpGear) return false;
  const pvp = character?.pvp || {};
  const highestRank = Math.max(0, Math.floor(Number(pvp.highestRank ?? pvp.rank) || 0));
  const requiredPvpRank = getItemRequiredPvpRank(item);
  if (requiredPvpRank > highestRank) return false;
  if (!isItemUsableByClass(item, character?.charClass)) return false;
  const itemFaction = item?.faction;
  if (itemFaction && itemFaction !== normalizeFaction(faction)) return false;
  return true;
};

export const getUnlockedPvpGearForCharacter = (
  character,
  allItems = [],
  faction = GUILD_FACTION.ALLIANCE,
) =>
  (Array.isArray(allItems) ? allItems : [])
    .filter((item) =>
      isPvpGearUnlockedForCharacter({
        character,
        item,
        faction,
      }),
    )
    .sort((left, right) => {
      const rankDiff = getItemRequiredPvpRank(left) - getItemRequiredPvpRank(right);
      if (rankDiff !== 0) return rankDiff;
      return String(left.name || "").localeCompare(String(right.name || ""));
    });

export const getUnlockedPvpGearIdsForCharacter = (
  character,
  allItems = [],
  faction = GUILD_FACTION.ALLIANCE,
) =>
  getUnlockedPvpGearForCharacter(character, allItems, faction).map((item) =>
    String(item.id),
  );
