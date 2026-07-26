import { GUILD_FACTION } from "../../constants";
import { getCharacterAverageItemLevel } from "../../utils";
import {
  BATTLEFIELD_CHARACTER_STATUS,
  BATTLEFIELD_STATUS,
  BATTLEGROUND_BRACKETS,
  DEFAULT_PVP_ACTIVITY_FOCUS,
  PVP_ACTIVITY_FOCUS,
  WARSONG_GULCH,
  getOpposingFaction,
} from "./battlefieldDefinitions";

const MAX_HISTORY_ENTRIES = 30;
const AUTO_QUEUE_ATTEMPT_INTERVAL_MS = 60 * 1000;

const normalizeId = (value) => String(value || "").trim();

const normalizeIdList = (value) => [
  ...new Set(
    (Array.isArray(value) ? value : [])
      .map(normalizeId)
      .filter(Boolean),
  ),
];

export const ensureBattlefieldState = (state) => {
  const safe = state && typeof state === "object" ? state : {};
  return {
    activeBattles: Array.isArray(safe.activeBattles)
      ? safe.activeBattles.filter(Boolean)
      : [],
    history: Array.isArray(safe.history)
      ? safe.history.filter(Boolean).slice(0, MAX_HISTORY_ENTRIES)
      : [],
    automation:
      safe.automation && typeof safe.automation === "object"
        ? {
            dayIndex: Math.max(0, Math.floor(Number(safe.automation.dayIndex) || 0)),
            queuedToday: Math.max(
              0,
              Math.floor(Number(safe.automation.queuedToday) || 0),
            ),
            lastAttemptAt: Math.max(0, Number(safe.automation.lastAttemptAt) || 0),
          }
        : { dayIndex: 0, queuedToday: 0, lastAttemptAt: 0 },
  };
};

export const getBattlegroundBracketForLevel = (level) => {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return (
    BATTLEGROUND_BRACKETS.find(
      (bracket) => safeLevel >= bracket.minLevel && safeLevel <= bracket.maxLevel,
    ) || null
  );
};

export const groupCharactersByBattlegroundBracket = (characters) => {
  const groups = {};
  BATTLEGROUND_BRACKETS.forEach((bracket) => {
    groups[bracket.id] = [];
  });
  (Array.isArray(characters) ? characters : []).forEach((character) => {
    const bracket = getBattlegroundBracketForLevel(character?.level);
    if (!bracket) return;
    groups[bracket.id].push(character);
  });
  return groups;
};

export const getActiveBattlefieldMemberIdSet = (battlefieldState) =>
  new Set(
    ensureBattlefieldState(battlefieldState).activeBattles.flatMap((battle) =>
      normalizeIdList(battle?.participantIds),
    ),
  );

export const getEligibleBattlegroundCharacters = ({
  roster = [],
  activeMissions = [],
  battlefieldState = null,
  onlineMemberIds = null,
} = {}) => {
  const activeMissionIds = new Set(
    (Array.isArray(activeMissions) ? activeMissions : []).flatMap((mission) =>
      normalizeIdList(mission?.memberIds),
    ),
  );
  const activeBattleIds = getActiveBattlefieldMemberIdSet(battlefieldState);
  const onlineIds =
    onlineMemberIds instanceof Set
      ? onlineMemberIds
      : Array.isArray(onlineMemberIds)
        ? new Set(onlineMemberIds.map(String))
        : null;

  return (Array.isArray(roster) ? roster : []).filter((character) => {
    const id = normalizeId(character?.id);
    if (!id || activeMissionIds.has(id) || activeBattleIds.has(id)) return false;
    if (onlineIds && !onlineIds.has(id)) return false;
    if ((Number(character?.level) || 1) < WARSONG_GULCH.minLevel) return false;
    if (character?.isDismissed || character?.dead || character?.isDead) return false;
    const status = String(character?.status || "Idle");
    return (
      status === "Idle" ||
      status.includes("Mining") ||
      status.includes("Herbs") ||
      status.includes("Skinning") ||
      status.includes("Forging") ||
      status.includes("Stitching") ||
      status.includes("Weaving") ||
      status.includes("Disenchanting") ||
      status.includes("Brewing")
    );
  });
};

export const normalizePvpActivityFocus = (value) =>
  Object.values(PVP_ACTIVITY_FOCUS).includes(value)
    ? value
    : DEFAULT_PVP_ACTIVITY_FOCUS;

