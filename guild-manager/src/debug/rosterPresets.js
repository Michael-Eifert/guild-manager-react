import { CONFIG, DB_CLASSES, DB_ITEMS } from "../constants";
import {
  generateCharacter,
  getClassArmorTypes,
  getItemEffectiveLevel,
  getReqExp,
  isItemUsableByClass,
} from "../utils";

const DEBUG_PARTY_ROLE_ORDER = ["Tank", "Healer", "DPS", "DPS", "DPS"];
const DEBUG_PARTY_SIZE = 5;
export const DEBUG_RAID_PRESET_ID = "raid-ready-60";
const DEBUG_RAID_SIZE = 20;
const DEBUG_RAID_ROLE_ORDER = [
  "Tank",
  "Tank",
  "Healer",
  "Healer",
  "Healer",
  "Healer",
  "DPS",
  "DPS",
  "DPS",
  "DPS",
  "DPS",
  "DPS",
  "DPS",
  "DPS",
  "DPS",
  "DPS",
  "DPS",
  "DPS",
  "DPS",
  "DPS",
];
const DEBUG_GEAR_SLOTS = ["head", "chest", "legs", "feet", "hands", "mainHand"];
const MAX_DEBUG_PRESET_ITEM_QUALITY = 3;
const MOLTEN_CORE_ATTUNEMENT_KEY_ID = "molten_core_attunement";

export const DEBUG_PRESET_OPTIONS = [
  { value: "party-20", label: "Add 5 lv20 Characters" },
  { value: "party-30", label: "Add 5 lv30 Characters" },
  { value: "party-40", label: "Add 5 lv40 Characters" },
  { value: "party-50", label: "Add 5 lv50 Characters" },
  { value: "party-60", label: "Add 5 lv60 Characters" },
  { value: DEBUG_RAID_PRESET_ID, label: "Add 20 lv60 Characters Raid-Rdy" },
];

const isWorldDropItem = (item) =>
  !(
    (typeof item?.dungeon === "string" && item.dungeon.trim()) ||
    (typeof item?.dungeonSetId === "string" && item.dungeonSetId.trim())
  );

const getDebugGearItemForSlot = (charClass, level, slot) => {
  const allowedArmorTypes = getClassArmorTypes(charClass, level);
  const levelCap = Math.max(1, Number(level) || 1);
  const minTargetLevel = Math.max(1, levelCap - 10);

  const canUseItem = (item) => {
    if (!item || item.slot !== slot) return false;
    if (!isWorldDropItem(item)) return false;
    if (!isItemUsableByClass(item, charClass)) return false;
    const quality = Number(item.quality) || 0;
    if (quality > MAX_DEBUG_PRESET_ITEM_QUALITY) return false;
    if ((Number(item.minLevel) || 0) > levelCap) return false;
    if (slot === "mainHand") return item.type === "Generic";
    return item.type === "Generic" || allowedArmorTypes.includes(item.type);
  };

  const scoreItem = (item) => {
    const effectiveLevel = getItemEffectiveLevel(item);
    const itemLevel = Number(item.minLevel) || 1;
    const levelDistance = Math.abs(levelCap - itemLevel);
    const quality = Number(item.quality) || 0;
    return effectiveLevel * 100 + quality * 5 - levelDistance * 2;
  };

  let candidates = DB_ITEMS.filter(
    (item) => canUseItem(item) && (Number(item.minLevel) || 0) >= minTargetLevel,
  );
  if (candidates.length === 0) {
    candidates = DB_ITEMS.filter(canUseItem);
  }
  if (candidates.length === 0) return null;

  candidates.sort((left, right) => scoreItem(right) - scoreItem(left));
  return candidates[0] || null;
};

const buildDebugReadyCharacter = (char, targetLevel, targetRole) => {
  const safeLevel = Math.max(1, Math.min(CONFIG.LEVEL_CAP, Number(targetLevel) || 1));
  const baseSkill = Math.max(1, Math.min(300, safeLevel * 5));
  const maxExp = getReqExp(safeLevel);

  const seeded = {
    ...char,
    role: targetRole,
    level: safeLevel,
    exp: 0,
    maxExp,
    status: "Idle",
    statusText: "Ready for dungeon testing.",
    activityMode: "Auto",
    professions: Array.isArray(char.professions)
      ? char.professions.map((prof) => ({ ...prof, skill: baseSkill }))
      : [],
  };

  const nextEquipment = { ...(seeded.equipment || {}) };
  DEBUG_GEAR_SLOTS.forEach((slot) => {
    const selectedItem = getDebugGearItemForSlot(seeded.charClass, safeLevel, slot);
    if (selectedItem) {
      nextEquipment[slot] = selectedItem;
    }
  });

  return {
    ...seeded,
    equipment: nextEquipment,
  };
};

