import { describe, expect, it } from "vitest";

import { migrateSessionPayload } from "../session/sessionMigrations";
import { normalizePersistedSocialState } from "../session/sessionPersistence";
import { createInitialSocialState } from "../social/socialSimulation";

describe("social session persistence", () => {
  it("migrates version 8 saves with an empty SocialState", () => {
    const migrated = migrateSessionPayload({
      format: "guild-manager-session",
      version: 8,
      data: { roster: [] },
    });
    expect(migrated.version).toBe(9);
    expect(migrated.data).toHaveProperty("socialState", null);
  });

  it("persists mixed searches but replaces pending AI requests with fallback text", () => {
    const state = normalizePersistedSocialState({
      ...createInitialSocialState(),
      nextSequence: 2,
      messages: [
        {
          id: "chat:1",
          sequence: 1,
          channel: "guild",
          intent: "lfg-request",
          text: "",
          fallbackText: "Need a tank.",
          textSource: "template",
          generationStatus: "pending",
          gameTimeMs: 100,
          speaker: null,
        },
      ],
      searches: [
        {
          id: "lfg:1",
          missionId: "deadmines",
          missionName: "The Deadmines",
          missionType: "dungeon",
          targetSize: 5,
          phase: "general",
          createdAt: 0,
          guildSearchEndsAt: 15_000,
          expiresAt: 75_000,
          nextResponseAt: 20_000,
          participantIds: ["guild-1", "realm-1"],
          participants: [
            {
              id: "guild-1",
              source: "guild",
              name: "Aria",
              level: 20,
            },
            {
              id: "realm-1",
              source: "realm",
              name: "Borin",
              level: 20,
            },
          ],
          initiatorId: "guild-1",
        },
      ],
    });

    expect(state.searches[0]?.participants).toHaveLength(2);
    expect(state.reservedRealmPlayerIds).toEqual(["realm-1"]);
    expect(state.messages[0]).toMatchObject({
      text: "Need a tank.",
      textSource: "template",
      generationStatus: "ready",
    });
  });
});
