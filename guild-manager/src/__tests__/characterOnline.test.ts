import { describe, expect, it } from "vitest";

import {
  buildOnlineSnapshot,
  getCharacterOnlineProfile,
  getCharacterOnlineSchedule,
  getCharacterOnlineStatus,
  shouldUseAutoFastForward,
} from "../activity/characterOnline";

const member = (id: string, trait?: string, activityLevel?: number) => ({
  id,
  personalityTraits: trait ? [trait] : [],
  activityLevel,
});

describe("character online schedules", () => {
  it("maps habits to exact quarter-day profiles and never 24 hours", () => {
    expect(getCharacterOnlineProfile(member("casual", "casual_gamer"))).toBe(
      "quarter",
    );
    expect(getCharacterOnlineProfile(member("normal"))).toBe("half");
    expect(getCharacterOnlineProfile(member("dungeon", "dungeon_expert"))).toBe(
      "half",
    );
    expect(getCharacterOnlineProfile(member("raider", "raider"))).toBe(
      "three_quarters",
    );
    expect(getCharacterOnlineProfile(member("power", "power_leveler"))).toBe(
      "three_quarters",
    );
    const schedules = [
        member("casual", "casual_gamer"),
        member("normal"),
        member("raider", "raider"),
      ].map(
        (character) =>
          getCharacterOnlineSchedule({ character, dayIndex: 8 }),
      );
    expect(schedules.map((schedule) => schedule.durationHours)).toEqual([
      6, 12, 18,
    ]);
    expect(schedules.map((schedule) => schedule.profileLabel)).toEqual([
      "Casual (1/4)",
      "Regular (2/4)",
      "Hardcore (3/4)",
    ]);
  });

  it("keeps daily schedules deterministic with at most one hour of jitter", () => {
    const character = member("stable-player");
    const first = getCharacterOnlineSchedule({ character, dayIndex: 4 });
    const repeated = getCharacterOnlineSchedule({ character, dayIndex: 4 });
    const next = getCharacterOnlineSchedule({ character, dayIndex: 5 });
    expect(repeated).toEqual(first);
    const circularDifference = Math.min(
      Math.abs(next.startHour - first.startHour),
      24 - Math.abs(next.startHour - first.startHour),
    );
    expect(circularDifference).toBeLessThanOrEqual(2);
  });

  it("extends a logged-out member through a mission and drops them afterwards", () => {
    const character = member("locked", "casual_gamer");
    const schedule = getCharacterOnlineSchedule({ character, dayIndex: 2 });
    const outsideHour = (schedule.startHour + schedule.durationHours + 1) % 24;
    const locked = getCharacterOnlineStatus({
      character,
      dayIndex: 2,
      dayProgress: outsideHour / 24,
      extensionReason: "mission",
      onMission: true,
    });
    const released = getCharacterOnlineStatus({
      character,
      dayIndex: 2,
      dayProgress: outsideHour / 24,
    });
    expect(locked).toMatchObject({
      scheduledOnline: false,
      effectiveOnline: true,
      status: "On Mission",
    });
    expect(released).toMatchObject({
      effectiveOnline: false,
      status: "Offline",
    });
  });

  it("locks mission, battlefield, LFG and imminent calendar participants", () => {
    const characters = [
      member("mission", "casual_gamer"),
      member("pvp", "casual_gamer"),
      member("lfg", "casual_gamer"),
      member("calendar", "casual_gamer"),
    ];
    const snapshot = buildOnlineSnapshot({
      characters,
      dayIndex: 3,
      dayProgress: 0.5,
      activeMissions: [{ memberIds: ["mission"] }],
      activeBattles: [{ participantIds: ["pvp"] }],
      searches: [
        {
          phase: "general",
          participants: [{ id: "lfg", source: "guild" }],
        },
      ],
      calendarEvents: [
        {
          scheduledDayIndex: 3,
          scheduledTimeOfDay: "midday",
          status: "ready",
          rosterLocked: true,
          approvedRosterIds: ["calendar"],
        },
      ],
    });
    expect(snapshot.onlineIds).toEqual(
      new Set(["mission", "pvp", "lfg", "calendar"]),
    );
    expect(snapshot.onMissionIds).toEqual(new Set(["mission", "pvp"]));
  });

  it("uses auto x8 only for a non-empty inactive offline guild", () => {
    const base = {
      isPaused: false,
      memberCount: 3,
      onlineCount: 0,
      hasActiveMission: false,
      hasActiveBattlefield: false,
      hasActiveLfg: false,
      hasElection: false,
    };
    expect(shouldUseAutoFastForward(base)).toBe(true);
    expect(shouldUseAutoFastForward({ ...base, isPaused: true })).toBe(false);
    expect(shouldUseAutoFastForward({ ...base, memberCount: 0 })).toBe(false);
    expect(
      shouldUseAutoFastForward({ ...base, hasActiveMission: true }),
    ).toBe(false);
  });

  it("keeps the whole population effectively online when offline simulation is disabled", () => {
    const characters = [
      member("idle", "casual_gamer"),
      member("mission", "casual_gamer"),
    ];
    const snapshot = buildOnlineSnapshot({
      characters,
      dayIndex: 4,
      dayProgress: 0.99,
      activeMissions: [{ memberIds: ["mission"] }],
      offlineSimulationEnabled: false,
    });

    expect(snapshot.onlineIds).toEqual(new Set(["idle", "mission"]));
    expect(snapshot.onlineCount).toBe(2);
    expect(snapshot.nextLogin).toBeNull();
    expect(snapshot.byId.idle.status).toBe("Online");
    expect(snapshot.byId.mission.status).toBe("On Mission");
    expect(
      shouldUseAutoFastForward({
        isPaused: false,
        memberCount: 2,
        onlineCount: snapshot.onlineCount,
        hasActiveMission: false,
        hasActiveBattlefield: false,
        hasActiveLfg: false,
        hasElection: false,
      }),
    ).toBe(false);
  });
});
