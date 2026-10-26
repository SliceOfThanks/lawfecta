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

  D.CSS = [
    ":host{all:initial}",
    ".dela{--bg:#f6f4f0;--card:#ffffff;--ink:#1f2a37;--muted:#5b6675;--line:#e2ddd4;--brand:#1f3a5f;--brand-ink:#ffffff;--accent:#b8862b;--ok:#2f7a4f;--warn:#a46a00;--bad:#b23b3b;--soft:#eef2f7;",
    "font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:var(--ink);background:var(--bg);min-height:60vh;padding:0 0 48px;box-sizing:border-box}",
    "@media (prefers-color-scheme:dark){.dela{--bg:#12161c;--card:#1b2129;--ink:#e6e9ee;--muted:#a3adba;--line:#2c343f;--brand:#8fb3e0;--brand-ink:#0d1520;--soft:#222a35}}",
    ".dela *{box-sizing:border-box}",
    ".top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 16px;background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}",
    ".brand{font-weight:800;font-size:20px;letter-spacing:.02em;color:var(--brand)}.brand small{font-weight:500;font-size:12px;color:var(--muted);margin-left:6px;letter-spacing:0}",
    ".grow{flex:1}",
    ".badge{display:inline-block;font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--soft);color:var(--ink);border:1px solid var(--line)}",
    ".badge.stage{background:#fff3d6;color:#7a5200;border-color:#e8c97a}.badge.C{background:#e3f3ea;color:#21613d;border-color:#b6dcc5}.badge.R{background:#e8eef8;color:#264a7a;border-color:#c3d3ea}.badge.O{background:#fff3d6;color:#7a5200;border-color:#e8c97a}.badge.G{background:#fbe4e4;color:#8a2626;border-color:#ebbcbc}",
    ".wrap{max-width:1040px;margin:0 auto;padding:16px}",
    "h1{font-size:26px;line-height:1.25;margin:16px 0 4px}h2{font-size:19px;margin:0 0 8px}h3{font-size:16px;margin:0 0 6px}",
    "p{margin:0 0 10px}.muted{color:var(--muted)}.small{font-size:14px}",
    ".card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin:14px 0}",
    ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}",
    ".tile{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px}",
    ".tile .soon{font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.06em}",
    ".notice{border-left:4px solid var(--accent);background:var(--card);padding:12px 14px;border-radius:10px;margin:12px 0;font-size:14px}",
    ".notice.bad{border-color:var(--bad)}.notice.ok{border-color:var(--ok)}",
    "button,.btn{font:inherit;font-weight:700;border-radius:10px;border:1px solid var(--brand);background:var(--brand);color:var(--brand-ink);padding:9px 14px;cursor:pointer;text-decoration:none;display:inline-block}",
    "button.ghost{background:transparent;color:var(--brand)}button.danger{background:var(--bad);border-color:var(--bad);color:#fff}button.small{padding:5px 10px;font-size:14px}",
    "button:disabled{opacity:.5;cursor:not-allowed}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--accent);outline-offset:2px}",
    "input,select,textarea{font:inherit;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px;max-width:100%}",
    "label{display:block;font-size:14px;font-weight:600;margin:8px 0 4px}",
    ".row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}",
    ".seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}.seg button{border:0;border-radius:0;background:transparent;color:var(--ink);font-weight:600}.seg button[aria-pressed=true]{background:var(--brand);color:var(--brand-ink)}",
    "table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:600}",
    ".scroll{overflow-x:auto}",
    ".tabs{display:flex;gap:4px;flex-wrap:wrap;padding:8px 16px;background:var(--card);border-bottom:1px solid var(--line)}.tabs button{background:transparent;color:var(--ink);border-color:transparent;font-weight:600}.tabs button[aria-selected=true]{background:var(--soft);border-color:var(--line);color:var(--brand)}",
    ".stat{font-size:28px;font-weight:800}",
    ".list{list-style:none;padding:0;margin:0}.list li{padding:10px 0;border-bottom:1px solid var(--line)}",
    ".bell{position:relative;background:transparent;color:var(--ink);border-color:var(--line)}.bell b{position:absolute;top:-6px;right:-6px;background:var(--bad);color:#fff;border-radius:999px;font-size:11px;padding:1px 6px}",
    ".drawer{position:fixed;top:0;right:0;bottom:0;width:min(380px,100%);background:var(--card);border-left:1px solid var(--line);z-index:20;padding:16px;overflow:auto;box-shadow:-8px 0 30px rgba(0,0,0,.15)}",
    ".toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:10px;z-index:30;font-weight:600;max-width:90%}.toast.bad{background:var(--bad);color:#fff}",
    ".check{display:flex;gap:10px;align-items:flex-start;padding:6px 0}.check i{width:18px;height:18px;border-radius:50%;border:2px solid var(--line);flex:none;margin-top:3px}",
    "@media (max-width:600px){h1{font-size:22px}.wrap{padding:12px}.card{padding:14px}}",
  ].join("");
})();
