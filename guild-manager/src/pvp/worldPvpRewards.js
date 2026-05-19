import {
  WORLD_PVP_OUTCOME,
  WORLD_PVP_REWARD_TABLE,
} from "./worldPvpDefinitions";

export const getWorldPvpRewards = (outcome) => {
  const reward =
    WORLD_PVP_REWARD_TABLE[outcome] ||
    WORLD_PVP_REWARD_TABLE[WORLD_PVP_OUTCOME.DRAW];
  const zoneProgressDelta = Number(reward.zoneProgressDelta) || 0;
  const moraleDelta = Number(reward.moraleDelta) || 0;
  return {
    rewards: {
      honor: Math.max(0, Math.floor(Number(reward.honor) || 0)),
      weeklyHonor: Math.max(0, Math.floor(Number(reward.weeklyHonor) || 0)),
      pvpReputation: Math.max(0, Math.floor(Number(reward.pvpReputation) || 0)),
      xpBonus: 0,
      zoneProgressBonus: Math.max(0, zoneProgressDelta),
    },
    penalties: {
      zoneProgressPenalty: Math.max(0, -zoneProgressDelta),
      moralePenalty: Math.max(0, -moraleDelta),
    },
    zoneProgressDelta,
    moraleDelta,
  };
};
