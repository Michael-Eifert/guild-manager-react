// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import RecruitModal from "../../../components/modals/RecruitModal";
import { RECRUITMENT_SCOUT_FOCUS } from "../../../recruitment/scoutingFocus";
import {
  guildProgress,
  makeHero,
  noop,
  roster,
} from "../componentTestUtils";

afterEach(() => {
  cleanup();
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

  it("selects at most the number of candidates the guild can recruit", () => {
    vi.useFakeTimers();
    const candidates = Array.from({ length: 5 }, (_, index) =>
      makeHero({
        id: `candidate-${index + 1}`,
        name: `Candidate ${index + 1}`,
      }),
    );
    const onRecruit = vi.fn((selectedCandidates) => selectedCandidates);

    render(
      <RecruitModal
        isOpen
        variant="page"
        onClose={noop}
        onRecruit={onRecruit}
        openSlots={3}
        guildGold={50}
        maxRoster={5}
        rosterSize={roster.length}
        guildProgress={guildProgress}
        raidUnlocked={false}
        onScoutTier={() => candidates}
        applications={[]}
        onRecruitApplications={noop}
        onDeclineApplications={noop}
        marketStats={{ availableCount: 8, minLevel: 1, maxLevel: 20 }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Scout Lv 1 - 10 (1g)" }),
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });

    fireEvent.click(screen.getByRole("button", { name: "Select Max (3)" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Recruit Selected (3) - 2g" }),
    );

    expect(onRecruit).toHaveBeenCalledWith(
      candidates.slice(0, 3),
      expect.objectContaining({ id: "level_1_10" }),
    );
  });
});
