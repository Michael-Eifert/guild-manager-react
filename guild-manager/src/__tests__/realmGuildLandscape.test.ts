import { describe, expect, it } from "vitest";

import { GUILD_FACTION, GUILD_SERVER_POPULATION, GUILD_SERVER_STYLE } from "../constants";
import { PERSONALITY_TRAIT_ID } from "../game/characterPersonality";
import {
  getRealmGuildDynamicsProfile,
  NPC_GUILD_ARCHETYPES,
  REALM_MARKET_STATUS,
} from "../server/realmDefinitions";
import { ensureRealmState } from "../server/realmGeneration";
import {
  advanceNpcGuildStructureForDay,
  advanceRealmSimulation,
  getDesiredRealmNpcGuildCount,
  getNpcGuildTargetRosterSize,
} from "../server/realmSimulation";
import {
  createRealmPlayer,
  getRealmGuildFitScore,
} from "../server/realmPopulation";

const createGuild = ({
  id,
  faction = GUILD_FACTION.ALLIANCE,
  archetype = NPC_GUILD_ARCHETYPES.CASUAL_ADVENTURERS,
  memberCount = 1,
  targetRosterSize = 20,
  activityLevel = 10,
  reputation = 10,
  understrengthSinceDayIndex = 0,
}: {
  id: string;
  faction?: string;
  archetype?: string;
  memberCount?: number;
  targetRosterSize?: number;
  activityLevel?: number;
  reputation?: number;
  understrengthSinceDayIndex?: number | null;
}) => ({
  id,
  name: `Guild ${id}`,
  faction,
  archetype,
  roster: Array.from({ length: memberCount }, (_, index) => ({
    id: `${id}:${index}`,
    name: `${id} Member ${index}`,
    level: 20,
    itemLevel: 10,
    role: index === 0 ? "Tank" : "DPS",
  })),
  rosterSize: memberCount,
  targetRosterSize,
  activityLevel,
  reputation,
  foundedAtDayIndex: 0,
  understrengthSinceDayIndex,
  averageLevel: 20,
  averageGearScore: 10,
  raidProgress: 0,
  dungeonScore: 0,
});

const createMembers = (guild: ReturnType<typeof createGuild>) =>
  guild.roster.map((member) =>
    createRealmPlayer({
      ...member,
      faction: guild.faction,
      race: guild.faction === GUILD_FACTION.HORDE ? "Orc" : "Human",
      charClass: "Warrior",
      guildId: guild.id,
      sourceGuildName: guild.name,
      marketStatus: REALM_MARKET_STATUS.GUILDED,
      activityLevel: 50,
      loyalty: 50,
    }),
  );

