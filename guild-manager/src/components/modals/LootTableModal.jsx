import { useEffect, useMemo, useState } from "react";
import { DB_CLASSES, INITIAL_MISSIONS } from "../../constants";
import { PVP_HONOR_SET_NAME } from "../../data/imports/pvpHonorSetItems";
import { DB_ITEMS } from "../../data/items";
import {
  formatItemStats,
  getItemAllowedClasses,
  getItemEffectiveLevel,
  getItemIconUrl,
  getQualityClass,
  getQualityLabel,
  getWowIconUrl,
} from "../../utils";
import {
  getItemSource,
  groupByQuality,
  parseRecommendedRange,
  sortLootItems,
  SOURCE_WORLD,
} from "../../loot/lootTableHelpers";
import BaseModal from "./BaseModal";

const SOURCE_ALL = "All";
const DUNGEON_FILTER_NONE = "";
const RAID_FILTER_NONE = "";
const PRIMARY_SOURCE_FILTERS = Object.freeze([
  { value: SOURCE_ALL, label: "All" },
  { value: SOURCE_WORLD, label: "World" },
  { value: PVP_HONOR_SET_NAME, label: "PvP Sets" },
]);
const CLASS_SORT_ORDER = Object.freeze(Object.keys(DB_CLASSES));
const SLOT_SORT_ORDER = Object.freeze([
  "head",
  "shoulder",
  "chest",
  "legs",
  "feet",
  "hands",
]);

const getClassSortIndex = (className) => {
  const index = CLASS_SORT_ORDER.indexOf(className);
  return index === -1 ? CLASS_SORT_ORDER.length : index;
};

const getSlotSortIndex = (slot) => {
  const index = SLOT_SORT_ORDER.indexOf(slot);
  return index === -1 ? SLOT_SORT_ORDER.length : index;
};

const getPvpItemClassName = (item) => getItemAllowedClasses(item)[0] || "General";

const buildPvpClassGroups = (items) => {
  const classMap = items.reduce((acc, item) => {
    const className = getPvpItemClassName(item);
    if (!acc[className]) {
      acc[className] = {
        className,
        icon: DB_CLASSES[className]?.icon || null,
        sets: {},
      };
    }
    const setId = item.setId || `${className}:${item.setName || "set"}`;
    if (!acc[className].sets[setId]) {
      acc[className].sets[setId] = {
        setId,
        setName: item.setName || setId,
        faction: item.faction || null,
        quality: item.quality,
        itemLevel: getItemEffectiveLevel(item),
        items: [],
      };
    }
    acc[className].sets[setId].items.push(item);
    return acc;
  }, {});

  return Object.values(classMap)
    .sort((left, right) => {
      const classOrder = getClassSortIndex(left.className) - getClassSortIndex(right.className);
      return classOrder || left.className.localeCompare(right.className);
    })
    .map((classGroup) => ({
      ...classGroup,
      sets: Object.values(classGroup.sets)
        .map((set) => ({
          ...set,
          items: [...set.items].sort((left, right) => {
            const slotOrder = getSlotSortIndex(left.slot) - getSlotSortIndex(right.slot);
            return slotOrder || left.name.localeCompare(right.name);
          }),
        }))
        .sort((left, right) => {
          if (right.quality !== left.quality) return right.quality - left.quality;
          const factionOrder = String(left.faction || "").localeCompare(
            String(right.faction || ""),
          );
          return factionOrder || left.setName.localeCompare(right.setName);
        }),
    }));
};

