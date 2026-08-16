import {
  NPC_GUILD_ARCHETYPES,
  NPC_GUILD_ARCHETYPE_PROFILE,
  REALM_GUILD_ROSTER_CAP,
  REALM_MARKET_STATUS,
  REALM_NPC_GUILD_FOUNDED_ROSTER_RANGE,
  REALM_POPULATION_START,
  getRealmGuildDynamicsProfile,
  normalizeRealmGuildDensity,
  normalizeRealmGuildDynamics,
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

export const pickRealmGuildTarget = (
  realmId,
  serverPopulation,
  guildDensity = "medium",
) => {
  const { guildTargetRange } = getRealmPopulationProfile(
    serverPopulation,
    guildDensity,
  );
  const span = guildTargetRange[1] - guildTargetRange[0];
  return (
    guildTargetRange[0] +
    (hashRealmSeed(`${realmId}:${serverPopulation}:guild-target`) % (span + 1))
  );
};

const getRealmPopulationTotal = (realmState, playerGuildSnapshot) =>
  Math.max(0, Number(realmState?.population?.players?.length) || 0) +
  Math.max(0, Number(playerGuildSnapshot?.rosterSize) || 0);

export const getNpcGuildTargetRosterSize = (
  guild,
  guildDensity = "medium",
) => {
  const densityProfile = getRealmPopulationProfile(
    "Medium",
    guildDensity,
  );
  const range =
    NPC_GUILD_ARCHETYPE_PROFILE[guild?.archetype]?.rosterSize || [24, 40];
  const min = Math.max(
    6,
    Math.round(Number(range[0]) * densityProfile.rosterMultiplier),
  );
  const max = Math.min(
    REALM_GUILD_ROSTER_CAP,
    Math.max(min, Math.round(Number(range[1]) * densityProfile.rosterMultiplier)),
  );
  return Math.min(
    REALM_GUILD_ROSTER_CAP,
    min +
      (hashRealmSeed(`${guild?.id}:${guildDensity}:target-roster`) %
        (max - min + 1)),
  );
};

export const getDesiredRealmNpcGuildCount = ({
  realmId,
  serverPopulation,
  currentGuildCount,
  totalPopulation,
  guildDensity = "medium",
} = {}) => {
  const populationProfile = getRealmPopulationProfile(
    serverPopulation,
    guildDensity,
  );
  const targetGuildCount = pickRealmGuildTarget(
    realmId,
    populationProfile.populationLabel,
    guildDensity,
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
    populationProfile.guildInitialRange[0],
    Math.min(
      Math.max(0, Math.floor(Number(currentGuildCount) || 0)),
      populationProfile.guildInitialRange[1],
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
  guildDensity,
  guildDynamics,
}) => {
  const currentGuilds = Array.isArray(npcGuilds) ? npcGuilds : [];
  const density = normalizeRealmGuildDensity(guildDensity);
  const dynamics = normalizeRealmGuildDynamics(guildDynamics);
  const dynamicsProfile = getRealmGuildDynamicsProfile(dynamics);
  const populationProfile = getRealmPopulationProfile(
    realmState?.populationLabel,
    density,
  );
  const targetGuildCount = pickRealmGuildTarget(
    realmState?.id,
    populationProfile.populationLabel,
    density,
  );
  if (currentGuilds.length >= targetGuildCount) {
    return { npcGuilds: currentGuilds, event: null };
  }

  const totalPopulation = getRealmPopulationTotal(realmState, playerGuildSnapshot);
  const desiredGuildCount = getDesiredRealmNpcGuildCount({
    realmId: realmState?.id,
    serverPopulation: populationProfile.populationLabel,
    currentGuildCount: currentGuilds.length,
    totalPopulation,
    guildDensity: density,
  });

  const lastFounded = Number(realmState?.lastGuildFoundingDayIndex);
  if (
    currentGuilds.length >= desiredGuildCount ||
    (realmState?.lastGuildFoundingDayIndex != null &&
      Number.isFinite(lastFounded) &&
      dayIndex - lastFounded < dynamicsProfile.foundingIntervalDays)
  ) {
    return { npcGuilds: currentGuilds, event: null };
  }
  const populationPlayers = Array.isArray(realmState?.population?.players)
    ? realmState.population.players
    : [];
  const freeAgentRatio =
    populationPlayers.length > 0
      ? populationPlayers.filter((player) => !player.guildId).length /
        populationPlayers.length
      : 0;
  const guildShortfall = desiredGuildCount - currentGuilds.length;
  const guaranteed = guildShortfall >= 3 && freeAgentRatio > 0.3;
  if (!guaranteed && random() > dynamicsProfile.foundingChance) {
    return { npcGuilds: currentGuilds, event: null };
  }

  const realmName = realmState?.name || guildSetup?.server;
  const realmType = realmState?.type || guildSetup?.serverStyle;
  const generated = generateNpcGuilds({
    realmName,
    realmType,
    count: 40,
    guildDensity: density,
    contentPhase: realmState?.contentPhase || guildSetup?.contentPhase,
  });
  const usedNames = new Set(currentGuilds.map((guild) => guild.name));
  const archetypeWeight = {
    [NPC_GUILD_ARCHETYPES.HARDCORE_RAIDERS]: 0.1,
    [NPC_GUILD_ARCHETYPES.CASUAL_ADVENTURERS]: 0.2,
    [NPC_GUILD_ARCHETYPES.DUNGEON_RUNNERS]: 0.2,
    [NPC_GUILD_ARCHETYPES.LEVELING_GUILD]: 0.25,
    [NPC_GUILD_ARCHETYPES.SOCIAL_GUILD]: 0.25,
  };
  const archetypeCounts = currentGuilds.reduce(
    (counts, guild) => ({
      ...counts,
      [guild.archetype]: (counts[guild.archetype] || 0) + 1,
    }),
    {},
  );
  const factionCounts = currentGuilds.reduce(
    (counts, guild) => ({
      ...counts,
      [guild.faction]: (counts[guild.faction] || 0) + 1,
    }),
    {},
  );
  const candidate = generated
    .filter((guild) => !usedNames.has(guild.name))
    .sort((left, right) => {
      const leftRepresentation =
        (archetypeCounts[left.archetype] || 0) /
        (archetypeWeight[left.archetype] || 0.2);
      const rightRepresentation =
        (archetypeCounts[right.archetype] || 0) /
        (archetypeWeight[right.archetype] || 0.2);
      return (
        leftRepresentation - rightRepresentation ||
        (factionCounts[left.faction] || 0) -
          (factionCounts[right.faction] || 0) ||
        String(left.id).localeCompare(String(right.id))
      );
    })[0];
  if (!candidate) return { npcGuilds: currentGuilds, event: null };
  const foundedRosterSize = pickFoundedGuildRosterSize({
    realmId: realmState?.id,
    guildId: candidate.id,
    random,
  });

  const foundedGuild = {
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
    };
  return {
    npcGuilds: [...currentGuilds, foundedGuild],
    event: {
      type: "npc-guild-founded",
      guildName: foundedGuild.name,
      count: foundedRosterSize,
      message: `${foundedGuild.name} was founded as a ${foundedGuild.archetype} guild and is recruiting ${foundedRosterSize} founding members.`,
    },
    lastGuildFoundingDayIndex: dayIndex,
  };
};

const getGuildStructureStability = (guild) => {
  const targetSize = Math.max(1, Number(guild?.targetRosterSize) || 1);
  const rosterSize = Array.isArray(guild?.roster)
    ? guild.roster.length
    : Number(guild?.rosterSize) || 0;
  const fillScore = Math.min(100, (rosterSize / targetSize) * 100);
  return (
    (Number(guild?.activityLevel) || 50) * 0.4 +
    (Number(guild?.reputation) || 50) * 0.35 +
    fillScore * 0.25
  );
};

const getMergedGuildArchetype = (players) => {
  const traitCounts = new Map();
  (Array.isArray(players) ? players : []).forEach((player) => {
    (Array.isArray(player?.personalityTraits)
      ? player.personalityTraits
      : []
    ).forEach((trait) => {
      const id = typeof trait === "string" ? trait : trait?.id;
      if (id) traitCounts.set(id, (traitCounts.get(id) || 0) + 1);
    });
  });
  const mappings = [
    ["raider", NPC_GUILD_ARCHETYPES.HARDCORE_RAIDERS],
    ["dungeon_expert", NPC_GUILD_ARCHETYPES.DUNGEON_RUNNERS],
    ["power_leveler", NPC_GUILD_ARCHETYPES.LEVELING_GUILD],
    ["casual_gamer", NPC_GUILD_ARCHETYPES.SOCIAL_GUILD],
  ];
  return mappings
    .sort(
      (left, right) =>
        (traitCounts.get(right[0]) || 0) - (traitCounts.get(left[0]) || 0),
    )[0]?.[1] || NPC_GUILD_ARCHETYPES.CASUAL_ADVENTURERS;
};

export const advanceNpcGuildStructureForDay = ({
  realmState,
  npcGuilds,
  population,
  dayIndex,
  guildDensity = "medium",
  guildDynamics = "medium",
}) => {
  const dynamicsProfile = getRealmGuildDynamicsProfile(guildDynamics);
  const players = Array.isArray(population?.players)
    ? population.players
    : [];
  let guilds = (Array.isArray(npcGuilds) ? npcGuilds : []).map((guild) => {
    const rosterSize = players.filter(
      (player) => String(player.guildId || "") === String(guild.id),
    ).length;
    const targetSize = Math.max(1, Number(guild.targetRosterSize) || 1);
    const isWeak =
      getGuildStructureStability({ ...guild, rosterSize }) < 40 &&
      rosterSize < targetSize * 0.4;
    return {
      ...guild,
      understrengthSinceDayIndex: isWeak
        ? guild.understrengthSinceDayIndex != null &&
          Number.isFinite(Number(guild.understrengthSinceDayIndex))
          ? Number(guild.understrengthSinceDayIndex)
          : dayIndex
        : null,
    };
  });
  const lastEventDay = Number(realmState?.lastGuildStructureEventDayIndex);
  if (
    realmState?.lastGuildStructureEventDayIndex != null &&
    Number.isFinite(lastEventDay) &&
    dayIndex - lastEventDay < dynamicsProfile.structureCooldownDays
  ) {
    return { npcGuilds: guilds, population, event: null };
  }
  const eligible = guilds
    .filter((guild) => {
      const weakSince =
        guild.understrengthSinceDayIndex != null
          ? Number(guild.understrengthSinceDayIndex)
          : Number.NaN;
      return (
        dayIndex - (Number(guild.foundedAtDayIndex) || 0) >= 14 &&
        Number.isFinite(weakSince) &&
        dayIndex - weakSince >= dynamicsProfile.fusionWeakDays
      );
    })
    .sort(
      (left, right) =>
        getGuildStructureStability(left) -
          getGuildStructureStability(right) ||
        String(left.id).localeCompare(String(right.id)),
    );
  const weakGuild = eligible[0];
  if (!weakGuild) return { npcGuilds: guilds, population, event: null };

  const weakMembers = players.filter(
    (player) => String(player.guildId || "") === String(weakGuild.id),
  );
  const takeover = guilds
    .filter((candidate) => {
      if (
        candidate.id === weakGuild.id ||
        candidate.faction !== weakGuild.faction
      ) return false;
      const candidateMembers = players.filter(
        (player) => String(player.guildId || "") === String(candidate.id),
      );
      return (
        candidateMembers.length >= weakMembers.length * 1.5 &&
        getGuildStructureStability(candidate) >=
          getGuildStructureStability(weakGuild) + 20 &&
        candidateMembers.length + weakMembers.length <= REALM_GUILD_ROSTER_CAP
      );
    })
    .sort(
      (left, right) =>
        getGuildStructureStability(right) -
        getGuildStructureStability(left),
    )[0];
  if (takeover) {
    const nextPlayers = players.map((player) =>
      String(player.guildId || "") === String(weakGuild.id)
        ? {
            ...player,
            guildId: takeover.id,
            sourceGuildName: takeover.name,
            loyalty: Math.max(45, Number(player.loyalty) || 0),
            marketStatus: REALM_MARKET_STATUS.GUILDED,
          }
        : player,
    );
    guilds = guilds.filter((guild) => guild.id !== weakGuild.id);
    return {
      npcGuilds: guilds,
      population: { ...population, players: nextPlayers },
      lastGuildStructureEventDayIndex: dayIndex,
      event: {
        type: "npc-guild-acquisition",
        guildName: takeover.name,
        count: weakMembers.length,
        message: `${takeover.name} acquired ${weakGuild.name}, bringing ${weakMembers.length} members into its roster.`,
      },
    };
  }

  const mergerPartner = eligible.find((candidate) => {
    if (
      candidate.id === weakGuild.id ||
      candidate.faction !== weakGuild.faction
    ) return false;
    const candidateMembers = players.filter(
      (player) => String(player.guildId || "") === String(candidate.id),
    );
    return (
      candidateMembers.length <
        Math.max(1, Number(candidate.targetRosterSize)) * 0.6 &&
      Math.abs(
        getGuildStructureStability(candidate) -
          getGuildStructureStability(weakGuild),
      ) < 20 &&
      candidateMembers.length + weakMembers.length <= REALM_GUILD_ROSTER_CAP
    );
  });
  if (mergerPartner) {
    const partnerMembers = players.filter(
      (player) => String(player.guildId || "") === String(mergerPartner.id),
    );
    const combinedMembers = [...weakMembers, ...partnerMembers];
    const archetype = getMergedGuildArchetype(combinedMembers);
    const generated = generateNpcGuilds({
      realmName: realmState?.name,
      realmType: realmState?.type,
      count: 40,
      guildDensity,
      contentPhase: realmState?.contentPhase,
    });
    const usedNames = new Set(guilds.map((guild) => guild.name));
    const template =
      generated.find((guild) => !usedNames.has(guild.name)) || generated[0];
    const mergedId = `npc:merged:${hashRealmSeed(
      `${realmState?.id}:${dayIndex}:${weakGuild.id}:${mergerPartner.id}`,
    ).toString(36)}`;
    const targetRange = NPC_GUILD_ARCHETYPE_PROFILE[archetype].rosterSize;
    const densityMultiplier = getRealmPopulationProfile(
      realmState?.populationLabel,
      guildDensity,
    ).rosterMultiplier;
    const targetRosterSize = Math.min(
      REALM_GUILD_ROSTER_CAP,
      Math.max(
        combinedMembers.length,
        Math.round(
          ((Number(targetRange[0]) + Number(targetRange[1])) / 2) *
            densityMultiplier,
        ),
      ),
    );
    const mergedGuild = {
      ...template,
      id: mergedId,
      archetype,
      faction: weakGuild.faction,
      roster: [],
      rosterSize: combinedMembers.length,
      targetRosterSize,
      foundedAtDayIndex: dayIndex,
      understrengthSinceDayIndex: null,
      activityLevel: Math.round(
        ((Number(weakGuild.activityLevel) || 50) +
          (Number(mergerPartner.activityLevel) || 50)) /
          2,
      ),
      reputation: Math.round(
        ((Number(weakGuild.reputation) || 50) +
          (Number(mergerPartner.reputation) || 50)) /
          2,
      ),
    };
    const mergedIds = new Set([String(weakGuild.id), String(mergerPartner.id)]);
    const nextPlayers = players.map((player) =>
      mergedIds.has(String(player.guildId || ""))
        ? {
            ...player,
            guildId: mergedId,
            sourceGuildName: mergedGuild.name,
            loyalty: Math.max(45, Number(player.loyalty) || 0),
            marketStatus: REALM_MARKET_STATUS.GUILDED,
          }
        : player,
    );
    guilds = [
      ...guilds.filter((guild) => !mergedIds.has(String(guild.id))),
      mergedGuild,
    ];
    return {
      npcGuilds: guilds,
      population: { ...population, players: nextPlayers },
      lastGuildStructureEventDayIndex: dayIndex,
      event: {
        type: "npc-guild-merger",
        guildName: mergedGuild.name,
        count: combinedMembers.length,
        message: `${weakGuild.name} and ${mergerPartner.name} merged to form ${mergedGuild.name} with ${combinedMembers.length} members.`,
      },
    };
  }

  const weakDays =
    dayIndex -
    Number(
      weakGuild.understrengthSinceDayIndex != null
        ? weakGuild.understrengthSinceDayIndex
        : dayIndex,
    );
  const sameFactionCount = guilds.filter(
    (guild) => guild.faction === weakGuild.faction,
  ).length;
  if (
    weakDays >= dynamicsProfile.dissolutionWeakDays &&
    guilds.length > 5 &&
    sameFactionCount > 2
  ) {
    const nextPlayers = players.map((player) =>
      String(player.guildId || "") === String(weakGuild.id)
        ? {
            ...player,
            guildId: null,
            sourceGuildName: weakGuild.name,
            loyalty: Math.max(40, Number(player.loyalty) || 0),
            marketStatus: REALM_MARKET_STATUS.FREE_AGENT,
          }
        : player,
    );
    return {
      npcGuilds: guilds.filter((guild) => guild.id !== weakGuild.id),
      population: { ...population, players: nextPlayers },
      lastGuildStructureEventDayIndex: dayIndex,
      event: {
        type: "npc-guild-dissolution",
        guildName: weakGuild.name,
        count: weakMembers.length,
        message: `${weakGuild.name} disbanded, leaving ${weakMembers.length} members looking for new guilds.`,
      },
    };
  }
  return { npcGuilds: guilds, population, event: null };
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
  gameSettings = {},
} = {}) => {
  const guildDensity = normalizeRealmGuildDensity(
    gameSettings?.realmGuildDensity || realmState?.guildDensity,
  );
  const guildDynamics = normalizeRealmGuildDynamics(
    gameSettings?.realmGuildDynamics || realmState?.guildDynamics,
  );
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
    : ensureRealmState(
        realmState,
        guildSetup,
        safeCurrentDay,
        Math.max(0, Number(playerGuildSnapshot?.rosterSize) || 0),
        { realmGuildDensity: guildDensity, realmGuildDynamics: guildDynamics },
      );
  nextRealm = {
    ...nextRealm,
    guildDensity,
    guildDynamics,
    npcGuilds: nextRealm.npcGuilds.map((guild) => ({
      ...guild,
      targetRosterSize: getNpcGuildTargetRosterSize(guild, guildDensity),
    })),
  };
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
      const foundingResult =
        activityStepIndex === 0
          ? maybeFormNpcGuildForDay({
              realmState: { ...nextRealm, population: nextPopulation },
              npcGuilds: nextNpcGuilds,
              playerGuildSnapshot,
              guildSetup,
              dayIndex: day,
              random,
              guildDensity,
              guildDynamics,
            })
          : { npcGuilds: nextNpcGuilds, event: null };
      let activeNpcGuilds = foundingResult.npcGuilds;
      let structureEvents = foundingResult.event
        ? [foundingResult.event]
        : [];
      if (activityStepIndex === 0) {
        const structureResult = advanceNpcGuildStructureForDay({
          realmState: {
            ...nextRealm,
            population: nextPopulation,
          },
          npcGuilds: activeNpcGuilds,
          population: nextPopulation,
          dayIndex: day,
          guildDensity,
          guildDynamics,
        });
        activeNpcGuilds = structureResult.npcGuilds;
        nextPopulation = structureResult.population;
        if (structureResult.event) structureEvents.push(structureResult.event);
        if (
          Number.isFinite(
            Number(structureResult.lastGuildStructureEventDayIndex),
          )
        ) {
          nextRealm = {
            ...nextRealm,
            lastGuildStructureEventDayIndex:
              structureResult.lastGuildStructureEventDayIndex,
          };
        }
        if (
          Number.isFinite(Number(foundingResult.lastGuildFoundingDayIndex))
        ) {
          nextRealm = {
            ...nextRealm,
            lastGuildFoundingDayIndex:
              foundingResult.lastGuildFoundingDayIndex,
          };
        }
      }
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
        guildDensity,
        guildDynamics,
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
        realmEvents: [
          ...structureEvents,
          ...realmEvents,
          ...activityResult.events,
        ],
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
      guildDensity,
      guildDynamics,
      desiredGuildCount: getDesiredRealmNpcGuildCount({
        realmId: nextRealm.id,
        serverPopulation: nextRealm.populationLabel,
        currentGuildCount: nextNpcGuilds.length,
        totalPopulation: getRealmPopulationTotal(
          { ...nextRealm, population: nextPopulation },
          playerGuildSnapshot,
        ),
        guildDensity,
      }),
    };
  }

  return nextRealm;
};
