import { useEffect, useMemo, useState } from "react";

import BaseModal from "./BaseModal";
import { GUILD_FACTION } from "../../constants";
import { getZoneRegionalMap } from "../../zones/zoneMapLayout";
import {
  WORLD_MAP_FILTERS,
  buildWorldMapZoneSummaries,
  filterWorldMapZoneSummaries,
} from "../../zones/zoneMapSummary";

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

const getHeroLevel = (hero) => Math.max(1, Number(hero?.level) || 1);

export default function WorldMapModal({
  isOpen,
  onClose,
  roster = [],
  missionList = [],
  activeMissions = [],
  guildFaction = GUILD_FACTION.ALLIANCE,
  onDeploy,
  getMissionPreview,
}) {
  const [activeFilter, setActiveFilter] = useState(WORLD_MAP_FILTERS.AVAILABLE);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [selectedEliteMemberIds, setSelectedEliteMemberIds] = useState([]);
  const [selectedEliteQuestId, setSelectedEliteQuestId] = useState(null);
  const [zoneMapImageFailed, setZoneMapImageFailed] = useState(false);

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
    if (!isOpen || summaries.length === 0) return;
    const isVisible = visibleSummaries.some(
      (summary) => summary.zone.id === selectedZoneId,
    );
    if (!selectedZoneId || !isVisible) {
      setSelectedZoneId(
        visibleSummaries[0]?.zone.id ?? summaries[0]?.zone.id ?? null,
      );
    }
  }, [isOpen, selectedZoneId, summaries, visibleSummaries]);

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

  const selectedEliteMembers = useMemo(
    () =>
      roster.filter((member) =>
        selectedEliteMemberIds.includes(getMemberId(member)),
      ),
    [roster, selectedEliteMemberIds],
  );

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

  const eliteMaxSize = selectedEliteQuest?.requiredPartySize ?? 5;
  const eliteMinSize = selectedEliteQuest?.minPartySize ?? 1;
  const eliteMinLevel = Math.max(1, Number(selectedEliteQuest?.minLevel) || 1);
  const successChance =
    formatPercent(elitePreview?.successChance) ??
    formatPercent(elitePreview?.chance) ??
    formatPercent(elitePreview?.successRate);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-950 border-x-0 border-y-0 md:border-2 border-cyan-900 rounded-none md:rounded-lg w-full max-w-7xl h-full md:h-[92vh] flex flex-col relative shadow-2xl overflow-hidden"
    >
      <header className="flex-none px-4 py-3 md:px-5 border-b border-cyan-900/60 bg-gray-950 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="fantasy-font text-xl md:text-2xl text-cyan-300 truncate">
            World Map Command
          </h2>
          <p className="text-xs md:text-sm text-cyan-100/60 truncate">
            {guildFaction} zone overview, assignments, and elite objectives
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-white text-3xl px-2 leading-none"
          aria-label="Close world map"
        >
          &times;
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3 md:p-4">
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
              onSelect={setSelectedZoneId}
            />

            <SelectedZoneMap
              selectedSummary={selectedSummary}
              zoneMap={selectedZoneMap}
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

            {selectedSummary && (
              <ZoneDetail
                summary={selectedSummary}
                availableHeroes={availableHeroes}
                selectedMemberIds={selectedMemberIds}
                onToggleAssignment={(memberId) =>
                  setSelectedMemberIds((currentIds) =>
                    toggleSelection(currentIds, memberId),
                  )
                }
                selectedMembers={selectedMembers}
                onDeployZone={deployZoneAssignment}
                selectedEliteQuest={selectedEliteQuest}
                selectedEliteQuestId={selectedEliteQuestId}
                onSelectEliteQuest={setSelectedEliteQuestId}
                selectedEliteMemberIds={selectedEliteMemberIds}
                onToggleEliteMember={(memberId) =>
                  setSelectedEliteMemberIds((currentIds) =>
                    toggleLimitedSelection(currentIds, memberId, eliteMaxSize),
                  )
                }
                selectedEliteMembers={selectedEliteMembers}
                onDeployElite={deployEliteQuest}
                eliteMaxSize={eliteMaxSize}
                eliteMinSize={eliteMinSize}
                eliteMinLevel={eliteMinLevel}
                successChance={successChance}
              />
            )}
          </aside>
        </div>
      </div>
    </BaseModal>
  );
}

