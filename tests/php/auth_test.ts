// Checks that a pass made by the real PHP widget is accepted by the api, and that a logged-out member gets none.
// Run: deno test -A tests/php/auth_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1";
import { verifyPass } from "../../supabase/functions/api/lib/pass.ts";

const SECRET = "abcDEF0123456789abcDEF0123456789xyz";
async function php(secret: string, logged: boolean) {
  const out = await new Deno.Command("php", { args: [new URL("./make_pass.php", import.meta.url).pathname, secret, logged ? "1" : "0"] }).output();
  assertEquals(out.code, 0, new TextDecoder().decode(out.stderr));
  return JSON.parse(new TextDecoder().decode(out.stdout));
}

Deno.test("PHP pass is accepted by the api", async () => {
  const r = await php(SECRET, true);
  const p = await verifyPass(r.pass, SECRET);
  assert(p, "pass verifies");
  assertEquals(p!.uid, 4242);
  assertEquals(p!.sub, "31");
  assertEquals(p!.name, "Test O'Brien");
  assertEquals(p!.email, "test@lawfecta.invalid");
  assert(p!.jn.startsWith("2026-10-20T09:30:00"), "sign up date travels in the pass");
  assertEquals(r.why, "pass_ok");
  const r2 = await php(SECRET, true);
  assert(r2.pass !== r.pass, "every page load makes a new one-use pass");
});

Deno.test("logged out or unset secret gives no pass", async () => {
  assertEquals((await php(SECRET, false)).pass, "");
  const r = await php("PASTE_YOUR_DELA_SECRET_HERE", true);
  assertEquals(r.pass, "");
  assert(r.why.includes("secret_not_set"));
});
