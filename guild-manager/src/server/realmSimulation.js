import {
  NPC_GUILD_ARCHETYPES,
  REALM_NPC_GUILD_FOUNDED_ROSTER_RANGE,
  REALM_NPC_GUILD_INITIAL_RANGE,
  REALM_POPULATION_START,
  getRealmPopulationProfile,
} from "./realmDefinitions";
import {
  createRandom,
  ensureRealmState,
  generateNpcGuilds,
  hashRealmSeed,
} from "./realmGeneration";
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

const pickRealmGuildTarget = (realmId, serverPopulation) => {
  const { guildTargetRange } = getRealmPopulationProfile(serverPopulation);
  const span = guildTargetRange[1] - guildTargetRange[0];
  return (
    guildTargetRange[0] +
    (hashRealmSeed(`${realmId}:${serverPopulation}:guild-target`) % (span + 1))
  );
};

const getRealmPopulationTotal = (realmState, playerGuildSnapshot) =>
  Math.max(0, Number(realmState?.population?.players?.length) || 0) +
  Math.max(0, Number(playerGuildSnapshot?.rosterSize) || 0);

const pickFoundedGuildRosterSize = ({ realmId, guildId, random }) => {
  const [min, max] = REALM_NPC_GUILD_FOUNDED_ROSTER_RANGE;
  const span = Math.max(0, max - min);
  const seededOffset =
    span > 0
      ? hashRealmSeed(`${realmId}:${guildId}:founded-size`) % (span + 1)
      : 0;
  const variance =
    span > 0 && random() < 0.35
      ? Math.floor(random() * (span + 1))
      : seededOffset;
  return Math.max(min, Math.min(max, min + variance));
};

const REALM_SIMULATION_STEPS_PER_DAY = 4;
const REALM_SIMULATION_STEP_FRACTION = 1 / REALM_SIMULATION_STEPS_PER_DAY;

const getRealmSimulationStepIndex = (dayIndex, dayProgress = 0) => {
  const safeDay = Math.max(0, Math.floor(Number(dayIndex) || 0));
  const safeProgress = clampNumber(dayProgress, 0, 0.9999);
  return Math.max(
    0,
    Math.floor(safeDay * REALM_SIMULATION_STEPS_PER_DAY + safeProgress * REALM_SIMULATION_STEPS_PER_DAY),
  );
};

const getRealmSimulationDayForStep = (stepIndex) =>
  Math.max(
    1,
    Math.floor(
      (Math.max(1, Number(stepIndex) || 1) - 1) /
        REALM_SIMULATION_STEPS_PER_DAY,
    ) + 1,
  );

const maybeFormNpcGuildForDay = ({
  realmState,
  npcGuilds,
  playerGuildSnapshot,
  guildSetup,
  dayIndex,
  random,
}) => {
  const currentGuilds = Array.isArray(npcGuilds) ? npcGuilds : [];
  const populationProfile = getRealmPopulationProfile(realmState?.populationLabel);
  const targetGuildCount = pickRealmGuildTarget(
    realmState?.id,
    populationProfile.populationLabel,
  );
  if (currentGuilds.length >= targetGuildCount) return currentGuilds;

  const totalPopulation = getRealmPopulationTotal(realmState, playerGuildSnapshot);
  const growthSpan = Math.max(1, populationProfile.softCap - REALM_POPULATION_START);
  const populationProgress = clampNumber(
    (totalPopulation - REALM_POPULATION_START) / growthSpan,
    0,
    1,
  );
  const initialGuildCount = Math.max(
    REALM_NPC_GUILD_INITIAL_RANGE[0],
    Math.min(currentGuilds.length, REALM_NPC_GUILD_INITIAL_RANGE[1]),
  );
  const desiredGuildCount = Math.min(
    targetGuildCount,
    initialGuildCount +
      Math.floor((targetGuildCount - initialGuildCount) * populationProgress),
  );

  if (currentGuilds.length >= desiredGuildCount || random() > 0.65) {
    return currentGuilds;
  }

  const realmName = realmState?.name || guildSetup?.server;
  const realmType = realmState?.type || guildSetup?.serverStyle;
  const generated = generateNpcGuilds({
    realmName,
    realmType,
    count: currentGuilds.length + 1,
  });
  const candidate = generated[currentGuilds.length];
  if (!candidate) return currentGuilds;
  const foundedRosterSize = pickFoundedGuildRosterSize({
    realmId: realmState?.id,
    guildId: candidate.id,
    random,
  });

  return [
    ...currentGuilds,
    {
      ...candidate,
      roster: [],
      rosterSize: 0,
      foundedRosterSize,
      foundedAtDayIndex: dayIndex,
      maxLevelCount: 0,
      averageLevel: 1,
      averageGearScore: 1,
      pveScore: Math.max(0, Math.round((Number(candidate.pveScore) || 0) * 0.5)),
      raidProgress: 0,
      dungeonScore: Math.max(0, Math.round(Number(candidate.dungeonScore) || 0)),
    },
  ];
};

