import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createInitialGuildProgress,
  applyDungeonClearMilestones,
  applyDungeonWipeMilestone,
  applyLevelMilestones,
  applyRosterSizeMilestones,
  buildGuildAchievementEntries,
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
import {
  isMissionMemberGroupAvailable,
  isMissionBoardAvailableStatus,
  pruneOverlappingActiveMissions,
} from "../missions/missionRosterGuards";
import { createMissionRewardProcessor } from "../missions/missionRewards";
import {
  buildRecruitmentEquipment,
  getRecruitmentCapacity,
  getRecruitmentTierOptions,
  resolveRecruitmentResult,
} from "../recruitment/recruitmentLogic";
import {
  hydrateSessionData,
  buildSessionPayload,
  SESSION_FORMAT,
} from "../session/sessionPersistence";
import { ensureRealmState, generateNpcGuilds } from "../server/realmGeneration";
import { capRealmNews, getRealmNewsRenderKey } from "../server/realmNews";
import { advanceRealmSimulation } from "../server/realmSimulation";
import {
  buildPlayerGuildSnapshot,
  buildRealmRankings,
  getPlayerRealmRanking,
} from "../server/realmRankings";
import { getRealmRaidProgressList } from "../server/realmRaidProgress";
import {
  getRealmMaxLevelCount,
  getRealmRosterCap,
} from "../server/realmRosters";
import {
  createRealmPlayer,
  declineRealmGuildApplications,
  getRealmGuildApplications,
  getRealmPlayersInZone,
  getRealmPopulationStats,
  getRealmRecruitmentMarketStats,
  markRealmPlayersRecruited,
  resolvePlayerGuildDeparturesForDay,
  selectRealmRecruitmentCandidates,
} from "../server/realmPopulation";
import {
  advanceDungeonMission,
  getDefaultDungeonProgress,
} from "../game/dungeonEngine";
import {
  DEFAULT_GAME_SPEED,
  normalizeProgressionState,
} from "../progression";
import {
  GUILD_DUNGEON_ACTIVITY,
  GUILD_FOCUS,
  GUILD_FACTION,
  GUILD_SERVER_POPULATION,
  GUILD_SERVER_STYLE,
  INITIAL_MISSIONS,
  KEY_DEFINITIONS,
  DB_FUNNY_NAMES,
  DB_RACES,
} from "../constants";
import {
  applyProfessionSkillAttempts,
  hasIncompleteAccessibleZones,
  resolveCharacterActivityPlan,
  resolveCharacterActivityIntent,
} from "../game/characterActivity";
import {
  MORALE_BAND,
  MORALE_DUNGEON_CLEAR_DELTA,
  MORALE_ELITE_FAILURE_DELTA,
  MORALE_ELITE_SUCCESS_DELTA,
  MORALE_WIPE_DELTA,
  MORALE_ZONE_CLEAR_DELTA,
  applyMoraleDelta,
  clampMorale,
  getCharacterMorale,
  getMoraleBand,
  getMoraleLabel,
  getPartyMoraleSuccessBonus,
  isCharacterInMissionLevelRange,
  isCharacterInZoneLevelRange,
} from "../game/characterMorale";
import {
  PERSONALITY_TRAIT_ID,
  getCharacterLevelingExpMultiplier,
  getCharacterPersonalityTraits,
  getCharacterZoneProgressMultiplier,
  getCharacterDungeonSuccessBonus,
  getCharacterRaidSuccessBonus,
  normalizeCharacterPersonalityTraits,
  rollCharacterPersonalityTraits,
} from "../game/characterPersonality";
import {
  buildCharacterNamePool,
  EQUIPMENT_SLOT_ORDER,
  generateCharacters,
  getEquipmentSetBonuses,
  getItemEffectiveLevel,
  getStarterGear,
  getMissionSuccessPreview,
  isItemUsableByClass,
  pickUniqueCharacterName,
} from "../utils";
import {
  AUTO_DUNGEON_MIN_SUCCESS_CHANCE,
  getAutoDungeonLevelRange,
  getAutoDungeonIntervalMs,
  resolveAutoDungeonAttempt,
} from "../automation/dungeonAutomation";
import {
  buildDungeonAttunementTargets,
  getAttunementEligibleMembers,
} from "../automation/adventureGoals";
import {
  getGuildClassSummary,
  getGuildRoleSummary,
} from "../guild/guildRoleSummary";
import {
  findRelationshipClusters,
  getCharacterRelationshipRows,
  getRelationshipFlairs,
  getRelationshipLevel,
  getRelationshipPairKey,
  getRelationshipSuccessModifier,
  updateRelationshipsForSharedActivity,
} from "../social/relationshipSystem";
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
import {
  ZONE_COMPLETION_ARCHETYPE,
  ZONE_DEFINITIONS,
  getZonePvpTerritory,
  getCharacterZonePreference,
  getZonesForFaction,
  pickNextZoneForCharacter,
} from "../zones/zoneDefinitions";
import { resolveZoneAutoTransition } from "../zones/zoneLogic";
import { WORLD_PVP_PROFILE_TYPE } from "../pvp/worldPvpDefinitions";
import { resolveWorldPvpForDay } from "../pvp/worldPvpEngine";
import {
  getWorldPvpRoamingZoneCandidates,
  resolveWorldPvpRoamingAssignment,
} from "../pvp/worldPvpRoaming";
import {
  ensureWorldPvpState,
  getWorldPvpProfile,
} from "../pvp/worldPvpUtils";
import { ensureCharacterPvpData } from "../pvp/pvpCharacterUtils";
import {
  applyWeeklyPvpRollover,
  awardCharacterHonor,
  PVP_WEEKLY_PROGRESS_CAP,
} from "../pvp/pvpProgression";
import { getUnlockedPvpGearForCharacter } from "../pvp/pvpGearUnlocks";
import { DB_ITEMS } from "../data/items";
import {
  DIRE_MAUL_ACTIVE_LOOT_MANIFEST,
  DIRE_MAUL_ITEMS,
} from "../data/imports/direMaulLootManifest";
import {
  PVP_GEAR_SET_ID,
  PVP_GEAR_SET_NAME,
  PVP_HONOR_SET_ID,
  PVP_HONOR_SET_NAME,
} from "../data/imports/pvpHonorSetItems";
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
  NAXXRAMAS_ACTIVE_LOOT_MANIFEST,
  NAXXRAMAS_ITEMS,
  unsupportedNaxxramasDrops,
} from "../data/imports/naxxramasLootManifest";
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
import {
  DEBUG_BLACKWING_LAIR_TEST_GUILD_ID,
  DEBUG_MOLTEN_CORE_TEST_GUILD_ID,
  DEBUG_NAXXRAMAS_TEST_GUILD_ID,
  buildDebugRosterPreset,
  resolveDebugPreset,
} from "../debug/rosterPresets";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Dire Maul integration", () => {
  const direMaulMissions = INITIAL_MISSIONS.filter(
    (mission) => mission.dungeonSetId === "dire_maul",
  ).sort((left, right) => left.wingOrder - right.wingOrder);
  const direMaulItems = DB_ITEMS.filter(
    (item) => item.dungeonSetId === "dire_maul",
  );

  it("adds East, West, and North with level 50 entry and the requested recommendations", () => {
    expect(direMaulMissions).toHaveLength(3);
    expect(direMaulMissions.map((mission) => mission.dungeonWing)).toEqual([
      "East",
      "West",
      "North",
    ]);
    expect(direMaulMissions.map((mission) => mission.entryLevel)).toEqual([
      50,
      50,
      50,
    ]);
    expect(direMaulMissions.map((mission) => mission.recommended)).toEqual([
      "55 - 60",
      "58 - 60",
      "58 - 60",
    ]);
    expect(direMaulMissions.map((mission) => getDungeonBossCount(mission))).toEqual([
      5,
      5,
      6,
    ]);
  });

  it("uses Dire Maul East to unlock the Crescent Key wings", () => {
    const [east, west, north] = direMaulMissions;
    expect(KEY_DEFINITIONS.crescent_key.name).toBe("Crescent Key");
    expect(east.requiresKey).toBe(false);
    expect(east.rewardKeys).toEqual(["crescent_key"]);
    expect(west.keyId).toBe("crescent_key");
    expect(west.requiresKey).toBe(true);
    expect(north.keyId).toBe("crescent_key");
    expect(north.requiresKey).toBe(true);

    const standaloneWest = evaluateMissionKeyAccess({
      missions: [west],
      partyMembers: [{ id: "tank", keys: [] }],
    });
    const chainedRun = evaluateMissionKeyAccess({
      missions: [east, west, north],
      partyMembers: [{ id: "tank", keys: [] }],
    });

    expect(standaloneWest.canEnter).toBe(false);
    expect(chainedRun.canEnter).toBe(true);
    expect(chainedRun.unlockedDuringSequence).toContain("crescent_key");
  });

  it("registers wing-specific, boss-sourced Dire Maul equipment", () => {
    expect(DIRE_MAUL_ACTIVE_LOOT_MANIFEST.length).toBeGreaterThan(35);
    expect(DIRE_MAUL_ITEMS).toHaveLength(DIRE_MAUL_ACTIVE_LOOT_MANIFEST.length);
    expect(direMaulItems).toHaveLength(DIRE_MAUL_ITEMS.length);
    expect(new Set(direMaulItems.map((item) => item.dungeonWing))).toEqual(
      new Set(["East", "West", "North"]),
    );
    DIRE_MAUL_ITEMS.forEach((item) => {
      expect(item.wowheadId).toBeTypeOf("number");
      expect(item.quality).toBe(3);
      expect(item.sourceBosses.length).toBeGreaterThan(0);
      expect(item.icon).toContain("wow/icons/large/");
    });
  });

  it("includes notable rewards from every wing", () => {
    const expectedDrops = [
      ["East", "Whipvine Cord"],
      ["East", "Satyr's Bow"],
      ["West", "Mindtap Talisman"],
      ["West", "Eldritch Reinforced Legplates"],
      ["North", "Barbarous Blade"],
      ["North", "Rod of the Ogre Magi"],
    ];

    expectedDrops.forEach(([wing, name]) => {
      expect(
        direMaulItems.some(
          (item) => item.dungeonWing === wing && item.name === name,
        ),
        `${wing}: ${name}`,
      ).toBe(true);
    });
  });
});

const getEquippedItemLevels = (member) =>
  Object.values(member?.equipment || {})
    .filter(Boolean)
    .map((item) => getItemEffectiveLevel(item));

const getRosterAverageItemLevel = (roster) => {
  const itemLevels = roster.flatMap(getEquippedItemLevels);
  if (itemLevels.length === 0) return 0;
  return (
    itemLevels.reduce((total, itemLevel) => total + itemLevel, 0) /
    itemLevels.length
  );
};

const getRosterEquipmentSources = (roster) =>
  new Set(
    roster
      .flatMap((member) => Object.values(member?.equipment || {}))
      .filter(Boolean)
      .map((item) => item.dungeonSetId || item.dungeon)
      .filter(Boolean),
  );

const expectRosterHasExpandedEquipment = (roster) => {
  roster.forEach((member) => {
    EQUIPMENT_SLOT_ORDER.forEach((slot) => {
      expect(member.equipment?.[slot], `${member.name} missing ${slot}`).toBeTruthy();
      expect(member.equipment[slot].slot || slot).toBe(slot);
    });
  });
};

const isValidRaceClassCombo = (member) =>
  Array.isArray(DB_RACES[member?.race]) &&
  DB_RACES[member.race].includes(member?.charClass);

describe("character name generation", () => {
  it("adds class and race/class names without putting class labels in the general funny pool", () => {
    expect(DB_FUNNY_NAMES).not.toContain("Paladin");
    expect(
      buildCharacterNamePool({
        race: "Human",
        gender: "Male",
        charClass: "Paladin",
      }),
    ).toEqual(expect.arrayContaining(["Paladin", "Silverhand", "Varian"]));
    expect(
      buildCharacterNamePool({
        race: "Human",
        gender: "Male",
        charClass: "Mage",
      }),
    ).not.toContain("Paladin");
  });

  it("can generate over one thousand unique player names", () => {
    const roster = generateCharacters(1100, GUILD_FACTION.ALLIANCE);
    const normalizedNames = new Set(
      roster.map((member) => String(member.name || "").toLocaleLowerCase()),
    );

    expect(roster).toHaveLength(1100);
    expect(normalizedNames.size).toBe(roster.length);
    expect(roster.every((member) => !/\d/.test(member.name))).toBe(true);
  });

  it("mutates duplicate names with accents and doubled letters instead of numbers", () => {
    const usedNameKeys = new Set();
    const names = Array.from({ length: 25 }, () =>
      pickUniqueCharacterName({
        race: "Human",
        gender: "Male",
        curatedPool: ["Hello25"],
        fallbackPool: ["Hello25"],
        usedNameKeys,
        random: () => 0,
      }),
    );

    expect(new Set(names.map((name) => name.toLocaleLowerCase())).size).toBe(
      names.length,
    );
    expect(names.every((name) => !/\d/.test(name))).toBe(true);
    expect(names).toContain("Hello");
    expect(names).toContain("Helloo");
  });
});

describe("character personality traits", () => {
  it("rolls rare power levelers and common casual gamers by chance bands", () => {
    expect(rollCharacterPersonalityTraits({ random: () => 0.01 })).toEqual([
      PERSONALITY_TRAIT_ID.POWER_LEVELER,
    ]);
    expect(rollCharacterPersonalityTraits({ random: () => 0.1 })).toEqual([
      PERSONALITY_TRAIT_ID.DUNGEON_EXPERT,
    ]);
    expect(rollCharacterPersonalityTraits({ random: () => 0.25 })).toEqual([
      PERSONALITY_TRAIT_ID.RAIDER,
    ]);
    expect(rollCharacterPersonalityTraits({ random: () => 0.4 })).toEqual([
      PERSONALITY_TRAIT_ID.CASUAL_GAMER,
    ]);
    expect(rollCharacterPersonalityTraits({ random: () => 0.9 })).toEqual([]);
  });

  it("normalizes saved traits and applies power leveler progression modifiers", () => {
    const character = {
      personalityTraits: [
        PERSONALITY_TRAIT_ID.POWER_LEVELER,
        "unknown",
        PERSONALITY_TRAIT_ID.POWER_LEVELER,
      ],
    };

    expect(normalizeCharacterPersonalityTraits(character.personalityTraits)).toEqual([
      PERSONALITY_TRAIT_ID.POWER_LEVELER,
    ]);
    expect(getCharacterPersonalityTraits(character)[0].name).toBe("Power Leveler");
    expect(getCharacterLevelingExpMultiplier(character)).toBe(1.5);
    expect(getCharacterZoneProgressMultiplier(character)).toBe(1.5);
  });

  it("keeps casual gamers mechanically neutral", () => {
    const character = {
      personalityTraits: [PERSONALITY_TRAIT_ID.CASUAL_GAMER],
    };

    expect(getCharacterPersonalityTraits(character)[0].name).toBe("Casual Gamer");
    expect(getCharacterLevelingExpMultiplier(character)).toBe(1);
    expect(getCharacterZoneProgressMultiplier(character)).toBe(1);
  });

  it("applies dungeon expert and raider mission success bonuses", () => {
    const dungeonExpert = {
      level: 20,
      role: "Tank",
      personalityTraits: [PERSONALITY_TRAIT_ID.DUNGEON_EXPERT],
    };
    const raider = {
      level: 20,
      role: "Tank",
      personalityTraits: [PERSONALITY_TRAIT_ID.RAIDER],
    };
    const dungeon = { level: 20, baseFailChance: 50, type: "dungeon" };
    const raid = {
      level: 20,
      baseFailChance: 50,
      type: "dungeon",
      isRaid: true,
      requiredPartySize: 1,
      raidRoleRequirement: { Tank: 0, Healer: 0, DPS: 0, bonus: 0 },
    };

    expect(getCharacterDungeonSuccessBonus(dungeonExpert)).toBe(5);
    expect(getCharacterRaidSuccessBonus(raider)).toBe(1);
    expect(getCharacterZoneProgressMultiplier(dungeonExpert)).toBe(1.2);
    expect(getCharacterLevelingExpMultiplier(raider)).toBe(1.25);
    expect(
      getMissionSuccessPreview(dungeon, [dungeonExpert]).personalitySuccessBonus,
    ).toBe(5);
    expect(
      getMissionSuccessPreview(raid, [dungeonExpert]).personalitySuccessBonus,
    ).toBe(0);
    expect(getMissionSuccessPreview(raid, [raider]).personalitySuccessBonus).toBe(
      1,
    );
  });
});

