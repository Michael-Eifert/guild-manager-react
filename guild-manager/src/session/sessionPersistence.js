import { getMissionMaxAttempts } from "../missions/missionHelpers";
import {
  CALENDAR_DAY_MS,
  createInitialCalendarState,
  normalizeCalendarState,
} from "../calendar/calendarLogic";
import { normalizeAdventureGoalQueue } from "../automation/adventureGoals";
import { normalizeRaidLockouts } from "../raids/raidLockouts";
import { normalizeGuildRelationships } from "../social/relationshipSystem";
import { ensureSocialState } from "../social/socialSimulation";
import { ensureRealmState } from "../server/realmGeneration";
import { normalizeCharacterPersonalityTraits } from "../game/characterPersonality";
import {
  normalizeGuildRelationsState,
  normalizeLeadershipTrait,
} from "../guildRelations/guildRelations";
import { ensureCharacterPvpData } from "../pvp/pvpCharacterUtils";
import { ensureWorldPvpState } from "../pvp/worldPvpUtils";
import {
  BATTLEFIELD_CHARACTER_STATUS,
} from "../pvp/battlefields/battlefieldDefinitions";
import { ensureBattlefieldState } from "../pvp/battlefields/battlefieldUtils";
import { normalizeEquipmentSlots } from "../utils";
import { canCharacterEquipItem } from "../equipment/weaponRules";
import { ensureGuildInventory } from "../inventory/guildInventoryUtils";
import {
  DEFAULT_STASH_POLICY,
  ensureStashPolicy,
} from "../inventory/itemEvaluation";
import { DEFAULT_PROF_PAIR, PROF_PAIRS } from "../constants";
import {
  CURRENT_SESSION_VERSION,
  migrateSessionPayload,
  SESSION_FORMAT_VALUE,
} from "./sessionMigrations";
import { getSessionDownloadFilename } from "./sessionExportFilename";
import { normalizeGuildActivityStats } from "../guild/guildActivityStats";
import { retainGuildLogEntries } from "../guild/guildLog";
import { normalizeGameSettings } from "../settings/gameSettings";
import { getStarterRecipeIds } from "../professions/recipeDefinitions";
import { normalizeRunPreparationSelection } from "../professions/consumableEffects";
import { normalizeContentState } from "../content/contentState";
import { ensureActivityHistory } from "../activity/activityHistory";

export const SESSION_FORMAT = SESSION_FORMAT_VALUE;
export const SESSION_VERSION = CURRENT_SESSION_VERSION;
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

export const normalizePersistedSocialState = (socialState) => {
  const normalized = ensureSocialState(socialState);
  return ensureSocialState({
    ...normalized,
    messages: normalized.messages.map((message) =>
      message.generationStatus === "pending"
        ? {
            ...message,
            text: message.fallbackText,
            textSource: "template",
            generationStatus: "ready",
          }
        : message,
    ),
  });
};

const toObject = (value) =>
  value && typeof value === "object" ? value : {};

const serializeRealmState = (realmState) => {
  if (!realmState || typeof realmState !== "object") return null;
  const players = Array.isArray(realmState?.population?.players)
    ? realmState.population.players
    : [];
  const memberIdsByGuildId = new Map();
  players.forEach((player) => {
    const guildId = String(player?.guildId || "");
    if (!guildId) return;
    const memberIds = memberIdsByGuildId.get(guildId) || [];
    memberIds.push(String(player.id));
    memberIdsByGuildId.set(guildId, memberIds);
  });
  return {
    ...realmState,
    npcGuilds: (Array.isArray(realmState.npcGuilds)
      ? realmState.npcGuilds
      : []
    ).map((guild) => {
      const { roster: legacyRoster, ...summary } = guild;
      void legacyRoster;
      return {
        ...summary,
        memberIds:
          memberIdsByGuildId.get(String(guild?.id || "")) ||
          (Array.isArray(guild?.memberIds) ? guild.memberIds.map(String) : []),
      };
    }),
  };
};

