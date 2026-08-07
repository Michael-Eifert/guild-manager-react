import { describe, expect, it } from "vitest";

import {
  clearGuildLogEntries,
  getVisibleGuildLogEntries,
  retainGuildLogEntries,
} from "../guild/guildLog";

const missionList = [
  { id: "world", name: "Elwynn Forest", type: "zone" },
  { id: "dungeon", name: "The Deadmines", type: "dungeon" },
  { id: "raid", name: "Molten Core", type: "dungeon", isRaid: true },
];

const buildLogs = (
  count: number,
  type: string,
  missionName?: string,
) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${type}-${missionName || "general"}-${index}`,
    type,
    missionName,
  }));

describe("guild log retention", () => {
  it("keeps 100 all entries and 50 entries for every scenario independently", () => {
    const logs = [
      ...buildLogs(70, "zone-clear", "Elwynn Forest"),
      ...buildLogs(70, "mission", "The Deadmines"),
      ...buildLogs(70, "mission", "Molten Core"),
      ...buildLogs(70, "pvp"),
      ...buildLogs(30, "relations"),
    ];

    const retained = retainGuildLogEntries(logs, missionList);

    expect(getVisibleGuildLogEntries(retained, missionList, "all")).toHaveLength(
      100,
    );
    expect(
      getVisibleGuildLogEntries(retained, missionList, "world"),
    ).toHaveLength(50);
    expect(
      getVisibleGuildLogEntries(retained, missionList, "dungeon"),
    ).toHaveLength(50);
    expect(
      getVisibleGuildLogEntries(retained, missionList, "raid"),
    ).toHaveLength(50);
    expect(
      getVisibleGuildLogEntries(retained, missionList, "pvp"),
    ).toHaveLength(50);
  });

  it("clears only the selected scenario while all clears everything", () => {
    const logs = [
      ...buildLogs(2, "mission", "The Deadmines"),
      ...buildLogs(2, "mission", "Molten Core"),
      ...buildLogs(2, "pvp"),
      ...buildLogs(2, "relations"),
    ];

    const withoutRaids = clearGuildLogEntries(logs, missionList, "raid");

    expect(
      getVisibleGuildLogEntries(withoutRaids, missionList, "raid"),
    ).toHaveLength(0);
    expect(
      getVisibleGuildLogEntries(withoutRaids, missionList, "dungeon"),
    ).toHaveLength(2);
    expect(getVisibleGuildLogEntries(withoutRaids, missionList, "pvp")).toHaveLength(
      2,
    );
    expect(withoutRaids).toHaveLength(6);
    expect(clearGuildLogEntries(logs, missionList, "all")).toEqual([]);
  });
});
