import {
  AlertTriangle,
  Check,
  Clock3,
  Crown,
  GitBranch,
  HeartHandshake,
  Network,
  Pencil,
  Shield,
  Sparkles,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import Badge from "../../components/ui/Badge";
import GameButton from "../../components/ui/GameButton";
import SegmentedControl from "../../components/ui/SegmentedControl";
import { DB_CLASSES } from "../../constants";
import {
  GUILD_RANK,
  GUILD_RANK_ORDER,
  LEADERSHIP_TRAIT_DEFINITIONS,
  type GuildIncident,
  type GuildRankId,
  type GuildRelationInsight,
  type GuildRelationsState,
  type RelationsManagementMode,
} from "../../guildRelations/guildRelations";
import {
  getEligibleOfficerActors,
  getOfficerPermission,
} from "../../guildRelations/officerAuthority";
import {
  OFFICER_AUTONOMY_MODE_OPTIONS,
  type OfficerAutonomyMode,
} from "../../settings/gameSettings";
import {
  getCharacterRelationshipRows,
  normalizeGuildRelationships,
} from "../../social/relationshipSystem";
import type { Character } from "../../types/characterTypes";
import {
  getCharacterAverageItemLevel,
  getRacePortraitUrl,
  getRoleIcon,
} from "../../utils";

type Props = {
  roster: Character[];
  relationships: Record<string, unknown>;
  state: GuildRelationsState;
  insights: GuildRelationInsight[];
  currentDayIndex: number;
  onSelectCharacter: (characterId: string) => void;
  onSetRank: (characterId: string, rank: GuildRankId) => void;
  onSetRankLabels: (labels: Record<GuildRankId, string>) => boolean;
  onSetManagementMode: (mode: RelationsManagementMode) => void;
  onResolveIncident: (incidentId: string, choiceId: string) => void;
  officerAutonomyMode?: OfficerAutonomyMode;
  onSetOfficerAutonomyMode?: (mode: OfficerAutonomyMode) => void;
  onResolveOfficerAction?: (
    actionId: string,
    decision: "accept" | "decline",
  ) => boolean;
};

type GraphMode = "whole" | "focus";
type RankingFocusId = "support" | "influence" | "friction";
type RankedRelationMetric =
  | "influence"
  | "support"
  | "popularity"
  | "friction";
type MemberRankFilter =
  | "all"
  | "leadership"
  | "officers"
  | "members"
  | "recruits";

const MEMBER_RANK_FILTERS: ReadonlyArray<{
  id: MemberRankFilter;
  label: string;
  ranks: readonly GuildRankId[];
}> = [
  { id: "all", label: "All", ranks: GUILD_RANK_ORDER },
  {
    id: "leadership",
    label: "GM + Leadership",
    ranks: [GUILD_RANK.GUILD_MASTER, GUILD_RANK.LEADERSHIP],
  },
  {
    id: "officers",
    label: "Officers + Class Leads",
    ranks: [GUILD_RANK.OFFICER, GUILD_RANK.CLASS_LEADER],
  },
  { id: "members", label: "Members", ranks: [GUILD_RANK.MEMBER] },
  { id: "recruits", label: "Recruits", ranks: [GUILD_RANK.RECRUIT] },
];

const BULK_ASSIGNABLE_RANKS = GUILD_RANK_ORDER.filter(
  (rank) => rank !== GUILD_RANK.GUILD_MASTER,
);

const getMetricRank = (
  insights: GuildRelationInsight[],
  metric: RankedRelationMetric,
  value: number,
) =>
  1 +
  insights.filter(
    (candidate) => Number(candidate[metric]) > Number(value),
  ).length;

const panel =
  "rounded-xl border border-slate-700/80 bg-slate-950/55 shadow-lg";

const getCharacterName = (character?: Character) =>
  character?.name || "Unknown";

const getPortrait = (character?: Character) =>
  character
    ? getRacePortraitUrl(character.race, character.gender)
    : "";

function RankBadge({
  rank,
  state,
}: {
  rank: GuildRankId;
  state: GuildRelationsState;
}) {
  return (
    <Badge tone={rank === GUILD_RANK.GUILD_MASTER ? "amber" : "neutral"}>
      {state.rankLabels[rank]}
    </Badge>
  );
}

function LeadershipPyramid({
  insights,
  state,
  onSelectCharacter,
}: Pick<Props, "insights" | "state" | "onSelectCharacter">) {
  return (
    <section className={`${panel} p-4`} aria-labelledby="leadership-heading">
      <div className="flex items-center gap-2">
        <Crown size={18} className="text-amber-300" aria-hidden="true" />
        <h2
          id="leadership-heading"
          className="fantasy-font text-lg font-bold text-amber-100"
        >
          Leadership Pyramid
        </h2>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Formal hierarchy with members ordered by earned influence.
      </p>
      <div className="mt-4 space-y-2">
        {GUILD_RANK_ORDER.map((rank, rankIndex) => {
          const members = insights.filter((entry) => entry.rank === rank);
          if (members.length === 0) return null;
          return (
            <div
              key={rank}
              className="mx-auto rounded-lg border border-slate-800 bg-slate-900/65 p-2"
              style={{ width: `${Math.min(100, 42 + rankIndex * 11)}%` }}
            >
              <div className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {state.rankLabels[rank]}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {members.map((entry) => (
                  <button
                    key={entry.character.id}
                    type="button"
                    onClick={() =>
                      onSelectCharacter(String(entry.character.id))
                    }
                    className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-left hover:border-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    <img
                      src={getPortrait(entry.character)}
                      alt=""
                      className="h-8 w-8 rounded border border-slate-600"
                    />
                    <span>
                      <span className="block text-xs font-bold text-slate-100">
                        {getCharacterName(entry.character)}
                      </span>
                      <span className="block text-[10px] text-amber-300">
                        {entry.influence} influence
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OfficerDesk({
  roster,
  state,
  currentDayIndex,
  mode,
  onSetMode,
  onResolveAction,
}: {
  roster: Character[];
  state: GuildRelationsState;
  currentDayIndex: number;
  mode: OfficerAutonomyMode;
  onSetMode: (mode: OfficerAutonomyMode) => void;
  onResolveAction: (
    actionId: string,
    decision: "accept" | "decline",
  ) => boolean;
}) {
  const officers = getEligibleOfficerActors({ roster, state });
  const pending = state.officerActions.filter(
    (action) => action.status === "pending",
  );
  const history = state.officerActions
    .filter((action) => action.status !== "pending")
    .slice(0, 8);
  const describeAction = (action: GuildRelationsState["officerActions"][number]) =>
    action.kind === "recruitment"
      ? `Accept ${action.targetName}'s free application`
      : `Move ${action.targetName} from ${
          action.fromRank ? state.rankLabels[action.fromRank] : "their rank"
        } to ${action.toRank ? state.rankLabels[action.toRank] : "a new rank"}`;

  return (
    <section className={`${panel} overflow-hidden`} aria-labelledby="officer-desk-heading">
      <div className="flex flex-col gap-3 border-b border-slate-800 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <UserCog size={20} className="mt-0.5 text-amber-300" aria-hidden="true" />
          <div>
            <h2
              id="officer-desk-heading"
              className="fantasy-font text-lg font-bold text-amber-100"
            >
              Officer Desk
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Officers make at most one new personnel decision per guild day.
              Player rank changes remain protected for three days.
            </p>
          </div>
        </div>
        <SegmentedControl
          ariaLabel="Officer Autonomy"
          value={mode}
          onChange={onSetMode}
          options={OFFICER_AUTONOMY_MODE_OPTIONS}
          className="lg:w-[360px]"
        />
      </div>
      <div className="border-b border-slate-800 bg-slate-900/35 px-4 py-2 text-[11px] text-slate-500">
        {mode === "off"
          ? "Off: officers create no new personnel decisions. Existing proposals can still be reviewed."
          : mode === "proposals"
            ? "Proposals: officers recommend actions for you to accept or decline within three guild days."
            : "Automatic: newly selected officer actions are validated and applied immediately."}
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Authorized Leaders
          </h3>
          <div className="mt-2 space-y-2">
            {officers.length > 0 ? (
              officers.map((officer) => {
                const rank = state.assignments[String(officer.id)];
                const permission = getOfficerPermission(rank);
                return (
                  <article
                    key={officer.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-100">
                        {officer.name}
                      </span>
                      <RankBadge rank={rank} state={state} />
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      {permission?.summary}
                    </p>
                  </article>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-slate-700 p-4 text-xs text-slate-500">
                Appoint Leadership, an Officer, or a Class Leader to enable
                personnel decisions. The Guild Master does not generate actions.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Open Proposals
              </h3>
              <Badge tone={pending.length > 0 ? "amber" : "neutral"}>
                {pending.length}
              </Badge>
            </div>
            <div className="mt-2 space-y-2">
              {pending.length > 0 ? (
                pending.map((action) => (
                  <article
                    key={action.id}
                    className="rounded-lg border border-amber-900/60 bg-amber-950/15 p-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-amber-100">
                          {describeAction(action)}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          Proposed by {action.actorName} · expires in {Math.max(
                            0,
                            action.expiresDayIndex - currentDayIndex,
                          )} guild day(s)
                        </div>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-slate-500">
                          {action.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <GameButton
                          size="sm"
                          tone="success"
                          icon={<Check size={14} aria-hidden="true" />}
                          onClick={() => onResolveAction(action.id, "accept")}
                        >
                          Accept
                        </GameButton>
                        <GameButton
                          size="sm"
                          tone="danger"
                          icon={<X size={14} aria-hidden="true" />}
                          onClick={() => onResolveAction(action.id, "decline")}
                        >
                          Decline
                        </GameButton>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-700 p-4 text-xs text-slate-500">
                  No open officer proposals. Automatic decisions appear in the
                  history after they are applied.
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Recent Decisions
            </h3>
            <div className="mt-2 space-y-1.5">
              {history.length > 0 ? (
                history.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/45 px-3 py-2"
                  >
                    <Clock3 size={14} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-300">
                        {describeAction(action)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-600">
                        {action.actorName} · {action.status} · day {action.resolvedDayIndex ?? action.createdDayIndex}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-600">No decisions recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type GraphNode = {
  insight: GuildRelationInsight;
  x: number;
  y: number;
};

function RelationshipGraph({
  roster,
  relationships,
  insights,
  selectedId,
  onSelect,
}: {
  roster: Character[];
  relationships: Record<string, unknown>;
  insights: GuildRelationInsight[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [mode, setMode] = useState<GraphMode>("whole");
  const normalized = useMemo(
    () =>
      normalizeGuildRelationships(relationships) as Record<
        string,
        { memberIds: string[]; points: number }
      >,
    [relationships],
  );
  const visibleInsights = useMemo(() => {
    if (mode === "whole") return insights;
    const connectedIds = Object.values(normalized)
      .filter((entry) => entry.memberIds.includes(selectedId))
      .sort((left, right) => Math.abs(right.points) - Math.abs(left.points))
      .slice(0, 12)
      .map((entry) => entry.memberIds.find((id) => id !== selectedId))
      .filter(Boolean);
    return insights.filter(
      (entry) =>
        String(entry.character.id) === selectedId ||
        connectedIds.includes(String(entry.character.id)),
    );
  }, [insights, mode, normalized, selectedId]);
  const nodes = useMemo<GraphNode[]>(() => {
    const width = 900;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;
    const selected = visibleInsights.find(
      (entry) => String(entry.character.id) === selectedId,
    );
    const ordered =
      mode === "focus" && selected
        ? [
            selected,
            ...visibleInsights.filter(
              (entry) => String(entry.character.id) !== selectedId,
            ),
          ]
        : visibleInsights;
    return ordered.map((insight, index) => {
      if (mode === "focus" && index === 0) {
        return { insight, x: centerX, y: centerY };
      }
      const ringIndex = mode === "focus" ? index - 1 : index;
      const count = mode === "focus" ? Math.max(1, ordered.length - 1) : Math.max(1, ordered.length);
      const angle = (ringIndex / count) * Math.PI * 2 - Math.PI / 2;
      const radiusX = mode === "focus" ? 330 : 350;
      const radiusY = mode === "focus" ? 185 : 190;
      return {
        insight,
        x: centerX + Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY,
      };
    });
  }, [mode, selectedId, visibleInsights]);
  const nodeById = new Map(
    nodes.map((node) => [String(node.insight.character.id), node]),
  );
  const edges = Object.values(normalized).filter((entry) => {
    const [leftId, rightId] = entry.memberIds;
    if (!nodeById.has(leftId) || !nodeById.has(rightId)) return false;
    if (mode === "focus") return entry.memberIds.includes(selectedId);
    return Math.abs(entry.points) >= 10;
  });
  const selectedCharacter = roster.find(
    (member) => String(member.id) === selectedId,
  );
  const accessibleRows = getCharacterRelationshipRows({
    relationships,
    characterId: selectedId,
    roster,
  }) as Array<{
    otherMember: Character;
    relationship: { points: number };
    level: string;
  }>;

  return (
    <section className={`${panel} overflow-hidden`} aria-labelledby="graph-heading">
      <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Network size={18} className="text-sky-300" aria-hidden="true" />
            <h2
              id="graph-heading"
              className="fantasy-font text-lg font-bold text-amber-100"
            >
              Relationship Network
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Select a member to inspect their strongest connections.
          </p>
        </div>
        <SegmentedControl
          ariaLabel="Relationship graph mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "whole", label: "Whole Guild" },
            { value: "focus", label: "Character Focus" },
          ]}
          className="sm:w-72"
          tone="sky"
        />
      </div>
      <div className="overflow-hidden bg-[radial-gradient(circle_at_center,rgba(30,64,175,0.12),transparent_65%)]">
        <svg
          viewBox="0 0 900 500"
          role="img"
          aria-label={`Guild relationship diagram focused on ${getCharacterName(selectedCharacter)}`}
          className="block h-auto min-h-[300px] w-full"
        >
          {edges.map((entry) => {
            const left = nodeById.get(entry.memberIds[0]);
            const right = nodeById.get(entry.memberIds[1]);
            if (!left || !right) return null;
            const positive = entry.points >= 0;
            return (
              <g key={entry.memberIds.join(":")}>
                <line
                  x1={left.x}
                  y1={left.y}
                  x2={right.x}
                  y2={right.y}
                  stroke={positive ? "#34d399" : "#f87171"}
                  strokeWidth={1.5 + Math.abs(entry.points) / 22}
                  strokeDasharray={positive ? undefined : "8 5"}
                  opacity={0.65}
                />
                <title>
                  {positive ? "Positive" : "Negative"} relationship:{" "}
                  {entry.points > 0 ? "+" : ""}
                  {entry.points}
                </title>
              </g>
            );
          })}
          {nodes.map(({ insight, x, y }) => {
            const id = String(insight.character.id);
            const selected = id === selectedId;
            const radius = 24 + insight.influence / 12;
            return (
              <g
                key={id}
                role="button"
                tabIndex={0}
                aria-label={`${getCharacterName(insight.character)}, ${insight.influence} influence`}
                onClick={() => onSelect(id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onSelect(id);
                }}
                className="cursor-pointer outline-none"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={radius + 5}
                  fill={selected ? "#78350f" : "#0f172a"}
                  stroke={selected ? "#fbbf24" : "#475569"}
                  strokeWidth={selected ? 4 : 2}
                />
                <image
                  href={getPortrait(insight.character)}
                  x={x - radius}
                  y={y - radius}
                  width={radius * 2}
                  height={radius * 2}
                  clipPath={`circle(${radius}px at ${x}px ${y}px)`}
                />
                <text
                  x={x}
                  y={y + radius + 17}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="13"
                  fontWeight="700"
                >
                  {String(insight.character.name || "Unknown").slice(0, 14)}
                </text>
                <text
                  x={x}
                  y={y + radius + 31}
                  textAnchor="middle"
                  fill="#fbbf24"
                  fontSize="10"
                >
                  {insight.influence} influence
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="border-t border-slate-800 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Accessible connection list: {getCharacterName(selectedCharacter)}
        </h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {accessibleRows.length === 0 ? (
            <p className="text-xs italic text-slate-500">
              No recorded connections yet.
            </p>
          ) : (
            accessibleRows.slice(0, 12).map((row) => (
              <button
                key={row.otherMember.id}
                type="button"
                onClick={() => onSelect(String(row.otherMember.id))}
                className="flex min-h-11 items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span className="text-xs font-bold text-slate-200">
                  {row.otherMember.name}
                </span>
                <span
                  className={
                    row.relationship.points >= 0
                      ? "text-xs font-bold text-emerald-300"
                      : "text-xs font-bold text-red-300"
                  }
                >
                  {row.relationship.points > 0 ? "+" : ""}
                  {row.relationship.points} · {row.level}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function IncidentInbox({
  state,
  roster,
  currentDayIndex,
  onResolveIncident,
}: Pick<Props, "state" | "roster" | "currentDayIndex" | "onResolveIncident">) {
  const pending = state.incidents.filter(
    (incident) => incident.status === "pending",
  );
  const byId = new Map(roster.map((member) => [String(member.id), member]));
  return (
    <section className={`${panel} p-4`} aria-labelledby="incidents-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="incidents-heading"
            className="fantasy-font text-lg font-bold text-amber-100"
          >
            Management Inbox
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Manual cases expire after one game day and are then handled by the
            Guild Master.
          </p>
        </div>
        <Badge tone={pending.length > 0 ? "red" : "emerald"}>
          {pending.length} open
        </Badge>
      </div>
      <div className="mt-3 space-y-3">
        {pending.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 text-center text-sm text-slate-500">
            No unresolved guild incidents.
          </div>
        ) : (
          pending.map((incident: GuildIncident) => (
            <article
              key={incident.id}
              className="rounded-lg border border-red-900/50 bg-red-950/15 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {incident.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {incident.description}
                  </p>
                </div>
                <Badge tone="red">
                  resolves in{" "}
                  {Math.max(0, incident.expiresDayIndex - currentDayIndex)}d
                </Badge>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                {getCharacterName(byId.get(incident.actorId))} ↔{" "}
                {getCharacterName(byId.get(incident.subjectId))}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {incident.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => onResolveIncident(incident.id, choice.id)}
                    className="min-h-14 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left hover:border-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    <span className="block text-xs font-bold text-amber-100">
                      {choice.label}
                    </span>
                    <span className="mt-1 block text-[10px] text-slate-500">
                      {choice.description}
                    </span>
                    <span className="mt-1 block text-[10px] font-bold text-slate-300">
                      Relation {choice.relationshipDelta >= 0 ? "+" : ""}
                      {choice.relationshipDelta} · Morale{" "}
                      {choice.moraleDelta >= 0 ? "+" : ""}
                      {choice.moraleDelta}
                    </span>
                  </button>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default function GuildRelationsPage({
  roster,
  relationships,
  state,
  insights,
  currentDayIndex,
  onSelectCharacter,
  onSetRank,
  onSetRankLabels,
  onSetManagementMode,
  onResolveIncident,
  officerAutonomyMode = "off",
  onSetOfficerAutonomyMode = () => undefined,
  onResolveOfficerAction = () => false,
}: Props) {
  const [selectedId, setSelectedId] = useState(
    String(insights[0]?.character.id || ""),
  );
  const [editingLabels, setEditingLabels] = useState(false);
  const [draftLabels, setDraftLabels] = useState(state.rankLabels);
  const [memberRankFilter, setMemberRankFilter] =
    useState<MemberRankFilter>("all");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [bulkRank, setBulkRank] = useState<GuildRankId>(GUILD_RANK.MEMBER);
  const [focusedRanking, setFocusedRanking] =
    useState<RankingFocusId | null>(null);
  const selected =
    insights.find((entry) => String(entry.character.id) === selectedId) ||
    insights[0];
  const normalizedRelationships = normalizeGuildRelationships(relationships) as Record<
    string,
    { points: number }
  >;
  const relationshipValues = Object.values(normalizedRelationships);
  const positiveBonds = relationshipValues.filter((entry) => entry.points > 0);
  const negativeBonds = relationshipValues.filter((entry) => entry.points < 0);
  const cohesion =
    relationshipValues.length > 0
      ? Math.round(
          ((positiveBonds.length +
            relationshipValues.filter((entry) => entry.points === 0).length *
              0.5) /
            relationshipValues.length) *
            100,
        )
      : 50;
  const pendingCount = state.incidents.filter(
    (incident) => incident.status === "pending",
  ).length;
  const strongestSupport = [...insights].sort(
    (left, right) => right.support - left.support,
  );
  const mostInfluence = [...insights].sort(
    (left, right) => right.influence - left.influence,
  );
  const highestFriction = [...insights].sort(
    (left, right) => right.friction - left.friction,
  );
  const rankingSections = [
    {
      id: "support" as const,
      title: "Strongest Support",
      description:
        "60% popularity + 40% guild impact, minus 20% friction.",
      icon: HeartHandshake,
      entries: strongestSupport,
      metric: "support" as const,
      tone: "text-emerald-300",
    },
    {
      id: "influence" as const,
      title: "Most Influence",
      description:
        "40% popularity + 40% impact + 20% rank, minus 15% friction.",
      icon: Crown,
      entries: mostInfluence,
      metric: "influence" as const,
      tone: "text-amber-300",
    },
    {
      id: "friction" as const,
      title: "Highest Friction",
      description:
        "Negative bonds minus 25% of positive bonds, x1.5; +8 per open incident.",
      icon: AlertTriangle,
      entries: highestFriction,
      metric: "friction" as const,
      tone: "text-red-300",
    },
  ];
  const activeRanking =
    rankingSections.find((ranking) => ranking.id === focusedRanking) || null;
  const ActiveRankingIcon = activeRanking?.icon || Users;
  const activeRankFilter =
    MEMBER_RANK_FILTERS.find((filter) => filter.id === memberRankFilter) ||
    MEMBER_RANK_FILTERS[0];
  const filteredMemberInsights = [...insights]
    .filter((entry) => activeRankFilter.ranks.includes(entry.rank))
    .sort((left, right) => {
      const rankDifference =
        GUILD_RANK_ORDER.indexOf(left.rank) -
        GUILD_RANK_ORDER.indexOf(right.rank);

      if (rankDifference !== 0) return rankDifference;
      if (right.influence !== left.influence) {
        return right.influence - left.influence;
      }

      return String(left.character.name || "").localeCompare(
        String(right.character.name || ""),
      );
    });
  const selectableVisibleIds = filteredMemberInsights
    .filter((entry) => entry.rank !== GUILD_RANK.GUILD_MASTER)
    .map((entry) => String(entry.character.id));
  const selectedEntries = insights.filter(
    (entry) =>
      entry.rank !== GUILD_RANK.GUILD_MASTER &&
      selectedMemberIds.has(String(entry.character.id)),
  );
  const allVisibleSelected =
    selectableVisibleIds.length > 0 &&
    selectableVisibleIds.every((id) => selectedMemberIds.has(id));
  const selectMember = (id: string) => {
    setSelectedId(id);
  };
  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectVisibleMembers = () => {
    setSelectedMemberIds((current) => {
      const next = new Set(current);
      selectableVisibleIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const applyBulkRank = () => {
    selectedEntries.forEach((entry) => {
      if (
        entry.rank !== GUILD_RANK.GUILD_MASTER &&
        entry.rank !== bulkRank
      ) {
        onSetRank(String(entry.character.id), bulkRank);
      }
    });
    setSelectedMemberIds(new Set());
  };

  return (
    <div className="space-y-4 pb-8">
      <header className={`${panel} p-4 md:p-5`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-300">
              <GitBranch size={20} aria-hidden="true" />
              <h1 className="fantasy-font text-xl font-bold text-amber-100 md:text-2xl">
                Guild Relations
              </h1>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Follow the people who hold the guild together, the conflicts that
              threaten it, and the hierarchy shaping every decision.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SegmentedControl
              ariaLabel="Relations management mode"
              value={state.managementMode}
              onChange={onSetManagementMode}
              options={[
                { value: "automatic", label: "GM Automatic" },
                { value: "manual", label: "Resolve Yourself" },
              ]}
              className="sm:w-80"
            />
            <GameButton
              tone="neutral"
              icon={<Pencil size={16} aria-hidden="true" />}
              onClick={() => {
                setDraftLabels({ ...state.rankLabels });
                setEditingLabels((current) => !current);
              }}
            >
              Rank Names
            </GameButton>
          </div>
        </div>
        {editingLabels ? (
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/65 p-3">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {GUILD_RANK_ORDER.map((rank) => (
                <label key={rank} className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {state.rankLabels[rank]}
                  </span>
                  <input
                    value={draftLabels[rank]}
                    maxLength={24}
                    onChange={(event) =>
                      setDraftLabels((current) => ({
                        ...current,
                        [rank]: event.target.value,
                      }))
                    }
                    className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <GameButton tone="ghost" onClick={() => setEditingLabels(false)}>
                Cancel
              </GameButton>
              <GameButton
                tone="primary"
                onClick={() => {
                  if (onSetRankLabels(draftLabels)) setEditingLabels(false);
                }}
              >
                Save Names
              </GameButton>
            </div>
          </div>
        ) : null}
      </header>

      <section
        aria-label="Guild relation overview"
        className="grid grid-cols-2 gap-2 lg:grid-cols-4"
      >
        {[
          {
            label: "Cohesion",
            value: `${cohesion}%`,
            icon: HeartHandshake,
            tone: "text-emerald-300",
          },
          {
            label: "Positive Bonds",
            value: positiveBonds.length,
            icon: Sparkles,
            tone: "text-amber-300",
          },
          {
            label: "Conflict Risk",
            value: negativeBonds.length,
            icon: AlertTriangle,
            tone: "text-red-300",
          },
          {
            label: "Open Cases",
            value: pendingCount,
            icon: Shield,
            tone: "text-sky-300",
          },
        ].map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className={`${panel} p-3`}>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <Icon size={15} className={tone} aria-hidden="true" />
              {label}
            </div>
            <div className="mt-2 text-2xl font-black text-slate-100">
              {value}
            </div>
          </article>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <RelationshipGraph
          roster={roster}
          relationships={relationships}
          insights={insights}
          selectedId={selectedId}
          onSelect={selectMember}
        />
        <LeadershipPyramid
          insights={insights}
          state={state}
          onSelectCharacter={selectMember}
        />
      </div>

      <OfficerDesk
        roster={roster}
        state={state}
        currentDayIndex={currentDayIndex}
        mode={officerAutonomyMode}
        onSetMode={onSetOfficerAutonomyMode}
        onResolveAction={onResolveOfficerAction}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {rankingSections.map(
          ({ id, title, icon: Icon, entries, metric, tone }) => (
          <section key={title} className={`${panel} overflow-hidden`}>
            <div className="flex items-center gap-2 border-b border-slate-800 p-3">
              <Icon size={16} className={tone} aria-hidden="true" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {title}
              </h2>
            </div>
            <ol className="divide-y divide-slate-800">
              {entries.slice(0, 5).map((entry) => (
                <li key={entry.character.id}>
                  <button
                    type="button"
                    onClick={() => selectMember(String(entry.character.id))}
                    className="flex min-h-12 w-full items-center gap-3 px-3 text-left hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
                  >
                    <span className="w-5 text-xs font-black text-slate-500">
                      {getMetricRank(insights, metric, entry[metric])}
                    </span>
                    <img
                      src={getPortrait(entry.character)}
                      alt=""
                      className="h-8 w-8 rounded border border-slate-700"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-200">
                      {entry.character.name}
                    </span>
                    <span className={`text-xs font-black ${tone}`}>
                      {entry[metric]}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              aria-expanded={focusedRanking === id}
              aria-label={`${
                focusedRanking === id ? "Hide" : "View full"
              } ${title} ranking`}
              onClick={() =>
                setFocusedRanking((current) => (current === id ? null : id))
              }
              className="flex min-h-11 w-full items-center justify-center border-t border-slate-800 px-3 text-xs font-bold text-amber-300 hover:bg-amber-950/20 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
            >
              {focusedRanking === id
                ? "Hide full ranking"
                : `View all ${entries.length}`}
            </button>
          </section>
          ),
        )}
      </div>

      {activeRanking ? (
        <section
          className={`${panel} overflow-hidden`}
          aria-labelledby="full-ranking-heading"
        >
          <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ActiveRankingIcon
                size={20}
                className={activeRanking.tone}
                aria-hidden="true"
              />
              <div>
                <h2
                  id="full-ranking-heading"
                  className="fantasy-font text-lg font-bold text-amber-100"
                >
                  Full {activeRanking.title} Ranking
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {activeRanking.description}
                </p>
              </div>
            </div>
            <GameButton
              tone="ghost"
              onClick={() => setFocusedRanking(null)}
              aria-label={`Close ${activeRanking.title} ranking`}
            >
              Close
            </GameButton>
          </div>
          <ol
            className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-3"
            aria-label={`Full ${activeRanking.title} ranking`}
          >
            {activeRanking.entries.map((entry) => {
              const metricValue = entry[activeRanking.metric];
              const metricRank = getMetricRank(
                insights,
                activeRanking.metric,
                metricValue,
              );
              const classInfo =
                DB_CLASSES[
                  entry.character.charClass as keyof typeof DB_CLASSES
                ];
              return (
                <li key={`${activeRanking.id}-${entry.character.id}`}>
                  <button
                    type="button"
                    onClick={() =>
                      selectMember(String(entry.character.id))
                    }
                    className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-left hover:border-amber-700 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    <span className="w-7 shrink-0 text-center text-sm font-black text-slate-500">
                      #{metricRank}
                    </span>
                    <img
                      src={getPortrait(entry.character)}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg border border-slate-700"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {classInfo?.icon ? (
                          <img
                            src={classInfo.icon}
                            alt=""
                            className="h-4 w-4 rounded-sm border border-slate-700"
                          />
                        ) : null}
                        <span
                          className="truncate text-sm font-bold"
                          style={{ color: classInfo?.color || "#f1f5f9" }}
                        >
                          {entry.character.name}
                        </span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1">
                        <RankBadge rank={entry.rank} state={state} />
                        <span className="text-[10px] text-slate-500">
                          {getRoleIcon(entry.character.role)}{" "}
                          {entry.character.role}
                        </span>
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-lg font-black ${activeRanking.tone}`}
                    >
                      {metricValue}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {state.managementMode === "manual" ? (
        <IncidentInbox
          state={state}
          roster={roster}
          currentDayIndex={currentDayIndex}
          onResolveIncident={onResolveIncident}
        />
      ) : null}

      <section className={`${panel} overflow-hidden`} aria-labelledby="members-heading">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-sky-300" aria-hidden="true" />
            <h2
              id="members-heading"
              className="fantasy-font text-lg font-bold text-amber-100"
            >
              Member Relations
            </h2>
          </div>
          <Badge tone="cyan">
            {filteredMemberInsights.length} / {insights.length}
          </Badge>
        </div>

        <div className="space-y-3 border-b border-slate-800 bg-slate-900/35 p-3">
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5"
            aria-label="Filter members by rank"
          >
            {MEMBER_RANK_FILTERS.map((filter) => {
              const active = filter.id === memberRankFilter;
              const count = insights.filter((entry) =>
                filter.ranks.includes(entry.rank),
              ).length;
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMemberRankFilter(filter.id)}
                  className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    active
                      ? "border-amber-500 bg-amber-950/35 text-amber-100"
                      : "border-slate-700 bg-slate-950/70 text-slate-300 hover:border-amber-700"
                  }`}
                >
                  <span>{filter.label}</span>
                  <span className="ml-1.5 text-[10px] text-slate-500">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <GameButton
                tone="neutral"
                disabled={
                  selectableVisibleIds.length === 0 || allVisibleSelected
                }
                onClick={selectVisibleMembers}
              >
                Select visible
              </GameButton>
              <GameButton
                tone="ghost"
                disabled={selectedEntries.length === 0}
                onClick={() => setSelectedMemberIds(new Set())}
              >
                Clear selection
              </GameButton>
              <span
                className="flex min-h-11 items-center text-xs font-bold text-sky-200"
                aria-live="polite"
              >
                {selectedEntries.length} selected
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="block min-w-48 space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Set selected rank
                </span>
                <select
                  aria-label="Bulk rank"
                  value={bulkRank}
                  onChange={(event) =>
                    setBulkRank(event.target.value as GuildRankId)
                  }
                  className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-bold text-slate-200 focus:border-amber-400 focus:outline-none"
                >
                  {BULK_ASSIGNABLE_RANKS.map((rank) => (
                    <option key={rank} value={rank}>
                      {state.rankLabels[rank]}
                    </option>
                  ))}
                </select>
              </label>
              <GameButton
                tone="primary"
                disabled={selectedEntries.length === 0}
                onClick={applyBulkRank}
                aria-label={`Apply rank to ${selectedEntries.length} selected members`}
              >
                Apply rank
              </GameButton>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredMemberInsights.map((entry) => {
            const trait =
              LEADERSHIP_TRAIT_DEFINITIONS[
                entry.character
                  .leadershipTrait as keyof typeof LEADERSHIP_TRAIT_DEFINITIONS
              ];
            const isGuildMaster = entry.rank === GUILD_RANK.GUILD_MASTER;
            const memberId = String(entry.character.id);
            const isBulkSelected = selectedMemberIds.has(memberId);
            const classInfo =
              DB_CLASSES[
                entry.character.charClass as keyof typeof DB_CLASSES
              ];
            const characterLevel = Math.max(
              1,
              Number(entry.character.level) || 1,
            );
            const averageItemLevel =
              getCharacterAverageItemLevel(entry.character);
            return (
              <article
                key={entry.character.id}
                aria-label={`${entry.character.name} member relations card`}
                className={`relative rounded-lg border p-3 ${
                  String(entry.character.id) === selected?.character.id
                    ? "border-amber-500 bg-amber-950/20"
                    : isBulkSelected
                      ? "border-sky-500 bg-sky-950/20"
                    : "border-slate-800 bg-slate-900/55"
                }`}
              >
                <label className="absolute right-3 top-3 z-10 flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-950/90 hover:border-sky-600">
                  <span className="sr-only">
                    {isGuildMaster
                      ? `${entry.character.name} cannot be bulk selected`
                      : `Select ${entry.character.name}`}
                  </span>
                  <input
                    type="checkbox"
                    checked={isBulkSelected}
                    disabled={isGuildMaster}
                    onChange={() => toggleMemberSelection(memberId)}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-900 accent-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    selectMember(String(entry.character.id));
                    onSelectCharacter(String(entry.character.id));
                  }}
                  className="flex min-h-11 w-full items-center gap-3 pr-12 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <img
                    src={getPortrait(entry.character)}
                    alt=""
                    className="h-11 w-11 rounded-lg border border-slate-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      {classInfo?.icon ? (
                        <img
                          src={classInfo.icon}
                          alt=""
                          className="h-4 w-4 shrink-0 rounded-sm border border-slate-700"
                        />
                      ) : null}
                      <span
                        className="block truncate text-sm font-bold"
                        style={{ color: classInfo?.color || "#f1f5f9" }}
                      >
                        {entry.character.name}
                      </span>
                    </span>
                    <span
                      aria-label={`${entry.character.name}: ${entry.character.charClass}, ${entry.character.role}, level ${characterLevel}, item level ${averageItemLevel.toFixed(1)}`}
                      className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400"
                    >
                      <span style={{ color: classInfo?.color || "#cbd5e1" }}>
                        {entry.character.charClass}
                      </span>
                      <span>
                        {getRoleIcon(entry.character.role)}{" "}
                        {entry.character.role}
                      </span>
                      <span>Lvl {characterLevel}</span>
                      <span className="font-bold text-amber-200">
                        iLvl {averageItemLevel.toFixed(1)}
                      </span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <RankBadge rank={entry.rank} state={state} />
                      <Badge tone="cyan">{trait?.name || "Strategist"}</Badge>
                    </span>
                  </span>
                </button>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  {[
                    ["Influence", "influence", entry.influence],
                    ["Support", "support", entry.support],
                    ["Popularity", "popularity", entry.popularity],
                    ["Friction", "friction", entry.friction],
                  ].map(([label, metric, value]) => (
                    <div key={label} className="rounded bg-slate-950/70 p-2">
                      <div className="text-[9px] uppercase text-slate-600">
                        {label}
                      </div>
                      <div className="flex items-baseline justify-center gap-1 text-slate-200">
                        <span className="text-sm font-black">{value}</span>
                        <span className="text-[10px] font-bold text-slate-500">
                          (Rank{" "}
                          {getMetricRank(
                            insights,
                            metric as RankedRelationMetric,
                            Number(value),
                          )}
                          )
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <label className="mt-3 block">
                  <span className="sr-only">
                    Rank for {entry.character.name}
                  </span>
                  <select
                    value={entry.rank}
                    disabled={isGuildMaster}
                    onChange={(event) => {
                      const nextRank = event.target.value as GuildRankId;
                      if (
                        nextRank === GUILD_RANK.GUILD_MASTER &&
                        !window.confirm(
                          `Transfer Guild Master to ${entry.character.name}?`,
                        )
                      ) {
                        return;
                      }
                      onSetRank(String(entry.character.id), nextRank);
                    }}
                    className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-bold text-slate-200 focus:border-amber-400 focus:outline-none disabled:opacity-50"
                  >
                    {GUILD_RANK_ORDER.map((rank) => (
                      <option key={rank} value={rank}>
                        {state.rankLabels[rank]}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            );
          })}
          {filteredMemberInsights.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
              No members currently hold a rank in this group.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
