import { afterEach, describe, expect, it, vi } from "vitest";

import { createGeminiProxyServer, createProxyConfig } from "../../server/gemini-proxy.mjs";

const servers = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

const startServer = async (overrides = {}, fetchImpl = vi.fn()) => {
  const config = {
    ...createProxyConfig({ GEMINI_API_KEY: "test", ALLOWED_ORIGINS: "https://game.example" }),
    ...overrides,
  };
  const logger = { info: vi.fn(), error: vi.fn() };
  const server = createGeminiProxyServer({ config, fetchImpl, logger });
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { baseUrl: `http://127.0.0.1:${port}`, fetchImpl, logger };
};

describe("Gemini proxy", () => {
  it("serves health and rejects unapproved origins", async () => {
    const { baseUrl } = await startServer();
    expect((await fetch(`${baseUrl}/health`)).status).toBe(200);
    const response = await fetch(`${baseUrl}/api/gemini`, {
      method: "POST",
      headers: { Origin: "https://attacker.example", "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "hello" }),
    });
    expect(response.status).toBe(403);
  });

  it("forwards valid requests and sanitizes upstream errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "answer" }] } }] }),
    }).mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { message: "secret detail" } }) });
    const { baseUrl } = await startServer({}, fetchImpl);
    const request = () => fetch(`${baseUrl}/api/gemini`, {
      method: "POST",
      headers: { Origin: "https://game.example", "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "hello" }),
    });
    expect((await (await request()).json()).text).toBe("answer");
    const failure = await request();
    expect(failure.status).toBe(502);
    expect(JSON.stringify(await failure.json())).not.toContain("secret detail");
  });

  it("enforces prompt and rate limits", async () => {
    const { baseUrl } = await startServer({ promptLimitCharacters: 3, rateLimitCapacity: 1 });
    const send = (prompt) => fetch(`${baseUrl}/api/gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    expect((await send("long")).status).toBe(413);
    expect((await send("ok")).status).toBe(429);
  });
});
