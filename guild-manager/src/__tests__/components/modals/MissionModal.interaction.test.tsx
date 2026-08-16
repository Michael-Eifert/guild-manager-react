// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import MissionModal from "../../../components/modals/MissionModal";
import {
  GUILD_FACTION,
  missionList,
  roster,
} from "../componentTestUtils";

afterEach(cleanup);

describe("MissionModal page interactions", () => {
  it("previews category coverage, the cap, and expected wipe costs", async () => {
    const user = userEvent.setup();
    render(
      <MissionModal
        isOpen
        variant="page"
        roster={roster}
        missionList={missionList.map((mission) => mission.id === "deadmines" ? { ...mission, payoutGold: 100 } : mission)}
        activeMissions={[]}
        onDeploy={vi.fn(() => true)}
        guildFaction={GUILD_FACTION.ALLIANCE}
        guildInventory={{ items: { healing_potion: 4, elixir_of_fortitude: 4, roasted_boar_meat: 4 } }}
        isRaidUnlocked
      />,
    );

    await user.click(screen.getByText("The Deadmines"));
    await user.click(screen.getByRole("button", { name: "Auto-Select" }));
    await user.click(screen.getByRole("button", { name: "Best Available" }));

    expect(screen.getByText("Run Preparation")).toBeTruthy();
    expect(screen.getByText(/Total: \+\d+(?:\.\d+)?% \/ \+15% cap/)).toBeTruthy();
    expect(screen.getByText(/Expected wipe cost: 10g/)).toBeTruthy();
    expect(screen.getAllByText(/Stash \d+ · Eligible \d+/).length).toBeGreaterThan(0);
  });

  it("returns to the mission list after a successful deployment", async () => {
    const user = userEvent.setup();
    const onDeploy = vi.fn(() => true);

    render(
      <MissionModal
        isOpen
        variant="page"
        roster={roster}
        missionList={missionList}
        activeMissions={[]}
        onDeploy={onDeploy}
        guildFaction={GUILD_FACTION.ALLIANCE}
        isRaidUnlocked
      />,
    );

    await user.click(screen.getByText("The Deadmines"));
    await user.click(screen.getByRole("button", { name: "Auto-Select" }));
    await user.click(screen.getByRole("button", { name: "Deploy" }));

    expect(onDeploy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Deploy" })).toBeNull();
    expect(screen.getByText("Available Dungeons")).toBeTruthy();
  });
});
