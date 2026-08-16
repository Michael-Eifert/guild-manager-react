import type { Character } from "../types/characterTypes";
import {
  GUILD_RANK,
  LEADERSHIP_TRAIT,
  assignGuildRank,
  buildGuildRelationInsights,
  normalizeGuildRelationsState,
  normalizeLeadershipTrait,
  type GuildRankId,
  type GuildRelationsState,
  type OfficerAction,
  type OfficerActionStatus,
} from "./guildRelations";

export const OFFICER_ACTION_COOLDOWN_DAYS = 3;
export const OFFICER_PROPOSAL_LIFETIME_DAYS = 3;

type OfficerApplicationCandidate = Character & {
  realmApplicationId?: string | null;
  realmPlayerId?: string | null;
};

type OfficerDecisionInput = {
  state: GuildRelationsState;
  roster: readonly Character[];
  relationships?: Record<string, unknown> | null;
  applications?: readonly OfficerApplicationCandidate[];
  guildFocus?: string;
  guildId?: string;
  maxRoster: number;
  currentDayIndex: number;
};

type OfficerPermission = {
  canRecruit: boolean;
  rank: GuildRankId;
  summary: string;
};

const RANK_AUTHORITY: Readonly<Partial<Record<GuildRankId, number>>> = {
  [GUILD_RANK.LEADERSHIP]: 80,
  [GUILD_RANK.OFFICER]: 65,
  [GUILD_RANK.CLASS_LEADER]: 55,
};

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

const getCharacterClass = (character?: Character | null) =>
  String(
    character?.charClass || character?.className || character?.class || "",
  ).trim();

const getCharacterId = (character?: Character | null) =>
  String(character?.id || "").trim();

const getCharacterName = (character?: Character | null) =>
  String(character?.name || "Unknown").trim() || "Unknown";

const getCharacterActivity = (character?: Character | null) =>
  clamp(
    Number.isFinite(Number(character?.activityLevel))
      ? Number(character?.activityLevel)
      : 50,
    1,
    100,
  );

const getCharacterMorale = (character?: Character | null) =>
  clamp(
    Number.isFinite(Number(character?.morale))
      ? Number(character?.morale)
      : 50,
    0,
    100,
  );

const getJoinedDay = (character?: Character | null) =>
  Math.max(0, Math.floor(Number(character?.guildJoinedDayIndex) || 0));

const getPersonalityTraits = (character?: Character | null) =>
  (Array.isArray(character?.personalityTraits)
    ? character.personalityTraits
    : character?.personalityTrait
      ? [character.personalityTrait]
      : []
  )
    .map((trait) =>
      typeof trait === "string" ? trait : String(trait?.id || ""),
    )
    .filter(Boolean);

export const getOfficerPermission = (
  rank: GuildRankId,
): OfficerPermission | null => {
  if (rank === GUILD_RANK.LEADERSHIP) {
    return {
      rank,
      canRecruit: true,
      summary: "Accept applications and manage ranks through Class Leader.",
    };
  }
  if (rank === GUILD_RANK.OFFICER) {
    return {
      rank,
      canRecruit: true,
      summary: "Accept applications and manage Recruit and Member ranks.",
    };
  }
  if (rank === GUILD_RANK.CLASS_LEADER) {
    return {
      rank,
      canRecruit: false,
      summary: "Manage Recruit and Member ranks within their own class.",
    };
  }
  return null;
};

export const getEligibleOfficerActors = ({
  roster,
  state,
}: {
  roster: readonly Character[];
  state: GuildRelationsState;
}) => {
  const normalized = normalizeGuildRelationsState(state, roster);
  return roster.filter((member) =>
    Boolean(getOfficerPermission(normalized.assignments[getCharacterId(member)])),
  );
};

