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
    var bell = h("button", { class: "bell small", "aria-label": "Notices", onclick: openNotices }, "Notices");
    if (me.unread > 0) bell.appendChild(h("b", { text: String(me.unread) }));
    bar.appendChild(bell);
    bar.appendChild(h("button", { class: "avatar", "aria-label": "Account menu", "aria-haspopup": "true", onclick: toggleMenu, text: initials(me.person.name) }));
    return bar;
  }

  function closeMenu() { if (menu) { menu.remove(); menu = null; } }

  // Any click outside the open menu closes it
  app.addEventListener("click", function (e) {
    if (menu && !menu.contains(e.target) && !(e.target.classList && e.target.classList.contains("avatar"))) closeMenu();
  });
  app.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeMenu(); if (drawer) { drawer.remove(); drawer = null; } } });

  function toggleMenu() {
    if (menu) { closeMenu(); return; }
    menu = h("div", { class: "menu", role: "menu" },
      h("div", { class: "small muted", style: "padding:8px 12px", text: me.person.name }),
      me.side ? h("button", { role: "menuitem", onclick: function () { tab = "ai"; draw(); } }, "AI settings") : null,
      (me.staff || []).length ? h("a", { href: "/dela-admin", role: "menuitem" }, "Admin area") : null,
      h("button", { role: "menuitem", onclick: signOut }, "Sign out of DELA"));
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

  function soon(n, title, text) {
    return h("div", { class: "work" }, h("span", { class: "chip", text: String(n) }), h("div", null, h("h3", { text: title }), h("div", { class: "muted small", text: text })), h("span", { class: "grow" }), h("span", { class: "soon", text: "Coming soon" }));
  }

  function attorneyHome() {
    var s = sideInfo();
    var gigs = ent("att.gigs_active");
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
        stat("✦", me.playbooks_draft || 0, "Draft playbooks")),
      h("div", { class: "card" }, h("div", { class: "row" }, h("h2", { text: "Verification" }), h("span", { class: "badge", text: s.verification_state.split("_").join(" ") })), h("p", { text: ver })),
      h("h2", { style: "margin-top:22px", text: "What DELA will do for you" }),
      soon(1, "Playbooks", "Describe a task. DELA asks what it needs and builds a step by step plan you approve."),
      soon(2, "Flex Gigs", gigs ? "Post approved work with a budget range. Your plan allows " + (gigs.unlimited ? "unlimited" : gigs.limit) + " open at once." : "Post approved work with a budget range."),
      soon(3, "Talent and your bench", "See available, qualified paralegals, including people you have worked with before."),
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
      h("div", { class: "card" }, h("h2", { text: "Your match checklist" }), h("p", { class: "muted small", text: "Opening soon. These are the items attorneys need to see before DELA can match you." }),
        items.map(function (t) { return h("div", { class: "check" }, h("i", { "aria-hidden": "true" }), h("span", { text: t })); })),
      h("h2", { style: "margin-top:22px", text: "What DELA will do for you" }),
      soon(1, "Profile Builder and Profile Audit", "Build a strong profile and see exactly what to improve."),
      soon(2, "Services, promotions and pitches", "Publish clear services. Nothing goes live without your approval."),
      soon(3, "Matches and proposals", "See work that fits you and send proposals with price, milestones and timeline."),
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
    return v >= 1000 ? (v / 1024).toFixed(1) + " GB" : (v < 10 ? v.toFixed(1) : String(Math.round(v))) + " MB";
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
      if (drawer) drawer.remove();
      drawer = h("div", { class: "drawer", role: "dialog", "aria-label": "Versions" },
        h("div", { class: "row" }, h("h2", { class: "grow", text: "Versions of " + f.name }), h("button", { class: "ghost small", onclick: function () { drawer.remove(); drawer = null; } }, "Close")),
        h("ul", { class: "list" }, r.items.map(function (v) {
          return h("li", null, h("b", { text: "Version " + v.version + (v.is_current ? " (current)" : "") }), h("div", { class: "small muted", text: D.dateTime(v.created_at) + ", " + mbText(v.size_bytes) }),
            h("button", { class: "ghost small", onclick: function () { openFile({ id: v.id }, true); } }, "Download"));
        })));
      app.appendChild(drawer);
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
      var today = new Date().toISOString().slice(0, 10);
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
    go.addEventListener("click", function () { if (!ta.value.trim()) { D.toast(app, "Describe the task first, or click Start blank.", true); return; } send(); });
    blank.addEventListener("click", function () {
      api.post("/playbooks/create", { org_id: lib.org, request_id: req, title: title.value || "Untitled playbook" }).then(okOr).then(function (r) { openPlaybook(r.id, "edit"); }).catch(pbFail);
    });
    var fileBtn = (me.switches || {}).file_uploads ? h("button", { class: "ghost small", type: "button", onclick: function () {
      api.get("/files").then(function (r) {
        D.clear(pickWrap);
        var ready = (r.files || []).filter(function (f) { return f.status === "ready" && f.has_text; });
        if (!ready.length) { pickWrap.appendChild(h("p", { class: "small muted", text: "No readable files yet. Upload a process document on the Files tab first." })); return; }
        pickWrap.appendChild(h("div", { class: "pick" }, ready.map(function (f) {
          var cb = h("input", { type: "checkbox" });
          cb.addEventListener("change", function () { files = files.filter(function (x) { return x !== f.id; }); if (cb.checked) files.push(f.id); });
          return h("label", null, cb, f.name);
        })));
      }).catch(err);
    } }, "Use a file I uploaded") : null;
    box.appendChild(h("h2", { text: "New playbook" }));
    box.appendChild(notice());
    box.appendChild(title);
    box.appendChild(ta);
    box.appendChild(h("div", { class: "row", style: "margin-top:8px" }, mic, fileBtn, h("span", { class: "grow" }), status));
    box.appendChild(pickWrap);
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
      if (drawer) drawer.remove();
      var bd = h("input", { "aria-label": "BD member ID", inputmode: "numeric", placeholder: "BD member ID" });
      var role = h("select", { "aria-label": "Role" }, ["editor", "commenter", "viewer", "administrator"].map(function (r) { return h("option", { value: r, text: ROLE_WORDS[r] }); }));
      drawer = h("div", { class: "drawer", role: "dialog", "aria-label": "Library team" },
        h("div", { class: "row" }, h("h2", { class: "grow", text: "Library team" }), h("button", { class: "ghost small", onclick: function () { drawer.remove(); drawer = null; } }, "Close")),
        h("p", { class: "small muted", text: "Editors and administrators use a seat (" + t.seats + " on your plan, including you). Commenters and viewers do not, up to " + t.guests + "." }),
        h("ul", { class: "list" }, h("li", null, h("b", { text: t.owner.name }), " Administrator (owner)"), t.members.map(function (m) {
          return h("li", { class: "row" }, h("span", { class: "grow" }, h("b", { text: m.name }), " " + ROLE_WORDS[m.role]),
            h("button", { class: "danger small", onclick: function () { teamSet(m.bd_member_id, "remove"); } }, "Remove"));
        })),
        h("h3", { style: "margin-top:14px", text: "Add someone" }),
        h("p", { class: "small muted", text: "They need a Lawfecta account and must have opened DELA once. Find their BD member ID in their Lawfecta profile." }),
        h("div", { class: "row" }, bd, role, h("button", { class: "blue small", onclick: function () { teamSet(bd.value, role.value); } }, "Add")));
      app.appendChild(drawer);
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
        can(4) && (P.status === "draft" || P.status === "in_review") ? h("button", { class: "blue small", disabled: P.completeness < 100, title: P.completeness < 100 ? "Fill in every required part first" : "", onclick: function () { status("approve", "Approved"); } }, "Approve") : null),
      h("div", { class: "bar" }, h("span", { style: "width:" + P.completeness + "%" + (P.completeness === 100 ? ";background:var(--ok)" : "") })),
      P.missing.length ? h("p", { class: "small", style: "margin:6px 0 0", text: "Still missing: " + P.missing.join(", ") + "." }) : h("p", { class: "small", style: "margin:6px 0 0", text: "Every required part is filled." }));
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
        if (drawer) drawer.remove();
        var inner = h("div");
        drawer = h("div", { class: "drawer", role: "dialog", "aria-label": "Version " + n, style: "width:min(640px,100%)" },
          h("div", { class: "row" }, h("h2", { class: "grow", text: "Version " + n }), h("button", { class: "ghost small", onclick: function () { drawer.remove(); drawer = null; } }, "Close")), inner);
        var saveCan = can;
        can = function () { return false; };
        readView(inner, r.version.body);
        can = saveCan;
        app.appendChild(drawer);
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
      if (drawer) drawer.remove();
      drawer = h("div", { class: "drawer", role: "dialog", "aria-label": "Blur part of this image", style: "width:min(900px,100%)" },
        h("div", { class: "row" }, h("h2", { class: "grow", text: "Blur part of this image" }), h("button", { class: "ghost small", onclick: function () { drawer.remove(); drawer = null; } }, "Cancel")),
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
            }).then(function () { drawer.remove(); drawer = null; D.toast(app, "Blurred screenshot saved"); openImport(imp.id); }).catch(pbFail);
          }, "image/png");
        } }, "Save the blurred screenshot")));
      app.appendChild(drawer);
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
      return fetch(r.upload_url, { method: "PUT", headers: { "content-type": "video/webm", "x-upsert": "true" }, body: blob }).then(function (up) {
        if (!up.ok) throw new Error("upload_failed");
        return api.post("/recordings/part-done", { id: recId, kind: kind, seq: seq });
      });
    }).then(function (r) { if (r && r.ok === false) throw r; return idb.del(key); });
  }

  function recordingsCard() {
    var card = h("div", { class: "card" }, h("p", { class: "muted", text: "Loading recordings..." }));
    Promise.all([api.get("/recordings"), idb.all()]).then(function (r) {
      recs.data = r[0];
      var waiting = r[1] || [];
      D.clear(card);
      var st = recs.data.settings;
      card.appendChild(h("div", { class: "row" }, h("h2", { class: "grow", text: "Recordings" }),
        st.on ? h("button", { class: "blue small", onclick: recordView }, "Record a process") : null));
      card.appendChild(h("p", { class: "small muted", text: "Videos are kept " + st.video_days + " days on your plan, then deleted; the playbook you build stays. Storage used: " + mbText(recs.data.used_bytes) + " of " + mbText(recs.data.limit_bytes) + "." }));
      if (waiting.length) {
        card.appendChild(h("div", { class: "notice", role: "alert" }, h("p", { style: "margin:0 0 6px", text: "Your last recording didn't finish uploading." }),
          h("button", { class: "blue small", onclick: function () { finishLeftovers(waiting); } }, "Finish upload")));
      }
      if (!recs.data.items.length) { card.appendChild(h("p", { class: "muted", text: st.on ? "No recordings yet." : "The Process Recorder is not open for your account yet." })); return; }
      var today = new Date().toISOString().slice(0, 10);
      card.appendChild(h("div", { class: "scroll" }, h("table", null,
        h("thead", null, h("tr", null, ["Process name", "Date recorded", "Length", "Status", "Video deletes on", ""].map(function (x) { return h("th", { text: x }); }))),
        h("tbody", null, recs.data.items.map(function (x) {
          var days = x.video_delete_after ? Math.round((new Date(x.video_delete_after) - new Date(today)) / 86400000) : null;
          var del = x.video_deleted_at ? "Video deleted on " + D.date(x.video_deleted_at) : x.video_delete_after ? D.date(x.video_delete_after) : "";
          return h("tr", null, h("td", null, h("b", { text: x.title })), h("td", { text: D.date(x.created_at) }),
            h("td", { text: x.duration_seconds ? Math.floor(x.duration_seconds / 60) + " min " + (x.duration_seconds % 60) + " s" : "" }),
            h("td", null, h("span", { class: "badge " + (x.status === "ready" ? "ready" : x.status === "failed" ? "bad" : "held"), text: REC_STATUS[x.status] + (x.status === "failed" && x.error ? " (" + x.error.split("_").join(" ") + ")" : "") })),
            h("td", null, del, days !== null && days <= 3 && !x.video_deleted_at ? h("span", { class: "badge held", style: "margin-left:6px", text: "Deletes in " + Math.max(days, 0) + " days" }) : null),
            h("td", null, h("div", { class: "row" },
              x.status === "ready" && x.import_id && !x.playbook_id ? h("button", { class: "blue small", onclick: function () { openImport(x.import_id); } }, "Review") : null,
              x.playbook_id ? h("button", { class: "ghost small", onclick: function () { openPlaybook(x.playbook_id, "read"); } }, "Open playbook") : null,
              x.status === "failed" ? h("button", { class: "blue small", onclick: function () { api.post("/recordings/retry", { id: x.id }).then(function (r) { if (r.ok === false) throw r; D.toast(app, "Analyzing again"); drawLibrary(); }).catch(pbFail); } }, "Try again") : null,
              !x.video_deleted_at && x.video_bytes ? h("button", { class: "ghost small", onclick: function () { downloadVideo(x); } }, "Download video") : null,
              !x.video_deleted_at ? h("button", { class: "danger small", onclick: function () {
                if (!confirm("Delete this recording's video and screenshots now? A playbook built from it stays.")) return;
                api.post("/recordings/delete-video", { id: x.id }).then(function (r) { if (r.ok === false) throw r; D.toast(app, "Video deleted"); drawLibrary(); }).catch(pbFail);
              } }, "Delete video") : null)));
        })))));
      if (recs.data.items.some(function (x) { return x.status === "analyzing" || x.status === "uploading"; })) setTimeout(function () { if (tab === "library" && !lib.pb && !lib.importId && card.isConnected) drawLibrary(); }, 8000);
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


  function draw() {
    closeMenu();
    var main = h("div", { class: "wrap" });
    if (me.notice) main.appendChild(h("div", { class: "notice", role: "note", text: me.notice }));
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
    else if (SECTIONS[tab]) main.appendChild(sectionSoon(SECTIONS[tab][0], SECTIONS[tab][1]));
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

  function signOut() {
    api.signOut().then(function () { show(frame("You are signed out of DELA", "You are still logged in to Lawfecta. Refresh this page to open DELA again.", h("button", { onclick: function () { location.reload(); } }, "Open DELA again"))); });
  }

  function openNotices() {
    closeMenu();
    if (drawer) { drawer.remove(); drawer = null; return; }
    drawer = h("div", { class: "drawer", role: "dialog", "aria-label": "Notices" }, h("p", { class: "muted", text: "Loading..." }));
    app.appendChild(drawer);
    api.get("/notifications").then(function (r) {
      D.clear(drawer);
      drawer.appendChild(h("div", { class: "row" }, h("h2", { class: "grow", text: "Notices" }),
        h("button", { class: "ghost small", onclick: function () { api.post("/notifications/read", { all: true }).then(function () { drawer.remove(); drawer = null; refresh(); }); } }, "Mark all read"),
        h("button", { class: "ghost small", "aria-label": "Close", onclick: function () { drawer.remove(); drawer = null; } }, "Close")));
      if (!r.items.length) drawer.appendChild(h("p", { class: "muted", text: "Nothing yet. Notices about your work will show up here." }));
      drawer.appendChild(h("ul", { class: "list" }, r.items.map(function (n) {
        return h("li", null, h("strong", { text: n.title }), n.read ? null : h("span", { class: "badge G", style: "margin-left:6px", text: "New" }),
          n.body ? h("p", { class: "small", text: n.body }) : null, h("div", { class: "muted small", text: D.dateTime(n.created_at) }));
      })));
    }).catch(function () { D.clear(drawer); drawer.appendChild(h("p", { text: "Notices could not load." })); });
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
