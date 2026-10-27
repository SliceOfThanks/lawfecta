// AI reviewers (safety kit, Stacey 2026-10-27). Specialist Claude reviewers read a version's changes and report
// what could go wrong, in plain words, ranked. They never change code. A person decides what to fix.
//
//   node tools/ai_review.mjs --base <commit> --head <commit> [--out ai-review.md]   review the changes in a version
//   node tools/ai_review.mjs --health health-report.md [--out ai-health.md]           add "what will break first" to the monthly report
//
// Needs ANTHROPIC_API_KEY (a GitHub secret Stacey adds). Without it, it says so and stops without failing.
// Cost is measured on every run from the token counts the API returns, and printed at the end.
import Anthropic from "@anthropic-ai/sdk";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const MODEL = process.env.REVIEW_MODEL || "claude-opus-5-5";
const MAX_CHARS = Number(process.env.REVIEW_MAX_CHARS || 600000);
// Dollars per million tokens for the default model: input, output, cache write (5 minute), cache read
const PRICES = { "claude-opus-5-5": [4, 20, 5, 0.2] };

export const REVIEWERS = [
  ["Security", "sign in and sessions, the BD pass, permission checks that must run again at the moment an action happens, secrets (never in code, logs, widgets or browser code), CORS, injection, webhook signatures, the release gate and Push to Live, and anything a member could use to reach another member's data or the admin area"],
  ["Payments and limits", "money in whole cents, fee and minimum math, plan limits and allowances (including two quick clicks), idempotency of anything that charges, pays or counts, append-only money and audit history, Stripe test or live mode, and prices or limits typed into code instead of read from settings"],
  ["Data and privacy", "database migrations (they must only add, and stay compatible with the previous version so going back works), row level security with no policies, confidential client data and the notice, what is logged, attorney and freelancer sides kept separate, and anything that could lose or expose data"],
  ["Tests", "whether each change is covered by a test that would fail without it, bug fixes that came without a test, edge cases and misuse that are not tested (double clicks, expired sessions, wrong plan, removed access, outages), and tests that only pass by luck"],
];

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : "";
}

function git(...a) {
  return execFileSync("git", a, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

export function costOf(usage, model = MODEL) {
  const p = PRICES[model];
  if (!p || !usage) return null;
  const m = 1e6;
  return (usage.input_tokens * p[0] + usage.output_tokens * p[1] + (usage.cache_creation_input_tokens || 0) * p[2] + (usage.cache_read_input_tokens || 0) * p[3]) / m;
}

export function textOf(msg) {
  if (msg.stop_reason === "refusal") return "_This reviewer declined to review this part. Ask Claude to look at it in a session._";
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

const SYSTEM = `You review code for Lawfecta DELA, a platform where solo attorneys delegate work to freelance paralegals.
The owner, Stacey, is not technical. Write for her: plain, direct sentences, no em dashes, no jargon without a short explanation.
Report only real problems you can point to in the material. Do not invent problems. If you find none in your area, say "No problems found in this area."
For each problem give: how serious (Must fix before Live, Should fix soon, or Worth knowing), where (file and line), what could happen to a member or to Lawfecta, and the fix in one or two sentences.
Rank the most serious first. At most 8 problems.`;

export async function ask(client, shared, focus) {
  const msg = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: SYSTEM,
    messages: [{
      role: "user",
      content: [
        // The project rules and the changes are the same for every reviewer, so they are cached after the first one
        { type: "text", text: shared, cache_control: { type: "ephemeral" } },
        { type: "text", text: focus },
      ],
    }],
  });
  return msg;
}

async function main() {
  const out = arg("--out") || "ai-review.md";
  if (!process.env.ANTHROPIC_API_KEY) {
    const note = "AI reviewers are waiting on setup: add the ANTHROPIC_API_KEY secret in GitHub (Settings, Secrets and variables, Actions).";
    writeFileSync(out, note + "\n");
    console.log(note);
    return;
  }
  const client = new Anthropic();
  const rules = existsSync("CLAUDE.md") ? readFileSync("CLAUDE.md", "utf8") : "";
  let shared, jobs, title;

  if (arg("--health")) {
    const report = readFileSync(arg("--health"), "utf8");
    const files = ["supabase/functions/api/app.ts", "tools/promote.mjs", "widgets/DELA-Auth.php", "shared/dela-core.js"]
      .concat(git("ls-files", "supabase/migrations").trim().split("\n").slice(-2));
    const code = files.filter(existsSync).map((f) => `===== ${f}\n${readFileSync(f, "utf8")}`).join("\n\n").slice(0, MAX_CHARS);
    shared = `PROJECT RULES (CLAUDE.md):\n${rules}\n\nAUTOMATIC HEALTH CHECKS THIS MONTH:\n${report}\n\nKEY CODE:\n${code}`;
    jobs = [["What will break first", "Using the checks and the code above, list what is most likely to break or hurt members or Lawfecta first, across security, payments, data and tests. Rank by how likely and how bad. Then one short paragraph: the single most useful thing to do this month."]];
    title = "What will break first";
  } else {
    const base = arg("--base");
    const head = arg("--head") || "HEAD";
    if (!base) throw new Error("--base is needed");
    const diff = git("diff", "--unified=5", base, head, "--", ".", ":!package-lock.json", ":!docs/specs", ":!docs/Decision_Sheet.docx");
    if (!diff.trim()) {
      writeFileSync(out, "No code changes to review.\n");
      return;
    }
    const truncated = diff.length > MAX_CHARS;
    const log = git("log", "--format=- %h %s", `${base}..${head}`);
    shared = `PROJECT RULES (CLAUDE.md):\n${rules}\n\nCOMMITS IN THIS VERSION:\n${log}\n\nCHANGES (git diff ${base.slice(0, 7)}..${head.slice(0, 7)}${truncated ? ", cut short because it is very large" : ""}):\n${diff.slice(0, MAX_CHARS)}`;
    jobs = REVIEWERS.map(([name, area]) => [name, `You are the ${name} reviewer. Review only these areas: ${area}.`]);
    title = `AI review of ${base.slice(0, 7)}..${head.slice(0, 7)}`;
  }

  let total = 0;
  const parts = [`# ${title}`, "", `Reviewers: ${jobs.map((j) => j[0]).join(", ")}. Model: ${MODEL}. These are suggestions; a person decides what to fix.`, ""];
  for (const [name, focus] of jobs) {
    const msg = await ask(client, shared, focus);
    const cost = costOf(msg.usage, msg.model) ?? 0;
    total += cost;
    parts.push(`## ${name}`, "", textOf(msg), "");
    console.log(`${name}: ${msg.usage.input_tokens} in, ${msg.usage.cache_read_input_tokens || 0} cached, ${msg.usage.output_tokens} out, about $${cost.toFixed(2)}`);
  }
  parts.push(`_Cost of this review: about $${total.toFixed(2)}._`);
  writeFileSync(out, parts.join("\n") + "\n");
  console.log(`Total about $${total.toFixed(2)}. Written to ${out}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error("AI review stopped: " + String(e?.message || e).slice(0, 500));
    process.exit(1);
  });
}
