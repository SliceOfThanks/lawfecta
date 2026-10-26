// DELA admin area for the Lawfecta Team (Step 1). Every change is checked again on the server,
// saved with its history, and written to the audit log. Only owners can change things.
(function () {
  var D = window.DELA;
  var root = document.getElementById("dela-app");
  if (!D || !root) return;
  var m = D.mount(root);
  var app = m.app;
  var h = D.h;
  var api = D.client(root, function () { body(h("div", { class: "notice bad", text: "Your sign in ended. Refresh the page." })); });
  var boot = api.boot || {};
  var me = boot.me || {};
  var isOwner = (me.staff || []).indexOf("owner") >= 0;
  var TABS = [["overview", "Overview"], ["access", "Access list"], ["people", "People"], ["plans", "Plans"], ["settings", "Settings"],
    ["switches", "Switches"], ["team", "Lawfecta Team"], ["holds", "Holds"], ["audit", "Audit log"], ["jobs", "Jobs"], ["releases", "Releases"]];
  var current = "overview";
  var mainEl = null;
  var tabsEl = null;

  function body(node) { D.clear(mainEl); mainEl.appendChild(node); }
  function ok(t) { D.toast(app, t); }
  function fail(e) { D.toast(app, D.errorText(e && e.message ? e.message : String(e)), true); }
  // Admin functions answer { ok, reason } for expected refusals
  function check(r) {
    var d = r && r.data;
    if (d && d.ok === false) throw new Error(d.reason || "error");
    return d;
  }
  function loading() { body(h("p", { class: "muted", text: "Loading..." })); }
  function ownerOnly(node) { return isOwner ? node : null; }

  if (boot.route !== "here" || !(me.staff || []).length) {
    D.clear(app);
    app.appendChild(h("div", { class: "wrap" }, h("div", { class: "card", style: "max-width:560px;margin:40px auto;text-align:center" },
      h("h1", { text: "Lawfecta Team only" }), h("p", { class: "muted", text: "This page is for the Lawfecta Team. Log in with a Lawfecta Team account." }))));
    return;
  }

  function frame() {
    var top = h("div", { class: "top" }, h("span", { class: "brand" }, h("img", { src: D.asset(root, "brand/lawfecta-mark-96.png"), alt: "" }), h("b", { text: "LAWFECTA" }), h("span", { text: "DELA Admin" })));
    top.appendChild(h("span", { class: "badge " + (me.environment === "live" ? "C" : "stage"), text: me.environment === "live" ? "Live" : "Staging" }));
    top.appendChild(h("span", { class: "grow" }));
    top.appendChild(h("span", { class: "small", style: "opacity:.85", text: me.person.name + " (" + me.staff.join(", ") + ")" }));
    top.appendChild(h("a", { class: "btn small ghost", href: "/dela", style: "color:#fff;border-color:rgba(255,255,255,.45);background:transparent" }, "Member view"));
    tabsEl = h("div", { class: "tabs", role: "tablist" });
    mainEl = h("div", { class: "wrap" });
    D.clear(app);
    app.appendChild(top);
    app.appendChild(tabsEl);
    app.appendChild(mainEl);
    drawTabs();
  }

  function drawTabs() {
    D.clear(tabsEl);
    TABS.forEach(function (t) {
      tabsEl.appendChild(h("button", { role: "tab", "aria-selected": String(t[0] === current), onclick: function () { go(t[0]); } }, t[1]));
    });
  }

  function go(tab) {
    current = tab;
    drawTabs();
    loading();
    ({ overview: overview, access: access, people: people, plans: plans, settings: settings, switches: switches, team: team, holds: holds, audit: audit, jobs: jobs, releases: releases })[tab]();
  }

  // ---------- Overview ----------

  function overview() {
    api.get("/admin/overview").then(function (r) {
      var d = r.data;
      var stat = function (label, n, note) { return h("div", { class: "tile" }, h("div", { class: "muted small", text: label }), h("div", { class: "stat", text: String(n) }), note ? h("div", { class: "muted small", text: note }) : null); };
      var dec = d.decisions || {};
      body(h("div", null,
        h("h1", { text: "Overview" }),
        h("p", { class: "muted", text: d.access_mode === "everyone" ? "DELA is open to every member with a linked plan." : "DELA is open only to people on the access list and the Lawfecta Team." }),
        h("div", { class: "grid" },
          stat("People who opened DELA", d.people, d.signed_in_7d + " in the last 7 days"),
          stat("On the access list", d.access_list),
          stat("Staging test accounts", d.staging_testers),
          stat("Turned away (7 days)", d.denied_7d, "Not on the access list"),
          stat("Decisions to make", (dec.O || 0) + (dec.R || 0), (dec.O || 0) + " open, " + (dec.R || 0) + " suggested, " + (dec.G || 0) + " need a gate"),
          stat("Plans not linked to BD", d.unmapped_plans, "Link them on the Plans tab"),
          stat("Switches on", d.switches_on),
          stat("Active holds", d.holds_active)),
        h("div", { class: "card" }, h("h2", { text: "Check notices" }),
          h("p", { class: "muted small", text: "Sends a test notice to you. Email uses the service in the email.sender setting (log means it is recorded, not sent)." }),
          h("div", { class: "row" },
            h("button", { onclick: function () { api.post("/admin/test-notification", { email: false }).then(check).then(function () { ok("Test notice sent. Open the member view to see it."); }).catch(fail); } }, "Send an in-app notice"),
            h("button", { class: "ghost", onclick: function () { api.post("/admin/test-notification", { email: true }).then(check).then(function () { ok("Test email queued. The worker sends it within a minute."); }).catch(fail); } }, "Send a test email"))),
        h("div", { class: "card" }, h("h2", { text: "Recent activity" }),
          h("ul", { class: "list" }, d.recent.map(function (a) { return h("li", { class: "small" }, h("strong", { text: a.action.split("_").join(" ") }), " by " + a.actor + " ", h("span", { class: "muted", text: D.dateTime(a.at) })); })))));
    }).catch(fail);
  }

  // ---------- Access list ----------

  function access() {
    api.get("/admin/access").then(function (r) {
      var rows = r.data;
      var list = function (channel) {
        var mine = rows.filter(function (a) { return a.channel === channel; });
        if (!mine.length) return h("p", { class: "muted", text: "Nobody yet." });
        return h("div", { class: "scroll" }, h("table", null, h("thead", null, h("tr", null, h("th", { text: "BD member ID" }), h("th", { text: "Name" }), h("th", { text: "Note" }), h("th", { text: "Added" }), h("th", { text: "" }))),
          h("tbody", null, mine.map(function (a) {
            return h("tr", null, h("td", { text: String(a.bd_member_id) }), h("td", { text: a.name || "Has not opened DELA yet" }), h("td", { text: a.note }), h("td", { text: D.date(a.granted_at) }),
              h("td", null, ownerOnly(h("button", { class: "ghost small", onclick: function () {
                if (!confirm("Remove " + (a.name || a.bd_member_id) + "? They are signed out of DELA right away.")) return;
                api.post("/admin/access/revoke", { id: a.id }).then(check).then(function () { ok("Removed"); access(); }).catch(fail);
              } }, "Remove"))));
          }))));
      };
      var idIn = h("input", { type: "number", min: "1", placeholder: "BD member ID", "aria-label": "BD member ID" });
      var noteIn = h("input", { placeholder: "Note (for example: test attorney)", "aria-label": "Note" });
      var chIn = h("select", { "aria-label": "List" }, h("option", { value: "access", text: "Access list (may open this copy of DELA)" }), h("option", { value: "staging_tester", text: "Staging test account (Live sends them to Staging)" }));
      body(h("div", null,
        h("h1", { text: "Access list" }),
        h("p", { class: "muted", text: "Find a member's ID in BD admin under Members. The Lawfecta Team can always open DELA." }),
        ownerOnly(h("div", { class: "card" }, h("h2", { text: "Add someone" }), h("div", { class: "row" }, idIn, noteIn, chIn,
          h("button", { onclick: function () {
            api.post("/admin/access/grant", { bd_member_id: idIn.value, channel: chIn.value, note: noteIn.value }).then(check).then(function (d) { ok(d.duplicate ? "Already on that list" : "Added"); access(); }).catch(fail);
          } }, "Add")))),
        h("div", { class: "card" }, h("h2", { text: "May open DELA" }), list("access")),
        h("div", { class: "card" }, h("h2", { text: "Staging test accounts" }), h("p", { class: "muted small", text: "These accounts load the Staging copy with test data and Stripe test mode. Add them on the Live admin area. On Staging, add them to the access list too." }), list("staging_tester"))));
    }).catch(fail);
  }

  // ---------- People ----------

  var planList = null;
  function loadPlans() { return planList ? Promise.resolve(planList) : api.get("/admin/plans").then(function (r) { planList = r.data; return planList; }); }

  function people(q) {
    Promise.all([api.get("/admin/people?q=" + encodeURIComponent(q || "")), loadPlans()]).then(function (res) {
      var rows = res[0].data;
      var plansData = res[1].plans;
      var qIn = h("input", { placeholder: "Search name, email or BD member ID", value: q || "", "aria-label": "Search" });
      body(h("div", null,
        h("h1", { text: "People" }),
        h("div", { class: "row" }, qIn, h("button", { onclick: function () { people(qIn.value); } }, "Search")),
        h("div", { class: "card scroll" }, h("table", null,
          h("thead", null, h("tr", null, h("th", { text: "Person" }), h("th", { text: "Sides and plans" }), h("th", { text: "Flags" }), h("th", { text: "Actions" }))),
          h("tbody", null, rows.map(function (p) {
            var sides = p.sides.length ? p.sides.map(function (s) { return h("div", { text: D.SIDE[s.side] + ": " + s.plan_code + (s.plan_source === "staff_grant" ? " (set by team)" : "") }); }) : h("span", { class: "muted", text: "No side yet" });
            var flags = [p.staff.length ? "Team: " + p.staff.join(", ") : "", p.access ? "Access list" : "", p.staging_tester ? "Staging tester" : "", p.status !== "active" ? p.status : ""].filter(Boolean).join(" | ");
            return h("tr", null,
              h("td", null, h("strong", { text: p.name || "(no name)" }), h("div", { class: "muted small", text: "BD " + p.bd_member_id + (p.email ? " | " + p.email : "") }), h("div", { class: "muted small", text: "Last seen " + D.dateTime(p.last_seen_at) })),
              h("td", null, sides), h("td", { class: "small", text: flags }),
              h("td", null, ownerOnly(sideForm(p, plansData)), h("button", { class: "ghost small", style: "margin-top:6px", onclick: function () {
                var why = prompt("Why are you placing a hold? Members see a short notice that some actions are paused.");
                if (!why) return;
                api.post("/admin/holds", { bd_member_id: p.bd_member_id, reason: why, severity: "medium" }).then(check).then(function () { ok("Hold placed"); }).catch(fail);
              } }, "Place hold")));
          })))),
        h("p", { class: "muted small", text: "Showing up to 50 people, most recently seen first." })));
    }).catch(fail);
  }

  function sideForm(p, plansData) {
    var sel = h("select", { "aria-label": "Plan to give" }, h("option", { value: "", text: "Give a side and plan..." }),
      plansData.map(function (pl) { return h("option", { value: pl.side + ":" + pl.code, text: pl.name }); }));
    var wrap = h("div", { class: "row" }, sel, h("button", { class: "small", onclick: function () {
      if (!sel.value) return;
      var parts = sel.value.split(":");
      api.post("/admin/sides/grant", { bd_member_id: p.bd_member_id, side: parts[0], plan_code: parts[1] }).then(check).then(function () { ok("Done. It applies on their next page load."); people(); }).catch(fail);
    } }, "Give"));
    p.sides.filter(function (s) { return s.plan_source === "staff_grant"; }).forEach(function (s) {
      wrap.appendChild(h("button", { class: "ghost small", onclick: function () {
        api.post("/admin/sides/release", { bd_member_id: p.bd_member_id, side: s.side }).then(check).then(function () { ok("Back on their BD plan from their next sign in"); people(); }).catch(fail);
      } }, "Use BD plan for " + D.SIDE[s.side]));
    });
    return wrap;
  }

  // ---------- Plans ----------

  function plans() {
    planList = null;
    loadPlans().then(function (d) {
      var feats = d.features;
      var section = function (side) {
        var mine = d.plans.filter(function (p) { return p.side === side; });
        var fs = feats.filter(function (f) { return f.side === side || f.side === "both"; });
        var head = h("tr", null, h("th", { text: "" }), mine.map(function (p) { return h("th", null, h("div", { text: p.name.replace(D.SIDE[side] + " ", "") }), p.draft ? h("span", { class: "badge O", text: "Draft waiting" }) : null); }));
        var cell = function (p, fn) { return h("td", { text: p.approved ? fn(p.approved) : "" }); };
        var rows = [
          h("tr", null, h("th", { text: "Monthly price" }), mine.map(function (p) { return cell(p, function (v) { return D.money(v.monthly_cents); }); })),
          h("tr", null, h("th", { text: "Yearly price" }), mine.map(function (p) { return cell(p, function (v) { return v.annual_cents === null ? "None" : D.money(v.annual_cents); }); })),
          h("tr", null, h("th", { text: "Platform fee for this side" }), mine.map(function (p) { return cell(p, function (v) { return D.pct(v.fee_bps); }); })),
          h("tr", null, h("th", { text: "BD plan ID" }), mine.map(function (p) { return h("td", null, p.bd_plan_id ? String(p.bd_plan_id) : h("span", { class: "badge O", text: "Not linked" })); })),
          h("tr", null, h("th", { text: "Members on it" }), mine.map(function (p) { return h("td", { text: String(p.members) }); })),
        ].concat(fs.map(function (f) {
          return h("tr", null, h("th", null, h("span", { text: f.label + (f.period === "month" && f.label.indexOf("month") < 0 ? " (per month)" : "") + (f.unit === "MB" ? " (MB)" : "") }), " ", h("span", { class: "badge " + f.status, text: D.STATUS[f.status] })),
            mine.map(function (p) {
              var x = p.approved && p.approved.features[f.key];
              if (!x) return h("td", { text: "" });
              if (!x.enabled) return h("td", { class: "muted", text: f.kind === "flag" ? "No" : "Not included" });
              return h("td", { text: f.kind === "flag" ? "Yes" : x.limit === null ? "No cap" : String(x.limit) });
            }));
        }));
        rows.push(h("tr", null, h("th", { text: "" }), mine.map(function (p) { return h("td", null, ownerOnly(h("button", { class: "small", onclick: function () { editPlan(p, fs); } }, p.draft ? "Review draft" : "Edit"))); })));
        return h("div", { class: "card" }, h("h2", { text: D.SIDE[side] + " plans" }), h("div", { class: "scroll" }, h("table", null, h("thead", null, head), h("tbody", null, rows))));
      };
      body(h("div", null, h("h1", { text: "Plans" }),
        h("p", { class: "muted", text: "Attorneys and freelancers have separate plans. Each side pays its own fee. Edits are saved as a draft; approving the draft applies it to everyone on that plan right away, and the old version is kept on record." }),
        section("attorney"), section("freelancer")));
    }).catch(fail);
  }

  function dollars(cents) { return cents === null || cents === undefined ? "" : String(cents / 100); }
  function toCents(v) {
    var s = String(v).trim();
    if (s === "") return null;
    var n = Math.round(Number(s) * 100);
    if (!isFinite(n) || n < 0) throw new Error("bad_monthly_cents");
    return n;
  }

  function editPlan(p, fs) {
    var base = p.draft || p.approved;
    var monthly = h("input", { type: "number", min: "0", step: "0.01", value: dollars(base.monthly_cents), "aria-label": "Monthly price in dollars" });
    var annual = h("input", { type: "number", min: "0", step: "0.01", value: dollars(base.annual_cents), placeholder: "Leave empty for no yearly price", "aria-label": "Yearly price in dollars" });
    var fee = h("input", { type: "number", min: "0", max: "50", step: "0.01", value: String(base.fee_bps / 100), "aria-label": "Fee percent" });
    var bd = h("input", { type: "number", min: "1", value: p.bd_plan_id ? String(p.bd_plan_id) : "", placeholder: "BD plan ID", "aria-label": "BD plan ID" });
    var note = h("input", { placeholder: "Why this change (saved with the version)", value: base.note || "", style: "width:100%" });
    var inputs = {};
    var rows = fs.map(function (f) {
      var x = base.features[f.key] || { enabled: false, limit: 0 };
      var on = h("input", { type: "checkbox", checked: x.enabled, "aria-label": f.label + " included" });
      var lim = f.kind === "flag" ? null : h("input", { type: "number", min: "0", value: x.limit === null ? "" : String(x.limit), placeholder: "No cap", style: "width:110px", "aria-label": f.label + " limit" });
      inputs[f.key] = { on: on, lim: lim };
      return h("tr", null, h("td", { text: f.label + (f.period === "month" && f.label.indexOf("month") < 0 ? " (per month)" : "") + (f.unit === "MB" ? " (MB)" : "") }), h("td", null, on), h("td", null, lim || h("span", { class: "muted", text: "Yes or no" })));
    });
    function collect() {
      var features = {};
      Object.keys(inputs).forEach(function (k) {
        var i = inputs[k];
        var l = i.lim ? (i.lim.value.trim() === "" ? null : Number(i.lim.value)) : null;
        features[k] = { enabled: i.on.checked, limit: l };
      });
      return { plan_code: p.code, monthly_cents: toCents(monthly.value) || 0, annual_cents: toCents(annual.value), fee_bps: Math.round(Number(fee.value) * 100), note: note.value, features: features };
    }
    body(h("div", null,
      h("button", { class: "ghost small", onclick: plans }, "Back to plans"),
      h("h1", { text: p.name }),
      p.draft ? h("div", { class: "notice", text: "You are looking at a draft. Nothing changes for members until you approve it." }) : null,
      h("div", { class: "card" },
        h("label", { text: "Monthly price (dollars)" }), monthly,
        h("label", { text: "Yearly price (dollars)" }), annual,
        h("label", { text: "Platform fee this side pays (percent of the project price)" }), fee,
        h("p", { class: "muted small", text: "The $10 minimum fee per side is a separate setting (fees.floor_cents_per_party)." }),
        h("label", { text: "Note" }), note),
      h("div", { class: "card scroll" }, h("h2", { text: "Limits" }), h("p", { class: "muted small", text: "Leave a limit empty for no cap. Untick to leave it out of the plan." }),
        h("table", null, h("thead", null, h("tr", null, h("th", { text: "Limit" }), h("th", { text: "Included" }), h("th", { text: "Amount" }))), h("tbody", null, rows))),
      h("div", { class: "row" },
        h("button", { onclick: function () {
          var data;
          try { data = collect(); } catch (e) { fail(e); return; }
          api.post("/admin/plans/draft", data).then(check).then(function () { ok("Draft saved. Review it, then approve."); planList = null; return loadPlans(); })
            .then(function (d) { editPlan(d.plans.filter(function (x) { return x.code === p.code; })[0], fs); }).catch(fail);
        } }, "Save draft"),
        p.draft ? h("button", { onclick: function () {
          if (!confirm("Approve this version of " + p.name + "? It applies to everyone on this plan right away.")) return;
          api.post("/admin/plans/approve", { version_id: p.draft.id }).then(check).then(function () { ok("Approved"); plans(); }).catch(fail);
        } }, "Approve draft") : null,
        p.draft ? h("button", { class: "ghost", onclick: function () { api.post("/admin/plans/discard", { version_id: p.draft.id }).then(check).then(function () { ok("Draft thrown away"); plans(); }).catch(fail); } }, "Throw draft away") : null),
      h("div", { class: "card" }, h("h2", { text: "Link to a BD plan" }),
        h("p", { class: "muted small", text: "Members on this BD plan get this DELA plan. Find the plan ID in BD admin under Membership Plans." }),
        h("div", { class: "row" }, bd, h("button", { class: "small", onclick: function () {
          api.post("/admin/plans/map", { plan_code: p.code, bd_plan_id: bd.value.trim() === "" ? null : bd.value }).then(check).then(function () { ok("Linked"); }).catch(fail);
        } }, "Save link")))));
  }

  // ---------- Settings ----------

  function settings() {
    api.get("/admin/settings").then(function (r) {
      var groups = {};
      r.data.forEach(function (s) { (groups[s.section || "Other"] = groups[s.section || "Other"] || []).push(s); });
      var order = Object.keys(groups).sort(function (a, b) { return (a === "System") - (b === "System") || a.localeCompare(b); });
      body(h("div", null, h("h1", { text: "Settings and decisions" }),
        h("p", { class: "muted", text: "Every business number DELA uses. Changing one saves the old value in its history and records your decision. Marking it Confirmed means you approved it." }),
        order.map(function (g) {
          return h("div", { class: "card scroll" }, h("h2", { text: g }), h("table", null, h("tbody", null, groups[g].map(settingRow))));
        })));
    }).catch(fail);
  }

  function shown(s) {
    var v = s.value;
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (s.unit === "cents" && typeof v === "number") return D.money(v);
    if (s.unit === "basis points" && typeof v === "number") return D.pct(v);
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === "string") return v.split("_").join(" ");
    return String(v) + (s.unit ? " " + s.unit : "");
  }

  function settingRow(s) {
    var tr = h("tr", null,
      h("td", null, h("strong", { text: s.label || s.key }), h("div", { class: "muted small", text: s.key + (s.source ? " | " + s.source : "") }), s.note ? h("div", { class: "muted small", text: s.note }) : null),
      h("td", { text: shown(s) }),
      h("td", null, h("span", { class: "badge " + s.status, text: D.STATUS[s.status] })),
      h("td", null, ownerOnly(s.key === "environment" ? null : h("button", { class: "ghost small", onclick: function () { editSetting(s, tr); } }, "Change"))));
    return tr;
  }

  function editSetting(s, tr) {
    var v = s.value;
    var input;
    if (typeof v === "boolean") input = h("select", null, h("option", { value: "true", text: "Yes" }), h("option", { value: "false", text: "No" }));
    else if (typeof v === "number") input = h("input", { type: "number", step: s.unit === "cents" ? "0.01" : "1", value: s.unit === "cents" ? String(v / 100) : String(v) });
    else if (Array.isArray(v)) input = h("input", { value: v.join(", ") });
    else input = h("input", { value: String(v), style: "width:100%" });
    if (typeof v === "boolean") input.value = String(v);
    var status = h("select", null, ["C", "R", "O", "G"].map(function (k) { return h("option", { value: k, text: D.STATUS[k] }); }));
    status.value = "C";
    var reason = h("input", { placeholder: "Why (saved with the decision)", style: "width:100%" });
    function parse() {
      var x = input.value;
      if (typeof v === "boolean") return x === "true";
      if (typeof v === "number") { var n = Number(x); if (!isFinite(n) || String(x).trim() === "") throw new Error("wrong_type"); return s.unit === "cents" ? Math.round(n * 100) : n; }
      if (Array.isArray(v)) return x.split(",").map(function (p) { var t = p.trim(); var n = Number(t); return t !== "" && isFinite(n) && typeof v[0] === "number" ? n : t; }).filter(function (p) { return p !== ""; });
      return x;
    }
    var cell = h("td", { colspan: "4" },
      h("strong", { text: s.label }),
      h("label", { text: "New value" + (s.unit === "cents" ? " (dollars)" : s.unit ? " (" + s.unit + ")" : "") + (Array.isArray(v) ? ", separated by commas" : "") }), input,
      h("label", { text: "Status" }), status,
      h("label", { text: "Reason" }), reason,
      h("div", { class: "row", style: "margin-top:8px" },
        h("button", { class: "small", onclick: function () {
          var val;
          try { val = parse(); } catch (e) { fail(e); return; }
          if (s.key === "access.mode" && val === "everyone" && !confirm("Open DELA to every member with a linked plan?")) return;
          if (s.key === "payments.mode" && val === "live" && !confirm("This marks Stripe as live. Real money moves only when the live_payments switch is also on. Continue?")) return;
          api.post("/admin/settings", { key: s.key, value: val, status: status.value, reason: reason.value }).then(check).then(function () { ok("Saved"); settings(); }).catch(fail);
        } }, "Save"),
        h("button", { class: "ghost small", onclick: settings }, "Cancel"),
        h("button", { class: "ghost small", onclick: function () { history(s.key, cell); } }, "History")));
    D.clear(tr);
    tr.appendChild(cell);
  }

  function history(key, cell) {
    api.get("/admin/decisions?key=" + encodeURIComponent(key)).then(function (r) {
      cell.appendChild(h("ul", { class: "list small" }, r.data.map(function (d) {
        return h("li", null, D.dateTime(d.recorded_at) + ": " + JSON.stringify(d.value) + " (" + D.STATUS[d.status] + ")" + (d.by ? " by " + d.by : "") + (d.note ? ". " + d.note : ""));
      })));
    }).catch(fail);
  }

  // ---------- Switches ----------

  function switches() {
    api.get("/admin/switches").then(function (r) {
      var label = { off: "Off", staff: "Lawfecta Team only", list: "Access list", everyone: "Everyone" };
      body(h("div", null, h("h1", { text: "Switches" }),
        h("p", { class: "muted", text: "Features that are built stay off until you turn them on. Try a feature with Lawfecta Team only first, then the access list, then everyone." }),
        h("div", { class: "card scroll" }, h("table", null, h("thead", null, h("tr", null, h("th", { text: "Switch" }), h("th", { text: "Before it goes on" }), h("th", { text: "State" }))),
          h("tbody", null, r.data.map(function (s) {
            var sel = h("select", { "aria-label": s.label, disabled: !isOwner }, ["off", "staff", "list", "everyone"].map(function (k) { return h("option", { value: k, text: label[k] }); }));
            sel.value = s.state;
            sel.addEventListener("change", function () {
              if (s.key === "live_payments" && sel.value !== "off" && !confirm("Turning this on lets real money move through Stripe for these people. A payments lawyer review is recommended first. Continue?")) { sel.value = s.state; return; }
              api.post("/admin/switches", { key: s.key, state: sel.value }).then(check).then(function () { ok(s.label + ": " + label[sel.value]); s.state = sel.value; }).catch(function (e) { sel.value = s.state; fail(e); });
            });
            return h("tr", null, h("td", null, h("strong", { text: s.label }), h("div", { class: "muted small", text: s.key })), h("td", { class: "small", text: s.gate }), h("td", null, sel));
          }))))));
    }).catch(fail);
  }

  // ---------- Team ----------

  function team() {
    api.get("/admin/staff").then(function (r) {
      var idIn = h("input", { type: "number", min: "1", placeholder: "BD member ID", "aria-label": "BD member ID" });
      var roleIn = h("select", { "aria-label": "Role" }, h("option", { value: "reviewer", text: "Reviewer (checks attorneys and milestones)" }), h("option", { value: "support", text: "Support (access list, holds, jobs)" }), h("option", { value: "finance", text: "Finance (payments and holds)" }), h("option", { value: "owner", text: "Owner (everything)" }));
      body(h("div", null, h("h1", { text: "Lawfecta Team" }),
        h("p", { class: "muted", text: "Team members can open DELA and this admin area. Only owners can change settings, plans and switches. A person must open DELA once before they can be added." }),
        ownerOnly(h("div", { class: "card" }, h("h2", { text: "Add a team member" }), h("div", { class: "row" }, idIn, roleIn,
          h("button", { onclick: function () { api.post("/admin/staff/grant", { bd_member_id: idIn.value, role: roleIn.value }).then(check).then(function () { ok("Added. They need to refresh DELA."); team(); }).catch(fail); } }, "Add")))),
        h("div", { class: "card scroll" }, h("table", null, h("tbody", null, r.data.map(function (s) {
          return h("tr", null, h("td", null, h("strong", { text: s.name }), h("div", { class: "muted small", text: "BD " + s.bd_member_id + " | " + s.email })), h("td", { text: s.role }), h("td", { text: D.date(s.granted_at) }),
            h("td", null, ownerOnly(h("button", { class: "ghost small", onclick: function () {
              if (!confirm("Remove " + s.name + " as " + s.role + "?")) return;
              api.post("/admin/staff/revoke", { id: s.id }).then(check).then(function () { ok("Removed"); team(); }).catch(fail);
            } }, "Remove"))));
        }))))));
    }).catch(fail);
  }

  // ---------- Holds, audit, jobs ----------

  function holds() {
    api.get("/admin/holds").then(function (r) {
      body(h("div", null, h("h1", { text: "Holds" }),
        h("p", { class: "muted", text: "A hold pauses new actions for a person (new allowances, and later hiring and payments). Their records stay readable. Place one from the People tab." }),
        r.data.length ? h("div", { class: "card scroll" }, h("table", null, h("tbody", null, r.data.map(function (x) {
          return h("tr", null, h("td", null, h("strong", { text: x.name || x.scope_id }), h("div", { class: "muted small", text: "BD " + (x.bd_member_id || "") })), h("td", { text: x.reason }), h("td", { text: x.severity }), h("td", { text: D.dateTime(x.created_at) }),
            h("td", null, h("button", { class: "ghost small", onclick: function () {
              var ev = prompt("What did you check before releasing this hold?");
              if (!ev) return;
              api.post("/admin/holds/release", { id: x.id, evidence: ev }).then(check).then(function () { ok("Released"); holds(); }).catch(fail);
            } }, "Release")));
        })))) : h("p", { class: "muted", text: "No active holds." })));
    }).catch(fail);
  }

  function audit(before, acc) {
    api.get("/admin/audit" + (before ? "?before=" + before : "")).then(function (r) {
      var rows = (acc || []).concat(r.data);
      body(h("div", null, h("h1", { text: "Audit log" }), h("p", { class: "muted", text: "Every sign in, refusal and change. Entries can never be edited or deleted." }),
        h("div", { class: "card scroll" }, h("table", null, h("thead", null, h("tr", null, h("th", { text: "When" }), h("th", { text: "Who" }), h("th", { text: "What" }), h("th", { text: "Details" }))),
          h("tbody", null, rows.map(function (a) {
            return h("tr", null, h("td", { text: D.dateTime(a.at) }), h("td", { text: a.actor || a.actor_type }), h("td", { text: a.action.split("_").join(" ") }), h("td", { class: "small", text: (a.object_type ? a.object_type + " " + a.object_id + " " : "") + JSON.stringify(a.detail) }));
          })))),
        r.data.length === 100 ? h("button", { class: "ghost", onclick: function () { audit(rows[rows.length - 1].id, rows); } }, "Load older") : null));
    }).catch(fail);
  }

  function jobs() {
    api.get("/admin/jobs").then(function (r) {
      var c = r.data.counts || {};
      body(h("div", null, h("h1", { text: "Jobs" }), h("p", { class: "muted", text: "Background work such as emails and reminders. The worker runs every minute and retries problems with growing waits." }),
        h("div", { class: "grid" }, Object.keys(c).map(function (k) { return h("div", { class: "tile" }, h("div", { class: "muted small", text: k }), h("div", { class: "stat", text: String(c[k]) })); })),
        h("div", { class: "card scroll" }, h("h2", { text: "Problems" }), r.data.recent_problems.length ? h("table", null, h("tbody", null, r.data.recent_problems.map(function (j) {
          return h("tr", null, h("td", { text: j.kind }), h("td", { text: j.status }), h("td", { text: "Tries: " + j.attempts }), h("td", { class: "small", text: j.last_error }), h("td", { text: D.dateTime(j.updated_at) }));
        }))) : h("p", { class: "muted", text: "No problems." }))));
    }).catch(fail);
  }

  // ---------- Releases (Staging to Live, owner only, with the release password) ----------

  var releaseTimer = null;
  var RELEASE_STATUS = { candidate: "Ready to test", tested: "Tested on Staging", approved: "Starting push", deploying: "Pushing to Live", live: "Live now", failed: "Push failed", replaced: "Was live before", rolled_back: "Rolled back" };
  var RELEASE_ERR = {
    wrong_password: "That release password is not right.", locked: "Too many wrong passwords. Pushing is locked for 30 minutes.",
    no_password: "Set your release password first.", not_tested: "Mark this version as tested on Staging first.",
    password_too_short: "Use at least 12 characters.", push_in_progress: "A push is already running. Wait for it to finish.",
    github_not_set_up: "GitHub is not connected for pushes yet. Claude will finish this setup.", staging_only: "Pushes start from the Staging admin area.",
    not_rollback_target: "You can only go back to a version that was live before.",
  };
  function relFail(e) {
    var code = e && e.message ? e.message : String(e);
    if (code.indexOf("github_") === 0 && !RELEASE_ERR[code]) { D.toast(app, "GitHub did not start the push (" + code + "). Nothing changed on Live.", true); return; }
    D.toast(app, RELEASE_ERR[code] || D.errorText(code), true);
  }

  function askPassword(title, text, onGo) {
    var pw = h("input", { type: "password", autocomplete: "off", "aria-label": "Release password", style: "width:100%" });
    var box = h("div", { class: "drawer", role: "dialog", "aria-label": title },
      h("h2", { text: title }), h("p", { text: text }),
      h("label", { text: "Release password" }), pw,
      h("div", { class: "row", style: "margin-top:14px" },
        h("button", { onclick: function () { var v = pw.value; pw.value = ""; box.remove(); onGo(v); } }, "Confirm"),
        h("button", { class: "ghost", onclick: function () { pw.value = ""; box.remove(); } }, "Cancel")));
    app.appendChild(box);
    pw.focus();
  }

  function releases() {
    if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null; }
    api.get("/admin/releases").then(function (r) {
      var d = r.data;
      if (current !== "releases") return;
      if (d.environment === "live") {
        body(h("div", null, h("h1", { text: "Releases" }), h("div", { class: "card" }, h("p", { text: "This is the Live copy. New versions reach Live only when the owner pushes them from the Staging admin area with the release password." }),
          d.live ? h("p", { class: "muted", text: "Live now: " + d.live.version }) : null)));
        return;
      }
      var busy = d.releases.some(function (x) { return x.status === "approved" || x.status === "deploying"; });
      var cards = d.releases.map(function (x) {
        var tested = h("input", { type: "checkbox", checked: x.status === "tested", disabled: !isOwner || ["candidate", "tested", "failed"].indexOf(x.status) < 0, "aria-label": "I tested " + x.version + " on Staging" });
        tested.addEventListener("change", function () {
          api.post("/admin/releases/tested", { release_id: x.id, tested: tested.checked }).then(check).then(function () { ok(tested.checked ? "Marked as tested" : "Unmarked"); releases(); }).catch(relFail);
        });
        var actions = h("div", { class: "row", style: "margin-top:10px" });
        if (isOwner && x.status === "tested") actions.appendChild(h("button", { disabled: busy, onclick: function () {
          askPassword("Push " + x.version + " to Live", "Members on Live get this version right away. Enter your release password to confirm.", function (pw) {
            api.post("/admin/releases/push", { release_id: x.id, password: pw }).then(check).then(function () { ok("Push started. This page updates as it runs."); releases(); }).catch(relFail);
          });
        } }, "Push to Live"));
        if (isOwner && (x.status === "replaced" || x.status === "rolled_back")) actions.appendChild(h("button", { class: "ghost", disabled: busy, onclick: function () {
          askPassword("Go back to " + x.version, "Live goes back to this earlier version. Data members added since then is kept. Enter your release password to confirm.", function (pw) {
            api.post("/admin/releases/rollback", { release_id: x.id, password: pw }).then(check).then(function () { ok("Going back started."); releases(); }).catch(relFail);
          });
        } }, "Go back to this version"));
        var badgeClass = x.status === "live" ? "C" : x.status === "failed" ? "G" : x.status === "tested" ? "R" : "O";
        return h("div", { class: "card" },
          h("div", { class: "row" }, h("h2", { class: "grow", text: x.version }), h("span", { class: "badge " + badgeClass, text: RELEASE_STATUS[x.status] || x.status })),
          x.notes ? h("p", { text: x.notes }) : null,
          h("p", { class: "muted small", text: "Code " + x.commit.slice(0, 7) + " | " + x.migrations.length + (x.migrations.length === 1 ? " database change" : " database changes") + " | added " + D.dateTime(x.created_at) + (x.live_at ? " | live " + D.dateTime(x.live_at) : "") + (x.approved_by ? " | pushed by " + x.approved_by : "") }),
          ["candidate", "tested", "failed"].indexOf(x.status) >= 0 ? h("label", { class: "row", style: "font-weight:600" }, tested, "I tested this version on Staging and it is ready") : null,
          actions,
          x.test_report ? h("details", null, h("summary", { class: "small", text: "Test report" }), h("pre", { class: "small", style: "white-space:pre-wrap", text: x.test_report })) : null,
          x.deploy_log ? h("details", null, h("summary", { class: "small", text: "Push log" }), h("pre", { class: "small", style: "white-space:pre-wrap", text: x.deploy_log })) : null);
      });
      var pwCard = null;
      if (isOwner) {
        var cur = h("input", { type: "password", autocomplete: "off", "aria-label": "Current release password" });
        var nw = h("input", { type: "password", autocomplete: "new-password", "aria-label": "New release password" });
        var nw2 = h("input", { type: "password", autocomplete: "new-password", "aria-label": "Repeat new release password" });
        pwCard = h("div", { class: "card" }, h("h2", { text: d.password_set ? "Change your release password" : "Set your release password" }),
          h("p", { class: "muted small", text: "Only you push to Live, and every push asks for this password. Use at least 12 characters. Do not share it, and never paste it in chat. Five wrong tries lock pushing for 30 minutes." }),
          d.password_set ? [h("label", { text: "Current password" }), cur] : null,
          h("label", { text: "New password" }), nw, h("label", { text: "Repeat new password" }), nw2,
          h("div", { style: "margin-top:10px" }, h("button", { onclick: function () {
            if (nw.value !== nw2.value) { D.toast(app, "The two new passwords do not match.", true); return; }
            api.post("/admin/releases/password", { current: cur.value, password: nw.value }).then(check).then(function () { cur.value = nw.value = nw2.value = ""; ok("Release password saved"); releases(); }).catch(relFail);
          } }, "Save password")));
      }
      body(h("div", null, h("h1", { text: "Releases" }),
        h("p", { class: "muted", text: "Every version is built and tested on Staging first. Only the owner pushes a tested version to Live, with the release password. If a push fails, Live stays on the version it had." }),
        d.locked_until ? h("div", { class: "notice bad", text: "Pushing is locked until " + D.dateTime(d.locked_until) + " after too many wrong passwords." }) : null,
        h("div", { class: "card" }, h("h2", { text: "On Live now" }), h("p", { text: d.live ? d.live.version + ", since " + D.dateTime(d.live.live_at) : "Nothing yet. Live gets its first version when you push one." })),
        pwCard,
        cards.length ? cards : h("p", { class: "muted", text: "No versions yet. Claude adds each version here when it is ready on Staging." })));
      if (busy) releaseTimer = setTimeout(releases, 8000);
    }).catch(fail);
  }

  frame();
  go("overview");
})();
