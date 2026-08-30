import { HardDrive, X } from "lucide-react";

import type {
  BrowserSaveSlotId,
  BrowserSaveSlotSummary,
} from "../../session/browserSessionPersistence";
import BaseModal from "./BaseModal";
import BrowserSaveSlots from "../session/BrowserSaveSlots";

type BrowserSaveSlotsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  slots: BrowserSaveSlotSummary[];
  onLoadBrowserSave: (slotId: BrowserSaveSlotId) => void;
};

export default function BrowserSaveSlotsModal({
  isOpen,
  onClose,
  slots,
  onLoadBrowserSave,
}: BrowserSaveSlotsModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="browser-saves-title"
      overlayClassName="bg-black/75 p-4 backdrop-blur-sm"
      panelClassName="wow-modal-panel w-full max-w-4xl overflow-hidden rounded-xl border-2 border-amber-800 bg-gray-900 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-700 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-lg border border-amber-800 bg-amber-950/40 p-2 text-amber-300">
            <HardDrive size={21} aria-hidden="true" />
          </span>
          <div>
            <h2
              id="browser-saves-title"
              className="fantasy-font text-xl font-bold text-amber-100"
            >
              Browser Saves
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Choose one of the three guild sessions stored in this browser.
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close browser saves"
          onClick={onClose}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-2xl text-slate-500 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="max-h-[min(70vh,34rem)] overflow-y-auto p-4 md:p-5">
        <BrowserSaveSlots
          slots={slots}
          onLoadBrowserSave={(slotId) => {
            onLoadBrowserSave(slotId);
            onClose();
          }}
          allowActiveLoad
          className="grid gap-3 md:grid-cols-3"
        />
      </div>
    </BaseModal>
  );
}
