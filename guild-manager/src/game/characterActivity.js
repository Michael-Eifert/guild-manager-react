import { CONFIG } from "../constants";
import { getZonesForFaction } from "../zones/zoneDefinitions";

export const CHARACTER_ACTIVITY_MODE_DESCRIPTION = Object.freeze({
  Leveling: "Focuses purely on gaining XP, then finishes unfinished zones at max level.",
  Professions: "Pauses XP gain to level up skills, then finishes unfinished zones at max level.",
  Auto: "Levels while keeping professions near a natural skill target, then finishes professions and zones at max level.",
});

const AUTO_PROFESSION_SKILL_PER_LEVEL = 5;
const AUTO_PROFESSION_TARGET_BIAS_RANGE = 25;
const AUTO_PROFESSION_CATCH_UP_BUFFER = 15;

export const getCharacterActivityModeDescription = (activityMode = "Auto") =>
  CHARACTER_ACTIVITY_MODE_DESCRIPTION[activityMode] ||
  CHARACTER_ACTIVITY_MODE_DESCRIPTION.Auto;

export const getSkillCap = (level) => {
  if (level >= 30) return 300;
  if (level >= 20) return 225;
  if (level >= 10) return 150;
  return 75;
};

export const getNextTierLevel = (level) => {
  if (level < 10) return 10;
  if (level < 20) return 20;
  if (level < 30) return 30;
  return "Max";
};

export const canCharacterGainProfessionSkill = (character) => {
  const hardCap = getSkillCap(character?.level || 1);
  return (Array.isArray(character?.professions) ? character.professions : [])
    .some((profession) => (Number(profession?.skill) || 0) < hardCap);
};

const getStableCharacterActivityHash = (character) => {
  const source = String(
    character?.id ||
      character?.name ||
      character?.race ||
      character?.charClass ||
      "character",
  );
  return [...source].reduce(
    (hash, letter, index) => hash + letter.charCodeAt(0) * (index + 1),
    0,
  );
};

export const getAutoProfessionTargetBias = (character) => {
  const explicitBias = Number(character?.professionSkillBias);
  if (Number.isFinite(explicitBias)) {
    return Math.max(
      -AUTO_PROFESSION_TARGET_BIAS_RANGE,
      Math.min(AUTO_PROFESSION_TARGET_BIAS_RANGE, Math.round(explicitBias)),
    );
  }

  const span = AUTO_PROFESSION_TARGET_BIAS_RANGE * 2 + 1;
  return (getStableCharacterActivityHash(character) % span) -
    AUTO_PROFESSION_TARGET_BIAS_RANGE;
};

export const getAutoProfessionSkillTarget = ({
  character,
  level = character?.level || 1,
  levelCap = CONFIG.LEVEL_CAP,
}) => {
  const safeLevel = Math.max(1, Number(level) || 1);
  const hardCap = getSkillCap(safeLevel);
  if (safeLevel >= levelCap) return hardCap;

  const biasedTarget =
    safeLevel * AUTO_PROFESSION_SKILL_PER_LEVEL +
    getAutoProfessionTargetBias(character);
  return Math.max(0, Math.min(hardCap, 300, Math.round(biasedTarget)));
};

export const getAutoProfessionCatchUpPlan = ({
  character,
  level = character?.level || 1,
  levelCap = CONFIG.LEVEL_CAP,
}) => {
  const professions = Array.isArray(character?.professions)
    ? character.professions
    : [];
  const safeLevel = Math.max(1, Number(level) || 1);
  const hardCap = getSkillCap(safeLevel);
  const target = getAutoProfessionSkillTarget({ character, level: safeLevel, levelCap });
  const threshold =
    safeLevel >= levelCap
      ? hardCap
      : Math.max(0, target - AUTO_PROFESSION_CATCH_UP_BUFFER);
  const shouldSkill =
    professions.length > 0 &&
    target > 0 &&
    professions.some((profession) => {
      const skill = Number(profession?.skill) || 0;
      return skill < threshold && skill < hardCap && skill < 300;
    });

  return {
    target,
    threshold,
    shouldSkill,
  };
};

export const getProfessionSkillAttemptCount = ({
  elapsedGameMs = CONFIG.TICK_RATE,
  tickRateMs = CONFIG.TICK_RATE,
}) => {
  const safeElapsed = Math.max(0, Number(elapsedGameMs) || 0);
  const safeTickRate = Math.max(1, Number(tickRateMs) || CONFIG.TICK_RATE);
  if (safeElapsed <= 0) return 0;
  return Math.max(1, Math.round(safeElapsed / safeTickRate));
};

export const applyProfessionSkillAttempts = ({
  professions,
  currentLimit,
  elapsedGameMs = CONFIG.TICK_RATE,
  tickRateMs = CONFIG.TICK_RATE,
  successChance = 0.7,
  productionSuccessChance = null,
  random = Math.random,
}) => {
  const cappedLimit = Math.min(300, Math.max(0, Number(currentLimit) || 0));
  const nextProfessions = (Array.isArray(professions) ? professions : [])
    .map((profession) => ({ ...profession }));
  const attempts = getProfessionSkillAttemptCount({ elapsedGameMs, tickRateMs });
  const roll = typeof random === "function" ? random : Math.random;
  const safeSuccessChance = Math.max(0, Math.min(1, Number(successChance) || 0));
  let skilledProfessionName = null;
  let attempted = false;
  let changed = false;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const uncappedIndexes = nextProfessions
      .map((profession, index) => ({ profession, index }))
      .filter(({ profession }) => {
        const skill = Number(profession?.skill) || 0;
        return skill < cappedLimit && skill < 300;
      })
      .map(({ index }) => index);

    if (uncappedIndexes.length === 0) break;

    const targetIndex =
      uncappedIndexes[Math.floor(roll() * uncappedIndexes.length)];
    const targetProfession = nextProfessions[targetIndex];
    skilledProfessionName = targetProfession?.name || null;
    attempted = true;

    const isGatheringProfession = ["Mining", "Herbalism", "Skinning"].includes(
      targetProfession?.name,
    );
    const targetSuccessChance =
      isGatheringProfession || productionSuccessChance === null
        ? safeSuccessChance
        : Math.max(0, Math.min(1, Number(productionSuccessChance) || 0));
    if (roll() >= 1 - targetSuccessChance) {
      const currentSkill = Number(targetProfession?.skill) || 0;
      nextProfessions[targetIndex] = {
        ...targetProfession,
        skill: Math.min(cappedLimit, 300, currentSkill + 1),
      };
      changed = true;
    }
  }

  return {
    professions: nextProfessions,
    attempts,
    attempted,
    changed,
    skilledProfessionName,
  };
};

