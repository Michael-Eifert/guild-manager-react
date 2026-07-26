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
    render(
      <GameSettingsPage
        gameSettings={{ offlineSimulationEnabled: true }}
        onGameSettingsChange={onGameSettingsChange}
        chatAiSettings={{ ...DEFAULT_CHAT_AI_SETTINGS }}
        onChatAiSettingsChange={vi.fn()}
        onTestChatProvider={vi.fn()}
        debugActions={debugActions}
      />,
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Offline Simulation" }),
    );
    expect(onGameSettingsChange).toHaveBeenCalledWith({
      offlineSimulationEnabled: false,
    });

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
