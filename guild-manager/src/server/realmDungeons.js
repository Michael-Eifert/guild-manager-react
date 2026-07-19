import { CONFIG, INITIAL_MISSIONS } from "../constants";
import { getCharacterDungeonSuccessBonus } from "../game/characterPersonality";
import {
  getMissionBaseFailChance,
  getMissionPowerTarget,
} from "../utils";
import { NPC_GUILD_ARCHETYPES } from "./realmDefinitions";

const REALM_DUNGEON_PARTY_SIZE = 5;
const MAX_GUILD_DUNGEON_RUNS_PER_DAY = 4;
const MAX_PUG_DUNGEON_RUNS_PER_DAY = 12;
const RECENT_REALM_DUNGEON_EVENT_LIMIT = 8;

const clampNumber = (value, min, max) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const getDungeonMissions = () =>
  INITIAL_MISSIONS.filter(
    (mission) => mission?.type === "dungeon" && mission?.isRaid !== true,
  ).sort((left, right) => {
    const leftLevel = Math.max(1, Number(left.level || left.minLevel) || 1);
    const rightLevel = Math.max(1, Number(right.level || right.minLevel) || 1);
    if (leftLevel !== rightLevel) return leftLevel - rightLevel;
    return String(left.name || "").localeCompare(String(right.name || ""));
  });

const getGuildDungeonProfile = (guild) => {
  switch (guild?.archetype) {
    case NPC_GUILD_ARCHETYPES.DUNGEON_RUNNERS:
      return { rate: 1.75, successBonus: 10 };
    case NPC_GUILD_ARCHETYPES.HARDCORE_RAIDERS:
      return { rate: 1.18, successBonus: 5 };
    case NPC_GUILD_ARCHETYPES.LEVELING_GUILD:
      return { rate: 1.28, successBonus: 3 };
    case NPC_GUILD_ARCHETYPES.SOCIAL_GUILD:
      return { rate: 0.55, successBonus: -2 };
    case NPC_GUILD_ARCHETYPES.CASUAL_ADVENTURERS:
    default:
      return { rate: 0.85, successBonus: 0 };
  }
};

const getMemberPower = (member) =>
  (Number(member?.level) || 1) * 0.72 +
  (Number(member?.itemLevel) || 0) * 0.28;

const average = (values) => {
  const numericValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (numericValues.length === 0) return 0;
  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
};

const rollCount = ({ expected, random, max }) => {
  const safeExpected = Math.max(0, Number(expected) || 0);
  const base = Math.floor(safeExpected);
  const extra = random() < safeExpected - base ? 1 : 0;
  return Math.max(0, Math.min(max, base + extra));
};

const selectDungeonForParty = ({ party, missions, random }) => {
  const averageLevel = average(party.map((member) => member.level));
  const lowestLevel = Math.min(...party.map((member) => Number(member.level) || 1));
  const candidates = missions.filter((mission) => {
    const missionLevel = Math.max(1, Number(mission.level || mission.minLevel) || 1);
    const minLevel = Math.max(1, Number(mission.minLevel) || Math.max(1, missionLevel - 8));
    return (
      lowestLevel >= minLevel - 2 &&
      missionLevel <= averageLevel + 5 &&
      missionLevel >= averageLevel - 12
    );
  });
  const source = candidates.length > 0 ? candidates : missions.filter((mission) => {
    const minLevel = Math.max(1, Number(mission.minLevel) || 1);
    return lowestLevel >= minLevel;
  });
  if (source.length === 0) return null;
  const preferred = source.slice(-3);
  return preferred[Math.floor(random() * preferred.length)];
};

