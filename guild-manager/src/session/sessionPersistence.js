import { getMissionMaxAttempts } from "../missions/missionHelpers";
import {
  CALENDAR_DAY_MS,
  createInitialCalendarState,
  normalizeCalendarState,
} from "../calendar/calendarLogic";
import { normalizeAdventureGoalQueue } from "../automation/adventureGoals";
import { normalizeRaidLockouts } from "../raids/raidLockouts";
import { normalizeGuildRelationships } from "../social/relationshipSystem";
import { ensureRealmState } from "../server/realmGeneration";
import { normalizeCharacterPersonalityTraits } from "../game/characterPersonality";
import { ensureCharacterPvpData } from "../pvp/pvpCharacterUtils";
import { ensureWorldPvpState } from "../pvp/worldPvpUtils";
import {
  BATTLEFIELD_CHARACTER_STATUS,
} from "../pvp/battlefields/battlefieldDefinitions";
import { ensureBattlefieldState } from "../pvp/battlefields/battlefieldUtils";
import { normalizeEquipmentSlots } from "../utils";
import { ensureGuildInventory } from "../inventory/guildInventoryUtils";
import {
  DEFAULT_STASH_POLICY,
  ensureStashPolicy,
} from "../inventory/itemEvaluation";
import { DEFAULT_PROF_PAIR, PROF_PAIRS } from "../constants";

export const SESSION_FORMAT = "guild-manager-session";
export const SESSION_VERSION = 7;
const MAX_GUILD_LOG_ENTRIES = 50;
const MIN_MISSION_DURATION_MS = 1000;
const DEFAULT_DUNGEON_STEP_COUNT = 4;
const DEFAULT_MISSION_BOARD_STATE = Object.freeze({
  selectedCategory: "all",
  levelFilterMin: "",
  levelFilterMax: "",
  showAvailableDungeonsOnly: false,
  hideLowLevelDungeons: false,
  consumableMode: "none",
});
const MISSION_CONSUMABLE_MODES = new Set(["none", "basic", "best"]);

const toObject = (value) =>
  value && typeof value === "object" ? value : {};

const clampNonNegativeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, numeric);
};

const normalizeCharacterProfessions = (character) => {
  const rawProfessions = character?.professions;
  const normalizedProfessions = Array.isArray(rawProfessions)
    ? rawProfessions
        .filter((profession) => profession?.name)
        .map((profession) => ({
          ...profession,
          skill: Math.max(1, Number(profession.skill) || 1),
        }))
    : rawProfessions && typeof rawProfessions === "object"
      ? Object.entries(rawProfessions)
          .filter(([name]) => Boolean(name))
          .map(([name, value]) => ({
            name,
            skill: Math.max(
              1,
              Number(value && typeof value === "object" ? value.skill : value) || 1,
            ),
          }))
      : [];

  if (normalizedProfessions.length > 0) return normalizedProfessions;

  const starterProfessions = PROF_PAIRS[character?.charClass] || DEFAULT_PROF_PAIR;
  return starterProfessions.map((name) => ({ name, skill: 1 }));
};

export const normalizeMissionBoardState = (state) => {
  const safe = toObject(state);
  return {
    selectedCategory:
      typeof safe.selectedCategory === "string" && safe.selectedCategory.trim()
        ? safe.selectedCategory
        : DEFAULT_MISSION_BOARD_STATE.selectedCategory,
    levelFilterMin:
      safe.levelFilterMin === null || safe.levelFilterMin === undefined
        ? DEFAULT_MISSION_BOARD_STATE.levelFilterMin
        : String(safe.levelFilterMin),
    levelFilterMax:
      safe.levelFilterMax === null || safe.levelFilterMax === undefined
        ? DEFAULT_MISSION_BOARD_STATE.levelFilterMax
        : String(safe.levelFilterMax),
    showAvailableDungeonsOnly: Boolean(safe.showAvailableDungeonsOnly),
    hideLowLevelDungeons: Boolean(safe.hideLowLevelDungeons),
    consumableMode:
      typeof safe.consumableMode === "string" &&
      MISSION_CONSUMABLE_MODES.has(safe.consumableMode)
        ? safe.consumableMode
        : DEFAULT_MISSION_BOARD_STATE.consumableMode,
  };
};

const buildMergedGuildProgress = (payloadData) => {
  const safePayload = toObject(payloadData);
  const snapshotMilestones =
    safePayload.milestones || safePayload.achievements || null;
  const rawGuildProgress = toObject(safePayload.guildProgress);
  if (Object.keys(rawGuildProgress).length === 0) {
    return snapshotMilestones ? { milestones: snapshotMilestones } : null;
  }

  return {
    ...rawGuildProgress,
    milestones: {
      ...toObject(rawGuildProgress.milestones),
      ...toObject(snapshotMilestones),
      dungeon: {
        ...toObject(rawGuildProgress.milestones?.dungeon),
        ...toObject(snapshotMilestones?.dungeon),
      },
    },
  };
};

