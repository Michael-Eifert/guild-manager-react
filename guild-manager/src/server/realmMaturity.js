import { CONFIG } from "../constants";
import { normalizeRealmAgeMonths } from "../guild/startProgression";
import { normalizeRealmRaidProgress } from "./realmRaidProgress";

const RAID_SEQUENCE = Object.freeze([
  "zul_gurub",
  "ahn_qiraj_ruins",
  "onyxias_lair",
  "molten_core",
  "blackwing_lair",
  "ahn_qiraj_temple",
  "naxxramas",
]);

const MONTHLY_PROFILES = Object.freeze([
  { averageLevel: 1, levelCap: 1, maxLevelShare: 0, gear: 1, raidBosses: 0 },
  { averageLevel: 30, levelCap: 55, maxLevelShare: 0, gear: 28, raidBosses: 0 },
  { averageLevel: 43, levelCap: 60, maxLevelShare: 0.08, gear: 48, raidBosses: 0 },
  { averageLevel: 48, levelCap: 60, maxLevelShare: 0.15, gear: 55, raidBosses: 16 },
  { averageLevel: 52, levelCap: 60, maxLevelShare: 0.25, gear: 61, raidBosses: 26 },
  { averageLevel: 54, levelCap: 60, maxLevelShare: 0.34, gear: 65, raidBosses: 30 },
  { averageLevel: 55, levelCap: 60, maxLevelShare: 0.42, gear: 69, raidBosses: 32 },
  { averageLevel: 56, levelCap: 60, maxLevelShare: 0.5, gear: 72, raidBosses: 34 },
  { averageLevel: 56, levelCap: 60, maxLevelShare: 0.58, gear: 75, raidBosses: 46 },
  { averageLevel: 57, levelCap: 60, maxLevelShare: 0.64, gear: 78, raidBosses: 49 },
  { averageLevel: 57, levelCap: 60, maxLevelShare: 0.7, gear: 81, raidBosses: 52 },
  { averageLevel: 58, levelCap: 60, maxLevelShare: 0.75, gear: 84, raidBosses: 56 },
  { averageLevel: 58, levelCap: 60, maxLevelShare: 0.8, gear: 87, raidBosses: 58 },
]);

export const getRealmMaturityProfile = (realmAgeMonths) => {
  const months = normalizeRealmAgeMonths(realmAgeMonths);
  return {
    months,
    ...MONTHLY_PROFILES[months],
  };
};

export const generateMatureRealmLevel = ({
  realmAgeMonths,
  random = Math.random,
  strength = 0.5,
} = {}) => {
  const profile = getRealmMaturityProfile(realmAgeMonths);
  if (profile.levelCap <= 1) return 1;
  const safeRandom = typeof random === "function" ? random : Math.random;
  const safeStrength = Math.max(0, Math.min(1, Number(strength) || 0));
  if (
    profile.levelCap >= CONFIG.LEVEL_CAP &&
    safeRandom() < profile.maxLevelShare * (0.55 + safeStrength * 0.9)
  ) {
    return CONFIG.LEVEL_CAP;
  }
  const center =
    profile.averageLevel - 8 + safeStrength * 12 + (safeRandom() - 0.5) * 24;
  const nonMaxCap =
    profile.levelCap >= CONFIG.LEVEL_CAP
      ? CONFIG.LEVEL_CAP - 1
      : profile.levelCap;
  return Math.max(1, Math.min(nonMaxCap, Math.round(center)));
};

export const generateMatureRealmItemLevel = ({
  level,
  realmAgeMonths,
  random = Math.random,
  strength = 0.5,
} = {}) => {
  const profile = getRealmMaturityProfile(realmAgeMonths);
  const safeRandom = typeof random === "function" ? random : Math.random;
  const safeLevel = Math.max(1, Math.min(60, Math.round(Number(level) || 1)));
  const safeStrength = Math.max(0, Math.min(1, Number(strength) || 0));
  if (profile.months === 0) return 1;
  const levelBound = safeLevel < 60 ? safeLevel + 4 : profile.gear + 5;
  const maturityGear =
    profile.gear - 8 + safeStrength * 12 + (safeRandom() - 0.5) * 8;
  return Math.max(1, Math.min(100, levelBound, Math.round(maturityGear)));
};

const fillRaidBossBudget = (bossBudget, lastClearDayIndex) => {
  const progress = normalizeRealmRaidProgress({});
  let remaining = Math.max(0, Math.floor(Number(bossBudget) || 0));
  RAID_SEQUENCE.forEach((raidId) => {
    if (remaining <= 0) return;
    const raid = progress[raidId];
    const clearedBosses = Math.min(raid.totalBosses, remaining);
    progress[raidId] = {
      ...raid,
      clearedBosses,
      completed: clearedBosses >= raid.totalBosses,
      lastClearDayIndex: clearedBosses > 0 ? lastClearDayIndex : null,
    };
    remaining -= clearedBosses;
  });
  return progress;
};

