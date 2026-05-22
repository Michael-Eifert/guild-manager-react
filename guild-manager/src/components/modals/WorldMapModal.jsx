import { useEffect, useMemo, useState } from "react";

import BaseModal from "./BaseModal";
import ActiveMissionCard from "../ActiveMissionCard";
import { DB_CLASSES, GUILD_FACTION, GUILD_SERVER_STYLE } from "../../constants";
import {
  getKeyIconUrl,
  getKeyLabel,
  getKeySourceQuestLabel,
  getRacePortraitUrl,
  getRoleIcon,
  getWowIconUrl,
} from "../../utils";
import { getZoneRegionalMap } from "../../zones/zoneMapLayout";
import {
  ZONE_DEFINITIONS,
  ZONE_PVP_TERRITORY,
  isZoneAccessibleForFaction,
} from "../../zones/zoneDefinitions";
import {
  WORLD_MAP_FILTERS,
  buildWorldMapZoneSummaries,
  filterWorldMapZoneSummaries,
} from "../../zones/zoneMapSummary";
import { hasCompletedZoneEliteQuest } from "../../automation/zoneEliteAutomation";
import {
  buildDungeonAttunementTargets,
  getAdventureGoalQueue,
  getAttunementEligibleMembers,
} from "../../automation/adventureGoals";
import { getRealmPlayersInZone } from "../../server/realmPopulation";
import { WORLD_PVP_PROFILE_TYPE } from "../../pvp/worldPvpDefinitions";
import {
  ensureWorldPvpState,
  getWorldPvpProfile,
} from "../../pvp/worldPvpUtils";

const MAP_SOURCE = {
  name: "Classic Azeroth",
  src: "https://i.redd.it/eznae4smfel81.jpg",
  credit: "Community Azeroth world map",
};

const FILTER_ORDER = [
  WORLD_MAP_FILTERS.ACTIVE,
  WORLD_MAP_FILTERS.AVAILABLE,
  WORLD_MAP_FILTERS.CLEARED,
  WORLD_MAP_FILTERS.ALL,
];

const ZONE_PROGRESS_FILTERS = Object.freeze({
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
});

const ZONE_PROGRESS_FILTER_ORDER = [
  ZONE_PROGRESS_FILTERS.IN_PROGRESS,
  ZONE_PROGRESS_FILTERS.COMPLETED,
];

const ZONE_ELITE_FILTERS = Object.freeze({
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
});

const ZONE_ELITE_FILTER_ORDER = [
  ZONE_ELITE_FILTERS.IN_PROGRESS,
  ZONE_ELITE_FILTERS.COMPLETED,
];

const BOARD_TABS = Object.freeze({
  WORLD: "World Board",
  DUNGEON: "Dungeon Board",
});

const DUNGEON_BOARD_FILTERS = Object.freeze({
  ALL: "All",
  DUNGEONS: "Dungeons",
  RAIDS: "Raids",
  NEEDS_ATTUNEMENT: "Needs Attunement",
  READY: "Ready",
  BLOCKED: "Blocked",
});

const DUNGEON_BOARD_FILTER_ORDER = [
  DUNGEON_BOARD_FILTERS.ALL,
  DUNGEON_BOARD_FILTERS.DUNGEONS,
  DUNGEON_BOARD_FILTERS.RAIDS,
  DUNGEON_BOARD_FILTERS.NEEDS_ATTUNEMENT,
  DUNGEON_BOARD_FILTERS.READY,
  DUNGEON_BOARD_FILTERS.BLOCKED,
];

const getPvpTerritoryTextClass = (pvpTerritory) => {
  if (pvpTerritory?.pvpType === WORLD_PVP_PROFILE_TYPE.HOSTILE) {
    return "text-orange-300";
  }
  if (
    pvpTerritory?.pvpType === WORLD_PVP_PROFILE_TYPE.CONTESTED ||
    pvpTerritory?.label === ZONE_PVP_TERRITORY.CONTESTED
  ) {
    return "text-yellow-300";
  }
  if (
    pvpTerritory?.pvpType === WORLD_PVP_PROFILE_TYPE.SAFE ||
    pvpTerritory?.label === ZONE_PVP_TERRITORY.SAFE
  ) {
    return "text-emerald-300";
  }
  return "text-slate-500";
};

function PvpTerritoryLabel({ pvpTerritory, separator = " - " }) {
  if (!pvpTerritory) return null;
  return (
    <>
      <span>{separator}</span>
      <span
        title={pvpTerritory.description}
        className={`font-semibold ${getPvpTerritoryTextClass(pvpTerritory)}`}
      >
        {pvpTerritory.label}
      </span>
    </>
  );
}

const getPvpTagClass = (tag, pvpTerritory) => {
  if (tag !== pvpTerritory?.label) {
    return "border-slate-700 bg-slate-900 text-slate-300";
  }
  if (pvpTerritory?.pvpType === WORLD_PVP_PROFILE_TYPE.HOSTILE) {
    return "border-orange-500/70 bg-orange-950/35 text-orange-200";
  }
  if (pvpTerritory?.pvpType === WORLD_PVP_PROFILE_TYPE.CONTESTED) {
    return "border-yellow-500/70 bg-yellow-950/35 text-yellow-200";
  }
  return "border-emerald-500/60 bg-emerald-950/35 text-emerald-100";
};

const getWorldPvpLogForZone = (logs, zoneId) =>
  (Array.isArray(logs) ? logs : []).find(
    (log) => log?.type === "pvp" && String(log.zoneId || "") === String(zoneId || ""),
  ) || null;

const getMemberId = (member) => member?.id ?? member?.name;

const formatPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return `${Math.round(percent)}%`;
};

const getMissionMemberIds = (mission) => {
  const rawMembers =
    mission?.memberIds ??
    mission?.members ??
    mission?.partyMemberIds ??
    mission?.assignedMemberIds ??
    [];

  return rawMembers
    .map((member) => (typeof member === "object" ? member.id : member))
    .filter(Boolean);
};

const isHeroAvailable = (member, busyMemberIds) => {
  const memberId = getMemberId(member);
  if (!memberId || busyMemberIds.has(memberId)) return false;
  return !["Questing", "Dungeon", "Raid", "Mission"].includes(member?.status);
};

const isHeroOnMission = (member, busyMemberIds) =>
  !isHeroAvailable(member, busyMemberIds);

const toggleSelection = (currentIds, memberId) =>
  currentIds.includes(memberId)
    ? currentIds.filter((id) => id !== memberId)
    : [...currentIds, memberId];

const toggleLimitedSelection = (currentIds, memberId, maxSize) => {
  if (currentIds.includes(memberId)) {
    return currentIds.filter((id) => id !== memberId);
  }
  if (currentIds.length >= maxSize) return currentIds;
  return [...currentIds, memberId];
};

const toggleZoneEliteSelection = ({
  currentIds,
  memberId,
  heroes,
  quest,
  maxSize,
}) => {
  if (!quest) return toggleLimitedSelection(currentIds, memberId, maxSize);
  const heroById = new Map(
    (Array.isArray(heroes) ? heroes : []).map((hero) => [getMemberId(hero), hero]),
  );
  const member = heroById.get(memberId);
  const isCompleted = member ? hasCompletedZoneEliteQuest(member, quest) : false;

  if (currentIds.includes(memberId)) {
    const nextIds = currentIds.filter((id) => id !== memberId);
    const hasQuestStarter = nextIds.some((id) => {
      const selectedHero = heroById.get(id);
      return selectedHero && !hasCompletedZoneEliteQuest(selectedHero, quest);
    });
    return hasQuestStarter
      ? nextIds
      : nextIds.filter((id) => {
          const selectedHero = heroById.get(id);
          return selectedHero && !hasCompletedZoneEliteQuest(selectedHero, quest);
        });
  }

  if (currentIds.length >= maxSize) return currentIds;
  const hasQuestStarter = currentIds.some((id) => {
    const selectedHero = heroById.get(id);
    return selectedHero && !hasCompletedZoneEliteQuest(selectedHero, quest);
  });
  if (isCompleted && !hasQuestStarter) return currentIds;
  return [...currentIds, memberId];
};

const getHeroLevel = (hero) => Math.max(1, Number(hero?.level) || 1);

