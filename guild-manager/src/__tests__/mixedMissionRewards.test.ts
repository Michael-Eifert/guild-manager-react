import { afterEach, describe, expect, it, vi } from "vitest";

import { createMissionRewardProcessor } from "../missions/missionRewards";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mixed guild and realm mission rewards", () => {
  it("shares loot with realm participants, prorates gold, and rewards XP and keys only to guild members", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const item = {
      id: "staff",
      name: "Shared Staff",
      quality: 1,
      minLevel: 1,
      type: "Generic",
      slot: "Weapon",
      itemLevel: 10,
    };
    const processMissionRewards = createMissionRewardProcessor({
      dbItems: [item],
      dbClasses: { Mage: {} },
      getClassArmorTypes: () => [],
      isItemUsableByClass: () => true,
      getKeyLabel: (keyId: string) => keyId,
      getItemEffectiveLevel: (
        candidate: { itemLevel?: number } | null | undefined,
      ) => Number(candidate?.itemLevel) || 0,
      getMissionLootLevelRange: () => ({ minLevel: 1, maxLevel: 60 }),
      resolveMissionRewardQualities: () => [1],
      getDungeonStepLootConfig: () => ({}),
      getDungeonStepQualityPriority: () => [1],
      getDungeonBossCount: () => 1,
      getDungeonQuarterExpMultiplier: () => 1,
      getDungeonOverlevelExpMultiplier: () => 1,
      getMissionLevelExpMultiplier: () => 1,
      getReqExp: () => 1_000,
      getMissionGoldReward: () => 10,
    });
    const guildMember = {
      id: "guild-1",
      name: "Aria",
      charClass: "Mage",
      role: "DPS",
      level: 10,
      exp: 0,
      maxExp: 1_000,
      status: "Questing",
      equipment: {},
      history: [],
      keys: [],
    };
    const result = processMissionRewards({
      mission: {
        id: "elite-1",
        questId: "elite-1",
        name: "Elite Threat",
        type: "elite",
        isZoneElite: true,
        level: 10,
        exp: 100,
        payoutGold: 10,
        rewardKeys: ["elite-key"],
        missionSuccess: true,
        memberIds: ["guild-1"],
        partyParticipants: [
          {
            id: "guild-1",
            source: "guild",
            name: "Aria",
            charClass: "Mage",
            role: "DPS",
            level: 10,
          },
          {
            id: "realm-1",
            source: "realm",
            name: "Borin",
            charClass: "Mage",
            role: "DPS",
            level: 10,
          },
        ],
      },
      currentRoster: [guildMember],
      activeGuildStats: { goldMultiplier: 1, expMultiplier: 1 },
      activeFocusBonuses: {
        fullPartyGoldMultiplier: 1,
        expMultiplier: 1,
      },
      levelCap: 60,
      failedMissionExpFactor: 0.25,
    });

    expect(result.missionGold).toBe(5);
    expect(result.updatedRoster[0]).toMatchObject({
      exp: 100,
      keys: ["elite-key"],
      equipment: {},
    });
    expect(result.updatedRoster).toHaveLength(1);
    expect(
      result.missionLogs.some(
        (entry: { type?: string }) => entry.type === "loot",
      ),
    ).toBe(false);
    expect(result.missionLogs[0]).toMatchObject({
      guildMemberCount: 1,
      realmMemberCount: 1,
    });
  });
});
