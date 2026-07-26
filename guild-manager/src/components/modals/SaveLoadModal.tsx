import { Download, Upload } from "lucide-react";

import BaseModal from "./BaseModal";
import GameButton from "../ui/GameButton";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSaveSession: () => void;
  onLoadSession: () => void;
};

export default function SaveLoadModal({
  isOpen,
  onClose,
  onSaveSession,
  onLoadSession,
}: Props) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/70 backdrop-blur-sm p-4"
      panelClassName="wow-modal-panel w-full max-w-md overflow-hidden rounded-xl border-2 border-slate-700 bg-gray-900 shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-slate-700 p-4">
        <div>
          <h2 className="fantasy-font text-lg font-bold text-amber-100">
            Save &amp; Load
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Export this guild or restore a session file.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close save and load"
          onClick={onClose}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-2xl text-slate-500 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          &times;
        </button>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <GameButton
          tone="success"
          icon={<Download size={18} aria-hidden="true" />}
          onClick={() => {
            onSaveSession();
            onClose();
          }}
        >
          Save Session
        </GameButton>
        <GameButton
          tone="quest"
          icon={<Upload size={18} aria-hidden="true" />}
          onClick={() => {
            onLoadSession();
            onClose();
          }}
        >
          Load Session
        </GameButton>
      </div>
    </BaseModal>
  );
}
