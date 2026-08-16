import {
  ensureGuildInventory,
  removeItemFromGuildInventory,
} from "../inventory/guildInventoryUtils";
import {
  getAllInventoryItemDefinitions,
  getInventoryItemDefinition,
} from "../inventory/itemDefinitions";
import type { Character } from "../types/characterTypes";
import type {
  GuildInventory,
  InventoryItemDefinition,
  RunPreparationCategory,
} from "../types/itemTypes";
import type { Mission } from "../types/missionTypes";
import { getCharacterProfessionSkill } from "./professionUtils";

export const CONSUMABLE_MODE = Object.freeze({
  NONE: "none",
  BASIC: "basic",
  BEST: "best",
});

export type ConsumableMode =
  typeof CONSUMABLE_MODE[keyof typeof CONSUMABLE_MODE];

export const ENGINEERING_STRATEGY = Object.freeze({
  AUTO: "auto",
  OFFENSE: "offense",
  SAFETY: "safety",
});

export type EngineeringStrategy =
  typeof ENGINEERING_STRATEGY[keyof typeof ENGINEERING_STRATEGY];

export const RUN_PREPARATION_CATEGORIES = Object.freeze([
  "alchemy",
  "food",
  "firstAid",
  "engineering",
  "weapon",
] satisfies RunPreparationCategory[]);

export const RUN_PREPARATION_CATEGORY_LABELS = Object.freeze({
  alchemy: "Alchemy",
  food: "Food",
  firstAid: "First Aid",
  engineering: "Engineering",
  weapon: "Weapon Supplies",
} satisfies Record<RunPreparationCategory, string>);

export const RUN_PREPARATION_CATEGORY_CAPS = Object.freeze({
  alchemy: 6,
  food: 3,
  firstAid: 2,
  engineering: 3,
  weapon: 1,
} satisfies Record<RunPreparationCategory, number>);

export const RUN_PREPARATION_TOTAL_CAP = 15;

export interface RunPreparationSelection {
  mode: ConsumableMode;
  enabledCategories: Record<RunPreparationCategory, boolean>;
  engineeringStrategy: EngineeringStrategy;
}

export interface ConsumedItem {
  itemId: string;
  quantity: number;
  coverageDenominator: number;
  name: string;
  category: RunPreparationCategory;
  bonusPercent: number;
}

export interface RunPreparationCategoryBreakdown {
  category: RunPreparationCategory;
  label: string;
  bonusPercent: number;
  capPercent: number;
  coverage: number;
  usedUnits: number;
  requiredUnits: number;
  availableUnits: number;
  eligibleParticipants: number;
  consumedItems: ConsumedItem[];
}

export interface RunPreparationPlan {
  mode: ConsumableMode;
  selection: RunPreparationSelection;
  consumedItems: ConsumedItem[];
  categoryBreakdown: RunPreparationCategoryBreakdown[];
  rawBonusPercent: number;
  successBonusPercent: number;
  failReductionPercent: number;
  totalCapPercent: number;
  chainMultiplier: number;
  repairCostMultiplier: number;
  warnings: string[];
  hasConsumables: boolean;
  effects: {
    dungeonSuccessBonus: number;
    raidSuccessBonus: number;
    wipeChanceReduction: number;
  };
}

export type ConsumableMissionModifiers = RunPreparationPlan;

export const CONSUMABLE_MODE_OPTIONS = Object.freeze([
  { value: CONSUMABLE_MODE.NONE, label: "No Preparation" },
  { value: CONSUMABLE_MODE.BASIC, label: "Basic Preparation" },
  { value: CONSUMABLE_MODE.BEST, label: "Best Available" },
]);

const roundOne = (value: number) => Math.round(value * 10) / 10;

export const createRunPreparationSelection = (
  mode: ConsumableMode = CONSUMABLE_MODE.NONE,
): RunPreparationSelection => ({
  mode,
  enabledCategories: Object.fromEntries(
    RUN_PREPARATION_CATEGORIES.map((category) => [category, mode !== CONSUMABLE_MODE.NONE]),
  ) as Record<RunPreparationCategory, boolean>,
  engineeringStrategy: ENGINEERING_STRATEGY.AUTO,
});

