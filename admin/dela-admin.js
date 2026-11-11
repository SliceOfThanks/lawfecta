// DELA admin area for the Lawfecta Team (Step 1). Every change is checked again on the server,
// saved with its history, and written to the audit log. Only owners can change things.
(function () {
  var D = window.DELA;
  var root = document.getElementById("dela-app");
  if (!D || !root) return;
  var m = D.mount(root);
  var app = m.app;
  D.markAi(app);
  var h = D.h;
  var api = D.client(root, function () { body(h("div", { class: "notice bad", text: "Your sign in ended. Refresh the page." })); });
  var boot = api.boot || {};
  var me = boot.me || {};
  var isOwner = (me.staff || []).indexOf("owner") >= 0;
  var TABS = [["control", "Release Control"], ["guide", "Guide"], ["overview", "Overview"], ["access", "Access list"], ["people", "People"], ["plans", "Plans"], ["settings", "Settings"],
    ["switches", "Switches"], ["aifiles", "AI and files"], ["verify", "Verification"], ["catalog", "Tech catalog"], ["gigs", "Gigs"], ["meet", "Meetings and messages"], ["pay", "Payments"], ["disputes", "Disputes"], ["reviews", "Reviews and bench"], ["agencies", "Agencies"], ["recurring", "Recurring"], ["trials", "Trials"], ["usage", "Usage"], ["team", "Lawfecta Team"], ["security", "Security"], ["holds", "Holds"], ["audit", "Audit log"], ["jobs", "Jobs"]];
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

  var conflict = D.loginConflict(root);
  if (conflict) {
    D.clear(app);
    app.appendChild(h("div", { class: "wrap" }, h("div", { class: "card", style: "max-width:620px;margin:40px auto" },
      h("h1", { text: "Two website logins in this browser" }),
      h("p", { class: "notice", text: "Saved logins found for BD members " + conflict.join(" and ") + "." }),
      D.LOGIN_CONFLICT_TEXT.map(function (t) { return h("p", { text: t }); }))));
    return;
  }
  if (boot.route !== "here" || !(me.staff || []).length) {
    D.clear(app);
    app.appendChild(h("div", { class: "wrap" }, h("div", { class: "card", style: "max-width:560px;margin:40px auto;text-align:center" },
      h("h1", { text: "Lawfecta Team only" }), h("p", { class: "muted", text: "This page is for the Lawfecta Team. Log in with a Lawfecta Team account." }),
      // Test accounts share look-alike addresses, so say plainly which account this browser is signed in with
      me.person ? h("p", { class: "notice", style: "text-align:left", text: "You are signed in as " + (me.person.name || "a member") + (me.person.email ? " (" + me.person.email + ")" : "") + ", BD member " + me.person.bd_member_id + ". To use the admin area, log out of the website and log in with your Lawfecta Team account." }) : null)));
    return;
  }

  function frame() {
    var top = h("div", { class: "top" }, h("span", { class: "brand" }, D.logo(root), h("span", { text: "DELA Admin" })));
    top.appendChild(h("span", { class: "badge " + (me.environment === "live" ? "C" : "stage"), title: me.environment === "live" ? "Live: lawfecta.co, real members" : "Test mode on lawfecta.co: test data only", text: me.environment === "live" ? "Live" : "Test site" }));
    top.appendChild(h("span", { class: "grow" }));
    top.appendChild(h("span", { class: "small", style: "opacity:.85", text: me.person.name + " (" + me.staff.join(", ") + ")" }));
    // How DELA looks, the same choice as in the member area (UX review Phase 4 part D)
    var ap = me.appearance || {};
    D.setTheme(app, ap.mode);
    if (ap.on) {
      var look = h("select", { "aria-label": "Appearance", class: "small", style: "background:transparent;color:#fff;border:1px solid rgba(255,255,255,.45);border-radius:999px;padding:4px 10px" },
        [["device", "Match my device"], ["light", "Light"], ["dark", "Dark"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: ap.mode === o[0], style: "color:#1c2230" }); }));
      look.addEventListener("change", function () {
        api.post("/me/appearance", { mode: look.value }).then(function (x) { if (!x.ok) throw x; me.appearance = { on: true, mode: x.mode }; D.setTheme(app, x.mode); ok("Appearance saved"); })
          .catch(function (e) { fail(new Error((e && (e.reason || e.message)) || "error")); });
      });
      top.appendChild(look);
    }
    top.appendChild(h("a", { class: "btn small ghost", href: "/dela", style: "color:#fff;border-color:rgba(255,255,255,.45);background:transparent" }, "Member view"));
    // Sign out ends the DELA session, then logs out of Lawfecta too, the same as in the member area
    top.appendChild(h("button", { class: "btn small ghost", type: "button", style: "color:#fff;border-color:rgba(255,255,255,.45);background:transparent", onclick: function () {
      api.signOut().then(function () { location.href = root.getAttribute("data-logout-url") || "/logout"; });
    } }, "Sign out"));
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
    ({ control: function () { controlTab(true); }, guide: guide, overview: overview, access: access, people: people, plans: plans, settings: settings, switches: switches, aifiles: aiFiles, verify: verifyTab, catalog: catalogTab, gigs: gigsTab, meet: meetTab, pay: payTab, disputes: disputesTab, reviews: reviewsTab, agencies: agenciesTab, recurring: recurringTab, trials: trialsTab, usage: usageTab, security: securityTab, team: team, holds: holds, audit: audit, jobs: jobs })[tab]();
  }

  // ---------- Guide ----------
  // A plain-words manual for someone who has never seen DELA's admin area. Text only, nothing loads from the server.
  // Each section is a list of blocks: p (paragraph), note (highlighted tip), flow (path picture), steps (numbered),
  // terms (name and meaning), two (side by side boxes).
  var GUIDE = [
    ["g_start", "Start here", "What this admin area is and how to read it", [
      { p: "DELA is the part of Lawfecta where solo attorneys hand work to freelance paralegals. This admin area is where the Lawfecta Team runs it: who can use DELA, plans and prices, which features are on, and sending new versions to members." },
      { terms: [
        ["One site for the pilot", "The pilot runs on one site, lawfecta.co. Claude puts each new version on it after every automatic test has passed, and you test it there. The badge at the top, next to DELA Admin, says whether the site is still in test mode or is Live for real members."],
        ["Two copies, later", "DELA can also run as two copies: a test site where every new version goes first, and Live for real members, which gets a version only when you push it. The Releases tab was built for that. It is not needed while there is one site."],
        ["The ? buttons", "Click a ? next to a title or number to see what it means. Click it again to close it."],
        ["Show and Hide", "Long sections fold. Click Show to open one and Hide to close it. This browser remembers your choice."],
      ] },
      { note: "New here? Read One site for the pilot above first. Test site and Live, and How a version gets to Live, describe the two-copy setup that is not in use during the pilot." },
    ]],
    ["g_copies", "Test site and Live", "How it works when a second copy is set up (not during the pilot)", [
      { two: [
        ["Test site", "stage", ["Where you try every new version.", "Used by the Lawfecta Team and the people on its access list.", "Every new version runs here first, as soon as Claude finishes it.", "Claude builds and changes things here."]],
        ["Live", "live", ["The real copy.", "Used by real members.", "Changes only when you push a tested version.", "Claude never changes Live."]],
      ] },
      { p: "Each copy has its own database. Nothing typed on the test site ever shows up for real members. If a new version has a problem, it shows up on the test site, where nobody real is affected." },
      { terms: [["Testers", "Testers use the test site. Add them to the access list in the test site's admin area. Nobody needs to be sent between sites."]] },
    ]],
    ["g_push", "How a version gets to Live", "The six steps, from Claude's build to members", [
      { flow: ["Built on the test site", "Automatic tests", "Your ChatGPT test", "You mark it tested", "Push to Live", "15 minute watch"] },
      { steps: [
        ["Built on the test site", "Claude builds the change and switches the test site to it. It appears at the top of Release Control as Ready to test."],
        ["Automatic tests", "GitHub runs every automatic test on that exact code. The step turns green only when all of them pass."],
        ["Your ChatGPT test", "Claude gives you one test prompt. Paste it into ChatGPT and test the site with it. Send ChatGPT's report to Claude, who saves it with the version."],
        ["You mark it tested", "On Release Control, tick \"I tested this version on the test site and it is ready\"."],
        ["Push to Live", "Click Push to Live, enter your release password, then the 6 digit code sent to you. The button stays grey until steps 1 to 4 are done, and says what is missing."],
        ["15 minute watch", "Release Control shows each part of the push as it happens. Live is then checked every minute for 15 minutes. If all is well, the version shows as Live now."],
      ] },
    ]],
    ["g_moves", "What a push moves", "What goes to Live and what stays where it is", [
      { two: [
        ["Moves to Live", "ok", ["New screens.", "New server code.", "New database parts the version needs, such as a new table. These only add; nothing members saved is removed or changed."]],
        ["Stays on its own copy", "soft", ["Everything people did or entered: accounts, projects, messages, the audit log.", "Settings, plans, prices and switches.", "The access list and test accounts."]],
      ] },
      { note: "A push never copies data from the test site to Live. A price you change on the test site changes the test site only. To change it for real members, open the admin area on Live (the badge says Live) and make the same change there." },
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
        ["Release Control", "Where versions go from the test site to Live: both copies, the next version and its steps, Push to Live, history, activity and one-time setup."],
        ["Guide", "This page."],
        ["Overview", "A quick picture of this copy: people using it, who was turned away, open decisions, paused parts, the emergency pause and a test notice button."],
        ["Access list", "Who may open DELA while it is not open to everyone, added by BD member ID. The second list holds test accounts that Live sends to the test site."],
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
        ["Claude", "Builds and tests every change, puts it on the test site, writes the notes for each version and the ChatGPT test prompt. Never touches Live."],
        ["GitHub", "Stores the code, runs the automatic tests, and does the push to Live after you approve it."],
        ["You (owner)", "Test with ChatGPT, mark versions tested, push to Live, go back if needed, and make the business decisions on Live."],
        ["Brilliant Directories", "The website, member accounts and logins. DELA sits inside BD pages and never sees BD passwords."],
        ["Supabase", "Where DELA's data and server code live. The test site and Live are two separate Supabase projects."],
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
          stat("Turned away (7 days)", d.denied_7d, "Not on the access list", "ov_denied"),
          stat("Decisions to make", (dec.O || 0) + (dec.R || 0), (dec.O || 0) + " open, " + (dec.R || 0) + " suggested, " + (dec.G || 0) + " need a gate", "ov_decisions"),
          stat("Plans not linked to BD", d.unmapped_plans, "Link them on the Plans tab", "ov_unmapped"),
          stat("Switches on", d.switches_on, null, "ov_switches"),
          stat("Active holds", d.holds_active, null, "ov_holds")),
        emergencyCard(),
        guideCard(),
        h("div", { class: "card" }, titled("h2", "Check notices", "ov_notices"),
          h("p", { class: "muted small", text: "Sends a test notice to you. Email uses the service in the email.sender setting (log means it is recorded, not sent)." }),
          h("div", { class: "row" },
            h("button", { onclick: function () { api.post("/admin/test-notification", { email: false }).then(check).then(function () { ok("Test notice sent. Open the member view to see it."); }).catch(fail); } }, "Send an in-app notice"),
            h("button", { class: "ghost", onclick: function () { api.post("/admin/test-notification", { email: true }).then(check).then(function () { ok("Test email queued. The worker sends it within a minute."); }).catch(fail); } }, "Send a test email"))),
        section("ov_recent", "Recent activity", "ov_recent", true, null,
          h("ul", { class: "list" }, d.recent.map(function (a) { return h("li", { class: "small" }, h("strong", { text: a.action.split("_").join(" ") }), " by " + a.actor + " ", h("span", { class: "muted", text: D.dateTime(a.at) })); })))));
    }).catch(fail);
  }

  // ---------- The DELA guide (step 13): how many members it reaches and where they are ----------
  var GUIDE_STEPS = { firm: "Tell DELA about the firm", agency_profile: "Agency profile", pick_task: "Pick a first task", approve_playbook: "Approve the playbook", delegate: "Hand off steps", continue_delegation: "Handing off",
    verify: "License check before posting", post_gig: "Post the gig", invite: "Invite freelancers", review_proposals: "Compare proposals", next_task: "Next task",
    profile: "Finish the profile", verify_linkedin: "LinkedIn check", verify_waiting: "Waiting on the LinkedIn check", availability: "Confirm availability",
    invitations: "Answer invitations", new_gigs: "New gigs that fit", first_proposal: "First proposal", teach: "Teach DELA", restricted: "On hold" };
  function guideCard() {
    var box = h("div", { class: "card" }, h("h2", { text: "DELA guide" }), h("p", { class: "muted small", text: "Loading..." }));
    api.get("/admin/guide").then(function (r) {
      var d = r.data || {};
      D.clear(box);
      box.appendChild(h("h2", { text: "DELA guide" }));
      box.appendChild(h("p", { class: "muted small", text: "The proactive chat on members' Dashboards, in the last 30 days. Each member is counted once per step they reached." }));
      box.appendChild(h("div", { class: "grid" },
        h("div", { class: "tile col" }, h("div", { class: "muted small", text: "Members who saw it" }), h("div", { class: "stat", text: String(d.people || 0) })),
        h("div", { class: "tile col" }, h("div", { class: "muted small", text: "Buttons chosen" }), h("div", { class: "stat", text: String(d.chose || 0) })),
        h("div", { class: "tile col" }, h("div", { class: "muted small", text: "Questions answered" }), h("div", { class: "stat", text: String(d.ai_replies || 0) })),
        h("div", { class: "tile col" }, h("div", { class: "muted small", text: "Paused" }), h("div", { class: "stat", text: String(d.paused || 0) })),
        h("div", { class: "tile col" }, h("div", { class: "muted small", text: "Gig alerts sent today" }), h("div", { class: "stat", text: String(d.alerts_today || 0) }))));
      var steps = Object.keys(d.steps || {});
      box.appendChild(steps.length ? h("ul", { class: "list" }, steps.sort(function (a, b) { return d.steps[b] - d.steps[a]; }).map(function (k) {
        return h("li", { class: "small" }, h("strong", { text: GUIDE_STEPS[k] || k }), ": " + d.steps[k] + (d.steps[k] === 1 ? " member" : " members"));
      })) : h("p", { class: "muted small", text: "No member has seen the guide yet." }));
    }).catch(function () { D.clear(box); box.appendChild(h("h2", { text: "DELA guide" })); box.appendChild(h("p", { class: "muted small", text: "Could not load the guide numbers." })); });
    return box;
  }

  // ---------- Emergency pause (no push needed; members see a short message, the team keeps working) ----------

  var PAUSE_AREAS = [["all", "All of DELA"], ["ai", "AI help"], ["checkout", "New payments"], ["payouts", "Payouts"], ["renewals", "Monthly renewals"], ["external", "Outside connections"], ["email", "Emails"], ["connector", "ChatGPT and Claude connector"], ["confidential", "Confidential materials"]];
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
      body(h("div", null,
        pageHead("Access list", "acc"),
        h("p", { class: "muted", text: "Find a member's ID in BD admin under Members. The Lawfecta Team can always open DELA." }),
        ownerOnly(h("div", { class: "card" }, titled("h2", "Add someone", "acc_add"), h("div", { class: "row", style: "margin-top:8px" }, idIn, noteIn,
          h("button", { onclick: function () {
            api.post("/admin/access/grant", { bd_member_id: idIn.value, channel: "access", note: noteIn.value }).then(check).then(function (d) { ok(d.duplicate ? "Already on that list" : "Added"); access(); }).catch(fail);
          } }, "Add")))),
        // The "Test site account" list is gone: each site has its own members (AI review 0.9.0, security 5)
        section("acc_list", "May open DELA", "acc_list", true, h("span", { class: "badge", text: String(rows.filter(function (a) { return a.channel === "access"; }).length) }), list("access"))));
    }).catch(fail);
  }

  // ---------- People ----------

  var planList = null;
  function loadPlans() { return planList ? Promise.resolve(planList) : api.get("/admin/plans").then(function (r) { planList = r.data; return planList; }); }

  var peopleQ = "";
  function people(q) {
    peopleQ = q || "";
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
            var flags = [p.staff.length ? "Team: " + p.staff.join(", ") : "", p.access ? "Access list" : "", p.staging_tester ? "Test site tester" : "", p.status !== "active" ? p.status : ""].filter(Boolean).join(" | ");
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
      api.post("/admin/sides/grant", { bd_member_id: p.bd_member_id, side: parts[0], plan_code: parts[1] }).then(check).then(function () { ok("Done. It applies on their next page load."); people(peopleQ); }).catch(fail);
    } }, "Give"));
    p.sides.filter(function (s) { return s.plan_source === "staff_grant"; }).forEach(function (s) {
      wrap.appendChild(h("button", { class: "ghost small", onclick: function () {
        api.post("/admin/sides/release", { bd_member_id: p.bd_member_id, side: s.side }).then(check).then(function () { ok("Back on their BD plan from their next sign in"); people(peopleQ); }).catch(fail);
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

  // Settings that hold one value per plan (for example {"att_free":20,"att_plus":30}) or a small map
  // (Stacey's recorder check 2026-11-05: they showed as "[object Object] minutes")
  var TIERS = { free: "Free", plus: "Plus", pro: "Pro", business: "Business" };
  function keyName(k) {
    var parts = String(k).split("_");
    if (parts.length === 2 && TIERS[parts[1]] && (parts[0] === "att" || parts[0] === "fl")) return (parts[0] === "att" ? "Attorney " : "Freelancer ") + TIERS[parts[1]];
    return String(k).split("_").join(" ");
  }
  function isMap(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
  function flatMap(v) { return Object.keys(v).every(function (k) { return v[k] === null || typeof v[k] !== "object"; }); }
  function shown(s) {
    var v = s.value;
    if (isMap(v)) {
      if (!flatMap(v)) return JSON.stringify(v);
      return Object.keys(v).map(function (k) { return keyName(k) + ": " + (v[k] === null ? "no cap" : String(v[k]) + (s.unit ? " " + s.unit : "")); }).join("; ");
    }
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
    else if (isMap(v) && flatMap(v)) {
      input = h("div", { class: "kv" }, Object.keys(v).map(function (k) {
        return h("label", null, keyName(k), h("input", { "data-key": k, type: typeof v[k] === "number" ? "number" : "text", value: v[k] === null ? "" : String(v[k]), "aria-label": keyName(k) }));
      }));
    }
    else if (isMap(v)) input = h("textarea", { style: "width:100%;min-height:120px", text: JSON.stringify(v, null, 2) });
    else input = h("input", { value: String(v), style: "width:100%" });
    if (typeof v === "boolean") input.value = String(v);
    var status = h("select", null, ["C", "R", "O", "G"].map(function (k) { return h("option", { value: k, text: D.STATUS[k] }); }));
    status.value = "C";
    var reason = h("input", { placeholder: "Why (saved with the decision)", style: "width:100%" });
    function parse() {
      if (isMap(v) && flatMap(v)) {
        var o = {};
        Object.keys(v).forEach(function (k) {
          var el = input.querySelector("[data-key='" + k + "']"), t = el.value.trim();
          if (typeof v[k] === "number" || v[k] === null) { if (t === "") { o[k] = null; return; } var n = Number(t); if (!isFinite(n)) throw new Error("wrong_type"); o[k] = n; }
          else o[k] = t;
        });
        return o;
      }
      if (isMap(v)) { try { return JSON.parse(input.value); } catch (e) { throw new Error("wrong_type"); } }
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

  // ---------- AI and files (Step 2a): use, keys and storage. Never a key, never what a file says. ----------

  function mb(bytes) {
    if (bytes === null || bytes === undefined) return "No cap";
    if (bytes < 1048576) return (bytes ? Math.max(1, Math.round(bytes / 1024)) : 0) + " KB";
    var v = bytes / 1048576;
    return v >= 1000 ? String(Math.round(v / 100) / 10) + " GB" : (v < 10 ? v.toFixed(1) : Math.round(v)) + " MB";
  }
  var SOURCE = { lawfecta: "Lawfecta's key", own_key: "Member's own key", firm_key: "Firm key" };
  var TASK = { chat: "Chat", file: "Chat with files", voice: "Talking (speech to text)", key_test: "Key test", client_check: "Client information check" };

  // ---------- Verification (Step 3): licenses and LinkedIn checks ----------
  var LIC_ID = { bar_email: "The email matches the state bar record", firm_domain: "The email is at the firm's own domain", video: "We had the video call" };
  var READY = { incomplete: "Not complete", verification_pending: "Waiting for a check", match_ready: "Ready", availability_stale: "Availability out of date", unavailable: "Not taking work", restricted: "Paused", not_applicable: "Not used" };
  // ---------- Meetings and messages (Step 5) ----------
  var ROOM_WORDS = { pending: "Being made", ready: "Ready", failed: "Could not be made (retrying)", waiting_for_provider: "Waiting for Vectera" };
  function meetTab() {
    api.get("/admin/meetings").then(function (r) {
      var d = r.data, c = d.counts || {};
      var top = h("div", { class: "card" }, titled("h2", "The last 30 days", "meet"),
        h("div", { class: "kv" },
          h("div", null, "Meetings booked", h("b", { text: String(c.booked_30d || 0) })), h("div", null, "Both confirmed they met", h("b", { text: String(c.attended_30d || 0) })),
          h("div", null, "Canceled", h("b", { text: String(c.canceled_30d || 0) })), h("div", null, "Late cancels", h("b", { text: String(c.late_30d || 0) })),
          h("div", null, "Did not happen", h("b", { text: String(c.no_show_30d || 0) })), h("div", null, "Messages", h("b", { text: String(c.messages_30d || 0) })),
          h("div", null, "Conversations", h("b", { text: String(c.threads || 0) }))),
        h("p", { class: d.provider_ready ? "small muted" : "notice", text: d.provider_ready ? "Vectera is connected: DELA makes a meeting room for each booking." : "Vectera is not connected yet, so meetings show \"Waiting for Vectera\" instead of a join link. It needs Vectera's API plan and the VECTERA_API_KEY secret in Supabase." }));
      var up = h("div", { class: "card" }, h("h2", { text: "Upcoming meetings (" + d.upcoming.length + ")" }));
      if (!d.upcoming.length) up.appendChild(h("p", { class: "muted", text: "None booked." }));
      else up.appendChild(h("div", { class: "scroll" }, h("table", { class: "stack" }, h("thead", null, h("tr", null, ["When", "Gig", "Attorney", "Freelancer", "Room"].map(function (t) { return h("th", { text: t }); }))),
        h("tbody", null, d.upcoming.map(function (m) {
          return h("tr", null, h("td", { "data-label": "When", text: D.dateTime(m.start_at) + " (" + m.length_min + " min)" }), h("td", { "data-label": "Gig", text: m.gig_title }),
            h("td", { "data-label": "Attorney", text: m.attorney }), h("td", { "data-label": "Freelancer", text: m.freelancer }), h("td", { "data-label": "Room", text: ROOM_WORDS[m.room_status] || m.room_status }));
        })))));
      var reps = h("div", { class: "card" }, h("h2", { text: "Reports (" + d.reports.length + ")" }));
      if (!d.reports.length) reps.appendChild(h("p", { class: "muted", text: "No open reports." }));
      d.reports.forEach(function (x) {
        reps.appendChild(h("div", { class: "card", style: "margin:8px 0" }, h("div", { class: "row" }, h("b", { class: "grow", text: x.reporter + " reported a conversation on \"" + x.gig_title + "\"" }), x.blocked ? h("span", { class: "badge held", text: "Blocked" }) : null),
          h("p", { class: "small", text: "Reason: " + (x.reason || "none given") }), x.message ? h("p", { class: "small muted", text: "Message: " + x.message }) : null, h("div", { class: "small muted", text: D.dateTime(x.created_at) }),
          h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/admin/reports/close", { id: x.id }).then(function (y) { if (!y.data.ok) throw new Error(y.data.reason); ok("Closed"); meetTab(); }).catch(fail); } }, "Mark as handled")));
      });
      var pat = h("div", { class: "card" }, h("h2", { text: "Repeated late cancels or no-shows" }),
        d.patterns.length ? h("ul", null, d.patterns.map(function (x) { return h("li", { text: x.name + " (" + x.bd_member_id + "): " + x.late + " late cancels, " + x.no_shows + " did not happen" }); })) : h("p", { class: "muted", text: "Nobody right now." }));
      body(h("div", null, pageHead("Meetings and messages", "meet"), top, up, reps, pat));
    }).catch(fail);
  }

  // ---------- Reviews and bench (Step 7): held reviews, reports, appeals, past-client reviews, paused webhooks ----------
  function reviewsTab() {
    api.get("/admin/reviews").then(function (r) {
      var d = r.data, c = d.counts || {}, sw = d.switches || {};
      function decide(kind, id, action, note, done) {
        api.post("/admin/reviews/decide", { kind: kind, id: id, action: action, note: note }).then(function (y) {
          if (!y.data.ok) throw new Error(y.data.reason === "say_why" ? "Write the reason first. Both members may see it." : y.data.reason); ok(done); reviewsTab();
        }).catch(fail);
      }
      function noteBox(label) { return h("textarea", { rows: 2, style: "width:100%", "aria-label": label || "Reason (kept with the decision)" }); }
      function list(title, items, empty, row) {
        var x = h("div", { class: "card" }, h("h2", { text: title + " (" + items.length + ")" }));
        if (!items.length) x.appendChild(h("p", { class: "muted", text: empty }));
        items.forEach(function (i) { x.appendChild(row(i)); });
        return x;
      }
      var top = h("div", { class: "card" }, titled("h2", "Reviews, the bench and webhooks", "reviews"),
        h("p", { class: "small muted", text: ["reviews", "past_client_reviews", "bench", "bench_suggestions", "member_webhooks"].map(function (k) { return k + ": " + (sw[k] || "off"); }).join(" | ") }),
        h("div", { class: "kv" },
          h("div", null, "Published reviews", h("b", { text: String(c.published || 0) })), h("div", null, "Held for a check", h("b", { text: String(c.held || 0) })),
          h("div", null, "Removed", h("b", { text: String(c.removed || 0) })), h("div", null, "Past-client reviews", h("b", { text: String(c.past_published || 0) })),
          h("div", null, "Past-client requests (30 days)", h("b", { text: String(c.past_requests_30d || 0) })), h("div", null, "Bench members", h("b", { text: String(c.bench_active || 0) })),
          h("div", null, "Active webhook endpoints", h("b", { text: String(c.webhook_endpoints || 0) })), h("div", null, "Paused after failures", h("b", { text: String(c.webhooks_paused || 0) }))),
        h("p", { class: "small", text: "The policy: a negative opinion stays up. Hold or remove only client information, threats, hate or harassment, impersonation, contact details or payment outside Lawfecta. Every decision needs a reason and is kept." }));
      var held = list("Reviews held for a check", d.held || [], "Nothing is waiting.", function (x) {
        var n = noteBox();
        return h("div", { class: "card", style: "margin:8px 0" }, h("b", { text: x.author + " about " + x.subject + (x.direction === "of_freelancer" ? " (attorney about freelancer)" : " (freelancer about attorney)") }),
          h("p", { class: "small", text: "DELA found: " + (x.kinds || []).join(", ") }), h("p", { style: "white-space:pre-wrap", text: x.body }), n,
          h("div", { class: "row" }, h("button", { class: "blue small", type: "button", onclick: function () { decide("held", x.id, "publish", n.value, "Published"); } }, "Publish"),
            h("button", { class: "ghost small", type: "button", onclick: function () { decide("held", x.id, "remove", n.value, "Not published; the writer was told"); } }, "Do not publish")));
      });
      var heldResp = list("Responses held for a check", d.held_responses || [], "Nothing is waiting.", function (x) {
        var n = noteBox();
        return h("div", { class: "card", style: "margin:8px 0" }, h("b", { text: "Response by " + x.subject }), h("p", { style: "white-space:pre-wrap", text: x.response }), n,
          h("div", { class: "row" }, h("button", { class: "blue small", type: "button", onclick: function () { decide("response", x.id, "publish", n.value, "Published"); } }, "Publish"),
            h("button", { class: "ghost small", type: "button", onclick: function () { decide("response", x.id, "remove", n.value, "Not published"); } }, "Do not publish")));
      });
      var heldPast = list("Past-client reviews held for a check", d.held_past || [], "Nothing is waiting.", function (x) {
        var n = noteBox();
        return h("div", { class: "card", style: "margin:8px 0" }, h("b", { text: x.by + " (" + x.state + " bar " + x.bar_number + ") about " + x.freelancer }), h("p", { class: "small", text: "DELA found: " + (x.kinds || []).join(", ") }),
          h("p", { style: "white-space:pre-wrap", text: x.body }), n,
          h("div", { class: "row" }, h("button", { class: "blue small", type: "button", onclick: function () { decide("past", x.id, "publish", n.value, "Published"); } }, "Publish"),
            h("button", { class: "ghost small", type: "button", onclick: function () { decide("past", x.id, "remove", n.value, "Not published"); } }, "Do not publish")));
      });
      var reports = list("Reported reviews", d.reports || [], "No open reports.", function (x) {
        var n = noteBox();
        return h("div", { class: "card", style: "margin:8px 0" }, h("b", { text: "Reported by " + x.by + (x.by_author ? " (the writer)" : " (the person reviewed)") }),
          h("p", { class: "small", text: "Reason: " + x.reason }), h("p", { style: "white-space:pre-wrap", text: x.body }), n,
          h("div", { class: "row" }, h("button", { class: "blue small", type: "button", onclick: function () { decide("report", x.id, "keep", n.value, "Kept up; both were told"); } }, "Keep it up"),
            h("button", { class: "ghost small", type: "button", onclick: function () { if (!confirm("Remove this review? Only for the policy reasons, never for being negative.")) return; decide("report", x.id, "remove", n.value, "Removed; both were told"); } }, "Remove")));
      });
      var appeals = list("Appeals", d.appeals || [], "No open appeals.", function (x) {
        var n = noteBox();
        return h("div", { class: "card", style: "margin:8px 0" }, h("b", { text: "Appeal by " + x.author }), h("p", { class: "small", text: "Removed because: " + (x.reason_removed || "") }),
          h("p", { class: "small", text: "Appeal: " + x.appeal }), h("p", { style: "white-space:pre-wrap", text: x.body }), n,
          h("div", { class: "row" }, h("button", { class: "blue small", type: "button", onclick: function () { decide("appeal", x.id, "reverse", n.value, "Published again"); } }, "Reverse: publish it"),
            h("button", { class: "ghost small", type: "button", onclick: function () { decide("appeal", x.id, "uphold", n.value, "The decision stays"); } }, "Uphold the decision")));
      });
      var past = list("Recent past-client reviews (spot check the bar numbers)", d.past_checks || [], "None yet.", function (x) {
        return h("p", { class: "small", text: D.dateTime(x.created_at) + ": " + x.by + ", " + x.state + " bar " + x.bar_number + ", about " + x.freelancer });
      });
      var wh = list("Webhook endpoints paused after failures", d.webhooks_paused || [], "None.", function (x) {
        return h("p", { class: "small", text: x.person + " (" + x.side + "): " + x.host + ", " + x.failures + " failures, last problem " + (x.last_error || "unknown").split("_").join(" ") + ". The member was emailed and can resume it." });
      });
      body(h("div", null, pageHead("Reviews and bench", "reviews"), top, held, heldResp, heldPast, reports, appeals, past, wh));
    }).catch(fail);
  }

  // ---------- Payments (Step 6): money held and paid, human reviews, disputes, chargebacks ----------
  var AGW = { signing: "Waiting for signatures", signed: "Signed", active: "Active", completed: "Complete", canceled: "Canceled", paused: "Paused", draft: "Draft" };
  // ---------- Step 11: the Disputes tab (docs/briefs/step-11-disputes.md) ----------
  // The queue (team review first), each case with both sides, links, offers, DELA's check and an AI draft; the team asks,
  // extends, flags for the lawyer and decides. Money tools: retry a failed refund or payout, release a held payout, lift a pause.
  var D_CAT = { not_delivered: "Not delivered", late: "Late", not_as_agreed: "Not what was agreed", quality: "Quality", not_accepted: "Payment or acceptance withheld", other: "Other" };
  var D_KIND = { opening: "Opened", answer: "Answer", note: "Note", question: "Our question", reply: "Answer to our question" };
  function disputesTab() {
    api.get("/admin/disputes").then(function (r) {
      var d = r.data || {}, rep2 = d.report || {}, all = d.disputes || [];
      var dollars = function (v) { var n = parseFloat(String(v || "").replace(/[$,]/g, "")); return isFinite(n) ? Math.round(n * 100) : null; };
      var top = h("div", { class: "card" }, h("h2", { text: "Disputes" }),
        h("p", { class: "small muted", text: "Members settle most disputes themselves with offers; unanswered ones are granted automatically. You decide the rest within " + d.team_days + " business days. Lawfecta is not a court or an arbitrator, and DELA's draft is only a suggestion." }),
        h("div", { class: "kv" },
          h("div", null, "Open now", h("b", { text: String(rep2.open || 0) })), h("div", null, "Last 90 days", h("b", { text: String(rep2.last_90_days || 0) })),
          h("div", null, "Settled by offer", h("b", { text: String(rep2.by_offer || 0) })), h("div", null, "Granted, no answer", h("b", { text: String(rep2.by_auto || 0) })),
          h("div", null, "Decided by the team", h("b", { text: String(rep2.by_team || 0) })), h("div", null, "Withdrawn", h("b", { text: String(rep2.withdrawn || 0) })),
          h("div", null, "Released to freelancers", h("b", { text: D.money(rep2.released_cents || 0) })), h("div", null, "Refunded to attorneys", h("b", { text: D.money(rep2.refunded_cents || 0) })),
          h("div", null, "Average days to close", h("b", { text: rep2.avg_days === null || rep2.avg_days === undefined ? "None yet" : String(rep2.avg_days) }))));
      function caseCard(x) {
        var m = x.milestone || {}, live = x.status === "notice" || x.status === "team_review";
        var st = x.status === "team_review" ? (x.question_open ? "Waiting for an answer to our question" : "Ready for your decision") : x.status === "notice" ? (x.answered_at ? "Members are settling" : "Waiting for an answer") : x.status === "resolved" ? (x.settled_by === "offer" ? "Settled by offer" : x.settled_by === "auto" ? "Granted, no answer" : "Decided") : "Withdrawn";
        var c = h("div", { class: "card", style: "margin:8px 0", "data-dispute": x.id },
          h("div", { class: "row", style: "flex-wrap:wrap;gap:8px" }, h("b", { class: "grow", text: x.gig_title + ", milestone " + (m.seq || "") + ". " + (m.title || "") + " (" + D.money(m.amount_cents || 0) + ")" }),
            h("span", { class: "badge " + (x.status === "team_review" ? "held" : live ? "R" : "off"), text: st }), x.needs_lawyer ? h("span", { class: "badge bad", text: "Needs the lawyer" }) : null, x.chargeback_open ? h("span", { class: "badge bad", text: "Bank chargeback open" }) : null),
          h("p", { class: "small", text: "Attorney: " + (x.attorney || "") + ". Freelancer: " + (x.freelancer || "") + ". Opened by the " + x.opened_by_role + " on " + D.date(x.created_at) + ": " + (D_CAT[x.category] || "Problem") + "." +
            (x.wants_release_cents !== null && x.wants_release_cents !== undefined ? " Asks for " + D.money(x.wants_release_cents) + " to the freelancer." : "") }),
          h("p", { class: "small muted", text: x.status === "notice" ? "Notice period ends " + D.dateTime(x.notice_ends_at) + (x.answered_at ? "." : ". No answer yet: the request is granted then unless the other side answers.") : x.status === "team_review" ? "Decide by " + D.date(x.review_due_at) + "." : x.status === "resolved" ? D.money(x.release_cents || 0) + " to the freelancer, " + D.money(x.refund_cents || 0) + " back to the attorney, " + D.date(x.resolved_at) + "." : "" }));
        if (m.deliverables) c.appendChild(h("p", { class: "small", text: "Agreed deliverables: " + m.deliverables + (m.due_date ? " (due " + m.due_date + ")" : "") }));
        if (x.check) c.appendChild(h("p", { class: "small", text: "DELA's milestone check: " + x.check.status + (x.check.score !== null && x.check.score !== undefined ? ", score " + x.check.score : "") + (x.check.statement ? ". Delivery note: " + x.check.statement : "") }));
        (x.statements || []).forEach(function (s2) { c.appendChild(h("div", { class: "msg", style: "margin:6px 0" }, h("div", { class: "small muted", text: (s2.role === "team" ? "Lawfecta Team to the " + s2.to_role : "The " + s2.role) + " | " + (D_KIND[s2.kind] || s2.kind) + " | " + D.dateTime(s2.at) }), h("div", { text: s2.body }))); });
        if ((x.evidence || []).length) c.appendChild(h("ul", { class: "small" }, x.evidence.map(function (e) { return h("li", null, "The " + e.role + ": ", h("a", { href: e.url, target: "_blank", rel: "noopener noreferrer", text: e.label })); })));
        if ((x.offers || []).length) c.appendChild(h("ul", { class: "small" }, x.offers.map(function (o) { return h("li", { text: "The " + o.from_role + " offered " + D.money(o.release_cents) + " to the freelancer (" + o.status + ")" }); })));
        if (!live) return c;
        // Decide (presets, the AI draft, the note both members see)
        var rel = h("input", { inputmode: "decimal", "aria-label": "To the freelancer ($)", style: "width:130px" }), back = h("span", { class: "small muted" });
        var note = h("textarea", { rows: 3, style: "width:100%", "aria-label": "Decision and reasons (both members see this)" });
        var showBack = function () { var c2 = dollars(rel.value); back.textContent = c2 === null ? "" : "and " + D.money(Math.max((m.amount_cents || 0) - c2, 0)) + " back to the attorney"; };
        rel.addEventListener("input", showBack);
        var set = function (cents) { rel.value = (cents / 100).toFixed(2); showBack(); };
        var lastOffer = function (role) { var o = (x.offers || []).filter(function (y) { return y.from_role === role; }).slice(-1)[0]; return o ? o.release_cents : null; };
        var presets = h("div", { class: "row", style: "flex-wrap:wrap;gap:6px" },
          h("button", { class: "ghost small", type: "button", onclick: function () { set(m.amount_cents || 0); } }, "All to the freelancer"),
          h("button", { class: "ghost small", type: "button", onclick: function () { set(0); } }, "All back to the attorney"),
          h("button", { class: "ghost small", type: "button", onclick: function () { set(Math.round((m.amount_cents || 0) / 2)); } }, "Half each"),
          lastOffer("attorney") !== null ? h("button", { class: "ghost small", type: "button", onclick: function () { set(lastOffer("attorney")); } }, "The attorney's last offer") : null,
          lastOffer("freelancer") !== null ? h("button", { class: "ghost small", type: "button", onclick: function () { set(lastOffer("freelancer")); } }, "The freelancer's last offer") : null);
        var draftOut = h("div");
        var draftBtn = h("button", { class: "ghost small", type: "button", onclick: function () {
          D.clear(draftOut); draftOut.appendChild(h("p", { class: "small muted", text: "DELA is drafting..." }));
          api.post("/admin/disputes/draft", { id: x.id }).then(function (y) {
            D.clear(draftOut);
            if (!y.data.ok) throw new Error(y.data.reason === "ai_off" ? "Lawfecta's AI key is not set up." : y.data.reason);
            var g = y.data;
            draftOut.appendChild(h("div", { class: "soft", style: "margin:6px 0" }, D.aiLabel(), h("p", { text: g.summary }),
              (g.terms || []).length ? h("ul", { class: "small" }, g.terms.map(function (t) { return h("li", { text: t }); })) : null,
              h("p", { class: "small", text: "Suggested: " + D.money(g.release_cents) + " to the freelancer, " + D.money(g.refund_cents) + " back. " + (g.why || "") }),
              h("button", { class: "ghost small", type: "button", onclick: function () { set(g.release_cents); note.value = g.note || ""; } }, "Use this draft"),
              h("p", { class: "small muted", text: g.note_ai })));
          }).catch(function (e) { D.clear(draftOut); fail(e); });
        } }, "✦ Draft with DELA");
        c.appendChild(h("details", { open: x.status === "team_review" && !x.question_open }, h("summary", { text: "Decide" }),
          x.status === "notice" ? h("p", { class: "small notice", text: "The notice period is not over. You can decide after " + D.dateTime(x.notice_ends_at) + "." } ) : null,
          presets, draftBtn, draftOut, h("div", { class: "row", style: "flex-wrap:wrap;gap:8px;align-items:center" }, h("label", null, "To the freelancer ($)", rel), back), note,
          h("button", { class: "blue small", type: "button", onclick: function () {
            var c2 = dollars(rel.value);
            if (c2 === null) { fail(new Error("Type the amount to the freelancer.")); return; }
            if (!confirm("Decide this dispute? " + D.money(c2) + " goes to the freelancer and " + D.money((m.amount_cents || 0) - c2) + " back to the attorney, through Stripe straight away.")) return;
            api.post("/admin/disputes/resolve", { id: x.id, release_cents: c2, refund_cents: (m.amount_cents || 0) - c2, note: note.value }).then(function (y) {
              if (!y.data.ok) throw new Error(y.data.reason === "notice_not_over" ? "The notice period is not over yet" : y.data.reason === "say_why" ? "Write the decision and reasons" : y.data.reason === "chargeback_open" ? "A bank chargeback is open on this engagement" : y.data.reason);
              ok("Decided. Both members were told and the money moves."); disputesTab();
            }).catch(fail);
          } }, "Decide")));
        // Ask a question, extend, needs the lawyer
        var to = h("select", { "aria-label": "Ask whom" }, [["both", "Both"], ["attorney", "The attorney"], ["freelancer", "The freelancer"]].map(function (o) { return h("option", { value: o[0], text: o[1] }); }));
        var q = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Your question" });
        var days = h("input", { type: "number", min: "1", max: "14", value: "7", "aria-label": "More days", style: "width:80px" });
        c.appendChild(h("details", null, h("summary", { text: "Ask a question, give more time, or flag for the lawyer" }),
          h("label", null, "Ask whom", to), q, h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/admin/disputes/ask", { id: x.id, to: to.value, body: q.value }).then(function (y) { if (!y.data.ok) throw new Error(y.data.reason); ok("Asked. The decision clock waits for the answer."); disputesTab(); }).catch(fail);
          } }, "Send the question"),
          x.status === "notice" && !x.extended ? h("div", { class: "row", style: "margin-top:8px;gap:8px;align-items:center" }, h("label", null, "More days to settle (once)", days), h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/admin/disputes/extend", { id: x.id, days: Number(days.value) }).then(function (y) { if (!y.data.ok) throw new Error(y.data.reason); ok("More time given. Both members were told."); disputesTab(); }).catch(fail);
          } }, "Give more time")) : null,
          h("button", { class: "ghost small", type: "button", style: "margin-top:8px", onclick: function () {
            api.post("/admin/disputes/lawyer", { id: x.id, on: !x.needs_lawyer }).then(function (y) { if (!y.data.ok) throw new Error(y.data.reason); disputesTab(); }).catch(fail);
          } }, x.needs_lawyer ? "Clear the lawyer flag" : "Flag: needs the lawyer")));
        return c;
      }
      var openC = h("div", { class: "card" }, h("h2", { text: "Open disputes (" + all.filter(function (x) { return x.status === "notice" || x.status === "team_review"; }).length + ")" }));
      var doneC = h("div", { class: "card" }, h("h2", { text: "Closed in the last 90 days" }));
      all.forEach(function (x) { ((x.status === "notice" || x.status === "team_review") ? openC : doneC).appendChild(caseCard(x)); });
      if (!openC.querySelector("[data-dispute]")) openC.appendChild(h("p", { class: "muted", text: "No open disputes." }));
      if (!doneC.querySelector("[data-dispute]")) doneC.appendChild(h("p", { class: "muted", text: "None." }));
      // Money tools (finance)
      var tools = h("div", { class: "card" }, h("h2", { text: "Money tools" }), h("p", { class: "small muted", text: "Failed refunds and payouts are retried every day, 3 times, then listed here. Only the finance role can use these." }));
      (d.refunds_failed || []).forEach(function (x) {
        tools.appendChild(h("div", { class: "row small", style: "gap:8px;flex-wrap:wrap;margin:4px 0" }, h("span", { class: "grow", text: "Refund failed: " + D.money(x.amount_cents) + ", " + x.gig_title + " (" + x.retries + " retries)" }),
          h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/admin/money/retry", { kind: "refund", id: x.id }).then(function (y) { if (!y.data.ok) throw new Error(y.data.reason); ok("Sent to Stripe again."); disputesTab(); }).catch(fail); } }, "Retry now")));
      });
      (d.payouts_waiting || []).forEach(function (x) {
        tools.appendChild(h("div", { class: "row small", style: "gap:8px;flex-wrap:wrap;margin:4px 0" }, h("span", { class: "grow", text: (x.status === "failed" ? "Payout failed: " : "Payout held: ") + D.money(x.amount_cents) + " to " + x.freelancer + ", " + x.gig_title + (x.reason === "payout_account" ? " (waiting for the freelancer's payout setup)" : x.reason ? " (" + x.reason + ")" : "") }),
          x.status === "failed" ? h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/admin/money/retry", { kind: "payout", id: x.id }).then(function (y) { if (!y.data.ok) throw new Error(y.data.reason); ok("Sent to Stripe again."); disputesTab(); }).catch(fail); } }, "Retry now")
            : h("button", { class: "ghost small", type: "button", onclick: function () {
              var why = prompt("Why release this payout now?"); if (!why) return;
              api.post("/admin/payouts/release", { id: x.id, note: why }).then(function (y) { if (!y.data.ok) throw new Error(y.data.reason === "payout_account_not_ready" ? "The freelancer's payout setup is not ready yet" : y.data.reason === "in_dispute" ? "That milestone is in dispute" : y.data.reason); ok("Released."); disputesTab(); }).catch(fail);
            } }, "Release now")));
      });
      (d.paused || []).forEach(function (x) {
        tools.appendChild(h("div", { class: "row small", style: "gap:8px;flex-wrap:wrap;margin:4px 0" }, h("span", { class: "grow", text: "Paused since " + D.date(x.since) + ": " + x.gig_title + (x.chargeback_open ? " (bank chargeback still open)" : "") }),
          x.chargeback_open ? null : h("button", { class: "ghost small", type: "button", onclick: function () {
            var why = prompt("Why lift the pause?"); if (!why) return;
            api.post("/admin/engagements/unpause", { id: x.agreement_id, note: why }).then(function (y) { if (!y.data.ok) throw new Error(y.data.reason); ok("The engagement is running again. Both members were told."); disputesTab(); }).catch(fail);
          } }, "Lift the pause")));
      });
      if (!(d.refunds_failed || []).length && !(d.payouts_waiting || []).length && !(d.paused || []).length) tools.appendChild(h("p", { class: "muted", text: "Nothing waiting." }));
      body(h("div", null, top, openC, doneC, tools));
    }).catch(fail);
  }

  function payTab() {
    api.get("/admin/payments").then(function (r) {
      var d = r.data, t = d.totals || {}, sw = d.switches || {};
      var top = h("div", { class: "card" }, titled("h2", "Money on DELA", "pay"),
        h("p", { class: d.stripe_ready ? "small muted" : "notice", text: d.stripe_ready ? "Stripe is connected in " + (d.mode === "live" ? "LIVE mode (real money)" : "test mode (no real money)") + ". Live payments switch: " + (d.live_payments || "off") + "." : "Stripe is not connected yet. Attorneys see \"Payments are not set up\". It needs the STRIPE_SECRET_KEY (test key) and STRIPE_WEBHOOK_SECRET secrets in Supabase." }),
        h("p", { class: "small muted", text: ["engagements", "milestone_funding", "milestone_check", "engagement_export"].map(function (k) { return k + ": " + (sw[k] || "off"); }).join(" | ") }),
        h("div", { class: "kv" },
          h("div", null, "Charged", h("b", { text: D.money(t.charged || 0) })), h("div", null, "Held now", h("b", { text: D.money(t.held_now || 0) })),
          h("div", null, "Paid out", h("b", { text: D.money(t.paid_out || 0) })), h("div", null, "Refunded", h("b", { text: D.money(t.refunded || 0) })),
          h("div", null, "Attorney fees", h("b", { text: D.money(t.attorney_fees || 0) })), h("div", null, "Freelancer fees", h("b", { text: D.money(t.freelancer_fees || 0) }))));
      function list(title, items, empty, row) {
        var c = h("div", { class: "card" }, h("h2", { text: title + " (" + items.length + ")" }));
        if (!items.length) c.appendChild(h("p", { class: "muted", text: empty }));
        items.forEach(function (x) { c.appendChild(row(x)); });
        return c;
      }
      var human = list("Milestones waiting for a human review", d.human_reviews || [], "Nothing is waiting.", function (x) {
        var note = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Your note to the freelancer" });
        return h("div", { class: "card", style: "margin:8px 0" }, h("b", { text: x.gig_title + ", milestone " + x.seq + ": " + x.milestone }),
          h("p", { class: "small", text: "DELA's score: " + (x.score === null || x.score === undefined ? "none (DELA could not check it)" : x.score + " of 100") }),
          h("p", { class: "small", style: "white-space:pre-wrap", text: x.statement }),
          (x.findings || []).length ? h("ul", null, x.findings.map(function (f) { return h("li", { class: "small", text: (f.met === "yes" ? "Met" : f.met === "no" ? "Missing" : "Could not tell") + (f.required ? " (required)" : "") + ": " + f.text }); })) : null,
          note, h("div", { class: "row" },
            h("button", { class: "blue small", type: "button", onclick: function () { api.post("/admin/submissions/decide", { id: x.id, pass: true, note: note.value }).then(function (y) { if (!y.data.ok) throw new Error(y.data.reason); ok("Sent to the attorney for review"); payTab(); }).catch(fail); } }, "Passes: send to the attorney"),
            h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/admin/submissions/decide", { id: x.id, pass: false, note: note.value }).then(function (y) { if (!y.data.ok) throw new Error(y.data.reason); ok("Sent back to the freelancer"); payTab(); }).catch(fail); } }, "Needs more work")));
      });
      var disputes = h("div", { class: "card" }, h("h2", { text: "Disputes (" + (d.disputes || []).length + ")" }), h("p", { class: "small", text: (d.disputes || []).length ? "Open disputes are in the Disputes tab, with both sides, offers and the decision." : "No open disputes." }),
        h("button", { class: "ghost small", type: "button", onclick: function () { go("disputes"); } }, "Open the Disputes tab"));
      var oldDisputes = list("Disputes", d.disputes || [], "No open disputes.", function (x) {
        var rel = h("input", { type: "number", min: "0", step: "0.01", "aria-label": "To the freelancer ($)" }), ref = h("input", { type: "number", min: "0", step: "0.01", "aria-label": "Back to the attorney ($)" });
        var note = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Decision and reasons (both members see this)" });
        var cents = function (v) { return Math.round(Number(v || 0) * 100); };
        return h("div", { class: "card", style: "margin:8px 0" }, h("b", { text: x.gig_title + (x.milestone ? ", " + x.milestone + " (" + D.money(x.milestone_amount_cents) + ")" : "") }),
          h("p", { class: "small", text: "Opened by " + x.opened_by + ": " + x.reason }),
          h("p", { class: "small muted", text: x.status === "notice" ? "Notice period: the members talk it through until " + D.dateTime(x.notice_ends_at) + ". You can decide after that." : "Ready for your decision." }),
          h("div", { class: "row" }, h("label", null, "To the freelancer ($)", rel), h("label", null, "Back to the attorney ($)", ref)), note,
          h("button", { class: "blue small", type: "button", onclick: function () {
            if (!confirm("Decide this dispute? The money moves through Stripe straight away.")) return;
            api.post("/admin/disputes/resolve", { id: x.id, release_cents: cents(rel.value), refund_cents: cents(ref.value), note: note.value }).then(function (y) {
              if (!y.data.ok) throw new Error(y.data.reason === "split_must_equal" ? "The two amounts must add up to " + D.money(y.data.amount_cents) : y.data.reason === "notice_not_over" ? "The notice period is not over yet" : y.data.reason); ok("Decided. Both members were told."); payTab();
            }).catch(fail);
          } }, "Decide"));
      });
      var cbs = list("Chargebacks (open)", d.chargebacks || [], "None open.", function (x) {
        return h("p", { class: "small", text: D.dateTime(x.created_at) + ": " + D.money(x.amount_cents) + " (" + (x.reason || "no reason given") + "). The engagement is paused. Answer it in Stripe's dashboard before Stripe's deadline." });
      });
      var waiting = list("Payments waiting or failed (30 days)", d.waiting_payment || [], "None.", function (x) {
        return h("p", { class: "small", text: D.dateTime(x.created_at) + ", " + x.gig_title + ": " + D.money(x.amount_cents) + ", " + x.status + (x.failure ? " (" + x.failure + ")" : "") });
      });
      var held = list("Payouts held or failed", d.payouts_held || [], "None.", function (x) {
        return h("p", { class: "small", text: x.freelancer + ": " + D.money(x.amount_cents) + " (" + (x.reason === "payout_account" ? "waiting for the freelancer's payout setup" : x.reason || "failed") + ")" });
      });
      var late = list("Reviews past their deadline", d.overdue_reviews || [], "None.", function (x) {
        return h("p", { class: "small", text: x.gig_title + ", milestone " + x.seq + ": " + x.attorney + " was due " + D.dateTime(x.due) + ". Contact the attorney. Silence never pays out on its own." });
      });
      var long = list("Money held a long time", d.long_held || [], "None.", function (x) {
        return h("p", { class: "small", text: x.gig_title + ", milestone " + x.seq + ": " + D.money(x.amount_cents) + " paid " + D.date(x.funded_at) });
      });
      var eng = h("div", { class: "card" }, h("h2", { text: "Engagements (last 60 days)" }));
      if (!(d.engagements || []).length) eng.appendChild(h("p", { class: "muted", text: "None yet." }));
      else eng.appendChild(h("div", { class: "scroll" }, h("table", { class: "stack" }, h("thead", null, h("tr", null, ["Gig", "Attorney", "Freelancer", "Total", "Status", "Updated"].map(function (x) { return h("th", { text: x }); }))),
        h("tbody", null, d.engagements.map(function (e) {
          return h("tr", null, h("td", { "data-label": "Gig", text: e.gig_title }), h("td", { "data-label": "Attorney", text: e.attorney }), h("td", { "data-label": "Freelancer", text: e.freelancer }),
            h("td", { "data-label": "Total", text: D.money(e.total_cents) }), h("td", { "data-label": "Status", text: AGW[e.status] || e.status }), h("td", { "data-label": "Updated", text: D.dateTime(e.updated_at) }));
        })))));
      var led = h("details", { class: "card" }, h("summary", { text: "The ledger (latest 50 entries, never edited)" }),
        h("ul", null, (d.ledger || []).map(function (l) { return h("li", { class: "small", text: D.dateTime(l.created_at) + " | " + l.gig_title + " | " + l.kind.split("_").join(" ") + " " + D.money(l.amount_cents) + (l.note ? " | " + l.note : "") }); })));
      body(h("div", null, pageHead("Payments", "pay"), top, human, disputes, cbs, waiting, held, late, long, eng, led));
    }).catch(fail);
  }

  // ---------- Gigs (Step 4): open gigs, proposals by plan, held messages ----------
  var GIG_WORDS = { draft: "Draft", open: "Open", paused: "Paused", closed: "Closed", filled: "Filled", canceled: "Canceled" };
  var KIND_WORDS = { contact_details: "contact details", payment_outside: "payment outside Lawfecta", off_platform: "working outside Lawfecta", copied_engagement: "copies an engagement's text but is not linked to it" };
  function gigsTab() {
    api.get("/admin/gigs").then(function (r) {
      var d = r.data;
      var sw = d.switches || {};
      var swText = ["flex_gigs", "public_gigs", "talent_search", "conduct_review", "member_insights", "multiple_hires"].map(function (k) { return k + ": " + (sw[k] || "off"); }).join(" | ");
      var flags = h("div", { class: "card" }, titled("h2", "Held for a check (" + d.flags.length + ")", "gigs"));
      if (!d.flags.length) flags.appendChild(h("p", { class: "muted", text: "Nothing is waiting." }));
      d.flags.forEach(function (f) {
        var note = h("input", { style: "width:100%", placeholder: "Note (saved in the audit log)", "aria-label": "Note" });
        function decide(clear) {
          api.post("/admin/conduct/decide", { id: f.id, clear: clear, note: note.value }).then(function (x) { if (!x.data.ok) throw new Error(x.data.reason); ok(f.object_type === "gig" ? (clear ? "Cleared; the gig stays open" : "Gig paused; the agency was told") : clear ? "Delivered" : "Not delivered; the member was told"); gigsTab(); }).catch(fail);
        }
        flags.appendChild(h("div", { class: "card", style: "margin:8px 0" },
          h("div", { class: "row" }, h("b", { class: "grow", text: f.person + " (" + f.bd_member_id + "): a " + f.object_type + (f.gig_title ? " on \"" + f.gig_title + "\"" : "") }), h("span", { class: "badge held", text: (f.kinds || []).map(function (k) { return KIND_WORDS[k] || k; }).join(", ") })),
          h("p", { class: "small", text: f.excerpt }), h("div", { class: "small muted", text: "Found by " + (f.source === "ai" ? "DELA's AI" : "DELA's rules") + ", " + D.dateTime(f.created_at) }), note,
          h("div", { class: "row", style: "margin-top:6px" }, h("button", { class: "blue small", type: "button", onclick: function () { decide(true); } }, f.object_type === "gig" ? "It is fine" : "It is fine: deliver it"),
            h("button", { class: "danger small", type: "button", onclick: function () { decide(false); } }, f.object_type === "gig" ? "Pause the gig" : "Do not deliver"))));
      });
      var list = h("div", { class: "card" }, h("h2", { text: "Gigs (" + d.gigs.length + ")" }), h("p", { class: "small muted", text: "Open and paused gigs, and gigs changed in the last 30 days. Switches: " + swText }));
      if (!d.gigs.length) list.appendChild(h("p", { class: "muted", text: "No gigs yet." }));
      else list.appendChild(h("div", { class: "scroll" }, h("table", { class: "stack" },
        h("thead", null, h("tr", null, ["Gig", "Firm", "Status", "Budget", "Proposals", "Matches", "Held", ""].map(function (t) { return h("th", { text: t }); }))),
        h("tbody", null, d.gigs.map(function (g) {
          var paused = g.paused_by_team;
          return h("tr", null, h("td", { "data-label": "Gig" }, h("b", { text: g.title }), h("div", { class: "small muted", text: "by " + g.by + (g.closes_at ? ", closes " + D.dateTime(g.closes_at) : "") })),
            h("td", { "data-label": "Firm", text: g.firm }), h("td", { "data-label": "Status" }, h("span", { class: "badge " + (g.status === "open" ? "ready" : g.status === "paused" ? "held" : "C"), text: GIG_WORDS[g.status] || g.status }), paused && g.pause_reason ? h("div", { class: "small muted", text: g.pause_reason }) : null),
            h("td", { "data-label": "Budget", text: D.money(g.budget_min_cents) + " to " + D.money(g.budget_max_cents) }), h("td", { "data-label": "Proposals", text: String(g.proposals) }),
            h("td", { "data-label": "Matches", text: String(g.matches) }), h("td", { "data-label": "Held", text: String(g.flags) }),
            h("td", null, g.status === "open" || g.status === "paused" ? h("button", { class: "ghost small", type: "button", onclick: function () {
              var why = paused ? "" : prompt("Why pause \"" + g.title + "\"? The attorney is told.");
              if (!paused && why === null) return;
              api.post("/admin/gigs/pause", { id: g.id, pause: !paused, reason: why || "" }).then(function (x) { if (!x.data.ok) throw new Error(x.data.reason); ok(paused ? "Open again" : "Paused"); gigsTab(); }).catch(fail);
            } }, paused ? "Resume" : "Pause") : null));
        })))));
      var plans = h("div", { class: "card" }, h("h2", { text: "Proposals sent this month, by plan" }),
        d.proposals_by_plan.length ? h("div", { class: "scroll" }, h("table", null, h("thead", null, h("tr", null, ["Plan", "Proposals", "Freelancers"].map(function (t) { return h("th", { text: t }); }))),
          h("tbody", null, d.proposals_by_plan.map(function (x) { return h("tr", null, h("td", { text: planName(x.plan) }), h("td", { text: String(x.sent) }), h("td", { text: String(x.senders) })); })))) : h("p", { class: "muted", text: "None yet this month." }));
      body(h("div", null, pageHead("Gigs", "gigs"), flags, list, plans));
    }).catch(fail);
  }

  // ---------- Tech catalog (Step 4): upload a CSV, preview what changes, confirm; pause one tool; history ----------
  // ---------- Security: questions from the /security page, Confidential materials counts, dispute reviews ----------
  // Agencies (Step 7d): the one-time business name and state check, and a hand-raised seat limit for one agency
  // ---------- Step 7c: monthly recurring engagements (renewals due, failed and paused, cancellations, the emergency stop) ----------
  function recurringTab() {
    var el = h("div", { class: "card" }, h("h2", { text: "Recurring" }), h("p", { class: "muted", text: "Loading..." }));
    body(el);
    api.get("/admin/monthly").then(function (r) {
      var d = r.data || r;
      D.clear(el);
      el.appendChild(h("h2", { text: "Recurring" }));
      el.appendChild(h("p", { class: "small muted", text: "Monthly engagements: renewals due, failed and paused ones, and cancellations. Renewals run every hour; each month is charged once, on its billing day, with the saved payment method." }));
      el.appendChild(h("div", { class: "row", style: "margin:6px 0" },
        h("span", { class: "badge " + (d.stopped ? "bad" : "ready"), text: d.stopped ? "Renewal charges are stopped" : "Renewal charges are running" }),
        h("button", { class: d.stopped ? "blue small" : "danger small", type: "button", onclick: function () {
          api.post("/admin/monthly/stop", { on: !d.stopped }).then(function (x) { if (!(x.data || x).ok) throw new Error("not saved"); ok(d.stopped ? "Renewal charges run again" : "Renewal charges stopped. Reminders still go out; nothing is charged."); recurringTab(); }).catch(fail);
        } }, d.stopped ? "Start renewal charges again" : "Emergency stop: no renewal charges")));
      var list = d.engagements || [];
      if (!list.length) { el.appendChild(h("p", { class: "muted", text: "No monthly engagements yet." })); return; }
      var words = { setup: "Not started", active: "Running", paused: "Paused: payment failed", ended: "Ended" };
      list.forEach(function (x) {
        el.appendChild(h("div", { style: "border-top:1px solid var(--line);padding:8px 0" },
          h("div", { class: "row" }, h("b", { class: "grow", text: x.title }), h("span", { class: "badge " + (x.status === "paused" ? "bad" : x.status === "active" ? "ready" : "C"), text: words[x.status] || x.status })),
          h("p", { class: "small", style: "margin:4px 0", text: x.attorney + " hires " + x.freelancer + " | " + D.money(x.price_cents) + " a month | months paid: " + x.months_paid +
            (x.next_bill_on ? " | next charge " + D.date(x.next_bill_on) : "") + (x.failed_on ? " | failed " + D.date(x.failed_on) : "") + (x.cancel_effective ? " | canceled, ends " + D.date(x.cancel_effective) : "") + (x.ended_reason ? " | ended: " + x.ended_reason : "") }),
          d.staging && (x.status === "active" || x.status === "paused") ? h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/admin/monthly/run-now", { agreement_id: x.agreement_id }).then(function (y) { var z = y.data || y; if (z.ok === false) throw new Error(z.reason); ok("Renewal run: " + JSON.stringify(z.run || {})); recurringTab(); }).catch(fail);
          } }, "Run the renewal now (test site)") : null));
      });
    }).catch(fail);
    // Step 7c part 2: standing arrangements and their spend this month
    var st = h("div", { class: "card", id: "admin-standing" }, h("h2", { text: "Standing arrangements" }), h("p", { class: "muted", text: "Loading..." }));
    mainEl.appendChild(st);
    api.get("/admin/standing").then(function (r) {
      var d = r.data || r;
      D.clear(st);
      st.appendChild(h("h2", { text: "Standing arrangements" }));
      st.appendChild(h("p", { class: "small muted", text: "Limited automatic repeat hiring. Each one names a price per job, a monthly cap, the most jobs open at once and an end date. Off on Live until counsel approves (switch auto_repeat_hiring)." }));
      var list = d.arrangements || [];
      if (!list.length) { st.appendChild(h("p", { class: "muted", text: "No standing arrangements yet." })); return; }
      list.forEach(function (x) {
        st.appendChild(h("div", { style: "border-top:1px solid var(--line);padding:8px 0" }, h("div", { class: "row" }, h("b", { class: "grow", text: x.firm + " hires " + x.freelancer }), h("span", { class: "badge " + (x.status === "active" ? "ready" : x.status === "needs_review" ? "bad" : "C"), text: x.status })),
          h("p", { class: "small", style: "margin:4px 0", text: D.money(x.price_cents) + " per job | spend this month " + D.money(x.spend_cents) + " of " + D.money(x.cap_cents) + " | " + x.open + " of " + x.max_open + " open | jobs " + x.hires + ", declined " + x.declined + " | until " + D.date(x.end_on) })));
      });
    }).catch(fail);
  }

  // Step 9: the Pro trial check (docs/briefs/step-9-pro-trial-downgrade.md). The mode, a run on demand, the run log and
  // every member the last 3 runs would change (Dry run) or changed (Live). Dry run changes nothing in BD or by email.
  var TRIAL_ACTION = { track: "Start tracking the trial", remind: "Send the \"Your Pro trial ends soon\" email", convert: "Mark converted", downgrade: "Move to Free", restore: "Bring back hidden content", error: "Could not check" };
  var TRIAL_WHY = { new_pro_signup: "New signup on Pro", ends_soon: "Trial ends soon (the reminder setting)", paid_pro: "Paid Pro invoice", paid_plus: "Paid Plus invoice", upgraded_to_agency: "Upgraded to Agency Business",
    trial_ended_unpaid: "Trial ended, Pro invoice not paid", plus_unpaid_at_trial_end: "Trial ended, moved to Plus but the Plus invoice is not paid", finishing_downgrade: "Finishing a downgrade that stopped halfway",
    upgraded_after_downgrade: "Upgraded after the downgrade", read_failed: "BD could not be read" };
  var TRIAL_HOW = { daily: "Daily", manual: "Run now", login: "At sign-in" };
  // Plain words for why a run stopped (functionality test 2026-11-08: the code name showed)
  function TRIAL_STOP(e) {
    e = String(e || "");
    if (e.indexOf("bd_trial_api_not_confirmed") >= 0) return "BD is not connected yet, so nothing was checked. The run is in the list below.";
    if (e.indexOf("bd_permission_needed") >= 0) return "BD refused the check: DELA's BD API key needs more permissions (Users, User Metadata, Single Image Posts). The run is in the list below.";
    if (e === "another_check_running") return "Another check is running. Try again in a few minutes.";
    return "The check stopped: " + e;
  }
  function trialsTab() {
    var el = h("div", { class: "card", id: "admin-trials" }, h("h2", { text: "Pro trial check" }), h("p", { class: "muted", text: "Loading..." }));
    body(el);
    api.get("/admin/trial").then(function (r) {
      var d = r.data || r, cfg = d.settings || {}, live = cfg.mode === "live", runs = d.runs || [];
      D.clear(el);
      el.appendChild(h("h2", { text: "Pro trial check" }));
      // The rule in words, from the settings (AI review 0.10.0, payments 6)
      var pl = cfg.plans || {}, hour = Number(cfg.run_hour), at = hour === 0 ? "12:00 AM" : hour < 12 ? hour + ":00 AM" : hour === 12 ? "12:00 PM" : (hour - 12) + ":00 PM";
      el.appendChild(h("p", { class: "small muted", text: "Every day at " + at + " Pacific, DELA checks freelancers on plans " + (pl.trial || []).join(" or ") + " whose trial is active. An unpaid trial moves to Free (" + pl.free + "); a paid invoice for the plan they are on marks them converted. Plans " + (pl.never || []).join(", ") + " are never changed (the attorney and lifetime plans). Dry run lists what it would do and changes nothing." }));
      // Only the latest run says whether BD is connected now; an older run from before the connection does not count (2026-11-08)
      var notConnected = !!runs[0] && String(runs[0].error || "").indexOf("bd_trial_api_not_confirmed") >= 0;
      el.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;gap:8px;margin:6px 0" },
        h("span", { class: "badge " + (cfg.on ? "ready" : "C"), text: cfg.on ? "Daily check: on" : "Daily check: off (switch bd_trial_downgrade)" }),
        h("span", { class: "badge " + (live ? "bad" : "ready"), id: "trial-mode", text: "Trial downgrade mode: " + (live ? "Live" : "Dry run") + (live && !cfg.on ? " (lists only while the daily check is off)" : "") }),
        notConnected ? h("span", { class: "badge held", text: "BD not connected yet: waiting for the BD check" }) : null));
      var runBtn = h("button", { class: "blue small", type: "button" }, live ? "Run the check now (Live: changes BD)" : "Run the check now (Dry run)");
      runBtn.addEventListener("click", function () {
        if (live && !confirm("Live mode: this moves unpaid trial members to Free in BD and emails them. Run it now?")) return;
        runBtn.disabled = true;
        api.post("/admin/trial/run", {}).then(function (x) { var y = x.data || x; ok(y.error ? TRIAL_STOP(y.error) : "Checked " + y.checked + (y.checked === 1 ? " member." : " members.")); trialsTab(); }).catch(function (e) { runBtn.disabled = false; fail(e); });
      });
      var modeBtn = h("button", { class: live ? "ghost small" : "danger small", type: "button" }, live ? "Switch to Dry run" : "Switch to Live");
      modeBtn.addEventListener("click", function () {
        if (!live && !confirm("Switch the trial check to Live? From the next run it changes plans in BD, cancels unpaid trial invoices and sends the trial emails. Do this only after 3 clean dry-run days.")) return;
        api.post("/admin/settings", { key: "trial.downgrade_mode", value: live ? "dry_run" : "live", status: "C", reason: "Changed in the Trials tab" }).then(function (x) { var y = x.data || x; if (y.ok === false) throw new Error(y.reason || "not saved"); ok(live ? "Dry run: the check lists and changes nothing." : "Live: the next run changes BD."); trialsTab(); }).catch(fail);
      });
      el.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;gap:8px" }, runBtn, modeBtn));
      el.appendChild(h("h3", { text: "Runs" }));
      if (!runs.length) el.appendChild(h("p", { class: "muted", text: "No runs yet." }));
      else el.appendChild(h("div", { class: "scroll" }, h("table", { class: "stack", style: "width:100%" },
        h("thead", null, h("tr", null, ["Started", "How", "Mode", "Members checked", "What it found", "Problem"].map(function (t) { return h("th", { scope: "col", text: t }); }))),
        h("tbody", null, runs.map(function (x) {
          var c = x.counts || {}, keys = Object.keys(c);
          return h("tr", null, h("td", { "data-label": "Started", text: D.dateTime ? D.dateTime(x.started_at) : new Date(x.started_at).toLocaleString() }), h("td", { "data-label": "How", text: TRIAL_HOW[x.trigger] || x.trigger }),
            h("td", { "data-label": "Mode", text: x.mode === "live" ? "Live" : "Dry run" }), h("td", { "data-label": "Members checked", text: String(x.checked) }),
            h("td", { "data-label": "What it found", text: keys.length ? keys.map(function (k) { return c[k] + " " + (TRIAL_ACTION[k] || k).toLowerCase(); }).join("; ") : "Nothing to do" }),
            h("td", { "data-label": "Problem", text: x.error ? (x.error.indexOf("bd_trial_api_not_confirmed") >= 0 ? "BD not connected yet" : x.error.indexOf("bd_permission_needed") >= 0 ? "DELA's BD key needs more permissions" : x.error) : "" }));
        })))));
      var ev = d.events || [];
      el.appendChild(h("h3", { text: "Members in the last 3 runs" }));
      if (!ev.length) { el.appendChild(h("p", { class: "muted", text: "No member to change in the last 3 runs." })); return; }
      el.appendChild(h("div", { class: "scroll" }, h("table", { class: "stack", style: "width:100%", id: "trial-members" },
        h("thead", null, h("tr", null, ["Member", "BD user ID", "Plan", "What", "Why", "Trial ends", "Invoice", "Result"].map(function (t) { return h("th", { scope: "col", text: t }); }))),
        h("tbody", null, ev.map(function (x) {
          var dry = x.mode !== "live";
          return h("tr", null, h("td", { "data-label": "Member", text: x.name }), h("td", { "data-label": "BD user ID", text: String(x.bd_user_id) }), h("td", { "data-label": "Plan", text: String(x.plan_id || "") }),
            h("td", { "data-label": "What" }, h("span", { text: (dry ? "Would: " : "") + (TRIAL_ACTION[x.action] || x.action) }), x.next_step ? h("div", { class: "small muted", style: "margin-top:4px", text: x.next_step }) : null), h("td", { "data-label": "Why", text: TRIAL_WHY[x.reason] || x.reason }),
            h("td", { "data-label": "Trial ends", text: x.trial_ends_at ? D.date(x.trial_ends_at) : "" }), h("td", { "data-label": "Invoice", text: { paid: "Paid", unpaid: "Unpaid", none: "None" }[x.invoice_status] || x.invoice_status }),
            h("td", { "data-label": "Result" }, h("span", { text: dry ? "Listed only" : x.done ? "Done" : "Not finished: " + x.error }),
              x.manual ? h("div", { class: "small", style: "margin-top:4px;font-weight:700", text: "To do in BD admin: " + x.manual }) : null));
        })))));
    }).catch(fail);
  }

  // Step 9b: every attorney's plan, usage and AI cost this month; Resync plan from BD; bonus credits with a note
  function usageTab() {
    var el = h("div", { class: "card" }, h("h2", { text: "Usage" }), h("p", { class: "muted", text: "Loading..." }));
    body(el);
    api.get("/admin/usage").then(function (r) {
      var d = r.data || r;
      D.clear(el);
      el.appendChild(h("h2", { text: "Usage" }));
      el.appendChild(h("p", { class: "small muted", text: "Attorneys' saved documents, DELA actions this month (weighted AI credits on Lawfecta's AI) and storage. AI cost is worked out from the provider prices in Settings (ai.price_cents_per_mtok). Anyone above " + D.money(d.flag_cents) + " this month is flagged. Blocking at 100% follows the switch usage_limits_enforced, now: " + (d.enforced_switch || "off") + "." }));
      var list = d.attorneys || [];
      if (!list.length) { el.appendChild(h("p", { class: "muted", text: "No attorneys yet." })); return; }
      function frac(u, l) { return l === null || l === undefined ? u + " (no limit)" : u + " of " + l; }
      function mb(b) { return b === null || b === undefined ? "" : (b >= 1073741824 ? (Math.round(b / 107374182.4) / 10) + " GB" : Math.round(b / 1048576) + " MB"); }
      el.appendChild(h("div", { class: "scroll" }, h("table", { class: "stack", style: "width:100%" },
        h("thead", null, h("tr", null, ["Attorney", "Plan", "Documents", "DELA actions", "Storage", "AI cost this month", ""].map(function (t) { return h("th", { text: t }); }))),
        h("tbody", null, list.map(function (x) {
          var flagged = Number(x.ai_cost_cents) > d.flag_cents;
          var amt = h("input", { type: "number", min: "1", max: "100000", step: "1", "aria-label": "Bonus actions for " + x.name, style: "width:90px" });
          var note = h("input", { "aria-label": "Note for the bonus for " + x.name, placeholder: "Why (required)", style: "width:160px" });
          return h("tr", null,
            h("td", { "data-label": "Attorney" }, h("b", { text: x.name }), h("div", { class: "small muted", text: (x.email || "") + " | BD " + x.bd_member_id })),
            h("td", { "data-label": "Plan", text: x.plan + (x.plan_source === "staff_grant" ? " (set by the team)" : "") }),
            h("td", { "data-label": "Documents", text: frac(x.playbooks, x.playbooks_limit) }),
            h("td", { "data-label": "DELA actions", text: frac(x.actions, x.actions_limit) + (x.bonus ? " (includes " + x.bonus + " bonus)" : "") + (x.shared_with ? ", shared with " + x.shared_with : "") }),
            h("td", { "data-label": "Storage", text: mb(x.storage_bytes) + (x.storage_limit_bytes ? " of " + mb(x.storage_limit_bytes) : "") }),
            h("td", { "data-label": "AI cost this month" }, h("span", { class: flagged ? "badge bad" : "", text: D.money(Math.round(Number(x.ai_cost_cents) || 0)) + (flagged ? " over " + D.money(d.flag_cents) : "") })),
            h("td", null, h("div", { class: "row", style: "flex-wrap:wrap;gap:6px" },
              h("button", { class: "ghost small", type: "button", onclick: function () {
                api.post("/admin/usage/resync", { person_id: x.person_id }).then(function (y) { var z = y.data || y; if (z.ok === false) throw new Error(z.reason); ok(z.changed ? "Plan updated: " + z.from + " to " + z.to : "The plan is up to date."); usageTab(); }).catch(fail);
              } }, "Resync plan"),
              amt, note, (function () {
                // One request ID per form, and the button waits for the answer, so a double click adds the bonus once
                // (AI review 0.9.0, payments 2)
                var req = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "b" + Date.now() + Math.random().toString(36).slice(2);
                var go = h("button", { class: "ghost small", type: "button" }, "Grant bonus actions");
                // A changed amount or note is a new request (AI review 0.9.1, payments 1)
                [amt, note].forEach(function (el) { el.addEventListener("input", function () { req = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "b" + Date.now() + Math.random().toString(36).slice(2); }); });
                go.addEventListener("click", function () {
                  if (go.disabled) return;
                  go.disabled = true;
                  api.post("/admin/usage/bonus", { person_id: x.person_id, amount: Number(amt.value), note: note.value, request_id: req }).then(function (y) {
                    var z = y.data || y; if (z.ok === false) throw new Error(z.reason); ok("Bonus actions added for this month."); usageTab();
                  }).catch(function (e) { go.disabled = false; fail(e); });
                });
                return go;
              })())));
        })))));
    }).catch(fail);
  }

  function agenciesTab() {
    var el = h("div", { class: "card" }, h("h2", { text: "Agencies" }), h("p", { class: "muted", text: "Loading..." }));
    body(el);
    api.get("/admin/agencies").then(function (r) {
      var d = r.data || r;
      D.clear(el);
      el.appendChild(h("h2", { text: "Agencies" }));
      var sw = d.switches || {};
      el.appendChild(h("p", { class: "small muted", text: "A Business freelancer becomes an agency. Check each agency's business name and state once. Switches: " +
        Object.keys(sw).sort().map(function (k) { return k + " " + sw[k]; }).join(", ") + "." }));
      if (!(d.agencies || []).length) { el.appendChild(h("p", { class: "muted", text: "No agencies yet." })); return; }
      (d.agencies || []).forEach(function (g) {
        var note = h("input", { "aria-label": "Note for " + g.name, placeholder: "Note (shown to the owner if the details need a change)", maxlength: "300", style: "min-width:260px" });
        var seats = h("input", { type: "number", min: "1", max: "500", "aria-label": "Seat limit for " + g.name, style: "width:90px", value: g.seats && g.seats.override ? String(g.seats.limit) : "" });
        var st = g.seats || {};
        el.appendChild(h("div", { style: "border-top:1px solid var(--line);padding:10px 0" },
          h("div", { class: "row" }, h("b", { class: "grow", text: g.name }), h("span", { class: "badge " + (g.checked ? "ready" : "C"), text: g.checked ? "Checked " + D.date(g.checked_at) : "Not checked yet" })),
          h("p", { class: "small", style: "margin:4px 0", text: "Business name: " + (g.business_name || "not given") + " | State: " + (g.business_state || "not given") + " | Owner: " + g.owner + " (" + (g.owner_email || "") + ")" +
            " | " + (g.active ? "Active" : "Not active (owner is not on Business)") + " | Seats: " + (st.used || 0) + " of " + (st.limit || 0) + " | Engagements: " + (g.engagements || 0) }),
          g.note ? h("p", { class: "small muted", text: "Last note: " + g.note }) : null,
          h("div", { class: "row", style: "flex-wrap:wrap" }, note,
            h("button", { class: "blue small", type: "button", onclick: function () { api.post("/admin/agencies/check", { org_id: g.org_id, ok: true, note: note.value }).then(done("Checked. The owner was told.")).catch(fail); } }, "Business details are right"),
            h("button", { class: "ghost small", type: "button", onclick: function () {
              if (!note.value.trim()) { D.toast(app, "Write a note saying what to change.", true); return; }
              api.post("/admin/agencies/check", { org_id: g.org_id, ok: false, note: note.value }).then(done("Sent. The owner was asked to change the details.")).catch(fail);
            } }, "Ask for a change")),
          h("div", { class: "row", style: "flex-wrap:wrap;margin-top:6px" }, h("span", { class: "small", text: "Seat limit for this agency (empty for the plan's limit):" }), seats,
            h("button", { class: "ghost small", type: "button", onclick: function () {
              var v = seats.value.trim();
              api.post("/admin/agencies/seats", { org_id: g.org_id, limit: v === "" ? null : Number(v) }).then(done(v === "" ? "Back to the plan's seat limit" : "Seat limit set to " + v)).catch(fail);
            } }, "Save seat limit"))));
      });
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    function done(msg) { return function (x) { var p = x.data || x; if (p && p.ok === false) { fail({ message: p.reason }); return; } ok(msg); agenciesTab(); }; }
    // Every agency bench and its split (members see only their own; the attorney never sees a split)
    var bc = h("div", { class: "card" }, h("h2", { text: "Agency benches and splits" }), h("p", { class: "muted", text: "Loading..." }));
    if (el.parentNode) el.parentNode.appendChild(bc);
    api.get("/admin/agencies/bench").then(function (r) {
      var d = r.data || r, pc = function (b) { var n = b / 100; return (n % 1 === 0 ? String(n) : n.toFixed(1)) + "%"; };
      D.clear(bc);
      bc.appendChild(h("h2", { text: "Agency benches and splits" }));
      bc.appendChild(h("p", { class: "small muted", text: "The split is private between the agency and the freelancer. The agency pays the freelancer platform fee from its share." }));
      if (!(d.bench || []).length) { bc.appendChild(h("p", { class: "muted", text: "No benches yet." })); return; }
      (d.bench || []).forEach(function (b) {
        bc.appendChild(h("div", { class: "small", style: "border-top:1px solid var(--line);padding:6px 0", text: b.agency + " | " + b.name + " (" + (b.email || "") + ") | " + b.status +
          (b.split ? " | split " + pc(b.split.agency_bps) + " agency / " + pc(10000 - b.split.agency_bps) + " freelancer (version " + b.split.version + ")" : " | not signed by both yet") +
          (b.waiting ? " | proposed " + pc(b.waiting.agency_bps) + " agency, waiting for " + (b.waiting.agency_signed ? "the freelancer" : "the agency") : "") + (b.inactive ? " | Inactive: Free plan" : "") }));
      });
    }).catch(function (e) { D.clear(bc); bc.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    // Every milestone an agency gave to a bench member, with the split for that job
    var ac = h("div", { class: "card" }, h("h2", { text: "Bench assignments" }), h("p", { class: "muted", text: "Loading..." }));
    if (el.parentNode) el.parentNode.appendChild(ac);
    api.get("/admin/agencies/assignments").then(function (r) {
      var d = r.data || r, pc = function (b) { var n = b / 100; return (n % 1 === 0 ? String(n) : n.toFixed(1)) + "%"; };
      D.clear(ac);
      ac.appendChild(h("h2", { text: "Bench assignments" }));
      if (!(d.assignments || []).length) { ac.appendChild(h("p", { class: "muted", text: "None yet." })); return; }
      (d.assignments || []).forEach(function (x) {
        ac.appendChild(h("div", { class: "small", style: "border-top:1px solid var(--line);padding:6px 0", text: x.agency + " | " + x.job + ", milestone " + x.seq + " | " + x.name + " | split " + pc(x.agency_bps) + " agency / " + pc(10000 - x.agency_bps) + " | " + x.status + " | milestone " + x.milestone_status }));
      });
    }).catch(function (e) { D.clear(ac); ac.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }
  function securityTab() {
    var el = h("div");
    var msgs = h("div", { class: "card" }, h("h2", { text: "Security questions from the website" }), h("p", { class: "muted", text: "Loading..." }));
    var conf = h("div", { class: "card" }, h("h2", { text: "Confidential materials" }), h("p", { class: "muted", text: "Loading..." }));
    el.appendChild(msgs); el.appendChild(conf);
    body(el);
    api.get("/admin/security").then(function (r) {
      var d = r.data || r;
      D.clear(msgs);
      msgs.appendChild(h("h2", { text: "Security questions from the website (" + (d.open || 0) + " open)" }));
      msgs.appendChild(h("p", { class: "small muted", text: "Sent from the contact form on the /security page. Each one is also emailed to the team. Reply from your own email." }));
      if (!(d.messages || []).length) msgs.appendChild(h("p", { class: "muted", text: "None yet." }));
      (d.messages || []).forEach(function (m) {
        msgs.appendChild(h("div", { style: "border-top:1px solid var(--line);padding:8px 0" },
          h("div", { class: "row" }, h("b", { class: "grow", text: (m.name || "No name") + " (" + m.email + ")" + (m.topic ? ": " + m.topic : "") }), h("span", { class: "small muted", text: D.dateTime(m.at) })),
          h("p", { style: "white-space:pre-wrap;margin:4px 0", text: m.message }),
          m.handled ? h("span", { class: "badge ready", text: "Handled" }) : h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/admin/security/handled", { id: m.id }).then(function () { ok("Marked as handled"); securityTab(); }).catch(fail);
          } }, "Mark as handled")));
      });
    }).catch(function (e) { D.clear(msgs); msgs.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    api.get("/admin/confidential").then(function (r) {
      var d = r.data || r;
      D.clear(conf);
      conf.appendChild(h("h2", { text: "Confidential materials" }));
      conf.appendChild(h("p", { class: "small muted", text: "Counts only. The team never sees file names, messages or links here. Switch: " + (d.switch || "off") + (d.paused ? ". Paused by the emergency stop." : ".") + " Virus scanner: " + (d.scanner === "none" ? "none (test site only)" : d.scanner) + "." }));
      var kv = [["Engagements with files", d.engagements], ["Files", d.files], ["Messages", d.messages], ["Storage used (MB)", Math.round((d.bytes || 0) / 104857.6) / 10],
        ["Files not virus scanned", d.not_scanned], ["Uploads refused, last 30 days", d.refused_30d], ["Files due for deletion in 7 days", d.deletions_due_7d], ["Files deleted, last 30 days", d.deleted_30d],
        ["Secure links open", d.links_open], ["Links expired, last 30 days", d.links_expired_30d], ["Jobs marked sensitive", d.sensitive_jobs]];
      conf.appendChild(h("div", { class: "kv" }, kv.map(function (x) { return h("div", null, x[0], h("b", { text: String(x[1] || 0) })); })));
      conf.appendChild(h("h3", { text: "Disputes asking to open the materials" }));
      conf.appendChild(h("p", { class: "small muted", text: "A reviewer may open the materials only when both people agreed in DELA. Every open is logged and shown to both people." }));
      if (!(d.reviews || []).length) conf.appendChild(h("p", { class: "muted", text: "None open." }));
      (d.reviews || []).forEach(function (rv) {
        var area = h("div");
        conf.appendChild(h("div", { class: "row" }, h("span", { class: "grow", text: "Dispute on engagement " + String(rv.agreement_id).slice(0, 8) + ": " + rv.agreed + " of 2 agreed" }),
          rv.agreed >= 2 ? h("button", { class: "ghost small", type: "button", onclick: function () { reviewerView(area, rv.agreement_id); } }, "Open the materials") : null));
        conf.appendChild(area);
      });
    }).catch(function (e) { D.clear(conf); conf.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }
  function reviewerView(area, agreementId) {
    D.clear(area);
    api.get("/admin/confidential/review?agreement=" + agreementId).then(function (r) {
      var d = r.data || r;
      if (!d.ok) { area.appendChild(h("p", { class: "notice", text: d.reason === "both_must_agree" ? "Both people must agree first." : D.errorText(d.reason) })); return; }
      area.appendChild(h("p", { class: "small notice", text: "Logged: both people see that a Lawfecta reviewer opened these materials." }));
      d.files.forEach(function (f) {
        area.appendChild(h("div", { class: "row" }, h("span", { class: "grow", text: f.name + " (" + f.by + ", " + D.date(f.at) + ")" }), h("button", { class: "ghost small", type: "button", onclick: function () {
          // The tab opens during the click (pop-up blockers allow it); a file shown from memory is released a minute later
          D.openTab(function () { return api.post("/admin/confidential/open", { agreement_id: agreementId, file_id: f.id }).then(function (x) {
            var p = x.data || x;
            if (!p.ok) throw { message: p.reason };
            if (p.kind === "download") return p.url;
            var blob = new Blob([Uint8Array.from(atob(p.b64), function (c) { return c.charCodeAt(0); })], { type: p.kind === "pdf" ? "application/pdf" : "image/" + (p.ext === "png" ? "png" : "jpeg") });
            return URL.createObjectURL(blob);
          }); }, fail);
        } }, "Open")));
      });
      if (d.messages.length) area.appendChild(h("h3", { text: "Messages" }));
      d.messages.forEach(function (m) { area.appendChild(h("p", { class: "small", style: "white-space:pre-wrap", text: m.by + ", " + D.dateTime(m.at) + ": " + m.body })); });
    }).catch(fail);
  }

  function catalogTab() {
    api.get("/admin/catalog").then(function (r) {
      var d = r.data;
      var preview = h("div");
      var file = h("input", { type: "file", accept: ".csv,text/csv", "aria-label": "Tech catalog CSV" });
      var check = h("button", { class: "blue small", type: "button" }, "Check the file");
      check.addEventListener("click", function () {
        if (!file.files.length) { fail(new Error("Choose the CSV file first.")); return; }
        var f = file.files[0];
        check.disabled = true;
        f.text().then(function (text) {
          return api.post("/admin/catalog/preview", { file_name: f.name, text: text });
        }).then(function (x) {
          check.disabled = false;
          D.clear(preview);
          var p = x.data;
          if (p.reason === "catalog_problems") {
            preview.appendChild(h("div", { class: "notice bad" }, h("p", { style: "margin:0 0 6px", text: "Nothing was changed. Fix these in the spreadsheet, export it as CSV again, and check it again." }),
              h("div", { class: "scroll" }, h("table", null, h("thead", null, h("tr", null, ["Row", "Column", "What to fix"].map(function (t) { return h("th", { text: t }); }))),
                h("tbody", null, p.problems.map(function (q) { return h("tr", null, h("td", { text: String(q.row) }), h("td", { text: q.column }), h("td", { text: q.problem })); }))))));
            return;
          }
          if (!p.ok) throw new Error(p.reason);
          var lines = [h("p", { style: "margin:0 0 6px", text: p.first_upload ? "This is the first catalog: " + p.rows + " tools will be added." : p.rows + " tools in the file: " + p.added + " new, " + p.changed + " changed, " + p.removed + " removed." })];
          if (p.added_names.length && !p.first_upload) lines.push(h("p", { class: "small", text: "New: " + p.added_names.join(", ") }));
          if (p.changed_tools.length) lines.push(h("p", { class: "small", text: "Changed: " + p.changed_tools.map(function (c) { return c.name + " (" + c.fields.join(", ") + ")"; }).join("; ") }));
          if (p.removed_names.length) lines.push(h("p", { class: "small", text: "Removed (DELA stops recommending them): " + p.removed_names.join(", ") }));
          var confirmBtn = h("button", { class: "blue small", type: "button" }, "Confirm and replace the catalog");
          confirmBtn.addEventListener("click", function () {
            confirmBtn.disabled = true;
            api.post("/admin/catalog/confirm", { version_id: p.version_id }).then(function (y) { if (!y.data.ok) throw new Error(y.data.reason); ok("The catalog is replaced"); catalogTab(); }).catch(function (e) { confirmBtn.disabled = false; fail(e); });
          });
          preview.appendChild(h("div", { class: "notice" }, lines, h("div", { class: "row" }, confirmBtn, h("button", { class: "ghost small", type: "button", onclick: function () { D.clear(preview); } }, "Cancel"))));
        }).catch(function (e) { check.disabled = false; fail(e); });
      });
      var up = h("div", { class: "card" }, titled("h2", "Upload a new catalog", "catalog"),
        h("p", { class: "small muted", text: "One CSV with every tool. Save it from Google Sheets (File, Download, Comma separated values) or Excel (Save as, CSV UTF-8). Nothing changes until you confirm." }),
        h("div", { class: "row" }, file, check), preview);
      var on = { off: "Off", staff: "On for the Lawfecta Team", list: "On for the access list", everyone: "On for everyone" }[d.on_for] || d.on_for;
      var listCard = h("div", { class: "card" }, h("h2", { text: "Tools in the catalog now (" + d.tools.length + ")" }),
        h("p", { class: "small muted", text: "DELA recommends these to members: " + on + " (switch tech_catalog). Paused tools stay listed but are never recommended. A partner label never moves a tool up." }));
      if (!d.tools.length) listCard.appendChild(h("p", { class: "muted", text: "No catalog yet. Upload the first one above." }));
      else listCard.appendChild(h("div", { class: "scroll" }, h("table", { class: "stack" },
        h("thead", null, h("tr", null, ["Tool", "Category", "Status", "Partner", "Last checked", ""].map(function (t) { return h("th", { text: t }); }))),
        h("tbody", null, d.tools.map(function (t) {
          var paused = t.status === "paused";
          return h("tr", null, h("td", { "data-label": "Tool" }, h("b", { text: t.name }), h("div", { class: "small muted", text: t.tool_id })), h("td", { "data-label": "Category", text: t.category }),
            h("td", { "data-label": "Status" }, h("span", { class: "badge " + (paused ? "held" : "ready"), text: paused ? "Paused" : "Active" })),
            h("td", { "data-label": "Partner", text: t.partner ? "Yes" : "No" }), h("td", { "data-label": "Last checked", text: t.last_reviewed || "" }),
            h("td", null, h("button", { class: "ghost small", type: "button", onclick: function () {
              var why = paused ? "" : prompt("Why pause " + t.name + "? (saved in the audit log)");
              if (!paused && why === null) return;
              api.post("/admin/catalog/pause", { tool_id: t.tool_id, pause: !paused, reason: why || "" }).then(function (y) { if (!y.data.ok) throw new Error(y.data.reason); ok(paused ? t.name + " is active again" : t.name + " is paused"); catalogTab(); }).catch(fail);
            } }, paused ? "Resume" : "Pause")));
        })))));
      var hist = h("div", { class: "card" }, h("h2", { text: "Earlier versions" }),
        d.versions.length ? h("div", { class: "scroll" }, h("table", { class: "stack" }, h("thead", null, h("tr", null, ["Uploaded", "By", "File", "Tools", "Changes", "State"].map(function (t) { return h("th", { text: t }); }))),
          h("tbody", null, d.versions.map(function (v) {
            return h("tr", null, h("td", { "data-label": "Uploaded", text: D.dateTime(v.created_at) }), h("td", { "data-label": "By", text: v.uploaded_by }), h("td", { "data-label": "File", text: v.file_name }),
              h("td", { "data-label": "Tools", text: String(v.rows) }), h("td", { "data-label": "Changes", text: v.added + " new, " + v.changed + " changed, " + v.removed + " removed" }),
              h("td", { "data-label": "State" }, h("span", { class: "badge " + (v.state === "active" ? "ready" : "C"), text: { active: "In use", replaced: "Replaced", preview: "Not confirmed" }[v.state] || v.state })));
          })))) : h("p", { class: "muted", text: "No uploads yet." }));
      body(h("div", null, pageHead("Tech catalog", "catalog"), up, listCard, hist));
    }).catch(fail);
  }

  function verifyTab() {
    api.get("/admin/verify").then(function (r) {
      var d = r.data;
      var lic = h("div", { class: "card" }, titled("h2", "Attorney licenses (" + d.licenses.length + ")", "verify"));
      if (!d.licenses.length) lic.appendChild(h("p", { class: "muted", text: "Nothing is waiting." }));
      d.licenses.forEach(function (l) {
        var box = h("div", { class: "card", style: "margin:8px 0" },
          h("div", { class: "row" }, h("b", { class: "grow", text: l.name + " (" + l.bd_member_id + "): " + l.region + " bar number " + l.bar_number }),
            h("span", { class: "badge " + (l.recheck_due ? "held" : l.status === "needs_more" ? "bad" : "C"), text: l.recheck_due ? "Yearly re-check due" : l.status === "needs_more" ? "Asked for more" : "New" })),
          h("div", { class: "small", text: "Name on the record (as typed): " + l.name_on_record + ". Firm: " + (l.firm_name || "not given") + (l.firm_website ? ", " + l.firm_website : "") + "." }),
          h("div", { class: "small", text: l.method === "email" ? "Email: " + l.contact_email + (l.email_confirmed_at ? " (confirmed " + D.dateTime(l.email_confirmed_at) + ")" : " (not confirmed yet)") : "Asked for the video call " + D.dateTime(l.video_requested_at) + "." }),
          l.email_delivery && l.email_delivery.state === "bounced" ? h("p", { class: "notice bad", text: "The confirmation email bounced: " + (l.email_delivery.reason || "their mail server refused it") + ". The attorney sees this on their Profile." }) : null,
          l.email_delivery && l.email_delivery.state === "delivered" ? h("div", { class: "small muted", text: "The confirmation email was delivered." }) : null,
          l.video_requested_at && l.method === "email" ? h("div", { class: "small", text: "Also asked for the video call " + D.dateTime(l.video_requested_at) + "." }) : null,
          l.duplicate ? h("p", { class: "notice bad", text: "The same license number is on another account (member " + l.duplicate_bd_member_id + "). Find out which is real before verifying. Verifying needs a note." }) : null,
          h("details", null, h("summary", { class: "small", style: "cursor:pointer", text: "History" }), h("ul", { class: "small" }, l.history.map(function (e) { return h("li", { text: D.dateTime(e.at) + ": " + e.action.split("_").join(" ") + " (" + e.actor_type + ")" }); }))));
        var ident = h("select", { "aria-label": "How the attorney showed it is theirs" }, [h("option", { value: "", text: "How they showed it is theirs" })].concat(Object.keys(LIC_ID).map(function (k) { return h("option", { value: k, text: LIC_ID[k] }); })));
        var note = h("input", { type: "text", placeholder: "Lookup note (what you checked, where)", "aria-label": "Lookup note", style: "width:100%" });
        var reason = h("input", { type: "text", placeholder: "Reason the attorney will see (for More needed or Not verified)", "aria-label": "Reason", style: "width:100%" });
        var over = l.duplicate ? h("input", { type: "text", placeholder: "Why this account is the real one", "aria-label": "Duplicate note", style: "width:100%" }) : null;
        function decide(dec) {
          api.post("/admin/verify/license", { id: l.id, decision: dec, identity: ident.value, note: note.value, reason: reason.value, override: over ? over.value : "" }).then(function (x) {
            if (!x.data.ok) throw new Error(x.data.reason);
            ok(dec === "verified" ? "Verified" : dec === "recheck_ok" ? "Re-check recorded" : "Saved and the attorney was told"); verifyTab();
          }).catch(fail);
        }
        box.appendChild(h("div", { style: "margin-top:8px" }, l.recheck_due ? null : ident, note, reason, over,
          h("div", { class: "row", style: "margin-top:6px" },
            l.recheck_due ? h("button", { class: "blue small", onclick: function () { decide("recheck_ok"); } }, "Still active: re-check done")
              : h("button", { class: "blue small", onclick: function () { decide("verified"); } }, "Verify"),
            h("button", { class: "ghost small", onclick: function () { decide("needs_more"); } }, "More needed"),
            h("button", { class: "danger small", onclick: function () { if (confirm("Mark this license as not verified?")) decide("not_verified"); } }, "Not verified"))));
        lic.appendChild(box);
      });
      var li = h("div", { class: "card" }, h("h2", { text: "Freelancer LinkedIn checks (" + d.linkedin.length + ")" }));
      if (!d.linkedin.length) li.appendChild(h("p", { class: "muted", text: "Nothing is waiting." }));
      d.linkedin.forEach(function (c) {
        var nm = h("input", { type: "checkbox" }), badge = h("input", { type: "checkbox" });
        var reason = h("input", { type: "text", placeholder: "Reason the freelancer will see", "aria-label": "Reason", style: "width:100%" });
        function decide(dec) {
          api.post("/admin/verify/linkedin", { id: c.id, decision: dec, name_matches: nm.checked, badge_seen: badge.checked, reason: reason.value }).then(function (x) {
            if (!x.data.ok) throw new Error(x.data.reason); ok("Saved and the freelancer was told"); verifyTab();
          }).catch(fail);
        }
        li.appendChild(h("div", { class: "card", style: "margin:8px 0" },
          h("b", { text: c.name + " (" + c.bd_member_id + ")" }), h("div", { class: "small", text: "Name on the DELA profile: " + (c.profile_name || "not filled in") }),
          // Only a LinkedIn address becomes a link; anything else shows as plain text (AI review 0.9.0, security 4)
          h("div", { class: "small" }, /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//i.test(String(c.url || "")) ? h("a", { href: c.url, target: "_blank", rel: "noopener noreferrer", text: c.url }) : h("span", { text: String(c.url || "") })),
          h("label", { style: "font-weight:400;display:flex;gap:8px" }, nm, h("span", { text: "The name on LinkedIn matches" })),
          h("label", { style: "font-weight:400;display:flex;gap:8px" }, badge, h("span", { text: "LinkedIn shows its verified badge" })),
          reason, h("div", { class: "row", style: "margin-top:6px" },
            h("button", { class: "blue small", onclick: function () { decide("verified"); } }, "Checked"),
            h("button", { class: "ghost small", onclick: function () { decide("needs_more"); } }, "More needed"),
            h("button", { class: "danger small", onclick: function () { decide("not_verified"); } }, "Not verified"))));
      });
      var ready = h("div", { class: "card" }, h("h2", { text: "Profiles by state" }), d.readiness.length ? h("div", { class: "scroll" }, h("table", null,
        h("thead", null, h("tr", null, ["Side", "Where it stands", "Members"].map(function (x) { return h("th", { text: x }); }))),
        h("tbody", null, d.readiness.map(function (x) { return h("tr", null, h("td", { text: D.SIDE[x.side] || x.side }), h("td", { text: READY[x.state] || x.state }), h("td", { text: String(x.count) })); })))) : h("p", { class: "muted", text: "No profiles yet." }),
        h("p", { class: "small muted", text: "Target time to answer a request: " + d.target_days + " business days." }));
      body(h("div", null, pageHead("Verification", "verify"), lic, li, ready));
    }).catch(fail);
  }

  function aiFiles() {
    api.get("/admin/ai-files").then(function (r) {
      var d = r.data;
      var ready = d.ready || {};
      var missing = [];
      if (!ready.lawfecta_openai) missing.push("Lawfecta's OpenAI key (OPENAI_API_KEY) is not in Supabase secrets, so Lawfecta's AI, talking and the AI part of the file check are off.");
      if (!ready.encryption) missing.push("AI_KEY_ENCRYPTION_SECRET is not in Supabase secrets, so members cannot add their own key.");
      if (!ready.storage) missing.push("File storage is not connected.");
      function table(heads, rows, empty) {
        if (!rows.length) return h("p", { class: "muted", text: empty });
        return h("div", { class: "scroll" }, h("table", null, h("thead", null, h("tr", null, heads.map(function (x) { return h("th", { text: x }); }))), h("tbody", null, rows)));
      }
      body(h("div", null, pageHead("AI and files", "aifiles"),
        missing.length ? h("div", { class: "notice bad" }, missing.map(function (t) { return h("p", { style: "margin:4px 0", text: t }); })) : h("div", { class: "notice ok", text: "Lawfecta's AI key, the key lock secret and file storage are all in place." }),
        h("div", { class: "card" }, titled("h2", "AI use this month", "ai_usage"),
          table(["Side", "Plan", "Where it ran", "What", "Calls", "Failed", "Credits", "Tokens in / out"], d.usage.map(function (u) {
            return h("tr", null, h("td", { text: D.SIDE[u.side] || u.side }), h("td", { text: u.plan || "" }), h("td", { text: SOURCE[u.source] || u.source }), h("td", { text: TASK[u.task] || u.task }),
              h("td", { text: String(u.calls) }), h("td", { text: String(u.failed) }), h("td", { text: String(u.credits) }), h("td", { text: u.input_tokens + " / " + u.output_tokens }));
          }), "No AI use yet this month.")),
        h("div", { class: "card" }, titled("h2", "Members' own keys", "ai_keys"),
          table(["BD member", "Name", "Side", "Key", "Status", "Added"], d.keys.map(function (k) {
            return h("tr", null, h("td", { text: String(k.bd_member_id) }), h("td", { text: k.name }), h("td", { text: k.scope === "org" ? "Firm key" : (D.SIDE[k.side] || k.side) }),
              h("td", { text: k.provider === "openai" ? "OpenAI" : "Claude" }),
              h("td", null, h("span", { class: "badge " + (k.status === "failed" ? "bad" : "C"), text: k.status === "failed" ? "Not working since " + D.date(k.failed_since) + " (" + (k.error || "").split("_").join(" ") + ")" : "Working" })),
              h("td", { text: D.date(k.added_at) }));
          }), "No member has added a key.")),
        h("div", { class: "card" }, titled("h2", "Recent AI problems", "ai_errors"),
          table(["When", "BD member", "What", "Where", "Reason"], d.errors.map(function (e) {
            return h("tr", null, h("td", { text: D.dateTime(e.at) }), h("td", { text: String(e.bd_member_id) }), h("td", { text: TASK[e.task] || e.task }), h("td", { text: (SOURCE[e.source] || e.source) + (e.provider ? " (" + (e.provider === "openai" ? "OpenAI" : "Claude") + ")" : "") }), h("td", { text: (e.error || "").split("_").join(" ") }));
          }), "No problems.")),
        h("div", { class: "card" }, titled("h2", "Storage by member", "ai_storage"),
          table(["Firm", "BD member", "Files", "Used", "Allowed"], d.storage.map(function (x) {
            return h("tr", null, h("td", { text: x.org }), h("td", { text: String(x.bd_member_id) }), h("td", { text: String(x.files) }), h("td", { text: mb(x.used_bytes) }), h("td", { text: mb(x.limit_bytes) }));
          }), "No files yet.")),
        h("div", { class: "card" }, titled("h2", "Files held for a client information check", "ai_held"),
          table(["When", "BD member", "File", "Why"], d.held.map(function (x) {
            return h("tr", null, h("td", { text: D.dateTime(x.at) }), h("td", { text: String(x.bd_member_id) }), h("td", { text: x.name }), h("td", { text: (x.reasons || []).join(", ").split("_").join(" ") }));
          }), "No files are held.")),
        h("div", { class: "card" }, titled("h2", "Files not accepted", "ai_refused"),
          table(["When", "BD member", "File", "Reason"], d.refused.map(function (x) {
            return h("tr", null, h("td", { text: D.dateTime(x.at) }), h("td", { text: String(x.bd_member_id) }), h("td", { text: x.name }), h("td", { text: REFUSED[x.reason] || x.reason }));
          }), "None.")), libraryCounts(), documentsCard()));
    }).catch(fail);
  }

  // The document standard: how many of each type, the conversion of older playbooks, and what is blocked
  // "fl_free" reads as "Freelancer Free"
  function planName(code) {
    var c = String(code || ""), side = c.indexOf("att_") === 0 ? "Attorney " : c.indexOf("fl_") === 0 ? "Freelancer " : "";
    var tier = c.replace(/^(att|fl)_/, "");
    return side ? side + tier.charAt(0).toUpperCase() + tier.slice(1) : c;
  }

  function documentsCard() {
    var c = h("div", { class: "card" }, h("h2", { text: "Documents (Policy, Workflow, SOP, Playbook)" }), h("p", { class: "muted", text: "Loading..." }));
    var TYPES = { sop: "SOP", workflow: "Workflow", playbook: "Playbook", policy: "Policy" };
    api.get("/admin/documents").then(function (r) {
      var d = r.data || r;
      D.clear(c);
      c.appendChild(h("h2", { text: "Documents (Policy, Workflow, SOP, Playbook)" }));
      var sw = d.switches || {};
      c.appendChild(h("p", { class: "small muted", text: "Document standard switch: " + (sw.document_standard || "off") + ". Conversion switch: " + (sw.document_conversion || "off") + "." }));
      var bt = d.by_type || {};
      c.appendChild(h("div", { class: "kv" }, Object.keys(TYPES).map(function (k) { return h("div", null, TYPES[k], h("b", { text: String(bt[k] || 0) })); })
        .concat([h("div", null, "Older playbooks waiting to convert", h("b", { text: String(d.waiting || 0) })), h("div", null, "Converted", h("b", { text: String(d.converted || 0) })),
          h("div", null, "Converted, not yet checked by the owner", h("b", { text: String(d.not_checked_by_owner || 0) })), h("div", null, "Blocked (missing A, attorney flag or image check)", h("b", { text: String(d.blocked || 0) }))])));
      var im = d.images || {};
      c.appendChild(h("h3", { text: "Images in documents" }));
      c.appendChild(h("p", { class: "small muted", text: "Image switch: " + (sw.document_images || "off") + ". Counts only; the team never sees the images here." }));
      c.appendChild(h("div", { class: "kv" }, h("div", null, "Images in documents", h("b", { text: String(im.total || 0) })), h("div", null, "Waiting for a client-data check", h("b", { text: String(im.not_confirmed || 0) })),
        h("div", null, "Held by DELA's check", h("b", { text: String(im.held || 0) })), h("div", null, "Items the text reader found", h("b", { text: String(im.flags_found || 0) })), h("div", null, "Items members blurred", h("b", { text: String(im.flags_blurred || 0) }))));
      var rows = d.recent || [];
      c.appendChild(rows.length ? h("div", { class: "scroll" }, h("table", null, h("thead", null, h("tr", null, ["When", "Firm", "ID", "Title", "Type", "Why"].map(function (x) { return h("th", { text: x }); }))),
        h("tbody", null, rows.map(function (x) { return h("tr", null, h("td", { text: D.dateTime(x.at) }), h("td", { text: x.firm || "" }), h("td", { text: x.doc_id || "" }), h("td", { text: x.title }), h("td", { text: TYPES[x.doc_type] || "" }), h("td", { text: x.note || "" })); }))))
        : h("p", { class: "muted", text: "No conversions yet." }));
    }).catch(function () { D.clear(c); c.appendChild(h("p", { class: "muted", text: "Documents are not available yet." })); });
    return c;
  }
  // Playbooks and the Process Recorder: counts only, never content
  function libraryCounts() {
    var box = h("div", null, h("p", { class: "muted", text: "Loading document and recorder counts..." }));
    Promise.all([api.get("/admin/playbooks"), api.get("/admin/recorder")]).then(function (r) {
      var pb = r[0].data, rec = r[1].data;
      D.clear(box);
      box.appendChild(h("div", { class: "card" }, titled("h2", "Documents by plan", "ai_playbooks"),
        pb.by_plan.length ? h("div", { class: "scroll" }, h("table", null, h("thead", null, h("tr", null, ["Plan", "Libraries", "Documents", "Approved", "Drafts", "From Scribe", "Drafted by DELA"].map(function (x) { return h("th", { text: x }); }))),
          h("tbody", null, pb.by_plan.map(function (x) { return h("tr", null, [x.plan || "", x.libraries, x.playbooks, x.approved, x.drafts, x.from_scribe, x.from_ai].map(function (v) { return h("td", { text: String(v) }); })); })))) : h("p", { class: "muted", text: "No documents yet." }),
        h("p", { class: "small muted", text: "Suggestions waiting for a decision: " + pb.suggestions_open + ". Imports in the last 30 days: " + pb.imports + ". Libraries at their limit: " + pb.at_limit.length + "." })));
      box.appendChild(h("div", { class: "card" }, titled("h2", "Process Recorder", "ai_recorder"),
        rec.by_month.length ? h("div", { class: "scroll" }, h("table", null, h("thead", null, h("tr", null, ["Month", "Started", "Finished", "Ready", "Failed", "Abandoned", "Built into documents", "Average minutes", "Uploaded files"].map(function (x) { return h("th", { text: x }); }))),
          h("tbody", null, rec.by_month.map(function (x) { return h("tr", null, [x.month, x.started, x.finished, x.ready, x.failed, x.abandoned, x.built, x.avg_minutes === null ? "" : x.avg_minutes, x.uploads].map(function (v) { return h("td", { text: String(v) }); })); })))) : h("p", { class: "muted", text: "No recordings yet." }),
        h("p", { class: "small muted", text: "Recordings by browser: " + (Object.keys(rec.by_browser).map(function (k) { return k + " " + rec.by_browser[k]; }).join(", ") || "none") + ". Video storage in use: " + mb(rec.storage_bytes) + ". Videos deleted: " + rec.videos_deleted + "." })));
      box.appendChild(connectorCard());
    }).catch(function () { D.clear(box); });
    return box;
  }

  // DELA in ChatGPT and Claude: who is connected, which tools they use, and a Stop button. Never shows tokens or what was asked.
  function connectorCard() {
    var card = h("div", { class: "card" }, titled("h2", "ChatGPT and Claude connections", "ai_connector"), h("p", { class: "muted small", text: "Loading..." }));
    api.get("/admin/mcp").then(function (r) {
      var d = r.data;
      D.clear(card);
      titled("h2", "ChatGPT and Claude connections", "ai_connector").forEach(function (n) { if (n) card.appendChild(n); });
      if (!d.connections.length) card.appendChild(h("p", { class: "muted", text: "Nobody has connected ChatGPT or Claude yet." }));
      else card.appendChild(h("div", { class: "scroll" }, h("table", null,
        h("thead", null, h("tr", null, ["Member", "Side", "App", "Connected", "Last used", "Calls (30 days)", "Failed", ""].map(function (x) { return h("th", { text: x }); }))),
        h("tbody", null, d.connections.map(function (c) {
          return h("tr", null, h("td", { text: c.name + " (" + c.bd_member_id + ")" }), h("td", { text: D.SIDE[c.side] || c.side }), h("td", { text: c.client_name }),
            h("td", { text: D.date(c.created_at) }), h("td", { text: D.date(c.last_used_at) }), h("td", { text: String(c.calls_30d) }), h("td", { text: String(c.errors_30d) }),
            h("td", null, h("button", { class: "danger small", onclick: function () {
              if (!confirm("Stop this connection? " + c.name + " will need to connect " + c.client_name + " again.")) return;
              api.post("/admin/mcp/disconnect", { id: c.id }).then(function () { ok("Connection stopped"); card.replaceWith(connectorCard()); }).catch(fail);
            } }, "Stop")));
        })))));
      card.appendChild(h("p", { class: "small muted", text: "Tools used in the last 30 days: " + (d.tools.map(function (t) { return ({ list_playbooks: "list_documents", get_playbook: "get_document", save_playbook_draft: "save_document_draft", draft_playbook_with_dela: "draft_document_with_dela", suggest_playbook_change: "suggest_document_change", export_playbook: "export_document" }[t.tool] || t.tool).split("_").join(" ") + " " + t.calls + (t.failed ? " (" + t.failed + " refused or failed)" : ""); }).join(", ") || "none") + "." }));
    }).catch(function () { D.clear(card); card.appendChild(h("p", { class: "muted small", text: "Connections could not load." })); });
    return card;
  }
  var REFUSED = { wrong_type: "Not really the type its name says", active_content: "Has scripts, macros or hidden files", damaged: "Could not be opened", storage_full: "Over the storage allowance", file_too_big: "Over the file size limit" };

  // ---------- Release Control (test site to Live, owner only, with the release password and a code) ----------

  var controlTimer = null;
  var ctl = { filter: "all", flow: null, data: null, more: false, tips: {}, open: loadOpen() };
  // Which sections are open is remembered in this browser only (it is a convenience, never needed)
  function loadOpen() { try { return JSON.parse(localStorage.getItem("dela.control.open") || "{}") || {}; } catch (e) { return {}; } }
  function saveOpen() { try { localStorage.setItem("dela.control.open", JSON.stringify(ctl.open)); } catch (e) { /* private window */ } }
  var RELEASE_STATUS = { candidate: "Ready to test", tested: "Tested on the test site", approved: "Starting", deploying: "Running now", live: "Live now", failed: "Did not go live", replaced: "Was live before", rolled_back: "Was live before" };
  var RELEASE_ERR = {
    wrong_password: "That release password is not right.", locked: "Too many wrong tries. Pushing is locked for 30 minutes.",
    no_password: "Set your release password first.", not_tested: "Mark this version as tested on the test site first.",
    password_too_short: "Use at least 12 characters.", push_in_progress: "A push is already running. Wait for it to finish.",
    github_not_set_up: "GitHub is not connected for pushes yet. See Live setup on this page.", staging_only: "Pushes start from the test site admin area.",
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
    release_recorded: ["push", function (a) { return "Version " + (a.detail.version || "") + " added on the test site"; }],
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
    staging_reset: ["settings", function () { return "Test site data reset"; }],
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
    staging: "This site, while it is in test mode. Only you and the people on its access list use it. Every new version runs here first.",
    staging_health: "Healthy means the test site's database answers and its background helper ran in the last 10 minutes. Worker stopped means scheduled work (emails, reminders, checking Live) is not running. Tell Claude.",
    version_running: "The version this copy is running right now. On the test site it should be the version you are testing. \"code\" plus 7 letters means a build that was not recorded as a version.",
    worker: "DELA's background helper runs every minute. It sends emails and reminders, writes the daily summary and checks Live. More than 10 minutes ago means something is stuck.",
    problems: "Emails that failed for good, plus background jobs that gave up after all their retries, in the last 24 hours. 0 is the goal. Any other number: open the Jobs tab to see what failed, or ask Claude.",
    paused: "Parts of DELA switched off with the emergency pause, for example AI help or payouts. None is normal.",
    live: "Live is a second copy for real members, used when DELA runs as two copies. It changes only when you push a tested version from this page. During the pilot there is one site and this card stays empty.",
    live_health: "Healthy: Live answered normally. Not healthy: 3 checks in a row failed, and you were alerted. Waiting for your first push: Live exists but has no DELA code yet. Not set up yet: the Live project ID is not entered (see Live setup).",
    live_checked: "When the test site last asked Live how it is doing. It asks every minute.",
    next: "The newest version waiting to go Live, and how far it has come. A green tick is done. The pink step is the next thing to do.",
    steps: "1 Built on the test site: Claude made it and put it here. 2 Automatic tests: GitHub ran every test and they passed. 3 ChatGPT report: your ChatGPT test results are saved with it. 4 You marked it tested: your yes. 5 Pushed: you entered your release password and code. 6 Live and healthy: Live runs it and passed its watch after the push.",
    changes: "What members will notice in this version, in plain words, written by Claude.",
    db: "Database changes that come with this version. DELA only adds to the database, so member data is kept and going back to an earlier version stays possible. If a version ever removes or renames something, it says so here, and going back past it is blocked.",
    proof: "Evidence this version works: the automatic test run on GitHub (click to open it) and the ChatGPT test report from your testing.",
    push: "Push to Live sends this version to members. The button works only when every item listed under it is done. You enter your release password, then the 6 digit code sent to you (once email is set up).",
    progress: "Each step of the push, in order, as GitHub does it. If a step fails, Live stays on the version it had. After a push, Live is watched for 15 minutes and goes back by itself if it becomes unhealthy.",
    history: "Every version, newest first. Ready to test and Tested on the test site: not on Live yet. Live now: what members use. Was live before: you can go back to it. Did not go live: the push stopped and Live kept its version. Safe to go back: DELA can return to it with no data lost.",
    activity: "Everything important about releases, from the audit log, newest first. Nobody can edit or delete these. Dot colors: green pushes, blue go backs, red security (wrong passwords, codes), pink Live health, amber settings, burgundy pauses. Use the buttons to show one kind.",
    setup: "One-time steps before your first push to Live. Most lines check themselves when you click Check again. A ? means it could not be checked from here, so tick it yourself when it is done.",
    pause: "The emergency pause switches off all of DELA, or one part, on Live at once, with no push. You and the Lawfecta Team keep access. You turn it on in the Live admin area.",
    password: "Your release password is asked for every push and every go back. At least 12 characters, kept in your password manager, never pasted in chat. Five wrong tries lock pushing for 30 minutes and email you.",
    reset: "Clears test activity on the test site so you can test again from a clean start. People, plans, settings and versions stay. Live is never touched.",
    ov: "A quick picture of this copy of DELA (the test site or Live, shown in the badge at the top): who is using it, what is waiting on a decision, and anything paused or on hold.",
    ov_people: "Everyone who has opened DELA at least once on this copy, and how many of them came back in the last 7 days.",
    ov_access: "Members you have let into DELA. Everyone else sees a 'not open yet' message. The Lawfecta Team can always get in.",
    ov_denied: "Members who tried to open DELA in the last 7 days but are not on the access list. A rising number can mean word is spreading before you open DELA.",
    ov_decisions: "Business numbers still marked Open or Suggested in Settings. Open: no decision yet. Suggested: Claude's suggestion waiting for your yes. Needs a gate: only switch on after a check, such as a lawyer review.",
    ov_unmapped: "DELA plans not yet linked to a BD membership plan. Until linked, members only get those plans if you give them one on the People tab. Linking happens at launch.",
    ov_switches: "Features turned on for anyone (team only, access list, or everyone). Built features stay off until you switch them on.",
    ov_holds: "People with an active hold: their new actions are paused while you check something. Their records stay readable.",
    ov_notices: "Sends a test notice to you, to check that in-app notices and emails work. Email goes through the service named in the email.sender setting.",
    ov_recent: "The latest sign ins, refusals and changes on this copy. The full list is on the Audit log tab.",
    ov_pause: "Stops all of DELA, or one part, at once, with no push. Members see a short message. The Lawfecta Team keeps working. You get an email each time it is turned on or off.",
    acc: "Who may open DELA on this copy. While DELA is in testing, only people on this list (and the Lawfecta Team) can get in. Removing someone signs them out at once.",
    acc_add: "Add a member by their BD member ID (BD admin, Members). They can then open this copy of DELA. Use member numbers from this site only: every Brilliant Directories site numbers its members separately.",
    acc_list: "Members who may open this copy of DELA. Each line shows when they were added and why.",
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
    verify: "Attorney licenses and freelancer LinkedIn profiles waiting for a check. For a license: open the state bar's own lookup, check the number, the name and that the license is active, then record how the attorney showed it is theirs: an email that matches the bar record, an email at the firm's own domain (never Gmail, Yahoo and similar), or the 10 minute video call. For LinkedIn: the name matches the DELA profile and LinkedIn shows its verified badge. Never ask for ID documents.",
    meet: "Meetings and messages between attorneys and freelancers on gigs. Upcoming meetings with their meeting room status, reports and blocks from members, and members with repeated late cancels or no-shows. The Lawfecta Team never joins meetings. Held messages wait in the Gigs tab.",
    reviews: "Reviews after completed engagements, reviews from past clients outside Lawfecta, benches and member webhooks. Decide held reviews and responses, reported reviews and appeals under the policy: a negative opinion stays up; only client information, threats, hate or harassment, impersonation, contact details or payment outside Lawfecta are held or removed. Every decision needs a reason, which the members see and which is kept. Spot check past-client bar numbers on the state bar website. See webhook endpoints that paused after repeated failures.",
    pay: "Money on DELA engagements, through Stripe (test mode until the live_payments switch is on). Totals from the ledger, milestones waiting for a human review (pass sends it to the attorney; needs more work sends it back), disputes after their notice period (split the held money between the freelancer and the attorney), open chargebacks, failed payments, payouts waiting for the freelancer's Stripe setup, reviews past their deadline and money held a long time.",
    gigs: "Flex Gigs on DELA. Open gigs with their proposals and matches, proposals sent this month by plan, and messages DELA held because they may plan work, contact or payment outside Lawfecta (against the terms). Deliver a held message if it is fine, or keep it from being delivered (the member is told). Pause a gig to stop new proposals while you check it.",
    catalog: "The Lawfecta tech catalog. Upload one CSV with every tool (the columns are in docs/templates/tech-catalog-guide.md on GitHub). A new upload replaces the whole list: DELA shows what will be added, changed and removed, and nothing changes until you click Confirm. Every earlier version is kept. DELA's AI recommends only active tools from this list. Pause a tool to stop recommending it until the next upload.",
    aifiles: "How members use DELA's AI and files. You see counts, key status and file names, never a member's key and never what a file says.",
    ai_usage: "Every AI call this month by side and plan. Lawfecta's key uses members' included credits; a member's own key or a firm key costs Lawfecta nothing. Tokens are the provider's measure of how much text was read and written.",
    ai_keys: "Members who added their own OpenAI or Claude key. Only the provider and whether it works are shown. Not working means the provider refused the key or it ran out of credit; the member is reminded after a few days.",
    ai_errors: "The last 50 AI calls that failed and why, in the provider's words: bad key, no credit, provider down, rate limited.",
    ai_storage: "File storage used by each attorney's firm against their plan's allowance. Files in the trash count until the trash empties.",
    ai_held: "Files that looked like they hold client information. They stay with the member, who confirms there is none or removes the file. The AI does not use them until then.",
    ai_playbooks: "How many documents each plan's libraries hold, how many are approved, and where they came from. Counts only; the Lawfecta Team never reads members' documents here.",
    ai_connector: "Members who connected DELA to ChatGPT or Claude. The connector reads documents, saves drafts and suggests changes; changes are accepted on the DELA website. Stop ends one connection at once. To stop all of them, use the emergency pause (ChatGPT and Claude connector) or the mcp_connector switch.",
    ai_recorder: "Recordings by month: started, finished uploading, ready for review, failed analysis, abandoned (never finished after a day), and built into a document. Use this to judge whether a desktop helper is worth building later.",
    ai_refused: "Files DELA did not keep, with the reason. These are deleted from storage straight away.",
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
    // The shared help tip from dela-core.js; the admin remembers which tips are open
    return D.helpTip(HELP[key], "What does this mean?", function (open) { if (open) ctl.tips[key] = 1; else delete ctl.tips[key]; }, !!ctl.tips[key]);
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

  var SITE_NAME = (location.hostname || "this site").split("www.").join("");
  function envCards(d) {
    var s = d.here;
    var sb = tipPair("staging_health");
    var staging = h("div", { class: "card env" },
      titled("h2", "This site: " + SITE_NAME, "staging", h("span", { class: "row", style: "gap:6px" }, h("span", { class: "badge " + (s.worker_ok ? "C" : "bad"), text: s.worker_ok ? "Healthy" : "Worker stopped" }), sb[0])),
      sb[1],
      h("p", { class: "muted small", style: "margin-top:6px", text: "You and your testers. Every new version goes here first." }),
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
      titled("h2", d.live_ref ? "Live" : "Live: second copy, not set up", "live", h("span", { class: "row", style: "gap:6px" }, h("span", { class: "badge " + cls, text: state }), lb[0])),
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
    if (x.status !== "tested") why.push("Tick that you tested it on the test site.");
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
      ["Built on the test site", D.date(x.created_at), true],
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
      h("div", { class: "bar", role: "progressbar", "aria-label": "Push progress: " + doneCount + " of " + plan.length + " steps done", "aria-valuemin": "0", "aria-valuemax": String(plan.length), "aria-valuenow": String(doneCount) }, h("span", { style: "width:" + Math.round(doneCount / plan.length * 100) + "%" })),
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
    if (!x) return h("div", { class: "card" }, titled("h2", "Next version", "next"), h("p", { class: "muted", style: "margin-top:8px", text: "No new version is waiting. Claude adds each version here when it is ready on the test site." }));
    var lv = liveRelease(d);
    var added = lv ? x.migrations.filter(function (m) { return lv.migrations.indexOf(m) < 0; }) : x.migrations;
    var blockers = pushBlockers(d, x);
    var flowHere = ctl.flow && ctl.flow.id === x.id && ctl.flow.action === "push";
    var showProgress = ["approved", "deploying"].indexOf(x.status) >= 0 || x.watching || (x.steps && x.steps.length && (x.status === "failed" || x.status === "live"));
    var tested = h("input", { type: "checkbox", checked: ["tested", "approved", "deploying", "live"].indexOf(x.status) >= 0, disabled: !isOwner || ["candidate", "tested", "failed"].indexOf(x.status) < 0, "aria-label": "I tested " + x.version + " on the test site" });
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
        h("label", { class: "row", style: "font-weight:700;font-size:15px" }, tested, "I tested this version on the test site and it is ready"),
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
      [d.secrets.github_repo && d.secrets.github_token && d.secrets.ci_secret, "The test site can start pushes", "In Supabase, the Lawfecta AI project (the test site), Edge Function secrets: GITHUB_REPO, GITHUB_DISPATCH_TOKEN and RELEASE_CI_SECRET (checklist step 15)."],
      [gh.token_ok === undefined ? null : gh.token_ok, "GitHub accepts the push token", gh.token_ok === undefined ? "Click Check again to test it." : "The token needs Actions: Read and write, for the lawfecta repo only."],
      [gh.env_ok === true ? true : d.setup.github_env ? true : gh.env_ok === false ? false : null, "GitHub environment named live, with its secrets and variables", "Checklist step 14.", "github_env"],
      [!!d.live_ref, "Live project ID entered", "The 20 letters and numbers in the dela-live Supabase address.", null, refIn],
      [L.ok === true, "Live answers the test site's health check", "Turns green after your first push. Live also needs the RELEASE_CI_SECRET secret (same value) so the test site can read its problem count."],
      [emailOk, "Email for codes and alerts", "Today emails are only recorded (email.sender is log). Codes start once email is set up."],
      [smsOk, "Text alerts", "Put your phone number in Settings (alerts.sms_to), and the Brevo key in the test site secrets as BREVO_API_KEY."],
      [!!d.setup.uptime, "Uptime monitor watching the test site and Live", "See the runbook, Monitoring.", "uptime"],
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
          api.post("/admin/settings", { key: "live.project_ref", value: v, status: "C", reason: "Entered on Release Control" }).then(check).then(function () { ok("Saved. The test site checks Live within a minute."); controlTab(false); }).catch(relFail);
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
      out.push(h("div", { class: "notice", text: "Text alerts are on, but " + (!d.settings.sms_to ? "your phone number is not saved yet" : "the Brevo key is not in the test site secrets yet") + ". Alerts go by email until then." }));
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
    return ownerOnly(section("reset", "Reset test site data", "reset", false, null, [
      h("p", { class: "muted small", style: "margin-top:8px", text: "Clears test activity on the test site: allowances used, notices, background jobs, holds and other people's sign ins. Keeps people, the team, the access list, settings, plans and versions. Live is never touched." }),
      h("button", { class: "ghost", onclick: function () {
        var t = prompt("Type RESET to clear test activity on the test site.");
        if (t !== "RESET") return;
        api.post("/admin/staging/reset", { confirm: "RESET" }).then(check).then(function () { ok("Test site activity cleared"); }).catch(relFail);
      } }, "Reset test site data")]));
  }

  function drawControl() {
    var d = ctl.data;
    if (!d) return;
    if (d.environment === "live") {
      var s = d.here;
      var lv = liveRelease(d);
      body(h("div", null, h("h1", { text: "Release Control" }),
        h("div", { class: "card" }, h("p", { text: "This site is Live: real members use it. A new version arrives only after every automatic test has passed on that exact code." }),
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
      h("p", { class: "muted", text: "Everything between the test site and Live in one place. Only you can push or go back, with your release password" + (d.settings.email_code ? " and a code sent to you." : ".") }),
      noticesFor(d),
      d.live_ref ? null : h("div", { class: "card", id: "one-site-note" }, h("h2", { text: "One site for the pilot" }),
        h("p", { class: "small", style: "margin-top:6px", text: "The pilot runs on this site only. Claude puts each new version here after every automatic test has passed, and you test it here. The Live card and the Push to Live steps below belong to a second copy, which is not set up. You do not need them for the pilot." })),
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
