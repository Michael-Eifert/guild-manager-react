import { describe, expect, it } from "vitest";

import { parseSessionPayload } from "../session/sessionPersistence";
import {
  CURRENT_SESSION_VERSION,
  SessionValidationError,
} from "../session/sessionMigrations";
import legacyFixture from "./fixtures/sessions/legacy-v0.json";
import currentFixture from "./fixtures/sessions/current-v8.json";
import futureFixture from "./fixtures/sessions/future-v999.json";
import malformedFixture from "./fixtures/sessions/malformed.json";

describe("session migrations", () => {
  it("migrates unwrapped legacy saves through the current version", () => {
    const data = parseSessionPayload(JSON.stringify(legacyFixture));
    expect(data.roster[0]).toMatchObject({ id: "legacy", charClass: "Warrior" });
    expect(data.progression.gameSpeed).toBe(2);
    expect(data.guildRelationships).toEqual({});
  });

  it("accepts the current envelope", () => {
    const data = parseSessionPayload(JSON.stringify(currentFixture));
    expect(data.roster).toEqual([]);
  });

  it("provides a migration path for every historical wrapped version", () => {
    for (let version = 1; version < CURRENT_SESSION_VERSION; version += 1) {
      const data = parseSessionPayload(JSON.stringify({
        format: "guild-manager-session",
        version,
        data: { roster: [{ id: `v${version}` }] },
      }));
      expect(data.roster[0].id).toBe(`v${version}`);
    }
  });

  it("enables offline simulation for old saves and preserves current choices", () => {
    const migrated = parseSessionPayload(
      JSON.stringify({
        format: "guild-manager-session",
        version: 13,
        data: { roster: [{ id: "legacy-member" }] },
      }),
    );
    const current = parseSessionPayload(
      JSON.stringify({
        format: "guild-manager-session",
        version: CURRENT_SESSION_VERSION,
        data: {
          roster: [{ id: "current-member" }],
          gameSettings: { offlineSimulationEnabled: false },
        },
      }),
    );

    expect(migrated.gameSettings).toEqual({
      offlineSimulationEnabled: true,
      officerAutonomyMode: "off",
      autoRunPreparationMode: "none",
    });
    expect(current.gameSettings).toEqual({
      offlineSimulationEnabled: false,
    });
  });

  it("keeps officer autonomy off for old saves", () => {
    const migrated = parseSessionPayload(
      JSON.stringify({
        format: "guild-manager-session",
        version: 15,
        data: {
          roster: [{ id: "legacy-officer" }],
          gameSettings: { officerAutonomyMode: "automatic" },
        },
      }),
    );

    expect(migrated.gameSettings.officerAutonomyMode).toBe("off");
  });

  it("migrates existing saves to the uncommitted Classic route", () => {
    const migrated = parseSessionPayload(
      JSON.stringify({
        format: "guild-manager-session",
        version: 17,
        data: {
          roster: [{ id: "classic-member" }],
          guildSetup: { name: "Classic Guild", hasStarted: true },
        },
      }),
    );

    expect(migrated.guildSetup).toMatchObject({
      contentRoute: "uncommitted",
      contentPhase: "classic",
      contentPhaseStartedDayIndex: 0,
    });
  });

  it("migrates version 18 professions and active consumable plans to run preparation", () => {
    const migrated = parseSessionPayload(
      JSON.stringify({
        format: "guild-manager-session",
        version: 18,
        data: {
          roster: [{
            id: "prepared-member",
            professions: [
              { name: "Alchemy", skill: 200, maxSkill: 225 },
              { name: "Cooking", skill: 100, maxSkill: 150 },
            ],
          }],
          activeMissions: [{
            id: "legacy-run",
            consumableModifiers: { mode: "basic", successBonusPercent: 3 },
          }],
          missionBoardState: { consumableMode: "best" },
          gameSettings: { officerAutonomyMode: "off" },
        },
      }),
    );

    expect(migrated.roster[0].professions).toEqual([
      expect.objectContaining({ name: "Alchemy", kind: "primary" }),
      expect.objectContaining({ name: "Cooking", kind: "secondary" }),
    ]);
    expect(migrated.activeMissions[0].runPreparation).toMatchObject({
      mode: "basic",
      successBonusPercent: 3,
    });
    expect(migrated.missionBoardState.runPreparationSelection).toMatchObject({
      mode: "best",
      engineeringStrategy: "auto",
      enabledCategories: { alchemy: true, food: true, firstAid: true, engineering: true, weapon: true },
    });
    expect(migrated.gameSettings.autoRunPreparationMode).toBe("none");
  });

  it("adds the version 15 weapon slots and personal equipment inventory", () => {
    const migrated = parseSessionPayload(
      JSON.stringify({
        format: "guild-manager-session",
        version: 14,
        data: {
          roster: [
            {
              id: "legacy-warrior",
              equipment: {
                mainHand: { id: 1, name: "Old Sword", slot: "mainHand" },
              },
            },
          ],
        },
      }),
    );

    expect(migrated.roster[0].equipment).toMatchObject({
      mainHand: { id: 1 },
      offHand: null,
      ranged: null,
    });
    expect(migrated.roster[0].personalInventory).toEqual([]);
  });

  it("rejects malformed and future envelopes", () => {
    expect(() => parseSessionPayload("{}")).toThrow(/valid guild session/);
    expect(() => parseSessionPayload(JSON.stringify(malformedFixture))).toThrow(SessionValidationError);
    expect(() => parseSessionPayload(JSON.stringify(futureFixture))).toThrow(/supports up to/);
  });
});
