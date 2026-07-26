import React from "react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import GuildStatistics from "../../components/dashboard/GuildStatistics";
import { render, roster } from "./componentTestUtils";

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
    expect(html).toContain("GS");
  });
});
