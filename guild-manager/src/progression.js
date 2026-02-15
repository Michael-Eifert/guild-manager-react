export const GAME_SPEED_NORMAL = 1;
export const GAME_SPEED_FAST = 2;
export const GAME_SPEED_VERY_FAST = 4;
export const DEFAULT_GAME_SPEED = GAME_SPEED_NORMAL;

const GAME_SPEED_SEQUENCE = [
  GAME_SPEED_NORMAL,
  GAME_SPEED_FAST,
  GAME_SPEED_VERY_FAST,
];

export const clampGameSpeed = (speed) =>
  GAME_SPEED_SEQUENCE.includes(speed) ? speed : GAME_SPEED_NORMAL;

export const getNextGameSpeed = (speed) => {
  const safeSpeed = clampGameSpeed(speed);
  const currentIndex = GAME_SPEED_SEQUENCE.indexOf(safeSpeed);
  const nextIndex = (currentIndex + 1) % GAME_SPEED_SEQUENCE.length;
  return GAME_SPEED_SEQUENCE[nextIndex];
};

export const formatGameSpeedLabel = (speed) => `x${clampGameSpeed(speed)}`;

export const normalizeProgressionState = (rawProgression) => {
  const raw = rawProgression && typeof rawProgression === "object" ? rawProgression : {};
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
