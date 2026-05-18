import { CONFIG, DB_CLASSES } from "../constants";
import { DB_ITEMS } from "../data/items";
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
export const DEBUG_MOLTEN_CORE_TEST_GUILD_ID = "molten-core-test-guild";
export const DEBUG_BLACKWING_LAIR_TEST_GUILD_ID = "blackwing-lair-test-guild";
export const DEBUG_NAXXRAMAS_TEST_GUILD_ID = "naxxramas-test-guild";
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
const DEBUG_MOLTEN_CORE_RAID_SIZE = 40;
export const DEBUG_MOLTEN_CORE_ROLE_ORDER = Object.freeze([
  "Tank",
  "Tank",
  "Tank",
  "Tank",
  "Healer",
  "Healer",
  "Healer",
  "Healer",
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
]);
const DEBUG_GEAR_SLOTS = ["head", "chest", "legs", "feet", "hands", "mainHand"];
const MAX_DEBUG_PRESET_ITEM_QUALITY = 3;
const MOLTEN_CORE_ATTUNEMENT_KEY_ID = "molten_core_attunement";
const BLACKWING_LAIR_ATTUNEMENT_KEY_ID = "blackwing_lair_attunement";

const DEBUG_GEAR_PROFILES = Object.freeze({
  DUNGEON_READY: Object.freeze({
    id: "dungeon-ready",
    worldOnly: true,
    maxQuality: MAX_DEBUG_PRESET_ITEM_QUALITY,
    statusText: "Ready for dungeon testing.",
  }),
  BLACKWING_LAIR_READY: Object.freeze({
    id: "blackwing-lair-ready",
    sourcePriority: Object.freeze([
      "zul_gurub",
      "ahn_qiraj_ruins",
      "molten_core",
      "blackrock_spire",
      "stratholme",
    ]),
    preferredSetPrefixes: Object.freeze(["t1_"]),
    minItemLevel: 58,
    maxItemLevel: 70,
    targetItemLevel: 68,
    maxQuality: 4,
    statusText: "BWL-ready and attuned.",
  }),
  NAXXRAMAS_READY: Object.freeze({
    id: "naxxramas-ready",
    sourcePriority: Object.freeze([
      "blackwing_lair",
      "onyxias_lair",
      "ahn_qiraj_temple",
      "zul_gurub",
      "ahn_qiraj_ruins",
      "molten_core",
    ]),
    preferredSetPrefixes: Object.freeze(["t2_"]),
    minItemLevel: 70,
    maxItemLevel: 80,
    targetItemLevel: 76,
    maxQuality: 4,
    statusText: "Naxx-ready and attuned.",
  }),
});

const getGearProfileStatusText = (gearProfile) => {
  if (gearProfile?.id && gearProfile.id !== DEBUG_GEAR_PROFILES.DUNGEON_READY.id) {
    return gearProfile.statusText || "";
  }
  return "";
};

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

const getDebugItemSourceId = (item) =>
  String(item?.dungeonSetId || item?.dungeon || "").trim();

const getProfileSourceRank = (item, gearProfile) => {
  const sourcePriority = Array.isArray(gearProfile?.sourcePriority)
    ? gearProfile.sourcePriority
    : [];
  const sourceId = getDebugItemSourceId(item);
  const rank = sourcePriority.indexOf(sourceId);
  return rank >= 0 ? rank : Number.POSITIVE_INFINITY;
};

const getProfileSetScore = (item, gearProfile) => {
  const setId = String(item?.setId || "").trim();
  if (!setId) return 0;
  const preferredSetPrefixes = Array.isArray(gearProfile?.preferredSetPrefixes)
    ? gearProfile.preferredSetPrefixes
    : [];
  return preferredSetPrefixes.some((prefix) => setId.startsWith(prefix)) ? 20 : 0;
};

