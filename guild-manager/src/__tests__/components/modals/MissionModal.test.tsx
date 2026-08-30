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
  it("shows only missions for the selected faction", () => {
    const html = render(
      <MissionModal
        isOpen
        variant="page"
        onBack={noop}
        roster={roster}
        missionList={[
          {
            id: 4,
            name: "Elite: Defeat Hogger",
            type: "quest",
            level: 10,
            minLevel: 6,
            recommended: "8-12",
            requiredPartySize: 3,
            zoneId: "elwynn_forest",
            requiredFaction: GUILD_FACTION.ALLIANCE,
            elite: true,
          },
          {
            id: "horde:legacy:4",
            name: "Elite: Defend the Eversong Outpost",
            type: "quest",
            level: 10,
            minLevel: 6,
            recommended: "8-12",
            requiredPartySize: 3,
            zoneId: "eversong_woods",
            requiredFaction: GUILD_FACTION.HORDE,
            elite: true,
          },
        ]}
        activeMissions={[]}
        onDeploy={noop}
        guildFaction={GUILD_FACTION.HORDE}
        contentPhase="tbc_prepatch"
        isRaidUnlocked
      />,
    );

    expect(html).toContain("Elite: Defend the Eversong Outpost");
    expect(html).not.toContain("Elite: Defeat Hogger");
  });

  it("renders as a page with mission categories", () => {
    const html = render(
      <MissionModal
        isOpen
        variant="page"
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
    expect(html).not.toContain('role="dialog"');
  });
});
