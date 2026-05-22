const MATERIAL_TABLE = Object.freeze({
  Tailoring: [
    { itemId: "linen_cloth", minSkill: 1, weight: 6 },
    { itemId: "simple_thread", minSkill: 1, weight: 2 },
    { itemId: "wool_cloth", minSkill: 75, weight: 4 },
    { itemId: "coarse_thread", minSkill: 75, weight: 2 },
    { itemId: "silk_cloth", minSkill: 150, weight: 3 },
  ],
  Skinning: [
    { itemId: "light_leather", minSkill: 1, weight: 6 },
    { itemId: "medium_leather", minSkill: 75, weight: 4 },
    { itemId: "heavy_leather", minSkill: 150, weight: 3 },
  ],
  Leatherworking: [
    { itemId: "light_leather", minSkill: 1, weight: 4 },
    { itemId: "coarse_thread", minSkill: 1, weight: 2 },
    { itemId: "medium_leather", minSkill: 75, weight: 3 },
    { itemId: "heavy_leather", minSkill: 150, weight: 2 },
  ],
  Herbalism: [
    { itemId: "peacebloom", minSkill: 1, weight: 5 },
    { itemId: "silverleaf", minSkill: 1, weight: 5 },
    { itemId: "briarthorn", minSkill: 75, weight: 3 },
  ],
  Alchemy: [
    { itemId: "peacebloom", minSkill: 1, weight: 3 },
    { itemId: "silverleaf", minSkill: 1, weight: 3 },
    { itemId: "empty_vial", minSkill: 1, weight: 2 },
    { itemId: "briarthorn", minSkill: 75, weight: 4 },
  ],
});

export const getMaterialCandidatesForProfession = (professionName, skill = 1) =>
  (MATERIAL_TABLE[professionName] || []).filter(
    (entry) => (Number(skill) || 1) >= entry.minSkill,
  );

export const pickMaterialForProfession = ({
  professionName,
  skill = 1,
  random = Math.random,
}) => {
  const candidates = getMaterialCandidatesForProfession(professionName, skill);
  if (candidates.length === 0) return null;
  const totalWeight = candidates.reduce(
    (sum, entry) => sum + Math.max(1, Number(entry.weight) || 1),
    0,
  );
  let roll = (typeof random === "function" ? random() : Math.random()) * totalWeight;
  for (const candidate of candidates) {
    roll -= Math.max(1, Number(candidate.weight) || 1);
    if (roll <= 0) return candidate.itemId;
  }
  return candidates[candidates.length - 1].itemId;
};