describe("configurable realm guild landscape", () => {
  it("creates density-specific starting guild counts and roster targets", () => {
    const setup = {
      server: "Lordaeron",
      serverStyle: GUILD_SERVER_STYLE.PVE,
      serverPopulation: GUILD_SERVER_POPULATION.MEDIUM,
    };
    const few = ensureRealmState(null, setup, 0, 0, {
      realmGuildDensity: "few",
      realmGuildDynamics: "medium",
    });
    const medium = ensureRealmState(null, setup, 0, 0, {
      realmGuildDensity: "medium",
      realmGuildDynamics: "medium",
    });
    const many = ensureRealmState(null, setup, 0, 0, {
      realmGuildDensity: "many",
      realmGuildDynamics: "medium",
    });

    expect(few.npcGuilds.length).toBeGreaterThanOrEqual(5);
    expect(few.npcGuilds.length).toBeLessThanOrEqual(6);
    expect(medium.npcGuilds.length).toBeGreaterThanOrEqual(8);
    expect(medium.npcGuilds.length).toBeLessThanOrEqual(10);
    expect(many.npcGuilds.length).toBeGreaterThanOrEqual(11);
    expect(many.npcGuilds.length).toBeLessThanOrEqual(14);
    expect(
      getNpcGuildTargetRosterSize(few.npcGuilds[0], "few"),
    ).toBeGreaterThan(
      getNpcGuildTargetRosterSize(few.npcGuilds[0], "many"),
    );
  });

  it("uses separate density targets and dynamics pacing", () => {
    const common = {
      realmId: "realm:test",
      serverPopulation: GUILD_SERVER_POPULATION.HIGH,
      currentGuildCount: 10,
      totalPopulation: 2_000,
    };
    const few = getDesiredRealmNpcGuildCount({
      ...common,
      guildDensity: "few",
    });
    const medium = getDesiredRealmNpcGuildCount({
      ...common,
      guildDensity: "medium",
    });
    const many = getDesiredRealmNpcGuildCount({
      ...common,
      guildDensity: "many",
    });

    expect(few).toBeLessThan(medium);
    expect(medium).toBeLessThan(many);
    expect(getRealmGuildDynamicsProfile("low").fusionWeakDays).toBe(14);
    expect(getRealmGuildDynamicsProfile("medium").fusionWeakDays).toBe(7);
    expect(getRealmGuildDynamicsProfile("high").fusionWeakDays).toBe(4);
  });

  it("does not immediately add or remove guilds when settings change", () => {
    const setup = {
      server: "Lordaeron",
      serverStyle: GUILD_SERVER_STYLE.PVE,
      faction: GUILD_FACTION.ALLIANCE,
    };
    const realm = ensureRealmState(null, setup, 0, 0, {
      realmGuildDensity: "many",
      realmGuildDynamics: "high",
    });
    const changed = advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: 0,
      guildSetup: setup,
      gameSettings: {
        realmGuildDensity: "few",
        realmGuildDynamics: "low",
      },
    });

    expect(changed.npcGuilds).toHaveLength(realm.npcGuilds.length);
    expect(changed.guildDensity).toBe("few");
    expect(changed.guildDynamics).toBe("low");
  });

  it("preserves the realm reference when no simulation step changed", () => {
    const setup = {
      server: "Lordaeron",
      serverStyle: GUILD_SERVER_STYLE.PVE,
      faction: GUILD_FACTION.ALLIANCE,
    };
    const realm = ensureRealmState(null, setup, 0, 0, {
      realmGuildDensity: "medium",
      realmGuildDynamics: "medium",
    });
    const normalized = advanceRealmSimulation({
      realmState: realm,
      currentDayIndex: 0,
      currentDayProgress: 0,
      guildSetup: setup,
      gameSettings: {
        realmGuildDensity: "medium",
        realmGuildDynamics: "medium",
      },
    });
    const unchanged = advanceRealmSimulation({
      realmState: normalized,
      currentDayIndex: 0,
      currentDayProgress: 0,
      guildSetup: setup,
      gameSettings: {
        realmGuildDensity: "medium",
        realmGuildDynamics: "medium",
      },
    });

    expect(unchanged).toBe(normalized);
  });

  it("scores character traits toward matching guild archetypes", () => {
    const player = createRealmPlayer({
      id: "raider",
      name: "Raider",
      faction: GUILD_FACTION.ALLIANCE,
      race: "Human",
      charClass: "Warrior",
      role: "DPS",
      level: 60,
      activityLevel: 90,
      personalityTraits: [PERSONALITY_TRAIT_ID.RAIDER],
    });
    const hardcore = createGuild({
      id: "hardcore",
      archetype: NPC_GUILD_ARCHETYPES.HARDCORE_RAIDERS,
      activityLevel: 90,
      reputation: 70,
    });
    const social = createGuild({
      id: "social",
      archetype: NPC_GUILD_ARCHETYPES.SOCIAL_GUILD,
      activityLevel: 45,
      reputation: 70,
    });

    expect(
      getRealmGuildFitScore({ player, guild: hardcore, guildMembers: [] }),
    ).toBeGreaterThan(
      getRealmGuildFitScore({ player, guild: social, guildMembers: [] }),
    );
  });

  it("supports acquisitions while preserving every affected member", () => {
    const weak = createGuild({ id: "weak", memberCount: 1 });
    const strong = createGuild({
      id: "strong",
      memberCount: 4,
      targetRosterSize: 30,
      activityLevel: 95,
      reputation: 95,
      understrengthSinceDayIndex: null,
    });
    const population = {
      players: [...createMembers(weak), ...createMembers(strong)],
    };
    const result = advanceNpcGuildStructureForDay({
      realmState: { id: "realm:test", name: "Test", type: "PvE" },
      npcGuilds: [weak, strong],
      population,
      dayIndex: 20,
      guildDynamics: "medium",
    });

    expect(result.event?.type).toBe("npc-guild-acquisition");
    expect(result.npcGuilds).toHaveLength(1);
    expect(result.population.players).toHaveLength(5);
    expect(
      result.population.players.every(
        (player: Record<string, unknown>) => player.guildId === strong.id,
      ),
    ).toBe(true);
  });

  it("supports equal mergers and creates a new guild", () => {
    const first = createGuild({ id: "first", memberCount: 2 });
    const second = createGuild({ id: "second", memberCount: 2 });
    const population = {
      players: [...createMembers(first), ...createMembers(second)],
    };
    const result = advanceNpcGuildStructureForDay({
      realmState: {
        id: "realm:test",
        name: "Lordaeron",
        type: GUILD_SERVER_STYLE.PVE,
        populationLabel: GUILD_SERVER_POPULATION.MEDIUM,
      },
      npcGuilds: [first, second],
      population,
      dayIndex: 20,
      guildDensity: "medium",
      guildDynamics: "medium",
    });

    expect(result.event?.type).toBe("npc-guild-merger");
    expect(result.npcGuilds).toHaveLength(1);
    expect(result.population.players).toHaveLength(4);
    expect(
      result.population.players.every(
        (player: Record<string, unknown>) =>
          player.guildId === result.npcGuilds[0].id,
      ),
    ).toBe(true);
  });

  it("disbands a long-term weak guild only above realm protection floors", () => {
    const weak = createGuild({ id: "weak", memberCount: 1 });
    const healthyGuilds = Array.from({ length: 5 }, (_, index) =>
      createGuild({
        id: `healthy-${index}`,
        faction:
          index < 2 ? GUILD_FACTION.ALLIANCE : GUILD_FACTION.HORDE,
        memberCount: 10,
        targetRosterSize: index < 2 ? 50 : 20,
        activityLevel: index < 2 ? 20 : 90,
        reputation: index < 2 ? 20 : 90,
        understrengthSinceDayIndex: null,
      }),
    );
    const guilds = [weak, ...healthyGuilds];
    const population = {
      players: guilds.flatMap(createMembers),
    };
    const result = advanceNpcGuildStructureForDay({
      realmState: { id: "realm:test" },
      npcGuilds: guilds,
      population,
      dayIndex: 30,
      guildDynamics: "medium",
    });

    expect(result.event?.type).toBe("npc-guild-dissolution");
    expect(result.npcGuilds).toHaveLength(5);
    expect(
      result.population.players.find(
        (player: Record<string, unknown>) => player.id === "weak:0",
      )?.marketStatus,
    ).toBe(REALM_MARKET_STATUS.FREE_AGENT);
  });
});
