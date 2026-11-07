// Fixed stays fixed (AI review 0.9.0, tests 4): checks for three earlier fixes that shipped without their own test.
//   npx deno test -A supabase/functions/api/regressions_test.ts
import { assert } from "jsr:@std/assert@1.0.19";
import { PROPOSAL_SYSTEM } from "./lib/gigs/model.ts";
import { CATALOG_RULES } from "./lib/catalog/csv.ts";
import { RULES } from "./lib/documents/ai.ts";

Deno.test("proposal help never names a tool the freelancer's profile does not list (Track B, 2026-11-05)", () => {
  assert(PROPOSAL_SYSTEM.includes("never name a tool, software, platform or workflow the profile does not list"));
});

Deno.test("tech recommendations stay inside the catalog, even as an integration of a catalog tool (Track B)", () => {
  assert(CATALOG_RULES.includes("even as an integration or add-on of a catalog tool"));
});

Deno.test("rules and boundaries such as trust account rules stay a Policy (ChatGPT document test, 2026-11-05)", () => {
  assert(RULES.includes("Leave \"suggested_type\" null when the type asked for is reasonable: rules and boundaries (for example trust account rules) are a Policy"));
});
