import { DB_CLASSES } from "../constants";
import {
  getEquipmentSetBonus,
  getItemEffectiveLevel,
} from "../utils";
import type { Character, CharacterRole } from "../types/characterTypes";
import type { EquipmentSlot, ItemDefinition } from "../types/itemTypes";
import {
  canCharacterEquipItem,
  getItemEquipTargets,
  isTwoHandedItem,
  isValidWeaponLoadout,
} from "./weaponRules";

export const MAX_PERSONAL_EQUIPMENT_ITEMS = 48;

type LoadoutRole = CharacterRole | "Physical DPS" | "Caster DPS";
type LoadoutResult = {
  character: Character;
  equippedItemIds: string[];
  storedItemIds: string[];
  soldItems: ItemDefinition[];
  soldGold: number;
  loadoutGain: number;
  outcome: "equipped" | "stored" | "sold" | "unchanged";
};

const itemKey = (item?: ItemDefinition | null) =>
  String(item?.id ?? `${item?.name || "item"}:${item?.slot || ""}`);

const itemSellValue = (item: ItemDefinition) => {
  const explicit = Number(item.sellValue ?? item.sellPrice);
  if (Number.isFinite(explicit) && explicit > 0) return Math.max(1, Math.floor(explicit));
  return Math.max(
    1,
    Math.floor(getItemEffectiveLevel(item) * Math.max(1, Number(item.quality) || 1) / 8),
  );
};

const getStats = (item?: ItemDefinition | null) => {
  const base = item?.stats || {};
  const enchant = item?.enchant?.stats || {};
  return Object.fromEntries(
    [...new Set([...Object.keys(base), ...Object.keys(enchant)])].map((stat) => [
      stat,
      (Number(base[stat]) || 0) + (Number(enchant[stat]) || 0),
    ]),
  );
};

const getRoleArchetypes = (character: Character): LoadoutRole[] => {
  const roles = (
    (DB_CLASSES as Record<string, { allowedRoles?: CharacterRole[] }>)[
      String(character.charClass || "")
    ]?.allowedRoles || [character.role || "DPS"]
  ) as LoadoutRole[];
  const result = new Set<LoadoutRole>();
  roles.forEach((role) => {
    if (role !== "DPS") {
      result.add(role);
      return;
    }
    if (["Mage", "Warlock", "Priest"].includes(String(character.charClass))) {
      result.add("Caster DPS");
    } else if (["Druid", "Shaman"].includes(String(character.charClass))) {
      result.add("Physical DPS");
      result.add("Caster DPS");
    } else {
      result.add("Physical DPS");
    }
  });
  return [...result];
};

const getActiveArchetypes = (character: Character): LoadoutRole[] => {
  if (character.role !== "DPS") return [(character.role || "DPS") as LoadoutRole];
  if (["Mage", "Warlock", "Priest"].includes(String(character.charClass))) {
    return ["Caster DPS"];
  }
  if (["Druid", "Shaman"].includes(String(character.charClass))) {
    return ["Physical DPS", "Caster DPS"];
  }
  return ["Physical DPS"];
};

export const getItemRoleUtility = (
  character: Character,
  item: ItemDefinition | null | undefined,
  role: LoadoutRole,
) => {
  if (
    !item ||
    (!item.legacyCompatibility && !canCharacterEquipItem(character, item))
  ) {
    return Number.NEGATIVE_INFINITY;
  }
  const stats = getStats(item);
  const strength = Number(stats.strength) || 0;
  const agility = Number(stats.agility) || 0;
  const stamina = Number(stats.stamina) || 0;
  const intellect = Number(stats.intellect) || 0;
  const spirit = Number(stats.spirit) || 0;
  const armor = Number(stats.armor) || 0;
  const spellPower = Number(stats.spellPower) || 0;
  const healingPower = Number(stats.healingPower) || 0;
  const base = getItemEffectiveLevel(item) + (Number(item.enchant?.effectiveLevelBonus) || 0);
  const tagBonus = Array.isArray(item.roleTags) && item.roleTags.includes(role) ? 5 : 0;
  if (role === "Tank") {
    return base + stamina * 1.1 + armor * 0.04 + strength * 0.55 + agility * 0.4 + tagBonus;
  }
  if (role === "Healer") {
    return base + intellect + spirit * 0.8 + stamina * 0.3 + healingPower * 0.45 + spellPower * 0.15 + tagBonus;
  }
  if (role === "Caster DPS") {
    return base + intellect * 0.9 + spirit * 0.45 + stamina * 0.2 + spellPower * 0.45 + tagBonus;
  }
  return base + agility * 0.9 + strength * 0.8 + stamina * 0.25 + tagBonus;
};

