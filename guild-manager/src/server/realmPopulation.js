import {
  CONFIG,
  DB_CLASSES,
  DB_RACES,
  FACTION_RACES,
  GUILD_FACTION,
  GUILD_SERVER_POPULATION,
} from "../constants";
import {
  RECRUITMENT_SCOUT_FOCUS,
  normalizeRecruitmentScoutFocus,
} from "../recruitment/scoutingFocus";
import { getCharacterMorale } from "../game/characterMorale";
import {
  buildCharacterNamePool,
  getCharacterAverageItemLevel,
  pickValidRaceClassCombination,
  pickUniqueCharacterName,
} from "../utils";
import {
  normalizeCharacterPersonalityTraits,
  getCharacterLevelingExpMultiplier,
  getCharacterZoneProgressMultiplier,
  rollCharacterPersonalityTraits,
} from "../game/characterPersonality";
import {
  getStarterZoneIdForRace,
  getZoneById,
  isZoneAccessibleForFaction,
  pickNextZoneForCharacter,
} from "../zones/zoneDefinitions";
import {
  NPC_GUILD_ARCHETYPES,
  REALM_DAILY_ARRIVAL_RANGE,
  REALM_DAILY_DEPARTURE_CAP,
  REALM_DAILY_NPC_GUILD_EXIT_CAP,
  REALM_DAILY_RETIREMENT_CAP,
  REALM_DAILY_RETURNER_CAP,
  REALM_DEPARTED_PLAYER_LIMIT,
  REALM_GUILD_APPLICATION_CAP,
  REALM_GUILD_APPLICATION_LIFETIME_DAYS,
  REALM_GUILD_ROSTER_CAP,
  REALM_MARKET_STATUS,
  REALM_POPULATION_SOFT_CAP,
  REALM_POPULATION_SOFT_CAP_VARIANCE,
  REALM_POPULATION_START,
  REALM_RETURN_MINIMUM_DAYS,
  getRealmPopulationProfile,
} from "./realmDefinitions";
import { simulateRealmDungeonActivity } from "./realmDungeons";
import { capRealmNews } from "./realmNews";
import { getRealmMaxLevelCount } from "./realmRosters";

export const hashPopulationSeed = (value) => {
  const input = String(value || "realm-population");
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const createPopulationRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state + 0x6d2b79f5, 1);
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const ROLE_BY_CLASS = Object.freeze({
  Warrior: "Tank",
  Paladin: "Healer",
  Shaman: "Healer",
  Priest: "Healer",
  Druid: "Healer",
});

const NAME_PREFIXES = Object.freeze([
  "Ar",
  "Bel",
  "Cor",
  "Dar",
  "El",
  "Fen",
  "Gar",
  "Hel",
  "Is",
  "Jar",
  "Kel",
  "Mor",
  "Nor",
  "Ral",
  "Tor",
  "Vel",
  "Zan",
]);

const NAME_SUFFIXES = Object.freeze([
  "dan",
  "dor",
  "grim",
  "lan",
  "mar",
  "neth",
  "ric",
  "sha",
  "stone",
  "thorn",
  "vak",
  "wyn",
]);

const clampNumber = (value, min, max) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const DAILY_STAT_COUNTER_KEYS = Object.freeze([
  "arrivals",
  "npcRecruits",
  "poached",
  "applications",
  "expiredApplications",
  "npcGuildExits",
  "realmDepartures",
  "returners",
  "retirements",
  "guildDungeonRuns",
  "guildDungeonClears",
  "pugDungeonRuns",
  "pugDungeonClears",
  "dungeonWipes",
]);

const mergeDailyStats = (existingStats, dayIndex, nextStats) => {
  const safeDayIndex = Math.max(0, Math.floor(Number(dayIndex) || 0));
  const existing =
    existingStats && typeof existingStats === "object" ? existingStats : {};
  const isSameDay = Math.floor(Number(existing.dayIndex) || -1) === safeDayIndex;
  return DAILY_STAT_COUNTER_KEYS.reduce(
    (stats, key) => ({
      ...stats,
      [key]:
        (isSameDay ? Number(existing[key]) || 0 : 0) +
        (Number(nextStats?.[key]) || 0),
    }),
    {
      ...(isSameDay ? existing : {}),
      dayIndex: safeDayIndex,
    },
  );
};

const normalizeRealmLevelTarget = (value) => {
  const level = Number(value);
  if (!Number.isFinite(level) || level <= 1) return null;
  return clampNumber(level, 1, CONFIG.LEVEL_CAP);
};

const normalizeServerPopulation = (serverPopulation) =>
  serverPopulation === GUILD_SERVER_POPULATION.HIGH
    ? GUILD_SERVER_POPULATION.HIGH
    : GUILD_SERVER_POPULATION.MEDIUM;

const getFreshRealmSoftCap = (realmId, serverPopulation) => {
  const populationProfile = getRealmPopulationProfile(serverPopulation);
  const random = createPopulationRandom(
    hashPopulationSeed(`${realmId}:${populationProfile.populationLabel}:soft-cap`),
  );
  const min = populationProfile.softCap - REALM_POPULATION_SOFT_CAP_VARIANCE;
  const max = populationProfile.softCap + REALM_POPULATION_SOFT_CAP_VARIANCE;
  return Math.round(clampNumber(min + random() * (max - min), min, max));
};

const normalizeZoneClears = (value) =>
  [...new Set(
    (Array.isArray(value) ? value : [])
      .map((zoneId) => String(zoneId || "").trim())
      .filter(Boolean),
  )].slice(-24);

const pickFrom = (items, random) =>
  items[Math.floor(random() * items.length) % items.length];

const makeRealmPlayerName = (random) =>
  `${pickFrom(NAME_PREFIXES, random)}${pickFrom(NAME_SUFFIXES, random)}`;

const isValidRaceClassCombo = (race, charClass) =>
  Array.isArray(DB_RACES[race]) && DB_RACES[race].includes(charClass);

const isFactionRace = (faction, race) =>
  Array.isArray(FACTION_RACES[faction]) && FACTION_RACES[faction].includes(race);

const normalizeRaceClassCombo = ({ faction, race, charClass }) => {
  if (isFactionRace(faction, race) && isValidRaceClassCombo(race, charClass)) {
    return { race, charClass };
  }
  const factionRaces =
    FACTION_RACES[faction] || FACTION_RACES[GUILD_FACTION.ALLIANCE] || ["Human"];
  const fallbackRace =
    (isFactionRace(faction, race) && Array.isArray(DB_RACES[race]) ? race : null) ||
    factionRaces.find((candidateRace) => Array.isArray(DB_RACES[candidateRace])) ||
    "Human";
  return {
    race: fallbackRace,
    charClass: DB_RACES[fallbackRace]?.[0] || "Warrior",
  };
};

const getRoleForClass = (charClass) => ROLE_BY_CLASS[charClass] || "DPS";

const normalizeRoleForClass = (role, charClass) => {
  const allowedRoles = Array.isArray(DB_CLASSES?.[charClass]?.allowedRoles)
    ? DB_CLASSES[charClass].allowedRoles
    : ["DPS"];
  return allowedRoles.includes(role)
    ? role
    : ROLE_BY_CLASS[charClass] || allowedRoles[0] || "DPS";
};

const getRealmPlayerZone = (player) => {
  const currentZone = getZoneById(player?.currentZoneId, player?.level);
  if (
    currentZone &&
    isZoneAccessibleForFaction(currentZone, player?.faction) &&
    !normalizeZoneClears(player?.zonesCleared).includes(currentZone.id)
  ) {
    return currentZone;
  }

  const starterZone = getZoneById(getStarterZoneIdForRace(player?.race));
  if (
    starterZone &&
    (Number(player?.level) || 1) <= starterZone.maxLevel &&
    isZoneAccessibleForFaction(starterZone, player?.faction)
  ) {
    return starterZone;
  }

  return pickNextZoneForCharacter({
    faction: player?.faction,
    level: player?.level,
    zonesCleared: player?.zonesCleared,
    currentZoneId: player?.currentZoneId,
    character: player,
  });
};

const ensureRealmPlayerZone = (player) => {
  const zone = getRealmPlayerZone(player);
  return {
    ...player,
    currentZoneId: zone?.id || null,
    zoneProgress: Math.round(clampNumber(player?.zoneProgress, 0, 99)),
    zonesCleared: normalizeZoneClears(player?.zonesCleared),
  };
};

