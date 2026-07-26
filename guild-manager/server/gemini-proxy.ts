import http from "node:http";
import { pathToFileURL } from "node:url";
import { loadLocalEnvironment } from "./load-local-env.js";
import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from "node:http";

const parseOrigins = (value: unknown, isProduction: boolean) => {
  const origins = String(value || "").split(",").map((origin) => origin.trim()).filter(Boolean);
  if (origins.length > 0) return new Set(origins);
  return new Set(isProduction ? [] : ["http://localhost:5173"]);
};

export const createProxyConfig = (environment: NodeJS.ProcessEnv = process.env) => {
  const isProduction = environment.NODE_ENV === "production";
  return {
    port: Number(environment.GEMINI_PROXY_PORT || environment.PORT) || 8787,
    apiKey: environment.GEMINI_API_KEY || "",
    model: environment.GEMINI_MODEL || "gemini-2.5-flash",
    allowedOrigins: parseOrigins(environment.ALLOWED_ORIGINS || environment.ALLOWED_ORIGIN, isProduction),
    allowWildcardOrigin: !isProduction && environment.ALLOWED_ORIGIN === "*",
    trustProxy: environment.TRUST_PROXY === "true",
    bodyLimitBytes: 32 * 1024,
    promptLimitCharacters: 8 * 1024,
    requestTimeoutMs: 20_000,
    maxConcurrentRequests: Math.max(1, Number(environment.MAX_CONCURRENT_REQUESTS) || 8),
    rateLimitCapacity: Math.max(1, Number(environment.RATE_LIMIT_CAPACITY) || 20),
    rateLimitRefillPerMinute: Math.max(1, Number(environment.RATE_LIMIT_REFILL_PER_MINUTE) || 10),
  };
};

export type GeminiProxyConfig = ReturnType<typeof createProxyConfig>;

const writeJson = (
  response: ServerResponse,
  status: number,
  payload: unknown,
  origin?: string | null,
) => {
  const headers: OutgoingHttpHeaders = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  response.writeHead(status, headers);
  response.end(status === 204 ? undefined : JSON.stringify(payload));
};

type RequestBodyError = Error & { code?: string };

