// The Lawfecta logo everywhere the name shows (Stacey 2026-11-09): emails, Word and print exports.
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { strFromU8, unzipSync } from "npm:fflate@0.8.2";
import { buildNotice } from "./lib/email.ts";
import { trialEmail } from "./lib/trial/rules.ts";
import { logoPng, logoUrl } from "./lib/brand/logo.ts";
import { docToDocx, docToHtml, normalizeDoc } from "./lib/documents/model.ts";
import { normalize, toDocx, toHtml } from "./lib/playbooks/model.ts";

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47];

Deno.test("logo address: pinned to a commit id, never to anything else", () => {
  assertEquals(logoUrl("8f050ae"), "https://cdn.jsdelivr.net/gh/SliceOfThanks/lawfecta@8f050ae/brand/lawfecta-mark-192.png");
  assertEquals(logoUrl("main"), "https://cdn.jsdelivr.net/gh/SliceOfThanks/lawfecta@main/brand/lawfecta-mark-192.png");
  for (const bad of ["", null, undefined, "x/../../evil", "abc def", "1234567@evil.com"]) assert(logoUrl(bad).endsWith("@main/brand/lawfecta-mark-192.png"), String(bad));
  assertEquals([...logoPng().slice(0, 4)], PNG_SIG);
});

Deno.test("notice email: the logo with alt text, and the words stay for mail apps that block images", () => {
  const n = { title: "A new invitation", body: "Open DELA to see it.", link: "/dela", siteUrl: "https://www.hirelegalhelp.com", appPath: "/dela", environment: "staging" };
  const withLogo = buildNotice({ ...n, logoUrl: logoUrl("8f050ae") }).html;
  assert(withLogo.includes(`<img src="https://cdn.jsdelivr.net/gh/SliceOfThanks/lawfecta@8f050ae/brand/lawfecta-mark-192.png"`));
  assert(withLogo.includes(`alt="Lawfecta"`));
  assert(withLogo.includes("Lawfecta DELA (test site)"));
  const noLogo = buildNotice(n).html;
  assert(!noLogo.includes("<img"), "no image without an address");
  assert(noLogo.includes("Lawfecta DELA (test site)"));
});

Deno.test("trial email: the logo at the top", () => {
  const m = trialEmail("ending", "Dora", "https://www.hirelegalhelp.com", "staging", 2, logoUrl("main"));
  assert(m.html.includes(`alt="Lawfecta"`) && m.html.includes("lawfecta-mark-192.png"));
});

const doc = () => normalizeDoc({ type: "sop", title: "Run a conflict check", owner_role: "Paralegal", roles: ["Attorney", "Paralegal"], purpose: "Find conflicts." } as any);
const META = { version: 1, date: "2026-11-09", status: "draft", firm: "Example Legal", doc_id: "INT-01", last_reviewed: "", next_review: "", changes: [] };

function checkDocx(bytes: Uint8Array) {
  const z = unzipSync(bytes);
  assert(z["word/header1.xml"], "header part");
  assertEquals([...z["word/media/lawfecta-logo.png"].slice(0, 4)], PNG_SIG);
  assert(strFromU8(z["word/_rels/header1.xml.rels"]).includes(`Target="media/lawfecta-logo.png"`));
  assert(strFromU8(z["word/header1.xml"]).includes(`descr="Lawfecta"`));
  assert(strFromU8(z["word/header1.xml"]).includes("Lawfecta DELA"));
  assert(strFromU8(z["word/document.xml"]).includes(`<w:headerReference w:type="default" r:id="rIdBrandHeader"/>`));
  assert(strFromU8(z["word/_rels/document.xml.rels"]).includes(`Id="rIdBrandHeader"`));
  const ct = strFromU8(z["[Content_Types].xml"]);
  assert(ct.includes(`PartName="/word/header1.xml"`) && ct.includes(`Extension="png"`));
}

Deno.test("Word exports: documents and playbooks carry the logo in the page header", () => {
  checkDocx(docToDocx(doc(), META));
  checkDocx(toDocx(normalize({ title: "Intake", steps: [{ text: "Call the client" }] }), { version: 1, date: "2026-11-09", status: "draft", firm: "" }));
});

Deno.test("print and HTML exports: the logo is inside the file, so it prints offline", () => {
  for (const html of [docToHtml(doc(), META), toHtml(normalize({ title: "Intake" }), { version: 1, date: "2026-11-09", status: "draft", firm: "" })]) {
    assert(html.includes(`<img src="data:image/png;base64,iVBOR`), "embedded png");
    assert(html.includes(`alt="Lawfecta"`));
    assert(html.indexOf("Lawfecta DELA") < html.indexOf("<h1>"), "logo line above the title");
  }
});
