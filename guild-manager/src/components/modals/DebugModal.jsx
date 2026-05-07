import React, { useEffect, useState } from "react";
import BaseModal from "./BaseModal";
import {
  DEBUG_PRESET_OPTIONS,
  DEBUG_RAID_PRESET_ID,
} from "../../debug/rosterPresets";

const DebugModal = ({
  isOpen,
  onClose,
  onBulkLevel,
  onAddGold,
  onAddRenown,
  onAddPresetParty,
  onPrepareMoltenCoreTestGuild,
  onReloadDatabase,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(
    DEBUG_PRESET_OPTIONS[0].value,
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPreset(DEBUG_PRESET_OPTIONS[0].value);
  }, [isOpen]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-2 border-red-900 rounded-lg max-w-md w-full relative shadow-2xl"
    >
        <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-bold text-red-500 fantasy-font">Debug Menu</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-3">
              Global Level Override
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onBulkLevel(5)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-green-400 font-bold text-sm"
              >
                +5 Level All
              </button>
              <button
                onClick={() => onBulkLevel(1)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-green-400 font-bold text-sm"
              >
                +1 Level All
              </button>
              <button
                onClick={() => onBulkLevel(-5)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-red-400 font-bold text-sm"
              >
                -5 Level All
              </button>
              <button
                onClick={() => onBulkLevel(-1)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-red-400 font-bold text-sm"
              >
                -1 Level All
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-3">
              Guild Gold
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onAddGold(10)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-yellow-300 font-bold text-sm"
              >
                +10 Gold
              </button>
              <button
                onClick={() => onAddGold(100)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-yellow-300 font-bold text-sm"
              >
                +100 Gold
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-3">
              Guild Renown
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onAddRenown(5)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-violet-300 font-bold text-sm"
              >
                +5 Renown
              </button>
              <button
                onClick={() => onAddRenown(10)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-violet-300 font-bold text-sm"
              >
                +10 Renown
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-3">
              Debug Party Preset
            </h3>
            <div className="space-y-3">
              <select
                value={selectedPreset}
                onChange={(event) => setSelectedPreset(event.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded py-2 px-3 text-gray-100 text-sm focus:outline-none focus:border-cyan-500"
              >
                {DEBUG_PRESET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {selectedPreset === DEBUG_RAID_PRESET_ID && (
                <div className="text-[11px] text-amber-300/90 border border-amber-900/70 bg-amber-950/20 rounded px-2 py-1">
                  Includes Molten Core Attunement on every hero.
                </div>
              )}
              <button
                onClick={() => onAddPresetParty(selectedPreset)}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-indigo-700 rounded py-2 px-4 text-indigo-200 font-bold text-sm"
              >
                Add Preset Roster
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-3">
              Scenario Setup
            </h3>
            <div className="space-y-3">
              <div className="text-[11px] text-orange-200/90 border border-orange-900/70 bg-orange-950/20 rounded px-2 py-1">
                Unlocks 80 roster slots, raid missions, Molten Core attunement,
                and a fresh 40-player raid team.
              </div>
              <button
                onClick={onPrepareMoltenCoreTestGuild}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-orange-700 rounded py-2 px-4 text-orange-200 font-bold text-sm"
              >
                Setup MC Test Guild
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-3">
              Data Tools
            </h3>
            <button
              onClick={onReloadDatabase}
              className="w-full bg-gray-800 hover:bg-gray-700 border border-cyan-800 rounded py-2 px-4 text-cyan-200 font-bold text-sm"
            >
              Reload Database
            </button>
          </div>
        </div>
    </BaseModal>
  );
};

export default DebugModal;
