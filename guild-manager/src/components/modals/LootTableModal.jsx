import { useEffect, useMemo, useState } from "react";
import { DB_CLASSES, INITIAL_MISSIONS } from "../../constants";
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
const SOURCE_PVP = "__pvp__";
const SOURCE_SET_PIECES = "__set_pieces__";
const PVP_HONOR_SET_NAME = "PvP Honor Sets";
const PVP_GEAR_SET_NAME = "PvP Gear";
const PVP_VIEW_HONOR_SETS = "honor_sets";
const PVP_VIEW_GEAR = "gear";
const DUNGEON_FILTER_NONE = "";
const RAID_FILTER_NONE = "";
const SET_PIECE_CLASS_FILTER_NONE = "";
const SET_PIECE_SET_FILTER_NONE = "";
const PRIMARY_SOURCE_FILTERS = Object.freeze([
  { value: SOURCE_ALL, label: "All" },
  { value: SOURCE_WORLD, label: "World" },
  { value: SOURCE_PVP, label: "PvP Gear" },
  { value: SOURCE_SET_PIECES, label: "Set Pieces" },
]);
const CLASS_SORT_ORDER = Object.freeze(Object.keys(DB_CLASSES));
const SLOT_SORT_ORDER = Object.freeze([
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "wrist",
  "hands",
  "belt",
  "legs",
  "feet",
  "ring",
  "trinket",
  "mainHand",
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
const isPvpSource = (source) =>
  source === PVP_HONOR_SET_NAME || source === PVP_GEAR_SET_NAME;
const isSetPieceItem = (item) => Boolean(item?.setId || item?.pvpGear);
const getSetPieceClasses = (item) => {
  const classes = getItemAllowedClasses(item);
  return classes.length > 0 ? classes : ["General"];
};
const getSetPieceGroupLabel = (item) =>
  item?.setName || item?.dungeonSetName || item?.setId || "PvP Gear";
const getSetPieceFamily = (item) => {
  const setId = String(item?.setId || "");
  if (item?.dungeonSetName === PVP_GEAR_SET_NAME && !item?.setId) return "PvP Gear";
  if (setId.startsWith("pvp_")) return "PvP Honor Sets";
  if (setId.startsWith("t0_")) return "Tier 0";
  if (setId.startsWith("t1_")) return "Tier 1";
  if (setId.startsWith("t2_")) return "Tier 2";
  if (setId.startsWith("t3_")) return "Tier 3";
  return item?.dungeonSetName || "Set";
};
const getSetPieceExpectedCount = (items) => {
  const setId = String(items[0]?.setId || "");
  if (setId.startsWith("pvp_")) return 6;
  if (setId.startsWith("t3_")) return 9;
  if (setId.startsWith("t0_") || setId.startsWith("t1_") || setId.startsWith("t2_")) {
    return 8;
  }
  return null;
};

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

const buildSetPieceGroups = (items) => {
  const groups = items.reduce((acc, item) => {
    const groupName = getSetPieceGroupLabel(item);
    const classNames = getSetPieceClasses(item);
    const faction = item.faction || null;
    const groupKey = [
      groupName,
      getSetPieceFamily(item),
      classNames.join("/"),
      faction || "",
    ].join(":");

    if (!acc[groupKey]) {
      acc[groupKey] = {
        key: groupKey,
        groupName,
        family: getSetPieceFamily(item),
        classNames,
        faction,
        quality: item.quality,
        itemLevel: getItemEffectiveLevel(item),
        items: [],
      };
    }

    acc[groupKey].items.push(item);
    acc[groupKey].quality = Math.max(acc[groupKey].quality || 0, item.quality || 0);
    acc[groupKey].itemLevel = Math.max(
      acc[groupKey].itemLevel || 0,
      getItemEffectiveLevel(item),
    );
    return acc;
  }, {});

  return Object.values(groups)
    .map((group) => ({
      ...group,
      expectedCount: getSetPieceExpectedCount(group.items),
      items: [...group.items].sort((left, right) => {
        const slotOrder = getSlotSortIndex(left.slot) - getSlotSortIndex(right.slot);
        return slotOrder || left.name.localeCompare(right.name);
      }),
    }))
    .sort((left, right) => {
      const familyOrder = left.family.localeCompare(right.family);
      const classOrder =
        getClassSortIndex(left.classNames[0]) - getClassSortIndex(right.classNames[0]);
      return familyOrder || classOrder || left.groupName.localeCompare(right.groupName);
    });
};

const LootTableModal = ({
  isOpen,
  onClose,
  itemCatalog = null,
  itemDatabase = [],
}) => {
  const allItems = useMemo(
    () => itemCatalog?.all?.() || (Array.isArray(itemDatabase) ? itemDatabase : []),
    [itemCatalog, itemDatabase],
  );
  const [sourceFilter, setSourceFilter] = useState(SOURCE_ALL);
  const [dungeonFilter, setDungeonFilter] = useState(DUNGEON_FILTER_NONE);
  const [raidFilter, setRaidFilter] = useState(RAID_FILTER_NONE);
  const [pvpView, setPvpView] = useState(PVP_VIEW_HONOR_SETS);
  const [setPieceClassFilter, setSetPieceClassFilter] = useState(
    SET_PIECE_CLASS_FILTER_NONE,
  );
  const [setPieceSetFilter, setSetPieceSetFilter] = useState(
    SET_PIECE_SET_FILTER_NONE,
  );

  useEffect(() => {
    if (isOpen) {
      setSourceFilter(SOURCE_ALL);
      setDungeonFilter(DUNGEON_FILTER_NONE);
      setRaidFilter(RAID_FILTER_NONE);
      setPvpView(PVP_VIEW_HONOR_SETS);
      setSetPieceClassFilter(SET_PIECE_CLASS_FILTER_NONE);
      setSetPieceSetFilter(SET_PIECE_SET_FILTER_NONE);
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

  const setPieceClassOptions = useMemo(() => {
    const classes = new Set();
    allItems.filter(isSetPieceItem).forEach((item) => {
      getSetPieceClasses(item).forEach((className) => classes.add(className));
    });
    return [...classes].sort((left, right) => {
      const classOrder = getClassSortIndex(left) - getClassSortIndex(right);
      return classOrder || left.localeCompare(right);
    });
  }, [allItems]);

  const setPieceSetOptions = useMemo(() => {
    const filteredItems = allItems.filter(isSetPieceItem).filter((item) => {
      if (!setPieceClassFilter) return true;
      return getSetPieceClasses(item).includes(setPieceClassFilter);
    });
    return [...new Set(filteredItems.map(getSetPieceGroupLabel))].sort((left, right) =>
      left.localeCompare(right),
    );
  }, [allItems, setPieceClassFilter]);

  const sourceSections = useMemo(() => {
    const sortedItems = sortLootItems(allItems);
    const setPieceItems = sortedItems
      .filter(isSetPieceItem)
      .filter((item) => {
        const matchesClass =
          !setPieceClassFilter ||
          getSetPieceClasses(item).includes(setPieceClassFilter);
        const matchesSet =
          !setPieceSetFilter || getSetPieceGroupLabel(item) === setPieceSetFilter;
        return matchesClass && matchesSet;
      });

    if (sourceFilter === SOURCE_SET_PIECES) {
      return [
        {
          source: SOURCE_SET_PIECES,
          items: setPieceItems,
          qualityGroups: groupByQuality(setPieceItems),
          pvpHonorSetItems: [],
          pvpGearItems: [],
          setPieceGroups: buildSetPieceGroups(setPieceItems),
        },
      ];
    }

    const filteredItems =
      sourceFilter === SOURCE_ALL
        ? sortedItems
        : sourceFilter === SOURCE_PVP
          ? sortedItems.filter((item) => isPvpSource(getItemSource(item)))
        : sortedItems.filter((item) => getItemSource(item) === sourceFilter);

    const groupedBySource = filteredItems.reduce((acc, item) => {
      const itemSource = getItemSource(item);
      const source = isPvpSource(itemSource) ? SOURCE_PVP : itemSource;
      if (!acc[source]) acc[source] = [];
      acc[source].push(item);
      return acc;
    }, {});

    const extraItemSources = Object.keys(groupedBySource).filter(
      (source) =>
        source !== SOURCE_WORLD &&
        source !== SOURCE_PVP &&
        !isPvpSource(source) &&
        !dungeonOptions.some((option) => option.value === source) &&
        !raidOptions.some((option) => option.value === source),
    );

    const sourceOrder =
      sourceFilter === SOURCE_ALL
        ? [
            ...new Set([
              SOURCE_WORLD,
              SOURCE_PVP,
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
        pvpHonorSetItems:
          source === SOURCE_PVP
            ? groupedBySource[source].filter(
                (item) => getItemSource(item) === PVP_HONOR_SET_NAME,
              )
            : [],
        pvpGearItems:
          source === SOURCE_PVP
            ? groupedBySource[source].filter(
                (item) => getItemSource(item) === PVP_GEAR_SET_NAME,
              )
            : [],
        pvpClassGroups: [],
        setPieceGroups: [],
      }));
  }, [
    allItems,
    dungeonOptions,
    raidOptions,
    setPieceClassFilter,
    setPieceSetFilter,
    sourceFilter,
  ]);

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
            {(item.setId || item.pvpGear) && (
              <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px]">
                <span className="px-1.5 py-0.5 rounded border border-emerald-700 bg-emerald-950/30 text-emerald-200 font-bold uppercase tracking-wide">
                  {item.pvpGear
                    ? item.setId
                      ? "PvP Set"
                      : "PvP Gear"
                    : "Set Piece"}
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
                  {item.setName || item.dungeonSetName || item.setId}
                </span>
                {allowedClasses.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded border border-cyan-700 bg-cyan-950/30 text-cyan-200 font-semibold">
                    Class: {allowedClasses.join(" / ")}
                    {item.setId ? " (Exclusive)" : ""}
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

  const renderPvpHonorSets = (items) => {
    const pvpClassGroups = buildPvpClassGroups(items);
    return pvpClassGroups.map((classGroup) => (
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
    ));
  };

  const renderQualityGroups = (section, items = section.items) =>
    qualityOrder.map((quality) => {
      const groupedItems = groupByQuality(items)[quality] || [];
      if (groupedItems.length === 0) return null;

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
              {groupedItems.length}
            </span>
          </div>

          <div className="divide-y divide-gray-800">
            {groupedItems.map(renderLootItemRow)}
          </div>
        </div>
      );
    });

  const renderSetPiecesSection = (section) => {
    if (section.items.length === 0) {
      return (
        <div className="text-center text-gray-500 italic py-8">
          No set pieces found for these filters.
        </div>
      );
    }

    return section.setPieceGroups.map((group) => (
      <div
        key={group.key}
        className="border border-gray-800 rounded bg-black/10 overflow-hidden"
      >
        <div className="px-3 py-2 border-b border-gray-800 bg-black/25 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className={`text-sm font-bold truncate ${getQualityClass(group.quality)}`}>
              {group.groupName}
            </h4>
            <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
              <span className="px-1.5 py-0.5 rounded border border-gray-700 bg-gray-900 text-gray-300">
                {group.family}
              </span>
              {group.classNames.map((className) => (
                <span
                  key={className}
                  className="px-1.5 py-0.5 rounded border border-cyan-700 bg-cyan-950/30 text-cyan-200"
                >
                  {className}
                </span>
              ))}
              {group.faction && (
                <span className="px-1.5 py-0.5 rounded border border-amber-700 bg-amber-950/30 text-amber-200">
                  {group.faction}
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded border border-yellow-700 bg-yellow-950/20 text-yellow-200">
                up to iLvl {group.itemLevel}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-gray-500 whitespace-nowrap">
            {group.items.length}
            {group.expectedCount ? `/${group.expectedCount}` : ""} pieces
          </span>
        </div>
        <div className="divide-y divide-gray-800">
          {group.items.map(renderLootItemRow)}
        </div>
      </div>
    ));
  };

  const renderPvpSection = (section) => {
    const activeItems =
      pvpView === PVP_VIEW_HONOR_SETS
        ? section.pvpHonorSetItems
        : section.pvpGearItems;

    return (
      <>
        <div className="flex flex-wrap gap-2">
          {[
            {
              value: PVP_VIEW_HONOR_SETS,
              label: "PvP Honor Sets",
              count: section.pvpHonorSetItems.length,
            },
            {
              value: PVP_VIEW_GEAR,
              label: "PvP Gear",
              count: section.pvpGearItems.length,
            },
          ].map((view) => (
            <button
              key={view.value}
              type="button"
              onClick={() => setPvpView(view.value)}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                pvpView === view.value
                  ? "border-yellow-500 bg-yellow-900/40 text-yellow-200"
                  : "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800"
              }`}
            >
              {view.label} ({view.count})
            </button>
          ))}
        </div>
        {activeItems.length === 0 ? (
          <div className="text-center text-gray-500 italic py-8">
            No PvP items found for this view.
          </div>
        ) : pvpView === PVP_VIEW_HONOR_SETS ? (
          renderPvpHonorSets(activeItems)
        ) : (
          renderQualityGroups(section, activeItems)
        )}
      </>
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
                  if (source.value !== SOURCE_SET_PIECES) {
                    setSetPieceClassFilter(SET_PIECE_CLASS_FILTER_NONE);
                    setSetPieceSetFilter(SET_PIECE_SET_FILTER_NONE);
                  }
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
                  setSetPieceClassFilter(SET_PIECE_CLASS_FILTER_NONE);
                  setSetPieceSetFilter(SET_PIECE_SET_FILTER_NONE);
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
                  setSetPieceClassFilter(SET_PIECE_CLASS_FILTER_NONE);
                  setSetPieceSetFilter(SET_PIECE_SET_FILTER_NONE);
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
          {sourceFilter === SOURCE_SET_PIECES && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label
                htmlFor="loot-set-class-filter"
                className="text-xs text-gray-400 uppercase tracking-wider"
              >
                Class
              </label>
              <select
                id="loot-set-class-filter"
                value={setPieceClassFilter}
                onChange={(event) => {
                  setSetPieceClassFilter(event.target.value);
                  setSetPieceSetFilter(SET_PIECE_SET_FILTER_NONE);
                }}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-yellow-500"
              >
                <option value={SET_PIECE_CLASS_FILTER_NONE}>Any class</option>
                {setPieceClassOptions.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
              <label
                htmlFor="loot-set-name-filter"
                className="text-xs text-gray-400 uppercase tracking-wider"
              >
                Set
              </label>
              <select
                id="loot-set-name-filter"
                value={setPieceSetFilter}
                onChange={(event) => setSetPieceSetFilter(event.target.value)}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-yellow-500 min-w-[180px]"
              >
                <option value={SET_PIECE_SET_FILTER_NONE}>Any set</option>
                {setPieceSetOptions.map((setName) => (
                  <option key={setName} value={setName}>
                    {setName}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                    {section.source === SOURCE_PVP
                      ? "PvP Gear"
                      : section.source === SOURCE_SET_PIECES
                        ? "Set Pieces"
                        : section.source}
                  </h3>
                  <span className="text-xs text-gray-500">{section.items.length} items</span>
                </div>

                <div className="p-3 md:p-4 space-y-4">
                  {section.source === SOURCE_PVP
                    ? renderPvpSection(section)
                    : section.source === SOURCE_SET_PIECES
                      ? renderSetPiecesSection(section)
                    : renderQualityGroups(section)}
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
