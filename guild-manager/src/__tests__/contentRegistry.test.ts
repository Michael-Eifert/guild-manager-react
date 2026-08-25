import { describe, expect, it } from "vitest";

import {
  CONTENT_PHASE,
  CONTENT_ROUTE,
  getContentPhaseForRoute,
} from "../content/contentRules";
import {
  CONTENT_PACKS,
  getContentPackForRoute,
  loadContentPackCatalog,
  validateContentRegistry,
} from "../content/contentRegistry";
import {
  normalizeContentState,
  transitionContentRoute,
} from "../content/contentState";

describe("content registry", () => {
  it("defines valid Classic, TBC, and Classic+ packs", () => {
    expect(validateContentRegistry()).toBe(true);
    expect(Object.keys(CONTENT_PACKS)).toEqual([
      "classic",
      "burning_crusade",
      "classic_plus",
    ]);
    expect(getContentPackForRoute(CONTENT_ROUTE.CLASSIC_PLUS)).toMatchObject({
      basePackId: "classic",
      capabilities: { supportsClassicPlus: true },
    });
    expect(getContentPhaseForRoute(CONTENT_ROUTE.BURNING_CRUSADE)).toBe(
      CONTENT_PHASE.TBC_PREPATCH,
    );
  });

  it("locks a save to its first post-Classic route", () => {
    const classic = normalizeContentState(null);
    const tbc = transitionContentRoute(
      classic,
      CONTENT_ROUTE.BURNING_CRUSADE,
      42,
    );
    expect(tbc).toMatchObject({
      applied: true,
      state: {
        route: CONTENT_ROUTE.BURNING_CRUSADE,
        phase: CONTENT_PHASE.TBC_PREPATCH,
        activatedAtDayIndex: 42,
      },
    });
    expect(
      transitionContentRoute(tbc.state, CONTENT_ROUTE.CLASSIC_PLUS, 43),
    ).toMatchObject({ applied: false, reason: "locked" });
  });

  it("loads and validates route catalogs outside the initial bundle", async () => {
    const fetcher = async () => new Response(JSON.stringify({
      schemaVersion: 1,
      races: [],
      classes: [],
      zones: ["outland"],
      dungeons: [],
      raids: [],
      battlegrounds: [],
      items: [],
      recipes: [],
    }));
    await expect(
      loadContentPackCatalog(
        CONTENT_ROUTE.BURNING_CRUSADE,
        fetcher as typeof fetch,
      ),
    ).resolves.toMatchObject({ zones: ["outland"] });
  });
});
