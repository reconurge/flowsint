/**
 * Local stub API for the OrcaRouter GUI evidence capture.
 *
 * The Vault page needs a backend to render against. This process provides the
 * handful of endpoints the page touches without requiring Postgres/Neo4j, and —
 * importantly — it serves the *live* OrcaRouter model catalog through the same
 * route and the same capability filter the real backend uses, so the model
 * dropdown under test is driven by real data flowing through the app's own
 * service → selector path.
 *
 * The catalog is fetched once at startup from the configured OrcaRouter origin
 * with the operator's API key, exactly like the backend does. If the catalog
 * cannot be reached the process exits non-zero: evidence must show the live
 * catalog, and a flaky network is not a reason to quietly swap in something
 * else. Set ORCA_EVIDENCE_ALLOW_SEED=1 to relax that for hermetic CI runs, in
 * which case the response is marked `degraded` and the capture records it.
 *
 * Not part of the upstream contribution — see scripts/capture-orcarouter-evidence.py.
 */
import http from "node:http";

const PORT = Number(process.env.STUB_PORT || 5001);
// Same default origin the provider uses. ORCAROUTER_API_BASE exists so the
// capture can be pointed at an explicitly configured base, never so a test can
// substitute a fabricated catalog for the real one.
const API_BASE = (
  process.env.ORCAROUTER_API_BASE || "https://api.orcarouter.ai/v1"
).replace(/\/+$/, "");
// The chat entry point asks for the chat capability, exactly as
// CatalogClient does (`CAPABILITY_QUERY[Capability.CHAT] = "chat"`). This URL is
// the catalog source of record: it is what the manifest reports and what a
// reviewer can re-fetch by hand.
const CATALOG_URL = `${API_BASE}/models?capability=chat`;
const API_KEY = process.env.ORCAROUTER_API_KEY || "";
const ALLOW_SEED = process.env.ORCA_EVIDENCE_ALLOW_SEED === "1";

// Dedicated test data. The masked preview is what the server produces; the real
// key never reaches the browser, which is exactly what the UI must show.
const MASKED_KEY = "sk-orca-••••••••cdef";

// Verified cold-start seed, mirroring the provider's own fallback. Only used
// when ORCA_EVIDENCE_ALLOW_SEED=1 and the live catalog is unreachable.
const SEED = {
  source: "seed",
  data: [
    {
      id: "openai/gpt-5.5",
      supported_endpoint_types: ["openai", "anthropic"],
      context_length: 400000,
      architecture: { input_modalities: ["text", "image"] },
      reasoning_efforts: ["low", "medium", "high", "xhigh"],
    },
    {
      id: "anthropic/claude-opus-4.8",
      supported_endpoint_types: ["anthropic", "openai"],
      context_length: 200000,
      architecture: { input_modalities: ["text", "image"] },
      reasoning_efforts: ["low", "medium", "high"],
    },
    {
      id: "google/gemini-3.5-flash",
      supported_endpoint_types: ["gemini", "openai"],
      context_length: 1000000,
      architecture: { input_modalities: ["text", "image", "audio"] },
    },
    {
      id: "deepseek/deepseek-v4-pro",
      supported_endpoint_types: ["openai"],
      context_length: 128000,
      architecture: { input_modalities: ["text"] },
    },
    {
      id: "orcarouter/auto",
      supported_endpoint_types: [
        "openai",
        "openai-response",
        "anthropic",
        "gemini",
      ],
      architecture: { input_modalities: [] },
    },
  ],
};

// Same contract the backend applies: a chat entry point gets chat-capable
// models only, filtered further by the non-text modalities it uploads.
const CHAT_TYPES = ["openai", "anthropic", "gemini", "openai-response"];
const NON_CHAT = [
  "image-generation",
  "openai-video",
  "jina-rerank",
  "embeddings",
];

function filterChat(data, modalities) {
  return data.filter((m) => {
    const types = m.supported_endpoint_types || [];
    if (types.some((t) => NON_CHAT.includes(t))) return false;
    if (!types.some((t) => CHAT_TYPES.includes(t))) return false;
    const inputs = (m.architecture || {}).input_modalities || [];
    return modalities.every((need) => inputs.includes(need));
  });
}

function publicModel(m) {
  return {
    id: m.id,
    ...(m.name && m.name !== m.id ? { name: m.name } : {}),
    ...(m.context_length ? { contextLength: m.context_length } : {}),
    ...(m.architecture?.input_modalities?.length
      ? { inputModalities: m.architecture.input_modalities }
      : {}),
    ...(m.reasoning_efforts?.length
      ? { reasoningEfforts: m.reasoning_efforts }
      : {}),
  };
}

async function loadCatalog() {
  try {
    const res = await fetch(CATALOG_URL, {
      headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
    });
    if (!res.ok) throw new Error(`catalog responded ${res.status}`);
    const body = await res.json();
    const data = Array.isArray(body.data) ? body.data : [];
    if (!data.length) throw new Error("catalog was empty");
    return { data, source: CATALOG_URL, degraded: false };
  } catch (err) {
    if (!ALLOW_SEED) {
      console.error(
        `FATAL: live catalog ${CATALOG_URL} unavailable (${err.message}). ` +
          "GUI evidence must show the live catalog; set ORCA_EVIDENCE_ALLOW_SEED=1 " +
          "only for a hermetic run that records the degraded state.",
      );
      process.exit(1);
    }
    console.error(`WARN: falling back to the verified seed (${err.message})`);
    return { data: SEED.data, source: SEED.source, degraded: true };
  }
}

const catalog = await loadCatalog();

const state = {
  connected: true,
  source: "oauth_pkce",
  masked_key: MASKED_KEY,
  needs_reauth: false,
  dashboard_url: "https://www.orcarouter.ai/console/authorized-apps",
};

const json = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*",
  });
  res.end(payload);
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
    });
    return res.end();
  }

  if (path === "/api/keys" && req.method === "GET") return json(res, 200, []);
  if (path === "/api/keys/chat-key-exists")
    return json(res, 200, { exists: true });

  if (path === "/api/orcarouter" && req.method === "GET")
    return json(res, 200, state);
  if (path === "/api/orcarouter" && req.method === "DELETE") {
    state.connected = false;
    state.masked_key = null;
    return json(res, 200, state);
  }

  if (path === "/api/orcarouter/models") {
    const entry = url.searchParams.get("entry_point") || "chat";
    const modalities = (url.searchParams.get("modalities") || "")
      .split(",")
      .filter(Boolean);
    const models = filterChat(catalog.data, modalities);

    return json(res, 200, {
      models: models.map(publicModel),
      source: catalog.source,
      degraded: catalog.degraded,
      isSeed: catalog.source === "seed",
      count: models.length,
      error: null,
      entry_point: entry,
    });
  }

  json(res, 404, { detail: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    JSON.stringify({
      stub: "ready",
      port: PORT,
      catalog_source: catalog.source,
      catalog_model_count: catalog.data.length,
      degraded: catalog.degraded,
    }),
  );
});
