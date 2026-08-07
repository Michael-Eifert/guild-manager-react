import React from "react";
import { describe, expect, it } from "vitest";

import GuildLogModal from "../../../components/modals/GuildLogModal";
import { missionList, noop, render } from "../componentTestUtils";

describe("GuildLogModal", () => {
  it("renders logs and filters", () => {
    const html = render(
      <GuildLogModal
        isOpen
        variant="page"
        onClose={noop}
        missionList={missionList}
        logs={[
          {
            time: "Day 1",
            type: "mission",
            missionName: "The Deadmines",
            outcome: "completed",
          },
        ]}
      />,
    );

    expect(html).toContain("Guild Log");
    expect(html).toContain("The Deadmines");
    expect(html).toContain("Dungeon");
    expect(html).not.toContain('role="dialog"');
  });

  it("distinguishes equipped, stored, and sold loot", () => {
    const html = render(
      <GuildLogModal
        isOpen
        variant="page"
        onClose={noop}
        missionList={missionList}
        logs={[
          {
            time: "Day 1",
            type: "loot",
            missionName: "The Deadmines",
            characterName: "Aela",
            itemName: "Patient Sword",
            disposition: "stored",
          },
          {
            time: "Day 1",
            type: "loot",
            missionName: "World Drop",
            characterName: "Aela",
            itemName: "Bent Sword",
            disposition: "sold",
            soldGold: 3,
          },
        ]}
      />,
    );
    expect(html).toContain("Stored for another loadout");
    expect(html).toContain("Sold for 3g");
  });

  it("shows capped counts and a clear action for the active log", () => {
    const html = render(
      <GuildLogModal
        isOpen
        variant="page"
        onClose={noop}
        onClearLogs={noop}
        missionList={missionList}
        logs={Array.from({ length: 110 }, (_, index) => ({
          time: `Entry ${index}`,
          type: "relations",
          message: `General event ${index}`,
        }))}
      />,
    );

    expect(html).toContain("All");
    expect(html).toContain(">100</span>");
    expect(html).toContain("Clear Log");
    expect(html).toContain('title="Clear All log"');
    expect(html).not.toContain("General event 100");
  });
});
