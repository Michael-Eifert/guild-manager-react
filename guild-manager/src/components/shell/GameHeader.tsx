import { Gauge, Pause, Play, Save } from "lucide-react";

import { formatGameSpeedLabel } from "../../progression";
import { getWowIconUrl } from "../../utils";
import IconButton from "../ui/IconButton";
import type { CharacterOnlineStatus } from "../../activity/characterOnline";

type GameHeaderProps = {
  guildName: string;
  faction: string;
  factionIconUrl: string;
  realmLabel: string;
  focus: string;
  calendarLabel: string;
  dayProgressPercent: number;
  memberCount: number;
  maxRoster: number;
  guildGold: number;
  goldCap: number;
  renownLabel: string;
  renownPoints: number;
  isPaused: boolean;
  gameSpeed: number;
  effectiveGameSpeed?: number;
  isAutoFastForward?: boolean;
  nextLogin?: CharacterOnlineStatus | null;
  onOpenSaveLoad: () => void;
  onTogglePause: () => void;
  onCycleSpeed: () => void;
};

const StatusChip = ({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "amber" | "cyan";
}) => {
  const toneClass =
    tone === "amber"
      ? "border-amber-700/70 text-amber-100"
      : tone === "cyan"
        ? "border-cyan-800/70 text-cyan-100"
        : "border-slate-700 text-slate-200";
  return (
    <div
      className={`min-w-0 rounded-lg border bg-slate-950/55 px-2.5 py-1.5 ${toneClass}`}
    >
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="truncate text-xs font-extrabold md:text-sm">{value}</div>
    </div>
  );
};

export default function GameHeader({
  guildName,
  faction,
  factionIconUrl,
  realmLabel,
  focus,
  calendarLabel,
  dayProgressPercent,
  memberCount,
  maxRoster,
  guildGold,
  goldCap,
  renownLabel,
  renownPoints,
  isPaused,
  gameSpeed,
  effectiveGameSpeed = gameSpeed,
  isAutoFastForward = false,
  nextLogin = null,
  onOpenSaveLoad,
  onTogglePause,
  onCycleSpeed,
}: GameHeaderProps) {
  return (
    <header className="game-header sticky top-0 z-30 border-b border-amber-900/55 bg-[#171513]/95 px-3 py-3 shadow-lg shadow-black/20 backdrop-blur md:px-5">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-700/70 bg-slate-950/70 shadow-inner md:h-14 md:w-11">
            <img
              src={factionIconUrl}
              alt={`${faction} banner`}
              className="h-10 w-7 object-contain drop-shadow md:h-11 md:w-8"
              onError={(event) => {
                event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="wow-header-title fantasy-font truncate text-lg font-bold md:text-2xl">
                {guildName}
              </h1>
              <span className="hidden truncate text-[11px] text-amber-100/55 sm:block">
                {faction} · {realmLabel} · {focus}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-cyan-100/65 md:text-xs">
              {calendarLabel}
            </p>
            <div className="mt-1.5 flex max-w-md items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-cyan-900/70 bg-slate-950/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-300 transition-[width] duration-300"
                  style={{ width: `${dayProgressPercent}%` }}
                />
              </div>
              <span className="w-8 text-right text-[10px] font-bold text-cyan-100/55">
                {dayProgressPercent}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 lg:justify-end">
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5 sm:flex sm:flex-none">
            <StatusChip
              label="Members"
              value={`${memberCount}/${maxRoster}`}
            />
            <StatusChip
              label="Gold"
              value={`${guildGold}/${goldCap}`}
              tone="amber"
            />
            <StatusChip label={renownLabel} value={renownPoints} tone="cyan" />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <IconButton
              label="Save & Load"
              icon={<Save size={18} aria-hidden="true" />}
              onClick={onOpenSaveLoad}
            />
            <IconButton
              label={isPaused ? "Resume game" : "Pause game"}
              active={isPaused}
              icon={
                isPaused ? (
                  <Play size={18} aria-hidden="true" />
                ) : (
                  <Pause size={18} aria-hidden="true" />
                )
              }
              onClick={onTogglePause}
            />
            <IconButton
              label={
                isAutoFastForward
                  ? `Auto x8 until the next member login, then ${formatGameSpeedLabel(gameSpeed)}`
                  : `Game speed ${formatGameSpeedLabel(gameSpeed)}`
              }
              active={effectiveGameSpeed > 1}
              icon={
                <span className="flex flex-col items-center leading-none">
                  <Gauge size={16} aria-hidden="true" />
                  <span className="mt-0.5 text-[9px] font-extrabold">
                    {isAutoFastForward
                      ? "Auto x8"
                      : formatGameSpeedLabel(effectiveGameSpeed)}
                  </span>
                </span>
              }
              onClick={onCycleSpeed}
            />
          </div>
        </div>
        {isAutoFastForward && nextLogin ? (
          <div className="text-right text-[10px] text-cyan-200/80 lg:absolute lg:bottom-1 lg:right-5">
            Next login Day {nextLogin.nextLoginDayIndex + 1},{" "}
            {String(Math.floor(nextLogin.nextLoginHour)).padStart(2, "0")}:00 ·
            resumes {formatGameSpeedLabel(gameSpeed)}
          </div>
        ) : null}
      </div>
    </header>
  );
}
