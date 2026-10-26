// DELA shared core: element builder, API client, formatting and styles. Loaded before the member app or the admin area.
// Everything renders inside a shadow root so Brilliant Directories styles cannot reach in (and ours cannot leak out).
// Member text is always set with textContent, never as HTML.
(function () {
  var D = (window.DELA = window.DELA || {});

  D.h = function (tag, attrs) {
    var el = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else if (k === "value") el.value = v;
      else if (k === "checked") el.checked = !!v;
      else el.setAttribute(k, v === true ? "" : String(v));
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  };
  function add(el, kid) {
    if (kid === null || kid === undefined || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { add(el, k); }); return; }
    el.appendChild(typeof kid === "string" || typeof kid === "number" ? document.createTextNode(String(kid)) : kid);
  }

  D.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  D.money = function (cents) {
    if (cents === null || cents === undefined) return "";
    var d = cents / 100;
    return "$" + (d % 1 === 0 ? d.toLocaleString("en-US") : d.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };
  D.pct = function (bps) { return (bps / 100).toString() + "%"; };
  D.date = function (iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  D.dateTime = function (iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };
  D.firstName = function (name) { return String(name || "").split(" ")[0] || "there"; };

  // How an allowance reads to a member
  D.limitText = function (e) {
    if (e.kind === "flag") return e.enabled ? "Included" : "Not in your plan";
    if (!e.enabled) return "Not in your plan";
    if (e.unlimited) return "No cap";
    var left = e.remaining === null ? e.limit : e.remaining;
    if (e.unit === "MB") return (e.limit >= 1000 ? (e.limit / 1000) + " GB" : e.limit + " MB");
    if (e.unit === "seats") return e.limit + (e.limit === 1 ? " seat" : " seats") + " included";
    return e.period === "month" ? left + " of " + e.limit + " left this month" : left + " of " + e.limit + " available";
  };

  D.STATUS = { C: "Confirmed", R: "Suggested", O: "Open", G: "Needs a gate" };
  D.SIDE = { attorney: "Attorney", freelancer: "Freelancer" };

  // API client. The session token lives only in memory: a page reload signs in again with a fresh BD pass.
  D.client = function (root, onSignedOut) {
    var base = root.getAttribute("data-api");
    var boot = root.delaBoot || {};
    var token = boot.session || "";
    function req(method, path, body) {
      var opts = { method: method, headers: {} };
      if (token) opts.headers["x-dela-session"] = token;
      if (body !== undefined) { opts.headers["content-type"] = "application/json"; opts.body = JSON.stringify(body); }
      return fetch(base + path, opts).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 401 && onSignedOut) onSignedOut();
          if (!r.ok) { var e = new Error(j.error || "error_" + r.status); e.status = r.status; throw e; }
          return j;
        });
      });
    }
    return {
      boot: boot,
      get: function (p) { return req("GET", p); },
      post: function (p, b) { return req("POST", p, b || {}); },
      signOut: function () { var t = token; token = ""; return t ? fetch(base + "/sign-out", { method: "POST", headers: { "x-dela-session": t } }).catch(function () {}) : Promise.resolve(); },
    };
  };

  D.mount = function (root) {
    D.clear(root);
    var host = D.h("div", { class: "dela-host" });
    root.appendChild(host);
    var shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    shadow.appendChild(D.h("style", { text: D.CSS }));
    var app = D.h("div", { class: "dela", "data-theme": "auto" });
    shadow.appendChild(app);
    return { shadow: shadow, app: app };
  };

  D.toast = function (app, text, bad) {
    var t = D.h("div", { class: "toast" + (bad ? " bad" : ""), role: "status", text: text });
    app.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
  };

  // Plain words for API error codes
  D.errorText = function (code) {
    var map = {
      forbidden: "Only the Lawfecta Team owner can do that.",
      wrong_type: "That value is the wrong kind (for example, words where a number goes).",
      bad_member_id: "Enter the member's BD member ID (a number).",
      never_signed_in: "That member has not opened DELA yet. Ask them to open DELA once, then try again.",
      last_owner: "DELA needs at least one owner.",
      bd_plan_in_use: "That BD plan ID is already linked to another DELA plan.",
      locked_setting: "That setting can only be changed at setup.",
      bad_value: "That value is not allowed.",
      not_a_draft: "That plan version is not a draft.",
      bad_plan: "That plan does not fit this side.",
      signed_out: "Your sign in ended. Refresh the page.",
      server_error: "Something went wrong. Please try again.",
    };
    return map[code] || "That did not work (" + code + ").";
  };

  // Lawfecta brand: deep navy to burgundy, burgundy and blue pill buttons, soft pink highlights, Inter type.
  D.CSS = [
    ":host{all:initial}",
    ".dela{--bg:#f4f5f7;--card:#ffffff;--ink:#1c2230;--muted:#5f6675;--line:#e6e7ec;--brand:#8b2146;--brand-ink:#ffffff;--blue:#0d83dd;--pink:#fbeef2;--pink-ink:#8b2146;",
    "--navy:#1d2030;--hero:linear-gradient(135deg,#1d2030 0%,#3a1a33 45%,#8b2146 100%);--hot:linear-gradient(120deg,#3a1238 0%,#8b2146 55%,#d23b62 100%);",
    "--ok:#2f7a4f;--warn:#a46a00;--bad:#b3261e;--soft:#f1f2f6;--shadow:0 10px 30px rgba(139,33,70,.10);",
    "font-family:Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:var(--ink);background:var(--bg);min-height:60vh;padding:0 0 88px;box-sizing:border-box;-webkit-font-smoothing:antialiased}",
    "@media (prefers-color-scheme:dark){.dela{--bg:#11131b;--card:#1a1d28;--ink:#eceef3;--muted:#a7adbb;--line:#2a2e3c;--brand:#c2416f;--pink:#2a1622;--pink-ink:#f19ab8;--soft:#222634;--shadow:none}}",
    ".dela *{box-sizing:border-box}",
    ".top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;background:linear-gradient(120deg,#1d1426,#3a1430);color:#fff;position:sticky;top:0;z-index:5}",
    ".brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none}.brand img{width:34px;height:34px;border-radius:50%}",
    ".brand b{font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:20px;letter-spacing:.06em}.brand span{font-size:12px;font-weight:700;letter-spacing:.12em;opacity:.8;text-transform:uppercase}",
    ".grow{flex:1}",
    ".badge{display:inline-block;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:var(--soft);color:var(--ink);border:1px solid var(--line);white-space:nowrap}",
    ".badge.stage{background:#fff3d6;color:#7a5200;border-color:#e8c97a}.badge.C{background:#e3f3ea;color:#21613d;border-color:#b6dcc5}.badge.R{background:#e5f1fc;color:#0b5fa3;border-color:#b9d9f4}.badge.O{background:#fff3d6;color:#7a5200;border-color:#e8c97a}.badge.G{background:var(--pink);color:var(--pink-ink);border-color:#efc3d2}",
    ".avatar{width:36px;height:36px;border-radius:50%;background:#b8315e;color:#fff;font-weight:800;font-size:13px;display:inline-flex;align-items:center;justify-content:center;border:0;padding:0;cursor:pointer}",
    ".wrap{max-width:1040px;margin:0 auto;padding:16px}",
    "h1{font-size:28px;line-height:1.2;margin:18px 0 4px;font-weight:800;letter-spacing:-.01em}h2{font-size:19px;margin:0 0 8px;font-weight:800}h3{font-size:16px;margin:0 0 6px;font-weight:700}",
    "p{margin:0 0 10px}.muted{color:var(--muted)}.small{font-size:14px}",
    ".eyebrow{font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}",
    ".card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:20px;margin:14px 0;box-shadow:var(--shadow)}",
    ".hero{border-radius:24px;padding:24px;margin:16px 0;color:#fff;background:var(--hot);box-shadow:0 14px 34px rgba(139,33,70,.25)}.hero.navy{background:var(--hero)}",
    ".hero h2{font-size:30px;line-height:1.15;margin:8px 0 10px;color:#fff}.hero p{color:rgba(255,255,255,.9);max-width:560px}",
    ".hero .pill-white{background:#fff;color:var(--brand);border-color:#fff}",
    ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}",
    ".stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}@media (min-width:800px){.stats{grid-template-columns:repeat(4,1fr)}}",
    ".stat-tile{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;gap:12px;align-items:flex-start}",
    ".chip{width:38px;height:38px;border-radius:50%;background:var(--pink);color:var(--pink-ink);display:inline-flex;align-items:center;justify-content:center;font-weight:800;flex:none}",
    ".tile{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;gap:12px;align-items:flex-start}",
    ".soon{font-size:11px;font-weight:800;color:var(--blue);text-transform:uppercase;letter-spacing:.08em}",
    ".notice{border-left:4px solid var(--brand);background:var(--pink);color:var(--ink);padding:12px 14px;border-radius:12px;margin:12px 0;font-size:14px}",
    ".notice.bad{border-color:var(--bad);background:#fdeceb}.notice.ok{border-color:var(--ok);background:#e9f5ee}",
    "button,.btn{font:inherit;font-weight:700;border-radius:999px;border:1.5px solid var(--brand);background:var(--brand);color:var(--brand-ink);padding:10px 20px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;line-height:1.2}",
    "button.blue,.btn.blue{background:var(--blue);border-color:var(--blue);color:#fff}",
    "button.ghost{background:transparent;color:var(--brand)}button.danger{background:var(--bad);border-color:var(--bad);color:#fff}button.small,.btn.small{padding:6px 14px;font-size:14px}",
    ".top button.ghost,.top .btn.ghost{color:#fff;border-color:rgba(255,255,255,.45)}",
    "button:disabled{opacity:.55;cursor:not-allowed}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--blue);outline-offset:2px}",
    "input,select,textarea{font:inherit;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:12px;padding:9px 12px;max-width:100%}",
    "label{display:block;font-size:14px;font-weight:700;margin:10px 0 4px}",
    ".row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}",
    ".seg{display:inline-flex;border:1px solid rgba(255,255,255,.35);border-radius:999px;overflow:hidden}.seg button{border:0;border-radius:999px;background:transparent;color:#fff;font-weight:700;padding:6px 14px;font-size:14px}.seg button[aria-pressed=true]{background:#fff;color:var(--brand)}",
    "table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:700}",
    ".scroll{overflow-x:auto}",
    ".tabs{display:flex;gap:4px;padding:8px 16px;background:var(--card);border-bottom:1px solid var(--line);overflow-x:auto}.tabs button{background:transparent;color:var(--ink);border-color:transparent;font-weight:700;white-space:nowrap}.tabs button[aria-selected=true]{background:var(--pink);color:var(--pink-ink);border-color:transparent}",
    ".stat{font-size:28px;font-weight:800;line-height:1.1}",
    ".list{list-style:none;padding:0;margin:0}.list li{padding:12px 0;border-bottom:1px solid var(--line)}",
    ".work{display:flex;gap:14px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px 16px;margin:10px 0}",
    ".bell{position:relative;background:transparent;color:#fff;border-color:rgba(255,255,255,.45)}.bell b{position:absolute;top:-6px;right:-6px;background:#d23b62;color:#fff;border-radius:999px;font-size:11px;padding:1px 6px}",
    ".drawer{position:fixed;top:0;right:0;bottom:0;width:min(380px,100%);background:var(--card);border-left:1px solid var(--line);z-index:20;padding:16px;overflow:auto;box-shadow:-8px 0 30px rgba(0,0,0,.15)}",
    ".menu{position:absolute;right:12px;top:calc(100% + 6px);background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.15);padding:8px;z-index:15;min-width:220px}.menu button,.menu a{display:flex;width:100%;background:transparent;color:var(--ink);border:0;border-radius:10px;padding:10px 12px;font-weight:600}.menu button:hover,.menu a:hover{background:var(--soft)}",
    ".nav{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);display:flex;justify-content:space-around;padding:6px 4px calc(6px + env(safe-area-inset-bottom));z-index:6}",
    ".nav button{flex:1;background:transparent;border:0;color:var(--muted);flex-direction:column;gap:2px;font-size:13px;font-weight:600;padding:6px 4px;border-radius:12px}.nav button i{font-style:normal;font-size:20px;line-height:1}.nav button[aria-current=page]{color:var(--brand)}",
    "@media (min-width:900px){.nav{position:static;justify-content:flex-start;gap:6px;border:0;background:transparent;padding:8px 16px;max-width:1040px;margin:0 auto}.nav button{flex:none;flex-direction:row;gap:8px;font-size:15px;padding:8px 14px}.nav button[aria-current=page]{background:var(--pink)}.dela{padding-bottom:48px}}",
    ".toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 18px;border-radius:999px;z-index:30;font-weight:700;max-width:90%}.toast.bad{background:var(--bad);color:#fff}",
    ".check{display:flex;gap:10px;align-items:flex-start;padding:6px 0}.check i{width:18px;height:18px;border-radius:50%;border:2px solid #d5aebb;flex:none;margin-top:3px}",
    "@media (max-width:600px){h1{font-size:24px}.wrap{padding:12px}.card{padding:16px}.hero{padding:20px}.hero h2{font-size:26px}.brand span{display:none}.top{flex-wrap:nowrap;gap:8px;padding:10px 12px}.brand b{font-size:16px;letter-spacing:.04em}.brand img{width:30px;height:30px}.top .badge{font-size:11px;padding:2px 8px}.bell{padding:6px 10px}}",
  ].join("");

  // Inter for DELA. Fonts must load at the page level to reach inside the shadow root.
  if (!document.getElementById("dela-font")) {
    var l = document.createElement("link");
    l.id = "dela-font";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
    document.head.appendChild(l);
  }

  // Files that ship with this code version (logo and so on)
  D.asset = function (root, rel) { return (root.getAttribute("data-base") || "") + "/" + rel; };
})();
