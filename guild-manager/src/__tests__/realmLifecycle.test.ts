import { describe, expect, it } from "vitest";

import { GUILD_FACTION, GUILD_SERVER_STYLE } from "../constants";
import { ensureRealmState } from "../server/realmGeneration";
import {
  advanceRealmPopulationActivity,
  advanceRealmPopulationLifecycle,
  createRealmPlayer,
  getRealmApplicationChance,
  getRealmGuildApplications,
} from "../server/realmPopulation";
import { REALM_MARKET_STATUS } from "../server/realmDefinitions";
import { migrateSessionPayload } from "../session/sessionMigrations";

const guildSetup = {
  faction: GUILD_FACTION.ALLIANCE,
  server: "Everlook",
  serverStyle: GUILD_SERVER_STYLE.PVE,
};

const createRealm = () => ensureRealmState(null, guildSetup, 0);

const prepareStablePlayers = (realm: ReturnType<typeof createRealm>) =>
  realm.population.players.map((player: Record<string, unknown>) => ({
    ...player,
    activityLevel: 60,
    loyalty: 80,
    arrivalDayIndex: null,
  }));

describe("realm population lifecycle", () => {
  it("uses the adaptive application chances for an emptier market inbox", () => {
    expect(getRealmApplicationChance(0)).toBe(0.7);
    expect(getRealmApplicationChance(1)).toBe(0.7);
    expect(getRealmApplicationChance(2)).toBe(0.45);
    expect(getRealmApplicationChance(5)).toBe(0.2);
    expect(getRealmApplicationChance(8)).toBe(0);
  });

  it("moves at most three deeply disloyal NPC members into the free market", () => {
    const realm = createRealm();
    const guild = realm.npcGuilds[0];
    const players = prepareStablePlayers(realm).map((player, index) =>
      index < 8
        ? {
            ...player,
            guildId: guild.id,
            sourceGuildName: guild.name,
            marketStatus: REALM_MARKET_STATUS.OPEN_TO_OFFERS,
            loyalty: 1,
          }
        : {
            ...player,
            guildId: null,
            sourceGuildName: null,
            marketStatus: REALM_MARKET_STATUS.FREE_AGENT,
          },
    );

    const result = advanceRealmPopulationLifecycle({
      realmState: {
        ...realm,
        population: { ...realm.population, players },
      },
      npcGuilds: realm.npcGuilds,
      dayIndex: 1,
      random: () => 0,
    });
    const exited = result.population.players.filter(
      (player: Record<string, unknown>) =>
        !player.guildId &&
        Number(player.loyalty) === 40 &&
        player.sourceGuildName === guild.name,
    );

    expect(result.stats.npcGuildExits).toBe(3);
    expect(exited).toHaveLength(3);
    expect(
      result.npcGuilds.find(
        (candidate: Record<string, unknown>) => candidate.id === guild.id,
      )?.roster,
    ).toHaveLength(5);
  });

  it("persists temporary departures and returns them without duplicate ids", () => {
    const realm = createRealm();
    const players = [
      ...prepareStablePlayers(realm).map((player, index) => ({
        ...player,
        activityLevel: index < 2 ? 1 : 60,
      })),
      {
        ...prepareStablePlayers(realm)[0],
        id: "stable-extra-1",
        name: "Stable Extra One",
        activityLevel: 60,
      },
      {
        ...prepareStablePlayers(realm)[1],
        id: "stable-extra-2",
        name: "Stable Extra Two",
        activityLevel: 60,
      },
    ];
    const departed = advanceRealmPopulationLifecycle({
      realmState: {
        ...realm,
        population: { ...realm.population, players },
      },
      npcGuilds: realm.npcGuilds,
      dayIndex: 1,
      random: () => 0,
    });

    expect(departed.stats.realmDepartures).toBe(2);
    expect(departed.population.departedPlayers).toHaveLength(2);

    const eligibleEntries = departed.population.departedPlayers.map(
      (entry: Record<string, unknown>) => ({
        ...entry,
        eligibleReturnDayIndex: 15,
      }),
    );
    const returned = advanceRealmPopulationLifecycle({
      realmState: {
        ...realm,
        population: {
          ...departed.population,
          departedPlayers: eligibleEntries,
        },
      },
      npcGuilds: departed.npcGuilds,
      dayIndex: 15,
      random: () => 0,
    });
    const ids = returned.population.players.map(
      (player: Record<string, unknown>) => player.id,
    );

    expect(returned.stats.returners).toBe(2);
    expect(returned.population.departedPlayers).toHaveLength(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prioritizes an eligible returner before level-one arrivals fill the cap", () => {
    const realm = createRealm();
    const stablePlayers = prepareStablePlayers(realm);
    const playersAtCapMinusOne = Array.from(
      { length: realm.population.currentSoftCap - 1 },
      (_, index) => ({
        ...stablePlayers[index % stablePlayers.length],
        id: `capacity-player-${index}`,
        name: `Capacity Player ${index}`,
        guildId: null,
        sourceGuildName: null,
        marketStatus: REALM_MARKET_STATUS.FREE_AGENT,
      }),
    );
    const returningPlayer = createRealmPlayer({
      id: "returning-veteran",
      name: "Veteran",
      faction: GUILD_FACTION.ALLIANCE,
      race: "Human",
      charClass: "Warrior",
      level: 42,
      itemLevel: 28,
      activityLevel: 70,
    });
    const result = advanceRealmPopulationActivity({
      realmState: {
        ...realm,
        population: {
          ...realm.population,
          players: playersAtCapMinusOne,
          departedPlayers: [
            {
              player: returningPlayer,
              departedDayIndex: 0,
              eligibleReturnDayIndex: 14,
              reason: "realm_break",
            },
          ],
        },
      },
      npcGuilds: realm.npcGuilds,
      dayIndex: 14,
      dayFraction: 0.25,
      dayStepIndex: 0,
      guildFaction: GUILD_FACTION.ALLIANCE,
      random: () => 0,
    });

    expect(
      result.population.players.some(
        (player: Record<string, unknown>) => player.id === returningPlayer.id,
      ),
    ).toBe(true);
    expect(result.population.dailyStats.returners).toBe(1);
    expect(result.population.dailyStats.arrivals).toBe(0);
  });

  it("keeps new arrivals out of NPC guilds until the following day", () => {
    const realm = createRealm();
    const protectedPlayers = prepareStablePlayers(realm).map((player) => ({
      ...player,
      guildId: null,
      sourceGuildName: null,
      marketStatus: REALM_MARKET_STATUS.FREE_AGENT,
      arrivalDayIndex: 1,
    }));
    const protectedResult = advanceRealmPopulationActivity({
      realmState: {
        ...realm,
        population: {
          ...realm.population,
          players: protectedPlayers,
          currentSoftCap: protectedPlayers.length,
        },
      },
      npcGuilds: realm.npcGuilds,
      dayIndex: 1,
      dayFraction: 0.25,
      dayStepIndex: 1,
      random: () => 0.9,
    });
    const eligibleResult = advanceRealmPopulationActivity({
      realmState: {
        ...realm,
        population: protectedResult.population,
      },
      npcGuilds: protectedResult.npcGuilds,
      dayIndex: 2,
      dayFraction: 0.25,
      dayStepIndex: 1,
      random: () => 0.9,
    });

    expect(protectedResult.population.dailyStats.npcRecruits || 0).toBe(0);
    expect(eligibleResult.population.dailyStats.npcRecruits).toBeGreaterThan(0);
  });

  it("expires seven-day applications and adaptively creates at most one per day", () => {
    const realm = createRealm();
    const applicant = realm.population.players.find(
      (player: Record<string, unknown>) =>
        player.faction === GUILD_FACTION.ALLIANCE &&
        player.marketStatus === REALM_MARKET_STATUS.FREE_AGENT,
    );
    expect(applicant).toBeTruthy();
    const expired = advanceRealmPopulationLifecycle({
      realmState: {
        ...realm,
        population: {
          ...realm.population,
          players: prepareStablePlayers(realm),
          applications: [
            {
              id: "old-application",
              playerId: applicant.id,
              dayIndex: 0,
            },
          ],
        },
      },
      npcGuilds: realm.npcGuilds,
      dayIndex: 7,
      random: () => 1,
    });

    expect(expired.stats.expiredApplications).toBe(1);
    expect(expired.population.applications).toHaveLength(0);

    const applied = advanceRealmPopulationActivity({
      realmState: {
        ...realm,
        population: {
          ...expired.population,
          lastApplicationDayIndex: -1,
        },
      },
      npcGuilds: expired.npcGuilds,
      dayIndex: 8,
      dayFraction: 0.25,
      dayStepIndex: 0,
      guildFaction: GUILD_FACTION.ALLIANCE,
      random: () => 0,
    });

    expect(
      getRealmGuildApplications({
        realmState: { ...realm, population: applied.population },
        faction: GUILD_FACTION.ALLIANCE,
      }),
    ).toHaveLength(1);
  });

  it("migrates version 10 saves with an empty persisted returner pool", () => {
    const migrated = migrateSessionPayload({
      format: "guild-manager-session",
      version: 10,
      data: {
        roster: [],
        realmState: {
          population: {
            players: [],
          },
        },
      },
    });

    expect(migrated.version).toBe(12);
    expect(
      (
        (migrated.data.realmState as Record<string, unknown>)
          .population as Record<string, unknown>
      ).departedPlayers,
    ).toEqual([]);
  });
});
