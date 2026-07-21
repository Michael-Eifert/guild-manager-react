export type ItemId = string | number;

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
  sourceBosses?: readonly string[];
  dungeonWing?: string;
  setName?: string;
  wowheadId?: number;
}

export interface GuildInventory {
  items: Record<ItemId, number>;
}

export interface InventoryEntry {
  itemId: ItemId;
  amount?: number;
  quantity?: number;
}

export type InventoryItemCategory = "material" | "consumable" | "equipment" | "other";

export interface InventoryItemDefinition extends ItemDefinition {
  category: InventoryItemCategory;
  professionTags?: string[];
  effect?: string;
  classRestrictions?: string[];
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
