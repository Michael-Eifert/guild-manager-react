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
    expect(html).toContain("Difficulty increases from top to bottom");
    expect(html).toContain("MC");
    expect(html).toContain("Molten Core");
    expect(html).toContain("Lucifron");
    expect(html).toContain("Magmadar");
    expect(html).toContain("1/2");
  });

  it("orders raid progression from entry raids to Naxxramas", () => {
    const raid = (dungeonSetId: string, dungeonSetName: string) => ({
      id: `${dungeonSetId}-mission`,
      type: "dungeon",
      isRaid: true,
      dungeonSetId,
      dungeonSetName,
      dungeonBosses: [`${dungeonSetName} Boss`],
    });
    const html = render(
      <MemoryRouter>
        <GuildStatistics
          roster={roster}
          relationships={{}}
          activityStats={createInitialGuildActivityStats()}
          detailed
          missionList={[
            raid("naxxramas", "Naxxramas"),
            raid("blackwing_lair", "Blackwing Lair"),
            raid("molten_core", "Molten Core"),
            raid("ahn_qiraj_temple", "Temple of Ahn'Qiraj"),
            raid("onyxias_lair", "Onyxia's Lair"),
            raid("ahn_qiraj_ruins", "Ruins of Ahn'Qiraj"),
            raid("zul_gurub", "Zul'Gurub"),
          ]}
        />
      </MemoryRouter>,
    );

    const orderedNames = [
      "Molten Core",
      "Zul&#x27;Gurub",
      "Ruins of Ahn&#x27;Qiraj",
      "Onyxia&#x27;s Lair",
      "Blackwing Lair",
      "Temple of Ahn&#x27;Qiraj",
      "Naxxramas",
    ];
    const positions = orderedNames.map((name) => html.indexOf(name));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).toContain("Hardest raids");
  });
});
