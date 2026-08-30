import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAiProxyConfig,
  createAiProxyServer,
} from "../../server/ai-proxy";

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
});

const startServer = async (
  fetchImpl: typeof fetch,
  environment: NodeJS.ProcessEnv = {},
) => {
  const server = createAiProxyServer({
    config: createAiProxyConfig({
      AI_API_KEY: "server-secret",
      AI_BASE_URL: "https://provider.example/v1",
      AI_MODEL: "test-model",
      ALLOWED_ORIGINS: "https://game.example",
      ...environment,
    }),
    fetchImpl,
    logger: { info: vi.fn(), error: vi.fn() },
  });
  servers.push(server);
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
};

describe("OpenAI-compatible chat proxy", () => {
  it("keeps the API key server-side and sanitizes the returned line", async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '"Ready!\nI can tank."' } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as unknown as typeof fetch;
    const baseUrl = await startServer(upstream);
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        Origin: "https://game.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: "Write a line." }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      text: "Ready! I can tank.",
    });
    const headers = (upstream as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]
      .headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer server-secret");
  });

  it("rejects unapproved browser origins before calling upstream", async () => {
    const upstream = vi.fn() as unknown as typeof fetch;
    const baseUrl = await startServer(upstream);
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        Origin: "https://attacker.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: "hello" }),
    });
    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("requires an Origin header in production", async () => {
    const upstream = vi.fn() as unknown as typeof fetch;
    const baseUrl = await startServer(upstream, { NODE_ENV: "production" });
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "hello" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "Origin required" });
    expect(upstream).not.toHaveBeenCalled();
  });

  it("rate limits repeated requests from the same client", async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "Ready" } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as unknown as typeof fetch;
    const baseUrl = await startServer(upstream, {
      RATE_LIMIT_REQUESTS: "1",
      RATE_LIMIT_WINDOW_MS: "60000",
    });
    const request = () =>
      fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          Origin: "https://game.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: "hello" }),
      });

    expect((await request()).status).toBe(200);
    const blockedResponse = await request();

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.headers.get("Retry-After")).toBeTruthy();
    expect(await blockedResponse.json()).toMatchObject({
      error: "Too many requests",
    });
    expect(upstream).toHaveBeenCalledTimes(1);
  });
});