export const canOfficerChangeRank = ({
  actor,
  target,
  currentRank,
  nextRank,
  state,
}: {
  actor: Character;
  target: Character;
  currentRank: GuildRankId;
  nextRank: GuildRankId;
  state: GuildRelationsState;
}) => {
  const actorRank = state.assignments[getCharacterId(actor)];
  if (!getOfficerPermission(actorRank) || getCharacterId(actor) === getCharacterId(target)) {
    return false;
  }
  if (
    currentRank === GUILD_RANK.GUILD_MASTER ||
    currentRank === GUILD_RANK.LEADERSHIP ||
    currentRank === GUILD_RANK.OFFICER ||
    nextRank === GUILD_RANK.GUILD_MASTER ||
    nextRank === GUILD_RANK.LEADERSHIP ||
    nextRank === GUILD_RANK.OFFICER
  ) {
    return false;
  }
  if (actorRank === GUILD_RANK.LEADERSHIP) {
    return (
      (currentRank === GUILD_RANK.RECRUIT && nextRank === GUILD_RANK.MEMBER) ||
      (currentRank === GUILD_RANK.MEMBER &&
        (nextRank === GUILD_RANK.RECRUIT ||
          nextRank === GUILD_RANK.CLASS_LEADER)) ||
      (currentRank === GUILD_RANK.CLASS_LEADER &&
        nextRank === GUILD_RANK.MEMBER)
    );
  }
  const isBasicTransition =
    (currentRank === GUILD_RANK.RECRUIT && nextRank === GUILD_RANK.MEMBER) ||
    (currentRank === GUILD_RANK.MEMBER && nextRank === GUILD_RANK.RECRUIT);
  if (!isBasicTransition) return false;
  return actorRank !== GUILD_RANK.CLASS_LEADER ||
    getCharacterClass(actor) === getCharacterClass(target);
};

const hasRankCooldown = (
  state: GuildRelationsState,
  memberId: string,
  currentDayIndex: number,
) => {
  const changedDay = state.rankChangedDayByMemberId[memberId];
  return (
    Number.isFinite(Number(changedDay)) &&
    currentDayIndex - Number(changedDay) < OFFICER_ACTION_COOLDOWN_DAYS
  );
};

const getActorTraitBonus = ({
  actor,
  kind,
  target,
}: {
  actor: Character;
  kind: OfficerAction["kind"];
  target: Character;
}) => {
  const trait = normalizeLeadershipTrait(actor.leadershipTrait, actor.id);
  if (trait === LEADERSHIP_TRAIT.STRATEGIST) {
    return target.role === "Tank" || target.role === "Healer" ? 8 : 4;
  }
  if (trait === LEADERSHIP_TRAIT.MOTIVATOR) {
    return kind === "rank_change" && getCharacterMorale(target) >= 45 ? 7 : 3;
  }
  if (trait === LEADERSHIP_TRAIT.DIPLOMAT) {
    return kind === "rank_change" ? 6 : 4;
  }
  if (trait === LEADERSHIP_TRAIT.DISCIPLINARIAN) {
    return getCharacterActivity(target) >= 65 ? 7 : 2;
  }
  return 0;
};

const getRoleNeedScore = (candidate: Character, roster: readonly Character[]) => {
  const total = Math.max(1, roster.length);
  const counts = roster.reduce<Record<string, number>>((result, member) => {
    const role = String(member.role || "DPS");
    result[role] = (result[role] || 0) + 1;
    return result;
  }, {});
  const desiredShare = candidate.role === "Tank" || candidate.role === "Healer" ? 0.2 : 0.6;
  const currentShare = (counts[String(candidate.role || "DPS")] || 0) / total;
  return currentShare < desiredShare ? 25 : 10;
};

const getFocusFitScore = (candidate: Character, guildFocus?: string) => {
  const traits = getPersonalityTraits(candidate);
  const preferred =
    guildFocus === "Dungeons"
      ? ["dungeon_expert", "raider"]
      : guildFocus === "Social"
        ? ["casual_gamer"]
        : ["power_leveler"];
  return traits.some((trait) => preferred.includes(trait)) ? 20 : 6;
};

