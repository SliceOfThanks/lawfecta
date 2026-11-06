// The document standard engine: structure, conversion, scrubbing, the self-check, RACI fixes, the word count, gigs and exports.
//   deno test -A supabase/functions/api/documents_model_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";
import { bodyWords, carryImages, changeSummary, checkDoc, imageSize, withoutImages, classifyLegacy, codeFix, docToCsv, docToDocx, docToMarkdown, fromLegacy, gigPart, namesToRoles, normalizeDoc, scrubCredentials, vagueWords, type DocBody } from "./lib/documents/model.ts";
import { normalize } from "./lib/playbooks/model.ts";
import { readDocAnswer } from "./lib/documents/ai.ts";

const CTX = { systems: ["Clio", "LawPay"], maxWords: 900, maxConsulted: 2, kpiMin: 3, kpiMax: 5, skipped: [] as string[] };
const META = { version: 2, date: "2026-11-05", status: "draft", firm: "Example Legal", doc_id: "INT-01", last_reviewed: "", next_review: "2027-02-05", changes: [{ at: "2026-11-05", what: "First version", by: "Attorney", approved_by: "" }] };
const roles = ["Attorney", "Paralegal", "Outsourced freelancer"];
const st = (text: string, raci: Record<string, string>, extra: Record<string, unknown> = {}) => ({ text, raci, role: Object.keys(raci)[0], ...extra });
function goodSop(): DocBody {
  return normalizeDoc({
    type: "sop", title: "Run a conflict check", lifecycle: "INT", owner_role: "Paralegal", roles, purpose: "Find conflicts before a consult.", scope: "Every new matter, all practice areas.",
    trigger: "A prospective client asks for a consult.", before_you_start: ["Access to Clio"], timing: "Within 1 business day of the request.", quality_check: ["The result is in the matter notes"],
    done_when: "The result is recorded.", saved_in: "Clio, matter notes", related_links: [{ label: "INT-02 Respond to a new inquiry", url: "INT-02" }],
    decisions: [{ if: "a possible conflict appears", then: "Stop and send it to the attorney.", attorney_decides: true, escalate_to: "Attorney" }],
    steps: [st("Search the party names in Clio.", { Paralegal: "R,A" }, { menu_path: "Clio > Contacts > Search" }), st("Record the search results in the matter notes.", { Paralegal: "R,A", Attorney: "I" }),
      st("Decide whether to accept the matter.", { Attorney: "R,A", Paralegal: "C" }, { attorney_decides: true })],
  });
}

Deno.test("a complete SOP passes every check; dashes are removed", () => {
  const b = goodSop();
  const r = checkDoc(b, CTX);
  assertEquals(r.items.filter((i) => i.status !== "pass").map((i) => i.id), []);
  assertEquals(r.blocking, 0);
  assertEquals(normalizeDoc({ title: "Intake — the fast way" }).title, "Intake, the fast way");
});

Deno.test("blocking: a judgment step without the flag, two A's, an attorney decision owned by staff", () => {
  const b = goodSop();
  b.steps[2].attorney_decides = false;
  let r = checkDoc(b, CTX);
  assertEquals(r.items.find((i) => i.id === "judgment")?.status, "blocking", "\"Decide whether to accept the matter\" is legal judgment");
  b.steps[2].not_judgment = true;
  assertEquals(checkDoc(b, CTX).items.find((i) => i.id === "judgment")?.status, "pass", "the attorney can mark it as not a judgment step");
  const c = goodSop();
  c.steps[0].raci = { Paralegal: "R,A", Attorney: "A" };
  r = checkDoc(c, CTX);
  assertEquals([r.items.find((i) => i.id === "one_a")?.status, r.items.find((i) => i.id === "one_a")?.steps], ["blocking", [1]], "exactly one A");
  const d = goodSop();
  d.steps[2].raci = { Paralegal: "R,A" };
  assertEquals(checkDoc(d, CTX).items.find((i) => i.id === "attorney_a")?.status, "blocking", "an attorney must own an Attorney decides step");
  // Fix it (code): flags the judgment step and moves the A to the attorney
  const fixed = codeFix(codeFix(d, "attorney_a"), "one_a");
  assertEquals(fixed.steps[2].raci.Attorney, "A");
  assertEquals(checkDoc(fixed, CTX).blocking, 0);
  const e = goodSop(); e.steps[2].attorney_decides = false;
  assertEquals(codeFix(e, "judgment").steps[2].attorney_decides, true);
  const many = goodSop(); many.roles.push("Billing/bookkeeper", "Office manager");
  many.steps[0].raci = { Paralegal: "R,A", Attorney: "C", "Billing/bookkeeper": "C", "Office manager": "C" };
  assertEquals(checkDoc(many, CTX).items.find((i) => i.id === "consulted")?.status, "attention", "a warning above two C's");
});

