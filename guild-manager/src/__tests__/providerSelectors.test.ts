import { describe, expect, it } from "vitest";

import {
  buildMissionAchievementCatalog,
  getGuildActivityModeSummary,
  getMemberLevelBounds,
  rankGuildRoster,
} from "../app/providerSelectors";

describe("provider selectors", () => {
  it("summarizes uniform and mixed guild activity", () => {
    expect(getGuildActivityModeSummary([])).toBeNull();
    expect(getGuildActivityModeSummary([{ id: "a" }, { id: "b", activityMode: "Auto" }])).toBe("Auto");
    expect(getGuildActivityModeSummary([{ id: "a", activityMode: "Manual" }, { id: "b" }])).toBe("Mixed");
  });

  it("normalizes reversed member level filters", () => {
    expect(getMemberLevelBounds("40", "20")).toEqual({ hasAnyFilter: true, min: 20, max: 40 });
    expect(getMemberLevelBounds("", "")).toEqual({
      hasAnyFilter: false,
      min: 1,
      max: Number.POSITIVE_INFINITY,
    });
  });

  it("filters, sorts, and ranks the roster without mutating it", () => {
    const roster = [
      { id: "a", name: "Alpha", level: 20, itemLevel: 10 },
      { id: "b", name: "Beta", level: 40, itemLevel: 30 },
      { id: "c", name: "Gamma", level: 30, itemLevel: 20 },
    ];
    const ranked = rankGuildRoster({
      roster,
      levelBounds: getMemberLevelBounds("20", "35"),
      sortMode: "ilvl-desc",
      sortModes: { LEVEL_ASC: "level-asc", ILVL_DESC: "ilvl-desc", ILVL_ASC: "ilvl-asc" },
      normalizedSearch: "a",
      getItemLevel: (member) => Number(member.itemLevel),
      getSearchScore: (member) => String(member.name).startsWith("G") ? 2 : 1,
    });
    expect(ranked.map(({ id }) => id)).toEqual(["c", "a"]);
    expect(roster.map(({ id }) => id)).toEqual(["a", "b", "c"]);
  });

  it("keeps every member when no level filter is active", () => {
    const ranked = rankGuildRoster({
      roster: [
        { id: "low", level: 10 },
        { id: "high", level: 60 },
      ],
      levelBounds: getMemberLevelBounds("", ""),
      sortMode: "level-desc",
      sortModes: {
        LEVEL_ASC: "level-asc",
        ILVL_DESC: "ilvl-desc",
        ILVL_ASC: "ilvl-asc",
      },
      normalizedSearch: "",
      getItemLevel: () => 0,
      getSearchScore: () => 0,
    });

    expect(ranked.map(({ id }) => id)).toEqual(["high", "low"]);
  });

  it("builds a sorted dungeon achievement catalog", () => {
    expect(buildMissionAchievementCatalog([
      { id: "quest", name: "Quest", type: "quest" },
      { id: "b", name: "Wing B", type: "dungeon", level: 30, isRaid: true },
      { id: "a", name: "Wing A", type: "dungeon", level: 20, dungeonWing: "A", dungeonSetName: "Set" },
    ])).toMatchObject([
      { id: "a", label: "A (Set)", isRaid: false },
      { id: "b", label: "Wing B", isRaid: true },
    ]);
  });
});
