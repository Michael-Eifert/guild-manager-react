import type {
  ChatIntent,
  ChatMessage,
  PartyParticipant,
} from "./chatTypes";

export type ChatTextProviderKind =
  | "templates"
  | "openai-compatible"
  | "ollama";

export interface ChatAiSettings {
  provider: ChatTextProviderKind;
  ollamaUrl: string;
  ollamaModel: string;
}

export interface ChatTextContext {
  message: ChatMessage;
  recentMessages: ChatMessage[];
}

export interface ChatTextProvider {
  generate(
    intent: ChatIntent,
    context: ChatTextContext,
    signal: AbortSignal,
  ): Promise<string>;
}

export const CHAT_AI_SETTINGS_STORAGE_KEY = "guild-manager:chat-ai-settings";
export const CHAT_AI_TIMEOUT_MS = 6_000;
export const CHAT_AI_MAX_QUEUE_SIZE = 4;
export const DEFAULT_CHAT_AI_SETTINGS: ChatAiSettings = Object.freeze({
  provider: "templates",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.2:3b",
});

const isProviderKind = (value: unknown): value is ChatTextProviderKind =>
  value === "templates" ||
  value === "openai-compatible" ||
  value === "ollama";

export const normalizeChatAiSettings = (
  value: unknown,
): ChatAiSettings => {
  const input =
    value && typeof value === "object"
      ? (value as Partial<ChatAiSettings>)
      : {};
  const rawUrl = String(input.ollamaUrl || DEFAULT_CHAT_AI_SETTINGS.ollamaUrl)
    .trim()
    .replace(/\/+$/, "");
  return {
    provider: isProviderKind(input.provider)
      ? input.provider
      : DEFAULT_CHAT_AI_SETTINGS.provider,
    ollamaUrl: /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : DEFAULT_CHAT_AI_SETTINGS.ollamaUrl,
    ollamaModel:
      String(input.ollamaModel || DEFAULT_CHAT_AI_SETTINGS.ollamaModel).trim() ||
      DEFAULT_CHAT_AI_SETTINGS.ollamaModel,
  };
};

export const loadChatAiSettings = (
  storage: Pick<Storage, "getItem"> | null =
    typeof window === "undefined" ? null : window.localStorage,
) => {
  if (!storage) return { ...DEFAULT_CHAT_AI_SETTINGS };
  try {
    const saved = storage.getItem(CHAT_AI_SETTINGS_STORAGE_KEY);
    return normalizeChatAiSettings(saved ? JSON.parse(saved) : null);
  } catch {
    return { ...DEFAULT_CHAT_AI_SETTINGS };
  }
};

export const saveChatAiSettings = (
  settings: ChatAiSettings,
  storage: Pick<Storage, "setItem"> | null =
    typeof window === "undefined" ? null : window.localStorage,
) => {
  const normalized = normalizeChatAiSettings(settings);
  if (storage) {
    try {
      storage.setItem(
        CHAT_AI_SETTINGS_STORAGE_KEY,
        JSON.stringify(normalized),
      );
    } catch {
      // Device storage can be disabled; keep the in-memory selection working.
    }
  }
  return normalized;
};

export const sanitizeGeneratedChatText = (value: unknown) =>
  String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

const describeSpeaker = (speaker: PartyParticipant | null) => {
  if (!speaker) return "A neutral system narrator";
  const traits = Array.isArray(speaker.personalityTraits)
    ? speaker.personalityTraits
        .map((trait) =>
          typeof trait === "string"
            ? trait
            : String(
                (trait as { name?: unknown; id?: unknown })?.name ||
                  (trait as { id?: unknown })?.id ||
                  "",
              ),
        )
        .filter(Boolean)
        .slice(0, 3)
        .join(", ")
    : "";
  return [
    `${speaker.name}, level ${speaker.level}`,
    speaker.charClass,
    speaker.role,
    speaker.source === "guild"
      ? "member of the player's guild"
      : `realm player from ${speaker.guildName || "no guild"}`,
    traits ? `personality: ${traits}` : "",
  ]
    .filter(Boolean)
    .join(", ");
};

