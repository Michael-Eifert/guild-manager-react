import { z } from "zod";

export const SESSION_FORMAT_VALUE = "guild-manager-session" as const;
export const CURRENT_SESSION_VERSION = 17;

const dataSchema = z.record(z.string(), z.unknown());
const recognizedKeys = new Set([
  "roster", "activeMissions", "missionList", "guildSetup", "guildProgress", "progression",
  "milestones", "achievements", "gameSpeed",
  "guildRelationsState", "guildActivityStats",
  "gameSettings",
]);
const hasRecognizedSessionData = (data: Record<string, unknown>) =>
  Object.keys(data).some((key) => recognizedKeys.has(key));
const envelopeSchema = z.object({
  format: z.literal(SESSION_FORMAT_VALUE),
  version: z.number().int().nonnegative(),
  savedAt: z.string().optional(),
  data: dataSchema,
});

export class SessionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionValidationError";
  }
}

type SessionData = Record<string, unknown>;
type Migration = (data: SessionData) => SessionData;

export const SESSION_MIGRATIONS: ReadonlyArray<Migration> = [
  (data) => ({
    ...data,
    guildProgress:
      data.guildProgress || data.milestones || data.achievements
        ? data.guildProgress || { milestones: data.milestones || data.achievements }
        : data.guildProgress,
  }),
  (data) => ({
    ...data,
    progression:
      data.progression || {
        gameSpeed: data.gameSpeed,
        isPaused: data.isPaused,
        gameTimeMs: data.gameTimeMs,
      },
  }),
  (data) => ({ ...data, guildRelationships: data.guildRelationships || {} }),
  (data) => ({ ...data, calendarState: data.calendarState || null, raidLockouts: data.raidLockouts || {} }),
  (data) => ({ ...data, realmState: data.realmState || null, worldPvpState: data.worldPvpState || {} }),
  (data) => ({ ...data, guildInventory: data.guildInventory || null, stashPolicy: data.stashPolicy || null }),
  (data) => ({ ...data, missionBoardState: data.missionBoardState || {}, battlefieldState: data.battlefieldState || {} }),
  (data) => ({ ...data, roster: Array.isArray(data.roster) ? data.roster : [] }),
  (data) => ({ ...data, socialState: data.socialState || null }),
  (data) => ({ ...data, guildRelationsState: data.guildRelationsState || null }),
  (data) => {
    const realmState =
      data.realmState && typeof data.realmState === "object"
        ? (data.realmState as Record<string, unknown>)
        : null;
    const population =
      realmState?.population && typeof realmState.population === "object"
        ? (realmState.population as Record<string, unknown>)
        : null;
    return {
      ...data,
      realmState:
        realmState && population
          ? {
              ...realmState,
              population: {
                ...population,
                departedPlayers: Array.isArray(population.departedPlayers)
                  ? population.departedPlayers
                  : [],
              },
            }
          : realmState,
    };
  },
  (data) => ({ ...data, guildActivityStats: data.guildActivityStats || null }),
  (data) => {
    const socialState =
      data.socialState && typeof data.socialState === "object"
        ? (data.socialState as Record<string, unknown>)
        : {};
    const lastRead =
      socialState.lastReadSequenceByChannel &&
      typeof socialState.lastReadSequenceByChannel === "object"
        ? (socialState.lastReadSequenceByChannel as Record<string, unknown>)
        : {};
    return {
      ...data,
      socialState: {
        ...socialState,
        rpScenes: Array.isArray(socialState.rpScenes)
          ? socialState.rpScenes
          : [],
        processedRpEventIds: Array.isArray(socialState.processedRpEventIds)
          ? socialState.processedRpEventIds
          : [],
        rpDailyCounters:
          socialState.rpDailyCounters &&
          typeof socialState.rpDailyCounters === "object"
            ? socialState.rpDailyCounters
            : { dayIndex: -1, nonInteractiveScenes: 0 },
        lastReadSequenceByChannel: {
          ...lastRead,
          tavern: Number(lastRead.tavern) || 0,
        },
      },
    };
  },
  (data) => ({
    ...data,
    gameSettings: {
      offlineSimulationEnabled:
        typeof (data.gameSettings as Record<string, unknown> | undefined)
          ?.offlineSimulationEnabled === "boolean"
          ? (data.gameSettings as Record<string, unknown>)
              .offlineSimulationEnabled
          : true,
    },
  }),
  (data) => ({
    ...data,
    roster: Array.isArray(data.roster)
      ? data.roster.map((entry) => {
          const character =
            entry && typeof entry === "object"
              ? (entry as Record<string, unknown>)
              : {};
          const equipment =
            character.equipment && typeof character.equipment === "object"
              ? (character.equipment as Record<string, unknown>)
              : {};
          return {
            ...character,
            equipment: {
              ...equipment,
              offHand: equipment.offHand || null,
              ranged: equipment.ranged || null,
            },
            personalInventory: Array.isArray(character.personalInventory)
              ? character.personalInventory
              : [],
          };
        })
      : [],
  }),
  (data) => {
    const gameSettings =
      data.gameSettings && typeof data.gameSettings === "object"
        ? (data.gameSettings as Record<string, unknown>)
        : {};
    return {
      ...data,
      gameSettings: {
        ...gameSettings,
        officerAutonomyMode: "off",
      },
    };
  },
  (data) => {
    const legacyRecipesByProfession: Record<string, string[]> = {
      Tailoring: ["recipe_apprentice_cloth_robe", "recipe_mystic_woolen_gloves", "recipe_runecloth_mantle"],
      Leatherworking: ["recipe_stitched_leather_vest", "recipe_rangers_hunting_gloves", "recipe_wildhide_boots"],
      Alchemy: ["recipe_minor_healing_potion", "recipe_healing_potion", "recipe_elixir_of_fortitude", "recipe_elixir_of_power"],
    };
    return {
      ...data,
      roster: Array.isArray(data.roster)
        ? data.roster.map((entry) => {
            const character = entry && typeof entry === "object"
              ? (entry as Record<string, unknown>)
              : {};
            return {
              ...character,
              professions: Array.isArray(character.professions)
                ? character.professions.map((rawProfession) => {
                    const profession = rawProfession && typeof rawProfession === "object"
                      ? (rawProfession as Record<string, unknown>)
                      : {};
                    const name = String(profession.name || "");
                    return {
                      ...profession,
                      knownRecipeIds: Array.isArray(profession.knownRecipeIds)
                        ? profession.knownRecipeIds
                        : legacyRecipesByProfession[name] || [],
                    };
                  })
                : character.professions,
            };
          })
        : [],
    };
  },
];

