import { describe, expect, it, vi } from "vitest";

import {
  applyDungeonStepLootAwards,
  applyMissionWipeCosts,
  buildMissionRun,
  getMissionInstanceId,
  resolveDungeonChainContinuation,
} from "../missions/missionRuntime";

describe("mission runtime", () => {
  it("charges every dungeon attempt without making gold negative", () => {
    const result = applyMissionWipeCosts(
      { id: "d", name: "Dungeon", type: "dungeon", gold: 70 },
      [{ type: "mission-attempt" }, { type: "mission-attempt" }],
      10,
    );
    expect(result.updatedGold).toBe(0);
    expect(result.wipeCostLog).toMatchObject({ wipeCount: 2, amount: 10, unpaidAmount: 4 });
  });

  it("builds stable fallback instance identifiers", () => {
    expect(getMissionInstanceId({ id: "quest", startTime: 12 })).toBe("quest-12");
    expect(getMissionInstanceId({ id: "quest", instanceId: "run" })).toBe("run");
  });

  it("uses injected services when creating a mission run", () => {
    const random = vi.fn(() => 0);
    const result = buildMissionRun({
      quest: { id: "q", name: "Quest", type: "quest", duration: 5, rewardGold: 0 },
      memberIds: ["hero"],
      startTime: 100,
      roster: [{ id: "hero" }],
      raidLockouts: {},
      currentDayIndex: 0,
      services: { now: () => 100, random, createId: () => "run-1" },
      getSuccessPreview: () => ({ successChance: 75, partyPower: 1, missionPower: 1 }),
    });
    expect(result).toMatchObject({ instanceId: "run-1", questId: "q", missionSuccess: true, finishTime: 5100 });
    expect(random).toHaveBeenCalledOnce();
  });

  it("applies run preparation to the persisted boss chance", () => {
    const runPreparation = { successBonusPercent: 6, consumedItems: [], repairCostMultiplier: 1 };
    const result = buildMissionRun({
      quest: { id: "prepared", name: "Prepared Dungeon", type: "dungeon", duration: 5, rewardGold: 0 },
      memberIds: ["hero"],
      startTime: 100,
      roster: [{ id: "hero" }],
      runOptions: { runPreparation },
      raidLockouts: {},
      currentDayIndex: 0,
      services: { now: () => 100, random: () => 0, createId: () => "prepared-run" },
      getSuccessPreview: () => ({ successChance: 50, partyPower: 1, missionPower: 1 }),
    });

    expect(result.successChance).toBe(56);
    expect(result.failChance).toBe(44);
    expect(result.runPreparation).toBe(runPreparation);
  });

  it("carries an already-consumed preparation plan into following chain wings", () => {
    const runPreparation = { successBonusPercent: 4, consumedItems: [{ itemId: "healing_potion", quantity: 10 }] };
    const buildRun = vi.fn((mission, memberIds, startTime, roster, chainContext, runOptions) => ({
      ...mission,
      memberIds,
      chainContext,
      runPreparation: runOptions.runPreparation,
    }));
    const result = resolveDungeonChainContinuation({
      mission: {
        id: "wing-one",
        name: "Wing One",
        type: "dungeon",
        memberIds: ["hero"],
        runPreparation,
        chainContext: { setName: "Chain", totalMissions: 2, currentPosition: 1, remainingMissionIds: ["wing-two"] },
      },
      missionSucceeded: true,
      roster: [{ id: "hero" }],
      startTime: 200,
      missionList: [{ id: "wing-two", name: "Wing Two", type: "dungeon" }],
      raidLockouts: {},
      currentDayIndex: 0,
      buildRun,
    });

    expect(buildRun).toHaveBeenCalledOnce();
    expect(buildRun.mock.calls[0][5].runPreparation).toBe(runPreparation);
    expect(result.queuedMission?.runPreparation).toBe(runPreparation);
  });

  it("applies failed dungeon-step morale exactly once", () => {
    const roster = [{ id: "hero", morale: 50 }];
    const result = applyDungeonStepLootAwards({
      activeMissions: [{ id: "d", instanceId: "run", name: "Dungeon", type: "dungeon", memberIds: ["hero"] }],
      finishedMissions: [],
      roster,
      stepLogs: [{ type: "dungeon-step", missionInstanceId: "run", outcome: "failed" }],
      awardDungeonStepLoot: () => null,
    });
    expect(result.roster[0].morale).toBe(45);
    expect(roster[0].morale).toBe(50);
  });
});
