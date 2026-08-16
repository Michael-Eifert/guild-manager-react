import type { Character } from "../types/characterTypes";
import { buildGuildStatistics } from "../guild/guildStatistics";
import {
  getRelationshipPairKey,
  normalizeGuildRelationships,
} from "../social/relationshipSystem";

export const GUILD_RANK = Object.freeze({
  GUILD_MASTER: "guild_master",
  LEADERSHIP: "leadership",
  OFFICER: "officer",
  CLASS_LEADER: "class_leader",
  MEMBER: "member",
  RECRUIT: "recruit",
});

export type GuildRankId =
  typeof GUILD_RANK[keyof typeof GUILD_RANK];

export const GUILD_RANK_ORDER: readonly GuildRankId[] = Object.freeze([
  GUILD_RANK.GUILD_MASTER,
  GUILD_RANK.LEADERSHIP,
  GUILD_RANK.OFFICER,
  GUILD_RANK.CLASS_LEADER,
  GUILD_RANK.MEMBER,
  GUILD_RANK.RECRUIT,
]);

export const DEFAULT_GUILD_RANK_LABELS: Readonly<Record<GuildRankId, string>> =
  Object.freeze({
    [GUILD_RANK.GUILD_MASTER]: "Guild Master",
    [GUILD_RANK.LEADERSHIP]: "Guild Leadership",
    [GUILD_RANK.OFFICER]: "Officer",
    [GUILD_RANK.CLASS_LEADER]: "Class Leader",
    [GUILD_RANK.MEMBER]: "Member",
    [GUILD_RANK.RECRUIT]: "Recruit",
  });

const RANK_AUTHORITY: Readonly<Record<GuildRankId, number>> = Object.freeze({
  [GUILD_RANK.GUILD_MASTER]: 100,
  [GUILD_RANK.LEADERSHIP]: 80,
  [GUILD_RANK.OFFICER]: 65,
  [GUILD_RANK.CLASS_LEADER]: 55,
  [GUILD_RANK.MEMBER]: 25,
  [GUILD_RANK.RECRUIT]: 10,
});

export const LEADERSHIP_TRAIT = Object.freeze({
  DIPLOMAT: "diplomat",
  MOTIVATOR: "motivator",
  DISCIPLINARIAN: "disciplinarian",
  STRATEGIST: "strategist",
});

export type LeadershipTraitId =
  typeof LEADERSHIP_TRAIT[keyof typeof LEADERSHIP_TRAIT];

export const LEADERSHIP_TRAIT_DEFINITIONS: Readonly<
  Record<
    LeadershipTraitId,
    { id: LeadershipTraitId; name: string; description: string }
  >
> = Object.freeze({
  [LEADERSHIP_TRAIT.DIPLOMAT]: Object.freeze({
    id: LEADERSHIP_TRAIT.DIPLOMAT,
    name: "Diplomat",
    description: "Prefers mediation and repairs strained relationships.",
  }),
  [LEADERSHIP_TRAIT.MOTIVATOR]: Object.freeze({
    id: LEADERSHIP_TRAIT.MOTIVATOR,
    name: "Motivator",
    description: "Uses praise to create stronger guild-wide morale gains.",
  }),
  [LEADERSHIP_TRAIT.DISCIPLINARIAN]: Object.freeze({
    id: LEADERSHIP_TRAIT.DISCIPLINARIAN,
    name: "Disciplinarian",
    description: "Stops recurring conflict quickly, at a personal morale cost.",
  }),
  [LEADERSHIP_TRAIT.STRATEGIST]: Object.freeze({
    id: LEADERSHIP_TRAIT.STRATEGIST,
    name: "Strategist",
    description: "Chooses balanced outcomes that protect guild stability.",
  }),
});

export type RelationsManagementMode = "automatic" | "manual";
export type GuildIncidentStatus = "pending" | "resolved";

export type OfficerActionKind = "recruitment" | "rank_change";
export type OfficerActionStatus = "pending" | "applied" | "declined" | "expired";

export type OfficerAction = {
  id: string;
  kind: OfficerActionKind;
  status: OfficerActionStatus;
  actorId: string;
  actorName: string;
  targetId: string;
  targetName: string;
  applicationId?: string;
  fromRank?: GuildRankId;
  toRank?: GuildRankId;
  reasons: string[];
  score: number;
  createdDayIndex: number;
  expiresDayIndex: number;
  resolvedDayIndex?: number;
};

export type GuildIncidentChoice = {
  id: string;
  label: string;
  description: string;
  relationshipDelta: number;
  moraleDelta: number;
  target: "both" | "actor" | "subject" | "guild";
};

