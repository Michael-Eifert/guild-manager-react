// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DetailModal from "../../../components/modals/DetailModal";
import { GUILD_FACTION } from "../../../constants";
import {
  GUILD_RANK,
  buildGuildRelationInsights,
  createInitialGuildRelationsState,
} from "../../../guildRelations/guildRelations";
import {
  missionList,
  roster,
} from "../componentTestUtils";

afterEach(cleanup);

describe("DetailModal guild tab", () => {
  it("shows guild standing and allows changing a member rank", () => {
    const state = createInitialGuildRelationsState(roster);
    const relationships = {
      "hero-1::hero-2": {
        memberIds: ["hero-1", "hero-2"],
        points: 18,
      },
    };
    const insights = buildGuildRelationInsights({
      roster,
      relationships,
      relationsState: state,
    });
    const onSetGuildRank = vi.fn();

    render(
      <DetailModal
        isOpen
        char={roster[1]}
        missionAchievementCatalog={missionList}
        missionList={missionList}
        itemDatabase={[]}
        roster={roster}
        guildFaction={GUILD_FACTION.ALLIANCE}
        guildRelationships={relationships}
        guildRelationsState={state}
        guildRelationInsights={insights}
        raidLockouts={{}}
        currentDayIndex={0}
        onClose={vi.fn()}
        onDismiss={vi.fn()}
        onLevelChange={vi.fn()}
        onRoleChange={vi.fn()}
        onProfChange={vi.fn()}
        onModeChange={vi.fn()}
        onSetGuildRank={onSetGuildRank}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guild" }));

    expect(screen.getByText("Guild Standing")).toBeTruthy();
    expect(
      screen.getByRole("region", {
        name: `${roster[1].name} guild relation scores`,
      }),
    ).toBeTruthy();
    expect(screen.getByText("+18 positive")).toBeTruthy();

    fireEvent.change(
      screen.getByRole("combobox", {
        name: `Guild rank for ${roster[1].name}`,
      }),
      { target: { value: GUILD_RANK.OFFICER } },
    );
    expect(onSetGuildRank).toHaveBeenCalledWith(
      roster[1].id,
      GUILD_RANK.OFFICER,
    );
  });
});
