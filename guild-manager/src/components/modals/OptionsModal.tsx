import { useState } from "react";
import BaseModal from "./BaseModal";
import GameButton from "../ui/GameButton";
import {
  DEFAULT_CHAT_AI_SETTINGS,
  normalizeChatAiSettings,
  type ChatAiSettings,
} from "../../social/chatProviders";

const OptionsModal = ({
  isOpen,
  onClose,
  onSaveSession,
  onLoadSession,
  onOpenDebug,
  chatAiSettings = DEFAULT_CHAT_AI_SETTINGS,
  onChatAiSettingsChange,
  onTestChatProvider,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaveSession: () => void;
  onLoadSession: () => void;
  onOpenDebug: () => void;
  chatAiSettings?: ChatAiSettings;
  onChatAiSettingsChange?: (settings: ChatAiSettings) => void;
  onTestChatProvider?: (
    settings: ChatAiSettings,
  ) => Promise<{ ok: boolean; message: string }>;
}) => {
  const [connectionStatus, setConnectionStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const normalizedSettings = normalizeChatAiSettings(chatAiSettings);
  const updateChatSetting = <Key extends keyof ChatAiSettings>(
    key: Key,
    value: ChatAiSettings[Key],
  ) => {
    setConnectionStatus(null);
    onChatAiSettingsChange?.({
      ...normalizedSettings,
      [key]: value,
    });
  };
  const testConnection = async () => {
    if (!onTestChatProvider) return;
    setIsTesting(true);
    try {
      setConnectionStatus(await onTestChatProvider(normalizedSettings));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/70 backdrop-blur-sm p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-2 border-gray-700 rounded-lg w-full max-w-lg shadow-2xl max-h-[min(90vh,760px)] overflow-y-auto"
    >
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-bold fantasy-font text-gray-100">Settings</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl px-1">
          &times;
        </button>
      </div>
      <div className="p-4 space-y-3">
        <section className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
          <div>
            <h3 className="text-sm font-bold text-amber-100">
              Character chat text
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Chat mechanics remain deterministic. A provider may only rewrite
              the displayed line; templates are always the fallback.
            </p>
          </div>

          <div
            className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Character chat text provider"
          >
            {[
              ["templates", "Templates"],
              ["openai-compatible", "OpenAI-compatible"],
              ["ollama", "Ollama"],
            ].map(([value, label]) => (
              <label
                key={value}
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-2 text-center text-xs font-bold transition ${
                  normalizedSettings.provider === value
                    ? "border-amber-500 bg-amber-950/50 text-amber-100"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                }`}
              >
                <input
                  type="radio"
                  name="chat-provider"
                  value={value}
                  checked={normalizedSettings.provider === value}
                  onChange={() =>
                    updateChatSetting(
                      "provider",
                      value as ChatAiSettings["provider"],
                    )
                  }
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>

          {normalizedSettings.provider === "openai-compatible" && (
            <p className="mt-3 rounded border border-sky-900/80 bg-sky-950/30 p-2 text-xs text-sky-200">
              Uses the server-side <code>VITE_AI_PROXY_URL</code>. The API key
              stays in the proxy environment and is never saved in the browser.
              GitHub Pages needs a separately hosted proxy.
            </p>
          )}

          {normalizedSettings.provider === "ollama" && (
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Ollama address
                <input
                  value={normalizedSettings.ollamaUrl}
                  onChange={(event) =>
                    updateChatSetting("ollamaUrl", event.target.value)
                  }
                  className="mt-1 min-h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-500"
                  placeholder="http://localhost:11434"
                />
              </label>
              <label className="block text-xs font-bold text-slate-300">
                Model
                <input
                  value={normalizedSettings.ollamaModel}
                  onChange={(event) =>
                    updateChatSetting("ollamaModel", event.target.value)
                  }
                  className="mt-1 min-h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-500"
                  placeholder="llama3.2:3b"
                />
              </label>
              <p className="text-[11px] text-slate-500">
                Ollama must allow this app&apos;s origin via
                OLLAMA_ORIGINS. Settings stay on this device.
              </p>
            </div>
          )}

          {normalizedSettings.provider !== "templates" && (
            <div className="mt-3">
              <GameButton
                tone="neutral"
                onClick={testConnection}
                disabled={isTesting || !onTestChatProvider}
                className="w-full"
              >
                {isTesting ? "Testing connection..." : "Test connection"}
              </GameButton>
              {connectionStatus && (
                <p
                  role="status"
                  className={`mt-2 text-xs ${
                    connectionStatus.ok ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {connectionStatus.message}
                </p>
              )}
            </div>
          )}
        </section>

        <button
          onClick={() => {
            onSaveSession();
            onClose();
          }}
          className="w-full px-4 py-3 rounded border border-emerald-800 bg-gray-800 text-emerald-200 hover:bg-gray-700 text-sm font-bold"
        >
          &#128190; Save Session
        </button>
        <button
          onClick={() => {
            onLoadSession();
            onClose();
          }}
          className="w-full px-4 py-3 rounded border border-teal-800 bg-gray-800 text-teal-200 hover:bg-gray-700 text-sm font-bold"
        >
          &#128193; Load Session
        </button>
        <button
          onClick={() => {
            onOpenDebug();
            onClose();
          }}
          className="w-full px-4 py-3 rounded border border-red-900 bg-gray-900 text-red-300 hover:bg-red-900/20 text-sm font-bold"
        >
          &#9881;&#65039; Debug Menu
        </button>
      </div>
    </BaseModal>
  );
};

export default OptionsModal;
