import {
  FolderOpen,
  Gamepad2,
  HardDrive,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import BaseModal from "../../components/modals/BaseModal";
import ChatAiSettingsPanel from "../../components/settings/ChatAiSettingsPanel";
import DebugSettingsPanel from "../../components/settings/DebugSettingsPanel";
import GameButton from "../../components/ui/GameButton";
import SegmentedControl from "../../components/ui/SegmentedControl";
import type {
  BrowserSaveSlotId,
  BrowserSaveSlotSummary,
} from "../../session/browserSessionPersistence";
import {
  REALM_GUILD_DENSITY_OPTIONS,
  REALM_GUILD_DYNAMICS_OPTIONS,
  normalizeGameSettings,
  type GameSettingsState,
} from "../../settings/gameSettings";
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
  gameSettings: Partial<GameSettingsState>;
  onGameSettingsChange: (settings: Partial<GameSettingsState>) => void;
  chatAiSettings: ChatAiSettings;
  onChatAiSettingsChange: (settings: ChatAiSettings) => void;
  onTestChatProvider: (
    settings: ChatAiSettings,
  ) => Promise<{ ok: boolean; message: string }>;
  debugActions: DebugActions;
  browserSaveSlots: BrowserSaveSlotSummary[];
  onLoadBrowserSave: (slotId: BrowserSaveSlotId) => void;
  onStartNewBrowserGame: (slotId: BrowserSaveSlotId) => void;
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
  browserSaveSlots,
  onLoadBrowserSave,
  onStartNewBrowserGame,
}: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("gameplay");
  const [pendingNewSlot, setPendingNewSlot] =
    useState<BrowserSaveSlotSummary | null>(null);
  const normalizedGameSettings = normalizeGameSettings(gameSettings);

  const handleConfirmNewGame = () => {
    if (!pendingNewSlot) return;
    const slotId = pendingNewSlot.id;
    setPendingNewSlot(null);
    onStartNewBrowserGame(slotId);
  };

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
        <div className="space-y-4">
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
                  normalizedGameSettings.offlineSimulationEnabled
                    ? "border-cyan-800 bg-cyan-950/45 text-cyan-200"
                    : "border-emerald-800 bg-emerald-950/45 text-emerald-200"
                }`}
              >
                {normalizedGameSettings.offlineSimulationEnabled
                  ? "Simulation enabled"
                  : "Everyone always online"}
              </span>
            </span>
            <input
              type="checkbox"
              aria-label="Offline Simulation"
              checked={normalizedGameSettings.offlineSimulationEnabled}
              onChange={(event) =>
                onGameSettingsChange({
                  offlineSimulationEnabled: event.target.checked,
                })
              }
              className="mt-0.5 h-6 w-6 shrink-0 rounded border-slate-600 bg-slate-950 accent-cyan-500"
            />
          </label>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-amber-900/60 bg-amber-950/15 p-4">
              <h3 className="text-sm font-bold text-amber-100">
                Guild Density
              </h3>
              <p className="mt-1 min-h-10 text-xs leading-relaxed text-slate-400">
                Guides how many NPC guilds the realm supports. Existing guilds
                are never removed immediately when this changes.
              </p>
              <SegmentedControl
                ariaLabel="Guild Density"
                options={REALM_GUILD_DENSITY_OPTIONS}
                value={normalizedGameSettings.realmGuildDensity}
                onChange={(realmGuildDensity) =>
                  onGameSettingsChange({ realmGuildDensity })
                }
                className="mt-3"
              />
            </div>
            <div className="rounded-lg border border-violet-900/60 bg-violet-950/15 p-4">
              <h3 className="text-sm font-bold text-violet-100">
                Guild Dynamics
              </h3>
              <p className="mt-1 min-h-10 text-xs leading-relaxed text-slate-400">
                Guides the future pace of founding, mergers, acquisitions,
                disbands, and member transfers.
              </p>
              <SegmentedControl
                ariaLabel="Guild Dynamics"
                options={REALM_GUILD_DYNAMICS_OPTIONS}
                value={normalizedGameSettings.realmGuildDynamics}
                onChange={(realmGuildDynamics) =>
                  onGameSettingsChange({ realmGuildDynamics })
                }
                tone="sky"
                className="mt-3"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg md:p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-lg border border-amber-900 bg-amber-950/35 p-2 text-amber-300">
              <HardDrive size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="fantasy-font text-lg font-bold text-amber-100">
                Browser Saves
              </h2>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
                Three independent games can be stored in this browser.
                Autosave always updates the active slot.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {browserSaveSlots.map((slot) => (
              <article
                key={slot.id}
                className={`rounded-lg border p-4 ${
                  slot.active
                    ? "border-amber-600 bg-amber-950/20"
                    : "border-slate-700 bg-slate-950/55"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Save Slot {slot.id}
                    </p>
                    <h3 className="mt-1 truncate font-bold text-slate-100">
                      {slot.guildName || "Empty Slot"}
                    </h3>
                  </div>
                  {slot.active ? (
                    <span className="shrink-0 rounded-full border border-amber-700 bg-amber-950/55 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                      Active
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 min-h-10 text-xs text-slate-400">
                  {slot.hasSave ? (
                    <>
                      {slot.gameDay ? <p>Game Day {slot.gameDay}</p> : null}
                      <p>
                        {slot.savedAt
                          ? `Saved ${new Date(slot.savedAt).toLocaleString()}`
                          : "Save date unavailable"}
                      </p>
                    </>
                  ) : (
                    <p>Ready for a new guild.</p>
                  )}
                </div>

                <div className="mt-4 grid gap-2">
                  {slot.hasSave && !slot.active ? (
                    <GameButton
                      size="sm"
                      tone="quest"
                      fullWidth
                      icon={<FolderOpen size={16} aria-hidden="true" />}
                      onClick={() => onLoadBrowserSave(slot.id)}
                    >
                      Load Save
                    </GameButton>
                  ) : null}
                  <GameButton
                    size="sm"
                    tone={slot.hasSave ? "danger" : "success"}
                    fullWidth
                    icon={
                      slot.hasSave ? (
                        <Trash2 size={16} aria-hidden="true" />
                      ) : (
                        <Plus size={16} aria-hidden="true" />
                      )
                    }
                    onClick={() => setPendingNewSlot(slot)}
                  >
                    {slot.hasSave ? "Restart Slot" : "Start New Game"}
                  </GameButton>
                </div>
              </article>
            ))}
          </div>

        </section>
        </div>
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

      <BaseModal
        isOpen={pendingNewSlot !== null}
        onClose={() => setPendingNewSlot(null)}
        labelledBy="new-game-confirmation-title"
        overlayClassName="bg-black/80 p-4 backdrop-blur-sm"
        panelClassName="w-full max-w-md rounded-xl border border-red-800 bg-slate-950 p-5 shadow-2xl"
      >
        {pendingNewSlot ? (
          <>
            <h2
              id="new-game-confirmation-title"
              className="fantasy-font text-xl font-bold text-red-100"
            >
              Start a new game in Save Slot {pendingNewSlot.id}?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {pendingNewSlot.hasSave
                ? `${pendingNewSlot.guildName} will be permanently replaced. Export it first if you want to keep a backup.`
                : "You will return to guild creation and this slot will become the active autosave."}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <GameButton
                size="sm"
                tone="neutral"
                onClick={() => setPendingNewSlot(null)}
              >
                Cancel
              </GameButton>
              <GameButton
                size="sm"
                tone="danger"
                onClick={handleConfirmNewGame}
              >
                Confirm New Game
              </GameButton>
            </div>
          </>
        ) : null}
      </BaseModal>
    </div>
  );
}