const buildRecruitmentCandidates = ({
  actors,
  applications,
  roster,
  guildFocus,
  guildId,
  currentDayIndex,
  pendingApplicationIds,
}: {
  actors: Character[];
  applications: readonly OfficerApplicationCandidate[];
  roster: readonly Character[];
  guildFocus?: string;
  guildId?: string;
  currentDayIndex: number;
  pendingApplicationIds: Set<string>;
}) => {
  const averageLevel =
    roster.length > 0
      ? roster.reduce((sum, member) => sum + (Number(member.level) || 1), 0) /
        roster.length
      : 1;
  const classSet = new Set(roster.map(getCharacterClass).filter(Boolean));
  return actors.flatMap((actor) => {
    const actorRank = String(
      (actor as Character & { guildRank?: string }).guildRank || "",
    ) as GuildRankId;
    if (!getOfficerPermission(actorRank)?.canRecruit) return [];
    return applications
      .filter((candidate) => {
        const applicationId = String(candidate.realmApplicationId || "");
        return applicationId && !pendingApplicationIds.has(applicationId);
      })
      .map((candidate) => {
        const roleNeed = getRoleNeedScore(candidate, roster);
        const focusFit = getFocusFitScore(candidate, guildFocus);
        const activity = Math.round(getCharacterActivity(candidate) * 0.2);
        const levelFit = Math.max(
          2,
          Math.round(15 - Math.abs((Number(candidate.level) || 1) - averageLevel) * 0.5),
        );
        const classNeed = classSet.has(getCharacterClass(candidate)) ? 2 : 10;
        const traitBonus = getActorTraitBonus({
          actor,
          kind: "recruitment",
          target: candidate,
        });
        const score = roleNeed + focusFit + activity + levelFit + classNeed + traitBonus;
        const reasons = [
          roleNeed >= 20 ? `fills a needed ${candidate.role || "DPS"} slot` : "supports roster depth",
          focusFit >= 20 ? `fits the ${guildFocus || "Leveling"} focus` : "offers a workable guild fit",
          activity >= 13 ? "shows high activity" : "has steady availability",
        ];
        return {
          action: {
            id: `officer:${currentDayIndex}:recruitment:${stableHash(`${guildId}:${actor.id}:${candidate.id}`)}`,
            kind: "recruitment" as const,
            status: "pending" as const,
            actorId: getCharacterId(actor),
            actorName: getCharacterName(actor),
            targetId: getCharacterId(candidate),
            targetName: getCharacterName(candidate),
            applicationId: String(candidate.realmApplicationId || ""),
            reasons,
            score,
            createdDayIndex: currentDayIndex,
            expiresDayIndex: currentDayIndex + OFFICER_PROPOSAL_LIFETIME_DAYS,
          },
          tie: stableHash(`${guildId}:${currentDayIndex}:${actor.id}:${candidate.id}:recruitment`),
        };
      })
      .filter(({ action }) => action.score >= 55);
  });
};