const normalizeRealmApplications = (applications = [], players = []) => {
  const validPlayerIds = new Set(players.map((player) => String(player.id || "")));
  const byPlayerId = new Map();
  (Array.isArray(applications) ? applications : []).forEach((application, index) => {
    const playerId = String(application?.playerId || application?.id || "").trim();
    if (!playerId || (validPlayerIds.size > 0 && !validPlayerIds.has(playerId))) return;
    if (byPlayerId.has(playerId)) return;
    byPlayerId.set(playerId, {
      id: String(application?.id || `realm-application:${playerId}`).trim(),
      playerId,
      dayIndex: Math.max(0, Math.floor(Number(application?.dayIndex) || 0)),
      sourceGuildId: application?.sourceGuildId || null,
      sourceGuildName: application?.sourceGuildName || null,
      order: index,
    });
  });

  return [...byPlayerId.values()]
    .sort((left, right) => {
      if (left.dayIndex !== right.dayIndex) return left.dayIndex - right.dayIndex;
      return left.order - right.order;
    })
    .slice(-REALM_GUILD_APPLICATION_CAP)
    .map((application) => ({
      id: application.id,
      playerId: application.playerId,
      dayIndex: application.dayIndex,
      sourceGuildId: application.sourceGuildId,
      sourceGuildName: application.sourceGuildName,
    }));
};

export const getRealmPopulationStats = (realmState, playerRoster = []) => {
  const population = realmState?.population || {};
  const populationProfile = getRealmPopulationProfile(
    normalizeServerPopulation(
      realmState?.populationLabel || population.serverPopulation,
    ),
  );
  const players = Array.isArray(population.players) ? population.players : [];
  const playerGuildSize = Array.isArray(playerRoster) ? playerRoster.length : 0;
  const guildedRealmPlayers = players.filter((player) => player.guildId).length;
  const freeAgents = players.filter(
    (player) => player.marketStatus === REALM_MARKET_STATUS.FREE_AGENT,
  ).length;
  const openToOffers = players.filter(
    (player) => player.marketStatus === REALM_MARKET_STATUS.OPEN_TO_OFFERS,
  ).length;
  const applications = normalizeRealmApplications(population.applications, players);
  return {
    totalPopulation: players.length + playerGuildSize,
    realmPlayers: players.length,
    playerGuildSize,
    guildedRealmPlayers,
    freeAgents,
    openToOffers,
    applications: applications.length,
    departedPlayers: normalizeDepartedPlayers(
      population.departedPlayers,
      players,
    ).length,
    softCap: Math.round(
      clampNumber(
        Number(population.currentSoftCap) || populationProfile.softCap,
        populationProfile.softCap - REALM_POPULATION_SOFT_CAP_VARIANCE,
        populationProfile.softCap + REALM_POPULATION_SOFT_CAP_VARIANCE,
      ),
    ),
    dailyStats: population.dailyStats || {},
  };
};

export const createRealmPlayer = ({
  id,
  name,
  faction = GUILD_FACTION.ALLIANCE,
  race,
  gender = "Male",
  charClass,
  role,
  level = 1,
  itemLevel = 1,
  activityLevel = 50,
  loyalty = 55,
  guildId = null,
  marketStatus,
  sourceGuildName,
  currentZoneId = null,
  zoneProgress = 0,
  zonesCleared = [],
  personalityTraits = [],
  arrivalDayIndex = null,
}) => {
  const combo = normalizeRaceClassCombo({ faction, race, charClass });
  return {
    id: String(id || "").trim(),
    name: String(name || "Realm Player").trim(),
    faction,
    race: combo.race,
    gender,
    charClass: combo.charClass,
    role: normalizeRoleForClass(role || getRoleForClass(combo.charClass), combo.charClass),
    level: Math.round(clampNumber(level, 1, CONFIG.LEVEL_CAP)),
    itemLevel: Math.round(clampNumber(itemLevel, 0, 100)),
    activityLevel: Math.round(clampNumber(activityLevel, 1, 100)),
    loyalty: Math.round(clampNumber(loyalty, 1, 100)),
    guildId: guildId ? String(guildId) : null,
    marketStatus:
      marketStatus ||
      (guildId ? REALM_MARKET_STATUS.GUILDED : REALM_MARKET_STATUS.FREE_AGENT),
    sourceGuildName: sourceGuildName || null,
    currentZoneId: currentZoneId ? String(currentZoneId) : null,
    zoneProgress: Math.round(clampNumber(zoneProgress, 0, 99)),
    zonesCleared: normalizeZoneClears(zonesCleared),
    personalityTraits: normalizeCharacterPersonalityTraits(personalityTraits),
    arrivalDayIndex:
      arrivalDayIndex !== null &&
      arrivalDayIndex !== undefined &&
      arrivalDayIndex !== "" &&
      Number.isFinite(Number(arrivalDayIndex))
      ? Math.max(0, Math.floor(Number(arrivalDayIndex)))
      : null,
  };
};

const generateFreeAgent = ({
  realmId,
  index,
  random,
  usedNameKeys,
  arrivalDayIndex = null,
}) => {
  const faction = random() < 0.5 ? GUILD_FACTION.ALLIANCE : GUILD_FACTION.HORDE;
  const { race, charClass } = pickValidRaceClassCombination({
    faction,
    random,
  });
  const gender = random() > 0.5 ? "Male" : "Female";
  const level = 1;
  const itemLevel = 1;
  return createRealmPlayer({
    id: `realm-player:${hashPopulationSeed(`${realmId}:free:${index}`).toString(36)}`,
    name: pickUniqueCharacterName({
      race,
      gender,
      curatedPool: buildCharacterNamePool({
        race,
        gender,
        charClass,
        includeFunnyName: random() < 0.08,
      }),
      fallbackPool: [makeRealmPlayerName(random)],
      usedNameKeys,
      random,
    }),
    faction,
    race,
    gender,
    charClass,
    level,
    itemLevel,
    activityLevel: 30 + Math.round(random() * 65),
    loyalty: 25 + Math.round(random() * 50),
    guildId: null,
    marketStatus: REALM_MARKET_STATUS.FREE_AGENT,
    personalityTraits: rollCharacterPersonalityTraits({ random }),
    arrivalDayIndex,
  });
};