const getGuildMaturityStrength = (guild, index) => {
  const archetypeBonus =
    guild?.archetype === "Hardcore Raiders"
      ? 0.2
      : guild?.archetype === "Dungeon Runners"
        ? 0.1
        : guild?.archetype === "Leveling Guild"
          ? 0.04
          : guild?.archetype === "Social Guild"
            ? -0.08
            : 0;
  return Math.max(
    0,
    Math.min(
      1,
      0.25 +
        (Number(guild?.activityLevel) || 50) / 200 +
        (Number(guild?.reputation) || 50) / 300 +
        archetypeBonus -
        index * 0.0001,
    ),
  );
};

const getBossBudgetForRank = ({
  months,
  raidBosses,
  rank,
  guildCount,
  naxxClearCount,
}) => {
  if (months < 3 || raidBosses <= 0) return 0;
  if (months === 3) {
    return rank < Math.min(2, guildCount) ? Math.max(9, 16 - rank * 7) : 0;
  }
  const competitiveGuilds = Math.max(2, Math.ceil(guildCount * 0.42));
  if (rank >= competitiveGuilds) {
    return Math.max(0, Math.floor((raidBosses - 20) * 0.25));
  }
  const rankFactor = 1 - rank / Math.max(1, competitiveGuilds);
  let budget = Math.floor(raidBosses * (0.42 + rankFactor * 0.58));
  if (months === 12) {
    if (rank < naxxClearCount) return 58;
    budget = Math.min(57, budget);
  }
  return budget;
};

export const applyRealmMaturityToGuilds = ({
  guilds = [],
  realmAgeMonths,
  realmAgeDays,
  seed = 0,
} = {}) => {
  const source = Array.isArray(guilds) ? guilds : [];
  const profile = getRealmMaturityProfile(realmAgeMonths);
  if (profile.months === 0) return source;
  const ranked = [...source].sort((left, right) => {
    const leftScore =
      getGuildMaturityStrength(left, 0) * 1000 +
      ((Number(seed) + String(left?.id || "").length * 17) % 97);
    const rightScore =
      getGuildMaturityStrength(right, 0) * 1000 +
      ((Number(seed) + String(right?.id || "").length * 17) % 97);
    return rightScore - leftScore || String(left?.id).localeCompare(String(right?.id));
  });
  const rankById = new Map(ranked.map((guild, rank) => [String(guild.id), rank]));
  const naxxClearCount =
    profile.months === 12 ? Math.min(source.length, 1 + (Number(seed) % 2)) : 0;

  return source.map((guild) => {
    const rank = rankById.get(String(guild.id)) || 0;
    const strength = getGuildMaturityStrength(guild, rank);
    const bossBudget = getBossBudgetForRank({
      months: profile.months,
      raidBosses: profile.raidBosses,
      rank,
      guildCount: source.length,
      naxxClearCount,
    });
    const raidProgressByRaid = fillRaidBossBudget(
      bossBudget,
      Math.max(0, Math.floor(Number(realmAgeDays) || 0) - rank - 1),
    );
    const roster = (Array.isArray(guild.roster) ? guild.roster : []).map(
      (member, memberIndex) => {
        const level = generateMatureRealmLevel({
          realmAgeMonths: profile.months,
          strength,
          random: () =>
            ((Number(seed) + rank * 131 + memberIndex * 47 + 17) % 997) / 997,
        });
        const itemLevel = generateMatureRealmItemLevel({
          level,
          realmAgeMonths: profile.months,
          strength: Math.min(1, strength + bossBudget / 180),
          random: () =>
            ((Number(seed) + rank * 71 + memberIndex * 89 + 31) % 991) / 991,
        });
        return { ...member, level, itemLevel };
      },
    );
    const averageLevel =
      roster.length > 0
        ? Math.round(
            roster.reduce((sum, member) => sum + Number(member.level || 1), 0) /
              roster.length,
          )
        : profile.averageLevel;
    const averageGearScore =
      roster.length > 0
        ? Math.round(
            roster.reduce(
              (sum, member) => sum + Number(member.itemLevel || 1),
              0,
            ) / roster.length,
          )
        : profile.gear;
    return {
      ...guild,
      roster,
      rosterSize: roster.length,
      maxLevelCount: roster.filter((member) => member.level >= 60).length,
      averageLevel,
      averageGearScore,
      raidProgress: bossBudget * 4,
      raidProgressByRaid,
      foundedAtDayIndex: 0,
    };
  });
};
