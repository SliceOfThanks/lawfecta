// The storage adapter against a stand-in for Supabase Storage.
//   deno test -A supabase/functions/api/storage_test.ts
import { assertEquals } from "jsr:@std/assert@1.0.19";
import { supabaseStorage } from "./lib/files/storage.ts";

// Text files (txt, csv, md) come back compressed, and a compressed answer has no content-length. The size must still
// be found, or every text upload stops at "The upload did not reach DELA" (ChatGPT test, 2026-11-05).
Deno.test("size: a text file whose HEAD answer has no content-length still has a size", async () => {
  const seen: string[] = [];
  const f = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    seen.push((init.method ?? "GET") + " " + url.replace(/^.*\/storage\/v1/, "") + " " + JSON.stringify(init.headers ?? {}));
    if (url.includes("/object/info/")) return Response.json({ name: "a.txt", size: 173 });
    if ((init.method ?? "GET") === "HEAD") return new Response(null, { status: 200, headers: { "content-encoding": "gzip" } });
    return new Response("x".repeat(173));
  }) as typeof fetch;
  const s = supabaseStorage("https://p.supabase.co", "service", f);
  assertEquals(await s.size("org/conf/a.txt"), 173);
});

Deno.test("size: a file that is not there has no size", async () => {
  const f = (async () => new Response("{}", { status: 404 })) as typeof fetch;
  assertEquals(await supabaseStorage("https://p.supabase.co", "service", f).size("org/none.txt"), null);
});

Deno.test("size: a normal answer with content-length is used as it is", async () => {
  const f = (async (_i: string | URL | Request, init: RequestInit = {}) => (init.method === "HEAD" ? new Response(null, { status: 200, headers: { "content-length": "89759" } }) : new Response("{}", { status: 500 }))) as typeof fetch;
  assertEquals(await supabaseStorage("https://p.supabase.co", "service", f).size("org/img/a.png"), 89759);
});
