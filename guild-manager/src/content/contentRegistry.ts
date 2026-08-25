import { z } from "zod";

import {
  CONTENT_PHASE,
  CONTENT_ROUTE,
  type ContentPhase,
  type ContentRoute,
} from "./contentRules";

export type ContentCapabilities = {
  maxLevel: number;
  professionSkillCap: number;
  supportsOutland: boolean;
  supportsClassicPlus: boolean;
};

export type ContentPackDefinition = {
  id: "classic" | "burning_crusade" | "classic_plus";
  route: ContentRoute;
  basePackId: "classic" | null;
  phases: readonly ContentPhase[];
  capabilities: ContentCapabilities;
  catalogAssetPath: string | null;
};

const contentCatalogSchema = z.object({
  schemaVersion: z.number().int().positive(),
  races: z.array(z.string()),
  classes: z.array(z.string()),
  zones: z.array(z.string()),
  dungeons: z.array(z.string()),
  raids: z.array(z.string()),
  battlegrounds: z.array(z.string()),
  items: z.array(z.string()),
  recipes: z.array(z.string()),
});

export type ContentPackCatalog = z.infer<typeof contentCatalogSchema>;

export const CONTENT_PACKS = Object.freeze({
  classic: Object.freeze({
    id: "classic",
    route: CONTENT_ROUTE.UNCOMMITTED,
    basePackId: null,
    phases: Object.freeze([CONTENT_PHASE.CLASSIC]),
    capabilities: Object.freeze({
      maxLevel: 60,
      professionSkillCap: 300,
      supportsOutland: false,
      supportsClassicPlus: false,
    }),
    catalogAssetPath: null,
  }),
  burning_crusade: Object.freeze({
    id: "burning_crusade",
    route: CONTENT_ROUTE.BURNING_CRUSADE,
    basePackId: "classic",
    phases: Object.freeze([CONTENT_PHASE.CLASSIC, CONTENT_PHASE.TBC_PREPATCH]),
    capabilities: Object.freeze({
      maxLevel: 60,
      professionSkillCap: 300,
      supportsOutland: false,
      supportsClassicPlus: false,
    }),
    catalogAssetPath: "generated/content-packs/burning-crusade-v1.json",
  }),
  classic_plus: Object.freeze({
    id: "classic_plus",
    route: CONTENT_ROUTE.CLASSIC_PLUS,
    basePackId: "classic",
    phases: Object.freeze([CONTENT_PHASE.CLASSIC, CONTENT_PHASE.CLASSIC_PLUS]),
    capabilities: Object.freeze({
      maxLevel: 60,
      professionSkillCap: 300,
      supportsOutland: false,
      supportsClassicPlus: true,
    }),
    catalogAssetPath: "generated/content-packs/classic-plus-v1.json",
  }),
} satisfies Record<string, ContentPackDefinition>);

const catalogPromises = new Map<string, Promise<ContentPackCatalog>>();
const EMPTY_CATALOG: ContentPackCatalog = Object.freeze({
  schemaVersion: 1,
  races: [],
  classes: [],
  zones: [],
  dungeons: [],
  raids: [],
  battlegrounds: [],
  items: [],
  recipes: [],
});

export const getContentPackForRoute = (
  route: ContentRoute,
): ContentPackDefinition =>
  route === CONTENT_ROUTE.BURNING_CRUSADE
    ? CONTENT_PACKS.burning_crusade
    : route === CONTENT_ROUTE.CLASSIC_PLUS
      ? CONTENT_PACKS.classic_plus
      : CONTENT_PACKS.classic;

export const loadContentPackCatalog = (
  route: ContentRoute,
  fetcher: typeof fetch = fetch,
): Promise<ContentPackCatalog> => {
  const pack = getContentPackForRoute(route);
  if (!pack.catalogAssetPath) return Promise.resolve(EMPTY_CATALOG);
  const existing = catalogPromises.get(pack.id);
  if (existing) return existing;
  const promise = fetcher(`${import.meta.env.BASE_URL}${pack.catalogAssetPath}`, {
    cache: "force-cache",
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Could not load content pack ${pack.id} (${response.status}).`);
    }
    return contentCatalogSchema.parse(await response.json());
  });
  catalogPromises.set(pack.id, promise);
  return promise;
};

export const validateContentRegistry = () => {
  const packs = Object.values(CONTENT_PACKS);
  const ids = new Set(packs.map((pack) => pack.id));
  if (ids.size !== packs.length) throw new Error("Content pack IDs must be unique.");
  packs.forEach((pack) => {
    if (pack.basePackId && !ids.has(pack.basePackId)) {
      throw new Error(`Unknown base content pack ${pack.basePackId}.`);
    }
    if (new Set(pack.phases).size !== pack.phases.length) {
      throw new Error(`Content pack ${pack.id} contains duplicate phases.`);
    }
  });
  return true;
};
