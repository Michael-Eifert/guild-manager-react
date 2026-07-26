export interface RealmNewsItem {
  id?: string;
  dayIndex: number;
  type: string;
  message: string;
}

export interface RealmNewsInput {
  id?: string;
  dayIndex?: number;
  type?: string;
  message?: string;
}

export interface RealmGuildSummary {
  name: string;
  isPlayerGuild?: boolean;
  rank?: number;
}

export interface RealmSimulationEvent {
  type?: string;
  message?: string;
  count?: number;
  playerId?: string;
  guildName?: string;
  raidName?: string;
  shortName?: string;
  clearedBosses?: number;
  totalBosses?: number;
}

export type RealmDepartureReason = "realm_break";

export interface DepartedRealmPlayer {
  player: Record<string, unknown>;
  departedDayIndex: number;
  eligibleReturnDayIndex: number;
  reason: RealmDepartureReason;
}

export interface RealmPopulationLifecycleStats {
  expiredApplications: number;
  npcGuildExits: number;
  realmDepartures: number;
  returners: number;
  retirements: number;
}
