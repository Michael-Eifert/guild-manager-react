import { describe, expect, it } from "vitest";

import { DEFAULT_GUILD_SETUP, GUILD_FACTION } from "../constants";
import {
  CONTENT_PHASE,
  CONTENT_ROUTE,
  getFactionRacesForContent,
  getRaceClassesForContent,
} from "../content/contentRules";
import { getFounderOptionsForFaction } from "../guildRelations/founderCreation";
import { normalizeGuildSetup } from "../guild/guildSetup";
import { ensureRealmState } from "../server/realmGeneration";
import { activateTbcPrepatchPopulation } from "../server/realmPopulation";
import {
  getStarterZoneIdForRace,
  getZoneById,
  getZonesForFaction,
} from "../zones/zoneDefinitions";
import { normalizeCharacterZoneState } from "../zones/zoneLogic";

describe("TBC pre-patch content route", () => {
  it("keeps Classic unchanged and unlocks the faction-specific races and classes", () => {
    expect(
      getFactionRacesForContent(GUILD_FACTION.ALLIANCE, CONTENT_PHASE.CLASSIC),
    ).not.toContain("Draenei");
    expect(
      getFactionRacesForContent(
        GUILD_FACTION.ALLIANCE,
        CONTENT_PHASE.TBC_PREPATCH,
      ),
    ).toContain("Draenei");
    expect(
      getFactionRacesForContent(
        GUILD_FACTION.HORDE,
        CONTENT_PHASE.TBC_PREPATCH,
      ),
    ).toContain("Blood Elf");
    expect(
      getRaceClassesForContent("Draenei", CONTENT_PHASE.TBC_PREPATCH),
    ).toEqual(
      expect.arrayContaining(["Paladin", "Shaman"]),
    );
    expect(
      getRaceClassesForContent("Blood Elf", CONTENT_PHASE.TBC_PREPATCH),
    ).toContain("Paladin");
  });

  it("gates the four new 1-20 regions behind the pre-patch", () => {
    expect(getZoneById("azuremyst_isle")).toBeNull();
    expect(
      getZoneById("azuremyst_isle", 1, CONTENT_PHASE.TBC_PREPATCH)?.name,
    ).toBe("Azuremyst Isle");
    expect(
      getStarterZoneIdForRace("Draenei", CONTENT_PHASE.TBC_PREPATCH),
    ).toBe("azuremyst_isle");
    expect(
      getStarterZoneIdForRace("Blood Elf", CONTENT_PHASE.TBC_PREPATCH),
    ).toBe("eversong_woods");
    expect(
      getZonesForFaction(
        GUILD_FACTION.HORDE,
        true,
        CONTENT_PHASE.TBC_PREPATCH,
      ).map((zone) => zone.id),
    ).toEqual(expect.arrayContaining(["eversong_woods", "ghostlands"]));
  });

  it("keeps new-race characters on native routes without trapping mature heroes", () => {
    const youngDraenei = normalizeCharacterZoneState(
      { id: "young-draenei", race: "Draenei", level: 1 },
      GUILD_FACTION.ALLIANCE,
      CONTENT_PHASE.TBC_PREPATCH,
    );
    expect(youngDraenei.currentZoneId).toBe("azuremyst_isle");
    expect(
      normalizeCharacterZoneState(
        youngDraenei,
        GUILD_FACTION.ALLIANCE,
        CONTENT_PHASE.TBC_PREPATCH,
      ).currentZoneId,
    ).toBe("azuremyst_isle");

    const matureDraenei = normalizeCharacterZoneState(
      { id: "mature-draenei", race: "Draenei", level: 50 },
      GUILD_FACTION.ALLIANCE,
      CONTENT_PHASE.TBC_PREPATCH,
    );
    expect(["azuremyst_isle", "bloodmyst_isle"]).not.toContain(
      matureDraenei.currentZoneId,
    );
  });

  it("normalizes the route and founder options together", () => {
    const setup = normalizeGuildSetup({
      ...DEFAULT_GUILD_SETUP,
      contentRoute: CONTENT_ROUTE.BURNING_CRUSADE,
      faction: GUILD_FACTION.ALLIANCE,
      founder: {
        ...DEFAULT_GUILD_SETUP.founder,
        race: "Draenei",
        charClass: "Shaman",
      },
    });
    expect(setup).toMatchObject({
      contentRoute: CONTENT_ROUTE.BURNING_CRUSADE,
      contentPhase: CONTENT_PHASE.TBC_PREPATCH,
      founder: { race: "Draenei", charClass: "Shaman" },
    });
    expect(
      getFounderOptionsForFaction(
        GUILD_FACTION.ALLIANCE,
        CONTENT_PHASE.TBC_PREPATCH,
      ).find((entry) => entry.race === "Draenei")?.classes,
    ).toContain("Shaman");
  });

  it("adds one deterministic newcomer wave and cannot duplicate it", () => {
    const realmState = ensureRealmState(
      null,
      { ...DEFAULT_GUILD_SETUP, server: "Prepatch Test" },
      30,
      5,
    );
    const first = activateTbcPrepatchPopulation({
      realmState,
      currentDayIndex: 30,
      playerRosterSize: 5,
    });
    expect(first.applied).toBe(true);
    expect(first.newcomers.length).toBeGreaterThanOrEqual(12);
    expect(new Set(first.newcomers.map((player) => player.race))).toEqual(
      new Set(["Draenei", "Blood Elf"]),
    );
    expect(first.newcomers.every((player) => player.guildId === null)).toBe(true);
    expect(first.realmState.contentTransitions.tbc_prepatch.dayIndex).toBe(30);

    const repeated = activateTbcPrepatchPopulation({
      realmState: first.realmState,
      currentDayIndex: 30,
      playerRosterSize: 5,
    });
    expect(repeated.applied).toBe(false);
    expect(repeated.newcomers).toEqual([]);
    expect(repeated.realmState.population.players).toHaveLength(
      first.realmState.population.players.length,
    );
  });
});
