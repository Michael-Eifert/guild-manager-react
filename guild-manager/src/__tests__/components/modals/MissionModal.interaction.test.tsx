// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import MissionModal from "../../../components/modals/MissionModal";
import {
  GUILD_FACTION,
  missionList,
  roster,
} from "../componentTestUtils";

describe("MissionModal page interactions", () => {
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
