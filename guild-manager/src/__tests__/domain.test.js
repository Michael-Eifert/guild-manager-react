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
import { INITIAL_MISSIONS } from "../constants";
import { getItemEffectiveLevel, isItemUsableByClass } from "../utils";
import {
  CALENDAR_DAY_MS,
  CALENDAR_SERIES_TYPE,
  CALENDAR_STATUS,
  CALENDAR_TIME_OF_DAY,
  buildCalendarEvent,
  buildCalendarSeries,
  cancelCalendarSeriesEvents,
  createInitialCalendarState,
  getCalendarDate,
  getCalendarDayIndex,
  getCalendarDayProgress,
  getCalendarTimeOfDayOption,
  getDungeonMissionPreemption,
  materializeCalendarSeriesEvents,
  refreshCalendarState,
} from "../calendar/calendarLogic";
import {
  getRaidResetWindow,
  getRaidLockoutStatus,
  startRaidLockout,
  updateRaidLockoutProgress,
} from "../raids/raidLockouts";
import { DB_ITEMS } from "../data/items";
import {
  MOLTEN_CORE_ACTIVE_LOOT_MANIFEST,
  MOLTEN_CORE_ITEMS,
  unsupportedMoltenCoreDrops,
} from "../data/imports/moltenCoreLootManifest";
import {
  ZUL_GURUB_ACTIVE_LOOT_MANIFEST,
  ZUL_GURUB_ITEMS,
  unsupportedZulGurubDrops,
} from "../data/imports/zulGurubLootManifest";
import {
  AHN_QIRAJ_RUINS_ACTIVE_LOOT_MANIFEST,
  AHN_QIRAJ_RUINS_ITEMS,
  unsupportedAhnQirajRuinsDrops,
} from "../data/imports/ahnQirajRuinsLootManifest";
import {
  AHN_QIRAJ_TEMPLE_ACTIVE_LOOT_MANIFEST,
  AHN_QIRAJ_TEMPLE_ITEMS,
  unsupportedAhnQirajTempleDrops,
} from "../data/imports/ahnQirajTempleLootManifest";
import {
  BLACKWING_LAIR_ACTIVE_LOOT_MANIFEST,
  BLACKWING_LAIR_ITEMS,
  unsupportedBlackwingLairDrops,
} from "../data/imports/blackwingLairLootManifest";
import {
  ONYXIAS_LAIR_ACTIVE_LOOT_MANIFEST,
  ONYXIAS_LAIR_ITEMS,
} from "../data/imports/onyxiasLairLootManifest";
import {
  LOWER_BLACKROCK_SPIRE_ACTIVE_LOOT_MANIFEST,
  LOWER_BLACKROCK_SPIRE_ITEMS,
} from "../data/imports/lowerBlackrockSpireLootManifest";
import {
  UPPER_BLACKROCK_SPIRE_ACTIVE_LOOT_MANIFEST,
  UPPER_BLACKROCK_SPIRE_ITEMS,
  unsupportedUpperBlackrockSpireDrops,
} from "../data/imports/upperBlackrockSpireLootManifest";

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

  it("persists and hydrates calendar state", () => {
    const calendarState = {
      calendarEpochGameTimeMs: 1000,
      calendarEvents: [
        buildCalendarEvent({
          id: "event-1",
          title: "MC Raid",
          missionId: 62,
          scheduledDayIndex: 3,
          createdAtDayIndex: 1,
        }),
      ],
      calendarSeries: [
        buildCalendarSeries({
          id: "series-1",
          title: "Thursday MC",
          missionId: 62,
          weekday: 3,
          scheduledTimeOfDay: CALENDAR_TIME_OF_DAY.MIDDAY,
          startsOnDayIndex: 0,
        }),
      ],
      calendarEventHistory: [{ id: "history-1", eventId: "event-1" }],
    };
    const payload = buildSessionPayload({
      roster: [],
      activeMissions: [],
      missionList: [],
      guildLog: [],
      guildGold: 0,
      guildProgress: createInitialGuildProgress(),
      guildSetup: { hasStarted: true },
      calendarState,
      gameSpeed: DEFAULT_GAME_SPEED,
      isPaused: false,
      gameTimeMs: 1000,
    });
    const result = hydrateSessionData({
      payloadData: payload.data,
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

    expect(result.loadedCalendarState.calendarEvents[0].title).toBe("MC Raid");
    expect(result.loadedCalendarState.calendarSeries[0].weekday).toBe(3);
    expect(result.loadedCalendarState.calendarEventHistory).toHaveLength(1);
  });
});