const getDebugGearItemForSlot = (
  charClass,
  level,
  slot,
  gearProfile = DEBUG_GEAR_PROFILES.DUNGEON_READY,
) => {
  const allowedArmorTypes = getClassArmorTypes(charClass, level);
  const levelCap = Math.max(1, Number(level) || 1);
  const minTargetLevel = Math.max(1, levelCap - 10);
  const profileSourcePriority = Array.isArray(gearProfile?.sourcePriority)
    ? gearProfile.sourcePriority
    : [];
  const maxQuality = Number.isFinite(Number(gearProfile?.maxQuality))
    ? Number(gearProfile.maxQuality)
    : MAX_DEBUG_PRESET_ITEM_QUALITY;

  const canUseItem = (item) => {
    if (!item || item.slot !== slot) return false;
    if (gearProfile?.worldOnly && !isWorldDropItem(item)) return false;
    if (!isItemUsableByClass(item, charClass)) return false;
    const quality = Number(item.quality) || 0;
    if (quality > maxQuality) return false;
    if ((Number(item.minLevel) || 0) > levelCap) return false;
    if (slot === "mainHand") return item.type === "Generic";
    return item.type === "Generic" || allowedArmorTypes.includes(item.type);
  };

  const matchesProfileSource = (item) => {
    if (profileSourcePriority.length === 0) return true;
    return profileSourcePriority.includes(getDebugItemSourceId(item));
  };

  const matchesProfileItemLevel = (item) => {
    const itemLevel = getItemEffectiveLevel(item);
    const minItemLevel = Number(gearProfile?.minItemLevel);
    const maxItemLevel = Number(gearProfile?.maxItemLevel);
    if (Number.isFinite(minItemLevel) && itemLevel < minItemLevel) return false;
    if (Number.isFinite(maxItemLevel) && itemLevel > maxItemLevel) return false;
    return true;
  };

  const scoreItem = (item) => {
    const effectiveLevel = getItemEffectiveLevel(item);
    const itemLevel = Number(item.minLevel) || 1;
    const targetItemLevel = Number.isFinite(Number(gearProfile?.targetItemLevel))
      ? Number(gearProfile.targetItemLevel)
      : levelCap;
    const effectiveLevelDistance = Math.abs(targetItemLevel - effectiveLevel);
    const levelDistance = Math.abs(levelCap - itemLevel);
    const quality = Number(item.quality) || 0;
    const sourceRank = getProfileSourceRank(item, gearProfile);
    const sourceScore = Number.isFinite(sourceRank)
      ? Math.max(0, profileSourcePriority.length - sourceRank) * 4
      : 0;
    return (
      effectiveLevel * 20 +
      quality * 12 +
      sourceScore +
      getProfileSetScore(item, gearProfile) -
      effectiveLevelDistance * 16 -
      levelDistance * 2
    );
  };

  let candidates = DB_ITEMS.filter(
    (item) =>
      canUseItem(item) &&
      matchesProfileSource(item) &&
      matchesProfileItemLevel(item),
  );
  if (candidates.length === 0) {
    candidates = DB_ITEMS.filter(
      (item) => canUseItem(item) && matchesProfileItemLevel(item),
    );
  }
  if (candidates.length === 0) {
    candidates = DB_ITEMS.filter((item) => canUseItem(item) && matchesProfileSource(item));
  }
  if (candidates.length === 0) {
    candidates = DB_ITEMS.filter(
      (item) => canUseItem(item) && (Number(item.minLevel) || 0) >= minTargetLevel,
    );
  }
  if (candidates.length === 0) {
    candidates = DB_ITEMS.filter(canUseItem);
  }
  if (candidates.length === 0) return null;

  candidates.sort((left, right) => scoreItem(right) - scoreItem(left));
  return candidates[0] || null;
};

