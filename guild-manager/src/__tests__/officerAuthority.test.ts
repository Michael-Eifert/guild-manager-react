import { describe, expect, it } from "vitest";

import {
  GUILD_RANK,
  LEADERSHIP_TRAIT,
  assignGuildRank,
  createInitialGuildRelationsState,
} from "../guildRelations/guildRelations";
import {
  applyOfficerRankAction,
  canOfficerChangeRank,
  expireOfficerActions,
  proposeOfficerAction,
  recordPlayerRankChange,
  validateOfficerAction,
} from "../guildRelations/officerAuthority";
import type { Character } from "../types/characterTypes";

const member = (
  id: string,
  extras: Partial<Character> = {},
): Character => ({
  id,
  name: id,
  level: 40,
  charClass: "Warrior",
  role: "DPS",
  morale: 70,
  activityLevel: 70,
  guildJoinedDayIndex: 0,
  leadershipTrait: LEADERSHIP_TRAIT.STRATEGIST,
  ...extras,
});

const rankedState = (
  roster: Character[],
  ranks: Record<string, string>,
) => {
  const state = createInitialGuildRelationsState(roster);
  Object.entries(ranks).forEach(([id, rank]) => {
    state.assignments[id] = rank as (typeof GUILD_RANK)[keyof typeof GUILD_RANK];
  });
  return state;
};

