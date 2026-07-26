import { useEffect, useMemo, useState } from "react";

import ActiveMissionCard from "./ActiveMissionCard";
import LfgSearchCard from "./dungeons/LfgSearchCard";
import { DB_CLASSES } from "../constants";
import {
  buildDungeonAttunementTargets,
  getAdventureGoalQueue,
  getAttunementEligibleMembers,
} from "../automation/adventureGoals";
import {
  getKeyIconUrl,
  getKeyLabel,
  getKeySourceQuestLabel,
  getRacePortraitUrl,
  getRoleIcon,
  getWowIconUrl,
} from "../utils";
import {
  getActiveEliteQuestMissions,
  getActiveDungeonRunMissions,
  getFormingDungeonSearches,
} from "../dungeons/dungeonBoardUtils";

const DUNGEON_BOARD_TABS = Object.freeze({
  RUNS: "Dungeon Runs",
  ATTUNEMENTS: "Attunement Planner",
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

const getMemberId = (member) => member?.id ?? member?.name;

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
  return !["Questing", "Dungeon", "Raid", "Mission", "Battleground"].includes(
    member?.status,
  );
};

const isHeroOnMission = (member, busyMemberIds) =>
  !isHeroAvailable(member, busyMemberIds);

const toggleSelection = (currentIds, memberId) =>
  currentIds.includes(memberId)
    ? currentIds.filter((id) => id !== memberId)
    : [...currentIds, memberId];

const getHeroLevel = (hero) => Math.max(1, Number(hero?.level) || 1);

export default function DungeonBoardPanel({
  roster = [],
  missionList = [],
  activeMissions = [],
  socialState,
  gameTimeMs,
  onManualFinish,
  onQueueAdventureGoal,
  onClearAdventureGoal,
}) {
  const [activeTab, setActiveTab] = useState(DUNGEON_BOARD_TABS.RUNS);
  const [dungeonBoardFilter, setDungeonBoardFilter] = useState(
    DUNGEON_BOARD_FILTERS.ALL,
  );
  const [selectedAttunementTargetId, setSelectedAttunementTargetId] =
    useState(null);
  const [selectedAttunementMemberIds, setSelectedAttunementMemberIds] =
    useState([]);

  const activeRuns = useMemo(
    () => getActiveDungeonRunMissions(activeMissions),
    [activeMissions],
  );
  const activeEliteQuests = useMemo(
    () => getActiveEliteQuestMissions(activeMissions),
    [activeMissions],
  );
  const formingDungeonSearches = useMemo(
    () => getFormingDungeonSearches(socialState),
    [socialState],
  );
  const activeRaidCount = activeRuns.filter((mission) => mission?.isRaid).length;
  const activeDungeonCount = activeRuns.length - activeRaidCount;
  const busyMemberIds = useMemo(() => {
    const ids = new Set();
    activeMissions.forEach((mission) => {
      getMissionMemberIds(mission).forEach((memberId) => ids.add(memberId));
    });
    return ids;
  }, [activeMissions]);

  const attunementTargets = useMemo(
    () => buildDungeonAttunementTargets({ missionList, roster }),
    [missionList, roster],
  );
  const queuedGoalCount = useMemo(
    () =>
      (Array.isArray(roster) ? roster : []).reduce(
        (sum, member) => sum + getAdventureGoalQueue(member).length,
        0,
      ),
    [roster],
  );
  const blockedTargetCount = attunementTargets.filter(
    (target) => !target.isReady,
  ).length;
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
      case DUNGEON_BOARD_FILTERS.ALL:
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
    if (activeTab !== DUNGEON_BOARD_TABS.ATTUNEMENTS) return;
    const selectedVisible = filteredAttunementTargets.some(
      (target) => target.id === selectedAttunementTargetId,
    );
    if (!selectedAttunementTargetId || !selectedVisible) {
      setSelectedAttunementTargetId(
        filteredAttunementTargets[0]?.id ?? attunementTargets[0]?.id ?? null,
      );
    }
  }, [
    activeTab,
    attunementTargets,
    filteredAttunementTargets,
    selectedAttunementTargetId,
  ]);

  useEffect(() => {
    setSelectedAttunementMemberIds([]);
  }, [selectedAttunementTarget?.id]);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 border-b border-cyan-900/45 pb-3">
        {Object.values(DUNGEON_BOARD_TABS).map((tab) => {
          const selected = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                selected
                  ? "border-cyan-400/70 bg-cyan-950/55 text-cyan-100"
                  : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-cyan-600"
              }`}
            >
              {tab}
              {tab === DUNGEON_BOARD_TABS.RUNS &&
                activeRuns.length + formingDungeonSearches.length > 0 && (
                <span className="ml-2 rounded-full border border-cyan-300/60 bg-cyan-400/15 px-1.5 py-0.5 text-[10px] text-cyan-100">
                  {activeRuns.length + formingDungeonSearches.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === DUNGEON_BOARD_TABS.RUNS ? (
        <DungeonRunsView
          roster={roster}
          activeRuns={activeRuns}
          activeEliteQuests={activeEliteQuests}
          formingDungeonSearches={formingDungeonSearches}
          activeDungeonCount={activeDungeonCount}
          activeRaidCount={activeRaidCount}
          queuedGoalCount={queuedGoalCount}
          gameTimeMs={gameTimeMs}
          onManualFinish={onManualFinish}
        />
      ) : (
        <AttunementPlannerView
          roster={roster}
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
          queuedGoalCount={queuedGoalCount}
          blockedTargetCount={blockedTargetCount}
        />
      )}
    </div>
  );
}

function DungeonRunsView({
  roster,
  activeRuns,
  activeEliteQuests,
  formingDungeonSearches,
  activeDungeonCount,
  activeRaidCount,
  queuedGoalCount,
  gameTimeMs,
  onManualFinish,
}) {
  return (
    <section className="rounded-lg border border-cyan-900/50 bg-slate-950/75 p-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Active Runs" value={activeRuns.length} />
        <Stat label="Forming" value={formingDungeonSearches.length} />
        <Stat label="Dungeons" value={activeDungeonCount} />
        <Stat label="Raids" value={activeRaidCount} />
        <Stat label="Elite Quests" value={activeEliteQuests.length} />
        <Stat label="Queued Goals" value={queuedGoalCount} />
      </div>

      <SectionTitle title="Groups Forming" />
      <div className="rounded border border-cyan-900/60 bg-cyan-950/10 p-3">
        {formingDungeonSearches.length === 0 ? (
          <EmptyText>No dungeon groups are looking for members right now.</EmptyText>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {formingDungeonSearches.map((search) => (
              <LfgSearchCard
                key={search.id}
                search={search}
                gameTimeMs={gameTimeMs}
              />
            ))}
          </div>
        )}
      </div>

      <SectionTitle title="Current Dungeon And Raid Runs" />
      <div className="rounded border border-slate-700/70 bg-slate-900/55 p-3">
        {activeRuns.length === 0 ? (
          <EmptyText>No dungeon or raid runs are active right now.</EmptyText>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {activeRuns.map((mission) => (
              <ActiveMissionCard
                key={mission.instanceId || mission.id}
                mission={mission}
                onFinish={onManualFinish}
                gameTimeMs={gameTimeMs}
                roster={roster}
                showFinishAction={!!onManualFinish}
              />
            ))}
          </div>
        )}
      </div>

      <SectionTitle
        title="Guild Elite Quests"
        hint="secondary field activity"
      />
      <div className="rounded border border-amber-900/45 bg-amber-950/10 p-3">
        {activeEliteQuests.length === 0 ? (
          <EmptyText>No guild members are on an elite quest right now.</EmptyText>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {activeEliteQuests.map((mission) => (
              <ActiveMissionCard
                key={mission.instanceId || mission.id}
                mission={mission}
                onFinish={onManualFinish}
                gameTimeMs={gameTimeMs}
                roster={roster}
                showFinishAction={!!onManualFinish}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AttunementPlannerView({
  roster,
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
  queuedGoalCount,
  blockedTargetCount,
}) {
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
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(300px,0.7fr)_minmax(560px,1.3fr)]">
      <section className="rounded-lg border border-cyan-900/50 bg-slate-950/75 p-3">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Targets" value={attunementTargets.length} />
          <Stat label="Queued" value={queuedGoalCount} />
          <Stat label="Ready" value={dungeonBoardFilterCounts.Ready ?? 0} />
          <Stat label="Blocked" value={blockedTargetCount} />
        </div>

        <SectionTitle title="Attunement Filters" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
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
          <div className="max-h-96 overflow-y-auto rounded border border-slate-700/70 bg-slate-900/55 p-3">
            {filteredAttunementTargets.length === 0 ? (
              <EmptyText>No attunement targets match this filter.</EmptyText>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
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
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            <p className="truncate text-xs text-slate-500">{targetLabel}</p>
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
      <EmptyText>No heroes can currently start this attunement source.</EmptyText>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 2xl:grid-cols-3">
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

function HeroIdentity({ hero, compact = false }) {
  const charClass = hero?.charClass ?? hero?.className ?? hero?.class;
  const classInfo = DB_CLASSES?.[charClass];
  const raceIconUrl = hero?.race
    ? getRacePortraitUrl(hero.race, hero.gender)
    : getWowIconUrl("inv_misc_questionmark");
  const classIconUrl = classInfo?.icon || getWowIconUrl("inv_misc_questionmark");
  const iconSizeClass = compact ? "h-5 w-5" : "h-6 w-6";
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
      </span>
    </div>
  );
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