Deno.test("attention items: vague words, verbs, one action, menu paths, rules without links, skipped questions, length", () => {
  assertEquals(vagueWords("Reply promptly. Send it as needed."), ["as needed", "promptly"]);
  assertEquals(vagueWords("Reply promptly (within 1 business day)."), [], "allowed with a specific value");
  const b = goodSop();
  b.steps.push(...normalizeDoc({ steps: [{ text: "The client gets a call and then an email.", raci: { Paralegal: "R,A" } }, { text: "File the answer within 21 days after service under the court rule.", raci: { Paralegal: "R", Attorney: "A" }, menu_path: "[Add the menu path in your system]" }] }).steps);
  const r = checkDoc(b, { ...CTX, skipped: ["What goes wrong today"] });
  const st = (id: string) => r.items.find((i) => i.id === id)?.status;
  assertEquals([st("verbs"), st("one_action"), st("menu_paths"), st("rules"), st("skipped")], ["attention", "attention", "attention", "attention", "attention"]);
  b.steps[4].rule = { name: "Court rule", link: "https://courts.example.gov/rule", verify_by: "2099-01-01" };
  assertEquals(checkDoc(b, CTX).items.find((i) => i.id === "rules")?.status, "pass");
  const long = goodSop();
  long.purpose = "word ".repeat(950);
  const lr = checkDoc(long, CTX);
  assertEquals([lr.items.find((i) => i.id === "length")?.status, lr.items.find((i) => i.id === "length")?.fix, lr.blocking], ["attention", "split", 0], "over 900 words never blocks");
  assert(bodyWords(goodSop()) < 120, "the header, RACI and change log do not count");
});

Deno.test("client data and credentials: found, and credentials removed by code; names become roles", () => {
  const b = goodSop();
  b.steps[0].text = "Search Clio. The password: Hunter22 and account number 123456789012.";
  b.purpose = "For our client John Smith, SSN 123-45-6789.";
  const r = checkDoc(b, CTX);
  assertEquals([r.items.find((i) => i.id === "credentials")?.status, r.items.find((i) => i.id === "client_data")?.status], ["attention", "attention"]);
  const f = codeFix(b, "credentials");
  assert(!f.steps[0].text.includes("Hunter22") && f.steps[0].text.includes("[removed: password]") && !f.steps[0].text.includes("123456789012"));
  assertEquals(scrubCredentials("login: ann@firm.example").removed, true);
  const n = namesToRoles(normalizeDoc({ ...goodSop(), purpose: "Maria Lopez runs this for Ann." }), [{ name: "Maria Lopez", role: "Paralegal" }]);
  assertEquals([n.body.purpose, n.replaced], ["the Paralegal runs this for Ann.", ["Maria Lopez"]]);
});

