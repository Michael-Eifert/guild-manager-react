/* eslint-disable react-hooks/exhaustive-deps -- synchronized commit refs and setters are stable by contract during the provider migration */
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import { createGameContextStore, GameContext } from "./GameContext";
import { useSynchronizedState } from "./useSynchronizedState";
import { useRuntimeInterval } from "./useRuntimeInterval";
import { useHomeUiState } from "./useHomeUiState";
import { useNotifications } from "./useNotifications";
import {
  CONFIG,
  INITIAL_MISSIONS,
  DB_CLASSES,
  PROF_ACTIONS,
  GUILD_FACTION,
  GUILD_FACTION_OPTIONS,
  GUILD_SERVER_OPTIONS,
  GAMEPLAY_TUNING,
  GUILD_ACTIVITY_MODES,
  GUILD_DUNGEON_ACTIVITY,
  GUILD_DUNGEON_ACTIVITY_OPTIONS,
  MEMBER_RANKING_MODES,
  GUILD_MEMBER_SORT,
  GUILD_FOCUS,
  GUILD_FOCUS_OPTIONS,
  DEFAULT_GUILD_SETUP,
  GUILD_STARTING_CONFIG,
  WORLD_DROP_CONFIG,
  FACTION_EMBLEM_ICON,
} from "../constants";
import {
  getReqExp,
  generateCharacters,
  getItemEffectiveLevel,
  getCharacterAverageItemLevel,
  getMissionSuccessPreview,
  getMissionVeteranCoverage,
  createId,
  getClassArmorTypes,
  isItemUsableByClass,
  getKeyLabel,
  getWowIconUrl,
} from "../utils";
import {
  GUILD_POINT_LABEL,
  createInitialGuildProgress,
  normalizeGuildProgress,
  getGuildDerivedStats,
  applyLevelMilestones,
  applyRosterSizeMilestones,
  applyDungeonClearMilestones,
  applyDungeonWipeMilestone,
  upgradeGuildTalent,
} from "../guildProgression";
import {
  DEFAULT_GAME_SPEED,
  clampGameSpeed,
  getNextGameSpeed,
  normalizeProgressionState,
  advanceGameTime,
} from "../progression";
import {
  loadSessionFile,
  openSessionFilePicker,
  saveSessionFile,
} from "../session/sessionFileActions";
import { applyLoadedSessionToApp } from "../session/applyLoadedSession";
import {
  evaluateMissionKeyAccess,
  getDungeonBossCount,
  getDungeonQuarterExpMultiplier,
  getDungeonOverlevelExpMultiplier,
  getMissionLevelExpMultiplier,
  getMissionGoldReward,
  getMissionWipeCost,
  getMissionLootLevelRange,
  resolveMissionRewardQualities,
} from "../missions/missionHelpers";
import { createMissionRewardProcessor } from "../missions/missionRewards";
import {
  getActiveMissionMemberIdSet,
  isMissionMemberGroupAvailable,
  pruneOverlappingActiveMissions,
} from "../missions/missionRosterGuards";
import { cloneMissionTemplate } from "../missions/missionTemplates";
import {
  getDungeonStepLootConfig,
  getDungeonStepQualityPriority,
} from "../loot/dungeonLootConfig";
import {
  applyLootRewardToCharacter,
  generateWorldTickLoot,
  generateZoneCheckpointLoot,
} from "../loot/worldLoot";
import {
  getFactionDefaultGuildName,
  getGuildFocusBonuses,
  getGuildServerPopulation,
  getGuildServerStyle,
  normalizeGuildSetup,
  normalizeAutoGroupSuccessRate,
} from "../guild/guildSetup";
import {
  getGuildMemberSearchScore,
  normalizeGuildMemberSearch,
} from "../guild/guildMemberSearch";
import {
  getGuildClassSummary,
  getGuildRoleSummary,
} from "../guild/guildRoleSummary";
import {
  isRelationshipEligibleMission,
  removeMemberRelationships,
  getRelationshipSuccessModifier,
  updateRelationshipsForSharedActivity,
} from "../social/relationshipSystem";
import {
  ZONE_PROGRESS_CHECKPOINTS,
  getZoneById,
  getZoneExpMultiplier,
  getZoneProgressPerTick,
  getZoneCheckpointGoldReward,
  getZoneCheckpointLootQualities,
  isZoneMission,
  isZoneAccessibleForFaction,
} from "../zones/zoneDefinitions";
import {
  assignZoneToRoster as assignZoneToRosterMembers,
  getClampedZoneProgress,
  getMissionListWithZones,
  getZoneProgressLabel,
  normalizeCharacterZoneState,
  normalizeRosterZones as normalizeRosterZonesForFaction,
  resolveZoneAutoTransition,
} from "../zones/zoneLogic";
import {
  buildRecruitmentEquipment,
  resolveRecruitmentResult,
} from "../recruitment/recruitmentLogic";
import {
  hasCompletedZoneEliteQuest,
  resolveAutoZoneEliteGroups,
} from "../automation/zoneEliteAutomation";
import {
  addAdventureGoalToCharacter,
  buildAdventureGoal,
  removeAdventureGoalFromCharacter,
} from "../automation/adventureGoals";
import {
  advanceDungeonMission,
  getDefaultDungeonProgress,
} from "../game/dungeonEngine";
import {
  applyProfessionSkillAttempts,
  resolveCharacterActivityPlan,
} from "../game/characterActivity";
import {
  getCharacterLevelingExpMultiplier,
  getCharacterZoneProgressMultiplier,
} from "../game/characterPersonality";
import { getLevelingTickExpGain } from "../game/levelingProgression";
import {
  MORALE_WIPE_DELTA,
  MORALE_ZONE_CLEAR_DELTA,
  applyMoraleDelta,
  getCharacterMorale,
  getPartyMoraleSuccessBonus,
  isCharacterInZoneLevelRange,
} from "../game/characterMorale";
import { advanceActiveMissionsForTick } from "../game/gameTickEngine";
import {
  CALENDAR_STATUS,
  getCalendarTimeOfDayOption,
  buildCalendarEvent,
  buildCalendarSeries,
  cancelCalendarSeriesEvents,
  createInitialCalendarState,
  getDungeonMissionPreemption,
  formatCalendarDate,
  getCalendarDate,
  getCalendarDayIndex,
  getCalendarDayProgress,
  normalizeCalendarState,
  refreshCalendarState,
  getMissionInstanceKey,
} from "../calendar/calendarLogic";
import {
  getRaidLockoutStatus,
  getRaidResumeProgress,
  normalizeRaidLockouts,
  startRaidLockout,
  updateRaidLockoutProgress,
} from "../raids/raidLockouts";
import { resolveAutoDungeonAttempt } from "../automation/dungeonAutomation";
import { ensureRealmState } from "../server/realmGeneration";
import { advanceRealmSimulation } from "../server/realmSimulation";
import { buildPlayerGuildSnapshot } from "../server/realmRankings";
import {
  declineRealmGuildApplications,
  getRealmGuildApplications,
  getRealmRecruitmentMarketStats,
  markRealmPlayersRecruited,
  resolvePlayerGuildDeparturesForDay,
  selectRealmRecruitmentCandidates,
} from "../server/realmPopulation";
import { resolveWorldPvpForDay } from "../pvp/worldPvpEngine";
import { applyWeeklyPvpRollover } from "../pvp/pvpProgression";
import { resolveWorldPvpRoamingAssignment } from "../pvp/worldPvpRoaming";
import { ensureWorldPvpState } from "../pvp/worldPvpUtils";
import {
  BATTLEFIELD_CHARACTER_STATUS,
  PVP_ACTIVITY_FOCUS,
} from "../pvp/battlefields/battlefieldDefinitions";
import {
  advanceBattlefieldState,
  resolveAutoBattlefieldQueue,
  startWarsongGulchBattle,
} from "../pvp/battlefields/battlefieldEngine";
import { ensureBattlefieldState } from "../pvp/battlefields/battlefieldUtils";
import { createDebugActions } from "../debug/debugActions";
import { loadItemCatalog } from "../data/itemCatalog";
import {
  ensureGuildInventory,
  getItemQuantity,
  removeItemFromGuildInventory,
} from "../inventory/guildInventoryUtils";
import {
  cleanupGuildStash,
  DEFAULT_STASH_POLICY,
  ensureStashPolicy,
  shouldStoreItem,
  tryAutoEquipItemFromGuildStash,
} from "../inventory/itemEvaluation";
import {
  getInventoryItemDefinition,
  INVENTORY_ITEM_CATEGORY,
} from "../inventory/itemDefinitions";
import { craftRecipe } from "../professions/craftingEngine";
import {
  CONSUMABLE_MODE,
  consumeMissionConsumables,
  formatConsumableUseSummary,
  getConsumableMissionModifiers,
} from "../professions/consumableEffects";
import { getRecipeDefinition } from "../professions/recipeDefinitions";
import { generatePassiveProfessionMaterial } from "../professions/professionUtils";
import { ROUTES } from "../routes";

const GUILD_FOCUS_CHANGE_COST_GOLD = 10;

const DEFAULT_DASHBOARD_SECTIONS = Object.freeze({
  guildActivity: true,
  dungeonGroups: true,
  pvpActivity: true,
  guildComposition: true,
});

const geminiProxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL || "";
const callGemini = async (prompt, isJson = false) => {
  try {
    if (!geminiProxyUrl) {
      throw new Error("Missing VITE_GEMINI_PROXY_URL");
    }
    const response = await fetch(geminiProxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, isJson }),
    });
    if (!response.ok) throw new Error(`Gemini proxy error: ${response.status}`);
    const data = await response.json();
    const text = typeof data.text === "string" ? data.text : "";
    if (!text) throw new Error("No text returned");
    return isJson ? JSON.parse(text) : text;
  } catch (error) {
    console.error("Gemini proxy call failed:", error);
    throw error;
  }
};

const {
  FAILED_MISSION_EXP_FACTOR,
  ENABLE_ZONE_QUESTING,
  SHOW_LEGACY_QUESTS,
} = GAMEPLAY_TUNING;
const {
  MEMBER_COUNT: STARTING_GUILD_MEMBERS,
  ROLE_PLAN: STARTING_GUILD_ROLE_PLAN,
  GOLD: STARTING_GUILD_GOLD,
} = GUILD_STARTING_CONFIG;
const {
  COMMON_DROP_CHANCE: WORLD_TICK_COMMON_DROP_CHANCE,
  UNCOMMON_DROP_CHANCE: WORLD_TICK_UNCOMMON_DROP_CHANCE,
  EPIC_DROP_CHANCE: WORLD_TICK_EPIC_DROP_CHANCE,
  EPIC_MIN_LEVEL: WORLD_TICK_EPIC_MIN_LEVEL,
} = WORLD_DROP_CONFIG;
// --- MAIN APP COMPONENT ---