const LootTableModal = ({ isOpen, onClose }) => {
  const [sourceFilter, setSourceFilter] = useState(SOURCE_ALL);
  const [dungeonFilter, setDungeonFilter] = useState(DUNGEON_FILTER_NONE);
  const [raidFilter, setRaidFilter] = useState(RAID_FILTER_NONE);

  useEffect(() => {
    if (isOpen) {
      setSourceFilter(SOURCE_ALL);
      setDungeonFilter(DUNGEON_FILTER_NONE);
      setRaidFilter(RAID_FILTER_NONE);
    }
  }, [isOpen]);

  const buildMissionSourceOptions = (missions) => {
    const missionSourceMeta = new Map();
    const orderedMissionSources = [];

    missions.forEach((mission) => {
      const source = mission.dungeonSetName || mission.name;
      const range = parseRecommendedRange(mission.recommended);
      if (!missionSourceMeta.has(source)) {
        missionSourceMeta.set(source, {
          min: range?.min ?? null,
          max: range?.max ?? null,
        });
        orderedMissionSources.push(source);
        return;
      }

      const existing = missionSourceMeta.get(source);
      missionSourceMeta.set(source, {
        min:
          range?.min == null
            ? existing.min
            : existing.min == null
              ? range.min
              : Math.min(existing.min, range.min),
        max:
          range?.max == null
            ? existing.max
            : existing.max == null
              ? range.max
              : Math.max(existing.max, range.max),
      });
    });

    return orderedMissionSources.map((name) => {
      const range = missionSourceMeta.get(name);
      const rangeLabel =
        range?.min != null && range?.max != null ? `${range.min}-${range.max}` : null;
      return {
        value: name,
        label: rangeLabel ? `${name}: ${rangeLabel}` : name,
      };
    });
  };

  const dungeonOptions = useMemo(() => {
    const dungeonMissions = INITIAL_MISSIONS.filter(
      (mission) => mission.type === "dungeon" && mission?.isRaid !== true,
    );
    return buildMissionSourceOptions(dungeonMissions);
  }, []);

  const raidOptions = useMemo(() => {
    const raidMissions = INITIAL_MISSIONS.filter(
      (mission) => mission.type === "dungeon" && mission?.isRaid === true,
    );
    return buildMissionSourceOptions(raidMissions);
  }, []);

  const sourceSections = useMemo(() => {
    const sortedItems = sortLootItems(DB_ITEMS);
    const filteredItems =
      sourceFilter === SOURCE_ALL
        ? sortedItems
        : sortedItems.filter((item) => getItemSource(item) === sourceFilter);

    const groupedBySource = filteredItems.reduce((acc, item) => {
      const source = getItemSource(item);
      if (!acc[source]) acc[source] = [];
      acc[source].push(item);
      return acc;
    }, {});

    const extraItemSources = Object.keys(groupedBySource).filter(
      (source) =>
        source !== SOURCE_WORLD &&
        source !== PVP_HONOR_SET_NAME &&
        !dungeonOptions.some((option) => option.value === source) &&
        !raidOptions.some((option) => option.value === source),
    );

    const sourceOrder =
      sourceFilter === SOURCE_ALL
        ? [
            ...new Set([
              SOURCE_WORLD,
              PVP_HONOR_SET_NAME,
              ...dungeonOptions.map((option) => option.value),
              ...raidOptions.map((option) => option.value),
              ...extraItemSources,
            ]),
          ]
        : [sourceFilter];

    return sourceOrder
      .filter((source) => (groupedBySource[source] || []).length > 0)
      .map((source) => ({
        source,
        items: groupedBySource[source],
        qualityGroups: groupByQuality(groupedBySource[source]),
        pvpClassGroups:
          source === PVP_HONOR_SET_NAME
            ? buildPvpClassGroups(groupedBySource[source])
            : [],
      }));
  }, [dungeonOptions, raidOptions, sourceFilter]);

  const qualityOrder = [5, 4, 3, 2, 1, 0];
  const renderLootItemRow = (item) => {
    const allowedClasses = getItemAllowedClasses(item);
    return (
      <div
        key={item.id}
        className="px-3 py-2 flex items-center justify-between gap-3 hover:bg-gray-800/40"
      >
        <div className="min-w-0 flex items-center gap-3">
          <img
            src={getItemIconUrl(item)}
            alt={item.name}
            className="w-10 h-10 rounded border border-gray-700 object-cover flex-none"
            onError={(event) => {
              event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
            }}
          />
          <div className="min-w-0">
            <div className={`font-bold truncate ${getQualityClass(item.quality)}`}>
              [{item.name}]
            </div>
            {item.setId && (
              <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px]">
                <span className="px-1.5 py-0.5 rounded border border-emerald-700 bg-emerald-950/30 text-emerald-200 font-bold uppercase tracking-wide">
                  {item.pvpGear ? "PvP Set" : "Set Piece"}
                </span>
                {item.pvpGear && item.faction && (
                  <span className="px-1.5 py-0.5 rounded border border-amber-700 bg-amber-950/30 text-amber-200 font-semibold">
                    {item.faction}
                  </span>
                )}
                {item.pvpGear && item.pvpHonorRank && (
                  <span className="px-1.5 py-0.5 rounded border border-purple-700 bg-purple-950/30 text-purple-200 font-semibold">
                    Rank {item.pvpHonorRank}
                  </span>
                )}
                <span className="text-emerald-300/90">
                  {item.setName || item.setId}
                </span>
                {allowedClasses.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded border border-cyan-700 bg-cyan-950/30 text-cyan-200 font-semibold">
                    Class: {allowedClasses.join(" / ")} (Exclusive)
                  </span>
                )}
              </div>
            )}
            {Array.isArray(item.sourceBosses) && item.sourceBosses.length > 0 && (
              <div className="mt-0.5 text-[11px] text-orange-200/90 truncate">
                Drops: {item.sourceBosses.join(" / ")}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-0.5 min-w-0">
              Slot: {item.slot} - Type: {item.type} -{" "}
              {formatItemStats(item.stats) || "No stat line yet"}
              {item.wowheadId ? (
                <>
                  {" "}-{" "}
                  <a
                    href={`https://www.wowhead.com/classic/item=${item.wowheadId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-300 hover:text-blue-200"
                  >
                    Wowhead
                  </a>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-400 whitespace-nowrap text-right">
          <div>Req Lv {item.minLevel}</div>
          <div className="text-amber-300/90 font-semibold">
            iLvl {getItemEffectiveLevel(item)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-yellow-700 rounded-none md:rounded-lg w-full max-w-5xl h-full md:h-[80vh] flex flex-col relative shadow-2xl"
    >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-bold fantasy-font">Loot Atlas</h2>
            <p className="text-xs text-gray-500 mt-1">
              Filter by source and browse loot tables by zone/dungeon
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-3xl px-2">
            &times;
          </button>
        </div>

        <div className="px-4 pt-3 pb-2 border-b border-gray-700 bg-gray-900/80">
          <div className="flex items-center gap-2 flex-wrap">
            {PRIMARY_SOURCE_FILTERS.map((source) => (
              <button
                key={source.value}
                onClick={() => {
                  setSourceFilter(source.value);
                  setDungeonFilter(DUNGEON_FILTER_NONE);
                  setRaidFilter(RAID_FILTER_NONE);
                }}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  sourceFilter === source.value
                    ? "border-yellow-500 bg-yellow-900/40 text-yellow-200"
                    : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {source.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="loot-dungeon-filter" className="text-xs text-gray-400 uppercase tracking-wider">
                Dungeons
              </label>
              <select
                id="loot-dungeon-filter"
                value={dungeonFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  setDungeonFilter(value);
                  setRaidFilter(RAID_FILTER_NONE);
                  setSourceFilter(value || SOURCE_ALL);
                }}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-yellow-500"
              >
                <option value={DUNGEON_FILTER_NONE}>Select dungeon</option>
                {dungeonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label
                htmlFor="loot-raid-filter"
                className="text-xs text-gray-400 uppercase tracking-wider"
              >
                Raids
              </label>
              <select
                id="loot-raid-filter"
                value={raidFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  setRaidFilter(value);
                  setDungeonFilter(DUNGEON_FILTER_NONE);
                  setSourceFilter(value || SOURCE_ALL);
                }}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-yellow-500"
              >
                <option value={RAID_FILTER_NONE}>Select raid</option>
                {raidOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          {sourceSections.length === 0 ? (
            <div className="text-center text-gray-500 italic py-10">
              No items found for this source.
            </div>
          ) : (
            sourceSections.map((section) => (
              <section key={section.source} className="bg-gray-900/40 border border-gray-700 rounded">
                <div className="px-4 py-2 border-b border-gray-700 bg-black/30 flex items-center justify-between">
                  <h3 className="text-sm md:text-base font-bold text-amber-100 fantasy-font">
                    {section.source}
                  </h3>
                  <span className="text-xs text-gray-500">{section.items.length} items</span>
                </div>

                <div className="p-3 md:p-4 space-y-4">
                  {section.source === PVP_HONOR_SET_NAME
                    ? section.pvpClassGroups.map((classGroup) => (
                        <div
                          key={classGroup.className}
                          className="border border-gray-800 rounded bg-black/10"
                        >
                          <div className="px-3 py-2 border-b border-gray-800 bg-black/25 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {classGroup.icon && (
                                <img
                                  src={classGroup.icon}
                                  alt=""
                                  className="w-6 h-6 rounded border border-gray-700"
                                />
                              )}
                              <h4 className="text-sm font-bold text-amber-100 truncate">
                                {classGroup.className}
                              </h4>
                            </div>
                            <span className="text-[11px] text-gray-500">
                              {classGroup.sets.length} sets
                            </span>
                          </div>
                          <div className="p-3 space-y-3">
                            {classGroup.sets.map((set) => (
                              <div
                                key={set.setId}
                                className="border border-gray-800 rounded overflow-hidden"
                              >
                                <div className="px-3 py-1.5 border-b border-gray-800 bg-gray-950/50 flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className={`text-xs font-bold ${getQualityClass(set.quality)}`}>
                                      {set.setName}
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap gap-1 text-[11px]">
                                      {set.faction && (
                                        <span className="px-1.5 py-0.5 rounded border border-amber-700 bg-amber-950/30 text-amber-200">
                                          {set.faction}
                                        </span>
                                      )}
                                      <span className="px-1.5 py-0.5 rounded border border-gray-700 bg-gray-900 text-gray-300">
                                        {getQualityLabel(set.quality)}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded border border-yellow-700 bg-yellow-950/20 text-yellow-200">
                                        iLvl {set.itemLevel}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[11px] text-gray-500 whitespace-nowrap">
                                    {set.items.length}/6
                                  </span>
                                </div>
                                <div className="divide-y divide-gray-800">
                                  {set.items.map(renderLootItemRow)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    : qualityOrder.map((quality) => {
                        const items = section.qualityGroups[quality] || [];
                        if (items.length === 0) return null;

                        return (
                          <div
                            key={`${section.source}-${quality}`}
                            className="border border-gray-800 rounded"
                          >
                            <div className="px-3 py-1.5 border-b border-gray-800 bg-black/20 flex items-center justify-between">
                              <h4 className={`text-xs font-bold uppercase tracking-wider ${getQualityClass(quality)}`}>
                                {getQualityLabel(quality)}
                              </h4>
                              <span className="text-[11px] text-gray-500">
                                {items.length}
                              </span>
                            </div>

                            <div className="divide-y divide-gray-800">
                              {items.map(renderLootItemRow)}
                            </div>
                          </div>
                        );
                      })}
                </div>
              </section>
            ))
          )}
        </div>

        <button onClick={onClose} className="m-4 mt-0 px-4 py-2 bg-gray-700 rounded self-center">
          Close
        </button>
    </BaseModal>
  );
};

export default LootTableModal;
