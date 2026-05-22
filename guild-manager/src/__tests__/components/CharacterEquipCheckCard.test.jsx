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
  });
});
