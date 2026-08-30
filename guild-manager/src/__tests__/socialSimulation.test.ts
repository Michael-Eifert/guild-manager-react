import { describe, expect, it } from "vitest";

import { GUILD_DUNGEON_ACTIVITY } from "../constants";
import {
  LFG_GUILD_SEARCH_DURATION_MS,
  advanceSocialSimulation,
  completeMissionSocialActivity,
  createInitialSocialState,
  ensureSocialState,
} from "../social/socialSimulation";
import {
  getLfgHelperInterest,
  passesDeterministicLfgChance,
} from "../social/dungeonLfgInterest";
import type { SocialState } from "../social/chatTypes";
import type { Character } from "../types/characterTypes";
import type { Mission } from "../types/missionTypes";

const member = (
  id: string,
  role: string,
  faction = "Alliance",
): Character => ({
  id,
  name: id,
  level: 20,
  charClass:
    role === "Tank" ? "Warrior" : role === "Healer" ? "Priest" : "Mage",
  role,
  status: "Idle",
  faction,
});

const dungeon: Mission = {
  id: "deadmines",
  name: "The Deadmines",
  type: "dungeon",
  level: 20,
  minLevel: 15,
  recommended: "15-25",
  requiredPartySize: 5,
  duration: 60,
};

const shadowfangKeep: Mission = {
  id: "shadowfang-keep",
  name: "Shadowfang Keep",
  type: "dungeon",
  level: 22,
  minLevel: 15,
  recommended: "22 - 30",
  requiredPartySize: 5,
  duration: 60,
};

const shadowfangUpgrade = {
  id: "shadowfang-cloth-upgrade",
  name: "Arugal's Robe",
  dungeon: "Shadowfang Keep",
  slot: "chest",
  type: "Cloth",
  quality: 3,
  minLevel: 20,
  itemLevel: 35,
  stats: { intellect: 8 },
};

const scarletMonastery: Mission = {
  id: "scarlet-monastery",
  name: "Scarlet Monastery",
  type: "dungeon",
  level: 32,
  minLevel: 28,
  recommended: "30 - 40",
  requiredPartySize: 5,
  duration: 60,
};

const guildSetup = {
  faction: "Alliance",
  dungeonActivity: GUILD_DUNGEON_ACTIVITY.BALANCED,
};

const realmPlayer = (
  id: string,
  role: string,
  faction = "Alliance",
) => ({
  id,
  name: id,
  level: 20,
  itemLevel: 18,
  charClass:
    role === "Tank" ? "Warrior" : role === "Healer" ? "Priest" : "Mage",
  role,
  faction,
  guildId: "realm-guild",
});

const realmState = {
  npcGuilds: [{ id: "realm-guild", name: "Realm Regulars" }],
  population: {
    players: [
      realmPlayer("realm-dps-1", "DPS"),
      realmPlayer("realm-dps-2", "DPS"),
      realmPlayer("realm-dps-3", "DPS"),
      realmPlayer("wrong-faction", "DPS", "Horde"),
    ],
  },
};

const advance = (
  state: SocialState,
  roster: Character[],
  now: number,
) =>
  advanceSocialSimulation({
    socialState: state,
    now,
    roster,
    realmState,
    activeMissions: [],
    missionList: [dungeon],
    guildSetup,
  });

