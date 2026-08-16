import {
  applyDungeonClearMilestones,
  applyLevelMilestones,
  applyRosterSizeMilestones,
  createInitialGuildProgress,
  normalizeGuildProgress,
} from "../guildProgression";
import {
  createInitialGuildRelationsState,
  getLeadershipTraitForCharacter,
  GUILD_RANK,
} from "../guildRelations/guildRelations";
import { normalizeFounderConfig, type FounderConfig } from "../guildRelations/founderCreation";
import { buildRecruitmentEquipment } from "../recruitment/recruitmentLogic";
import { getRelationshipPairKey } from "../social/relationshipSystem";
import type { Character, CharacterRole } from "../types/characterTypes";
import { generateCharacter, getReqExp } from "../utils";
import {
  getStartingGuildProgressProfile,
  normalizeStartingGuildProgress,
  STARTING_GUILD_PROGRESS,
  type StartingGuildProgress,
} from "./startProgression";
import {
  CONTENT_PHASE,
  type ContentPhase,
} from "../content/contentRules";

const RAID_SOURCE_IDS = new Set([
  "molten_core",
  "zul_gurub",
  "ahn_qiraj_ruins",
  "onyxias_lair",
  "blackwing_lair",
  "ahn_qiraj_temple",
  "naxxramas",
]);

const RAID_SOURCE_NAMES = new Set([
  "molten core",
  "zul'gurub",
  "ruins of ahn'qiraj",
  "onyxia's lair",
  "blackwing lair",
  "temple of ahn'qiraj",
  "naxxramas",
]);
const BWL_READY_RAID_SOURCE_IDS = new Set([
  "molten_core",
  "zul_gurub",
  "ahn_qiraj_ruins",
]);
const MOLTEN_CORE_ATTUNEMENT_KEY_ID = "molten_core_attunement";
const BLACKWING_LAIR_ATTUNEMENT_KEY_ID = "blackwing_lair_attunement";

const generateCharacterForRole = generateCharacter as unknown as (
  faction: string,
  role: CharacterRole,
  options: {
    random: () => number;
    createId: () => string;
    usedNameKeys: Set<string>;
    contentPhase?: ContentPhase;
    race?: string;
    charClass?: string;
  },
) => Character;

const hashSeed = (value: unknown) => {
  const input = String(value || "starting-guild");
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state + 0x6d2b79f5, 1);
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const removeFirstRole = (
  roles: CharacterRole[],
  role: CharacterRole,
): CharacterRole[] => {
  const next = [...roles];
  const index = next.indexOf(role);
  if (index >= 0) next.splice(index, 1);
  else next.splice(next.lastIndexOf("DPS"), 1);
  return next;
};

const getRolePlan = (
  progress: StartingGuildProgress,
  founderRole: CharacterRole,
) => {
  if (progress === STARTING_GUILD_PROGRESS.RAID20_READY) {
    const raidCore: CharacterRole[] = [
      "Tank",
      "Tank",
      ...Array<CharacterRole>(5).fill("Healer"),
      ...Array<CharacterRole>(13).fill("DPS"),
    ];
    const reserves: CharacterRole[] = ["Tank", "Healer", "DPS", "DPS", "DPS"];
    return [...removeFirstRole(raidCore, founderRole), ...reserves];
  }
  if (
    progress === STARTING_GUILD_PROGRESS.RAID40_READY ||
    progress === STARTING_GUILD_PROGRESS.BWL_READY
  ) {
    const raidCore: CharacterRole[] = [
      ...Array<CharacterRole>(4).fill("Tank"),
      ...Array<CharacterRole>(8).fill("Healer"),
      ...Array<CharacterRole>(28).fill("DPS"),
    ];
    const reserves: CharacterRole[] =
      progress === STARTING_GUILD_PROGRESS.BWL_READY
        ? [
            "Tank",
            "Tank",
            "Healer",
            "Healer",
            "DPS",
            "DPS",
            "DPS",
            "DPS",
            "DPS",
            "DPS",
          ]
        : ["Tank", "Healer", "DPS", "DPS", "DPS"];
    return [...removeFirstRole(raidCore, founderRole), ...reserves];
  }
  const totals: Record<StartingGuildProgress, CharacterRole[]> = {
    [STARTING_GUILD_PROGRESS.FRESH]: [
      "Tank",
      "Healer",
      "DPS",
      "DPS",
      "DPS",
    ],
    [STARTING_GUILD_PROGRESS.GROWING]: [
      "Tank",
      "Healer",
      "Healer",
      ...Array<CharacterRole>(7).fill("DPS"),
    ],
    [STARTING_GUILD_PROGRESS.ESTABLISHED]: [
      "Tank",
      "Tank",
      "Healer",
      "Healer",
      "Healer",
      ...Array<CharacterRole>(10).fill("DPS"),
    ],
    [STARTING_GUILD_PROGRESS.ENDGAME_PREP]: [
      "Tank",
      "Tank",
      ...Array<CharacterRole>(4).fill("Healer"),
      ...Array<CharacterRole>(14).fill("DPS"),
    ],
    [STARTING_GUILD_PROGRESS.RAID20_READY]: [],
    [STARTING_GUILD_PROGRESS.RAID40_READY]: [],
    [STARTING_GUILD_PROGRESS.BWL_READY]: [],
  };
  return removeFirstRole(totals[progress], founderRole);
};

