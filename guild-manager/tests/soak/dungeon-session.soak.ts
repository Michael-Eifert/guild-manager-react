import { describe, expect, it } from "vitest";

import { advanceDungeonMission } from "../../src/game/dungeonEngine";
import { parseSessionPayload } from "../../src/session/sessionPersistence";
import { CURRENT_SESSION_VERSION } from "../../src/session/sessionMigrations";

const createSeededRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
};

describe("dungeon and session soak", () => {
  it("resolves 1000 seeded dungeon runs within their attempt limits", () => {
    let successes = 0;
    let failures = 0;

    for (let run = 0; run < 1_000; run += 1) {
      const mission = {
        id: "soak-dungeon",
        instanceId: `soak-run-${run}`,
        name: "Soak Dungeon",
        type: "dungeon" as const,
        startTime: 0,
        finishTime: 8_000,
        totalDuration: 8_000,
        successChance: 65,
        maxAttempts: 3,
        dungeonBosses: ["One", "Two", "Three", "Four"],
      };
      const result = advanceDungeonMission(
        mission,
        60_000,
        true,
        createSeededRandom(run + 1),
      );
      const resolvedMission = result.mission as typeof mission & {
        dungeonProgress: {
          finished: boolean;
          attemptsUsed: number;
          clearedSteps: number;
        };
        missionSuccess?: boolean;
      };
      const progress = resolvedMission.dungeonProgress;

      expect(progress?.finished).toBe(true);
      expect(progress?.attemptsUsed).toBeLessThanOrEqual(3);
      expect(progress?.clearedSteps).toBeLessThanOrEqual(4);
      expect(Number.isFinite(result.mission.finishTime)).toBe(true);
      expect(
        result.stepLogs.every((entry) =>
          ["dungeon-step", "mission-attempt"].includes(String(entry.type)),
        ),
      ).toBe(true);

      if (resolvedMission.missionSuccess) successes += 1;
      else failures += 1;
    }

    expect(successes).toBeGreaterThan(0);
    expect(failures).toBeGreaterThan(0);
    expect(successes + failures).toBe(1_000);
  });

  it("keeps a current session stable through 100 parse cycles", () => {
    let data: Record<string, any> = {
      roster: [{ id: "hero-1", name: "Persistent Hero" }],
      guildSetup: { hasStarted: true, name: "Persistent Guild" },
      guildProgress: {},
      progression: { gameSpeed: 2, isPaused: false, gameTimeMs: 123_456 },
      socialState: {
        messages: [],
        searches: [],
        reservedRealmPlayerIds: [],
        nextSequence: 1,
        lastSearchCheckpoint: -1,
        lastReadSequenceByChannel: { guild: 0, general: 0 },
      },
    };

    for (let cycle = 0; cycle < 100; cycle += 1) {
      data = parseSessionPayload(
        JSON.stringify({
          format: "guild-manager-session",
          version: CURRENT_SESSION_VERSION,
          data,
        }),
      );
    }

    expect(data.roster).toEqual([
      { id: "hero-1", name: "Persistent Hero" },
    ]);
    expect(data.guildSetup).toMatchObject({
      hasStarted: true,
      name: "Persistent Guild",
    });
    expect(data.progression).toEqual({
      gameSpeed: 2,
      isPaused: false,
      gameTimeMs: 123_456,
    });
  });
});