const normalizeDungeonProgressForLoad = ({
  mission,
  totalDuration,
  loadBaseTime,
  resolveDungeonBossCount,
}) => {
  const resolvedBossCount = Number(
    typeof resolveDungeonBossCount === "function"
      ? resolveDungeonBossCount(mission)
      : DEFAULT_DUNGEON_STEP_COUNT,
  );
  const dungeonStepCount =
    Number.isFinite(resolvedBossCount) && resolvedBossCount > 0
      ? Math.floor(resolvedBossCount)
      : DEFAULT_DUNGEON_STEP_COUNT;
  const progress = toObject(mission.dungeonProgress);
  const stepDuration =
    Number(progress.stepDuration) > 0
      ? Number(progress.stepDuration)
      : Math.max(
          MIN_MISSION_DURATION_MS,
          Math.floor(totalDuration / dungeonStepCount),
        );
  const stepResults = Array.isArray(progress.stepResults)
    ? progress.stepResults
    : [];
  const clearedFromResults = stepResults.filter(
    (step) => step?.outcome === "cleared",
  ).length;
  const clearedSteps = Math.max(
    0,
    Math.min(
      dungeonStepCount,
      Number(progress.clearedSteps) || clearedFromResults,
    ),
  );
  const failedAtStep = Number.isFinite(progress.failedAtStep)
    ? Number(progress.failedAtStep)
    : null;
  const maxAttempts = getMissionMaxAttempts(mission);
  const failedAttemptsFromResults = stepResults.filter(
    (step) => step?.outcome === "failed",
  ).length;
  const attemptsUsed =
    maxAttempts > 0
      ? Math.max(
          0,
          Math.min(
            maxAttempts,
            Math.floor(
              Number(progress.attemptsUsed) || Number(failedAttemptsFromResults) || 0,
            ),
          ),
        )
      : 0;
  const finished =
    Boolean(progress.finished) ||
    Boolean(failedAtStep) ||
    clearedSteps >= dungeonStepCount ||
    (maxAttempts > 0 && attemptsUsed >= maxAttempts);
  const currentStep = finished
    ? clearedSteps
    : Math.max(
        0,
        Math.min(
          dungeonStepCount - 1,
          Number(progress.currentStep) || clearedSteps,
        ),
      );

  return {
    currentStep,
    clearedSteps,
    failedAtStep,
    stepResults,
    lootAwardedSteps: Array.isArray(progress.lootAwardedSteps)
      ? [
          ...new Set(
            progress.lootAwardedSteps
              .map((step) => Math.floor(Number(step) || 0))
              .filter((step) => step > 0 && step <= dungeonStepCount),
          ),
        ].sort((left, right) => left - right)
      : [],
    stepDuration,
    nextStepAt: finished ? loadBaseTime : loadBaseTime + stepDuration,
    finished,
    maxAttempts,
    attemptsUsed,
  };
};

export const buildSessionPayload = ({
  roster,
  activeMissions,
  missionList,
  guildLog,
  guildGold,
  guildProgress,
  guildSetup,
  guildRelationships,
  realmState,
  worldPvpState,
  battlefieldState,
  guildInventory,
  stashPolicy,
  calendarState,
  raidLockouts,
  missionBoardState,
  gameSpeed,
  isPaused,
  gameTimeMs,
}) => {
  const now = clampNonNegativeNumber(gameTimeMs, Date.now());
  const serializedActiveMissions = (Array.isArray(activeMissions)
    ? activeMissions
    : []
  ).map((mission) => {
    const missionFinishTime = clampNonNegativeNumber(mission?.finishTime, now);
    return {
      ...mission,
      remainingMs: Math.max(0, missionFinishTime - now),
    };
  });

  return {
    format: SESSION_FORMAT,
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    data: {
      roster: Array.isArray(roster) ? roster : [],
      activeMissions: serializedActiveMissions,
      missionList: Array.isArray(missionList) ? missionList : [],
      guildLog: Array.isArray(guildLog) ? guildLog : [],
      guildGold: clampNonNegativeNumber(guildGold, 0),
      guildProgress: toObject(guildProgress),
      guildSetup: toObject(guildSetup),
      guildRelationships: normalizeGuildRelationships(guildRelationships),
      realmState: realmState ? toObject(realmState) : null,
      worldPvpState: ensureWorldPvpState(worldPvpState),
      battlefieldState: ensureBattlefieldState(battlefieldState),
      guildInventory: ensureGuildInventory(guildInventory),
      stashPolicy: ensureStashPolicy(stashPolicy),
      calendarState: normalizeCalendarState(
        calendarState || createInitialCalendarState(now),
        now,
      ),
      missionBoardState: normalizeMissionBoardState(missionBoardState),
      raidLockouts: normalizeRaidLockouts(
        raidLockouts,
        Math.max(
          0,
          Math.floor(
            (now -
              (calendarState?.calendarEpochGameTimeMs || now)) /
              CALENDAR_DAY_MS,
          ),
        ),
      ),
      milestones: guildProgress?.milestones || null,
      achievements: guildProgress?.milestones || null,
      progression: {
        gameSpeed,
        isPaused: Boolean(isPaused),
        gameTimeMs: now,
      },
    },
  };
};

