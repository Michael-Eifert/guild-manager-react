import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createInitialGuildProgress,
  applyDungeonClearMilestones,
  applyDungeonWipeMilestone,
  applyLevelMilestones,
  getGuildDerivedStats,
  normalizeGuildProgress,
} from "../guildProgression";
import {
  evaluateMissionKeyAccess,
  getDungeonBossCount,
  getMissionGoldReward,
  getMissionLootLevelRange,
  getDungeonQuarterExpMultiplier,
  getDungeonOverlevelExpMultiplier,
  getMissionLevelExpMultiplier,
  resolveMissionRewardQualities,
} from "../missions/missionHelpers";
import { createMissionRewardProcessor } from "../missions/missionRewards";
import {
  getRecruitmentCapacity,
  resolveRecruitmentResult,
} from "../recruitment/recruitmentLogic";
import {
  hydrateSessionData,
  buildSessionPayload,
  SESSION_FORMAT,
} from "../session/sessionPersistence";
import {
  advanceDungeonMission,
  getDefaultDungeonProgress,
} from "../game/dungeonEngine";
import {
  DEFAULT_GAME_SPEED,
  normalizeProgressionState,
} from "../progression";
import { DB_ITEMS } from "../data/items";
import {
  MOLTEN_CORE_ACTIVE_LOOT_MANIFEST,
  MOLTEN_CORE_ITEMS,
  unsupportedMoltenCoreDrops,
} from "../data/imports/moltenCoreLootManifest";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mission key access", () => {
  it("allows a dungeon chain when an earlier mission awards the later key", () => {
    const result = evaluateMissionKeyAccess({
      missions: [
        { id: "library", name: "Library", rewardKeys: ["scarlet_key"] },
        {
          id: "armory",
          name: "Armory",
          requiresKey: true,
          keyId: "scarlet_key",
        },
      ],
      partyMembers: [{ id: "mage", keys: [] }],
    });

    expect(result.canEnter).toBe(true);
    expect(result.unlockedDuringSequence).toEqual(["scarlet_key"]);
    expect(result.unlockedRequiredKeyIds).toEqual(["scarlet_key"]);
  });

  it("blocks missions that require every selected hero to own a key", () => {
    const result = evaluateMissionKeyAccess({
      missions: [
        {
          id: "molten_core",
          name: "Molten Core",
          requiresKey: true,
          requiresKeyForAllMembers: true,
          keyId: "molten_core_attunement",
        },
      ],
      partyMembers: [
        { id: "tank", keys: ["molten_core_attunement"] },
        { id: "healer", keys: [] },
      ],
    });

    expect(result.canEnter).toBe(false);
    expect(result.missingKeyIds).toEqual(["molten_core_attunement"]);
    expect(result.firstBlockingRequirement.requiresAllMembers).toBe(true);
  });
});

describe("recruitment", () => {
  it("separates open slots, paid slots, and the free first recruit", () => {
    expect(
      getRecruitmentCapacity({
        rosterSize: 8,
        maxRoster: 10,
        guildGold: 5,
        recruitCostGold: 5,
      }),
    ).toEqual({
      openSlots: 2,
      affordableSlots: 1,
      availableSlots: 2,
    });
  });

  it("charges gold only after the free recruit", () => {
    const result = resolveRecruitmentResult({
      currentRoster: [{ id: "existing" }],
      currentGold: 10,
      selectedCandidates: [{ id: "a" }, { id: "b" }, { id: "c" }],
      maxRoster: 4,
      recruitCostGold: 5,
    });

    expect(result.recruits.map((recruit) => recruit.id)).toEqual(["a", "b", "c"]);
    expect(result.spentGold).toBe(10);
    expect(result.updatedGold).toBe(0);
    expect(result.updatedRoster).toHaveLength(4);
  });
});

describe("guild progression", () => {
  it("awards each level milestone once", () => {
    const first = applyLevelMilestones(createInitialGuildProgress(), [
      { id: "hero", level: 20 },
    ]);
    const second = applyLevelMilestones(first.guildProgress, [{ id: "hero", level: 20 }]);

    expect(first.unlocked.map((entry) => entry.level)).toEqual([10, 20]);
    expect(first.guildProgress.renownPoints).toBe(2);
    expect(second.unlocked).toEqual([]);
    expect(second.guildProgress.renownPoints).toBe(2);
  });

  it("tracks dungeon clear and wipe milestones without double-awarding the first wipe", () => {
    const clearResult = applyDungeonClearMilestones(
      createInitialGuildProgress(),
      "Gnomeregan",
    );
    const firstWipe = applyDungeonWipeMilestone(clearResult.guildProgress);
    const secondWipe = applyDungeonWipeMilestone(firstWipe.guildProgress);

    expect(clearResult.guildProgress.milestones.dungeon.clearCount).toBe(1);
    expect(clearResult.guildProgress.milestones.dungeon.gnomereganCleared).toBe(true);
    expect(firstWipe.unlocked.label).toBe("First dungeon wipe");
    expect(secondWipe.unlocked).toBeNull();
  });
});