const pickParty = ({ candidates, usedPlayerIds, random }) => {
  const available = candidates.filter((player) => !usedPlayerIds.has(player.id));
  if (available.length < REALM_DUNGEON_PARTY_SIZE) return null;

  const party = [];
  const addMember = (member) => {
    if (!member || party.some((candidate) => candidate.id === member.id)) return;
    party.push(member);
  };
  const sorted = [...available].sort((left, right) => {
    if ((right.level || 0) !== (left.level || 0)) return (right.level || 0) - (left.level || 0);
    if ((right.itemLevel || 0) !== (left.itemLevel || 0)) {
      return (right.itemLevel || 0) - (left.itemLevel || 0);
    }
    return String(left.id || "").localeCompare(String(right.id || ""));
  });

  addMember(sorted.find((member) => member.role === "Tank"));
  addMember(sorted.find((member) => member.role === "Healer"));
  sorted.forEach((member) => {
    if (party.length < REALM_DUNGEON_PARTY_SIZE) addMember(member);
  });

  if (party.length < REALM_DUNGEON_PARTY_SIZE) return null;
  const window = Math.min(sorted.length, Math.max(REALM_DUNGEON_PARTY_SIZE, 12));
  for (let index = 0; index < party.length; index += 1) {
    if (random() > 0.2) continue;
    const replacement = sorted[Math.floor(random() * window)];
    if (replacement) {
      party[index] = replacement;
    }
  }
  return [...new Map(party.map((member) => [member.id, member])).values()]
    .slice(0, REALM_DUNGEON_PARTY_SIZE);
};

const getDungeonSuccessChance = ({
  mission,
  party,
  guild,
  difficultySuccessBonus = 0,
}) => {
  const missionPower = getMissionPowerTarget(mission);
  const partyPower = average(party.map(getMemberPower));
  const baseFailChance = getMissionBaseFailChance(mission);
  const hasTank = party.some((member) => member.role === "Tank");
  const hasHealer = party.some((member) => member.role === "Healer");
  const hasDps = party.some((member) => member.role === "DPS");
  const roleCompositionBonus = hasTank && hasHealer && hasDps ? 20 : 0;
  const personalitySuccessBonus = party.reduce(
    (sum, member) => sum + getCharacterDungeonSuccessBonus(member),
    0,
  );
  const guildProfile = getGuildDungeonProfile(guild);
  const rawFailChance =
    baseFailChance +
    (missionPower - partyPower) * 5 -
    Math.max(0, party.length - 1) * 2.5 -
    roleCompositionBonus -
    personalitySuccessBonus -
    guildProfile.successBonus -
    Number(difficultySuccessBonus || 0);

  return 100 - Math.round(clampNumber(rawFailChance, 5, 95));
};

const getDungeonClearScore = ({ mission, firstClear }) => {
  const missionLevel = Math.max(1, Number(mission?.level || mission?.minLevel) || 1);
  return Math.round(40 + missionLevel * 2.4 + (firstClear ? 35 : 0));
};

const getDungeonMissionLabel = (mission) => {
  if (mission?.dungeonSetName && mission?.dungeonWing) {
    return `${mission.dungeonSetName}: ${mission.dungeonWing}`;
  }
  return mission?.dungeonWing || mission?.name || "Unknown Dungeon";
};

const updateDungeonClears = ({ guild, mission }) => {
  const missionId = String(mission?.id || "");
  const existingClears = Array.isArray(guild?.clearedDungeonMissions)
    ? guild.clearedDungeonMissions
    : [];
  const existing = existingClears.find((clear) => String(clear.id) === missionId);
  if (existing) {
    return existingClears.map((clear) =>
      String(clear.id) === missionId
        ? {
            ...clear,
            clearCount: Math.max(1, Number(clear.clearCount) || 1) + 1,
          }
        : clear,
    );
  }

  return [
    ...existingClears,
    {
      id: missionId,
      name: mission?.dungeonWing || mission?.name || missionId,
      dungeonSetName: mission?.dungeonSetName || null,
      level: Math.max(1, Number(mission?.level || mission?.minLevel) || 1),
      clearCount: 1,
    },
  ].slice(-40);
};

