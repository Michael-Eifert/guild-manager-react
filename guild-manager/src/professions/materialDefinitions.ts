export interface MaterialCandidate {
  itemId: string;
  minSkill: number;
  weight: number;
}

export type MaterialProfessionName =
  | "Mining"
  | "Skinning"
  | "Herbalism"
  | "Fishing"
;

const MATERIAL_TABLE: Readonly<Record<MaterialProfessionName, readonly MaterialCandidate[]>> = Object.freeze({
  Mining: [
    { itemId: "copper_ore", minSkill: 1, weight: 8 },
    { itemId: "iron_ore", minSkill: 75, weight: 6 },
    { itemId: "mithril_ore", minSkill: 150, weight: 5 },
    { itemId: "thorium_ore", minSkill: 225, weight: 4 },
    { itemId: "dark_iron_ore", minSkill: 230, weight: 1 },
    { itemId: "arcane_crystal", minSkill: 275, weight: 1 },
  ],
  Skinning: [
    { itemId: "light_leather", minSkill: 1, weight: 6 },
    { itemId: "medium_leather", minSkill: 75, weight: 4 },
    { itemId: "heavy_leather", minSkill: 150, weight: 3 },
    { itemId: "thick_leather", minSkill: 225, weight: 2 },
    { itemId: "rugged_leather", minSkill: 275, weight: 1 },
  ],
  Herbalism: [
    { itemId: "peacebloom", minSkill: 1, weight: 5 },
    { itemId: "silverleaf", minSkill: 1, weight: 5 },
    { itemId: "briarthorn", minSkill: 75, weight: 3 },
    { itemId: "kingsblood", minSkill: 125, weight: 3 },
    { itemId: "sungrass", minSkill: 230, weight: 2 },
    { itemId: "dreamfoil", minSkill: 270, weight: 2 },
    { itemId: "golden_sansam", minSkill: 275, weight: 2 },
    { itemId: "gromsblood", minSkill: 280, weight: 1 },
    { itemId: "black_lotus", minSkill: 300, weight: 1 },
  ],
  Fishing: [
    { itemId: "raw_longjaw_mud_snapper", minSkill: 1, weight: 7 },
    { itemId: "raw_mithril_head_trout", minSkill: 75, weight: 5 },
    { itemId: "winter_squid", minSkill: 200, weight: 3 },
    { itemId: "raw_nightfin_snapper", minSkill: 225, weight: 3 },
    { itemId: "stonescale_eel", minSkill: 275, weight: 1 },
  ],
});

export const getMiningStoneForSkill = (skill = 1) => {
  const safeSkill = Number(skill) || 1;
  if (safeSkill >= 225) return "dense_stone";
  if (safeSkill >= 150) return "solid_stone";
  if (safeSkill >= 75) return "heavy_stone";
  return "rough_stone";
};

export const getMaterialCandidatesForProfession = (professionName: string, skill = 1) =>
  ((MATERIAL_TABLE as Readonly<Partial<Record<string, readonly MaterialCandidate[]>>>)[professionName] || []).filter(
    (entry) => (Number(skill) || 1) >= entry.minSkill,
  );

export const pickMaterialForProfession = ({
  professionName,
  skill = 1,
  random = Math.random,
}: {
  professionName: string;
  skill?: number;
  random?: () => number;
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
