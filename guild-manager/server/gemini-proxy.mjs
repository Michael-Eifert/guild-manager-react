import http from "node:http";

const PORT = Number(process.env.PORT) || 8787;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-09-2025";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const sendJson = (response, status, payload) => {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
};

const readRequestBody = (request) =>
  new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method !== "POST" || request.url !== "/api/gemini") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  if (!GEMINI_API_KEY) {
    sendJson(response, 500, { error: "Missing GEMINI_API_KEY" });
    return;
  }

  try {
    const payload = JSON.parse(await readRequestBody(request));
    const prompt = String(payload?.prompt || "").trim();
    if (!prompt) {
      sendJson(response, 400, { error: "Missing prompt" });
      return;
    }

    const geminiBody = {
      contents: [{ parts: [{ text: prompt }] }],
    };
    if (payload?.isJson === true) {
      geminiBody.generationConfig = { responseMimeType: "application/json" };
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      },
    );
    const geminiData = await geminiResponse.json();
    if (!geminiResponse.ok) {
      sendJson(response, geminiResponse.status, {
        error: "Gemini request failed",
        details: geminiData?.error?.message || "",
      });
      return;
    }

    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    sendJson(response, 200, { text });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Proxy error" });
  }
});

server.listen(PORT, () => {
  console.log(`Gemini proxy listening on http://localhost:${PORT}/api/gemini`);
});
