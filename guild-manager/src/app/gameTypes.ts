export type CharacterId = string;
export type MissionId = string | number;
export type UnknownRecord = Record<string, unknown>;

export type GameServices = {
  now: () => number;
  random: () => number;
  createId: () => string;
};

export type NotificationType = "achievement" | "error" | "info" | "success" | "warning";

export type NotificationInput = {
  message: string;
  title?: string;
  type?: NotificationType;
  durationMs?: number;
};

export type GameNotification = Required<Pick<NotificationInput, "message">> & {
  id: string;
  title: string;
  type: NotificationType;
};

export type GuildLogEntry = UnknownRecord & {
  time?: string;
  type?: string;
  message?: string;
};

export type ClockState = {
  gameTimeMs: number;
  gameSpeed: number;
  isPaused: boolean;
  lastRealTimeMs?: number;
};

export type Character = {
  id: CharacterId;
  name?: string;
  level?: number;
  charClass?: string;
  role?: string;
  status?: string;
  statusText?: string;
  activityMode?: string;
  [key: string]: unknown;
};

export type Mission = UnknownRecord & {
  id: MissionId;
  questId?: MissionId;
  instanceId?: string;
  name?: string;
  type?: string;
  memberIds?: CharacterId[];
  startTime?: number;
  finishTime?: number;
  level?: number;
  recommended?: number;
  minLevel?: number;
  entryLevel?: number;
  isRaid?: boolean;
  dungeonWing?: string;
  dungeonSetName?: string;
};

export type GameState = {
  clock: ClockState;
  guild: Record<string, unknown>;
  roster: Character[];
  missions: Record<string, unknown>;
  calendar: Record<string, unknown>;
  realm: Record<string, unknown>;
  pvp: Record<string, unknown>;
  inventory: Record<string, unknown>;
  log: Array<Record<string, unknown>>;
};

export type DeployOptions = Record<string, unknown>;
export type CharacterChanges = Record<string, unknown>;

export type GameCommand =
  | { type: "clock/tick"; realNow: number }
  | {
      type: "mission/deploy";
      missionId: MissionId;
      memberIds: CharacterId[];
      options: DeployOptions;
    }
  | {
      type: "roster/update";
      characterId: CharacterId;
      changes: CharacterChanges;
    }
  | { type: "session/replace"; state: GameState };

export type GameEvent =
  | { type: "notification"; notification: NotificationInput }
  | { type: "navigation"; path: string }
  | { type: "session-download"; payload: unknown }
  | { type: "external-error"; source: string; message: string };

export type GameRuntimeEvent =
  | GameEvent
  | { type: "guild-log"; entry: GuildLogEntry }
  | { type: "calendar-complete"; eventId: string; missionName?: string; succeeded: boolean };

export type GameRuntimeMemory = {
  nextAutoDungeonAttemptAt: number;
  lastAutoDungeonCheckpointKey?: string;
  rewardedMissionIds: Set<string>;
};

export type GameRuntimeSnapshot = {
  roster: Character[];
  activeMissions: Mission[];
  guildGold: number;
  gameTimeMs: number;
  guildSetup: UnknownRecord;
  guildProgress: UnknownRecord;
  guildRelationships: UnknownRecord;
  calendarState: UnknownRecord;
  raidLockouts: UnknownRecord;
  realmState: UnknownRecord;
  worldPvpState: UnknownRecord;
  battlefieldState: UnknownRecord;
  guildInventory: UnknownRecord;
};

export type GameActions = Record<string, (...args: any[]) => any>;

/** Public provider value. Domain modules refine individual fields as they migrate. */
export type GameProviderSnapshot = UnknownRecord & {
  actions: GameActions;
  roster: Character[];
  activeMissions: Mission[];
  notifications: GameNotification[];
  gameTimeMs: number;
  gameSpeed: number;
  isPaused: boolean;
};

export type TransitionResult = {
  state: GameState;
  events: GameEvent[];
};