const getArchetypeGrowth = (archetype) => {
  switch (archetype) {
    case NPC_GUILD_ARCHETYPES.HARDCORE_RAIDERS:
      return { level: 0.38, gear: 0.5, raid: 2.4, pve: 16 };
    case NPC_GUILD_ARCHETYPES.DUNGEON_RUNNERS:
      return { level: 0.34, gear: 0.42, raid: 1, pve: 14 };
    case NPC_GUILD_ARCHETYPES.LEVELING_GUILD:
      return { level: 0.32, gear: 0.22, raid: 0.4, pve: 9 };
    case NPC_GUILD_ARCHETYPES.SOCIAL_GUILD:
      return { level: 0.18, gear: 0.18, raid: 0.2, pve: 5 };
    default:
      return { level: 0.24, gear: 0.25, raid: 0.5, pve: 7 };
  }
};

const advanceNpcGuildForDay = ({
  guild,
  random,
  dayIndex,
  dayFraction = 1,
}) => {
  const safeDayFraction = clampNumber(dayFraction, 0.05, 1);
  const growth = getArchetypeGrowth(guild.archetype);
  const activityMultiplier = clampNumber(guild.activityLevel, 1, 100) / 70;
  const variance = 0.75 + random() * 0.5;
  const averageLevel = clampNumber(
    guild.averageLevel + growth.level * activityMultiplier * variance * safeDayFraction,
    1,
    60,
  );
  const averageGearScore = Math.round(
    Math.max(
      0,
      guild.averageGearScore +
        growth.gear * activityMultiplier * variance * safeDayFraction,
    ),
  );
  const dungeonScore = Math.max(0, Math.round(Number(guild.dungeonScore) || 0));
  const canRaid = averageLevel >= 50;
  const raidGrowth = canRaid
    ? growth.raid * activityMultiplier * variance * safeDayFraction
    : growth.raid * 0.12 * safeDayFraction;
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
        growth.pve * activityMultiplier * variance * safeDayFraction +
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
  currentDayProgress = 0,
  playerGuildSnapshot,
  guildSetup,
} = {}) => {
  const safeCurrentDay = Math.max(0, Math.floor(Number(currentDayIndex) || 0));
  const safeCurrentStep = getRealmSimulationStepIndex(
    safeCurrentDay,
    currentDayProgress,
  );
  let nextRealm = ensureRealmState(realmState, guildSetup, safeCurrentDay);
  const fallbackLastStep = Math.max(
    0,
    Math.floor(Number(nextRealm.lastSimulatedDayIndex) || 0) *
      REALM_SIMULATION_STEPS_PER_DAY,
  );
  const lastSimulatedStep = Math.max(
    0,
    Number.isFinite(Number(nextRealm.lastSimulatedStepIndex))
      ? Math.floor(Number(nextRealm.lastSimulatedStepIndex))
      : fallbackLastStep,
  );

  if (safeCurrentStep <= lastSimulatedStep) {
    return nextRealm;
  }

  for (
    let simulatedStep = lastSimulatedStep + 1;
    simulatedStep <= safeCurrentStep;
    simulatedStep += 1
  ) {
    const day = getRealmSimulationDayForStep(simulatedStep);
    const dayStepIndex = (simulatedStep - 1) % REALM_SIMULATION_STEPS_PER_DAY;
    const dayFraction = REALM_SIMULATION_STEP_FRACTION;
    const isFullDayStep =
      simulatedStep % REALM_SIMULATION_STEPS_PER_DAY === 0;
    const random = createRandom(
      hashRealmSeed(`${nextRealm.id}:step:${simulatedStep}`),
    );
    const activeNpcGuilds =
      dayStepIndex === 0
        ? maybeFormNpcGuildForDay({
            realmState: nextRealm,
            npcGuilds: nextRealm.npcGuilds,
            playerGuildSnapshot,
            guildSetup,
            dayIndex: day,
            random,
          })
        : nextRealm.npcGuilds;
    const npcGuilds = activeNpcGuilds.map((guild) =>
      advanceNpcGuildForDay({
        guild,
        random,
        dayIndex: day,
        dayFraction,
      }),
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
      dayFraction,
      dayStepIndex,
      playerRosterSize: Math.max(0, Number(playerGuildSnapshot?.rosterSize) || 0),
      playerAverageLevel: playerGuildSnapshot?.averageLevel,
      serverPopulation: nextRealm.populationLabel,
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
      ageDays: isFullDayStep ? Math.max(nextRealm.ageDays + 1, day) : nextRealm.ageDays,
      npcGuilds: nextNpcGuilds,
      population: populationResult.population,
      news: capRealmNews([...dayNews, ...nextRealm.news]),
      lastSimulatedDayIndex: isFullDayStep
        ? Math.max(day, Number(nextRealm.lastSimulatedDayIndex) || 0)
        : Number(nextRealm.lastSimulatedDayIndex) || 0,
      lastSimulatedStepIndex: simulatedStep,
    };
  }

  return nextRealm;
};