const normalizeDepartedPlayers = (departedPlayers = [], activePlayers = []) => {
  const activeIds = new Set(
    (Array.isArray(activePlayers) ? activePlayers : []).map((player) =>
      String(player?.id || ""),
    ),
  );
  const seenIds = new Set();
  return (Array.isArray(departedPlayers) ? departedPlayers : [])
    .map((entry) => {
      const sourcePlayer = entry?.player && typeof entry.player === "object"
        ? entry.player
        : entry;
      const player = createRealmPlayer(sourcePlayer || {});
      if (!player.id || activeIds.has(player.id) || seenIds.has(player.id)) return null;
      seenIds.add(player.id);
      const departedDayIndex = Math.max(
        0,
        Math.floor(Number(entry?.departedDayIndex) || 0),
      );
      return {
        player,
        departedDayIndex,
        eligibleReturnDayIndex: Math.max(
          departedDayIndex + REALM_RETURN_MINIMUM_DAYS,
          Math.floor(
            Number(entry?.eligibleReturnDayIndex) ||
              departedDayIndex + REALM_RETURN_MINIMUM_DAYS,
          ),
        ),
        reason: String(entry?.reason || "realm_break"),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.departedDayIndex - right.departedDayIndex)
    .slice(-REALM_DEPARTED_PLAYER_LIMIT);
};

const convertGuildRosterToRealmPlayers = ({ guild, random }) =>
  (Array.isArray(guild?.roster) ? guild.roster : []).map((member, index) =>
    createRealmPlayer({
      id: String(member.id || `${guild.id}:member:${index + 1}`),
      name: member.name,
      faction: guild.faction,
      race: member.race,
      gender: member.gender,
      charClass: member.charClass,
      role: member.role,
      level: member.level,
      itemLevel: member.itemLevel,
      personalityTraits: member.personalityTraits,
      activityLevel: Math.max(35, Math.round(Number(guild.activityLevel) || 50)),
      loyalty: 45 + Math.round(random() * 45),
      guildId: guild.id,
      marketStatus:
        random() < 0.1
          ? REALM_MARKET_STATUS.OPEN_TO_OFFERS
          : REALM_MARKET_STATUS.GUILDED,
      sourceGuildName: guild.name,
    }),
  );

export const normalizeRealmPopulation = ({
  population,
  realmId,
  npcGuilds = [],
  currentDayIndex = 0,
  playerRosterSize = 0,
  serverPopulation = null,
} = {}) => {
  const safePopulation = population && typeof population === "object" ? population : {};
  const normalizedServerPopulation = normalizeServerPopulation(
    serverPopulation || safePopulation.serverPopulation,
  );
  const populationProfile = getRealmPopulationProfile(normalizedServerPopulation);
  const random = createPopulationRandom(hashPopulationSeed(`${realmId}:population:init`));
  const convertedPlayers = npcGuilds.flatMap((guild) =>
    convertGuildRosterToRealmPlayers({ guild, random }),
  );
  const sourcePlayers = Array.isArray(safePopulation.players)
    ? safePopulation.players
    : convertedPlayers;
  const byId = new Map();

  sourcePlayers.forEach((player, index) => {
    const fallback = convertedPlayers[index];
    const normalized = createRealmPlayer({
      ...fallback,
      ...player,
      id: player?.id || fallback?.id || `realm-player:fallback:${index + 1}`,
    });
    if (!normalized.id || byId.has(normalized.id)) return;
    byId.set(normalized.id, normalized);
  });

  let players = [...byId.values()].map(ensureRealmPlayerZone);
  const usedNameKeys = new Set(
    players
      .map((player) => String(player?.name || "").trim().toLocaleLowerCase())
      .filter(Boolean),
  );
  const targetRealmPlayers = Math.max(0, REALM_POPULATION_START - playerRosterSize);
  while (players.length < targetRealmPlayers) {
    const index = players.length;
    players.push(
      ensureRealmPlayerZone(
        generateFreeAgent({ realmId, index, random, usedNameKeys }),
      ),
    );
  }
  const applications = normalizeRealmApplications(
    safePopulation.applications,
    players,
  );
  const departedPlayers = normalizeDepartedPlayers(
    safePopulation.departedPlayers,
    players,
  );

  return {
    serverPopulation: normalizedServerPopulation,
    currentSoftCap: Math.round(
      (() => {
        const minCap = populationProfile.softCap - REALM_POPULATION_SOFT_CAP_VARIANCE;
        const maxCap = populationProfile.softCap + REALM_POPULATION_SOFT_CAP_VARIANCE;
        const existingCap = Number(safePopulation.currentSoftCap);
        const targetCap =
          Number.isFinite(existingCap) && existingCap >= minCap && existingCap <= maxCap
            ? existingCap
            : getFreshRealmSoftCap(realmId, normalizedServerPopulation);
        return clampNumber(targetCap, minCap, maxCap);
      })(),
    ),
    startedAt: Math.max(
      REALM_POPULATION_START,
      Number(safePopulation.startedAt) || REALM_POPULATION_START,
    ),
    players,
    applications,
    departedPlayers,
    lastArrivalDayIndex: Number.isFinite(Number(safePopulation.lastArrivalDayIndex))
      ? Math.max(0, Math.floor(Number(safePopulation.lastArrivalDayIndex)))
      : Math.max(0, Math.floor(Number(currentDayIndex) || 0)),
    lastPlayerMarketDayIndex: Number.isFinite(
      Number(safePopulation.lastPlayerMarketDayIndex),
    )
      ? Math.max(0, Math.floor(Number(safePopulation.lastPlayerMarketDayIndex)))
      : Math.max(0, Math.floor(Number(currentDayIndex) || 0)),
    lastLifecycleDayIndex: Number.isFinite(
      Number(safePopulation.lastLifecycleDayIndex),
    )
      ? Math.max(0, Math.floor(Number(safePopulation.lastLifecycleDayIndex)))
      : -1,
    lastApplicationDayIndex: Number.isFinite(
      Number(safePopulation.lastApplicationDayIndex),
    )
      ? Math.max(0, Math.floor(Number(safePopulation.lastApplicationDayIndex)))
      : -1,
    dailyStats:
      safePopulation.dailyStats && typeof safePopulation.dailyStats === "object"
        ? safePopulation.dailyStats
        : {},
  };
};

const getValidApplicationPlayer = ({ player, faction }) => {
  if (!player || player.faction !== faction) return null;
  if (
    player.marketStatus !== REALM_MARKET_STATUS.FREE_AGENT &&
    player.marketStatus !== REALM_MARKET_STATUS.OPEN_TO_OFFERS
  ) {
    return null;
  }
  return player;
};

export const getRealmGuildApplications = ({
  realmState,
  faction = GUILD_FACTION.ALLIANCE,
} = {}) => {
  const population = realmState?.population || {};
  const players = Array.isArray(population.players) ? population.players : [];
  const playerById = new Map(players.map((player) => [String(player.id), player]));
  return normalizeRealmApplications(population.applications, players)
    .map((application) => {
      const player = getValidApplicationPlayer({
        player: playerById.get(String(application.playerId)),
        faction,
      });
      return player ? { application, player } : null;
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.application.dayIndex !== right.application.dayIndex) {
        return left.application.dayIndex - right.application.dayIndex;
      }
      if ((right.player.level || 0) !== (left.player.level || 0)) {
        return (right.player.level || 0) - (left.player.level || 0);
      }
      return String(left.player.name || "").localeCompare(
        String(right.player.name || ""),
      );
    });
};

const advanceRealmPlayerZoneForDay = ({
  player,
  random,
  guilded,
  dayFraction = 1,
}) => {
  const zone = getRealmPlayerZone(player);
  if (!zone) {
    return {
      currentZoneId: null,
      zoneProgress: 0,
      zonesCleared: normalizeZoneClears(player?.zonesCleared),
      level: player.level,
      itemLevel: player.itemLevel,
    };
  }

  const activity = clampNumber(player.activityLevel, 1, 100) / 100;
  const zoneMultiplier = getCharacterZoneProgressMultiplier(player);
  const cadenceScale = clampNumber(dayFraction, 0.01, 1) / 0.25;
  const gain =
    ((guilded ? 16 : 10) * activity + 2 + random() * 3) *
    zoneMultiplier *
    cadenceScale;
  let zoneProgress = clampNumber(player.zoneProgress, 0, 99) + gain;
  let level = player.level;
  let itemLevel = player.itemLevel;
  let zonesCleared = normalizeZoneClears(player.zonesCleared);
  let currentZoneId = zone.id;

  if (zoneProgress >= 100) {
    zoneProgress = Math.max(0, zoneProgress - 100);
    zonesCleared = normalizeZoneClears([...zonesCleared, zone.id]);
    if (level < CONFIG.LEVEL_CAP) {
      level += 1;
      itemLevel = Math.min(100, itemLevel + (guilded ? 2 : 1));
    }
    const nextZone = getRealmPlayerZone({
      ...player,
      level,
      itemLevel,
      currentZoneId: null,
      zonesCleared,
      zoneProgress,
    });
    currentZoneId = nextZone?.id || null;
  }

  return {
    currentZoneId,
    zoneProgress: Math.round(clampNumber(zoneProgress, 0, 99)),
    zonesCleared,
    level,
    itemLevel,
  };
};

const ARCHETYPE_PROGRESSION = Object.freeze({
  [NPC_GUILD_ARCHETYPES.HARDCORE_RAIDERS]: Object.freeze({
    levelOffset: 1,
    itemLevelOffset: 0,
    levelPerDay: 0.38,
    itemLevelPerDay: 0.5,
  }),
  [NPC_GUILD_ARCHETYPES.DUNGEON_RUNNERS]: Object.freeze({
    levelOffset: 0.5,
    itemLevelOffset: 1,
    levelPerDay: 0.34,
    itemLevelPerDay: 0.42,
  }),
  [NPC_GUILD_ARCHETYPES.LEVELING_GUILD]: Object.freeze({
    levelOffset: 1,
    itemLevelOffset: 0,
    levelPerDay: 0.32,
    itemLevelPerDay: 0.22,
  }),
  [NPC_GUILD_ARCHETYPES.SOCIAL_GUILD]: Object.freeze({
    levelOffset: -1,
    itemLevelOffset: -1,
    levelPerDay: 0.18,
    itemLevelPerDay: 0.18,
  }),
  [NPC_GUILD_ARCHETYPES.CASUAL_ADVENTURERS]: Object.freeze({
    levelOffset: -0.5,
    itemLevelOffset: -0.5,
    levelPerDay: 0.24,
    itemLevelPerDay: 0.25,
  }),
});

const DEFAULT_PROGRESSION = Object.freeze({
  levelOffset: 0,
  itemLevelOffset: 0,
  levelPerDay: 0.14,
  itemLevelPerDay: 0.08,
});

const getStablePlayerVariance = (playerId) =>
  ((hashPopulationSeed(`${playerId}:progression-variance`) % 2001) / 1000) - 1;

const rollExpectedGain = ({ expected, maxGain = 2, random }) => {
  const capped = clampNumber(expected, 0, maxGain);
  const whole = Math.floor(capped);
  const remainder = capped - whole;
  return Math.min(maxGain, whole + (random() < remainder ? 1 : 0));
};

const advanceRealmPlayerForDay = ({
  player,
  random,
  playerAverageLevel = null,
  playerAverageItemLevel = null,
  progression = DEFAULT_PROGRESSION,
  difficultyProfile,
  dayFraction = 1,
}) => {
  const safeDayFraction = clampNumber(dayFraction, 0.01, 1);
  const guilded = Boolean(player.guildId);
  const activity = clampNumber(player.activityLevel, 1, 100) / 100;
  const levelingMultiplier = getCharacterLevelingExpMultiplier(player);
  const profile = difficultyProfile || {
    levelTargetOffset: 0,
    itemLevelTargetOffset: 0,
    catchUpRate: 0.55,
  };
  const currentLevel = Math.max(1, Number(player.level) || 1);
  const currentItemLevel = Math.max(0, Number(player.itemLevel) || 0);
  const stableVariance = getStablePlayerVariance(player.id);
  const normalizedLevelTarget = normalizeRealmLevelTarget(playerAverageLevel);
  const normalizedItemTarget = Number(playerAverageItemLevel);
  const personalLevelTarget = normalizedLevelTarget
    ? clampNumber(
        normalizedLevelTarget +
          Number(profile.levelTargetOffset || 0) +
          Number(progression.levelOffset || 0) +
          stableVariance,
        1,
        CONFIG.LEVEL_CAP,
      )
    : null;
  const personalItemTarget = Number.isFinite(normalizedItemTarget)
    ? clampNumber(
        normalizedItemTarget +
          Number(profile.itemLevelTargetOffset || 0) +
          Number(progression.itemLevelOffset || 0) +
          stableVariance,
        0,
        100,
      )
    : null;
  const levelGap = personalLevelTarget == null
    ? 0
    : Math.max(0, personalLevelTarget - currentLevel - 1);
  const itemGap = personalItemTarget == null
    ? 0
    : Math.max(0, personalItemTarget - currentItemLevel - 1);
  const levelGain = rollExpectedGain({
    expected:
      Number(progression.levelPerDay || 0) *
        activity *
        levelingMultiplier *
        safeDayFraction +
      levelGap * Number(profile.catchUpRate || 0),
    random,
  });
  const itemLevelGain = rollExpectedGain({
    expected:
      Number(progression.itemLevelPerDay || 0) * activity * safeDayFraction +
      itemGap * Number(profile.catchUpRate || 0),
    random,
  });
  const level = Math.min(CONFIG.LEVEL_CAP, currentLevel + levelGain);
  const itemLevel = Math.min(100, currentItemLevel + itemLevelGain);
  const loyaltyDelta = guilded ? (random() < 0.18 * safeDayFraction ? 1 : 0) : 0;
  const loyalty = clampNumber(player.loyalty + loyaltyDelta, 1, 100);
  const marketStatus =
    player.guildId &&
    (loyalty < 35 ||
      (player.marketStatus === REALM_MARKET_STATUS.OPEN_TO_OFFERS &&
        loyalty < 50))
      ? REALM_MARKET_STATUS.OPEN_TO_OFFERS
      : player.guildId
        ? REALM_MARKET_STATUS.GUILDED
        : REALM_MARKET_STATUS.FREE_AGENT;
  const zoneState = advanceRealmPlayerZoneForDay({
    player: {
      ...player,
      level,
      itemLevel,
    },
    random,
    guilded,
    dayFraction: safeDayFraction,
  });
  return {
    ...player,
    level: Math.min(CONFIG.LEVEL_CAP, currentLevel + 2, zoneState.level),
    itemLevel: Math.min(100, currentItemLevel + 2, zoneState.itemLevel),
    loyalty,
    marketStatus,
    currentZoneId: zoneState.currentZoneId,
    zoneProgress: zoneState.zoneProgress,
    zonesCleared: zoneState.zonesCleared,
  };
};

const syncGuildRostersFromPopulation = (npcGuilds, players) =>
  (() => {
    const rosterByGuildId = new Map();
    (Array.isArray(players) ? players : []).forEach((player) => {
      const guildId = String(player?.guildId || "");
      if (!guildId) return;
      const roster = rosterByGuildId.get(guildId) || [];
      if (roster.length >= REALM_GUILD_ROSTER_CAP) return;
      roster.push({
        id: player.id,
        name: player.name,
        level: player.level,
        itemLevel: player.itemLevel,
        race: player.race,
        gender: player.gender,
        charClass: player.charClass,
        role: player.role,
        personalityTraits: player.personalityTraits,
      });
      rosterByGuildId.set(guildId, roster);
    });

    return (Array.isArray(npcGuilds) ? npcGuilds : []).map((guild) => {
      const roster = rosterByGuildId.get(String(guild.id || "")) || [];
      const averageLevel =
        roster.length > 0
          ? roster.reduce((sum, member) => sum + member.level, 0) / roster.length
          : guild.averageLevel;
      const averageGearScore =
        roster.length > 0
          ? roster.reduce((sum, member) => sum + member.itemLevel, 0) /
            roster.length
          : guild.averageGearScore;
      return {
        ...guild,
        roster,
        rosterSize: roster.length,
        maxLevelCount: getRealmMaxLevelCount(roster),
        averageLevel: Math.round(averageLevel * 10) / 10,
        averageGearScore: Math.round(averageGearScore),
      };
    });
  })();

const recruitNpcGuilds = ({
  npcGuilds,
  players,
  dayIndex = 0,
  dayFraction = 1,
  random,
}) => {
  let recruited = 0;
  const nextPlayers = [...players];
  const safeDayIndex = Math.max(0, Math.floor(Number(dayIndex) || 0));
  const safeDayFraction = clampNumber(dayFraction, 0.05, 1);
  const guilds = [...npcGuilds]
    .sort((left, right) => {
      const leftIsFoundingDay =
        Number.isFinite(Number(left.foundedAtDayIndex)) &&
        Math.floor(Number(left.foundedAtDayIndex)) === safeDayIndex;
      const rightIsFoundingDay =
        Number.isFinite(Number(right.foundedAtDayIndex)) &&
        Math.floor(Number(right.foundedAtDayIndex)) === safeDayIndex;
      if (leftIsFoundingDay !== rightIsFoundingDay) {
        return rightIsFoundingDay ? 1 : -1;
      }
      return (right.reputation || 0) - (left.reputation || 0);
    });

  guilds.forEach((guild) => {
    const currentSize = nextPlayers.filter((player) => player.guildId === guild.id).length;
    const openSlots = Math.max(0, REALM_GUILD_ROSTER_CAP - currentSize);
    if (openSlots <= 0) return;
    const foundedRosterSize = Math.max(
      0,
      Math.floor(Number(guild.foundedRosterSize) || 0),
    );
    const isFoundingDay =
      foundedRosterSize > 0 &&
      Number.isFinite(Number(guild.foundedAtDayIndex)) &&
      Math.floor(Number(guild.foundedAtDayIndex)) === safeDayIndex;
    const foundingOpenings = isFoundingDay
      ? Math.max(0, foundedRosterSize - currentSize)
      : 0;
    if (isFoundingDay && foundingOpenings <= 0) return;
    const dailyAttempts = random() < 0.6 ? 2 : 1;
    const scaledAttempts = Math.floor(dailyAttempts * safeDayFraction + random());
    const attempts = isFoundingDay
      ? Math.min(openSlots, foundingOpenings)
      : Math.min(openSlots, scaledAttempts);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const candidates = nextPlayers
        .map((player, index) => ({ player, index }))
        .filter(({ player }) =>
          !player.guildId &&
          player.faction === guild.faction &&
          player.marketStatus === REALM_MARKET_STATUS.FREE_AGENT &&
          (player.arrivalDayIndex == null ||
            Number(player.arrivalDayIndex) < safeDayIndex),
        )
        .sort((left, right) => {
          if (isFoundingDay && (right.player.level || 0) !== (left.player.level || 0)) {
            return (right.player.level || 0) - (left.player.level || 0);
          }
          if ((right.player.activityLevel || 0) !== (left.player.activityLevel || 0)) {
            return (right.player.activityLevel || 0) - (left.player.activityLevel || 0);
          }
          if ((right.player.level || 0) !== (left.player.level || 0)) {
            return (right.player.level || 0) - (left.player.level || 0);
          }
          return String(left.player.id || "").localeCompare(String(right.player.id || ""));
        });
      const candidateWindow = isFoundingDay
        ? candidates.slice(0, Math.max(foundedRosterSize * 2, attempts))
        : candidates;
      if (candidateWindow.length === 0) break;
      const { index } = candidateWindow[Math.floor(random() * candidateWindow.length)];
      nextPlayers[index] = {
        ...nextPlayers[index],
        guildId: guild.id,
        marketStatus: REALM_MARKET_STATUS.GUILDED,
        sourceGuildName: guild.name,
        loyalty: Math.max(nextPlayers[index].loyalty, 45 + Math.round(random() * 30)),
      };
      recruited += 1;
    }
  });

  return { players: nextPlayers, recruited };
};