describe("session persistence", () => {
  it("serializes active mission remaining time against game time", () => {
    const payload = buildSessionPayload({
      roster: [],
      activeMissions: [{ id: "m1", finishTime: 2500 }],
      missionList: [],
      guildLog: [],
      guildGold: 7,
      guildProgress: createInitialGuildProgress(),
      guildSetup: { hasStarted: true },
      gameSpeed: DEFAULT_GAME_SPEED,
      isPaused: false,
      gameTimeMs: 1000,
    });

    expect(payload.format).toBe(SESSION_FORMAT);
    expect(payload.data.activeMissions[0].remainingMs).toBe(1500);
  });

  it("hydrates active missions and normalizes questing roster status", () => {
    const result = hydrateSessionData({
      payloadData: {
        roster: [
          { id: "a", status: "Questing", keys: ["key"], clearedMissionIds: [1] },
          { id: "b", status: "Questing" },
        ],
        activeMissions: [{ id: "m1", memberIds: ["a"], remainingMs: 5000 }],
        missionList: [{ id: "m1" }],
        guildGold: 999999,
        guildProgress: createInitialGuildProgress(),
        guildSetup: { name: "Test", hasStarted: true },
        progression: { gameTimeMs: 1000, gameSpeed: 1, isPaused: false },
      },
      initialMissions: [],
      normalizeGuildProgress,
      normalizeGuildSetup: (value) => value,
      getGuildDerivedStats,
      normalizeProgressionState,
      defaultGameSpeed: DEFAULT_GAME_SPEED,
      defaultGuildSetup: {},
      createId: () => "instance-id",
      resolveDungeonBossCount: getDungeonBossCount,
    });

    expect(result.loadedActiveMissions[0].finishTime).toBe(6000);
    expect(result.normalizedRoster[0].status).toBe("Questing");
    expect(result.normalizedRoster[1].status).toBe("Idle");
    expect(result.loadedGuildGold).toBe(getGuildDerivedStats(createInitialGuildProgress()).goldCap);
  });
});

