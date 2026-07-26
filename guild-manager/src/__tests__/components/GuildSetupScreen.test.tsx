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
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('role="radio"');
    expect(html).toContain("Alliance");
    expect(html).toContain("Horde");
    expect(html).toContain('aria-label="Randomize guild name"');
    expect(html).toContain('aria-label="Randomize character name"');
    expect(html.indexOf("Faction")).toBeLessThan(
      html.indexOf("Founding Guild Master"),
    );
    expect(html).toContain("Starting Activity");
    expect(html).toContain("Dungeon Groups");
    expect(html).toContain("PvP Activity");
    expect(html).toContain("Realm Competition");
    expect(html).toContain("Easy");
    expect(html).toContain("Normal");
    expect(html).toContain("Hard");
    expect(html).toContain("Start Game");
  });
});