const poachNpcGuildMembers = ({ npcGuilds, players, random }) => {
  const nextPlayers = [...players];
  let poached = 0;
  if (random() > 0.28) return { players: nextPlayers, poached };

  const candidates = nextPlayers
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.guildId && player.marketStatus === REALM_MARKET_STATUS.OPEN_TO_OFFERS);
  if (candidates.length === 0) return { players: nextPlayers, poached };
  const { player, index } = candidates[Math.floor(random() * candidates.length)];
  const currentGuild = npcGuilds.find((guild) => guild.id === player.guildId);
  const targets = npcGuilds.filter(
    (guild) =>
      guild.id !== player.guildId &&
      guild.faction === player.faction &&
      (guild.reputation || 0) > (currentGuild?.reputation || 0) &&
      nextPlayers.filter((candidate) => candidate.guildId === guild.id).length <
        REALM_GUILD_ROSTER_CAP,
  );
  if (targets.length === 0) return { players: nextPlayers, poached };
  const target = targets[Math.floor(random() * targets.length)];
  nextPlayers[index] = {
    ...player,
    guildId: target.id,
    sourceGuildName: target.name,
    marketStatus: REALM_MARKET_STATUS.GUILDED,
    loyalty: Math.max(45, player.loyalty + 20),
  };
  poached = 1;
  return { players: nextPlayers, poached };
};

