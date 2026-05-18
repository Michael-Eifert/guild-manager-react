import { describe, expect, it } from "vitest";

import { GUILD_FACTION } from "../constants";
import { ZONE_DEFINITIONS, getZoneEliteQuestTemplates } from "../zones/zoneDefinitions";
import { getZoneMapLayout, getZoneRegionalMap } from "../zones/zoneMapLayout";
import {
  AUTO_ZONE_ELITE_MIN_SUCCESS_CHANCE,
  hasCompletedZoneEliteQuest,
  resolveAutoZoneEliteGroups,
} from "../automation/zoneEliteAutomation";
import {
  WORLD_MAP_FILTERS,
  buildWorldMapZoneSummaries,
  filterWorldMapZoneSummaries,
} from "../zones/zoneMapSummary";

const zoneMission = (zoneId) => ({
  id: `zone:${zoneId}`,
  type: "zone",
  zoneId,
  name: zoneId,
});

describe("world map zone summaries", () => {
  it("counts heroes currently assigned to each zone", () => {
    const summaries = buildWorldMapZoneSummaries({
      roster: [
        { id: "a", name: "Aela", currentZoneId: "westfall", currentZoneProgress: 20 },
        { id: "b", name: "Borin", currentZoneId: "westfall", currentZoneProgress: 40 },
        { id: "c", name: "Cora", currentZoneId: "darkshore", currentZoneProgress: 15 },
      ],
      missionList: [zoneMission("westfall"), zoneMission("darkshore")],
      guildFaction: GUILD_FACTION.ALLIANCE,
    });

    const westfall = summaries.find((summary) => summary.zone.id === "westfall");
    const darkshore = summaries.find((summary) => summary.zone.id === "darkshore");

    expect(westfall.heroCount).toBe(2);
    expect(darkshore.heroCount).toBe(1);
  });

  it("computes active average and guild best progress", () => {
    const summaries = buildWorldMapZoneSummaries({
      roster: [
        { id: "a", name: "Aela", currentZoneId: "westfall", currentZoneProgress: 20 },
        { id: "b", name: "Borin", currentZoneId: "westfall", currentZoneProgress: 40 },
        {
          id: "c",
          name: "Cora",
          zoneProgressById: { westfall: 75 },
        },
      ],
      missionList: [zoneMission("westfall")],
      guildFaction: GUILD_FACTION.ALLIANCE,
    });

    const westfall = summaries.find((summary) => summary.zone.id === "westfall");

    expect(westfall.activeAverageProgress).toBe(30);
    expect(westfall.guildBestProgress).toBe(75);
  });

  it("filters zones by active, cleared, and accessible state", () => {
    const summaries = buildWorldMapZoneSummaries({
      roster: [
        {
          id: "a",
          name: "Aela",
          currentZoneId: "westfall",
          currentZoneProgress: 20,
          zonesCleared: ["darkshore"],
        },
      ],
      missionList: [zoneMission("westfall"), zoneMission("darkshore")],
      guildFaction: GUILD_FACTION.ALLIANCE,
    });

    const active = filterWorldMapZoneSummaries(summaries, WORLD_MAP_FILTERS.ACTIVE);
    const cleared = filterWorldMapZoneSummaries(summaries, WORLD_MAP_FILTERS.CLEARED);
    const available = filterWorldMapZoneSummaries(
      summaries,
      WORLD_MAP_FILTERS.AVAILABLE,
    );

    expect(active.some((summary) => summary.zone.id === "westfall")).toBe(true);
    expect(cleared.some((summary) => summary.zone.id === "darkshore")).toBe(true);
    expect(available.length).toBeGreaterThan(0);
    expect(available.every((summary) => summary.accessible)).toBe(true);
    expect(available.some((summary) => summary.zone.id === "durotar")).toBe(false);
  });

  it("includes generated elite quest options", () => {
    const summaries = buildWorldMapZoneSummaries({
      roster: [],
      missionList: [zoneMission("teldrassil")],
      guildFaction: GUILD_FACTION.ALLIANCE,
    });

    const teldrassil = summaries.find(
      (summary) => summary.zone.id === "teldrassil",
    );

    expect(teldrassil.eliteQuests.length).toBeGreaterThan(0);
    expect(teldrassil.eliteQuests[0].isZoneElite).toBe(true);
  });

  it("uses 3-5 party sizes for generated elites", () => {
    const summaries = buildWorldMapZoneSummaries({
      roster: [],
      missionList: [zoneMission("teldrassil")],
      guildFaction: GUILD_FACTION.ALLIANCE,
    });

    const teldrassil = summaries.find(
      (summary) => summary.zone.id === "teldrassil",
    );

    expect(teldrassil.eliteQuests[0].requiredPartySize).toBe(5);
    expect(teldrassil.eliteQuests[0].minPartySize).toBe(3);
  });

  it("marks active zone elite objectives", () => {
    const [eliteQuest] = getZoneEliteQuestTemplates("westfall");
    const summaries = buildWorldMapZoneSummaries({
      roster: [
        {
          id: "a",
          name: "Aela",
          currentZoneId: "westfall",
          currentZoneProgress: 42,
        },
      ],
      missionList: [zoneMission("westfall")],
      activeMissions: [
        {
          ...eliteQuest,
          questId: eliteQuest.id,
          memberIds: ["a", "b"],
        },
      ],
      guildFaction: GUILD_FACTION.ALLIANCE,
    });

    const westfall = summaries.find((summary) => summary.zone.id === "westfall");

    expect(westfall.activeEliteCount).toBe(1);
    expect(westfall.eliteQuests[0].isActive).toBe(true);
    expect(westfall.heroesInZone[0].isGroupQuesting).toBe(true);
    expect(westfall.heroesInZone[0].activeZoneEliteName).toBe(eliteQuest.name);
  });

  it("has map coordinates for every defined zone", () => {
    ZONE_DEFINITIONS.forEach((zone) => {
      const layout = getZoneMapLayout(zone.id);

      expect(layout.x).toBeGreaterThanOrEqual(0);
      expect(layout.x).toBeLessThanOrEqual(100);
      expect(layout.y).toBeGreaterThanOrEqual(0);
      expect(layout.y).toBeLessThanOrEqual(100);
    });
  });

  it("has regional map metadata for every defined zone", () => {
    ZONE_DEFINITIONS.forEach((zone) => {
      const regionalMap = getZoneRegionalMap(zone);

      expect(regionalMap.mapId).toBeGreaterThan(0);
      expect(regionalMap.src).toContain(
        "wow.zamimg.com/images/wow/classic/maps/enus/original",
      );
      expect(regionalMap.sourceUrl).toContain("wowhead.com/classic/zone=");
    });
  });

  it("uses Wowhead Classic map metadata for Tanaris", () => {
    const tanaris = ZONE_DEFINITIONS.find((zone) => zone.id === "tanaris");
    const regionalMap = getZoneRegionalMap(tanaris);

    expect(regionalMap.mapId).toBe(440);
    expect(regionalMap.src).toBe(
      "https://wow.zamimg.com/images/wow/classic/maps/enus/original/440.jpg",
    );
    expect(regionalMap.sourceUrl).toBe(
      "https://www.wowhead.com/classic/zone=440/tanaris",
    );
  });
});