export const hasIncompleteAccessibleZones = ({ faction, zonesCleared = [] }) => {
  const clearedZoneIds = new Set(
    (Array.isArray(zonesCleared) ? zonesCleared : [])
      .map((zoneId) => String(zoneId || "").trim())
      .filter(Boolean),
  );

  return getZonesForFaction(faction, true).some(
    (zone) => !clearedZoneIds.has(zone.id),
  );
};

export const resolveCharacterActivityIntent = ({
  activityMode = "Auto",
  level = 1,
  levelCap = CONFIG.LEVEL_CAP,
  canGainSkill = false,
  hasIncompleteZones = false,
}) => {
  const safeLevel = Math.max(1, Number(level) || 1);
  const isBelowLevelCap = safeLevel < levelCap;
  const canFinishZones = Boolean(hasIncompleteZones);

  if (activityMode === "Leveling") {
    if (isBelowLevelCap) {
      return { gainXP: true, gainSkill: false, gainZoneProgress: false };
    }
    if (canFinishZones) {
      return { gainXP: false, gainSkill: false, gainZoneProgress: true };
    }
    return { gainXP: false, gainSkill: false, gainZoneProgress: false };
  }

  if (activityMode === "Professions") {
    if (canGainSkill) {
      return { gainXP: false, gainSkill: true, gainZoneProgress: false };
    }
    if (safeLevel >= levelCap && canFinishZones) {
      return { gainXP: false, gainSkill: false, gainZoneProgress: true };
    }
    return { gainXP: false, gainSkill: false, gainZoneProgress: false };
  }

  if (isBelowLevelCap) {
    if (canGainSkill) {
      return { gainXP: false, gainSkill: true, gainZoneProgress: false };
    }
    return { gainXP: true, gainSkill: false, gainZoneProgress: false };
  }
  if (canGainSkill) {
    return { gainXP: false, gainSkill: true, gainZoneProgress: false };
  }
  if (canFinishZones) {
    return { gainXP: false, gainSkill: false, gainZoneProgress: true };
  }
  return { gainXP: false, gainSkill: false, gainZoneProgress: false };
};

export const getCharacterActivityStatusText = ({
  activityMode = "Auto",
  level = 1,
  levelCap = CONFIG.LEVEL_CAP,
  gainXP = false,
  gainSkill = false,
  gainZoneProgress = false,
}) => {
  if (gainXP) {
    return activityMode === "Auto" ? "⚔️ Auto: Leveling..." : "⚔️ Grinding XP...";
  }
  if (gainSkill) {
    if (activityMode !== "Auto") return "Resting...";
    return level >= levelCap
      ? "🤖 Auto: Max Level Skilling..."
      : "🤖 Auto: Catching up professions...";
  }
  if (gainZoneProgress) {
    return activityMode === "Auto" ? "Auto: Finishing zones..." : "Finishing zones...";
  }
  if (activityMode === "Leveling") return "Max Level Reached";
  if (activityMode === "Professions") {
    return level >= levelCap
      ? "Skills Capped"
      : `Skills Capped (Need Level ${getNextTierLevel(level)})`;
  }
  return "Awaiting Orders";
};

export const resolveCharacterActivityPlan = ({
  character,
  faction,
  levelCap = CONFIG.LEVEL_CAP,
  zoneQuestingEnabled = true,
}) => {
  const level = Math.max(1, Number(character?.level) || 1);
  const activityMode = character?.activityMode || "Auto";
  const hardCap = getSkillCap(level);
  const canGainHardCapSkill = canCharacterGainProfessionSkill(character);
  const autoProfessionPlan = getAutoProfessionCatchUpPlan({
    character,
    level,
    levelCap,
  });
  const professionSkillLimit =
    activityMode === "Auto" && level < levelCap
      ? autoProfessionPlan.target
      : hardCap;
  const canGainSkill =
    activityMode === "Auto"
      ? level >= levelCap
        ? canGainHardCapSkill
        : autoProfessionPlan.shouldSkill
      : canGainHardCapSkill;
  const hasIncompleteZones =
    Boolean(zoneQuestingEnabled) &&
    hasIncompleteAccessibleZones({
      faction,
      zonesCleared: character?.zonesCleared,
    });
  const intent = resolveCharacterActivityIntent({
    activityMode,
    level,
    levelCap,
    canGainSkill,
    hasIncompleteZones,
  });

  return {
    ...intent,
    activityMode,
    hardCap,
    professionSkillLimit,
    autoProfessionTarget: autoProfessionPlan.target,
    autoProfessionThreshold: autoProfessionPlan.threshold,
    canGainSkill,
    hasIncompleteZones,
    statusText: getCharacterActivityStatusText({
      activityMode,
      level,
      levelCap,
      ...intent,
    }),
  };
};
