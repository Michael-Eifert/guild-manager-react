import {
  Activity,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { DB_CLASSES } from "../../constants";
import {
  buildGuildStatistics,
  type EquipmentRankingEntry,
  type ImpactRankingEntry,
  type PopularityRankingEntry,
} from "../../guild/guildStatistics";
import type { Character } from "../../types/characterTypes";

const CLASS_PRESENTATIONS = DB_CLASSES as Record<
  string,
  { color?: string; icon?: string }
>;

type GuildStatisticsProps = {
  roster: Character[];
  relationships?: Record<string, unknown> | null;
  onSelectCharacter?: (characterId: string) => void;
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
    </article>
  );
}

export default function GuildStatistics({
  roster,
  relationships,
  onSelectCharacter,
}: GuildStatisticsProps) {
  const statistics = useMemo(
    () => buildGuildStatistics({ roster, relationships }),
    [relationships, roster],
  );
  const pulse = [
    {
      label: "Average GS",
      value: statistics.averageGearScore.toLocaleString(),
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
      label: "Successful Runs",
      value: statistics.successfulRuns.toLocaleString(),
      icon: Trophy,
      tone: "text-emerald-300",
    },
    {
      label: "Active Now",
      value: `${statistics.activeMembers}/${roster.length}`,
      icon: Activity,
      tone: "text-sky-300",
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

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
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

      <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <Leaderboard<EquipmentRankingEntry>
          title="Best Equipped"
          description="Ranked by item level; GS equals average iLvl × 100."
          icon={<ShieldCheck size={15} aria-hidden="true" />}
          entries={statistics.equipmentLeaders}
          getCharacter={(entry) => entry.character}
          getValue={(entry) => `GS ${entry.gearScore.toLocaleString()}`}
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
        />
      </div>
    </section>
  );
}
