import React from "react";
import { describe, expect, it } from "vitest";

import GuildLogModal from "../../../components/modals/GuildLogModal";
import { missionList, noop, render } from "../componentTestUtils";

describe("GuildLogModal", () => {
  it("renders logs and filters", () => {
    const html = render(
      <GuildLogModal
        isOpen
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
  });
});
