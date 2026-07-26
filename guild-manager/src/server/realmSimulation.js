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
import {
  advanceRealmPopulationActivity,
  advanceRealmPopulationProgression,
} from "./realmPopulation";
import {
  advanceNpcRaidProgressForDay,
  getRealmRaidBossesCleared,
} from "./realmRaidProgress";
import { buildRealmRankings } from "./realmRankings";
import { getRealmDifficultyProfile } from "../constants";
import { buildOnlineSnapshot } from "../activity/characterOnline";

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

export const getDesiredRealmNpcGuildCount = ({
  realmId,
  serverPopulation,
  currentGuildCount,
  totalPopulation,
} = {}) => {
  const populationProfile = getRealmPopulationProfile(serverPopulation);
  const targetGuildCount = pickRealmGuildTarget(
    realmId,
    populationProfile.populationLabel,
  );
  const growthSpan = Math.max(
    1,
    populationProfile.softCap - REALM_POPULATION_START,
  );
  const populationProgress = clampNumber(
    (Math.max(0, Number(totalPopulation) || 0) - REALM_POPULATION_START) /
      growthSpan,
    0,
    1,
  );
  const initialGuildCount = Math.max(
    REALM_NPC_GUILD_INITIAL_RANGE[0],
    Math.min(
      Math.max(0, Math.floor(Number(currentGuildCount) || 0)),
      REALM_NPC_GUILD_INITIAL_RANGE[1],
    ),
  );

  return Math.min(
    targetGuildCount,
    initialGuildCount +
      Math.floor(
        (targetGuildCount - initialGuildCount) * populationProgress,
      ),
  );
};

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

const REALM_SIMULATION_STEPS_PER_DAY = 20;
const REALM_SIMULATION_STEP_FRACTION = 1 / REALM_SIMULATION_STEPS_PER_DAY;
const REALM_ACTIVITY_STEPS_PER_DAY = 4;
const REALM_ACTIVITY_STEP_INTERVAL =
  REALM_SIMULATION_STEPS_PER_DAY / REALM_ACTIVITY_STEPS_PER_DAY;
const REALM_ACTIVITY_STEP_FRACTION = 1 / REALM_ACTIVITY_STEPS_PER_DAY;

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

const convertSimulationStepIndex = (stepIndex, sourceStepsPerDay) => {
  const safeStep = Math.max(0, Math.floor(Number(stepIndex) || 0));
  const safeSourceSteps = Math.max(1, Math.floor(Number(sourceStepsPerDay) || 1));
  if (safeSourceSteps === REALM_SIMULATION_STEPS_PER_DAY) return safeStep;
  const completeDays = Math.floor(safeStep / safeSourceSteps);
  const partialSteps = safeStep % safeSourceSteps;
  return (
    completeDays * REALM_SIMULATION_STEPS_PER_DAY +
    Math.floor(
      (partialSteps / safeSourceSteps) * REALM_SIMULATION_STEPS_PER_DAY,
    )
  );
};

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
  const desiredGuildCount = getDesiredRealmNpcGuildCount({
    realmId: realmState?.id,
    serverPopulation: populationProfile.populationLabel,
    currentGuildCount: currentGuilds.length,
    totalPopulation,
  });

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
      raidProgress: 0,
      dungeonScore: Math.max(0, Math.round(Number(candidate.dungeonScore) || 0)),
    },
  ];
};

const getArchetypeGrowth = (archetype) => {
  switch (archetype) {
    case NPC_GUILD_ARCHETYPES.HARDCORE_RAIDERS:
      return { raid: 2.4 };
    case NPC_GUILD_ARCHETYPES.DUNGEON_RUNNERS:
      return { raid: 1 };
    case NPC_GUILD_ARCHETYPES.LEVELING_GUILD:
      return { raid: 0.4 };
    case NPC_GUILD_ARCHETYPES.SOCIAL_GUILD:
      return { raid: 0.2 };
    default:
      return { raid: 0.5 };
  }
};

