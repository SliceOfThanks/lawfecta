// Payments provider adapter: Stripe Connect (separate charges and transfers), through Stripe's REST API.
// DELA never handles card or bank numbers: attorneys pay on Stripe's hosted Checkout page and freelancers set up payouts on
// Stripe's hosted onboarding. Every money call carries an idempotency key, so a retry or two clicks never charge twice.

export type StripeResult = { ok: true; data: Record<string, any> } | { ok: false; status: number; error: string; code?: string };

// Form encoding with Stripe's nested keys (a[b][c]=v, a[0]=v)
export function stripeForm(params: Record<string, unknown>, prefix = ""): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => typeof x === "object" ? out.push(stripeForm(x as Record<string, unknown>, `${key}[${i}]`)) : out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(x))}`));
    else if (typeof v === "object") out.push(stripeForm(v as Record<string, unknown>, key));
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out.filter(Boolean).join("&");
}

// Real money only when the live_payments switch is on: a live key is refused otherwise
export function keyAllowed(key: string, liveOn: boolean): boolean {
  if (!key) return false;
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return liveOn;
  return key.startsWith("sk_test_") || key.startsWith("rk_test_");
}

export async function stripe(f: typeof fetch, key: string, method: "GET" | "POST", path: string, params: Record<string, unknown> = {}, idem = ""): Promise<StripeResult> {
  const body = stripeForm(params);
  const url = "https://api.stripe.com/v1" + path + (method === "GET" && body ? "?" + body : "");
  try {
    const r = await f(url, {
      method, signal: AbortSignal.timeout(20000),
      headers: { authorization: "Bearer " + key, "content-type": "application/x-www-form-urlencoded", "stripe-version": "2024-06-20", ...(idem ? { "idempotency-key": idem } : {}) },
      body: method === "POST" ? body : undefined,
    });
    const j = await r.json().catch(() => ({})) as Record<string, any>;
    if (!r.ok) return { ok: false, status: r.status, error: String(j?.error?.message ?? "stripe_" + r.status).slice(0, 200), code: j?.error?.code ?? j?.error?.decline_code };
    return { ok: true, data: j };
  } catch (e) {
    return { ok: false, status: 0, error: String(e).slice(0, 120) };
  }
}

// Accounts v2 (JSON bodies). Stripe refuses the older v1 Accounts API for new Connect platforms, so a freelancer's payout
// account is created, onboarded and read through /v2/core. Transfers and everything else stay on v1.
export const STRIPE_V2_VERSION = "2026-09-30.preview";
export async function stripeV2(f: typeof fetch, key: string, method: "GET" | "POST", path: string, body: Record<string, unknown> = {}, idem = "", version = STRIPE_V2_VERSION): Promise<StripeResult> {
  try {
    const r = await f("https://api.stripe.com/v2" + path, {
      method, signal: AbortSignal.timeout(20000),
      headers: { authorization: "Bearer " + key, "stripe-version": version, ...(method === "POST" ? { "content-type": "application/json" } : {}), ...(idem ? { "idempotency-key": idem } : {}) },
      body: method === "POST" ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({})) as Record<string, any>;
    if (!r.ok) return { ok: false, status: r.status, error: String(j?.error?.message ?? "stripe_" + r.status).slice(0, 300), code: j?.error?.code };
    return { ok: true, data: j };
  } catch (e) {
    return { ok: false, status: 0, error: String(e).slice(0, 120) };
  }
}

// A freelancer's account: it only receives transfers from Lawfecta (the "recipient" configuration), with Stripe's Express
// dashboard. Lawfecta pays Stripe's fees and carries losses, which is what separate charges and transfers require.
export function recipientAccount(p: { name: string; email: string; personId: string }) {
  return {
    contact_email: p.email, display_name: p.name.slice(0, 100) || "Lawfecta freelancer", dashboard: "express",
    identity: { country: "us", entity_type: "individual" },
    configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
    defaults: { currency: "usd", locales: ["en-US"], responsibilities: { fees_collector: "application", losses_collector: "application" } },
    metadata: { person_id: p.personId },
    include: ["configuration.recipient", "requirements"],
  };
}
export const ACCOUNT_V2_INCLUDE = "?include=configuration.recipient&include=requirements";
export function onboardingLink(account: string, returnUrl: string, refreshUrl: string) {
  // Stripe's sandbox, 2026-11-11: "use_case.account_onboarding.configurations: Unknown field", so only the two links are sent
  return { account, use_case: { type: "account_onboarding", account_onboarding: { return_url: returnUrl, refresh_url: refreshUrl } } };
}

// Stripe's requirement names in plain words, each once ("identity.individual.date_of_birth.day" reads "date of birth")
const NEED_WORDS: Array<[string, string]> = [["date_of_birth", "date of birth"], ["terms_of_service", "agreeing to Stripe's terms"], ["external_account", "bank account"],
  ["id_numbers", "ID number"], ["given_name", "name"], ["surname", "name"], ["business_url", "website or work description"], ["product_description", "website or work description"],
  ["address", "address"], ["phone", "phone number"], ["email", "email"], ["documents", "an identity document"]];
export function needWords(descriptions: string[]): string[] {
  const out: string[] = [];
  for (const d of descriptions) {
    const hit = NEED_WORDS.find(([k]) => d.includes(k));
    const w = hit ? hit[1] : (d.split(".").pop() ?? d).split("_").join(" ");
    if (w && !out.includes(w)) out.push(w);
  }
  return out.slice(0, 12);
}

// Ready means Stripe says the account can receive transfers now. While Stripe still waits for details from the member
// (always the case before its setup page is filled in), the account "needs details"; "restricted" is Stripe's own block.
export function accountStatusV2(acct: Record<string, any>): { status: "ready" | "pending" | "restricted"; requirements: string[] } {
  const cap = acct?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers;
  const due = needWords(((acct?.requirements?.entries ?? []) as Array<Record<string, any>>).filter((e) => (e?.awaiting_action_from ?? "user") === "user")
    .map((e) => String(e?.description ?? "")).filter(Boolean));
  if (cap?.status === "active") return { status: "ready", requirements: [] };
  if ((cap?.status === "restricted" || cap?.status === "unsupported") && !due.length) return { status: "restricted", requirements: [] };
  return { status: "pending", requirements: due };
}

// The hosted Checkout page: the card or bank account is saved for the next milestones (with the attorney's consent shown on the page)
export function checkoutParams(p: { amount: number; name: string; paymentId: string; customer: string; successUrl: string; cancelUrl: string; methods: string[]; currency: string }) {
  return {
    mode: "payment", success_url: p.successUrl, cancel_url: p.cancelUrl, client_reference_id: p.paymentId, customer: p.customer || undefined,
    customer_creation: p.customer ? undefined : "always", payment_method_types: p.methods,
    line_items: [{ quantity: 1, price_data: { currency: p.currency, unit_amount: p.amount, product_data: { name: p.name.slice(0, 200) } } }],
    payment_intent_data: { setup_future_usage: "off_session", metadata: { payment_id: p.paymentId } },
    metadata: { payment_id: p.paymentId },
    consent_collection: { terms_of_service: "none" },
    custom_text: { submit: { message: "Lawfecta holds this payment until you accept the milestone. You agree that Lawfecta may charge this payment method for the next milestones of this agreement when you accept each one." } },
  };
}

// Stripe signs each webhook: "t=<time>,v1=<hmac of t.payload>". Old or unsigned events are refused.
export async function verifyStripeSignature(payload: string, header: string, secret: string, toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((x) => x.split("=").map((y) => y.trim())).filter((x) => x.length === 2)) as Record<string, string>;
  const t = Number(parts.t);
  if (!t || Math.abs(nowSec - t) > toleranceSec) return false;
  const sigs = header.split(",").filter((x) => x.trim().startsWith("v1=")).map((x) => x.trim().slice(3));
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${t}.${payload}`)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => s.length === hex.length && [...s].reduce((acc, ch, i) => acc | (ch.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0);
}

export async function stripeSignatureHeader(payload: string, secret: string, t = Math.floor(Date.now() / 1000)): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${t}.${payload}`)));
  return `t=${t},v1=` + [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function accountStatus(acct: Record<string, any>): { status: "ready" | "pending" | "restricted"; requirements: string[] } {
  const due = [...(acct?.requirements?.currently_due ?? []), ...(acct?.requirements?.past_due ?? [])].map(String).slice(0, 20);
  if (acct?.payouts_enabled && acct?.charges_enabled !== false && !due.length) return { status: "ready", requirements: [] };
  if (acct?.requirements?.disabled_reason) return { status: "restricted", requirements: due };
  return { status: "pending", requirements: due };
}
