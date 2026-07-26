import { useEffect, useMemo, useState } from "react";
import { canCraftRecipe } from "../../professions/craftingEngine";
import { RECIPE_DEFINITIONS } from "../../professions/recipeDefinitions";
import {
  ensureGuildInventory,
  getItemQuantity,
} from "../../inventory/guildInventoryUtils";
import {
  getAllInventoryItemDefinitions,
  getInventoryItemDefinition,
  INVENTORY_ITEM_CATEGORY,
} from "../../inventory/itemDefinitions";
import { getQualityClass, getQualityLabel } from "../../utils";
import BaseModal from "./BaseModal";

const TABS = Object.freeze([
  { id: "overview", label: "Overview" },
  { id: "crafting", label: "Crafting" },
  { id: "stash", label: "Guild Stash" },
]);

const CATEGORY_LABELS = Object.freeze({
  [INVENTORY_ITEM_CATEGORY.MATERIAL]: "Materials",
  [INVENTORY_ITEM_CATEGORY.CONSUMABLE]: "Consumables",
  [INVENTORY_ITEM_CATEGORY.EQUIPMENT]: "Equipment",
  [INVENTORY_ITEM_CATEGORY.OTHER]: "Other",
});

const normalizeProfessions = (character) => {
  if (Array.isArray(character?.professions)) {
    return character.professions.filter((profession) => profession?.name);
  }
  if (character?.professions && typeof character.professions === "object") {
    return Object.entries(character.professions)
      .map(([name, value]) => ({
        name,
        skill:
          typeof value === "object"
            ? Number(value.skill) || 1
            : Number(value) || 1,
      }))
      .filter((profession) => profession.name);
  }
  return [];
};

const formatStats = (stats) => {
  const entries = Object.entries(stats || {}).filter(([, value]) => Number(value) !== 0);
  if (entries.length === 0) return "";
  return entries
    .map(([stat, value]) => `${stat} +${value}`)
    .join(", ");
};

const getCategoryOrder = (category) =>
  [
    INVENTORY_ITEM_CATEGORY.MATERIAL,
    INVENTORY_ITEM_CATEGORY.CONSUMABLE,
    INVENTORY_ITEM_CATEGORY.EQUIPMENT,
    INVENTORY_ITEM_CATEGORY.OTHER,
  ].indexOf(category);

