import { describe, expect, it, vi } from "vitest";

import { advanceActiveMissionsForTick, appendRuntimeLogs } from "../game/gameTickEngine";

describe("game tick engine", () => {
  it("uses injected randomness when advancing dungeons", () => {
    const random = vi.fn(() => 0);
    const result = advanceActiveMissionsForTick({
      activeMissions: [{
        id: "d",
        instanceId: "run",
        name: "Dungeon",
        type: "dungeon",
        memberIds: [],
        startTime: 1,
        finishTime: 4001,
        totalDuration: 4000,
        successChance: 100,
      }],
      now: 1001,
      currentGold: 20,
      random,
    });
    expect(random).toHaveBeenCalledOnce();
    expect(result.activeMissions).toHaveLength(1);
    expect(result.stepLogs[0]).toMatchObject({ type: "dungeon-step", outcome: "cleared" });
  });

  it("prepends and caps runtime logs without mutating inputs", () => {
    const existing = [{ type: "old" }];
    const next = appendRuntimeLogs(existing, [{ type: "new" }], "12:00", 1);
    expect(next).toEqual([{ type: "new", time: "12:00" }]);
    expect(existing).toEqual([{ type: "old" }]);
  });
});
