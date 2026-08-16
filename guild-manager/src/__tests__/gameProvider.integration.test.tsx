// @vitest-environment jsdom
import React from "react";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { GameProvider } from "../app/GameProvider";
import { useGameActions, useGameSelector } from "../app/useGame";
import { CONFIG, DEFAULT_GUILD_SETUP } from "../constants";
import {
  BROWSER_SESSION_STORAGE_KEY,
  clearBrowserSession,
  writeBrowserSession,
} from "../session/browserSessionPersistence";
import {
  CURRENT_SESSION_VERSION,
  SESSION_FORMAT_VALUE,
} from "../session/sessionMigrations";

beforeEach(() => {
  clearBrowserSession();
});

afterEach(() => {
  cleanup();
  clearBrowserSession();
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
  const guildName = useGameSelector((game) => game.guildSetup.name);
  const rosterSize = useGameSelector((game) => game.roster.length);
  const founderLevel = useGameSelector((game) => game.roster[0]?.level || 0);
  const realmAgeDays = useGameSelector((game) => game.realmState?.ageDays || 0);
  const startingGuildProgress = useGameSelector(
    (game) => game.guildSetup.startingGuildProgress,
  );
  const raidAttunement = useGameSelector(
    (game) => game.guildProgress?.talents?.raidAttunement || 0,
  );
  const actions = useGameActions();
  return (
    <div>
      <output data-testid="game-time">{gameTimeMs}</output>
      <output data-testid="roster-size">{rosterSize}</output>
      <output data-testid="started">{String(guildStarted)}</output>
      <output data-testid="guild-name">{guildName}</output>
      <output data-testid="founder-level">{founderLevel}</output>
      <output data-testid="realm-age-days">{realmAgeDays}</output>
      <output data-testid="starting-progress">{startingGuildProgress}</output>
      <output data-testid="raid-attunement">{raidAttunement}</output>
      <button type="button" onClick={() => actions.changeGuildSetup("name", "Runtime Guild")}>Name</button>
      <button type="button" onClick={() => actions.changeGuildSetup("realmAgeMonths", 10)}>Age 10</button>
      <button type="button" onClick={() => actions.changeGuildSetup("startingGuildProgress", "bwl_ready")}>BWL Ready</button>
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

  it("starts a correlated mature realm and raid-ready player guild", () => {
    render(
      <MemoryRouter>
        <GameProvider><RuntimeProbe /></GameProvider>
      </MemoryRouter>,
    );

    act(() => screen.getByRole("button", { name: "Name" }).click());
    act(() => screen.getByRole("button", { name: "Age 10" }).click());
    act(() => screen.getByRole("button", { name: "BWL Ready" }).click());
    act(() => screen.getByRole("button", { name: "Start" }).click());

    expect(screen.getByTestId("starting-progress").textContent).toBe(
      "bwl_ready",
    );
    expect(screen.getByTestId("roster-size").textContent).toBe("50");
    expect(screen.getByTestId("founder-level").textContent).toBe("60");
    expect(screen.getByTestId("realm-age-days").textContent).toBe("300");
    expect(screen.getByTestId("raid-attunement").textContent).toBe("1");
  });

  it("writes a browser autosave when a guild starts", async () => {
    render(
      <MemoryRouter>
        <GameProvider><RuntimeProbe /></GameProvider>
      </MemoryRouter>,
    );

    act(() => screen.getByRole("button", { name: "Name" }).click());
    act(() => screen.getByRole("button", { name: "Start" }).click());

    await waitFor(() => {
      const rawAutosave = window.localStorage.getItem(
        BROWSER_SESSION_STORAGE_KEY,
      );
      expect(rawAutosave).toBeTruthy();
      const autosave = JSON.parse(rawAutosave || "{}");
      expect(autosave.data.guildSetup).toMatchObject({
        hasStarted: true,
        name: "Runtime Guild",
      });
      expect(autosave.data.roster.length).toBeGreaterThan(0);
      expect(autosave.data.gameSettings).toEqual({
        offlineSimulationEnabled: false,
        realmGuildDensity: "medium",
        realmGuildDynamics: "medium",
        officerAutonomyMode: "automatic",
        autoRunPreparationMode: "none",
      });
    });
  });

  it("restores a started guild automatically from the browser session", async () => {
    writeBrowserSession(
      {
        format: SESSION_FORMAT_VALUE,
        version: CURRENT_SESSION_VERSION,
        savedAt: "2026-07-26T12:00:00.000Z",
        data: {
          roster: [],
          guildSetup: {
            ...DEFAULT_GUILD_SETUP,
            hasStarted: true,
            name: "Restored Browser Guild",
          },
          progression: {
            gameTimeMs: 1_760_000_000_000,
            gameSpeed: 2,
            isPaused: true,
          },
        },
      },
    );

    render(
      <MemoryRouter initialEntries={["/start"]}>
        <GameProvider><RuntimeProbe /></GameProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("started").textContent).toBe("true");
      expect(screen.getByTestId("guild-name").textContent).toBe(
        "Restored Browser Guild",
      );
      expect(Number(screen.getByTestId("game-time").textContent)).toBe(
        1_760_000_000_000,
      );
    });
  });

  it("discards an invalid browser autosave without crashing the provider", async () => {
    window.localStorage.setItem(
      BROWSER_SESSION_STORAGE_KEY,
      "{invalid session",
    );

    render(
      <MemoryRouter>
        <GameProvider><RuntimeProbe /></GameProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        window.localStorage.getItem(BROWSER_SESSION_STORAGE_KEY),
      ).toBeNull();
      expect(screen.getByTestId("started").textContent).toBe("false");
    });
  });
});
