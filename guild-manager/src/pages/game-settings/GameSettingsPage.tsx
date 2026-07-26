import { Gamepad2, Settings2 } from "lucide-react";
import { useState } from "react";

import ChatAiSettingsPanel from "../../components/settings/ChatAiSettingsPanel";
import DebugSettingsPanel from "../../components/settings/DebugSettingsPanel";
import SegmentedControl from "../../components/ui/SegmentedControl";
import type { GameSettingsState } from "../../settings/gameSettings";
import type { ChatAiSettings } from "../../social/chatProviders";

type SettingsTab = "gameplay" | "chat" | "debug";

type DebugActions = {
  bulkLevel: (levels: number) => void;
  addGold: (amount: number) => void;
  addRenown: (amount: number) => void;
  addPresetParty: (presetId: string) => void;
  prepareMoltenCoreTestGuild?: () => void;
  prepareBlackwingLairTestGuild?: () => void;
  prepareNaxxramasTestGuild?: () => void;
  reloadDatabase: () => void;
};

type Props = {
  gameSettings: GameSettingsState;
  onGameSettingsChange: (settings: Partial<GameSettingsState>) => void;
  chatAiSettings: ChatAiSettings;
  onChatAiSettingsChange: (settings: ChatAiSettings) => void;
  onTestChatProvider: (
    settings: ChatAiSettings,
  ) => Promise<{ ok: boolean; message: string }>;
  debugActions: DebugActions;
};

const tabs = [
  { value: "gameplay" as const, label: "Gameplay" },
  { value: "chat" as const, label: "Chat & AI" },
  { value: "debug" as const, label: "Debug" },
];

export default function GameSettingsPage({
  gameSettings,
  onGameSettingsChange,
  chatAiSettings,
  onChatAiSettingsChange,
  onTestChatProvider,
  debugActions,
}: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("gameplay");

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-amber-900/50 bg-slate-900/75 p-4 shadow-lg md:p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-lg border border-amber-800 bg-amber-950/40 p-2 text-amber-300">
            <Settings2 size={22} aria-hidden="true" />
          </span>
          <div>
            <h1 className="fantasy-font text-2xl font-bold text-amber-100">
              Game Settings
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Configure simulation rules, character dialogue providers, and
              testing tools for this guild.
            </p>
          </div>
        </div>
        <SegmentedControl
          ariaLabel="Game settings sections"
          options={tabs}
          value={activeTab}
          onChange={setActiveTab}
          className="mt-4"
        />
      </header>

      {activeTab === "gameplay" ? (
        <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg md:p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-lg border border-cyan-900 bg-cyan-950/35 p-2 text-cyan-300">
              <Gamepad2 size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="fantasy-font text-lg font-bold text-amber-100">
                Gameplay Mechanics
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                These settings belong to the current save and take effect
                immediately.
              </p>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-slate-700 bg-slate-950/55 p-4 transition-colors hover:border-cyan-700 focus-within:ring-2 focus-within:ring-cyan-400">
            <span>
              <span className="block text-sm font-bold text-slate-100">
                Offline Simulation
              </span>
              <span className="mt-1 block max-w-3xl text-xs leading-relaxed text-slate-400">
                Guild and realm characters follow Casual, Regular, or Hardcore
                schedules. Offline characters cannot start activities, while
                active groups remain online until they finish.
              </span>
              <span
                className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  gameSettings.offlineSimulationEnabled
                    ? "border-cyan-800 bg-cyan-950/45 text-cyan-200"
                    : "border-emerald-800 bg-emerald-950/45 text-emerald-200"
                }`}
              >
                {gameSettings.offlineSimulationEnabled
                  ? "Simulation enabled"
                  : "Everyone always online"}
              </span>
            </span>
            <input
              type="checkbox"
              aria-label="Offline Simulation"
              checked={gameSettings.offlineSimulationEnabled}
              onChange={(event) =>
                onGameSettingsChange({
                  offlineSimulationEnabled: event.target.checked,
                })
              }
              className="mt-0.5 h-6 w-6 shrink-0 rounded border-slate-600 bg-slate-950 accent-cyan-500"
            />
          </label>
        </section>
      ) : null}

      {activeTab === "chat" ? (
        <div aria-label="Chat and AI settings">
          <ChatAiSettingsPanel
            settings={chatAiSettings}
            onChange={onChatAiSettingsChange}
            onTestConnection={onTestChatProvider}
          />
        </div>
      ) : null}

      {activeTab === "debug" ? (
        <div aria-label="Debug settings">
          <DebugSettingsPanel
            onBulkLevel={debugActions.bulkLevel}
            onAddGold={debugActions.addGold}
            onAddRenown={debugActions.addRenown}
            onAddPresetParty={debugActions.addPresetParty}
            onPrepareMoltenCoreTestGuild={
              debugActions.prepareMoltenCoreTestGuild
            }
            onPrepareBlackwingLairTestGuild={
              debugActions.prepareBlackwingLairTestGuild
            }
            onPrepareNaxxramasTestGuild={
              debugActions.prepareNaxxramasTestGuild
            }
            onTurnEveryoneOnline={() =>
              onGameSettingsChange({ offlineSimulationEnabled: false })
            }
            onReloadDatabase={debugActions.reloadDatabase}
          />
        </div>
      ) : null}
    </div>
  );
}
