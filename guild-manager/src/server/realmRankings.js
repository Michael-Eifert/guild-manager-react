import { GUILD_FACTION } from "../constants";
import { getCharacterAverageItemLevel } from "../utils";
import {
  buildPlayerRaidProgress,
  formatRealmRaidProgressSummary,
  getRealmRaidBossesCleared,
  getRealmRaidClearCount,
  normalizeRealmRaidProgress,
} from "./realmRaidProgress";
import {
  buildPlayerRealmRoster,
  getRealmMaxLevelCount,
} from "./realmRosters";

const average = (values) => {
  const numericValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (numericValues.length === 0) return 0;
  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
};

export const calculateRealmPveScoreBreakdown = (guild = {}) => {
  const averageLevel = Math.max(0, Number(guild.averageLevel) || 0);
  const averageGearScore = Math.max(0, Number(guild.averageGearScore) || 0);
  const rosterSize = Math.max(0, Number(guild.rosterSize) || 0);
  const maxLevelCount = Math.max(0, Number(guild.maxLevelCount) || 0);
  const dungeonScore = Math.max(0, Number(guild.dungeonScore) || 0);
  const raidBossesCleared = getRealmRaidBossesCleared(guild);
  const raidClearCount = getRealmRaidClearCount(guild);

  const breakdown = {
    level: Math.round(averageLevel * 6),
    gear: Math.round(averageGearScore * 5),
    roster: Math.round(rosterSize * 2),
    maxLevel: Math.round(maxLevelCount * 12),
    dungeons: Math.round(dungeonScore * 0.75),
    raidBosses: Math.round(raidBossesCleared * 220),
    raidClears: Math.round(raidClearCount * 550),
  };
  return {
    ...breakdown,
    total: Object.values(breakdown).reduce((sum, value) => sum + value, 0),
  };
};

export const calculateRealmPveScore = (guild = {}) =>
  calculateRealmPveScoreBreakdown(guild).total;

const getUniqueClearedMissions = (roster, missionList, predicate) => {
  const missionLookup = new Map(
    (Array.isArray(missionList) ? missionList : [])
      .filter((mission) => mission?.id != null)
      .map((mission) => [String(mission.id), mission]),
  );
  const clearedById = new Map();
  (Array.isArray(roster) ? roster : []).forEach((member) => {
    (Array.isArray(member?.clearedMissionIds) ? member.clearedMissionIds : [])
      .map((missionId) => String(missionId || ""))
      .filter(Boolean)
      .forEach((missionId) => {
        const mission = missionLookup.get(missionId);
        if (mission && predicate(mission)) clearedById.set(missionId, mission);
      });
  });
  return [...clearedById.entries()].map(([id, mission]) => ({
    id,
    name: mission.dungeonWing || mission.name || id,
    dungeonSetName: mission.dungeonSetName || null,
    level: Math.max(1, Number(mission.level || mission.minLevel) || 1),
  }));
};

