import { describe, expect, it } from "vitest";

import {
  clearPersistedOfflineStatuses,
  DEFAULT_GAME_SETTINGS,
  normalizeGameSettings,
} from "../settings/gameSettings";
import { buildSessionPayload } from "../session/sessionPersistence";

describe("game settings", () => {
  it("defaults invalid and missing settings to disabled offline simulation", () => {
    expect(DEFAULT_GAME_SETTINGS.offlineSimulationEnabled).toBe(false);
    expect(normalizeGameSettings(null)).toEqual(DEFAULT_GAME_SETTINGS);
    expect(
      normalizeGameSettings({ offlineSimulationEnabled: "no" }),
    ).toEqual(DEFAULT_GAME_SETTINGS);
  });

  it("persists the offline simulation choice in a session payload", () => {
    const payload = buildSessionPayload({
      roster: [],
      activeMissions: [],
      missionList: [],
      guildLog: [],
      guildGold: 0,
      guildProgress: {},
      guildSetup: { hasStarted: true },
      gameSettings: { offlineSimulationEnabled: false },
      gameSpeed: 1,
      isPaused: false,
      gameTimeMs: 1_000,
    });

    expect(payload.data.gameSettings).toEqual({
      offlineSimulationEnabled: false,
      realmGuildDensity: "medium",
      realmGuildDynamics: "medium",
    });
  });

  it("normalizes guild landscape settings for new and legacy saves", () => {
    expect(normalizeGameSettings({ offlineSimulationEnabled: true })).toEqual({
      offlineSimulationEnabled: true,
      realmGuildDensity: "medium",
      realmGuildDynamics: "medium",
    });
    expect(
      normalizeGameSettings({
        realmGuildDensity: "many",
        realmGuildDynamics: "high",
      }),
    ).toMatchObject({
      realmGuildDensity: "many",
      realmGuildDynamics: "high",
    });
  });

  it("clears stale display-only offline statuses without touching activities", () => {
    const roster = clearPersistedOfflineStatuses([
      {
        id: "stale",
        status: "Offline",
        statusText: "Next login: Day 2, 08:00 · Regular",
      },
      { id: "mission", status: "Questing", statusText: "On Mission" },
    ]);

    expect(roster).toEqual([
      { id: "stale", status: "Idle", statusText: "Awaiting Orders" },
      { id: "mission", status: "Questing", statusText: "On Mission" },
    ]);
  });
});
