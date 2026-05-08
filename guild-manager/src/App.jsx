import React, {
  lazy,
  Suspense,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
  MEMBER_RANKING_MODES,
  GUILD_MEMBER_SORT,
  GUILD_MEMBER_SORT_OPTIONS,
  GUILD_FOCUS,
  GUILD_FOCUS_OPTIONS,
  DEFAULT_GUILD_SETUP,
  GUILD_STARTING_CONFIG,
  RECRUITMENT_CONFIG,
  WORLD_DROP_CONFIG,
  DEFAULT_DUNGEON_LOOT_TABLE,
  FACTION_EMBLEM_ICON,
} from "./constants";
import {
  getReqExp,
  generateCharacters,
  getSkillCap,
  getAutoSkillTarget,
  getNextTierLevel,
  getItemEffectiveLevel,
  getCharacterAverageItemLevel,
  getMissionSuccessPreview,
  getMissionVeteranCoverage,
  createId,
  getClassArmorTypes,
  isItemUsableByClass,
  getKeyLabel,
  getWowIconUrl,
} from "./utils";
import CharacterCard from "./components/CharacterCard";
import CharacterEquipCheckCard from "./components/CharacterEquipCheckCard";
import ToastNotifications from "./components/ToastNotifications";
import GuildSetupScreen from "./components/GuildSetupScreen";
import {
  GUILD_POINT_LABEL,
  createInitialGuildProgress,
  normalizeGuildProgress,
  getGuildDerivedStats,
  applyLevelMilestones,
  applyDungeonClearMilestones,
  applyDungeonWipeMilestone,
  upgradeGuildTalent,
} from "./guildProgression";
import {
  DEFAULT_GAME_SPEED,
  clampGameSpeed,
  getNextGameSpeed,
  formatGameSpeedLabel,
  normalizeProgressionState,
  advanceGameTime,
} from "./progression";
import {
  loadSessionFile,
  openSessionFilePicker,
  saveSessionFile,
} from "./session/sessionFileActions";
import { applyLoadedSessionToApp } from "./session/applyLoadedSession";
import {
  evaluateMissionKeyAccess,
  getDungeonBossCount,
  getDungeonBossNames,
  getDungeonQuarterExpMultiplier,
  getDungeonOverlevelExpMultiplier,
  getMissionLevelExpMultiplier,
  getMissionGoldReward,
  getMissionWipeCost,
  getMissionLootLevelRange,
  resolveMissionRewardQualities,
} from "./missions/missionHelpers";
import { createMissionRewardProcessor } from "./missions/missionRewards";
import {
  ZONE_PROGRESS_CHECKPOINTS,
  getZoneById,
  getZoneExpMultiplier,
  getZoneProgressPerTick,
  getZoneCheckpointGoldReward,
  getZoneCheckpointLootQualities,
  isZoneMission,
  isZoneAccessibleForFaction,
} from "./zones/zoneDefinitions";
import {
  assignZoneToRoster as assignZoneToRosterMembers,
  getClampedZoneProgress,
  getMissionListWithZones,
  getZoneProgressLabel,
  normalizeCharacterZoneState,
  normalizeRosterZones as normalizeRosterZonesForFaction,
  resolveZoneAutoTransition,
} from "./zones/zoneLogic";
import {
  getRecruitmentCapacity,
  resolveRecruitmentResult,
} from "./recruitment/recruitmentLogic";
import {
  advanceDungeonMission,
  getDefaultDungeonProgress,
} from "./game/dungeonEngine";
import { advanceActiveMissionsForTick } from "./game/gameTickEngine";
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
} from "./calendar/calendarLogic";
import {
  getRaidLockoutStatus,
  getRaidResumeProgress,
  normalizeRaidLockouts,
  startRaidLockout,
  updateRaidLockoutProgress,
} from "./raids/raidLockouts";

const RecruitModal = lazy(() => import("./components/modals/RecruitModal"));
const DetailModal = lazy(() => import("./components/modals/DetailModal"));
const LootTableModal = lazy(() => import("./components/modals/LootTableModal"));
const GuildLogModal = lazy(() => import("./components/modals/GuildLogModal"));
const DebugModal = lazy(() => import("./components/modals/DebugModal"));
const WorldMapModal = lazy(() => import("./components/modals/WorldMapModal"));
const GuildTalentsModal = lazy(
  () => import("./components/modals/GuildTalentsModal"),
);
const MissionModal = lazy(() => import("./components/modals/MissionModal"));
const OptionsModal = lazy(() => import("./components/modals/OptionsModal"));
const CalendarModal = lazy(() => import("./components/modals/CalendarModal"));

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
  LEVELING_TICK_EXP_MULTIPLIER,
  ENABLE_ZONE_QUESTING,
  SHOW_LEGACY_QUESTS,
} = GAMEPLAY_TUNING;
const {
  MEMBER_COUNT: STARTING_GUILD_MEMBERS,
  ROLE_PLAN: STARTING_GUILD_ROLE_PLAN,
  GOLD: STARTING_GUILD_GOLD,
} = GUILD_STARTING_CONFIG;
const {
  SCOUT_COST_GOLD: RECRUIT_SCOUT_COST_GOLD,
  RECRUIT_COST_GOLD,
} = RECRUITMENT_CONFIG;
const {
  COMMON_DROP_CHANCE: WORLD_TICK_COMMON_DROP_CHANCE,
  UNCOMMON_DROP_CHANCE: WORLD_TICK_UNCOMMON_DROP_CHANCE,
  EPIC_DROP_CHANCE: WORLD_TICK_EPIC_DROP_CHANCE,
  EPIC_MIN_LEVEL: WORLD_TICK_EPIC_MIN_LEVEL,
} = WORLD_DROP_CONFIG;
const normalizeGuildMemberSearch = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getGuildMemberSearchScore = (member, searchTerm) => {
  const query = normalizeGuildMemberSearch(searchTerm);
  const name = normalizeGuildMemberSearch(member?.name);
  if (!query || !name) return 0;
  if (name === query) return 1000;
  if (name.startsWith(query))
    return 850 - Math.max(0, name.length - query.length);

  const includesAt = name.indexOf(query);
  if (includesAt >= 0) return 700 - includesAt * 10;

  let queryIndex = 0;
  let gaps = 0;
  for (
    let nameIndex = 0;
    nameIndex < name.length && queryIndex < query.length;
    nameIndex += 1
  ) {
    if (name[nameIndex] === query[queryIndex]) {
      queryIndex += 1;
    } else if (queryIndex > 0) {
      gaps += 1;
    }
  }

  if (queryIndex === query.length) {
    return 400 - gaps * 5 - Math.max(0, name.length - query.length);
  }

  const queryLetters = new Set(query);
  const sharedLetters = [...new Set(name)].filter((letter) =>
    queryLetters.has(letter),
  ).length;
  return sharedLetters > 0 ? sharedLetters * 20 : 0;
};
const getLevelingTargetSecondsPerLevel = (level) => {
  const safeLevel = Math.max(1, Number(level) || 1);
  if (safeLevel <= 5) return 10;
  if (safeLevel <= 12) return 20;
  if (safeLevel <= 18) return 40;
  if (safeLevel <= 22) return 60;
  if (safeLevel <= 30) return 90;
  if (safeLevel <= 40) return 120;
  if (safeLevel <= 49) return 150;
  if (safeLevel <= 55) return 200;
  return 300;
};

const getLevelingTickExpGain = (level, totalExpMultiplier = 1) => {
  const safeLevel = Math.max(1, Number(level) || 1);
  const reqExp = getReqExp(safeLevel);
  const targetSeconds = getLevelingTargetSecondsPerLevel(safeLevel);
  const baseExpPerTick = reqExp / targetSeconds;
  return Math.max(
    1,
    Math.floor(
      baseExpPerTick * LEVELING_TICK_EXP_MULTIPLIER * totalExpMultiplier,
    ),
  );
};

const getFactionDefaultGuildName = (faction) =>
  faction === GUILD_FACTION.HORDE ? "Horde Vanguard" : "Alliance Vanguard";

const getFactionFallbackManagerName = (faction) =>
  faction === GUILD_FACTION.HORDE ? "Horde Manager" : "Alliance Manager";

const getServerOptionByValue = (serverValue) =>
  GUILD_SERVER_OPTIONS.find((option) => option.value === serverValue) ||
  GUILD_SERVER_OPTIONS[0];

const getGuildServerStyle = (serverValue) =>
  getServerOptionByValue(serverValue)?.style || DEFAULT_GUILD_SETUP.serverStyle;

