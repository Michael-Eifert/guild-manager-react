import React from "react";
import { describe, expect, it } from "vitest";

import MissionModal from "../../../components/modals/MissionModal";
import {
  GUILD_FACTION,
  missionList,
  noop,
  render,
  roster,
} from "../componentTestUtils";

describe("MissionModal", () => {
  it("renders as a page with mission categories", () => {
    const html = render(
      <MissionModal
        isOpen
        variant="page"
        onClose={noop}
        onBack={noop}
        roster={roster}
        missionList={missionList}
        activeMissions={[]}
        onDeploy={noop}
        guildFaction={GUILD_FACTION.ALLIANCE}
        isRaidUnlocked
      />,
    );

    expect(html).toContain("Mission Board");
    expect(html).toContain("Available Dungeons");
    expect(html).toContain("The Deadmines");
  });
});