describe("debug raid setup presets", () => {
  it("builds an MC test roster with attunements and expanded dungeon-ready gear", () => {
    const preset = resolveDebugPreset(DEBUG_MOLTEN_CORE_TEST_GUILD_ID);
    const roster = buildDebugRosterPreset({
      faction: GUILD_FACTION.ALLIANCE,
      level: preset.level,
      count: preset.count,
      roleOrder: preset.roleOrder,
      guaranteedKeys: preset.guaranteedKeys,
      gearProfile: preset.gearProfile,
      itemDatabase: DB_ITEMS,
    });
    const averageItemLevel = getRosterAverageItemLevel(roster);

    expect(roster).toHaveLength(40);
    expectRosterHasExpandedEquipment(roster);
    roster.forEach((member) => {
      expect(member.keys).toEqual(
        expect.arrayContaining(["molten_core_attunement"]),
      );
      expect(member.statusText).toBe("Raid-ready and attuned.");
    });
    expect(averageItemLevel).toBeGreaterThanOrEqual(50);
    expect(roster.every(isValidRaceClassCombo)).toBe(true);
  });

  it("builds a BWL test roster with MC and BWL attunements plus BWL-ready gear", () => {
    const preset = resolveDebugPreset(DEBUG_BLACKWING_LAIR_TEST_GUILD_ID);
    const roster = buildDebugRosterPreset({
      faction: GUILD_FACTION.ALLIANCE,
      level: preset.level,
      count: preset.count,
      roleOrder: preset.roleOrder,
      guaranteedKeys: preset.guaranteedKeys,
      gearProfile: preset.gearProfile,
      itemDatabase: DB_ITEMS,
    });
    const averageItemLevel = getRosterAverageItemLevel(roster);
    const sources = getRosterEquipmentSources(roster);

    expect(roster).toHaveLength(40);
    expectRosterHasExpandedEquipment(roster);
    roster.forEach((member) => {
      expect(member.keys).toEqual(
        expect.arrayContaining([
          "molten_core_attunement",
          "blackwing_lair_attunement",
        ]),
      );
      expect(member.statusText).toBe("BWL-ready and attuned.");
    });
    expect(averageItemLevel).toBeGreaterThanOrEqual(58);
    expect(averageItemLevel).toBeLessThanOrEqual(70);
    expect(
      ["molten_core", "zul_gurub", "ahn_qiraj_ruins"].some((sourceId) =>
        sources.has(sourceId),
      ),
    ).toBe(true);
    expect(sources.has("blackwing_lair")).toBe(false);
  });

  it("builds a Naxx test roster with raid attunements plus T2/AQ-level gear", () => {
    const preset = resolveDebugPreset(DEBUG_NAXXRAMAS_TEST_GUILD_ID);
    const roster = buildDebugRosterPreset({
      faction: GUILD_FACTION.ALLIANCE,
      level: preset.level,
      count: preset.count,
      roleOrder: preset.roleOrder,
      guaranteedKeys: preset.guaranteedKeys,
      gearProfile: preset.gearProfile,
      itemDatabase: DB_ITEMS,
    });
    const averageItemLevel = getRosterAverageItemLevel(roster);
    const sources = getRosterEquipmentSources(roster);

    expect(roster).toHaveLength(40);
    expectRosterHasExpandedEquipment(roster);
    roster.forEach((member) => {
      expect(member.keys).toEqual(
        expect.arrayContaining([
          "molten_core_attunement",
          "blackwing_lair_attunement",
        ]),
      );
      expect(member.statusText).toBe("Naxx-ready and attuned.");
    });
    expect(averageItemLevel).toBeGreaterThanOrEqual(70);
    expect(averageItemLevel).toBeLessThanOrEqual(80);
    expect(
      ["blackwing_lair", "onyxias_lair", "ahn_qiraj_temple"].some((sourceId) =>
        sources.has(sourceId),
      ),
    ).toBe(true);
    expect(sources.has("naxxramas")).toBe(false);
  });
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
    expect(result.recruits.map((recruit) => recruit.morale)).toEqual([50, 50, 50]);
    expect(result.recruits.every((recruit) => Array.isArray(recruit.history))).toBe(
      true,
    );
    expect(result.recruits.every((recruit) => Array.isArray(recruit.keys))).toBe(
      true,
    );
    expect(
      result.recruits.every((recruit) =>
        Array.isArray(recruit.clearedMissionIds),
      ),
    ).toBe(true);
    expect(result.spentGold).toBe(10);
    expect(result.updatedGold).toBe(0);
    expect(result.updatedRoster).toHaveLength(4);
  });

  it("unlocks recruitment tiers from level achievements and raid attunement", () => {
    const baseProgress = createInitialGuildProgress();
    const levelProgress = {
      ...baseProgress,
      milestones: {
        ...baseProgress.milestones,
        levelReached: {
          ...baseProgress.milestones.levelReached,
          20: true,
          30: true,
          40: true,
          50: true,
          60: true,
        },
      },
    };

    const earlyTiers = getRecruitmentTierOptions({
      guildProgress: baseProgress,
      raidUnlocked: false,
    });
    const lateTiersWithoutRaid = getRecruitmentTierOptions({
      guildProgress: levelProgress,
      raidUnlocked: false,
    });
    const lateTiersWithRaid = getRecruitmentTierOptions({
      guildProgress: levelProgress,
      raidUnlocked: true,
    });

    expect(earlyTiers.filter((tier) => tier.unlocked).map((tier) => tier.id)).toEqual([
      "level_1_10",
    ]);
    expect(
      lateTiersWithoutRaid.find((tier) => tier.id === "level_51_60")?.unlocked,
    ).toBe(true);
    expect(
      lateTiersWithoutRaid.find((tier) => tier.id === "level_60")?.unlocked,
    ).toBe(false);
    expect(lateTiersWithRaid.find((tier) => tier.id === "level_60")).toMatchObject({
      unlocked: true,
      scoutCostGold: 30,
      recruitCostGold: 15,
    });
  });

  it("builds level-appropriate recruitment gear instead of starter whites", () => {
    const itemDatabase = [
      {
        id: "green-head",
        name: "Green Head",
        slot: "head",
        quality: 2,
        type: "Plate",
        minLevel: 35,
        itemLevel: 40,
      },
      {
        id: "green-chest",
        name: "Green Chest",
        slot: "chest",
        quality: 2,
        type: "Plate",
        minLevel: 35,
        itemLevel: 40,
      },
      {
        id: "green-legs",
        name: "Green Legs",
        slot: "legs",
        quality: 2,
        type: "Plate",
        minLevel: 35,
        itemLevel: 40,
      },
      {
        id: "blue-feet",
        name: "Blue Feet",
        slot: "feet",
        quality: 3,
        type: "Plate",
        minLevel: 35,
        itemLevel: 42,
      },
      {
        id: "green-hands",
        name: "Green Hands",
        slot: "hands",
        quality: 2,
        type: "Plate",
        minLevel: 35,
        itemLevel: 40,
      },
      {
        id: "green-weapon",
        name: "Green Weapon",
        slot: "mainHand",
        quality: 2,
        type: "Generic",
        minLevel: 35,
        itemLevel: 40,
      },
    ];

    const equipment = buildRecruitmentEquipment({
      character: { level: 40, charClass: "Warrior" },
      itemDatabase,
    });
    const itemLevels = Object.values(equipment).map(getItemEffectiveLevel);

    expect(Object.values(equipment).every((item) => item.quality >= 2)).toBe(true);
    expect(Math.min(...itemLevels)).toBeGreaterThanOrEqual(35);
    expect(Math.max(...itemLevels)).toBeLessThanOrEqual(42);
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

  it("awards roster size achievements once", () => {
    const baseProgress = createInitialGuildProgress();
    const tenMembers = Array.from({ length: 10 }, (_, index) => ({
      id: `member-${index}`,
    }));
    const fortyMembers = Array.from({ length: 40 }, (_, index) => ({
      id: `member-${index}`,
    }));
    const first = applyRosterSizeMilestones(baseProgress, tenMembers);
    const second = applyRosterSizeMilestones(first.guildProgress, tenMembers);
    const third = applyRosterSizeMilestones(first.guildProgress, fortyMembers);

    expect(first.unlocked).toEqual([
      { target: 10, reward: 1, label: "One small step..." },
    ]);
    expect(first.guildProgress.renownPoints).toBe(1);
    expect(second.unlocked).toEqual([]);
    expect(third.unlocked.map((milestone) => milestone.label)).toEqual([
      "Now We Need a Bigger Inn",
      "Raid Roster",
    ]);
    expect(third.guildProgress.renownPoints).toBe(4);
  });

  it("distributes War Council roster slots from 15 starting members to 80 max", () => {
    const baseProgress = createInitialGuildProgress();
    const rankOne = {
      ...baseProgress,
      talents: { ...baseProgress.talents, rosterCap: 1 },
    };
    const rankTwo = {
      ...baseProgress,
      talents: { ...baseProgress.talents, rosterCap: 2 },
    };
    const rankThree = {
      ...baseProgress,
      talents: { ...baseProgress.talents, rosterCap: 3 },
    };

    expect(getGuildDerivedStats(baseProgress).maxRoster).toBe(15);
    expect(getGuildDerivedStats(rankOne).maxRoster).toBe(30);
    expect(getGuildDerivedStats(rankTwo).maxRoster).toBe(50);
    expect(getGuildDerivedStats(rankThree).maxRoster).toBe(80);
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

  it("awards new raid clear achievements once", () => {
    const baseProgress = createInitialGuildProgress();
    const seededProgress = {
      ...baseProgress,
      milestones: {
        ...baseProgress.milestones,
        dungeon: {
          ...baseProgress.milestones.dungeon,
          clearCount: 10,
          clearReached: { 1: true, 5: true, 10: true },
        },
      },
    };
    const raidMilestones = [
      {
        missionName: "Zul'Gurub",
        key: "zulGurubCleared",
        label: "Cleared ZG",
        reward: 3,
      },
      {
        missionName: "Ruins of Ahn'Qiraj",
        key: "ahnQirajRuinsCleared",
        label: "Cleared AQ20",
        reward: 3,
      },
      {
        missionName: "Onyxia's Lair",
        key: "onyxiasLairCleared",
        label: "Cleared Onyxia",
        reward: 3,
      },
      {
        missionName: "Blackwing Lair",
        key: "blackwingLairCleared",
        label: "Cleared BWL",
        reward: 5,
      },
      {
        missionName: "Temple of Ahn'Qiraj",
        key: "ahnQirajTempleCleared",
        label: "Cleared AQ40",
        reward: 5,
      },
    ];

    raidMilestones.forEach((milestone) => {
      const firstClear = applyDungeonClearMilestones(seededProgress, {
        name: milestone.missionName,
        dungeonSetName: milestone.missionName,
      });
      const secondClear = applyDungeonClearMilestones(firstClear.guildProgress, {
        name: milestone.missionName,
        dungeonSetName: milestone.missionName,
      });

      expect(firstClear.unlocked).toContainEqual({
        label: milestone.label,
        reward: milestone.reward,
      });
      expect(firstClear.guildProgress.renownPoints).toBe(milestone.reward);
      expect(firstClear.guildProgress.totalRenown).toBe(milestone.reward);
      expect(firstClear.guildProgress.milestones.dungeon[milestone.key]).toBe(true);
      expect(secondClear.unlocked).not.toContainEqual({
        label: milestone.label,
        reward: milestone.reward,
      });
      expect(secondClear.guildProgress.renownPoints).toBe(milestone.reward);
    });
  });

  it("lists new raid clear achievements in guild achievements", () => {
    const entries = buildGuildAchievementEntries(createInitialGuildProgress());
    const raidAchievementRewards = Object.fromEntries(
      entries
        .filter((entry) => entry.key.startsWith("raid-clear-"))
        .map((entry) => [entry.label, entry.reward]),
    );

    expect(raidAchievementRewards).toMatchObject({
      "Cleared ZG": "+3 Guild Renown",
      "Cleared AQ20": "+3 Guild Renown",
      "Cleared Onyxia": "+3 Guild Renown",
      "Cleared BWL": "+5 Guild Renown",
      "Cleared AQ40": "+5 Guild Renown",
    });
  });

  it("lists roster size achievements in guild achievements", () => {
    const entries = buildGuildAchievementEntries(createInitialGuildProgress());
    const rosterAchievementRewards = Object.fromEntries(
      entries
        .filter((entry) => entry.key.startsWith("roster-size-"))
        .map((entry) => [entry.label, entry.reward]),
    );

    expect(rosterAchievementRewards).toMatchObject({
      "One small step...": "+1 Guild Renown",
      "Now We Need a Bigger Inn": "+1 Guild Renown",
      "Raid Roster": "+2 Guild Renown",
    });
  });
});

describe("guild role summary", () => {
  it("returns zero counts for an empty roster", () => {
    expect(getGuildRoleSummary([])).toEqual({
      total: 0,
      Tank: 0,
      Healer: 0,
      DPS: 0,
    });
  });

  it("counts tanks, healers, and damage dealers", () => {
    expect(
      getGuildRoleSummary([
        { id: "tank-1", role: "Tank" },
        { id: "tank-2", role: "Tank" },
        { id: "healer-1", role: "Healer" },
        { id: "dps-1", role: "DPS" },
        { id: "dps-2", role: "DPS" },
        { id: "dps-3", role: "DPS" },
      ]),
    ).toEqual({
      total: 6,
      Tank: 2,
      Healer: 1,
      DPS: 3,
    });
  });

  it("includes unknown roles in total without counting them as core roles", () => {
    expect(
      getGuildRoleSummary([
        { id: "tank", role: "Tank" },
        { id: "missing-role" },
        { id: "unknown-role", role: "Bench" },
      ]),
    ).toEqual({
      total: 3,
      Tank: 1,
      Healer: 0,
      DPS: 0,
    });
  });
});

describe("guild class summary", () => {
  it("counts classes and sorts by count then name", () => {
    expect(
      getGuildClassSummary([
        { id: "one", charClass: "Mage" },
        { id: "two", class: "Warrior" },
        { id: "three", charClass: "Mage" },
        { id: "four", className: "Priest" },
        { id: "five", class: "Priest" },
        { id: "six", class: "Rogue" },
      ]),
    ).toEqual([
      { className: "Mage", count: 2 },
      { className: "Priest", count: 2 },
      { className: "Rogue", count: 1 },
      { className: "Warrior", count: 1 },
    ]);
  });

  it("ignores missing class data", () => {
    expect(
      getGuildClassSummary([
        { id: "one", class: "Mage" },
        { id: "two", class: "" },
        { id: "three" },
      ]),
    ).toEqual([{ className: "Mage", count: 1 }]);
  });
});

describe("relationship system", () => {
  it("treats missing relationships as strangers", () => {
    expect(getRelationshipLevel(null)).toBe("Stranger");
    expect(getRelationshipLevel({ points: -41 })).toBe("Hated");
    expect(getRelationshipLevel({ points: -1 })).toBe("Unfriendly");
    expect(getRelationshipLevel({ points: 9 })).toBe("Stranger");
    expect(getRelationshipLevel({ points: 10 })).toBe("Acquainted");
    expect(getRelationshipLevel({ points: 20 })).toBe("Liked");
    expect(getRelationshipLevel({ points: 35 })).toBe("Friend");
    expect(getRelationshipLevel({ points: 80 })).toBe("Good Friend");
  });

  it("builds stable pair keys independent of member order", () => {
    expect(getRelationshipPairKey("mage", "tank")).toBe("mage::tank");
    expect(getRelationshipPairKey("tank", "mage")).toBe("mage::tank");
  });

  it("creates negative relationship edges for failed dungeon attempts", () => {
    const relationships = updateRelationshipsForSharedActivity(
      {},
      {
        mission: {
          name: "Deadmines",
          type: "dungeon",
          memberIds: ["tank", "healer", "dps"],
        },
        missionSucceeded: false,
        occurredAt: 1000,
      },
    );

    expect(Object.keys(relationships).sort()).toEqual([
      "dps::healer",
      "dps::tank",
      "healer::tank",
    ]);
    expect(relationships["healer::tank"]).toMatchObject({
      memberIds: ["healer", "tank"],
      points: -3,
      runsTogether: 1,
      dungeonRuns: 1,
      successfulDungeonRuns: 0,
      failedDungeonRuns: 1,
      successfulRuns: 0,
      failedRuns: 1,
      lastMissionName: "Deadmines",
    });
    expect(relationships["healer::tank"].events[0]).toMatchObject({
      missionName: "Deadmines",
      activityType: "dungeon",
      missionSucceeded: false,
      pointsDelta: -3,
      occurredAt: 1000,
    });
  });

  it("grants extra progress for successful shared runs", () => {
    const failed = updateRelationshipsForSharedActivity(
      {},
      {
        mission: { name: "Wailing Caverns", type: "dungeon", memberIds: ["a", "b"] },
        missionSucceeded: false,
      },
    );
    const succeeded = updateRelationshipsForSharedActivity(
      {},
      {
        mission: { name: "Wailing Caverns", type: "dungeon", memberIds: ["a", "b"] },
        missionSucceeded: true,
      },
    );

    expect(succeeded["a::b"].points).toBeGreaterThan(failed["a::b"].points);
    expect(succeeded["a::b"]).toMatchObject({
      points: 5,
      successfulRuns: 1,
      successfulDungeonRuns: 1,
    });
    expect(succeeded["a::b"].events[0]).toMatchObject({
      missionName: "Wailing Caverns",
      pointsDelta: 5,
      missionSucceeded: true,
    });
    expect(failed["a::b"]).toMatchObject({
      points: -3,
      failedRuns: 1,
      failedDungeonRuns: 1,
    });
  });

  it("lets failures push existing relationships below zero", () => {
    const relationships = updateRelationshipsForSharedActivity(
      {
        "a::b": {
          memberIds: ["a", "b"],
          points: 2,
          runsTogether: 1,
          successfulRuns: 0,
          failedRuns: 0,
        },
      },
      {
        mission: { name: "Shadowfang Keep", type: "dungeon", memberIds: ["a", "b"] },
        missionSucceeded: false,
      },
    );

    expect(relationships["a::b"].points).toBe(-1);
    expect(getRelationshipLevel(relationships["a::b"])).toBe("Unfriendly");
    expect(relationships["a::b"].events).toHaveLength(1);
  });

  it("records successful and failed zone elite events in relationship history", () => {
    const success = updateRelationshipsForSharedActivity(
      {},
      {
        mission: {
          name: "Redridge Mountains Elite: Hunt the Warband",
          type: "quest",
          isZoneElite: true,
          memberIds: ["a", "b"],
        },
        missionSucceeded: true,
        occurredAt: 2000,
      },
    );
    const failed = updateRelationshipsForSharedActivity(success, {
      mission: {
        name: "Redridge Mountains Elite: Hunt the Warband",
        type: "quest",
        isZoneElite: true,
        memberIds: ["a", "b"],
      },
      missionSucceeded: false,
      occurredAt: 3000,
    });

    expect(failed["a::b"]).toMatchObject({
      points: 2,
      eliteRuns: 2,
      successfulEliteRuns: 1,
      failedEliteRuns: 1,
      successfulRuns: 1,
      failedRuns: 1,
      lastMissionName: "Redridge Mountains Elite: Hunt the Warband",
    });
    expect(failed["a::b"].events.map((event) => event.pointsDelta)).toEqual([
      -3,
      5,
    ]);
    expect(failed["a::b"].events[0]).toMatchObject({
      activityType: "elite",
      missionSucceeded: false,
      occurredAt: 3000,
    });
  });

  it("ignores normal non-elite quests", () => {
    const relationships = updateRelationshipsForSharedActivity(
      {},
      {
        mission: {
          name: "Collect Candles",
          type: "quest",
          elite: false,
          memberIds: ["a", "b"],
        },
        missionSucceeded: true,
      },
    );

    expect(relationships).toEqual({});
  });

  it("derives flairs from net successful shared run counters", () => {
    const relationship = {
      successfulDungeonRuns: 3,
      failedDungeonRuns: 0,
      successfulRaidRuns: 2,
      failedRaidRuns: 0,
      successfulEliteRuns: 2,
      failedEliteRuns: 0,
      successfulRuns: 5,
      failedRuns: 0,
    };

    expect(getRelationshipFlairs(relationship)).toEqual([
      "Dungeon Mate",
      "Raid Companion",
      "Elite Duo",
      "Reliable Pair",
    ]);
    expect(
      getRelationshipFlairs({
        ...relationship,
        failedDungeonRuns: 1,
        failedRuns: 1,
      }),
    ).toEqual(["Raid Companion", "Elite Duo"]);
  });

  it("keeps relationship points inside the -100 to 100 range", () => {
    const high = updateRelationshipsForSharedActivity(
      {
        "a::b": {
          memberIds: ["a", "b"],
          points: 99,
        },
      },
      {
        mission: { name: "Wailing Caverns", type: "dungeon", memberIds: ["a", "b"] },
        missionSucceeded: true,
      },
    );
    const low = updateRelationshipsForSharedActivity(
      {
        "a::b": {
          memberIds: ["a", "b"],
          points: -99,
        },
      },
      {
        mission: { name: "Wailing Caverns", type: "dungeon", memberIds: ["a", "b"] },
        missionSucceeded: false,
      },
    );

    expect(high["a::b"].points).toBe(100);
    expect(low["a::b"].points).toBe(-100);
  });

  it("derives capped success modifiers from the strongest group relationship", () => {
    const relationships = {
      "a::b": { memberIds: ["a", "b"], points: 25 },
      "a::c": { memberIds: ["a", "c"], points: 38 },
      "b::c": { memberIds: ["b", "c"], points: 5 },
    };

    expect(
      getRelationshipSuccessModifier({
        relationships,
        memberIds: ["a", "b", "c"],
      }),
    ).toMatchObject({
      successModifier: 5,
      level: "Friend",
      affectedPairKey: "a::c",
    });
  });

  it("lets hated relationships override positive group chemistry", () => {
    const relationships = {
      "a::b": { memberIds: ["a", "b"], points: 80 },
      "a::c": { memberIds: ["a", "c"], points: -40 },
      "b::c": { memberIds: ["b", "c"], points: 25 },
    };

    expect(
      getRelationshipSuccessModifier({
        relationships,
        memberIds: ["a", "b", "c"],
      }),
    ).toMatchObject({
      successModifier: -5,
      level: "Hated",
      affectedPairKey: "a::c",
    });
  });

  it("builds character rows and strong relationship clusters", () => {
    const relationships = {
      "a::b": {
        memberIds: ["a", "b"],
        points: 40,
        runsTogether: 4,
        successfulRuns: 4,
        dungeonRuns: 4,
      },
      "b::c": {
        memberIds: ["b", "c"],
        points: 36,
        runsTogether: 4,
        successfulRuns: 4,
      },
      "d::e": {
        memberIds: ["d", "e"],
        points: 12,
        runsTogether: 2,
        successfulRuns: 1,
      },
    };
    const roster = [
      { id: "a", name: "Ala", level: 30, charClass: "Mage" },
      { id: "b", name: "Borin", level: 31, charClass: "Warrior" },
      { id: "c", name: "Cora", level: 32, charClass: "Priest" },
    ];

    expect(
      getCharacterRelationshipRows({
        relationships,
        characterId: "a",
        roster,
      }).map((row) => row.otherMember.id),
    ).toEqual(["b"]);
    expect(findRelationshipClusters({ relationships, minimumPoints: 35 })).toEqual([
      ["a", "b", "c"],
    ]);
  });
});

describe("session persistence", () => {
  it("hydrates missing relationship data as an empty graph", () => {
    const result = hydrateSessionData({
      payloadData: {
        roster: [],
        activeMissions: [],
        missionList: [],
        guildProgress: createInitialGuildProgress(),
        guildSetup: { hasStarted: true },
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

    expect(result.loadedGuildRelationships).toEqual({});
  });

  it("round-trips guild relationships through save hydration", () => {
    const guildRelationships = {
      "healer::tank": {
        memberIds: ["healer", "tank"],
        points: 42,
        runsTogether: 5,
        successfulRuns: 4,
        failedRuns: 0,
        dungeonRuns: 5,
        raidRuns: 0,
        eliteRuns: 0,
        successfulDungeonRuns: 4,
        failedDungeonRuns: 0,
        successfulRaidRuns: 0,
        failedRaidRuns: 0,
        successfulEliteRuns: 0,
        failedEliteRuns: 0,
        lastMissionName: "Scarlet Monastery",
        lastInteractionAt: 12345,
        events: [
          {
            missionName: "Scarlet Monastery",
            activityType: "dungeon",
            missionSucceeded: true,
            pointsDelta: 5,
            occurredAt: 12345,
          },
        ],
      },
    };
    const payload = buildSessionPayload({
      roster: [],
      activeMissions: [],
      missionList: [],
      guildLog: [],
      guildGold: 0,
      guildProgress: createInitialGuildProgress(),
      guildSetup: { hasStarted: true },
      guildRelationships,
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

    expect(payload.data.guildRelationships).toEqual(guildRelationships);
    expect(result.loadedGuildRelationships).toEqual(guildRelationships);
  });

  it("serializes active mission remaining time against game time", () => {
    const payload = buildSessionPayload({
      roster: [],
      activeMissions: [{ id: "m1", finishTime: 2500 }],
      missionList: [],
      guildLog: [],
      guildGold: 7,
      guildProgress: createInitialGuildProgress(),
      guildSetup: { hasStarted: true },
      realmState: {
        id: "realm:test",
        name: "Everlook",
        type: "PvE",
        ageDays: 2,
        npcGuilds: [],
        news: [],
      },
      gameSpeed: DEFAULT_GAME_SPEED,
      isPaused: false,
      gameTimeMs: 1000,
    });

    expect(payload.format).toBe(SESSION_FORMAT);
    expect(payload.data.activeMissions[0].remainingMs).toBe(1500);
    expect(payload.data.realmState.name).toBe("Everlook");
  });

  it("serializes and hydrates world PvP state with old-save defaults", () => {
    const payload = buildSessionPayload({
      roster: [],
      activeMissions: [],
      missionList: [],
      guildLog: [],
      guildGold: 7,
      guildProgress: createInitialGuildProgress(),
      guildSetup: { hasStarted: true },
      worldPvpState: {
        totalHonor: 42,
        weeklyHonor: 12,
        pvpReputation: 5,
        zoneStats: {
          ashenvale: {
            eventsTriggered: 2,
            victories: 1,
            defeats: 1,
            honorEarned: 42,
            lastEventDay: 3,
          },
        },
        lastProcessedDayIndex: 3,
      },
      gameSpeed: DEFAULT_GAME_SPEED,
      isPaused: false,
      gameTimeMs: 1000,
    });
    const hydrated = hydrateSessionData({
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
    const oldSaveHydrated = hydrateSessionData({
      payloadData: {
        roster: [],
        guildSetup: { hasStarted: true },
        progression: { gameSpeed: DEFAULT_GAME_SPEED, gameTimeMs: 1000 },
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

    expect(payload.data.worldPvpState.totalHonor).toBe(42);
    expect(hydrated.loadedWorldPvpState.zoneStats.ashenvale.honorEarned).toBe(42);
    expect(oldSaveHydrated.loadedWorldPvpState.totalHonor).toBe(0);
  });

  it("round-trips newer save state for PvP, expanded equipment, raid lockouts, and mission board filters", () => {
    const payload = buildSessionPayload({
      roster: [
        {
          id: "pvp-main",
          name: "Ranksword",
          charClass: "Warrior",
          level: 60,
          equipment: {
            neck: { id: "neck-1", name: "Veteran's Pendant", slot: "neck" },
            belt: { id: "belt-1", name: "Veteran's Sash", slot: "belt" },
            trinket: { id: "pvp-trinket", name: "Insignia", slot: "trinket", pvpGear: true },
            ring: { id: "ring-1", name: "Band of Victory", slot: "ring" },
          },
          pvp: {
            lifetimeHonor: 500,
            weeklyHonor: 120,
            rankProgress: 300,
            rank: 2,
            highestRank: 2,
            honorableKills: 4,
            unlockedPvpGearIds: ["pvp-trinket"],
          },
        },
      ],
      activeMissions: [],
      missionList: [],
      guildLog: [],
      guildGold: 7,
      guildProgress: createInitialGuildProgress(),
      guildSetup: { hasStarted: true, faction: GUILD_FACTION.ALLIANCE },
      worldPvpState: {
        totalHonor: 500,
        weeklyHonor: 120,
        pvpReputation: 9,
        zoneStats: {},
        lastProcessedDayIndex: 4,
        lastWeeklyRolloverDayIndex: 0,
      },
      raidLockouts: {
        molten_core: {
          raidKey: "molten_core",
          missionId: 62,
          raidName: "Molten Core",
          lockouts: [
            {
              lockoutId: "1",
              displayId: 1,
              resetStartDayIndex: 0,
              nextResetDayIndex: 7,
              clearedSteps: 3,
              totalBosses: 10,
              participantIds: ["pvp-main"],
              clearedWingIds: ["core"],
            },
          ],
        },
      },
      missionBoardState: {
        selectedCategory: "dungeon",
        levelFilterMin: 50,
        levelFilterMax: 60,
        showAvailableDungeonsOnly: true,
        hideLowLevelDungeons: true,
      },
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

    expect(payload.data.missionBoardState).toMatchObject({
      selectedCategory: "dungeon",
      levelFilterMin: "50",
      levelFilterMax: "60",
      showAvailableDungeonsOnly: true,
      hideLowLevelDungeons: true,
    });
    expect(result.normalizedRoster[0].equipment.neck.name).toBe("Veteran's Pendant");
    expect(result.normalizedRoster[0].equipment.belt.name).toBe("Veteran's Sash");
    expect(result.normalizedRoster[0].equipment.trinket.pvpGear).toBe(true);
    expect(result.normalizedRoster[0].equipment.ring.name).toBe("Band of Victory");
    expect(result.normalizedRoster[0].pvp.weeklyHonor).toBe(120);
    expect(result.normalizedRoster[0].pvp.unlockedPvpGearIds).toEqual(["pvp-trinket"]);
    expect(result.normalizedRoster[0].history).toEqual([]);
    expect(result.normalizedRoster[0].status).toBe("Idle");
    expect(result.loadedWorldPvpState.pvpReputation).toBe(9);
    expect(result.loadedMissionBoardState).toMatchObject({
      selectedCategory: "dungeon",
      levelFilterMin: "50",
      levelFilterMax: "60",
    });
    expect(result.loadedRaidLockouts.molten_core.lockouts[0]).toMatchObject({
      clearedSteps: 3,
      totalBosses: 10,
      participantIds: ["pvp-main"],
    });
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
    expect(result.normalizedRoster[1].adventureGoalQueue).toEqual([]);
    expect(result.loadedRealmState.name).toBe("Everlook");
    expect(result.loadedRealmState.npcGuilds.length).toBeGreaterThan(0);
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

  it("preserves selected raid wing chains when materializing calendar series", () => {
    const state = {
      ...createInitialCalendarState(0),
      calendarSeries: [
        buildCalendarSeries({
          id: "naxx-series",
          title: "Naxxramas Full Run",
          missionId: 68,
          missionIds: [68, 69, 70, 71, 72],
          weekday: 2,
          startsOnDayIndex: 0,
        }),
      ],
    };
    const result = materializeCalendarSeriesEvents({
      state,
      currentDayIndex: 0,
      createId: () => "fallback-id",
      horizonDays: 7,
    });

    expect(result.calendarEvents[0].missionId).toBe(68);
    expect(result.calendarEvents[0].missionIds).toEqual([
      "68",
      "69",
      "70",
      "71",
      "72",
    ]);
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

  it("cleans completed and cancelled calendar events after their scheduled day", () => {
    const state = {
      ...createInitialCalendarState(0),
      calendarEvents: [
        {
          ...buildCalendarEvent({
            id: "completed-old",
            title: "Old Complete",
            missionId: 62,
            scheduledDayIndex: 1,
            createdAtDayIndex: 0,
          }),
          status: CALENDAR_STATUS.COMPLETED,
        },
        {
          ...buildCalendarEvent({
            id: "cancelled-old",
            title: "Old Cancelled",
            missionId: 62,
            scheduledDayIndex: 1,
            createdAtDayIndex: 0,
          }),
          status: CALENDAR_STATUS.CANCELLED,
        },
        {
          ...buildCalendarEvent({
            id: "completed-today",
            title: "Today Complete",
            missionId: 62,
            scheduledDayIndex: 2,
            createdAtDayIndex: 0,
          }),
          status: CALENDAR_STATUS.COMPLETED,
        },
        buildCalendarEvent({
          id: "scheduled-future",
          title: "Future Raid",
          missionId: 62,
          scheduledDayIndex: 3,
          createdAtDayIndex: 0,
        }),
      ],
    };
    const result = refreshCalendarState({
      state,
      currentDayIndex: 2,
      roster: [],
      activeMissions: [],
      missionList: [{ id: 62, name: "Molten Core", isRaid: true }],
      createId: () => "new-id",
    });

    expect(result.state.calendarEvents.map((event) => event.id)).toEqual([
      "completed-today",
      "scheduled-future",
    ]);
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

  it("allows raid calendar signups for busy characters", () => {
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
        status: "Questing",
      },
      {
        id: "dps",
        name: "Dps",
        role: "DPS",
        level: 60,
        status: "Questing",
      },
      {
        id: "idle",
        name: "Idle",
        role: "DPS",
        level: 60,
        status: "Idle",
      },
      {
        id: "raid-busy",
        name: "Raid Busy",
        role: "DPS",
        level: 60,
        status: "Questing",
      },
    ];
    const result = refreshCalendarState({
      state,
      currentDayIndex: 2,
      roster,
      activeMissions: [
        {
          instanceId: "dungeon-1",
          type: "dungeon",
          name: "Blackrock Spire",
          memberIds: ["tank"],
        },
        {
          instanceId: "zone-1",
          type: "zone",
          name: "Silithus",
          memberIds: ["dps"],
        },
        {
          instanceId: "raid-1",
          type: "dungeon",
          isRaid: true,
          name: "Zul'Gurub",
          memberIds: ["raid-busy"],
        },
      ],
      missionList: [mission],
      createId: () => "new-id",
    });

    expect(result.state.calendarEvents[0].registrations).toEqual([
      "tank",
      "dps",
      "idle",
      "raid-busy",
    ]);
  });

  it("keeps unlocked calendar events open while locked groups reserve same-day characters", () => {
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
    expect(result.state.calendarEvents[1].registrations).toEqual(["tank", "dps"]);

    const lockedState = {
      ...state,
      calendarEvents: [
        {
          ...state.calendarEvents[0],
          rosterLocked: true,
          lockedRosterIds: ["tank", "dps"],
          registrations: ["tank", "dps"],
          approvedRosterIds: ["tank", "dps"],
        },
        state.calendarEvents[1],
      ],
    };
    const lockedResult = refreshCalendarState({
      state: lockedState,
      currentDayIndex: 2,
      roster,
      activeMissions: [],
      missionList: [mission],
      createId: () => "new-id",
    });

    expect(lockedResult.state.calendarEvents[0].approvedRosterIds).toEqual([
      "tank",
      "dps",
    ]);
    expect(lockedResult.state.calendarEvents[1].registrations).toEqual([]);
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

  it("allows raid calendar signups again on the scheduled reset day", () => {
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
          id: "event-reset",
          title: "ZG Reset Raid",
          missionId: 63,
          scheduledDayIndex: 3,
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
      currentDayIndex: 2,
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

    expect(result.state.calendarEvents[0].registrations).toEqual(["hero"]);
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

  it("records mission history even when recruited characters have no history array", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const processor = buildProcessor();
    const result = processor({
      mission: {
        id: "quest-legacy-history",
        name: "Secure the Crossroads",
        type: "quest",
        memberIds: ["hunter"],
        level: 10,
        exp: 100,
        gold: 2,
        rewardQualities: [],
      },
      currentRoster: [
        {
          id: "hunter",
          name: "Hunter",
          charClass: "Hunter",
          level: 10,
          exp: 0,
          keys: [],
          history: null,
          equipment: {},
        },
      ],
      activeGuildStats: { expMultiplier: 1, goldMultiplier: 1 },
      activeFocusBonuses: { expMultiplier: 1, fullPartyGoldMultiplier: 1 },
      levelCap: 60,
      failedMissionExpFactor: 0.2,
    });

    expect(result.missionSucceeded).toBe(true);
    expect(result.updatedRoster[0].history).toEqual([
      expect.objectContaining({
        name: "Secure the Crossroads",
        result: "Success",
      }),
    ]);
  });

  it("clears matching attunement goals when a rewarded key is earned", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const processor = buildProcessor();
    const result = processor({
      mission: {
        id: "library",
        name: "Scarlet Monastery - Library",
        type: "dungeon",
        memberIds: ["mage"],
        level: 34,
        exp: 100,
        rewardQualities: [],
        rewardKeys: ["scarlet_monastery_key"],
        dungeonProgress: { clearedSteps: 4 },
      },
      currentRoster: [
        {
          id: "mage",
          name: "Mage",
          charClass: "Mage",
          level: 34,
          exp: 0,
          keys: [],
          adventureGoalQueue: [
            {
              id: "goal-1",
              type: "attunement",
              keyId: "scarlet_monastery_key",
              sourceMissionId: "library",
              targetMissionId: "armory",
              createdAt: 10,
            },
          ],
          history: [],
          equipment: {},
        },
      ],
      activeGuildStats: { expMultiplier: 1, goldMultiplier: 1 },
      activeFocusBonuses: { expMultiplier: 1, fullPartyGoldMultiplier: 1 },
      levelCap: 60,
      failedMissionExpFactor: 0.2,
    });

    expect(result.missionSucceeded).toBe(true);
    expect(result.updatedRoster[0].keys).toEqual(["scarlet_monastery_key"]);
    expect(result.updatedRoster[0].adventureGoalQueue).toEqual([]);
  });

  it("records successful zone elite quests as cleared mission ids", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const processor = buildProcessor();
    const result = processor({
      mission: {
        id: "zone_elite:westfall:1",
        name: "Westfall Elite: Hunt the Warband",
        type: "quest",
        isZoneElite: true,
        memberIds: ["mage"],
        level: 15,
        exp: 100,
        gold: 4,
        rewardQualities: [2],
      },
      currentRoster: [
        {
          id: "mage",
          name: "Mage",
          charClass: "Mage",
          level: 15,
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

    expect(result.missionSucceeded).toBe(true);
    expect(result.updatedRoster[0].clearedMissionIds).toEqual([
      "zone_elite:westfall:1",
    ]);
    expect(result.updatedRoster[0].morale).toBe(
      50 + MORALE_ELITE_SUCCESS_DELTA,
    );
  });

  it("reduces morale after failed zone elite quests", () => {
    const processor = buildProcessor();
    const result = processor({
      mission: {
        id: "zone_elite:redridge:1",
        name: "Redridge Mountains Elite: Hunt the Warband",
        type: "quest",
        isZoneElite: true,
        memberIds: ["mage"],
        level: 18,
        exp: 100,
        gold: 4,
        rewardQualities: [2],
        missionSuccess: false,
      },
      currentRoster: [
        {
          id: "mage",
          name: "Mage",
          charClass: "Mage",
          level: 18,
          exp: 0,
          morale: 50,
          keys: [],
          clearedMissionIds: [],
          history: [],
          equipment: {},
        },
      ],
      activeGuildStats: { expMultiplier: 1, goldMultiplier: 1 },
      activeFocusBonuses: { expMultiplier: 1, fullPartyGoldMultiplier: 1 },
      levelCap: 60,
      failedMissionExpFactor: 0.2,
    });

    expect(result.missionSucceeded).toBe(false);
    expect(result.updatedRoster[0].morale).toBe(
      50 + MORALE_ELITE_FAILURE_DELTA,
    );
    expect(result.updatedRoster[0].clearedMissionIds).toEqual([]);
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

  it("raises morale for successful in-range dungeon clears only", () => {
    const processor = buildProcessor();
    const baseMission = {
      id: "deadmines",
      name: "The Deadmines",
      type: "dungeon",
      memberIds: ["mage"],
      recommended: "18 - 23",
      minLevel: 10,
      level: 23,
      exp: 100,
      gold: 0,
      dungeonBosses: ["Cookie"],
      dungeonProgress: { clearedSteps: 1 },
    };
    const makeRoster = (level) => [
      {
        id: "mage",
        name: "Mage",
        charClass: "Mage",
        level,
        exp: 0,
        morale: 50,
        keys: [],
        clearedMissionIds: [],
        history: [],
        equipment: {},
      },
    ];

    const inRange = processor({
      mission: baseMission,
      currentRoster: makeRoster(20),
      activeGuildStats: { expMultiplier: 1, goldMultiplier: 1 },
      activeFocusBonuses: { expMultiplier: 1, fullPartyGoldMultiplier: 1 },
      levelCap: 60,
      failedMissionExpFactor: 0.2,
    });
    const outOfRange = processor({
      mission: baseMission,
      currentRoster: makeRoster(60),
      activeGuildStats: { expMultiplier: 1, goldMultiplier: 1 },
      activeFocusBonuses: { expMultiplier: 1, fullPartyGoldMultiplier: 1 },
      levelCap: 60,
      failedMissionExpFactor: 0.2,
    });

    expect(inRange.updatedRoster[0].morale).toBe(50 + MORALE_DUNGEON_CLEAR_DELTA);
    expect(outOfRange.updatedRoster[0].morale).toBe(50);
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
    expect(aq40Mission.baseFailChance).toBe(50);
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
    expect(onyxiaMission.baseFailChance).toBe(45);
    expect(onyxiaMission.requiresKey).toBe(false);
    expect(getDungeonBossCount(onyxiaMission)).toBe(1);
    expect(onyxiaMission.raidReset).toMatchObject({
      type: "weekly",
      weekday: 2,
    });

    expect(blackwingLairMission).toBeTruthy();
    expect(blackwingLairMission.isRaid).toBe(true);
    expect(blackwingLairMission.requiredPartySize).toBe(40);
    expect(blackwingLairMission.baseFailChance).toBe(48);
    expect(blackwingLairMission.requiresKey).toBe(true);
    expect(blackwingLairMission.requiresKeyForAllMembers).toBe(true);
    expect(blackwingLairMission.keyId).toBe("blackwing_lair_attunement");
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
    expect(unsupportedBlackwingLairDrops.length).toBeGreaterThan(5);
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

  it("uses source item icons for supported Blackwing Lair drops", () => {
    const expectedIcons = new Map([
      ["Stormrage Chestguard", "inv_chest_chain_16"],
      ["Dragonstalker's Breastplate", "inv_chest_chain_03"],
      ["Netherwind Robes", "inv_chest_cloth_03"],
      ["Judgment Breastplate", "inv_chest_plate03"],
      ["Robes of Transcendence", "inv_chest_cloth_03"],
      ["Bloodfang Chestpiece", "inv_chest_cloth_07"],
      ["Breastplate of Ten Storms", "inv_chest_chain_11"],
      ["Nemesis Robes", "inv_chest_leather_01"],
      ["Breastplate of Wrath", "inv_chest_plate16"],
      ["Chromatically Tempered Sword", "inv_sword_51"],
      ["Mish'undare, Circlet of the Mind Flayer", "inv_helmet_52"],
    ]);

    expectedIcons.forEach((iconCode, itemName) => {
      const item = blackwingLairItems.find((candidate) => candidate.name === itemName);
      expect(item?.icon).toContain(`${iconCode}.jpg`);
    });

    const supportedTierTwoIcons = new Set(
      blackwingLairItems
        .filter((item) => String(item.setId || "").startsWith("t2_"))
        .map((item) => item.icon),
    );
    expect(supportedTierTwoIcons.size).toBeGreaterThan(10);
  });
});

describe("Naxxramas raid integration", () => {
  const naxxMissions = INITIAL_MISSIONS.filter(
    (mission) => mission.dungeonSetId === "naxxramas",
  );
  const frostwyrmMission = naxxMissions.find(
    (mission) => mission.dungeonWing === "Frostwyrm Lair",
  );
  const baseWingMissions = naxxMissions.filter(
    (mission) => mission.dungeonWing !== "Frostwyrm Lair",
  );
  const naxxItems = DB_ITEMS.filter((item) => item.dungeonSetId === "naxxramas");
  const tierThreeItems = naxxItems.filter((item) =>
    String(item.setId || "").startsWith("t3_"),
  );

  it("defines Naxxramas as four base wings plus locked Frostwyrm Lair", () => {
    expect(naxxMissions).toHaveLength(5);
    expect(baseWingMissions.map((mission) => mission.dungeonWing)).toEqual([
      "Spider Wing",
      "Plague Wing",
      "Military Wing",
      "Construct Wing",
    ]);
    naxxMissions.forEach((mission) => {
      expect(mission.isRaid).toBe(true);
      expect(mission.requiredPartySize).toBe(40);
      expect(mission.raidLockoutId).toBe("naxxramas");
      expect(mission.raidLockoutTotalBosses).toBe(15);
      expect(mission.raidReset).toMatchObject({
        type: "weekly",
        weekday: 2,
      });
    });
    expect(getDungeonBossCount(frostwyrmMission)).toBe(2);
    expect(frostwyrmMission.requiredRaidWingIds).toEqual([
      "spider_wing",
      "plague_wing",
      "military_wing",
      "construct_wing",
    ]);
  });

  it("unlocks Frostwyrm Lair after all four Naxxramas wings are cleared in one ID", () => {
    const members = ["tank", "healer", "dps"];
    const currentDayIndex = 2;
    const beforeClears = getRaidLockoutStatus({
      raidLockouts: {},
      mission: frostwyrmMission,
      currentDayIndex,
      memberIds: members,
    });
    expect(beforeClears.canEnter).toBe(false);
    expect(beforeClears.isWingLocked).toBe(true);

    const clearedLockouts = baseWingMissions.reduce(
      (lockouts, mission) =>
        updateRaidLockoutProgress({
          raidLockouts: lockouts,
          mission,
          currentDayIndex,
          memberIds: members,
          clearedSteps: getDungeonBossCount(mission),
          totalBosses: getDungeonBossCount(mission),
        }),
      {},
    );

    const unlocked = getRaidLockoutStatus({
      raidLockouts: clearedLockouts,
      mission: frostwyrmMission,
      currentDayIndex,
      memberIds: members,
    });
    expect(unlocked.canEnter).toBe(true);
    expect(unlocked.isWingLocked).toBe(false);
    expect(unlocked.lockout.clearedWingIds.sort()).toEqual([
      "construct_wing",
      "military_wing",
      "plague_wing",
      "spider_wing",
    ]);
    expect(unlocked.clearedSteps).toBe(13);
    expect(unlocked.totalBosses).toBe(15);
    expect(unlocked.isCompletedLocked).toBe(false);
  });

  it("converts Naxxramas loot and supported Tier 3 pieces into database items", () => {
    expect(NAXXRAMAS_ACTIVE_LOOT_MANIFEST.length).toBeGreaterThan(60);
    expect(NAXXRAMAS_ITEMS.length).toBe(NAXXRAMAS_ACTIVE_LOOT_MANIFEST.length);
    expect(tierThreeItems).toHaveLength(72);
    expect(unsupportedNaxxramasDrops.length).toBeGreaterThan(5);
    naxxItems.forEach((item) => {
      expect(item.id).toBeTypeOf("number");
      expect(item.icon).toContain("wow/icons/large/");
      expect(item.dungeonSetId).toBe("naxxramas");
      expect(item.dungeonSetName).toBe("Naxxramas");
      expect(item.slot).toBeTruthy();
      expect(item.quality).toBe(4);
      expect(item.minLevel).toBe(60);
      expect(item.sourceBosses.length).toBeGreaterThan(0);
    });
  });

  it("keeps unsupported Naxxramas drops out of active reward items", () => {
    const activeIds = new Set(naxxItems.map((item) => item.id));
    unsupportedNaxxramasDrops.forEach((item) => {
      expect(activeIds.has(item.internalId)).toBe(false);
    });
  });
});

describe("raid accessory slot coverage", () => {
  it("adds raid drops for the expanded neck, back, wrist, belt, ring, and trinket slots", () => {
    const expectedDrops = [
      ["molten_core", "wrist", "Bracers of Might"],
      ["molten_core", "belt", "Belt of Might"],
      ["molten_core", "neck", "Choker of the Fire Lord"],
      ["molten_core", "back", "Cloak of the Shrouded Mists"],
      ["molten_core", "ring", "Band of Accuria"],
      ["molten_core", "trinket", "Talisman of Ephemeral Power"],
      ["blackwing_lair", "wrist", "Dragonstalker's Bracers"],
      ["blackwing_lair", "belt", "Dragonstalker's Belt"],
      ["blackwing_lair", "trinket", "Drake Fang Talisman"],
      ["blackwing_lair", "neck", "Prestor's Talisman of Connivery"],
      ["blackwing_lair", "back", "Cloak of Firemaw"],
      ["blackwing_lair", "ring", "Band of Forced Concentration"],
      ["zul_gurub", "neck", "Soul Corrupter's Necklace"],
      ["zul_gurub", "back", "Cloak of Consumption"],
      ["zul_gurub", "ring", "Seal of Jin"],
      ["ahn_qiraj_ruins", "wrist", "Shackles of the Unscarred"],
      ["ahn_qiraj_ruins", "belt", "Belt of the Sand Reaver"],
      ["ahn_qiraj_ruins", "trinket", "Eye of Moam"],
      ["ahn_qiraj_ruins", "neck", "Fury of the Forgotten Swarm"],
      ["ahn_qiraj_ruins", "back", "Sandstorm Cloak"],
      ["ahn_qiraj_ruins", "ring", "Ring of Fury"],
      ["ahn_qiraj_temple", "wrist", "Qiraji Execution Bracers"],
      ["ahn_qiraj_temple", "belt", "Belt of Never-ending Agony"],
      ["ahn_qiraj_temple", "trinket", "Jom Gabbar"],
      ["ahn_qiraj_temple", "neck", "Mark of C'Thun"],
      ["ahn_qiraj_temple", "back", "Cloak of the Devoured"],
      ["ahn_qiraj_temple", "ring", "Ring of the Fallen God"],
      ["onyxias_lair", "trinket", "Shard of the Scale"],
      ["onyxias_lair", "neck", "Eskhandar's Collar"],
      ["onyxias_lair", "back", "Sapphiron Drape"],
      ["naxxramas", "wrist", "Bonescythe Bracers"],
      ["naxxramas", "belt", "Bonescythe Waistguard"],
      ["naxxramas", "trinket", "Eye of the Dead"],
      ["naxxramas", "neck", "Gem of Trapped Innocents"],
      ["naxxramas", "back", "Cloak of the Necropolis"],
      ["naxxramas", "ring", "Frostfire Ring"],
    ];

    expectedDrops.forEach(([sourceId, slot, name]) => {
      const foundDrop = DB_ITEMS.find(
        (item) =>
          item.dungeonSetId === sourceId &&
          item.slot === slot &&
          item.name === name,
      );
      expect(foundDrop, `${sourceId} ${slot} ${name}`).toBeTruthy();
    });
  });
});

describe("item level tuning", () => {
  const getItemsBySource = (sourceId) =>
    DB_ITEMS.filter((item) => item.dungeonSetId === sourceId);
  const getItemsBySetPrefix = (setPrefix) =>
    DB_ITEMS.filter((item) => String(item.setId || "").startsWith(setPrefix));
  const expectItemLevelsWithin = (items, minItemLevel, maxItemLevel) => {
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => {
      const itemLevel = getItemEffectiveLevel(item);
      expect(itemLevel).toBeGreaterThanOrEqual(minItemLevel);
      expect(itemLevel).toBeLessThanOrEqual(maxItemLevel);
    });
  };
  const expectItemLevelsEqual = (items, expectedItemLevel) => {
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => {
      expect(getItemEffectiveLevel(item)).toBe(expectedItemLevel);
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
    expectItemLevelsEqual(getItemsBySetPrefix("t0_"), 66);
    expectItemLevelsWithin(
      getItemsBySource("blackrock_depths"),
      52,
      58,
    );
    expectItemLevelsWithin(
      getItemsBySource("blackrock_spire").filter(
        (item) => !String(item.setId || "").startsWith("t0_"),
      ),
      57,
      63,
    );
  });

  it("has complete Tier 0 dungeon sets across all supported armor slots", () => {
    const expectedSlots = ["belt", "feet", "wrist", "head", "chest", "shoulder", "legs", "hands"];
    const expectedSets = {
      t0_wildheart_raiment: "Druid",
      t0_beaststalker_armor: "Hunter",
      t0_magisters_regalia: "Mage",
      t0_lightforge_armor: "Paladin",
      t0_vestments_of_the_devout: "Priest",
      t0_shadowcraft_armor: "Rogue",
      t0_the_elements: "Shaman",
      t0_dreadmist_raiment: "Warlock",
      t0_battlegear_of_valor: "Warrior",
    };
    const tierZeroItems = DB_ITEMS.filter((item) =>
      String(item.setId || "").startsWith("t0_"),
    );

    expect(tierZeroItems).toHaveLength(72);
    expect(new Set(tierZeroItems.map((item) => item.wowheadId)).size).toBe(72);
    Object.entries(expectedSets).forEach(([setId, className]) => {
      const setItems = tierZeroItems.filter((item) => item.setId === setId);
      expect(setItems.map((item) => item.slot).sort()).toEqual(
        [...expectedSlots].sort(),
      );
      expect(setItems).toHaveLength(8);
      setItems.forEach((item) => {
        expect(item.setName).toBeTruthy();
        expect(item.icon).toContain("wow/icons/large/");
        expect(item.allowedClasses).toEqual([className]);
      });
    });
  });

  it("keeps raid loot in Classic item-level bands", () => {
    expectItemLevelsWithin(getItemsBySource("zul_gurub"), 66, 70);
    expectItemLevelsWithin(getItemsBySource("ahn_qiraj_ruins"), 66, 70);
    expectItemLevelsEqual(getItemsBySetPrefix("t1_"), 70);
    expectItemLevelsEqual(getItemsBySetPrefix("t2_"), 76);
    expectItemLevelsEqual(
      getItemsBySource("molten_core").filter((item) => Number(item.quality) === 4),
      70,
    );
    expectItemLevelsEqual(
      getItemsBySource("molten_core").filter((item) => Number(item.quality) === 5),
      90,
    );
    expectItemLevelsWithin(getItemsBySource("onyxias_lair"), 76, 76);
    expectItemLevelsWithin(getItemsBySource("blackwing_lair"), 76, 76);
    expectItemLevelsWithin(getItemsBySource("ahn_qiraj_temple"), 73, 88);
    expectItemLevelsWithin(getItemsBySource("naxxramas"), 88, 92);
    expectItemLevelsEqual(getItemsBySetPrefix("t3_"), 90);
  });

  it("supports explicit itemLevel over min-level quality fallback", () => {
    expect(getItemEffectiveLevel({ minLevel: 60, quality: 4, itemLevel: 63 })).toBe(63);
  });

  it("adds Classic PvP honor set gear as database-only reward preparation", () => {
    const pvpItems = DB_ITEMS.filter((item) => item.pvpGear);
    const pvpSetItems = pvpItems.filter(
      (item) => item.dungeonSetId === PVP_HONOR_SET_ID,
    );
    const pvpGearItems = pvpItems.filter(
      (item) => item.dungeonSetId === PVP_GEAR_SET_ID,
    );
    const rareItems = pvpSetItems.filter((item) => Number(item.quality) === 3);
    const epicItems = pvpSetItems.filter((item) => Number(item.quality) === 4);
    const paladinItems = pvpSetItems.filter((item) =>
      item.allowedClasses?.includes("Paladin"),
    );
    const shamanItems = pvpSetItems.filter((item) =>
      item.allowedClasses?.includes("Shaman"),
    );
    const druidItems = pvpSetItems.filter((item) =>
      item.allowedClasses?.includes("Druid"),
    );
    const fieldMarshalDruidHelm = pvpSetItems.find(
      (item) => item.name === "Field Marshal's Dragonhide Helmet",
    );
    const fieldMarshalWarlockHelm = pvpSetItems.find(
      (item) => item.name === "Field Marshal's Coronal",
    );
    const generalHunterBoots = pvpSetItems.find(
      (item) => item.name === "General's Chain Sabatons",
    );

    expect(pvpSetItems).toHaveLength(192);
    expect(new Set(pvpSetItems.map((item) => item.wowheadId)).size).toBe(192);
    expect(pvpGearItems).toHaveLength(16);
    expect(pvpItems).toHaveLength(208);
    expect(rareItems).toHaveLength(96);
    expect(epicItems).toHaveLength(96);
    expect(new Set(rareItems.map(getItemEffectiveLevel))).toEqual(new Set([68]));
    expect(new Set(epicItems.map(getItemEffectiveLevel))).toEqual(new Set([74]));
    expect(druidItems).toHaveLength(24);
    expect(new Set(paladinItems.map((item) => item.faction))).toEqual(
      new Set([GUILD_FACTION.ALLIANCE]),
    );
    expect(new Set(shamanItems.map((item) => item.faction))).toEqual(
      new Set([GUILD_FACTION.HORDE]),
    );
    pvpSetItems.forEach((item) => {
      expect(item.dungeonSetId).toBe(PVP_HONOR_SET_ID);
      expect(item.dungeonSetName).toBe(PVP_HONOR_SET_NAME);
      expect(item.minLevel).toBe(60);
      expect(item.allowedClasses).toHaveLength(1);
      expect(item.setId).toBeTruthy();
      expect(item.setName).toBeTruthy();
      expect(item.pvpHonorRank).toBeGreaterThanOrEqual(7);
      expect(item.icon).toContain("wow/icons/large/");
      expect(item.wowheadId).toBeTypeOf("number");
    });
    pvpGearItems.forEach((item) => {
      expect(item.dungeonSetId).toBe(PVP_GEAR_SET_ID);
      expect(item.dungeonSetName).toBe(PVP_GEAR_SET_NAME);
      expect(item.pvpGear).toBe(true);
      expect(item.source).toBe("pvp");
      expect(item.requiredPvpRank).toBeGreaterThan(0);
      expect(item.pvpHonorRank).toBe(item.requiredPvpRank);
      expect(item.pvpTier).toBeTruthy();
      expect(item.slot).toBeTruthy();
      expect(item.quality).toBeGreaterThan(0);
      expect(getItemEffectiveLevel(item)).toBeGreaterThan(0);
      expect(item.faction).toBeTruthy();
    });
    expect(new Set(pvpGearItems.map((item) => item.requiredPvpRank))).toEqual(
      new Set([2, 3, 4, 5, 6, 9, 11, 14]),
    );
    expect(fieldMarshalDruidHelm).toMatchObject({
      wowheadId: 16451,
      icon: "https://wow.zamimg.com/images/wow/icons/large/inv_helmet_41.jpg",
    });
    expect(fieldMarshalWarlockHelm).toMatchObject({
      wowheadId: 17578,
      icon: "https://wow.zamimg.com/images/wow/icons/large/inv_helmet_24.jpg",
    });
    expect(generalHunterBoots).toMatchObject({
      wowheadId: 16569,
      icon: "https://wow.zamimg.com/images/wow/icons/large/inv_boots_plate_06.jpg",
    });
    expect(
      pvpGearItems.find((item) => item.name === "Insignia of the Alliance"),
    ).toMatchObject({
      wowheadId: 18854,
      faction: GUILD_FACTION.ALLIANCE,
      icon: "https://wow.zamimg.com/images/wow/icons/large/inv_jewelry_trinketpvp_01.jpg",
    });
    expect(
      pvpGearItems.find((item) => item.name === "Insignia of the Horde"),
    ).toMatchObject({
      wowheadId: 18834,
      faction: GUILD_FACTION.HORDE,
      icon: "https://wow.zamimg.com/images/wow/icons/large/inv_jewelry_trinketpvp_02.jpg",
    });
    expect(pvpItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slot: "trinket",
          requiredPvpRank: 2,
          faction: GUILD_FACTION.ALLIANCE,
        }),
        expect.objectContaining({
          slot: "back",
          requiredPvpRank: 3,
          faction: GUILD_FACTION.HORDE,
        }),
        expect.objectContaining({
          slot: "neck",
          requiredPvpRank: 4,
        }),
        expect.objectContaining({
          slot: "wrist",
          requiredPvpRank: 5,
        }),
        expect.objectContaining({
          slot: "belt",
          requiredPvpRank: 6,
        }),
        expect.objectContaining({
          slot: "ring",
          requiredPvpRank: 9,
        }),
        expect.objectContaining({
          slot: "trinket",
          requiredPvpRank: 11,
          quality: 4,
        }),
        expect.objectContaining({
          slot: "mainHand",
          requiredPvpRank: 14,
          quality: 4,
        }),
      ]),
    );
  });

  it("lets PvP honor set pieces use normal equipment set bonuses", () => {
    const setPieces = DB_ITEMS.filter(
      (item) => item.setId === "pvp_epic_field_marshals_sanctuary",
    );
    const equipment = Object.fromEntries(
      setPieces
        .filter((item) => ["head", "shoulder", "chest", "legs"].includes(item.slot))
        .map((item) => [item.slot, item]),
    );

    expect(setPieces).toHaveLength(6);
    expect(getEquipmentSetBonuses(equipment)[0]).toMatchObject({
      setId: "pvp_epic_field_marshals_sanctuary",
      setName: "Field Marshal's Sanctuary",
      pieces: 4,
      bonus: 10,
    });
  });

  it("adds world and dungeon drops for expanded equipment slots", () => {
    const expandedSlots = ["neck", "back", "wrist", "belt", "trinket", "ring"];
    const worldItems = DB_ITEMS.filter(
      (item) => expandedSlots.includes(item.slot) && !item.pvpGear && !item.dungeonSetId,
    );
    const dungeonItems = DB_ITEMS.filter(
      (item) => expandedSlots.includes(item.slot) && !item.pvpGear && item.dungeonSetId,
    );
    const starterGear = getStarterGear("Warrior");

    expandedSlots.forEach((slot) => {
      expect(worldItems.some((item) => item.slot === slot)).toBe(true);
      expect(starterGear).toHaveProperty(slot);
    });
    expect(new Set(dungeonItems.map((item) => item.slot))).toEqual(
      new Set(expandedSlots),
    );
  });

  it("adds green and blue world-drop progression for every expanded slot", () => {
    const expandedSlots = ["neck", "back", "wrist", "belt", "trinket", "ring"];
    const worldItems = DB_ITEMS.filter(
      (item) =>
        expandedSlots.includes(item.slot) &&
        !item.pvpGear &&
        !item.dungeonSetId &&
        !item.dungeon,
    );

    expandedSlots.forEach((slot) => {
      const slotItems = worldItems.filter((item) => item.slot === slot);
      expect(slotItems.some((item) => item.quality === 2 && item.minLevel <= 10)).toBe(true);
      expect(slotItems.some((item) => item.quality === 2 && item.minLevel >= 50)).toBe(true);
      expect(slotItems.some((item) => item.quality === 3 && item.minLevel >= 45)).toBe(true);
    });
  });

  it("adds named Classic dungeon drops for the expanded equipment slots", () => {
    const expectedDrops = [
      ["Wailing Caverns", "ring", "Deep Fathom Ring"],
      ["Wailing Caverns", "belt", "Belt of the Fang"],
      ["The Deadmines", "ring", "Lavishly Jeweled Ring"],
      ["The Deadmines", "belt", "Blackened Defias Belt"],
      ["Shadowfang Keep", "ring", "Silverlaine's Family Seal"],
      ["Shadowfang Keep", "back", "Fenrus' Hide"],
      ["Blackfathom Deeps", "belt", "Ghamoo-Ra's Bind"],
      ["Gnomeregan", "wrist", "Spidertank Oilrag"],
      ["Razorfen Kraul", "belt", "Agamaggan's Clutch"],
      ["Razorfen Downs", "ring", "Dragonclaw Ring"],
      ["Uldaman", "wrist", "Revelosh's Armguards"],
      ["Uldaman", "belt", "Girdle of Golem Strength"],
      ["Zul'Farrak", "trinket", "Carrot on a Stick"],
      ["Maraudon", "trinket", "Heart of Noxxion"],
      ["Maraudon", "ring", "Blackstone Ring"],
      ["Temple of Atal'Hakkar", "trinket", "Crest of Supremacy"],
      ["Scholomance", "trinket", "Barov Peasant Caller"],
      ["Scholomance", "belt", "Cadaverous Belt"],
    ];

    expectedDrops.forEach(([dungeon, slot, name]) => {
      const foundDrop = DB_ITEMS.find(
        (item) =>
          item.dungeon === dungeon &&
          item.slot === slot &&
          item.name === name,
      );
      expect(foundDrop, `${dungeon} ${slot} ${name}`).toBeTruthy();
    });
  });

  it("uses the normalized quality fallback when no explicit item level exists", () => {
    expect(getItemEffectiveLevel({ minLevel: 10, quality: 1 })).toBe(10);
    expect(getItemEffectiveLevel({ minLevel: 10, quality: 2 })).toBe(15);
    expect(getItemEffectiveLevel({ minLevel: 10, quality: 3 })).toBe(17);
    expect(getItemEffectiveLevel({ minLevel: 10, quality: 4 })).toBe(20);
    expect(getItemEffectiveLevel({ minLevel: 60, quality: 5 })).toBe(80);
  });
});

describe("character activity priority", () => {
  it("keeps auto characters leveling when professions are near their natural target", () => {
    const plan = resolveCharacterActivityPlan({
      character: {
        id: "natural-leveler",
        level: 30,
        activityMode: "Auto",
        professionSkillBias: 0,
        professions: [
          { name: "Alchemy", skill: 145 },
          { name: "Herbalism", skill: 145 },
        ],
        zonesCleared: [],
      },
      faction: GUILD_FACTION.ALLIANCE,
      levelCap: 60,
      zoneQuestingEnabled: true,
    });

    expect(plan).toMatchObject({
      autoProfessionTarget: 150,
      autoProfessionThreshold: 135,
      gainXP: true,
      gainSkill: false,
      gainZoneProgress: false,
    });
  });

  it("lets auto characters catch up professions when they lag behind", () => {
    const plan = resolveCharacterActivityPlan({
      character: {
        id: "behind-crafter",
        level: 30,
        activityMode: "Auto",
        professionSkillBias: 0,
        professions: [
          { name: "Alchemy", skill: 100 },
          { name: "Herbalism", skill: 145 },
        ],
        zonesCleared: [],
      },
      faction: GUILD_FACTION.ALLIANCE,
      levelCap: 60,
      zoneQuestingEnabled: true,
    });

    expect(plan).toMatchObject({
      professionSkillLimit: 150,
      autoProfessionTarget: 150,
      autoProfessionThreshold: 135,
      gainXP: false,
      gainSkill: true,
      gainZoneProgress: false,
      statusText: "🤖 Auto: Catching up professions...",
    });
  });

  it("keeps the intent helper leveling when auto has no skill catch-up need", () => {
    expect(
      resolveCharacterActivityIntent({
        activityMode: "Auto",
        level: 59,
        levelCap: 60,
        canGainSkill: false,
        hasIncompleteZones: true,
      }),
    ).toEqual({
      gainXP: true,
      gainSkill: false,
      gainZoneProgress: false,
    });
  });

  it("uses max-level professions before finishing zones", () => {
    expect(
      resolveCharacterActivityIntent({
        activityMode: "Auto",
        level: 60,
        levelCap: 60,
        canGainSkill: true,
        hasIncompleteZones: true,
      }),
    ).toEqual({
      gainXP: false,
      gainSkill: true,
      gainZoneProgress: false,
    });
  });

  it("finishes zones once max-level professions are capped", () => {
    expect(
      resolveCharacterActivityIntent({
        activityMode: "Auto",
        level: 60,
        levelCap: 60,
        canGainSkill: false,
        hasIncompleteZones: true,
      }),
    ).toEqual({
      gainXP: false,
      gainSkill: false,
      gainZoneProgress: true,
    });
  });

  it("builds the full idle activity plan from character state", () => {
    const plan = resolveCharacterActivityPlan({
      character: {
        level: 60,
        activityMode: "Auto",
        professions: [
          { name: "Alchemy", skill: 300 },
          { name: "Herbalism", skill: 300 },
        ],
        zonesCleared: [],
      },
      faction: GUILD_FACTION.ALLIANCE,
      levelCap: 60,
      zoneQuestingEnabled: true,
    });

    expect(plan).toMatchObject({
      hardCap: 300,
      canGainSkill: false,
      hasIncompleteZones: true,
      gainXP: false,
      gainSkill: false,
      gainZoneProgress: true,
      statusText: "Auto: Finishing zones...",
    });
  });

  it("scales profession skill attempts by elapsed game time", () => {
    const result = applyProfessionSkillAttempts({
      professions: [{ name: "Alchemy", skill: 1 }],
      currentLimit: 300,
      elapsedGameMs: 8000,
      tickRateMs: 1000,
      random: () => 0.99,
    });

    expect(result.attempts).toBe(8);
    expect(result.changed).toBe(true);
    expect(result.professions[0].skill).toBe(9);
  });

  it("detects when all accessible zones are already complete", () => {
    const allAllianceZoneIds = getZonesForFaction(GUILD_FACTION.ALLIANCE, true)
      .map((zone) => zone.id);

    expect(
      hasIncompleteAccessibleZones({
        faction: GUILD_FACTION.ALLIANCE,
        zonesCleared: allAllianceZoneIds,
      }),
    ).toBe(false);
  });

  it("labels friendly starter zones as safe and enemy starter zones as hostile", () => {
    const elwynn = getZonesForFaction(GUILD_FACTION.ALLIANCE, true).find(
      (zone) => zone.id === "elwynn_forest",
    );
    const durotar = ZONE_DEFINITIONS.find((zone) => zone.id === "durotar");
    const westfall = getZonesForFaction(GUILD_FACTION.ALLIANCE, true).find(
      (zone) => zone.id === "westfall",
    );
    const ashenvale = getZonesForFaction(GUILD_FACTION.ALLIANCE, true).find(
      (zone) => zone.id === "ashenvale",
    );

    expect(
      getZonePvpTerritory(
        elwynn,
        GUILD_SERVER_STYLE.PVP,
        GUILD_FACTION.ALLIANCE,
      )?.label,
    ).toBe(
      "Safe Territory",
    );
    expect(
      getZonePvpTerritory(
        durotar,
        GUILD_SERVER_STYLE.PVP,
        GUILD_FACTION.ALLIANCE,
      )?.label,
    ).toBe("Hostile Territory");
    expect(
      getZonePvpTerritory(
        elwynn,
        GUILD_SERVER_STYLE.PVP,
        GUILD_FACTION.HORDE,
      )?.label,
    ).toBe("Hostile Territory");
    expect(getZonePvpTerritory(westfall, GUILD_SERVER_STYLE.PVP)?.label).toBe(
      "Contested Territory",
    );
    expect(getZonePvpTerritory(ashenvale, GUILD_SERVER_STYLE.PVP)?.label).toBe(
      "Contested Territory",
    );
    expect(getZonePvpTerritory(ashenvale, GUILD_SERVER_STYLE.PVE)).toBeNull();
  });

  it("builds faction-aware world PvP profiles for starter zones", () => {
    const elwynn = ZONE_DEFINITIONS.find((zone) => zone.id === "elwynn_forest");
    const durotar = ZONE_DEFINITIONS.find((zone) => zone.id === "durotar");
    const westfall = ZONE_DEFINITIONS.find((zone) => zone.id === "westfall");
    const duskwood = ZONE_DEFINITIONS.find((zone) => zone.id === "duskwood");
    const ashenvale = ZONE_DEFINITIONS.find((zone) => zone.id === "ashenvale");
    const silverpine = ZONE_DEFINITIONS.find(
      (zone) => zone.id === "silverpine_forest",
    );

    expect(
      getWorldPvpProfile({
        zone: ashenvale,
        characterFaction: GUILD_FACTION.ALLIANCE,
        realmType: GUILD_SERVER_STYLE.PVE,
      }),
    ).toMatchObject({
      pvpType: WORLD_PVP_PROFILE_TYPE.CONTESTED,
      active: false,
    });
    expect(
      getWorldPvpProfile({
        zone: elwynn,
        characterFaction: GUILD_FACTION.ALLIANCE,
        realmType: GUILD_SERVER_STYLE.PVP,
      }),
    ).toMatchObject({
      pvpType: WORLD_PVP_PROFILE_TYPE.SAFE,
      active: false,
    });
    expect(
      getWorldPvpProfile({
        zone: durotar,
        characterFaction: GUILD_FACTION.ALLIANCE,
        realmType: GUILD_SERVER_STYLE.PVP,
      }),
    ).toMatchObject({
      pvpType: WORLD_PVP_PROFILE_TYPE.HOSTILE,
      active: true,
      controllingFaction: GUILD_FACTION.HORDE,
    });
    expect(
      getWorldPvpProfile({
        zone: elwynn,
        characterFaction: GUILD_FACTION.HORDE,
        realmType: GUILD_SERVER_STYLE.PVP,
      }),
    ).toMatchObject({
      pvpType: WORLD_PVP_PROFILE_TYPE.HOSTILE,
      active: true,
      controllingFaction: GUILD_FACTION.ALLIANCE,
    });
    expect(
      getWorldPvpProfile({
        zone: westfall,
        characterFaction: GUILD_FACTION.ALLIANCE,
        realmType: GUILD_SERVER_STYLE.PVP,
      }),
    ).toMatchObject({
      pvpType: WORLD_PVP_PROFILE_TYPE.CONTESTED,
      active: true,
    });
    expect(
      getWorldPvpProfile({
        zone: duskwood,
        characterFaction: GUILD_FACTION.ALLIANCE,
        realmType: GUILD_SERVER_STYLE.PVP,
      }),
    ).toMatchObject({
      pvpType: WORLD_PVP_PROFILE_TYPE.CONTESTED,
      active: true,
    });
    expect(
      getWorldPvpProfile({
        zone: ashenvale,
        characterFaction: GUILD_FACTION.ALLIANCE,
        realmType: GUILD_SERVER_STYLE.PVP,
      }),
    ).toMatchObject({
      pvpType: WORLD_PVP_PROFILE_TYPE.CONTESTED,
      active: true,
    });
    expect(
      getWorldPvpProfile({
        zone: silverpine,
        characterFaction: GUILD_FACTION.ALLIANCE,
        realmType: GUILD_SERVER_STYLE.PVP,
      }),
    ).toMatchObject({
      pvpType: WORLD_PVP_PROFILE_TYPE.CONTESTED,
      active: true,
    });
  });

  it("resolves daily world PvP only for eligible contested-zone characters", () => {
    const roster = [
      {
        id: "hero-1",
        name: "Kaya",
        level: 30,
        role: "Tank",
        charClass: "Warrior",
        status: "Idle",
        currentZoneId: "ashenvale",
        currentZoneProgress: 30,
        zoneProgressById: { ashenvale: 30 },
      },
      {
        id: "hero-2",
        name: "ManaBiscuit",
        level: 30,
        role: "DPS",
        charClass: "Hunter",
        status: "Idle",
        currentZoneId: "ashenvale",
        currentZoneProgress: 40,
        zoneProgressById: { ashenvale: 40 },
      },
      {
        id: "hero-3",
        name: "Busy",
        level: 30,
        role: "DPS",
        charClass: "Rogue",
        status: "Questing",
        currentZoneId: "ashenvale",
      },
    ];
    const result = resolveWorldPvpForDay({
      roster,
      activeMissions: [{ memberIds: ["hero-3"] }],
      guildFaction: GUILD_FACTION.ALLIANCE,
      realmType: GUILD_SERVER_STYLE.PVP,
      worldPvpState: ensureWorldPvpState(null, 0),
      currentDayIndex: 1,
      random: () => 0,
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].participantIds).toEqual(["hero-1", "hero-2"]);
    expect(result.logs[0]).toMatchObject({
      type: "pvp",
      zoneId: "ashenvale",
    });
    expect(result.worldPvpState.totalHonor).toBeGreaterThan(0);
    expect(result.worldPvpState.zoneStats.ashenvale.eventsTriggered).toBe(1);
    expect(result.roster.find((member) => member.id === "hero-1")?.pvp.weeklyHonor).toBeGreaterThan(0);
    expect(result.roster.find((member) => member.id === "hero-2")?.pvp.weeklyHonor).toBeGreaterThan(0);
    expect(result.roster.find((member) => member.id === "hero-1")?.pvp.honorableKills).toBe(1);
    expect(
      result.roster.find((member) => member.id === "hero-3")?.status,
    ).toBe("Questing");
    expect(result.roster.find((member) => member.id === "hero-3")?.pvp).toBeUndefined();
  });

  it("hydrates character PvP data and awards personal honor safely", () => {
    const oldSaveCharacter = { id: "old", name: "Oldsave", charClass: "Mage" };
    const hydrated = ensureCharacterPvpData(oldSaveCharacter, GUILD_FACTION.HORDE);
    const awarded = awardCharacterHonor(hydrated, {
      honor: 275,
      honorableKills: 2,
    }, GUILD_FACTION.HORDE);

    expect(hydrated.pvp).toMatchObject({
      lifetimeHonor: 0,
      weeklyHonor: 0,
      rankProgress: 0,
      rank: 0,
      title: "Unranked",
      highestRank: 0,
      highestTitle: "Unranked",
      honorableKills: 0,
      unlockedPvpGearIds: [],
    });
    expect(awarded.pvp.weeklyHonor).toBe(275);
    expect(awarded.pvp.lifetimeHonor).toBe(275);
    expect(awarded.pvp.honorableKills).toBe(2);
  });

  it("rolls weekly PvP honor into no-decay rank progress and equips unlocked rewards", () => {
    const character = ensureCharacterPvpData({
      id: "pvp-hero",
      name: "Arathi",
      charClass: "Warrior",
      level: 20,
      equipment: getStarterGear("Warrior"),
      pvp: {
        weeklyHonor: 1200,
        lifetimeHonor: 1200,
      },
    }, GUILD_FACTION.ALLIANCE);

    const result = applyWeeklyPvpRollover({
      characters: [character],
      currentDay: 7,
      faction: GUILD_FACTION.ALLIANCE,
      allItems: DB_ITEMS,
      lastRolloverDayIndex: 0,
    });
    const nextCharacter = result.characters[0];

    expect(result.didRollover).toBe(true);
    expect(nextCharacter.pvp.weeklyHonor).toBe(0);
    expect(nextCharacter.pvp.rankProgress).toBe(300);
    expect(nextCharacter.pvp.rank).toBe(2);
    expect(nextCharacter.pvp.title).toBe("Corporal");
    expect(nextCharacter.pvp.highestRank).toBe(2);
    expect(nextCharacter.pvp.unlockedPvpGearIds.length).toBeGreaterThan(0);
    expect(nextCharacter.equipment.trinket).toMatchObject({
      pvpGear: true,
      requiredPvpRank: 2,
      faction: GUILD_FACTION.ALLIANCE,
    });
    expect(result.logs[0].message).toContain("Trinket");

    const inactiveWeek = applyWeeklyPvpRollover({
      characters: [nextCharacter],
      currentDay: 14,
      faction: GUILD_FACTION.ALLIANCE,
      allItems: DB_ITEMS,
      lastRolloverDayIndex: 7,
    });

    expect(inactiveWeek.characters[0].pvp.rankProgress).toBe(300);
    expect(inactiveWeek.characters[0].pvp.rank).toBe(2);
  });

  it("rolls missed weekly PvP boundaries after skipped calendar days", () => {
    const character = ensureCharacterPvpData({
      id: "pvp-sleeper",
      name: "Sentinel",
      charClass: "Warrior",
      level: 20,
      equipment: getStarterGear("Warrior"),
      pvp: {
        weeklyHonor: 800,
        lifetimeHonor: 800,
      },
    }, GUILD_FACTION.ALLIANCE);

    const skippedBoundary = applyWeeklyPvpRollover({
      characters: [character],
      currentDay: 8,
      faction: GUILD_FACTION.ALLIANCE,
      allItems: DB_ITEMS,
      lastRolloverDayIndex: 6,
    });

    expect(skippedBoundary.didRollover).toBe(true);
    expect(skippedBoundary.currentDayIndex).toBe(8);
    expect(skippedBoundary.characters[0].pvp.weeklyHonor).toBe(0);
    expect(skippedBoundary.characters[0].pvp.rankProgress).toBe(200);

    const sameWeek = applyWeeklyPvpRollover({
      characters: [
        {
          ...skippedBoundary.characters[0],
          pvp: {
            ...skippedBoundary.characters[0].pvp,
            weeklyHonor: 400,
          },
        },
      ],
      currentDay: 13,
      faction: GUILD_FACTION.ALLIANCE,
      allItems: DB_ITEMS,
      lastRolloverDayIndex: skippedBoundary.currentDayIndex,
    });

    expect(sameWeek.didRollover).toBe(false);
    expect(sameWeek.characters[0].pvp.weeklyHonor).toBe(400);
    expect(sameWeek.characters[0].pvp.rankProgress).toBe(200);
  });

  it("caps weekly PvP progress and respects faction gear unlocks", () => {
    const character = ensureCharacterPvpData({
      id: "pvp-cap",
      name: "Stonewatch",
      charClass: "Warrior",
      level: 60,
      equipment: getStarterGear("Warrior"),
      pvp: {
        weeklyHonor: 10000,
        lifetimeHonor: 10000,
      },
    }, GUILD_FACTION.HORDE);
    const result = applyWeeklyPvpRollover({
      characters: [character],
      currentDay: 7,
      faction: GUILD_FACTION.HORDE,
      allItems: DB_ITEMS,
      lastRolloverDayIndex: 0,
    });
    const nextCharacter = result.characters[0];
    const unlocked = getUnlockedPvpGearForCharacter(
      nextCharacter,
      DB_ITEMS,
      GUILD_FACTION.HORDE,
    );

    expect(nextCharacter.pvp.rankProgress).toBe(PVP_WEEKLY_PROGRESS_CAP);
    expect(nextCharacter.pvp.rank).toBe(4);
    expect(unlocked.every((item) => !item.faction || item.faction === GUILD_FACTION.HORDE)).toBe(true);
    expect(unlocked.some((item) => item.slot === "neck" && item.requiredPvpRank === 4)).toBe(true);
  });

  it("unlocks non-set PvP gear at every practical milestone rank", () => {
    const character = ensureCharacterPvpData({
      id: "pvp-milestones",
      name: "Marshalgear",
      charClass: "Warrior",
      level: 60,
      equipment: getStarterGear("Warrior"),
      pvp: {
        rank: 11,
        highestRank: 11,
      },
    }, GUILD_FACTION.ALLIANCE);
    const unlocked = getUnlockedPvpGearForCharacter(
      character,
      DB_ITEMS,
      GUILD_FACTION.ALLIANCE,
    ).filter((item) => item.dungeonSetId === PVP_GEAR_SET_ID);
    const unlockedRanks = new Set(unlocked.map((item) => item.requiredPvpRank));

    [2, 3, 4, 5, 6, 9, 11].forEach((rank) => {
      expect(unlockedRanks.has(rank), `rank ${rank}`).toBe(true);
    });
    expect(unlockedRanks.has(14)).toBe(false);
    expect(unlocked.every((item) => item.faction === GUILD_FACTION.ALLIANCE)).toBe(true);

    const hordeUnlocked = getUnlockedPvpGearForCharacter(
      { ...character, pvp: { rank: 14, highestRank: 14 } },
      DB_ITEMS,
      GUILD_FACTION.HORDE,
    ).filter((item) => item.dungeonSetId === PVP_GEAR_SET_ID);
    expect(hordeUnlocked.some((item) => item.requiredPvpRank === 14)).toBe(true);
    expect(hordeUnlocked.every((item) => item.faction === GUILD_FACTION.HORDE)).toBe(true);
  });

  it("does not trigger world PvP on PvE realms or repeat the same processed day", () => {
    const roster = [
      {
        id: "hero-1",
        name: "Kaya",
        level: 30,
        status: "Idle",
        currentZoneId: "ashenvale",
      },
    ];
    const pveResult = resolveWorldPvpForDay({
      roster,
      guildFaction: GUILD_FACTION.ALLIANCE,
      realmType: GUILD_SERVER_STYLE.PVE,
      worldPvpState: ensureWorldPvpState(null, 0),
      currentDayIndex: 1,
      random: () => 0,
    });
    const repeatedResult = resolveWorldPvpForDay({
      roster,
      guildFaction: GUILD_FACTION.ALLIANCE,
      realmType: GUILD_SERVER_STYLE.PVP,
      worldPvpState: { ...ensureWorldPvpState(null, 0), lastProcessedDayIndex: 1 },
      currentDayIndex: 1,
      random: () => 0,
    });

    expect(pveResult.events).toHaveLength(0);
    expect(pveResult.worldPvpState.lastProcessedDayIndex).toBe(1);
    expect(repeatedResult.events).toHaveLength(0);
  });

  it("moves idle level 50+ characters to high-level contested World PvP zones", () => {
    const candidates = getWorldPvpRoamingZoneCandidates({
      level: 60,
      faction: GUILD_FACTION.ALLIANCE,
      realmType: GUILD_SERVER_STYLE.PVP,
    });
    const roamer = resolveWorldPvpRoamingAssignment({
      character: {
        id: "pvp-roamer",
        name: "Kaya",
        level: 60,
        status: "Idle",
        statusText: "Awaiting Orders",
        currentZoneId: "elwynn_forest",
        zoneProgressById: {},
      },
      faction: GUILD_FACTION.ALLIANCE,
      realmType: GUILD_SERVER_STYLE.PVP,
    });
    const pveRoamer = resolveWorldPvpRoamingAssignment({
      character: {
        id: "pve-roamer",
        name: "Kaya",
        level: 60,
        status: "Idle",
        currentZoneId: "elwynn_forest",
      },
      faction: GUILD_FACTION.ALLIANCE,
      realmType: GUILD_SERVER_STYLE.PVE,
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((zone) => zone.minLevel >= 45)).toBe(true);
    expect(candidates.every((zone) => zone.maxLevel >= 55)).toBe(true);
    expect(candidates.some((zone) => zone.id === roamer.currentZoneId)).toBe(true);
    expect(roamer.status).toBe("Idle");
    expect(roamer.statusText).toContain("World PvP:");
    expect(pveRoamer.currentZoneId).toBe("elwynn_forest");
  });

  it("keeps manual or busy characters out of automatic World PvP roaming", () => {
    const manualRoamer = resolveWorldPvpRoamingAssignment({
      character: {
        id: "manual-roamer",
        name: "Manual",
        level: 60,
        status: "Idle",
        currentZoneId: "elwynn_forest",
        zoneManualOverride: true,
      },
      faction: GUILD_FACTION.ALLIANCE,
      realmType: GUILD_SERVER_STYLE.PVP,
    });
    const busyRoamer = resolveWorldPvpRoamingAssignment({
      character: {
        id: "busy-roamer",
        name: "Busy",
        level: 60,
        status: "Questing",
        currentZoneId: "elwynn_forest",
      },
      faction: GUILD_FACTION.ALLIANCE,
      realmType: GUILD_SERVER_STYLE.PVP,
    });

    expect(manualRoamer.currentZoneId).toBe("elwynn_forest");
    expect(busyRoamer.currentZoneId).toBe("elwynn_forest");
  });

  it("moves max-level characters off a current zone already marked cleared", () => {
    const result = resolveZoneAutoTransition({
      faction: GUILD_FACTION.ALLIANCE,
      level: 60,
      currentZoneId: "silithus",
      currentZoneProgress: 100,
      zoneProgressById: { silithus: 100 },
      zonesCleared: ["silithus"],
      zoneCheckpointRewardsClaimedByZone: { silithus: [25, 50, 75, 100] },
      zoneManualOverride: false,
      zoneOverlevelMoveThreshold: 10,
    });

    expect(result.currentZoneId).not.toBe("silithus");
  });
});

describe("zone completion personality", () => {
  const getClearedExcept = (...zoneIdsToKeep) => {
    const keepSet = new Set(zoneIdsToKeep);
    return getZonesForFaction(GUILD_FACTION.ALLIANCE, true)
      .map((zone) => zone.id)
      .filter((zoneId) => !keepSet.has(zoneId));
  };

  it("derives stable but varied zone preferences from character identity", () => {
    const first = getCharacterZonePreference({
      id: "stable-hero",
      name: "Stable",
      race: "Human",
      charClass: "Warrior",
    });
    const repeat = getCharacterZonePreference({
      id: "stable-hero",
      name: "Stable",
      race: "Human",
      charClass: "Warrior",
    });
    const variedArchetypes = new Set(
      ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"].map(
        (id) => getCharacterZonePreference({ id }).archetype,
      ),
    );

    expect(repeat).toEqual(first);
    expect(variedArchetypes.size).toBeGreaterThan(1);
  });

  it("lets gear seekers prioritize high-end unfinished zones", () => {
    const nextZone = pickNextZoneForCharacter({
      faction: GUILD_FACTION.ALLIANCE,
      level: 60,
      zonesCleared: [],
      currentZoneId: "elwynn_forest",
      zonePreference: {
        archetype: ZONE_COMPLETION_ARCHETYPE.GEAR_SEEKER,
        likedBiomes: [],
        dislikedBiomes: [],
        likedEnemies: [],
        dislikedEnemies: [],
      },
    });

    expect(nextZone.maxLevel).toBeGreaterThanOrEqual(50);
  });

  it("lets completionists start low and move upward", () => {
    const nextZone = pickNextZoneForCharacter({
      faction: GUILD_FACTION.ALLIANCE,
      level: 60,
      zonesCleared: [],
      currentZoneId: "eastern_plaguelands",
      zonePreference: {
        archetype: ZONE_COMPLETION_ARCHETYPE.COMPLETIONIST,
        likedBiomes: [],
        dislikedBiomes: [],
        likedEnemies: [],
        dislikedEnemies: [],
      },
    });

    expect(nextZone.minLevel).toBe(1);
  });

  it("routes Elwynn characters mostly toward Westfall while preserving variety", () => {
    const pickedZoneIds = Array.from({ length: 40 }, (_, index) =>
      pickNextZoneForCharacter({
        faction: GUILD_FACTION.ALLIANCE,
        level: 10,
        zonesCleared: ["elwynn_forest"],
        currentZoneId: "elwynn_forest",
        character: {
          id: `human-route-${index}`,
          race: "Human",
          charClass: "Warrior",
        },
      }).id,
    );
    const counts = pickedZoneIds.reduce((acc, zoneId) => {
      acc[zoneId] = (acc[zoneId] || 0) + 1;
      return acc;
    }, {});

    expect(counts.westfall).toBeGreaterThan(counts.darkshore || 0);
    expect(counts.westfall).toBeGreaterThan(counts.loch_modan || 0);
    expect(new Set(pickedZoneIds).size).toBeGreaterThan(1);
  });

  it("keeps race starter routes distinct after the first zone", () => {
    const dwarfRoutes = Array.from({ length: 30 }, (_, index) =>
      pickNextZoneForCharacter({
        faction: GUILD_FACTION.ALLIANCE,
        level: 10,
        zonesCleared: ["dun_morogh"],
        currentZoneId: "dun_morogh",
        character: { id: `dwarf-route-${index}`, race: "Dwarf" },
      }).id,
    );
    const nightElfRoutes = Array.from({ length: 30 }, (_, index) =>
      pickNextZoneForCharacter({
        faction: GUILD_FACTION.ALLIANCE,
        level: 10,
        zonesCleared: ["teldrassil"],
        currentZoneId: "teldrassil",
        character: { id: `night-elf-route-${index}`, race: "Night Elf" },
      }).id,
    );

    expect(
      dwarfRoutes.filter((zoneId) => zoneId === "loch_modan").length,
    ).toBeGreaterThan(dwarfRoutes.filter((zoneId) => zoneId === "darkshore").length);
    expect(
      nightElfRoutes.filter((zoneId) => zoneId === "darkshore").length,
    ).toBeGreaterThan(
      nightElfRoutes.filter((zoneId) => zoneId === "westfall").length,
    );
  });

  it("lets favorite biomes lift matching zones above default order", () => {
    const nextZone = pickNextZoneForCharacter({
      faction: GUILD_FACTION.ALLIANCE,
      level: 60,
      zonesCleared: getClearedExcept("tanaris", "feralas"),
      currentZoneId: "feralas",
      zonePreference: {
        archetype: ZONE_COMPLETION_ARCHETYPE.WANDERER,
        likedBiomes: ["desert"],
        dislikedBiomes: [],
        likedEnemies: [],
        dislikedEnemies: [],
      },
    });

    expect(nextZone.id).toBe("tanaris");
  });

  it("penalizes disliked zones without blocking the last remaining option", () => {
    const avoidDesert = {
      archetype: ZONE_COMPLETION_ARCHETYPE.AVOIDANT,
      likedBiomes: [],
      dislikedBiomes: ["desert"],
      likedEnemies: [],
      dislikedEnemies: [],
    };
    const withAlternative = pickNextZoneForCharacter({
      faction: GUILD_FACTION.ALLIANCE,
      level: 60,
      zonesCleared: getClearedExcept("tanaris", "feralas"),
      currentZoneId: "tanaris",
      zonePreference: avoidDesert,
    });
    const onlyDisliked = pickNextZoneForCharacter({
      faction: GUILD_FACTION.ALLIANCE,
      level: 60,
      zonesCleared: getClearedExcept("tanaris"),
      currentZoneId: "tanaris",
      zonePreference: avoidDesert,
    });

    expect(withAlternative.id).toBe("feralas");
    expect(onlyDisliked.id).toBe("tanaris");
  });

  it("never selects cleared or inaccessible zones", () => {
    const nextZone = pickNextZoneForCharacter({
      faction: GUILD_FACTION.ALLIANCE,
      level: 60,
      zonesCleared: getClearedExcept("the_barrens", "darkshore"),
      currentZoneId: "darkshore",
      zonePreference: {
        archetype: ZONE_COMPLETION_ARCHETYPE.WANDERER,
        likedBiomes: ["barren"],
        dislikedBiomes: [],
        likedEnemies: [],
        dislikedEnemies: [],
      },
    });

    expect(nextZone.id).toBe("darkshore");
    expect(nextZone.faction).not.toBe(GUILD_FACTION.HORDE);
  });
});

describe("character morale", () => {
  it("defaults, clamps, and resolves morale bands", () => {
    expect(getCharacterMorale({})).toBe(50);
    expect(clampMorale(-10)).toBe(0);
    expect(clampMorale(111)).toBe(100);
    expect(getMoraleBand(25)).toBe(MORALE_BAND.LOW);
    expect(getMoraleBand(26)).toBe(MORALE_BAND.STEADY);
    expect(getMoraleBand(74)).toBe(MORALE_BAND.STEADY);
    expect(getMoraleBand(75)).toBe(MORALE_BAND.HIGH);
    expect(getMoraleLabel(25)).toBe("\u2193 Low");
    expect(getMoraleLabel(50)).toBe("\u2192 Steady");
    expect(getMoraleLabel(75)).toBe("\u2191 High");
  });

  it("applies morale deltas while staying within the 0-100 scale", () => {
    expect(applyMoraleDelta({ morale: 3 }, MORALE_WIPE_DELTA).morale).toBe(0);
    expect(applyMoraleDelta({ morale: 98 }, MORALE_ZONE_CLEAR_DELTA).morale).toBe(
      100,
    );
    expect(applyMoraleDelta({ morale: 50 }, MORALE_DUNGEON_CLEAR_DELTA).morale).toBe(
      58,
    );
  });

  it("caps party morale success bonuses", () => {
    const highParty = Array.from({ length: 8 }, (_, index) => ({
      id: `high-${index}`,
      morale: 90,
    }));
    const lowParty = Array.from({ length: 8 }, (_, index) => ({
      id: `low-${index}`,
      morale: 10,
    }));
    const mixedParty = [
      { morale: 90 },
      { morale: 90 },
      { morale: 50 },
      { morale: 10 },
    ];

    expect(getPartyMoraleSuccessBonus(highParty)).toBe(5);
    expect(getPartyMoraleSuccessBonus(lowParty)).toBe(-5);
    expect(getPartyMoraleSuccessBonus(mixedParty)).toBe(1);
  });

  it("only treats level-appropriate content as morale-rewarding", () => {
    const zone = { minLevel: 20, maxLevel: 30 };
    const mission = {
      recommended: "18 - 23",
      minLevel: 10,
      level: 23,
    };

    expect(isCharacterInZoneLevelRange({ level: 25 }, zone)).toBe(true);
    expect(isCharacterInZoneLevelRange({ level: 60 }, zone)).toBe(false);
    expect(isCharacterInMissionLevelRange({ level: 20 }, mission)).toBe(true);
    expect(isCharacterInMissionLevelRange({ level: 60 }, mission)).toBe(false);
  });
});

describe("realm overview domain", () => {
  const advanceRealmUntilApplications = ({
    realm,
    faction = GUILD_FACTION.ALLIANCE,
    maxDayIndex = 45,
  }) => {
    for (let dayIndex = 1; dayIndex <= maxDayIndex; dayIndex += 1) {
      const advanced = advanceRealmSimulation({
        realmState: realm,
        currentDayIndex: dayIndex,
        playerGuildSnapshot: null,
        guildSetup: {
          faction,
          server: "Everlook",
          serverStyle: GUILD_SERVER_STYLE.PVE,
        },
      });
      const applications = getRealmGuildApplications({
        realmState: advanced,
        faction,
      });
      if (applications.length > 0) return { advanced, applications };
    }
    return { advanced: realm, applications: [] };
  };

  const advanceRealmToStep = ({ realm, stepIndex, playerGuildSnapshot, guildSetup }) => {
    const dayIndex = Math.floor(stepIndex / 4);
    const dayProgress = (stepIndex % 4) / 4;
    return advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: dayIndex,
      currentDayProgress: dayProgress,
      playerGuildSnapshot,
      guildSetup,
    });
  };

  const getRealmCadenceSnapshot = (realm) => ({
    ageDays: realm.ageDays,
    lastSimulatedDayIndex: realm.lastSimulatedDayIndex,
    lastSimulatedStepIndex: realm.lastSimulatedStepIndex,
    populationCount: realm.population.players.length,
    dailyStats: realm.population.dailyStats,
    guilds: realm.npcGuilds.map((guild) => ({
      id: guild.id,
      rosterSize: guild.roster.length,
      averageLevel: guild.averageLevel,
      averageGearScore: guild.averageGearScore,
      dungeonScore: guild.dungeonScore,
      raidProgress: guild.raidProgress,
      pveScore: guild.pveScore,
    })),
  });

  it("generates deterministic NPC guilds for the same realm", () => {
    const first = generateNpcGuilds({
      realmName: "Everlook",
      realmType: GUILD_SERVER_STYLE.PVE,
    });
    const second = generateNpcGuilds({
      realmName: "Everlook",
      realmType: GUILD_SERVER_STYLE.PVE,
    });

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThanOrEqual(4);
    expect(first.length).toBeLessThanOrEqual(6);
  });

  it("keeps realm NPC guild rosters on valid Classic race/class combinations", () => {
    const guilds = generateNpcGuilds({
      realmName: "Everlook",
      realmType: GUILD_SERVER_STYLE.PVE,
    });
    const members = guilds.flatMap((guild) => guild.roster);

    expect(members.length).toBeGreaterThan(0);
    expect(members.every(isValidRaceClassCombo)).toBe(true);
  });

  it("normalizes invalid realm players back to valid race/class combinations", () => {
    const taurenPriest = createRealmPlayer({
      id: "bad-combo",
      name: "Wronghorn",
      faction: GUILD_FACTION.HORDE,
      race: "Tauren",
      charClass: "Priest",
      role: "Healer",
    });

    expect(taurenPriest.race).toBe("Tauren");
    expect(isValidRaceClassCombo(taurenPriest)).toBe(true);
    expect(taurenPriest.charClass).not.toBe("Priest");
  });

  it("ensures missing realm state from guild setup without simulating old days", () => {
    const realm = ensureRealmState(
      null,
      { server: "Firemaw", serverStyle: GUILD_SERVER_STYLE.PVP },
      12,
    );

    expect(realm).toMatchObject({
      name: "Firemaw",
      type: GUILD_SERVER_STYLE.PVP,
      ageDays: 12,
      lastSimulatedDayIndex: 12,
    });
    expect(realm.npcGuilds.length).toBeGreaterThanOrEqual(4);
    expect(realm.npcGuilds.length).toBeLessThanOrEqual(6);
  });

  it("initializes a fresh medium-pop realm around 200 population with a 1k soft cap", () => {
    const realm = ensureRealmState(
      null,
      { server: "Lordaeron", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
      10,
    );
    const stats = getRealmPopulationStats(realm, Array.from({ length: 10 }));

    expect(stats.totalPopulation).toBe(200);
    expect(realm.population.players).toHaveLength(190);
    expect(realm.population.players.every(isValidRaceClassCombo)).toBe(true);
    expect(stats.softCap).toBeGreaterThanOrEqual(900);
    expect(stats.softCap).toBeLessThanOrEqual(1100);
  });

  it("initializes a fresh high-pop realm with a 1.5k soft cap", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
      10,
    );
    const stats = getRealmPopulationStats(realm, Array.from({ length: 10 }));

    expect(realm.populationLabel).toBe(GUILD_SERVER_POPULATION.HIGH);
    expect(stats.totalPopulation).toBe(200);
    expect(stats.softCap).toBeGreaterThanOrEqual(1400);
    expect(stats.softCap).toBeLessThanOrEqual(1600);
  });

  it("starts fresh NPC guild and realm players at level 1 with no raid progress", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const npcMembers = realm.npcGuilds.flatMap((guild) => guild.roster);
    const raidBossesCleared = realm.npcGuilds.reduce(
      (sum, guild) =>
        sum +
        getRealmRaidProgressList(guild).reduce(
          (raidSum, raid) => raidSum + raid.clearedBosses,
          0,
        ),
      0,
    );

    expect(realm.npcGuilds.length).toBeGreaterThanOrEqual(4);
    expect(realm.npcGuilds.length).toBeLessThanOrEqual(6);
    expect(realm.npcGuilds.every((guild) => guild.roster.length >= 6)).toBe(true);
    expect(realm.npcGuilds.every((guild) => guild.roster.length <= 15)).toBe(true);
    expect(npcMembers.length).toBeGreaterThan(0);
    expect(npcMembers.every((member) => member.level === 1)).toBe(true);
    expect(realm.population.players.every((player) => player.level === 1)).toBe(true);
    expect(realm.npcGuilds.every((guild) => Number(guild.dungeonScore) === 0)).toBe(true);
    expect(
      realm.npcGuilds.every(
        (guild) => !guild.clearedDungeonMissions || guild.clearedDungeonMissions.length === 0,
      ),
    ).toBe(true);
    expect(raidBossesCleared).toBe(0);
  });

  it("generates deterministic NPC rosters with max-level counts", () => {
    const first = generateNpcGuilds({
      realmName: "Everlook",
      realmType: GUILD_SERVER_STYLE.PVE,
    });
    const repeat = generateNpcGuilds({
      realmName: "Everlook",
      realmType: GUILD_SERVER_STYLE.PVE,
    });
    const guild = first[0];

    expect(first[0].roster).toEqual(repeat[0].roster);
    expect(guild.roster.length).toBeLessThanOrEqual(getRealmRosterCap());
    expect(guild.maxLevelCount).toBe(getRealmMaxLevelCount(guild.roster));
  });

  it("includes and highlights the player guild in PvE rankings", () => {
    const realmState = {
      npcGuilds: [
        {
          id: "npc:1",
          name: "Dawnspire",
          faction: GUILD_FACTION.ALLIANCE,
          archetype: "Hardcore Raiders",
          rosterSize: 40,
          averageLevel: 60,
          averageGearScore: 50,
          activityLevel: 90,
          pveScore: 500,
          raidProgress: 20,
          dungeonScore: 300,
          reputation: 70,
        },
      ],
    };
    const playerSnapshot = buildPlayerGuildSnapshot({
      guildSetup: { name: "Player Guild", faction: GUILD_FACTION.HORDE },
      roster: [
        { id: "hero", level: 60, equipment: {}, clearedMissionIds: [] },
      ],
      missionList: [],
      guildProgress: createInitialGuildProgress(),
    });
    const rankings = buildRealmRankings({ realmState, playerGuildSnapshot: playerSnapshot });
    const playerRow = getPlayerRealmRanking(rankings);

    expect(playerRow).toMatchObject({
      name: "Player Guild",
      isPlayerGuild: true,
      maxLevelCount: 1,
    });
    expect(rankings.map((row) => row.rank)).toEqual([1, 2]);
  });

  it("ranks meaningful raid boss progress above a no-raid dungeon lead", () => {
    const realmState = {
      npcGuilds: [
        {
          id: "npc:storm",
          name: "Stormcallers",
          faction: GUILD_FACTION.HORDE,
          archetype: "Hardcore Raiders",
          rosterSize: 63,
          averageLevel: 48.3,
          averageGearScore: 42,
          activityLevel: 90,
          pveScore: 1000,
          raidProgress: 28,
          raidProgressByRaid: {
            molten_core: { clearedBosses: 7, completed: false },
          },
          dungeonScore: 450,
          reputation: 70,
        },
      ],
    };
    const playerGuildSnapshot = {
      id: "player:guild",
      name: "Player Guild",
      faction: GUILD_FACTION.ALLIANCE,
      isPlayerGuild: true,
      archetype: "Player Guild",
      rosterSize: 21,
      maxLevelCount: 0,
      averageLevel: 42.2,
      averageGearScore: 50,
      pveScore: 1600,
      raidProgress: 0,
      raidProgressByRaid: {},
      dungeonScore: 1200,
      raidBossesCleared: 0,
      raidClearCount: 0,
      roster: [],
    };
    const rankings = buildRealmRankings({ realmState, playerGuildSnapshot });

    expect(rankings[0]).toMatchObject({
      id: "npc:storm",
      raidBossesCleared: 7,
    });
    expect(rankings[1].id).toBe("player:guild");
  });

  it("builds readable raid progression from player raid clears", () => {
    const moltenCore = INITIAL_MISSIONS.find((mission) => mission.name === "Molten Core");
    const playerSnapshot = buildPlayerGuildSnapshot({
      guildSetup: { name: "Player Guild", faction: GUILD_FACTION.HORDE },
      roster: [
        {
          id: "hero",
          level: 60,
          equipment: {},
          clearedMissionIds: [moltenCore.id],
        },
      ],
      missionList: INITIAL_MISSIONS,
      guildProgress: createInitialGuildProgress(),
    });
    const raidRows = getRealmRaidProgressList(playerSnapshot);
    const moltenCoreProgress = raidRows.find((row) => row.raidId === "molten_core");

    expect(moltenCoreProgress).toMatchObject({
      clearedBosses: 10,
      totalBosses: 10,
      completed: true,
    });
    expect(playerSnapshot.raidProgressSummary).toBe("MC cleared");
  });

  it("tracks player guild dungeon clear details for realm overview", () => {
    const dungeon = INITIAL_MISSIONS.find(
      (mission) => mission.type === "dungeon" && mission.isRaid !== true,
    );
    const playerSnapshot = buildPlayerGuildSnapshot({
      guildSetup: { name: "Player Guild", faction: GUILD_FACTION.HORDE },
      roster: [
        {
          id: "hero",
          level: 30,
          equipment: {},
          clearedMissionIds: [dungeon.id],
        },
      ],
      missionList: INITIAL_MISSIONS,
      guildProgress: createInitialGuildProgress(),
    });

    expect(playerSnapshot.dungeonClearCount).toBe(1);
    expect(String(playerSnapshot.clearedDungeonMissions[0].id)).toBe(
      String(dungeon.id),
    );
  });

  it("raises NPC dungeon score only from simulated dungeon clears", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const playerGuildSnapshot = {
      id: "player:guild",
      name: "Player Guild",
      faction: GUILD_FACTION.ALLIANCE,
      isPlayerGuild: true,
      rosterSize: 20,
      averageLevel: 35,
      averageGearScore: 20,
      pveScore: 500,
      raidProgress: 0,
      dungeonScore: 100,
      archetype: "Player Guild",
    };
    const advanced = advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: 8,
      playerGuildSnapshot,
      guildSetup: {
        faction: GUILD_FACTION.ALLIANCE,
        server: "Everlook",
        serverStyle: GUILD_SERVER_STYLE.PVE,
      },
    });
    const guildsWithScore = advanced.npcGuilds.filter(
      (guild) => Number(guild.dungeonScore) > 0,
    );

    expect(advanced.population.dailyStats.guildDungeonRuns).toBeGreaterThan(0);
    expect(advanced.population.dailyStats.guildDungeonClears).toBeGreaterThan(0);
    expect(guildsWithScore.length).toBeGreaterThan(0);
    expect(
      guildsWithScore.every(
        (guild) =>
          Number(guild.dungeonClearCount) > 0 &&
          Array.isArray(guild.clearedDungeonMissions) &&
          guild.clearedDungeonMissions.length > 0,
      ),
    ).toBe(true);
  });

  it("advances realm simulation once per day and caps news", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const playerGuildSnapshot = {
      id: "player:guild",
      name: "Player Guild",
      faction: GUILD_FACTION.ALLIANCE,
      isPlayerGuild: true,
      rosterSize: 5,
      averageLevel: 20,
      averageGearScore: 10,
      pveScore: 100,
      raidProgress: 0,
      dungeonScore: 20,
      archetype: "Player Guild",
    };
    const advanced = advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: 30,
      playerGuildSnapshot,
      guildSetup: { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
    });
    const repeated = advanceRealmSimulation({
      realmState: advanced,
      currentDayIndex: 30,
      playerGuildSnapshot,
      guildSetup: { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
    });

    expect(advanced.ageDays).toBeGreaterThanOrEqual(30);
    expect(advanced.lastSimulatedDayIndex).toBe(30);
    const stats = getRealmPopulationStats(advanced, []);
    expect(stats.totalPopulation).toBeLessThanOrEqual(stats.softCap);
    expect(stats.softCap).toBeLessThanOrEqual(1600);
    expect(advanced.news.length).toBeLessThanOrEqual(25);
    expect(new Set(advanced.news.map((entry) => entry.id)).size).toBe(
      advanced.news.length,
    );
    expect(repeated).toEqual(advanced);
  });

  it("keeps realm cadence deterministic between direct day jumps and quarter steps", () => {
    const guildSetup = {
      faction: GUILD_FACTION.ALLIANCE,
      server: "Everlook",
      serverStyle: GUILD_SERVER_STYLE.PVE,
    };
    const playerGuildSnapshot = {
      id: "player:guild",
      name: "Player Guild",
      faction: GUILD_FACTION.ALLIANCE,
      isPlayerGuild: true,
      rosterSize: 18,
      averageLevel: 24,
      averageGearScore: 11,
      pveScore: 320,
      raidProgress: 0,
      dungeonScore: 35,
      archetype: "Player Guild",
    };
    const freshRealm = ensureRealmState(null, guildSetup, 0);
    const direct = advanceRealmSimulation({
      realmState: freshRealm,
      currentDayIndex: 2,
      playerGuildSnapshot,
      guildSetup,
    });
    let stepped = ensureRealmState(null, guildSetup, 0);

    for (let stepIndex = 1; stepIndex <= 8; stepIndex += 1) {
      stepped = advanceRealmToStep({
        realm: stepped,
        stepIndex,
        playerGuildSnapshot,
        guildSetup,
      });
    }

    expect(getRealmCadenceSnapshot(stepped)).toEqual(
      getRealmCadenceSnapshot(direct),
    );
  });

  it("keeps realm news keys unique for repeated same-day events and old saves", () => {
    const duplicateNews = [
      {
        id: "realm-news:1:npc-recruitment:1",
        dayIndex: 1,
        type: "npc-recruitment",
        message: "Realm guilds recruited 5 players.",
      },
      {
        id: "realm-news:1:npc-recruitment:1",
        dayIndex: 1,
        type: "npc-recruitment",
        message: "Realm guilds recruited 5 players.",
      },
      {
        id: "realm-news:1:npc-recruitment:1",
        dayIndex: 1,
        type: "npc-recruitment",
        message: "A rival guild recruited a rare healer.",
      },
      {
        id: "realm-news:1:population-arrivals:0",
        dayIndex: 1,
        type: "population-arrivals",
        message: "72 new adventurers arrived on the realm.",
      },
    ];

    const cappedNews = capRealmNews(duplicateNews);
    const newsIds = cappedNews.map((entry) => entry.id);
    const renderKeys = duplicateNews.map((entry, index) =>
      getRealmNewsRenderKey(entry, index),
    );

    expect(cappedNews).toHaveLength(3);
    expect(new Set(newsIds).size).toBe(newsIds.length);
    expect(new Set(renderKeys).size).toBe(renderKeys.length);
  });

  it("adds 50-100 realm players per fresh day until the soft cap", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const advanced = advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: 1,
      playerGuildSnapshot: null,
      guildSetup: {
        faction: GUILD_FACTION.ALLIANCE,
        server: "Everlook",
        serverStyle: GUILD_SERVER_STYLE.PVE,
      },
    });
    const growth =
      getRealmPopulationStats(advanced, []).totalPopulation -
      getRealmPopulationStats(realm, []).totalPopulation;

    expect(growth).toBeGreaterThanOrEqual(50);
    expect(growth).toBeLessThanOrEqual(100);
    expect(advanced.population.dailyStats.arrivals).toBe(growth);
  });

  it("accumulates daily realm stats across quarter-day steps", () => {
    const guildSetup = {
      faction: GUILD_FACTION.ALLIANCE,
      server: "Everlook",
      serverStyle: GUILD_SERVER_STYLE.PVE,
    };
    const playerGuildSnapshot = {
      id: "player:guild",
      name: "Player Guild",
      faction: GUILD_FACTION.ALLIANCE,
      isPlayerGuild: true,
      rosterSize: 20,
      averageLevel: 35,
      averageGearScore: 20,
      pveScore: 500,
      raidProgress: 0,
      dungeonScore: 100,
      archetype: "Player Guild",
    };
    const realm = ensureRealmState(null, guildSetup, 0);
    let stepped = realm;

    for (let stepIndex = 1; stepIndex <= 4; stepIndex += 1) {
      stepped = advanceRealmToStep({
        realm: stepped,
        stepIndex,
        playerGuildSnapshot,
        guildSetup,
      });
    }

    const growth =
      getRealmPopulationStats(stepped, []).totalPopulation -
      getRealmPopulationStats(realm, []).totalPopulation;

    expect(stepped.population.dailyStats.dayIndex).toBe(1);
    expect(stepped.population.dailyStats.arrivals).toBe(growth);
    expect(stepped.population.dailyStats.guildDungeonRuns).toBeGreaterThanOrEqual(
      stepped.population.dailyStats.guildDungeonClears,
    );
    expect(stepped.population.dailyStats.pugDungeonRuns).toBeGreaterThanOrEqual(
      stepped.population.dailyStats.pugDungeonClears,
    );
  });

  it("paces NPC guild recruiting by quarter-day steps", () => {
    const guildSetup = {
      faction: GUILD_FACTION.ALLIANCE,
      server: "Everlook",
      serverStyle: GUILD_SERVER_STYLE.PVE,
    };
    const realm = ensureRealmState(null, guildSetup, 0);
    const quarter = advanceRealmToStep({
      realm,
      stepIndex: 1,
      playerGuildSnapshot: null,
      guildSetup,
    });
    const fullDay = advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: 1,
      playerGuildSnapshot: null,
      guildSetup,
    });
    let stepped = realm;

    for (let stepIndex = 1; stepIndex <= 4; stepIndex += 1) {
      stepped = advanceRealmToStep({
        realm: stepped,
        stepIndex,
        playerGuildSnapshot: null,
        guildSetup,
      });
    }

    expect(quarter.population.dailyStats.npcRecruits).toBeLessThanOrEqual(
      fullDay.population.dailyStats.npcRecruits,
    );
    expect(getRealmCadenceSnapshot(stepped)).toEqual(
      getRealmCadenceSnapshot(fullDay),
    );
  });

  it("grows fresh medium-pop NPC guild count into the mature guild band", () => {
    const realm = ensureRealmState(
      null,
      { server: "Lordaeron", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const advanced = advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: 45,
      playerGuildSnapshot: null,
      guildSetup: {
        faction: GUILD_FACTION.ALLIANCE,
        server: "Lordaeron",
        serverStyle: GUILD_SERVER_STYLE.PVE,
      },
    });

    expect(advanced.npcGuilds.length).toBeGreaterThan(realm.npcGuilds.length);
    expect(advanced.npcGuilds.length).toBeGreaterThanOrEqual(10);
    expect(advanced.npcGuilds.length).toBeLessThanOrEqual(15);
  });

  it("seeds newly founded NPC guilds with existing realm players", () => {
    let realm = ensureRealmState(
      null,
      { server: "Lordaeron", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const initialGuildCount = realm.npcGuilds.length;
    const playerGuildSnapshot = {
      id: "player:guild",
      name: "Player Guild",
      faction: GUILD_FACTION.ALLIANCE,
      isPlayerGuild: true,
      rosterSize: 18,
      averageLevel: 24,
      averageGearScore: 10,
      pveScore: 320,
      raidProgress: 0,
      dungeonScore: 35,
      archetype: "Player Guild",
    };

    for (let day = 1; day <= 45 && realm.npcGuilds.length === initialGuildCount; day += 1) {
      realm = advanceRealmSimulation({
        realmState: realm,
        currentDayIndex: day,
        playerGuildSnapshot,
        guildSetup: {
          faction: GUILD_FACTION.ALLIANCE,
          server: "Lordaeron",
          serverStyle: GUILD_SERVER_STYLE.PVE,
        },
      });
    }

    const foundedGuild = realm.npcGuilds[initialGuildCount];
    expect(foundedGuild).toBeTruthy();
    expect(foundedGuild.roster.length).toBeGreaterThanOrEqual(6);
    expect(foundedGuild.roster.length).toBeLessThanOrEqual(10);
    expect(foundedGuild.roster.some((member) => member.level > 1)).toBe(true);
  });

  it("grows fresh high-pop NPC guild count into the crowded guild band", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const advanced = advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: 60,
      playerGuildSnapshot: null,
      guildSetup: {
        faction: GUILD_FACTION.ALLIANCE,
        server: "Everlook",
        serverStyle: GUILD_SERVER_STYLE.PVE,
      },
    });

    expect(advanced.npcGuilds.length).toBeGreaterThan(realm.npcGuilds.length);
    expect(advanced.npcGuilds.length).toBeGreaterThanOrEqual(15);
    expect(advanced.npcGuilds.length).toBeLessThanOrEqual(20);
  });

  it("keeps realm guild leveling near the player guild pace", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const playerGuildSnapshot = {
      id: "player:guild",
      name: "Player Guild",
      faction: GUILD_FACTION.ALLIANCE,
      isPlayerGuild: true,
      rosterSize: 20,
      averageLevel: 30,
      averageGearScore: 12,
      pveScore: 400,
      raidProgress: 0,
      dungeonScore: 40,
      archetype: "Player Guild",
    };
    const advanced = advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: 3,
      playerGuildSnapshot,
      guildSetup: {
        faction: GUILD_FACTION.ALLIANCE,
        server: "Everlook",
        serverStyle: GUILD_SERVER_STYLE.PVE,
      },
    });
    const guildedPlayers = advanced.population.players.filter((player) => player.guildId);
    const averageGuildedLevel =
      guildedPlayers.reduce((sum, player) => sum + player.level, 0) /
      Math.max(1, guildedPlayers.length);

    expect(averageGuildedLevel).toBeGreaterThanOrEqual(20);
    expect(averageGuildedLevel).toBeLessThanOrEqual(34);
    expect(
      advanced.npcGuilds.some((guild) => Number(guild.averageLevel) >= 20),
    ).toBe(true);
  });

  it("updates realm guild leveling during quarter-day progress", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const playerGuildSnapshot = {
      id: "player:guild",
      name: "Player Guild",
      faction: GUILD_FACTION.ALLIANCE,
      isPlayerGuild: true,
      rosterSize: 10,
      averageLevel: 6.4,
      averageGearScore: 2,
      pveScore: 83,
      raidProgress: 0,
      dungeonScore: 0,
      archetype: "Player Guild",
    };
    const advanced = advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: 0,
      currentDayProgress: 0.25,
      playerGuildSnapshot,
      guildSetup: {
        faction: GUILD_FACTION.ALLIANCE,
        server: "Everlook",
        serverStyle: GUILD_SERVER_STYLE.PVE,
      },
    });

    expect(advanced.lastSimulatedStepIndex).toBe(1);
    expect(advanced.npcGuilds.some((guild) => Number(guild.averageLevel) > 1)).toBe(
      true,
    );
    expect(advanced.population.players.some((player) => player.level > 1)).toBe(
      true,
    );
  });

  it("scouts and removes realm recruitment candidates from the market", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const candidates = selectRealmRecruitmentCandidates({
      realmState: realm,
      faction: GUILD_FACTION.ALLIANCE,
      tier: { minLevel: 1, maxLevel: 60 },
      count: 3,
    });
    const nextRealm = markRealmPlayersRecruited({
      realmState: realm,
      playerIds: [candidates[0].id],
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(
      nextRealm.population.players.some((player) => player.id === candidates[0].id),
    ).toBe(false);
  });

  it("reports realm recruitment market level stats", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const advanced = advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: 3,
      playerGuildSnapshot: {
        rosterSize: 10,
        averageLevel: 18,
        faction: GUILD_FACTION.ALLIANCE,
      },
      guildSetup: {
        faction: GUILD_FACTION.ALLIANCE,
        server: "Everlook",
        serverStyle: GUILD_SERVER_STYLE.PVE,
      },
    });
    const stats = getRealmRecruitmentMarketStats({
      realmState: advanced,
      faction: GUILD_FACTION.ALLIANCE,
    });

    expect(stats.availableCount).toBeGreaterThan(0);
    expect(stats.minLevel).toBeGreaterThanOrEqual(1);
    expect(stats.maxLevel).toBeGreaterThanOrEqual(stats.minLevel);
    expect(stats.levelBands.level_1_10 + stats.levelBands.level_11_20).toBeGreaterThan(
      0,
    );
  });

  it("generates persistent same-faction guild applications during realm simulation", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const { applications } = advanceRealmUntilApplications({
      realm,
      faction: GUILD_FACTION.ALLIANCE,
    });

    expect(applications.length).toBeGreaterThan(0);
    expect(applications.length).toBeLessThanOrEqual(8);
    expect(applications.every(({ player }) => player.faction === GUILD_FACTION.ALLIANCE)).toBe(true);
  });

  it("declines realm applications without removing players from the market", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const { advanced, applications } = advanceRealmUntilApplications({
      realm,
      faction: GUILD_FACTION.ALLIANCE,
    });
    const [application] = applications;
    const declined = declineRealmGuildApplications({
      realmState: advanced,
      applicationIds: [application.application.id],
    });

    expect(
      getRealmGuildApplications({
        realmState: declined,
        faction: GUILD_FACTION.ALLIANCE,
      }).some(({ application: entry }) => entry.id === application.application.id),
    ).toBe(false);
    expect(
      declined.population.players.some((player) => player.id === application.player.id),
    ).toBe(true);
  });

  it("assigns realm players to zones and advances their zone leveling", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const initialPlayers = realm.population.players;
    const initialProgressById = new Map(
      initialPlayers.map((player) => [
        player.id,
        `${player.level}:${player.currentZoneId}:${player.zoneProgress}`,
      ]),
    );
    const advanced = advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: 8,
      playerGuildSnapshot: null,
      guildSetup: {
        faction: GUILD_FACTION.ALLIANCE,
        server: "Everlook",
        serverStyle: GUILD_SERVER_STYLE.PVE,
      },
    });
    const changedPlayers = advanced.population.players.filter(
      (player) =>
        initialProgressById.get(player.id) !==
        `${player.level}:${player.currentZoneId}:${player.zoneProgress}`,
    );
    const occupiedZoneId = advanced.population.players.find(
      (player) => player.currentZoneId,
    )?.currentZoneId;

    expect(initialPlayers.every((player) => player.currentZoneId)).toBe(true);
    expect(changedPlayers.length).toBeGreaterThan(0);
    expect(
      getRealmPlayersInZone({
        realmState: advanced,
        zoneId: occupiedZoneId,
      }).length,
    ).toBeGreaterThan(0);
  });

  it("removes accepted realm applications from the application queue", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const { advanced, applications } = advanceRealmUntilApplications({
      realm,
      faction: GUILD_FACTION.ALLIANCE,
    });
    const [application] = applications;
    const nextRealm = markRealmPlayersRecruited({
      realmState: advanced,
      playerIds: [application.player.id],
    });

    expect(
      getRealmGuildApplications({
        realmState: nextRealm,
        faction: GUILD_FACTION.ALLIANCE,
      }).some(({ player }) => player.id === application.player.id),
    ).toBe(false);
  });

  it("warns low morale player guild members before departure", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const result = resolvePlayerGuildDeparturesForDay({
      realmState: {
        ...realm,
        population: { ...realm.population, lastPlayerMarketDayIndex: 0 },
      },
      roster: [
        {
          id: "sad",
          name: "Sad",
          level: 20,
          morale: 20,
          race: "Human",
          charClass: "Warrior",
          role: "DPS",
        },
      ],
      activeMissions: [],
      currentDayIndex: 1,
      guildFaction: GUILD_FACTION.ALLIANCE,
    });

    expect(result.events[0].type).toBe("player-departure-warning");
    expect(result.roster[0].realmDepartureWarningDayIndex).toBe(1);
  });

  it("tracks NPC raid boss progress during realm simulation", () => {
    const realm = ensureRealmState(
      null,
      { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
      0,
    );
    const advanced = advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: 180,
      playerGuildSnapshot: null,
      guildSetup: { server: "Everlook", serverStyle: GUILD_SERVER_STYLE.PVE },
    });
    const topNpcGuild = advanced.npcGuilds.find(
      (guild) => getRealmRaidProgressList(guild).some((raid) => raid.clearedBosses > 0),
    );

    expect(topNpcGuild).toBeTruthy();
    expect(getRealmRaidProgressList(topNpcGuild).length).toBeGreaterThan(0);
  }, 20000);
});