export const migrateSessionPayload = (input: unknown) => {
  let version = 0;
  let data: SessionData;

  const envelopeResult = envelopeSchema.safeParse(input);
  if (envelopeResult.success) {
    version = envelopeResult.data.version;
    data = envelopeResult.data.data;
  } else {
    const possibleEnvelope = input as Record<string, unknown> | null;
    if (possibleEnvelope?.format !== undefined || possibleEnvelope?.version !== undefined) {
      throw new SessionValidationError("The save envelope is malformed or uses an invalid format.");
    }
    const legacyResult = dataSchema.safeParse(input);
    if (!legacyResult.success || !hasRecognizedSessionData(legacyResult.data)) {
      throw new SessionValidationError("The selected file does not contain a valid guild session.");
    }
    data = legacyResult.data;
  }

  if (version > CURRENT_SESSION_VERSION) {
    throw new SessionValidationError(
      `This save uses version ${version}, but this application supports up to version ${CURRENT_SESSION_VERSION}.`,
    );
  }

  if (!hasRecognizedSessionData(data)) {
    throw new SessionValidationError("The save does not contain recognizable guild state.");
  }

  while (version < CURRENT_SESSION_VERSION) {
    const migrate = SESSION_MIGRATIONS[version];
    if (!migrate) {
      throw new SessionValidationError(`No migration is available for save version ${version}.`);
    }
    data = migrate(data);
    version += 1;
  }


  if (Array.isArray(data.roster)) {
    const invalidCharacter = data.roster.find(
      (character) =>
        !character ||
        typeof character !== "object" ||
        !String((character as Record<string, unknown>).id || "").trim(),
    );
    if (invalidCharacter) {
      throw new SessionValidationError("At least one roster entry is missing a character identifier.");
    }
  }

  return { format: SESSION_FORMAT_VALUE, version, data };
};
