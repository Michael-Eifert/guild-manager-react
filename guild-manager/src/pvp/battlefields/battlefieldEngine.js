import { GUILD_FACTION } from "../../constants";
import {
  BATTLEFIELD_IDS,
  BATTLEFIELD_STATUS,
  WARSONG_GULCH,
} from "./battlefieldDefinitions";
import { applyBattlefieldRewards } from "./battlefieldRewards";
import {
  buildBattlefieldStatusRoster,
  calculateBattlefieldTeamProfile,
  ensureBattlefieldState,
  estimateBattlefieldWinChance,
  generateAggregateEnemyTeam,
  getAutomationForDay,
  getBattlegroundBracketForLevel,
  getEligibleBattlegroundCharacters,
  getPvpActivityConfig,
  groupCharactersByBattlegroundBracket,
} from "./battlefieldUtils";
import {
  advanceWarsongGulchBattle,
  createWarsongGulchBattle,
} from "./warsongGulchEngine";

const MAX_HISTORY_ENTRIES = 30;

export const validateWarsongQueue = ({ participants }) => {
  const selected = Array.isArray(participants) ? participants.filter(Boolean) : [];
  if (selected.length === 0) {
    return { valid: false, reason: "Select at least one eligible hero." };
  }
  if (selected.length > WARSONG_GULCH.teamSize) {
    return { valid: false, reason: `Warsong Gulch allows up to ${WARSONG_GULCH.teamSize} guild members.` };
  }
  const brackets = [
    ...new Set(
      selected
        .map((character) => getBattlegroundBracketForLevel(character?.level)?.id)
        .filter(Boolean),
    ),
  ];
  if (brackets.length !== 1 || selected.length !== brackets.length && brackets.length === 0) {
    return {
      valid: false,
      reason: "All selected heroes must be level 10+ and in the same bracket.",
    };
  }
  return { valid: true, bracketId: brackets[0], reason: "" };
};

export const startWarsongGulchBattle = ({
  battlefieldState,
  roster,
  participantIds,
  activeMissions = [],
  onlineMemberIds = null,
  guildFaction = GUILD_FACTION.ALLIANCE,
  now,
  currentDayIndex,
  rng = Math.random,
  createId,
  source = "manual",
} = {}) => {
  const state = ensureBattlefieldState(battlefieldState);
  const eligible = getEligibleBattlegroundCharacters({
    roster,
    activeMissions,
    battlefieldState: state,
    onlineMemberIds,
  });
  const eligibleById = new Map(eligible.map((member) => [String(member.id), member]));
  const participants = (Array.isArray(participantIds) ? participantIds : [])
    .map((id) => eligibleById.get(String(id || "")))
    .filter(Boolean)
    .slice(0, WARSONG_GULCH.teamSize);
  const validation = validateWarsongQueue({ participants });
  if (!validation.valid) {
    return {
      started: false,
      reason: validation.reason,
      battlefieldState: state,
      roster,
      battle: null,
      logs: [],
    };
  }

  const battle = createWarsongGulchBattle({
    participants,
    playerFaction: guildFaction,
    now,
    currentDayIndex,
    rng,
    createId,
  });
  const nextRoster = buildBattlefieldStatusRoster({
    roster,
    participantIds: battle.participantIds,
    active: true,
  });
  const logs = [
    {
      type: "pvp",
      battlefieldId: battle.id,
      message: `Warsong Gulch started with ${participants.length}/${WARSONG_GULCH.teamSize} guild members (${battle.bracketLabel}, ${battle.teamProfile.queueType}).`,
    },
  ];

  return {
    started: true,
    reason: "",
    battlefieldState: {
      ...state,
      activeBattles: [...state.activeBattles, { ...battle, source }],
    },
    roster: nextRoster,
    battle,
    logs,
  };
};

export const advanceBattlefieldState = ({
  battlefieldState,
  roster,
  now,
  guildFaction = GUILD_FACTION.ALLIANCE,
  rng = Math.random,
} = {}) => {
  const state = ensureBattlefieldState(battlefieldState);
  let nextRoster = Array.isArray(roster) ? roster : [];
  let logs = [];
  const activeBattles = [];
  const completedBattles = [];

  state.activeBattles.forEach((battle) => {
    const advanced =
      battle?.battlefieldId === BATTLEFIELD_IDS.WARSONG_GULCH
        ? advanceWarsongGulchBattle({ battle, roster: nextRoster, now, rng })
        : { battle, logs: [] };
    logs = [...logs, ...advanced.logs];
    if (advanced.battle?.status === BATTLEFIELD_STATUS.COMPLETED) {
      const rewarded = applyBattlefieldRewards({
        battle: advanced.battle,
        roster: nextRoster,
        faction: guildFaction,
        rng,
      });
      nextRoster = rewarded.roster;
      logs = [...logs, ...rewarded.logs];
      completedBattles.push(rewarded.battle);
    } else if (advanced.battle) {
      activeBattles.push(advanced.battle);
    }
  });

  return {
    battlefieldState: {
      ...state,
      activeBattles,
      history: [...completedBattles, ...state.history].slice(0, MAX_HISTORY_ENTRIES),
    },
    roster: nextRoster,
    logs,
    completedBattles,
  };
};

