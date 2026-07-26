// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import GuildRelationsPage from "../../pages/guild-relations/GuildRelationsPage";
import {
  GUILD_RANK,
  createInitialGuildRelationsState,
  buildGuildRelationInsights,
} from "../../guildRelations/guildRelations";
import type { Character } from "../../types/characterTypes";

const roster: Character[] = [
  {
    id: "leader",
    name: "Leader",
    race: "Human",
    gender: "Male",
    charClass: "Paladin",
    role: "Tank",
    morale: 70,
    leadershipTrait: "diplomat",
  },
  {
    id: "member",
    name: "Member",
    race: "Dwarf",
    gender: "Female",
    charClass: "Priest",
    role: "Healer",
    morale: 50,
    leadershipTrait: "motivator",
  },
  {
    id: "recruit",
    name: "Recruit",
    race: "Human",
    gender: "Female",
    charClass: "Mage",
    role: "DPS",
    morale: 55,
    leadershipTrait: "strategist",
  },
];
const relationships = {
  "leader::member": {
    memberIds: ["leader", "member"],
    points: 25,
  },
};

afterEach(cleanup);

describe("GuildRelationsPage", () => {
  it("renders accessible relations, rank controls and management mode", () => {
    const state = createInitialGuildRelationsState(roster);
    const onSetRank = vi.fn();
    const onSetMode = vi.fn();
    render(
      <GuildRelationsPage
        roster={roster}
        relationships={relationships}
        state={state}
        insights={buildGuildRelationInsights({
          roster,
          relationships,
          relationsState: state,
        })}
        currentDayIndex={0}
        onSelectCharacter={vi.fn()}
        onSetRank={onSetRank}
        onSetRankLabels={() => true}
        onSetManagementMode={onSetMode}
        onResolveIncident={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Guild Relations" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /Leader.*Paladin.*Tank.*level 1.*item level 0\.0/,
      }),
    ).toBeTruthy();
    const leaderCard = screen.getByRole("article", {
      name: "Leader member relations card",
    });
    expect(within(leaderCard).getByText("Popularity")).toBeTruthy();
    expect(within(leaderCard).getAllByText(/\(Rank \d+\)/)).toHaveLength(4);
    expect(screen.getByText(/accessible connection list/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Resolve Yourself" }));
    expect(onSetMode).toHaveBeenCalledWith("manual");

    const memberRank = screen.getByRole("combobox", {
      name: "Rank for Member",
    });
    fireEvent.change(memberRank, { target: { value: GUILD_RANK.OFFICER } });
    expect(onSetRank).toHaveBeenCalledWith("member", GUILD_RANK.OFFICER);
  });

  it("filters rank groups and applies a rank to selected visible members", () => {
    const initialState = createInitialGuildRelationsState(roster);
    const state = {
      ...initialState,
      assignments: {
        ...initialState.assignments,
        recruit: GUILD_RANK.RECRUIT,
      },
    };
    const onSetRank = vi.fn();
    render(
      <GuildRelationsPage
        roster={roster}
        relationships={relationships}
        state={state}
        insights={buildGuildRelationInsights({
          roster,
          relationships,
          relationsState: state,
        })}
        currentDayIndex={0}
        onSelectCharacter={vi.fn()}
        onSetRank={onSetRank}
        onSetRankLabels={() => true}
        onSetManagementMode={vi.fn()}
        onResolveIncident={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Recruits\s*1/ }));
    expect(
      screen.getByRole("checkbox", { name: "Select Recruit" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("checkbox", { name: "Select Member" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Select visible" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Bulk rank" }), {
      target: { value: GUILD_RANK.MEMBER },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Apply rank to 1 selected members",
      }),
    );

    expect(onSetRank).toHaveBeenCalledTimes(1);
    expect(onSetRank).toHaveBeenCalledWith("recruit", GUILD_RANK.MEMBER);
  });

  it("orders member relations by guild hierarchy", () => {
    const initialState = createInitialGuildRelationsState(roster);
    const state = {
      ...initialState,
      assignments: {
        ...initialState.assignments,
        member: GUILD_RANK.OFFICER,
        recruit: GUILD_RANK.RECRUIT,
      },
    };
    const insights = buildGuildRelationInsights({
      roster,
      relationships,
      relationsState: state,
    });

    render(
      <GuildRelationsPage
        roster={roster}
        relationships={relationships}
        state={state}
        insights={[...insights].reverse()}
        currentDayIndex={0}
        onSelectCharacter={vi.fn()}
        onSetRank={vi.fn()}
        onSetRankLabels={() => true}
        onSetManagementMode={vi.fn()}
        onResolveIncident={vi.fn()}
      />,
    );

    expect(
      screen
        .getAllByRole("article", { name: /member relations card$/ })
        .map((card) => card.getAttribute("aria-label")),
    ).toEqual([
      "Leader member relations card",
      "Member member relations card",
      "Recruit member relations card",
    ]);
  });

  it("opens complete focus rankings inline and switches between them", () => {
    const state = createInitialGuildRelationsState(roster);
    render(
      <GuildRelationsPage
        roster={roster}
        relationships={relationships}
        state={state}
        insights={buildGuildRelationInsights({
          roster,
          relationships,
          relationsState: state,
        })}
        currentDayIndex={0}
        onSelectCharacter={vi.fn()}
        onSetRank={vi.fn()}
        onSetRankLabels={() => true}
        onSetManagementMode={vi.fn()}
        onResolveIncident={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "View full Strongest Support ranking",
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Full Strongest Support Ranking",
      }),
    ).toBeTruthy();
    expect(
      within(
        screen.getByRole("list", {
          name: "Full Strongest Support ranking",
        }),
      ).getAllByRole("listitem"),
    ).toHaveLength(roster.length);

    fireEvent.click(
      screen.getByRole("button", {
        name: "View full Most Influence ranking",
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Full Most Influence Ranking",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", {
        name: "Full Strongest Support Ranking",
      }),
    ).toBeNull();
  });
});
