import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONFIG, DB_CLASSES, GUILD_FACTION } from "../../constants";
import { DB_ITEMS } from "../../data/items";
import {
  getCharacterAverageItemLevel,
  getItemEffectiveLevel,
  getItemIconUrl,
  getKeyLabel,
  getKeySourceQuestLabel,
  getMissionBaseFailChance,
  getMissionSuccessPreview,
  getMissionVeteranCoverage,
  getQualityClass,
  getQualityLabel,
  getRacePortraitUrl,
  getRoleIcon,
  getWowIconUrl,
} from "../../utils";
import {
  getDungeonBossNames,
  getDungeonOverlevelExpMultiplier,
  getMissionLevelExpMultiplier,
  evaluateMissionKeyAccess,
  getMissionGoldReward,
  getMissionWipeCost,
  getMissionMaxAttempts,
  getMissionMetaText,
  getMissionRequiredKeys,
  getMissionRecommendedRange,
  getMissionRewardKeys,
  getMissionRewardQualities,
} from "../../missions/missionHelpers";
import {
  getItemSource,
  getMissionLootSource,
  groupByQuality,
  sortLootItems,
} from "../../loot/lootTableHelpers";
import {
  formatRaidResetSchedule,
  getRaidLockoutStatus,
} from "../../raids/raidLockouts";
import { getRelationshipSuccessModifier } from "../../social/relationshipSystem";
import { getPartyMoraleSuccessBonus } from "../../game/characterMorale";
import { hasCompletedZoneEliteQuest } from "../../automation/zoneEliteAutomation";
import BaseModal from "./BaseModal";
import {
  getZoneById,
  getZoneEliteQuestTemplates,
  getZoneLootRewardCounts,
  isZoneAccessibleForFaction,
  ZONE_FACTION,
} from "../../zones/zoneDefinitions";

const AUTO_SELECT_MODES = {
  BOOST_LOW_LEVEL: "boostLowLevel",
  MAX_SUCCESS: "maxSuccess",
  OPTIMIZED_EXP: "optimizedExp",
  IN_LEVEL_RANGE: "inLevelRange",
};

const AUTO_SELECT_MODE_OPTIONS = [
  { value: AUTO_SELECT_MODES.BOOST_LOW_LEVEL, label: "Boost low lvl" },
  { value: AUTO_SELECT_MODES.MAX_SUCCESS, label: "Max Success" },
  { value: AUTO_SELECT_MODES.OPTIMIZED_EXP, label: "Optimized Exp" },
  { value: AUTO_SELECT_MODES.IN_LEVEL_RANGE, label: "In level range" },
];

const AUTO_SELECT_MODE_LABEL = Object.fromEntries(
  AUTO_SELECT_MODE_OPTIONS.map((option) => [option.value, option.label]),
);

const TACTICAL_CHARACTER_SORT = {
  LEVEL_DESC: "levelDesc",
  LEVEL_ASC: "levelAsc",
  ILVL_DESC: "ilvlDesc",
  ILVL_ASC: "ilvlAsc",
};

const TACTICAL_CHARACTER_SORT_OPTIONS = [
  { value: TACTICAL_CHARACTER_SORT.LEVEL_DESC, label: "Level Desc" },
  { value: TACTICAL_CHARACTER_SORT.LEVEL_ASC, label: "Level Asc" },
  { value: TACTICAL_CHARACTER_SORT.ILVL_DESC, label: "iLvl Desc" },
  { value: TACTICAL_CHARACTER_SORT.ILVL_ASC, label: "iLvl Asc" },
];

const CATEGORY_LABELS = {
  all: "All",
  legacy: "Legacy",
  zone: "Zones",
  dungeon: "Dungeons",
  raid: "Raids",
};
const FACTION_MISSION_ICON = {
  [GUILD_FACTION.ALLIANCE]: "inv_bannerpvp_02",
  [GUILD_FACTION.HORDE]: "inv_bannerpvp_01",
};

const getMissionCategory = (mission) => {
  if (mission?.type === "zone") return "zone";
  if (mission?.isRaid) return "raid";
  if (mission.type === "dungeon") return "dungeon";
  return "legacy";
};

const getMissionDisplayName = (mission) => {
  if (mission?.type === "dungeon" && mission?.dungeonWing) return mission.dungeonWing;
  return mission?.name || "Mission";
};

const getMissionPartySize = (mission) =>
  Math.max(1, Number(mission?.requiredPartySize) || (mission?.isRaid ? 40 : 5));

const getMissionMinPartySize = (mission) =>
  Math.max(1, Number(mission?.minPartySize) || (mission?.isRaid ? 5 : 1));

const formatBonusDropChanceLabel = (rawChance) => {
  const numericChance = Number(rawChance);
  if (!Number.isFinite(numericChance) || numericChance <= 0) return null;
  const normalizedChance =
    numericChance > 1 && numericChance <= 100 ? numericChance : numericChance * 100;
  if (!Number.isFinite(normalizedChance) || normalizedChance <= 0) return null;
  const rounded = normalizedChance < 1 ? normalizedChance.toFixed(2) : normalizedChance.toFixed(0);
  return `${rounded}%`;
};

const getMissionBonusDropNotes = (mission) => {
  if (!Array.isArray(mission?.bonusDrops) || mission.bonusDrops.length === 0) return [];
  return mission.bonusDrops
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const chanceLabel = formatBonusDropChanceLabel(entry.chance);
      if (!chanceLabel) return null;
      const qualityList = Array.isArray(entry.qualityPriority)
        ? entry.qualityPriority
            .map((quality) => getQualityLabel(Number(quality)))
            .filter(Boolean)
        : [];
      const qualityLabel = qualityList.length > 0 ? qualityList.join(" / ") : "Bonus item";
      const fullClearLabel = entry.onComplete ? " on full clear" : "";
      const sourceLabel =
        entry.worldOnly === true
          ? " (world drop)"
          : entry.dungeonOnly === true
            ? " (dungeon drop)"
            : "";
      return `${qualityLabel}: ${chanceLabel}${fullClearLabel}${sourceLabel}`;
    })
    .filter(Boolean);
};

const getDungeonBriefingText = (mission) => {
  const bossNames = getDungeonBossNames(mission);
  const isRaid = mission?.isRaid === true;
  const missionMaxAttempts = getMissionMaxAttempts(mission);
  const minJoinLevel = Number.isFinite(mission?.minLevel)
    ? Math.max(1, Number(mission.minLevel))
    : Math.max(1, (Number(mission?.level) || 1) - 6);
  const entryLevel = Number(mission?.entryLevel);
  const normalizedEntryLevel =
    Number.isFinite(entryLevel) && entryLevel > 0 ? Math.max(1, Math.floor(entryLevel)) : null;
  const showEntryLevel =
    normalizedEntryLevel !== null && normalizedEntryLevel !== minJoinLevel;
  const entryText = showEntryLevel ? ` Entry level: ${normalizedEntryLevel}.` : "";
  const requiredKeyLabels = getMissionRequiredKeys(mission)
    .map((keyId) => getKeyLabel(keyId))
    .filter(Boolean);
  const requiredKeySourceLabels = getMissionRequiredKeys(mission)
    .map((keyId) => getKeySourceQuestLabel(keyId))
    .filter(Boolean);
  const wipeCost = getMissionWipeCost(mission);
  const keyText =
    requiredKeyLabels.length > 0
      ? ` Key required: ${requiredKeyLabels.join(" / ")}${
          requiredKeySourceLabels.length > 0
            ? ` (Quest: ${requiredKeySourceLabels.join(" / ")})`
            : ""
        }.`
      : "";
  const attemptText =
    missionMaxAttempts > 0
    ? ` ${isRaid ? "Raid wipe rules" : "Wipe rules"}: ${missionMaxAttempts} total attempts. A wipe retries the same boss until attempts are exhausted.`
    : "";
  const wipeCostText = wipeCost > 0 ? ` Wipe cost: ${wipeCost}g per wipe.` : "";
  return `Dungeon briefing: ${bossNames.length} bosses (${bossNames.join(", ")}). Each cleared boss grants 1 drop, and XP unlocks in fixed quarter milestones (25% / 50% / 75% / 100%) based on total completion.${entryText}${keyText}${attemptText}${wipeCostText} Over-level heroes earn less XP above the recommended max (1+: -25%, 5+: -50%, 10+: no XP).`;
};

const getMissionLevelBounds = (mission) => {
  const recommendedRange = getMissionRecommendedRange(mission);
  if (recommendedRange) return recommendedRange;
  const fallbackLevel = Math.max(1, Number(mission?.level) || 1);
  return { minLevel: fallbackLevel, maxLevel: fallbackLevel };
};

const getMissionJoinMinLevel = (mission) =>
  Number.isFinite(mission?.minLevel)
    ? Math.max(1, Number(mission.minLevel))
    : Math.max(1, (Number(mission?.level) || 1) - 6);

const getMissionEntryLevel = (mission) => {
  const entryLevel = Number(mission?.entryLevel);
  if (!Number.isFinite(entryLevel) || entryLevel <= 0) return null;
  return Math.max(1, Math.floor(entryLevel));
};

const getMissionRewardKeyLabels = (mission) =>
  getMissionRewardKeys(mission)
    .map((keyId) => getKeyLabel(keyId))
    .filter(Boolean);

const getMissionRequiredKeySourceLabels = (mission) =>
  getMissionRequiredKeys(mission)
    .map((keyId) => getKeySourceQuestLabel(keyId))
    .filter(Boolean);

const getMissionProgressionBounds = (mission) => {
  const recommendedRange = getMissionRecommendedRange(mission);
  if (recommendedRange) return recommendedRange;
  const fallbackLevel = Math.max(1, Number(mission?.level) || 1);
  return {
    minLevel: getMissionJoinMinLevel(mission),
    maxLevel: fallbackLevel,
  };
};

const getZoneLootCountEntries = (zone) => {
  const counts = getZoneLootRewardCounts(zone);
  const entries = [];
  if (counts.common > 0) entries.push({ quality: 1, count: counts.common });
  if (counts.uncommon > 0) entries.push({ quality: 2, count: counts.uncommon });
  if (counts.rare > 0) entries.push({ quality: 3, count: counts.rare });
  return entries;
};

const getZoneEliteKeyRewardLabels = (zoneId) => {
  if (!zoneId) return [];
  const keyIds = new Set();
  getZoneEliteQuestTemplates(zoneId).forEach((mission) => {
    getMissionRewardKeys(mission).forEach((keyId) => {
      if (keyId) keyIds.add(keyId);
    });
  });
  return [...keyIds]
    .map((keyId) => getKeyLabel(keyId))
    .filter(Boolean);
};

const renderLootCountLabel = (entries, keyPrefix) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return <span className="text-gray-400">None</span>;
  }
  return entries.map((entry, index) => (
    <React.Fragment key={`${keyPrefix}-${entry.quality}`}>
      <span>{entry.count}x </span>
      <span className={getQualityClass(entry.quality)}>
        [{getQualityLabel(entry.quality)} item]
      </span>
      {index < entries.length - 1 && <span className="text-gray-500"> + </span>}
    </React.Fragment>
  ));
};

const roundDownToHundred = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.floor(numeric / 100) * 100;
};

const roundDownToThousand = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.floor(numeric / 1000) * 1000;
};

const formatXpRewardText = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "0";

  if (numeric >= 1000) {
    const roundedThousands = roundDownToThousand(numeric);
    return `${Math.floor(roundedThousands / 1000)}k`;
  }

  const roundedHundreds = roundDownToHundred(numeric);
  return `${(roundedHundreds / 1000).toFixed(1)}k`;
};

const getDungeonGroupLevelRangeLabel = (missions) => {
  if (!Array.isArray(missions) || missions.length === 0) return "1 - 1";
  let minLevel = Number.POSITIVE_INFINITY;
  let maxLevel = Number.NEGATIVE_INFINITY;
  missions.forEach((mission) => {
    const bounds = getMissionLevelBounds(mission);
    minLevel = Math.min(minLevel, bounds.minLevel);
    maxLevel = Math.max(maxLevel, bounds.maxLevel);
  });
  return `${minLevel} - ${maxLevel}`;
};

const getDungeonMissionGroups = (missions) => {
  const groups = [];
  const groupedSets = new Map();

  missions.forEach((mission) => {
    if (mission?.dungeonSetId && mission?.dungeonSetName) {
      const groupKey = `set:${mission.dungeonSetId}`;
      if (!groupedSets.has(groupKey)) {
        const group = {
          key: groupKey,
          type: "set",
          name: mission.dungeonSetName,
          missions: [],
        };
        groupedSets.set(groupKey, group);
        groups.push(group);
      }
      groupedSets.get(groupKey).missions.push(mission);
      return;
    }

    groups.push({
      key: `mission:${mission.id}`,
      type: "single",
      name: mission?.name || "Dungeon",
      missions: [mission],
    });
  });

  groups.forEach((group) => {
    group.missions.sort((left, right) => {
      const leftWingOrder = Number(left?.wingOrder) || 0;
      const rightWingOrder = Number(right?.wingOrder) || 0;
      if (leftWingOrder !== rightWingOrder) return leftWingOrder - rightWingOrder;
      if ((left?.level || 0) !== (right?.level || 0)) return (left?.level || 0) - (right?.level || 0);
      return String(left?.name || "").localeCompare(String(right?.name || ""));
    });
  });

  return groups;
};

const sortDungeonWingsByProgression = (left, right) => {
  if ((left?.level || 0) !== (right?.level || 0)) return (left?.level || 0) - (right?.level || 0);
  const leftWingOrder = Number(left?.wingOrder) || 0;
  const rightWingOrder = Number(right?.wingOrder) || 0;
  if (leftWingOrder !== rightWingOrder) return leftWingOrder - rightWingOrder;
  return String(left?.name || "").localeCompare(String(right?.name || ""));
};

