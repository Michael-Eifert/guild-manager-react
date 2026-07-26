import React from "react";
import { describe, expect, it } from "vitest";

import CharacterCard from "../../components/CharacterCard";
import { hero, noop, render } from "./componentTestUtils";

describe("CharacterCard", () => {
  it("renders identity, level, and item level", () => {
    const html = render(<CharacterCard char={hero} onClick={noop} />);

    expect(html).toContain("Aela");
    expect(html).toContain("Lvl");
    expect(html).toContain("iLvl");
  });

  it("marks offline members for the neutral guild overview treatment", () => {
    const html = render(
      <CharacterCard
        char={{ ...hero, onlineStatus: "Offline" }}
        onClick={noop}
      />,
    );

    expect(html).toContain('data-online-status="Offline"');
  });

  it("shows the readable profile without exposing the internal day fraction", () => {
    const html = render(
      <CharacterCard
        char={{ ...hero, onlineStatus: "Online", onlineProfile: "Regular" }}
        onClick={noop}
      />,
    );

    expect(html).toContain("Online · Regular");
    expect(html).not.toContain("2/4");
  });

  it("hides online presentation when no simulation status is supplied", () => {
    const html = render(<CharacterCard char={hero} onClick={noop} />);

    expect(html).not.toContain("Online ·");
    expect(html).not.toContain("Regular");
  });

  it("also recognizes the persisted offline status before the live snapshot arrives", () => {
    const html = render(
      <CharacterCard char={{ ...hero, status: "Offline" }} onClick={noop} />,
    );

    expect(html).toContain('data-online-status="Offline"');
  });
});
