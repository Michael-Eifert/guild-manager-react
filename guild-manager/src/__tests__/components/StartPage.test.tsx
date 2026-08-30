// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { GameContext } from "../../app/GameContext";
import StartPage from "../../pages/start/StartPage";

afterEach(cleanup);

describe("StartPage browser saves", () => {
  it("opens the three browser save slots and loads the chosen slot", () => {
    const onLoadBrowserSave = vi.fn();
    const game = {
      actions: {
        dismissNotification: vi.fn(),
        changeGuildSetup: vi.fn(),
        loadSession: vi.fn(),
        loadSessionFile: vi.fn(),
        startGuild: vi.fn(),
        loadBrowserSave: onLoadBrowserSave,
        updateGameSettings: vi.fn(),
      },
      guildSetup: { hasStarted: false, name: "" },
      notifications: [],
      sessionFileInputRef: { current: null },
      browserSaveSlots: [
        {
          id: 1,
          active: true,
          hasSave: false,
          guildName: null,
          savedAt: null,
          gameDay: null,
        },
        {
          id: 2,
          active: false,
          hasSave: true,
          guildName: "Moonlit Oath",
          savedAt: "2026-07-26T12:00:00.000Z",
          gameDay: 8,
        },
        {
          id: 3,
          active: false,
          hasSave: true,
          guildName: "Dawnwatch",
          savedAt: "2026-07-25T12:00:00.000Z",
          gameDay: 3,
        },
      ],
    };

    render(
      <MemoryRouter>
        <GameContext.Provider value={game as never}>
          <StartPage />
        </GameContext.Provider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Load browser save" }));
    expect(
      screen.getByRole("dialog", { name: "Browser Saves" }),
    ).toBeTruthy();
    expect(screen.getByText("Moonlit Oath")).toBeTruthy();
    expect(screen.getByText("Dawnwatch")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Load Save" })[0]);
    expect(onLoadBrowserSave).toHaveBeenCalledWith(2);
    expect(screen.queryByRole("dialog", { name: "Browser Saves" })).toBeNull();
  });
});
