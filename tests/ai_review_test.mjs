// Tests for tools/ai_review.mjs without calling the real API.
// node --test tests/ai_review_test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ask, costOf, textOf, REVIEWERS } from "../tools/ai_review.mjs";

test("cost is measured from the token counts", () => {
  const usage = { input_tokens: 1_000_000, output_tokens: 100_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 1_000_000 };
  assert.equal(costOf(usage, "claude-opus-5-5").toFixed(2), (4 + 2 + 0.2).toFixed(2));
  assert.equal(costOf(usage, "some-other-model"), null);
});

test("a declined review is reported, not hidden", () => {
  assert.match(textOf({ stop_reason: "refusal", content: [] }), /declined/);
  assert.equal(textOf({ stop_reason: "end_turn", content: [{ type: "thinking", thinking: "" }, { type: "text", text: "No problems found in this area." }] }), "No problems found in this area.");
});

test("each reviewer shares one cached copy of the changes and keeps refusal fallbacks on", async () => {
  let req;
  const fake = { beta: { messages: { create: async (r) => { req = r; return { content: [], usage: {} }; } } } };
  await ask(fake, "RULES AND DIFF", "You are the Security reviewer.");
  assert.equal(req.model, "claude-opus-5-5");
  assert.equal(req.fallbacks, "default");
  assert.deepEqual(req.betas, ["server-side-fallback-2026-07-01"]);
  assert.equal(req.messages[0].content[0].cache_control.type, "ephemeral");
  assert.equal(req.messages[0].content[1].text, "You are the Security reviewer.");
  assert.equal(REVIEWERS.length, 4);
});

test("without the API key it says what to set up and does not fail", () => {
  const out = join(mkdtempSync(join(tmpdir(), "rev-")), "r.md");
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  execFileSync("node", ["tools/ai_review.mjs", "--base", "HEAD~1", "--out", out], { env });
  assert.match(readFileSync(out, "utf8"), /waiting on setup: add the ANTHROPIC_API_KEY secret/);
});
