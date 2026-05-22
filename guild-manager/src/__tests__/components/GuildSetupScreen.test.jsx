import React from "react";
import { describe, expect, it } from "vitest";

import GuildSetupScreen from "../../components/GuildSetupScreen";
import { guildSetup, noop, render } from "./componentTestUtils";

describe("GuildSetupScreen", () => {
  it("renders defaults and start gating", () => {
    const html = render(
      <GuildSetupScreen
        guildSetup={guildSetup}
        onChange={noop}
        onStart={noop}
        onLoadSession={noop}
      />,
    );

    expect(html).toContain("Found Your Guild");
    expect(html).toContain("Test Guild");
    expect(html).toContain("Starting Activity");
    expect(html).toContain("Dungeon Groups");
    expect(html).toContain("PvP Activity");
    expect(html).toContain("Start Game");
  });
});