const applyDungeonRewardsToPlayers = ({ players, party, mission, success, random }) => {
  const participantIds = new Set(party.map((member) => member.id));
  const missionLevel = Math.max(1, Number(mission?.level || mission?.minLevel) || 1);
  return players.map((player) => {
    if (!participantIds.has(player.id)) return player;
    const currentLevel = Math.max(1, Number(player.level) || 1);
    const currentItemLevel = Math.max(0, Number(player.itemLevel) || 0);
    const levelGain =
      success &&
      currentLevel < CONFIG.LEVEL_CAP &&
      currentLevel <= missionLevel + 3 &&
      random() < 0.35
        ? 1
        : 0;
    const itemGain =
      success && currentItemLevel < missionLevel + 5
        ? 1 + (random() < 0.18 ? 1 : 0)
        : 0;
    return {
      ...player,
      level: Math.min(CONFIG.LEVEL_CAP, currentLevel + levelGain),
      itemLevel: Math.min(100, currentItemLevel + itemGain),
    };
  });
};

const runDungeonAttempt = ({
  players,
  guild,
  party,
  mission,
  random,
  source,
  difficultySuccessBonus = 0,
}) => {
  const successChance = getDungeonSuccessChance({
    mission,
    party,
    guild,
    difficultySuccessBonus,
  });
  const success = random() * 100 < successChance;
  const nextPlayers = applyDungeonRewardsToPlayers({
    players,
    party,
    mission,
    success,
    random,
  });

  if (!guild) {
    return {
      players: nextPlayers,
      guild: null,
      result: {
        source,
        success,
        mission,
        successChance,
      },
    };
  }

  const clearedDungeonMissions = success
    ? updateDungeonClears({ guild, mission })
    : Array.isArray(guild.clearedDungeonMissions)
      ? guild.clearedDungeonMissions
      : [];
  const firstClear = success
    ? !Array.isArray(guild.clearedDungeonMissions) ||
      !guild.clearedDungeonMissions.some((clear) => String(clear.id) === String(mission.id))
    : false;
  const scoreGain = success ? getDungeonClearScore({ mission, firstClear }) : 0;

  return {
    players: nextPlayers,
    guild: {
      ...guild,
      dungeonRunCount: Math.max(0, Number(guild.dungeonRunCount) || 0) + 1,
      dungeonClearCount: Math.max(0, Number(guild.dungeonClearCount) || 0) + (success ? 1 : 0),
      dungeonWipeCount: Math.max(0, Number(guild.dungeonWipeCount) || 0) + (success ? 0 : 1),
      dungeonScore: Math.max(0, Math.round(Number(guild.dungeonScore) || 0)) + scoreGain,
      clearedDungeonMissions,
    },
    result: {
      source,
      success,
      mission,
      successChance,
      guildId: guild.id,
      guildName: guild.name,
      scoreGain,
    },
  };
};

