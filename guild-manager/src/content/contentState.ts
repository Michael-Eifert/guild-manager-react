import {
  CONTENT_ROUTE,
  getContentPhaseForRoute,
  normalizeContentPhase,
  normalizeContentRoute,
  type ContentPhase,
  type ContentRoute,
} from "./contentRules";

export const CONTENT_SCHEMA_VERSION = 1;

export type ContentState = {
  route: ContentRoute;
  phase: ContentPhase;
  activatedAtDayIndex: number;
  schemaVersion: number;
};

export const normalizeContentState = (
  value: unknown,
  legacySetup: Record<string, unknown> = {},
): ContentState => {
  const safe = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
  const route = normalizeContentRoute(safe.route ?? legacySetup.contentRoute);
  return {
    route,
    phase: normalizeContentPhase(
      safe.phase ?? legacySetup.contentPhase,
      route,
    ),
    activatedAtDayIndex: Math.max(
      0,
      Math.floor(
        Number(
          safe.activatedAtDayIndex ?? legacySetup.contentPhaseStartedDayIndex,
        ) || 0,
      ),
    ),
    schemaVersion: Math.max(
      CONTENT_SCHEMA_VERSION,
      Math.floor(Number(safe.schemaVersion) || CONTENT_SCHEMA_VERSION),
    ),
  };
};

export const transitionContentRoute = (
  current: ContentState,
  target: ContentRoute,
  dayIndex: number,
): { state: ContentState; applied: boolean; reason?: "locked" | "invalid" } => {
  const normalizedCurrent = normalizeContentState(current);
  const normalizedTarget = normalizeContentRoute(target);
  if (normalizedTarget === CONTENT_ROUTE.UNCOMMITTED) {
    return { state: normalizedCurrent, applied: false, reason: "invalid" };
  }
  if (
    normalizedCurrent.route !== CONTENT_ROUTE.UNCOMMITTED &&
    normalizedCurrent.route !== normalizedTarget
  ) {
    return { state: normalizedCurrent, applied: false, reason: "locked" };
  }
  if (normalizedCurrent.route === normalizedTarget) {
    return { state: normalizedCurrent, applied: false };
  }
  return {
    state: {
      route: normalizedTarget,
      phase: getContentPhaseForRoute(normalizedTarget),
      activatedAtDayIndex: Math.max(0, Math.floor(Number(dayIndex) || 0)),
      schemaVersion: CONTENT_SCHEMA_VERSION,
    },
    applied: true,
  };
};
