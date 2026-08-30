import { FolderOpen, Plus, RefreshCcw, Trash2 } from "lucide-react";

import type {
  BrowserSaveSlotId,
  BrowserSaveSlotSummary,
} from "../../session/browserSessionPersistence";
import GameButton from "../ui/GameButton";

type BrowserSaveSlotsProps = {
  slots: BrowserSaveSlotSummary[];
  onLoadBrowserSave: (slotId: BrowserSaveSlotId) => void;
  onStartNewBrowserGame?: (slotId: BrowserSaveSlotId) => void;
  onDeleteBrowserSave?: (slotId: BrowserSaveSlotId) => void;
  allowActiveLoad?: boolean;
  className?: string;
};

export default function BrowserSaveSlots({
  slots,
  onLoadBrowserSave,
  onStartNewBrowserGame,
  onDeleteBrowserSave,
  allowActiveLoad = false,
  className = "mt-4 grid gap-3 lg:grid-cols-3",
}: BrowserSaveSlotsProps) {
  const showManagementActions =
    Boolean(onStartNewBrowserGame) || Boolean(onDeleteBrowserSave);

  return (
    <div className={className}>
      {slots.map((slot) => {
        const canLoad =
          slot.hasSave && (allowActiveLoad || !slot.active);
        const loadButton = canLoad ? (
          <GameButton
            size="sm"
            tone="quest"
            fullWidth
            className={showManagementActions ? "col-span-2" : "mt-4"}
            icon={<FolderOpen size={16} aria-hidden="true" />}
            onClick={() => onLoadBrowserSave(slot.id)}
          >
            Load Save
          </GameButton>
        ) : null;

        return (
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

            {showManagementActions ? (
              <div
                className={`mt-4 grid gap-2 ${slot.hasSave ? "grid-cols-2" : ""}`}
              >
                {loadButton}
                {onStartNewBrowserGame ? (
                  <GameButton
                    size="sm"
                    tone={slot.hasSave ? "neutral" : "success"}
                    fullWidth
                    icon={
                      slot.hasSave ? (
                        <RefreshCcw size={16} aria-hidden="true" />
                      ) : (
                        <Plus size={16} aria-hidden="true" />
                      )
                    }
                    onClick={() => onStartNewBrowserGame(slot.id)}
                  >
                    {slot.hasSave ? "Restart Slot" : "Start New Game"}
                  </GameButton>
                ) : null}
                {slot.hasSave && onDeleteBrowserSave ? (
                  <GameButton
                    size="sm"
                    tone="danger"
                    fullWidth
                    icon={<Trash2 size={16} aria-hidden="true" />}
                    onClick={() => onDeleteBrowserSave(slot.id)}
                  >
                    Delete Save
                  </GameButton>
                ) : null}
              </div>
            ) : (
              loadButton
            )}
          </article>
        );
      })}
    </div>
  );
}