const buildRankCandidates = ({
  actors,
  roster,
  state,
  relationships,
  currentDayIndex,
  guildId,
  pendingTargetIds,
}: {
  actors: Character[];
  roster: readonly Character[];
  state: GuildRelationsState;
  relationships?: Record<string, unknown> | null;
  currentDayIndex: number;
  guildId?: string;
  pendingTargetIds: Set<string>;
}) => {
  const insightById = new Map(
    buildGuildRelationInsights({
      roster,
      relationships,
      relationsState: state,
      currentDayIndex,
    }).map((insight) => [getCharacterId(insight.character), insight]),
  );
  const classLeaderClasses = new Set(
    roster
      .filter(
        (member) =>
          state.assignments[getCharacterId(member)] === GUILD_RANK.CLASS_LEADER,
      )
      .map(getCharacterClass)
      .filter(Boolean),
  );

  return actors.flatMap((actor) =>
    roster.flatMap((target) => {
      const targetId = getCharacterId(target);
      const currentRank = state.assignments[targetId] || GUILD_RANK.MEMBER;
      if (
        !targetId ||
        pendingTargetIds.has(targetId) ||
        hasRankCooldown(state, targetId, currentDayIndex)
      ) {
        return [];
      }
      const insight = insightById.get(targetId);
      if (!insight) return [];
      const tenure = currentDayIndex - getJoinedDay(target);
      const activity = getCharacterActivity(target);
      const morale = getCharacterMorale(target);
      const candidates: Array<{ nextRank: GuildRankId; score: number; reasons: string[] }> = [];

      if (currentRank === GUILD_RANK.RECRUIT && tenure >= 3) {
        const score = Math.round(
          25 + activity * 0.2 + morale * 0.15 + insight.impact * 0.15 +
            insight.support * 0.15 - insight.friction * 0.2,
        );
        if (activity >= 40 && morale >= 40 && insight.friction < 55 && score >= 58) {
          candidates.push({
            nextRank: GUILD_RANK.MEMBER,
            score,
            reasons: ["completed the recruit probation", "shows reliable activity", "maintains healthy guild standing"],
          });
        }
      }

      const negativeSignals = [
        activity < 30 ? "very low activity" : null,
        morale < 30 ? "low morale" : null,
        insight.friction >= 65 ? "high guild friction" : null,
        insight.impact <= 10 && tenure >= 14 ? "little recent contribution" : null,
      ].filter((reason): reason is string => Boolean(reason));

      if (currentRank === GUILD_RANK.MEMBER && tenure >= 7 && negativeSignals.length >= 2) {
        candidates.push({
          nextRank: GUILD_RANK.RECRUIT,
          score: Math.round(
            50 + negativeSignals.length * 12 + insight.friction * 0.15 +
              (100 - morale) * 0.1 + (100 - activity) * 0.1,
          ),
          reasons: negativeSignals.slice(0, 3),
        });
      }

      if (
        currentRank === GUILD_RANK.MEMBER &&
        tenure >= 14 &&
        !classLeaderClasses.has(getCharacterClass(target))
      ) {
        const score = Math.round(
          20 + activity * 0.15 + morale * 0.1 + insight.impact * 0.25 +
            insight.support * 0.25 + insight.influence * 0.15 - insight.friction * 0.2,
        );
        if (
          insight.support >= 60 &&
          insight.influence >= 60 &&
          insight.friction <= 35 &&
          score >= 70
        ) {
          candidates.push({
            nextRank: GUILD_RANK.CLASS_LEADER,
            score,
            reasons: ["leads their class by example", "has strong member support", "shows high guild influence"],
          });
        }
      }

      if (
        currentRank === GUILD_RANK.CLASS_LEADER &&
        tenure >= 14 &&
        negativeSignals.length >= 2
      ) {
        candidates.push({
          nextRank: GUILD_RANK.MEMBER,
          score: Math.round(55 + negativeSignals.length * 12 + insight.friction * 0.2),
          reasons: negativeSignals.slice(0, 3),
        });
      }

      return candidates
        .filter(({ nextRank }) =>
          canOfficerChangeRank({
            actor,
            target,
            currentRank,
            nextRank,
            state,
          }),
        )
        .map(({ nextRank, score, reasons }) => {
          const traitBonus = getActorTraitBonus({
            actor,
            kind: "rank_change",
            target,
          });
          const authorityBonus = Math.round(
            Number(RANK_AUTHORITY[state.assignments[getCharacterId(actor)]]) / 20,
          );
          const finalScore = score + traitBonus + authorityBonus;
          return {
            action: {
              id: `officer:${currentDayIndex}:rank:${stableHash(`${guildId}:${actor.id}:${target.id}:${nextRank}`)}`,
              kind: "rank_change" as const,
              status: "pending" as const,
              actorId: getCharacterId(actor),
              actorName: getCharacterName(actor),
              targetId,
              targetName: getCharacterName(target),
              fromRank: currentRank,
              toRank: nextRank,
              reasons,
              score: finalScore,
              createdDayIndex: currentDayIndex,
              expiresDayIndex: currentDayIndex + OFFICER_PROPOSAL_LIFETIME_DAYS,
            },
            tie: stableHash(`${guildId}:${currentDayIndex}:${actor.id}:${target.id}:${nextRank}`),
          };
        });
    }),
  );
};

export const expireOfficerActions = ({
  state,
  roster,
  currentDayIndex,
}: {
  state: GuildRelationsState;
  roster: readonly Character[];
  currentDayIndex: number;
}) => {
  const normalized = normalizeGuildRelationsState(state, roster);
  return {
    ...normalized,
    officerActions: normalized.officerActions.map((action) =>
      action.status === "pending" && action.expiresDayIndex <= currentDayIndex
        ? {
            ...action,
            status: "expired" as const,
            resolvedDayIndex: currentDayIndex,
          }
        : action,
    ),
  };
};

export const proposeOfficerAction = (input: OfficerDecisionInput) => {
  const currentDayIndex = Math.max(0, Math.floor(input.currentDayIndex));
  const state = expireOfficerActions({
    state: input.state,
    roster: input.roster,
    currentDayIndex,
  });
  if (state.lastOfficerActionDayIndex >= currentDayIndex) {
    return { state, action: null };
  }
  const actors = getEligibleOfficerActors({ roster: input.roster, state }).map(
    (actor) => ({
      ...actor,
      guildRank: state.assignments[getCharacterId(actor)],
    }),
  );
  if (actors.length === 0) return { state, action: null };

  const pendingTargetIds = new Set(
    state.officerActions
      .filter((action) => action.status === "pending")
      .map((action) => action.targetId),
  );
  const pendingApplicationIds = new Set(
    state.officerActions
      .filter(
        (action) => action.status === "pending" && action.applicationId,
      )
      .map((action) => String(action.applicationId)),
  );
  const candidates = [
    ...(input.roster.length < input.maxRoster
      ? buildRecruitmentCandidates({
          actors,
          applications: input.applications || [],
          roster: input.roster,
          guildFocus: input.guildFocus,
          guildId: input.guildId,
          currentDayIndex,
          pendingApplicationIds,
        })
      : []),
    ...buildRankCandidates({
      actors,
      roster: input.roster,
      state,
      relationships: input.relationships,
      currentDayIndex,
      guildId: input.guildId,
      pendingTargetIds,
    }),
  ].sort(
    (left, right) =>
      right.action.score - left.action.score || left.tie - right.tie,
  );
  const action = candidates[0]?.action || null;
  if (!action) return { state, action: null };
  return {
    action,
    state: {
      ...state,
      lastOfficerActionDayIndex: currentDayIndex,
      officerActions: [action, ...state.officerActions].slice(0, 100),
      sequence: state.sequence + 1,
    },
  };
};