Deno.test("workflows: KPIs from listed systems, gigs only from the freelancer's R steps; policies and playbooks never", () => {
  const wf = normalizeDoc({
    type: "workflow", title: "Intake to signed engagement", owner_role: "Attorney", process_owner_role: "Attorney", start_point: "An inquiry", end_point: "Signed letter", roles,
    steps: [{ stage: "Inquiry", text: "Answer the inquiry.", raci: { "Outsourced freelancer": "R", Attorney: "A" }, handoff: "Lead form in Clio", target_time: "1 hour", linked_sop: "INT-02" },
      { stage: "Conflicts", text: "Run the conflict check.", raci: { Paralegal: "R", Attorney: "A" }, handoff: "Notes", target_time: "1 day", linked_sop: "INT-01" },
      { stage: "Decide", text: "Decide whether to accept the matter.", raci: { Attorney: "R,A" }, attorney_decides: true, handoff: "Decision", target_time: "1 day", linked_sop: "" },
      { stage: "Letter", text: "Prepare the engagement letter draft.", raci: { "Outsourced freelancer": "R", Attorney: "A" }, handoff: "Draft in Clio", target_time: "1 day", linked_sop: "ENG-01" }],
    decisions: [{ if: "a conflict", then: "stop", attorney_decides: true }],
    kpis: [{ name: "Lead response time", measures: "Hours to first reply", kind: "leading", source: "Clio lead report", owner_role: "Attorney", baseline: "measure for 30 days first", target: "under 2 hours", rhythm: "weekly" },
      { name: "Consult to signed", measures: "Percent signed", kind: "lagging", source: "Clio matters report", owner_role: "Attorney", baseline: "40%", target: "55%", rhythm: "weekly" }],
  });
  let r = checkDoc(wf, CTX);
  assertEquals(r.items.find((i) => i.id === "kpis")?.status, "attention", "2 KPIs is too few");
  wf.kpis.push({ name: "Days to signed letter", measures: "Days", kind: "lagging", source: "HubSpot deal report", owner_role: "Attorney", baseline: "9", target: "5", rhythm: "weekly" });
  r = checkDoc(wf, CTX);
  assert(r.items.find((i) => i.id === "kpis")?.detail.includes("Days to signed letter"), "a KPI from a system the firm did not list");
  wf.kpis[2].source = "Start logging: date the letter was signed";
  assertEquals(checkDoc(wf, CTX).items.find((i) => i.id === "kpis")?.status, "pass");
  const g = gigPart(wf);
  assertEquals([g.ok, g.steps.map((x) => x.stage)], [true, ["Inquiry", "Letter"]], "only the freelancer's R steps");
  assertEquals(gigPart(normalizeDoc({ type: "playbook", title: "Upset client" })).reason, "type_not_for_gigs");
  assertEquals(gigPart(normalizeDoc({ type: "policy", title: "AI use" })).reason, "type_not_for_gigs");
  assertEquals(gigPart(goodSop()).checkpoints, [3], "an SOP: every step, with the attorney checkpoints");
});

Deno.test("older playbooks: the type check and the converter keep the content and the attorney points", () => {
  const v1 = normalize({ title: "Open a matter", outcome: "The matter is open", practice_area: "Family law", jurisdiction: "TX", when_to_use: "After the letter is signed", roles: "Paralegal: opens it\nAttorney: approves",
    needs: ["Signed letter"], steps: [{ text: "Create the matter in Clio", who: "Paralegal", tool: "Clio" }, { text: "Approve the matter", who: "Attorney", tag: "keep" }],
    checks: ["Matter number recorded"], review_points: ["Attorney approves the fee"], never_delegate: ["Setting the fee"], deliverables: "An open matter", resources: ["Matter checklist"] });
  assertEquals(classifyLegacy(v1).type, "sop");
  const d = fromLegacy(v1, "sop");
  assertEquals([d.purpose, d.steps[1].attorney_decides, d.steps[1].raci.Attorney, d.quality_check[0], d.done_when], ["The matter is open", true, "R,A", "Matter number recorded", "An open matter"]);
  assert(d.decisions.some((x) => x.attorney_decides && x.if === "Setting the fee"), "never-delegate points become attorney decisions");
  assertEquals(classifyLegacy(normalize({ title: "Upset client", steps: [{ text: "Listen first, then consider whether to offer options" }, { text: "Depending on the client, use one of the fallbacks" }] })).type, "playbook");
});

