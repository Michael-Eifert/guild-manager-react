import { Download, Upload } from "lucide-react";
import { useState } from "react";

import BaseModal from "./BaseModal";
import GameButton from "../ui/GameButton";
import {
  readPreferredSessionFilename,
  writePreferredSessionFilename,
} from "../../session/sessionExportFilename";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSaveSession: (preferredFilename?: string) => void;
  onLoadSession: () => void;
};

export default function SaveLoadModal({
  isOpen,
  onClose,
  onSaveSession,
  onLoadSession,
}: Props) {
  const [preferredFilename, setPreferredFilename] = useState(
    readPreferredSessionFilename,
  );

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
      <div className="p-4">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-300">
            Save file name
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-slate-500">
            Optional. Leave empty to use the automatic timestamped name.
          </span>
          <input
            type="text"
            aria-label="Save file name"
            value={preferredFilename}
            maxLength={120}
            placeholder="guild-session"
            onChange={(event) => {
              const nextValue = event.target.value;
              setPreferredFilename(nextValue);
              writePreferredSessionFilename(nextValue);
            }}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <GameButton
            tone="success"
            icon={<Download size={18} aria-hidden="true" />}
            onClick={() => {
              writePreferredSessionFilename(preferredFilename);
              onSaveSession(preferredFilename);
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
      </div>
    </BaseModal>
  );
}
