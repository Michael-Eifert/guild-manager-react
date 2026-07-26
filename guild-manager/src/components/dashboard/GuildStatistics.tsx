import {
  Activity,
  CheckCircle2,
  Circle,
  Castle,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { DB_CLASSES } from "../../constants";
import {
  buildGuildStatistics,
  type EquipmentRankingEntry,
  type ImpactRankingEntry,
  type PopularityRankingEntry,
} from "../../guild/guildStatistics";
import type { Character } from "../../types/characterTypes";
import type { GuildActivityStats } from "../../guild/guildActivityStats";
import type { OnlineSnapshot } from "../../activity/characterOnline";
import type { Mission } from "../../types/missionTypes";
import { ROUTES } from "../../routes";

const CLASS_PRESENTATIONS = DB_CLASSES as Record<
  string,
  { color?: string; icon?: string }
>;

type RaidDifficulty = {
  rank: number;
  shortName: string;
  groupSize: number;
};

const RAID_DIFFICULTY: Partial<Record<string, RaidDifficulty>> = {
  molten_core: { rank: 1, shortName: "MC", groupSize: 40 },
  zul_gurub: { rank: 2, shortName: "ZG", groupSize: 20 },
  ahn_qiraj_ruins: { rank: 3, shortName: "AQ20", groupSize: 20 },
  onyxias_lair: { rank: 4, shortName: "Ony", groupSize: 40 },
  blackwing_lair: { rank: 5, shortName: "BWL", groupSize: 40 },
  ahn_qiraj_temple: { rank: 6, shortName: "AQ40", groupSize: 40 },
  naxxramas: { rank: 7, shortName: "Naxx", groupSize: 40 },
};

const getRaidDifficulty = (raidId: string) =>
  RAID_DIFFICULTY[raidId] || {
    rank: Number.MAX_SAFE_INTEGER,
    shortName: "",
    groupSize: 40,
  };

type GuildStatisticsProps = {
  roster: Character[];
  relationships?: Record<string, unknown> | null;
  onSelectCharacter?: (characterId: string) => void;
  activityStats?: GuildActivityStats | null;
  onlineSnapshot?: OnlineSnapshot | null;
  detailed?: boolean;
  showRelationsLinks?: boolean;
  missionList?: Mission[];
};

type LeaderboardProps<T> = {
  title: string;
  description: string;
  icon: ReactNode;
  entries: T[];
  getCharacter: (entry: T) => Character;
  getValue: (entry: T) => string;
  getDetail: (entry: T) => string;
  onSelectCharacter?: (characterId: string) => void;
  relationsLink?: boolean;
};

const formatCharacterClass = (character: Character) =>
  character.charClass || character.className || character.class || "Adventurer";

function Leaderboard<T>({
  title,
  description,
  icon,
  entries,
  getCharacter,
  getValue,
  getDetail,
  onSelectCharacter,
  relationsLink = false,
}: LeaderboardProps<T>) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/45">
      <div className="border-b border-slate-800 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-amber-300">{icon}</span>
          <h4 className="text-xs font-bold uppercase tracking-[0.13em] text-slate-200">
            {title}
          </h4>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">{description}</p>
      </div>

      <ol className="divide-y divide-slate-800/80">
        {entries.length === 0 ? (
          <li className="px-3 py-5 text-center text-xs italic text-slate-500">
            No guild members yet.
          </li>
        ) : (
          entries.map((entry, index) => {
            const character = getCharacter(entry);
            const className = formatCharacterClass(character);
            const classInfo = CLASS_PRESENTATIONS[className] || {};
            return (
              <li key={character.id}>
                <button
                  type="button"
                  onClick={() => onSelectCharacter?.(String(character.id))}
                  className="group flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-amber-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400"
                >
                  <span
                    className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border text-[11px] font-black ${
                      index === 0
                        ? "border-amber-400/70 bg-amber-500/15 text-amber-200"
                        : "border-slate-700 bg-slate-900 text-slate-400"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {classInfo.icon ? (
                    <img
                      src={classInfo.icon}
                      alt=""
                      className="h-7 w-7 flex-none rounded border border-slate-700 bg-black/40"
                    />
                  ) : (
                    <span className="h-7 w-7 flex-none rounded border border-slate-700 bg-slate-900" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-xs font-bold"
                      style={{ color: classInfo.color || "#e2e8f0" }}
                    >
                      {character.name || "Unknown"}
                    </span>
                    <span className="block truncate text-[10px] text-slate-500">
                      {getDetail(entry)}
                    </span>
                  </span>
                  <span className="flex-none text-xs font-extrabold text-amber-100">
                    {getValue(entry)}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ol>
      {relationsLink ? (
        <Link
          to={ROUTES.GUILD_RELATIONS}
          className="flex min-h-11 items-center justify-center border-t border-slate-800 px-3 text-xs font-bold text-amber-300 hover:bg-amber-950/20 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
        >
          View in Guild Relations
        </Link>
      ) : null}
    </article>
  );
}

export default function GuildStatistics({
  roster,
  relationships,
  onSelectCharacter,
  activityStats = null,
  onlineSnapshot = null,
  detailed = false,
  showRelationsLinks = true,
  missionList = [],
}: GuildStatisticsProps) {
  const statistics = useMemo(
    () =>
      buildGuildStatistics({
        roster,
        relationships,
        activityStats,
        onlineSnapshot,
      }),
    [activityStats, onlineSnapshot, relationships, roster],
  );
  const pvpTotals = useMemo(
    () =>
      roster.reduce(
        (totals, character) => ({
          honorableKills:
            totals.honorableKills +
            Math.max(0, Math.floor(Number(character.pvp?.honorableKills) || 0)),
          lifetimeHonor:
            totals.lifetimeHonor +
            Math.max(0, Math.floor(Number(character.pvp?.lifetimeHonor) || 0)),
        }),
        { honorableKills: 0, lifetimeHonor: 0 },
      ),
    [roster],
  );
  const progressionCatalog = useMemo(() => {
    const dungeons = missionList
      .filter(
        (mission) =>
          mission?.type === "dungeon" &&
          mission.isRaid !== true &&
          mission.isZoneElite !== true,
      )
      .filter(
        (mission, index, entries) =>
          entries.findIndex(
            (entry) => String(entry.id) === String(mission.id),
          ) === index,
      )
      .sort(
        (left, right) =>
          (Number(left.level) || 0) - (Number(right.level) || 0) ||
          String(left.dungeonSetName || left.name).localeCompare(
            String(right.dungeonSetName || right.name),
          ),
      );
    const raidsById = new Map<
      string,
      { id: string; name: string; bosses: string[] }
    >();
    missionList
      .filter((mission) => mission?.isRaid === true)
      .sort(
        (left, right) =>
          String(left.dungeonSetName || left.name).localeCompare(
            String(right.dungeonSetName || right.name),
          ) ||
          (Number(left.wingOrder) || 0) - (Number(right.wingOrder) || 0),
      )
      .forEach((mission) => {
        const id = String(
          (mission as Mission & { raidLockoutId?: string }).raidLockoutId ||
            mission.dungeonSetId ||
            mission.dungeonSetName ||
            mission.name ||
            mission.id,
        );
        const current = raidsById.get(id) || {
          id,
          name: String(mission.dungeonSetName || mission.name || "Raid"),
          bosses: [],
        };
        (mission.dungeonBosses || []).forEach((boss) => {
          if (!current.bosses.includes(boss)) current.bosses.push(boss);
        });
        raidsById.set(id, current);
      });
    const raids = [...raidsById.values()]
      .map((raid) => ({
        ...raid,
        ...getRaidDifficulty(raid.id),
      }))
      .sort(
        (left, right) =>
          left.rank - right.rank || left.name.localeCompare(right.name),
      );
    return { dungeons, raids };
  }, [missionList]);
  const pulse = [
    {
      label: "Average GS",
      value: statistics.averageGearScore.toFixed(1),
      icon: ShieldCheck,
      tone: "text-amber-300",
    },
    {
      label: "Positive Bonds",
      value: statistics.positiveBonds.toLocaleString(),
      icon: HeartHandshake,
      tone: "text-pink-300",
    },
    {
      label: "Successful Dungeon Runs",
      value: statistics.successfulDungeonRuns.toLocaleString(),
      icon: Trophy,
      tone: "text-emerald-300",
    },
    {
      label: "On Mission",
      value: `${statistics.onMissionMembers}/${roster.length}`,
      icon: Activity,
      tone: "text-sky-300",
    },
    {
      label: "Online",
      value: `${statistics.onlineMembers}/${roster.length}`,
      icon: Users,
      tone: "text-cyan-300",
    },
  ];

  return (
    <section
      aria-labelledby="guild-statistics-heading"
      className="rounded-xl border border-amber-900/50 bg-[linear-gradient(145deg,rgba(30,41,59,0.88),rgba(2,6,23,0.92))] p-3 shadow-lg md:p-4"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-300">
            <Sparkles size={16} aria-hidden="true" />
            <h3
              id="guild-statistics-heading"
              className="fantasy-font text-base font-bold text-amber-100 md:text-lg"
            >
              Guild Statistics
            </h3>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            The strongest equipment, social influence and current guild impact.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <Users size={13} aria-hidden="true" />
          {roster.length} members tracked
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
        {pulse.map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-lg border border-slate-700/80 bg-black/25 px-3 py-2.5"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <Icon size={13} className={tone} aria-hidden="true" />
              {label}
            </div>
            <div className="mt-1 text-lg font-black text-slate-100">{value}</div>
          </div>
        ))}
      </div>

      {detailed && activityStats ? (
        <>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-700/80 bg-black/20 p-3 text-xs text-slate-300">
            <div className="font-bold text-slate-100">Dungeon activity</div>
            <div className="mt-1">
              {activityStats.successfulDungeonRuns} wins ·{" "}
              {activityStats.failedDungeonRuns} failures ·{" "}
              {activityStats.dungeonRuns > 0
                ? Math.round(
                    (activityStats.successfulDungeonRuns /
                      activityStats.dungeonRuns) *
                      100,
                  )
                : 0}
              % success
            </div>
          </div>
          <div className="rounded-lg border border-slate-700/80 bg-black/20 p-3 text-xs text-slate-300">
            <div className="font-bold text-slate-100">Raid progress</div>
            <div className="mt-1">
              {activityStats.successfulRaidRuns}/{activityStats.raidRuns} runs ·{" "}
              {activityStats.raidBossesCleared} bosses
            </div>
          </div>
          <div className="rounded-lg border border-slate-700/80 bg-black/20 p-3 text-xs text-slate-300">
            <div className="font-bold text-slate-100">All missions</div>
            <div className="mt-1">
              {activityStats.successfulRuns} successful ·{" "}
              {activityStats.failedRuns} failed
            </div>
          </div>
          <div className="rounded-lg border border-slate-700/80 bg-black/20 p-3 text-xs text-slate-300">
            <div className="font-bold text-slate-100">PvP totals</div>
            <div className="mt-1">
              {pvpTotals.honorableKills.toLocaleString()} HK ·{" "}
              {pvpTotals.lifetimeHonor.toLocaleString()} lifetime honor
            </div>
          </div>
          <div className="rounded-lg border border-slate-700/80 bg-black/20 p-3 text-xs text-slate-300">
            <div className="font-bold text-slate-100">Online profiles</div>
            <div className="mt-1">
              {Object.values(onlineSnapshot?.byId || {}).filter(
                (entry) => entry.profile === "quarter",
              ).length}{" "}
              Casual (1/4) ·{" "}
              {Object.values(onlineSnapshot?.byId || {}).filter(
                (entry) => entry.profile === "half",
              ).length}{" "}
              Regular (2/4) ·{" "}
              {Object.values(onlineSnapshot?.byId || {}).filter(
                (entry) => entry.profile === "three_quarters",
              ).length}{" "}
              Hardcore (3/4)
            </div>
          </div>
          <p className="text-[10px] text-slate-500 sm:col-span-2 xl:col-span-4">
            Exact group-run tracking since Day{" "}
            {activityStats.trackingStartedDayIndex + 1}. Elite quests remain
            included in total mission impact, but are not shown as a KPI.
          </p>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <details
            open
            className="overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/45"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 border-b border-slate-800 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-200">
                <CheckCircle2 size={15} className="text-emerald-300" />
                Guild Dungeon Clears
              </span>
              <span className="text-xs font-bold text-emerald-300">
                {
                  progressionCatalog.dungeons.filter(
                    (mission) =>
                      activityStats.guildDungeonClears[String(mission.id)],
                  ).length
                }
                /{progressionCatalog.dungeons.length}
              </span>
            </summary>
            <div className="custom-scrollbar grid max-h-80 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
              {progressionCatalog.dungeons.map((mission) => {
                const clear =
                  activityStats.guildDungeonClears[String(mission.id)];
                return (
                  <div
                    key={String(mission.id)}
                    className={`flex min-h-10 items-center gap-2 rounded border px-2.5 py-2 text-xs ${
                      clear
                        ? "border-emerald-800/70 bg-emerald-950/25 text-emerald-100"
                        : "border-slate-800 bg-black/20 text-slate-500"
                    }`}
                  >
                    {clear ? (
                      <CheckCircle2
                        size={15}
                        className="shrink-0 text-emerald-400"
                        aria-label="Cleared"
                      />
                    ) : (
                      <Circle
                        size={15}
                        className="shrink-0"
                        aria-label="Not cleared"
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {mission.dungeonWing || mission.name}
                    </span>
                    {clear?.clearCount > 1 ? (
                      <span className="text-[10px] font-bold">
                        ×{clear.clearCount}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </details>

          <section className="space-y-2" aria-labelledby="raid-progress-heading">
            <div className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-950/45 px-3">
              <Castle size={15} className="text-amber-300" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h4
                  id="raid-progress-heading"
                  className="text-xs font-bold uppercase tracking-wide text-slate-200"
                >
                  Guild Raid Progress
                </h4>
                <p className="text-[10px] text-slate-500">
                  Difficulty increases from top to bottom
                </p>
              </div>
            </div>
            {progressionCatalog.raids.length > 0 ? (
              <div className="rounded-lg border border-slate-800 bg-black/15 p-2">
                <div className="mb-1 pl-10 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-400/80">
                  Entry raids
                </div>
                <ol className="relative space-y-2 before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-gradient-to-b before:from-emerald-500/70 before:via-amber-500/60 before:to-red-500/70">
                  {progressionCatalog.raids.map((raid, index) => {
                    const stored =
                      activityStats.guildRaidProgress[raid.id];
                    const defeated = new Set(
                      stored?.defeatedBossNames || [],
                    );
                    const defeatedCount = raid.bosses.filter((boss) =>
                      defeated.has(boss),
                    ).length;
                    const isCleared =
                      raid.bosses.length > 0 &&
                      defeatedCount === raid.bosses.length;
                    return (
                      <li key={raid.id} className="relative pl-10">
                        <span
                          aria-hidden="true"
                          className={`absolute left-1 top-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-black shadow-[0_0_0_4px_rgba(2,6,23,0.9)] ${
                            isCleared
                              ? "border-emerald-400 bg-emerald-950 text-emerald-200"
                              : "border-amber-700 bg-slate-950 text-amber-300"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <details
                          className="overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/65"
                          aria-label={`Difficulty ${index + 1} of ${progressionCatalog.raids.length}: ${raid.name}`}
                        >
                          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300">
                            <span className="min-w-0">
                              <span className="block font-bold text-amber-100">
                                {raid.shortName || raid.name}
                              </span>
                              {raid.shortName ? (
                                <span className="block truncate text-[10px] text-slate-500">
                                  {raid.name} · {raid.groupSize}-player
                                </span>
                              ) : null}
                            </span>
                            <span
                              className={`shrink-0 text-xs font-bold ${
                                isCleared
                                  ? "text-emerald-300"
                                  : "text-amber-300"
                              }`}
                            >
                              {defeatedCount}/{raid.bosses.length}
                            </span>
                          </summary>
                          <ul className="grid gap-1 border-t border-slate-800 p-2 sm:grid-cols-2">
                            {raid.bosses.map((boss) => {
                              const isDefeated = defeated.has(boss);
                              return (
                                <li
                                  key={boss}
                                  className={`flex min-h-9 items-center gap-2 rounded px-2 text-xs ${
                                    isDefeated
                                      ? "bg-emerald-950/25 text-emerald-200"
                                      : "bg-black/20 text-slate-500"
                                  }`}
                                >
                                  {isDefeated ? (
                                    <CheckCircle2
                                      size={14}
                                      className="shrink-0"
                                      aria-label="Defeated"
                                    />
                                  ) : (
                                    <Circle
                                      size={14}
                                      className="shrink-0"
                                      aria-label="Not defeated"
                                    />
                                  )}
                                  {boss}
                                </li>
                              );
                            })}
                          </ul>
                        </details>
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-1 pl-10 text-[9px] font-bold uppercase tracking-[0.18em] text-red-400/80">
                  Hardest raids
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-700 px-3 py-6 text-center text-xs text-slate-500">
                No raids are available in this realm yet.
              </div>
            )}
          </section>
        </div>
        </>
      ) : null}

      <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <Leaderboard<EquipmentRankingEntry>
          title="Best Equipped"
          description="Ranked by item level; GS equals average iLvl."
          icon={<ShieldCheck size={15} aria-hidden="true" />}
          entries={statistics.equipmentLeaders}
          getCharacter={(entry) => entry.character}
          getValue={(entry) => `GS ${entry.gearScore.toFixed(1)}`}
          getDetail={(entry) =>
            `iLvl ${entry.itemLevel.toFixed(1)} · Power ${entry.powerScore.toFixed(1)}`
          }
          onSelectCharacter={onSelectCharacter}
        />
        <Leaderboard<PopularityRankingEntry>
          title="Most Popular"
          description="Positive relationship points across the guild."
          icon={<HeartHandshake size={15} aria-hidden="true" />}
          entries={statistics.popularityLeaders}
          getCharacter={(entry) => entry.character}
          getValue={(entry) => `+${entry.positivePoints}`}
          getDetail={(entry) =>
            `${entry.positiveBonds} positive ${
              entry.positiveBonds === 1 ? "bond" : "bonds"
            }`
          }
          onSelectCharacter={onSelectCharacter}
          relationsLink={showRelationsLinks}
        />
        <Leaderboard<ImpactRankingEntry>
          title="Guild Impact"
          description="10 per win, 3 per boss and 1 per 5 honorable kills."
          icon={<Trophy size={15} aria-hidden="true" />}
          entries={statistics.impactLeaders}
          getCharacter={(entry) => entry.character}
          getValue={(entry) => `${entry.impactScore} pts`}
          getDetail={(entry) =>
            `${entry.successfulRuns} wins · ${entry.bossesCleared} bosses · ${entry.honorableKills} HK`
          }
          onSelectCharacter={onSelectCharacter}
          relationsLink={showRelationsLinks}
        />
      </div>
    </section>
  );
}