describe("zone elite automation", () => {
  it("forms an elite group from idle heroes in the same zone who still need it", () => {
    const [eliteQuest] = getZoneEliteQuestTemplates("westfall");
    const groups = resolveAutoZoneEliteGroups({
      roster: [
        {
          id: "tank",
          name: "Tank",
          role: "Tank",
          level: eliteQuest.minLevel,
          currentZoneId: "westfall",
          clearedMissionIds: [],
        },
        {
          id: "healer",
          name: "Healer",
          role: "Healer",
          level: eliteQuest.minLevel,
          currentZoneId: "westfall",
          clearedMissionIds: [],
        },
        {
          id: "dps",
          name: "DPS",
          role: "DPS",
          level: eliteQuest.minLevel,
          currentZoneId: "westfall",
          clearedMissionIds: [],
        },
      ],
      activeMissions: [],
      getSuccessPreview: () => ({
        successChance: AUTO_ZONE_ELITE_MIN_SUCCESS_CHANCE,
      }),
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].mission.id).toBe(eliteQuest.id);
    expect(groups[0].memberIds).toEqual(
      expect.arrayContaining(["tank", "healer", "dps"]),
    );
    expect(groups[0].starterMemberIds.length).toBeGreaterThan(0);
  });

  it("does not form an elite group below the configured success rate", () => {
    const [eliteQuest] = getZoneEliteQuestTemplates("westfall");
    const roster = [
      {
        id: "tank",
        name: "Tank",
        role: "Tank",
        level: eliteQuest.minLevel,
        currentZoneId: "westfall",
        clearedMissionIds: [],
      },
      {
        id: "healer",
        name: "Healer",
        role: "Healer",
        level: eliteQuest.minLevel,
        currentZoneId: "westfall",
        clearedMissionIds: [],
      },
      {
        id: "dps",
        name: "DPS",
        role: "DPS",
        level: eliteQuest.minLevel,
        currentZoneId: "westfall",
        clearedMissionIds: [],
      },
    ];

    const blocked = resolveAutoZoneEliteGroups({
      roster,
      activeMissions: [],
      getSuccessPreview: () => ({
        successChance: AUTO_ZONE_ELITE_MIN_SUCCESS_CHANCE - 1,
      }),
    });
    const formed = resolveAutoZoneEliteGroups({
      roster,
      activeMissions: [],
      getSuccessPreview: () => ({
        successChance: AUTO_ZONE_ELITE_MIN_SUCCESS_CHANCE,
      }),
    });

    expect(blocked).toEqual([]);
    expect(formed).toHaveLength(1);
    expect(formed[0].successChance).toBe(AUTO_ZONE_ELITE_MIN_SUCCESS_CHANCE);
  });

  it("lets a cleared hero support when another hero still needs the elite", () => {
    const [eliteQuest] = getZoneEliteQuestTemplates("westfall");
    const supportHero = {
      id: "support",
      name: "Support",
      role: "Tank",
      level: eliteQuest.minLevel,
      currentZoneId: "westfall",
      clearedMissionIds: [eliteQuest.id],
    };
    const groups = resolveAutoZoneEliteGroups({
      roster: [
        {
          id: "starter",
          name: "Starter",
          role: "DPS",
          level: eliteQuest.minLevel,
          currentZoneId: "westfall",
          clearedMissionIds: [],
        },
        {
          id: "healer",
          name: "Healer",
          role: "Healer",
          level: eliteQuest.minLevel,
          currentZoneId: "westfall",
          clearedMissionIds: [eliteQuest.id],
        },
        supportHero,
      ],
      activeMissions: [],
      getSuccessPreview: () => ({
        successChance: AUTO_ZONE_ELITE_MIN_SUCCESS_CHANCE,
      }),
    });

    expect(groups).toHaveLength(1);
    expect(hasCompletedZoneEliteQuest(supportHero, eliteQuest)).toBe(true);
    expect(groups[0].starterMemberIds).toEqual(["starter"]);
    expect(groups[0].supporterMemberIds).toEqual(
      expect.arrayContaining(["support", "healer"]),
    );
  });

  it("does not start an elite when all available heroes already cleared it", () => {
    const [eliteQuest] = getZoneEliteQuestTemplates("westfall");
    const groups = resolveAutoZoneEliteGroups({
      roster: [
        {
          id: "healer",
          level: eliteQuest.minLevel,
          currentZoneId: "westfall",
          clearedMissionIds: [eliteQuest.id],
        },
        {
          id: "dps",
          level: eliteQuest.minLevel,
          currentZoneId: "westfall",
          clearedMissionIds: [eliteQuest.id],
        },
        {
          id: "tank",
          level: eliteQuest.minLevel,
          currentZoneId: "westfall",
          clearedMissionIds: [eliteQuest.id],
        },
      ],
      activeMissions: [],
    });

    expect(groups).toEqual([]);
  });

  it("does not duplicate a zone elite that is already active", () => {
    const [eliteQuest] = getZoneEliteQuestTemplates("westfall");
    const groups = resolveAutoZoneEliteGroups({
      roster: [
        {
          id: "c",
          level: eliteQuest.minLevel,
          currentZoneId: "westfall",
          clearedMissionIds: [],
        },
      ],
      activeMissions: [{ isZoneElite: true, questId: eliteQuest.id, memberIds: [] }],
    });

    expect(groups).toEqual([]);
  });

  it("forms queued attunement groups for zone elite key sources", () => {
    const scholomanceKeyQuest = getZoneEliteQuestTemplates(
      "western_plaguelands",
    ).find((quest) => quest.rewardKeys?.includes("scholomance_key"));
    const roster = [
      ["tank", "Tank"],
      ["healer", "Healer"],
      ["dps-1", "DPS"],
      ["dps-2", "DPS"],
      ["dps-3", "DPS"],
    ].map(([id, role]) => ({
      id,
      role,
      level: 60,
      status: "Idle",
      keys: [],
      clearedMissionIds: [],
      adventureGoalQueue: [
        {
          id: `goal-${id}`,
          type: "attunement",
          keyId: "scholomance_key",
          sourceMissionId: scholomanceKeyQuest.id,
          targetMissionId: "key:scholomance_key",
        },
      ],
    }));

    const groups = resolveAutoZoneEliteGroups({
      roster,
      activeMissions: [],
      missionList: [],
      getSuccessPreview: () => ({
        successChance: AUTO_ZONE_ELITE_MIN_SUCCESS_CHANCE,
      }),
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      mission: scholomanceKeyQuest,
      goalType: "attunement",
      keyId: "scholomance_key",
    });
    expect(groups[0].memberIds).toEqual(
      expect.arrayContaining(["dps-1", "healer", "tank"]),
    );
  });
});
