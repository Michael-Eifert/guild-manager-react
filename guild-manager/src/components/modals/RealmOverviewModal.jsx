import { useMemo, useState } from "react";

import BaseModal from "./BaseModal";
import {
  buildPlayerGuildSnapshot,
  buildRealmRankings,
  calculateRealmPveScoreBreakdown,
  getPlayerRealmRanking,
} from "../../server/realmRankings";
import {
  formatRealmRaidProgressSummary,
  getRealmRaidProgressList,
} from "../../server/realmRaidProgress";
import { getRealmNewsRenderKey } from "../../server/realmNews";
import { getRealmPopulationStats } from "../../server/realmPopulation";
import { getRealmRosterCap } from "../../server/realmRosters";
import {
  DB_CLASSES,
  FACTION_EMBLEM_ICON,
  GUILD_FACTION,
  normalizeRealmDifficulty,
} from "../../constants";
import { getRacePortraitUrl, getWowIconUrl } from "../../utils";

const formatNumber = (value) =>
  Math.round(Number(value) || 0).toLocaleString("en-US");

const formatDecimal = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toFixed(1);
};

function RealmStat({ label, value }) {
  return (
    <div className="rounded border border-slate-700/70 bg-slate-900/70 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-lg font-extrabold text-slate-50">{value}</div>
    </div>
  );
}

function MiniRealmActivity({ label, value }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-sm font-bold text-slate-100">{value}</div>
    </div>
  );
}

function EmptyText({ children }) {
  return <div className="text-sm text-slate-400">{children}</div>;
}

const REALM_NEWS_CATEGORY = Object.freeze({
  "population-arrivals": ["Arrivals", "border-cyan-800/70 bg-cyan-950/40 text-cyan-200"],
  "realm-return": ["Return", "border-emerald-800/70 bg-emerald-950/40 text-emerald-200"],
  "npc-guild-exit": ["Free Agent", "border-amber-800/70 bg-amber-950/40 text-amber-200"],
  poaching: ["Transfer", "border-violet-800/70 bg-violet-950/40 text-violet-200"],
  "realm-departure": ["Break", "border-slate-700 bg-slate-900 text-slate-300"],
  "realm-retirement": ["Retirement", "border-slate-700 bg-slate-900 text-slate-300"],
  "guild-applications": ["Application", "border-blue-800/70 bg-blue-950/40 text-blue-200"],
  "applications-expired": ["Expired", "border-rose-900/70 bg-rose-950/30 text-rose-200"],
});

function RealmNewsCategory({ type }) {
  const [label, className] = REALM_NEWS_CATEGORY[type] || [
    "Realm",
    "border-slate-700 bg-slate-900 text-slate-300",
  ];
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}

function FactionBadge({ faction }) {
  const iconCode =
    FACTION_EMBLEM_ICON[faction] || FACTION_EMBLEM_ICON[GUILD_FACTION.ALLIANCE];

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <img
        src={getWowIconUrl(iconCode)}
        alt={faction}
        className="h-5 w-5 rounded border border-slate-600 bg-slate-950 object-cover"
        onError={(event) => {
          event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
        }}
      />
      <span>{faction}</span>
    </span>
  );
}