describe("auto dungeon activity", () => {
  const deadmines = INITIAL_MISSIONS.find(
    (mission) => mission.name === "The Deadmines",
  );
  const wailingCaverns = INITIAL_MISSIONS.find(
    (mission) => mission.name === "Wailing Caverns",
  );
  const makeMember = (id, level, role = "DPS", extras = {}) => ({
    id,
    name: id,
    level,
    role,
    status: "Idle",
    equipment: {},
    keys: [],
    ...extras,
  });

  it("derives an entry-to-recommended level range for auto dungeon groups", () => {
    expect(getAutoDungeonLevelRange(deadmines)).toEqual({
      min: 10,
      max: 23,
    });
  });

  it("derives attunement planner targets from mission key metadata", () => {
    const targets = buildDungeonAttunementTargets({
      missionList: [
        {
          id: "library",
          type: "dungeon",
          name: "Scarlet Monastery - Library",
          rewardKeys: ["scarlet_monastery_key"],
        },
        {
          id: "armory",
          type: "dungeon",
          name: "Scarlet Monastery - Armory",
          requiresKey: true,
          keyId: "scarlet_monastery_key",
        },
      ],
      roster: [
        { id: "holder", keys: ["scarlet_monastery_key"] },
        { id: "missing", keys: [] },
      ],
    });

    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      keyId: "scarlet_monastery_key",
      sourceMission: { id: "library" },
      targetMission: { id: "armory" },
      isReady: true,
    });
    expect(targets[0].holders.map((member) => member.id)).toEqual(["holder"]);
    expect(targets[0].missing.map((member) => member.id)).toEqual(["missing"]);
  });

  it("groups attunement planner targets by key id", () => {
    const targets = buildDungeonAttunementTargets({
      missionList: [
        {
          id: "arena",
          type: "dungeon",
          name: "Blackrock Depths - Arena",
          rewardKeys: ["shadowforge_key"],
        },
        {
          id: "shadowforge",
          type: "dungeon",
          name: "Blackrock Depths - Shadowforge",
          requiresKey: true,
          keyId: "shadowforge_key",
        },
        {
          id: "city",
          type: "dungeon",
          name: "Blackrock Depths - Shadowforge City",
          requiresKey: true,
          keyId: "shadowforge_key",
        },
      ],
      roster: [],
    });

    expect(targets).toHaveLength(1);
    expect(targets[0].keyId).toBe("shadowforge_key");
    expect(targets[0].targetMissionIds.sort()).toEqual(["city", "shadowforge"]);
  });

  it("uses keyed zone elite quests as attunement planner sources", () => {
    const targets = buildDungeonAttunementTargets({
      missionList: INITIAL_MISSIONS,
      roster: [],
    });
    const scholomanceTarget = targets.find(
      (target) => target.keyId === "scholomance_key",
    );

    expect(scholomanceTarget).toMatchObject({
      keyId: "scholomance_key",
      isReady: true,
      sourceMission: {
        id: "zone_elite:western_plaguelands:scholomance_key",
      },
    });
  });

  it("only exposes heroes who can currently start an attunement source", () => {
    const target = {
      keyId: "molten_core_attunement",
      sourceMission: {
        id: "blackrock-depths-core-fragment",
        type: "dungeon",
        name: "Blackrock Depths - Core Fragment",
        minLevel: 42,
        entryLevel: 42,
        rewardKeys: ["molten_core_attunement"],
      },
    };

    const eligibleMembers = getAttunementEligibleMembers({
      target,
      members: [
        makeMember("too-low", 20),
        makeMember("ready", 42),
        makeMember("already-attuned", 60, "DPS", {
          keys: ["molten_core_attunement"],
        }),
      ],
    });

    expect(eligibleMembers.map((member) => member.id)).toEqual(["ready"]);
  });

  it("uses calendar-day intervals for dungeon group search frequency", () => {
    expect(getAutoDungeonIntervalMs(GUILD_DUNGEON_ACTIVITY.MINIMAL)).toBe(
      CALENDAR_DAY_MS * 2,
    );
    expect(getAutoDungeonIntervalMs(GUILD_DUNGEON_ACTIVITY.BALANCED)).toBe(
      CALENDAR_DAY_MS,
    );
    expect(getAutoDungeonIntervalMs(GUILD_DUNGEON_ACTIVITY.ALWAYS)).toBe(
      CALENDAR_DAY_MS * 0.5,
    );
  });

  it("checks auto dungeon formation once per 20 percent day checkpoint", () => {
    const roster = [
      makeMember("tank", 20, "Tank"),
      makeMember("healer", 20, "Healer"),
      makeMember("dps-1", 20),
      makeMember("dps-2", 20),
      makeMember("dps-3", 20),
    ];
    const first = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.ALWAYS,
      now: CALENDAR_DAY_MS * 0.2,
      missionList: [deadmines],
      roster,
      activeMissions: [],
      getSuccessPreview: () => ({ successChance: 100 }),
    });
    const repeat = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.ALWAYS,
      now: CALENDAR_DAY_MS * 0.3,
      lastCheckpointKey: first.lastCheckpointKey,
      missionList: [deadmines],
      roster,
      activeMissions: [],
      getSuccessPreview: () => ({ successChance: 100 }),
    });
    const nextCheckpoint = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.ALWAYS,
      now: CALENDAR_DAY_MS * 0.4,
      lastCheckpointKey: first.lastCheckpointKey,
      missionList: [deadmines],
      roster,
      activeMissions: [],
      getSuccessPreview: () => ({ successChance: 100 }),
    });

    expect(first.candidate).toBeTruthy();
    expect(repeat.candidate).toBeNull();
    expect(nextCheckpoint.candidate).toBeTruthy();
  });

  it("forms a level-appropriate dungeon group only when success is at least 70%", () => {
    const roster = [
      makeMember("tank", 20, "Tank"),
      makeMember("healer", 20, "Healer"),
      makeMember("dps-1", 20),
      makeMember("dps-2", 20),
      makeMember("dps-3", 20),
      makeMember("too-high", 40, "Tank"),
    ];

    const blocked = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.ALWAYS,
      now: CALENDAR_DAY_MS * 0.2,
      missionList: [deadmines],
      roster,
      activeMissions: [],
      getSuccessPreview: () => ({
        successChance: AUTO_DUNGEON_MIN_SUCCESS_CHANCE - 1,
      }),
    });
    const formed = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.ALWAYS,
      now: CALENDAR_DAY_MS * 0.2,
      missionList: [deadmines],
      roster,
      activeMissions: [],
      getSuccessPreview: () => ({
        successChance: AUTO_DUNGEON_MIN_SUCCESS_CHANCE,
      }),
    });

    expect(blocked.candidate).toBeNull();
    expect(formed.candidate).toMatchObject({
      mission: deadmines,
      successChance: AUTO_DUNGEON_MIN_SUCCESS_CHANCE,
    });
    expect([...formed.candidate.memberIds].sort()).toEqual([
      "dps-1",
      "dps-2",
      "dps-3",
      "tank",
      "healer",
    ].sort());
    expect(formed.candidate.memberIds).not.toContain("too-high");
  });

  it("forms queued attunement groups before generic auto dungeon searches", () => {
    const attunementMission = {
      id: "attune-run",
      type: "dungeon",
      name: "Attunement Run",
      level: 60,
      minLevel: 55,
      recommended: "55 - 60",
      requiredPartySize: 5,
      minPartySize: 5,
      rewardKeys: ["molten_core_attunement"],
      exp: 1,
    };
    const roster = [
      makeMember("tank", 60, "Tank"),
      makeMember("healer", 60, "Healer"),
      makeMember("dps-1", 60),
      makeMember("dps-2", 60),
      makeMember("dps-3", 60),
    ].map((member) => ({
      ...member,
      adventureGoalQueue: [
        {
          id: `goal-${member.id}`,
          type: "attunement",
          keyId: "molten_core_attunement",
          sourceMissionId: "attune-run",
          targetMissionId: "molten-core",
          createdAt: 1,
        },
      ],
    }));

    const result = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.NONE,
      now: CALENDAR_DAY_MS * 0.1,
      missionList: [attunementMission],
      roster,
      activeMissions: [],
      minSuccessChance: 70,
      getSuccessPreview: () => ({ successChance: 70 }),
    });

    expect(result.candidate).toMatchObject({
      mission: attunementMission,
      goalType: "attunement",
      keyId: "molten_core_attunement",
      successChance: 70,
    });
    expect(result.candidate.memberIds).toHaveLength(5);
  });

  it("keeps queued attunement groups waiting while busy or below threshold", () => {
    const attunementMission = {
      id: "attune-run",
      type: "dungeon",
      name: "Attunement Run",
      level: 60,
      minLevel: 55,
      recommended: "55 - 60",
      requiredPartySize: 5,
      minPartySize: 5,
      rewardKeys: ["molten_core_attunement"],
    };
    const roster = [
      makeMember("tank", 60, "Tank"),
      makeMember("healer", 60, "Healer"),
      makeMember("dps-1", 60),
      makeMember("dps-2", 60),
      makeMember("dps-3", 60),
    ].map((member) => ({
      ...member,
      adventureGoalQueue: [
        {
          id: `goal-${member.id}`,
          type: "attunement",
          keyId: "molten_core_attunement",
          sourceMissionId: "attune-run",
          targetMissionId: "molten-core",
        },
      ],
    }));
    const busy = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.NONE,
      now: CALENDAR_DAY_MS * 0.1,
      missionList: [attunementMission],
      roster,
      activeMissions: [{ id: "active", memberIds: ["tank"] }],
      minSuccessChance: 70,
      getSuccessPreview: () => ({ successChance: 100 }),
    });
    const lowChance = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.NONE,
      now: CALENDAR_DAY_MS * 0.1,
      missionList: [attunementMission],
      roster,
      activeMissions: [],
      minSuccessChance: 70,
      getSuccessPreview: () => ({ successChance: 69 }),
    });

    expect(busy.candidate).toBeNull();
    expect(lowChance.candidate).toBeNull();
  });

  it("rotates dungeon searchers by each character's last auto dungeon time", () => {
    const roster = [
      makeMember("recent-tank", 20, "Tank", {
        autoDungeonLastStartedAt: CALENDAR_DAY_MS * 0.5,
      }),
      makeMember("fresh-tank", 20, "Tank"),
      makeMember("healer", 20, "Healer", {
        autoDungeonLastStartedAt: CALENDAR_DAY_MS * 0.5,
      }),
      makeMember("dps-1", 20, "DPS", {
        autoDungeonLastStartedAt: CALENDAR_DAY_MS * 0.5,
      }),
      makeMember("dps-2", 20, "DPS", {
        autoDungeonLastStartedAt: CALENDAR_DAY_MS * 0.5,
      }),
      makeMember("dps-3", 20, "DPS", {
        autoDungeonLastStartedAt: CALENDAR_DAY_MS * 0.5,
      }),
    ];

    const result = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.BALANCED,
      now: CALENDAR_DAY_MS * 1.2,
      missionList: [deadmines],
      roster,
      activeMissions: [],
      getSuccessPreview: () => ({ successChance: 100 }),
    });

    expect(result.candidate.initiatorId).toBe("fresh-tank");
    expect(result.candidate.memberIds).toContain("fresh-tank");
  });

  it("can form several non-overlapping dungeon groups in one search pass", () => {
    const roster = [
      makeMember("tank-a", 20, "Tank"),
      makeMember("healer-a", 20, "Healer"),
      makeMember("dps-a1", 20),
      makeMember("dps-a2", 20),
      makeMember("dps-a3", 20),
      makeMember("tank-b", 20, "Tank"),
      makeMember("healer-b", 20, "Healer"),
      makeMember("dps-b1", 20),
      makeMember("dps-b2", 20),
      makeMember("dps-b3", 20),
    ];

    const result = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.ALWAYS,
      now: CALENDAR_DAY_MS * 0.2,
      missionList: [deadmines],
      roster,
      activeMissions: [],
      getSuccessPreview: () => ({ successChance: 100 }),
    });

    expect(result.candidates).toHaveLength(2);
    const allMemberIds = result.candidates.flatMap((candidate) => candidate.memberIds);
    expect(new Set(allMemberIds).size).toBe(10);
  });

  it("blocks automatic mission starts when any member is already active", () => {
    const roster = [
      makeMember("tank", 20, "Tank"),
      makeMember("healer", 20, "Healer"),
      makeMember("dps-1", 20),
      makeMember("dps-2", 20),
      makeMember("dps-3", 20),
    ];

    expect(
      isMissionMemberGroupAvailable({
        memberIds: ["tank", "healer", "dps-1", "dps-2", "dps-3"],
        roster,
        activeMissions: [{ id: "active", memberIds: ["tank"] }],
      }),
    ).toBe(false);
    expect(
      isMissionMemberGroupAvailable({
        memberIds: ["tank", "healer", "dps-1", "dps-2", "dps-3"],
        roster: roster.map((member) =>
          member.id === "healer" ? { ...member, status: "Questing" } : member,
        ),
        activeMissions: [],
      }),
    ).toBe(false);
  });

  it("treats missing roster status as idle for mission board filtering", () => {
    expect(isMissionBoardAvailableStatus(undefined)).toBe(true);
    expect(isMissionBoardAvailableStatus(null)).toBe(true);
    expect(isMissionBoardAvailableStatus("Idle")).toBe(true);
    expect(isMissionBoardAvailableStatus("Mining copper")).toBe(true);
    expect(isMissionBoardAvailableStatus("Questing")).toBe(false);
  });

  it("prunes overlapping active missions so each character stays in one mission", () => {
    const result = pruneOverlappingActiveMissions([
      { id: "first", name: "Blackrock Spire", memberIds: ["tank", "healer"] },
      { id: "duplicate", name: "Blackrock Spire", memberIds: ["tank", "dps"] },
      { id: "other", name: "Dire Maul", memberIds: ["mage"] },
    ]);

    expect(result.activeMissions.map((mission) => mission.id)).toEqual([
      "first",
      "other",
    ]);
    expect(result.canceledMissions.map((mission) => mission.id)).toEqual([
      "duplicate",
    ]);
  });

  it("rotates away from a dungeon the same party just auto-ran", () => {
    const roster = [
      makeMember("tank", 20, "Tank", {
        autoDungeonLastMissionId: String(wailingCaverns.id),
      }),
      makeMember("healer", 20, "Healer", {
        autoDungeonLastMissionId: String(wailingCaverns.id),
      }),
      makeMember("dps-1", 20, "DPS", {
        autoDungeonLastMissionId: String(wailingCaverns.id),
      }),
      makeMember("dps-2", 20, "DPS", {
        autoDungeonLastMissionId: String(wailingCaverns.id),
      }),
      makeMember("dps-3", 20, "DPS", {
        autoDungeonLastMissionId: String(wailingCaverns.id),
      }),
    ];

    const result = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.ALWAYS,
      now: CALENDAR_DAY_MS * 0.2,
      missionList: [deadmines, wailingCaverns],
      roster,
      activeMissions: [],
      getSuccessPreview: () => ({ successChance: 100 }),
    });

    expect(result.candidate.mission).toBe(deadmines);
  });

  it("avoids duplicate opening dungeons when several groups form together", () => {
    const roster = [
      makeMember("tank-a", 20, "Tank"),
      makeMember("healer-a", 20, "Healer"),
      makeMember("dps-a1", 20),
      makeMember("dps-a2", 20),
      makeMember("dps-a3", 20),
      makeMember("tank-b", 20, "Tank"),
      makeMember("healer-b", 20, "Healer"),
      makeMember("dps-b1", 20),
      makeMember("dps-b2", 20),
      makeMember("dps-b3", 20),
    ];

    const result = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.ALWAYS,
      now: CALENDAR_DAY_MS * 0.2,
      missionList: [deadmines, wailingCaverns],
      roster,
      activeMissions: [],
      getSuccessPreview: () => ({ successChance: 100 }),
    });

    expect(result.candidates.map((candidate) => candidate.mission.name)).toEqual([
      "Wailing Caverns",
      "The Deadmines",
    ]);
  });

  it("prefers a short chain when consecutive dungeon wings are in range", () => {
    const scarletMissions = INITIAL_MISSIONS.filter(
      (mission) => mission.dungeonSetName === "Scarlet Monastery",
    );
    const roster = [
      makeMember("tank", 34, "Tank"),
      makeMember("healer", 34, "Healer"),
      makeMember("dps-1", 34),
      makeMember("dps-2", 34),
      makeMember("dps-3", 34),
    ];

    const result = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.ALWAYS,
      now: CALENDAR_DAY_MS * 0.2,
      missionList: scarletMissions,
      roster,
      activeMissions: [],
      getSuccessPreview: () => ({ successChance: 100 }),
    });

    expect(result.candidate.chainMissionIds.length).toBeGreaterThanOrEqual(2);
    expect(
      result.candidate.missions.map((mission) => mission.dungeonWing),
    ).toEqual(["Library", "Armory"]);
  });

  it("prioritizes raid attunement routes when guild focus is raid attunements", () => {
    const normalDungeon = {
      id: "normal-dungeon",
      type: "dungeon",
      name: "Normal Dungeon",
      level: 58,
      minLevel: 55,
      recommended: "55 - 60",
      requiredPartySize: 5,
      minPartySize: 5,
      exp: 999999,
    };
    const attunementDungeon = {
      id: "attunement-dungeon",
      type: "dungeon",
      name: "Attunement Dungeon",
      level: 58,
      minLevel: 55,
      recommended: "55 - 60",
      requiredPartySize: 5,
      minPartySize: 5,
      rewardKeys: ["molten_core_attunement"],
      exp: 1,
    };
    const raid = {
      id: "molten-core",
      type: "dungeon",
      name: "Molten Core",
      isRaid: true,
      requiresKey: true,
      keyId: "molten_core_attunement",
    };
    const roster = [
      makeMember("tank", 60, "Tank"),
      makeMember("healer", 60, "Healer"),
      makeMember("dps-1", 60),
      makeMember("dps-2", 60),
      makeMember("dps-3", 60),
    ];

    const result = resolveAutoDungeonAttempt({
      mode: GUILD_DUNGEON_ACTIVITY.BALANCED,
      guildFocus: GUILD_FOCUS.RAID_ATTUNEMENTS,
      now: CALENDAR_DAY_MS * 0.2,
      missionList: [normalDungeon, attunementDungeon, raid],
      roster,
      activeMissions: [],
      getSuccessPreview: () => ({ successChance: 100 }),
    });

    expect(result.candidate.mission).toBe(attunementDungeon);
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
    expect(lbrsMission.minPartySize).toBe(5);
    expect(lbrsMission.requiredPartySize).toBe(10);
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

  it("activates LBRS expanded slot drops that used to be unsupported", () => {
    const expectedDrops = [
      ["belt", "Wildheart Belt"],
      ["shoulder", "Wildheart Spaulders"],
      ["belt", "Beaststalker's Belt"],
      ["shoulder", "Beaststalker's Mantle"],
      ["wrist", "Magister's Bindings"],
      ["belt", "Devout Belt"],
      ["wrist", "Dreadmist Bracers"],
      ["wrist", "Bracers of Valor"],
      ["belt", "Belt of Valor"],
      ["trinket", "Heart of the Scale"],
    ];

    expectedDrops.forEach(([slot, name]) => {
      expect(
        lbrsItems.some((item) => item.slot === slot && item.name === name),
        `${slot} ${name}`,
      ).toBe(true);
    });
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
    expect(ubrsMission.rewardKeys).toEqual(["blackwing_lair_attunement"]);
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
    expect(result.unlockedDuringSequence).toEqual([
      "seal_of_ascension",
      "blackwing_lair_attunement",
    ]);
  });

  it("requires every Blackwing Lair raider to have the Orb of Ascension", () => {
    const blackwingLairMission = INITIAL_MISSIONS.find(
      (mission) => mission.name === "Blackwing Lair",
    );
    const result = evaluateMissionKeyAccess({
      missions: [blackwingLairMission],
      partyMembers: [
        { id: "attuned", keys: ["blackwing_lair_attunement"] },
        { id: "missing", keys: [] },
      ],
    });
    const attunedResult = evaluateMissionKeyAccess({
      missions: [blackwingLairMission],
      partyMembers: [
        { id: "tank", keys: ["blackwing_lair_attunement"] },
        { id: "dps", keys: ["blackwing_lair_attunement"] },
      ],
    });

    expect(result.canEnter).toBe(false);
    expect(result.requiresAllMembers).toBe(true);
    expect(result.missingKeyIds).toEqual(["blackwing_lair_attunement"]);
    expect(attunedResult.canEnter).toBe(true);
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

  it("activates UBRS neck, ring, belt, and Tier 0 shoulder drops", () => {
    const expectedDrops = [
      ["neck", "Emberfury Talisman"],
      ["ring", "Painweaver Band"],
      ["neck", "Tooth of Gnarr"],
      ["belt", "Brigam Girdle"],
      ["shoulder", "Devout Mantle"],
      ["shoulder", "Shadowcraft Spaulders"],
      ["shoulder", "Lightforge Spaulders"],
      ["shoulder", "Pauldrons of Elements"],
      ["shoulder", "Spaulders of Valor"],
    ];

    expectedDrops.forEach(([slot, name]) => {
      expect(
        ubrsItems.some((item) => item.slot === slot && item.name === name),
        `${slot} ${name}`,
      ).toBe(true);
    });
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
