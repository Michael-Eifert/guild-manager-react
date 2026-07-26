import { describe, expect, it, vi } from "vitest";

import {
  CHAT_AI_MAX_QUEUE_SIZE,
  createChatTextProvider,
  generateChatTextWithTimeout,
  sanitizeGeneratedChatText,
} from "../social/chatProviders";
import type { ChatMessage } from "../social/chatTypes";
import { renderChatTemplate } from "../social/chatTemplates";

const message: ChatMessage = {
  id: "chat:1",
  sequence: 1,
  channel: "guild",
  intent: "lfg-request",
  text: "",
  fallbackText: "Anyone for The Deadmines?",
  textSource: "template",
  generationStatus: "pending",
  gameTimeMs: 1,
  speaker: {
    id: "guild-1",
    source: "guild",
    name: "Aria",
    charClass: "Priest",
    role: "Healer",
    level: 20,
  },
};

describe("chat text providers", () => {
  it("uses personality-specific deterministic fallback lines", () => {
    const text = renderChatTemplate({
      channel: "guild",
      intent: "lfg-request",
      speaker: {
        id: "expert",
        source: "guild",
        name: "Aria",
        level: 20,
        personalityTraits: ["dungeon_expert"],
      },
      missionName: "The Deadmines",
      currentSize: 2,
      targetSize: 5,
    });
    expect(text).toContain("clean route");
    expect(text).toContain("The Deadmines");
  });

  it("offers varied celebratory fallback lines for mission success", () => {
    const lines = Array.from({ length: 20 }, (_, index) =>
      renderChatTemplate({
        channel: "guild",
        intent: "mission-success",
        speaker: {
          id: `hero-${index}`,
          source: "guild",
          name: `Hero ${index}`,
          level: 20,
        },
        missionName: "The Deadmines",
      }),
    );

    expect(new Set(lines).size).toBeGreaterThanOrEqual(5);
    expect(lines.every((line) => line.includes("The Deadmines"))).toBe(true);
  });

  it("sanitizes generated text to a single bounded chat line", () => {
    const text = sanitizeGeneratedChatText(
      `"Ready!\nI can heal.\t${"x".repeat(300)}"`,
    );
    expect(text).not.toMatch(/[\r\n\t]/);
    expect(text.length).toBeLessThanOrEqual(240);
    expect(text.startsWith("Ready! I can heal.")).toBe(true);
  });

  it("uses an OpenAI-compatible proxy without exposing an API key", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: "I can heal that run!" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const provider = createChatTextProvider({
      settings: {
        provider: "openai-compatible",
        ollamaUrl: "http://localhost:11434",
        ollamaModel: "unused",
      },
      proxyUrl: "https://proxy.example/api/chat",
      fetchImpl,
    });

    const text = await provider?.generate(
      message.intent,
      { message, recentMessages: [] },
      new AbortController().signal,
    );
    expect(text).toBe("I can heal that run!");
    const request = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(request.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.stringify(request.body)).not.toContain("apiKey");
  });

  it("aborts a provider after the configured timeout", async () => {
    const provider = {
      generate: vi.fn(
        (_intent, _context, signal: AbortSignal) =>
          new Promise<string>((_resolve, reject) => {
            signal.addEventListener("abort", () => {
              const error = new Error("aborted");
              error.name = "AbortError";
              reject(error);
            });
          }),
      ),
    };

    await expect(
      generateChatTextWithTimeout({
        provider,
        message,
        recentMessages: [],
        timeoutMs: 5,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(CHAT_AI_MAX_QUEUE_SIZE).toBe(4);
  });
});