const isRaidItem = (item: Record<string, unknown>) => {
  const sourceId = String(item?.dungeonSetId || item?.dungeon || "")
    .trim()
    .toLowerCase();
  const sourceName = String(item?.dungeonSetName || item?.dungeon || "")
    .trim()
    .toLowerCase();
  return RAID_SOURCE_IDS.has(sourceId) || RAID_SOURCE_NAMES.has(sourceName);
};

const getItemSourceId = (item: Record<string, unknown>) =>
  String(item?.dungeonSetId || item?.dungeon || "")
    .trim()
    .toLowerCase();

const getStartingItemDatabase = (
  itemDatabase: Record<string, unknown>[],
  progress: StartingGuildProgress,
) => {
  if (progress === STARTING_GUILD_PROGRESS.BWL_READY) {
    return itemDatabase.filter(
      (item) =>
        !isRaidItem(item) ||
        BWL_READY_RAID_SOURCE_IDS.has(getItemSourceId(item)),
    );
  }
  return itemDatabase.filter((item) => !isRaidItem(item));
};

const getLevelForMember = ({
  progress,
  index,
  rosterSize,
  minLevel,
  maxLevel,
  founderLevel,
  random,
}: {
  progress: StartingGuildProgress;
  index: number;
  rosterSize: number;
  minLevel: number;
  maxLevel: number;
  founderLevel: number;
  random: () => number;
}) => {
  if (index === 0) return founderLevel;
  if (progress === STARTING_GUILD_PROGRESS.RAID20_READY) {
    if (index < 20) return 60;
    return 48 + Math.floor(random() * 12);
  }
  if (
    progress === STARTING_GUILD_PROGRESS.RAID40_READY ||
    progress === STARTING_GUILD_PROGRESS.BWL_READY
  ) {
    if (index < 40) return 60;
    const reserveMinimum =
      progress === STARTING_GUILD_PROGRESS.BWL_READY ? 55 : 52;
    return reserveMinimum + Math.floor(random() * (60 - reserveMinimum));
  }
  if (progress === STARTING_GUILD_PROGRESS.ENDGAME_PREP && index < 6) {
    return 60;
  }
  if (minLevel === maxLevel) return minLevel;
  const position = index / Math.max(1, rosterSize - 1);
  const shaped = minLevel + (maxLevel - minLevel) * (0.2 + position * 0.75);
  return Math.max(
    minLevel,
    Math.min(maxLevel, Math.round(shaped + (random() - 0.5) * 6)),
  );
};

