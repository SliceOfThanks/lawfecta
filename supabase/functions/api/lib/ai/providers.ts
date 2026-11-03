// The two AI providers members can use: OpenAI (also Lawfecta's own key) and Claude from Anthropic.
// Every failure comes back as one plain reason so the member is told what happened and nothing falls back silently.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";

export type Provider = "openai" | "anthropic";
export type AiCode = "bad_key" | "no_credit" | "rate_limited" | "provider_down" | "model_not_found" | "refused" | "too_long" | "bad_request";

export class AiFail extends Error {
  constructor(public code: AiCode) { super(code); }
}

export type ChatImage = { media: "image/png" | "image/jpeg"; b64: string };
export type ChatMsg = { role: "user" | "assistant"; content: string; images?: ChatImage[] };
export type ChatResult = { text: string; model: string; input_tokens: number; output_tokens: number };

const OPENAI = "https://api.openai.com/v1";
const TIMEOUT_MS = 110_000;

// What a pasted key looks like, so a key in the wrong box is caught before it is tested
export function guessProvider(key: string): Provider | null {
  const k = key.trim();
  if (k.startsWith("sk-ant-")) return "anthropic";
  if (k.startsWith("sk-")) return "openai";
  return null;
}

export function looksLikeKey(key: string): boolean {
  const k = key.trim();
  return k.length >= 20 && k.length <= 300 && !k.split("").some((c) => c <= " " || c > "~");
}

// ---------- OpenAI ----------

async function openaiError(r: Response): Promise<AiFail> {
  const body = await r.json().catch(() => ({})) as Record<string, any>;
  const code = String(body?.error?.code ?? "");
  if (r.status === 401 || r.status === 403) return new AiFail("bad_key");
  if (r.status === 429) return new AiFail(code === "insufficient_quota" ? "no_credit" : "rate_limited");
  if (r.status === 404 || code === "model_not_found") return new AiFail("model_not_found");
  if (code === "context_length_exceeded") return new AiFail("too_long");
  if (r.status >= 500) return new AiFail("provider_down");
  return new AiFail("bad_request");
}

