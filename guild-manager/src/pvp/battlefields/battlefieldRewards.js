import { GUILD_FACTION } from "../../constants";
import { awardCharacterHonor } from "../pvpProgression";
import { BATTLEFIELD_IDS } from "./battlefieldDefinitions";
import { buildBattlefieldStatusRoster } from "./battlefieldUtils";

const randomInt = (rng, min, max) =>
  Math.floor(min + rng() * (max - min + 1));

export const getWarsongHonorReward = (battle, rng = Math.random) => {
  const result = battle?.result || "draw";
  const base =
    result === "victory"
      ? randomInt(rng, 100, 160)
      : result === "defeat"
        ? randomInt(rng, 20, 60)
        : randomInt(rng, 50, 80);
  const flagBonus = Math.max(0, Number(battle?.playerScore) || 0) * randomInt(rng, 10, 20);
  return {
    honorPerParticipant: base + flagBonus,
    baseHonor: base,
    flagBonus,
    honorableKills:
      result === "victory" ||
      result === "draw" ||
      Math.abs((Number(battle?.playerScore) || 0) - (Number(battle?.enemyScore) || 0)) <= 1
        ? 1
        : 0,
  };
};

export const applyBattlefieldRewards = ({
  battle,
  roster,
  faction = GUILD_FACTION.ALLIANCE,
  rng = Math.random,
} = {}) => {
  if (!battle || battle.battlefieldId !== BATTLEFIELD_IDS.WARSONG_GULCH) {
    return { roster, battle, logs: [] };
  }
  const participantIds = Array.isArray(battle.participantIds)
    ? battle.participantIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const participantSet = new Set(participantIds);
  const reward = getWarsongHonorReward(battle, rng);
  const nextRoster = buildBattlefieldStatusRoster({
    roster: (Array.isArray(roster) ? roster : []).map((character) => {
      if (!participantSet.has(String(character?.id || ""))) return character;
      return awardCharacterHonor(
        character,
        {
          honor: reward.honorPerParticipant,
          honorableKills: reward.honorableKills,
        },
        faction,
      );
    }),
    participantIds,
    active: false,
  });
  const resultLabel =
    battle.result === "victory"
      ? "Victory"
      : battle.result === "defeat"
        ? "Defeat"
        : "Draw";
  const logs = [
    {
      type: "pvp",
      battlefieldId: battle.id,
      message: `Warsong Gulch ${resultLabel}: your team finished ${battle.playerScore}-${battle.enemyScore}. +${reward.honorPerParticipant} Honor for ${participantIds.length} participant${participantIds.length === 1 ? "" : "s"}.`,
    },
  ];

  return {
    roster: nextRoster,
    battle: {
      ...battle,
      reward,
    },
    logs,
  };
};