describe("mission rewards", () => {
  const buildProcessor = () =>
    createMissionRewardProcessor({
      dbItems: [
        {
          id: "cloth-1",
          name: "Better Robe",
          slot: "chest",
          quality: 2,
          type: "Cloth",
          minLevel: 1,
        },
      ],
      dbClasses: { Mage: {} },
      getClassArmorTypes: () => ["Cloth"],
      isItemUsableByClass: () => true,
      getKeyLabel: (keyId) => keyId,
      getItemEffectiveLevel: (item) => Number(item?.minLevel || 0) + Number(item?.quality || 0),
      getMissionLootLevelRange,
      resolveMissionRewardQualities,
      getDungeonStepLootConfig: () => ({
        includeWorldDrops: true,
        dungeonOnly: false,
        worldOnly: false,
      }),
      getDungeonStepQualityPriority: () => [2],
      getDungeonBossCount,
      getDungeonQuarterExpMultiplier,
      getDungeonOverlevelExpMultiplier,
      getMissionLevelExpMultiplier,
      getReqExp: () => 1000,
      getMissionGoldReward,
    });

  it("awards quest rewards, equips upgrades, and records key grants", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const processor = buildProcessor();
    const result = processor({
      mission: {
        id: "quest-1",
        name: "Secure the Road",
        type: "quest",
        memberIds: ["mage"],
        level: 5,
        exp: 100,
        gold: 4,
        rewardQualities: [2],
        rewardKeys: ["road_key"],
      },
      currentRoster: [
        {
          id: "mage",
          name: "Mage",
          charClass: "Mage",
          level: 5,
          exp: 0,
          keys: [],
          history: [],
          equipment: {
            chest: { slot: "chest", quality: 1, type: "Cloth", minLevel: 1 },
          },
        },
      ],
      activeGuildStats: { expMultiplier: 1, goldMultiplier: 1 },
      activeFocusBonuses: { expMultiplier: 1, fullPartyGoldMultiplier: 1 },
      levelCap: 60,
      failedMissionExpFactor: 0.2,
    });

    expect(result.missionSucceeded).toBe(true);
    expect(result.missionGold).toBe(4);
    expect(result.updatedRoster[0].equipment.chest.name).toBe("Better Robe");
    expect(result.updatedRoster[0].keys).toEqual(["road_key"]);
    expect(result.missionLogs.some((log) => log.type === "loot")).toBe(true);
  });

  it("prefers boss-specific dungeon drops before falling back to the shared pool", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const processor = createMissionRewardProcessor({
      dbItems: [
        {
          id: "lucifron-robe",
          name: "Lucifron Robe",
          slot: "chest",
          quality: 4,
          type: "Cloth",
          minLevel: 60,
          dungeonSetId: "molten_core",
          dungeonSetName: "Molten Core",
          sourceBosses: ["Lucifron"],
        },
        {
          id: "magmadar-robe",
          name: "Magmadar Robe",
          slot: "chest",
          quality: 4,
          type: "Cloth",
          minLevel: 60,
          dungeonSetId: "molten_core",
          dungeonSetName: "Molten Core",
          sourceBosses: ["Magmadar"],
        },
      ],
      dbClasses: { Mage: {} },
      getClassArmorTypes: () => ["Cloth"],
      isItemUsableByClass: () => true,
      getKeyLabel: (keyId) => keyId,
      getItemEffectiveLevel: (item) => Number(item?.minLevel || 0) + Number(item?.quality || 0),
      getMissionLootLevelRange,
      resolveMissionRewardQualities,
      getDungeonStepLootConfig: () => ({
        includeWorldDrops: false,
        dungeonOnly: true,
        worldOnly: false,
      }),
      getDungeonStepQualityPriority: () => [4],
      getDungeonBossCount,
      getDungeonQuarterExpMultiplier,
      getDungeonOverlevelExpMultiplier,
      getMissionLevelExpMultiplier,
      getReqExp: () => 1000,
      getMissionGoldReward,
    });

    const result = processor({
      mission: {
        id: "mc",
        name: "Molten Core",
        type: "dungeon",
        memberIds: ["mage"],
        recommended: "58 - 60",
        minLevel: 56,
        level: 60,
        exp: 100,
        gold: 0,
        dungeonBosses: ["Lucifron", "Magmadar"],
        dungeonProgress: { clearedSteps: 1 },
      },
      currentRoster: [
        {
          id: "mage",
          name: "Mage",
          charClass: "Mage",
          level: 60,
          exp: 0,
          keys: [],
          clearedMissionIds: [],
          history: [],
          equipment: {
            chest: { slot: "chest", quality: 1, type: "Cloth", minLevel: 1 },
          },
        },
      ],
      activeGuildStats: { expMultiplier: 1, goldMultiplier: 1 },
      activeFocusBonuses: { expMultiplier: 1, fullPartyGoldMultiplier: 1 },
      levelCap: 60,
      failedMissionExpFactor: 0.2,
    });

    expect(result.updatedRoster[0].equipment.chest.name).toBe("Lucifron Robe");
    expect(
      result.missionLogs.some(
        (log) => log.type === "loot" && log.bossName === "Lucifron",
      ),
    ).toBe(true);
  });

  it("awards boss loot when the boss step clears and skips it at final payout", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const processor = createMissionRewardProcessor({
      dbItems: [
        {
          id: "lucifron-robe",
          name: "Lucifron Robe",
          slot: "chest",
          quality: 4,
          type: "Cloth",
          minLevel: 60,
          dungeonSetId: "molten_core",
          dungeonSetName: "Molten Core",
          sourceBosses: ["Lucifron"],
        },
      ],
      dbClasses: { Mage: {} },
      getClassArmorTypes: () => ["Cloth"],
      isItemUsableByClass: () => true,
      getKeyLabel: (keyId) => keyId,
      getItemEffectiveLevel: (item) => Number(item?.minLevel || 0) + Number(item?.quality || 0),
      getMissionLootLevelRange,
      resolveMissionRewardQualities,
      getDungeonStepLootConfig: () => ({
        includeWorldDrops: false,
        dungeonOnly: true,
        worldOnly: false,
      }),
      getDungeonStepQualityPriority: () => [4],
      getDungeonBossCount,
      getDungeonQuarterExpMultiplier,
      getDungeonOverlevelExpMultiplier,
      getMissionLevelExpMultiplier,
      getReqExp: () => 1000,
      getMissionGoldReward,
    });
    const mission = {
      id: "mc",
      name: "Molten Core",
      type: "dungeon",
      memberIds: ["mage"],
      recommended: "58 - 60",
      minLevel: 56,
      level: 60,
      exp: 100,
      gold: 0,
      dungeonSetId: "molten_core",
      dungeonSetName: "Molten Core",
      dungeonBosses: ["Lucifron"],
      dungeonProgress: { clearedSteps: 1 },
    };
    const roster = [
      {
        id: "mage",
        name: "Mage",
        charClass: "Mage",
        level: 60,
        exp: 0,
        keys: [],
        clearedMissionIds: [],
        history: [],
        equipment: {
          chest: { slot: "chest", quality: 1, type: "Cloth", minLevel: 1 },
        },
      },
    ];

    const stepReward = processor.awardDungeonStepLoot({
      mission,
      currentRoster: roster,
      stepLog: {
        type: "dungeon-step",
        outcome: "cleared",
        step: 1,
        bossName: "Lucifron",
      },
    });

    expect(stepReward.updatedRoster[0].equipment.chest.name).toBe("Lucifron Robe");
    expect(stepReward.missionLogs).toEqual([
      expect.objectContaining({
        type: "loot",
        characterName: "Mage",
        itemName: "Lucifron Robe",
        bossName: "Lucifron",
      }),
    ]);
    expect(stepReward.mission.dungeonProgress.lootAwardedSteps).toEqual([1]);

    const finalReward = processor({
      mission: {
        ...stepReward.mission,
        dungeonProgress: {
          ...stepReward.mission.dungeonProgress,
          finished: true,
        },
      },
      currentRoster: stepReward.updatedRoster,
      activeGuildStats: { expMultiplier: 1, goldMultiplier: 1 },
      activeFocusBonuses: { expMultiplier: 1, fullPartyGoldMultiplier: 1 },
      levelCap: 60,
      failedMissionExpFactor: 0.2,
    });

    expect(finalReward.missionLogs.filter((log) => log.type === "loot")).toEqual([]);
  });
});