const getLifecycleGuildStability = (guild) =>
  clampNumber(
    ((Number(guild?.activityLevel) || 50) +
      (Number(guild?.reputation) || 50)) /
      2,
    1,
    100,
  );

const getLifecycleSortValue = (realmId, dayIndex, playerId, kind) =>
  hashPopulationSeed(`${realmId}:${dayIndex}:${kind}:${playerId}`);

export const advanceRealmPopulationLifecycle = ({
  realmState,
  npcGuilds = [],
  dayIndex,
  playerRosterSize = 0,
  serverPopulation = null,
  random,
} = {}) => {
  const safeRandom = typeof random === "function" ? random : Math.random;
  const safeDayIndex = Math.max(0, Math.floor(Number(dayIndex) || 0));
  const population = normalizeRealmPopulation({
    population: realmState?.population,
    realmId: realmState?.id,
    npcGuilds,
    currentDayIndex: safeDayIndex,
    playerRosterSize,
    serverPopulation:
      serverPopulation ||
      realmState?.populationLabel ||
      realmState?.population?.serverPopulation,
  });
  if (Number(population.lastLifecycleDayIndex) === safeDayIndex) {
    return {
      population,
      npcGuilds: syncGuildRostersFromPopulation(npcGuilds, population.players),
      events: [],
      stats: {},
    };
  }

  const guildById = new Map(
    (Array.isArray(npcGuilds) ? npcGuilds : []).map((guild) => [
      String(guild?.id || ""),
      guild,
    ]),
  );
  let players = population.players.map((player) => {
    if (!player.guildId) {
      return {
        ...player,
        marketStatus: REALM_MARKET_STATUS.FREE_AGENT,
      };
    }
    const guild = guildById.get(String(player.guildId));
    const stability = getLifecycleGuildStability(guild);
    const negativeChance =
      0.08 +
      Math.max(0, 50 - (Number(player.activityLevel) || 50)) / 220 +
      Math.max(0, 55 - stability) / 260;
    const positiveChance =
      0.1 +
      Math.max(0, stability - 55) / 260;
    const roll = safeRandom();
    let loyaltyDelta = 0;
    if (roll < negativeChance) {
      loyaltyDelta = -(1 + Math.floor(safeRandom() * 4));
    } else if (roll > 1 - positiveChance) {
      loyaltyDelta = 1 + Math.floor(safeRandom() * 3);
    }
    const loyalty = clampNumber(
      (Number(player.loyalty) || 50) + loyaltyDelta,
      1,
      100,
    );
    return {
      ...player,
      loyalty,
      marketStatus:
        loyalty < 35
          ? REALM_MARKET_STATUS.OPEN_TO_OFFERS
          : REALM_MARKET_STATUS.GUILDED,
    };
  });

  const events = [];
  const guildExitIds = new Set(
    players
      .filter(
        (player) =>
          player.guildId &&
          Number(player.loyalty) < 25 &&
          safeRandom() < 0.45,
      )
      .sort((left, right) => {
        if (left.loyalty !== right.loyalty) return left.loyalty - right.loyalty;
        return (
          getLifecycleSortValue(
            realmState?.id,
            safeDayIndex,
            left.id,
            "guild-exit",
          ) -
          getLifecycleSortValue(
            realmState?.id,
            safeDayIndex,
            right.id,
            "guild-exit",
          )
        );
      })
      .slice(0, REALM_DAILY_NPC_GUILD_EXIT_CAP)
      .map((player) => String(player.id)),
  );
  players = players.map((player) => {
    if (!guildExitIds.has(String(player.id))) return player;
    const previousGuild = guildById.get(String(player.guildId));
    events.push({
      type: "npc-guild-exit",
      playerId: player.id,
      message: `${player.name} left ${previousGuild?.name || player.sourceGuildName || "their guild"} and entered the recruitment market.`,
    });
    return {
      ...player,
      guildId: null,
      sourceGuildName: previousGuild?.name || player.sourceGuildName || null,
      marketStatus: REALM_MARKET_STATUS.FREE_AGENT,
      loyalty: Math.max(40, Number(player.loyalty) || 0),
    };
  });

  const activePlayerIds = new Set(players.map((player) => String(player.id)));
  let departedPlayers = normalizeDepartedPlayers(
    population.departedPlayers,
    players,
  );
  const applicationPlayerIds = new Set(
    normalizeRealmApplications(population.applications, players).map(
      (application) => String(application.playerId),
    ),
  );
  const departureCandidates = players
    .filter((player) => {
      const established =
        player.arrivalDayIndex == null ||
        Number(player.arrivalDayIndex) <= safeDayIndex - 3;
      return (
        established &&
        !guildExitIds.has(String(player.id)) &&
        !applicationPlayerIds.has(String(player.id)) &&
        Number(player.activityLevel) < 45 &&
        safeRandom() <
          0.05 + Math.max(0, 40 - Number(player.activityLevel)) / 180
      );
    })
    .sort((left, right) => {
      if (left.activityLevel !== right.activityLevel) {
        return left.activityLevel - right.activityLevel;
      }
      return (
        getLifecycleSortValue(
          realmState?.id,
          safeDayIndex,
          left.id,
          "departure",
        ) -
        getLifecycleSortValue(
          realmState?.id,
          safeDayIndex,
          right.id,
          "departure",
        )
      );
    })
    .slice(0, REALM_DAILY_DEPARTURE_CAP);
  const departureIds = new Set(
    departureCandidates.map((player) => String(player.id)),
  );
  departureCandidates.forEach((player) => {
    departedPlayers.push({
      player,
      departedDayIndex: safeDayIndex,
      eligibleReturnDayIndex: safeDayIndex + REALM_RETURN_MINIMUM_DAYS,
      reason: "realm_break",
    });
    events.push({
      type: "realm-departure",
      playerId: player.id,
      message: `${player.name} is taking a break from the realm.`,
    });
  });
  players = players.filter((player) => !departureIds.has(String(player.id)));

  const retirementCandidate = players
    .filter(
      (player) =>
        Number(player.level) >= CONFIG.LEVEL_CAP &&
        Number(player.activityLevel) < 40 &&
        !applicationPlayerIds.has(String(player.id)) &&
        safeRandom() < 0.012,
    )
    .sort((left, right) => {
      if (left.activityLevel !== right.activityLevel) {
        return left.activityLevel - right.activityLevel;
      }
      return String(left.id).localeCompare(String(right.id));
    })
    .slice(0, REALM_DAILY_RETIREMENT_CAP);
  const retirementIds = new Set(
    retirementCandidate.map((player) => String(player.id)),
  );
  retirementCandidate.forEach((player) => {
    events.push({
      type: "realm-retirement",
      playerId: player.id,
      message: `${player.name} retired from adventuring on the realm.`,
    });
  });
  players = players.filter((player) => !retirementIds.has(String(player.id)));

  const availableSlots = Math.max(
    0,
    Number(population.currentSoftCap) - players.length - playerRosterSize,
  );
  const returningEntries = departedPlayers
    .filter(
      (entry) =>
        Number(entry.eligibleReturnDayIndex) <= safeDayIndex &&
        !activePlayerIds.has(String(entry.player?.id)) &&
        safeRandom() < 0.55,
    )
    .sort((left, right) => {
      if (left.departedDayIndex !== right.departedDayIndex) {
        return left.departedDayIndex - right.departedDayIndex;
      }
      return String(left.player?.id).localeCompare(String(right.player?.id));
    })
    .slice(
      0,
      Math.min(REALM_DAILY_RETURNER_CAP, availableSlots),
    );
  const returningIds = new Set(
    returningEntries.map((entry) => String(entry.player.id)),
  );
  returningEntries.forEach((entry) => {
    players.push(
      ensureRealmPlayerZone({
        ...entry.player,
        guildId: null,
        sourceGuildName: entry.player.sourceGuildName || null,
        marketStatus: REALM_MARKET_STATUS.FREE_AGENT,
        loyalty: Math.max(40, Number(entry.player.loyalty) || 0),
        arrivalDayIndex: null,
      }),
    );
    events.push({
      type: "realm-return",
      playerId: entry.player.id,
      message: `${entry.player.name} returned to the realm and is looking for a guild.`,
    });
  });
  departedPlayers = departedPlayers
    .filter((entry) => !returningIds.has(String(entry.player.id)))
    .slice(-REALM_DEPARTED_PLAYER_LIMIT);

  const validPlayerIds = new Set(players.map((player) => String(player.id)));
  const existingApplications = normalizeRealmApplications(
    population.applications,
    players,
  );
  const applications = existingApplications.filter(
    (application) =>
      validPlayerIds.has(String(application.playerId)) &&
      safeDayIndex - Number(application.dayIndex) <
        REALM_GUILD_APPLICATION_LIFETIME_DAYS,
  );
  const expiredApplications =
    existingApplications.length - applications.length;
  if (expiredApplications > 0) {
    events.push({
      type: "applications-expired",
      count: expiredApplications,
      message: `${expiredApplications} guild application${expiredApplications === 1 ? "" : "s"} expired and returned to the recruitment market.`,
    });
  }

  const stats = {
    expiredApplications,
    npcGuildExits: guildExitIds.size,
    realmDepartures: departureIds.size,
    returners: returningEntries.length,
    retirements: retirementIds.size,
  };
  return {
    population: {
      ...population,
      players,
      applications,
      departedPlayers,
      lastLifecycleDayIndex: safeDayIndex,
      dailyStats: mergeDailyStats(
        population.dailyStats,
        safeDayIndex,
        stats,
      ),
    },
    npcGuilds: syncGuildRostersFromPopulation(npcGuilds, players),
    events,
    stats,
  };
};

