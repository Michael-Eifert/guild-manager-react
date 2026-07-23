import { describe, expect, it } from "vitest";

import { parseSessionPayload } from "../session/sessionPersistence";
import { SessionValidationError } from "../session/sessionMigrations";
import legacyFixture from "./fixtures/sessions/legacy-v0.json";
import currentFixture from "./fixtures/sessions/current-v8.json";
import futureFixture from "./fixtures/sessions/future-v999.json";
import malformedFixture from "./fixtures/sessions/malformed.json";

describe("session migrations", () => {
  it("migrates unwrapped legacy saves through version 8", () => {
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
    for (let version = 1; version < 8; version += 1) {
      const data = parseSessionPayload(JSON.stringify({
        format: "guild-manager-session",
        version,
        data: { roster: [{ id: `v${version}` }] },
      }));
      expect(data.roster[0].id).toBe(`v${version}`);
    }
  });

  it("rejects malformed and future envelopes", () => {
    expect(() => parseSessionPayload("{}")).toThrow(/valid guild session/);
    expect(() => parseSessionPayload(JSON.stringify(malformedFixture))).toThrow(SessionValidationError);
    expect(() => parseSessionPayload(JSON.stringify(futureFixture))).toThrow(/supports up to/);
  });
});
