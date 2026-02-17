import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  CONFIG,
  INITIAL_MISSIONS,
  DB_CLASSES,
  PROF_ACTIONS,
  DB_ITEMS,
  GUILD_FACTION,
  GUILD_FACTION_OPTIONS,
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
  createId,
  getClassArmorTypes,
  getKeyLabel,
} from "./utils";
import CharacterCard from "./components/CharacterCard";
import CharacterEquipCheckCard from "./components/CharacterEquipCheckCard";
import ToastNotifications from "./components/ToastNotifications";
import GuildSetupScreen from "./components/GuildSetupScreen";
import RecruitModal from "./components/modals/RecruitModal";
import DetailModal from "./components/modals/DetailModal";
import LootTableModal from "./components/modals/LootTableModal";
import GuildLogModal from "./components/modals/GuildLogModal";
import DebugModal from "./components/modals/DebugModal";
import WorldMapModal from "./components/modals/WorldMapModal";
import GuildTalentsModal from "./components/modals/GuildTalentsModal";
import MissionModal from "./components/modals/MissionModal";
import BaseModal from "./components/modals/BaseModal";
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
  buildSessionPayload,
  downloadSessionPayload,
  parseSessionPayload,
  hydrateSessionData,
} from "./session/sessionPersistence";
import {
  evaluateMissionKeyAccess,
  getDungeonBossCount,
  getDungeonBossNames,
  getDungeonQuarterExpMultiplier,
  getDungeonOverlevelExpMultiplier,
  getMissionLevelExpMultiplier,
  getMissionGoldReward,
  getMissionLootLevelRange,
  resolveMissionRewardQualities,
} from "./missions/missionHelpers";
import { createMissionRewardProcessor } from "./missions/missionRewards";
import {
  getRecruitmentCapacity,
  resolveRecruitmentResult,
} from "./recruitment/recruitmentLogic";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const callGemini = async (prompt, isJson = false) => {
  try {
    if (!apiKey) {
      throw new Error("Missing VITE_GEMINI_API_KEY");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const body = { contents: [{ parts: [{ text: prompt }] }] };
    if (isJson)
      body.generationConfig = { responseMimeType: "application/json" };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Gemini API Error: ${response.status}`);
    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0)
      throw new Error("No candidates returned");
    const text = data.candidates[0].content.parts[0].text;
    return isJson ? JSON.parse(text) : text;
  } catch (error) {
    console.error("Gemini Call Failed:", error);
    throw error;
  }
};

const FAILED_MISSION_EXP_FACTOR = 0.2;
const GUILD_ACTIVITY_MODES = ["Leveling", "Professions", "Auto"];
const MEMBER_RANKING_MODES = {
  STANDARD: "standard",
  EQUIP_CHECK: "equipCheck",
};
const GUILD_FOCUS = {
  LEVELING: "Leveling",
  DUNGEONS: "Dungeons",
  SOCIAL: "Social",
};
const GUILD_FOCUS_OPTIONS = Object.values(GUILD_FOCUS);
const DEFAULT_GUILD_SETUP = {
  name: "",
  faction: GUILD_FACTION.ALLIANCE,
  focus: GUILD_FOCUS.LEVELING,
  hasStarted: false,
};
const DEFAULT_DUNGEON_LOOT_TABLE = {
  boss: [
    { quality: 2, chance: 80 },
    { quality: 3, chance: 20 },
  ],
  endboss: [
    { quality: 3, chance: 80 },
    { quality: 2, chance: 20 },
  ],
};
const STARTING_GUILD_MEMBERS = 5;
const STARTING_GUILD_GOLD = 5;
const RECRUIT_COST_GOLD = 5;

const getDungeonBossLabel = (mission, stepIndex) => {
  const bossNames = getDungeonBossNames(mission);
  return bossNames[stepIndex] || `Boss ${stepIndex + 1}`;
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
    worldOnly: typeof entry.worldOnly === "boolean" ? entry.worldOnly : undefined,
  };
};

const resolveDungeonDropSource = (stepConfig, isEndboss) => {
  const defaultSource = isEndboss ? "dungeon" : "mixed";
  const source = String(stepConfig.source || defaultSource).toLowerCase();

  let sourceOptions;
  if (source === "dungeon") {
    sourceOptions = { includeWorldDrops: false, dungeonOnly: true, worldOnly: false };
  } else if (source === "world") {
    sourceOptions = { includeWorldDrops: true, dungeonOnly: false, worldOnly: true };
  } else {
    sourceOptions = { includeWorldDrops: true, dungeonOnly: false, worldOnly: false };
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
  const explicitStepConfig = parseDungeonStepLootConfig(stepOverrides[stepIndex]);
  if (Array.isArray(explicitStepConfig.weights) && explicitStepConfig.weights.length > 0) {
    return {
      weights: explicitStepConfig.weights,
      ...resolveDungeonDropSource(explicitStepConfig, isEndboss),
    };
  }

  const phaseConfig = parseDungeonStepLootConfig(isEndboss ? table.endboss : table.boss);
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
  return [...new Set([rolledQuality, ...configuredFallbacks, ...fallbackOrder])];
};

const getDefaultDungeonProgress = (mission, startTime, totalDuration) => {
  const dungeonBossCount = getDungeonBossCount(mission);
  const safeDuration = Math.max(4000, Number(totalDuration) || 0);
  const stepDuration = Math.max(1000, Math.floor(safeDuration / dungeonBossCount));
  return {
    currentStep: 0,
    clearedSteps: 0,
    failedAtStep: null,
    stepResults: [],
    stepDuration,
    nextStepAt: startTime + stepDuration,
    finished: false,
  };
};

// --- Loot Logic moved to /missions/missionRewards.js ---

const advanceDungeonMission = (mission, now, instant = false) => {
  if (mission.type !== "dungeon") {
    return { mission, stepLogs: [] };
  }

  const dungeonBossCount = getDungeonBossCount(mission);
  const baseProgress =
    mission.dungeonProgress ||
    getDefaultDungeonProgress(mission, mission.startTime || now, mission.totalDuration);
  const progress = {
    ...baseProgress,
    stepResults: Array.isArray(baseProgress.stepResults)
      ? [...baseProgress.stepResults]
      : [],
  };
  const stepLogs = [];
  const successChance =
    typeof mission.successChance === "number" ? mission.successChance : 100;

  while (
    !progress.finished &&
    progress.currentStep < dungeonBossCount &&
    (instant || now >= progress.nextStepAt)
  ) {
    const stepIndex = progress.currentStep;
    const bossName = getDungeonBossLabel(mission, stepIndex);
    const succeeded = Math.random() * 100 < successChance;

    progress.stepResults.push({
      step: stepIndex + 1,
      bossName,
      outcome: succeeded ? "cleared" : "failed",
    });
    stepLogs.push({
      type: "dungeon-step",
      missionName: mission.name,
      bossName,
      step: stepIndex + 1,
      outcome: succeeded ? "cleared" : "failed",
    });

    if (!succeeded) {
      progress.failedAtStep = stepIndex + 1;
      progress.finished = true;
      break;
    }

    progress.clearedSteps = stepIndex + 1;
    progress.currentStep = stepIndex + 1;
    if (progress.currentStep >= dungeonBossCount) {
      progress.finished = true;
      progress.failedAtStep = null;
      break;
    }

    progress.nextStepAt += progress.stepDuration;
  }

  const resolvedMission = {
    ...mission,
    dungeonProgress: progress,
  };
  if (progress.finished) {
    resolvedMission.missionSuccess = progress.clearedSteps >= dungeonBossCount;
    resolvedMission.finishTime = Math.min(now, mission.finishTime || now);
  }

  return { mission: resolvedMission, stepLogs };
};

const generateWorldTickLoot = (char, quality) => {
  const classInfo = DB_CLASSES[char.charClass];
  if (!classInfo) return null;

  const allowedTypes = getClassArmorTypes(char.charClass, char.level);
  const minLevel = Math.max(1, char.level - 6);
  const maxLevel = char.level;

  const possibleItems = DB_ITEMS.filter((item) => {
    if (
      (typeof item.dungeon === "string" && item.dungeon.trim()) ||
      (typeof item.dungeonSetId === "string" && item.dungeonSetId.trim())
    ) {
      return false;
    }
    if (item.quality !== quality) return false;
    if (item.minLevel < minLevel || item.minLevel > maxLevel) return false;
    return item.type === "Generic" || allowedTypes.includes(item.type);
  });

  if (possibleItems.length === 0) return null;
  return possibleItems[Math.floor(Math.random() * possibleItems.length)];
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

  const hasStarted = Boolean(
    safe.hasStarted || normalizedName || hasLegacyGameData,
  );

  return {
    ...DEFAULT_GUILD_SETUP,
    name:
      normalizedName || (hasStarted ? "Alliance Vanguard" : DEFAULT_GUILD_SETUP.name),
    faction: normalizedFaction,
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
  const chainContext = mission.chainContext;
  const chainTotal = Number(chainContext?.totalMissions) || 0;
  const chainPosition = Number(chainContext?.currentPosition) || 0;
  return (
    <div className="wow-card p-3 rounded flex flex-col gap-2 shadow-lg relative overflow-hidden border border-gray-600 bg-gray-800">
      <div className="flex justify-between items-center z-10 relative">
        <span className="font-bold text-sm text-white flex items-center gap-1">
          {mission.type === "dungeon" ? "🏰" : "📜"} {mission.name}
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
          Chain: {chainContext.setName || "Dungeon Set"} ({Math.max(1, chainPosition)}/{chainTotal})
        </div>
      )}
      {mission.type === "dungeon" && (
        <>
          <div className="text-[11px] text-gray-300">
            Cleared: {dungeonProgress?.clearedSteps || 0}/{dungeonBossCount} bosses
          </div>
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, dungeonBossCount)}, minmax(0, 1fr))`,
            }}
          >
            {dungeonBossNames.map((label, index) => {
              const stepResult = stepResults[index];
              const hasResolved = Boolean(stepResult);
              const failed = hasResolved && stepResult.outcome === "failed";
              const cleared = hasResolved && stepResult.outcome === "cleared";
              const isActive =
                !dungeonProgress?.finished && !hasResolved && index === activeStepIndex;
              const className = failed
                ? "border-red-700 bg-red-950/40 text-red-300"
                : cleared
                  ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
                  : isActive
                    ? "border-amber-700 bg-amber-950/40 text-amber-300"
                    : "border-gray-700 bg-gray-900/60 text-gray-500";
              return (
                <div
                  key={`${mission.instanceId || mission.id}-${label}`}
                  className={`rounded border px-1 py-1 text-[10px] text-center ${className}`}
                >
                  {label}
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

const OptionsModal = ({
  isOpen,
  onClose,
  onSaveSession,
  onLoadSession,
  onOpenDebug,
  onOpenGuildTalents,
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/70 backdrop-blur-sm p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-2 border-gray-700 rounded-lg w-full max-w-sm shadow-2xl"
    >
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold fantasy-font text-gray-100">Options</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl px-1">
            &times;
          </button>
        </div>
        <div className="p-4 space-y-3">
          <button
            onClick={() => {
              onSaveSession();
              onClose();
            }}
            className="w-full px-4 py-3 rounded border border-emerald-800 bg-gray-800 text-emerald-200 hover:bg-gray-700 text-sm font-bold"
          >
            💾 Save Session
          </button>
          <button
            onClick={() => {
              onLoadSession();
              onClose();
            }}
            className="w-full px-4 py-3 rounded border border-teal-800 bg-gray-800 text-teal-200 hover:bg-gray-700 text-sm font-bold"
          >
            📂 Load Session
          </button>
          <button
            onClick={() => {
              onOpenGuildTalents();
              onClose();
            }}
            className="w-full px-4 py-3 rounded border border-amber-800 bg-gray-800 text-amber-200 hover:bg-gray-700 text-sm font-bold"
          >
            🌟 Guild Talents
          </button>
          <button
            onClick={() => {
              onOpenDebug();
              onClose();
            }}
            className="w-full px-4 py-3 rounded border border-red-900 bg-gray-900 text-red-300 hover:bg-red-900/20 text-sm font-bold"
          >
            ⚙️ Debug Menu
          </button>
        </div>
    </BaseModal>
  );
};

// --- MAIN APP COMPONENT ---

const App = () => {
  const [guildSetup, setGuildSetup] = useState(() =>
    normalizeGuildSetup(DEFAULT_GUILD_SETUP),
  );
  const [roster, setRoster] = useState([]);
  const [activeMissions, setActiveMissions] = useState([]);
  const [missionList, setMissionList] = useState(INITIAL_MISSIONS);
  const [guildLog, setGuildLog] = useState([]);
  const [guildGold, setGuildGold] = useState(0);
  const [guildProgress, setGuildProgress] = useState(() =>
    createInitialGuildProgress(),
  );
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(DEFAULT_GAME_SPEED);
  const [gameTimeMs, setGameTimeMs] = useState(() => Date.now());
  const [showRecruit, setShowRecruit] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
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

  const rosterRef = useRef(roster);
  const missionsRef = useRef(activeMissions);
  const missionListRef = useRef(missionList);
  const goldRef = useRef(guildGold);
  const guildProgressRef = useRef(guildProgress);
  const guildSetupRef = useRef(guildSetup);
  const gameTimeRef = useRef(gameTimeMs);
  const lastRealTimeRef = useRef(Date.now());
  const rewardedMissionIdsRef = useRef(new Set());
  const notificationTimersRef = useRef(new Map());
  const sessionFileInputRef = useRef(null);

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

  const pushNotification = useCallback((payload, fallbackType = "info", fallbackDurationMs = 4200) => {
    const normalized =
      typeof payload === "string"
        ? { message: payload, type: fallbackType, durationMs: fallbackDurationMs }
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
  }, []);

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

  const guildDerivedStats = getGuildDerivedStats(guildProgress);
  const guildFocusBonuses = useMemo(
    () => getGuildFocusBonuses(guildSetup.focus),
    [guildSetup.focus],
  );

  const appendGuildRenownLog = useCallback((message) => {
    const time = new Date().toLocaleTimeString();
    setGuildLog((prev) => [{ time, type: "guild-renown", message }, ...prev].slice(0, 50));
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
        pushNotification(
          {
            type: "achievement",
            title: "Achievement Unlocked",
            message: `${milestone.label}: +${milestone.reward} ${GUILD_POINT_LABEL} (${missionName})`,
            durationMs: 5200,
          },
        );
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
        pushNotification(
          {
            type: "achievement",
            title: "Achievement Unlocked",
            message: `${unlockedMilestone.label}: +${unlockedMilestone.reward} ${GUILD_POINT_LABEL} (${missionName})`,
            durationMs: 5200,
          },
        );
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
      setGuildProgress((prev) => {
        const result = upgradeGuildTalent(prev, talentKey);
        if (result.upgraded && result.talent) {
          upgradeSummary = {
            title: result.talent.title,
            suffix: result.talent.suffix,
            spentCost: result.spentCost,
            nextValue: result.nextValue,
          };
        }
        return result.guildProgress;
      });

      if (upgradeSummary) {
        pushNotification(
          `${upgradeSummary.title} upgraded to +${upgradeSummary.nextValue} ${upgradeSummary.suffix}.`,
          "info",
        );
        appendGuildRenownLog(
          `${upgradeSummary.title} upgraded for ${upgradeSummary.spentCost} ${GUILD_POINT_LABEL}.`,
        );
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

  const tryApplyWorldTickLoot = (char, logCollector) => {
    const roll = Math.random();
    const targetQuality = roll < 0.01 ? 2 : roll < 0.09 ? 1 : null;
    if (!targetQuality) return char;

    const lootItem = generateWorldTickLoot(char, targetQuality);
    if (!lootItem) return char;

    const currentItem = char.equipment?.[lootItem.slot];
    const currentItemLevel = getItemEffectiveLevel(currentItem);
    const newItemLevel = getItemEffectiveLevel(lootItem);

    if (newItemLevel <= currentItemLevel) return char;

    logCollector.push({
      type: "loot",
      characterName: char.name,
      itemName: lootItem.name,
      itemQuality: lootItem.quality,
      missionName: "World Drop",
    });

    return {
      ...char,
      equipment: { ...char.equipment, [lootItem.slot]: lootItem },
      statusText: `Found [${lootItem.name}] while adventuring.`,
    };
  };

  const getMissionInstanceId = (mission) =>
    mission.instanceId || `${mission.questId || mission.id}-${mission.startTime || 0}`;

  const getAdjustedMissionSuccessPreview = useCallback((mission, members) => {
    const preview = getMissionSuccessPreview(mission, members);
    const dungeonBonus =
      mission?.type === "dungeon"
        ? getGuildFocusBonuses(guildSetupRef.current?.focus).dungeonSuccessBonus
        : 0;
    const adjustedSuccess = Math.min(100, preview.successChance + dungeonBonus);
    return {
      ...preview,
      successChance: adjustedSuccess,
      failChance: Math.max(0, 100 - adjustedSuccess),
      focusSuccessBonus: dungeonBonus,
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
      const selectedMembers = (Array.isArray(rosterSnapshot) ? rosterSnapshot : rosterRef.current).filter(
        (c) => ids.includes(c.id),
      );
      const missionPreview = getAdjustedMissionSuccessPreview(quest, selectedMembers);
      const totalDuration = quest.duration * 1000;
      const dungeonProgress =
        quest.type === "dungeon"
          ? getDefaultDungeonProgress(quest, startTime, totalDuration)
          : null;
      const missionSuccess =
        quest.type === "dungeon"
          ? undefined
          : Math.random() * 100 < missionPreview.successChance;

      return {
        ...quest,
        instanceId: createId(),
        payoutGold: getMissionGoldReward(quest),
        missionSuccess,
        successChance: missionPreview.successChance,
        failChance: missionPreview.failChance,
        partyPower: missionPreview.partyPower,
        missionPower: missionPreview.missionPower,
        questId: quest.id,
        startTime,
        finishTime: startTime + totalDuration,
        totalDuration,
        dungeonProgress,
        memberIds: [...ids],
        chainContext: chainContext
          ? {
              ...chainContext,
              remainingMissionIds: Array.isArray(chainContext.remainingMissionIds)
                ? [...chainContext.remainingMissionIds]
                : [],
            }
          : null,
      };
    },
    [getAdjustedMissionSuccessPreview],
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
      const remainingMissionIds = Array.isArray(chainContext?.remainingMissionIds)
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
        (Array.isArray(missionListRef.current) ? missionListRef.current : []).map(
          (missionEntry) => [missionEntry.id, missionEntry],
        ),
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
          ? { ...char, status: "Questing", statusText: `Chain: ${nextMissionTemplate.name}` }
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
        dbItems: DB_ITEMS,
        dbClasses: DB_CLASSES,
        getClassArmorTypes,
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
    [],
  );

  const processMissionRewards = (mission, currentRoster) =>
    missionRewardProcessor({
      mission,
      currentRoster,
      activeGuildStats: getGuildDerivedStats(guildProgressRef.current),
      activeFocusBonuses: getGuildFocusBonuses(guildSetupRef.current?.focus),
      levelCap: CONFIG.LEVEL_CAP,
      failedMissionExpFactor: FAILED_MISSION_EXP_FACTOR,
    });

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

      const currentRoster = rosterRef.current;
      const currentMissions = missionsRef.current;
      const currentGold = goldRef.current;
      const currentGuildStats = getGuildDerivedStats(guildProgressRef.current);
      const currentFocusBonuses = getGuildFocusBonuses(guildSetupRef.current?.focus);

      let newRoster = [...currentRoster];
      let newMissions = [];
      let finishedMissions = [];
      let newLogs = [];
      let newGold = currentGold;

      // 1. Advance missions and separate finished/active
      currentMissions.forEach((mission) => {
        let currentMission = mission;
        if (currentMission.type === "dungeon") {
          const dungeonAdvance = advanceDungeonMission(currentMission, now);
          currentMission = dungeonAdvance.mission;
          if (dungeonAdvance.stepLogs.length > 0) {
            newLogs = [...newLogs, ...dungeonAdvance.stepLogs];
          }
        }

        const dungeonFinished = Boolean(currentMission.dungeonProgress?.finished);
        if (currentMission.finishTime <= now || dungeonFinished) {
          finishedMissions.push(currentMission);
        } else {
          newMissions.push(currentMission);
        }
      });

      // 2. Process Finished Missions (Fixes "Stuck" Issue)
      finishedMissions.forEach((m) => {
        const missionInstanceId = getMissionInstanceId(m);
        if (rewardedMissionIdsRef.current.has(missionInstanceId)) return;
        rewardedMissionIdsRef.current.add(missionInstanceId);

        const result = processMissionRewards(m, newRoster);
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
        if (char.status === "Questing") return char;

        let statusText = "Resting...";
        let gainXP = false;
        let gainSkill = false;

        const hardCap = getSkillCap(char.level);
        const autoTarget = getAutoSkillTarget(char.level);
        const canGainSkill = char.professions.some((p) => p.skill < hardCap);
        const needsAutoSkill = char.professions.some(
          (p) => p.skill < autoTarget,
        );
        const isCheckpointLevel = char.level % 5 === 0;

        if (char.activityMode === "Leveling") {
          if (char.level < CONFIG.LEVEL_CAP) {
            gainXP = true;
            statusText = "⚔️ Grinding XP...";
          } else {
            statusText = "Max Level Reached";
          }
        } else if (char.activityMode === "Professions") {
          if (canGainSkill) {
            gainSkill = true;
          } else {
            statusText =
              "Skills Capped (Need Level " + getNextTierLevel(char.level) + ")";
          }
        } else if (char.activityMode === "Auto") {
          if (isCheckpointLevel && needsAutoSkill) {
            gainSkill = true;
            statusText = "🤖 Auto: Skilling to " + autoTarget + "...";
          } else if (char.level < CONFIG.LEVEL_CAP) {
            gainXP = true;
            statusText = "⚔️ Auto: Leveling...";
          } else if (canGainSkill && char.level >= CONFIG.LEVEL_CAP) {
            // At max level, just skill to hard cap
            gainSkill = true;
            statusText = "🤖 Auto: Max Level Skilling...";
          } else {
            statusText = "Awaiting Orders";
          }
        }

        if (gainXP) {
          const expGain = Math.max(
            1,
            Math.floor(
              (20 + char.level * 4) *
                currentGuildStats.expMultiplier *
                currentFocusBonuses.expMultiplier,
            ),
          );
          let newExp = char.exp + expGain;
          let newLevel = char.level;
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
          const leveledChar = {
            ...char,
            level: newLevel,
            exp: newExp,
            maxExp,
            statusText,
            lastLevelUp: leveledUp ? Date.now() : char.lastLevelUp,
          };
          return tryApplyWorldTickLoot(leveledChar, newLogs);
        }

        if (gainSkill) {
          // Determine cap based on mode
          const currentLimit =
            char.activityMode === "Auto" && isCheckpointLevel && needsAutoSkill
              ? autoTarget
              : hardCap;

          const uncappedProfs = char.professions.filter(
            (p) => p.skill < currentLimit && p.skill < 300,
          );

          if (uncappedProfs.length > 0) {
            const targetProfIndex = Math.floor(
              Math.random() * uncappedProfs.length,
            );
            const realIndex = char.professions.indexOf(
              uncappedProfs[targetProfIndex],
            );
            const pName = char.professions[realIndex].name;
            statusText = PROF_ACTIONS[pName] || `Working on ${pName}...`;

            if (Math.random() > 0.3) {
              const newProfs = [...char.professions];
              newProfs[realIndex] = {
                ...newProfs[realIndex],
                skill: newProfs[realIndex].skill + 1,
              };
              return { ...char, professions: newProfs, statusText };
            }
          }
        }

        return { ...char, statusText };
      });

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
    gameSpeed,
    isPaused,
    pushNotification,
    resolveDungeonChainContinuation,
    registerDungeonClearMilestones,
    registerDungeonWipeMilestone,
  ]);

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
        message: `Need ${RECRUIT_COST_GOLD}g per hero and free roster slots.`,
      });
      setShowRecruit(false);
      return;
    }

    rosterRef.current = updatedRoster;
    goldRef.current = updatedGold;
    setRoster(updatedRoster);
    setGuildGold(updatedGold);
    pushNotification({
      type: "info",
      title: "Recruitment Complete",
      message: `${recruits.length} hero${recruits.length > 1 ? "es" : ""} recruited for ${spentGold}g.`,
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
          focus: GUILD_FOCUS_OPTIONS.includes(value) ? value : GUILD_FOCUS.LEVELING,
        };
      }
      return prev;
    });
  };

  const handleStartGuild = () => {
    const normalizedName = String(guildSetup.name || "").trim();
    if (!normalizedName) return;
    const starterRoster = generateCharacters(STARTING_GUILD_MEMBERS);
    const starterGold = STARTING_GUILD_GOLD;

    rewardedMissionIdsRef.current = new Set();
    rosterRef.current = starterRoster;
    missionsRef.current = [];
    goldRef.current = starterGold;
    setRoster(starterRoster);
    setActiveMissions([]);
    setMissionList(INITIAL_MISSIONS);
    setGuildLog([]);
    setGuildGold(starterGold);
    setGuildSetup((prev) => ({ ...prev, name: normalizedName, hasStarted: true }));
    pushNotification({
      type: "info",
      title: "Guild Founded",
      message: `${normalizedName} enters Azeroth with ${STARTING_GUILD_MEMBERS} heroes and ${starterGold}g.`,
    });
  };

  const handleGenerateBackstory = async (char) => {
    try {
      const guildName = guildSetupRef.current?.name || "Alliance Vanguard";
      const prompt = `Write a short, engaging 2-sentence fantasy backstory for a level ${char.level} ${char.race} ${char.charClass} named ${char.name}. They are a member of the '${guildName}' guild.`;
      return await callGemini(prompt, false);
    } catch {
      alert("Oracle is meditating. Add VITE_GEMINI_API_KEY and try again.");
      return null;
    }
  };
  const handleDeploy = (quest, ids, options = {}) => {
    const memberIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!quest || memberIds.length === 0) return;
    const rosterSnapshot = Array.isArray(rosterRef.current)
      ? rosterRef.current
      : roster;

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
        (Array.isArray(missionListRef.current) ? missionListRef.current : []).map(
          (missionEntry) => [missionEntry.id, missionEntry],
        ),
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
    const missionSequenceForAccess = hasDungeonChain ? chainMissions : [quest];
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
      const blockedMissionName = blockingRequirement?.missionName || quest.name;
      pushNotification({
        type: "error",
        title: "Key Required",
        message: `${blockedMissionName} needs ${missingKeyLabel}. Add a key holder or include a key-rewarding wing first.`,
      });
      return;
    }

    const openingMission = hasDungeonChain ? chainMissions[0] : quest;
    const chainContext = hasDungeonChain
      ? {
          chainId: createId(),
          setId: quest.dungeonSetId,
          setName: quest.dungeonSetName || quest.name,
          totalMissions: chainMissions.length,
          currentPosition: 1,
          remainingMissionIds: chainMissions.slice(1).map((missionEntry) => missionEntry.id),
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

    setRoster((prev) =>
      prev.map((c) =>
        memberIds.includes(c.id)
          ? {
              ...c,
              status: "Questing",
              statusText: hasDungeonChain
                ? `Chain: ${openingMission.name}`
                : "On Mission",
            }
          : c,
      ),
    );
    setActiveMissions((prev) => [...prev, missionRun]);

    if (hasDungeonChain) {
      pushNotification({
        type: "info",
        title: "Dungeon Chain Started",
        message: `${chainContext.setName}: ${chainMissions.length} wings queued.`,
      });
    }
  };
  const handleManualFinish = (m) => {
    const now = gameTimeRef.current;
    const dungeonAdvance =
      m.type === "dungeon" ? advanceDungeonMission(m, now, true) : null;
    const missionToResolve = dungeonAdvance ? dungeonAdvance.mission : m;
    const missionInstanceId = getMissionInstanceId(missionToResolve);
    if (rewardedMissionIdsRef.current.has(missionInstanceId)) return;
    rewardedMissionIdsRef.current.add(missionInstanceId);

    // Manually trigger the finish logic immediately (logic also exists in loop, but this is for instant feedback)
    // To avoid race conditions, we filter it out of activeMissions immediately
    setActiveMissions((prev) => prev.filter((mi) => mi !== m));
    const result = processMissionRewards(missionToResolve, rosterRef.current);
    const chainResolution = resolveDungeonChainContinuation({
      mission: missionToResolve,
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
    if (missionToResolve.type === "dungeon") {
      if (result.missionSucceeded) {
        registerDungeonClearMilestones(missionToResolve);
      } else {
        registerDungeonWipeMilestone(missionToResolve.name);
      }
    }

    const openGoldSpace = guildDerivedStats.goldCap - goldRef.current;
    const gainedGold = Math.max(0, Math.min(result.missionGold, openGoldSpace));

    if (gainedGold > 0) {
      const updatedGold = goldRef.current + gainedGold;
      goldRef.current = updatedGold;
      setGuildGold(updatedGold);
    }

    if (result.missionLogs.length > 0 || gainedGold > 0) {
      const time = new Date().toLocaleTimeString();
      const dungeonStepLogs = dungeonAdvance ? dungeonAdvance.stepLogs : [];
      const extraLogs =
        gainedGold > 0
          ? [{ type: "gold", amount: gainedGold, missionName: missionToResolve.name }]
          : [];
      setGuildLog((prev) =>
        [
          ...[
            ...dungeonStepLogs,
            ...result.missionLogs,
            ...extraLogs,
            ...chainResolution.chainLogs,
          ].map((log) => ({
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

    const cappedGold = Math.min(guildDerivedStats.goldCap, goldRef.current + safeAmount);
    goldRef.current = cappedGold;
    setGuildGold(cappedGold);
  };

  const handleDebugReloadDatabase = () => {
    setMissionList(INITIAL_MISSIONS.map(cloneMissionTemplate));
    pushNotification({
      type: "info",
      title: "Database Reloaded",
      message: "Mission templates were reloaded from constants.",
    });
    setShowDebug(false);
  };

  const handleSaveSession = () => {
    try {
      const payload = buildSessionPayload({
        roster,
        activeMissions,
        missionList,
        guildLog,
        guildGold,
        guildProgress,
        guildSetup,
        gameSpeed,
        isPaused,
        gameTimeMs: gameTimeRef.current,
      });
      downloadSessionPayload(payload);
    } catch (error) {
      console.error("Failed to save session:", error);
      alert("Could not save session file.");
    }
  };

  const handleLoadButtonClick = () => {
    sessionFileInputRef.current?.click();
  };

  const handleLoadSessionFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payloadData = parseSessionPayload(reader.result);
        const {
          normalizedRoster,
          loadedActiveMissions,
          loadedMissionList,
          loadedGuildLog,
          loadedGuildProgress,
          loadedGuildGold,
          loadedGuildSetup,
          loadedProgression,
        } = hydrateSessionData({
          payloadData,
          initialMissions: INITIAL_MISSIONS,
          normalizeGuildProgress,
          normalizeGuildSetup,
          getGuildDerivedStats,
          normalizeProgressionState,
          defaultGameSpeed: DEFAULT_GAME_SPEED,
          createId,
          resolveDungeonBossCount: getDungeonBossCount,
          defaultGuildSetup: DEFAULT_GUILD_SETUP,
        });

        rewardedMissionIdsRef.current = new Set();
        rosterRef.current = normalizedRoster;
        missionsRef.current = loadedActiveMissions;
        goldRef.current = loadedGuildGold;
        guildProgressRef.current = loadedGuildProgress;
        guildSetupRef.current = loadedGuildSetup;
        setRoster(normalizedRoster);
        setActiveMissions(loadedActiveMissions);
        setMissionList(loadedMissionList);
        setGuildLog(loadedGuildLog);
        setGuildGold(loadedGuildGold);
        setGuildProgress(loadedGuildProgress);
        setGuildSetup(loadedGuildSetup);
        setIsPaused(loadedProgression.isPaused);
        setGameSpeed(clampGameSpeed(loadedProgression.gameSpeed));
        gameTimeRef.current = loadedProgression.gameTimeMs;
        setGameTimeMs(loadedProgression.gameTimeMs);
        lastRealTimeRef.current = Date.now();
        setDetailCharId(null);
        setShowRecruit(false);
        setShowMissions(false);
        setShowLootTable(false);
        setShowGuildLog(false);
        setShowDebug(false);
        setShowMap(false);
        setShowOptions(false);

        alert("Session loaded.");
      } catch (error) {
        console.error("Failed to load session:", error);
        alert("Invalid session file.");
      }
    };
    reader.onerror = () => {
      alert("Could not read session file.");
    };
    reader.readAsText(file);
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

  const rankedRoster = useMemo(
    () =>
      [...roster].sort((left, right) => {
        if (memberRankingMode === MEMBER_RANKING_MODES.EQUIP_CHECK) {
          const rightItemLevel = getCharacterAverageItemLevel(right);
          const leftItemLevel = getCharacterAverageItemLevel(left);
          if (rightItemLevel !== leftItemLevel) {
            return rightItemLevel - leftItemLevel;
          }
          if (right.level !== left.level) {
            return right.level - left.level;
          }
          return String(left.name || "").localeCompare(String(right.name || ""));
        }

        if (left.level !== right.level) {
          return right.level - left.level;
        }

        const rightItemLevel = getCharacterAverageItemLevel(right);
        const leftItemLevel = getCharacterAverageItemLevel(left);
        if (rightItemLevel !== leftItemLevel) {
          return rightItemLevel - leftItemLevel;
        }

        return String(left.name || "").localeCompare(String(right.name || ""));
      }),
    [memberRankingMode, roster],
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
            {guildSetup.name || "Alliance Manager"}
          </h1>
          <p className="text-amber-100/70 text-xs md:text-sm tracking-wide">
            {guildSetup.faction} Command • Focus: {guildSetup.focus}
          </p>
        </div>
        <div className="text-right flex-none ml-2">
          <div className="text-sm md:text-xl fantasy-font">
            Mem:{" "}
            <span
              className={
                roster.length >= guildDerivedStats.maxRoster ? "text-red-500" : ""
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

      <div className="flex overflow-x-auto gap-3 mb-6 pb-2 no-scrollbar snap-x">
        <button
          onClick={() => setShowRecruit(true)}
          disabled={openRecruitSlots <= 0 || affordableRecruitSlots <= 0}
          className="flex-none snap-start btn-recruit text-yellow-100 font-bold py-3 px-6 rounded border border-yellow-900 shadow-lg flex items-center gap-2 select-none disabled:opacity-50 whitespace-nowrap"
        >
          <span className="text-xl">📜</span> Recruit ({RECRUIT_COST_GOLD}g)
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
          <span className="text-xl">🛡️</span> Missions
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
            {activeMissions.map((m) => (
              <ActiveMissionCard
                key={`${m.questId}-${m.startTime}`}
                mission={m}
                onFinish={handleManualFinish}
                gameTimeMs={gameTimeMs}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 rounded border border-gray-700 bg-gray-900/70 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
            Guild Members
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              Ranking
            </span>
            <select
              value={memberRankingMode}
              onChange={(event) => setMemberRankingMode(event.target.value)}
              className="bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
            >
              <option value={MEMBER_RANKING_MODES.STANDARD}>Standard</option>
              <option value={MEMBER_RANKING_MODES.EQUIP_CHECK}>Equip Check</option>
            </select>
          </div>
        </div>

        {roster.length === 0 ? (
          <div className="text-gray-500 text-center py-10 italic">
            Guild empty. Recruit heroes!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rankedRoster.map((char) =>
              memberRankingMode === MEMBER_RANKING_MODES.EQUIP_CHECK ? (
                <CharacterEquipCheckCard
                  key={char.id}
                  char={char}
                  onClick={() => setDetailCharId(char.id)}
                />
              ) : (
                <CharacterCard
                  key={char.id}
                  char={char}
                  onClick={() => setDetailCharId(char.id)}
                />
              ),
            )}
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

      <OptionsModal
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
        onSaveSession={handleSaveSession}
        onLoadSession={handleLoadButtonClick}
        onOpenDebug={() => setShowDebug(true)}
        onOpenGuildTalents={() => setShowGuildTalents(true)}
      />

      <RecruitModal
        isOpen={showRecruit}
        onClose={() => setShowRecruit(false)}
        onRecruit={handleRecruit}
        availableSlots={availableRecruitSlots}
        openSlots={openRecruitSlots}
        affordableSlots={affordableRecruitSlots}
        recruitCostGold={RECRUIT_COST_GOLD}
      />
      <GuildTalentsModal
        isOpen={showGuildTalents}
        onClose={() => setShowGuildTalents(false)}
        guildProgress={guildProgress}
        guildDerivedStats={guildDerivedStats}
        onUpgradeTalent={handleUpgradeGuildTalent}
      />
      <MissionModal
        isOpen={showMissions}
        onClose={() => setShowMissions(false)}
        roster={roster}
        onDeploy={handleDeploy}
        missionList={missionList}
        guildFaction={guildSetup.faction}
        dungeonSuccessBonus={guildFocusBonuses.dungeonSuccessBonus}
        onNotify={pushNotification}
      />
      <LootTableModal
        isOpen={showLootTable}
        onClose={() => setShowLootTable(false)}
      />
      <GuildLogModal
        isOpen={showGuildLog}
        onClose={() => setShowGuildLog(false)}
        logs={guildLog}
      />
      <DebugModal
        isOpen={showDebug}
        onClose={() => setShowDebug(false)}
        onBulkLevel={handleBulkLevel}
        onAddGold={handleDebugAddGold}
        onReloadDatabase={handleDebugReloadDatabase}
      />
      <WorldMapModal isOpen={showMap} onClose={() => setShowMap(false)} />
      <DetailModal
        char={roster.find((c) => c.id === detailCharId)}
        isOpen={!!detailCharId}
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
    </div>
  );
};

export default App;