describe("Molten Core loot manifest", () => {
  const moltenCoreItems = DB_ITEMS.filter(
    (item) => item.dungeonSetId === "molten_core",
  );

  it("converts active manifest entries into valid database items", () => {
    expect(MOLTEN_CORE_ACTIVE_LOOT_MANIFEST.length).toBeGreaterThan(40);
    expect(MOLTEN_CORE_ITEMS.length).toBe(MOLTEN_CORE_ACTIVE_LOOT_MANIFEST.length);
    MOLTEN_CORE_ITEMS.forEach((item) => {
      expect(item.wowheadId).toBeTypeOf("number");
      expect(item.icon).toContain("wow/icons/large/");
      expect(item.dungeonSetId).toBe("molten_core");
      expect(item.dungeonSetName).toBe("Molten Core");
      expect(item.slot).toBeTruthy();
      expect(item.quality).toBeGreaterThan(0);
      expect(item.sourceBosses.length).toBeGreaterThan(0);
    });
  });

  it("keeps unsupported Molten Core drops out of active reward items", () => {
    const activeWowheadIds = new Set(moltenCoreItems.map((item) => item.wowheadId));
    expect(unsupportedMoltenCoreDrops.length).toBeGreaterThan(0);
    unsupportedMoltenCoreDrops.forEach((item) => {
      expect(activeWowheadIds.has(item.wowheadId)).toBe(false);
    });
  });
});

describe("dungeon engine", () => {
  const mission = {
    id: "deadmines",
    name: "Deadmines",
    type: "dungeon",
    startTime: 0,
    totalDuration: 4000,
    finishTime: 4000,
    successChance: 100,
    dungeonBosses: ["Rhahk'Zor", "VanCleef"],
  };

  it("clears all bosses in instant mode when rolls succeed", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = advanceDungeonMission(mission, 4000, true);

    expect(result.mission.missionSuccess).toBe(true);
    expect(result.mission.dungeonProgress.clearedSteps).toBe(2);
    expect(result.stepLogs.map((log) => log.outcome)).toEqual(["cleared", "cleared"]);
  });

  it("fails once attempts are exhausted", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const failingMission = {
      ...mission,
      successChance: 0,
      maxAttempts: 1,
      dungeonProgress: getDefaultDungeonProgress(mission, 0, 4000),
    };
    const result = advanceDungeonMission(failingMission, 4000, true);

    expect(result.mission.missionSuccess).toBe(false);
    expect(result.mission.dungeonProgress.finished).toBe(true);
    expect(result.mission.dungeonProgress.failedAtStep).toBe(1);
    expect(result.stepLogs.some((log) => log.type === "mission-attempt")).toBe(true);
  });
});