function RaidProgressBar({ progress }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/60 p-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-slate-200">{progress.shortName}</div>
          <div className="text-[10px] text-slate-500">{progress.name}</div>
        </div>
        <div
          className={`text-xs font-bold ${
            progress.completed ? "text-emerald-300" : "text-amber-200"
          }`}
        >
          {progress.clearedBosses}/{progress.totalBosses}
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded bg-slate-800">
        <div
          className={`h-full ${
            progress.completed ? "bg-emerald-500" : "bg-amber-500"
          }`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}

const buildDungeonProgressRows = ({ guild }) => {
  if (!guild) return { rows: [], clearCount: 0, score: 0 };
  if (guild.isPlayerGuild) {
    const cleared = Array.isArray(guild.clearedDungeonMissions)
      ? guild.clearedDungeonMissions
      : [];
    return {
      clearCount: Math.max(0, Number(guild.dungeonClearCount) || cleared.length),
      score: Math.max(0, Math.round(Number(guild.dungeonScore) || 0)),
      rows: cleared
        .sort((left, right) => {
          if ((left.level || 0) !== (right.level || 0)) {
            return (left.level || 0) - (right.level || 0);
          }
          return String(left.name || "").localeCompare(String(right.name || ""));
        })
        .map((mission) => ({
          id: mission.id,
          name: mission.dungeonSetName
            ? `${mission.dungeonSetName}: ${mission.name}`
            : mission.name,
          level: mission.level,
          status: "Cleared",
        })),
    };
  }

  const score = Math.max(0, Math.round(Number(guild.dungeonScore) || 0));
  const cleared = Array.isArray(guild.clearedDungeonMissions)
    ? guild.clearedDungeonMissions
    : [];
  if (cleared.length > 0) {
    return {
      clearCount: Math.max(0, Number(guild.dungeonClearCount) || cleared.length),
      score,
      rows: cleared
        .sort((left, right) => {
          if ((left.level || 0) !== (right.level || 0)) {
            return (left.level || 0) - (right.level || 0);
          }
          return String(left.name || "").localeCompare(String(right.name || ""));
        })
        .map((mission) => ({
          id: mission.id,
          name: mission.dungeonSetName
            ? `${mission.dungeonSetName}: ${mission.name}`
            : mission.name,
          level: mission.level,
          status:
            Number(mission.clearCount) > 1
              ? `${mission.clearCount} Clears`
              : "Cleared",
        })),
    };
  }

  return {
    clearCount: 0,
    score,
    rows: [],
  };
};

function DungeonClearRow({ row }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-xs">
      <span className="min-w-0">
        <span className="block truncate font-semibold text-slate-200">
          {row.name}
        </span>
        <span className="text-[11px] text-slate-500">Level {row.level}</span>
      </span>
      <span className="rounded border border-emerald-700/60 bg-emerald-950/35 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
        {row.status}
      </span>
    </div>
  );
}