export const getRealmApplicationChance = (applicationCount) => {
  const safeCount = Math.max(0, Math.floor(Number(applicationCount) || 0));
  if (safeCount <= 1) return 0.7;
  if (safeCount <= 4) return 0.45;
  if (safeCount <= 7) return 0.2;
  return 0;
};

const generatePlayerGuildApplications = ({
  applications,
  players,
  guildFaction,
  dayIndex,
  random,
}) => {
  const existingApplications = normalizeRealmApplications(applications, players);
  const existingPlayerIds = new Set(
    existingApplications.map((application) => application.playerId),
  );
  const openSlots = Math.max(
    0,
    REALM_GUILD_APPLICATION_CAP - existingApplications.length,
  );
  const applicationChance = getRealmApplicationChance(
    existingApplications.length,
  );
  if (openSlots <= 0 || random() >= applicationChance) {
    return { applications: existingApplications, added: 0 };
  }

  const addCount = Math.min(openSlots, 1);
  const candidates = players
    .filter(
      (player) =>
        player.faction === guildFaction &&
        !existingPlayerIds.has(player.id) &&
        (player.marketStatus === REALM_MARKET_STATUS.FREE_AGENT ||
          player.marketStatus === REALM_MARKET_STATUS.OPEN_TO_OFFERS),
    )
    .sort((left, right) => {
      if ((right.activityLevel || 0) !== (left.activityLevel || 0)) {
        return (right.activityLevel || 0) - (left.activityLevel || 0);
      }
      if ((right.level || 0) !== (left.level || 0)) {
        return (right.level || 0) - (left.level || 0);
      }
      return String(left.id || "").localeCompare(String(right.id || ""));
    });

  const nextApplications = [...existingApplications];
  for (let count = 0; count < addCount && candidates.length > 0; count += 1) {
    const candidateIndex = Math.floor(random() * candidates.length);
    const [player] = candidates.splice(candidateIndex, 1);
    if (!player) break;
    existingPlayerIds.add(player.id);
    nextApplications.push({
      id: `realm-application:${dayIndex}:${player.id}`,
      playerId: player.id,
      dayIndex,
      sourceGuildId: player.guildId || null,
      sourceGuildName: player.sourceGuildName || null,
    });
  }

  return {
    applications: normalizeRealmApplications(nextApplications, players),
    added: nextApplications.length - existingApplications.length,
  };
};

export const advanceRealmPopulationProgression = ({
  realmState,
  npcGuilds,
  dayIndex,
  dayFraction = 0.05,
  playerRosterSize = 0,
  playerAverageLevel = null,
  playerAverageItemLevel = null,
  serverPopulation = null,
  difficultyProfile,
  random,
  onlinePlayerIds = null,
} = {}) => {
  const safeRandom = typeof random === "function" ? random : Math.random;
  const safeDayFraction = clampNumber(dayFraction, 0.01, 1);
  const safeDayIndex = Math.max(0, Math.floor(Number(dayIndex) || 0));
  const population = Array.isArray(realmState?.population?.players)
    ? realmState.population
    : normalizeRealmPopulation({
        population: realmState?.population,
        realmId: realmState?.id,
        npcGuilds,
        currentDayIndex: safeDayIndex,
        playerRosterSize,
        serverPopulation:
          serverPopulation ||
          realmState?.populationLabel ||
          realmState?.population?.serverPopulation,
      });
  const guildProgressionById = new Map(
    (Array.isArray(npcGuilds) ? npcGuilds : []).map((guild) => [
      String(guild?.id || ""),
      ARCHETYPE_PROGRESSION[guild?.archetype] || DEFAULT_PROGRESSION,
    ]),
  );
  const players = population.players.map((player) =>
    onlinePlayerIds && !onlinePlayerIds.has(String(player.id))
      ? player
      : advanceRealmPlayerForDay({
          player,
          random: safeRandom,
          playerAverageLevel,
          playerAverageItemLevel,
          progression:
            guildProgressionById.get(String(player?.guildId || "")) ||
            DEFAULT_PROGRESSION,
          difficultyProfile,
          dayFraction: safeDayFraction,
        }),
  );

  return {
    population: {
      ...population,
      players,
    },
    npcGuilds: syncGuildRostersFromPopulation(npcGuilds, players),
  };
};

export const advanceRealmPopulationActivity = ({
  realmState,
  npcGuilds,
  dayIndex,
  dayFraction = 1,
  dayStepIndex = null,
  playerRosterSize = 0,
  serverPopulation = null,
  guildFaction = GUILD_FACTION.ALLIANCE,
  difficultyProfile,
  random,
  onlinePlayerIds = null,
} = {}) => {
  const safeRandom = typeof random === "function" ? random : Math.random;
  const safeDayFraction = clampNumber(dayFraction, 0.05, 1);
  const safeDayIndex = Math.max(0, Math.floor(Number(dayIndex) || 0));
  let population = normalizeRealmPopulation({
    population: realmState?.population,
    realmId: realmState?.id,
    npcGuilds,
    currentDayIndex: safeDayIndex,
    playerRosterSize,
    serverPopulation:
      serverPopulation ||
      realmState?.populationLabel ||
      realmState?.population?.serverPopulation,
  });
  let lifecycleEvents = [];
  let activeNpcGuilds = npcGuilds;
  if (Number(dayStepIndex) === 0) {
    const lifecycleResult = advanceRealmPopulationLifecycle({
      realmState: {
        ...realmState,
        population,
      },
      npcGuilds,
      dayIndex: safeDayIndex,
      playerRosterSize,
      serverPopulation,
      random: safeRandom,
    });
    population = lifecycleResult.population;
    activeNpcGuilds = lifecycleResult.npcGuilds;
    lifecycleEvents = lifecycleResult.events;
  }
  const softCap = population.currentSoftCap;
  let players = population.players;
  const currentTotal = players.length + playerRosterSize;
  const dailyArrivalRandom = createPopulationRandom(
    hashPopulationSeed(`${realmState?.id}:${safeDayIndex}:arrivals`),
  );
  const arrivalRoll =
    REALM_DAILY_ARRIVAL_RANGE[0] +
    Math.floor(
      dailyArrivalRandom() *
        (REALM_DAILY_ARRIVAL_RANGE[1] - REALM_DAILY_ARRIVAL_RANGE[0] + 1),
    );
  const safeDayStepIndex = Number.isFinite(Number(dayStepIndex))
    ? Math.max(0, Math.floor(Number(dayStepIndex)))
    : null;
  const allocatedArrivals =
    safeDayStepIndex === null
      ? Math.floor(arrivalRoll * safeDayFraction + safeRandom())
      : Math.max(
          0,
          Math.floor(
            arrivalRoll *
              Math.min(1, (safeDayStepIndex + 1) * safeDayFraction),
          ) -
            Math.floor(
              arrivalRoll * Math.min(1, safeDayStepIndex * safeDayFraction),
            ),
        );
  const arrivals = Math.max(
    0,
    Math.min(
      allocatedArrivals,
      softCap - currentTotal,
    ),
  );
  const usedNameKeys = new Set(
    players
      .map((player) => String(player?.name || "").trim().toLocaleLowerCase())
      .filter(Boolean),
  );
  for (let index = 0; index < arrivals; index += 1) {
    players.push(
      ensureRealmPlayerZone(
        generateFreeAgent({
          realmId: realmState?.id,
          index: players.length + index + safeDayIndex * 1000,
          random: safeRandom,
          usedNameKeys,
          arrivalDayIndex: safeDayIndex,
        }),
      ),
    );
  }

  const recruitedResult = recruitNpcGuilds({
    npcGuilds: activeNpcGuilds,
    players,
    dayIndex: safeDayIndex,
    dayFraction: safeDayFraction,
    random: safeRandom,
  });
  players = recruitedResult.players;
  const poachResult = poachNpcGuildMembers({
    npcGuilds: activeNpcGuilds,
    players,
    random: safeRandom,
  });
  players = poachResult.players;
  const dungeonResult = simulateRealmDungeonActivity({
    npcGuilds: activeNpcGuilds,
    players,
    dayIndex: safeDayIndex,
    dayFraction: safeDayFraction,
    rateMultiplier: difficultyProfile?.dungeonRateMultiplier,
    successBonus: difficultyProfile?.dungeonSuccessBonus,
    random: safeRandom,
    onlinePlayerIds,
  });
  players = dungeonResult.players;
  const shouldGenerateApplications =
    Number(dayStepIndex) === 0 &&
    Number(population.lastApplicationDayIndex) !== safeDayIndex;
  const applicationResult = shouldGenerateApplications
    ? generatePlayerGuildApplications({
        applications: population.applications,
        players,
        guildFaction,
        dayIndex: safeDayIndex,
        random: safeRandom,
      })
    : {
        applications: normalizeRealmApplications(
          population.applications,
          players,
        ),
        added: 0,
      };
  const dungeonStats = dungeonResult.stats || {};
  const syncedGuilds = syncGuildRostersFromPopulation(
    dungeonResult.npcGuilds,
    players,
  );

  return {
    population: {
      ...population,
      players,
      applications: applicationResult.applications,
      lastArrivalDayIndex: safeDayIndex,
      lastApplicationDayIndex: shouldGenerateApplications
        ? safeDayIndex
        : population.lastApplicationDayIndex,
      dailyStats: mergeDailyStats(population.dailyStats, safeDayIndex, {
        arrivals,
        npcRecruits: recruitedResult.recruited,
        poached: poachResult.poached,
        applications: applicationResult.added,
        guildDungeonRuns: dungeonStats.guildDungeonRuns || 0,
        guildDungeonClears: dungeonStats.guildDungeonClears || 0,
        pugDungeonRuns: dungeonStats.pugDungeonRuns || 0,
        pugDungeonClears: dungeonStats.pugDungeonClears || 0,
        dungeonWipes: dungeonStats.dungeonWipes || 0,
      }),
    },
    npcGuilds: syncedGuilds,
    events: [
      ...lifecycleEvents,
      arrivals > 0
        ? {
            type: "population-arrivals",
            count: arrivals,
            message: `${arrivals} new adventurers arrived on the realm.`,
          }
        : null,
      recruitedResult.recruited > 0
        ? {
            type: "npc-recruitment",
            count: recruitedResult.recruited,
            message: `Realm guilds recruited ${recruitedResult.recruited} players.`,
          }
        : null,
      poachResult.poached > 0
        ? {
            type: "poaching",
            count: poachResult.poached,
            message: `${poachResult.poached} player changed guilds on the realm market.`,
          }
        : null,
      applicationResult.added > 0
        ? {
            type: "guild-applications",
            count: applicationResult.added,
            message: `${applicationResult.added} player${applicationResult.added === 1 ? "" : "s"} applied to join your guild.`,
          }
        : null,
      ...dungeonResult.events,
    ].filter(Boolean),
  };
};

