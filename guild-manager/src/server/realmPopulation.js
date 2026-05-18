import {
  CONFIG,
  FACTION_RACES,
  GUILD_FACTION,
} from "../constants";
import { getCharacterMorale } from "../game/characterMorale";
import {
  buildCharacterNamePool,
  getCharacterAverageItemLevel,
  pickUniqueCharacterName,
} from "../utils";
import {
  normalizeCharacterPersonalityTraits,
  rollCharacterPersonalityTraits,
} from "../game/characterPersonality";
import {
  getStarterZoneIdForRace,
  getZoneById,
  isZoneAccessibleForFaction,
  pickNextZoneForCharacter,
} from "../zones/zoneDefinitions";
import {
  REALM_DAILY_ARRIVAL_RANGE,
  REALM_GUILD_APPLICATION_CAP,
  REALM_GUILD_ROSTER_CAP,
  REALM_MARKET_STATUS,
  REALM_POPULATION_SOFT_CAP,
  REALM_POPULATION_START,
} from "./realmDefinitions";
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

const CLASS_POOL_BY_FACTION = Object.freeze({
  [GUILD_FACTION.ALLIANCE]: Object.freeze([
    "Warrior",
    "Paladin",
    "Hunter",
    "Rogue",
    "Priest",
    "Mage",
    "Warlock",
    "Druid",
  ]),
  [GUILD_FACTION.HORDE]: Object.freeze([
    "Warrior",
    "Shaman",
    "Hunter",
    "Rogue",
    "Priest",
    "Mage",
    "Warlock",
    "Druid",
  ]),
});

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

const getRoleForClass = (charClass) => ROLE_BY_CLASS[charClass] || "DPS";

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
    softCap: Math.max(
      REALM_POPULATION_SOFT_CAP,
      Number(population.currentSoftCap) || REALM_POPULATION_SOFT_CAP,
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
}) => ({
  id: String(id || "").trim(),
  name: String(name || "Realm Player").trim(),
  faction,
  race,
  gender,
  charClass,
  role: role || getRoleForClass(charClass),
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
});

