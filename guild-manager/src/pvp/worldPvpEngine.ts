import { GUILD_FACTION, GUILD_SERVER_STYLE } from "../constants";
import { applyMoraleDelta } from "../game/characterMorale";
import { getActiveMissionMemberIdSet } from "../missions/missionRosterGuards";
import { getRealmPlayersInZone } from "../server/realmPopulation";
import { getCharacterAverageItemLevel } from "../utils";
import { awardCharacterHonor } from "./pvpProgression";
import { ZONE_DEFINITIONS, getZoneById } from "../zones/zoneDefinitions";
import {
  WORLD_PVP_EVENT_TYPES,
  WORLD_PVP_OUTCOME,
  WORLD_PVP_PROFILE_TYPE,
  WORLD_PVP_TUNING,
} from "./worldPvpDefinitions";
import { getWorldPvpRewards } from "./worldPvpRewards";
import {
  applyWorldPvpZoneProgressDelta,
  ensureWorldPvpState,
  getOpposingFaction,
  getWorldPvpProfile,
  getWorldPvpRiskChance,
} from "./worldPvpUtils";
import type { WorldPvpProfile, WorldPvpState } from "./worldPvpUtils";
import type { WorldPvpOutcome } from "./worldPvpDefinitions";
import type { Character } from "../types/characterTypes";
import type { Mission } from "../types/missionTypes";

type ZoneDefinition = (typeof ZONE_DEFINITIONS)[number];
type RealmPlayer = {
  name: string;
  faction?: string;
  level?: number;
  sourceGuildName?: string;
};
type WorldPvpRewardBundle = ReturnType<typeof getWorldPvpRewards>;
export type WorldPvpEvent = {
  id: string;
  day: number;
  zoneId: string;
  zoneName: string;
  type: string;
  participantIds: string[];
  participantNames: string[];
  enemyName: string;
  enemyFaction: string;
  outcome: WorldPvpOutcome;
  summary: string;
  rewards: WorldPvpRewardBundle["rewards"];
  penalties: WorldPvpRewardBundle["penalties"];
  zoneProgressDelta: number;
  moraleDelta: number;
  partyPower: number;
  enemyPower: number;
};

const findRealmPlayersInZone = getRealmPlayersInZone as unknown as (options: {
  realmState: unknown;
  zoneId: string;
  limit?: number;
}) => RealmPlayer[];

const clampDay = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));

const pick = <T>(items: readonly T[], random: () => number): T => {
  const pool = Array.isArray(items) && items.length > 0 ? items : ["Skirmish"];
  return pool[Math.floor(random() * pool.length) % pool.length] as T;
};

const getCharacterId = (character: Character) =>
  String(character.id || character.name || "");

const isTankLike = (character: Character) =>
  character?.role === "Tank" || character?.charClass === "Warrior" || character?.charClass === "Druid";

const isHealerLike = (character: Character) =>
  character?.role === "Healer" ||
  character?.charClass === "Priest" ||
  character?.charClass === "Druid" ||
  character?.charClass === "Paladin" ||
  character?.charClass === "Shaman";

const isDpsLike = (character: Character) =>
  character.role === "DPS" || !isTankLike(character);

const average = (values: number[], fallback = 0) => {
  const safeValues = values.filter((value) => Number.isFinite(value));
  if (safeValues.length === 0) return fallback;
  return safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
};

const getRoleBalanceBonus = (characters: Character[]) => {
  let bonus = 0;
  if (characters.some(isTankLike)) bonus += 10;
  if (characters.some(isHealerLike)) bonus += 10;
  if (characters.some(isDpsLike)) bonus += 6;
  return bonus;
};

const getOutcome = (
  partyPower: number,
  enemyPower: number,
): WorldPvpOutcome => {
  const diff = partyPower - enemyPower;
  if (diff >= 45) return WORLD_PVP_OUTCOME.VICTORY;
  if (diff >= 15) return WORLD_PVP_OUTCOME.CLOSE_VICTORY;
  if (diff >= -15) return WORLD_PVP_OUTCOME.DRAW;
  if (diff >= -45) return WORLD_PVP_OUTCOME.RETREAT;
  return WORLD_PVP_OUTCOME.DEFEAT;
};

