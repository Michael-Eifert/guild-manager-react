import { describe, expect, it } from "vitest";

import {
  DEFAULT_GAME_SETTINGS,
  normalizeGameSettings,
} from "../settings/gameSettings";
import { buildSessionPayload } from "../session/sessionPersistence";

describe("game settings", () => {
  it("defaults invalid and missing settings to enabled offline simulation", () => {
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
    });
  });
});
