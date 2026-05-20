import {
  DEFAULT_NPC_GUILD_COUNT,
  NPC_GUILD_ARCHETYPE_ORDER,
  NPC_GUILD_ARCHETYPE_PROFILE,
  NPC_GUILD_NAME_POOL,
  REALM_NPC_GUILD_INITIAL_RANGE,
  REALM_FACTION_ORDER,
  REALM_TYPES,
  getRealmPopulationProfile,
} from "./realmDefinitions";
import { capRealmNews } from "./realmNews";
import {
  createNpcRaidProgressFromScore,
  normalizeRealmRaidProgress,
} from "./realmRaidProgress";
import { normalizeRealmPopulation } from "./realmPopulation";
import {
  generateNpcGuildRoster,
  getRealmMaxLevelCount,
  getRealmRosterCap,
  normalizeRealmGuildRoster,
} from "./realmRosters";
import {
  DEFAULT_GUILD_SETUP,
  GUILD_SERVER_POPULATION,
  GUILD_SERVER_OPTIONS,
  GUILD_SERVER_STYLE,
} from "../constants";

export const hashRealmSeed = (value) => {
  const input = String(value || "realm");
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state + 0x6d2b79f5, 1);
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const pickNumber = (random, [min, max]) =>
  Math.round(min + random() * (max - min));

const clampNumber = (value, min, max) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const pickRangeCount = (random, [min, max]) =>
  Math.max(min, Math.round(min + random() * (max - min)));

const normalizeRealmType = (type) =>
  type === REALM_TYPES.PVP || type === GUILD_SERVER_STYLE.PVP
    ? REALM_TYPES.PVP
    : REALM_TYPES.PVE;

const getRealmNameFromSetup = (guildSetup) =>
  String(guildSetup?.server || DEFAULT_GUILD_SETUP.server || "Everlook").trim();

const getRealmTypeFromSetup = (guildSetup) =>
  normalizeRealmType(guildSetup?.serverStyle || DEFAULT_GUILD_SETUP.serverStyle);

const getRealmPopulationFromSetup = (guildSetup) =>
  guildSetup?.serverPopulation === GUILD_SERVER_POPULATION.HIGH ||
  GUILD_SERVER_OPTIONS.find((option) => option.value === guildSetup?.server)
    ?.population === GUILD_SERVER_POPULATION.HIGH
    ? GUILD_SERVER_POPULATION.HIGH
    : GUILD_SERVER_POPULATION.MEDIUM;

export const generateNpcGuilds = ({
  realmName = DEFAULT_GUILD_SETUP.server,
  realmType = REALM_TYPES.PVE,
  count,
} = {}) => {
  const random = createRandom(hashRealmSeed(`${realmName}:${realmType}:guilds`));
  const names = [...NPC_GUILD_NAME_POOL];
  const usedNameKeys = new Set();
  const guildCount = Math.max(
    1,
    Math.floor(
      Number.isFinite(Number(count))
        ? Number(count)
        : pickRangeCount(random, REALM_NPC_GUILD_INITIAL_RANGE),
    ),
  );

  return Array.from({ length: guildCount }, (_, index) => {
    const nameIndex = Math.floor(random() * names.length) % names.length;
    const name = names.splice(nameIndex, 1)[0] || `Realm Guild ${index + 1}`;
    const archetype =
      NPC_GUILD_ARCHETYPE_ORDER[index % NPC_GUILD_ARCHETYPE_ORDER.length];
    const profile = NPC_GUILD_ARCHETYPE_PROFILE[archetype];
    const faction = REALM_FACTION_ORDER[index % REALM_FACTION_ORDER.length];
    const activityLevel = pickNumber(random, profile.activityLevel);
    const averageLevel = pickNumber(random, profile.averageLevel);
    const averageGearScore = pickNumber(random, profile.averageGearScore);
    const dungeonScore = pickNumber(random, profile.dungeonScore);
    const raidProgress = pickNumber(random, profile.raidProgress);
    const pveScore = pickNumber(random, profile.pveScore) + Math.round(activityLevel * 2);
    const id = `npc:${hashRealmSeed(`${realmName}:${name}`).toString(36)}`;
    const rosterSize = pickNumber(random, profile.rosterSize);
    const guildRoster = generateNpcGuildRoster({
      guildId: id,
      guildName: name,
      faction,
      rosterSize,
      averageLevel,
      averageGearScore,
      archetype,
      random,
      usedNameKeys,
    });
    const raidProgressByRaid = createNpcRaidProgressFromScore({
      raidProgress,
      averageLevel,
      archetype,
      random,
    });

    return {
      id,
      name,
      faction,
      archetype,
      rosterSize,
      maxLevelCount: getRealmMaxLevelCount(guildRoster),
      roster: guildRoster,
      averageLevel,
      averageGearScore,
      activityLevel,
      pveScore,
      raidProgress,
      raidProgressByRaid,
      dungeonScore,
      dungeonRunCount: 0,
      dungeonClearCount: 0,
      dungeonWipeCount: 0,
      clearedDungeonMissions: [],
      reputation: pickNumber(random, profile.reputation),
    };
  });
};

