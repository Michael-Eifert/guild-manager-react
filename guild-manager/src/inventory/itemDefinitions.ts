import { RECIPE_DEFINITIONS, getRecipeScrollItemId } from "../professions/recipeDefinitions";
import type { InventoryItemDefinition, ItemDefinition } from "../types/itemTypes";

export const INVENTORY_ITEM_CATEGORY = Object.freeze({ MATERIAL: "material", CONSUMABLE: "consumable", EQUIPMENT: "equipment", RECIPE: "recipe", OTHER: "other" });

const material = (id: string, name: string, professionTags: string[], source: string, sellValue: number): InventoryItemDefinition => ({ id, name, category: "material", quality: 1, professionTags, source, sellValue });
const consumable = (id: string, name: string, quality: number, sellValue: number, effect = id): InventoryItemDefinition => ({ id, name, category: "consumable", quality, effect, source: "Professions", sellValue });
const gear = (id: string, name: string, options: Partial<InventoryItemDefinition>): InventoryItemDefinition => ({ id, name, category: "equipment", quality: 2, source: "Professions", sellValue: 5, ...options });

const MATERIALS: Record<string, InventoryItemDefinition> = Object.fromEntries([
  material("linen_cloth", "Linen Cloth", ["Tailoring"], "World Drop", 1),
  material("wool_cloth", "Wool Cloth", ["Tailoring"], "World Drop", 2),
  material("silk_cloth", "Silk Cloth", ["Tailoring"], "World Drop", 3),
  material("mageweave_cloth", "Mageweave Cloth", ["Tailoring"], "World Drop", 4),
  material("runecloth", "Runecloth", ["Tailoring"], "World Drop", 5),
  material("light_leather", "Light Leather", ["Leatherworking", "Skinning"], "Skinning", 1),
  material("medium_leather", "Medium Leather", ["Leatherworking", "Skinning"], "Skinning", 2),
  material("heavy_leather", "Heavy Leather", ["Leatherworking", "Skinning"], "Skinning", 3),
  material("thick_leather", "Thick Leather", ["Leatherworking", "Skinning"], "Skinning", 4),
  material("rugged_leather", "Rugged Leather", ["Leatherworking", "Skinning"], "Skinning", 5),
  material("copper_ore", "Copper Ore", ["Blacksmithing", "Mining"], "Mining", 1),
  material("iron_ore", "Iron Ore", ["Blacksmithing", "Mining"], "Mining", 2),
  material("mithril_ore", "Mithril Ore", ["Blacksmithing", "Mining"], "Mining", 3),
  material("thorium_ore", "Thorium Ore", ["Blacksmithing", "Mining"], "Mining", 5),
  material("dark_iron_ore", "Dark Iron Ore", ["Blacksmithing", "Mining"], "Blackrock Depths", 7),
  material("arcane_crystal", "Arcane Crystal", ["Blacksmithing", "Mining"], "High-level Mining", 12),
  material("peacebloom", "Peacebloom", ["Alchemy", "Herbalism"], "Herbalism", 1),
  material("silverleaf", "Silverleaf", ["Alchemy", "Herbalism"], "Herbalism", 1),
  material("briarthorn", "Briarthorn", ["Alchemy", "Herbalism"], "Herbalism", 2),
  material("kingsblood", "Kingsblood", ["Alchemy", "Herbalism"], "Herbalism", 3),
  material("sungrass", "Sungrass", ["Alchemy", "Herbalism"], "Herbalism", 4),
  material("dreamfoil", "Dreamfoil", ["Alchemy", "Herbalism"], "Herbalism", 5),
  material("golden_sansam", "Golden Sansam", ["Alchemy", "Herbalism"], "Herbalism", 5),
  material("gromsblood", "Gromsblood", ["Alchemy", "Herbalism"], "Herbalism", 6),
  material("black_lotus", "Black Lotus", ["Alchemy", "Herbalism"], "High-level Herbalism", 15),
  material("strange_dust", "Strange Dust", ["Enchanting"], "Disenchanting", 2),
  material("vision_dust", "Vision Dust", ["Enchanting"], "Disenchanting", 4),
  material("dream_dust", "Dream Dust", ["Enchanting"], "Disenchanting", 6),
  material("illusion_dust", "Illusion Dust", ["Enchanting"], "Disenchanting", 8),
  material("small_brilliant_shard", "Small Brilliant Shard", ["Enchanting"], "Disenchanting", 10),
  material("large_brilliant_shard", "Large Brilliant Shard", ["Enchanting"], "Disenchanting", 15),
  material("essence_of_fire", "Essence of Fire", ["Enchanting", "Blacksmithing", "Tailoring"], "High-level World Drop", 7),
  material("essence_of_undeath", "Essence of Undeath", ["Tailoring"], "Scholomance", 7),
  material("essence_of_light", "Essence of Light", ["Enchanting"], "Eastern Plaguelands", 7),
  material("living_essence", "Living Essence", ["Leatherworking"], "High-level World Drop", 7),
  material("fiery_core", "Fiery Core", ["Leatherworking", "Blacksmithing"], "Molten Core", 12),
  material("simple_thread", "Simple Thread", ["Tailoring"], "Vendor", 1),
  material("coarse_thread", "Coarse Thread", ["Tailoring", "Leatherworking"], "Vendor", 1),
  material("fine_thread", "Fine Thread", ["Tailoring", "Leatherworking"], "Vendor", 2),
  material("rune_thread", "Rune Thread", ["Tailoring", "Leatherworking"], "Vendor", 3),
  material("empty_vial", "Empty Vial", ["Alchemy"], "Vendor", 1),
  material("crystal_vial", "Crystal Vial", ["Alchemy"], "Vendor", 3),
  material("weak_flux", "Weak Flux", ["Blacksmithing"], "Vendor", 1),
  material("strong_flux", "Strong Flux", ["Blacksmithing"], "Vendor", 3),
].map((entry) => [String(entry.id), entry]));