export const getPvpActivityConfig = (setting) => {
  const normalized = normalizePvpActivityFocus(setting);
  if (normalized === PVP_ACTIVITY_FOCUS.LOW) {
    return {
      setting: normalized,
      label: "25%",
      autoQueue: true,
      aggressive: false,
      minGuildMembers: 10,
      minWinChance: 58,
      dailyCap: 1,
      attemptChance: 0.15,
      attemptIntervalMs: AUTO_QUEUE_ATTEMPT_INTERVAL_MS,
    };
  }
  if (normalized === PVP_ACTIVITY_FOCUS.MEDIUM) {
    return {
      setting: normalized,
      label: "50%",
      autoQueue: true,
      aggressive: false,
      minGuildMembers: 8,
      minWinChance: 50,
      dailyCap: 2,
      attemptChance: 0.35,
      attemptIntervalMs: AUTO_QUEUE_ATTEMPT_INTERVAL_MS,
    };
  }
  if (normalized === PVP_ACTIVITY_FOCUS.HIGH) {
    return {
      setting: normalized,
      label: "75%",
      autoQueue: true,
      aggressive: true,
      minGuildMembers: 6,
      minWinChance: 44,
      dailyCap: 3,
      attemptChance: 0.65,
      attemptIntervalMs: AUTO_QUEUE_ATTEMPT_INTERVAL_MS,
    };
  }
  if (normalized === PVP_ACTIVITY_FOCUS.MAX) {
    return {
      setting: normalized,
      label: "As much as possible",
      autoQueue: true,
      aggressive: true,
      minGuildMembers: 4,
      minWinChance: 38,
      dailyCap: 4,
      attemptChance: 1,
      attemptIntervalMs: AUTO_QUEUE_ATTEMPT_INTERVAL_MS,
    };
  }
  return {
    setting: PVP_ACTIVITY_FOCUS.AVOID,
    label: "Avoid",
    autoQueue: false,
    aggressive: false,
    minGuildMembers: Infinity,
    minWinChance: 101,
    dailyCap: 0,
    attemptChance: 0,
    attemptIntervalMs: AUTO_QUEUE_ATTEMPT_INTERVAL_MS,
  };
};

const classIncludes = (character, names) => {
  const className = String(character?.class || character?.className || "").toLowerCase();
  return names.some((name) => className.includes(name));
};

const getRoleText = (character) =>
  `${character?.role || ""} ${character?.spec || ""}`.toLowerCase();

const getCharacterPvpRank = (character) =>
  Math.max(0, Number(character?.pvp?.rank || character?.pvp?.highestRank) || 0);

export const getCharacterBattlefieldWeight = (character, roleHint = "overall") => {
  const level = Math.max(1, Number(character?.level) || 1);
  const itemLevel = Math.max(0, getCharacterAverageItemLevel(character));
  const pvpRank = getCharacterPvpRank(character);
  const roleText = getRoleText(character);
  let score = level * 2 + itemLevel * 0.75 + pvpRank * 3;

  if (roleHint === "healer") {
    if (roleText.includes("healer")) score += 18;
    if (classIncludes(character, ["priest", "druid", "paladin", "shaman"])) score += 8;
  } else if (roleHint === "flagCarrier") {
    if (roleText.includes("tank")) score += 12;
    if (classIncludes(character, ["druid", "warrior", "paladin", "shaman"])) score += 10;
    if (classIncludes(character, ["rogue"])) score += 4;
  } else if (roleHint === "defense") {
    if (roleText.includes("tank")) score += 10;
    if (classIncludes(character, ["hunter", "rogue", "warrior", "paladin"])) score += 8;
  } else if (roleHint === "offense" || roleHint === "midfield") {
    if (roleText.includes("dps")) score += 8;
    if (classIncludes(character, ["mage", "warlock", "rogue", "hunter", "warrior"])) score += 8;
  }

  return Math.max(1, score);
};

const average = (values) => {
  const safeValues = values.filter((value) => Number.isFinite(value));
  if (safeValues.length === 0) return 0;
  return safeValues.reduce((total, value) => total + value, 0) / safeValues.length;
};

export const calculateBattlefieldTeamProfile = (participants, teamSize = 10) => {
  const members = Array.isArray(participants) ? participants.filter(Boolean) : [];
  const guildMemberCount = members.length;
  const pugCount = Math.max(0, teamSize - guildMemberCount);
  const averageLevel = average(members.map((member) => Number(member?.level) || 1));
  const averageItemLevel = average(members.map(getCharacterAverageItemLevel));
  const averagePvpRank = average(members.map(getCharacterPvpRank));
  const sizeCompleteness = Math.min(1, guildMemberCount / Math.max(1, teamSize));
  const pugBaseline = Math.max(18, averageLevel * 2 + averageItemLevel * 0.45);
  const roleAverage = (roleHint) =>
    average([
      ...members.map((member) => getCharacterBattlefieldWeight(member, roleHint)),
      ...Array.from({ length: pugCount }, () => pugBaseline),
    ]);

  const coordination = Math.round(35 + sizeCompleteness * 45 + averagePvpRank * 1.5);
  const teamPower = roleAverage("overall") + coordination * 0.25;

  return {
    teamSize,
    guildMemberCount,
    pugCount,
    queueType:
      guildMemberCount >= teamSize
        ? "Full premade"
        : guildMemberCount >= 6
          ? "Partial premade"
          : "PUG-assisted group",
    averageLevel: Number(averageLevel.toFixed(1)),
    averageItemLevel: Number(averageItemLevel.toFixed(1)),
    averagePvpRank: Number(averagePvpRank.toFixed(1)),
    teamPower: Math.round(teamPower),
    offensePower: Math.round(roleAverage("offense")),
    defensePower: Math.round(roleAverage("defense")),
    flagCarrierPower: Math.round(roleAverage("flagCarrier")),
    healerPower: Math.round(roleAverage("healer")),
    midfieldPower: Math.round(roleAverage("midfield")),
    coordination: Math.max(1, Math.round(coordination)),
  };
};

