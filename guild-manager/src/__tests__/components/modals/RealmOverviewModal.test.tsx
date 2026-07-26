import React from "react";
import { describe, expect, it } from "vitest";

import RealmOverviewModal from "../../../components/modals/RealmOverviewModal";
import {
  GUILD_SERVER_STYLE,
  guildProgress,
  guildSetup,
  missionList,
  noop,
  render,
  roster,
} from "../componentTestUtils";

describe("RealmOverviewModal", () => {
  it("renders rankings and realm stats", () => {
    const html = render(
      <RealmOverviewModal
        isOpen
        variant="page"
        onClose={noop}
        realmState={{
          name: "Ashbringer",
          type: GUILD_SERVER_STYLE.PVE,
          ageDays: 2,
          npcGuilds: [],
          populationLabel: "Medium",
          population: {
            players: [],
            departedPlayers: [],
            dailyStats: {
              returners: 2,
              npcGuildExits: 1,
              expiredApplications: 1,
            },
          },
          news: [
            {
              dayIndex: 0,
              type: "realm-return",
              message: "Aria returned to the realm.",
            },
          ],
        }}
        guildSetup={guildSetup}
        roster={roster}
        missionList={missionList}
        guildProgress={guildProgress}
        raidLockouts={{}}
        currentDayIndex={1}
      />,
    );

    expect(html).toContain("Realm Overview");
    expect(html).toContain("Ashbringer");
    expect(html).toContain("Realm PvE Leaderboard");
    expect(html).toContain("PvE Score Breakdown");
    expect(html).toContain("Competition: Normal");
    expect(html).toContain("Open to Offers");
    expect(html).toContain("Away from Realm");
    expect(html).toContain("Guild Exits");
    expect(html).toContain("Returned Today");
    expect(html).toContain("Aria returned to the realm.");
    expect(html).toContain("Return");
    expect(html).not.toContain('role="dialog"');
  });
});
