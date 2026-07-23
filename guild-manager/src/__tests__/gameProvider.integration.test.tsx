// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { GameProvider } from "../app/GameProvider";
import { useGameActions, useGameSelector } from "../app/useGame";
import { CONFIG } from "../constants";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const Probe = () => {
  const guildName = useGameSelector((game) => game.guildSetup.name);
  const actions = useGameActions();
  const [initialActions] = React.useState(actions);
  return (
    <button
      type="button"
      data-actions-stable={String(initialActions === actions)}
      onClick={() => actions.changeGuildSetup("name", "Selectors Guild")}
    >
      {guildName || "Unnamed"}
    </button>
  );
};

const RuntimeProbe = () => {
  const gameTimeMs = useGameSelector((game) => game.gameTimeMs);
  const guildStarted = useGameSelector((game) => game.guildSetup.hasStarted);
  const rosterSize = useGameSelector((game) => game.roster.length);
  const actions = useGameActions();
  return (
    <div>
      <output data-testid="game-time">{gameTimeMs}</output>
      <output data-testid="roster-size">{rosterSize}</output>
      <output data-testid="started">{String(guildStarted)}</output>
      <button type="button" onClick={() => actions.changeGuildSetup("name", "Runtime Guild")}>Name</button>
      <button type="button" onClick={() => actions.startGuild()}>Start</button>
    </div>
  );
};

describe("GameProvider integration", () => {
  it("publishes provider changes through selectors and the stable action facade", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GameProvider><Probe /></GameProvider>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button"));
    const button = screen.getByRole("button", { name: "Selectors Guild" });
    expect(button).toBeTruthy();
    expect(button.getAttribute("data-actions-stable")).toBe("true");
  });

  it("advances the clock and starts a guild through the stable action facade", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    render(
      <MemoryRouter>
        <GameProvider><RuntimeProbe /></GameProvider>
      </MemoryRouter>,
    );
    const initialTime = Number(screen.getByTestId("game-time").textContent);
    await act(async () => {
      vi.advanceTimersByTime(CONFIG.TICK_RATE);
      await Promise.resolve();
    });
    expect(Number(screen.getByTestId("game-time").textContent)).toBeGreaterThan(initialTime);

    act(() => screen.getByRole("button", { name: "Name" }).click());
    act(() => screen.getByRole("button", { name: "Start" }).click());
    expect(screen.getByTestId("started").textContent).toBe("true");
    expect(Number(screen.getByTestId("roster-size").textContent)).toBeGreaterThan(0);
  });
});
