// DELA member app (Step 1: foundation). Attorney DELA and Freelancer DELA are separate homes;
// a member with both sides switches between them. Later steps fill in the tiles marked "Coming soon".
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

  function show(node) { D.clear(app); app.appendChild(node); }

  // ---------- Screens before sign in ----------

  function frame(title, body, actions) {
    return h("div", null,
      h("div", { class: "top" }, h("span", { class: "brand" }, "DELA", h("small", { text: "by Lawfecta" }))),
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

  function header() {
    var bar = h("div", { class: "top" }, h("span", { class: "brand" }, "DELA", h("small", { text: "by Lawfecta" })));
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
    if ((me.staff || []).length) bar.appendChild(h("a", { class: "btn small", href: "/dela-admin", style: "padding:5px 10px;font-size:14px" }, "Admin area"));
    bar.appendChild(h("button", { class: "ghost small", onclick: signOut }, "Sign out"));
    return bar;
  }

  function planCard() {
    var s = sideInfo();
    var rows = (me.entitlements || []).map(function (e) {
      return h("tr", null, h("td", { text: e.label }), h("td", { text: D.limitText(e) }));
    });
    return h("div", { class: "card" },
      h("div", { class: "row" }, h("h2", { text: "Your plan: " + (s ? s.plan_name : "") }), s && s.plan_source === "staff_grant" ? h("span", { class: "badge", text: "Set by the Lawfecta Team" }) : null),
      me.trial && me.trial.active ? h("div", { class: "notice ok", text: "Your free trial gives you " + me.trial.tier.toUpperCase() + " limits until " + D.date(me.trial.ends_at) + "." }) : null,
      h("div", { class: "scroll" }, h("table", null, h("thead", null, h("tr", null, h("th", { text: "What you get" }), h("th", { text: "Right now" }))), h("tbody", null, rows))),
      h("p", { class: "muted small", style: "margin-top:10px", text: "Plans and billing are managed in your Lawfecta account." }));
  }

  function tile(title, text) {
    return h("div", { class: "tile" }, h("div", { class: "soon", text: "Coming soon" }), h("h3", { text: title }), h("p", { class: "muted small", text: text }));
  }

  function attorneyHome() {
    var s = sideInfo();
    var ver = {
      not_started: "Before you can hire, we confirm your license, your identity and your firm. You can plan work before you are verified.",
      pending: "We are checking your details. You can keep planning work while you wait.",
      verified: "You are verified and can hire.",
      rejected: "We could not verify your details. Contact the Lawfecta Team.",
      expired: "Your verification needs to be renewed before your next hire.",
    }[s.verification_state] || "";
    return h("div", null,
      h("h1", { text: "Welcome, " + D.firstName(me.person.name) + "." }),
      h("p", { class: "muted", text: "Turn the work you need done into a clear plan, then hire a freelance paralegal to do it, all in one place." }),
      h("div", { class: "card" }, h("div", { class: "row" }, h("h2", { text: "Verification" }), h("span", { class: "badge", text: s.verification_state.replace("_", " ") })), h("p", { text: ver })),
      h("h2", { style: "margin-top:20px", text: "Your DELA" }),
      h("div", { class: "grid" },
        tile("Playbooks", "Describe a task. DELA asks what it needs and builds a clear, step by step plan you approve."),
        tile("Flex Gigs", "Post approved work with a budget range. Compare proposals side by side."),
        tile("Matches and your bench", "See available, qualified paralegals, including people you have worked with before."),
        tile("Booking and messages", "Book calls inside Lawfecta and keep every conversation in one place."),
        tile("Engagements and payments", "Sign a fixed-fee agreement, fund each milestone before work starts, review and approve."),
        tile("Reviews", "Review the work when it is done, and invite great paralegals to your bench.")),
      planCard());
  }

  function freelancerHome() {
    var s = sideInfo();
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
      h("h1", { text: "Welcome, " + D.firstName(me.person.name) + "." }),
      h("p", { class: "muted", text: "Get match-ready, win work from attorneys and get paid for each milestone you deliver." }),
      h("div", { class: "card" },
        h("div", { class: "row" }, h("h2", { text: "Match readiness" }), h("span", { class: "badge", text: s.readiness_state.replace("_", " ") })),
        h("p", { text: ready }),
        h("p", { class: "muted small", text: "Your checklist (opening soon):" }),
        items.map(function (t) { return h("div", { class: "check" }, h("i", { "aria-hidden": "true" }), h("span", { text: t })); })),
      h("h2", { style: "margin-top:20px", text: "Your DELA" }),
      h("div", { class: "grid" },
        tile("Profile Builder and Profile Audit", "Build a strong profile and see exactly what to improve."),
        tile("Services and promotions", "Publish clear services. DELA suggests improvements; nothing goes live without your approval."),
        tile("Matches and invitations", "See work that fits your skills and availability."),
        tile("Proposals and pitches", "Send structured proposals with price, milestones and timeline."),
        tile("Active work", "Deliver milestones, get DELA's check, and track each payout."),
        tile("Reviews and benches", "Earn reviews and join attorneys' trusted benches.")),
      planCard());
  }

  function noSide() {
    return h("div", { class: "card", style: "max-width:620px" },
      h("h1", { text: "Almost there" }),
      h("p", { text: "Your Lawfecta plan is not linked to DELA yet, so we do not know whether to open Attorney DELA or Freelancer DELA for you." }),
      h("p", { class: "muted", text: "The Lawfecta Team will set this up. If you just changed plans, refresh this page in a minute." }));
  }

  function home() {
    var main = h("div", { class: "wrap" });
    if (me.notice) main.appendChild(h("div", { class: "notice", role: "note", text: me.notice }));
    if (me.on_hold) main.appendChild(h("div", { class: "notice bad", role: "alert", text: "Some actions are paused on your account. Contact the Lawfecta Team." }));
    if (!me.side) main.appendChild(noSide());
    else main.appendChild(me.side === "attorney" ? attorneyHome() : freelancerHome());
    show(h("div", null, header(), main));
  }

  function refresh() {
    return api.get("/me").then(function (r) { me = r.me; home(); });
  }

  function switchSide(side) {
    if (side === me.side) return;
    api.post("/me/side", { side: side }).then(function (r) { me = r.me; home(); }).catch(function (e) { D.toast(app, D.errorText(e.message), true); });
  }

  function signOut() {
    api.signOut().then(function () { show(frame("You are signed out of DELA", "You are still logged in to Lawfecta. Refresh this page to open DELA again.", h("button", { onclick: function () { location.reload(); } }, "Open DELA again"))); });
  }

  function openNotices() {
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
        return h("li", null, h("strong", { text: n.title }), n.read ? null : h("span", { class: "badge", style: "margin-left:6px", text: "New" }),
          n.body ? h("p", { class: "small", text: n.body }) : null, h("div", { class: "muted small", text: D.dateTime(n.created_at) }));
      })));
    }).catch(function () { D.clear(drawer); drawer.appendChild(h("p", { text: "Notices could not load." })); });
  }

  if (boot.route === "here" && me) home();
  else if (boot.route === "denied") show(denied(boot.reason));
  else show(signedOut(false));
})();