export const downloadSessionPayload = (
  payload,
  filenamePrefix = "guild-session",
) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${filenamePrefix}-${timestamp}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const parseSessionPayload = (rawInput) => {
  const parsed = JSON.parse(String(rawInput || "{}"));
  return parsed && typeof parsed === "object" ? parsed.data || parsed : {};
};

export const hydrateSessionData = ({
  payloadData,
  initialMissions,
  normalizeGuildProgress,
  normalizeGuildSetup,
  getGuildDerivedStats,
  normalizeProgressionState,
  defaultGameSpeed,
  defaultGuildSetup,
  createId,
  resolveDungeonBossCount,
}) => {
  const safePayload = toObject(payloadData);

  const loadedRoster = Array.isArray(safePayload.roster) ? safePayload.roster : [];
  const loadedMissionList =
    Array.isArray(safePayload.missionList) && safePayload.missionList.length > 0
      ? safePayload.missionList
      : initialMissions;
  const loadedGuildLog = Array.isArray(safePayload.guildLog)
    ? safePayload.guildLog.slice(0, MAX_GUILD_LOG_ENTRIES)
    : [];

  const rawGuildProgress = buildMergedGuildProgress(safePayload);
  const loadedGuildProgress = normalizeGuildProgress(rawGuildProgress);
  const loadedGuildStats = getGuildDerivedStats(loadedGuildProgress);
  const loadedGuildGold =
    typeof safePayload.guildGold === "number"
      ? Math.max(0, Math.min(loadedGuildStats.goldCap, safePayload.guildGold))
      : 0;
  const loadedGuildSetup = normalizeGuildSetup(
    safePayload.guildSetup || defaultGuildSetup,
    safePayload,
  );
  const loadedGuildRelationships = normalizeGuildRelationships(
    safePayload.guildRelationships,
  );

  const loadedProgression = normalizeProgressionState(
    safePayload.progression || {
      gameSpeed: safePayload.gameSpeed ?? defaultGameSpeed,
      isPaused: safePayload.isPaused ?? false,
      gameTimeMs: safePayload.gameTimeMs,
    },
  );
  const loadBaseTime = loadedProgression.gameTimeMs;
  const loadedCalendarState = normalizeCalendarState(
    safePayload.calendarState,
    loadBaseTime,
  );
  const loadedCalendarDayIndex = Math.max(
    0,
    Math.floor(
      (loadBaseTime - loadedCalendarState.calendarEpochGameTimeMs) /
        CALENDAR_DAY_MS,
    ),
  );
  const loadedRaidLockouts = normalizeRaidLockouts(
    safePayload.raidLockouts,
    loadedCalendarDayIndex,
  );
  const loadedRealmState = ensureRealmState(
    safePayload.realmState,
    loadedGuildSetup,
    loadedCalendarDayIndex,
    loadedRoster.length,
  );
  const loadedWorldPvpState = ensureWorldPvpState(
    safePayload.worldPvpState,
    loadedCalendarDayIndex,
  );
  const loadedBattlefieldState = ensureBattlefieldState(
    safePayload.battlefieldState,
  );
  const loadedGuildInventory = ensureGuildInventory(
    safePayload.guildInventory,
    {
      materialInventory: safePayload.materialInventory,
      consumableInventory: safePayload.consumableInventory,
    },
  );
  const loadedStashPolicy = ensureStashPolicy(
    safePayload.stashPolicy || DEFAULT_STASH_POLICY,
  );
  const loadedMissionBoardState = normalizeMissionBoardState(
    safePayload.missionBoardState,
  );

  const loadedActiveMissions = Array.isArray(safePayload.activeMissions)
    ? safePayload.activeMissions.map((mission) => {
        const missionRemainingMs =
          typeof mission.remainingMs === "number"
            ? Math.max(0, mission.remainingMs)
            : Math.max(
                0,
                clampNonNegativeNumber(mission.finishTime, loadBaseTime) - loadBaseTime,
              );
        const totalDuration =
          typeof mission.totalDuration === "number" && mission.totalDuration > 0
            ? mission.totalDuration
            : Math.max(MIN_MISSION_DURATION_MS, missionRemainingMs);
        return {
          ...mission,
          instanceId: mission.instanceId || createId(),
          startTime: loadBaseTime,
          finishTime: loadBaseTime + missionRemainingMs,
          totalDuration,
          dungeonProgress:
            mission.type === "dungeon"
              ? normalizeDungeonProgressForLoad({
                  mission,
                  totalDuration,
                  loadBaseTime,
                  resolveDungeonBossCount,
                })
              : null,
        };
      })
    : [];

  const activeMemberIds = new Set(
    loadedActiveMissions.flatMap((mission) =>
      Array.isArray(mission.memberIds) ? mission.memberIds : [],
    ),
  );
  const activeBattlefieldMemberIds = new Set(
    loadedBattlefieldState.activeBattles.flatMap((battle) =>
      Array.isArray(battle?.participantIds)
        ? battle.participantIds.map((id) => String(id || "").trim()).filter(Boolean)
        : [],
    ),
  );
  const normalizedRoster = loadedRoster.map((char) => {
    const characterWithPvp = ensureCharacterPvpData(
      char,
      loadedGuildSetup?.faction,
    );
    const normalizedHistory = Array.isArray(characterWithPvp?.history)
      ? characterWithPvp.history
      : [];
    const baseCharacter = {
      ...characterWithPvp,
      status: characterWithPvp?.status || "Idle",
      statusText: characterWithPvp?.statusText || "Awaiting Orders",
      history: normalizedHistory,
      professions: normalizeCharacterProfessions(characterWithPvp),
    };
    const normalizedKeys = Array.isArray(char?.keys)
      ? [...new Set(char.keys.map((keyId) => String(keyId || "").trim()).filter(Boolean))]
      : [];
    const normalizedClearedMissionIds = Array.isArray(char?.clearedMissionIds)
      ? [
          ...new Set(
            char.clearedMissionIds
              .map((missionId) => String(missionId || "").trim())
              .filter(Boolean),
          ),
        ]
      : [];
    const normalizedAdventureGoalQueue = normalizeAdventureGoalQueue(
      baseCharacter?.adventureGoalQueue,
    );
    const normalizedPersonalityTraits = normalizeCharacterPersonalityTraits(
      baseCharacter?.personalityTraits || baseCharacter?.personalityTrait,
    );
    const normalizedEquipment = normalizeEquipmentSlots(baseCharacter?.equipment);
    if (activeMemberIds.has(baseCharacter.id)) {
      return {
        ...baseCharacter,
        equipment: normalizedEquipment,
        keys: normalizedKeys,
        adventureGoalQueue: normalizedAdventureGoalQueue,
        clearedMissionIds: normalizedClearedMissionIds,
        personalityTraits: normalizedPersonalityTraits,
        status: "Questing",
        statusText: "On Mission",
      };
    }
    if (activeBattlefieldMemberIds.has(baseCharacter.id)) {
      return {
        ...baseCharacter,
        equipment: normalizedEquipment,
        keys: normalizedKeys,
        adventureGoalQueue: normalizedAdventureGoalQueue,
        clearedMissionIds: normalizedClearedMissionIds,
        personalityTraits: normalizedPersonalityTraits,
        status: BATTLEFIELD_CHARACTER_STATUS,
        statusText: "Warsong Gulch",
      };
    }
    if (baseCharacter.status === "Questing") {
      return {
        ...baseCharacter,
        equipment: normalizedEquipment,
        keys: normalizedKeys,
        adventureGoalQueue: normalizedAdventureGoalQueue,
        clearedMissionIds: normalizedClearedMissionIds,
        personalityTraits: normalizedPersonalityTraits,
        status: "Idle",
        statusText: "Awaiting Orders",
      };
    }
    return {
      ...baseCharacter,
      equipment: normalizedEquipment,
      keys: normalizedKeys,
      adventureGoalQueue: normalizedAdventureGoalQueue,
      clearedMissionIds: normalizedClearedMissionIds,
      personalityTraits: normalizedPersonalityTraits,
    };
  });

  return {
    normalizedRoster,
    loadedActiveMissions,
    loadedMissionList,
    loadedGuildLog,
    loadedGuildProgress,
    loadedGuildGold,
    loadedGuildSetup,
    loadedGuildRelationships,
    loadedRealmState,
    loadedWorldPvpState,
    loadedBattlefieldState,
    loadedGuildInventory,
    loadedStashPolicy,
    loadedMissionBoardState,
    loadedProgression,
    loadedCalendarState,
    loadedRaidLockouts,
  };
};
