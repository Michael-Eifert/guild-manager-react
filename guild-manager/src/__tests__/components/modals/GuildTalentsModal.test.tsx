import React from "react";
import { describe, expect, it } from "vitest";

import GuildTalentsModal from "../../../components/modals/GuildTalentsModal";
import {
  guildDerivedStats,
  guildProgress,
  guildSetup,
  noop,
  render,
} from "../componentTestUtils";

describe("GuildTalentsModal", () => {
  it("renders progression summary", () => {
    const html = render(
      <GuildTalentsModal
        isOpen
        variant="page"
        onClose={noop}
        guildProgress={guildProgress}
        guildGold={50}
        guildDerivedStats={guildDerivedStats}
        guildSetup={guildSetup}
        currentDayIndex={0}
        onChangeGuildFocus={noop}
        onUpgradeTalent={noop}
      />,
    );

    expect(html).toContain("Guild Progression");
    expect(html).toContain("Achievements");
    expect(html).toContain("Statistics");
    expect(html).toContain("Successful Dungeon Runs");
    expect(html).toContain("Guild Gold");
    expect(html).not.toContain('role="dialog"');
  });
});