const getGuildServerLabel = (serverValue, serverStyle) => {
  const option = getServerOptionByValue(serverValue);
  const resolvedStyle =
    serverStyle || option?.style || DEFAULT_GUILD_SETUP.serverStyle;
  const resolvedServer =
    serverValue || option?.value || DEFAULT_GUILD_SETUP.server;
  return `${resolvedServer} (${resolvedStyle})`;
};

const parseDungeonStepLootConfig = (entry) => {
  if (Array.isArray(entry)) {
    return { weights: entry };
  }
  if (!entry || typeof entry !== "object") {
    return {};
  }
  return {
    weights: Array.isArray(entry.weights) ? entry.weights : [],
    source: typeof entry.source === "string" ? entry.source : undefined,
    includeWorldDrops:
      typeof entry.includeWorldDrops === "boolean"
        ? entry.includeWorldDrops
        : undefined,
    dungeonOnly:
      typeof entry.dungeonOnly === "boolean" ? entry.dungeonOnly : undefined,
    worldOnly:
      typeof entry.worldOnly === "boolean" ? entry.worldOnly : undefined,
  };
};

const resolveDungeonDropSource = (stepConfig, isEndboss) => {
  const defaultSource = isEndboss ? "dungeon" : "mixed";
  const source = String(stepConfig.source || defaultSource).toLowerCase();

  let sourceOptions;
  if (source === "dungeon") {
    sourceOptions = {
      includeWorldDrops: false,
      dungeonOnly: true,
      worldOnly: false,
    };
  } else if (source === "world") {
    sourceOptions = {
      includeWorldDrops: true,
      dungeonOnly: false,
      worldOnly: true,
    };
  } else {
    sourceOptions = {
      includeWorldDrops: true,
      dungeonOnly: false,
      worldOnly: false,
    };
  }

  if (typeof stepConfig.includeWorldDrops === "boolean") {
    sourceOptions.includeWorldDrops = stepConfig.includeWorldDrops;
  }
  if (typeof stepConfig.dungeonOnly === "boolean") {
    sourceOptions.dungeonOnly = stepConfig.dungeonOnly;
  }
  if (typeof stepConfig.worldOnly === "boolean") {
    sourceOptions.worldOnly = stepConfig.worldOnly;
  }

  return sourceOptions;
};

const getDungeonStepLootConfig = (mission, stepIndex) => {
  const table =
    mission && typeof mission.dungeonLootTable === "object"
      ? mission.dungeonLootTable
      : {};
  const bossCount = getDungeonBossCount(mission);
  const isEndboss = stepIndex === bossCount - 1;

  const stepOverrides = Array.isArray(table.steps) ? table.steps : [];
  const explicitStepConfig = parseDungeonStepLootConfig(
    stepOverrides[stepIndex],
  );
  if (
    Array.isArray(explicitStepConfig.weights) &&
    explicitStepConfig.weights.length > 0
  ) {
    return {
      weights: explicitStepConfig.weights,
      ...resolveDungeonDropSource(explicitStepConfig, isEndboss),
    };
  }

  const phaseConfig = parseDungeonStepLootConfig(
    isEndboss ? table.endboss : table.boss,
  );
  if (Array.isArray(phaseConfig.weights) && phaseConfig.weights.length > 0) {
    return {
      weights: phaseConfig.weights,
      ...resolveDungeonDropSource(phaseConfig, isEndboss),
    };
  }

  return {
    weights: isEndboss
      ? DEFAULT_DUNGEON_LOOT_TABLE.endboss
      : DEFAULT_DUNGEON_LOOT_TABLE.boss,
    ...resolveDungeonDropSource({}, isEndboss),
  };
};

const normalizeLootWeights = (weights) =>
  (Array.isArray(weights) ? weights : [])
    .map((entry) => ({
      quality: Number(entry?.quality),
      chance: Number(entry?.chance),
    }))
    .filter(
      (entry) =>
        Number.isFinite(entry.quality) &&
        entry.quality > 0 &&
        Number.isFinite(entry.chance) &&
        entry.chance > 0,
    );

const rollQualityFromWeights = (weights, fallbackQuality = 2) => {
  const normalized = normalizeLootWeights(weights);
  if (normalized.length === 0) return fallbackQuality;

  const totalChance = normalized.reduce((sum, entry) => sum + entry.chance, 0);
  if (totalChance <= 0) return fallbackQuality;

  let roll = Math.random() * totalChance;
  for (const entry of normalized) {
    roll -= entry.chance;
    if (roll <= 0) return entry.quality;
  }

  return normalized[normalized.length - 1]?.quality || fallbackQuality;
};

const getDungeonStepQualityPriority = (mission, stepIndex) => {
  const stepConfig = getDungeonStepLootConfig(mission, stepIndex);
  const stepWeights = stepConfig.weights;
  const normalized = normalizeLootWeights(stepWeights);
  const rolledQuality = rollQualityFromWeights(stepWeights, 2);
  const fallbackOrder = [5, 4, 3, 2, 1];
  const configuredFallbacks = normalized
    .filter((entry) => entry.quality !== rolledQuality)
    .sort((a, b) => b.chance - a.chance)
    .map((entry) => entry.quality);
  return [
    ...new Set([rolledQuality, ...configuredFallbacks, ...fallbackOrder]),
  ];
};

// --- Loot Logic moved to /missions/missionRewards.js ---

const generateWorldLootForCharacter = ({
  char,
  quality,
  minLevel,
  maxLevel,
  itemDatabase,
}) => {
  const classInfo = DB_CLASSES[char.charClass];
  if (!classInfo) return null;

  const allowedTypes = getClassArmorTypes(char.charClass, char.level);
  const safeMinLevel = Math.max(1, Number(minLevel) || 1);
  const safeMaxLevel = Math.max(safeMinLevel, Number(maxLevel) || safeMinLevel);

  const possibleItems = (
    Array.isArray(itemDatabase) ? itemDatabase : []
  ).filter((item) => {
    if (
      (typeof item.dungeon === "string" && item.dungeon.trim()) ||
      (typeof item.dungeonSetId === "string" && item.dungeonSetId.trim())
    ) {
      return false;
    }
    if (item.quality !== quality) return false;
    if (item.minLevel < safeMinLevel || item.minLevel > safeMaxLevel)
      return false;
    if (!isItemUsableByClass(item, char.charClass)) return false;
    return item.type === "Generic" || allowedTypes.includes(item.type);
  });

  if (possibleItems.length === 0) return null;
  return possibleItems[Math.floor(Math.random() * possibleItems.length)];
};

const generateWorldTickLoot = (char, quality, itemDatabase) =>
  generateWorldLootForCharacter({
    char,
    quality,
    minLevel: Math.max(1, char.level - 6),
    maxLevel: char.level,
    itemDatabase,
  });

const generateZoneCheckpointLoot = (char, zone, quality, itemDatabase) => {
  if (!zone) return null;
  return generateWorldLootForCharacter({
    char,
    quality,
    minLevel: Math.max(1, Number(zone?.minLevel) || 1),
    maxLevel: Math.max(1, Number(zone?.maxLevel) || 1),
    itemDatabase,
  });
};

const applyLootRewardToCharacter = ({
  char,
  lootItem,
  logCollector,
  missionName,
  bossName = null,
  updateStatusText = false,
  logDiscarded = false,
}) => {
  if (!lootItem) return char;

  const currentItem = char.equipment?.[lootItem.slot];
  const currentItemLevel = getItemEffectiveLevel(currentItem);
  const newItemLevel = getItemEffectiveLevel(lootItem);
  const willEquip = !currentItem || newItemLevel > currentItemLevel;

  if (willEquip || logDiscarded) {
    logCollector.push({
      type: "loot",
      characterName: char.name,
      itemName: lootItem.name,
      itemQuality: lootItem.quality,
      missionName,
      bossName,
      equipped: willEquip,
    });
  }

  if (!willEquip) return char;
  const nextEquipment = { ...char.equipment, [lootItem.slot]: lootItem };
  return {
    ...char,
    equipment: nextEquipment,
    statusText: updateStatusText
      ? `Found [${lootItem.name}] while adventuring.`
      : char.statusText,
  };
};

