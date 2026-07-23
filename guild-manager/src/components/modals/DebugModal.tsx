import React, { useEffect, useState } from "react";
import BaseModal from "./BaseModal";
import {
  DEBUG_PRESET_OPTIONS,
  DEBUG_RAID_PRESET_ID,
} from "../../debug/rosterPresets";

const DEBUG_SCENARIO_OPTIONS = [
  {
    value: "molten-core",
    label: "Molten Core Test Guild",
    description:
      "80 roster slots, raid missions, Molten Core attunement, and a fresh 40-player raid team.",
  },
  {
    value: "blackwing-lair",
    label: "Blackwing Lair Test Guild",
    description:
      "Fresh 40-player BWL team with MC/BWL attunements and T1/ZG/AQ20-level gear.",
  },
  {
    value: "naxxramas",
    label: "Naxxramas Test Guild",
    description:
      "Fresh 40-player Naxx team with MC/BWL attunements and T2/ZG/AQ-level gear.",
  },
];

const DebugModal = ({
  isOpen,
  onClose,
  onBulkLevel,
  onAddGold,
  onAddRenown,
  onAddPresetParty,
  onPrepareMoltenCoreTestGuild,
  onPrepareBlackwingLairTestGuild,
  onPrepareNaxxramasTestGuild,
  onReloadDatabase,
}: {
  isOpen: boolean;
  onClose: () => void;
  onBulkLevel: (levels: number) => void;
  onAddGold: (amount: number) => void;
  onAddRenown: (amount: number) => void;
  onAddPresetParty: (presetId: string) => void;
  onPrepareMoltenCoreTestGuild?: () => void;
  onPrepareBlackwingLairTestGuild?: () => void;
  onPrepareNaxxramasTestGuild?: () => void;
  onReloadDatabase: () => void;
}) => {
  const [selectedPreset, setSelectedPreset] = useState(
    DEBUG_PRESET_OPTIONS[0].value,
  );
  const [selectedScenario, setSelectedScenario] = useState(
    DEBUG_SCENARIO_OPTIONS[0].value,
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPreset(DEBUG_PRESET_OPTIONS[0].value);
    setSelectedScenario(DEBUG_SCENARIO_OPTIONS[0].value);
  }, [isOpen]);

  const selectedScenarioOption =
    DEBUG_SCENARIO_OPTIONS.find(
      (option) => option.value === selectedScenario,
    ) || DEBUG_SCENARIO_OPTIONS[0];

  const handleApplyScenario = () => {
    if (selectedScenario === "blackwing-lair") {
      onPrepareBlackwingLairTestGuild?.();
      return;
    }
    if (selectedScenario === "naxxramas") {
      onPrepareNaxxramasTestGuild?.();
      return;
    }
    onPrepareMoltenCoreTestGuild?.();
  };

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
              <select
                value={selectedScenario}
                onChange={(event) => setSelectedScenario(event.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded py-2 px-3 text-gray-100 text-sm focus:outline-none focus:border-orange-500"
              >
                {DEBUG_SCENARIO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-orange-200/90 border border-orange-900/70 bg-orange-950/20 rounded px-2 py-1">
                {selectedScenarioOption.description}
              </div>
              <button
                onClick={handleApplyScenario}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-orange-700 rounded py-2 px-4 text-orange-200 font-bold text-sm"
              >
                Apply Scenario Setup
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
