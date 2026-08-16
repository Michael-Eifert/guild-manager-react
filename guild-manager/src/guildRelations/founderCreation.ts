import { DB_CLASSES, GUILD_FACTION } from "../constants";
import {
  CONTENT_PHASE,
  getFactionRacesForContent,
  getRaceClassesForContent,
  type ContentPhase,
} from "../content/contentRules";
import { PERSONALITY_TRAIT_ID } from "../game/characterPersonality";
import type { Character, CharacterRole } from "../types/characterTypes";
import { generateCharacter, generateCharacters } from "../utils";
import {
  LEADERSHIP_TRAIT,
  getLeadershipTraitForCharacter,
  normalizeLeadershipTrait,
  type LeadershipTraitId,
} from "./guildRelations";

export type FounderConfig = {
  name: string;
  race: string;
  gender: "Male" | "Female";
  charClass: string;
  role: CharacterRole;
  personalityTrait: string;
  leadershipTrait: LeadershipTraitId;
};

export const DEFAULT_FOUNDER_CONFIG: FounderConfig = Object.freeze({
  name: "",
  race: "Human",
  gender: "Male",
  charClass: "Warrior",
  role: "Tank",
  personalityTrait: PERSONALITY_TRAIT_ID.CASUAL_GAMER,
  leadershipTrait: LEADERSHIP_TRAIT.DIPLOMAT,
});

const VALID_PERSONALITY_TRAITS = new Set<string>(
  Object.values(PERSONALITY_TRAIT_ID),
);

export const getFounderOptionsForFaction = (
  faction: string,
  contentPhase: ContentPhase = CONTENT_PHASE.CLASSIC,
) => {
  const races = getFactionRacesForContent(faction, contentPhase);
  return races.map((race) => ({
    race,
    classes: [...getRaceClassesForContent(race, contentPhase)],
  }));
};

export const normalizeFounderConfig = (
  value: unknown,
  faction: string,
  contentPhase: ContentPhase = CONTENT_PHASE.CLASSIC,
): FounderConfig => {
  const safe =
    value && typeof value === "object"
      ? (value as Partial<FounderConfig>)
      : {};
  const factionOptions = getFounderOptionsForFaction(faction, contentPhase);
  const races = factionOptions.map((entry) => entry.race);
  const race = races.includes(String(safe.race))
    ? String(safe.race)
    : factionOptions[0]?.race || DEFAULT_FOUNDER_CONFIG.race;
  const classes =
    factionOptions.find((entry) => entry.race === race)?.classes || [];
  const charClass = classes.includes(String(safe.charClass))
    ? String(safe.charClass)
    : classes[0] || DEFAULT_FOUNDER_CONFIG.charClass;
  const roles = Array.isArray(
    DB_CLASSES[charClass as keyof typeof DB_CLASSES]?.allowedRoles,
  )
    ? DB_CLASSES[charClass as keyof typeof DB_CLASSES].allowedRoles
    : ["DPS"];
  const role = roles.includes(String(safe.role))
    ? (safe.role as CharacterRole)
    : (roles[0] as CharacterRole);
  return {
    name: String(safe.name || "").trim().slice(0, 24),
    race,
    gender: safe.gender === "Female" ? "Female" : "Male",
    charClass,
    role,
    personalityTrait: VALID_PERSONALITY_TRAITS.has(
      String(safe.personalityTrait),
    )
      ? String(safe.personalityTrait)
      : DEFAULT_FOUNDER_CONFIG.personalityTrait,
    leadershipTrait: normalizeLeadershipTrait(
      safe.leadershipTrait,
      safe.name || race,
    ),
  };
};

export const getRemainingStarterRolePlan = (
  founderRole: CharacterRole,
): CharacterRole[] => {
  const plan: CharacterRole[] = ["Tank", "Healer", "DPS", "DPS", "DPS"];
  const index = plan.indexOf(founderRole);
  if (index >= 0) plan.splice(index, 1);
  else plan.splice(plan.lastIndexOf("DPS"), 1);
  return plan;
};

export const buildFounderRoster = ({
  founder,
  faction,
  contentPhase = CONTENT_PHASE.CLASSIC,
}: {
  founder: FounderConfig;
  faction: typeof GUILD_FACTION[keyof typeof GUILD_FACTION];
  contentPhase?: ContentPhase;
}): Character[] => {
  const normalized = normalizeFounderConfig(founder, faction, contentPhase);
  if (!normalized.name) return [];
  const generatedFounder = (
    generateCharacter as unknown as (
      selectedFaction: string,
      preferredRole: CharacterRole,
      options: {
        usedNames: string[];
        contentPhase: ContentPhase;
        race: string;
        charClass: string;
      },
    ) => Character
  )(faction, normalized.role, {
    usedNames: [normalized.name],
    contentPhase,
    race: normalized.race,
    charClass: normalized.charClass,
  });
  const founderCharacter: Character = {
    ...generatedFounder,
    name: normalized.name,
    race: normalized.race,
    gender: normalized.gender,
    charClass: normalized.charClass,
    role: normalized.role,
    personalityTraits: [normalized.personalityTrait],
    leadershipTrait: normalized.leadershipTrait,
  };
  const companions = (
    generateCharacters(
      4,
      faction as typeof GUILD_FACTION.ALLIANCE,
      getRemainingStarterRolePlan(normalized.role),
      { usedNames: [normalized.name], contentPhase },
    ) as Character[]
  ).map((character) => ({
    ...character,
    leadershipTrait: getLeadershipTraitForCharacter(character.id),
  }));
  return [founderCharacter, ...companions];
};