export const selectRealmRecruitmentCandidates = ({
  realmState,
  faction,
  tier,
  count = 5,
  excludedPlayerIds = [],
  excludedNames = [],
  focus,
  random = Math.random,
} = {}) => {
  const minLevel = Math.max(1, Number(tier?.minLevel) || 1);
  const maxLevel = Math.max(minLevel, Number(tier?.maxLevel) || minLevel);
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  const safeRandom = typeof random === "function" ? random : Math.random;
  const safeFocus = normalizeRecruitmentScoutFocus(focus);
  const excludedIdSet = new Set(
    (Array.isArray(excludedPlayerIds) ? excludedPlayerIds : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  );
  const excludedNameSet = new Set(
    (Array.isArray(excludedNames) ? excludedNames : [])
      .map((name) => String(name || "").trim().toLocaleLowerCase())
      .filter(Boolean),
  );
  const availablePlayers = (Array.isArray(realmState?.population?.players)
    ? realmState.population.players
    : []
  ).filter(
    (player) =>
      player.faction === faction &&
      player.level >= minLevel &&
      player.level <= maxLevel &&
      !excludedIdSet.has(String(player.id || "")) &&
      !excludedNameSet.has(
        String(player.name || "").trim().toLocaleLowerCase(),
      ) &&
      (player.marketStatus === REALM_MARKET_STATUS.FREE_AGENT ||
        player.marketStatus === REALM_MARKET_STATUS.OPEN_TO_OFFERS),
  );

  const shuffledPlayers = [...availablePlayers];
  for (let index = shuffledPlayers.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(safeRandom() * (index + 1));
    [shuffledPlayers[index], shuffledPlayers[swapIndex]] = [
      shuffledPlayers[swapIndex],
      shuffledPlayers[index],
    ];
  }

  const classSupportsRole = (player, role) =>
    (DB_CLASSES?.[player?.charClass]?.allowedRoles || []).includes(role);
  const specializeForRole = (player, role) => ({ ...player, role });

  if (safeFocus === RECRUITMENT_SCOUT_FOCUS.RANDOM) {
    return shuffledPlayers.slice(0, safeCount);
  }

  const focusedRole =
    safeFocus === RECRUITMENT_SCOUT_FOCUS.TANK
      ? "Tank"
      : safeFocus === RECRUITMENT_SCOUT_FOCUS.HEALER
        ? "Healer"
        : safeFocus === RECRUITMENT_SCOUT_FOCUS.DPS
          ? "DPS"
          : null;
  if (focusedRole) {
    return shuffledPlayers
      .filter((player) => classSupportsRole(player, focusedRole))
      .slice(0, safeCount)
      .map((player) => specializeForRole(player, focusedRole));
  }

  const selected = [];
  const remaining = [...shuffledPlayers];
  const desiredRoles = Array.from({ length: safeCount }, (_, index) =>
    index === 0 ? "Tank" : index === 1 ? "Healer" : "DPS",
  );
  desiredRoles.forEach((role) => {
    const roleIndex = remaining.findIndex((player) =>
      classSupportsRole(player, role),
    );
    if (roleIndex < 0) return;
    selected.push(specializeForRole(remaining[roleIndex], role));
    remaining.splice(roleIndex, 1);
  });

  return selected;
};

export const getRealmRecruitmentMarketStats = ({
  realmState,
  faction = GUILD_FACTION.ALLIANCE,
} = {}) => {
  const availablePlayers = (Array.isArray(realmState?.population?.players)
    ? realmState.population.players
    : []
  ).filter(
    (player) =>
      player.faction === faction &&
      (player.marketStatus === REALM_MARKET_STATUS.FREE_AGENT ||
        player.marketStatus === REALM_MARKET_STATUS.OPEN_TO_OFFERS),
  );
  const levels = availablePlayers
    .map((player) => Math.max(1, Math.floor(Number(player?.level) || 1)))
    .filter((level) => Number.isFinite(level));
  const levelBands = [
    { id: "level_1_10", min: 1, max: 10 },
    { id: "level_11_20", min: 11, max: 20 },
    { id: "level_21_30", min: 21, max: 30 },
    { id: "level_31_40", min: 31, max: 40 },
    { id: "level_41_50", min: 41, max: 50 },
    { id: "level_51_60", min: 51, max: 60 },
  ].reduce((bands, band) => {
    bands[band.id] = levels.filter(
      (level) => level >= band.min && level <= band.max,
    ).length;
    return bands;
  }, {});

  return {
    availableCount: availablePlayers.length,
    freeAgentCount: availablePlayers.filter(
      (player) => player.marketStatus === REALM_MARKET_STATUS.FREE_AGENT,
    ).length,
    openToOffersCount: availablePlayers.filter(
      (player) => player.marketStatus === REALM_MARKET_STATUS.OPEN_TO_OFFERS,
    ).length,
    minLevel: levels.length > 0 ? Math.min(...levels) : null,
    maxLevel: levels.length > 0 ? Math.max(...levels) : null,
    averageLevel:
      levels.length > 0
        ? Math.round(
            (levels.reduce((sum, level) => sum + level, 0) / levels.length) * 10,
          ) / 10
        : null,
    levelBands,
  };
};

export const getRealmPlayersInZone = ({
  realmState,
  zoneId,
  limit = 80,
} = {}) => {
  const normalizedZoneId = String(zoneId || "").trim();
  if (!normalizedZoneId) return [];
  const players = Array.isArray(realmState?.population?.players)
    ? realmState.population.players
    : [];
  return players
    .filter((player) => String(player?.currentZoneId || "") === normalizedZoneId)
    .sort((left, right) => {
      const leftGuilded = left.guildId ? 0 : 1;
      const rightGuilded = right.guildId ? 0 : 1;
      if (leftGuilded !== rightGuilded) return leftGuilded - rightGuilded;
      if ((right.level || 0) !== (left.level || 0)) {
        return (right.level || 0) - (left.level || 0);
      }
      if ((right.zoneProgress || 0) !== (left.zoneProgress || 0)) {
        return (right.zoneProgress || 0) - (left.zoneProgress || 0);
      }
      return String(left.name || "").localeCompare(String(right.name || ""));
    })
    .slice(0, Math.max(0, Number(limit) || 80));
};

export const markRealmPlayersRecruited = ({ realmState, playerIds = [] } = {}) => {
  const idSet = new Set(playerIds.map((id) => String(id || "")).filter(Boolean));
  if (idSet.size === 0) return realmState;
  const population = normalizeRealmPopulation({
    population: realmState?.population,
    realmId: realmState?.id,
    npcGuilds: realmState?.npcGuilds,
  });
  const players = population.players.filter((player) => !idSet.has(player.id));
  const applications = normalizeRealmApplications(
    population.applications,
    population.players,
  ).filter((application) => !idSet.has(application.playerId));
  const npcGuilds = syncGuildRostersFromPopulation(realmState?.npcGuilds || [], players);
  return {
    ...realmState,
    npcGuilds,
    population: {
      ...population,
      players,
      applications,
      dailyStats: {
        ...population.dailyStats,
        playerGuildRecruits:
          (Number(population.dailyStats?.playerGuildRecruits) || 0) + idSet.size,
      },
    },
    news: capRealmNews([
      {
        id: `realm-news:recruit:${Date.now()}`,
        dayIndex: Math.max(0, Number(realmState?.lastSimulatedDayIndex) || 0),
        type: "player-recruitment",
        message: `Your guild recruited ${idSet.size} player${
          idSet.size === 1 ? "" : "s"
        } from the realm market.`,
      },
      ...(Array.isArray(realmState?.news) ? realmState.news : []),
    ]),
  };
};

export const releasePlayerGuildMemberToRealm = ({
  realmState,
  character,
  dayIndex = 0,
} = {}) => {
  if (!realmState || !character?.id) return realmState;
  const population = normalizeRealmPopulation({
    population: realmState?.population,
    realmId: realmState?.id,
    npcGuilds: realmState?.npcGuilds,
  });
  const characterId = String(character.id);
  const releasedPlayer = {
    ...character,
    id: characterId,
    guildId: null,
    sourceGuildName: null,
    marketStatus: "free_agent",
    loyalty: 50,
    arrivalDayIndex: Math.max(0, Math.floor(Number(dayIndex) || 0)),
  };
  const players = [
    ...population.players.filter((player) => String(player?.id) !== characterId),
    releasedPlayer,
  ];
  return {
    ...realmState,
    npcGuilds: syncGuildRostersFromPopulation(realmState?.npcGuilds || [], players),
    population: {
      ...population,
      players,
      applications: normalizeRealmApplications(population.applications, players),
    },
    news: capRealmNews([
      {
        id: `realm-news:guild-release:${characterId}:${dayIndex}`,
        dayIndex: Math.max(0, Math.floor(Number(dayIndex) || 0)),
        type: "guild-departure",
        message: `${character.name} left your guild and became a Free Agent.`,
      },
      ...(Array.isArray(realmState?.news) ? realmState.news : []),
    ]),
  };
};

export const declineRealmGuildApplications = ({
  realmState,
  applicationIds = [],
  playerIds = [],
} = {}) => {
  const applicationIdSet = new Set(
    applicationIds.map((id) => String(id || "").trim()).filter(Boolean),
  );
  const playerIdSet = new Set(
    playerIds.map((id) => String(id || "").trim()).filter(Boolean),
  );
  if (applicationIdSet.size === 0 && playerIdSet.size === 0) return realmState;

  const population = normalizeRealmPopulation({
    population: realmState?.population,
    realmId: realmState?.id,
    npcGuilds: realmState?.npcGuilds,
  });
  const applications = normalizeRealmApplications(
    population.applications,
    population.players,
  ).filter(
    (application) =>
      !applicationIdSet.has(application.id) &&
      !playerIdSet.has(application.playerId),
  );
  const declinedCount = population.applications.length - applications.length;

  return {
    ...realmState,
    population: {
      ...population,
      applications,
      dailyStats: {
        ...population.dailyStats,
        declinedApplications:
          (Number(population.dailyStats?.declinedApplications) || 0) +
          declinedCount,
      },
    },
  };
};

const convertCharacterToRealmPlayer = ({ character, guild, dayIndex }) =>
  createRealmPlayer({
    id: `realm-player:departed:${character.id}:${dayIndex}`,
    name: character.name,
    faction: guild.faction,
    race: character.race,
    charClass: character.charClass,
    role: character.role,
    level: character.level,
    itemLevel: getCharacterAverageItemLevel(character),
    activityLevel: 65,
    loyalty: 55,
    guildId: guild.id,
    marketStatus: REALM_MARKET_STATUS.GUILDED,
    sourceGuildName: guild.name,
  });

export const resolvePlayerGuildDeparturesForDay = ({
  realmState,
  roster = [],
  activeMissions = [],
  currentDayIndex = 0,
  guildFaction = GUILD_FACTION.ALLIANCE,
} = {}) => {
  const population = normalizeRealmPopulation({
    population: realmState?.population,
    realmId: realmState?.id,
    npcGuilds: realmState?.npcGuilds,
    currentDayIndex,
    playerRosterSize: roster.length,
  });
  const safeDay = Math.max(0, Math.floor(Number(currentDayIndex) || 0));
  if (safeDay <= (Number(population.lastPlayerMarketDayIndex) || 0)) {
    return { realmState, roster, events: [] };
  }
  const busyIds = new Set(
    (Array.isArray(activeMissions) ? activeMissions : []).flatMap((mission) =>
      Array.isArray(mission.memberIds) ? mission.memberIds.map(String) : [],
    ),
  );
  const npcGuilds = Array.isArray(realmState?.npcGuilds) ? realmState.npcGuilds : [];
  const openGuilds = npcGuilds.filter(
    (guild) =>
      guild.faction === guildFaction &&
      (Array.isArray(guild.roster) ? guild.roster.length : 0) < REALM_GUILD_ROSTER_CAP,
  );
  let nextRoster = [...roster];
  let players = [...population.players];
  const events = [];

  const departingMember = nextRoster.find((member) => {
    if (!member?.realmDepartureWarningDayIndex && member?.realmDepartureWarningDayIndex !== 0) return false;
    if (safeDay - Number(member.realmDepartureWarningDayIndex) < 3) return false;
    if (busyIds.has(String(member.id))) return false;
    return getCharacterMorale(member) < 40;
  });

  if (departingMember && openGuilds.length > 0) {
    const targetGuild =
      openGuilds[
        hashPopulationSeed(`${realmState?.id}:${safeDay}:${departingMember.id}`) %
          openGuilds.length
      ];
    nextRoster = nextRoster.filter((member) => member.id !== departingMember.id);
    players.push(convertCharacterToRealmPlayer({
      character: departingMember,
      guild: targetGuild,
      dayIndex: safeDay,
    }));
    events.push({
      type: "player-departure",
      memberName: departingMember.name,
      guildName: targetGuild.name,
      message: `${departingMember.name} left your guild for ${targetGuild.name}.`,
    });
  } else {
    const warningCandidate = nextRoster.find(
      (member) =>
        !member.realmDepartureWarningDayIndex &&
        member.realmDepartureWarningDayIndex !== 0 &&
        getCharacterMorale(member) < 35 &&
        !busyIds.has(String(member.id)),
    );
    if (warningCandidate) {
      nextRoster = nextRoster.map((member) =>
        member.id === warningCandidate.id
          ? {
              ...member,
              realmDepartureWarningDayIndex: safeDay,
              statusText: "Considering offers",
            }
          : member,
      );
      events.push({
        type: "player-departure-warning",
        memberName: warningCandidate.name,
        message: `${warningCandidate.name} is considering offers from other guilds.`,
      });
    }
  }

  const syncedGuilds = syncGuildRostersFromPopulation(npcGuilds, players);
  return {
    roster: nextRoster,
    events,
    realmState: {
      ...realmState,
      npcGuilds: syncedGuilds,
      population: {
        ...population,
        players,
        lastPlayerMarketDayIndex: safeDay,
        dailyStats: {
          ...population.dailyStats,
          playerDepartures:
            (Number(population.dailyStats?.playerDepartures) || 0) +
            events.filter((event) => event.type === "player-departure").length,
          departureWarnings:
            (Number(population.dailyStats?.departureWarnings) || 0) +
            events.filter((event) => event.type === "player-departure-warning").length,
        },
      },
      news: capRealmNews([
        ...events.map((event, index) => ({
          id: `realm-news:${safeDay}:${event.type}:${index}`,
          dayIndex: safeDay,
          type: event.type,
          message: event.message,
        })),
        ...(Array.isArray(realmState?.news) ? realmState.news : []),
      ]),
    },
  };
};