export default function WorldMapModal({
  isOpen,
  onClose,
  variant = "modal",
  roster = [],
  missionList = [],
  activeMissions = [],
  realmState = null,
  worldPvpState = null,
  guildLog = [],
  guildName = "Player Guild",
  gameTimeMs,
  guildFaction = GUILD_FACTION.ALLIANCE,
  realmType = GUILD_SERVER_STYLE.PVE,
  onDeploy,
  onQueueAdventureGoal,
  onClearAdventureGoal,
  getMissionPreview,
}) {
  const isPage = variant === "page";
  const isActive = isPage || isOpen;
  const [activeBoard, setActiveBoard] = useState(BOARD_TABS.WORLD);
  const [activeFilter, setActiveFilter] = useState(WORLD_MAP_FILTERS.AVAILABLE);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [selectedEliteMemberIds, setSelectedEliteMemberIds] = useState([]);
  const [selectedEliteQuestId, setSelectedEliteQuestId] = useState(null);
  const [zoneMapImageFailed, setZoneMapImageFailed] = useState(false);
  const [dungeonBoardFilter, setDungeonBoardFilter] = useState(
    DUNGEON_BOARD_FILTERS.ALL,
  );
  const [selectedAttunementTargetId, setSelectedAttunementTargetId] =
    useState(null);
  const [selectedAttunementMemberIds, setSelectedAttunementMemberIds] =
    useState([]);

  const summaries = useMemo(
    () =>
      buildWorldMapZoneSummaries({
        roster,
        missionList,
        activeMissions,
        guildFaction,
      }),
    [activeMissions, guildFaction, missionList, roster],
  );
  const normalizedWorldPvpState = useMemo(
    () => ensureWorldPvpState(worldPvpState),
    [worldPvpState],
  );

  const visibleSummaries = useMemo(
    () => filterWorldMapZoneSummaries(summaries, activeFilter),
    [activeFilter, summaries],
  );

  const filterCounts = useMemo(
    () => ({
      [WORLD_MAP_FILTERS.ACTIVE]: summaries.filter(
        (summary) => summary.heroCount > 0,
      ).length,
      [WORLD_MAP_FILTERS.AVAILABLE]: summaries.filter(
        (summary) => summary.accessible,
      ).length,
      [WORLD_MAP_FILTERS.CLEARED]: summaries.filter(
        (summary) => summary.clearedCount > 0,
      ).length,
      [WORLD_MAP_FILTERS.ALL]: summaries.length,
    }),
    [summaries],
  );

  const selectedSummary = useMemo(
    () =>
      summaries.find((summary) => summary.zone.id === selectedZoneId) ??
      visibleSummaries[0] ??
      summaries[0] ??
      null,
    [selectedZoneId, summaries, visibleSummaries],
  );
  const selectedZoneKey = selectedSummary?.zone.id;
  const defaultEliteQuestId = selectedSummary?.eliteQuests[0]?.id ?? null;
  const selectedZoneMap = selectedSummary
    ? getZoneRegionalMap(selectedSummary.zone)
    : null;

  useEffect(() => {
    if (!isActive || summaries.length === 0) return;
    const isVisible = visibleSummaries.some(
      (summary) => summary.zone.id === selectedZoneId,
    );
    if (!selectedZoneId || !isVisible) {
      setSelectedZoneId(
        visibleSummaries[0]?.zone.id ?? summaries[0]?.zone.id ?? null,
      );
    }
  }, [isActive, selectedZoneId, summaries, visibleSummaries]);

  useEffect(() => {
    setSelectedMemberIds([]);
    setSelectedEliteMemberIds([]);
    setSelectedEliteQuestId(defaultEliteQuestId);
    setZoneMapImageFailed(false);
  }, [defaultEliteQuestId, selectedZoneKey]);

  const busyMemberIds = useMemo(() => {
    const ids = new Set();
    activeMissions.forEach((mission) => {
      getMissionMemberIds(mission).forEach((memberId) =>
        ids.add(String(memberId)),
      );
    });
    return ids;
  }, [activeMissions]);

  const activeDungeonMissions = useMemo(
    () =>
      (Array.isArray(activeMissions) ? activeMissions : []).filter(
        (mission) => mission?.type === "dungeon",
      ),
    [activeMissions],
  );

  const attunementTargets = useMemo(
    () => buildDungeonAttunementTargets({ missionList, roster }),
    [missionList, roster],
  );

  const dungeonBoardFilterCounts = useMemo(
    () => ({
      [DUNGEON_BOARD_FILTERS.ALL]: attunementTargets.length,
      [DUNGEON_BOARD_FILTERS.DUNGEONS]: attunementTargets.filter(
        (target) => !target.isRaidTarget,
      ).length,
      [DUNGEON_BOARD_FILTERS.RAIDS]: attunementTargets.filter(
        (target) => target.isRaidTarget,
      ).length,
      [DUNGEON_BOARD_FILTERS.NEEDS_ATTUNEMENT]: attunementTargets.filter(
        (target) => target.missing.length > 0,
      ).length,
      [DUNGEON_BOARD_FILTERS.READY]: attunementTargets.filter(
        (target) => target.isReady,
      ).length,
      [DUNGEON_BOARD_FILTERS.BLOCKED]: attunementTargets.filter(
        (target) => !target.isReady,
      ).length,
    }),
    [attunementTargets],
  );

  const filteredAttunementTargets = useMemo(() => {
    switch (dungeonBoardFilter) {
      case DUNGEON_BOARD_FILTERS.DUNGEONS:
        return attunementTargets.filter((target) => !target.isRaidTarget);
      case DUNGEON_BOARD_FILTERS.RAIDS:
        return attunementTargets.filter((target) => target.isRaidTarget);
      case DUNGEON_BOARD_FILTERS.NEEDS_ATTUNEMENT:
        return attunementTargets.filter((target) => target.missing.length > 0);
      case DUNGEON_BOARD_FILTERS.READY:
        return attunementTargets.filter((target) => target.isReady);
      case DUNGEON_BOARD_FILTERS.BLOCKED:
        return attunementTargets.filter((target) => !target.isReady);
      default:
        return attunementTargets;
    }
  }, [attunementTargets, dungeonBoardFilter]);

  const selectedAttunementTarget = useMemo(
    () =>
      attunementTargets.find((target) => target.id === selectedAttunementTargetId) ??
      filteredAttunementTargets[0] ??
      attunementTargets[0] ??
      null,
    [attunementTargets, filteredAttunementTargets, selectedAttunementTargetId],
  );

  useEffect(() => {
    if (activeBoard !== BOARD_TABS.DUNGEON) return;
    const selectedVisible = filteredAttunementTargets.some(
      (target) => target.id === selectedAttunementTargetId,
    );
    if (!selectedAttunementTargetId || !selectedVisible) {
      setSelectedAttunementTargetId(
        filteredAttunementTargets[0]?.id ?? attunementTargets[0]?.id ?? null,
      );
    }
  }, [
    activeBoard,
    attunementTargets,
    filteredAttunementTargets,
    selectedAttunementTargetId,
  ]);

  useEffect(() => {
    setSelectedAttunementMemberIds([]);
  }, [selectedAttunementTarget?.id]);

  const availableHeroes = useMemo(
    () =>
      roster
        .filter((member) => isHeroAvailable(member, busyMemberIds))
        .sort((a, b) => {
          const levelDelta = getHeroLevel(b) - getHeroLevel(a);
          if (levelDelta !== 0) return levelDelta;
          return (a.name ?? "").localeCompare(b.name ?? "");
        }),
    [busyMemberIds, roster],
  );

  const selectedMembers = useMemo(
    () =>
      roster.filter((member) => selectedMemberIds.includes(getMemberId(member))),
    [roster, selectedMemberIds],
  );

  const selectedEliteQuest = useMemo(
    () =>
      selectedSummary?.eliteQuests.find(
        (quest) => quest.id === selectedEliteQuestId,
      ) ??
      selectedSummary?.eliteQuests[0] ??
      null,
    [selectedEliteQuestId, selectedSummary],
  );
  const eliteHeroes = useMemo(() => {
    const source = Array.isArray(roster) ? roster : [];
    if (!selectedEliteQuest) {
      return [...source].sort((left, right) => {
        const leftBusy = isHeroOnMission(left, busyMemberIds);
        const rightBusy = isHeroOnMission(right, busyMemberIds);
        if (leftBusy !== rightBusy) return leftBusy ? 1 : -1;
        const levelDelta = getHeroLevel(right) - getHeroLevel(left);
        if (levelDelta !== 0) return levelDelta;
        return (left.name ?? "").localeCompare(right.name ?? "");
      });
    }

    return [...source].sort((left, right) => {
      const leftDone = hasCompletedZoneEliteQuest(left, selectedEliteQuest);
      const rightDone = hasCompletedZoneEliteQuest(right, selectedEliteQuest);
      if (leftDone !== rightDone) return leftDone ? 1 : -1;
      const leftBusy = isHeroOnMission(left, busyMemberIds);
      const rightBusy = isHeroOnMission(right, busyMemberIds);
      if (leftBusy !== rightBusy) return leftBusy ? 1 : -1;
      const levelDelta = getHeroLevel(right) - getHeroLevel(left);
      if (levelDelta !== 0) return levelDelta;
      return (left.name ?? "").localeCompare(right.name ?? "");
    });
  }, [busyMemberIds, roster, selectedEliteQuest]);

  const selectedEliteMembers = useMemo(
    () =>
      roster.filter((member) =>
        selectedEliteMemberIds.includes(getMemberId(member)),
      ),
    [roster, selectedEliteMemberIds],
  );
  const selectedEliteHasQuestStarter = useMemo(
    () =>
      !selectedEliteQuest ||
      selectedEliteMembers.some(
        (member) => !hasCompletedZoneEliteQuest(member, selectedEliteQuest),
      ),
    [selectedEliteMembers, selectedEliteQuest],
  );

  useEffect(() => {
    if (!selectedEliteQuest) return;
    setSelectedEliteMemberIds((currentIds) => {
      const memberById = new Map(roster.map((member) => [getMemberId(member), member]));
      const availableIds = currentIds.filter((memberId) => {
        const member = memberById.get(memberId);
        return member && isHeroAvailable(member, busyMemberIds);
      });
      const hasQuestStarter = availableIds.some((memberId) => {
        const member = memberById.get(memberId);
        return member && !hasCompletedZoneEliteQuest(member, selectedEliteQuest);
      });
      if (hasQuestStarter) {
        return availableIds.length === currentIds.length ? currentIds : availableIds;
      }
      const nextIds = availableIds.filter((memberId) => {
        const member = memberById.get(memberId);
        return member && !hasCompletedZoneEliteQuest(member, selectedEliteQuest);
      });
      return nextIds.length === currentIds.length ? currentIds : nextIds;
    });
  }, [busyMemberIds, roster, selectedEliteQuest]);

  const elitePreview = useMemo(() => {
    if (
      !getMissionPreview ||
      !selectedEliteQuest ||
      selectedEliteMembers.length === 0
    ) {
      return null;
    }
    return getMissionPreview(selectedEliteQuest, selectedEliteMembers);
  }, [getMissionPreview, selectedEliteMembers, selectedEliteQuest]);

  if (!isOpen) return null;

  const deployZoneAssignment = () => {
    if (!selectedSummary?.zoneMission || selectedMemberIds.length === 0) return;
    const deployed = onDeploy?.(selectedSummary.zoneMission, selectedMemberIds);
    if (deployed !== false) setSelectedMemberIds([]);
  };

  const deployEliteQuest = () => {
    if (!selectedEliteQuest || selectedEliteMemberIds.length === 0) return;
    const deployed = onDeploy?.(selectedEliteQuest, selectedEliteMemberIds);
    if (deployed !== false) setSelectedEliteMemberIds([]);
  };

  const queueSelectedAttunementGoal = () => {
    if (
      !selectedAttunementTarget?.sourceMission ||
      selectedAttunementMemberIds.length === 0
    ) {
      return;
    }
    const queued = onQueueAdventureGoal?.({
      memberIds: selectedAttunementMemberIds,
      keyId: selectedAttunementTarget.keyId,
      sourceMissionId: selectedAttunementTarget.sourceMission.id,
      targetMissionId: selectedAttunementTarget.goalTargetId,
    });
    if (queued !== false) setSelectedAttunementMemberIds([]);
  };

  const clearSelectedAttunementGoal = () => {
    if (
      !selectedAttunementTarget?.sourceMission ||
      selectedAttunementMemberIds.length === 0
    ) {
      return;
    }
    const cleared = onClearAdventureGoal?.({
      memberIds: selectedAttunementMemberIds,
      keyId: selectedAttunementTarget.keyId,
      sourceMissionId: selectedAttunementTarget.sourceMission.id,
    });
    if (cleared !== false) setSelectedAttunementMemberIds([]);
  };

  const moveHeroToZone = (memberId, zoneId) => {
    const targetSummary = summaries.find((summary) => summary.zone.id === zoneId);
    if (!targetSummary?.zoneMission) return;
    return onDeploy?.(targetSummary.zoneMission, [memberId]);
  };

  const eliteMaxSize = selectedEliteQuest?.requiredPartySize ?? 5;
  const eliteMinSize = selectedEliteQuest?.minPartySize ?? 1;
  const eliteMinLevel = Math.max(1, Number(selectedEliteQuest?.minLevel) || 1);
  const successChance =
    formatPercent(elitePreview?.successChance) ??
    formatPercent(elitePreview?.chance) ??
    formatPercent(elitePreview?.successRate);

  const boardContent = (
    <>
      <header className="flex-none px-4 py-3 md:px-5 border-b border-cyan-900/60 bg-gray-950 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="fantasy-font text-xl md:text-2xl text-cyan-300 truncate">
            Adventure Board
          </h2>
          <p className="text-xs md:text-sm text-cyan-100/60 truncate">
            {guildFaction} world routes, dungeon runs, and attunement goals
          </p>
        </div>
        {!isPage && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-white text-3xl px-2 leading-none"
            aria-label="Close adventure board"
          >
            &times;
          </button>
        )}
      </header>

      <div className="flex-none border-b border-cyan-900/45 bg-slate-950 px-3 py-2 md:px-5">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-fit">
          {Object.values(BOARD_TABS).map((tab) => {
            const selected = activeBoard === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveBoard(tab)}
                className={`rounded border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                  selected
                    ? "border-cyan-400/70 bg-cyan-950/55 text-cyan-100"
                    : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-cyan-600"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {activeBoard === BOARD_TABS.WORLD ? (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] gap-4 min-h-full">
          <section className="rounded-lg border border-cyan-900/50 bg-slate-950/75 p-3 flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  {MAP_SOURCE.name}
                </h3>
                <p className="text-xs text-slate-400">{MAP_SOURCE.credit}</p>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {FILTER_ORDER.map((filter) => {
                  const selected = activeFilter === filter;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveFilter(filter)}
                      className={`rounded border px-3 py-2 text-xs font-semibold transition-colors ${
                        selected
                          ? "border-amber-400/70 bg-amber-900/35 text-amber-100"
                          : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-100"
                      }`}
                    >
                      {filter}{" "}
                      <span className="text-slate-400">
                        {filterCounts[filter] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-slate-700 bg-slate-950 aspect-[16/10] min-h-[320px]">
              <img
                alt="Classic Azeroth world map"
                src={MAP_SOURCE.src}
                className="block h-full w-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.05),rgba(2,6,23,0.34))]" />
            </div>

            <ZoneSelectionPanel
              summaries={visibleSummaries}
              selectedZoneId={selectedSummary?.zone.id}
              realmType={realmType}
              guildFaction={guildFaction}
              onSelect={setSelectedZoneId}
            />

            <SelectedZoneMap
              selectedSummary={selectedSummary}
              zoneMap={selectedZoneMap}
              realmType={realmType}
              guildFaction={guildFaction}
              realmState={realmState}
              guildName={guildName}
              imageFailed={zoneMapImageFailed}
              onImageError={() => setZoneMapImageFailed(true)}
            />
          </section>

          <aside className="rounded-lg border border-cyan-900/50 bg-slate-950/75 p-3 flex flex-col gap-3 min-h-[620px]">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Visible" value={visibleSummaries.length} />
              <Stat label="Active" value={filterCounts[WORLD_MAP_FILTERS.ACTIVE]} />
              <Stat label="Cleared" value={filterCounts[WORLD_MAP_FILTERS.CLEARED]} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Honor" value={normalizedWorldPvpState.totalHonor} />
              <Stat label="Weekly" value={normalizedWorldPvpState.weeklyHonor} />
              <Stat label="PvP Rep" value={normalizedWorldPvpState.pvpReputation} />
            </div>

            {selectedSummary && (
              <ZoneDetail
                summary={selectedSummary}
                guildFaction={guildFaction}
                realmType={realmType}
                worldPvpState={normalizedWorldPvpState}
                latestPvpLog={getWorldPvpLogForZone(
                  guildLog,
                  selectedSummary.zone.id,
                )}
                availableHeroes={availableHeroes}
                selectedMemberIds={selectedMemberIds}
                onToggleAssignment={(memberId) =>
                  setSelectedMemberIds((currentIds) =>
                    toggleSelection(currentIds, memberId),
                  )
                }
                selectedMembers={selectedMembers}
                onDeployZone={deployZoneAssignment}
                onMoveHeroToZone={moveHeroToZone}
                selectedEliteQuest={selectedEliteQuest}
                selectedEliteQuestId={selectedEliteQuestId}
                eliteHeroes={eliteHeroes}
                busyMemberIds={busyMemberIds}
                onSelectEliteQuest={setSelectedEliteQuestId}
                selectedEliteMemberIds={selectedEliteMemberIds}
                onToggleEliteMember={(memberId) =>
                  setSelectedEliteMemberIds((currentIds) =>
                    toggleZoneEliteSelection({
                      currentIds,
                      memberId,
                      heroes: eliteHeroes.filter((member) =>
                        isHeroAvailable(member, busyMemberIds),
                      ),
                      quest: selectedEliteQuest,
                      maxSize: eliteMaxSize,
                    }),
                  )
                }
                selectedEliteMembers={selectedEliteMembers}
                selectedEliteHasQuestStarter={selectedEliteHasQuestStarter}
                onDeployElite={deployEliteQuest}
                eliteMaxSize={eliteMaxSize}
                eliteMinSize={eliteMinSize}
                eliteMinLevel={eliteMinLevel}
                successChance={successChance}
              />
            )}
          </aside>
        </div>
        ) : (
          <DungeonBoard
            roster={roster}
            activeDungeonMissions={activeDungeonMissions}
            gameTimeMs={gameTimeMs}
            attunementTargets={attunementTargets}
            filteredAttunementTargets={filteredAttunementTargets}
            selectedAttunementTarget={selectedAttunementTarget}
            selectedAttunementTargetId={selectedAttunementTarget?.id}
            onSelectAttunementTarget={setSelectedAttunementTargetId}
            selectedAttunementMemberIds={selectedAttunementMemberIds}
            onToggleAttunementMember={(memberId) =>
              setSelectedAttunementMemberIds((currentIds) =>
                toggleSelection(currentIds, memberId),
              )
            }
            onSelectAttunementMembers={setSelectedAttunementMemberIds}
            onQueueAttunementGoal={queueSelectedAttunementGoal}
            onClearAttunementGoal={clearSelectedAttunementGoal}
            dungeonBoardFilter={dungeonBoardFilter}
            onDungeonBoardFilterChange={setDungeonBoardFilter}
            dungeonBoardFilterCounts={dungeonBoardFilterCounts}
            busyMemberIds={busyMemberIds}
          />
        )}
      </div>
    </>
  );

  if (isPage) {
    return (
      <section className="wow-modal-panel flex min-h-[calc(100vh-220px)] flex-col overflow-hidden rounded-lg border-2 border-cyan-900 bg-gray-950 shadow-2xl">
        {boardContent}
      </section>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-950 border-x-0 border-y-0 md:border-2 border-cyan-900 rounded-none md:rounded-lg w-full max-w-7xl h-full md:h-[92vh] flex flex-col relative shadow-2xl overflow-hidden"
    >
      {boardContent}
    </BaseModal>
  );
}

function ZoneSelectionPanel({
  summaries,
  selectedZoneId,
  realmType,
  guildFaction,
  onSelect,
}) {
  return (
    <div className="rounded-lg border border-cyan-900/45 bg-slate-950/85 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-3 py-2">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-cyan-100">
            Zone Selection
          </h4>
          <p className="text-xs text-slate-500">
            Pick a zone to inspect activity, progress, and elite objectives.
          </p>
        </div>
        <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-300">
          {summaries.length} shown
        </span>
      </div>
      <ZoneList
        summaries={summaries}
        selectedZoneId={selectedZoneId}
        realmType={realmType}
        guildFaction={guildFaction}
        onSelect={onSelect}
      />
    </div>
  );
}

function DungeonBoard({
  roster,
  activeDungeonMissions,
  gameTimeMs,
  attunementTargets,
  filteredAttunementTargets,
  selectedAttunementTarget,
  selectedAttunementTargetId,
  onSelectAttunementTarget,
  selectedAttunementMemberIds,
  onToggleAttunementMember,
  onSelectAttunementMembers,
  onQueueAttunementGoal,
  onClearAttunementGoal,
  dungeonBoardFilter,
  onDungeonBoardFilterChange,
  dungeonBoardFilterCounts,
  busyMemberIds,
}) {
  const activeRuns = Array.isArray(activeDungeonMissions)
    ? activeDungeonMissions
    : [];
  const activeRaidCount = activeRuns.filter((mission) => mission?.isRaid).length;
  const queuedGoalCount = (Array.isArray(roster) ? roster : []).reduce(
    (sum, member) => sum + getAdventureGoalQueue(member).length,
    0,
  );
  const blockedTargetCount = attunementTargets.filter(
    (target) => !target.isReady,
  ).length;
  const sourceMission = selectedAttunementTarget?.sourceMission || null;
  const selectedMembers = (Array.isArray(roster) ? roster : []).filter((member) =>
    selectedAttunementMemberIds.includes(getMemberId(member)),
  );
  const selectedQueuedMembers = selectedMembers.filter((member) =>
    hasQueuedTargetGoal(member, selectedAttunementTarget),
  );
  const selectableAttunementMemberIds = getSelectableAttunementMemberIds({
    heroes: roster,
    target: selectedAttunementTarget,
  });
  const allSelectableSelected =
    selectableAttunementMemberIds.length > 0 &&
    selectableAttunementMemberIds.every((memberId) =>
      selectedAttunementMemberIds.includes(memberId),
    );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,0.72fr)_minmax(560px,1.28fr)] gap-4 min-h-full">
      <section className="rounded-lg border border-cyan-900/50 bg-slate-950/75 p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="Active Runs" value={activeRuns.length} />
          <Stat label="Raids" value={activeRaidCount} />
          <Stat label="Queued" value={queuedGoalCount} />
          <Stat label="Blocked" value={blockedTargetCount} />
        </div>

        <SectionTitle title="Current Dungeon Runs" />
        <div className="rounded border border-slate-700/70 bg-slate-900/55 p-2">
          {activeRuns.length === 0 ? (
            <EmptyText>No dungeon or raid runs are active right now.</EmptyText>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {activeRuns.map((mission) => (
                <ActiveMissionCard
                  key={mission.instanceId || mission.id}
                  mission={mission}
                  gameTimeMs={gameTimeMs}
                  roster={roster}
                  showFinishAction={false}
                  variant="compact"
                />
              ))}
            </div>
          )}
        </div>

        <SectionTitle title="Attunement Filters" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DUNGEON_BOARD_FILTER_ORDER.map((filter) => {
            const selected = dungeonBoardFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => onDungeonBoardFilterChange(filter)}
                className={`rounded border px-2 py-2 text-xs font-semibold transition-colors ${
                  selected
                    ? "border-cyan-500/70 bg-cyan-950/45 text-cyan-100"
                    : "border-slate-700 bg-slate-950/55 text-slate-300 hover:border-cyan-700"
                }`}
              >
                {filter} {dungeonBoardFilterCounts[filter] ?? 0}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-cyan-900/50 bg-slate-950/75 p-3">
        <SectionTitle title="Attunement Planner" />
        <div className="space-y-3">
          <div className="max-h-80 overflow-y-auto rounded border border-slate-700/70 bg-slate-900/55 p-3">
            {filteredAttunementTargets.length === 0 ? (
              <EmptyText>No attunement targets match this filter.</EmptyText>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                {filteredAttunementTargets.map((target) => (
                  <AttunementTargetButton
                    key={target.id}
                    target={target}
                    selected={selectedAttunementTargetId === target.id}
                    onSelect={() => onSelectAttunementTarget(target.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded border border-slate-700/70 bg-slate-900/55 p-3">
            {!selectedAttunementTarget ? (
              <EmptyText>No attunement target selected.</EmptyText>
            ) : (
              <>
                <AttunementTargetDetail target={selectedAttunementTarget} />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <SectionTitle
                    title="Queue Heroes"
                    hint="busy heroes will queue this as their next mission"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onSelectAttunementMembers(
                        allSelectableSelected ? [] : selectableAttunementMemberIds,
                      )
                    }
                    disabled={selectableAttunementMemberIds.length === 0}
                    className="rounded border border-cyan-700 bg-cyan-950/35 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-cyan-100 transition-colors hover:bg-cyan-900/45 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {allSelectableSelected ? "Clear Selection" : "Select All"}
                  </button>
                </div>
                <AttunementHeroPicker
                  heroes={roster}
                  target={selectedAttunementTarget}
                  selectedIds={selectedAttunementMemberIds}
                  busyMemberIds={busyMemberIds}
                  onToggle={onToggleAttunementMember}
                />
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onQueueAttunementGoal}
                    disabled={!sourceMission || selectedMembers.length === 0}
                    className="btn-quest rounded px-4 py-2 text-sm font-bold text-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Queue {selectedMembers.length} for{" "}
                    {sourceMission?.dungeonWing || sourceMission?.name || "Source"}
                  </button>
                  <button
                    type="button"
                    onClick={onClearAttunementGoal}
                    disabled={selectedQueuedMembers.length === 0}
                    className="rounded border border-rose-800 bg-rose-950/35 px-4 py-2 text-sm font-bold text-rose-100 transition-colors hover:bg-rose-900/45 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear {selectedQueuedMembers.length} Queued
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function AttunementTargetButton({ target, selected, onSelect }) {
  const targetLabel = getAttunementTargetLabel(target);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded border p-3 text-left transition-colors ${
        selected
          ? "border-amber-400/70 bg-amber-900/25"
          : "border-slate-800 bg-slate-950/45 hover:border-cyan-600/70"
      }`}
    >
      <div className="flex items-center gap-3">
        <img
          src={getKeyIconUrl(target.keyId)}
          alt={getKeyLabel(target.keyId)}
          className="h-11 w-11 rounded border border-slate-700 bg-slate-950"
          onError={(event) => {
            event.currentTarget.src = getWowIconUrl("inv_misc_key_03");
          }}
        />
        <span className="min-w-0">
          <strong className="block truncate text-sm text-slate-100">
            {getKeyLabel(target.keyId)}
          </strong>
          <span className="block truncate text-xs text-slate-500">
            {targetLabel}
          </span>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <MiniStat label="Have" value={target.holders.length} />
        <MiniStat label="Need" value={target.missing.length} />
        <MiniStat label="Queued" value={target.queued.length} />
      </div>
      <span
        className={`mt-2 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          target.isReady
            ? "border-emerald-700 bg-emerald-950/40 text-emerald-200"
            : "border-rose-800 bg-rose-950/40 text-rose-200"
        }`}
      >
        {target.isReady ? "Ready" : "Blocked"}
      </span>
    </button>
  );
}

function AttunementTargetDetail({ target }) {
  const keyLabel = getKeyLabel(target.keyId);
  const sourceQuestLabel = getKeySourceQuestLabel(target.keyId);
  const sourceMission = target.sourceMission;
  const targetLabel = getAttunementTargetLabel(target);

  return (
    <div className="rounded border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
        <img
          src={getKeyIconUrl(target.keyId)}
          alt={keyLabel}
          className="h-12 w-12 rounded border border-slate-700 bg-slate-950"
          onError={(event) => {
            event.currentTarget.src = getWowIconUrl("inv_misc_key_03");
          }}
        />
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Key / Attunement
          </div>
          <h3 className="truncate text-lg font-bold text-slate-50">
            {keyLabel}
          </h3>
          <p className="truncate text-xs text-slate-500">
            {targetLabel}
          </p>
        </div>
      </div>
        <div
          className={`flex-none rounded border px-2 py-1 text-xs font-bold uppercase tracking-wide ${
            sourceMission
              ? "border-emerald-700 bg-emerald-950/40 text-emerald-200"
              : "border-rose-800 bg-rose-950/40 text-rose-200"
          }`}
        >
          {sourceMission ? "Ready" : "Blocked"}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Source
          </span>
          <span className="text-cyan-100">
            {sourceMission
              ? sourceMission.dungeonWing || sourceMission.name
              : sourceQuestLabel || "No playable source in current data"}
          </span>
        </div>
        {sourceQuestLabel && (
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Quest
            </span>
            <span>{sourceQuestLabel}</span>
          </div>
        )}
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Progress
          </span>
          <span>
            {target.holders.length} have it, {target.missing.length} still need it,{" "}
            {target.queued.length} queued
          </span>
        </div>
      </div>
    </div>
  );
}

function AttunementHeroPicker({
  heroes,
  target,
  selectedIds,
  busyMemberIds,
  onToggle,
}) {
  const sortedHeroes = getAttunementEligibleMembers({
    members: heroes,
    target,
  }).sort((left, right) => {
    const leftBusy = isHeroOnMission(left, busyMemberIds);
    const rightBusy = isHeroOnMission(right, busyMemberIds);
    if (leftBusy !== rightBusy) return leftBusy ? 1 : -1;
    const leftQueued = hasQueuedTargetGoal(left, target);
    const rightQueued = hasQueuedTargetGoal(right, target);
    if (leftQueued !== rightQueued) return leftQueued ? -1 : 1;
    const levelDelta = getHeroLevel(right) - getHeroLevel(left);
    if (levelDelta !== 0) return levelDelta;
    return String(left?.name || "").localeCompare(String(right?.name || ""));
  });

  if (sortedHeroes.length === 0) {
    return (
      <EmptyText>
        No heroes can currently start this attunement source.
      </EmptyText>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-1.5">
      {sortedHeroes.map((hero) => {
        const memberId = getMemberId(hero);
        const selected = selectedIds.includes(memberId);
        const queued = hasQueuedTargetGoal(hero, target);
        const onMission = isHeroOnMission(hero, busyMemberIds);

        return (
          <button
            key={memberId}
            type="button"
            onClick={() => onToggle(memberId)}
            className={`rounded border px-2 py-2 text-left transition-colors ${
              selected
                  ? "border-emerald-500/70 bg-emerald-950/35 text-emerald-100"
                  : queued
                    ? "border-amber-500/60 bg-amber-950/25 text-amber-100"
                    : "border-slate-700 bg-slate-950/50 text-slate-200 hover:border-cyan-600"
            }`}
          >
            <HeroIdentity hero={hero} compact />
            <span className="mt-1 block truncate text-xs text-slate-500">
              Level {hero.level ?? 1}
              {hero.role ? `, ${getRoleIcon(hero.role)} ${hero.role}` : ""}
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {queued && <StatusPill tone="amber">Queued</StatusPill>}
              {onMission && <StatusPill tone="slate">On Mission</StatusPill>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StatusPill({ tone, children }) {
  const className =
    tone === "emerald"
      ? "border-emerald-700 bg-emerald-950/40 text-emerald-200"
      : tone === "amber"
        ? "border-amber-700 bg-amber-950/40 text-amber-200"
        : tone === "rose"
          ? "border-rose-800 bg-rose-950/40 text-rose-200"
          : "border-slate-700 bg-slate-900 text-slate-500";
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

function hasQueuedTargetGoal(hero, target) {
  if (!hero || !target?.sourceMission) return false;
  const targetMissionIds = Array.isArray(target.targetMissionIds)
    ? target.targetMissionIds.map((missionId) => String(missionId))
    : [];
  return getAdventureGoalQueue(hero).some(
    (goal) =>
      goal.keyId === target.keyId &&
      goal.sourceMissionId === String(target.sourceMission.id) &&
      (goal.targetMissionId === String(target.goalTargetId || "") ||
        !goal.targetMissionId ||
        targetMissionIds.includes(String(goal.targetMissionId))),
  );
}

function getAttunementMissionLabel(mission) {
  if (!mission) return "Unknown destination";
  if (mission.dungeonWing && mission.dungeonSetName) {
    return `${mission.dungeonSetName}: ${mission.dungeonWing}`;
  }
  return mission.dungeonWing || mission.name || "Unknown destination";
}

function getAttunementTargetLabel(target) {
  const targetMissions = Array.isArray(target?.targetMissions)
    ? target.targetMissions
    : target?.targetMission
      ? [target.targetMission]
      : [];
  const labels = [
    ...new Set(targetMissions.map(getAttunementMissionLabel).filter(Boolean)),
  ];
  if (labels.length === 0) return "No locked destination found";
  if (labels.length === 1) return `Unlocks ${labels[0]}`;
  if (labels.length === 2) return `Unlocks ${labels[0]} and ${labels[1]}`;
  return `Unlocks ${labels.length} places: ${labels
    .slice(0, 2)
    .join(", ")} +${labels.length - 2} more`;
}

function getSelectableAttunementMemberIds({ heroes, target }) {
  return getAttunementEligibleMembers({ members: heroes, target })
    .map((hero) => getMemberId(hero))
    .filter(Boolean);
}

function Stat({ label, value }) {
  return (
    <div className="rounded border border-slate-700/70 bg-slate-900/70 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-lg font-extrabold text-slate-50">{value}</div>
    </div>
  );
}

function SelectedZoneMap({
  selectedSummary,
  zoneMap,
  realmType,
  guildFaction,
  realmState,
  guildName,
  imageFailed,
  onImageError,
}) {
  if (!selectedSummary) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-950/75 p-3">
        <EmptyText>No zone selected.</EmptyText>
      </div>
    );
  }

  const { zone } = selectedSummary;
  const pvpTerritory = getWorldPvpProfile({
    zone,
    characterFaction: guildFaction,
    realmType,
  });
  const realmRows = getRealmPlayersInZone({
    realmState,
    zoneId: zone.id,
    limit: 24,
  }).map((player) => ({
    memberId: player.id,
    id: player.id,
    name: player.name,
    race: player.race,
    gender: player.gender || "Male",
    charClass: player.charClass,
    role: player.role,
    level: player.level,
    progress: Math.round(Number(player.zoneProgress) || 0),
    inZone: true,
    guildName: player.sourceGuildName || "Unguilded",
    isRealmPlayer: true,
  }));
  const playerRows = selectedSummary.heroesInZone.map((row) => ({
    ...row,
    guildName: guildName || "Your Guild",
    isPlayerGuild: true,
  }));
  const currentActivityRows = [...playerRows, ...realmRows];
  const shownActivityRows = currentActivityRows.slice(0, 18);

  return (
    <div className="rounded-lg border border-cyan-900/45 bg-slate-950/85 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 px-3 py-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold uppercase tracking-wide text-cyan-100">
            Selected Zone Map
          </h4>
          <p className="truncate text-xs text-slate-500">
            {zone.name} - Level {zone.minLevel}-{zone.maxLevel}
            <PvpTerritoryLabel pvpTerritory={pvpTerritory} />
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs">
          <MiniStat label="Here" value={currentActivityRows.length} />
          <MiniStat label="Best" value={`${selectedSummary.guildBestProgress}%`} />
          <MiniStat
            label="Avg"
            value={`${selectedSummary.activeAverageProgress}%`}
          />
        </div>
      </div>

      <div>
        <div className="relative min-h-[230px] bg-slate-950">
          {zoneMap && !imageFailed ? (
            <img
              alt={`${zone.name} zone map`}
              src={zoneMap.src}
              onError={onImageError}
              className="h-full max-h-[360px] min-h-[230px] w-full object-contain"
            />
          ) : (
            <div className="flex min-h-[230px] items-center justify-center p-5 text-center">
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Classic zone map unavailable
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {zone.name} still has full command data in the panel.
                </p>
              </div>
            </div>
          )}
          {zoneMap && (
            <a
              href={zoneMap.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-2 right-3 rounded border border-slate-800 bg-slate-950/80 px-2 py-1 text-xs text-cyan-300 shadow hover:text-cyan-100"
            >
              Source: {zoneMap.sourceName}
            </a>
          )}
        </div>

        <div className="border-t border-slate-800 bg-slate-900/55 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h5 className="text-xs font-bold uppercase tracking-wide text-slate-300">
              Current Activity
            </h5>
            <span className="text-xs text-slate-500">
              Your guild is highlighted in gold
            </span>
          </div>
          <div className="mt-2 max-h-[260px] overflow-y-auto pr-1">
            {shownActivityRows.length === 0 ? (
              <EmptyText>No characters are in this zone.</EmptyText>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {shownActivityRows.map((row) => (
                  <div
                    key={row.memberId}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded border px-2 py-1.5 text-xs ${
                      row.isPlayerGuild
                        ? "border-amber-500/45 bg-amber-950/20"
                        : "border-slate-800/80 bg-slate-950/35"
                    }`}
                  >
                    <span className="min-w-0">
                      <HeroIdentity hero={row} compact showGuildTag />
                      <span className="mt-1 block">
                        <ActivityBadge row={row} />
                      </span>
                    </span>
                    <span className="font-semibold text-amber-100">
                      {row.progress}%
                    </span>
                  </div>
                ))}
              </div>
            )}
            {currentActivityRows.length > shownActivityRows.length && (
              <div className="mt-2 text-xs text-slate-500">
                +{currentActivityRows.length - shownActivityRows.length} more
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="font-bold text-slate-100">{value}</div>
    </div>
  );
}

function ZoneList({ summaries, selectedZoneId, realmType, guildFaction, onSelect }) {
  return (
    <div className="max-h-none overflow-visible p-2 md:max-h-64 md:overflow-y-auto">
      {summaries.length === 0 ? (
        <div className="text-sm text-slate-400">No zones match this filter yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2">
          {summaries.map((summary) => {
            const selected = selectedZoneId === summary.zone.id;
            const pvpTerritory = getWorldPvpProfile({
              zone: summary.zone,
              characterFaction: guildFaction,
              realmType,
            });
            return (
              <button
                key={summary.zone.id}
                type="button"
                onClick={() => onSelect(summary.zone.id)}
                className={`grid min-h-[64px] w-full grid-cols-[1fr_auto] items-center gap-2 rounded border px-3 py-2 text-left transition-colors ${
                  selected
                    ? "border-amber-400/70 bg-amber-900/25"
                    : "border-slate-800 bg-slate-950/45 hover:border-cyan-600/70"
                }`}
              >
                <span className="min-w-0">
                  <strong className="block truncate text-sm text-slate-100">
                    {summary.zone.name}
                  </strong>
                  <span className="block truncate text-xs text-slate-500">
                    Level {summary.zone.minLevel}-{summary.zone.maxLevel}
                    <PvpTerritoryLabel
                      pvpTerritory={pvpTerritory}
                      separator=", "
                    />
                    {summary.activeEliteCount > 0
                      ? `, ${summary.activeEliteCount} elite active`
                      : ""}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-slate-500">
                    {summary.accessible ? "Available" : "Faction locked"}
                    {summary.clearedCount > 0
                      ? `, ${summary.clearedCount} cleared`
                      : ""}
                  </span>
                </span>
                <span className="text-xs font-semibold text-amber-100">
                  {summary.heroCount} here
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ZoneDetail({
  summary,
  guildFaction,
  realmType,
  worldPvpState,
  latestPvpLog,
  availableHeroes,
  selectedMemberIds,
  onToggleAssignment,
  selectedMembers,
  onDeployZone,
  onMoveHeroToZone,
  selectedEliteQuest,
  selectedEliteQuestId,
  eliteHeroes,
  busyMemberIds,
  onSelectEliteQuest,
  selectedEliteMemberIds,
  onToggleEliteMember,
  selectedEliteMembers,
  selectedEliteHasQuestStarter,
  onDeployElite,
  eliteMaxSize,
  eliteMinSize,
  eliteMinLevel,
  successChance,
}) {
  const { zone } = summary;
  const pvpTerritory = getWorldPvpProfile({
    zone,
    characterFaction: guildFaction,
    realmType,
  });
  const zonePvpStats = worldPvpState?.zoneStats?.[zone.id] || {};
  const exposedHeroes = summary.heroesInZone.filter(
    (row) => row?.member?.status !== "Questing" && pvpTerritory.active,
  );
  const tags = [
    pvpTerritory?.label,
    zone.faction,
    ...(Array.isArray(zone.biomes) ? zone.biomes : []),
    ...(Array.isArray(zone.enemies) ? zone.enemies : []),
  ].filter(Boolean);
  const isZoneLocked = !summary.accessible;
  const [isZoneProgressOpen, setIsZoneProgressOpen] = useState(false);
  const [zoneProgressFilter, setZoneProgressFilter] = useState(
    ZONE_PROGRESS_FILTERS.IN_PROGRESS,
  );
  const [eliteObjectiveFilter, setEliteObjectiveFilter] = useState(
    ZONE_ELITE_FILTERS.IN_PROGRESS,
  );
  useEffect(() => {
    setEliteObjectiveFilter(ZONE_ELITE_FILTERS.IN_PROGRESS);
  }, [selectedEliteQuestId]);
  const zoneProgressRowsByFilter = useMemo(() => {
    const progressRows = Array.isArray(summary.progressRows)
      ? summary.progressRows
      : [];
    return {
      [ZONE_PROGRESS_FILTERS.IN_PROGRESS]: progressRows.filter(
        (row) => !row.cleared && Number(row.progress) < 100,
      ),
      [ZONE_PROGRESS_FILTERS.COMPLETED]: progressRows.filter(
        (row) => row.cleared || Number(row.progress) >= 100,
      ),
    };
  }, [summary.progressRows]);
  const filteredProgressRows =
    zoneProgressRowsByFilter[zoneProgressFilter] || [];
  const totalProgressRows = Array.isArray(summary.progressRows)
    ? summary.progressRows.length
    : 0;
  const eliteHeroesByFilter = useMemo(() => {
    const heroes = Array.isArray(eliteHeroes) ? eliteHeroes : [];
    if (!selectedEliteQuest) {
      return {
        [ZONE_ELITE_FILTERS.IN_PROGRESS]: [],
        [ZONE_ELITE_FILTERS.COMPLETED]: [],
      };
    }
    return {
      [ZONE_ELITE_FILTERS.IN_PROGRESS]: heroes.filter(
        (member) => !hasCompletedZoneEliteQuest(member, selectedEliteQuest),
      ),
      [ZONE_ELITE_FILTERS.COMPLETED]: heroes.filter((member) =>
        hasCompletedZoneEliteQuest(member, selectedEliteQuest),
      ),
    };
  }, [eliteHeroes, selectedEliteQuest]);
  const filteredEliteHeroes =
    eliteHeroesByFilter[eliteObjectiveFilter] || [];
  const totalEliteHeroes = selectedEliteQuest
    ? eliteHeroesByFilter[ZONE_ELITE_FILTERS.IN_PROGRESS].length +
      eliteHeroesByFilter[ZONE_ELITE_FILTERS.COMPLETED].length
    : 0;
  const [movingHeroId, setMovingHeroId] = useState(null);
  const getMoveZoneOptions = (hero) => {
    const heroLevel = Math.max(1, Number(hero?.level) || 1);
    const currentZoneId = String(hero?.member?.currentZoneId || hero?.currentZoneId || "");
    return ZONE_DEFINITIONS.filter((candidateZone) => {
      if (candidateZone.id === currentZoneId) return false;
      if (!isZoneAccessibleForFaction(candidateZone, guildFaction)) return false;
      return (
        heroLevel >= Math.max(1, Number(candidateZone.minLevel) || 1) &&
        heroLevel <= Math.max(candidateZone.minLevel, Number(candidateZone.maxLevel) || 1)
      );
    }).sort((left, right) => {
      if (left.minLevel !== right.minLevel) return left.minLevel - right.minLevel;
      return left.name.localeCompare(right.name);
    });
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold text-slate-50">
              {zone.name}
            </h3>
            <p className="text-sm text-slate-400">
              Level {zone.minLevel}-{zone.maxLevel}
              <PvpTerritoryLabel pvpTerritory={pvpTerritory} />
              {isZoneLocked ? " - faction locked" : ""}
            </p>
          </div>
          <span
            className={`rounded border px-2 py-1 text-xs font-semibold ${
              isZoneLocked
                ? "border-slate-600 bg-slate-800 text-slate-300"
                : "border-emerald-500/50 bg-emerald-950/35 text-emerald-100"
            }`}
          >
            {isZoneLocked ? "Locked" : "Open"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              title={tag === pvpTerritory?.label ? pvpTerritory.description : undefined}
              className={`rounded-full border px-2 py-1 text-xs ${getPvpTagClass(tag, pvpTerritory)}`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="Heroes" value={summary.heroCount} />
        <Stat label="Best" value={`${summary.guildBestProgress}%`} />
        <Stat label="Average" value={`${summary.activeAverageProgress}%`} />
      </div>

      <div className="mb-3 rounded border border-orange-900/50 bg-slate-900/55 p-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-orange-100">
              World PvP
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {pvpTerritory.description}{" "}
              <span className={pvpTerritory.active ? "text-orange-200" : "text-slate-500"}>
                {pvpTerritory.active ? "Active on this realm." : "Inactive on this realm."}
              </span>
            </p>
          </div>
          <span className={`rounded border px-2 py-1 text-xs font-semibold ${getPvpTagClass(pvpTerritory.label, pvpTerritory)}`}>
            {pvpTerritory.label}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <MiniStat label="Exposed" value={exposedHeroes.length} />
          <MiniStat label="Honor" value={zonePvpStats.honorEarned || 0} />
          <MiniStat label="Events" value={zonePvpStats.eventsTriggered || 0} />
        </div>
        {latestPvpLog ? (
          <div className="mt-2 rounded border border-slate-800 bg-slate-950/45 px-2 py-1.5 text-xs text-orange-100">
            {latestPvpLog.summary}
          </div>
        ) : null}
      </div>

      <SectionTitle
        title="Heroes In Zone"
        hint='Click ">" to move heroes'
      />
      <div className="mb-3 rounded border border-slate-700/70 bg-slate-900/55 p-2">
        {summary.heroesInZone.length === 0 ? (
          <EmptyText>No heroes are currently questing here.</EmptyText>
        ) : (
          summary.heroesInZone.map((row) => (
            <ProgressRow
              key={row.memberId}
              row={row}
              moveZoneOptions={getMoveZoneOptions(row)}
              isMoveOpen={movingHeroId === row.memberId}
              onToggleMove={() =>
                setMovingHeroId((currentHeroId) =>
                  currentHeroId === row.memberId ? null : row.memberId,
                )
              }
              onMoveToZone={(zoneId) => {
                const moved = onMoveHeroToZone?.(row.memberId, zoneId);
                if (moved !== false) setMovingHeroId(null);
              }}
            />
          ))
        )}
      </div>

      <div className="mb-3 rounded border border-slate-700/70 bg-slate-900/55">
        <button
          type="button"
          onClick={() => setIsZoneProgressOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 px-2 py-2 text-left"
        >
          <span>
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-300">
              Zone Progress
            </span>
            <span className="text-xs text-slate-500">
              {totalProgressRows} recorded,{" "}
              {zoneProgressRowsByFilter[ZONE_PROGRESS_FILTERS.IN_PROGRESS].length} in progress,{" "}
              {zoneProgressRowsByFilter[ZONE_PROGRESS_FILTERS.COMPLETED].length} completed
            </span>
          </span>
          <span className="text-lg font-bold text-slate-400">
            {isZoneProgressOpen ? "−" : "+"}
          </span>
        </button>
        {isZoneProgressOpen && (
          <div className="border-t border-slate-800 p-2">
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              {ZONE_PROGRESS_FILTER_ORDER.map((filter) => {
                const selected = zoneProgressFilter === filter;
                const count = zoneProgressRowsByFilter[filter]?.length || 0;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setZoneProgressFilter(filter)}
                    className={`rounded border px-2 py-1.5 text-xs font-semibold transition-colors ${
                      selected
                        ? "border-cyan-500/70 bg-cyan-950/45 text-cyan-100"
                        : "border-slate-700 bg-slate-950/55 text-slate-300 hover:border-cyan-700"
                    }`}
                  >
                    {filter} {count}
                  </button>
                );
              })}
            </div>
            {totalProgressRows === 0 ? (
              <EmptyText>No recorded progress in this zone yet.</EmptyText>
            ) : filteredProgressRows.length === 0 ? (
              <EmptyText>No heroes match this progress filter.</EmptyText>
            ) : (
              filteredProgressRows.map((row) => (
                <ProgressRow key={row.memberId} row={row} />
              ))
            )}
          </div>
        )}
      </div>

      <SectionTitle title="Assign Heroes" />
      <div className="mb-3 rounded border border-slate-700/70 bg-slate-900/55 p-2">
        <HeroPicker
          heroes={availableHeroes}
          selectedIds={selectedMemberIds}
          onToggle={onToggleAssignment}
          emptyText="No idle heroes available for zone assignment."
        />
        <button
          type="button"
          onClick={onDeployZone}
          disabled={
            isZoneLocked || !summary.zoneMission || selectedMembers.length === 0
          }
          className="btn-quest mt-2 w-full rounded px-4 py-2 text-sm font-bold text-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Assign {selectedMembers.length} to {zone.name}
        </button>
      </div>

      <SectionTitle title="Zone Elite Objectives" />
      <div className="rounded border border-slate-700/70 bg-slate-900/55 p-2">
        {summary.eliteQuests.length === 0 ? (
          <EmptyText>No elite objectives are available here.</EmptyText>
        ) : (
          <>
            <select
              value={selectedEliteQuestId ?? ""}
              onChange={(event) => onSelectEliteQuest(event.target.value)}
              className="mb-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              {summary.eliteQuests.map((quest) => (
                <option key={quest.id} value={quest.id}>
                  {quest.name}
                  {quest.isActive ? " (active)" : ""}
                </option>
              ))}
            </select>

            {selectedEliteQuest && (
              <div className="mb-2 rounded border border-slate-800 bg-slate-950/60 p-2 text-xs text-slate-300">
                <div>
                  Party {eliteMinSize}-{eliteMaxSize}, level{" "}
                  {selectedEliteQuest.recommended ?? selectedEliteQuest.level}
                  {successChance ? `, success ${successChance}` : ""}
                </div>
                <div className="mt-1 text-slate-500">
                  {totalEliteHeroes} heroes,{" "}
                  {eliteHeroesByFilter[ZONE_ELITE_FILTERS.IN_PROGRESS].length} in progress,{" "}
                  {eliteHeroesByFilter[ZONE_ELITE_FILTERS.COMPLETED].length} completed
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {ZONE_ELITE_FILTER_ORDER.map((filter) => {
                    const selected = eliteObjectiveFilter === filter;
                    const count = eliteHeroesByFilter[filter]?.length || 0;
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setEliteObjectiveFilter(filter)}
                        className={`rounded border px-2 py-1.5 text-xs font-semibold transition-colors ${
                          selected
                            ? "border-cyan-500/70 bg-cyan-950/45 text-cyan-100"
                            : "border-slate-700 bg-slate-950/55 text-slate-300 hover:border-cyan-700"
                        }`}
                      >
                        {filter} {count}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <HeroPicker
              heroes={filteredEliteHeroes}
              selectedIds={selectedEliteMemberIds}
              onToggle={onToggleEliteMember}
              maxSize={eliteMaxSize}
              minLevel={eliteMinLevel}
              eliteQuest={selectedEliteQuest}
              selectedHasOpenQuestStarter={selectedEliteHasQuestStarter}
              busyMemberIds={busyMemberIds}
              emptyText="No heroes match this elite objective filter."
            />
            <button
              type="button"
              onClick={onDeployElite}
              disabled={
                isZoneLocked ||
                !selectedEliteQuest ||
                selectedEliteMembers.length < eliteMinSize ||
                !selectedEliteHasQuestStarter
              }
              className="btn-quest mt-2 w-full rounded px-4 py-2 text-sm font-bold text-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Elite with {selectedEliteMembers.length}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title, hint = "" }) {
  return (
    <h4 className="mb-1.5 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-wide text-slate-300">
      <span>{title}</span>
      {hint && (
        <span className="normal-case tracking-normal text-slate-500">
          {hint}
        </span>
      )}
    </h4>
  );
}

function EmptyText({ children }) {
  return <div className="text-sm text-slate-400">{children}</div>;
}

function HeroIdentity({ hero, compact = false, showGuildTag = false }) {
  const charClass = hero?.charClass ?? hero?.className ?? hero?.class;
  const classInfo = DB_CLASSES?.[charClass];
  const raceIconUrl = hero?.race
    ? getRacePortraitUrl(hero.race, hero.gender)
    : getWowIconUrl("inv_misc_questionmark");
  const classIconUrl = classInfo?.icon || getWowIconUrl("inv_misc_questionmark");
  const iconSizeClass = compact ? "h-5 w-5" : "h-6 w-6";
  const guildName = String(hero?.guildName || "").trim();
  const showRealGuildTag =
    showGuildTag && guildName && guildName.toLowerCase() !== "unguilded";
  const level = Math.max(0, Math.floor(Number(hero?.level) || 0));

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex flex-none items-center gap-1">
        <img
          src={raceIconUrl}
          alt={hero?.race || "Race"}
          title={hero?.race || "Race"}
          className={`${iconSizeClass} rounded border border-slate-700 bg-slate-950 object-cover`}
          onError={(event) => {
            event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
          }}
        />
        <img
          src={classIconUrl}
          alt={charClass || "Class"}
          title={charClass || "Class"}
          className={`${iconSizeClass} rounded border border-slate-700 bg-slate-950 object-cover`}
          onError={(event) => {
            event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
          }}
        />
      </span>
      <span className="block min-w-0 truncate text-sm">
        <strong
          className="font-bold text-slate-100"
          style={classInfo?.color ? { color: classInfo.color } : undefined}
        >
          {hero?.name || "Unknown Hero"}
        </strong>
        {level > 0 && (
          <span className="ml-1 rounded border border-slate-700 bg-slate-900/80 px-1 py-0.5 text-[10px] font-bold leading-none text-slate-300">
            Lvl {level}
          </span>
        )}
        {showRealGuildTag && (
          <span className="ml-1 text-[11px] font-semibold text-cyan-200/80">
            &lt;{guildName}&gt;
          </span>
        )}
      </span>
    </div>
  );
}

function ActivityBadge({ row }) {
  if (row?.isGroupQuesting) {
    return (
      <span
        title={row.activeZoneEliteName || "Zone Elite"}
        className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-950/45 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-100"
      >
        <span className="zone-elite-party-pulse" aria-hidden="true">
          <span>*</span>
          <span>*</span>
          <span>*</span>
        </span>
        Group Quest
      </span>
    );
  }

  if (row?.inZone) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-950/45 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100">
        <span className="relative h-3 w-3 flex-none animate-pulse" aria-hidden="true">
          <span className="absolute left-1/2 top-0 h-3 w-0.5 -translate-x-1/2 rotate-45 rounded bg-emerald-200 shadow-[0_0_6px_rgba(110,231,183,0.9)]" />
          <span className="absolute left-1/2 top-0 h-3 w-0.5 -translate-x-1/2 -rotate-45 rounded bg-cyan-100 shadow-[0_0_6px_rgba(165,243,252,0.9)]" />
        </span>
        Questing
      </span>
    );
  }

  if (row?.cleared) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-950/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100">
        <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.75)]" />
        Cleared
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
      <span className="h-2 w-2 rounded-full bg-slate-500" />
      Idle
    </span>
  );
}

function ProgressRow({
  row,
  moveZoneOptions = [],
  isMoveOpen = false,
  onToggleMove,
  onMoveToZone,
}) {
  const canMove =
    moveZoneOptions.length > 0 &&
    typeof onToggleMove === "function" &&
    typeof onMoveToZone === "function";

  return (
    <div className="border-b border-slate-800/80 py-2 last:border-b-0">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0">
          <HeroIdentity hero={row} compact />
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>
              Level {row.level}
              {row.role ? `, ${getRoleIcon(row.role)} ${row.role}` : ""}
              {row.className ? `, ${row.className}` : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <ActivityBadge row={row} />
              {canMove && (
                <button
                  type="button"
                  onClick={onToggleMove}
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-950/35 text-[11px] font-bold text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.12)] transition-all hover:border-cyan-300 hover:bg-cyan-900/50 ${
                    isMoveOpen ? "rotate-90 text-amber-100" : ""
                  }`}
                  aria-expanded={isMoveOpen}
                  aria-label={`Move ${row.name || "hero"} to another zone`}
                  title="Move to another available zone"
                >
                  &gt;
                </button>
              )}
            </span>
          </div>
        </div>
        <span className="text-sm font-bold text-amber-100">{row.progress}%</span>
      </div>
      {canMove && isMoveOpen && (
        <div className="zone-move-panel mt-2 rounded border border-cyan-800/55 bg-slate-950/80 p-2">
          <label
            htmlFor={`zone-move-${row.memberId}`}
            className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-cyan-100/80"
          >
            Move to zone
          </label>
          <select
            id={`zone-move-${row.memberId}`}
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) onMoveToZone(event.target.value);
            }}
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
          >
            <option value="" disabled>
              Choose destination
            </option>
            {moveZoneOptions.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} (Level {zone.minLevel}-{zone.maxLevel})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function HeroPicker({
  heroes,
  selectedIds,
  onToggle,
  maxSize,
  minLevel = 1,
  eliteQuest = null,
  selectedHasOpenQuestStarter = true,
  busyMemberIds = new Set(),
  emptyText,
}) {
  if (heroes.length === 0) {
    return <EmptyText>{emptyText}</EmptyText>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      {heroes.map((hero) => {
        const memberId = getMemberId(hero);
        const selected = selectedIds.includes(memberId);
        const levelLocked = getHeroLevel(hero) < minLevel;
        const sizeLocked = !selected && maxSize && selectedIds.length >= maxSize;
        const onMissionLocked = isHeroOnMission(hero, busyMemberIds);
        const eliteDone =
          eliteQuest && hasCompletedZoneEliteQuest(hero, eliteQuest);
        const doneLocked =
          eliteDone && !selected && !selectedHasOpenQuestStarter;
        const disabled = levelLocked || sizeLocked || doneLocked || onMissionLocked;

        return (
          <button
            key={memberId}
            type="button"
            onClick={() => onToggle(memberId)}
            disabled={disabled}
            className={`rounded border px-2 py-2 text-left transition-colors ${
              disabled
                ? "cursor-not-allowed border-slate-800 bg-slate-950/50 text-slate-600"
                : selected
                  ? "border-emerald-500/70 bg-emerald-950/35 text-emerald-100"
                  : "border-slate-700 bg-slate-950/50 text-slate-200 hover:border-cyan-600"
            }`}
          >
            <HeroIdentity hero={hero} compact />
            <span className="mt-1 block truncate text-xs text-slate-500">
              Level {hero.level ?? 1}
              {hero.role ? `, ${getRoleIcon(hero.role)} ${hero.role}` : ""}
              {hero.charClass ? `, ${hero.charClass}` : ""}
              {levelLocked ? `, needs ${minLevel}` : ""}
            </span>
            {(eliteDone || onMissionLocked) && (
              <span
                className={`mt-1 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  onMissionLocked || doneLocked
                    ? "border-slate-700 bg-slate-900 text-slate-500"
                    : "border-emerald-700 bg-emerald-950/40 text-emerald-200"
                }`}
              >
                {onMissionLocked ? "On Mission" : "Done"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
