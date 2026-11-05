// DELA member app (Step 1: foundation). Attorney DELA and Freelancer DELA are separate homes with their own tabs;
// a member with both sides switches between them. Later steps fill in the parts marked "Coming soon".
(function () {
  var D = window.DELA;
  var root = document.getElementById("dela-app");
  if (!D || !root) return;
  var m = D.mount(root);
  var app = m.app;
  var h = D.h;
  var loginUrl = root.getAttribute("data-login-url") || "/login";
  var api = D.client(root, function () { show(signedOut(true)); });
  var boot = api.boot || {};
  var me = boot.me || null;
  var drawer = null;
  var menu = null;
  var tab = "home";
  var bar = null;

  // Each side has its own tabs. Ask DELA and Files show once their switches are on for this member.
  function tabsFor() {
    var sw = me.switches || {};
    if (me.side === "attorney") {
      var a = [["home", "Home", "⌂"], ["delegate", sw.ai_generation ? "Ask DELA" : "Delegate", "✦"]];
      if (sw.playbook_library) a.push(["library", "Library", "▥"]);
      if (sw.file_uploads) a.push(["files", "Files", "▤"]);
      return a.concat([["projects", "Projects", "▣"], ["talent", "Talent", "◌"]]);
    }
    var f = [["home", "Home", "⌂"]];
    if (sw.ai_generation) f.push(["ask", "Ask DELA", "✦"]);
    return f.concat([["profile", "Profile", "☺"], ["work", "Work", "▣"], ["earnings", "Earnings", "$"]]);
  }

  function show(node) { D.clear(app); app.appendChild(node); }
  function logo() { return h("img", { src: D.asset(root, "brand/lawfecta-mark-96.png"), alt: "" }); }
  function brand() { return h("span", { class: "brand" }, logo(), h("b", { text: "LAWFECTA" }), h("span", { text: "DELA" })); }

  // ---------- Screens before sign in ----------

  function frame(title, body, actions) {
    return h("div", null,
      h("div", { class: "top" }, brand()),
      h("div", { class: "wrap" }, h("div", { class: "card", style: "max-width:560px;margin:40px auto;text-align:center" },
        h("h1", { text: title }), h("p", { class: "muted", text: body }), actions || null)));
  }

  function signedOut(expired) {
    return frame(expired ? "Your sign in ended" : "Log in to use DELA",
      expired ? "For your security, DELA signs you out after a while. Refresh the page to keep going." : "DELA is part of your Lawfecta account. Log in, then come back to this page.",
      expired ? h("button", { onclick: function () { location.reload(); } }, "Refresh") : h("a", { class: "btn", href: loginUrl }, "Log in to Lawfecta"));
  }

  function denied(reason) {
    if (reason === "closed") return frame("This account is closed", "Contact the Lawfecta Team if you think this is a mistake.");
    return frame("DELA is not open for your account yet", "DELA is opening to members in stages. We will let you know as soon as it is ready for you.");
  }

  // ---------- Signed in ----------

  function sideInfo() {
    return (me.sides || []).filter(function (s) { return s.side === me.side; })[0] || null;
  }

  function initials(name) {
    var p = String(name || "").trim().split(" ").filter(Boolean);
    return ((p[0] || "?").charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : "")).toUpperCase();
  }

  function greeting() {
    var hr = new Date().getHours();
    return hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  }

  function header() {
    bar = h("div", { class: "top" }, brand());
    if (boot.staging || me.environment !== "live") bar.appendChild(h("span", { class: "badge stage", title: "You are on the test site (hirelegalhelp.com). Test data only.", text: "Test site" }));
    bar.appendChild(h("span", { class: "grow" }));
    if ((me.sides || []).length > 1) {
      var seg = h("div", { class: "seg", role: "group", "aria-label": "Switch side" });
      me.sides.forEach(function (s) {
        seg.appendChild(h("button", { "aria-pressed": String(s.side === me.side), onclick: function () { switchSide(s.side); } }, D.SIDE[s.side]));
      });
      bar.appendChild(seg);
    }
    if (me.side && (me.switches || {}).gig_chat) {
      var inbox = h("button", { class: "bell small", "aria-label": "Inbox", onclick: function () { talk.thread = null; tab = "inbox"; draw(); } }, "Inbox");
      api.get("/threads").then(function (r) { var n = (r.threads || []).reduce(function (a, t) { return a + (t.unread || 0); }, 0); if (n) inbox.appendChild(h("b", { text: String(n) })); }).catch(function () {});
      bar.appendChild(inbox);
    }
    var bell = h("button", { class: "bell small", "aria-label": "Notices", onclick: openNotices }, "Notices");
    if (me.unread > 0) bell.appendChild(h("b", { text: String(me.unread) }));
    bar.appendChild(bell);
    bar.appendChild(h("button", { class: "avatar", "aria-label": "Account menu", "aria-haspopup": "true", onclick: toggleMenu, text: initials(me.person.name) }));
    return bar;
  }

  function closeMenu() { if (menu) { menu.remove(); menu = null; } }

  // Side panels (Notices, versions, team, blur): above the Lawfecta site's own header, with an X that stays in view,
  // and a dimmed backdrop that closes the panel when clicked or tapped (Stacey 2026-11-05)
  var scrim = null;
  function closeDrawer() {
    if (drawer) { drawer.remove(); drawer = null; }
    if (scrim) { scrim.remove(); scrim = null; }
  }
  function showDrawer(el, keepOnOutsideClick) {
    if (scrim) { scrim.remove(); scrim = null; }
    drawer = el;
    scrim = h("div", { class: "dela-scrim", "aria-hidden": "true", onclick: function () { if (!keepOnOutsideClick) closeDrawer(); } });
    var label = el.getAttribute("aria-label") || "panel";
    el.insertBefore(h("div", { class: "drawer-top" }, h("button", { class: "ghost small drawer-x", "aria-label": "Close " + label.toLowerCase(), onclick: closeDrawer }, "Close")), el.firstChild);
    app.appendChild(scrim);
    app.appendChild(el);
  }

  // Any click outside the open menu closes it
  app.addEventListener("click", function (e) {
    if (menu && !menu.contains(e.target) && !(e.target.classList && e.target.classList.contains("avatar"))) closeMenu();
  });
  app.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeMenu(); closeDrawer(); } });

  function toggleMenu() {
    if (menu) { closeMenu(); return; }
    menu = h("div", { class: "menu", role: "menu" },
      h("div", { class: "small muted", style: "padding:8px 12px", text: me.person.name }),
      me.side && (me.switches || {}).profiles ? h("button", { role: "menuitem", onclick: function () { tab = "profile"; draw(); } }, me.side === "attorney" ? "Profile and verification" : "Profile") : null,
      me.side ? h("button", { role: "menuitem", onclick: function () { tab = "ai"; draw(); } }, "AI settings") : null,
      (me.staff || []).length ? h("a", { href: "/dela-admin", role: "menuitem" }, "Admin area") : null,
      h("button", { role: "menuitem", onclick: signOut }, "Sign out"));
    bar.appendChild(menu);
  }

  function nav() {
    if (!me.side) return null;
    var n = h("nav", { class: "nav", "aria-label": "DELA sections" });
    tabsFor().forEach(function (t) {
      n.appendChild(h("button", { "aria-current": t[0] === tab ? "page" : null, onclick: function () { tab = t[0]; draw(); } }, h("i", { "aria-hidden": "true", text: t[2] }), t[1]));
    });
    return n;
  }

  function planCard() {
    var s = sideInfo();
    var rows = (me.entitlements || []).map(function (e) {
      return h("tr", null, h("td", { text: e.label }), h("td", { text: D.limitText(e) }));
    });
    return h("div", { class: "card" },
      h("div", { class: "row" }, h("h2", { text: "Your plan: " + (s ? s.plan_name : "") }), s && s.plan_source === "staff_grant" ? h("span", { class: "badge", text: "Set by the Lawfecta Team" }) : null),
      me.trial && me.trial.active ? h("div", { class: "notice ok", text: "Your free trial gives you Pro features until " + D.date(me.trial.ends_at) + ". After that you keep everything you made, on your own plan." }) : null,
      h("div", { class: "scroll" }, h("table", null, h("thead", null, h("tr", null, h("th", { text: "What you get" }), h("th", { text: "Right now" }))), h("tbody", null, rows))),
      h("p", { class: "muted small", style: "margin-top:10px", text: "Plans and billing are managed in your Lawfecta account." }));
  }

  function ent(key) { return (me.entitlements || []).filter(function (e) { return e.key === key; })[0]; }

  function stat(icon, n, label) {
    return h("div", { class: "stat-tile" }, h("span", { class: "chip", "aria-hidden": "true", text: icon }), h("div", null, h("div", { class: "stat", text: String(n) }), h("div", { class: "muted small", text: label })));
  }

  function liveRow(n, title, text, label, to) {
    return h("div", { class: "work" }, h("span", { class: "chip", text: String(n) }), h("div", null, h("h3", { text: title }), h("div", { class: "muted small", text: text })), h("span", { class: "grow" }),
      h("button", { class: "ghost small", onclick: function () { gigs.id = null; tab = to; draw(); } }, label));
  }

  function soon(n, title, text) {
    return h("div", { class: "work" }, h("span", { class: "chip", text: String(n) }), h("div", null, h("h3", { text: title }), h("div", { class: "muted small", text: text })), h("span", { class: "grow" }), h("span", { class: "soon", text: "Coming soon" }));
  }

  // The draft count is read fresh each time Home opens, so a playbook drafted a minute ago counts
  // (Stacey's test 2026-11-05: Home showed 0 while the Library had drafts)
  function draftTile() {
    var tile = stat("✦", me.playbooks_draft || 0, "Draft playbooks");
    if ((me.switches || {}).playbook_library) {
      api.get("/me").then(function (r) {
        if (r && r.me && typeof r.me.playbooks_draft === "number") { me.playbooks_draft = r.me.playbooks_draft; var n = tile.querySelector(".stat"); if (n) n.textContent = String(r.me.playbooks_draft); }
      }).catch(function () {});
    }
    return tile;
  }

  function attorneyHome() {
    var s = sideInfo();
    var gigsEnt = ent("att.gigs_active");
    var ver = {
      not_started: "Before you can hire, we confirm your license, your identity and your firm. You can plan work before you are verified.",
      pending: "We are checking your details. You can keep planning work while you wait.",
      verified: "You are verified and can hire.",
      rejected: "We could not verify your details. Contact the Lawfecta Team.",
      expired: "Your verification needs to be renewed before your next hire.",
    }[s.verification_state] || "";
    return h("div", null,
      h("h1", { text: greeting() + ", " + D.firstName(me.person.name) }),
      h("p", { class: "muted", text: "Make room for your highest-value work." }),
      h("div", { class: "hero" },
        h("div", { class: "eyebrow", text: "AI Delegation Center" }),
        h("h2", null, "Plan. Delegate.", h("br"), "Get it done."),
        h("p", { text: "DELA turns your to-do list into a clear plan and the right people to carry it out." }),
        (me.switches || {}).ai_generation
          ? h("button", { class: "pill-white", onclick: function () { tab = "delegate"; draw(); } }, "Ask DELA to plan a task")
          : h("button", { class: "pill-white", disabled: true, title: "Opens in the next DELA update" }, "Start a new delegation (opening soon)")),
      h("div", { class: "stats" },
        stat("☰", 0, "Open tasks"),
        stat("▣", 0, "Active projects"),
        stat("!", 0, "Pending reviews"),
        draftTile()),
      h("div", { class: "card" }, h("div", { class: "row" }, h("h2", { text: "Verification" }), h("span", { class: "badge", text: s.verification_state.split("_").join(" ") })), h("p", { text: ver }),
        (me.switches || {}).profiles ? h("button", { class: "blue small", onclick: function () { tab = "profile"; draw(); } }, s.verification_state === "verified" ? "Open your profile" : "Set up your profile and verification") : null),
      h("h2", { style: "margin-top:22px", text: "What DELA will do for you" }),
      (me.switches || {}).playbook_library
        ? h("div", { class: "work" }, h("span", { class: "chip", text: "1" }), h("div", null, h("h3", { text: "Playbooks" }), h("div", { class: "muted small", text: "Describe a task. DELA asks what it needs and builds a step by step plan you approve." })), h("span", { class: "grow" }),
          h("button", { class: "ghost small", onclick: function () { tab = "library"; lib.pb = null; lib.importId = null; draw(); } }, "Open the Library"))
        : soon(1, "Playbooks", "Describe a task. DELA asks what it needs and builds a step by step plan you approve."),
      (me.switches || {}).flex_gigs ? liveRow(2, "Flex Gigs", gigsEnt ? "Post approved work with a budget range. Your plan allows " + (gigsEnt.unlimited ? "unlimited" : gigsEnt.limit) + " open at once." : "Post approved work with a budget range.", "Open Projects", "projects")
        : soon(2, "Flex Gigs", gigsEnt ? "Post approved work with a budget range. Your plan allows " + (gigsEnt.unlimited ? "unlimited" : gigsEnt.limit) + " open at once." : "Post approved work with a budget range."),
      (me.switches || {}).talent_search ? liveRow(3, "Talent", "See available, qualified freelancers and invite them to a gig.", "Open Talent", "talent")
        : soon(3, "Talent and your bench", "See available, qualified paralegals, including people you have worked with before."),
      soon(4, "Engagements and payments", "Sign a fixed-fee agreement and fund each milestone before work starts."),
      planCard());
  }

  function freelancerHome() {
    var s = sideInfo();
    var props = ent("fl.proposals");
    var ready = {
      incomplete: "A few profile items are still needed before you can be matched with attorneys.",
      verification_pending: "We are checking your details.",
      match_ready: "You are match-ready. Attorneys can find and invite you.",
      availability_stale: "Please confirm your availability so attorneys know you can take work.",
      unavailable: "You are marked as not taking new work.",
      restricted: "Matching is paused on your account. Contact the Lawfecta Team.",
    }[s.readiness_state] || "";
    var items = ["Headline and summary", "Practice areas", "At least one clear service", "Relevant experience", "Software you use (or none)", "Work and jurisdiction preferences", "Current availability", "Marketplace and confidentiality agreements"];
    return h("div", null,
      h("h1", { text: greeting() + ", " + D.firstName(me.person.name) }),
      h("p", { class: "muted", text: "Get match-ready, win work from attorneys and get paid for each milestone you deliver." }),
      h("div", { class: "hero navy" },
        h("div", { class: "eyebrow", text: "Match readiness" }),
        h("h2", { text: "Your profile, through an attorney's eyes" }),
        h("p", { text: ready }),
        h("span", { class: "badge", style: "background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.3)", text: s.readiness_state.split("_").join(" ") })),
      h("div", { class: "stats" },
        stat("✉", props ? (props.unlimited ? "No cap" : props.remaining) : 0, "Proposals left this month"),
        stat("★", 0, "Invitations"),
        stat("▣", 0, "Active projects"),
        stat("$", D.money(0), "Paid out")),
      (me.switches || {}).profiles
        ? h("div", { class: "card" }, h("h2", { text: "Your match checklist" }), h("p", { class: "muted small", text: ready || "Open your profile to see exactly what is missing." }),
            h("button", { class: "blue small", onclick: function () { tab = "profile"; draw(); } }, s.readiness_state === "match_ready" ? "Open your profile" : "Finish your profile"))
        : h("div", { class: "card" }, h("h2", { text: "Your match checklist" }), h("p", { class: "muted small", text: "Opening soon. These are the items attorneys need to see before DELA can match you." }),
            items.map(function (t) { return h("div", { class: "check" }, h("i", { "aria-hidden": "true" }), h("span", { text: t })); })),
      h("h2", { style: "margin-top:22px", text: "What DELA will do for you" }),
      soon(1, "Profile Builder and Profile Audit", "Build a strong profile and see exactly what to improve."),
      soon(2, "Services, promotions and pitches", "Publish clear services. Nothing goes live without your approval."),
      (me.switches || {}).flex_gigs ? liveRow(3, "Matches and proposals", "See gigs that fit you, with why, and send proposals with your price, what is included and your schedule.", "Open Work", "work")
        : soon(3, "Matches and proposals", "See work that fits you and send proposals with price, milestones and timeline."),
      soon(4, "Active work and payouts", "Deliver milestones, get DELA's check, and track each payout."),
      planCard());
  }

  function sectionSoon(title, text) {
    return h("div", null, h("h1", { text: title }), h("div", { class: "card" }, h("span", { class: "soon", text: "Coming soon" }), h("p", { style: "margin-top:6px", text: text })));
  }

  var SECTIONS = {
    delegate: ["Delegate", "Start a delegation, answer DELA's questions, and approve a step by step playbook. This opens in the next DELA update."],
    projects: ["Projects", "Your gigs, proposals, signed engagements and milestones will live here."],
    talent: ["Talent", "Find available, qualified paralegals, and keep your trusted bench in one place."],
    profile: ["Profile", "Profile Builder and Profile Audit, your services, promotions and pitches will live here."],
    work: ["Work", "Matches, invitations, proposals and active projects will live here."],
    earnings: ["Earnings", "Funded milestones, payouts and your bank transfer status will live here."],
  };

  function noSide() {
    return h("div", { class: "card", style: "max-width:620px" },
      h("h1", { text: "Almost there" }),
      h("p", { text: "Your Lawfecta plan is not linked to DELA yet, so we do not know whether to open Attorney DELA or Freelancer DELA for you." }),
      h("p", { class: "muted", text: "The Lawfecta Team will set this up. If you just changed plans, refresh this page in a minute." }));
  }

  // ---------- Step 2a: Ask DELA (chat with talking), AI settings, Files ----------

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function err(e) { D.toast(app, D.errorText(e && e.message ? e.message : String(e)), true); }
  function providerName(p) { return p === "anthropic" ? "Claude" : "OpenAI"; }
  var KEY_PROBLEM = {
    bad_key: "the provider did not accept the key. It may have been deleted or typed wrong.",
    no_credit: "your account with the provider is out of credit or has no billing set up.",
    rate_limited: "the provider is busy with too many requests on this key. Wait a minute and try again.",
    provider_down: "the provider is not answering right now. Try again in a few minutes.",
    model_not_found: "this key cannot use the AI model DELA asked for.",
    refused: "the AI declined to answer this request.",
    too_long: "the message and files are too long for one answer. Attach fewer files or ask about one part.",
    bad_request: "the provider could not handle this request.",
  };
  var KIND_WORDS = { social_security_number: "a Social Security number", date_of_birth: "a date of birth", case_number: "a case number", federal_case_number: "a case number",
    client_name: "a client's name", account_number: "an account number", case_caption: "a case name", phone_number: "a phone number", email_address: "an email address", street_address: "a street address" };
  function kindsText(k) { return (k || []).map(function (x) { return KIND_WORDS[x] || x.split("_").join(" "); }).join(", "); }
  function mbText(bytes) {
    if (bytes === null || bytes === undefined) return "no cap";
    if (bytes < 1048576) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    var v = bytes / 1048576;
    return v >= 1000 ? String(Math.round(v / 100) / 10) + " GB" : (v < 10 ? v.toFixed(1) : String(Math.round(v))) + " MB";
  }
  // The full notice is at the top of every page; next to where people type or upload, a short reminder
  function notice() { return h("p", { class: "small muted", style: "margin:0 0 8px", role: "note", text: "No confidential client information. Use placeholders such as [Client Name] or [Case Number]. You are responsible for what you enter." }); }

  // ---------- Ask DELA ----------

  var chat = { id: null, list: [], messages: [], files: [], attach: [], pending: null, busy: false, problem: null, ai: null, picking: false };
  var chatEl = null;

  function chatView() {
    chatEl = h("div", null, h("p", { class: "muted", text: "Loading..." }));
    Promise.all([api.get("/ai"), api.get("/ai/chats"), me.side === "attorney" && (me.switches || {}).file_uploads ? api.get("/files").catch(function () { return null; }) : Promise.resolve(null)])
      .then(function (r) {
        chat.ai = r[0];
        chat.list = r[1].items || [];
        chat.files = r[2] && r[2].ok ? r[2].files.filter(function (f) { return f.status === "ready"; }) : [];
        if (chat.id) return openChat(chat.id);
        drawChat();
      }).catch(function (e) { D.clear(chatEl); chatEl.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    return chatEl;
  }

  function openChat(id) {
    return api.get("/ai/chat?id=" + encodeURIComponent(id)).then(function (r) {
      chat.id = r.chat.id;
      chat.messages = r.chat.messages;
      chat.problem = null;
      chat.pending = null;
      drawChat();
    }).catch(function () { chat.id = null; chat.messages = []; drawChat(); });
  }

  function creditsLine() {
    var ai = chat.ai || {};
    if (ai.mode === "own_key") {
      var k = ai.own_key || ai.firm_key;
      return k ? "Using your " + providerName(k.provider) + " key ending " + k.last4 + "." : "You chose your own key, but none is saved yet.";
    }
    var c = ai.credits;
    if (!c) return "";
    return c.unlimited ? "Using Lawfecta's AI." : "Using Lawfecta's AI: " + (c.remaining === null ? c.limit : c.remaining) + " of " + c.limit + " included credits left this month.";
  }

  function drawChat() {
    if (!chatEl) return;
    D.clear(chatEl);
    var head = h("div", { class: "row", style: "margin:18px 0 4px" },
      h("h1", { style: "margin:0", class: "grow", text: me.side === "attorney" ? "Ask DELA" : "Ask DELA" }),
      h("button", { class: "ghost small", onclick: function () { chat.id = null; chat.messages = []; chat.problem = null; chat.pending = null; chat.attach = []; drawChat(); } }, "New chat"),
      h("button", { class: "ghost small", onclick: function () { tab = "ai"; draw(); } }, "AI settings"));
    chatEl.appendChild(head);
    chatEl.appendChild(h("p", { class: "muted", text: me.side === "attorney"
      ? "Describe a task you want to hand off, ask for a checklist, or attach a process document and ask DELA to turn it into a playbook. " + creditsLine()
      : "Plan your work, draft a checklist or tidy a process. " + creditsLine() }));
    if (chat.list.length) {
      var sel = h("select", { "aria-label": "Earlier chats", onchange: function () { if (sel.value) openChat(sel.value); } },
        h("option", { value: "", text: chat.id ? "Switch to another chat" : "Open an earlier chat" }),
        chat.list.map(function (c) { return h("option", { value: c.id, text: c.title + " (" + D.date(c.updated_at) + ")" }); }));
      chatEl.appendChild(h("div", { class: "row" }, sel,
        chat.id ? h("button", { class: "ghost small", onclick: function () {
          if (!confirm("Remove this chat from your list?")) return;
          api.post("/ai/chat/archive", { id: chat.id }).then(function () { chat.list = chat.list.filter(function (c) { return c.id !== chat.id; }); chat.id = null; chat.messages = []; drawChat(); }).catch(err);
        } }, "Remove this chat") : null));
    }
    var list = h("div", { class: "chat", "aria-live": "polite" });
    if (!chat.messages.length && !chat.pending) list.appendChild(h("div", { class: "card soft" }, h("p", { style: "margin:0", text: "Try: \"Turn my notes on opening a new matter into a step by step checklist a paralegal can follow.\"" })));
    chat.messages.forEach(function (m) { list.appendChild(bubble(m)); });
    if (chat.pending && chat.busy) list.appendChild(h("div", { class: "msg user", text: chat.pending.content }));
    if (chat.busy) list.appendChild(h("div", { class: "msg assistant muted", text: "DELA is thinking..." }));
    chatEl.appendChild(list);
    if (chat.problem) chatEl.appendChild(problemBox(chat.problem));
    chatEl.appendChild(composer());
  }

  function bubble(m) {
    var b = h("div", { class: "msg " + m.role, text: m.content });
    if (m.files && m.files.length) b.appendChild(h("span", { class: "src", text: "Files: " + m.files.map(function (f) { return f.name; }).join(", ") }));
    if (m.role === "assistant" && m.source) b.appendChild(h("span", { class: "src", text: m.source === "lawfecta" ? "Answered with Lawfecta's AI" : m.source === "firm_key" ? "Answered with your firm's key" : "Answered with your own key" }));
    return b;
  }

  var composerText = null;
  function composer() {
    var ai = chat.ai || {};
    var ta = h("textarea", { "aria-label": "Your message", placeholder: "Type here, or press Talk and say it", maxlength: "8000", value: chat.pending && !chat.busy ? chat.pending.content : (composerText ? composerText.value : "") });
    composerText = ta;
    ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendNew(); } });
    var status = h("span", { class: "small muted", role: "status" });
    var auto = h("input", { type: "checkbox", id: "dela-auto-send", checked: localPref("autoSend") });
    auto.addEventListener("change", function () { localPref("autoSend", auto.checked); });
    var micOk = ai.voice_on && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder;
    var mic = micOk ? h("button", { class: "mic small", type: "button", "aria-pressed": "false", onclick: function () { toggleMic(mic, ta, status, auto); } }, "● Talk") : null;
    var attachRow = null;
    if (me.side === "attorney" && (me.switches || {}).file_uploads) {
      attachRow = h("div", null,
        chat.attach.length ? h("div", { class: "chips" }, chat.attach.map(function (f) {
          return h("span", null, f.name, h("button", { "aria-label": "Remove " + f.name, onclick: function () { chat.attach = chat.attach.filter(function (x) { return x.id !== f.id; }); drawChat(); } }, "×"));
        })) : null,
        chat.picking ? filePicker() : null);
    }
    return h("div", { class: "composer" },
      notice(),
      attachRow,
      ta,
      h("div", { class: "row", style: "margin-top:8px" },
        mic,
        mic ? h("label", { for: "dela-auto-send", class: "small", style: "margin:0;font-weight:600;display:flex;gap:6px;align-items:center" }, auto, "Send when I stop talking") : null,
        attachRow ? h("button", { class: "ghost small", type: "button", onclick: function () { chat.picking = !chat.picking; drawChat(); } }, chat.picking ? "Close files" : "Add a file") : null,
        h("span", { class: "grow" }),
        status,
        h("button", { class: "blue", disabled: chat.busy, onclick: sendNew }, chat.busy ? "Sending..." : "Send")),
      micOk ? null : (ai.voice_on ? h("p", { class: "small muted", style: "margin:6px 0 0", text: "Talking needs a browser with microphone support. You can type instead." }) : null));
  }

  function filePicker() {
    if (!chat.files.length) return h("p", { class: "small muted", text: "No files ready yet. Upload process documents on the Files tab, then attach them here." });
    return h("div", { class: "pick" }, chat.files.map(function (f) {
      var on = chat.attach.some(function (x) { return x.id === f.id; });
      var cb = h("input", { type: "checkbox", checked: on });
      cb.addEventListener("change", function () {
        if (cb.checked) { if (chat.attach.length >= 5) { cb.checked = false; D.toast(app, D.errorText("too_many_files"), true); return; } chat.attach.push({ id: f.id, name: f.name }); }
        else chat.attach = chat.attach.filter(function (x) { return x.id !== f.id; });
        drawChat();
      });
      return h("label", null, cb, f.name);
    }));
  }

  function localPref(k, v) {
    try {
      if (v === undefined) return localStorage.getItem("dela." + k) === "1";
      localStorage.setItem("dela." + k, v ? "1" : "0");
    } catch (e) { return false; }
    return v;
  }

  function sendNew() {
    var text = (composerText ? composerText.value : "").trim();
    if (!text || chat.busy) return;
    chat.pending = { content: text, request_id: newId(), file_ids: chat.attach.map(function (f) { return f.id; }), files: chat.attach.slice(), attempt: 0 };
    send({});
  }

  // Sends the pending message. extra: lawfecta_once, confirm_no_client_info, retry
  function send(extra) {
    var p = chat.pending;
    if (!p) return;
    if (extra.retry) p.attempt += 1;
    if (extra.confirm_no_client_info) p.confirmed = true;
    chat.busy = true;
    chat.problem = null;
    drawChat();
    api.post("/ai/chat/send", { content: p.content, request_id: p.request_id, chat_id: chat.id, file_ids: p.file_ids, attempt: p.attempt,
      lawfecta_once: extra.lawfecta_once === true, confirm_no_client_info: p.confirmed === true }).then(function (r) {
      chat.busy = false;
      if (r.chat_id) chat.id = r.chat_id;
      if (!r.ok) { chat.problem = r; drawChat(); return; }
      chat.messages.push({ role: "user", content: p.content, files: p.files });
      chat.messages.push({ role: "assistant", content: r.reply.content, source: r.reply.source });
      if (r.cut) chat.messages.push({ role: "assistant", content: "Note: the attached files were long, so DELA read only the first part of them.", source: "" });
      chat.pending = null;
      chat.attach = [];
      chat.picking = false;
      if (composerText) composerText.value = "";
      if (!chat.list.some(function (c) { return c.id === chat.id; })) chat.list.unshift({ id: chat.id, title: p.content.slice(0, 60), updated_at: new Date().toISOString() });
      drawChat();
    }).catch(function (e) { chat.busy = false; chat.problem = { reason: e.message }; drawChat(); });
  }

  function problemBox(pr) {
    var ai = chat.ai || {};
    var box = h("div", { class: "problem", role: "alert" });
    function btn(label, fn, cls) { return h("button", { class: (cls || "ghost") + " small", onclick: fn }, label); }
    var fix = btn("Fix my key", function () { tab = "ai"; draw(); });
    var once = ai.backup_credits !== false ? btn("Use Lawfecta credits this time", function () { send({ lawfecta_once: true, retry: true }); }, "blue") : null;
    if (pr.reason === "looks_like_client_info") {
      box.appendChild(h("p", { text: "This message may include " + kindsText(pr.kinds) + ". Confidential client information does not belong in DELA. Please replace names and numbers with placeholders such as [Client Name] or [Case Number]." }));
      box.appendChild(h("div", { class: "row" }, btn("Edit my message", function () { chat.problem = null; drawChat(); if (composerText) composerText.focus(); }),
        btn("Send anyway, it has no client information", function () { send({ confirm_no_client_info: true }); })));
    } else if (pr.reason === "ai_failed" && pr.source !== "lawfecta") {
      var k = ai.own_key || ai.firm_key || {};
      box.appendChild(h("p", { text: "Your " + providerName(k.provider) + " key did not work: " + (KEY_PROBLEM[pr.code] || "the provider refused the request.") + " Nothing was sent with Lawfecta's key." }));
      box.appendChild(h("div", { class: "row" }, btn("Try again", function () { send({ retry: true }); }), fix, once));
    } else if (pr.reason === "ai_failed") {
      box.appendChild(h("p", { text: "DELA's AI could not answer: " + (KEY_PROBLEM[pr.code] || "something went wrong.") + " No credits were used." }));
      box.appendChild(h("div", { class: "row" }, btn("Try again", function () { send({ retry: true }); })));
    } else if (pr.reason === "no_key" || pr.reason === "key_unreadable") {
      box.appendChild(h("p", { text: D.errorText(pr.reason) }));
      box.appendChild(h("div", { class: "row" }, fix, once));
    } else if (pr.reason === "no_credits_left") {
      box.appendChild(h("p", { text: D.errorText(pr.reason) }));
      box.appendChild(h("div", { class: "row" }, btn("Add my own key", function () { tab = "ai"; draw(); }, "blue")));
    } else {
      box.appendChild(h("p", { text: D.errorText(pr.reason || "server_error") }));
      box.appendChild(h("div", { class: "row" }, btn("Try again", function () { send({ retry: true }); })));
    }
    return box;
  }

  // Talking: press to talk, press again to stop. The words land in the box to read and fix before sending.
  var rec = null;
  function toggleMic(btn, ta, status, auto) {
    if (rec) { rec.stop(); return; }
    var max = (chat.ai && chat.ai.voice_max_seconds) || 120;
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      var types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      var type = "";
      for (var i = 0; i < types.length; i++) if (window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(types[i])) { type = types[i]; break; }
      var mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      var chunks = [];
      var started = Date.now();
      var quietSince = 0, heard = false, actx = null, timer = null;
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      function tick() {
        var sec = Math.round((Date.now() - started) / 1000);
        status.textContent = "Listening... " + sec + "s (stops at " + max + "s)";
        if (sec >= max) { cur.stop(); return; }
        // Send when I stop talking: about two seconds of quiet after speech
        if (actx && auto.checked) {
          var data = new Uint8Array(actx.an.fftSize);
          actx.an.getByteTimeDomainData(data);
          var sum = 0;
          for (var j = 0; j < data.length; j++) { var v = (data[j] - 128) / 128; sum += v * v; }
          var rms = Math.sqrt(sum / data.length);
          if (rms > 0.04) { heard = true; quietSince = 0; } else if (heard) { quietSince = quietSince || Date.now(); if (Date.now() - quietSince > 2000) { cur.stop(); return; } }
        }
      }
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) { var c = new AC(); var an = c.createAnalyser(); an.fftSize = 1024; c.createMediaStreamSource(stream).connect(an); actx = { c: c, an: an }; }
      } catch (e) { actx = null; }
      var cur = {
        stop: function () {
          if (mr.state !== "inactive") mr.stop();
        },
      };
      mr.onstop = function () {
        clearInterval(timer);
        stream.getTracks().forEach(function (t) { t.stop(); });
        if (actx) try { actx.c.close(); } catch (e) { /* closing is best effort */ }
        rec = null;
        btn.classList.remove("on");
        btn.setAttribute("aria-pressed", "false");
        btn.textContent = "● Talk";
        var seconds = Math.round((Date.now() - started) / 1000);
        var blob = new Blob(chunks, { type: (mr.mimeType || type || "audio/webm").split(";")[0] });
        if (blob.size < 200) { status.textContent = "No sound was recorded. Check your microphone."; return; }
        status.textContent = "Turning your words into text...";
        transcribeBlob(blob, seconds, 0, false).then(function (r) {
          if (!r.ok) { status.textContent = voiceProblem(r); return; }
          status.textContent = r.why === "claude_key_voice" ? "Done. (Claude keys cannot turn speech into text, so Lawfecta's speech to text was used.)" : "";
          ta.value = (ta.value ? ta.value.replace(/\s+$/, "") + " " : "") + r.text;
          if (auto.checked && r.text) sendNew();
          else ta.focus();
        }).catch(function (e) { status.textContent = D.errorText(e.message); });
      };
      rec = cur;
      mr.start(1000);
      timer = setInterval(tick, 200);
      btn.classList.add("on");
      btn.setAttribute("aria-pressed", "true");
      btn.textContent = "■ Stop";
      tick();
    }).catch(function (e) {
      status.textContent = e && e.name === "NotAllowedError"
        ? "Your browser blocked the microphone. Click the icon left of the web address, allow the microphone for this site, then press Talk again. On a Mac, also check System Settings, Privacy and Security, Microphone."
        : "No microphone was found. You can type instead.";
    });
  }

  function transcribeBlob(blob, seconds, attempt, once) {
    return api.raw("/ai/transcribe?request_id=" + newId() + "&seconds=" + seconds + "&attempt=" + attempt + (once ? "&lawfecta_once=1" : ""), blob, blob.type || "audio/webm");
  }

  function voiceProblem(r) {
    if (r.reason === "ai_failed" && r.source !== "lawfecta") return "Your key could not turn speech into text: " + (KEY_PROBLEM[r.code] || "the provider refused it.") + " You can type instead.";
    if (r.reason === "ai_failed") return "Speech to text did not work: " + (KEY_PROBLEM[r.code] || "something went wrong.") + " You can type instead.";
    if (r.reason === "too_long") return "That recording was too long. Keep each one under " + ((chat.ai && chat.ai.voice_max_seconds) || 120) + " seconds.";
    if (r.reason === "no_credits_left") return "Talking uses your included AI credits, and they are used up this month. You can type instead.";
    return D.errorText(r.reason || "server_error");
  }

  // ---------- AI settings ----------

  var aiEl = null;
  function aiSettingsView() {
    aiEl = h("div", null, h("p", { class: "muted", text: "Loading..." }));
    loadAi();
    return aiEl;
  }
  function loadAi() { api.get("/ai").then(function (r) { chat.ai = r; drawAi(r); }).catch(function (e) { D.clear(aiEl); aiEl.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); }); }

  function drawAi(ai) {
    D.clear(aiEl);
    aiEl.appendChild(h("h1", { text: "AI settings" }));
    aiEl.appendChild(h("p", { class: "muted", text: "These settings are for your " + D.SIDE[me.side] + " side only." }));
    var c = ai.credits;
    var radios = h("div", null,
      choice("lawfecta", "Use Lawfecta's AI", c ? (c.unlimited ? "Included with your plan." : "Included with your plan: " + (c.remaining === null ? c.limit : c.remaining) + " of " + c.limit + " credits left this month.") : "Included with your plan."),
      choice("own_key", "Use my own key", ai.byok_on ? "Your OpenAI or Claude account pays for the AI. Your included credits stay as a backup you can choose to use." : "Opens soon."));
    function choice(v, label, sub) {
      var r = h("input", { type: "radio", name: "dela-ai-mode", value: v, checked: ai.mode === v, disabled: v === "own_key" && !ai.byok_on });
      r.addEventListener("change", function () {
        api.post("/ai/mode", { mode: v }).then(function (x) { if (x.ok === false) throw new Error(x.reason); D.toast(app, "Saved"); loadAi(); }).catch(function (e) { err(e); loadAi(); });
      });
      return h("label", { style: "display:flex;gap:10px;align-items:flex-start;font-weight:400;margin:10px 0" }, r, h("span", null, h("b", { text: label }), h("br"), h("span", { class: "small muted", text: sub })));
    }
    aiEl.appendChild(h("div", { class: "card" }, h("h2", { text: "Which AI DELA uses" }), radios,
      ai.lawfecta_ready === false ? h("p", { class: "small muted", text: "Lawfecta's AI is still being set up." }) : null));
    if (ai.byok_on) {
      aiEl.appendChild(keyCard(ai, "person", ai.own_key, "Your own key", "Only you use this key."));
      if (ai.may_manage_firm_key || (ai.firm_key && !ai.firm_key.mine)) {
        aiEl.appendChild(keyCard(ai, "org", ai.firm_key, "Firm key", ai.may_manage_firm_key ? "Everyone in your firm can use this key. A person's own key is used first." : "Your firm owner added this key for the team."));
      }
    }
    var u = ai.usage || {};
    aiEl.appendChild(h("div", { class: "card" }, h("h2", { text: "This month" }),
      h("div", { class: "kv" },
        h("div", null, "AI tasks on your key", h("b", { text: String(u.own_tasks || 0) })),
        h("div", null, "Text read and written on your key", h("b", { text: ((u.own_input_tokens || 0) + (u.own_output_tokens || 0)).toLocaleString("en-US") + " tokens" })),
        h("div", null, "AI tasks on Lawfecta's AI", h("b", { text: String(u.lawfecta_tasks || 0) })),
        h("div", null, "Included credits used", h("b", { text: String(u.lawfecta_credits || 0) }))),
      h("p", { class: "small muted", style: "margin-top:10px", text: "Your provider's billing page shows the exact cost of what ran on your key." })));
    aiEl.appendChild(h("div", { class: "card" }, h("h2", { text: "Talking to the AI" }),
      h("p", { text: ai.voice_on ? "Press Talk in any AI chat, say what you need, and press Stop. Your words appear in the box so you can fix them before you press Send. Recordings are turned into text and not kept." : "Talking to the AI opens soon." }),
      ai.voice_on ? h("p", { class: "small muted", text: "Each recording can be up to " + ai.voice_max_seconds + " seconds. Claude keys cannot turn speech into text, so members on a Claude key use Lawfecta's speech to text, which uses included credits. OpenAI keys handle it themselves." }) : null));
    if ((me.switches || {}).profiles) {
      aiEl.appendChild(h("div", { class: "card" }, h("h2", { text: "What DELA knows about you" }),
        h("p", { text: "DELA's AI reads your own " + D.SIDE[me.side] + " profile (headline, practice areas, where you practice, your tech tools and services) to tailor its answers, for example by naming your own tools in playbook steps. It never reads other members' profiles." }),
        h("button", { class: "ghost small", onclick: function () { tab = "profile"; draw(); } }, "Open your profile")));
    }
    if ((me.switches || {}).member_insights) aiEl.appendChild(insightsCard());
    if ((me.switches || {}).gig_chat) aiEl.appendChild(prefsCard());
    aiEl.appendChild(connectionsCard());
  }

  function keyCard(ai, scope, k, title, sub) {
    var card = h("div", { class: "card" }, h("h2", { text: title }), h("p", { class: "muted small", text: sub }));
    var mine = scope === "person" || ai.may_manage_firm_key;
    if (k) {
      card.appendChild(h("div", { class: "kv" },
        h("div", null, "Provider", h("b", { text: providerName(k.provider) })),
        h("div", null, "Key", h("b", { text: "ending " + k.last4 })),
        h("div", null, "Used for", h("b", { text: k.use_for === "chat" ? "Chat and playbooks only" : "All AI tasks" })),
        h("div", null, "Status", h("b", { text: k.status === "failed" ? "Not working" : "Working" }))));
      if (k.status === "failed") card.appendChild(h("p", { class: "notice bad", text: "This key has not worked since " + D.date(k.failed_since) + ": " + (KEY_PROBLEM[k.last_error] || "the provider refused it.") + " Test it again after fixing it with your provider, or replace it." }));
      card.appendChild(h("div", { class: "row", style: "margin-top:10px" },
        h("button", { class: "ghost small", onclick: function () {
          api.post("/ai/key/test", { scope: scope }).then(function (r) { D.toast(app, r.ok ? "The key works." : "The key did not work: " + (KEY_PROBLEM[r.code] || D.errorText(r.reason)), !r.ok); loadAi(); }).catch(err);
        } }, "Test it"),
        mine ? h("button", { class: "ghost small", onclick: function () { D.clear(card); card.appendChild(h("h2", { text: "Replace " + title.toLowerCase() })); card.appendChild(keyForm(ai, scope)); } }, "Replace") : null,
        mine ? h("button", { class: "danger small", onclick: function () {
          if (!confirm("Remove this key? Any waiting AI work that was going to use it will stop. Nothing will run on Lawfecta's AI unless you choose it.")) return;
          api.post("/ai/key/remove", { scope: scope }).then(function (r) { if (r.ok === false) throw new Error(r.reason); D.toast(app, "Key removed"); loadAi(); }).catch(err);
        } }, "Remove") : null));
    } else if (mine) {
      card.appendChild(keyForm(ai, scope));
    }
    return card;
  }

  function keyForm(ai, scope) {
    var id = newId();
    var prov = h("select", { "aria-label": "Provider" }, h("option", { value: "openai", text: "OpenAI" }), h("option", { value: "anthropic", text: "Claude (Anthropic)" }));
    var key = h("input", { type: "password", autocomplete: "off", spellcheck: "false", placeholder: "Paste your key", style: "width:100%" });
    var use = h("select", { "aria-label": "Use the key for" }, h("option", { value: "all", text: "All AI tasks" }), h("option", { value: "chat", text: "Chat and playbooks only" }));
    var help = h("p", { class: "small muted" });
    function where() { help.textContent = prov.value === "openai" ? "Get a key at platform.openai.com, under API keys. Your OpenAI account needs billing set up." : "Get a key at console.anthropic.com, under API Keys. Your Anthropic account needs credit."; }
    prov.addEventListener("change", where);
    where();
    var save = h("button", { class: "blue" }, "Save and test");
    var msg = h("p", { role: "status", class: "small" });
    save.addEventListener("click", function () {
      if (!key.value.trim()) { msg.textContent = "Paste your key first."; return; }
      save.disabled = true;
      msg.textContent = "Testing the key with " + providerName(prov.value) + "...";
      api.post("/ai/key", { provider: prov.value, key: key.value, scope: scope, use_for: use.value, request_id: id }).then(function (r) {
        save.disabled = false;
        if (r.ok) { key.value = ""; D.toast(app, "Key saved. DELA will use it from now on."); loadAi(); return; }
        if (r.reason === "wrong_provider") msg.textContent = "That looks like a " + providerName(r.looks_like) + " key. Choose " + providerName(r.looks_like) + " above, or paste your " + providerName(prov.value) + " key.";
        else if (r.reason === "key_test_failed") msg.textContent = "The key did not work: " + (KEY_PROBLEM[r.code] || "the provider refused it.") + " It was not saved.";
        else msg.textContent = D.errorText(r.reason);
        id = newId();
      }).catch(function (e) { save.disabled = false; msg.textContent = D.errorText(e.message); });
    });
    return h("div", null,
      h("label", { text: "Provider" }), prov, help,
      h("label", { text: "Your key" }), key,
      h("label", { text: "Use it for" }), use,
      h("p", { class: "small muted", text: "DELA tests the key, then stores it locked so nobody, including the Lawfecta Team, can read it. Only the last 4 characters are shown." }),
      h("div", { class: "row" }, save), msg);
  }

  // ---------- Step 3: Profile and verification (both sides) ----------

  var prof = { data: null, body: null, dirty: false };
  var profEl = null;
  var READY_WORDS = {
    attorney: { incomplete: "A few profile items are still needed.", verification_pending: "Your profile is complete. Your license check is next.", match_ready: "You are verified. When hiring opens in DELA, you can post work and hire.", restricted: "Some actions are paused on your account. Contact the Lawfecta Team." },
    freelancer: { incomplete: "A few profile items are still needed before attorneys can be matched with you.", verification_pending: "Your profile is complete. Your LinkedIn check is next.", availability_stale: "Confirm your availability so attorneys know you can take work.", unavailable: "You are marked as not taking new work.", match_ready: "You are match-ready. Attorneys can find and invite you.", restricted: "Matching is paused on your account. Contact the Lawfecta Team." },
  };
  var STATE_BADGE = { incomplete: "Not complete", verification_pending: "Waiting for a check", match_ready: "Ready", availability_stale: "Availability out of date", unavailable: "Not taking work", restricted: "Paused" };
  var LIC_WORDS = { pending: "Waiting for the Lawfecta Team", needs_more: "We need a little more", verified: "Verified", not_verified: "Not verified", expired: "Check out of date" };

  function profileView() {
    profEl = h("div", null, h("p", { class: "muted", text: "Loading..." }));
    var confirmTok = "";
    try { confirmTok = new URLSearchParams(location.search).get("confirm") || ""; } catch (e) { confirmTok = ""; }
    var start = Promise.resolve();
    if (confirmTok && me.side === "attorney") {
      start = api.post("/licenses/confirm", { token: confirmTok }).then(function (r) {
        D.toast(app, r.ok ? "Email confirmed. The Lawfecta Team will finish the check." : D.errorText(r.reason), !r.ok);
        try { var u = new URL(location.href); u.searchParams.delete("confirm"); history.replaceState(null, "", u.toString()); } catch (e) { /* older browsers keep the address */ }
      }).catch(function (e) { D.toast(app, D.errorText(e.message), true); });
    }
    start.then(loadProfile);
    return profEl;
  }

  function loadProfile() {
    return api.get("/profile").then(function (r) {
      if (!r.ok) { D.clear(profEl); profEl.appendChild(h("p", { class: "notice", text: D.errorText(r.reason) })); return; }
      // Buttons such as the LinkedIn check, availability or a license reload the page's data; changes typed
      // into the form and not saved yet stay as they are (Stacey's Step 3 test, 2026-11-05)
      prof.data = r;
      if (!prof.dirty || !prof.body) { prof.body = JSON.parse(JSON.stringify(r.body)); prof.dirty = false; }
      drawProfile();
    }).catch(function (e) { D.clear(profEl); profEl.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  // help: what to enter, behind a "?" (hover on a computer, tap on a phone) (Stacey 2026-11-05)
  function field(label, input, hint, help, extra) {
    var tip = null, q = null;
    if (help) {
      tip = h("div", { class: "helpbox", hidden: true, role: "note", text: help });
      q = h("button", { class: "help-q", type: "button", title: help, "aria-label": "What to enter in " + label.split(" (optional)").join(""), "aria-expanded": "false", onclick: function () { tip.hidden = !tip.hidden; q.setAttribute("aria-expanded", String(!tip.hidden)); } }, "?");
    }
    return h("div", { style: "margin:8px 0" }, h("div", { class: "row", style: "gap:6px;align-items:center" }, h("label", { text: label, style: "margin:0" }), q), tip, input, hint ? h("div", { class: "small muted", text: hint }) : null, extra || null);
  }

  // "Write with DELA" under a box: DELA writes or improves just that box from a few facts (Stacey 2026-11-05)
  function writeWithDela(key, label, el) {
    var wrap = h("div", { style: "margin-top:6px" });
    var open = h("button", { class: "ghost small", type: "button" }, "✦ Write with DELA");
    open.addEventListener("click", function () {
      if (wrap.childNodes.length > 1) { wrap.removeChild(wrap.lastChild); return; }
      var notes = h("textarea", { rows: 3, style: "width:100%", "aria-label": "Facts for DELA about your " + label.toLowerCase(), placeholder: "A few facts for DELA, for example where you worked, for how long, what you did. Leave empty to improve what the box says now." });
      var msg = h("div", { role: "status", class: "small" });
      var go = h("button", { class: "blue small", type: "button" }, "Write it");
      function run(confirmed) {
        go.disabled = true; msg.textContent = "DELA is writing...";
        api.post("/profile/draft", { field: key, notes: notes.value, body: prof.body, confirm_no_client_info: confirmed === true }).then(function (x) {
          go.disabled = false;
          if (x.reason === "looks_like_client_info") { msg.textContent = ""; if (confirm("This may include client information. Click OK if it is not.")) run(true); return; }
          if (x.reason === "tell_us_more") { msg.textContent = "Tell DELA a few facts first, or write a little in the box for DELA to improve."; return; }
          if (!x.ok) { msg.textContent = failText(x); return; }
          prof.body[key] = x.text; el.value = x.text; prof.dirty = true;
          msg.textContent = "DELA wrote this from your facts. Check it, change anything, then click Save." + (x.questions && x.questions.length ? " DELA asks: " + x.questions.join(" ") : "");
        }).catch(function (e) { go.disabled = false; msg.textContent = D.errorText(e.message); });
      }
      go.addEventListener("click", function () { run(false); });
      wrap.appendChild(h("div", { class: "helpbox" }, h("p", { class: "small", style: "margin:0 0 6px", text: "DELA uses only the facts you give and what your profile says. It never invents a qualification. Uses AI credits like Ask DELA." }), notes, h("div", { class: "row", style: "margin-top:6px" }, go), msg));
    });
    wrap.appendChild(open);
    return wrap;
  }
  function textIn(key, label, opts) {
    opts = opts || {};
    var v = prof.body[key];
    var el = opts.area ? h("textarea", { rows: opts.rows || 4, style: "width:100%", "aria-label": label }) : h("input", { type: opts.type || "text", style: "width:100%", "aria-label": label, placeholder: opts.placeholder || "" });
    el.value = Array.isArray(v) ? v.join(", ") : v === null || v === undefined ? "" : String(v);
    el.addEventListener("input", function () {
      var t = el.value;
      prof.body[key] = opts.list ? t.split(",").map(function (x) { return x.trim(); }).filter(Boolean) : opts.type === "number" ? (t === "" ? null : Number(t)) : t;
      prof.dirty = true;
    });
    return field(label + (opts.required ? "" : " (optional)"), el, opts.hint, opts.help, opts.ai && (me.switches || {}).ai_generation ? writeWithDela(key, label, el) : null);
  }

  function drawProfile() {
    var r = prof.data, side = me.side, st = r.state || {};
    D.clear(profEl);
    profEl.appendChild(h("h1", { text: side === "attorney" ? "Profile and verification" : "Profile" }));
    profEl.appendChild(h("p", { class: "muted", text: "This is your " + D.SIDE[side] + " profile. Your Lawfecta directory listing is your public profile; DELA keeps them in step when you choose." }));
    profEl.appendChild(statusCard(st));
    if (side === "freelancer") profEl.appendChild(availabilityCard(st));
    if (side === "freelancer" && (me.switches || {}).meetings) profEl.appendChild(meetingAvailabilityCard());
    profEl.appendChild(side === "attorney" ? licenseCard() : linkedinCard());
    profEl.appendChild(formCard());
    if (side === "freelancer" && r.settings.documents_on) profEl.appendChild(docsCard());
    if (side === "attorney") {
      profEl.appendChild(firmCard());
      ((r.firm || {}).staff_of || []).forEach(function (o) { profEl.appendChild(firmCard(o)); });
    }
  }

  function statusCard(st) {
    var req = prof.data.required || [], miss = st.missing || [];
    var card = h("div", { class: "card" },
      h("div", { class: "row" }, h("h2", { class: "grow", text: "Where your profile stands" }), h("span", { class: "badge " + (st.readiness === "match_ready" ? "ready" : "held"), text: STATE_BADGE[st.readiness] || st.readiness })),
      h("p", { text: (READY_WORDS[me.side] || {})[st.readiness] || "" }));
    card.appendChild(h("div", null, req.map(function (k) {
      var done = miss.indexOf(k) < 0 && miss.indexOf("everything") < 0;
      return h("div", { class: "check" + (done ? " done" : "") }, h("i", { "aria-hidden": "true", text: done ? "✓" : "" }), h("span", { text: (prof.data.labels || {})[k] || k }));
    })));
    if (me.side === "attorney" && st.verification !== "verified") card.appendChild(h("p", { class: "small muted", style: "margin-top:8px", text: "You can use Ask DELA, playbooks, files and the recorder before you are verified. Posting work and hiring need a verified license." }));
    return card;
  }

  function availabilityCard(st) {
    var labels = { available: "Available for new work", limited: "Some hours only", unavailable: "Not taking new work" };
    var card = h("div", { class: "card" }, h("h2", { text: "Your availability" }));
    card.appendChild(h("p", { text: st.availability_confirmed_at
      ? "You said: " + labels[st.availability] + ", on " + D.date(st.availability_confirmed_at) + "." + (st.availability !== "unavailable" ? " Confirm again by " + D.date(st.availability_due_at) + " to stay in matches." : "")
      : "Tell attorneys whether you can take work. Confirm it every " + st.availability_days + " days to stay in matches." }));
    card.appendChild(h("div", { class: "row" }, ["available", "limited", "unavailable"].map(function (v) {
      return h("button", { class: st.availability === v && st.availability_confirmed_at ? "blue small" : "ghost small", onclick: function () {
        api.post("/profile/availability", { state: v }).then(function (x) { if (x.ok === false) throw new Error(x.reason); D.toast(app, "Availability saved"); loadProfile(); }).catch(err);
      } }, labels[v]);
    })));
    return card;
  }

  function licenseCard() {
    var r = prof.data, set = r.settings;
    var card = h("div", { class: "card" }, h("h2", { text: "License verification" }));
    if (!set.verification_on) { card.appendChild(h("p", { text: "License checks open soon. Your profile is saved meanwhile." })); return card; }
    card.appendChild(h("p", { class: "small muted", text: "The Lawfecta Team checks your license on the state bar's own website, usually within " + set.target_days + " business days. To show the license is yours, confirm an email that is on your bar record or at your firm's own domain, or have a " + set.video_minutes + " minute video call with us. We never ask for ID documents." }));
    (r.licenses || []).forEach(function (l) {
      var row = h("div", { class: "card", style: "margin:8px 0;padding:12px" },
        h("div", { class: "row" }, h("b", { class: "grow", text: l.region + " license " + l.bar_number }), h("span", { class: "badge " + (l.counts ? "ready" : l.status === "needs_more" || l.status === "not_verified" ? "bad" : "held"), text: LIC_WORDS[l.status] || l.status })),
        h("div", { class: "small muted", text: "Name on the record: " + l.name_on_record + (l.next_check_at && l.status === "verified" ? ". Next yearly check: " + D.date(l.next_check_at) : "") }));
      if (l.reason) row.appendChild(h("p", { class: "notice", text: l.reason }));
      if (l.status === "pending" || l.status === "needs_more") {
        if (l.method === "email") {
          var dv = l.email_delivery || {};
          if (l.email_confirmed) row.appendChild(h("p", { class: "small", text: "Email " + l.contact_email + " confirmed." }));
          else if (dv.state === "bounced") row.appendChild(h("p", { class: "notice bad", text: "We could not deliver the email to " + l.contact_email + ": " + (dv.reason || "their mail server refused it") + ". Click \"Send the email again\" later, withdraw this license and add it again with another work email, or ask for a video call instead." }));
          else row.appendChild(h("p", { class: "small", text: (dv.state === "delivered" ? "Delivered to " : "We emailed ") + l.contact_email + ". Click the link in it while signed in to Lawfecta. Check your spam folder too." }));
        }
        if (l.video_requested_at) row.appendChild(h("p", { class: "small", text: set.video_booking_url ? "Book your " + set.video_minutes + " minute video call:" : "The Lawfecta Team will email you to set up a " + set.video_minutes + " minute video call." },
          set.video_booking_url ? h("a", { href: set.video_booking_url, target: "_blank", rel: "noopener", text: " choose a time" }) : null));
        var acts = h("div", { class: "row" });
        if (l.method === "email" && !l.email_confirmed) acts.appendChild(h("button", { class: "ghost small", onclick: function () { api.post("/licenses/email", { id: l.id }).then(function (x) { D.toast(app, x.ok ? "Email sent again" : D.errorText(x.reason), !x.ok); }).catch(err); } }, "Send the email again"));
        if (!l.video_requested_at) acts.appendChild(h("button", { class: "ghost small", onclick: function () { api.post("/licenses/action", { id: l.id, action: "video" }).then(function (x) { if (x.ok === false) throw new Error(x.reason); D.toast(app, "Video call requested"); loadProfile(); }).catch(err); } }, "Ask for a video call instead"));
        acts.appendChild(h("button", { class: "danger small", onclick: function () { if (!confirm("Withdraw this license?")) return; api.post("/licenses/action", { id: l.id, action: "withdraw" }).then(function () { loadProfile(); }).catch(err); } }, "Withdraw"));
        row.appendChild(acts);
      }
      card.appendChild(row);
    });
    card.appendChild(licenseForm(set));
    return card;
  }

  function licenseForm(set) {
    var id = newId();
    var countries = set.countries || ["US"];
    var country = h("select", { "aria-label": "Country" }, countries.map(function (c) { return h("option", { value: c, text: c === "US" ? "United States" : c }); }));
    var region = h("select", { "aria-label": "State that issued the license" }, [h("option", { value: "", text: "Choose the state" })].concat((set.regions || []).map(function (c) { return h("option", { value: c, text: c }); })));
    var num = h("input", { type: "text", "aria-label": "Bar number", style: "width:100%" });
    var name = h("input", { type: "text", "aria-label": "Name on the bar record", style: "width:100%" });
    name.value = (prof.body.first_name + " " + prof.body.last_name).trim();
    var email = h("input", { type: "email", "aria-label": "Email for the check", style: "width:100%", placeholder: "you@yourfirm.com" });
    var mEmail = h("input", { type: "radio", name: "dela-lic-method", value: "email", checked: true });
    var mVideo = h("input", { type: "radio", name: "dela-lic-method", value: "video" });
    var emailBox = field("Email for the check", email, "The email on your state bar record, or an email at your firm's own domain. Gmail, Yahoo and other free email services do not count.");
    mEmail.addEventListener("change", function () { emailBox.style.display = ""; });
    mVideo.addEventListener("change", function () { emailBox.style.display = "none"; });
    var msg = h("p", { role: "status", class: "small" });
    var add = h("button", { class: "blue" }, "Add the license");
    add.addEventListener("click", function () {
      add.disabled = true; msg.textContent = "Saving...";
      api.post("/licenses/add", { request_id: id, country: country.value, region: region.value, bar_number: num.value, name_on_record: name.value, method: mVideo.checked ? "video" : "email", contact_email: email.value }).then(function (x) {
        add.disabled = false;
        if (!x.ok) { msg.textContent = D.errorText(x.reason); if (["free_email", "bad_email", "bad_region", "bad_bar_number", "name_needed"].indexOf(x.reason) >= 0) id = newId(); return; }
        D.toast(app, mVideo.checked ? "License added. We will set up the video call." : "License added. Check your email for the link.");
        loadProfile();
      }).catch(function (e) { add.disabled = false; msg.textContent = D.errorText(e.message); });
    });
    return h("details", { open: !(prof.data.licenses || []).length },
      h("summary", { style: "cursor:pointer;font-weight:700;margin:8px 0", text: "Add a license" }),
      countries.length > 1 ? field("Country", country) : h("p", { class: "small muted", text: "For now we check US licenses. Attorneys elsewhere can keep their profile and use DELA's planning tools." }),
      field("State that issued the license", region), field("Bar number", num), field("Name exactly as on the state bar record", name),
      h("div", { style: "margin:10px 0" }, h("label", { text: "How to show the license is yours" }),
        h("label", { style: "font-weight:400;display:flex;gap:8px;margin:6px 0" }, mEmail, h("span", { text: "Confirm an email (on my bar record or at my firm's domain)" })),
        h("label", { style: "font-weight:400;display:flex;gap:8px;margin:6px 0" }, mVideo, h("span", { text: "A " + set.video_minutes + " minute video call with the Lawfecta Team" }))),
      emailBox, h("div", { class: "row" }, add), msg);
  }

  function linkedinCard() {
    var r = prof.data, set = r.settings, li = r.linkedin;
    var card = h("div", { class: "card" }, h("h2", { text: "LinkedIn check" }));
    if (!set.verification_on) { card.appendChild(h("p", { text: "LinkedIn checks open soon." })); return card; }
    card.appendChild(h("p", { class: "small muted", text: "The Lawfecta Team checks that the name on your LinkedIn profile matches your DELA profile, and that LinkedIn shows its verified badge. We never ask for ID documents or a passport." }));
    if (li) {
      card.appendChild(h("div", { class: "row" }, h("span", { class: "grow small", text: li.url }), h("span", { class: "badge " + (li.status === "verified" ? "ready" : li.status === "pending" ? "held" : "bad"), text: LIC_WORDS[li.status] || li.status })));
      if (li.reason) card.appendChild(h("p", { class: "notice", text: li.reason }));
    }
    var url = h("input", { type: "url", "aria-label": "LinkedIn profile address", style: "width:100%", placeholder: "linkedin.com/in/your-name" });
    url.value = li ? li.url : prof.body.linkedin || "";
    var go = h("button", { class: li && li.status === "verified" ? "ghost small" : "blue small" }, li ? "Send for a new check" : "Ask for the check");
    go.addEventListener("click", function () {
      var u = url.value.trim();
      if (u && !/^https?:/i.test(u)) u = "https://" + u;
      api.post("/linkedin/submit", { url: u }).then(function (x) { if (x.ok === false) throw new Error(x.reason); D.toast(app, x.duplicate ? "Already sent" : "Sent to the Lawfecta Team"); prof.body.linkedin = u; loadProfile(); }).catch(err);
    });
    card.appendChild(field("LinkedIn profile address", url));
    card.appendChild(h("div", { class: "row" }, go));
    return card;
  }

  function formCard() {
    var r = prof.data, b = prof.body, side = me.side, req = r.required || [];
    var need = function (k) { return req.indexOf(k) >= 0; };
    var card = h("div", { class: "card" }, h("h2", { text: "Your profile" }));
    card.appendChild(h("p", { class: "notice", role: "note", text: "Profiles are seen by other members. Do not include confidential client information, client names or case details." }));
    var fill = h("button", { class: "ghost small" }, "Fill from my Lawfecta listing");
    fill.addEventListener("click", function () {
      fill.disabled = true;
      api.get("/profile/from-directory").then(function (x) {
        fill.disabled = false;
        if (!x.ok) { D.toast(app, D.errorText(x.reason), true); return; }
        var n = 0;
        Object.keys(x.fields).forEach(function (k) {
          var v = x.fields[k], cur = prof.body[k];
          var empty = cur === null || cur === undefined || cur === "" || (Array.isArray(cur) && !cur.length);
          // The photo always follows the listing; it counts only when it changed
          if (k === "photo_url") { if (cur !== v) { prof.body[k] = v; n++; } }
          else if (empty) { prof.body[k] = v; n++; }
        });
        prof.dirty = true;
        drawProfile();
        D.toast(app, n ? "Filled " + n + (n === 1 ? " item" : " items") + " from your listing. Check " + (n === 1 ? "it" : "them") + ", then Save." : "Your listing had nothing new to add: the boxes it fills are already filled here. Change anything below and click Save. With \"Also update my Lawfecta directory listing\" ticked at the bottom, your listing changes too.");
      }).catch(function (e) { fill.disabled = false; err(e); });
    });
    card.appendChild(h("div", { class: "row" }, fill, h("span", { class: "small muted", text: "Fills only empty boxes. Nothing is saved until you click Save. To change your listing from here, tick \"Also update my Lawfecta directory listing\" at the bottom before you save." })));
    // Change the photo right here (Stacey 2026-11-05)
    var shownPhoto = prof.photoPreview || (b.photo_file ? r.photo_view_url : "") || b.photo_url;
    var pic = shownPhoto ? h("img", { src: shownPhoto, alt: "Your profile photo", style: "width:64px;height:64px;border-radius:50%;object-fit:cover" }) : h("span", { class: "chip", style: "width:64px;height:64px;font-size:22px", "aria-hidden": "true", text: "?" });
    var photoIn = h("input", { type: "file", accept: "image/png,image/jpeg,.png,.jpg,.jpeg", style: "display:none", "aria-label": "Choose a profile photo" });
    var photoMsg = h("span", { class: "small muted", role: "status", text: b.photo_file ? "Your DELA profile photo." : b.photo_url ? "This photo comes from your Lawfecta listing." : "No photo yet." });
    photoIn.addEventListener("change", function () {
      if (!photoIn.files.length) return;
      photoMsg.textContent = "Uploading...";
      api.raw("/profile/photo", photoIn.files[0], photoIn.files[0].type || "image/jpeg").then(function (x) {
        if (!x.ok) { photoMsg.textContent = D.errorText(x.reason); return; }
        prof.body.photo_file = x.photo_file; prof.photoPreview = x.url; prof.dirty = true;
        drawProfile();
        D.toast(app, "New photo ready. Click Save to keep it.");
      }).catch(function (e) { photoMsg.textContent = D.errorText(e.message); });
    });
    card.appendChild(h("div", { class: "row", style: "margin:8px 0;gap:12px" }, pic, h("div", null, h("button", { class: "ghost small", type: "button", onclick: function () { photoIn.click(); } }, shownPhoto ? "Change photo" : "Add a photo"), h("div", null, photoMsg)), photoIn));
    card.appendChild(h("h3", { text: "About you" }));
    card.appendChild(textIn("first_name", "First name", { required: need("first_name"), help: "Your first name as you want members to see it." }));
    card.appendChild(textIn("last_name", "Last name", { required: need("last_name"), help: "Your last name as you want members to see it." }));
    card.appendChild(textIn("headline", "Headline", { required: need("headline"), ai: true, help: "One short line under your name: your role and the main kind of work you do. For example: Litigation paralegal for small firms.", placeholder: side === "attorney" ? "Family law attorney in Austin" : "Litigation paralegal, e-filing and discovery" }));
    card.appendChild(textIn("firm_name", side === "attorney" ? "Firm name" : "Company or agency", { required: need("firm_name"), help: side === "attorney" ? "The firm name clients and courts know you by." : "Your business name, if you work through one. Leave empty if you work under your own name." }));
    if (side === "attorney") card.appendChild(textIn("firm_role", "Your role at the firm", { help: "For example owner, partner, associate or of counsel.", placeholder: "Owner, partner, associate" }));
    card.appendChild(textIn("city", "City", { required: need("city"), help: "The city you work from." }));
    card.appendChild(textIn("state", "State", { required: need("state"), placeholder: "TX", help: "Two letters, for example TX or CA." }));
    card.appendChild(textIn("phone", "Business phone", { required: need("phone"), help: "A work number. Members contact you through Lawfecta, so this is shown only where your listing shows it." }));
    card.appendChild(textIn("website", "Website", { required: need("website"), help: "Your own or your firm's website, starting with https://" }));
    if (side === "attorney") card.appendChild(textIn("linkedin", "LinkedIn profile address", {}));
    card.appendChild(textIn("booking_link", "Booking link", { help: "A Calendly, TidyCal or similar link, if you use one.", hint: "A page where people book time with you, if you have one." }));
    card.appendChild(h("h3", { text: side === "attorney" ? "Your practice" : "What you support" }));
    var areas = h("div", { class: "row", style: "flex-wrap:wrap;gap:6px" });
    (r.practice_areas || []).forEach(function (a) {
      var on = b.practice_areas.indexOf(a) >= 0;
      var chip = h("button", { class: on ? "blue small" : "ghost small", "aria-pressed": String(on) }, a);
      chip.addEventListener("click", function () {
        var i = prof.body.practice_areas.indexOf(a);
        if (i >= 0) prof.body.practice_areas.splice(i, 1); else if (prof.body.practice_areas.length < 15) prof.body.practice_areas.push(a);
        prof.dirty = true;
        chip.className = i >= 0 ? "ghost small" : "blue small"; chip.setAttribute("aria-pressed", String(i < 0));
      });
      areas.appendChild(chip);
    });
    card.appendChild(field("Practice areas" + (need("practice_areas") ? "" : " (optional)"), areas));
    if (side === "attorney") card.appendChild(textIn("jurisdictions", "Where you are licensed or practice", { list: true, required: need("jurisdictions"), placeholder: "TX, Western District of Texas", hint: "Separate them with commas." }));
    card.appendChild(textIn("summary", "Summary", { area: true, rows: 5, required: need("summary"), ai: true, help: side === "attorney" ? "A short paragraph about your practice: what you handle, for whom, and how you like to work with support staff." : "A short paragraph about you: the work you do, for which kinds of firms, how you work and what you are known for. No client names or case details." }));
    card.appendChild(textIn("experience", "Experience", { area: true, required: need("experience"), ai: true, help: "Your roles or kinds of work, newest first, one per line, with years. For example: Senior paralegal, family law firm, 2019 to now." }));
    card.appendChild(textIn("education", "Education", { area: true, rows: 3, required: need("education"), ai: true, help: "Degrees, certificates and courses, one per line, with the school and year. For example: Paralegal certificate, Austin Community College, 2018." }));
    var none = h("input", { type: "checkbox", checked: !!b.software_none });
    none.addEventListener("change", function () { prof.body.software_none = none.checked; prof.dirty = true; });
    card.appendChild(toolsPicker(r.tech_tools || [], need("software"), r.tech_groups));
    card.appendChild(h("label", { style: "font-weight:400;display:flex;gap:8px" }, none, h("span", { text: "I do not use specific legal tech tools" })));
    if (side === "freelancer") {
      card.appendChild(textIn("skills", "Task skills", { list: true, help: "The tasks you do well, separated by commas.", placeholder: "E-filing, discovery requests, client intake", hint: "Separate them with commas." }));
      card.appendChild(servicesEditor(need("services")));
      card.appendChild(h("h3", { text: "How you work" }));
      var tz = h("select", { "aria-label": "Time zone" }, [h("option", { value: "", text: "Choose" })].concat((r.timezones || []).map(function (z) { return h("option", { value: z, text: z, selected: b.timezone === z }); })));
      tz.addEventListener("change", function () { prof.body.timezone = tz.value; prof.dirty = true; });
      card.appendChild(field("Time zone", tz));
      card.appendChild(textIn("hours", "Usual hours", { help: "When you usually work, with your time zone.", placeholder: "Weekdays 9 to 5 Central" }));
      card.appendChild(textIn("capacity_hours_week", "Hours a week you can take on", { type: "number", required: need("capacity"), help: "About how many hours of new work you can take each week. DELA uses it for matching." }));
      card.appendChild(textIn("states_excluded", "States you will not work for", { list: true, help: "Two-letter states where you will not take work, for example because of licensing rules. Leave empty if none.", hint: "Leave empty if none. Separate them with commas." }));
      if (need("linkedin")) card.appendChild(textIn("linkedin", "LinkedIn profile address", { required: true, placeholder: "linkedin.com/in/your-name" }));
      var ack = h("input", { type: "checkbox", checked: !!b.acknowledged });
      ack.addEventListener("change", function () { prof.body.acknowledged = ack.checked; prof.dirty = true; });
      card.appendChild(h("label", { style: "font-weight:400;display:flex;gap:8px;margin-top:10px" }, ack, h("span", { text: "I agree to keep attorneys' work confidential, to work only on funded milestones through Lawfecta, and not to take Lawfecta clients off the platform." })));
    }
    card.appendChild(draftHelper());
    var dir = h("input", { type: "checkbox", checked: r.directory !== false });
    var msg = h("p", { role: "status", class: "small" });
    if (r.sync_on) {
      card.appendChild(h("label", { style: "font-weight:400;display:flex;gap:8px;margin-top:12px" }, dir, h("span", { text: "Also update my Lawfecta directory listing" + ((me.sides || []).length > 1 ? " from this side (your listing is one page for both sides)" : "") })));
      var bdw = { waiting: "Your listing is being updated.", done: "Your listing was updated " + D.dateTime(r.bd_synced_at) + ".", failed: "Your listing could not be updated: " + (r.bd_error === "not_allowed" ? "DELA is not allowed to change listings yet." : r.bd_error) + " Your DELA profile is saved." }[r.bd_state];
      if (bdw) card.appendChild(h("p", { class: "small muted", text: bdw }));
      card.appendChild(h("p", { class: "small muted", text: "Clearing a box here does not clear it on your listing." }));
    }
    var save = h("button", { class: "blue" }, "Save");
    function doSave(confirmed) {
      save.disabled = true; msg.textContent = "Saving...";
      api.post("/profile/save", { body: prof.body, version: r.version, directory: dir.checked, confirm_no_client_info: confirmed === true }).then(function (x) {
        save.disabled = false;
        if (x.reason === "looks_like_client_info") {
          msg.textContent = "";
          if (confirm("This may include client information (" + (x.kinds || []).join(", ").split("_").join(" ") + "). Take it out and click Save, or click OK if it is not client information.")) doSave(true);
          return;
        }
        if (!x.ok) { msg.textContent = D.errorText(x.reason); return; }
        D.toast(app, "Profile saved");
        prof.dirty = false;
        loadProfile();
      }).catch(function (e) { save.disabled = false; msg.textContent = D.errorText(e.message); });
    }
    save.addEventListener("click", function () { doSave(false); });
    card.appendChild(h("div", { class: "row", style: "margin-top:12px" }, save));
    card.appendChild(msg);
    return card;
  }

  // Tech tools: common ones as choices, others typed. DELA's AI reads these to name the member's own tools in its answers.
  // Grouped by kind of tool, each group opens and closes; a group with picked tools starts open (Stacey 2026-11-05)
  function toolsPicker(known, required, groups) {
    groups = groups && groups.length ? groups : [{ name: "Tools", tools: known }];
    var box = h("div", { class: "tool-groups" });
    groups.forEach(function (g) {
      var count = h("span", { class: "small muted" });
      function recount() { var n = g.tools.filter(function (t) { return prof.body.software.indexOf(t) >= 0; }).length; count.textContent = n ? n + " chosen" : ""; }
      var chips = h("div", { class: "row", style: "flex-wrap:wrap;gap:6px;padding:8px 0 4px" });
      g.tools.forEach(function (t) {
        var on = prof.body.software.indexOf(t) >= 0;
        var chip = h("button", { class: on ? "blue small" : "ghost small", type: "button", "aria-pressed": String(on) }, t);
        chip.addEventListener("click", function () {
          var i = prof.body.software.indexOf(t);
          if (i >= 0) prof.body.software.splice(i, 1); else if (prof.body.software.length < 30) prof.body.software.push(t);
          prof.dirty = true;
          chip.className = i >= 0 ? "ghost small" : "blue small"; chip.setAttribute("aria-pressed", String(i < 0));
          recount();
        });
        chips.appendChild(chip);
      });
      recount();
      var any = g.tools.some(function (t) { return prof.body.software.indexOf(t) >= 0; });
      box.appendChild(h("details", { class: "tool-group", open: any || undefined }, h("summary", null, h("b", { text: g.name }), " ", count), chips));
    });
    var other = h("input", { type: "text", style: "width:100%", "aria-label": "Other tech tools", placeholder: "Other tools, separated by commas" });
    other.value = prof.body.software.filter(function (t) { return known.indexOf(t) < 0; }).join(", ");
    other.addEventListener("input", function () {
      var picked = prof.body.software.filter(function (t) { return known.indexOf(t) >= 0; });
      prof.body.software = picked.concat(other.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean));
      prof.dirty = true;
    });
    return h("div", null, field("Tech tools you use" + (required ? "" : " (optional)"), box, "Open a group to choose the tools you use. DELA's AI uses them to tailor its answers, for example by naming your own tools in playbook steps.",
      "Choose every tool you use day to day. Attorneys can search for freelancers by tool, and DELA names your tools in playbook steps."), other);
  }

  function servicesEditor(required) {
    var box = h("div", null, h("h3", { text: "Services" + (required ? "" : " (optional)") }), h("p", { class: "small muted", text: "What you do, for whom, and your usual price. Prices are a guide; each job is agreed in its proposal." }));
    var listEl = h("div");
    function drawList() {
      D.clear(listEl);
      prof.body.services.forEach(function (sv, i) {
        var t = h("input", { type: "text", "aria-label": "Service " + (i + 1) + " name", style: "width:100%", placeholder: "Draft discovery responses" });
        t.value = sv.title;
        t.addEventListener("input", function () { sv.title = t.value; prof.dirty = true; });
        var w = h("input", { type: "text", "aria-label": "Service " + (i + 1) + " for whom", style: "width:100%", placeholder: "Solo family law attorneys" });
        w.value = sv.for_whom;
        w.addEventListener("input", function () { sv.for_whom = w.value; prof.dirty = true; });
        var pf = h("input", { type: "number", min: "0", "aria-label": "Service " + (i + 1) + " price from", style: "width:110px" });
        var pt = h("input", { type: "number", min: "0", "aria-label": "Service " + (i + 1) + " price to", style: "width:110px" });
        pf.value = sv.price_from_cents === null ? "" : String(sv.price_from_cents / 100);
        pt.value = sv.price_to_cents === null ? "" : String(sv.price_to_cents / 100);
        function money(el, k) { el.addEventListener("input", function () { sv[k] = el.value === "" ? null : Math.round(Number(el.value) * 100); prof.dirty = true; }); }
        money(pf, "price_from_cents"); money(pt, "price_to_cents");
        var unit = h("select", { "aria-label": "Service " + (i + 1) + " price unit" }, h("option", { value: "fixed", text: "per job", selected: sv.unit !== "hour" }), h("option", { value: "hour", text: "per hour", selected: sv.unit === "hour" }));
        unit.addEventListener("change", function () { sv.unit = unit.value; prof.dirty = true; });
        listEl.appendChild(h("div", { class: "card", style: "margin:6px 0;padding:10px" }, field("Service", t), field("For whom", w),
          h("div", { class: "row" }, h("span", { text: "From $" }), pf, h("span", { text: "to $" }), pt, unit,
            h("button", { class: "danger small", onclick: function () { prof.body.services.splice(i, 1); prof.dirty = true; drawList(); } }, "Remove"))));
      });
    }
    drawList();
    box.appendChild(listEl);
    box.appendChild(h("button", { class: "ghost small", onclick: function () { if (prof.body.services.length >= 12) return; prof.body.services.push({ title: "", for_whom: "", price_from_cents: null, price_to_cents: null, unit: "fixed" }); prof.dirty = true; drawList(); } }, "Add a service"));
    return box;
  }

  function draftHelper() {
    var notes = h("textarea", { rows: 4, style: "width:100%", "aria-label": "Tell DELA about your work", placeholder: "A few sentences: what you do, for whom, for how long, the tools you use." });
    var msg = h("div", { role: "status", class: "small" });
    var go = h("button", { class: "ghost small" }, "Draft with DELA");
    function run(confirmed) {
      go.disabled = true; msg.textContent = "DELA is writing...";
      api.post("/profile/draft", { notes: notes.value, body: prof.body, confirm_no_client_info: confirmed === true }).then(function (x) {
        go.disabled = false;
        if (x.reason === "looks_like_client_info") { msg.textContent = ""; if (confirm("This may include client information. Click OK if it is not.")) run(true); return; }
        if (!x.ok) { msg.textContent = failText(x); return; }
        var d = x.draft;
        if (d.headline) prof.body.headline = d.headline;
        if (d.summary) prof.body.summary = d.summary;
        if (d.skills && d.skills.length && me.side === "freelancer") prof.body.skills = d.skills;
        if (d.software && d.software.length && !prof.body.software.length) prof.body.software = d.software;
        if (d.services && d.services.length && me.side === "freelancer" && !prof.body.services.length) prof.body.services = d.services;
        prof.dirty = true;
        drawProfile();
        D.toast(app, "DELA filled in a draft. Check it, then Save.");
        if (x.questions && x.questions.length) setTimeout(function () { D.toast(app, "DELA asks: " + x.questions.join(" ")); }, 600);
      }).catch(function (e) { go.disabled = false; msg.textContent = D.errorText(e.message); });
    }
    go.addEventListener("click", function () { run(false); });
    return h("details", { style: "margin-top:12px" }, h("summary", { style: "cursor:pointer;font-weight:700", text: me.side === "freelancer" ? "Let DELA draft your headline, summary and services" : "Let DELA draft your headline and summary" }),
      h("p", { class: "small muted", text: "DELA uses only what you write here and in the form. It does not invent qualifications. Uses AI credits like Ask DELA." }), notes, h("div", { class: "row" }, go), msg);
  }

  function docsCard() {
    var r = prof.data, set = r.settings;
    var card = h("div", { class: "card" }, h("h2", { text: "Profile documents" }),
      h("p", { class: "small muted", text: "A resume, certificates or work samples with no client information. PDF, Word, PNG or JPG, up to " + set.doc_max_mb + " MB each, " + set.docs_max + " at most. Each one stays private until you choose to show it to attorneys." }));
    var tick = h("input", { type: "checkbox", id: "dela-doc-tick" });
    var input = h("input", { type: "file", accept: ".pdf,.docx,.png,.jpg,.jpeg", style: "display:none" });
    var msg = h("p", { role: "status", class: "small" });
    var up = h("button", { class: "ghost small" }, "Upload a document");
    up.addEventListener("click", function () { if (!tick.checked) { msg.textContent = D.errorText("tick_needed"); return; } input.click(); });
    input.addEventListener("change", function () {
      var file = input.files[0];
      if (!file) return;
      msg.textContent = "Uploading " + file.name + "...";
      api.post("/profile/docs/start", { name: file.name, size_bytes: file.size, ticked: tick.checked, request_id: newId() }).then(function (x) {
        if (!x.ok) throw new Error(x.reason);
        if (x.duplicate) return { ok: true, status: x.status };
        return fetch(x.upload_url, { method: "PUT", headers: { "content-type": x.content_type, "x-upsert": "false" }, body: file }).then(function (res) {
          if (!res.ok) throw new Error("upload_failed");
          msg.textContent = "Checking " + file.name + "...";
          return api.post("/files/complete", { file_id: x.file_id });
        });
      }).then(function (c) {
        if (c.ok === false) throw new Error(c.reason);
        msg.textContent = c.status === "ready" ? "Ready." : c.status === "held" ? "Held for your check: see below." : c.status === "refused" ? "Not accepted." : "Checking.";
        input.value = "";
        loadProfile();
      }).catch(function (e) { msg.textContent = D.errorText(e.message); input.value = ""; });
    });
    card.appendChild(h("label", { style: "font-weight:400;display:flex;gap:8px" }, tick, h("span", { text: "This document has no confidential client information." })));
    card.appendChild(h("div", { class: "row" }, up, input));
    card.appendChild(msg);
    var DOC = { uploading: "Uploading", checking: "Checking", ready: "Ready", held: "Held: please check", refused: "Not accepted" };
    (r.documents || []).forEach(function (d) {
      var row = h("div", { class: "row", style: "border-top:1px solid var(--line);padding:8px 0" },
        h("span", { class: "grow" }, h("b", { text: d.name }), h("span", { class: "small muted", text: " " + (DOC[d.status] || d.status) + (d.status === "ready" ? (d.shown ? ", shown to attorneys" : ", private") : "") })));
      if (d.status === "ready" || d.status === "held") row.appendChild(h("button", { class: "ghost small", onclick: function () { api.post("/files/open", { file_id: d.id }).then(function (x) { if (x.ok) window.open(x.url, "_blank", "noopener"); else D.toast(app, D.errorText(x.reason), true); }).catch(err); } }, "Open"));
      if (d.status === "ready") row.appendChild(h("button", { class: "ghost small", onclick: function () { docAct(d.id, d.shown ? "hide" : "show"); } }, d.shown ? "Make private" : "Show to attorneys"));
      if (d.status === "held") row.appendChild(h("button", { class: "ghost small", onclick: function () { if (confirm("Confirm this document has no confidential client information?")) docAct(d.id, "confirm"); } }, "It has no client information"));
      if (d.status !== "uploading" && d.status !== "checking") row.appendChild(h("button", { class: "danger small", onclick: function () { if (confirm("Remove \"" + d.name + "\"?")) docAct(d.id, "remove"); } }, "Remove"));
      card.appendChild(row);
      if (d.status === "held" && d.check_reasons && d.check_reasons.length) card.appendChild(h("p", { class: "small notice", text: "DELA thinks it may include client information (" + d.check_reasons.join(", ").split("_").join(" ") + ")." }));
    });
    return card;
  }
  function docAct(id, action) {
    api.post("/profile/docs/action", { id: id, action: action }).then(function (x) { if (x.ok === false) throw new Error(x.reason); loadProfile(); }).catch(err);
  }

  function firmCard(other) {
    var fm = other ? { body: other.body, may_edit: true, role: "manager" } : prof.data.firm || {}, b = fm.body || {}, el = other ? {} : fm.eligibility || {};
    var card = h("div", { class: "card" }, h("h2", { text: other ? "Firm details for " + other.name + " (you are firm staff)" : "Firm details" }),
      h("p", { class: "small muted", text: "Needed before your first paid engagement: the billing address, who may sign for the firm, and an email for formal notices." }));
    var miss = el.missing_for_paid_work || [];
    var MISS = { billing_address: "Billing address", signatory: "Who may sign for the firm", service_email: "Email for formal notices" };
    if (miss.length) card.appendChild(h("p", { class: "small", text: "Still needed for paid work: " + miss.map(function (k) { return MISS[k] || k; }).join(", ") + "." }));
    var inputs = {};
    [["legal_name", "Firm's legal name"], ["website", "Firm website"], ["billing_address", "Billing address"], ["signatory_name", "Who may sign for the firm"], ["signatory_title", "Their title"], ["service_email", "Email for formal notices"], ["phone", "Firm phone"]].forEach(function (x) {
      var el2 = x[0] === "billing_address" ? h("textarea", { rows: 3, style: "width:100%", "aria-label": x[1] }) : h("input", { type: x[0] === "service_email" ? "email" : "text", style: "width:100%", "aria-label": x[1] });
      el2.value = b[x[0]] || "";
      el2.disabled = !fm.may_edit;
      inputs[x[0]] = el2;
      card.appendChild(field(x[1], el2));
    });
    if (fm.may_edit) {
      var msg = h("p", { role: "status", class: "small" });
      card.appendChild(h("div", { class: "row" }, h("button", { class: "blue small", onclick: function () {
        var body = {};
        Object.keys(inputs).forEach(function (k) { body[k] = inputs[k].value; });
        api.post("/firm/save", { body: body, org_id: other ? other.org_id : "" }).then(function (x) { if (x.ok === false) throw new Error(x.reason); D.toast(app, "Firm details saved"); loadProfile(); }).catch(function (e) { msg.textContent = D.errorText(e.message); });
      } }, "Save firm details")));
      card.appendChild(msg);
    } else {
      card.appendChild(h("p", { class: "small muted", text: "The firm owner or firm staff can change these." }));
    }
    if (fm.role === "owner" && (fm.staff || []).length) {
      card.appendChild(h("h3", { text: "Firm staff" }));
      card.appendChild(h("p", { class: "small muted", text: "Firm staff can set up the firm's details for you. You can name firm staff once your license is verified. Add people to your team first in Library, Team." }));
      fm.staff.forEach(function (p) {
        var on = p.role === "manager";
        card.appendChild(h("div", { class: "row" }, h("span", { class: "grow", text: p.name + " (" + p.bd_member_id + ")" + (on ? ": firm staff" : "") }),
          h("button", { class: on ? "danger small" : "ghost small", onclick: function () {
            api.post("/firm/staff", { bd_member_id: p.bd_member_id, on: !on }).then(function (x) { if (x.ok === false) throw new Error(x.reason); D.toast(app, on ? "No longer firm staff" : "Named firm staff"); loadProfile(); }).catch(err);
          } }, on ? "Remove as firm staff" : "Make firm staff")));
      });
    }
    return card;
  }

  // ---------- DELA in ChatGPT and Claude (connector) ----------

  var CONNECT_CAN = {
    attorney: ["See your name, side, plan and AI credits left", "Read your profile and where your verification stands", "List and read the playbooks in your library", "Save new playbook drafts and suggest changes (you accept changes here, on the DELA website)", "Have DELA's AI draft a playbook, using your AI credits or your own key", "Export a playbook as text, a web page or a checklist"],
    freelancer: ["See your name, side, plan and AI credits left", "Read your profile and what is missing to be match-ready"],
  };
  var CONNECT_CANNOT = "It cannot pay, hire, sign, send messages, delete anything or see your passwords or AI keys.";
  var CONNECT_ERR = { request_expired: "This connection request ran out or was already answered. Start again from ChatGPT or Claude.", connector_off: "DELA in ChatGPT and Claude is not open for your account yet.", not_in_plan: "Your plan does not include the ChatGPT and Claude connector.", on_hold: "Some actions are paused on your account. Contact the Lawfecta Team." };

  // The page ChatGPT or Claude sends a member to when they connect DELA (/dela?tab=connect&req=...)
  function connectView() {
    var box = h("div", { class: "card", style: "max-width:620px;margin:0 auto" }, h("p", { class: "muted", text: "Loading..." }));
    var req = "";
    try { req = new URLSearchParams(location.search).get("req") || ""; } catch (e) { req = ""; }
    if (!req) { D.clear(box); box.appendChild(h("h1", { text: "Connect DELA to ChatGPT or Claude" })); box.appendChild(h("p", { text: "Open ChatGPT or Claude and add DELA there. It brings you back to this page to approve. The steps are in AI settings." })); box.appendChild(h("button", { onclick: function () { tab = "ai"; draw(); } }, "Open AI settings")); return box; }
    api.get("/oauth/request?req=" + encodeURIComponent(req)).then(function (r) {
      D.clear(box);
      if (!r.ok) { box.appendChild(h("h1", { text: "Connect DELA" })); box.appendChild(h("p", { class: "notice bad", text: CONNECT_ERR[r.reason] || D.errorText(r.reason) })); return; }
      box.appendChild(h("h1", { text: r.client_name + " wants to connect to DELA" }));
      box.appendChild(h("p", { text: "It will use your " + D.SIDE[r.side] + " side" + ((me.sides || []).length > 1 ? ". To connect your other side instead, switch sides at the top of this page first." : ".") }));
      box.appendChild(h("p", { class: "small muted", text: "After you choose, you go back to " + r.redirect_host + "." }));
      box.appendChild(h("h2", { text: "What " + r.client_name + " can do" }));
      box.appendChild(h("ul", null, (CONNECT_CAN[r.side] || []).map(function (t) { return h("li", { text: t }); })));
      box.appendChild(h("p", { class: "small", text: CONNECT_CANNOT }));
      box.appendChild(h("p", { class: "notice", role: "note", text: "Confidential client information does not belong in DELA, and that includes what you type in ChatGPT or Claude for DELA. Use placeholders such as [Client Name]. You are responsible for what you enter." }));
      if (!r.on || !r.plan_ok) { box.appendChild(h("p", { class: "notice bad", text: CONNECT_ERR[!r.on ? "connector_off" : "not_in_plan"] })); }
      var msg = h("p", { role: "status", class: "small" });
      function decide(yes) {
        btns.forEach(function (b) { b.disabled = true; });
        msg.textContent = yes ? "Connecting..." : "Saying no...";
        api.post("/oauth/decide", { req: req, approve: yes }).then(function (x) {
          if (!x.ok) { msg.textContent = CONNECT_ERR[x.reason] || D.errorText(x.reason); return; }
          msg.textContent = yes ? "Connected. Taking you back to " + r.client_name + "..." : "Not connected. Taking you back...";
          location.href = x.redirect;
        }).catch(function (e) { btns.forEach(function (b) { b.disabled = false; }); msg.textContent = D.errorText(e.message); });
      }
      var btns = [h("button", { class: "blue", disabled: !r.on || !r.plan_ok, onclick: function () { decide(true); } }, "Approve"), h("button", { class: "ghost", onclick: function () { decide(false); } }, "Deny")];
      box.appendChild(h("div", { class: "row" }, btns));
      box.appendChild(msg);
    }).catch(function (e) { D.clear(box); box.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    return box;
  }

  // In AI settings: the address to paste into ChatGPT or Claude, the steps, and the apps connected now
  function connectionsCard() {
    var card = h("div", { class: "card" }, h("h2", { text: "Use DELA in ChatGPT and Claude" }), h("p", { class: "muted small", text: "Loading..." }));
    api.get("/connections").then(function (r) {
      D.clear(card);
      card.appendChild(h("h2", { text: "Use DELA in ChatGPT and Claude" }));
      if (!r.on && !r.connections.length) { card.appendChild(h("p", { text: "Opens soon. You will be able to read and draft your DELA playbooks from ChatGPT or Claude." })); return; }
      card.appendChild(h("p", { text: me.side === "attorney" ? "Read your playbooks, save drafts and suggest changes from ChatGPT or Claude. Changes wait for you here before they count." : "Connect ChatGPT or Claude to your DELA freelancer side. More freelancer tools come in a later update." }));
      var addr = h("input", { type: "text", readonly: true, value: r.url, "aria-label": "DELA connector address", style: "width:100%" });
      card.appendChild(h("label", { text: "DELA connector address" }));
      card.appendChild(h("div", { class: "row" }, addr, h("button", { class: "ghost small", onclick: function () {
        addr.select();
        var done = function () { D.toast(app, "Address copied"); };
        if (navigator.clipboard) navigator.clipboard.writeText(r.url).then(done, function () { document.execCommand("copy"); done(); }); else { document.execCommand("copy"); done(); }
      } }, "Copy")));
      card.appendChild(h("h3", { text: "In Claude" }));
      card.appendChild(h("ol", null, ["Open claude.ai, then Settings, then Connectors.", "Click Add custom connector. Name it Lawfecta DELA and paste the address above. Click Add.", "Click Connect next to Lawfecta DELA. This page opens: click Approve."].map(function (t) { return h("li", { text: t }); })));
      card.appendChild(h("h3", { text: "In ChatGPT" }));
      card.appendChild(h("ol", null, ["Open chatgpt.com, then Settings, then Apps and Connectors. If you do not see a Create button, turn on Developer mode under Advanced settings.", "Click Create. Name it Lawfecta DELA, paste the address above, choose OAuth for sign in, and click Create.", "ChatGPT opens this page: click Approve."].map(function (t) { return h("li", { text: t }); })));
      card.appendChild(h("p", { class: "small muted", text: "Menu names in ChatGPT and Claude change from time to time. Look for Connectors or Apps. Some ChatGPT and Claude plans do not allow custom connectors." }));
      card.appendChild(h("h3", { text: "Connected now" }));
      if (!r.connections.length) card.appendChild(h("p", { class: "muted small", text: "Nothing connected yet." }));
      else card.appendChild(h("ul", { class: "list" }, r.connections.map(function (c) {
        return h("li", { class: "row" }, h("span", { class: "grow" }, h("b", { text: c.client_name }), h("span", { class: "small muted", text: " " + D.SIDE[c.side] + " side, connected " + D.date(c.created_at) + ", last used " + D.date(c.last_used_at) })),
          h("button", { class: "danger small", onclick: function () {
            if (!confirm("Disconnect " + c.client_name + "? It stops working with DELA right away. You can connect it again later.")) return;
            api.post("/connections/disconnect", { id: c.id }).then(function (x) { if (x.ok === false) throw new Error(x.reason); D.toast(app, "Disconnected"); card.replaceWith(connectionsCard()); }).catch(err);
          } }, "Disconnect"));
      })));
    }).catch(function () { D.clear(card); });
    return card;
  }

  // ---------- Files ----------

  var fileState = { data: null, folder: "all", uploading: [] };
  var filesEl = null;
  var STATUS_WORDS = { ready: "Ready", checking: "Checking", held: "Needs your check", refused: "Not accepted", trash: "In the trash", uploading: "Uploading" };
  var REFUSE_WORDS = { wrong_type: "It is not really the type its name says.", active_content: "It has scripts, macros or hidden files inside.", damaged: "It could not be opened.", storage_full: "Your storage is full.", file_too_big: "It is over the size limit." };

  function filesView() {
    filesEl = h("div", null, h("p", { class: "muted", text: "Loading..." }));
    loadFiles();
    return filesEl;
  }
  function loadFiles() {
    api.get("/files").then(function (r) {
      if (r.ok === false) throw new Error(r.reason);
      fileState.data = r;
      drawFiles();
      // Files being checked finish in seconds; look again shortly
      if (r.files.some(function (f) { return f.status === "checking"; })) setTimeout(function () { if (tab === "files") loadFiles(); }, 4000);
    }).catch(function (e) { D.clear(filesEl); filesEl.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  function drawFiles() {
    var d = fileState.data;
    D.clear(filesEl);
    filesEl.appendChild(h("h1", { text: "Files" }));
    filesEl.appendChild(h("p", { class: "muted", text: "Keep your process documents, templates, forms and checklists here, and ask DELA about them. Files belong to your firm and only your firm can open them." }));
    var pct = d.limit_bytes ? Math.min(100, Math.round(d.used_bytes * 100 / d.limit_bytes)) : 0;
    filesEl.appendChild(h("div", { class: "card" },
      h("div", { class: "row" }, h("b", { class: "grow", text: "Storage: " + mbText(d.used_bytes) + " of " + mbText(d.limit_bytes) + " used" }), h("span", { class: "small muted", text: "Files in the trash count until it empties after " + d.trash_days + " days." })),
      h("div", { class: "bar" }, h("span", { style: "width:" + pct + "%" + (pct >= 90 ? ";background:var(--bad)" : "") }))));
    filesEl.appendChild(uploadCard(d));
    var folders = [["all", "All files"]].concat(d.folders.map(function (f) { return [f.id, f.name]; })).concat([["trash", "Trash"]]);
    filesEl.appendChild(h("div", { class: "pills" }, folders.map(function (f) {
      return h("button", { "aria-pressed": String(fileState.folder === f[0]), onclick: function () { fileState.folder = f[0]; drawFiles(); } }, f[1]);
    }), h("button", { onclick: newFolder }, "+ New folder"),
      fileState.folder !== "all" && fileState.folder !== "trash" ? h("button", { onclick: function () { folderMenu(fileState.folder); } }, "Rename or delete this folder") : null));
    var rows = d.files.filter(function (f) {
      if (fileState.folder === "trash") return f.status === "trash";
      if (f.status === "trash") return false;
      return fileState.folder === "all" || f.folder_id === fileState.folder;
    });
    if (!rows.length) { filesEl.appendChild(h("div", { class: "card" }, h("p", { class: "muted", style: "margin:0", text: fileState.folder === "trash" ? "The trash is empty." : "No files here yet." }))); return; }
    filesEl.appendChild(h("div", { class: "card scroll" }, h("table", null,
      h("thead", null, h("tr", null, ["Name", "Status", "Size", "Added", ""].map(function (x) { return h("th", { text: x }); }))),
      h("tbody", null, rows.map(fileRow)))));
  }

  function fileRow(f) {
    var badge = h("span", { class: "badge " + (f.status === "ready" ? "ready" : f.status === "held" ? "held" : f.status === "refused" ? "bad" : ""), text: STATUS_WORDS[f.status] || f.status });
    var info = [];
    if (f.status === "held") info.push(h("div", { class: "small", style: "margin-top:4px", text: "It may contain " + kindsText(f.check_reasons) + ". The AI will not use it until you check it." }));
    if (f.status === "refused") info.push(h("div", { class: "small", style: "margin-top:4px", text: (REFUSE_WORDS[f.refuse_reason] || "It could not be accepted.") + " DELA did not keep it." }));
    if (f.status === "ready" && !f.has_text && f.ext !== "png" && f.ext !== "jpg") info.push(h("div", { class: "small muted", style: "margin-top:4px", text: "No readable text was found, so the AI cannot read it." }));
    function act(label, fn, cls) { return h("button", { class: (cls || "ghost") + " small", onclick: fn }, label); }
    var acts = [];
    if (f.status === "ready" || f.status === "held") acts.push(act("Open", function () { openFile(f, false); }));
    if (f.status === "ready" && f.ext !== "png" && f.ext !== "jpg") acts.push(act("Download", function () { openFile(f, true); }));
    if (f.status === "ready" && (me.switches || {}).ai_generation) acts.push(act("Ask DELA", function () { chat.attach = [{ id: f.id, name: f.name }]; chat.picking = false; tab = "delegate"; draw(); }, "blue"));
    if (f.status === "held") {
      acts.push(act("It has no client information", function () {
        if (!confirm("Confirm that \"" + f.name + "\" has no confidential client information. You are responsible for what you upload.")) return;
        fileAction({ action: "confirm", file_id: f.id }, "Thanks. The file is ready.");
      }, "blue"));
    }
    if (f.status === "ready" || f.status === "held") {
      acts.push(act("New version", function () { pickAndUpload(f); }));
      acts.push(act("Rename", function () { var n = prompt("New name", f.name); if (n) fileAction({ action: "rename", file_id: f.id, name: n }, "Renamed"); }));
      if (fileState.data.folders.length) acts.push(act("Move", function () { moveFile(f); }));
      if (f.versions > 1) acts.push(act("Versions (" + f.versions + ")", function () { showVersions(f); }));
      acts.push(act("Delete", function () { if (confirm("Move \"" + f.name + "\" to the trash? You can restore it for " + fileState.data.trash_days + " days.")) fileAction({ action: "trash", file_id: f.id }, "Moved to the trash"); }, "danger"));
    }
    if (f.status === "refused") acts.push(act("Clear", function () { fileAction({ action: "trash", file_id: f.id }, "Cleared"); }));
    if (f.status === "trash") acts.push(act("Restore", function () { fileAction({ action: "restore", file_id: f.id }, "Restored"); }));
    return h("tr", null,
      h("td", null, h("b", { text: f.name }), f.version > 1 ? h("span", { class: "small muted", text: " (version " + f.version + ")" }) : null, info),
      h("td", null, badge), h("td", { text: mbText(f.size_bytes) }), h("td", { class: "small", text: D.date(f.created_at) + " by " + f.uploaded_by }),
      h("td", null, h("div", { class: "row" }, acts)));
  }

  function fileAction(body, done) {
    api.post("/files/action", body).then(function (r) { if (r.ok === false) throw new Error(r.reason); D.toast(app, done); loadFiles(); }).catch(err);
  }

  function openFile(f, download) {
    // Open the window first so pop-up blockers allow it, then send it to the short-lived link
    var w = download ? null : window.open("", "_blank");
    api.post("/files/open", { file_id: f.id, download: download }).then(function (r) {
      if (r.ok === false) throw new Error(r.reason);
      if (w) { w.opener = null; w.location.href = r.url; } else location.href = r.url;
    }).catch(function (e) { if (w) w.close(); err(e); });
  }

  function newFolder() {
    var n = prompt("Folder name");
    if (!n) return;
    api.post("/files/action", { action: "folder_new", name: n }).then(function (r) { if (r.ok === false) throw new Error(r.reason); fileState.folder = r.folder_id; loadFiles(); }).catch(err);
  }
  function folderMenu(id) {
    var n = prompt("Rename the folder, or leave it empty and press OK to delete it (only an empty folder can be deleted)", (fileState.data.folders.filter(function (f) { return f.id === id; })[0] || {}).name);
    if (n === null) return;
    if (n.trim()) fileAction({ action: "folder_rename", folder_id: id, name: n }, "Folder renamed");
    else api.post("/files/action", { action: "folder_delete", folder_id: id }).then(function (r) { if (r.ok === false) throw new Error(r.reason); fileState.folder = "all"; D.toast(app, "Folder deleted"); loadFiles(); }).catch(err);
  }
  function moveFile(f) {
    var names = ["0. No folder"].concat(fileState.data.folders.map(function (x, i) { return (i + 1) + ". " + x.name; }));
    var pick = prompt("Move to which folder? Type its number.\n" + names.join("\n"), "0");
    if (pick === null) return;
    var i = parseInt(pick, 10);
    if (isNaN(i) || i < 0 || i > fileState.data.folders.length) { D.toast(app, "Type one of the numbers shown.", true); return; }
    fileAction({ action: "move", file_id: f.id, folder_id: i === 0 ? "" : fileState.data.folders[i - 1].id }, "Moved");
  }
  function showVersions(f) {
    api.get("/files/versions?id=" + f.id).then(function (r) {
      closeDrawer();
      drawer = h("div", { class: "drawer", role: "dialog", "aria-label": "Versions" },
        h("div", { class: "row", style: "padding-right:84px" }, h("h2", { class: "grow", text: "Versions of " + f.name })),
        h("ul", { class: "list" }, r.items.map(function (v) {
          return h("li", null, h("b", { text: "Version " + v.version + (v.is_current ? " (current)" : "") }), h("div", { class: "small muted", text: D.dateTime(v.created_at) + ", " + mbText(v.size_bytes) }),
            h("button", { class: "ghost small", onclick: function () { openFile({ id: v.id }, true); } }, "Download"));
        })));
      showDrawer(drawer);
    }).catch(err);
  }

  function uploadCard(d) {
    var tick = h("input", { type: "checkbox", id: "dela-no-client" });
    var input = h("input", { type: "file", multiple: true, accept: d.allowed.map(function (x) { return "." + x; }).join(",") + ",.jpeg" });
    var go = h("button", { class: "blue" }, "Upload");
    go.addEventListener("click", function () {
      if (!input.files.length) { D.toast(app, "Choose a file first.", true); return; }
      if (!tick.checked) { D.toast(app, D.errorText("tick_needed"), true); return; }
      uploadAll([].slice.call(input.files), null);
    });
    var list = h("div", null, fileState.uploading.map(function (u) { return h("p", { class: "small", text: u.name + ": " + u.text }); }));
    return h("div", { class: "card" }, h("h2", { text: "Add files" }), notice(),
      h("label", { style: "display:flex;gap:8px;align-items:flex-start;font-weight:600" }, tick, h("span", { text: "These files have no confidential client information (no client names, case numbers, dates of birth or similar)." })),
      h("p", { class: "small muted", text: "PDF, Word (.docx), text, Markdown, PNG or JPG, up to " + d.max_mb_per_file + " MB each. DELA checks each file. A file that looks like it has client information is held until you check it." }),
      h("div", { class: "row" }, input, go), list);
  }

  function pickAndUpload(f) {
    var input = h("input", { type: "file", accept: "." + f.ext });
    input.addEventListener("change", function () {
      if (!input.files.length) return;
      if (!confirm("Upload a new version of \"" + f.name + "\"? Confirm it has no confidential client information.")) return;
      uploadAll([input.files[0]], f.id);
    });
    input.click();
  }

  function uploadAll(list, replaceOf) {
    var folder = fileState.folder !== "all" && fileState.folder !== "trash" ? fileState.folder : "";
    fileState.uploading = list.map(function (x) { return { name: x.name, text: "waiting" }; });
    drawFiles();
    var i = 0;
    function next() {
      if (i >= list.length) { setTimeout(function () { fileState.uploading = []; loadFiles(); }, 800); return; }
      var file = list[i], row = fileState.uploading[i];
      i++;
      function say(t) { row.text = t; drawFiles(); }
      say("starting");
      api.post("/files/start", { name: file.name, size_bytes: file.size, folder_id: folder, replace_of: replaceOf || "", ticked: true, request_id: newId() }).then(function (r) {
        if (!r.ok) throw new Error(r.reason);
        if (r.duplicate) return { ok: true, status: r.status };
        say("uploading");
        return fetch(r.upload_url, { method: "PUT", headers: { "content-type": r.content_type, "x-upsert": "false" }, body: file }).then(function (up) {
          if (!up.ok) throw new Error("upload_failed");
          say("checking");
          return api.post("/files/complete", { file_id: r.file_id });
        });
      }).then(function (c) {
        if (c.ok === false) throw new Error(c.reason);
        say(c.status === "ready" ? "ready" : c.status === "held" ? "held: please check it below" : c.status === "refused" ? "not accepted" : "checking");
        next();
      }).catch(function (e) {
        say(e.message === "upload_failed" ? "the upload did not finish. Check your connection and try again." : D.errorText(e.message));
        next();
      });
    }
    next();
  }


  // ---------- Step 2: the playbook library ----------

  var lib = { data: null, org: null, filter: "all", q: "", pb: null, view: "read", importId: null, building: false };
  var libEl = null;
  var PB_STATUS = { draft: "Draft", in_review: "In review", approved: "Approved", archived: "Archived", trash: "In the trash" };
  var ROLE_WORDS = { administrator: "Administrator", editor: "Editor", commenter: "Commenter", viewer: "Viewer" };
  var RANK = { administrator: 4, editor: 3, commenter: 2, viewer: 1 };
  var PB_PARTS = [
    ["outcome", "Title and outcome", "text"], ["area", "Practice area and jurisdiction", "area"], ["when_to_use", "When to use it", "text"], ["roles", "Roles", "text"],
    ["needs", "What you need first", "list"], ["steps", "Steps", "steps"], ["deadlines", "Deadlines and timing", "text"], ["checks", "Quality checks", "list"],
    ["review_points", "Attorney review and ethics points", "list"], ["never_delegate", "Never delegate", "list"], ["resources", "Templates and resources", "list"],
    ["tools", "Tools", "list"], ["deliverables", "Deliverables", "text"],
  ];
  var TAG_WORDS = { keep: "Keep (attorney)", delegate: "Delegate", automate: "Automate" };
  var ACTION_WORDS = { created: "Created", created_ai: "First draft by DELA", created_file: "Drafted by DELA from a file", created_scribe: "Built from a Scribe guide", edited: "Edited",
    ai_filled: "DELA filled in answers", sent_for_review: "Sent for review", approved: "Approved", suggestion_made: "Suggested a change", suggestion_accepted: "Accepted a suggestion",
    suggestion_rejected: "Rejected a suggestion", comment_added: "Commented", restored: "Restored an earlier version", exported: "Exported", archived: "Archived", unarchived: "Brought back from the archive",
    deleted: "Moved to the trash", restored_from_trash: "Restored from the trash", file_attached: "Attached a file", file_removed: "Removed a file" };
  function can(n) { return lib.pb ? (RANK[lib.pb.role] || 0) >= n : (lib.data && lib.data.list ? (RANK[lib.data.list.role] || 0) >= n : false); }
  function failText(r) {
    if (r.reason === "playbook_limit") return "Your library is full: " + r.count + " of " + r.limit + " playbooks. Archived playbooks count too. Delete one you no longer need, or upgrade your plan for more.";
    if (r.reason === "changed") return "Someone saved a newer version while you were working. Your changes were not saved. Reload the playbook, then make your change again.";
    if (r.reason === "not_complete") return "This playbook is not complete yet. Still missing: " + (r.missing || []).join(", ") + ".";
    if (r.reason === "administrator_only") return "Only the library's administrator can do that.";
    if (r.reason === "not_allowed") return "Your role in this library does not allow that.";
    if (r.reason === "no_seat") return "Every seat on this plan is in use (" + r.seats + "). Editors need a seat. Add them as a commenter or viewer, or add seats on the Business plan.";
    if (r.reason === "no_guest_place") return "This library already has " + r.guests + " commenters and viewers, the most allowed.";
    if (r.reason === "screenshot_held") return "A screenshot is waiting for your client information check. Confirm it has no client information, or untick it, then build again.";
    if (r.reason === "library_off") return "The playbook library is not open for your account yet.";
    if (r.reason === "import_off") return "Import from Scribe is not open for your account yet.";
    if (r.reason === "image_host_not_allowed") return "DELA only fetches screenshots from Scribe's own image addresses. This one was skipped: " + (r.host || "") + ".";
    if (r.reason === "ai_failed" && r.source && r.source !== "lawfecta") return "Your own AI key did not work: " + (KEY_PROBLEM[r.code] || "the provider refused it.") + " Nothing ran on Lawfecta's AI. Open AI settings to fix it.";
    if (r.reason === "ai_failed") return "DELA's AI could not finish: " + (KEY_PROBLEM[r.code] || "something went wrong.") + " No credits were used. Please try again.";
    return D.errorText(r.reason || "server_error");
  }
  function pbFail(e) { D.toast(app, e && e.reason ? failText(e) : D.errorText(e && e.message ? e.message : String(e)), true); }
  function okOr(r) { if (r && r.ok === false) throw r; return r; }

  function libraryView() {
    libEl = h("div", null, h("p", { class: "muted", text: "Loading..." }));
    if (lib.importId) openImport(lib.importId);
    else if (lib.pb && lib.pb.playbook) openPlaybook(lib.pb.playbook.id, lib.view);
    else loadLibrary();
    return libEl;
  }

  function loadLibrary() {
    lib.pb = null;
    lib.importId = null;
    api.get("/library" + (lib.org ? "?org=" + lib.org : "")).then(function (r) { lib.data = r; lib.org = r.org_id; drawLibrary(); })
      .catch(function (e) { D.clear(libEl); libEl.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  function drawLibrary() {
    D.clear(libEl);
    var d = lib.data, L = d.list;
    if (!L) { libEl.appendChild(h("p", { class: "muted", text: "No library yet." })); return; }
    var head = h("div", { class: "row", style: "margin:18px 0 4px" }, h("h1", { class: "grow", style: "margin:0", text: "Playbook library" }));
    if (d.libraries.length > 1) {
      var pick = h("select", { "aria-label": "Library", onchange: function () { lib.org = pick.value; loadLibrary(); } }, d.libraries.map(function (l) {
        return h("option", { value: l.org_id, selected: l.org_id === lib.org, text: (l.mine ? "My library" : l.name) + " (" + ROLE_WORDS[l.role] + ")" });
      }));
      head.appendChild(pick);
    }
    libEl.appendChild(head);
    libEl.appendChild(h("p", { class: "muted", text: "Each playbook is one repeatable process, written so a trained person who has never done it can do it right, with the points where an attorney must review." }));
    if (!L.on) { libEl.appendChild(h("div", { class: "notice", text: D.errorText("library_off") })); return; }
    var pct = L.limit ? Math.min(100, Math.round(L.count * 100 / L.limit)) : 0;
    libEl.appendChild(h("div", { class: "card" },
      h("div", { class: "row" }, h("b", { class: "grow", text: L.limit === null ? L.count + " playbooks (no cap on your plan)" : L.count + " of " + L.limit + " playbooks" }), h("span", { class: "badge", text: "Your role: " + ROLE_WORDS[L.role] })),
      L.limit !== null ? h("div", { class: "bar" }, h("span", { style: "width:" + pct + "%" + (pct >= 100 ? ";background:var(--bad)" : "") })) : null,
      h("div", { class: "row", style: "margin-top:10px" },
        can(3) ? h("button", { class: "blue", onclick: newPlaybook }, "New playbook") : null,
        can(3) && L.scribe_on ? h("button", { class: "ghost", onclick: startScribe }, "Import from Scribe") : null,
        can(3) ? h("button", { class: "ghost", onclick: suggestMissing }, "What am I missing?") : null,
        L.role === "administrator" ? h("button", { class: "ghost", onclick: openTeam }, "Team") : null)));
    if (L.imports.length) {
      libEl.appendChild(h("div", { class: "card" }, h("h2", { text: "Imports waiting for review" }), h("ul", { class: "list" }, L.imports.map(function (i) {
        return h("li", { class: "row" }, h("span", { class: "grow" }, h("b", { text: i.title || "Imported guide" }), h("span", { class: "small muted", text: " " + i.steps + " steps, " + D.date(i.created_at) })),
          h("button", { class: "small blue", onclick: function () { openImport(i.id); } }, "Review"));
      }))));
    }
    if (can(3)) libEl.appendChild(recordingsCard());
    var q = h("input", { type: "search", placeholder: "Search", "aria-label": "Search playbooks", value: lib.q });
    q.addEventListener("input", function () { lib.q = q.value; drawList(); });
    var filters = [["all", "All"], ["draft", "Drafts"], ["in_review", "In review"], ["approved", "Approved"], ["due", "Due for review"], ["archived", "Archived"]];
    if (L.role === "administrator") filters.push(["trash", "Trash"]);
    libEl.appendChild(h("div", { class: "row" }, q, h("div", { class: "pills" }, filters.map(function (f) {
      return h("button", { "aria-pressed": String(lib.filter === f[0]), onclick: function () { lib.filter = f[0]; drawLibrary(); } }, f[1]);
    }))));
    var listEl = h("div");
    libEl.appendChild(listEl);
    function drawList() {
      D.clear(listEl);
      var today = D.today();
      var rows = L.playbooks.filter(function (p) {
        if (lib.filter === "trash") return p.status === "trash";
        if (p.status === "trash") return false;
        if (lib.filter === "due") return p.status === "approved" && p.next_review_at && p.next_review_at <= today;
        if (lib.filter !== "all" && p.status !== lib.filter) return false;
        if (lib.filter === "all" && p.status === "archived") return false;
        return !lib.q || (p.title + " " + p.practice_area).toLowerCase().indexOf(lib.q.toLowerCase()) >= 0;
      });
      if (!rows.length) { listEl.appendChild(h("div", { class: "card" }, h("p", { class: "muted", style: "margin:0", text: L.playbooks.length ? "Nothing here." : "No playbooks yet. Click New playbook and describe a task, or import a guide you made in Scribe." }))); return; }
      rows.forEach(function (p) {
        listEl.appendChild(h("div", { class: "work", style: "cursor:pointer", role: "button", tabindex: "0", onclick: function () { openPlaybook(p.id, "read"); } },
          h("span", { class: "chip", text: String(p.completeness) + "%" }),
          h("div", { class: "grow" }, h("h3", { style: "margin:0", text: p.title }),
            h("div", { class: "small muted", text: [p.practice_area, "version " + p.version, "updated " + D.date(p.updated_at), p.open_suggestions ? p.open_suggestions + " suggestion" + (p.open_suggestions > 1 ? "s" : "") + " waiting" : ""].filter(Boolean).join(" | ") })),
          h("span", { class: "badge " + (p.status === "approved" ? "ready" : p.status === "in_review" ? "held" : ""), text: PB_STATUS[p.status] })));
      });
    }
    drawList();
    if (lib.startRecord) { lib.startRecord = false; recordView(); }
  }

  // New playbook: describe the task (type or talk), optionally attach files, and DELA drafts it
  function newPlaybook() {
    var box = h("div", { class: "card" });
    var ta = h("textarea", { "aria-label": "Describe the task", style: "width:100%;min-height:120px", placeholder: "Describe the task the way you would explain it to a new paralegal: what starts it, the steps, who does each part, what done looks like." });
    var title = h("input", { "aria-label": "Title", placeholder: "Title (optional)", style: "width:100%" });
    var status = h("span", { class: "small muted", role: "status" });
    var files = [];
    var pickWrap = h("div");
    var ai = chat.ai || {};
    var micOk = ai.voice_on && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder;
    var auto = h("input", { type: "checkbox" });
    var mic = micOk ? h("button", { class: "mic small", type: "button", onclick: function () { toggleMic(mic, ta, status, auto); } }, "● Talk") : null;
    var go = h("button", { class: "blue" }, "Draft it with DELA");
    var blank = h("button", { class: "ghost" }, "Start blank");
    var problem = h("div");
    var req = newId(), attempt = 0;
    function send(extra) {
      extra = extra || {};
      D.clear(problem);
      go.disabled = true;
      status.textContent = "DELA is drafting your playbook...";
      api.post("/playbooks/create", { org_id: lib.org, request_id: req, title: title.value, description: ta.value, file_ids: files, attempt: attempt,
        lawfecta_once: extra.lawfecta_once === true, confirm_no_client_info: extra.confirm === true }).then(function (r) {
        go.disabled = false;
        status.textContent = "";
        if (!r.ok) {
          if (r.reason === "looks_like_client_info") {
            problem.appendChild(h("div", { class: "problem" }, h("p", { text: "This may include " + kindsText(r.kinds) + ". Use placeholders such as [Client Name] instead." }),
              h("button", { class: "ghost small", onclick: function () { send({ confirm: true }); } }, "Send anyway, it has no client information")));
          } else {
            problem.appendChild(h("div", { class: "problem" }, h("p", { text: failText(r) }),
              r.reason === "ai_failed" ? h("div", { class: "row" }, h("button", { class: "ghost small", onclick: function () { attempt++; send(); } }, "Try again"),
                r.source !== "lawfecta" && ai.backup_credits !== false ? h("button", { class: "blue small", onclick: function () { attempt++; send({ lawfecta_once: true }); } }, "Use Lawfecta credits this time") : null) : null));
          }
          return;
        }
        lib.questions = r.questions || [];
        openPlaybook(r.id, "read");
      }).catch(function (e) { go.disabled = false; status.textContent = ""; pbFail(e); });
    }
    go.addEventListener("click", function () { if (!ta.value.trim() && !files.length) { D.toast(app, "Describe the task or choose a file first, or click Start blank.", true); return; } send(); });
    blank.addEventListener("click", function () {
      api.post("/playbooks/create", { org_id: lib.org, request_id: req, title: title.value || "Untitled playbook" }).then(okOr).then(function (r) { openPlaybook(r.id, "edit"); }).catch(pbFail);
    });
    var fileBtn = (me.switches || {}).file_uploads ? h("button", { class: "ghost small", type: "button", onclick: function () {
      api.get("/files").then(function (r) {
        D.clear(pickWrap);
        var ready = (r.files || []).filter(function (f) { return f.status === "ready" && f.has_text; });
        if (!ready.length) { pickWrap.appendChild(h("p", { class: "small muted", text: "No readable files yet. Click \"Upload a new file\" to add one here." })); return; }
        pickWrap.appendChild(h("div", { class: "pick" }, ready.map(function (f) {
          var cb = h("input", { type: "checkbox" });
          cb.addEventListener("change", function () { files = files.filter(function (x) { return x !== f.id; }); if (cb.checked) files.push(f.id); });
          return h("label", null, cb, f.name);
        })));
      }).catch(err);
    } }, "Use a file I uploaded") : null;
    // Upload a process document right here, without going to the Files tab first (Stacey 2026-11-05)
    var upWrap = h("div");
    var upBtn = (me.switches || {}).file_uploads ? h("button", { class: "ghost small", type: "button", onclick: function () {
      D.clear(upWrap);
      var tick = h("input", { type: "checkbox", "aria-label": "This file has no confidential client information" });
      var input = h("input", { type: "file", accept: ".pdf,.docx,.txt,.md", "aria-label": "Choose a file" });
      var say = h("p", { class: "small", role: "status" });
      var go2 = h("button", { class: "blue small", type: "button", onclick: function () {
        if (!input.files.length) { say.textContent = "Choose a file first."; return; }
        if (!tick.checked) { say.className = "small bad"; say.textContent = "Tick the box to confirm the file has no confidential client information."; return; }
        var f = input.files[0];
        go2.disabled = true; say.className = "small"; say.textContent = "Uploading " + f.name + "...";
        uploadBlob(f, f.name, "").then(function (r) {
          go2.disabled = false;
          if (!r.ok) { say.className = "small bad"; say.textContent = r.reason === "upload_failed" ? "The upload did not finish. Check your connection and try again." : D.errorText(r.reason); return; }
          if (r.status === "ready") {
            if (files.indexOf(r.file_id) < 0) files.push(r.file_id);
            D.clear(upWrap);
            upWrap.appendChild(h("p", { class: "small ok", text: "✓ " + f.name + " is ready. DELA will draft from it." }));
          } else if (r.status === "held") { say.className = "small bad"; say.textContent = "DELA is holding this file because it may include client information. Check it on the Files tab."; }
          else if (r.status === "refused") { say.className = "small bad"; say.textContent = "This file was not accepted. Use a Word file, PDF or text file."; }
          else { say.textContent = "DELA is still checking the file. Try again in a moment."; }
        }).catch(function (e) { go2.disabled = false; say.className = "small bad"; say.textContent = D.errorText(e.message); });
      } }, "Upload");
      upWrap.appendChild(h("div", { class: "pick" }, input,
        h("label", { style: "display:flex;gap:8px;align-items:flex-start" }, tick, h("span", { text: "This file has no confidential client information (no client names, case numbers, dates of birth or similar)." })),
        h("div", { class: "row" }, go2), say));
    } }, "Upload a new file") : null;
    box.appendChild(h("h2", { text: "New playbook" }));
    box.appendChild(notice());
    box.appendChild(title);
    box.appendChild(ta);
    box.appendChild(h("div", { class: "row", style: "margin-top:8px" }, mic, fileBtn, upBtn, h("span", { class: "grow" }), status));
    box.appendChild(pickWrap);
    box.appendChild(upWrap);
    box.appendChild(problem);
    box.appendChild(h("div", { class: "row", style: "margin-top:8px" }, go, blank, h("button", { class: "ghost", onclick: drawLibrary }, "Cancel")));
    D.clear(libEl);
    libEl.appendChild(box);
    ta.focus();
  }

  function suggestMissing() {
    var out = h("div", { class: "card" }, h("p", { class: "muted", text: "DELA is looking at your library..." }));
    libEl.insertBefore(out, libEl.children[3] || null);
    api.post("/playbooks/missing", { org_id: lib.org, request_id: newId() }).then(function (r) {
      D.clear(out);
      if (!r.ok) { out.appendChild(h("p", { class: "problem", text: failText(r) })); return; }
      out.appendChild(h("h2", { text: "Playbooks firms like yours often have" }));
      out.appendChild(h("ul", { class: "list" }, r.suggestions.map(function (sg) {
        return h("li", null, h("b", { text: sg.title }), h("div", { class: "small muted", text: sg.why }));
      })));
      out.appendChild(h("button", { class: "ghost small", onclick: function () { out.remove(); } }, "Close"));
    }).catch(pbFail);
  }

  function openTeam() {
    api.get("/playbooks/team?org=" + lib.org).then(function (t) {
      closeDrawer();
      var bd = h("input", { "aria-label": "BD member ID", inputmode: "numeric", placeholder: "BD member ID" });
      var role = h("select", { "aria-label": "Role" }, ["editor", "commenter", "viewer", "administrator"].map(function (r) { return h("option", { value: r, text: ROLE_WORDS[r] }); }));
      drawer = h("div", { class: "drawer", role: "dialog", "aria-label": "Library team" },
        h("div", { class: "row", style: "padding-right:84px" }, h("h2", { class: "grow", text: "Library team" })),
        h("p", { class: "small muted", text: "Editors and administrators use a seat (" + t.seats + " on your plan, including you). Commenters and viewers do not, up to " + t.guests + "." }),
        h("ul", { class: "list" }, h("li", null, h("b", { text: t.owner.name }), " Administrator (owner)"), t.members.map(function (m) {
          return h("li", { class: "row" }, h("span", { class: "grow" }, h("b", { text: m.name }), " " + ROLE_WORDS[m.role]),
            h("button", { class: "danger small", onclick: function () { teamSet(m.bd_member_id, "remove"); } }, "Remove"));
        })),
        h("h3", { style: "margin-top:14px", text: "Add someone" }),
        h("p", { class: "small muted", text: "They need a Lawfecta account and must have opened DELA once. Find their BD member ID in their Lawfecta profile." }),
        h("div", { class: "row" }, bd, role, h("button", { class: "blue small", onclick: function () { teamSet(bd.value, role.value); } }, "Add")));
      showDrawer(drawer);
    }).catch(pbFail);
    function teamSet(id, r) {
      api.post("/playbooks/team", { org_id: lib.org, bd_member_id: id, role: r }).then(okOr).then(function () { D.toast(app, r === "remove" ? "Removed. They lost access straight away." : "Added"); openTeam(); }).catch(pbFail);
    }
  }

  // ---------- One playbook ----------

  function openPlaybook(id, view) {
    lib.importId = null;
    api.get("/playbooks/get?id=" + id).then(function (r) {
      if (!r.ok) throw r;
      lib.pb = r;
      lib.view = view || lib.view || "read";
      drawPlaybook();
    }).catch(function (e) { pbFail(e); loadLibrary(); });
  }

  function body() { return lib.pb.body || {}; }

  function drawPlaybook() {
    var P = lib.pb.playbook, b = body();
    D.clear(libEl);
    libEl.appendChild(h("div", { class: "row", style: "margin-top:14px" }, h("button", { class: "ghost small", onclick: loadLibrary }, "← Library")));
    libEl.appendChild(h("div", { class: "row", style: "margin:8px 0 4px" }, h("h1", { class: "grow", style: "margin:0", text: P.title }),
      h("span", { class: "badge " + (P.status === "approved" ? "ready" : P.status === "in_review" ? "held" : ""), text: PB_STATUS[P.status] })));
    libEl.appendChild(h("p", { class: "small muted", text: "Version " + P.version + (P.approved_version ? " | last approved: version " + P.approved_version : "") + " | administrator: " + P.administrator +
      (P.next_review_at ? " | next review " + D.date(P.next_review_at) : "") + " | your role: " + ROLE_WORDS[lib.pb.role] }));
    var pctBar = h("div", { class: "card" },
      h("div", { class: "row" }, h("b", { class: "grow", text: "Complete: " + P.completeness + "%" }),
        can(3) && P.status === "draft" ? h("button", { class: "ghost small", onclick: function () { status("submit", "Sent to the administrator for review"); } }, "Send for review") : null,
        P.status === "approved" && me.side === "attorney" && (me.switches || {}).flex_gigs && can(4) ? h("button", { class: "blue small", onclick: function () { gigs.id = null; gigs.newFrom = P.id; tab = "projects"; draw(); } }, "Post as a Flex Gig") : null,
        can(4) && (P.status === "draft" || P.status === "in_review") ? h("button", { class: "blue small", disabled: P.completeness < 100, title: P.completeness < 100 ? "Fill in every required part first" : "", onclick: function () { status("approve", "Approved"); } }, "Approve") : null),
      h("div", { class: "bar" }, h("span", { style: "width:" + P.completeness + "%" + (P.completeness === 100 ? ";background:var(--ok)" : "") })),
      P.missing.length ? h("p", { class: "small", style: "margin:6px 0 0", text: "Still missing: " + P.missing.join(", ") + "." }) : h("p", { class: "small", style: "margin:6px 0 0", text: "Every required part is filled." + ((lib.questions || []).length ? " DELA still has " + lib.questions.length + (lib.questions.length === 1 ? " question" : " questions") + " for you below: check its guesses before you approve." : "") }));
    libEl.appendChild(pctBar);
    if (lib.questions && lib.questions.length && can(3)) libEl.appendChild(questionsCard());
    var views = [["read", "Read"], ["edit", "Edit"], ["chat", "Chat"], ["suggestions", "Suggestions (" + lib.pb.suggestions.length + ")"], ["comments", "Comments (" + lib.pb.comments.filter(function (c) { return !c.resolved; }).length + ")"],
      ["activity", "Activity"], ["versions", "Versions"], ["files", "Files (" + lib.pb.files.length + ")"], ["export", "Export"]];
    if (!can(3)) views = views.filter(function (v) { return ["edit", "files", "export"].indexOf(v[0]) < 0 || v[0] === "files"; });
    libEl.appendChild(h("div", { class: "tabs", role: "tablist", style: "border-radius:14px;margin:10px 0" }, views.map(function (v) {
      return h("button", { role: "tab", "aria-selected": String(lib.view === v[0]), onclick: function () { lib.view = v[0]; drawPlaybook(); } }, v[1]);
    })));
    var area = h("div");
    libEl.appendChild(area);
    ({ read: readView, edit: editView, chat: pbChatView, suggestions: suggestionsView, comments: commentsView, activity: activityView, versions: versionsView, files: pbFilesView, export: exportView })[lib.view](area, b);
    if (can(4)) {
      libEl.appendChild(h("div", { class: "row", style: "margin-top:18px" },
        P.status === "archived" ? h("button", { class: "ghost small", onclick: function () { status("unarchive", "Back in the library"); } }, "Bring back from the archive")
          : P.status !== "trash" ? h("button", { class: "ghost small", onclick: function () { status("archive", "Archived"); } }, "Archive") : null,
        P.status === "trash" ? h("button", { class: "ghost small", onclick: function () { status("restore", "Restored"); } }, "Restore from the trash")
          : h("button", { class: "danger small", onclick: function () { if (confirm("Move this playbook to the trash? You can restore it for 30 days.")) status("trash", "Moved to the trash"); } }, "Delete")));
    }
  }

  function status(action, done) {
    api.post("/playbooks/status", { id: lib.pb.playbook.id, action: action }).then(okOr).then(function () { D.toast(app, done); openPlaybook(lib.pb.playbook.id); }).catch(pbFail);
  }

  function questionsCard() {
    var ta = h("textarea", { "aria-label": "Your answers", style: "width:100%;min-height:90px", placeholder: "Answer any of the questions here, in your own words" });
    var status = h("span", { class: "small muted", role: "status" });
    var auto = h("input", { type: "checkbox" });
    var ai = chat.ai || {};
    var mic = ai.voice_on && navigator.mediaDevices && window.MediaRecorder ? h("button", { class: "mic small", type: "button", onclick: function () { toggleMic(mic, ta, status, auto); } }, "● Talk") : null;
    var btn = h("button", { class: "blue small" }, "Fill these in");
    var attempt = 0;
    function send(extra) {
      btn.disabled = true;
      status.textContent = "DELA is updating the playbook...";
      api.post("/playbooks/fill", { id: lib.pb.playbook.id, answers: ta.value, attempt: attempt, lawfecta_once: !!(extra && extra.once), confirm_no_client_info: !!(extra && extra.confirm) }).then(function (r) {
        btn.disabled = false;
        status.textContent = "";
        if (!r.ok) {
          if (r.reason === "looks_like_client_info" && confirm("This may include " + kindsText(r.kinds) + ". Send anyway? Only if it has no client information.")) { send({ confirm: true }); return; }
          D.toast(app, failText(r), true);
          return;
        }
        lib.questions = r.questions;
        openPlaybook(lib.pb.playbook.id);
      }).catch(function (e) { btn.disabled = false; status.textContent = ""; pbFail(e); });
    }
    btn.addEventListener("click", function () { if (ta.value.trim()) send(); });
    return h("div", { class: "card", style: "border-color:var(--blue)" }, h("h2", { text: "DELA's questions" }),
      h("ol", null, lib.questions.map(function (q) { return h("li", { text: q }); })), notice(), ta,
      h("div", { class: "row", style: "margin-top:8px" }, mic, btn, h("button", { class: "ghost small", onclick: function () { lib.questions = []; drawPlaybook(); } }, "Not now"), status));
  }

  function partValue(b, key) {
    if (key === "outcome") return [b.title, b.outcome].filter(Boolean).join("\n");
    if (key === "area") return [b.practice_area, b.jurisdiction].filter(Boolean).join(", ");
    return b[key];
  }

  function readView(area, b) {
    PB_PARTS.forEach(function (p) {
      var v = partValue(b, p[0]);
      if (p[0] === "deadlines" && !b.has_deadlines && !b.deadlines) return;
      if ((p[0] === "never_delegate" || p[0] === "resources" || p[0] === "tools") && !(v || []).length) return;
      var card = h("div", { class: "card" }, h("div", { class: "row" }, h("h2", { class: "grow", text: p[1] }),
        can(2) && p[0] !== "steps" && p[0] !== "area" ? h("button", { class: "ghost small", onclick: function () { commentBox(card, p[0] === "outcome" ? "outcome" : p[0], p[1], p[2] === "list" ? (v || []).join("\n") : (p[0] === "outcome" ? b.outcome : v)); } }, "Comment") : null));
      if (p[2] === "steps") {
        card.appendChild(h("ol", { class: "gd-steps", style: "list-style:none" }, (b.steps || []).map(function (st, i) {
          var shot = st.screenshot ? h("button", { class: "ghost small", onclick: function () { openFile({ id: st.screenshot }, false); } }, "Screenshot") : null;
          return h("li", null, h("i", { text: String(i + 1) }), h("div", { class: "grow" },
            h("span", { text: st.text }),
            h("div", { class: "small muted", text: [st.who && "Who: " + st.who, st.tool && "Tool: " + st.tool, st.minutes && "About " + st.minutes + " min", st.tag && TAG_WORDS[st.tag]].filter(Boolean).join(" | ") }),
            st.decision ? h("div", { class: "small", text: "Decision: " + st.decision }) : null,
            h("div", { class: "row" }, shot, can(2) ? h("button", { class: "ghost small", onclick: function () { commentBox(card, "step:" + (i + 1), "Step " + (i + 1), st.text); } }, "Comment") : null)));
        })));
        if (!(b.steps || []).length) card.appendChild(h("p", { class: "muted", text: "No steps yet." }));
      } else if (p[2] === "list") {
        card.appendChild((v || []).length ? h("ul", null, v.map(function (t) { return h("li", { text: t }); })) : h("p", { class: "muted", text: "Not filled in yet." }));
      } else card.appendChild(h("p", { style: "white-space:pre-wrap", text: v || "Not filled in yet." }));
      area.appendChild(card);
    });
  }

  // A note, or a suggested change the administrator decides on
  function commentBox(card, part, label, current) {
    var note = h("textarea", { "aria-label": "Comment", style: "width:100%;min-height:60px", placeholder: "Your comment on " + label });
    var sug = h("textarea", { "aria-label": "Suggested text", style: "width:100%;min-height:80px;display:none", value: current || "" });
    var withSug = h("input", { type: "checkbox" });
    withSug.addEventListener("change", function () { sug.style.display = withSug.checked ? "block" : "none"; });
    var box = h("div", { class: "soft", style: "margin-top:10px" }, notice(), note, h("label", { style: "display:flex;gap:8px;align-items:center" }, withSug, "Suggest new text for this part"), sug,
      h("div", { class: "row", style: "margin-top:6px" }, h("button", { class: "blue small", onclick: function () {
        if (!note.value.trim() && !withSug.checked) return;
        api.post("/playbooks/comment", { id: lib.pb.playbook.id, part: part, body: note.value, suggested_text: withSug.checked ? sug.value : "" }).then(okOr).then(function () {
          D.toast(app, withSug.checked ? "Suggestion sent to the administrator" : "Comment added");
          openPlaybook(lib.pb.playbook.id);
        }).catch(pbFail);
      } }, "Send"), h("button", { class: "ghost small", onclick: function () { box.remove(); } }, "Cancel")));
    card.appendChild(box);
    note.focus();
  }

  function editView(area, b) {
    var f = {};
    function field(key, label, kind, hint) {
      var v = b[key];
      var el = kind === "line" ? h("input", { style: "width:100%", value: v || "" }) : h("textarea", { style: "width:100%;min-height:" + (kind === "list" ? 90 : 70) + "px", value: kind === "list" ? (v || []).join("\n") : (v || "") });
      f[key] = { el: el, kind: kind };
      return h("div", null, h("label", { text: label }), hint ? h("div", { class: "small muted", text: hint }) : null, el);
    }
    var steps = (b.steps || []).map(function (st) { return JSON.parse(JSON.stringify(st)); });
    var stepsEl = h("div");
    function drawSteps() {
      D.clear(stepsEl);
      steps.forEach(function (st, i) {
        var t = h("textarea", { "aria-label": "Step " + (i + 1), style: "width:100%;min-height:54px", value: st.text });
        t.addEventListener("input", function () { st.text = t.value; });
        function small(ph, key, w) { var e = h("input", { placeholder: ph, value: st[key] === null || st[key] === undefined ? "" : String(st[key]), style: "width:" + w }); e.addEventListener("input", function () { st[key] = key === "minutes" ? (parseInt(e.value, 10) || null) : e.value; }); return e; }
        var tag = h("select", { "aria-label": "Delegation" }, [["", "Delegation?"], ["keep", "Keep (attorney)"], ["delegate", "Delegate"], ["automate", "Automate"]].map(function (o) { return h("option", { value: o[0], selected: st.tag === o[0], text: o[1] }); }));
        tag.addEventListener("change", function () { st.tag = tag.value; });
        stepsEl.appendChild(h("div", { class: "soft", style: "margin:8px 0" }, h("b", { text: "Step " + (i + 1) }), t,
          h("div", { class: "row", style: "margin-top:6px" }, small("Who", "who", "140px"), small("Tool", "tool", "140px"), small("Minutes", "minutes", "90px"), tag),
          h("div", { style: "margin-top:6px" }, small("Decision point (if X, go to step N)", "decision", "100%")),
          h("div", { class: "row", style: "margin-top:6px" },
            i > 0 ? h("button", { class: "ghost small", type: "button", onclick: function () { steps.splice(i - 1, 0, steps.splice(i, 1)[0]); drawSteps(); } }, "Move up") : null,
            h("button", { class: "ghost small", type: "button", onclick: function () { steps.splice(i + 1, 0, { text: "", who: "", tool: "", minutes: null, decision: "", tag: "", screenshot: "" }); drawSteps(); } }, "Add a step below"),
            h("button", { class: "danger small", type: "button", onclick: function () { steps.splice(i, 1); drawSteps(); } }, "Remove"))));
      });
      stepsEl.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { steps.push({ text: "", who: "", tool: "", minutes: null, decision: "", tag: "", screenshot: "" }); drawSteps(); } }, "+ Add a step"));
    }
    drawSteps();
    var hasDl = h("input", { type: "checkbox", checked: b.has_deadlines });
    var noteIn = h("input", { style: "width:100%", placeholder: "What you changed (shows in Versions)" });
    area.appendChild(h("div", { class: "card" }, notice(),
      field("title", "1. Title", "line"), field("outcome", "Outcome: what done produces", "text"),
      h("div", { class: "row" }, h("div", { class: "grow" }, field("practice_area", "2. Practice area", "line")), h("div", { class: "grow" }, field("jurisdiction", "Jurisdiction (a state, federal, or any)", "line"))),
      field("when_to_use", "3. When to use it", "text", "What starts it: a new client signs, a court notice arrives, the first of the month."),
      field("roles", "4. Roles", "text", "Who owns it, who does each part, and which parts only an attorney may do. One per line."),
      field("needs", "5. What you need first", "list", "One per line. Describe documents and access; never paste real client data."),
      h("label", { text: "6. Steps (at least 3)" }), stepsEl,
      h("label", { style: "display:flex;gap:8px;align-items:center" }, hasDl, "7. This process has deadlines"), field("deadlines", "Deadlines and timing", "text", "Court or rule deadlines and your own target times. Write Check this: in front of anything you are not sure of."),
      field("checks", "8. Quality checks", "list", "How to tell each step and the whole job was done right. One per line."),
      field("review_points", "9. Attorney review and ethics points", "list", "Where an attorney must review or sign. One per line."),
      field("never_delegate", "What must never be delegated", "list"),
      field("resources", "10. Templates and resources", "list", "Files can also be attached on the Files view."),
      field("tools", "11. Tools", "list"), field("deliverables", "12. Deliverables", "text", "What is handed over at the end, and to whom."),
      h("label", { text: "Note for this version" }), noteIn,
      h("div", { class: "row", style: "margin-top:12px" }, h("button", { class: "blue", onclick: save }, "Save as a new version"), h("button", { class: "ghost", onclick: function () { lib.view = "read"; drawPlaybook(); } }, "Cancel"))));
    function save() {
      var nb = JSON.parse(JSON.stringify(b));
      Object.keys(f).forEach(function (k) { nb[k] = f[k].kind === "list" ? f[k].el.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean) : f[k].el.value; });
      nb.steps = steps.filter(function (st) { return (st.text || "").trim(); });
      nb.has_deadlines = hasDl.checked;
      api.post("/playbooks/save", { id: lib.pb.playbook.id, base_version: lib.pb.playbook.version, body: nb, note: noteIn.value }).then(okOr).then(function (r) {
        D.toast(app, "Saved as version " + r.version);
        lib.view = "read";
        openPlaybook(lib.pb.playbook.id);
      }).catch(pbFail);
    }
  }

  var pbChatLog = {};
  function pbChatView(area) {
    var id = lib.pb.playbook.id;
    var log = pbChatLog[id] = pbChatLog[id] || [];
    var list = h("div", { class: "chat" });
    function drawLog() {
      D.clear(list);
      if (!log.length) list.appendChild(h("div", { class: "card soft" }, h("p", { style: "margin:0", text: "Ask about this playbook (\"Who does step 4?\") or ask for a change (\"Add a conflict check before step 2\"). DELA proposes changes as suggestions; nothing changes until " + (can(4) ? "you or an editor accept it." : "an editor or the administrator accepts it.") })));
      log.forEach(function (m) { list.appendChild(h("div", { class: "msg " + m.role, text: m.text })); });
    }
    drawLog();
    var ta = h("textarea", { "aria-label": "Message about this playbook", style: "width:100%;min-height:70px" });
    var status = h("span", { class: "small muted", role: "status" });
    var auto = h("input", { type: "checkbox" });
    var ai = chat.ai || {};
    var mic = ai.voice_on && navigator.mediaDevices && window.MediaRecorder ? h("button", { class: "mic small", type: "button", onclick: function () { toggleMic(mic, ta, status, auto); } }, "● Talk") : null;
    var btn = h("button", { class: "blue" }, "Send");
    var req = null, attempt = 0;
    function send(extra) {
      extra = extra || {};
      var text = ta.value.trim();
      if (!text) return;
      req = req || newId();
      btn.disabled = true;
      status.textContent = "DELA is thinking...";
      api.post("/playbooks/chat", { id: id, message: text, request_id: req, attempt: attempt, lawfecta_once: extra.once === true, confirm_no_client_info: extra.confirm === true }).then(function (r) {
        btn.disabled = false;
        status.textContent = "";
        if (!r.ok) {
          if (r.reason === "looks_like_client_info" && confirm("This may include " + kindsText(r.kinds) + ". Send anyway? Only if it has no client information.")) { send({ confirm: true }); return; }
          if (r.reason === "ai_failed" && r.source !== "lawfecta" && confirm(failText(r) + " Use Lawfecta credits this time?")) { attempt++; send({ once: true }); return; }
          attempt++;
          D.toast(app, failText(r), true);
          return;
        }
        log.push({ role: "user", text: text });
        log.push({ role: "assistant", text: r.reply + (r.suggestion_id ? "\n\nThis change is waiting on the Suggestions view." + (r.removes_review ? " It removes an attorney review point, so only the administrator can accept it." : "") : "") });
        ta.value = "";
        req = null;
        attempt = 0;
        if (r.suggestion_id) { openPlaybook(id, "chat"); return; }
        drawLog();
      }).catch(function (e) { btn.disabled = false; status.textContent = ""; pbFail(e); });
    }
    btn.addEventListener("click", function () { send(); });
    area.appendChild(list);
    area.appendChild(h("div", { class: "composer" }, notice(), ta, h("div", { class: "row", style: "margin-top:8px" }, mic, h("span", { class: "grow" }), status, btn)));
  }

  // What a suggestion would change, part by part
  function diffList(before, after) {
    var out = [];
    PB_PARTS.forEach(function (p) {
      var a = JSON.stringify(partValue(before, p[0]) || ""), z = JSON.stringify(partValue(after, p[0]) || "");
      if (p[0] === "steps") {
        var bs = (before.steps || []).map(function (s) { return s.text; }), as = (after.steps || []).map(function (s) { return s.text; });
        as.forEach(function (t) { if (bs.indexOf(t) < 0) out.push(["Steps", "Adds or changes: " + t]); });
        bs.forEach(function (t) { if (as.indexOf(t) < 0) out.push(["Steps", "Removes: " + t]); });
      } else if (a !== z) out.push([p[1], "Becomes: " + (Array.isArray(partValue(after, p[0])) ? partValue(after, p[0]).join("; ") : partValue(after, p[0]) || "(empty)")]);
    });
    return out;
  }

  function suggestionsView(area, b) {
    if (!lib.pb.suggestions.length) { area.appendChild(h("div", { class: "card" }, h("p", { class: "muted", style: "margin:0", text: "No suggestions waiting." }))); return; }
    lib.pb.suggestions.forEach(function (sg) {
      var changes = sg.kind === "ai" ? diffList(b, sg.proposed) : [[sg.part.indexOf("step:") === 0 ? "Step " + sg.part.slice(5) : (PB_PARTS.filter(function (p) { return p[0] === sg.part; })[0] || [0, sg.part])[1], "Becomes: " + (sg.proposed.text || "")]];
      var mayDecide = sg.kind === "comment" || sg.removes_review ? can(4) : can(3);
      var stale = sg.kind === "ai" && sg.base_version !== lib.pb.playbook.version;
      area.appendChild(h("div", { class: "card" },
        h("div", { class: "row" }, h("h3", { class: "grow", style: "margin:0", text: (sg.kind === "ai" ? "From DELA chat: " : "From " + sg.by + ": ") + (sg.note || "Suggested change") }), sg.removes_review ? h("span", { class: "badge bad", text: "Removes an attorney review point" }) : null),
        h("div", { class: "small muted", text: D.dateTime(sg.at) + " | made from version " + sg.base_version }),
        stale ? h("p", { class: "notice", text: "The playbook changed after this was suggested, so it cannot be applied as it is. Ask DELA again in Chat." }) : null,
        changes.length ? h("ul", null, changes.map(function (c) { return h("li", null, h("b", { text: c[0] + ": " }), c[1]); })) : h("p", { class: "muted", text: "No visible change." }),
        mayDecide ? h("div", { class: "row" },
          h("button", { class: "blue small", disabled: stale, onclick: function () { decide(sg.id, true); } }, "Accept"),
          h("button", { class: "ghost small", onclick: function () { var n = prompt("Why not? (optional, the author sees this)") || ""; decide(sg.id, false, n); } }, "Reject"))
          : h("p", { class: "small muted", text: "Waiting for " + (sg.kind === "comment" || sg.removes_review ? "the administrator." : "an editor or the administrator.") })));
    });
    function decide(id, accept, note) {
      api.post("/playbooks/decide", { suggestion_id: id, accept: accept, note: note || "" }).then(okOr).then(function () { D.toast(app, accept ? "Accepted. A new version was saved." : "Rejected"); openPlaybook(lib.pb.playbook.id, "suggestions"); }).catch(pbFail);
    }
  }

  function commentsView(area) {
    var cs = lib.pb.comments;
    if (!cs.length) area.appendChild(h("div", { class: "card" }, h("p", { class: "muted", style: "margin:0", text: "No comments yet. Use Comment on any part in the Read view." })));
    cs.forEach(function (c) {
      area.appendChild(h("div", { class: "card", style: c.resolved ? "opacity:.65" : "" },
        h("div", { class: "row" }, h("b", { class: "grow", text: c.by + (c.part ? " on " + (c.part.indexOf("step:") === 0 ? "step " + c.part.slice(5) : c.part.split("_").join(" ")) : "") }), h("span", { class: "small muted", text: D.dateTime(c.at) })),
        h("p", { style: "white-space:pre-wrap", text: c.body }),
        c.suggestion_id && !c.resolved ? h("p", { class: "small", text: "Has a suggested change waiting on the Suggestions view." }) : null,
        !c.resolved && !c.suggestion_id && can(3) ? h("button", { class: "ghost small", onclick: function () { api.post("/playbooks/comment/resolve", { id: c.id }).then(okOr).then(function () { openPlaybook(lib.pb.playbook.id, "comments"); }).catch(pbFail); } }, "Mark done") : null,
        c.resolved ? h("span", { class: "badge", text: "Done" }) : null));
    });
  }

  function activityView(area) {
    area.appendChild(h("div", { class: "card" }, h("p", { class: "small muted", text: "Every event on this playbook, newest first. Nobody can edit or delete these lines." }),
      h("ul", { class: "list" }, lib.pb.activity.map(function (a) {
        return h("li", null, h("b", { text: ACTION_WORDS[a.action] || a.action.split("_").join(" ") }), " by " + (a.by || "DELA") + (a.version ? ", version " + a.version : "") +
          (a.detail && a.detail.format ? " (" + a.detail.format + ")" : ""), h("div", { class: "small muted", text: D.dateTime(a.at) }));
      }))));
  }

  function versionsView(area) {
    area.appendChild(h("div", { class: "card" }, h("ul", { class: "list" }, lib.pb.versions.map(function (v) {
      return h("li", { class: "row" }, h("span", { class: "grow" }, h("b", { text: "Version " + v.version + (v.version === lib.pb.playbook.version ? " (current)" : "") + (v.approved ? " (approved)" : "") }),
        h("div", { class: "small muted", text: D.dateTime(v.at) + " by " + v.by + (v.note ? ": " + v.note : "") })),
        h("button", { class: "ghost small", onclick: function () { showVersion(v.version); } }, "View"),
        can(3) && v.version !== lib.pb.playbook.version ? h("button", { class: "ghost small", onclick: function () {
          if (!confirm("Restore version " + v.version + "? It is saved as a new version; nothing is lost.")) return;
          api.post("/playbooks/restore", { id: lib.pb.playbook.id, version: v.version }).then(okOr).then(function (r) { D.toast(app, "Restored as version " + r.version); openPlaybook(lib.pb.playbook.id, "versions"); }).catch(pbFail);
        } }, "Restore") : null);
    }))));
    function showVersion(n) {
      api.get("/playbooks/get?id=" + lib.pb.playbook.id + "&v=" + n).then(function (r) {
        closeDrawer();
        var inner = h("div");
        drawer = h("div", { class: "drawer", role: "dialog", "aria-label": "Version " + n, style: "width:min(640px,calc(100% - 48px))" },
          h("div", { class: "row", style: "padding-right:84px" }, h("h2", { class: "grow", text: "Version " + n })), inner);
        var saveCan = can;
        can = function () { return false; };
        readView(inner, r.version.body);
        can = saveCan;
        showDrawer(drawer);
      }).catch(pbFail);
    }
  }

  function pbFilesView(area) {
    var card = h("div", { class: "card" }, h("p", { class: "small muted", text: "Templates, forms and checklists kept with this playbook. They come from your firm's Files tab; new versions of a file follow automatically." }));
    if (!lib.pb.files.length) card.appendChild(h("p", { class: "muted", text: "No files attached." }));
    lib.pb.files.forEach(function (fl) {
      card.appendChild(h("div", { class: "row", style: "margin:6px 0" }, h("span", { class: "grow", text: fl.name }), h("button", { class: "ghost small", onclick: function () { openFile(fl, fl.ext !== "pdf" && fl.ext !== "png" && fl.ext !== "jpg"); } }, "Open"),
        can(3) ? h("button", { class: "ghost small", onclick: function () { attach(fl.id, false); } }, "Remove") : null));
    });
    if (can(3) && (me.switches || {}).file_uploads) {
      var pick = h("select", { "aria-label": "Attach a file" }, h("option", { value: "", text: "Attach a file from Files" }));
      api.get("/files").then(function (r) { (r.files || []).filter(function (f) { return f.status === "ready"; }).forEach(function (f) { pick.appendChild(h("option", { value: f.id, text: f.name })); }); }).catch(function () {});
      pick.addEventListener("change", function () { if (pick.value) attach(pick.value, true); });
      card.appendChild(pick);
    }
    area.appendChild(card);
    function attach(fid, on) { api.post("/playbooks/attach", { id: lib.pb.playbook.id, file_id: fid, on: on }).then(okOr).then(function () { openPlaybook(lib.pb.playbook.id, "files"); }).catch(pbFail); }
  }

  function exportView(area) {
    var formats = [["docx", "Word (.docx)", "For Word, Google Docs, Waybook, Monday Docs and Notion."], ["pdf", "PDF", "Opens a print view; choose Save as PDF."],
      ["md", "Markdown (.md)", "For Notion, Confluence and ClickUp."], ["html", "Web page (.html)", "For Notion, Trainual and any knowledge base."], ["csv", "Step checklist (.csv)", "For Monday, Excel, Google Sheets or a Notion table."]];
    area.appendChild(h("div", { class: "card" }, h("p", { class: "small muted", text: "Every file shows the version and date in its footer, so older copies are easy to spot." + (lib.pb.playbook.status !== "approved" ? " This version is not approved yet, and the footer says so." : "") }),
      formats.map(function (fm) {
        return h("div", { class: "row", style: "margin:8px 0" }, h("button", { class: "blue small", style: "min-width:170px", onclick: function () { doExport(fm[0]); } }, fm[1]), h("span", { class: "small muted", text: fm[2] }));
      })));
  }

  function doExport(format) {
    var w = format === "pdf" ? window.open("", "_blank") : null;
    api.post("/playbooks/export", { id: lib.pb.playbook.id, format: format, request_id: newId() }).then(function (r) {
      if (!r.ok) throw r;
      if (r.print) {
        if (!w) { D.toast(app, "Allow pop-ups for this site to print to PDF.", true); return; }
        w.document.open();
        w.document.write(r.text);
        w.document.close();
        w.focus();
        setTimeout(function () { w.print(); }, 300);
        return;
      }
      var blob = r.b64 ? new Blob([Uint8Array.from(atob(r.b64), function (ch) { return ch.charCodeAt(0); })], { type: r.type }) : new Blob([r.text], { type: r.type + ";charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = r.name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      D.toast(app, "Downloaded " + r.name);
    }).catch(function (e) { if (w) w.close(); pbFail(e); });
  }

  // ---------- Import from Scribe ----------

  // Reads a Scribe export (HTML or Markdown) in the browser. Nothing in the file runs: DOMParser documents never run scripts.
  function parseGuide(name, text) {
    var steps = [], title = "";
    if (/\.(md|markdown|txt)$/i.test(name)) {
      text.split(/\r?\n/).forEach(function (line) {
        var l = line.trim();
        if (!l) return;
        var img = l.match(/!\[[^\]]*\]\(([^)\s]+)/);
        if (/^#\s+/.test(l) && !title) { title = l.replace(/^#\s+/, ""); return; }
        if (img) {
          var last = steps[steps.length - 1];
          if (last && !last.image) last.image = img[1]; else steps.push({ text: "", image: img[1] });
          var rest = l.replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim();
          if (rest && last && !last.text) last.text = rest;
          return;
        }
        if (/^#{2,6}\s+/.test(l) && !steps.length && !title) { title = l.replace(/^#+\s+/, ""); return; }
        steps.push({ text: l.replace(/^(\d+[.)]|[-*+])\s+/, "").replace(/[*_`]/g, ""), image: "" });
      });
    } else {
      var doc = new DOMParser().parseFromString(text, "text/html");
      title = ((doc.querySelector("h1") || {}).textContent || (doc.querySelector("title") || {}).textContent || "").trim();
      var walker = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_ELEMENT);
      var node;
      while ((node = walker.nextNode())) {
        var tag = node.tagName;
        if (tag === "IMG") {
          var src = node.getAttribute("src") || "";
          if (!src) continue;
          var lst = steps[steps.length - 1];
          if (lst && !lst.image) lst.image = src; else steps.push({ text: (node.getAttribute("alt") || "").trim(), image: src });
        } else if (["P", "LI", "H2", "H3", "H4", "SPAN", "DIV"].indexOf(tag) >= 0) {
          // A text block with no text blocks inside it is one line of the guide
          if (node.querySelector("p,li,h2,h3,h4,div,img")) continue;
          var t = (node.textContent || "").replace(/\s+/g, " ").trim();
          if (!t || t === title || t.length > 1500) continue;
          if (steps.length && steps[steps.length - 1].text === t) continue;
          steps.push({ text: t, image: "" });
        }
      }
    }
    steps = steps.filter(function (s) { return s.text || s.image; }).map(function (s) { s.text = s.text.replace(/^\d+[.)]\s*/, ""); return s; });
    return { title: title.slice(0, 200), steps: steps };
  }

  function startScribe() {
    var tick = h("input", { type: "checkbox", id: "dela-scribe-tick" });
    var input = h("input", { type: "file", accept: ".html,.htm,.md,.markdown,.txt" });
    var status = h("div", { class: "small", role: "status" });
    var go = h("button", { class: "blue" }, "Read the guide");
    go.addEventListener("click", function () {
      var file = input.files[0];
      if (!file) { D.toast(app, "Choose the exported Scribe file first.", true); return; }
      if (!tick.checked) { D.toast(app, D.errorText("tick_needed"), true); return; }
      if (file.size > 25 * 1048576) { D.toast(app, D.errorText("file_too_big"), true); return; }
      var reader = new FileReader();
      reader.onload = function () {
        var g = parseGuide(file.name, String(reader.result || ""));
        if (!g.steps.length) { status.textContent = "This does not look like a Scribe export: no steps were found. In Scribe, open the guide, click Share, then Export, then Export next to HTML or Markdown, and choose that file."; return; }
        go.disabled = true;
        importImages(g, status).then(function (steps) {
          return api.post("/imports/save", { org_id: lib.org, request_id: newId(), title: g.title, steps: steps });
        }).then(okOr).then(function (r) { openImport(r.id); }).catch(function (e) { go.disabled = false; pbFail(e); });
      };
      reader.readAsText(file);
    });
    D.clear(libEl);
    libEl.appendChild(h("div", { class: "card" }, h("h2", { text: "Import a guide from Scribe" }),
      h("ol", null, h("li", { text: "In Scribe, open the guide." }), h("li", { text: "Click Share, then the Export tab." }), h("li", { text: "Click Export next to HTML (or Markdown) and save the file." }), h("li", { text: "Choose that file below." })),
      h("p", { class: "small muted", text: "DELA reads the steps and screenshots, then shows them on a review screen where you check screenshots for client information, blur parts, fix steps and add why each step matters. Then DELA builds the playbook. Free Scribe accounts: open the guide's share page, press Ctrl+P (Cmd+P on a Mac), choose Save as PDF, upload it on the Files tab, and ask DELA to turn it into a playbook." }),
      notice(),
      h("label", { style: "display:flex;gap:8px;align-items:flex-start;font-weight:600" }, tick, h("span", { text: "This guide and its screenshots have no confidential client information." })),
      h("div", { class: "row" }, input, go, h("button", { class: "ghost", onclick: drawLibrary }, "Cancel")), status));
  }

  // Screenshots inside the file (data addresses) upload like any file; linked ones are fetched by DELA from Scribe's image addresses only
  function importImages(g, status) {
    var out = [];
    var i = 0;
    var total = g.steps.filter(function (s) { return s.image; }).length, done = 0;
    function next() {
      if (i >= g.steps.length) return Promise.resolve(out);
      var st = g.steps[i++];
      var row = { text: st.text, note: "", file_id: "", keep_image: true };
      out.push(row);
      if (!st.image) return next();
      done++;
      status.textContent = "Saving screenshot " + done + " of " + total + "...";
      var name = "Scribe " + (g.title || "guide").slice(0, 60) + " step " + i;
      var p;
      if (st.image.indexOf("data:image/") === 0) p = uploadData(st.image, name);
      else if (st.image.indexOf("https://") === 0) p = api.post("/imports/image", { url: st.image, request_id: newId(), name: name, ticked: true });
      else p = Promise.resolve({ ok: false, reason: "image_not_found" });
      return p.then(function (r) { if (r && r.ok) row.file_id = r.file_id; else if (r && r.reason) status.textContent = failText(r); })
        .catch(function () {}).then(next);
    }
    return next();
  }

  function uploadData(dataUrl, name) {
    var m = dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.*)$/);
    if (!m) return Promise.resolve({ ok: false, reason: "not_an_image" });
    var bytes = Uint8Array.from(atob(m[3]), function (ch) { return ch.charCodeAt(0); });
    var ext = m[2] === "png" ? "png" : "jpg";
    return uploadBlob(new Blob([bytes], { type: m[1] }), name + "." + ext, "");
  }

  function uploadBlob(blob, name, replaceOf) {
    return api.post("/files/start", { name: name, size_bytes: blob.size, ticked: true, request_id: newId(), replace_of: replaceOf || "" }).then(function (r) {
      if (!r.ok) return r;
      if (r.duplicate) return { ok: true, file_id: r.file_id };
      return fetch(r.upload_url, { method: "PUT", headers: { "content-type": r.content_type, "x-upsert": "false" }, body: blob }).then(function (up) {
        if (!up.ok) return { ok: false, reason: "upload_failed" };
        return api.post("/files/complete", { file_id: r.file_id }).then(function (c) { return c.ok === false ? c : { ok: true, file_id: r.file_id, status: c.status }; });
      });
    });
  }

  var imp = null;
  function openImport(id) {
    lib.importId = id;
    lib.pb = null;
    api.get("/imports/get?id=" + id).then(function (r) { imp = r.import; drawImport(); }).catch(function (e) { lib.importId = null; pbFail(e); loadLibrary(); });
  }

  function saveImport() {
    return api.post("/imports/save", { org_id: imp.org_id, id: imp.id, title: imp.title, steps: imp.steps.map(function (s) { return { text: s.text, note: s.note, file_id: s.file_id, keep_image: s.keep_image !== false, extra: s.extra || [], at_ms: s.at_ms || 0 }; }) }).then(okOr);
  }

  // The review screen: nothing goes to the AI until Build my playbook
  function drawImport() {
    D.clear(libEl);
    if (imp.status !== "review") { lib.importId = null; if (imp.playbook_id) openPlaybook(imp.playbook_id); else loadLibrary(); return; }
    var titleIn = h("input", { style: "width:100%", value: imp.title, "aria-label": "Title" });
    titleIn.addEventListener("change", function () { imp.title = titleIn.value; saveImport().catch(pbFail); });
    libEl.appendChild(h("div", { class: "row", style: "margin-top:14px" }, h("button", { class: "ghost small", onclick: function () { lib.importId = null; loadLibrary(); } }, "← Library")));
    libEl.appendChild(h("h1", { text: imp.source === "recorder" ? "Review your recording" : "Review your guide" }));
    libEl.appendChild(h("p", { class: "muted", text: "Check every screenshot for client information, blur anything private, fix the steps, and add why each step matters. Nothing goes to the AI until you click Build my playbook." }));
    libEl.appendChild(h("div", { class: "card" }, h("label", { text: "Title" }), titleIn));
    imp.steps.forEach(function (st, i) {
      var t = h("textarea", { style: "width:100%;min-height:54px", "aria-label": "Step " + (i + 1), value: st.text });
      t.addEventListener("change", function () { st.text = t.value; saveImport().catch(pbFail); });
      var note = h("textarea", { style: "width:100%;min-height:44px", placeholder: "Why this step matters, or what to watch for (optional)", value: st.note || "" });
      note.addEventListener("change", function () { st.note = note.value; saveImport().catch(pbFail); });
      var shot = null;
      if (st.file_id) {
        var keep = h("input", { type: "checkbox", checked: st.keep_image !== false });
        keep.addEventListener("change", function () { st.keep_image = keep.checked; saveImport().catch(pbFail); });
        var held = st.file && st.file.status === "held";
        var img = h("img", { alt: "Screenshot for step " + (i + 1), style: "max-width:100%;max-height:260px;border:1px solid var(--line);border-radius:10px;display:block;margin:6px 0" });
        api.post("/files/open", { file_id: st.file_id }).then(function (r) { if (r.ok) img.src = r.url; }).catch(function () {});
        shot = h("div", null, img,
          held ? h("span", { class: "badge bad", text: "May show client info" }) : null,
          st.file && st.file.status === "refused" ? h("span", { class: "badge bad", text: "Screenshot not accepted" }) : null,
          h("div", { class: "row" }, h("label", { style: "display:flex;gap:6px;align-items:center;margin:0" }, keep, "Use this screenshot"),
            h("button", { class: "ghost small", onclick: function () { blurTool(st, img); } }, "Blur part of this image"),
            held ? h("button", { class: "blue small", onclick: function () {
              if (!confirm("Confirm this screenshot has no confidential client information.")) return;
              api.post("/files/action", { action: "confirm", file_id: st.file_id }).then(okOr).then(function () { openImport(imp.id); }).catch(pbFail);
            } }, "It has no client information") : null));
      }
      libEl.appendChild(h("div", { class: "card" }, h("div", { class: "row" }, h("h3", { class: "grow", style: "margin:0", text: "Step " + (i + 1) }), st.at_ms ? h("span", { class: "small muted", text: "at " + mmssJs(st.at_ms) }) : null),
        t, shot, imp.source === "recorder" ? extraShots(st) : null, note,
        h("div", { class: "row", style: "margin-top:6px" },
          i > 0 ? h("button", { class: "ghost small", onclick: function () { var prev = imp.steps[i - 1]; prev.text = [prev.text, st.text].filter(Boolean).join(" "); if (!prev.file_id) prev.file_id = st.file_id; imp.steps.splice(i, 1); saveImport().then(drawImport).catch(pbFail); } }, "Merge with step above") : null,
          h("button", { class: "ghost small", onclick: function () { imp.steps.splice(i + 1, 0, { text: "", note: "", file_id: "", keep_image: true }); saveImport().then(drawImport).catch(pbFail); } }, "Add a step here"),
          h("button", { class: "danger small", onclick: function () { imp.steps.splice(i, 1); saveImport().then(drawImport).catch(pbFail); } }, "Remove step"))));
    });
    if (imp.source === "recorder") { var rp = h("div"); libEl.appendChild(rp); recorderPanel(rp); }
    var ctx = h("textarea", { style: "width:100%;min-height:70px", placeholder: "Anything else DELA should know: who does this, what starts it, what done looks like, where an attorney must check." });
    var btn = h("button", { class: "big" }, "Build my playbook");
    var attempt = 0;
    btn.addEventListener("click", function () {
      if (!confirm("Check your screenshots for client information before DELA builds your playbook. Build it now?")) return;
      build({});
    });
    function build(extra) {
      btn.disabled = true;
      btn.textContent = "Building...";
      api.post("/imports/build", { id: imp.id, context: ctx.value, attempt: attempt, lawfecta_once: extra.once === true, confirm_no_client_info: extra.confirm === true }).then(function (r) {
        btn.disabled = false;
        btn.textContent = "Build my playbook";
        if (!r.ok) {
          if (r.reason === "looks_like_client_info" && confirm("The steps may include " + kindsText(r.kinds) + ". Build anyway? Only if there is no client information.")) { build({ confirm: true }); return; }
          attempt++;
          D.toast(app, failText(r), true);
          return;
        }
        lib.questions = r.questions || [];
        lib.importId = null;
        openPlaybook(r.playbook_id, "read");
      }).catch(function (e) { btn.disabled = false; btn.textContent = "Build my playbook"; pbFail(e); });
    }
    libEl.appendChild(h("div", { class: "card" }, notice(), h("label", { text: "Anything to add" }), ctx, h("div", { class: "row", style: "margin-top:10px" }, btn,
      h("button", { class: "ghost", onclick: function () { if (confirm("Discard this import?")) api.post("/imports/discard", { id: imp.id }).then(function () { lib.importId = null; loadLibrary(); }).catch(pbFail); } }, "Discard"))));
  }

  // Drag a box over the screenshot; the blur is burned into a new version of the image, so it cannot be undone by anyone
  function blurTool(st, img) {
    if (!img.src) { D.toast(app, "The screenshot is still loading.", true); return; }
    var pic = new Image();
    pic.crossOrigin = "anonymous";
    pic.onload = function () {
      var c = document.createElement("canvas");
      c.width = pic.naturalWidth; c.height = pic.naturalHeight;
      c.style.cssText = "max-width:100%;cursor:crosshair;border-radius:10px;touch-action:none";
      var g = c.getContext("2d");
      g.drawImage(pic, 0, 0);
      var start = null, boxes = 0;
      function pos(e) { var r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height }; }
      c.addEventListener("pointerdown", function (e) { start = pos(e); });
      c.addEventListener("pointerup", function (e) {
        if (!start) return;
        var end = pos(e), x = Math.min(start.x, end.x), y = Math.min(start.y, end.y), w = Math.abs(end.x - start.x), hh = Math.abs(end.y - start.y);
        start = null;
        if (w < 4 || hh < 4) return;
        // Pixelate: shrink the box to a few pixels and draw it back large, then cover with a solid wash
        var tiny = document.createElement("canvas"), k = 0.04;
        tiny.width = Math.max(1, Math.round(w * k)); tiny.height = Math.max(1, Math.round(hh * k));
        tiny.getContext("2d").drawImage(c, x, y, w, hh, 0, 0, tiny.width, tiny.height);
        g.imageSmoothingEnabled = false;
        g.drawImage(tiny, 0, 0, tiny.width, tiny.height, x, y, w, hh);
        g.fillStyle = "rgba(120,120,120,0.55)";
        g.fillRect(x, y, w, hh);
        boxes++;
      });
      closeDrawer();
      drawer = h("div", { class: "drawer", role: "dialog", "aria-label": "Blur part of this image", style: "width:min(900px,100%)" },
        h("div", { class: "row" }, h("h2", { class: "grow", text: "Blur part of this image" }), h("button", { class: "ghost small", onclick: closeDrawer }, "Cancel")),
        h("p", { class: "small muted", text: "Drag a box over anything private. Drag again for more boxes. Saving replaces the screenshot with the blurred one." }), c,
        h("div", { class: "row", style: "margin-top:10px" }, h("button", { class: "blue", onclick: function () {
          if (!boxes) { D.toast(app, "Drag a box over the part to blur first.", true); return; }
          c.toBlob(function (blob) {
            uploadBlob(blob, "Blurred screenshot.png", st.file_id).then(function (r) {
              if (!r.ok) throw r;
              var old = st.file_id;
              st.file_id = r.file_id;
              // The unblurred original is deleted for good
              return saveImport().then(function () { return api.post("/files/action", { action: "drop_version", file_id: old }); });
            }).then(function () { closeDrawer(); D.toast(app, "Blurred screenshot saved"); openImport(imp.id); }).catch(pbFail);
          }, "image/png");
        } }, "Save the blurred screenshot")));
      showDrawer(drawer, true);
    };
    pic.onerror = function () { D.toast(app, "The screenshot could not be opened for blurring. Untick it instead.", true); };
    pic.src = img.src;
  }


  // ---------- Process Recorder ----------

  var recs = { data: null };
  var REC_STATUS = { recording: "Recording", uploading: "Uploading", analyzing: "Analyzing", ready: "Ready for review", failed: "Could not analyze", discarded: "Discarded" };

  // Pieces wait in the browser (IndexedDB) until they are safely uploaded, so a dropped connection or closed tab loses nothing
  var idb = {
    open: function () {
      return new Promise(function (ok, no) {
        if (!window.indexedDB) { no(new Error("no_idb")); return; }
        var r = indexedDB.open("dela-recorder", 1);
        r.onupgradeneeded = function () { r.result.createObjectStore("parts", { keyPath: "key" }); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { no(r.error); };
      });
    },
    run: function (mode, fn) {
      return idb.open().then(function (db) {
        return new Promise(function (ok, no) {
          var t = db.transaction("parts", mode), st = t.objectStore("parts"), out = fn(st);
          t.oncomplete = function () { ok(out && out.result !== undefined ? out.result : undefined); };
          t.onerror = function () { no(t.error); };
        });
      });
    },
    put: function (rec) { return idb.run("readwrite", function (st) { st.put(rec); }).catch(function () {}); },
    del: function (key) { return idb.run("readwrite", function (st) { st.delete(key); }).catch(function () {}); },
    all: function () { return idb.run("readonly", function (st) { return st.getAll(); }).catch(function () { return []; }); },
  };

  function uploadPart(recId, kind, seq, startMs, blob) {
    var key = recId + ":" + kind + ":" + seq;
    return idb.put({ key: key, recId: recId, kind: kind, seq: seq, startMs: startMs, blob: blob, at: Date.now() }).then(function () {
      return api.post("/recordings/part", { id: recId, kind: kind, seq: seq, start_ms: startMs, bytes: blob.size });
    }).then(function (r) {
      if (!r.ok) throw r;
      if (r.uploaded) return r;
      return fetch(r.upload_url, { method: "PUT", headers: { "content-type": (blob.type || "video/webm").split(";")[0], "x-upsert": "true" }, body: blob }).then(function (up) {
        if (!up.ok) throw new Error("upload_failed");
        return api.post("/recordings/part-done", { id: recId, kind: kind, seq: seq });
      });
    }).then(function (r) { if (r && r.ok === false) throw r; return idb.del(key); });
  }

  // prev: the card on the page now. A refresh builds the new card off the page and swaps it in when ready,
  // so the Recordings card never blanks out (Stacey's recorder check 2026-11-05: it disappeared every few seconds)
  function recordingsCard(prev) {
    var card = h("div", { class: "card rec-card" }, prev ? null : h("p", { class: "muted", text: "Loading recordings..." }));
    Promise.all([api.get("/recordings"), idb.all()]).then(function (r) {
      if (prev && !prev.isConnected) return;
      recs.data = r[0];
      var waiting = r[1] || [];
      D.clear(card);
      if (prev) prev.replaceWith(card);
      var st = recs.data.settings;
      card.appendChild(h("div", { class: "row" }, h("h2", { class: "grow", text: "Recordings" }),
        st.on ? h("button", { class: "blue small", onclick: recordView }, "Record a process") : null));
      card.appendChild(h("p", { class: "small muted", text: "Videos are kept " + st.video_days + " days on your plan, then deleted; the playbook you build stays. Storage used: " + mbText(recs.data.used_bytes) + " of " + mbText(recs.data.limit_bytes) + "." }));
      if (waiting.length) {
        card.appendChild(h("div", { class: "notice", role: "alert" }, h("p", { style: "margin:0 0 6px", text: "Your last recording didn't finish uploading." }),
          h("button", { class: "blue small", onclick: function () { finishLeftovers(waiting); } }, "Finish upload")));
      }
      if (!recs.data.items.length) { card.appendChild(h("p", { class: "muted", text: st.on ? "No recordings yet." : "The Process Recorder is not open for your account yet." })); return; }
      var today = D.today();
      // A recording still "uploading" after 15 minutes, with no pieces waiting in this browser, will not finish by itself:
      // say so and offer to remove it (Stacey's recorder check 2026-11-05: it stayed at Uploading with no way out)
      var oldUpload = Date.now() - 15 * 60000;
      var stuck = function (x) { return x.status === "uploading" && new Date(x.created_at).getTime() < oldUpload && !waiting.some(function (w) { return w.recId === x.id; }); };
      // On a phone the table becomes one block per recording (Stacey 2026-11-05: it was cut off)
      card.appendChild(h("div", { class: "scroll" }, h("table", { class: "stack" },
        h("thead", null, h("tr", null, ["Process name", "Date recorded", "Length", "Status", "Video deletes on", ""].map(function (x) { return h("th", { text: x }); }))),
        h("tbody", null, recs.data.items.map(function (x) {
          var days = x.video_delete_after ? Math.round((new Date(x.video_delete_after) - new Date(today)) / 86400000) : null;
          var del = x.video_deleted_at ? "Video deleted on " + D.date(x.video_deleted_at) : x.video_delete_after ? D.date(x.video_delete_after) : "";
          return h("tr", null, h("td", { "data-label": "Process name" }, h("b", { text: x.title })), h("td", { "data-label": "Date recorded", text: D.date(x.created_at) }),
            h("td", { "data-label": "Length", text: x.duration_seconds ? Math.floor(x.duration_seconds / 60) + " min " + (x.duration_seconds % 60) + " s" : "" }),
            h("td", { "data-label": "Status" }, stuck(x) ? h("span", { class: "badge bad", title: "The rest of this recording is not in this browser, so it cannot finish. Remove it and record again.", text: "Upload did not finish" })
              : h("span", { class: "badge " + (x.status === "ready" ? "ready" : x.status === "failed" ? "bad" : "held"), text: REC_STATUS[x.status] + (x.status === "failed" && x.error ? " (" + x.error.split("_").join(" ") + ")" : "") })),
            h("td", { "data-label": "Video deletes on" }, del, days !== null && days <= 3 && !x.video_deleted_at ? h("span", { class: "badge held", style: "margin-left:6px", text: "Deletes in " + Math.max(days, 0) + " days" }) : null),
            h("td", null, h("div", { class: "row" },
              x.status === "ready" && x.import_id && !x.playbook_id ? h("button", { class: "blue small", onclick: function () { openImport(x.import_id); } }, "Review") : null,
              x.playbook_id ? h("button", { class: "ghost small", onclick: function () { openPlaybook(x.playbook_id, "read"); } }, "Open playbook") : null,
              stuck(x) ? h("button", { class: "ghost small", onclick: function () {
                if (!confirm("Remove this recording? It did not finish uploading, so there is nothing to build from it. Record the process again.")) return;
                api.post("/recordings/discard", { id: x.id }).then(function (r) { if (r.ok === false) throw r; D.toast(app, "Recording removed"); drawLibrary(); }).catch(pbFail);
              } }, "Remove") : null,
              x.status === "failed" ? h("button", { class: "blue small", onclick: function () { api.post("/recordings/retry", { id: x.id }).then(function (r) { if (r.ok === false) throw r; D.toast(app, "Analyzing again"); drawLibrary(); }).catch(pbFail); } }, "Try again") : null,
              !x.video_deleted_at && x.video_bytes ? h("button", { class: "ghost small", onclick: function () { downloadVideo(x); } }, "Download video") : null,
              !x.video_deleted_at ? h("button", { class: "danger small", onclick: function () {
                if (!confirm("Delete this recording's video and screenshots now? A playbook built from it stays.")) return;
                api.post("/recordings/delete-video", { id: x.id }).then(function (r) { if (r.ok === false) throw r; D.toast(app, "Video deleted"); drawLibrary(); }).catch(pbFail);
              } }, "Delete video") : null)));
        })))));
      // Check again while DELA is analyzing, or a piece is still arriving from a recording made in the last 15 minutes
      var fresh = Date.now() - 15 * 60000;
      if (recs.data.items.some(function (x) { return x.status === "analyzing" || (x.status === "uploading" && new Date(x.created_at).getTime() > fresh); })) {
        setTimeout(function () { if (tab === "library" && !lib.pb && !lib.importId && card.isConnected) recordingsCard(card); }, 8000);
      }
    }).catch(function (e) { D.clear(card); card.appendChild(h("p", { class: "small muted", text: D.errorText(e.message) })); });
    return card;
  }

  function finishLeftovers(parts) {
    var byRec = {};
    parts.forEach(function (p) { (byRec[p.recId] = byRec[p.recId] || []).push(p); });
    var ids = Object.keys(byRec);
    D.toast(app, "Finishing the upload...");
    var chain = Promise.resolve();
    ids.forEach(function (id) {
      byRec[id].sort(function (a, b) { return a.seq - b.seq; }).forEach(function (p) { chain = chain.then(function () { return uploadPart(p.recId, p.kind, p.seq, p.startMs, p.blob); }); });
      chain = chain.then(function () {
        var item = (recs.data.items || []).filter(function (x) { return x.id === id; })[0];
        var st = JSON.parse(localStorageGet("dela.rec." + id) || "{}");
        return api.post("/recordings/finish", { id: id, duration_seconds: st.seconds || (item && item.duration_seconds) || 0, video_parts: st.video || 0, audio_parts: st.audio || 0 });
      });
    });
    chain.then(function () { D.toast(app, "Upload finished"); drawLibrary(); }).catch(pbFail);
  }
  function localStorageGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function localStorageSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private windows */ } }

  // The video arrives in pieces; the browser joins them into one file to play or save
  function downloadVideo(x) {
    D.toast(app, "Preparing the video...");
    api.post("/recordings/video", { id: x.id }).then(function (r) {
      if (!r.ok) throw r;
      return Promise.all(r.urls.map(function (u) { return fetch(u).then(function (res) { if (!res.ok) throw new Error("download_failed"); return res.blob(); }); })).then(function (blobs) {
        var blob = new Blob(blobs, { type: (r.mime || "video/webm").split(";")[0] });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "DELA - " + r.title.replace(/[^A-Za-z0-9 ._-]+/g, " ").trim() + " - " + String(r.created_at).slice(0, 10) + ".webm";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      });
    }).catch(pbFail);
  }

  function browserName() {
    var u = navigator.userAgent;
    return /Edg\//.test(u) ? "Edge" : /OPR\//.test(u) ? "Opera" : /Firefox\//.test(u) ? "Firefox" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : "Other";
  }
  function pickMime() {
    var list = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    for (var i = 0; i < list.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(list[i])) return list[i];
    return "";
  }
  function audioMime() {
    var list = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    for (var i = 0; i < list.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(list[i])) return list[i];
    return "";
  }

  // 4.1 Record a Process page
  function recordView() {
    var st = recs.data ? recs.data.settings : null;
    if (!st) { api.get("/recordings").then(function (r) { recs.data = r; recordView(); }).catch(pbFail); return; }
    var can = navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia && window.MediaRecorder && !/Mobi|Android|iPad|iPhone/.test(navigator.userAgent);
    var name = h("input", { "aria-label": "Process name", style: "width:100%", placeholder: "Example: File a motion and upload it to Clio" });
    var micSel = h("select", { "aria-label": "Microphone" }, h("option", { value: "", text: "Default microphone" }));
    var meter = h("div", { class: "bar", "aria-label": "Microphone level" }, h("span", { style: "width:0%" }));
    var consent = h("input", { type: "checkbox", id: "dela-rec-consent" });
    var start = h("button", { class: "blue big", disabled: !st.consented }, "Start recording");
    consent.addEventListener("change", function () { start.disabled = !consent.checked; });
    var status = h("div", { role: "status" });
    var probe = null;
    if (can && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
        probe = s;
        levelMeter(s, meter.firstChild);
        return navigator.mediaDevices.enumerateDevices();
      }).then(function (ds) {
        ds.filter(function (d) { return d.kind === "audioinput"; }).forEach(function (d, i) { micSel.appendChild(h("option", { value: d.deviceId, text: d.label || "Microphone " + (i + 1) })); });
      }).catch(function () { status.textContent = "DELA could not use a microphone. Allow the microphone for this site (the icon left of the web address), then reload. You can still record without talking, but the steps will be less clear."; });
    }
    var upload = h("input", { type: "file", accept: "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov", style: "display:none" });
    upload.addEventListener("change", function () { if (upload.files[0]) uploadRecording(upload.files[0], name.value, st, status); });
    start.addEventListener("click", function () {
      if (!name.value.trim()) { D.toast(app, "Give the process a name first.", true); name.focus(); return; }
      if (probe) probe.getTracks().forEach(function (t) { t.stop(); });
      beginRecording(name.value.trim(), micSel.value, st, status, !st.consented && consent.checked);
    });
    D.clear(libEl);
    libEl.appendChild(h("div", { class: "row", style: "margin-top:14px" }, h("button", { class: "ghost small", onclick: function () { if (probe) probe.getTracks().forEach(function (t) { t.stop(); }); drawLibrary(); } }, "← Library")));
    libEl.appendChild(h("div", { class: "hero navy" }, h("span", { class: "badge", style: "background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.3)", text: "DELA RECORDER" }),
      h("h2", { text: "Record a process" }), h("p", { text: "Do the task the way you always do and talk through each step. DELA turns it into a playbook you can hand off." })));
    var card = h("div", { class: "card" }, h("label", { text: "Process name" }), name);
    if (can) {
      card.appendChild(h("label", { text: "Microphone" }));
      card.appendChild(micSel);
      card.appendChild(meter);
      if (!st.consented) card.appendChild(h("label", { style: "display:flex;gap:8px;align-items:flex-start;font-weight:600;margin-top:12px" }, consent, h("span", { text: st.consent_text })));
      card.appendChild(h("div", { class: "notice", style: "border-color:#e8c97a;background:#fff3d6;color:#5a3d00" }, h("b", { text: "💡 Before you start" }),
        h("ul", { style: "margin:6px 0 0" }, h("li", { text: "Close email and chat windows you don't need." }), h("li", { text: "Keep the whole process on one screen." }), h("li", { text: "Say out loud what you are doing and why." }), h("li", { text: "For the beta, record a practice run or non-client work. Confidential client information does not belong in DELA." }))));
      card.appendChild(h("p", { class: "small", text: "Your plan allows recordings up to " + st.max_minutes + " minutes." }));
      card.appendChild(h("div", { class: "row" }, start, h("button", { class: "ghost", onclick: function () { upload.click(); } }, "Upload a recording"), upload));
    } else {
      card.appendChild(h("p", { class: "notice", text: "Screen recording isn't available in this browser. Open DELA in Chrome, Edge, Firefox or Safari on a computer, or upload a recording you made elsewhere." }));
      card.appendChild(h("div", { class: "row" }, h("button", { class: "blue", onclick: function () { upload.click(); } }, "Upload a recording"), upload));
    }
    card.appendChild(status);
    libEl.appendChild(card);
  }

  function levelMeter(stream, bar) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext, c = new AC(), an = c.createAnalyser();
      an.fftSize = 512;
      c.createMediaStreamSource(stream).connect(an);
      var data = new Uint8Array(an.fftSize);
      (function loop() {
        if (!bar.isConnected || stream.getAudioTracks().every(function (t) { return t.readyState === "ended"; })) { try { c.close(); } catch (e) { /* closing is best effort */ } return; }
        an.getByteTimeDomainData(data);
        var sum = 0;
        for (var i = 0; i < data.length; i++) { var v = (data[i] - 128) / 128; sum += v * v; }
        bar.style.width = Math.min(100, Math.round(Math.sqrt(sum / data.length) * 300)) + "%";
        requestAnimationFrame(loop);
      })();
    } catch (e) { /* the meter is a help only */ }
  }

  function screenHelp() {
    return /Mac/.test(navigator.platform || navigator.userAgent)
      ? "Your Mac blocked screen recording. Open System Settings. Go to Privacy & Security, then Screen & System Audio Recording. Turn on your browser. Quit and reopen the browser."
      : "Screen sharing was blocked or cancelled. Click Start recording again and choose Entire Screen.";
  }

  // 4.2 While recording
  function beginRecording(title, micId, st, status, consent) {
    var startedReq = newId();
    var display = null, mic = null;
    navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: "monitor", cursor: "always", frameRate: { ideal: 5, max: 15 }, width: { max: 2560 } }, audio: false,
      monitorTypeSurfaces: "include", surfaceSwitching: "exclude", selfBrowserSurface: "exclude" }).then(function (d) {
      display = d;
      var surface = d.getVideoTracks()[0].getSettings().displaySurface;
      if (surface && surface !== "monitor") {
        d.getTracks().forEach(function (t) { t.stop(); });
        throw { reason: "not_whole_screen" };
      }
      return navigator.mediaDevices.getUserMedia({ audio: { deviceId: micId || undefined, echoCancellation: true, noiseSuppression: true } }).catch(function () { return null; });
    }).then(function (m) {
      mic = m;
      return api.post("/recordings/start", { title: title, request_id: startedReq, browser: browserName(), mime: pickMime(), consent: consent });
    }).then(function (r) {
      if (!r.ok) throw r;
      runRecorder(r.id, title, display, mic, r.settings);
    }).catch(function (e) {
      if (display) display.getTracks().forEach(function (t) { t.stop(); });
      if (mic) mic.getTracks().forEach(function (t) { t.stop(); });
      status.className = "problem";
      status.textContent = e && e.reason === "not_whole_screen" ? "DELA needs your entire screen so it can follow you between programs. Click Start recording again and choose Entire Screen."
        : e && e.name === "NotAllowedError" ? screenHelp() : e && e.reason ? failText(e) : "Recording could not start. Please try again.";
    });
  }

  function runRecorder(recId, title, display, mic, st) {
    var started = Date.now(), pausedFor = 0, pausedAt = 0, seq = 0, aseq = 0, frames = 0, stopped = false, pending = [];
    var tracks = display.getVideoTracks().concat(mic ? mic.getAudioTracks() : []);
    var mime = pickMime();
    var mr = new MediaRecorder(new MediaStream(tracks), mime ? { mimeType: mime, videoBitsPerSecond: st.video_kbps * 1000 } : { videoBitsPerSecond: st.video_kbps * 1000 });
    var elapsed = function () { return Date.now() - started - pausedFor - (pausedAt ? Date.now() - pausedAt : 0); };
    mr.ondataavailable = function (e) {
      if (!e.data || !e.data.size) return;
      var n = seq++;
      pending.push(uploadPart(recId, "video", n, n * st.chunk_seconds * 1000, e.data).catch(function () { /* stays in the browser for Finish upload */ }));
    };
    mr.start(st.chunk_seconds * 1000);
    // Speech is recorded separately in parts of a few minutes, each a complete file for speech to text
    var am = null, amStart = 0;
    function startAudio() {
      if (!mic || stopped) return;
      amStart = elapsed();
      am = new MediaRecorder(mic, audioMime() ? { mimeType: audioMime() } : undefined);
      var chunks = [], myStart = amStart;
      am.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      am.onstop = function () {
        if (!chunks.length) return;
        var n = aseq++;
        pending.push(uploadPart(recId, "audio", n, myStart, new Blob(chunks, { type: (am && am.mimeType) || "audio/webm" })).catch(function () {}));
      };
      am.start(1000);
    }
    startAudio();
    var audioTimer = setInterval(function () { if (am && am.state === "recording") { am.stop(); startAudio(); } }, st.audio_part_minutes * 60000);
    // Screenshots when the screen changes
    var vid = document.createElement("video");
    vid.muted = true;
    vid.srcObject = new MediaStream(display.getVideoTracks());
    vid.play().catch(function () {});
    var small = document.createElement("canvas"); small.width = 64; small.height = 36;
    var sg = small.getContext("2d", { willReadFrequently: true }), last = null, lastShot = -1e9;
    var frameTimer = setInterval(function () {
      if (stopped || pausedAt || !vid.videoWidth || frames >= st.max_frames) return;
      sg.drawImage(vid, 0, 0, 64, 36);
      var px = sg.getImageData(0, 0, 64, 36).data, diff = 0;
      if (last) { for (var i = 0; i < px.length; i += 4) diff += Math.abs(px[i] - last[i]) + Math.abs(px[i + 1] - last[i + 1]) + Math.abs(px[i + 2] - last[i + 2]); diff /= (px.length / 4) * 3; }
      var at = elapsed();
      if (last === null || diff > 6 || at - lastShot > 30000) {
        last = px;
        lastShot = at;
        frames++;
        var w = Math.min(1280, vid.videoWidth), hh = Math.round(vid.videoHeight * w / vid.videoWidth), big = document.createElement("canvas");
        big.width = w; big.height = hh;
        big.getContext("2d").drawImage(vid, 0, 0, w, hh);
        big.toBlob(function (b) {
          if (!b) return;
          pending.push(api.post("/files/start", { name: "Recording " + title.slice(0, 60) + " " + Math.round(at / 1000) + "s.jpg", size_bytes: b.size, ticked: true, request_id: newId() }).then(function (r) {
            if (!r.ok || r.duplicate) return;
            return fetch(r.upload_url, { method: "PUT", headers: { "content-type": "image/jpeg", "x-upsert": "false" }, body: b }).then(function () {
              return api.post("/recordings/frame", { id: recId, file_id: r.file_id, at_ms: at, reason: last === px ? "change" : "time" });
            }).then(function () { return api.post("/files/complete", { file_id: r.file_id }); });
          }).catch(function () {}));
        }, "image/jpeg", 0.8);
      }
    }, st.frame_seconds * 1000);

    // Controls on the page, and in a small always-on-top window where the browser allows it (Chrome and Edge)
    var timerEls = [], pauseBtns = [], warned = false, pip = null;
    function controls(doc) {
      var t = doc.createElement("b"); t.textContent = "0:00"; timerEls.push(t);
      var dot = doc.createElement("span"); dot.textContent = "● Recording"; dot.style.cssText = "color:#d23b62;font-weight:800";
      var pb = doc.createElement("button"); pb.textContent = "Pause"; pauseBtns.push(pb);
      pb.onclick = togglePause;
      var sb = doc.createElement("button"); sb.textContent = "Stop and save"; sb.onclick = finish;
      [pb, sb].forEach(function (b) { b.style.cssText = "font:inherit;font-weight:700;border-radius:999px;border:1.5px solid #8b2146;background:#8b2146;color:#fff;padding:8px 16px;cursor:pointer"; });
      pb.style.background = "#fff"; pb.style.color = "#8b2146";
      var wrap = doc.createElement("div"); wrap.style.cssText = "display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-family:Inter,Arial,sans-serif;padding:8px";
      [dot, t, pb, sb].forEach(function (x) { wrap.appendChild(x); });
      return wrap;
    }
    var bar = h("div", { class: "card", style: "position:sticky;top:64px;z-index:4;border:2px solid #d23b62" });
    bar.appendChild(controls(document));
    var warnEl = h("p", { class: "notice", style: "display:none", text: "2 minutes left. DELA stops and saves at " + st.max_minutes + " minutes." });
    D.clear(libEl);
    libEl.appendChild(h("h1", { text: "Recording: " + title }));
    libEl.appendChild(bar);
    libEl.appendChild(warnEl);
    libEl.appendChild(h("p", { class: "muted", text: "Do the task now in any program. You can leave this tab. " + (window.documentPictureInPicture ? "A small control window stays on top of your other programs." : "Use your browser's Stop sharing bar, or come back here, to stop.") }));
    if (window.documentPictureInPicture) {
      window.documentPictureInPicture.requestWindow({ width: 360, height: 70 }).then(function (w) { pip = w; w.document.body.style.margin = "0"; w.document.body.appendChild(controls(w.document)); }).catch(function () {});
    }
    function togglePause() {
      if (pausedAt) { pausedFor += Date.now() - pausedAt; pausedAt = 0; mr.resume(); if (am && am.state === "paused") am.resume(); }
      else { pausedAt = Date.now(); mr.pause(); if (am && am.state === "recording") am.pause(); }
      pauseBtns.forEach(function (b) { b.textContent = pausedAt ? "Resume" : "Pause"; });
    }
    var clock = setInterval(function () {
      var s = Math.floor(elapsed() / 1000);
      timerEls.forEach(function (t) { t.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") + (pausedAt ? " (paused)" : ""); });
      if (!warned && s >= st.max_minutes * 60 - 120) { warned = true; warnEl.style.display = "block"; }
      if (s >= st.max_minutes * 60) finish();
    }, 500);
    // The browser's own Stop sharing button counts as Stop and save
    display.getVideoTracks()[0].addEventListener("ended", finish);
    localStorageSet("dela.rec." + recId, JSON.stringify({ title: title }));

    function finish() {
      if (stopped) return;
      stopped = true;
      clearInterval(clock); clearInterval(frameTimer); clearInterval(audioTimer);
      var seconds = Math.round(elapsed() / 1000);
      var done = new Promise(function (ok) { mr.onstop = ok; });
      var adone = am && am.state !== "inactive" ? new Promise(function (ok) { var prev = am.onstop; am.onstop = function () { prev.call(am); ok(); }; }) : Promise.resolve();
      if (mr.state !== "inactive") mr.stop();
      if (am && am.state !== "inactive") am.stop();
      display.getTracks().forEach(function (t) { t.stop(); });
      if (mic) mic.getTracks().forEach(function (t) { t.stop(); });
      if (pip) try { pip.close(); } catch (e) { /* already closed */ }
      processingCard(recId, "uploading");
      Promise.all([done, adone]).then(function () {
        return new Promise(function (ok) { setTimeout(ok, 300); });
      }).then(function () {
        localStorageSet("dela.rec." + recId, JSON.stringify({ title: title, seconds: seconds, video: seq, audio: aseq }));
        return Promise.all(pending);
      }).then(function () {
        return api.post("/recordings/finish", { id: recId, duration_seconds: seconds, video_parts: seq, audio_parts: aseq });
      }).then(function (r) {
        if (r.ok) { processingCard(recId, "analyzing"); return; }
        if (r.reason === "parts_missing") { processingCard(recId, "missing"); return; }
        processingCard(recId, "problem", failText(r));
      }).catch(function (e) { processingCard(recId, "problem", e && e.reason ? failText(e) : "The upload did not finish. Open Library and click Finish upload."); });
    }
  }

  // 4.3 Processing
  function processingCard(recId, state, msg) {
    var pills = [["uploading", "Uploading", "held"], ["analyzing", "Analyzing", ""], ["ready", "Ready for review", "ready"]];
    D.clear(libEl);
    libEl.appendChild(h("h1", { text: "Saving your recording" }));
    libEl.appendChild(h("div", { class: "card" },
      h("div", { class: "row" }, pills.map(function (p) { return h("span", { class: "badge " + (state === p[0] ? p[2] || "C" : ""), style: state === p[0] ? "" : "opacity:.5", text: p[1] }); })),
      state === "problem" || state === "missing" ? h("p", { class: "problem", text: msg || "Some pieces did not upload. Open Library and click Finish upload." }) : null,
      h("p", { style: "margin-top:10px", text: "You can leave this page. We'll email you when your recording is ready to review." }),
      h("button", { class: "ghost", onclick: drawLibrary }, "Back to the library")));
  }

  // Upload a recording made elsewhere (Loom, the computer's own recorder): played once in the background, silently,
  // to take screenshots and the speech, then it goes through the same steps
  function uploadRecording(file, title, st, status) {
    if (!/\.(mp4|webm|mov)$/i.test(file.name)) { D.toast(app, "Upload an MP4, MOV or WebM file.", true); return; }
    var v = document.createElement("video");
    v.preload = "auto";
    v.src = URL.createObjectURL(file);
    v.onerror = function () { status.textContent = "This browser cannot open that video. Try an MP4 or WebM file, or open DELA in Chrome."; };
    v.onloadedmetadata = function () {
      if (v.duration > st.max_minutes * 60 + 5) { status.textContent = "That recording is longer than your plan's " + st.max_minutes + " minutes."; return; }
      if (!v.captureStream && !v.mozCaptureStream) { status.textContent = "Uploading a recording needs Chrome, Edge or Firefox on a computer."; return; }
      api.post("/recordings/start", { title: title || file.name.replace(/\.[^.]+$/, ""), request_id: newId(), browser: browserName(), mime: file.type, source: "upload", consent: true }).then(function (r) {
        if (!r.ok) throw r;
        status.textContent = "Reading your recording. This takes about half its length. Keep this tab open.";
        // The sound goes to DELA, not to your speakers
        var AC = window.AudioContext || window.webkitAudioContext, ac = new AC(), src = ac.createMediaElementSource(v), dest = ac.createMediaStreamDestination();
        src.connect(dest);
        v.playbackRate = 2;
        var cap = v.captureStream ? v.captureStream() : v.mozCaptureStream();
        var vt = cap.getVideoTracks();
        var fake = { getVideoTracks: function () { return vt; }, getTracks: function () { return vt; } };
        var micLike = dest.stream;
        v.play().then(function () {
          var s2 = Object.assign({}, r.settings, { max_minutes: Math.ceil(v.duration / 60 / 2) + 1 });
          runRecorder(r.id, title || file.name, { getVideoTracks: function () { return vt.length ? vt : []; }, getTracks: function () { return vt.concat(micLike.getTracks()); } }, micLike, s2);
          v.onended = function () { vt.forEach(function (t) { t.stop(); t.dispatchEvent(new Event("ended")); }); };
        });
        void fake;
      }).catch(pbFail);
    };
  }

  // On the review screen of a recording: the transcript (edit, mark private, jump) and more screenshots to choose from
  function recorderPanel(container) {
    api.get("/recordings/for-import?id=" + imp.id).then(function (r) {
      var rec = r.recording;
      if (!rec) return;
      var lines = rec.transcript;
      var card = h("div", { class: "card" }, h("h2", { text: "What you said" }),
        h("p", { class: "small muted", text: "Fix names or terms. Lines marked private, and screenshots taken while you said them, never go to the AI." }));
      lines.forEach(function (l) {
        var t = h("input", { style: "width:100%", value: l.text, "aria-label": "Transcript at " + mmssJs(l.start_ms) });
        var pv = h("input", { type: "checkbox", checked: l.private });
        function save() { l.text = t.value; l.private = pv.checked; api.post("/recordings/transcript", { id: rec.id, lines: [{ seq: l.seq, text: l.text, private: l.private }] }).catch(pbFail); }
        t.addEventListener("change", save);
        pv.addEventListener("change", save);
        card.appendChild(h("div", { class: "row", style: "margin:4px 0;flex-wrap:nowrap" }, h("span", { class: "small muted", style: "min-width:44px", text: mmssJs(l.start_ms) }), t,
          h("label", { class: "small", style: "display:flex;gap:4px;align-items:center;margin:0;white-space:nowrap" }, pv, "Mark as private")));
      });
      if (!lines.length) card.appendChild(h("p", { class: "muted", text: "No speech was found in this recording." }));
      container.appendChild(card);
    }).catch(function () {});
  }
  function mmssJs(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  // "You may want to add these": more screenshots near a step, unchecked until chosen
  function extraShots(st, holder) {
    if (!st.extra || !st.extra.length) return null;
    var row = h("div", { class: "row" });
    st.extra.forEach(function (fid) {
      var img = h("img", { alt: "Another screenshot", style: "width:120px;border:1px solid var(--line);border-radius:8px;cursor:pointer" });
      api.post("/files/open", { file_id: fid }).then(function (r) { if (r.ok) img.src = r.url; }).catch(function () {});
      img.addEventListener("click", function () {
        if (!confirm("Use this screenshot for this step instead?")) return;
        st.extra = st.extra.filter(function (x) { return x !== fid; }).concat(st.file_id ? [st.file_id] : []);
        st.file_id = fid;
        st.keep_image = true;
        saveImport().then(drawImport).catch(pbFail);
      });
      row.appendChild(img);
    });
    return h("div", null, h("div", { class: "small", style: "margin-top:6px;font-weight:700", text: "You may want to add these (click one to use it)" }), row);
  }


  // ---------- Step 4: Flex Gigs (attorney Projects and Talent, freelancer Work) ----------
  var gigs = { id: null, view: "details", pendingInvite: null, newFrom: null };
  try { var gq = new URLSearchParams(location.search).get("gig"); if (gq && /^[0-9a-f-]{36}$/.test(gq)) gigs.id = gq; } catch (e) { /* no deep link */ }
  var GIG_STATUS = { draft: "Draft", open: "Open", paused: "Paused by the Lawfecta Team", closed: "Closed", filled: "Filled", canceled: "Canceled" };
  var PROP_STATUS = { draft: "Draft", sent: "Sent", held: "Being checked", withdrawn: "Withdrawn", selected: "Chosen", not_selected: "Not chosen", closed: "Closed" };
  var GIG_ERR = {
    gigs_off: "Flex Gigs are not open for your account yet.", playbook_not_approved: "Only an approved playbook can become a gig. Approve it in the Library first.",
    not_verified: "Posting work and hiring need a verified license. Open Profile and verification from your account menu.",
    gig_needs_task: "Describe the task in the public version first.", deadline_past: "The deadline is in the past. Choose a later date.",
    gig_closed: "This gig is closed.", gig_not_open: "This gig is not open for that now.", no_more_extensions: "This gig was already extended once.",
    freelancer_not_available: "This freelancer is not available for this gig right now.", proposal_needs_price: "Enter your total price.",
    proposal_needs_included: "Say what your price includes.", proposal_needs_schedule: "Say when you would deliver, or how many days you need.",
    too_many_proposals: "You have sent a lot of proposals in a short time. Try again later.", proposal_withdrawn: "You withdrew your proposal for this gig.",
    already_sent: "This proposal was already sent.", proposal_not_available: "This proposal can no longer be chosen.", talent_off: "Talent search is not open for your account yet.",
    changed_elsewhere: "Someone saved this gig while you were working. Reload it, then make your change again.", budget_too_high: "That budget is higher than DELA accepts.",
    needs_reconfirm: "The freelancer needs to confirm this proposal first, because the gig changed a lot or the proposal is older than its actionable days. Click \"Ask to confirm\".",
  };
  function gigErr(r) {
    if (!r) return "That did not work.";
    if (r.reason === "budget_too_low") return "The smallest gig budget is " + D.money(r.min_cents) + ".";
    if (r.reason === "limit_reached" && r.allowance) return "You have no proposals left this month. Your allowance resets on " + D.date(r.allowance.resets_on) + ". Matches stay visible.";
    if (r.reason === "limit_reached") return "Your plan's limit is reached" + (r.limit !== undefined ? " (" + r.limit + ")" : "") + ".";
    if (r.reason === "freelancer_not_available" && r.why === "excludes_state") return "This freelancer does not work for this gig's state.";
    return GIG_ERR[r.reason] || failText(r);
  }
  function gigOk(r) { if (!r || r.ok === false) throw r || {}; return r; }
  function gigFail(e) { D.toast(app, e && e.reason ? gigErr(e) : D.errorText(e && e.message ? e.message : String(e)), true); }
  function budgetText(g) { return D.money(g.budget_min_cents) + " to " + D.money(g.budget_max_cents); }
  function closesText(g) { return g.status === "open" && g.closes_at ? "Closes " + D.dateTime(g.closes_at) : g.closed_at ? GIG_STATUS[g.status] + " " + D.date(g.closed_at) : GIG_STATUS[g.status] || g.status; }
  function dollars(c) { return c === null || c === undefined ? "" : String(c / 100); }
  function lines(t) { return String(t || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }
  function commas(t) { return String(t || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); }
  function gigLink(id, t) { gigs.id = id; gigs.view = "details"; tab = t; draw(); }

  // The public version a freelancer reads before applying
  function publicBlock(g) {
    var p = g.public || {};
    return h("div", null,
      p.task ? h("p", { text: p.task }) : null,
      h("div", { class: "kv" },
        h("div", null, "Budget", h("b", { text: budgetText(g) })),
        g.deadline ? h("div", null, "Deadline", h("b", { text: D.date(g.deadline) })) : null,
        p.practice_area ? h("div", null, "Practice area", h("b", { text: p.practice_area })) : null,
        p.state ? h("div", null, "State", h("b", { text: p.state })) : null,
        p.timing ? h("div", null, "Usual time", h("b", { text: p.timing })) : null,
        h("div", null, "Status", h("b", { text: closesText(g) }))),
      p.outcome ? h("p", null, h("b", { text: "What done looks like: " }), p.outcome) : null,
      (p.steps || []).length ? h("div", null, h("h3", { text: "Steps" }), h("ol", null, p.steps.map(function (s) { return h("li", { text: s }); }))) : null,
      (p.tools || []).length ? h("p", null, h("b", { text: "Tools: " }), p.tools.join(", ")) : null,
      (p.skills || []).length ? h("p", null, h("b", { text: "Skills: " }), p.skills.join(", ")) : null);
  }

  // ---------- Attorney: Projects ----------
  function projectsView() {
    var el = h("div", null, h("h1", { text: "Projects" }), h("p", { class: "muted", text: "Loading..." }));
    if (gigs.id) { gigPage(el); return el; }
    api.get("/gigs").then(function (r) {
      D.clear(el);
      el.appendChild(h("h1", { text: "Projects" }));
      if (!r.ok) { el.appendChild(h("p", { class: "notice", text: gigErr(r) })); return; }
      var e = r.eligibility || {}, al = r.allowance || {};
      el.appendChild(h("p", { class: "muted", text: "Post approved work as a Flex Gig. DELA finds freelancers who fit, you compare proposals side by side, and you choose one. Signing and funding come next." }));
      if (!e.can_post) el.appendChild(h("p", { class: "notice", text: "Posting work and hiring need a verified license. You can still draft gigs. Open Profile and verification from your account menu." }));
      if (gigs.pendingInvite) el.appendChild(h("p", { class: "notice", text: "Post a gig, then invite " + gigs.pendingInvite.name + " from its Matches view or from Talent." }));
      // New gig
      var pick = h("select", { "aria-label": "Approved playbook" }, [h("option", { value: "", text: r.playbooks.length ? "Choose an approved playbook" : "No approved playbooks yet" })].concat(r.playbooks.map(function (p) {
        return h("option", { value: p.id, text: p.title, selected: gigs.newFrom === p.id });
      })));
      var notes = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Anything freelancers should know (optional)", placeholder: "Anything freelancers should know (optional). No client information." });
      var bmin = h("input", { type: "number", min: "0", step: "1", "aria-label": "Budget from ($)", placeholder: String((r.min_budget_cents || 0) / 100) });
      var bmax = h("input", { type: "number", min: "0", step: "1", "aria-label": "Budget to ($)" });
      var go = h("button", { class: "blue", type: "button" }, "Draft the gig with DELA");
      var req = newId();
      go.addEventListener("click", function () {
        if (!pick.value) { D.toast(app, "Choose an approved playbook first.", true); return; }
        go.disabled = true; go.textContent = "DELA is writing the public version...";
        api.post("/gigs/draft", { playbook_id: pick.value, request_id: req, notes: notes.value, budget_min: bmin.value, budget_max: bmax.value }).then(gigOk).then(function (x) {
          gigs.newFrom = null; gigLink(x.id, "projects");
        }).catch(function (x) { go.disabled = false; go.textContent = "Draft the gig with DELA"; gigFail(x); });
      });
      el.appendChild(h("div", { class: "card" }, h("h2", { text: "Post a new gig" }),
        h("p", { class: "small muted", text: "DELA writes a public version of the playbook for freelancers. You check it, set the budget (at least " + D.money(r.min_budget_cents) + ") and the deadline, then post. Open gigs on your plan: " + (al.unlimited ? "no cap" : (al.used || 0) + " of " + al.limit + " in use") + "." }),
        field("Playbook", pick), notes, h("div", { class: "row" }, field("Budget from ($)", bmin), field("Budget to ($)", bmax)), h("div", { class: "row" }, go)));
      // My gigs
      var list = h("div", { class: "card" }, h("h2", { text: "Your gigs" }));
      if (!r.gigs.length) list.appendChild(h("p", { class: "muted", text: "No gigs yet." }));
      r.gigs.forEach(function (g) {
        list.appendChild(h("div", { class: "work", style: "cursor:pointer", role: "button", tabindex: "0", onclick: function () { gigLink(g.id, "projects"); } },
          h("span", { class: "chip", text: g.proposals ? String(g.proposals) : "0" }),
          h("div", null, h("h3", { text: g.title }), h("div", { class: "muted small", text: budgetText(g) + " | " + closesText(g) + " | " + g.proposals + (g.proposals === 1 ? " proposal" : " proposals") + (g.questions_open ? " | " + g.questions_open + " questions to answer" : "") })),
          h("span", { class: "grow" }), h("span", { class: "badge " + (g.status === "open" ? "ready" : g.status === "paused" ? "held" : "C"), text: GIG_STATUS[g.status] })));
      });
      el.appendChild(list);
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    return el;
  }

  function gigPage(el) {
    api.get("/gigs/get?id=" + gigs.id).then(function (r) {
      D.clear(el);
      el.appendChild(h("div", { class: "row" }, h("button", { class: "ghost small", onclick: function () { gigs.id = null; draw(); } }, "← All gigs")));
      if (!r.ok) { el.appendChild(h("p", { class: "notice", text: gigErr(r) })); return; }
      var g = r.gig;
      el.appendChild(h("div", { class: "row" }, h("h1", { class: "grow", text: g.title }), h("span", { class: "badge " + (g.status === "open" ? "ready" : "C"), text: GIG_STATUS[g.status] })));
      el.appendChild(h("p", { class: "muted", text: budgetText(g) + " | " + closesText(g) + (r.counts ? " | " + r.counts.proposals + " proposals, " + r.counts.invited + " invited" : "") }));
      if (g.paused_by_team) el.appendChild(h("p", { class: "notice bad", text: "The Lawfecta Team paused this gig while they check it. Freelancers cannot send proposals until it opens again." }));
      var views = [["details", "Details"], ["matches", "Matches"], ["questions", "Questions" + (r.counts && r.counts.questions_open ? " (" + r.counts.questions_open + ")" : "")], ["proposals", "Proposals" + (r.counts ? " (" + r.counts.proposals + ")" : "")], ["files", "Files (" + r.files.length + ")"]];
      el.appendChild(h("div", { class: "pills", role: "tablist", "aria-label": "Gig views" }, views.map(function (v) {
        return h("button", { role: "tab", "aria-selected": String(gigs.view === v[0]), "aria-pressed": String(gigs.view === v[0]), onclick: function () { gigs.view = v[0]; draw(); } }, v[1]);
      })));
      var body = h("div");
      el.appendChild(body);
      ({ details: gigDetails, matches: gigMatches, questions: gigQuestions, proposals: gigProposals, files: gigFiles })[gigs.view](body, r);
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  function gigDetails(body, r) {
    var g = r.gig, p = g.public || {}, editable = g.status === "draft" || g.status === "open";
    var f = {
      title: h("input", { "aria-label": "Gig title", style: "width:100%" }), task: h("textarea", { rows: 3, style: "width:100%", "aria-label": "The task" }),
      outcome: h("textarea", { rows: 2, style: "width:100%", "aria-label": "What done looks like" }), steps: h("textarea", { rows: 6, style: "width:100%", "aria-label": "Steps, one per line" }),
      tools: h("input", { style: "width:100%", "aria-label": "Tools, separated by commas" }), skills: h("input", { style: "width:100%", "aria-label": "Skills, separated by commas" }),
      timing: h("input", { style: "width:100%", "aria-label": "Usual time" }), state: h("input", { maxlength: "2", "aria-label": "State (two letters)", placeholder: "TX" }),
      area: h("input", { style: "width:100%", "aria-label": "Practice area" }),
      bmin: h("input", { type: "number", min: "0", step: "1", "aria-label": "Budget from ($)" }), bmax: h("input", { type: "number", min: "0", step: "1", "aria-label": "Budget to ($)" }),
      deadline: h("input", { type: "date", "aria-label": "Deadline" }), miles: h("textarea", { rows: 3, style: "width:100%", "aria-label": "Milestones, one per line" }),
    };
    f.title.value = g.title; f.task.value = p.task || ""; f.outcome.value = p.outcome || ""; f.steps.value = (p.steps || []).join("\n"); f.tools.value = (p.tools || []).join(", ");
    f.skills.value = (p.skills || []).join(", "); f.timing.value = p.timing || ""; f.state.value = p.state || ""; f.area.value = p.practice_area || "";
    f.bmin.value = dollars(g.budget_min_cents); f.bmax.value = dollars(g.budget_max_cents); f.deadline.value = g.deadline || "";
    f.miles.value = (g.milestones || []).map(function (m) { return m.title; }).join("\n");
    Object.keys(f).forEach(function (k) { f[k].disabled = !editable; });
    function payload() {
      return { id: g.id, version: g.version, budget_min: f.bmin.value, budget_max: f.bmax.value, deadline: f.deadline.value,
        public: { title: f.title.value, task: f.task.value, outcome: f.outcome.value, steps: lines(f.steps.value), tools: commas(f.tools.value), skills: commas(f.skills.value), timing: f.timing.value, state: f.state.value, practice_area: f.area.value },
        milestones: lines(f.miles.value).map(function (t) { return { title: t }; }) };
    }
    function save(then) {
      return api.post("/gigs/save", payload()).then(function (x) {
        if (x.reason === "looks_like_client_info") { if (confirm("This may include client information (" + kindsText(x.kinds) + "). Use placeholders instead. Click OK only if it is not client information.")) return api.post("/gigs/save", Object.assign(payload(), { confirm_no_client_info: true })).then(gigOk); throw { reason: "canceled" }; }
        return gigOk(x);
      }).then(function (x) { if (then) return then(); draw(); D.toast(app, x.big_change ? "Saved. This was a big change, so applicants are asked to confirm their proposals." : "Saved"); }).catch(function (e) { if (e && e.reason !== "canceled") gigFail(e); });
    }
    body.appendChild(h("div", { class: "card" }, h("h2", { text: "Public version" }),
      h("p", { class: "small muted", text: "Matched freelancers read this before they spend a proposal. Invited and hired freelancers also see the full playbook, with their name as a watermark. No client information." + (g.status === "open" ? " Changing the budget or the work tells applicants; a big change asks them to confirm their proposals." : "") }),
      field("Title", f.title), field("The task", f.task, "Two or three sentences: what the freelancer will do."), field("What done looks like", f.outcome), field("Steps, one per line", f.steps),
      field("Tools", f.tools, "Separated by commas. DELA matches freelancers who use them."), field("Skills", f.skills, "Separated by commas."),
      h("div", { class: "row" }, field("Practice area", f.area), field("State", f.state), field("Usual time", f.timing))));
    body.appendChild(h("div", { class: "card" }, h("h2", { text: "Budget, deadline and milestones" }),
      h("div", { class: "row" }, field("Budget from ($)", f.bmin), field("Budget to ($)", f.bmax), field("Deadline", f.deadline)),
      field("Milestones (private)", f.miles, "For example: Draft, then Final. Freelancers see milestones only after you hire them; DELA sets the final milestones with the agreement.")));
    var acts = h("div", { class: "row" });
    if (editable) acts.appendChild(h("button", { class: "ghost", type: "button", onclick: function () { save(); } }, "Save"));
    if (g.status === "draft") acts.appendChild(h("button", { class: "blue", type: "button", onclick: function () {
      save(function () { return api.post("/gigs/publish", { id: g.id }).then(gigOk).then(function (x) { gigs.view = "matches"; draw(); D.toast(app, "Your gig is open until " + D.dateTime(x.closes_at)); }).catch(gigFail); });
    } }, "Post the gig"));
    if (g.status === "open" && g.extensions < g.max_extensions) acts.appendChild(h("button", { class: "ghost", type: "button", onclick: function () {
      if (!confirm("Keep this gig open for 14 more days? You can extend it once.")) return;
      api.post("/gigs/extend", { id: g.id }).then(gigOk).then(function (x) { draw(); D.toast(app, "Open until " + D.dateTime(x.closes_at)); }).catch(gigFail);
    } }, "Extend 14 days"));
    if (g.status === "open" || g.status === "draft") acts.appendChild(h("button", { class: "danger", type: "button", onclick: function () {
      if (!confirm(g.status === "draft" ? "Delete this draft gig?" : "Close this gig now? Applicants are told, and you can still choose a proposal for 7 days.")) return;
      api.post("/gigs/close", { id: g.id, cancel: g.status === "draft" }).then(gigOk).then(function () { gigs.id = g.status === "draft" ? null : g.id; draw(); D.toast(app, "Closed"); }).catch(gigFail);
    } }, g.status === "draft" ? "Delete draft" : "Close the gig"));
    body.appendChild(acts);
    if (r.playbook) body.appendChild(h("details", { class: "card" }, h("summary", { style: "cursor:pointer;font-weight:700", text: "The full playbook (invited and hired freelancers see this)" }), playbookPlain(r.playbook)));
  }

  function playbookPlain(b) {
    return h("div", null, b.outcome ? h("p", null, h("b", { text: "Outcome: " }), b.outcome) : null,
      h("ol", null, (b.steps || []).map(function (s) { return h("li", { text: s.text + (s.who ? " (" + s.who + ")" : "") + (s.tool ? " | " + s.tool : "") }); })),
      (b.checks || []).length ? h("p", null, h("b", { text: "Quality checks: " }), b.checks.join("; ")) : null,
      (b.review_points || []).length ? h("p", null, h("b", { text: "Attorney review: " }), b.review_points.join("; ")) : null,
      b.deliverables ? h("p", null, h("b", { text: "Deliverables: " }), b.deliverables) : null);
  }

  function gigMatches(body, r) {
    var g = r.gig;
    if (g.status === "draft") { body.appendChild(h("p", { class: "notice", text: "Post the gig first. DELA then finds freelancers who fit." })); return; }
    var box = h("div", { class: "card" }, h("p", { class: "muted", text: "Loading matches..." }));
    body.appendChild(box);
    api.get("/gigs/matches?id=" + g.id + "&refresh=1").then(function (x) {
      D.clear(box);
      box.appendChild(h("h2", { text: "Freelancers who fit" }));
      box.appendChild(h("p", { class: "small muted", text: "Only match-ready freelancers who confirmed their availability in the last 14 days, work in this practice area and do not exclude this state. DELA shows fewer people rather than inactive ones. Inviting someone lets them see the full playbook and send a proposal that does not use their monthly allowance." }));
      if (!x.ok) { box.appendChild(h("p", { class: "notice", text: gigErr(x) })); return; }
      if (!x.matches.length) box.appendChild(h("p", { class: "muted", text: "No one fits yet. Check back soon, widen the practice area or tools, or search in Talent." }));
      x.matches.forEach(function (m) {
        var msg = h("input", { style: "width:100%", "aria-label": "Message to " + m.name + " (optional)", placeholder: "A short note (optional). Keep everything on Lawfecta." });
        var btn = h("button", { class: "blue small", type: "button", disabled: m.invited || g.status !== "open" }, m.invited ? "Invited" : "Invite");
        btn.addEventListener("click", function () {
          btn.disabled = true;
          api.post("/gigs/invite", { gig_id: g.id, person_id: m.person_id, message: msg.value }).then(gigOk).then(function (y) { D.toast(app, y.held ? y.note : "Invited " + m.name); btn.textContent = "Invited"; }).catch(function (e) { btn.disabled = false; gigFail(e); });
        });
        box.appendChild(h("div", { class: "card", style: "margin:8px 0" }, h("div", { class: "row" }, h("b", { class: "grow", text: m.name }), h("span", { class: "badge " + (m.fit === "Good fit" ? "ready" : "C"), text: m.fit }), m.applied ? h("span", { class: "badge C", text: "Sent a proposal" }) : null),
          m.headline ? h("div", { class: "small", text: m.headline }) : null, h("div", { class: "small muted", text: (m.reasons || []).join(" | ") }), m.invited ? null : msg,
          h("div", { class: "row", style: "margin-top:6px" }, btn, (m.invited || m.applied) && (me.switches || {}).gig_chat ? h("button", { class: "ghost small", type: "button", onclick: function () { openThread(g.id, m.person_id); } }, "Message") : null)));
      });
    }).catch(function (e) { D.clear(box); box.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  function gigQuestions(body, r) {
    var box = h("div", { class: "card" }, h("h2", { text: "Questions" }), h("p", { class: "small muted", text: "Your answers are shown to every applicant. No client information." }));
    if (!r.questions.length) box.appendChild(h("p", { class: "muted", text: "No questions yet." }));
    r.questions.forEach(function (q) {
      var row = h("div", { class: "card", style: "margin:8px 0" }, h("p", { style: "margin:0 0 6px", text: "Q: " + q.question }));
      if (q.status === "answered") row.appendChild(h("p", { class: "small", text: "Answered: " + q.answer }));
      else if (q.status === "held") row.appendChild(h("p", { class: "small muted", text: "Your answer is being checked by the Lawfecta Team." }));
      else {
        var a = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Your answer" });
        row.appendChild(a);
        row.appendChild(h("button", { class: "blue small", type: "button", onclick: function () {
          api.post("/gigs/questions/answer", { id: q.id, gig_id: r.gig.id, answer: a.value }).then(gigOk).then(function (x) { draw(); D.toast(app, x.held ? "Held for a check: keep everything on Lawfecta" : "Answered for every applicant"); }).catch(gigFail);
        } }, "Answer for everyone"));
      }
      box.appendChild(row);
    });
    body.appendChild(box);
  }

  function gigProposals(body, r) {
    var box = h("div", { class: "card" }, h("p", { class: "muted", text: "Loading proposals..." }));
    body.appendChild(box);
    api.get("/gigs/proposals?id=" + r.gig.id).then(function (x) {
      D.clear(box);
      box.appendChild(h("h2", { text: "Compare proposals" }));
      if (!x.ok) { box.appendChild(h("p", { class: "notice", text: gigErr(x) })); return; }
      box.appendChild(h("p", { class: "small muted", text: "Budget " + D.money(x.budget_min_cents) + " to " + D.money(x.budget_max_cents) + ". Prices outside the range are labeled, never hidden. Check what each price includes, so cheap and complete are not confused." + (x.actionable_until ? " You can choose a proposal until " + D.dateTime(x.actionable_until) + "; after that the freelancer confirms first." : "") }));
      if (!x.proposals.length) { box.appendChild(h("p", { class: "muted", text: "No proposals yet." })); return; }
      var labels = { within: ["ready", "Within the budget"], below: ["C", "Below the budget"], above: ["held", "Above the budget"] };
      box.appendChild(h("div", { class: "scroll" }, h("table", { class: "stack" },
        h("thead", null, h("tr", null, ["Freelancer", "Price", "Includes", "Leaves out", "Schedule", "Qualifications", ""].map(function (t) { return h("th", { text: t }); }))),
        h("tbody", null, x.proposals.map(function (p) {
          var lab = labels[p.price_label];
          var act = h("div", { class: "row" });
          if (p.status === "selected") act.appendChild(h("span", { class: "badge ready", text: "Chosen" }));
          else if (p.status === "sent" && p.needs_reconfirm && !p.reconfirmed_at) act.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/proposals/ask-reconfirm", { id: p.id }).then(gigOk).then(function () { D.toast(app, "Asked " + p.name + " to confirm"); }).catch(gigFail);
          } }, "Ask to confirm"));
          else if (p.status === "sent") act.appendChild(h("button", { class: "blue small", type: "button", onclick: function () {
            if (!confirm("Choose " + p.name + "'s proposal (" + D.money(p.price_cents) + ")? DELA starts a draft agreement, closes the gig and tells the others politely.")) return;
            api.post("/proposals/select", { id: p.id }).then(gigOk).then(function () { draw(); D.toast(app, "Chosen. The draft agreement is waiting for signing and funding."); }).catch(gigFail);
          } }, "Choose"));
          else act.appendChild(h("span", { class: "badge C", text: PROP_STATUS[p.status] }));
          if ((me.switches || {}).gig_chat) act.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { openThread(r.gig.id, p.person_id); } }, "Message"));
          return h("tr", null,
            h("td", { "data-label": "Freelancer" }, h("b", { text: p.name }), p.invited ? h("div", { class: "small muted", text: "Invited" }) : null, p.headline ? h("div", { class: "small", text: p.headline }) : null, (p.match_reasons || []).length ? h("div", { class: "small muted", text: p.match_reasons.join(" | ") }) : null),
            h("td", { "data-label": "Price" }, h("b", { text: D.money(p.price_cents) }), h("div", null, h("span", { class: "badge " + lab[0], text: lab[1] }))),
            h("td", { "data-label": "Includes", text: p.included }), h("td", { "data-label": "Leaves out", text: p.excluded || "Nothing stated" }),
            h("td", { "data-label": "Schedule", text: p.schedule + (p.days_to_deliver ? " (" + p.days_to_deliver + " days)" : "") }),
            h("td", { "data-label": "Qualifications" }, p.qualifications, p.message ? h("div", { class: "small muted", text: "Note: " + p.message }) : null), h("td", null, act));
        })))));
    }).catch(function (e) { D.clear(box); box.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  function gigFiles(body, r) {
    var g = r.gig;
    var box = h("div", { class: "card" }, h("h2", { text: "Files for this gig" }),
      h("p", { class: "small muted", text: "Read only, for this gig only. Invited freelancers can open them while the gig is open, and the freelancer you hire keeps access. Every download is logged. Access ends if the gig closes without a hire." }));
    r.files.forEach(function (f) {
      box.appendChild(h("div", { class: "row" }, h("span", { class: "grow", text: f.name }),
        h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/gigs/files", { gig_id: g.id, file_id: f.file_id, share: false }).then(gigOk).then(function () { draw(); D.toast(app, "No longer shared"); }).catch(gigFail); } }, "Stop sharing")));
    });
    if ((me.switches || {}).file_uploads) {
      var pickWrap = h("div");
      box.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
        api.get("/files").then(function (x) {
          D.clear(pickWrap);
          var shared = r.files.map(function (f) { return f.file_id; });
          var ready = (x.files || []).filter(function (f) { return f.status === "ready" && shared.indexOf(f.id) < 0; });
          if (!ready.length) { pickWrap.appendChild(h("p", { class: "small muted", text: "No other ready files. Upload on the Files tab first." })); return; }
          ready.forEach(function (f) {
            pickWrap.appendChild(h("div", { class: "row" }, h("span", { class: "grow", text: f.name }), h("button", { class: "blue small", type: "button", onclick: function () {
              api.post("/gigs/files", { gig_id: g.id, file_id: f.id, share: true }).then(gigOk).then(function () { draw(); D.toast(app, "Shared with this gig"); }).catch(gigFail);
            } }, "Share")));
          });
        }).catch(err);
      } }, "Share a file from Files"));
      box.appendChild(pickWrap);
    }
    body.appendChild(box);
  }

  // ---------- Attorney: Talent ----------
  var talentQ = { practice_area: "", skill: "", tool: "", state: "" };
  function talentView() {
    var el = h("div", null, h("h1", { text: "Talent" }), h("p", { class: "muted", text: "Match-ready freelancers: verified, profile complete and availability confirmed in the last 14 days. Every conversation happens on a gig, so inviting someone needs a gig." }));
    var inputs = {};
    [["practice_area", "Practice area"], ["skill", "Skill"], ["tool", "Tech tool"], ["state", "State you need (two letters)"]].forEach(function (x) {
      inputs[x[0]] = h("input", { "aria-label": x[1], placeholder: x[1], value: talentQ[x[0]] });
    });
    var results = h("div");
    function run() {
      Object.keys(inputs).forEach(function (k) { talentQ[k] = inputs[k].value.trim(); });
      D.clear(results); results.appendChild(h("p", { class: "muted", text: "Searching..." }));
      var qs = Object.keys(talentQ).filter(function (k) { return talentQ[k]; }).map(function (k) { return k + "=" + encodeURIComponent(talentQ[k]); }).join("&");
      Promise.all([api.get("/talent?" + qs), api.get("/gigs")]).then(function (rs) {
        var x = rs[0], mine = rs[1].ok ? rs[1].gigs.filter(function (g) { return g.status === "open"; }) : [];
        D.clear(results);
        if (!x.ok) { results.appendChild(h("p", { class: "notice", text: gigErr(x) })); return; }
        if (!x.people.length) results.appendChild(h("p", { class: "muted", text: "No match-ready freelancers fit this search yet." }));
        x.people.forEach(function (p) {
          var act = h("div", { class: "row", style: "margin-top:6px" });
          if (mine.length) {
            var sel = h("select", { "aria-label": "Gig to invite " + p.name + " to" }, mine.map(function (g) { return h("option", { value: g.id, text: g.title }); }));
            act.appendChild(sel);
            act.appendChild(h("button", { class: "blue small", type: "button", onclick: function () {
              api.post("/gigs/invite", { gig_id: sel.value, person_id: p.person_id }).then(gigOk).then(function (y) { D.toast(app, y.duplicate ? "Already invited" : "Invited " + p.name); }).catch(gigFail);
            } }, "Invite to this gig"));
          }
          act.appendChild(h("button", { class: mine.length ? "ghost small" : "blue small", type: "button", onclick: function () {
            gigs.pendingInvite = { person_id: p.person_id, name: p.name }; gigs.id = null; tab = "projects"; draw();
          } }, "Create a gig from a playbook"));
          results.appendChild(h("div", { class: "card", style: "margin:8px 0" }, h("b", { text: p.name }), p.headline ? h("div", { class: "small", text: p.headline }) : null,
            h("div", { class: "small muted", text: [(p.practice_areas || []).join(", "), (p.software || []).length ? "Uses " + p.software.slice(0, 5).join(", ") : "", p.capacity_hours_week ? p.capacity_hours_week + " hours a week" : "", p.timezone || ""].filter(Boolean).join(" | ") }),
            p.summary ? h("p", { class: "small", text: p.summary }) : null, act));
        });
      }).catch(function (e) { D.clear(results); results.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    }
    el.appendChild(h("div", { class: "card" }, h("div", { class: "row", style: "flex-wrap:wrap" }, inputs.practice_area, inputs.skill, inputs.tool, inputs.state, h("button", { class: "blue small", type: "button", onclick: run }, "Search"))));
    el.appendChild(results);
    run();
    return el;
  }

  // ---------- Freelancer: Work ----------
  function allowanceText(al) {
    if (!al) return "";
    if (al.unlimited) return "No monthly cap on proposals on your plan (spam limits still apply).";
    return (al.remaining || 0) + " of " + al.limit + " proposals left this month. Resets " + D.date(al.resets_on) + ". Invited proposals do not count.";
  }
  function workView() {
    var el = h("div", null, h("h1", { text: "Work" }), h("p", { class: "muted", text: "Loading..." }));
    if (gigs.id) { workGig(el); return el; }
    api.get("/work").then(function (r) {
      D.clear(el);
      el.appendChild(h("h1", { text: "Work" }));
      if (!r.ok || !r.on) { el.appendChild(h("p", { class: "notice", text: "Flex Gigs are not open for your account yet." })); return; }
      if (r.state && r.state.readiness !== "match_ready") el.appendChild(h("p", { class: "notice", text: "You are not match-ready yet, so attorneys cannot find you. Finish your Profile and confirm your availability." }));
      el.appendChild(h("p", { class: "notice ok", text: allowanceText(r.allowance) }));
      function section(title, list, empty, extra) {
        var c = h("div", { class: "card" }, h("h2", { text: title + " (" + list.length + ")" }));
        if (!list.length) c.appendChild(h("p", { class: "muted", text: empty }));
        list.forEach(function (g) {
          c.appendChild(h("div", { class: "work", style: "cursor:pointer", role: "button", tabindex: "0", onclick: function () { gigLink(g.id, "work"); } },
            h("div", null, h("h3", { text: g.title }), h("div", { class: "small", text: budgetText(g) + (g.deadline ? " | due " + D.date(g.deadline) : "") + (g.closes_at && g.status === "open" ? " | closes " + D.date(g.closes_at) : "") }),
              (g.reasons || []).length ? h("div", { class: "small muted", text: "Why it fits: " + g.reasons.join(" | ") }) : null,
              g.message ? h("div", { class: "small muted", text: "Invitation: " + g.message }) : null, extra ? extra(g) : null),
            h("span", { class: "grow" }), g.proposal_status ? h("span", { class: "badge " + (g.proposal_status === "selected" ? "ready" : "C"), text: PROP_STATUS[g.proposal_status] + (g.needs_reconfirm ? ": please confirm" : "") }) : null));
        });
        el.appendChild(c);
      }
      section("Invitations", r.invitations, "No invitations right now.");
      section("Matches", r.matches, "No matches right now. Keep your availability confirmed and your profile up to date.");
      if (r.open_gigs.length) section("Open gigs", r.open_gigs, "");
      section("Drafts", r.drafts, "No saved drafts.");
      section("Sent proposals", r.sent, "Nothing sent yet.");
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    return el;
  }

  function workGig(el) {
    api.get("/gigs/get?id=" + gigs.id).then(function (r) {
      D.clear(el);
      el.appendChild(h("div", { class: "row" }, h("button", { class: "ghost small", onclick: function () { gigs.id = null; draw(); } }, "← Work")));
      if (!r.ok) { el.appendChild(h("p", { class: "notice", text: "This gig is not available to you." })); return; }
      var g = r.gig, mine = r.my_proposal;
      el.appendChild(h("div", { class: "row" }, h("h1", { class: "grow", text: g.title }), h("span", { class: "badge " + (g.status === "open" ? "ready" : "C"), text: GIG_STATUS[g.status] })));
      if (g.firm) el.appendChild(h("p", { class: "muted", text: "Posted by " + g.firm + "." }));
      if (r.invitation && r.invitation.status === "sent") el.appendChild(h("div", { class: "notice ok" }, h("p", { style: "margin:0 0 6px", text: "You are invited to send a proposal. An invited proposal does not use your monthly allowance." + (r.invitation.message ? " The attorney wrote: " + r.invitation.message : "") }),
        h("button", { class: "ghost small", type: "button", onclick: function () { if (!confirm("Decline this invitation?")) return; api.post("/gigs/decline", { gig_id: g.id }).then(gigOk).then(function () { gigs.id = null; draw(); D.toast(app, "Declined"); }).catch(gigFail); } }, "Decline")));
      el.appendChild(h("div", { class: "card" }, publicBlock(g)));
      if ((r.access === "invited" || r.access === "applicant" || r.access === "hired") && ((me.switches || {}).gig_chat || (me.switches || {}).meetings)) {
        el.appendChild(h("div", { class: "row" },
          (me.switches || {}).gig_chat ? h("button", { class: "blue small", type: "button", onclick: function () { openThread(g.id, null); } }, "Message the attorney") : null,
          (me.switches || {}).meetings ? h("button", { class: "ghost small", type: "button", onclick: function () { talk.meeting = null; tab = "meetings"; draw(); } }, "Your meetings") : null));
      }
      if (g.milestones && g.milestones.length) el.appendChild(h("div", { class: "card" }, h("h2", { text: "Milestones" }), h("ol", null, g.milestones.map(function (m) { return h("li", { text: m.title }); })),
        h("p", { class: "small muted", text: "DELA finalizes the milestones with the agreement. You review and sign before any work starts." })));
      if (r.playbook) el.appendChild(h("div", { class: "card watermarked", "data-watermark": r.watermark || "" }, h("h2", { text: "The full playbook" }), h("p", { class: "small muted", text: r.watermark }), playbookPlain(r.playbook)));
      // Files
      if (r.files.length) {
        var fc = h("div", { class: "card" }, h("h2", { text: "Files for this gig" }), h("p", { class: "small muted", text: "Read only, for this gig only. Downloads are logged." }));
        r.files.forEach(function (f) {
          fc.appendChild(h("div", { class: "row" }, h("span", { class: "grow", text: f.name }), h("button", { class: "ghost small", type: "button", onclick: function () {
            api.get("/gigs/file?gig=" + g.id + "&file=" + f.file_id).then(gigOk).then(function (x) { window.open(x.url, "_blank", "noopener"); }).catch(gigFail);
          } }, "Open")));
        });
        el.appendChild(fc);
      }
      // Questions
      var qc = h("div", { class: "card" }, h("h2", { text: "Questions" }), h("p", { class: "small muted", text: "Answers are shown to every applicant. Keep everything on Lawfecta: no contact details or payment outside it." }));
      r.questions.forEach(function (q) { qc.appendChild(h("div", { style: "margin:6px 0" }, h("div", { text: "Q: " + q.question }), q.answer ? h("div", { class: "small", text: "A: " + q.answer }) : h("div", { class: "small muted", text: q.status === "held" ? "Being checked by the Lawfecta Team." : "Waiting for an answer." }))); });
      if (g.status === "open") {
        var qa = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Your question" });
        qc.appendChild(qa);
        qc.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
          if (!qa.value.trim()) return;
          api.post("/gigs/questions/ask", { gig_id: g.id, question: qa.value, request_id: newId() }).then(gigOk).then(function (x) { draw(); D.toast(app, x.held ? x.note : "Question sent"); }).catch(gigFail);
        } }, "Ask the attorney"));
      }
      el.appendChild(qc);
      el.appendChild(proposalCard(r, g, mine));
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  function proposalCard(r, g, mine) {
    var c = h("div", { class: "card" }, h("h2", { text: "Your proposal" }));
    if (mine && mine.status !== "draft") {
      c.appendChild(h("p", null, h("span", { class: "badge " + (mine.status === "selected" ? "ready" : "C"), text: PROP_STATUS[mine.status] }), " ", D.money(mine.price_cents) + (mine.counted ? " | used one of your proposals" : mine.invited ? " | invited, did not use your allowance" : "")));
      c.appendChild(h("p", { class: "small", text: "Includes: " + mine.included }));
      if (mine.status === "held") c.appendChild(h("p", { class: "notice", text: "DELA is holding your proposal for a quick check by the Lawfecta Team, because it may plan contact or payment outside Lawfecta." }));
      var act = h("div", { class: "row" });
      if (mine.status === "sent" && (mine.needs_reconfirm || mine.scope_version < g.scope_version)) act.appendChild(h("button", { class: "blue small", type: "button", onclick: function () {
        api.post("/proposals/reconfirm", { gig_id: g.id }).then(gigOk).then(function () { draw(); D.toast(app, "Confirmed. The attorney can choose it now."); }).catch(gigFail);
      } }, "Confirm my proposal still stands"));
      if (mine.status === "sent" || mine.status === "held") act.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
        if (!confirm("Withdraw your proposal? A withdrawn proposal does not give your monthly allowance back.")) return;
        api.post("/proposals/withdraw", { gig_id: g.id }).then(gigOk).then(function () { draw(); D.toast(app, "Withdrawn"); }).catch(gigFail);
      } }, "Withdraw"));
      c.appendChild(act);
      return c;
    }
    if (g.status !== "open") { c.appendChild(h("p", { class: "muted", text: "This gig is not taking proposals." })); return c; }
    var f = {
      price: h("input", { type: "number", min: "0", step: "1", "aria-label": "Your total price ($)" }), days: h("input", { type: "number", min: "1", max: "365", "aria-label": "Days to deliver" }),
      included: h("textarea", { rows: 3, style: "width:100%", "aria-label": "What your price includes" }), excluded: h("textarea", { rows: 2, style: "width:100%", "aria-label": "What it leaves out" }),
      schedule: h("input", { style: "width:100%", "aria-label": "Schedule", placeholder: "For example: draft in 3 days, final 2 days after comments" }),
      quals: h("textarea", { rows: 4, style: "width:100%", "aria-label": "Your relevant qualifications" }), message: h("textarea", { rows: 2, style: "width:100%", "aria-label": "A short note to the attorney (optional)" }),
    };
    if (mine) { f.price.value = dollars(mine.price_cents); f.days.value = mine.days_to_deliver || ""; f.included.value = mine.included; f.excluded.value = mine.excluded; f.schedule.value = mine.schedule; f.quals.value = mine.qualifications; f.message.value = mine.message; }
    function body() { return { gig_id: g.id, price: f.price.value, days_to_deliver: f.days.value ? Number(f.days.value) : null, included: f.included.value, excluded: f.excluded.value, schedule: f.schedule.value, qualifications: f.quals.value, message: f.message.value }; }
    var invited = r.access === "invited", al = r.allowance || {};
    c.appendChild(h("p", { class: "small muted", text: (invited ? "You were invited, so this proposal does not use your allowance. " : allowanceText(al) + " ") + "Milestones are set after hiring. Keep everything on Lawfecta." }));
    var help = h("button", { class: "ghost small", type: "button" }, "✦ Let DELA help with qualifications");
    help.addEventListener("click", function () {
      help.disabled = true;
      api.post("/proposals/help", { gig_id: g.id }).then(gigOk).then(function (x) { help.disabled = false; f.quals.value = x.qualifications; if (!f.included.value) f.included.value = x.included; D.toast(app, "DELA drafted this from your profile. Check it before sending."); }).catch(function (e) { help.disabled = false; gigFail(e); });
    });
    c.appendChild(h("div", { class: "row" }, field("Total price ($)", f.price), field("Days to deliver", f.days)));
    c.appendChild(field("What your price includes", f.included));
    c.appendChild(field("What it leaves out", f.excluded, "Say it plainly, so the attorney compares complete proposals."));
    c.appendChild(field("Schedule", f.schedule));
    c.appendChild(field("Your relevant qualifications", f.quals, "From your profile. DELA never invents qualifications.", null, help));
    c.appendChild(field("Note to the attorney (optional)", f.message));
    var send = h("button", { class: "blue", type: "button" }, invited ? "Send proposal (free: invited)" : "Send proposal (uses 1)");
    var sending = false;
    function doSend(confirmed) {
      if (sending) return;
      sending = true; send.disabled = true;
      api.post("/proposals/send", Object.assign(body(), { request_id: newId(), confirm_no_client_info: confirmed === true })).then(function (x) {
        sending = false; send.disabled = false;
        if (x.reason === "looks_like_client_info") { if (confirm("This may include client information (" + kindsText(x.kinds) + "). Click OK only if it is not.")) doSend(true); return; }
        gigOk(x);
        D.toast(app, x.status === "held" ? x.note : "Proposal sent" + (x.counted ? ". " + allowanceText(x.allowance) : ""));
        draw();
      }).catch(function (e) { sending = false; send.disabled = false; gigFail(e); });
    }
    send.addEventListener("click", function () { doSend(false); });
    c.appendChild(h("div", { class: "row" }, h("button", { class: "ghost", type: "button", onclick: function () {
      api.post("/proposals/save", body()).then(gigOk).then(function () { D.toast(app, "Draft saved. It is not sent."); }).catch(gigFail);
    } }, "Save draft"), send));
    return c;
  }

  // ---------- What DELA has learned about you ----------
  function insightsCard() {
    var card = h("div", { class: "card" }, h("h2", { text: "What DELA has learned about you" }), h("p", { class: "muted small", text: "Loading..." }));
    api.get("/insights").then(function (r) {
      D.clear(card);
      card.appendChild(h("h2", { text: "What DELA has learned about you" }));
      card.appendChild(h("p", { class: "small muted", text: "DELA notes useful facts about how you work from what you send on gigs, to help you better. It never keeps client information. Remove anything you do not want it to use." }));
      if (!r.on) { card.appendChild(h("p", { class: "muted", text: "This is not open for your account yet." })); return; }
      if (!r.items.length) card.appendChild(h("p", { class: "muted", text: "Nothing yet." }));
      r.items.forEach(function (i) {
        card.appendChild(h("div", { class: "row" }, h("span", { class: "grow", text: i.text }), h("button", { class: "ghost small", type: "button", onclick: function () {
          api.post("/insights/remove", { id: i.id }).then(gigOk).then(function () { D.toast(app, "Removed"); card.replaceWith(insightsCard()); }).catch(gigFail);
        } }, "Remove")));
      });
    }).catch(function () { D.clear(card); });
    return card;
  }


  // ---------- Step 5: messages, booking and meetings ----------
  var talk = { thread: null, meeting: null };
  try {
    var tq = new URLSearchParams(location.search);
    if (/^[0-9a-f-]{36}$/.test(tq.get("thread") || "")) talk.thread = tq.get("thread");
    if (/^[0-9a-f-]{36}$/.test(tq.get("meeting") || "")) talk.meeting = tq.get("meeting");
  } catch (e) { /* no deep link */ }
  var MEET_STATUS = { held: "Held, not confirmed", confirmed: "Booked", completed: "Done", canceled: "Canceled", rescheduled: "Moved", no_show: "Did not happen" };
  var ATTEND = { unverified: "Not confirmed yet", evidence_received: "One person confirmed", verified: "Both confirmed: you met", disputed: "You disagree on whether it happened" };
  var TALK_ERR = {
    chat_off: "Messages are not open for your account yet.", meetings_off: "Booking is not open for your account yet.", blocked: "This conversation is blocked.",
    thread_closed: "This conversation closed 30 days after the gig closed.", too_many_messages: "You are sending messages very fast. Wait a moment.",
    edit_time_over: "Messages can be edited for 15 minutes only.", edit_needs_check: "That edit looks like contact details or payment outside Lawfecta. Send it as a new message instead, so DELA can check it.",
    time_taken: "Someone just took that time. Choose another.", hold_expired: "The time was held for 10 minutes and ran out. Choose a time again.",
    not_available: "This freelancer is not available for meetings right now.", not_yet: "You can confirm the meeting once it has started.",
    bad_timezone: "Choose your time zone.", choose_a_length: "Choose at least one meeting length.", bad_hours: "Check the hours: each day needs a start before its end.",
    assistant_off: "DELA's help in messages is not open for your account yet.", nothing_to_summarize: "There are no messages yet.",
  };
  function talkErr(r) { return (r && TALK_ERR[r.reason]) || gigErr(r); }
  function talkFail(e) { D.toast(app, e && e.reason ? talkErr(e) : D.errorText(e && e.message ? e.message : String(e)), true); }
  function openThread(gigId, freelancer) {
    api.post("/threads/open", { gig_id: gigId, freelancer: freelancer || null }).then(gigOk).then(function (r) { talk.thread = r.id; tab = "inbox"; draw(); }).catch(talkFail);
  }
  function dayLabel(iso) { return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
  function timeLabel(iso) { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
  function whenLabel(iso, len) { return dayLabel(iso) + ", " + timeLabel(iso) + " (" + len + " minutes, your time)"; }

  // The Inbox: every thread with its unread count
  function inboxView() {
    var el = h("div", null, h("h1", { text: "Inbox" }), h("p", { class: "muted", text: "Loading..." }));
    if (talk.thread) { threadView(el); return el; }
    api.get("/threads").then(function (r) {
      D.clear(el);
      el.appendChild(h("div", { class: "row" }, h("h1", { class: "grow", text: "Inbox" }), (me.switches || {}).meetings ? h("button", { class: "ghost small", onclick: function () { talk.meeting = null; tab = "meetings"; draw(); } }, "Your meetings") : null));
      el.appendChild(h("p", { class: "muted", text: "Every conversation is on a gig. Keep all work, contact and payment on Lawfecta." }));
      if (!r.on) { el.appendChild(h("p", { class: "notice", text: TALK_ERR.chat_off })); return; }
      if (!r.threads.length) el.appendChild(h("p", { class: "muted", text: me.side === "attorney" ? "No conversations yet. Invite a freelancer to a gig, or message someone who sent a proposal." : "No conversations yet. They start when an attorney invites you or when you send a proposal." }));
      r.threads.forEach(function (t) {
        el.appendChild(h("div", { class: "work", style: "cursor:pointer", role: "button", tabindex: "0", onclick: function () { talk.thread = t.id; draw(); } },
          h("span", { class: "chip", text: t.unread ? String(t.unread) : "✓" }), h("div", null, h("h3", { text: t.other_name }), h("div", { class: "muted small", text: t.gig_title + (t.last_at ? " | " + D.dateTime(t.last_at) : "") })),
          h("span", { class: "grow" }), t.unread ? h("span", { class: "badge held", text: t.unread + " new" }) : null));
      });
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    return el;
  }

  function threadView(el) {
    api.get("/threads/get?id=" + talk.thread).then(function (r) {
      D.clear(el);
      el.appendChild(h("div", { class: "row" }, h("button", { class: "ghost small", onclick: function () { talk.thread = null; draw(); } }, "← Inbox")));
      if (!r.ok) { el.appendChild(h("p", { class: "notice", text: "This conversation is not available to you." })); return; }
      var t = r.thread;
      el.appendChild(h("h1", { text: t.other_name }));
      el.appendChild(h("p", { class: "muted", text: "About the gig \"" + t.gig_title + "\". Keep all work, contact and payment on Lawfecta." }));
      var tools = h("div", { class: "row", style: "flex-wrap:wrap" });
      if ((me.switches || {}).meetings && r.writable) tools.appendChild(h("button", { class: "blue small", type: "button", onclick: function () { bookPanel(el, t.gig_id, t.freelancer_person, null); } }, "Book a meeting"));
      tools.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { gigs.id = t.gig_id; gigs.view = "details"; tab = me.side === "attorney" ? "projects" : "work"; talk.thread = null; draw(); } }, "Open the gig"));
      if ((me.switches || {}).chat_assistant) {
        [["summarize", "✦ Summarize"], ["agreed", "✦ What we agreed"]].forEach(function (x) {
          tools.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/threads/assist", { thread_id: t.id, mode: x[0] }).then(gigOk).then(function (y) { aiOut.hidden = false; aiOut.textContent = y.text + "\n\nDELA's summary is for reading only. It does not change the gig, a proposal or an agreement."; }).catch(talkFail);
          } }, x[1]));
        });
      }
      tools.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
        var why = prompt("What is wrong? The Lawfecta Team reads every report.");
        if (why === null) return;
        api.post("/threads/report", { thread_id: t.id, reason: why }).then(gigOk).then(function () { D.toast(app, "Reported to the Lawfecta Team"); }).catch(talkFail);
      } }, "Report"));
      if (!t.blocked || t.blocked_by_me) tools.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
        if (!t.blocked && !confirm("Block this conversation? New messages and meetings stop, and upcoming meetings are canceled. The Lawfecta Team is told.")) return;
        api.post("/threads/block", { thread_id: t.id, block: !t.blocked }).then(gigOk).then(function () { draw(); D.toast(app, t.blocked ? "Unblocked" : "Blocked"); }).catch(talkFail);
      } }, t.blocked ? "Unblock" : "Block"));
      el.appendChild(tools);
      var aiOut = h("p", { class: "helpbox", hidden: true, role: "status", style: "white-space:pre-wrap" });
      el.appendChild(aiOut);
      // Messages
      var list = h("div", { class: "card", "aria-label": "Messages" });
      if (!r.messages.length) list.appendChild(h("p", { class: "muted", text: "No messages yet. Say hello and ask what you need to know." }));
      var lastMine = null;
      r.messages.forEach(function (m) {
        var box = h("div", { class: "msg" + (m.mine ? " mine" : "") });
        if (m.status === "removed") box.appendChild(h("p", { class: "muted small", text: "Message removed" }));
        else {
          box.appendChild(h("p", { style: "margin:0;white-space:pre-wrap", text: m.body }));
          (m.attachments || []).forEach(function (a) {
            box.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
              api.get("/threads/file?thread=" + t.id + "&file=" + a.file_id).then(gigOk).then(function (x) { window.open(x.url, "_blank", "noopener"); }).catch(talkFail);
            } }, "Open " + a.name));
          });
          if (m.status === "held") box.appendChild(h("p", { class: "small bad", text: "Being checked by the Lawfecta Team. The other person does not see it yet." }));
          if (m.warned) box.appendChild(h("p", { class: "small muted", text: "Sent with a reminder: keep all work, contact and payment on Lawfecta." }));
        }
        var meta = h("div", { class: "small muted", text: D.dateTime(m.created_at) + (m.edited ? " | edited" : "") });
        box.appendChild(meta);
        var fresh = Date.now() - new Date(m.created_at).getTime() < r.edit_minutes * 60000;
        if (m.mine && m.status === "sent" && fresh) {
          box.appendChild(h("div", { class: "row" }, h("button", { class: "ghost small", type: "button", onclick: function () {
            var nb = prompt("Edit your message (the earlier text is kept for the Lawfecta Team):", m.body);
            if (nb === null || !nb.trim()) return;
            api.post("/threads/edit", { id: m.id, body: nb }).then(gigOk).then(function () { draw(); D.toast(app, "Edited"); }).catch(talkFail);
          } }, "Edit"), h("button", { class: "ghost small", type: "button", onclick: function () {
            if (!confirm("Remove this message? The other person sees \"Message removed\".")) return;
            api.post("/threads/remove", { id: m.id }).then(gigOk).then(function () { draw(); }).catch(talkFail);
          } }, "Remove")));
        }
        if (m.mine) lastMine = { m: m, meta: meta };
        list.appendChild(box);
      });
      if (lastMine && r.seen_at && new Date(r.seen_at) >= new Date(lastMine.m.created_at)) lastMine.meta.textContent += " | Seen";
      el.appendChild(list);
      // Composer
      if (!r.writable) { el.appendChild(h("p", { class: "notice", text: TALK_ERR[r.why_closed] || "This conversation is closed." })); return; }
      var ta = h("textarea", { rows: 3, style: "width:100%", "aria-label": "Your message", placeholder: "Write a message. No client information, contact details or payment outside Lawfecta." });
      ta.value = r.draft || "";
      ta.addEventListener("blur", function () { api.post("/threads/draft", { thread_id: t.id, body: ta.value }).catch(function () {}); });
      var attach = [], attachWrap = h("div", { class: "small" });
      var pick = h("button", { class: "ghost small", type: "button" }, "Attach a file");
      pick.addEventListener("click", function () {
        (me.side === "attorney" ? api.get("/files").then(function (x) { return (x.files || []).filter(function (f) { return f.status === "ready"; }); })
          : api.get("/profile").then(function (x) { return (x.documents || []).filter(function (f) { return f.status === "ready"; }); })).then(function (files) {
          D.clear(attachWrap);
          if (!files.length) { attachWrap.appendChild(h("span", { class: "muted", text: me.side === "attorney" ? "No ready files. Upload on the Files tab first." : "No ready profile documents. Add one on your Profile first." })); return; }
          files.forEach(function (f) {
            var cb = h("input", { type: "checkbox" });
            cb.addEventListener("change", function () { attach = attach.filter(function (x) { return x !== f.id; }); if (cb.checked) attach.push(f.id); });
            attachWrap.appendChild(h("label", { style: "display:flex;gap:6px;font-weight:400" }, cb, f.name));
          });
        }).catch(talkFail);
      });
      var send = h("button", { class: "blue", type: "button" }, "Send");
      var req = newId();
      function doSend(confirmed) {
        if (!ta.value.trim()) return;
        send.disabled = true;
        api.post("/threads/send", { thread_id: t.id, body: ta.value, attachments: attach, request_id: req, confirm_no_client_info: confirmed === true }).then(function (x) {
          send.disabled = false;
          if (x.reason === "looks_like_client_info") { if (confirm("This may include client information (" + kindsText(x.kinds) + "). Click OK only if it is not.")) doSend(true); return; }
          gigOk(x);
          var note = x.held || x.warned ? x.note : "";
          draw();
          if (note) D.toast(app, note, x.held);
        }).catch(function (e) { send.disabled = false; talkFail(e); });
      }
      send.addEventListener("click", function () { doSend(false); });
      var draftBtn = (me.switches || {}).chat_assistant ? h("button", { class: "ghost small", type: "button", onclick: function () {
        api.post("/threads/assist", { thread_id: t.id, mode: "draft" }).then(gigOk).then(function (y) { ta.value = y.text; D.toast(app, "DELA drafted a reply. Check it, then Send."); }).catch(talkFail);
      } }, "✦ Draft a reply") : null;
      el.appendChild(h("div", { class: "card" }, ta, h("div", { class: "row", style: "margin-top:6px;flex-wrap:wrap" }, pick, draftBtn, h("span", { class: "grow" }), send), attachWrap));
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  // Booking: open times grouped by day in the member's own time zone; a time is held for 10 minutes while confirming
  function bookPanel(host, gigId, freelancer, rescheduleOf) {
    var panel = h("div", { class: "card", "aria-label": "Book a meeting" }, h("h2", { text: rescheduleOf ? "Choose a new time" : "Book a meeting" }), h("p", { class: "muted small", text: "Loading open times..." }));
    host.insertBefore(panel, host.children[3] || null);
    var length = null;
    function load() {
      api.get("/meetings/slots?gig=" + gigId + (freelancer ? "&freelancer=" + freelancer : "") + (length ? "&length=" + length : "") + (rescheduleOf ? "&except=" + rescheduleOf : "")).then(function (r) {
        D.clear(panel);
        panel.appendChild(h("h2", { text: rescheduleOf ? "Choose a new time" : "Book a meeting" }));
        if (!r.ok) { panel.appendChild(h("p", { class: "notice", text: talkErr(r) })); return; }
        if (r.no_availability) { panel.appendChild(h("p", { class: "muted", text: me.side === "freelancer" ? "Set your availability for meetings on your Profile first." : "This freelancer has not set their availability for meetings yet. Send them a message." })); return; }
        length = r.length;
        var sel = h("select", { "aria-label": "Meeting length" }, (r.lengths || []).map(function (n) { return h("option", { value: String(n), text: n + " minutes", selected: n === r.length }); }));
        sel.addEventListener("change", function () { length = Number(sel.value); load(); });
        panel.appendChild(h("p", { class: "small muted", text: "Times are shown in your own time zone. Meetings are free and happen in a Lawfecta meeting room. The freelancer's time zone: " + r.timezone + "." }));
        panel.appendChild(field("Length", sel));
        if (!r.slots.length) panel.appendChild(h("p", { class: "muted", text: "No open times in the next 3 weeks for this length." }));
        var byDay = {};
        r.slots.forEach(function (s) { var d = dayLabel(s); (byDay[d] = byDay[d] || []).push(s); });
        Object.keys(byDay).slice(0, 14).forEach(function (d) {
          panel.appendChild(h("div", { style: "margin:8px 0" }, h("b", { text: d }), h("div", { class: "row", style: "flex-wrap:wrap;gap:6px;margin-top:4px" }, byDay[d].slice(0, 24).map(function (s) {
            return h("button", { class: "ghost small", type: "button", onclick: function () { hold(s); } }, timeLabel(s));
          }))));
        });
      }).catch(function (e) { D.clear(panel); panel.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    }
    function hold(s) {
      api.post("/meetings/hold", { gig_id: gigId, freelancer: freelancer, start_at: s, length: length, request_id: newId(), reschedule_of: rescheduleOf }).then(function (x) {
        if (x.reason === "time_taken") { D.toast(app, TALK_ERR.time_taken, true); load(); return; }
        gigOk(x);
        if (!confirm((rescheduleOf ? "Move the meeting to " : "Book ") + whenLabel(s, length) + "? Both of you get one confirmation with a calendar file.")) { api.post("/meetings/cancel", { id: x.id }).catch(function () {}); load(); return; }
        return api.post("/meetings/confirm", { id: x.id }).then(gigOk).then(function () { talk.meeting = x.id; tab = "meetings"; draw(); D.toast(app, rescheduleOf ? "Moved. One update went to both of you." : "Booked. A confirmation is on its way to both of you."); });
      }).catch(talkFail);
    }
    load();
  }

  // Meetings: upcoming and past, the join link near the time, consent, the calendar file, reschedule, cancel and the follow-up
  function meetingsView() {
    var el = h("div", null, h("h1", { text: "Your meetings" }), h("p", { class: "muted", text: "Loading..." }));
    api.get("/meetings" + (talk.meeting ? "?id=" + talk.meeting : "")).then(function (r) {
      D.clear(el);
      el.appendChild(h("div", { class: "row" }, h("h1", { class: "grow", text: talk.meeting ? "Meeting" : "Your meetings" }),
        h("button", { class: "ghost small", onclick: function () { if (talk.meeting) { talk.meeting = null; draw(); } else { tab = "inbox"; draw(); } } }, talk.meeting ? "← All meetings" : "← Inbox")));
      if (!r.on) { el.appendChild(h("p", { class: "notice", text: TALK_ERR.meetings_off })); return; }
      if (!r.meetings.length) el.appendChild(h("p", { class: "muted", text: "No meetings yet. Book one from a conversation or a gig." }));
      r.meetings.forEach(function (m) { el.appendChild(meetingCard(el, m, r.confirm_hours)); });
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    return el;
  }

  function meetingCard(host, m, confirmHours) {
    var c = h("div", { class: "card" }, h("div", { class: "row" }, h("h2", { class: "grow", style: "margin:0", text: m.other_name + ": " + m.gig_title }),
      h("span", { class: "badge " + (m.status === "confirmed" ? "ready" : m.status === "canceled" ? "bad" : "C"), text: MEET_STATUS[m.status] || m.status })));
    c.appendChild(h("p", { text: whenLabel(m.start_at, m.length_min) + (m.version > 1 ? " | new time" : "") }));
    var started = new Date(m.start_at).getTime() <= Date.now();
    if (m.status === "confirmed" && !started) {
      if (m.join_url) c.appendChild(h("a", { class: "btn blue", href: m.join_url, target: "_blank", rel: "noopener" }, "Join the meeting"));
      else if (m.room_status === "waiting_for_provider") c.appendChild(h("p", { class: "small muted", text: "The meeting room link appears here once Lawfecta's meeting service is connected. You both get it before the meeting." }));
      else c.appendChild(h("p", { class: "small muted", text: "The room opens at " + timeLabel(m.join_opens_at) + " on " + dayLabel(m.join_opens_at) + "." }));
      var consent = h("input", { type: "checkbox", checked: m.my_consent });
      consent.addEventListener("change", function () { api.post("/meetings/consent", { id: m.id, consent: consent.checked }).then(gigOk).then(function () { D.toast(app, consent.checked ? "Saved. Nothing is recorded unless you both agree." : "Saved"); }).catch(talkFail); });
      c.appendChild(h("label", { style: "display:flex;gap:8px;font-weight:400;margin-top:8px" }, consent, h("span", { text: "I agree to this meeting being recorded or noted. Nothing is recorded unless both of you agree." + (m.both_consent ? " You both agreed." : "") })));
      c.appendChild(h("div", { class: "row", style: "margin-top:8px;flex-wrap:wrap" },
        h("button", { class: "ghost small", type: "button", onclick: function () {
          api.get("/meetings/ics?id=" + m.id).then(gigOk).then(function (x) {
            var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([x.text], { type: "text/calendar" })); a.download = x.name; document.body.appendChild(a); a.click(); a.remove();
          }).catch(talkFail);
        } }, "Add to my calendar (.ics)"),
        h("button", { class: "ghost small", type: "button", onclick: function () { bookPanel(host, m.gig_id, me.side === "attorney" ? m.freelancer_person : null, m.id); } }, "Change the time"),
        h("button", { class: "danger small", type: "button", onclick: function () {
          var why = prompt("Why are you canceling? Both of you are told. Less than 2 hours before counts as a late cancel.");
          if (why === null) return;
          api.post("/meetings/cancel", { id: m.id, reason: why }).then(gigOk).then(function (x) { draw(); D.toast(app, x.late ? "Canceled (late)" : "Canceled"); }).catch(talkFail);
        } }, "Cancel")));
    }
    if (m.status === "confirmed" && started && m.join_url) c.appendChild(h("a", { class: "btn blue", href: m.join_url, target: "_blank", rel: "noopener" }, "Join the meeting"));
    if ((m.status === "confirmed" || m.status === "completed" || m.status === "no_show") && started) {
      c.appendChild(h("p", { class: "small", text: "Attendance: " + ATTEND[m.attendance] + "." }));
      if (!m.my_followup) {
        var met = h("select", { "aria-label": "Did the meeting happen?" }, h("option", { value: "yes", text: "We met" }), h("option", { value: "no", text: "They did not come" }));
        var sum = h("textarea", { rows: 3, style: "width:100%", "aria-label": "Short summary", placeholder: "What you agreed, next steps, any change to the work or price. No client information." });
        c.appendChild(h("div", { class: "helpbox" }, h("p", { style: "margin:0 0 6px", text: "Did the meeting happen? Tell DELA within " + confirmHours + " hours. DELA suggests next steps from both summaries." }), met, sum,
          h("button", { class: "blue small", type: "button", onclick: function () {
            api.post("/meetings/followup", { id: m.id, met: met.value === "yes", summary: sum.value }).then(function (x) {
              if (x.reason === "looks_like_client_info") { D.toast(app, "This may include client information. Use placeholders instead.", true); return; }
              gigOk(x); draw(); D.toast(app, "Thank you. " + (x.both_in ? "You both answered." : "Waiting for the other person."));
            }).catch(talkFail);
          } }, "Send")));
      } else c.appendChild(h("p", { class: "small muted", text: "You said: " + (m.my_followup.met ? "we met" : "they did not come") + (m.their_followup_in ? ". The other person answered too." : ". Waiting for the other person.") }));
      if ((m.next_steps || []).length) c.appendChild(h("div", { class: "helpbox" }, h("b", { text: "DELA suggests" }), h("ul", null, m.next_steps.map(function (s) { return h("li", { text: (s.who === "attorney" ? "Attorney: " : "Freelancer: ") + s.text }); })),
        h("p", { class: "small muted", style: "margin:0", text: "Suggestions only. Nothing changes until one of you changes it." })));
    }
    if (m.status === "canceled" && m.cancel_reason) c.appendChild(h("p", { class: "small muted", text: "Reason: " + m.cancel_reason + (m.late ? " (late)" : "") }));
    return c;
  }

  // Profile: the freelancer's availability for meetings
  var TZS = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"];
  var WEEK = [["1", "Monday"], ["2", "Tuesday"], ["3", "Wednesday"], ["4", "Thursday"], ["5", "Friday"], ["6", "Saturday"], ["7", "Sunday"]];
  function meetingAvailabilityCard() {
    var card = h("div", { class: "card" }, h("h2", { text: "Your availability for meetings" }), h("p", { class: "muted small", text: "Loading..." }));
    api.get("/availability").then(function (r) {
      D.clear(card);
      var a = r.availability;
      card.appendChild(h("h2", { text: "Your availability for meetings" }));
      card.appendChild(h("p", { class: "small muted", text: "Attorneys book meetings with you only inside a gig, from these times, with 12 hours' notice and 15 minutes between meetings. Meetings are free. Times are in your time zone." }));
      var guess = ""; try { guess = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { guess = ""; }
      var tzList = TZS.indexOf(a.timezone) < 0 ? TZS.concat([a.timezone]) : TZS;
      if (guess && tzList.indexOf(guess) < 0) tzList = tzList.concat([guess]);
      var tz = h("select", { "aria-label": "Time zone for meetings" }, tzList.map(function (z) { return h("option", { value: z, text: z.split("/").pop().split("_").join(" ") + " (" + z + ")", selected: z === (r.saved ? a.timezone : guess || a.timezone) }); }));
      card.appendChild(field("Time zone", tz));
      var lens = h("div", { class: "row" });
      var lenBoxes = (r.allowed_lengths || [15, 30, 45]).map(function (n) {
        var cb = h("input", { type: "checkbox", checked: (a.lengths || []).indexOf(n) >= 0, "aria-label": n + " minutes" });
        lens.appendChild(h("label", { style: "display:flex;gap:6px;font-weight:400" }, cb, n + " minutes"));
        return [n, cb];
      });
      card.appendChild(field("Meeting lengths you offer", lens));
      var rows = WEEK.map(function (d) {
        var w = (a.hours || {})[d[0]] || [];
        var on = h("input", { type: "checkbox", checked: w.length > 0, "aria-label": d[1] });
        var from = h("input", { type: "time", value: w[0] ? w[0][0] : "09:00", "aria-label": d[1] + " from" });
        var to = h("input", { type: "time", value: w[0] ? w[0][1] : "17:00", "aria-label": d[1] + " to" });
        card.appendChild(h("div", { class: "row", style: "gap:8px;margin:4px 0" }, h("label", { style: "display:flex;gap:6px;font-weight:400;min-width:120px" }, on, d[1]), from, h("span", { text: "to" }), to));
        return [d[0], on, from, to];
      });
      var off = h("input", { type: "text", style: "width:100%", "aria-label": "Days off", placeholder: "For example 2026-11-26, 2026-12-24", value: (a.days_off || []).join(", ") });
      card.appendChild(field("Days off", off, "Dates as YYYY-MM-DD, separated by commas."));
      var save = h("button", { class: "blue", type: "button" }, "Save availability");
      save.addEventListener("click", function () {
        var hours = {};
        rows.forEach(function (x) { if (x[1].checked) hours[x[0]] = [[x[2].value, x[3].value]]; });
        api.post("/availability", { timezone: tz.value, lengths: lenBoxes.filter(function (x) { return x[1].checked; }).map(function (x) { return x[0]; }), hours: hours,
          days_off: off.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean) }).then(gigOk).then(function () { D.toast(app, "Availability saved"); }).catch(talkFail);
      });
      card.appendChild(h("div", { class: "row", style: "margin-top:8px" }, save));
    }).catch(function () { D.clear(card); });
    return card;
  }

  function prefsCard() {
    var card = h("div", { class: "card" }, h("h2", { text: "Messages" }));
    api.get("/prefs").then(function (r) {
      var cb = h("input", { type: "checkbox", checked: r.read_receipts });
      cb.addEventListener("change", function () { api.post("/prefs", { read_receipts: cb.checked }).then(gigOk).then(function () { D.toast(app, "Saved"); }).catch(talkFail); });
      card.appendChild(h("label", { style: "display:flex;gap:8px;font-weight:400" }, cb, h("span", { text: "Show \"Seen\" when I read a message, and show me when others read mine. Turning it off turns it off both ways." })));
    }).catch(function () {});
    return card;
  }


  function draw() {
    closeMenu();
    var main = h("div", { class: "wrap" });
    // The full client information notice shows on Ask DELA, the Library and the recorder (where people describe processes).
    // Not on Home, Files, Projects, Talent, Work, Earnings, Profile or AI settings (Stacey 2026-11-05). Files and profile
    // documents keep their short reminder and tick box at the upload, and the client information check still runs on save.
    var noNotice = ["home", "files", "projects", "talent", "work", "earnings", "profile", "ai"];
    if (me.notice && noNotice.indexOf(tab) < 0) main.appendChild(h("div", { class: "notice", role: "note", text: me.notice }));
    if (me.pause && me.pause.all) main.appendChild(h("div", { class: "notice bad", role: "alert", text: "DELA is paused for members right now. You can still use it because you are on the Lawfecta Team." }));
    if (me.on_hold) main.appendChild(h("div", { class: "notice bad", role: "alert", text: "Some actions are paused on your account. Contact the Lawfecta Team." }));
    if (!me.side) main.appendChild(noSide());
    else if (tab === "home") main.appendChild(me.side === "attorney" ? attorneyHome() : freelancerHome());
    else if (tab === "ai") main.appendChild(aiSettingsView());
    else if ((tab === "delegate" || tab === "ask") && (me.switches || {}).ai_generation) main.appendChild(chatView());
    else if (tab === "files" && me.side === "attorney" && (me.switches || {}).file_uploads) main.appendChild(filesView());
    else if ((tab === "library" || tab === "record") && me.side === "attorney" && (me.switches || {}).playbook_library) {
      // A direct link to the recorder (/dela?tab=record) opens the Record a Process page
      if (tab === "record") { tab = "library"; lib.startRecord = true; }
      main.appendChild(libraryView());
    }
    else if (tab === "connect") main.appendChild(connectView());
    else if (tab === "profile" && (me.switches || {}).profiles) main.appendChild(profileView());
    else if (tab === "projects" && me.side === "attorney" && (me.switches || {}).flex_gigs) main.appendChild(projectsView());
    else if (tab === "talent" && me.side === "attorney" && (me.switches || {}).talent_search) main.appendChild(talentView());
    else if (tab === "work" && me.side === "freelancer" && (me.switches || {}).flex_gigs) main.appendChild(workView());
    else if (tab === "inbox" && me.side && (me.switches || {}).gig_chat) main.appendChild(inboxView());
    else if (tab === "meetings" && me.side && (me.switches || {}).meetings) main.appendChild(meetingsView());
    else if (SECTIONS[tab]) main.appendChild(sectionSoon(SECTIONS[tab][0], SECTIONS[tab][1] + (me.side === "attorney" && (tab === "projects" || tab === "talent") && (sideInfo() || {}).verification_state !== "verified" ? " Posting work and hiring need a verified license: open Profile and verification from your account menu." : "")));
    else { tab = "home"; main.appendChild(me.side === "attorney" ? attorneyHome() : freelancerHome()); }
    show(h("div", null, header(), nav(), main));
  }

  function refresh() {
    return api.get("/me").then(function (r) { me = r.me; draw(); });
  }

  function switchSide(side) {
    if (side === me.side) return;
    api.post("/me/side", { side: side }).then(function (r) { me = r.me; tab = "home"; draw(); }).catch(function (e) { D.toast(app, D.errorText(e.message), true); });
  }

  // Sign out ends the DELA session, then logs out of Lawfecta too (BD's own log out page), so the next person or
  // test account can log in. Without the second part, BD's login opened DELA again straight away (Stacey 2026-11-05).
  var logoutUrl = root.getAttribute("data-logout-url") || "/logout";
  function signOut() {
    closeMenu();
    show(frame("Signing you out...", "One moment."));
    api.signOut().then(function () { location.href = logoutUrl; });
  }

  function openNotices() {
    closeMenu();
    if (drawer) { closeDrawer(); return; }
    var nb = h("div", null, h("p", { class: "muted", text: "Loading..." }));
    showDrawer(h("div", { class: "drawer", role: "dialog", "aria-label": "Notices" }, nb));
    api.get("/notifications").then(function (r) {
      D.clear(nb);
      nb.appendChild(h("div", { class: "row", style: "padding-right:84px" }, h("h2", { class: "grow", text: "Notices" }),
        h("button", { class: "ghost small", onclick: function () { api.post("/notifications/read", { all: true }).then(function () { closeDrawer(); refresh(); }); } }, "Mark all read")));
      if (!r.items.length) nb.appendChild(h("p", { class: "muted", text: "Nothing yet. Notices about your work will show up here." }));
      nb.appendChild(h("ul", { class: "list" }, r.items.map(function (n) {
        return h("li", null, h("strong", { text: n.title }), n.read ? null : h("span", { class: "badge G", style: "margin-left:6px", text: "New" }),
          n.body ? h("p", { class: "small", text: n.body }) : null, h("div", { class: "muted small", text: D.dateTime(n.created_at) }));
      })));
    }).catch(function () { D.clear(nb); nb.appendChild(h("p", { text: "Notices could not load." })); });
  }

  // Links in notices and emails can open a tab (for example /dela?tab=files)
  try {
    var want = new URLSearchParams(location.search).get("tab");
    if (want && /^[a-z]+$/.test(want)) tab = want;
  } catch (e) { /* older browsers open Home */ }

  var conflict = D.loginConflict(root);
  if (conflict) show(frame("Two website logins in this browser", D.LOGIN_CONFLICT_TEXT.join(" ")));
  else if (boot.route === "here" && me) draw();
  else if (boot.route === "paused") show(frame("DELA is paused for a moment", boot.message || "Please try again soon."));
  else if (boot.route === "denied") show(denied(boot.reason));
  else show(signedOut(false));
})();
