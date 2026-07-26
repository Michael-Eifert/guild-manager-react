/* eslint-disable react-hooks/exhaustive-deps -- synchronized commit refs and setters are stable by contract during the provider migration */
// Transitional JavaScript composition controller: extracted domain modules are strictly typed.
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import { createGameContextStore } from "./GameContext";
import { useSynchronizedState } from "./useSynchronizedState";
import { useGameRuntime } from "./useGameRuntime";
import { useHomeUiState } from "./useHomeUiState";
import { useNotifications } from "./useNotifications";
import { createSessionActions } from "./sessionActions";
import { clearBrowserSession } from "../session/browserSessionPersistence";
import {
  autoEquipGuildStashItem,
  cleanGuildStash,
  craftInventoryRecipe,
  sellGuildStashItem,
} from "../inventory/providerInventoryTransitions";
import {
  buildMissionAchievementCatalog,
  getDungeonActivityInfoText,
  getGuildActivityModeSummary,
  getMemberLevelBounds,
  rankGuildRoster,
} from "./providerSelectors";
import {
  applyDungeonStepLootAwards as calculateDungeonStepLootAwards,
  applyMissionWipeCosts as calculateMissionWipeCosts,
  buildMissionRun as createMissionRun,
  getAdjustedMissionSuccessPreview as calculateMissionSuccessPreview,
  getMissionInstanceId,
  resolveDungeonChainContinuation as calculateDungeonChainContinuation,
  sortDungeonChainMissions,
} from "../missions/missionRuntime";
import {
  CONFIG,
  INITIAL_MISSIONS,
  DB_CLASSES,
  PROF_ACTIONS,
  GUILD_FACTION,
  GUILD_FACTION_OPTIONS,
  GUILD_SERVER_OPTIONS,
  normalizeRealmDifficulty,
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
  getItemEffectiveLevel,
  getCharacterAverageItemLevel,
  createId,
  getClassArmorTypes,
  isItemUsableByClass,
  getKeyLabel,
  getWowIconUrl,
} from "../utils";
import {
  buildFounderRoster,
  normalizeFounderConfig,
} from "../guildRelations/founderCreation";
import {
  GUILD_RANK,
  assignGuildRank,
  buildGuildRelationInsights,
  castGuildElectionVote,
  createGuildElection,
  createGuildIncident,
  createInitialGuildRelationsState,
  getLeadershipTraitForCharacter,
  normalizeGuildRelationsState,
  resolveExpiredGuildIncidents,
  resolveGuildIncident,
  validateGuildRankLabels,
} from "../guildRelations/guildRelations";
import {
  createInitialGuildActivityStats,
  recordCompletedGuildRun,
  registerStartedGuildRuns,
} from "../guild/guildActivityStats";
import {
  buildOnlineSnapshot,
  shouldUseAutoFastForward,
} from "../activity/characterOnline";
import {
  clearPersistedOfflineStatuses,
  DEFAULT_GAME_SETTINGS,
  normalizeGameSettings,
} from "../settings/gameSettings";
import {
  GUILD_POINT_LABEL,
  createInitialGuildProgress,
  getGuildDerivedStats,
  applyLevelMilestones,
  applyRosterSizeMilestones,
  applyDungeonClearMilestones,
  applyDungeonWipeMilestone,
  upgradeGuildTalent,
} from "../guildProgression";
import {
  DEFAULT_GAME_SPEED,
  getNextGameSpeed,
} from "../progression";
import {
  evaluateMissionKeyAccess,
  getDungeonBossCount,
  getDungeonQuarterExpMultiplier,
  getDungeonOverlevelExpMultiplier,
  getMissionLevelExpMultiplier,
  getMissionGoldReward,
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
  updateRelationshipsForSharedActivity,
} from "../social/relationshipSystem";
import {
  advanceSocialSimulation,
  appendGuildElectionMessage,
  completeMissionSocialActivity,
  createInitialSocialState,
  ensureSocialState,
  getUnreadChatCount,
  markChatChannelRead,
  markLfgSearchStarted,
  resolveChatMessageText,
  toParticipant,
} from "../social/socialSimulation";
import {
  attachGuildIncidentToScene,
  resolveGuildIncidentRpScene,
} from "../social/rpSimulation";
import {
  CHAT_AI_MAX_QUEUE_SIZE,
  createChatTextProvider,
  generateChatTextWithTimeout,
  loadChatAiSettings,
  saveChatAiSettings,
  testChatProviderConnection,
} from "../social/chatProviders";
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
  filterUniqueRecruitmentCandidates,
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
import { advanceDungeonMission } from "../game/dungeonEngine";
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
  MORALE_ZONE_CLEAR_DELTA,
  applyMoraleDelta,
  getCharacterMorale,
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
  hasDuplicateCalendarEvent,
  hasDuplicateCalendarSeries,
  normalizeCalendarState,
  refreshCalendarState,
  getMissionInstanceKey,
} from "../calendar/calendarLogic";
import {
  getRaidLockoutStatus,
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
import { ensureGuildInventory } from "../inventory/guildInventoryUtils";
import {
  DEFAULT_STASH_POLICY,
  ensureStashPolicy,
} from "../inventory/itemEvaluation";
import {
  CONSUMABLE_MODE,
  consumeMissionConsumables,
  formatConsumableUseSummary,
  getConsumableMissionModifiers,
} from "../professions/consumableEffects";
import { generatePassiveProfessionMaterial } from "../professions/professionUtils";
import { ROUTES } from "../routes";

const GUILD_FOCUS_CHANGE_COST_GOLD = 10;

const DEFAULT_DASHBOARD_SECTIONS = Object.freeze({
  guildActivity: true,
  dungeonGroups: true,
  pvpActivity: true,
  guildComposition: true,
});

const {
  FAILED_MISSION_EXP_FACTOR,
  ENABLE_ZONE_QUESTING,
  SHOW_LEGACY_QUESTS,
} = GAMEPLAY_TUNING;
const {
  MEMBER_COUNT: STARTING_GUILD_MEMBERS,
  GOLD: STARTING_GUILD_GOLD,
} = GUILD_STARTING_CONFIG;
const {
  COMMON_DROP_CHANCE: WORLD_TICK_COMMON_DROP_CHANCE,
  UNCOMMON_DROP_CHANCE: WORLD_TICK_UNCOMMON_DROP_CHANCE,
  EPIC_DROP_CHANCE: WORLD_TICK_EPIC_DROP_CHANCE,
  EPIC_MIN_LEVEL: WORLD_TICK_EPIC_MIN_LEVEL,
} = WORLD_DROP_CONFIG;
const BROWSER_AUTOSAVE_INTERVAL_MS = 30_000;

const buildMissionSocialParticipants = (mission, roster, faction) => {
  if (
    Array.isArray(mission?.partyParticipants) &&
    mission.partyParticipants.length > 0
  ) {
    return mission.partyParticipants;
  }
  const memberIds = new Set(
    (Array.isArray(mission?.memberIds) ? mission.memberIds : []).map(String),
  );
  return (Array.isArray(roster) ? roster : [])
    .filter((member) => memberIds.has(String(member.id)))
    .map((member) =>
      toParticipant(
        { ...member, faction: member.faction || faction },
        "guild",
      ),
    );
};

// --- MAIN APP COMPONENT ---

export const useGameProviderController = () => {
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
  const [socialState, setSocialState, socialStateRef] = useSynchronizedState(() =>
    createInitialSocialState(),
  );
  const [guildRelationsState, setGuildRelationsState, guildRelationsStateRef] =
    useSynchronizedState(() => createInitialGuildRelationsState());
  const [guildActivityStats, setGuildActivityStats, guildActivityStatsRef] =
    useSynchronizedState(() => createInitialGuildActivityStats(0));
  const [gameSettings, setGameSettings, gameSettingsRef] =
    useSynchronizedState(() => normalizeGameSettings(DEFAULT_GAME_SETTINGS));
  const [chatAiSettings, setChatAiSettings] = useState(loadChatAiSettings);
  const chatAiSettingsRef = useRef(chatAiSettings);
  const chatGenerationBusyRef = useRef(false);
  const chatGenerationTokenRef = useRef(0);
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
    setShowGuildLog,
    setShowLootTable,
    setShowOptions,
    setShowProfessions,
    setShowRecruit,
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
  const browserSessionReadyRef = useRef(false);
  const browserAutosaveWarningShownRef = useRef(false);
  const persistBrowserSessionRef = useRef(() => false);

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
  useEffect(() => {
    chatAiSettingsRef.current = chatAiSettings;
  }, [chatAiSettings]);

  const pendingChatMessageId =
    socialState.messages.find(
      (message) =>
        message.contentKind === "roleplay" &&
        message.generationStatus === "pending",
    )?.id || null;
  useEffect(() => {
    if (isPaused) return undefined;
    if (chatGenerationBusyRef.current) return undefined;
    const currentMessages = socialStateRef.current.messages;
    const pendingMessages = currentMessages.filter(
      (message) =>
        message.contentKind === "roleplay" &&
        message.generationStatus === "pending",
    );
    if (pendingMessages.length === 0) return undefined;

    const provider = createChatTextProvider({ settings: chatAiSettings });
    const shouldUseFallback =
      !provider ||
      gameSpeed > 4 ||
      pendingMessages.length > CHAT_AI_MAX_QUEUE_SIZE;
    const message = pendingMessages[0];
    if (shouldUseFallback) {
      const nextState = resolveChatMessageText({
        socialState: socialStateRef.current,
        messageId: message.id,
        text: message.fallbackText,
        source: "template",
      });
      socialStateRef.current = nextState;
      setSocialState(nextState);
      return undefined;
    }

    let cancelled = false;
    const generationToken = chatGenerationTokenRef.current + 1;
    chatGenerationTokenRef.current = generationToken;
    chatGenerationBusyRef.current = true;
    const recentMessages = currentMessages
      .filter(
        (entry) =>
          entry.sequence < message.sequence &&
          entry.generationStatus === "ready" &&
          entry.sceneId === message.sceneId,
      )
      .slice(-4);
    generateChatTextWithTimeout({
      provider,
      message,
      recentMessages,
    })
      .then((text) => {
        if (
          cancelled ||
          generationToken !== chatGenerationTokenRef.current
        ) {
          return;
        }
        chatGenerationBusyRef.current = false;
        const nextState = resolveChatMessageText({
          socialState: socialStateRef.current,
          messageId: message.id,
          text: text || message.fallbackText,
          source: chatAiSettings.provider,
        });
        socialStateRef.current = nextState;
        setSocialState(nextState);
      })
      .catch(() => {
        if (
          cancelled ||
          generationToken !== chatGenerationTokenRef.current
        ) {
          return;
        }
        chatGenerationBusyRef.current = false;
        const nextState = resolveChatMessageText({
          socialState: socialStateRef.current,
          messageId: message.id,
          text: message.fallbackText,
          source: "template",
        });
        socialStateRef.current = nextState;
        setSocialState(nextState);
      })
      .finally(() => {
        if (generationToken === chatGenerationTokenRef.current) {
          chatGenerationBusyRef.current = false;
        }
      });
    return () => {
      cancelled = true;
      chatGenerationBusyRef.current = false;
    };
  }, [chatAiSettings, gameSpeed, isPaused, pendingChatMessageId]);
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
  const guildOnlineSnapshot = useMemo(
    () =>
      buildOnlineSnapshot({
        characters: roster,
        dayIndex: currentCalendarDayIndex,
        dayProgress: currentCalendarDayProgress,
        activeMissions,
        activeBattles: battlefieldState?.activeBattles,
        searches: socialState?.searches,
        calendarEvents: calendarState?.calendarEvents,
        offlineSimulationEnabled:
          gameSettings.offlineSimulationEnabled,
      }),
    [
      activeMissions,
      battlefieldState,
      calendarState,
      currentCalendarDayIndex,
      currentCalendarDayProgress,
      roster,
      socialState,
      gameSettings.offlineSimulationEnabled,
    ],
  );
  const hasActiveLfg = (socialState?.searches || []).some((search) =>
    ["guild", "general", "ready", "forming"].includes(String(search?.phase)),
  );
  const isAutoFastForward = shouldUseAutoFastForward({
    isPaused,
    memberCount: roster.length,
    onlineCount: guildOnlineSnapshot.onlineCount,
    hasActiveMission: activeMissions.length > 0,
    hasActiveBattlefield:
      (battlefieldState?.activeBattles || []).length > 0,
    hasActiveLfg,
    hasElection: Boolean(guildRelationsState?.election),
  });
  const effectiveGameSpeed = isAutoFastForward ? 8 : gameSpeed;
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

  const applyMissionWipeCosts = useCallback(calculateMissionWipeCosts, []);

  const getAdjustedMissionSuccessPreview = useCallback(
    (mission, members) =>
      calculateMissionSuccessPreview({
        mission,
        members,
        guildFocus: guildSetupRef.current?.focus,
        relationships: guildRelationshipsRef.current,
      }),
    [],
  );

  const buildMissionRun = useCallback(
    (
      quest,
      ids,
      startTime,
      rosterSnapshot,
      chainContext = null,
      runOptions = {},
    ) => {
      return createMissionRun({
        quest,
        memberIds: ids,
        startTime,
        roster: Array.isArray(rosterSnapshot) ? rosterSnapshot : rosterRef.current,
        chainContext,
        runOptions,
        raidLockouts: raidLockoutsRef.current,
        currentDayIndex: getCurrentCalendarDayIndex(),
        services,
        getSuccessPreview: getAdjustedMissionSuccessPreview,
      });
    },
    [getAdjustedMissionSuccessPreview, getCurrentCalendarDayIndex],
  );

  const resolveDungeonChainContinuation = useCallback(
    ({ mission, missionSucceeded, rosterSnapshot, startTime }) => {
      return calculateDungeonChainContinuation({
        mission,
        missionSucceeded,
        roster: rosterSnapshot,
        startTime,
        missionList: missionListRef.current,
        raidLockouts: raidLockoutsRef.current,
        currentDayIndex: getCurrentCalendarDayIndex(),
        buildRun: buildMissionRun,
      });
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
    ({ activeMissions, finishedMissions, rosterSnapshot, stepLogs }) =>
      calculateDungeonStepLootAwards({
        activeMissions,
        finishedMissions,
        roster: rosterSnapshot,
        stepLogs,
        awardDungeonStepLoot: missionRewardProcessor.awardDungeonStepLoot,
      }),
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
  useGameRuntime({
    isPaused,
    gameSpeed: effectiveGameSpeed,
    services,
    gameTimeRef,
    lastRealTimeRef,
    setGameTimeMs,
    intervalMs: CONFIG.TICK_RATE,
    onActiveTick: ({ now, elapsedGameMs }) => {
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
        offlineSimulationEnabled:
          gameSettingsRef.current.offlineSimulationEnabled,
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
      let currentSocialState = ensureSocialState(socialStateRef.current);
      let currentGuildRelationsState = normalizeGuildRelationsState(
        guildRelationsStateRef.current,
        currentRoster,
      );
      let currentGuildActivityStats = registerStartedGuildRuns(
        guildActivityStatsRef.current,
        currentMissions,
      );
      let relationsMissionCandidate = null;
      let nextGuildInventory = ensureGuildInventory(guildInventoryRef.current);

      const playerMarket = resolvePlayerGuildDeparturesForDay({
        realmState: realmStateRef.current,
        roster: currentRoster,
        activeMissions: currentMissions,
        currentDayIndex: calendarDayIndex,
        guildFaction: currentFaction,
      });
      if (playerMarket.events.length > 0) {
        const previousRosterIds = new Set(
          currentRoster.map((member) => String(member.id)),
        );
        const remainingRosterIds = new Set(
          playerMarket.roster.map((member) => String(member.id)),
        );
        const departedMemberId = [...previousRosterIds].find(
          (memberId) => !remainingRosterIds.has(memberId),
        );
        const departedRank = departedMemberId
          ? currentGuildRelationsState.assignments[departedMemberId]
          : null;
        if (departedMemberId) {
          guildRelationshipsRef.current = removeMemberRelationships(
            guildRelationshipsRef.current,
            departedMemberId,
          );
        }
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
        if (
          departedMemberId &&
          departedRank === GUILD_RANK.GUILD_MASTER
        ) {
          currentGuildRelationsState = createGuildElection({
            state: currentGuildRelationsState,
            roster: currentRoster,
            relationships: guildRelationshipsRef.current,
            departedGuildMasterId: departedMemberId,
            dayIndex: calendarDayIndex,
            previousGameSpeed: gameSpeed,
          });
          if (currentGuildRelationsState.election) setIsPaused(true);
        } else {
          currentGuildRelationsState = normalizeGuildRelationsState(
            currentGuildRelationsState,
            currentRoster,
          );
        }
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
        random: services.random,
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
        currentGuildActivityStats = recordCompletedGuildRun({
          stats: currentGuildActivityStats,
          mission: m,
          succeeded: result.missionSucceeded,
          dayIndex: calendarDayIndex,
        });
        if (!relationsMissionCandidate && Array.isArray(m.memberIds)) {
          relationsMissionCandidate = {
            missionSucceeded: result.missionSucceeded,
            missionMemberIds: m.memberIds,
          };
        }
        recordMissionRelationships(m, result.missionSucceeded);
        currentSocialState = completeMissionSocialActivity({
          socialState: currentSocialState,
          mission: m,
          succeeded: result.missionSucceeded,
          now,
          roster: result.updatedRoster,
          relationships: guildRelationshipsRef.current,
          dayIndex: calendarDayIndex,
          deferText:
            chatAiSettingsRef.current.provider !== "templates" &&
            gameSpeed <= 4,
        });
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

      const tickOnlineSnapshot = buildOnlineSnapshot({
        characters: newRoster,
        dayIndex: calendarDayIndex,
        dayProgress: calendarDayProgress,
        activeMissions: newMissions,
        activeBattles: currentBattlefieldState.activeBattles,
        searches: currentSocialState.searches,
        calendarEvents: calendarStateRef.current.calendarEvents,
        offlineSimulationEnabled:
          gameSettingsRef.current.offlineSimulationEnabled,
      });
      let onlineRoster = newRoster.filter((member) =>
        tickOnlineSnapshot.onlineIds.has(String(member.id)),
      );
      const realmOnlineSnapshot = buildOnlineSnapshot({
        characters: realmStateRef.current?.population?.players || [],
        dayIndex: calendarDayIndex,
        dayProgress: calendarDayProgress,
        searches: currentSocialState.searches,
        offlineSimulationEnabled:
          gameSettingsRef.current.offlineSimulationEnabled,
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
        onlineMemberIds: tickOnlineSnapshot.onlineIds,
      });
      currentBattlefieldState = aggressivePvpQueue.battlefieldState;
      newRoster = aggressivePvpQueue.roster;
      onlineRoster = newRoster.filter((member) =>
        tickOnlineSnapshot.onlineIds.has(String(member.id)),
      );
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
        roster: onlineRoster,
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
        roster: onlineRoster,
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

      const socialAdvance = advanceSocialSimulation({
        socialState: currentSocialState,
        now,
        roster: newRoster,
        realmState: realmStateRef.current,
        activeMissions: newMissions,
        missionList: missionListRef.current,
        guildSetup: guildSetupRef.current,
        onlineGuildMemberIds: tickOnlineSnapshot.onlineIds,
        onlineRealmPlayerIds: realmOnlineSnapshot.onlineIds,
        currentDayIndex: calendarDayIndex,
        deferText:
          chatAiSettingsRef.current.provider !== "templates" &&
          gameSpeed <= 4,
      });
      currentSocialState = socialAdvance.socialState;
      newRoster = socialAdvance.roster;
      socialAdvance.readyGroups.forEach((group) => {
        const busyMemberIds = getActiveMissionMemberIdSet(newMissions);
        if (
          group.guildMemberIds.length === 0 ||
          group.guildMemberIds.some((memberId) =>
            busyMemberIds.has(String(memberId)),
          )
        ) {
          return;
        }
        const partyMembers = group.participants.map((participant) => {
          if (participant.source !== "guild") return participant;
          return (
            newRoster.find(
              (member) => String(member.id) === String(participant.id),
            ) || participant
          );
        });
        const missionRun = buildMissionRun(
          group.mission,
          group.guildMemberIds,
          now,
          newRoster,
          null,
          {
            partyMembers,
            partyParticipants: group.participants,
            lfgSearchId: group.searchId,
          },
        );
        newRoster = newRoster.map((member) =>
          group.guildMemberIds.includes(member.id)
            ? {
                ...member,
                status: "Questing",
                statusText: `LFG: ${
                  group.mission.dungeonWing ||
                  group.mission.name ||
                  "Group Mission"
                }`,
                autoDungeonLastStartedAt: now,
                autoDungeonLastMissionId: String(group.mission.id ?? ""),
              }
            : member,
        );
        newMissions.push(missionRun);
        currentSocialState = markLfgSearchStarted({
          socialState: currentSocialState,
          searchId: group.searchId,
          missionInstanceId: missionRun.instanceId,
          now,
          deferText:
            chatAiSettingsRef.current.provider !== "templates" &&
            gameSpeed <= 4,
        });
        newLogs.push({
          type: "lfg",
          missionName: group.mission.name,
          message: `${group.guildMemberIds.length} guild member${
            group.guildMemberIds.length === 1 ? "" : "s"
          } joined ${
            group.participants.length - group.guildMemberIds.length
          } realm adventurer${
            group.participants.length - group.guildMemberIds.length === 1
              ? ""
              : "s"
          } for ${group.mission.dungeonWing || group.mission.name}.`,
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
        onlineMemberIds: tickOnlineSnapshot.onlineIds,
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
        if (!tickOnlineSnapshot.onlineIds.has(String(normalizedChar.id))) {
          return {
            ...normalizedChar,
            status: "Idle",
            statusText: "Offline",
          };
        }
        if (
          normalizedChar.status === "Questing" ||
          normalizedChar.status === "LFG" ||
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

      if (!currentGuildRelationsState.election) {
        const expiredRelations = resolveExpiredGuildIncidents({
          state: currentGuildRelationsState,
          roster: newRoster,
          relationships: guildRelationshipsRef.current,
          currentDayIndex: calendarDayIndex,
        });
        currentGuildRelationsState = expiredRelations.state;
        newRoster = expiredRelations.roster;
        guildRelationshipsRef.current = expiredRelations.relationships;
        expiredRelations.resolvedIncidents.forEach((incident) => {
          const guildMasterId = Object.entries(
            currentGuildRelationsState.assignments,
          ).find(([, rank]) => rank === GUILD_RANK.GUILD_MASTER)?.[0];
          const guildMaster = newRoster.find(
            (member) => String(member.id) === String(guildMasterId || ""),
          );
          currentSocialState = resolveGuildIncidentRpScene({
            state: currentSocialState,
            incident,
            guildMaster: guildMaster
              ? toParticipant(
                  {
                    ...guildMaster,
                    faction: guildMaster.faction || currentFaction,
                  },
                  "guild",
                )
              : null,
            now,
          });
        });

        const shouldCreateAmbientIncident =
          !relationsMissionCandidate &&
          tickOnlineSnapshot.onlineCount >= 2 &&
          calendarDayProgress >= 0.75;
        if (relationsMissionCandidate || shouldCreateAmbientIncident) {
          const created = createGuildIncident({
            state: currentGuildRelationsState,
            roster: newRoster,
            relationships: guildRelationshipsRef.current,
            dayIndex: calendarDayIndex,
            ...relationsMissionCandidate,
          });
          currentGuildRelationsState = created.state;
          let sceneIncident = created.incident;
          if (
            created.incident &&
            currentGuildRelationsState.managementMode === "automatic"
          ) {
            const resolved = resolveGuildIncident({
              state: currentGuildRelationsState,
              roster: newRoster,
              relationships: guildRelationshipsRef.current,
              incidentId: created.incident.id,
              resolvedBy: "guild_master",
            });
            currentGuildRelationsState = resolved.state;
            newRoster = resolved.roster;
            guildRelationshipsRef.current = resolved.relationships;
            sceneIncident = resolved.incident || created.incident;
          }
          if (sceneIncident) {
            const sceneParticipants = [sceneIncident.actorId, sceneIncident.subjectId]
              .map((memberId) =>
                newRoster.find(
                  (member) => String(member.id) === String(memberId),
                ),
              )
              .filter(Boolean)
              .map((member) =>
                toParticipant(
                  {
                    ...member,
                    faction: member.faction || currentFaction,
                  },
                  "guild",
                ),
              );
            const guildMasterId = Object.entries(
              currentGuildRelationsState.assignments,
            ).find(([, rank]) => rank === GUILD_RANK.GUILD_MASTER)?.[0];
            const guildMaster = newRoster.find(
              (member) => String(member.id) === String(guildMasterId || ""),
            );
            currentSocialState = attachGuildIncidentToScene({
              state: currentSocialState,
              incident: sceneIncident,
              participants: sceneParticipants,
              guildMaster: guildMaster
                ? toParticipant(
                    {
                      ...guildMaster,
                      faction: guildMaster.faction || currentFaction,
                    },
                    "guild",
                  )
                : null,
              now,
            });
          }
        }
      }

      rosterRef.current = newRoster;
      missionsRef.current = newMissions;
      socialStateRef.current = currentSocialState;
      guildRelationsStateRef.current = currentGuildRelationsState;
      guildActivityStatsRef.current = currentGuildActivityStats;
      setRoster(newRoster);
      setActiveMissions(newMissions);
      setSocialState(currentSocialState);
      setGuildRelationsState(currentGuildRelationsState);
      setGuildActivityStats(currentGuildActivityStats);
      setGuildRelationships(guildRelationshipsRef.current);
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
    },
  });

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
      count: scoutCount,
      focus: options?.focus,
      excludedPlayerIds: [
        ...applicationPlayerIds,
        ...ensureSocialState(socialStateRef.current).reservedRealmPlayerIds,
      ],
      excludedNames: [...usedNameSet],
      random: services.random,
    })
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
        activityLevel: player.activityLevel,
        level,
        exp: 0,
        maxExp: CONFIG.XP_TABLE[level] || CONFIG.XP_TABLE[1],
      };
      const candidateOnline = buildOnlineSnapshot({
        characters: [candidate],
        dayIndex: getCalendarDayIndex(
          gameTimeRef.current,
          calendarStateRef.current.calendarEpochGameTimeMs,
        ),
        dayProgress: getCalendarDayProgress(
          gameTimeRef.current,
          calendarStateRef.current.calendarEpochGameTimeMs,
        ),
        searches: socialStateRef.current?.searches,
        offlineSimulationEnabled:
          gameSettingsRef.current.offlineSimulationEnabled,
      }).byId[String(candidate.id)];
      return {
        ...candidate,
        onlineStatus: candidateOnline?.status || "Offline",
        onlineProfile: candidateOnline?.profileLabel || "Regular",
        nextLoginDayIndex: candidateOnline?.nextLoginDayIndex,
        nextLoginHour: candidateOnline?.nextLoginHour,
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
    const applications = getRealmGuildApplications({
      realmState,
      faction: guildSetup.faction || GUILD_FACTION.ALLIANCE,
    })
      .filter(
        ({ player }) =>
          !usedNameSet.has(String(player?.name || "").trim().toLowerCase()) &&
          !ensureSocialState(socialState).reservedRealmPlayerIds.includes(
            String(player?.id || ""),
          ),
      )
      .map(buildRealmRecruitmentCandidate);
    const snapshot = buildOnlineSnapshot({
      characters: applications,
      dayIndex: currentCalendarDayIndex,
      dayProgress: currentCalendarDayProgress,
      searches: socialState?.searches,
      offlineSimulationEnabled:
        gameSettings.offlineSimulationEnabled,
    });
    return applications.map((candidate) => {
      const online = snapshot.byId[String(candidate.id)];
      return {
        ...candidate,
        onlineStatus: online?.status || "Offline",
        onlineProfile: online?.profileLabel || "Regular",
        nextLoginDayIndex: online?.nextLoginDayIndex,
        nextLoginHour: online?.nextLoginHour,
      };
    });
  }, [
    buildRealmRecruitmentCandidate,
    currentCalendarDayIndex,
    currentCalendarDayProgress,
    gameSettings.offlineSimulationEnabled,
    guildSetup.faction,
    realmState,
    roster,
    socialState,
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
    const reservedRealmPlayerIds = new Set(
      ensureSocialState(socialStateRef.current).reservedRealmPlayerIds,
    );
    const {
      recruits,
      skippedDuplicateCount,
      spentGold,
      updatedGold,
      updatedRoster,
    } =
      resolveRecruitmentResult({
        currentRoster: rosterRef.current,
        currentGold: goldRef.current,
        selectedCandidates: (Array.isArray(chars) ? chars : []).filter(
          (candidate) =>
            !reservedRealmPlayerIds.has(String(candidate?.realmPlayerId || "")),
        ),
        maxRoster: guildDerivedStats.maxRoster,
        recruitCostGold,
      });

    if (recruits.length === 0) {
      pushNotification({
        type: "error",
        title:
          skippedDuplicateCount > 0
            ? "Already Recruited"
            : "Recruitment Blocked",
        message:
          skippedDuplicateCount > 0
            ? "The selected heroes already belong to your guild."
            : "Need free roster slots to recruit heroes.",
      });
      setShowRecruit(false);
      return [];
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

    const recruitedIdSet = new Set(recruits.map((member) => String(member.id)));
    const zoneReadyRoster = normalizeRosterZones(updatedRoster).map((member) => ({
      ...member,
      leadershipTrait:
        member.leadershipTrait || getLeadershipTraitForCharacter(member.id),
    }));
    const nextGuildRelationsState = normalizeGuildRelationsState(
      guildRelationsStateRef.current,
      zoneReadyRoster,
    );
    recruitedIdSet.forEach((memberId) => {
      nextGuildRelationsState.assignments[memberId] = GUILD_RANK.RECRUIT;
    });
    rosterRef.current = zoneReadyRoster;
    guildRelationsStateRef.current = nextGuildRelationsState;
    goldRef.current = updatedGold;
    setRoster(zoneReadyRoster);
    setGuildRelationsState(nextGuildRelationsState);
    setGuildGold(updatedGold);
    pushNotification({
      type: "info",
      title: "Recruitment Complete",
      message: `${recruits.length} hero${recruits.length > 1 ? "es" : ""} recruited from ${tier?.label || "applicants"}. Additional recruitment cost: ${spentGold}g.`,
    });
    setShowRecruit(false);
    return recruits;
  };

  const handleRecruitApplications = (chars = []) => {
    const openSlots = Math.max(
      0,
      guildDerivedStats.maxRoster - rosterRef.current.length,
    );
    const reservedRealmPlayerIds = new Set(
      ensureSocialState(socialStateRef.current).reservedRealmPlayerIds,
    );
    const uniqueCandidates = filterUniqueRecruitmentCandidates({
      currentRoster: rosterRef.current,
      selectedCandidates: (Array.isArray(chars) ? chars : []).filter(
        (candidate) =>
          !reservedRealmPlayerIds.has(String(candidate?.realmPlayerId || "")),
      ),
    });
    const recruits = uniqueCandidates
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
      return [];
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

    const recruitedIdSet = new Set(recruits.map((member) => String(member.id)));
    const zoneReadyRoster = normalizeRosterZones([
      ...rosterRef.current,
      ...recruits,
    ]).map((member) => ({
      ...member,
      leadershipTrait:
        member.leadershipTrait || getLeadershipTraitForCharacter(member.id),
    }));
    const nextGuildRelationsState = normalizeGuildRelationsState(
      guildRelationsStateRef.current,
      zoneReadyRoster,
    );
    recruitedIdSet.forEach((memberId) => {
      nextGuildRelationsState.assignments[memberId] = GUILD_RANK.RECRUIT;
    });
    rosterRef.current = zoneReadyRoster;
    guildRelationsStateRef.current = nextGuildRelationsState;
    setRoster(zoneReadyRoster);
    setGuildRelationsState(nextGuildRelationsState);
    pushNotification({
      type: "info",
      title: "Applications Accepted",
      message: `${recruits.length} applicant${recruits.length === 1 ? "" : "s"} joined your guild for free.`,
    });
    setShowRecruit(false);
    return recruits;
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

  const beginGuildMasterElection = useCallback(
    ({ departedGuildMasterId, nextRoster, dayIndex }) => {
      const nextState = createGuildElection({
        state: guildRelationsStateRef.current,
        roster: nextRoster,
        relationships: guildRelationshipsRef.current,
        departedGuildMasterId,
        dayIndex,
        previousGameSpeed: gameSpeed,
      });
      guildRelationsStateRef.current = nextState;
      setGuildRelationsState(nextState);
      if (nextState.election) {
        setIsPaused(true);
        setGuildLog((current) =>
          [
            {
              time: new Date().toLocaleTimeString(),
              type: "relations",
              message:
                "The guild has called an election for a new Guild Master.",
            },
            ...current,
          ].slice(0, 50),
        );
      }
    },
    [gameSpeed],
  );

  const handleDismiss = (id) => {
    const dismissedRank =
      guildRelationsStateRef.current?.assignments?.[String(id)];
    const nextRoster = rosterRef.current.filter((c) => c.id !== id);
    rosterRef.current = nextRoster;
    setRoster(nextRoster);
    const nextRelationships = removeMemberRelationships(
      guildRelationshipsRef.current,
      id,
    );
    guildRelationshipsRef.current = nextRelationships;
    setGuildRelationships(nextRelationships);
    if (dismissedRank === GUILD_RANK.GUILD_MASTER) {
      beginGuildMasterElection({
        departedGuildMasterId: String(id),
        nextRoster,
        dayIndex: getCurrentCalendarDayIndex(),
      });
    } else {
      const nextState = normalizeGuildRelationsState(
        guildRelationsStateRef.current,
        nextRoster,
      );
      guildRelationsStateRef.current = nextState;
      setGuildRelationsState(nextState);
    }
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
      const queueOnlineSnapshot = buildOnlineSnapshot({
        characters: rosterRef.current,
        dayIndex: getCurrentCalendarDayIndex(),
        dayProgress: getCalendarDayProgress(
          now,
          calendarStateRef.current.calendarEpochGameTimeMs,
        ),
        activeMissions: missionsRef.current,
        activeBattles: battlefieldStateRef.current?.activeBattles,
        searches: socialStateRef.current?.searches,
        calendarEvents: calendarStateRef.current?.calendarEvents,
        offlineSimulationEnabled:
          gameSettingsRef.current.offlineSimulationEnabled,
      });
      const queued = startWarsongGulchBattle({
        battlefieldState: battlefieldStateRef.current,
        roster: rosterRef.current,
        participantIds,
        activeMissions: missionsRef.current,
        guildFaction: currentFaction,
        now,
        currentDayIndex: getCurrentCalendarDayIndex(),
        createId,
        onlineMemberIds: queueOnlineSnapshot.onlineIds,
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
  const setAllDashboardSectionsOpen = useCallback((isOpen) => {
    const nextValue = isOpen === true;
    setDashboardSectionsOpen({
      guildActivity: nextValue,
      dungeonGroups: nextValue,
      pvpActivity: nextValue,
      guildComposition: nextValue,
    });
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
  const handleGuildSetupChange = (field, value) => {
    setGuildSetup((prev) => {
      if (field === "name") return { ...prev, name: String(value || "") };
      if (field === "faction") {
        const faction = GUILD_FACTION_OPTIONS.includes(value)
          ? value
          : GUILD_FACTION.ALLIANCE;
        return {
          ...prev,
          faction,
          founder: normalizeFounderConfig(prev.founder, faction),
        };
      }
      if (field === "founder" && !prev.hasStarted) {
        return {
          ...prev,
          founder: normalizeFounderConfig(value, prev.faction),
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
      if (field === "realmDifficulty" && !prev.hasStarted) {
        return {
          ...prev,
          realmDifficulty: normalizeRealmDifficulty(value),
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
    const normalizedFounder = normalizeFounderConfig(
      guildSetup.founder,
      guildSetup.faction,
    );
    if (!normalizedName) return;
    const founderForStart = {
      ...normalizedFounder,
      name: normalizedFounder.name || `${normalizedName} Founder`.slice(0, 24),
    };
    const starterRoster = normalizeRosterZones(
      buildFounderRoster({
        founder: founderForStart,
        faction: guildSetup.faction,
      }),
      guildSetup.faction,
    );
    const starterGold = STARTING_GUILD_GOLD;
    const calendarStart = createInitialCalendarState(gameTimeRef.current);
    const starterSocialState = createInitialSocialState();
    const starterGuildRelationsState =
      createInitialGuildRelationsState(starterRoster);
    const starterGuildActivityStats = createInitialGuildActivityStats(0);

    rewardedMissionIdsRef.current = new Set();
    autoDungeonStateRef.current = { nextAttemptAt: 0 };
    rosterRef.current = starterRoster;
    missionsRef.current = [];
    goldRef.current = starterGold;
    guildRelationshipsRef.current = {};
    calendarStateRef.current = calendarStart;
    raidLockoutsRef.current = {};
    socialStateRef.current = starterSocialState;
    guildRelationsStateRef.current = starterGuildRelationsState;
    guildActivityStatsRef.current = starterGuildActivityStats;
    const starterRealmState = ensureRealmState(null, guildSetup, 0);
    realmStateRef.current = starterRealmState;
    setRoster(starterRoster);
    setActiveMissions([]);
    setCalendarState(calendarStart);
    setRaidLockouts({});
    setRealmState(starterRealmState);
    setSocialState(starterSocialState);
    setGuildRelationsState(starterGuildRelationsState);
    setGuildActivityStats(starterGuildActivityStats);
    setMissionList(
      getMissionListWithZones(INITIAL_MISSIONS.map(cloneMissionTemplate)),
    );
    setGuildLog([]);
    setGuildGold(starterGold);
    setGuildRelationships({});
    setGuildSetup((prev) => ({
      ...prev,
      name: normalizedName,
      founder: founderForStart,
      hasStarted: true,
    }));
    navigate(ROUTES.DASHBOARD);
    pushNotification({
      type: "info",
      title: "Guild Founded",
      message: `${normalizedName} enters Azeroth with ${STARTING_GUILD_MEMBERS} heroes and ${starterGold}g.`,
    });
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
      const deployDayIndex = getCalendarDayIndex(
        gameTimeRef.current,
        calendarStateRef.current.calendarEpochGameTimeMs,
      );
      const deployDayProgress = getCalendarDayProgress(
        gameTimeRef.current,
        calendarStateRef.current.calendarEpochGameTimeMs,
      );
      const deployOnlineSnapshot = buildOnlineSnapshot({
        characters: rosterRef.current,
        dayIndex: deployDayIndex,
        dayProgress: deployDayProgress,
        activeMissions: missionsRef.current,
        activeBattles: battlefieldStateRef.current?.activeBattles,
        searches: socialStateRef.current?.searches,
        calendarEvents: calendarStateRef.current?.calendarEvents,
        offlineSimulationEnabled:
          gameSettingsRef.current.offlineSimulationEnabled,
      });
      const offlineMembers = memberIds.filter(
        (memberId) =>
          !deployOnlineSnapshot.onlineIds.has(String(memberId)),
      );
      if (offlineMembers.length > 0) {
        const firstStatus =
          deployOnlineSnapshot.byId[String(offlineMembers[0])];
        pushNotification({
          type: "error",
          title: "Hero Offline",
          message: `Selected heroes must be online. Next login: Day ${
            (firstStatus?.nextLoginDayIndex ?? deployDayIndex) + 1
          }, ${String(Math.floor(firstStatus?.nextLoginHour ?? 0)).padStart(2, "0")}:00.`,
        });
        return false;
      }
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
      if (!mission) return false;
      const hasDuplicateEvent = hasDuplicateCalendarEvent({
        events: calendarStateRef.current.calendarEvents,
        missionId: mission.id,
        missionIds,
        scheduledDayIndex,
        scheduledTimeOfDay,
      });
      if (hasDuplicateEvent) {
        pushNotification({
          type: "error",
          title: "Event Already Scheduled",
          message: "This raid is already scheduled for that date and time.",
        });
        return false;
      }
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
      return event;
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
      if (!mission) return false;
      const hasDuplicateSeries = hasDuplicateCalendarSeries({
        series: calendarStateRef.current.calendarSeries,
        missionId: mission.id,
        missionIds,
        seriesType,
        scheduledTimeOfDay,
        startsOnDayIndex,
        weekday,
        intervalDays,
      });
      if (hasDuplicateSeries) {
        pushNotification({
          type: "error",
          title: "Series Already Scheduled",
          message: "This recurring raid schedule already exists.",
        });
        return false;
      }
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
      return series;
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
      m.type === "dungeon"
        ? advanceDungeonMission(m, now, true, services.random)
        : null;
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
    let nextSocialState = completeMissionSocialActivity({
      socialState: socialStateRef.current,
      mission: missionWithStepLoot,
      succeeded: result.missionSucceeded,
      now,
      roster: rosterAfterMission,
      relationships: guildRelationshipsRef.current,
      dayIndex: getCurrentCalendarDayIndex(),
      deferText:
        chatAiSettingsRef.current.provider !== "templates" && gameSpeed <= 4,
    });
    const createdIncident = createGuildIncident({
      state: guildRelationsStateRef.current,
      roster: rosterAfterMission,
      relationships: guildRelationshipsRef.current,
      dayIndex: getCurrentCalendarDayIndex(),
      missionSucceeded: result.missionSucceeded,
      missionMemberIds: missionWithStepLoot.memberIds,
    });
    guildRelationsStateRef.current = createdIncident.state;
    let sceneIncident = createdIncident.incident;
    if (
      sceneIncident &&
      createdIncident.state.managementMode === "automatic"
    ) {
      const resolved = resolveGuildIncident({
        state: createdIncident.state,
        roster: rosterAfterMission,
        relationships: guildRelationshipsRef.current,
        incidentId: sceneIncident.id,
        resolvedBy: "guild_master",
      });
      guildRelationsStateRef.current = resolved.state;
      rosterRef.current = resolved.roster;
      setRoster(resolved.roster);
      guildRelationshipsRef.current = resolved.relationships;
      setGuildRelationships(resolved.relationships);
      sceneIncident = resolved.incident || sceneIncident;
    }
    if (sceneIncident) {
      const participants = buildMissionSocialParticipants(
        missionWithStepLoot,
        rosterRef.current,
        guildSetupRef.current.faction,
      );
      const guildMasterId = Object.entries(
        guildRelationsStateRef.current.assignments,
      ).find(([, rank]) => rank === GUILD_RANK.GUILD_MASTER)?.[0];
      const guildMaster = rosterRef.current.find(
        (member) => String(member.id) === String(guildMasterId || ""),
      );
      nextSocialState = attachGuildIncidentToScene({
        state: nextSocialState,
        incident: sceneIncident,
        participants,
        guildMaster: guildMaster
          ? toParticipant(
              {
                ...guildMaster,
                faction:
                  guildMaster.faction || guildSetupRef.current.faction,
              },
              "guild",
            )
          : null,
        now,
      });
    }
    socialStateRef.current = nextSocialState;
    setSocialState(nextSocialState);
    setGuildRelationsState(guildRelationsStateRef.current);
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
      const result = craftInventoryRecipe({
        characterId,
        recipeId,
        roster: rosterRef.current,
        guildInventory: guildInventoryRef.current,
        stashPolicy: stashPolicyRef.current,
        guildGold: goldRef.current,
      });
      if (!result.crafted) {
        pushNotification({
          type: "error",
          title: "Crafting Blocked",
          message: result.reason || "This recipe cannot be crafted.",
        });
        return false;
      }
      rosterRef.current = result.roster;
      guildInventoryRef.current = result.guildInventory;
      goldRef.current = result.guildGold;
      setRoster(result.roster);
      setGuildInventory(result.guildInventory);
      setGuildGold(result.guildGold);
      appendProfessionLogs(result.logs);
      pushNotification({
        type: "info",
        title: "Crafting Complete",
        message: result.message,
      });
      return true;
    },
    [appendProfessionLogs, pushNotification],
  );

  const handleSellStashItem = useCallback(
    (itemId, quantity = 1) => {
      const result = sellGuildStashItem({
        itemId, quantity, guildInventory: guildInventoryRef.current,
        guildGold: goldRef.current,
      });
      if (!result) return false;
      guildInventoryRef.current = result.guildInventory;
      goldRef.current = result.guildGold;
      setGuildInventory(result.guildInventory);
      setGuildGold(result.guildGold);
      appendProfessionLogs([result.log]);
      return true;
    },
    [appendProfessionLogs],
  );

  const handleTryAutoEquipFromGuildStash = useCallback(
    (itemId) => {
      const equipResult = autoEquipGuildStashItem({
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
    const cleanup = cleanGuildStash({
      guildInventory: guildInventoryRef.current,
      roster: rosterRef.current,
      stashPolicy: stashPolicyRef.current,
      guildGold: goldRef.current,
    });
    guildInventoryRef.current = cleanup.guildInventory;
    goldRef.current = cleanup.guildGold;
    setGuildInventory(cleanup.guildInventory);
    setGuildGold(cleanup.guildGold);
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

  const {
    saveSession: handleSaveSession,
    openSession: handleLoadButtonClick,
    loadSession: handleLoadSessionFile,
    persistBrowserSession,
    restoreBrowserSession,
  } = createSessionActions({
    state: {
      roster, activeMissions, missionList, guildLog, guildGold, guildProgress,
      guildSetup, guildRelationships, realmState, worldPvpState, battlefieldState,
      guildInventory, stashPolicy, calendarState, raidLockouts, missionBoardState,
      socialState, gameSpeed, isPaused,
      guildRelationsState,
      guildActivityStats,
      gameSettings,
      gameTimeMs,
    },
    refs: {
      rewardedMissionIds: rewardedMissionIdsRef, roster: rosterRef,
      missions: missionsRef, gold: goldRef, guildProgress: guildProgressRef,
      guildSetup: guildSetupRef, guildRelationships: guildRelationshipsRef,
      realmState: realmStateRef, worldPvpState: worldPvpStateRef,
      battlefieldState: battlefieldStateRef, guildInventory: guildInventoryRef,
      stashPolicy: stashPolicyRef, calendarState: calendarStateRef,
      raidLockouts: raidLockoutsRef, gameTime: gameTimeRef,
      socialState: socialStateRef,
      guildRelationsState: guildRelationsStateRef,
      guildActivityStats: guildActivityStatsRef,
      gameSettings: gameSettingsRef,
      lastRealTime: lastRealTimeRef, sessionFileInput: sessionFileInputRef,
    },
    setters: {
      setRoster, setActiveMissions, setMissionList, setGuildLog, setGuildGold,
      setGuildProgress, setGuildSetup, setGuildRelationships, setRealmState,
      setWorldPvpState, setBattlefieldState, setGuildInventory, setStashPolicy,
      setMissionBoardState, setCalendarState, setRaidLockouts, setIsPaused,
      setSocialState, setGameSpeed, setGameTimeMs, setDetailCharId,
      setGuildRelationsState,
      setGuildActivityStats,
      setGameSettings,
    },
    closeOverlays: () => {
      setShowRecruit(false);
      setShowLootTable(false);
      setShowGuildLog(false);
      setShowOptions(false);
      setShowProfessions(false);
      navigate(ROUTES.DASHBOARD);
    },
    normalizeRosterZones,
    createId: services.createId,
    pushNotification,
  });

  persistBrowserSessionRef.current = persistBrowserSession;

  const runBrowserAutosave = useCallback(() => {
    if (
      !browserSessionReadyRef.current ||
      !guildSetupRef.current?.hasStarted
    ) {
      return false;
    }

    try {
      const saved = persistBrowserSessionRef.current();
      if (saved) browserAutosaveWarningShownRef.current = false;
      return saved;
    } catch (error) {
      console.error("Failed to update browser autosave:", error);
      if (!browserAutosaveWarningShownRef.current) {
        browserAutosaveWarningShownRef.current = true;
        pushNotification({
          type: "warning",
          title: "Browser Autosave Failed",
          message: "This browser could not update its local autosave.",
          durationMs: 6500,
        });
      }
      return false;
    }
  }, [pushNotification]);

  useEffect(() => {
    if (browserSessionReadyRef.current) return;

    try {
      const restored = restoreBrowserSession();
      if (restored) {
        pushNotification({
          type: "success",
          title: "Autosave Restored",
          message: "Your browser session was restored automatically.",
        });
      }
    } catch (error) {
      console.error("Failed to restore browser autosave:", error);
      try {
        clearBrowserSession();
      } catch (clearError) {
        console.error("Failed to clear invalid browser autosave:", clearError);
      }
      pushNotification({
        type: "warning",
        title: "Autosave Could Not Be Restored",
        message: "Start a new guild or load a session file.",
        durationMs: 6500,
      });
    } finally {
      browserSessionReadyRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!guildSetup.hasStarted) return;
    runBrowserAutosave();
  }, [currentCalendarDayIndex, guildSetup.hasStarted, runBrowserAutosave]);

  useEffect(() => {
    const saveBeforeLeaving = () => {
      runBrowserAutosave();
    };
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") runBrowserAutosave();
    };
    const intervalId = window.setInterval(
      runBrowserAutosave,
      BROWSER_AUTOSAVE_INTERVAL_MS,
    );

    window.addEventListener("pagehide", saveBeforeLeaving);
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("pagehide", saveBeforeLeaving);
      document.removeEventListener("visibilitychange", saveWhenHidden);
    };
  }, [runBrowserAutosave]);

  const guildActivityModeSummary = getGuildActivityModeSummary(roster);
  const dungeonActivityInfoText = getDungeonActivityInfoText(
    guildSetup.dungeonActivity,
    GUILD_DUNGEON_ACTIVITY,
  );
  const memberLevelBounds = getMemberLevelBounds(
    guildMemberMinLevelFilter,
    guildMemberMaxLevelFilter,
  );
  const hasAnyGuildMemberLevelFilter = memberLevelBounds.hasAnyFilter;
  const normalizedGuildMemberSearch =
    normalizeGuildMemberSearch(guildMemberSearch);
  const hasGuildMemberSearch = normalizedGuildMemberSearch.length > 0;
  const rankedRoster = useMemo(() => rankGuildRoster({
    roster,
    levelBounds: memberLevelBounds,
    sortMode: guildMemberSortMode,
    sortModes: GUILD_MEMBER_SORT,
    normalizedSearch: normalizedGuildMemberSearch,
    getItemLevel: getCharacterAverageItemLevel,
    getSearchScore: getGuildMemberSearchScore,
  }), [
    guildMemberSortMode,
    memberLevelBounds.hasAnyFilter,
    memberLevelBounds.max,
    memberLevelBounds.min,
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
    () => buildMissionAchievementCatalog(missionList),
    [missionList],
  );
  const openRecruitSlots = Math.max(0, guildDerivedStats.maxRoster - roster.length);
  const openRealmApplicationCount = realmApplicationCandidates.length;
  const unreadChatCount = getUnreadChatCount(socialState);
  const handleChatAiSettingsChange = useCallback((nextSettings) => {
    const savedSettings = saveChatAiSettings(nextSettings);
    chatAiSettingsRef.current = savedSettings;
    setChatAiSettings(savedSettings);
    return savedSettings;
  }, []);
  const handleGameSettingsChange = useCallback((nextSettings) => {
    const normalized = normalizeGameSettings({
      ...gameSettingsRef.current,
      ...(nextSettings && typeof nextSettings === "object"
        ? nextSettings
        : {}),
    });
    gameSettingsRef.current = normalized;
    setGameSettings(normalized);
    if (!normalized.offlineSimulationEnabled) {
      setRoster(clearPersistedOfflineStatuses);
    }
    return normalized;
  }, []);
  const handleTestChatProvider = useCallback(
    (settings = chatAiSettingsRef.current) =>
      testChatProviderConnection({ settings }),
    [],
  );
  const handleMarkChatRead = useCallback((channel) => {
    const nextSocialState = markChatChannelRead(
      socialStateRef.current,
      channel,
    );
    socialStateRef.current = nextSocialState;
    setSocialState(nextSocialState);
  }, []);
  const guildRelationInsights = useMemo(
    () =>
      buildGuildRelationInsights({
        roster,
        relationships: guildRelationships,
        relationsState: guildRelationsState,
        currentDayIndex: currentCalendarDayIndex,
      }),
    [
      currentCalendarDayIndex,
      guildRelationships,
      guildRelationsState,
      roster,
    ],
  );
  const handleSetGuildRank = useCallback((memberId, rank) => {
    const nextState = assignGuildRank({
      state: guildRelationsStateRef.current,
      roster: rosterRef.current,
      memberId: String(memberId),
      rank,
    });
    guildRelationsStateRef.current = nextState;
    setGuildRelationsState(nextState);
  }, []);
  const handleSetGuildRankLabels = useCallback((labels) => {
    const error = validateGuildRankLabels(labels);
    if (error) {
      pushNotification({
        type: "error",
        title: "Invalid Rank Names",
        message: error,
      });
      return false;
    }
    const nextState = {
      ...guildRelationsStateRef.current,
      rankLabels: { ...labels },
    };
    guildRelationsStateRef.current = nextState;
    setGuildRelationsState(nextState);
    return true;
  }, []);
  const handleSetRelationsManagementMode = useCallback((managementMode) => {
    let nextState = {
      ...normalizeGuildRelationsState(
        guildRelationsStateRef.current,
        rosterRef.current,
      ),
      managementMode: managementMode === "manual" ? "manual" : "automatic",
    };
    let nextRoster = rosterRef.current;
    let nextRelationships = guildRelationshipsRef.current;
    if (nextState.managementMode === "automatic") {
      nextState.incidents
        .filter((incident) => incident.status === "pending")
        .forEach((incident) => {
          const result = resolveGuildIncident({
            state: nextState,
            roster: nextRoster,
            relationships: nextRelationships,
            incidentId: incident.id,
            resolvedBy: "guild_master",
          });
          nextState = result.state;
          nextRoster = result.roster;
          nextRelationships = result.relationships;
          if (result.incident) {
            const guildMasterId = Object.entries(result.state.assignments).find(
              ([, rank]) => rank === GUILD_RANK.GUILD_MASTER,
            )?.[0];
            const guildMaster = result.roster.find(
              (member) => String(member.id) === String(guildMasterId || ""),
            );
            const nextSocialState = resolveGuildIncidentRpScene({
              state: ensureSocialState(socialStateRef.current),
              incident: result.incident,
              guildMaster: guildMaster
                ? toParticipant(
                    {
                      ...guildMaster,
                      faction:
                        guildMaster.faction || guildSetupRef.current.faction,
                    },
                    "guild",
                  )
                : null,
              now: gameTimeRef.current,
            });
            socialStateRef.current = nextSocialState;
            setSocialState(nextSocialState);
          }
        });
    }
    guildRelationsStateRef.current = nextState;
    rosterRef.current = nextRoster;
    guildRelationshipsRef.current = nextRelationships;
    setGuildRelationsState(nextState);
    setRoster(nextRoster);
    setGuildRelationships(nextRelationships);
  }, []);
  const handleResolveGuildIncident = useCallback((incidentId, choiceId) => {
    const result = resolveGuildIncident({
      state: guildRelationsStateRef.current,
      roster: rosterRef.current,
      relationships: guildRelationshipsRef.current,
      incidentId,
      choiceId,
      resolvedBy: "player",
    });
    guildRelationsStateRef.current = result.state;
    rosterRef.current = result.roster;
    guildRelationshipsRef.current = result.relationships;
    setGuildRelationsState(result.state);
    setRoster(result.roster);
    setGuildRelationships(result.relationships);
    if (result.incident) {
      const guildMasterId = Object.entries(result.state.assignments).find(
        ([, rank]) => rank === GUILD_RANK.GUILD_MASTER,
      )?.[0];
      const guildMaster = result.roster.find(
        (member) => String(member.id) === String(guildMasterId || ""),
      );
      const nextSocialState = resolveGuildIncidentRpScene({
        state: ensureSocialState(socialStateRef.current),
        incident: result.incident,
        guildMaster: guildMaster
          ? toParticipant(
              {
                ...guildMaster,
                faction:
                  guildMaster.faction || guildSetupRef.current.faction,
              },
              "guild",
            )
          : null,
        now: gameTimeRef.current,
      });
      socialStateRef.current = nextSocialState;
      setSocialState(nextSocialState);
      setGuildLog((current) =>
        [
          {
            time: new Date().toLocaleTimeString(),
            type: "relations",
            message: `${result.incident.title} was resolved by guild management.`,
          },
          ...current,
        ].slice(0, 50),
      );
    }
  }, []);
  const handleCastGuildElectionVote = useCallback((candidateId) => {
    const result = castGuildElectionVote({
      state: guildRelationsStateRef.current,
      roster: rosterRef.current,
      candidateId: String(candidateId),
      insights: buildGuildRelationInsights({
        roster: rosterRef.current,
        relationships: guildRelationshipsRef.current,
        relationsState: guildRelationsStateRef.current,
        currentDayIndex: getCurrentCalendarDayIndex(),
      }),
    });
    guildRelationsStateRef.current = result.state;
    rosterRef.current = result.roster;
    setGuildRelationsState(result.state);
    setRoster(result.roster);
  }, []);
  const handleFinishGuildElection = useCallback(() => {
    const currentState = guildRelationsStateRef.current;
    const election = currentState?.election;
    if (!election || election.status !== "complete" || !election.winnerId) {
      return;
    }
    const winner = rosterRef.current.find(
      (member) => String(member.id) === election.winnerId,
    );
    const nextState = { ...currentState, election: null };
    guildRelationsStateRef.current = nextState;
    setGuildRelationsState(nextState);
    if (winner) {
      const message = `${winner.name} won the guild election and is now Guild Master.`;
      setGuildLog((current) =>
        [
          {
            time: new Date().toLocaleTimeString(),
            type: "relations",
            message,
          },
          ...current,
        ].slice(0, 50),
      );
      const nextSocialState = appendGuildElectionMessage({
        socialState: socialStateRef.current,
        winner,
        guildName: guildSetupRef.current?.name,
        now: gameTimeRef.current,
      });
      socialStateRef.current = nextSocialState;
      setSocialState(nextSocialState);
      pushNotification({
        type: "success",
        title: "Guild Master Elected",
        message,
      });
    }
    setGameSpeed(election.previousGameSpeed || DEFAULT_GAME_SPEED);
    setIsPaused(false);
  }, []);

  const actionsRef = useRef({});
  Object.assign(actionsRef.current, {
    dismissNotification,
    changeGuildSetup: handleGuildSetupChange,
    loadSession: handleLoadButtonClick,
    loadSessionFile: handleLoadSessionFile,
    startGuild: handleStartGuild,
    setGuildRank: handleSetGuildRank,
    setGuildRankLabels: handleSetGuildRankLabels,
    setRelationsManagementMode: handleSetRelationsManagementMode,
    resolveGuildIncident: handleResolveGuildIncident,
    castGuildElectionVote: handleCastGuildElectionVote,
    finishGuildElection: handleFinishGuildElection,
    updateGameSettings: handleGameSettingsChange,
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
    gameSettings,
    effectiveGameSpeed,
    isAutoFastForward,
    gameTimeMs,
    getAdjustedMissionSuccessPreview,
    getMissionInstanceId,
    guildInventory,
    guildActivityModeSummary,
    guildActivityStats,
    guildOnlineSnapshot,
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
    guildRelationsState,
    guildRelationInsights,
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
    socialState,
    chatAiSettings,
    handleChatAiSettingsChange,
    handleGameSettingsChange,
    handleTestChatProvider,
    unreadChatCount,
    handleMarkChatRead,
    roster,
    sessionFileInputRef,
    showGuildLog,
    showLootTable,
    showOptions,
    showProfessions,
    showRecruit,
    SHOW_LEGACY_QUESTS,
    stashPolicy,
    setAllDashboardSectionsOpen,
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

  return contextStoreRef.current;
};