async function openaiFetch(f: typeof fetch, plainKey: string, path: string, init: RequestInit): Promise<Response> {
  try {
    return await f(OPENAI + path, { ...init, headers: { authorization: "Bearer " + plainKey, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new AiFail("provider_down");
  }
}

async function openaiModels(f: typeof fetch, plainKey: string): Promise<string[]> {
  const r = await openaiFetch(f, plainKey, "/models", { method: "GET" });
  if (!r.ok) throw await openaiError(r);
  const j = await r.json().catch(() => ({})) as { data?: Array<{ id?: string }> };
  return (j.data ?? []).map((m) => String(m.id ?? "")).filter(Boolean);
}

const versionOf = (id: string) => {
  const n = id.split("-")[1] ?? "";
  return n.split(".").map((x) => Number(x) || 0);
};
const newer = (a: string, b: string) => {
  const x = versionOf(a), y = versionOf(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
  return a.length - b.length;
};

// The configured model, or the newest general "mini" model this key can use (OpenAI renames models often)
export function pickChatModel(want: string, ids: string[]): string | null {
  if (ids.includes(want)) return want;
  const skip = ["realtime", "audio", "transcribe", "tts", "image", "search", "embedding", "codex", "nano", "instruct"];
  const general = ids.filter((id) => id.startsWith("gpt-") && !skip.some((s) => id.includes(s)) && !/-\d{4}-\d{2}-\d{2}$/.test(id));
  const minis = general.filter((id) => id.endsWith("-mini")).sort(newer);
  return minis[0] ?? general.sort(newer)[0] ?? null;
}

export function pickTranscribeModel(want: string, ids: string[]): string | null {
  if (ids.includes(want)) return want;
  const t = ids.filter((id) => id.includes("transcribe") && !id.includes("live") && !id.includes("diarize")).sort(newer);
  return t[0] ?? (ids.includes("whisper-1") ? "whisper-1" : null);
}

// One retry with a model the key can use when the configured one is not offered
async function withModel<T>(f: typeof fetch, plainKey: string, want: string, pick: (w: string, ids: string[]) => string | null, run: (m: string) => Promise<T>): Promise<T> {
  try {
    return await run(want);
  } catch (e) {
    if (!(e instanceof AiFail) || e.code !== "model_not_found") throw e;
    const other = pick(want, await openaiModels(f, plainKey));
    if (!other || other === want) throw e;
    return await run(other);
  }
}

async function openaiChat(f: typeof fetch, plainKey: string, model: string, system: string, msgs: ChatMsg[], json: boolean): Promise<ChatResult> {
  return await withModel(f, plainKey, model, pickChatModel, async (m) => {
    const messages = [{ role: "system", content: system }, ...msgs.map((x) => ({
      role: x.role,
      content: x.images?.length
        ? [{ type: "text", text: x.content }, ...x.images.map((i) => ({ type: "image_url", image_url: { url: `data:${i.media};base64,${i.b64}` } }))]
        : x.content,
    }))];
    const r = await openaiFetch(f, plainKey, "/chat/completions", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: m, messages, max_completion_tokens: 4000, ...(json ? { response_format: { type: "json_object" } } : {}) }),
    });
    if (!r.ok) throw await openaiError(r);
    const j = await r.json() as Record<string, any>;
    const choice = j.choices?.[0];
    if (choice?.message?.refusal) throw new AiFail("refused");
    return { text: String(choice?.message?.content ?? ""), model: String(j.model ?? m), input_tokens: Number(j.usage?.prompt_tokens ?? 0), output_tokens: Number(j.usage?.completion_tokens ?? 0) };
  });
}

// ---------- Claude (Anthropic) ----------

function claude(f: typeof fetch, plainKey: string) {
  return new Anthropic({ apiKey: plainKey, fetch: f, maxRetries: 0, timeout: TIMEOUT_MS });
}

function claudeError(e: unknown): AiFail {
  if (e instanceof AiFail) return e;
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return new AiFail("bad_key");
  if (e instanceof Anthropic.RateLimitError) return new AiFail("rate_limited");
  if (e instanceof Anthropic.NotFoundError) return new AiFail("model_not_found");
  if (e instanceof Anthropic.APIConnectionError) return new AiFail("provider_down");
  if (e instanceof Anthropic.APIError) {
    if (e.status === 402) return new AiFail("no_credit");
    if ((e.status ?? 0) >= 500) return new AiFail("provider_down");
    return new AiFail("bad_request");
  }
  return new AiFail("provider_down");
}

async function claudeChat(f: typeof fetch, plainKey: string, model: string, system: string, msgs: ChatMsg[]): Promise<ChatResult> {
  try {
    const r = await claude(f, plainKey).beta.messages.create({
      model,
      max_tokens: 16000,
      system,
      // Chat answers should come back quickly; effort low keeps them short and inside the server's time limit
      output_config: { effort: "low" },
      // If Claude's safety checks decline a request, the API retries it on a suitable model inside the same call
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: msgs.map((x) => ({
        role: x.role,
        content: x.images?.length
          ? [...x.images.map((i) => ({ type: "image" as const, source: { type: "base64" as const, media_type: i.media, data: i.b64 } })), { type: "text" as const, text: x.content }]
          : x.content,
      })),
    });
    if (r.stop_reason === "refusal") throw new AiFail("refused");
    const text = r.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return { text, model: r.model, input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens };
  } catch (e) {
    throw claudeError(e);
  }
}

// ---------- Shared ----------

// A key test lists the provider's models: free, and proves the key works and has access
export async function testKey(f: typeof fetch, provider: Provider, plainKey: string): Promise<{ ok: true } | { ok: false; code: AiCode }> {
  try {
    if (provider === "openai") await openaiModels(f, plainKey);
    else {
      try {
        await claude(f, plainKey).models.list({ limit: 1 });
      } catch (e) {
        throw claudeError(e);
      }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, code: e instanceof AiFail ? e.code : "provider_down" };
  }
}

export async function chat(f: typeof fetch, provider: Provider, plainKey: string, model: string, system: string, msgs: ChatMsg[], json = false): Promise<ChatResult> {
  if (!msgs.length || msgs[0].role !== "user") throw new AiFail("bad_request");
  return provider === "openai" ? await openaiChat(f, plainKey, model, system, msgs, json) : await claudeChat(f, plainKey, model, system, msgs);
}

// Speech to text (OpenAI only; Claude's API does not take audio). The recording is sent once and not kept.
export async function transcribe(f: typeof fetch, plainKey: string, model: string, audio: Uint8Array, mime: string): Promise<{ text: string; model: string }> {
  const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : mime.includes("mpeg") ? "mp3" : "webm";
  return await withModel(f, plainKey, model, pickTranscribeModel, async (m) => {
    const form = new FormData();
    form.append("file", new Blob([audio as Uint8Array<ArrayBuffer>], { type: mime || "audio/webm" }), "speech." + ext);
    form.append("model", m);
    form.append("response_format", "json");
    const r = await openaiFetch(f, plainKey, "/audio/transcriptions", { method: "POST", body: form });
    if (!r.ok) throw await openaiError(r);
    const j = await r.json().catch(() => ({})) as { text?: string };
    return { text: String(j.text ?? "").trim(), model: m };
  });
}

// Speech to text with times (for recordings). whisper-1 returns timed segments; newer models return one block of text,
// which is then timed as one line across the part.
export async function transcribeLines(f: typeof fetch, plainKey: string, model: string, audio: Uint8Array, mime: string, partMs: number): Promise<{ lines: Array<{ start_ms: number; end_ms: number; text: string }>; model: string }> {
  return await withModel(f, plainKey, model, pickTranscribeModel, async (m) => {
    const form = new FormData();
    form.append("file", new Blob([audio as Uint8Array<ArrayBuffer>], { type: mime || "audio/webm" }), "speech.webm");
    form.append("model", m);
    form.append("response_format", m === "whisper-1" ? "verbose_json" : "json");
    const r = await openaiFetch(f, plainKey, "/audio/transcriptions", { method: "POST", body: form });
    if (!r.ok) throw await openaiError(r);
    const j = await r.json().catch(() => ({})) as { text?: string; segments?: Array<{ start?: number; end?: number; text?: string }> };
    const lines = Array.isArray(j.segments) && j.segments.length
      ? j.segments.map((x) => ({ start_ms: Math.round((x.start ?? 0) * 1000), end_ms: Math.round((x.end ?? 0) * 1000), text: String(x.text ?? "").trim() }))
      : String(j.text ?? "").trim() ? [{ start_ms: 0, end_ms: partMs, text: String(j.text).trim() }] : [];
    return { lines: lines.filter((l) => l.text), model: m };
  });
}
