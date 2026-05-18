import { NPC_GUILD_ARCHETYPES } from "./realmDefinitions";
import { createRandom, ensureRealmState, hashRealmSeed } from "./realmGeneration";
import { buildRealmNewsForDay, capRealmNews } from "./realmNews";
import { advanceRealmPopulationForDay } from "./realmPopulation";
import {
  advanceNpcRaidProgressForDay,
  getRealmRaidBossesCleared,
} from "./realmRaidProgress";
import { buildRealmRankings } from "./realmRankings";
import {
  advanceNpcGuildRosterForDay,
  getRealmMaxLevelCount,
} from "./realmRosters";

const clampNumber = (value, min, max) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const getArchetypeGrowth = (archetype) => {
  switch (archetype) {
    case NPC_GUILD_ARCHETYPES.HARDCORE_RAIDERS:
      return { level: 0.12, gear: 0.5, dungeon: 8, raid: 2.4, pve: 16 };
    case NPC_GUILD_ARCHETYPES.DUNGEON_RUNNERS:
      return { level: 0.14, gear: 0.42, dungeon: 12, raid: 1, pve: 14 };
    case NPC_GUILD_ARCHETYPES.LEVELING_GUILD:
      return { level: 0.32, gear: 0.22, dungeon: 5, raid: 0.4, pve: 9 };
    case NPC_GUILD_ARCHETYPES.SOCIAL_GUILD:
      return { level: 0.1, gear: 0.18, dungeon: 3, raid: 0.2, pve: 5 };
    default:
      return { level: 0.16, gear: 0.25, dungeon: 4, raid: 0.5, pve: 7 };
  }
};

const advanceNpcGuildForDay = ({ guild, random, dayIndex }) => {
  const growth = getArchetypeGrowth(guild.archetype);
  const activityMultiplier = clampNumber(guild.activityLevel, 1, 100) / 70;
  const variance = 0.75 + random() * 0.5;
  const averageLevel = clampNumber(
    guild.averageLevel + growth.level * activityMultiplier * variance,
    1,
    60,
  );
  const averageGearScore = Math.round(
    Math.max(
      0,
      guild.averageGearScore + growth.gear * activityMultiplier * variance,
    ),
  );
  const dungeonScore = Math.round(
    Math.max(0, guild.dungeonScore + growth.dungeon * activityMultiplier * variance),
  );
  const canRaid = averageLevel >= 50;
  const raidGrowth = canRaid
    ? growth.raid * activityMultiplier * variance
    : growth.raid * 0.12;
  const raidUpdate = advanceNpcRaidProgressForDay({
    guild: { ...guild, averageLevel },
    dayIndex,
    random,
    raidGrowth,
  });
  const raidProgress = Math.round(
    getRealmRaidBossesCleared({ raidProgressByRaid: raidUpdate.raidProgressByRaid }) * 4 +
      Math.max(0, guild.raidProgress + raidGrowth * 0.35),
  );
  const roster = advanceNpcGuildRosterForDay({
    roster: guild.roster,
    averageLevel,
    random,
  });
  const pveScore = Math.round(
    Math.max(
      0,
      guild.pveScore +
        growth.pve * activityMultiplier * variance +
        dungeonScore * 0.01 +
        raidProgress * 0.08,
    ),
  );

  return {
    ...guild,
    rosterSize: roster.length,
    maxLevelCount: getRealmMaxLevelCount(roster),
    roster,
    averageLevel: Math.round(averageLevel * 10) / 10,
    averageGearScore,
    dungeonScore,
    raidProgress,
    raidProgressByRaid: raidUpdate.raidProgressByRaid,
    realmEvents: raidUpdate.events,
    pveScore,
  };
};

export const advanceRealmSimulation = ({
  realmState,
  currentDayIndex,
  playerGuildSnapshot,
  guildSetup,
} = {}) => {
  const safeCurrentDay = Math.max(0, Math.floor(Number(currentDayIndex) || 0));
  let nextRealm = ensureRealmState(realmState, guildSetup, safeCurrentDay);
  const lastSimulatedDay = Math.max(
    0,
    Math.floor(Number(nextRealm.lastSimulatedDayIndex) || 0),
  );

  if (safeCurrentDay <= lastSimulatedDay) {
    return nextRealm;
  }

  for (let day = lastSimulatedDay + 1; day <= safeCurrentDay; day += 1) {
    const random = createRandom(hashRealmSeed(`${nextRealm.id}:${day}`));
    const npcGuilds = nextRealm.npcGuilds.map((guild) =>
      advanceNpcGuildForDay({ guild, random, dayIndex: day }),
    );
    const realmEvents = npcGuilds.flatMap((guild) =>
      Array.isArray(guild.realmEvents) ? guild.realmEvents : [],
    );
    const npcGuildsWithoutEvents = npcGuilds.map((guild) => {
      const { realmEvents, ...guildWithoutEvents } = guild;
      void realmEvents;
      return guildWithoutEvents;
    });
    const populationResult = advanceRealmPopulationForDay({
      realmState: nextRealm,
      npcGuilds: npcGuildsWithoutEvents,
      dayIndex: day,
      playerRosterSize: Math.max(0, Number(playerGuildSnapshot?.rosterSize) || 0),
      guildFaction: guildSetup?.faction,
      random,
    });
    const nextNpcGuilds = populationResult.npcGuilds;
    const nextRealmEvents = [...realmEvents, ...populationResult.events];
    const rankings = buildRealmRankings({
      realmState: { ...nextRealm, npcGuilds: nextNpcGuilds },
      playerGuildSnapshot,
    });
    const dayNews = buildRealmNewsForDay({
      random,
      dayIndex: day,
      npcGuilds: nextNpcGuilds,
      rankings,
      playerGuildSnapshot,
      realmEvents: nextRealmEvents,
    });
    nextRealm = {
      ...nextRealm,
      ageDays: Math.max(nextRealm.ageDays + 1, day),
      npcGuilds: nextNpcGuilds,
      population: populationResult.population,
      news: capRealmNews([...dayNews, ...nextRealm.news]),
      lastSimulatedDayIndex: day,
    };
  }

  return nextRealm;
};