const buildDebugReadyCharacter = (
  char,
  targetLevel,
  targetRole,
  gearProfile = DEBUG_GEAR_PROFILES.DUNGEON_READY,
) => {
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
    statusText: gearProfile?.statusText || "Ready for dungeon testing.",
    activityMode: "Auto",
    professions: Array.isArray(char.professions)
      ? char.professions.map((prof) => ({ ...prof, skill: baseSkill }))
      : [],
  };

  const nextEquipment = { ...(seeded.equipment || {}) };
  DEBUG_GEAR_SLOTS.forEach((slot) => {
    const selectedItem = getDebugGearItemForSlot(
      seeded.charClass,
      safeLevel,
      slot,
      gearProfile,
    );
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
  gearProfile = DEBUG_GEAR_PROFILES.DUNGEON_READY,
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
      gearProfile,
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
      statusText:
        getGearProfileStatusText(gearProfile) ||
        (mergedKeys.includes(MOLTEN_CORE_ATTUNEMENT_KEY_ID)
          ? "Raid-ready and attuned."
          : seeded.statusText),
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
      gearProfile: DEBUG_GEAR_PROFILES.DUNGEON_READY,
      successTitle: "Debug Raid Roster Added",
      successMessage: (faction) =>
        `Added ${DEBUG_RAID_SIZE} level 60 heroes (${faction}) with raid-ready gear and Molten Core Attunement.`,
      blockedMessage: `Need ${DEBUG_RAID_SIZE} free guild slots to add the raid-ready roster.`,
    };
  }

  if (raw === DEBUG_MOLTEN_CORE_TEST_GUILD_ID) {
    return {
      level: 60,
      count: DEBUG_MOLTEN_CORE_RAID_SIZE,
      roleOrder: DEBUG_MOLTEN_CORE_ROLE_ORDER,
      guaranteedKeys: [MOLTEN_CORE_ATTUNEMENT_KEY_ID],
      gearProfile: DEBUG_GEAR_PROFILES.DUNGEON_READY,
      successTitle: "Molten Core Test Guild Ready",
      successMessage: (faction) =>
        `Prepared an 80-slot ${faction} guild with a full 40-player Molten Core raid team.`,
      blockedMessage: "",
      logMessage: "Debug setup: Molten Core test guild is raid-ready.",
    };
  }

  if (raw === DEBUG_BLACKWING_LAIR_TEST_GUILD_ID) {
    return {
      level: 60,
      count: DEBUG_MOLTEN_CORE_RAID_SIZE,
      roleOrder: DEBUG_MOLTEN_CORE_ROLE_ORDER,
      guaranteedKeys: [
        MOLTEN_CORE_ATTUNEMENT_KEY_ID,
        BLACKWING_LAIR_ATTUNEMENT_KEY_ID,
      ],
      gearProfile: DEBUG_GEAR_PROFILES.BLACKWING_LAIR_READY,
      successTitle: "Blackwing Lair Test Guild Ready",
      successMessage: (faction) =>
        `Prepared an 80-slot ${faction} guild with a full 40-player BWL raid team, MC attunement, and BWL attunement.`,
      blockedMessage: "",
      logMessage: "Debug setup: Blackwing Lair test guild is raid-ready.",
    };
  }

  if (raw === DEBUG_NAXXRAMAS_TEST_GUILD_ID) {
    return {
      level: 60,
      count: DEBUG_MOLTEN_CORE_RAID_SIZE,
      roleOrder: DEBUG_MOLTEN_CORE_ROLE_ORDER,
      guaranteedKeys: [
        MOLTEN_CORE_ATTUNEMENT_KEY_ID,
        BLACKWING_LAIR_ATTUNEMENT_KEY_ID,
      ],
      gearProfile: DEBUG_GEAR_PROFILES.NAXXRAMAS_READY,
      successTitle: "Naxxramas Test Guild Ready",
      successMessage: (faction) =>
        `Prepared an 80-slot ${faction} guild with a full 40-player Naxx raid team, MC attunement, and BWL attunement.`,
      blockedMessage: "",
      logMessage: "Debug setup: Naxxramas test guild is raid-ready.",
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
    gearProfile: DEBUG_GEAR_PROFILES.DUNGEON_READY,
    successTitle: "Debug Party Added",
    successMessage: (faction) =>
      `Added ${DEBUG_PARTY_SIZE} level ${safeLevel} heroes (${faction}) with dungeon-ready gear.`,
    blockedMessage: `Need ${DEBUG_PARTY_SIZE} free guild slots to add a full debug party.`,
  };
};