const ProfessionsModal = ({
  isOpen,
  onClose,
  variant = "modal",
  roster = [],
  guildInventory = null,
  stashPolicy = null,
  guildGold = 0,
  onCraftRecipe,
  onSellStashItem,
  onCleanupGuildStash,
  onTryAutoEquipFromGuildStash,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const professionRoster = useMemo(
    () =>
      (Array.isArray(roster) ? roster : []).filter(
        (character) => normalizeProfessions(character).length > 0,
      ),
    [roster],
  );
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    professionRoster[0]?.id || "",
  );
  const safeInventory = useMemo(
    () => ensureGuildInventory(guildInventory),
    [guildInventory],
  );
  const selectedCharacter =
    professionRoster.find((character) => character.id === selectedCharacterId) ||
    professionRoster[0] ||
    null;
  const selectedProfessions = normalizeProfessions(selectedCharacter);
  const selectedProfessionNames = selectedProfessions.map(
    (profession) => profession.name,
  );
  const visibleRecipes = useMemo(
    () =>
      RECIPE_DEFINITIONS.filter((recipe) =>
        selectedProfessionNames.includes(recipe.profession),
      ),
    [selectedProfessionNames],
  );
  const stashEntries = useMemo(() => {
    const definitionsById = new Map(
      getAllInventoryItemDefinitions().map((definition) => [
        definition.id,
        definition,
      ]),
    );
    return Object.entries(safeInventory.items)
      .map(([itemId, quantity]) => ({
        itemId,
        quantity,
        definition:
          definitionsById.get(itemId) || {
            id: itemId,
            name: itemId,
            category: INVENTORY_ITEM_CATEGORY.OTHER,
            quality: 1,
            sellValue: 0,
          },
      }))
      .filter((entry) => entry.quantity > 0)
      .sort((left, right) => {
        const categoryDelta =
          getCategoryOrder(left.definition.category) -
          getCategoryOrder(right.definition.category);
        if (categoryDelta !== 0) return categoryDelta;
        return String(left.definition.name).localeCompare(
          String(right.definition.name),
        );
      });
  }, [safeInventory]);
  const groupedStashEntries = useMemo(
    () =>
      stashEntries.reduce((groups, entry) => {
        const category = entry.definition.category || INVENTORY_ITEM_CATEGORY.OTHER;
        return {
          ...groups,
          [category]: [...(groups[category] || []), entry],
        };
      }, {}),
    [stashEntries],
  );

  useEffect(() => {
    if (!selectedCharacterId && professionRoster[0]?.id) {
      setSelectedCharacterId(professionRoster[0].id);
      return;
    }
    if (
      selectedCharacterId &&
      !professionRoster.some((character) => character.id === selectedCharacterId)
    ) {
      setSelectedCharacterId(professionRoster[0]?.id || "");
    }
  }, [professionRoster, selectedCharacterId]);

  const renderItemDetails = (definition) => {
    if (!definition) return null;
    if (definition.category === INVENTORY_ITEM_CATEGORY.EQUIPMENT) {
      return (
        <span>
          {definition.slot} - {definition.armorType || definition.type} - iLvl{" "}
          {definition.itemLevel || definition.gearScore || "?"}
          {definition.levelRequirement ? ` - Lvl ${definition.levelRequirement}` : ""}
        </span>
      );
    }
    if (definition.category === INVENTORY_ITEM_CATEGORY.CONSUMABLE) {
      return <span>{definition.effect || "Consumable"}</span>;
    }
    if (definition.professionTags?.length) {
      return <span>{definition.professionTags.join(", ")}</span>;
    }
    return <span>{definition.source || "Guild Stash"}</span>;
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      variant={variant}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-emerald-900 rounded-none md:rounded-lg w-full max-w-5xl h-full md:h-[88vh] flex flex-col relative shadow-2xl"
      pageClassName="wow-modal-panel min-h-[calc(100dvh-10rem)] w-full overflow-hidden rounded-xl border border-emerald-900 bg-gray-900 shadow-2xl flex flex-col"
      ariaLabel="Professions"
    >
      <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 z-10">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white fantasy-font">
            Professions
          </h2>
          <div className="text-xs text-amber-100/70">
            Guild Stash gold value is handled in shared guild gold: {guildGold}g.
          </div>
        </div>
        {variant !== "page" && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-3xl px-2"
          >
            &times;
          </button>
        )}
      </div>

      <div className="px-4 py-3 border-b border-gray-700 bg-gray-950/40">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded border text-xs font-bold transition-colors ${
                activeTab === tab.id
                  ? "border-emerald-500 bg-emerald-900/40 text-emerald-100"
                  : "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {professionRoster.length === 0 ? (
              <div className="md:col-span-2 text-center text-gray-500 italic py-10">
                No guild members know professions yet.
              </div>
            ) : (
              professionRoster.map((character) => (
                <div
                  key={character.id}
                  className="rounded border border-gray-700 bg-gray-800/70 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-amber-100">{character.name}</div>
                      <div className="text-xs text-gray-400">
                        Lvl {character.level || 1} {character.charClass}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCharacterId(character.id);
                        setActiveTab("crafting");
                      }}
                      className="px-2 py-1 rounded border border-emerald-700 bg-emerald-900/30 text-xs text-emerald-100 hover:bg-emerald-800/40"
                    >
                      Craft
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {normalizeProfessions(character).map((profession) => (
                      <div
                        key={`${character.id}-${profession.name}`}
                        className="rounded border border-gray-700 bg-gray-900 px-2 py-1.5"
                      >
                        <div className="text-xs font-bold text-gray-100">
                          {profession.name}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          Skill {Number(profession.skill) || 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "crafting" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded border border-gray-700 bg-gray-800/70 p-3">
              <label className="text-xs text-gray-300">
                Crafter
                <select
                  value={selectedCharacter?.id || ""}
                  onChange={(event) => setSelectedCharacterId(event.target.value)}
                  className="ml-2 bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100"
                >
                  {professionRoster.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
              </label>
              {selectedProfessions.map((profession) => (
                <span
                  key={profession.name}
                  className="rounded border border-emerald-800 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-100"
                >
                  {profession.name} {profession.skill}
                </span>
              ))}
            </div>

            {visibleRecipes.length === 0 ? (
              <div className="text-center text-gray-500 italic py-10">
                Select a crafter with Tailoring, Leatherworking, or Alchemy.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {visibleRecipes.map((recipe) => {
                  const output = getInventoryItemDefinition(recipe.outputItemId);
                  const craftCheck = canCraftRecipe({
                    character: selectedCharacter,
                    recipe,
                    guildInventory: safeInventory,
                  });
                  return (
                    <div
                      key={recipe.id}
                      className="rounded border border-gray-700 bg-gray-800/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-amber-100">
                            {recipe.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {recipe.profession} {recipe.requiredSkill} -{" "}
                            {recipe.purpose}
                          </div>
                          {output && (
                            <div className="mt-1 text-xs text-gray-300">
                              Output:{" "}
                              <span className={getQualityClass(output.quality)}>
                                {output.name}
                              </span>
                              {recipe.outputQuantity > 1
                                ? ` x${recipe.outputQuantity}`
                                : ""}
                              {output.category === INVENTORY_ITEM_CATEGORY.EQUIPMENT &&
                                ` (${output.slot}, iLvl ${output.itemLevel})`}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={!craftCheck.canCraft}
                          onClick={() =>
                            selectedCharacter &&
                            onCraftRecipe?.(selectedCharacter.id, recipe.id)
                          }
                          className="px-3 py-1.5 rounded border border-emerald-700 bg-emerald-900/40 text-xs font-bold text-emerald-100 hover:bg-emerald-800/60 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Craft
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {recipe.materials.map((material) => {
                          const definition = getInventoryItemDefinition(material.itemId);
                          const owned = getItemQuantity(safeInventory, material.itemId);
                          const hasEnough = owned >= material.amount;
                          return (
                            <div
                              key={`${recipe.id}-${material.itemId}`}
                              className={`rounded border px-2 py-1.5 text-xs ${
                                hasEnough
                                  ? "border-gray-700 bg-gray-900 text-gray-200"
                                  : "border-rose-900 bg-rose-950/30 text-rose-200"
                              }`}
                            >
                              {definition?.name || material.itemId}: {owned}/
                              {material.amount}
                            </div>
                          );
                        })}
                      </div>
                      {!craftCheck.canCraft && (
                        <div className="mt-2 text-[11px] text-rose-300">
                          {craftCheck.reason}
                        </div>
                      )}
                      {output?.stats && (
                        <div className="mt-2 text-[11px] text-gray-400">
                          {formatStats(output.stats)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "stash" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-gray-700 bg-gray-800/70 p-3">
              <div>
                <div className="font-bold text-amber-100">Guild Stash</div>
                <div className="text-xs text-gray-400">
                  {stashEntries.length} stacked item type
                  {stashEntries.length === 1 ? "" : "s"} stored. Cleanup autosells
                  obsolete equipment only.
                </div>
              </div>
              <button
                type="button"
                onClick={() => onCleanupGuildStash?.()}
                className="px-3 py-1.5 rounded border border-amber-700 bg-amber-900/30 text-xs font-bold text-amber-100 hover:bg-amber-800/40"
              >
                Clean Up Stash
              </button>
            </div>

            {stashEntries.length === 0 ? (
              <div className="text-center text-gray-500 italic py-10">
                The Guild Stash is empty. Profession activity will start adding
                materials over time.
              </div>
            ) : (
              Object.values(INVENTORY_ITEM_CATEGORY).map((category) => {
                const entries = groupedStashEntries[category] || [];
                if (entries.length === 0) return null;
                return (
                  <section key={category}>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-300">
                      {CATEGORY_LABELS[category] || "Other"}
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {entries.map(({ itemId, quantity, definition }) => (
                        <div
                          key={itemId}
                          className="rounded border border-gray-700 bg-gray-800/70 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className={getQualityClass(definition.quality)}>
                                {definition.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                Qty {quantity} -{" "}
                                {getQualityLabel(definition.quality)} -{" "}
                                {renderItemDetails(definition)}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                              {definition.category ===
                                INVENTORY_ITEM_CATEGORY.EQUIPMENT && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onTryAutoEquipFromGuildStash?.(itemId)
                                  }
                                  className="px-2 py-1 rounded border border-emerald-700 bg-emerald-900/30 text-[11px] text-emerald-100 hover:bg-emerald-800/40"
                                >
                                  Equip
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onSellStashItem?.(itemId, 1)}
                                className="px-2 py-1 rounded border border-gray-600 bg-gray-900 text-[11px] text-gray-200 hover:bg-gray-700"
                              >
                                Sell 1
                              </button>
                              <button
                                type="button"
                                onClick={() => onSellStashItem?.(itemId, quantity)}
                                className="px-2 py-1 rounded border border-gray-600 bg-gray-900 text-[11px] text-gray-200 hover:bg-gray-700"
                              >
                                Sell All
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 text-[11px] text-gray-400">
                            Sell value {definition.sellValue || 0}g each.
                            {definition.category === INVENTORY_ITEM_CATEGORY.EQUIPMENT &&
                              stashPolicy?.keepPotentialUpgrades &&
                              " Potential upgrades are kept during cleanup."}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default ProfessionsModal;
