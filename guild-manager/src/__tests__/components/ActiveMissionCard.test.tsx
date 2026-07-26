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

  it("distinguishes guild and realm participants in an elite quest party", () => {
    const html = render(
      <ActiveMissionCard
        mission={{
          id: "elite-1",
          instanceId: "elite-run",
          name: "Elite Threat",
          type: "elite",
          isZoneElite: true,
          memberIds: ["char-1"],
          partyParticipants: [
            {
              id: "char-1",
              source: "guild",
              name: "Guild Hero",
              level: 20,
              role: "Tank",
            },
            {
              id: "realm-1",
              source: "realm",
              name: "Realm Hero",
              guildName: "Realm Regulars",
              level: 20,
              role: "DPS",
            },
          ],
          startTime: 0,
          finishTime: 10_000,
          totalDuration: 10_000,
          successChance: 80,
        }}
        roster={[]}
        gameTimeMs={5_000}
        onFinish={noop}
      />,
    );

    expect(html).toContain("Quest Party · 1 Guild / 1 Realm");
    expect(html).toContain("Guild Hero");
    expect(html).toContain("Realm Regulars");
  });
});