export const GameProvider = ({ children }) => {
  const navigate = useNavigate();
  const servicesRef = useRef({
    now: () => Date.now(),
    random: () => Math.random(),
    createId,
  });
  const services = servicesRef.current;
  const [guildSetup, setGuildSetup, guildSetupRef] = useSynchronizedState(() =>
    normalizeGuildSetup(DEFAULT_GUILD_SETUP),
  );
  const [roster, setRoster, rosterRef] = useSynchronizedState([]);
  const [activeMissions, setActiveMissions, missionsRef] = useSynchronizedState([]);
  const [missionList, setMissionList, missionListRef] = useSynchronizedState(() =>
    getMissionListWithZones(INITIAL_MISSIONS.map(cloneMissionTemplate)),
  );
  const [guildLog, setGuildLog] = useState([]);
  const [guildGold, setGuildGold, goldRef] = useSynchronizedState(0);
  const [guildProgress, setGuildProgress, guildProgressRef] = useSynchronizedState(() =>
    createInitialGuildProgress(),
  );
  const [guildRelationships, setGuildRelationships, guildRelationshipsRef] =
    useSynchronizedState({});
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(DEFAULT_GAME_SPEED);
  const [gameTimeMs, setGameTimeMs, gameTimeRef] = useSynchronizedState(() => services.now());
  const [calendarState, setCalendarState, calendarStateRef] = useSynchronizedState(() =>
    createInitialCalendarState(services.now()),
  );
  const [raidLockouts, setRaidLockouts, raidLockoutsRef] = useSynchronizedState({});
  const [realmState, setRealmState, realmStateRef] = useSynchronizedState(() =>
    ensureRealmState(null, DEFAULT_GUILD_SETUP, 0),
  );
  const [worldPvpState, setWorldPvpState, worldPvpStateRef] = useSynchronizedState(() =>
    ensureWorldPvpState(null, 0),
  );
  const [battlefieldState, setBattlefieldState, battlefieldStateRef] = useSynchronizedState(() =>
    ensureBattlefieldState(null),
  );
  const [guildInventory, setGuildInventory, guildInventoryRef] = useSynchronizedState(() =>
    ensureGuildInventory(null),
  );
  const [stashPolicy, setStashPolicy, stashPolicyRef] = useSynchronizedState(() =>
    ensureStashPolicy(DEFAULT_STASH_POLICY),
  );
  const {
    dismissNotification,
    notifications,
    pushNotification,
  } = useNotifications({ createNotificationId: services.createId });
  const [missionBoardState, setMissionBoardState] = useState({
    selectedCategory: "all",
    levelFilterMin: "",
    levelFilterMax: "",
    showAvailableDungeonsOnly: false,
    hideLowLevelDungeons: false,
    consumableMode: CONSUMABLE_MODE.NONE,
  });
  const {
    dashboardSectionsOpen,
    detailCharId,
    guildMemberMaxLevelFilter,
    guildMemberMinLevelFilter,
    guildMemberSearch,
    guildMemberSortMode,
    memberRankingMode,
    setDashboardSectionsOpen,
    setDetailCharId,
    setGuildMemberMaxLevelFilter,
    setGuildMemberMinLevelFilter,
    setGuildMemberSearch,
    setGuildMemberSortMode,
    setMemberRankingMode,
    setShowDebug,
    setShowGuildLog,
    setShowLootTable,
    setShowOptions,
    setShowProfessions,
    setShowRecruit,
    showDebug,
    showGuildLog,
    showLootTable,
    showOptions,
    showProfessions,
    showRecruit,
  } = useHomeUiState({
    defaultDashboardSections: DEFAULT_DASHBOARD_SECTIONS,
    defaultRankingMode: MEMBER_RANKING_MODES.STANDARD,
    defaultSortMode: GUILD_MEMBER_SORT.LEVEL_DESC,
  });
  const [itemCatalog, setItemCatalog] = useState(null);

  const calendarEventStartLocksRef = useRef(new Set());
  const startCalendarEventRef = useRef(() => false);
  const autoDungeonStateRef = useRef({ nextAttemptAt: 0 });
  const lastRealTimeRef = useRef(services.now());
  const rewardedMissionIdsRef = useRef(new Set());
  const sessionFileInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    loadItemCatalog()
      .then((loadedCatalog) => {
        if (isMounted) setItemCatalog(loadedCatalog);
      })
      .catch((error) => {
        console.error("Failed to load item catalog:", error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const itemDatabase = useMemo(() => itemCatalog?.all() || [], [itemCatalog]);

  useEffect(() => {
    lastRealTimeRef.current = services.now();
  }, [isPaused, gameSpeed]);
  const normalizeRosterZones = useCallback(
    (
      rosterSnapshot,
      fallbackFaction = guildSetupRef.current?.faction ||
        GUILD_FACTION.ALLIANCE,
    ) =>
      normalizeRosterZonesForFaction(rosterSnapshot, fallbackFaction),
    [],
  );

  const assignZoneToRoster = useCallback(
    (rosterSnapshot, memberIds, zoneId) => {
      const assignedRoster = assignZoneToRosterMembers({
        rosterSnapshot,
        memberIds,
        zoneId,
        fallbackFaction:
          guildSetupRef.current?.faction || GUILD_FACTION.ALLIANCE,
      });
      if (assignedRoster !== rosterSnapshot) return assignedRoster;

      return rosterSnapshot;
    },
    [],
  );

  const guildDerivedStats = getGuildDerivedStats(guildProgress);
  const guildRoleSummary = useMemo(
    () => getGuildRoleSummary(roster),
    [roster],
  );
  const guildClassSummary = useMemo(
    () => getGuildClassSummary(roster),
    [roster],
  );
  const guildFocusBonuses = useMemo(
    () => getGuildFocusBonuses(guildSetup.focus),
    [guildSetup.focus],
  );
  const currentCalendarDayIndex = getCalendarDayIndex(
    gameTimeMs,
    calendarState.calendarEpochGameTimeMs,
  );
  const currentCalendarDate = getCalendarDate(currentCalendarDayIndex);
  const currentCalendarDayProgress = getCalendarDayProgress(
    gameTimeMs,
    calendarState.calendarEpochGameTimeMs,
  );
  const currentCalendarDayProgressPercent = Math.round(
    currentCalendarDayProgress * 100,
  );
  const getCurrentCalendarDayIndex = useCallback(
    () =>
      getCalendarDayIndex(
        gameTimeRef.current,
        calendarStateRef.current.calendarEpochGameTimeMs,
      ),
    [],
  );
  const factionMissionIconUrl = getWowIconUrl(
    FACTION_EMBLEM_ICON[guildSetup.faction] ||
      FACTION_EMBLEM_ICON[GUILD_FACTION.ALLIANCE],
  );

  const appendGuildRenownLog = useCallback((message) => {
    const time = new Date().toLocaleTimeString();
    setGuildLog((prev) =>
      [{ time, type: "guild-renown", message }, ...prev].slice(0, 50),
    );
  }, []);

  const appendAchievementLog = useCallback((label, reward, context = "") => {
    const time = new Date().toLocaleTimeString();
    setGuildLog((prev) =>
      [
        {
          time,
          type: "achievement",
          label,
          reward,
          context,
        },
        ...prev,
      ].slice(0, 50),
    );
  }, []);

  const registerDungeonClearMilestones = useCallback(
    (missionContext) => {
      const missionName =
        typeof missionContext === "string"
          ? missionContext
          : missionContext?.name || "Dungeon";
      const result = applyDungeonClearMilestones(
        guildProgressRef.current,
        missionContext,
      );
      setGuildProgress(result.guildProgress);

      result.unlocked.forEach((milestone) => {
        pushNotification({
          type: "achievement",
          title: "Achievement Unlocked",
          message: `${milestone.label}: +${milestone.reward} ${GUILD_POINT_LABEL} (${missionName})`,
          durationMs: 5200,
        });
        appendAchievementLog(milestone.label, milestone.reward, missionName);
      });
    },
    [appendAchievementLog, pushNotification],
  );

  const registerDungeonWipeMilestone = useCallback(
    (missionName) => {
      const result = applyDungeonWipeMilestone(guildProgressRef.current);
      setGuildProgress(result.guildProgress);
      const unlockedMilestone = result.unlocked;

      if (unlockedMilestone) {
        pushNotification({
          type: "achievement",
          title: "Achievement Unlocked",
          message: `${unlockedMilestone.label}: +${unlockedMilestone.reward} ${GUILD_POINT_LABEL} (${missionName})`,
          durationMs: 5200,
        });
        appendAchievementLog(
          unlockedMilestone.label,
          unlockedMilestone.reward,
          missionName,
        );
      }
    },
    [appendAchievementLog, pushNotification],
  );

  const handleUpgradeGuildTalent = useCallback(
    (talentKey) => {
      const availableGold = Math.max(0, Number(goldRef.current) || 0);
      const result = upgradeGuildTalent(guildProgressRef.current, talentKey, {
        guildGold: availableGold,
      });
      setGuildProgress(result.guildProgress);
      const upgradeSummary = result.upgraded && result.talent
        ? {
            title: result.talent.title,
            suffix: result.talent.suffix,
            spentCost: result.spentCost,
            spentGold: result.spentGold,
            nextValue: result.nextValue,
          }
        : null;
      const blockedSummary = !result.upgraded && result.talent
        ? {
            title: result.talent.title,
            blockedByPrerequisite: Boolean(result.blockedByPrerequisite),
            blockers: Array.isArray(result.blockers) ? result.blockers : [],
            missingCost: Number(result.missingCost) || 0,
            missingGold: Number(result.missingGold) || 0,
          }
        : null;

      if (upgradeSummary) {
        const updatedGold = Math.max(
          0,
          (Number(goldRef.current) || 0) -
            Math.max(0, Number(upgradeSummary.spentGold) || 0),
        );
        goldRef.current = updatedGold;
        setGuildGold(updatedGold);
        pushNotification(
          `${upgradeSummary.title} upgraded to +${upgradeSummary.nextValue} ${upgradeSummary.suffix}.`,
          "info",
        );
        appendGuildRenownLog(
          `${upgradeSummary.title} upgraded for ${upgradeSummary.spentCost} ${GUILD_POINT_LABEL} and ${upgradeSummary.spentGold}g.`,
        );
      } else if (blockedSummary) {
        const blockerText =
          blockedSummary.blockers.length > 0
            ? blockedSummary.blockers[0]
            : blockedSummary.missingCost > 0 && blockedSummary.missingGold > 0
              ? `Need ${blockedSummary.missingCost} more ${GUILD_POINT_LABEL} and ${blockedSummary.missingGold}g.`
              : blockedSummary.missingCost > 0
                ? `Need ${blockedSummary.missingCost} more ${GUILD_POINT_LABEL}.`
                : blockedSummary.missingGold > 0
                  ? `Need ${blockedSummary.missingGold}g more.`
                  : "No further upgrades available.";
        pushNotification({
          type: blockedSummary.blockedByPrerequisite ? "error" : "info",
          title: blockedSummary.title,
          message: blockerText,
          durationMs: 3200,
        });
      }
    },
    [appendGuildRenownLog, pushNotification],
  );

  useEffect(() => {
    const levelResult = applyLevelMilestones(guildProgressRef.current, roster);
    const rosterResult = applyRosterSizeMilestones(
      levelResult.guildProgress,
      roster,
    );
    setGuildProgress(rosterResult.guildProgress);
    const newlyUnlocked = [
      ...levelResult.unlocked.map(({ level, reward }) => ({
        label: `First level ${level} character`,
        reward,
      })),
      ...rosterResult.unlocked.map(({ label, reward }) => ({
        label,
        reward,
      })),
    ];

    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(({ label, reward }) => {
        pushNotification({
          type: "achievement",
          title: "Achievement Unlocked",
          message: `${label}: +${reward} ${GUILD_POINT_LABEL}`,
          durationMs: 5200,
        });
        appendAchievementLog(label, reward);
      });
    }
  }, [appendAchievementLog, pushNotification, roster]);

  const tryApplyWorldTickLoot = useCallback(
    (char, logCollector) => {
      const roll = services.random();
      const epicEligible =
        (Number(char?.level) || 1) >= WORLD_TICK_EPIC_MIN_LEVEL;
      const epicThreshold = epicEligible ? WORLD_TICK_EPIC_DROP_CHANCE : 0;
      const uncommonThreshold = epicThreshold + WORLD_TICK_UNCOMMON_DROP_CHANCE;
      const commonThreshold = uncommonThreshold + WORLD_TICK_COMMON_DROP_CHANCE;
      const targetQuality =
        roll < epicThreshold
          ? 4
          : roll < uncommonThreshold
            ? 2
            : roll < commonThreshold
              ? 1
              : null;
      if (!targetQuality) return char;

      const lootItem = generateWorldTickLoot(char, targetQuality, itemDatabase);
      return applyLootRewardToCharacter({
        char,
        lootItem,
        logCollector,
        missionName: "World Drop",
        updateStatusText: true,
        logDiscarded: false,
      });
    },
    [itemDatabase],
  );

  const applyMissionWipeCosts = useCallback(
    (mission, stepLogs, availableGold) => {
      if (mission?.type !== "dungeon") {
        return { updatedGold: availableGold, wipeCostLog: null };
      }
      const wipeEvents = (Array.isArray(stepLogs) ? stepLogs : []).filter(
        (log) => log?.type === "mission-attempt",
      );
      if (wipeEvents.length === 0) {
        return { updatedGold: availableGold, wipeCostLog: null };
      }

      const wipeCost = getMissionWipeCost(mission);
      if (wipeCost <= 0) {
        return { updatedGold: availableGold, wipeCostLog: null };
      }

      const totalCost = wipeCost * wipeEvents.length;
      const paidAmount = Math.max(
        0,
        Math.min(Math.floor(availableGold), totalCost),
      );
      const unpaidAmount = Math.max(0, totalCost - paidAmount);

      return {
        updatedGold: Math.max(0, availableGold - paidAmount),
        wipeCostLog:
          paidAmount > 0 || unpaidAmount > 0
            ? {
                type: "wipe-cost",
                missionName: mission?.name || "Dungeon",
                wipeCount: wipeEvents.length,
                wipeCost,
                amount: paidAmount,
                unpaidAmount,
              }
            : null,
      };
    },
    [],
  );

  const getMissionInstanceId = (mission) =>
    mission.instanceId ||
    `${mission.questId || mission.id}-${mission.startTime || 0}`;

  const getAdjustedMissionSuccessPreview = useCallback((mission, members) => {
    const preview = getMissionSuccessPreview(mission, members);
    const dungeonBonus =
      mission?.type === "dungeon"
        ? getGuildFocusBonuses(guildSetupRef.current?.focus).dungeonSuccessBonus
        : 0;
    const veteranCoverage = getMissionVeteranCoverage(mission, members);
    const moraleSuccessBonus =
      mission?.type === "dungeon" ? getPartyMoraleSuccessBonus(members) : 0;
    const relationshipSuccessModifier = getRelationshipSuccessModifier({
      relationships: guildRelationshipsRef.current,
      memberIds: members.map((member) => member?.id),
    });
    const adjustedSuccess = Math.min(
      100,
      Math.max(
        0,
        preview.successChance +
          dungeonBonus +
          veteranCoverage.successBonus +
          moraleSuccessBonus +
          relationshipSuccessModifier.successModifier,
      ),
    );
    return {
      ...preview,
      successChance: adjustedSuccess,
      failChance: Math.max(0, 100 - adjustedSuccess),
      focusSuccessBonus: dungeonBonus,
      moraleSuccessBonus,
      relationshipSuccessModifier:
        relationshipSuccessModifier.successModifier,
      relationshipSuccessModifierLevel: relationshipSuccessModifier.level,
      relationshipSuccessModifierPair:
        relationshipSuccessModifier.affectedPairKey,
      veteranSuccessBonus: veteranCoverage.successBonus,
      veteranExperiencedCount: veteranCoverage.experiencedCount,
      veteranCoverageRatio: veteranCoverage.coverageRatio,
    };
  }, []);

  const sortDungeonChainMissions = (left, right) => {
    if ((left?.level || 0) !== (right?.level || 0)) {
      return (left?.level || 0) - (right?.level || 0);
    }
    const leftWingOrder = Number(left?.wingOrder) || 0;
    const rightWingOrder = Number(right?.wingOrder) || 0;
    if (leftWingOrder !== rightWingOrder) return leftWingOrder - rightWingOrder;
    return String(left?.name || "").localeCompare(String(right?.name || ""));
  };

  const buildMissionRun = useCallback(
    (
      quest,
      ids,
      startTime,
      rosterSnapshot,
      chainContext = null,
      runOptions = {},
    ) => {
      const selectedMembers = (
        Array.isArray(rosterSnapshot) ? rosterSnapshot : rosterRef.current
      ).filter((c) => ids.includes(c.id));
      const missionPreview = getAdjustedMissionSuccessPreview(
        quest,
        selectedMembers,
      );
      const consumableModifiers = runOptions?.consumableModifiers || null;
      const consumableSuccessBonus = Number(
        consumableModifiers?.successBonusPercent,
      ) || 0;
      const adjustedSuccessChance = Math.min(
        100,
        Math.max(0, missionPreview.successChance + consumableSuccessBonus),
      );
      const totalDuration = quest.duration * 1000;
      const dungeonProgress =
        quest.type === "dungeon"
          ? getDefaultDungeonProgress(quest, startTime, totalDuration)
          : null;
      let resumedDungeonProgress = dungeonProgress;
      let adjustedTotalDuration = totalDuration;
      let adjustedFinishTime = startTime + totalDuration;
      if (quest?.isRaid === true && dungeonProgress) {
        const resumeClearedSteps = getRaidResumeProgress({
          raidLockouts: raidLockoutsRef.current,
          mission: quest,
          currentDayIndex: getCurrentCalendarDayIndex(),
          memberIds: ids,
        });
        const bossCount = getDungeonBossCount(quest);
        const safeResumeSteps = Math.max(
          0,
          Math.min(bossCount - 1, resumeClearedSteps),
        );
        if (safeResumeSteps > 0) {
          const remainingSteps = Math.max(1, bossCount - safeResumeSteps);
          adjustedTotalDuration = dungeonProgress.stepDuration * remainingSteps;
          adjustedFinishTime = startTime + adjustedTotalDuration;
          resumedDungeonProgress = {
            ...dungeonProgress,
            currentStep: safeResumeSteps,
            clearedSteps: safeResumeSteps,
            lootAwardedSteps: Array.from(
              { length: safeResumeSteps },
              (_, index) => index + 1,
            ),
            nextStepAt: startTime + dungeonProgress.stepDuration,
          };
        }
      }
      const missionSuccess =
        quest.type === "dungeon"
          ? undefined
          : services.random() * 100 < adjustedSuccessChance;

      return {
        ...quest,
        instanceId: createId(),
        payoutGold: getMissionGoldReward(quest),
        wipeCost: getMissionWipeCost(quest),
        missionSuccess,
        successChance: adjustedSuccessChance,
        failChance: Math.max(0, 100 - adjustedSuccessChance),
        consumableModifiers,
        consumableSummary: formatConsumableUseSummary(consumableModifiers),
        moraleSuccessBonus: missionPreview.moraleSuccessBonus,
        partyPower: missionPreview.partyPower,
        missionPower: missionPreview.missionPower,
        questId: quest.id,
        startTime,
        finishTime: adjustedFinishTime,
        totalDuration: adjustedTotalDuration,
        dungeonProgress: resumedDungeonProgress,
        memberIds: [...ids],
        chainContext: chainContext
          ? {
              ...chainContext,
              remainingMissionIds: Array.isArray(
                chainContext.remainingMissionIds,
              )
                ? [...chainContext.remainingMissionIds]
                : [],
            }
          : null,
      };
    },
    [getAdjustedMissionSuccessPreview, getCurrentCalendarDayIndex],
  );

  const resolveDungeonChainContinuation = useCallback(
    ({ mission, missionSucceeded, rosterSnapshot, startTime }) => {
      const chainContext = mission?.chainContext;
      if (
        mission?.type !== "dungeon" ||
        !chainContext ||
        !Array.isArray(mission?.memberIds) ||
        mission.memberIds.length === 0
      ) {
        return {
          queuedMission: null,
          updatedRoster: rosterSnapshot,
          chainLogs: [],
          notification: null,
        };
      }

      const chainName =
        chainContext?.setName || mission?.dungeonSetName || "Dungeon Chain";
      const totalMissions = Math.max(
        1,
        Number(chainContext?.totalMissions) ||
          (Array.isArray(chainContext?.remainingMissionIds)
            ? chainContext.remainingMissionIds.length + 1
            : 1),
      );
      const currentPosition = Math.max(
        1,
        Math.min(totalMissions, Number(chainContext?.currentPosition) || 1),
      );
      const remainingMissionIds = Array.isArray(
        chainContext?.remainingMissionIds,
      )
        ? chainContext.remainingMissionIds
        : [];

      if (!missionSucceeded) {
        return {
          queuedMission: null,
          updatedRoster: rosterSnapshot,
          chainLogs: [
            {
              type: "dungeon-chain",
              outcome: "stopped",
              chainName,
              missionName: mission.name,
              position: currentPosition,
              total: totalMissions,
            },
          ],
          notification: null,
        };
      }

      if (remainingMissionIds.length === 0) {
        return {
          queuedMission: null,
          updatedRoster: rosterSnapshot,
          chainLogs: [
            {
              type: "dungeon-chain",
              outcome: "completed",
              chainName,
              missionName: mission.name,
              position: totalMissions,
              total: totalMissions,
            },
          ],
          notification: {
            type: "success",
            title: "Dungeon Chain Complete",
            message: `${chainName} finished.`,
            durationMs: 3600,
          },
        };
      }

      const missionLookup = new Map(
        (Array.isArray(missionListRef.current)
          ? missionListRef.current
          : []
        ).map((missionEntry) => [missionEntry.id, missionEntry]),
      );
      const nextMissionTemplate = missionLookup.get(remainingMissionIds[0]);
      if (!nextMissionTemplate || nextMissionTemplate.type !== "dungeon") {
        return {
          queuedMission: null,
          updatedRoster: rosterSnapshot,
          chainLogs: [
            {
              type: "dungeon-chain",
              outcome: "stopped",
              chainName,
              missionName: mission.name,
              position: currentPosition,
              total: totalMissions,
            },
          ],
          notification: {
            type: "error",
            title: "Dungeon Chain Stopped",
            message: "Missing mission data for next wing.",
          },
        };
      }

      const chainPartyMembers = rosterSnapshot.filter((char) =>
        mission.memberIds.includes(char.id),
      );
      const nextMissionKeyAccess = evaluateMissionKeyAccess({
        missions: [nextMissionTemplate],
        partyMembers: chainPartyMembers,
      });
      if (!nextMissionKeyAccess.canEnter) {
        const missingKeyLabel = nextMissionKeyAccess.missingKeyIds
          .map((keyId) => getKeyLabel(keyId) || keyId)
          .join(", ");
        return {
          queuedMission: null,
          updatedRoster: rosterSnapshot,
          chainLogs: [
            {
              type: "dungeon-chain",
              outcome: "stopped",
              chainName,
              missionName: nextMissionTemplate.name,
              position: currentPosition,
              total: totalMissions,
            },
          ],
          notification: {
            type: "error",
            title: "Dungeon Chain Stopped",
            message: `Missing key for ${nextMissionTemplate.dungeonWing || nextMissionTemplate.name}: ${missingKeyLabel}.`,
          },
        };
      }
      if (nextMissionTemplate?.isRaid === true) {
        const nextRaidStatus = getRaidLockoutStatus({
          raidLockouts: raidLockoutsRef.current,
          mission: nextMissionTemplate,
          currentDayIndex: getCurrentCalendarDayIndex(),
          memberIds: mission.memberIds,
        });
        if (nextRaidStatus.isWingLocked) {
          const missingWings =
            nextRaidStatus.missingRequiredWingLabels?.join(", ") ||
            nextRaidStatus.missingRequiredWingIds?.join(", ") ||
            "required wings";
          return {
            queuedMission: null,
            updatedRoster: rosterSnapshot,
            chainLogs: [
              {
                type: "dungeon-chain",
                outcome: "stopped",
                chainName,
                missionName: nextMissionTemplate.name,
                position: currentPosition,
                total: totalMissions,
              },
            ],
            notification: {
              type: "error",
              title: "Raid Chain Stopped",
              message: `${nextMissionTemplate.dungeonWing || nextMissionTemplate.name} unlocks after clearing: ${missingWings}.`,
            },
          };
        }
      }

      const nextPosition = Math.min(totalMissions, currentPosition + 1);
      const nextChainContext = {
        ...chainContext,
        totalMissions,
        currentPosition: nextPosition,
        remainingMissionIds: remainingMissionIds.slice(1),
      };

      const queuedMission = buildMissionRun(
        nextMissionTemplate,
        mission.memberIds,
        startTime,
        rosterSnapshot,
        nextChainContext,
      );
      const queuedMissionWithCalendar = mission.calendarEventId
        ? { ...queuedMission, calendarEventId: mission.calendarEventId }
        : queuedMission;

      const updatedRoster = rosterSnapshot.map((char) =>
        mission.memberIds.includes(char.id)
          ? {
              ...char,
              status: "Questing",
              statusText: `Chain: ${nextMissionTemplate.name}`,
            }
          : char,
      );

      return {
        queuedMission: queuedMissionWithCalendar,
        updatedRoster,
        chainLogs: [
          {
            type: "dungeon-chain",
            outcome: "continued",
            chainName,
            missionName: nextMissionTemplate.name,
            position: nextPosition,
            total: totalMissions,
          },
        ],
        notification: {
          type: "info",
          title: "Dungeon Chain",
          message: `Next wing: ${nextMissionTemplate.dungeonWing || nextMissionTemplate.name} (${nextPosition}/${totalMissions})`,
          durationMs: 2800,
        },
      };
    },
    [buildMissionRun, getCurrentCalendarDayIndex],
  );

  const missionRewardProcessor = useMemo(
    () =>
      createMissionRewardProcessor({
        dbItems: itemDatabase,
        dbClasses: DB_CLASSES,
        getClassArmorTypes,
        isItemUsableByClass,
        getKeyLabel,
        getItemEffectiveLevel,
        getMissionLootLevelRange,
        resolveMissionRewardQualities,
        getDungeonStepLootConfig,
        getDungeonStepQualityPriority,
        getDungeonBossCount,
        getDungeonQuarterExpMultiplier,
        getDungeonOverlevelExpMultiplier,
        getMissionLevelExpMultiplier,
        getReqExp,
        getMissionGoldReward,
      }),
    [itemDatabase],
  );

  const processMissionRewards = useCallback(
    (mission, currentRoster) =>
      missionRewardProcessor({
        mission,
        currentRoster,
        activeGuildStats: getGuildDerivedStats(guildProgressRef.current),
        activeFocusBonuses: getGuildFocusBonuses(guildSetupRef.current?.focus),
        levelCap: CONFIG.LEVEL_CAP,
        failedMissionExpFactor: FAILED_MISSION_EXP_FACTOR,
      }),
    [missionRewardProcessor],
  );

  const recordMissionRelationships = useCallback(
    (mission, missionSucceeded) => {
      if (!isRelationshipEligibleMission(mission)) return;
      const nextRelationships = updateRelationshipsForSharedActivity(
        guildRelationshipsRef.current,
        {
          mission,
          missionSucceeded,
          occurredAt: gameTimeRef.current,
        },
      );
      if (nextRelationships === guildRelationshipsRef.current) return;
      guildRelationshipsRef.current = nextRelationships;
      setGuildRelationships(nextRelationships);
    },
    [],
  );

  const applyDungeonStepLootAwards = useCallback(
    ({ activeMissions, finishedMissions, rosterSnapshot, stepLogs }) => {
      const awardDungeonStepLoot = missionRewardProcessor.awardDungeonStepLoot;
      if (typeof awardDungeonStepLoot !== "function") {
        return {
          activeMissions,
          finishedMissions,
          roster: rosterSnapshot,
          logs: stepLogs,
        };
      }

      let nextRoster = rosterSnapshot;
      const nextActiveMissions = [...activeMissions];
      const nextFinishedMissions = [...finishedMissions];
      const allMissions = [
        ...nextActiveMissions.map((mission, index) => ({
          mission,
          index,
          bucket: "active",
        })),
        ...nextFinishedMissions.map((mission, index) => ({
          mission,
          index,
          bucket: "finished",
        })),
      ];
      const nextLogs = [];

      (Array.isArray(stepLogs) ? stepLogs : []).forEach((log) => {
        nextLogs.push(log);
        if (log?.type !== "dungeon-step") return;

        const matchingMission = allMissions.find(({ mission }) => {
          const logInstanceId = String(log?.missionInstanceId || "");
          if (
            logInstanceId &&
            getMissionInstanceId(mission) === logInstanceId
          ) {
            return true;
          }
          return (
            !logInstanceId &&
            mission?.name === log?.missionName &&
            mission?.type === "dungeon"
          );
        });
        if (!matchingMission) return;

        if (log.outcome === "failed") {
          const memberIds = new Set(
            (Array.isArray(matchingMission.mission?.memberIds)
              ? matchingMission.mission.memberIds
              : []
            ).map((memberId) => String(memberId || "")),
          );
          if (memberIds.size > 0) {
            nextRoster = nextRoster.map((member) =>
              memberIds.has(String(member?.id || ""))
                ? applyMoraleDelta(member, MORALE_WIPE_DELTA)
                : member,
            );
          }
          return;
        }

        if (log.outcome !== "cleared") return;

        const awardResult = awardDungeonStepLoot({
          mission: matchingMission.mission,
          currentRoster: nextRoster,
          stepLog: log,
        });
        if (!awardResult?.mission) return;

        matchingMission.mission = awardResult.mission;
        if (matchingMission.bucket === "active") {
          nextActiveMissions[matchingMission.index] = awardResult.mission;
        } else {
          nextFinishedMissions[matchingMission.index] = awardResult.mission;
        }
        nextRoster = awardResult.updatedRoster || nextRoster;
        if (Array.isArray(awardResult.missionLogs)) {
          nextLogs.push(...awardResult.missionLogs);
        }
      });

      return {
        activeMissions: nextActiveMissions,
        finishedMissions: nextFinishedMissions,
        roster: nextRoster,
        logs: nextLogs,
      };
    },
    [missionRewardProcessor],
  );

  const commitCalendarState = useCallback((nextCalendarState) => {
    const normalized = normalizeCalendarState(
      nextCalendarState,
      gameTimeRef.current,
    );
    calendarStateRef.current = normalized;
    setCalendarState(normalized);
  }, []);

  const updateCalendarEvent = useCallback(
    (eventId, updater) => {
      if (!eventId || typeof updater !== "function") return;
      const currentState = calendarStateRef.current;
      const nextState = {
        ...currentState,
        calendarEvents: currentState.calendarEvents.map((event) =>
          event.id === eventId ? updater(event) : event,
        ),
      };
      commitCalendarState(nextState);
    },
    [commitCalendarState],
  );

  const completeCalendarEvent = useCallback(
    ({ eventId, missionName, missionSucceeded }) => {
      if (!eventId) return;
      const currentDayIndex = getCalendarDayIndex(
        gameTimeRef.current,
        calendarStateRef.current.calendarEpochGameTimeMs,
      );
      const currentState = calendarStateRef.current;
      const event = currentState.calendarEvents.find(
        (entry) => entry.id === eventId,
      );
      if (!event || event.status === CALENDAR_STATUS.COMPLETED) return;

      commitCalendarState({
        ...currentState,
        calendarEvents: currentState.calendarEvents.map((entry) =>
          entry.id === eventId
            ? {
                ...entry,
                status: CALENDAR_STATUS.COMPLETED,
                completedAtDayIndex: currentDayIndex,
              }
            : entry,
        ),
        calendarEventHistory: [
          {
            id: createId(),
            eventId,
            type: "completed",
            missionName: missionName || event.title,
            dayIndex: currentDayIndex,
            approvedRosterIds: [...event.approvedRosterIds],
            benchedIds: [...event.benchedIds],
            missionSucceeded: Boolean(missionSucceeded),
          },
          ...currentState.calendarEventHistory,
        ].slice(0, 100),
      });
    },
    [commitCalendarState],
  );

  // --- GAME LOOP ---
  useRuntimeInterval(() => {
      const previousGameTime = gameTimeRef.current;
      const clockStep = advanceGameTime({
        currentGameTime: previousGameTime,
        lastRealTime: lastRealTimeRef.current,
        realNow: services.now(),
        isPaused,
        speed: gameSpeed,
      });
      gameTimeRef.current = clockStep.gameTime;
      lastRealTimeRef.current = clockStep.lastRealTime;
      const now = gameTimeRef.current;
      const elapsedGameMs = Math.max(0, now - previousGameTime);
      setGameTimeMs(now);

      if (isPaused) return;

      const currentFaction =
        guildSetupRef.current?.faction || GUILD_FACTION.ALLIANCE;
      let currentRoster = normalizeRosterZones(
        rosterRef.current,
        currentFaction,
      );
      const currentGold = goldRef.current;
      const currentGuildStats = getGuildDerivedStats(guildProgressRef.current);
      const currentFocusBonuses = getGuildFocusBonuses(
        guildSetupRef.current?.focus,
      );
      const calendarDayIndex = getCalendarDayIndex(
        now,
        calendarStateRef.current.calendarEpochGameTimeMs,
      );
      const calendarDayProgress = getCalendarDayProgress(
        now,
        calendarStateRef.current.calendarEpochGameTimeMs,
      );
      const playerGuildSnapshot = buildPlayerGuildSnapshot({
        guildSetup: guildSetupRef.current,
        roster: currentRoster,
        missionList: missionListRef.current,
        guildProgress: guildProgressRef.current,
        raidLockouts: raidLockoutsRef.current,
      });
      const nextRealmState = advanceRealmSimulation({
        realmState: realmStateRef.current,
        currentDayIndex: calendarDayIndex,
        currentDayProgress: calendarDayProgress,
        playerGuildSnapshot,
        guildSetup: guildSetupRef.current,
      });
      if (
        JSON.stringify(nextRealmState) !== JSON.stringify(realmStateRef.current)
      ) {
        realmStateRef.current = nextRealmState;
        setRealmState(nextRealmState);
      }
      const normalizedRaidLockouts = normalizeRaidLockouts(
        raidLockoutsRef.current,
        calendarDayIndex,
      );
      if (
        JSON.stringify(normalizedRaidLockouts) !==
        JSON.stringify(raidLockoutsRef.current)
      ) {
        raidLockoutsRef.current = normalizedRaidLockouts;
        setRaidLockouts(normalizedRaidLockouts);
      }
      let newRoster = [...currentRoster];
      let currentMissions = [...missionsRef.current];
      let newMissions = [];
      let finishedMissions = [];
      let newLogs = [];
      let newGold = currentGold;
      let currentBattlefieldState = ensureBattlefieldState(
        battlefieldStateRef.current,
      );
      let nextGuildInventory = ensureGuildInventory(guildInventoryRef.current);

      const playerMarket = resolvePlayerGuildDeparturesForDay({
        realmState: realmStateRef.current,
        roster: currentRoster,
        activeMissions: currentMissions,
        currentDayIndex: calendarDayIndex,
        guildFaction: currentFaction,
      });
      if (playerMarket.events.length > 0) {
        currentRoster = playerMarket.roster;
        newRoster = [...playerMarket.roster];
        rosterRef.current = playerMarket.roster;
        setRoster(playerMarket.roster);
        realmStateRef.current = playerMarket.realmState;
        setRealmState(playerMarket.realmState);
        newLogs = [
          ...newLogs,
          ...playerMarket.events.map((event) => ({
            type: "realm",
            message: event.message,
          })),
        ];
        playerMarket.events.forEach((event) => {
          pushNotification({
            type: event.type === "player-departure" ? "error" : "warning",
            title:
              event.type === "player-departure"
                ? "Member Left Guild"
                : "Member Considering Offers",
            message: event.message,
            durationMs: 6500,
          });
        });
      }

      const refreshedCalendar = refreshCalendarState({
        state: calendarStateRef.current,
        currentDayIndex: calendarDayIndex,
        roster: currentRoster,
        activeMissions: currentMissions,
        missionList: missionListRef.current,
        createId,
        getRaidLockoutStatus: ({ mission, memberIds, currentDayIndex: statusDayIndex }) =>
          getRaidLockoutStatus({
            raidLockouts: raidLockoutsRef.current,
            mission,
            currentDayIndex: Number.isFinite(Number(statusDayIndex))
              ? Math.floor(Number(statusDayIndex))
              : calendarDayIndex,
            memberIds,
          }),
      });
      if (
        JSON.stringify(refreshedCalendar.state) !==
        JSON.stringify(calendarStateRef.current)
      ) {
        calendarStateRef.current = refreshedCalendar.state;
        setCalendarState(refreshedCalendar.state);
      }
      refreshedCalendar.newlyReadyEvents.forEach((event) => {
        newLogs.push({
          type: "calendar",
          message: `${event.title} is ready on ${formatCalendarDate(event.scheduledDayIndex)}.`,
        });
        pushNotification({
          type: "info",
          title: "Raid Event Ready",
          message: `${event.title}: finalize roster and start when ready.`,
          durationMs: 5200,
        });
      });

      const autoStartKeys = new Set();
      refreshedCalendar.state.calendarEvents
        .filter(
          (event) =>
            event.status === CALENDAR_STATUS.READY &&
            event.autoStart !== false &&
            event.rosterLocked === true &&
            event.scheduledDayIndex === calendarDayIndex &&
            getCalendarTimeOfDayOption(event.scheduledTimeOfDay).dayProgress <=
              calendarDayProgress &&
            Array.isArray(event.approvedRosterIds) &&
            event.approvedRosterIds.length > 0,
        )
        .filter((event) => {
          const eventKey = event.seriesId
            ? `${event.seriesId}:${event.scheduledDayIndex}`
            : event.id;
          if (autoStartKeys.has(eventKey)) return false;
          autoStartKeys.add(eventKey);
          return true;
        })
        .forEach((event) => {
          const started = startCalendarEventRef.current({
            eventId: event.id,
            source: "auto",
            calendarDayIndex,
            logAutoStart: true,
          });
          if (!started) return;
          newRoster = Array.isArray(rosterRef.current)
            ? [...rosterRef.current]
            : newRoster;
          currentMissions = Array.isArray(missionsRef.current)
            ? [...missionsRef.current]
            : currentMissions;
          newLogs.push({
            type: "calendar",
            message: `${event.title} auto-started at ${getCalendarTimeOfDayOption(event.scheduledTimeOfDay).label}.`,
          });
        });

      const missionOverlapPrune =
        pruneOverlappingActiveMissions(currentMissions);
      if (missionOverlapPrune.canceledMissions.length > 0) {
        currentMissions = missionOverlapPrune.activeMissions;
        const canceledMissionNames = [
          ...new Set(
            missionOverlapPrune.canceledMissions.map(
              (mission) => mission?.name || "Mission",
            ),
          ),
        ].join(", ");
        newLogs.push({
          type: "mission",
          message: `Cancelled overlapping mission${missionOverlapPrune.canceledMissions.length === 1 ? "" : "s"}: ${canceledMissionNames}.`,
        });
        pushNotification({
          type: "info",
          title: "Duplicate Mission Cancelled",
          message:
            "A hero was already in another active mission, so the overlapping mission was removed.",
          durationMs: 4200,
        });
      }

      // 1. Advance missions and separate finished/active
      const missionTick = advanceActiveMissionsForTick({
        activeMissions: currentMissions,
        now,
        currentGold: newGold,
        applyMissionWipeCosts,
      });
      newMissions = missionTick.activeMissions;
      finishedMissions = missionTick.finishedMissions;
      newGold = missionTick.guildGold;

      const stepLootAwards = applyDungeonStepLootAwards({
        activeMissions: newMissions,
        finishedMissions,
        rosterSnapshot: newRoster,
        stepLogs: missionTick.stepLogs,
      });
      newMissions = stepLootAwards.activeMissions;
      finishedMissions = stepLootAwards.finishedMissions;
      newRoster = stepLootAwards.roster;
      newLogs = [...newLogs, ...stepLootAwards.logs];

      // 2. Process Finished Missions (Fixes "Stuck" Issue)
      finishedMissions.forEach((m) => {
        const missionInstanceId = getMissionInstanceId(m);
        if (rewardedMissionIdsRef.current.has(missionInstanceId)) return;
        rewardedMissionIdsRef.current.add(missionInstanceId);

        const result = processMissionRewards(m, newRoster);
        recordMissionRelationships(m, result.missionSucceeded);
        if (m?.isRaid === true) {
          const nextRaidLockouts = updateRaidLockoutProgress({
            raidLockouts: raidLockoutsRef.current,
            mission: m,
            currentDayIndex: calendarDayIndex,
            memberIds: m.memberIds,
            clearedSteps: m.dungeonProgress?.clearedSteps || 0,
            totalBosses: getDungeonBossCount(m),
          });
          raidLockoutsRef.current = nextRaidLockouts;
          setRaidLockouts(nextRaidLockouts);
        }
        newRoster = result.updatedRoster;
        newLogs = [...newLogs, ...result.missionLogs];
        if (m.type === "dungeon") {
          if (result.missionSucceeded) {
            registerDungeonClearMilestones(m);
          } else {
            registerDungeonWipeMilestone(m.name);
          }
        }
        if (!result.missionSucceeded) {
          pushNotification({
            type: "error",
            title: "Mission Failed",
            message: m.name,
          });
        }

        const openGoldSpace = currentGuildStats.goldCap - newGold;
        const gainedGold = Math.max(
          0,
          Math.min(result.missionGold, openGoldSpace),
        );
        if (gainedGold > 0) {
          newGold += gainedGold;
          newLogs.push({
            type: "gold",
            amount: gainedGold,
            missionName: m.name,
          });
        }

        const chainResolution = resolveDungeonChainContinuation({
          mission: m,
          missionSucceeded: result.missionSucceeded,
          rosterSnapshot: newRoster,
          startTime: now,
        });
        let chainQueued = false;
        let chainBlockedByActiveMember = false;
        if (chainResolution.queuedMission) {
          const busyMemberIds = getActiveMissionMemberIdSet(newMissions);
          const queuedMemberIds = Array.isArray(
            chainResolution.queuedMission.memberIds,
          )
            ? chainResolution.queuedMission.memberIds
            : [];
          const hasBusyMember = queuedMemberIds.some((memberId) =>
            busyMemberIds.has(String(memberId || "")),
          );
          if (!hasBusyMember) {
            newRoster = chainResolution.updatedRoster;
            newMissions.push(chainResolution.queuedMission);
            chainQueued = true;
          } else {
            chainBlockedByActiveMember = true;
            newLogs.push({
              type: "dungeon-chain",
              outcome: "stopped",
              chainName:
                m.chainContext?.setName || m.dungeonSetName || m.name,
              missionName: m.name,
              message: `${m.name} chain stopped because a party member is already in another active mission.`,
            });
          }
        } else {
          newRoster = chainResolution.updatedRoster;
        }
        if (
          !chainBlockedByActiveMember &&
          chainResolution.chainLogs.length > 0
        ) {
          newLogs = [...newLogs, ...chainResolution.chainLogs];
        }
        if (!chainBlockedByActiveMember && chainResolution.notification) {
          pushNotification(chainResolution.notification);
        }
        if (m.calendarEventId && !chainQueued) {
          completeCalendarEvent({
            eventId: m.calendarEventId,
            missionName: m.dungeonSetName || m.name,
            missionSucceeded: result.missionSucceeded,
          });
        }
      });

      const battlefieldAdvance = advanceBattlefieldState({
        battlefieldState: currentBattlefieldState,
        roster: newRoster,
        now,
        guildFaction: currentFaction,
      });
      currentBattlefieldState = battlefieldAdvance.battlefieldState;
      newRoster = battlefieldAdvance.roster;
      newLogs = [...newLogs, ...battlefieldAdvance.logs];
      battlefieldAdvance.completedBattles.forEach((battle) => {
        pushNotification({
          type: battle.result === "victory" ? "achievement" : "info",
          title:
            battle.result === "victory"
              ? "Warsong Gulch Victory"
              : battle.result === "defeat"
                ? "Warsong Gulch Defeat"
                : "Warsong Gulch Draw",
          message: `${battle.playerScore}-${battle.enemyScore}: +${battle.reward?.honorPerParticipant || 0} Honor.`,
          durationMs: 5200,
        });
      });

      const aggressivePvpQueue = resolveAutoBattlefieldQueue({
        battlefieldState: currentBattlefieldState,
        roster: newRoster,
        activeMissions: newMissions,
        guildSetup: guildSetupRef.current,
        now,
        currentDayIndex: calendarDayIndex,
        guildFaction: currentFaction,
        createId,
        aggressiveOnly: true,
      });
      currentBattlefieldState = aggressivePvpQueue.battlefieldState;
      newRoster = aggressivePvpQueue.roster;
      newLogs = [...newLogs, ...aggressivePvpQueue.logs];
      if (aggressivePvpQueue.queued) {
        pushNotification({
          type: "info",
          title: "Warsong Gulch Queued",
          message: `${aggressivePvpQueue.battle.participantIds.length} heroes joined the battleground queue.`,
          durationMs: 4200,
        });
      }

      const autoDungeonAttempt = resolveAutoDungeonAttempt({
        mode:
          guildSetupRef.current?.focus === GUILD_FOCUS.RAID_ATTUNEMENTS &&
          guildSetupRef.current?.dungeonActivity === GUILD_DUNGEON_ACTIVITY.NONE
            ? GUILD_DUNGEON_ACTIVITY.BALANCED
            : guildSetupRef.current?.dungeonActivity ||
          GUILD_DUNGEON_ACTIVITY.NONE,
        guildFocus: guildSetupRef.current?.focus,
        now,
        nextAttemptAt: autoDungeonStateRef.current.nextAttemptAt,
        lastCheckpointKey: autoDungeonStateRef.current.lastCheckpointKey,
        calendarEpochGameTimeMs:
          calendarStateRef.current.calendarEpochGameTimeMs,
        missionList: missionListRef.current,
        roster: newRoster,
        activeMissions: newMissions,
        minSuccessChance: guildSetupRef.current?.dungeonMinSuccessChance,
        getSuccessPreview: getAdjustedMissionSuccessPreview,
      });
      autoDungeonStateRef.current = {
        nextAttemptAt: autoDungeonAttempt.nextAttemptAt,
        lastCheckpointKey: autoDungeonAttempt.lastCheckpointKey,
      };
      const autoDungeonCandidates = Array.isArray(autoDungeonAttempt.candidates)
        ? autoDungeonAttempt.candidates
        : autoDungeonAttempt.candidate
          ? [autoDungeonAttempt.candidate]
          : [];
      autoDungeonCandidates.forEach((candidate) => {
        const { mission, memberIds, successChance } = candidate;
        if (
          !isMissionMemberGroupAvailable({
            memberIds,
            roster: newRoster,
            activeMissions: newMissions,
          })
        ) {
          return;
        }
        const isAttunementGoal = candidate.goalType === "attunement";
        const attunementLabel = isAttunementGoal
          ? getKeyLabel(candidate.keyId) || "Attunement"
          : "";
        const chainMissionIds = Array.isArray(candidate.chainMissionIds)
          ? candidate.chainMissionIds
          : [];
        const chainMissions =
          chainMissionIds.length > 1
            ? chainMissionIds
                .map((missionId) =>
                  missionListRef.current.find(
                    (missionEntry) => missionEntry.id === missionId,
                  ),
                )
                .filter(Boolean)
                .sort(sortDungeonChainMissions)
            : [];
        const hasDungeonChain = chainMissions.length > 1;
        const openingMission = hasDungeonChain ? chainMissions[0] : mission;
        const chainContext = hasDungeonChain
          ? {
              chainId: createId(),
              setId: openingMission.dungeonSetId,
              setName: openingMission.dungeonSetName || openingMission.name,
              totalMissions: chainMissions.length,
              currentPosition: 1,
              remainingMissionIds: chainMissions
                .slice(1)
                .map((missionEntry) => missionEntry.id),
            }
          : null;
        const missionRun = buildMissionRun(
          openingMission,
          memberIds,
          now,
          newRoster,
          chainContext,
        );
        newRoster = newRoster.map((char) =>
          memberIds.includes(char.id)
            ? {
                ...char,
                status: "Questing",
                statusText: hasDungeonChain
                  ? `Auto Chain: ${chainContext.setName}`
                  : isAttunementGoal
                    ? `Attunement: ${attunementLabel}`
                    : `Auto Dungeon: ${openingMission.dungeonWing || openingMission.name}`,
                autoDungeonLastStartedAt: now,
                autoDungeonLastMissionId: String(
                  openingMission.id ?? openingMission.questId ?? "",
                ),
                autoDungeonLastMissionName:
                  openingMission.dungeonWing || openingMission.name,
              }
            : char,
        );
        newMissions.push(missionRun);
        newLogs.push({
          type: isAttunementGoal ? "attunement-goal" : "auto-dungeon",
          missionName: hasDungeonChain
            ? chainContext.setName
            : openingMission.dungeonWing || openingMission.name,
          message: `${memberIds.length} heroes formed ${
            isAttunementGoal
              ? `an attunement group for ${attunementLabel}`
              : `an automatic ${hasDungeonChain ? "dungeon chain" : "dungeon group"}`
          } for ${
            hasDungeonChain
              ? chainMissions.map((missionEntry) => missionEntry.dungeonWing || missionEntry.name).join(" + ")
              : openingMission.dungeonWing || openingMission.name
          } (${successChance}% success).`,
        });
        pushNotification({
          type: "info",
          title: isAttunementGoal
            ? "Attunement Group Formed"
            : hasDungeonChain
            ? "Dungeon Chain Formed"
            : "Dungeon Group Formed",
          message: `${isAttunementGoal ? `${attunementLabel}: ` : ""}${
            hasDungeonChain ? chainMissions.map((missionEntry) => missionEntry.dungeonWing || missionEntry.name).join(" + ") : openingMission.dungeonWing || openingMission.name
          }: ${memberIds.length} heroes, ${successChance}% success.`,
          durationMs: 4200,
        });
      });

      const autoZoneEliteGroups = resolveAutoZoneEliteGroups({
        roster: newRoster,
        activeMissions: newMissions,
        missionList: missionListRef.current,
        minSuccessChance: guildSetupRef.current?.eliteQuestMinSuccessChance,
        getSuccessPreview: getAdjustedMissionSuccessPreview,
      });
      autoZoneEliteGroups.forEach((candidate) => {
        const {
          mission,
          memberIds,
          starterMemberIds,
          supporterMemberIds,
          successChance,
        } = candidate;
        if (
          !isMissionMemberGroupAvailable({
            memberIds,
            roster: newRoster,
            activeMissions: newMissions,
          })
        ) {
          return;
        }
        const isAttunementGoal = candidate.goalType === "attunement";
        const attunementLabel = isAttunementGoal
          ? getKeyLabel(candidate.keyId) || "Attunement"
          : "";
        const missionRun = buildMissionRun(
          mission,
          memberIds,
          now,
          newRoster,
        );
        newRoster = newRoster.map((char) =>
          memberIds.includes(char.id)
            ? {
                ...char,
                status: "Questing",
                statusText: isAttunementGoal
                  ? `Attunement: ${attunementLabel}`
                  : `Group Quest: ${mission.name}`,
                autoZoneEliteLastStartedAt: now,
                autoZoneEliteLastMissionId: String(mission.id ?? ""),
              }
            : char,
        );
        newMissions.push(missionRun);
        newLogs.push({
          type: isAttunementGoal ? "attunement-goal" : "zone-elite",
          missionName: mission.name,
          message: `${memberIds.length} heroes formed ${
            isAttunementGoal
              ? `an attunement group for ${attunementLabel}`
              : "a zone elite group"
          } via ${mission.name} (${successChance}% success).`,
        });
        pushNotification({
          type: "info",
          title: isAttunementGoal
            ? "Attunement Group Formed"
            : "Zone Elite Group Formed",
          message: `${isAttunementGoal ? `${attunementLabel}: ` : ""}${mission.name}: ${memberIds.length} heroes, ${successChance}% success. ${starterMemberIds.length} need it${
            supporterMemberIds.length > 0
              ? `, ${supporterMemberIds.length} helping`
              : ""
          }.`,
          durationMs: 4200,
        });
      });

      const conservativePvpQueue = resolveAutoBattlefieldQueue({
        battlefieldState: currentBattlefieldState,
        roster: newRoster,
        activeMissions: newMissions,
        guildSetup: guildSetupRef.current,
        now,
        currentDayIndex: calendarDayIndex,
        guildFaction: currentFaction,
        createId,
        aggressiveOnly: false,
      });
      currentBattlefieldState = conservativePvpQueue.battlefieldState;
      newRoster = conservativePvpQueue.roster;
      newLogs = [...newLogs, ...conservativePvpQueue.logs];
      if (conservativePvpQueue.queued) {
        pushNotification({
          type: "info",
          title: "Warsong Gulch Queued",
          message: `${conservativePvpQueue.battle.participantIds.length} heroes joined the battleground queue.`,
          durationMs: 4200,
        });
      }

      const activeMissionMemberIds = getActiveMissionMemberIdSet(newMissions);
      newRoster = newRoster.map((char) => {
        const memberId = String(char?.id || "");
        if (
          char?.status === "Questing" &&
          memberId &&
          !activeMissionMemberIds.has(memberId)
        ) {
          return {
            ...char,
            status: "Idle",
            statusText: "Resting...",
          };
        }
        return char;
      });

      // 3. Process Character Status (Idle/Professions)
      newRoster = newRoster.map((char) => {
        const normalizedChar = normalizeCharacterZoneState(
          char,
          currentFaction,
        );
        if (
          normalizedChar.status === "Questing" ||
          normalizedChar.status === BATTLEFIELD_CHARACTER_STATUS
        ) {
          return normalizedChar;
        }

        let statusText = "Resting...";
        let gainXP = false;
        let gainSkill = false;
        let gainZoneProgress = false;

        const activityPlan = resolveCharacterActivityPlan({
          character: normalizedChar,
          faction: currentFaction,
          levelCap: CONFIG.LEVEL_CAP,
          zoneQuestingEnabled: ENABLE_ZONE_QUESTING,
        });
        const hardCap = activityPlan.hardCap;
        const professionSkillLimit = activityPlan.professionSkillLimit;
        statusText = activityPlan.statusText;
        gainXP = activityPlan.gainXP;
        gainSkill = activityPlan.gainSkill;
        gainZoneProgress = activityPlan.gainZoneProgress;

        if (gainXP || gainZoneProgress) {
          const activeZone =
            ENABLE_ZONE_QUESTING && normalizedChar.currentZoneId
              ? getZoneById(normalizedChar.currentZoneId)
              : null;
          let newExp = normalizedChar.exp;
          let newLevel = normalizedChar.level;
          let maxExp = getReqExp(newLevel);
          let leveledUp = false;

          if (gainXP) {
            const zoneExpMultiplier = activeZone
              ? getZoneExpMultiplier(normalizedChar.level, activeZone)
              : 1;
            const expGain = getLevelingTickExpGain(
              normalizedChar.level,
              currentGuildStats.expMultiplier *
                currentFocusBonuses.expMultiplier *
                zoneExpMultiplier *
                getCharacterLevelingExpMultiplier(normalizedChar),
            );
            newExp += expGain;
            while (newExp >= maxExp && newLevel < CONFIG.LEVEL_CAP) {
              newLevel++;
              newExp -= maxExp;
              maxExp = getReqExp(newLevel);
              leveledUp = true;
            }
          }

          if (newLevel >= CONFIG.LEVEL_CAP) {
            newLevel = CONFIG.LEVEL_CAP;
            maxExp = getReqExp(newLevel);
            newExp = maxExp;
          }

          let currentZoneId = activeZone?.id || null;
          let currentZoneProgress = getClampedZoneProgress(
            normalizedChar.currentZoneProgress,
          );
          let zoneManualOverride = normalizedChar.zoneManualOverride;
          let zoneOverlevelMoveThreshold =
            normalizedChar.zoneOverlevelMoveThreshold;
          let zoneProgressById = { ...normalizedChar.zoneProgressById };
          let zonesCleared = [...normalizedChar.zonesCleared];
          let zoneCheckpointRewardsClaimedByZone = {
            ...normalizedChar.zoneCheckpointRewardsClaimedByZone,
          };
          const checkpointLootRewardEntries = [];

          let forceZoneAdvance = false;
          let zoneClearedThisTick = false;
          if (activeZone) {
            const storedProgress = getClampedZoneProgress(
              zoneProgressById[activeZone.id] ?? currentZoneProgress,
            );
            const progressGain = getZoneProgressPerTick({
              zone: activeZone,
              characterLevel: normalizedChar.level,
              durationVariance: normalizedChar.zoneDurationVariance,
            }) * getCharacterZoneProgressMultiplier(normalizedChar);
            const nextProgress = getClampedZoneProgress(
              storedProgress + progressGain,
            );
            currentZoneProgress = nextProgress;
            zoneProgressById[activeZone.id] = nextProgress;

            const zoneAlreadyCleared = zonesCleared.includes(activeZone.id);
            const claimedSet = new Set(
              Array.isArray(zoneCheckpointRewardsClaimedByZone[activeZone.id])
                ? zoneCheckpointRewardsClaimedByZone[activeZone.id]
                    .map((checkpoint) => Number(checkpoint))
                    .filter((checkpoint) =>
                      ZONE_PROGRESS_CHECKPOINTS.includes(checkpoint),
                    )
                : [],
            );

            if (!zoneAlreadyCleared) {
              ZONE_PROGRESS_CHECKPOINTS.forEach((checkpoint) => {
                if (nextProgress < checkpoint || claimedSet.has(checkpoint))
                  return;
                claimedSet.add(checkpoint);

                const checkpointGold = getZoneCheckpointGoldReward(
                  activeZone,
                  checkpoint,
                );
                const openGoldSpace = Math.max(
                  0,
                  currentGuildStats.goldCap - newGold,
                );
                const gainedGold = Math.max(
                  0,
                  Math.min(checkpointGold, openGoldSpace),
                );
                if (gainedGold > 0) {
                  newGold += gainedGold;
                  newLogs.push({
                    type: "zone-gold",
                    amount: gainedGold,
                    missionName: activeZone.name,
                    checkpoint,
                  });
                }

                const checkpointLootQualities = getZoneCheckpointLootQualities(
                  activeZone,
                  checkpoint,
                );
                checkpointLootQualities.forEach((quality) => {
                  checkpointLootRewardEntries.push({
                    quality,
                    checkpoint,
                    zoneId: activeZone.id,
                  });
                });

                if (checkpoint >= 100) {
                  zonesCleared = [...zonesCleared, activeZone.id];
                  zoneClearedThisTick = true;
                  newLogs.push({
                    type: "zone-clear",
                    characterName: normalizedChar.name,
                    missionName: activeZone.name,
                  });
                }
              });
            }
            if (nextProgress >= 100 && !zonesCleared.includes(activeZone.id)) {
              zonesCleared = [...zonesCleared, activeZone.id];
              zoneClearedThisTick = true;
              if (!claimedSet.has(100)) {
                claimedSet.add(100);
              }
              newLogs.push({
                type: "zone-clear",
                characterName: normalizedChar.name,
                missionName: activeZone.name,
              });
            }
            forceZoneAdvance = nextProgress >= 100;

            zoneCheckpointRewardsClaimedByZone[activeZone.id] = [
              ...claimedSet,
            ].sort((left, right) => left - right);
          }

          const transitionedZoneState = resolveZoneAutoTransition({
            character: normalizedChar,
            faction: currentFaction,
            level: newLevel,
            currentZoneId,
            currentZoneProgress,
            zoneProgressById,
            zonesCleared,
            zoneCheckpointRewardsClaimedByZone,
            zoneManualOverride,
            zoneOverlevelMoveThreshold,
            forceAdvance: forceZoneAdvance,
          });
          currentZoneId = transitionedZoneState.currentZoneId;
          currentZoneProgress = transitionedZoneState.currentZoneProgress;
          zoneProgressById = transitionedZoneState.zoneProgressById;
          zonesCleared = transitionedZoneState.zonesCleared;
          zoneCheckpointRewardsClaimedByZone =
            transitionedZoneState.zoneCheckpointRewardsClaimedByZone;
          zoneManualOverride = transitionedZoneState.zoneManualOverride;
          zoneOverlevelMoveThreshold =
            transitionedZoneState.zoneOverlevelMoveThreshold;

          const currentZone = transitionedZoneState.currentZone;
          const zoneStatusLabel = getZoneProgressLabel(
            currentZone,
            currentZoneProgress,
          );
          const moraleAdjustedChar =
            activeZone &&
            zoneClearedThisTick &&
            isCharacterInZoneLevelRange(normalizedChar, activeZone)
              ? applyMoraleDelta(
                  normalizedChar,
                  MORALE_ZONE_CLEAR_DELTA,
                )
              : normalizedChar;
          const leveledChar = {
            ...moraleAdjustedChar,
            level: newLevel,
            exp: newExp,
            maxExp,
            statusText: zoneStatusLabel
              ? `🧭 Zone: ${zoneStatusLabel}`
              : statusText,
            lastLevelUp: leveledUp ? services.now() : normalizedChar.lastLevelUp,
            currentZoneId,
            currentZoneProgress,
            zoneProgress: currentZoneProgress,
            zoneManualOverride,
            zoneProgressById,
            zonesCleared,
            zoneCheckpointRewardsClaimedByZone,
            zoneOverlevelMoveThreshold,
          };
          let zoneRewardedChar = leveledChar;
          checkpointLootRewardEntries.forEach((entry) => {
            const rewardZone = getZoneById(entry.zoneId);
            if (!rewardZone) return;
            const lootItem = generateZoneCheckpointLoot(
              { ...zoneRewardedChar, level: newLevel },
              rewardZone,
              entry.quality,
              itemDatabase,
            );
            zoneRewardedChar = applyLootRewardToCharacter({
              char: zoneRewardedChar,
              lootItem,
              logCollector: newLogs,
              missionName: rewardZone.name,
              bossName: `${entry.checkpoint}% checkpoint`,
              updateStatusText: false,
              logDiscarded: true,
            });
          });
          return tryApplyWorldTickLoot(zoneRewardedChar, newLogs);
        }

        const transitionedZoneState = resolveZoneAutoTransition({
          character: normalizedChar,
          faction: currentFaction,
          level: normalizedChar.level,
          currentZoneId: normalizedChar.currentZoneId,
          currentZoneProgress: normalizedChar.currentZoneProgress,
          zoneProgressById: normalizedChar.zoneProgressById,
          zonesCleared: normalizedChar.zonesCleared,
          zoneCheckpointRewardsClaimedByZone:
            normalizedChar.zoneCheckpointRewardsClaimedByZone,
          zoneManualOverride: normalizedChar.zoneManualOverride,
          zoneOverlevelMoveThreshold: normalizedChar.zoneOverlevelMoveThreshold,
        });

        if (gainSkill) {
          const currentLimit = professionSkillLimit || hardCap;
          const professionSkillResult = applyProfessionSkillAttempts({
            professions: normalizedChar.professions,
            currentLimit,
            elapsedGameMs,
            tickRateMs: CONFIG.TICK_RATE,
          });

          if (professionSkillResult.attempted) {
            const pName = professionSkillResult.skilledProfessionName;
            statusText = PROF_ACTIONS[pName] || `Working on ${pName}...`;
            const materialResult = generatePassiveProfessionMaterial({
              character: normalizedChar,
              professionName: pName,
              guildInventory: nextGuildInventory,
            });
            nextGuildInventory = materialResult.guildInventory;

            if (professionSkillResult.changed) {
              return {
                ...normalizedChar,
                professions: professionSkillResult.professions,
                statusText,
                currentZoneId: transitionedZoneState.currentZoneId,
                currentZoneProgress: transitionedZoneState.currentZoneProgress,
                zoneProgress: transitionedZoneState.currentZoneProgress,
                zoneProgressById: transitionedZoneState.zoneProgressById,
                zonesCleared: transitionedZoneState.zonesCleared,
                zoneCheckpointRewardsClaimedByZone:
                  transitionedZoneState.zoneCheckpointRewardsClaimedByZone,
                zoneManualOverride: transitionedZoneState.zoneManualOverride,
                zoneOverlevelMoveThreshold:
                  transitionedZoneState.zoneOverlevelMoveThreshold,
              };
            }
          }
        }

        const idleCharacter = {
          ...normalizedChar,
          statusText,
          currentZoneId: transitionedZoneState.currentZoneId,
          currentZoneProgress: transitionedZoneState.currentZoneProgress,
          zoneProgress: transitionedZoneState.currentZoneProgress,
          zoneProgressById: transitionedZoneState.zoneProgressById,
          zonesCleared: transitionedZoneState.zonesCleared,
          zoneCheckpointRewardsClaimedByZone:
            transitionedZoneState.zoneCheckpointRewardsClaimedByZone,
          zoneManualOverride: transitionedZoneState.zoneManualOverride,
          zoneOverlevelMoveThreshold:
            transitionedZoneState.zoneOverlevelMoveThreshold,
        };
        if (!gainXP && !gainSkill && !gainZoneProgress) {
          return resolveWorldPvpRoamingAssignment({
            character: idleCharacter,
            faction: currentFaction,
            realmType: guildSetupRef.current?.serverStyle,
          });
        }
        return idleCharacter;
      });

      rosterRef.current = newRoster;
      missionsRef.current = newMissions;

      const worldPvpResult = resolveWorldPvpForDay({
        roster: newRoster,
        activeMissions: newMissions,
        realmState: realmStateRef.current,
        guildFaction: currentFaction,
        realmType: guildSetupRef.current?.serverStyle,
        worldPvpState: worldPvpStateRef.current,
        currentDayIndex: calendarDayIndex,
      });
      newRoster = worldPvpResult.roster;
      newLogs = [...newLogs, ...worldPvpResult.logs];
      let nextWorldPvpState = worldPvpResult.worldPvpState;
      const pvpRollover = applyWeeklyPvpRollover({
        characters: newRoster,
        currentDay: calendarDayIndex,
        faction: currentFaction,
        allItems: itemDatabase,
        lastRolloverDayIndex: nextWorldPvpState.lastWeeklyRolloverDayIndex,
      });
      newRoster = pvpRollover.characters;
      if (pvpRollover.didRollover) {
        nextWorldPvpState = {
          ...nextWorldPvpState,
          weeklyHonor: 0,
          lastWeeklyRolloverDayIndex: pvpRollover.currentDayIndex,
        };
        newLogs = [...newLogs, ...pvpRollover.logs];
      }
      worldPvpStateRef.current = nextWorldPvpState;
      battlefieldStateRef.current = currentBattlefieldState;

      rosterRef.current = newRoster;
      missionsRef.current = newMissions;
      setRoster(newRoster);
      setActiveMissions(newMissions);
      setWorldPvpState(nextWorldPvpState);
      setBattlefieldState(currentBattlefieldState);
      if (
        JSON.stringify(nextGuildInventory) !==
        JSON.stringify(guildInventoryRef.current)
      ) {
        guildInventoryRef.current = nextGuildInventory;
        setGuildInventory(nextGuildInventory);
      }
      if (newGold !== currentGold) {
        goldRef.current = newGold;
        setGuildGold(newGold);
      }

      if (newLogs.length > 0) {
        const time = new Date().toLocaleTimeString();
        setGuildLog((prev) =>
          [...newLogs.map((log) => ({ time, ...log })), ...prev].slice(0, 50),
        );
      }
  }, CONFIG.TICK_RATE);

  const handleOpenRecruit = () => {
    const openSlots = Math.max(
      0,
      guildDerivedStats.maxRoster - rosterRef.current.length,
    );
    const openApplications = getRealmGuildApplications({
      realmState: realmStateRef.current,
      faction: guildSetupRef.current?.faction || GUILD_FACTION.ALLIANCE,
    }).length;
    if (openSlots <= 0 && openApplications <= 0) {
      pushNotification({
        type: "error",
        title: "Recruitment Blocked",
        message: "Member limit reached. Dismiss heroes to recruit more.",
      });
      return;
    }
    setShowRecruit(true);
  };

  const handleScoutRecruitmentTier = (tier, options = {}) => {
    const scoutCost = Math.max(
      0,
      Number(options?.scoutCostGold ?? tier?.scoutCostGold) || 0,
    );
    const currentGold = Math.max(0, Number(goldRef.current) || 0);
    if (currentGold < scoutCost) {
      pushNotification({
        type: "error",
        title: "Recruitment Blocked",
        message: `Need ${scoutCost}g to scout ${tier?.label || "applicants"}.`,
      });
      return [];
    }

    const scoutCount = Math.max(1, Math.floor(Number(options?.count) || 5));
    const applicationPlayerIds = new Set(
      getRealmGuildApplications({
        realmState: realmStateRef.current,
        faction: guildSetupRef.current?.faction || GUILD_FACTION.ALLIANCE,
      }).map(({ player }) => String(player?.id || "")),
    );
    const usedNameSet = new Set(
      rosterRef.current
        .map((member) => String(member?.name || "").trim().toLowerCase())
        .filter(Boolean),
    );
    const candidates = selectRealmRecruitmentCandidates({
      realmState: realmStateRef.current,
      faction: guildSetupRef.current?.faction || GUILD_FACTION.ALLIANCE,
      tier,
      count: scoutCount + applicationPlayerIds.size,
    })
      .filter((player) => !applicationPlayerIds.has(String(player?.id || "")))
      .filter(
        (player) =>
          !usedNameSet.has(String(player?.name || "").trim().toLowerCase()),
      )
      .slice(0, scoutCount)
      .map((player) => buildRealmRecruitmentCandidate({ player }));

    const updatedGold = Math.max(0, currentGold - scoutCost);
    goldRef.current = updatedGold;
    setGuildGold(updatedGold);
    pushNotification({
      type: "info",
      title: "Recruitment Scouted",
      message:
        candidates.length > 0
          ? `${candidates.length} realm prospect${candidates.length === 1 ? "" : "s"} scouted for ${scoutCost}g.`
          : `No available realm prospects found in ${tier?.label || "that range"}. Scouting cost: ${scoutCost}g.`,
    });
    return candidates;
  };

  const buildRealmRecruitmentCandidate = useCallback(
    ({ player, application }) => {
      const level = Math.max(
        1,
        Math.min(CONFIG.LEVEL_CAP, Number(player?.level) || 1),
      );
      const candidate = {
        id: player.id,
        realmPlayerId: player.id,
        realmApplicationId: application?.id || null,
        realmSourceGuildId: player.guildId || null,
        realmRecruitmentSource: player.guildId
          ? `From ${player.sourceGuildName || "another guild"}`
          : "Free Agent",
        realmApplicationDayIndex: application?.dayIndex,
        name: player.name,
        race: player.race,
        gender: player.gender || "Male",
        charClass: player.charClass,
        role: player.role,
        personalityTraits: player.personalityTraits,
        level,
        exp: 0,
        maxExp: CONFIG.XP_TABLE[level] || CONFIG.XP_TABLE[1],
      };
      return {
        ...candidate,
        equipment: buildRecruitmentEquipment({
          character: candidate,
          itemDatabase,
        }),
      };
    },
    [itemDatabase],
  );

  const realmApplicationCandidates = useMemo(() => {
    const usedNameSet = new Set(
      roster
        .map((member) => String(member?.name || "").trim().toLowerCase())
        .filter(Boolean),
    );
    return getRealmGuildApplications({
      realmState,
      faction: guildSetup.faction || GUILD_FACTION.ALLIANCE,
    })
      .filter(
        ({ player }) =>
          !usedNameSet.has(String(player?.name || "").trim().toLowerCase()),
      )
      .map(buildRealmRecruitmentCandidate);
  }, [
    buildRealmRecruitmentCandidate,
    guildSetup.faction,
    realmState,
    roster,
  ]);

  const realmRecruitmentMarketStats = useMemo(
    () =>
      getRealmRecruitmentMarketStats({
        realmState,
        faction: guildSetup.faction || GUILD_FACTION.ALLIANCE,
      }),
    [guildSetup.faction, realmState],
  );

  const handleRecruit = (chars, tier = {}) => {
    const recruitCostGold = Math.max(1, Number(tier?.recruitCostGold) || 1);
    const { recruits, spentGold, updatedGold, updatedRoster } =
      resolveRecruitmentResult({
        currentRoster: rosterRef.current,
        currentGold: goldRef.current,
        selectedCandidates: chars,
        maxRoster: guildDerivedStats.maxRoster,
        recruitCostGold,
      });

    if (recruits.length === 0) {
      pushNotification({
        type: "error",
        title: "Recruitment Blocked",
        message: "Need free roster slots to recruit heroes.",
      });
      setShowRecruit(false);
      return;
    }

    const recruitedRealmPlayerIds = recruits
      .map((candidate) => candidate.realmPlayerId)
      .filter(Boolean);
    if (recruitedRealmPlayerIds.length > 0) {
      const nextRealmState = markRealmPlayersRecruited({
        realmState: realmStateRef.current,
        playerIds: recruitedRealmPlayerIds,
      });
      realmStateRef.current = nextRealmState;
      setRealmState(nextRealmState);
    }

    const zoneReadyRoster = normalizeRosterZones(updatedRoster);
    rosterRef.current = zoneReadyRoster;
    goldRef.current = updatedGold;
    setRoster(zoneReadyRoster);
    setGuildGold(updatedGold);
    pushNotification({
      type: "info",
      title: "Recruitment Complete",
      message: `${recruits.length} hero${recruits.length > 1 ? "es" : ""} recruited from ${tier?.label || "applicants"}. Additional recruitment cost: ${spentGold}g.`,
    });
    setShowRecruit(false);
  };

  const handleRecruitApplications = (chars = []) => {
    const openSlots = Math.max(
      0,
      guildDerivedStats.maxRoster - rosterRef.current.length,
    );
    const recruits = (Array.isArray(chars) ? chars : [])
      .slice(0, openSlots)
      .map((candidate) => ({
        ...candidate,
        morale: getCharacterMorale(candidate),
      }));

    if (recruits.length === 0) {
      pushNotification({
        type: "error",
        title: "Applications Blocked",
        message: "Need free roster slots to accept applications.",
      });
      return;
    }

    const recruitedRealmPlayerIds = recruits
      .map((candidate) => candidate.realmPlayerId)
      .filter(Boolean);
    if (recruitedRealmPlayerIds.length > 0) {
      const nextRealmState = markRealmPlayersRecruited({
        realmState: realmStateRef.current,
        playerIds: recruitedRealmPlayerIds,
      });
      realmStateRef.current = nextRealmState;
      setRealmState(nextRealmState);
    }

    const zoneReadyRoster = normalizeRosterZones([
      ...rosterRef.current,
      ...recruits,
    ]);
    rosterRef.current = zoneReadyRoster;
    setRoster(zoneReadyRoster);
    pushNotification({
      type: "info",
      title: "Applications Accepted",
      message: `${recruits.length} applicant${recruits.length === 1 ? "" : "s"} joined your guild for free.`,
    });
    setShowRecruit(false);
  };

  const handleDeclineApplications = (chars = []) => {
    const declined = Array.isArray(chars) ? chars : [];
    if (declined.length === 0) return;

    const nextRealmState = declineRealmGuildApplications({
      realmState: realmStateRef.current,
      applicationIds: declined
        .map((candidate) => candidate.realmApplicationId)
        .filter(Boolean),
      playerIds: declined.map((candidate) => candidate.realmPlayerId).filter(Boolean),
    });
    realmStateRef.current = nextRealmState;
    setRealmState(nextRealmState);
    pushNotification({
      type: "info",
      title: "Applications Declined",
      message: `${declined.length} application${declined.length === 1 ? "" : "s"} declined.`,
    });
  };

  const handleDismiss = (id) => {
    setRoster((p) => p.filter((c) => c.id !== id));
    const nextRelationships = removeMemberRelationships(
      guildRelationshipsRef.current,
      id,
    );
    guildRelationshipsRef.current = nextRelationships;
    setGuildRelationships(nextRelationships);
    setDetailCharId(null);
  };
  const handleModeChange = (id, mode) => {
    setRoster((p) =>
      p.map((c) => (c.id !== id ? c : { ...c, activityMode: mode })),
    );
  };
  const handleGuildModeChange = (mode) => {
    if (!GUILD_ACTIVITY_MODES.includes(mode)) return;
    setRoster((p) => p.map((c) => ({ ...c, activityMode: mode })));
    pushNotification({
      type: "info",
      title: "Guild Directive",
      message: `All members set to ${mode}.`,
    });
  };
  const handleGuildDungeonActivityChange = (mode) => {
    if (!GUILD_DUNGEON_ACTIVITY_OPTIONS.includes(mode)) return;
    autoDungeonStateRef.current = { nextAttemptAt: 0 };
    setGuildSetup((prev) => ({
      ...prev,
      dungeonActivity: mode,
    }));
    pushNotification({
      type: "info",
      title: "Dungeon Directive",
      message:
        mode === GUILD_DUNGEON_ACTIVITY.NONE
          ? "Automatic dungeon grouping disabled."
          : `Automatic dungeon grouping set to ${mode}.`,
    });
  };
  const handlePvpActivityFocusChange = (focus) => {
    if (!Object.values(PVP_ACTIVITY_FOCUS).includes(focus)) return;
    const nextBattlefieldState = {
      ...ensureBattlefieldState(battlefieldStateRef.current),
      automation: { dayIndex: getCurrentCalendarDayIndex(), queuedToday: 0, lastAttemptAt: 0 },
    };
    battlefieldStateRef.current = nextBattlefieldState;
    setBattlefieldState(nextBattlefieldState);
    setGuildSetup((prev) => ({
      ...prev,
      pvpActivityFocus: focus,
    }));
    pushNotification({
      type: "info",
      title: "PvP Directive",
      message:
        focus === PVP_ACTIVITY_FOCUS.AVOID
          ? "Automatic battleground queues disabled."
          : "PvP Activity Focus updated for Warsong Gulch.",
    });
  };
  const handleQueueWarsongGulch = useCallback(
    (participantIds = []) => {
      const now = gameTimeRef.current;
      const currentFaction =
        guildSetupRef.current?.faction || GUILD_FACTION.ALLIANCE;
      const queued = startWarsongGulchBattle({
        battlefieldState: battlefieldStateRef.current,
        roster: rosterRef.current,
        participantIds,
        activeMissions: missionsRef.current,
        guildFaction: currentFaction,
        now,
        currentDayIndex: getCurrentCalendarDayIndex(),
        createId,
      });
      if (!queued.started) {
        pushNotification({
          type: "error",
          title: "Queue Failed",
          message: queued.reason || "Could not queue Warsong Gulch.",
        });
        return false;
      }
      battlefieldStateRef.current = queued.battlefieldState;
      rosterRef.current = queued.roster;
      setBattlefieldState(queued.battlefieldState);
      setRoster(queued.roster);
      const time = new Date().toLocaleTimeString();
      setGuildLog((prev) =>
        [...queued.logs.map((log) => ({ time, ...log })), ...prev].slice(0, 50),
      );
      pushNotification({
        type: "info",
        title: "Warsong Gulch Queued",
        message: `${queued.battle.participantIds.length} heroes entered ${queued.battle.bracketLabel}.`,
      });
      return true;
    },
    [getCurrentCalendarDayIndex, pushNotification],
  );
  const handleGuildSuccessRateChange = (field, value) => {
    const normalizedValue = normalizeAutoGroupSuccessRate(value);
    if (field === "dungeonMinSuccessChance") {
      autoDungeonStateRef.current = { nextAttemptAt: 0 };
    }
    setGuildSetup((prev) => ({
      ...prev,
      [field]: normalizedValue,
    }));
  };
  const toggleDashboardSection = useCallback((sectionKey) => {
    setDashboardSectionsOpen((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }, []);
  const handleGuildFocusChange = (focus) => {
    if (!GUILD_FOCUS_OPTIONS.includes(focus)) return;
    const currentFocus = guildSetupRef.current?.focus || GUILD_FOCUS.LEVELING;
    if (focus === currentFocus) return;

    const lastChangedDay = Number(guildSetupRef.current?.lastFocusChangeDayIndex);
    if (
      Number.isFinite(lastChangedDay) &&
      lastChangedDay === currentCalendarDayIndex
    ) {
      pushNotification({
        type: "error",
        title: "Guild Focus Locked",
        message: "The guild focus can only be changed once per calendar day.",
      });
      return;
    }

    const currentGold = Math.max(0, Number(goldRef.current) || 0);
    if (currentGold < GUILD_FOCUS_CHANGE_COST_GOLD) {
      pushNotification({
        type: "error",
        title: "Not Enough Gold",
        message: `Changing guild focus costs ${GUILD_FOCUS_CHANGE_COST_GOLD}g.`,
      });
      return;
    }

    const updatedGold = Math.max(0, currentGold - GUILD_FOCUS_CHANGE_COST_GOLD);
    goldRef.current = updatedGold;
    setGuildGold(updatedGold);
    setGuildSetup((prev) => ({
      ...prev,
      focus,
      lastFocusChangeDayIndex: currentCalendarDayIndex,
    }));
    if (focus === GUILD_FOCUS.RAID_ATTUNEMENTS) {
      autoDungeonStateRef.current = { nextAttemptAt: 0 };
    }
    pushNotification({
      type: "info",
      title: "Guild Focus Changed",
      message: `Guild focus set to ${focus}.`,
    });
  };
  const handleProfChange = (id, idx, newProf) => {
    setRoster((p) =>
      p.map((c) => {
        if (c.id !== id) return c;
        const newProfs = [...c.professions];
        newProfs[idx] = { name: newProf, skill: 1 };
        return { ...c, professions: newProfs };
      }),
    );
  };
  const handleUpdateBackstory = (charId, story) => {
    setRoster((p) =>
      p.map((c) => (c.id !== charId ? c : { ...c, backstory: story })),
    );
  };
  const handleGuildSetupChange = (field, value) => {
    setGuildSetup((prev) => {
      if (field === "name") return { ...prev, name: String(value || "") };
      if (field === "faction") {
        return {
          ...prev,
          faction: GUILD_FACTION_OPTIONS.includes(value)
            ? value
            : GUILD_FACTION.ALLIANCE,
        };
      }
      if (field === "focus") {
        return {
          ...prev,
          focus: GUILD_FOCUS_OPTIONS.includes(value)
            ? value
            : GUILD_FOCUS.LEVELING,
        };
      }
      if (field === "dungeonActivity") {
        return {
          ...prev,
          dungeonActivity: GUILD_DUNGEON_ACTIVITY_OPTIONS.includes(value)
            ? value
            : DEFAULT_GUILD_SETUP.dungeonActivity,
        };
      }
      if (field === "pvpActivityFocus") {
        return {
          ...prev,
          pvpActivityFocus: Object.values(PVP_ACTIVITY_FOCUS).includes(value)
            ? value
            : DEFAULT_GUILD_SETUP.pvpActivityFocus,
        };
      }
      if (
        field === "eliteQuestMinSuccessChance" ||
        field === "dungeonMinSuccessChance"
      ) {
        return {
          ...prev,
          [field]: normalizeAutoGroupSuccessRate(value),
        };
      }
      if (field === "server") {
        const normalizedServer = GUILD_SERVER_OPTIONS.some(
          (option) => option.value === value,
        )
          ? value
          : DEFAULT_GUILD_SETUP.server;
        return {
          ...prev,
          server: normalizedServer,
          serverStyle: getGuildServerStyle(normalizedServer),
          serverPopulation: getGuildServerPopulation(normalizedServer),
        };
      }
      return prev;
    });
  };

  const handleStartGuild = () => {
    const normalizedName = String(guildSetup.name || "").trim();
    if (!normalizedName) return;
    const starterRoster = normalizeRosterZones(
      generateCharacters(
        STARTING_GUILD_MEMBERS,
        guildSetup.faction,
        STARTING_GUILD_ROLE_PLAN,
      ),
      guildSetup.faction,
    );
    const starterGold = STARTING_GUILD_GOLD;
    const calendarStart = createInitialCalendarState(gameTimeRef.current);

    rewardedMissionIdsRef.current = new Set();
    autoDungeonStateRef.current = { nextAttemptAt: 0 };
    rosterRef.current = starterRoster;
    missionsRef.current = [];
    goldRef.current = starterGold;
    guildRelationshipsRef.current = {};
    calendarStateRef.current = calendarStart;
    raidLockoutsRef.current = {};
    const starterRealmState = ensureRealmState(null, guildSetup, 0);
    realmStateRef.current = starterRealmState;
    setRoster(starterRoster);
    setActiveMissions([]);
    setCalendarState(calendarStart);
    setRaidLockouts({});
    setRealmState(starterRealmState);
    setMissionList(
      getMissionListWithZones(INITIAL_MISSIONS.map(cloneMissionTemplate)),
    );
    setGuildLog([]);
    setGuildGold(starterGold);
    setGuildRelationships({});
    setGuildSetup((prev) => ({
      ...prev,
      name: normalizedName,
      hasStarted: true,
    }));
    navigate(ROUTES.DASHBOARD);
    pushNotification({
      type: "info",
      title: "Guild Founded",
      message: `${normalizedName} enters Azeroth with ${STARTING_GUILD_MEMBERS} heroes and ${starterGold}g.`,
    });
  };

  const handleGenerateBackstory = async (char) => {
    try {
      const fallbackGuildName = getFactionDefaultGuildName(
        guildSetupRef.current?.faction,
      );
      const guildName = guildSetupRef.current?.name || fallbackGuildName;
      const prompt = `Write a short, engaging 2-sentence fantasy backstory for a level ${char.level} ${char.race} ${char.charClass} named ${char.name}. They are a member of the '${guildName}' guild.`;
      return await callGemini(prompt, false);
    } catch {
      alert(
        "Oracle is meditating. Configure VITE_GEMINI_PROXY_URL and try again.",
      );
      return null;
    }
  };
  const preemptDungeonMissionsForRaid = useCallback(
    ({ raidMemberIds, raidName }) => {
      const preemption = getDungeonMissionPreemption({
        activeMissions: missionsRef.current,
        memberIds: raidMemberIds,
      });
      if (preemption.canceledMissions.length === 0) return null;

      const affectedMemberIdSet = new Set(preemption.affectedMemberIds);
      const nextRoster = rosterRef.current.map((char) => {
        if (!affectedMemberIdSet.has(String(char?.id || ""))) return char;
        const normalizedChar = normalizeCharacterZoneState(
          char,
          guildSetupRef.current?.faction || GUILD_FACTION.ALLIANCE,
        );
        return {
          ...normalizedChar,
          status: "Idle",
          statusText: "Resting...",
        };
      });
      const canceledMissionKeys = new Set(
        preemption.canceledMissions.map((mission) => mission.missionKey),
      );
      const nextMissions = missionsRef.current.filter(
        (mission) => !canceledMissionKeys.has(getMissionInstanceKey(mission)),
      );
      const canceledMissionNames = [
        ...new Set(
          preemption.canceledMissions.map((mission) => mission.missionName),
        ),
      ];

      rosterRef.current = nextRoster;
      missionsRef.current = nextMissions;
      setRoster(nextRoster);
      setActiveMissions(nextMissions);

      const time = new Date().toLocaleTimeString();
      const message = `${raidName} cancelled ${canceledMissionNames.join(", ")} so the raid can start.`;
      setGuildLog((prev) =>
        [
          {
            time,
            type: "calendar",
            message,
          },
          ...prev,
        ].slice(0, 50),
      );
      pushNotification({
        type: "info",
        title: "Dungeon Cancelled",
        message,
      });

      return {
        ...preemption,
        nextRoster,
        nextMissions,
      };
    },
    [pushNotification],
  );

  const preemptInterruptibleMissionsForDeployment = useCallback(
    ({ memberIds, missionName, reason = "dungeon" }) => {
      const selectedMemberIds = new Set(
        (Array.isArray(memberIds) ? memberIds : []).map((memberId) =>
          String(memberId || ""),
        ),
      );
      if (selectedMemberIds.size === 0) return null;

      const interruptibleMissions = missionsRef.current.filter((mission) => {
        if (mission?.type === "dungeon") return false;
        const missionMemberIds = Array.isArray(mission?.memberIds)
          ? mission.memberIds.map((memberId) => String(memberId || ""))
          : [];
        return missionMemberIds.some((memberId) =>
          selectedMemberIds.has(memberId),
        );
      });
      if (interruptibleMissions.length === 0) return null;

      const affectedMemberIds = new Set(
        interruptibleMissions.flatMap((mission) =>
          Array.isArray(mission?.memberIds)
            ? mission.memberIds.map((memberId) => String(memberId || ""))
            : [],
        ),
      );
      const nextRoster = rosterRef.current.map((char) => {
        if (!affectedMemberIds.has(String(char?.id || ""))) return char;
        const normalizedChar = normalizeCharacterZoneState(
          char,
          guildSetupRef.current?.faction || GUILD_FACTION.ALLIANCE,
        );
        return {
          ...normalizedChar,
          status: "Idle",
          statusText: "Resting...",
        };
      });
      const canceledMissionKeys = new Set(
        interruptibleMissions.map((mission) => getMissionInstanceKey(mission)),
      );
      const nextMissions = missionsRef.current.filter(
        (mission) => !canceledMissionKeys.has(getMissionInstanceKey(mission)),
      );
      const canceledMissionNames = [
        ...new Set(
          interruptibleMissions.map((mission) => mission?.name || "Quest"),
        ),
      ];

      rosterRef.current = nextRoster;
      missionsRef.current = nextMissions;
      setRoster(nextRoster);
      setActiveMissions(nextMissions);

      const time = new Date().toLocaleTimeString();
      const reasonText =
        reason === "zone"
          ? "so the zone transfer can happen"
          : "so the dungeon group can form";
      const message = `${missionName} paused ${canceledMissionNames.join(", ")} ${reasonText}.`;
      setGuildLog((prev) =>
        [
          {
            time,
            type: "mission",
            message,
          },
          ...prev,
        ].slice(0, 50),
      );

      return {
        canceledMissions: interruptibleMissions,
        nextRoster,
        nextMissions,
      };
    },
    [],
  );

  const handleDeploy = useCallback(
    (quest, ids, options = {}) => {
      const memberIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
      if (!quest || memberIds.length === 0) return false;
      let rosterSnapshot = Array.isArray(rosterRef.current)
        ? rosterRef.current
        : roster;
      if (isZoneMission(quest)) {
        const zone = getZoneById(quest.zoneId);
        if (!zone) return false;
        if (!isZoneAccessibleForFaction(zone, guildSetupRef.current?.faction)) {
          pushNotification({
            type: "error",
            title: "Zone Locked",
            message: `${zone.name} is restricted to ${zone.faction}.`,
          });
          return false;
        }
        const questPreemption = preemptInterruptibleMissionsForDeployment({
          memberIds,
          missionName: zone.name,
          reason: "zone",
        });
        rosterSnapshot = questPreemption?.nextRoster || rosterSnapshot;
        const assigned = assignZoneToRoster(
          normalizeRosterZones(rosterSnapshot),
          memberIds,
          zone.id,
        );
        rosterRef.current = assigned;
        setRoster(assigned);
        pushNotification({
          type: "info",
          title: "Zone Assigned",
          message: `${memberIds.length} hero${memberIds.length === 1 ? "" : "es"} sent to ${zone.name}.`,
        });
        return true;
      }
      const recommendedPartySize = Math.max(
        1,
        Number(quest?.requiredPartySize) || (quest?.isRaid ? 40 : 5),
      );
      const minimumPartySize = Math.max(
        1,
        Number(quest?.minPartySize) || (quest?.isRaid ? 5 : 1),
      );
      if (memberIds.length < minimumPartySize) {
        pushNotification({
          type: "error",
          title: quest?.isRaid ? "Raid Setup Incomplete" : "Dungeon Group Incomplete",
          message: `${quest.name} requires at least ${minimumPartySize} heroes (recommended: ${recommendedPartySize}).`,
        });
        return false;
      }
      const requestedChainMissionIds = Array.isArray(options?.chainMissionIds)
        ? [...new Set(options.chainMissionIds)]
        : [];
      const canBuildChain =
        quest.type === "dungeon" &&
        typeof quest.dungeonSetId === "string" &&
        quest.dungeonSetId.trim() &&
        requestedChainMissionIds.length > 1;

      let chainMissions = [];
      if (canBuildChain) {
        const missionLookup = new Map(
          (Array.isArray(missionListRef.current)
            ? missionListRef.current
            : []
          ).map((missionEntry) => [String(missionEntry.id), missionEntry]),
        );
        chainMissions = requestedChainMissionIds
          .map((missionId) => missionLookup.get(String(missionId)))
          .filter(
            (missionEntry) =>
              missionEntry &&
              missionEntry.type === "dungeon" &&
              missionEntry.dungeonSetId === quest.dungeonSetId,
          )
          .sort(sortDungeonChainMissions);
      }

      const hasDungeonChain = chainMissions.length > 1;
      const missionSequenceForAccess = hasDungeonChain
        ? chainMissions
        : [quest];
      const selectedMembers = rosterSnapshot.filter((char) =>
        memberIds.includes(char.id),
      );
      if (
        quest?.isZoneElite === true &&
        selectedMembers.length > 0 &&
        selectedMembers.every((member) =>
          hasCompletedZoneEliteQuest(member, quest),
        )
      ) {
        pushNotification({
          type: "error",
          title: "Elite Already Cleared",
          message:
            "At least one selected hero must still need this zone elite. Cleared heroes can still help someone else.",
        });
        return false;
      }
      const missionKeyAccess = evaluateMissionKeyAccess({
        missions: missionSequenceForAccess,
        partyMembers: selectedMembers,
      });
      if (!missionKeyAccess.canEnter) {
        const blockingRequirement = missionKeyAccess.firstBlockingRequirement;
        const missingKeyLabel = missionKeyAccess.missingKeyIds
          .map((keyId) => getKeyLabel(keyId) || keyId)
          .join(", ");
        const blockedMissionName =
          blockingRequirement?.missionName || quest.name;
        const requiresAllMembers = Boolean(
          blockingRequirement?.requiresAllMembers ||
          (Array.isArray(missionSequenceForAccess) &&
            missionSequenceForAccess.some(
              (missionEntry) => missionEntry?.requiresKeyForAllMembers === true,
            )),
        );
        pushNotification({
          type: "error",
          title: "Key Required",
          message: requiresAllMembers
            ? `${blockedMissionName} needs ${missingKeyLabel} on every selected hero.`
            : `${blockedMissionName} needs ${missingKeyLabel}. Add a key holder or include a key-rewarding wing first.`,
        });
        return false;
      }

      if (quest?.isRaid === true) {
        const raidStatus = getRaidLockoutStatus({
          raidLockouts: raidLockoutsRef.current,
          mission: quest,
          currentDayIndex: getCurrentCalendarDayIndex(),
          memberIds,
        });
        if (raidStatus.hasLockoutConflict) {
          pushNotification({
            type: "error",
            title: "Raid ID Conflict",
            message: `${quest.name} has selected heroes saved to different raid IDs.`,
          });
          return false;
        }
        if (raidStatus.isCompletedLocked) {
          const lockedNames = rosterSnapshot
            .filter((member) => raidStatus.completedMemberIds.includes(member.id))
            .map((member) => member.name)
            .join(", ");
          pushNotification({
            type: "error",
            title: "Raid Locked",
            message: `${lockedNames || quest.name} cleared this lockout until day ${raidStatus.resetWindow.nextResetDayIndex}.`,
          });
          return false;
        }
        if (raidStatus.isWingLocked) {
          const missingWings =
            raidStatus.missingRequiredWingLabels?.join(", ") ||
            raidStatus.missingRequiredWingIds?.join(", ") ||
            "required wings";
          pushNotification({
            type: "error",
            title: "Raid Wing Locked",
            message: `${quest.dungeonWing || quest.name} unlocks after clearing: ${missingWings}.`,
          });
          return false;
        }
      }

      const openingMission = hasDungeonChain ? chainMissions[0] : quest;

      if (openingMission?.type === "dungeon") {
        const questPreemption = preemptInterruptibleMissionsForDeployment({
          memberIds,
          missionName:
            openingMission.dungeonWing ||
            openingMission.dungeonSetName ||
            openingMission.name,
        });
        if (questPreemption) {
          rosterSnapshot = questPreemption.nextRoster;
        }
      }

      if (quest?.isRaid === true) {
        const preemption = preemptDungeonMissionsForRaid({
          raidMemberIds: memberIds,
          raidName: quest.dungeonWing || quest.dungeonSetName || quest.name,
        });
        if (preemption) {
          rosterSnapshot = preemption.nextRoster;
        }
      }

      const activeMissionIds = new Set(
        (Array.isArray(missionsRef.current) ? missionsRef.current : []).flatMap(
          (missionRun) =>
            Array.isArray(missionRun.memberIds) ? missionRun.memberIds : [],
        ),
      );
      const selectedMembersAfterPreemption = rosterSnapshot.filter((char) =>
        memberIds.includes(char.id),
      );
      if (
        selectedMembersAfterPreemption.some((member) =>
          activeMissionIds.has(member.id),
        )
      ) {
        pushNotification({
          type: "error",
          title: quest?.isRaid ? "Raid Setup Incomplete" : "Group Busy",
          message:
            quest?.isRaid
              ? "Some selected heroes are still busy and cannot join the raid yet."
              : "Some selected heroes are already in a dungeon group and cannot join another mission yet.",
        });
        return false;
      }

      const chainContext = hasDungeonChain
        ? {
            chainId: createId(),
            setId: quest.dungeonSetId,
            setName: quest.dungeonSetName || quest.name,
            totalMissions: chainMissions.length,
            currentPosition: 1,
            remainingMissionIds: chainMissions
              .slice(1)
              .map((missionEntry) => missionEntry.id),
          }
        : null;

      const consumableMode = options?.consumableMode || CONSUMABLE_MODE.NONE;
      const consumableModifiers =
        openingMission?.type === "dungeon"
          ? getConsumableMissionModifiers({
              mode: consumableMode,
              mission: openingMission,
              partySize: memberIds.length,
              guildInventory: guildInventoryRef.current,
            })
          : null;
      if (consumableModifiers?.hasConsumables) {
        const nextInventory = consumeMissionConsumables({
          guildInventory: guildInventoryRef.current,
          modifiers: consumableModifiers,
        });
        guildInventoryRef.current = nextInventory;
        setGuildInventory(nextInventory);
        const time = new Date().toLocaleTimeString();
        setGuildLog((prev) =>
          [
            {
              time,
              type: "profession",
              message: `Prepared consumables for ${openingMission.name}: ${formatConsumableUseSummary(consumableModifiers)}`,
            },
            ...prev,
          ].slice(0, 50),
        );
      }

      const startTime = gameTimeRef.current;
      const missionRun = buildMissionRun(
        openingMission,
        memberIds,
        startTime,
        rosterSnapshot,
        chainContext,
        { consumableModifiers },
      );
      const missionRunWithCalendar = options?.calendarEventId
        ? { ...missionRun, calendarEventId: options.calendarEventId }
        : missionRun;

      if (openingMission?.isRaid === true) {
        const nextRaidLockouts = startRaidLockout({
          raidLockouts: raidLockoutsRef.current,
          mission: openingMission,
          currentDayIndex: getCurrentCalendarDayIndex(),
          memberIds,
          totalBosses: getDungeonBossCount(openingMission),
        });
        raidLockoutsRef.current = nextRaidLockouts;
        setRaidLockouts(nextRaidLockouts);
      }

      const deployedRoster = rosterSnapshot.map((c) =>
        memberIds.includes(c.id)
          ? {
              ...c,
              status: "Questing",
              statusText:
                openingMission?.isZoneElite === true
                  ? `Group Quest: ${openingMission.name}`
                  : hasDungeonChain
                    ? `Chain: ${openingMission.name}`
                    : "On Mission",
            }
          : c,
      );
      rosterRef.current = deployedRoster;
      setRoster(deployedRoster);
      missionsRef.current = [...missionsRef.current, missionRunWithCalendar];
      setActiveMissions((prev) => [...prev, missionRunWithCalendar]);

      if (hasDungeonChain) {
        pushNotification({
          type: "info",
          title: "Dungeon Chain Started",
          message: `${chainContext.setName}: ${chainMissions.length} wings queued.`,
        });
      }
      return true;
    },
    [
      assignZoneToRoster,
      buildMissionRun,
      getCurrentCalendarDayIndex,
      normalizeRosterZones,
      preemptDungeonMissionsForRaid,
      preemptInterruptibleMissionsForDeployment,
      pushNotification,
      roster,
    ],
  );

  const handleQueueAdventureGoal = useCallback(
    ({ memberIds, keyId, sourceMissionId, targetMissionId }) => {
      const selectedMemberIds = Array.isArray(memberIds)
        ? memberIds.map((memberId) => String(memberId)).filter(Boolean)
        : [];
      const normalizedKeyId = String(keyId || "").trim();
      const normalizedSourceMissionId = String(sourceMissionId || "").trim();
      if (selectedMemberIds.length === 0 || !normalizedKeyId || !normalizedSourceMissionId) {
        return false;
      }
      const selectedMemberIdSet = new Set(selectedMemberIds);
      const goalTemplate = buildAdventureGoal({
        id: createId(),
        keyId: normalizedKeyId,
        sourceMissionId: normalizedSourceMissionId,
        targetMissionId,
        createdAt: gameTimeRef.current,
      });
      let queuedCount = 0;
      const nextRoster = (Array.isArray(rosterRef.current) ? rosterRef.current : roster).map(
        (member) => {
          if (!selectedMemberIdSet.has(String(member.id))) return member;
          const nextMember = addAdventureGoalToCharacter({
            character: member,
            goal: {
              ...goalTemplate,
              id: createId(),
            },
          });
          if (nextMember !== member) queuedCount += 1;
          return nextMember;
        },
      );
      if (queuedCount === 0) return false;
      rosterRef.current = nextRoster;
      setRoster(nextRoster);
      const sourceMission = missionListRef.current.find(
        (mission) => String(mission?.id) === normalizedSourceMissionId,
      );
      pushNotification({
        type: "info",
        title: "Attunement Goal Queued",
        message: `${queuedCount} hero${queuedCount === 1 ? "" : "es"} queued for ${
          sourceMission?.dungeonWing || sourceMission?.name || getKeyLabel(normalizedKeyId)
        }.`,
        durationMs: 3600,
      });
      return true;
    },
    [pushNotification, roster],
  );

  const handleClearAdventureGoal = useCallback(
    ({ memberIds, goalId, keyId, sourceMissionId, targetMissionId }) => {
      const selectedMemberIds = Array.isArray(memberIds)
        ? memberIds.map((memberId) => String(memberId)).filter(Boolean)
        : [];
      if (selectedMemberIds.length === 0 && !goalId && !keyId) return false;
      const selectedMemberIdSet = new Set(selectedMemberIds);
      let clearedCount = 0;
      const nextRoster = (Array.isArray(rosterRef.current) ? rosterRef.current : roster).map(
        (member) => {
          if (selectedMemberIdSet.size > 0 && !selectedMemberIdSet.has(String(member.id))) {
            return member;
          }
          const nextMember = removeAdventureGoalFromCharacter({
            character: member,
            goalId,
            keyId,
            sourceMissionId,
            targetMissionId,
          });
          if (nextMember !== member) clearedCount += 1;
          return nextMember;
        },
      );
      if (clearedCount === 0) return false;
      rosterRef.current = nextRoster;
      setRoster(nextRoster);
      pushNotification({
        type: "info",
        title: "Attunement Goal Cleared",
        message: `${clearedCount} queued goal${clearedCount === 1 ? "" : "s"} removed.`,
        durationMs: 2600,
      });
      return true;
    },
    [pushNotification, roster],
  );

  const refreshCalendarStateNow = useCallback(
    (nextState) => {
      const currentDayIndex = getCalendarDayIndex(
        gameTimeRef.current,
        nextState.calendarEpochGameTimeMs,
      );
      const refreshed = refreshCalendarState({
        state: nextState,
        currentDayIndex,
        roster: rosterRef.current,
        activeMissions: missionsRef.current,
        missionList: missionListRef.current,
        createId,
        getRaidLockoutStatus: ({ mission, memberIds, currentDayIndex: statusDayIndex }) =>
          getRaidLockoutStatus({
            raidLockouts: raidLockoutsRef.current,
            mission,
            currentDayIndex: Number.isFinite(Number(statusDayIndex))
              ? Math.floor(Number(statusDayIndex))
              : currentDayIndex,
            memberIds,
          }),
      });
      commitCalendarState(refreshed.state);
      return refreshed.state;
    },
    [commitCalendarState],
  );

  const handleCreateCalendarEvent = useCallback(
    ({ missionId, missionIds = [], scheduledDayIndex, scheduledTimeOfDay, title }) => {
      const currentDayIndex = getCalendarDayIndex(
        gameTimeRef.current,
        calendarStateRef.current.calendarEpochGameTimeMs,
      );
      const mission = missionListRef.current.find(
        (entry) => String(entry?.id) === String(missionId),
      );
      if (!mission) return;
      const event = buildCalendarEvent({
        id: createId(),
        title: title || mission.name,
        missionId: mission.id,
        missionIds,
        scheduledDayIndex,
        scheduledTimeOfDay,
        createdAtDayIndex: currentDayIndex,
      });
      refreshCalendarStateNow({
        ...calendarStateRef.current,
        calendarEvents: [...calendarStateRef.current.calendarEvents, event],
      });
      pushNotification({
        type: "info",
        title: "Calendar Event Created",
        message: `${event.title} scheduled for ${formatCalendarDate(event.scheduledDayIndex)}.`,
      });
    },
    [pushNotification, refreshCalendarStateNow],
  );

  const handleCreateCalendarSeries = useCallback(
    ({
      missionId,
      weekday,
      scheduledTimeOfDay,
      title,
      startsOnDayIndex,
      seriesType,
      intervalDays,
      durationWeeks,
      missionIds = [],
    }) => {
      const mission = missionListRef.current.find(
        (entry) => String(entry?.id) === String(missionId),
      );
      if (!mission) return;
      const series = buildCalendarSeries({
        id: createId(),
        title: title || `${mission.name} Raid Day`,
        missionId: mission.id,
        missionIds,
        weekday,
        scheduledTimeOfDay,
        startsOnDayIndex,
        seriesType,
        intervalDays,
        durationWeeks,
      });
      refreshCalendarStateNow({
        ...calendarStateRef.current,
        calendarSeries: [...calendarStateRef.current.calendarSeries, series],
      });
      pushNotification({
        type: "info",
        title: "Raid Series Created",
        message:
          series.seriesType === "interval"
            ? `${series.title} repeats every ${series.intervalDays} days.`
            : `${series.title} repeats on ${formatCalendarDate(series.startsOnDayIndex).split(",")[0]} for ${series.durationWeeks} weeks.`,
      });
    },
    [pushNotification, refreshCalendarStateNow],
  );

  const handleUpdateCalendarEventRoster = useCallback(
    (eventId, approvedRosterIds) => {
      updateCalendarEvent(eventId, (event) => {
        if (event.rosterLocked) return event;
        const approved = [
          ...new Set(
            (Array.isArray(approvedRosterIds) ? approvedRosterIds : [])
              .map((id) => String(id || "").trim())
              .filter((id) => event.registrations.includes(id)),
          ),
        ];
        return {
          ...event,
          approvedRosterIds: approved,
          benchedIds: event.registrations.filter(
            (id) => !approved.includes(id),
          ),
        };
      });
    },
    [updateCalendarEvent],
  );

  const handleLockCalendarEventRoster = useCallback(
    (eventId, shouldLock) => {
      const currentState = calendarStateRef.current;
      const nextEvents = currentState.calendarEvents.map((event) => {
        if (event.id !== eventId) return event;
        if (
          event.status === CALENDAR_STATUS.RUNNING ||
          event.status === CALENDAR_STATUS.COMPLETED ||
          event.status === CALENDAR_STATUS.CANCELLED
        ) {
          return event;
        }
        const lockedRosterIds = [
          ...new Set(
            (Array.isArray(event.approvedRosterIds) ? event.approvedRosterIds : [])
              .map((id) => String(id || "").trim())
              .filter(Boolean),
          ),
        ];
        if (shouldLock && lockedRosterIds.length === 0) return event;
        return {
          ...event,
          rosterLocked: Boolean(shouldLock),
          lockedRosterIds: shouldLock ? lockedRosterIds : [],
          registrations: shouldLock ? lockedRosterIds : event.registrations,
          approvedRosterIds: shouldLock ? lockedRosterIds : event.approvedRosterIds,
          benchedIds: shouldLock ? [] : event.benchedIds,
        };
      });
      refreshCalendarStateNow({
        ...currentState,
        calendarEvents: nextEvents,
      });
      pushNotification({
        type: "info",
        title: shouldLock ? "Raid Group Locked" : "Raid Group Unlocked",
        message: shouldLock
          ? "This roster is reserved for the selected raid lockout."
          : "Registration is open again for this raid event.",
      });
    },
    [pushNotification, refreshCalendarStateNow],
  );

  const handleCancelCalendarEvent = useCallback(
    (eventId) => {
      updateCalendarEvent(eventId, (event) => ({
        ...event,
        status: CALENDAR_STATUS.CANCELLED,
      }));
    },
    [updateCalendarEvent],
  );

  startCalendarEventRef.current = ({
    eventId,
    source = "manual",
    calendarDayIndex: overrideDayIndex = null,
    logAutoStart = false,
  }) => {
    const event = calendarStateRef.current.calendarEvents.find(
      (entry) => entry.id === eventId,
    );
    if (!event || event.status !== CALENDAR_STATUS.READY || event.rosterLocked !== true) return false;
    if (calendarEventStartLocksRef.current.has(eventId)) return false;

    const mission = missionListRef.current.find(
      (entry) => String(entry?.id) === String(event.missionId),
    );
    if (!mission) return false;

    calendarEventStartLocksRef.current.add(eventId);
    try {
      const approvedRosterIds = [...new Set(event.approvedRosterIds)].filter(
        Boolean,
      );
      if (approvedRosterIds.length === 0) return false;
      const calendarMissionIds = Array.isArray(event.missionIds)
        ? event.missionIds
        : [];
      const chainMissionIds =
        calendarMissionIds.length > 1 ? calendarMissionIds : undefined;

      const deployed = handleDeploy(mission, approvedRosterIds, {
        calendarEventId: event.id,
        ...(chainMissionIds ? { chainMissionIds } : null),
      });
      if (!deployed) return false;

      const runningMission = missionsRef.current.find(
        (missionRun) => missionRun.calendarEventId === event.id,
      );
      const currentDayIndex =
        Number.isFinite(overrideDayIndex) && overrideDayIndex >= 0
          ? Math.floor(overrideDayIndex)
          : getCalendarDayIndex(
              gameTimeRef.current,
              calendarStateRef.current.calendarEpochGameTimeMs,
            );

      commitCalendarState({
        ...calendarStateRef.current,
        calendarEvents: calendarStateRef.current.calendarEvents.map((entry) =>
          entry.id === event.id
            ? {
                ...entry,
                status: CALENDAR_STATUS.RUNNING,
                runningMissionInstanceId: runningMission?.instanceId || null,
              }
            : entry,
        ),
        calendarEventHistory: [
          {
            id: createId(),
            eventId: event.id,
            type:
              source === "auto" && logAutoStart ? "auto-started" : "started",
            missionName: mission.name,
            dayIndex: currentDayIndex,
            approvedRosterIds: [...event.approvedRosterIds],
            benchedIds: [...event.benchedIds],
            ...(source === "auto" && logAutoStart
              ? { scheduledTimeOfDay: event.scheduledTimeOfDay }
              : null),
          },
          ...calendarStateRef.current.calendarEventHistory,
        ].slice(0, 100),
      });

      pushNotification({
        type: "info",
        title: source === "auto" ? "Raid Auto-Started" : "Raid Started",
        message: `${event.title} started with ${approvedRosterIds.length} heroes.`,
      });
      if (source !== "auto") navigate(ROUTES.DASHBOARD);
      return true;
    } finally {
      calendarEventStartLocksRef.current.delete(eventId);
    }
  };

  const handleStartCalendarEvent = useCallback(
    (eventId) => {
      startCalendarEventRef.current({ eventId, source: "manual" });
    },
    [],
  );

  const handleCancelCalendarSeries = useCallback(
    (seriesId) => {
      const nextState = cancelCalendarSeriesEvents({
        state: calendarStateRef.current,
        seriesId,
        currentDayIndex: getCalendarDayIndex(
          gameTimeRef.current,
          calendarStateRef.current.calendarEpochGameTimeMs,
        ),
      });
      commitCalendarState(nextState);
      pushNotification({
        type: "info",
        title: "Raid Series Cancelled",
        message: "Future scheduled events in this series have been cancelled.",
      });
    },
    [commitCalendarState, pushNotification],
  );
  const handleManualFinish = (m) => {
    const now = gameTimeRef.current;
    const dungeonAdvance =
      m.type === "dungeon" ? advanceDungeonMission(m, now, true) : null;
    const missionToResolve = dungeonAdvance ? dungeonAdvance.mission : m;
    const missionInstanceId = getMissionInstanceId(missionToResolve);
    if (rewardedMissionIdsRef.current.has(missionInstanceId)) return;
    const dungeonStepLogs = dungeonAdvance ? dungeonAdvance.stepLogs : [];
    const wipeCostResult = applyMissionWipeCosts(
      missionToResolve,
      dungeonStepLogs,
      goldRef.current,
    );
    let currentGoldAfterWipes = wipeCostResult.updatedGold;
    const wipeCostLogs = wipeCostResult.wipeCostLog
      ? [wipeCostResult.wipeCostLog]
      : [];
    if (currentGoldAfterWipes !== goldRef.current) {
      goldRef.current = currentGoldAfterWipes;
      setGuildGold(currentGoldAfterWipes);
    }
    rewardedMissionIdsRef.current.add(missionInstanceId);

    // Manually trigger the finish logic immediately (logic also exists in loop, but this is for instant feedback)
    // To avoid race conditions, we filter it out of activeMissions immediately
    setActiveMissions((prev) => prev.filter((mi) => mi !== m));
    const stepLootAwards = applyDungeonStepLootAwards({
      activeMissions: [],
      finishedMissions: [missionToResolve],
      rosterSnapshot: rosterRef.current,
      stepLogs: dungeonStepLogs,
    });
    const missionWithStepLoot =
      stepLootAwards.finishedMissions[0] || missionToResolve;
    const result = processMissionRewards(
      missionWithStepLoot,
      stepLootAwards.roster,
    );
    recordMissionRelationships(missionWithStepLoot, result.missionSucceeded);
    if (missionWithStepLoot?.isRaid === true) {
      const nextRaidLockouts = updateRaidLockoutProgress({
        raidLockouts: raidLockoutsRef.current,
        mission: missionWithStepLoot,
        currentDayIndex: getCurrentCalendarDayIndex(),
        memberIds: missionWithStepLoot.memberIds,
        clearedSteps: missionWithStepLoot.dungeonProgress?.clearedSteps || 0,
        totalBosses: getDungeonBossCount(missionWithStepLoot),
      });
      raidLockoutsRef.current = nextRaidLockouts;
      setRaidLockouts(nextRaidLockouts);
    }
    const chainResolution = resolveDungeonChainContinuation({
      mission: missionWithStepLoot,
      missionSucceeded: result.missionSucceeded,
      rosterSnapshot: result.updatedRoster,
      startTime: now,
    });
    const rosterAfterMission = chainResolution.updatedRoster;
    rosterRef.current = rosterAfterMission;
    setRoster(rosterAfterMission);
    if (chainResolution.queuedMission) {
      setActiveMissions((prev) => [...prev, chainResolution.queuedMission]);
    }
    if (chainResolution.notification) {
      pushNotification(chainResolution.notification);
    }
    if (missionWithStepLoot.type === "dungeon") {
      if (result.missionSucceeded) {
        registerDungeonClearMilestones(missionWithStepLoot);
      } else {
        registerDungeonWipeMilestone(missionWithStepLoot.name);
      }
    }
    const openGoldSpace = guildDerivedStats.goldCap - currentGoldAfterWipes;
    const gainedGold = Math.max(0, Math.min(result.missionGold, openGoldSpace));

    if (gainedGold > 0) {
      const updatedGold = currentGoldAfterWipes + gainedGold;
      currentGoldAfterWipes = updatedGold;
      goldRef.current = updatedGold;
      setGuildGold(updatedGold);
    }

    const time = new Date().toLocaleTimeString();
    const extraLogs =
      gainedGold > 0
        ? [
            {
              type: "gold",
              amount: gainedGold,
              missionName: missionToResolve.name,
            },
          ]
        : [];
    const manualFinishLogs = [
      // Put reward logs first so loot entries are kept even when many wipe/step logs are generated.
      ...stepLootAwards.logs,
      ...result.missionLogs,
      ...wipeCostLogs,
      ...extraLogs,
      ...chainResolution.chainLogs,
    ];
    if (manualFinishLogs.length > 0) {
      setGuildLog((prev) =>
        [
          ...manualFinishLogs.map((log) => ({
            time,
            ...log,
          })),
          ...prev,
        ].slice(0, 50),
      );
    }
    if (missionWithStepLoot.calendarEventId && !chainResolution.queuedMission) {
      completeCalendarEvent({
        eventId: missionWithStepLoot.calendarEventId,
        missionName: missionWithStepLoot.dungeonSetName || missionWithStepLoot.name,
        missionSucceeded: result.missionSucceeded,
      });
    }

    if (!result.missionSucceeded) {
      pushNotification({
        type: "error",
        title: "Mission Failed",
        message: missionToResolve.name,
      });
    }
  };

  const appendProfessionLogs = useCallback((logs) => {
    const normalizedLogs = (Array.isArray(logs) ? logs : []).filter(Boolean);
    if (normalizedLogs.length === 0) return;
    const time = new Date().toLocaleTimeString();
    setGuildLog((prev) =>
      [
        ...normalizedLogs.map((log) => ({
          time,
          type: log.type || "profession",
          message: log.message,
          ...log,
        })),
        ...prev,
      ].slice(0, 50),
    );
  }, []);

  const handleCraftRecipe = useCallback(
    (characterId, recipeId) => {
      const recipe = getRecipeDefinition(recipeId);
      const character = rosterRef.current.find(
        (member) => member.id === characterId,
      );
      const result = craftRecipe({
        character,
        recipe,
        guildInventory: guildInventoryRef.current,
      });
      if (!result.crafted) {
        pushNotification({
          type: "error",
          title: "Crafting Blocked",
          message: result.reason || "This recipe cannot be crafted.",
        });
        return false;
      }

      let nextInventory = result.guildInventory;
      let nextRoster = rosterRef.current.map((member) =>
        member.id === characterId ? result.character : member,
      );
      let nextGold = goldRef.current;
      const logs = [...result.logs];
      const outputDefinition = getInventoryItemDefinition(result.outputItemId);

      if (outputDefinition?.category === INVENTORY_ITEM_CATEGORY.EQUIPMENT) {
        const equipResult = tryAutoEquipItemFromGuildStash({
          itemId: result.outputItemId,
          roster: nextRoster,
          guildInventory: nextInventory,
        });
        nextInventory = equipResult.guildInventory;
        nextRoster = equipResult.roster;
        if (equipResult.log) logs.push(equipResult.log);

        if (
          !equipResult.equipped &&
          recipe.purpose === "skillup" &&
          !shouldStoreItem({
            itemId: result.outputItemId,
            roster: nextRoster,
            policy: stashPolicyRef.current,
          })
        ) {
          const sellQuantity = Math.min(
            result.outputQuantity || 1,
            getItemQuantity(nextInventory, result.outputItemId),
          );
          if (sellQuantity > 0) {
            nextInventory = removeItemFromGuildInventory(
              nextInventory,
              result.outputItemId,
              sellQuantity,
            );
            const saleGold =
              sellQuantity * Math.max(0, Number(outputDefinition.sellValue) || 0);
            nextGold += saleGold;
            logs.push({
              type: "profession",
              message: `Sold ${sellQuantity} obsolete ${outputDefinition.name} for ${saleGold}g.`,
            });
          }
        }
      }

      rosterRef.current = nextRoster;
      guildInventoryRef.current = nextInventory;
      goldRef.current = nextGold;
      setRoster(nextRoster);
      setGuildInventory(nextInventory);
      setGuildGold(nextGold);
      appendProfessionLogs(logs);
      pushNotification({
        type: "info",
        title: "Crafting Complete",
        message:
          logs[0]?.message ||
          `${character?.name || "Crafter"} completed a recipe.`,
      });
      return true;
    },
    [appendProfessionLogs, pushNotification],
  );

  const handleSellStashItem = useCallback(
    (itemId, quantity = 1) => {
      const definition = getInventoryItemDefinition(itemId);
      const sellQuantity = Math.min(
        Math.max(1, Math.floor(Number(quantity) || 1)),
        getItemQuantity(guildInventoryRef.current, itemId),
      );
      if (!definition || sellQuantity <= 0) return false;
      const saleGold = sellQuantity * Math.max(0, Number(definition.sellValue) || 0);
      const nextInventory = removeItemFromGuildInventory(
        guildInventoryRef.current,
        itemId,
        sellQuantity,
      );
      const nextGold = goldRef.current + saleGold;
      guildInventoryRef.current = nextInventory;
      goldRef.current = nextGold;
      setGuildInventory(nextInventory);
      setGuildGold(nextGold);
      appendProfessionLogs([
        {
          type: "profession",
          message: `Sold ${sellQuantity} ${definition.name} for ${saleGold}g.`,
        },
      ]);
      return true;
    },
    [appendProfessionLogs],
  );

  const handleTryAutoEquipFromGuildStash = useCallback(
    (itemId) => {
      const equipResult = tryAutoEquipItemFromGuildStash({
        itemId,
        roster: rosterRef.current,
        guildInventory: guildInventoryRef.current,
      });
      if (!equipResult.equipped) {
        pushNotification({
          type: "info",
          title: "No Upgrade Found",
          message: "No eligible guild member can use this as an upgrade.",
        });
        return false;
      }
      rosterRef.current = equipResult.roster;
      guildInventoryRef.current = equipResult.guildInventory;
      setRoster(equipResult.roster);
      setGuildInventory(equipResult.guildInventory);
      appendProfessionLogs([equipResult.log]);
      return true;
    },
    [appendProfessionLogs, pushNotification],
  );

  const handleCleanupGuildStash = useCallback(() => {
    const cleanup = cleanupGuildStash({
      guildInventory: guildInventoryRef.current,
      roster: rosterRef.current,
      policy: stashPolicyRef.current,
    });
    const nextGold = goldRef.current + cleanup.goldGained;
    guildInventoryRef.current = cleanup.guildInventory;
    goldRef.current = nextGold;
    setGuildInventory(cleanup.guildInventory);
    setGuildGold(nextGold);
    appendProfessionLogs(
      cleanup.logs.length > 0
        ? cleanup.logs
        : [
            {
              type: "profession",
              message: "Guild Stash cleanup found no obsolete equipment.",
            },
          ],
    );
    return cleanup;
  }, [appendProfessionLogs]);

  const debugActions = useMemo(
    () =>
      createDebugActions({
        itemDatabase,
        maxRoster: guildDerivedStats.maxRoster,
        goldCap: guildDerivedStats.goldCap,
        refs: {
          roster: rosterRef,
          gold: goldRef,
          guildProgress: guildProgressRef,
          guildSetup: guildSetupRef,
          guildRelationships: guildRelationshipsRef,
          missions: missionsRef,
          raidLockouts: raidLockoutsRef,
          rewardedMissionIds: rewardedMissionIdsRef,
        },
        setters: {
          setRoster,
          setGuildGold,
          setGuildProgress,
          setGuildRelationships,
          setActiveMissions,
          setRaidLockouts,
          setGuildLog,
          setMissionList,
        },
        closeDebug: () => setShowDebug(false),
        pushNotification,
        appendGuildRenownLog,
      }),
    [
      appendGuildRenownLog,
      guildDerivedStats.goldCap,
      guildDerivedStats.maxRoster,
      itemDatabase,
      pushNotification,
    ],
  );

  const handleSaveSession = () => {
    try {
      saveSessionFile({
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
        gameTimeMs: gameTimeRef.current,
      });
    } catch (error) {
      console.error("Failed to save session:", error);
      pushNotification({
        type: "error",
        title: "Save Failed",
        message: "Could not create the session file.",
      });
    }
  };

  const handleLoadButtonClick = () => {
    openSessionFilePicker(sessionFileInputRef);
  };

  const handleLoadSessionFile = (event) => {
    loadSessionFile({
      event,
      hydrateOptions: {
        initialMissions: getMissionListWithZones(INITIAL_MISSIONS),
        normalizeGuildProgress,
        normalizeGuildSetup,
        getGuildDerivedStats,
        normalizeProgressionState,
        defaultGameSpeed: DEFAULT_GAME_SPEED,
        createId,
        resolveDungeonBossCount: getDungeonBossCount,
        defaultGuildSetup: DEFAULT_GUILD_SETUP,
      },
      onLoaded: (loadedSession) => {
        applyLoadedSessionToApp({
          loadedSession,
          factionFallback: GUILD_FACTION.ALLIANCE,
          normalizeRosterZones,
          getMissionListWithZones,
          clampGameSpeed,
          refs: {
            rewardedMissionIds: rewardedMissionIdsRef,
            roster: rosterRef,
            missions: missionsRef,
            gold: goldRef,
            guildProgress: guildProgressRef,
            guildSetup: guildSetupRef,
            guildRelationships: guildRelationshipsRef,
            realmState: realmStateRef,
            worldPvpState: worldPvpStateRef,
            battlefieldState: battlefieldStateRef,
            guildInventory: guildInventoryRef,
            stashPolicy: stashPolicyRef,
            calendarState: calendarStateRef,
            raidLockouts: raidLockoutsRef,
            gameTime: gameTimeRef,
            lastRealTime: lastRealTimeRef,
          },
          setters: {
            setRoster,
            setActiveMissions,
            setMissionList,
            setGuildLog,
            setGuildGold,
            setGuildProgress,
            setGuildSetup,
            setGuildRelationships,
            setRealmState,
            setWorldPvpState,
            setBattlefieldState,
            setGuildInventory,
            setStashPolicy,
            setMissionBoardState,
            setCalendarState,
            setRaidLockouts,
            setIsPaused,
            setGameSpeed,
            setGameTimeMs,
            setDetailCharId,
          },
          closeOverlays: () => {
            setShowRecruit(false);
            setShowLootTable(false);
            setShowGuildLog(false);
            setShowDebug(false);
            setShowOptions(false);
            setShowProfessions(false);
            navigate(ROUTES.DASHBOARD);
          },
        });
        pushNotification({
          type: "success",
          title: "Session Loaded",
          message: "The guild session was loaded successfully.",
        });
      },
      onInvalidSession: (error) => {
        console.error("Failed to load session:", error);
        pushNotification({
          type: "error",
          title: "Invalid Session",
          message: error?.message || "The selected session file is invalid.",
          durationMs: 6500,
        });
      },
      onReadError: () => {
        pushNotification({
          type: "error",
          title: "Read Failed",
          message: "Could not read the selected session file.",
        });
      },
    });
  };

  const guildActivityModeSummary =
    roster.length === 0
      ? null
      : (() => {
          const firstMode = roster[0]?.activityMode || "Auto";
          const uniform = roster.every(
            (member) => (member?.activityMode || "Auto") === firstMode,
          );
          return uniform ? firstMode : "Mixed";
        })();
  const dungeonActivityInfoText =
    guildSetup.dungeonActivity === GUILD_DUNGEON_ACTIVITY.MINIMAL
      ? "Groups are formed every other day."
      : guildSetup.dungeonActivity === GUILD_DUNGEON_ACTIVITY.BALANCED
        ? "Groups are formed every day."
        : guildSetup.dungeonActivity === GUILD_DUNGEON_ACTIVITY.ALWAYS
          ? "Groups will be formed several times a day."
          : "Automatic dungeon groups are disabled.";

  const parsedGuildMemberMinLevel = Number(guildMemberMinLevelFilter);
  const parsedGuildMemberMaxLevel = Number(guildMemberMaxLevelFilter);
  const hasGuildMemberMinLevelFilter =
    guildMemberMinLevelFilter !== "" &&
    Number.isFinite(parsedGuildMemberMinLevel) &&
    parsedGuildMemberMinLevel > 0;
  const hasGuildMemberMaxLevelFilter =
    guildMemberMaxLevelFilter !== "" &&
    Number.isFinite(parsedGuildMemberMaxLevel) &&
    parsedGuildMemberMaxLevel > 0;
  const normalizedGuildMemberMinLevel = hasGuildMemberMinLevelFilter
    ? Math.max(1, Math.floor(parsedGuildMemberMinLevel))
    : null;
  const normalizedGuildMemberMaxLevel = hasGuildMemberMaxLevelFilter
    ? Math.max(1, Math.floor(parsedGuildMemberMaxLevel))
    : null;
  const hasAnyGuildMemberLevelFilter =
    hasGuildMemberMinLevelFilter || hasGuildMemberMaxLevelFilter;
  const normalizedGuildMemberSearch =
    normalizeGuildMemberSearch(guildMemberSearch);
  const hasGuildMemberSearch = normalizedGuildMemberSearch.length > 0;
  const rankedRoster = useMemo(() => {
    const levelBounds =
      normalizedGuildMemberMinLevel !== null &&
      normalizedGuildMemberMaxLevel !== null
        ? {
            min: Math.min(
              normalizedGuildMemberMinLevel,
              normalizedGuildMemberMaxLevel,
            ),
            max: Math.max(
              normalizedGuildMemberMinLevel,
              normalizedGuildMemberMaxLevel,
            ),
          }
        : {
            min: normalizedGuildMemberMinLevel ?? 1,
            max: normalizedGuildMemberMaxLevel ?? Number.POSITIVE_INFINITY,
          };

    const filteredRoster = roster.filter((member) => {
      if (!hasAnyGuildMemberLevelFilter) return true;
      const level = Number(member?.level) || 1;
      return level >= levelBounds.min && level <= levelBounds.max;
    });

    const sortedRoster = [...filteredRoster].sort((left, right) => {
      const leftLevel = Number(left?.level) || 1;
      const rightLevel = Number(right?.level) || 1;
      const leftItemLevel = getCharacterAverageItemLevel(left);
      const rightItemLevel = getCharacterAverageItemLevel(right);

      if (guildMemberSortMode === GUILD_MEMBER_SORT.LEVEL_ASC) {
        if (leftLevel !== rightLevel) return leftLevel - rightLevel;
        if (rightItemLevel !== leftItemLevel)
          return rightItemLevel - leftItemLevel;
      } else if (guildMemberSortMode === GUILD_MEMBER_SORT.ILVL_DESC) {
        if (rightItemLevel !== leftItemLevel)
          return rightItemLevel - leftItemLevel;
        if (rightLevel !== leftLevel) return rightLevel - leftLevel;
      } else if (guildMemberSortMode === GUILD_MEMBER_SORT.ILVL_ASC) {
        if (leftItemLevel !== rightItemLevel)
          return leftItemLevel - rightItemLevel;
        if (leftLevel !== rightLevel) return leftLevel - rightLevel;
      } else {
        if (rightLevel !== leftLevel) return rightLevel - leftLevel;
        if (rightItemLevel !== leftItemLevel)
          return rightItemLevel - leftItemLevel;
      }

      return String(left?.name || "").localeCompare(String(right?.name || ""));
    });

    if (!hasGuildMemberSearch) return sortedRoster;

    return sortedRoster
      .map((member, index) => ({
        member,
        index,
        searchScore: getGuildMemberSearchScore(
          member,
          normalizedGuildMemberSearch,
        ),
      }))
      .sort((left, right) => {
        if (right.searchScore !== left.searchScore) {
          return right.searchScore - left.searchScore;
        }
        return left.index - right.index;
      })
      .map((entry) => entry.member);
  }, [
    guildMemberSortMode,
    hasGuildMemberSearch,
    hasAnyGuildMemberLevelFilter,
    normalizedGuildMemberMaxLevel,
    normalizedGuildMemberMinLevel,
    normalizedGuildMemberSearch,
    roster,
  ]);
  const bestGuildMemberSearchScore =
    hasGuildMemberSearch && rankedRoster.length > 0
      ? getGuildMemberSearchScore(rankedRoster[0], normalizedGuildMemberSearch)
      : 0;
  const bestGuildMemberSearchMatchId =
    bestGuildMemberSearchScore > 0 ? rankedRoster[0]?.id : null;
  const hasGuildMemberSearchMatch = bestGuildMemberSearchMatchId !== null;
  const missionAchievementCatalog = useMemo(
    () =>
      [...missionList]
        .filter((mission) => mission?.type === "dungeon")
        .sort((left, right) => {
          if ((left?.level || 0) !== (right?.level || 0)) {
            return (left?.level || 0) - (right?.level || 0);
          }
          return String(left?.name || "").localeCompare(
            String(right?.name || ""),
          );
        })
        .map((mission) => ({
          id: mission.id,
          name: mission.name,
          label:
            mission?.type === "dungeon" && mission?.dungeonWing
              ? `${mission.dungeonWing}${mission?.dungeonSetName ? ` (${mission.dungeonSetName})` : ""}`
              : mission.name,
          isRaid: mission.isRaid === true,
          recommended: mission.recommended,
          minLevel: mission.minLevel,
          entryLevel: mission.entryLevel,
        })),
    [missionList],
  );
  const openRecruitSlots = Math.max(0, guildDerivedStats.maxRoster - roster.length);
  const openRealmApplicationCount = realmApplicationCandidates.length;

  const actionsRef = useRef({});
  Object.assign(actionsRef.current, {
    dismissNotification,
    changeGuildSetup: handleGuildSetupChange,
    loadSession: handleLoadButtonClick,
    loadSessionFile: handleLoadSessionFile,
    startGuild: handleStartGuild,
    selectCharacter: setDetailCharId,
    closeCharacterDetail: () => setDetailCharId(null),
    togglePause: () => setIsPaused((current) => !current),
    cycleGameSpeed: () =>
      setGameSpeed((current) => getNextGameSpeed(current || DEFAULT_GAME_SPEED)),
    updateMissionBoardState: setMissionBoardState,
    updateMemberRankingMode: setMemberRankingMode,
    updateMemberSearch: setGuildMemberSearch,
    updateMemberMinLevel: setGuildMemberMinLevelFilter,
    updateMemberMaxLevel: setGuildMemberMaxLevelFilter,
    updateMemberSortMode: setGuildMemberSortMode,
    updateMemberRole: (id, role) =>
      setRoster((currentRoster) =>
        currentRoster.map((character) =>
          character.id === id ? { ...character, role } : character,
        ),
      ),
    openDebug: () => setShowDebug(true),
    closeDebug: () => setShowDebug(false),
    openGuildLog: () => setShowGuildLog(true),
    closeGuildLog: () => setShowGuildLog(false),
    openLootTable: () => setShowLootTable(true),
    closeLootTable: () => setShowLootTable(false),
    openOptions: () => setShowOptions(true),
    closeOptions: () => setShowOptions(false),
    openProfessions: () => setShowProfessions(true),
    closeProfessions: () => setShowProfessions(false),
    openRecruit: () => setShowRecruit(true),
    closeRecruit: () => setShowRecruit(false),
  });

  const game = {
    actions: actionsRef.current,
    activeMissions,
    battlefieldState,
    bestGuildMemberSearchMatchId,
    calendarState,
    currentCalendarDate,
    currentCalendarDayIndex,
    currentCalendarDayProgressPercent,
    dashboardSectionsOpen,
    debugActions,
    detailCharId,
    dismissNotification,
    dungeonActivityInfoText,
    factionMissionIconUrl,
    gameSpeed,
    gameTimeMs,
    getAdjustedMissionSuccessPreview,
    getMissionInstanceId,
    guildInventory,
    guildActivityModeSummary,
    guildClassSummary,
    guildDerivedStats,
    guildFocusBonuses,
    guildGold,
    guildLog,
    guildMemberMaxLevelFilter,
    guildMemberMinLevelFilter,
    guildMemberSearch,
    guildMemberSortMode,
    guildProgress,
    guildRelationships,
    guildRoleSummary,
    guildSetup,
    handleCleanupGuildStash,
    handleCancelCalendarEvent,
    handleCancelCalendarSeries,
    handleChangeGuildFocus: handleGuildFocusChange,
    handleClearAdventureGoal,
    handleCreateCalendarEvent,
    handleCreateCalendarSeries,
    handleCraftRecipe,
    handleDeclineApplications,
    handleDeploy,
    handleDismiss,
    handleGenerateBackstory,
    handleGuildDungeonActivityChange,
    handleGuildModeChange,
    handleGuildSetupChange,
    handleGuildSuccessRateChange,
    handleLoadButtonClick,
    handleLoadSessionFile,
    handleLockCalendarEventRoster,
    handleManualFinish,
    handleModeChange,
    handleOpenRecruit,
    handleProfChange,
    handlePvpActivityFocusChange,
    handleQueueWarsongGulch,
    handleQueueAdventureGoal,
    handleRecruit,
    handleRecruitApplications,
    handleSaveSession,
    handleScoutRecruitmentTier,
    handleSellStashItem,
    handleStartCalendarEvent,
    handleStartGuild,
    handleTryAutoEquipFromGuildStash,
    handleUpdateBackstory,
    handleUpdateCalendarEventRoster,
    handleUpgradeGuildTalent,
    hasAnyGuildMemberLevelFilter,
    hasGuildMemberSearch,
    hasGuildMemberSearchMatch,
    isPaused,
    itemCatalog,
    itemDatabase,
    memberRankingMode,
    missionAchievementCatalog,
    missionBoardState,
    missionList,
    notifications,
    openRealmApplicationCount,
    openRecruitSlots,
    pushNotification,
    raidLockouts,
    rankedRoster,
    realmApplicationCandidates,
    realmRecruitmentMarketStats,
    realmState,
    roster,
    sessionFileInputRef,
    showDebug,
    showGuildLog,
    showLootTable,
    showOptions,
    showProfessions,
    showRecruit,
    SHOW_LEGACY_QUESTS,
    stashPolicy,
    toggleDashboardSection,
    worldPvpState,
  };

  const contextStoreRef = useRef(null);
  if (!contextStoreRef.current) {
    contextStoreRef.current = createGameContextStore(game);
  }
  useLayoutEffect(() => {
    contextStoreRef.current.setSnapshot(game);
  }, [game]);

  return (
    <GameContext.Provider value={contextStoreRef.current}>{children}</GameContext.Provider>
  );
};