Deno.test("exports: bold section headings on their own line, the draft banner, RACI, the change log; Word opens", () => {
  const md = docToMarkdown(goodSop(), META);
  for (const h of ["**Header**", "**Purpose**", "**Scope**", "**Trigger**", "**Roles**", "**Before you start**", "**Steps**", "**Decision points and escalation**", "**Timing**", "**Quality check**", "**Done when**", "**Related links**", "**Change log**", "**RACI**"]) assert(md.includes("\n" + h + "\n"), h);
  assert(md.includes("Draft, not approved") && md.includes("ATTORNEY DECIDES"));
  assert(!docToMarkdown(goodSop(), { ...META, status: "approved" }).includes("Draft, not approved"));
  assert(docToCsv(goodSop()).includes("Accountable (A)"));
  const xml = strFromU8(unzipSync(docToDocx(goodSop(), META))["word/document.xml"]);
  assert(xml.includes("Draft, not approved") && xml.includes("Decision points and escalation") && xml.includes("INT-01"));
  assertEquals(changeSummary(goodSop(), { ...goodSop(), purpose: "New purpose." }), "Changed: Purpose");
});

Deno.test("reading the AI's answer", () => {
  const a = readDocAnswer({ document: { type: "sop", title: "X" }, suggested_type: { type: "playbook", reason: "It needs judgment." }, questions: ["Which system?"], notices: ["Removed a client name"] });
  assertEquals([a.body?.title, a.suggested?.type, a.questions.length, a.notices.length], ["X", "playbook", 1, 1]);
  assertEquals(readDocAnswer(null).body, null);
});