describe("social LFG simulation", () => {
  it("does not create a Horde search for the Alliance Hogger quest", () => {
    const allianceHogger: Mission = {
      id: 4,
      name: "Elite: Defeat Hogger",
      type: "quest",
      level: 10,
      minLevel: 6,
      recommended: "8-12",
      requiredPartySize: 3,
      duration: 55,
      elite: true,
      zoneId: "elwynn_forest",
      requiredFaction: "Alliance",
    };
    const hordeEversong: Mission = {
      ...allianceHogger,
      id: "horde:legacy:4",
      name: "Elite: Defend the Eversong Outpost",
      zoneId: "eversong_woods",
      requiredFaction: "Horde",
    };

    const result = advanceSocialSimulation({
      socialState: createInitialSocialState(),
      now: 0,
      roster: [
        { ...member("horde-tank", "Tank", "Horde"), level: 10 },
        { ...member("horde-dps", "DPS", "Horde"), level: 10 },
      ],
      realmState,
      activeMissions: [],
      missionList: [allianceHogger, hordeEversong],
      guildSetup: {
        ...guildSetup,
        faction: "Horde",
        contentPhase: "tbc_prepatch",
      },
    });

    expect(result.socialState.searches[0]).toMatchObject({
      missionId: "horde:legacy:4",
    });
    expect(result.socialState.searches[0]?.missionId).not.toBe(4);
  });

  it("starts Shadowfang Keep searches at level 20, not its level 15 entry requirement", () => {
    const tooLow = advanceSocialSimulation({
      socialState: createInitialSocialState(),
      now: 0,
      roster: [{ ...member("level-19", "DPS"), level: 19 }],
      realmState,
      activeMissions: [],
      missionList: [shadowfangKeep],
      guildSetup,
    });
    expect(tooLow.socialState.searches).toEqual([]);

    const eligible = advanceSocialSimulation({
      socialState: createInitialSocialState(),
      now: 0,
      roster: [{ ...member("level-20", "DPS"), level: 20 }],
      realmState,
      activeMissions: [],
      missionList: [shadowfangKeep],
      guildSetup,
    });
    expect(eligible.socialState.searches[0]).toMatchObject({
      missionId: "shadowfang-keep",
      initiatorId: "level-20",
    });
  });

  it("allows an overlevel character with an upgrade incentive to initiate deterministically", () => {
    const helperLevel = 31;
    const helperInterest = getLfgHelperInterest({
      character: {
        level: helperLevel,
        charClass: "Mage",
        role: "DPS",
        equipment: {},
      },
      mission: shadowfangKeep,
      itemDatabase: [shadowfangUpgrade],
    });
    const helperId =
      Array.from({ length: 200 }, (_, index) => `upgrade-helper-${index}`).find(
        (id) =>
          passesDeterministicLfgChance(
            `lfg:1:init:${shadowfangKeep.id}:${id}:0`,
            helperInterest.chance,
          ),
      ) || "upgrade-helper";
    const result = advanceSocialSimulation({
      socialState: createInitialSocialState(),
      now: 0,
      roster: [
        {
          ...member(helperId, "DPS"),
          level: helperLevel,
          equipment: {},
        },
      ],
      realmState,
      activeMissions: [],
      missionList: [shadowfangKeep],
      guildSetup,
      itemDatabase: [shadowfangUpgrade],
    });

    expect(result.socialState.searches[0]).toMatchObject({
      missionId: "shadowfang-keep",
      initiatorId: helperId,
    });
  });

  it("checks every level-appropriate dungeon before considering a helper-only search", () => {
    const result = advanceSocialSimulation({
      socialState: createInitialSocialState(),
      now: 0,
      roster: [
        {
          ...member("level-31", "DPS"),
          level: 31,
          equipment: {},
        },
      ],
      realmState,
      activeMissions: [],
      missionList: [shadowfangKeep, scarletMonastery],
      guildSetup,
      itemDatabase: [shadowfangUpgrade],
    });

    expect(result.socialState.searches[0]).toMatchObject({
      missionId: scarletMonastery.id,
      initiatorId: "level-31",
    });
  });

  it("keeps level-50 characters focused on leveling instead of old dungeons", () => {
    const fakeHighLevelDrop = {
      ...shadowfangUpgrade,
      id: "impossible-shadowfang-upgrade",
      itemLevel: 55,
    };
    const result = advanceSocialSimulation({
      socialState: createInitialSocialState(),
      now: 0,
      roster: [
        {
          ...member("level-50", "DPS"),
          level: 50,
          equipment: {},
        },
      ],
      realmState,
      activeMissions: [],
      missionList: [dungeon, shadowfangKeep],
      guildSetup,
      itemDatabase: [fakeHighLevelDrop],
    });

    expect(result.socialState.searches).toEqual([]);
  });

  it("rolls only the single best helper candidate per checkpoint", () => {
    const helperInterest = getLfgHelperInterest({
      character: {
        level: 31,
        charClass: "Mage",
        role: "DPS",
        equipment: {},
      },
      mission: shadowfangKeep,
      itemDatabase: [shadowfangUpgrade],
    });
    const failingId =
      Array.from({ length: 500 }, (_, index) => `a-helper-${index}`).find(
        (id) =>
          !passesDeterministicLfgChance(
            `lfg:1:init:${shadowfangKeep.id}:${id}:0`,
            helperInterest.chance,
          ),
      ) || "a-helper-fails";
    const passingId =
      Array.from({ length: 500 }, (_, index) => `b-helper-${index}`).find(
        (id) =>
          passesDeterministicLfgChance(
            `lfg:1:init:${shadowfangKeep.id}:${id}:0`,
            helperInterest.chance,
          ),
      ) || "b-helper-passes";
    const result = advanceSocialSimulation({
      socialState: createInitialSocialState(),
      now: 0,
      roster: [
        {
          ...member(failingId, "DPS"),
          level: 31,
          equipment: {},
        },
        {
          ...member(passingId, "DPS"),
          level: 31,
          equipment: {},
        },
      ],
      realmState,
      activeMissions: [],
      missionList: [shadowfangKeep],
      guildSetup,
      itemDatabase: [shadowfangUpgrade],
    });

    expect(result.socialState.searches).toEqual([]);
  });

  it("caps an existing LFG group at two overlevel helpers", () => {
    const search = {
      id: "lfg:helpers",
      missionId: shadowfangKeep.id,
      missionName: shadowfangKeep.name,
      missionType: "dungeon" as const,
      targetSize: 5,
      phase: "guild" as const,
      createdAt: 0,
      guildSearchEndsAt: 15_000,
      expiresAt: 75_000,
      nextResponseAt: 1_000,
      participantIds: ["core", "helper-tank", "helper-healer"],
      participants: [
        {
          id: "core",
          source: "guild" as const,
          name: "core",
          role: "DPS",
          level: 20,
        },
        {
          id: "helper-tank",
          source: "guild" as const,
          name: "helper-tank",
          role: "Tank",
          level: 31,
        },
        {
          id: "helper-healer",
          source: "guild" as const,
          name: "helper-healer",
          role: "Healer",
          level: 31,
        },
      ],
      initiatorId: "core",
    };
    const result = advanceSocialSimulation({
      socialState: {
        ...createInitialSocialState(),
        searches: [search],
        nextSequence: 2,
      },
      now: search.nextResponseAt,
      roster: [
        { ...member("core", "DPS"), level: 20 },
        { ...member("helper-tank", "Tank"), level: 31 },
        { ...member("helper-healer", "Healer"), level: 31 },
        { ...member("core-dps", "DPS"), level: 20 },
        { ...member("third-helper", "DPS"), level: 31 },
      ],
      realmState,
      activeMissions: [],
      missionList: [shadowfangKeep],
      guildSetup: {
        ...guildSetup,
        dungeonActivity: GUILD_DUNGEON_ACTIVITY.NONE,
      },
      itemDatabase: [shadowfangUpgrade],
      relationships: {
        "core::third-helper": {
          memberIds: ["core", "third-helper"],
          points: 100,
        },
      },
    });

    expect(result.socialState.searches[0]?.participantIds).toContain(
      "core-dps",
    );
    expect(result.socialState.searches[0]?.participantIds).not.toContain(
      "third-helper",
    );
  });

  it("prefers a level-appropriate joiner over an interested helper", () => {
    const search = {
      id: "lfg:core-priority",
      missionId: shadowfangKeep.id,
      missionName: shadowfangKeep.name,
      missionType: "dungeon" as const,
      targetSize: 5,
      phase: "guild" as const,
      createdAt: 0,
      guildSearchEndsAt: 15_000,
      expiresAt: 75_000,
      nextResponseAt: 1_000,
      participantIds: ["tank", "healer", "initiator"],
      participants: [
        {
          id: "tank",
          source: "guild" as const,
          name: "tank",
          role: "Tank",
          level: 20,
        },
        {
          id: "healer",
          source: "guild" as const,
          name: "healer",
          role: "Healer",
          level: 20,
        },
        {
          id: "initiator",
          source: "guild" as const,
          name: "initiator",
          role: "DPS",
          level: 20,
        },
      ],
      initiatorId: "initiator",
    };
    const result = advanceSocialSimulation({
      socialState: {
        ...createInitialSocialState(),
        searches: [search],
        nextSequence: 2,
      },
      now: search.nextResponseAt,
      roster: [
        { ...member("tank", "Tank"), level: 20 },
        { ...member("healer", "Healer"), level: 20 },
        { ...member("initiator", "DPS"), level: 20 },
        { ...member("core-dps", "DPS"), level: 20 },
        {
          ...member("helpful-dps", "DPS"),
          level: 31,
          equipment: {},
        },
      ],
      realmState,
      activeMissions: [],
      missionList: [shadowfangKeep],
      guildSetup: {
        ...guildSetup,
        dungeonActivity: GUILD_DUNGEON_ACTIVITY.NONE,
      },
      itemDatabase: [shadowfangUpgrade],
      relationships: {
        "helpful-dps::initiator": {
          memberIds: ["helpful-dps", "initiator"],
          points: 100,
        },
      },
    });

    expect(result.socialState.searches[0]?.participantIds).toContain(
      "core-dps",
    );
    expect(result.socialState.searches[0]?.participantIds).not.toContain(
      "helpful-dps",
    );
  });

  it("searches in Guild first, moves to same-faction General, and starts a full role-valid party", () => {
    let roster = [member("guild-tank", "Tank"), member("guild-healer", "Healer")];
    let result = advance(createInitialSocialState(), roster, 0);
    roster = result.roster;
    const searchId = result.socialState.searches[0]?.id;
    expect(result.socialState.searches[0]).toMatchObject({
      phase: "guild",
      participantIds: ["guild-tank"],
    });
    expect(result.socialState.messages[0]?.channel).toBe("guild");

    let search = result.socialState.searches.find((entry) => entry.id === searchId)!;
    const sameCheckpoint = advance(result.socialState, roster, 1);
    expect(sameCheckpoint.socialState.searches).toHaveLength(1);
    result = advance(result.socialState, roster, search.nextResponseAt);
    roster = result.roster;
    search = result.socialState.searches.find((entry) => entry.id === searchId)!;
    expect(search.participantIds).toContain("guild-healer");

    result = advance(
      result.socialState,
      roster,
      LFG_GUILD_SEARCH_DURATION_MS,
    );
    roster = result.roster;
    search = result.socialState.searches.find((entry) => entry.id === searchId)!;
    expect(search.phase).toBe("general");
    expect(
      result.socialState.messages.some(
        (message) =>
          message.searchId === searchId && message.intent === "general-search",
      ),
    ).toBe(true);

    for (let response = 0; response < 4 && result.readyGroups.length === 0; response += 1) {
      search = result.socialState.searches.find((entry) => entry.id === searchId)!;
      result = advance(result.socialState, roster, search.nextResponseAt);
      roster = result.roster;
    }

    const ready = result.readyGroups.find((group) => group.searchId === searchId);
    expect(ready?.participants).toHaveLength(5);
    expect(ready?.guildMemberIds).toEqual([
      "guild-tank",
      "guild-healer",
    ]);
    expect(
      ready?.participants.some((participant) => participant.id === "wrong-faction"),
    ).toBe(false);
    expect(
      new Set(ready?.participants.map((participant) => participant.id)).size,
    ).toBe(5);
  });

  it("releases realm reservations when a General search expires", () => {
    const initial = ensureSocialState({
      ...createInitialSocialState(),
      reservedRealmPlayerIds: ["realm-dps-1"],
      searches: [
        {
          id: "lfg:expired",
          missionId: dungeon.id,
          missionName: dungeon.name,
          missionType: "dungeon",
          targetSize: 5,
          phase: "general",
          createdAt: 0,
          guildSearchEndsAt: 15_000,
          expiresAt: 75_000,
          nextResponseAt: 80_000,
          participantIds: ["guild-tank", "realm-dps-1"],
          participants: [
            {
              id: "guild-tank",
              source: "guild",
              name: "guild-tank",
              role: "Tank",
              level: 20,
              faction: "Alliance",
            },
            {
              id: "realm-dps-1",
              source: "realm",
              name: "realm-dps-1",
              role: "DPS",
              level: 20,
              faction: "Alliance",
            },
          ],
          initiatorId: "guild-tank",
        },
      ],
    });

    const result = advanceSocialSimulation({
      socialState: initial,
      now: 75_000,
      roster: [member("guild-tank", "Tank")],
      realmState,
      activeMissions: [],
      missionList: [dungeon],
      guildSetup: {
        ...guildSetup,
        dungeonActivity: GUILD_DUNGEON_ACTIVITY.NONE,
      },
    });
    expect(result.socialState.searches[0]?.phase).toBe("expired");
    expect(result.socialState.reservedRealmPlayerIds).toEqual([]);
    expect(result.roster[0]?.status).toBe("Idle");
  });

  it("caps chat history and keeps realm reservations unique", () => {
    const state = ensureSocialState({
      ...createInitialSocialState(),
      messages: Array.from({ length: 340 }, (_, index) => ({
        id: `chat:${index + 1}`,
        sequence: index + 1,
        channel: index % 2 ? "guild" : "general",
        intent: "join",
        text: "Ready.",
        fallbackText: "Ready.",
        textSource: "template",
        generationStatus: "ready",
        gameTimeMs: index,
        speaker: null,
      })),
      searches: [],
      nextSequence: 341,
      reservedRealmPlayerIds: ["same", "same"],
    });

    expect(state.messages).toHaveLength(300);
    expect(state.messages[0]?.sequence).toBe(41);
    expect(state.reservedRealmPlayerIds).toEqual([]);
  });

  it("posts a disappointed guild message when a regular mission fails", () => {
    const failedMission: Mission = {
      id: "elite-failure",
      instanceId: "elite-failure:1",
      name: "Wanted: Hogger",
      type: "quest",
      elite: true,
      memberIds: ["guild-tank"],
    };

    const state = completeMissionSocialActivity({
      socialState: createInitialSocialState(),
      mission: failedMission,
      succeeded: false,
      now: 42_000,
      roster: [member("guild-tank", "Tank")],
    });

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({
      channel: "guild",
      intent: "mission-failed",
      gameTimeMs: 42_000,
      speaker: {
        id: "guild-tank",
        source: "guild",
      },
    });
    expect(state.messages[0]?.fallbackText).toContain("Wanted: Hogger");
    expect(state.messages[0]?.searchId).toBeUndefined();
  });

  it("celebrates a successful regular mission in guild chat", () => {
    const successfulMission: Mission = {
      id: "elite-success",
      instanceId: "elite-success:1",
      name: "Wanted: Hogger",
      type: "quest",
      elite: true,
      memberIds: ["guild-tank"],
    };

    const state = completeMissionSocialActivity({
      socialState: createInitialSocialState(),
      mission: successfulMission,
      succeeded: true,
      now: 43_000,
      roster: [member("guild-tank", "Tank")],
    });

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({
      channel: "guild",
      intent: "mission-success",
      gameTimeMs: 43_000,
      speaker: {
        id: "guild-tank",
        source: "guild",
      },
    });
    expect(state.messages[0]?.fallbackText).toContain("Wanted: Hogger");
    expect(state.messages[0]?.searchId).toBeUndefined();
  });

  it("excludes non-five-player dungeons and requires an available key holder", () => {
    const tenPlayerDungeon: Mission = {
      ...dungeon,
      id: "upper-spire",
      name: "Upper Spire",
      requiredPartySize: 10,
    };
    const lockedDungeon: Mission = {
      ...dungeon,
      id: "locked-wing",
      name: "Locked Wing",
      requiresKey: true,
      keyId: "wing-key",
    };
    const roster = [
      member("guild-tank", "Tank"),
      member("guild-healer", "Healer"),
    ];
    const blocked = advanceSocialSimulation({
      socialState: createInitialSocialState(),
      now: 0,
      roster,
      realmState,
      activeMissions: [],
      missionList: [tenPlayerDungeon, lockedDungeon],
      guildSetup,
    });
    expect(blocked.socialState.searches).toEqual([]);

    const unlockedRoster = [
      { ...roster[0], keys: ["wing-key"] },
      roster[1],
    ];
    const unlocked = advanceSocialSimulation({
      socialState: createInitialSocialState(),
      now: 0,
      roster: unlockedRoster,
      realmState,
      activeMissions: [],
      missionList: [tenPlayerDungeon, lockedDungeon],
      guildSetup,
    });
    expect(unlocked.socialState.searches[0]).toMatchObject({
      missionId: "locked-wing",
      initiatorId: "guild-tank",
    });
  });
});