const MissionModal = ({
  isOpen,
  onClose,
  roster,
  onDeploy,
  missionList,
  activeMissions = [],
  showLegacyQuests = true,
  guildFaction = GUILD_FACTION.ALLIANCE,
  dungeonSuccessBonus = 0,
  guildExpMultiplier = 1,
  isRaidUnlocked = false,
  raidLockouts = {},
  guildRelationships = {},
  currentDayIndex = 0,
  onNotify,
  missionBoardState = null,
  onMissionBoardStateChange = null,
}) => {
  const initialBoardState =
    missionBoardState && typeof missionBoardState === "object"
      ? missionBoardState
      : {};
  const [view, setView] = useState("list");
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [party, setParty] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(
    initialBoardState.selectedCategory || "all",
  );
  const [levelFilterMin, setLevelFilterMin] = useState(
    initialBoardState.levelFilterMin || "",
  );
  const [levelFilterMax, setLevelFilterMax] = useState(
    initialBoardState.levelFilterMax || "",
  );
  const [showAvailableDungeonsOnly, setShowAvailableDungeonsOnly] = useState(
    Boolean(initialBoardState.showAvailableDungeonsOnly),
  );
  const [hideLowLevelDungeons, setHideLowLevelDungeons] = useState(
    Boolean(initialBoardState.hideLowLevelDungeons),
  );
  const [characterFilterMinLevel, setCharacterFilterMinLevel] = useState("");
  const [characterFilterMaxLevel, setCharacterFilterMaxLevel] = useState("");
  const [characterSortMode, setCharacterSortMode] = useState(
    TACTICAL_CHARACTER_SORT.LEVEL_DESC,
  );
  const [autoAssignSummary, setAutoAssignSummary] = useState("");
  const [autoSelectMode, setAutoSelectMode] = useState(
    AUTO_SELECT_MODES.OPTIMIZED_EXP,
  );
  const [expandedDungeonGroups, setExpandedDungeonGroups] = useState({});
  const [isChainEnabled, setIsChainEnabled] = useState(false);
  const [selectedChainMissionIds, setSelectedChainMissionIds] = useState([]);
  const [selectedZoneEliteQuestId, setSelectedZoneEliteQuestId] = useState(null);
  const [isLootAccordionOpen, setIsLootAccordionOpen] = useState(false);
  const [isAutoSelectMenuOpen, setIsAutoSelectMenuOpen] = useState(false);
  const autoSelectMenuRef = useRef(null);
  const categoryFilterOptions = useMemo(() => {
    const options = ["all"];
    options.push("zone", "dungeon", "raid");
    if (showLegacyQuests) {
      options.push("legacy");
    }
    return options;
  }, [showLegacyQuests]);
  const availableMissionList = useMemo(
    () =>
      Array.isArray(missionList)
        ? missionList.filter((mission) => {
            if (mission?.type === "zone") {
              const zone = getZoneById(mission?.zoneId);
              return Boolean(zone) && isZoneAccessibleForFaction(zone, guildFaction);
            }
            if (!isRaidUnlocked && mission?.isRaid === true) return false;
            if (showLegacyQuests) return true;
            const category = getMissionCategory(mission);
            return category !== "legacy";
          })
        : [],
    [guildFaction, isRaidUnlocked, missionList, showLegacyQuests],
  );

  useEffect(() => {
    if (!isOpen) return;
    setView("list");
    setParty([]);
    setSelectedQuest(null);
    setCharacterFilterMinLevel("");
    setCharacterFilterMaxLevel("");
    setCharacterSortMode(TACTICAL_CHARACTER_SORT.LEVEL_DESC);
    setAutoAssignSummary("");
    setAutoSelectMode(AUTO_SELECT_MODES.OPTIMIZED_EXP);
    setExpandedDungeonGroups({});
    setIsChainEnabled(false);
    setSelectedChainMissionIds([]);
    setSelectedZoneEliteQuestId(null);
    setIsLootAccordionOpen(false);
    setIsAutoSelectMenuOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (typeof onMissionBoardStateChange !== "function") return;
    onMissionBoardStateChange({
      selectedCategory,
      levelFilterMin,
      levelFilterMax,
      showAvailableDungeonsOnly,
      hideLowLevelDungeons,
    });
  }, [
    hideLowLevelDungeons,
    levelFilterMax,
    levelFilterMin,
    onMissionBoardStateChange,
    selectedCategory,
    showAvailableDungeonsOnly,
  ]);

  useEffect(() => {
    if (!isAutoSelectMenuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (autoSelectMenuRef.current?.contains(event.target)) return;
      setIsAutoSelectMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isAutoSelectMenuOpen]);

  useEffect(() => {
    if (selectedCategory === "raid" && !isRaidUnlocked) {
      setSelectedCategory("all");
    }
  }, [isRaidUnlocked, selectedCategory]);

  useEffect(() => {
    if (!categoryFilterOptions.includes(selectedCategory)) {
      setSelectedCategory("all");
    }
  }, [categoryFilterOptions, selectedCategory]);

  useEffect(() => {
    if (!isRaidUnlocked && selectedQuest?.isRaid) {
      setSelectedQuest(null);
      setParty([]);
      setView("list");
      setAutoAssignSummary("");
      setIsChainEnabled(false);
      setSelectedChainMissionIds([]);
      setIsLootAccordionOpen(false);
    }
  }, [isRaidUnlocked, selectedQuest]);

  const handleSelectQuest = (quest) => {
    if (quest?.type === "zone") {
      const zone = getZoneById(quest?.zoneId);
      if (zone && !isZoneAccessibleForFaction(zone, guildFaction)) {
        if (typeof onNotify === "function") {
          onNotify({
            type: "error",
            title: "Zone Locked",
            message: `${zone.name} is restricted to ${zone.faction}.`,
            durationMs: 3200,
          });
        }
        return;
      }
    }
    if (quest?.isRaid && !isRaidUnlocked) {
      if (typeof onNotify === "function") {
        onNotify({
          type: "error",
          title: "Raid Locked",
          message: "Unlock Raid Attunement on the Guild Talents board first.",
          durationMs: 3400,
        });
      }
      return;
    }
    setSelectedQuest(quest);
    setView("prep");
    setParty([]);
    setAutoAssignSummary("");
    setIsChainEnabled(false);
    setSelectedChainMissionIds([]);
    setSelectedZoneEliteQuestId(null);
    setIsLootAccordionOpen(false);
  };

  const toggleMember = (charId) => {
    setAutoAssignSummary("");
    setParty((prev) => {
      const memberById = new Map(roster.map((member) => [member.id, member]));
      if (prev.includes(charId)) {
        const nextIds = prev.filter((id) => id !== charId);
        if (!selectedZoneEliteQuest) return nextIds;
        const hasQuestStarter = nextIds.some((id) => {
          const member = memberById.get(id);
          return (
            member &&
            !hasCompletedZoneEliteQuest(member, selectedZoneEliteQuest)
          );
        });
        return hasQuestStarter
          ? nextIds
          : nextIds.filter((id) => {
              const member = memberById.get(id);
              return (
                member &&
                !hasCompletedZoneEliteQuest(member, selectedZoneEliteQuest)
              );
            });
      }
      if (!isSelectedZoneMission && prev.length >= selectedMissionPartySize) return prev;
      if (selectedZoneEliteQuest) {
        const member = memberById.get(charId);
        const memberCompleted =
          member && hasCompletedZoneEliteQuest(member, selectedZoneEliteQuest);
        const hasQuestStarter = prev.some((id) => {
          const selectedMember = memberById.get(id);
          return (
            selectedMember &&
            !hasCompletedZoneEliteQuest(selectedMember, selectedZoneEliteQuest)
          );
        });
        if (memberCompleted && !hasQuestStarter) return prev;
      }
      return [...prev, charId];
    });
  };

  const chainWingMissions =
    selectedQuest?.type === "dungeon" &&
    selectedQuest?.dungeonSetId &&
    selectedQuest?.dungeonSetName
      ? [...availableMissionList]
          .filter(
            (mission) =>
              mission.type === "dungeon" &&
              mission.dungeonSetId === selectedQuest.dungeonSetId,
          )
          .sort(sortDungeonWingsByProgression)
      : [];

  const canChainSetDungeons = chainWingMissions.length > 1;

  useEffect(() => {
    if (!selectedQuest || !canChainSetDungeons) {
      setIsChainEnabled(false);
      setSelectedChainMissionIds([]);
      return;
    }
    setIsChainEnabled(false);
    setSelectedChainMissionIds([selectedQuest.id]);
  }, [selectedQuest, canChainSetDungeons]);

  const selectedChainMissions = chainWingMissions
    .filter((mission) => selectedChainMissionIds.includes(mission.id))
    .sort(sortDungeonWingsByProgression);

  const chainStartMission =
    isChainEnabled && selectedChainMissions.length > 0
      ? selectedChainMissions[0]
      : selectedQuest;
  const zoneEliteMissionOptions = useMemo(
    () =>
      selectedQuest?.type === "zone" ? getZoneEliteQuestTemplates(selectedQuest.zoneId) : [],
    [selectedQuest],
  );
  useEffect(() => {
    if (selectedQuest?.type !== "zone") {
      setSelectedZoneEliteQuestId(null);
      return;
    }
    if (!selectedZoneEliteQuestId) return;
    const stillValid = zoneEliteMissionOptions.some(
      (mission) => mission.id === selectedZoneEliteQuestId,
    );
    if (!stillValid) setSelectedZoneEliteQuestId(null);
  }, [selectedQuest, selectedZoneEliteQuestId, zoneEliteMissionOptions]);
  const selectedZoneEliteQuest =
    selectedQuest?.type === "zone"
      ? zoneEliteMissionOptions.find((mission) => mission.id === selectedZoneEliteQuestId) ||
        null
      : null;
  useEffect(() => {
    if (!selectedZoneEliteQuest) return;
    setParty((currentIds) => {
      const memberById = new Map(roster.map((member) => [member.id, member]));
      const hasQuestStarter = currentIds.some((memberId) => {
        const member = memberById.get(memberId);
        return member && !hasCompletedZoneEliteQuest(member, selectedZoneEliteQuest);
      });
      if (hasQuestStarter) return currentIds;
      const nextIds = currentIds.filter((memberId) => {
        const member = memberById.get(memberId);
        return member && !hasCompletedZoneEliteQuest(member, selectedZoneEliteQuest);
      });
      return nextIds.length === currentIds.length ? currentIds : nextIds;
    });
  }, [roster, selectedZoneEliteQuest]);
  const activePrepMission = selectedZoneEliteQuest || chainStartMission || selectedQuest;
  const isSelectedZoneMission = activePrepMission?.type === "zone";

  const minLevel = activePrepMission
    ? isSelectedZoneMission
      ? 1
      : activePrepMission.minLevel || Math.max(1, activePrepMission.level - 6)
    : 1;
  const selectedMissionPartySize = isSelectedZoneMission
    ? 999
    : getMissionPartySize(activePrepMission);
  const selectedMissionMinPartySize = getMissionMinPartySize(
    activePrepMission,
  );
  useEffect(() => {
    if (isSelectedZoneMission) return;
    setParty((prev) =>
      prev.length <= selectedMissionPartySize
        ? prev
        : prev.slice(0, selectedMissionPartySize),
    );
  }, [isSelectedZoneMission, selectedMissionPartySize]);

  const activeMissionByMemberId = useMemo(() => {
    const missionMap = new Map();
    (Array.isArray(activeMissions) ? activeMissions : []).forEach((mission) => {
      (Array.isArray(mission?.memberIds) ? mission.memberIds : []).forEach(
        (memberId) => {
          const normalizedMemberId = String(memberId || "").trim();
          if (normalizedMemberId) missionMap.set(normalizedMemberId, mission);
        },
      );
    });
    return missionMap;
  }, [activeMissions]);

  const isPreparingDungeon = activePrepMission?.type === "dungeon";
  const isInterruptibleActiveMission = (mission) =>
    mission && mission.type !== "dungeon";
  const idleRoster = roster.filter((char) => {
    const activeMission = activeMissionByMemberId.get(String(char?.id || ""));
    if (isPreparingDungeon && isInterruptibleActiveMission(activeMission)) {
      return true;
    }
    return (
      char.status === "Idle" ||
      char.status.includes("Mining") ||
      char.status.includes("Herbs") ||
      char.status.includes("Skinning") ||
      char.status.includes("Forging") ||
      char.status.includes("Stitching") ||
      char.status.includes("Weaving") ||
      char.status.includes("Disenchanting") ||
      char.status.includes("Brewing")
    );
  });

  const eligibleRoster = idleRoster.filter((char) => char.level >= minLevel);
  const getDungeonAvailabilityParty = (mission, useProgressionRange = false) => {
    if (mission?.type !== "dungeon" || mission?.isRaid === true) return [];
    const targetPartySize = Math.max(5, getMissionMinPartySize(mission));
    const joinMinLevel = getMissionJoinMinLevel(mission);
    const progressionBounds = getMissionProgressionBounds(mission);
    const levelReadyRoster = idleRoster.filter((member) => {
      const level = Number(member?.level) || 1;
      if (level < joinMinLevel) return false;
      if (!useProgressionRange) return true;
      return (
        level >= progressionBounds.minLevel &&
        level <= progressionBounds.maxLevel
      );
    });
    const keyReadyRoster =
      mission?.requiresKeyForAllMembers === true
        ? levelReadyRoster.filter((member) => {
            const keys = Array.isArray(member?.keys) ? member.keys : [];
            return keys.some((keyId) => String(keyId) === String(mission.keyId));
          })
        : levelReadyRoster;

    if (keyReadyRoster.length < targetPartySize) return [];

    const partyMembers = [];
    if (mission?.requiresKey && mission?.requiresKeyForAllMembers !== true) {
      const keyHolder = keyReadyRoster.find((member) => {
        const keys = Array.isArray(member?.keys) ? member.keys : [];
        return keys.some((keyId) => String(keyId) === String(mission.keyId));
      });
      if (!keyHolder) return [];
      partyMembers.push(keyHolder);
    }

    keyReadyRoster.forEach((member) => {
      if (partyMembers.length >= targetPartySize) return;
      if (partyMembers.some((entry) => entry.id === member.id)) return;
      partyMembers.push(member);
    });

    if (partyMembers.length < targetPartySize) return [];
    const keyAccess = evaluateMissionKeyAccess({
      missions: [mission],
      partyMembers,
    });
    return keyAccess.canEnter ? partyMembers : [];
  };
  const canFormAvailableDungeonGroup = (mission) =>
    getDungeonAvailabilityParty(mission, false).length > 0;
  const hasInRangeDungeonGroup = (mission) =>
    getDungeonAvailabilityParty(mission, true).length > 0;
  const parsedCharacterFilterMin = Number(characterFilterMinLevel);
  const parsedCharacterFilterMax = Number(characterFilterMaxLevel);
  const hasCharacterFilterMin =
    characterFilterMinLevel !== "" &&
    Number.isFinite(parsedCharacterFilterMin) &&
    parsedCharacterFilterMin > 0;
  const hasCharacterFilterMax =
    characterFilterMaxLevel !== "" &&
    Number.isFinite(parsedCharacterFilterMax) &&
    parsedCharacterFilterMax > 0;
  const normalizedCharacterFilterMin = hasCharacterFilterMin
    ? Math.max(1, Math.floor(parsedCharacterFilterMin))
    : null;
  const normalizedCharacterFilterMax = hasCharacterFilterMax
    ? Math.max(1, Math.floor(parsedCharacterFilterMax))
    : null;
  const hasAnyCharacterLevelFilter = hasCharacterFilterMin || hasCharacterFilterMax;
  const tacticalCharacterRoster = useMemo(() => {
    const normalizedMinMax =
      normalizedCharacterFilterMin !== null && normalizedCharacterFilterMax !== null
        ? {
            min: Math.min(normalizedCharacterFilterMin, normalizedCharacterFilterMax),
            max: Math.max(normalizedCharacterFilterMin, normalizedCharacterFilterMax),
          }
        : {
            min: normalizedCharacterFilterMin ?? 1,
            max:
              normalizedCharacterFilterMax ?? Number.POSITIVE_INFINITY,
          };

    const filtered = idleRoster.filter((char) => {
      if (!hasAnyCharacterLevelFilter) return true;
      const charLevel = Number(char?.level) || 1;
      return charLevel >= normalizedMinMax.min && charLevel <= normalizedMinMax.max;
    });

    return [...filtered].sort((left, right) => {
      const leftLevel = Number(left?.level) || 1;
      const rightLevel = Number(right?.level) || 1;
      const leftItemLevel = getCharacterAverageItemLevel(left);
      const rightItemLevel = getCharacterAverageItemLevel(right);

      if (characterSortMode === TACTICAL_CHARACTER_SORT.LEVEL_ASC) {
        if (leftLevel !== rightLevel) return leftLevel - rightLevel;
        if (rightItemLevel !== leftItemLevel) return rightItemLevel - leftItemLevel;
      } else if (characterSortMode === TACTICAL_CHARACTER_SORT.ILVL_DESC) {
        if (rightItemLevel !== leftItemLevel) return rightItemLevel - leftItemLevel;
        if (rightLevel !== leftLevel) return rightLevel - leftLevel;
      } else if (characterSortMode === TACTICAL_CHARACTER_SORT.ILVL_ASC) {
        if (leftItemLevel !== rightItemLevel) return leftItemLevel - rightItemLevel;
        if (leftLevel !== rightLevel) return leftLevel - rightLevel;
      } else {
        if (rightLevel !== leftLevel) return rightLevel - leftLevel;
        if (rightItemLevel !== leftItemLevel) return rightItemLevel - leftItemLevel;
      }

      return String(left?.name || "").localeCompare(String(right?.name || ""));
    });
  }, [
    characterSortMode,
    hasAnyCharacterLevelFilter,
    idleRoster,
    normalizedCharacterFilterMax,
    normalizedCharacterFilterMin,
  ]);
  const getAdjustedMissionPreview = (mission, members) => {
    const preview = getMissionSuccessPreview(mission, members);
    const bonus = mission?.type === "dungeon" ? Math.max(0, dungeonSuccessBonus) : 0;
    const veteranCoverage = getMissionVeteranCoverage(mission, members);
    const moraleSuccessBonus =
      mission?.type === "dungeon" ? getPartyMoraleSuccessBonus(members) : 0;
    const relationshipSuccessModifier = getRelationshipSuccessModifier({
      relationships: guildRelationships,
      memberIds: members.map((member) => member?.id),
    });
    const adjustedSuccess = Math.min(
      100,
      Math.max(
        0,
        preview.successChance +
          bonus +
          veteranCoverage.successBonus +
          moraleSuccessBonus +
          relationshipSuccessModifier.successModifier,
      ),
    );
    return {
      ...preview,
      successChance: adjustedSuccess,
      failChance: Math.max(0, 100 - adjustedSuccess),
      focusSuccessBonus: bonus,
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
  };

  const selectedPartyMembers = roster.filter((char) => party.includes(char.id));
  const selectedPartyHasZoneEliteStarter =
    !selectedZoneEliteQuest ||
    selectedPartyMembers.some(
      (member) => !hasCompletedZoneEliteQuest(member, selectedZoneEliteQuest),
    );
  const selectedMissionSequence =
    selectedZoneEliteQuest
      ? [selectedZoneEliteQuest]
      : isChainEnabled && selectedChainMissions.length > 0
      ? selectedChainMissions
      : activePrepMission
        ? [activePrepMission]
        : [];
  const selectedMissionKeyAccess = evaluateMissionKeyAccess({
    missions: selectedMissionSequence,
    partyMembers: selectedPartyMembers,
  });
  const selectedMissionRequiredKeyIds = selectedMissionKeyAccess.requiredKeyIds;
  const selectedMissionRequiredKeyLabels = selectedMissionRequiredKeyIds.map(
    (keyId) => getKeyLabel(keyId) || keyId,
  );
  const selectedMissionRequiredKeySourceLabels = selectedMissionRequiredKeyIds
    .map((keyId) => getKeySourceQuestLabel(keyId))
    .filter(Boolean);
  const selectedMissionMissingKeyLabels = selectedMissionKeyAccess.missingKeyIds.map(
    (keyId) => getKeyLabel(keyId) || keyId,
  );
  const selectedMissionRewardKeyIds = getMissionRewardKeys(activePrepMission);
  const selectedMissionUnlockedRequiredKeyLabels =
    selectedMissionKeyAccess.unlockedRequiredKeyIds.map(
      (keyId) => getKeyLabel(keyId) || keyId,
    );
  const requiresAllMembersKey = Boolean(selectedMissionKeyAccess.requiresAllMembers);
  const memberHasAllRequiredKeys = useCallback(
    (member) => {
      if (selectedMissionRequiredKeyIds.length === 0) return true;
      const ownedKeys = Array.isArray(member?.keys)
        ? member.keys.map((keyId) => String(keyId || "").trim()).filter(Boolean)
        : [];
      return selectedMissionRequiredKeyIds.every((keyId) => ownedKeys.includes(keyId));
    },
    [selectedMissionRequiredKeyIds],
  );
  const keyEligibleRoster = useMemo(() => {
    if (selectedMissionRequiredKeyIds.length === 0) return eligibleRoster;
    if (!requiresAllMembersKey) return eligibleRoster;
    return eligibleRoster.filter((member) => memberHasAllRequiredKeys(member));
  }, [
    eligibleRoster,
    memberHasAllRequiredKeys,
    requiresAllMembersKey,
    selectedMissionRequiredKeyIds.length,
  ]);
  const keyHolderIdSet = useMemo(() => {
    const holderIds = new Set();
    if (selectedMissionRequiredKeyIds.length === 0) return holderIds;
    eligibleRoster.forEach((member) => {
      if (memberHasAllRequiredKeys(member)) holderIds.add(member.id);
    });
    return holderIds;
  }, [eligibleRoster, memberHasAllRequiredKeys, selectedMissionRequiredKeyIds.length]);
  const requiresAnyKeyHolder =
    selectedMissionRequiredKeyIds.length > 0 && !requiresAllMembersKey;
  const isKeyBlocked =
    selectedPartyMembers.length > 0 && !selectedMissionKeyAccess.canEnter;
  const isRaidPartySizeInvalid =
    Boolean(activePrepMission?.isRaid) && party.length < selectedMissionMinPartySize;
  const selectedRaidLockoutStatus = activePrepMission?.isRaid
    ? getRaidLockoutStatus({
        raidLockouts,
        mission: activePrepMission,
        currentDayIndex,
        memberIds: party,
      })
    : null;
  const isSelectedRaidCompletedLocked = Boolean(
    selectedRaidLockoutStatus?.isCompletedLocked,
  );
  const isSelectedRaidLockoutConflicted = Boolean(
    selectedRaidLockoutStatus?.hasLockoutConflict,
  );
  const isSelectedRaidWingLocked = Boolean(selectedRaidLockoutStatus?.isWingLocked);
  const missionPreview = activePrepMission
    ? getAdjustedMissionPreview(activePrepMission, selectedPartyMembers)
    : null;
  const shouldShowTacticalOdds = Boolean(missionPreview) && !isSelectedZoneMission;
  const selectedPartyRoleCounts = selectedPartyMembers.reduce(
    (acc, member) => {
      const role = member?.role;
      if (role === "Tank" || role === "Healer" || role === "DPS") {
        acc[role] += 1;
      }
      return acc;
    },
    { Tank: 0, Healer: 0, DPS: 0 },
  );
  const selectedRaidRoleRequirement =
    activePrepMission?.isRaid === true
      ? {
          Tank: Math.max(0, Number(activePrepMission?.raidRoleRequirement?.Tank) || 4),
          Healer: Math.max(
            0,
            Number(activePrepMission?.raidRoleRequirement?.Healer) || 8,
          ),
          DPS: Math.max(0, Number(activePrepMission?.raidRoleRequirement?.DPS) || 18),
        }
      : null;
  const selectedQuestEntryLevel = getMissionEntryLevel(activePrepMission);
  const selectedMissionBonusDropNotes = getMissionBonusDropNotes(activePrepMission);
  const selectedMissionRewardKeyLabels = getMissionRewardKeyLabels(activePrepMission);
  const selectedDungeonLootSource =
    activePrepMission?.type === "dungeon" ? getMissionLootSource(activePrepMission) : null;
  const selectedDungeonLootItems = useMemo(() => {
    if (!selectedDungeonLootSource) return [];
    return sortLootItems(
      DB_ITEMS.filter((item) => getItemSource(item) === selectedDungeonLootSource),
    );
  }, [selectedDungeonLootSource]);
  const selectedDungeonLootByQuality = useMemo(
    () => groupByQuality(selectedDungeonLootItems),
    [selectedDungeonLootItems],
  );

  const orderedMissions = [...availableMissionList].sort((left, right) => {
    if ((left?.level || 0) !== (right?.level || 0)) return (left?.level || 0) - (right?.level || 0);
    return String(left?.name || "").localeCompare(String(right?.name || ""));
  });
  const parsedLevelFilterMin = Number(levelFilterMin);
  const parsedLevelFilterMax = Number(levelFilterMax);
  const hasMinLevelFilter =
    levelFilterMin !== "" &&
    Number.isFinite(parsedLevelFilterMin) &&
    parsedLevelFilterMin > 0;
  const hasMaxLevelFilter =
    levelFilterMax !== "" &&
    Number.isFinite(parsedLevelFilterMax) &&
    parsedLevelFilterMax > 0;
  const activeLevelFilterMin = hasMinLevelFilter
    ? Math.max(1, Math.floor(parsedLevelFilterMin))
    : null;
  const activeLevelFilterMax = hasMaxLevelFilter
    ? Math.max(1, Math.floor(parsedLevelFilterMax))
    : null;
  const hasAnyLevelFilter = hasMinLevelFilter || hasMaxLevelFilter;
  const normalizedLevelFilter = (() => {
    if (!hasAnyLevelFilter) return null;
    if (activeLevelFilterMin !== null && activeLevelFilterMax !== null) {
      return {
        minLevel: Math.min(activeLevelFilterMin, activeLevelFilterMax),
        maxLevel: Math.max(activeLevelFilterMin, activeLevelFilterMax),
      };
    }
    if (activeLevelFilterMin !== null) {
      return { minLevel: activeLevelFilterMin, maxLevel: Number.POSITIVE_INFINITY };
    }
    return { minLevel: 1, maxLevel: activeLevelFilterMax };
  })();
  const filteredOrderedMissions = orderedMissions.filter((mission) => {
    if (hasAnyLevelFilter) {
      if (!normalizedLevelFilter) return true;
      const missionBounds = getMissionLevelBounds(mission);
      if (
        missionBounds.maxLevel < normalizedLevelFilter.minLevel ||
        missionBounds.minLevel > normalizedLevelFilter.maxLevel
      ) {
        return false;
      }
    }

    if (mission?.type === "dungeon" && mission?.isRaid !== true) {
      if (showAvailableDungeonsOnly && !canFormAvailableDungeonGroup(mission)) {
        return false;
      }
      if (hideLowLevelDungeons && !hasInRangeDungeonGroup(mission)) {
        return false;
      }
    }

    return true;
  });

  const missionEligibilityById = useMemo(() => {
    const totalRoster = roster.length;
    const eligibilityMap = new Map();

    availableMissionList.forEach((mission) => {
      const rangeBounds = getMissionProgressionBounds(mission);
      const minJoinLevel = getMissionJoinMinLevel(mission);
      let inRangeCount = 0;
      let xpReadyCount = 0;

      roster.forEach((char) => {
        const level = Number(char?.level) || 1;
        const canJoin = level >= minJoinLevel;
        const inRange =
          level >= rangeBounds.minLevel && level <= rangeBounds.maxLevel;

        if (inRange) inRangeCount += 1;

        if (!canJoin || level >= CONFIG.LEVEL_CAP) return;
        if (
          mission.type === "dungeon" &&
          getDungeonOverlevelExpMultiplier(level, mission) <= 0
        ) {
          return;
        }
        xpReadyCount += 1;
      });

      eligibilityMap.set(mission.id, {
        totalRoster,
        inRangeCount,
        xpReadyCount,
      });
    });

    return eligibilityMap;
  }, [availableMissionList, roster]);

  const missionSections =
    selectedCategory === "all"
      ? [
          {
            key: "zone",
            title: "Zones",
            icon: "🧭",
            missions: filteredOrderedMissions.filter(
              (mission) => getMissionCategory(mission) === "zone",
            ),
          },
          {
            key: "dungeon",
            title: "Dungeons",
            icon: "🏰",
            missions: filteredOrderedMissions.filter(
              (mission) => getMissionCategory(mission) === "dungeon",
            ),
          },
          {
            key: "raid",
            title: "Raids",
            icon: "🔥",
            missions: filteredOrderedMissions.filter(
              (mission) => getMissionCategory(mission) === "raid",
            ),
          },
          {
            key: "legacy",
            title: "Legacy",
            icon: "📚",
            missions: filteredOrderedMissions.filter(
              (mission) => getMissionCategory(mission) === "legacy",
            ),
          },
        ]
          .filter((section) =>
            showLegacyQuests
              ? true
              : section.key !== "legacy",
          )
          .filter((section) => section.missions.length > 0)
      : [
          {
            key: selectedCategory,
            title: CATEGORY_LABELS[selectedCategory],
            icon:
              selectedCategory === "raid"
                ? "🔥"
                : selectedCategory === "dungeon"
                  ? "🏰"
                  : selectedCategory === "zone"
                    ? "🧭"
                    : selectedCategory === "legacy"
                      ? "📚"
                      : "📜",
            missions: filteredOrderedMissions.filter(
              (mission) => getMissionCategory(mission) === selectedCategory,
            ),
          },
        ];

  const factionMissionIconUrl = getWowIconUrl(
    FACTION_MISSION_ICON[guildFaction] || FACTION_MISSION_ICON[GUILD_FACTION.ALLIANCE],
  );

  const toggleDungeonGroup = (groupKey) => {
    setExpandedDungeonGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const toggleChainMission = (missionId) => {
    setSelectedChainMissionIds((prev) => {
      if (!Array.isArray(prev)) return [missionId];
      if (missionId === selectedQuest?.id) return prev;
      if (prev.includes(missionId)) return prev.filter((id) => id !== missionId);
      return [...prev, missionId];
    });
  };

  const deployButtonLabel =
    selectedQuest?.type === "zone" && selectedZoneEliteQuest
      ? "Deploy Zone Elite"
      : isSelectedZoneMission
        ? "Assign Zone"
        : isChainEnabled && selectedChainMissions.length > 1
          ? `Start Chain (${selectedChainMissions.length})`
          : "Deploy";

  const isDeployDisabled =
    party.length === 0 ||
    isKeyBlocked ||
    !selectedPartyHasZoneEliteStarter ||
    isRaidPartySizeInvalid ||
    isSelectedRaidCompletedLocked ||
    isSelectedRaidLockoutConflicted ||
    isSelectedRaidWingLocked;

  const handleDeploySelectedMission = () => {
    if (isDeployDisabled) return;
    if (isKeyBlocked) return;
    const missionToDeploy = selectedZoneEliteQuest || selectedQuest;
    const chainMissionIds =
      !selectedZoneEliteQuest && isChainEnabled && selectedChainMissions.length > 1
        ? selectedChainMissions.map((mission) => mission.id)
        : null;
    onDeploy(
      missionToDeploy,
      party,
      chainMissionIds ? { chainMissionIds } : undefined,
    );
    onClose();
  };

  const renderMissionCard = (mission, showSetName = true) => {
    const isZoneMissionCard = mission?.type === "zone";
    const zone = isZoneMissionCard ? getZoneById(mission?.zoneId) : null;
    const zoneLootEntries = isZoneMissionCard ? getZoneLootCountEntries(zone) : [];
    const zoneKeyRewardLabels = isZoneMissionCard
      ? getZoneEliteKeyRewardLabels(zone?.id)
      : [];
    const zoneFactionIconUrl =
      zone?.faction && FACTION_MISSION_ICON[zone.faction]
        ? getWowIconUrl(FACTION_MISSION_ICON[zone.faction])
        : null;
    const eligibility = missionEligibilityById.get(mission.id) || {
      totalRoster: roster.length,
      inRangeCount: 0,
      xpReadyCount: 0,
    };
    const bonusDropNotes = getMissionBonusDropNotes(mission);
    const rewardKeyLabels = getMissionRewardKeyLabels(mission);
    const requiredKeyLabels = getMissionRequiredKeys(mission)
      .map((keyId) => getKeyLabel(keyId) || keyId)
      .filter(Boolean);
    const requiredKeySourceLabels = getMissionRequiredKeySourceLabels(mission);
    const missionWipeCost = getMissionWipeCost(mission);
    const raidLockoutStatus = mission?.isRaid
      ? getRaidLockoutStatus({
          raidLockouts,
          mission,
          currentDayIndex,
        })
      : null;
    const activeRaidLockouts = raidLockoutStatus?.activeLockouts || [];
    const inRangeBounds = getMissionProgressionBounds(mission);
    const inRangeReferenceLevel = Math.max(
      inRangeBounds.minLevel,
      Math.min(
        inRangeBounds.maxLevel,
        Math.max(1, Number(mission?.level) || inRangeBounds.minLevel),
      ),
    );
    const inRangeMissionExpPerHero = getMissionExpForMember(mission, {
      level: inRangeReferenceLevel,
    });
    const missionExpLabel = formatXpRewardText(inRangeMissionExpPerHero);

    return (
      <div
        key={mission.id}
        onClick={() => handleSelectQuest(mission)}
        className={`relative overflow-hidden p-4 rounded flex justify-between items-center bg-gray-800 transition-transform border border-transparent cursor-pointer active:bg-gray-700 hover:translate-x-1 hover:border-blue-500 ${mission.type === "dungeon" ? "border-l-4 border-l-blue-600" : mission.type === "zone" ? "border-l-4 border-l-emerald-600" : ""}`}
      >
        {isZoneMissionCard &&
          zone?.faction !== ZONE_FACTION.NEUTRAL &&
          zoneFactionIconUrl && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <img
                src={zoneFactionIconUrl}
                alt={zone.faction}
                className="w-24 h-24 md:w-28 md:h-28 object-cover opacity-20"
                onError={(event) => {
                  event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
                }}
              />
            </div>
          )}
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-2xl bg-gray-900 w-10 h-10 flex items-center justify-center rounded border border-gray-700">
            {mission.type === "dungeon"
              ? "🏰"
              : mission.type === "zone"
                ? "🧭"
                : mission.elite
                  ? "⚔️"
                  : "📜"}
          </div>
          <div className="min-w-0">
            <div className={`font-bold text-lg ${mission.elite ? "text-yellow-500" : "text-gray-200"}`}>
              {getMissionDisplayName(mission)}
            </div>
            {showSetName && mission.type === "dungeon" && mission.dungeonSetName && (
              <div className="text-[11px] text-blue-300/80 -mt-0.5 mb-0.5">{mission.dungeonSetName}</div>
            )}
            <div className="text-sm text-gray-500">{getMissionMetaText(mission)}</div>
            {mission.type !== "zone" && (
              <div className="text-xs text-red-300/80 mt-0.5">
                Base fail chance: {getMissionBaseFailChance(mission)}%
              </div>
            )}
            {mission.type === "dungeon" && (
              <div className="text-xs text-amber-200/80 mt-0.5">
                Attempts: {getMissionMaxAttempts(mission)}
              </div>
            )}
            {mission.isRaid && (
              <div
                className="text-xs mt-0.5 text-emerald-200/85"
              >
                {formatRaidResetSchedule(mission)}
                {activeRaidLockouts.length > 0
                  ? ` - Active IDs: ${activeRaidLockouts
                      .map(
                        (lockout) =>
                          `ID ${lockout.displayId} (${lockout.clearedSteps}/${lockout.totalBosses}${lockout.completed ? ", cleared" : ""})`,
                      )
                      .join(", ")}`
                  : ""}
              </div>
            )}
            {mission.isRaid && raidLockoutStatus?.isWingLocked && (
              <div className="text-xs text-rose-300/85 mt-0.5 font-semibold">
                Locked: clear {raidLockoutStatus.missingRequiredWingLabels.join(", ")} first.
              </div>
            )}
            {mission.type === "dungeon" && missionWipeCost > 0 && (
              <div className="text-xs text-rose-200/85 mt-0.5">
                Wipe Cost: {missionWipeCost}g / wipe
              </div>
            )}
            {isZoneMissionCard ? (
              <div className="text-xs text-emerald-300 mt-1">
                Zone rewards: up to {getMissionGoldReward(mission)}g • Loot:{" "}
                {renderLootCountLabel(zoneLootEntries, `zone-card-loot-${mission.id}`)}
              </div>
            ) : (
              <div className="text-xs text-yellow-400 mt-1">
                Rewards: {getMissionGoldReward(mission)}g • {missionExpLabel} XP / hero{" "}
                {" • "}
                Loot:{" "}
                {getMissionRewardQualities(mission).map((quality, idx, arr) => (
                  <React.Fragment key={`${mission.id}-${quality}-${idx}`}>
                    <span className={getQualityClass(quality)}>[{getQualityLabel(quality)}]</span>
                    {idx < arr.length - 1 && <span className="text-gray-500"> + </span>}
                  </React.Fragment>
                ))}
              </div>
            )}
            {isZoneMissionCard && zoneKeyRewardLabels.length > 0 && (
              <div className="text-xs text-amber-300 mt-0.5">
                Zone key quest available: [{zoneKeyRewardLabels.join("] + [")}]
              </div>
            )}
            {rewardKeyLabels.length > 0 && (
              <div className="text-xs text-amber-300 mt-0.5">
                Key Reward:{" "}
                {rewardKeyLabels.map((label, idx) => (
                  <React.Fragment key={`${mission.id}-key-${label}`}>
                    <span className="text-yellow-200">[{label}]</span>
                    {idx < rewardKeyLabels.length - 1 && (
                      <span className="text-gray-500"> + </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
            {rewardKeyLabels.length > 0 && (
              <div className="text-xs text-amber-200 mt-0.5 font-semibold">
                Primary Reward: [{rewardKeyLabels.join("] + [")}] +{" "}
                {getMissionRewardQualities(mission).map((quality, idx, arr) => (
                  <React.Fragment key={`${mission.id}-key-objective-${quality}-${idx}`}>
                    <span className={getQualityClass(quality)}>[{getQualityLabel(quality)} item]</span>
                    {idx < arr.length - 1 && <span className="text-gray-500"> + </span>}
                  </React.Fragment>
                ))}
              </div>
            )}
            {requiredKeyLabels.length > 0 && (
              <div className="text-xs text-rose-300 mt-0.5 font-semibold">
                Requires Key:{" "}
                {requiredKeyLabels.map((label, idx) => (
                  <React.Fragment key={`${mission.id}-required-key-${label}`}>
                    <span className="text-rose-200">[{label}]</span>
                    {idx < requiredKeyLabels.length - 1 && (
                      <span className="text-gray-500"> + </span>
                    )}
                  </React.Fragment>
                ))}
                {requiredKeySourceLabels.length > 0 && (
                  <span className="text-rose-200/85 font-normal">
                    {" "}
                    (Quest: {requiredKeySourceLabels.join(" / ")})
                  </span>
                )}
              </div>
            )}
            {bonusDropNotes.map((note, index) => (
              <div
                key={`${mission.id}-bonus-drop-${index}`}
                className="text-[11px] text-purple-300/85 mt-0.5"
              >
                Bonus Drop: {note}
              </div>
            ))}
          </div>
        </div>
        <div className="ml-3 flex-none text-right">
          <div className="inline-flex items-center gap-1 rounded border border-cyan-800 bg-cyan-950/30 px-2 py-1">
            <img
              src={factionMissionIconUrl}
              alt={guildFaction}
              className="w-3.5 h-3.5 rounded-sm border border-cyan-900/60 object-cover"
              onError={(event) => {
                event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
              }}
            />
            <span className="text-xs font-bold text-cyan-100">
              {eligibility.inRangeCount}
            </span>
          </div>
          <div className="text-[10px] text-cyan-200/80 mt-1 whitespace-nowrap">
            Characters in Level Range
          </div>
          <div className="text-[10px] text-gray-400">
            XP-ready: {eligibility.xpReadyCount}
          </div>
        </div>
      </div>
    );
  };

  const getMissionExpForMember = (mission, member) => {
    if (!mission || !member) return 0;
    if (member.level >= CONFIG.LEVEL_CAP) return 0;

    const baseExp =
      mission.type === "dungeon"
        ? mission.exp * getDungeonOverlevelExpMultiplier(member.level, mission)
        : mission.exp;
    const levelCurveExpMultiplier = getMissionLevelExpMultiplier(
      member.level,
      mission,
    );

    return Math.max(
      0,
      Math.floor(baseExp * levelCurveExpMultiplier * guildExpMultiplier),
    );
  };

  const handleAutoSelectParty = () => {
    if (!activePrepMission) return;
    if (isSelectedZoneMission) {
      const zoneSelection = [...new Set(keyEligibleRoster.map((member) => member.id))];
      setParty(zoneSelection);
      setAutoAssignSummary(
        `${AUTO_SELECT_MODE_LABEL[autoSelectMode]} • ${zoneSelection.length} heroes selected for zone assignment`,
      );
      return;
    }

    const getSupportScore = (member) =>
      member.level * 3 + getCharacterAverageItemLevel(member);
    const compareMembersByMode = (left, right) => {
      const expDiff =
        getMissionExpForMember(activePrepMission, right) -
        getMissionExpForMember(activePrepMission, left);
      const supportDiff = getSupportScore(right) - getSupportScore(left);

      if (autoSelectMode === AUTO_SELECT_MODES.MAX_SUCCESS) {
        if (supportDiff !== 0) return supportDiff;
        if (expDiff !== 0) return expDiff;
        return (Number(right.level) || 1) - (Number(left.level) || 1);
      }
      if (autoSelectMode === AUTO_SELECT_MODES.BOOST_LOW_LEVEL) {
        const levelDiff = (Number(left.level) || 1) - (Number(right.level) || 1);
        if (levelDiff !== 0) return levelDiff;
        if (expDiff !== 0) return expDiff;
        return supportDiff;
      }
      if (expDiff !== 0) return expDiff;
      if (supportDiff !== 0) return supportDiff;
      return (Number(right.level) || 1) - (Number(left.level) || 1);
    };

    const missionBounds = getMissionProgressionBounds(activePrepMission);
    const inRangeEligibleRoster = keyEligibleRoster.filter((member) => {
      const level = Number(member?.level) || 1;
      return level >= missionBounds.minLevel && level <= missionBounds.maxLevel;
    });

    if (autoSelectMode === AUTO_SELECT_MODES.IN_LEVEL_RANGE) {
      if (inRangeEligibleRoster.length === 0) {
        setParty([]);
        const message = "No character in level range.";
        setAutoAssignSummary(message);
        if (typeof onNotify === "function") {
          onNotify({
            type: "error",
            title: "Auto-Select",
            message,
            durationMs: 3000,
          });
        }
        return;
      }

      const targetInRangePartySize = Math.min(
        selectedMissionPartySize,
        inRangeEligibleRoster.length,
      );
      let inRangeSelection = [...inRangeEligibleRoster]
        .sort(compareMembersByMode)
        .slice(0, targetInRangePartySize);
      if (requiresAnyKeyHolder && !inRangeSelection.some((member) => keyHolderIdSet.has(member.id))) {
        const keyHolderInRange = inRangeEligibleRoster.find((member) =>
          keyHolderIdSet.has(member.id),
        );
        if (!keyHolderInRange) {
          setParty([]);
          const message = "No key holder in level range.";
          setAutoAssignSummary(message);
          if (typeof onNotify === "function") {
            onNotify({
              type: "error",
              title: "Auto-Select",
              message,
              durationMs: 3000,
            });
          }
          return;
        }
        if (inRangeSelection.length === 0) inRangeSelection = [keyHolderInRange];
        else inRangeSelection[inRangeSelection.length - 1] = keyHolderInRange;
      }

      const preview = getAdjustedMissionPreview(activePrepMission, inRangeSelection);
      const expValues = inRangeSelection.map((member) =>
        getMissionExpForMember(activePrepMission, member),
      );
      const totalExp = expValues.reduce((sum, exp) => sum + exp, 0);
      const expEligibleCount = expValues.filter((exp) => exp > 0).length;
      const weightedExp = Math.floor(totalExp * (preview.successChance / 100));

      setParty(inRangeSelection.map((member) => member.id));
      setAutoAssignSummary(
        `${AUTO_SELECT_MODE_LABEL[autoSelectMode]} • ${inRangeSelection.length} heroes • Success ${preview.successChance}% • XP-ready ${expEligibleCount}/${inRangeSelection.length} • XP ${totalExp} (expected ${weightedExp})`,
      );
      return;
    }

    if (keyEligibleRoster.length === 0) {
      setParty([]);
      setAutoAssignSummary("No eligible heroes available for this mission.");
      return;
    }

    if (activePrepMission?.isRaid === true || selectedMissionPartySize > 5) {
      const targetPartySize = Math.min(selectedMissionPartySize, keyEligibleRoster.length);
      if (targetPartySize <= 0) {
        setParty([]);
        setAutoAssignSummary("No eligible heroes available for this mission.");
        return;
      }

      const rankedPool = [...keyEligibleRoster].sort(compareMembersByMode);
      const selectedMembers = [];
      const selectedMemberIds = new Set();
      const tryAddMember = (member) => {
        if (!member || selectedMemberIds.has(member.id)) return;
        if (selectedMembers.length >= targetPartySize) return;
        selectedMembers.push(member);
        selectedMemberIds.add(member.id);
      };

      const raidRequirement = {
        Tank: Math.max(0, Number(activePrepMission?.raidRoleRequirement?.Tank) || 4),
        Healer: Math.max(0, Number(activePrepMission?.raidRoleRequirement?.Healer) || 8),
        DPS: Math.max(0, Number(activePrepMission?.raidRoleRequirement?.DPS) || 18),
      };
      ["Tank", "Healer", "DPS"].forEach((role) => {
        const rolePool = rankedPool.filter((member) => member.role === role);
        const requiredRoleCount = Math.min(
          raidRequirement[role],
          rolePool.length,
          targetPartySize - selectedMembers.length,
        );
        for (let index = 0; index < requiredRoleCount; index += 1) {
          tryAddMember(rolePool[index]);
        }
      });

      rankedPool.forEach((member) => tryAddMember(member));

      if (requiresAnyKeyHolder && !selectedMembers.some((member) => keyHolderIdSet.has(member.id))) {
        const fallbackKeyHolder = rankedPool.find((member) =>
          keyHolderIdSet.has(member.id),
        );
        if (!fallbackKeyHolder) {
          setParty([]);
          setAutoAssignSummary("Auto-select could not find a squad with a key holder.");
          return;
        }
        if (selectedMembers.length < targetPartySize) {
          tryAddMember(fallbackKeyHolder);
        } else {
          const replaceIndex = [...selectedMembers]
            .reverse()
            .findIndex((member) => !keyHolderIdSet.has(member.id));
          if (replaceIndex >= 0) {
            const actualIndex = selectedMembers.length - 1 - replaceIndex;
            selectedMemberIds.delete(selectedMembers[actualIndex].id);
            selectedMembers[actualIndex] = fallbackKeyHolder;
            selectedMemberIds.add(fallbackKeyHolder.id);
          }
        }
      }

      const preview = getAdjustedMissionPreview(activePrepMission, selectedMembers);
      const memberExpValues = selectedMembers.map((member) =>
        getMissionExpForMember(activePrepMission, member),
      );
      const expEligibleCount = memberExpValues.filter((exp) => exp > 0).length;
      const totalExp = memberExpValues.reduce((sum, exp) => sum + exp, 0);
      const weightedExp = Math.floor(totalExp * (preview.successChance / 100));

      setParty(selectedMembers.map((member) => member.id));
      setAutoAssignSummary(
        `${AUTO_SELECT_MODE_LABEL[autoSelectMode]} • ${selectedMembers.length}/${selectedMissionPartySize} heroes • Success ${preview.successChance}% • XP-ready ${expEligibleCount}/${selectedMembers.length} • XP ${totalExp} (expected ${weightedExp})`,
      );
      return;
    }

    const byExp = [...keyEligibleRoster].sort((left, right) => {
      const expDiff =
        getMissionExpForMember(activePrepMission, right) -
        getMissionExpForMember(activePrepMission, left);
      if (expDiff !== 0) return expDiff;
      return getSupportScore(right) - getSupportScore(left);
    });

    const byLowLevel = [...keyEligibleRoster].sort((left, right) => {
      if (left.level !== right.level) return left.level - right.level;
      const expDiff =
        getMissionExpForMember(activePrepMission, right) -
        getMissionExpForMember(activePrepMission, left);
      if (expDiff !== 0) return expDiff;
      return getSupportScore(right) - getSupportScore(left);
    });

    const bySupport = [...keyEligibleRoster].sort(
      (left, right) => getSupportScore(right) - getSupportScore(left),
    );

    const candidatePoolMap = new Map();
    const candidateSeed =
      autoSelectMode === AUTO_SELECT_MODES.BOOST_LOW_LEVEL
        ? [...byLowLevel.slice(0, 12), ...bySupport.slice(0, 8)]
        : autoSelectMode === AUTO_SELECT_MODES.MAX_SUCCESS
          ? [...bySupport.slice(0, 15), ...byExp.slice(0, 8)]
          : [...byExp.slice(0, 12), ...bySupport.slice(0, 12)];

    candidateSeed.forEach((member) => {
      candidatePoolMap.set(member.id, member);
    });

    if (candidatePoolMap.size === 0) {
      setAutoAssignSummary("Auto-select could not find a valid squad.");
      return;
    }

    const candidatePool = [...candidatePoolMap.values()].slice(0, 20);
    const maxPartySize = Math.min(selectedMissionPartySize, candidatePool.length);
    const allCandidates = [];

    const evaluateSelection = (members) => {
      if (members.length === 0) return;

      const preview = getAdjustedMissionPreview(activePrepMission, members);
      const memberExpValues = members.map((member) =>
        getMissionExpForMember(activePrepMission, member),
      );
      const expEligibleCount = memberExpValues.filter((exp) => exp > 0).length;
      const totalExp = memberExpValues.reduce((sum, exp) => sum + exp, 0);
      const weightedExp = Math.floor(totalExp * (preview.successChance / 100));
      const lowLevelBoostScore = members.reduce((sum, member, index) => {
        if (memberExpValues[index] <= 0) return sum;
        const level = Math.max(1, Number(member.level) || 1);
        return sum + (CONFIG.LEVEL_CAP + 1 - level);
      }, 0);

      allCandidates.push({
        memberIds: members.map((member) => member.id),
        successChance: preview.successChance,
        totalExp,
        weightedExp,
        lowLevelBoostScore,
        expEligibleCount,
        allGainExp: expEligibleCount === members.length,
        hasAnyKeyHolder:
          !requiresAnyKeyHolder ||
          members.some((member) => keyHolderIdSet.has(member.id)),
        hasZoneEliteStarter:
          !selectedZoneEliteQuest ||
          members.some(
            (member) =>
              !hasCompletedZoneEliteQuest(member, selectedZoneEliteQuest),
          ),
        partySize: members.length,
      });
    };

    const activeSelection = [];
    const walkCombinations = (startIndex, targetSize) => {
      if (activeSelection.length === targetSize) {
        evaluateSelection(activeSelection);
        return;
      }

      for (let index = startIndex; index < candidatePool.length; index += 1) {
        activeSelection.push(candidatePool[index]);
        walkCombinations(index + 1, targetSize);
        activeSelection.pop();
      }
    };

    for (let partySize = 1; partySize <= maxPartySize; partySize += 1) {
      walkCombinations(0, partySize);
    }

    if (allCandidates.length === 0) {
      setAutoAssignSummary("Auto-select could not find a valid squad.");
      return;
    }

    const maxTotalExp = allCandidates.reduce(
      (best, candidate) => Math.max(best, candidate.totalExp),
      0,
    );
    const expFloor = maxTotalExp > 0 ? Math.floor(maxTotalExp * 0.9) : 0;

    let selectionPool = allCandidates;
    if (selectedZoneEliteQuest) {
      selectionPool = selectionPool.filter(
        (candidate) => candidate.hasZoneEliteStarter,
      );
      if (selectionPool.length === 0) {
        setAutoAssignSummary(
          "Auto-select needs at least one hero who has not completed this elite quest.",
        );
        return;
      }
    }
    if (requiresAnyKeyHolder) {
      const withKeyHolder = selectionPool.filter((candidate) => candidate.hasAnyKeyHolder);
      if (withKeyHolder.length === 0) {
        setAutoAssignSummary("Auto-select could not find a squad with a key holder.");
        return;
      }
      selectionPool = withKeyHolder;
    }
    if (autoSelectMode === AUTO_SELECT_MODES.OPTIMIZED_EXP) {
      selectionPool = allCandidates.filter((candidate) => candidate.totalExp >= expFloor);
      if (requiresAnyKeyHolder) {
        selectionPool = selectionPool.filter((candidate) => candidate.hasAnyKeyHolder);
      }
    }

    if (autoSelectMode === AUTO_SELECT_MODES.BOOST_LOW_LEVEL) {
      const perfectSuccessPool = selectionPool.filter(
        (candidate) => candidate.successChance >= 100,
      );
      if (perfectSuccessPool.length > 0) selectionPool = perfectSuccessPool;
    }

    const bestCandidate = [...selectionPool].sort((left, right) => {
      if (autoSelectMode === AUTO_SELECT_MODES.MAX_SUCCESS) {
        if (right.successChance !== left.successChance) {
          return right.successChance - left.successChance;
        }
        if (right.weightedExp !== left.weightedExp) {
          return right.weightedExp - left.weightedExp;
        }
        if (right.totalExp !== left.totalExp) {
          return right.totalExp - left.totalExp;
        }
      } else if (autoSelectMode === AUTO_SELECT_MODES.BOOST_LOW_LEVEL) {
        if (right.lowLevelBoostScore !== left.lowLevelBoostScore) {
          return right.lowLevelBoostScore - left.lowLevelBoostScore;
        }
        if (right.expEligibleCount !== left.expEligibleCount) {
          return right.expEligibleCount - left.expEligibleCount;
        }
        if (right.successChance !== left.successChance) {
          return right.successChance - left.successChance;
        }
        if (right.weightedExp !== left.weightedExp) {
          return right.weightedExp - left.weightedExp;
        }
      } else {
        if (right.weightedExp !== left.weightedExp) {
          return right.weightedExp - left.weightedExp;
        }
        if (right.totalExp !== left.totalExp) {
          return right.totalExp - left.totalExp;
        }
        if (right.successChance !== left.successChance) {
          return right.successChance - left.successChance;
        }
      }

      if (Number(right.allGainExp) !== Number(left.allGainExp)) {
        return Number(right.allGainExp) - Number(left.allGainExp);
      }
      if (right.expEligibleCount !== left.expEligibleCount) {
        return right.expEligibleCount - left.expEligibleCount;
      }
      return right.partySize - left.partySize;
    })[0];

    setParty(bestCandidate.memberIds);
    const successLabel =
      bestCandidate.successChance >= 100 ? "100%" : `${bestCandidate.successChance}%`;
    setAutoAssignSummary(
      `${AUTO_SELECT_MODE_LABEL[autoSelectMode]} • ${bestCandidate.partySize} heroes • Success ${successLabel} • XP-ready ${bestCandidate.expEligibleCount}/${bestCandidate.partySize} • XP ${bestCandidate.totalExp} (expected ${bestCandidate.weightedExp})`,
    );
  };

  const prepSummaryHeightClass =
    selectedQuest?.type === "zone"
      ? "max-h-[34vh] md:max-h-[36vh]"
      : "max-h-[38vh] md:max-h-[44vh]";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-blue-900 rounded-none md:rounded-lg w-full max-w-4xl h-full md:h-[90vh] flex flex-col relative shadow-2xl"
    >
      <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center flex-none">
        <h2 className="text-xl md:text-2xl fantasy-font text-blue-400">
          {view === "list" ? "Mission Board" : "Tactical Map"}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-3xl px-2"
        >
          &times;
        </button>
      </div>
      {view === "list" && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-3 pb-2 border-b border-gray-700 bg-gray-900/80">
            <div className="flex items-center gap-2 flex-wrap">
              {categoryFilterOptions.map((category) => {
                const isRaidCategory = category === "raid";
                const isLocked = isRaidCategory && !isRaidUnlocked;
                return (
                  <button
                    key={category}
                    onClick={() => {
                      if (isLocked) return;
                      setSelectedCategory(category);
                    }}
                    disabled={isLocked}
                    title={isLocked ? "Unlock Raid Attunement in Guild Talents" : undefined}
                    className={`px-3 py-1 text-xs rounded border transition-colors ${selectedCategory === category ? "border-blue-500 bg-blue-900/40 text-blue-200" : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"} ${isLocked ? "opacity-45 cursor-not-allowed hover:bg-gray-800" : ""}`}
                  >
                    {CATEGORY_LABELS[category]}
                    {isLocked ? " (Locked)" : ""}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-[11px] text-gray-300">
                <span className="block mb-1 uppercase tracking-wide text-gray-500">
                  Min Level
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={levelFilterMin}
                  onChange={(event) => setLevelFilterMin(event.target.value)}
                  className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
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
                  value={levelFilterMax}
                  onChange={(event) => setLevelFilterMax(event.target.value)}
                  className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
                  placeholder="Any"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setLevelFilterMin("");
                  setLevelFilterMax("");
                }}
                disabled={!hasAnyLevelFilter}
                className="h-[30px] px-3 rounded border border-gray-600 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowAvailableDungeonsOnly((prev) => !prev)}
                className={`h-[30px] px-3 rounded border text-xs font-semibold transition-colors ${
                  showAvailableDungeonsOnly
                    ? "border-emerald-500 bg-emerald-900/40 text-emerald-100"
                    : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
                title="Only show dungeons where idle heroes can currently form an eligible group."
              >
                Available Dungeons
              </button>
              <button
                type="button"
                onClick={() => setHideLowLevelDungeons((prev) => !prev)}
                className={`h-[30px] px-3 rounded border text-xs font-semibold transition-colors ${
                  hideLowLevelDungeons
                    ? "border-amber-500 bg-amber-900/30 text-amber-100"
                    : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
                title="Hide dungeons where idle heroes are already outside the recommended level range."
              >
                Hide Low Level
              </button>
              <span className="text-xs text-gray-500 ml-auto">
                Showing {filteredOrderedMissions.length}/{orderedMissions.length}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {missionSections.length === 0 ? (
              <div className="text-center text-gray-500 italic py-10">
                No missions in this category.
              </div>
            ) : (
              <div className="space-y-5">
                {missionSections.map((section) => (
                  <section key={section.key} className="space-y-2">
                    <div className="px-1 flex items-center justify-between">
                      <h3 className="text-xs md:text-sm uppercase tracking-wider text-gray-300 font-bold">
                        {section.icon} {section.title}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {section.missions.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {section.key === "dungeon" ? (
                        getDungeonMissionGroups(section.missions).map((group) => {
                          if (group.type !== "set") {
                            return renderMissionCard(group.missions[0], true);
                          }

                          const isExpanded = Boolean(expandedDungeonGroups[group.key]);
                          const levelRangeLabel = getDungeonGroupLevelRangeLabel(group.missions);
                          return (
                            <div
                              key={group.key}
                              className="rounded border border-blue-900/50 bg-gray-900/30"
                            >
                              <button
                                type="button"
                                onClick={() => toggleDungeonGroup(group.key)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-blue-950/20 transition-colors"
                              >
                                <div className="min-w-0">
                                  <div className="text-sm uppercase tracking-wider text-blue-200 font-bold">
                                    {group.name}
                                  </div>
                                  <div className="text-[11px] text-blue-200/80">
                                    Dungeon Set • Lvl {levelRangeLabel}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-blue-200/90">
                                  <span>{group.missions.length} wings</span>
                                  <span className="text-lg leading-none">
                                    {isExpanded ? "▾" : "▸"}
                                  </span>
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="px-2 pb-2 space-y-2">
                                  {group.missions.map((mission) =>
                                    renderMissionCard(mission, false),
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        section.missions.map((mission) => renderMissionCard(mission, true))
                      )}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {view === "prep" && selectedQuest && (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-800 overflow-hidden">
          <div
            className={`bg-gray-900 p-4 md:p-6 border-b border-gray-700 flex-none shadow-md ${prepSummaryHeightClass} overflow-y-auto custom-scrollbar`}
          >
            <div className="flex flex-col md:flex-row md:justify-between items-stretch md:items-start gap-3 md:gap-6 mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="mt-0.5 flex-none rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs font-bold uppercase tracking-wide text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Back
                  </button>
                  <h2
                    className={`min-w-0 text-xl md:text-2xl fantasy-font ${selectedQuest.elite ? "text-yellow-500" : "text-white"}`}
                  >
                    {getMissionDisplayName(selectedQuest)}
                  </h2>
                </div>
                {selectedQuest.type === "dungeon" && selectedQuest.dungeonSetName && (
                  <div className="text-sm text-blue-300/80 mt-0.5">
                    {selectedQuest.dungeonSetName}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {getMissionMetaText(selectedQuest)}
                </div>
                {activePrepMission?.isRaid && (
                  <div className="mt-2 rounded border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/85">
                    {formatRaidResetSchedule(activePrepMission)}
                    {selectedRaidLockoutStatus?.lockout
                      ? ` - ID ${selectedRaidLockoutStatus.lockout.displayId}: ${selectedRaidLockoutStatus.clearedSteps}/${selectedRaidLockoutStatus.totalBosses} bosses cleared`
                      : ""}
                    {isSelectedRaidCompletedLocked
                      ? ` - cleared until day ${selectedRaidLockoutStatus.resetWindow.nextResetDayIndex}`
                      : ""}
                    {isSelectedRaidLockoutConflicted ? " - conflicting raid IDs selected" : ""}
                    {isSelectedRaidWingLocked
                      ? ` - locked: clear ${selectedRaidLockoutStatus.missingRequiredWingLabels.join(", ")} first`
                      : ""}
                  </div>
                )}
                {shouldShowTacticalOdds && (
                  <div
                    className={`mt-2 rounded border px-3 py-2 ${
                      selectedPartyMembers.length === 0
                        ? "border-gray-700 bg-gray-900/70"
                        : missionPreview.successChance >= 75
                          ? "border-emerald-700/80 bg-emerald-950/20"
                          : missionPreview.successChance >= 45
                            ? "border-amber-700/80 bg-amber-950/20"
                            : "border-rose-700/80 bg-rose-950/20"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                      Mission Outcome
                    </div>
                    {selectedPartyMembers.length === 0 ? (
                      <div className="mt-1 text-xs text-gray-300">
                        Select heroes to preview success and fail chance.
                      </div>
                    ) : (
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        <div className="rounded border border-emerald-800 bg-emerald-950/35 px-2 py-1.5">
                          <div className="text-[10px] uppercase tracking-wide text-emerald-200/80">
                            Success
                          </div>
                          <div className="text-lg md:text-xl font-bold text-emerald-200 leading-tight">
                            {missionPreview.successChance}%
                          </div>
                        </div>
                        <div className="rounded border border-rose-800 bg-rose-950/35 px-2 py-1.5">
                          <div className="text-[10px] uppercase tracking-wide text-rose-200/80">
                            Fail
                          </div>
                          <div className="text-lg md:text-xl font-bold text-rose-200 leading-tight">
                            {missionPreview.failChance}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-amber-100/80 mt-2 max-w-2xl leading-relaxed">
                  {selectedQuest.type === "dungeon"
                    ? getDungeonBriefingText(selectedQuest)
                    : selectedQuest.type === "zone"
                      ? "Zone briefing: assign heroes to this region. They keep normal leveling, earn checkpoint gold at 25/50/75/100%, and receive checkpoint world-drop rewards based on zone tier."
                    : selectedQuest.elite
                      ? "Elite briefing: high-risk target with dangerous resistance. Bring appropriate levels and roles."
                      : "Quest briefing: a standard operation suited for steady progression and resource gains."}
                </p>
                {selectedQuest.type === "zone" && zoneEliteMissionOptions.length > 0 && (
                  <div className="mt-3 rounded border border-emerald-900/70 bg-emerald-950/20 p-2">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-200 font-bold">
                      Zone Operations
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedZoneEliteQuestId(null)}
                        className={`px-2 py-1 rounded border text-[11px] font-semibold transition-colors ${
                          selectedZoneEliteQuest
                            ? "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                            : "border-emerald-600 bg-emerald-900/40 text-emerald-100"
                        }`}
                      >
                        Zone Leveling
                      </button>
                      {zoneEliteMissionOptions.map((mission) => {
                        const isSelected = selectedZoneEliteQuestId === mission.id;
                        const doneCount = roster.filter((member) =>
                          hasCompletedZoneEliteQuest(member, mission),
                        ).length;
                        return (
                          <button
                            key={mission.id}
                            type="button"
                            onClick={() => setSelectedZoneEliteQuestId(mission.id)}
                            className={`px-2 py-1 rounded border text-[11px] font-semibold transition-colors ${
                              isSelected
                                ? "border-amber-500 bg-amber-900/30 text-amber-100"
                                : "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                            }`}
                          >
                            {mission.name}
                            {doneCount > 0 ? ` [DONE ${doneCount}]` : ""}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-[11px] text-emerald-100/90">
                      {selectedZoneEliteQuest
                        ? `Selected: ${selectedZoneEliteQuest.name} • Lvl ${selectedZoneEliteQuest.recommended || selectedZoneEliteQuest.level} • ${selectedZoneEliteQuest.gold}g`
                        : "Selected: Zone leveling (assignment only)."}
                    </div>
                  </div>
                )}
                {canChainSetDungeons && selectedQuest.type === "dungeon" && (
                  <div className="mt-3 rounded border border-indigo-900/70 bg-indigo-950/20 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-wide text-indigo-200 font-bold">
                        Wing Chain
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsChainEnabled((prev) => !prev)}
                        className={`px-2 py-1 rounded border text-[11px] font-bold transition-colors ${isChainEnabled ? "border-indigo-500 bg-indigo-800/40 text-indigo-100" : "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                      >
                        {isChainEnabled ? "Disable Chain" : "Chain Dungeons"}
                      </button>
                    </div>
                    {isChainEnabled && (
                      <div className="mt-2 space-y-1.5">
                        {chainWingMissions.map((mission) => {
                          const isCurrentMission = mission.id === selectedQuest.id;
                          const isChecked = selectedChainMissionIds.includes(mission.id);
                          return (
                            <label
                              key={`chain-${mission.id}`}
                              className={`flex items-center gap-2 text-[11px] rounded px-2 py-1 border ${isChecked ? "border-indigo-700 bg-indigo-900/20 text-indigo-100" : "border-gray-700 bg-gray-900/40 text-gray-300"}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isCurrentMission}
                                onChange={() => toggleChainMission(mission.id)}
                                className="accent-indigo-500"
                              />
                              <span className="font-semibold">{mission.dungeonWing || mission.name}</span>
                              <span className="text-gray-400">Lvl {mission.recommended || mission.level}</span>
                              {isCurrentMission && (
                                <span className="text-indigo-300">(Current)</span>
                              )}
                            </label>
                          );
                        })}
                        {selectedChainMissions.length > 1 && (
                          <div className="text-[11px] text-indigo-200/90">
                            Chain order:{" "}
                            {selectedChainMissions
                              .map((mission) => mission.dungeonWing || mission.name)
                              .join(" → ")}
                          </div>
                        )}
                        {selectedChainMissions.length > 0 && chainStartMission && (
                          <div className="text-[11px] text-indigo-200/70">
                            Starts at: {chainStartMission.dungeonWing || chainStartMission.name}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {selectedQuest.type === "dungeon" && (
                  <div className="mt-3 rounded border border-yellow-900/70 bg-yellow-950/10">
                    <button
                      type="button"
                      onClick={() => setIsLootAccordionOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-yellow-950/20 transition-colors"
                    >
                      <span className="text-[11px] uppercase tracking-wide text-yellow-200 font-bold">
                        Dungeon Loot Table ({selectedDungeonLootItems.length})
                      </span>
                      <span className="text-yellow-200 text-sm leading-none">
                        {isLootAccordionOpen ? "▾" : "▸"}
                      </span>
                    </button>
                    {isLootAccordionOpen && (
                      <div className="px-3 pb-3 border-t border-yellow-900/40">
                        {selectedDungeonLootItems.length === 0 ? (
                          <div className="text-[11px] text-gray-400 pt-2 italic">
                            No dungeon-specific loot is configured for this source yet.
                          </div>
                        ) : (
                          <div className="pt-2 space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                            {[5, 4, 3, 2, 1, 0].map((quality) => {
                              const qualityItems =
                                selectedDungeonLootByQuality[quality] || [];
                              if (qualityItems.length === 0) return null;
                              return (
                                <div
                                  key={`tactical-loot-${quality}`}
                                  className="rounded border border-gray-800 bg-black/20"
                                >
                                  <div className="px-2 py-1 border-b border-gray-800 text-[11px]">
                                    <span
                                      className={`${getQualityClass(quality)} font-bold uppercase tracking-wide`}
                                    >
                                      {getQualityLabel(quality)}
                                    </span>
                                    <span className="text-gray-500 ml-1">
                                      ({qualityItems.length})
                                    </span>
                                  </div>
                                  <div className="divide-y divide-gray-800">
                                    {qualityItems.map((item) => (
                                      <div
                                        key={`tactical-loot-item-${item.id}`}
                                        className="px-2 py-1.5 flex items-center justify-between gap-2 text-[11px]"
                                      >
                                        <div className="min-w-0 flex items-center gap-2">
                                          <img
                                            src={getItemIconUrl(item)}
                                            alt={item.name}
                                            className="w-6 h-6 rounded border border-gray-700 object-cover flex-none"
                                            onError={(event) => {
                                              event.currentTarget.src =
                                                getWowIconUrl(
                                                  "inv_misc_questionmark",
                                                );
                                            }}
                                          />
                                          <div className="min-w-0">
                                            <div
                                              className={`truncate font-semibold ${getQualityClass(item.quality)}`}
                                            >
                                              [{item.name}]
                                            </div>
                                            <div className="text-gray-500">
                                              {item.slot} • {item.type}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right whitespace-nowrap text-gray-400">
                                          <div>Lvl {item.minLevel}</div>
                                          <div className="text-[10px] text-amber-200/80">
                                            iLvl {getItemEffectiveLevel(item)}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                  {(() => {
                    const rewardMission = activePrepMission;
                    const inRangeBounds = getMissionProgressionBounds(rewardMission);
                    const inRangeReferenceLevel = Math.max(
                      inRangeBounds.minLevel,
                      Math.min(
                        inRangeBounds.maxLevel,
                        Math.max(
                          1,
                          Number(rewardMission?.level) || inRangeBounds.minLevel,
                        ),
                      ),
                    );
                    const inRangeMissionExpPerHero = getMissionExpForMember(
                      rewardMission,
                      { level: inRangeReferenceLevel },
                    );
                    const expLabel = `${formatXpRewardText(inRangeMissionExpPerHero)} / hero`;
                    if (rewardMission?.type === "zone") {
                      const rewardZone = getZoneById(rewardMission?.zoneId);
                      const zoneLootEntries = getZoneLootCountEntries(rewardZone);
                      const zoneKeyRewardLabels = getZoneEliteKeyRewardLabels(
                        rewardMission?.zoneId,
                      );
                      return (
                        <>
                          <span className="px-2 py-1 rounded border border-emerald-700 bg-emerald-950/30 text-emerald-200">
                            Zone Range: Lvl {rewardMission.recommended || rewardMission.level}
                          </span>
                          <span className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-300">
                            Minimum to Join: Lvl 1
                          </span>
                          <span className="px-2 py-1 rounded border border-yellow-800 bg-yellow-950/30 text-yellow-200">
                            Expected Gold: up to {getMissionGoldReward(rewardMission)}g total
                          </span>
                          <span className="px-2 py-1 rounded border border-emerald-900 bg-emerald-950/20 text-emerald-100">
                            Loot:{" "}
                            {renderLootCountLabel(
                              zoneLootEntries,
                              `zone-prep-loot-${rewardMission.id}`,
                            )}
                          </span>
                          {zoneKeyRewardLabels.length > 0 && (
                            <span className="px-2 py-1 rounded border border-amber-800 bg-amber-950/30 text-amber-200">
                              Key quest in zone: [{zoneKeyRewardLabels.join("] + [")}]
                            </span>
                          )}
                        </>
                      );
                    }
                    return (
                      <>
                  <span className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-300">
                    Recommended: Lvl {rewardMission.recommended || rewardMission.level}
                  </span>
                  {rewardMission.type === "dungeon" &&
                    selectedQuestEntryLevel !== null &&
                    selectedQuestEntryLevel !== minLevel && (
                      <span className="px-2 py-1 rounded border border-blue-800 bg-blue-950/30 text-blue-200">
                        Entry Level: {selectedQuestEntryLevel}
                      </span>
                    )}
                  <span className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-300">
                    Minimum to Join: Lvl {minLevel}
                  </span>
                {rewardMission?.type === "dungeon" && (
                  <span className="px-2 py-1 rounded border border-amber-800 bg-amber-950/30 text-amber-200">
                    Attempts: {getMissionMaxAttempts(rewardMission)}
                  </span>
                )}
                {rewardMission?.type === "dungeon" &&
                  getMissionWipeCost(rewardMission) > 0 && (
                    <span className="px-2 py-1 rounded border border-rose-800 bg-rose-950/30 text-rose-200">
                      Wipe Cost: {getMissionWipeCost(rewardMission)}g
                    </span>
                  )}
                {selectedMissionRequiredKeyLabels.length > 0 && (
                  <span className="px-2 py-1 rounded border border-rose-800 bg-rose-950/30 text-rose-200 font-semibold">
                    Key Required: [{selectedMissionRequiredKeyLabels.join("] + [")}]
                  </span>
                )}
                  {selectedMissionRequiredKeyLabels.length > 0 &&
                    requiresAllMembersKey && (
                      <span className="px-2 py-1 rounded border border-rose-800 bg-rose-950/30 text-rose-200">
                        Every selected hero must have this key.
                      </span>
                    )}
                  {selectedMissionRequiredKeySourceLabels.length > 0 && (
                    <span className="px-2 py-1 rounded border border-rose-900 bg-rose-950/30 text-rose-200">
                      Unlock Quest: {selectedMissionRequiredKeySourceLabels.join(" / ")}
                    </span>
                  )}
                  <span className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-yellow-300">
                    Rewards: {getMissionGoldReward(rewardMission)}g • {expLabel} XP •{" "}
                    {getMissionRewardQualities(rewardMission).map(
                      (quality, idx, arr) => (
                        <React.Fragment
                          key={`${rewardMission.id}-prep-${quality}-${idx}`}
                        >
                          <span className={getQualityClass(quality)}>
                            [{getQualityLabel(quality)}]
                          </span>
                          {idx < arr.length - 1 && (
                            <span className="text-gray-500"> + </span>
                          )}
                        </React.Fragment>
                      ),
                    )}
                  </span>
                      </>
                    );
                  })()}
                  {selectedMissionRewardKeyLabels.map((label, index) => (
                    <span
                      key={`${activePrepMission?.id || selectedQuest?.id || "mission"}-prep-key-${index}`}
                      className="px-2 py-1 rounded border border-amber-800 bg-amber-950/30 text-amber-200"
                    >
                      Key Reward: [{label}]
                    </span>
                  ))}
                  {selectedMissionRewardKeyLabels.length > 0 && (
                    <span className="px-2 py-1 rounded border border-amber-700 bg-amber-950/40 text-amber-100 font-semibold">
                      Primary Reward: [{selectedMissionRewardKeyLabels.join("] + [")}] +{" "}
                      {getMissionRewardQualities(activePrepMission).map(
                        (quality, idx, arr) => (
                          <React.Fragment
                            key={`${activePrepMission?.id || selectedQuest?.id || "mission"}-prep-key-primary-${quality}-${idx}`}
                          >
                            <span className={getQualityClass(quality)}>
                              [{getQualityLabel(quality)} item]
                            </span>
                            {idx < arr.length - 1 && (
                              <span className="text-gray-500"> + </span>
                            )}
                          </React.Fragment>
                        ),
                      )}
                    </span>
                  )}
                  {selectedMissionBonusDropNotes.map((note, index) => (
                    <span
                      key={`${activePrepMission?.id || selectedQuest?.id || "mission"}-prep-bonus-drop-${index}`}
                      className="px-2 py-1 rounded border border-purple-800 bg-purple-950/30 text-purple-200"
                    >
                      Bonus Drop: {note}
                    </span>
                  ))}
                  {selectedMissionRequiredKeyLabels.length > 0 &&
                    selectedPartyMembers.length === 0 && (
                      <span className="px-2 py-1 rounded border border-rose-900 bg-rose-950/30 text-rose-200">
                        {selectedMissionUnlockedRequiredKeyLabels.length > 0
                          ? `Chain unlock available: [${selectedMissionUnlockedRequiredKeyLabels.join("] + [")}] can be earned before locked wings.`
                          : "Select at least one key holder to unlock this route."}
                      </span>
                    )}
                  {selectedMissionRequiredKeyLabels.length > 0 &&
                    selectedPartyMembers.length > 0 &&
                    isKeyBlocked && (
                      <span className="px-2 py-1 rounded border border-red-800 bg-red-950/30 text-red-200 font-semibold">
                        Locked: Missing [{selectedMissionMissingKeyLabels.join("] + [")}]
                        {selectedMissionKeyAccess.firstBlockingRequirement?.missionName
                          ? ` for ${selectedMissionKeyAccess.firstBlockingRequirement.missionName}`
                          : ""}
                        .
                      </span>
                    )}
                  {selectedMissionRequiredKeyLabels.length > 0 &&
                    selectedPartyMembers.length > 0 &&
                    !isKeyBlocked &&
                    selectedMissionUnlockedRequiredKeyLabels.length > 0 && (
                      <span className="px-2 py-1 rounded border border-emerald-700 bg-emerald-950/30 text-emerald-200">
                        Chain unlock: [{selectedMissionUnlockedRequiredKeyLabels.join("] + [")}] will be earned before locked wings.
                      </span>
                    )}
                  {selectedMissionRequiredKeyLabels.length > 0 &&
                    selectedPartyMembers.length > 0 &&
                    !isKeyBlocked &&
                    selectedMissionUnlockedRequiredKeyLabels.length === 0 &&
                    selectedMissionKeyAccess.partyHasAnyRequiredKey && (
                      <span className="px-2 py-1 rounded border border-emerald-700 bg-emerald-950/30 text-emerald-200">
                        Key holder detected in squad.
                      </span>
                    )}
                  {missionPreview && !isSelectedZoneMission && selectedPartyMembers.length > 0 && (
                    <>
                      <span className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-300">
                        Team Avg Lvl: {missionPreview.averagePartyLevel.toFixed(1)}
                      </span>
                      <span className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-300">
                        Team Avg iLvl: {missionPreview.averagePartyItemLevel.toFixed(1)}
                      </span>
                      <span className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-300">
                        Power: {missionPreview.partyPower.toFixed(1)} /{" "}
                        {missionPreview.missionPower.toFixed(1)}
                      </span>
                      <span
                        className={`px-2 py-1 rounded border ${
                          activePrepMission?.isRaid
                            ? missionPreview.hasRaidRoleCoverage
                              ? "border-emerald-700 bg-emerald-950/30 text-emerald-300"
                              : "border-gray-700 bg-gray-800 text-gray-400"
                            : missionPreview.hasCoreRoleComposition
                              ? "border-emerald-700 bg-emerald-950/30 text-emerald-300"
                              : "border-gray-700 bg-gray-800 text-gray-400"
                        }`}
                      >
                        {activePrepMission?.isRaid ? (
                          <>
                            Raid comp bonus:{" "}
                            {missionPreview.hasRaidRoleCoverage
                              ? `+${missionPreview.raidRoleRequirementBonus}% Success`
                              : `Need ${missionPreview.raidRoleRequirement.Tank} Tank / ${missionPreview.raidRoleRequirement.Healer} Healer / ${missionPreview.raidRoleRequirement.DPS} DPS`}
                          </>
                        ) : (
                          <>
                            Role comp bonus:{" "}
                            {missionPreview.hasCoreRoleComposition
                              ? `+${missionPreview.roleCompositionBonus}% Success`
                              : "Need Tank + Healer + DPS"}
                          </>
                        )}
                      </span>
                      {missionPreview.focusSuccessBonus > 0 && (
                        <span className="px-2 py-1 rounded border border-cyan-800 bg-cyan-950/30 text-cyan-200">
                          Guild focus bonus: +{missionPreview.focusSuccessBonus}% Success
                        </span>
                      )}
                      {activePrepMission?.type === "dungeon" && (
                        <span
                          className={`px-2 py-1 rounded border ${
                            missionPreview.veteranSuccessBonus > 0
                              ? "border-yellow-700 bg-yellow-950/30 text-yellow-200"
                              : "border-gray-700 bg-gray-800 text-gray-400"
                          }`}
                        >
                          Veteran bonus:{" "}
                          {missionPreview.veteranSuccessBonus > 0
                            ? `+${missionPreview.veteranSuccessBonus}% Success`
                            : "Need 50%+ cleared heroes"}{" "}
                          ({missionPreview.veteranExperiencedCount}/{Math.max(
                            1,
                            selectedPartyMembers.length,
                          )})
                        </span>
                      )}
                      {activePrepMission?.type === "dungeon" && (
                        <span
                          className={`px-2 py-1 rounded border ${
                            missionPreview.moraleSuccessBonus > 0
                              ? "border-emerald-700 bg-emerald-950/30 text-emerald-200"
                              : missionPreview.moraleSuccessBonus < 0
                                ? "border-red-800 bg-red-950/30 text-red-200"
                                : "border-gray-700 bg-gray-800 text-gray-400"
                          }`}
                        >
                          Morale:{" "}
                          {missionPreview.moraleSuccessBonus > 0
                            ? `+${missionPreview.moraleSuccessBonus}% Success`
                            : missionPreview.moraleSuccessBonus < 0
                              ? `${missionPreview.moraleSuccessBonus}% Success`
                              : "No bonus"}
                        </span>
                      )}
                      {missionPreview.relationshipSuccessModifier !== 0 && (
                        <span
                          className={`px-2 py-1 rounded border ${
                            missionPreview.relationshipSuccessModifier > 0
                              ? "border-pink-700 bg-pink-950/30 text-pink-200"
                              : "border-red-800 bg-red-950/30 text-red-200"
                          }`}
                        >
                          Relationships:{" "}
                          {missionPreview.relationshipSuccessModifier > 0
                            ? `+${missionPreview.relationshipSuccessModifier}% Success`
                            : `${missionPreview.relationshipSuccessModifier}% Success`}{" "}
                          ({missionPreview.relationshipSuccessModifierLevel})
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="text-left md:text-right flex-none md:w-48 md:pl-2">
                <div className="text-xs md:text-sm text-gray-400 mb-1">Squad</div>
                <div className="text-xl font-bold text-white">
                  {isSelectedZoneMission
                    ? `${party.length} selected`
                    : `${party.length}/${selectedMissionPartySize}`}
                </div>
                <div className="relative mt-2" ref={autoSelectMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsAutoSelectMenuOpen((prev) => !prev)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 inline-flex items-center justify-between gap-2"
                  >
                    <span>{AUTO_SELECT_MODE_LABEL[autoSelectMode]}</span>
                    <span className="text-gray-400">{isAutoSelectMenuOpen ? "▴" : "▾"}</span>
                  </button>
                  {isAutoSelectMenuOpen && (
                    <div className="absolute left-0 top-full mt-1 w-full min-w-[148px] rounded border border-gray-600 bg-gray-900 shadow-2xl z-30 overflow-hidden">
                      {AUTO_SELECT_MODE_OPTIONS.map((option) => {
                        const isSelected = option.value === autoSelectMode;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setAutoSelectMode(option.value);
                              setAutoAssignSummary("");
                              setIsAutoSelectMenuOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 text-xs transition-colors ${
                              isSelected
                                ? "bg-emerald-900/45 text-emerald-100 font-semibold"
                                : "text-gray-200 hover:bg-gray-800"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mt-2 rounded border border-gray-700 bg-gray-900/60 px-2 py-1 text-[10px] text-left text-gray-300">
                  <div className="text-gray-400 uppercase tracking-wide mb-0.5">
                    Selected Roles
                  </div>
                  <div>
                    Tank: {selectedPartyRoleCounts.Tank} • Healer:{" "}
                    {selectedPartyRoleCounts.Healer} • DPS: {selectedPartyRoleCounts.DPS}
                  </div>
                  {selectedRaidRoleRequirement && (
                    <div className="text-cyan-200/80 mt-0.5">
                      Needed: {selectedRaidRoleRequirement.Tank} /{" "}
                      {selectedRaidRoleRequirement.Healer} /{" "}
                      {selectedRaidRoleRequirement.DPS}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAutoSelectParty}
                  disabled={keyEligibleRoster.length === 0}
                  className="mt-3 w-full px-4 py-2 text-sm font-bold uppercase tracking-wide rounded border border-emerald-500 bg-emerald-900/45 text-emerald-100 hover:bg-emerald-800/55 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Auto-Select
                </button>
                <button
                  type="button"
                  onClick={handleDeploySelectedMission}
                  disabled={isDeployDisabled}
                  className="btn-quest mt-2 w-full px-4 py-3 rounded text-blue-100 font-bold disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                >
                  {deployButtonLabel}
                </button>
              </div>
            </div>
            {autoAssignSummary && (
              <div className="mt-2 text-[11px] text-emerald-300 border border-emerald-900/60 bg-emerald-950/20 rounded px-2 py-1">
                {autoAssignSummary}
              </div>
            )}
            {isRaidPartySizeInvalid && (
              <div className="mt-2 text-[11px] text-amber-200 border border-amber-900/60 bg-amber-950/20 rounded px-2 py-1">
                Raid requires at least {selectedMissionMinPartySize} heroes to deploy
                (recommended: {selectedMissionPartySize}).
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-b border-gray-700 bg-gray-900/30">
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-[11px] text-gray-300">
                <span className="block mb-1 uppercase tracking-wide text-gray-500">
                  Hero Min Level
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={characterFilterMinLevel}
                  onChange={(event) => setCharacterFilterMinLevel(event.target.value)}
                  className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
                  placeholder="Any"
                />
              </label>
              <label className="text-[11px] text-gray-300">
                <span className="block mb-1 uppercase tracking-wide text-gray-500">
                  Hero Max Level
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={characterFilterMaxLevel}
                  onChange={(event) => setCharacterFilterMaxLevel(event.target.value)}
                  className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
                  placeholder="Any"
                />
              </label>
              <label className="text-[11px] text-gray-300">
                <span className="block mb-1 uppercase tracking-wide text-gray-500">
                  Sort
                </span>
                <select
                  value={characterSortMode}
                  onChange={(event) => setCharacterSortMode(event.target.value)}
                  className="w-36 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
                >
                  {TACTICAL_CHARACTER_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  setCharacterFilterMinLevel("");
                  setCharacterFilterMaxLevel("");
                }}
                disabled={!hasAnyCharacterLevelFilter}
                className="h-[30px] px-3 rounded border border-gray-600 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              <span className="text-xs text-gray-500 ml-auto">
                Showing {tacticalCharacterRoster.length}/{idleRoster.length}
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 md:min-h-[240px] overflow-y-auto p-4 bg-gray-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 custom-scrollbar">
            {tacticalCharacterRoster.length === 0 && (
              <div className="text-center text-gray-500 italic py-10 col-span-full">
                No heroes match this tactical filter.
              </div>
            )}
            {tacticalCharacterRoster.map((char) => {
              const isEligible = char.level >= minLevel;
              const isSelected = party.includes(char.id);
              const interruptibleActiveMission = activeMissionByMemberId.get(
                String(char.id || ""),
              );
              const willAbandonQuest =
                isPreparingDungeon &&
                isInterruptibleActiveMission(interruptibleActiveMission);
              const ownedKeys = Array.isArray(char.keys)
                ? char.keys.map((keyId) => String(keyId || "").trim()).filter(Boolean)
                : [];
              const hasRequiredKey =
                selectedMissionRequiredKeyIds.length > 0 &&
                ownedKeys.some((keyId) =>
                  selectedMissionRequiredKeyIds.includes(keyId),
                );
              const hasRewardKey =
                selectedMissionRewardKeyIds.length > 0 &&
                ownedKeys.some((keyId) =>
                  selectedMissionRewardKeyIds.includes(keyId),
                );
              const heldRelevantKeyLabels = [
                ...new Set(
                  [...selectedMissionRequiredKeyIds, ...selectedMissionRewardKeyIds]
                    .filter((keyId) => ownedKeys.includes(keyId))
                    .map((keyId) => getKeyLabel(keyId) || keyId),
                ),
              ];
              const isKeyHolder = hasRequiredKey || hasRewardKey;
              const hasAllRequiredKeys = memberHasAllRequiredKeys(char);
              const keyLockedForMember =
                selectedMissionRequiredKeyIds.length > 0 &&
                requiresAllMembersKey &&
                !hasAllRequiredKeys;
              const charRaidLockoutStatus = activePrepMission?.isRaid
                ? getRaidLockoutStatus({
                    raidLockouts,
                    mission: activePrepMission,
                    currentDayIndex,
                    memberIds: [char.id],
                  })
                : null;
              const charRaidLockout = charRaidLockoutStatus?.partyLockouts?.[0] || null;
              const selectedRaidLockout =
                selectedRaidLockoutStatus?.partyLockouts?.length === 1
                  ? selectedRaidLockoutStatus.partyLockouts[0]
                  : null;
              const isRaidCompletedForMember = Boolean(
                charRaidLockoutStatus?.isCompletedLocked,
              );
              const hasRaidIdConflict =
                Boolean(activePrepMission?.isRaid) &&
                !isSelected &&
                selectedRaidLockout &&
                charRaidLockout &&
                selectedRaidLockout.lockoutId !== charRaidLockout.lockoutId;
              const raidLockedForMember =
                isRaidCompletedForMember || hasRaidIdConflict;
              const hasCompletedSelectedZoneElite =
                selectedZoneEliteQuest &&
                hasCompletedZoneEliteQuest(char, selectedZoneEliteQuest);
              const zoneEliteDoneLocked =
                hasCompletedSelectedZoneElite &&
                !isSelected &&
                !selectedPartyHasZoneEliteStarter;
              const canSelectMember =
                isEligible &&
                !keyLockedForMember &&
                !raidLockedForMember &&
                !zoneEliteDoneLocked;
              return (
                <div
                  key={char.id}
                  onClick={() =>
                    (isSelected || canSelectMember) && toggleMember(char.id)
                  }
                  className={`p-3 rounded flex items-center gap-3 transition-all cursor-pointer border ${!isEligible ? "opacity-40 cursor-not-allowed bg-black border-transparent" : keyLockedForMember || raidLockedForMember || zoneEliteDoneLocked ? "opacity-50 cursor-not-allowed bg-red-950/20 border-red-800/60" : isSelected ? "bg-green-900/30 border-green-500" : isKeyHolder ? "bg-amber-950/20 border-amber-600 hover:bg-amber-900/20" : "bg-gray-700 border-gray-600 hover:bg-gray-600"}`}
                >
                  <img
                    src={getRacePortraitUrl(char.race, char.gender)}
                    alt={`${char.race} ${char.gender}`}
                    className="w-10 h-10 rounded border border-gray-600 object-cover bg-gray-900"
                    onError={(event) => {
                      event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
                    }}
                  />
                  <div className="flex-1">
                    <div
                      className="font-bold text-sm"
                      style={{ color: DB_CLASSES[char.charClass].color }}
                    >
                      {char.name}
                    </div>
                    <div className="text-[11px] text-gray-300 mt-0.5 inline-flex items-center gap-1">
                      {DB_CLASSES[char.charClass]?.icon && (
                        <img
                          src={DB_CLASSES[char.charClass].icon}
                          alt={char.charClass}
                          className="w-3.5 h-3.5 rounded-sm border border-gray-600"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <span>{char.charClass}</span>
                    </div>
                    {isKeyHolder && (
                      <div className="text-[10px] text-amber-300 uppercase tracking-wide font-bold mt-0.5">
                        🔑 Key Holder
                        {heldRelevantKeyLabels.length > 0
                          ? `: ${heldRelevantKeyLabels.join(" / ")}`
                          : ""}
                      </div>
                    )}
                    {keyLockedForMember && (
                      <div className="text-[10px] text-red-300 uppercase tracking-wide font-bold mt-0.5">
                        🔒 Missing Required Key
                      </div>
                    )}
                    {hasCompletedSelectedZoneElite && (
                      <div
                        className={`text-[10px] uppercase tracking-wide font-bold mt-0.5 ${
                          zoneEliteDoneLocked
                            ? "text-gray-500"
                            : "text-emerald-300"
                        }`}
                      >
                        [DONE] Zone Elite
                        {zoneEliteDoneLocked ? " - needs a quest starter" : ""}
                      </div>
                    )}
                    {willAbandonQuest && (
                      <OnQuestBadge />
                    )}
                    {charRaidLockout && (
                      <div
                        className={`text-[10px] uppercase tracking-wide font-bold mt-0.5 ${
                          isRaidCompletedForMember || hasRaidIdConflict
                            ? "text-red-300"
                            : "text-cyan-200"
                        }`}
                      >
                        ID {charRaidLockout.displayId}:{" "}
                        {charRaidLockout.completed
                          ? "Raid Cleared"
                          : `${charRaidLockout.clearedSteps}/${charRaidLockout.totalBosses} bosses`}
                        {hasRaidIdConflict ? " - Conflict" : ""}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-400">
                        {getRoleIcon(char.role)} Lvl {char.level}
                      </span>
                      <span className="text-[11px] text-amber-200/80">
                        iLvl {getCharacterAverageItemLevel(char).toFixed(1)}
                      </span>
                      {!isEligible && (
                        <span className="text-[10px] text-red-500 font-bold uppercase">
                          LOW
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <div className="w-4 h-4 rounded-full bg-green-500" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </BaseModal>
  );
};

function OnQuestBadge() {
  return (
    <span
      title="Quest can be paused for dungeon"
      className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-cyan-400/35 bg-cyan-950/45 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100"
    >
      <span className="relative h-3 w-3 flex-none animate-pulse" aria-hidden="true">
        <span className="absolute left-1/2 top-0 h-3 w-0.5 -translate-x-1/2 rotate-45 rounded bg-cyan-100 shadow-[0_0_6px_rgba(165,243,252,0.9)]" />
        <span className="absolute left-1/2 top-0 h-3 w-0.5 -translate-x-1/2 -rotate-45 rounded bg-sky-200 shadow-[0_0_6px_rgba(125,211,252,0.9)]" />
      </span>
      On Quest
    </span>
  );
}

export default MissionModal;
