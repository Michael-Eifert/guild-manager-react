// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import GameHeader from "../../components/shell/GameHeader";

afterEach(cleanup);

describe("GameHeader", () => {
  it("opens save and load from the header instead of game settings", () => {
    const onOpenSaveLoad = vi.fn();
    render(
      <GameHeader
        guildName="Test Guild"
        faction="Alliance"
        factionIconUrl="/banner.png"
        realmLabel="Everlook"
        focus="Leveling"
        calendarLabel="Monday"
        dayProgressPercent={20}
        memberCount={5}
        maxRoster={15}
        guildGold={10}
        goldCap={100}
        renownLabel="Guild Renown"
        renownPoints={0}
        isPaused={false}
        gameSpeed={1}
        onOpenSaveLoad={onOpenSaveLoad}
        onTogglePause={vi.fn()}
        onCycleSpeed={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save & Load" }));
    expect(onOpenSaveLoad).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
  });
});
