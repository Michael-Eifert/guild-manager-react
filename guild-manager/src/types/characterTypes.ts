import type { ItemDefinition } from "./itemTypes";

export type CharacterId = string;
export type CharacterRole = "Tank" | "Healer" | "DPS";

export interface CharacterProfession {
  name: string;
  skill: number;
  maxSkill?: number;
}

export interface CharacterPvpState {
  rank: number;
  title: string;
  lifetimeHonor: number;
  weeklyHonor: number;
  honorableKills: number;
  unlockedPvpGearIds: string[];
}

export interface Character {
  id: CharacterId;
  name?: string;
  level?: number;
  charClass?: string;
  class?: string;
  className?: string;
  role?: CharacterRole | string;
  status?: string;
  statusText?: string;
  activityMode?: string;
  professions?: CharacterProfession[];
  equipment?: Record<string, ItemDefinition | null | undefined>;
  pvp?: Partial<CharacterPvpState>;
}