const pickDebugCharacterForRole = (faction, role, usedNameKeys) => {
  const maxAttempts = 300;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generateCharacter(faction, null, { usedNameKeys });
    if (candidate?.role === role) return candidate;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const fallback = generateCharacter(faction, null, { usedNameKeys });
    const allowedRoles = DB_CLASSES?.[fallback?.charClass]?.allowedRoles || [];
    if (allowedRoles.includes(role)) {
      return { ...fallback, role };
    }
  }

  return { ...generateCharacter(faction, null, { usedNameKeys }), role };
};

export const buildDebugRosterPreset = ({
  faction,
  level,
  count,
  roleOrder,
  guaranteedKeys = [],
  usedNames = [],
}) => {
  const safeCount = Math.max(1, Math.floor(Number(count) || 1));
  const rolePattern =
    Array.isArray(roleOrder) && roleOrder.length > 0
      ? roleOrder
      : DEBUG_PARTY_ROLE_ORDER;
  const usedNameKeys = new Set(
    (Array.isArray(usedNames) ? usedNames : [])
      .map((name) => String(name || "").trim().toLocaleLowerCase())
      .filter(Boolean),
  );

  return Array.from({ length: safeCount }, (_, index) => {
    const role = rolePattern[index % rolePattern.length];
    const seeded = buildDebugReadyCharacter(
      pickDebugCharacterForRole(faction, role, usedNameKeys),
      level,
      role,
    );
    if (!Array.isArray(guaranteedKeys) || guaranteedKeys.length === 0) {
      return seeded;
    }

    const existingKeys = Array.isArray(seeded.keys)
      ? seeded.keys.map((keyId) => String(keyId || "").trim()).filter(Boolean)
      : [];
    const mergedKeys = [
      ...new Set([
        ...existingKeys,
        ...guaranteedKeys
          .map((keyId) => String(keyId || "").trim())
          .filter(Boolean),
      ]),
    ];

    return {
      ...seeded,
      keys: mergedKeys,
      statusText: mergedKeys.includes(MOLTEN_CORE_ATTUNEMENT_KEY_ID)
        ? "Raid-ready and attuned."
        : seeded.statusText,
    };
  });
};

export const resolveDebugPreset = (input) => {
  const raw = String(input ?? "").trim();
  if (raw === DEBUG_RAID_PRESET_ID) {
    return {
      level: 60,
      count: DEBUG_RAID_SIZE,
      roleOrder: DEBUG_RAID_ROLE_ORDER,
      guaranteedKeys: [MOLTEN_CORE_ATTUNEMENT_KEY_ID],
      successTitle: "Debug Raid Roster Added",
      successMessage: (faction) =>
        `Added ${DEBUG_RAID_SIZE} level 60 heroes (${faction}) with raid-ready gear and Molten Core Attunement.`,
      blockedMessage: `Need ${DEBUG_RAID_SIZE} free guild slots to add the raid-ready roster.`,
    };
  }

  const matchedPartyLevel = raw.match(/^party-(\d+)$/);
  const fallbackLevel = Number.isFinite(Number(raw))
    ? Number(raw)
    : matchedPartyLevel
      ? Number(matchedPartyLevel[1])
      : 20;
  const safeLevel = Math.max(1, Math.min(CONFIG.LEVEL_CAP, fallbackLevel || 1));

  return {
    level: safeLevel,
    count: DEBUG_PARTY_SIZE,
    roleOrder: DEBUG_PARTY_ROLE_ORDER,
    guaranteedKeys: [],
    successTitle: "Debug Party Added",
    successMessage: (faction) =>
      `Added ${DEBUG_PARTY_SIZE} level ${safeLevel} heroes (${faction}) with dungeon-ready gear.`,
    blockedMessage: `Need ${DEBUG_PARTY_SIZE} free guild slots to add a full debug party.`,
  };
};
