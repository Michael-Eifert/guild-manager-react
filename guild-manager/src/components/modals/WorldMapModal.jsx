import { useEffect, useState } from "react";
import BaseModal from "./BaseModal";

const MAP_SOURCES = [
  {
    id: "classic-community-azeroth",
    label: "Classic Azeroth (Community)",
    url: "https://i.redd.it/eznae4smfel81.jpg",
    attribution: "Community map source via Reddit",
  },
];

const ZONE_MARKERS = [
  {
    id: "westfall",
    name: "Westfall",
    note: "The Deadmines",
    x: 76,
    y: 55,
    colorClass: "bg-blue-500",
  },
  {
    id: "silverpine",
    name: "Silverpine Forest",
    note: "Shadowfang Keep",
    x: 70,
    y: 33,
    colorClass: "bg-purple-500",
  },
  {
    id: "northern-barrens",
    name: "Northern Barrens",
    note: "Wailing Caverns",
    x: 27,
    y: 52,
    colorClass: "bg-green-500",
  },
];

const WorldMapModal = ({ isOpen, onClose }) => {
  const [imageError, setImageError] = useState(false);
  const currentSource = MAP_SOURCES[0];

  useEffect(() => {
    if (isOpen) setImageError(false);
  }, [isOpen]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-cyan-800 rounded-none md:rounded-lg w-full max-w-6xl h-full md:h-[85vh] flex flex-col relative shadow-2xl"
    >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-bold fantasy-font text-cyan-300">
              World Map
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Preparation view for zone planning and future character positioning overlays
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-3xl px-2">
            &times;
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-0">
          <div className="relative bg-black/40 border-r border-gray-800 overflow-hidden">
            {!imageError ? (
              <>
                <img
                  src={currentSource.url}
                  alt="Azeroth world map"
                  className="w-full h-full object-contain"
                  onError={() => setImageError(true)}
                />
                {ZONE_MARKERS.map((zone) => (
                  <button
                    key={zone.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group"
                    style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
                    title={`${zone.name} • ${zone.note}`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full border border-black/50 shadow-lg block ${zone.colorClass}`}
                    ></span>
                    <span className="absolute top-4 left-1/2 -translate-x-1/2 px-2 py-1 text-[10px] rounded bg-black/80 text-gray-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {zone.name} • {zone.note}
                    </span>
                  </button>
                ))}
              </>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-6">
                <div className="text-red-400 text-sm mb-2">Map image could not be loaded.</div>
                <a
                  href={currentSource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-300 hover:text-blue-200 underline text-xs"
                >
                  Open source image directly
                </a>
              </div>
            )}
          </div>

          <aside className="p-4 md:p-5 overflow-y-auto custom-scrollbar bg-gray-900/70">
            <h3 className="text-sm uppercase tracking-wider text-gray-300 font-bold mb-2">
              Zone Markers
            </h3>
            <div className="space-y-2 mb-5">
              {ZONE_MARKERS.map((zone) => (
                <div key={zone.id} className="p-2 rounded border border-gray-700 bg-gray-800/60">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${zone.colorClass}`}></span>
                    <div className="text-sm text-gray-100">{zone.name}</div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{zone.note}</div>
                </div>
              ))}
            </div>

            <h3 className="text-sm uppercase tracking-wider text-gray-300 font-bold mb-2">
              Map Source
            </h3>
            <div className="text-xs text-gray-400 leading-relaxed">
              {currentSource.label}
              <div className="text-gray-500 mt-1">{currentSource.attribution}</div>
            </div>

            <div className="mt-5 p-3 rounded border border-cyan-900/60 bg-cyan-950/20 text-xs text-cyan-100/90">
              Planned next step: show live character pins for current mission zone, idle zone, and travel state.
            </div>
          </aside>
        </div>

        <div className="p-3 border-t border-gray-700 flex justify-center">
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 rounded">
            Close
          </button>
        </div>
    </BaseModal>
  );
};

export default WorldMapModal;