const normalizeGuildSetup = (value, payloadData = {}) => {
  const safe = value && typeof value === "object" ? value : {};
  const hasLegacyGameData =
    (Array.isArray(payloadData?.roster) && payloadData.roster.length > 0) ||
    (Array.isArray(payloadData?.activeMissions) &&
      payloadData.activeMissions.length > 0) ||
    Number(payloadData?.guildGold) > 0;

  const normalizedName = String(safe.name || "").trim();
  const normalizedFaction = GUILD_FACTION_OPTIONS.includes(safe.faction)
    ? safe.faction
    : GUILD_FACTION.ALLIANCE;
  const normalizedFocus = GUILD_FOCUS_OPTIONS.includes(safe.focus)
    ? safe.focus
    : GUILD_FOCUS.LEVELING;
  const normalizedServer = GUILD_SERVER_OPTIONS.some(
    (option) => option.value === safe.server,
  )
    ? safe.server
    : DEFAULT_GUILD_SETUP.server;
  const normalizedServerStyle = getGuildServerStyle(normalizedServer);

  const hasStarted = Boolean(
    safe.hasStarted || normalizedName || hasLegacyGameData,
  );

  return {
    ...DEFAULT_GUILD_SETUP,
    name:
      normalizedName ||
      (hasStarted
        ? getFactionDefaultGuildName(normalizedFaction)
        : DEFAULT_GUILD_SETUP.name),
    faction: normalizedFaction,
    server: normalizedServer,
    serverStyle: normalizedServerStyle,
    focus: normalizedFocus,
    hasStarted,
  };
};

const getGuildFocusBonuses = (focus) => {
  if (focus === GUILD_FOCUS.LEVELING) {
    return {
      expMultiplier: 1.05,
      dungeonSuccessBonus: 0,
      fullPartyGoldMultiplier: 1,
    };
  }
  if (focus === GUILD_FOCUS.DUNGEONS) {
    return {
      expMultiplier: 1,
      dungeonSuccessBonus: 5,
      fullPartyGoldMultiplier: 1,
    };
  }
  if (focus === GUILD_FOCUS.SOCIAL) {
    return {
      expMultiplier: 1,
      dungeonSuccessBonus: 0,
      fullPartyGoldMultiplier: 1.05,
    };
  }
  return {
    expMultiplier: 1,
    dungeonSuccessBonus: 0,
    fullPartyGoldMultiplier: 1,
  };
};

const cloneMissionTemplate = (mission) => ({
  ...mission,
  rewardQualities: Array.isArray(mission.rewardQualities)
    ? [...mission.rewardQualities]
    : mission.rewardQualities,
  rewardKeys: Array.isArray(mission.rewardKeys)
    ? [...mission.rewardKeys]
    : mission.rewardKeys,
  dungeonBosses: Array.isArray(mission.dungeonBosses)
    ? [...mission.dungeonBosses]
    : mission.dungeonBosses,
  dungeonLootTable: mission.dungeonLootTable
    ? JSON.parse(JSON.stringify(mission.dungeonLootTable))
    : mission.dungeonLootTable,
  bonusDrops: Array.isArray(mission.bonusDrops)
    ? JSON.parse(JSON.stringify(mission.bonusDrops))
    : mission.bonusDrops,
  raidRoleRequirement:
    mission.raidRoleRequirement &&
    typeof mission.raidRoleRequirement === "object"
      ? { ...mission.raidRoleRequirement }
      : mission.raidRoleRequirement,
});

// --- Local Components ---

