import { describe, expect, it } from "vitest";

import {
  GUILD_FACTION,
  GUILD_SERVER_STYLE,
  REALM_DIFFICULTY,
} from "../../src/constants";
import { ensureRealmState } from "../../src/server/realmGeneration";
import { advanceRealmSimulation } from "../../src/server/realmSimulation";

type SoakRealmPlayer = {
  id: string;
  level: number;
  itemLevel: number;
};

type SoakRealmGuild = {
  id: string;
  averageLevel: number;
  pveScore?: number;
  roster: unknown[];
};

type SoakRealm = {
  lastSimulatedDayIndex: number;
  npcGuilds: SoakRealmGuild[];
  population: { players: SoakRealmPlayer[] };
  news: Array<{ dayIndex?: number; type?: string; message?: string }>;
};

const createRealm = ensureRealmState as unknown as (
  realmState: unknown,
  guildSetup: Record<string, unknown>,
  currentDayIndex: number,
) => SoakRealm;

const advanceRealm = advanceRealmSimulation as unknown as (options: {
  realmState: SoakRealm;
  currentDayIndex: number;
  playerGuildSnapshot: Record<string, unknown>;
  guildSetup: Record<string, unknown>;
}) => SoakRealm;

const playerGuildSnapshot = {
  id: "player:guild",
  name: "Soak Guild",
  faction: GUILD_FACTION.ALLIANCE,
  isPlayerGuild: true,
  rosterSize: 25,
  averageLevel: 45,
  averageGearScore: 35,
  pveScore: 1_200,
  raidProgress: 3,
  dungeonScore: 400,
  archetype: "Player Guild",
};

const advanceScenario = (
  realmDifficulty: string,
  currentDayIndex: number,
) => {
  const guildSetup = {
    faction: GUILD_FACTION.ALLIANCE,
    server: "Everlook",
    serverStyle: GUILD_SERVER_STYLE.PVE,
    realmDifficulty,
  };
  return advanceRealm({
    realmState: createRealm(null, guildSetup, 0),
    currentDayIndex,
    playerGuildSnapshot,
    guildSetup,
  });
};

const getRealmSummary = (realm: ReturnType<typeof advanceScenario>) => ({
  day: realm.lastSimulatedDayIndex,
  guildCount: realm.npcGuilds.length,
  playerCount: realm.population.players.length,
  news: realm.news.map((entry) => `${entry.dayIndex}:${entry.type}:${entry.message}`),
  guilds: realm.npcGuilds.map((guild) => ({
    id: guild.id,
    level: guild.averageLevel,
    rosterSize: guild.roster.length,
    pveScore: guild.pveScore,
  })),
});

describe("realm simulation soak", () => {
  const scenarios = [
    { difficulty: REALM_DIFFICULTY.EASY, days: 30 },
    { difficulty: REALM_DIFFICULTY.NORMAL, days: 60 },
    { difficulty: REALM_DIFFICULTY.HARD, days: 90 },
  ];

  for (const scenario of scenarios) {
    it(`keeps ${scenario.difficulty} stable for ${scenario.days} virtual days`, () => {
      const realm = advanceScenario(scenario.difficulty, scenario.days);
      const playerIds = realm.population.players.map((player) => player.id);

      expect(realm.lastSimulatedDayIndex).toBe(scenario.days);
      expect(realm.npcGuilds.length).toBeGreaterThan(0);
      expect(playerIds.length).toBeGreaterThan(0);
      expect(new Set(playerIds).size).toBe(playerIds.length);
      expect(realm.news.length).toBeLessThanOrEqual(25);
      expect(
        realm.population.players.every(
          (player) =>
            Number.isFinite(player.level) &&
            player.level >= 1 &&
            player.level <= 60 &&
            Number.isFinite(player.itemLevel) &&
            player.itemLevel >= 0,
        ),
      ).toBe(true);
      for (const guild of realm.npcGuilds) {
        expect(
          Number.isFinite(guild.averageLevel) && guild.averageLevel >= 1,
          `invalid average level for ${guild.id}: ${guild.averageLevel}`,
        ).toBe(true);
        expect(
          guild.pveScore === undefined ||
            (Number.isFinite(guild.pveScore) && guild.pveScore >= 0),
          `invalid PvE score for ${guild.id}: ${guild.pveScore}`,
        ).toBe(true);
      }
    });
  }

  it("produces the same mature realm from identical inputs", () => {
    const first = advanceScenario(REALM_DIFFICULTY.NORMAL, 60);
    const second = advanceScenario(REALM_DIFFICULTY.NORMAL, 60);

    expect(getRealmSummary(second)).toEqual(getRealmSummary(first));
  });
});
