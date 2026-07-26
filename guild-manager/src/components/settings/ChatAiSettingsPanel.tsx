import { useState } from "react";
import { Bot, Server } from "lucide-react";

import {
  DEFAULT_CHAT_AI_SETTINGS,
  normalizeChatAiSettings,
  type ChatAiSettings,
} from "../../social/chatProviders";
import GameButton from "../ui/GameButton";

type Props = {
  settings?: ChatAiSettings;
  onChange?: (settings: ChatAiSettings) => void;
  onTestConnection?: (
    settings: ChatAiSettings,
  ) => Promise<{ ok: boolean; message: string }>;
};

export default function ChatAiSettingsPanel({
  settings = DEFAULT_CHAT_AI_SETTINGS,
  onChange,
  onTestConnection,
}: Props) {
  const [connectionStatus, setConnectionStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const normalized = normalizeChatAiSettings(settings);
  const updateSetting = <Key extends keyof ChatAiSettings>(
    key: Key,
    value: ChatAiSettings[Key],
  ) => {
    setConnectionStatus(null);
    onChange?.({ ...normalized, [key]: value });
  };
  const testConnection = async () => {
    if (!onTestConnection) return;
    setIsTesting(true);
    try {
      setConnectionStatus(await onTestConnection(normalized));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <span className="rounded-lg border border-violet-800 bg-violet-950/45 p-2 text-violet-300">
          <Bot size={20} aria-hidden="true" />
        </span>
        <div>
          <h2 className="fantasy-font text-lg font-bold text-amber-100">
            Character Chat Text
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Game mechanics remain deterministic. Providers may only rewrite
            displayed dialogue; templates are always the fallback.
          </p>
        </div>
      </div>

      <div
        className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3"
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
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 text-center text-xs font-bold transition-colors focus-within:ring-2 focus-within:ring-amber-300 ${
              normalized.provider === value
                ? "border-amber-500 bg-amber-950/45 text-amber-100"
                : "border-slate-700 bg-slate-950/65 text-slate-300 hover:border-slate-500"
            }`}
          >
            <input
              type="radio"
              name="chat-provider"
              value={value}
              checked={normalized.provider === value}
              onChange={() =>
                updateSetting(
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

      {normalized.provider === "openai-compatible" ? (
        <div className="mt-4 flex gap-3 rounded-lg border border-sky-900/80 bg-sky-950/30 p-3 text-xs text-sky-200">
          <Server size={17} className="shrink-0" aria-hidden="true" />
          <p>
            Uses the server-side <code>VITE_AI_PROXY_URL</code>. API keys remain
            in the proxy environment and are never stored in the browser or
            game session. GitHub Pages needs a separately hosted proxy.
          </p>
        </div>
      ) : null}

      {normalized.provider === "ollama" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-slate-300">
            Ollama address
            <input
              value={normalized.ollamaUrl}
              onChange={(event) =>
                updateSetting("ollamaUrl", event.target.value)
              }
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-500"
              placeholder="http://localhost:11434"
            />
          </label>
          <label className="block text-xs font-bold text-slate-300">
            Model
            <input
              value={normalized.ollamaModel}
              onChange={(event) =>
                updateSetting("ollamaModel", event.target.value)
              }
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-500"
              placeholder="llama3.2:3b"
            />
          </label>
          <p className="text-[11px] text-slate-500 sm:col-span-2">
            Ollama must allow this app&apos;s origin via OLLAMA_ORIGINS. These
            settings stay on this device.
          </p>
        </div>
      ) : null}

      {normalized.provider !== "templates" ? (
        <div className="mt-4 max-w-sm">
          <GameButton
            tone="neutral"
            onClick={testConnection}
            disabled={isTesting || !onTestConnection}
            fullWidth
          >
            {isTesting ? "Testing connection..." : "Test connection"}
          </GameButton>
          {connectionStatus ? (
            <p
              role="status"
              className={`mt-2 text-xs ${
                connectionStatus.ok ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {connectionStatus.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
