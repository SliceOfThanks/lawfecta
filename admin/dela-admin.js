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
  var TABS = [["control", "Release Control"], ["overview", "Overview"], ["access", "Access list"], ["people", "People"], ["plans", "Plans"], ["settings", "Settings"],
    ["switches", "Switches"], ["team", "Lawfecta Team"], ["holds", "Holds"], ["audit", "Audit log"], ["jobs", "Jobs"]];
  var current = "control";
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
    ctl.flow = null;
    if (controlTimer) { clearTimeout(controlTimer); controlTimer = null; }
    drawTabs();
    loading();
    ({ control: function () { controlTab(true); }, overview: overview, access: access, people: people, plans: plans, settings: settings, switches: switches, team: team, holds: holds, audit: audit, jobs: jobs })[tab]();
  }

  // ---------- Overview ----------

  function overview() {
    api.get("/admin/overview").then(function (r) {
      var d = r.data;
      var stat = function (label, n, note) { return h("div", { class: "tile col" }, h("div", { class: "muted small", text: label }), h("div", { class: "stat", text: String(n) }), note ? h("div", { class: "muted small", text: note }) : null); };
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
        emergencyCard(),
        h("div", { class: "card" }, h("h2", { text: "Check notices" }),
          h("p", { class: "muted small", text: "Sends a test notice to you. Email uses the service in the email.sender setting (log means it is recorded, not sent)." }),
          h("div", { class: "row" },
            h("button", { onclick: function () { api.post("/admin/test-notification", { email: false }).then(check).then(function () { ok("Test notice sent. Open the member view to see it."); }).catch(fail); } }, "Send an in-app notice"),
            h("button", { class: "ghost", onclick: function () { api.post("/admin/test-notification", { email: true }).then(check).then(function () { ok("Test email queued. The worker sends it within a minute."); }).catch(fail); } }, "Send a test email"))),
        h("div", { class: "card" }, h("h2", { text: "Recent activity" }),
          h("ul", { class: "list" }, d.recent.map(function (a) { return h("li", { class: "small" }, h("strong", { text: a.action.split("_").join(" ") }), " by " + a.actor + " ", h("span", { class: "muted", text: D.dateTime(a.at) })); })))));
    }).catch(fail);
  }

  // ---------- Emergency pause (no push needed; members see a short message, the team keeps working) ----------

  var PAUSE_AREAS = [["all", "All of DELA"], ["ai", "AI help"], ["checkout", "New payments"], ["payouts", "Payouts"], ["renewals", "Monthly renewals"], ["external", "Outside connections"], ["email", "Emails"]];
  function emergencyCard() {
    var box = h("div", { class: "card" }, h("h2", { text: "Emergency pause" }), h("p", { class: "muted small", text: "Loading..." }));
    api.get("/admin/pause").then(function (r) {
      var p = r.data.pause || {};
      D.clear(box);
      box.appendChild(h("h2", { text: "Emergency pause" }));
      box.appendChild(h("p", { class: "muted small", text: "Stops all of DELA or one part at once, without a push. Members see: \"" + r.data.message + "\" The Lawfecta Team keeps working. You get an email each time." }));
      if (p.all) box.appendChild(h("div", { class: "notice bad", text: "DELA is paused for members right now." }));
      box.appendChild(h("div", { class: "row" }, PAUSE_AREAS.map(function (a) {
        var on = !!p[a[0]];
        return h("button", { class: on ? "danger small" : "ghost small", disabled: !isOwner, onclick: function () {
          var why = prompt((on ? "Turn back on: " : "Pause: ") + a[1] + ". Why? (saved in the log)");
          if (why === null) return;
          api.post("/admin/pause", { area: a[0], on: !on, reason: why }).then(check).then(function () { ok(a[1] + (on ? " running again" : " paused")); overview(); }).catch(fail);
        } }, (on ? "Paused: " : "") + a[1]);
      })));
    }).catch(fail);
    return box;
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
      h("div", { class: "card", id: "plan-history" }, h("h2", { text: "Earlier versions" }), h("p", { class: "muted small", text: "Bring back an earlier version's prices and limits. It comes back as a new version, and needs your release password." }),
        (function () {
          var box = h("div", null, h("p", { class: "muted small", text: "Loading..." }));
          api.get("/admin/plans/history?plan=" + encodeURIComponent(p.code)).then(function (r) {
            D.clear(box);
            var old = r.data.filter(function (v) { return v.status === "retired"; });
            if (!old.length) { box.appendChild(h("p", { class: "muted small", text: "No earlier versions yet." })); return; }
            box.appendChild(h("ul", { class: "list small" }, old.map(function (v) {
              return h("li", { class: "row" }, h("span", { class: "grow", text: "Version " + v.version + ": " + D.money(v.monthly_cents) + " a month, fee " + D.pct(v.fee_bps) + (v.effective_from ? ", from " + D.date(v.effective_from) : "") }),
                h("button", { class: "ghost small", onclick: function () {
                  askPassword("Restore version " + v.version, "Everyone on " + p.name + " gets these prices and limits right away.", function (pw) {
                    api.post("/admin/plans/restore", { version_id: v.id, password: pw }).then(check).then(function () { ok("Restored"); plans(); }).catch(relFail);
                  });
                } }, "Restore"));
            })));
          }).catch(fail);
          return box;
        })()),
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
      h("td", null, ownerOnly(["environment", "emergency.pause", "worker.last_run", "live.status", "release.setup"].indexOf(s.key) >= 0 ? null : h("button", { class: "ghost small", onclick: function () { editSetting(s, tr); } }, "Change"))));
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

  // Each change can be undone; the undo is saved as a new change, so history is never lost
  function history(key, cell) {
    api.get("/admin/settings/history?key=" + encodeURIComponent(key)).then(function (r) {
      if (!r.data.length) { cell.appendChild(h("p", { class: "muted small", text: "No changes yet. This is the starting value." })); return; }
      cell.appendChild(h("ul", { class: "list small" }, r.data.map(function (d) {
        return h("li", { class: "row" }, h("span", { class: "grow", text: D.dateTime(d.changed_at) + ": " + JSON.stringify(d.old_value) + " to " + JSON.stringify(d.new_value) + (d.by ? " by " + d.by : "") + (d.reason ? ". " + d.reason : "") }),
          ownerOnly(h("button", { class: "ghost small", onclick: function () {
            if (!confirm("Put this setting back to " + JSON.stringify(d.old_value) + "?")) return;
            api.post("/admin/settings/undo", { history_id: d.id }).then(check).then(function () { ok("Undone"); settings(); }).catch(fail);
          } }, "Undo")));
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
        h("div", { class: "grid" }, Object.keys(c).map(function (k) { return h("div", { class: "tile col" }, h("div", { class: "muted small", text: k }), h("div", { class: "stat", text: String(c[k]) })); })),
        h("div", { class: "card scroll" }, h("h2", { text: "Problems" }), r.data.recent_problems.length ? h("table", null, h("tbody", null, r.data.recent_problems.map(function (j) {
          return h("tr", null, h("td", { text: j.kind }), h("td", { text: j.status }), h("td", { text: "Tries: " + j.attempts }), h("td", { class: "small", text: j.last_error }), h("td", { text: D.dateTime(j.updated_at) }));
        }))) : h("p", { class: "muted", text: "No problems." }))));
    }).catch(fail);
  }

  // ---------- Release Control (Staging to Live, owner only, with the release password and a code) ----------

  var controlTimer = null;
  var ctl = { filter: "all", flow: null, data: null, more: false };
  var RELEASE_STATUS = { candidate: "Ready to test", tested: "Tested on Staging", approved: "Starting", deploying: "Running now", live: "Live now", failed: "Did not go live", replaced: "Was live before", rolled_back: "Was live before" };
  var RELEASE_ERR = {
    wrong_password: "That release password is not right.", locked: "Too many wrong tries. Pushing is locked for 30 minutes.",
    no_password: "Set your release password first.", not_tested: "Mark this version as tested on Staging first.",
    password_too_short: "Use at least 12 characters.", push_in_progress: "A push is already running. Wait for it to finish.",
    github_not_set_up: "GitHub is not connected for pushes yet. See Live setup on this page.", staging_only: "Pushes start from the Staging admin area.",
    not_rollback_target: "You can only go back to a version that was live before.",
    not_compatible: "This version cannot run on today's database. A newer version made a change it does not understand. Ask Claude for a fixed version instead.",
    confirm_needed: "Type RESET to confirm.", report_missing: "Save the ChatGPT test report for this version first. Send it to Claude.",
    watch_in_progress: "Live is still being watched after the last push. You can push again when the watch ends.",
    wrong_code: "That code is not right.", code_needed: "Ask for a new code. The last one was used or ran out.",
    code_locked: "Too many wrong codes. Ask for a new code.", too_many_codes: "Five codes were sent in the last 30 minutes. Wait a little, then try again.",
    bad_project_ref: "The Live project ID is the 20 small letters and numbers in its Supabase address.", bad_item: "That setup step is not known.",
  };
  function relFail(e) {
    var code = e && e.message ? e.message : String(e);
    if (code.indexOf("github_") === 0 && !RELEASE_ERR[code]) { D.toast(app, "GitHub did not start it (" + code + "). Nothing changed on Live.", true); return; }
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

  var STEP_PLAN = {
    push: [["approval", "Your approval checked"], ["tests", "Automatic tests checked"], ["database", "Database additions"], ["api", "Server code switched"], ["switch", "Screens switched"], ["health", "Health check on Live"], ["watch", "Watching Live"]],
    rollback: [["approval", "Your approval checked"], ["tests", "Automatic tests checked"], ["database", "Database checked"], ["api", "Server code switched back"], ["switch", "Screens switched back"], ["health", "Health check on Live"]],
  };
  var ACTIVITY = {
    release_recorded: ["push", function (a) { return "Version " + (a.detail.version || "") + " added on Staging"; }],
    release_report_saved: ["push", function () { return "ChatGPT test report saved"; }],
    release_marked_tested: ["push", function (a) { return "Marked " + (a.detail.version || "") + " as tested"; }],
    release_unmarked_tested: ["push", function (a) { return "Unmarked " + (a.detail.version || "") + " as tested"; }],
    release_approved: ["push", function (a) { return (a.detail.action === "rollback" ? "Go back approved: " : "Push approved: ") + (a.detail.version || ""); }],
    release_live: ["push", function (a) { return (a.detail.version || "") + " is live" + (a.detail.action === "rollback" ? " again (went back)" : ""); }],
    release_failed: ["push", function (a) { return (a.detail.version || "") + " did not go live. Live kept the version it had."; }],
    release_watch_passed: ["push", function (a) { return "Watch passed for " + (a.detail.version || ""); }],
    release_watch_stopped: ["back", function (a) { return "Watch of " + (a.detail.version || "") + " stopped for a go back"; }],
    release_auto_back: ["back", function (a) { return "Live went back to " + (a.detail.back_to || "the earlier version") + " by itself"; }],
    release_auto_back_failed: ["back", function (a) { return (a.detail.version || "") + " was unhealthy and going back by itself did not work"; }],
    release_code_sent: ["security", function (a) { return "Code sent for a " + (a.detail.action === "rollback" ? "go back" : "push"); }],
    release_password_wrong: ["security", function (a) { return "Wrong release password or code (" + (a.detail.attempts || 1) + " of 5)"; }],
    release_password_set: ["security", function () { return "Release password set"; }],
    release_password_changed: ["security", function () { return "Release password changed"; }],
    release_claim_refused: ["security", function (a) { return "GitHub's start was refused (" + (a.detail.reason || "") + ")"; }],
    release_setup_ticked: ["settings", function (a) { return "Live setup: " + a.object_id + (a.detail.done ? " ticked" : " unticked"); }],
    live_down: ["health", function () { return "Live stopped answering normally"; }],
    live_up: ["health", function () { return "Live is healthy again"; }],
    pause_on: ["pause", function (a) { return "Paused: " + a.object_id; }],
    pause_off: ["pause", function (a) { return "Turned back on: " + a.object_id; }],
    setting_changed: ["settings", function (a) { return "Setting changed: " + a.object_id; }],
    switch_changed: ["settings", function (a) { return "Switch changed: " + a.object_id; }],
    plan_approved: ["settings", function (a) { return "Plan version approved: " + a.object_id; }],
    plan_restored: ["settings", function (a) { return "Plan restored: " + a.object_id; }],
    staging_reset: ["settings", function () { return "Staging test data reset"; }],
  };
  var FILTERS = [["all", "All"], ["push", "Pushes"], ["back", "Go backs"], ["security", "Security"], ["health", "Health"], ["settings", "Settings"], ["pause", "Pauses"]];

  function controlTab(fresh) {
    if (controlTimer) { clearTimeout(controlTimer); controlTimer = null; }
    api.get("/admin/control" + (fresh ? "?check=1" : "")).then(function (r) {
      if (current !== "control") return;
      if (fresh || !ctl.data || !r.data.github) r.data.github = r.data.github || (ctl.data && ctl.data.github);
      ctl.data = r.data;
      drawControl();
      var d = r.data;
      var busy = d.releases.some(function (x) { return x.status === "approved" || x.status === "deploying" || x.watching; });
      // While you type a password or code the page holds still; it refreshes again once you finish or cancel
      if (!ctl.flow) controlTimer = setTimeout(function () { controlTab(false); }, busy ? 5000 : 60000);
    }).catch(fail);
  }

  function short(c) { return c ? String(c).slice(0, 7) : ""; }
  function versionOf(d, commit) {
    var hit = d.releases.filter(function (x) { return x.commit === commit; })[0];
    return hit ? hit.version : commit && commit.length === 40 ? "code " + short(commit) : commit || "None yet";
  }
  function ago(iso) {
    if (!iso) return "Never";
    var m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (isNaN(m)) return "";
    return m <= 0 ? "Just now" : m === 1 ? "1 minute ago" : m < 120 ? m + " minutes ago" : D.dateTime(iso);
  }
  function kv(label, value) { return h("div", null, h("span", { class: "muted small", text: label }), h("b", { text: String(value) })); }

  function envCards(d) {
    var s = d.here;
    var staging = h("div", { class: "card env" },
      h("div", { class: "row" }, h("h2", { class: "grow", text: "Staging" }), h("span", { class: "badge " + (s.worker_ok ? "C" : "bad"), text: s.worker_ok ? "Healthy" : "Worker stopped" })),
      h("p", { class: "muted small", text: "Test accounts only. Every version is tried here first." }),
      h("div", { class: "kv" }, kv("Version running", versionOf(d, s.code_version)), kv("Worker last ran", ago(s.worker_last_run)),
        kv("Problems, last 24 hours", s.problems_24h), kv("Paused areas", (s.paused || []).length ? s.paused.join(", ") : "None")));
    var L = d.live || {};
    var state, cls;
    if (!d.live_ref) { state = "Not set up yet"; cls = "O"; }
    else if (!L.checked_at) { state = "Checking soon"; cls = "O"; }
    else if (L.down) { state = "Not healthy"; cls = "bad"; }
    else if (L.ok) { state = "Healthy"; cls = "C"; }
    else if (!L.ever_ok) { state = "Waiting for your first push"; cls = "O"; }
    else { state = "Checking again"; cls = "O"; }
    var paused = L.paused && L.paused.length ? L.paused.join(", ") : L.paused_all ? "all" : "None";
    var live = h("div", { class: "card env" },
      h("div", { class: "row" }, h("h2", { class: "grow", text: "Live" }), h("span", { class: "badge " + cls, text: state })),
      h("p", { class: "muted small", text: "Members on the access list. Changes only when you push." }),
      h("div", { class: "kv" }, kv("Version running", L.code_version ? versionOf(d, L.code_version) : "None yet"), kv("Checked", L.checked_at ? ago(L.checked_at) : "Not yet"),
        kv("Problems, last 24 hours", L.problems_24h === undefined ? "Not known yet" : L.problems_24h), kv("Paused areas", paused)),
      L.error && !L.ok && L.ever_ok ? h("p", { class: "small", style: "color:var(--bad);margin-top:8px", text: "Last answer: " + L.error }) : null);
    return h("div", { class: "envs" }, staging, live);
  }

  function liveRelease(d) { return d.releases.filter(function (x) { return x.status === "live"; })[0] || null; }

  function nextRelease(d) {
    return d.releases.filter(function (x) { return ["candidate", "tested", "failed", "approved", "deploying"].indexOf(x.status) >= 0 || (x.status === "live" && x.watching); })[0] || null;
  }

  function pushBlockers(d, x) {
    var why = [];
    var running = d.releases.some(function (y) { return y.status === "approved" || y.status === "deploying"; });
    if (!d.password_set) why.push("Set your release password (below).");
    if (d.locked_until) why.push("Locked until " + D.dateTime(d.locked_until) + " after too many wrong tries.");
    if (x.status !== "tested") why.push("Tick that you tested it on Staging.");
    if (d.settings.require_report && !x.test_report) why.push("The ChatGPT test report is not saved yet. Send it to Claude.");
    if (running) why.push("Another push is running.");
    if (d.releases.some(function (y) { return y.watching; })) why.push("Live is still being watched after the last push.");
    if (!d.secrets.github_repo || !d.secrets.github_token || !d.secrets.ci_secret) why.push("GitHub is not connected for pushes yet (see Live setup).");
    return why;
  }

  function stepper(d, x) {
    var tested = ["tested", "approved", "deploying", "live"].indexOf(x.status) >= 0;
    var pushed = ["approved", "deploying", "live"].indexOf(x.status) >= 0;
    var left = x.watching ? Math.max(0, Math.ceil((new Date(x.watch_until).getTime() - Date.now()) / 60000)) : 0;
    var defs = [
      ["Built on Staging", D.date(x.created_at), true],
      ["Automatic tests passed", x.tests_url ? "Passed" : "Not yet", !!x.tests_url],
      ["ChatGPT report saved", x.test_report ? "Saved" : d.settings.require_report ? "Needed before a push" : "Optional", !!x.test_report],
      ["You marked it tested", tested ? D.date(x.tested_at) || "Done" : "Waiting on you", tested],
      ["Pushed with your password" + (d.settings.email_code ? " and code" : ""), pushed ? (x.approved_by || "Done") : "Not yet", pushed],
      ["Live and healthy", x.watching ? "Watching, " + left + (left === 1 ? " minute" : " minutes") + " left" : x.status === "live" ? "Done" : "Not yet", x.status === "live" && !x.watching],
    ];
    var firstOpen = -1;
    defs.forEach(function (s, i) { if (firstOpen < 0 && !s[2]) firstOpen = i; });
    return h("ol", { class: "steps", "aria-label": "Steps to Live" }, defs.map(function (s, i) {
      return h("li", { class: s[2] ? "done" : i === firstOpen ? "now" : "" }, h("i", { "aria-hidden": "true", text: s[2] ? "✓" : String(i + 1) }),
        h("div", { text: s[0] }), h("div", { class: "muted small", style: "font-weight:400", text: s[1] }));
    }));
  }

  function progress(x) {
    var plan = STEP_PLAN[x.action === "rollback" ? "rollback" : "push"];
    var seen = {};
    (x.steps || []).forEach(function (s) { seen[s.key] = s; });
    var doneCount = plan.filter(function (p) { return seen[p[0]] && !(p[0] === "watch" && x.watching); }).length;
    var running = x.status === "approved" || x.status === "deploying" || x.watching;
    var nowIdx = -1;
    plan.forEach(function (p, i) { if (nowIdx < 0 && (!seen[p[0]] || (p[0] === "watch" && x.watching))) nowIdx = i; });
    var title = x.status === "approved" ? "Waiting for GitHub to start" : x.status === "deploying" ? (x.action === "rollback" ? "Going back to " : "Pushing ") + x.version : x.watching ? "Live runs " + x.version + ". Watching it now." :
      x.watch_result === "went_back" ? "Live went back to " + (x.previous_version || "the earlier version") + " by itself" : x.status === "failed" ? x.version + " did not go live. Live kept the version it had." : "Live runs " + x.version;
    return h("div", { class: "flow", "aria-live": "polite" },
      h("h3", { text: title }),
      h("div", { class: "bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(plan.length), "aria-valuenow": String(doneCount) }, h("span", { style: "width:" + Math.round(doneCount / plan.length * 100) + "%" })),
      h("ul", { class: "list small" }, plan.map(function (p, i) {
        var s = seen[p[0]];
        var mark = s && !(p[0] === "watch" && x.watching) ? (s.ok === false ? "!" : "✓") : running && i === nowIdx ? "…" : "";
        return h("li", { class: "row", style: "padding:6px 0" }, h("span", { class: "tick" + (mark === "✓" ? " ok" : mark === "…" ? " now" : mark === "!" ? " bad" : ""), text: mark }), h("span", { text: s ? s.text : p[1] }));
      })),
      x.deploy_log ? h("details", null, h("summary", { class: "small", text: "Full push log" }), h("pre", { class: "small", style: "white-space:pre-wrap", text: x.deploy_log })) : null);
  }

  function flowPanel(d, x, action) {
    var f = ctl.flow;
    var lv = liveRelease(d);
    var title = action === "push" ? "Push " + x.version + " to Live" : "Go back to " + x.version;
    var text = action === "push" ? "Members on Live get this version when the push finishes. If anything fails, Live stays on " + (lv ? lv.version : "the version it has") + "." +
      (d.settings.watch_minutes > 0 ? " Live is then watched for " + d.settings.watch_minutes + " minutes and goes back by itself if it becomes unhealthy." : "")
      : "Live switches back to " + x.version + ". Member data added since then is kept.";
    var cancel = h("button", { class: "ghost", onclick: function () { ctl.flow = null; controlTab(false); } }, "Cancel");
    function start(code) {
      api.post(action === "push" ? "/admin/releases/push" : "/admin/releases/rollback", { release_id: x.id, password: f.pw, code: code || "" }).then(check).then(function (res) {
        ctl.flow = null;
        ok((action === "push" ? "Push started." : "Going back started.") + (res.waiting_setup ? " Your password alone was used, because email and text are not set up yet." : ""));
        controlTab(false);
      }).catch(function (e) {
        relFail(e);
        var code2 = e && e.message;
        if (code2 !== "wrong_code") { ctl.flow = null; controlTab(false); }
      });
    }
    var box = h("div", { class: "flow strong" }, h("h3", { text: title }), h("p", { class: "small", text: text }));
    if (f.stage === "password") {
      var pw = h("input", { type: "password", autocomplete: "off", "aria-label": "Release password", style: "width:100%;max-width:360px" });
      box.appendChild(h("label", { text: "Release password" }));
      box.appendChild(pw);
      box.appendChild(h("div", { class: "row", style: "margin-top:12px" }, h("button", { onclick: function () {
        f.pw = pw.value;
        pw.value = "";
        api.post("/admin/releases/code", { release_id: x.id, action: action, password: f.pw }).then(check).then(function (res) {
          if (res.code_needed) { f.stage = "code"; f.sent = res; drawControl(); } else start("");
        }).catch(function (e) { relFail(e); ctl.flow = null; controlTab(false); });
      } }, d.settings.email_code ? "Continue" : title), cancel));
      setTimeout(function () { pw.focus(); }, 0);
    } else {
      var where = [f.sent.email ? "your email (" + f.sent.email + ")" : "", f.sent.sms ? "your phone (" + f.sent.sms + ")" : ""].filter(Boolean).join(" and ");
      var codeIn = h("input", { inputmode: "numeric", autocomplete: "one-time-code", maxlength: "6", "aria-label": "6 digit code", style: "width:160px;font-size:22px;letter-spacing:.2em" });
      box.appendChild(h("p", { class: "small", text: "We sent a 6 digit code to " + where + ". It works once, for " + (f.sent.minutes || 10) + " minutes. It can take a minute to arrive." }));
      box.appendChild(h("label", { text: "Code" }));
      box.appendChild(codeIn);
      box.appendChild(h("div", { class: "row", style: "margin-top:12px" },
        h("button", { onclick: function () { start(codeIn.value.trim()); } }, title),
        h("button", { class: "ghost", onclick: function () {
          api.post("/admin/releases/code", { release_id: x.id, action: action, password: f.pw }).then(check).then(function (res) { f.sent = res; ok("New code sent"); drawControl(); }).catch(relFail);
        } }, "Send a new code"), cancel));
      setTimeout(function () { codeIn.focus(); }, 0);
    }
    return box;
  }

  function nextCard(d) {
    var x = nextRelease(d);
    if (!x) return h("div", { class: "card" }, h("h2", { text: "Next version" }), h("p", { class: "muted", text: "No new version is waiting. Claude adds each version here when it is ready on Staging." }));
    var lv = liveRelease(d);
    var added = lv ? x.migrations.filter(function (m) { return lv.migrations.indexOf(m) < 0; }) : x.migrations;
    var blockers = pushBlockers(d, x);
    var flowHere = ctl.flow && ctl.flow.id === x.id && ctl.flow.action === "push";
    var showProgress = ["approved", "deploying"].indexOf(x.status) >= 0 || x.watching || (x.steps && x.steps.length && (x.status === "failed" || x.status === "live"));
    var tested = h("input", { type: "checkbox", checked: ["tested", "approved", "deploying", "live"].indexOf(x.status) >= 0, disabled: !isOwner || ["candidate", "tested", "failed"].indexOf(x.status) < 0, "aria-label": "I tested " + x.version + " on Staging" });
    tested.addEventListener("change", function () {
      api.post("/admin/releases/tested", { release_id: x.id, tested: tested.checked }).then(check).then(function () { ok(tested.checked ? "Marked as tested" : "Unmarked"); controlTab(false); }).catch(relFail);
    });
    return h("div", { class: "card" },
      h("div", { class: "row" }, h("div", { class: "grow" }, h("div", { class: "eyebrow", style: "color:var(--brand)", text: "Next version" }), h("h2", { style: "font-size:24px;margin:2px 0 0", text: x.version })),
        h("span", { class: "badge " + (x.status === "live" ? "C" : x.status === "failed" ? "bad" : x.status === "tested" ? "G" : "O"), text: x.watching ? "Live, being watched" : RELEASE_STATUS[x.status] || x.status })),
      stepper(d, x),
      h("div", { class: "envs", style: "gap:10px" },
        h("div", { class: "soft" }, h("h3", { text: "What changes for members" }), h("p", { class: "small", text: x.notes || "No notes." })),
        h("div", { class: "soft" }, h("h3", { text: "Database changes" }), h("p", { class: "small", text: (added.length ? added.length + (added.length === 1 ? " addition" : " additions") + " (" + added.join(", ") + ")." : "Nothing new.") +
          (x.contract_migrations && x.contract_migrations.length ? " It also removes or renames something, so going back past this version will be blocked." : " Nothing removed or renamed, so going back stays safe.") })),
        h("div", { class: "soft" }, h("h3", { text: "Proof it works" }),
          h("p", { class: "small" }, x.tests_url ? h("a", { href: x.tests_url, target: "_blank", rel: "noopener" }, "Automatic tests: passed") : "Automatic tests: not yet", h("br"),
            x.test_report ? "ChatGPT test report: saved" : "ChatGPT test report: not saved yet"),
          x.test_report ? h("details", null, h("summary", { class: "small", text: "Read the test report" }), h("pre", { class: "small", style: "white-space:pre-wrap", text: x.test_report })) : null)),
      showProgress ? progress(x) : null,
      flowHere ? flowPanel(d, x, "push") : null,
      isOwner && !flowHere && ["candidate", "tested", "failed"].indexOf(x.status) >= 0 ? h("div", { style: "border-top:1px solid var(--line);margin-top:14px;padding-top:14px" },
        h("label", { class: "row", style: "font-weight:700;font-size:15px" }, tested, "I tested this version on Staging and it is ready"),
        h("div", { class: "row", style: "margin-top:10px" }, h("button", { class: "big", disabled: blockers.length > 0, onclick: function () { ctl.flow = { id: x.id, action: "push", stage: "password" }; drawControl(); } }, "Push to Live")),
        blockers.length ? h("ul", { class: "small muted", style: "margin:8px 0 0;padding-left:18px" }, blockers.map(function (b) { return h("li", { text: b }); })) : null) : null);
  }

  function historyCard(d) {
    var busy = d.releases.some(function (y) { return y.status === "approved" || y.status === "deploying"; });
    var flow = ctl.flow && ctl.flow.action === "rollback" ? d.releases.filter(function (y) { return y.id === ctl.flow.id; })[0] : null;
    return h("div", { class: "card", id: "history" },
      h("h2", { text: "Version history" }),
      h("p", { class: "muted small", text: "Every version, when it went Live, and a button to go back. Member data is always kept when you go back." }),
      flow ? flowPanel(d, flow, "rollback") : null,
      d.releases.length ? h("div", { class: "scroll" }, h("table", null,
        h("thead", null, h("tr", null, h("th", { text: "Version" }), h("th", { text: "Where it is" }), h("th", { text: "What changed" }), h("th", { text: "Going back" }), h("th", { text: "" }))),
        h("tbody", null, d.releases.map(function (x) {
          var target = x.status === "replaced" || x.status === "rolled_back";
          var compat = x.compatible || { ok: true };
          var badge = x.status === "live" ? "C" : x.status === "failed" ? "bad" : x.status === "tested" ? "G" : "O";
          return h("tr", null,
            h("td", null, h("strong", { text: x.version }), h("div", { class: "muted small", text: "code " + short(x.commit) })),
            h("td", null, h("span", { class: "badge " + badge, text: x.watching ? "Live, being watched" : x.watch_result === "went_back" ? "Went back by itself" : RELEASE_STATUS[x.status] || x.status }),
              h("div", { class: "muted small", text: x.live_at ? "Live " + D.dateTime(x.live_at) : "Added " + D.dateTime(x.created_at) })),
            h("td", { class: "small", text: x.notes }),
            h("td", { class: "small" }, target ? h("span", { style: "font-weight:700;color:" + (compat.ok ? "var(--ok)" : "var(--bad)"), text: compat.ok ? "Safe to go back" : "Blocked: a newer version changed the database in a way this version cannot work with (" + (compat.blocking || []).join(", ") + ")" }) : h("span", { class: "muted", text: x.status === "live" ? "This is Live now" : "" })),
            h("td", null, isOwner && target && compat.ok ? h("button", { class: "ghost small", disabled: busy || !!ctl.flow, onclick: function () { ctl.flow = { id: x.id, action: "rollback", stage: "password" }; drawControl(); } }, "Go back to this") : null,
              x.deploy_log ? h("details", null, h("summary", { class: "small", text: "Log" }), h("pre", { class: "small", style: "white-space:pre-wrap;max-width:320px", text: x.deploy_log })) : null));
        })))) : h("p", { class: "muted", text: "No versions yet." }));
  }

  function activityCard(d) {
    var rows = d.activity.map(function (a) {
      var m = ACTIVITY[a.action];
      var kind = m ? m[0] : a.action.indexOf("pause") === 0 ? "pause" : "settings";
      if (a.action === "release_approved" && a.detail.action === "rollback") kind = "back";
      if (a.action === "release_live" && a.detail.action === "rollback") kind = "back";
      return { kind: kind, text: m ? m[1](a) : a.action.split("_").join(" "), at: a.at, actor: a.actor };
    });
    var shown = rows.filter(function (r) { return ctl.filter === "all" || r.kind === ctl.filter; });
    return h("div", { class: "card" },
      h("h2", { text: "Activity" }), h("p", { class: "muted small", text: "From the audit log. Nobody can edit or delete these." }),
      h("div", { class: "pills", role: "group", "aria-label": "Show" }, FILTERS.map(function (f) {
        return h("button", { class: "small", "aria-pressed": String(ctl.filter === f[0]), onclick: function () { ctl.filter = f[0]; drawControl(); } }, f[1]);
      })),
      shown.length ? h("ul", { class: "list" }, shown.slice(0, ctl.more ? 60 : 12).map(function (r) {
        return h("li", { class: "row", style: "align-items:flex-start;flex-wrap:nowrap" }, h("span", { class: "dot k-" + r.kind, "aria-hidden": "true" }),
          h("div", null, h("div", { class: "small", style: "font-weight:700", text: r.text }), h("div", { class: "muted small", text: D.dateTime(r.at) + (r.actor ? " | " + r.actor : "") })));
      })) : h("p", { class: "muted small", style: "margin-top:10px", text: "Nothing here yet." }),
      h("div", { class: "row", style: "margin-top:10px" },
        shown.length > 12 && !ctl.more ? h("button", { class: "ghost small", onclick: function () { ctl.more = true; drawControl(); } }, "Show more") : null,
        h("button", { class: "ghost small", onclick: function () { go("audit"); } }, "Open the full audit log")));
  }

  function setupCard(d) {
    var gh = d.github || {};
    var L = d.live || {};
    var emailOk = d.settings.email_sender !== "log";
    var smsOk = d.settings.sms && !!d.settings.sms_to && d.sms_ready;
    var refIn = h("input", { value: d.live_ref, placeholder: "20 letters and numbers", "aria-label": "Live project ID", style: "width:240px" });
    var items = [
      [d.password_set, "Release password set", "Set it in the card below."],
      [d.secrets.github_repo && d.secrets.github_token && d.secrets.ci_secret, "Staging can start pushes", "In Supabase, Staging project, Edge Function secrets: GITHUB_REPO, GITHUB_DISPATCH_TOKEN and RELEASE_CI_SECRET (checklist step 15)."],
      [gh.token_ok === undefined ? null : gh.token_ok, "GitHub accepts the push token", gh.token_ok === undefined ? "Click Check again to test it." : "The token needs Actions: Read and write, for the lawfecta repo only."],
      [gh.env_ok === true ? true : d.setup.github_env ? true : gh.env_ok === false ? false : null, "GitHub environment named live, with its secrets and variables", "Checklist step 14.", "github_env"],
      [!!d.live_ref, "Live project ID entered", "The 20 letters and numbers in the dela-live Supabase address.", null, refIn],
      [L.ok === true, "Live answers Staging's health check", "Turns green after your first push. Live also needs the RELEASE_CI_SECRET secret (same value) so Staging can read its problem count."],
      [emailOk, "Email for codes and alerts", "Today emails are only recorded (email.sender is log). Codes start once email is set up."],
      [smsOk, "Text alerts", "Put your phone number in Settings (alerts.sms_to), and the Brevo key in Staging secrets as BREVO_API_KEY."],
      [!!d.setup.uptime, "Uptime monitor watching Staging and Live", "See the runbook, Monitoring.", "uptime"],
    ];
    var doneCount = items.filter(function (i) { return i[0] === true; }).length;
    return h("div", { class: "card" },
      h("div", { class: "row" }, h("h2", { class: "grow", text: "Live setup" }), h("span", { class: "badge " + (doneCount === items.length ? "C" : "O"), text: doneCount + " of " + items.length + " done" })),
      h("p", { class: "muted small", text: "Most lines check themselves. Tick the others when you have done them." }),
      h("ul", { class: "list" }, items.map(function (i) {
        var mark = i[0] === true ? "✓" : i[0] === null ? "?" : "";
        var extra = null;
        if (i[3] && isOwner) {
          var on = !!d.setup[i[3]];
          extra = h("button", { class: "ghost small", onclick: function () { api.post("/admin/control/setup", { item: i[3], done: !on }).then(check).then(function () { controlTab(false); }).catch(relFail); } }, on ? "Untick" : "I did this");
        }
        if (i[4] && isOwner) extra = h("div", { class: "row", style: "margin-top:6px" }, i[4], h("button", { class: "small", onclick: function () {
          var v = refIn.value.trim().toLowerCase();
          api.post("/admin/settings", { key: "live.project_ref", value: v, status: "C", reason: "Entered on Release Control" }).then(check).then(function () { ok("Saved. Staging checks Live within a minute."); controlTab(false); }).catch(relFail);
        } }, "Save"));
        return h("li", { class: "row", style: "align-items:flex-start;flex-wrap:nowrap" }, h("span", { class: "tick" + (mark === "✓" ? " ok" : ""), text: mark }),
          h("div", { class: "grow" }, h("div", { style: "font-weight:700", text: i[1] }), i[0] === true ? null : h("div", { class: "muted small", text: i[2] }), extra));
      })),
      h("button", { class: "ghost small", style: "margin-top:10px", onclick: function () { controlTab(true); } }, "Check again"));
  }

  function noticesFor(d) {
    var out = [];
    if (d.locked_until) out.push(h("div", { class: "notice bad", text: "Pushing is locked until " + D.dateTime(d.locked_until) + " after too many wrong passwords or codes. You were emailed." }));
    var L = d.live || {};
    if (L.down) out.push(h("div", { class: "notice bad", text: "Live is not answering normally. If members are affected, turn on the emergency pause in the Live admin area, or go back to an earlier version below." }));
    if (d.settings.email_code && d.settings.email_sender === "log" && !(d.settings.sms && d.settings.sms_to && d.sms_ready))
      out.push(h("div", { class: "notice", text: "Push codes are on, but email and text are not set up yet. Until they are, pushes use your release password alone. See Live setup." }));
    if (d.settings.sms && (!d.settings.sms_to || !d.sms_ready))
      out.push(h("div", { class: "notice", text: "Text alerts are on, but " + (!d.settings.sms_to ? "your phone number is not saved yet" : "the Brevo key is not in Staging secrets yet") + ". Alerts go by email until then." }));
    return out;
  }

  function passwordCard(d) {
    if (!isOwner) return null;
    var cur = h("input", { type: "password", autocomplete: "off", "aria-label": "Current release password" });
    var nw = h("input", { type: "password", autocomplete: "new-password", "aria-label": "New release password" });
    var nw2 = h("input", { type: "password", autocomplete: "new-password", "aria-label": "Repeat new release password" });
    return h("div", { class: "card" }, h("h2", { text: d.password_set ? "Change your release password" : "Set your release password" }),
      h("p", { class: "muted small", text: "Only you push to Live, and every push asks for this password. Use at least 12 characters. Do not share it, and never paste it in chat. Five wrong tries lock pushing for 30 minutes." }),
      d.password_set ? [h("label", { text: "Current password" }), cur] : null,
      h("label", { text: "New password" }), nw, h("label", { text: "Repeat new password" }), nw2,
      h("div", { style: "margin-top:10px" }, h("button", { onclick: function () {
        if (nw.value !== nw2.value) { D.toast(app, "The two new passwords do not match.", true); return; }
        api.post("/admin/releases/password", { current: cur.value, password: nw.value }).then(check).then(function () { cur.value = nw.value = nw2.value = ""; ok("Release password saved"); controlTab(false); }).catch(relFail);
      } }, "Save password")));
  }

  function resetCard() {
    return ownerOnly(h("div", { class: "card" }, h("h2", { text: "Reset Staging test data" }),
      h("p", { class: "muted small", text: "Clears test activity on Staging: allowances used, notices, background jobs, holds and other people's sign ins. Keeps people, the team, the access list, settings, plans and versions. Live is never touched." }),
      h("button", { class: "ghost", onclick: function () {
        var t = prompt("Type RESET to clear Staging test activity.");
        if (t !== "RESET") return;
        api.post("/admin/staging/reset", { confirm: "RESET" }).then(check).then(function () { ok("Staging test activity cleared"); }).catch(relFail);
      } }, "Reset Staging test data")));
  }

  function drawControl() {
    var d = ctl.data;
    if (!d) return;
    if (d.environment === "live") {
      var s = d.here;
      var lv = liveRelease(d);
      body(h("div", null, h("h1", { text: "Release Control" }),
        h("div", { class: "card" }, h("p", { text: "This is the Live copy. New versions reach Live only when the owner pushes them from the Staging admin area, with the release password and code." }),
          h("div", { class: "kv" }, kv("Code running", short(s.code_version) || "None"), kv("Worker last ran", ago(s.worker_last_run)), kv("Problems, last 24 hours", s.problems_24h), kv("Paused areas", s.paused.length ? s.paused.join(", ") : "None")),
          lv ? h("p", { class: "muted small", style: "margin-top:10px", text: "Live now: " + lv.version }) : null),
        activityCard(d)));
      return;
    }
    var pauseNote = h("div", { class: "card" }, h("h2", { text: "Emergency pause on Live" }),
      h("p", { class: "small", text: "Paused on Live now: " + ((d.live || {}).paused && d.live.paused.length ? d.live.paused.join(", ") : "nothing") + "." }),
      h("p", { class: "muted small", text: "To pause Live, open the Live admin area, Overview tab, Emergency pause. It works at once, with no push." }));
    body(h("div", null,
      h("h1", { text: "Release Control" }),
      h("p", { class: "muted", text: "Everything between Staging and Live in one place. Only you can push or go back, with your release password" + (d.settings.email_code ? " and a code sent to you." : ".") }),
      noticesFor(d),
      envCards(d),
      nextCard(d),
      historyCard(d),
      h("div", { class: "envs", style: "align-items:start" }, activityCard(d), h("div", null, setupCard(d), pauseNote)),
      passwordCard(d),
      resetCard()));
  }

  frame();
  go("control");
})();
