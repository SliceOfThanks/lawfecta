#!/usr/bin/env node
// Local stand-in for PHP, for running the browser tests on a computer without PHP (never used on GitHub or on the site): renders a DELA widget file the way tests/php/render_widget.php does.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const [, , script, widget, uid, plan, secret, api, , cookie] = process.argv;
const root = path.resolve(path.dirname(decodeURIComponent(script)), "../..");
let src = fs.readFileSync(path.join(root, "widgets", widget + ".php"), "utf8");
let html = src.slice(src.indexOf("?>") + 2);
let pass = "", why = "empty_pass";
const ids = [...new Set(String(cookie || "").split(";").map((p) => p.trim().split("=")).filter((kv) => kv[0] === "userid").map((kv) => parseInt(decodeURIComponent(kv[1] || ""), 10)).filter((n) => n > 0))];
if (uid !== "0") {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ aud: "dela", uid: Number(uid), sub: String(parseInt(plan || "0", 10) || 0), name: "Member " + uid, email: "m" + uid + "@test.invalid", jn: "", jti: crypto.randomBytes(16).toString("hex"), iat: now, exp: now + 600 });
  const body = Buffer.from(payload).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  pass = body + "." + crypto.createHmac("sha256", secret).update(body).digest("hex");
  why = "pass_ok";
} else why = "no_userid_cookie,empty_pass";
if (ids.length > 1) { pass = ""; why += ",cookie_conflict,uids_" + ids.join("_"); }
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
html = html.replace(/<\?php echo htmlspecialchars\(\$dela_pass, ENT_QUOTES\); \?>/, esc(pass)).replace(/<\?php echo htmlspecialchars\(\$dela_why, ENT_QUOTES\); \?>/, esc(why));
html = html.replace(/data-api-staging="[^"]*"/, 'data-api-staging="' + api + '"');
process.stdout.write(html);
