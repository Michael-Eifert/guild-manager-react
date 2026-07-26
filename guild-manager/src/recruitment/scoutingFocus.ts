export const RECRUITMENT_SCOUT_FOCUS = Object.freeze({
  RANDOM: "random",
  TANK: "tank",
  HEALER: "healer",
  DPS: "dps",
  GROUP_COMPOSITION: "group-composition",
});

export type RecruitmentScoutFocus =
  (typeof RECRUITMENT_SCOUT_FOCUS)[keyof typeof RECRUITMENT_SCOUT_FOCUS];

export const DEFAULT_RECRUITMENT_SCOUT_FOCUS =
  RECRUITMENT_SCOUT_FOCUS.RANDOM;

export const RECRUITMENT_SCOUT_FOCUS_OPTIONS = Object.freeze([
  {
    value: RECRUITMENT_SCOUT_FOCUS.RANDOM,
    label: "Random",
    title: "Scout a random mix without enforcing any role.",
  },
  {
    value: RECRUITMENT_SCOUT_FOCUS.TANK,
    label: "Tanks",
    title: "Scout tank-capable Warriors, Druids, and Paladins.",
  },
  {
    value: RECRUITMENT_SCOUT_FOCUS.HEALER,
    label: "Healers",
    title: "Scout characters whose class can specialize as a healer.",
  },
  {
    value: RECRUITMENT_SCOUT_FOCUS.DPS,
    label: "Damage",
    title: "Scout characters specialized as damage dealers.",
  },
  {
    value: RECRUITMENT_SCOUT_FOCUS.GROUP_COMPOSITION,
    label: "Group Composition",
    title: "Prioritize one tank, one healer, and damage dealers.",
  },
]);

const VALID_SCOUT_FOCUSES = new Set<string>(
  RECRUITMENT_SCOUT_FOCUS_OPTIONS.map((option) => option.value),
);

export const normalizeRecruitmentScoutFocus = (
  focus: unknown,
): RecruitmentScoutFocus =>
  typeof focus === "string" && VALID_SCOUT_FOCUSES.has(focus)
    ? (focus as RecruitmentScoutFocus)
    : DEFAULT_RECRUITMENT_SCOUT_FOCUS;
