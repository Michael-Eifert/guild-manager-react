import React from "react";
import { describe, expect, it } from "vitest";

import ActiveMissionCard from "../../components/ActiveMissionCard";
import { dungeonMission, noop, render, roster } from "./componentTestUtils";

describe("ActiveMissionCard", () => {
  it("renders dungeon progress and party context", () => {
    const html = render(
      <ActiveMissionCard
        mission={dungeonMission}
        roster={roster}
        gameTimeMs={5000}
        onFinish={noop}
      />,
    );

    expect(html).toContain("The Deadmines");
    expect(html).toContain("Success chance: 84%");
    expect(html).toContain("Dungeon Party");
  });
});