export const normalizeNpcGuild = (guild, fallbackGuild) => {
  const archetype = NPC_GUILD_ARCHETYPE_ORDER.includes(guild?.archetype)
    ? guild.archetype
    : fallbackGuild?.archetype || NPC_GUILD_ARCHETYPE_ORDER[0];
  const roster = normalizeRealmGuildRoster(guild?.roster, fallbackGuild?.roster);
  return {
    ...fallbackGuild,
    ...guild,
    id: String(guild?.id || fallbackGuild?.id || "").trim(),
    name: String(guild?.name || fallbackGuild?.name || "Realm Guild").trim(),
    faction: REALM_FACTION_ORDER.includes(guild?.faction)
      ? guild.faction
      : fallbackGuild?.faction || REALM_FACTION_ORDER[0],
    archetype,
    rosterSize: Math.min(
      getRealmRosterCap(),
      Math.max(
        roster.length,
        Math.round(Number(guild?.rosterSize) || fallbackGuild?.rosterSize || 1),
      ),
    ),
    maxLevelCount: getRealmMaxLevelCount(roster),
    roster,
    averageLevel: clampNumber(guild?.averageLevel ?? fallbackGuild?.averageLevel, 1, 60),
    averageGearScore: Math.max(0, Math.round(Number(guild?.averageGearScore ?? fallbackGuild?.averageGearScore) || 0)),
    activityLevel: clampNumber(guild?.activityLevel ?? fallbackGuild?.activityLevel, 1, 100),
    pveScore: Math.max(0, Math.round(Number(guild?.pveScore ?? fallbackGuild?.pveScore) || 0)),
    raidProgress: Math.max(0, Math.round(Number(guild?.raidProgress ?? fallbackGuild?.raidProgress) || 0)),
    raidProgressByRaid: normalizeRealmRaidProgress(
      guild?.raidProgressByRaid ||
        fallbackGuild?.raidProgressByRaid ||
        createNpcRaidProgressFromScore({
          raidProgress: guild?.raidProgress ?? fallbackGuild?.raidProgress,
          averageLevel: guild?.averageLevel ?? fallbackGuild?.averageLevel,
          archetype,
        }),
    ),
    dungeonScore: Math.max(0, Math.round(Number(guild?.dungeonScore ?? fallbackGuild?.dungeonScore) || 0)),
    dungeonRunCount: Math.max(0, Math.round(Number(guild?.dungeonRunCount ?? fallbackGuild?.dungeonRunCount) || 0)),
    dungeonClearCount: Math.max(0, Math.round(Number(guild?.dungeonClearCount ?? fallbackGuild?.dungeonClearCount) || 0)),
    dungeonWipeCount: Math.max(0, Math.round(Number(guild?.dungeonWipeCount ?? fallbackGuild?.dungeonWipeCount) || 0)),
    clearedDungeonMissions: (Array.isArray(guild?.clearedDungeonMissions)
      ? guild.clearedDungeonMissions
      : Array.isArray(fallbackGuild?.clearedDungeonMissions)
        ? fallbackGuild.clearedDungeonMissions
        : []
    ).slice(-40),
    reputation: clampNumber(guild?.reputation ?? fallbackGuild?.reputation, 1, 100),
  };
};

export const ensureRealmState = (
  existingRealmState,
  guildSetup = DEFAULT_GUILD_SETUP,
  currentDayIndex = 0,
  playerRosterSize = 0,
) => {
  const realmName = getRealmNameFromSetup(guildSetup);
  const realmType = getRealmTypeFromSetup(guildSetup);
  const realmPopulation = getRealmPopulationFromSetup(guildSetup);
  const populationProfile = getRealmPopulationProfile(realmPopulation);
  const safeCurrentDay = Math.max(0, Math.floor(Number(currentDayIndex) || 0));
  const generatedGuilds = generateNpcGuilds({
    realmName,
    realmType,
    count: DEFAULT_NPC_GUILD_COUNT,
  });
  const safe = existingRealmState && typeof existingRealmState === "object"
    ? existingRealmState
    : {};
  const hasExistingState =
    Array.isArray(safe.npcGuilds) && safe.npcGuilds.length > 0;
  const npcGuilds = hasExistingState
    ? safe.npcGuilds
        .map((guild, index) => normalizeNpcGuild(guild, generatedGuilds[index]))
        .slice(0, populationProfile.guildTargetRange[1])
    : generatedGuilds;
  const realmId =
    String(safe.id || "").trim() ||
    `realm:${hashRealmSeed(`${realmName}:${realmType}`).toString(36)}`;
  const population = normalizeRealmPopulation({
    population: safe.population,
    realmId,
    npcGuilds,
    currentDayIndex: safeCurrentDay,
    playerRosterSize,
    serverPopulation: realmPopulation,
  });

  return {
    id: realmId,
    name: realmName,
    type: realmType,
    populationLabel: realmPopulation,
    ageDays: Math.max(
      0,
      Math.floor(
        Number.isFinite(Number(safe.ageDays))
          ? Number(safe.ageDays)
          : safeCurrentDay,
      ),
    ),
    npcGuilds,
    population,
    news: capRealmNews(safe.news),
    lastSimulatedDayIndex: Number.isFinite(Number(safe.lastSimulatedDayIndex))
      ? Math.max(0, Math.floor(Number(safe.lastSimulatedDayIndex)))
      : safeCurrentDay,
    lastSimulatedStepIndex: Number.isFinite(Number(safe.lastSimulatedStepIndex))
      ? Math.max(0, Math.floor(Number(safe.lastSimulatedStepIndex)))
      : safeCurrentDay * 4,
  };
};

export { createRandom };