const CONSUMABLES: Record<string, InventoryItemDefinition> = Object.fromEntries([
  consumable("minor_healing_potion", "Minor Healing Potion", 1, 2), consumable("healing_potion", "Healing Potion", 2, 4),
  consumable("elixir_of_fortitude", "Elixir of Fortitude", 2, 5), consumable("elixir_of_power", "Elixir of Power", 2, 5),
  consumable("major_healing_potion", "Major Healing Potion", 3, 10), consumable("flask_supreme_power", "Flask of Supreme Power", 4, 25),
  consumable("flask_of_the_titans", "Flask of the Titans", 4, 25), consumable("rough_sharpening_stone", "Rough Sharpening Stone", 1, 1),
].map((entry) => [String(entry.id), entry]));

const EQUIPMENT: Record<string, InventoryItemDefinition> = {
  apprentice_cloth_robe: gear("apprentice_cloth_robe", "Apprentice Cloth Robe", { slot: "chest", armorType: "Cloth", minLevel: 8, levelRequirement: 8, itemLevel: 16, stats: { intellect: 2, spirit: 1 }, profession: "Tailoring", sellValue: 3, binding: "bindOnEquip" }),
  mystic_woolen_gloves: gear("mystic_woolen_gloves", "Mystic Woolen Gloves", { slot: "hands", armorType: "Cloth", minLevel: 22, levelRequirement: 22, itemLevel: 32, stats: { intellect: 4, spirit: 2 }, profession: "Tailoring", sellValue: 6, binding: "bindOnEquip" }),
  runecloth_mantle: gear("runecloth_mantle", "Runecloth Mantle", { quality: 3, slot: "shoulder", armorType: "Cloth", minLevel: 48, levelRequirement: 48, itemLevel: 58, stats: { intellect: 8, spirit: 5, stamina: 4 }, profession: "Tailoring", sellValue: 12, binding: "bindOnEquip" }),
  robes_of_arcana: gear("robes_of_arcana", "Robes of Arcana", { quality: 3, slot: "chest", armorType: "Cloth", minLevel: 35, levelRequirement: 35, itemLevel: 45, stats: { intellect: 10, spirit: 7 }, profession: "Tailoring", sellValue: 12, binding: "bindOnEquip" }),
  robe_of_the_archmage: gear("robe_of_the_archmage", "Robe of the Archmage", { quality: 4, slot: "chest", armorType: "Cloth", minLevel: 57, levelRequirement: 57, itemLevel: 62, stats: { intellect: 18, stamina: 10, spellPower: 16 }, profession: "Tailoring", classRestrictions: ["Mage"], sellValue: 28, binding: "bindOnCraft" }),
  truefaith_vestments: gear("truefaith_vestments", "Truefaith Vestments", { quality: 4, slot: "chest", armorType: "Cloth", minLevel: 57, levelRequirement: 57, itemLevel: 62, stats: { intellect: 18, spirit: 12, healingPower: 24 }, profession: "Tailoring", classRestrictions: ["Priest"], sellValue: 28, binding: "bindOnCraft" }),
  robe_of_the_void: gear("robe_of_the_void", "Robe of the Void", { quality: 4, slot: "chest", armorType: "Cloth", minLevel: 57, levelRequirement: 57, itemLevel: 62, stats: { intellect: 16, stamina: 14, spellPower: 18 }, profession: "Tailoring", classRestrictions: ["Warlock"], sellValue: 28, binding: "bindOnCraft" }),
  stitched_leather_vest: gear("stitched_leather_vest", "Stitched Leather Vest", { slot: "chest", armorType: "Leather", minLevel: 10, levelRequirement: 10, itemLevel: 18, stats: { agility: 2, stamina: 2 }, profession: "Leatherworking", sellValue: 3, binding: "bindOnEquip" }),
  rangers_hunting_gloves: gear("rangers_hunting_gloves", "Ranger's Hunting Gloves", { slot: "hands", armorType: "Leather", minLevel: 26, levelRequirement: 26, itemLevel: 36, stats: { agility: 5, stamina: 3 }, profession: "Leatherworking", sellValue: 7, binding: "bindOnEquip" }),
  nightscape_headband: gear("nightscape_headband", "Nightscape Headband", { slot: "head", armorType: "Leather", minLevel: 39, levelRequirement: 39, itemLevel: 49, stats: { agility: 8, stamina: 5 }, profession: "Leatherworking", sellValue: 9, binding: "bindOnEquip" }),
  wildhide_boots: gear("wildhide_boots", "Wildhide Boots", { quality: 3, slot: "feet", armorType: "Leather", minLevel: 46, levelRequirement: 46, itemLevel: 56, stats: { agility: 8, stamina: 5 }, profession: "Leatherworking", sellValue: 12, binding: "bindOnEquip" }),
  wicked_leather_pants: gear("wicked_leather_pants", "Wicked Leather Pants", { quality: 3, slot: "legs", armorType: "Leather", minLevel: 53, levelRequirement: 53, itemLevel: 58, stats: { agility: 14, stamina: 9 }, profession: "Leatherworking", sellValue: 18, binding: "bindOnEquip" }),
  hide_of_the_wild: gear("hide_of_the_wild", "Hide of the Wild", { quality: 4, slot: "back", armorType: "Cloth", minLevel: 57, levelRequirement: 57, itemLevel: 62, stats: { stamina: 8, intellect: 10, healingPower: 20 }, profession: "Leatherworking", sellValue: 24, binding: "bindOnEquip" }),
  corehound_belt: gear("corehound_belt", "Corehound Belt", { quality: 4, slot: "belt", armorType: "Leather", minLevel: 60, levelRequirement: 60, itemLevel: 65, stats: { agility: 16, stamina: 12 }, profession: "Leatherworking", sellValue: 28, binding: "bindOnEquip" }),
  copper_chain_vest: gear("copper_chain_vest", "Copper Chain Vest", { slot: "chest", armorType: "Mail", minLevel: 10, levelRequirement: 10, itemLevel: 18, stats: { strength: 3, stamina: 2 }, profession: "Blacksmithing", sellValue: 3, binding: "bindOnEquip" }),
  mithril_coif: gear("mithril_coif", "Mithril Coif", { slot: "head", armorType: "Mail", minLevel: 40, levelRequirement: 40, itemLevel: 50, stats: { strength: 8, stamina: 7 }, profession: "Blacksmithing", sellValue: 10, binding: "bindOnEquip" }),
  imperial_plate_chest: gear("imperial_plate_chest", "Imperial Plate Chest", { quality: 3, slot: "chest", armorType: "Plate", minLevel: 50, levelRequirement: 50, itemLevel: 59, stats: { strength: 12, stamina: 13 }, profession: "Blacksmithing", sellValue: 16, binding: "bindOnEquip" }),
  dark_iron_pulverizer: gear("dark_iron_pulverizer", "Dark Iron Pulverizer", { quality: 3, slot: "mainHand", armorType: "Generic", type: "Generic", equipmentKind: "weapon", weaponType: "mace2h", handedness: "twoHand", minLevel: 50, levelRequirement: 50, itemLevel: 58, stats: { strength: 13, stamina: 8 }, profession: "Blacksmithing", sellValue: 18, binding: "bindOnEquip" }),
  arcanite_reaper: gear("arcanite_reaper", "Arcanite Reaper", { quality: 4, slot: "mainHand", armorType: "Generic", type: "Generic", equipmentKind: "weapon", weaponType: "axe2h", handedness: "twoHand", minLevel: 58, levelRequirement: 58, itemLevel: 63, stats: { strength: 20, stamina: 10 }, profession: "Blacksmithing", sellValue: 30, binding: "bindOnEquip" }),
  lionheart_helm: gear("lionheart_helm", "Lionheart Helm", { quality: 4, slot: "head", armorType: "Plate", minLevel: 57, levelRequirement: 57, itemLevel: 64, stats: { strength: 18, agility: 8, stamina: 10 }, profession: "Blacksmithing", sellValue: 30, binding: "bindOnEquip" }),
};

