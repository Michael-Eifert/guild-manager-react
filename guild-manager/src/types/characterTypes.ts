import type { ItemDefinition } from "./itemTypes";

export type CharacterId = string;
export type CharacterRole = "Tank" | "Healer" | "DPS";

export interface CharacterProfession {
  name: string;
  skill: number;
  kind?: "primary" | "secondary";
  maxSkill?: number;
  knownRecipeIds?: string[];
}

export interface CharacterPvpState {
  rank: number;
  title: string;
  lifetimeHonor: number;
  weeklyHonor: number;
  honorableKills: number;
  unlockedPvpGearIds: string[];
  rankProgress: number;
  highestRank: number;
  highestTitle: string;
}

export interface Character {
  id: CharacterId;
  name?: string;
  level?: number;
  exp?: number;
  maxExp?: number;
  charClass?: string;
  class?: string;
  className?: string;
  race?: string;
  gender?: string;
  role?: CharacterRole | string;
  status?: string;
  statusText?: string;
  activityMode?: string;
  activityLevel?: number;
  history?: Array<Record<string, unknown>>;
  professions?: CharacterProfession[];
  equipment?: Record<string, ItemDefinition | null | undefined>;
  personalInventory?: ItemDefinition[];
  pvp?: Partial<CharacterPvpState>;
  morale?: number;
  personalityTrait?: string | { id?: string };
  personalityTraits?: Array<string | { id?: string }>;
  leadershipTrait?: string;
  guildJoinedDayIndex?: number;
  faction?: string;
  currentZoneId?: string;
  currentZoneProgress?: number;
  zoneProgressById?: Record<string, number>;
  zonesCleared?: string[];
  keys?: string[];
  clearedMissionIds?: Array<string | number>;
  zoneManualOverride?: boolean;
  zoneProgress?: number;
}
