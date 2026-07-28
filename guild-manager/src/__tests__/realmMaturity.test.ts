import { describe, expect, it } from "vitest";

import { DEFAULT_GUILD_SETUP } from "../constants";
import { DB_ITEMS } from "../data/items";
import { normalizeGuildSetup } from "../guild/guildSetup";
import { buildStartingGuild } from "../guild/startingGuild";
import {
  getMaxStartingGuildProgress,
  normalizeStartingGuildProgress,
} from "../guild/startProgression";
import { getGuildDerivedStats } from "../guildProgression";
import { ensureRealmState } from "../server/realmGeneration";

const founder = {
  name: "Guildlead",
  race: "Human",
  gender: "Male" as const,
  charClass: "Warrior",
  role: "Tank" as const,
  personalityTrait: "raider",
  leadershipTrait: "strategist" as const,
};

const buildRealm = (realmAgeMonths: number) =>
  ensureRealmState(
    null,
    {
      ...DEFAULT_GUILD_SETUP,
      serverPopulation: "Medium",
      realmAgeMonths,
    },
    0,
    5,
    {
      realmGuildDensity: "medium",
      realmGuildDynamics: "medium",
    },
  );

describe("realm maturity setup", () => {
  it("normalizes realm age and clamps guild progress to unlocked tiers", () => {
    expect(getMaxStartingGuildProgress(0)).toBe("fresh");
    expect(getMaxStartingGuildProgress(1)).toBe("growing");
    expect(getMaxStartingGuildProgress(2)).toBe("established");
    expect(getMaxStartingGuildProgress(4)).toBe("endgame_prep");
    expect(getMaxStartingGuildProgress(6)).toBe("raid20_ready");
    expect(getMaxStartingGuildProgress(8)).toBe("raid40_ready");
    expect(getMaxStartingGuildProgress(10)).toBe("bwl_ready");
    expect(normalizeStartingGuildProgress("bwl_ready", 6)).toBe(
      "raid20_ready",
    );

    expect(
      normalizeGuildSetup({
        ...DEFAULT_GUILD_SETUP,
        realmAgeMonths: 99,
        startingGuildProgress: "bwl_ready",
      }),
    ).toMatchObject({
      realmAgeMonths: 12,
      startingGuildProgress: "bwl_ready",
    });
    expect(normalizeGuildSetup(DEFAULT_GUILD_SETUP)).toMatchObject({
      realmAgeMonths: 0,
      startingGuildProgress: "fresh",
    });
  });

  it.each([
    [0, "fresh", 5, 1, 10],
    [1, "growing", 10, 30, 100],
    [2, "established", 15, 50, 300],
    [4, "endgame_prep", 20, 60, 650],
    [6, "raid20_ready", 25, 60, 1000],
    [8, "raid40_ready", 45, 60, 1400],
    [10, "bwl_ready", 50, 60, 2200],
  ])(
    "builds the %s-month player guild package",
    (realmAgeMonths, progress, rosterSize, founderLevel, gold) => {
      const result = buildStartingGuild({
        founder,
        faction: "Alliance",
        guildName: "Maturity Test",
        realmName: "Everlook",
        realmAgeMonths,
        startingGuildProgress: progress,
      });

      expect(result.progress).toBe(progress);
      expect(result.roster).toHaveLength(rosterSize);
      expect(result.roster[0]).toMatchObject({
        name: founder.name,
        level: founderLevel,
        role: founder.role,
      });
      expect(result.gold).toBe(gold);
    },
  );

  it("builds a valid raid-ready core without granting raid clears or raid loot", () => {
    const result = buildStartingGuild({
      founder,
      faction: "Alliance",
      guildName: "Maturity Test",
      realmName: "Everlook",
      realmAgeMonths: 6,
      startingGuildProgress: "raid20_ready",
    });
    const core = result.roster.slice(0, 20);

    expect(core.filter((member) => member.level === 60)).toHaveLength(20);
    expect(core.filter((member) => member.role === "Tank")).toHaveLength(2);
    expect(core.filter((member) => member.role === "Healer")).toHaveLength(5);
    expect(core.filter((member) => member.role === "DPS")).toHaveLength(13);
    expect(result.guildProgress.talents.raidAttunement).toBe(1);
    expect(
      Object.entries(result.guildProgress.milestones.dungeon)
        .filter(([key]) => /molten|zul|qiraj|onyxia|blackwing|naxx/i.test(key))
        .every(([, value]) => value === false),
    ).toBe(true);
  });

  it("builds a 40-player Molten Core team with reserves and no raid clear", () => {
    const result = buildStartingGuild({
      founder,
      faction: "Alliance",
      guildName: "Forty Test",
      realmName: "Everlook",
      realmAgeMonths: 8,
      startingGuildProgress: "raid40_ready",
    });
    const core = result.roster.slice(0, 40);

    expect(result.roster).toHaveLength(45);
    expect(core.every((member) => member.level === 60)).toBe(true);
    expect(core.filter((member) => member.role === "Tank")).toHaveLength(4);
    expect(core.filter((member) => member.role === "Healer")).toHaveLength(8);
    expect(core.filter((member) => member.role === "DPS")).toHaveLength(28);
    expect(
      core.every((member) =>
        member.keys.includes("molten_core_attunement"),
      ),
    ).toBe(true);
    expect(
      core.every(
        (member) => !member.keys.includes("blackwing_lair_attunement"),
      ),
    ).toBe(true);
    expect(result.guildProgress.milestones.dungeon.moltenCoreCleared).toBe(
      false,
    );
    expect(result.guildProgress.talents).toMatchObject({
      rosterCap: 2,
      expBoost: 3,
      raidAttunement: 1,
      goldCap: 1,
    });
    expect(getGuildDerivedStats(result.guildProgress).maxRoster).toBe(50);
  });

  it("builds a BWL-ready team with earlier raid gear, clears, and talents", () => {
    const result = buildStartingGuild({
      founder,
      faction: "Alliance",
      guildName: "BWL Test",
      realmName: "Everlook",
      realmAgeMonths: 10,
      startingGuildProgress: "bwl_ready",
      itemDatabase: DB_ITEMS as unknown as Record<string, unknown>[],
    });
    const core = result.roster.slice(0, 40);
    const equippedItems = core.flatMap((member) =>
      Object.values(member.equipment || {}),
    );
    const equippedRaidSources = equippedItems
      .map((item) =>
        String(item?.dungeonSetId || item?.dungeon || "")
          .trim()
          .toLowerCase(),
      )
      .filter((sourceId) =>
        [
          "molten_core",
          "zul_gurub",
          "ahn_qiraj_ruins",
          "onyxias_lair",
          "blackwing_lair",
          "ahn_qiraj_temple",
          "naxxramas",
        ].includes(sourceId),
      );

    expect(result.roster).toHaveLength(50);
    expect(core.every((member) => member.level === 60)).toBe(true);
    expect(core.filter((member) => member.role === "Tank")).toHaveLength(4);
    expect(core.filter((member) => member.role === "Healer")).toHaveLength(8);
    expect(core.filter((member) => member.role === "DPS")).toHaveLength(28);
    expect(
      core.every(
        (member) =>
          member.keys.includes("molten_core_attunement") &&
          member.keys.includes("blackwing_lair_attunement"),
      ),
    ).toBe(true);
    expect(equippedRaidSources.length).toBeGreaterThan(0);
    expect(
      equippedRaidSources.every((sourceId) =>
        ["molten_core", "zul_gurub", "ahn_qiraj_ruins"].includes(sourceId),
      ),
    ).toBe(true);
    expect(result.guildProgress.milestones.dungeon).toMatchObject({
      moltenCoreCleared: true,
      zulGurubCleared: true,
      ahnQirajRuinsCleared: true,
      blackwingLairCleared: false,
    });
    expect(result.guildProgress.talents).toMatchObject({
      rosterCap: 2,
      expBoost: 3,
      raidAttunement: 1,
      goldCap: 2,
      goldGain: 1,
    });
    expect(getGuildDerivedStats(result.guildProgress).maxRoster).toBe(50);
  });

  it("creates a month-one realm with every leveling band but no level 60s", () => {
    const realm = buildRealm(1);
    const levels = realm.population.players.map((player: { level: number }) => player.level);

    expect(realm.ageDays).toBe(30);
    expect(realm.lastSimulatedDayIndex).toBe(0);
    expect(Math.min(...levels)).toBe(1);
    expect(Math.max(...levels)).toBe(55);
    expect(levels).not.toContain(60);
    expect(
      realm.npcGuilds.every(
        (guild: { raidProgress: number }) => guild.raidProgress === 0,
      ),
    ).toBe(true);
  });

  it("seeds first raid clears at month three and one or two Naxx clears at month twelve", () => {
    const monthThree = buildRealm(3);
    const earlyRaidGuilds = monthThree.npcGuilds.filter(
      (guild: {
        raidProgressByRaid: Record<string, { completed: boolean }>;
      }) =>
        guild.raidProgressByRaid.zul_gurub.completed ||
        guild.raidProgressByRaid.ahn_qiraj_ruins.completed ||
        guild.raidProgressByRaid.onyxias_lair.completed,
    );
    expect(earlyRaidGuilds.length).toBeGreaterThanOrEqual(1);
    expect(earlyRaidGuilds.length).toBeLessThanOrEqual(2);

    const monthTwelve = buildRealm(12);
    const naxxClears = monthTwelve.npcGuilds.filter(
      (guild: {
        raidProgressByRaid: Record<string, { completed: boolean }>;
      }) => guild.raidProgressByRaid.naxxramas.completed,
    );
    expect(naxxClears.length).toBeGreaterThanOrEqual(1);
    expect(naxxClears.length).toBeLessThanOrEqual(2);
    expect(monthTwelve.ageDays).toBe(360);
    expect(monthTwelve.lastSimulatedDayIndex).toBe(0);
  });

  it.each([
    ["few", 16, 20],
    ["medium", 24, 32],
    ["many", 36, 46],
  ])(
    "uses the mature medium-realm target for %s guild density",
    (realmGuildDensity, minGuilds, maxGuilds) => {
      const realm = ensureRealmState(
        null,
        {
          ...DEFAULT_GUILD_SETUP,
          server: "Lordaeron",
          serverStyle: "PvE",
          serverPopulation: "Medium",
          realmAgeMonths: 8,
        },
        0,
        5,
        { realmGuildDensity },
      );
      const players = realm.population.players;
      const guildlessPercent = Math.round(
        (players.filter((player: { guildId: string | null }) => !player.guildId)
          .length /
          players.length) *
          100,
      );

      expect(realm.npcGuilds.length).toBeGreaterThanOrEqual(minGuilds);
      expect(realm.npcGuilds.length).toBeLessThanOrEqual(maxGuilds);
      expect(guildlessPercent).toBeGreaterThanOrEqual(20);
      expect(guildlessPercent).toBeLessThanOrEqual(30);
    },
  );

  it("uses deterministic mature realm and player guild snapshots", () => {
    expect(buildRealm(8)).toEqual(buildRealm(8));
    const input = {
      founder,
      faction: "Alliance",
      guildName: "Maturity Test",
      realmName: "Everlook",
      realmAgeMonths: 8,
      startingGuildProgress: "raid20_ready",
    };
    expect(buildStartingGuild(input)).toEqual(buildStartingGuild(input));
  });
});
