import { z } from "zod";

export const SESSION_FORMAT_VALUE = "guild-manager-session" as const;
export const CURRENT_SESSION_VERSION = 22;

const dataSchema = z.record(z.string(), z.unknown());
const recognizedKeys = new Set([
  "roster", "activeMissions", "missionList", "guildSetup", "guildProgress", "progression",
  "milestones", "achievements", "gameSpeed",
  "guildRelationsState", "guildActivityStats",
  "gameSettings", "contentState", "activityHistory",
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
  (data) => {
    const guildSetup =
      data.guildSetup && typeof data.guildSetup === "object"
        ? (data.guildSetup as Record<string, unknown>)
        : {};
    return {
      ...data,
      guildSetup: {
        ...guildSetup,
        contentRoute: "uncommitted",
        contentPhase: "classic",
        contentPhaseStartedDayIndex: 0,
      },
    };
  },
  (data) => {
    const missionBoardState = data.missionBoardState && typeof data.missionBoardState === "object"
      ? (data.missionBoardState as Record<string, unknown>)
      : {};
    const gameSettings = data.gameSettings && typeof data.gameSettings === "object"
      ? (data.gameSettings as Record<string, unknown>)
      : {};
    const mode = ["none", "basic", "best"].includes(String(missionBoardState.consumableMode || ""))
      ? String(missionBoardState.consumableMode)
      : "none";
    const enabled = mode !== "none";
    return {
      ...data,
      roster: Array.isArray(data.roster)
        ? data.roster.map((entry) => {
            const character = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
            return {
              ...character,
              professions: Array.isArray(character.professions)
                ? character.professions.map((rawProfession) => {
                    const profession = rawProfession && typeof rawProfession === "object" ? (rawProfession as Record<string, unknown>) : {};
                    const name = String(profession.name || "");
                    return {
                      ...profession,
                      kind: ["Cooking", "Fishing", "First Aid"].includes(name) ? "secondary" : "primary",
                    };
                  })
                : character.professions,
            };
          })
        : [],
      activeMissions: Array.isArray(data.activeMissions)
        ? data.activeMissions.map((entry) => {
            const mission = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
            return { ...mission, runPreparation: mission.runPreparation || mission.consumableModifiers || null };
          })
        : [],
      missionBoardState: {
        ...missionBoardState,
        runPreparationSelection: missionBoardState.runPreparationSelection || {
          mode,
          enabledCategories: { alchemy: enabled, food: enabled, firstAid: enabled, engineering: enabled, weapon: enabled },
          engineeringStrategy: "auto",
        },
      },
      gameSettings: { ...gameSettings, autoRunPreparationMode: "none" },
    };
  },
  (data) => {
    const realmState =
      data.realmState && typeof data.realmState === "object"
        ? (data.realmState as Record<string, unknown>)
        : null;
    if (!realmState) return data;
    const population =
      realmState.population && typeof realmState.population === "object"
        ? (realmState.population as Record<string, unknown>)
        : {};
    const usedIds = new Set<string>();
    const players: Record<string, unknown>[] = (Array.isArray(population.players)
      ? population.players
      : []
    ).map((entry, index) => {
      const player =
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : {};
      const baseId =
        String(player.id || "").trim() || `realm-player:legacy:${index + 1}`;
      let id = baseId;
      let duplicateIndex = 1;
      while (usedIds.has(id)) {
        id = `${baseId}:duplicate:${duplicateIndex}`;
        duplicateIndex += 1;
      }
      usedIds.add(id);
      return { ...player, id };
    });
    const npcGuilds = Array.isArray(realmState.npcGuilds)
      ? realmState.npcGuilds
      : [];
    npcGuilds.forEach((entry, guildIndex) => {
      const guild =
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : {};
      const guildId = String(guild.id || `legacy-guild:${guildIndex + 1}`);
      (Array.isArray(guild.roster) ? guild.roster : []).forEach(
        (rawMember, memberIndex) => {
          const member =
            rawMember && typeof rawMember === "object"
              ? (rawMember as Record<string, unknown>)
              : {};
          const memberId = String(member.id || "").trim();
          if (memberId && usedIds.has(memberId)) return;
          const baseId =
            memberId || `realm-player:legacy:${guildId}:${memberIndex + 1}`;
          let id = baseId;
          let duplicateIndex = 1;
          while (usedIds.has(id)) {
            id = `${baseId}:duplicate:${duplicateIndex}`;
            duplicateIndex += 1;
          }
          usedIds.add(id);
          players.push({
            ...member,
            id,
            guildId,
            faction: member.faction || guild.faction,
            sourceGuildName: member.sourceGuildName || guild.name,
          });
        },
      );
    });
    const memberIdsByGuildId = new Map<string, string[]>();
    players.forEach((player) => {
      const guildId = String(player.guildId || "");
      if (!guildId) return;
      const memberIds = memberIdsByGuildId.get(guildId) || [];
      memberIds.push(String(player.id));
      memberIdsByGuildId.set(guildId, memberIds);
    });
    return {
      ...data,
      realmState: {
        ...realmState,
        population: {
          ...population,
          players,
          nextPlayerSequence: Math.max(
            players.length,
            Math.floor(Number(population.nextPlayerSequence) || 0),
          ),
        },
        npcGuilds: npcGuilds.map((entry) => {
          const guild =
            entry && typeof entry === "object"
              ? (entry as Record<string, unknown>)
              : {};
          const { roster: legacyRoster, ...summary } = guild;
          void legacyRoster;
          return {
            ...summary,
            memberIds:
              memberIdsByGuildId.get(String(guild.id || "")) || [],
          };
        }),
      },
    };
  },
  (data) => {
    const guildSetup =
      data.guildSetup && typeof data.guildSetup === "object"
        ? (data.guildSetup as Record<string, unknown>)
        : {};
    const route = ["burning_crusade", "classic_plus"].includes(
      String(guildSetup.contentRoute || ""),
    )
      ? String(guildSetup.contentRoute)
      : "uncommitted";
    const phase =
      route === "burning_crusade"
        ? "tbc_prepatch"
        : route === "classic_plus"
          ? "classic_plus"
          : "classic";
    return {
      ...data,
      contentState:
        data.contentState && typeof data.contentState === "object"
          ? data.contentState
          : {
              route,
              phase,
              activatedAtDayIndex: Math.max(
                0,
                Math.floor(Number(guildSetup.contentPhaseStartedDayIndex) || 0),
              ),
              schemaVersion: 1,
            },
    };
  },
  (data) => {
    const contentState =
      data.contentState && typeof data.contentState === "object"
        ? (data.contentState as Record<string, unknown>)
        : {};
    const battlefieldState =
      data.battlefieldState && typeof data.battlefieldState === "object"
        ? (data.battlefieldState as Record<string, unknown>)
        : {};
    const legacyHistory = Array.isArray(battlefieldState.history)
      ? battlefieldState.history
      : [];
    const records = legacyHistory.slice(0, 30).map((entry, runIndex) => {
      const battle =
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : {};
      const reward =
        battle.reward && typeof battle.reward === "object"
          ? (battle.reward as Record<string, unknown>)
          : {};
      const result = String(battle.result || "draw");
      return {
        id: String(battle.id || `legacy-battleground:${runIndex + 1}`),
        kind: "battleground",
        definitionId: String(battle.battlefieldId || "unknown"),
        name: String(battle.name || "Battleground"),
        contentRoute: String(contentState.route || "uncommitted"),
        contentPhase: String(contentState.phase || "classic"),
        source: battle.runSource === "automation" ? "automation" : "manual",
        startedAtGameTimeMs: Math.max(0, Number(battle.startTime) || 0),
        completedAtGameTimeMs: Math.max(
          0,
          Number(battle.completedAt) || Number(battle.finishTime) || 0,
        ),
        dayIndex: Math.max(0, Math.floor(Number(battle.startDay) || 0)),
        outcome:
          result === "victory"
            ? "success"
            : result === "defeat"
              ? "failure"
              : "draw",
        participants: (Array.isArray(battle.participantIds)
          ? battle.participantIds
          : []
        ).map((id) => ({
          id: String(id),
          name: String(id),
          charClass: null,
          role: null,
          level: null,
          itemLevel: null,
        })),
        events: (Array.isArray(battle.events) ? battle.events : [])
          .slice(-100)
          .map((rawEvent, eventIndex) => {
            const event =
              rawEvent && typeof rawEvent === "object"
                ? (rawEvent as Record<string, unknown>)
                : {};
            return {
              sequence: eventIndex + 1,
              atGameTimeMs: null,
              type: "score",
              label: String(event.summary || event.type || "Battleground event"),
              playerScore: Math.max(0, Number(event.playerScore) || 0),
              enemyScore: Math.max(0, Number(event.enemyScore) || 0),
            };
          }),
        rewardGold: 0,
        rewardItemIds: [],
        details: {
          kind: "battleground",
          playerScore: Math.max(0, Number(battle.playerScore) || 0),
          enemyScore: Math.max(0, Number(battle.enemyScore) || 0),
          honorPerParticipant: Math.max(
            0,
            Number(reward.honorPerParticipant) || 0,
          ),
          bracketLabel: battle.bracketLabel
            ? String(battle.bracketLabel)
            : null,
        },
      };
    });
    return {
      ...data,
      activityHistory:
        data.activityHistory && typeof data.activityHistory === "object"
          ? data.activityHistory
          : { records },
      battlefieldState: { ...battlefieldState, history: [] },
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
