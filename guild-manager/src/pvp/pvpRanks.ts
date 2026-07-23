import { GUILD_FACTION } from "../constants";
import type { Character } from "../types/characterTypes";

export const PVP_RANKS = Object.freeze([
  Object.freeze({
    rank: 0,
    requiredProgress: 0,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Unranked",
      [GUILD_FACTION.HORDE]: "Unranked",
    }),
  }),
  Object.freeze({
    rank: 1,
    requiredProgress: 100,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Private",
      [GUILD_FACTION.HORDE]: "Scout",
    }),
  }),
  Object.freeze({
    rank: 2,
    requiredProgress: 300,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Corporal",
      [GUILD_FACTION.HORDE]: "Grunt",
    }),
  }),
  Object.freeze({
    rank: 3,
    requiredProgress: 700,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Sergeant",
      [GUILD_FACTION.HORDE]: "Sergeant",
    }),
  }),
  Object.freeze({
    rank: 4,
    requiredProgress: 1200,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Master Sergeant",
      [GUILD_FACTION.HORDE]: "Senior Sergeant",
    }),
  }),
  Object.freeze({
    rank: 5,
    requiredProgress: 2000,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Sergeant Major",
      [GUILD_FACTION.HORDE]: "First Sergeant",
    }),
  }),
  Object.freeze({
    rank: 6,
    requiredProgress: 3000,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Knight",
      [GUILD_FACTION.HORDE]: "Stone Guard",
    }),
  }),
  Object.freeze({
    rank: 7,
    requiredProgress: 4500,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Knight-Lieutenant",
      [GUILD_FACTION.HORDE]: "Blood Guard",
    }),
  }),
  Object.freeze({
    rank: 8,
    requiredProgress: 6000,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Knight-Captain",
      [GUILD_FACTION.HORDE]: "Legionnaire",
    }),
  }),
  Object.freeze({
    rank: 9,
    requiredProgress: 8000,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Knight-Champion",
      [GUILD_FACTION.HORDE]: "Centurion",
    }),
  }),
  Object.freeze({
    rank: 10,
    requiredProgress: 10000,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Lieutenant Commander",
      [GUILD_FACTION.HORDE]: "Champion",
    }),
  }),
  Object.freeze({
    rank: 11,
    requiredProgress: 13000,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Commander",
      [GUILD_FACTION.HORDE]: "Lieutenant General",
    }),
  }),
  Object.freeze({
    rank: 12,
    requiredProgress: 16000,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Marshal",
      [GUILD_FACTION.HORDE]: "General",
    }),
  }),
  Object.freeze({
    rank: 13,
    requiredProgress: 20000,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Field Marshal",
      [GUILD_FACTION.HORDE]: "Warlord",
    }),
  }),
  Object.freeze({
    rank: 14,
    requiredProgress: 25000,
    titles: Object.freeze({
      [GUILD_FACTION.ALLIANCE]: "Grand Marshal",
      [GUILD_FACTION.HORDE]: "High Warlord",
    }),
  }),
]);

const normalizeFaction = (faction: unknown): string =>
  faction === GUILD_FACTION.HORDE ? GUILD_FACTION.HORDE : GUILD_FACTION.ALLIANCE;

export const getPvpTitleForRank = (
  rank: unknown,
  faction: string = GUILD_FACTION.ALLIANCE,
) => {
  const safeRank = Math.max(0, Math.min(14, Math.floor(Number(rank) || 0)));
  return (
    (PVP_RANKS[safeRank]?.titles as Readonly<Record<string, string>>)?.[
      normalizeFaction(faction)
    ] ||
    PVP_RANKS[0].titles[GUILD_FACTION.ALLIANCE]
  );
};

export const getPvpRankByProgress = (
  rankProgress: unknown,
  faction: string = GUILD_FACTION.ALLIANCE,
) => {
  const progress = Math.max(0, Math.floor(Number(rankProgress) || 0));
  const rankDef = [...PVP_RANKS]
    .reverse()
    .find((entry) => progress >= entry.requiredProgress) || PVP_RANKS[0];
  return {
    ...rankDef,
    title: getPvpTitleForRank(rankDef.rank, faction),
  };
};

export const getNextPvpRank = (rank: unknown) => {
  const safeRank = Math.max(0, Math.min(14, Math.floor(Number(rank) || 0)));
  return PVP_RANKS.find((entry) => entry.rank === safeRank + 1) || null;
};

export const getPvpRankProgressInfo = (
  character: Pick<Character, "pvp"> | null | undefined,
  faction: string = GUILD_FACTION.ALLIANCE,
) => {
  const pvp = character?.pvp || {};
  const rankProgress = Math.max(0, Math.floor(Number(pvp.rankProgress) || 0));
  const currentRank = getPvpRankByProgress(rankProgress, faction);
  const nextRank = getNextPvpRank(currentRank.rank);
  const currentRequired = currentRank.requiredProgress;
  const nextRequired = nextRank?.requiredProgress ?? currentRequired;
  const progressInRank = Math.max(0, rankProgress - currentRequired);
  const progressNeeded = Math.max(0, nextRequired - currentRequired);

  return {
    rank: currentRank.rank,
    title: currentRank.title,
    rankProgress,
    currentRequired,
    nextRank: nextRank
      ? {
          ...nextRank,
          title: getPvpTitleForRank(nextRank.rank, faction),
        }
      : null,
    nextRequired,
    progressInRank,
    progressNeeded,
    percentToNext:
      progressNeeded > 0
        ? Math.max(0, Math.min(100, (progressInRank / progressNeeded) * 100))
        : 100,
  };
};
