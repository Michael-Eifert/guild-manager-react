import { describe, expect, it } from "vitest";

import { getFormingDungeonSearches } from "../dungeons/dungeonBoardUtils";
import type { LfgSearch, SocialState } from "../social/chatTypes";

const makeSearch = (
  id: string,
  phase: LfgSearch["phase"],
  missionType: LfgSearch["missionType"] = "dungeon",
  createdAt = 0,
): LfgSearch => ({
  id,
  missionId: `mission-${id}`,
  missionName: `Mission ${id}`,
  missionType,
  targetSize: 5,
  phase,
  createdAt,
  guildSearchEndsAt: 15_000,
  expiresAt: 75_000,
  nextResponseAt: 3_000,
  participantIds: ["hero-1"],
  participants: [
    {
      id: "hero-1",
      source: "guild",
      name: "Guild Hero",
      level: 20,
      role: "Tank",
    },
  ],
  initiatorId: "hero-1",
});

describe("dungeon board LFG searches", () => {
  it("returns only currently forming dungeon groups in creation order", () => {
    const socialState = {
      searches: [
        makeSearch("expired", "expired"),
        makeSearch("general", "general", "dungeon", 20),
        makeSearch("elite", "guild", "elite", 10),
        makeSearch("guild", "guild", "dungeon", 5),
        makeSearch("ready", "ready", "dungeon", 30),
        makeSearch("running", "in-progress", "dungeon", 40),
      ],
    } as Pick<SocialState, "searches">;

    expect(
      getFormingDungeonSearches(socialState).map((search) => search.id),
    ).toEqual(["guild", "general", "ready"]);
  });
});