const getEnemyFlavor = ({
  realmState,
  zoneId,
  fallbackFaction,
  random,
}: {
  realmState: unknown;
  zoneId: string;
  fallbackFaction: string;
  random: () => number;
}) => {
  const realmPlayers = findRealmPlayersInZone({ realmState, zoneId, limit: 24 }).filter(
    (player) => player?.faction !== fallbackFaction,
  );
  const realmPlayer = realmPlayers.length > 0 ? pick(realmPlayers, random) : null;
  if (realmPlayer) {
    return {
      enemyName: realmPlayer.sourceGuildName
        ? `${realmPlayer.sourceGuildName} group`
        : `${realmPlayer.name}'s patrol`,
      enemyFaction: realmPlayer.faction || getOpposingFaction(fallbackFaction),
      enemyPowerBonus: Math.max(0, (Number(realmPlayer.level) || 1) * 2),
    };
  }
  const enemyFaction = getOpposingFaction(fallbackFaction);
  const enemyNames = [
    `${enemyFaction} patrol`,
    `${enemyFaction} ambush party`,
    "rival guild group",
    "roaming skirmishers",
  ];
  return {
    enemyName: pick(enemyNames, random),
    enemyFaction,
    enemyPowerBonus: 0,
  };
};

export const resolveWorldPvpEvent = ({
  charactersInZone = [],
  zone,
  pvpProfile,
  realmState,
  guildFaction = GUILD_FACTION.ALLIANCE,
  currentDayIndex = 0,
  random = Math.random,
}: {
  charactersInZone?: Character[];
  zone?: ZoneDefinition | null;
  pvpProfile?: WorldPvpProfile | null;
  realmState?: unknown;
  guildFaction?: string;
  currentDayIndex?: number;
  random?: () => number;
} = {}): WorldPvpEvent | null => {
  const participants = (Array.isArray(charactersInZone) ? charactersInZone : []).filter(Boolean);
  if (!zone || participants.length === 0 || !pvpProfile?.active) return null;

  const averageLevel = average(participants.map((character) => Number(character?.level) || 1), 1);
  const averageItemLevel = average(
    participants.map((character) => Number(getCharacterAverageItemLevel(character)) || 0),
    0,
  );
  const roleBalanceBonus = getRoleBalanceBonus(participants);
  const hostilePenalty =
    pvpProfile.pvpType === WORLD_PVP_PROFILE_TYPE.HOSTILE
      ? Math.max(0, Number(pvpProfile.hostileDisadvantage) || 0)
      : 0;
  const partyVariance = Math.round((random() - 0.5) * 40);
  const basePartyPower =
    averageLevel * 10 + averageItemLevel * 0.4 + participants.length * 8 + roleBalanceBonus;
  const partyPower = basePartyPower * (1 - hostilePenalty) + partyVariance;
  const enemyFlavor = getEnemyFlavor({
    realmState,
    zoneId: zone.id,
    fallbackFaction: guildFaction,
    random,
  });
  const zoneLevelAverage =
    (Math.max(1, Number(zone.minLevel) || 1) + Math.max(1, Number(zone.maxLevel) || 1)) / 2;
  const territoryDifficulty =
    pvpProfile.pvpType === WORLD_PVP_PROFILE_TYPE.CONTESTED ? 28 : 18;
  const enemyVariance = Math.round((random() - 0.5) * 42);
  const enemyPower =
    zoneLevelAverage * 10 +
    territoryDifficulty +
    enemyFlavor.enemyPowerBonus * 0.25 +
    enemyVariance;
  const outcome = getOutcome(partyPower, enemyPower);
  const eventType = pick(WORLD_PVP_EVENT_TYPES, random);
  const { rewards, penalties, zoneProgressDelta, moraleDelta } =
    getWorldPvpRewards(outcome);
  const participantNames = participants.map((character) => character?.name || "Unknown");
  const outcomeText = {
    [WORLD_PVP_OUTCOME.VICTORY]: "defeated",
    [WORLD_PVP_OUTCOME.CLOSE_VICTORY]: "barely pushed back",
    [WORLD_PVP_OUTCOME.DRAW]: "fought to a draw with",
    [WORLD_PVP_OUTCOME.RETREAT]: "retreated from",
    [WORLD_PVP_OUTCOME.DEFEAT]: "were defeated by",
  }[outcome];
  const joinedNames =
    participantNames.length <= 2
      ? participantNames.join(" and ")
      : `${participantNames.slice(0, -1).join(", ")}, and ${participantNames.at(-1)}`;

  return {
    id: `world-pvp:${zone.id}:${currentDayIndex}:${Math.floor(random() * 1000000)}`,
    day: clampDay(currentDayIndex),
    zoneId: zone.id,
    zoneName: zone.name,
    type: eventType,
    participantIds: participants.map(getCharacterId).filter(Boolean),
    participantNames,
    enemyName: enemyFlavor.enemyName,
    enemyFaction: enemyFlavor.enemyFaction,
    outcome,
    summary: `${joinedNames} ${outcomeText} ${enemyFlavor.enemyName} in ${zone.name}.`,
    rewards,
    penalties,
    zoneProgressDelta,
    moraleDelta,
    partyPower: Math.round(partyPower),
    enemyPower: Math.round(enemyPower),
  };
};

