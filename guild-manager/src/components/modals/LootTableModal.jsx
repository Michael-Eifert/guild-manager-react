import { useEffect, useMemo, useState } from "react";
import { DB_ITEMS, INITIAL_MISSIONS } from "../../constants";
import {
  formatItemStats,
  getItemIconUrl,
  getQualityClass,
  getQualityLabel,
} from "../../utils";
import BaseModal from "./BaseModal";

const SOURCE_ALL = "All";
const SOURCE_WORLD = "World";

const getItemSource = (item) => item.dungeon || SOURCE_WORLD;

const groupByQuality = (items) =>
  items.reduce((acc, item) => {
    const key = item.quality;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

const sortItems = (items) =>
  [...items].sort((a, b) => {
    if (a.quality !== b.quality) return b.quality - a.quality;
    if (a.minLevel !== b.minLevel) return a.minLevel - b.minLevel;
    if (a.slot !== b.slot) return a.slot.localeCompare(b.slot);
    return a.name.localeCompare(b.name);
  });

const LootTableModal = ({ isOpen, onClose }) => {
  const [sourceFilter, setSourceFilter] = useState(SOURCE_ALL);

  useEffect(() => {
    if (isOpen) {
      setSourceFilter(SOURCE_ALL);
    }
  }, [isOpen]);

  const sources = useMemo(() => {
    const dungeonsFromMissions = INITIAL_MISSIONS.filter(
      (mission) => mission.type === "dungeon",
    ).map((mission) => mission.name);

    const dungeonsFromItems = [...new Set(DB_ITEMS.map((item) => item.dungeon).filter(Boolean))];

    const orderedDungeons = [
      ...dungeonsFromMissions,
      ...dungeonsFromItems.filter((name) => !dungeonsFromMissions.includes(name)),
    ];

    return [SOURCE_ALL, SOURCE_WORLD, ...orderedDungeons];
  }, []);

  const sourceSections = useMemo(() => {
    const sortedItems = sortItems(DB_ITEMS);
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

    const sourceOrder = sourceFilter === SOURCE_ALL ? sources.slice(1) : [sourceFilter];

    return sourceOrder
      .filter((source) => (groupedBySource[source] || []).length > 0)
      .map((source) => ({
        source,
        items: groupedBySource[source],
        qualityGroups: groupByQuality(groupedBySource[source]),
      }));
  }, [sourceFilter, sources]);

  const qualityOrder = [3, 2, 1, 0];

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
            {sources.map((source) => (
              <button
                key={source}
                onClick={() => setSourceFilter(source)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  sourceFilter === source
                    ? "border-yellow-500 bg-yellow-900/40 text-yellow-200"
                    : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {source}
              </button>
            ))}
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
                  {qualityOrder.map((quality) => {
                    const items = section.qualityGroups[quality] || [];
                    if (items.length === 0) return null;

                    return (
                      <div key={`${section.source}-${quality}`} className="border border-gray-800 rounded">
                        <div className="px-3 py-1.5 border-b border-gray-800 bg-black/20 flex items-center justify-between">
                          <h4 className={`text-xs font-bold uppercase tracking-wider ${getQualityClass(quality)}`}>
                            {getQualityLabel(quality)}
                          </h4>
                          <span className="text-[11px] text-gray-500">{items.length}</span>
                        </div>

                        <div className="divide-y divide-gray-800">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="px-3 py-2 flex items-center justify-between gap-3 hover:bg-gray-800/40"
                            >
                              <div className="min-w-0 flex items-center gap-3">
                                <img
                                  src={getItemIconUrl(item)}
                                  alt={item.name}
                                  className="w-10 h-10 rounded border border-gray-700 object-cover flex-none"
                                />
                                <div className="min-w-0">
                                  <div className={`font-bold truncate ${getQualityClass(item.quality)}`}>
                                    [{item.name}]
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5 min-w-0">
                                    Slot: {item.slot} • Type: {item.type} • {formatItemStats(item.stats) || "No stat line yet"}
                                    {item.wowheadId ? (
                                      <>
                                        {" "}•{" "}
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
                              <div className="text-xs text-gray-400 whitespace-nowrap">Req Lv {item.minLevel}</div>
                            </div>
                          ))}
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