const matureCharacter = ({
  character,
  index,
  level,
  itemDatabase,
  random,
  progress,
}: {
  character: Character;
  index: number;
  level: number;
  itemDatabase: Record<string, unknown>[];
  random: () => number;
  progress: StartingGuildProgress;
}): Character => {
  const safeLevel = Math.max(1, Math.min(60, Math.round(level)));
  const professionFactor = {
    [STARTING_GUILD_PROGRESS.FRESH]: 0,
    [STARTING_GUILD_PROGRESS.GROWING]: 0.5,
    [STARTING_GUILD_PROGRESS.ESTABLISHED]: 0.7,
    [STARTING_GUILD_PROGRESS.ENDGAME_PREP]: 0.85,
    [STARTING_GUILD_PROGRESS.RAID20_READY]: 1,
    [STARTING_GUILD_PROGRESS.RAID40_READY]: 1,
    [STARTING_GUILD_PROGRESS.BWL_READY]: 1,
  }[progress];
  const professionSkill = Math.max(
    1,
    Math.min(300, Math.round(safeLevel * 5 * professionFactor)),
  );
  const guaranteedKeys =
    index >= 40
      ? []
      : progress === STARTING_GUILD_PROGRESS.BWL_READY
        ? [
            MOLTEN_CORE_ATTUNEMENT_KEY_ID,
            BLACKWING_LAIR_ATTUNEMENT_KEY_ID,
          ]
        : progress === STARTING_GUILD_PROGRESS.RAID40_READY
          ? [MOLTEN_CORE_ATTUNEMENT_KEY_ID]
          : [];
  const statusText =
    progress === STARTING_GUILD_PROGRESS.FRESH
      ? "Waiting for orders..."
      : progress === STARTING_GUILD_PROGRESS.BWL_READY
        ? "BWL-ready and attuned."
        : progress === STARTING_GUILD_PROGRESS.RAID40_READY
          ? "Molten Core-ready and attuned."
          : "Ready for guild duties.";
  const seeded: Character = {
    ...character,
    level: safeLevel,
    exp: 0,
    maxExp: getReqExp(safeLevel),
    status: "Idle",
    statusText,
    activityMode: "Auto",
    morale: Math.max(50, 58 + Math.round(random() * 24)),
    professions: (character.professions || []).map((profession) => ({
      ...profession,
      skill: professionSkill,
      maxSkill: 300,
    })),
    clearedMissionIds: [],
    keys: guaranteedKeys,
  };
  if (safeLevel <= 1) return seeded;
  return {
    ...seeded,
    equipment: buildRecruitmentEquipment({
      character: seeded,
      itemDatabase: getStartingItemDatabase(itemDatabase, progress),
      random,
      ...(progress === STARTING_GUILD_PROGRESS.BWL_READY
        ? {
            gearBand: { min: 58, max: 70 },
            epicBudget: 12,
            epicWeight: 65,
          }
        : {}),
    }),
  };
};

const buildStartingGuildProgress = (
  roster: Character[],
  progress: StartingGuildProgress,
  dungeonClearCount: number,
) => {
  let guildProgress = normalizeGuildProgress(createInitialGuildProgress());
  guildProgress = normalizeGuildProgress(
    applyLevelMilestones(guildProgress, roster).guildProgress,
  );
  guildProgress = normalizeGuildProgress(
    applyRosterSizeMilestones(guildProgress, roster).guildProgress,
  );
  for (let index = 0; index < dungeonClearCount; index += 1) {
    guildProgress = normalizeGuildProgress(
      applyDungeonClearMilestones(
        guildProgress,
        "Historic Dungeon Run",
      ).guildProgress,
    );
  }
  const normalized = normalizeGuildProgress(guildProgress);
  if (progress === STARTING_GUILD_PROGRESS.ENDGAME_PREP) {
    return normalizeGuildProgress({
      ...normalized,
      renownPoints: Math.max(0, normalized.renownPoints - 1),
      talents: { ...normalized.talents, rosterCap: 1 },
    });
  }
  if (progress === STARTING_GUILD_PROGRESS.RAID20_READY) {
    return normalizeGuildProgress({
      ...normalized,
      renownPoints: Math.max(0, normalized.renownPoints - 13),
      talents: {
        ...normalized.talents,
        rosterCap: 1,
        expBoost: 3,
        raidAttunement: 1,
      },
    });
  }
  if (progress === STARTING_GUILD_PROGRESS.RAID40_READY) {
    return normalizeGuildProgress({
      ...normalized,
      renownPoints: Math.max(0, normalized.renownPoints - 16),
      talents: {
        ...normalized.talents,
        rosterCap: 2,
        expBoost: 3,
        raidAttunement: 1,
        goldCap: 1,
      },
    });
  }
  if (progress === STARTING_GUILD_PROGRESS.BWL_READY) {
    const withHistoricRaidProgress = normalizeGuildProgress({
      ...normalized,
      renownPoints: normalized.renownPoints + 11,
      totalRenown: normalized.totalRenown + 11,
      milestones: {
        ...normalized.milestones,
        dungeon: {
          ...normalized.milestones.dungeon,
          moltenCoreCleared: true,
          zulGurubCleared: true,
          ahnQirajRuinsCleared: true,
        },
      },
    });
    return normalizeGuildProgress({
      ...withHistoricRaidProgress,
      renownPoints: Math.max(
        0,
        withHistoricRaidProgress.renownPoints - 19,
      ),
      talents: {
        ...withHistoricRaidProgress.talents,
        rosterCap: 2,
        expBoost: 3,
        raidAttunement: 1,
        goldCap: 2,
        goldGain: 1,
      },
    });
  }
  return normalized;
};

