import React from "react";
import { describe, expect, it } from "vitest";

import DebugModal from "../../../components/modals/DebugModal";
import { noop, render } from "../componentTestUtils";

describe("DebugModal", () => {
  it("renders controls", () => {
    const html = render(
      <DebugModal
        isOpen
        onClose={noop}
        onBulkLevel={noop}
        onAddGold={noop}
        onAddRenown={noop}
        onAddPresetParty={noop}
        onPrepareMoltenCoreTestGuild={noop}
        onPrepareBlackwingLairTestGuild={noop}
        onPrepareNaxxramasTestGuild={noop}
        onReloadDatabase={noop}
      />,
    );

    expect(html).toContain("Debug Menu");
    expect(html).toContain("Global Level Override");
    expect(html).toContain("Scenario Setup");
  });
});