const advanceNpcGuildActivity = ({
  guild,
  random,
  dayIndex,
  raidRateMultiplier = 1,
  onlineRatio = 1,
}) => {
  const growth = getArchetypeGrowth(guild.archetype);
  const activityMultiplier = clampNumber(guild.activityLevel, 1, 100) / 70;
  const variance = 0.75 + random() * 0.5;
  const canRaid = Number(guild.averageLevel) >= 50;
  const raidGrowth = canRaid
    ? growth.raid *
      activityMultiplier *
      variance *
      REALM_ACTIVITY_STEP_FRACTION *
      clampNumber(onlineRatio, 0, 1) *
      Math.max(0, Number(raidRateMultiplier) || 0)
    : growth.raid *
      0.12 *
      REALM_ACTIVITY_STEP_FRACTION *
      clampNumber(onlineRatio, 0, 1) *
      Math.max(0, Number(raidRateMultiplier) || 0);
  const raidUpdate = advanceNpcRaidProgressForDay({
    guild,
    dayIndex,
    random,
    raidGrowth,
  });
  const raidProgress = Math.round(
    getRealmRaidBossesCleared({ raidProgressByRaid: raidUpdate.raidProgressByRaid }) * 4 +
      Math.max(0, guild.raidProgress + raidGrowth * 0.35),
  );

  return {
    ...guild,
    raidProgress,
    raidProgressByRaid: raidUpdate.raidProgressByRaid,
    realmEvents: raidUpdate.events,
  };
};