export type GuildIncident = {
  id: string;
  kind: "dispute" | "blame" | "praise" | "morale" | "reconciliation";
  title: string;
  description: string;
  actorId: string;
  subjectId: string;
  dayIndex: number;
  expiresDayIndex: number;
  source: "mission" | "daily";
  status: GuildIncidentStatus;
  choices: GuildIncidentChoice[];
  resolvedChoiceId?: string;
  resolvedBy?: "player" | "guild_master";
};

export type GuildElection = {
  id: string;
  departedGuildMasterId: string;
  candidateIds: string[];
  memberVotes: Record<string, string>;
  playerVoteId: string | null;
  status: "awaiting_player_vote" | "counting" | "complete";
  winnerId: string | null;
  seed: number;
  previousGameSpeed: number;
  createdDayIndex: number;
};

export type GuildRelationsState = {
  rankLabels: Record<GuildRankId, string>;
  assignments: Record<string, GuildRankId>;
  managementMode: RelationsManagementMode;
  incidents: GuildIncident[];
  lastIncidentDayIndex: number;
  sequence: number;
  election: GuildElection | null;
  officerActions: OfficerAction[];
  lastOfficerActionDayIndex: number;
  rankChangedDayByMemberId: Record<string, number>;
};

type RelationshipEntry = {
  memberIds?: string[];
  points?: number;
  events?: Array<{ missionSucceeded?: boolean; missionName?: string }>;
};

export type GuildRelationInsight = {
  character: Character;
  rank: GuildRankId;
  popularity: number;
  negativePoints: number;
  impact: number;
  support: number;
  influence: number;
  friction: number;
  positiveConnections: number;
  negativeConnections: number;
};

const rankIds = new Set<string>(GUILD_RANK_ORDER);
const leadershipTraitIds = new Set<string>(
  Object.values(LEADERSHIP_TRAIT),
);