const scoreWeaponLoadout = (
  character: Character,
  mainHand: ItemDefinition | null,
  offHand: ItemDefinition | null,
  role: LoadoutRole,
) => {
  if (!isValidWeaponLoadout(character, mainHand, offHand)) return Number.NEGATIVE_INFINITY;
  const mainScore = mainHand ? getItemRoleUtility(character, mainHand, role) : 0;
  if (mainHand && isTwoHandedItem(mainHand)) return mainScore * 2;
  return mainScore + (offHand ? getItemRoleUtility(character, offHand, role) : 0);
};

const chooseBestWeaponLoadout = (
  character: Character,
  items: ItemDefinition[],
  role: LoadoutRole,
) => {
  const mainCandidates = [
    null,
    ...items.filter((item) => getItemEquipTargets(character, item).includes("mainHand")),
  ];
  const offCandidates = [
    null,
    ...items.filter((item) => getItemEquipTargets(character, item).includes("offHand")),
  ];
  let best = { mainHand: null as ItemDefinition | null, offHand: null as ItemDefinition | null, score: 0 };
  mainCandidates.forEach((mainHand) => {
    offCandidates.forEach((offHand) => {
      const score = scoreWeaponLoadout(character, mainHand, offHand, role);
      const stableKey = `${itemKey(mainHand)}:${itemKey(offHand)}`;
      const bestKey = `${itemKey(best.mainHand)}:${itemKey(best.offHand)}`;
      if (score > best.score || (score === best.score && stableKey < bestKey)) {
        best = { mainHand, offHand, score };
      }
    });
  });
  return best;
};

const chooseBestForSlot = (
  character: Character,
  items: ItemDefinition[],
  slot: EquipmentSlot,
  role: LoadoutRole,
) =>
  items
    .filter((item) => item.slot === slot && canCharacterEquipItem(character, item, slot))
    .sort((left, right) => {
      const utilityDelta =
        getItemRoleUtility(character, right, role) -
        getItemRoleUtility(character, left, role);
      return utilityDelta || itemKey(left).localeCompare(itemKey(right));
    })[0] || null;

