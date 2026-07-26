import { SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";

import CharacterCard from "../../components/CharacterCard";
import CharacterEquipCheckCard from "../../components/CharacterEquipCheckCard";
import CharacterPersonalityCard from "../../components/CharacterPersonalityCard";
import DashboardAccordionSection from "../../components/DashboardAccordionSection";
import GuildStatistics from "../../components/dashboard/GuildStatistics";
import GameButton from "../../components/ui/GameButton";
import SegmentedControl from "../../components/ui/SegmentedControl";
import {
  AUTO_GROUP_SUCCESS_RATE,
  DB_CLASSES,
  GUILD_ACTIVITY_MODES,
  GUILD_DUNGEON_ACTIVITY,
  GUILD_DUNGEON_ACTIVITY_OPTIONS,
  GUILD_MEMBER_SORT_OPTIONS,
  MEMBER_RANKING_MODES,
} from "../../constants";
import { PVP_ACTIVITY_FOCUS_OPTIONS } from "../../pvp/battlefields/battlefieldDefinitions";
import { getPvpActivityConfig } from "../../pvp/battlefields/battlefieldUtils";
import { normalizeAutoGroupSuccessRate } from "../../guild/guildSetup";
import { getRoleIcon } from "../../utils";

const SuccessRateSlider = ({ label, value, onChange }) => {
  const normalizedValue = normalizeAutoGroupSuccessRate(value);
  const inputId = useId();
  return (
    <div className="border-t border-gray-700/70 pt-3">
      <div className="flex items-center justify-between gap-3 text-xs text-gray-300">
        <label htmlFor={inputId} className="font-bold text-gray-200">
          {label}
        </label>
        <span className="font-mono text-emerald-200">{normalizedValue}%</span>
      </div>
      <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
        <span>{AUTO_GROUP_SUCCESS_RATE.MIN}%</span>
        <input
          id={inputId}
          type="range"
          min={AUTO_GROUP_SUCCESS_RATE.MIN}
          max={AUTO_GROUP_SUCCESS_RATE.MAX}
          step="1"
          value={normalizedValue}
          onChange={(event) => onChange(event.target.value)}
          className="w-full accent-emerald-500"
        />
        <span>{AUTO_GROUP_SUCCESS_RATE.MAX}%</span>
      </div>
    </div>
  );
};

export default function DashboardPage({
  chatPreview,
  guildActivityModeSummary,
  dashboardSectionsOpen,
  onToggleDashboardSection,
  onGuildModeChange,
  guildSetup,
  guildRelationships,
  roster,
  onGuildSuccessRateChange,
  dungeonActivityInfoText,
  onGuildDungeonActivityChange,
  onPvpActivityFocusChange,
  guildRoleSummary,
  guildClassSummary,
  guildMemberSearch,
  onGuildMemberSearchChange,
  memberRankingMode,
  onMemberRankingModeChange,
  guildMemberSortMode,
  onGuildMemberSortModeChange,
  guildMemberMinLevelFilter,
  onGuildMemberMinLevelFilterChange,
  guildMemberMaxLevelFilter,
  onGuildMemberMaxLevelFilterChange,
  onClearGuildMemberFilters,
  hasAnyGuildMemberLevelFilter,
  hasGuildMemberSearch,
  rankedRoster,
  hasGuildMemberSearchMatch,
  bestGuildMemberSearchMatchId,
  onSelectCharacter,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500/70">
            Command Center
          </p>
          <h2 className="fantasy-font text-xl font-bold text-amber-100 md:text-2xl">
            Guild Overview
          </h2>
        </div>
        <p className="max-w-xl text-xs text-slate-500 sm:text-right">
          Direct guild activity, monitor composition and manage the active
          roster.
        </p>
      </div>

      <GuildStatistics
        roster={roster}
        relationships={guildRelationships}
        onSelectCharacter={onSelectCharacter}
      />

      {chatPreview}

      <div className="grid gap-3 xl:grid-cols-2">
        <DashboardAccordionSection
          title="Guild Activity"
          summary={`Current: ${guildActivityModeSummary || "None"}`}
          isOpen={dashboardSectionsOpen.guildActivity}
          onToggle={() => onToggleDashboardSection("guildActivity")}
        >
          <SegmentedControl
            ariaLabel="Guild activity"
            options={GUILD_ACTIVITY_MODES.map((mode) => ({
              value: mode,
              label:
                mode === "Auto"
                  ? "Auto"
                  : mode === "Leveling"
                    ? "Leveling"
                    : "Professions",
            }))}
            value={guildActivityModeSummary}
            onChange={onGuildModeChange}
            disabled={roster.length === 0}
            tone="sky"
          />
          <div className="mt-3">
            <SuccessRateSlider
              label="Start Elite Quest with min. Success Rate"
              value={guildSetup.eliteQuestMinSuccessChance}
              onChange={(value) =>
                onGuildSuccessRateChange("eliteQuestMinSuccessChance", value)
              }
            />
          </div>
        </DashboardAccordionSection>

        <DashboardAccordionSection
          title="PvP Activity"
          summary={`Current: ${getPvpActivityConfig(guildSetup.pvpActivityFocus).label}`}
          isOpen={dashboardSectionsOpen.pvpActivity}
          onToggle={() => onToggleDashboardSection("pvpActivity")}
        >
          <SegmentedControl
            ariaLabel="PvP activity"
            options={PVP_ACTIVITY_FOCUS_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              title: option.description,
            }))}
            value={guildSetup.pvpActivityFocus}
            onChange={onPvpActivityFocusChange}
            disabled={roster.length === 0}
            tone="red"
          />
          <p className="mt-2 text-[11px] text-gray-500">
            Controls automatic Warsong Gulch queues. Active heroes are never pulled
            out of missions, dungeons, raids, or other battlegrounds.
          </p>
        </DashboardAccordionSection>

        <DashboardAccordionSection
          title="Dungeon Groups"
          summary={`Current: ${
            guildSetup.dungeonActivity || GUILD_DUNGEON_ACTIVITY.NONE
          }`}
          isOpen={dashboardSectionsOpen.dungeonGroups}
          onToggle={() => onToggleDashboardSection("dungeonGroups")}
        >
          <SegmentedControl
            ariaLabel="Dungeon groups"
            options={GUILD_DUNGEON_ACTIVITY_OPTIONS.map((mode) => ({
              value: mode,
              label: mode,
            }))}
            value={guildSetup.dungeonActivity || GUILD_DUNGEON_ACTIVITY.NONE}
            onChange={onGuildDungeonActivityChange}
            disabled={roster.length === 0}
            tone="emerald"
          />
          <p className="mt-2 text-[11px] text-gray-500">
            {dungeonActivityInfoText}
          </p>
          <div className="mt-3">
            <SuccessRateSlider
              label="Start Dungeon with min. Success Rate"
              value={guildSetup.dungeonMinSuccessChance}
              onChange={(value) =>
                onGuildSuccessRateChange("dungeonMinSuccessChance", value)
              }
            />
          </div>
        </DashboardAccordionSection>

        <DashboardAccordionSection
          title="Guild Composition"
          summary={`${guildRoleSummary.total} members`}
          isOpen={dashboardSectionsOpen.guildComposition}
          onToggle={() => onToggleDashboardSection("guildComposition")}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { key: "total", label: "Total", icon: "#", value: guildRoleSummary.total },
              { key: "Tank", label: "Tanks", icon: getRoleIcon("Tank"), value: guildRoleSummary.Tank },
              { key: "Healer", label: "Healers", icon: getRoleIcon("Healer"), value: guildRoleSummary.Healer },
              { key: "DPS", label: "DDs / DPS", icon: getRoleIcon("DPS"), value: guildRoleSummary.DPS },
            ].map((stat) => (
              <div
                key={stat.key}
                className="rounded border border-gray-700 bg-gray-950/60 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-gray-400">
                    {stat.label}
                  </span>
                  <span className="text-sm text-gray-300">{stat.icon}</span>
                </div>
                <div className="mt-1 text-lg font-bold text-white">
                  {Math.max(0, Math.floor(Number(stat.value) || 0))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Classes
            </div>
            {guildClassSummary.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {guildClassSummary.map(({ className, count }) => {
                  const classInfo = DB_CLASSES[className] || {};
                  return (
                    <div
                      key={className}
                      className="flex items-center justify-between gap-2 rounded border border-gray-700 bg-gray-950/50 px-2 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {classInfo.icon && (
                          <img
                            src={classInfo.icon}
                            alt=""
                            className="h-6 w-6 flex-none rounded border border-gray-700"
                          />
                        )}
                        <span
                          className="truncate text-xs font-bold"
                          style={{ color: classInfo.color || "#e5e7eb" }}
                        >
                          {className}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-white">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No class data yet.</p>
            )}
          </div>
        </DashboardAccordionSection>
      </div>

      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 shadow-lg md:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
            Guild Members
          </h3>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-gray-500 sm:inline">
              Showing {rankedRoster.length}/{roster.length}
            </span>
            <GameButton
              size="sm"
              tone="ghost"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((isOpen) => !isOpen)}
              className="sm:hidden"
              icon={<SlidersHorizontal size={15} aria-hidden="true" />}
            >
              Filters
            </GameButton>
          </div>
        </div>

        <div
          className={`${filtersOpen ? "grid" : "hidden"} mb-4 grid-cols-2 items-end gap-2 rounded-lg border border-slate-800 bg-slate-950/35 p-3 sm:flex sm:flex-wrap`}
        >
            <label className="text-[11px] text-gray-300">
              <span className="block mb-1 uppercase tracking-wide text-gray-500">
                Search
              </span>
              <input
                type="search"
                value={guildMemberSearch}
                onChange={(event) => onGuildMemberSearchChange(event.target.value)}
                className="min-h-9 w-full bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-amber-500 sm:w-36"
                placeholder="Character name"
              />
            </label>
            <label className="text-[11px] text-gray-300">
              <span className="block mb-1 uppercase tracking-wide text-gray-500">
                Ranking
              </span>
              <select
                value={memberRankingMode}
                onChange={(event) => onMemberRankingModeChange(event.target.value)}
                className="min-h-9 w-full bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
              >
                <option value={MEMBER_RANKING_MODES.STANDARD}>Standard</option>
                <option value={MEMBER_RANKING_MODES.EQUIP_CHECK}>
                  Equip Check
                </option>
                <option value={MEMBER_RANKING_MODES.PERSONALITY}>
                  Personality
                </option>
              </select>
            </label>
            <label className="text-[11px] text-gray-300">
              <span className="block mb-1 uppercase tracking-wide text-gray-500">
                Sort
              </span>
              <select
                value={guildMemberSortMode}
                onChange={(event) => onGuildMemberSortModeChange(event.target.value)}
                className="min-h-9 w-full bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
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
                  onGuildMemberMinLevelFilterChange(event.target.value)
                }
                className="min-h-9 w-full bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-amber-500 sm:w-20"
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
                  onGuildMemberMaxLevelFilterChange(event.target.value)
                }
                className="min-h-9 w-full bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-amber-500 sm:w-20"
                placeholder="Any"
              />
            </label>
            <GameButton
              onClick={onClearGuildMemberFilters}
              disabled={!hasAnyGuildMemberLevelFilter && !hasGuildMemberSearch}
              size="sm"
              tone="ghost"
              className="col-span-2 sm:col-span-1"
            >
              Clear
            </GameButton>
            <span className="col-span-2 text-xs text-gray-500 sm:hidden">
              Showing {rankedRoster.length}/{roster.length}
            </span>
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
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
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
                      onClick={() => onSelectCharacter(char.id)}
                    />
                  ) : memberRankingMode === MEMBER_RANKING_MODES.PERSONALITY ? (
                    <CharacterPersonalityCard
                      char={char}
                      onClick={() => onSelectCharacter(char.id)}
                    />
                  ) : (
                    <CharacterCard
                      char={char}
                      onClick={() => onSelectCharacter(char.id)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
