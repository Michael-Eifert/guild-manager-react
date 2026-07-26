import React from "react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import GuildStatistics from "../../components/dashboard/GuildStatistics";
import { render, roster } from "./componentTestUtils";
import { createInitialGuildActivityStats } from "../../guild/guildActivityStats";

describe("GuildStatistics", () => {
  it("renders guild pulse and all three leaderboards", () => {
    const html = render(
      <MemoryRouter>
        <GuildStatistics
          roster={roster}
          relationships={{
            "hero-1::hero-2": {
              memberIds: ["hero-1", "hero-2"],
              points: 25,
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Guild Statistics");
    expect(html).toContain("Best Equipped");
    expect(html).toContain("Most Popular");
    expect(html).toContain("Guild Impact");
    expect(html).toContain("Positive Bonds");
    expect(html).toContain("Successful Dungeon Runs");
    expect(html).toContain("On Mission");
    expect(html).toContain("Online");
    expect(html).toContain("GS");
  });

  it("renders full-guild dungeon clears and expandable raid boss progress", () => {
    const activityStats = {
      ...createInitialGuildActivityStats(),
      guildDungeonClears: {
        deadmines: {
          missionId: "deadmines",
          name: "The Deadmines",
          clearCount: 2,
          lastClearedDayIndex: 4,
        },
      },
      guildRaidProgress: {
        molten_core: {
          raidId: "molten_core",
          name: "Molten Core",
          totalBosses: 2,
          defeatedBossNames: ["Lucifron"],
          lastProgressDayIndex: 5,
        },
      },
    };
    const html = render(
      <MemoryRouter>
        <GuildStatistics
          roster={roster}
          relationships={{}}
          activityStats={activityStats}
          detailed
          missionList={[
            {
              id: "deadmines",
              type: "dungeon",
              name: "The Deadmines",
            },
            {
              id: "mc",
              type: "dungeon",
              isRaid: true,
              dungeonSetId: "molten_core",
              dungeonSetName: "Molten Core",
              dungeonBosses: ["Lucifron", "Magmadar"],
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Guild Dungeon Clears");
    expect(html).toContain("The Deadmines");
    expect(html).toContain("Guild Raid Progress");
    expect(html).toContain("Molten Core");
    expect(html).toContain("Lucifron");
    expect(html).toContain("Magmadar");
    expect(html).toContain("1/2");
  });
});
