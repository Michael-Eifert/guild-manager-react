import React from "react";
import { describe, expect, it } from "vitest";

import CharacterEquipCheckCard from "../../components/CharacterEquipCheckCard";
import { hero, noop, render } from "./componentTestUtils";

describe("CharacterEquipCheckCard", () => {
  it("renders armory slots", () => {
    const html = render(<CharacterEquipCheckCard char={hero} onClick={noop} />);

    expect(html).toContain("Aela");
    expect(html).toContain("iLvl");
    expect(html).toContain("mainHand");
    expect(html).toContain("Off Hand: Empty");
    expect(html).toContain("Ranged: Empty");
  });

  it("uses a class-specific third weapon label", () => {
    const html = render(
      <CharacterEquipCheckCard
        char={{ ...hero, charClass: "Mage" }}
        onClick={noop}
      />,
    );
    expect(html).toContain("Wand: Empty");
  });

  it("keeps offline presentation available in equipment mode", () => {
    const html = render(
      <CharacterEquipCheckCard
        char={{ ...hero, onlineStatus: "Offline" }}
        onClick={noop}
      />,
    );

    expect(html).toContain('data-online-status="Offline"');
  });
});
