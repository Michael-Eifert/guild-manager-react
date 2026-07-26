import { describe, expect, it } from "vitest";

import {
  GUILD_RANK,
  LEADERSHIP_TRAIT,
  assignGuildRank,
  buildGuildRelationInsights,
  castGuildElectionVote,
  createGuildElection,
  createGuildIncident,
  createInitialGuildRelationsState,
  normalizeGuildRelationsState,
  resolveGuildIncident,
  validateGuildRankLabels,
} from "../guildRelations/guildRelations";
import {
  buildFounderRoster,
  getRemainingStarterRolePlan,
} from "../guildRelations/founderCreation";
import { GUILD_FACTION } from "../constants";
import type { Character } from "../types/characterTypes";

const member = (
  id: string,
  extras: Partial<Character> = {},
): Character => ({
  id,
  name: id.toUpperCase(),
  charClass: "Warrior",
  race: "Human",
  gender: "Male",
  role: "DPS",
  morale: 50,
  leadershipTrait: LEADERSHIP_TRAIT.STRATEGIST,
  ...extras,
});

describe("guild relations domain", () => {
  it("keeps exactly one Guild Master during direct transfers", () => {
    const roster = [member("a"), member("b"), member("c")];
    const initial = createInitialGuildRelationsState(roster);
    const transferred = assignGuildRank({
      state: initial,
      roster,
      memberId: "b",
      rank: GUILD_RANK.GUILD_MASTER,
    });

    expect(transferred.assignments.b).toBe(GUILD_RANK.GUILD_MASTER);
    expect(transferred.assignments.a).toBe(GUILD_RANK.LEADERSHIP);
    expect(
      Object.values(transferred.assignments).filter(
        (rank) => rank === GUILD_RANK.GUILD_MASTER,
      ),
    ).toHaveLength(1);
  });

  it("rejects duplicate and overly long global rank labels", () => {
    const state = createInitialGuildRelationsState([member("a")]);
    expect(validateGuildRankLabels(state.rankLabels)).toBe("");
    expect(
      validateGuildRankLabels({
        ...state.rankLabels,
        [GUILD_RANK.MEMBER]: state.rankLabels[GUILD_RANK.RECRUIT],
      }),
    ).toMatch(/unique/i);
  });

  it("derives support, influence and friction from shared statistics", () => {
    const roster = [
      member("a", {
        history: [{ result: "Success" }] as never,
      }),
      member("b"),
      member("c"),
    ];
    const state = createInitialGuildRelationsState(roster);
    const insights = buildGuildRelationInsights({
      roster,
      relationships: {
        "a::b": { memberIds: ["a", "b"], points: 40 },
        "a::c": { memberIds: ["a", "c"], points: -30 },
      },
      relationsState: state,
    });
    const leader = insights.find((entry) => entry.character.id === "a");
    const quietMember = insights.find((entry) => entry.character.id === "b");

    expect(leader?.influence).toBeGreaterThan(quietMember?.influence || 0);
    expect(leader?.support).toBeGreaterThan(0);
    expect(leader?.friction).toBeGreaterThan(0);
  });

  it("creates at most one incident per day and resolves it only once", () => {
    const roster = [
      member("a", { leadershipTrait: LEADERSHIP_TRAIT.DIPLOMAT }),
      member("b"),
    ];
    const initial = createInitialGuildRelationsState(roster);
    const created = createGuildIncident({
      state: initial,
      roster,
      relationships: {},
      dayIndex: 3,
      missionSucceeded: false,
      missionMemberIds: ["a", "b"],
    });
    const duplicate = createGuildIncident({
      state: created.state,
      roster,
      relationships: {},
      dayIndex: 3,
    });
    expect(created.incident?.kind).toBe("blame");
    expect(duplicate.incident).toBeNull();

    const resolved = resolveGuildIncident({
      state: created.state,
      roster,
      relationships: {},
      incidentId: created.incident!.id,
      choiceId: "mediate",
      resolvedBy: "player",
    });
    const repeated = resolveGuildIncident({
      state: resolved.state,
      roster: resolved.roster,
      relationships: resolved.relationships,
      incidentId: created.incident!.id,
      choiceId: "mediate",
      resolvedBy: "player",
    });
    expect(resolved.state.incidents[0].status).toBe("resolved");
    expect(
      (repeated.relationships as Record<string, { points: number }>)["a::b"]
        .points,
    ).toBe(
      (resolved.relationships as Record<string, { points: number }>)["a::b"]
        .points,
    );
    expect(repeated.roster).toEqual(resolved.roster);
  });

  it("persists deterministic election ballots and adds the player vote", () => {
    const roster = [member("b"), member("c"), member("d"), member("e")];
    const priorRoster = [member("a"), ...roster];
    const initial = createInitialGuildRelationsState(priorRoster);
    const electionState = createGuildElection({
      state: initial,
      roster,
      relationships: {
        "b::c": { memberIds: ["b", "c"], points: 25 },
      },
      departedGuildMasterId: "a",
      dayIndex: 8,
      previousGameSpeed: 2,
    });
    expect(electionState.election?.candidateIds.length).toBeGreaterThanOrEqual(2);

    const reloaded = normalizeGuildRelationsState(electionState, roster);
    expect(reloaded.election?.memberVotes).toEqual(
      electionState.election?.memberVotes,
    );
    const insights = buildGuildRelationInsights({
      roster,
      relationships: {},
      relationsState: electionState,
    });
    const result = castGuildElectionVote({
      state: electionState,
      roster,
      candidateId: electionState.election!.candidateIds[0],
      insights,
    });
    expect(result.state.election?.status).toBe("complete");
    expect(result.state.election?.playerVoteId).toBe(
      electionState.election!.candidateIds[0],
    );
    expect(result.roster.every((character) => character.morale === 55)).toBe(
      true,
    );
  });
});

describe("founder creation", () => {
  it.each(["Tank", "Healer", "DPS"] as const)(
    "builds a balanced starter party when the founder is %s",
    (role) => {
      const roster = buildFounderRoster({
        faction: GUILD_FACTION.ALLIANCE,
        founder: {
          name: "Aldric",
          race: "Human",
          gender: "Male",
          charClass: role === "Healer" ? "Paladin" : "Warrior",
          role,
          personalityTrait: "dungeon_expert",
          leadershipTrait: LEADERSHIP_TRAIT.DIPLOMAT,
        },
      });
      const roles = roster.map((character) => character.role);
      expect(roster).toHaveLength(5);
      expect(roles.filter((entry) => entry === "Tank")).toHaveLength(1);
      expect(roles.filter((entry) => entry === "Healer")).toHaveLength(1);
      expect(roles.filter((entry) => entry === "DPS")).toHaveLength(3);
      expect(roster[0]).toMatchObject({
        name: "Aldric",
        role,
        leadershipTrait: LEADERSHIP_TRAIT.DIPLOMAT,
      });
    },
  );

  it("subtracts the founder role from the standard five-player plan", () => {
    expect(getRemainingStarterRolePlan("Tank")).toEqual([
      "Healer",
      "DPS",
      "DPS",
      "DPS",
    ]);
  });
});
