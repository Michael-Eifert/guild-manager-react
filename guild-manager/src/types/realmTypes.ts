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
  guildName?: string;
  raidName?: string;
  shortName?: string;
  clearedBosses?: number;
  totalBosses?: number;
}
