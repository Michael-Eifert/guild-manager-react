export type ItemId = string;

export interface ItemDefinition {
  id: ItemId;
  name: string;
  quality: number;
  minLevel: number;
  slot: string;
  itemLevel?: number;
  effectiveLevel?: number;
  dungeon?: string;
  dungeonSetName?: string;
  armorType?: string;
  classRestriction?: string[];
  icon?: string;
  sellPrice?: number;
}

export interface GuildInventory {
  items: Record<ItemId, number>;
}

export interface InventoryEntry {
  itemId: ItemId;
  amount?: number;
  quantity?: number;
}
