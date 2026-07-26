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
    expect(closedHtml).toContain("Hidden body");
    expect(closedHtml).toContain("hidden");
    expect(openHtml).toContain('aria-expanded="true"');
    expect(closedHtml).toContain('aria-expanded="false"');

    const controlsId = openHtml.match(/aria-controls="([^"]+)"/)?.[1];
    expect(controlsId).toBeTruthy();
    expect(openHtml).toContain(`id="${controlsId}"`);

    const triggerId = openHtml.match(/id="([^"]+-trigger)"/)?.[1];
    expect(triggerId).toBeTruthy();
    expect(openHtml).toContain(`aria-labelledby="${triggerId}"`);
  });
});
