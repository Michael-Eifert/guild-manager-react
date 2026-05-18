export const PERSONALITY_TRAIT_ID = Object.freeze({
  CASUAL_GAMER: "casual_gamer",
  DUNGEON_EXPERT: "dungeon_expert",
  POWER_LEVELER: "power_leveler",
  RAIDER: "raider",
});

export const PERSONALITY_TRAIT_DEFINITIONS = Object.freeze({
  [PERSONALITY_TRAIT_ID.CASUAL_GAMER]: Object.freeze({
    id: PERSONALITY_TRAIT_ID.CASUAL_GAMER,
    name: "Casual Gamer",
    rarity: "Common",
    description: "Plays at a steady pace without any special modifier.",
    effects: Object.freeze({}),
  }),
  [PERSONALITY_TRAIT_ID.POWER_LEVELER]: Object.freeze({
    id: PERSONALITY_TRAIT_ID.POWER_LEVELER,
    name: "Power Leveler",
    rarity: "Rare",
    description: "Clears zones and gains leveling XP 50% faster.",
    effects: Object.freeze({
      levelingExpMultiplier: 1.5,
      zoneProgressMultiplier: 1.5,
    }),
  }),
  [PERSONALITY_TRAIT_ID.DUNGEON_EXPERT]: Object.freeze({
    id: PERSONALITY_TRAIT_ID.DUNGEON_EXPERT,
    name: "Dungeon Expert",
    rarity: "Uncommon",
    description: "Adds +5% success chance when this character joins a dungeon.",
    effects: Object.freeze({
      dungeonSuccessBonus: 5,
    }),
  }),
  [PERSONALITY_TRAIT_ID.RAIDER]: Object.freeze({
    id: PERSONALITY_TRAIT_ID.RAIDER,
    name: "Raider",
    rarity: "Uncommon",
    description: "Adds +1% success chance when this character joins a raid.",
    effects: Object.freeze({
      raidSuccessBonus: 1,
    }),
  }),
});

const TRAIT_ROLL_TABLE = Object.freeze([
  Object.freeze({ id: PERSONALITY_TRAIT_ID.POWER_LEVELER, chance: 0.05 }),
  Object.freeze({ id: PERSONALITY_TRAIT_ID.DUNGEON_EXPERT, chance: 0.15 }),
  Object.freeze({ id: PERSONALITY_TRAIT_ID.RAIDER, chance: 0.1 }),
  Object.freeze({ id: PERSONALITY_TRAIT_ID.CASUAL_GAMER, chance: 0.45 }),
]);

export const normalizeCharacterPersonalityTraits = (traits) => {
  const source = Array.isArray(traits)
    ? traits
    : traits
      ? [traits]
      : [];
  return [
    ...new Set(
      source
        .map((trait) =>
          typeof trait === "string" ? trait : String(trait?.id || "").trim(),
        )
        .filter((traitId) =>
          Object.prototype.hasOwnProperty.call(
            PERSONALITY_TRAIT_DEFINITIONS,
            traitId,
          ),
        ),
    ),
  ];
};

export const rollCharacterPersonalityTraits = ({ random = Math.random } = {}) => {
  const roll = (typeof random === "function" ? random : Math.random)();
  let cumulativeChance = 0;
  for (const entry of TRAIT_ROLL_TABLE) {
    cumulativeChance += entry.chance;
    if (roll < cumulativeChance) return [entry.id];
  }
  return [];
};

export const getCharacterPersonalityTraits = (character) =>
  normalizeCharacterPersonalityTraits(
    character?.personalityTraits || character?.personalityTrait,
  ).map((traitId) => PERSONALITY_TRAIT_DEFINITIONS[traitId]);

export const getCharacterPersonalityEffects = (character) =>
  getCharacterPersonalityTraits(character).reduce(
    (effects, trait) => ({
      levelingExpMultiplier:
        effects.levelingExpMultiplier *
        (Number(trait.effects?.levelingExpMultiplier) || 1),
      zoneProgressMultiplier:
        effects.zoneProgressMultiplier *
        (Number(trait.effects?.zoneProgressMultiplier) || 1),
      dungeonSuccessBonus:
        effects.dungeonSuccessBonus +
        (Number(trait.effects?.dungeonSuccessBonus) || 0),
      raidSuccessBonus:
        effects.raidSuccessBonus +
        (Number(trait.effects?.raidSuccessBonus) || 0),
    }),
    {
      levelingExpMultiplier: 1,
      zoneProgressMultiplier: 1,
      dungeonSuccessBonus: 0,
      raidSuccessBonus: 0,
    },
  );

export const getCharacterLevelingExpMultiplier = (character) =>
  getCharacterPersonalityEffects(character).levelingExpMultiplier;

export const getCharacterZoneProgressMultiplier = (character) =>
  getCharacterPersonalityEffects(character).zoneProgressMultiplier;

export const getCharacterDungeonSuccessBonus = (character) =>
  getCharacterPersonalityEffects(character).dungeonSuccessBonus;

export const getCharacterRaidSuccessBonus = (character) =>
  getCharacterPersonalityEffects(character).raidSuccessBonus;
