import { describe, expect, it } from "vitest";

import {
  createInitialGuildActivityStats,
  recordCompletedGuildRun,
  registerStartedGuildRuns,
} from "../guild/guildActivityStats";

describe("guild activity statistics", () => {
  it("counts a five-player dungeon once by run id", () => {
    const mission = {
      instanceId: "run-1",
      type: "dungeon",
      memberIds: ["a", "b", "c", "d", "e"],
    };
    const started = registerStartedGuildRuns(
      createInitialGuildActivityStats(7),
      [mission, mission],
    );
    const completed = recordCompletedGuildRun({
      stats: started,
      mission,
      succeeded: true,
    });
    const duplicate = recordCompletedGuildRun({
      stats: completed,
      mission,
      succeeded: true,
    });
    expect(duplicate).toMatchObject({
      trackingStartedDayIndex: 7,
      startedRuns: 1,
      completedRuns: 1,
      successfulRuns: 1,
      dungeonRuns: 1,
      successfulDungeonRuns: 1,
    });
  });

  it("separates dungeons, raids and elite quests", () => {
    let stats = createInitialGuildActivityStats();
    stats = recordCompletedGuildRun({
      stats,
      mission: { instanceId: "d", type: "dungeon" },
      succeeded: false,
    });
    stats = recordCompletedGuildRun({
      stats,
      mission: {
        instanceId: "r",
        type: "dungeon",
        isRaid: true,
        dungeonProgress: { clearedSteps: 3 },
      },
      succeeded: true,
    });
    stats = recordCompletedGuildRun({
      stats,
      mission: { instanceId: "e", isZoneElite: true },
      succeeded: true,
    });
    expect(stats).toMatchObject({
      failedDungeonRuns: 1,
      successfulRaidRuns: 1,
      raidBossesCleared: 3,
      successfulEliteQuestRuns: 1,
      successfulDungeonRuns: 0,
      successfulRuns: 2,
    });
  });

  it("tracks a dungeon clear only for a full guild party", () => {
    const guildParty = ["a", "b", "c", "d", "e"];
    const fullGuildClear = recordCompletedGuildRun({
      stats: createInitialGuildActivityStats(),
      mission: {
        instanceId: "guild-clear",
        id: "deadmines",
        type: "dungeon",
        name: "The Deadmines",
        requiredPartySize: 5,
        memberIds: guildParty,
      },
      succeeded: true,
      dayIndex: 9,
    });
    expect(fullGuildClear.guildDungeonClears.deadmines).toMatchObject({
      name: "The Deadmines",
      clearCount: 1,
      lastClearedDayIndex: 9,
    });

    const mixedParty = recordCompletedGuildRun({
      stats: fullGuildClear,
      mission: {
        instanceId: "mixed-clear",
        id: "shadowfang",
        type: "dungeon",
        requiredPartySize: 5,
        memberIds: ["a", "b", "c"],
        partyParticipants: [
          ...["a", "b", "c"].map((id) => ({ id, source: "guild" })),
          { id: "realm-1", source: "realm" },
          { id: "realm-2", source: "realm" },
        ],
      },
      succeeded: true,
    });
    expect(mixedParty.guildDungeonClears.shadowfang).toBeUndefined();
  });

  it("tracks defeated raid bosses for a full guild raid even after a wipe", () => {
    const stats = recordCompletedGuildRun({
      stats: createInitialGuildActivityStats(),
      mission: {
        instanceId: "mc-run",
        id: 62,
        type: "dungeon",
        isRaid: true,
        dungeonSetId: "molten_core",
        dungeonSetName: "Molten Core",
        requiredPartySize: 40,
        memberIds: Array.from({ length: 40 }, (_, index) => `member-${index}`),
        dungeonBosses: ["Lucifron", "Magmadar", "Gehennas"],
        raidLockoutTotalBosses: 10,
        dungeonProgress: { clearedSteps: 2 },
      },
      succeeded: false,
      dayIndex: 12,
    });
    expect(stats.guildRaidProgress.molten_core).toEqual({
      raidId: "molten_core",
      name: "Molten Core",
      totalBosses: 10,
      defeatedBossNames: ["Lucifron", "Magmadar"],
      lastProgressDayIndex: 12,
    });
  });
});