const generateFreeAgent = ({ realmId, index, random, usedNameKeys }) => {
  const faction = random() < 0.5 ? GUILD_FACTION.ALLIANCE : GUILD_FACTION.HORDE;
  const classPool = CLASS_POOL_BY_FACTION[faction];
  const charClass = pickFrom(classPool, random);
  const race = pickFrom(FACTION_RACES[faction], random);
  const gender = random() > 0.5 ? "Male" : "Female";
  const level = Math.round(clampNumber(1 + random() * 58, 1, CONFIG.LEVEL_CAP));
  const itemLevel = Math.round(clampNumber(level * 0.75 + random() * 8, 0, 100));
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
  });
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
} = {}) => {
  const safePopulation = population && typeof population === "object" ? population : {};
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

  return {
    currentSoftCap: Math.max(
      REALM_POPULATION_SOFT_CAP,
      Number(safePopulation.currentSoftCap) || REALM_POPULATION_SOFT_CAP,
    ),
    startedAt: Math.max(
      REALM_POPULATION_START,
      Number(safePopulation.startedAt) || REALM_POPULATION_START,
    ),
    players,
    applications,
    lastArrivalDayIndex: Number.isFinite(Number(safePopulation.lastArrivalDayIndex))
      ? Math.max(0, Math.floor(Number(safePopulation.lastArrivalDayIndex)))
      : Math.max(0, Math.floor(Number(currentDayIndex) || 0)),
    lastPlayerMarketDayIndex: Number.isFinite(
      Number(safePopulation.lastPlayerMarketDayIndex),
    )
      ? Math.max(0, Math.floor(Number(safePopulation.lastPlayerMarketDayIndex)))
      : Math.max(0, Math.floor(Number(currentDayIndex) || 0)),
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

const advanceRealmPlayerZoneForDay = ({ player, random, guilded }) => {
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
  const gain = (guilded ? 11 : 7) * activity + 2 + random() * 3;
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

const advanceRealmPlayerForDay = (player, random) => {
  const guilded = Boolean(player.guildId);
  const activity = clampNumber(player.activityLevel, 1, 100) / 100;
  const levelChance = (guilded ? 0.12 : 0.075) * activity;
  const itemChance = (guilded ? 0.18 : 0.08) * activity;
  const level =
    player.level < CONFIG.LEVEL_CAP && random() < levelChance
      ? player.level + 1
      : player.level;
  const itemLevel =
    random() < itemChance
      ? Math.min(100, player.itemLevel + (guilded ? 2 : 1))
      : player.itemLevel;
  const loyaltyDelta = guilded ? (random() < 0.18 ? 1 : 0) : 0;
  const loyalty = clampNumber(player.loyalty + loyaltyDelta, 1, 100);
  const marketStatus =
    player.guildId && loyalty < 35
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
  });
  return {
    ...player,
    level: zoneState.level,
    itemLevel: zoneState.itemLevel,
    loyalty,
    marketStatus,
    currentZoneId: zoneState.currentZoneId,
    zoneProgress: zoneState.zoneProgress,
    zonesCleared: zoneState.zonesCleared,
  };
};

const syncGuildRostersFromPopulation = (npcGuilds, players) =>
  npcGuilds.map((guild) => {
    const roster = players
      .filter((player) => player.guildId === guild.id)
      .slice(0, REALM_GUILD_ROSTER_CAP)
      .map((player) => ({
        id: player.id,
        name: player.name,
        level: player.level,
        itemLevel: player.itemLevel,
        race: player.race,
        charClass: player.charClass,
        role: player.role,
      }));
    const averageLevel =
      roster.length > 0
        ? roster.reduce((sum, member) => sum + member.level, 0) / roster.length
        : guild.averageLevel;
    const averageGearScore =
      roster.length > 0
        ? roster.reduce((sum, member) => sum + member.itemLevel, 0) / roster.length
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

const recruitNpcGuilds = ({ npcGuilds, players, random }) => {
  let recruited = 0;
  const nextPlayers = [...players];
  const guilds = [...npcGuilds]
    .sort((left, right) => (right.reputation || 0) - (left.reputation || 0));

  guilds.forEach((guild) => {
    const currentSize = nextPlayers.filter((player) => player.guildId === guild.id).length;
    const openSlots = Math.max(0, REALM_GUILD_ROSTER_CAP - currentSize);
    if (openSlots <= 0) return;
    const attempts = Math.min(openSlots, random() < 0.6 ? 2 : 1);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const index = nextPlayers.findIndex(
        (player) =>
          !player.guildId &&
          player.faction === guild.faction &&
          player.marketStatus === REALM_MARKET_STATUS.FREE_AGENT,
      );
      if (index < 0) break;
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
  const scheduledApplicationDay = Math.max(0, Number(dayIndex) || 0) % 3 === 0;
  if (openSlots <= 0 || (!scheduledApplicationDay && random() > 0.58)) {
    return { applications: existingApplications, added: 0 };
  }

  const addCount = Math.min(openSlots, random() < 0.16 ? 2 : 1);
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

export const advanceRealmPopulationForDay = ({
  realmState,
  npcGuilds,
  dayIndex,
  playerRosterSize = 0,
  guildFaction = GUILD_FACTION.ALLIANCE,
  random,
} = {}) => {
  const safeRandom = typeof random === "function" ? random : Math.random;
  const population = normalizeRealmPopulation({
    population: realmState?.population,
    realmId: realmState?.id,
    npcGuilds,
    currentDayIndex: dayIndex,
    playerRosterSize,
  });
  const softCap = population.currentSoftCap;
  let players = population.players.map((player) =>
    advanceRealmPlayerForDay(player, safeRandom),
  );
  const currentTotal = players.length + playerRosterSize;
  const arrivalRoll =
    REALM_DAILY_ARRIVAL_RANGE[0] +
    Math.floor(
      safeRandom() *
        (REALM_DAILY_ARRIVAL_RANGE[1] - REALM_DAILY_ARRIVAL_RANGE[0] + 1),
    );
  const arrivals = Math.max(0, Math.min(arrivalRoll, softCap - currentTotal));
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
          index: players.length + index + dayIndex * 1000,
          random: safeRandom,
          usedNameKeys,
        }),
      ),
    );
  }

  const recruitedResult = recruitNpcGuilds({ npcGuilds, players, random: safeRandom });
  players = recruitedResult.players;
  const poachResult = poachNpcGuildMembers({ npcGuilds, players, random: safeRandom });
  players = poachResult.players;
  const applicationResult = generatePlayerGuildApplications({
    applications: population.applications,
    players,
    guildFaction,
    dayIndex,
    random: safeRandom,
  });

  const guildDungeonRuns = Math.floor(
    players.filter((player) => player.guildId && player.level >= 15).length / 35,
  );
  const pugDungeonRuns = Math.floor(
    players.filter((player) => !player.guildId && player.level >= 15).length / 85,
  );
  const syncedGuilds = syncGuildRostersFromPopulation(npcGuilds, players).map(
    (guild) => ({
      ...guild,
      dungeonScore:
        Math.round(Number(guild.dungeonScore) || 0) +
        Math.round(guildDungeonRuns * ((Number(guild.activityLevel) || 50) / 100)),
    }),
  );

  return {
    population: {
      ...population,
      players,
      applications: applicationResult.applications,
      lastArrivalDayIndex: dayIndex,
      dailyStats: {
        dayIndex,
        arrivals,
        npcRecruits: recruitedResult.recruited,
        poached: poachResult.poached,
        applications: applicationResult.added,
        guildDungeonRuns,
        pugDungeonRuns,
      },
    },
    npcGuilds: syncedGuilds,
    events: [
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
      guildDungeonRuns + pugDungeonRuns > 0
        ? {
            type: "realm-dungeons",
            guildDungeonRuns,
            pugDungeonRuns,
            message: `${guildDungeonRuns} guild dungeon run${guildDungeonRuns === 1 ? "" : "s"} and ${pugDungeonRuns} pug run${pugDungeonRuns === 1 ? "" : "s"} formed across the realm.`,
          }
        : null,
    ].filter(Boolean),
  };
};

export const selectRealmRecruitmentCandidates = ({
  realmState,
  faction,
  tier,
  count = 5,
} = {}) => {
  const minLevel = Math.max(1, Number(tier?.minLevel) || 1);
  const maxLevel = Math.max(minLevel, Number(tier?.maxLevel) || minLevel);
  return (Array.isArray(realmState?.population?.players)
    ? realmState.population.players
    : []
  )
    .filter(
      (player) =>
        player.faction === faction &&
        player.level >= minLevel &&
        player.level <= maxLevel &&
        (player.marketStatus === REALM_MARKET_STATUS.FREE_AGENT ||
          player.marketStatus === REALM_MARKET_STATUS.OPEN_TO_OFFERS),
    )
    .sort((left, right) => {
      if (left.guildId !== right.guildId) return left.guildId ? 1 : -1;
      if ((right.itemLevel || 0) !== (left.itemLevel || 0)) {
        return (right.itemLevel || 0) - (left.itemLevel || 0);
      }
      return String(left.name || "").localeCompare(String(right.name || ""));
    })
    .slice(0, count);
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
    news: [
      {
        id: `realm-news:recruit:${Date.now()}`,
        dayIndex: Math.max(0, Number(realmState?.lastSimulatedDayIndex) || 0),
        type: "player-recruitment",
        message: `Your guild recruited ${idSet.size} player${idSet.size === 1 ? "" : "s"} from the realm market.`,
      },
      ...(Array.isArray(realmState?.news) ? realmState.news : []),
    ].slice(0, 25),
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
      news: [
        ...events.map((event, index) => ({
          id: `realm-news:${safeDay}:${event.type}:${index}`,
          dayIndex: safeDay,
          type: event.type,
          message: event.message,
        })),
        ...(Array.isArray(realmState?.news) ? realmState.news : []),
      ].slice(0, 25),
    },
  };
};