export const buildChatPrompt = (
  intent: ChatIntent,
  context: ChatTextContext,
) => {
  const { message, recentMessages } = context;
  const history = recentMessages
    .slice(-4)
    .map((entry) => `${entry.speaker?.name || "System"}: ${entry.text || entry.fallbackText}`)
    .join("\n");
  return [
    "You write one short in-character line for a classic fantasy MMO guild-management simulation.",
    "Return only the chat line. Never issue game commands or decide whether a character joins, leaves, or starts an activity.",
    "Keep it natural, family-friendly, under 240 characters, and in the same language as the recent chat.",
    `Channel: ${message.channel}. Event intent: ${intent}.`,
    `Speaker: ${describeSpeaker(message.speaker)}.`,
    `Mechanically approved fallback meaning: ${message.fallbackText}`,
    history ? `Recent chat:\n${history}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const readResponseText = async (response: Response) => {
  const data = (await response.json()) as {
    text?: unknown;
    response?: unknown;
  };
  const text = sanitizeGeneratedChatText(data.text ?? data.response);
  if (!response.ok || !text) {
    throw new Error(`Chat text provider failed (${response.status})`);
  }
  return text;
};

export const createChatTextProvider = ({
  settings,
  fetchImpl = globalThis.fetch,
  proxyUrl = import.meta.env.VITE_AI_PROXY_URL || "",
}: {
  settings: ChatAiSettings;
  fetchImpl?: typeof globalThis.fetch;
  proxyUrl?: string;
}): ChatTextProvider | null => {
  const normalized = normalizeChatAiSettings(settings);
  if (normalized.provider === "templates") return null;

  if (normalized.provider === "openai-compatible") {
    return {
      async generate(intent, context, signal) {
        if (!proxyUrl) throw new Error("VITE_AI_PROXY_URL is not configured");
        const response = await fetchImpl(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            intent,
            prompt: buildChatPrompt(intent, context),
          }),
        });
        return readResponseText(response);
      },
    };
  }

  return {
    async generate(intent, context, signal) {
      const response = await fetchImpl(`${normalized.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          model: normalized.ollamaModel,
          prompt: buildChatPrompt(intent, context),
          stream: false,
          options: { temperature: 0.75 },
        }),
      });
      return readResponseText(response);
    },
  };
};

export const generateChatTextWithTimeout = async ({
  provider,
  message,
  recentMessages,
  timeoutMs = CHAT_AI_TIMEOUT_MS,
}: {
  provider: ChatTextProvider;
  message: ChatMessage;
  recentMessages: ChatMessage[];
  timeoutMs?: number;
}) => {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return sanitizeGeneratedChatText(
      await provider.generate(
        message.intent,
        { message, recentMessages },
        controller.signal,
      ),
    );
  } finally {
    globalThis.clearTimeout(timeout);
  }
};

export const testChatProviderConnection = async ({
  settings,
  fetchImpl = globalThis.fetch,
  proxyUrl = import.meta.env.VITE_AI_PROXY_URL || "",
}: {
  settings: ChatAiSettings;
  fetchImpl?: typeof globalThis.fetch;
  proxyUrl?: string;
}) => {
  const normalized = normalizeChatAiSettings(settings);
  if (normalized.provider === "templates") {
    return { ok: true, message: "Templates are always available." };
  }
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    CHAT_AI_TIMEOUT_MS,
  );
  try {
    const url =
      normalized.provider === "ollama"
        ? `${normalized.ollamaUrl}/api/tags`
        : proxyUrl.replace(/\/api\/[^/]+$/, "/health");
    if (!url) {
      return {
        ok: false,
        message: "VITE_AI_PROXY_URL is not configured for this build.",
      };
    }
    const response = await fetchImpl(url, { signal: controller.signal });
    return response.ok
      ? { ok: true, message: "Connection successful." }
      : { ok: false, message: `Connection failed (${response.status}).` };
  } catch (error) {
    return {
      ok: false,
      message:
        (error as Error)?.name === "AbortError"
          ? "Connection timed out."
          : "Connection failed. Check the address and CORS settings.",
    };
  } finally {
    globalThis.clearTimeout(timeout);
  }
};
