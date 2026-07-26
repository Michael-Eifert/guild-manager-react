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
      />,
    );

    expect(html).toContain("Settings");
    expect(html).toContain("Save Session");
    expect(html).toContain("Load Session");
    expect(html).toContain("Debug Menu");
    expect(html).toContain("Templates");
    expect(html).toContain("OpenAI-compatible");
    expect(html).toContain("Ollama");
    expect(html).not.toContain("Guild Talents");
  });
});