export const buildPlayerGuildSnapshot = ({
  guildSetup,
  roster = [],
  missionList = [],
  guildProgress,
  raidLockouts,
} = {}) => {
  const members = Array.isArray(roster) ? roster : [];
  const realmRoster = buildPlayerRealmRoster(members);
  const rosterSize = members.length;
  const averageLevel = average(members.map((member) => member?.level));
  const averageGearScore = average(
    members.map((member) => getCharacterAverageItemLevel(member)),
  );
  const clearedDungeonMissions = getUniqueClearedMissions(
    members,
    missionList,
    (mission) => mission?.type === "dungeon" && mission?.isRaid !== true,
  );
  const raidClearCount = getUniqueClearedMissions(
    members,
    missionList,
    (mission) => mission?.isRaid === true,
  ).length;
  const dungeonClearCount = clearedDungeonMissions.length;
  const milestoneDungeon = guildProgress?.milestones?.dungeon || {};
  const milestoneClearCount = Math.max(
    0,
    Math.floor(Number(milestoneDungeon.clearCount) || 0),
  );
  const dungeonScore = Math.round(
    dungeonClearCount * 55 + milestoneClearCount * 8,
  );
  const raidProgressByRaid = buildPlayerRaidProgress({
    roster: members,
    missionList,
    guildProgress,
    raidLockouts,
  });
  const raidBossesCleared = getRealmRaidBossesCleared({ raidProgressByRaid });
  const raidClearMilestones = [
    "moltenCoreCleared",
    "blackwingLairCleared",
    "zulGurubCleared",
    "ahnQirajRuinsCleared",
    "ahnQirajTempleCleared",
    "onyxiasLairCleared",
    "naxxramasCleared",
  ].filter((key) => milestoneDungeon[key]).length;
  const raidProgress = Math.round(
    raidBossesCleared * 4 +
      raidClearCount * 10 +
      [
        "moltenCoreCleared",
        "blackwingLairCleared",
        "zulGurubCleared",
        "ahnQirajRuinsCleared",
        "ahnQirajTempleCleared",
        "onyxiasLairCleared",
        "naxxramasCleared",
      ].filter((key) => milestoneDungeon[key]).length * 14,
  );
  const snapshot = {
    id: "player:guild",
    name: String(guildSetup?.name || "Player Guild").trim() || "Player Guild",
    faction: guildSetup?.faction || GUILD_FACTION.ALLIANCE,
    isPlayerGuild: true,
    archetype: "Player Guild",
    rosterSize,
    maxLevelCount: getRealmMaxLevelCount(realmRoster),
    roster: realmRoster,
    averageLevel: Math.round(averageLevel * 10) / 10,
    averageGearScore: Math.round(averageGearScore * 10) / 10,
    activityLevel: 100,
    raidProgress,
    raidProgressByRaid,
    raidProgressSummary: formatRealmRaidProgressSummary({ raidProgressByRaid }),
    raidBossesCleared,
    raidClearCount: raidClearMilestones,
    dungeonScore,
    dungeonClearCount,
    clearedDungeonMissions,
    reputation: Math.min(100, 45 + Math.floor(rosterSize / 2)),
  };

  return {
    ...snapshot,
    pveScore: calculateRealmPveScore(snapshot),
  };
};

export const buildRealmRankings = ({ realmState, playerGuildSnapshot } = {}) => {
  const npcRows = (Array.isArray(realmState?.npcGuilds) ? realmState.npcGuilds : [])
    .filter(Boolean)
    .map((guild) => {
      const row = {
        ...guild,
        raidProgressByRaid: normalizeRealmRaidProgress(guild.raidProgressByRaid),
        raidProgressSummary: formatRealmRaidProgressSummary(guild),
        raidBossesCleared: getRealmRaidBossesCleared(guild),
        raidClearCount: getRealmRaidClearCount(guild),
        maxLevelCount: getRealmMaxLevelCount(guild.roster),
        isPlayerGuild: false,
      };
      return {
        ...row,
        pveScore: calculateRealmPveScore(row),
        pveScoreBreakdown: calculateRealmPveScoreBreakdown(row),
      };
    });
  const playerRow = playerGuildSnapshot
    ? {
        ...playerGuildSnapshot,
        raidProgressByRaid: normalizeRealmRaidProgress(
          playerGuildSnapshot.raidProgressByRaid,
        ),
        raidProgressSummary: formatRealmRaidProgressSummary(playerGuildSnapshot),
        raidBossesCleared: getRealmRaidBossesCleared(playerGuildSnapshot),
        raidClearCount: getRealmRaidClearCount(playerGuildSnapshot),
        maxLevelCount: getRealmMaxLevelCount(playerGuildSnapshot.roster),
        pveScore: calculateRealmPveScore(playerGuildSnapshot),
        pveScoreBreakdown: calculateRealmPveScoreBreakdown(
          playerGuildSnapshot,
        ),
        isPlayerGuild: true,
      }
    : null;
  const rankedRows = [...npcRows, playerRow].filter(Boolean).sort((left, right) => {
    if ((right.pveScore || 0) !== (left.pveScore || 0)) {
      return (right.pveScore || 0) - (left.pveScore || 0);
    }
    if ((right.raidProgress || 0) !== (left.raidProgress || 0)) {
      return (right.raidProgress || 0) - (left.raidProgress || 0);
    }
    return String(left.name || "").localeCompare(String(right.name || ""));
  });

  return rankedRows.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
};

export const getPlayerRealmRanking = (rankings) =>
  (Array.isArray(rankings) ? rankings : []).find((row) => row.isPlayerGuild) ||
  null;
