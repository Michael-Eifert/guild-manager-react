// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import RecruitModal from "../../../components/modals/RecruitModal";
import { RECRUITMENT_SCOUT_FOCUS } from "../../../recruitment/scoutingFocus";
import { guildProgress, noop, roster } from "../componentTestUtils";

afterEach(() => {
  vi.useRealTimers();
});

describe("RecruitModal scouting focus", () => {
  it("forwards the selected focus to the scouting action", () => {
    vi.useFakeTimers();
    const onScoutTier = vi.fn(() => []);

    render(
      <RecruitModal
        isOpen
        variant="page"
        onClose={noop}
        onRecruit={noop}
        openSlots={3}
        guildGold={50}
        maxRoster={10}
        rosterSize={roster.length}
        guildProgress={guildProgress}
        raidUnlocked={false}
        onScoutTier={onScoutTier}
        applications={[]}
        onRecruitApplications={noop}
        onDeclineApplications={noop}
        marketStats={{ availableCount: 8, minLevel: 1, maxLevel: 20 }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tanks" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Scout Lv 1 - 10 (1g)" }),
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onScoutTier).toHaveBeenCalledWith(
      expect.objectContaining({ id: "level_1_10" }),
      expect.objectContaining({
        count: 5,
        focus: RECRUITMENT_SCOUT_FOCUS.TANK,
        scoutCostGold: 1,
      }),
    );
  });
});