const buildAutoQueueCandidate = ({
  roster,
  activeMissions,
  battlefieldState,
  guildFaction,
  minGuildMembers,
  minWinChance,
  rng,
  onlineMemberIds,
}) => {
  const eligible = getEligibleBattlegroundCharacters({
    roster,
    activeMissions,
    battlefieldState,
    onlineMemberIds,
  });
  const grouped = groupCharactersByBattlegroundBracket(eligible);
  const candidates = Object.entries(grouped)
    .map(([bracketId, members]) => {
      const sorted = [...members].sort((left, right) => {
        const leftProfile = calculateBattlefieldTeamProfile([left], 1);
        const rightProfile = calculateBattlefieldTeamProfile([right], 1);
        return rightProfile.teamPower - leftProfile.teamPower;
      });
      const selected = sorted.slice(0, WARSONG_GULCH.teamSize);
      if (selected.length < minGuildMembers) return null;
      const teamProfile = calculateBattlefieldTeamProfile(
        selected,
        WARSONG_GULCH.teamSize,
      );
      const bracket = getBattlegroundBracketForLevel(selected[0]?.level);
      const enemyTeam = generateAggregateEnemyTeam({
        playerTeamProfile: teamProfile,
        playerFaction: guildFaction,
        bracket,
        rng,
      });
      const winChance = estimateBattlefieldWinChance(teamProfile, enemyTeam);
      return {
        bracketId,
        selected,
        winChance,
        teamPower: teamProfile.teamPower,
      };
    })
    .filter(Boolean)
    .filter((candidate) => candidate.winChance >= minWinChance)
    .sort((left, right) => {
      if (right.selected.length !== left.selected.length) {
        return right.selected.length - left.selected.length;
      }
      if (right.winChance !== left.winChance) return right.winChance - left.winChance;
      return right.teamPower - left.teamPower;
    });
  return candidates[0] || null;
};

export const resolveAutoBattlefieldQueue = ({
  battlefieldState,
  roster,
  activeMissions = [],
  guildSetup = {},
  now,
  currentDayIndex,
  guildFaction = GUILD_FACTION.ALLIANCE,
  rng = Math.random,
  createId,
  aggressiveOnly = false,
  onlineMemberIds = null,
} = {}) => {
  const state = ensureBattlefieldState(battlefieldState);
  const config = getPvpActivityConfig(guildSetup?.pvpActivityFocus);
  if (!config.autoQueue || config.aggressive !== aggressiveOnly) {
    return {
      queued: false,
      battlefieldState: state,
      roster,
      logs: [],
    };
  }
  const automation = getAutomationForDay(state.automation, currentDayIndex);
  const safeNow = Math.max(0, Number(now) || 0);
  if (automation.queuedToday >= config.dailyCap) {
    return {
      queued: false,
      battlefieldState: { ...state, automation },
      roster,
      logs: [],
    };
  }
  if (safeNow - automation.lastAttemptAt < config.attemptIntervalMs) {
    return {
      queued: false,
      battlefieldState: { ...state, automation },
      roster,
      logs: [],
    };
  }

  const nextAutomation = { ...automation, lastAttemptAt: safeNow };
  if (rng() > config.attemptChance) {
    return {
      queued: false,
      battlefieldState: { ...state, automation: nextAutomation },
      roster,
      logs: [],
    };
  }

  const candidate = buildAutoQueueCandidate({
    roster,
    activeMissions,
    battlefieldState: state,
    guildFaction,
    minGuildMembers: config.minGuildMembers,
    minWinChance: config.minWinChance,
    rng,
    onlineMemberIds,
  });
  if (!candidate) {
    return {
      queued: false,
      battlefieldState: { ...state, automation: nextAutomation },
      roster,
      logs: [],
    };
  }

  const started = startWarsongGulchBattle({
    battlefieldState: { ...state, automation: nextAutomation },
    roster,
    activeMissions,
    guildFaction,
    now: safeNow,
    currentDayIndex,
    rng,
    createId,
    source: "auto",
    onlineMemberIds,
    participantIds: candidate.selected.map((member) => member.id),
  });
  if (!started.started) {
    return {
      queued: false,
      battlefieldState: { ...state, automation: nextAutomation },
      roster,
      logs: [],
    };
  }

  return {
    queued: true,
    battlefieldState: {
      ...started.battlefieldState,
      automation: {
        ...nextAutomation,
        queuedToday: nextAutomation.queuedToday + 1,
      },
    },
    roster: started.roster,
    battle: started.battle,
    logs: [
      ...started.logs,
      {
        type: "pvp",
        message: `PvP Activity Focus queued Warsong Gulch (${config.label}) with ${candidate.selected.length} guild members and ${candidate.winChance}% estimated win chance.`,
      },
    ],
  };
};
