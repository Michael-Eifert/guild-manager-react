import {
  Gamepad2,
  HardDrive,
  Settings2,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";

import BaseModal from "../../components/modals/BaseModal";
import ChatAiSettingsPanel from "../../components/settings/ChatAiSettingsPanel";
import DebugSettingsPanel from "../../components/settings/DebugSettingsPanel";
import GameButton from "../../components/ui/GameButton";
import SegmentedControl from "../../components/ui/SegmentedControl";
import BrowserSaveSlots from "../../components/session/BrowserSaveSlots";
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
import type { GuildSetupState } from "../../app/gameTypes";
import { getContentPhaseLabel } from "../../content/contentRules";

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
  onDeleteBrowserSave: (slotId: BrowserSaveSlotId) => void;
  guildSetup: GuildSetupState;
  onActivateTbcPrepatch: () => boolean;
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
  onDeleteBrowserSave,
  guildSetup,
  onActivateTbcPrepatch,
}: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("gameplay");
  const [pendingNewSlot, setPendingNewSlot] =
    useState<BrowserSaveSlotSummary | null>(null);
  const [pendingDeleteSlot, setPendingDeleteSlot] =
    useState<BrowserSaveSlotSummary | null>(null);
  const [showPrepatchConfirmation, setShowPrepatchConfirmation] =
    useState(false);
  const normalizedGameSettings = normalizeGameSettings(gameSettings);

  const handleConfirmNewGame = () => {
    if (!pendingNewSlot) return;
    const slotId = pendingNewSlot.id;
    setPendingNewSlot(null);
    onStartNewBrowserGame(slotId);
  };
  const handleConfirmDeleteSave = () => {
    if (!pendingDeleteSlot) return;
    const slotId = pendingDeleteSlot.id;
    setPendingDeleteSlot(null);
    onDeleteBrowserSave(slotId);
  };
  const handleRequestNewGame = (slotId: BrowserSaveSlotId) => {
    const slot = browserSaveSlots.find((entry) => entry.id === slotId);
    if (slot) setPendingNewSlot(slot);
  };
  const handleRequestDeleteSave = (slotId: BrowserSaveSlotId) => {
    const slot = browserSaveSlots.find((entry) => entry.id === slotId);
    if (slot) setPendingDeleteSlot(slot);
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

          <label className="mt-4 block rounded-lg border border-cyan-900/60 bg-cyan-950/15 p-4">
            <span className="block text-sm font-bold text-cyan-100">Automatic Run Preparation</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-400">Controls whether automatically formed dungeon groups may consume profession supplies. Existing saves default to None.</span>
            <select
              value={normalizedGameSettings.autoRunPreparationMode}
              onChange={(event) => onGameSettingsChange({ autoRunPreparationMode: event.target.value as "none" | "basic" | "best" })}
              className="mt-3 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="none">None</option>
              <option value="basic">Basic</option>
              <option value="best">Best Available</option>
            </select>
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

          <div className="mt-4 rounded-lg border border-fuchsia-900/70 bg-fuchsia-950/15 p-4">
            <div className="flex items-start gap-3">
              <span className="rounded-lg border border-fuchsia-800 bg-fuchsia-950/45 p-2 text-fuchsia-300">
                <WandSparkles size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-fuchsia-100">
                  Content Route
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Current phase: {getContentPhaseLabel(guildSetup.contentPhase)}.
                  The TBC Pre-Patch unlocks Draenei, Blood Elves, their 1–20
                  regions, and faction-crossed Paladins and Shamans.
                </p>
                {guildSetup.contentPhase !== "tbc_prepatch" ? (
                  <GameButton
                    size="sm"
                    tone="primary"
                    className="mt-3"
                    onClick={() => setShowPrepatchConfirmation(true)}
                  >
                    Activate TBC Pre-Patch
                  </GameButton>
                ) : (
                  <span className="mt-3 inline-flex rounded-full border border-fuchsia-700 bg-fuchsia-950/45 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-fuchsia-200">
                    Burning Crusade route active
                  </span>
                )}
              </div>
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

          <BrowserSaveSlots
            slots={browserSaveSlots}
            onLoadBrowserSave={onLoadBrowserSave}
            onStartNewBrowserGame={handleRequestNewGame}
            onDeleteBrowserSave={handleRequestDeleteSave}
          />

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
        isOpen={showPrepatchConfirmation}
        onClose={() => setShowPrepatchConfirmation(false)}
        labelledBy="prepatch-confirmation-title"
        overlayClassName="bg-black/80 p-4 backdrop-blur-sm"
        panelClassName="w-full max-w-md rounded-xl border border-fuchsia-700 bg-slate-950 p-5 shadow-2xl"
      >
        <h2
          id="prepatch-confirmation-title"
          className="fantasy-font text-xl font-bold text-fuchsia-100"
        >
          Activate the TBC Pre-Patch?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          This permanently commits this save to the Burning Crusade route. A
          deterministic first wave of Draenei and Blood Elf free agents will
          arrive immediately; existing characters and guilds remain unchanged.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <GameButton
            size="sm"
            tone="neutral"
            onClick={() => setShowPrepatchConfirmation(false)}
          >
            Cancel
          </GameButton>
          <GameButton
            size="sm"
            tone="primary"
            onClick={() => {
              onActivateTbcPrepatch();
              setShowPrepatchConfirmation(false);
            }}
          >
            Activate Permanently
          </GameButton>
        </div>
      </BaseModal>

      <BaseModal
        isOpen={pendingNewSlot !== null}
        onClose={() => setPendingNewSlot(null)}
        labelledBy="new-game-confirmation-title"
        overlayClassName="bg-black/80 p-4 backdrop-blur-sm"
        panelClassName="w-full max-w-md rounded-xl border border-amber-700 bg-slate-950 p-5 shadow-2xl"
      >
        {pendingNewSlot ? (
          <>
            <h2
              id="new-game-confirmation-title"
              className="fantasy-font text-xl font-bold text-amber-100"
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
                tone="primary"
                onClick={handleConfirmNewGame}
              >
                Confirm New Game
              </GameButton>
            </div>
          </>
        ) : null}
      </BaseModal>

      <BaseModal
        isOpen={pendingDeleteSlot !== null}
        onClose={() => setPendingDeleteSlot(null)}
        labelledBy="delete-save-confirmation-title"
        overlayClassName="bg-black/80 p-4 backdrop-blur-sm"
        panelClassName="w-full max-w-md rounded-xl border border-red-800 bg-slate-950 p-5 shadow-2xl"
      >
        {pendingDeleteSlot ? (
          <>
            <h2
              id="delete-save-confirmation-title"
              className="fantasy-font text-xl font-bold text-red-100"
            >
              Delete Save Slot {pendingDeleteSlot.id}?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {pendingDeleteSlot.guildName} will be permanently deleted.
              {pendingDeleteSlot.active
                ? " Because this is the active save, you will return to guild creation."
                : " The active game and other browser saves will not be changed."}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <GameButton
                size="sm"
                tone="neutral"
                onClick={() => setPendingDeleteSlot(null)}
              >
                Cancel
              </GameButton>
              <GameButton
                size="sm"
                tone="danger"
                icon={<Trash2 size={16} aria-hidden="true" />}
                onClick={handleConfirmDeleteSave}
              >
                Delete Save
              </GameButton>
            </div>
          </>
        ) : null}
      </BaseModal>
    </div>
  );
}