const stableHash = (value: unknown) => {
  const text = String(value ?? "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const normalizeRankLabel = (value: unknown, fallback: string) => {
  const label = String(value || "").trim().slice(0, 24);
  return label || fallback;
};

export const getLeadershipTraitForCharacter = (
  characterId: unknown,
): LeadershipTraitId =>
  Object.values(LEADERSHIP_TRAIT)[
    stableHash(characterId) % Object.values(LEADERSHIP_TRAIT).length
  ];

export const normalizeLeadershipTrait = (
  value: unknown,
  characterId: unknown = "",
): LeadershipTraitId =>
  leadershipTraitIds.has(String(value))
    ? (value as LeadershipTraitId)
    : getLeadershipTraitForCharacter(characterId);

export const createInitialGuildRelationsState = (
  roster: readonly Character[] = [],
): GuildRelationsState => {
  const assignments: Record<string, GuildRankId> = {};
  roster.forEach((character, index) => {
    assignments[String(character.id)] =
      index === 0 ? GUILD_RANK.GUILD_MASTER : GUILD_RANK.MEMBER;
  });
  return {
    rankLabels: { ...DEFAULT_GUILD_RANK_LABELS },
    assignments,
    managementMode: "automatic",
    incidents: [],
    lastIncidentDayIndex: -1,
    sequence: 0,
    election: null,
    officerActions: [],
    lastOfficerActionDayIndex: -1,
    rankChangedDayByMemberId: {},
  };
};

export const normalizeGuildRelationsState = (
  value: unknown,
  roster: readonly Character[] = [],
): GuildRelationsState => {
  const safe =
    value && typeof value === "object"
      ? (value as Partial<GuildRelationsState>)
      : {};
  const rosterIds = roster
    .map((member) => String(member?.id || "").trim())
    .filter(Boolean);
  const labels = { ...DEFAULT_GUILD_RANK_LABELS };
  const usedLabels = new Set<string>();
  GUILD_RANK_ORDER.forEach((rankId) => {
    const candidate = normalizeRankLabel(
      safe.rankLabels?.[rankId],
      DEFAULT_GUILD_RANK_LABELS[rankId],
    );
    const normalizedKey = candidate.toLocaleLowerCase();
    labels[rankId] = usedLabels.has(normalizedKey)
      ? DEFAULT_GUILD_RANK_LABELS[rankId]
      : candidate;
    usedLabels.add(labels[rankId].toLocaleLowerCase());
  });

  const assignments: Record<string, GuildRankId> = {};
  rosterIds.forEach((memberId) => {
    const proposed = safe.assignments?.[memberId];
    assignments[memberId] = rankIds.has(String(proposed))
      ? (proposed as GuildRankId)
      : GUILD_RANK.MEMBER;
  });
  const existingMasters = rosterIds.filter(
    (id) => assignments[id] === GUILD_RANK.GUILD_MASTER,
  );
  if (rosterIds.length > 0 && existingMasters.length === 0) {
    assignments[rosterIds[0]] = GUILD_RANK.GUILD_MASTER;
  }
  existingMasters.slice(1).forEach((id) => {
    assignments[id] = GUILD_RANK.LEADERSHIP;
  });
  const ledClasses = new Set<string>();
  roster.forEach((member) => {
    const memberId = String(member?.id || "");
    if (assignments[memberId] !== GUILD_RANK.CLASS_LEADER) return;
    const memberClass = String(
      member?.charClass || member?.className || member?.class || "",
    );
    if (!memberClass || ledClasses.has(memberClass)) {
      assignments[memberId] = GUILD_RANK.MEMBER;
      return;
    }
    ledClasses.add(memberClass);
  });

  const incidents = (Array.isArray(safe.incidents) ? safe.incidents : [])
    .filter((incident): incident is GuildIncident =>
      Boolean(incident && typeof incident === "object" && incident.id),
    )
    .slice(0, 100);

  const rawElection = safe.election;
  const election =
    rawElection &&
    typeof rawElection === "object" &&
    Array.isArray(rawElection.candidateIds)
      ? ({
          ...rawElection,
          candidateIds: rawElection.candidateIds
            .map(String)
            .filter((id) => rosterIds.includes(id))
            .slice(0, 4),
          memberVotes:
            rawElection.memberVotes &&
            typeof rawElection.memberVotes === "object"
              ? rawElection.memberVotes
              : {},
        } as GuildElection)
      : null;

  const officerActions = (Array.isArray(safe.officerActions)
    ? safe.officerActions
    : []
  )
    .filter(
      (action): action is OfficerAction =>
        Boolean(
          action &&
            typeof action === "object" &&
            String(action.id || "").trim() &&
            (action.kind === "recruitment" || action.kind === "rank_change") &&
            ["pending", "applied", "declined", "expired"].includes(
              action.status,
            ),
        ),
    )
    .map((action) => ({
      ...action,
      actorId: String(action.actorId || ""),
      targetId: String(action.targetId || ""),
      reasons: Array.isArray(action.reasons)
        ? action.reasons.map(String).filter(Boolean).slice(0, 4)
        : [],
      score: Math.max(0, Math.round(Number(action.score) || 0)),
      createdDayIndex: Math.max(
        0,
        Math.floor(Number(action.createdDayIndex) || 0),
      ),
      expiresDayIndex: Math.max(
        0,
        Math.floor(Number(action.expiresDayIndex) || 0),
      ),
    }))
    .slice(0, 100);

  const rankChangedDayByMemberId = Object.fromEntries(
    Object.entries(safe.rankChangedDayByMemberId || {})
      .filter(([memberId, dayIndex]) =>
        rosterIds.includes(memberId) && Number.isFinite(Number(dayIndex)),
      )
      .map(([memberId, dayIndex]) => [
        memberId,
        Math.floor(Number(dayIndex)),
      ]),
  );

  return {
    rankLabels: labels,
    assignments,
    managementMode:
      safe.managementMode === "manual" ? "manual" : "automatic",
    incidents,
    lastIncidentDayIndex: Number.isFinite(Number(safe.lastIncidentDayIndex))
      ? Math.floor(Number(safe.lastIncidentDayIndex))
      : -1,
    sequence: Math.max(0, Math.floor(Number(safe.sequence) || 0)),
    election:
      election && election.candidateIds.length > 0 ? election : null,
    officerActions,
    lastOfficerActionDayIndex: Number.isFinite(
      Number(safe.lastOfficerActionDayIndex),
    )
      ? Math.floor(Number(safe.lastOfficerActionDayIndex))
      : -1,
    rankChangedDayByMemberId,
  };
};

export const validateGuildRankLabels = (
  labels: Record<GuildRankId, string>,
) => {
  const normalized = GUILD_RANK_ORDER.map((rankId) =>
    String(labels?.[rankId] || "").trim(),
  );
  if (normalized.some((label) => label.length < 1 || label.length > 24)) {
    return "Rank names must contain 1–24 characters.";
  }
  if (new Set(normalized.map((label) => label.toLocaleLowerCase())).size !== normalized.length) {
    return "Each rank name must be unique.";
  }
  return "";
};

export const assignGuildRank = ({
  state,
  roster,
  memberId,
  rank,
}: {
  state: GuildRelationsState;
  roster: readonly Character[];
  memberId: string;
  rank: GuildRankId;
}) => {
  const normalized = normalizeGuildRelationsState(state, roster);
  if (!normalized.assignments[memberId] || !rankIds.has(rank)) return normalized;
  const assignments = { ...normalized.assignments };
  if (rank === GUILD_RANK.GUILD_MASTER) {
    Object.entries(assignments).forEach(([id, currentRank]) => {
      if (currentRank === GUILD_RANK.GUILD_MASTER && id !== memberId) {
        assignments[id] = GUILD_RANK.LEADERSHIP;
      }
    });
  } else if (assignments[memberId] === GUILD_RANK.GUILD_MASTER) {
    return normalized;
  }
  if (rank === GUILD_RANK.CLASS_LEADER) {
    const target = roster.find(
      (member) => String(member.id) === String(memberId),
    );
    const targetClass = String(
      target?.charClass || target?.className || target?.class || "",
    );
    const classAlreadyLed = roster.some((member) => {
      const id = String(member.id);
      const memberClass = String(
        member.charClass || member.className || member.class || "",
      );
      return (
        id !== memberId &&
        memberClass === targetClass &&
        assignments[id] === GUILD_RANK.CLASS_LEADER
      );
    });
    if (targetClass && classAlreadyLed) return normalized;
  }
  assignments[memberId] = rank;
  return { ...normalized, assignments };
};

const normalizeAgainstMax = (value: number, maximum: number) =>
  maximum > 0 ? Math.round((Math.max(0, value) / maximum) * 100) : 0;

const buildFrictionScore = (
  negativePoints: number,
  positivePoints: number,
  openAdverseIncidents: number,
) => {
  // Positive relationships provide a social safety net, but never turn conflict
  // into a benefit. The curve uses an absolute scale so a small raw value cannot
  // become 100 merely because it is the highest value in a peaceful guild.
  return clamp(
    Math.round(
      Math.max(0, negativePoints - positivePoints * 0.25) * 1.5 +
        Math.min(32, openAdverseIncidents * 8),
    ),
    0,
    100,
  );
};

export const buildGuildRelationInsights = ({
  roster,
  relationships,
  relationsState,
  currentDayIndex = 0,
}: {
  roster: readonly Character[];
  relationships?: Record<string, unknown> | null;
  relationsState?: GuildRelationsState | null;
  currentDayIndex?: number;
}): GuildRelationInsight[] => {
  const safeRoster = Array.isArray(roster) ? roster.filter(Boolean) : [];
  const normalizedState = normalizeGuildRelationsState(relationsState, safeRoster);
  const relationshipEntries = Object.values(
    normalizeGuildRelationships(relationships) as Record<string, RelationshipEntry>,
  );
  const socialById = new Map(
    safeRoster.map((member) => [
      String(member.id),
      {
        positive: 0,
        negative: 0,
        positiveConnections: 0,
        negativeConnections: 0,
      },
    ]),
  );
  relationshipEntries.forEach((entry) => {
    const points = Math.floor(Number(entry.points) || 0);
    (entry.memberIds || []).forEach((id) => {
      const row = socialById.get(String(id));
      if (!row) return;
      if (points > 0) {
        row.positive += points;
        row.positiveConnections += 1;
      } else if (points < 0) {
        row.negative += Math.abs(points);
        row.negativeConnections += 1;
      }
    });
  });
  const impactById = new Map(
    buildGuildStatistics({ roster: safeRoster, relationships, limit: Math.max(1, safeRoster.length) })
      .impactLeaders.map((row) => [String(row.character.id), row.impactScore]),
  );
  const adverseIncidentById = new Map<string, number>();
  normalizedState.incidents
    .filter(
      (incident) =>
        incident.dayIndex >= currentDayIndex - 30 &&
        incident.status === "pending" &&
        (incident.kind === "dispute" ||
          incident.kind === "blame" ||
          incident.kind === "morale"),
    )
    .forEach((incident) => {
      adverseIncidentById.set(
        incident.actorId,
        (adverseIncidentById.get(incident.actorId) || 0) + 1,
      );
    });

  const raw = safeRoster.map((character) => {
    const social = socialById.get(String(character.id))!;
    return {
      character,
      rank:
        normalizedState.assignments[String(character.id)] || GUILD_RANK.MEMBER,
      popularity: social.positive,
      negativePoints: social.negative,
      impact: impactById.get(String(character.id)) || 0,
      adverseIncidents: adverseIncidentById.get(String(character.id)) || 0,
      positiveConnections: social.positiveConnections,
      negativeConnections: social.negativeConnections,
    };
  });
  const maxima = {
    popularity: Math.max(0, ...raw.map((row) => row.popularity)),
    impact: Math.max(0, ...raw.map((row) => row.impact)),
  };
  return raw
    .map((row) => {
      const popularity = normalizeAgainstMax(row.popularity, maxima.popularity);
      const impact = normalizeAgainstMax(row.impact, maxima.impact);
      const friction = buildFrictionScore(
        row.negativePoints,
        row.popularity,
        row.adverseIncidents,
      );
      const baseSupport = popularity * 0.6 + impact * 0.4;
      const baseInfluence =
        popularity * 0.4 +
        impact * 0.4 +
        RANK_AUTHORITY[row.rank] * 0.2;
      return {
        character: row.character,
        rank: row.rank,
        popularity,
        negativePoints: row.negativePoints,
        impact,
        support: clamp(Math.round(baseSupport - friction * 0.2), 0, 100),
        influence: clamp(
          Math.round(baseInfluence - friction * 0.15),
          0,
          100,
        ),
        friction,
        positiveConnections: row.positiveConnections,
        negativeConnections: row.negativeConnections,
      };
    })
    .sort(
      (left, right) =>
        right.influence - left.influence ||
        String(left.character.name || "").localeCompare(
          String(right.character.name || ""),
        ),
    );
};

const INCIDENT_CHOICES: Record<GuildIncident["kind"], GuildIncidentChoice[]> = {
  dispute: [
    { id: "mediate", label: "Mediate", description: "Repair trust on both sides.", relationshipDelta: 3, moraleDelta: 2, target: "both" },
    { id: "warn", label: "Issue a warning", description: "Stop the argument, but upset the instigator.", relationshipDelta: 1, moraleDelta: -5, target: "actor" },
    { id: "ignore", label: "Let it cool down", description: "Avoid intervention and accept lingering tension.", relationshipDelta: -2, moraleDelta: -1, target: "both" },
  ],
  blame: [
    { id: "mediate", label: "Review the run", description: "Turn blame into a constructive debrief.", relationshipDelta: 3, moraleDelta: 2, target: "both" },
    { id: "side_subject", label: "Defend the accused", description: "Support the accused and confront the accuser.", relationshipDelta: -1, moraleDelta: -4, target: "actor" },
    { id: "warn", label: "Warn both members", description: "End the dispute with a firm ruling.", relationshipDelta: 1, moraleDelta: -3, target: "both" },
  ],
  praise: [
    { id: "praise", label: "Praise publicly", description: "Celebrate the contribution with the whole guild.", relationshipDelta: 2, moraleDelta: 5, target: "guild" },
    { id: "private_thanks", label: "Thank them privately", description: "Strengthen the pair without making a spectacle.", relationshipDelta: 3, moraleDelta: 3, target: "both" },
  ],
  morale: [
    { id: "support", label: "Offer support", description: "Give the member time and reassurance.", relationshipDelta: 2, moraleDelta: 6, target: "actor" },
    { id: "assign_mentor", label: "Assign a mentor", description: "Build a positive connection between both members.", relationshipDelta: 3, moraleDelta: 3, target: "both" },
    { id: "ignore", label: "Stay focused", description: "Do not intervene.", relationshipDelta: 0, moraleDelta: -3, target: "actor" },
  ],
  reconciliation: [
    { id: "encourage", label: "Encourage them", description: "Reinforce the improving relationship.", relationshipDelta: 4, moraleDelta: 3, target: "both" },
    { id: "acknowledge", label: "Acknowledge quietly", description: "Let the reconciliation grow naturally.", relationshipDelta: 2, moraleDelta: 1, target: "both" },
  ],
};

const incidentCopy = (
  kind: GuildIncident["kind"],
  actorName: string,
  subjectName: string,
) => {
  if (kind === "blame") return { title: "Mission Blame", description: `${actorName} blames ${subjectName} for a failed guild activity.` };
  if (kind === "praise") return { title: "Outstanding Contribution", description: `${actorName} publicly praises ${subjectName}'s performance.` };
  if (kind === "morale") return { title: "Morale Concern", description: `${actorName} is struggling and turns to ${subjectName} for support.` };
  if (kind === "reconciliation") return { title: "Reconciliation", description: `${actorName} and ${subjectName} are trying to put an old conflict behind them.` };
  return { title: "Guild Dispute", description: `${actorName} and ${subjectName} are disrupting the guild atmosphere.` };
};

export const createGuildIncident = ({
  state,
  roster,
  relationships,
  dayIndex,
  missionSucceeded,
  missionMemberIds,
}: {
  state: GuildRelationsState;
  roster: readonly Character[];
  relationships?: Record<string, unknown> | null;
  dayIndex: number;
  missionSucceeded?: boolean;
  missionMemberIds?: string[];
}): { state: GuildRelationsState; incident: GuildIncident | null } => {
  const normalized = normalizeGuildRelationsState(state, roster);
  const safeDay = Math.max(0, Math.floor(Number(dayIndex) || 0));
  if (normalized.lastIncidentDayIndex >= safeDay || roster.length < 2) {
    return { state: normalized, incident: null };
  }
  const memberPool = Array.isArray(missionMemberIds) && missionMemberIds.length >= 2
    ? roster.filter((member) => missionMemberIds.includes(String(member.id)))
    : [...roster];
  if (memberPool.length < 2) return { state: normalized, incident: null };
  const seed = stableHash(`${safeDay}:${normalized.sequence}:${memberPool.map((member) => member.id).join(":")}`);
  let actor = memberPool[seed % memberPool.length];
  let subject = memberPool[(seed + 1 + (seed % (memberPool.length - 1))) % memberPool.length];
  const normalizedRelationships = normalizeGuildRelationships(
    relationships,
  ) as Record<string, RelationshipEntry>;
  if (missionSucceeded !== undefined) {
    const pairs: Array<{
      actor: Character;
      subject: Character;
      points: number;
    }> = [];
    for (let left = 0; left < memberPool.length; left += 1) {
      for (let right = left + 1; right < memberPool.length; right += 1) {
        const leftMember = memberPool[left];
        const rightMember = memberPool[right];
        const relationship =
          normalizedRelationships[
            getRelationshipPairKey(leftMember.id, rightMember.id)
          ];
        pairs.push({
          actor: leftMember,
          subject: rightMember,
          points: Number(relationship?.points) || 0,
        });
      }
    }
    pairs.sort((left, right) =>
      missionSucceeded
        ? right.points - left.points ||
          `${left.actor.id}:${left.subject.id}`.localeCompare(
            `${right.actor.id}:${right.subject.id}`,
          )
        : left.points - right.points ||
          `${left.actor.id}:${left.subject.id}`.localeCompare(
            `${right.actor.id}:${right.subject.id}`,
          ),
    );
    actor = pairs[0]?.actor || actor;
    subject = pairs[0]?.subject || subject;
  }
  const pair = normalizedRelationships[
    getRelationshipPairKey(actor.id, subject.id)
  ];
  const points = Number(pair?.points) || 0;
  let kind: GuildIncident["kind"];
  if (missionSucceeded === false) kind = "blame";
  else if (missionSucceeded === true) kind = "praise";
  else if (Number(actor.morale) < 35) kind = "morale";
  else if (points < 0) kind = seed % 2 === 0 ? "dispute" : "reconciliation";
  else kind = seed % 3 === 0 ? "praise" : "dispute";
  const copy = incidentCopy(kind, actor.name || "A member", subject.name || "another member");
  const incident: GuildIncident = {
    id: `relations-${safeDay}-${normalized.sequence + 1}`,
    kind,
    ...copy,
    actorId: String(actor.id),
    subjectId: String(subject.id),
    dayIndex: safeDay,
    expiresDayIndex: safeDay + 1,
    source: missionSucceeded === undefined ? "daily" : "mission",
    status: "pending",
    choices: INCIDENT_CHOICES[kind].map((choice) => ({ ...choice })),
  };
  return {
    incident,
    state: {
      ...normalized,
      incidents: [incident, ...normalized.incidents].slice(0, 100),
      lastIncidentDayIndex: safeDay,
      sequence: normalized.sequence + 1,
    },
  };
};

const getAutomaticChoiceId = (
  incident: GuildIncident,
  trait: LeadershipTraitId,
) => {
  if (trait === LEADERSHIP_TRAIT.DIPLOMAT) {
    return incident.choices.find((choice) => choice.id === "mediate")?.id ||
      incident.choices.find((choice) => choice.id === "encourage")?.id;
  }
  if (trait === LEADERSHIP_TRAIT.MOTIVATOR) {
    return incident.choices.find((choice) => choice.id === "praise")?.id ||
      incident.choices.find((choice) => choice.id === "support")?.id;
  }
  if (trait === LEADERSHIP_TRAIT.DISCIPLINARIAN) {
    return incident.choices.find((choice) => choice.id === "warn")?.id;
  }
  return incident.choices.find((choice) => ["mediate", "support", "acknowledge", "private_thanks"].includes(choice.id))?.id;
};

export const resolveGuildIncident = ({
  state,
  roster,
  relationships,
  incidentId,
  choiceId,
  resolvedBy,
}: {
  state: GuildRelationsState;
  roster: readonly Character[];
  relationships?: Record<string, unknown> | null;
  incidentId: string;
  choiceId?: string;
  resolvedBy: "player" | "guild_master";
}) => {
  const normalized = normalizeGuildRelationsState(state, roster);
  const incident = normalized.incidents.find((entry) => entry.id === incidentId);
  if (!incident || incident.status === "resolved") {
    return { state: normalized, roster: [...roster], relationships: normalizeGuildRelationships(relationships), incident: null };
  }
  const guildMasterId = Object.entries(normalized.assignments).find(([, rank]) => rank === GUILD_RANK.GUILD_MASTER)?.[0];
  const guildMaster = roster.find((member) => String(member.id) === guildMasterId);
  const leadershipTrait = normalizeLeadershipTrait(guildMaster?.leadershipTrait, guildMaster?.id);
  const selectedChoiceId = choiceId || getAutomaticChoiceId(incident, leadershipTrait) || incident.choices[0]?.id;
  const choice = incident.choices.find((entry) => entry.id === selectedChoiceId) || incident.choices[0];
  if (!choice) {
    return { state: normalized, roster: [...roster], relationships: normalizeGuildRelationships(relationships), incident: null };
  }
  const targetIds =
    choice.target === "guild"
      ? new Set(roster.map((member) => String(member.id)))
      : choice.target === "both"
        ? new Set([incident.actorId, incident.subjectId])
        : new Set([choice.target === "actor" ? incident.actorId : incident.subjectId]);
  const moraleMultiplier =
    leadershipTrait === LEADERSHIP_TRAIT.MOTIVATOR && choice.moraleDelta > 0
      ? 1.4
      : 1;
  const nextRoster = roster.map((member) =>
    targetIds.has(String(member.id))
      ? {
          ...member,
          morale: clamp(
            Math.round((Number(member.morale) || 50) + choice.moraleDelta * moraleMultiplier),
            0,
            100,
          ),
        }
      : member,
  );
  const nextRelationships = { ...(normalizeGuildRelationships(relationships) as Record<string, RelationshipEntry>) };
  const pairKey = getRelationshipPairKey(incident.actorId, incident.subjectId);
  if (pairKey) {
    const current = nextRelationships[pairKey] || {
      memberIds: [incident.actorId, incident.subjectId],
      points: 0,
      events: [],
    };
    const relationshipBonus =
      leadershipTrait === LEADERSHIP_TRAIT.DIPLOMAT && choice.relationshipDelta > 0
        ? 1
        : 0;
    nextRelationships[pairKey] = {
      ...current,
      memberIds: [incident.actorId, incident.subjectId],
      points: clamp(
        Math.floor(Number(current.points) || 0) +
          choice.relationshipDelta +
          relationshipBonus,
        -100,
        100,
      ),
    };
  }
  const resolvedIncident = {
    ...incident,
    status: "resolved" as const,
    resolvedChoiceId: choice.id,
    resolvedBy,
  };
  return {
    incident: resolvedIncident,
    roster: nextRoster,
    relationships: nextRelationships,
    state: {
      ...normalized,
      incidents: normalized.incidents.map((entry) =>
        entry.id === incident.id ? resolvedIncident : entry,
      ),
    },
  };
};

export const resolveExpiredGuildIncidents = ({
  state,
  roster,
  relationships,
  currentDayIndex,
}: {
  state: GuildRelationsState;
  roster: readonly Character[];
  relationships?: Record<string, unknown> | null;
  currentDayIndex: number;
}) => {
  let nextState = normalizeGuildRelationsState(state, roster);
  let nextRoster = [...roster];
  let nextRelationships = normalizeGuildRelationships(relationships);
  const resolvedIncidents: GuildIncident[] = [];
  nextState.incidents
    .filter(
      (incident) =>
        incident.status === "pending" &&
        incident.expiresDayIndex <= currentDayIndex,
    )
    .forEach((incident) => {
      const result = resolveGuildIncident({
        state: nextState,
        roster: nextRoster,
        relationships: nextRelationships,
        incidentId: incident.id,
        resolvedBy: "guild_master",
      });
      nextState = result.state;
      nextRoster = result.roster;
      nextRelationships = result.relationships;
      if (result.incident) resolvedIncidents.push(result.incident);
    });
  return {
    state: nextState,
    roster: nextRoster,
    relationships: nextRelationships,
    resolvedIncidents,
  };
};

export const createGuildElection = ({
  state,
  roster,
  relationships,
  departedGuildMasterId,
  dayIndex,
  previousGameSpeed,
}: {
  state: GuildRelationsState;
  roster: readonly Character[];
  relationships?: Record<string, unknown> | null;
  departedGuildMasterId: string;
  dayIndex: number;
  previousGameSpeed: number;
}) => {
  const normalized = normalizeGuildRelationsState(state, roster);
  if (roster.length === 0) return { ...normalized, election: null };
  const electionAssignments = { ...normalized.assignments };
  Object.entries(electionAssignments).forEach(([id, rank]) => {
    if (rank === GUILD_RANK.GUILD_MASTER || id === departedGuildMasterId) {
      electionAssignments[id] = GUILD_RANK.LEADERSHIP;
    }
  });
  const insights = buildGuildRelationInsights({
    roster,
    relationships,
    relationsState: {
      ...normalized,
      assignments: Object.fromEntries(
        Object.entries(electionAssignments).filter(
          ([id]) => id !== departedGuildMasterId,
        ),
      ),
    },
    currentDayIndex: dayIndex,
  });
  const nonRecruits = insights.filter((row) => row.rank !== GUILD_RANK.RECRUIT);
  const eligible = nonRecruits.length >= 2 ? nonRecruits : insights;
  const candidateIds = eligible
    .slice(0, Math.min(4, Math.max(2, eligible.length)))
    .map((row) => String(row.character.id));
  if (candidateIds.length === 1) {
    return assignGuildRank({
      state: { ...normalized, election: null },
      roster,
      memberId: candidateIds[0],
      rank: GUILD_RANK.GUILD_MASTER,
    });
  }
  const seed = stableHash(`${dayIndex}:${departedGuildMasterId}:${candidateIds.join(":")}`);
  const influenceById = new Map(insights.map((row) => [String(row.character.id), row.influence]));
  const normalizedRelationships = normalizeGuildRelationships(relationships) as Record<string, RelationshipEntry>;
  const memberVotes: Record<string, string> = {};
  roster.forEach((voter) => {
    const voterId = String(voter.id);
    const rankedCandidates = candidateIds
      .map((candidateId) => {
        const relationshipPoints =
          Number(normalizedRelationships[getRelationshipPairKey(voterId, candidateId)]?.points) || 0;
        const candidateRank = normalized.assignments[candidateId] || GUILD_RANK.MEMBER;
        const jitter = (stableHash(`${seed}:${voterId}:${candidateId}`) % 11) - 5;
        return {
          candidateId,
          score:
            relationshipPoints * 0.55 +
            (influenceById.get(candidateId) || 0) * 0.3 +
            RANK_AUTHORITY[candidateRank] * 0.15 +
            (candidateId === voterId ? 15 : 0) +
            jitter,
        };
      })
      .sort((left, right) => right.score - left.score || left.candidateId.localeCompare(right.candidateId));
    memberVotes[voterId] = rankedCandidates[0].candidateId;
  });
  return {
    ...normalized,
    assignments: Object.fromEntries(
      Object.entries(electionAssignments).filter(
        ([id]) => id !== departedGuildMasterId,
      ),
    ),
    election: {
      id: `election-${dayIndex}-${seed}`,
      departedGuildMasterId,
      candidateIds,
      memberVotes,
      playerVoteId: null,
      status: "awaiting_player_vote",
      winnerId: null,
      seed,
      previousGameSpeed,
      createdDayIndex: Math.max(0, Math.floor(dayIndex)),
    },
  };
};

export const castGuildElectionVote = ({
  state,
  roster,
  candidateId,
  insights,
}: {
  state: GuildRelationsState;
  roster: readonly Character[];
  candidateId: string;
  insights: readonly GuildRelationInsight[];
}) => {
  const normalized = normalizeGuildRelationsState(state, roster);
  const election = normalized.election;
  if (
    !election ||
    election.status !== "awaiting_player_vote" ||
    !election.candidateIds.includes(candidateId)
  ) {
    return { state: normalized, roster: [...roster], winnerId: null };
  }
  const memberCounts = election.candidateIds.reduce<Record<string, number>>(
    (counts, id) => ({ ...counts, [id]: 0 }),
    {},
  );
  Object.values(election.memberVotes).forEach((vote) => {
    if (vote in memberCounts) memberCounts[vote] += 1;
  });
  const totalCounts = { ...memberCounts, [candidateId]: memberCounts[candidateId] + 1 };
  const influenceById = new Map(insights.map((row) => [String(row.character.id), row.influence]));
  const winnerId = [...election.candidateIds].sort(
    (left, right) =>
      totalCounts[right] - totalCounts[left] ||
      memberCounts[right] - memberCounts[left] ||
      (influenceById.get(right) || 0) - (influenceById.get(left) || 0) ||
      left.localeCompare(right),
  )[0];
  const assignments = { ...normalized.assignments };
  Object.entries(assignments).forEach(([id, rank]) => {
    if (rank === GUILD_RANK.GUILD_MASTER) assignments[id] = GUILD_RANK.LEADERSHIP;
  });
  assignments[winnerId] = GUILD_RANK.GUILD_MASTER;
  return {
    winnerId,
    roster: roster.map((member) => ({
      ...member,
      morale: clamp((Number(member.morale) || 50) + 5, 0, 100),
    })),
    state: {
      ...normalized,
      assignments,
      election: {
        ...election,
        playerVoteId: candidateId,
        status: "complete",
        winnerId,
      },
    },
  };
};

export const getElectionVoteCounts = (election: GuildElection | null) => {
  if (!election) return {};
  const counts = Object.fromEntries(
    election.candidateIds.map((candidateId) => [candidateId, 0]),
  ) as Record<string, number>;
  Object.values(election.memberVotes).forEach((candidateId) => {
    if (candidateId in counts) counts[candidateId] += 1;
  });
  if (election.playerVoteId && election.playerVoteId in counts) {
    counts[election.playerVoteId] += 1;
  }
  return counts;
};
