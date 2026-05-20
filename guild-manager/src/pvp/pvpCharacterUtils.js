import { GUILD_FACTION } from "../constants";
import {
  getPvpRankByProgress,
  getPvpTitleForRank,
} from "./pvpRanks";

const normalizeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.floor(numeric));
};

const normalizeIdList = (value) => [
  ...new Set(
    (Array.isArray(value) ? value : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  ),
];

const normalizeFaction = (faction) =>
  faction === GUILD_FACTION.HORDE ? GUILD_FACTION.HORDE : GUILD_FACTION.ALLIANCE;

export const createDefaultPvpData = (faction = GUILD_FACTION.ALLIANCE) => ({
  lifetimeHonor: 0,
  weeklyHonor: 0,
  rankProgress: 0,
  rank: 0,
  title: getPvpTitleForRank(0, normalizeFaction(faction)),
  highestRank: 0,
  highestTitle: getPvpTitleForRank(0, normalizeFaction(faction)),
  honorableKills: 0,
  unlockedPvpGearIds: [],
});

export const ensureCharacterPvpData = (
  character,
  faction = GUILD_FACTION.ALLIANCE,
) => {
  const safeCharacter = character && typeof character === "object" ? character : {};
  const safeFaction = normalizeFaction(safeCharacter.faction || faction);
  const source = safeCharacter.pvp && typeof safeCharacter.pvp === "object"
    ? safeCharacter.pvp
    : {};
  const rankProgress = normalizeNumber(source.rankProgress);
  const rankFromProgress = getPvpRankByProgress(rankProgress, safeFaction);
  const rank = normalizeNumber(source.rank, rankFromProgress.rank);
  const highestRank = Math.max(rank, normalizeNumber(source.highestRank, rank));

  return {
    ...safeCharacter,
    pvp: {
      ...createDefaultPvpData(safeFaction),
      ...source,
      lifetimeHonor: normalizeNumber(source.lifetimeHonor),
      weeklyHonor: normalizeNumber(source.weeklyHonor),
      rankProgress,
      rank,
      title: source.title || getPvpTitleForRank(rank, safeFaction),
      highestRank,
      highestTitle:
        source.highestTitle || getPvpTitleForRank(highestRank, safeFaction),
      honorableKills: normalizeNumber(source.honorableKills),
      unlockedPvpGearIds: normalizeIdList(source.unlockedPvpGearIds),
    },
  };
};
