export type CharacterId = string;
export type MissionId = string | number;

export type ClockState = {
  gameTimeMs: number;
  gameSpeed: number;
  isPaused: boolean;
  lastRealTimeMs?: number;
};

export type Character = {
  id: CharacterId;
  name?: string;
  [key: string]: unknown;
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
  | { type: "notification"; notification: Record<string, unknown> }
  | { type: "navigation"; path: string }
  | { type: "session-download"; payload: unknown }
  | { type: "external-error"; source: string; message: string };

export type TransitionResult = {
  state: GameState;
  events: GameEvent[];
};

export type GameServices = {
  now: () => number;
  random: () => number;
  createId: () => string;
};
