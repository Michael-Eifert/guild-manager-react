import { describe, expect, it } from "vitest";

import { GUILD_DUNGEON_ACTIVITY } from "../constants";
import {
  LFG_GUILD_SEARCH_DURATION_MS,
  advanceSocialSimulation,
  completeMissionSocialActivity,
  createInitialSocialState,
  ensureSocialState,
} from "../social/socialSimulation";
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