const readRequestBody = (request: IncomingMessage, limitBytes: number) =>
  new Promise<string>((resolve, reject) => {
  const chunks: Buffer[] = [];
  let bytes = 0;
  let rejected = false;
  request.on("data", (chunk: Buffer | string) => {
    if (rejected) return;
    bytes += chunk.length;
    if (bytes > limitBytes) {
      const error: RequestBodyError = new Error("Request too large");
      error.code = "REQUEST_TOO_LARGE";
      rejected = true;
      reject(error);
      return;
    }
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  request.on("end", () => {
    if (!rejected) resolve(Buffer.concat(chunks).toString("utf8"));
  });
  request.on("error", reject);
});

const getClientAddress = (request: IncomingMessage, trustProxy: boolean) => {
  if (trustProxy) {
    const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (forwarded) return forwarded;
  }
  return request.socket.remoteAddress || "unknown";
};

const createRateLimiter = ({
  capacity,
  refillPerMinute,
  now = Date.now,
}: {
  capacity: number;
  refillPerMinute: number;
  now?: () => number;
}) => {
  const buckets = new Map<string, { tokens: number; updatedAt: number }>();
  return (key: string) => {
    const currentTime = now();
    const previous = buckets.get(key) || { tokens: capacity, updatedAt: currentTime };
    const refill = ((currentTime - previous.updatedAt) / 60_000) * refillPerMinute;
    const tokens = Math.min(capacity, previous.tokens + refill);
    if (tokens < 1) {
      buckets.set(key, { tokens, updatedAt: currentTime });
      return false;
    }
    buckets.set(key, { tokens: tokens - 1, updatedAt: currentTime });
    return true;
  };
};

export const createGeminiProxyServer = ({
  config = createProxyConfig(),
  fetchImpl = globalThis.fetch,
  logger = console,
}: {
  config?: GeminiProxyConfig;
  fetchImpl?: typeof globalThis.fetch;
  logger?: Pick<Console, "error" | "info">;
} = {}) => {
  let activeRequests = 0;
  const consumeRateLimit = createRateLimiter({
    capacity: config.rateLimitCapacity,
    refillPerMinute: config.rateLimitRefillPerMinute,
  });
  const resolveOrigin = (request: IncomingMessage) => {
    const origin = String(request.headers.origin || "");
    if (config.allowWildcardOrigin) return "*";
    return config.allowedOrigins.has(origin) ? origin : null;
  };

  return http.createServer(async (request, response) => {
    const requestId = globalThis.crypto.randomUUID();
    const startedAt = Date.now();
    const origin = resolveOrigin(request);

    if (request.method === "GET" && request.url === "/health") {
      writeJson(response, 200, { status: "ok" }, origin);
      return;
    }
    if (request.headers.origin && !origin) {
      writeJson(response, 403, { error: "Origin not allowed", requestId });
      return;
    }
    if (request.method === "OPTIONS") {
      writeJson(response, 204, {}, origin);
      return;
    }
    if (request.method !== "POST" || request.url !== "/api/gemini") {
      writeJson(response, 404, { error: "Not found", requestId }, origin);
      return;
    }
    if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
      writeJson(response, 415, { error: "Content-Type must be application/json", requestId }, origin);
      return;
    }
    if (!config.apiKey) {
      writeJson(response, 503, { error: "Text generation is not configured", requestId }, origin);
      return;
    }
    const clientAddress = getClientAddress(request, config.trustProxy);
    if (!consumeRateLimit(clientAddress)) {
      writeJson(response, 429, { error: "Rate limit exceeded", requestId }, origin);
      return;
    }
    if (activeRequests >= config.maxConcurrentRequests) {
      writeJson(response, 503, { error: "Service is busy", requestId }, origin);
      return;
    }

    activeRequests += 1;
    try {
      const rawBody = await readRequestBody(request, config.bodyLimitBytes);
      const payload = JSON.parse(rawBody) as { prompt?: unknown; isJson?: unknown };
      const prompt = String(payload?.prompt || "").trim();
      if (!prompt) {
        writeJson(response, 400, { error: "Missing prompt", requestId }, origin);
        return;
      }
      if (prompt.length > config.promptLimitCharacters) {
        writeJson(response, 413, { error: "Prompt is too large", requestId }, origin);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
      let geminiResponse;
      try {
        geminiResponse = await fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              ...(payload?.isJson === true ? { generationConfig: { responseMimeType: "application/json" } } : {}),
            }),
          },
        );
      } finally {
        clearTimeout(timeout);
      }

      const geminiData = await geminiResponse.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      if (!geminiResponse.ok) {
        logger.error(JSON.stringify({ requestId, event: "upstream_error", status: geminiResponse.status }));
        writeJson(response, 502, { error: "Text generation failed", requestId }, origin);
        return;
      }
      const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) {
        writeJson(response, 502, { error: "Text generation returned no content", requestId }, origin);
        return;
      }
      writeJson(response, 200, { text, requestId }, origin);
    } catch (error: unknown) {
      const caughtError = error as RequestBodyError;
      const status = caughtError.code === "REQUEST_TOO_LARGE" ? 413 : error instanceof SyntaxError ? 400 : caughtError.name === "AbortError" ? 504 : 500;
      const message = status === 413 ? "Request is too large" : status === 400 ? "Invalid JSON" : status === 504 ? "Text generation timed out" : "Proxy request failed";
      logger.error(JSON.stringify({ requestId, event: "proxy_error", name: caughtError.name, status }));
      if (!response.headersSent) writeJson(response, status, { error: message, requestId }, origin);
    } finally {
      activeRequests -= 1;
      logger.info(JSON.stringify({ requestId, event: "request_complete", method: request.method, path: request.url, durationMs: Date.now() - startedAt }));
    }
  });
};

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  loadLocalEnvironment();
  const config = createProxyConfig();
  const server = createGeminiProxyServer({ config });
  server.listen(config.port, () => console.log(JSON.stringify({ event: "proxy_started", port: config.port, model: config.model })));
  const shutdown = (signal: NodeJS.Signals) => {
    console.log(JSON.stringify({ event: "proxy_stopping", signal }));
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