const dedupeItems = (items: Array<ItemDefinition | null | undefined>) => {
  const seen = new Set<string>();
  return items.filter((item): item is ItemDefinition => {
    if (!item) return false;
    const key = itemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const NON_WEAPON_SLOTS: EquipmentSlot[] = [
  "head", "neck", "shoulder", "back", "chest", "wrist", "belt",
  "hands", "legs", "feet", "trinket", "ring",
];

export const optimizeCharacterEquipment = ({
  character,
  incomingItem = null,
}: {
  character: Character;
  incomingItem?: ItemDefinition | null;
}): LoadoutResult => {
  const originalEquipment = character.equipment || {};
  const originalInventory = Array.isArray(character.personalInventory)
    ? character.personalInventory
    : [];
  const allItems = dedupeItems([
    ...Object.values(originalEquipment),
    ...originalInventory,
    incomingItem,
  ]);
  const usableItems = allItems.filter(
    (item) => item.legacyCompatibility || canCharacterEquipItem(character, item),
  );
  const activeArchetypes = getActiveArchetypes(character);
  const allArchetypes = getRoleArchetypes(character);

  const activeCandidates = activeArchetypes.map((role) => {
    const weaponLoadout = chooseBestWeaponLoadout(character, usableItems, role);
    const equipment = { ...originalEquipment };
    NON_WEAPON_SLOTS.forEach((slot) => {
      equipment[slot] = chooseBestForSlot(character, usableItems, slot, role);
    });
    equipment.mainHand =
      weaponLoadout.mainHand ||
      (originalEquipment.mainHand?.legacyCompatibility
        ? originalEquipment.mainHand
        : null);
    equipment.offHand =
      weaponLoadout.mainHand
        ? weaponLoadout.offHand
        : originalEquipment.offHand?.legacyCompatibility
          ? originalEquipment.offHand
          : null;
    equipment.ranged =
      chooseBestForSlot(character, usableItems, "ranged", role) ||
      (originalEquipment.ranged?.legacyCompatibility
        ? originalEquipment.ranged
        : null);
    const activeWeaponScore = weaponLoadout.mainHand
      ? weaponLoadout.score
      : (equipment.mainHand
          ? getItemRoleUtility(character, equipment.mainHand, role) *
            (isTwoHandedItem(equipment.mainHand) ? 2 : 1)
          : 0) +
        (equipment.offHand
          ? getItemRoleUtility(character, equipment.offHand, role)
          : 0);
    const score =
      NON_WEAPON_SLOTS.reduce(
        (sum, slot) => sum + (equipment[slot] ? getItemRoleUtility(character, equipment[slot], role) : 0),
        0,
      ) +
      activeWeaponScore +
      (equipment.ranged ? getItemRoleUtility(character, equipment.ranged, role) : 0) +
      getEquipmentSetBonus(equipment);
    return { role, equipment, score };
  });
  const active = activeCandidates.sort(
    (left, right) => right.score - left.score || String(left.role).localeCompare(String(right.role)),
  )[0] || { equipment: { ...originalEquipment }, score: 0 };
  const previousScore = Math.max(
    0,
    ...activeArchetypes.map((role) => {
      const mainHand = originalEquipment.mainHand || null;
      const offHand = originalEquipment.offHand || null;
      return (
        NON_WEAPON_SLOTS.reduce(
          (sum, slot) =>
            sum +
            (originalEquipment[slot]
              ? getItemRoleUtility(character, originalEquipment[slot], role)
              : 0),
          0,
        ) +
        Math.max(0, scoreWeaponLoadout(character, mainHand, offHand, role)) +
        (originalEquipment.ranged
          ? getItemRoleUtility(character, originalEquipment.ranged, role)
          : 0) +
        getEquipmentSetBonus(originalEquipment)
      );
    }),
  );

  const protectedKeys = new Set<string>();
  Object.values(active.equipment).forEach((item) => item && protectedKeys.add(itemKey(item)));
  allArchetypes.forEach((role) => {
    const weapons = chooseBestWeaponLoadout(character, usableItems, role);
    if (weapons.mainHand) protectedKeys.add(itemKey(weapons.mainHand));
    if (weapons.offHand) protectedKeys.add(itemKey(weapons.offHand));
    const bestMain = chooseBestForSlot(character, usableItems, "mainHand", role);
    const bestOff = chooseBestForSlot(character, usableItems, "offHand", role);
    if (bestMain) protectedKeys.add(itemKey(bestMain));
    if (bestOff) protectedKeys.add(itemKey(bestOff));
    [...NON_WEAPON_SLOTS, "ranged" as EquipmentSlot].forEach((slot) => {
      const best = chooseBestForSlot(character, usableItems, slot, role);
      if (best) protectedKeys.add(itemKey(best));
    });
  });
  usableItems
    .filter((item) => item.setId)
    .forEach((item) => protectedKeys.add(itemKey(item)));
  usableItems
    .filter((item) => item.legacyCompatibility)
    .forEach((item) => protectedKeys.add(itemKey(item)));

  const equippedKeys = new Set(
    Object.values(active.equipment).filter(Boolean).map((item) => itemKey(item)),
  );
  let stored = usableItems.filter(
    (item) => !equippedKeys.has(itemKey(item)) && protectedKeys.has(itemKey(item)),
  );
  if (stored.length > MAX_PERSONAL_EQUIPMENT_ITEMS) {
    stored = stored
      .sort((left, right) => {
        const leftBest = Math.max(...allArchetypes.map((role) => getItemRoleUtility(character, left, role)));
        const rightBest = Math.max(...allArchetypes.map((role) => getItemRoleUtility(character, right, role)));
        return rightBest - leftBest || itemKey(left).localeCompare(itemKey(right));
      })
      .slice(0, MAX_PERSONAL_EQUIPMENT_ITEMS);
  }
  const retainedKeys = new Set([
    ...equippedKeys,
    ...stored.map((item) => itemKey(item)),
  ]);
  const soldItems = allItems.filter(
    (item) => !retainedKeys.has(itemKey(item)) && !item.legacyCompatibility,
  );
  const soldGold = soldItems.reduce((sum, item) => sum + itemSellValue(item), 0);
  const incomingKey = incomingItem ? itemKey(incomingItem) : "";
  const outcome =
    !incomingItem
      ? "unchanged"
      : equippedKeys.has(incomingKey)
        ? "equipped"
        : stored.some((item) => itemKey(item) === incomingKey)
          ? "stored"
          : "sold";

  return {
    character: {
      ...character,
      equipment: active.equipment,
      personalInventory: stored,
    },
    equippedItemIds: [...equippedKeys],
    storedItemIds: stored.map(itemKey),
    soldItems,
    soldGold,
    loadoutGain: Math.max(0, active.score - previousScore),
    outcome,
  };
};
