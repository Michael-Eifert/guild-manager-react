import { useState } from "react";
import {
  Bug,
  Coins,
  Database,
  ShieldPlus,
  UserCheck,
  Users,
} from "lucide-react";

import {
  DEBUG_PRESET_OPTIONS,
  DEBUG_RAID_PRESET_ID,
} from "../../debug/rosterPresets";
import GameButton from "../ui/GameButton";

const SCENARIOS = [
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
] as const;

type Props = {
  onBulkLevel: (levels: number) => void;
  onAddGold: (amount: number) => void;
  onAddRenown: (amount: number) => void;
  onAddPresetParty: (presetId: string) => void;
  onPrepareMoltenCoreTestGuild?: () => void;
  onPrepareBlackwingLairTestGuild?: () => void;
  onPrepareNaxxramasTestGuild?: () => void;
  onTurnEveryoneOnline: () => void;
  onReloadDatabase: () => void;
};

const panel =
  "rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg";
const selectClass =
  "min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-red-500";

export default function DebugSettingsPanel({
  onBulkLevel,
  onAddGold,
  onAddRenown,
  onAddPresetParty,
  onPrepareMoltenCoreTestGuild,
  onPrepareBlackwingLairTestGuild,
  onPrepareNaxxramasTestGuild,
  onTurnEveryoneOnline,
  onReloadDatabase,
}: Props) {
  const [selectedPreset, setSelectedPreset] = useState(
    DEBUG_PRESET_OPTIONS[0].value,
  );
  const [selectedScenario, setSelectedScenario] =
    useState<(typeof SCENARIOS)[number]["value"]>("molten-core");
  const scenario =
    SCENARIOS.find((entry) => entry.value === selectedScenario) ||
    SCENARIOS[0];
  const applyScenario = () => {
    if (selectedScenario === "blackwing-lair") {
      onPrepareBlackwingLairTestGuild?.();
    } else if (selectedScenario === "naxxramas") {
      onPrepareNaxxramasTestGuild?.();
    } else {
      onPrepareMoltenCoreTestGuild?.();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-red-900/75 bg-red-950/25 p-4">
        <Bug size={21} className="shrink-0 text-red-300" aria-hidden="true" />
        <div>
          <h2 className="fantasy-font text-lg font-bold text-red-200">
            Debug Tools
          </h2>
          <p className="mt-1 text-xs text-red-100/65">
            These actions directly change the current game state and are
            intended for testing.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className={panel}>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Users size={17} className="text-emerald-300" aria-hidden="true" />
            Global Level Override
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[5, 1, -5, -1].map((levels) => (
              <GameButton
                key={levels}
                tone={levels > 0 ? "success" : "danger"}
                onClick={() => onBulkLevel(levels)}
              >
                {levels > 0 ? "+" : ""}
                {levels} Level All
              </GameButton>
            ))}
          </div>
        </section>

        <section className={panel}>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Coins size={17} className="text-amber-300" aria-hidden="true" />
            Guild Resources
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <GameButton tone="primary" onClick={() => onAddGold(10)}>
              +10 Gold
            </GameButton>
            <GameButton tone="primary" onClick={() => onAddGold(100)}>
              +100 Gold
            </GameButton>
            <GameButton tone="quest" onClick={() => onAddRenown(5)}>
              +5 Renown
            </GameButton>
            <GameButton tone="quest" onClick={() => onAddRenown(10)}>
              +10 Renown
            </GameButton>
          </div>
        </section>

        <section className={panel}>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <UserCheck
              size={17}
              className="text-emerald-300"
              aria-hidden="true"
            />
            Online Status
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Disable offline schedules and make every available character
            immediately count as online.
          </p>
          <GameButton
            tone="success"
            fullWidth
            className="mt-3"
            onClick={onTurnEveryoneOnline}
          >
            Turn Everyone Online
          </GameButton>
        </section>

        <section className={panel}>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <ShieldPlus size={17} className="text-indigo-300" aria-hidden="true" />
            Debug Party Preset
          </h3>
          <select
            aria-label="Debug party preset"
            value={selectedPreset}
            onChange={(event) => setSelectedPreset(event.target.value)}
            className={`${selectClass} mt-3`}
          >
            {DEBUG_PRESET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {selectedPreset === DEBUG_RAID_PRESET_ID ? (
            <p className="mt-2 rounded border border-amber-900/70 bg-amber-950/20 px-2 py-1 text-[11px] text-amber-300">
              Includes Molten Core Attunement on every hero.
            </p>
          ) : null}
          <GameButton
            tone="neutral"
            fullWidth
            className="mt-3"
            onClick={() => onAddPresetParty(selectedPreset)}
          >
            Add Preset Roster
          </GameButton>
        </section>

        <section className={panel}>
          <h3 className="text-sm font-bold text-slate-100">Scenario Setup</h3>
          <select
            aria-label="Debug scenario"
            value={selectedScenario}
            onChange={(event) =>
              setSelectedScenario(
                event.target.value as (typeof SCENARIOS)[number]["value"],
              )
            }
            className={`${selectClass} mt-3`}
          >
            {SCENARIOS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-2 rounded border border-orange-900/70 bg-orange-950/20 px-2 py-1.5 text-[11px] text-orange-200">
            {scenario.description}
          </p>
          <GameButton
            tone="danger"
            fullWidth
            className="mt-3"
            onClick={applyScenario}
          >
            Apply Scenario Setup
          </GameButton>
        </section>
      </div>

      <section className={panel}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Database size={17} className="text-cyan-300" aria-hidden="true" />
          Data Tools
        </h3>
        <GameButton
          tone="quest"
          className="mt-3"
          onClick={onReloadDatabase}
        >
          Reload Database
        </GameButton>
      </section>
    </div>
  );
}