function GuildRosterPreview({ guild }) {
  const roster = Array.isArray(guild?.roster) ? guild.roster : [];
  const sortedRoster = [...roster].sort((left, right) => {
    if ((right.level || 0) !== (left.level || 0)) return (right.level || 0) - (left.level || 0);
    return String(left.name || "").localeCompare(String(right.name || ""));
  });

  return (
    <div className="mt-4 rounded border border-slate-700/70 bg-slate-900/55 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200">
            Guild Roster
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {guild?.name || "Selected Guild"} - {roster.length}/{getRealmRosterCap()} members,{" "}
            {guild?.maxLevelCount || 0} at level 60
          </p>
        </div>
      </div>
      {sortedRoster.length === 0 ? (
        <div className="mt-3">
          <EmptyText>No roster scouting data for this guild yet.</EmptyText>
        </div>
      ) : (
        <div className="mt-3 max-h-72 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5">
            {sortedRoster.map((member) => (
              <RosterMemberCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RosterMemberCard({ member }) {
  const classInfo = DB_CLASSES?.[member.charClass];
  const classIconUrl = classInfo?.icon || getWowIconUrl("inv_misc_questionmark");
  const raceIconUrl = getRacePortraitUrl(member.race, member.gender);

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-xs">
      <span className="flex items-center gap-1">
        <img
          src={raceIconUrl}
          alt={member.race}
          title={member.race}
          className="h-6 w-6 rounded border border-slate-700 bg-slate-950 object-cover"
          onError={(event) => {
            event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
          }}
        />
        <img
          src={classIconUrl}
          alt={member.charClass}
          title={member.charClass}
          className="h-6 w-6 rounded border border-slate-700 bg-slate-950 object-cover"
          onError={(event) => {
            event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
          }}
        />
      </span>
      <span className="min-w-0">
        <span
          className="block truncate font-semibold"
          style={classInfo?.color ? { color: classInfo.color } : undefined}
        >
          {member.name}
        </span>
        <span className="block truncate text-[11px] text-slate-500">
          {member.role}
        </span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span
          className={`rounded border px-1.5 py-0.5 font-bold leading-none ${
            Number(member.level) >= 60
              ? "border-amber-500/70 bg-amber-950/40 text-amber-100"
              : "border-slate-700 bg-slate-900 text-slate-300"
          }`}
        >
          {member.level}
        </span>
        <span className="rounded border border-cyan-700/60 bg-cyan-950/30 px-1.5 py-0.5 text-[10px] font-bold leading-none text-cyan-100">
          ilvl {Math.round(Number(member.itemLevel) || 0)}
        </span>
      </span>
    </div>
  );
}

export default function RealmOverviewModal({
  isOpen,
  onClose,
  variant = "modal",
  realmState,
  guildSetup,
  roster,
  missionList,
  guildProgress,
  raidLockouts,
  currentDayIndex = 0,
}) {
  const isPage = variant === "page";
  const [selectedGuildId, setSelectedGuildId] = useState(null);
  const [isDungeonProgressOpen, setIsDungeonProgressOpen] = useState(false);
  const playerGuildSnapshot = useMemo(
    () =>
      buildPlayerGuildSnapshot({
        guildSetup,
        roster,
        missionList,
        guildProgress,
        raidLockouts,
      }),
    [guildProgress, guildSetup, missionList, raidLockouts, roster],
  );
  const rankings = useMemo(
    () => buildRealmRankings({ realmState, playerGuildSnapshot }),
    [playerGuildSnapshot, realmState],
  );
  const playerStanding = getPlayerRealmRanking(rankings);
  const selectedGuild =
    rankings.find((row) => row.id === selectedGuildId) ||
    playerStanding ||
    rankings[0] ||
    null;
  const selectedRaidProgress = selectedGuild
    ? getRealmRaidProgressList(selectedGuild)
    : [];
  const selectedDungeonProgress = useMemo(
    () => buildDungeonProgressRows({ guild: selectedGuild }),
    [selectedGuild],
  );
  const selectedScoreBreakdown = selectedGuild
    ? selectedGuild.pveScoreBreakdown ||
      calculateRealmPveScoreBreakdown(selectedGuild)
    : null;
  const news = Array.isArray(realmState?.news) ? realmState.news : [];
  const populationStats = getRealmPopulationStats(realmState, roster);
  const dailyStats = populationStats.dailyStats || {};

  if (!isPage && !isOpen) return null;

  const content = (
    <>
      <header className="flex-none px-4 py-3 md:px-5 border-b border-amber-900/60 bg-gray-950 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="fantasy-font text-xl md:text-2xl text-amber-300 truncate">
            Realm Overview
          </h2>
          <p className="text-xs md:text-sm text-amber-100/60 truncate">
            {realmState?.name || "Unknown Realm"} ({realmState?.type || "PvE"})
          </p>
        </div>
        {!isPage && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-white text-3xl px-2 leading-none"
            aria-label="Close realm overview"
          >
            &times;
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-4 min-h-full">
          <section className="rounded-lg border border-amber-900/50 bg-slate-950/75 p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <RealmStat label="Realm" value={realmState?.name || "Unknown"} />
              <RealmStat label="Type" value={realmState?.type || "PvE"} />
              <RealmStat
                label="Age"
                value={`${Math.max(1, (Number(realmState?.ageDays) || 0) + 1)} days`}
              />
              <RealmStat label="Guilds" value={rankings.length} />
            </div>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
              <RealmStat
                label="Population"
                value={`${populationStats.totalPopulation}/${populationStats.softCap}`}
              />
              <RealmStat label="Free Agents" value={populationStats.freeAgents} />
              <RealmStat label="Applications" value={populationStats.applications || 0} />
              <RealmStat
                label="Arrivals"
                value={dailyStats.arrivals || 0}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
              <RealmStat
                label="Open to Offers"
                value={populationStats.openToOffers || 0}
              />
              <RealmStat
                label="Returned Today"
                value={dailyStats.returners || 0}
              />
              <RealmStat
                label="Away from Realm"
                value={populationStats.departedPlayers || 0}
              />
              <RealmStat
                label="Departed Today"
                value={
                  (dailyStats.realmDepartures || 0) +
                  (dailyStats.retirements || 0)
                }
              />
            </div>

            <div className="mt-3 rounded border border-cyan-900/50 bg-cyan-950/15 px-3 py-2 text-xs leading-relaxed text-cyan-100/75">
              Recruitment reflects the living realm. Faction, level, and role
              filters can make a crowded realm feel quiet. New adventurers
              arrive at level 1, while experienced candidates enter the market
              by leaving NPC guilds or returning from a break.
            </div>

            <div className="mt-4 rounded border border-amber-800/50 bg-amber-950/15 p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-amber-200">
                Player Guild Standing
              </h3>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                <RealmStat
                  label="Rank"
                  value={playerStanding ? `#${playerStanding.rank}` : "-"}
                />
                <RealmStat
                  label="PvE Score"
                  value={formatNumber(playerStanding?.pveScore)}
                />
                <RealmStat
                  label="Avg Level"
                  value={formatDecimal(playerStanding?.averageLevel)}
                />
                <RealmStat
                  label="Roster"
                  value={playerStanding?.rosterSize || 0}
                />
              </div>
            </div>

            <div className="mt-4 rounded border border-slate-700/70 bg-slate-900/55 overflow-hidden">
              <div className="border-b border-slate-800 px-3 py-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200">
                  Realm PvE Leaderboard
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2">Rank</th>
                      <th className="px-3 py-2">Guild</th>
                      <th className="px-3 py-2">Faction</th>
                      <th className="px-3 py-2">Archetype</th>
                      <th className="px-3 py-2 text-right">Avg Level</th>
                      <th className="px-3 py-2 text-right">60s</th>
                      <th className="px-3 py-2 text-right">Roster</th>
                      <th className="px-3 py-2 text-right">PvE Score</th>
                      <th className="px-3 py-2 text-right">Raid Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedGuildId(row.id)}
                        className={`border-t border-slate-800/80 ${
                          row.isPlayerGuild
                            ? "bg-amber-900/25 text-amber-100"
                            : "text-slate-300"
                        } ${
                          selectedGuild?.id === row.id
                            ? "outline outline-1 outline-amber-500/70"
                            : ""
                        } cursor-pointer hover:bg-slate-800/50`}
                      >
                        <td className="px-3 py-2 font-bold text-amber-200">
                          #{row.rank}
                        </td>
                        <td className="px-3 py-2 font-semibold">{row.name}</td>
                        <td className="px-3 py-2">
                          <FactionBadge faction={row.faction} />
                        </td>
                        <td className="px-3 py-2">{row.archetype}</td>
                        <td className="px-3 py-2 text-right">
                          {formatDecimal(row.averageLevel)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-amber-100">
                          {row.maxLevelCount || 0}
                        </td>
                        <td className="px-3 py-2 text-right">{row.rosterSize}</td>
                        <td className="px-3 py-2 text-right font-bold">
                          {formatNumber(row.pveScore)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.raidProgressSummary ||
                            formatRealmRaidProgressSummary(row)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedScoreBreakdown && (
              <div className="mt-4 rounded border border-slate-700/70 bg-slate-900/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200">
                      PvE Score Breakdown
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {selectedGuild.name}: {formatNumber(selectedScoreBreakdown.total)} total
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                  <MiniRealmActivity label="Level" value={formatNumber(selectedScoreBreakdown.level)} />
                  <MiniRealmActivity label="Gear" value={formatNumber(selectedScoreBreakdown.gear)} />
                  <MiniRealmActivity
                    label="Roster"
                    value={formatNumber(
                      selectedScoreBreakdown.roster + selectedScoreBreakdown.maxLevel,
                    )}
                  />
                  <MiniRealmActivity label="Dungeons" value={formatNumber(selectedScoreBreakdown.dungeons)} />
                  <MiniRealmActivity
                    label="Raids"
                    value={formatNumber(
                      selectedScoreBreakdown.raidBosses + selectedScoreBreakdown.raidClears,
                    )}
                  />
                </div>
              </div>
            )}

            <div className="mt-4 rounded border border-slate-700/70 bg-slate-900/55 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200">
                    Raid Progression
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedGuild
                      ? `${selectedGuild.name}: ${
                          selectedGuild.raidProgressSummary ||
                          formatRealmRaidProgressSummary(selectedGuild)
                        }`
                      : "Select a guild to inspect raid progress."}
                  </p>
                </div>
                {selectedGuild && (
                  <div className="text-right text-xs text-slate-400">
                    <div>
                      <span className="text-amber-200 font-bold">
                        {selectedGuild.raidBossesCleared || 0}
                      </span>{" "}
                      bosses down
                    </div>
                    <div>
                      <span className="text-emerald-300 font-bold">
                        {selectedGuild.raidClearCount || 0}
                      </span>{" "}
                      raids cleared
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {selectedRaidProgress.map((progress) => (
                  <RaidProgressBar key={progress.raidId} progress={progress} />
                ))}
              </div>
            </div>

            <div className="mt-4 rounded border border-slate-700/70 bg-slate-900/55">
              <button
                type="button"
                onClick={() => setIsDungeonProgressOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold uppercase tracking-wide text-slate-200">
                    Dungeons Cleared
                  </span>
                  <span className="mt-1 block truncate text-sm text-slate-400">
                    {selectedGuild
                      ? `${selectedGuild.name}: ${selectedDungeonProgress.clearCount} cleared`
                      : "Select a guild to inspect dungeon clears."}
                  </span>
                </span>
                <span className="flex flex-none items-center gap-3 text-right">
                  <span className="hidden text-xs text-slate-400 sm:block">
                    <span className="font-bold text-emerald-300">
                      {selectedDungeonProgress.clearCount}
                    </span>{" "}
                    clears, score{" "}
                    <span className="font-bold text-amber-200">
                      {formatNumber(selectedDungeonProgress.score)}
                    </span>
                  </span>
                  <span className="text-lg font-bold text-slate-400">
                    {isDungeonProgressOpen ? "-" : "+"}
                  </span>
                </span>
              </button>
              {isDungeonProgressOpen && (
                  <div className="border-t border-slate-800 p-3">
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <RealmStat
                      label="Cleared"
                      value={selectedDungeonProgress.clearCount}
                    />
                    <RealmStat
                      label="Dungeon Score"
                      value={formatNumber(selectedDungeonProgress.score)}
                    />
                  </div>
                  {selectedDungeonProgress.rows.length === 0 ? (
                    <EmptyText>No dungeon clears recorded for this guild yet.</EmptyText>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                      {selectedDungeonProgress.rows.map((row) => (
                        <DungeonClearRow key={row.id} row={row} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedGuild && <GuildRosterPreview guild={selectedGuild} />}
          </section>

          <aside className="rounded-lg border border-amber-900/50 bg-slate-950/75 p-3 flex flex-col gap-3">
            <div className="rounded border border-slate-700/70 bg-slate-900/55 p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-amber-200">
                Realm Identity
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                A young {realmState?.type || "PvE"} realm where guilds race for
                dungeon clears, raid prestige, and a place in realm history.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Today is realm day {Math.max(1, (Number(currentDayIndex) || 0) + 1)}.
              </p>
              <div className="mt-3 inline-flex rounded border border-amber-800/60 bg-amber-950/25 px-2 py-1 text-xs font-bold text-amber-100">
                Competition: {normalizeRealmDifficulty(guildSetup?.realmDifficulty)}
              </div>
            </div>

            <div className="rounded border border-slate-700/70 bg-slate-900/55 p-3 flex-1 min-h-0">
              <div className="mb-3 rounded border border-cyan-900/60 bg-cyan-950/20 p-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-100">
                  Realm Activity
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <MiniRealmActivity label="NPC Recruits" value={dailyStats.npcRecruits || 0} />
                  <MiniRealmActivity label="Guild Exits" value={dailyStats.npcGuildExits || 0} />
                  <MiniRealmActivity label="Applications" value={dailyStats.applications || 0} />
                  <MiniRealmActivity label="Expired Apps" value={dailyStats.expiredApplications || 0} />
                  <MiniRealmActivity label="Poached" value={dailyStats.poached || 0} />
                  <MiniRealmActivity label="Returns" value={dailyStats.returners || 0} />
                  <MiniRealmActivity label="Breaks" value={dailyStats.realmDepartures || 0} />
                  <MiniRealmActivity label="Retirements" value={dailyStats.retirements || 0} />
                  <MiniRealmActivity label="Guild Runs" value={dailyStats.guildDungeonRuns || 0} />
                  <MiniRealmActivity label="Guild Clears" value={dailyStats.guildDungeonClears || 0} />
                  <MiniRealmActivity label="Pug Runs" value={dailyStats.pugDungeonRuns || 0} />
                  <MiniRealmActivity label="Pug Clears" value={dailyStats.pugDungeonClears || 0} />
                  <MiniRealmActivity label="Wipes" value={dailyStats.dungeonWipes || 0} />
                </div>
              </div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200">
                  Realm News
                </h3>
                <span className="text-[10px] text-slate-500">
                  Latest {news.length}
                </span>
              </div>
              {news.length === 0 ? (
                <EmptyText>No realm news yet. The realm is still waking up.</EmptyText>
              ) : (
                <div className="space-y-2">
                  {news.map((entry, index) => (
                    <div
                      key={getRealmNewsRenderKey(entry, index)}
                      className="rounded border border-slate-800 bg-slate-950/60 p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] uppercase tracking-wide text-amber-200/70">
                          Day {Math.max(1, (Number(entry.dayIndex) || 0) + 1)}
                        </div>
                        <RealmNewsCategory type={entry.type} />
                      </div>
                      <div className="mt-1 text-sm text-slate-200">
                        {entry.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );

  if (isPage) {
    return (
      <section className="wow-modal-panel flex min-h-[calc(100vh-220px)] flex-col overflow-hidden rounded-lg border-2 border-amber-900 bg-gray-950 shadow-2xl">
        {content}
      </section>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/80 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-950 border-x-0 border-y-0 md:border-2 border-amber-900 rounded-none md:rounded-lg w-full max-w-6xl h-full md:h-[88vh] flex flex-col relative shadow-2xl overflow-hidden"
    >
      {content}
    </BaseModal>
  );
}