export const PROFESSION_ITEM_DEFINITIONS = Object.freeze({ ...MATERIALS, ...CONSUMABLES, ...EQUIPMENT });
const RECIPE_ITEM_DEFINITIONS: Record<string, InventoryItemDefinition> = Object.fromEntries(RECIPE_DEFINITIONS.filter((recipe) => ["world", "dungeon", "raid"].includes(recipe.acquisition.kind)).map((recipe) => { const id = getRecipeScrollItemId(recipe.id); return [id, { id, name: `Recipe: ${recipe.name}`, category: "recipe", quality: recipe.acquisition.rarity === "Very Rare" ? 4 : 3, recipeId: recipe.id, professionTags: [recipe.profession], source: recipe.acquisition.label, sellValue: recipe.acquisition.rarity === "Very Rare" ? 30 : 12 } satisfies InventoryItemDefinition]; }));
const INVENTORY_DEFINITIONS_BY_ID: Readonly<Record<string, InventoryItemDefinition>> = Object.freeze({ ...PROFESSION_ITEM_DEFINITIONS, ...RECIPE_ITEM_DEFINITIONS });

export const getInventoryItemDefinition = (itemId: unknown): InventoryItemDefinition | null => INVENTORY_DEFINITIONS_BY_ID[String(itemId || "").trim()] || null;
export const getAllInventoryItemDefinitions = () => Object.values(INVENTORY_DEFINITIONS_BY_ID);
export const toEquipmentItem = (definition: InventoryItemDefinition | null | undefined): ItemDefinition | null => {
  if (!definition || definition.category !== "equipment") return null;
  return { id: definition.id, name: definition.name, slot: definition.slot, type: definition.armorType || definition.type || "Generic", armorType: definition.armorType, quality: definition.quality, minLevel: definition.levelRequirement || definition.minLevel || 1, levelRequirement: definition.levelRequirement, itemLevel: definition.itemLevel || definition.gearScore, stats: definition.stats || {}, source: definition.source, profession: definition.profession, crafted: true, sellValue: definition.sellValue || 0, allowedClasses: definition.classRestrictions, equipmentKind: definition.equipmentKind, weaponType: definition.weaponType, handedness: definition.handedness, binding: definition.binding };
};
