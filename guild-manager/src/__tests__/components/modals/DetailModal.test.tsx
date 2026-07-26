import React from "react";
import { describe, expect, it } from "vitest";

import DetailModal from "../../../components/modals/DetailModal";
import {
  GUILD_FACTION,
  hero,
  missionList,
  noop,
  render,
  roster,
} from "../componentTestUtils";

describe("DetailModal", () => {
  it("renders character tabs and stats", () => {
    const html = render(
      <DetailModal
        isOpen
        char={hero}
        missionAchievementCatalog={missionList}
        missionList={missionList}
        itemDatabase={[]}
        roster={roster}
        guildFaction={GUILD_FACTION.ALLIANCE}
        guildRelationships={{}}
        raidLockouts={{}}
        currentDayIndex={0}
        onClose={noop}
        onDismiss={noop}
        onLevelChange={noop}
        onRoleChange={noop}
        onProfChange={noop}
        onModeChange={noop}
      />,
    );

    expect(html).toContain("Aela");
    expect(html).toContain("Stats &amp; Gear");
    expect(html).toContain("Professions");
    expect(html).toContain(">Guild<");
  });
});
