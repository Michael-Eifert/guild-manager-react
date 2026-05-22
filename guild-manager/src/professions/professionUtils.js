import { addItemToGuildInventory } from "../inventory/guildInventoryUtils";
import { pickMaterialForProfession } from "./materialDefinitions";

export const getCharacterProfession = (character, professionName) =>
  (Array.isArray(character?.professions) ? character.professions : []).find(
    (profession) => profession?.name === professionName,
  ) || null;

export const getCharacterProfessionSkill = (character, professionName) =>
  Number(getCharacterProfession(character, professionName)?.skill) || 0;

export const characterHasProfession = (character, professionName) =>
  Boolean(getCharacterProfession(character, professionName));

export const applyProfessionSkillGain = ({
  character,
  professionName,
  amount = 1,
  maxSkill = 300,
}) => {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (!character || safeAmount <= 0) return character;
  return {
    ...character,
    professions: (Array.isArray(character.professions) ? character.professions : []).map(
      (profession) => {
        if (profession?.name !== professionName) return profession;
        const currentSkill = Number(profession.skill) || 0;
        return {
          ...profession,
          skill: Math.min(Math.max(1, Number(maxSkill) || 300), currentSkill + safeAmount),
        };
      },
    ),
  };
};

export const generatePassiveProfessionMaterial = ({
  character,
  professionName,
  guildInventory,
  random = Math.random,
}) => {
  const profession = getCharacterProfession(character, professionName);
  if (!profession) {
    return { guildInventory, material: null, quantity: 0, log: null };
  }
  const materialItemId = pickMaterialForProfession({
    professionName,
    skill: profession.skill,
    random,
  });
  if (!materialItemId) {
    return { guildInventory, material: null, quantity: 0, log: null };
  }
  const quantity = Math.max(1, Math.floor((Number(profession.skill) || 1) / 100) + 1);
  return {
    guildInventory: addItemToGuildInventory(guildInventory, materialItemId, quantity),
    material: materialItemId,
    quantity,
    log: {
      type: "profession-material",
      characterName: character?.name,
      professionName,
      itemId: materialItemId,
      quantity,
    },
  };
};