export const validateOfficerAction = ({
  state,
  roster,
  applications = [],
  action,
  maxRoster,
  currentDayIndex,
}: {
  state: GuildRelationsState;
  roster: readonly Character[];
  applications?: readonly OfficerApplicationCandidate[];
  action: OfficerAction;
  maxRoster: number;
  currentDayIndex: number;
}) => {
  if (action.status !== "pending" || action.expiresDayIndex <= currentDayIndex) {
    return false;
  }
  const actor = roster.find((member) => getCharacterId(member) === action.actorId);
  if (!actor || !getOfficerPermission(state.assignments[action.actorId])) return false;
  if (action.kind === "recruitment") {
    return (
      roster.length < maxRoster &&
      getOfficerPermission(state.assignments[action.actorId])?.canRecruit === true &&
      applications.some(
        (candidate) =>
          String(candidate.realmApplicationId || "") === action.applicationId &&
          getCharacterId(candidate) === action.targetId,
      )
    );
  }
  const target = roster.find((member) => getCharacterId(member) === action.targetId);
  if (!target || !action.fromRank || !action.toRank) return false;
  if (state.assignments[action.targetId] !== action.fromRank) return false;
  if (hasRankCooldown(state, action.targetId, currentDayIndex)) return false;
  if (
    action.toRank === GUILD_RANK.CLASS_LEADER &&
    roster.some(
      (member) =>
        getCharacterId(member) !== action.targetId &&
        state.assignments[getCharacterId(member)] === GUILD_RANK.CLASS_LEADER &&
        getCharacterClass(member) === getCharacterClass(target),
    )
  ) {
    return false;
  }
  return canOfficerChangeRank({
    actor,
    target,
    currentRank: action.fromRank,
    nextRank: action.toRank,
    state,
  });
};

export const resolveOfficerActionStatus = ({
  state,
  roster,
  actionId,
  status,
  currentDayIndex,
}: {
  state: GuildRelationsState;
  roster: readonly Character[];
  actionId: string;
  status: Exclude<OfficerActionStatus, "pending">;
  currentDayIndex: number;
}) => {
  const normalized = normalizeGuildRelationsState(state, roster);
  return {
    ...normalized,
    officerActions: normalized.officerActions.map((action) =>
      action.id === actionId && action.status === "pending"
        ? { ...action, status, resolvedDayIndex: currentDayIndex }
        : action,
    ),
  };
};

export const applyOfficerRankAction = ({
  state,
  roster,
  action,
  currentDayIndex,
}: {
  state: GuildRelationsState;
  roster: readonly Character[];
  action: OfficerAction;
  currentDayIndex: number;
}) => {
  if (!action.toRank) return state;
  const ranked = assignGuildRank({
    state,
    roster,
    memberId: action.targetId,
    rank: action.toRank,
  });
  const resolved = resolveOfficerActionStatus({
    state: ranked,
    roster,
    actionId: action.id,
    status: "applied",
    currentDayIndex,
  });
  return {
    ...resolved,
    rankChangedDayByMemberId: {
      ...resolved.rankChangedDayByMemberId,
      [action.targetId]: currentDayIndex,
    },
  };
};

export const recordPlayerRankChange = ({
  state,
  roster,
  memberId,
  currentDayIndex,
}: {
  state: GuildRelationsState;
  roster: readonly Character[];
  memberId: string;
  currentDayIndex: number;
}) => {
  const normalized = normalizeGuildRelationsState(state, roster);
  return {
    ...normalized,
    rankChangedDayByMemberId: {
      ...normalized.rankChangedDayByMemberId,
      [memberId]: currentDayIndex,
    },
  };
};