function ZoneSelectionPanel({ summaries, selectedZoneId, onSelect }) {
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
        onSelect={onSelect}
      />
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

function SelectedZoneMap({
  selectedSummary,
  zoneMap,
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

  return (
    <div className="rounded-lg border border-cyan-900/45 bg-slate-950/85 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 px-3 py-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold uppercase tracking-wide text-cyan-100">
            Selected Zone Map
          </h4>
          <p className="truncate text-xs text-slate-500">
            {zone.name} - Level {zone.minLevel}-{zone.maxLevel}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs">
          <MiniStat label="Here" value={selectedSummary.heroCount} />
          <MiniStat label="Best" value={`${selectedSummary.guildBestProgress}%`} />
          <MiniStat
            label="Avg"
            value={`${selectedSummary.activeAverageProgress}%`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_210px] gap-0">
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
        </div>

        <div className="border-t border-slate-800 bg-slate-900/55 p-3 lg:border-l lg:border-t-0">
          <h5 className="text-xs font-bold uppercase tracking-wide text-slate-300">
            Current Activity
          </h5>
          <div className="mt-2 space-y-2">
            {selectedSummary.heroesInZone.length === 0 ? (
              <EmptyText>No heroes are in this zone.</EmptyText>
            ) : (
              selectedSummary.heroesInZone.slice(0, 5).map((row) => (
                <div
                  key={row.memberId}
                  className="grid grid-cols-[1fr_auto] gap-2 text-xs"
                >
                  <span className="truncate text-slate-300">{row.name}</span>
                  <span className="font-semibold text-amber-100">
                    {row.progress}%
                  </span>
                </div>
              ))
            )}
            {selectedSummary.heroesInZone.length > 5 && (
              <div className="text-xs text-slate-500">
                +{selectedSummary.heroesInZone.length - 5} more
              </div>
            )}
          </div>
          {zoneMap && (
            <a
              href={zoneMap.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs text-cyan-300 hover:text-cyan-100"
            >
              Source: {zoneMap.sourceName}
            </a>
          )}
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

function ZoneList({ summaries, selectedZoneId, onSelect }) {
  return (
    <div className="max-h-64 overflow-y-auto p-2">
      {summaries.length === 0 ? (
        <div className="text-sm text-slate-400">No zones match this filter yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2">
          {summaries.map((summary) => {
            const selected = selectedZoneId === summary.zone.id;
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
  availableHeroes,
  selectedMemberIds,
  onToggleAssignment,
  selectedMembers,
  onDeployZone,
  selectedEliteQuest,
  selectedEliteQuestId,
  onSelectEliteQuest,
  selectedEliteMemberIds,
  onToggleEliteMember,
  selectedEliteMembers,
  onDeployElite,
  eliteMaxSize,
  eliteMinSize,
  eliteMinLevel,
  successChance,
}) {
  const { zone } = summary;
  const tags = [
    zone.faction,
    ...(Array.isArray(zone.biomes) ? zone.biomes : []),
    ...(Array.isArray(zone.enemies) ? zone.enemies : []),
  ].filter(Boolean);
  const isZoneLocked = !summary.accessible;

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
              className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300"
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

      <SectionTitle title="Heroes In Zone" />
      <div className="mb-3 rounded border border-slate-700/70 bg-slate-900/55 p-2">
        {summary.heroesInZone.length === 0 ? (
          <EmptyText>No heroes are currently questing here.</EmptyText>
        ) : (
          summary.heroesInZone.map((row) => (
            <ProgressRow key={row.memberId} row={row} />
          ))
        )}
      </div>

      <SectionTitle title="Zone Progress" />
      <div className="mb-3 rounded border border-slate-700/70 bg-slate-900/55 p-2">
        {summary.progressRows.length === 0 ? (
          <EmptyText>No recorded progress in this zone yet.</EmptyText>
        ) : (
          summary.progressRows.map((row) => (
            <ProgressRow key={row.memberId} row={row} />
          ))
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
              <div className="mb-2 rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-300">
                Party {eliteMinSize}-{eliteMaxSize}, level{" "}
                {selectedEliteQuest.recommended ?? selectedEliteQuest.level}
                {successChance ? `, success ${successChance}` : ""}
              </div>
            )}

            <HeroPicker
              heroes={availableHeroes}
              selectedIds={selectedEliteMemberIds}
              onToggle={onToggleEliteMember}
              maxSize={eliteMaxSize}
              minLevel={eliteMinLevel}
              emptyText="No idle heroes available for an elite party."
            />
            <button
              type="button"
              onClick={onDeployElite}
              disabled={
                isZoneLocked ||
                !selectedEliteQuest ||
                selectedEliteMembers.length < eliteMinSize
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

function SectionTitle({ title }) {
  return (
    <h4 className="mb-1.5 mt-3 text-xs font-bold uppercase tracking-wide text-slate-300">
      {title}
    </h4>
  );
}

function EmptyText({ children }) {
  return <div className="text-sm text-slate-400">{children}</div>;
}

function ProgressRow({ row }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-slate-800/80 py-2 last:border-b-0">
      <div className="min-w-0">
        <strong className="block truncate text-sm text-slate-100">{row.name}</strong>
        <span className="block truncate text-xs text-slate-500">
          Level {row.level}
          {row.className ? ` ${row.className}` : ""}
          {row.role ? `, ${row.role}` : ""}
          {row.inZone ? ", active" : ""}
          {row.cleared ? ", cleared" : ""}
        </span>
      </div>
      <span className="text-sm font-bold text-amber-100">{row.progress}%</span>
    </div>
  );
}

function HeroPicker({
  heroes,
  selectedIds,
  onToggle,
  maxSize,
  minLevel = 1,
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
        const disabled = levelLocked || sizeLocked;

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
            <strong className="block truncate text-sm">{hero.name}</strong>
            <span className="block truncate text-xs text-slate-500">
              Level {hero.level ?? 1}
              {hero.role ? `, ${hero.role}` : ""}
              {levelLocked ? `, needs ${minLevel}` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
