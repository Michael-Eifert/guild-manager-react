// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import GameSettingsPage from "../../pages/game-settings/GameSettingsPage";
import { DEFAULT_CHAT_AI_SETTINGS } from "../../social/chatProviders";

afterEach(cleanup);

const debugActions = {
  bulkLevel: vi.fn(),
  addGold: vi.fn(),
  addRenown: vi.fn(),
  addPresetParty: vi.fn(),
  prepareMoltenCoreTestGuild: vi.fn(),
  prepareBlackwingLairTestGuild: vi.fn(),
  prepareNaxxramasTestGuild: vi.fn(),
  reloadDatabase: vi.fn(),
};

describe("GameSettingsPage", () => {
  it("updates gameplay settings and exposes chat and debug as page tabs", () => {
    const onGameSettingsChange = vi.fn();
    const onLoadBrowserSave = vi.fn();
    const onStartNewBrowserGame = vi.fn();
    render(
      <GameSettingsPage
        gameSettings={{ offlineSimulationEnabled: true }}
        onGameSettingsChange={onGameSettingsChange}
        chatAiSettings={{ ...DEFAULT_CHAT_AI_SETTINGS }}
        onChatAiSettingsChange={vi.fn()}
        onTestChatProvider={vi.fn()}
        debugActions={debugActions}
        browserSaveSlots={[
          {
            id: 1,
            active: true,
            hasSave: true,
            guildName: "Current Guild",
            savedAt: "2026-07-26T12:00:00.000Z",
            gameDay: 12,
          },
          {
            id: 2,
            active: false,
            hasSave: true,
            guildName: "Other Guild",
            savedAt: "2026-07-25T12:00:00.000Z",
            gameDay: 4,
          },
          {
            id: 3,
            active: false,
            hasSave: false,
            guildName: null,
            savedAt: null,
            gameDay: null,
          },
        ]}
        onLoadBrowserSave={onLoadBrowserSave}
        onStartNewBrowserGame={onStartNewBrowserGame}
      />,
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Offline Simulation" }),
    );
    expect(onGameSettingsChange).toHaveBeenCalledWith({
      offlineSimulationEnabled: false,
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Many" }),
    );
    expect(onGameSettingsChange).toHaveBeenCalledWith({
      realmGuildDensity: "many",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "High" }),
    );
    expect(onGameSettingsChange).toHaveBeenCalledWith({
      realmGuildDynamics: "high",
    });

    expect(screen.getByText("Current Guild")).toBeTruthy();
    expect(screen.getByText("Other Guild")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load Save" }));
    expect(onLoadBrowserSave).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByRole("button", { name: "Start New Game" }));
    expect(
      screen.getByRole("dialog", {
        name: "Start a new game in Save Slot 3?",
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm New Game" }));
    expect(onStartNewBrowserGame).toHaveBeenCalledWith(3);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Chat & AI" }));
    expect(
      screen.getByRole("radiogroup", {
        name: "Character chat text provider",
      }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Debug" }));
    expect(screen.getByText("Debug Tools")).toBeTruthy();
    expect(screen.getByRole("button", { name: "+10 Gold" })).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Turn Everyone Online" }),
    );
    expect(onGameSettingsChange).toHaveBeenLastCalledWith({
      offlineSimulationEnabled: false,
    });
  });
});
