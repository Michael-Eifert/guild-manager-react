import { describe, expect, it } from "vitest";

import {
  BATTLEFIELD_CHARACTER_STATUS,
  PVP_ACTIVITY_FOCUS,
  WARSONG_GULCH,
} from "../pvp/battlefields/battlefieldDefinitions";
import {
  advanceBattlefieldState,
  resolveAutoBattlefieldQueue,
  startWarsongGulchBattle,
} from "../pvp/battlefields/battlefieldEngine";
import {
  calculateBattlefieldTeamProfile,
  ensureBattlefieldState,
  getBattlegroundBracketForLevel,
  getEligibleBattlegroundCharacters,
  getPvpActivityConfig,
  groupCharactersByBattlegroundBracket,
} from "../pvp/battlefields/battlefieldUtils";
import { GUILD_FACTION } from "../constants";

const makeMember = (id, level = 20, role = "DPS", charClass = "Warrior") => ({
  id: String(id),
  name: `Hero ${id}`,
  level,
  role,
  class: charClass,
  status: "Idle",
  equipment: {},
  pvp: {
    lifetimeHonor: 0,
    weeklyHonor: 0,
    rankProgress: 0,
    rank: 0,
    title: "Unranked",
    highestRank: 0,
    highestTitle: "Unranked",
    honorableKills: 0,
    unlockedPvpGearIds: [],
  },
});

const steadyRng = () => 0.42;

describe("battlefield helpers", () => {
  it("groups characters into Classic WSG brackets", () => {
    expect(getBattlegroundBracketForLevel(9)).toBeNull();
    expect(getBattlegroundBracketForLevel(10)?.id).toBe("10-19");
    expect(getBattlegroundBracketForLevel(29)?.id).toBe("20-29");
    expect(getBattlegroundBracketForLevel(60)?.id).toBe("60");

    const grouped = groupCharactersByBattlegroundBracket([
      makeMember("a", 10),
      makeMember("b", 19),
      makeMember("c", 60),
    ]);
    expect(grouped["10-19"]).toHaveLength(2);
    expect(grouped["60"]).toHaveLength(1);
  });

  it("excludes busy and battleground characters from eligibility", () => {
    const roster = [
      makeMember("idle", 20),
      { ...makeMember("low", 9), level: 9 },
      { ...makeMember("battle", 20), status: BATTLEFIELD_CHARACTER_STATUS },
      makeMember("mission", 20),
    ];
    const eligible = getEligibleBattlegroundCharacters({
      roster,
      activeMissions: [{ memberIds: ["mission"] }],
      battlefieldState: ensureBattlefieldState(null),
    });
    expect(eligible.map((member) => member.id)).toEqual(["idle"]);
  });

  it("counts PUG fill in the team profile", () => {
    const partial = calculateBattlefieldTeamProfile(
      [makeMember("1", 20), makeMember("2", 20)],
      WARSONG_GULCH.teamSize,
    );
    const full = calculateBattlefieldTeamProfile(
      Array.from({ length: 10 }, (_, index) => makeMember(index, 20)),
      WARSONG_GULCH.teamSize,
    );

    expect(partial.pugCount).toBe(8);
    expect(partial.queueType).toBe("PUG-assisted group");
    expect(full.pugCount).toBe(0);
    expect(full.coordination).toBeGreaterThan(partial.coordination);
  });
});

describe("warsong gulch flow", () => {
  it("starts a manual battle and marks participants unavailable", () => {
    const roster = Array.from({ length: 3 }, (_, index) =>
      makeMember(index + 1, 22),
    );
    const started = startWarsongGulchBattle({
      battlefieldState: ensureBattlefieldState(null),
      roster,
      participantIds: roster.map((member) => member.id),
      guildFaction: GUILD_FACTION.ALLIANCE,
      now: 1000,
      currentDayIndex: 1,
      rng: steadyRng,
      createId: () => "battle-1",
    });

    expect(started.started).toBe(true);
    expect(started.battlefieldState.activeBattles).toHaveLength(1);
    expect(started.roster.every((member) => member.status === "Battleground")).toBe(
      true,
    );
  });

  it("rejects mixed-bracket manual queues", () => {
    const roster = [makeMember("a", 19), makeMember("b", 20)];
    const started = startWarsongGulchBattle({
      battlefieldState: ensureBattlefieldState(null),
      roster,
      participantIds: roster.map((member) => member.id),
      guildFaction: GUILD_FACTION.ALLIANCE,
      now: 1000,
      currentDayIndex: 1,
      rng: steadyRng,
    });

    expect(started.started).toBe(false);
    expect(started.reason).toContain("same bracket");
  });

  it("advances to completion, records history, awards honor, and resets status", () => {
    const roster = Array.from({ length: 10 }, (_, index) =>
      makeMember(index + 1, 30, index === 0 ? "Healer" : "DPS"),
    );
    const started = startWarsongGulchBattle({
      battlefieldState: ensureBattlefieldState(null),
      roster,
      participantIds: roster.map((member) => member.id),
      guildFaction: GUILD_FACTION.ALLIANCE,
      now: 0,
      currentDayIndex: 2,
      rng: steadyRng,
      createId: () => "battle-1",
    });
    const advanced = advanceBattlefieldState({
      battlefieldState: started.battlefieldState,
      roster: started.roster,
      now: 60_000,
      guildFaction: GUILD_FACTION.ALLIANCE,
      rng: steadyRng,
    });

    expect(advanced.battlefieldState.activeBattles).toHaveLength(0);
    expect(advanced.battlefieldState.history).toHaveLength(1);
    expect(advanced.battlefieldState.history[0].events.length).toBeGreaterThan(0);
    expect(advanced.roster.every((member) => member.status === "Idle")).toBe(true);
    expect(advanced.roster.every((member) => member.pvp.weeklyHonor > 0)).toBe(
      true,
    );
    expect(advanced.logs.some((log) => log.type === "pvp")).toBe(true);
  });

  it("auto-queue respects focus thresholds and daily caps", () => {
    const roster = Array.from({ length: 10 }, (_, index) => ({
      ...makeMember(index + 1, 40),
      pvp: {
        ...makeMember(index + 1, 40).pvp,
        rank: 8,
        highestRank: 8,
      },
    }));
    const config = getPvpActivityConfig(PVP_ACTIVITY_FOCUS.LOW);
    expect(config.minGuildMembers).toBe(10);

    const queued = resolveAutoBattlefieldQueue({
      battlefieldState: ensureBattlefieldState(null),
      roster,
      activeMissions: [],
      guildSetup: { pvpActivityFocus: PVP_ACTIVITY_FOCUS.LOW },
      now: 120_000,
      currentDayIndex: 3,
      guildFaction: GUILD_FACTION.ALLIANCE,
      rng: () => 0.01,
      createId: () => "auto-battle",
      aggressiveOnly: false,
    });

    expect(queued.queued).toBe(true);
    expect(queued.battlefieldState.automation.queuedToday).toBe(1);

    const capped = resolveAutoBattlefieldQueue({
      battlefieldState: queued.battlefieldState,
      roster: queued.roster,
      activeMissions: [],
      guildSetup: { pvpActivityFocus: PVP_ACTIVITY_FOCUS.LOW },
      now: 240_000,
      currentDayIndex: 3,
      guildFaction: GUILD_FACTION.ALLIANCE,
      rng: () => 0.01,
      createId: () => "auto-battle-2",
      aggressiveOnly: false,
    });
    expect(capped.queued).toBe(false);
  });
});