export const estimateBattlefieldWinChance = (teamProfile, enemyTeam) => {
  const playerPower =
    Number(teamProfile?.teamPower) +
    Number(teamProfile?.coordination || 0) * 0.25 +
    Number(teamProfile?.healerPower || 0) * 0.15;
  const enemyPower =
    Number(enemyTeam?.teamPower) +
    Number(enemyTeam?.coordination || 0) * 0.25 +
    Number(enemyTeam?.healerPower || 0) * 0.15;
  const difference = playerPower - enemyPower;
  return Math.max(8, Math.min(92, Math.round(50 + difference / 3)));
};

export const generateAggregateEnemyTeam = ({
  playerTeamProfile,
  playerFaction = GUILD_FACTION.ALLIANCE,
  bracket,
  rng = Math.random,
} = {}) => {
  const enemyFaction = getOpposingFaction(playerFaction);
  const variance = 0.9 + rng() * 0.22;
  const bracketMidLevel = bracket
    ? (Number(bracket.minLevel) + Number(bracket.maxLevel)) / 2
    : Number(playerTeamProfile?.averageLevel) || 20;
  const baselinePower = Math.max(
    bracketMidLevel * 2.1,
    Number(playerTeamProfile?.teamPower) || bracketMidLevel * 2,
  );
  const teamPower = Math.round(baselinePower * variance);
  const roleVariance = () => 0.9 + rng() * 0.2;

  return {
    name: `${enemyFaction} PUG Team`,
    faction: enemyFaction,
    teamPower,
    offensePower: Math.round(teamPower * roleVariance()),
    defensePower: Math.round(teamPower * roleVariance()),
    healerPower: Math.round(teamPower * (0.82 + rng() * 0.22)),
    flagCarrierPower: Math.round(teamPower * (0.85 + rng() * 0.2)),
    midfieldPower: Math.round(teamPower * roleVariance()),
    coordination: Math.round(38 + rng() * 32),
  };
};

export const pickSpotlightCharacter = (participants, roleHint = "overall", rng = Math.random) => {
  const members = Array.isArray(participants) ? participants.filter(Boolean) : [];
  if (members.length === 0) return null;
  const sorted = [...members].sort(
    (left, right) =>
      getCharacterBattlefieldWeight(right, roleHint) -
      getCharacterBattlefieldWeight(left, roleHint),
  );
  const topCount = Math.min(sorted.length, Math.max(1, roleHint === "random" ? sorted.length : 3));
  return sorted[Math.floor(rng() * topCount)] || sorted[0];
};

export const getAutomationForDay = (automation, currentDayIndex) => {
  const safeAutomation =
    automation && typeof automation === "object" ? automation : {};
  const safeDay = Math.max(0, Math.floor(Number(currentDayIndex) || 0));
  const previousDay = Math.max(0, Math.floor(Number(safeAutomation.dayIndex) || 0));
  if (previousDay !== safeDay) {
    return {
      dayIndex: safeDay,
      queuedToday: 0,
      lastAttemptAt: Math.max(0, Number(safeAutomation.lastAttemptAt) || 0),
    };
  }
  return {
    dayIndex: safeDay,
    queuedToday: Math.max(0, Math.floor(Number(safeAutomation.queuedToday) || 0)),
    lastAttemptAt: Math.max(0, Number(safeAutomation.lastAttemptAt) || 0),
  };
};

export const buildBattlefieldStatusRoster = ({ roster, participantIds, active }) => {
  const participantSet = new Set(normalizeIdList(participantIds));
  return (Array.isArray(roster) ? roster : []).map((character) => {
    if (!participantSet.has(normalizeId(character?.id))) return character;
    return active
      ? {
          ...character,
          status: BATTLEFIELD_CHARACTER_STATUS,
          statusText: "Warsong Gulch",
        }
      : {
          ...character,
          status: "Idle",
          statusText: "Resting...",
        };
  });
};

export const pruneCompletedBattlefields = (battlefieldState) => {
  const state = ensureBattlefieldState(battlefieldState);
  return {
    ...state,
    activeBattles: state.activeBattles.filter(
      (battle) => battle?.status !== BATTLEFIELD_STATUS.COMPLETED,
    ),
  };
};