export const normalizeRunPreparationSelection = (
  value: Partial<RunPreparationSelection> | ConsumableMode | null | undefined,
): RunPreparationSelection => {
  const rawMode = typeof value === "string" ? value : value?.mode;
  const mode = Object.values(CONSUMABLE_MODE).includes(rawMode as ConsumableMode)
    ? rawMode as ConsumableMode
    : CONSUMABLE_MODE.NONE;
  const defaults = createRunPreparationSelection(mode);
  if (!value || typeof value === "string") return defaults;
  const strategy = Object.values(ENGINEERING_STRATEGY).includes(value.engineeringStrategy as EngineeringStrategy)
    ? value.engineeringStrategy as EngineeringStrategy
    : ENGINEERING_STRATEGY.AUTO;
  return {
    mode,
    enabledCategories: Object.fromEntries(
      RUN_PREPARATION_CATEGORIES.map((category) => [
        category,
        mode !== CONSUMABLE_MODE.NONE && value.enabledCategories?.[category] !== false,
      ]),
    ) as Record<RunPreparationCategory, boolean>,
    engineeringStrategy: strategy,
  };
};

const getPreparationItems = (category: RunPreparationCategory) =>
  getAllInventoryItemDefinitions()
    .filter((definition) => definition.runPreparation?.category === category)
    .sort((left, right) =>
      (right.runPreparation?.tier || 0) - (left.runPreparation?.tier || 0));

const getProfessionSkill = (member: Character, professionName?: string) =>
  professionName ? getCharacterProfessionSkill(member, professionName) : 0;

const getFoodPreference = (member: Character): "strength" | "agility" | "caster" => {
  const role = String(member.role || "").toLowerCase();
  const charClass = String(member.charClass || member.class || "");
  if (role === "healer" || ["Mage", "Priest", "Warlock"].includes(charClass)) return "caster";
  if (["Rogue", "Hunter", "Druid"].includes(charClass)) return "agility";
  return "strength";
};

const isPhysicalMember = (member: Character) => {
  const role = String(member.role || "").toLowerCase();
  const charClass = String(member.charClass || member.class || "");
  if (role === "tank") return true;
  return ["Warrior", "Paladin", "Hunter", "Rogue", "Shaman", "Druid"].includes(charClass) && role !== "healer";
};

const getCandidates = ({
  category,
  mode,
  subtype,
}: {
  category: RunPreparationCategory;
  mode: ConsumableMode;
  subtype?: string;
}) => getPreparationItems(category).filter((definition) => {
  const metadata = definition.runPreparation;
  if (!metadata) return false;
  if (subtype && metadata.subtype !== subtype) return false;
  return mode !== CONSUMABLE_MODE.BASIC || metadata.basic === true;
});