describe("officer authority", () => {
  it("enforces leadership, officer and class-leader authority", () => {
    const roster = [
      member("gm"),
      member("lead"),
      member("officer"),
      member("warrior-lead"),
      member("warrior-recruit"),
      member("mage-recruit", { charClass: "Mage" }),
      member("member"),
    ];
    const state = rankedState(roster, {
      gm: GUILD_RANK.GUILD_MASTER,
      lead: GUILD_RANK.LEADERSHIP,
      officer: GUILD_RANK.OFFICER,
      "warrior-lead": GUILD_RANK.CLASS_LEADER,
      "warrior-recruit": GUILD_RANK.RECRUIT,
      "mage-recruit": GUILD_RANK.RECRUIT,
      member: GUILD_RANK.MEMBER,
    });

    expect(
      canOfficerChangeRank({
        actor: roster[1],
        target: roster[6],
        currentRank: GUILD_RANK.MEMBER,
        nextRank: GUILD_RANK.CLASS_LEADER,
        state,
      }),
    ).toBe(true);
    expect(
      canOfficerChangeRank({
        actor: roster[2],
        target: roster[6],
        currentRank: GUILD_RANK.MEMBER,
        nextRank: GUILD_RANK.CLASS_LEADER,
        state,
      }),
    ).toBe(false);
    expect(
      canOfficerChangeRank({
        actor: roster[3],
        target: roster[4],
        currentRank: GUILD_RANK.RECRUIT,
        nextRank: GUILD_RANK.MEMBER,
        state,
      }),
    ).toBe(true);
    expect(
      canOfficerChangeRank({
        actor: roster[3],
        target: roster[5],
        currentRank: GUILD_RANK.RECRUIT,
        nextRank: GUILD_RANK.MEMBER,
        state,
      }),
    ).toBe(false);
    expect(
      canOfficerChangeRank({
        actor: roster[1],
        target: roster[2],
        currentRank: GUILD_RANK.OFFICER,
        nextRank: GUILD_RANK.MEMBER,
        state,
      }),
    ).toBe(false);
  });

  it("selects the same free application deterministically and only once per day", () => {
    const roster = [
      member("gm"),
      member("officer", { leadershipTrait: LEADERSHIP_TRAIT.STRATEGIST }),
    ];
    const state = rankedState(roster, {
      gm: GUILD_RANK.GUILD_MASTER,
      officer: GUILD_RANK.OFFICER,
    });
    const applications = [
      member("tank", {
        role: "Tank",
        charClass: "Paladin",
        level: 39,
        activityLevel: 95,
      }),
      member("mage", {
        role: "DPS",
        charClass: "Mage",
        level: 40,
        activityLevel: 80,
      }),
    ].map((candidate, index) => ({
      ...candidate,
      realmApplicationId: `application-${index}`,
      realmPlayerId: candidate.id,
    }));
    const input = {
      state,
      roster,
      applications,
      guildFocus: "Dungeons",
      guildId: "guild",
      maxRoster: 10,
      currentDayIndex: 10,
    };

    const first = proposeOfficerAction(input);
    const repeated = proposeOfficerAction(input);
    expect(first.action).toEqual(repeated.action);
    expect(first.action?.kind).toBe("recruitment");
    expect(first.action?.applicationId).toBe("application-0");
    expect(
      proposeOfficerAction({ ...input, state: first.state }).action,
    ).toBeNull();
  });

  it("requires probation, protects player rank changes, and permits the next valid day", () => {
    const roster = [
      member("gm"),
      member("officer"),
      member("recruit", {
        activityLevel: 95,
        morale: 95,
        history: [{ result: "Success" }],
      }),
    ];
    let state = rankedState(roster, {
      gm: GUILD_RANK.GUILD_MASTER,
      officer: GUILD_RANK.OFFICER,
      recruit: GUILD_RANK.RECRUIT,
    });

    expect(
      proposeOfficerAction({
        state,
        roster,
        maxRoster: 10,
        currentDayIndex: 2,
      }).action,
    ).toBeNull();

    state = recordPlayerRankChange({
      state,
      roster,
      memberId: "recruit",
      currentDayIndex: 3,
    });
    expect(
      proposeOfficerAction({
        state,
        roster,
        maxRoster: 10,
        currentDayIndex: 5,
      }).action,
    ).toBeNull();

    const proposal = proposeOfficerAction({
      state,
      roster,
      maxRoster: 10,
      currentDayIndex: 6,
    });
    expect(proposal.action?.fromRank).toBe(GUILD_RANK.RECRUIT);
    expect(proposal.action?.toRank).toBe(GUILD_RANK.MEMBER);
    expect(
      validateOfficerAction({
        state: proposal.state,
        roster,
        action: proposal.action!,
        maxRoster: 10,
        currentDayIndex: 6,
      }),
    ).toBe(true);
    const applied = applyOfficerRankAction({
      state: proposal.state,
      roster,
      action: proposal.action!,
      currentDayIndex: 6,
    });
    expect(applied.assignments.recruit).toBe(GUILD_RANK.MEMBER);
    expect(applied.officerActions[0].status).toBe("applied");
    expect(applied.rankChangedDayByMemberId.recruit).toBe(6);
  });

  it("expires proposals after three guild days and revalidates applications", () => {
    const roster = [member("gm"), member("officer")];
    const state = rankedState(roster, {
      gm: GUILD_RANK.GUILD_MASTER,
      officer: GUILD_RANK.OFFICER,
    });
    const applications = [
      {
        ...member("applicant", { role: "Tank", activityLevel: 100 }),
        realmApplicationId: "application",
        realmPlayerId: "applicant",
      },
    ];
    const proposed = proposeOfficerAction({
      state,
      roster,
      applications,
      maxRoster: 10,
      currentDayIndex: 4,
    });
    expect(proposed.action).not.toBeNull();
    expect(
      validateOfficerAction({
        state: proposed.state,
        roster,
        applications: [],
        action: proposed.action!,
        maxRoster: 10,
        currentDayIndex: 5,
      }),
    ).toBe(false);
    const expired = expireOfficerActions({
      state: proposed.state,
      roster,
      currentDayIndex: 7,
    });
    expect(expired.officerActions[0].status).toBe("expired");
  });

  it("keeps one class leader per class", () => {
    const roster = [member("gm"), member("one"), member("two")];
    let state = createInitialGuildRelationsState(roster);
    state = assignGuildRank({
      state,
      roster,
      memberId: "one",
      rank: GUILD_RANK.CLASS_LEADER,
    });
    state = assignGuildRank({
      state,
      roster,
      memberId: "two",
      rank: GUILD_RANK.CLASS_LEADER,
    });
    expect(state.assignments.one).toBe(GUILD_RANK.CLASS_LEADER);
    expect(state.assignments.two).toBe(GUILD_RANK.MEMBER);
  });
});
