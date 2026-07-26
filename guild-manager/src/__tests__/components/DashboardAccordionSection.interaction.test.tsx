// @vitest-environment jsdom

import React, { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import DashboardAccordionSection from "../../components/DashboardAccordionSection";

const IndependentSections = () => {
  const [sectionsOpen, setSectionsOpen] = useState({
    guildActivity: true,
    pvpActivity: true,
  });
  const toggle = (key: keyof typeof sectionsOpen) => {
    setSectionsOpen((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <>
      <DashboardAccordionSection
        title="Guild Activity"
        isOpen={sectionsOpen.guildActivity}
        onToggle={() => toggle("guildActivity")}
      >
        <div>Guild controls</div>
      </DashboardAccordionSection>
      <DashboardAccordionSection
        title="PvP Activity"
        isOpen={sectionsOpen.pvpActivity}
        onToggle={() => toggle("pvpActivity")}
      >
        <div>PvP controls</div>
      </DashboardAccordionSection>
    </>
  );
};

afterEach(cleanup);

describe("DashboardAccordionSection interactions", () => {
  it("opens and closes panels independently", async () => {
    const user = userEvent.setup();
    render(<IndependentSections />);

    await user.click(screen.getByRole("button", { name: "Guild Activity" }));

    expect(
      screen.getByText("Guild controls").closest('[role="region"]')?.hidden,
    ).toBe(true);
    expect(screen.getByText("PvP controls")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Guild Activity" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      screen.getByRole("button", { name: "PvP Activity" }).getAttribute(
        "aria-expanded",
      ),
    ).toBe("true");

    await user.click(screen.getByRole("button", { name: "PvP Activity" }));

    expect(
      screen.getByText("Guild controls").closest('[role="region"]')?.hidden,
    ).toBe(true);
    expect(
      screen.getByText("PvP controls").closest('[role="region"]')?.hidden,
    ).toBe(true);
  });
});
