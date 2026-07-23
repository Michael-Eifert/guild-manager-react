import type { CharacterId } from "./characterTypes";

export type MissionId = string | number;
export type MissionType = "quest" | "elite" | "dungeon" | "raid" | "zone" | string;

export interface Mission {
  id: MissionId;
  questId?: MissionId;
  instanceId?: string;
  name?: string;
  type?: MissionType;
  memberIds?: CharacterId[];
  startTime?: number;
  finishTime?: number;
  level?: number;
  recommended?: number | string;
  minLevel?: number;
  entryLevel?: number;
  isRaid?: boolean;
  dungeonWing?: string;
  dungeonSetName?: string;
  rewardQualities?: number[];
  rewardKeys?: string[];
  dungeonBosses?: string[];
  dungeonLootTable?: object;
  bonusDrops?: object[];
  raidRoleRequirement?: object;
  dungeonSetId?: string;
  wingOrder?: number;
  raidReset?: {
    type?: string;
    intervalDays?: number;
    anchorDayIndex?: number;
    weekday?: number;
  };
  totalDuration?: number;
  successChance?: number;
  dungeonProgress?: {
    stepResults?: Array<{ step?: number; outcome?: string }>;
    currentStep?: number;
    clearedSteps?: number;
    attemptsUsed?: number;
    maxAttempts?: number;
    finished?: boolean;
  };
  chainContext?: {
    totalMissions?: number;
    currentPosition?: number;
    setName?: string;
  };
  missionId?: MissionId;
  quest?: { id?: MissionId };
  zoneId?: string;
  isZoneElite?: boolean;
  elite?: boolean;
  gold?: number;
  payoutGold?: number;
  typeLabel?: string;
  duration?: number;
  maxAttempts?: number;
  raidMaxAttempts?: number;
  requiresKey?: boolean;
  keyId?: string;
  requiresKeyForAllMembers?: boolean;
  dungeonBossCount?: number;
}

export type MissionInput = Partial<Mission>;