const recordEvent = ({
  state,
  event,
}: {
  state: WorldPvpState;
  event: WorldPvpEvent;
}): WorldPvpState => {
  const currentStats = state.zoneStats[event.zoneId] || {};
  const victoryCount =
    event.outcome === WORLD_PVP_OUTCOME.VICTORY ||
    event.outcome === WORLD_PVP_OUTCOME.CLOSE_VICTORY
      ? 1
      : 0;
  const defeatCount =
    event.outcome === WORLD_PVP_OUTCOME.DEFEAT ||
    event.outcome === WORLD_PVP_OUTCOME.RETREAT
      ? 1
      : 0;
  return {
    ...state,
    totalHonor: state.totalHonor + event.rewards.honor,
    weeklyHonor: state.weeklyHonor + event.rewards.weeklyHonor,
    pvpReputation: state.pvpReputation + event.rewards.pvpReputation,
    zoneStats: {
      ...state.zoneStats,
      [event.zoneId]: {
        eventsTriggered: Math.max(0, Number(currentStats.eventsTriggered) || 0) + 1,
        victories: Math.max(0, Number(currentStats.victories) || 0) + victoryCount,
        defeats: Math.max(0, Number(currentStats.defeats) || 0) + defeatCount,
        honorEarned:
          Math.max(0, Number(currentStats.honorEarned) || 0) + event.rewards.honor,
        lastEventDay: event.day,
      },
    },
  };
};

const eventToLog = (event: WorldPvpEvent) => ({
  type: "pvp",
  dayIndex: event.day,
  zoneId: event.zoneId,
  zoneName: event.zoneName,
  missionName: event.zoneName,
  eventType: event.type,
  outcome: event.outcome,
  characterNames: event.participantNames,
  enemyName: event.enemyName,
  enemyFaction: event.enemyFaction,
  summary: event.summary,
  rewards: event.rewards,
  penalties: event.penalties,
  honor: event.rewards.honor,
  pvpReputation: event.rewards.pvpReputation,
});

const getEventHonorableKills = (event: WorldPvpEvent) =>
  event?.outcome === WORLD_PVP_OUTCOME.VICTORY ||
  event?.outcome === WORLD_PVP_OUTCOME.CLOSE_VICTORY
    ? 1
    : 0;

