export const GAME_SPEED_NORMAL = 1;
export const GAME_SPEED_FAST = 2;
export const GAME_SPEED_VERY_FAST = 4;
export const GAME_SPEED_ULTRA_FAST = 8;
export const DEFAULT_GAME_SPEED = GAME_SPEED_NORMAL;

export type GameSpeed =
  | typeof GAME_SPEED_NORMAL
  | typeof GAME_SPEED_FAST
  | typeof GAME_SPEED_VERY_FAST
  | typeof GAME_SPEED_ULTRA_FAST;

export interface ProgressionState {
  gameSpeed: GameSpeed;
  isPaused: boolean;
  gameTimeMs: number;
}

const GAME_SPEED_SEQUENCE: readonly GameSpeed[] = [
  GAME_SPEED_NORMAL,
  GAME_SPEED_FAST,
  GAME_SPEED_VERY_FAST,
  GAME_SPEED_ULTRA_FAST,
];

export const clampGameSpeed = (speed: unknown): GameSpeed =>
  GAME_SPEED_SEQUENCE.includes(speed as GameSpeed) ? speed as GameSpeed : GAME_SPEED_NORMAL;

export const getNextGameSpeed = (speed: unknown): GameSpeed => {
  const safeSpeed = clampGameSpeed(speed);
  const currentIndex = GAME_SPEED_SEQUENCE.indexOf(safeSpeed);
  const nextIndex = (currentIndex + 1) % GAME_SPEED_SEQUENCE.length;
  return GAME_SPEED_SEQUENCE[nextIndex];
};

export const formatGameSpeedLabel = (speed: unknown) => `x${clampGameSpeed(speed)}`;

export const normalizeProgressionState = (rawProgression: unknown): ProgressionState => {
  const raw = rawProgression && typeof rawProgression === "object"
    ? rawProgression as Partial<ProgressionState>
    : {};
  const gameTimeMs = Number(raw.gameTimeMs);
  return {
    gameSpeed: clampGameSpeed(raw.gameSpeed),
    isPaused: Boolean(raw.isPaused),
    gameTimeMs: Number.isFinite(gameTimeMs) ? gameTimeMs : Date.now(),
  };
};

export const advanceGameTime = ({
  currentGameTime,
  lastRealTime,
  realNow,
  isPaused,
  speed,
}: {
  currentGameTime: number;
  lastRealTime: number;
  realNow: number;
  isPaused: boolean;
  speed: unknown;
}) => {
  const safeNow = Number.isFinite(realNow) ? realNow : Date.now();
  const safeLast = Number.isFinite(lastRealTime) ? lastRealTime : safeNow;
  const deltaMs = Math.max(0, safeNow - safeLast);
  const multiplier = clampGameSpeed(speed);
  const safeCurrent = Number.isFinite(currentGameTime) ? currentGameTime : safeNow;
  return {
    gameTime: isPaused ? safeCurrent : safeCurrent + deltaMs * multiplier,
    lastRealTime: safeNow,
  };
};