const ActiveMissionCard = ({ mission, onFinish, gameTimeMs }) => {
  const now = Number.isFinite(gameTimeMs) ? gameTimeMs : mission.startTime || 0;
  const timeLeft = Math.max(0, mission.finishTime - now);
  const progress = 100 - (timeLeft / mission.totalDuration) * 100;
  const successChance =
    typeof mission.successChance === "number" ? mission.successChance : 100;
  const dungeonProgress = mission.dungeonProgress;
  const stepResults = Array.isArray(dungeonProgress?.stepResults)
    ? dungeonProgress.stepResults
    : [];
  const activeStepIndex =
    typeof dungeonProgress?.currentStep === "number"
      ? dungeonProgress.currentStep
      : 0;
  const dungeonBossNames = getDungeonBossNames(mission);
  const dungeonBossCount = dungeonBossNames.length;
  const stepResultsByStep = stepResults.reduce((acc, result) => {
    const step = Number(result?.step);
    if (!Number.isFinite(step) || step <= 0) return acc;
    if (!acc.has(step)) acc.set(step, []);
    acc.get(step).push(result);
    return acc;
  }, new Map());
  const chainContext = mission.chainContext;
  const chainTotal = Number(chainContext?.totalMissions) || 0;
  const chainPosition = Number(chainContext?.currentPosition) || 0;
  const attemptsUsed = Math.max(
    0,
    Math.floor(Number(dungeonProgress?.attemptsUsed) || 0),
  );
  const maxAttempts = Math.max(
    0,
    Math.floor(Number(dungeonProgress?.maxAttempts) || 0),
  );
  const wipeCost = getMissionWipeCost(mission);
  return (
    <div className="wow-card p-3 rounded flex flex-col gap-2 shadow-lg relative overflow-hidden border border-gray-600 bg-gray-800">
      <div className="flex justify-between items-center z-10 relative">
        <span className="font-bold text-sm text-white flex items-center gap-1">
          {mission.isRaid ? "🔥" : mission.type === "dungeon" ? "🏰" : "📜"}{" "}
          {mission.name}
        </span>
        <span className="text-xs text-gray-400">
          {Math.ceil(timeLeft / 1000)}s
        </span>
      </div>
      <div className="text-[11px] text-amber-200/80">
        Success chance: {successChance}%
      </div>
      {chainContext && chainTotal > 1 && (
        <div className="text-[11px] text-indigo-200/80">
          Chain: {chainContext.setName || "Dungeon Set"} (
          {Math.max(1, chainPosition)}/{chainTotal})
        </div>
      )}
      {mission.type === "dungeon" && (
        <>
          <div className="text-[11px] text-gray-300">
            Cleared: {dungeonProgress?.clearedSteps || 0}/{dungeonBossCount}{" "}
            bosses
          </div>
          {maxAttempts > 0 && (
            <div className="text-[11px] text-amber-200/80">
              Attempts: {attemptsUsed}/{maxAttempts}
            </div>
          )}
          {wipeCost > 0 && (
            <div className="text-[11px] text-rose-200/90">
              Wipe Cost: {wipeCost}g / wipe
            </div>
          )}
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${
                mission.isRaid
                  ? Math.min(5, Math.max(1, dungeonBossCount))
                  : Math.max(1, dungeonBossCount)
              }, minmax(0, 1fr))`,
            }}
          >
            {dungeonBossNames.map((label, index) => {
              const stepAttemptResults = stepResultsByStep.get(index + 1) || [];
              const latestStepResult =
                stepAttemptResults[stepAttemptResults.length - 1];
              const hasResolved = stepAttemptResults.length > 0;
              const failedAttempts = stepAttemptResults.filter(
                (result) => result?.outcome === "failed",
              ).length;
              const failed =
                hasResolved && latestStepResult?.outcome === "failed";
              const cleared =
                hasResolved && latestStepResult?.outcome === "cleared";
              const isActive =
                !dungeonProgress?.finished &&
                !hasResolved &&
                index === activeStepIndex;
              const isRetryingAfterWipe =
                !dungeonProgress?.finished &&
                index === activeStepIndex &&
                failedAttempts > 0 &&
                !cleared;
              const className = cleared
                ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
                : isRetryingAfterWipe
                  ? "border-amber-700 bg-amber-950/40 text-amber-300"
                  : failed
                    ? "border-red-700 bg-red-950/40 text-red-300"
                    : isActive
                      ? "border-amber-700 bg-amber-950/40 text-amber-300"
                      : "border-gray-700 bg-gray-900/60 text-gray-500";
              const stepLabel =
                failedAttempts > 0 ? `${label} (${failedAttempts}w)` : label;
              return (
                <div
                  key={`${mission.instanceId || mission.id}-${label}`}
                  className={`rounded border px-1 py-1 text-[10px] text-center ${className}`}
                >
                  {stepLabel}
                </div>
              );
            })}
          </div>
        </>
      )}
      <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden z-10 relative">
        <div
          className="bg-blue-500 h-full transition-all duration-100 linear"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <button
        onClick={() => onFinish(mission)}
        className="mt-1 text-[10px] uppercase font-bold tracking-wider bg-green-900/50 hover:bg-green-700 text-green-100 px-3 py-2 rounded border border-green-800 transition-colors shadow-sm active:scale-95"
      >
        ⚡ Instant Finish
      </button>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const App = () => {
  const [guildSetup, setGuildSetup] = useState(() =>
    normalizeGuildSetup(DEFAULT_GUILD_SETUP),
  );
  const [roster, setRoster] = useState([]);
  const [activeMissions, setActiveMissions] = useState([]);
  const [missionList, setMissionList] = useState(() =>
    getMissionListWithZones(INITIAL_MISSIONS.map(cloneMissionTemplate)),
  );
  const [guildLog, setGuildLog] = useState([]);
  const [guildGold, setGuildGold] = useState(0);
  const [guildProgress, setGuildProgress] = useState(() =>
    createInitialGuildProgress(),
  );
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(DEFAULT_GAME_SPEED);
  const [gameTimeMs, setGameTimeMs] = useState(() => Date.now());
  const [calendarState, setCalendarState] = useState(() =>
    createInitialCalendarState(Date.now()),
  );
  const [raidLockouts, setRaidLockouts] = useState({});
  const [showRecruit, setShowRecruit] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showLootTable, setShowLootTable] = useState(false);
  const [showGuildLog, setShowGuildLog] = useState(false);
  const [showGuildTalents, setShowGuildTalents] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [detailCharId, setDetailCharId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [memberRankingMode, setMemberRankingMode] = useState(
    MEMBER_RANKING_MODES.STANDARD,
  );
  const [guildMemberSearch, setGuildMemberSearch] = useState("");
  const [guildMemberMinLevelFilter, setGuildMemberMinLevelFilter] =
    useState("");
  const [guildMemberMaxLevelFilter, setGuildMemberMaxLevelFilter] =
    useState("");
  const [guildMemberSortMode, setGuildMemberSortMode] = useState(
    GUILD_MEMBER_SORT.LEVEL_DESC,
  );
  const [itemDatabase, setItemDatabase] = useState([]);

  const rosterRef = useRef(roster);
  const missionsRef = useRef(activeMissions);
  const missionListRef = useRef(missionList);
  const calendarEventStartLocksRef = useRef(new Set());
  const startCalendarEventRef = useRef(() => false);
  const goldRef = useRef(guildGold);
  const guildProgressRef = useRef(guildProgress);
  const guildSetupRef = useRef(guildSetup);
  const gameTimeRef = useRef(gameTimeMs);
  const calendarStateRef = useRef(calendarState);
  const raidLockoutsRef = useRef(raidLockouts);
  const lastRealTimeRef = useRef(Date.now());
  const rewardedMissionIdsRef = useRef(new Set());
  const notificationTimersRef = useRef(new Map());
  const sessionFileInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    import("./data/items").then(({ DB_ITEMS: loadedItems }) => {
      if (isMounted) setItemDatabase(loadedItems);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const dismissNotification = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== notificationId),
    );
    const timerId = notificationTimersRef.current.get(notificationId);
    if (timerId) {
      window.clearTimeout(timerId);
      notificationTimersRef.current.delete(notificationId);
    }
  }, []);

  const pushNotification = useCallback(
    (payload, fallbackType = "info", fallbackDurationMs = 4200) => {
      const normalized =
        typeof payload === "string"
          ? {
              message: payload,
              type: fallbackType,
              durationMs: fallbackDurationMs,
            }
          : {
              message: payload?.message || "",
              title: payload?.title || "",
              type: payload?.type || fallbackType,
              durationMs: payload?.durationMs ?? fallbackDurationMs,
            };
      if (!normalized.message) return;

      const notificationId = createId();
      setNotifications((prev) =>
        [
          ...prev,
          {
            id: notificationId,
            message: normalized.message,
            title: normalized.title,
            type: normalized.type,
          },
        ].slice(-4),
      );
      const timerId = window.setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((notification) => notification.id !== notificationId),
        );
        notificationTimersRef.current.delete(notificationId);
      }, normalized.durationMs);
      notificationTimersRef.current.set(notificationId, timerId);
    },
    [],
  );

  useEffect(() => {
    rosterRef.current = roster;
  }, [roster]);
  useEffect(() => {
    missionsRef.current = activeMissions;
  }, [activeMissions]);
  useEffect(() => {
    missionListRef.current = missionList;
  }, [missionList]);
  useEffect(() => {
    goldRef.current = guildGold;
  }, [guildGold]);
  useEffect(() => {
    guildProgressRef.current = guildProgress;
  }, [guildProgress]);
  useEffect(() => {
    guildSetupRef.current = guildSetup;
  }, [guildSetup]);
  useEffect(() => {
    gameTimeRef.current = gameTimeMs;
  }, [gameTimeMs]);
  useEffect(() => {
    calendarStateRef.current = calendarState;
  }, [calendarState]);
  useEffect(() => {
    raidLockoutsRef.current = raidLockouts;
  }, [raidLockouts]);
  useEffect(() => {
    lastRealTimeRef.current = Date.now();
  }, [isPaused, gameSpeed]);
  useEffect(
    () => () => {
      notificationTimersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      notificationTimersRef.current.clear();
    },
    [],
  );

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
      let unlockedMilestones = [];
      setGuildProgress((prev) => {
        const result = applyDungeonClearMilestones(prev, missionContext);
        unlockedMilestones = result.unlocked;
        return result.guildProgress;
      });

      unlockedMilestones.forEach((milestone) => {
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
      let unlockedMilestone = null;
      setGuildProgress((prev) => {
        const result = applyDungeonWipeMilestone(prev);
        unlockedMilestone = result.unlocked;
        return result.guildProgress;
      });

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
      let upgradeSummary = null;
      let blockedSummary = null;
      const availableGold = Math.max(0, Number(goldRef.current) || 0);
      setGuildProgress((prev) => {
        const result = upgradeGuildTalent(prev, talentKey, {
          guildGold: availableGold,
        });
        if (result.upgraded && result.talent) {
          upgradeSummary = {
            title: result.talent.title,
            suffix: result.talent.suffix,
            spentCost: result.spentCost,
            spentGold: result.spentGold,
            nextValue: result.nextValue,
          };
        } else if (result.talent) {
          blockedSummary = {
            title: result.talent.title,
            blockedByPrerequisite: Boolean(result.blockedByPrerequisite),
            blockers: Array.isArray(result.blockers) ? result.blockers : [],
            missingCost: Number(result.missingCost) || 0,
            missingGold: Number(result.missingGold) || 0,
          };
        }
        return result.guildProgress;
      });

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
    let newlyUnlocked = [];
    setGuildProgress((prev) => {
      const result = applyLevelMilestones(prev, roster);
      newlyUnlocked = result.unlocked;
      return result.guildProgress;
    });

    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(({ level, reward }) => {
        pushNotification({
          type: "achievement",
          title: "Achievement Unlocked",
          message: `First level ${level} character: +${reward} ${GUILD_POINT_LABEL}`,
          durationMs: 5200,
        });
        appendAchievementLog(`First level ${level} character`, reward);
      });
    }
  }, [appendAchievementLog, pushNotification, roster]);

  const applyLevelAndProfessionDelta = (char, levelDelta) => {
    const newLevel = Math.min(
      CONFIG.LEVEL_CAP,
      Math.max(1, char.level + levelDelta),
    );
    const appliedLevelDelta = newLevel - char.level;
    const profDelta = appliedLevelDelta * 5;
    const newSkillCap = Math.min(300, getSkillCap(newLevel));

    const updatedProfessions = char.professions.map((prof) => {
      const shifted = prof.skill + profDelta;
      return {
        ...prof,
        skill: Math.max(0, Math.min(newSkillCap, shifted)),
      };
    });

    return {
      ...char,
      level: newLevel,
      exp: 0,
      maxExp: getReqExp(newLevel),
      professions: updatedProfessions,
    };
  };

  const tryApplyWorldTickLoot = useCallback(
    (char, logCollector) => {
      const roll = Math.random();
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
    const adjustedSuccess = Math.min(
      100,
      preview.successChance + dungeonBonus + veteranCoverage.successBonus,
    );
    return {
      ...preview,
      successChance: adjustedSuccess,
      failChance: Math.max(0, 100 - adjustedSuccess),
      focusSuccessBonus: dungeonBonus,
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
    (quest, ids, startTime, rosterSnapshot, chainContext = null) => {
      const selectedMembers = (
        Array.isArray(rosterSnapshot) ? rosterSnapshot : rosterRef.current
      ).filter((c) => ids.includes(c.id));
      const missionPreview = getAdjustedMissionSuccessPreview(
        quest,
        selectedMembers,
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
          : Math.random() * 100 < missionPreview.successChance;

      return {
        ...quest,
        instanceId: createId(),
        payoutGold: getMissionGoldReward(quest),
        wipeCost: getMissionWipeCost(quest),
        missionSuccess,
        successChance: missionPreview.successChance,
        failChance: missionPreview.failChance,
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
        queuedMission,
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
    [buildMissionRun],
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
        if (log?.type !== "dungeon-step" || log.outcome !== "cleared") return;

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
  useEffect(() => {
    const tick = setInterval(() => {
      const clockStep = advanceGameTime({
        currentGameTime: gameTimeRef.current,
        lastRealTime: lastRealTimeRef.current,
        realNow: Date.now(),
        isPaused,
        speed: gameSpeed,
      });
      gameTimeRef.current = clockStep.gameTime;
      lastRealTimeRef.current = clockStep.lastRealTime;
      const now = gameTimeRef.current;
      setGameTimeMs(now);

      if (isPaused) return;

      const currentFaction =
        guildSetupRef.current?.faction || GUILD_FACTION.ALLIANCE;
      const currentRoster = normalizeRosterZones(
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
      const calendarDayProgress = getCalendarDayProgress(
        now,
        calendarStateRef.current.calendarEpochGameTimeMs,
      );

      let newRoster = [...currentRoster];
      let currentMissions = [...missionsRef.current];
      let newMissions = [];
      let finishedMissions = [];
      let newLogs = [];
      let newGold = currentGold;

      const refreshedCalendar = refreshCalendarState({
        state: calendarStateRef.current,
        currentDayIndex: calendarDayIndex,
        roster: currentRoster,
        activeMissions: currentMissions,
        missionList: missionListRef.current,
        createId,
        getRaidLockoutStatus: ({ mission, memberIds }) =>
          getRaidLockoutStatus({
            raidLockouts: raidLockoutsRef.current,
            mission,
            currentDayIndex: calendarDayIndex,
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
        if (m.calendarEventId) {
          completeCalendarEvent({
            eventId: m.calendarEventId,
            missionName: m.name,
            missionSucceeded: result.missionSucceeded,
          });
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
        newRoster = chainResolution.updatedRoster;
        if (chainResolution.queuedMission) {
          newMissions.push(chainResolution.queuedMission);
        }
        if (chainResolution.chainLogs.length > 0) {
          newLogs = [...newLogs, ...chainResolution.chainLogs];
        }
        if (chainResolution.notification) {
          pushNotification(chainResolution.notification);
        }
      });

      // 3. Process Character Status (Idle/Professions)
      newRoster = newRoster.map((char) => {
        const normalizedChar = normalizeCharacterZoneState(
          char,
          currentFaction,
        );
        if (normalizedChar.status === "Questing") return normalizedChar;

        let statusText = "Resting...";
        let gainXP = false;
        let gainSkill = false;

        const hardCap = getSkillCap(normalizedChar.level);
        const autoTarget = getAutoSkillTarget(normalizedChar.level);
        const canGainSkill = normalizedChar.professions.some(
          (p) => p.skill < hardCap,
        );
        const needsAutoSkill = normalizedChar.professions.some(
          (p) => p.skill < autoTarget,
        );
        const isCheckpointLevel = normalizedChar.level % 5 === 0;

        if (normalizedChar.activityMode === "Leveling") {
          if (normalizedChar.level < CONFIG.LEVEL_CAP) {
            gainXP = true;
            statusText = "⚔️ Grinding XP...";
          } else {
            statusText = "Max Level Reached";
          }
        } else if (normalizedChar.activityMode === "Professions") {
          if (canGainSkill) {
            gainSkill = true;
          } else {
            statusText =
              "Skills Capped (Need Level " +
              getNextTierLevel(normalizedChar.level) +
              ")";
          }
        } else if (normalizedChar.activityMode === "Auto") {
          if (isCheckpointLevel && needsAutoSkill) {
            gainSkill = true;
            statusText = "🤖 Auto: Skilling to " + autoTarget + "...";
          } else if (normalizedChar.level < CONFIG.LEVEL_CAP) {
            gainXP = true;
            statusText = "⚔️ Auto: Leveling...";
          } else if (canGainSkill && normalizedChar.level >= CONFIG.LEVEL_CAP) {
            // At max level, just skill to hard cap
            gainSkill = true;
            statusText = "🤖 Auto: Max Level Skilling...";
          } else {
            statusText = "Awaiting Orders";
          }
        }

        if (gainXP) {
          const activeZone =
            ENABLE_ZONE_QUESTING && normalizedChar.currentZoneId
              ? getZoneById(normalizedChar.currentZoneId)
              : null;
          const zoneExpMultiplier = activeZone
            ? getZoneExpMultiplier(normalizedChar.level, activeZone)
            : 1;
          const expGain = getLevelingTickExpGain(
            normalizedChar.level,
            currentGuildStats.expMultiplier *
              currentFocusBonuses.expMultiplier *
              zoneExpMultiplier,
          );
          let newExp = normalizedChar.exp + expGain;
          let newLevel = normalizedChar.level;
          let maxExp = getReqExp(newLevel);
          let leveledUp = false;
          while (newExp >= maxExp && newLevel < CONFIG.LEVEL_CAP) {
            newLevel++;
            newExp -= maxExp;
            maxExp = getReqExp(newLevel);
            leveledUp = true;
          }
          if (newLevel >= CONFIG.LEVEL_CAP) {
            newLevel = CONFIG.LEVEL_CAP;
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
          if (activeZone) {
            const storedProgress = getClampedZoneProgress(
              zoneProgressById[activeZone.id] ?? currentZoneProgress,
            );
            const progressGain = getZoneProgressPerTick({
              zone: activeZone,
              characterLevel: normalizedChar.level,
              durationVariance: normalizedChar.zoneDurationVariance,
            });
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
          const leveledChar = {
            ...normalizedChar,
            level: newLevel,
            exp: newExp,
            maxExp,
            statusText: zoneStatusLabel
              ? `🧭 Zone: ${zoneStatusLabel}`
              : statusText,
            lastLevelUp: leveledUp ? Date.now() : normalizedChar.lastLevelUp,
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
          // Determine cap based on mode
          const currentLimit =
            normalizedChar.activityMode === "Auto" &&
            isCheckpointLevel &&
            needsAutoSkill
              ? autoTarget
              : hardCap;

          const uncappedProfs = normalizedChar.professions.filter(
            (p) => p.skill < currentLimit && p.skill < 300,
          );

          if (uncappedProfs.length > 0) {
            const targetProfIndex = Math.floor(
              Math.random() * uncappedProfs.length,
            );
            const realIndex = normalizedChar.professions.indexOf(
              uncappedProfs[targetProfIndex],
            );
            const pName = normalizedChar.professions[realIndex].name;
            statusText = PROF_ACTIONS[pName] || `Working on ${pName}...`;

            if (Math.random() > 0.3) {
              const newProfs = [...normalizedChar.professions];
              newProfs[realIndex] = {
                ...newProfs[realIndex],
                skill: newProfs[realIndex].skill + 1,
              };
              return {
                ...normalizedChar,
                professions: newProfs,
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

        return {
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
      });

      rosterRef.current = newRoster;
      missionsRef.current = newMissions;
      setRoster(newRoster);
      setActiveMissions(newMissions);
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
    return () => clearInterval(tick);
  }, [
    applyDungeonStepLootAwards,
    applyMissionWipeCosts,
    buildMissionRun,
    completeCalendarEvent,
    gameSpeed,
    isPaused,
    itemDatabase,
    normalizeRosterZones,
    processMissionRewards,
    pushNotification,
    resolveDungeonChainContinuation,
    registerDungeonClearMilestones,
    registerDungeonWipeMilestone,
    tryApplyWorldTickLoot,
  ]);

  const handleOpenRecruit = () => {
    const openSlots = Math.max(
      0,
      guildDerivedStats.maxRoster - rosterRef.current.length,
    );
    if (openSlots <= 0) {
      pushNotification({
        type: "error",
        title: "Recruitment Blocked",
        message: "Member limit reached. Dismiss heroes to recruit more.",
      });
      return;
    }
    const currentGold = Math.max(0, Number(goldRef.current) || 0);
    if (currentGold < RECRUIT_SCOUT_COST_GOLD) {
      pushNotification({
        type: "error",
        title: "Recruitment Blocked",
        message: `Need ${RECRUIT_SCOUT_COST_GOLD}g to scout new applicants.`,
      });
      return;
    }
    const updatedGold = Math.max(0, currentGold - RECRUIT_SCOUT_COST_GOLD);
    goldRef.current = updatedGold;
    setGuildGold(updatedGold);
    setShowRecruit(true);
    pushNotification({
      type: "info",
      title: "Recruitment Scouted",
      message: `Scouting cost paid: ${RECRUIT_SCOUT_COST_GOLD}g. First recruit is free, additional recruits cost ${RECRUIT_COST_GOLD}g each.`,
    });
  };

  const handleRecruit = (chars) => {
    const { recruits, spentGold, updatedGold, updatedRoster } =
      resolveRecruitmentResult({
        currentRoster: rosterRef.current,
        currentGold: goldRef.current,
        selectedCandidates: chars,
        maxRoster: guildDerivedStats.maxRoster,
        recruitCostGold: RECRUIT_COST_GOLD,
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

    const zoneReadyRoster = normalizeRosterZones(updatedRoster);
    rosterRef.current = zoneReadyRoster;
    goldRef.current = updatedGold;
    setRoster(zoneReadyRoster);
    setGuildGold(updatedGold);
    pushNotification({
      type: "info",
      title: "Recruitment Complete",
      message: `${recruits.length} hero${recruits.length > 1 ? "es" : ""} recruited. Additional recruitment cost: ${spentGold}g.`,
    });
    setShowRecruit(false);
  };
  const handleDismiss = (id) => {
    setRoster((p) => p.filter((c) => c.id !== id));
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
    rosterRef.current = starterRoster;
    missionsRef.current = [];
    goldRef.current = starterGold;
    calendarStateRef.current = calendarStart;
    raidLockoutsRef.current = {};
    setRoster(starterRoster);
    setActiveMissions([]);
    setCalendarState(calendarStart);
    setRaidLockouts({});
    setMissionList(
      getMissionListWithZones(INITIAL_MISSIONS.map(cloneMissionTemplate)),
    );
    setGuildLog([]);
    setGuildGold(starterGold);
    setGuildSetup((prev) => ({
      ...prev,
      name: normalizedName,
      hasStarted: true,
    }));
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
        setRoster((prev) => {
          const withZoneState = normalizeRosterZones(prev);
          const assigned = assignZoneToRoster(
            withZoneState,
            memberIds,
            zone.id,
          );
          rosterRef.current = assigned;
          return assigned;
        });
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
      const minimumPartySize = quest?.isRaid
        ? Math.max(1, Number(quest?.minPartySize) || 5)
        : 1;
      if (quest?.isRaid && memberIds.length < minimumPartySize) {
        pushNotification({
          type: "error",
          title: "Raid Setup Incomplete",
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
          ).map((missionEntry) => [missionEntry.id, missionEntry]),
        );
        chainMissions = requestedChainMissionIds
          .map((missionId) => missionLookup.get(missionId))
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
      }

      const selectedMemberIdSet = new Set(memberIds.map((id) => String(id)));
      const activeMissionMemberIds = new Set();
      const activeNonDungeonMemberIds = new Set();
      (Array.isArray(missionsRef.current) ? missionsRef.current : []).forEach(
        (missionRun) => {
          const missionMemberIds = Array.isArray(missionRun?.memberIds)
            ? missionRun.memberIds.map((id) => String(id || "")).filter(Boolean)
            : [];
          const overlapsRaidTeam = missionMemberIds.some((id) =>
            selectedMemberIdSet.has(id),
          );
          if (!overlapsRaidTeam) return;
          missionMemberIds.forEach((id) => activeMissionMemberIds.add(id));
          if (missionRun?.type !== "dungeon") {
            missionMemberIds.forEach((id) => activeNonDungeonMemberIds.add(id));
          }
        },
      );
      if (activeNonDungeonMemberIds.size > 0) {
        pushNotification({
          type: "error",
          title: "Raid Setup Incomplete",
          message:
            "Some selected heroes are already busy outside a dungeon and cannot be moved to the raid.",
        });
        return false;
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
          title: "Raid Setup Incomplete",
          message:
            "Some selected heroes are still busy and cannot join the raid yet.",
        });
        return false;
      }

      const openingMission = hasDungeonChain ? chainMissions[0] : quest;
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

      const startTime = gameTimeRef.current;
      const missionRun = buildMissionRun(
        openingMission,
        memberIds,
        startTime,
        rosterSnapshot,
        chainContext,
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
              statusText: hasDungeonChain
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
      pushNotification,
      roster,
    ],
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
        getRaidLockoutStatus: ({ mission, memberIds }) =>
          getRaidLockoutStatus({
            raidLockouts: raidLockoutsRef.current,
            mission,
            currentDayIndex,
            memberIds,
          }),
      });
      commitCalendarState(refreshed.state);
      return refreshed.state;
    },
    [commitCalendarState],
  );

  const handleCreateCalendarEvent = useCallback(
    ({ missionId, scheduledDayIndex, scheduledTimeOfDay, title }) => {
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
    }) => {
      const mission = missionListRef.current.find(
        (entry) => String(entry?.id) === String(missionId),
      );
      if (!mission) return;
      const series = buildCalendarSeries({
        id: createId(),
        title: title || `${mission.name} Raid Day`,
        missionId: mission.id,
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
    if (!event || event.status !== CALENDAR_STATUS.READY) return false;
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

      const deployed = handleDeploy(mission, approvedRosterIds, {
        calendarEventId: event.id,
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
      if (source !== "auto") setShowCalendar(false);
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
    if (missionWithStepLoot.calendarEventId) {
      completeCalendarEvent({
        eventId: missionWithStepLoot.calendarEventId,
        missionName: missionWithStepLoot.name,
        missionSucceeded: result.missionSucceeded,
      });
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

    if (!result.missionSucceeded) {
      pushNotification({
        type: "error",
        title: "Mission Failed",
        message: missionToResolve.name,
      });
    }
  };

  const handleLevelChange = (id, amt) => {
    setRoster((p) =>
      p.map((c) => (c.id !== id ? c : applyLevelAndProfessionDelta(c, amt))),
    );
  };

  const handleBulkLevel = (amt) => {
    setRoster((p) => p.map((c) => applyLevelAndProfessionDelta(c, amt)));
    setShowDebug(false);
  };

  const handleDebugAddGold = (amount) => {
    const safeAmount = Math.max(0, Number(amount) || 0);
    if (safeAmount <= 0) return;

    const cappedGold = Math.min(
      guildDerivedStats.goldCap,
      goldRef.current + safeAmount,
    );
    goldRef.current = cappedGold;
    setGuildGold(cappedGold);
  };

  const handleDebugAddRenown = (amount) => {
    const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
    if (safeAmount <= 0) return;

    setGuildProgress((prev) => {
      const normalized = normalizeGuildProgress(prev);
      return {
        ...normalized,
        renownPoints: normalized.renownPoints + safeAmount,
        totalRenown: normalized.totalRenown + safeAmount,
      };
    });
    appendGuildRenownLog(`Debug grant: +${safeAmount} ${GUILD_POINT_LABEL}.`);
    pushNotification({
      type: "info",
      title: "Guild Renown Added",
      message: `+${safeAmount} ${GUILD_POINT_LABEL}`,
    });
  };

  const handleDebugAddPresetParty = async (presetValue) => {
    const { buildDebugRosterPreset, resolveDebugPreset } =
      await import("./debug/rosterPresets");
    const preset = resolveDebugPreset(presetValue);
    const openSlots = Math.max(
      0,
      guildDerivedStats.maxRoster - rosterRef.current.length,
    );
    if (openSlots < preset.count) {
      pushNotification({
        type: "error",
        title: "Debug Party Blocked",
        message: preset.blockedMessage,
      });
      return;
    }

    const faction = guildSetupRef.current?.faction || GUILD_FACTION.ALLIANCE;
    const debugParty = buildDebugRosterPreset({
      faction,
      level: preset.level,
      count: preset.count,
      roleOrder: preset.roleOrder,
      guaranteedKeys: preset.guaranteedKeys,
      usedNames: rosterRef.current
        .map((member) => member?.name)
        .filter(Boolean),
    });
    const updatedRoster = normalizeRosterZones(
      [...rosterRef.current, ...debugParty],
      faction,
    );
    rosterRef.current = updatedRoster;
    setRoster(updatedRoster);
    pushNotification({
      type: "info",
      title: preset.successTitle,
      message: preset.successMessage(faction),
    });
    setShowDebug(false);
  };

  const handleDebugPrepareMoltenCoreTestGuild = async () => {
    const {
      buildDebugRosterPreset,
      resolveDebugPreset,
      DEBUG_MOLTEN_CORE_TEST_GUILD_ID,
    } = await import("./debug/rosterPresets");
    const preset = resolveDebugPreset(DEBUG_MOLTEN_CORE_TEST_GUILD_ID);
    const faction = guildSetupRef.current?.faction || GUILD_FACTION.ALLIANCE;
    const debugRaidRoster = buildDebugRosterPreset({
      faction,
      level: preset.level,
      count: preset.count,
      roleOrder: preset.roleOrder,
      guaranteedKeys: preset.guaranteedKeys,
      usedNames: [],
    });
    const normalizedRoster = normalizeRosterZones(debugRaidRoster, faction);
    const unlockedProgress = normalizeGuildProgress(guildProgressRef.current);
    const nextGuildProgress = {
      ...unlockedProgress,
      totalRenown: Math.max(unlockedProgress.totalRenown, 12),
      talents: {
        ...unlockedProgress.talents,
        rosterCap: 3,
        raidAttunement: 1,
      },
    };

    rosterRef.current = normalizedRoster;
    setRoster(normalizedRoster);
    guildProgressRef.current = nextGuildProgress;
    setGuildProgress(nextGuildProgress);
    missionsRef.current = [];
    raidLockoutsRef.current = {};
    rewardedMissionIdsRef.current = new Set();
    setActiveMissions([]);
    setRaidLockouts({});
    setGuildLog((prev) =>
      [
        {
          time: new Date().toLocaleTimeString(),
          type: "guild-renown",
          message: "Debug setup: Molten Core test guild is raid-ready.",
        },
        ...prev,
      ].slice(0, 50),
    );
    pushNotification({
      type: "info",
      title: preset.successTitle,
      message: preset.successMessage(faction),
    });
    setShowDebug(false);
  };

  const handleDebugReloadDatabase = () => {
    setMissionList(
      getMissionListWithZones(INITIAL_MISSIONS.map(cloneMissionTemplate)),
    );
    pushNotification({
      type: "info",
      title: "Database Reloaded",
      message: "Mission templates were reloaded from constants.",
    });
    setShowDebug(false);
  };

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
        calendarState,
        raidLockouts,
        gameSpeed,
        isPaused,
        gameTimeMs: gameTimeRef.current,
      });
    } catch (error) {
      console.error("Failed to save session:", error);
      alert("Could not save session file.");
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
            setCalendarState,
            setRaidLockouts,
            setIsPaused,
            setGameSpeed,
            setGameTimeMs,
            setDetailCharId,
          },
          closeOverlays: () => {
            setShowRecruit(false);
            setShowMissions(false);
            setShowCalendar(false);
            setShowLootTable(false);
            setShowGuildLog(false);
            setShowDebug(false);
            setShowMap(false);
            setShowOptions(false);
          },
        });
        alert("Session loaded.");
      },
      onInvalidSession: (error) => {
        console.error("Failed to load session:", error);
        alert("Invalid session file.");
      },
      onReadError: () => {
        alert("Could not read session file.");
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
  const {
    openSlots: openRecruitSlots,
    affordableSlots: affordableRecruitSlots,
    availableSlots: availableRecruitSlots,
  } = getRecruitmentCapacity({
    rosterSize: roster.length,
    maxRoster: guildDerivedStats.maxRoster,
    guildGold,
    recruitCostGold: RECRUIT_COST_GOLD,
  });
  const activeCharacterNames = useMemo(
    () => roster.map((member) => member?.name).filter(Boolean),
    [roster],
  );

  if (!guildSetup.hasStarted) {
    return (
      <>
        <ToastNotifications
          notifications={notifications}
          onDismiss={dismissNotification}
        />
        <input
          ref={sessionFileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleLoadSessionFile}
        />
        <GuildSetupScreen
          guildSetup={guildSetup}
          onChange={handleGuildSetupChange}
          onStart={handleStartGuild}
          onLoadSession={handleLoadButtonClick}
        />
      </>
    );
  }

  return (
    <div className="wow-shell w-full max-w-5xl mx-auto p-4 pb-20">
      <ToastNotifications
        notifications={notifications}
        onDismiss={dismissNotification}
      />
      <header className="wow-header flex justify-between items-center mb-6 border-b border-gray-700 pb-4 px-2 rounded-md">
        <div>
          <h1 className="wow-header-title fantasy-font text-xl md:text-3xl font-bold truncate">
            {guildSetup.name ||
              getFactionFallbackManagerName(guildSetup.faction)}
          </h1>
          <p className="text-amber-100/70 text-xs md:text-sm tracking-wide">
            {guildSetup.faction} Command • Server:{" "}
            {getGuildServerLabel(guildSetup.server, guildSetup.serverStyle)} •
            Focus: {guildSetup.focus}
          </p>
          <p className="text-cyan-100/70 text-[11px] md:text-xs tracking-wide mt-1">
            {currentCalendarDate.weekdayName}, {currentCalendarDate.monthName}{" "}
            {currentCalendarDate.dayOfMonth}, Year {currentCalendarDate.year}
          </p>
          <div className="mt-2 w-full max-w-xs">
            <div className="h-1.5 overflow-hidden rounded-full border border-cyan-900/70 bg-gray-950/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-300 transition-[width] duration-300"
                style={{ width: `${currentCalendarDayProgressPercent}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-cyan-100/50">
              <span>Day progress</span>
              <span>{currentCalendarDayProgressPercent}%</span>
            </div>
          </div>
        </div>
        <div className="text-right flex-none ml-2">
          <div className="text-sm md:text-xl fantasy-font">
            Mem:{" "}
            <span
              className={
                roster.length >= guildDerivedStats.maxRoster
                  ? "text-red-500"
                  : ""
              }
            >
              {roster.length}
            </span>
            /{guildDerivedStats.maxRoster}
          </div>
          <div className="text-xs md:text-sm text-yellow-400 font-bold mt-1">
            Gold: {guildGold}/{guildDerivedStats.goldCap}
          </div>
          <div className="text-[11px] text-amber-200/80 mt-1">
            {GUILD_POINT_LABEL}: {guildProgress.renownPoints}
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`mt-2 px-3 py-1 rounded text-xs md:text-sm font-bold shadow border ${isPaused ? "bg-gray-800 border-yellow-600 text-yellow-500" : "bg-gray-800 border-gray-600 text-green-400"}`}
          >
            {isPaused ? "▶" : "⏸"}
          </button>
          <button
            onClick={() => setGameSpeed((prev) => getNextGameSpeed(prev))}
            className={`mt-2 ml-2 px-3 py-1 rounded text-xs md:text-sm font-bold shadow border ${gameSpeed > 1 ? "bg-blue-900 border-blue-500 text-blue-100" : "bg-gray-800 border-gray-600 text-gray-200"}`}
          >
            {formatGameSpeedLabel(gameSpeed)}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 md:gap-3 mb-6 pb-2">
        <button
          onClick={handleOpenRecruit}
          disabled={
            openRecruitSlots <= 0 || guildGold < RECRUIT_SCOUT_COST_GOLD
          }
          className="flex-none snap-start btn-recruit text-yellow-100 font-bold py-3 px-6 rounded border border-yellow-900 shadow-lg flex items-center gap-2 select-none disabled:opacity-50 whitespace-nowrap"
        >
          <span className="text-xl">📜</span> Recruit ({RECRUIT_SCOUT_COST_GOLD}
          g)
        </button>
        <button
          onClick={() => setShowGuildTalents(true)}
          className="wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-amber-700 text-amber-200 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-xl">🌟</span> Guild
        </button>
        <button
          onClick={() => setShowMissions(true)}
          className="flex-none snap-start btn-quest text-blue-100 font-bold py-3 px-6 rounded border border-blue-800 shadow-lg flex items-center gap-2 select-none whitespace-nowrap"
        >
          <img
            src={factionMissionIconUrl}
            alt={guildSetup.faction}
            className="w-5 h-5 rounded-sm border border-blue-900/60 object-cover"
            onError={(event) => {
              event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
            }}
          />
          Missions
        </button>
        <button
          onClick={() => setShowCalendar(true)}
          className="wow-command flex-none px-4 py-3 rounded bg-gray-800 border border-indigo-700 text-indigo-200 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap"
        >
          <img
            src={getWowIconUrl("inv_misc_note_05")}
            alt=""
            className="w-5 h-5 rounded-sm border border-indigo-900/60 object-cover"
            onError={(event) => {
              event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
            }}
          />
          Calendar
        </button>
        <button
          onClick={() => setShowMap(true)}
          className="wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-cyan-800 text-cyan-200 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-xl">🗺️</span> Map
        </button>
        <button
          onClick={() => setShowOptions(true)}
          className="wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-gray-500 text-gray-200 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-xl">⚙️</span> Options
        </button>
        <button
          onClick={() => setShowLootTable(true)}
          className="wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-gray-600 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-xl">📖</span> DB
        </button>
        <button
          onClick={() => setShowGuildLog(true)}
          className="wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-gray-600 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-xl">📜</span> Log
        </button>
      </div>

      <div className="mb-6 rounded border border-gray-700 bg-gray-900/70 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-xs uppercase tracking-wider text-gray-300 font-bold">
            Guild Activity Focus
          </h3>
          <span className="text-[11px] text-gray-400">
            Current: {guildActivityModeSummary || "None"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {GUILD_ACTIVITY_MODES.map((mode) => {
            const isActive = guildActivityModeSummary === mode;
            return (
              <button
                key={mode}
                onClick={() => handleGuildModeChange(mode)}
                disabled={roster.length === 0}
                className={`px-3 py-2 rounded border text-xs md:text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isActive
                    ? "border-blue-500 bg-blue-900/40 text-blue-100"
                    : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {mode === "Auto"
                  ? "🤖 Auto"
                  : mode === "Leveling"
                    ? "⚔️ Leveling"
                    : "🔨 Professions"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6 border-t border-amber-900/50"></div>

      {activeMissions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
            Active
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeMissions.map((m) => {
              const hasLargeBossCount =
                m.type === "dungeon" && getDungeonBossCount(m) >= 5;
              return (
                <div
                  key={`${m.questId}-${m.startTime}`}
                  className={hasLargeBossCount ? "md:col-span-2" : ""}
                >
                  <ActiveMissionCard
                    mission={m}
                    onFinish={handleManualFinish}
                    gameTimeMs={gameTimeMs}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-6 rounded border border-gray-700 bg-gray-900/70 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
            Guild Members
          </h3>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] text-gray-300">
              <span className="block mb-1 uppercase tracking-wide text-gray-500">
                Search
              </span>
              <input
                type="search"
                value={guildMemberSearch}
                onChange={(event) => setGuildMemberSearch(event.target.value)}
                className="w-36 bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
                placeholder="Character name"
              />
            </label>
            <label className="text-[11px] text-gray-300">
              <span className="block mb-1 uppercase tracking-wide text-gray-500">
                Ranking
              </span>
              <select
                value={memberRankingMode}
                onChange={(event) => setMemberRankingMode(event.target.value)}
                className="bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
              >
                <option value={MEMBER_RANKING_MODES.STANDARD}>Standard</option>
                <option value={MEMBER_RANKING_MODES.EQUIP_CHECK}>
                  Equip Check
                </option>
              </select>
            </label>
            <label className="text-[11px] text-gray-300">
              <span className="block mb-1 uppercase tracking-wide text-gray-500">
                Sort
              </span>
              <select
                value={guildMemberSortMode}
                onChange={(event) => setGuildMemberSortMode(event.target.value)}
                className="bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
              >
                {GUILD_MEMBER_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-gray-300">
              <span className="block mb-1 uppercase tracking-wide text-gray-500">
                Min Level
              </span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={guildMemberMinLevelFilter}
                onChange={(event) =>
                  setGuildMemberMinLevelFilter(event.target.value)
                }
                className="w-20 bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
                placeholder="Any"
              />
            </label>
            <label className="text-[11px] text-gray-300">
              <span className="block mb-1 uppercase tracking-wide text-gray-500">
                Max Level
              </span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={guildMemberMaxLevelFilter}
                onChange={(event) =>
                  setGuildMemberMaxLevelFilter(event.target.value)
                }
                className="w-20 bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
                placeholder="Any"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setGuildMemberSearch("");
                setGuildMemberMinLevelFilter("");
                setGuildMemberMaxLevelFilter("");
              }}
              disabled={!hasAnyGuildMemberLevelFilter && !hasGuildMemberSearch}
              className="h-[26px] px-2 rounded border border-gray-600 bg-gray-800 text-[11px] text-gray-200 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            <span className="text-xs text-gray-500 ml-auto">
              Showing {rankedRoster.length}/{roster.length}
            </span>
          </div>
        </div>

        {roster.length === 0 ? (
          <div className="text-gray-500 text-center py-10 italic">
            Guild empty. Recruit heroes!
          </div>
        ) : rankedRoster.length === 0 ? (
          <div className="text-gray-500 text-center py-10 italic">
            No guild members match these filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rankedRoster.map((char) => {
              const isBestSearchMatch =
                hasGuildMemberSearchMatch &&
                char.id === bestGuildMemberSearchMatchId;
              const isDimmedSearchResult =
                hasGuildMemberSearchMatch && !isBestSearchMatch;

              return (
                <div
                  key={char.id}
                  className={`rounded-lg transition-all ${
                    isBestSearchMatch
                      ? "ring-2 ring-amber-400 shadow-lg shadow-amber-900/30"
                      : ""
                  } ${isDimmedSearchResult ? "opacity-45" : ""}`}
                >
                  {memberRankingMode === MEMBER_RANKING_MODES.EQUIP_CHECK ? (
                    <CharacterEquipCheckCard
                      char={char}
                      onClick={() => setDetailCharId(char.id)}
                    />
                  ) : (
                    <CharacterCard
                      char={char}
                      onClick={() => setDetailCharId(char.id)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <input
        ref={sessionFileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleLoadSessionFile}
      />

      <Suspense fallback={null}>
        {showOptions && (
          <OptionsModal
            isOpen={showOptions}
            onClose={() => setShowOptions(false)}
            onSaveSession={handleSaveSession}
            onLoadSession={handleLoadButtonClick}
            onOpenDebug={() => setShowDebug(true)}
            onOpenGuildTalents={() => setShowGuildTalents(true)}
          />
        )}

        {showRecruit && (
          <RecruitModal
            isOpen={showRecruit}
            onClose={() => setShowRecruit(false)}
            onRecruit={handleRecruit}
            availableSlots={availableRecruitSlots}
            openSlots={openRecruitSlots}
            affordableSlots={affordableRecruitSlots}
            recruitCostGold={RECRUIT_COST_GOLD}
            guildFaction={guildSetup.faction}
            existingNames={activeCharacterNames}
          />
        )}
        {showGuildTalents && (
          <GuildTalentsModal
            isOpen={showGuildTalents}
            onClose={() => setShowGuildTalents(false)}
            guildProgress={guildProgress}
            guildGold={guildGold}
            guildDerivedStats={guildDerivedStats}
            onUpgradeTalent={handleUpgradeGuildTalent}
          />
        )}
        {showMissions && (
          <MissionModal
            isOpen={showMissions}
            onClose={() => setShowMissions(false)}
            roster={roster}
            onDeploy={handleDeploy}
            missionList={missionList}
            showLegacyQuests={SHOW_LEGACY_QUESTS}
            guildFaction={guildSetup.faction}
            dungeonSuccessBonus={guildFocusBonuses.dungeonSuccessBonus}
            guildExpMultiplier={
              guildDerivedStats.expMultiplier * guildFocusBonuses.expMultiplier
            }
            isRaidUnlocked={guildDerivedStats.raidUnlocked}
            raidLockouts={raidLockouts}
            currentDayIndex={currentCalendarDayIndex}
            onNotify={pushNotification}
          />
        )}
        {showCalendar && (
          <CalendarModal
            isOpen={showCalendar}
            onClose={() => setShowCalendar(false)}
            calendarState={calendarState}
            currentDayIndex={currentCalendarDayIndex}
            missionList={missionList}
            roster={roster}
            activeMissions={activeMissions}
            raidLockouts={raidLockouts}
            onCreateEvent={handleCreateCalendarEvent}
            onCreateSeries={handleCreateCalendarSeries}
            onUpdateEventRoster={handleUpdateCalendarEventRoster}
            onCancelEvent={handleCancelCalendarEvent}
            onCancelSeries={handleCancelCalendarSeries}
            onStartEvent={handleStartCalendarEvent}
          />
        )}
        {showLootTable && (
          <LootTableModal
            isOpen={showLootTable}
            onClose={() => setShowLootTable(false)}
          />
        )}
        {showGuildLog && (
          <GuildLogModal
            isOpen={showGuildLog}
            onClose={() => setShowGuildLog(false)}
            logs={guildLog}
            missionList={missionList}
          />
        )}
        {showDebug && (
          <DebugModal
            isOpen={showDebug}
            onClose={() => setShowDebug(false)}
            onBulkLevel={handleBulkLevel}
            onAddGold={handleDebugAddGold}
            onAddRenown={handleDebugAddRenown}
            onAddPresetParty={handleDebugAddPresetParty}
            onPrepareMoltenCoreTestGuild={handleDebugPrepareMoltenCoreTestGuild}
            onReloadDatabase={handleDebugReloadDatabase}
          />
        )}
        {showMap && (
          <WorldMapModal isOpen={showMap} onClose={() => setShowMap(false)} />
        )}
        {detailCharId && (
          <DetailModal
            char={roster.find((c) => c.id === detailCharId)}
            isOpen={!!detailCharId}
            missionAchievementCatalog={missionAchievementCatalog}
            onClose={() => setDetailCharId(null)}
            onDismiss={handleDismiss}
            onModeChange={handleModeChange}
            onProfChange={handleProfChange}
            onGenerateBackstory={handleGenerateBackstory}
            onUpdateBackstory={handleUpdateBackstory}
            onLevelChange={handleLevelChange}
            onRoleChange={(id, role) =>
              setRoster((p) => p.map((c) => (c.id !== id ? c : { ...c, role })))
            }
          />
        )}
      </Suspense>
    </div>
  );
};

export default App;