export const resolveWorldPvpForDay = ({
  roster = [],
  activeMissions = [],
  realmState = null,
  guildFaction = GUILD_FACTION.ALLIANCE,
  realmType = GUILD_SERVER_STYLE.PVE,
  worldPvpState = null,
  currentDayIndex = 0,
  random = Math.random,
}: {
  roster?: Character[];
  activeMissions?: Mission[];
  realmState?: unknown;
  guildFaction?: string;
  realmType?: string;
  worldPvpState?: unknown;
  currentDayIndex?: number;
  random?: () => number;
} = {}) => {
  const safeDay = clampDay(currentDayIndex);
  const originalState = worldPvpState;
  let nextState = ensureWorldPvpState(worldPvpState);
  if (safeDay <= nextState.lastProcessedDayIndex) {
    return {
      roster,
      worldPvpState: originalState || nextState,
      events: [],
      logs: [],
    };
  }
  nextState = { ...nextState, lastProcessedDayIndex: safeDay };
  if (realmType !== GUILD_SERVER_STYLE.PVP) {
    return {
      roster,
      worldPvpState: nextState,
      events: [],
      logs: [],
    };
  }

  const busyMemberIds = getActiveMissionMemberIdSet(activeMissions);
  const eligibleCharacters = (Array.isArray(roster) ? roster : []).filter((character) => {
    const memberId = getCharacterId(character);
    return (
      memberId &&
      character?.currentZoneId &&
      character?.status !== "Questing" &&
      character?.status !== "Battleground" &&
      !busyMemberIds.has(memberId)
    );
  });
  const charactersByZone = eligibleCharacters.reduce<Map<string, Character[]>>((groups, character) => {
    const zoneId = String(character.currentZoneId || "");
    if (!zoneId) return groups;
    const group = groups.get(zoneId);
    if (group) group.push(character);
    else groups.set(zoneId, [character]);
    return groups;
  }, new Map());

  const events: WorldPvpEvent[] = [];
  const logs: ReturnType<typeof eventToLog>[] = [];
  let nextRoster = roster;
  const touchedZones = new Set<string>();
  const zoneOrder = ZONE_DEFINITIONS.map((zone) => zone.id).filter((zoneId) =>
    charactersByZone.has(zoneId),
  );

  for (const zoneId of zoneOrder) {
    if (events.length >= WORLD_PVP_TUNING.MAX_EVENTS_PER_DAY) break;
    if (touchedZones.has(zoneId)) continue;
    const zone = getZoneById(zoneId);
    const charactersInZone = charactersByZone.get(zoneId) || [];
    const profile = getWorldPvpProfile({
      zone,
      characterFaction: guildFaction,
      realmType,
    });
    const chance = getWorldPvpRiskChance({ profile, characters: charactersInZone });
    if (chance <= 0 || random() >= chance) continue;
    const event = resolveWorldPvpEvent({
      charactersInZone,
      zone,
      pvpProfile: profile,
      realmState,
      guildFaction,
      currentDayIndex: safeDay,
      random,
    });
    if (!event) continue;

    touchedZones.add(zoneId);
    events.push(event);
    logs.push(eventToLog(event));
    nextState = recordEvent({ state: nextState, event });
    nextRoster = nextRoster.map((character) => {
      const memberId = getCharacterId(character);
      if (!event.participantIds.includes(memberId)) return character;
      const progressed = applyWorldPvpZoneProgressDelta(
        character,
        event.zoneId,
        event.zoneProgressDelta,
      );
      const moraleAdjusted = event.moraleDelta
        ? applyMoraleDelta(progressed, event.moraleDelta)
        : progressed;
      return awardCharacterHonor(
        moraleAdjusted,
        {
          honor: event.rewards.honor,
          honorableKills: getEventHonorableKills(event),
        },
        guildFaction,
      );
    });
  }

  return {
    roster: nextRoster,
    worldPvpState: nextState,
    events,
    logs,
  };
};
