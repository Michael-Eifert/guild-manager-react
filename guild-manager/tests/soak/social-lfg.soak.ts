import { describe, expect, it } from "vitest";

import { GUILD_DUNGEON_ACTIVITY } from "../../src/constants";
import {
  advanceSocialSimulation,
  completeMissionSocialActivity,
  createInitialSocialState,
  markLfgSearchStarted,
  MAX_ACTIVE_LFG_SEARCHES,
  MAX_CHAT_MESSAGES,
  MAX_LFG_SEARCH_HISTORY,
} from "../../src/social/socialSimulation";
import type { SocialState } from "../../src/social/chatTypes";
import type { Character } from "../../src/types/characterTypes";
import type { Mission } from "../../src/types/missionTypes";

const member = (id: string, role: string): Character => ({
  id,
  name: id,
  level: 20,
  charClass:
    role === "Tank" ? "Warrior" : role === "Healer" ? "Priest" : "Mage",
  role,
  status: "Idle",
  faction: "Alliance",
});

const dungeon: Mission = {
  id: "deadmines",
  name: "The Deadmines",
  type: "dungeon",
  level: 20,
  minLevel: 15,
  requiredPartySize: 5,
  duration: 60,
};

const realmState = {
  npcGuilds: [{ id: "realm-guild", name: "Realm Regulars" }],
  population: {
    players: [
      {
        id: "realm-dps-1",
        name: "realm-dps-1",
        level: 20,
        itemLevel: 18,
        charClass: "Mage",
        role: "DPS",
        faction: "Alliance",
        guildId: "realm-guild",
      },
      {
        id: "realm-dps-2",
        name: "realm-dps-2",
        level: 20,
        itemLevel: 18,
        charClass: "Rogue",
        role: "DPS",
        faction: "Alliance",
        guildId: "realm-guild",
      },
      {
        id: "realm-dps-3",
        name: "realm-dps-3",
        level: 20,
        itemLevel: 18,
        charClass: "Hunter",
        role: "DPS",
        faction: "Alliance",
        guildId: "realm-guild",
      },
      {
        id: "wrong-faction",
        name: "wrong-faction",
        level: 20,
        itemLevel: 18,
        charClass: "Mage",
        role: "DPS",
        faction: "Horde",
        guildId: null,
      },
    ],
  },
};

const guildSetup = {
  faction: "Alliance",
  dungeonActivity: GUILD_DUNGEON_ACTIVITY.BALANCED,
};

describe("social LFG soak", () => {
  it("forms and completes 50 mixed groups without leaking reservations", () => {
    let socialState: SocialState = createInitialSocialState();
    let roster = [member("guild-tank", "Tank"), member("guild-healer", "Healer")];

    for (let cycle = 0; cycle < 50; cycle += 1) {
      let now = cycle * 100_000;
      let result = advanceSocialSimulation({
        socialState,
        now,
        roster,
        realmState,
        activeMissions: [],
        missionList: [dungeon],
        guildSetup,
      });
      socialState = result.socialState;
      roster = result.roster;
      let search = socialState.searches.find(
        (entry) => entry.phase === "guild" || entry.phase === "general",
      );
      expect(search).toBeTruthy();

      for (
        let response = 0;
        response < 12 && result.readyGroups.length === 0;
        response += 1
      ) {
        search = socialState.searches.find(
          (entry) =>
            entry.phase === "guild" ||
            entry.phase === "general" ||
            entry.phase === "ready",
        );
        expect(search).toBeTruthy();
        now =
          search?.phase === "guild" && response >= 2
            ? search.guildSearchEndsAt
            : Math.max(now + 1, search?.nextResponseAt || now + 1);
        result = advanceSocialSimulation({
          socialState,
          now,
          roster,
          realmState,
          activeMissions: [],
          missionList: [dungeon],
          guildSetup,
        });
        socialState = result.socialState;
        roster = result.roster;
        const activeCount = socialState.searches.filter((entry) =>
          ["guild", "general", "ready", "in-progress"].includes(entry.phase),
        ).length;
        expect(activeCount).toBeLessThanOrEqual(MAX_ACTIVE_LFG_SEARCHES);
      }

      const readyGroup = result.readyGroups[0];
      expect(readyGroup).toBeTruthy();
      expect(readyGroup.participants).toHaveLength(5);
      expect(
        new Set(readyGroup.participants.map((participant) => participant.id))
          .size,
      ).toBe(5);
      expect(
        readyGroup.participants.every(
          (participant) => participant.faction === "Alliance",
        ),
      ).toBe(true);
      expect(
        readyGroup.participants.map((participant) => participant.role),
      ).toEqual(expect.arrayContaining(["Tank", "Healer", "DPS"]));

      socialState = markLfgSearchStarted({
        socialState,
        searchId: readyGroup.searchId,
        missionInstanceId: `run-${cycle}`,
        now,
      });
      socialState = completeMissionSocialActivity({
        socialState,
        mission: {
          ...dungeon,
          instanceId: `run-${cycle}`,
          lfgSearchId: readyGroup.searchId,
          memberIds: readyGroup.guildMemberIds,
          partyParticipants: readyGroup.participants,
        },
        succeeded: cycle % 5 !== 0,
        now: now + 60_000,
      });
      roster = roster.map((character) => ({
        ...character,
        status: "Idle",
      }));

      expect(socialState.reservedRealmPlayerIds).toEqual([]);
      expect(socialState.searches.length).toBeLessThanOrEqual(
        MAX_LFG_SEARCH_HISTORY,
      );
      expect(socialState.messages.length).toBeLessThanOrEqual(MAX_CHAT_MESSAGES);
    }

    expect(socialState.searches).toHaveLength(MAX_LFG_SEARCH_HISTORY);
    expect(socialState.messages).toHaveLength(MAX_CHAT_MESSAGES);
  });
});
