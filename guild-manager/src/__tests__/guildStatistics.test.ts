import { describe, expect, it } from "vitest";

import { buildGuildStatistics } from "../guild/guildStatistics";

const character = (
  id: string,
  {
    name = id,
    itemLevel = 1,
    history = [],
    honorableKills = 0,
    status = "Idle",
  }: {
    name?: string;
    itemLevel?: number;
    history?: Array<{
      result?: string;
      bossesCleared?: number | null;
    }>;
    honorableKills?: number;
    status?: string;
  } = {},
) => ({
  id,
  name,
  level: 60,
  itemLevel,
  history,
  status,
  pvp: { honorableKills },
});

describe("guild statistics", () => {
  it("ranks the best equipped members by item level", () => {
    const statistics = buildGuildStatistics({
      roster: [
        character("alpha", { itemLevel: 30 }),
        character("bravo", { itemLevel: 55 }),
        character("charlie", { itemLevel: 42 }),
      ],
      relationships: {},
    });

    expect(
      statistics.equipmentLeaders.map((entry) => entry.character.id),
    ).toEqual(["bravo", "charlie", "alpha"]);
    expect(statistics.equipmentLeaders[0]).toMatchObject({
      itemLevel: 55,
      gearScore: 55,
    });
  });

  it("uses the average item level directly as gear score", () => {
    const statistics = buildGuildStatistics({
      roster: [
        character("alpha", { itemLevel: 5 }),
        character("bravo", { itemLevel: 6 }),
      ],
      relationships: {},
    });

    expect(statistics.equipmentLeaders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          character: expect.objectContaining({ id: "alpha" }),
          gearScore: 5,
        }),
        expect.objectContaining({
          character: expect.objectContaining({ id: "bravo" }),
          gearScore: 6,
        }),
      ]),
    );
    expect(statistics.averageGearScore).toBe(5.5);
  });

  it("counts only positive relationship points for popularity", () => {
    const statistics = buildGuildStatistics({
      roster: [
        character("alpha"),
        character("bravo"),
        character("charlie"),
      ],
      relationships: {
        "alpha::bravo": {
          memberIds: ["alpha", "bravo"],
          points: 25,
        },
        "alpha::charlie": {
          memberIds: ["alpha", "charlie"],
          points: 10,
        },
        "bravo::charlie": {
          memberIds: ["bravo", "charlie"],
          points: -40,
        },
      },
    });

    expect(statistics.positiveBonds).toBe(2);
    expect(statistics.popularityLeaders[0]).toMatchObject({
      character: { id: "alpha" },
      positivePoints: 35,
      positiveBonds: 2,
    });
    expect(
      statistics.popularityLeaders.find(
        (entry) => entry.character.id === "charlie",
      ),
    ).toMatchObject({
      positivePoints: 10,
      positiveBonds: 1,
    });
  });

  it("derives impact and guild pulse from completed activity", () => {
    const statistics = buildGuildStatistics({
      roster: [
        character("raider", {
          status: "Questing",
          history: [
            { result: "Success", bossesCleared: 4 },
            { result: "Success", bossesCleared: 2 },
          ],
        }),
        character("fighter", {
          honorableKills: 35,
          history: [{ result: "Failed", bossesCleared: 0 }],
        }),
      ],
      relationships: {},
    });

    expect(statistics.activeMembers).toBe(1);
    expect(statistics.successfulRuns).toBe(2);
    expect(statistics.impactLeaders[0]).toMatchObject({
      character: { id: "raider" },
      successfulRuns: 2,
      bossesCleared: 6,
      impactScore: 38,
    });
  });

  it("limits every leaderboard to five members", () => {
    const roster = Array.from({ length: 8 }, (_, index) =>
      character(`member-${index}`, { itemLevel: index + 1 }),
    );
    const statistics = buildGuildStatistics({ roster, relationships: {} });

    expect(statistics.equipmentLeaders).toHaveLength(5);
    expect(statistics.popularityLeaders).toHaveLength(5);
    expect(statistics.impactLeaders).toHaveLength(5);
  });
});
