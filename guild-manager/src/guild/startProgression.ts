export const REALM_AGE_MONTHS = Object.freeze({
  MIN: 0,
  MAX: 12,
  DEFAULT: 0,
  DAYS_PER_MONTH: 30,
});

export const STARTING_GUILD_PROGRESS = Object.freeze({
  FRESH: "fresh",
  GROWING: "growing",
  ESTABLISHED: "established",
  ENDGAME_PREP: "endgame_prep",
  RAID20_READY: "raid20_ready",
  RAID40_READY: "raid40_ready",
  BWL_READY: "bwl_ready",
});

export type StartingGuildProgress =
  (typeof STARTING_GUILD_PROGRESS)[keyof typeof STARTING_GUILD_PROGRESS];

export type StartingGuildProgressProfile = {
  id: StartingGuildProgress;
  label: string;
  shortLabel: string;
  description: string;
  requiredRealmAgeMonths: number;
  rosterSize: number;
  founderLevel: number;
  minLevel: number;
  maxLevel: number;
  gold: number;
  dungeonClearCount: number;
};

export const STARTING_GUILD_PROGRESS_PROFILES: readonly StartingGuildProgressProfile[] =
  Object.freeze([
    Object.freeze({
      id: STARTING_GUILD_PROGRESS.FRESH,
      label: "Fresh",
      shortLabel: "Fresh",
      description: "A newly founded guild with five level 1 adventurers.",
      requiredRealmAgeMonths: 0,
      rosterSize: 5,
      founderLevel: 1,
      minLevel: 1,
      maxLevel: 1,
      gold: 10,
      dungeonClearCount: 0,
    }),
    Object.freeze({
      id: STARTING_GUILD_PROGRESS.GROWING,
      label: "Growing Guild",
      shortLabel: "Growing",
      description: "Ten members across levels 10-30 with early professions and gear.",
      requiredRealmAgeMonths: 1,
      rosterSize: 10,
      founderLevel: 30,
      minLevel: 10,
      maxLevel: 30,
      gold: 100,
      dungeonClearCount: 3,
    }),
    Object.freeze({
      id: STARTING_GUILD_PROGRESS.ESTABLISHED,
      label: "Established Guild",
      shortLabel: "Established",
      description: "Fifteen established members across levels 25-50.",
      requiredRealmAgeMonths: 2,
      rosterSize: 15,
      founderLevel: 50,
      minLevel: 25,
      maxLevel: 50,
      gold: 300,
      dungeonClearCount: 10,
    }),
    Object.freeze({
      id: STARTING_GUILD_PROGRESS.ENDGAME_PREP,
      label: "Endgame Preparation",
      shortLabel: "Endgame Prep",
      description: "Twenty members preparing for level 60 endgame dungeons.",
      requiredRealmAgeMonths: 4,
      rosterSize: 20,
      founderLevel: 60,
      minLevel: 45,
      maxLevel: 60,
      gold: 650,
      dungeonClearCount: 18,
    }),
    Object.freeze({
      id: STARTING_GUILD_PROGRESS.RAID20_READY,
      label: "20-Man Raid Ready",
      shortLabel: "20-Man Ready",
      description: "A complete level 60 raid core plus five leveling reserves.",
      requiredRealmAgeMonths: 6,
      rosterSize: 25,
      founderLevel: 60,
      minLevel: 48,
      maxLevel: 60,
      gold: 1000,
      dungeonClearCount: 30,
    }),
    Object.freeze({
      id: STARTING_GUILD_PROGRESS.RAID40_READY,
      label: "40-Man Raid Ready",
      shortLabel: "40-Man Ready",
      description:
        "A complete Molten Core-ready raid team plus five reserves.",
      requiredRealmAgeMonths: 8,
      rosterSize: 45,
      founderLevel: 60,
      minLevel: 52,
      maxLevel: 60,
      gold: 1400,
      dungeonClearCount: 30,
    }),
    Object.freeze({
      id: STARTING_GUILD_PROGRESS.BWL_READY,
      label: "Blackwing Lair Ready",
      shortLabel: "BWL Ready",
      description:
        "A veteran 40-player raid team with MC progression and tier-one gear.",
      requiredRealmAgeMonths: 10,
      rosterSize: 50,
      founderLevel: 60,
      minLevel: 55,
      maxLevel: 60,
      gold: 2200,
      dungeonClearCount: 30,
    }),
  ]);

const PROFILE_BY_ID = new Map(
  STARTING_GUILD_PROGRESS_PROFILES.map((profile) => [profile.id, profile]),
);

export const normalizeRealmAgeMonths = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return REALM_AGE_MONTHS.DEFAULT;
  return Math.max(
    REALM_AGE_MONTHS.MIN,
    Math.min(REALM_AGE_MONTHS.MAX, Math.round(numeric)),
  );
};

export const getRealmAgeStartDayIndex = (value: unknown) =>
  normalizeRealmAgeMonths(value) * REALM_AGE_MONTHS.DAYS_PER_MONTH;

export const getStartingGuildProgressProfile = (
  value: unknown,
): StartingGuildProgressProfile =>
  PROFILE_BY_ID.get(value as StartingGuildProgress) ||
  STARTING_GUILD_PROGRESS_PROFILES[0];

export const getAvailableStartingGuildProgressProfiles = (realmAge: unknown) => {
  const normalizedAge = normalizeRealmAgeMonths(realmAge);
  return STARTING_GUILD_PROGRESS_PROFILES.filter(
    (profile) => profile.requiredRealmAgeMonths <= normalizedAge,
  );
};

export const getMaxStartingGuildProgress = (
  realmAge: unknown,
): StartingGuildProgress =>
  getAvailableStartingGuildProgressProfiles(realmAge).at(-1)?.id ||
  STARTING_GUILD_PROGRESS.FRESH;

export const normalizeStartingGuildProgress = (
  value: unknown,
  realmAge: unknown,
): StartingGuildProgress => {
  const requested = getStartingGuildProgressProfile(value);
  const normalizedAge = normalizeRealmAgeMonths(realmAge);
  if (requested.requiredRealmAgeMonths <= normalizedAge) return requested.id;
  return getMaxStartingGuildProgress(normalizedAge);
};

export const getRealmAgeSummary = (value: unknown) => {
  const months = normalizeRealmAgeMonths(value);
  if (months === 0) return "New Realm";
  if (months === 1) return "Leveling Era";
  if (months === 2) return "First Level 60s";
  if (months === 3) return "First Raid Clears";
  if (months === 4) return "Molten Core Era";
  if (months <= 7) return "Blackwing Lair Era";
  if (months === 8) return "Early Naxxramas Era";
  if (months <= 11) return "Naxxramas Progression";
  return "Mature Naxxramas Realm";
};