Deno.test("images: where they may go, the checks, carried past the AI, sizes, and Word at full width", () => {
  const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
  const raw = { type: "sop", title: "Open a matter", roles, steps: [st("Create the matter in Clio.", { Paralegal: "R,A" }, { images: [{ id: A, caption: "The New matter button" }, { id: "not-an-id", caption: "x" }] }), st("Add the team.", { Paralegal: "R,A" })],
    section_images: { before_you_start: [{ id: B, caption: "" }], chart: [{ id: A, caption: "x" }] } };
  const b = normalizeDoc(raw);
  assertEquals([b.steps[0].images.length, b.section_images.before_you_start.length, "chart" in b.section_images], [1, 1, false], "bad ids and other types' sections are dropped");
  assertEquals(normalizeDoc({ ...raw, type: "policy" }).section_images, {}, "Policies hold no images");
  assertEquals(normalizeDoc({ ...raw, type: "policy" }).steps.every((x) => !x.images.length), true);
  const noFacts = checkDoc(b, CTX);
  const it = (r: ReturnType<typeof checkDoc>, id: string) => r.items.find((i) => i.id === id)!;
  assertEquals([it(noFacts, "image_checks").status, it(noFacts, "image_checks").images], ["blocking", [A, B]]);
  assertEquals(it(noFacts, "image_captions").detail, "Before you start image is missing a caption.");
  const facts = { [A]: { confirmed: true }, [B]: { confirmed: true } } as any;
  assertEquals(it(checkDoc(b, { ...CTX, images: facts }), "image_checks").status, "pass");
  assertEquals(bodyWords(b), bodyWords({ ...b, steps: b.steps.map((x) => ({ ...x, images: [] })), section_images: {} }), "captions are not words");
  assertEquals(checkDoc(normalizeDoc({ ...raw, steps: [st("x", { P: "R,A" }, { images: [1, 2, 3, 4].map((i) => ({ id: `${i}${i}${i}${i}${i}${i}${i}${i}-1111-4111-8111-111111111111`, caption: "c" })) })] }), { ...CTX, imagesPerSlot: 3 }).items.find((i) => i.id === "image_count")!.status, "attention");
  // The AI never sees images; they come back on the step with the same text, and nothing is lost when the text changes
  const ai = normalizeDoc({ ...withoutImages(b), steps: [st("Create the matter in Clio.", { Paralegal: "R,A" }), st("Add the whole team to the matter.", { Paralegal: "R,A" })] });
  assertEquals(withoutImages(b).steps[0].images, []);
  const back = carryImages(b, ai);
  assertEquals([back.steps[0].images[0].id, back.section_images.before_you_start[0].id], [A, B]);
  assertEquals(carryImages(b, normalizeDoc({ ...ai, steps: [st("Something else entirely.", { Paralegal: "R,A" })] })).steps[0].images[0].id, A);
  assertEquals(carryImages(b, normalizeDoc({ ...ai, type: "playbook" })).steps.every((x) => !x.images.length), true, "a Playbook has no step images");
  const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAAK0lEQVR4nO3NMQ0AAAgDsAlDCYqRhQw4mvRvpvpExGKxWCwWi8VisVj8N16B+mj7BBLoxAAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
  assertEquals(imageSize(png), { w: 40, h: 30 });
  assertEquals(imageSize(Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0, 30, 0, 40, 3, 0, 0, 0, 0, 0, 0])), { w: 40, h: 30 });
  assertEquals(gigPart(b).images, 2);
  const z = unzipSync(docToDocx(b, META, new Map([[A, { bytes: png, ext: "png", w: 40, h: 30 }]])));
  const xml = strFromU8(z["word/document.xml"]);
  assert(z["word/media/image1.png"] && xml.includes('cx="5943600" cy="4457700"') && xml.includes("The New matter button"), "full width, kept in proportion, caption below");
  assert(xml.includes("[Image: no caption]"), "an image not loaded shows as its caption");
  assert(strFromU8(z["[Content_Types].xml"]).includes('Extension="png"'));
  assert(docToMarkdown(b, META).includes("[Image: The New matter button]"));
  assertEquals(changeSummary(b, { ...b, steps: b.steps.map((x) => ({ ...x, images: [] })) }).includes("Images"), true);
});

Deno.test("the Accountable check says which steps have no A and which have more than one", () => {
  const b = normalizeDoc({ type: "sop", title: "X", roles, steps: [st("Search the names.", { Paralegal: "R" }), st("Record the result.", { Paralegal: "R,A", Attorney: "A" }), st("File the notes.", { Paralegal: "R,A" })] });
  const it = checkDoc(b, CTX).items.find((i) => i.id === "one_a")!;
  assertEquals(it.detail, "Step 1 has no Accountable (A). Give each step one owner. Step 2 has more than one Accountable (A). Two owners means no owner.");
  const none = checkDoc(normalizeDoc({ ...b, steps: [st("Search the names.", { Paralegal: "R" }), st("Record it.", { Paralegal: "R" })] }), CTX).items.find((i) => i.id === "one_a")!;
  assertEquals(none.detail, "Steps 1, 2 have no Accountable (A). Give each step one owner.");
});

Deno.test("a conditional step with a clear action passes the verb check (UX review D03)", () => {
  const verbsOf = (texts: string[]) => {
    const b = goodSop();
    b.steps = normalizeDoc({ steps: texts.map((t) => ({ text: t, raci: { Paralegal: "R,A" } })) }).steps;
    return checkDoc(b, CTX).items.find((i) => i.id === "verbs");
  };
  assertEquals(verbsOf(["If the client signs, send the engagement letter.", "When the retainer arrives, open the matter in Clio."])?.status, "pass");
  assertEquals(verbsOf(["If the client signs, the letter goes out."])?.status, "attention", "a condition still needs an action after it");
  assertEquals(verbsOf(["The client gets a call."])?.status, "attention");
});
