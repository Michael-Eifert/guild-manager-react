export type ItemId = string | number;
export type EquipmentSlot =
  | "head"
  | "neck"
  | "shoulder"
  | "back"
  | "chest"
  | "wrist"
  | "belt"
  | "hands"
  | "legs"
  | "feet"
  | "trinket"
  | "ring"
  | "mainHand"
  | "offHand"
  | "ranged";
export type EquipmentKind =
  | "armor"
  | "weapon"
  | "shield"
  | "offHandFrill"
  | "rangedWeapon"
  | "wand"
  | "relic";
export type WeaponHandedness =
  | "oneHand"
  | "mainHand"
  | "offHand"
  | "twoHand"
  | "ranged";
export type WeaponType =
  | "dagger"
  | "fist"
  | "axe1h"
  | "axe2h"
  | "mace1h"
  | "mace2h"
  | "sword1h"
  | "sword2h"
  | "polearm"
  | "staff"
  | "bow"
  | "crossbow"
  | "gun"
  | "thrown"
  | "wand"
  | "idol"
  | "libram"
  | "totem";

export type ItemBinding = "none" | "bindOnEquip" | "bindOnCraft";

export interface ItemEnchant {
  recipeId: string;
  name: string;
  stats?: Readonly<Record<string, number | undefined>>;
  effectiveLevelBonus?: number;
}

export interface ItemDefinition {
  id: ItemId;
  name: string;
  quality?: number;
  minLevel?: number;
  slot?: string;
  itemLevel?: number;
  effectiveLevel?: number;
  dungeon?: string;
  dungeonSetName?: string;
  armorType?: string;
  classRestriction?: string[];
  icon?: string;
  sellPrice?: number;
  dungeonSetId?: string;
  setId?: string;
  pvpGear?: boolean;
  source?: string;
  type?: string;
  levelRequirement?: number;
  gearScore?: number;
  stats?: Readonly<Record<string, number | undefined>>;
  profession?: string;
  crafted?: boolean;
  sellValue?: number;
  allowedClasses?: readonly string[];
  equipmentKind?: EquipmentKind;
  weaponType?: WeaponType;
  handedness?: WeaponHandedness;
  roleTags?: readonly string[];
  legacyCompatibility?: boolean;
  sourceBosses?: readonly string[];
  dungeonWing?: string;
  setName?: string;
  wowheadId?: number;
  requiredPvpRank?: number;
  pvpHonorRank?: number;
  faction?: string;
  binding?: ItemBinding;
  boundCharacterId?: string;
  enchant?: ItemEnchant;
}

export interface GuildInventory {
  items: Record<ItemId, number>;
}

export interface InventoryEntry {
  itemId: ItemId;
  amount?: number;
  quantity?: number;
}

export type InventoryItemCategory = "material" | "consumable" | "equipment" | "recipe" | "other";

export interface InventoryItemDefinition extends ItemDefinition {
  category: InventoryItemCategory;
  professionTags?: string[];
  effect?: string;
  classRestrictions?: string[];
  recipeId?: string;
}

export interface LootManifestEntry {
  internalId?: number;
  wowheadId?: number;
  name: string;
  slot?: string;
  quality?: number;
  type?: string;
  minLevel?: number;
  itemLevel?: number;
  iconCode?: string;
  sourceBosses: readonly string[];
  allowedClasses?: readonly string[];
  stats?: Readonly<Record<string, number | undefined>>;
  setId?: string;
  setName?: string;
  unsupportedSlot?: string;
}