export const getRunPreparationPlan = ({
  mode = CONSUMABLE_MODE.NONE,
  selection,
  mission,
  partySize = 0,
  partyMembers = [],
  chainMultiplier = 1,
  guildInventory,
}: {
  mode?: ConsumableMode;
  selection?: Partial<RunPreparationSelection> | null;
  mission?: Pick<Mission, "isRaid"> | null;
  partySize?: number;
  partyMembers?: Character[];
  chainMultiplier?: number;
  guildInventory: GuildInventory;
}): RunPreparationPlan => {
  const normalizedSelection = normalizeRunPreparationSelection(selection || mode);
  const safeMode = normalizedSelection.mode;
  const safePartySize = Math.max(1, Math.floor(Number(partySize) || partyMembers.length || 1));
  const safeChainMultiplier = Math.max(1, Math.floor(Number(chainMultiplier) || 1));
  const members = Array.isArray(partyMembers) ? partyMembers : [];
  const inventory = ensureGuildInventory(guildInventory);
  const available = new Map<string, number>(
    Object.entries(inventory.items).map(([itemId, quantity]) => [itemId, Math.max(0, Number(quantity) || 0)]),
  );
  const consumed = new Map<string, ConsumedItem>();
  const warnings: string[] = [];
  const categoryBonuses = new Map<RunPreparationCategory, number>();
  const categoryCoverage = new Map<RunPreparationCategory, number>();
  const categoryUsed = new Map<RunPreparationCategory, number>();
  const categoryRequired = new Map<RunPreparationCategory, number>();
  const categoryAvailable = new Map<RunPreparationCategory, number>();
  const categoryEligible = new Map<RunPreparationCategory, number>();
  let repairCostMultiplier = 1;

  const take = (
    definition: InventoryItemDefinition,
    desired: number,
    denominator: number,
  ) => {
    const itemId = String(definition.id);
    const quantity = Math.max(0, Math.min(Math.floor(desired), available.get(itemId) || 0));
    if (quantity <= 0) return 0;
    available.set(itemId, (available.get(itemId) || 0) - quantity);
    const metadata = definition.runPreparation!;
    const existing = consumed.get(itemId);
    consumed.set(itemId, {
      itemId,
      quantity: (existing?.quantity || 0) + quantity,
      coverageDenominator: Math.max(existing?.coverageDenominator || 0, denominator),
      name: definition.name,
      category: metadata.category,
      bonusPercent: metadata.bonusPercent,
    });
    return quantity;
  };

  const allocateBest = ({
    category,
    candidates,
    desired,
    denominator,
    maxUsable = desired,
  }: {
    category: RunPreparationCategory;
    candidates: InventoryItemDefinition[];
    desired: number;
    denominator: number;
    maxUsable?: number;
  }) => {
    let remaining = Math.max(0, Math.min(desired, maxUsable));
    let contribution = 0;
    let used = 0;
    candidates.forEach((definition) => {
      if (remaining <= 0) return;
      const quantity = take(definition, remaining, denominator);
      if (quantity <= 0) return;
      remaining -= quantity;
      used += quantity;
      contribution += (quantity / Math.max(1, denominator)) * (definition.runPreparation?.bonusPercent || 0);
    });
    categoryBonuses.set(category, (categoryBonuses.get(category) || 0) + contribution);
    categoryUsed.set(category, (categoryUsed.get(category) || 0) + used);
    categoryCoverage.set(category, Math.max(categoryCoverage.get(category) || 0, used / Math.max(1, denominator)));
    return { used, contribution };
  };

  if (safeMode !== CONSUMABLE_MODE.NONE && normalizedSelection.enabledCategories.alchemy) {
    const denominator = safePartySize * safeChainMultiplier;
    categoryRequired.set("alchemy", denominator * 2);
    categoryEligible.set("alchemy", safePartySize);
    const potionOrder = safeMode === CONSUMABLE_MODE.BEST
      ? ["major_healing_potion", "healing_potion", "minor_healing_potion"]
      : ["healing_potion", "minor_healing_potion"];
    const tonicOrder = safeMode === CONSUMABLE_MODE.BEST
      ? mission?.isRaid
        ? ["flask_supreme_power", "flask_of_the_titans", "elixir_of_power", "elixir_of_fortitude"]
        : ["flask_of_the_titans", "flask_supreme_power", "elixir_of_fortitude", "elixir_of_power"]
      : ["elixir_of_fortitude"];
    const byIds = (ids: string[]) => ids.map((id) => getInventoryItemDefinition(id)).filter(Boolean) as InventoryItemDefinition[];
    categoryAvailable.set("alchemy", [...potionOrder, ...tonicOrder].reduce((sum, itemId) => sum + (available.get(itemId) || 0), 0));
    allocateBest({ category: "alchemy", candidates: byIds(potionOrder), desired: denominator, denominator });
    let remainingTonicUnits = denominator;
    for (const definition of byIds(tonicOrder)) {
      if (remainingTonicUnits <= 0) break;
      const itemBonus = definition.runPreparation?.bonusPercent || 0;
      const remainingAlchemyCap = RUN_PREPARATION_CATEGORY_CAPS.alchemy - (categoryBonuses.get("alchemy") || 0);
      const maxQuantityWithinCap = itemBonus > 0
        ? Math.floor((remainingAlchemyCap * denominator + 0.0001) / itemBonus)
        : 0;
      const quantity = take(definition, Math.min(remainingTonicUnits, maxQuantityWithinCap), denominator);
      if (quantity <= 0) continue;
      remainingTonicUnits -= quantity;
      categoryUsed.set("alchemy", (categoryUsed.get("alchemy") || 0) + quantity);
      categoryBonuses.set("alchemy", (categoryBonuses.get("alchemy") || 0) + (quantity / denominator) * itemBonus);
    }
    categoryBonuses.set("alchemy", Math.min(RUN_PREPARATION_CATEGORY_CAPS.alchemy, categoryBonuses.get("alchemy") || 0));
    categoryCoverage.set("alchemy", (categoryUsed.get("alchemy") || 0) / Math.max(1, denominator * 2));
  }

  if (safeMode !== CONSUMABLE_MODE.NONE && normalizedSelection.enabledCategories.food) {
    const candidates = getCandidates({ category: "food", mode: safeMode });
    categoryRequired.set("food", safePartySize * safeChainMultiplier);
    categoryAvailable.set("food", candidates.reduce((sum, definition) => sum + (available.get(String(definition.id)) || 0), 0));
    categoryEligible.set("food", safePartySize);
    const participantList = members.length > 0
      ? members
      : Array.from({ length: safePartySize }, (_, index) => ({ id: `generic-${index}`, charClass: "Warrior" } as Character));
    let totalContribution = 0;
    let covered = 0;
    for (let wing = 0; wing < safeChainMultiplier; wing += 1) {
      participantList.slice(0, safePartySize).forEach((member) => {
        const preference = getFoodPreference(member);
        const ordered = candidates.filter((definition) => {
          const foodRole = definition.runPreparation?.rolePreference;
          return foodRole === preference || foodRole === "generic";
        }).sort((left, right) => {
          const leftMatch = left.runPreparation?.rolePreference === preference ? 1 : left.runPreparation?.rolePreference === "generic" ? 0 : -1;
          const rightMatch = right.runPreparation?.rolePreference === preference ? 1 : right.runPreparation?.rolePreference === "generic" ? 0 : -1;
          return rightMatch - leftMatch || (right.runPreparation?.tier || 0) - (left.runPreparation?.tier || 0);
        });
        const chosen = ordered.find((definition) => (available.get(String(definition.id)) || 0) > 0);
        if (!chosen) return;
        if (take(chosen, 1, safePartySize * safeChainMultiplier) > 0) {
          covered += 1;
          categoryUsed.set("food", (categoryUsed.get("food") || 0) + 1);
          totalContribution += (chosen.runPreparation?.bonusPercent || 0) / (safePartySize * safeChainMultiplier);
        }
      });
    }
    categoryBonuses.set("food", Math.min(RUN_PREPARATION_CATEGORY_CAPS.food, totalContribution));
    categoryCoverage.set("food", covered / (safePartySize * safeChainMultiplier));
  }

  if (safeMode !== CONSUMABLE_MODE.NONE && normalizedSelection.enabledCategories.firstAid) {
    const candidates = getCandidates({ category: "firstAid", mode: safeMode });
    const eligibleMembers = members.slice(0, safePartySize).filter((member) =>
      candidates.some((definition) => getProfessionSkill(member, "First Aid") >= (definition.runPreparation?.requiredSkill || 0)));
    const denominator = eligibleMembers.length * safeChainMultiplier;
    categoryRequired.set("firstAid", denominator);
    categoryAvailable.set("firstAid", candidates.reduce((sum, definition) => sum + (available.get(String(definition.id)) || 0), 0));
    categoryEligible.set("firstAid", eligibleMembers.length);
    let totalContribution = 0;
    let covered = 0;
    if (members.length === 0 || !members.some((member) => getProfessionSkill(member, "First Aid") > 0)) {
      warnings.push("No party member has First Aid.");
    } else {
      for (let wing = 0; wing < safeChainMultiplier; wing += 1) {
        eligibleMembers.forEach((member) => {
          const skill = getProfessionSkill(member, "First Aid");
          const chosen = candidates.find((definition) =>
            skill >= (definition.runPreparation?.requiredSkill || 0) && (available.get(String(definition.id)) || 0) > 0);
          if (!chosen) return;
          if (take(chosen, 1, denominator) > 0) {
            covered += 1;
            categoryUsed.set("firstAid", (categoryUsed.get("firstAid") || 0) + 1);
            totalContribution += (chosen.runPreparation?.bonusPercent || 0) / denominator;
          }
        });
      }
    }
    categoryBonuses.set("firstAid", Math.min(RUN_PREPARATION_CATEGORY_CAPS.firstAid, totalContribution));
    categoryCoverage.set("firstAid", covered / denominator);
  }

  if (safeMode !== CONSUMABLE_MODE.NONE && normalizedSelection.enabledCategories.engineering) {
    const groupCount = Math.max(1, Math.ceil(safePartySize / 5));
    const denominator = groupCount * safeChainMultiplier;
    const requestedStrategy = normalizedSelection.engineeringStrategy;
    const strategy = requestedStrategy === ENGINEERING_STRATEGY.AUTO
      ? mission?.isRaid ? ENGINEERING_STRATEGY.OFFENSE : ENGINEERING_STRATEGY.SAFETY
      : requestedStrategy;
    const candidates = requestedStrategy === ENGINEERING_STRATEGY.AUTO
      ? getCandidates({ category: "engineering", mode: safeMode })
          .filter((definition) => ["offense", "safety"].includes(String(definition.runPreparation?.subtype)))
          .sort((left, right) => {
            const leftPreferred = left.runPreparation?.subtype === strategy ? 1 : 0;
            const rightPreferred = right.runPreparation?.subtype === strategy ? 1 : 0;
            return rightPreferred - leftPreferred || (right.runPreparation?.tier || 0) - (left.runPreparation?.tier || 0);
          })
      : getCandidates({ category: "engineering", mode: safeMode, subtype: strategy });
    const eligibleEngineerCount = members.filter((member) => candidates.some((definition) =>
      getProfessionSkill(member, "Engineering") >= (definition.runPreparation?.requiredSkill || 0))).length;
    categoryRequired.set("engineering", denominator);
    categoryAvailable.set("engineering", candidates.reduce((sum, definition) => sum + (available.get(String(definition.id)) || 0), 0));
    categoryEligible.set("engineering", eligibleEngineerCount);
    let allocated = false;
    for (const definition of candidates) {
      const requiredSkill = definition.runPreparation?.requiredSkill || 0;
      const eligibleEngineers = members.filter((member) => getProfessionSkill(member, "Engineering") >= requiredSkill).length;
      if (eligibleEngineers <= 0) continue;
      const result = allocateBest({
        category: "engineering",
        candidates: [definition],
        desired: denominator,
        denominator,
        maxUsable: Math.min(groupCount, eligibleEngineers) * safeChainMultiplier,
      });
      if (result.used > 0) { allocated = true; break; }
    }
    if (!allocated) warnings.push("No eligible Engineer or matching Engineering item is available.");
    categoryBonuses.set("engineering", Math.min(RUN_PREPARATION_CATEGORY_CAPS.engineering, categoryBonuses.get("engineering") || 0));

    if (safeMode === CONSUMABLE_MODE.BEST) {
      const repairBot = getInventoryItemDefinition("field_repair_bot_74a");
      const engineers300 = members.filter((member) => getProfessionSkill(member, "Engineering") >= 300).length;
      if (repairBot && engineers300 > 0) {
        const used = take(repairBot, safeChainMultiplier, safeChainMultiplier);
        const coverage = used / safeChainMultiplier;
        repairCostMultiplier = roundOne(1 - (1 - (repairBot.runPreparation?.repairCostMultiplier || 1)) * coverage);
      }
    }
  }

  if (safeMode !== CONSUMABLE_MODE.NONE && normalizedSelection.enabledCategories.weapon) {
    const physicalCount = members.length > 0 ? members.filter(isPhysicalMember).length : safePartySize;
    const denominator = physicalCount * safeChainMultiplier;
    const candidates = getCandidates({ category: "weapon", mode: safeMode });
    categoryRequired.set("weapon", denominator);
    categoryAvailable.set("weapon", candidates.reduce((sum, definition) => sum + (available.get(String(definition.id)) || 0), 0));
    categoryEligible.set("weapon", physicalCount);
    allocateBest({ category: "weapon", candidates, desired: denominator, denominator });
    categoryBonuses.set("weapon", Math.min(RUN_PREPARATION_CATEGORY_CAPS.weapon, categoryBonuses.get("weapon") || 0));
  }

  const consumedItems = [...consumed.values()];
  const categoryBreakdown = RUN_PREPARATION_CATEGORIES.map((category) => ({
    category,
    label: RUN_PREPARATION_CATEGORY_LABELS[category],
    bonusPercent: roundOne(categoryBonuses.get(category) || 0),
    capPercent: RUN_PREPARATION_CATEGORY_CAPS[category],
    coverage: roundOne(Math.min(1, categoryCoverage.get(category) || 0)),
    usedUnits: categoryUsed.get(category) || 0,
    requiredUnits: categoryRequired.get(category) || 0,
    availableUnits: categoryAvailable.get(category) || 0,
    eligibleParticipants: categoryEligible.get(category) || 0,
    consumedItems: consumedItems.filter((entry) => entry.category === category),
  }));
  categoryBreakdown.forEach((entry) => {
    if (entry.usedUnits > 0 && entry.usedUnits < entry.requiredUnits) {
      warnings.push(`${entry.label} coverage is partial (${entry.usedUnits}/${entry.requiredUnits} units).`);
    }
  });
  const rawBonusPercent = roundOne(categoryBreakdown.reduce((sum, entry) => sum + entry.bonusPercent, 0));
  const successBonusPercent = roundOne(Math.min(RUN_PREPARATION_TOTAL_CAP, rawBonusPercent));

  return {
    mode: safeMode,
    selection: normalizedSelection,
    consumedItems,
    categoryBreakdown,
    rawBonusPercent,
    successBonusPercent,
    failReductionPercent: successBonusPercent,
    totalCapPercent: RUN_PREPARATION_TOTAL_CAP,
    chainMultiplier: safeChainMultiplier,
    repairCostMultiplier,
    warnings,
    hasConsumables: consumedItems.length > 0,
    effects: {
      dungeonSuccessBonus: successBonusPercent / 100,
      raidSuccessBonus: successBonusPercent / 100,
      wipeChanceReduction: 0,
    },
  };
};

