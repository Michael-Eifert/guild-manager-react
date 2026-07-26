import React from "react";
import { describe, expect, it } from "vitest";

import RecruitModal from "../../../components/modals/RecruitModal";
import {
  guildProgress,
  makeHero,
  noop,
  render,
  roster,
} from "../componentTestUtils";

describe("RecruitModal", () => {
  it("renders tiers and applications", () => {
    const html = render(
      <RecruitModal
        isOpen
        variant="page"
        onClose={noop}
        onRecruit={noop}
        openSlots={3}
        guildGold={50}
        maxRoster={10}
        rosterSize={roster.length}
        guildProgress={guildProgress}
        raidUnlocked={false}
        onScoutTier={() => []}
        applications={[makeHero({ id: "applicant-1", name: "Cora", level: 12 })]}
        onRecruitApplications={noop}
        onDeclineApplications={noop}
        marketStats={{ availableCount: 8, minLevel: 1, maxLevel: 20 }}
      />,
    );

    expect(html).toContain("Recruitment");
    expect(html).toContain("Guild Applications");
    expect(html).toContain("Scouting Focus");
    expect(html).toContain("Random");
    expect(html).toContain("Tanks");
    expect(html).toContain("Healers");
    expect(html).toContain("Damage");
    expect(html).toContain("Group Composition");
    expect(html).toContain("Cora");
    expect(html).not.toContain('role="dialog"');
  });
});