describe("calendar logic", () => {
  it("converts compressed game time into calendar dates", () => {
    expect(getCalendarDayIndex(1000 + CALENDAR_DAY_MS * 2, 1000)).toBe(2);
    expect(getCalendarDayProgress(1000 + CALENDAR_DAY_MS * 1.5, 1000)).toBe(
      0.5,
    );
    expect(getCalendarTimeOfDayOption(CALENDAR_TIME_OF_DAY.MORNING)).toMatchObject({
      label: "Morning",
      dayProgress: 0.25,
    });
    expect(getCalendarDate(0)).toMatchObject({
      weekdayName: "Monday",
      monthName: "January",
      dayOfMonth: 1,
      year: 1,
    });
    expect(getCalendarDate(31)).toMatchObject({
      monthName: "February",
      dayOfMonth: 1,
    });
    expect(getCalendarDate(365)).toMatchObject({
      monthName: "January",
      dayOfMonth: 1,
      year: 2,
    });
  });

  it("materializes weekly raid series without duplicates", () => {
    const state = {
      ...createInitialCalendarState(0),
      calendarSeries: [
        buildCalendarSeries({
          id: "series-1",
          title: "Thursday MC",
          missionId: 62,
          weekday: 3,
          scheduledTimeOfDay: CALENDAR_TIME_OF_DAY.MIDDAY,
          startsOnDayIndex: 0,
        }),
      ],
    };
    const first = materializeCalendarSeriesEvents({
      state,
      currentDayIndex: 0,
      createId: () => "fallback-id",
      horizonDays: 14,
    });
    const second = materializeCalendarSeriesEvents({
      state: first,
      currentDayIndex: 0,
      createId: () => "fallback-id",
      horizonDays: 14,
    });

    expect(first.calendarEvents.map((event) => event.scheduledDayIndex)).toEqual([
      3,
      10,
    ]);
    expect(first.calendarEvents[0].scheduledTimeOfDay).toBe(
      CALENDAR_TIME_OF_DAY.MIDDAY,
    );
    expect(second.calendarEvents).toHaveLength(first.calendarEvents.length);
  });

  it("limits weekly series materialization to the configured duration", () => {
    const state = {
      ...createInitialCalendarState(0),
      calendarSeries: [
        buildCalendarSeries({
          id: "series-1",
          title: "Thursday MC",
          missionId: 62,
          weekday: 3,
          startsOnDayIndex: 0,
          durationWeeks: 4,
        }),
      ],
    };
    const result = materializeCalendarSeriesEvents({
      state,
      currentDayIndex: 0,
      createId: () => "fallback-id",
      horizonDays: 70,
    });

    expect(result.calendarEvents.map((event) => event.scheduledDayIndex)).toEqual([
      3,
      10,
      17,
      24,
    ]);
  });

  it("materializes interval raid series without duplicates", () => {
    const state = {
      ...createInitialCalendarState(0),
      calendarSeries: [
        buildCalendarSeries({
          id: "zg-series",
          title: "ZG Reset",
          missionId: 63,
          weekday: 0,
          scheduledTimeOfDay: CALENDAR_TIME_OF_DAY.EVENING,
          startsOnDayIndex: 0,
          seriesType: CALENDAR_SERIES_TYPE.INTERVAL,
          intervalDays: 3,
        }),
      ],
    };
    const first = materializeCalendarSeriesEvents({
      state,
      currentDayIndex: 0,
      createId: () => "fallback-id",
      horizonDays: 10,
    });
    const second = materializeCalendarSeriesEvents({
      state: first,
      currentDayIndex: 0,
      createId: () => "fallback-id",
      horizonDays: 10,
    });

    expect(first.calendarEvents.map((event) => event.scheduledDayIndex)).toEqual([
      0,
      3,
      6,
      9,
    ]);
    expect(second.calendarEvents).toHaveLength(first.calendarEvents.length);
  });

  it("cancels future events from a calendar series", () => {
    const state = {
      ...createInitialCalendarState(0),
      calendarSeries: [
        buildCalendarSeries({
          id: "series-1",
          title: "Thursday MC",
          missionId: 62,
          weekday: 3,
          startsOnDayIndex: 0,
        }),
      ],
      calendarEvents: [
        {
          ...buildCalendarEvent({
            id: "past-event",
            title: "Past MC",
            missionId: 62,
            scheduledDayIndex: 3,
            createdAtDayIndex: 0,
            seriesId: "series-1",
          }),
          status: CALENDAR_STATUS.COMPLETED,
        },
        buildCalendarEvent({
          id: "future-event",
          title: "Future MC",
          missionId: 62,
          scheduledDayIndex: 10,
          createdAtDayIndex: 0,
          seriesId: "series-1",
        }),
      ],
    };
    const result = cancelCalendarSeriesEvents({
      state,
      seriesId: "series-1",
      currentDayIndex: 5,
    });

    expect(result.calendarSeries[0].active).toBe(false);
    expect(result.calendarEvents.find((event) => event.id === "past-event").status).toBe(
      CALENDAR_STATUS.COMPLETED,
    );
    expect(result.calendarEvents.find((event) => event.id === "future-event").status).toBe(
      CALENDAR_STATUS.CANCELLED,
    );
  });

  it("preempts dungeon missions that contain raid members", () => {
    const result = getDungeonMissionPreemption({
      activeMissions: [
        {
          instanceId: "dungeon-1",
          type: "dungeon",
          name: "Blackrock Spire",
          memberIds: ["tank", "dps"],
        },
        {
          instanceId: "quest-1",
          type: "zone",
          name: "Ashenvale",
          memberIds: ["scout"],
        },
      ],
      memberIds: ["dps"],
    });

    expect(result.canceledMissions).toEqual([
      {
        missionKey: "dungeon-1",
        missionName: "Blackrock Spire",
        memberIds: ["tank", "dps"],
      },
    ]);
    expect(result.affectedMemberIds).toEqual(["tank", "dps"]);
  });

  it("readies events and auto-signs eligible attuned characters", () => {
    const mission = {
      id: 62,
      name: "Molten Core",
      isRaid: true,
      entryLevel: 56,
      requiredPartySize: 2,
      requiresKey: true,
      requiresKeyForAllMembers: true,
      keyId: "molten_core_attunement",
      raidRoleRequirement: { Tank: 1, Healer: 0, DPS: 1 },
    };
    const state = {
      ...createInitialCalendarState(0),
      calendarEvents: [
        buildCalendarEvent({
          id: "event-1",
          title: "MC Raid",
          missionId: 62,
          scheduledDayIndex: 2,
          createdAtDayIndex: 0,
        }),
      ],
    };
    const roster = [
      {
        id: "tank",
        name: "Tank",
        role: "Tank",
        level: 60,
        keys: ["molten_core_attunement"],
      },
      {
        id: "dps",
        name: "Dps",
        role: "DPS",
        level: 60,
        keys: ["molten_core_attunement"],
      },
      {
        id: "missing-key",
        name: "No Key",
        role: "DPS",
        level: 60,
        keys: [],
      },
    ];
    const result = refreshCalendarState({
      state,
      currentDayIndex: 2,
      roster,
      activeMissions: [],
      missionList: [mission],
      createId: () => "new-id",
    });
    const event = result.state.calendarEvents[0];

    expect(event.status).toBe(CALENDAR_STATUS.READY);
    expect(event.registrations).toEqual(["tank", "dps"]);
    expect(event.approvedRosterIds).toEqual(["tank", "dps"]);
    expect(event.benchedIds).toEqual([]);
    expect(result.newlyReadyEvents).toHaveLength(1);
  });

  it("keeps characters from auto-signing more than one raid on the same day", () => {
    const mission = {
      id: 62,
      name: "Molten Core",
      isRaid: true,
      entryLevel: 56,
      requiredPartySize: 2,
      raidRoleRequirement: { Tank: 1, Healer: 0, DPS: 1 },
    };
    const state = {
      ...createInitialCalendarState(0),
      calendarEvents: [
        buildCalendarEvent({
          id: "event-1",
          title: "First Raid",
          missionId: 62,
          scheduledDayIndex: 2,
          createdAtDayIndex: 0,
        }),
        buildCalendarEvent({
          id: "event-2",
          title: "Second Raid",
          missionId: 62,
          scheduledDayIndex: 2,
          createdAtDayIndex: 0,
        }),
      ],
    };
    const roster = [
      { id: "tank", name: "Tank", role: "Tank", level: 60 },
      { id: "dps", name: "Dps", role: "DPS", level: 60 },
    ];
    const result = refreshCalendarState({
      state,
      currentDayIndex: 2,
      roster,
      activeMissions: [],
      missionList: [mission],
      createId: () => "new-id",
    });

    expect(result.state.calendarEvents[0].registrations).toEqual(["tank", "dps"]);
    expect(result.state.calendarEvents[1].registrations).toEqual([]);
  });

  it("excludes signups when a raid is completed until reset", () => {
    const mission = {
      id: 63,
      name: "Zul'Gurub",
      isRaid: true,
      entryLevel: 58,
      requiredPartySize: 2,
      raidReset: { type: "interval", intervalDays: 3, anchorDayIndex: 0 },
    };
    const state = {
      ...createInitialCalendarState(0),
      calendarEvents: [
        buildCalendarEvent({
          id: "event-1",
          title: "ZG Raid",
          missionId: 63,
          scheduledDayIndex: 1,
          createdAtDayIndex: 0,
        }),
      ],
    };
    const completedLockouts = updateRaidLockoutProgress({
      raidLockouts: {},
      mission,
      currentDayIndex: 1,
      memberIds: ["hero"],
      clearedSteps: 9,
      totalBosses: 9,
    });
    const result = refreshCalendarState({
      state,
      currentDayIndex: 1,
      roster: [{ id: "hero", name: "Hero", role: "DPS", level: 60 }],
      activeMissions: [],
      missionList: [mission],
      createId: () => "new-id",
      getRaidLockoutStatus: ({ mission: raidMission, currentDayIndex, memberIds }) =>
        getRaidLockoutStatus({
          raidLockouts: completedLockouts,
          mission: raidMission,
          currentDayIndex,
          memberIds,
        }),
    });

    expect(result.state.calendarEvents[0].registrations).toEqual([]);
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

describe("Zul'Gurub raid integration", () => {
  const zulGurubMission = INITIAL_MISSIONS.find(
    (mission) => mission.name === "Zul'Gurub",
  );
  const zulGurubItems = DB_ITEMS.filter(
    (item) => item.dungeonSetId === "zul_gurub",
  );

  it("defines Zul'Gurub as a 20-player no-attunement raid", () => {
    expect(zulGurubMission).toBeTruthy();
    expect(zulGurubMission.isRaid).toBe(true);
    expect(zulGurubMission.requiredPartySize).toBe(20);
    expect(zulGurubMission.minLevel).toBe(58);
    expect(zulGurubMission.entryLevel).toBe(58);
    expect(zulGurubMission.requiresKey).toBeFalsy();
    expect(getDungeonBossCount(zulGurubMission)).toBe(9);
    expect(zulGurubMission.raidReset).toMatchObject({
      type: "interval",
      intervalDays: 3,
      anchorDayIndex: 0,
    });
  });

  it("converts active manifest entries into valid database items", () => {
    expect(ZUL_GURUB_ACTIVE_LOOT_MANIFEST.length).toBeGreaterThan(20);
    expect(ZUL_GURUB_ITEMS.length).toBeGreaterThan(15);
    ZUL_GURUB_ITEMS.forEach((item) => {
      expect(item.wowheadId).toBeTypeOf("number");
      expect(item.icon).toContain("wow/icons/large/");
      expect(item.dungeonSetId).toBe("zul_gurub");
      expect(item.dungeonSetName).toBe("Zul'Gurub");
      expect(item.slot).toBeTruthy();
      expect(item.quality).toBeGreaterThan(0);
      expect(item.sourceBosses.length).toBeGreaterThan(0);
    });
  });

  it("keeps unsupported Zul'Gurub drops out of active reward items", () => {
    const activeWowheadIds = new Set(zulGurubItems.map((item) => item.wowheadId));
    expect(unsupportedZulGurubDrops.length).toBeGreaterThan(0);
    unsupportedZulGurubDrops.forEach((item) => {
      expect(activeWowheadIds.has(item.wowheadId)).toBe(false);
    });
  });
});

describe("Ahn'Qiraj raid integration", () => {
  const aq20Mission = INITIAL_MISSIONS.find(
    (mission) => mission.name === "Ruins of Ahn'Qiraj",
  );
  const aq40Mission = INITIAL_MISSIONS.find(
    (mission) => mission.name === "Temple of Ahn'Qiraj",
  );
  const aq20Items = DB_ITEMS.filter(
    (item) => item.dungeonSetId === "ahn_qiraj_ruins",
  );
  const aq40Items = DB_ITEMS.filter(
    (item) => item.dungeonSetId === "ahn_qiraj_temple",
  );

  it("defines AQ20 as a 20-player no-attunement 3-day raid", () => {
    expect(aq20Mission).toBeTruthy();
    expect(aq20Mission.isRaid).toBe(true);
    expect(aq20Mission.requiredPartySize).toBe(20);
    expect(aq20Mission.minLevel).toBe(58);
    expect(aq20Mission.entryLevel).toBe(58);
    expect(aq20Mission.requiresKey).toBe(false);
    expect(getDungeonBossCount(aq20Mission)).toBe(6);
    expect(aq20Mission.raidReset).toMatchObject({
      type: "interval",
      intervalDays: 3,
      anchorDayIndex: 0,
    });
  });

  it("defines AQ40 as a 40-player no-attunement Wednesday-reset raid", () => {
    expect(aq40Mission).toBeTruthy();
    expect(aq40Mission.isRaid).toBe(true);
    expect(aq40Mission.requiredPartySize).toBe(40);
    expect(aq40Mission.minLevel).toBe(60);
    expect(aq40Mission.entryLevel).toBe(60);
    expect(aq40Mission.requiresKey).toBe(false);
    expect(getDungeonBossCount(aq40Mission)).toBe(9);
    expect(aq40Mission.raidReset).toMatchObject({
      type: "weekly",
      weekday: 2,
    });
  });

  it("converts AQ20 manifest entries into valid database items", () => {
    expect(AHN_QIRAJ_RUINS_ACTIVE_LOOT_MANIFEST.length).toBeGreaterThan(12);
    expect(AHN_QIRAJ_RUINS_ITEMS.length).toBeGreaterThan(10);
    AHN_QIRAJ_RUINS_ITEMS.forEach((item) => {
      expect(item.id).toBeTypeOf("number");
      expect(item.icon).toContain("wow/icons/large/");
      expect(item.dungeonSetId).toBe("ahn_qiraj_ruins");
      expect(item.dungeonSetName).toBe("Ruins of Ahn'Qiraj");
      expect(item.slot).toBeTruthy();
      expect(item.quality).toBeGreaterThan(0);
      expect(item.sourceBosses.length).toBeGreaterThan(0);
    });
  });

  it("converts AQ40 manifest entries into valid database items", () => {
    expect(AHN_QIRAJ_TEMPLE_ACTIVE_LOOT_MANIFEST.length).toBeGreaterThan(25);
    expect(AHN_QIRAJ_TEMPLE_ITEMS.length).toBeGreaterThan(20);
    AHN_QIRAJ_TEMPLE_ITEMS.forEach((item) => {
      expect(item.id).toBeTypeOf("number");
      expect(item.icon).toContain("wow/icons/large/");
      expect(item.dungeonSetId).toBe("ahn_qiraj_temple");
      expect(item.dungeonSetName).toBe("Temple of Ahn'Qiraj");
      expect(item.slot).toBeTruthy();
      expect(item.quality).toBeGreaterThan(0);
      expect(item.sourceBosses.length).toBeGreaterThan(0);
    });
  });

  it("keeps unsupported AQ drops out of active reward items", () => {
    const activeAq20Ids = new Set(aq20Items.map((item) => item.id));
    const activeAq40Ids = new Set(aq40Items.map((item) => item.id));
    expect(unsupportedAhnQirajRuinsDrops.length).toBeGreaterThan(0);
    expect(unsupportedAhnQirajTempleDrops.length).toBeGreaterThan(0);
    unsupportedAhnQirajRuinsDrops.forEach((item) => {
      expect(activeAq20Ids.has(item.internalId)).toBe(false);
    });
    unsupportedAhnQirajTempleDrops.forEach((item) => {
      expect(activeAq40Ids.has(item.internalId)).toBe(false);
    });
  });
});

describe("Tier 2 raid integration", () => {
  const onyxiaMission = INITIAL_MISSIONS.find(
    (mission) => mission.name === "Onyxia's Lair",
  );
  const blackwingLairMission = INITIAL_MISSIONS.find(
    (mission) => mission.name === "Blackwing Lair",
  );
  const onyxiaItems = DB_ITEMS.filter(
    (item) => item.dungeonSetId === "onyxias_lair",
  );
  const blackwingLairItems = DB_ITEMS.filter(
    (item) => item.dungeonSetId === "blackwing_lair",
  );
  const tierTwoItems = DB_ITEMS.filter((item) =>
    String(item.setId || "").startsWith("t2_"),
  );

  it("defines Onyxia and Blackwing Lair as Wednesday-reset raids", () => {
    expect(onyxiaMission).toBeTruthy();
    expect(onyxiaMission.isRaid).toBe(true);
    expect(onyxiaMission.requiredPartySize).toBe(40);
    expect(onyxiaMission.requiresKey).toBe(false);
    expect(getDungeonBossCount(onyxiaMission)).toBe(1);
    expect(onyxiaMission.raidReset).toMatchObject({
      type: "weekly",
      weekday: 2,
    });

    expect(blackwingLairMission).toBeTruthy();
    expect(blackwingLairMission.isRaid).toBe(true);
    expect(blackwingLairMission.requiredPartySize).toBe(40);
    expect(blackwingLairMission.requiresKey).toBe(false);
    expect(getDungeonBossCount(blackwingLairMission)).toBe(8);
    expect(blackwingLairMission.raidReset).toMatchObject({
      type: "weekly",
      weekday: 2,
    });
  });

  it("adds Onyxia Tier 2 helms and Blackwing Lair Tier 2 drops", () => {
    expect(ONYXIAS_LAIR_ACTIVE_LOOT_MANIFEST.length).toBeGreaterThan(9);
    expect(BLACKWING_LAIR_ACTIVE_LOOT_MANIFEST.length).toBeGreaterThan(25);
    expect(ONYXIAS_LAIR_ITEMS.filter((item) => item.setId?.startsWith("t2_"))).toHaveLength(9);
    expect(BLACKWING_LAIR_ITEMS.filter((item) => item.setId?.startsWith("t2_")).length)
      .toBeGreaterThanOrEqual(27);
    expect(unsupportedBlackwingLairDrops.length).toBeGreaterThan(20);
    expect(tierTwoItems.length).toBeGreaterThanOrEqual(36);
  });

  it("converts Tier 2 raid manifest entries into valid database items", () => {
    [...onyxiaItems, ...blackwingLairItems].forEach((item) => {
      expect(item.id).toBeTypeOf("number");
      expect(item.icon).toContain("wow/icons/large/");
      expect(item.quality).toBe(4);
      expect(item.minLevel).toBe(60);
      expect(item.sourceBosses.length).toBeGreaterThan(0);
    });
  });
});

describe("item level tuning", () => {
  const getItemsBySource = (sourceId) =>
    DB_ITEMS.filter((item) => item.dungeonSetId === sourceId);
  const expectItemLevelsWithin = (items, minItemLevel, maxItemLevel) => {
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => {
      const itemLevel = getItemEffectiveLevel(item);
      expect(itemLevel).toBeGreaterThanOrEqual(minItemLevel);
      expect(itemLevel).toBeLessThanOrEqual(maxItemLevel);
    });
  };

  it("keeps late dungeon loot below raid item-level bands", () => {
    expectItemLevelsWithin(
      getItemsBySource("stratholme").filter(
        (item) => !String(item.setId || "").startsWith("t0_"),
      ),
      56,
      60,
    );
    expectItemLevelsWithin(
      DB_ITEMS.filter((item) => String(item.setId || "").startsWith("t0_")),
      57,
      62,
    );
    expectItemLevelsWithin(
      getItemsBySource("blackrock_depths"),
      52,
      58,
    );
    expectItemLevelsWithin(getItemsBySource("blackrock_spire"), 57, 63);
  });

  it("keeps raid loot in Classic item-level bands", () => {
    expectItemLevelsWithin(getItemsBySource("zul_gurub"), 61, 70);
    expectItemLevelsWithin(getItemsBySource("ahn_qiraj_ruins"), 61, 70);
    expectItemLevelsWithin(getItemsBySource("molten_core"), 66, 80);
    expectItemLevelsWithin(getItemsBySource("onyxias_lair"), 76, 76);
    expectItemLevelsWithin(getItemsBySource("blackwing_lair"), 76, 76);
    expectItemLevelsWithin(getItemsBySource("ahn_qiraj_temple"), 73, 88);
  });

  it("supports explicit itemLevel over min-level quality fallback", () => {
    expect(getItemEffectiveLevel({ minLevel: 60, quality: 4, itemLevel: 63 })).toBe(63);
  });
});

describe("raid lockouts", () => {
  const moltenCoreMission = INITIAL_MISSIONS.find(
    (mission) => mission.name === "Molten Core",
  );
  const zulGurubMission = INITIAL_MISSIONS.find(
    (mission) => mission.name === "Zul'Gurub",
  );
  const aq20Mission = INITIAL_MISSIONS.find(
    (mission) => mission.name === "Ruins of Ahn'Qiraj",
  );
  const aq40Mission = INITIAL_MISSIONS.find(
    (mission) => mission.name === "Temple of Ahn'Qiraj",
  );

  it("computes Zul'Gurub 3-day reset windows from Monday day 0", () => {
    expect([0, 1, 2, 3, 4, 6, 9].map((day) =>
      getRaidResetWindow(zulGurubMission, day).resetStartDayIndex,
    )).toEqual([0, 0, 0, 3, 3, 6, 9]);
    expect([0, 3, 6, 9].map((day) =>
      getRaidResetWindow(zulGurubMission, day).nextResetDayIndex,
    )).toEqual([3, 6, 9, 12]);
  });

  it("computes Molten Core weekly Wednesday windows", () => {
    expect(getRaidResetWindow(moltenCoreMission, 0)).toMatchObject({
      resetStartDayIndex: 0,
      nextResetDayIndex: 7,
    });
    expect(getRaidResetWindow(moltenCoreMission, 2)).toMatchObject({
      resetStartDayIndex: 2,
      nextResetDayIndex: 9,
    });
    expect(getRaidResetWindow(moltenCoreMission, 8)).toMatchObject({
      resetStartDayIndex: 2,
      nextResetDayIndex: 9,
    });
  });

  it("computes Ahn'Qiraj reset windows", () => {
    expect([0, 1, 2, 3, 4, 6, 9].map((day) =>
      getRaidResetWindow(aq20Mission, day).resetStartDayIndex,
    )).toEqual([0, 0, 0, 3, 3, 6, 9]);
    expect(getRaidResetWindow(aq40Mission, 2)).toMatchObject({
      resetStartDayIndex: 2,
      nextResetDayIndex: 9,
    });
  });

  it("blocks completed lockouts until reset then unlocks", () => {
    const lockouts = updateRaidLockoutProgress({
      raidLockouts: {},
      mission: zulGurubMission,
      currentDayIndex: 1,
      memberIds: ["hero"],
      clearedSteps: 9,
      totalBosses: 9,
    });

    expect(
      getRaidLockoutStatus({
        raidLockouts: lockouts,
        mission: zulGurubMission,
        currentDayIndex: 2,
        memberIds: ["hero"],
      }).isCompletedLocked,
    ).toBe(true);
    expect(
      getRaidLockoutStatus({
        raidLockouts: lockouts,
        mission: zulGurubMission,
        currentDayIndex: 3,
        memberIds: ["hero"],
      }).isCompletedLocked,
    ).toBe(false);
  });

  it("keeps partial lockouts continuable with saved boss progress", () => {
    const started = startRaidLockout({
      raidLockouts: {},
      mission: zulGurubMission,
      currentDayIndex: 1,
      memberIds: ["tank", "healer"],
      totalBosses: 9,
    });
    const lockouts = updateRaidLockoutProgress({
      raidLockouts: started,
      mission: zulGurubMission,
      currentDayIndex: 1,
      memberIds: ["tank", "healer", "dps"],
      clearedSteps: 4,
      totalBosses: 9,
    });
    const status = getRaidLockoutStatus({
      raidLockouts: lockouts,
      mission: zulGurubMission,
      currentDayIndex: 2,
      memberIds: ["tank", "dps"],
    });

    expect(status.canEnter).toBe(true);
    expect(status.clearedSteps).toBe(4);
    expect(status.lockout.participantIds.sort()).toEqual([
      "dps",
      "healer",
      "tank",
    ]);
  });

  it("keeps separate character raid IDs from mixing while allowing unsaved characters to join either", () => {
    const lockoutOne = startRaidLockout({
      raidLockouts: {},
      mission: zulGurubMission,
      currentDayIndex: 1,
      memberIds: ["a"],
      totalBosses: 9,
    });
    const lockoutTwo = startRaidLockout({
      raidLockouts: lockoutOne,
      mission: zulGurubMission,
      currentDayIndex: 1,
      memberIds: ["b"],
      totalBosses: 9,
    });

    expect(
      getRaidLockoutStatus({
        raidLockouts: lockoutTwo,
        mission: zulGurubMission,
        currentDayIndex: 1,
        memberIds: ["a", "b"],
      }).hasLockoutConflict,
    ).toBe(true);
    expect(
      getRaidLockoutStatus({
        raidLockouts: lockoutTwo,
        mission: zulGurubMission,
        currentDayIndex: 1,
        memberIds: ["a", "c"],
      }).canEnter,
    ).toBe(true);
    expect(
      getRaidLockoutStatus({
        raidLockouts: lockoutTwo,
        mission: zulGurubMission,
        currentDayIndex: 1,
        memberIds: ["b", "c"],
      }).canEnter,
    ).toBe(true);
  });
});

describe("Lower Blackrock Spire integration", () => {
  const lbrsMission = INITIAL_MISSIONS.find(
    (mission) => mission.dungeonWing === "Lower Blackrock Spire",
  );
  const lbrsItems = DB_ITEMS.filter(
    (item) =>
      item.dungeonSetId === "blackrock_spire" &&
      item.dungeonWing === "Lower Blackrock Spire",
  );

  it("adds LBRS as an unlocked late-game dungeon with harder tuning", () => {
    expect(lbrsMission).toBeTruthy();
    expect(lbrsMission.name).toBe("Blackrock Spire");
    expect(lbrsMission.requiredPartySize).toBe(5);
    expect(lbrsMission.requiresKey).toBe(false);
    expect(lbrsMission.rewardKeys).toEqual(["seal_of_ascension"]);
    expect(lbrsMission.baseFailChance).toBe(30);
    expect(lbrsMission.recommended).toBe("57 - 60");
    expect(lbrsMission.dungeonBosses).toEqual([
      "Highlord Omokk",
      "Shadow Hunter Vosh'gajin",
      "War Master Voone",
      "Mother Smolderweb",
      "Urok Doomhowl",
      "Quartermaster Zigris",
      "Halycon",
      "Gizrul the Slavener",
      "Overlord Wyrmthalak",
    ]);
  });

  it("converts active LBRS manifest entries into valid database items", () => {
    expect(LOWER_BLACKROCK_SPIRE_ACTIVE_LOOT_MANIFEST.length).toBeGreaterThan(20);
    expect(LOWER_BLACKROCK_SPIRE_ITEMS.length).toBe(
      LOWER_BLACKROCK_SPIRE_ACTIVE_LOOT_MANIFEST.length,
    );
    LOWER_BLACKROCK_SPIRE_ITEMS.forEach((item) => {
      expect(item.wowheadId).toBeTypeOf("number");
      expect(item.icon).toContain("wow/icons/large/");
      expect(item.dungeonSetId).toBe("blackrock_spire");
      expect(item.dungeonSetName).toBe("Blackrock Spire");
      expect(item.dungeonWing).toBe("Lower Blackrock Spire");
      expect(item.slot).toBeTruthy();
      expect(item.quality).toBe(3);
      expect(item.sourceBosses.length).toBeGreaterThan(0);
    });
  });

  it("adds class-restricted Tier 0 pieces to the LBRS reward pool", () => {
    const shadowcraftGloves = lbrsItems.find(
      (item) => item.name === "Shadowcraft Gloves",
    );
    const wildheartBoots = lbrsItems.find(
      (item) => item.name === "Wildheart Boots",
    );
    const beaststalkerGloves = lbrsItems.find(
      (item) => item.name === "Beaststalker's Gloves",
    );

    expect(shadowcraftGloves?.setId).toBe("t0_shadowcraft_armor");
    expect(wildheartBoots?.setId).toBe("t0_wildheart_raiment");
    expect(beaststalkerGloves?.setId).toBe("t0_beaststalker_armor");
    expect(isItemUsableByClass(shadowcraftGloves, "Rogue")).toBe(true);
    expect(isItemUsableByClass(shadowcraftGloves, "Mage")).toBe(false);
    expect(isItemUsableByClass(wildheartBoots, "Druid")).toBe(true);
    expect(isItemUsableByClass(beaststalkerGloves, "Hunter")).toBe(true);
  });
});

describe("Upper Blackrock Spire integration", () => {
  const ubrsMission = INITIAL_MISSIONS.find(
    (mission) => mission.dungeonWing === "Upper Blackrock Spire",
  );
  const ubrsItems = DB_ITEMS.filter(
    (item) =>
      item.dungeonSetId === "blackrock_spire" &&
      item.dungeonWing === "Upper Blackrock Spire",
  );

  it("adds UBRS as the second Blackrock Spire wing with one-key access", () => {
    expect(ubrsMission).toBeTruthy();
    expect(ubrsMission.name).toBe("Blackrock Spire");
    expect(ubrsMission.requiredPartySize).toBe(10);
    expect(ubrsMission.requiresKey).toBe(true);
    expect(ubrsMission.requiresKeyForAllMembers).toBe(false);
    expect(ubrsMission.keyId).toBe("seal_of_ascension");
    expect(ubrsMission.baseFailChance).toBe(30);
    expect(ubrsMission.dungeonBosses).toEqual([
      "Pyroguard Emberseer",
      "Solakar Flamewreath",
      "Goraluk Anvilcrack",
      "Jed Runewatcher",
      "Gyth",
      "Warchief Rend Blackhand",
      "The Beast",
      "General Drakkisath",
    ]);
  });

  it("allows UBRS when one selected member has the Seal of Ascension", () => {
    const result = evaluateMissionKeyAccess({
      missions: [ubrsMission],
      partyMembers: [
        { id: "tank", keys: ["seal_of_ascension"] },
        { id: "healer", keys: [] },
        { id: "dps", keys: [] },
      ],
    });

    expect(result.canEnter).toBe(true);
    expect(result.partyHasAnyRequiredKey).toBe(true);
  });

  it("unlocks UBRS for the full party when LBRS is chained first", () => {
    const lbrsMission = INITIAL_MISSIONS.find(
      (mission) => mission.dungeonWing === "Lower Blackrock Spire",
    );
    const result = evaluateMissionKeyAccess({
      missions: [lbrsMission, ubrsMission],
      partyMembers: [
        { id: "tank", keys: [] },
        { id: "healer", keys: [] },
        { id: "dps", keys: [] },
      ],
    });

    expect(result.canEnter).toBe(true);
    expect(result.unlockedDuringSequence).toEqual(["seal_of_ascension"]);
  });

  it("converts active UBRS manifest entries into valid wing-specific items", () => {
    expect(UPPER_BLACKROCK_SPIRE_ACTIVE_LOOT_MANIFEST.length).toBeGreaterThan(25);
    expect(UPPER_BLACKROCK_SPIRE_ITEMS.length).toBe(
      UPPER_BLACKROCK_SPIRE_ACTIVE_LOOT_MANIFEST.length,
    );
    UPPER_BLACKROCK_SPIRE_ITEMS.forEach((item) => {
      expect(item.wowheadId).toBeTypeOf("number");
      expect(item.icon).toContain("wow/icons/large/");
      expect(item.dungeonSetId).toBe("blackrock_spire");
      expect(item.dungeonSetName).toBe("Blackrock Spire");
      expect(item.dungeonWing).toBe("Upper Blackrock Spire");
      expect(item.slot).toBeTruthy();
      expect(item.quality).toBeGreaterThan(0);
      expect(item.sourceBosses.length).toBeGreaterThan(0);
    });
  });

  it("adds UBRS Tier 0 chest pieces to the reward pool", () => {
    const magistersRobes = ubrsItems.find(
      (item) => item.name === "Magister's Robes",
    );
    const breastplateOfValor = ubrsItems.find(
      (item) => item.name === "Breastplate of Valor",
    );

    expect(magistersRobes?.setId).toBe("t0_magisters_regalia");
    expect(breastplateOfValor?.setId).toBe("t0_battlegear_of_valor");
    expect(isItemUsableByClass(magistersRobes, "Mage")).toBe(true);
    expect(isItemUsableByClass(magistersRobes, "Warlock")).toBe(false);
    expect(isItemUsableByClass(breastplateOfValor, "Warrior")).toBe(true);
  });

  it("keeps unsupported UBRS drops out of active reward items", () => {
    const activeWowheadIds = new Set(ubrsItems.map((item) => item.wowheadId));
    expect(unsupportedUpperBlackrockSpireDrops.length).toBeGreaterThan(0);
    unsupportedUpperBlackrockSpireDrops.forEach((item) => {
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
