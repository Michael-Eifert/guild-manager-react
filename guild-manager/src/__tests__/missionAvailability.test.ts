import { describe, expect, it } from "vitest";

import { GUILD_FACTION } from "../constants";
import { CONTENT_PHASE } from "../content/contentRules";
import { getMissionListForContent } from "../missions/missionCatalog";
import { isMissionAccessibleForGuild } from "../missions/missionAvailability";

describe("mission faction availability", () => {
  it("keeps Hogger Alliance-only and provides the Horde Eversong variant", () => {
    const missions = getMissionListForContent(null, CONTENT_PHASE.TBC_PREPATCH);
    const hogger = missions.find((mission) => mission.id === 4);
    const hordeVariant = missions.find(
      (mission) => mission.id === "horde:legacy:4",
    );

    expect(hogger).toMatchObject({
      requiredFaction: GUILD_FACTION.ALLIANCE,
      zoneId: "elwynn_forest",
    });
    expect(hordeVariant).toMatchObject({
      requiredFaction: GUILD_FACTION.HORDE,
      zoneId: "eversong_woods",
    });
    expect(isMissionAccessibleForGuild(hogger, GUILD_FACTION.ALLIANCE, CONTENT_PHASE.TBC_PREPATCH)).toBe(true);
    expect(isMissionAccessibleForGuild(hogger, GUILD_FACTION.HORDE, CONTENT_PHASE.TBC_PREPATCH)).toBe(false);
    expect(isMissionAccessibleForGuild(hordeVariant, GUILD_FACTION.HORDE, CONTENT_PHASE.TBC_PREPATCH)).toBe(true);
    expect(isMissionAccessibleForGuild(hordeVariant, GUILD_FACTION.ALLIANCE, CONTENT_PHASE.TBC_PREPATCH)).toBe(false);
  });

  it("repairs legacy saved mission lists without changing the old mission id", () => {
    const missions = getMissionListForContent(
      [{ id: 4, name: "Elite: Defeat Hogger", type: "quest", elite: true }],
      CONTENT_PHASE.TBC_PREPATCH,
    );
    const restoredHogger = missions.find((mission) => mission.id === 4);

    expect(restoredHogger).toMatchObject({
      id: 4,
      requiredFaction: GUILD_FACTION.ALLIANCE,
      zoneId: "elwynn_forest",
    });
    expect(missions.some((mission) => mission.id === "horde:legacy:4")).toBe(true);
  });
});
