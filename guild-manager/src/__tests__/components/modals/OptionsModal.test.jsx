import React from "react";
import { describe, expect, it } from "vitest";

import OptionsModal from "../../../components/modals/OptionsModal";
import { noop, render } from "../componentTestUtils";

describe("OptionsModal", () => {
  it("renders actions", () => {
    const html = render(
      <OptionsModal
        isOpen
        onClose={noop}
        onSaveSession={noop}
        onLoadSession={noop}
        onOpenDebug={noop}
        onOpenGuildTalents={noop}
      />,
    );

    expect(html).toContain("Settings");
    expect(html).toContain("Save Session");
    expect(html).toContain("Guild Talents");
  });
});
