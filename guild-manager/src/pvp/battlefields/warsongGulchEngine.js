import { createId as defaultCreateId } from "../../utils";
import {
  BATTLEFIELD_IDS,
  BATTLEFIELD_STATUS,
  WARSONG_GULCH,
} from "./battlefieldDefinitions";
import {
  calculateBattlefieldTeamProfile,
  estimateBattlefieldWinChance,
  generateAggregateEnemyTeam,
  getBattlegroundBracketForLevel,
  pickSpotlightCharacter,
} from "./battlefieldUtils";

const GAME_MINUTE_MS = 1000;
const MIN_PHASE_MS = 3 * GAME_MINUTE_MS;
const MAX_PHASE_MS = 5 * GAME_MINUTE_MS;
const MAX_PHASE_ADVANCES_PER_TICK = 12;

const randomBetween = (rng, min, max) => min + rng() * (max - min);

const clampChance = (value) => Math.max(8, Math.min(92, Math.round(value)));

const rollCapture = ({ attack, carrier, healer, defense, support = 0, rng }) => {
  const raw =
    42 +
    (Number(attack) - Number(defense)) * 0.28 +
    (Number(carrier) - Number(defense)) * 0.18 +
    Number(healer) * 0.08 +
    Number(support) * 0.08 +
    randomBetween(rng, -11, 11);
  return {
    chance: clampChance(raw),
    success: rng() * 100 < clampChance(raw),
  };
};

