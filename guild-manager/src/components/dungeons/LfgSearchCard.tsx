import { Clock3, MessageCircle, Users } from "lucide-react";

import { DB_CLASSES } from "../../constants";
import type { LfgSearch, PartyParticipant } from "../../social/chatTypes";
import { getRacePortraitUrl, getRoleIcon, getWowIconUrl } from "../../utils";

type ClassPresentation = { color?: string; icon?: string };
const CLASS_PRESENTATIONS = DB_CLASSES as Record<string, ClassPresentation>;

const PHASE_PRESENTATION = {
  guild: {
    label: "Guild Search",
    detail: "Looking inside the guild",
    tone: "border-amber-500/60 bg-amber-950/45 text-amber-100",
  },
  general: {
    label: "Realm Search",
    detail: "Looking across the realm",
    tone: "border-cyan-500/60 bg-cyan-950/45 text-cyan-100",
  },
  ready: {
    label: "Group Ready",
    detail: "Preparing to enter",
    tone: "border-emerald-500/60 bg-emerald-950/45 text-emerald-100",
  },
} as const;

const getOpenRoleLabels = (
  participants: PartyParticipant[],
  targetSize: number,
) => {
  const openCount = Math.max(0, targetSize - participants.length);
  if (openCount === 0) return [];

  const roleCounts = participants.reduce<Record<string, number>>(
    (counts, participant) => {
      const role = participant.role || "DPS";
      counts[role] = (counts[role] || 0) + 1;
      return counts;
    },
    {},
  );
  const desiredRoles =
    targetSize >= 5
      ? ["Tank", "Healer", ...Array(targetSize - 2).fill("DPS")]
      : Array(targetSize).fill("Any Role");
  const remainingCounts = { ...roleCounts };
  const missingRoles = desiredRoles.filter((role) => {
    if ((remainingCounts[role] || 0) <= 0) return true;
    remainingCounts[role] -= 1;
    return false;
  });

  return [
    ...missingRoles,
    ...Array(Math.max(0, openCount - missingRoles.length)).fill("Any Role"),
  ].slice(0, openCount);
};

const getCountdown = (search: LfgSearch, gameTimeMs: number) => {
  if (search.phase === "ready") return "Starting now";
  const deadline =
    search.phase === "guild" ? search.guildSearchEndsAt : search.expiresAt;
  const seconds = Math.max(
    0,
    Math.ceil((Number(deadline || 0) - Number(gameTimeMs || 0)) / 1000),
  );
  return search.phase === "guild"
    ? `${seconds}s until realm search`
    : `${seconds}s remaining`;
};

function ParticipantCard({ participant }: { participant: PartyParticipant }) {
  const classData = CLASS_PRESENTATIONS[participant.charClass || ""] || {};
  const isGuildMember = participant.source === "guild";

  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-lg border px-2 py-2 ${
        isGuildMember
          ? "border-amber-500/70 bg-amber-950/25 shadow-sm shadow-amber-950/40"
          : "border-slate-700 bg-slate-950/70"
      }`}
    >
      <img
        src={getRacePortraitUrl(participant.race, participant.gender)}
        alt=""
        className="h-9 w-9 flex-none rounded border border-slate-600 object-cover"
        onError={(event) => {
          event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
        }}
      />
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-xs font-bold"
          style={{ color: classData.color || "#f1f5f9" }}
        >
          {participant.name}
        </div>
        <div className="truncate text-[10px] text-slate-400">
          Lvl {participant.level} {participant.charClass || "Adventurer"}
          {!isGuildMember &&
            ` · ${participant.guildName || "Free Agent"}`}
        </div>
      </div>
      <div className="flex flex-none flex-col items-end gap-1">
        <span
          className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${
            isGuildMember
              ? "border-amber-600/70 bg-amber-950/60 text-amber-200"
              : "border-slate-600 bg-slate-900 text-slate-300"
          }`}
        >
          {isGuildMember ? "Guild" : "Realm"}
        </span>
        <span className="text-[10px] text-slate-300">
          {getRoleIcon(participant.role)} {participant.role || "DPS"}
        </span>
      </div>
    </div>
  );
}

function OpenSlot({ role }: { role: string }) {
  return (
    <div className="flex min-h-[58px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/35 px-2 py-2 text-center">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        Open · {getRoleIcon(role)} {role}
      </span>
    </div>
  );
}

export default function LfgSearchCard({
  search,
  gameTimeMs,
}: {
  search: LfgSearch;
  gameTimeMs: number;
}) {
  const participants = Array.isArray(search.participants)
    ? search.participants.slice(0, search.targetSize)
    : [];
  const guildCount = participants.filter(
    (participant) => participant.source === "guild",
  ).length;
  const realmCount = participants.length - guildCount;
  const openRoleLabels = getOpenRoleLabels(participants, search.targetSize);
  const progress = Math.min(
    100,
    Math.max(0, (participants.length / Math.max(1, search.targetSize)) * 100),
  );
  const phase =
    PHASE_PRESENTATION[search.phase as keyof typeof PHASE_PRESENTATION] ||
    PHASE_PRESENTATION.guild;

  return (
    <article
      aria-label={`${search.missionName} group forming`}
      className="overflow-hidden rounded-xl border border-cyan-800/70 bg-slate-900/80 shadow-lg"
    >
      <div className="border-b border-slate-700/80 bg-gradient-to-r from-cyan-950/70 via-slate-950/80 to-slate-950/80 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
              <Users size={14} aria-hidden="true" />
              Group Forming · {participants.length}/{search.targetSize}
            </div>
            <h4 className="mt-1 truncate text-base font-bold text-slate-50">
              {search.missionName}
            </h4>
          </div>
          <span
            className={`inline-flex flex-none items-center gap-1.5 self-start rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${phase.tone}`}
          >
            <MessageCircle size={12} aria-hidden="true" />
            {phase.label}
          </span>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-amber-400 transition-[width] duration-150 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
          <span>
            {guildCount} Guild / {realmCount} Realm · {phase.detail}
          </span>
          <span className="inline-flex items-center gap-1 text-cyan-200/80">
            <Clock3 size={12} aria-hidden="true" />
            {getCountdown(search, gameTimeMs)}
          </span>
        </div>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {participants.map((participant) => (
          <ParticipantCard
            key={`${search.id}-${participant.source}-${participant.id}`}
            participant={participant}
          />
        ))}
        {openRoleLabels.map((role, index) => (
          <OpenSlot key={`${search.id}-open-${role}-${index}`} role={role} />
        ))}
      </div>
    </article>
  );
}
