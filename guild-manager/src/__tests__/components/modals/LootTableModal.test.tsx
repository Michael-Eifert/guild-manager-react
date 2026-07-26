import React from "react";
import { describe, expect, it } from "vitest";

import LootTableModal from "../../../components/modals/LootTableModal";
import { noop, render } from "../componentTestUtils";

describe("LootTableModal", () => {
  it("renders loot atlas filters", () => {
    const html = render(
      <LootTableModal isOpen variant="page" onClose={noop} />,
    );

    expect(html).toContain("Loot Atlas");
    expect(html).toContain("Dungeons");
    expect(html).toContain("Raids");
    expect(html).not.toContain('role="dialog"');
  });
});
