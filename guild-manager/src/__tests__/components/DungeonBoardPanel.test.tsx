import React from "react";
import { describe, expect, it } from "vitest";

import DungeonBoardPanel from "../../components/DungeonBoardPanel";
import type { LfgSearch } from "../../social/chatTypes";
import { noop, render } from "./componentTestUtils";

const formingSearch: LfgSearch = {
  id: "lfg-board",
  missionId: "shadowfang-keep",
  missionName: "Shadowfang Keep",
  missionType: "dungeon",
  targetSize: 5,
  phase: "guild",
  createdAt: 1_000,
  guildSearchEndsAt: 16_000,
  expiresAt: 76_000,
  nextResponseAt: 4_000,
  participantIds: ["hero-1"],
  participants: [
    {
      id: "hero-1",
      source: "guild",
      name: "Guild Tank",
      charClass: "Warrior",
      role: "Tank",
      level: 22,
    },
  ],
  initiatorId: "hero-1",
};

describe("DungeonBoardPanel", () => {
  it("includes forming LFG groups alongside active dungeon runs", () => {
    const html = render(
      <DungeonBoardPanel
        roster={[]}
        missionList={[]}
        activeMissions={[]}
        socialState={{ searches: [formingSearch] }}
        gameTimeMs={5_000}
        onManualFinish={noop}
        onQueueAdventureGoal={noop}
        onClearAdventureGoal={noop}
      />,
    );

    expect(html).toContain("Groups Forming");
    expect(html).toContain("Shadowfang Keep");
    expect(html).toContain("Group Forming · 1/5");
    expect(html).toContain("Forming");
  });
});
