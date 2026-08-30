import http from "node:http";
import { pathToFileURL } from "node:url";
import { loadLocalEnvironment } from "./load-local-env.js";
import type {
  IncomingMessage,
  OutgoingHttpHeaders,
  ServerResponse,
} from "node:http";

const parseOrigins = (value: unknown, isProduction: boolean) => {
  const origins = String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length > 0) return new Set(origins);
  return new Set(isProduction ? [] : ["http://localhost:5173"]);
};

const parseBoolean = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).trim().toLowerCase() === "true";
};

export const createAiProxyConfig = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const isProduction = environment.NODE_ENV === "production";
  return {
    port: Number(environment.AI_PROXY_PORT || environment.PORT) || 8788,
    baseUrl: String(environment.AI_BASE_URL || "https://api.openai.com/v1")
      .trim()
      .replace(/\/+$/, ""),
    apiKey: environment.AI_API_KEY || "",
    model: environment.AI_MODEL || "gpt-4.1-mini",
    allowedOrigins: parseOrigins(
      environment.ALLOWED_ORIGINS || environment.ALLOWED_ORIGIN,
      isProduction,
    ),
    requireOrigin: parseBoolean(environment.REQUIRE_ORIGIN, isProduction),
    bodyLimitBytes: 24 * 1024,
    promptLimitCharacters: 8 * 1024,
    requestTimeoutMs: 10_000,
    maxConcurrentRequests: Math.max(
      1,
      Number(environment.MAX_CONCURRENT_REQUESTS) || 6,
    ),
    rateLimitRequests: Math.max(
      1,
      Number(environment.RATE_LIMIT_REQUESTS) || 20,
    ),
    rateLimitWindowMs: Math.max(
      1_000,
      Number(environment.RATE_LIMIT_WINDOW_MS) || 60_000,
    ),
    trustProxy: parseBoolean(environment.TRUST_PROXY, false),
  };
};

export type AiProxyConfig = ReturnType<typeof createAiProxyConfig>;

const writeJson = (
  response: ServerResponse,
  status: number,
  payload: unknown,
  origin?: string | null,
  extraHeaders: OutgoingHttpHeaders = {},
) => {
  const headers: OutgoingHttpHeaders = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
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
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.byteLength;
      if (bytes > limitBytes) {
        rejected = true;
        const error: RequestBodyError = new Error("Request too large");
        error.code = "REQUEST_TOO_LARGE";
        reject(error);
        return;
      }
      chunks.push(buffer);
    });
    request.on("end", () => {
      if (!rejected) resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", reject);
  });

const sanitizeLine = (value: unknown) =>
  String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

