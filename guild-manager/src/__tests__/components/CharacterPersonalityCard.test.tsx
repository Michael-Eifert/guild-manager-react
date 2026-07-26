import React from "react";
import { describe, expect, it } from "vitest";

import CharacterPersonalityCard from "../../components/CharacterPersonalityCard";
import { hero, noop, render } from "./componentTestUtils";

describe("CharacterPersonalityCard", () => {
  it("renders morale and preferences", () => {
    const html = render(<CharacterPersonalityCard char={hero} onClick={noop} />);

    expect(html).toContain("Aela");
    expect(html).toContain("Morale");
    expect(html).toContain("Likes");
  });

  it("keeps offline presentation available in personality mode", () => {
    const html = render(
      <CharacterPersonalityCard
        char={{ ...hero, onlineStatus: "Offline" }}
        onClick={noop}
      />,
    );

    expect(html).toContain('data-online-status="Offline"');
  });
});