export const simulateRealmDungeonActivity = ({
  npcGuilds = [],
  players = [],
  dayIndex = 0,
  dayFraction = 1,
  rateMultiplier = 1,
  successBonus = 0,
  random = Math.random,
} = {}) => {
  const safeRandom = typeof random === "function" ? random : Math.random;
  const safeDayFraction = clampNumber(dayFraction, 0.05, 1);
  const missions = getDungeonMissions();
  if (missions.length === 0) {
    return {
      npcGuilds,
      players,
      stats: {
        guildDungeonRuns: 0,
        guildDungeonClears: 0,
        pugDungeonRuns: 0,
        pugDungeonClears: 0,
        dungeonWipes: 0,
      },
      events: [],
    };
  }

  let nextPlayers = [...players];
  const usedPlayerIds = new Set();
  const results = [];
  const nextGuilds = (Array.isArray(npcGuilds) ? npcGuilds : []).map((guild) => {
    const profile = getGuildDungeonProfile(guild);
    const guildPlayers = nextPlayers.filter(
      (player) => player.guildId === guild.id && Math.max(1, Number(player.level) || 1) >= 10,
    );
    const expectedRuns =
      (guildPlayers.length / 14) *
      (clampNumber(guild.activityLevel, 1, 100) / 100) *
      profile.rate *
      Math.max(0, Number(rateMultiplier) || 0) *
      safeDayFraction;
    const attempts = rollCount({
      expected: expectedRuns,
      random: safeRandom,
      max: Math.max(1, Math.ceil(MAX_GUILD_DUNGEON_RUNS_PER_DAY * safeDayFraction)),
    });
    let nextGuild = guild;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const party = pickParty({
        candidates: guildPlayers,
        usedPlayerIds,
        random: safeRandom,
      });
      if (!party || party.length < REALM_DUNGEON_PARTY_SIZE) break;
      const mission = selectDungeonForParty({ party, missions, random: safeRandom });
      if (!mission) break;
      party.forEach((member) => usedPlayerIds.add(member.id));
      const attemptResult = runDungeonAttempt({
        players: nextPlayers,
        guild: nextGuild,
        party,
        mission,
        random: safeRandom,
        source: "guild",
        difficultySuccessBonus: successBonus,
      });
      nextPlayers = attemptResult.players;
      nextGuild = attemptResult.guild;
      results.push(attemptResult.result);
    }

    return nextGuild;
  });

  const pugCandidates = nextPlayers.filter(
    (player) => !player.guildId && Math.max(1, Number(player.level) || 1) >= 10,
  );
  const expectedPugRuns =
    (pugCandidates.length / 80) *
    safeDayFraction;
  const pugAttempts = rollCount({
    expected: expectedPugRuns,
    random: safeRandom,
    max: Math.max(1, Math.ceil(MAX_PUG_DUNGEON_RUNS_PER_DAY * safeDayFraction)),
  });
  for (let attempt = 0; attempt < pugAttempts; attempt += 1) {
    const party = pickParty({
      candidates: pugCandidates,
      usedPlayerIds,
      random: safeRandom,
    });
    if (!party || party.length < REALM_DUNGEON_PARTY_SIZE) break;
    const mission = selectDungeonForParty({ party, missions, random: safeRandom });
    if (!mission) break;
    party.forEach((member) => usedPlayerIds.add(member.id));
    const attemptResult = runDungeonAttempt({
      players: nextPlayers,
      guild: null,
      party,
      mission,
      random: safeRandom,
      source: "pug",
    });
    nextPlayers = attemptResult.players;
    results.push(attemptResult.result);
  }

  const guildResults = results.filter((result) => result.source === "guild");
  const pugResults = results.filter((result) => result.source === "pug");
  const clearResults = results.filter((result) => result.success);
  const notableClears = clearResults
    .filter((result) => result.source === "guild")
    .slice(0, RECENT_REALM_DUNGEON_EVENT_LIMIT);

  return {
    npcGuilds: nextGuilds,
    players: nextPlayers,
    stats: {
      guildDungeonRuns: guildResults.length,
      guildDungeonClears: guildResults.filter((result) => result.success).length,
      pugDungeonRuns: pugResults.length,
      pugDungeonClears: pugResults.filter((result) => result.success).length,
      dungeonWipes: results.filter((result) => !result.success).length,
    },
    events: [
      ...notableClears.map((result) => ({
        type: "npc-dungeon-clear",
        guildId: result.guildId,
        guildName: result.guildName,
        missionId: result.mission.id,
        missionName: getDungeonMissionLabel(result.mission),
        dayIndex,
        scoreGain: result.scoreGain,
        successChance: result.successChance,
        message: `${result.guildName} cleared ${getDungeonMissionLabel(result.mission)}.`,
      })),
      results.length > 0
        ? {
            type: "realm-dungeons",
            guildDungeonRuns: guildResults.length,
            guildDungeonClears: guildResults.filter((result) => result.success).length,
            pugDungeonRuns: pugResults.length,
            pugDungeonClears: pugResults.filter((result) => result.success).length,
            dungeonWipes: results.filter((result) => !result.success).length,
            message:
              `${guildResults.length} guild dungeon run${guildResults.length === 1 ? "" : "s"} ` +
              `and ${pugResults.length} pug run${pugResults.length === 1 ? "" : "s"} formed across the realm.`,
          }
        : null,
    ].filter(Boolean),
  };
};
