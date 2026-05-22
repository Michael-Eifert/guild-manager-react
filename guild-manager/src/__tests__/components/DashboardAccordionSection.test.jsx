import React from "react";
import { describe, expect, it } from "vitest";

import DashboardAccordionSection from "../../components/DashboardAccordionSection";
import { noop, render } from "./componentTestUtils";

describe("DashboardAccordionSection", () => {
  it("renders open and closed states", () => {
    const openHtml = render(
      <DashboardAccordionSection title="Roster" summary="2 heroes" isOpen onToggle={noop}>
        <div>Visible body</div>
      </DashboardAccordionSection>,
    );
    const closedHtml = render(
      <DashboardAccordionSection
        title="Roster"
        summary="2 heroes"
        isOpen={false}
        onToggle={noop}
      >
        <div>Hidden body</div>
      </DashboardAccordionSection>,
    );

    expect(openHtml).toContain("Visible body");
    expect(closedHtml).not.toContain("Hidden body");
  });
});
