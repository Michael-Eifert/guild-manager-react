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
    bodyLimitBytes: 24 * 1024,
    promptLimitCharacters: 8 * 1024,
    requestTimeoutMs: 10_000,
    maxConcurrentRequests: Math.max(
      1,
      Number(environment.MAX_CONCURRENT_REQUESTS) || 6,
    ),
  };
};

export type AiProxyConfig = ReturnType<typeof createAiProxyConfig>;

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
  const resolveOrigin = (request: IncomingMessage) => {
    const origin = String(request.headers.origin || "");
    return config.allowedOrigins.has(origin) ? origin : null;
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
    if (!config.apiKey) {
      writeJson(
        response,
        503,
        { error: "Text generation is not configured", requestId },
        origin,
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