export const createAiProxyServer = ({
  config = createAiProxyConfig(),
  fetchImpl = globalThis.fetch,
  logger = console,
}: {
  config?: AiProxyConfig;
  fetchImpl?: typeof globalThis.fetch;
  logger?: Pick<Console, "error" | "info">;
} = {}) => {
  let activeRequests = 0;
  let rateLimitChecks = 0;
  const rateLimits = new Map<
    string,
    { requests: number; windowStartedAt: number }
  >();
  const resolveOrigin = (request: IncomingMessage) => {
    const origin = String(request.headers.origin || "");
    return config.allowedOrigins.has(origin) ? origin : null;
  };

  const resolveClientAddress = (request: IncomingMessage) => {
    if (config.trustProxy) {
      const cloudflareAddress = request.headers["cf-connecting-ip"];
      if (typeof cloudflareAddress === "string" && cloudflareAddress.trim()) {
        return cloudflareAddress.trim();
      }
      const forwardedFor = request.headers["x-forwarded-for"];
      const firstForwardedAddress = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor?.split(",")[0];
      if (firstForwardedAddress?.trim()) return firstForwardedAddress.trim();
    }
    return request.socket.remoteAddress || "unknown";
  };

  const consumeRateLimit = (request: IncomingMessage) => {
    const now = Date.now();
    rateLimitChecks += 1;
    if (rateLimitChecks % 100 === 0) {
      for (const [address, entry] of rateLimits) {
        if (now - entry.windowStartedAt >= config.rateLimitWindowMs) {
          rateLimits.delete(address);
        }
      }
    }

    const address = resolveClientAddress(request);
    let entry = rateLimits.get(address);
    if (!entry || now - entry.windowStartedAt >= config.rateLimitWindowMs) {
      entry = { requests: 0, windowStartedAt: now };
      rateLimits.set(address, entry);
    }

    const resetAt = entry.windowStartedAt + config.rateLimitWindowMs;
    const resetSeconds = Math.max(1, Math.ceil((resetAt - now) / 1_000));
    if (entry.requests >= config.rateLimitRequests) {
      return { allowed: false, remaining: 0, resetSeconds };
    }
    entry.requests += 1;
    return {
      allowed: true,
      remaining: Math.max(0, config.rateLimitRequests - entry.requests),
      resetSeconds,
    };
  };

  return http.createServer(async (request, response) => {
    const requestId = globalThis.crypto.randomUUID();
    const origin = resolveOrigin(request);

    if (request.method === "GET" && request.url === "/health") {
      writeJson(response, 200, { status: "ok", configured: Boolean(config.apiKey) }, origin);
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
    if (request.method !== "POST" || request.url !== "/api/chat") {
      writeJson(response, 404, { error: "Not found", requestId }, origin);
      return;
    }
    if (config.requireOrigin && !request.headers.origin) {
      writeJson(response, 403, { error: "Origin required", requestId });
      return;
    }
    if (
      !String(request.headers["content-type"] || "")
        .toLowerCase()
        .startsWith("application/json")
    ) {
      writeJson(
        response,
        415,
        { error: "Content-Type must be application/json", requestId },
        origin,
      );
      return;
    }
    const rateLimit = consumeRateLimit(request);
    const rateLimitHeaders: OutgoingHttpHeaders = {
      "RateLimit-Limit": config.rateLimitRequests,
      "RateLimit-Remaining": rateLimit.remaining,
      "RateLimit-Reset": rateLimit.resetSeconds,
    };
    if (!rateLimit.allowed) {
      writeJson(
        response,
        429,
        { error: "Too many requests", requestId },
        origin,
        { ...rateLimitHeaders, "Retry-After": rateLimit.resetSeconds },
      );
      return;
    }
    if (!config.apiKey) {
      writeJson(
        response,
        503,
        { error: "Text generation is not configured", requestId },
        origin,
        rateLimitHeaders,
      );
      return;
    }
    if (activeRequests >= config.maxConcurrentRequests) {
      writeJson(
        response,
        503,
        { error: "Service is busy", requestId },
        origin,
      );
      return;
    }

    activeRequests += 1;
    try {
      const payload = JSON.parse(
        await readRequestBody(request, config.bodyLimitBytes),
      ) as { prompt?: unknown };
      const prompt = String(payload.prompt || "").trim();
      if (!prompt) {
        writeJson(response, 400, { error: "Missing prompt", requestId }, origin);
        return;
      }
      if (prompt.length > config.promptLimitCharacters) {
        writeJson(
          response,
          413,
          { error: "Prompt is too large", requestId },
          origin,
        );
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        config.requestTimeoutMs,
      );
      let upstream: Response;
      try {
        upstream = await fetchImpl(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.75,
            max_tokens: 100,
          }),
        });
      } finally {
        clearTimeout(timeout);
      }

      const data = (await upstream.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const text = sanitizeLine(data.choices?.[0]?.message?.content);
      if (!upstream.ok || !text) {
        logger.error(
          JSON.stringify({
            requestId,
            event: "upstream_error",
            status: upstream.status,
          }),
        );
        writeJson(
          response,
          502,
          { error: "Text generation failed", requestId },
          origin,
        );
        return;
      }
      writeJson(response, 200, { text, requestId }, origin);
    } catch (error) {
      const caught = error as RequestBodyError;
      const status =
        caught.code === "REQUEST_TOO_LARGE"
          ? 413
          : error instanceof SyntaxError
            ? 400
            : caught.name === "AbortError"
              ? 504
              : 500;
      logger.error(
        JSON.stringify({
          requestId,
          event: "proxy_error",
          name: caught.name,
          status,
        }),
      );
      if (!response.headersSent) {
        writeJson(
          response,
          status,
          {
            error:
              status === 504
                ? "Text generation timed out"
                : "Proxy request failed",
            requestId,
          },
          origin,
        );
      }
    } finally {
      activeRequests -= 1;
    }
  });
};

const isEntrypoint =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  loadLocalEnvironment();
  const config = createAiProxyConfig();
  const server = createAiProxyServer({ config });
  server.listen(config.port, () =>
    console.log(
      JSON.stringify({
        event: "ai_proxy_started",
        port: config.port,
        model: config.model,
      }),
    ),
  );
  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
