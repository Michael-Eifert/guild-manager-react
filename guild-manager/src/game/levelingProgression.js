import { GAMEPLAY_TUNING } from "../constants";
import { getReqExp } from "../utils";

const { LEVELING_TICK_EXP_MULTIPLIER } = GAMEPLAY_TUNING;

const getLevelingTargetSecondsPerLevel = (level) => {
  const safeLevel = Math.max(1, Number(level) || 1);
  if (safeLevel <= 5) return 10;
  if (safeLevel <= 12) return 20;
  if (safeLevel <= 18) return 40;
  if (safeLevel <= 22) return 60;
  if (safeLevel <= 30) return 90;
  if (safeLevel <= 40) return 120;
  if (safeLevel <= 49) return 150;
  if (safeLevel <= 55) return 200;
  return 300;
};

export const getLevelingTickExpGain = (level, totalExpMultiplier = 1) => {
  const safeLevel = Math.max(1, Number(level) || 1);
  const reqExp = getReqExp(safeLevel);
  const targetSeconds = getLevelingTargetSecondsPerLevel(safeLevel);
  const baseExpPerTick = reqExp / targetSeconds;
  return Math.max(
    1,
    Math.floor(
      baseExpPerTick * LEVELING_TICK_EXP_MULTIPLIER * totalExpMultiplier,
    ),
  );
};
