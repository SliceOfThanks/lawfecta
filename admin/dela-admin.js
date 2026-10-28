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
  var TABS = [["control", "Release Control"], ["guide", "Guide"], ["overview", "Overview"], ["access", "Access list"], ["people", "People"], ["plans", "Plans"], ["settings", "Settings"],
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
      h("h1", { text: "Lawfecta Team only" }), h("p", { class: "muted", text: "This page is for the Lawfecta Team. Log in with a Lawfecta Team account." }),
      // Test accounts share look-alike addresses, so say plainly which account this browser is signed in with
      me.person ? h("p", { class: "notice", style: "text-align:left", text: "You are signed in as " + (me.person.name || "a member") + (me.person.email ? " (" + me.person.email + ")" : "") + ", BD member " + me.person.bd_member_id + ". To use the admin area, log out of the website and log in with your Lawfecta Team account." }) : null)));
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
    ({ control: function () { controlTab(true); }, guide: guide, overview: overview, access: access, people: people, plans: plans, settings: settings, switches: switches, team: team, holds: holds, audit: audit, jobs: jobs })[tab]();
  }

  // ---------- Guide ----------
  // A plain-words manual for someone who has never seen DELA's admin area. Text only, nothing loads from the server.
  // Each section is a list of blocks: p (paragraph), note (highlighted tip), flow (path picture), steps (numbered),
  // terms (name and meaning), two (side by side boxes).
  var GUIDE = [
    ["g_start", "Start here", "What this admin area is and how to read it", [
      { p: "DELA is the part of Lawfecta where solo attorneys hand work to freelance paralegals. This admin area is where the Lawfecta Team runs it: who can use DELA, plans and prices, which features are on, and sending new versions to members." },
      { terms: [
        ["Two copies", "There are two copies of DELA, Staging (practice) and Live (real members). The badge at the top, next to DELA Admin, always says which one you are in."],
        ["The ? buttons", "Click a ? next to a title or number to see what it means. Click it again to close it."],
        ["Show and Hide", "Long sections fold. Click Show to open one and Hide to close it. This browser remembers your choice."],
      ] },
      { note: "New here? Read Staging and Live, then How a version gets to Live, before you change anything." },
    ]],
    ["g_copies", "Staging and Live", "The two copies of DELA and why there are two", [
      { two: [
        ["Staging", "stage", ["The practice copy.", "Used by the Lawfecta Team and test accounts only.", "Every new version runs here first.", "Claude builds and changes things here."]],
        ["Live", "live", ["The real copy.", "Used by real members.", "Changes only when you push a tested version.", "Claude never changes Live."]],
      ] },
      { p: "Each copy has its own database. Nothing typed on Staging ever shows up for real members. If a new version has a problem, it shows up on Staging, where nobody real is affected." },
      { terms: [["Test accounts", "Accounts on the Staging test account list (Access list tab) are sent to Staging even when they open DELA on the normal website. That is how testers try new versions safely."]] },
    ]],
    ["g_push", "How a version gets to Live", "The six steps, from Claude's build to members", [
      { flow: ["Built on Staging", "Automatic tests", "Your ChatGPT test", "You mark it tested", "Push to Live", "15 minute watch"] },
      { steps: [
        ["Built on Staging", "Claude builds the change and switches Staging to it. It appears at the top of Release Control as Ready to test."],
        ["Automatic tests", "GitHub runs every automatic test on that exact code. The step turns green only when all of them pass."],
        ["Your ChatGPT test", "Claude gives you one test prompt. Paste it into ChatGPT and test Staging with it. Send ChatGPT's report to Claude, who saves it with the version."],
        ["You mark it tested", "On Release Control, tick \"I tested this version on Staging and it is ready\"."],
        ["Push to Live", "Click Push to Live, enter your release password, then the 6 digit code sent to you. The button stays grey until steps 1 to 4 are done, and says what is missing."],
        ["15 minute watch", "Release Control shows each part of the push as it happens. Live is then checked every minute for 15 minutes. If all is well, the version shows as Live now."],
      ] },
    ]],
    ["g_moves", "What a push moves", "What goes to Live and what stays where it is", [
      { two: [
        ["Moves to Live", "ok", ["New screens.", "New server code.", "New database parts the version needs, such as a new table. These only add; nothing members saved is removed or changed."]],
        ["Stays on its own copy", "soft", ["Everything people did or entered: accounts, projects, messages, the audit log.", "Settings, plans, prices and switches.", "The access list and test accounts."]],
      ] },
      { note: "A push never copies data from Staging to Live. A price you change on Staging changes Staging only. To change it for real members, open the admin area on Live (the badge says Live) and make the same change there." },
      { p: "A brand new setting that comes with a version arrives on Live with its starting value. If it is still Open or Suggested, decide it on Live before you switch that feature on." },
    ]],
    ["g_back", "Going back", "Returning Live to an earlier version", [
      { steps: [
        ["Open History", "On Release Control, open the History section."],
        ["Pick the version", "Find the earlier version marked Was live before and click Go back to this."],
        ["Confirm", "Enter your release password and the code. It takes a few minutes."],
      ] },
      { p: "Going back changes the code only. Members keep everything they saved. If a version had a change that cannot be undone, History says so and going back past it is blocked." },
      { note: "During the 15 minute watch after a push, if Live becomes unhealthy, DELA goes back to the previous version by itself and alerts you." },
    ]],
    ["g_wrong", "When something goes wrong", "Pause, alerts and where to look", [
      { terms: [
        ["Emergency pause", "On the Live Overview tab, pause all of DELA or one part (for example payments or AI help) in one click, with no push. Members see a short message. The Lawfecta Team keeps access. Turn it off the same way."],
        ["Alerts", "You get an email (and a text, once texts are set up) when Live fails 3 health checks in a row, when a push fails, when DELA goes back by itself, and after 5 wrong release passwords."],
        ["Problems count", "Problems, last 24 hours on Release Control should be 0. If not, open the Jobs tab to see what failed and tell Claude."],
      ] },
      { note: "When in doubt, pause first, then tell Claude. A pause is safe and quick to undo." },
    ]],
    ["g_tabs", "Every tab", "What each tab at the top is for", [
      { terms: [
        ["Release Control", "Where versions go from Staging to Live: both copies, the next version and its steps, Push to Live, history, activity and one-time setup."],
        ["Guide", "This page."],
        ["Overview", "A quick picture of this copy: people using it, who was turned away, open decisions, paused parts, the emergency pause and a test notice button."],
        ["Access list", "Who may open DELA while it is not open to everyone, added by BD member ID. The second list holds test accounts that Live sends to Staging."],
        ["People", "Everyone who has opened DELA, with their side (attorney or freelancer) and plan. Give someone a plan for testing, or place a hold."],
        ["Plans", "The eight plans, four per side, with price, fee and limits. Changes start as a draft and apply only when you approve them."],
        ["Settings", "Every business number (fees, minimums, deadlines, limits), grouped by topic. Each change keeps the old value, records why, and can be undone."],
        ["Switches", "Features stay off until you switch them on: Lawfecta Team only first, then Access list, then Everyone."],
        ["Lawfecta Team", "The people who run DELA and their roles: owner, reviewer, support, finance."],
        ["Holds", "Pause new actions for one person while you check something, then release with a note."],
        ["Audit log", "Every sign in, refusal and change, with who and when. Nobody can edit or delete it."],
        ["Jobs", "Background work DELA does every minute, such as emails and reminders, and anything that failed and why."],
      ] },
    ]],
    ["g_who", "Who does what", "Claude, GitHub, you, and the services behind DELA", [
      { terms: [
        ["Claude", "Builds and tests every change, puts it on Staging, writes the notes for each version and the ChatGPT test prompt. Never touches Live."],
        ["GitHub", "Stores the code, runs the automatic tests, and does the push to Live after you approve it."],
        ["You (owner)", "Test with ChatGPT, mark versions tested, push to Live, go back if needed, and make the business decisions on Live."],
        ["Brilliant Directories", "The website, member accounts and logins. DELA sits inside BD pages and never sees BD passwords."],
        ["Supabase", "Where DELA's data and server code live. Staging and Live are two separate Supabase projects."],
      ] },
    ]],
    ["g_words", "Words you will see", "Short meanings for the terms on these pages", [
      { terms: [
        ["Version", "A numbered release of DELA, such as 0.2.0."],
        ["Commit", "The 7 character code GitHub gives saved code, such as 5c6f529. Each version points to one commit."],
        ["Database change", "A new part added to the database, such as a new table. DELA only adds; it never removes what members saved."],
        ["Worker", "DELA's background helper. It runs every minute to send emails, reminders and checks."],
        ["Release password", "Your private password for pushes and go backs. Keep it in your password manager. Never paste it in a chat."],
        ["Code", "The 6 digit number sent to you for each push. It works once, for a few minutes."],
        ["Watch", "The 15 minutes after a push when Live is checked every minute and sent back by itself if it fails."],
        ["Confirmed", "A business number you approved."],
        ["Suggested", "Claude's suggestion, waiting for your yes."],
        ["Open", "Not decided yet. DELA uses a safe default."],
      ] },
    ]],
  ];

  function guideBlock(b) {
    if (b.p) return h("p", { class: "gd-p", text: b.p });
    if (b.note) return h("div", { class: "notice gd-note", text: b.note });
    if (b.flow) return h("ol", { class: "gd-flow", "aria-label": "The path to Live" }, b.flow.map(function (t, i) {
      return h("li", null, h("i", { "aria-hidden": "true", text: String(i + 1) }), h("span", { text: t }));
    }));
    if (b.steps) return h("ol", { class: "gd-steps" }, b.steps.map(function (s, i) {
      return h("li", null, h("i", { "aria-hidden": "true", text: String(i + 1) }), h("div", null, h("b", { text: s[0] }), h("span", { text: s[1] })));
    }));
    if (b.terms) return h("dl", { class: "gd-terms" }, b.terms.map(function (t) {
      return h("div", null, h("dt", { text: t[0] }), h("dd", { text: t[1] }));
    }));
    if (b.two) return h("div", { class: "gd-two" }, b.two.map(function (c) {
      return h("div", { class: "gd-box " + c[1] }, h("h3", { text: c[0] }), h("ul", null, c[2].map(function (t) { return h("li", { text: t }); })));
    }));
    return null;
  }

  function guide() {
    var jump = function (id) {
      var sec = mainEl.querySelector("#sec-" + id);
      if (sec && sec.hidden) sec.parentElement.querySelector("button[aria-controls]").click();
      mainEl.querySelector("#" + id).scrollIntoView({ behavior: "smooth", block: "start" });
    };
    body(h("div", null, pageHead("Guide", "guide"),
      h("p", { class: "muted", text: "How the DELA admin area works, for anyone new to it. Pick a topic, or open a section below." }),
      h("div", { class: "card" }, h("h2", { text: "On this page" }), h("ol", { class: "gd-toc" }, GUIDE.map(function (g) {
        return h("li", null, h("button", { class: "linkish", type: "button", onclick: function () { jump(g[0]); } }, g[1]), h("span", { class: "muted small", text: g[2] }));
      }))),
      GUIDE.map(function (g, i) {
        return section(g[0], g[1], null, i === 0, null, h("div", { class: "gd" }, h("p", { class: "muted small gd-sub", text: g[2] }), g[3].map(guideBlock)));
      })));
  }

  // ---------- Overview ----------

  function overview() {
    api.get("/admin/overview").then(function (r) {
      var d = r.data;
      var stat = function (label, n, note, key) {
        var t = tipPair(key);
        return h("div", { class: "tile col" }, h("div", { class: "muted small" }, label, t[0] ? " " : null, t[0]), h("div", { class: "stat", text: String(n) }), note ? h("div", { class: "muted small", text: note }) : null, t[1]);
      };
      var dec = d.decisions || {};
      body(h("div", null,
        pageHead("Overview", "ov"),
        h("p", { class: "muted", text: d.access_mode === "everyone" ? "DELA is open to every member with a linked plan." : "DELA is open only to people on the access list and the Lawfecta Team." }),
        h("div", { class: "grid" },
          stat("People who opened DELA", d.people, d.signed_in_7d + " in the last 7 days", "ov_people"),
          stat("On the access list", d.access_list, null, "ov_access"),
          stat("Staging test accounts", d.staging_testers, null, "ov_testers"),
          stat("Turned away (7 days)", d.denied_7d, "Not on the access list", "ov_denied"),
          stat("Decisions to make", (dec.O || 0) + (dec.R || 0), (dec.O || 0) + " open, " + (dec.R || 0) + " suggested, " + (dec.G || 0) + " need a gate", "ov_decisions"),
          stat("Plans not linked to BD", d.unmapped_plans, "Link them on the Plans tab", "ov_unmapped"),
          stat("Switches on", d.switches_on, null, "ov_switches"),
          stat("Active holds", d.holds_active, null, "ov_holds")),
        emergencyCard(),
        h("div", { class: "card" }, titled("h2", "Check notices", "ov_notices"),
          h("p", { class: "muted small", text: "Sends a test notice to you. Email uses the service in the email.sender setting (log means it is recorded, not sent)." }),
          h("div", { class: "row" },
            h("button", { onclick: function () { api.post("/admin/test-notification", { email: false }).then(check).then(function () { ok("Test notice sent. Open the member view to see it."); }).catch(fail); } }, "Send an in-app notice"),
            h("button", { class: "ghost", onclick: function () { api.post("/admin/test-notification", { email: true }).then(check).then(function () { ok("Test email queued. The worker sends it within a minute."); }).catch(fail); } }, "Send a test email"))),
        section("ov_recent", "Recent activity", "ov_recent", true, null,
          h("ul", { class: "list" }, d.recent.map(function (a) { return h("li", { class: "small" }, h("strong", { text: a.action.split("_").join(" ") }), " by " + a.actor + " ", h("span", { class: "muted", text: D.dateTime(a.at) })); })))));
    }).catch(fail);
  }

  // ---------- Emergency pause (no push needed; members see a short message, the team keeps working) ----------

  var PAUSE_AREAS = [["all", "All of DELA"], ["ai", "AI help"], ["checkout", "New payments"], ["payouts", "Payouts"], ["renewals", "Monthly renewals"], ["external", "Outside connections"], ["email", "Emails"]];
  function emergencyCard() {
    var box = h("div", { class: "card" }, titled("h2", "Emergency pause", "ov_pause"), h("p", { class: "muted small", text: "Loading..." }));
    api.get("/admin/pause").then(function (r) {
      var p = r.data.pause || {};
      D.clear(box);
      titled("h2", "Emergency pause", "ov_pause").forEach(function (n) { if (n) box.appendChild(n); });
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
        pageHead("Access list", "acc"),
        h("p", { class: "muted", text: "Find a member's ID in BD admin under Members. The Lawfecta Team can always open DELA." }),
        ownerOnly(h("div", { class: "card" }, titled("h2", "Add someone", "acc_add"), h("div", { class: "row", style: "margin-top:8px" }, idIn, noteIn, chIn,
          h("button", { onclick: function () {
            api.post("/admin/access/grant", { bd_member_id: idIn.value, channel: chIn.value, note: noteIn.value }).then(check).then(function (d) { ok(d.duplicate ? "Already on that list" : "Added"); access(); }).catch(fail);
          } }, "Add")))),
        section("acc_list", "May open DELA", "acc_list", true, h("span", { class: "badge", text: String(rows.filter(function (a) { return a.channel === "access"; }).length) }), list("access")),
        section("acc_staging", "Staging test accounts", "acc_staging", true, h("span", { class: "badge", text: String(rows.filter(function (a) { return a.channel === "staging_tester"; }).length) }),
          [h("p", { class: "muted small", style: "margin-top:8px", text: "These accounts load the Staging copy with test data and Stripe test mode. Add them on the Live admin area. On Staging, add them to the access list too." }), list("staging_tester")])));
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
        pageHead("People", "people"),
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
      var sideCard = function (side) {
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
        return section("plans_" + side, D.SIDE[side] + " plans", "plans_side", true, null, h("div", { class: "scroll", style: "margin-top:8px" }, h("table", null, h("thead", null, head), h("tbody", null, rows))));
      };
      body(h("div", null, pageHead("Plans", "plans"),
        h("p", { class: "muted", text: "Attorneys and freelancers have separate plans. Each side pays its own fee. Edits are saved as a draft; approving the draft applies it to everyone on that plan right away, and the old version is kept on record." }),
        sideCard("attorney"), sideCard("freelancer")));
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
        h("label", null, "Platform fee this side pays (percent of the project price) ", tipPair("plan_fee")[0]), fee,
        h("p", { class: "muted small", text: "The minimum fee per side is a separate setting (fees.floor_cents_per_party), on the Settings tab." }),
        h("label", { text: "Note" }), note),
      h("div", { class: "card scroll" }, titled("h2", "Limits", "plan_limits"), h("p", { class: "muted small", text: "Leave a limit empty for no cap. Untick to leave it out of the plan." }),
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
      h("div", { class: "card", id: "plan-history" }, titled("h2", "Earlier versions", "plan_history"), h("p", { class: "muted small", text: "Bring back an earlier version's prices and limits. It comes back as a new version, and needs your release password." }),
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
      h("div", { class: "card" }, titled("h2", "Link to a BD plan", "plan_link"),
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
      body(h("div", null, pageHead("Settings and decisions", "settings"),
        h("p", { class: "muted", text: "Every business number DELA uses. Changing one saves the old value in its history and records your decision. Marking it Confirmed means you approved it." }),
        h("p", { class: "small" }, "What Confirmed, Suggested, Open and Needs a gate mean ", tipPair("settings_status")[0], tipPair("settings_status")[1]),
        order.map(function (g, i) {
          return section("set_" + g.toLowerCase().split(" ").join("_"), g, "settings_group", i === 0, h("span", { class: "badge", text: groups[g].length + " settings" }),
            h("div", { class: "scroll", style: "margin-top:8px" }, h("table", null, h("tbody", null, groups[g].map(settingRow)))));
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
      body(h("div", null, pageHead("Switches", "switches"),
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
      body(h("div", null, pageHead("Lawfecta Team", "team"),
        h("p", { class: "muted", text: "Team members can open DELA and this admin area. Only owners can change settings, plans and switches. A person must open DELA once before they can be added." }),
        ownerOnly(h("div", { class: "card" }, titled("h2", "Add a team member", "team_add"), h("div", { class: "row", style: "margin-top:8px" }, idIn, roleIn,
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
      body(h("div", null, pageHead("Holds", "holds"),
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
      body(h("div", null, pageHead("Audit log", "audit"), h("p", { class: "muted", text: "Every sign in, refusal and change. Entries can never be edited or deleted." }),
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
      body(h("div", null, pageHead("Jobs", "jobs"), h("p", { class: "muted", text: "Background work such as emails and reminders. The worker runs every minute and retries problems with growing waits." }),
        h("div", { class: "grid" }, Object.keys(c).map(function (k) {
          var t = tipPair("job_" + k);
          return h("div", { class: "tile col" }, h("div", { class: "muted small" }, k, t[0] ? " " : null, t[0]), h("div", { class: "stat", text: String(c[k]) }), t[1]);
        })),
        h("div", { class: "card scroll" }, titled("h2", "Problems", "jobs_problems"), r.data.recent_problems.length ? h("table", null, h("tbody", null, r.data.recent_problems.map(function (j) {
          return h("tr", null, h("td", { text: j.kind }), h("td", { text: j.status }), h("td", { text: "Tries: " + j.attempts }), h("td", { class: "small", text: j.last_error }), h("td", { text: D.dateTime(j.updated_at) }));
        }))) : h("p", { class: "muted", text: "No problems." }))));
    }).catch(fail);
  }

  // ---------- Release Control (Staging to Live, owner only, with the release password and a code) ----------

  var controlTimer = null;
  var ctl = { filter: "all", flow: null, data: null, more: false, tips: {}, open: loadOpen() };
  // Which sections are open is remembered in this browser only (it is a convenience, never needed)
  function loadOpen() { try { return JSON.parse(localStorage.getItem("dela.control.open") || "{}") || {}; } catch (e) { return {}; } }
  function saveOpen() { try { localStorage.setItem("dela.control.open", JSON.stringify(ctl.open)); } catch (e) { /* private window */ } }
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
  // Plain-language help behind every "?" on Release Control: what it is, and what it tells you
  var HELP = {
    guide: "A plain-words manual: the two copies of DELA, how a version gets to Live, what a push moves, going back, and what every tab is for.",
    staging: "Staging is DELA's test copy. Only you and the test accounts use it. Every new version runs here first, so problems show up here before members ever see them.",
    staging_health: "Healthy means Staging's database answers and its background helper ran in the last 10 minutes. Worker stopped means scheduled work (emails, reminders, checking Live) is not running. Tell Claude.",
    version_running: "The version this copy is running right now. On Staging it should be the version you are testing. \"code\" plus 7 letters means a build that was not recorded as a version.",
    worker: "DELA's background helper runs every minute. It sends emails and reminders, writes the daily summary and checks Live. More than 10 minutes ago means something is stuck.",
    problems: "Emails that failed for good, plus background jobs that gave up after all their retries, in the last 24 hours. 0 is the goal. Any other number: open the Jobs tab to see what failed, or ask Claude.",
    paused: "Parts of DELA switched off with the emergency pause, for example AI help or payouts. None is normal.",
    live: "Live is the copy real members use. It changes only when you push a tested version from this page. Staging checks on Live every minute.",
    live_health: "Healthy: Live answered normally. Not healthy: 3 checks in a row failed, and you were alerted. Waiting for your first push: Live exists but has no DELA code yet. Not set up yet: the Live project ID is not entered (see Live setup).",
    live_checked: "When Staging last asked Live how it is doing. It asks every minute.",
    next: "The newest version waiting to go Live, and how far it has come. A green tick is done. The pink step is the next thing to do.",
    steps: "1 Built on Staging: Claude made it and put it here. 2 Automatic tests: GitHub ran every test and they passed. 3 ChatGPT report: your ChatGPT test results are saved with it. 4 You marked it tested: your yes. 5 Pushed: you entered your release password and code. 6 Live and healthy: Live runs it and passed its watch after the push.",
    changes: "What members will notice in this version, in plain words, written by Claude.",
    db: "Database changes that come with this version. DELA only adds to the database, so member data is kept and going back to an earlier version stays possible. If a version ever removes or renames something, it says so here, and going back past it is blocked.",
    proof: "Evidence this version works: the automatic test run on GitHub (click to open it) and the ChatGPT test report from your testing.",
    push: "Push to Live sends this version to members. The button works only when every item listed under it is done. You enter your release password, then the 6 digit code sent to you (once email is set up).",
    progress: "Each step of the push, in order, as GitHub does it. If a step fails, Live stays on the version it had. After a push, Live is watched for 15 minutes and goes back by itself if it becomes unhealthy.",
    history: "Every version, newest first. Ready to test and Tested on Staging: not on Live yet. Live now: what members use. Was live before: you can go back to it. Did not go live: the push stopped and Live kept its version. Safe to go back: DELA can return to it with no data lost.",
    activity: "Everything important about releases, from the audit log, newest first. Nobody can edit or delete these. Dot colors: green pushes, blue go backs, red security (wrong passwords, codes), pink Live health, amber settings, burgundy pauses. Use the buttons to show one kind.",
    setup: "One-time steps before your first push to Live. Most lines check themselves when you click Check again. A ? means it could not be checked from here, so tick it yourself when it is done.",
    pause: "The emergency pause switches off all of DELA, or one part, on Live at once, with no push. You and the Lawfecta Team keep access. You turn it on in the Live admin area.",
    password: "Your release password is asked for every push and every go back. At least 12 characters, kept in your password manager, never pasted in chat. Five wrong tries lock pushing for 30 minutes and email you.",
    reset: "Clears test activity on Staging so you can test again from a clean start. People, plans, settings and versions stay. Live is never touched.",
    ov: "A quick picture of this copy of DELA (Staging or Live, shown in the badge at the top): who is using it, what is waiting on a decision, and anything paused or on hold.",
    ov_people: "Everyone who has opened DELA at least once on this copy, and how many of them came back in the last 7 days.",
    ov_access: "Members you have let into DELA. Everyone else sees a 'not open yet' message. The Lawfecta Team can always get in.",
    ov_testers: "Test accounts that the Live copy sends over to Staging, so testing never touches real data.",
    ov_denied: "Members who tried to open DELA in the last 7 days but are not on the access list. A rising number can mean word is spreading before you open DELA.",
    ov_decisions: "Business numbers still marked Open or Suggested in Settings. Open: no decision yet. Suggested: Claude's suggestion waiting for your yes. Needs a gate: only switch on after a check, such as a lawyer review.",
    ov_unmapped: "DELA plans not yet linked to a BD membership plan. Until linked, members only get those plans if you give them one on the People tab. Linking happens at launch.",
    ov_switches: "Features turned on for anyone (team only, access list, or everyone). Built features stay off until you switch them on.",
    ov_holds: "People with an active hold: their new actions are paused while you check something. Their records stay readable.",
    ov_notices: "Sends a test notice to you, to check that in-app notices and emails work. Email goes through the service named in the email.sender setting.",
    ov_recent: "The latest sign ins, refusals and changes on this copy. The full list is on the Audit log tab.",
    ov_pause: "Stops all of DELA, or one part, at once, with no push. Members see a short message. The Lawfecta Team keeps working. You get an email each time it is turned on or off.",
    acc: "Who may open DELA on this copy. While DELA is in testing, only people on this list (and the Lawfecta Team) can get in. Removing someone signs them out at once.",
    acc_add: "Add a member by their BD member ID (BD admin, Members). Choose the access list to let them in, or Staging test account so Live sends them to Staging.",
    acc_list: "Members who may open this copy of DELA. Each line shows when they were added and why.",
    acc_staging: "Accounts used for testing. On Live, being on this list sends them to Staging. On Staging, they also need to be on the access list above.",
    people: "Everyone who has opened DELA, with their sides (attorney, freelancer) and plans. You can give a side and plan here for testing, or place a hold.",
    plans: "The eight DELA plans, four per side. Attorneys and freelancers have separate prices, fees and limits. A change is saved as a draft and applies only when you approve it. Old versions are kept.",
    plans_side: "Each column is a plan. Rows show the price, the platform fee this side pays, the BD plan it is linked to, how many members are on it, and every limit. 'No cap' means unlimited.",
    plan_limits: "How much of each feature this plan includes. Empty means no cap. Untick to leave a feature out of the plan.",
    plan_history: "Earlier approved versions of this plan. Restore brings one back as a new version (needs your release password), so nothing is lost.",
    plan_link: "The BD membership plan ID that gives members this DELA plan. Find it in BD admin under Membership Plans. Left empty until launch.",
    plan_fee: "The percent of each project price this side pays to Lawfecta. Each side pays its own fee. The minimum fee per side is a separate setting (fees.floor_cents_per_party).",
    settings: "Every business number DELA uses, grouped by topic. Changing one keeps the old value in its history, records your decision, and can be undone. Click Change on a line to edit it or see its history.",
    settings_status: "Confirmed: you approved it. Suggested: Claude's suggestion, waiting for your yes. Open: not decided yet; DELA uses a safe default. Needs a gate: only turn on after a check, such as a lawyer review.",
    settings_group: "Click Show to see the settings in this group. Each line has its key, where the number came from, its value and its status.",
    switches: "Built features stay off until you switch them on. Off: nobody. Lawfecta Team only: you test it first. Access list: testers and early members. Everyone: all members with a plan.",
    team: "People who run DELA. Owner: everything, including pushes. Reviewer: checks attorneys and milestones. Support: access list, holds, jobs. Finance: payments and holds.",
    team_add: "Add a team member by BD member ID and role. They must have opened DELA once first.",
    holds: "A hold pauses new actions for one person (and later hiring and payments) while you check something. Release it with a note on what you checked.",
    audit: "Every sign in, refusal and change, newest first, with who did it. Nobody can edit or delete these lines, so it is the record if anything is ever questioned.",
    jobs: "Background work DELA does on its own, such as sending emails, reminders and the daily summary. It runs every minute and retries problems with longer waits.",
    jobs_problems: "Jobs that are waiting to retry (delayed), failed for good (dead) or failed once. The last error says why. Dead jobs count in Problems, last 24 hours on Release Control.",
    job_queued: "Waiting for the next minute's run.",
    job_running: "Being done right now.",
    job_succeeded: "Done.",
    job_delayed: "Failed and will try again later, with a longer wait each time.",
    job_dead: "Failed every try and stopped. Look at Problems below, or ask Claude.",
    job_canceled: "Stopped on purpose, for example an email that could not be sent and should not be retried.",
  };

  // A page title with its "?" (each admin tab)
  function pageHead(title, key) {
    var t = tipPair(key);
    return [h("div", { class: "row", style: "margin:18px 0 4px" }, h("h1", { style: "margin:0" }, title, t[0] ? " " : null, t[0])), t[1]];
  }

  // A "?" button and the help box it opens. The box stays open across the page's own refreshes.
  function tipPair(key) {
    if (!HELP[key]) return [null, null];
    var box = h("div", { class: "helpbox", role: "note", hidden: !ctl.tips[key], text: HELP[key] });
    var btn = h("button", { class: "tip", type: "button", "aria-label": "What does this mean?", "aria-expanded": String(!!ctl.tips[key]) }, "?");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var opening = box.hidden;
      box.hidden = !opening;
      btn.setAttribute("aria-expanded", String(opening));
      if (opening) ctl.tips[key] = 1; else delete ctl.tips[key];
    });
    return [btn, box];
  }

  function kv(label, value, key) {
    var t = tipPair(key);
    return h("div", null, h("span", { class: "muted small" }, label, t[0] ? " " : null, t[0]), h("b", { text: String(value) }), t[1]);
  }

  // A heading with its "?" and anything else on the same line; the help box opens under the line
  function titled(tag, title, key, extra, attrs) {
    var t = tipPair(key);
    return [h("div", { class: "row" }, h(tag, Object.assign({ class: "grow", style: "margin:0" }, attrs || {}), title, t[0] ? " " : null, t[0]), extra || null), t[1]];
  }

  // A card that folds open and closed with a Show / Hide button; the choice is remembered
  function section(id, title, key, defaultOpen, badge, content) {
    var open = ctl.open[id] === undefined ? defaultOpen : !!ctl.open[id];
    var inner = h("div", { id: "sec-" + id, class: "secbody", hidden: !open }, content);
    var toggle = h("button", { class: "ghost small", type: "button", "aria-expanded": String(open), "aria-controls": "sec-" + id }, open ? "Hide" : "Show");
    toggle.addEventListener("click", function () {
      var opening = inner.hidden;
      inner.hidden = !opening;
      toggle.setAttribute("aria-expanded", String(opening));
      toggle.textContent = opening ? "Hide" : "Show";
      ctl.open[id] = opening;
      saveOpen();
    });
    var head = titled("h2", title, key, h("span", { class: "row", style: "gap:8px" }, badge || null, toggle));
    return h("div", { class: "card", id: id }, head[0], head[1], inner);
  }

  function envCards(d) {
    var s = d.here;
    var sb = tipPair("staging_health");
    var staging = h("div", { class: "card env" },
      titled("h2", "Staging", "staging", h("span", { class: "row", style: "gap:6px" }, h("span", { class: "badge " + (s.worker_ok ? "C" : "bad"), text: s.worker_ok ? "Healthy" : "Worker stopped" }), sb[0])),
      sb[1],
      h("p", { class: "muted small", style: "margin-top:6px", text: "Test accounts only. Every version is tried here first." }),
      h("div", { class: "kv" }, kv("Version running", versionOf(d, s.code_version), "version_running"), kv("Worker last ran", ago(s.worker_last_run), "worker"),
        kv("Problems, last 24 hours", s.problems_24h, "problems"), kv("Paused areas", (s.paused || []).length ? s.paused.join(", ") : "None", "paused")));
    var L = d.live || {};
    var state, cls;
    if (!d.live_ref) { state = "Not set up yet"; cls = "O"; }
    else if (!L.checked_at) { state = "Checking soon"; cls = "O"; }
    else if (L.down) { state = "Not healthy"; cls = "bad"; }
    else if (L.ok) { state = "Healthy"; cls = "C"; }
    else if (!L.ever_ok) { state = "Waiting for your first push"; cls = "O"; }
    else { state = "Checking again"; cls = "O"; }
    var paused = L.paused && L.paused.length ? L.paused.join(", ") : L.paused_all ? "all" : "None";
    var lb = tipPair("live_health");
    var live = h("div", { class: "card env" },
      titled("h2", "Live", "live", h("span", { class: "row", style: "gap:6px" }, h("span", { class: "badge " + cls, text: state }), lb[0])),
      lb[1],
      h("p", { class: "muted small", style: "margin-top:6px", text: "Members on the access list. Changes only when you push." }),
      h("div", { class: "kv" }, kv("Version running", L.code_version ? versionOf(d, L.code_version) : "None yet", "version_running"), kv("Checked", L.checked_at ? ago(L.checked_at) : "Not yet", "live_checked"),
        kv("Problems, last 24 hours", L.problems_24h === undefined ? "Not known yet" : L.problems_24h, "problems"), kv("Paused areas", paused, "paused")),
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
    var st = tipPair("steps");
    return [h("div", { class: "row", style: "margin-top:12px" }, h("span", { class: "small", style: "font-weight:700" }, "Steps to Live ", st[0])), st[1], h("ol", { class: "steps", "aria-label": "Steps to Live" }, defs.map(function (s, i) {
      return h("li", { class: s[2] ? "done" : i === firstOpen ? "now" : "" }, h("i", { "aria-hidden": "true", text: s[2] ? "✓" : String(i + 1) }),
        h("div", { text: s[0] }), h("div", { class: "muted small", style: "font-weight:400", text: s[1] }));
    }))];
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
      titled("h3", title, "progress"),
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
    if (!x) return h("div", { class: "card" }, titled("h2", "Next version", "next"), h("p", { class: "muted", style: "margin-top:8px", text: "No new version is waiting. Claude adds each version here when it is ready on Staging." }));
    var lv = liveRelease(d);
    var added = lv ? x.migrations.filter(function (m) { return lv.migrations.indexOf(m) < 0; }) : x.migrations;
    var blockers = pushBlockers(d, x);
    var flowHere = ctl.flow && ctl.flow.id === x.id && ctl.flow.action === "push";
    var showProgress = ["approved", "deploying"].indexOf(x.status) >= 0 || x.watching || (x.steps && x.steps.length && (x.status === "failed" || x.status === "live"));
    var tested = h("input", { type: "checkbox", checked: ["tested", "approved", "deploying", "live"].indexOf(x.status) >= 0, disabled: !isOwner || ["candidate", "tested", "failed"].indexOf(x.status) < 0, "aria-label": "I tested " + x.version + " on Staging" });
    tested.addEventListener("change", function () {
      api.post("/admin/releases/tested", { release_id: x.id, tested: tested.checked }).then(check).then(function () { ok(tested.checked ? "Marked as tested" : "Unmarked"); controlTab(false); }).catch(relFail);
    });
    var nt = tipPair("next");
    var pt = tipPair("push");
    return h("div", { class: "card" },
      h("div", { class: "row" }, h("div", { class: "grow" }, h("div", { class: "eyebrow", style: "color:var(--brand)" }, "Next version ", nt[0]), h("h2", { style: "font-size:24px;margin:2px 0 0", text: x.version })),
        h("span", { class: "badge " + (x.status === "live" ? "C" : x.status === "failed" ? "bad" : x.status === "tested" ? "G" : "O"), text: x.watching ? "Live, being watched" : RELEASE_STATUS[x.status] || x.status })),
      nt[1],
      stepper(d, x),
      h("div", { class: "envs", style: "gap:10px" },
        h("div", { class: "soft" }, titled("h3", "What changes for members", "changes"), h("p", { class: "small", text: x.notes || "No notes." })),
        h("div", { class: "soft" }, titled("h3", "Database changes", "db"), h("p", { class: "small", text: (added.length ? added.length + (added.length === 1 ? " addition" : " additions") + " (" + added.join(", ") + ")." : "Nothing new.") +
          (x.contract_migrations && x.contract_migrations.length ? " It also removes or renames something, so going back past this version will be blocked." : " Nothing removed or renamed, so going back stays safe.") })),
        h("div", { class: "soft" }, titled("h3", "Proof it works", "proof"),
          h("p", { class: "small" }, x.tests_url ? h("a", { href: x.tests_url, target: "_blank", rel: "noopener" }, "Automatic tests: passed") : "Automatic tests: not yet", h("br"),
            x.test_report ? "ChatGPT test report: saved" : "ChatGPT test report: not saved yet"),
          x.test_report ? h("details", null, h("summary", { class: "small", text: "Read the test report" }), h("pre", { class: "small", style: "white-space:pre-wrap", text: x.test_report })) : null)),
      showProgress ? progress(x) : null,
      flowHere ? flowPanel(d, x, "push") : null,
      isOwner && !flowHere && ["candidate", "tested", "failed"].indexOf(x.status) >= 0 ? h("div", { style: "border-top:1px solid var(--line);margin-top:14px;padding-top:14px" },
        h("label", { class: "row", style: "font-weight:700;font-size:15px" }, tested, "I tested this version on Staging and it is ready"),
        h("div", { class: "row", style: "margin-top:10px" }, h("button", { class: "big", disabled: blockers.length > 0, onclick: function () { ctl.flow = { id: x.id, action: "push", stage: "password" }; drawControl(); } }, "Push to Live"), pt[0]),
        pt[1],
        blockers.length ? h("ul", { class: "small muted", style: "margin:8px 0 0;padding-left:18px" }, blockers.map(function (b) { return h("li", { text: b }); })) : null) : null);
  }

  function historyCard(d) {
    var busy = d.releases.some(function (y) { return y.status === "approved" || y.status === "deploying"; });
    var flow = ctl.flow && ctl.flow.action === "rollback" ? d.releases.filter(function (y) { return y.id === ctl.flow.id; })[0] : null;
    return section("history", "Version history", "history", true, h("span", { class: "badge", text: d.releases.length + (d.releases.length === 1 ? " version" : " versions") }), [
      h("p", { class: "muted small", style: "margin-top:8px", text: "Every version, when it went Live, and a button to go back. Member data is always kept when you go back." }),
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
        })))) : h("p", { class: "muted", text: "No versions yet." })]);
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
    return section("activity", "Activity", "activity", false, h("span", { class: "badge", text: rows.length ? "latest " + D.dateTime(rows[0].at) : "none yet" }), [
      h("p", { class: "muted small", style: "margin-top:8px", text: "From the audit log. Nobody can edit or delete these." }),
      h("div", { class: "pills", role: "group", "aria-label": "Show" }, FILTERS.map(function (f) {
        return h("button", { class: "small", "aria-pressed": String(ctl.filter === f[0]), onclick: function () { ctl.filter = f[0]; drawControl(); } }, f[1]);
      })),
      shown.length ? h("ul", { class: "list" }, shown.slice(0, ctl.more ? 60 : 12).map(function (r) {
        return h("li", { class: "row", style: "align-items:flex-start;flex-wrap:nowrap" }, h("span", { class: "dot k-" + r.kind, "aria-hidden": "true" }),
          h("div", null, h("div", { class: "small", style: "font-weight:700", text: r.text }), h("div", { class: "muted small", text: D.dateTime(r.at) + (r.actor ? " | " + r.actor : "") })));
      })) : h("p", { class: "muted small", style: "margin-top:10px", text: "Nothing here yet." }),
      h("div", { class: "row", style: "margin-top:10px" },
        shown.length > 12 && !ctl.more ? h("button", { class: "ghost small", onclick: function () { ctl.more = true; drawControl(); } }, "Show more") : null,
        h("button", { class: "ghost small", onclick: function () { go("audit"); } }, "Open the full audit log"))]);
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
    return section("setup", "Live setup", "setup", doneCount < items.length, h("span", { class: "badge " + (doneCount === items.length ? "C" : "O"), text: doneCount + " of " + items.length + " done" }), [
      h("p", { class: "muted small", style: "margin-top:8px", text: "Most lines check themselves. Tick the others when you have done them." }),
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
      h("button", { class: "ghost small", style: "margin-top:10px", onclick: function () { controlTab(true); } }, "Check again")]);
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
    return section("password", d.password_set ? "Change your release password" : "Set your release password", "password", !d.password_set,
      h("span", { class: "badge " + (d.password_set ? "C" : "O"), text: d.password_set ? "Set" : "Not set" }), [
      h("p", { class: "muted small", style: "margin-top:8px", text: "Only you push to Live, and every push asks for this password. Use at least 12 characters. Do not share it, and never paste it in chat. Five wrong tries lock pushing for 30 minutes." }),
      d.password_set ? [h("label", { text: "Current password" }), cur] : null,
      h("label", { text: "New password" }), nw, h("label", { text: "Repeat new password" }), nw2,
      h("div", { style: "margin-top:10px" }, h("button", { onclick: function () {
        if (nw.value !== nw2.value) { D.toast(app, "The two new passwords do not match.", true); return; }
        api.post("/admin/releases/password", { current: cur.value, password: nw.value }).then(check).then(function () { cur.value = nw.value = nw2.value = ""; ok("Release password saved"); controlTab(false); }).catch(relFail);
      } }, "Save password"))]);
  }

  function resetCard() {
    return ownerOnly(section("reset", "Reset Staging test data", "reset", false, null, [
      h("p", { class: "muted small", style: "margin-top:8px", text: "Clears test activity on Staging: allowances used, notices, background jobs, holds and other people's sign ins. Keeps people, the team, the access list, settings, plans and versions. Live is never touched." }),
      h("button", { class: "ghost", onclick: function () {
        var t = prompt("Type RESET to clear Staging test activity.");
        if (t !== "RESET") return;
        api.post("/admin/staging/reset", { confirm: "RESET" }).then(check).then(function () { ok("Staging test activity cleared"); }).catch(relFail);
      } }, "Reset Staging test data")]));
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
    var livePaused = (d.live || {}).paused && d.live.paused.length ? d.live.paused.join(", ") : "";
    var pauseNote = section("pause", "Emergency pause on Live", "pause", !!livePaused, h("span", { class: "badge " + (livePaused ? "bad" : "C"), text: livePaused ? "Paused: " + livePaused : "Nothing paused" }), [
      h("p", { class: "small", style: "margin-top:8px", text: "Paused on Live now: " + (livePaused || "nothing") + "." }),
      h("p", { class: "muted small", text: "To pause Live, open the Live admin area, Overview tab, Emergency pause. It works at once, with no push." })]);
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
