import React from "react";
import { describe, expect, it } from "vitest";

import WorldMapModal from "../../../components/modals/WorldMapModal";
import {
  GUILD_FACTION,
  GUILD_SERVER_STYLE,
  missionList,
  noop,
  render,
  roster,
} from "../componentTestUtils";

describe("WorldMapModal", () => {
  it("renders with world board summaries", () => {
    const html = render(
      <WorldMapModal
        isOpen
        variant="page"
        onClose={noop}
        onBack={noop}
        roster={roster}
        missionList={missionList}
        activeMissions={[]}
        realmState={{ name: "Ashbringer", type: GUILD_SERVER_STYLE.PVE }}
        worldPvpState={{}}
        guildLog={[]}
        guildName="Test Guild"
        guildFaction={GUILD_FACTION.ALLIANCE}
        realmType={GUILD_SERVER_STYLE.PVE}
        onDeploy={noop}
        onQueueAdventureGoal={noop}
        onClearAdventureGoal={noop}
        getMissionPreview={() => ({ successChance: 100 })}
      />,
    );

    expect(html).toContain("Adventure Board");
    expect(html).toContain("Classic Azeroth");
    expect(html).toContain("Westfall");
  });
});
