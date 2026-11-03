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
    if (boot.staging || me.environment !== "live") bar.appendChild(h("span", { class: "badge stage", title: "You are on the Staging copy. Test data only.", text: "Staging" }));
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
        stat("✦", 0, "Draft playbooks")),
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