export const getConsumableMissionModifiers = getRunPreparationPlan;

export const consumeMissionConsumables = ({
  guildInventory,
  modifiers,
}: {
  guildInventory: GuildInventory;
  modifiers: Pick<RunPreparationPlan, "consumedItems"> | null | undefined;
}) => {
  let nextInventory = ensureGuildInventory(guildInventory);
  (Array.isArray(modifiers?.consumedItems) ? modifiers.consumedItems : []).forEach((entry) => {
    nextInventory = removeItemFromGuildInventory(nextInventory, entry.itemId, entry.quantity);
  });
  return nextInventory;
};

export const formatConsumableUseSummary = (
  modifiers: Pick<RunPreparationPlan, "consumedItems" | "successBonusPercent" | "repairCostMultiplier"> & Partial<Pick<RunPreparationPlan, "categoryBreakdown" | "warnings">> | null | undefined,
) => {
  const consumedItems = Array.isArray(modifiers?.consumedItems) ? modifiers.consumedItems : [];
  const itemSummary = consumedItems.length > 0
    ? consumedItems.map((entry) => `${entry.quantity} ${entry.name}`).join(", ")
    : "No supplies used";
  const bonus = Number(modifiers?.successBonusPercent) || 0;
  const repair = Number(modifiers?.repairCostMultiplier) < 1
    ? ` Wipe costs ×${Number(modifiers?.repairCostMultiplier).toFixed(1)}.`
    : "";
  const coverage = Array.isArray(modifiers?.categoryBreakdown)
    ? modifiers.categoryBreakdown
        .filter((entry) => entry.requiredUnits > 0)
        .map((entry) => `${entry.label} ${Math.round(entry.coverage * 100)}%`)
        .join(", ")
    : "";
  const warningText = Array.isArray(modifiers?.warnings) && modifiers.warnings.length > 0
    ? ` Warnings: ${modifiers.warnings.join(" ")}`
    : "";
  return `${itemSummary}. Boss success chance +${bonus}%.${repair}${coverage ? ` Coverage: ${coverage}.` : ""}${warningText}`;
};