const serializeBattlefieldState = (battlefieldState) => {
  const normalized = ensureBattlefieldState(battlefieldState);
  return { ...normalized, history: [] };
};

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
          kind: ["Cooking", "Fishing", "First Aid"].includes(profession.name)
            ? "secondary"
            : "primary",
          knownRecipeIds: Array.isArray(profession.knownRecipeIds)
            ? [...new Set(profession.knownRecipeIds.map(String))]
            : getStarterRecipeIds(profession.name),
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
            kind: ["Cooking", "Fishing", "First Aid"].includes(name)
              ? "secondary"
              : "primary",
            knownRecipeIds:
              value && typeof value === "object" && Array.isArray(value.knownRecipeIds)
                ? [...new Set(value.knownRecipeIds.map(String))]
                : getStarterRecipeIds(name),
          }))
      : [];

  if (normalizedProfessions.length > 0) return normalizedProfessions;

  const starterProfessions = PROF_PAIRS[character?.charClass] || DEFAULT_PROF_PAIR;
  return starterProfessions.map((name) => ({
    name,
    skill: 1,
    kind: "primary",
    knownRecipeIds: getStarterRecipeIds(name),
  }));
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
    runPreparationSelection: normalizeRunPreparationSelection(
      safe.runPreparationSelection || safe.consumableMode || DEFAULT_MISSION_BOARD_STATE.consumableMode,
    ),
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
  contentState,
  activityHistory,
  guildRelationships,
  realmState,
  worldPvpState,
  battlefieldState,
  guildInventory,
  stashPolicy,
  calendarState,
  raidLockouts,
  missionBoardState,
  socialState,
  guildRelationsState,
  guildActivityStats,
  gameSettings,
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
      contentState: normalizeContentState(contentState, toObject(guildSetup)),
      activityHistory: ensureActivityHistory(activityHistory),
      guildRelationships: normalizeGuildRelationships(guildRelationships),
      realmState: serializeRealmState(realmState),
      worldPvpState: ensureWorldPvpState(worldPvpState),
      battlefieldState: serializeBattlefieldState(battlefieldState),
      guildInventory: ensureGuildInventory(guildInventory),
      stashPolicy: ensureStashPolicy(stashPolicy),
      calendarState: normalizeCalendarState(
        calendarState || createInitialCalendarState(now),
        now,
      ),
      missionBoardState: normalizeMissionBoardState(missionBoardState),
      socialState: normalizePersistedSocialState(socialState),
      guildRelationsState: normalizeGuildRelationsState(
        guildRelationsState,
        Array.isArray(roster) ? roster : [],
      ),
      guildActivityStats: normalizeGuildActivityStats(
        guildActivityStats,
        Math.max(
          0,
          Math.floor(
            (now - (calendarState?.calendarEpochGameTimeMs || now)) /
              CALENDAR_DAY_MS,
          ),
        ),
      ),
      gameSettings: normalizeGameSettings(gameSettings),
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
  preferredFilename = "",
) => {
  const filename = getSessionDownloadFilename(preferredFilename);
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
  return migrateSessionPayload(parsed).data;
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
  itemCatalog = /** @type {any} */ (null),
}) => {
  const safePayload = toObject(payloadData);

  const loadedRoster = Array.isArray(safePayload.roster) ? safePayload.roster : [];
  const loadedMissionList =
    Array.isArray(safePayload.missionList) && safePayload.missionList.length > 0
      ? safePayload.missionList
      : initialMissions;
  const loadedGuildLog = Array.isArray(safePayload.guildLog)
    ? retainGuildLogEntries(safePayload.guildLog, loadedMissionList)
    : [];

  const rawGuildProgress = buildMergedGuildProgress(safePayload);
  const loadedGuildProgress = normalizeGuildProgress(rawGuildProgress);
  const loadedGuildStats = getGuildDerivedStats(loadedGuildProgress);
  const loadedGuildGold =
    typeof safePayload.guildGold === "number"
      ? Math.max(0, Math.min(loadedGuildStats.goldCap, safePayload.guildGold))
      : 0;
  const normalizedLoadedGuildSetup = normalizeGuildSetup(
    safePayload.guildSetup || defaultGuildSetup,
    safePayload,
  );
  const loadedContentState = normalizeContentState(
    safePayload.contentState,
    normalizedLoadedGuildSetup,
  );
  const loadedGuildSetup = {
    ...normalizedLoadedGuildSetup,
    contentRoute: loadedContentState.route,
    contentPhase: loadedContentState.phase,
    contentPhaseStartedDayIndex: loadedContentState.activatedAtDayIndex,
  };
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
    normalizeGameSettings(safePayload.gameSettings),
  );
  const loadedWorldPvpState = ensureWorldPvpState(
    safePayload.worldPvpState,
    loadedCalendarDayIndex,
  );
  const loadedBattlefieldState = ensureBattlefieldState(
    safePayload.battlefieldState,
  );
  const loadedActivityHistory = ensureActivityHistory(
    safePayload.activityHistory,
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
  const loadedSocialState = normalizePersistedSocialState(
    safePayload.socialState,
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
      leadershipTrait: normalizeLeadershipTrait(
        characterWithPvp?.leadershipTrait,
        characterWithPvp?.id,
      ),
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
    const enrichItem = (item) => {
      if (!item || typeof item !== "object") return item;
      const catalogItem = itemCatalog?.byId?.(item.id ?? item.wowheadId);
      return catalogItem ? { ...item, ...catalogItem } : item;
    };
    const equipmentWithCatalog = Object.fromEntries(
      Object.entries(baseCharacter?.equipment || {}).map(([slot, item]) => [
        slot,
        enrichItem(item),
      ]),
    );
    let normalizedEquipment = normalizeEquipmentSlots(equipmentWithCatalog);
    normalizedEquipment = Object.fromEntries(
      Object.entries(normalizedEquipment).map(([slot, item]) => {
        if (
          item &&
          ["mainHand", "offHand", "ranged"].includes(slot) &&
          !canCharacterEquipItem(baseCharacter, item, slot)
        ) {
          return [slot, { ...item, legacyCompatibility: true }];
        }
        return [slot, item];
      }),
    );
    const normalizedPersonalInventory = Array.isArray(baseCharacter?.personalInventory)
      ? baseCharacter.personalInventory
          .filter((item) => item && typeof item === "object")
          .map(enrichItem)
          .slice(0, 48)
      : [];
    if (activeMemberIds.has(baseCharacter.id)) {
      return {
        ...baseCharacter,
        equipment: normalizedEquipment,
        personalInventory: normalizedPersonalInventory,
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
        personalInventory: normalizedPersonalInventory,
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
        personalInventory: normalizedPersonalInventory,
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
      personalInventory: normalizedPersonalInventory,
      keys: normalizedKeys,
      adventureGoalQueue: normalizedAdventureGoalQueue,
      clearedMissionIds: normalizedClearedMissionIds,
      personalityTraits: normalizedPersonalityTraits,
    };
  });
  const loadedGuildRelationsState = normalizeGuildRelationsState(
    safePayload.guildRelationsState,
    normalizedRoster,
  );
  const loadedGuildActivityStats = normalizeGuildActivityStats(
    safePayload.guildActivityStats,
    loadedCalendarDayIndex,
  );
  const loadedGameSettings = normalizeGameSettings(safePayload.gameSettings);

  return {
    normalizedRoster,
    loadedActiveMissions,
    loadedMissionList,
    loadedGuildLog,
    loadedGuildProgress,
    loadedGuildGold,
    loadedGuildSetup,
    loadedContentState,
    loadedGuildRelationships,
    loadedRealmState,
    loadedWorldPvpState,
    loadedBattlefieldState,
    loadedActivityHistory,
    loadedGuildInventory,
    loadedStashPolicy,
    loadedMissionBoardState,
    loadedSocialState,
    loadedGuildRelationsState,
    loadedGuildActivityStats,
    loadedGameSettings,
    loadedProgression,
    loadedCalendarState,
    loadedRaidLockouts,
  };
};