const getParticipantsById = (roster, participantIds) => {
  const participantIdSet = new Set(
    (Array.isArray(participantIds) ? participantIds : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  );
  return (Array.isArray(roster) ? roster : []).filter((member) =>
    participantIdSet.has(String(member?.id || "")),
  );
};

export const createWarsongGulchBattle = ({
  participants = [],
  playerFaction,
  now,
  currentDayIndex = 0,
  rng = Math.random,
  createId = defaultCreateId,
} = {}) => {
  const safeParticipants = (Array.isArray(participants) ? participants : [])
    .filter(Boolean)
    .slice(0, WARSONG_GULCH.teamSize);
  const bracket = getBattlegroundBracketForLevel(safeParticipants[0]?.level);
  const teamProfile = calculateBattlefieldTeamProfile(
    safeParticipants,
    WARSONG_GULCH.teamSize,
  );
  const enemyTeam = generateAggregateEnemyTeam({
    playerTeamProfile: teamProfile,
    playerFaction,
    bracket,
    rng,
  });
  const startTime = Math.max(0, Number(now) || 0);
  const maxDurationMs = WARSONG_GULCH.maxDurationMinutes * GAME_MINUTE_MS;

  return {
    id: createId(),
    battlefieldId: BATTLEFIELD_IDS.WARSONG_GULCH,
    name: WARSONG_GULCH.name,
    status: BATTLEFIELD_STATUS.IN_PROGRESS,
    startTime,
    startDay: Math.max(0, Math.floor(Number(currentDayIndex) || 0)),
    elapsedMinutes: 0,
    maxDurationMinutes: WARSONG_GULCH.maxDurationMinutes,
    maxDurationMs,
    finishTime: startTime + maxDurationMs,
    nextPhaseAt: startTime + randomBetween(rng, MIN_PHASE_MS, MAX_PHASE_MS),
    playerFaction,
    enemyFaction: enemyTeam.faction,
    playerScore: 0,
    enemyScore: 0,
    participantIds: safeParticipants.map((participant) => participant.id),
    enemyTeam,
    teamProfile,
    bracketId: bracket?.id || null,
    bracketLabel: bracket?.label || "Unknown",
    estimatedWinChance: estimateBattlefieldWinChance(teamProfile, enemyTeam),
    events: [],
    result: null,
    reward: null,
  };
};

const buildEvent = ({
  battle,
  type,
  summary,
  spotlight,
  playerScore = battle.playerScore,
  enemyScore = battle.enemyScore,
  logGlobal = false,
}) => ({
  id: defaultCreateId(),
  atMinute: Math.max(0, Math.round(Number(battle.elapsedMinutes) || 0)),
  type,
  summary,
  spotlightCharacterId: spotlight?.id || null,
  spotlightName: spotlight?.name || null,
  playerScore,
  enemyScore,
  logGlobal,
});

const resolvePlayerFlagAttempt = ({ battle, participants, rng }) => {
  const carrier = pickSpotlightCharacter(participants, "flagCarrier", rng);
  const roll = rollCapture({
    attack: battle.teamProfile.offensePower,
    carrier: battle.teamProfile.flagCarrierPower,
    healer: battle.teamProfile.healerPower,
    defense: battle.enemyTeam.defensePower,
    support: battle.teamProfile.coordination,
    rng,
  });
  if (roll.success) {
    const playerScore = battle.playerScore + 1;
    return {
      playerScore,
      event: buildEvent({
        battle,
        type: "player_capture",
        spotlight: carrier,
        playerScore,
        summary: `${carrier?.name || "Your flag carrier"} broke through and captured the flag.`,
        logGlobal: true,
      }),
    };
  }
  return {
    event: buildEvent({
      battle,
      type: "player_attempt_stopped",
      spotlight: carrier,
      summary: `${carrier?.name || "Your offense"} made a flag run, but ${battle.enemyTeam.name} stopped it.`,
    }),
  };
};

const resolveEnemyFlagAttempt = ({ battle, participants, rng }) => {
  const defender = pickSpotlightCharacter(participants, "defense", rng);
  const roll = rollCapture({
    attack: battle.enemyTeam.offensePower,
    carrier: battle.enemyTeam.flagCarrierPower,
    healer: battle.enemyTeam.healerPower,
    defense: battle.teamProfile.defensePower,
    support: battle.enemyTeam.coordination,
    rng,
  });
  if (roll.success) {
    const enemyScore = battle.enemyScore + 1;
    return {
      enemyScore,
      event: buildEvent({
        battle,
        type: "enemy_capture",
        spotlight: defender,
        enemyScore,
        summary: `${battle.enemyTeam.name} slipped past ${defender?.name || "your defense"} and captured the flag.`,
      }),
    };
  }
  return {
    event: buildEvent({
      battle,
      type: "defensive_stop",
      spotlight: defender,
      summary: `${defender?.name || "Your defense"} shut down an enemy flag run.`,
      logGlobal: false,
    }),
  };
};

const resolveMidfieldEvent = ({ battle, participants, rng }) => {
  const eventTypes = ["midfield_clash", "stalemate", "counterattack"];
  const eventType = eventTypes[Math.floor(rng() * eventTypes.length)] || "midfield_clash";
  const roleHint = eventType === "counterattack" ? "offense" : "midfield";
  const spotlight = pickSpotlightCharacter(participants, roleHint, rng);
  const summaries = {
    midfield_clash: `${spotlight?.name || "Your team"} won space in midfield, but no flag crossed.`,
    stalemate: `Both teams reset after a long midfield stalemate.`,
    counterattack: `${spotlight?.name || "Your offense"} sparked a counterattack, but the enemy recovered.`,
  };
  return {
    event: buildEvent({
      battle,
      type: eventType,
      spotlight,
      summary: summaries[eventType],
    }),
  };
};

const resolvePhase = ({ battle, participants, rng }) => {
  const roll = rng();
  if (roll < 0.34) return resolvePlayerFlagAttempt({ battle, participants, rng });
  if (roll < 0.68) return resolveEnemyFlagAttempt({ battle, participants, rng });
  return resolveMidfieldEvent({ battle, participants, rng });
};

export const getWarsongResult = (battle) => {
  if (battle.playerScore > battle.enemyScore) return "victory";
  if (battle.playerScore < battle.enemyScore) return "defeat";
  return "draw";
};

export const advanceWarsongGulchBattle = ({
  battle,
  roster,
  now,
  rng = Math.random,
} = {}) => {
  if (!battle || battle.status !== BATTLEFIELD_STATUS.IN_PROGRESS) {
    return { battle, logs: [] };
  }

  let nextBattle = { ...battle, events: Array.isArray(battle.events) ? [...battle.events] : [] };
  const participants = getParticipantsById(roster, nextBattle.participantIds);
  const logs = [];
  let phaseGuard = 0;
  const safeNow = Math.max(0, Number(now) || 0);

  while (
    nextBattle.status === BATTLEFIELD_STATUS.IN_PROGRESS &&
    nextBattle.nextPhaseAt <= safeNow &&
    phaseGuard < MAX_PHASE_ADVANCES_PER_TICK
  ) {
    phaseGuard += 1;
    nextBattle = {
      ...nextBattle,
      elapsedMinutes: Math.min(
        nextBattle.maxDurationMinutes,
        Math.round((nextBattle.nextPhaseAt - nextBattle.startTime) / GAME_MINUTE_MS),
      ),
    };
    const phaseResult = resolvePhase({ battle: nextBattle, participants, rng });
    nextBattle = {
      ...nextBattle,
      playerScore: phaseResult.playerScore ?? nextBattle.playerScore,
      enemyScore: phaseResult.enemyScore ?? nextBattle.enemyScore,
      events: [...nextBattle.events, phaseResult.event],
    };
    if (phaseResult.event?.logGlobal) {
      logs.push({
        type: "pvp",
        message: `Warsong Gulch: ${phaseResult.event.summary} (${nextBattle.playerScore}-${nextBattle.enemyScore}).`,
      });
    }

    const scoreComplete =
      nextBattle.playerScore >= WARSONG_GULCH.maxScore ||
      nextBattle.enemyScore >= WARSONG_GULCH.maxScore;
    const timeComplete = nextBattle.nextPhaseAt >= nextBattle.finishTime;
    if (scoreComplete || timeComplete) {
      nextBattle = {
        ...nextBattle,
        status: BATTLEFIELD_STATUS.COMPLETED,
        elapsedMinutes: Math.min(
          nextBattle.maxDurationMinutes,
          Math.round((Math.min(safeNow, nextBattle.finishTime) - nextBattle.startTime) / GAME_MINUTE_MS),
        ),
        completedAt: Math.min(safeNow, nextBattle.finishTime),
        result: getWarsongResult(nextBattle),
      };
      break;
    }

    nextBattle = {
      ...nextBattle,
      nextPhaseAt:
        nextBattle.nextPhaseAt + randomBetween(rng, MIN_PHASE_MS, MAX_PHASE_MS),
    };
  }

  if (
    nextBattle.status === BATTLEFIELD_STATUS.IN_PROGRESS &&
    safeNow >= nextBattle.finishTime
  ) {
    nextBattle = {
      ...nextBattle,
      status: BATTLEFIELD_STATUS.COMPLETED,
      elapsedMinutes: nextBattle.maxDurationMinutes,
      completedAt: nextBattle.finishTime,
      result: getWarsongResult(nextBattle),
    };
  }

  return { battle: nextBattle, logs };
};