export const advanceRealmSimulation = ({
  realmState,
  currentDayIndex,
  currentDayProgress = 0,
  playerGuildSnapshot,
  guildSetup,
  offlineSimulationEnabled = true,
} = {}) => {
  const safeCurrentDay = Math.max(0, Math.floor(Number(currentDayIndex) || 0));
  const safeCurrentStep = getRealmSimulationStepIndex(
    safeCurrentDay,
    currentDayProgress,
  );
  const hasCurrentNormalizedRealm =
    Number(realmState?.simulationStepsPerDay) ===
      REALM_SIMULATION_STEPS_PER_DAY &&
    Array.isArray(realmState?.npcGuilds) &&
    Array.isArray(realmState?.population?.players);
  let nextRealm = hasCurrentNormalizedRealm
    ? realmState
    : ensureRealmState(realmState, guildSetup, safeCurrentDay);
  const fallbackLastStep = Math.max(
    0,
    Math.floor(Number(nextRealm.lastSimulatedDayIndex) || 0) *
      REALM_SIMULATION_STEPS_PER_DAY,
  );
  const rawLastSimulatedStep = Math.max(
    0,
    Number.isFinite(Number(nextRealm.lastSimulatedStepIndex))
      ? Math.floor(Number(nextRealm.lastSimulatedStepIndex))
      : fallbackLastStep,
  );
  const lastSimulatedStep = convertSimulationStepIndex(
    rawLastSimulatedStep,
    nextRealm.simulationStepsPerDay || REALM_SIMULATION_STEPS_PER_DAY,
  );
  const difficultyProfile = getRealmDifficultyProfile(
    guildSetup?.realmDifficulty,
  );

  if (safeCurrentStep <= lastSimulatedStep) {
    return {
      ...nextRealm,
      lastSimulatedStepIndex: lastSimulatedStep,
      simulationStepsPerDay: REALM_SIMULATION_STEPS_PER_DAY,
    };
  }

  for (
    let simulatedStep = lastSimulatedStep + 1;
    simulatedStep <= safeCurrentStep;
    simulatedStep += 1
  ) {
    const day = getRealmSimulationDayForStep(simulatedStep);
    const isActivityStep =
      simulatedStep % REALM_ACTIVITY_STEP_INTERVAL === 0;
    const activityStepIndex = isActivityStep
      ? (simulatedStep / REALM_ACTIVITY_STEP_INTERVAL - 1) %
        REALM_ACTIVITY_STEPS_PER_DAY
      : null;
    const isFullDayStep =
      simulatedStep % REALM_SIMULATION_STEPS_PER_DAY === 0;
    const random = createRandom(
      hashRealmSeed(`${nextRealm.id}:step:${simulatedStep}`),
    );
    const simulatedDayProgress =
      (simulatedStep % REALM_SIMULATION_STEPS_PER_DAY) /
      REALM_SIMULATION_STEPS_PER_DAY;
    const realmOnlineSnapshot = buildOnlineSnapshot({
      characters: nextRealm.population.players,
      dayIndex: day,
      dayProgress: simulatedDayProgress,
      offlineSimulationEnabled,
    });
    const progressionResult = advanceRealmPopulationProgression({
      realmState: nextRealm,
      npcGuilds: nextRealm.npcGuilds,
      dayIndex: day,
      dayFraction: REALM_SIMULATION_STEP_FRACTION,
      playerRosterSize: Math.max(0, Number(playerGuildSnapshot?.rosterSize) || 0),
      playerAverageLevel: playerGuildSnapshot?.averageLevel,
      playerAverageItemLevel: playerGuildSnapshot?.averageGearScore,
      serverPopulation: nextRealm.populationLabel,
      difficultyProfile,
      random,
      onlinePlayerIds: realmOnlineSnapshot.onlineIds,
    });
    let nextNpcGuilds = progressionResult.npcGuilds;
    let nextPopulation = progressionResult.population;
    let nextNews = nextRealm.news;

    if (isActivityStep) {
      const activeNpcGuilds =
        activityStepIndex === 0
          ? maybeFormNpcGuildForDay({
              realmState: { ...nextRealm, population: nextPopulation },
              npcGuilds: nextNpcGuilds,
              playerGuildSnapshot,
              guildSetup,
              dayIndex: day,
              random,
            })
          : nextNpcGuilds;
      const npcGuildsWithEvents = activeNpcGuilds.map((guild) =>
        {
          const guildPlayers = nextPopulation.players.filter(
            (player) => String(player.guildId || "") === String(guild.id),
          );
          const onlineCount = guildPlayers.filter((player) =>
            realmOnlineSnapshot.onlineIds.has(String(player.id)),
          ).length;
          return advanceNpcGuildActivity({
            guild,
            random,
            dayIndex: day,
            raidRateMultiplier: difficultyProfile.raidRateMultiplier,
            onlineRatio:
              guildPlayers.length > 0 ? onlineCount / guildPlayers.length : 0,
          });
        },
      );
      const realmEvents = npcGuildsWithEvents.flatMap((guild) =>
        Array.isArray(guild.realmEvents) ? guild.realmEvents : [],
      );
      const npcGuildsWithoutEvents = npcGuildsWithEvents.map((guild) => {
        const { realmEvents: guildEvents, ...guildWithoutEvents } = guild;
        void guildEvents;
        return guildWithoutEvents;
      });
      const activityResult = advanceRealmPopulationActivity({
        realmState: { ...nextRealm, population: nextPopulation },
        npcGuilds: npcGuildsWithoutEvents,
        dayIndex: day,
        dayFraction: REALM_ACTIVITY_STEP_FRACTION,
        dayStepIndex: activityStepIndex,
        playerRosterSize: Math.max(
          0,
          Number(playerGuildSnapshot?.rosterSize) || 0,
        ),
        serverPopulation: nextRealm.populationLabel,
        guildFaction: guildSetup?.faction,
        difficultyProfile,
        random,
        onlinePlayerIds: realmOnlineSnapshot.onlineIds,
      });
      nextNpcGuilds = activityResult.npcGuilds;
      nextPopulation = activityResult.population;
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
        realmEvents: [...realmEvents, ...activityResult.events],
      });
      nextNews = capRealmNews([...dayNews, ...nextRealm.news]);
    }

    nextRealm = {
      ...nextRealm,
      ageDays: isFullDayStep ? Math.max(nextRealm.ageDays + 1, day) : nextRealm.ageDays,
      npcGuilds: nextNpcGuilds,
      population: nextPopulation,
      news: nextNews,
      lastSimulatedDayIndex: isFullDayStep
        ? Math.max(day, Number(nextRealm.lastSimulatedDayIndex) || 0)
        : Number(nextRealm.lastSimulatedDayIndex) || 0,
      lastSimulatedStepIndex: simulatedStep,
      simulationStepsPerDay: REALM_SIMULATION_STEPS_PER_DAY,
    };
  }

  return nextRealm;
};
