import type { ChangeEvent, RefObject } from "react";
import type {
  Character,
  CharacterId,
} from "../types/characterTypes";
import type {
  Mission,
  MissionId,
} from "../types/missionTypes";
import type { GuildInventory } from "../types/itemTypes";
import type { WorldPvpState } from "../pvp/worldPvpUtils";
import type {
  GuildRankId,
  RelationsManagementMode,
} from "../guildRelations/guildRelations";
import type { GameSettingsState } from "../settings/gameSettings";
import type {
  BrowserSaveSlotId,
  BrowserSaveSlotSummary,
} from "../session/browserSessionPersistence";

export type { Character, CharacterId, Mission, MissionId };

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

export type GuildLogEntry = Record<string, unknown> & {
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
  guildSetup: GuildSetupState;
  guildProgress: Record<string, unknown>;
  guildRelationships: Record<string, unknown>;
  calendarState: Record<string, unknown>;
  raidLockouts: Record<string, unknown>;
  realmState: Record<string, unknown>;
  worldPvpState: WorldPvpState;
  battlefieldState: Record<string, unknown>;
  guildInventory: GuildInventory;
};

export type GuildSetupState = {
  hasStarted?: boolean;
  name?: string;
  faction?: string;
  focus?: string;
  dungeonActivity?: string;
  pvpActivityFocus?: string;
  realmDifficulty?: string;
  server?: string;
  serverStyle?: string;
  serverPopulation?: string;
  lastFocusChangeDayIndex?: number | null;
  founder?: {
    name?: string;
    race?: string;
    gender?: string;
    charClass?: string;
    role?: string;
    personalityTrait?: string;
    leadershipTrait?: string;
  };
};

export interface GameActions {
  dismissNotification: (notificationId: string) => void;
  changeGuildSetup: (field: string, value: unknown) => void;
  loadSession: () => void;
  loadSessionFile: (event: ChangeEvent<HTMLInputElement>) => void;
  startGuild: () => void;
  loadBrowserSave: (slotId: BrowserSaveSlotId) => void;
  startNewBrowserGame: (slotId: BrowserSaveSlotId) => void;
  updateGameSettings: (
    settings: Partial<GameSettingsState>,
  ) => GameSettingsState;
  setGuildRank: (characterId: string, rank: GuildRankId) => void;
  setGuildRankLabels: (
    labels: Record<GuildRankId, string>,
  ) => boolean;
  setRelationsManagementMode: (mode: RelationsManagementMode) => void;
  resolveGuildIncident: (incidentId: string, choiceId: string) => void;
  castGuildElectionVote: (candidateId: string) => void;
  finishGuildElection: () => void;
}

/** Public provider value. Domain modules refine individual fields as they migrate. */
export type GameProviderSnapshot = {
  actions: GameActions;
  guildSetup: GuildSetupState;
  gameSettings: GameSettingsState;
  browserSaveSlots: BrowserSaveSlotSummary[];
  roster: Character[];
  activeMissions: Mission[];
  notifications: GameNotification[];
  sessionFileInputRef: RefObject<HTMLInputElement | null>;
  gameTimeMs: number;
  gameSpeed: number;
  isPaused: boolean;
};

export type TransitionResult = {
  state: GameState;
  events: GameEvent[];
};