const buildStartingRelationships = (
  roster: Character[],
  progress: StartingGuildProgress,
  random: () => number,
) => {
  if (progress === STARTING_GUILD_PROGRESS.FRESH) return {};
  const relationships: Record<string, Record<string, unknown>> = {};
  roster.forEach((member, index) => {
    if (index === 0) return;
    const partner = index <= 8 ? roster[0] : roster[index - 1];
    const key = getRelationshipPairKey(partner?.id, member?.id);
    if (!key) return;
    const runsTogether = 2 + Math.floor(random() * 8);
    relationships[key] = {
      memberIds: [String(partner.id), String(member.id)].sort(),
      points: 10 + Math.floor(random() * 26),
      runsTogether,
      successfulRuns: Math.max(1, runsTogether - 1),
      failedRuns: runsTogether > 4 ? 1 : 0,
      dungeonRuns: runsTogether,
      raidRuns: 0,
      eliteRuns: 0,
      lastMissionName: "Guild adventures",
      lastInteractionAt: 0,
      events: [],
    };
  });
  return relationships;
};

export const buildStartingGuild = ({
  founder,
  faction,
  guildName,
  realmName,
  realmAgeMonths,
  startingGuildProgress,
  itemDatabase = [],
  contentPhase = CONTENT_PHASE.CLASSIC,
}: {
  founder: FounderConfig;
  faction: string;
  guildName: string;
  realmName: string;
  realmAgeMonths: number;
  startingGuildProgress: unknown;
  itemDatabase?: Record<string, unknown>[];
  contentPhase?: ContentPhase;
}) => {
  const progress = normalizeStartingGuildProgress(
    startingGuildProgress,
    realmAgeMonths,
  );
  const profile = getStartingGuildProgressProfile(progress);
  const normalizedFounder = normalizeFounderConfig(
    founder,
    faction,
    contentPhase,
  );
  const seed = hashSeed(
    `${realmName}:${faction}:${guildName}:${normalizedFounder.name}:${realmAgeMonths}:${progress}`,
  );
  const random = createSeededRandom(seed);
  let idSequence = 0;
  const createId = () =>
    `starter:${seed.toString(36)}:${(idSequence += 1).toString(36)}`;
  const usedNameKeys = new Set<string>([
    normalizedFounder.name.toLocaleLowerCase(),
  ]);
  const founderBase = generateCharacterForRole(faction, normalizedFounder.role, {
    random,
    createId,
    usedNameKeys,
    contentPhase,
    race: normalizedFounder.race,
    charClass: normalizedFounder.charClass,
  }) as Character;
  const founderCharacter: Character = {
    ...founderBase,
    name: normalizedFounder.name,
    race: normalizedFounder.race,
    gender: normalizedFounder.gender,
    charClass: normalizedFounder.charClass,
    role: normalizedFounder.role,
    personalityTraits: [normalizedFounder.personalityTrait],
    leadershipTrait: normalizedFounder.leadershipTrait,
  };
  const rolePlan = getRolePlan(progress, normalizedFounder.role);
  const companions = rolePlan.map((role) => {
    const character = generateCharacterForRole(faction, role, {
      random,
      createId,
      usedNameKeys,
      contentPhase,
    }) as Character;
    return {
      ...character,
      leadershipTrait: getLeadershipTraitForCharacter(character.id),
    };
  });
  const baseRoster = [founderCharacter, ...companions].slice(
    0,
    profile.rosterSize,
  );
  const roster = baseRoster.map((character, index) =>
    matureCharacter({
      character,
      index,
      level: getLevelForMember({
        progress,
        index,
        rosterSize: profile.rosterSize,
        minLevel: profile.minLevel,
        maxLevel: profile.maxLevel,
        founderLevel: profile.founderLevel,
        random,
      }),
      itemDatabase,
      random,
      progress,
    }),
  );
  const guildRelationsState = createInitialGuildRelationsState(roster);
  if (roster.length >= 15) {
    roster.slice(1, 3).forEach((member, index) => {
      guildRelationsState.assignments[String(member.id)] =
        index === 0 ? GUILD_RANK.LEADERSHIP : GUILD_RANK.OFFICER;
    });
  }

  return {
    progress,
    profile,
    roster,
    gold: profile.gold,
    guildProgress: buildStartingGuildProgress(
      roster,
      progress,
      profile.dungeonClearCount,
    ),
    relationships: buildStartingRelationships(roster, progress, random),
    guildRelationsState,
  };
};
