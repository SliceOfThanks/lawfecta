// DELA member app (Step 1: foundation). Attorney DELA and Freelancer DELA are separate homes with their own tabs;
// a member with both sides switches between them. Later steps fill in the parts marked "Coming soon".
(function () {
  var D = window.DELA;
  var root = document.getElementById("dela-app");
  if (!D || !root) return;
  var m = D.mount(root);
  var app = m.app;
  D.markAi(app);
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
      a = a.concat([["projects", "Projects", "▣"], ["talent", "Talent", "◌"]]);
      if (sw.guided_setup) a.push(["setup", "Get set up", "✓"]);
      return a;
    }
    var f = [["home", "Home", "⌂"]];
    if (sw.ai_generation) f.push(["ask", "Ask DELA", "✦"]);
    f = f.concat([["profile", "Profile", "☺"], ["work", "Work", "▣"], ["earnings", "Earnings", "$"]]);
    if (sw.agency_team) f.push(["agency", "Agency", "◆"]);
    // An agency that hires (Step 7d part 2c): its own Library, Projects and Talent, as an attorney has
    if (me.agency_client) {
      if (sw.playbook_library) f.push(["library", "Library", "▥"]);
      if (sw.flex_gigs) f.push(["projects", "Projects", "▣"]);
      if (sw.talent_search) f.push(["talent", "Talent", "◌"]);
    }
    return f;
  }

  function show(node) { D.clear(app); app.appendChild(node); if (dockEl) D.clear(dockEl); }
  function brand() { return h("span", { class: "brand" }, D.logo(root), h("span", { text: "DELA" })); }

  // ---------- Screens before sign in ----------

  function frame(title, body, actions) {
    app.classList.remove("nl");
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
    // MVP re-test 2026-11-09: never "?" (it looked like a help button); the email's first letter, or "Me"
    if (!p.length) { var em = String(((typeof me !== "undefined" && me && me.person) || {}).email || "").trim(); return em ? em.charAt(0).toUpperCase() : "Me"; }
    return (p[0].charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : "")).toUpperCase();
  }

  function greeting() {
    var hr = new Date().getHours();
    return hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  }

  function header() {
    bar = h("div", { class: "top" }, brand());
    if (boot.staging || me.environment !== "live") bar.appendChild(h("span", { class: "badge stage", title: "This copy of DELA is in test mode. Test data only.", text: "Test site" }));
    bar.appendChild(h("span", { class: "grow" }));
    if ((me.sides || []).length > 1) {
      var seg = h("div", { class: "seg", role: "group", "aria-label": "Switch workspace" });
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
  app.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeMenu(); closeDrawer(); closeMore(true); } });

  function toggleMenu() {
    if (menu) { closeMenu(); return; }
    menu = h("div", { class: "menu", role: "menu" },
      h("div", { class: "small muted", style: "padding:8px 12px", text: me.person.name }),
      me.side && (me.switches || {}).profiles ? h("button", { role: "menuitem", onclick: function () { tab = "profile"; draw(); } }, me.side === "attorney" ? "Profile and verification" : "Profile") : null,
      me.side ? h("button", { role: "menuitem", onclick: function () { tab = "ai"; settingsJump = "set-account"; draw(); } }, "Account and security") : null,
      me.side ? h("button", { role: "menuitem", onclick: function () { tab = "ai"; draw(); } }, NL() ? "Settings" : "AI settings") : null,
      (me.staff || []).length ? h("a", { href: "/dela-admin", role: "menuitem" }, "Admin area") : null,
      appearanceItems(),
      h("button", { role: "menuitem", onclick: signOut }, "Sign out"));
    bar.appendChild(menu);
  }

  // ---------- Step 15: the compact workspace (docs/briefs/step-15-compact-workspace.md), switch new_layout ----------
  // A left sidebar on desktop, five labeled items at the bottom of a phone (the fifth opens "More"), a slim top bar.
  // The page names and ?tab= links are the same as before; with the switch off none of this is used.
  function NL() { return !!(me && me.side && (me.switches || {}).new_layout); }
  // The page at tab=ai: "Settings" in the new layout, "AI settings" in the old one
  function plural(n, word) { return n + " " + word + (Number(n) === 1 ? "" : "s"); }
  // 21 days reads as "3 weeks"; anything that is not whole weeks stays in days
  function daysWords(d) { return d % 7 === 0 ? plural(d / 7, "week") : plural(d, "day"); }
  function setName() { return NL() ? "Settings" : "AI settings"; }
  var ICONS = {
    home: [["path", "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"]],
    work: [["path", "M3 8h18v11H3z"], ["path", "M9 8V5h6v3"]],
    ask: [["path", "M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"]],
    earnings: [["path", "M12 3v18"], ["path", "M16 7.5C16 5.8 14.2 5 12 5s-4 1-4 3 2 2.6 4 3 4 1 4 3-1.8 3-4 3-4-.8-4-2.5"]],
    profile: [["circle", 12, 8, 4], ["path", "M4 21c0-4 3.6-6 8-6s8 2 8 6"]],
    agency: [["path", "M4 21V5l8-2v18"], ["path", "M12 9l8 2v10"], ["path", "M2 21h20"]],
    settings: [["path", "M4 6h16M4 12h16M4 18h16"], ["circle", 16, 6, 2], ["circle", 8, 12, 2], ["circle", 14, 18, 2]],
    help: [["circle", 12, 12, 9], ["path", "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"], ["path", "M12 17h.01"]],
    projects: [["path", "M3 6h6l2 2h10v11H3z"]],
    library: [["path", "M5 4h13v16H5z"], ["path", "M9 4v16"]],
    talent: [["circle", 11, 11, 6], ["path", "M20 20l-4.5-4.5"]],
    files: [["path", "M6 3h8l4 4v14H6z"], ["path", "M14 3v4h4"]],
    check: [["path", "M4 12l5 5L20 6"]],
    inbox: [["path", "M3 6h18v12H3z"], ["path", "M3 7l9 6 9-6"]],
    bell: [["path", "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"], ["path", "M10 20a2 2 0 0 0 4 0"]],
    more: [["circle", 5, 12, 1], ["circle", 12, 12, 1], ["circle", 19, 12, 1]],
    chev: [["path", "M9 6l6 6-6 6"]],
    collapse: [["path", "M15 6l-6 6 6 6"]],
    expand: [["path", "M4 5v14"], ["path", "M10 6l6 6-6 6"]],
    close: [["path", "M6 6l12 12M18 6L6 18"]],
    send: [["path", "M4 12l16-8-6 16-3-6z"]],
    swap: [["path", "M7 7h11l-3-3M17 17H6l3 3"]],
    out: [["path", "M10 4H5v16h5"], ["path", "M14 8l4 4-4 4M18 12H9"]],
  };
  var SVG_NS = "http://www.w3.org/2000/svg"; // rules-ok: the SVG namespace name, not a web address DELA calls
  function icon(name) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("class", "ic"); svg.setAttribute("aria-hidden", "true");
    (ICONS[name] || ICONS.chev).forEach(function (part) {
      var el = document.createElementNS(SVG_NS, part[0]);
      if (part[0] === "path") el.setAttribute("d", part[1]);
      else { el.setAttribute("cx", part[1]); el.setAttribute("cy", part[2]); el.setAttribute("r", part[3]); }
      svg.appendChild(el);
    });
    return svg;
  }
  var ICON_FOR = { home: "home", delegate: "ask", ask: "ask", library: "library", files: "files", projects: "projects", talent: "talent", setup: "check", profile: "profile", work: "work", earnings: "earnings", agency: "agency", ai: "settings", help: "help" };
  var PAGE_NAMES = { inbox: "Inbox", meetings: "Meetings", usage: "Usage", connect: "Connect", record: "Record a process", ai: "Settings", help: "Help", profile: "Profile" };
  var WORKSPACE = { attorney: "Attorney workspace", freelancer: "Freelancer workspace" };
  // "Get set up" leaves the attorney's menu once it is finished or dismissed (Stacey 2026-11-11); it stays reachable from Help
  var setupDone = null;
  function navGroups() {
    var have = {};
    tabsFor().forEach(function (t) { have[t[0]] = t; });
    var sw = me.switches || {};
    var pick = function (keys) { return keys.filter(function (k) { return have[k]; }).map(function (k) { return have[k]; }); };
    var att = me.side === "attorney";
    if (att && sw.guided_setup && setupDone === null) {
      setupDone = false;
      api.get("/setup").then(function (r) { if (r && (r.finished || r.dismissed)) { setupDone = true; if (tab !== "setup") draw(); } }).catch(function () {});
    }
    var main = att ? pick(["home", "projects", "delegate", "library"]) : pick(["home", "work", "ask", "earnings"]);
    var second = att ? pick(["talent", "files"].concat(setupDone ? [] : ["setup"])) : pick(["library", "projects", "talent"]);
    while (main.length < 4 && second.length) main.push(second.shift());
    var account = [];
    if (sw.profiles) account.push(["profile", "Profile"]);
    if (have.agency) account.push(have.agency);
    return { main: main, second: second, account: account, foot: [["ai", "Settings"], ["help", "Help"]] };
  }
  function pageTitle(g) {
    var all = g.main.concat(g.second, g.account, g.foot), hit = all.filter(function (t) { return t[0] === tab; })[0];
    return hit ? hit[1] : PAGE_NAMES[tab] || "DELA";
  }
  function goTab(key) { closeMore(); tab = key; if (key === "inbox") talk.thread = null; draw(); }
  function navItem(t, folded) {
    return h("button", { class: "nl-item", type: "button", "aria-current": t[0] === tab ? "page" : null, "aria-label": folded ? t[1] : null, "data-tip": t[1], onclick: function () { goTab(t[0]); } },
      icon(ICON_FOR[t[0]] || "chev"), h("span", { class: "lbl", text: t[1] }));
  }
  function sidebar(g) {
    var folded = localPref("side.folded");
    var s = h("nav", { class: "nl-side" + (folded ? " mini" : ""), "aria-label": "DELA sections" });
    s.appendChild(h("div", { class: "nl-brand" }, D.logo(root, 32), h("b", { text: "DELA" })));
    g.main.forEach(function (t) { s.appendChild(navItem(t, folded)); });
    if (g.second.length) { s.appendChild(h("div", { class: "nl-sep" })); g.second.forEach(function (t) { s.appendChild(navItem(t, folded)); }); }
    if (g.account.length) { s.appendChild(h("div", { class: "nl-sep" })); g.account.forEach(function (t) { s.appendChild(navItem(t, folded)); }); }
    s.appendChild(h("div", { class: "nl-grow" }));
    s.appendChild(h("div", { class: "nl-sep" }));
    g.foot.forEach(function (t) { s.appendChild(navItem(t, folded)); });
    var word = folded ? "Expand sidebar" : "Collapse sidebar";
    s.appendChild(h("button", { class: "nl-item nl-fold", type: "button", "aria-label": folded ? word : null, "aria-expanded": String(!folded), "data-tip": word, onclick: function () { localPref("side.folded", !folded); draw(); } },
      icon(folded ? "expand" : "collapse"), h("span", { class: "lbl", text: word })));
    return s;
  }
  // The phone bar has to sit on the bottom edge of the window at every scroll position. "Fixed" does that unless a box
  // around DELA on the host page is moved or filtered, which makes "fixed" mean "fixed to that box" (the bar then shows
  // only at the end of the page). DELA checks where the bar really is; if it is not on the window's edge, the bar, the
  // More sheet and its shade move to DELA's own holder directly on the page body, where nothing can trap them.
  var dockEl = null, trapped = false, barEl = null;
  function syncDock() {
    if (!dockEl) return;
    dockEl.setAttribute("data-theme", app.getAttribute("data-theme") || "auto");
    ["kb", "sheet"].forEach(function (c) { dockEl.classList.toggle(c, app.classList.contains(c)); });
  }
  function dock() {
    if (dockEl && dockEl.isConnected) return dockEl;
    var host = h("div", { class: "dela-host dela-dock" });
    document.body.appendChild(host);
    var sh = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    sh.appendChild(h("style", { text: D.CSS }));
    dockEl = h("div", { class: "dela nl docked" });
    sh.appendChild(dockEl);
    syncDock();
    return dockEl;
  }
  if (window.MutationObserver) new MutationObserver(syncDock).observe(app, { attributes: true, attributeFilter: ["class", "data-theme"] });
  function layer() { return trapped ? dock() : app; }
  // Where the part of the window the member can see ends. On phones the browser's own bars can cover the end of the
  // window, so the visual viewport is asked when the page is not zoomed.
  function visibleBottom() {
    var vv = window.visualViewport;
    return vv && Math.abs((vv.scale || 1) - 1) < 0.01 ? vv.offsetTop + vv.height : window.innerHeight;
  }
  var lift = 0;
  function setLift(px) {
    lift = px;
    [app, dockEl].forEach(function (el) { if (el) el.style.setProperty("--lift", px + "px"); });
  }
  function checkBar() {
    if (!barEl || !barEl.isConnected || window.innerWidth >= 900 || app.classList.contains("kb")) return;
    var r = barEl.getBoundingClientRect();
    if (!r.height) return;
    // Where the bar would be without the lift DELA may have given it
    var base = r.bottom + lift;
    var off = Math.min(Math.abs(base - window.innerHeight), Math.abs(base - document.documentElement.clientHeight));
    if (off > 8) {
      if (trapped) return;
      trapped = true;
      dock().appendChild(barEl);
      if (moreOpen) { dockEl.appendChild(moreOpen.scrim); dockEl.appendChild(moreOpen.sheet); }
      syncDock();
      setLift(0);
      setTimeout(checkBar, 60);
      return;
    }
    // On the window's edge, but the browser's own bar covers it: lift it into view
    var d = base - visibleBottom();
    var want = d > 2 && d < 140 ? Math.round(d) : 0;
    if (want !== lift) setLift(want);
  }
  // Checked on every scroll (of the page or of a box inside it), on every size change, and on a slow clock, because a
  // host page can start trapping the bar at any time (Stacey 2026-11-12: on her phone the bar showed only after
  // scrolling to the end and back)
  document.addEventListener("scroll", checkBar, { passive: true, capture: true });
  window.addEventListener("resize", checkBar);
  if (window.visualViewport) { window.visualViewport.addEventListener("resize", checkBar); window.visualViewport.addEventListener("scroll", checkBar); }
  setInterval(checkBar, 1200);
  // The Lawfecta site's own "back to top" square sits where More is. On a phone the menu is always in reach, so it is hidden.
  function siteFix() {
    if (document.getElementById("dela-site-fix")) return;
    document.head.appendChild(h("style", { id: "dela-site-fix", text: "@media (max-width:899px){.scrollup{display:none !important}}" }));
  }
  var moreOpen = null;
  function moreButton() { return barEl ? barEl.querySelector("button[aria-haspopup]") : null; }
  function moreKey(e) { if (e.key === "Escape" && moreOpen) { e.preventDefault(); closeMore(true); } }
  function closeMore(returnFocus) {
    if (!moreOpen) return;
    moreOpen.scrim.remove(); moreOpen.sheet.remove();
    document.documentElement.style.overflow = moreOpen.overflow;
    moreOpen.behind.forEach(function (n) { n.removeAttribute("inert"); n.removeAttribute("aria-hidden"); });
    document.removeEventListener("keydown", moreKey);
    moreOpen = null;
    app.classList.remove("sheet");
    var b = moreButton();
    if (b) { b.setAttribute("aria-expanded", "false"); if (returnFocus) b.focus(); }
  }
  // The More sheet is a modal: the page behind stays where it was, dimmed, and cannot be scrolled or used. It closes with
  // its X, a tap outside, Escape, or More again; focus goes into the sheet and back to More. The bottom bar stays in use:
  // More shows as the open item, and tapping another destination closes the sheet and goes there.
  function openMore(g) {
    if (moreOpen) { closeMore(true); return; }
    var head = h("b", { tabindex: "-1", text: WORKSPACE[me.side] || "DELA" });
    var sheet = h("div", { class: "nl-sheet", role: "dialog", "aria-modal": "true", "aria-label": "More" }, h("div", { class: "nl-grab", "aria-hidden": "true" }),
      h("div", { class: "nl-sheethead" }, head, h("button", { class: "nl-x", type: "button", "aria-label": "Close menu", onclick: function () { closeMore(true); } }, icon("close"))));
    var lists = [g.second, g.account, g.foot].filter(function (l) { return l.length; });
    lists.forEach(function (l, i) { if (i) sheet.appendChild(h("div", { class: "nl-sep" })); l.forEach(function (t) { sheet.appendChild(navItem(t)); }); });
    var other = (me.sides || []).filter(function (x) { return x.side !== me.side; })[0];
    if (other) {
      sheet.appendChild(h("div", { class: "nl-sep" }));
      sheet.appendChild(h("button", { class: "nl-item", type: "button", onclick: function () { closeMore(); switchSide(other.side); } }, icon("swap"), h("span", { class: "lbl", text: "Switch to " + other.side + " workspace" })));
    }
    sheet.appendChild(h("div", { class: "nl-sep" }));
    sheet.appendChild(h("button", { class: "nl-item", type: "button", onclick: function () { closeMore(); signOut(); } }, icon("out"), h("span", { class: "lbl", text: "Sign out" })));
    var sc = h("div", { class: "nl-scrim", "aria-hidden": "true", onclick: function () { closeMore(true); } });
    sc.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: false });
    // Tab stays inside the sheet
    sheet.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = sheet.querySelectorAll("button"), first = f[0], last = f[f.length - 1], at = sheet.getRootNode().activeElement;
      if (e.shiftKey && (at === first || at === head)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
    });
    var behind = [].slice.call(app.querySelectorAll(".nl-main, .nl-side"));
    behind.forEach(function (n) { n.setAttribute("inert", ""); n.setAttribute("aria-hidden", "true"); });
    layer().appendChild(sc); layer().appendChild(sheet);
    moreOpen = { scrim: sc, sheet: sheet, behind: behind, overflow: document.documentElement.style.overflow };
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", moreKey);
    app.classList.add("sheet");
    var b = moreButton();
    if (b) b.setAttribute("aria-expanded", "true");
    head.focus();
  }
  function bottomBar(g) {
    var n = h("nav", { class: "nl-bar", "aria-label": "DELA sections" });
    g.main.forEach(function (t) {
      n.appendChild(h("button", { type: "button", "aria-current": t[0] === tab ? "page" : null, onclick: function () { goTab(t[0]); } }, icon(ICON_FOR[t[0]] || "chev"), h("span", { text: t[1] })));
    });
    var inMore = g.second.concat(g.account, g.foot).some(function (t) { return t[0] === tab; });
    n.appendChild(h("button", { type: "button", "aria-haspopup": "dialog", "aria-expanded": "false", "aria-current": inMore ? "page" : null, onclick: function () { openMore(g); } }, icon("more"), h("span", { text: "More" })));
    return n;
  }
  function headerNew(g) {
    bar = h("div", { class: "top" }, brand(), h("span", { class: "where", text: pageTitle(g) }));
    if (boot.staging || me.environment !== "live") bar.appendChild(h("span", { class: "badge stage", title: "This copy of DELA is in test mode. Test data only.", text: "Test site" }));
    bar.appendChild(h("span", { class: "grow" }));
    if ((me.sides || []).length > 1) {
      var seg = h("div", { class: "seg nl-seg", role: "group", "aria-label": "Switch workspace" });
      me.sides.forEach(function (s) { seg.appendChild(h("button", { "aria-pressed": String(s.side === me.side), onclick: function () { switchSide(s.side); } }, D.SIDE[s.side])); });
      bar.appendChild(seg);
    }
    if ((me.switches || {}).gig_chat) {
      var inbox = h("button", { class: "bell", type: "button", "aria-label": "Inbox", onclick: function () { goTab("inbox"); } }, icon("inbox"), h("span", { class: "lbl", text: "Inbox" }));
      api.get("/threads").then(function (r) {
        var n = (r.threads || []).reduce(function (a, t) { return a + (t.unread || 0); }, 0);
        if (n) { inbox.appendChild(h("b", { text: String(n) })); inbox.setAttribute("aria-label", "Inbox, " + n + " unread"); }
      }).catch(function () {});
      bar.appendChild(inbox);
    }
    var bell = h("button", { class: "bell icon", type: "button", "aria-label": me.unread > 0 ? "Notices, " + me.unread + " unread" : "Notices", onclick: openNotices }, icon("bell"));
    if (me.unread > 0) bell.appendChild(h("b", { text: String(me.unread) }));
    bar.appendChild(bell);
    bar.appendChild(h("button", { class: "avatar", "aria-label": "Account menu", "aria-haspopup": "true", onclick: toggleMenu, text: initials(me.person.name) }));
    return bar;
  }
  // The address follows the page, so a reload stays where the member was
  function syncAddress() {
    try {
      var u = new URL(location.href);
      if (u.searchParams.get("tab") === tab) return;
      u.searchParams.set("tab", tab);
      ["gig", "view", "pb", "thread", "meeting"].forEach(function (k) { u.searchParams.delete(k); });
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch (e) { /* the address stays as it was */ }
  }
  // On a phone the bottom bar steps aside while the member types, so it never covers the box or its Send button
  app.addEventListener("focusin", function (e) {
    var t = e.target && e.target.tagName;
    // Only when the member tapped into the box. DELA itself moving focus to a box (opening a profile section) brings up
    // no keyboard, so the bar stays.
    var lab = tapEl && tapEl.closest ? tapEl.closest("label") : null;
    if (Date.now() - lastTap > 900 || !(tapEl === e.target || (lab && (lab.contains(e.target) || (lab.htmlFor && lab.htmlFor === e.target.id))))) return;
    if (NL() && (t === "INPUT" || t === "TEXTAREA") && e.target.type !== "checkbox" && e.target.type !== "radio" && e.target.type !== "file" && window.innerWidth < 900) app.classList.add("kb");
  });
  var lastTap = 0, tapEl = null;
  app.addEventListener("pointerdown", function (e) { lastTap = Date.now(); tapEl = e.composedPath ? e.composedPath()[0] : e.target; }, true);
  app.addEventListener("focusout", function () { setTimeout(function () { var a = app.getRootNode().activeElement, t = a && a.tagName; if (t !== "INPUT" && t !== "TEXTAREA") app.classList.remove("kb"); }, 60); });
  // Keyboard rule: while the member types on a phone the bar is hidden, so the box and its button stay in view. It comes
  // back when typing ends, and also when the on-screen keyboard is closed while the box still has focus.
  if (window.visualViewport) {
    var kbSeen = false;
    window.visualViewport.addEventListener("resize", function () {
      if (!NL() || window.innerWidth >= 900) return;
      var small = window.visualViewport.height < window.innerHeight - 140;
      if (small) { kbSeen = true; app.classList.add("kb"); }
      else if (kbSeen) { kbSeen = false; app.classList.remove("kb"); }
    });
  }
  function shellNew(main) {
    var g = navGroups();
    syncAddress();
    var side = sidebar(g);
    sideEl = side;
    setTimeout(fitSidebar, 0);
    barEl = bottomBar(g);
    siteFix();
    return h("div", { class: "nl-frame" }, side, h("div", { class: "nl-main" }, headerNew(g), main), barEl);
  }
  // After the page is drawn: a trapped bar goes to the holder; a free one is checked now and on every scroll
  function placeBar() {
    if (!NL()) { barEl = null; return; }
    if (trapped && barEl) dock().appendChild(barEl);
    else { checkBar(); setTimeout(checkBar, 250); setTimeout(checkBar, 800); }
  }
  // The sidebar is as tall as the part of the window below it, so Settings, Help and Collapse sidebar are always in view
  var sideEl = null;
  function fitSidebar() {
    if (!sideEl || !sideEl.isConnected || window.innerWidth < 900) return;
    sideEl.style.height = Math.max(320, window.innerHeight - Math.max(sideEl.getBoundingClientRect().top, 0)) + "px";
  }
  window.addEventListener("scroll", fitSidebar, { passive: true });
  window.addEventListener("resize", fitSidebar);

  function nav() {
    if (!me.side) return null;
    var list = tabsFor();
    var n = h("nav", { class: "nav" + (list.length > 7 ? " many" : ""), "aria-label": "DELA sections" });
    list.forEach(function (t) {
      n.appendChild(h("button", { "aria-current": t[0] === tab ? "page" : null, onclick: function () { tab = t[0]; draw(); } }, h("i", { "aria-hidden": "true", text: t[2] }), t[1]));
    });
    return n;
  }

  // The Library's count and Home's plan read the same plan limit (step 8b, retest R11). While usage limits are not
  // switched on, the plan's number is shown as included but not yet enforced, instead of "no cap".
  function libLimitText(L) {
    if (L.limit !== null && L.limit !== undefined) return L.count + " of " + L.limit + " documents";
    var e = ent("att.playbooks_saved");
    if (e && e.enabled && !e.unlimited && e.limit) return L.count + " documents saved. Your plan allows " + e.limit + ".";
    return L.count + " documents (no cap on your plan)";
  }
  function planCard() {
    var s = sideInfo();
    var rows = (me.entitlements || []).map(function (e) {
      return h("tr", null, h("td", { text: e.label }), h("td", { text: D.limitText(e) }));
    });
    return h("div", { class: "card" },
      h("div", { class: "row" }, h("h2", { text: "Your DELA plan: " + (s ? s.plan_name : "") }), s && s.plan_source === "staff_grant" ? h("span", { class: "badge", text: "Set by the Lawfecta Team" }) : null),
      me.trial && me.trial.on && me.trial.active ? h("div", { class: "notice ok", text: "Your free trial gives you Pro features until " + D.date(me.trial.ends_at) + ". After that you keep everything you made, on your own plan." }) : null,
      h("div", { class: "scroll" }, h("table", null, h("thead", null, h("tr", null, h("th", { text: "What you get" }), h("th", { text: "Right now" }))), h("tbody", null, rows))),
      h("p", { class: "muted small", style: "margin-top:10px", text: "Your DELA plan comes from your Lawfecta directory plan. Change or pay for it in your Lawfecta account." }));
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
    var tile = stat("✦", me.playbooks_draft || 0, "Draft documents");
    if ((me.switches || {}).playbook_library) {
      api.get("/me").then(function (r) {
        if (r && r.me && typeof r.me.playbooks_draft === "number") { me.playbooks_draft = r.me.playbooks_draft; var n = tile.querySelector(".stat"); if (n) n.textContent = String(r.me.playbooks_draft); }
      }).catch(function () {});
    }
    return tile;
  }

  // ---------- Step 13: the DELA guide, a proactive chat at the top of the Dashboard ----------
  var GUIDE_ERR = {
    guide_cap: "You used today's free guide answers. Ask DELA on its own page, or come back tomorrow.",
    looks_like_client_info: "That looks like client details. Leave them out and ask again.",
    ai_off: "The guide cannot answer questions right now. The buttons above still work.",
    ai_failed: "The guide could not answer right now. Try again in a minute.",
    ai_unclear: "The guide could not give a clear answer. Try asking another way.",
    already_answered: "That question was already sent. Type it again to ask once more.",
    guide_off: "The DELA guide is off right now.",
  };
  // ---------- Step 15: Home in the compact workspace ----------
  // One profile box (what is missing, and what still stands between the member and invitations), what needs attention,
  // work, and Ask DELA as one line. Every number comes from me.home (dela_home_counts); nothing is estimated.
  var profileJump = null;
  var SECTION_FOR = { practice_areas: "prof-areas", summary: "prof-bio", experience: "prof-bio" };
  function goProfile(section) { profileJump = section || null; tab = "profile"; draw(); }
  function openGig(id, view) { tab = me.side === "attorney" ? "projects" : "work"; gigs.id = id; gigs.view = view || "agreement"; draw(); }
  function shortDate(iso) { return iso ? D.date(iso) : ""; }
  function hrow(o) {
    var kids = [o.dot ? h("span", { class: "hdot" + (o.dot === "done" ? " done" : o.dot === "warn" ? " warn" : ""), "aria-hidden": "true" }) : null,
      h("span", { class: "what" }, h("b", { text: o.title }), o.sub ? h("span", { class: "sub", text: o.sub }) : null),
      o.badge ? h("span", { class: "badge " + (o.tone || "held"), text: o.badge }) : null,
      o.act ? h("span", { class: "act", text: o.act }) : null,
      o.go ? icon("chev") : null];
    return o.go ? h("button", { class: "hrow", type: "button", onclick: o.go }, kids) : h("div", { class: "hrow" }, kids);
  }
  function hcard(title, badge) {
    var c = h("section", { class: "card" });
    c.appendChild(h("div", { class: "hhead" }, h("h2", { text: title }), badge || null));
    return c;
  }
  // What stands between a complete profile and invitations, kept apart from the profile details: the LinkedIn check
  // (the member submits it, the Lawfecta Team reviews it by hand) and availability (confirmed again every few days)
  function verifyRow(pf) {
    var v = pf.verification, go = function () { goProfile("sec-verify"); };
    if (!v || v === "not_required") return null;
    return v === "verified" ? hrow({ dot: "done", title: "Verification: LinkedIn check", badge: "Verified", tone: "ready" })
      : v === "pending" ? hrow({ dot: "warn", title: "Verification: LinkedIn check", sub: "The Lawfecta Team is reviewing it. Nothing more is needed from you.", badge: "Review pending" })
      : v === "not_started" ? hrow({ dot: "open", title: "Verification: LinkedIn check", sub: "The Lawfecta Team reviews it by hand.", badge: "Not submitted", act: "Submit LinkedIn profile", go: go })
      : hrow({ dot: "warn", title: "Verification: LinkedIn check", sub: "It was not approved. You can send it again.", badge: "Action needed", act: "Send it again", go: go });
  }
  function availabilityRow(pf) {
    var due = pf.availability_due_at, go = function () { goProfile("sec-availability"); };
    var stale = pf.readiness === "availability_stale" || (!pf.availability_confirmed_at && pf.availability !== "unavailable");
    return pf.availability === "unavailable" ? hrow({ dot: "warn", title: "Availability", sub: "You said you are not taking new work.", badge: "Not taking work", act: "Change availability", go: go })
      : !pf.availability_confirmed_at ? hrow({ dot: "open", title: "Availability", sub: "You confirm it every " + (pf.availability_days || 14) + " days.", badge: "Not confirmed yet", act: "Confirm availability", go: go })
      : stale ? hrow({ dot: "warn", title: "Availability", sub: "Last confirmed " + shortDate(pf.availability_confirmed_at) + ".", badge: "Out of date", act: "Confirm availability", go: go })
      : hrow({ dot: "done", title: "Availability", sub: "Confirm again by " + shortDate(due) + ".", badge: pf.availability === "limited" ? "Some hours only" : "Available", tone: "ready", go: go });
  }
  function eligibilityRows(pf) { return [verifyRow(pf), availabilityRow(pf)].filter(Boolean); }
  var homeAsk = null;
  function profileBox(hm) {
    var pf = hm.profile || {}, att = me.side === "attorney";
    if (pf.ok === false || !pf.readiness) return null;
    var miss = pf.missing || [], labels = pf.missing_labels || [];
    var required = hm.required || 0, done = Math.max(required - miss.length, 0), busy = (hm.active_projects || 0) > 0;
    if (pf.readiness === "incomplete") {
      var c = hcard("Complete your profile", h("span", { class: "badge pink", text: done + " of " + required + " details complete" }));
      var body = h("div", { class: "hgap" });
      c.appendChild(body);
      body.appendChild(h("div", { class: "hbar", role: "img", "aria-label": done + " of " + required + " profile details complete" }, h("span", { style: "width:" + (required ? Math.round(done * 100 / required) : 0) + "%" })));
      if (miss.length) {
        var list = h("div", { class: "hl hneed" });
        miss.forEach(function (k, i) { list.appendChild(hrow({ dot: "open", title: labels[i] || k, go: function () { goProfile(SECTION_FOR[k] || "sec-profile"); } })); });
        body.appendChild(list);
      }
      var acts = h("div", { class: "hacts" }, h("button", { class: "blue", type: "button", onclick: function () { goProfile(miss.length ? SECTION_FOR[miss[0]] || "sec-profile" : "sec-profile"); } }, "Continue setup"));
      if (miss.length > 1) {
        var word = "View all " + miss.length + " remaining details";
        var more = h("button", { class: "linkish hmore", type: "button", "aria-expanded": "false" }, word);
        more.addEventListener("click", function () { var open = c.classList.toggle("hall"); more.setAttribute("aria-expanded", String(open)); more.textContent = open ? "Show fewer" : word; });
        acts.appendChild(more);
      }
      var help = h("button", { class: "linkish", type: "button", hidden: true, onclick: function () { if (homeAsk) homeAsk("Help me complete my profile. What should I add next?"); } }, "Help me complete my profile");
      c.helpBtn = help;
      acts.appendChild(help);
      body.appendChild(acts);
      if (!att) {
        // Not profile details: a check the Lawfecta Team does, and a confirmation that repeats
        body.appendChild(h("p", { class: "hmini", text: "Also needed before new invitations" }));
        body.appendChild(h("div", { class: "hl helig" }, eligibilityRows(pf)));
        if (busy) body.appendChild(h("p", { class: "hsub", text: "Work you already have is not affected." }));
      }
      return c;
    }
    if (att || pf.readiness === "match_ready") return null;
    // The profile is complete, but something still stops invitations: say which, and offer the one action there is
    var title = pf.readiness === "verification_pending" ? "Almost ready for invitations" : pf.readiness === "availability_stale" ? "Your availability is out of date" : pf.readiness === "unavailable" ? "You are not taking new work" : "Your account is paused";
    var b = hcard(title), inner = h("div", { class: "hgap" });
    b.appendChild(inner);
    if (pf.readiness === "restricted") { inner.appendChild(h("p", { text: "Attorneys cannot invite you while your account is paused. Contact the Lawfecta Team." })); return b; }
    if (pf.readiness === "availability_stale") inner.appendChild(h("p", { text: "Attorneys cannot invite you until you confirm it again. Work you already have is not affected." }));
    inner.appendChild(h("div", { class: "hl" }, [hrow({ dot: "done", title: "Profile", badge: required + " of " + required + " details complete", tone: "ready" })].concat(eligibilityRows(pf))));
    if (pf.readiness === "availability_stale" || pf.readiness === "unavailable") inner.appendChild(h("div", { class: "hacts" }, h("button", { class: "blue", type: "button", onclick: function () { goProfile("sec-availability"); } }, pf.readiness === "unavailable" ? "Change availability" : "Confirm availability")));
    else if (pf.verification === "pending") inner.appendChild(h("p", { class: "hsub", text: "Invitations start when the review is done." }));
    return b;
  }
  function attentionRows(hm) {
    var att = me.side === "attorney", rows = [];
    var when = function (x) { var d = x.review_due_at || x.sign_by || x.due_date; return d ? Date.parse(d) : Infinity; };
    var urgent = function (x) { return x.kind === "pay" && !x.first ? 0 : 1; };
    (hm.attention || []).map(function (x, i) { return [x, i]; }).sort(function (a, b) {
      return urgent(a[0]) - urgent(b[0]) || (when(a[0]) === when(b[0]) ? 0 : when(a[0]) < when(b[0]) ? -1 : 1) || a[1] - b[1];
    }).map(function (p) { return p[0]; }).forEach(function (x) {
      if (x.kind === "review") rows.push(hrow({ title: "Review milestone " + x.seq, sub: x.gig_title + ". Delivered " + shortDate(x.delivered_at) + (x.review_due_at ? ". Review by " + shortDate(x.review_due_at) : "") + ".", act: "Review delivery", go: function () { openGig(x.gig_id); } }));
      else if (x.kind === "pay") rows.push(hrow({ title: x.first ? "Pay milestone " + (x.seq || 1) + " to start the work" : "The payment for milestone " + x.seq + " did not go through", sub: x.gig_title + ".", act: "Pay milestone", go: function () { openGig(x.gig_id); } }));
      else if (x.kind === "sign") rows.push(hrow({ title: "Agreement to sign", sub: x.gig_title + (x.sign_by ? ". Sign by " + shortDate(x.sign_by) : "") + ".", act: "Review and sign", go: function () { openGig(x.gig_id); } }));
      else if (x.kind === "proposals") rows.push(hrow({ title: x.n + (x.n === 1 ? " proposal to review" : " proposals to compare"), sub: "Gig: " + x.gig_title + ".", act: x.n === 1 ? "View proposal" : "Compare proposals", go: function () { openGig(x.gig_id, "proposals"); } }));
      else if (x.kind === "milestone") rows.push(hrow({ title: "Milestone " + x.seq + ": " + x.title, sub: x.gig_title + (x.client ? ", " + x.client : "") + (x.due_date ? ". Due " + shortDate(x.due_date) : "") + ". " + D.money(x.amount_cents) + " paid, held by Lawfecta" + (x.status === "changes_requested" ? ". Changes requested" : "") + ".", act: "View milestone", go: function () { openGig(x.gig_id); } }));
      else if (x.kind === "invitation") rows.push(hrow({ title: "Invitation: " + x.gig_title, sub: "Answering does not use your monthly proposals.", act: "View invitation", go: function () { openGig(x.gig_id, "details"); } }));
    });
    var pf = hm.profile || {};
    if (att && ((hm.firm || {}).missing_for_paid_work || []).length) rows.push(hrow({ title: "Firm details missing", sub: "Needed before you can sign an agreement and pay.", act: "Add details", go: function () { goProfile("sec-firm"); } }));
    if (att && pf.verification && pf.verification !== "verified" && pf.verification !== "not_required" && pf.verification !== "pending") rows.push(hrow({ title: "Bar license not verified yet", sub: "Needed before you can post a gig.", act: "Verify license", go: function () { goProfile("sec-verify"); } }));
    if (!att && pf.readiness === "match_ready" && pf.availability_due_at && Date.parse(pf.availability_due_at) - Date.now() < 3 * 86400000) rows.push(hrow({ title: "Availability: confirm by " + shortDate(pf.availability_due_at), sub: "You said: " + (pf.availability === "limited" ? "some hours only" : "available for new work") + ".", act: "Confirm availability", go: function () { goProfile("sec-availability"); } }));
    return rows;
  }
  // A number on Home opens its page at the list the number counts: the page opens, the list's card comes into view and
  // its heading takes focus (lists load a moment after the page, so the card is looked for briefly).
  function openList(toTab, heading, listFilter) {
    tab = toTab; gigs.id = null;
    if (listFilter) { gigs.listFilter = listFilter; gigs.listMore = false; }
    draw();
    var tries = 0, timer = setInterval(function () {
      var hd = [].filter.call(app.querySelectorAll(".nl-main h2, .wrap h2"), function (x) { return x.textContent.indexOf(heading) === 0; })[0];
      if (hd || ++tries > 25 || tab !== toTab) clearInterval(timer);
      if (!hd) return;
      hd.setAttribute("tabindex", "-1");
      (hd.closest(".card") || hd).scrollIntoView({ block: "start" });
      hd.focus({ preventScroll: true });
    }, 200);
  }
  function hstat(n, label, small, go) { return h("button", { class: "hstat", type: "button", onclick: go }, h("b", { text: String(n) }), h("span", { text: label }), small ? h("small", { text: small }) : null); }
  var ENG_BADGE = { signing: ["Waiting for signatures", "held"], signed: ["Waiting for the first payment", "held"], active: ["In progress", "ready"], paused: ["Paused", "held"], disputed: ["In dispute", "bad"] };
  function workBox(hm) {
    var att = me.side === "attorney", pf = hm.profile || {}, go = function () { tab = att ? "projects" : "work"; gigs.id = null; draw(); };
    var ready = att || pf.readiness === "match_ready", busy = (hm.active_projects || 0) + (hm.invitations || 0) > 0;
    var alerts = !att && (me.switches || {}).gig_alerts && (me.switches || {}).onboarding_widget ? h("button", { class: "linkish", type: "button", onclick: function () { tab = "ai"; settingsJump = "set-alerts"; draw(); } }, "Manage alerts") : null;
    if (!att && !ready && !busy) {
      var w = hcard("Work opportunities", alerts ? h("span", { style: "margin-left:auto" }, alerts) : null);
      w.appendChild(h("p", { text: pf.readiness === "incomplete" ? "Invitations start when your profile, the LinkedIn check and your availability are in place." : pf.readiness === "verification_pending" ? "Invitations start when the LinkedIn check is done." : "Invitations start again once the step above is done." }));
      return w;
    }
    var c = hcard(att ? "Your projects" : "Your work", alerts ? h("span", { style: "margin-left:auto" }, alerts) : null), inner = h("div", { class: "hgap" });
    c.appendChild(inner);
    var tiles = h("div", { class: "hstats" });
    if (att) {
      tiles.appendChild(hstat(hm.pending_reviews || 0, "Deliveries to review", null, function () { openList("projects", "Engagements"); }));
      tiles.appendChild(hstat(hm.active_projects || 0, "Active projects", null, function () { openList("projects", "Engagements"); }));
      tiles.appendChild(hstat(hm.open_gigs || 0, "Open gigs", null, function () { openList("projects", "Your gigs", "active"); }));
      tiles.appendChild(hstat(hm.draft_gigs || 0, "Gig drafts", null, function () { openList("projects", "Your gigs", "active"); }));
    } else {
      var pr = ent("fl.proposals");
      tiles.appendChild(hstat(hm.active_projects || 0, "Active projects", null, function () { openList("work", "Your engagements"); }));
      tiles.appendChild(hstat(hm.invitations || 0, "Invitations", null, function () { openList("work", "Invitations"); }));
      tiles.appendChild(hstat(D.money(hm.paid_out_month_cents || 0), "Paid out this month", D.money(hm.paid_out_cents || 0) + " all time", function () { tab = "earnings"; draw(); }));
      if (pr) tiles.appendChild(hstat(pr.limit === null || pr.limit === undefined ? "No limit" : Math.max((pr.limit || 0) - (pr.used || 0), 0), "Proposals left this month", null, function () { openList("work", "Sent proposals"); }));
    }
    inner.appendChild(tiles);
    if ((hm.projects || []).length) {
      inner.appendChild(h("div", { class: "hl" }, hm.projects.map(function (x) {
        var nx = x.next, b = x.awaiting_review ? ["Awaiting your review", "held"] : ENG_BADGE[x.status] || [x.status, ""];
        var sub = (x.other_name || "") + (nx ? ". Milestone " + nx.seq + (nx.due_date ? " due " + shortDate(nx.due_date) : "") : "") + ".";
        return hrow({ title: x.gig_title, sub: sub, badge: b[0], tone: b[1], go: function () { openGig(x.gig_id); } });
      })));
    } else inner.appendChild(h("p", { class: "hsub", text: att ? "No active projects yet. Post a gig from Projects, or ask DELA to plan a task." : "No active projects yet." }));
    return c;
  }
  function statusLine(hm) {
    var pf = hm.profile || {}, att = me.side === "attorney", parts = [];
    if (pf.ok === false || !pf.readiness || pf.readiness === "incomplete") return null;
    var part = function (text, warn, go) { return h("span", { class: "hpart" + (warn ? " warn" : "") }, h("span", { class: "hdot" + (warn ? " warn" : " done"), "aria-hidden": "true" }), go ? h("button", { class: "linkish", type: "button", onclick: go }, text) : text); };
    parts.push(part("Profile complete"));
    if (att) parts.push(pf.verification === "verified" ? part("Bar license verified") : pf.verification === "pending" ? part("Bar license: being checked", true) : part("Bar license not verified", true, function () { goProfile("sec-verify"); }));
    else {
      if (pf.readiness !== "match_ready") return null;
      if (pf.verification === "verified") parts.push(part("LinkedIn verified"));
      parts.push(part((pf.availability === "limited" ? "Some hours only" : "Available") + " until " + shortDate(pf.availability_due_at)));
    }
    var line = h("div", { class: "hstatus" }, parts);
    if (!att) line.appendChild(h("span", { class: "hsub", style: "margin-left:auto", text: "Attorneys can invite you." }));
    return line;
  }
  function planLine() {
    var s = sideInfo() || {}, pr = me.side === "freelancer" ? ent("fl.proposals") : null;
    var box = h("div", null);
    var plan = h("div", { hidden: true });
    var btn = h("button", { class: "linkish", type: "button", "aria-expanded": "false" }, "View plan");
    btn.addEventListener("click", function () { plan.hidden = !plan.hidden; btn.setAttribute("aria-expanded", String(!plan.hidden)); if (!plan.hidden && !plan.firstChild) plan.appendChild(planCard()); });
    box.appendChild(h("div", { class: "hline" }, h("span", { class: "hsub", text: (s.plan_name || "Your plan") + "." + (pr && pr.limit ? " " + Math.max(pr.limit - (pr.used || 0), 0) + " proposals left this month." : "") }), h("span", { style: "margin-left:auto" }, btn)));
    box.appendChild(plan);
    return box;
  }
  // Ask DELA on Home: one line. A longer talk continues on the Ask DELA page. The free answers here are the guide's
  // (Lawfecta's key, a daily number); they are separate from the DELA actions the Ask DELA page uses.
  function askBox() {
    var att = me.side === "attorney", sw = me.switches || {};
    var c = hcard("Ask DELA"), inner = h("div", { class: "hgap" });
    c.appendChild(inner);
    var openAsk = sw.ai_generation ? h("button", { class: "linkish", type: "button", onclick: function () { goTab(att ? "delegate" : "ask"); } }, "Open Ask DELA") : null;
    if (!sw.onboarding_widget) { if (openAsk) inner.appendChild(openAsk); else return null; return c; }
    inner.appendChild(h("p", { class: "hsub", text: "DELA is getting ready..." }));
    function mark(kind, step, ref) { return api.post("/guide/mark", { kind: kind, step: step || "", ref: ref || "", request_id: newId() }).catch(function () { return null; }); }
    function drawAsk(g) {
      D.clear(inner);
      if (!g || !g.ok || !g.on) { if (openAsk) inner.appendChild(openAsk); else c.remove(); return; }
      // DELA's next step for this member, with its buttons (tell DELA about the firm, tasks to hand off, compare the
      // proposals, a new gig that fits). One thing is left out: advice that only repeats the profile card on this page
      // (every button would open the Profile page while that card is showing).
      var acts = (g.choices || []).filter(function (x) { return x.id !== "not_for_me"; });
      var repeatsProfile = homeHasProfileCard && acts.length > 0 && acts.every(function (x) { return x.link && x.link.indexOf("tab=profile") >= 0; });
      if (!g.paused && g.message && !repeatsProfile) {
        inner.appendChild(h("p", { class: "hsub hsuggest", "aria-live": "polite", text: g.message }));
        if ((g.choices || []).length) inner.appendChild(h("div", { class: "hacts hsteps" }, g.choices.map(function (c, i) {
          return h("button", { class: (i === 0 && c.id !== "not_for_me" ? "blue" : "ghost") + " small", type: "button", onclick: function () { guideAct(g, c, mark, load); } }, c.label);
        })));
      }
      var q = h("input", { type: "text", maxlength: "1000", "aria-label": "Ask DELA a question", placeholder: "Ask a question..." });
      var send = h("button", { class: "send", type: "button", "aria-label": "Send" }, icon("send"));
      var answer = h("div", { "aria-live": "polite" });
      var leftText = function (n) { return n > 0 ? n + " free " + (n === 1 ? "answer" : "answers") + " remaining today." : GUIDE_ERR.guide_cap; };
      var left = h("p", { class: "hsub hleft", text: leftText(g.replies_left) });
      function ask() {
        var text = q.value.trim();
        D.clear(answer);
        if (text.length < 2) { q.focus(); return; }
        send.disabled = true;
        api.post("/guide/say", { text: text, request_id: newId() }).then(function (x) {
          send.disabled = false;
          D.clear(answer);
          if (!x.ok) { answer.appendChild(h("p", { class: "notice bad small", text: x.message || GUIDE_ERR[x.reason] || failText(x) })); return; }
          q.value = "";
          answer.appendChild(h("div", { class: "hanswer" }, h("p", { style: "margin:0", text: x.text })));
          left.textContent = leftText(x.replies_left);
        }).catch(function () { send.disabled = false; D.clear(answer); answer.appendChild(h("p", { class: "notice bad small", text: GUIDE_ERR.ai_failed })); });
      }
      send.addEventListener("click", ask);
      q.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ask(); } });
      if (g.replies_left > 0) {
        inner.appendChild(h("div", { class: "hask" }, q, send)); inner.appendChild(answer);
        homeAsk = function (text) { q.value = text; ask(); c.scrollIntoView({ block: "nearest" }); };
        var hb = homeHelpBtn; if (hb) hb.hidden = false;
      }
      inner.appendChild(left);
      if (att && sw.ai_generation) loadUsage().then(function (u) { if (u && u.actions && u.actions.limit !== null) left.parentNode && inner.insertBefore(h("p", { class: "hsub", text: "Planning a task uses DELA actions: " + u.actions.used + " of " + u.actions.limit + " used this month." }), left.nextSibling); });
      var links = h("div", { class: "hacts" });
      if (openAsk) links.appendChild(openAsk);
      // Pausing suggestions is a preference: it lives on the Settings page, under "Suggestions and alerts"
      links.appendChild(h("button", { class: "linkish", type: "button", onclick: function () { tab = "ai"; settingsJump = "set-alerts"; draw(); } }, g.paused ? "Suggestions are paused" : "Suggestion settings"));
      inner.appendChild(links);
    }
    function load() { api.get("/guide").then(drawAsk).catch(function () { drawAsk(null); }); }
    load();
    return c;
  }
  var homeHelpBtn = null, homeHasProfileCard = false;
  // What a guide button does, the same on the old Home card and in the Ask DELA card of the new Home
  function guideAct(g, c, mark, load) {
    if (c.id === "not_for_me") { mark("gig_seen", g.step, c.gig).then(load); return; }
    mark("chose", g.step, c.id + ":" + (c.starter || c.gig || c.link || ""));
    if (c.id === "start_playbook") {
      docStarters().then(function (st) {
        var s = (st.starters || []).filter(function (x) { return x.id === c.starter; })[0];
        lib.guideNew = s ? { type: s.type, starter: s } : {};
        lib.pb = null; lib.importId = null; tab = "library"; draw();
      }).catch(function () { lib.guideNew = {}; tab = "library"; draw(); });
      return;
    }
    if (c.id === "describe_task" || c.id === "firm") { lib.guideNew = {}; lib.pb = null; lib.importId = null; tab = "library"; draw(); return; }
    var go = c.link ? noticeAction(c.link) : null;
    if (go) location.assign(go.href);
  }
  function homeNew() {
    var hm = me.home || {}, att = me.side === "attorney", fn = D.firstName(me.person.name);
    var el = h("div", null, h("h1", { text: fn && fn !== "there" ? "Hi, " + fn : "Hi" }));
    var left = h("div", { class: "hstack" });
    homeAsk = null;
    var pb = profileBox(hm), rows = attentionRows(hm);
    homeHelpBtn = pb && pb.helpBtn ? pb.helpBtn : null;
    homeHasProfileCard = !!pb;
    var attention = rows.length ? hcard("Needs your attention", h("span", { class: "badge pink", text: String(rows.length) })) : null;
    if (attention) attention.appendChild(h("div", { class: "hl" }, rows));
    // Commitments first: what needs the member, then their work, then the profile. With no work in hand and nothing
    // waiting, the profile card leads.
    var busy = (hm.active_projects || 0) + (hm.invitations || 0) > 0;
    if (attention) left.appendChild(attention);
    if (attention || busy) { left.appendChild(workBox(hm)); if (pb) left.appendChild(pb); }
    else { if (pb) left.appendChild(pb); left.appendChild(workBox(hm)); }
    var st = statusLine(hm);
    if (st) left.appendChild(st);
    left.appendChild(planLine());
    var ask = askBox();
    el.appendChild(h("div", { class: "hcols" + (localPref("side.folded") ? " capped" : "") }, left, ask));
    return el;
  }

  function guideBox() {
    var box = h("section", { class: "card guide", "aria-label": "DELA guide" }, h("p", { class: "small muted", text: "DELA is getting your next step ready..." }));
    function mark(kind, step, ref) { return api.post("/guide/mark", { kind: kind, step: step || "", ref: ref || "", request_id: newId() }).catch(function () { return null; }); }
    function act(g, c) {
      if (c.id === "not_for_me") { mark("gig_seen", g.step, c.gig).then(load); return; }
      mark("chose", g.step, c.id + ":" + (c.starter || c.gig || c.link || ""));
      if (c.id === "start_playbook") {
        docStarters().then(function (st) {
          var s = (st.starters || []).filter(function (x) { return x.id === c.starter; })[0];
          lib.guideNew = s ? { type: s.type, starter: s } : {};
          lib.pb = null; lib.importId = null; tab = "library"; draw();
        }).catch(function () { lib.guideNew = {}; tab = "library"; draw(); });
        return;
      }
      if (c.id === "describe_task" || c.id === "firm") { lib.guideNew = {}; lib.pb = null; lib.importId = null; tab = "library"; draw(); return; }
      var go = c.link ? noticeAction(c.link) : null;
      if (go) location.assign(go.href);
    }
    function choiceButtons(g, list) {
      return h("div", { class: "guide-choices" }, (list || []).map(function (c, i) {
        return h("button", { class: (i === 0 && c.id !== "not_for_me" ? "blue" : "ghost") + " small", type: "button", onclick: function () { act(g, c); } }, c.label);
      }));
    }
    function alertsRow(g) {
      if (me.side !== "freelancer" || !g.alerts_on) return null;
      var pr = g.prefs || {};
      function toggle(key, label) {
        var cb = h("input", { type: "checkbox", checked: pr[key] !== false });
        cb.addEventListener("change", function () {
          var body = {}; body[key] = cb.checked;
          api.post("/guide/prefs", body).then(function (x) { if (!x.ok) { cb.checked = !cb.checked; D.toast(app, "Not saved. Try again.", true); } else D.toast(app, "Saved"); });
        });
        return h("label", { class: "guide-toggle" }, cb, " " + label);
      }
      return h("details", { class: "guide-alerts" }, h("summary", { text: "New gig alerts" }),
        h("p", { class: "small muted", text: "When a gig that fits you is posted, DELA can tell you here, by email and in Notices. Turn off any of them." }),
        h("div", { class: "row", style: "flex-wrap:wrap;gap:14px" }, toggle("alerts_in_guide", "In this guide"), toggle("alerts_email", "By email"), toggle("alerts_notices", "In Notices")));
    }
    function draw1(g) {
      D.clear(box);
      if (!g.ok || !g.on) { box.remove(); return; }
      var head = h("div", { class: "row guide-head" }, D.logo(root, 28), h("strong", { class: "grow", text: "DELA guide" }));
      if (g.paused) {
        head.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { mark("resumed", g.step).then(load); } }, "Open the guide"));
        box.appendChild(head);
        box.appendChild(h("p", { class: "small muted", text: "Paused. DELA opens it again tomorrow, or sooner when something new needs you." }));
        return;
      }
      head.appendChild(h("button", { class: "ghost small", type: "button", "aria-label": "Pause the guide for a day", onclick: function () { mark("paused", g.step).then(load); } }, "Pause"));
      box.appendChild(head);
      box.appendChild(h("div", { class: "guide-msg", "aria-live": "polite" }, h("p", { text: g.message })));
      box.appendChild(choiceButtons(g, g.choices));
      var log = h("div", { class: "guide-log", "aria-live": "polite" });
      box.appendChild(log);
      var q = h("input", { type: "text", maxlength: "1000", "aria-label": "Ask the DELA guide a question", placeholder: "Ask the DELA guide a question" });
      var ask = h("button", { class: "ghost small", type: "button" }, "Ask");
      var left = h("p", { class: "small muted", text: g.replies_left > 0 ? "Free answers left today: " + g.replies_left + ". They do not use your DELA actions." : GUIDE_ERR.guide_cap });
      function send() {
        var text = q.value.trim();
        if (text.length < 2) { q.focus(); return; }
        ask.disabled = true;
        log.appendChild(h("p", { class: "guide-me", text: text }));
        api.post("/guide/say", { text: text, request_id: newId() }).then(function (x) {
          ask.disabled = false;
          if (!x.ok) { log.appendChild(h("p", { class: "notice bad small", text: x.message || GUIDE_ERR[x.reason] || failText(x) })); return; }
          q.value = "";
          log.appendChild(h("div", { class: "guide-msg" }, h("p", { text: x.text }), x.choice ? choiceButtons(g, [x.choice]) : null));
          left.textContent = x.replies_left > 0 ? "Free answers left today: " + x.replies_left + ". They do not use your DELA actions." : GUIDE_ERR.guide_cap;
        }).catch(function () { ask.disabled = false; log.appendChild(h("p", { class: "notice bad small", text: GUIDE_ERR.ai_failed })); });
      }
      ask.addEventListener("click", send);
      q.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); send(); } });
      box.appendChild(h("div", { class: "row guide-ask" }, q, ask));
      box.appendChild(left);
      var alerts = alertsRow(g);
      if (alerts) box.appendChild(alerts);
      if (me.side === "attorney" && (me.switches || {}).guided_setup) box.appendChild(h("p", { class: "small" }, h("button", { class: "linkish", type: "button", onclick: function () { tab = "setup"; draw(); } }, "See all setup steps")));
    }
    function load() { api.get("/guide").then(draw1).catch(function () { box.remove(); }); }
    load();
    return box;
  }

  var VER_BADGE = { not_started: "Not started", pending: "Being checked", verified: "Verified", rejected: "Not verified", expired: "Renewal needed" };
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
      h("h1", { text: greeting() + (String((me.person || {}).name || "").trim() ? ", " + D.firstName(me.person.name) : "") }),
      h("p", { class: "muted", text: "Make room for your highest-value work." }),
      (me.switches || {}).onboarding_widget ? guideBox() : null,
      h("div", { class: "hero" },
        h("div", { class: "eyebrow", text: "AI Delegation Center" }),
        h("h2", null, "Plan. Delegate.", h("br"), "Get it done."),
        h("p", { text: "DELA turns your to-do list into a clear plan and the right people to carry it out." }),
        (me.switches || {}).ai_generation
          ? h("button", { class: "pill-white", onclick: function () { tab = "delegate"; draw(); } }, "Ask DELA to plan a task")
          : h("button", { class: "pill-white", disabled: true, title: "Opens in the next DELA update" }, "Start a new delegation (opening soon)")),
      (me.switches || {}).guided_setup && !(me.switches || {}).onboarding_widget ? setupHomeCard() : null,
      h("div", { class: "stats" },
        // Real counts from the server (AI review 0.9.0, payments 3); a tile is left out if its count is missing
        me.home ? stat("☰", me.home.open_gigs, "Open gigs") : null,
        me.home && typeof me.home.draft_gigs === "number" ? stat("✎", me.home.draft_gigs, "Gig drafts") : null,
        me.home ? stat("▣", me.home.active_projects, "Active projects") : null,
        me.home ? stat("!", me.home.pending_reviews, "Deliveries to review") : null,
        draftTile()),
      h("div", { class: "card" }, h("div", { class: "row" }, h("h2", { text: "Verification" }), h("span", { class: "badge " + ({ verified: "ready", pending: "held", rejected: "bad", expired: "held" }[s.verification_state] || ""), text: VER_BADGE[s.verification_state] || s.verification_state })), h("p", { text: ver }),
        (me.switches || {}).profiles ? h("button", { class: "blue small", onclick: function () { tab = "profile"; draw(); } }, s.verification_state === "verified" ? "Open your profile" : "Set up your profile and verification") : null),
      h("h2", { style: "margin-top:22px", text: "What DELA will do for you" }),
      (me.switches || {}).playbook_library
        ? h("div", { class: "work" }, h("span", { class: "chip", text: "1" }), h("div", null, h("h3", { text: "Documents" }), h("div", { class: "muted small", text: "Describe a task. DELA asks what it needs and builds a step by step plan you approve." })), h("span", { class: "grow" }),
          h("button", { class: "ghost small", onclick: function () { tab = "library"; lib.pb = null; lib.importId = null; draw(); } }, "Open the Library"))
        : soon(1, "Documents", "Describe a task. DELA asks what it needs and builds a step by step plan you approve."),
      (me.switches || {}).flex_gigs ? liveRow(2, "Flex Gigs", gigsEnt ? "Post approved work with a budget range. Your plan allows " + (gigsEnt.unlimited ? "unlimited" : gigsEnt.limit) + " open at once." : "Post approved work with a budget range.", "Open Projects", "projects")
        : soon(2, "Flex Gigs", gigsEnt ? "Post approved work with a budget range. Your plan allows " + (gigsEnt.unlimited ? "unlimited" : gigsEnt.limit) + " open at once." : "Post approved work with a budget range."),
      (me.switches || {}).talent_search ? liveRow(3, "Talent", "See available, qualified freelancers and invite them to a gig.", "Open Talent", "talent")
        : soon(3, "Talent and your bench", "See available, qualified paralegals, including people you have worked with before."),
      (me.switches || {}).engagements ? liveRow(4, "Engagements and payments", "Sign an agreement and pay each milestone before work starts.", "Open Projects", "projects")
        : soon(4, "Engagements and payments", "Sign a fixed-fee agreement and fund each milestone before work starts."),
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
      h("h1", { text: greeting() + (String((me.person || {}).name || "").trim() ? ", " + D.firstName(me.person.name) : "") }),
      h("p", { class: "muted", text: "Get match-ready, win work from attorneys and get paid for each milestone you deliver." }),
      (me.switches || {}).onboarding_widget ? guideBox() : null,
      h("div", { class: "hero navy" },
        h("div", { class: "eyebrow", text: "Match readiness" }),
        h("h2", { text: "Your profile, through an attorney's eyes" }),
        h("p", { text: ready }),
        h("span", { class: "badge " + (s.readiness_state === "match_ready" ? "ready" : "held"), text: STATE_BADGE[s.readiness_state] || s.readiness_state })),
      h("div", { class: "stats" },
        stat("✉", props ? (props.unlimited ? "No cap" : props.remaining) : 0, "Proposals left this month"),
        me.home ? stat("★", me.home.invitations, "Invitations") : null,
        me.home ? stat("▣", me.home.active_projects, "Active projects") : null,
        me.home ? stat("$", D.money(me.home.paid_out_cents), "Paid out") : null),
      (me.switches || {}).profiles
        ? h("div", { class: "card" }, h("h2", { text: "Your match checklist" }), h("p", { class: "muted small", text: ready || "Open your profile to see exactly what is missing." }),
            h("button", { class: "blue small", onclick: function () { tab = "profile"; draw(); } }, s.readiness_state === "match_ready" ? "Open your profile" : "Finish your profile"))
        : h("div", { class: "card" }, h("h2", { text: "Your match checklist" }), h("p", { class: "muted small", text: "Opening soon. These are the items attorneys need to see before DELA can match you." }),
            items.map(function (t) { return h("div", { class: "check" }, h("i", { "aria-hidden": "true" }), h("span", { text: t })); })),
      h("h2", { style: "margin-top:22px", text: "What DELA will do for you" }),
      (me.switches || {}).profiles ? liveRow(1, "Your profile", "Build a strong profile and see exactly what is still missing.", "Open your profile", "profile")
        : soon(1, "Profile Builder and Profile Audit", "Build a strong profile and see exactly what to improve."),
      (me.switches || {}).profiles ? liveRow(2, "Services", "List your services and prices on your profile. Promotions and pitches come in a later update.", "Open your profile", "profile")
        : soon(2, "Services, promotions and pitches", "Publish clear services. Nothing goes live without your approval."),
      (me.switches || {}).flex_gigs ? liveRow(3, "Matches and proposals", "See gigs that fit you, with why, and send proposals with your price, what is included and your schedule.", "Open Work", "work")
        : soon(3, "Matches and proposals", "See work that fits you and send proposals with price, milestones and timeline."),
      (me.switches || {}).engagements ? liveRow(4, "Active work and payouts", "Deliver milestones, get DELA's check, and track each payout.", "Open Earnings", "earnings")
        : soon(4, "Active work and payouts", "Deliver milestones, get DELA's check, and track each payout."),
      planCard());
  }

  function sectionSoon(title, text) {
    return h("div", null, h("h1", { text: title }), h("div", { class: "card" }, h("span", { class: "soon", text: "Coming soon" }), h("p", { style: "margin-top:6px", text: text })));
  }

  var SECTIONS = {
    delegate: ["Delegate", "Start a delegation, answer DELA's questions, and approve a step by step document. This opens in the next DELA update."],
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
    client_name: "a client's name", account_number: "an account number", case_caption: "a case name", phone_number: "a phone number", email_address: "an email address", street_address: "a street address",
    health_information: "health information", biometric_data: "biometric data", gov_id: "a government ID number", ssn: "a Social Security number or ITIN", card: "a card number", bank: "a bank account number", password: "a password or login" };
  // The server's own words for a client-details reminder (step 9c), or the screen's older wording when the switch is off
  function ciNote(x, fallback) { return x && x.note ? x.note : fallback; }
  function kindsText(k) { return (k || []).map(function (x) { return KIND_WORDS[x] || x.split("_").join(" "); }).join(", "); }
  function mbText(bytes) {
    if (bytes === null || bytes === undefined) return "no cap";
    if (bytes < 1048576) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    var v = bytes / 1048576;
    return v >= 1000 ? String(Math.round(v / 100) / 10) + " GB" : (v < 10 ? v.toFixed(1) : String(Math.round(v))) + " MB";
  }
  // The full notice is at the top of every page; next to where people type or upload, a short reminder
  // The sensitive data rule (Stacey 2026-11-05, docs/briefs/step-6d-security-sensitive-data.md): these six kinds are never
  // entered or uploaded, only linked from the firm's own storage (AI review 0.9.0, privacy 3)
  var SENSITIVE_KINDS = "SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords";
  // Form limits come from the server with the account (AI review 0.9.1, payments 2). Missing means no limit on the
  // screen: the server still refuses anything over its limit.
  function lim(key) { var v = me && me.limits && me.limits[key]; return typeof v === "number" && v > 0 ? v : Infinity; }
  function limAttr(key) { var v = lim(key); return v === Infinity ? null : String(v); }
  // Step 8b Part C (R06, answer 6): beside AI writing boxes the notice says to keep sensitive data in your own storage,
  // without "share a link", because links should not go to the AI either. Upload and sharing areas keep notice().
  function aiNotice() { return h("p", { class: "small muted", style: "margin:0 0 8px", role: "note", text: "Never enter sensitive data: " + SENSITIVE_KINDS + ". Keep it in your own storage. You are responsible for what you enter." }); }
  function notice() { return h("p", { class: "small muted", style: "margin:0 0 8px", role: "note", text: "Never enter sensitive data: " + SENSITIVE_KINDS + ". Share a link from your own storage instead. You are responsible for what you enter." }); }

  // ---------- Ask DELA ----------

  var chat = { id: null, list: [], messages: [], files: [], attach: [], pending: null, busy: false, problem: null, ai: null, picking: false };
  var chatEl = null;

  function chatView() {
    chatEl = h("div", null, h("p", { class: "muted", text: "Loading..." }));
    Promise.all([api.get("/ai"), api.get("/ai/chats"), me.side === "attorney" && (me.switches || {}).file_uploads ? api.get("/files").catch(function () { return null; }) : Promise.resolve(null)])
      .then(function (r) {
        chat.ai = r[0];
        chat.list = r[1].items || [];
        // Files saved from a job are never sent to the AI
        chat.files = r[2] && r[2].ok ? r[2].files.filter(function (f) { return f.status === "ready" && !f.from_job; }) : [];
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
    return c.unlimited ? "Using Lawfecta's AI." : "Using Lawfecta's AI: " + (c.remaining === null ? c.limit : c.remaining) + " of " + c.limit + " included DELA actions left this month.";
  }

  function drawChat() {
    if (!chatEl) return;
    D.clear(chatEl);
    var head = h("div", { class: "row", style: "margin:18px 0 4px" },
      h("h1", { style: "margin:0", class: "grow", text: "Ask DELA" }),
      h("button", { class: "ghost small", onclick: function () { chat.id = null; chat.messages = []; chat.problem = null; chat.pending = null; chat.attach = []; chat.clientOk = null; drawChat(); } }, "New chat"),
      h("button", { class: "ghost small", onclick: function () { tab = "ai"; draw(); } }, setName()));
    chatEl.appendChild(head);
    chatEl.appendChild(h("p", { class: "muted", text: me.side === "attorney"
      ? "Describe a task you want to hand off, ask for a checklist, or attach a process write-up and ask DELA to turn it into an SOP. " + creditsLine()
      : "Plan your work, draft a checklist or tidy a process. " + creditsLine() }));
    if (chat.list.length) {
      var sel = h("select", { "aria-label": "Earlier chats", onchange: function () { if (sel.value) openChat(sel.value); } },
        h("option", { value: "", text: chat.id ? "Switch to another chat" : "Open an earlier chat" }),
        chat.list.map(function (c) { return h("option", { value: c.id, text: c.title + " (" + D.date(c.updated_at) + ")" }); }));
      var curChat = chat.list.filter(function (c) { return c.id === chat.id; })[0];
      var acts = h("div", { class: "row", style: "flex-wrap:wrap" }, sel);
      if (curChat) {
        acts.appendChild(curChat.saved ? h("span", { class: "small muted", text: "Saved to your library" })
          : h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/ai/chat/save", { id: chat.id }).then(function (x) { if (!x.ok) throw x; curChat.saved = true; curChat.delete_at = null; drawChat(); D.toast(app, "Saved. This chat is kept until you delete it."); }).catch(err);
          } }, "Save to library"));
        var delB = h("button", { class: "ghost small", type: "button" }, "Delete this chat");
        delB.addEventListener("click", function () {
          D.clear(acts);
          acts.appendChild(h("span", { class: "small grow", text: "Delete this chat for good? This cannot be undone." }));
          acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: drawChat }, "Cancel"));
          acts.appendChild(h("button", { class: "danger small", type: "button", onclick: function () {
            api.post("/ai/chat/delete", { id: chat.id }).then(function () { chat.list = chat.list.filter(function (c) { return c.id !== chat.id; }); chat.id = null; chat.messages = []; drawChat(); D.toast(app, "Chat deleted"); }).catch(err);
          } }, "Yes, delete"));
        });
        acts.appendChild(delB);
      }
      chatEl.appendChild(acts);
      if (curChat && !curChat.saved && curChat.delete_at) chatEl.appendChild(h("p", { class: "small muted", text: "Unsaved chats are deleted after a set time without use. This one will be deleted on " + D.date(curChat.delete_at) + " unless you save it." }));
      var soon = chat.list.filter(function (c) { return c.due_soon; });
      if (soon.length) chatEl.appendChild(h("p", { class: "notice", role: "status", text: soon.length + (soon.length === 1 ? " chat is" : " chats are") + " due to be deleted soon: " + soon.map(function (c) { return c.title + " (" + D.date(c.delete_at) + ")"; }).join(", ") + ". Open a chat and click \"Save to library\" to keep it." }));
    }
    var list = h("div", { class: "chat", "aria-live": "polite" });
    // A new chat: the message box comes first, right under the heading, with an example to use (UX review A01)
    var fresh = !chat.messages.length && !chat.pending;
    var EXAMPLE = "Turn my notes on opening a new matter into a step by step checklist a paralegal can follow.";
    if (fresh) list.appendChild(h("div", { class: "card soft", id: "chat-example" }, h("p", { style: "margin:0 0 6px", text: "Example: \"" + EXAMPLE + "\"" }),
      h("button", { class: "ghost small", type: "button", onclick: function () { if (composerText) { composerText.value = EXAMPLE; composerText.focus(); } } }, "Use this example")));
    chat.messages.forEach(function (m) { list.appendChild(bubble(m)); });
    if (chat.pending && chat.busy) list.appendChild(h("div", { class: "msg user", text: chat.pending.content }));
    if (chat.busy) list.appendChild(h("div", { class: "msg assistant muted", text: "DELA is checking your message, then answering..." }));
    if (fresh) { chatEl.appendChild(composer()); if (chat.problem) chatEl.appendChild(problemBox(chat.problem)); chatEl.appendChild(list); }
    else { chatEl.appendChild(list); if (chat.problem) chatEl.appendChild(problemBox(chat.problem)); chatEl.appendChild(composer()); }
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
      aiNotice(),
      attachRow,
      ta,
      helperButton("improve_request", "✦ Improve my request", function () { return { text: ta.value }; }, { field: function (x) { return x.field === "request" ? ta : null; }, toast: "Added to your message. Nothing is sent until you click Send." }),
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
    if (!chat.files.length) return h("p", { class: "small muted", text: "No files ready yet. Upload process documents on the Files page, then attach them here." });
    return h("div", { class: "pick" }, chat.files.map(function (f) {
      var on = chat.attach.some(function (x) { return x.id === f.id; });
      var cb = h("input", { type: "checkbox", checked: on });
      cb.addEventListener("change", function () {
        if (cb.checked) { if (chat.attach.length >= lim("chat_attach_max")) { cb.checked = false; D.toast(app, D.errorText("too_many_files"), true); return; } chat.attach.push({ id: f.id, name: f.name }); }
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
    // "Send anyway" or "Continue" confirms this one message
    if (extra.confirm_no_client_info) p.confirmed = true;
    if (extra.remember) p.remember = true;
    // Fix (AI review 0.10.0, security 1 and privacy 1): the reminder before client details go to DELA's AI shows once per
    // conversation (step 9c, question 2). Only that reminder is remembered, only for this conversation's real ID, and the
    // server then skips only that reminder: never the health and biometric one, and never the check with the switch off.
    p.detailsOk = !!(chat.clientOk && chat.id && chat.clientOk === chat.id);
    chat.busy = true;
    chat.problem = null;
    drawChat();
    api.post("/ai/chat/send", { content: p.content, request_id: p.request_id, chat_id: chat.id, file_ids: p.file_ids, attempt: p.attempt,
      lawfecta_once: extra.lawfecta_once === true, confirm_no_client_info: p.confirmed === true, client_details_ok: p.detailsOk === true }).then(function (r) {
      chat.busy = false;
      if (r.chat_id) chat.id = r.chat_id;
      if (r.ok && p.remember && chat.id) chat.clientOk = chat.id;
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
    var once = ai.backup_credits !== false ? btn("Use Lawfecta's DELA actions this time", function () { send({ lawfecta_once: true, retry: true }); }, "blue") : null;
    if (pr.reason === "sensitive_data") {
      // Sensitive data never goes, so there is no "send anyway" (step 9c)
      box.appendChild(h("p", { text: pr.message || D.errorText("sensitive_data") }));
      box.appendChild(h("div", { class: "row" }, btn("Edit my message", function () { chat.problem = null; drawChat(); if (composerText) composerText.focus(); })));
    } else if (pr.reason === "looks_like_client_info") {
      box.appendChild(h("p", { text: ciNote(pr, "This message may include " + kindsText(pr.kinds) + ". Confidential client information does not belong in DELA. Please replace names and numbers with placeholders such as [Client Name] or [Case Number].") }));
      box.appendChild(h("div", { class: "row" }, btn("Edit my message", function () { chat.problem = null; drawChat(); if (composerText) composerText.focus(); }),
        btn(pr.rule === "ai" ? "Continue" : pr.rule ? "Send anyway" : "Send anyway, it has no client information", function () { send({ confirm_no_client_info: true, remember: pr.rule === "ai" }); })));
    } else if (pr.reason === "ai_failed" && pr.source !== "lawfecta") {
      var k = ai.own_key || ai.firm_key || {};
      box.appendChild(h("p", { text: "Your " + providerName(k.provider) + " key did not work: " + (KEY_PROBLEM[pr.code] || "the provider refused the request.") + " Nothing was sent with Lawfecta's key." }));
      box.appendChild(h("div", { class: "row" }, btn("Try again", function () { send({ retry: true }); }), fix, once));
    } else if (pr.reason === "ai_failed") {
      box.appendChild(h("p", { text: "DELA's AI could not answer: " + (KEY_PROBLEM[pr.code] || "something went wrong.") + " No DELA actions were used." }));
      box.appendChild(h("div", { class: "row" }, btn("Try again", function () { send({ retry: true }); })));
    } else if (pr.reason === "no_key" || pr.reason === "key_unreadable") {
      box.appendChild(h("p", { text: D.errorText(pr.reason) }));
      box.appendChild(h("div", { class: "row" }, fix, once));
    } else if (pr.reason === "no_credits_left") {
      if (me.side === "attorney" && !pr.popped) { pr.popped = true; limitPopup("actions"); }
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
    if (r.reason === "no_credits_left") return "Talking uses your included DELA actions, and they are used up this month. You can type instead.";
    return D.errorText(r.reason || "server_error");
  }

  // ---------- AI settings ----------

  var aiEl = null;
  // ---------- Step 15: Settings additions and the Help page ----------
  var settingsJump = null;
  function settingsTop() {
    var box = h("div", null), sw = me.switches || {}, ap = me.appearance || {};
    var acct = D.accountCard(me);
    box.appendChild(acct);
    if (settingsJump === "set-account") { settingsJump = null; setTimeout(function () { acct.scrollIntoView({ block: "start" }); var hd = acct.querySelector("h2"); if (hd) { hd.setAttribute("tabindex", "-1"); hd.focus({ preventScroll: true }); } }, 60); }
    if (ap.on) {
      var card = h("div", { class: "card", id: "set-appearance" }, h("h2", { text: "Appearance" }), h("p", { class: "small muted", text: "How DELA looks for you, on every device you sign in on." }));
      var group = h("div", { class: "pills", role: "group", "aria-label": "Appearance" });
      [["device", "Match my device"], ["light", "Light"], ["dark", "Dark"]].forEach(function (o) {
        group.appendChild(h("button", { type: "button", "aria-pressed": String(ap.mode === o[0]), onclick: function () {
          api.post("/me/appearance", { mode: o[0] }).then(function (x) { if (!x.ok) throw x; me.appearance = { on: true, mode: x.mode }; applyTheme(); D.toast(app, "Appearance: " + o[1]); draw(); })
            .catch(function (e) { D.toast(app, D.errorText(e && (e.reason || e.message)), true); });
        } }, o[1]));
      });
      card.appendChild(group);
      box.appendChild(card);
    }
    if (sw.onboarding_widget) {
      var sug = h("div", { class: "card", id: "set-alerts" }, h("h2", { text: "Suggestions and alerts" }), h("p", { class: "small muted", text: "Loading..." }));
      box.appendChild(sug);
      var load = function () {
        api.get("/guide").then(function (g) {
          D.clear(sug);
          sug.appendChild(h("h2", { text: "Suggestions and alerts" }));
          if (!g.ok || !g.on) { sug.appendChild(h("p", { class: "small muted", text: "Nothing to set here yet." })); return; }
          sug.appendChild(h("p", { class: "small", text: g.paused ? "DELA's suggestions on Home are paused. They come back tomorrow, or sooner when something new needs you." : "DELA suggests your next step on Home. Pausing hides the suggestions for a day." }));
          sug.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/guide/mark", { kind: g.paused ? "resumed" : "paused", step: g.step || "", ref: "", request_id: newId() }).then(load).catch(function () {}); } }, g.paused ? "Resume suggestions" : "Pause suggestions"));
          if (me.side === "freelancer" && g.alerts_on) {
            var pr = g.prefs || {};
            var toggle = function (key, label) {
              var cb = h("input", { type: "checkbox", checked: pr[key] !== false });
              cb.addEventListener("change", function () { var body = {}; body[key] = cb.checked; api.post("/guide/prefs", body).then(function (x) { if (!x.ok) { cb.checked = !cb.checked; D.toast(app, "Not saved. Try again.", true); } else D.toast(app, "Saved"); }); });
              return h("label", { class: "guide-toggle" }, cb, " " + label);
            };
            sug.appendChild(h("h3", { style: "margin-top:14px", text: "New gig alerts" }));
            sug.appendChild(h("p", { class: "small muted", text: "When a gig that fits you is posted, DELA can tell you on Home, by email and in Notices. Turn off any of them." }));
            sug.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;gap:14px" }, toggle("alerts_in_guide", "On Home"), toggle("alerts_email", "By email"), toggle("alerts_notices", "In Notices")));
            // The email choice below wins: with reminder and alert emails off, no gig alert is emailed
            sug.appendChild(h("p", { class: "small notice", id: "alerts-email-note", hidden: emailsOff !== true, text: "Reminder and alert emails are off, so gig alerts are not emailed. Turn them on in the card \"Emails\" below." }));
          }
          if (settingsJump === "set-alerts") { settingsJump = null; sug.scrollIntoView({ block: "start" }); }
        }).catch(function () { D.clear(sug); sug.appendChild(h("h2", { text: "Suggestions and alerts" })); sug.appendChild(h("p", { class: "notice bad small", text: "These settings could not load. Reload the page to try again." })); });
      };
      load();
    }
    box.appendChild(emailsCard());
    return box;
  }
  function helpView() {
    var sw = me.switches || {}, att = me.side === "attorney";
    var el = h("div", null, h("h1", { text: "Help" }));
    var list = h("div", { class: "hl" });
    if (sw.ai_generation) list.appendChild(hrow({ title: "Ask DELA", sub: "Ask how something in DELA works, or get help with a task.", go: function () { goTab(att ? "delegate" : "ask"); } }));
    if (att && sw.guided_setup) list.appendChild(hrow({ title: "See all setup steps", sub: "The six steps of getting set up, with what is done and what is left.", go: function () { goTab("setup"); } }));
    if (sw.profiles) list.appendChild(hrow({ title: "Your profile", sub: att ? "Firm details, license verification and your profile." : "Your profile, the LinkedIn check and your availability.", go: function () { goProfile(null); } }));
    list.appendChild(h("a", { class: "hrow", href: "/security#contact", style: "text-decoration:none" }, h("span", { class: "what" }, h("b", { text: "Contact the Lawfecta Team" }), h("span", { class: "sub", text: "Opens the contact form on the Security page." })), icon("chev")));
    list.appendChild(h("a", { class: "hrow", href: "/security", style: "text-decoration:none" }, h("span", { class: "what" }, h("b", { text: "How DELA keeps your information safe" }), h("span", { class: "sub", text: "The Security page." })), icon("chev")));
    el.appendChild(h("div", { class: "card" }, list));
    return el;
  }

  function aiSettingsView() {
    aiEl = h("div", null, h("p", { class: "muted", text: "Loading..." }));
    loadAi();
    return aiEl;
  }
  function loadAi() { api.get("/ai").then(function (r) { chat.ai = r; drawAi(r); }).catch(function (e) { D.clear(aiEl); aiEl.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); }); }

  function drawAi(ai) {
    D.clear(aiEl);
    aiEl.appendChild(h("h1", { text: NL() ? "Settings" : "AI settings" }));
    aiEl.appendChild(h("p", { class: "muted", text: "These settings are for your " + D.SIDE[me.side] + " workspace only." }));
    if (NL()) { aiEl.appendChild(settingsTop()); aiEl.appendChild(h("h2", { style: "margin-top:20px", text: "AI and messages" })); }
    else { aiEl.appendChild(D.accountCard(me)); if (settingsJump === "set-account") settingsJump = null; }
    var c = ai.credits;
    var radios = h("div", null,
      choice("lawfecta", "Use Lawfecta's AI", c ? (c.unlimited ? "Included with your plan." : "Included with your plan: " + (c.remaining === null ? c.limit : c.remaining) + " of " + c.limit + " DELA actions left this month. DELA actions reset on the 1st of each month (Pacific time).") : "Included with your plan."),
      choice("own_key", "Use my own key", ai.byok_on ? "Your OpenAI or Claude account pays for the AI. Your included DELA actions stay as a backup you can choose to use." : "Opens soon."));
    function choice(v, label, sub) {
      var r = h("input", { type: "radio", name: "dela-ai-mode", value: v, checked: ai.mode === v, disabled: v === "own_key" && !ai.byok_on });
      r.addEventListener("change", function () {
        api.post("/ai/mode", { mode: v }).then(function (x) { if (x.ok === false) throw new Error(x.reason); D.toast(app, "Saved"); loadAi(); }).catch(function (e) { err(e); loadAi(); });
      });
      return h("label", { style: "display:flex;gap:10px;align-items:flex-start;font-weight:400;margin:10px 0" }, r, h("span", null, h("b", { text: label }), h("br"), h("span", { class: "small muted", text: sub })));
    }
    aiEl.appendChild(h("div", { class: "card" }, h("h2", { text: "Which AI DELA uses" }), radios,
      ai.lawfecta_ready === false ? h("p", { class: "small muted", text: "Lawfecta's AI is still being set up." }) : null));
    // Key setup shows once "Use my own key" is chosen, or when a key is already saved (UX review AI01)
    if (ai.byok_on && ai.mode !== "own_key" && !ai.own_key && !ai.firm_key) {
      aiEl.appendChild(h("p", { class: "small muted", text: "To add your own OpenAI or Claude key, choose \"Use my own key\" above." }));
    } else if (ai.byok_on) {
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
        h("div", null, "Included DELA actions used", h("b", { text: String(ai.credits && !ai.credits.unlimited ? (ai.credits.used || 0) + (ai.credits.reserved || 0) : u.lawfecta_credits || 0) }))),
      h("p", { class: "small muted", style: "margin-top:10px", text: "Your provider's billing page shows the exact cost of what ran on your key." })));
    aiEl.appendChild(h("div", { class: "card" }, h("h2", { text: "Talking to the AI" }),
      h("p", { text: ai.voice_on ? "Press Talk in any AI chat, say what you need, and press Stop. Your words appear in the box so you can fix them before you press Send. Recordings are turned into text and not kept." : "Talking to the AI opens soon." }),
      ai.voice_on ? h("p", { class: "small muted", text: "Each recording can be up to " + ai.voice_max_seconds + " seconds. Claude keys cannot turn speech into text, so members on a Claude key use Lawfecta's speech to text, which uses included DELA actions. OpenAI keys handle it themselves." }) : null));
    if ((me.switches || {}).profiles) {
      aiEl.appendChild(h("div", { class: "card" }, h("h2", { text: "What DELA knows about you" }),
        h("p", { text: "DELA's AI reads your own " + D.SIDE[me.side] + " profile (headline, practice areas, where you practice, your tech tools and services) to tailor its answers, for example by naming your own tools in document steps. It never reads other members' profiles." }),
        h("button", { class: "ghost small", onclick: function () { tab = "profile"; draw(); } }, "Open your profile")));
    }
    if ((me.switches || {}).member_insights) aiEl.appendChild(insightsCard());
    if (!NL()) aiEl.appendChild(emailsCard());
    if ((me.switches || {}).gig_chat) aiEl.appendChild(prefsCard());
    aiEl.appendChild(connectionsCard());
    // Webhooks are for technical setups, so they fold closed under "Advanced" (step 8b Part C, R12)
    if ((me.switches || {}).member_webhooks) {
      var adv = h("details", { id: "ai-advanced", style: "margin:12px 0" }, h("summary", { style: "cursor:pointer;font-weight:700", text: "Advanced: webhooks" }));
      aiEl.appendChild(adv);
      webhooksCard(adv);
    }
  }

  function keyCard(ai, scope, k, title, sub) {
    var card = h("div", { class: "card" }, h("h2", { text: title }), h("p", { class: "muted small", text: sub }));
    var mine = scope === "person" || ai.may_manage_firm_key;
    if (k) {
      card.appendChild(h("div", { class: "kv" },
        h("div", null, "Provider", h("b", { text: providerName(k.provider) })),
        h("div", null, "Key", h("b", { text: "ending " + k.last4 })),
        h("div", null, "Used for", h("b", { text: k.use_for === "chat" ? "Chat and documents only" : "All AI tasks" })),
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
    var use = h("select", { "aria-label": "Use the key for" }, h("option", { value: "all", text: "All AI tasks" }), h("option", { value: "chat", text: "Chat and documents only" }));
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
      h("p", { class: "small muted", text: "DELA tests the key, then stores it encrypted. It is used only to run your requests, and the Lawfecta Team cannot see it. Only the last 4 characters are shown." }),
      h("div", { class: "row" }, save), msg);
  }

  // ---------- Step 3: Profile and verification (both sides) ----------

  var prof = { data: null, body: null, dirty: false };
  var profEl = null;
  var READY_WORDS = {
    attorney: { incomplete: "A few profile items are still needed.", verification_pending: "Your profile is complete. Your license check is next.", match_ready: "You are verified. You can post work and hire on DELA.", restricted: "Some actions are paused on your account. Contact the Lawfecta Team." },
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
    // The shared help tip (UX review part 3): keyboard and Escape, tied to the box it explains
    var pair = D.helpTip(help, "What to enter in " + label.split(" (optional)").join("")), q = pair[0], tip = pair[1];
    return h("div", { style: "margin:8px 0" }, h("div", { class: "row", style: "gap:6px;align-items:center" }, h("label", { text: label, style: "margin:0" }), q), tip, input, hint ? h("div", { class: "small muted", text: hint }) : null, extra || null);
  }

  // "Write with DELA" under a box: DELA writes or improves just that box from a few facts (Stacey 2026-11-05)
  function writeWithDela(key, label, el) {
    var wrap = h("div", { style: "margin-top:6px" });
    var open = h("button", { class: "ghost small ai-btn", type: "button" }, "✦ Write with DELA");
    open.addEventListener("click", function () {
      if (wrap.childNodes.length > 1) { wrap.removeChild(wrap.lastChild); return; }
      var notes = h("textarea", { rows: 3, style: "width:100%", "aria-label": "Facts for DELA about your " + label.toLowerCase(), placeholder: "A few facts for DELA, for example where you worked, for how long, what you did. Leave empty to improve what the box says now." });
      var msg = h("div", { role: "status", class: "small" });
      var go = h("button", { class: "blue small", type: "button" }, "Write it");
      function run(confirmed) {
        go.disabled = true; msg.textContent = "DELA is writing...";
        api.post("/profile/draft", { field: key, notes: notes.value, body: prof.body, confirm_no_client_info: confirmed === true }).then(function (x) {
          go.disabled = false;
          if (x.reason === "looks_like_client_info") { msg.textContent = ""; if (confirm(ciNote(x, "This may include client information. Click OK if it is not."))) run(true); return; }
          if (x.reason === "tell_us_more") { msg.textContent = "Tell DELA a few facts first, or write a little in the box for DELA to improve."; return; }
          if (!x.ok) { msg.textContent = failText(x); return; }
          prof.body[key] = x.text; el.value = x.text; prof.dirty = true;
          msg.textContent = "DELA wrote this from your facts. Check it, change anything, then click Save." + (x.questions && x.questions.length ? " DELA asks: " + x.questions.join(" ") : "");
        }).catch(function (e) { go.disabled = false; msg.textContent = D.errorText(e.message); });
      }
      go.addEventListener("click", function () { run(false); });
      wrap.appendChild(h("div", { class: "helpbox" }, h("p", { class: "small", style: "margin:0 0 6px", text: "DELA uses only the facts you give and what your profile says. It never invents a qualification. Uses DELA actions like Ask DELA." }), notes, h("div", { class: "row", style: "margin-top:6px" }, go), msg));
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
    // A section menu at the top, so the important parts are one click away (UX review R01)
    var nav = h("nav", { class: "pills", "aria-label": "Profile sections", style: "margin:8px 0 12px" });
    profEl.appendChild(nav);
    function section(el, id, label) { el.id = id; nav.appendChild(h("button", { type: "button", onclick: function () { el.scrollIntoView({ behavior: "smooth", block: "start" }); var f = el.querySelector("input, select, textarea, button"); if (f) f.focus({ preventScroll: true }); } }, label)); return el; }
    profEl.appendChild(statusCard(st));
    // Step 8b Part C (R09, answer 7): the firm essentials (billing, signer, notices email) come first
    if (side === "attorney") profEl.appendChild(section(firmCard(), "sec-firm", "Firm details"));
    if (side === "freelancer") profEl.appendChild(section(availabilityCard(st), "sec-availability", "Availability"));
    if (side === "freelancer" && (me.switches || {}).meetings) profEl.appendChild(meetingAvailabilityCard());
    profEl.appendChild(section(side === "attorney" ? licenseCard() : linkedinCard(), "sec-verify", side === "attorney" ? "License verification" : "LinkedIn check"));
    profEl.appendChild(section(formCard(), "sec-profile", "Your profile"));
    if (side === "freelancer" && r.settings.documents_on) profEl.appendChild(docsCard());
    if (side === "attorney") {
      if ((me.switches || {}).document_standard) { var dfBox = section(h("div"), "sec-docprefs", "Document preferences"); profEl.appendChild(dfBox); docFirm().then(function (f) { firmProfileForm(dfBox, f, function () { draw(); }); }).catch(function () {}); }
      ((r.firm || {}).staff_of || []).forEach(function (o) { profEl.appendChild(firmCard(o)); });
    }
    profileReviewsCard(profEl);
    // Step 15: Home links open the part of the profile they name
    if (profileJump) {
      var target = profEl.querySelector("#" + profileJump);
      profileJump = null;
      if (target) setTimeout(function () { if (target.tagName === "DETAILS") target.open = true; target.scrollIntoView({ block: "start" }); var f = target.querySelector("input, select, textarea, button, summary"); if (f) f.focus({ preventScroll: true }); }, 60);
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
    if (me.side === "attorney" && st.verification !== "verified") card.appendChild(h("p", { class: "small muted", style: "margin-top:8px", text: "You can use Ask DELA, documents, files and the recorder before you are verified. Posting work and hiring need a verified license." }));
    // What the firm still needs for paid work, at the top (step 8b Part C, R09)
    var fmiss = me.side === "attorney" ? ((((prof.data.firm || {}).eligibility) || {}).missing_for_paid_work || []) : [];
    if (fmiss.length) {
      var FW = { billing_address: "Billing address", signatory: "Who may sign for the firm", service_email: "Email for formal notices" };
      card.appendChild(h("div", { class: "notice", id: "firm-missing", style: "margin-top:10px" }, h("span", { text: "Still needed before paid work: " + fmiss.map(function (k) { return FW[k] || k; }).join(", ") + ". " }),
        h("button", { class: "linkish", type: "button", onclick: function () { var f = app.querySelector("#sec-firm"); if (f) { f.scrollIntoView({ behavior: "smooth", block: "start" }); var i = f.querySelector("input, textarea"); if (i) i.focus({ preventScroll: true }); } } }, "Go to Firm details")));
    }
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
    card.appendChild(textIn("headline", "Headline", { required: need("headline"), ai: true, help: "One short line under your name: your role and the main kind of work you do. For example: " + (side === "attorney" ? "Family law attorney for Texas families." : "Litigation paralegal for small firms."), placeholder: side === "attorney" ? "Family law attorney in Austin" : "Litigation paralegal, e-filing and discovery" }));
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
    // Selected areas first, with a search box, folded until opened (step 8b Part C, R09)
    var allAreas = (r.practice_areas || []).slice().sort(function (x, y) { return (b.practice_areas.indexOf(y) >= 0) - (b.practice_areas.indexOf(x) >= 0); });
    var areaFind = h("input", { type: "search", "aria-label": "Find a practice area", placeholder: "Find a practice area", style: "width:100%;margin-bottom:6px" });
    areaFind.addEventListener("input", function () { var w = areaFind.value.trim().toLowerCase(); Array.prototype.forEach.call(areas.children, function (c) { c.hidden = !!w && c.textContent.toLowerCase().indexOf(w) < 0; }); });
    allAreas.forEach(function (a) {
      var on = b.practice_areas.indexOf(a) >= 0;
      var chip = h("button", { class: on ? "blue small" : "ghost small", "aria-pressed": String(on) }, a);
      chip.addEventListener("click", function () {
        var i = prof.body.practice_areas.indexOf(a);
        if (i >= 0) prof.body.practice_areas.splice(i, 1); else if (prof.body.practice_areas.length < lim("practice_areas_max")) prof.body.practice_areas.push(a);
        prof.dirty = true;
        chip.className = i >= 0 ? "ghost small" : "blue small"; chip.setAttribute("aria-pressed", String(i < 0));
        areaSum.textContent = "Practice areas (" + prof.body.practice_areas.length + " selected)" + (need("practice_areas") ? "" : ", optional");
      });
      areas.appendChild(chip);
    });
    var pmiss = (r.state || {}).missing || [];
    var areaSum = h("summary", { style: "cursor:pointer;font-weight:700", text: "Practice areas (" + b.practice_areas.length + " selected)" + (need("practice_areas") ? "" : ", optional") });
    card.appendChild(h("details", { id: "prof-areas", style: "margin:8px 0", open: pmiss.indexOf("practice_areas") >= 0 && !b.practice_areas.length },
      areaSum, b.practice_areas.length ? h("p", { class: "small muted", style: "margin:6px 0", text: "Selected: " + b.practice_areas.join(", ") }) : null, areaFind, areas));
    if (side === "attorney") card.appendChild(textIn("jurisdictions", "Where you are licensed or practice", { list: true, required: need("jurisdictions"), placeholder: "TX, Western District of Texas", hint: "Separate them with commas." }));
    // The biography (summary, experience, education) is folded until opened, unless something needed is missing there
    var bioOpen = ["summary", "experience", "education"].some(function (k) { return pmiss.indexOf(k) >= 0; });
    var bio = h("details", { id: "prof-bio", style: "margin:8px 0", open: bioOpen }, h("summary", { style: "cursor:pointer;font-weight:700", text: "Biography: summary, experience and education" + (bioOpen ? "" : (b.summary ? "" : " (not written yet)")) }));
    card.appendChild(bio);
    bio.appendChild(textIn("summary", "Summary", { area: true, rows: 5, required: need("summary"), ai: true, help: side === "attorney" ? "A short paragraph about your practice: what you handle, for whom, and how you like to work with support staff." : "A short paragraph about you: the work you do, for which kinds of firms, how you work and what you are known for. No client names or case details." }));
    bio.appendChild(textIn("experience", "Experience", { area: true, required: need("experience"), ai: true, help: "Your roles or kinds of work, newest first, one per line, with years. For example: " + (side === "attorney" ? "Founding attorney, Smith Family Law, 2019 to now." : "Senior paralegal, family law firm, 2019 to now.") }));
    bio.appendChild(textIn("education", "Education", { area: true, rows: 3, required: need("education"), ai: true, help: "Degrees, certificates and courses, one per line, with the school and year. For example: " + (side === "attorney" ? "J.D., University of Texas School of Law, 2012." : "Paralegal certificate, Austin Community College, 2018.") }));
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
      card.appendChild(h("label", { style: "font-weight:400;display:flex;gap:8px;margin-top:12px" }, dir, h("span", { text: "Also update my Lawfecta directory listing" + ((me.sides || []).length > 1 ? " from this workspace (your listing is one page for both workspaces)" : "") })));
      var bdw = { waiting: "Your listing is being updated.", done: "Your listing was updated " + D.dateTime(r.bd_synced_at) + ".", failed: "Your listing could not be updated: " + (r.bd_error === "not_allowed" ? "DELA is not allowed to change listings yet." : r.bd_error) + " Your DELA profile is saved." }[r.bd_state];
      if (bdw) card.appendChild(h("p", { class: "small muted", text: bdw }));
      card.appendChild(h("p", { class: "small muted", text: "Clearing a box here does not clear it on your listing." }));
    }
    // The Save button says where the change goes (UX review R02)
    var save = h("button", { class: "blue" }, "Save");
    var dirList = h("p", { class: "small muted", id: "directory-fields" });
    function saveLabel() {
      var toListing = r.sync_on && dir.checked;
      save.textContent = toListing ? "Save and update my directory listing" : r.sync_on ? "Save to DELA only" : "Save";
      dirList.textContent = toListing && (r.directory_fields || []).length ? "These boxes also change on your directory listing: " + r.directory_fields.join(", ") + "." : "";
    }
    dir.addEventListener("change", saveLabel);
    function doSave(confirmed) {
      save.disabled = true; msg.textContent = "Saving...";
      api.post("/profile/save", { body: prof.body, version: r.version, directory: dir.checked, confirm_no_client_info: confirmed === true }).then(function (x) {
        save.disabled = false;
        if (x.reason === "looks_like_client_info") {
          msg.textContent = "";
          if (confirm(ciNote(x, "This may include client information (" + (x.kinds || []).join(", ").split("_").join(" ") + "). Take it out and click Save, or click OK if it is not client information."))) doSave(true);
          return;
        }
        if (!x.ok) { msg.textContent = D.errorText(x.reason); return; }
        D.toast(app, "Profile saved");
        prof.dirty = false;
        loadProfile();
      }).catch(function (e) { save.disabled = false; msg.textContent = D.errorText(e.message); });
    }
    save.addEventListener("click", function () { doSave(false); });
    saveLabel();
    card.appendChild(dirList);
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
          if (i >= 0) prof.body.software.splice(i, 1); else if (prof.body.software.length < lim("software_max")) prof.body.software.push(t);
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
    return h("div", null, field("Tech tools you use" + (required ? "" : " (optional)"), box, "Open a group to choose the tools you use. DELA's AI uses them to tailor its answers, for example by naming your own tools in document steps.",
      "Choose every tool you use day to day. Attorneys can search for freelancers by tool, and DELA names your tools in document steps."), other);
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
    box.appendChild(h("button", { class: "ghost small", onclick: function () { if (prof.body.services.length >= lim("services_max")) return; prof.body.services.push({ title: "", for_whom: "", price_from_cents: null, price_to_cents: null, unit: "fixed" }); prof.dirty = true; drawList(); } }, "Add a service"));
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
        if (x.reason === "looks_like_client_info") { msg.textContent = ""; if (confirm(ciNote(x, "This may include client information. Click OK if it is not."))) run(true); return; }
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
      h("p", { class: "small muted", text: "DELA uses only what you write here and in the form. It does not invent qualifications. Uses DELA actions like Ask DELA." }), notes, h("div", { class: "row" }, go), msg);
  }

  function docsCard() {
    var r = prof.data, set = r.settings;
    var card = h("div", { class: "card" }, h("h2", { text: "Profile documents" }),
      h("p", { class: "small muted", text: "A resume, certificates or work samples with no client information. PDF, Word, PNG or JPG, up to " + set.doc_max_mb + " MB each, " + set.docs_max + " at most. Each one stays private until you choose to show it to attorneys." }));
    var tick = h("input", { type: "checkbox", id: "dela-doc-tick" });
    var input = h("input", { type: "file", accept: ".pdf,.docx,.png,.jpg,.jpeg", style: "display:none", "aria-label": "Choose a profile document" });
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
      if (d.status === "ready" || d.status === "held") row.appendChild(h("button", { class: "ghost small", onclick: function () { D.openTab(function () { return api.post("/files/open", { file_id: d.id }).then(function (x) { if (x.ok) return x.url; D.toast(app, D.errorText(x.reason), true); return null; }); }, err); } }, "Open"));
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
    attorney: ["See your name, workspace, plan and DELA actions left", "Read your profile and where your verification stands", "List and read the documents in your library", "Save new document drafts and suggest changes (you accept changes here, on the DELA website)", "Have DELA's AI draft a document, using your DELA actions or your own key", "Export a document as text, a web page or a checklist"],
    freelancer: ["See your name, workspace, plan and DELA actions left", "Read your profile and what is missing to be match-ready"],
  };
  var CONNECT_CANNOT = "It cannot pay, hire, sign, send messages, delete anything or see your passwords or AI keys.";
  var CONNECT_ERR = { request_expired: "This connection request ran out or was already answered. Start again from ChatGPT or Claude.", connector_off: "DELA in ChatGPT and Claude is not open for your account yet.", not_in_plan: "Your plan does not include the ChatGPT and Claude connector.", on_hold: "Some actions are paused on your account. Contact the Lawfecta Team." };

  // What a connected assistant can access, change and never see, and how to disconnect (UX review C01)
  function connectExplain(box, side, who, approving) {
    if (!approving) box.appendChild(h("h1", { text: "Connect DELA to ChatGPT or Claude" }));
    var can = CONNECT_CAN[side] || [];
    var changes = can.filter(function (t) { return /^(Save|Have|Draft|Suggest|Answer|Add)/.test(t); }), reads = can.filter(function (t) { return changes.indexOf(t) < 0; });
    box.appendChild(h("h2", { text: "What " + who + " can access" }));
    box.appendChild(h("ul", null, reads.map(function (t) { return h("li", { text: t }); })));
    box.appendChild(h("h2", { text: "What it can change" }));
    box.appendChild(changes.length ? h("ul", null, changes.map(function (t) { return h("li", { text: t }); })) : h("p", { text: "Nothing. It can only read." }));
    box.appendChild(h("h2", { text: "What stays private" }));
    box.appendChild(h("p", { text: CONNECT_CANNOT }));
    box.appendChild(h("h2", { text: "What leaves DELA" }));
    box.appendChild(h("p", { text: "What " + who + " reads from DELA is processed by " + (who === "ChatGPT" ? "OpenAI" : who === "Claude" ? "Anthropic" : "OpenAI (ChatGPT) or Anthropic (Claude)") + " under your own account with them, and their terms apply to it. Disconnecting stops new reading right away, but it cannot recall what was already read." }));
    box.appendChild(h("h2", { text: "How to disconnect" }));
    box.appendChild(h("p", { text: "Open " + setName() + ", find the card \"Use DELA in ChatGPT and Claude\" and click \"Disconnect\". It stops working right away." }));
  }

  // The page ChatGPT or Claude sends a member to when they connect DELA (/dela?tab=connect&req=...)
  function connectView() {
    var box = h("div", { class: "card", style: "max-width:620px;margin:0 auto" }, h("p", { class: "muted", text: "Loading..." }));
    var req = "";
    try { req = new URLSearchParams(location.search).get("req") || ""; } catch (e) { req = ""; }
    if (!req) { D.clear(box); connectExplain(box, me.side, "ChatGPT or Claude"); box.appendChild(h("p", { text: "To connect: open ChatGPT or Claude and add DELA there. It brings you back to this page to approve. The steps are in " + setName() + "." })); box.appendChild(h("button", { onclick: function () { tab = "ai"; draw(); } }, "Open " + setName())); return box; }
    api.get("/oauth/request?req=" + encodeURIComponent(req)).then(function (r) {
      D.clear(box);
      if (!r.ok) { box.appendChild(h("h1", { text: "Connect DELA" })); box.appendChild(h("p", { class: "notice bad", text: CONNECT_ERR[r.reason] || D.errorText(r.reason) })); return; }
      box.appendChild(h("h1", { text: r.client_name + " wants to connect to DELA" }));
      box.appendChild(h("p", { text: "It will use your " + D.SIDE[r.side] + " workspace" + ((me.sides || []).length > 1 ? ". To connect your other workspace instead, switch workspaces at the top of this page first." : ".") }));
      box.appendChild(h("p", { class: "small muted", text: "After you choose, you go back to " + r.redirect_host + "." }));
      connectExplain(box, r.side, r.client_name, true);
      box.appendChild(h("p", { class: "notice", role: "note", text: "Never enter sensitive data in DELA, and that includes what you type in ChatGPT or Claude for DELA: " + SENSITIVE_KINDS + ". Keep it in your own storage. You are responsible for what you enter." }));
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
      if (!r.on && !r.connections.length) { card.appendChild(h("p", { text: "Opens soon. You will be able to read and draft your DELA documents from ChatGPT or Claude." })); return; }
      card.appendChild(h("p", { text: me.side === "attorney" ? "Read your documents, save drafts and suggest changes from ChatGPT or Claude. Changes wait for you here before they count." : "Connect ChatGPT or Claude to your DELA freelancer workspace. More freelancer tools come in a later update." }));
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
        return h("li", { class: "row" }, h("span", { class: "grow" }, h("b", { text: c.client_name }), h("span", { class: "small muted", text: " " + D.SIDE[c.side] + " workspace, connected " + D.date(c.created_at) + ", last used " + D.date(c.last_used_at) })),
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
    // Search by name (UX review F01)
    var fq = h("input", { type: "search", "aria-label": "Search files", placeholder: "Search files by name", value: fileState.q || "", style: "min-width:240px;margin:8px 0" });
    fq.addEventListener("change", function () { fileState.q = fq.value; drawFiles(); });
    filesEl.appendChild(fq);
    var rows = d.files.filter(function (f) {
      if (fileState.q && String(f.name).toLowerCase().indexOf(fileState.q.toLowerCase()) < 0) return false;
      if (fileState.folder === "trash") return f.status === "trash";
      if (f.status === "trash") return false;
      return fileState.folder === "all" || f.folder_id === fileState.folder;
    });
    if (!rows.length) { filesEl.appendChild(h("div", { class: "card" }, h("p", { class: "muted", style: "margin:0", text: fileState.folder === "trash" ? "The trash is empty." : "No files here yet." }))); return; }
    filesEl.appendChild(h("div", { class: "card scroll" }, h("table", { class: "stack", style: "width:100%" },
      h("thead", null, h("tr", null, ["Name", "Status", "Size", "Added", ""].map(function (x) { return h("th", { text: x }); }))),
      h("tbody", null, rows.map(fileRow)))));
  }

  function fileRow(f) {
    var badge = h("span", { class: "badge " + (f.status === "ready" ? "ready" : f.status === "held" ? "held" : f.status === "refused" ? "bad" : ""), text: STATUS_WORDS[f.status] || f.status });
    var info = [];
    if (f.status === "held") info.push(h("div", { class: "small", style: "margin-top:4px", text: "It may contain " + kindsText(f.check_reasons) + ". The AI will not use it until you check it." }));
    if (f.from_job) info.push(h("div", { class: "small muted", style: "margin-top:4px", text: "Saved from a job. DELA's AI never reads files from a job." }));
    if (f.status === "refused") info.push(h("div", { class: "small", style: "margin-top:4px", text: (REFUSE_WORDS[f.refuse_reason] || "It could not be accepted.") + " DELA did not keep it." }));
    if (f.status === "ready" && !f.has_text && f.ext !== "png" && f.ext !== "jpg") info.push(h("div", { class: "small muted", style: "margin-top:4px", text: "No readable text was found, so the AI cannot read it." }));
    function act(label, fn, cls) { return h("button", { class: (cls || "ghost") + " small", onclick: fn }, label); }
    var acts = [];
    if (f.status === "ready" || f.status === "held") acts.push(act("Open", function () { openFile(f, false); }));
    if (f.status === "ready" && f.ext !== "png" && f.ext !== "jpg") acts.push(act("Download", function () { openFile(f, true); }));
    if (f.status === "ready" && !f.from_job && (me.switches || {}).ai_generation) acts.push(act("Ask DELA", function () { chat.attach = [{ id: f.id, name: f.name }]; chat.picking = false; tab = "delegate"; draw(); }, "blue"));
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
    // Immediate and permanent (Stacey 2026-11-05)
    if (f.status === "trash") acts.push(act("Delete forever", function () {
      if (!confirm("Delete \"" + f.name + "\" forever? It is removed at once, with every version, and cannot be restored.")) return;
      fileAction({ action: "delete_forever", file_id: f.id }, "Deleted forever");
    }));
    return h("tr", null,
      h("td", { "data-label": "Name" }, h("b", { text: f.name }), h("div", { class: "small muted", text: "Version " + (f.version || 1) + ", uploaded " + D.dateTime(f.created_at) }), info),
      h("td", { "data-label": "Status" }, badge, f.status === "ready" ? h("div", { class: "small muted", text: "Available to your firm" }) : null), h("td", { "data-label": "Size", text: mbText(f.size_bytes) }),
      h("td", { class: "small", "data-label": "Added", text: D.dateTime(f.created_at) + " by " + f.uploaded_by }),
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
    var input = h("input", { type: "file", multiple: true, "aria-label": "Choose files", accept: d.allowed.map(function (x) { return "." + x; }).join(",") + ",.jpeg" });
    var go = h("button", { class: "blue" }, "Upload");
    go.addEventListener("click", function () {
      if (!input.files.length) { D.toast(app, "Choose a file first.", true); return; }
      if (!tick.checked) { D.toast(app, D.errorText("tick_needed"), true); return; }
      uploadAll([].slice.call(input.files), null);
    });
    var list = h("div", null, fileState.uploading.map(function (u) { return h("p", { class: "small", text: u.name + ": " + u.text }); }));
    return h("div", { class: "card" }, h("h2", { text: "Add files" }), notice(),
      h("label", { style: "display:flex;gap:8px;align-items:flex-start;font-weight:600" }, tick, h("span", { text: "These files have no sensitive data (no " + SENSITIVE_KINDS + ")." })),
      h("p", { class: "small muted", text: "PDF, Word (.docx), text, Markdown, PNG or JPG, up to " + d.max_mb_per_file + " MB each. DELA checks each file. A file that looks like it has client information is held until you check it." }),
      h("div", { class: "row" }, input, go), list);
  }

  function pickAndUpload(f) {
    var input = h("input", { type: "file", "aria-label": "Choose the new version of this file", accept: "." + f.ext });
    input.addEventListener("change", function () {
      if (!input.files.length) return;
      if (!confirm("Upload a new version of \"" + f.name + "\"? Confirm it has no sensitive data (" + SENSITIVE_KINDS + ").")) return;
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
        if (e.message === "storage_full" && me.side === "attorney") limitPopup("storage");
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
    if (r.reason === "sensitive_data" && r.message) return r.message;
    if (DOC_ERR[r.reason]) return DOC_ERR[r.reason];
    if (r.reason === "playbook_limit") return "Your library is full: " + r.count + " of " + r.limit + " documents. Archive or delete one you no longer need, or upgrade your plan for more.";
    if (r.reason === "changed") return "Someone saved a newer version while you were working. Your changes were not saved. Reload the document, then make your change again.";
    if (r.reason === "not_complete") return "This document is not complete yet. Still missing: " + (r.missing || []).join(", ") + ".";
    if (r.reason === "administrator_only") return "Only the library's administrator can do that.";
    if (r.reason === "not_allowed") return "Your role in this library does not allow that.";
    if (r.reason === "no_seat") return "Every seat on this plan is in use (" + r.seats + "). Editors need a seat. Add them as a commenter or viewer, or add seats on the Business plan.";
    if (r.reason === "no_guest_place") return "This library already has " + r.guests + " commenters and viewers, the most allowed.";
    if (r.reason === "screenshot_held") return "A screenshot is waiting for your client information check. Confirm it has no client information, or untick it, then build again.";
    if (r.reason === "library_off") return "The document library is not open for your account yet.";
    if (r.reason === "import_off") return "Import from Scribe is not open for your account yet.";
    if (r.reason === "image_host_not_allowed") return "DELA only fetches screenshots from Scribe's own image addresses. This one was skipped: " + (r.host || "") + ".";
    if (r.reason === "ai_failed" && r.source && r.source !== "lawfecta") return "Your own AI key did not work: " + (KEY_PROBLEM[r.code] || "the provider refused it.") + " Nothing ran on Lawfecta's AI. Open " + setName() + " to fix it.";
    if (r.reason === "ai_failed") return "DELA's AI could not finish: " + (KEY_PROBLEM[r.code] || "something went wrong.") + " No DELA actions were used. Please try again.";
    return D.errorText(r.reason || "server_error");
  }
  function pbFail(e) {
    if (e && e.reason === "playbook_limit") { limitPopup("playbooks"); return; }
    if (e && e.reason === "document_read_only") { limitPopup("read_only"); return; }
    D.toast(app, e && e.reason ? failText(e) : D.errorText(e && e.message ? e.message : String(e)), true);
  }
  function okOr(r) { if (r && r.ok === false) throw r; return r; }

  function libraryView() {
    libEl = h("div", null, h("p", { class: "muted", text: "Loading..." }));
    if (lib.guideNew) { DOC.flow = lib.guideNew.type ? lib.guideNew : null; lib.guideNew = null; newDocument(); }
    else if (lib.importId) openImport(lib.importId);
    else if (lib.pb && lib.pb.playbook) openPlaybook(lib.pb.playbook.id, lib.view);
    else loadLibrary();
    return libEl;
  }

  function loadLibrary() {
    lib.pb = null;
    lib.importId = null;
    Promise.all([api.get("/library" + (lib.org ? "?org=" + lib.org : "")), loadUsage(true)]).then(function (rs) { var r = rs[0]; lib.data = r; lib.org = r.org_id; drawLibrary(); })
      .catch(function (e) { D.clear(libEl); libEl.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  function drawLibrary() {
    D.clear(libEl);
    var d = lib.data, L = d.list;
    if (!L) { libEl.appendChild(h("p", { class: "muted", text: "No library yet." })); return; }
    if (L.workspace && L.on && !localPref("libTable")) { drawWorkspace(); return; }
    var head = h("div", { class: "row", style: "margin:18px 0 4px" }, h("h1", { class: "grow", style: "margin:0", text: "Document library" }));
    if (d.libraries.length > 1) {
      var pick = h("select", { "aria-label": "Library", onchange: function () { lib.org = pick.value; loadLibrary(); } }, d.libraries.map(function (l) {
        return h("option", { value: l.org_id, selected: l.org_id === lib.org, text: (l.mine ? "My library" : l.name) + " (" + ROLE_WORDS[l.role] + ")" });
      }));
      head.appendChild(pick);
    }
    libEl.appendChild(head);
    libEl.appendChild(h("p", { class: "muted", text: "Each document is one repeatable process, written so a trained person who has never done it can do it right, with the points where an attorney must review." }));
    if (!L.on) { libEl.appendChild(h("div", { class: "notice", text: D.errorText("library_off") })); return; }
    var pct = L.limit ? Math.min(100, Math.round(L.count * 100 / L.limit)) : 0;
    libEl.appendChild(h("div", { class: "card" },
      h("div", { class: "row" }, h("b", { class: "grow", text: libLimitText(L) }), h("span", { class: "badge", text: "Your access to this Library: " + ROLE_WORDS[L.role] })),
      L.limit !== null ? h("div", { class: "bar" }, h("span", { style: "width:" + pct + "%" + (pct >= 100 ? ";background:var(--bad)" : "") })) : null,
      h("div", { class: "row", style: "margin-top:10px" },
        can(3) ? h("button", { class: "blue", onclick: L.standard ? function () { DOC.flow = null; newDocument(); } : newPlaybook }, "New document") : null,
        can(3) && L.scribe_on ? h("button", { class: "ghost", onclick: startScribe }, "Import from Scribe") : null,
        can(3) ? h("button", { class: "ghost", onclick: suggestMissing }, "What am I missing?") : null,
        L.role === "administrator" ? h("button", { class: "ghost", onclick: openTeam }, "Team") : null)));
    // Search and filters come first; imports wait in a compact line that opens on request; Archived and Trash sit under More (UX review L01, L03)
    var q = h("input", { type: "search", placeholder: "Search by title, ID or practice area", "aria-label": "Search documents", value: lib.q, style: "min-width:240px" });
    q.addEventListener("input", function () { lib.q = q.value; drawList(); });
    var filters = [["all", "All"], ["draft", "Drafts"], ["in_review", "In review"], ["approved", "Approved"], ["due", "Due for review"]];
    var more = [["archived", "Archived"]];
    if (L.role === "administrator") more.push(["trash", "Trash"]);
    var moreOpen = lib.filter === "archived" || lib.filter === "trash" || lib.moreOpen;
    var pills = h("div", { class: "pills" }, filters.concat(moreOpen ? more : []).map(function (f) {
      return h("button", { "aria-pressed": String(lib.filter === f[0]), onclick: function () { lib.filter = f[0]; drawLibrary(); } }, f[1]);
    }));
    if (!moreOpen) pills.appendChild(h("button", { "aria-expanded": "false", onclick: function () { lib.moreOpen = true; drawLibrary(); } }, "More"));
    libEl.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;gap:8px;margin:10px 0" }, q, pills));
    var listEl = h("div");
    libEl.appendChild(listEl);
    libEl.appendChild(draftsDueCard());
    if (L.imports.length) {
      libEl.appendChild(h("details", { class: "card", id: "imports-card" }, h("summary", { style: "cursor:pointer;font-weight:700", text: "Imports waiting for review (" + L.imports.length + ")" }), h("ul", { class: "list" }, L.imports.map(function (i) {
        return h("li", { class: "row" }, h("span", { class: "grow" }, h("b", { text: i.title || "Imported guide" }), h("span", { class: "small muted", text: " " + i.steps + " steps, " + D.date(i.created_at) })),
          h("button", { class: "small blue", onclick: function () { openImport(i.id); } }, "Review"));
      }))));
    }
    if (can(3)) libEl.appendChild(recordingsCard());
    function drawList() {
      D.clear(listEl);
      var today = D.today();
      var rows = L.playbooks.filter(function (p) {
        if (lib.filter === "trash") return p.status === "trash";
        if (p.status === "trash") return false;
        if (lib.filter === "due") return p.status === "approved" && p.next_review_at && p.next_review_at <= today;
        if (lib.filter !== "all" && p.status !== lib.filter) return false;
        if (lib.filter === "all" && p.status === "archived") return false;
        return !lib.q || (p.title + " " + (p.practice_area || "") + " " + (p.doc_id || "")).toLowerCase().indexOf(lib.q.toLowerCase()) >= 0;
      });
      if (!rows.length) { listEl.appendChild(h("div", { class: "card" }, h("p", { class: "muted", style: "margin:0", text: L.playbooks.length ? "Nothing here." : "No documents yet. Click New document and describe a task, or import a guide you made in Scribe." }))); return; }
      if (L.standard) { if (DOC.starters) docIndex(listEl, rows); else docStarters().then(function () { drawList(); }).catch(function () { DOC.starters = { lifecycle: [] }; drawList(); }); return; }
      rows.forEach(function (p) {
        listEl.appendChild(h("div", { class: "work", style: "cursor:pointer", role: "button", tabindex: "0", onclick: function () { openPlaybook(p.id, "read"); } },
          h("span", { class: "chip", text: String(p.completeness) + "%" }),
          h("div", { class: "grow" }, h("h3", { style: "margin:0", text: p.title }), docLocked(p.id) ? h("div", { class: "small", text: "🔒 Upgrade to edit this document." }) : null,
            h("div", { class: "small muted", text: [p.practice_area, "version " + p.version, "updated " + D.date(p.updated_at), p.open_suggestions ? p.open_suggestions + " suggestion" + (p.open_suggestions > 1 ? "s" : "") + " waiting" : ""].filter(Boolean).join(" | ") })),
          h("span", { class: "badge " + (p.status === "approved" ? "ready" : p.status === "in_review" ? "held" : ""), text: PB_STATUS[p.status] })));
      });
    }
    drawList();
    if (L.workspace) libEl.appendChild(h("p", { class: "small" }, h("button", { class: "linkish", type: "button", onclick: function () { localPref("libTable", false); drawLibrary(); } }, "Show as cards")));
    if (lib.startRecord) { lib.startRecord = false; recordView(); }
  }

  // ---------- Step 8b Part B: the plain-language Library (switch library_workspace; docs/briefs/step-8b-ux-retest.md) ----------
  // Cards with a title, one purpose sentence, a status and one action. Plain categories, search by title, purpose or ID.
  // Coming back from a document keeps the search, the category, the status and the scroll position.
  lib.ws = { q: "", cat: "all", st: "all", scroll: null, more: null };
  var WS_STATES = [["all", "All"], ["ready", "Ready to use"], ["draft", "Draft"], ["review", "Needs your review"]];
  var READY_TIP = "Approved by your firm. DELA checks how it is written, not whether it is legally correct.";
  function wsGo(fn) { lib.ws.scroll = window.pageYOffset || 0; fn(); }
  // The status and the one action for a card (the two tables in the brief, answer B5)
  function cardState(p, L) {
    var today = D.today(), admin = L.role === "administrator", edit = can(3);
    var hasApproved = !!p.approved_version && (p.status === "approved" || p.status === "draft" || p.status === "in_review");
    var draftOpen = hasApproved && p.status !== "approved";
    if (p.converted) return { k: "review", label: "Review imported document", go: function () { openPlaybook(p.id, "read"); } };
    if (p.status === "in_review" && admin) return { k: "review", label: "Review and approve", note: draftOpen ? "A new draft is waiting for your approval." : "", go: function () { openPlaybook(p.id, "read"); } };
    if (hasApproved) {
      if (p.next_review_at && p.next_review_at <= today) return { k: "review", label: "Review now", note: "Review overdue since " + D.date(p.next_review_at), go: function () { openPlaybook(p.id); } };
      return { k: "ready", label: "Open document", note: draftOpen ? "A new draft is in progress." : "", go: function () { openPlaybook(p.id); } };
    }
    if (p.blocking > 0 && edit && p.status === "draft") return { k: "review", label: "Fix required items", note: p.blocking + (p.blocking === 1 ? " required item" : " required items") + " before approval.", go: function () { openPlaybook(p.id, "read", "quality-check"); } };
    if (p.status === "in_review") return { k: "draft", label: "Open draft", note: "Sent for approval.", go: function () { openPlaybook(p.id, "read"); } };
    return { k: "draft", label: edit ? "Continue draft" : "Open draft", go: function () { openPlaybook(p.id, "read"); } };
  }
  var WS_WORDS = { ready: "Ready to use (approved)", draft: "Draft", review: "Needs your review" };
  function docCard(p, L) {
    var c = cardState(p, L);
    var locked = usage.data && (usage.data.locked_ids || []).indexOf(p.id) >= 0;
    var tip = c.k === "ready" ? D.helpTip(READY_TIP, "What does Ready to use mean?") : [null, null];
    var act = h("button", { class: c.k === "draft" ? "ghost small" : "blue small", type: "button", onclick: function () { wsGo(c.go); } }, c.label);
    return h("div", { class: "card lib-card", "data-id": p.id },
      h("h3", { class: "lib-title", text: p.title }),
      p.purpose ? h("p", { class: "lib-purpose", text: p.purpose })
        : can(3) ? h("p", { class: "lib-purpose" }, h("button", { class: "linkish", type: "button", onclick: function () { wsGo(function () { openPlaybook(p.id, "read"); }); } }, "Add a purpose")) : null,
      h("div", { class: "row lib-state", style: "flex-wrap:wrap;gap:6px" }, h("span", { class: "badge " + (c.k === "ready" ? "ready" : c.k === "review" ? "held" : ""), text: WS_WORDS[c.k] }), tip[0]),
      tip[1],
      c.note ? h("p", { class: "small muted", style: "margin:4px 0 0", text: c.note }) : null,
      locked ? h("p", { class: "small", style: "margin:4px 0 0", text: "🔒 Upgrade to edit this document." }) : null,
      h("div", { class: "row", style: "margin-top:10px" }, act));
  }
  function drawWorkspace() {
    D.clear(libEl);
    var d = lib.data, L = d.list, ws = lib.ws, G = L.groups || {};
    var head = h("div", { class: "row lib-head", style: "margin:18px 0 4px;flex-wrap:wrap;gap:8px" },
      h("div", { class: "grow" }, h("h1", { style: "margin:0", text: "Library" }), h("p", { class: "muted", style: "margin:4px 0 0", text: "Your firm's processes and policies, all in one place." })),
      can(3) ? h("button", { class: "blue", type: "button", onclick: function () { DOC.flow = null; if (L.standard) newDocument(); else newPlaybook(); } }, "Create a document") : null,
      can(3) ? h("button", { class: "ghost", type: "button", "aria-expanded": String(ws.more === "import"), onclick: function () { ws.more = ws.more === "import" ? null : "import"; drawWorkspace(); } }, "Import") : null,
      L.role === "administrator" ? h("button", { class: "linkish", type: "button", onclick: openTeam }, "Library settings") : null);
    libEl.appendChild(head);
    if (d.libraries.length > 1) {
      var pick = h("select", { "aria-label": "Library", onchange: function () { lib.org = pick.value; loadLibrary(); } }, d.libraries.map(function (l) {
        return h("option", { value: l.org_id, selected: l.org_id === lib.org, text: (l.mine ? "My library" : l.name) + " (" + ROLE_WORDS[l.role] + ")" });
      }));
      libEl.appendChild(h("div", { class: "row" }, pick));
    }
    if (ws.more === "import") libEl.appendChild(h("div", { class: "card", id: "import-choices" }, h("h2", { text: "Import" }),
      h("div", { class: "row", style: "flex-wrap:wrap" },
        L.scribe_on ? h("button", { class: "ghost", type: "button", onclick: startScribe }, "From a Scribe guide") : null,
        h("button", { class: "ghost", type: "button", onclick: newPlaybook }, "From a file or text you already have")),
      h("p", { class: "small muted", text: "DELA turns it into a draft. Nothing is ready to use until someone approves it." })));
    var q = h("input", { type: "search", class: "lib-find", "aria-label": "Find a document", placeholder: "Find a document by name, purpose or ID", value: ws.q });
    libEl.appendChild(h("div", { class: "lib-search" }, q));
    // Categories that have documents, in the lifecycle order, plus documents not grouped yet
    var live = L.playbooks.filter(function (p) { return p.status !== "trash" && p.status !== "archived"; });
    var order = ["INT", "ENG", "MAT", "DOC", "BIL", "CLS", "ADM"].filter(function (g) { return live.some(function (p) { return p.lifecycle === g; }); });
    if (live.some(function (p) { return !G[p.lifecycle]; })) order.push("OTHER");
    var catName = function (g) { return g === "OTHER" ? "Not grouped yet" : G[g]; };
    if (ws.cat !== "all" && order.indexOf(ws.cat) < 0) ws.cat = "all";
    var cats = h("div", { class: "pills", role: "group", "aria-label": "Category" }, [["all", "All categories"]].concat(order.map(function (g) { return [g, catName(g)]; })).map(function (c) {
      return h("button", { type: "button", "aria-pressed": String(ws.cat === c[0]), onclick: function () { ws.cat = c[0]; drawWorkspace(); } }, c[1]);
    }));
    var sts = h("div", { class: "pills", role: "group", "aria-label": "Status" }, WS_STATES.map(function (c) {
      return h("button", { type: "button", "aria-pressed": String(ws.st === c[0]), onclick: function () { ws.st = c[0]; drawWorkspace(); } }, c[1]);
    }));
    libEl.appendChild(h("div", { class: "lib-filters" }, cats, sts));
    var listEl = h("div", { class: "lib-list" });
    libEl.appendChild(listEl);
    function drawCards() {
      D.clear(listEl);
      var words = ws.q.trim().toLowerCase();
      var imports = ws.cat === "all" && (ws.st === "all" || ws.st === "review") ? L.imports.filter(function (i) { return !words || (i.title || "imported guide").toLowerCase().indexOf(words) >= 0; }) : [];
      var rows = live.filter(function (p) {
        var g = G[p.lifecycle] ? p.lifecycle : "OTHER";
        if (ws.cat !== "all" && g !== ws.cat) return false;
        if (ws.st !== "all" && cardState(p, L).k !== ws.st) return false;
        if (!words) return true;
        return [p.title, p.purpose || "", p.doc_id || "", catName(g) || "", p.practice_area || ""].join(" ").toLowerCase().indexOf(words) >= 0;
      });
      if (imports.length) listEl.appendChild(h("section", { class: "lib-group" }, h("h2", { text: "Imported, waiting for review" }), h("div", { class: "lib-cards" }, imports.map(function (i) {
        return h("div", { class: "card lib-card" }, h("h3", { class: "lib-title", text: i.title || "Imported guide" }),
          h("p", { class: "lib-purpose", text: i.steps + (i.steps === 1 ? " step" : " steps") + " imported on " + D.date(i.created_at) + "." }),
          h("div", { class: "row lib-state" }, h("span", { class: "badge held", text: "Needs your review" })),
          h("div", { class: "row", style: "margin-top:10px" }, h("button", { class: "blue small", type: "button", onclick: function () { wsGo(function () { openImport(i.id); }); } }, "Review imported document")));
      }))));
      if (!rows.length && !imports.length) {
        listEl.appendChild(h("div", { class: "card" }, h("p", { class: "muted", style: "margin:0 0 8px", text: live.length ? "No documents match." : "No documents yet. Click \"Create a document\" and describe what you want to document." }),
          live.length ? h("button", { class: "ghost small", type: "button", onclick: function () { ws.q = ""; ws.cat = "all"; ws.st = "all"; drawWorkspace(); } }, "Show all documents") : null));
        return;
      }
      order.forEach(function (g) {
        var list = rows.filter(function (p) { return (G[p.lifecycle] ? p.lifecycle : "OTHER") === g; });
        if (!list.length) return;
        list.sort(function (a, b) { return a.title.localeCompare(b.title); });
        listEl.appendChild(h("section", { class: "lib-group" }, h("h2", { text: catName(g) }), h("div", { class: "lib-cards" }, list.map(function (p) { return docCard(p, L); }))));
      });
    }
    q.addEventListener("input", function () { ws.q = q.value; drawCards(); });
    drawCards();
    // At the bottom: Recordings, Recently deleted, the table choice, the plan limit and the help panel
    var gone = L.playbooks.filter(function (p) { return p.status === "archived" || p.status === "trash"; });
    libEl.appendChild(h("div", { class: "row lib-links", style: "flex-wrap:wrap;gap:16px;margin:18px 0 8px" },
      can(3) ? h("button", { class: "linkish", type: "button", "aria-expanded": String(ws.more === "rec"), onclick: function () { ws.more = ws.more === "rec" ? null : "rec"; drawWorkspace(); } }, "Recordings") : null,
      gone.length ? h("button", { class: "linkish", type: "button", "aria-expanded": String(ws.more === "gone"), onclick: function () { ws.more = ws.more === "gone" ? null : "gone"; drawWorkspace(); } }, "Recently deleted (" + gone.length + ")") : null,
      h("button", { class: "linkish", type: "button", onclick: function () { localPref("libTable", true); drawLibrary(); } }, "Show as a table")));
    if (ws.more === "rec" && can(3)) libEl.appendChild(recordingsCard());
    if (ws.more === "gone") libEl.appendChild(h("div", { class: "card", id: "recently-deleted" }, h("h2", { text: "Recently deleted" }),
      h("p", { class: "small muted", text: "Archived documents and documents in the trash. Open one to restore it." }),
      h("ul", { class: "list" }, gone.map(function (p) {
        return h("li", { class: "row" }, h("span", { class: "grow" }, h("b", { text: p.title }), h("span", { class: "small muted", text: " " + PB_STATUS[p.status] })),
          h("button", { class: "ghost small", type: "button", onclick: function () { wsGo(function () { openPlaybook(p.id, "read"); }); } }, "Open"));
      }))));
    libEl.appendChild(draftsDueCard());
    if (can(3)) {
      var want = h("textarea", { rows: 3, style: "width:100%", "aria-label": "What would you like to document?", placeholder: "For example: how we check for conflicts before accepting a new client" });
      libEl.appendChild(h("div", { class: "card soft lib-help", id: "lib-help" }, h("h2", { text: "Not sure where to start?" }),
        h("p", { class: "small muted", text: "Describe the process in a sentence. DELA suggests how to structure it, asks a few questions and drafts it for you. The draft is yours to edit, and it is never the working version until someone approves it." }),
        aiNotice(), want,
        h("div", { class: "row", style: "margin-top:8px;flex-wrap:wrap" },
          h("button", { class: "blue", type: "button", onclick: function () { DOC.flow = { what: want.value }; if (L.standard) newDocument(); else newPlaybook(); } }, "✦ Help me create a document"),
          h("button", { class: "ghost", type: "button", onclick: suggestMissing }, "What am I missing?"))));
    }
    libEl.appendChild(h("p", { class: "small muted", text: (function (x) { return x + (x.slice(-1) === "." ? "" : "."); })(libLimitText(L)) + " Your access to this Library: " + ROLE_WORDS[L.role] + "." }));
    if (ws.scroll !== null) { var y = ws.scroll; ws.scroll = null; setTimeout(function () { window.scrollTo(0, y); }, 0); }
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
      status.textContent = "DELA is drafting your document...";
      api.post("/playbooks/create", { org_id: lib.org, request_id: req, title: title.value, description: ta.value, file_ids: files, attempt: attempt,
        lawfecta_once: extra.lawfecta_once === true, confirm_no_client_info: extra.confirm === true }).then(function (r) {
        go.disabled = false;
        status.textContent = "";
        if (!r.ok) {
          if (r.reason === "looks_like_client_info") {
            problem.appendChild(h("div", { class: "problem" }, h("p", { text: ciNote(r, "This may include " + kindsText(r.kinds) + ". Use placeholders such as [Client Name] instead.") }),
              h("button", { class: "ghost small", onclick: function () { send({ confirm: true }); } }, "Send anyway, it has no client information")));
          } else {
            problem.appendChild(h("div", { class: "problem" }, h("p", { text: failText(r) }),
              r.reason === "ai_failed" ? h("div", { class: "row" }, h("button", { class: "ghost small", onclick: function () { attempt++; send(); } }, "Try again"),
                r.source !== "lawfecta" && ai.backup_credits !== false ? h("button", { class: "blue small", onclick: function () { attempt++; send({ lawfecta_once: true }); } }, "Use Lawfecta's DELA actions this time") : null) : null));
          }
          return;
        }
        lib.questions = r.questions || [];
        openPlaybook(r.id, "read");
      }).catch(function (e) { go.disabled = false; status.textContent = ""; pbFail(e); });
    }
    go.addEventListener("click", function () { if (!ta.value.trim() && !files.length) { D.toast(app, "Describe the task or choose a file first, or click Start blank.", true); return; } send(); });
    blank.addEventListener("click", function () {
      api.post("/playbooks/create", { org_id: lib.org, request_id: req, title: title.value || "Untitled document" }).then(okOr).then(function (r) { openPlaybook(r.id, "edit"); }).catch(pbFail);
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
    // Upload a process document right here, without going to the Files page first (Stacey 2026-11-05)
    var upWrap = h("div");
    var upBtn = (me.switches || {}).file_uploads ? h("button", { class: "ghost small", type: "button", onclick: function () {
      D.clear(upWrap);
      var tick = h("input", { type: "checkbox", "aria-label": "This file has no sensitive data" });
      var input = h("input", { type: "file", accept: ".pdf,.docx,.txt,.md", "aria-label": "Choose a file" });
      var say = h("p", { class: "small", role: "status" });
      var go2 = h("button", { class: "blue small", type: "button", onclick: function () {
        if (!input.files.length) { say.textContent = "Choose a file first."; return; }
        if (!tick.checked) { say.className = "small bad"; say.textContent = "Tick the box to confirm the file has no sensitive data."; return; }
        var f = input.files[0];
        go2.disabled = true; say.className = "small"; say.textContent = "Uploading " + f.name + "...";
        uploadBlob(f, f.name, "").then(function (r) {
          go2.disabled = false;
          if (!r.ok) { say.className = "small bad"; say.textContent = r.reason === "upload_failed" ? "The upload did not finish. Check your connection and try again." : D.errorText(r.reason); return; }
          if (r.status === "ready") {
            if (files.indexOf(r.file_id) < 0) files.push(r.file_id);
            D.clear(upWrap);
            upWrap.appendChild(h("p", { class: "small ok", text: "✓ " + f.name + " is ready. DELA will draft from it." }));
          } else if (r.status === "held") { say.className = "small bad"; say.textContent = "DELA is holding this file because it may include client information. Check it on the Files page."; }
          else if (r.status === "refused") { say.className = "small bad"; say.textContent = "This file was not accepted. Use a Word file, PDF or text file."; }
          else { say.textContent = "DELA is still checking the file. Try again in a moment."; }
        }).catch(function (e) { go2.disabled = false; say.className = "small bad"; say.textContent = D.errorText(e.message); });
      } }, "Upload");
      upWrap.appendChild(h("div", { class: "pick" }, input,
        h("label", { style: "display:flex;gap:8px;align-items:flex-start" }, tick, h("span", { text: "This file has no sensitive data (no " + SENSITIVE_KINDS + ")." })),
        h("div", { class: "row" }, go2), say));
    } }, "Upload a new file") : null;
    box.appendChild(h("h2", { text: "New document" }));
    box.appendChild(aiNotice());
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
      out.appendChild(h("h2", { text: "Documents firms like yours often have" }));
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

  // The Library's Review column (step 8b, retest R04): the quality check's notes are "quality notes", never
  // "suggestions" (those are AI-proposed edits, on the document's "Suggested edits" tab). The count opens exactly those
  // notes: the document's draft and review page, scrolled to its quality check.
  function reviewCell(p) {
    var n = p.blocking || p.attention || 0;
    if (!n) return h("span", { text: "None" });
    var words = n + (n === 1 ? " quality note" : " quality notes") + (p.blocking ? " (required)" : "");
    return h("button", { class: "linkish", type: "button", "aria-label": "Open the " + words + " for " + p.title, onclick: function (e) { e.stopPropagation(); openPlaybook(p.id, p.status === "approved" ? "approved" : "read", "quality-check"); } }, words);
  }
  function openPlaybook(id, view, focusId) {
    lib.importId = null;
    Promise.all([api.get("/playbooks/get?id=" + id), loadUsage()]).then(function (rs) {
      var r = rs[0];
      if (!r.ok) throw r;
      var other = lib.lastDoc !== id;
      lib.pb = r;
      lib.lastDoc = id;
      if (other) lib.editDraft = null;
      // Phase 4 part A: a document with an approved version opens on that version, read-only
      lib.view = view || (other && r.approved ? "approved" : lib.view) || "read";
      drawPlaybook();
      if (focusId) setTimeout(function () { var el = app.querySelector("#" + focusId); if (el) { el.setAttribute("tabindex", "-1"); el.scrollIntoView({ block: "start" }); el.focus({ preventScroll: true }); } }, 0);
    }).catch(function (e) { pbFail(e); loadLibrary(); });
  }

  function body() { return lib.pb.body || {}; }

  // Read-only after a downgrade (step 9b): a lock and Upgrade at the top of the document
  function docLocked(id) { return !!(usage.data && (usage.data.locked_ids || []).indexOf(id) >= 0); }
  function lockNotice(id) {
    if (!docLocked(id)) return;
    libEl.appendChild(h("div", { class: "notice", role: "note", id: "doc-locked", style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px" },
      h("span", { class: "grow", text: "🔒 Upgrade to edit this document. Your plan saves fewer documents, so this one is read-only. You can still view, export and assign it." }), upgradeButton(usage.data)));
  }

  function drawPlaybook() {
    if (lib.pb.body && lib.pb.body.schema === 2) return drawDocument();
    var P = lib.pb.playbook, b = body();
    D.clear(libEl);
    lockNotice(P.id);
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
    var views = [["read", "Read"], ["edit", "Edit"], ["chat", "Chat"], ["suggestions", "Suggested edits (" + lib.pb.suggestions.length + ")"], ["comments", "Comments (" + lib.pb.comments.filter(function (c) { return !c.resolved; }).length + ")"],
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
        // A draft that was never approved is deleted at once and for good (Stacey 2026-11-05); approved documents use Trash
        P.status === "draft" && !P.approved_version ? h("button", { class: "danger small", type: "button", onclick: function () {
          if (!confirm("Delete this draft for good? It was never approved, so it is removed at once with its versions and comments. This cannot be undone.")) return;
          api.post("/playbooks/delete-draft", { id: P.id }).then(okOr).then(function () { D.toast(app, "Draft deleted"); lib.pb = null; loadLibrary(); }).catch(pbFail);
        } }, "Delete draft") :
        P.status === "trash" ? h("button", { class: "ghost small", onclick: function () { status("restore", "Restored"); } }, "Restore from the trash")
          : h("button", { class: "danger small", onclick: function () { if (confirm("Move this document to the trash? You can restore it for 30 days.")) status("trash", "Moved to the trash"); } }, "Delete")));
    }
  }

  // Drafts never approved are deleted after a set time without changes, unless saved (Stacey 2026-11-05)
  function draftsDueCard() {
    var box = h("div");
    api.get("/playbooks/drafts-due").then(function (x) {
      var due = ((x && x.drafts) || []).filter(function (d) { return d.due_soon; });
      if (!due.length) return;
      var c = h("div", { class: "card" }, h("h2", { text: "Drafts due to be deleted" }),
        h("p", { class: "small muted", text: "Drafts that were never approved are deleted after a set time without changes. Click \"Save to library\" to keep one." }));
      due.forEach(function (d) {
        c.appendChild(h("div", { class: "row", style: "flex-wrap:wrap" }, h("span", { class: "grow" }, h("b", { text: d.title }), h("span", { class: "small muted", text: " | deleted on " + D.date(d.delete_at) })),
          h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/playbooks/save-draft", { id: d.id }).then(okOr).then(function () { D.toast(app, "Saved. This draft is kept until you delete it."); loadLibrary(); }).catch(pbFail);
          } }, "Save to library"),
          h("button", { class: "ghost small", type: "button", onclick: function () { openPlaybook(d.id); } }, "Open")));
      });
      box.appendChild(c);
    }).catch(function () {});
    return box;
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
      status.textContent = "DELA is updating the document...";
      api.post("/playbooks/fill", { id: lib.pb.playbook.id, answers: ta.value, attempt: attempt, lawfecta_once: !!(extra && extra.once), confirm_no_client_info: !!(extra && extra.confirm) }).then(function (r) {
        btn.disabled = false;
        status.textContent = "";
        if (!r.ok) {
          if (r.reason === "looks_like_client_info" && confirm(ciNote(r, "This may include " + kindsText(r.kinds) + ". Send anyway? Only if it has no client information."))) { send({ confirm: true }); return; }
          D.toast(app, failText(r), true);
          return;
        }
        lib.questions = r.questions;
        openPlaybook(lib.pb.playbook.id);
      }).catch(function (e) { btn.disabled = false; status.textContent = ""; pbFail(e); });
    }
    btn.addEventListener("click", function () { if (ta.value.trim()) send(); });
    return h("div", { class: "card", style: "border-color:var(--blue)" }, h("h2", { text: "DELA's questions" }),
      h("ol", null, lib.questions.map(function (q) { return h("li", { text: q }); })), aiNotice(), ta,
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
    area.appendChild(h("div", { class: "card" }, aiNotice(),
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
      if (!log.length) list.appendChild(h("div", { class: "card soft" }, h("p", { style: "margin:0", text: "Ask about this document (\"Who does step 4?\") or ask for a change (\"Add a conflict check before step 2\"). DELA proposes changes as suggestions; nothing changes until " + (can(4) ? "you or an editor accept it." : "an editor or the administrator accepts it.") })));
      log.forEach(function (m) { list.appendChild(h("div", { class: "msg " + m.role, text: m.text })); });
    }
    drawLog();
    var ta = h("textarea", { "aria-label": "Message about this document", style: "width:100%;min-height:70px" });
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
          if (r.reason === "looks_like_client_info" && confirm(ciNote(r, "This may include " + kindsText(r.kinds) + ". Send anyway? Only if it has no client information."))) { send({ confirm: true }); return; }
          if (r.reason === "ai_failed" && r.source !== "lawfecta" && confirm(failText(r) + " Use Lawfecta's DELA actions this time?")) { attempt++; send({ once: true }); return; }
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
    area.appendChild(h("div", { class: "composer" }, aiNotice(), ta, h("div", { class: "row", style: "margin-top:8px" }, mic, h("span", { class: "grow" }), status, btn)));
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
        stale ? h("p", { class: "notice", text: "The document changed after this was suggested, so it cannot be applied as it is. Ask DELA again in Chat." }) : null,
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
    // Comments point to a tab that is really there (step 8b, retest R07): an approved document with no draft open shows
    // "Approved version" instead of "Draft and review", so the way to comment is to start a new draft
    var AVc = lib.pb.approved || null, P = lib.pb.playbook;
    var noDraftTab = !!(AVc && AVc.current && lib.editDraft !== P.id);
    if (!cs.length && noDraftTab) area.appendChild(h("div", { class: "card" }, h("p", { class: "muted", text: "No comments yet. The approved version is read-only: to comment, start a new draft. The approved version stays in use until the new one is approved." }),
      h("button", { class: "ghost small", type: "button", onclick: function () { lib.editDraft = P.id; lib.view = "read"; drawDocument(); } }, "Edit a new draft")));
    else if (!cs.length) area.appendChild(h("div", { class: "card" }, h("p", { class: "muted", text: "No comments yet. In \"" + (AVc ? (AVc.current ? "New draft" : "Draft (version " + P.version + ")") : "Draft and review") + "\", click \"Comment\" beside any part." }),
      h("button", { class: "ghost small", type: "button", onclick: function () { lib.view = "read"; drawDocument(); } }, "Go to " + (AVc ? (AVc.current ? "New draft" : "Draft (version " + P.version + ")") : "Draft and review"))));
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
    area.appendChild(h("div", { class: "card" }, h("p", { class: "small muted", text: "Every event on this document, newest first. Nobody can edit or delete these lines." }),
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
    var card = h("div", { class: "card" }, h("p", { class: "small muted", text: "Templates, forms and checklists kept with this document. They come from your firm's Files page; new versions of a file follow automatically." }));
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

  function doExport(format, which) {
    var w = format === "pdf" ? window.open("", "_blank") : null;
    api.post("/playbooks/export", { id: lib.pb.playbook.id, format: format, which: which || "", request_id: newId() }).then(function (r) {
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
    var input = h("input", { type: "file", "aria-label": "Choose a document file", accept: ".html,.htm,.md,.markdown,.txt" });
    var status = h("div", { class: "small", role: "status" });
    var go = h("button", { class: "blue" }, "Read the guide");
    go.addEventListener("click", function () {
      var file = input.files[0];
      if (!file) { D.toast(app, "Choose the exported Scribe file first.", true); return; }
      if (!tick.checked) { D.toast(app, D.errorText("tick_needed"), true); return; }
      if (file.size > lim("scribe_file_mb") * 1048576) { D.toast(app, D.errorText("file_too_big"), true); return; }
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
      h("p", { class: "small muted", text: "DELA reads the steps and screenshots, then shows them on a review screen where you check screenshots for client information, blur parts, fix steps and add why each step matters. Then DELA builds the document. Free Scribe accounts: open the guide's share page, press Ctrl+P (Cmd+P on a Mac), choose Save as PDF, upload it on the Files page, and ask DELA to turn it into a document." }),
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
    libEl.appendChild(h("p", { class: "muted", text: "Check every screenshot for client information, blur anything private, fix the steps, and add why each step matters. Nothing goes to the AI until you click Build my document." }));
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
    var btn = h("button", { class: "big" }, "Build my document");
    var attempt = 0;
    btn.addEventListener("click", function () {
      if (!confirm("Check your screenshots for client information before DELA builds your document. Build it now?")) return;
      build({});
    });
    function build(extra) {
      btn.disabled = true;
      btn.textContent = "Building...";
      api.post("/imports/build", { id: imp.id, context: ctx.value, attempt: attempt, lawfecta_once: extra.once === true, confirm_no_client_info: extra.confirm === true }).then(function (r) {
        btn.disabled = false;
        btn.textContent = "Build my document";
        if (!r.ok) {
          if (r.reason === "looks_like_client_info" && confirm(ciNote(r, "The steps may include " + kindsText(r.kinds) + ". Build anyway? Only if there is no client information."))) { build({ confirm: true }); return; }
          attempt++;
          D.toast(app, failText(r), true);
          return;
        }
        lib.questions = r.questions || [];
        lib.importId = null;
        openPlaybook(r.playbook_id, "read");
      }).catch(function (e) { btn.disabled = false; btn.textContent = "Build my document"; pbFail(e); });
    }
    libEl.appendChild(h("div", { class: "card" }, aiNotice(), h("label", { text: "Anything to add" }), ctx, h("div", { class: "row", style: "margin-top:10px" }, btn,
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
    // Only this person's unfinished parts (AI review 0.9.0, privacy 1): a part saved without an owner, or by someone else
    // who used this browser, is never offered to the person signed in now
    mine: function () { var me1 = me && me.person && me.person.id; return idb.all().then(function (all) { return (all || []).filter(function (p) { return me1 && p.owner === me1; }); }); },
    clear: function () { return idb.run("readwrite", function (st) { st.clear(); }).catch(function () {}); },
  };

  function uploadPart(recId, kind, seq, startMs, blob) {
    var key = recId + ":" + kind + ":" + seq;
    return idb.put({ key: key, recId: recId, kind: kind, seq: seq, startMs: startMs, blob: blob, at: Date.now(), owner: me && me.person && me.person.id }).then(function () {
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
    Promise.all([api.get("/recordings"), idb.mine()]).then(function (r) {
      if (prev && !prev.isConnected) return;
      recs.data = r[0];
      var waiting = r[1] || [];
      D.clear(card);
      if (prev) prev.replaceWith(card);
      var st = recs.data.settings;
      card.appendChild(h("div", { class: "row" }, h("h2", { class: "grow", text: "Recordings" }),
        st.on ? h("button", { class: "blue small", onclick: recordView }, "Record a process") : null));
      card.appendChild(h("p", { class: "small muted", text: "Videos are kept " + st.video_days + " days on your plan, then deleted; the document you build stays. Storage used: " + mbText(recs.data.used_bytes) + " of " + mbText(recs.data.limit_bytes) + "." }));
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
              x.playbook_id ? h("button", { class: "ghost small", onclick: function () { openPlaybook(x.playbook_id, "read"); } }, "Open document") : null,
              stuck(x) ? h("button", { class: "ghost small", onclick: function () {
                if (!confirm("Remove this recording? It did not finish uploading, so there is nothing to build from it. Record the process again.")) return;
                api.post("/recordings/discard", { id: x.id }).then(function (r) { if (r.ok === false) throw r; D.toast(app, "Recording removed"); drawLibrary(); }).catch(pbFail);
              } }, "Remove") : null,
              x.status === "failed" ? h("button", { class: "blue small", onclick: function () { api.post("/recordings/retry", { id: x.id }).then(function (r) { if (r.ok === false) throw r; D.toast(app, "Analyzing again"); drawLibrary(); }).catch(pbFail); } }, "Try again") : null,
              !x.video_deleted_at && x.video_bytes ? h("button", { class: "ghost small", onclick: function () { downloadVideo(x); } }, "Download video") : null,
              !x.video_deleted_at ? h("button", { class: "danger small", onclick: function () {
                if (!confirm("Delete this recording's video and screenshots now? A document built from it stays.")) return;
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
    var meter = h("div", { class: "bar", role: "img", "aria-label": "Microphone level" }, h("span", { style: "width:0%" }));
    var consent = h("input", { type: "checkbox", id: "dela-rec-consent" });
    var start = h("button", { class: "blue big", disabled: !st.consented }, "Start recording");
    // Uploading a recording needs the same consent as recording, and sends the real answer (AI review 0.9.0, privacy 2)
    var upBtn = h("button", { class: can ? "ghost" : "blue", disabled: !st.consented, onclick: function () { upload.click(); } }, "Upload a recording");
    consent.addEventListener("change", function () { start.disabled = !consent.checked; upBtn.disabled = !consent.checked; });
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
    var upload = h("input", { type: "file", "aria-label": "Choose a video file", accept: "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov", style: "display:none" });
    upload.addEventListener("change", function () { if (upload.files[0]) uploadRecording(upload.files[0], name.value, st, status, !!(st.consented || consent.checked)); });
    start.addEventListener("click", function () {
      if (!name.value.trim()) { D.toast(app, "Give the process a name first.", true); name.focus(); return; }
      if (probe) probe.getTracks().forEach(function (t) { t.stop(); });
      beginRecording(name.value.trim(), micSel.value, st, status, !st.consented && consent.checked);
    });
    D.clear(libEl);
    libEl.appendChild(h("div", { class: "row", style: "margin-top:14px" }, h("button", { class: "ghost small", onclick: function () { if (probe) probe.getTracks().forEach(function (t) { t.stop(); }); drawLibrary(); } }, "← Library")));
    libEl.appendChild(h("div", { class: "hero navy" }, h("span", { class: "badge", style: "background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.3)", text: "DELA RECORDER" }),
      h("h2", { text: "Record a process" }), h("p", { text: "Do the task the way you always do and talk through each step. DELA turns it into a document you can hand off." })));
    var card = h("div", { class: "card" }, h("label", { text: "Process name" }), name);
    if (can) {
      card.appendChild(h("label", { text: "Microphone" }));
      card.appendChild(micSel);
      card.appendChild(meter);
      if (!st.consented) card.appendChild(h("label", { style: "display:flex;gap:8px;align-items:flex-start;font-weight:600;margin-top:12px" }, consent, h("span", { text: st.consent_text })));
      card.appendChild(h("div", { class: "notice", style: "border-color:#e8c97a;background:#fff3d6;color:#5a3d00" }, h("b", { text: "💡 Before you start" }),
        h("ul", { style: "margin:6px 0 0" }, h("li", { text: "Close email and chat windows you don't need." }), h("li", { text: "Keep the whole process on one screen." }), h("li", { text: "Say out loud what you are doing and why." }), h("li", { text: "For the beta, record a practice run or non-client work. Confidential client information does not belong in DELA." }))));
      card.appendChild(h("p", { class: "small", text: "Your plan allows recordings up to " + st.max_minutes + " minutes." }));
      card.appendChild(h("div", { class: "row" }, start, upBtn, upload));
    } else {
      card.appendChild(h("p", { class: "notice", text: "Screen recording isn't available in this browser. Open DELA in Chrome, Edge, Firefox or Safari on a computer, or upload a recording you made elsewhere." }));
      if (!st.consented) card.appendChild(h("label", { style: "display:flex;gap:8px;align-items:flex-start;font-weight:600;margin-top:12px" }, consent, h("span", { text: st.consent_text })));
      card.appendChild(h("div", { class: "row" }, upBtn, upload));
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
  function uploadRecording(file, title, st, status, consented) {
    if (!/\.(mp4|webm|mov)$/i.test(file.name)) { D.toast(app, "Upload an MP4, MOV or WebM file.", true); return; }
    var v = document.createElement("video");
    v.preload = "auto";
    v.src = URL.createObjectURL(file);
    v.onerror = function () { status.textContent = "This browser cannot open that video. Try an MP4 or WebM file, or open DELA in Chrome."; };
    v.onloadedmetadata = function () {
      if (v.duration > st.max_minutes * 60 + 5) { status.textContent = "That recording is longer than your plan's " + st.max_minutes + " minutes."; return; }
      if (!v.captureStream && !v.mozCaptureStream) { status.textContent = "Uploading a recording needs Chrome, Edge or Firefox on a computer."; return; }
      api.post("/recordings/start", { title: title || file.name.replace(/\.[^.]+$/, ""), request_id: newId(), browser: browserName(), mime: file.type, source: "upload", consent: consented === true }).then(function (r) {
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
  var gigs = { id: null, view: "details", pendingInvite: null, newFrom: null, linkTo: null };
  try { var gq = new URLSearchParams(location.search).get("gig"); if (gq && /^[0-9a-f-]{36}$/.test(gq)) gigs.id = gq; } catch (e) { /* no deep link */ }
  // One color per meaning on every page (UI review 2026-11-08): yellow needs you, blue in progress, green done,
  // grey waiting on someone else, faded grey closed, red a problem. The words always say the state too.
  function gigTone(st) { return { open: "ready", paused: "held", filled: "R", closed: "off", canceled: "off" }[st] || ""; }
  function propTone(st) { return { sent: "R", held: "held", selected: "ready", withdrawn: "off", not_selected: "off", closed: "off" }[st] || ""; }
  function agTone(e) { return e.needs_me ? "held" : ({ active: "R", completed: "ready", canceled: "off", disputed: "bad", paused: "bad" }[e.status] || ""); }
  function agBadge(e) { return h("span", { class: "badge " + agTone(e), text: e.needs_me === "sign" ? "Needs your signature" : AG_STATUS[e.status] || e.status }); }
  var GIG_STATUS = { draft: "Draft", open: "Open", paused: "Paused by the Lawfecta Team", closed: "Closed", filled: "Filled", canceled: "Canceled" };
  var PROP_STATUS = { draft: "Draft", sent: "Sent", held: "Being checked", withdrawn: "Withdrawn", selected: "Chosen", not_selected: "Not chosen", closed: "Closed" };
  var GIG_ERR = {
    gigs_off: "Flex Gigs are not open for your account yet.", playbook_not_approved: "Only an approved SOP or Workflow can become a gig. Approve it in the Library first.",
    not_verified: "Posting work and hiring need a verified license. Open Profile and verification from your account menu.",
    gig_needs_task: "Describe the task in the public version first.", deadline_past: "The deadline is in the past. Choose a later date.",
    gig_closed: "This gig is closed.", gig_not_open: "This gig is not open for that now.", no_more_extensions: "This gig was already extended once.",
    freelancer_not_available: "This freelancer is not available for this gig right now.", proposal_needs_price: "Enter your total price.",
    proposal_needs_included: "Say what your price includes.", proposal_needs_schedule: "Say when you would deliver, or how many days you need.",
    too_many_proposals: "You have sent a lot of proposals in a short time. Try again later.", proposal_withdrawn: "You withdrew your proposal for this gig.",
    already_sent: "This proposal was already sent.", proposal_not_available: "This proposal can no longer be chosen.", talent_off: "Talent search is not open for your account yet.",
    changed_elsewhere: "Someone saved this gig while you were working. Reload it, then make your change again.", budget_too_high: "That budget is higher than DELA accepts.",
    needs_reconfirm: "The freelancer needs to confirm this proposal first, because the gig changed a lot or the proposal is older than its actionable days. Click \"Ask to confirm\".",
    sensitive_job: "This job is marked as involving sensitive data, so files cannot be uploaded or shared here. Use a secure document link instead.",
    pick_team: "Choose at least one person in \"Who will do this work\".", team_member_not_ready: "One of the people you chose has not finished their own verification, or is not on your agency's team.",
    agency_already_proposed: "Your agency already sent a proposal for this gig.", agency_managers_only: "Only the agency's owner or a manager can do that.",
    agency_owner_only: "Only the agency's owner can do that.", agency_inactive: "Your agency is not on Freelancer Business right now, so team changes and agency proposals are paused. Jobs already running continue.",
    no_seats: "All of your agency's seats are used. Remove someone, or ask the Lawfecta Team about more seats.", not_a_freelancer: "There is no Lawfecta freelancer with that email. Ask them to join Lawfecta as a freelancer first, then invite them again.",
    already_on_team: "That person is already on your team.", owner_stays: "The owner stays on the team.", bad_role: "Choose Manager or Member.",
    business_details_needed: "Enter the business name and the two-letter state where it is registered (for example TX).", invite_expired: "This invitation has expired. Ask the agency to send a new one.",
    keep_one_person: "Keep at least one person on the job. Add someone else first.", agreement_closed: "This engagement is closed.",
    bad_split: "The agency's share is outside the allowed range. Use a share inside the range shown with the box.", sign_needed: "Type your full name and tick the box to sign.", tick_to_accept: "Tick the box to accept the split for this job.",
    bench_plus_needed: "Plus plan or higher required to join a bench. Upgrade your Lawfecta membership to Freelancer Plus, then sign.",
    bench_plus_needed_them: "They need Freelancer Plus or higher before they can join your bench. Their invitation stays open.",
    bench_invite_expired: "This bench invitation has expired. Ask the agency to send a new one.", waiting_for_other_side: "You already signed this version. It is waiting for the other side.",
    nothing_to_sign: "There is nothing waiting for your signature.", agency_bench_off: "The agency bench is not open for your account yet.",
    clients_only: "Only attorneys and agencies that hire can do that.", agency_not_ready: "Your agency cannot post yet. Open the Agency page to see what is missing.",
    agency_details_missing: "Add the agency's client details on the Agency page (who signs, billing address, email for notices) before signing.", client_details_needed: "Add who signs for the agency and the billing address.",
    split_below_fee: "At that split the agency's share does not cover the freelancer fee on this milestone. Raise the agency's share.",
    already_assigned: "This milestone is already assigned. Take it back first.", not_on_bench: "Choose someone who is on your bench with a signed split.",
    bench_member_inactive: "They are on the Free plan, so they cannot get new assignments until they upgrade.", no_subcontractors: "This engagement says no subcontractors, so its milestones cannot be assigned to bench members and no gig can be posted for part of it.",
    subcontracting_off: "Posting gigs for part of a job is not open for your account yet.", subcontractors_in_use: "Someone is already working on this job as a subcontractor, so No subcontractors cannot be turned on.",
    agreement_signed: "Both of you signed this agreement, so this choice can no longer change.", gig_already_posted: "This gig is already posted, so it cannot be linked to a job now.",
    milestone_started: "Work on this milestone has started or finished, so its assignment cannot change.", split_not_accepted: "The bench member has not accepted the split for this job yet, so work cannot start.",
    share_expired: "Access to this file has ended. Ask the attorney to share it again if you still need it.",
    blocked_data: "This file appears to contain sensitive data like a Social Security or card number. Please share it using a secure link instead.",
  };
  // A gig this account cannot open (another member's, or removed): never "refresh the page" (ChatGPT agency gigs test 2026-11-05)
  var GIG_NOT_YOURS = "This gig is not available to your account. It belongs to another member, or it was removed.";
  function gigErr(r) {
    if (!r) return "That did not work.";
    if (DOC_ERR[r.reason]) return DOC_ERR[r.reason];
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
      if (!e.can_post) el.appendChild(h("p", { class: "notice", text: r.agency ? "Your agency cannot post yet. You can still draft gigs. Open the Agency page to see what is missing." : "Posting work and hiring need a verified license. You can still draft gigs. Open Profile and verification from your account menu." }));
      if (gigs.pendingInvite) el.appendChild(h("p", { class: "notice", text: "Post a gig, then invite " + gigs.pendingInvite.name + " from its Matches view or from Talent." }));
      // New gig
      var pick = h("select", { "aria-label": "Approved SOP or Workflow" }, [h("option", { value: "", text: r.playbooks.length ? "Choose an approved SOP or Workflow" : "No approved SOPs or Workflows yet" })].concat(r.playbooks.map(function (p) {
        return h("option", { value: p.id, text: (p.doc_id ? p.doc_id + " " : "") + p.title, selected: gigs.newFrom === p.id });
      })));
      var notes = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Anything freelancers should know (optional)", placeholder: "Anything freelancers should know (optional). No client information." });
      var bmin = h("input", { type: "number", min: "0", step: "1", "aria-label": "Budget from ($)", placeholder: String((r.min_budget_cents || 0) / 100) });
      var bmax = h("input", { type: "number", min: "0", step: "1", "aria-label": "Budget to ($)" });
      var go = h("button", { class: "blue", type: "button" }, "Draft the gig with DELA");
      var req = newId();
      // One-off or Monthly (Step 7c answer 1): a monthly gig's budget is the monthly price
      var kOne = h("input", { type: "radio", name: "gig_kind", value: "one_off", checked: true }), kMon = h("input", { type: "radio", name: "gig_kind", value: "monthly" });
      var kindRow = (me.switches || {}).recurring_engagements ? h("div", { class: "row", style: "gap:16px;margin-bottom:6px" },
        h("label", { style: "display:flex;gap:6px;font-weight:400" }, kOne, h("span", { text: "One-off" })),
        h("label", { style: "display:flex;gap:6px;font-weight:400" }, kMon, h("span", { text: "Monthly" })),
        h("span", { class: "small muted", text: "Monthly: the same work every month for a flat monthly price, until either of you cancels. The budget is the monthly price." })) : null;
      // The budget is for the work; the client's platform fee comes on top (UX review P02). The rate comes from the api's settings.
      var fee = r.fee || {}, feeNote = h("p", { class: "small muted", id: "gig-fee-note" });
      function feeOf(c) { return Math.max(Math.round(c * (fee.client_bps || 0) / 10000), fee.floor_cents || 0); }
      function showFee() {
        var mon = kMon.checked, lo = Math.round(Number(bmin.value || 0) * 100), hi = Math.round(Number(bmax.value || 0) * 100);
        var est = lo > 0 ? " Estimated total" + (mon ? " each month" : "") + ": " + D.money(lo + feeOf(lo)) + (hi > lo ? " to " + D.money(hi + feeOf(hi)) : "") + "." : "";
        feeNote.textContent = (mon ? "The budget is the monthly price for the work. " : "The budget covers the work. ") + (fee.client_bps ? "Your platform fee (" + (fee.client_bps / 100) + "%, at least " + D.money(fee.floor_cents) + (mon ? " each month" : "") + ") is added and shown before signing." : "Your platform fee is added and shown before signing.") + est;
      }
      [bmin, bmax, kOne, kMon].forEach(function (x) { x.addEventListener("input", showFee); x.addEventListener("change", showFee); });
      showFee();
      go.addEventListener("click", function () {
        if (!pick.value) { D.toast(app, "Choose an approved SOP or Workflow first.", true); return; }
        var chosen = r.playbooks.filter(function (p) { return p.id === pick.value; })[0] || {};
        gigImageWarning(chosen.images || 0, function () {
          go.disabled = true; go.textContent = "DELA is writing the public version...";
          api.post("/gigs/draft", { playbook_id: pick.value, request_id: req, notes: notes.value, budget_min: bmin.value, budget_max: bmax.value, linked_agreement: gigs.linkTo ? gigs.linkTo.id : undefined, kind: kMon.checked ? "monthly" : "one_off" }).then(gigOk).then(function (x) {
            gigs.newFrom = null; gigs.linkTo = null; gigLink(x.id, "projects");
          }).catch(function (x) { go.disabled = false; go.textContent = "Draft the gig with DELA"; gigFail(x); });
        }, function () { tab = "library"; lib.pb = null; draw(); setTimeout(function () { openPlaybook(chosen.id, "read"); }, 50); });
      });
      // The new gig form opens on request once there is work to manage (UX review P01); it starts open with no gigs yet
      var formOpen = gigs.formOpen || !r.gigs.some(function (g) { return g.status === "open" || g.status === "draft"; }) || !!gigs.newFrom || !!gigs.linkTo || !!gigs.pendingInvite;
      if (!formOpen) el.appendChild(h("div", { class: "card", id: "new-gig-card" }, h("div", { class: "row" }, h("h2", { class: "grow", style: "margin:0", text: "Post a new gig" }),
        h("button", { class: "blue small", type: "button", onclick: function () { gigs.formOpen = true; draw(); } }, "Start a new gig")),
        h("p", { class: "small muted", style: "margin:6px 0 0", text: "Turn an approved SOP or Workflow into a Flex Gig. One-off or monthly." })));
      else el.appendChild(h("div", { class: "card", id: "new-gig-card" }, h("h2", { text: "Post a new gig" }),
        h("p", { class: "small muted", text: "DELA writes a public version of the document for freelancers. You check it, set the budget (at least " + D.money(r.min_budget_cents) + ") and the deadline, then post. Open gigs on your plan: " + (al.unlimited ? "no cap" : (al.used || 0) + " of " + al.limit + " in use") + "." }),
        gigs.linkTo ? h("p", { class: "notice", text: "Linked to: " + gigs.linkTo.title + ". Whoever you hire is listed on the attorney's \"Who's working on this\", as your subcontractor. Share with them only what their part needs." },
          " ", h("button", { class: "ghost small", type: "button", onclick: function () { gigs.linkTo = null; draw(); } }, "Do not link")) : null,
        kindRow, field("Document", pick), notes, h("div", { class: "row" }, field("Budget from ($)", bmin), field("Budget to ($)", bmax)), feeNote, h("div", { class: "row" }, go)));
      // What needs the attorney now (UX review P01): proposals to review, questions to answer, drafts to post, agreements to sign
      var todo = h("div", { class: "card", id: "needs-action" }, h("h2", { text: "Needs your action" }));
      var todoList = h("ul", { class: "list" });
      todo.appendChild(todoList);
      function todoItem(text, label, go) { todoList.appendChild(h("li", { class: "row" }, h("span", { class: "grow", text: text }), h("button", { class: "ghost small", type: "button", onclick: go }, label))); }
      // One definition of "needs your action", shared with Notices (step 8b, retest R02). Drafts are not action: they
      // are listed under "Your gigs".
      gigActionItems(r.gigs).forEach(function (x) { todoItem(x.text, x.label, x.open); });
      function todoEmpty() { if (!todoList.children.length && !todo.querySelector(".muted")) todo.appendChild(h("p", { class: "muted", style: "margin:0", text: "Nothing waits on you right now." })); else if (todoList.children.length) { var m = todo.querySelector("p.muted"); if (m) m.remove(); } }
      todoEmpty();
      el.appendChild(todo);
      // My gigs: open and drafts first; filled, closed and the rest behind a filter; a short first page (UX review P01)
      var list = h("div", { class: "card" }, h("h2", { text: "Your gigs" }));
      var GF = [["active", "Open and drafts", function (g) { return g.status === "open" || g.status === "draft" || g.status === "paused"; }], ["filled", "Filled", function (g) { return g.status === "filled"; }],
        ["closed", "Closed", function (g) { return g.status === "closed" || g.status === "canceled"; }], ["all", "All", function () { return true; }]];
      var gf = GF.filter(function (f) { return f[0] === (gigs.listFilter || "active"); })[0] || GF[0];
      if (r.gigs.length) list.appendChild(h("div", { class: "pills", style: "margin-bottom:8px" }, GF.map(function (f) {
        return h("button", { "aria-pressed": String(f[0] === gf[0]), onclick: function () { gigs.listFilter = f[0]; gigs.listMore = false; draw(); } }, f[1] + " (" + r.gigs.filter(f[2]).length + ")");
      })));
      var shown = r.gigs.filter(gf[2]);
      if (!r.gigs.length) list.appendChild(h("p", { class: "muted", text: "No gigs yet." }));
      else if (!shown.length) list.appendChild(h("p", { class: "muted", text: "None in this view." }));
      var PAGE = 6, rest = 0;
      if (shown.length > PAGE && !gigs.listMore) { rest = shown.length - PAGE; shown = shown.slice(0, PAGE); }
      shown.forEach(function (g) {
        list.appendChild(h("div", { class: "work", style: "cursor:pointer", role: "button", tabindex: "0", onclick: function () { gigLink(g.id, "projects"); } },
          h("span", { class: "chip", text: g.proposals ? String(g.proposals) : "0" }),
          h("div", null, h("h3", { text: g.title }), h("div", { class: "muted small", text: (g.kind === "monthly" ? "Monthly | " : "") + (g.linked_to ? "Linked to " + g.linked_to + " | " : "") + budgetText(g) + " | " + closesText(g) + " | " + g.proposals + (g.proposals === 1 ? " proposal" : " proposals") + (g.questions_open ? " | " + g.questions_open + " questions to answer" : "") })),
          h("span", { class: "grow" }), h("span", { class: "badge " + gigTone(g.status), text: GIG_STATUS[g.status] })));
      });
      if (rest) list.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { gigs.listMore = true; draw(); } }, "Show " + rest + " more"));
      el.appendChild(list);
      if ((me.switches || {}).engagements) {
        var engSlot = h("div"); el.appendChild(engSlot);
        engagementsList(engSlot, "Engagements", function (list) {
          engActionItems(list).forEach(function (x) { todoItem(x.text, x.label, x.open); });
          todoEmpty();
        });
      }
      var stSlot = h("div"); el.appendChild(stSlot); standingCard(stSlot);
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    return el;
  }

  // What needs the member now, worked out from the live work (step 8b, retest R02): Projects and Notices both use these
  // One duration, said once (step 8b, retest R10): "10 days (10 days)" became "10 days from signing"
  function scheduleText(p) {
    var sch = String(p.schedule || "").trim(), d = p.days_to_deliver;
    if (!d) return sch || "-";
    var says = new RegExp("^" + d + "\\s*(business\\s+)?days?\\.?$", "i").test(sch);
    if (!sch || says) return d + (d === 1 ? " day" : " days") + " from signing";
    // The freelancer's own words already give the same number (for example "Within 5 business days"): say only when it starts
    if (new RegExp("\\b" + d + "\\s+(business\\s+)?days?\\b", "i").test(sch)) return sch + ", from signing";
    return sch + " (" + d + (d === 1 ? " day" : " days") + " from signing)";
  }
  // A monthly change shown next to what is in force now (step 8b, retest R10): each task's quantity, the price and the
  // way units are delivered, current and proposed side by side, and when it would start
  function changeCompare(cur, prop, mv, approved) {
    cur = cur || {};
    var names = [], qty = function (list, name) { var x = (list || []).filter(function (t) { return t.task === name; })[0]; return x ? x.quantity + " each month" + (x.turnaround ? ", within " + x.turnaround : "") : "Not included"; };
    (cur.tasks || []).concat(prop.tasks || []).forEach(function (t) { if (names.indexOf(t.task) < 0) names.push(t.task); });
    var mode = function (m) { return m === "monthly" ? "One monthly delivery" : "Weekly units"; };
    var rows = [["Monthly price (before the platform fee)", D.money(cur.price_cents), D.money(prop.price_cents)]];
    // AI review 0.10.0 (payments 4): what the attorney is charged each month, with the platform fee, from the server
    var tot = (mv && mv.totals) || {};
    if (tot.receives_now !== null && tot.receives_now !== undefined && tot.receives_proposed !== null && tot.receives_proposed !== undefined) rows.push(["You receive each month, after your platform fee", D.money(tot.receives_now), D.money(tot.receives_proposed)]);
    else if (tot.now !== null && tot.now !== undefined && tot.proposed !== null && tot.proposed !== undefined) rows.push(["Total each month, with the platform fee", D.money(tot.now), D.money(tot.proposed)]);
    rows = rows.concat([["Delivery", mode(cur.unit_mode), mode(prop.unit_mode)]]).concat(names.map(function (n) { return [n, qty(cur.tasks, n), qty(prop.tasks, n)]; }));
    // AI review 0.10.0 (payments 5): the deadline comes from the setting recurring.change_deadline_days
    var dl = (mv && mv.change_deadline_days) || 1, dlText = dl + (dl === 1 ? " day" : " days");
    var starts = mv && mv.next && mv.next.bill_on ? "From the month that starts " + D.date(mv.next.bill_on) + ", if approved at least " + dlText + " before." : "From the next month, if approved at least " + dlText + " before billing.";
    if (approved) starts = mv && mv.next && mv.next.bill_on ? "It starts with the month that begins " + D.date(mv.next.bill_on) + "." : "It starts with the next month.";
    return h("div", null, h("div", { class: "scroll" }, h("table", { class: "stack", style: "width:100%" },
      h("thead", null, h("tr", null, h("th", { text: "" }), h("th", { text: "Now" }), h("th", { text: approved ? "From next month" : "Proposed" }))),
      h("tbody", null, rows.map(function (r) { return h("tr", { class: r[1] !== r[2] ? "changed" : "" }, h("td", { "data-label": "", text: r[0] }), h("td", { "data-label": "Now", text: r[1] }), h("td", { "data-label": "Proposed" }, r[1] !== r[2] ? h("b", { text: r[2] }) : r[2])); })))),
      h("p", { class: "small muted", text: starts }));
  }
  // Step 8b Part C (retest R10): a change note whose numbers disagree with the change itself is flagged, never resolved.
  // For example "two more packets a week" while the table moves a monthly allowance from 10 to 12. DELA does not guess
  // which one is meant; the person checks with the other side before approving.
  var NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20 };
  function noteConflict(note, cur, prop) {
    var text = String(note || "");
    if (!text) return "";
    var deltas = [];
    var names = [];
    ((cur || {}).tasks || []).concat((prop || {}).tasks || []).forEach(function (t) { if (names.indexOf(t.task) < 0) names.push(t.task); });
    names.forEach(function (n) {
      var q = function (list) { var x = (list || []).filter(function (t) { return t.task === n; })[0]; return x ? Number(x.quantity) || 0 : 0; };
      var a = q((cur || {}).tasks), b = q((prop || {}).tasks);
      if (a !== b) deltas.push({ task: n, from: a, to: b, d: Math.abs(b - a) });
    });
    var re = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)\s+(?:more\s+|fewer\s+|less\s+|extra\s+|additional\s+)?(?:[a-z]+\s+){0,2}?(?:a|per|each)\s+(week|month)\b/gi;
    var m, out = "";
    while ((m = re.exec(text)) && !out) {
      var n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUM_WORDS[m[1].toLowerCase()];
      var per = m[2].toLowerCase();
      var fits = deltas.some(function (x) { return per === "month" ? x.d === n : x.d >= n * 4 && x.d <= n * 5; });
      if (!fits) out = "Check this before approving: the note says \"" + m[0] + "\", but " + (deltas.length ? deltas.map(function (x) { return x.task + " goes from " + x.from + " to " + x.to + " each month"; }).join("; ") : "no monthly quantity changes in the table") + ". DELA does not decide which one is meant. Ask the other person, and approve only if the table is what you both mean.";
    }
    return out;
  }
  function gigActionItems(list) {
    var out = [];
    (list || []).forEach(function (g) {
      if (g.questions_open) out.push({ text: g.title + ": " + g.questions_open + (g.questions_open === 1 ? " question" : " questions") + " to answer", label: "Answer", open: function () { tab = "projects"; gigs.id = g.id; gigs.view = "questions"; draw(); } });
      if (g.status === "open" && g.proposals) out.push({ text: g.title + ": " + g.proposals + (g.proposals === 1 ? " proposal" : " proposals") + " to review", label: "Review proposals", open: function () { tab = "projects"; gigs.id = g.id; gigs.view = "proposals"; draw(); } });
    });
    return out;
  }
  function engActionItems(list) {
    var words = { sign: ["the agreement needs your signature", "Open the agreement"], review: ["a delivery waits for your review", "Review the delivery"], pay: ["the next milestone waits for payment", "Open the payment"] };
    return (list || []).filter(function (x) { return words[x.needs_me]; }).map(function (x) {
      return { text: x.gig_title + ": " + words[x.needs_me][0], label: words[x.needs_me][1], open: function () { tab = me.side === "attorney" ? "projects" : "work"; gigs.id = x.gig_id; gigs.view = "agreement"; draw(); } };
    });
  }
  // Fix (AI review 0.10.0, tests 5): a list that cannot load marks the result "failed", so Notices never says nothing
  // waits when it simply could not check
  function liveActions() {
    var failed = false, miss = function () { failed = true; return []; };
    var gigsP = me.side === "attorney" && (me.switches || {}).flex_gigs ? api.get("/gigs").then(function (r) { return r.ok === false ? miss() : gigActionItems(r.gigs); }, miss) : Promise.resolve([]);
    var engP = (me.switches || {}).engagements ? api.get("/engagements").then(function (r) { return r.ok === false ? miss() : r.on ? engActionItems(r.engagements) : []; }, miss) : Promise.resolve([]);
    return Promise.all([gigsP, engP]).then(function (a) { var out = a[0].concat(a[1]); out.failed = failed; return out; });
  }

  function gigPage(el) {
    api.get("/gigs/get?id=" + gigs.id).then(function (r) {
      D.clear(el);
      el.appendChild(h("div", { class: "row" }, h("button", { class: "ghost small", onclick: function () { gigs.id = null; draw(); } }, "← All gigs")));
      if (!r.ok) { el.appendChild(h("p", { class: "notice", text: r.reason === "not_found" ? GIG_NOT_YOURS : gigErr(r) })); return; }
      var g = r.gig;
      el.appendChild(h("div", { class: "row" }, h("h1", { class: "grow", text: g.title }), h("span", { class: "badge " + gigTone(g.status), text: GIG_STATUS[g.status] })));
      el.appendChild(h("p", { class: "muted", text: budgetText(g) + " | " + closesText(g) + (r.counts ? " | " + r.counts.proposals + (r.counts.proposals === 1 ? " proposal, " : " proposals, ") + r.counts.invited + " invited" : "") }));
      if (g.paused_by_team) el.appendChild(h("p", { class: "notice bad", text: "The Lawfecta Team paused this gig while they check it. Freelancers cannot send proposals until it opens again." }));
      if (g.kind === "monthly") el.appendChild(h("p", { class: "small", text: "Monthly gig: the budget is the monthly price. The agreement lists the work included each month." }));
      if (r.linked_to) el.appendChild(h("p", { class: "notice", text: "Linked to " + r.linked_to.title + ". Whoever you hire is listed on the attorney's \"Who's working on this\", as your subcontractor." }));
      var views = [["details", "Details"], ["matches", "Matches"], ["questions", "Questions" + (r.counts && r.counts.questions_open ? " (" + r.counts.questions_open + ")" : "")], ["proposals", "Proposals" + (r.counts ? " (" + r.counts.proposals + ")" : "")], ["files", "Files (" + r.files.length + ")"]];
      if ((me.switches || {}).engagements && (g.status === "filled" || gigs.view === "agreement")) views.push(["agreement", "Agreement and work"]);
      if (gigs.view === "agreement" && !(me.switches || {}).engagements) gigs.view = "details";
      el.appendChild(h("div", { class: "pills", role: "tablist", "aria-label": "Gig views" }, views.map(function (v) {
        return h("button", { role: "tab", "aria-selected": String(gigs.view === v[0]), onclick: function () { gigs.view = v[0]; draw(); } }, v[1]);
      })));
      var body = h("div");
      el.appendChild(body);
      ({ details: gigDetails, matches: gigMatches, questions: gigQuestions, proposals: gigProposals, files: gigFiles, agreement: function (x) { engagementPanel(x, g.id); } })[gigs.view](body, r);
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  // ---------- UX review Phase 4 part B: the checks before a commitment (docs/briefs/step-8a-phase-4.md) ----------
  // One look for every check: a ✦ button, how many DELA actions it uses (from settings), then an "AI suggestion" panel with
  // Use suggestion, Edit and Dismiss. A suggestion only fills the unsaved form; nothing is saved, posted, signed or paid.
  var helperInfo = null;
  function loadHelpers() { if (!helperInfo) helperInfo = api.get("/helpers").catch(function () { return { on: false, credits: {} }; }); return helperInfo; }
  var HELPER_FIELD = { title: "Title", task: "The task", outcome: "What done looks like", steps: "Steps", timing: "Usual time", budget: "Budget", deadline: "Deadline", milestones: "Milestones",
    included: "Included", excluded: "Not included", schedule: "Schedule", price: "Price", quantity: "Included each month", turnaround: "Turnaround", exclusions: "Not included", days: "Days to deliver",
    qualifications: "Qualifications", message: "Note", other: "In general", step: "Step", purpose: "Purpose", scope: "Scope", request: "Your request",
    body: "Your review", compose: "Your message", size: "Firm size", practice_areas: "Practice areas", jurisdictions: "Jurisdictions", practice_area: "Practice area", skill: "Skill", tool: "Tech tool", state: "State" };
  var HELPER_ERR = { helpers_off: "DELA's checks are not on for your account yet.", need_two_proposals: "Compare needs at least two proposals.", no_tasks: "Add at least one task first.",
    not_monthly: "This is not a monthly engagement.", no_credits_left: "You have used this month's DELA actions.", no_steps: "Add at least one step first.",
    nothing_to_explain: "Every check passed, so there is nothing to explain.", no_text: "Type a few words first.", ratings_first: "Choose your ratings first.",
    notes_first: "For a low rating, write your own notes in Your review first. DELA only tidies what you wrote.", notes_needed: "Write your own notes in Your review first. DELA only tidies what you wrote." };
  function helperButton(key, label, getBody, opts) {
    opts = opts || {};
    var wrap = h("div", { class: "helper", "data-helper": key, style: "margin:8px 0" });
    loadHelpers().then(function (info) {
      if (!info || !info.on) return;
      var n = (info.credits || {})[key] || 1;
      var btn = h("button", { class: "ghost small ai-btn", type: "button" }, label);
      var out = h("div", { class: "soft", style: "margin-top:6px;padding:10px 12px;border-radius:12px", hidden: true, role: "status" });
      wrap.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;align-items:center;gap:8px" }, btn, h("span", { class: "small muted", text: "Uses " + n + " DELA action" + (n === 1 ? "" : "s") + " on Lawfecta's AI (none on your own key)." })));
      wrap.appendChild(out);
      function run(confirmed) {
        btn.disabled = true; var was = btn.textContent; btn.textContent = "DELA is checking...";
        api.post("/helpers/run", Object.assign({ helper: key, confirm_no_client_info: confirmed === true }, getBody())).then(function (x) {
          btn.disabled = false; btn.textContent = was;
          if (x.reason === "looks_like_client_info") { if (confirm(ciNote(x, "This may include client information (" + kindsText(x.kinds) + "). Use placeholders instead. Click OK only if it is not client information."))) run(true); return; }
          if (!x.ok) throw x;
          out.hidden = false; D.clear(out);
          out.appendChild(h("div", { class: "row", style: "align-items:center;margin-bottom:6px" }, D.aiLabel(), h("span", { class: "grow" }),
            h("button", { class: "ghost small", type: "button", onclick: function () { out.hidden = true; } }, "Dismiss")));
          if (opts.render) opts.render(out, x); else helperFindings(out, x.findings || [], opts);
          out.appendChild(h("p", { class: "small muted", style: "margin:8px 0 0", text: x.note || "" }));
        }).catch(function (e) {
          btn.disabled = false; btn.textContent = was;
          var r = e && (e.reason || e.message);
          out.hidden = false; D.clear(out); out.appendChild(h("p", { class: "notice bad", style: "margin:0", text: HELPER_ERR[r] || D.errorText(r) }));
        });
      }
      btn.addEventListener("click", function () { run(false); });
    });
    return wrap;
  }
  // Findings: what DELA flagged, where, and a suggestion that fills the form only when the member clicks
  function helperFindings(out, list, opts) {
    if (!list.length) { out.appendChild(h("p", { style: "margin:0", text: "DELA found nothing to flag." })); return; }
    var ul = h("ul", { class: "list", style: "margin:0" });
    var applyAll = [];
    // MVP re-test 2026-11-09: when every suggestion gives the same reason, say it once
    var shared = list.length > 1 && list.every(function (f) { return f.problem === list[0].problem; }) ? list[0].problem : "";
    if (shared) out.appendChild(h("p", { class: "small", style: "margin:0 0 6px", text: shared }));
    list.forEach(function (f) {
      var target = opts.field ? opts.field(f) : null;
      if (!target && opts.apply && f.suggestion && (!opts.canApply || opts.canApply(f))) target = { apply: opts.apply };
      var fname = String(f.field).indexOf("sys:") === 0 ? "Systems" : (HELPER_FIELD[f.field] || f.field);
      var li = h("li", { style: "display:block;padding:6px 0" }, h("div", null, h("b", { text: (f.row ? (opts.rowWord || "Task") + " " + f.row + ", " : "") + fname + (shared ? "" : ": ") }), shared ? null : h("span", { text: f.problem })));
      if (f.suggestion) li.appendChild(h("div", { class: "small", style: "white-space:pre-line;margin:4px 0", text: "Suggestion: " + f.suggestion }));
      var acts = h("div", { class: "row", style: "flex-wrap:wrap;gap:6px" });
      if (f.suggestion && target) {
        var put = function () { if (target.apply) { target.apply(f); return; } target.value = f.suggestion; target.dispatchEvent(new Event("input")); target.dispatchEvent(new Event("change")); };
        // "Use all suggestions" leaves out the ones the member dismissed or already used (launch review, item 14)
        applyAll.push(function () { if (li.dataset.done) return; li.dataset.done = "1"; put(); li.remove(); });
        acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { li.dataset.done = "1"; put(); li.remove(); D.toast(app, opts.toast || "Added to the form. Nothing is saved until you save."); } }, "Use suggestion"));
        acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { li.dataset.done = "1"; put(); li.remove(); if (target.focus) target.focus(); } }, "Edit"));
      }
      acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { li.dataset.done = "1"; li.remove(); } }, "Dismiss"));
      li.appendChild(acts);
      ul.appendChild(li);
    });
    // MVP test 2026-11-09 (steps 13 and 19): one click to use every suggestion; still the member's choice
    if (applyAll.length > 1) {
      out.appendChild(h("div", { class: "row", style: "margin:0 0 6px" }, h("button", { class: "blue small", type: "button", onclick: function (e) {
        applyAll.forEach(function (fn) { fn(); }); e.target.remove(); D.toast(app, opts.toast || "Added to the form. Nothing is saved until you save.");
      } }, "Use all suggestions")));
    }
    out.appendChild(ul);
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
        if (x.reason === "looks_like_client_info") { if (confirm(ciNote(x, "This may include client information (" + kindsText(x.kinds) + "). Use placeholders instead. Click OK only if it is not client information."))) return api.post("/gigs/save", Object.assign(payload(), { confirm_no_client_info: true })).then(gigOk); throw { reason: "canceled" }; }
        return gigOk(x);
      }).then(function (x) { if (then) return then(); draw(); D.toast(app, x.big_change ? "Saved. This was a big change, so applicants are asked to confirm their proposals." : "Saved"); }).catch(function (e) { if (e && e.reason !== "canceled") gigFail(e); });
    }
    body.appendChild(h("div", { class: "card" }, h("h2", { text: "Public version" }),
      h("p", { class: "small muted", text: "Matched freelancers read this before they spend a proposal. Invited and hired freelancers also see their part of the document (an SOP, or a workflow's steps for the freelancer role), with their name as a watermark. No client information." + (g.status === "open" ? " Changing the budget or the work tells applicants; a big change asks them to confirm their proposals." : "") }),
      field("Title", f.title), field("The task", f.task, "Two or three sentences: what the freelancer will do."), field("What done looks like", f.outcome), field("Steps, one per line", f.steps),
      field("Tools", f.tools, "Separated by commas. DELA matches freelancers who use them."), field("Skills", f.skills, "Separated by commas."),
      h("div", { class: "row" }, field("Practice area", f.area), field("State", f.state), field("Usual time", f.timing))));
    body.appendChild(h("div", { class: "card" }, h("h2", { text: "Budget, deadline and milestones" }),
      h("div", { class: "row" }, field("Budget from ($)", f.bmin), field("Budget to ($)", f.bmax), field("Deadline", f.deadline)),
      field("Milestones (private)", f.miles, "For example: Draft, then Final. Freelancers see milestones only after you hire them; DELA sets the final milestones with the agreement.")));
    if (g.status === "draft") body.appendChild(helperButton("check_scope", "✦ Check the scope", function () {
      var p = payload(); return { gig_id: g.id, draft: { title: p.public.title, task: p.public.task, outcome: p.public.outcome, steps: p.public.steps, timing: p.public.timing, budget_min: p.budget_min, budget_max: p.budget_max, deadline: p.deadline, milestones: lines(f.miles.value) } };
    }, { field: function (x) { return { title: f.title, task: f.task, outcome: f.outcome, steps: f.steps, timing: f.timing, milestones: f.miles }[x.field] || null; } }));
    var acts = h("div", { class: "row" });
    if (editable) acts.appendChild(h("button", { class: "ghost", type: "button", onclick: function () { save(); } }, "Save"));
    if (g.status === "draft") acts.appendChild(h("button", { class: "blue", type: "button", onclick: function () {
      save(function () { return api.post("/gigs/publish", { id: g.id }).then(gigOk).then(function (x) { gigs.view = "matches"; draw(); D.toast(app, "Your gig is open until " + D.dateTime(x.closes_at)); }).catch(gigFail); });
    } }, "Post the gig"));
    // Day counts and the number of extensions come from Settings (AI review 0.9.0, payments 6)
    var rules = r.rules || {}, extDays = rules.extension_days, extLeft = (g.max_extensions || 0) - (g.extensions || 0);
    if (g.status === "open" && g.extensions < g.max_extensions) acts.appendChild(h("button", { class: "ghost", type: "button", onclick: function () {
      if (!confirm("Keep this gig open " + (extDays ? "for " + extDays + " more days" : "longer") + "? " + (extLeft === 1 ? "You can extend it once." : "You can extend it " + extLeft + " more times."))) return;
      api.post("/gigs/extend", { id: g.id }).then(gigOk).then(function (x) { draw(); D.toast(app, "Open until " + D.dateTime(x.closes_at)); }).catch(gigFail);
    } }, extDays ? "Extend " + extDays + " days" : "Extend"));
    if (g.status === "open" || g.status === "draft") acts.appendChild(h("button", { class: "danger", type: "button", onclick: function () {
      if (!confirm(g.status === "draft" ? "Delete this draft gig?" : "Close this gig now? Applicants are told, and you can still choose a proposal" + (rules.proposals_actionable_days ? " for " + rules.proposals_actionable_days + " days." : " for a short time."))) return;
      api.post("/gigs/close", { id: g.id, cancel: g.status === "draft" }).then(gigOk).then(function () { gigs.id = g.status === "draft" ? null : g.id; draw(); D.toast(app, "Closed"); }).catch(gigFail);
    } }, g.status === "draft" ? "Delete draft" : "Close the gig"));
    body.appendChild(acts);
    if (r.playbook) body.appendChild(h("details", { class: "card" }, h("summary", { style: "cursor:pointer;font-weight:700", text: "The document (invited and hired freelancers see their part of it)" }),
      r.gig_part ? h("p", { class: "small muted", text: "The freelancer sees " + r.gig_part.steps + " of " + r.gig_part.of + " steps" + (r.gig_part.checkpoints ? ", with " + r.gig_part.checkpoints + " \"Attorney decides\" step" + (r.gig_part.checkpoints > 1 ? "s" : "") + " where the work waits for you" : "") + "." }) : null, playbookPlain(r.playbook)));
    if ((me.switches || {}).document_standard && editable) referencesEditor(body, g, r.references);
    else { var rb = referencesBlock(r.references); if (rb) body.appendChild(rb); }
  }

  function playbookPlain(b) {
    if (b && b.schema === 2) return docGigView(b);
    return h("div", null, b.outcome ? h("p", null, h("b", { text: "Outcome: " }), b.outcome) : null,
      h("ol", null, (b.steps || []).map(function (s) { return h("li", { text: s.text + (s.who ? " (" + s.who + ")" : "") + (s.tool ? " | " + s.tool : "") }); })),
      (b.checks || []).length ? h("p", null, h("b", { text: "Quality checks: " }), b.checks.join("; ")) : null,
      (b.review_points || []).length ? h("p", null, h("b", { text: "Attorney review: " }), b.review_points.join("; ")) : null,
      b.deliverables ? h("p", null, h("b", { text: "Deliverables: " }), b.deliverables) : null);
  }

  function gigMatches(body, r) {
    var g = r.gig;
    if (g.status === "draft") { body.appendChild(h("p", { class: "notice", text: "Post the gig first. DELA then finds freelancers who fit." })); return; }
    if (g.client_kind === "agency") body.appendChild(agencyBenchInvite(g));
    var box = h("div", { class: "card" }, h("p", { class: "muted", text: "Loading matches..." }));
    body.appendChild(box);
    api.get("/gigs/matches?id=" + g.id + "&refresh=1").then(function (x) {
      D.clear(box);
      box.appendChild(h("h2", { text: "Freelancers who fit" }));
      box.appendChild(h("p", { class: "small muted", text: "Only match-ready freelancers who confirmed their availability" + ((r.rules || {}).availability_days ? " in the last " + r.rules.availability_days + " days" : " recently") + ", work in this practice area and do not exclude this state. DELA shows fewer people rather than inactive ones. Inviting someone lets them see the full document and send a proposal that does not use their monthly allowance." }));
      if (!x.ok) { box.appendChild(h("p", { class: "notice", text: gigErr(x) })); return; }
      if (!x.matches.length) box.appendChild(h("div", null, h("p", { class: "muted", text: "No one fits yet. Check back soon, widen the practice area or tools, or search in Talent." }),
        h("div", { class: "row" }, h("button", { class: "ghost small", type: "button", onclick: function () { tab = "talent"; gigs.id = null; draw(); } }, "Search Talent"),
          h("button", { class: "ghost small", type: "button", onclick: function () { gigs.view = "details"; draw(); } }, "Review gig requirements"))));
      gigBenchCard(box, g);
      x.matches.forEach(function (m) {
        var msg = h("input", { style: "width:100%", "aria-label": "Message to " + m.name + " (optional)", placeholder: "A short note (optional). Keep everything on Lawfecta." });
        var btn = h("button", { class: "blue small", type: "button", disabled: m.invited || g.status !== "open" }, m.invited ? "Invited" : "Invite");
        btn.addEventListener("click", function () {
          btn.disabled = true;
          api.post("/gigs/invite", { gig_id: g.id, person_id: m.person_id, message: msg.value }).then(gigOk).then(function (y) { D.toast(app, y.held ? y.note : "Invited " + m.name); btn.textContent = "Invited"; }).catch(function (e) { btn.disabled = false; gigFail(e); });
        });
        box.appendChild(h("div", { class: "card", style: "margin:8px 0" }, h("div", { class: "row" }, h("b", { class: "grow", text: m.name }), h("span", { class: "badge " + (m.fit === "Good fit" ? "ready" : "C"), text: m.fit }), m.applied ? h("span", { class: "badge C", text: "Sent a proposal" }) : null),
          m.headline ? h("div", { class: "small", text: m.headline }) : null, h("div", { class: "small muted", text: (m.reasons || []).join(" | ") }), m.invited ? null : msg,
          h("div", { class: "row", style: "margin-top:6px" }, btn, (m.invited || m.applied) && (me.switches || {}).gig_chat ? h("button", { class: "ghost small", type: "button", onclick: function () { openThread(g.id, m.person_id); } }, "Message") : null, reviewsButton(m.person_id, "freelancer", m.name))));
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
          else act.appendChild(h("span", { class: "badge " + propTone(p.status), text: PROP_STATUS[p.status] }));
          if ((me.switches || {}).gig_chat) act.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { openThread(r.gig.id, p.person_id); } }, "Message"));
          return h("tr", null,
            h("td", { "data-label": "Freelancer" }, p.agency ? agencyOnProposal(p.agency) : null, p.agency ? h("div", { class: "small muted", text: "Sent by " + p.name }) : h("b", { text: p.name }), p.invited ? h("div", { class: "small muted", text: "Invited" }) : null, p.headline ? h("div", { class: "small", text: p.headline }) : null, (p.match_reasons || []).length ? h("div", { class: "small muted", text: p.match_reasons.join(" | ") }) : null),
            h("td", { "data-label": "Price" }, h("b", { text: D.money(p.price_cents) }), h("div", null, h("span", { class: "badge " + lab[0], text: lab[1] }))),
            h("td", { "data-label": "Includes", text: p.included }), h("td", { "data-label": "Leaves out", text: p.excluded || "Not specified. Confirm before signing." }),
            h("td", { "data-label": "Schedule", text: scheduleText(p) }),
            h("td", { "data-label": "Qualifications" }, p.qualifications, p.message ? h("div", { class: "small muted", text: "Note: " + p.message }) : null), h("td", null, act));
        })))));
      var live = x.proposals.filter(function (p) { return p.status === "sent" || p.status === "selected"; });
      if (live.length >= 2) box.appendChild(helperButton("compare_proposals", "✦ Compare these proposals", function () { return { gig_id: r.gig.id }; }, { render: function (out, y) {
        var names = {}; x.proposals.forEach(function (p) { names[p.id] = p.agency ? (p.agency.name || p.name) : p.name; });
        (y.proposals || []).forEach(function (c) {
          out.appendChild(h("div", { style: "margin:6px 0;padding-top:6px;border-top:1px solid var(--line)" }, h("b", { text: names[c.id] || "A proposal" }),
            h("p", { style: "margin:4px 0", text: c.covers }),
            h("p", { class: "small", style: "margin:2px 0", text: "Not said: " + (c.missing.length ? c.missing.join("; ") : "nothing DELA noticed") }),
            c.ask.length ? h("p", { class: "small", style: "margin:2px 0", text: "You could ask: " + c.ask.join(" ") }) : null));
        });
      } }));
    }).catch(function (e) { D.clear(box); box.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  // The sensitive-data checkbox, the files shared with the gig (each expires for the freelancer), and the file activity
  var SENSITIVE_LABEL = "This job involves sensitive data (SSN, medical, financial, or ID documents)";
  var SENSITIVE_HELP = "Sensitive documents must be shared using a link from your own storage (Google Drive, Dropbox, OneDrive, Box, ShareFile, Clio, NetDocuments). Do not upload them here.";
  function sensitiveBox(gigId, on, after) {
    var tick = h("input", { type: "checkbox", checked: on ? "checked" : null, "aria-describedby": "sens-help-" + gigId });
    var out = h("div", { class: "sens-box" },
      h("label", { style: "display:flex;gap:8px;align-items:flex-start;font-weight:600" }, tick, h("span", { text: SENSITIVE_LABEL })),
      h("p", { class: "small muted", id: "sens-help-" + gigId, style: "margin:4px 0 0 26px", text: SENSITIVE_HELP }));
    var note = h("div");
    out.appendChild(note);
    tick.addEventListener("change", function () {
      tick.disabled = true;
      api.post("/gigs/sensitive", { gig_id: gigId, on: tick.checked }).then(gigOk).then(function (x) {
        tick.disabled = false;
        D.clear(note);
        var n = (x.shared_files || 0) + (x.confidential_files || 0);
        if (x.sensitive && n) note.appendChild(deleteNowNote(gigId, n, after));
        else if (after) after(x);
        D.toast(app, x.sensitive ? "Marked as sensitive: no uploads on this job, secure links only." : "No longer marked as sensitive.");
      }).catch(function (e) { tick.disabled = false; tick.checked = !tick.checked; gigFail(e); });
    });
    return out;
  }
  function deleteNowNote(gigId, n, after) {
    var box = h("div", { class: "notice", role: "status" }, h("p", { style: "margin:0 0 6px", text: n === 1 ? "1 file is already shared on this job. It stays until it expires. You can delete it now." : n + " files are already shared on this job. They stay until they expire. You can delete them now." }));
    var row = h("div", { class: "row" });
    var go = h("button", { class: "danger small", type: "button" }, "Delete now");
    go.addEventListener("click", function () {
      D.clear(row);
      row.appendChild(h("span", { class: "small grow", text: "Delete " + n + (n === 1 ? " file" : " files") + " for good? Shared files stay in your Files page." }));
      row.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { D.clear(row); row.appendChild(go); row.appendChild(later); } }, "Cancel"));
      row.appendChild(h("button", { class: "danger small", type: "button", onclick: function () {
        api.post("/gigs/sensitive/delete-files", { gig_id: gigId }).then(gigOk).then(function (x) {
          D.toast(app, "Deleted. " + (x.unshared || 0) + " shared " + ((x.unshared || 0) === 1 ? "file" : "files") + " stopped and " + (x.deleted || 0) + " confidential " + ((x.deleted || 0) === 1 ? "file" : "files") + " deleted.");
          if (after) after(); else draw();
        }).catch(gigFail);
      } }, "Yes, delete them"));
    });
    var later = h("button", { class: "ghost small", type: "button", onclick: function () { box.remove(); if (after) after(); } }, "Keep them until they expire");
    row.appendChild(go); row.appendChild(later);
    box.appendChild(row);
    return box;
  }
  function expirySelect(choices, def, label) {
    return h("select", { "aria-label": label }, (choices || [7, 14, 30]).map(function (d) { return h("option", { value: String(d), selected: d === def ? "selected" : null, text: d + " days" }); }));
  }
  // The last answer on "Files for this gig" stays on the card (a passing message is easy to miss; ChatGPT re-test 2026-11-05)
  var gigFilesLast = null, gigFilesDays = null;
  function gigFilesSay(gid, text) { gigFilesLast = { gig: gid, text: text, at: Date.now() }; D.toast(app, text); }
  function gigFiles(body, r) {
    var g = r.gig, sc = r.sharing_choices || {};
    var box = h("div", { class: "card" }, h("h2", { text: "Files for this gig" }));
    if (gigFilesLast && gigFilesLast.gig === g.id && Date.now() - gigFilesLast.at < 10 * 60 * 1000) box.appendChild(h("p", { class: "notice small ok gig-files-status", role: "status", text: gigFilesLast.text }));
    box.appendChild(sensitiveBox(g.id, !!r.sensitive, function () { draw(); }));
    if (r.sensitive) box.appendChild(h("p", { class: "notice", text: "This job involves sensitive data, so files cannot be shared here. Once you hire and the first milestone is paid, add secure document links in Confidential materials on the engagement." }));
    else box.appendChild(h("p", { class: "small muted", text: "Read only, for this gig only. Each file is open to invited freelancers and the freelancer you hire until it expires (you pick 7, 14 or 30 days) or the job is complete, whichever comes first. Your copy stays in your Files page. Every download is logged. Expiry cannot recall a copy someone already downloaded." }));
    r.files.forEach(function (f) {
      var when = f.expired ? "Access ended " + D.date(f.expires_at) : "Access expires after " + D.date(f.expires_at) + " for invited freelancers and the one you hire";
      box.appendChild(h("div", { class: "row", style: "flex-wrap:wrap" }, h("span", { class: "grow" }, f.name, h("span", { class: "small " + (f.expired ? "bad" : "muted"), text: " | " + when })),
        h("button", { class: "ghost small", type: "button", onclick: function () {
          api.post("/gigs/files/extend", { gig_id: g.id, file_id: f.file_id }).then(gigOk).then(function (x) { gigFilesSay(g.id, "Extended to " + D.date(x.expires_at)); draw(); }).catch(gigFail);
        } }, "Extend " + (sc.extend_days || 14) + " days"),
        h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/gigs/files", { gig_id: g.id, file_id: f.file_id, share: false }).then(gigOk).then(function () { gigFilesSay(g.id, "No longer shared"); draw(); }).catch(gigFail); } }, "Stop sharing")));
    });
    if ((me.switches || {}).file_uploads && !r.sensitive) {
      var pickWrap = h("div");
      var days = expirySelect(sc.choices, gigFilesDays || sc.default || 14, "Freelancer can open it for");
      days.addEventListener("change", function () { gigFilesDays = Number(days.value); });
      box.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;margin-top:8px" }, h("label", { class: "small", style: "font-weight:400" }, "Freelancer can open it for ", days),
        h("button", { class: "ghost small", type: "button", onclick: function () {
          api.get("/files").then(function (x) {
            D.clear(pickWrap);
            var shared = r.files.map(function (f) { return f.file_id; });
            var ready = (x.files || []).filter(function (f) { return f.status === "ready" && shared.indexOf(f.id) < 0; });
            if (!ready.length) { pickWrap.appendChild(h("p", { class: "small muted", text: "No other ready files. Upload on the Files page first." })); return; }
            ready.forEach(function (f) {
              pickWrap.appendChild(h("div", { class: "row" }, h("span", { class: "grow", text: f.name }), h("button", { class: "blue small", type: "button", onclick: function () {
                api.post("/gigs/files", { gig_id: g.id, file_id: f.id, share: true, expiry_days: Number(days.value) }).then(gigOk).then(function (y) { gigFilesSay(g.id, "Shared until " + D.date(y.expires_at)); draw(); }).catch(gigFail);
              } }, "Share")));
            });
          }).catch(err);
        } }, "Share a file from Files")));
      box.appendChild(pickWrap);
    }
    body.appendChild(box);
    body.appendChild(fileActivityCard(g.id));
  }
  // Every view and download of anything shared on this job, for the attorney
  var ACT_WORDS = { open: "opened", download: "downloaded", link_open: "opened the link" };
  function fileActivityCard(gigId) {
    var box = h("div", { class: "card" }, h("h2", { text: "File activity" }), h("p", { class: "small muted", text: "Every view and download of files and links shared on this job, newest first." }));
    var list = h("div", null, h("p", { class: "small muted", text: "Loading..." }));
    box.appendChild(list);
    api.get("/gigs/activity?gig=" + gigId).then(function (x) {
      D.clear(list);
      if (!x.ok) { list.appendChild(h("p", { class: "small muted", text: gigErr(x) })); return; }
      if (!x.items.length) { list.appendChild(h("p", { class: "small muted", text: "Nobody has opened anything yet." })); return; }
      list.appendChild(h("table", { class: "stack", style: "width:100%" }, h("thead", null, h("tr", null, h("th", { text: "When" }), h("th", { text: "Who" }), h("th", { text: "What" }), h("th", { text: "Where" }))),
        h("tbody", null, x.items.map(function (it) {
          return h("tr", null, h("td", { "data-label": "When", text: D.dateTime(it.at) }), h("td", { "data-label": "Who", text: it.who + " " + (ACT_WORDS[it.action] || it.action) }),
            h("td", { "data-label": "What", text: it.what || "" }), h("td", { "data-label": "Where", text: it.where }));
        }))));
    }).catch(function () { D.clear(list); list.appendChild(h("p", { class: "small muted", text: "The activity could not be loaded." })); });
    return box;
  }

  // ---------- Agencies (Step 7d) ----------
  function reviewsLine(rv) {
    if (!rv || !rv.count) return "No reviews yet";
    return (rv.average ? "★ " + rv.average + " " : "") + "(" + rv.count + (rv.count === 1 ? " review)" : " reviews)");
  }
  // A freelancer's profile as the attorney or the agency sees it: experience, verification, skills and their own reviews
  function profileModal(personId) {
    var m = modal("Profile");
    m.body.appendChild(h("p", { class: "muted", text: "Loading..." }));
    m.foot.appendChild(h("button", { class: "ghost", type: "button", onclick: m.close }, "Close"));
    api.get("/freelancers/card?person=" + personId).then(function (x) {
      D.clear(m.body);
      if (!x.ok) { m.body.appendChild(h("p", { class: "notice", text: gigErr(x) })); return; }
      m.body.appendChild(h("div", { class: "row" }, x.photo_url ? h("img", { src: x.photo_url, alt: "", style: "width:64px;height:64px;border-radius:50%;object-fit:cover" }) : null,
        h("div", null, h("h3", { style: "margin:0", text: x.name }), x.headline ? h("div", { class: "small", text: x.headline }) : null,
          h("div", { class: "small muted", text: (x.readiness === "match_ready" || x.readiness === "availability_stale" || x.readiness === "unavailable" ? "Verified" : "Verification not finished") + " | " + reviewsLine(x.reviews) }))));
      if ((x.agencies || []).length) m.body.appendChild(h("p", { class: "small", text: "Works with: " + x.agencies.join(", ") }));
      if (x.summary) m.body.appendChild(h("p", { text: x.summary }));
      if (x.experience) m.body.appendChild(h("div", null, h("b", { text: "Experience" }), h("p", { style: "white-space:pre-wrap", text: x.experience })));
      if ((x.practice_areas || []).length) m.body.appendChild(h("p", { class: "small", text: "Practice areas: " + x.practice_areas.join(", ") }));
      if ((x.software || []).length) m.body.appendChild(h("p", { class: "small", text: "Tools: " + x.software.join(", ") }));
      var rb = reviewsButton(x.person_id, "freelancer", x.name);
      if (rb) m.foot.insertBefore(rb, m.foot.firstChild);
    }).catch(function (e) { D.clear(m.body); m.body.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }
  function personLine(t, extra) {
    return h("div", { class: "row", style: "gap:8px;margin:4px 0" }, t.photo_url ? h("img", { src: t.photo_url, alt: "", style: "width:32px;height:32px;border-radius:50%;object-fit:cover" }) : h("span", { class: "avatar-dot", "aria-hidden": "true", text: (t.name || "?").slice(0, 1) }),
      h("span", { class: "grow" }, h("b", { text: t.name }), t.role ? h("span", { class: "small muted", text: " | " + t.role }) : null, t.reviews ? h("span", { class: "small muted", text: " | " + reviewsLine(t.reviews) }) : null),
      h("button", { class: "ghost small", type: "button", onclick: function () { profileModal(t.person_id); } }, "View profile"), extra || null);
  }
  // On an agency proposal: the agency, its reviews, and the people who will do the work
  function agencyOnProposal(a) {
    var box = h("div", { class: "agency-box" }, h("div", null, h("span", { class: "badge agency", text: "Agency" }), " ", h("b", { text: a.name }), h("span", { class: "small muted", text: " | " + reviewsLine(a.reviews) })),
      h("div", { class: "small", style: "margin-top:4px", text: "Who will do this work:" }));
    var ap = a.profile || {};
    if (ap.headline || ap.summary) {
      box.insertBefore(h("div", { class: "small", style: "margin-top:4px" }, ap.headline ? h("b", { text: ap.headline }) : null, ap.summary ? h("p", { class: "small", style: "margin:4px 0", text: ap.summary }) : null,
        (ap.services || []).length ? h("div", { class: "small muted", text: "Services: " + ap.services.map(function (x) { return x.title; }).join(", ") }) : null,
        ap.team_size ? h("div", { class: "small muted", text: "Team of " + ap.team_size }) : null), box.lastChild);
    }
    (a.team || []).forEach(function (t) { box.appendChild(personLine(t)); });
    if (a.subcontracting_note) box.appendChild(h("p", { class: "small muted", style: "margin:6px 0 0", text: a.subcontracting_note }));
    return box;
  }

  // "Who's working on this": the agency's team members (and subcontractors in part 3). The attorney sees it; the agency
  // changes it, and the attorney is told (nothing to approve).
  function peopleCard(r) {
    var a = r.agreement;
    var card = h("div", { class: "card", id: "people-card" }, h("h2", { text: "Who's working on this" }));
    var body = h("div", null, h("p", { class: "small muted", text: "Loading..." }));
    card.appendChild(body);
    function load() {
      api.get("/engagements/people?agreement=" + a.id).then(function (x) {
        D.clear(body);
        if (!x.ok || !x.agency) { card.remove(); return; }
        body.appendChild(h("p", { class: "small muted", text: (r.role === "attorney" ? "You hired " : "This engagement is with ") + x.agency.name + ". " +
          (r.role === "attorney" ? "These are the people working on it. If the agency changes them, you get a notice; nothing is needed from you." : "The attorney sees this list and gets a notice when it changes.") }));
        x.people.forEach(function (t) {
          var rm = x.can_change ? h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/engagements/team", { agreement_id: a.id, person_id: t.person_id, on: false }).then(gigOk).then(function () { load(); D.toast(app, t.name + " is off this job. The attorney was told."); }).catch(gigFail);
          } }, "Take off this job") : null;
          body.appendChild(personLine({ person_id: t.person_id, name: t.name, role: t.kind === "subcontractor" ? "Subcontractor" + (t.role ? ", " + t.role : "") : t.role, photo_url: t.photo_url }, rm));
        });
        if (x.can_change) {
          var on = x.people.map(function (p) { return p.person_id; });
          var opts = (x.options || []).filter(function (o) { return on.indexOf(o.person_id) < 0; });
          if (opts.length) {
            var sel = h("select", { "aria-label": "Team member to add" }, opts.map(function (o) { return h("option", { value: o.person_id, text: o.name }); }));
            var role = h("input", { "aria-label": "Their role on the job", placeholder: "Role on the job, for example Lead paralegal", maxlength: "80" });
            body.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;margin-top:8px" }, sel, role, h("button", { class: "ghost small", type: "button", onclick: function () {
              api.post("/engagements/team", { agreement_id: a.id, person_id: sel.value, on: true, role: role.value }).then(gigOk).then(function () { load(); D.toast(app, "Added. The attorney was told."); }).catch(gigFail);
            } }, "Add to this job")));
          }
        }
      }).catch(function () { card.remove(); });
    }
    load();
    return card;
  }

  // Bench assignments on an agency engagement (owners and managers): each milestone, who does it, and the split for the job.
  // The attorney never sees this card or any split.
  function assignmentsCard(r) {
    var card = h("div", { class: "card", id: "assign-card" });
    api.get("/engagements/assignments?agreement=" + r.agreement.id).then(function (v) {
      if (!v.ok || !v.on) { card.remove(); return; }
      D.clear(card);
      card.appendChild(h("h2", { text: "Bench assignments" }));
      card.appendChild(cardStatus("assign"));
      card.appendChild(h("p", { class: "small muted", text: "Give a milestone to someone on your bench. Their bench split fills in; a different split for this job needs their Accept before work starts. " +
        "When the attorney accepts the milestone, the agency gets its share minus the whole freelancer fee, and they get their full share. The attorney sees them as a subcontractor, never the split." }));
      if (v.no_subcontractors) card.appendChild(h("p", { class: "notice", text: GIG_ERR.no_subcontractors }));
      else if ((me.switches || {}).agency_subcontracting && me.agency_client && ["signing", "signed", "active"].indexOf(r.agreement.status) >= 0) {
        var jobTitle = (((r.current || {}).body || {}).gig_title) || "this job";
        card.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;margin:6px 0" }, h("button", { class: "ghost", type: "button", onclick: function () {
          gigs.linkTo = { id: r.agreement.id, title: jobTitle }; gigs.id = null; gigs.newFrom = null; tab = "projects"; draw();
        } }, "Post a gig for part of this job"), h("span", { class: "small muted", text: "For someone outside your bench. Whoever you hire is listed on the attorney's \"Who's working on this\", as your subcontractor." })));
      }
      (v.milestones || []).forEach(function (m) {
        var x = m.assignment, row = h("div", { style: "border-top:1px solid var(--line);padding:8px 0" });
        row.appendChild(h("b", { text: "Milestone " + m.seq + ": " + m.title + " (" + D.money(m.amount_cents) + ")" }));
        if (x) {
          row.appendChild(h("p", { class: "small", style: "margin:4px 0", text: "Assigned to " + x.name + " | split " + splitText(x.agency_bps, false) + (x.status === "proposed" ? " | waiting for " + x.name + " to accept" : "") }));
          if (x.waiting_payout) row.appendChild(h("p", { class: "small notice", text: "Waiting on " + x.name + "'s payout setup" }));
          if (["accepted", "refunded", "submitted"].indexOf(m.status) < 0) row.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/agency/assignment/remove", { id: x.id }).then(gigOk).then(function () { draw(); cardSay("assign", "Milestone " + m.seq + " is unassigned"); }).catch(cardFail("assign"));
          } }, "Take back"));
        } else if (["pending", "awaiting_funding", "funded"].indexOf(m.status) >= 0 && !v.no_subcontractors && (v.bench || []).length) {
          var who = h("select", { "aria-label": "Bench member for milestone " + m.seq }, v.bench.map(function (b) { return h("option", { value: b.id, text: b.name + " (bench split " + splitText(b.agency_bps, false) + ")" }); }));
          var share = h("input", { type: "number", min: String(v.limits.min_bps / 100), max: String(v.limits.max_bps / 100), step: "0.5", "aria-label": "Agency share for this job (%), empty for their bench split", placeholder: "Bench split", style: "width:110px" });
          row.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;margin-top:4px" }, who, h("span", { class: "small", text: "Agency share for this job (%):" }), share,
            h("button", { class: "blue small", type: "button", onclick: function () {
              api.post("/engagements/assign", { milestone_id: m.id, bench_id: who.value, agency_percent: share.value === "" ? null : Number(share.value) }).then(gigOk).then(function (y) {
                draw(); cardSay("assign", y.status === "proposed" ? "Assigned. Waiting for them to accept the split for this job." : "Assigned. The attorney was told who is working on it.");
              }).catch(cardFail("assign"));
            } }, "Assign")));
        } else if (!x) row.appendChild(h("p", { class: "small muted", style: "margin:4px 0", text: (v.bench || []).length ? "Not assigned." : "Not assigned. Nobody on your bench can take new work yet." }));
        card.appendChild(row);
      });
    }).catch(function () { card.remove(); });
    return card;
  }

  // An agency invites its own bench first (Step 7d part 2c). Bench members it hires pay no platform fee; the agency pays it.
  function agencyBenchInvite(g) {
    var card = h("div", { class: "card", id: "agency-bench-invite" }, h("h2", { text: "Your bench" }), h("p", { class: "muted small", text: "Loading..." }));
    api.get("/gigs/agency-bench?gig=" + g.id).then(function (x) {
      D.clear(card);
      card.appendChild(h("h2", { text: "Your bench" }));
      card.appendChild(cardStatus("agbench"));
      card.appendChild(h("p", { class: "small muted", text: "Invite your bench first. A bench member you hire pays no platform fee; the agency pays it with its own." }));
      if (!x.ok || !(x.bench || []).length) { card.appendChild(h("p", { class: "muted", text: "Nobody on your bench yet. Invite people on the Agency page." })); return; }
      x.bench.forEach(function (b) {
        var act = b.invited ? h("span", { class: "badge ready", text: "Invited" })
          : b.eligible ? h("button", { class: "blue small", type: "button", onclick: function () {
              api.post("/gigs/invite", { gig_id: g.id, person_id: b.person_id }).then(gigOk).then(function (y) { cardSay("agbench", y.duplicate ? b.name + " is already invited" : "Invited " + b.name); draw(); }).catch(cardFail("agbench"));
            } }, "Invite to this gig")
          : h("span", { class: "small muted", text: b.why === "not_match_ready" ? "Not available right now" : "Cannot be invited" });
        card.appendChild(h("div", { class: "row", style: "border-top:1px solid var(--line);padding:6px 0" }, h("span", { class: "grow" }, h("b", { text: b.name })), act));
      });
    }).catch(function () { card.remove(); });
    return card;
  }

  // The agency's client details: who signs for it and where notices go, needed before it pays (Step 7d part 2c)
  function agencyClientCard() {
    var c = me.agency_client;
    if (!c) return null;
    var e = c.eligibility || {}, d = c.details || {};
    var NEEDS = { agency_inactive: "the agency is on Freelancer Business", owner_not_verified: "the owner's own verification is done", business_check_needed: "the Lawfecta Team has checked the business details above" };
    var card = h("div", { class: "card", id: "agency-client" }, h("h2", { text: "Posting gigs" }), cardStatus("agclient"),
      h("p", { class: e.can_post ? "small ok" : "small muted", text: e.can_post ? "Ready to post gigs from your Library (Projects page)." : "Your agency can post gigs once " + (e.needs || []).map(function (n) { return NEEDS[n] || n; }).join(", and ") + "." }));
    if (c.role !== "owner") { card.appendChild(h("p", { class: "small muted", text: "The owner adds the client details below." })); return card; }
    var sig = h("input", { "aria-label": "Who signs for the agency", value: d.signatory_name || "", maxlength: "120" });
    var addr = h("input", { "aria-label": "Billing address", value: d.billing_address || "", maxlength: "300", style: "min-width:280px" });
    var mail = h("input", { type: "email", "aria-label": "Email for notices", value: d.service_email || "", maxlength: "200" });
    card.appendChild(h("p", { class: "small muted", text: "Needed before your agency pays for a gig: the agreement names who signs for the agency and where notices go." }));
    card.appendChild(h("div", { class: "row", style: "flex-wrap:wrap" }, field("Who signs for the agency", sig), field("Billing address", addr), field("Email for notices", mail)));
    card.appendChild(h("div", { class: "row" }, h("button", { class: "blue small", type: "button", onclick: function () {
      api.post("/agency/client", { signatory_name: sig.value, billing_address: addr.value, service_email: mail.value }).then(gigOk).then(function () { cardSay("agclient", "Client details saved"); refresh(); }).catch(cardFail("agclient"));
    } }, "Save client details")));
    return card;
  }

  // The Agency page: invitations, agencies you belong to, and your own agency (business details, team, seats, jobs)
  var ROLE_NAMES = { owner: "Owner", manager: "Manager", member: "Member" };
  // MVP 2026-11-09: the agency profile attorneys read on the agency's proposals, with DELA's drafting help
  var AP_WORDS = { headline: "a headline", summary: "a short summary", practice_areas: "practice areas", services: "at least one service", states_served: "the states you serve" };
  function agencyProfileCard(justSaved) {
    var card = h("div", { class: "card", id: "agency-profile" }, h("h2", { text: "Agency profile" }), h("p", { class: "small muted", text: "Loading..." }));
    api.get("/agency/profile").then(function (r) {
      D.clear(card);
      card.appendChild(h("h2", { text: "Agency profile" }));
      if (!r.ok) { card.appendChild(h("p", { class: "small muted", text: r.reason === "agency_owner_only" ? "Only the agency's owner or a manager can edit the agency profile." : "The agency profile is not open yet." })); return; }
      var b = r.body || {};
      card.appendChild(h("p", { class: "small muted", text: "Attorneys read this on your agency's proposals. Team of " + r.team_size + (r.bench_size ? ", bench of " + r.bench_size : "") + " (counted for you)." }));
      if (justSaved) card.appendChild(h("p", { class: "small ok", text: "Saved." }));
      var missLine = h("p", { "aria-live": "polite" });
      function showMissing(keys) {
        var miss = keys.map(function (k) { return AP_WORDS[k] || k; });
        missLine.className = miss.length ? "notice" : "small ok";
        missLine.textContent = miss.length ? "Still missing: " + miss.join(", ") + "." : "Complete.";
      }
      showMissing(r.missing || []);
      card.appendChild(missLine);
      var head = h("input", { "aria-label": "Headline", maxlength: "160", style: "width:100%", value: b.headline || "", placeholder: "For example: Family law support team for small firms in Texas" });
      var sum = h("textarea", { "aria-label": "Summary", rows: 4, style: "width:100%", maxlength: "2000", value: b.summary || "" });
      sum.value = b.summary || "";
      var areas = h("input", { "aria-label": "Practice areas", style: "width:100%", value: (b.practice_areas || []).join(", "), placeholder: "Separated by commas" });
      var tools = h("input", { "aria-label": "Tools you use", style: "width:100%", value: (b.tools || []).join(", "), placeholder: "Separated by commas, for example: Clio, Microsoft 365" });
      var states = h("input", { "aria-label": "States you serve", style: "width:100%", value: (b.states_served || []).join(", "), placeholder: "Two letters each, for example: TX, OK" });
      var svc = h("textarea", { "aria-label": "Services", rows: 4, style: "width:100%", placeholder: "One service per line, for example: Discovery responses | Drafted and organized for attorney review" });
      // Prices are not typed in this box, so they are remembered by the service's title and sent back on save
      // (launch review, item 15: saving dropped the prices DELA had drafted)
      var priceBy = {};
      var keepPrices = function (list) { (list || []).forEach(function (x) { if (x && x.title && (x.price_min_cents || x.price_max_cents)) priceBy[String(x.title).trim().toLowerCase()] = { min: x.price_min_cents, max: x.price_max_cents }; }); };
      keepPrices(b.services);
      svc.value = (b.services || []).map(function (x) { return x.title + (x.description ? " | " + x.description : ""); }).join("\n");
      var notes = h("textarea", { "aria-label": "Tell DELA about your agency", rows: 3, style: "width:100%", placeholder: "A few lines: what your team does, practice areas, states, tools, how you work. No client names or details." });
      // The same five checks as dela_agency_profile_missing, from the boxes as they are now
      function liveMissing() {
        var k = [];
        if (head.value.trim().length < 10) k.push("headline");
        if (sum.value.trim().length < 60) k.push("summary");
        if (!commas(areas.value).length) k.push("practice_areas");
        if (!svc.value.split("\n").some(function (l) { return (l.split("|")[0] || "").trim().length >= 3; })) k.push("services");
        if (!commas(states.value).some(function (x) { return /^[A-Za-z]{2}$/.test(x); })) k.push("states_served");
        showMissing(k);
      }
      [head, sum, areas, svc, states].forEach(function (el) { el.addEventListener("input", liveMissing); });
      var draftBtn = h("button", { class: "ai-btn small", type: "button" }, "✦ Let DELA draft it");
      var qs = h("div", { "aria-live": "polite" });
      draftBtn.addEventListener("click", function () {
        if (notes.value.trim().length < 20) { D.toast(app, "Tell DELA a little more about your agency first.", true); notes.focus(); return; }
        draftBtn.disabled = true;
        api.post("/agency/profile/draft", { notes: notes.value }).then(function (x) {
          draftBtn.disabled = false;
          if (!x.ok) { D.toast(app, x.message || (x.reason === "tell_us_more" ? "Tell DELA a little more about your agency first." : failText(x)), true); return; }
          var d = x.draft || {};
          if (d.headline) head.value = d.headline;
          if (d.summary) sum.value = d.summary;
          if ((d.practice_areas || []).length) areas.value = d.practice_areas.join(", ");
          if ((d.tools || []).length) tools.value = d.tools.join(", ");
          if ((d.states_served || []).length) states.value = d.states_served.join(", ");
          keepPrices(d.services);
          if ((d.services || []).length) svc.value = d.services.map(function (v) { return v.title + (v.description ? " | " + v.description : ""); }).join("\n");
          D.clear(qs);
          var EMPTY_WORDS = { headline: "Headline", summary: "Summary", practice_areas: "Practice areas", services: "Services", tools: "Tools you use", states_served: "States you serve" };
          var empty = (x.empty || []).map(function (k) { return EMPTY_WORDS[k] || k; });
          qs.appendChild(h("p", { class: "small", text: "DELA filled in the boxes. Check every word, then click Save the agency profile." }));
          if (empty.length) qs.appendChild(h("p", { class: "notice", text: "Still empty: " + empty.join(", ") + ". Add " + (empty.length === 1 ? "it" : "them") + ", then save." }));
          if (empty.length) (x.questions || []).forEach(function (q) { qs.appendChild(h("p", { class: "small muted", text: "DELA asks: " + q })); });
          liveMissing();
        }).catch(function () { draftBtn.disabled = false; D.toast(app, "DELA could not draft it right now. Try again in a minute.", true); });
      });
      var save = h("button", { class: "blue small", type: "button" }, "Save the agency profile");
      save.addEventListener("click", function () {
        var services = svc.value.split("\n").map(function (line) {
          var parts = line.split("|"), title = (parts[0] || "").trim(), pr = priceBy[title.toLowerCase()];
          var one = { title: title, description: parts.slice(1).join("|").trim() };
          if (pr) { if (pr.min) one.price_min_cents = pr.min; if (pr.max) one.price_max_cents = pr.max; }
          return one;
        }).filter(function (x) { return x.title.length >= 3; });
        save.disabled = true;
        api.post("/agency/profile", { headline: head.value, summary: sum.value, practice_areas: commas(areas.value), tools: commas(tools.value), states_served: commas(states.value), services: services }).then(function (x) {
          save.disabled = false;
          if (!x.ok) { D.toast(app, x.message || failText(x), true); return; }
          D.toast(app, "Saved");
          card.replaceWith(agencyProfileCard(true));
        }).catch(function () { save.disabled = false; D.toast(app, "Not saved. Try again.", true); });
      });
      card.appendChild(h("div", { class: "card soft" }, field("Tell DELA about your agency", notes, "DELA drafts the profile from this. It uses DELA actions, like other drafts."), h("div", { class: "row" }, draftBtn), qs));
      [field("Headline", head), field("Summary", sum), field("Practice areas", areas), field("Services", svc, "One per line. Add a short description after a | if you like."), field("Tools you use", tools), field("States you serve", states)].forEach(function (n) { card.appendChild(n); });
      card.appendChild(h("div", { class: "row", style: "margin-top:8px" }, save));
    }).catch(function () { D.clear(card); card.appendChild(h("h2", { text: "Agency profile" })); card.appendChild(h("p", { class: "small muted", text: "The agency profile could not load." })); });
    return card;
  }

  function agencyView() {
    var el = h("div", null, h("h1", { text: "Agency" }), h("p", { class: "muted", text: "Loading..." }));
    api.get("/agency").then(function (v) {
      D.clear(el);
      el.appendChild(h("h1", { text: "Agency" }));
      if (!v.ok || !v.on) { el.appendChild(h("p", { class: "notice", text: "Agencies are not open for your account yet." })); return; }
      (v.invitations || []).forEach(function (i) {
        el.appendChild(h("div", { class: "card" }, h("h2", { text: "Invitation from " + i.agency }),
          h("p", { text: i.from + " invited you to join " + i.agency + " as a " + ROLE_NAMES[i.role].toLowerCase() + ". You keep your own account and your own plan. The agency can name you on its proposals." }),
          h("p", { class: "small muted", text: "Open until " + D.date(i.expires_at) + "." }),
          h("div", { class: "row" },
            h("button", { class: "blue small", type: "button", onclick: function () { api.post("/agency/invite/answer", { id: i.id, accept: true }).then(gigOk).then(function () { draw(); D.toast(app, "You joined " + i.agency); }).catch(gigFail); } }, "Accept"),
            h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/agency/invite/answer", { id: i.id, accept: false }).then(gigOk).then(function () { draw(); D.toast(app, "Declined"); }).catch(gigFail); } }, "Decline"))));
      });
      if ((v.memberships || []).length) {
        var mc = h("div", { class: "card" }, h("h2", { text: "Agencies you work with" }));
        v.memberships.forEach(function (m) {
          var leave = h("button", { class: "ghost small", type: "button" }, "Leave");
          leave.addEventListener("click", function () {
            D.clear(row); row.appendChild(h("span", { class: "small grow", text: "Leave " + m.agency + "? Your access to its jobs ends at once." }));
            row.appendChild(h("button", { class: "ghost small", type: "button", onclick: draw }, "Cancel"));
            row.appendChild(h("button", { class: "danger small", type: "button", onclick: function () { api.post("/agency/leave", { org_id: m.org_id }).then(gigOk).then(function () { draw(); D.toast(app, "You left " + m.agency); }).catch(gigFail); } }, "Yes, leave"));
          });
          var row = h("div", { class: "row" }, h("span", { class: "grow" }, h("b", { text: m.agency }), h("span", { class: "small muted", text: " | " + ROLE_NAMES[m.role] + (m.active ? "" : " | paused") })), leave);
          mc.appendChild(row);
        });
        el.appendChild(mc);
      }
      var ag = v.agency;
      if (!ag) {
        el.appendChild(h("div", { class: "card" }, h("h2", { text: "Run your own agency" }),
          h("p", { text: "On Freelancer Business, your account becomes an agency. You invite team members, send proposals as the agency and name who will do the work, and grow a bench of freelancers you hire." }),
          h("p", { class: "small muted", text: "Your plan now: " + (v.tier ? v.tier.charAt(0).toUpperCase() + v.tier.slice(1) : "Free") + ". Upgrade your Lawfecta membership to Freelancer Business to start." })));
        return;
      }
      var manage = ag.role === "owner" || ag.role === "manager";
      el.appendChild(h("p", { class: "muted", text: ag.name + " | you are the " + ROLE_NAMES[ag.role].toLowerCase() }));
      if (!ag.active) el.appendChild(h("p", { class: "notice", text: GIG_ERR.agency_inactive }));
      if (manage) el.appendChild(agencyProfileCard());
      // Business details, checked once by the Lawfecta Team before the agency's first gig goes live
      if (ag.role === "owner") {
        var bn = h("input", { "aria-label": "Business name", value: ag.business_name || "", maxlength: "160" });
        var bs = h("input", { "aria-label": "State of registration", value: ag.business_state || "", maxlength: "2", placeholder: "TX", style: "max-width:80px;text-transform:uppercase" });
        el.appendChild(h("div", { class: "card" }, h("h2", { text: "Business details" }),
          h("p", { class: "small muted", text: "The Lawfecta Team checks your business name and state once, before your agency's first gig goes live." }),
          h("div", { class: "row", style: "flex-wrap:wrap" }, field("Business name", bn), field("State of registration", bs)),
          h("p", { class: "small " + (ag.business_checked ? "ok" : "muted"), text: ag.business_checked ? "Checked by the Lawfecta Team." : ag.business_state ? "Waiting for the Lawfecta Team's check." + (ag.business_check_note ? " Note: " + ag.business_check_note : "") : "Not entered yet." }),
          h("div", { class: "row" }, h("button", { class: "blue small", type: "button", onclick: function () {
            api.post("/agency/business", { name: bn.value, state: bs.value }).then(gigOk).then(function () { draw(); D.toast(app, "Saved. The Lawfecta Team will check it."); }).catch(gigFail);
          } }, "Save business details"))));
      }
      var cc = agencyClientCard(); if (cc) el.appendChild(cc);
      // The team and its seats
      var seats = ag.seats || {};
      var tc = h("div", { class: "card" }, h("h2", { text: "Team" }),
        h("p", { class: "small muted", text: seats.used + " of " + seats.limit + " seats used, the owner included" + (seats.pending ? ", plus " + seats.pending + (seats.pending === 1 ? " invitation" : " invitations") + " waiting" : "") + ". Team members use their own Lawfecta accounts and finish their own verification before you can name them on a proposal." }));
      (ag.team || []).forEach(function (t) {
        var acts = h("div", { class: "row" });
        if (ag.role === "owner" && t.role !== "owner" && ag.active) {
          var rs = h("select", { "aria-label": "Role for " + t.name }, ["manager", "member"].map(function (r0) { return h("option", { value: r0, selected: r0 === t.role ? "selected" : null, text: ROLE_NAMES[r0] }); }));
          rs.addEventListener("change", function () { api.post("/agency/member", { person_id: t.person_id, action: "role", role: rs.value }).then(gigOk).then(function () { draw(); D.toast(app, "Role changed"); }).catch(gigFail); });
          acts.appendChild(rs);
        }
        if (manage && ag.active && t.role !== "owner" && (ag.role === "owner" || t.role === "member")) {
          var rmB = h("button", { class: "ghost small", type: "button" }, "Remove");
          rmB.addEventListener("click", function () {
            D.clear(acts); acts.appendChild(h("span", { class: "small", text: "Remove " + t.name + "? Their access to the agency's jobs ends at once." }));
            acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: draw }, "Cancel"));
            acts.appendChild(h("button", { class: "danger small", type: "button", onclick: function () { api.post("/agency/member", { person_id: t.person_id, action: "remove" }).then(gigOk).then(function (x) { draw(); D.toast(app, t.name + " removed" + (x.jobs_ended ? " from " + x.jobs_ended + (x.jobs_ended === 1 ? " job" : " jobs") : "")); }).catch(gigFail); } }, "Yes, remove"));
          });
          acts.appendChild(rmB);
        }
        tc.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;border-top:1px solid var(--line);padding:6px 0" },
          h("span", { class: "grow" }, h("b", { text: t.name }), h("span", { class: "small muted", text: " | " + ROLE_NAMES[t.role] + (t.email ? " | " + t.email : "") + " | " + (t.verified ? "verified" : "verification not finished") + (t.jobs ? " | on " + t.jobs + (t.jobs === 1 ? " job" : " jobs") : "") })), acts));
      });
      (ag.pending || []).forEach(function (i) {
        tc.appendChild(h("div", { class: "row", style: "border-top:1px solid var(--line);padding:6px 0" }, h("span", { class: "grow" }, h("b", { text: i.name }), h("span", { class: "small muted", text: " | invited as " + ROLE_NAMES[i.role].toLowerCase() + " | open until " + D.date(i.expires_at) })),
          h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/agency/invite/cancel", { id: i.id }).then(gigOk).then(function () { draw(); D.toast(app, "Invitation canceled"); }).catch(gigFail); } }, "Cancel invitation")));
      });
      if (manage && ag.active) {
        var em = h("input", { type: "email", "aria-label": "Their email on Lawfecta", placeholder: "Their email on Lawfecta" });
        var rl = h("select", { "aria-label": "Role" }, (ag.role === "owner" ? ["member", "manager"] : ["member"]).map(function (r0) { return h("option", { value: r0, text: ROLE_NAMES[r0] }); }));
        tc.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;margin-top:8px" }, em, rl, h("button", { class: "blue small", type: "button", onclick: function () {
          api.post("/agency/invite", { email: em.value.trim(), role: rl.value }).then(gigOk).then(function (x) { draw(); D.toast(app, x.duplicate ? "Already invited" : "Invitation sent"); }).catch(gigFail);
        } }, "Invite to the team")));
        tc.appendChild(h("p", { class: "small muted", text: "Managers can send proposals for the agency and change who works on a job. Members do the work they are named for." }));
      }
      el.appendChild(tc);
      // The agency's allowance and jobs
      el.appendChild(h("div", { class: "card" }, h("h2", { text: "Proposals" }), h("p", { class: "small", text: "Shared by the whole agency. " + allowanceText(ag.allowance) })));
      var jc = h("div", { class: "card" }, h("h2", { text: manage ? "The agency's jobs" : "Your agency jobs" }));
      if (!(ag.jobs || []).length) jc.appendChild(h("p", { class: "muted", text: "No jobs yet." }));
      (ag.jobs || []).forEach(function (j) {
        jc.appendChild(h("div", { class: "row", style: "border-top:1px solid var(--line);padding:6px 0" }, h("span", { class: "grow" }, h("b", { text: j.title }), h("span", { class: "small muted", text: " | " + j.status + ((j.people || []).length ? " | " + j.people.join(", ") : "") })),
          h("button", { class: "ghost small", type: "button", onclick: function () { gigs.id = j.gig_id; gigs.view = "agreement"; tab = "work"; draw(); } }, "Open")));
      });
      el.appendChild(jc);
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    // The bench loads on its own, below (the agency part above redraws itself)
    var benchBox = h("div");
    agencyBench(benchBox);
    return h("div", null, el, benchBox);
  }

  // A card's last answer stays on the card for 10 minutes (a passing message is easy to miss; ChatGPT bench test 2026-11-05)
  var cardLast = {}, cardEls = {};
  function cardStatus(key) {
    var l = cardLast[key], el = h("p", { class: "notice small card-status", role: "status" });
    if (l && Date.now() - l.at < 10 * 60 * 1000) { el.textContent = l.text; el.className = "notice small card-status" + (l.bad ? " bad" : " ok"); } else el.hidden = true;
    cardEls[key] = el;
    return el;
  }
  function cardSay(key, text, bad) {
    cardLast[key] = { text: text, bad: !!bad, at: Date.now() };
    var el = cardEls[key];
    if (el) { el.textContent = text; el.className = "notice small card-status" + (bad ? " bad" : " ok"); el.hidden = false; }
    D.toast(app, text, bad);
  }
  function cardFail(key) { return function (e) { cardSay(key, e && e.reason ? gigErr(e) : D.errorText(e && e.message ? e.message : String(e)), true); }; }

  // ---------- The agency bench (Step 7d part 2a): a bench agreement with a signed fee split ----------
  function pct(bps) { var n = bps / 100; return (n % 1 === 0 ? String(n) : n.toFixed(1)) + "%"; }
  function splitText(bps, forFreelancer) {
    return forFreelancer ? pct(bps) + " to the agency / " + pct(10000 - bps) + " to you" : pct(bps) + " to the agency / " + pct(10000 - bps) + " to the freelancer";
  }
  // The typed name and tick that sign a bench agreement step
  function signRow(label) {
    var name = h("input", { "aria-label": "Your full name, to sign", placeholder: "Your full name", maxlength: "120" });
    var tick = h("input", { type: "checkbox", "aria-label": label });
    return { name: name, tick: tick, el: h("div", { class: "row", style: "flex-wrap:wrap;gap:8px;margin-top:6px" }, name,
      h("label", { class: "small", style: "font-weight:400;display:flex;gap:6px;align-items:center" }, tick, h("span", { text: label }))),
      body: function () { return { typed_name: name.value.trim(), agree: tick.checked }; } };
  }
  var BENCH_STATUS = { invited: "Invited", active: "On the bench", declined: "Declined", left: "Left", removed: "Removed", expired: "Expired" };
  function agencyBench(box) {
    api.get("/agency/bench").then(function (v) {
      D.clear(box);
      if (!v.ok || !v.on) return;
      // The allowed range comes from Settings through the api (AI review 0.9.0, payments 4)
      var lim = v.limits || {};
      var limText = lim.min_bps != null && lim.max_bps != null ? "Allowed: " + lim.min_bps / 100 + "% to " + lim.max_bps / 100 + "%." : "";
      var terms = function () { return h("details", null, h("summary", { text: "Read the bench agreement" }), h("p", { class: "small", style: "white-space:pre-wrap", text: v.terms })); };
      // Benches you are invited to or on
      (v.my_benches || []).forEach(function (b) {
        var c = h("div", { class: "card bench-card" }, h("h2", { text: b.status === "invited" ? "Bench invitation from " + b.agency : "On " + b.agency + "'s bench" }));
        c.appendChild(cardStatus("mybench"));
        if (b.split) c.appendChild(h("p", null, h("b", { text: "Your split: " }), splitText(b.split.agency_bps, true) + ". The agency pays the platform fee from its share, so you receive your full share and pay no fee."));
        var w = b.waiting;
        if (w) c.appendChild(h("p", null, h("b", { text: w.freelancer_signed ? "You proposed: " : (b.status === "invited" ? "Proposed split: " : "New split proposed: ") }), splitText(w.agency_bps, true) +
          (w.freelancer_signed ? ". Waiting for the agency to sign." : b.split ? ". Your current split stays until you sign. It applies only to work assigned after both sign." : ". The agency pays the platform fee from its share.")));
        if (b.note) c.appendChild(h("p", { class: "small muted", text: "Note from " + b.invited_by + ": " + b.note }));
        if (b.status === "invited") c.appendChild(h("p", { class: "small muted", text: "Open until " + D.date(b.expires_at) + "." }));
        if (!v.plan_ok) c.appendChild(h("p", { class: "notice", text: "Plus plan or higher required to join a bench. Upgrade your Lawfecta membership to " + (v.min_plan || "Freelancer Plus") + ", then come back to sign." }));
        c.appendChild(terms());
        var sr = signRow("I have read the bench agreement and I sign it electronically.");
        var acts = h("div", { class: "row", style: "flex-wrap:wrap;margin-top:6px" });
        if (w && !w.freelancer_signed && v.plan_ok) acts.appendChild(h("button", { class: "blue small", type: "button", onclick: function () {
          api.post("/agency/bench/answer", Object.assign({ id: b.id, action: "sign" }, sr.body())).then(gigOk).then(function (x) { draw(); cardSay("mybench", x.joined ? "Signed. You joined " + b.agency + "'s bench." : "Signed. The new split applies to new work."); }).catch(cardFail("mybench"));
        } }, b.status === "invited" ? "Sign and join" : "Sign the new split"));
        if (v.plan_ok) {
          var other = h("input", { type: "number", min: String(lim.min_bps / 100), max: String(lim.max_bps / 100), step: "0.5", "aria-label": "Agency share you propose (%)", style: "width:90px" });
          acts.appendChild(h("span", { class: "small", text: "Or propose the agency's share (%):" }));
          acts.appendChild(other);
          acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/agency/bench/answer", Object.assign({ id: b.id, action: "counter", agency_percent: Number(other.value) }, sr.body())).then(gigOk).then(function () { draw(); cardSay("mybench", "Proposed and signed. Waiting for the agency."); }).catch(cardFail("mybench"));
          } }, "Propose this split"));
        }
        if (b.status === "invited") acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
          api.post("/agency/bench/answer", { id: b.id, action: "decline" }).then(gigOk).then(function () { draw(); cardSay("mybench", "Declined"); }).catch(cardFail("mybench"));
        } }, "Decline"));
        if (b.status === "active") acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
          if (!confirm("Leave " + b.agency + "'s bench? New assignments stop. Work already assigned keeps its split and pays out.")) return;
          api.post("/agency/bench/end", { id: b.id }).then(gigOk).then(function () { draw(); cardSay("mybench", "You left the bench"); }).catch(cardFail("mybench"));
        } }, "Leave the bench"));
        if (v.plan_ok) c.appendChild(sr.el);
        c.appendChild(acts);
        box.appendChild(c);
      });
      // Work the agencies assigned to you
      if ((v.my_assignments || []).length) {
        var ac = h("div", { class: "card", id: "my-assignments" }, h("h2", { text: "Your agency assignments" }),
          h("p", { class: "small muted", text: "Work agencies gave you from their engagements. You hand the work to the agency; the agency delivers it to its client. You pay no platform fee on your share." }));
        ac.appendChild(cardStatus("myassign"));
        v.my_assignments.forEach(function (x) {
          var line = h("div", { style: "border-top:1px solid var(--line);padding:8px 0" },
            h("b", { text: x.job + ", milestone " + x.seq + ": " + x.title }),
            h("p", { class: "small", style: "margin:4px 0", text: "For " + x.agency + " | " + D.money(x.amount_cents) + " | your share " + D.money(x.share_cents) + (x.due_date ? " | due " + D.date(x.due_date) : "") }),
            x.deliverables ? h("p", { class: "small muted", style: "margin:0", text: "Deliverables: " + x.deliverables }) : null);
          if (x.status === "proposed") {
            var tick = h("input", { type: "checkbox", "aria-label": "I accept this split for this job." });
            line.appendChild(h("p", { class: "notice", style: "margin:6px 0", text: "Split for this job: " + pct(x.agency_bps) + " agency / " + pct(10000 - x.agency_bps) + " you. Work cannot start until you accept." }));
            line.appendChild(h("label", { class: "small", style: "font-weight:400;display:flex;gap:6px;align-items:center" }, tick, h("span", { text: "I accept this split for this job." })));
            line.appendChild(h("div", { class: "row" },
              h("button", { class: "blue small", type: "button", onclick: function () { api.post("/agency/assignment/answer", { id: x.id, accept: true, agree: tick.checked }).then(gigOk).then(function () { draw(); cardSay("myassign", "Accepted. You can start once the milestone is funded."); }).catch(cardFail("myassign")); } }, "Accept"),
              h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/agency/assignment/answer", { id: x.id, accept: false }).then(gigOk).then(function () { draw(); cardSay("myassign", "Declined. The milestone goes back to the agency."); }).catch(cardFail("myassign")); } }, "Decline")));
          } else {
            var pay = x.payout;
            line.appendChild(h("p", { class: "small", style: "margin:4px 0", text: "Split " + pct(x.agency_bps) + " agency / " + pct(10000 - x.agency_bps) + " you | " +
              (pay ? (pay.status === "sent" ? "your share was paid" : pay.status === "held" ? "your share waits for your payout setup on the Earnings page" : "your share is on its way") : x.milestone_status === "accepted" ? "accepted" : "in progress") }));
          }
          ac.appendChild(line);
        });
        box.appendChild(ac);
      }
      // The agency's own bench (owner and managers)
      if (!v.agency_bench) return;
      var c = h("div", { class: "card", id: "agency-bench" }, h("h2", null, D.term("Bench", "bench")),
        h("p", { class: "small muted", text: "Outside freelancers you hire for your work. They never use a seat. Before someone joins, you both sign a bench agreement that sets the split of the fee. " +
          "The agency's share is " + pct(lim.min_bps) + " to " + pct(lim.max_bps) + ", and the agency pays the " + pct(v.fee_bps) + " freelancer platform fee from its share. Only Freelancer Plus or higher can join. The attorney never sees the split." }));
      c.appendChild(cardStatus("bench"));
      if (!v.agency_bench.length) c.appendChild(h("p", { class: "muted", text: "Nobody on your bench yet." }));
      var sr = signRow("I have read the bench agreement and I sign it for the agency.");
      v.agency_bench.forEach(function (b) {
        var acts = h("div", { class: "row", style: "flex-wrap:wrap" });
        var w = b.waiting, open = b.status === "invited" || b.status === "active";
        if (open && w && !w.agency_signed) acts.appendChild(h("button", { class: "blue small", type: "button", onclick: function () {
          api.post("/agency/bench/agency", Object.assign({ id: b.id, action: "sign" }, sr.body())).then(gigOk).then(function (x) { draw(); cardSay("bench", x.joined ? "Signed. " + b.name + " joined your bench." : "Signed. The new split applies to new work."); }).catch(cardFail("bench"));
        } }, "Sign their split"));
        if (b.status === "active") {
          var nw = h("input", { type: "number", min: String(lim.min_bps / 100), max: String(lim.max_bps / 100), step: "0.5", "aria-label": "New agency share for " + b.name + " (%)", style: "width:90px" });
          acts.appendChild(nw);
          acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/agency/bench/agency", Object.assign({ id: b.id, action: "change", agency_percent: Number(nw.value) }, sr.body())).then(gigOk).then(function () { draw(); cardSay("bench", "Proposed and signed. Waiting for " + b.name + "."); }).catch(cardFail("bench"));
          } }, "Propose a new default split"));
        }
        if (open) acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
          if (!confirm(b.status === "invited" ? "Cancel the bench invitation to " + b.name + "?" : "Remove " + b.name + " from your bench? New assignments stop. Work already assigned keeps its split and pays out.")) return;
          api.post("/agency/bench/end", { id: b.id }).then(gigOk).then(function () { draw(); cardSay("bench", b.status === "invited" ? "Invitation canceled" : b.name + " removed from your bench"); }).catch(cardFail("bench"));
        } }, b.status === "invited" ? "Cancel invitation" : "Remove"));
        var facts = [BENCH_STATUS[b.status] || b.status];
        if (b.split) facts.push("split " + splitText(b.split.agency_bps, false));
        if (w) facts.push((w.agency_signed ? "waiting for them to sign " : "they proposed ") + splitText(w.agency_bps, false));
        if (b.inactive) facts.push("Inactive: Free plan");
        if (b.status === "invited" && !b.plan_ok) facts.push("Plus plan or higher required to join a bench");
        if (b.status === "invited") facts.push("open until " + D.date(b.expires_at));
        c.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;border-top:1px solid var(--line);padding:6px 0" },
          h("span", { class: "grow" }, h("b", { text: b.name }), h("span", { class: "small muted", text: " | " + facts.join(" | ") })), acts));
      });
      // Invite someone
      var em = h("input", { type: "email", "aria-label": "Bench freelancer's email on Lawfecta", placeholder: "Their email on Lawfecta" });
      var share = h("input", { type: "number", min: lim.min_bps != null ? String(lim.min_bps / 100) : null, max: lim.max_bps != null ? String(lim.max_bps / 100) : null, step: "0.5", "aria-label": "Agency share (%)", style: "width:90px" });
      var note = h("input", { "aria-label": "Note to them (optional)", placeholder: "Note to them (optional)", maxlength: "600" });
      c.appendChild(h("h3", { text: "Invite to the bench" }));
      c.appendChild(h("div", { class: "row", style: "flex-wrap:wrap" }, em, field("Agency share (%)", share, limText), note));
      c.appendChild(terms());
      c.appendChild(sr.el);
      c.appendChild(h("div", { class: "row", style: "margin-top:6px" }, h("button", { class: "blue small", type: "button", onclick: function () {
        // No starting share: the agency chooses it (AI review 0.9.0, payments 4: 30% was never a decided number)
        if (share.value.trim() === "") { cardSay("bench", "Enter the agency's share (%) first. " + limText, true); share.focus(); return; }
        api.post("/agency/bench/invite", Object.assign({ email: em.value.trim(), agency_percent: Number(share.value), note: note.value, request_id: newId() }, sr.body())).then(gigOk).then(function (x) {
          draw(); cardSay("bench", x.duplicate ? "Already invited or on your bench" : x.plan_ok ? "Bench invitation sent" : "Bench invitation sent. They need Freelancer Plus or higher to join.");
        }).catch(cardFail("bench"));
      } }, "Invite to the bench")));
      box.appendChild(c);
    }).catch(function () { D.clear(box); });
  }

  // ---------- Attorney: Talent ----------
  var talentQ = { practice_area: "", skill: "", tool: "", state: "" };
  var talentMode = "search";
  try { if (new URLSearchParams(location.search).get("view") === "bench") talentMode = "bench"; } catch (e) { /* no deep link */ }
  // ---------- Step 7c part 2: standing arrangements (limited automatic repeat hiring) ----------
  // Off on Live until counsel approves (switch auto_repeat_hiring): the card then says "Coming soon".
  var STANDING_WORDS = { proposed: "Waiting for the freelancer", active: "Active", needs_review: "Needs review", ending: "Ending after open jobs", ended: "Ended", declined: "Declined" };
  var STANDING_ERR = { standing_off: "Standing arrangements are not open for your account yet.", standing_paid_plans_only: "Standing arrangements are part of the paid attorney plans (Plus, Pro and Business).",
    owners_and_managers_only: "Only the firm's owner or a manager can set up or change a standing arrangement.", cap_required: "Set a monthly spend cap. DELA does not save an arrangement without one.",
    price_over_cap: "The price per job cannot be more than the monthly cap.", price_too_low: "The price per job is below the smallest engagement allowed.", bad_end_date: "Pick an end date within 12 months.",
    docs_required: "Choose at least one approved SOP or Workflow.", doc_not_approved: "Only approved SOPs and Workflows can be covered.", freelancer_not_verified: "This freelancer is not verified right now.",
    sign_needs_name_and_consent: "Type your full name and tick the box.", standing_not_active: "This arrangement is not active, so it cannot hire right now.", on_hold: "A hold on one of the accounts stops hiring right now.",
    dispute_open: "A job from this arrangement is in a dispute, so hiring is paused.", freelancer_unavailable: "The freelancer is not available right now. Try someone from your bench, or post a gig.",
    decline_window_over: "The time to decline this job is over.", work_started: "Work on this job has started, so it cannot be declined here.", bad_max_open: "Choose 1 to 20 jobs open at once." };
  function standingErr(e) { return STANDING_ERR[e && e.reason] || ENG_ERR[e && e.reason] || D.errorText(e && (e.reason || e.message)); }
  function signBox(prefix) {
    var name = h("input", { "aria-label": prefix + ": type your full name", style: "width:100%", autocomplete: "name" });
    var ok = h("input", { type: "checkbox", "aria-label": prefix + ": I agree" });
    return { name: name, ok: ok };
  }
  function standingSetup(person, personName) {
    loadStanding().then(function (st) {
      var m = modal("Standing arrangement with " + personName);
      if (!st.on) { m.body.appendChild(h("p", { text: "Standing arrangements are coming soon." })); m.foot.appendChild(h("button", { class: "ghost", type: "button", onclick: m.close }, "Close")); return; }
      if (!st.can_create) { m.body.appendChild(h("p", { class: "notice", text: STANDING_ERR.standing_paid_plans_only + " " + STANDING_ERR.owners_and_managers_only })); m.foot.appendChild(h("button", { class: "ghost", type: "button", onclick: m.close }, "Close")); return; }
      var df = st.defaults || {};
      m.body.appendChild(h("p", { class: "small", text: "Hire " + personName + " again for the same work without a new proposal each time. You both sign once. Inside these limits you hire in one click and DELA charges your saved card at once (with no saved card, the Stripe payment page opens). Anything outside them becomes a normal gig draft." }));
      var docs = (st.docs || []).map(function (d) { var c = h("input", { type: "checkbox", value: d.playbook_id }); return { c: c, el: h("label", { style: "display:flex;gap:8px;font-weight:400" }, c, h("span", { text: (d.doc_id ? d.doc_id + " " : "") + d.title + " (version " + d.version + ")" })) }; });
      m.body.appendChild(h("b", { text: "Documents covered (approved SOPs and Workflows)" }));
      if (!docs.length) m.body.appendChild(h("p", { class: "muted small", text: "No approved SOPs or Workflows yet." }));
      docs.forEach(function (d) { m.body.appendChild(d.el); });
      var price = h("input", { type: "number", min: "0", step: "1", "aria-label": "Price per job ($)", placeholder: String((df.min_price_cents || 0) / 100) });
      var cap = h("input", { type: "number", min: "0", step: "1", "aria-label": "Monthly spend cap ($)" });
      var open = h("input", { type: "number", min: "1", max: limAttr("standing_max_open"), step: "1", "aria-label": "Most jobs open at once", value: String(df.max_open || 3) });
      var endDefault = new Date(); endDefault.setMonth(endDefault.getMonth() + (df.months || 6));
      var end = h("input", { type: "date", "aria-label": "End date", value: endDefault.toISOString().slice(0, 10) });
      var firm = h("input", { type: "checkbox" });
      m.body.appendChild(h("div", { class: "row", style: "flex-wrap:wrap" }, field("Price per job ($)", price), field("Monthly spend cap ($)", cap, "Required. Hires stop at the cap each month.")));
      m.body.appendChild(h("div", { class: "row", style: "flex-wrap:wrap" }, field("Most jobs open at once", open), field("End date", end, "Up to " + (df.max_months || 12) + " months.")));
      m.body.appendChild(h("label", { style: "display:flex;gap:8px;font-weight:400;margin:6px 0" }, firm, h("span", { text: "Let other attorneys in the firm use this arrangement" })));
      var sb = signBox("Standing arrangement");
      m.body.appendChild(field("Your full name", sb.name, "Your typed name is your signature."));
      m.body.appendChild(h("label", { style: "display:flex;gap:8px;font-weight:400;margin:6px 0" }, sb.ok, h("span", { text: "I sign this standing arrangement for the firm, and I agree that Lawfecta may charge the saved payment method for each job hired from it, up to the monthly cap." })));
      var msg = h("p", { class: "small", role: "status" });
      m.body.appendChild(msg);
      // One request ID for this window, and the button waits for the answer: a double click makes one arrangement
      // (AI review 0.9.0, payments 1)
      var req = newId();
      // A changed box is a new request, so a repeat after a lost answer never keeps old numbers (AI review 0.9.1, payments 1)
      m.body.addEventListener("input", function () { req = newId(); });
      m.body.addEventListener("change", function () { req = newId(); });
      var send = h("button", { class: "blue", type: "button" }, "Sign and send");
      send.addEventListener("click", function () {
        if (send.disabled) return;
        send.disabled = true;
        api.post("/standing/create", { freelancer_person: person, docs: docs.filter(function (d) { return d.c.checked; }).map(function (d) { return d.c.value; }), price: price.value, cap: cap.value, max_open: Number(open.value),
          end_on: end.value, allow_firm: firm.checked, typed_name: sb.name.value, consent: sb.ok.checked, request_id: req }).then(function (r) {
          send.disabled = false;
          if (!r.ok) { msg.textContent = standingErr(r); return; }
          m.close(); D.toast(app, "Sent to " + personName + " to accept."); if (tab === "projects") draw();
        }).catch(function (e) { send.disabled = false; msg.textContent = standingErr(e); });
      });
      m.foot.appendChild(send);
      m.foot.appendChild(h("button", { class: "ghost", type: "button", onclick: m.close }, "Cancel"));
    });
  }
  function loadStanding() { return api.get("/standing").catch(function () { return { on: false, arrangements: [] }; }); }
  function standingCard(slot) {
    loadStanding().then(function (st) {
      var att = me.side === "attorney";
      if (!st.on) { if (att) slot.appendChild(h("div", { class: "card" }, h("h2", { text: "Standing arrangements" }), h("span", { class: "soon", text: "Coming soon" }), h("p", { class: "small muted", text: "Hire a trusted freelancer again in one click, inside limits you both sign once." }))); return; }
      var list = st.arrangements || [];
      if (!list.length && !att) return;
      // Ended and declined arrangements move to "Past arrangements" (step 8b Part C, R08)
      var PAST = ["ended", "declined"];
      var current = list.filter(function (a) { return PAST.indexOf(a.status) < 0; }), past = list.filter(function (a) { return PAST.indexOf(a.status) >= 0; });
      var c = h("div", { class: "card", id: "standing-card" }, h("h2", { text: "Standing arrangements (" + current.length + ")" }), cardStatus("standing"));
      if (!current.length) c.appendChild(h("p", { class: "muted", text: att ? "None active. In Talent, choose a freelancer and click \"Set up a standing arrangement\"." : "None active." }));
      var pastBox = past.length ? h("details", { id: "standing-past", style: "margin-top:10px" }, h("summary", { style: "cursor:pointer;font-weight:700", text: "Past arrangements (" + past.length + ")" })) : null;
      current.concat(past).forEach(function (a) {
        var box = h("div", { class: "soft standing", style: "margin:10px 0;padding:10px 12px;border-radius:12px" });
        box.appendChild(h("div", { class: "row" }, h("b", { class: "grow", text: att ? a.freelancer_name : a.firm_name }), h("span", { class: "badge " + ({ active: "R", needs_review: "held", proposed: "", ending: "", ended: "off", declined: "off" }[a.status] || ""), text: STANDING_WORDS[a.status] || a.status })));
        box.appendChild(h("p", { class: "small", style: "margin:4px 0", text: D.money(a.price_cents) + " per job | " + D.money(a.spend_cents) + " of " + D.money(a.cap_cents) + " this month | " + a.open + " of " + a.max_open + " jobs open | until " + D.date(a.end_on) }));
        box.appendChild(h("p", { class: "small muted", style: "margin:4px 0", text: "Covers: " + (a.docs || []).map(function (d) { return (d.doc_id ? d.doc_id + " " : "") + d.title + " (version " + d.version + ")"; }).join("; ") }));
        if (a.review_reason) box.appendChild(h("p", { class: "notice", text: a.review_reason + " Automatic hiring is paused until you both approve." }));
        function act(path, body, okMsg) { return api.post(path, Object.assign({ id: a.id }, body || {})).then(function (r) { if (!r.ok) throw r; cardSay("standing", typeof okMsg === "function" ? okMsg(r) : okMsg); setTimeout(draw, 900); }).catch(function (e) { cardSay("standing", standingErr(e), true); }); }
        // The freelancer accepts once, with their typed name
        if (!att && a.status === "proposed") {
          var sbA = signBox("Accept");
          box.appendChild(field("Your full name", sbA.name));
          box.appendChild(h("label", { style: "display:flex;gap:8px;font-weight:400;margin:6px 0" }, sbA.ok, h("span", { text: "I accept this standing arrangement. Jobs inside its limits start without a new proposal; I can decline a job within " + ((st.defaults || {}).decline_hours || 24) + " hours, and end the arrangement any time." })));
          box.appendChild(h("div", { class: "row" }, h("button", { class: "blue small", type: "button", onclick: function () { act("/standing/accept", { accept: true, typed_name: sbA.name.value, consent: sbA.ok.checked }, "Accepted. The firm can now hire you again in one click."); } }, "Accept"),
            h("button", { class: "ghost small", type: "button", onclick: function () { act("/standing/accept", { accept: false }, "Declined."); } }, "Decline")));
        }
        // Approving again after a material change or new limits
        if (a.status === "needs_review" && (att ? a.role === "manager" : true)) {
          var mineOk = att ? a.review_attorney_ok : a.review_freelancer_ok;
          if (mineOk) box.appendChild(h("p", { class: "small muted", text: "You approved. Waiting for the other person." }));
          else {
            var sbR = signBox("Review");
            box.appendChild(field("Your full name", sbR.name));
            box.appendChild(h("label", { style: "display:flex;gap:8px;font-weight:400;margin:6px 0" }, sbR.ok, h("span", { text: "I approve the arrangement again with these documents and limits." })));
            box.appendChild(h("div", { class: "row" }, h("button", { class: "blue small", type: "button", onclick: function () { act("/standing/review", { approve: true, typed_name: sbR.name.value, consent: sbR.ok.checked }, function (r) { return r.status === "active" ? "Approved by both. One-click hiring works again." : "Approved. Waiting for the other person."; }); } }, "Review and approve"),
              a.pending ? h("button", { class: "ghost small", type: "button", onclick: function () { act("/standing/review", { approve: false }, "Not approved. The signed limits stay."); } }, "Do not approve") : null));
          }
        }
        // One click: hire again (attorneys who may use it)
        if (att && a.status === "active" && (a.role === "manager" || a.role === "user")) {
          var pick = h("select", { "aria-label": "Document to hire for" }, (a.docs || []).map(function (d) { return h("option", { value: d.playbook_id, text: d.title }); }));
          var go = h("button", { class: "blue small", type: "button" }, "Hire again from my standing arrangement");
          var req = newId();
          go.addEventListener("click", function () {
            go.disabled = true;
            api.post("/standing/hire", { id: a.id, playbook_id: pick.value, request_id: req }).then(function (r) {
              go.disabled = false; req = newId();
              if (!r.ok && r.draft_gig_id) { cardSay("standing", (r.reason === "over_cap" ? "This job would pass the monthly cap (" + D.money(r.spend_cents) + " of " + D.money(r.cap_cents) + " used)." : r.reason === "too_many_open" ? "The most jobs open at once (" + r.max_open + ") are already open." : "That document is not covered.") + " Nothing was charged. A gig draft was made instead; open it from Your gigs to post it the normal way.", true); return; }
              if (!r.ok) { cardSay("standing", standingErr(r), true); return; }
              if (r.pay_url) { location.href = r.pay_url; return; }
              cardSay("standing", r.status === "active" ? "Hired and paid. " + D.money(r.cap_left_cents) + " of this month's cap is left." : "Hired. The payment is not finished yet: " + (r.payment === "payments_not_set_up" ? "payments are not set up on this site yet." : "open the job to pay."));
              setTimeout(draw, 1200);
            }).catch(function (e) { go.disabled = false; cardSay("standing", standingErr(e), true); });
          });
          // What is left, next to the button, and the cap rule (step 8b Part C, R08; answer 9: the cap counts the job price)
          var leftC = Math.max(0, a.cap_cents - a.spend_cents), places = Math.max(0, a.max_open - a.open);
          box.appendChild(h("p", { class: "small", style: "margin:6px 0 2px", id: "standing-left-" + a.id, text: D.money(leftC) + " left this month | " + places + (places === 1 ? " open-job place left" : " open-job places left") }));
          box.appendChild(h("p", { class: "small muted", style: "margin:0 0 4px", text: "The cap counts the job price. Lawfecta's platform fee is added to each charge." }));
          var why = places < 1 ? "The most jobs open at once (" + a.max_open + ") are already open." : leftC < a.price_cents ? "This month's cap has " + D.money(leftC) + " left, less than one job (" + D.money(a.price_cents) + ")." : "";
          if (why) box.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;margin-top:6px;gap:8px" }, h("span", { class: "small bad", text: why }),
            a.role === "manager" ? h("button", { class: "ghost small", type: "button", onclick: function () { openLimits(); } }, "Review limits") : h("span", { class: "small muted", text: "Ask the firm's owner or a manager to review the limits." })));
          else box.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;margin-top:6px" }, pick, go));
        }
        // The jobs hired from it
        if ((a.hires || []).length) box.appendChild(h("ul", { class: "list", style: "margin-top:6px" }, a.hires.map(function (x) {
          return h("li", { class: "row" }, h("span", { class: "grow small", text: D.date(x.created_at) + ": " + x.title + ", " + D.money(x.price_cents) + " | " + ({ active: "Hired", paying: "Waiting for payment", declined: "Declined, refunded", failed: "Did not start", signing: "Starting" }[x.status] || x.status) }),
            x.gig_id && x.status !== "failed" ? h("button", { class: "ghost small", type: "button", onclick: function () { gigs.id = x.gig_id; gigs.view = "agreement"; draw(); } }, "Open the job") : null,
            x.can_decline ? h("button", { class: "ghost small", type: "button", onclick: function () { if (!confirm("Decline this job? The firm is refunded in full.")) return; api.post("/standing/decline-hire", { hire_id: x.id }).then(function (r) { if (!r.ok) throw r; cardSay("standing", "Declined. The firm is refunded in full."); setTimeout(draw, 900); }).catch(function (e) { cardSay("standing", standingErr(e), true); }); } }, "Decline this job") : null);
        })));
        // Change the limits (both sign again) and end it
        var tools = h("div", { class: "row", style: "flex-wrap:wrap;margin-top:6px" });
        if (att && a.role === "manager" && a.status === "active") tools.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { openLimits(); } }, "Change limits"));
        function openLimits() {
          if (box.querySelector(".limits-form")) { box.querySelector(".limits-form").scrollIntoView({ block: "nearest" }); return; }
          var pr = h("input", { type: "number", min: "0", step: "1", "aria-label": "New price per job ($)", value: String(a.price_cents / 100) }), cp = h("input", { type: "number", min: "0", step: "1", "aria-label": "New monthly spend cap ($)", value: String(a.cap_cents / 100) });
          var op = h("input", { type: "number", min: "1", max: limAttr("standing_max_open"), step: "1", "aria-label": "New most jobs open at once", value: String(a.max_open) }), sbC = signBox("New limits");
          box.appendChild(h("div", { class: "soft limits-form", style: "margin-top:6px" }, h("p", { class: "small", text: "Once you send them, new limits pause one-click hiring until the freelancer approves them. Limits that are not allowed are refused and nothing changes." }), h("div", { class: "row", style: "flex-wrap:wrap" }, field("Price per job ($)", pr), field("Monthly spend cap ($)", cp), field("Most jobs open at once", op)),
            field("Your full name", sbC.name), h("label", { style: "display:flex;gap:8px;font-weight:400" }, sbC.ok, h("span", { text: "I sign the new limits for the firm." })),
            h("button", { class: "blue small", type: "button", onclick: function () { act("/standing/change", { price: pr.value, cap: cp.value, max_open: Number(op.value), typed_name: sbC.name.value, consent: sbC.ok.checked }, "Sent. Hiring is paused until the freelancer approves."); } }, "Sign and send the new limits")));
        }
        if ((att ? a.role === "manager" : true) && ["proposed", "active", "needs_review"].indexOf(a.status) >= 0 && !(a.status === "proposed" && !att)) tools.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
          if (!confirm("End this standing arrangement? No new jobs can be hired from it; open jobs finish as agreed.")) return; act("/standing/end", {}, function (r) { return r.status === "ending" ? "Ending once the open jobs finish." : "Ended."; });
        } }, "End arrangement"));
        if (tools.children.length) box.appendChild(tools);
        (PAST.indexOf(a.status) >= 0 ? pastBox : c).appendChild(box);
      });
      if (pastBox) c.appendChild(pastBox);
      slot.appendChild(c);
    });
  }

  var US_STATES = [["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"]];
  function talentView() {
    var el = h("div", null, h("h1", { text: "Talent" }));
    if ((me.switches || {}).bench) {
      el.appendChild(h("div", { class: "pills", role: "tablist", "aria-label": "Talent views" }, [["search", "Search"], ["bench", "My bench"]].map(function (v) {
        return h("button", { role: "tab", "aria-selected": String(talentMode === v[0]), onclick: function () { talentMode = v[0]; draw(); } }, v[1]);
      })));
      if (talentMode === "bench") { benchView(el); return el; }
    }
    el.appendChild(h("p", { class: "muted", text: "Match-ready freelancers: verified, profile complete and availability confirmed recently. Every conversation happens on a gig, so inviting someone needs a gig." }));
    el.appendChild(h("p", { class: "small" }, D.term("What match-ready means", "match_ready")));
    // Visible labels on every box, and the state picked by its full name (UX review T01)
    var inputs = {};
    [["practice_area", "Practice area", "For example: Family law"], ["skill", "Skill", "For example: E-filing"], ["tool", "Tech tool", "For example: Clio"]].forEach(function (x) {
      inputs[x[0]] = h("input", { "aria-label": x[1], placeholder: x[2], value: talentQ[x[0]] });
    });
    inputs.state = h("select", { "aria-label": "State you need" }, [h("option", { value: "", text: "Any state" })].concat(US_STATES.map(function (st) {
      return h("option", { value: st[0], text: st[1], selected: talentQ.state === st[0] });
    })));
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
          var act = h("div", { class: "row", style: "margin-top:6px;flex-wrap:wrap" });
          act.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { profileModal(p.person_id); } }, "View profile"));
          if (mine.length) {
            var sel = h("select", { "aria-label": "Gig to invite " + p.name + " to" }, mine.map(function (g) { return h("option", { value: g.id, text: g.title }); }));
            act.appendChild(sel);
            act.appendChild(h("button", { class: "blue small", type: "button", onclick: function () {
              api.post("/gigs/invite", { gig_id: sel.value, person_id: p.person_id }).then(gigOk).then(function (y) { D.toast(app, y.duplicate ? "Already invited" : "Invited " + p.name); }).catch(gigFail);
            } }, "Invite to this gig"));
          }
          act.appendChild(h("button", { class: mine.length ? "ghost small" : "blue small", type: "button", onclick: function () {
            gigs.pendingInvite = { person_id: p.person_id, name: p.name }; gigs.id = null; tab = "projects"; draw();
          } }, "Create a gig from an SOP or Workflow"));
          if ((me.switches || {}).bench) act.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/bench/invite", { freelancer: p.person_id, request_id: newId() }).then(engOk).then(function (y) { D.toast(app, y.duplicate ? p.name + " is already on your bench or invited" : "Bench invitation sent to " + p.name); }).catch(revFail);
          } }, "Invite to my bench"));
          if ((me.switches || {}).auto_repeat_hiring && me.side === "attorney") act.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { standingSetup(p.person_id, p.name); } }, "Set up a standing arrangement"));
          var rb = reviewsButton(p.person_id, "freelancer", p.name);
          if (rb) act.appendChild(rb);
          results.appendChild(h("div", { class: "card", style: "margin:8px 0" }, h("b", { text: p.name }), p.headline ? h("div", { class: "small", text: p.headline }) : null,
            h("div", { class: "small muted", text: [(p.practice_areas || []).join(", "), (p.software || []).length ? "Uses " + p.software.slice(0, 5).join(", ") : "", p.capacity_hours_week ? p.capacity_hours_week + " hours a week" : "", p.timezone || ""].filter(Boolean).join(" | ") }),
            p.summary ? h("p", { class: "small", text: p.summary }) : null, act));
        });
      }).catch(function (e) { D.clear(results); results.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    }
    var task = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Describe the task", placeholder: "For example: e-filing family law motions in Texas, using Clio" });
    el.appendChild(h("div", { class: "card" }, h("h2", { text: "Find a freelancer" }), h("div", { class: "row", style: "flex-wrap:wrap;align-items:flex-end" },
      field("Practice area", inputs.practice_area), field("Skill", inputs.skill), field("Tech tool", inputs.tool), field("State you need", inputs.state),
      h("button", { class: "blue small", type: "button", onclick: run }, "Search")),
      (me.switches || {}).ai_helpers ? field("Describe the task (for ✦ Help me find a fit)", h("div", null, aiNotice(), task), "DELA suggests filters from it. You check them, then click Search.") : null,
      helperButton("find_fit", "✦ Help me find a fit", function () { return { text: task.value }; }, { field: function (x) { return inputs[x.field] || null; }, toast: "Added to the filters. Check them, then click Search." })));
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
      var alTip = D.helpTip(D.HELP.proposal_allowance, "What is the proposal allowance?");
      el.appendChild(h("p", { class: "notice ok" }, allowanceText(r.allowance), " ", alTip[0]));
      el.appendChild(alTip[1]);
      var engSlot = h("div");
      el.appendChild(engSlot);
      function section(title, list, empty, extra) {
        var c = h("div", { class: "card" }, h("h2", { text: title + " (" + list.length + ")" }));
        if (!list.length) c.appendChild(h("p", { class: "muted", text: empty }));
        // An empty list says what to do next (UX review part 3, freelancer side)
        if (!list.length && title === "Matches") c.appendChild(h("div", { class: "row" }, h("button", { class: "ghost small", type: "button", onclick: function () { tab = "profile"; draw(); } }, "Open my profile and availability")));
        list.forEach(function (g) {
          c.appendChild(h("div", { class: "work", style: "cursor:pointer", role: "button", tabindex: "0", onclick: function () { gigLink(g.id, "work"); } },
            h("div", null, h("h3", { text: g.title }), h("div", { class: "small", text: budgetText(g) + (g.deadline ? " | due " + D.date(g.deadline) : "") + (g.closes_at && g.status === "open" ? " | closes " + D.date(g.closes_at) : "") }),
              (g.reasons || []).length ? h("div", { class: "small muted", text: "Why it fits: " + g.reasons.join(" | ") }) : null,
              g.message ? h("div", { class: "small muted", text: "Invitation: " + g.message }) : null, extra ? extra(g) : null),
            h("span", { class: "grow" }), g.proposal_status ? h("span", { class: "badge " + (g.needs_reconfirm ? "held" : propTone(g.proposal_status)), text: PROP_STATUS[g.proposal_status] + (g.needs_reconfirm ? ": please confirm" : "") }) : null));
        });
        el.appendChild(c);
      }
      var stSlotF = h("div"); el.appendChild(stSlotF); standingCard(stSlotF);
      section("Invitations", r.invitations, "No invitations right now.");
      section("Matches", r.matches, "No matches right now. Keep your availability confirmed and your profile up to date.");
      if (r.open_gigs.length) section("Open gigs", r.open_gigs, "");
      section("Drafts", r.drafts, "No saved drafts.");
      section("Sent proposals", r.sent, "Nothing sent yet.");
      if ((me.switches || {}).engagements) engagementsList(engSlot, "Your engagements");
      benchFreelancerCard(el);
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    return el;
  }

  function workGig(el) {
    api.get("/gigs/get?id=" + gigs.id).then(function (r) {
      D.clear(el);
      el.appendChild(h("div", { class: "row" }, h("button", { class: "ghost small", onclick: function () { gigs.id = null; draw(); } }, "← Work")));
      if (!r.ok) { el.appendChild(h("p", { class: "notice", text: "This gig is not available to you." })); return; }
      var g = r.gig, mine = r.my_proposal;
      el.appendChild(h("div", { class: "row" }, h("h1", { class: "grow", text: g.title }), h("span", { class: "badge " + gigTone(g.status), text: GIG_STATUS[g.status] })));
      if (g.firm) el.appendChild(h("p", { class: "muted", text: "Posted by " + g.firm + (g.client_kind === "agency" ? " (agency)" : "") + "." }));
      if ((me.switches || {}).reviews) el.appendChild(h("div", { class: "row" }, h("button", { class: "ghost small", type: "button", onclick: function () { showReviews("gig=" + g.id, "attorney", g.firm || "the " + clientWord(g)); } }, "Reviews of this " + clientWord(g))));
      if (r.invitation && r.invitation.status === "sent") el.appendChild(h("div", { class: "notice ok" }, h("p", { style: "margin:0 0 6px", text: "You are invited to send a proposal. An invited proposal does not use your monthly allowance." + (r.invitation.message ? " The attorney wrote: " + r.invitation.message : "") }),
        h("button", { class: "ghost small", type: "button", onclick: function () { if (!confirm("Decline this invitation?")) return; api.post("/gigs/decline", { gig_id: g.id }).then(gigOk).then(function () { gigs.id = null; draw(); D.toast(app, "Declined"); }).catch(gigFail); } }, "Decline")));
      if (((mine && mine.status === "selected") || r.access === "hired") && (me.switches || {}).engagements) { var engBox = h("div", { id: "engagement" }); el.appendChild(engBox); engagementPanel(engBox, g.id); }
      el.appendChild(h("div", { class: "card" }, publicBlock(g)));
      if ((r.access === "invited" || r.access === "applicant" || r.access === "hired") && ((me.switches || {}).gig_chat || (me.switches || {}).meetings)) {
        el.appendChild(h("div", { class: "row" },
          (me.switches || {}).gig_chat ? h("button", { class: "blue small", type: "button", onclick: function () { openThread(g.id, null); } }, "Message the " + clientWord(g)) : null,
          (me.switches || {}).meetings ? h("button", { class: "ghost small", type: "button", onclick: function () { talk.meeting = null; tab = "meetings"; draw(); } }, "Your meetings") : null));
      }
      if (g.milestones && g.milestones.length) el.appendChild(h("div", { class: "card" }, h("h2", { text: "Milestones" }), h("ol", null, g.milestones.map(function (m) { return h("li", { text: m.title }); })),
        h("p", { class: "small muted", text: "DELA finalizes the milestones with the agreement. You review and sign before any work starts." })));
      if (r.playbook) el.appendChild(h("div", { class: "card watermarked", "data-watermark": r.watermark || "" }, h("h2", { text: "The work handed to you" }), h("p", { class: "small muted", text: r.watermark }), r.playbook.gig_view ? docGigView(r.playbook, g.id) : playbookPlain(r.playbook)));
      var refsB = referencesBlock(r.references); if (refsB) el.appendChild(refsB);
      // Files
      if (r.files.length) {
        var fc = h("div", { class: "card" }, h("h2", { text: "Files for this gig" }), h("p", { class: "small muted", text: "Read only, for this gig only. Each file is open to you until the date shown or until the job is complete. Downloads are logged and shown to the attorney." }));
        r.files.forEach(function (f) {
          fc.appendChild(h("div", { class: "row" }, h("span", { class: "grow" }, f.name, f.expires_at ? h("span", { class: "small muted", text: " | until " + D.date(f.expires_at) }) : null), h("button", { class: "ghost small", type: "button", onclick: function () {
            D.openTab(function () { return api.get("/gigs/file?gig=" + g.id + "&file=" + f.file_id).then(gigOk).then(function (x) { return x.url; }); }, gigFail);
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
      if (mine || r.access !== "hired") el.appendChild(proposalCard(r, g, mine));
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  function proposalCard(r, g, mine) {
    var c = h("div", { class: "card" }, h("h2", { text: "Your proposal" }));
    if (mine && mine.status !== "draft") {
      c.appendChild(h("p", null, h("span", { class: "badge " + propTone(mine.status), text: PROP_STATUS[mine.status] }), " ", D.money(mine.price_cents) + (mine.agency_org ? " | sent for your agency" : "") + (mine.counted ? (mine.agency_org ? " | used one of the agency's proposals" : " | used one of your proposals") : mine.invited ? " | invited, did not use your allowance" : "")));
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
    // An agency proposal (Step 7d): the agency and "Who will do this work" (required)
    var agencyPick = { org: "", team: [] };
    var agencyBox = h("div");
    api.get("/proposals/options?gig=" + g.id).then(function (o) {
      if (!o || !(o.agencies || []).length) return;
      var choices = o.agencies.filter(function (a) { return !a.already; });
      if (!choices.length) { agencyBox.appendChild(h("p", { class: "notice", text: GIG_ERR.agency_already_proposed })); return; }
      var asSel = h("select", { "aria-label": "Send as" }, choices.map(function (a) { return h("option", { value: a.org_id, text: a.name + " (agency)" }); }).concat(o.solo ? [h("option", { value: "", text: "Myself" })] : []));
      var people = h("div");
      function drawPeople() {
        D.clear(people);
        agencyPick.org = asSel.value; agencyPick.team = [];
        var a = choices.filter(function (x) { return x.org_id === asSel.value; })[0];
        if (!a) return;
        people.appendChild(h("p", { class: "small", style: "margin:6px 0 2px", text: "Who will do this work (required). The attorney sees each person you pick, with their profile and reviews." }));
        if (!a.team.length) people.appendChild(h("p", { class: "small bad", text: "Nobody on your team has finished their own verification yet." }));
        a.team.forEach(function (t) {
          var cb = h("input", { type: "checkbox", "aria-label": "Name " + t.name + " on this proposal" });
          var role = h("input", { "aria-label": "Role on this job for " + t.name, placeholder: "Role on this job, for example Lead paralegal", maxlength: "80", disabled: "disabled" });
          var entry = { person_id: t.person_id, role: "", box: role };
          cb.addEventListener("change", function () {
            role.disabled = !cb.checked;
            if (cb.checked) agencyPick.team.push(entry); else agencyPick.team = agencyPick.team.filter(function (x) { return x !== entry; });
          });
          role.addEventListener("input", function () { entry.role = role.value; });
          people.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;gap:8px" }, h("label", { style: "font-weight:600;display:flex;gap:6px;align-items:center" }, cb, h("span", { text: t.name + " (" + ROLE_NAMES[t.role].toLowerCase() + ")" })), role));
        });
        people.appendChild(h("p", { class: "small muted", text: "Uses the agency's shared allowance. " + allowanceText(a.allowance) }));
      }
      asSel.addEventListener("change", drawPeople);
      agencyBox.appendChild(h("div", { class: "agency-box" }, field("Send as", asSel), people));
      drawPeople();
    }).catch(function () {});
    function body() { return { gig_id: g.id, agency_org: agencyPick.org, team: agencyPick.org ? agencyPick.team.map(function (e) { return { person_id: e.person_id, role: (e.box ? e.box.value : e.role || "").trim() }; }) : [], price: f.price.value, days_to_deliver: f.days.value ? Number(f.days.value) : null, included: f.included.value, excluded: f.excluded.value, schedule: f.schedule.value, qualifications: f.quals.value, message: f.message.value }; }
    var invited = r.access === "invited", al = r.allowance || {};
    c.appendChild(h("p", { class: "small muted", text: (invited ? "You were invited, so this proposal does not use your allowance. " : allowanceText(al) + " ") + "Milestones are set after hiring. Keep everything on Lawfecta." }));
    var help = h("button", { class: "ghost small ai-btn", type: "button" }, "✦ Let DELA help with qualifications");
    help.addEventListener("click", function () {
      help.disabled = true;
      api.post("/proposals/help", { gig_id: g.id }).then(gigOk).then(function (x) { help.disabled = false; f.quals.value = x.qualifications; if (!f.included.value) f.included.value = x.included; D.toast(app, "DELA drafted this from your profile. Check it before sending."); }).catch(function (e) { help.disabled = false; gigFail(e); });
    });
    c.appendChild(agencyBox);
    c.appendChild(h("div", { class: "row" }, field("Total price ($)", f.price), field("Days to deliver", f.days)));
    c.appendChild(field("What your price includes", f.included));
    c.appendChild(field("What it leaves out", f.excluded, "Say it plainly, so the attorney compares complete proposals."));
    c.appendChild(field("Schedule", f.schedule));
    c.appendChild(field("Your relevant qualifications", f.quals, "From your profile. DELA never invents qualifications.", null, help));
    c.appendChild(field("Note to the attorney (optional)", f.message));
    c.appendChild(helperButton("proposal_check", "✦ Check my proposal", function () {
      return { gig_id: g.id, proposal: { price: f.price.value, days: f.days.value, included: f.included.value, excluded: f.excluded.value, schedule: f.schedule.value, qualifications: f.quals.value, message: f.message.value } };
    }, { field: function (x) { return { included: f.included, excluded: f.excluded, schedule: f.schedule, qualifications: f.quals, message: f.message }[x.field] || null; } }));
    var send = h("button", { class: "blue", type: "button" }, invited ? "Send proposal (free: invited)" : "Send proposal (uses 1)");
    var sending = false;
    function doSend(confirmed) {
      if (sending) return;
      if (agencyPick.org && !agencyPick.team.length) { D.toast(app, GIG_ERR.pick_team, true); return; }
      sending = true; send.disabled = true;
      api.post("/proposals/send", Object.assign(body(), { request_id: newId(), confirm_no_client_info: confirmed === true })).then(function (x) {
        sending = false; send.disabled = false;
        if (x.reason === "looks_like_client_info") { if (confirm(ciNote(x, "This may include client information (" + kindsText(x.kinds) + "). Click OK only if it is not."))) doSend(true); return; }
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
      card.appendChild(h("p", { class: "small muted", text: "DELA notes useful facts about how you work from what you send on gigs, to help you better. It never keeps sensitive data. Removing a fact means DELA stops using it in its answers from now on; it does not change anything you already sent." }));
      if (!r.on) { card.appendChild(h("p", { class: "muted", text: "This is not open for your account yet." })); return; }
      if (!r.items.length) card.appendChild(h("p", { class: "muted", text: "Nothing yet." }));
      // Where each fact came from and when (step 8b Part C, R12)
      var FROM = { invitation: "an invitation you sent", proposal: "a proposal you sent", question: "a question you asked on a gig", answer: "an answer you gave on a gig", message: "a message you sent on a gig" };
      r.items.forEach(function (i) {
        card.appendChild(h("div", { class: "row insight", style: "align-items:flex-start;margin:6px 0" }, h("span", { class: "grow" }, h("span", { text: i.text }),
          h("span", { class: "small muted", style: "display:block", text: "Learned from " + (FROM[i.source] || "what you sent on a gig") + ", " + D.date(i.created_at) + "." })), h("button", { class: "ghost small", type: "button", "aria-label": "Remove: " + i.text, onclick: function () {
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
  var MEET_STATUS = { held: "Held, not confirmed", confirmed: "Time confirmed", completed: "Done", canceled: "Canceled", rescheduled: "Moved", no_show: "Did not happen" };
  var ATTEND = { unverified: "Not confirmed yet", evidence_received: "One person confirmed", verified: "Both confirmed: you met", disputed: "You disagree on whether it happened" };
  var TALK_ERR = {
    chat_off: "Messages are not open for your account yet.", meetings_off: "Booking is not open for your account yet.", blocked: "This conversation is blocked.",
    thread_closed: "This conversation closed 30 days after the gig closed.", bench_ended: "This bench conversation is closed, because the freelancer is no longer on the bench.",
    project_closed: "This engagement is complete, so its conversation is read only. Use your bench conversation to keep in touch.", bench_no_files: "A bench conversation does not share files. Share files on a gig.", too_many_messages: "You are sending messages very fast. Wait a moment.",
    edit_time_over: "Messages can be edited for 15 minutes only.", edit_needs_check: "That edit looks like contact details or payment outside Lawfecta. Send it as a new message instead, so DELA can check it.",
    time_taken: "Someone just took that time. Choose another.", same_time: "That is the meeting's current time. Choose a different time.", hold_expired: "The time was held for 10 minutes and ran out. Choose a time again.",
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
  function fullDay(iso) { return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
  function timeLabel(iso) { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
  // Meetings show the full date with the year and the viewer's own time zone by name (UX review I02)
  function zoneName(iso) {
    try { var p = new Intl.DateTimeFormat("en-US", { timeZoneName: "long" }).formatToParts(new Date(iso)).filter(function (x) { return x.type === "timeZoneName"; })[0]; return p ? p.value : "your time"; } catch (e) { return "your time"; }
  }
  function whenLabel(iso, len) {
    return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) + ", " + timeLabel(iso) + " " + zoneName(iso) + " (" + len + " minutes)";
  }

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
      el.appendChild(h("p", { class: "muted", text: t.kind === "bench" ? t.gig_title + ": your ongoing bench conversation. It shares no files and is not a contract; new work goes through a gig. Keep all work, contact and payment on Lawfecta." : "About the gig \"" + t.gig_title + "\". Keep all work, contact and payment on Lawfecta." }));
      var tools = h("div", { class: "row", style: "flex-wrap:wrap" });
      if (t.kind !== "bench") tools.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { gigs.id = t.gig_id; gigs.view = "details"; tab = me.side === "attorney" ? "projects" : "work"; talk.thread = null; draw(); } }, "Open the gig"));
      if ((me.switches || {}).meetings && r.writable && t.kind !== "bench") tools.appendChild(h("button", { class: "blue small", type: "button", onclick: function () { bookPanel(el, t.gig_id, t.freelancer_person, null); } }, "Book a meeting"));
      // The two main actions first; AI help and More (Report, Block) open on request (UX review I01)
      var aiHelp = h("details", { class: "inline-menu" }, h("summary", { class: "small", style: "cursor:pointer", text: "✦ AI help" }));
      var moreMenu = h("details", { class: "inline-menu" }, h("summary", { class: "small", style: "cursor:pointer", text: "More" }));
      if ((me.switches || {}).chat_assistant) {
        [["summarize", "✦ Summarize"], ["agreed", "✦ What we agreed"]].forEach(function (x) {
          aiHelp.appendChild(h("button", { class: "ghost small ai-btn", type: "button", onclick: function () {
            api.post("/threads/assist", { thread_id: t.id, mode: x[0] }).then(gigOk).then(function (y) {
              aiOut.hidden = false; D.clear(aiOut);
              aiOut.appendChild(h("div", { class: "row", style: "align-items:center;margin-bottom:4px" }, D.aiLabel(), h("span", { class: "grow" }), h("button", { class: "ghost small", type: "button", onclick: function () { aiOut.hidden = true; } }, "Dismiss")));
              aiOut.appendChild(h("div", { text: y.text + "\n\nDELA's summary is for reading only. It does not change the gig, a proposal or an agreement." }));
            }).catch(talkFail);
          } }, x[1]));
        });
      }
      moreMenu.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
        var why = prompt("What is wrong? The Lawfecta Team reads every report.");
        if (why === null) return;
        api.post("/threads/report", { thread_id: t.id, reason: why }).then(gigOk).then(function () { D.toast(app, "Reported to the Lawfecta Team"); }).catch(talkFail);
      } }, "Report"));
      if (!t.blocked || t.blocked_by_me) moreMenu.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
        if (!t.blocked && !confirm("Block this conversation? New messages and meetings stop, and upcoming meetings are canceled. The Lawfecta Team is told.")) return;
        api.post("/threads/block", { thread_id: t.id, block: !t.blocked }).then(gigOk).then(function () { draw(); D.toast(app, t.blocked ? "Unblocked" : "Blocked"); }).catch(talkFail);
      } }, t.blocked ? "Unblock" : "Block"));
      if ((me.switches || {}).chat_assistant) tools.appendChild(aiHelp);
      tools.appendChild(moreMenu);
      el.appendChild(tools);
      var aiOut = h("p", { class: "helpbox", hidden: true, role: "status", style: "white-space:pre-wrap" });
      el.appendChild(aiOut);
      // Messages
      var list = h("div", { class: "card", "aria-label": "Messages" });
      if (!r.messages.length) list.appendChild(h("p", { class: "muted", text: "No messages yet. Say hello and ask what you need to know." }));
      var lastMine = null;
      r.messages.forEach(function (m) {
        var box = h("div", { class: "msg" + (m.mine ? " mine" : "") });
        // Who removed it (UX review 2026-11-08). Older removed messages carry no reason and keep the short line.
        if (m.status === "removed") box.appendChild(h("p", { class: "muted small", text: m.removed_why === "team" ? "Message removed by the Lawfecta Team: it looked like a plan to work or pay outside Lawfecta." : m.removed_why === "sender" ? (m.mine ? "You removed this message." : "The sender removed this message.") : "Message removed" }));
        else {
          box.appendChild(h("p", { style: "margin:0;white-space:pre-wrap", text: m.body }));
          (m.attachments || []).forEach(function (a) {
            box.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
              D.openTab(function () { return api.get("/threads/file?thread=" + t.id + "&file=" + a.file_id).then(gigOk).then(function (x) { return x.url; }); }, talkFail);
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
      var ta = h("textarea", { rows: 3, style: "width:100%", "aria-label": "Your message", placeholder: (me.switches || {}).client_details_allowed ? "Write a message. No sensitive data, contact details or payment outside Lawfecta." : "Write a message. No client information, contact details or payment outside Lawfecta." });
      ta.value = r.draft || "";
      ta.addEventListener("blur", function () { api.post("/threads/draft", { thread_id: t.id, body: ta.value }).catch(function () {}); });
      var attach = [], attachWrap = h("div", { class: "small" });
      var pick = h("button", { class: "ghost small", type: "button" }, "Attach a file");
      pick.addEventListener("click", function () {
        (me.side === "attorney" ? api.get("/files").then(function (x) { return (x.files || []).filter(function (f) { return f.status === "ready"; }); })
          : api.get("/profile").then(function (x) { return (x.documents || []).filter(function (f) { return f.status === "ready"; }); })).then(function (files) {
          D.clear(attachWrap);
          if (!files.length) { attachWrap.appendChild(h("span", { class: "muted", text: me.side === "attorney" ? "No ready files. Upload on the Files page first." : "No ready profile documents. Add one on your Profile first." })); return; }
          files.forEach(function (f) {
            var cb = h("input", { type: "checkbox" });
            cb.addEventListener("change", function () { attach = attach.filter(function (x) { return x !== f.id; }); if (cb.checked) attach.push(f.id); });
            attachWrap.appendChild(h("label", { style: "display:flex;gap:6px;font-weight:400" }, cb, f.name));
          });
        }).catch(talkFail);
      });
      var send = h("button", { class: "blue", type: "button" }, "Send");
      var req = newId();
      var sayEl = h("p", { class: "notice bad", role: "alert", id: "thread-say" });
      sayEl.hidden = true;
      ta.addEventListener("input", function () { sayEl.hidden = true; });
      function doSend(confirmed) {
        if (!ta.value.trim()) return;
        send.disabled = true;
        api.post("/threads/send", { thread_id: t.id, body: ta.value, attachments: attach, request_id: req, confirm_no_client_info: confirmed === true }).then(function (x) {
          send.disabled = false;
          // Sensitive data is refused in words that stay under the box until the message changes (Stacey's ChatGPT check
          // 2026-11-07, step 3: a toast faded before it was read)
          if (x.reason === "sensitive_data") { sayEl.textContent = x.message || D.errorText("sensitive_data"); sayEl.hidden = false; ta.focus(); return; }
          sayEl.hidden = true;
          if (x.reason === "looks_like_client_info") { if (confirm(ciNote(x, "This may include client information (" + kindsText(x.kinds) + "). Click OK only if it is not."))) doSend(true); return; }
          gigOk(x);
          var note = x.held || x.warned ? x.note : "";
          draw();
          if (note) D.toast(app, note, x.held);
        }).catch(function (e) { send.disabled = false; talkFail(e); });
      }
      send.addEventListener("click", function () { doSend(false); });
      var draftBtn = (me.switches || {}).chat_assistant ? h("button", { class: "ghost small ai-btn", type: "button", onclick: function () {
        api.post("/threads/assist", { thread_id: t.id, mode: "draft" }).then(gigOk).then(function (y) { ta.value = y.text; D.toast(app, "DELA drafted a reply. Check it, then Send."); }).catch(talkFail);
      } }, "✦ Draft a reply") : null;
      el.appendChild(h("div", { class: "card" }, ta, sayEl, h("div", { class: "row", style: "margin-top:6px;flex-wrap:wrap" }, t.kind === "bench" ? null : pick, draftBtn, h("span", { class: "grow" }), send), attachWrap,
        t.kind === "bench" ? null : helperButton("agenda", "✦ Draft an agenda", function () { return { gig_id: t.gig_id }; }, { field: function (x) { return x.field === "compose" ? ta : null; }, toast: "Added to your message. Nothing is sent until you click Send." })));
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  // Booking: open times grouped by day in the member's own time zone; a time is held for 10 minutes while confirming
  // The viewer's own time zone in words ("Pacific Time"), from the browser
  function tzName() {
    // "Pacific Time" first; where the browser only knows an offset ("GMT+00:00"), the long name ("Coordinated Universal Time")
    var names = ["longGeneric", "long"];
    for (var i = 0; i < names.length; i++) {
      try {
        var p = new Intl.DateTimeFormat("en-US", { timeZoneName: names[i] }).formatToParts(new Date()).filter(function (x) { return x.type === "timeZoneName"; })[0];
        if (p && p.value && p.value.indexOf("GMT") !== 0) return p.value;
      } catch (e) { /* older browsers: try the next form */ }
    }
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "your time zone"; } catch (e2) { return "your time zone"; }
  }
  function bookPanel(host, gigId, freelancer, rescheduleOf) {
    var panel = h("div", { class: "card", "aria-label": "Book a meeting" }, h("h2", { text: rescheduleOf ? "Choose a new time" : "Book a meeting" }), h("p", { class: "muted small", text: "Loading open times..." }));
    host.insertBefore(panel, host.children[3] || null);
    var length = null, bookDay = null;
    function load() {
      api.get("/meetings/slots?gig=" + gigId + (freelancer ? "&freelancer=" + freelancer : "") + (length ? "&length=" + length : "") + (rescheduleOf ? "&except=" + rescheduleOf : "")).then(function (r) {
        D.clear(panel);
        panel.appendChild(h("h2", { text: rescheduleOf ? "Choose a new time" : "Book a meeting" }));
        if (!r.ok) { panel.appendChild(h("p", { class: "notice", text: talkErr(r) })); return; }
        if (r.no_availability) { panel.appendChild(h("p", { class: "muted", text: me.side === "freelancer" ? "Set your availability for meetings on your Profile first." : "This freelancer has not set their availability for meetings yet. Send them a message." })); return; }
        length = r.length;
        var sel = h("select", { "aria-label": "Meeting length" }, (r.lengths || []).map(function (n) { return h("option", { value: String(n), text: n + " minutes", selected: n === r.length }); }));
        sel.addEventListener("change", function () { length = Number(sel.value); load(); });
        panel.appendChild(h("p", { class: "small muted", text: "Times are shown in your time zone (" + tzName() + "). Meetings are free and happen in a Lawfecta meeting room. " + (me.side === "freelancer" ? "Your availability is set in " : "The freelancer's time zone: ") + r.timezone + "." }));
        panel.appendChild(field("Length", sel));
        if (!r.slots.length) panel.appendChild(h("p", { class: "muted", text: "No open times in the next " + daysWords((r.rules || {}).window_days || 21) + " for this length." }));
        // A date first, then that date's times: 8 at first, then "Show more times", with the viewer's time zone named (step 8b Part C, R05)
        var byDay = {}, days = [], chosen = null, FIRST = 8;
        r.slots.forEach(function (s) { var d = dayLabel(s); if (!byDay[d]) { byDay[d] = []; days.push(d); } byDay[d].push(s); });
        var summary = h("div", { class: "soft", style: "margin-top:10px", id: "book-summary", hidden: true });
        var timesEl = h("div", { id: "book-times" });
        if (days.length) {
          if (days.indexOf(bookDay) < 0) bookDay = days[0];
          var daySel = h("select", { "aria-label": "Date" }, days.map(function (d) { var n = byDay[d].length; return h("option", { value: d, text: d + " (" + n + (n === 1 ? " open time)" : " open times)"), selected: d === bookDay }); }));
          daySel.addEventListener("change", function () { bookDay = daySel.value; chosen = null; D.clear(summary); summary.hidden = true; drawTimes(); });
          panel.appendChild(field("Date", daySel));
          panel.appendChild(timesEl);
        }
        function pick(s, btn) {
          chosen = s;
          Array.prototype.forEach.call(panel.querySelectorAll(".slot"), function (b) { b.setAttribute("aria-pressed", "false"); b.className = "ghost slot"; });
          btn.setAttribute("aria-pressed", "true"); btn.className = "blue slot";
          D.clear(summary); summary.hidden = false;
          summary.appendChild(h("p", { style: "margin:0 0 6px", text: "Selected: " + whenLabel(s, length) + ", " + tzName() }));
          summary.appendChild(h("button", { class: "blue", type: "button", onclick: function () { hold(chosen); } }, rescheduleOf ? "Review the new time" : "Review booking"));
        }
        function slotBtn(s) { var b = h("button", { class: "ghost slot", type: "button", "aria-pressed": "false", "aria-label": timeLabel(s) + ", " + fullDay(s), style: "min-width:96px;min-height:44px" }, timeLabel(s)); b.addEventListener("click", function () { pick(s, b); }); return b; }
        function drawTimes() {
          D.clear(timesEl);
          var list = byDay[bookDay] || [];
          timesEl.appendChild(h("p", { style: "margin:10px 0 4px" }, h("b", { text: list.length ? fullDay(list[0]) : bookDay }), h("span", { class: "small muted", text: " | " + length + " minutes | times in " + tzName() })));
          var row = h("div", { class: "row", style: "flex-wrap:wrap;gap:6px" });
          list.slice(0, FIRST).forEach(function (s) { row.appendChild(slotBtn(s)); });
          if (list.length > FIRST) {
            var more = h("button", { class: "ghost small", type: "button" }, "Show more times (" + (list.length - FIRST) + ")");
            more.addEventListener("click", function () { more.remove(); list.slice(FIRST).forEach(function (s) { row.appendChild(slotBtn(s)); }); });
            row.appendChild(more);
          }
          timesEl.appendChild(row);
        }
        if (days.length) drawTimes();
        panel.appendChild(summary);
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
      h("span", { class: "badge " + (m.status === "confirmed" || m.status === "completed" ? "ready" : m.status === "held" ? "held" : m.status === "canceled" || m.status === "no_show" ? "off" : ""), text: MEET_STATUS[m.status] || m.status })));
    c.appendChild(h("p", { text: whenLabel(m.start_at, m.length_min) + (m.version > 1 ? " | new time" : "") }));
    var started = new Date(m.start_at).getTime() <= Date.now();
    if (m.status === "confirmed" && !started) {
      if (m.join_url) c.appendChild(h("a", { class: "btn blue", href: m.join_url, target: "_blank", rel: "noopener" }, "Join the meeting"));
      else if (m.room_status !== "ready") c.appendChild(h("p", { class: "small muted", text: "Meeting room not connected yet. The link appears here once Lawfecta's meeting service is connected, and you both get it before the meeting." }));
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
          var why = prompt("Why are you canceling? Both of you are told. Less than " + plural((r.rules || {}).late_cancel_hours || 2, "hour") + " before counts as a late cancel.");
          if (why === null) return;
          api.post("/meetings/cancel", { id: m.id, reason: why }).then(gigOk).then(function (x) { draw(); D.toast(app, x.late ? "Canceled (late)" : "Canceled"); }).catch(talkFail);
        } }, "Cancel")));
    }
    if (m.status === "confirmed" && started && m.join_url) c.appendChild(h("a", { class: "btn blue", href: m.join_url, target: "_blank", rel: "noopener" }, "Join the meeting"));
    if ((m.status === "confirmed" || m.status === "completed" || m.status === "no_show") && started) {
      c.appendChild(h("p", { class: "small", text: "Attendance: " + ATTEND[m.attendance] + "." }));
      if (!m.my_followup) {
        var met = h("select", { "aria-label": "Did the meeting happen?" }, h("option", { value: "", text: "Choose what happened", selected: true }), h("option", { value: "yes", text: "We met" }), h("option", { value: "no", text: "They did not come" }));
        var sum = h("textarea", { rows: 3, style: "width:100%", "aria-label": "Short summary", placeholder: "What you agreed, next steps, any change to the work or price. No client information." });
        c.appendChild(h("div", { class: "helpbox" }, h("p", { style: "margin:0 0 6px", text: "Did the meeting happen? Tell DELA within " + confirmHours + " hours. DELA suggests next steps from both summaries." }), met, sum,
          h("button", { class: "blue small", type: "button", onclick: function () {
            // Step 8b Part C: nothing is chosen for the member; they pick what happened first
            if (!met.value) { D.toast(app, "Choose what happened first.", true); met.focus(); return; }
            api.post("/meetings/followup", { id: m.id, met: met.value === "yes", summary: sum.value }).then(function (x) {
              if (x.reason === "looks_like_client_info") { D.toast(app, ciNote(x, "This may include client information. Use placeholders instead."), true); return; }
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
      card.appendChild(h("p", { class: "small muted", text: "Attorneys book meetings with you only inside a gig, from these times, with " + plural((r.rules || {}).min_notice_hours || 12, "hour") + " of notice and " + plural((r.rules || {}).buffer_minutes || 15, "minute") + " between meetings. Meetings are free. Times are in your time zone." }));
      var guess = ""; try { guess = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { guess = ""; }
      var tzList = TZS.indexOf(a.timezone) < 0 ? TZS.concat([a.timezone]) : TZS;
      if (guess && tzList.indexOf(guess) < 0) tzList = tzList.concat([guess]);
      var tz = h("select", { "aria-label": "Time zone for meetings" }, tzList.map(function (z) { return h("option", { value: z, text: z.split("/").pop().split("_").join(" ") + " (" + z + ")", selected: z === (r.saved ? a.timezone : guess || a.timezone) }); }));
      card.appendChild(field("Time zone", tz));
      // UX review 2026-11-08: the profile has its own time zone ("How you work"). When the two differ, say so here.
      var tzNote = h("p", { class: "small notice", id: "tz-differs", hidden: true });
      card.appendChild(tzNote);
      var profTz = null, tzCheck = function () {
        // The profile names a US zone; meetings use a city's zone. They agree when the city is in the named zone.
        var ZONE_OF = { "America/New_York": "Eastern", "America/Detroit": "Eastern", "America/Chicago": "Central", "America/Denver": "Mountain", "America/Phoenix": "Mountain", "America/Boise": "Mountain", "America/Los_Angeles": "Pacific", "America/Anchorage": "Alaska", "Pacific/Honolulu": "Hawaii" };
        var differs = !!profTz && profTz !== "Outside the US" && !!ZONE_OF[tz.value] && ZONE_OF[tz.value] !== profTz;
        tzNote.hidden = !differs;
        if (differs) { D.clear(tzNote); tzNote.appendChild(h("span", { text: "Your profile says your time zone is " + profTz + ", under \"How you work\". Meeting times use the one chosen here (" + tz.value + "). " })); tzNote.appendChild(h("button", { class: "linkish", type: "button", onclick: function () { goProfile("sec-profile"); } }, "Open my profile")); }
      };
      tz.addEventListener("change", tzCheck);
      if ((me.switches || {}).profiles) api.get("/profile").then(function (pr) { profTz = ((pr || {}).body || {}).timezone || null; tzCheck(); }).catch(function () {});
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
      card.appendChild(field("Days off", off, "Dates as YYYY-MM-DD, separated by commas. Or pick a date below and click Add."));
      var pick = h("input", { type: "date", "aria-label": "Pick a day off" });
      card.appendChild(h("div", { class: "row", style: "margin-top:6px" }, pick, h("button", { class: "ghost small", type: "button", onclick: function () {
        if (!pick.value) { pick.focus(); return; }
        var list = off.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
        if (list.indexOf(pick.value) < 0) list.push(pick.value);
        off.value = list.sort().join(", "); pick.value = "";
      } }, "Add day off")));
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
      cb.addEventListener("change", function () { api.post("/prefs", { read_receipts: cb.checked }).then(gigOk).then(function () { D.toast(app, "Saved"); }).catch(function (e) { cb.checked = !cb.checked; talkFail(e); }); });
      card.appendChild(h("label", { style: "display:flex;gap:8px;font-weight:400" }, cb, h("span", { text: "Show \"Seen\" when I read a message, and show me when others read mine. Turning it off turns it off both ways." })));
    }).catch(function () {});
    return card;
  }
  // Emails (2026-11-13): reminder and alert emails on or off, the same choice as the unsubscribe link in those emails.
  // Always on the Settings page, whatever else is switched on. Emails about the account, payments and signed work are
  // not part of this choice; they always arrive.
  var emailsOff = null;
  function emailsCard() {
    var card = h("div", { class: "card", id: "set-emails" }, h("h2", { text: "Emails" }), h("p", { class: "small muted", text: "Loading..." }));
    function paint(r) {
      D.clear(card);
      emailsOff = r.optional_emails === false;
      card.appendChild(h("h2", { text: "Emails" }));
      var em = h("input", { type: "checkbox", checked: !emailsOff });
      var state = h("p", { class: "small", role: "status", style: "margin:8px 0 0" });
      var say = function (x) {
        state.textContent = x.optional_emails === false
          ? "Reminder and alert emails are off" + (x.emails_off_since ? " since " + D.date(x.emails_off_since) : "") + (x.emails_off_from === "email_link" ? ", turned off from the link in an email." : ".")
          : "Reminder and alert emails are on.";
      };
      em.addEventListener("change", function () {
        var want = em.checked;
        em.disabled = true;
        api.post("/prefs", { optional_emails: want }).then(function (x) {
          em.disabled = false;
          if (!x || x.ok === false) throw x || {};
          emailsOff = x.optional_emails === false; say(x); D.toast(app, "Saved");
          var note = app.querySelector("#alerts-email-note"); if (note) note.hidden = !emailsOff;
        }).catch(function () { em.disabled = false; em.checked = !want; D.toast(app, "Not saved. Try again.", true); });
      });
      card.appendChild(h("label", { style: "display:flex;gap:8px;font-weight:400" }, em, h("span", { text: "Email me reminders and alerts, such as new gig alerts and next-step reminders." })));
      card.appendChild(h("p", { class: "small muted", style: "margin:6px 0 0", text: "Emails about your account, payments and signed work always arrive. They go to your sign-in email, shown under \"Account and security\" at the top of this page." }));
      card.appendChild(state);
      say(r);
    }
    api.get("/prefs").then(paint).catch(function () { D.clear(card); card.appendChild(h("h2", { text: "Emails" })); card.appendChild(h("p", { class: "notice bad small", text: "This setting could not load. Reload the page to try again." })); });
    return card;
  }


  // ---------- Step 6: the agreement, signing, paying, delivery, review, payouts, disputes ----------
  var eng = { gig: null, editing: false, paid: false };
  try { if (new URLSearchParams(location.search).get("paid") === "1") eng.paid = true; var gv = new URLSearchParams(location.search).get("view"); if (["details", "matches", "questions", "proposals", "files", "agreement"].indexOf(gv) >= 0) gigs.view = gv; } catch (e) { /* no deep link */ }
  var AG_STATUS = { draft: "Draft", sent: "Draft", signing: "Waiting for signatures", signed: "Signed: waiting for the first payment", active: "Active", completed: "Complete", canceled: "Canceled", disputed: "In dispute", paused: "Paused by the Lawfecta Team" };
  var MS_STATUS = { pending: "Not paid yet", awaiting_funding: "Waiting for payment", funded: "Paid: ready to start", in_progress: "In progress", submitted: "Submitted", changes_requested: "Changes requested",
    accepted: "Accepted", refunded: "Refunded", canceled: "Canceled", disputed: "In dispute" };
  var SUB_STATUS = { checking: "DELA is checking it", failed: "Did not pass DELA's check", human_review: "With a Lawfecta reviewer", with_attorney: "With the attorney for review", accepted: "Accepted", changes_requested: "Changes requested" };
  var ENG_ERR = {
    engagements_off: "Agreements are not open for your account yet.", not_current_version: "There is a newer version of the agreement. Reload it and read the new version before signing.",
    sign_needs_name_and_consent: "Type your full name and tick the box to sign.", sign_time_over: "The time to sign this agreement is over.",
    firm_details_missing: "Before you sign, add your firm's signatory, billing address and notice email in Profile, under \"Firm details\".",
    milestone_count: "Use between 1 and the most milestones allowed.", milestone_too_small: "Each milestone needs a title and at least the smallest amount.",
    total_too_small: "The total is below the smallest engagement.", too_long: "A due date is further out than DELA allows.", paid_milestone_fixed: "A milestone that is already paid cannot change its amount.",
    agreement_closed: "This agreement is closed.", payments_not_set_up: "Payments are not set up on this site yet, so nothing can be charged here. The Lawfecta Team is adding Stripe.", funding_off: "Milestone payments are not open for your account yet.",
    not_signed: "Both of you sign first.", previous_not_accepted: "The previous milestone needs to be accepted first.", nothing_to_pay: "Nothing is due right now.",
    in_dispute: "A dispute is open on this engagement, so this waits until it is settled.", payment_failed: "The payment did not go through.", payout_email_missing: "Your account has no email address yet, and Stripe needs one to pay you. Sign out, sign in again on the Lawfecta site, and try once more.", payout_setup_failed: "Stripe could not start payout setup right now. Nothing is wrong with your account, and the Lawfecta Team has been told. Please try again tomorrow.", on_hold: "Some actions are paused on your account. Contact the Lawfecta Team.",
    not_funded: "This milestone is not paid yet. Work starts when the attorney's payment is confirmed.", statement_needed: "Write a completion statement: what you did and anything still open.",
    already_submitted: "This milestone is already submitted.", not_now: "That is not possible right now.", file_not_usable: "One of the files is not ready yet. Wait for its check to finish.",
    say_what_to_change: "Say what needs to change.", revisions_used_up: "The included rounds of changes are used up. Propose a change order on the agreement instead.",
    say_why: "Please say why.", under_review_open_dispute: "A milestone is under review, so it cannot be canceled. Either of you can open a dispute instead.",
    keep_on_lawfecta: "Keep the work and the payment on Lawfecta. Remove the contact details or the plan to pay outside it.", export_not_available: "The export opens after the first accepted milestone.",
    pick_category: "Choose what went wrong.", pick_wants: "Choose what you are asking for.", pick_milestone: "Choose the milestone.", milestone_not_paid: "A dispute is about a paid milestone. This one is not paid, or it is already finished.",
    split_amount: "The amount to the freelancer must be from zero up to the milestone amount.", split_must_equal: "The two parts must add up to the milestone amount.", dispute_closed: "This dispute is closed.",
    bad_link: "Paste a full secure link that starts with https://.", name_the_link: "Say what the link is.", too_many_links: "You added the most links allowed (20).", own_offer: "You cannot accept your own offer.",
    offer_not_open: "That offer is no longer open. Look at the latest offer.", chargeback_open: "A bank review of a payment on this engagement is open, so the dispute waits until it ends.",
    dispute_center_off: "The new dispute tools are not open for your account yet.", helpers_off: "DELA's AI help is not open for your account yet.", ai_unclear: "DELA could not give a clear answer. Try again.",
    freelancers_only: "Only the freelancer can do that.", changed_elsewhere: "The other person changed the agreement while you were working. Reload it, then make your change again.",
  };
  function engErr(r) {
    if (!r) return "That did not work.";
    if (r.reason === "milestone_too_small" && r.min_cents) return "Each milestone needs a title and at least " + D.money(r.min_cents) + ".";
    if (r.reason === "total_too_small" && r.min_cents) return "The total must be at least " + D.money(r.min_cents) + ".";
    if (r.reason === "milestone_count" && r.max) return "Use between 1 and " + r.max + " milestones.";
    if (r.reason === "too_long" && r.max_days) return "Every due date must be within " + r.max_days + " days.";
    if (r.reason === "revisions_used_up" && r.included) return "The " + r.included + " included rounds of changes are used up. Propose a change order on the agreement instead.";
    if (r.reason === "payment_failed" && r.detail) return "The payment did not go through: " + r.detail;
    if (r.reason === "looks_like_client_info") return ciNote(r, failText(r));
    if (r.reason === "blocked_data" && r.message) return r.message;
    return ENG_ERR[r.reason] || gigErr(r);
  }
  function engOk(r) { if (!r || r.ok === false) throw r || {}; return r; }
  // Shown only while Stripe runs on a test key (the api says so); never with real payments
  var TEST_CARD_NOTE = " Stripe is in test mode here: use Stripe's test card 4000 0000 0000 0077 (any future date, any 3 digits).";
  function engFail(e) { D.toast(app, e && e.reason ? engErr(e) : D.errorText(e && e.message ? e.message : String(e)), true); }
  function engReload(msg) { draw(); if (msg) setTimeout(function () { D.toast(app, msg); }, 300); }

  // The engagement for one gig, on the attorney's gig page and the freelancer's Work page
  function engagementPanel(host, gigId) {
    host.appendChild(h("p", { class: "muted", text: "Loading the agreement..." }));
    api.get("/agreements/get?gig=" + gigId).then(function (r) {
      D.clear(host);
      if (!r.ok) { host.appendChild(h("p", { class: "notice", text: r.reason === "not_found" ? "There is no agreement for this gig yet. It starts when the attorney chooses a proposal." : engErr(r) })); return; }
      drawEngagement(host, r);
    }).catch(function (e) { D.clear(host); host.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  // ---------- Step 7c: monthly recurring engagements (docs/briefs/step-7c-recurring-repeat-hiring.md) ----------
  var MONTHLY_ERR = {
    monthly_tasks_needed: "List at least one task with how often and how many are included each month.", no_unlimited: "\"Unlimited\" is not allowed. Give each task an included number.",
    monthly_task_needs_name: "Name each task.", monthly_task_needs_frequency: "Choose how often each task happens.", monthly_task_needs_quantity: "Give each task an included number each month (1 or more).",
    recurring_consent_needed: "Tick the box that lets Lawfecta charge your payment method each month. Without it, a monthly engagement cannot start.",
    use_monthly_cancel: "A monthly engagement is canceled from its Monthly engagement card: \"Review cancellation\" or \"Ask to end now\".", use_monthly_terms: "A monthly agreement changes through its Monthly terms (before signing) or \"Request a change\" (after).", use_change_request: "Both of you signed. Use \"Request a change\" for next month.",
    other_side_approves: "The other person approves this.", nothing_to_undo: "There is nothing to undo.", too_late: "The cancellation date has passed.",
    monthly_delivery_use_dispute: "With One monthly delivery, agree on an amount with the other person, or open a dispute below. DELA never makes up a daily rate.",
    not_started_use_cancel: "Month 1 is not paid yet. Cancel the agreement instead.", not_completed: "Only a completed engagement can be made monthly.", recurring_off: "Monthly engagements are not open for your account yet.",
    test_site_only: "This only works on the test site.", not_running: "This monthly engagement is not running.", canceled: "This month was canceled with the engagement.",
  };
  function monthlyErr(e) { return e && MONTHLY_ERR[e.reason] ? MONTHLY_ERR[e.reason] : engErr(e); }
  var FREQ = [["daily", "Daily"], ["weekly", "Weekly"], ["every_two_weeks", "Every two weeks"], ["monthly", "Monthly"]];
  function freqWord(f) { return (FREQ.filter(function (x) { return x[0] === f; })[0] || [f, f])[1].toLowerCase(); }
  function tasksList(tasks) {
    return h("ul", { style: "margin:4px 0" }, (tasks || []).map(function (x) {
      return h("li", { text: x.task + ": " + freqWord(x.frequency) + ", up to " + x.quantity + " included each month" + (x.turnaround ? ", each within " + x.turnaround : "") + (x.exclusions ? ". Not included: " + x.exclusions : "") });
    }));
  }
  // The tasks editor (rows of task, how often, included each month, turnaround, not included) and the unit choice
  function tasksEditor(tasks, mode) {
    var rows = h("div"), list = [];
    function addRow(x) {
      x = x || {};
      var t = h("input", { "aria-label": "Task", style: "width:100%", value: x.task || "", placeholder: "For example: intake calls and conflict checks" });
      var fq = h("select", { "aria-label": "How often" }, FREQ.map(function (f) { return h("option", { value: f[0], text: f[1], selected: (x.frequency || "weekly") === f[0] }); }));
      var q = h("input", { type: "number", min: "1", step: "1", "aria-label": "Included each month", value: x.quantity ? String(x.quantity) : "" });
      var ta = h("input", { "aria-label": "Turnaround", value: x.turnaround || "", placeholder: "For example: 1 business day" });
      var ex = h("input", { "aria-label": "Not included", style: "width:100%", value: x.exclusions || "", placeholder: "Optional" });
      var row = h("div", { class: "soft", style: "margin:6px 0" }, field("Task", t), h("div", { class: "row", style: "flex-wrap:wrap" }, field("How often", fq), field("Included each month", q), field("Turnaround", ta)), field("Not included", ex));
      var item = { row: row, boxes: { task: t, quantity: q, turnaround: ta, exclusions: ex }, get: function () { return { task: t.value, frequency: fq.value, quantity: Number(q.value), turnaround: ta.value, exclusions: ex.value }; } };
      row.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { row.remove(); list.splice(list.indexOf(item), 1); } }, "Remove this task"));
      list.push(item); rows.appendChild(row);
    }
    (tasks && tasks.length ? tasks : [{}]).forEach(addRow);
    var weekly = h("input", { type: "radio", name: "unit_mode_" + Math.random().toString(36).slice(2), value: "weekly" });
    var monthly = h("input", { type: "radio", name: weekly.name, value: "monthly" });
    (mode === "monthly" ? monthly : weekly).checked = true;
    var el = h("div", null, h("p", { class: "small muted", text: "List each task, how often it happens and how many are included each month. Nothing is unlimited: extra work is a separate gig or a change for next month." }), rows,
      h("button", { class: "ghost small", type: "button", onclick: function () { addRow(); } }, "Add a task"),
      h("div", { style: "margin-top:8px" }, h("b", { text: "How the freelancer is paid each month" }),
        h("label", { style: "display:flex;gap:8px;font-weight:400" }, weekly, h("span", { text: "Weekly units: the month is split into weekly units, each checked, accepted and paid like a milestone" })),
        h("label", { style: "display:flex;gap:8px;font-weight:400" }, monthly, h("span", { text: "One monthly delivery: checked and accepted at month end" }))));
    return { el: el, box: function (n, k) { var it = list[n - 1]; return it ? it.boxes[k] || null : null; }, value: function () { return { tasks: list.map(function (i) { return i.get(); }), unit_mode: monthly.checked ? "monthly" : "weekly" }; } };
  }
  function monthlyTermsCard(r) {
    var a = r.agreement, mv = r.monthly, card = h("div", { class: "card", id: "monthly-terms" }, h("h2", { text: "Monthly terms" }), cardStatus("monthly"));
    var t = mv.terms;
    card.appendChild(h("p", { text: "Monthly price: " + D.money(t.price_cents) + ". It renews every month until either of you cancels." }));
    var ed = tasksEditor(t.tasks, t.unit_mode);
    card.appendChild(ed.el);
    var save = h("button", { class: "blue small", type: "button" }, "Save the monthly terms");
    save.addEventListener("click", function () {
      save.disabled = true;
      api.post("/monthly/terms", Object.assign({ id: a.id, base: a.version }, ed.value())).then(engOk).then(function (x) {
        cardSay("monthly", "Saved as version " + x.version + ". Both of you sign the new version."); engReload();
      }).catch(function (e) { save.disabled = false; cardSay("monthly", monthlyErr(e), true); });
    });
    card.appendChild(helperButton("monthly_scope", "✦ Check monthly scope", function () { return { agreement_id: a.id, tasks: ed.value().tasks }; }, { field: function (x) { return x.row ? ed.box(x.row, x.field) : null; } }));
    card.appendChild(h("div", { class: "row", style: "margin-top:8px" }, save));
    return card;
  }
  function monthlyCard(r) {
    var a = r.agreement, mv = r.monthly, t = mv.terms, att = r.role === "attorney", cur = mv.current, nx = mv.next || {};
    var card = h("div", { class: "card", id: "monthly-card" }, h("h2", { text: "Monthly engagement" }), cardStatus("monthly"));
    function act(path, body, msg) { return api.post(path, Object.assign({ id: a.id }, body || {})).then(engOk).then(function (x) { cardSay("monthly", typeof msg === "function" ? msg(x) : msg); engReload(); return x; }).catch(function (e) { cardSay("monthly", monthlyErr(e), true); }); }
    if (t.status === "ended") card.appendChild(h("p", { class: "notice", text: "This monthly engagement ended" + (t.ended_reason === "canceled" ? ", as canceled" : t.ended_reason === "unpaid" ? " because a month stayed unpaid" : t.ended_reason === "ended_early" ? " early by agreement" : "") + "." }));
    if (mv.renewals_stopped && t.status !== "ended") card.appendChild(h("p", { class: "notice", text: "The Lawfecta Team paused all renewal charges for a moment. Nothing is charged until they start again." }));
    // What the attorney pays each month and when (UX review M01)
    if (att && (r.money_summary || []).length) card.appendChild(h("p", { style: "font-weight:700", text: r.money_summary[0] + (cur ? "" : " Your billing day is set when you pay month 1.") }));
    if (cur) card.appendChild(h("div", { class: "kv" },
      h("div", null, "This month", h("b", { text: "Month " + cur.n + ": " + D.date(cur.starts_on) + " to " + D.date(cur.ends_on) })),
      h("div", null, "Monthly price", h("b", { text: D.money(t.price_cents) })),
      h("div", null, "Units accepted", h("b", { text: cur.accepted + " of " + cur.units })),
      h("div", null, D.term("Next billing", "billing_day"), h("b", { text: t.cancel_effective ? "None: it ends on " + D.date(t.cancel_effective) : nx.bill_on ? D.date(nx.bill_on) + (nx.price_cents ? " (" + D.money(nx.price_cents) + " plus the " + D.money(nx.fee_cents) + " platform fee)" : "") : "-" }))));
    card.appendChild(h("h3", { text: "Included each month" }));
    card.appendChild(tasksList(t.tasks));
    card.appendChild(h("p", { class: "small muted", text: (t.unit_mode === "monthly" ? "Paid as one monthly delivery, checked and accepted at month end." : "Paid in weekly units, each checked, accepted and paid like a milestone. The units are how the month is checked and paid, not a weekly limit.") +
      " The limits are for each month: unused work does not carry over, and a month with five weeks has the same limits and price." }));
    if (nx.status === "draft") card.appendChild(h("p", { class: "small", text: "Month " + nx.n + "'s tasks are drafted. They open once it is paid on " + D.date(nx.bill_on) + "." }));
    if (nx.status === "failed" && t.status !== "ended") {
      card.appendChild(h("p", { class: "notice bad", text: "The payment for month " + nx.n + " did not go through, so new work is paused." + (att ? "" : " Do not start month " + nx.n + "'s tasks.") +
        (nx.next_retry_on ? " DELA tries again on " + D.date(nx.next_retry_on) + "." : "") + " It ends on " + D.date(nx.ends_if_unpaid) + " if it stays unpaid." }));
      if (att) card.appendChild(h("div", { class: "row" }, h("button", { class: "blue small", type: "button", onclick: function () {
        api.post("/engagements/pay", { id: a.id, use_checkout: true }).then(engOk).then(function (x) { if (x.url) location.href = x.url; else { cardSay("monthly", "Paid. Month " + nx.n + " is open."); engReload(); } }).catch(function (e) { cardSay("monthly", monthlyErr(e), true); });
      } }, "Pay now")));
    }
    if (t.status === "ended") return card;
    // Cancelling, and undoing it with the other side's approval. The rule stays on the page (UX review M02).
    card.appendChild(h("p", { class: "small", style: "margin-top:10px", text: "Cancellation takes effect at the end of the paid month. Ending sooner needs both of you to agree." }));
    var cancelRow = h("div", { class: "row", style: "flex-wrap:wrap;margin-top:8px" });
    if (!t.cancel_effective) {
      var cb = h("button", { class: "ghost small", type: "button" }, "Review cancellation");
      cb.addEventListener("click", function () {
        D.clear(cancelRow);
        cancelRow.appendChild(h("span", { class: "small grow", text: "Cancel at the end of this paid month" + (cur ? " (" + D.date(cur.ends_on) + ")" : "") + "? Nothing more is charged." }));
        cancelRow.appendChild(h("button", { class: "danger small", type: "button", onclick: function () { act("/monthly/cancel", {}, function (x) { return "Canceled. It ends on " + D.date(x.effective) + ". Nothing more is charged."; }); } }, "Yes, cancel at month end"));
        cancelRow.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { engReload(); } }, "Keep it"));
      });
      cancelRow.appendChild(cb);
    } else {
      cancelRow.appendChild(h("span", { class: "small grow", text: "Canceled: it ends on " + D.date(t.cancel_effective) + "." }));
      if (!t.undo_requested) cancelRow.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { act("/monthly/undo", { approve: true }, "Asked the other person to keep the engagement going."); } }, "Ask to keep it going"));
      else if (t.undo_by_me) cancelRow.appendChild(h("span", { class: "small muted", text: "Waiting for the other person to approve keeping it." }));
      else {
        cancelRow.appendChild(h("button", { class: "blue small", type: "button", onclick: function () { act("/monthly/undo", { approve: true }, "The engagement continues."); } }, "Approve keeping it"));
        cancelRow.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { act("/monthly/undo", { approve: false }, "The cancellation stays."); } }, "Keep the cancellation"));
      }
    }
    card.appendChild(cancelRow);
    // Ending early by agreement (weekly units refund the unstarted rest)
    var endRow = h("div", { class: "row", style: "flex-wrap:wrap;margin-top:6px" });
    if (t.end_now_requested && !t.end_now_by_me) {
      endRow.appendChild(h("span", { class: "small grow", text: "The other person asks to end now. Accepted units stay paid; the unstarted rest of this month is refunded to the client." }));
      endRow.appendChild(h("button", { class: "danger small", type: "button", onclick: function () { act("/monthly/end-now", { approve: true }, "Ended. Unstarted units were refunded."); } }, "Agree to end now"));
      endRow.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { act("/monthly/end-now", { approve: false }, "It keeps running."); } }, "Keep it running"));
    } else if (t.end_now_requested) endRow.appendChild(h("span", { class: "small muted", text: "Waiting for the other person to agree to end now." }));
    else endRow.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { act("/monthly/end-now", { approve: true }, "Asked the other person to end now."); } }, "Ask to end now"));
    card.appendChild(endRow);
    // Changes for next month
    var open = (mv.changes || []).filter(function (c) { return c.status === "open"; })[0];
    if (open) {
      var box = h("div", { class: "soft", style: "margin-top:8px" }, h("b", { text: open.mine ? "Your change, waiting for the other person" : "A change to approve" }),
        changeCompare(mv.terms, open, mv), open.note ? h("p", { class: "small", text: "Note: " + open.note }) : null,
        noteConflict(open.note, mv.terms, open) ? h("p", { class: "notice bad", role: "alert", id: "change-note-conflict", text: noteConflict(open.note, mv.terms, open) }) : null);
      if (!open.mine) box.appendChild(h("div", { class: "row" },
        h("button", { class: "blue small", type: "button", onclick: function () { api.post("/monthly/change/decide", { id: open.id, approve: true }).then(engOk).then(function () { cardSay("monthly", "Approved. It starts next month if approved at least " + plural(mv.change_deadline_days || 1, "day") + " before billing."); engReload(); }).catch(function (e) { cardSay("monthly", monthlyErr(e), true); }); } }, "Approve the change"),
        h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/monthly/change/decide", { id: open.id, approve: false }).then(engOk).then(function () { cardSay("monthly", "Declined. The current terms continue."); engReload(); }).catch(function (e) { cardSay("monthly", monthlyErr(e), true); }); } }, "Decline")));
      card.appendChild(box);
    }
    // UX review 2026-11-08: a change both people approved stays in view until the month it starts with
    var coming = (mv.changes || []).filter(function (c) { return c.status === "approved"; })[0];
    if (coming) card.appendChild(h("div", { class: "soft", id: "change-approved", style: "margin-top:8px" }, h("b", { text: "Approved change, not started yet" }), changeCompare(mv.terms, coming, mv, true)));
    var chHost = h("div");
    card.appendChild(h("div", { class: "row", style: "margin-top:8px" }, h("button", { class: "ghost small", type: "button", onclick: function () {
      D.clear(chHost);
      var price = h("input", { type: "number", min: "0", step: "1", "aria-label": "New monthly price ($)", value: String(Math.round(t.price_cents / 100)) });
      var note = h("input", { "aria-label": "Why (optional)", style: "width:100%" });
      var ed = tasksEditor(t.tasks, t.unit_mode);
      chHost.appendChild(h("div", { class: "soft" }, field("New monthly price ($)", price), ed.el, field("Why (optional)", note),
        h("button", { class: "blue small", type: "button", onclick: function () { act("/monthly/change", Object.assign({ price: price.value, note: note.value }, ed.value()), "Sent. If the other person approves at least " + plural(mv.change_deadline_days || 1, "day") + " before billing, it starts next month."); } }, "Send the change")));
    } }, "Request a change")));
    card.appendChild(chHost);
    // Test site only: the Lawfecta owner rolls a month over now (never on Live)
    if (mv.staff_owner && me.environment !== "live") card.appendChild(h("div", { class: "row", style: "margin-top:8px" }, h("button", { class: "ghost small", type: "button", onclick: function () {
      api.post("/admin/monthly/run-now", { agreement_id: a.id }).then(function (x) { var d = x.data || x; if (d.ok === false) throw d; cardSay("monthly", "Renewal run: " + ((d.run || {}).succeeded ? "the month was charged" : (d.run || {}).failed ? "the charge failed" : "the next month was drafted") + "."); engReload(); })
        .catch(function (e) { cardSay("monthly", monthlyErr(e), true); });
    } }, "Run the renewal now (test site)")));
    return card;
  }

  function drawEngagement(host, r) {
    var a = r.agreement, cur = r.current || {}, b = cur.body || {}, att = r.role === "attorney";
    var mySigned = (r.signatures || []).some(function (s) { return s.version === a.version && s.role === r.role; });
    var theirSigned = (r.signatures || []).some(function (s) { return s.version === a.version && s.role !== r.role; });
    host.appendChild(h("div", { class: "row" }, h("h2", { class: "grow", style: "flex:1 1 auto", text: "Agreement, version " + a.version }), h("span", { class: "badge " + agTone({ status: a.status }), text: AG_STATUS[a.status] || a.status })));
    if (eng.paid && att) { eng.paid = false;
      // Already confirmed when the newest payment is paid (fee test report 2026-11-11): say so, do not say "confirming"
      var newest = (r.payments || []).slice().sort(function (x, y) { return String(y.created_at).localeCompare(String(x.created_at)); })[0];
      host.appendChild(h("p", { class: "notice ok", text: newest && newest.status === "succeeded" ? "Thank you. Your payment is confirmed." : "Thank you. Stripe is confirming the payment. This page shows it as paid within a minute (a bank payment can take about 4 business days)." })); }
    if (a.status === "signing" && a.sign_by) host.appendChild(h("p", { class: "small muted", text: "Both of you sign by " + D.dateTime(a.sign_by) + ". If it is not signed by then, it closes." }));
    if (a.status === "paused") host.appendChild(h("p", { class: "notice bad", text: "A payment on this engagement is under review with the bank, so it is paused. You can still read everything and send messages. The Lawfecta Team will be in touch." }));
    if (a.status === "canceled") host.appendChild(h("p", { class: "notice", text: "This engagement was canceled" + (a.cancel_reason ? ": " + (a.cancel_reason === "not_signed_in_time" ? "it was not signed in time" : a.cancel_reason) : "") + "." }));
    host.appendChild(nextStep(r, mySigned, theirSigned));
    if (r.monthly && (a.status === "draft" || a.status === "signing" || a.status === "sent")) host.appendChild(monthlyTermsCard(r));
    if (r.monthly && !(a.status === "draft" || a.status === "signing" || a.status === "sent")) host.appendChild(monthlyCard(r));
    host.appendChild(agreementCard(r, b));
    // Who is on the job comes right under the agreement and its subcontracting terms (UX review E02)
    var sc = subsCard(r, b); if (sc) host.appendChild(sc);
    host.appendChild(peopleCard(r));
    if (!r.monthly && (a.status === "signing" || a.status === "signed" || a.status === "active")) host.appendChild(changesCard(r, b));
    var cpc = checkpointsCard(r); if (cpc) host.appendChild(cpc);
    if ((r.milestones || []).length) host.appendChild(milestonesCard(r));
    if (att && (r.payments || []).length) host.appendChild(paymentsCard(r));
    if (!att && r.payout_account !== undefined) host.appendChild(payoutCard(r.payout_account, true));
    if (!att) host.appendChild(assignmentsCard(r));
    host.appendChild(confCard(r));
    host.appendChild(disputeCard(r));
    if (a.status === "completed") { host.appendChild(closeoutCard(r)); reviewPanel(host, r); }
    // Make this monthly (Step 7c answer 1): a completed one-off engagement, the same freelancer, both sign first
    if (a.status === "completed" && !r.monthly && att && (me.switches || {}).recurring_engagements) host.appendChild(h("div", { class: "card", id: "make-monthly" }, h("h2", { text: "Keep this going every month" }), cardStatus("makemonthly"),
      h("p", { class: "small muted", text: "Draft a monthly agreement with the same freelancer, starting from this finished work. You both sign before anything is charged." }),
      h("button", { class: "blue small", type: "button", onclick: function () {
        api.post("/engagements/make-monthly", { id: a.id }).then(engOk).then(function (x) { gigs.id = x.gig_id; gigs.view = "agreement"; draw(); setTimeout(function () { cardSay("monthly", "Drafted. Fill in the monthly terms, then both of you sign."); }, 300); })
          .catch(function (e) { cardSay("makemonthly", monthlyErr(e), true); });
      } }, "Make this monthly")));
    if (r.export) host.appendChild(h("div", { class: "card" }, h("h2", { text: "Engagement document (Word)" }), h("p", { class: "small muted", text: "A Word copy of the document for this engagement, now that a milestone is accepted." }),
      h("button", { class: "ghost small", type: "button", onclick: function () {
        api.get("/engagements/export?id=" + a.id).then(engOk).then(function (x) { saveB64(x.name, x.type, x.b64); }).catch(engFail);
      } }, "Download the document (Word)")));
  }

  // ---------- Confidential materials (step 6c, with the security rules of step 6d) ----------
  // Client files, confidential messages and secure links between the hiring attorney and the hired freelancer. Never
  // read by the AI. Opens after both sign and the first milestone is paid; asks for an emailed code every 12 hours.
  var CONF_ERR = {
    confidential_off: "Confidential materials: coming soon.", confidential_not_open: "Confidential materials open after you both sign and the first milestone is paid.",
    confidential_ended: "Your access ended when the job ended.", confidential_paused: "Confidential materials are paused by the Lawfecta Team for now.",
    login_needed: "Enter the code from your email first.", ack_needed: "Agree to keep the materials confidential first.", wrong_code: "That code is not right. Check the email and try again.",
    code_expired: "That code has expired. Send a new one.", too_many_tries: "Too many tries. Send a new code.", too_many_codes: "Too many codes in an hour. Try again later.",
    no_sensitive_needed: "Tick the box to confirm the file has no medical records, ID documents, account numbers, logins or biometric data.",
    type_not_allowed: "That file type is not allowed here. Use PDF, Word, Excel, PNG, JPG, TXT or CSV.", file_too_big: "That file is too big.", engagement_full: "This job's confidential storage is full.",
    storage_full: "Your firm's storage is full.", wrong_type: "The file is not what its name says, so it was not accepted.", active_content: "The file has macros, formulas or other active content, so it was not accepted.",
    damaged: "The file could not be read.", virus_found: "The virus scan found a problem with this file, so it was not accepted.", virus_scan_failed: "The virus scan did not finish. Try again.",
    virus_scan_not_set_up: "Uploads are off until the virus scanner is set up.", sensitive_job: "This job is marked as involving sensitive data, so files cannot be uploaded. Use a secure document link instead.",
    share_expired: "Access to this file has ended.", view_only: "This file is view only.", pdf_protected: "This PDF is password protected, so DELA cannot show it. Ask for an unprotected copy.",
    link_expired: "This link has expired.", link_not_https: "Use a secure link that starts with https.", link_has_login: "Remove the user name or password from the link.",
    bad_link: "That does not look like a link.", too_many_links: "This job has the most links allowed. Remove one first.", not_allowed: "Only the attorney can do that.",
    hiring_attorney_only: "Only the hiring attorney can add or remove people.", not_in_firm: "That person is not in your firm.", no_open_dispute: "There is no open dispute.",
    empty_message: "Write a message first.", not_found: "That is no longer here."
  };
  function confErr(e) { return e && e.reason === "blocked_data" && e.message ? e.message : (e && CONF_ERR[e.reason]) || engErr(e); }
  // Every answer stays on the card (a passing message is easy to miss; ChatGPT test 2026-11-05), and shows as a toast too
  var confLast = null, confStatusEl = null;
  function confSay(text, bad) {
    confLast = { text: text, bad: !!bad, at: Date.now() };
    if (confStatusEl) { confStatusEl.textContent = text; confStatusEl.className = "notice small conf-status" + (bad ? " bad" : " ok"); confStatusEl.hidden = false; }
    D.toast(app, text, bad);
  }
  function confFail(e) { confSay(confErr(e), true); }
  // The link says "save as", so following it in this tab downloads the file and the page stays open.
  // (window.open after DELA answers is not a click, so browsers block it as a pop-up.)
  function startDownload(url) {
    var a = document.createElement("a");
    a.href = url; a.rel = "noopener"; a.style.display = "none";
    document.body.appendChild(a); a.click(); a.remove();
  }
  var CONF_NO_SENSITIVE = "This file contains no medical records, ID documents, account numbers, logins or biometric data.";
  var CONF_ACK_TEXT = "I will keep these materials confidential, use them only for this engagement, and delete any copies when it ends.";
  var CONF_LOG_WORDS = { upload: "uploaded", open: "opened", download: "downloaded", link_added: "added the link", link_open: "opened the link", link_removed: "removed the link",
    link_expired: "expired: the link", extended: "extended", file_deleted: "deleted", files_expired: "deleted after access ended:", messages_deleted: "deleted the messages", review_open: "A Lawfecta reviewer opened" };
  function confCard(r) {
    var a = r.agreement, card = h("div", { class: "card", id: "conf-card" }, h("h2", null, D.term("Confidential materials", "confidential")));
    var body = h("div", null, h("p", { class: "small muted", text: "Loading..." }));
    card.appendChild(body);
    function load() {
      api.get("/confidential?agreement=" + a.id).then(function (v) { D.clear(body); confDraw(body, r, v, load); }).catch(function (e) { D.clear(body); body.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    }
    load();
    return card;
  }
  function confDraw(body, r, v, reload) {
    var a = r.agreement, att = r.role === "attorney";
    if (!v.ok) {
      if (v.reason === "not_found") { body.closest(".card").remove(); return; }
      if (v.reason === "confidential_off") {
        body.appendChild(h("p", { text: "Coming soon: a private area on each engagement where the attorney and the hired freelancer exchange client files, confidential messages and secure links. The AI never reads it." }));
        return;
      }
      if (v.reason === "confidential_deleted") { body.appendChild(h("p", { class: "muted", text: "The confidential materials on this job were deleted." })); return; }
      body.appendChild(h("p", { class: "muted", text: CONF_ERR[v.reason] || confErr(v) }));
      return;
    }
    confStatusEl = h("p", { class: "notice small conf-status", role: "status", "aria-live": "polite", hidden: "hidden" });
    if (confLast && Date.now() - confLast.at < 120000) { confStatusEl.textContent = confLast.text; confStatusEl.className = "notice small conf-status" + (confLast.bad ? " bad" : " ok"); confStatusEl.hidden = false; }
    body.appendChild(confStatusEl);
    body.appendChild(h("p", { class: "small muted", role: "note", text: "Client names, case facts, case numbers, court papers and contracts are allowed here. Never upload medical records, ID documents, account numbers, logins or biometric data: share those with a secure link from your own storage. DELA's AI never reads anything here." }));
    if (v.login_needed) { body.appendChild(confCodeBox(reload, v.login_hours)); return; }
    if (v.ack_needed) {
      var ack = h("input", { type: "checkbox" });
      var agree = h("button", { class: "blue small", type: "button", disabled: "disabled" }, "Open Confidential materials");
      ack.addEventListener("change", function () { agree.disabled = !ack.checked; });
      agree.addEventListener("click", function () { api.post("/confidential/ack", { agreement_id: a.id }).then(engOk).then(reload).catch(confFail); });
      body.appendChild(h("label", { style: "display:flex;gap:8px;align-items:flex-start;font-weight:600" }, ack, h("span", { text: CONF_ACK_TEXT })));
      body.appendChild(h("div", { class: "row", style: "margin-top:8px" }, agree));
      return;
    }
    var manage = v.role === "hiring" || v.role === "firm";
    var st = v.state || {};
    if (manage) body.appendChild(sensitiveBox(a.gig_id, !!st.sensitive, reload));
    var grace = (v.sharing || {}).grace_days || 7;
    if (st.ended) body.appendChild(h("p", { class: "notice", text: "This job has ended. The freelancer can no longer open anything here. Files are deleted " + grace + " days after access ended, and messages " + grace + " days after the job ended. Use Download all to keep a copy." }));
    // Files
    var files = h("div", { class: "conf-section" }, h("h3", { text: "Files" }));
    body.appendChild(files);
    if (!v.can_upload) files.appendChild(h("p", { class: "notice", text: "This job involves sensitive data, so files cannot be uploaded here. Use a secure document link below." }));
    else if (!st.ended) files.appendChild(confUploadBox(a.id, a.gig_id, v, att && manage, reload));
    if (!v.files.length) files.appendChild(h("p", { class: "small muted", text: "No files yet." }));
    v.files.forEach(function (f) { files.appendChild(confFileRow(a.id, f, v, manage, reload)); });
    if (manage && v.files.length) {
      var dl = h("div");
      files.appendChild(h("div", { class: "row", style: "margin-top:8px" }, h("button", { class: "ghost small", type: "button", onclick: function () {
        api.post("/confidential/download-all", { agreement_id: a.id }).then(engOk).then(function (x) {
          D.clear(dl);
          dl.appendChild(h("p", { class: "small", text: "Click each file to download it. These links work for " + x.minutes + " minutes." + (x.view_only_skipped ? " " + x.view_only_skipped + (x.view_only_skipped === 1 ? " file is" : " files are") + " view only and left out; turn off View only to include them." : "") }));
          x.files.forEach(function (f) { dl.appendChild(h("div", null, h("a", { href: f.url, download: f.name, rel: "noopener", text: f.name }))); });
        }).catch(confFail);
      } }, "Download all")));
      files.appendChild(dl);
    }
    // Secure document links
    var links = h("div", { class: "conf-section" }, h("h3", { text: "Secure document links" }),
      h("p", { class: "small muted", text: "Sensitive documents must be shared using a link from your own storage (Google Drive, Dropbox, OneDrive, Box, ShareFile, Clio, NetDocuments). Do not upload them here. DELA never opens these links. When a link expires, turn off sharing in your own storage too." }));
    body.appendChild(links);
    if (att && !st.ended) links.appendChild(confLinkForm(a.id, v, reload));
    if (!v.links.length) links.appendChild(h("p", { class: "small muted", text: "No links yet." }));
    v.links.forEach(function (l) { links.appendChild(confLinkRow(a.id, l, att, reload)); });
    // Messages
    var msgs = h("div", { class: "conf-section" }, h("h3", { text: "Confidential messages" }));
    body.appendChild(msgs);
    if (!v.messages.length) msgs.appendChild(h("p", { class: "small muted", text: "No messages yet." }));
    v.messages.forEach(function (m) { msgs.appendChild(h("div", { class: "conf-msg" + (m.mine ? " mine" : "") }, h("div", { class: "small muted", text: m.by + ", " + D.dateTime(m.at) }), h("div", { style: "white-space:pre-wrap", text: m.body }))); });
    if (!st.ended) {
      var ta = h("textarea", { rows: 3, style: "width:100%", "aria-label": "Confidential message", placeholder: "Write a confidential message. Never type a full Social Security, card or account number, or a password." });
      var req = newId();
      var send = h("button", { class: "blue small", type: "button" }, "Send");
      send.addEventListener("click", function () {
        if (!ta.value.trim()) { confSay(CONF_ERR.empty_message, true); return; }
        send.disabled = true;
        api.post("/confidential/message", { agreement_id: a.id, body: ta.value, request_id: req }).then(engOk).then(function () { reload(); confSay("Sent"); }).catch(function (e) { send.disabled = false; confFail(e); });
      });
      msgs.appendChild(ta); msgs.appendChild(h("div", { class: "row" }, send));
    }
    // People
    var ppl = h("div", { class: "conf-section" }, h("h3", { text: "Who can see this" }));
    body.appendChild(ppl);
    (v.people || []).forEach(function (p) {
      ppl.appendChild(h("div", { class: "row" }, h("span", { class: "grow", text: p.name + " (" + p.role + ")" }), p.removable ? h("button", { class: "ghost small", type: "button", onclick: function () {
        api.post("/confidential/member", { agreement_id: a.id, person_id: p.person_id, on: false }).then(engOk).then(function () { reload(); confSay("Removed"); }).catch(confFail);
      } }, "Remove") : null));
    });
    if (v.staff_options && v.staff_options.length) {
      var sel = h("select", { "aria-label": "Firm staff to add" }, v.staff_options.map(function (o) { return h("option", { value: o.person_id, text: o.name }); }));
      ppl.appendChild(h("div", { class: "row" }, sel, h("button", { class: "ghost small", type: "button", onclick: function () {
        api.post("/confidential/member", { agreement_id: a.id, person_id: sel.value, on: true }).then(engOk).then(function () { reload(); confSay("Added"); }).catch(confFail);
      } }, "Add to this job")));
    }
    // A dispute: both agree before a Lawfecta reviewer may open the materials
    if (v.review) {
      var rv = h("div", { class: "conf-section" }, h("h3", { text: "Dispute review" }),
        h("p", { class: "small", text: "A Lawfecta reviewer is deciding a dispute on this job. The reviewer may open these materials only if both of you agree. If either of you declines, the reviewer decides from the rest of the record and anything you choose to share." }),
        h("p", { class: "small", text: "Your answer: " + (v.review.mine === true ? "you agreed" : v.review.mine === false ? "you declined" : "not yet") + ". The other person: " + (v.review.other === true ? "agreed" : v.review.other === false ? "declined" : "not yet") + "." }));
      rv.appendChild(h("div", { class: "row" },
        h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/confidential/review-consent", { agreement_id: a.id, agree: true }).then(engOk).then(reload).catch(confFail); } }, "I agree"),
        h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/confidential/review-consent", { agreement_id: a.id, agree: false }).then(engOk).then(reload).catch(confFail); } }, "I decline")));
      body.appendChild(rv);
    }
    if (v.reviewer_opens) body.appendChild(h("p", { class: "small", text: "A Lawfecta reviewer opened these materials " + v.reviewer_opens + (v.reviewer_opens === 1 ? " time." : " times.") }));
    // The log, for the attorney side
    if (v.log) {
      var lg = h("details", { class: "conf-section" }, h("summary", { text: "Activity (" + v.log.length + ")" }));
      if (!v.log.length) lg.appendChild(h("p", { class: "small muted", text: "Nothing yet." }));
      v.log.forEach(function (l) {
        var word = CONF_LOG_WORDS[l.action] || l.action;
        lg.appendChild(h("div", { class: "small" }, D.dateTime(l.at) + ": " + (l.action === "review_open" ? word : l.who + " " + word) + (l.file ? " " + l.file : "") + (l.action === "extended" && l.detail && l.detail.expires_at ? " to " + D.date(l.detail.expires_at) : "")));
      });
      body.appendChild(lg);
    }
  }
  function confCodeBox(reload, hours) {
    var box = h("div", null, h("p", { text: "For your security, DELA emails you a 6-digit code before it opens this area. Once you enter it, it works for " + (hours || 12) + " hours." }));
    var code = h("input", { inputmode: "numeric", autocomplete: "one-time-code", maxlength: "6", "aria-label": "6-digit code", placeholder: "6-digit code", style: "max-width:140px" });
    var openB = h("button", { class: "blue small", type: "button" }, "Open");
    var sendB = h("button", { class: "ghost small", type: "button" }, "Email me a code");
    var said = h("p", { class: "small muted" });
    sendB.addEventListener("click", function () {
      sendB.disabled = true;
      api.post("/confidential/code", {}).then(engOk).then(function (x) { sendB.disabled = false; said.textContent = "We sent a code to " + x.sent_to + ". Enter it here soon: it stops working after a few minutes."; code.focus(); }).catch(function (e) { sendB.disabled = false; confFail(e); });
    });
    openB.addEventListener("click", function () { api.post("/confidential/code/confirm", { code: code.value }).then(engOk).then(reload).catch(confFail); });
    code.addEventListener("keydown", function (e) { if (e.key === "Enter") openB.click(); });
    box.appendChild(h("div", { class: "row", style: "flex-wrap:wrap" }, sendB, code, openB));
    box.appendChild(said);
    return box;
  }
  function confUploadBox(agId, gigId, v, att, reload) {
    var sh = v.sharing || {};
    var pick = h("input", { type: "file", accept: ".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt,.csv", "aria-label": "Choose a confidential file" });
    var tick = h("input", { type: "checkbox" });
    var days = att ? expirySelect(sh.choices, sh.default || 14, "Freelancer can open it for") : null;
    var go = h("button", { class: "blue small", type: "button" }, "Upload");
    var out = h("div");
    go.addEventListener("click", function () {
      var file = pick.files && pick.files[0];
      if (!file) { confSay("Choose a file first.", true); return; }
      if (!tick.checked) { confSay(CONF_ERR.no_sensitive_needed, true); return; }
      go.disabled = true; D.clear(out); out.appendChild(h("p", { class: "small muted", text: "Uploading and checking " + file.name + "..." }));
      api.post("/confidential/upload/start", { agreement_id: agId, name: file.name, size_bytes: file.size, request_id: newId(), no_sensitive: true, expiry_days: days ? Number(days.value) : null }).then(engOk).then(function (x) {
        if (x.duplicate) return x;
        return fetch(x.upload_url, { method: "PUT", headers: { "content-type": x.content_type, "x-upsert": "false" }, body: file }).then(function (up) {
          if (!up.ok) throw new Error("upload_failed");
          return api.post("/confidential/upload/complete", { agreement_id: agId, file_id: x.file_id });
        });
      }).then(function (c) {
        go.disabled = false;
        if (c && c.ok === false) throw c;
        reload(); confSay("Uploaded" + (c && c.scan_state === "not_scanned" ? ". Not virus scanned on the test site." : ""));
      }).catch(function (e) {
        go.disabled = false; D.clear(out);
        confSay(confErr(e), true);
        out.appendChild(h("p", { class: "notice bad", role: "alert", text: confErr(e) }));
        if (e && e.reason === "blocked_data" && e.can_mark_sensitive) out.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
          api.post("/gigs/sensitive", { gig_id: gigId, on: true }).then(gigOk).then(function () { reload(); confSay("Marked as sensitive. Share the file with a secure link instead."); }).catch(gigFail);
        } }, "Mark this job as sensitive"));
      });
    });
    return h("div", { class: "conf-upload" },
      h("div", { class: "row", style: "flex-wrap:wrap" }, pick, days ? h("label", { class: "small", style: "font-weight:400" }, "Freelancer can open it for ", days) : null),
      h("label", { style: "display:flex;gap:8px;align-items:flex-start;font-weight:600;margin-top:6px" }, tick, h("span", { text: CONF_NO_SENSITIVE })),
      h("div", { class: "row", style: "margin-top:6px" }, go), out);
  }
  function confFileRow(agId, f, v, manage, reload) {
    var viewable = f.ext === "pdf" || f.ext === "png" || f.ext === "jpg";
    var when = v.role === "freelancer" ? "Open to you until " + D.date(f.access_ends_at)
      : f.access_ended ? "Freelancer access ended " + D.date(f.access_ends_at) + ". Deleted on " + D.date(f.delete_at) : "Freelancer access until " + D.date(f.access_ends_at);
    var acts = h("div", { class: "row", style: "flex-wrap:wrap" });
    if (viewable) acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { confOpenFile(agId, f, "open"); } }, "Open"));
    if (!f.view_only && !viewable) acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { confOpenFile(agId, f, "download"); } }, "Download"));
    if (manage) {
      acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
        api.post("/confidential/extend", { agreement_id: agId, file_id: f.id }).then(engOk).then(function (x) { reload(); confSay(x.job_ended ? "Extended, but the job has ended, so the freelancer's access stays closed." : "Extended to " + D.date(x.expires_at)); }).catch(confFail);
      } }, "Extend " + ((v.sharing || {}).extend_days || 14) + " days"));
      acts.appendChild(h("button", { class: "ghost small", type: "button", "aria-pressed": f.view_only ? "true" : "false", onclick: function () {
        api.post("/confidential/view-only", { agreement_id: agId, file_id: f.id, on: !f.view_only }).then(engOk).then(function () { reload(); confSay(f.view_only ? "Downloads allowed again" : "View only: the download button is gone"); }).catch(confFail);
      } }, f.view_only ? "Allow download" : "View only"));
    }
    if (f.can_delete) {
      var del = h("button", { class: "danger small", type: "button" }, "Delete");
      del.addEventListener("click", function () {
        D.clear(acts);
        acts.appendChild(h("span", { class: "small grow", text: "Delete " + f.name + " for good?" }));
        acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: reload }, "Cancel"));
        acts.appendChild(h("button", { class: "danger small", type: "button", onclick: function () {
          api.post("/confidential/delete", { agreement_id: agId, file_id: f.id }).then(engOk).then(function () { reload(); confSay("Deleted"); }).catch(confFail);
        } }, "Yes, delete"));
      });
      acts.appendChild(del);
    }
    return h("div", { class: "conf-file" },
      h("div", null, h("b", { text: f.name }), h("span", { class: "small muted", text: " | " + f.by + ", " + D.date(f.at) + (f.view_only ? " | View only" : "") + (f.scan_state === "not_scanned" ? " | Not virus scanned" : "") + (f.opens !== undefined && f.opens !== null ? " | opened " + f.opens + (f.opens === 1 ? " time" : " times") : "") })),
      h("div", { class: "small " + (f.access_ended ? "bad" : "muted"), text: when }), acts);
  }
  // PDFs come back stamped with the viewer's name and the date; images get the same stamp drawn on top
  function confOpenFile(agId, f, action) {
    api.post("/confidential/open", { agreement_id: agId, file_id: f.id, action: action }).then(engOk).then(function (x) {
      if (x.kind === "download") { startDownload(x.url); confSay("Downloading " + x.name); return; }
      var m = modal(x.name);
      m.body.appendChild(h("p", { class: "small muted", text: "Watermarked: " + x.watermark }));
      if (x.kind === "pdf") {
        var url = URL.createObjectURL(new Blob([Uint8Array.from(atob(x.b64), function (c) { return c.charCodeAt(0); })], { type: "application/pdf" }));
        m.body.appendChild(h("iframe", { src: url + (x.view_only ? "#toolbar=0" : ""), title: x.name, style: "width:100%;height:70vh;border:1px solid var(--line);border-radius:8px" }));
        if (!x.view_only) m.foot.appendChild(h("a", { class: "button ghost small", href: url, download: x.name, text: "Download" }));
      } else {
        var cv = h("canvas", { style: "max-width:100%;height:auto", "aria-label": x.name });
        var pic = new Image();
        pic.onload = function () {
          cv.width = pic.naturalWidth; cv.height = pic.naturalHeight;
          var g = cv.getContext("2d"); g.drawImage(pic, 0, 0);
          g.save(); g.globalAlpha = 0.22; g.fillStyle = "#8a1a40"; g.font = Math.max(16, Math.round(cv.width / 28)) + "px sans-serif";
          g.translate(cv.width / 2, cv.height / 2); g.rotate(-0.45);
          for (var i = -2; i <= 2; i++) g.fillText(x.watermark, -cv.width / 2.2, i * cv.height / 4);
          g.restore();
        };
        pic.src = "data:image/" + (x.ext === "png" ? "png" : "jpeg") + ";base64," + x.b64;
        m.body.appendChild(cv);
        if (!x.view_only) m.foot.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { var aEl = h("a", { href: cv.toDataURL("image/png"), download: x.name.replace(/\.(png|jpe?g)$/i, "") + ".png" }); aEl.click(); } }, "Download"));
      }
      m.foot.appendChild(h("button", { class: "ghost", type: "button", onclick: m.close }, "Close"));
    }).catch(confFail);
  }
  function confLinkForm(agId, v, reload) {
    var sh = v.sharing || {};
    var label = h("input", { "aria-label": "Label (optional)", placeholder: "Label, for example Medical records folder", maxlength: "80" });
    var url = h("input", { type: "url", "aria-label": "Secure link", placeholder: "Paste the sharing link from your storage" });
    var days = expirySelect(sh.choices, sh.default || 14, "Link expires after");
    var req = newId();
    var add = h("button", { class: "blue small", type: "button" }, "Add link");
    add.addEventListener("click", function () {
      if (!url.value.trim()) { confSay("Paste the link first.", true); return; }
      add.disabled = true;
      api.post("/confidential/links/add", { agreement_id: agId, url: url.value.trim(), label: label.value.trim(), expiry_days: Number(days.value), request_id: req }).then(engOk).then(function (x) {
        reload(); confSay("Link added. It expires on " + D.date(x.expires_at) + ".");
      }).catch(function (e) { add.disabled = false; confFail(e); });
    });
    return h("div", { class: "conf-link-form" }, h("div", { class: "row", style: "flex-wrap:wrap" }, label, url),
      h("div", { class: "row", style: "flex-wrap:wrap;margin-top:6px" }, h("label", { class: "small", style: "font-weight:400" }, "Link expires after ", days), add));
  }
  function confLinkRow(agId, l, att, reload) {
    var stateText = l.state === "open" ? "Expires " + D.date(l.expires_at) : l.state === "expired" ? "Expired " + D.date(l.expires_at) : "Removed";
    var acts = h("div", { class: "row", style: "flex-wrap:wrap" });
    if (l.state === "open") acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
      D.openTab(function () { return api.post("/confidential/links/open", { agreement_id: agId, link_id: l.id }).then(engOk).then(function (x) { return x.url; }); }, confFail, { noReferrer: true });
    } }, "Open link"));
    if (att && l.state === "open") {
      var rm = h("button", { class: "ghost small", type: "button" }, "Remove");
      rm.addEventListener("click", function () {
        D.clear(acts);
        acts.appendChild(h("span", { class: "small grow", text: "Remove this link? Also turn off sharing in your own storage." }));
        acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: reload }, "Cancel"));
        acts.appendChild(h("button", { class: "danger small", type: "button", onclick: function () {
          api.post("/confidential/links/remove", { agreement_id: agId, link_id: l.id }).then(engOk).then(function () { reload(); confSay("Link removed"); }).catch(confFail);
        } }, "Yes, remove"));
      });
      acts.appendChild(rm);
    }
    return h("div", { class: "conf-file" }, h("div", null, h("b", { text: l.label || "Secure link" }), h("span", { class: "small muted", text: " | " + l.host + ", added by " + l.by + (l.opens !== undefined && l.opens !== null ? " | opened " + l.opens + (l.opens === 1 ? " time" : " times") : "") })),
      h("div", { class: "small " + (l.state === "open" ? "muted" : "bad"), text: stateText }), acts);
  }

  // One clear next step for this person
  function nextStep(r, mySigned, theirSigned) {
    var a = r.agreement, att = r.role === "attorney", box = h("div", { class: "card" }, h("h2", { text: "What happens next" }));
    if (r.monthly && (a.status === "signed" || a.status === "active") && r.monthly.terms.status !== "ended") {
      var mv = r.monthly, cur = mv.current, nx = mv.next || {};
      if (!cur && att) {
        var p1 = (mv.periods || [])[0] || {};
        var csum = commitmentSummary(r, true); if (csum) box.appendChild(csum);
        box.appendChild(h("p", { text: "Pay month 1 (" + D.money(p1.price_cents) + ") and the platform fee (" + D.money(p1.fee_cents) + "). The day it is paid becomes your billing day each month. Lawfecta holds it until each unit is accepted." }));
        if (!r.stripe_ready) box.appendChild(h("p", { class: "notice", text: ENG_ERR.payments_not_set_up }));
        else {
          var pm = h("button", { class: "blue", type: "button" }, "Pay month 1");
          pm.addEventListener("click", function () {
            pm.disabled = true; pm.textContent = "Starting the payment...";
            api.post("/engagements/pay", { id: a.id }).then(engOk).then(function (x) { if (x.url) { location.href = x.url; return; } engReload(x.status === "succeeded" ? "Paid. Month 1 is open." : "The payment is being confirmed."); })
              .catch(function (e) { pm.disabled = false; pm.textContent = "Pay month 1"; engFail(e); });
          });
          box.appendChild(h("div", { class: "row" }, pm));
          box.appendChild(h("p", { class: "small muted", text: "You pay on Stripe's secure page, and that payment method is saved for each month's renewal. A bank payment takes about 4 business days; the month's tasks open only once it clears." + (r.stripe_test ? TEST_CARD_NOTE : "") }));
        }
      } else if (!cur) box.appendChild(h("p", { text: "Waiting for the client to pay month 1. Do not start unpaid work." }));
      else if (nx.status === "failed") box.appendChild(h("p", { text: att ? "Month " + nx.n + "'s payment did not go through. Pay now from the Monthly engagement card below." : "Month " + nx.n + " is not paid yet, so new work is paused. Do not start month " + nx.n + "'s tasks." }));
      else box.appendChild(h("p", { text: att ? "Month " + cur.n + " is paid. Review each unit when it is submitted. The next month renews on its billing day." : "Month " + cur.n + " is paid and held by Lawfecta. Do this month's units, then submit each one below." }));
      return box;
    }
    if (a.status === "signing" || a.status === "draft") {
      if (mySigned && !theirSigned) box.appendChild(h("p", { text: "You signed version " + a.version + ". Waiting for the " + (att ? "freelancer" : ((((r.current || {}).body || {}).parties || {}).client || {}).kind === "agency" ? "agency" : "attorney") + " to sign." }));
      else box.appendChild(signForm(r, theirSigned));
    } else if ((a.status === "signed" || a.status === "active") && att) {
      var due = (r.milestones || []).filter(function (m) { return m.status === "pending" || m.status === "awaiting_funding"; })[0];
      var open = (r.milestones || []).some(function (m) { return ["funded", "in_progress", "submitted", "changes_requested", "disputed"].indexOf(m.status) >= 0; });
      var waiting = (r.payments || []).filter(function (p) { return p.status === "processing"; })[0];
      if (waiting) box.appendChild(h("p", { text: "Your payment of " + D.money(waiting.amount_cents) + " is being confirmed by the bank. Work starts when it is confirmed." }));
      else if (due && !open) {
        var first = !a.started_at;
        var csum1 = first ? commitmentSummary(r, true) : null; if (csum1) box.appendChild(csum1);
        if (perMilestoneFee(a)) {
          box.appendChild(h("p", { text: "Pay milestone " + due.seq + ". Lawfecta holds the milestone amount until you accept the milestone." }));
          box.appendChild(threeLinesList(due.amount_cents, due.attorney_fee_cents || 0));
        } else
        box.appendChild(h("p", { text: "Pay milestone " + due.seq + " (" + D.money(due.amount_cents) + ")" + (first && typeof a.attorney_fee_cents === "number" && a.attorney_fee_cents > 0 ? " and the platform fee (" + D.money(a.attorney_fee_cents) + ")" : "") + ". Lawfecta holds it until you accept the milestone." }));
        if (!r.stripe_ready) box.appendChild(h("p", { class: "notice", text: ENG_ERR.payments_not_set_up }));
        else {
          var pay = h("button", { class: "blue", type: "button" }, a.saved_payment ? "Pay milestone " + due.seq + " with your saved payment method" : "Pay milestone " + due.seq);
          pay.addEventListener("click", function () {
            pay.disabled = true; pay.textContent = "Starting the payment...";
            api.post("/engagements/pay", { id: a.id }).then(engOk).then(function (x) {
              if (x.url) { if (x.failed_first) D.toast(app, "Your saved payment method did not go through. Opening Stripe to pay another way."); location.href = x.url; return; }
              engReload(x.status === "succeeded" ? "Paid. The freelancer can start." : "The payment is being confirmed.");
            }).catch(function (e) { pay.disabled = false; pay.textContent = "Pay milestone " + due.seq; engFail(e); });
          });
          box.appendChild(h("div", { class: "row" }, pay));
          if (a.saved_payment) box.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/engagements/pay", { id: a.id, use_checkout: true }).then(engOk).then(function (x) { if (x.url) location.href = x.url; else engReload(); }).catch(engFail);
          } }, "Pay another way"));
          box.appendChild(h("p", { class: "small muted", text: "You pay on Stripe's secure page. DELA never sees your card or bank details." + (r.stripe_test ? TEST_CARD_NOTE : "") }));
        }
      } else if (open) box.appendChild(h("p", { text: "The freelancer is working on the paid milestone. You review each one when it is submitted." }));
      else box.appendChild(h("p", { text: "Nothing is due from you right now." }));
    } else if (a.status === "signed" || a.status === "active") {
      var ready = (r.milestones || []).filter(function (m) { return m.status === "funded" || m.status === "in_progress" || m.status === "changes_requested"; })[0];
      box.appendChild(h("p", { text: ready ? "Milestone " + ready.seq + " is paid and held by Lawfecta. Do the work, then submit it below." : "Waiting for the " + clientKindWord(r) + " to pay the next milestone. Do not start unpaid work." }));
      if (!r.payout_account || r.payout_account.status !== "ready") box.appendChild(h("p", { class: "small", text: "Set up payouts on the Earnings page so accepted milestones reach your bank." }));
    } else if (a.status === "completed") box.appendChild(h("p", { text: "Every milestone is accepted. This engagement is complete." }));
    else box.appendChild(h("p", { class: "muted", text: "Nothing to do here." }));
    return box;
  }

  // Subcontractors on an agency engagement (Step 7d part 3): the disclosure, and the attorney's "No subcontractors on this
  // engagement" while the agreement is being signed. A change makes a new version both sign.
  function subsCard(r, b) {
    var sub = b.subcontracting || {}, a = r.agreement;
    if (!sub.agency) return null;
    var card = h("div", { class: "card", id: "subs-card" }, h("h2", null, D.term("Subcontractors", "subcontractors")), cardStatus("subs"));
    card.appendChild(h("p", { text: sub.no_subcontractors ? "No subcontractors on this engagement: only the agency's own team works on it." : "This agency may use vetted subcontractors from Lawfecta to complete this work." }));
    var open = r.role === "attorney" && (a.status === "draft" || a.status === "signing");
    if (!open) {
      card.appendChild(h("p", { class: "small muted", text: r.role === "attorney" ? "Everyone working on this job is listed under \"Who's working on this\". You get a notice when it changes; nothing is needed from you." :
        sub.no_subcontractors ? "The attorney chose this. Bench assignments and gigs for part of this job are off." : "Subcontractors are verified Lawfecta freelancers. You choose what to share with them and stay responsible for the work." }));
      return card;
    }
    var box = h("input", { type: "checkbox", "aria-label": "No subcontractors on this engagement" });
    box.checked = !!sub.no_subcontractors;
    var save = h("button", { class: "ghost", type: "button" }, "Save");
    save.addEventListener("click", function () {
      save.disabled = true;
      api.post("/agreements/subcontractors", { id: a.id, no_subcontractors: box.checked, base: a.version }).then(engOk).then(function (x) {
        if (x.duplicate) { save.disabled = false; cardSay("subs", "Nothing changed."); return; }
        cardSay("subs", "Saved as version " + x.version + ". Both of you sign the new version.");
        engReload();
      }).catch(function (e) { save.disabled = false; cardFail("subs")(e); });
    });
    card.appendChild(h("p", { class: "small muted", text: "Subcontractors are verified Lawfecta freelancers who accept confidentiality and no-poaching terms. You do not approve each person; they are listed under \"Who's working on this\". To keep this job to the agency's own team, tick the box. Saving makes a new version of the agreement that both of you sign." }));
    card.appendChild(h("label", { style: "display:flex;gap:8px;font-weight:400;margin:8px 0" }, box, h("span", { text: "No subcontractors on this engagement" })));
    card.appendChild(h("div", { class: "row" }, save));
    return card;
  }

  // "agency" when the client is an agency hiring for its own gig, otherwise "attorney"
  function clientKindWord(r) { return ((((r.current || {}).body || {}).parties || {}).client || {}).kind === "agency" ? "agency" : "attorney"; }

  // One "what you are agreeing to" summary before every signature and payment (UX review part 3): the money from the
  // api's own summary, then the few rules that matter most, from the agreement being signed. The full terms stay below.
  function commitmentSummary(r, paying) {
    var b = (r.current || {}).body || {}, lim = b.limits || {}, att = r.role === "attorney";
    var lines = (r.money_summary || []).slice();
    if (!paying) {
      if (b.kind === "monthly") {
        lines.push(att ? "Month 1 is charged when you pay it; that day becomes your billing day, and the saved payment method is charged once on it each month." : "You are paid each month for the work accepted that month.");
        lines.push("Cancellation takes effect at the end of the paid month. Ending sooner needs both of you to agree.");
        lines.push("The limits are for each month. Unused work does not carry over.");
      } else {
        if (lim.review_days) lines.push((att ? "You have " : "The client has ") + lim.review_days + " days to review each milestone; " + (lim.revisions || 0) + " rounds of changes are included.");
        lines.push("Canceling before work starts refunds the client in full. After that, paid milestones not yet submitted are refunded and accepted ones stay paid.");
      }
      if ((b.subcontracting || {}).agency && !(b.subcontracting || {}).no_subcontractors) lines.push("The agency may use vetted Lawfecta subcontractors. Everyone working on the job is listed under Who's working on this.");
      lines.push("Keep all work, messages and payment on Lawfecta.");
    }
    if (!lines.length) return null;
    return h("div", { class: "soft commitment", id: paying ? "commitment-pay" : "commitment", style: "margin:8px 0;padding:10px 12px;border-radius:12px" },
      h("b", { text: paying ? "Before you pay" : "What you are agreeing to" }), h("ul", { style: "margin:6px 0 0" }, lines.map(function (l) { return h("li", { text: l }); })));
  }

  function signForm(r, theirSigned) {
    var a = r.agreement;
    var name = h("input", { "aria-label": "Type your full name to sign", style: "width:100%", autocomplete: "name" });
    var ok = h("input", { type: "checkbox", "aria-label": "I agree to sign electronically" });
    var go = h("button", { class: "blue", type: "button" }, "Sign version " + a.version);
    var rec = r.monthly && r.role === "attorney" ? h("input", { type: "checkbox", "aria-label": "Charge this payment method each month" }) : null;
    go.addEventListener("click", function () {
      if (!name.value.trim() || !ok.checked) { D.toast(app, ENG_ERR.sign_needs_name_and_consent, true); return; }
      if (rec && !rec.checked) { D.toast(app, MONTHLY_ERR.recurring_consent_needed, true); return; }
      go.disabled = true;
      api.post("/agreements/sign", { id: a.id, version: a.version, typed_name: name.value, consent: true, recurring_consent: !!(rec && rec.checked) }).then(engOk).then(function (x) {
        engReload(x.both_signed ? "Signed by both of you." + (r.role === "attorney" ? " Pay the first milestone to start." : ((((r.current || {}).body || {}).parties || {}).client || {}).kind === "agency" ? " The agency pays the first milestone next." : " The attorney pays the first milestone next.") : "Signed. Waiting for the other signature.");
      }).catch(function (e) { go.disabled = false; engFail(e); });
    });
    return h("div", null,
      h("p", { text: (theirSigned ? "The other person signed version " + a.version + ". " : "") + "Read the agreement below. If it is right, sign it here. If not, propose changes." }),
      commitmentSummary(r, false),
      field("Your full name", name, "Your typed name is your signature. DELA records it with the time, this version and its fingerprint."),
      h("label", { style: "display:flex;gap:8px;font-weight:400;margin:8px 0" }, ok, h("span", { text: "I have read version " + a.version + " of this agreement and I sign it electronically." })),
      rec ? h("label", { style: "display:flex;gap:8px;font-weight:400;margin:8px 0" }, rec, h("span", { text: "Charge this payment method each month on my billing day until I or the freelancer cancel." })) : null,
      h("div", { class: "row" }, go));
  }

  // One due date everywhere (step 8b, retest R01): the signed table shows the working date of the same milestone, with the
  // signed date and the reason when they differ
  function dueText(m, working) {
    var w = working || m;
    if (!w.due_date) return m.due_date ? D.date(m.due_date) : "-";
    var signed = w.planned_due_date || m.due_date;
    return D.date(w.due_date) + (signed && signed !== w.due_date && w.due_note ? " (moved from " + D.date(signed) + ": " + w.due_note.charAt(0).toLowerCase() + w.due_note.slice(1) + ")" : "");
  }
  function agreementCard(r, b) {
    var p = b.parties || {}, s = b.scope || {}, fe = b.fees || {};
    var c = h("div", { class: "card" }, h("h2", { text: "The agreement" }));
    c.appendChild(h("div", { class: "kv" },
      h("div", null, "Client (firm)", h("b", { text: (p.client || {}).firm || "-" })),
      h("div", null, "Signs for the firm", h("b", { text: (p.client || {}).signatory || "Not set yet" })),
      // The contracting agency and its lead, named separately (step 8b Part C, retest R10)
      r.agency_name ? h("div", null, "Agency (the contracting party)", h("b", { text: r.agency_name })) : (p.freelancer || {}).company ? h("div", null, "Freelancer's business", h("b", { text: p.freelancer.company })) : null,
      h("div", null, r.agency_name ? "Agency lead" : "Freelancer", h("b", { text: (p.freelancer || {}).name || "-" })),
      h("div", null, b.kind === "monthly" ? "Monthly price for the work" : "Price for the work", h("b", { text: D.money(fe.total_cents) }))));
    // The subcontracting consent in one plain sentence, next to the parties (UX review E02)
    if ((b.subcontracting || {}).agency) c.appendChild(h("p", { class: "small", text: (b.subcontracting.no_subcontractors ? "No subcontractors: only the agency's own team works on this job." : "By signing, the client agrees the agency may use vetted Lawfecta subcontractors. The agency stays responsible for them.") + " Everyone working on the job is listed under \"Who's working on this\" below." }));
    // What this person pays or receives, worked out by the api from the same fees (UX review E01)
    if ((r.money_summary || []).length) c.appendChild(h("div", { class: "notice ok", id: "money-summary" }, (r.money_summary || []).map(function (l, i) { return h("p", { style: "margin:" + (i ? "4px" : "0") + " 0 0;" + (i ? "" : "font-weight:700;font-size:1.1em"), text: l }); })));
    var agSt = (r.agreement || {}).status;
    if (["draft", "sent", "signing"].indexOf(agSt) >= 0) c.appendChild(helperButton("agreement_check", "✦ Check this for me", function () { return { agreement_id: r.agreement.id }; }, {
      render: function (out, y) {
        helperFindings(out, y.findings || [], {});
        if (!r.monthly && agSt === "signing" && (y.findings || []).length) out.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { eng.editing = true; draw(); } }, "Propose changes"));
      } }));
    if (s.task) c.appendChild(h("p", null, h("b", { text: "The work: " }), s.task));
    if (s.included) c.appendChild(h("p", null, h("b", { text: "Included: " }), s.included));
    // A monthly agreement's exclusions live in its monthly terms, one per task (step 8b, retest R01)
    var monthlyEx = r.monthly && r.monthly.terms ? (r.monthly.terms.tasks || []).filter(function (x) { return x.exclusions; }).map(function (x) { return x.task + ": " + x.exclusions; }).join("; ") : "";
    c.appendChild(h("p", null, h("b", { text: "Not included: " }), s.excluded || monthlyEx || "Not specified. Confirm with the other person before signing."));
    if (s.schedule) c.appendChild(h("p", null, h("b", { text: "Schedule: " }), s.schedule));
    var t = h("table", { class: "stack", style: "width:100%" }, h("thead", null, h("tr", null, h("th", { text: "#" }), h("th", { text: "Milestone" }), h("th", { text: "Amount" }), h("th", { text: "Due" }), h("th", { text: "Deliverables" }))),
      h("tbody", null, (b.milestones || []).map(function (m) {
        return h("tr", null, h("td", { "data-label": "#", text: String(m.seq) }), h("td", { "data-label": "Milestone", text: m.title }), h("td", { "data-label": "Amount", text: D.money(m.amount_cents) }),
          h("td", { "data-label": "Due", text: dueText(m, (r.milestones || []).filter(function (x) { return x.seq === m.seq; })[0]) }), h("td", { "data-label": "Deliverables", text: m.deliverables || "" }));
      })));
    c.appendChild(h("h3", null, D.term("Milestones", "milestone")));
    c.appendChild(t);
    if (r.role === "attorney" && !r.monthly && ["signing", "signed", "active"].indexOf(agSt) >= 0) c.appendChild(helperButton("acceptance_criteria", "✦ Improve acceptance criteria", function () { return { agreement_id: r.agreement.id }; }, {
      render: function (out, y) {
        var ms = y.milestones || [];
        if (!ms.length) { out.appendChild(h("p", { style: "margin:0", text: "DELA found nothing to improve." })); return; }
        ms.forEach(function (m) { out.appendChild(h("div", { style: "margin:6px 0" }, h("b", { text: "Milestone " + m.seq + ": " }), h("span", { text: m.deliverables }), m.why ? h("div", { class: "small muted", text: m.why }) : null)); });
        out.appendChild(h("p", { class: "small", text: "Using them starts a new version of the agreement. Both of you sign it before it applies." }));
        function useIt() { eng.suggestDeliverables = {}; ms.forEach(function (m) { eng.suggestDeliverables[m.seq] = m.deliverables; }); eng.editing = true; draw(); }
        out.appendChild(h("div", { class: "row", style: "gap:6px" }, h("button", { class: "ghost small", type: "button", onclick: useIt }, "Use suggestion"), h("button", { class: "ghost small", type: "button", onclick: useIt }, "Edit")));
      } }));
    c.appendChild(h("h3", null, D.term("Fees", "platform_fee")));
    c.appendChild(h("ul", null, (r.fee_lines || []).map(function (l) { return h("li", { text: l }); })));
    if (["draft", "sent", "signing"].indexOf((r.agreement || {}).status) < 0) c.appendChild(h("p", { class: "small muted", text: "These are the amounts agreed at signing. What was actually paid, refunded and paid out is listed under Payments and on each milestone." }));
    var rub = h("details", null, h("summary", { text: "Completion checklist (how DELA checks each milestone)" }),
      h("p", { class: "small muted", text: "Agreed at signing. A score of " + ((b.limits || {}).pass_score || 90) + " or more with every required item met passes, then the attorney reviews it. DELA's check is not a legal review." }));
    (b.rubric || []).forEach(function (x) {
      rub.appendChild(h("p", { style: "margin:8px 0 2px;font-weight:700", text: "Milestone " + x.milestone_seq }));
      rub.appendChild(h("ul", null, (x.criteria || []).map(function (k) { return h("li", { text: k.text + " (" + k.weight + (k.required ? ", required" : "") + ")" }); })));
    });
    c.appendChild(rub);
    c.appendChild(h("details", null, h("summary", { text: "The terms" }), h("pre", { style: "white-space:pre-wrap;font:inherit", text: b.terms || "" })));
    var hist = h("details", null, h("summary", { text: "Versions and signatures" }));
    (r.versions || []).forEach(function (v) {
      var sig = (r.signatures || []).filter(function (s) { return s.version === v.version; }).map(function (s) { return (s.role === "attorney" ? "Attorney" : "Freelancer") + ": " + s.typed_name + ", " + D.dateTime(s.signed_at); });
      hist.appendChild(h("p", { class: "small", text: "Version " + v.version + " (" + (v.by_me ? "you" : v.version === 1 ? "DELA" : "the other person") + ", " + D.dateTime(v.created_at) + ")" + (v.note ? ": " + v.note : "") + ". Fingerprint " + String(v.hash).slice(0, 12) + (sig.length ? ". Signed by " + sig.join("; ") : ". Not signed") }));
    });
    c.appendChild(hist);
    return c;
  }

  // Propose changes: a new version both sign (after signing, a change order)
  function changesCard(r, b) {
    var a = r.agreement, c = h("div", { class: "card" });
    var signed = a.status === "signed" || a.status === "active";
    c.appendChild(h("h2", { text: signed ? "Change order" : "Propose changes" }));
    c.appendChild(h("p", { class: "small muted", text: signed ? "Change the price, scope or milestones with a new version you both sign. Paid milestones keep their amounts. Work goes on under the signed version until then." : "Change the milestones or the scope. The other person reviews your version and signs it, or proposes another." }));
    if (!eng.editing) { c.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { eng.editing = true; draw(); } }, signed ? "Propose a change order" : "Propose changes")); return c; }
    var rows = h("div");
    function row(m) {
      var t = h("input", { "aria-label": "Milestone title", value: m.title || "", style: "width:100%" }), amt = h("input", { type: "number", min: "0", step: "1", "aria-label": "Amount ($)", value: m.amount_cents ? String(m.amount_cents / 100) : "" });
      var due = h("input", { type: "date", "aria-label": "Due date", value: m.due_date || "" }), del = h("input", { "aria-label": "Deliverables", value: m.deliverables || "", style: "width:100%" });
      var el = h("div", { class: "card", style: "padding:10px" }, field("Title", t), h("div", { class: "row" }, field("Amount ($)", amt), field("Due date", due)), field("Deliverables", del),
        h("button", { class: "ghost small", type: "button", onclick: function () { el.remove(); } }, "Remove this milestone"));
      el.read = function () { return { title: t.value, amount: amt.value, due_date: due.value, deliverables: del.value }; };
      rows.appendChild(el);
    }
    var sugg = eng.suggestDeliverables || null; eng.suggestDeliverables = null;
    (b.milestones || []).forEach(function (m) { row(sugg && sugg[m.seq] ? Object.assign({}, m, { deliverables: sugg[m.seq] }) : m); });
    if (sugg) c.appendChild(h("p", { class: "notice", text: "DELA's suggested deliverables are filled in below. Check them, then send the new version; nothing changes until you both sign." }));
    var s = b.scope || {};
    var inc = h("textarea", { rows: 3, style: "width:100%", "aria-label": "Included" }), exc = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Not included" }), sch = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Schedule" });
    inc.value = s.included || ""; exc.value = s.excluded || ""; sch.value = s.schedule || "";
    var note = h("input", { "aria-label": "Note to the other person", style: "width:100%", placeholder: "What you changed and why" });
    var send = h("button", { class: "blue", type: "button" }, "Send the new version");
    send.addEventListener("click", function () {
      var list = [].slice.call(rows.children).map(function (x) { return x.read(); });
      send.disabled = true;
      api.post("/agreements/propose", { id: a.id, base: a.version, milestones: list, included: inc.value, excluded: exc.value, schedule: sch.value, note: note.value }).then(engOk).then(function (x) {
        eng.editing = false; engReload("Version " + x.version + " sent. Both of you sign it next.");
      }).catch(function (e) { send.disabled = false; engFail(e); });
    });
    c.appendChild(h("h3", null, D.term("Milestones", "milestone")));
    c.appendChild(rows);
    c.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { row({}); } }, "Add a milestone"));
    c.appendChild(field("Included", inc));
    c.appendChild(field("Not included", exc));
    c.appendChild(field("Schedule", sch));
    c.appendChild(field("Note", note));
    c.appendChild(h("div", { class: "row" }, send, h("button", { class: "ghost", type: "button", onclick: function () { eng.editing = false; draw(); } }, "Cancel")));
    return c;
  }

  function milestonesCard(r) {
    var c = h("div", { class: "card" }, h("h2", { text: "Milestones" }));
    r.milestones.forEach(function (m) {
      var box = h("div", { class: "card", style: "padding:12px" },
        h("div", { class: "row" }, h("h3", { class: "grow", style: "margin:0", text: m.seq + ". " + m.title }), h("span", { class: "badge " + (m.status === "accepted" ? "ready" : m.status === "disputed" ? "bad" : "held"), text: MS_STATUS[m.status] || m.status })),
        h("p", { class: "small muted", text: (r.role === "attorney" && perMilestoneFee(r.agreement) ? threeLines(m.amount_cents, m.attorney_fee_cents || 0) : D.money(m.amount_cents)) + (r.role === "freelancer" ? (m.payout_cents === m.amount_cents ? " (you receive all of it; you pay no platform fee)" : " (you receive " + D.money(m.payout_cents) + " after the platform fee)") : "") + (m.due_date ? " | due " + dueText(m) : "") + (m.revisions_used ? " | rounds of changes used: " + m.revisions_used + " of " + r.limits.revisions : "") }));
      if (m.deliverables) box.appendChild(h("p", { class: "small", text: "Deliverables: " + m.deliverables }));
      if (m.payout) box.appendChild(h("p", { class: "small", text: "Payout: " + D.money(m.payout.amount_cents) + ", " + (m.payout.status === "sent" ? "sent to your bank" : m.payout.status === "held" ? (m.payout.held_reason === "payout_account" ? "waiting for your payout setup (Earnings page)" : "held") : m.payout.status === "failed" ? "did not go through. The Lawfecta Team is checking it" : "on its way") }));
      var last = (m.submissions || [])[m.submissions.length - 1];
      if (last) box.appendChild(submissionBlock(r, m, last));
      if (r.role === "freelancer") {
        if (m.status === "funded") box.appendChild(h("button", { class: "blue small", type: "button", onclick: function () {
          api.post("/milestones/start", { id: m.id }).then(engOk).then(function () { engReload("Started. Submit it here when it is done."); }).catch(engFail);
        } }, "Start this milestone"));
        if (m.status === "in_progress" || m.status === "changes_requested") box.appendChild(submitForm(m));
      }
      c.appendChild(box);
    });
    return c;
  }

  function submissionBlock(r, m, s) {
    var b = h("div", { style: "border-top:1px solid var(--line);margin-top:8px;padding-top:8px" },
      h("p", { class: "small" }, h("b", { text: "Submission " + s.n + ": " }), SUB_STATUS[s.status] || s.status, s.score !== null && s.score !== undefined ? " | DELA's score " + s.score + " of 100" : ""),
      h("p", { class: "small", style: "white-space:pre-wrap", text: s.statement }));
    (s.files || []).forEach(function (f) {
      if (f.gone) { b.appendChild(h("div", { class: "small muted", text: f.name + ": deleted after the time limit" })); return; }
      var row = h("div", { class: "row", style: "flex-wrap:wrap" }, h("span", { class: "grow small" }, f.name,
        f.saved ? h("span", { class: "small muted", text: " | saved to your library" }) : f.delete_at ? h("span", { class: "small muted", text: " | deleted on " + D.date(f.delete_at) + " unless saved" }) : null),
        h("button", { class: "ghost small", type: "button", onclick: function () {
          D.openTab(function () { return api.get("/deliverables/file?submission=" + s.id + "&file=" + f.file_id).then(engOk).then(function (x) { return x.url; }); }, engFail);
        } }, "Open"));
      if (r.role === "attorney" && !f.saved) row.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
        api.post("/deliverables/save", { submission_id: s.id, file_id: f.file_id }).then(engOk).then(function () { engReload("Saved to your Files page. DELA's AI never reads files from a job."); }).catch(engFail);
      } }, "Save to library"));
      b.appendChild(row);
    });
    if ((s.findings || []).length) {
      var d = h("details", { open: s.status === "failed" }, h("summary", { text: "DELA's check, point by point" }));
      d.appendChild(h("ul", null, s.findings.map(function (f) {
        return h("li", { class: "small" }, h("b", { text: (f.met === "yes" ? "Met" : f.met === "no" ? "Missing" : "Could not tell") + (f.required ? " (required)" : "") + ": " }), f.text + (f.evidence ? ". Evidence: " + f.evidence : "") + (f.note ? ". " + f.note : ""));
      })));
      d.appendChild(h("p", { class: "small muted", text: "DELA checks the submission against the agreed rubric. It does not decide whether legal work is correct; the attorney does." }));
      b.appendChild(d);
    }
    if (s.human_note) b.appendChild(h("p", { class: "small", text: "Lawfecta reviewer: " + s.human_note }));
    if (s.decision_note) b.appendChild(h("p", { class: "small", text: "Attorney: " + s.decision_note }));
    if (r.role === "freelancer" && s.status === "failed") b.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
      if (!confirm("Ask a Lawfecta reviewer to look at it instead of DELA? The target is 5 business days.")) return;
      api.post("/milestones/human", { id: s.id }).then(engOk).then(function () { engReload("Sent to a Lawfecta reviewer."); }).catch(engFail);
    } }, "Ask for a human review"));
    if (r.role === "attorney" && s.status === "with_attorney") {
      var note = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Note to the freelancer", placeholder: "What should change (needed to ask for changes), or a thank you" });
      b.appendChild(h("p", { class: "small", text: "Review it by " + D.dateTime(s.review_due_at) + ". Accepting releases the payment to the freelancer" + (r.milestones.some(function (x) { return x.seq > m.seq && (x.status === "pending" || x.status === "awaiting_funding"); }) ? " and charges the next milestone with your saved payment method." : ".") }));
      b.appendChild(note);
      var acc = h("button", { class: "blue small", type: "button" }, "Accept and release payment");
      acc.addEventListener("click", function () {
        if (!confirm("Accept milestone " + m.seq + " and release " + D.money(m.amount_cents) + " to the freelancer?")) return;
        acc.disabled = true;
        api.post("/milestones/decide", { submission_id: s.id, accept: true, note: note.value }).then(engOk).then(function (x) {
          var np = x.next_payment;
          if (np && np.url) { D.toast(app, "Accepted. Your saved payment method did not go through for the next milestone. Opening Stripe."); location.href = np.url; return; }
          engReload("Accepted. The payment is released" + (np && np.status === "succeeded" ? " and the next milestone is paid." : "."));
        }).catch(function (e) { acc.disabled = false; engFail(e); });
      });
      b.appendChild(h("div", { class: "row" }, acc, h("button", { class: "ghost small", type: "button", onclick: function () {
        api.post("/milestones/decide", { submission_id: s.id, accept: false, note: note.value }).then(engOk).then(function (x) { engReload("Changes requested. Rounds left: " + x.revisions_left + "."); }).catch(engFail);
      } }, "Ask for changes")));
    }
    return b;
  }

  function submitForm(m) {
    var files = [], list = h("div", { class: "small" });
    var st = h("textarea", { rows: 4, style: "width:100%", "aria-label": "Completion statement", placeholder: "What you did, where it is, and anything still open" });
    var pick = h("input", { type: "file", multiple: true, "aria-label": "Deliverable files" });
    var tick = h("input", { type: "checkbox", "aria-label": "These files contain no medical records, ID documents, account numbers, logins or biometric data" });
    var req = newId();
    pick.addEventListener("change", function () {
      if (!tick.checked) { D.toast(app, "Tick the box first: the files contain no medical records, ID documents, account numbers, logins or biometric data.", true); pick.value = ""; return; }
      [].slice.call(pick.files).forEach(function (file) {
        var line = h("div", { text: file.name + ": uploading" });
        list.appendChild(line);
        api.post("/milestones/upload/start", { name: file.name, size_bytes: file.size, ticked: true, request_id: newId() }).then(engOk).then(function (r) {
          return fetch(r.upload_url, { method: "PUT", headers: { "content-type": r.content_type, "x-upsert": "false" }, body: file }).then(function (up) {
            if (!up.ok) throw new Error("upload_failed");
            return api.post("/files/complete", { file_id: r.file_id });
          });
        }).then(function (c) {
          if (c.ok === false) throw c;
          if (c.status === "ready") { files.push(c.file_id); line.textContent = file.name + ": ready"; }
          else line.textContent = file.name + ": " + (c.status === "held" ? "held for a check. Remove client information and upload it again." : "not accepted");
        }).catch(function (e) { line.textContent = file.name + ": " + (e && e.reason ? engErr(e) : "the upload did not finish"); });
      });
      pick.value = "";
    });
    var go = h("button", { class: "blue small", type: "button" }, "Submit for DELA's check");
    go.addEventListener("click", function () {
      go.disabled = true; go.textContent = "DELA is checking it...";
      api.post("/milestones/submit", { milestone_id: m.id, statement: st.value, files: files, request_id: req }).then(engOk).then(function (x) {
        engReload(x.status === "with_attorney" ? "It passed DELA's check and is with the attorney." : x.status === "failed" ? "It did not pass DELA's check yet. See each point below." : "Sent to a Lawfecta reviewer, because DELA could not check it.");
      }).catch(function (e) { go.disabled = false; go.textContent = "Submit for DELA's check"; engFail(e); });
    });
    return h("div", { style: "border-top:1px solid var(--line);margin-top:8px;padding-top:8px" }, h("h3", { text: "Submit this milestone" }),
      field("Completion statement", st, "Say what you did and anything still open. The attorney and DELA read this."),
      h("label", { style: "display:flex;gap:8px;font-weight:400;margin:6px 0" }, tick, h("span", { text: "These files contain no medical records, ID documents, account numbers, logins or biometric data." })),
      h("p", { class: "small muted", style: "margin:0 0 6px", text: "DELA's check reads your notes and checklist, never the files; the attorney reviews the files. Files uploaded on a job are deleted after a set time unless the attorney saves them to the firm's library." }),
      field("Files (optional)", pick), list, h("div", { class: "row" }, go));
  }

  // Step 14: on an agreement whose fee is charged with each milestone payment, every payment reads as three amounts
  function money2(c) { return typeof c !== "number" || !isFinite(c) ? "-" : "$" + (c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function perMilestoneFee(a) { return !!a && a.attorney_fee_timing === "with_each_milestone"; }
  function threeLines(milestoneCents, feeCents) { return "Milestone " + money2(milestoneCents) + ", Lawfecta fee " + money2(feeCents) + ", Total " + money2(milestoneCents + feeCents); }
  function threeLinesList(milestoneCents, feeCents) {
    return h("ul", { class: "small fee-lines" }, h("li", { text: "Milestone " + money2(milestoneCents) }), h("li", { text: "Lawfecta fee " + money2(feeCents) }), h("li", null, h("b", { text: "Total " + money2(milestoneCents + feeCents) })));
  }
  function paymentsCard(r) {
    var per = perMilestoneFee(r.agreement);
    var PAY = { requires_payment: "Waiting for you", processing: "Being confirmed", succeeded: "Paid", failed: "Did not go through", canceled: "Canceled" };
    return h("div", { class: "card" }, h("h2", { text: "Your payments" }), h("ul", null, r.payments.map(function (p) {
      return h("li", { class: "small", text: D.date(p.created_at) + ": " + (per ? threeLines(p.amount_cents - (p.fee_cents || 0), p.fee_cents || 0) : D.money(p.amount_cents) + (p.fee_cents ? " (includes the platform fee " + D.money(p.fee_cents) + ")" : "")) + ", " + (PAY[p.status] || p.status) + (p.failure ? " (" + p.failure + ")" : "") });
    }).concat((r.refunds || []).filter(function (x) { return per || x.fee_cents; }).map(function (x) {
      return h("li", { class: "small", text: D.date(x.created_at) + ": Refund" + (x.seq ? " for milestone " + x.seq : "") + ": Milestone amount refunded " + money2(x.amount_cents - (x.fee_cents || 0)) + ", Lawfecta fee refunded " + money2(x.fee_cents || 0) + ", Total refunded " + money2(x.amount_cents) + ", " + (x.status === "succeeded" ? "Sent" : x.status === "failed" ? "Did not go through, the team is on it" : "On its way") });
    }))));
  }

  // Step 11 (docs/briefs/step-11-disputes.md): with the dispute center on, the card is a case view: both sides, links,
  // settlement offers that move the money when accepted, the dates, AI help, and the team's questions and decision.
  var DISPUTE_CAT = { not_delivered: "Not delivered", late: "Late", not_as_agreed: "Not what was agreed", quality: "Quality", not_accepted: "Payment or acceptance withheld", other: "Other" };
  var DISPUTE_KIND = { opening: "Opened the dispute", answer: "Answer", note: "Note", question: "Question from the Lawfecta Team", reply: "Answer to the Lawfecta Team" };
  var ROLE_WORD = { attorney: "Attorney", freelancer: "Freelancer", team: "Lawfecta Team" };
  function dollarsToCents(v) { var n = parseFloat(String(v || "").replace(/[$,\s]/g, "")); return isFinite(n) ? Math.round(n * 100) : null; }
  function disputeCard(r) {
    var c = h("div", { class: "card", id: "dispute-card" }, h("h2", null, D.term("Problems, disputes and canceling", "dispute")), h("p", { class: "muted small", text: "Loading..." }));
    api.get("/disputes/case?agreement=" + r.agreement.id).then(function (cs) {
      if (!cs || cs.ok === false || !cs.on) { var old = oldDisputeCard(r); c.replaceWith(old); return; }
      D.clear(c);
      c.appendChild(h("h2", null, D.term("Problems, disputes and canceling", "dispute")));
      disputeCase(c, r, cs);
    }).catch(function () { c.replaceWith(oldDisputeCard(r)); });
    return c;
  }
  function disputeState(d) {
    if (d.status === "withdrawn") return ["Withdrawn", "off"];
    if (d.status === "resolved") return [d.settled_by === "offer" ? "Settled by agreement" : d.settled_by === "auto" ? "Granted: no answer" : "Decided by the Lawfecta Team", "ready"];
    if (d.status === "team_review") return [d.question_open ? "Lawfecta Team review: question open" : "Lawfecta Team review", "R"];
    return [d.answered_at ? "Open: settle it yourselves" : "Open: waiting for an answer", "held"];
  }
  function disputeCase(c, r, cs) {
    var a = r.agreement, me = cs.role, other = me === "attorney" ? "freelancer" : "attorney";
    var list = cs.disputes || [], open = list.filter(function (d) { return d.status === "notice" || d.status === "team_review"; })[0];
    if (!list.length) c.appendChild(h("p", { class: "small muted", text: "Talk it through in Messages first. If you cannot agree, open a dispute: the money for that milestone stays held while you settle it. You have " + cs.notice_days + " days to settle it yourselves, then the Lawfecta Team decides. Lawfecta is not a court or an arbitrator." }));
    list.forEach(function (d) { c.appendChild(disputeBox(d, r, cs, me, other)); });
    if (!open && ["active", "signed", "paused"].indexOf(a.status) >= 0) c.appendChild(disputeOpenForm(r, cs, me));
    if (r.monthly || a.status === "completed" || a.status === "canceled") return;
    c.appendChild(cancelPart(a));
  }
  function disputeBox(d, r, cs, me, other) {
    var st = disputeState(d), live = d.status === "notice" || d.status === "team_review", m = d.milestone || {};
    var box = h("div", { class: "card", style: "margin:10px 0;padding:14px", "data-dispute": d.id },
      h("div", { class: "row", style: "flex-wrap:wrap;gap:8px" }, h("b", { class: "grow", text: "Dispute about milestone " + (m.seq || "") + ". " + (m.title || "") + " (" + D.money(m.amount_cents || 0) + ")" }), h("span", { class: "badge " + st[1], text: st[0] })));
    var askedBy = ROLE_WORD[d.opened_by_role] || "";
    var wantWords = d.wants_release_cents === null || d.wants_release_cents === undefined ? "" : " They ask for " + D.money(d.wants_release_cents) + " to the freelancer and " + D.money((m.amount_cents || 0) - d.wants_release_cents) + " back to the attorney.";
    box.appendChild(h("p", { class: "small", text: "Opened by the " + askedBy.toLowerCase() + ": " + (DISPUTE_CAT[d.category] || "Problem") + "." + wantWords }));
    // The dates
    var dates = [];
    if (d.status === "notice") {
      if (!d.answered_at) dates.push((me === d.opened_by_role ? "The other side answers by " : "Give your side by ") + D.date(d.answer_due_at) + ".");
      dates.push((d.answered_at ? "Settle it yourselves by " : "If there is no answer, the request is granted on ") + D.dateTime(d.notice_ends_at) + (d.answered_at ? ". After that the Lawfecta Team decides." : "."));
    } else if (d.status === "team_review") {
      dates.push(d.question_open ? "The Lawfecta Team asked a question. Its clock waits for the answer." : "The Lawfecta Team decides by " + D.date(d.review_due_at) + ". You can still settle it with an offer until then.");
    } else if (d.status === "resolved") {
      dates.push(D.money(d.release_cents || 0) + " went to the freelancer and " + D.money(d.refund_cents || 0) + " back to the attorney on " + D.date(d.resolved_at) + "." + (d.settled_by === "team" && d.resolution_note ? " The Lawfecta Team's note: " + d.resolution_note : ""));
    }
    dates.forEach(function (t) { box.appendChild(h("p", { class: "small", text: t })); });
    // Both sides, in order
    if ((d.statements || []).length) box.appendChild(h("div", { class: "dispute-thread" }, d.statements.map(function (x) {
      return h("div", { class: "msg" + (x.mine ? " mine" : ""), style: "margin:6px 0" }, h("div", { class: "small muted", text: (x.mine ? "You" : ROLE_WORD[x.role]) + " | " + (DISPUTE_KIND[x.kind] || "") + " | " + D.dateTime(x.at) }), h("div", { text: x.body }));
    })));
    if ((d.evidence || []).length) box.appendChild(h("div", null, h("b", { class: "small", text: "Links" }), h("ul", { class: "small" }, d.evidence.map(function (e) {
      return h("li", null, (e.mine ? "You: " : ROLE_WORD[e.role] + ": "), h("a", { href: e.url, target: "_blank", rel: "noopener noreferrer", text: e.label }));
    }))));
    // Offers
    var offers = d.offers || [];
    if (offers.length) box.appendChild(h("div", null, h("b", { class: "small", text: "Offers" }), offers.slice().reverse().map(function (o) {
      var row = h("div", { class: "row small", style: "flex-wrap:wrap;gap:8px;margin:4px 0" }, h("span", { class: "grow", text: (o.mine ? "Your offer" : "The " + o.from_role + "'s offer") + ": " + D.money(o.release_cents) + " to the freelancer, " + D.money(o.refund_cents) + " back to the attorney" + (o.note ? " (" + o.note + ")" : "") }),
        h("span", { class: "badge " + ({ open: "held", accepted: "ready" }[o.status] || "off"), text: { open: "Open", accepted: "Accepted", withdrawn: "Withdrawn", replaced: "Replaced", closed: "Closed" }[o.status] || o.status }));
      if (live && o.status === "open" && !o.mine) row.appendChild(h("button", { class: "blue small", type: "button", onclick: function () {
        if (!confirm("Accept this offer? " + D.money(o.release_cents) + " goes to the freelancer and " + D.money(o.refund_cents) + " back to the attorney now. This settles the dispute.")) return;
        api.post("/disputes/offer/accept", { id: o.id }).then(engOk).then(function () { engReload("Settled. The money moves now."); }).catch(engFail);
      } }, "Accept the offer"));
      if (live && o.status === "open" && o.mine) row.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
        api.post("/disputes/offer/withdraw", { id: o.id }).then(engOk).then(function () { engReload("Offer withdrawn."); }).catch(engFail);
      } }, "Withdraw my offer"));
      return row;
    })));
    if (!live) return box;
    // What I can do now
    var asked = (d.statements || []).some(function (x) { return x.kind === "question" && (x.to_role === me || x.to_role === "both"); }) && d.question_open;
    var answering = me !== d.opened_by_role && !(d.statements || []).some(function (x) { return x.kind === "answer"; });
    var say = h("textarea", { rows: 3, style: "width:100%", "aria-label": asked ? "Answer the Lawfecta Team" : answering ? "Your side" : "Add a note" });
    var sayBox = h("div", { style: "margin-top:10px" }, aiNotice(), field(asked ? "Answer the Lawfecta Team" : answering ? "Your side" : "Add a note", say),
      h("button", { class: answering || asked ? "blue small" : "ghost small", type: "button", onclick: function () {
        api.post("/disputes/say", { id: d.id, body: say.value }).then(engOk).then(function () { engReload("Sent. Both of you can read it here."); }).catch(engFail);
      } }, answering ? "Send my side" : "Send"));
    box.appendChild(sayBox);
    var amt = h("input", { inputmode: "decimal", "aria-label": "Amount to the freelancer ($)", style: "width:140px", placeholder: "0.00" });
    var rest = h("span", { class: "small muted" });
    function showRest() { var c2 = dollarsToCents(amt.value); rest.textContent = c2 === null ? "" : "and " + D.money(Math.max((m.amount_cents || 0) - c2, 0)) + " back to the attorney"; }
    amt.addEventListener("input", showRest);
    var note = h("input", { "aria-label": "Note with the offer (optional)", style: "width:100%" });
    var aiOut = h("div");
    box.appendChild(h("details", { style: "margin-top:10px" }, h("summary", { text: "Settle it: send an offer" }),
      h("p", { class: "small", text: "An offer splits the " + D.money(m.amount_cents || 0) + " between the freelancer and the attorney. When the other side accepts, the dispute is settled and the money moves at once. " + (perMilestoneFee(r.agreement) ? "The attorney also gets back the same share of the Lawfecta fee paid on this milestone." : "The attorney's platform fee is not refunded.") }),
      h("div", { class: "row", style: "flex-wrap:wrap;gap:8px;align-items:center" }, field("Amount to the freelancer ($)", amt), rest), field("Note with the offer (optional)", note),
      h("div", { class: "row", style: "flex-wrap:wrap;gap:8px" },
        h("button", { class: "blue small", type: "button", onclick: function () {
          var c2 = dollarsToCents(amt.value);
          if (c2 === null) { D.toast(app, "Type the amount to the freelancer in dollars.", true); return; }
          api.post("/disputes/offer", { id: d.id, release_cents: c2, note: note.value }).then(engOk).then(function () { engReload("Offer sent. The other side was told."); }).catch(engFail);
        } }, "Send the offer"),
        h("button", { class: "ghost small", type: "button", onclick: function () { disputeAi(d, r, "suggest", aiOut, function (x) { amt.value = (x.release_cents / 100).toFixed(2); showRest(); }); } }, "✦ Suggest a fair offer"),
        h("button", { class: "ghost small", type: "button", onclick: function () { disputeAi(d, r, "summary", aiOut); } }, "✦ Summarize both sides")),
      aiOut));
    var label = h("input", { "aria-label": "What the link is", style: "width:100%", placeholder: "For example: Delivery email" });
    var url = h("input", { "aria-label": "Secure link (https://)", style: "width:100%", placeholder: "Paste a link from your own storage" });
    box.appendChild(h("details", null, h("summary", { text: "Add a link" }),
      h("p", { class: "small muted", text: "Share a link from your own storage. Never upload sensitive data such as ID numbers, account numbers or health information." }),
      field("What the link is", label), field("Secure link (https://)", url),
      h("button", { class: "ghost small", type: "button", onclick: function () {
        api.post("/disputes/link", { id: d.id, label: label.value, url: url.value }).then(engOk).then(function () { engReload("Link added."); }).catch(engFail);
      } }, "Add the link")));
    if (d.mine) box.appendChild(h("button", { class: "ghost small", type: "button", style: "margin-top:8px", onclick: function () {
      if (!confirm("Withdraw the dispute? The engagement goes on and the milestone goes back to normal.")) return;
      api.post("/disputes/withdraw", { id: d.id }).then(engOk).then(function () { engReload("Withdrawn."); }).catch(engFail);
    } }, "Withdraw the dispute"));
    return box;
  }
  function disputeAi(d, r, kind, out, use) {
    D.clear(out); out.appendChild(h("p", { class: "small muted", text: "DELA is reading both sides..." }));
    api.post("/disputes/ai", { id: d.id, agreement_id: r.agreement.id, kind: kind }).then(engOk).then(function (x) {
      D.clear(out);
      var p = h("div", { class: "soft", style: "margin-top:8px" }, D.aiLabel());
      if (kind === "summary") {
        p.appendChild(h("p", { text: x.summary }));
        if ((x.agreed || []).length) p.appendChild(h("div", { class: "small" }, h("b", { text: "You seem to agree on: " }), x.agreed.join("; ")));
        if ((x.open || []).length) p.appendChild(h("div", { class: "small" }, h("b", { text: "Still open: " }), x.open.join("; ")));
      } else {
        p.appendChild(h("p", { text: "Suggested: " + D.money(x.release_cents) + " to the freelancer and " + D.money(x.refund_cents) + " back to the attorney. " + (x.why || "") }));
        if (use) p.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { use(x); } }, "Use suggestion"));
      }
      p.appendChild(h("p", { class: "small muted", text: x.note + (x.credits ? " Used " + x.credits + " DELA action" + (x.credits === 1 ? "" : "s") + "." : "") }));
      out.appendChild(p);
    }).catch(function (e) { D.clear(out); engFail(e); });
  }
  function disputeOpenForm(r, cs, me) {
    var ms = h("select", { "aria-label": "Which milestone" }, [h("option", { value: "", text: "Choose" })].concat((r.milestones || []).filter(function (m) { return ["funded", "in_progress", "submitted", "changes_requested"].indexOf(m.status) >= 0; }).map(function (m) { return h("option", { value: m.id, text: m.seq + ". " + m.title + " (" + D.money(m.amount_cents) + ")" }); })));
    var cat = h("select", { "aria-label": "What went wrong" }, [h("option", { value: "", text: "Choose" })].concat(Object.keys(DISPUTE_CAT).filter(function (k) { return me === "freelancer" ? k !== "not_delivered" && k !== "late" && k !== "quality" : k !== "not_accepted"; }).map(function (k) { return h("option", { value: k, text: DISPUTE_CAT[k] }); })));
    var wants = h("select", { "aria-label": "What you are asking for" }, me === "attorney"
      ? [h("option", { value: "refund", text: "A full refund of the milestone" }), h("option", { value: "split", text: "Part back, part to the freelancer" })]
      : [h("option", { value: "release", text: "The full milestone paid to me" }), h("option", { value: "split", text: "Part to me, part back to the attorney" })]);
    var part = h("input", { inputmode: "decimal", "aria-label": "Amount to the freelancer ($)", style: "width:140px", placeholder: "0.00" });
    var partField = field("Amount to the freelancer ($)", part);
    partField.hidden = true;
    wants.addEventListener("change", function () { partField.hidden = wants.value !== "split"; });
    var why = h("textarea", { rows: 3, style: "width:100%", "aria-label": "What happened" });
    return h("details", null, h("summary", { text: "Open a dispute" }),
      h("p", { class: "small", text: "The money for that milestone stays held. The other side has " + cs.answer_days + " days to answer. If they never answer, your request is granted after " + cs.notice_days + " days. You can settle it together with an offer at any time; otherwise the Lawfecta Team decides within " + cs.team_days + " business days." }),
      field("Milestone", ms), field("What went wrong", cat), field("What you are asking for", wants), partField, aiNotice(), field("What happened", why),
      h("button", { class: "ghost small", type: "button", onclick: function () {
        api.post("/disputes/open", { id: r.agreement.id, milestone_id: ms.value || null, category: cat.value, wants: wants.value, release_cents: wants.value === "split" ? dollarsToCents(part.value) : null, reason: why.value })
          .then(engOk).then(function () { engReload("The dispute is open. The other side was asked to answer."); }).catch(engFail);
      } }, "Open the dispute"));
  }
  function cancelPart(a) {
    var reason = h("input", { "aria-label": "Why cancel", style: "width:100%" });
    return h("details", null, h("summary", { text: "Cancel the engagement" }),
      h("p", { class: "small", text: (perMilestoneFee(a) ? "A paid milestone not yet submitted is refunded together with the Lawfecta fee paid on it. Accepted milestones stay paid with their fee." : "Before work starts on the first milestone, the attorney is refunded in full, platform fee included. After that, a paid milestone not yet submitted is refunded, accepted milestones stay paid, and the attorney's platform fee is kept.") + " A milestone under review cannot be canceled; open a dispute instead." }),
      field("Why", reason), h("button", { class: "ghost small", type: "button", onclick: function () {
        if (!confirm("Cancel this engagement? This cannot be undone.")) return;
        api.post("/engagements/cancel", { id: a.id, reason: reason.value }).then(engOk).then(function (x) { engReload("Canceled." + (x.refunds ? " " + x.refunds + " paid milestone" + (x.refunds === 1 ? " is" : "s are") + " refunded to the attorney." : "")); }).catch(engFail);
      } }, "Cancel the engagement"));
  }
  function oldDisputeCard(r) {
    var a = r.agreement, c = h("div", { class: "card" }, h("h2", null, D.term("Problems, disputes and canceling", "dispute")));
    var open = (r.disputes || []).filter(function (d) { return d.status === "notice" || d.status === "team_review"; })[0];
    (r.disputes || []).forEach(function (d) {
      c.appendChild(h("p", { class: "small", text: (d.status === "notice" ? "Open dispute: talk it through in Messages until " + D.dateTime(d.notice_ends_at) + ", then the Lawfecta Team reviews it." : d.status === "team_review" ? "The Lawfecta Team is reviewing the dispute." : d.status === "resolved" ? "Decided: " + d.resolution_note + " (" + D.money(d.release_cents) + " to the freelancer, " + D.money(d.refund_cents) + " back to the attorney)" : "Withdrawn.") + " Reason given: " + d.reason }));
      if (d.mine && (d.status === "notice" || d.status === "team_review")) c.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
        if (!confirm("Withdraw the dispute? The engagement goes on.")) return;
        api.post("/disputes/withdraw", { id: d.id }).then(engOk).then(function () { engReload("Withdrawn."); }).catch(engFail);
      } }, "Withdraw the dispute"));
    });
    if (a.status === "completed" || a.status === "canceled") return c;
    c.appendChild(h("p", { class: "small muted", text: "Talk it through in Messages first. A dispute holds the money in question for " + ((r.current && r.current.body && r.current.body.limits && r.current.body.limits.dispute_days) || 14) + " days while you try to settle it, then the Lawfecta Team decides. Lawfecta is not a court or an arbitrator." }));
    if (!open && (a.status === "active" || a.status === "signed" || a.status === "paused")) {
      var ms = h("select", { "aria-label": "Which milestone" }, (r.milestones || []).filter(function (m) { return ["funded", "in_progress", "submitted", "changes_requested"].indexOf(m.status) >= 0; }).map(function (m) { return h("option", { value: m.id, text: m.seq + ". " + m.title }); }));
      var why = h("textarea", { rows: 2, style: "width:100%", "aria-label": "What is the problem" });
      c.appendChild(h("details", null, h("summary", { text: "Open a dispute" }), field("Milestone", ms), field("What is the problem", why),
        h("button", { class: "ghost small", type: "button", onclick: function () {
          api.post("/disputes/open", { id: a.id, milestone_id: ms.value || null, reason: why.value }).then(engOk).then(function () { engReload("The dispute is open. Both of you were told."); }).catch(engFail);
        } }, "Open the dispute")));
    }
    // A monthly engagement is canceled or ended early from the monthly card only
    if (r.monthly) return c;
    var reason = h("input", { "aria-label": "Why cancel", style: "width:100%" });
    c.appendChild(h("details", null, h("summary", { text: "Cancel the engagement" }),
      h("p", { class: "small", text: (perMilestoneFee((r.agreement || {})) ? "A paid milestone not yet submitted is refunded together with the Lawfecta fee paid on it. Accepted milestones stay paid with their fee." : "Before work starts on the first milestone, the attorney is refunded in full, platform fee included. After that, a paid milestone not yet submitted is refunded, accepted milestones stay paid, and the attorney's platform fee is kept.") + " A milestone under review cannot be canceled; open a dispute instead." }),
      field("Why", reason), h("button", { class: "ghost small", type: "button", onclick: function () {
        if (!confirm("Cancel this engagement? This cannot be undone.")) return;
        api.post("/engagements/cancel", { id: a.id, reason: reason.value }).then(engOk).then(function (x) { engReload("Canceled." + (x.refunds ? " " + x.refunds + " paid milestone" + (x.refunds === 1 ? " is" : "s are") + " refunded to the attorney." : "")); }).catch(engFail);
      } }, "Cancel the engagement")));
    return c;
  }

  // Freelancer payouts through Stripe's own setup page
  function payoutCard(acct, short) {
    var st = (acct && acct.status) || "none";
    var c = h("div", { class: "card" }, h("h2", { text: "Payouts to your bank" }));
    var note = h("div");
    var WORDS = { none: "Not set up yet. Accepted milestones wait until you set up payouts.", pending: "Stripe needs a few more details before it can pay you.", restricted: "Stripe has paused payouts until it gets more details.", ready: "Ready. Accepted milestones are paid to your bank through Stripe." };
    c.appendChild(h("p", null, h("span", { class: "badge " + (st === "ready" ? "ready" : "held"), text: st === "ready" ? "Ready" : st === "none" ? "Not set up" : "Needs details" }), " ", WORDS[st] || ""));
    if (acct && (acct.requirements || []).length) c.appendChild(h("p", { class: "small muted", text: "Stripe still needs: " + acct.requirements.map(function (x) { return String(x).split(".").pop().split("_").join(" "); }).join(", ") }));
    if (st !== "ready") c.appendChild(h("button", { class: "blue small", type: "button", onclick: function () {
      var btn = this; btn.disabled = true; D.clear(note);
      api.post("/payouts/setup", {}).then(engOk).then(function (x) { location.href = x.url; }).catch(function (e) {
        // The message stays on the card (the first Stripe run, 2026-11-10: a short message at the bottom of the screen was missed)
        btn.disabled = false; note.appendChild(h("p", { class: "notice bad", role: "alert", text: e && e.reason ? engErr(e) : D.errorText(e && e.message ? e.message : String(e)) }));
      });
    } }, st === "none" ? "Set up payouts with Stripe" : "Finish payout setup"));
    c.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
      // The card is updated in place (the payout re-test, 2026-11-11: the whole page went blank for a few seconds)
      var chk = this; chk.disabled = true;
      api.get("/payouts/refresh").then(engOk).then(function (x) {
        var fresh = payoutCard(x.account, short);
        if (c.parentNode) c.parentNode.replaceChild(fresh, c);
        D.toast(app, (x.account || {}).status === "ready" ? "Payouts are ready." : "Checked with Stripe. Nothing has changed yet.");
      }).catch(function (e) { chk.disabled = false; engFail(e); });
    } }, "Check my payout status"));
    c.appendChild(note);
    if (!short) c.appendChild(h("p", { class: "small muted", text: "You enter your bank details on Stripe's secure page. DELA never sees them." }));
    return c;
  }

  // The list of engagements on Projects (attorney), Work and Earnings (freelancer).
  // It fills a place kept for it when the page was drawn, so the cards never move after loading.
  function engagementsList(slot, title, onLoad) {
    api.get("/engagements").then(function (r) {
      if (!r.ok || !r.on || !(r.engagements || []).length) return;
      if (onLoad) onLoad(r.engagements);
      var c = h("div", { class: "card" }, h("h2", { text: title + " (" + r.engagements.length + ")" }));
      // UX review 2026-11-08: on a long list, finished and canceled engagements fold away under the ones still running
      var isPast = function (e) { return e.status === "completed" || e.status === "canceled"; };
      var past = r.engagements.filter(isPast), fold = past.length > 3 ? h("details", { class: "eng-past" }, h("summary", { text: "Finished and canceled (" + past.length + ")" })) : null;
      r.engagements.filter(function (e) { return !fold || !isPast(e); }).concat(fold ? past : []).forEach(function (e) {
        (fold && isPast(e) ? fold : c).appendChild(h("div", { class: "work", style: "cursor:pointer", role: "button", tabindex: "0", onclick: function () { gigs.id = e.gig_id; gigs.view = "agreement"; tab = me.side === "attorney" ? "projects" : "work"; draw(); } },
          h("div", null, h("h3", { text: e.gig_title }), h("div", { class: "small muted", text: (me.side === "attorney" ? "Freelancer: " : "Client: ") + (e.other_name || "") + " | " + D.money(e.total_cents) + (e.milestones ? " | milestones accepted " + e.accepted + " of " + e.milestones : (["draft", "sent", "signing"].indexOf(e.status) >= 0 ? " | milestones set when you both sign" : "")) + (me.side === "freelancer" && e.earned_cents ? " | paid to you " + D.money(e.earned_cents) : "") })),
          h("span", { class: "grow" }), agBadge(e)));
      });
      if (fold) c.appendChild(fold);
      slot.appendChild(c);
    }).catch(function () {});
  }

  function saveB64(name, type, b64) {
    var blob = new Blob([Uint8Array.from(atob(b64), function (ch) { return ch.charCodeAt(0); })], { type: type });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    D.toast(app, "Downloaded " + name);
  }

  function earningsView() {
    var el = h("div", null, h("h1", { text: "Earnings" }), h("p", { class: "muted", text: "Loading..." }));
    api.get("/engagements").then(function (r) {
      D.clear(el);
      el.appendChild(h("h1", { text: "Earnings" }));
      if (!r.ok || !r.on) { el.appendChild(h("p", { class: "notice", text: ENG_ERR.engagements_off })); return; }
      var list = r.engagements || [];
      var paid = list.reduce(function (a, e) { return a + (e.earned_cents || 0); }, 0);
      el.appendChild(h("div", { class: "kv" }, h("div", null, "Paid to you", h("b", { text: D.money(paid) })), h("div", null, "Engagements", h("b", { text: String(list.length) }))));
      el.appendChild(payoutCard(r.payout_account, false));
      var c = h("div", { class: "card" }, h("h2", { text: "Your engagements" }));
      if (!list.length) c.appendChild(h("p", { class: "muted", text: "No engagements yet. When an attorney chooses your proposal, the agreement and its milestones show here." }));
      list.forEach(function (e) {
        c.appendChild(h("div", { class: "work", style: "cursor:pointer", role: "button", tabindex: "0", onclick: function () { gigs.id = e.gig_id; gigs.view = "agreement"; tab = "work"; draw(); } },
          h("div", null, h("h3", { text: e.gig_title }), h("div", { class: "small muted", text: "Client: " + (e.other_name || "") + " | " + D.money(e.total_cents) + (e.milestones ? " | milestones accepted " + e.accepted + " of " + e.milestones : (["draft", "sent", "signing"].indexOf(e.status) >= 0 ? " | milestones set when you both sign" : "")) + " | paid to you " + D.money(e.earned_cents) })),
          h("span", { class: "grow" }), agBadge(e)));
      });
      el.appendChild(c);
      // Back from Stripe's setup page. Stripe takes a few seconds to finish its own checks (the payout re-test, 2026-11-11:
      // the card still said "Needs details" until "Check my payout status" was clicked), so DELA asks again for a short
      // while and says so, then shows the new status by itself.
      try {
        var q = new URLSearchParams(location.search).get("payout");
        if (q === "done" || q === "again") {
          try { history.replaceState(null, "", location.pathname + location.search.split("&payout=" + q).join("") + location.hash); } catch (e2) { /* the address stays as it is */ }
          if ((r.payout_account || {}).status !== "ready") {
            var wait = h("p", { class: "notice", role: "status", text: "Stripe is checking your details. This card updates by itself in a few seconds." });
            el.insertBefore(wait, el.children[2] || null);
            var tries = 0;
            var again = function () {
              tries++;
              api.get("/payouts/refresh").then(function (x) {
                if (x && x.ok && x.account && x.account.status === "ready") { draw(); return; }
                if (tries < 8) setTimeout(again, 4000);
                else wait.textContent = "Stripe has not finished yet. Click \"Check my payout status\" below in a minute.";
              }).catch(function () { if (tries < 8) setTimeout(again, 4000); });
            };
            again();
          }
        }
      } catch (e) { /* no deep link */ }
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    return el;
  }

  // ---------- Step 7: reviews, past-client reviews, the bench, webhooks ----------
  var REV_Q = {
    of_freelancer: [["quality", "Quality of the work"], ["deadlines", "Met the deadlines"], ["communication", "Communication"], ["followed_playbook", "Followed the document"]],
    of_attorney: [["instructions", "Clear instructions"], ["timely_review", "Timely review and feedback"], ["fair_changes", "Fair requests for changes"], ["communication", "Communication"]],
  };
  var REV_ERR = {
    reviews_off: "Reviews are not open for your account yet.", not_completed: "Reviews open when the engagement is complete.", rate_every_question: "Choose a rating for every question.",
    say_would_again: "Choose yes or no for working together again.", write_a_little: "Write a few words.", review_time_over: "The time to write a review for this engagement is over.",
    edit_time_over: "The time to edit this is over.", review_removed: "This review was removed, so it cannot be edited.", already_appealed: "You already appealed this decision.",
    appeal_time_over: "The time to appeal is over.", past_reviews_off: "Reviews from past clients are not open for your account yet.", bad_email: "Check the email address.",
    name_needed: "Type their name.", not_yourself: "Ask someone else: you cannot review yourself.", opted_out: "This person asked not to get review requests.",
    bench_off: "The bench is not open for your account yet.", firm_bench_business_only: "A firm bench comes with the Business plan.", owner_or_manager_only: "Only the firm owner or a manager can add to the firm bench.",
    webhooks_off: "Webhooks are not open for your account yet.", https_only: "Use an address that starts with https://", private_address: "That address points inside a private network, so DELA cannot send to it.",
    address_not_found: "DELA could not find that address. Check it.", port_not_allowed: "Use the standard https port (no :number in the address).", bad_url: "Check the address.",
    choose_events: "Choose at least one event.", not_set_up: "Webhooks are not set up on this site yet.", link_not_valid: "This link is not valid.", link_expired: "This link has expired.",
    already_reviewed: "Thank you. This review was already sent.", bad_state: "Use the two-letter state of your license, for example TX.", bad_bar_number: "Check your bar number (letters, numbers and dashes).",
    confirm_needed: "Tick the box to confirm.", project_closed: "This engagement is complete, so its conversation is read only. Use your bench conversation to keep in touch.",
  };
  function revErr(r) {
    if (r && r.reason === "limit_reached" && r.period) return "You reached the limit of " + r.limit + " requests " + (r.period === "month" ? "this month" : "in total") + ".";
    if (r && r.reason === "limit_reached" && r.limit !== undefined) return "Your plan allows " + r.limit + (r.limit === 1 ? " endpoint" : " endpoints") + ".";
    if (r && r.reason === "asked_recently") return "You asked this person recently. You can ask again after " + r.days + " days.";
    return (r && REV_ERR[r.reason]) || engErr(r);
  }
  function revFail(e) { D.toast(app, e && e.reason ? revErr(e) : D.errorText(e && e.message ? e.message : String(e)), true); }
  function stars(n) { return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }

  function ratingInputs(dir, current) {
    var sels = {};
    var box = h("div", null, REV_Q[dir].map(function (q) {
      var s = h("select", { "aria-label": q[1] }, [h("option", { value: "", text: "Choose" })].concat([5, 4, 3, 2, 1].map(function (n) { return h("option", { value: String(n), text: stars(n) + " (" + n + ")", selected: current && current[q[0]] === n }); })));
      sels[q[0]] = s;
      return h("div", { class: "row", style: "margin:4px 0" }, h("span", { class: "grow", text: q[1] }), s);
    }));
    box.read = function () { var o = {}; Object.keys(sels).forEach(function (k) { o[k] = sels[k].value ? Number(sels[k].value) : null; }); return o; };
    return box;
  }

  function reviewBlock(x, dir) {
    return h("div", { class: "card", style: "padding:10px;margin:6px 0" },
      h("div", { class: "small muted", text: [x.by, x.month || (x.created_at ? D.date(x.created_at) : ""), x.practice_area, x.state].filter(Boolean).join(" | ") + (x.edited ? " | Edited" : "") }),
      h("div", { class: "small", text: REV_Q[dir].map(function (q) { return q[1] + " " + stars(x.ratings[q[0]] || 0); }).join("  ·  ") }),
      h("div", { class: "small", text: x.would_again ? (dir === "of_freelancer" ? "Would hire again: yes" : "Would work with again: yes") : (dir === "of_freelancer" ? "Would hire again: no" : "Would work with again: no") }),
      h("p", { style: "white-space:pre-wrap;margin:6px 0 0", text: x.body }),
      x.response ? h("p", { class: "small", style: "margin:6px 0 0;padding-left:10px;border-left:3px solid var(--line)", text: "Response: " + x.response }) : null);
  }

  // Reviews of one member, for a signed-in member (platform reviews, then past clients in their own section)
  function reviewsList(host, r, side) {
    var dir = side === "freelancer" ? "of_freelancer" : "of_attorney";
    if (!r.on) { host.appendChild(h("p", { class: "muted", text: REV_ERR.reviews_off })); return; }
    host.appendChild(h("p", { text: r.count + (r.count === 1 ? " review" : " reviews") + " from completed Lawfecta engagements." + (r.averages ? "" : r.count ? " Averages show after " + r.min_for_average + " reviews." : "") }));
    if (r.averages) host.appendChild(h("div", { class: "kv" }, REV_Q[dir].map(function (q) { return h("div", null, q[1], h("b", { text: r.averages[q[0]] + " of 5" })); }).concat([h("div", null, dir === "of_freelancer" ? "Would hire again" : "Would work with again", h("b", { text: r.would_again_pct + "%" }))])));
    (r.reviews || []).forEach(function (x) { host.appendChild(reviewBlock(x, dir)); });
    if (r.past_clients && r.past_clients.length) {
      host.appendChild(h("h3", { text: "From past clients (outside Lawfecta)" }));
      host.appendChild(h("p", { class: "small muted", text: "Lawfecta confirmed the reviewer is an attorney, not the work itself. These are not counted in the numbers above." }));
      r.past_clients.forEach(function (x) { host.appendChild(reviewBlock(x, "of_freelancer")); });
    }
  }

  function showReviews(query, side, name) {
    var el = h("div", { class: "drawer", role: "dialog", "aria-label": "Reviews" }, h("h2", { text: "Reviews: " + name }), h("p", { class: "muted", text: "Loading..." }));
    showDrawer(el);
    api.get("/reviews/of?" + query).then(function (r) {
      [].slice.call(el.children).forEach(function (c) { if (!c.classList.contains("drawer-top")) c.remove(); });
      el.appendChild(h("h2", { text: "Reviews: " + name }));
      if (!r.ok) { el.appendChild(h("p", { class: "notice", text: revErr(r) })); return; }
      reviewsList(el, r, side);
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }
  function reviewsButton(personId, side, name) {
    if (!(me.switches || {}).reviews) return null;
    return h("button", { class: "ghost small", type: "button", onclick: function () { showReviews("person=" + personId + "&side=" + side, side, name); } }, "Reviews");
  }

  // The closeout and reviews on a completed engagement (both sides), and the bench invitation (attorney)
  function closeoutCard(r) {
    var ms = r.milestones || [];
    var paid = ms.reduce(function (s, m) { return s + (m.status === "accepted" ? m.amount_cents : 0); }, 0);
    var out = ms.reduce(function (s, m) { return s + (m.payout && m.payout.status === "sent" ? m.payout.amount_cents : 0); }, 0);
    var open = ms.filter(function (m) { return m.status !== "accepted" && m.status !== "canceled"; }).length + (r.disputes || []).filter(function (d) { return d.status === "notice" || d.status === "team_review"; }).length;
    return h("div", { class: "card" }, h("h2", { text: "Closeout" }), h("div", { class: "kv" },
      h("div", null, "Milestones accepted", h("b", { text: ms.filter(function (m) { return m.status === "accepted"; }).length + " of " + ms.length })),
      h("div", null, "Paid for the work", h("b", { text: D.money(paid) })),
      h("div", null, "Paid out to the freelancer", h("b", { text: D.money(out) })),
      h("div", null, "Still open", h("b", { text: open ? String(open) : "Nothing" }))),
      h("p", { class: "small muted", text: "The conversation for this engagement is now read only. Everything stays readable here." }));
  }

  function reviewPanel(host, r) {
    var box = h("div", { class: "card" }, h("p", { class: "muted", text: "Loading reviews..." }));
    host.appendChild(box);
    api.get("/reviews/state?agreement=" + r.agreement.id).then(function (st) {
      D.clear(box);
      if (!st.ok || !st.on) { box.remove(); return; }
      var dir = st.direction, other = r.role === "attorney" ? "the freelancer" : "the attorney";
      box.appendChild(h("h2", { text: "Reviews" }));
      // Mine
      if (st.mine) {
        box.appendChild(h("h3", { text: "Your review of " + other }));
        if (st.mine.status === "held") box.appendChild(h("p", { class: "notice", text: "Your review is with the Lawfecta Team for a quick check before it is published." }));
        if (st.mine.status === "removed") {
          box.appendChild(h("p", { class: "notice bad", text: "Your review was not published or was removed by the Lawfecta Team." + (st.mine.appeal_status === "open" ? " Your appeal is with the team." : st.mine.appeal_status === "upheld" ? " The decision stayed after your appeal." : "") }));
          if (st.mine.can_appeal) {
            var ap = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Why the decision should change" });
            box.appendChild(field("Appeal (once)", ap));
            box.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
              api.post("/reviews/appeal", { review_id: st.mine.id, text: ap.value }).then(engOk).then(function () { engReload("Appeal sent to the Lawfecta Team."); }).catch(revFail);
            } }, "Send the appeal"));
          }
        }
        box.appendChild(reviewBlock(st.mine, dir));
        if (st.mine.can_edit) box.appendChild(reviewForm(r, st, st.mine, "Save the change"));
      } else if (st.can_write) {
        box.appendChild(h("p", { text: "How was working with " + other + "? Your review publishes straight away, and " + other + " can post one response. It is never needed to get paid or to keep access. You can write it until " + D.date(st.write_until) + "." }));
        box.appendChild(reviewForm(r, st, null, "Publish my review"));
      } else if (st.completed) box.appendChild(h("p", { class: "small muted", text: "The time to write a review for this engagement is over." }));
      // About me
      if (st.about_me) {
        box.appendChild(h("h3", { text: "The review " + other + " wrote about you" }));
        box.appendChild(reviewBlock(st.about_me, dir === "of_freelancer" ? "of_attorney" : "of_freelancer"));
        if (st.about_me.can_respond) {
          var resp = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Your public response" });
          resp.value = st.about_me.response_status === "published" ? st.about_me.response : "";
          box.appendChild(field("Your public response (one)", resp, "Stay factual. Everyone who reads the review sees it."));
          box.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/reviews/respond", { review_id: st.about_me.id, body: resp.value }).then(engOk).then(function (x) { engReload(x.held ? "Your response is with the Lawfecta Team for a quick check." : "Response published."); }).catch(revFail);
          } }, st.about_me.response_status === "published" ? "Save the response" : "Post the response"));
        }
        box.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
          var why = prompt("Why should the Lawfecta Team look at this review? Negative opinions stay up; only threats, harassment, client information, impersonation or payment outside Lawfecta are removed.");
          if (why === null) return;
          api.post("/reviews/report", { review_id: st.about_me.id, reason: why }).then(engOk).then(function () { D.toast(app, "Reported to the Lawfecta Team"); }).catch(revFail);
        } }, "Report this review"));
      }
      // The bench (attorney)
      if (r.role === "attorney" && (me.switches || {}).bench) {
        box.appendChild(h("h3", { text: "Your bench" }));
        if (st.bench) box.appendChild(h("p", { class: "small", text: st.bench.status === "active" ? "This freelancer is on your bench." : "Your bench invitation is waiting for their answer." }));
        else if (st.freelancer_person) box.appendChild(benchInviteRow(st.freelancer_person));
      }
    }).catch(function () { box.remove(); });
  }

  function reviewForm(r, st, mine, label) {
    var dir = st.direction;
    var ratings = ratingInputs(dir, mine && mine.ratings);
    var again = h("select", { "aria-label": dir === "of_freelancer" ? "Would you hire them again?" : "Would you work with them again?" },
      h("option", { value: "", text: "Choose" }), h("option", { value: "yes", text: "Yes", selected: mine && mine.would_again === true }), h("option", { value: "no", text: "No", selected: mine && mine.would_again === false }));
    var body = h("textarea", { rows: 3, style: "width:100%", "aria-label": "Your review" });
    body.value = mine ? mine.body : "";
    var req = newId();
    var go = h("button", { class: "blue small", type: "button" }, label);
    go.addEventListener("click", function () {
      go.disabled = true;
      api.post("/reviews/save", { agreement_id: r.agreement.id, ratings: ratings.read(), would_again: again.value === "" ? null : again.value === "yes", body: body.value, request_id: req }).then(engOk).then(function (x) {
        engReload(x.status === "held" ? "Your review is with the Lawfecta Team for a quick check before it is published." : x.edited ? "Review updated." : "Review published. Thank you.");
      }).catch(function (e) { go.disabled = false; revFail(e); });
    });
    return h("div", null, ratings, h("div", { class: "row", style: "margin:4px 0" }, h("span", { class: "grow", text: dir === "of_freelancer" ? "Would you hire them again?" : "Would you work with them again?" }), again),
      field("Your review", body, "About the work only. No client information."),
      helperButton("review_draft", "✦ Help me write a review", function () { return { agreement_id: r.agreement.id, ratings: ratings.read(), would_again: again.value === "" ? null : again.value === "yes", notes: body.value }; },
        { field: function (x) { return x.field === "body" ? body : null; } }),
      h("div", { class: "row" }, go));
  }

  // ---------- The bench ----------
  function benchInviteRow(freelancer) {
    var note = h("input", { style: "width:100%", "aria-label": "A note with the bench invitation (optional)", placeholder: "A short note (optional)" });
    return h("div", null, h("p", { class: "small muted", text: "Your bench is your list of freelancers you trust. Accepting opens an ongoing conversation; it does not share files, create a contract or allow spending." }), note,
      h("button", { class: "blue small", type: "button", onclick: function () {
        api.post("/bench/invite", { freelancer: freelancer, note: note.value, request_id: newId() }).then(engOk).then(function (x) {
          engReload(x.duplicate ? "Already invited." : "Invitation sent.");
        }).catch(revFail);
      } }, "Invite to my bench"));
  }

  function benchView(el) {
    var box = h("div", null, h("p", { class: "muted", text: "Loading your bench..." }));
    el.appendChild(box);
    api.get("/bench").then(function (b) {
      D.clear(box);
      if (!b.on) { box.appendChild(h("p", { class: "notice", text: REV_ERR.bench_off })); return; }
      if ((b.suggestions || []).length) {
        var sc = h("div", { class: "card" }, h("h2", { text: "DELA suggests from your bench" }));
        b.suggestions.forEach(function (s) {
          sc.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;margin:6px 0" }, h("div", { class: "grow" }, h("b", { text: s.name }), h("div", { class: "small", text: (s.gig_title ? "For the gig \"" + s.gig_title + "\": " : s.playbook_title ? "For the document \"" + s.playbook_title + "\": " : "") + s.reason })),
            s.gig_id ? h("button", { class: "blue small", type: "button", onclick: function () {
              api.post("/gigs/invite", { gig_id: s.gig_id, person_id: s.freelancer }).then(gigOk).then(function () { api.post("/bench/suggestion", { id: s.id, action: "used" }); D.toast(app, "Invited " + s.name); }).catch(gigFail);
            } }, "Invite to this gig") : null,
            h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/bench/suggestion", { id: s.id, action: "snooze" }).then(engOk).then(function () { engReload("Snoozed for 30 days."); }).catch(revFail); } }, "Snooze 30 days"),
            h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/bench/suggestion", { id: s.id, action: "dismiss" }).then(engOk).then(function () { engReload(); }).catch(revFail); } }, "Dismiss")));
        });
        box.appendChild(sc);
      }
      ["personal", "firm"].forEach(function (kind) {
        if (kind === "firm" && !b.firm_bench) return;
        var list = (b.items || []).filter(function (x) { return x.kind === kind; });
        var c = h("div", { class: "card" }, h("h2", { text: (kind === "firm" ? "Firm bench" : "My bench") + " (" + list.length + ")" }));
        if (kind === "firm") c.appendChild(h("p", { class: "small muted", text: "Shared with your firm's staff. Owners and managers add and remove people." }));
        if (!list.length) c.appendChild(h("p", { class: "muted", text: kind === "firm" ? "Nobody on the firm bench yet." : "Nobody yet. After a completed engagement, or from a Talent search, click \"Invite to my bench\"." }));
        list.forEach(function (x) {
          c.appendChild(h("div", { class: "card", style: "padding:10px;margin:6px 0" }, h("div", { class: "row" }, h("b", { class: "grow", text: x.name }),
            h("span", { class: "badge " + (x.status === "active" ? (x.available ? "ready" : "held") : "C"), text: x.status === "invited" ? "Invitation sent" : x.available ? "Available" : "Not available now" })),
            x.headline ? h("div", { class: "small", text: x.headline }) : null,
            h("div", { class: "small muted", text: [x.reviews && x.reviews.count ? x.reviews.count + " reviews" + (x.reviews.average ? ", " + x.reviews.average + " of 5" : "") : "No reviews yet", x.last_engagement ? "Last worked together " + D.date(x.last_engagement) : "", x.capacity_hours_week ? x.capacity_hours_week + " hours a week" : ""].filter(Boolean).join(" | ") }),
            h("div", { class: "row", style: "margin-top:6px;flex-wrap:wrap" },
              x.thread_id ? h("button", { class: "blue small", type: "button", onclick: function () { talk.thread = x.thread_id; tab = "inbox"; draw(); } }, "Message") : null,
              reviewsButton(x.freelancer, "freelancer", x.name),
              x.role === "manager" ? h("button", { class: "ghost small", type: "button", onclick: function () {
                if (!confirm("Remove " + x.name + " from the bench? Your bench conversation closes; past work records stay.")) return;
                api.post("/bench/end", { id: x.id }).then(engOk).then(function () { engReload("Removed."); }).catch(revFail);
              } }, "Remove") : null)));
        });
        box.appendChild(c);
      });
      var dg = h("input", { type: "checkbox", checked: !!b.digest, "aria-label": "Weekly bench summary by email" });
      dg.addEventListener("change", function () { api.post("/bench/digest", { on: dg.checked }).then(engOk).then(function () { D.toast(app, "Saved"); }).catch(revFail); });
      box.appendChild(h("label", { style: "display:flex;gap:8px;font-weight:400" }, dg, h("span", { text: "Email me a weekly summary of bench suggestions (Mondays)." })));
    }).catch(function (e) { D.clear(box); box.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
  }

  // Freelancer: bench invitations and the benches they are on
  function benchFreelancerCard(el) {
    if (!(me.switches || {}).bench) return;
    api.get("/bench").then(function (b) {
      if (!b.on || !(b.items || []).length) return;
      var c = h("div", { class: "card" }, h("h2", { text: "Benches (" + b.items.length + ")" }), h("p", { class: "small muted", text: "An attorney's trusted list. Being on a bench opens an ongoing conversation; it is not a contract and not a promise of work. You can leave any time." }));
      b.items.forEach(function (x) {
        c.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;margin:6px 0" }, h("div", { class: "grow" }, h("b", { text: x.attorney }), h("div", { class: "small", text: x.status === "invited" ? "Invited you to their " + (x.kind === "firm" ? "firm's " : "") + "bench" + (x.note ? ": " + x.note : "") : "You are on their " + (x.kind === "firm" ? "firm's " : "") + "bench" })),
          x.status === "invited" ? h("button", { class: "blue small", type: "button", onclick: function () { api.post("/bench/answer", { id: x.id, accept: true }).then(engOk).then(function () { engReload("You joined the bench. Your bench conversation is in the Inbox."); }).catch(revFail); } }, "Accept") : null,
          x.status === "invited" ? h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/bench/answer", { id: x.id, accept: false }).then(engOk).then(function () { engReload("Declined."); }).catch(revFail); } }, "Decline") : null,
          x.thread_id ? h("button", { class: "blue small", type: "button", onclick: function () { talk.thread = x.thread_id; tab = "inbox"; draw(); } }, "Message") : null,
          x.status === "active" ? h("button", { class: "ghost small", type: "button", onclick: function () {
            if (!confirm("Leave this bench? The bench conversation closes. Your past work and payments stay.")) return;
            api.post("/bench/end", { id: x.id }).then(engOk).then(function () { engReload("You left the bench."); }).catch(revFail);
          } }, "Leave") : null));
      });
      el.insertBefore(c, el.children[2] || null);
    }).catch(function () {});
  }

  // On the gig's Matches view: bench freelancers first
  function gigBenchCard(body, g) {
    if (!(me.switches || {}).bench || g.status === "draft") return;
    api.get("/gigs/bench?id=" + g.id).then(function (x) {
      if (!x.ok || !x.on || !(x.bench || []).length) return;
      var WHY = { not_match_ready: "not available right now", excludes_state: "does not work for this state", not_a_freelancer: "no longer a freelancer" };
      var c = h("div", { class: "card" }, h("h2", { text: "From your bench" }), h("p", { class: "small muted", text: "Invite people you trust first. An invited proposal does not use their monthly allowance." }));
      x.bench.forEach(function (b) {
        var btn = h("button", { class: "blue small", type: "button", disabled: b.invited || !!b.why_not || g.status !== "open" }, b.invited ? "Invited" : "Invite");
        btn.addEventListener("click", function () { btn.disabled = true; api.post("/gigs/invite", { gig_id: g.id, person_id: b.freelancer }).then(gigOk).then(function () { btn.textContent = "Invited"; D.toast(app, "Invited " + b.name); }).catch(function (e) { btn.disabled = false; gigFail(e); }); });
        c.appendChild(h("div", { class: "row", style: "margin:6px 0" }, h("b", { class: "grow", text: b.name + (b.kind === "firm" ? " (firm bench)" : "") }), b.why_not ? h("span", { class: "small muted", text: WHY[b.why_not] || "cannot be invited now" }) : null, reviewsButton(b.freelancer, "freelancer", b.name), btn));
      });
      body.insertBefore(c, body.firstChild);
    }).catch(function () {});
  }

  // ---------- Reviews on the profile, and asking past clients ----------
  function profileReviewsCard(host) {
    if (!(me.switches || {}).reviews || !me.person) return;
    var c = h("div", { class: "card" }, h("h2", { text: "Your reviews" }), h("p", { class: "muted", text: "Loading..." }));
    host.appendChild(c);
    api.get("/reviews/of?person=" + me.person.id + "&side=" + me.side).then(function (r) {
      D.clear(c);
      c.appendChild(h("h2", { text: "Your reviews" }));
      c.appendChild(h("p", { class: "small muted", text: "Only signed-in Lawfecta members can read reviews. You cannot remove a review, but you can post one response and report one that breaks the rules." }));
      reviewsList(c, r, me.side);
      if (me.side === "freelancer" && (me.switches || {}).past_client_reviews) pastClientsBox(c);
    }).catch(function () { c.remove(); });
  }

  function pastClientsBox(c) {
    var box = h("div", { style: "border-top:1px solid var(--line);margin-top:10px;padding-top:6px" }, h("h3", { text: "Ask a past client for a review" }));
    c.appendChild(box);
    api.get("/reviews/past").then(function (p) {
      box.appendChild(h("p", { class: "small muted", text: "For attorneys you worked for outside Lawfecta. DELA sends a short, neutral email; you cannot add a message, and there is no reward for reviewing. They confirm they are an attorney with their state and bar number. Up to " + p.per_month + " requests a month and " + p.max_total + " in total (used: " + p.used_this_month + " this month, " + p.used_total + " in total)." }));
      var name = h("input", { "aria-label": "Their name", placeholder: "Their name" }), email = h("input", { type: "email", "aria-label": "Their email", placeholder: "Their work email" });
      box.appendChild(h("div", { class: "row", style: "flex-wrap:wrap" }, name, email, h("button", { class: "blue small", type: "button", onclick: function () {
        api.post("/reviews/past/request", { name: name.value, email: email.value }).then(engOk).then(function () { engReload("Request sent to " + email.value + "."); }).catch(revFail);
      } }, "Send the request")));
      var WORD = { sent: "Sent", done: "Reviewed", expired: "Link expired", opted_out: "Asked not to be asked" };
      if ((p.requests || []).length) box.appendChild(h("ul", null, p.requests.map(function (q) { return h("li", { class: "small", text: q.name + " (" + q.email + "), " + D.date(q.created_at) + ": " + (WORD[q.status] || q.status) }); })));
    }).catch(function () {});
  }

  // ---------- Webhooks (AI settings) ----------
  var WH_WORDS = {
    "playbook.approved": "A document is approved", "gig.posted": "A gig is posted", "gig.closed": "A gig closes", "proposal.received": "A new proposal", "proposal.chosen": "Your proposal is chosen",
    "match.new": "A new match", "invitation.received": "An invitation to a gig", "meeting.booked": "A meeting is booked", "meeting.canceled": "A meeting is canceled", "agreement.signed": "An agreement is signed",
    "milestone.paid": "A milestone is paid", "milestone.submitted": "A milestone is submitted", "milestone.accepted": "A milestone is accepted", "milestone.changes_requested": "Changes are requested",
    "payout.sent": "A payout is sent", "dispute.opened": "A dispute is opened", "dispute.decided": "A dispute is decided", "bench.invited": "A bench invitation", "bench.accepted": "Someone joins your bench",
    "review.received": "A new review about you", test: "Test notice",
  };
  function webhooksCard(host) {
    if (!(me.switches || {}).member_webhooks) return;
    var c = h("div", { class: "card" }, h("h2", { text: "Webhooks" }), h("p", { class: "muted", text: "Loading..." }));
    host.appendChild(c);
    function load() {
      api.get("/webhooks").then(function (w) {
        D.clear(c);
        c.appendChild(h("h2", { text: "Webhooks" }));
        c.appendChild(h("p", { class: "small muted", text: "Send DELA events to your own tools (for example Zapier, Make or your own server). Each notice holds only an ID, the state, the time and a link back to DELA that needs your login: never document text, messages, files, card, bank or identity details. Each notice is signed so your system can check it came from DELA. Your plan allows " + (w.limit === null ? "any number of" : w.limit) + (w.limit === 1 ? " endpoint." : " endpoints.") }));
        (w.endpoints || []).forEach(function (e) {
          var STATUS = { active: e.over_limit ? "Over your plan's limit: not sending" : "Active", paused: e.paused_reason === "failures" ? "Paused after " + e.failures + " failed deliveries" : "Paused" };
          var box = h("div", { class: "card", style: "padding:10px;margin:6px 0" }, h("div", { class: "row" }, h("b", { class: "grow", style: "overflow-wrap:anywhere", text: e.url }), h("span", { class: "badge " + (e.status === "active" && !e.over_limit ? "ready" : "held"), text: STATUS[e.status] || e.status })),
            h("div", { class: "small muted", text: "Signing secret ending " + e.secret_last4 + " | " + e.events.map(function (x) { return WH_WORDS[x] || x; }).join(", ") }),
            e.last_error ? h("div", { class: "small", text: "Last problem: " + e.last_error.split("_").join(" ") }) : null);
          var row = h("div", { class: "row", style: "flex-wrap:wrap;margin-top:6px" });
          function act(action, label, done) { return h("button", { class: "ghost small", type: "button", onclick: function () {
            if (action === "delete" && !confirm("Delete this endpoint? Notices waiting for it are canceled.")) return;
            api.post("/webhooks/change", { id: e.id, action: action }).then(engOk).then(function (x) { if (x.secret) secretShown(x.secret); else D.toast(app, done); load(); }).catch(revFail);
          } }, label); }
          if (e.status === "active") row.appendChild(h("button", { class: "blue small", type: "button", onclick: function () {
            api.post("/webhooks/test", { id: e.id }).then(engOk).then(function (x) { D.toast(app, x.sent ? "Test notice delivered (" + x.code + ")." : "The test notice did not arrive: " + String(x.error || x.code || "").split("_").join(" ") + ". DELA tries again later.", !x.sent); load(); }).catch(revFail);
          } }, "Send a test"));
          row.appendChild(e.status === "active" ? act("pause", "Pause", "Paused") : act("resume", "Resume", "Resumed"));
          row.appendChild(act("rotate", "Change the secret", ""));
          row.appendChild(act("delete", "Delete", "Deleted"));
          box.appendChild(row);
          if ((e.deliveries || []).length) {
            var d = h("details", null, h("summary", { text: "Recent deliveries" }));
            d.appendChild(h("ul", null, e.deliveries.map(function (x) {
              var li = h("li", { class: "small", text: D.dateTime(x.at) + ": " + (WH_WORDS[x.type] || x.type) + ", " + (x.status === "sent" ? "delivered" : x.status === "pending" ? "trying again" : x.status) + (x.code ? " (" + x.code + ")" : "") + (x.error ? " " + x.error.split("_").join(" ") : "") + " " });
              if (x.status === "failed") li.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/webhooks/resend", { delivery_id: x.id }).then(engOk).then(function () { D.toast(app, "Sending again"); load(); }).catch(revFail); } }, "Send again"));
              return li;
            })));
            box.appendChild(d);
          }
          c.appendChild(box);
        });
        // Add an endpoint
        var url = h("input", { "aria-label": "Endpoint address (https)", style: "width:100%", placeholder: "Your https address" });
        var picks = (w.events || []).map(function (ev) { var cb = h("input", { type: "checkbox", value: ev, "aria-label": WH_WORDS[ev] || ev }); return [cb, h("label", { style: "display:flex;gap:6px;font-weight:400" }, cb, h("span", { text: WH_WORDS[ev] || ev }))]; });
        var req = newId();
        c.appendChild(h("details", { open: !(w.endpoints || []).length }, h("summary", { text: "Add an endpoint" }), field("Address", url, "It must start with https://. DELA does not send to private network addresses."),
          h("div", { style: "columns:2;margin:6px 0" }, picks.map(function (x) { return x[1]; })),
          h("button", { class: "blue small", type: "button", onclick: function () {
            api.post("/webhooks/add", { url: url.value, events: picks.filter(function (x) { return x[0].checked; }).map(function (x) { return x[0].value; }), request_id: req }).then(engOk).then(function (x) {
              req = newId(); if (x.secret) secretShown(x.secret); load();
            }).catch(revFail);
          } }, "Add the endpoint")));
      }).catch(function (e) { D.clear(c); c.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    }
    function secretShown(s) {
      var el = h("div", { class: "drawer", role: "dialog", "aria-label": "Signing secret" }, h("h2", { text: "Your signing secret" }), h("p", { text: "Copy it now and store it in your own system. DELA will not show it again." }),
        h("input", { value: s, readonly: true, style: "width:100%", "aria-label": "Signing secret" }),
        h("p", { class: "small muted", text: "Each notice has a DELA-Signature header: t=time,v1=HMAC-SHA256 of \"time.body\" with this secret. Ignore notices older than 5 minutes, and use the DELA-Event-Id header to skip repeats." }),
        h("button", { class: "blue small", type: "button", onclick: function () { try { navigator.clipboard.writeText(s); D.toast(app, "Copied"); } catch (e) { /* select it by hand */ } } }, "Copy"));
      showDrawer(el, true);
    }
    load();
  }

  // ---------- The public page a past client opens from the email (no Lawfecta login) ----------
  function pastReviewPage(t) {
    var el = h("div", { class: "wrap" }, h("p", { class: "muted", text: "Loading..." }));
    api.get("/public/past-review?t=" + encodeURIComponent(t)).then(function (r) {
      D.clear(el);
      el.appendChild(h("h1", { text: "Write a review" }));
      if (!r.ok) { el.appendChild(h("p", { class: "notice", text: revErr(r) })); return; }
      el.appendChild(h("p", { text: r.freelancer + " asked you for a short, honest review of work they did for you outside Lawfecta." + (r.headline ? " (" + r.headline + ")" : "") }));
      el.appendChild(h("p", { class: "small muted", text: "There is no reward for reviewing, and you can say no. Your review shows on their Lawfecta profile in a section for past clients, with your name and state, to signed-in Lawfecta members only. No client information." }));
      var name = h("input", { "aria-label": "Your name", value: r.your_name || "" }), state = h("input", { "aria-label": "State of your license (two letters)", maxlength: "2", style: "width:5em" }), bar = h("input", { "aria-label": "Bar number" });
      var ratings = ratingInputs("of_freelancer", null);
      var again = h("select", { "aria-label": "Would you hire them again?" }, h("option", { value: "", text: "Choose" }), h("option", { value: "yes", text: "Yes" }), h("option", { value: "no", text: "No" }));
      var body = h("textarea", { rows: 4, style: "width:100%", "aria-label": "Your review" });
      var ok = h("input", { type: "checkbox", "aria-label": "I confirm" });
      var go = h("button", { class: "blue", type: "button" }, "Send my review");
      go.addEventListener("click", function () {
        go.disabled = true;
        api.post("/public/past-review", { t: t, name: name.value, state: state.value.toUpperCase(), bar_number: bar.value, ratings: ratings.read(), would_again: again.value === "" ? null : again.value === "yes", body: body.value, confirm: ok.checked }).then(engOk).then(function (x) {
          D.clear(el); el.appendChild(h("h1", { text: "Thank you" })); el.appendChild(h("p", { text: x.held ? "Your review is with the Lawfecta Team for a quick check before it shows." : "Your review is published on " + r.freelancer + "'s profile." }));
        }).catch(function (e) { go.disabled = false; revFail(e); });
      });
      el.appendChild(h("div", { class: "card" }, field("Your name", name), h("div", { class: "row" }, field("License state", state), field("Bar number", bar)), ratings,
        h("div", { class: "row", style: "margin:4px 0" }, h("span", { class: "grow", text: "Would you hire them again?" }), again), field("Your review", body),
        h("label", { style: "display:flex;gap:8px;font-weight:400;margin:8px 0" }, ok, h("span", { text: "I am a licensed attorney, this is my own honest opinion of work done for me, and I was not offered anything for it." })),
        h("div", { class: "row" }, go, h("button", { class: "ghost", type: "button", onclick: function () {
          if (!confirm("Stop all review requests to your email address?")) return;
          api.post("/public/past-review/optout", { t: t }).then(engOk).then(function () { D.clear(el); el.appendChild(h("h1", { text: "Done" })); el.appendChild(h("p", { text: "You will not get review requests from Lawfecta again." })); }).catch(revFail);
        } }, "Do not ask me again"))));
    }).catch(function (e) { D.clear(el); el.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    return el;
  }

  // ---------- The document standard (Policy, Workflow, SOP, Playbook): docs/briefs/step-2d-document-standard.md ----------
  var DOC = { starters: null, firm: null, flow: null };
  var DOC_TYPE_WORDS = { policy: "Policy", workflow: "Workflow", sop: "SOP", playbook: "Playbook" };
  var DOC_ERR = {
    checks_failing: "This is blocked until every step has exactly one Accountable (A) and every judgment step is flagged \"Attorney decides\". See the quality panel.",
    firm_profile_needed: "Fill in your firm profile first. DELA asks it once.", documents_off: "The document standard is not open for your account yet.", name_needed: "Give the process a name.",
    choose_firm_size: "Choose your firm size.", attorney_role_needed: "Keep at least one attorney role.", not_in_firm: "That person is not in your firm. Choose a firm member or type an email.",
    bad_email: "Check the email address.", owner_or_manager_only: "Only the firm owner or a manager can change the firm profile.", type_not_for_gigs: "Only SOPs and Workflows can become a Flex Gig. Attach Policies and Playbooks to a gig as reference instead.",
    no_freelancer_steps: "No step in this workflow has the freelancer role as R (Responsible), so there is nothing to hand over. Set R for the freelancer role in the RACI grid.",
    reference_policies_and_playbooks: "Only Policies and Playbooks can be attached as reference.", not_a_document: "This is an older playbook. DELA converts it to a document soon.",
    fix_by_hand: "DELA cannot fix this one for you. Change it in the document.", waiting_for_attorney: "The work waits for the attorney's decision on a step. Submit after they approve it.",
    attorney_decision_needed: "Every \"Attorney decides\" step needs the attorney's approval before the last milestone is submitted.",
  };

  function docStarters() { return DOC.starters ? Promise.resolve(DOC.starters) : api.get("/documents/starters").then(function (r) { DOC.starters = r; return r; }); }
  function docFirm() { return api.get("/documents/firm").then(function (r) { DOC.firm = r; return r; }); }

  // ---------- The firm profile (asked once, editable later) ----------
  function firmProfileForm(host, f, onSaved) {
    var firm = f.firm || {}, saved = f.saved;
    var size = h("select", { "aria-label": "Firm size" }, [["", "Choose"], ["solo", "Solo"], ["2-5", "2 to 5"], ["6-20", "6 to 20"], ["21+", "21+"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: firm.size === o[0] }); }));
    var areas = h("input", { "aria-label": "Practice areas", style: "width:100%", value: (firm.practice_areas || []).join(", "), placeholder: "For example: Family law, Estate planning" });
    var juris = h("input", { "aria-label": "Jurisdictions", style: "width:100%", value: firm.jurisdictions || "", placeholder: "States and federal courts you use, for example: Texas state courts; N.D. Tex." });
    var rolesBox = h("div");
    var team = f.team || [];
    var roles = (firm.roles && firm.roles.length ? firm.roles : (f.default_roles || []).filter(function (r) { return firm.size === "solo" ? (f.solo_roles || []).indexOf(r.name) >= 0 : true; })).map(function (r) { return { name: r.name, kind: r.kind, person_id: r.person_id || "", email: r.email || "", on: true }; });
    function drawRoles() {
      D.clear(rolesBox);
      roles.forEach(function (r, i) {
        var on = h("input", { type: "checkbox", checked: r.on, "aria-label": "Use the role " + r.name });
        on.addEventListener("change", function () { r.on = on.checked; });
        var who = h("select", { "aria-label": "Who holds the role " + r.name }, [h("option", { value: "", text: "Nobody yet" })].concat(team.map(function (t) { return h("option", { value: t.person_id, text: t.name, selected: r.person_id === t.person_id }); })).concat([h("option", { value: "email", text: "An email address", selected: !r.person_id && !!r.email })]));
        var email = h("input", { type: "email", "aria-label": "Email for the role " + r.name, value: r.email, placeholder: "email", hidden: !(!r.person_id && r.email) });
        who.addEventListener("change", function () { r.person_id = who.value === "email" ? "" : who.value; email.hidden = who.value !== "email"; if (who.value !== "email") r.email = ""; });
        email.addEventListener("input", function () { r.email = email.value; });
        var unassigned = !r.person_id && !r.email;
        var kindWord = r.kind === "attorney" || r.kind === "freelancer" ? r.kind : "";
        rolesBox.appendChild(h("div", { class: "role-row" }, on, h("span", { class: "role-name", text: r.name + (kindWord && r.name.toLowerCase().indexOf(kindWord) < 0 ? " (" + kindWord + ")" : "") }), who,
          h("div", { class: "role-extra" }, email, saved && unassigned && r.on ? h("span", { class: "badge held", text: "No one assigned" }) : null)));
      });
      var custom = h("input", { "aria-label": "Add a custom role", placeholder: "Add a custom role" });
      var kind = h("select", { "aria-label": "Custom role kind" }, h("option", { value: "staff", text: "Staff" }), h("option", { value: "attorney", text: "Attorney" }), h("option", { value: "freelancer", text: "Freelancer" }));
      rolesBox.appendChild(h("div", { class: "row", style: "margin-top:6px" }, custom, kind, h("button", { class: "ghost small", type: "button", onclick: function () { if (!custom.value.trim()) return; roles.push({ name: custom.value.trim(), kind: kind.value, person_id: "", email: "", on: true }); drawRoles(); } }, "Add")));
    }
    drawRoles();
    size.addEventListener("change", function () {
      if (size.value === "solo" && !(firm.roles && firm.roles.length)) { roles.forEach(function (r) { r.on = (f.solo_roles || []).indexOf(r.name) >= 0; }); drawRoles(); }
    });
    var sys = {};
    var sysBox = h("div", { class: "kv" }, (f.system_groups || []).map(function (g) {
      sys[g[0]] = h("input", { "aria-label": g[1] + " systems", style: "width:100%", value: ((firm.systems || {})[g[0]] || []).join(", "), placeholder: "Names, separated by commas" });
      return h("div", null, g[1], sys[g[0]]);
    }));
    var go = h("button", { class: "blue", type: "button" }, saved ? "Save the firm profile" : "Save and continue");
    go.addEventListener("click", function () {
      var systems = {};
      Object.keys(sys).forEach(function (k) { systems[k] = commas(sys[k].value); });
      go.disabled = true;
      api.post("/documents/firm", { size: size.value, practice_areas: commas(areas.value), jurisdictions: juris.value, systems: systems,
        roles: roles.filter(function (r) { return r.on; }).map(function (r) { return { name: r.name, kind: r.kind, person_id: r.person_id, email: r.email }; }) }).then(function (x) {
        go.disabled = false;
        if (!x.ok) { D.toast(app, DOC_ERR[x.reason] || failText(x), true); return; }
        D.toast(app, (x.unassigned || []).length ? "Saved. No one holds: " + x.unassigned.join(", ") + ". Reminders for their documents go to the firm owner." : "Saved");
        if (onSaved) onSaved();
      }).catch(function (e) { go.disabled = false; pbFail(e); });
    });
    host.appendChild(h("div", { class: "card" }, h("h2", { text: "Your firm profile for documents" }),
      h("p", { class: "small muted", text: "DELA uses these facts in every document, so you enter them once. Roles, never people's names, go in documents; who holds each role gets its review reminders." }),
      f.can_edit === false ? h("p", { class: "notice", text: DOC_ERR.owner_or_manager_only }) : null,
      f.can_edit === false ? null : (function () {
        var desc = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Describe your firm", placeholder: "For example: three attorneys doing family law in Texas state courts; we use Clio and Microsoft 365" });
        return h("div", null, field("Describe your firm (optional)", desc, "A sentence or two. DELA fills in the boxes below from it; you check them and save."),
          helperButton("describe_firm", "✦ Help me describe my firm", function () { return { text: desc.value }; }, { field: function (x) {
            if (x.field === "size") return size; if (x.field === "practice_areas") return areas; if (x.field === "jurisdictions") return juris;
            return String(x.field).indexOf("sys:") === 0 ? sys[x.field.slice(4)] || null : null; } }));
      })(),
      field("Firm size", size), field("Practice areas", areas), field("Jurisdictions", juris), h("h3", { text: "Team roles" }), rolesBox, h("h3", { text: "Systems you use" }), sysBox,
      f.can_edit === false ? null : h("div", { class: "row", style: "margin-top:10px" }, go)));
  }

  // ---------- New document: firm profile (once), type cards, starter library, the questions ----------
  function newDocument() {
    D.clear(libEl);
    libEl.appendChild(h("div", { class: "row", style: "margin-top:14px" }, h("button", { class: "ghost small", onclick: loadLibrary }, "← Library")));
    libEl.appendChild(h("h1", { text: "New document" }));
    var host = h("div", null, h("p", { class: "muted", text: "Loading..." }));
    libEl.appendChild(host);
    Promise.all([docFirm(), docStarters()]).then(function (rs) {
      D.clear(host);
      if (!rs[0].saved) { firmProfileForm(host, rs[0], newDocument); return; }
      DOC.flow = DOC.flow || {};
      if (!DOC.flow.type) { if (lib.data && lib.data.list && lib.data.list.workspace && !DOC.flow.pick) wsWhat(host, rs[1]); else pickWhat(host, rs[1]); return; }
      questionsForm(host, rs[0], rs[1]);
    }).catch(pbFail);
  }

  // Step 8b Part B (answer B8): "What would you like to document?" comes first. DELA suggests the structure in plain
  // words (worked out in code, no DELA actions); the person can pick another type before the questions start.
  function wsWhat(host, st) {
    var flow = DOC.flow || {};
    var ta = h("textarea", { rows: 3, style: "width:100%", "aria-label": "What would you like to document?", placeholder: "For example: how we check for conflicts before accepting a new client", value: flow.what || "" });
    var out = h("div", { "aria-live": "polite" });
    var next = h("button", { class: "blue", type: "button" }, "Next");
    function use(type, starter, sg) { DOC.flow = { type: type, starter: starter || null, describe: ta.value.trim(), lifecycle: sg ? sg.lifecycle : "" }; newDocument(); }
    next.addEventListener("click", function () {
      if (ta.value.trim().length < 3) { D.toast(app, "Describe what you would like to document first.", true); ta.focus(); return; }
      next.disabled = true;
      api.post("/documents/suggest", { text: ta.value }).then(function (sg) {
        next.disabled = false;
        if (!sg.ok) throw sg;
        D.clear(out);
        var starter = sg.starter ? (st.starters || []).filter(function (x) { return x.id === sg.starter.id; })[0] : null;
        var others = h("div", { class: "row", style: "flex-wrap:wrap;margin-top:8px", hidden: true }, ["sop", "workflow", "playbook", "policy"].filter(function (t) { return t !== sg.type; }).map(function (t) {
          return h("button", { class: "ghost small", type: "button", title: st.types[t].line, onclick: function () { use(t, null, sg); } }, st.types[t].label);
        }));
        out.appendChild(h("div", { class: "card soft", id: "lib-suggest" }, h("h3", { style: "margin-top:0", text: "DELA suggests: " + sg.label }),
          h("p", { text: sg.reason }),
          starter ? h("p", { class: "small", text: "It matches a common process, \"" + starter.title + "\", so DELA starts from it." }) : null,
          h("p", { class: "small muted", text: "Category: " + sg.group + "." }),
          h("div", { class: "row", style: "flex-wrap:wrap" },
            h("button", { class: "blue", type: "button", onclick: function () { use(sg.type, starter, sg); } }, "Use this"),
            h("button", { class: "ghost", type: "button", "aria-expanded": "false", onclick: function (e) { others.hidden = !others.hidden; e.currentTarget.setAttribute("aria-expanded", String(!others.hidden)); } }, "Choose another type")),
          others));
      }).catch(function (e) { next.disabled = false; pbFail(e); });
    });
    host.appendChild(h("div", { class: "card" }, h("h2", { text: "What would you like to document?" }),
      h("p", { class: "small muted", text: "Describe it in a sentence, the way you would explain it to a new team member." }), aiNotice(), ta,
      h("div", { class: "row", style: "margin-top:8px;flex-wrap:wrap" }, next,
        h("button", { class: "linkish", type: "button", onclick: function () { DOC.flow = { pick: true }; newDocument(); } }, "I know which type I want")),
      out));
    ta.focus();
    if (flow.what) next.click();
  }

  function pickWhat(host, st) {
    host.appendChild(h("p", { class: "muted", text: "Pick what to build. Each type has its own job: the policy sets the rules, the workflow shows the map, each box on the map gets an SOP, and the playbook covers the forks in the road." }));
    host.appendChild(h("div", { class: "kv" }, ["sop", "workflow", "playbook", "policy"].map(function (t) {
      var info = st.types[t];
      return h("div", { role: "button", tabindex: "0", style: "cursor:pointer", onclick: function () { DOC.flow = { type: t }; newDocument(); } },
        h("b", { text: info.label }), h("div", { class: "small", text: info.line }), h("div", { class: "small muted", text: "For example: " + info.example }));
    })));
    host.appendChild(h("h2", { text: "Or start from a common process" }));
    st.lifecycle.forEach(function (g) {
      var list = st.starters.filter(function (s) { return s.lifecycle === g.prefix; });
      if (!list.length) return;
      host.appendChild(h("details", { class: "card" }, h("summary", { text: g.prefix + " | " + g.label + " (" + list.length + ")" }),
        h("div", null, list.map(function (s) {
          return h("div", { class: "row", style: "margin:6px 0" }, h("span", { class: "badge", text: DOC_TYPE_WORDS[s.type] }), h("span", { class: "grow", text: s.title + (s.high_risk ? " (reviewed every 3 months)" : "") }),
            h("button", { class: "blue small", type: "button", onclick: function () { DOC.flow = { type: s.type, starter: s }; newDocument(); } }, "Start"));
        }))));
    });
  }

  function questionsForm(host, f, st) {
    var flow = DOC.flow, s0 = flow.starter || {};
    var info = st.types[flow.type];
    host.appendChild(h("p", null, h("b", { text: info.label + ": " }), info.line, " ", h("button", { class: "ghost small", type: "button", onclick: function () { DOC.flow = flow.describe ? { what: flow.describe } : null; newDocument(); } }, "Change")));
    var firm = f.firm || {};
    var roleNames = (firm.roles || []).map(function (r) { return r.name; });
    var sysNames = [];
    Object.keys(firm.systems || {}).forEach(function (k) { (firm.systems[k] || []).forEach(function (x) { if (sysNames.indexOf(x) < 0) sysNames.push(x); }); });
    var name = h("input", { "aria-label": "Process name", style: "width:100%", value: s0.title || "" });
    var trig = h("input", { "aria-label": "What starts it", style: "width:100%", value: s0.trigger || "" });
    var done = h("input", { "aria-label": "What done looks like", style: "width:100%", value: s0.done || "" });
    var checks = function (list, label) { return h("div", { class: "row", style: "flex-wrap:wrap" }, list.map(function (x) { var cb = h("input", { type: "checkbox", value: x, "aria-label": label + ": " + x }); return h("label", { style: "display:flex;gap:6px;font-weight:400;margin-right:10px" }, cb, h("span", { text: x })); })); };
    var rolesBox = checks(roleNames, "Role"), sysBox = checks(sysNames, "System");
    var timing = h("input", { "aria-label": "Deadline or time target", style: "width:100%", placeholder: "For example: within 1 business day of the request" });
    var att = h("textarea", { rows: 2, style: "width:100%", "aria-label": "Steps the attorney must decide or approve" });
    var wrong = h("textarea", { rows: 2, style: "width:100%", "aria-label": "What goes wrong today (optional)" });
    var paste = h("textarea", { rows: 3, style: "width:100%", "aria-label": "Paste an existing checklist, email or old SOP (optional)", placeholder: "DELA removes client names, case numbers, passwords and account numbers before drafting." });
    // From "What would you like to document?": the description goes with the answers, so DELA drafts from it
    if (flow.describe) paste.value = flow.describe;
    var files = [], fileWrap = h("div", { class: "small" });
    var pickFiles = h("button", { class: "ghost small", type: "button", onclick: function () {
      api.get("/files").then(function (x) {
        D.clear(fileWrap);
        (x.files || []).filter(function (fl) { return fl.status === "ready"; }).slice(0, 30).forEach(function (fl) {
          var cb = h("input", { type: "checkbox" });
          cb.addEventListener("change", function () { files = files.filter(function (id) { return id !== fl.id; }); if (cb.checked) files.push(fl.id); });
          fileWrap.appendChild(h("label", { style: "display:flex;gap:6px;font-weight:400" }, cb, fl.name));
        });
        if (!fileWrap.children.length) fileWrap.appendChild(h("span", { class: "muted", text: "No ready files. Upload on the Files page first." }));
      }).catch(pbFail);
    } }, "Use a file from your Files");
    var go = h("button", { class: "blue", type: "button" }, "Draft it with DELA");
    var status = h("span", { class: "small muted", role: "status" });
    var req = newId();
    var picked = function (box) { return [].slice.call(box.querySelectorAll("input:checked")).map(function (x) { return x.value; }); };
    go.addEventListener("click", function () {
      if (!name.value.trim()) { D.toast(app, DOC_ERR.name_needed, true); return; }
      go.disabled = true; status.textContent = "DELA is drafting to your firm's standard and checking its own work. This takes about a minute.";
      api.post("/documents/draft", { org_id: lib.org, type: flow.type, starter_id: s0.id || "", lifecycle: s0.lifecycle || flow.lifecycle || "", request_id: req, file_ids: files, text: paste.value,
        answers: { name: name.value, trigger: trig.value, done: done.value, roles: picked(rolesBox), systems: picked(sysBox), timing: timing.value, attorney_steps: att.value, problems: wrong.value } }).then(function (r) {
        go.disabled = false; status.textContent = "";
        if (!r.ok && r.reason === "playbook_limit") { limitPopup("playbooks"); return; }
        if (!r.ok) { D.toast(app, DOC_ERR[r.reason] || failText(r), true); return; }
        DOC.flow = null;
        lib.questions = r.questions || [];
        lib.docNotices = r.notices || [];
        lib.suggested = r.suggested_type || null;
        openPlaybook(r.id, "read");
      }).catch(function (e) { go.disabled = false; status.textContent = ""; pbFail(e); });
    });
    host.appendChild(h("div", { class: "card" }, h("h2", { text: "About this process" }),
      h("p", { class: "small muted", text: "Only the name is needed. Anything you skip shows in the quality panel, so you can add it later." }), aiNotice(),
      field("Process name", name), field("What starts it", trig), field("What done looks like", done), field("Which roles touch it", rolesBox), field("Which systems it uses", sysBox),
      field("Any deadline or time target", timing, "Use your own service level. For a court rule or statute, DELA adds a field for the rule's link and a date to verify it."),
      field("Steps you must personally decide or approve", att), field("What goes wrong today (optional)", wrong),
      h("details", { open: !!flow.describe }, h("summary", { text: flow.describe ? "What you described, and anything you already have (optional)" : "Rewrite something you already have (optional)" }), paste, h("div", { class: "row" }, pickFiles), fileWrap),
      h("div", { class: "row", style: "margin-top:10px" }, go, status)));
  }

  // ---------- The master index (Library) ----------
  // One aligned table for the whole library, with each lifecycle group as a band row (UX review L01).
  // The ID sits under the title; on a phone the table stacks into cards (class "stack").
  function docIndex(listEl, rows) {
    var st = DOC.starters;
    var groups = st ? st.lifecycle : [];
    var byG = {};
    rows.forEach(function (p) { var g = p.lifecycle || "OLD"; (byG[g] = byG[g] || []).push(p); });
    var order = groups.map(function (g) { return g.prefix; }).concat(["OLD"]);
    var body = h("tbody");
    order.forEach(function (g) {
      var list = byG[g];
      if (!list) return;
      var label = g === "OLD" ? "Waiting for the document standard" : (groups.filter(function (x) { return x.prefix === g; })[0] || {}).label || g;
      body.appendChild(h("tr", { class: "band" }, h("th", { colspan: "6", scope: "colgroup", style: "text-align:left;background:var(--soft, #f6f1f5);padding:6px 8px", text: (g === "OLD" ? "" : g + " | ") + label + " (" + list.length + ")" })));
      list.forEach(function (p) {
        var due = p.status === "approved" && p.next_review_at && p.next_review_at <= D.today();
        body.appendChild(h("tr", { style: "cursor:pointer", tabindex: "0", onclick: function () { openPlaybook(p.id, "read"); }, onkeydown: function (e) { if (e.key === "Enter") openPlaybook(p.id, "read"); } },
          h("td", { "data-label": "Document" }, h("b", { text: p.title }), h("div", { class: "small muted", text: p.doc_id || "No ID yet" }),
            usage.data && (usage.data.locked_ids || []).indexOf(p.id) >= 0 ? h("div", { class: "small", text: "🔒 Upgrade to edit this document." }) : null, p.converted ? h("div", { class: "small", text: "Imported: review required" }) : null),
          h("td", { "data-label": "Type", text: DOC_TYPE_WORDS[p.doc_type] || "Older playbook" }), h("td", { "data-label": "Owner (role)", text: p.owner_role || "Not assigned" }),
          h("td", { "data-label": "Status" }, h("span", { class: "badge " + (p.status === "approved" ? "ready" : p.status === "in_review" ? "held" : ""), text: PB_STATUS[p.status] })),
          h("td", { "data-label": "Next review", text: p.next_review_at ? D.date(p.next_review_at) + (due ? " (due)" : "") : "Not scheduled" }),
          h("td", { "data-label": "Review" }, reviewCell(p))));
      });
    });
    listEl.appendChild(h("div", { class: "scroll" }, h("table", { class: "stack doc-index", style: "width:100%" },
      h("thead", null, h("tr", null, ["Document", "Type", "Owner (role)", "Status", "Next review", "Review"].map(function (t) { return h("th", { scope: "col", text: t }); }))), body)));
  }

  // ---------- Draft and review ----------
  function docWork() { if (!lib.doc || lib.doc._id !== lib.pb.playbook.id + ":" + lib.pb.playbook.version) { lib.doc = JSON.parse(JSON.stringify(lib.pb.body)); lib.doc._id = lib.pb.playbook.id + ":" + lib.pb.playbook.version; } return lib.doc; }

  // ---------- Step 4d: "✦ Automate or delegate" (docs/briefs/step-4d-guided-setup-delegate-automate.md) ----------
  // Never runs on its own: the attorney clicks. One review per approved version. The delegate path is one screen of
  // numbered steps the attorney can go back to; only an attorney who can post approves the SOP and drafts the gig.
  var auto = { open: null };
  var FREQ_WORDS = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly" };
  var AUTO_ERR = {
    automate_off: "Automate or delegate is not open for your account yet.", not_approved: "Approve this document first. DELA reviews the approved version.",
    no_steps: "This document has no numbered steps for DELA to review. Automate or delegate works on SOPs and Workflows with steps.",
    not_allowed: "Only the document's administrators and editors can do that.", bad_minutes: "Type how long it takes as minutes, from 1 to 6000.",
    steps_not_delegable: "Choose some steps, not all of them, and none that need an attorney's decision or legal judgment.",
    attorney_approves: "An attorney approves the SOP and posts the gig. Ask the supervising attorney to open this page.",
    sop_first: "Draft the SOP first (step 2).", sop_not_approved: "Approve the SOP first (step 4).", sop_approved: "The SOP is approved, so its steps and KPIs are set. Start a new delegation to change them.",
    review_out_of_date: "This document has a newer approved version. Run Automate or delegate again first.", draft_waiting: "This document has a draft waiting for approval. Approve or discard it first.",
    review_first: "Run Automate or delegate first.",
  };
  function autoErr(r) { return r && AUTO_ERR[r.reason] ? AUTO_ERR[r.reason] : gigErr(r); }
  function stepsText(a) {
    if (!a || !a.length) return "";
    if (a.length === 1) return "Step " + a[0];
    var run = a.every(function (x, i) { return i === 0 || x === a[i - 1] + 1; });
    return "Steps " + (run ? a[0] + " to " + a[a.length - 1] : a.join(", "));
  }
  // One sentence ending in one period, whatever the AI or the catalog wrote (ChatGPT 4d test: "..")
  function sentence(x) { var s = String(x || "").trim(); while (s && (s.charAt(s.length - 1) === "." || s.charAt(s.length - 1) === " ")) s = s.slice(0, -1); return s ? s + ". " : ""; }
  function hoursText(x) { return x >= 1 ? "about " + (x % 1 ? x.toFixed(1) : String(x)) + (x === 1 ? " hour a month" : " hours a month") : x > 0 ? "about " + Math.round(x * 60) + " minutes a month" : "not worked out yet"; }

  function automateCard(pid) {
    var card = h("div", { class: "card", id: "automate-card" }, h("p", { class: "small muted", text: "Loading..." }));
    function load() {
      api.get("/automate?playbook=" + pid).then(function (st) {
        D.clear(card);
        if (!st.ok || !st.on || !st.can_run || st.doc_type === "policy" || !st.approved) { card.remove(); return; }
        card.appendChild(h("h2", { text: "✦ Automate or delegate" }));
        card.appendChild(cardStatus("automate"));
        var freq = h("select", { "aria-label": "How often does this run?" }, [h("option", { value: "", text: "Choose (optional)" })].concat(["daily", "weekly", "monthly", "quarterly"].map(function (k) {
          return h("option", { value: k, text: FREQ_WORDS[k], selected: st.review && st.review.frequency === k });
        })));
        var mins = h("input", { type: "number", min: "1", max: "6000", step: "1", "aria-label": "How long does it take each time?", placeholder: "Minutes (optional)", value: st.review && st.review.minutes ? String(st.review.minutes) : "" });
        var boxes = h("div", { class: "row", style: "flex-wrap:wrap" }, field("How often does this run?", freq), field("How long does it take each time?", mins, "In minutes. Leave both empty and DELA estimates."));
        if (!st.review) {
          if (st.dismissed) { card.remove(); return; }
          card.appendChild(h("p", { text: "DELA can find steps in this document to automate or hand to a freelancer." }));
          if (st.out_of_date) card.appendChild(h("p", { class: "small muted", text: "The last review was for an older version. This approved version needs its own review." }));
          card.appendChild(boxes);
          var go = h("button", { class: "blue", type: "button" }, "✦ Find what to automate or delegate");
          go.addEventListener("click", function () {
            go.disabled = true; go.textContent = "DELA is reviewing the steps...";
            api.post("/automate/review", { playbook_id: pid, frequency: freq.value, minutes: mins.value ? Number(mins.value) : null }).then(function (x) {
              if (!x.ok) throw x;
              cardSay("automate", (x.review.recommendations || []).length ? "DELA found " + x.review.recommendations.length + " to look at." : "DELA found nothing to automate or delegate in this document.");
              load();
            }).catch(function (e) { go.disabled = false; go.textContent = "✦ Find what to automate or delegate"; cardSay("automate", e && e.reason ? autoErr(e) : D.errorText(e && e.message), true); });
          });
          card.appendChild(h("div", { class: "row" }, go, h("a", { href: "#", class: "small", style: "margin-left:12px", onclick: function (ev) {
            ev.preventDefault(); api.post("/automate/dismiss", { playbook_id: pid, dismissed: true }).then(function () { card.remove(); }).catch(gigFail);
          } }, "Dismiss")));
          card.appendChild(h("p", { class: "small muted", text: "Each review uses " + (me.side === "attorney" ? "your" : "the") + " DELA actions (or your own AI key) once for this approved version." }));
        } else {
          var t = st.review.time || {};
          card.appendChild(h("p", { class: "small muted", text: "DELA reviewed version " + st.review.version + ". " + (t.estimated ? "Time saved is estimated by DELA" + (t.frequency ? " (" + (FREQ_WORDS[t.frequency] || "").toLowerCase() + ", about " + t.minutes + " minutes each time)" : "") + ". Add your own numbers for a better estimate." : "Time saved uses your answers.") }));
          var upd = h("button", { class: "ghost small", type: "button" }, "Update time saved");
          upd.addEventListener("click", function () {
            api.post("/automate/review", { playbook_id: pid, frequency: freq.value, minutes: mins.value ? Number(mins.value) : null }).then(function (x) { if (!x.ok) throw x; cardSay("automate", "Time saved updated."); load(); })
              .catch(function (e) { cardSay("automate", autoErr(e), true); });
          });
          card.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;align-items:flex-end" }, boxes, upd));
          if (!(st.review.recommendations || []).length) card.appendChild(h("p", { class: "muted", text: "DELA found nothing to automate or delegate in this version." }));
          else {
            // One line that says where things stand (UX review D02)
            var recs = st.review.recommendations, handed = recs.filter(function (x) { return (st.delegations || []).some(function (d) { return d.rec_id === x.id; }); }).length;
            card.appendChild(h("p", { class: "small", style: "font-weight:700", id: "automate-summary", text: recs.length + (recs.length === 1 ? " idea" : " ideas") + (handed ? " | " + handed + " already delegated" : "") }));
          }
          (st.review.recommendations || []).forEach(function (r) {
            var row = h("div", { class: "soft", style: "margin:8px 0" },
              h("div", { class: "row" }, h("span", { class: "badge " + (r.kind === "delegate" ? "ready" : ""), text: r.kind === "delegate" ? "Delegate" : "Automate" }), h("b", { class: "grow", text: " " + r.title }),
                r.partner ? h("span", { class: "badge", text: "Lawfecta partner" }) : null),
              h("div", { class: "small", text: stepsText(r.steps) + (r.why ? ". " + r.why : "") }),
              h("div", { class: "small", text: "Estimated time saved: " + hoursText(r.hours_month) + (t.estimated ? " (estimated by DELA)" : " (from your numbers)") }));
            if (r.kind === "automate") row.appendChild(h("div", { class: "small", text: "Tool: " + r.tool + ". " + (r.in_firm ? "Already in your firm profile. " : "") + sentence(r.what_it_does) + (r.in_firm ? "" : sentence(r.tool_description)) }));
            else if ((r.skills || []).length) row.appendChild(h("div", { class: "small muted", text: "Skills: " + r.skills.join(", ") }));
            var acts = h("div", { class: "row", style: "margin-top:6px;flex-wrap:wrap" });
            // Already delegated (UX review D02): show where it stands, never as a new idea
            var done = (st.delegations || []).filter(function (d) { return d.rec_id === r.id; })[0];
            if (done) {
              var gs = done.gig_status;
              acts.appendChild(h("span", { class: "badge ready", text: !done.gig_id ? (done.kind === "setup" ? "Setup task started" : "Delegation started") : gs === "draft" ? "Gig drafted" : gs === "open" ? "Gig posted" : "Gig " + ((GIG_STATUS[gs] || gs || "").toLowerCase()) }));
              acts.appendChild(done.gig_id ? h("button", { class: "ghost small", type: "button", onclick: function () { gigLink(done.gig_id, "projects"); } }, "View gig")
                : h("button", { class: "ghost small", type: "button", onclick: function () { auto.open = done.id; load(); } }, done.kind === "setup" ? "Open the setup task" : "Open the delegation"));
              row.appendChild(acts);
              card.appendChild(row);
              return;
            }
            function start(kind) {
              api.post("/automate/delegate", { review_id: st.review.id, rec_id: r.id, kind: kind }).then(function (x) { if (!x.ok) throw x; auto.open = x.delegation.id; load(); })
                .catch(function (e) { cardSay("automate", autoErr(e), true); });
            }
            if (r.kind === "delegate") acts.appendChild(h("button", { class: "blue small", type: "button", onclick: function () { start("delegate"); } }, "Delegate these steps"));
            else {
              acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
                api.post("/automate/apply-tool", { playbook_id: pid, rec_id: r.id }).then(function (x) {
                  if (!x.ok) throw x;
                  cardSay("automate", x.duplicate ? "Those steps already use " + r.tool + "." : stepsText(x.steps) + " now use " + r.tool + ". That is a new version of the document: approve it to use it.");
                  if (!x.duplicate) setTimeout(function () { openPlaybook(pid); }, 600);
                }).catch(function (e) { cardSay("automate", autoErr(e), true); });
              } }, "Add this tool to the steps"));
              acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { start("setup"); } }, "Hire a freelancer to set it up"));
            }
            row.appendChild(acts);
            card.appendChild(row);
          });
        }
        (st.delegations || []).forEach(function (d) {
          card.appendChild(h("div", { class: "row", style: "border-top:1px solid var(--line);padding-top:6px;margin-top:6px" },
            h("span", { class: "small grow", text: (d.kind === "setup" ? "Setup task" : "Delegated") + ": " + stepsText(d.steps) + ", " + d.title + (d.sop_id ? ". See SOP " + ((d.sop_doc_id ? d.sop_doc_id + " " : "") + d.sop_title) + (d.sop_status === "approved" ? "" : " (draft)") : "") + (d.gig_id ? (d.gig_status && d.gig_status !== "draft" ? ". Gig posted." : ". Gig drafted, not posted yet.") : "") }),
            h("button", { class: "ghost small", type: "button", onclick: function () { auto.open = d.id; load(); } }, auto.open === d.id ? "Open below" : d.kind === "setup" ? "Open the setup task" : "Open the delegation")));
        });
        if (auto.open) card.appendChild(delegatePanel(auto.open, load));
      }).catch(function () { card.remove(); });
    }
    load();
    return card;
  }

  function delegatePanel(id, reloadCard) {
    var box = h("div", { id: "delegate-panel", style: "border-top:2px solid var(--line);margin-top:12px;padding-top:8px" }, h("p", { class: "small muted", text: "Loading..." }));
    function fail(e) { cardSay("delegate", e && e.reason ? autoErr(e) : D.errorText(e && e.message), true); }
    function post(path, body, msg) { return api.post(path, Object.assign({ id: id }, body || {})).then(function (x) { if (!x.ok) throw x; if (msg) cardSay("delegate", msg); render(x); return x; }).catch(fail); }
    function section(n, title, stage, body) {
      return h("div", { class: "soft", style: "margin:8px 0" + (n === stage ? ";border:2px solid var(--brand)" : "") }, h("h3", { style: "margin:0 0 4px", text: n + ". " + title }), body);
    }
    function render(v) {
      D.clear(box);
      if (!v.ok) { box.appendChild(h("p", { class: "notice", text: autoErr(v) })); return; }
      var d = v.delegation, sop = v.sop, stage = d.stage;
      box.appendChild(h("div", { class: "row" }, h("h2", { class: "grow", style: "margin:0", text: (d.kind === "setup" ? "Hire a freelancer to set it up: " : "Delegate: ") + d.title }),
        h("button", { class: "ghost small", type: "button", onclick: function () { auto.open = null; reloadCard(); } }, "Close")));
      box.appendChild(h("p", { class: "small muted", text: "Your progress is saved. You can stop and come back from this card." }));
      box.appendChild(cardStatus("delegate"));
      // 1. The steps
      var s1 = h("div");
      if (d.kind === "setup") s1.appendChild(h("p", { class: "small", text: "A setup task for " + d.tool + " on " + stepsText(d.steps).toLowerCase() + " of " + (v.parent ? v.parent.title : "this document") + ". Freelancers who list " + d.tool + " in their tools are matched first." }));
      else {
        var ticks = (v.parent_steps || []).map(function (p) {
          var locked = p.attorney_decides || p.judgment;
          var c = h("input", { type: "checkbox", disabled: locked || (sop && sop.status === "approved"), "aria-label": "Step " + p.n });
          c.checked = p.chosen && !locked;
          s1.appendChild(h("label", { style: "display:flex;gap:8px;font-weight:400;margin:2px 0" }, c, h("span", { text: p.n + ". " + p.text + (p.attorney_decides ? " (Attorney decides: stays with the attorney)" : p.judgment ? " (Needs legal judgment: stays with the attorney)" : "") })));
          return [p.n, c];
        });
        if (!(sop && sop.status === "approved")) s1.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
          post("/automate/delegation", { steps: ticks.filter(function (x) { return x[1].checked; }).map(function (x) { return x[0]; }), stage: Math.max(stage, 2) }, "Steps saved.");
        } }, "Save the steps"));
      }
      box.appendChild(section(1, "Confirm which steps to delegate", stage, s1));
      // 2. The SOP
      var s2 = h("div");
      if (sop) s2.appendChild(h("p", { class: "small", text: "SOP: " + (sop.doc_id ? sop.doc_id + " " : "") + sop.title + " (" + (sop.status === "approved" ? "approved" : "draft") + "). It links back to " + (v.parent ? v.parent.title : "the document") + ", and the supervising attorney stays Accountable (A) on every step." }));
      s2.appendChild(h("div", { class: "row" }, !sop ? h("button", { class: "blue small", type: "button", onclick: function () { post("/automate/delegation/sop", {}, "DELA drafted the SOP for just these steps."); } }, "Draft the SOP for these steps") : null,
        sop ? h("button", { class: "ghost small", type: "button", onclick: function () { openPlaybook(sop.id); } }, "Open the SOP") : null));
      box.appendChild(section(2, "The SOP for just this task", stage, s2));
      // 3. KPIs
      var k = v.kpis || {};
      var days = h("input", { type: "number", min: "1", max: "90", "aria-label": "Turnaround (business days)", value: String(k.turnaround_days || 2) });
      var acc = h("input", { type: "number", min: "50", max: "100", "aria-label": "Accuracy target (%)", value: String(k.accuracy_pct || 95) });
      var chk = h("textarea", { rows: 4, style: "width:100%", "aria-label": "Quality checklist, one per line" });
      chk.value = (k.checklist || []).join("\n");
      var done = h("textarea", { rows: 2, style: "width:100%", "aria-label": "What done means" });
      done.value = k.done || "";
      var locked3 = sop && sop.status === "approved";
      [days, acc, chk, done].forEach(function (x) { x.disabled = locked3; });
      var s3 = h("div", null, h("p", { class: "small muted", text: "These become the SOP's quality check and the rubric DELA's milestone check scores the gig against. No client information." }),
        h("div", { class: "row" }, field("Turnaround (business days)", days), field("Accuracy target (%)", acc)), field("Quality checklist, one per line", chk), field("What done means", done));
      if (!locked3) s3.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
        var body = { kpis: { turnaround_days: Number(days.value), accuracy_pct: Number(acc.value), checklist: lines(chk.value), done: done.value }, stage: Math.max(stage, 4) };
        api.post("/automate/delegation", Object.assign({ id: id }, body)).then(function (x) {
          if (!x.ok) throw x;
          return sop ? api.post("/automate/delegation/sop", { id: id }).then(function (y) { if (!y.ok) throw y; return y; }) : x;
        }).then(function (y) { cardSay("delegate", sop ? "KPIs saved. The SOP now uses them." : "KPIs saved. Draft the SOP in step 2."); render(y); }).catch(fail);
      } }, "Save the KPIs"));
      box.appendChild(section(3, "Metrics and KPIs", stage, s3));
      // 4. Self-check and approval
      var s4 = h("div");
      if (!sop) s4.appendChild(h("p", { class: "small muted", text: "Draft the SOP first (step 2)." }));
      else if (sop.status === "approved") s4.appendChild(h("p", { class: "small", text: "Approved. DELA's self-check passed." }));
      else {
        s4.appendChild(h("p", { class: "small", text: sop.blocking ? "DELA's self-check found " + sop.blocking + (sop.blocking === 1 ? " thing" : " things") + " to fix. Open the SOP to fix them." : "DELA's self-check passes." }));
        if (v.can_approve) s4.appendChild(h("button", { class: "blue small", type: "button", onclick: function () { post("/automate/delegation/approve", {}, "The SOP is approved."); } }, "Approve the SOP"));
        else s4.appendChild(h("p", { class: "small muted", text: "An attorney approves the SOP and posts the gig." }));
      }
      box.appendChild(section(4, "DELA's self-check and your approval", stage, s4));
      // 5. The gig
      var b = v.budget || {}, s5 = h("div");
      var bmin = h("input", { type: "number", min: "0", step: "1", "aria-label": "Budget from ($)", value: String(Math.round((b.low_cents || 0) / 100)) });
      var bmax = h("input", { type: "number", min: "0", step: "1", "aria-label": "Budget to ($)", value: String(Math.round((b.high_cents || 0) / 100)) });
      var dl = h("input", { type: "date", "aria-label": "Deadline" });
      s5.appendChild(h("p", { class: "small", text: b.at_minimum
        ? "Suggested budget: " + D.money(b.low_cents) + ", the smallest gig budget on Lawfecta. About " + v.hours + " hours of work would cost less at usual rates, so you could add more to this gig. Suggested budget. You set the final amount."
        : "Suggested budget: " + D.money(b.low_cents) + " to " + D.money(b.high_cents) + ", for about " + v.hours + " hours of work. Suggested budget. You set the final amount." }));
      s5.appendChild(h("p", { class: "small", text: "You also pay Lawfecta's platform fee: " + D.money(b.fee_low_cents) + " to " + D.money(b.fee_high_cents) + " on that budget, so the full cost is " + D.money((b.low_cents || 0) + (b.fee_low_cents || 0)) + " to " + D.money((b.high_cents || 0) + (b.fee_high_cents || 0)) + "." }));
      if (d.gig_id) s5.appendChild(h("button", { class: "blue small", type: "button", onclick: function () { gigLink(d.gig_id, "projects"); } }, "Open the gig"));
      else if (!sop || sop.status !== "approved") s5.appendChild(h("p", { class: "small muted", text: "Approve the SOP first (step 4)." }));
      else if (!v.can_approve) s5.appendChild(h("p", { class: "small muted", text: "An attorney approves the SOP and posts the gig." }));
      else {
        s5.appendChild(h("div", { class: "row" }, field("Budget from ($)", bmin), field("Budget to ($)", bmax), field("Deadline", dl)));
        var mk = h("button", { class: "blue small", type: "button" }, "Draft the gig");
        mk.addEventListener("click", function () {
          mk.disabled = true; mk.textContent = "DELA is writing the public version...";
          api.post("/automate/delegation/gig", { id: id, budget_min: bmin.value, budget_max: bmax.value, deadline: dl.value }).then(function (x) { if (!x.ok) throw x; gigLink(x.gig_id, "projects"); })
            .catch(function (e) { mk.disabled = false; mk.textContent = "Draft the gig"; fail(e); });
        });
        s5.appendChild(mk);
        s5.appendChild(h("p", { class: "small muted", text: "The gig page opens. Check the public version there, then click \"Post the gig\"." }));
      }
      box.appendChild(section(5, "The gig", stage, s5));
      if (!d.gig_id) box.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
        api.post("/automate/delegation", { id: id, cancel: true }).then(function () { auto.open = null; reloadCard(); }).catch(fail);
      } }, "Stop delegating these steps"));
    }
    api.get("/automate/delegation?id=" + id).then(render).catch(fail);
    return box;
  }

  // ---------- Step 4d, part B: "Get set up" for attorneys (one screen; each step opens in place; Skip for now) ----------
  var setup = { open: null };
  var SETUP_STEPS = [
    ["profile", "Your profile and verification", "Your license and firm details, so you can hire."],
    ["firm", "Teach DELA about your firm", "Practice areas, the systems you use and your roles. DELA reads this each time it writes for you, only for your firm."],
    ["playbook", "Your first document", "Import from Scribe, record a process, or start from a starter document. Then approve it."],
    ["automate", "✦ Find what to automate or delegate", "DELA reviews an approved document and suggests steps to automate or hand to a freelancer."],
    ["gig", "Post your first gig", "From the delegated SOP, or any approved SOP or Workflow."],
    ["invite", "Invite freelancers", "From your gig's matches."],
  ];
  function setupHomeCard() {
    var card = h("div", { class: "card", id: "setup-home" });
    api.get("/setup").then(function (st) {
      if (!st.ok || !st.on || st.finished || st.dismissed) { card.remove(); return; }
      card.appendChild(h("div", { class: "row" }, h("h2", { class: "grow", text: "Get set up: " + st.done + " of " + st.total + " done" }),
        h("a", { href: "#", class: "small", onclick: function (ev) { ev.preventDefault(); api.post("/setup", { dismissed: true }).then(function () { card.remove(); }).catch(gigFail); } }, "Dismiss")));
      card.appendChild(h("div", { class: "bar" }, h("span", { style: "width:" + Math.round(st.done / st.total * 100) + "%" })));
      card.appendChild(h("button", { class: "blue small", style: "margin-top:8px", type: "button", onclick: function () { tab = "setup"; draw(); } }, "Continue setting up"));
    }).catch(function () { card.remove(); });
    return card;
  }
  function setupView() {
    var el = h("div", null, h("h1", { text: "Get set up" }), h("p", { class: "muted", text: "Six steps to your first gig. Each one opens here. Skip any step and come back to it later." }), cardStatus("setup"));
    var list = h("div");
    el.appendChild(list);
    function load() {
      api.get("/setup").then(function (st) {
        D.clear(list);
        if (!st.ok || !st.on) { list.appendChild(h("p", { class: "notice", text: "Get set up is not open for your account yet." })); return; }
        list.appendChild(h("p", { class: "small", text: st.done + " of " + st.total + " done" + (st.finished ? ". You are set up." : ".") }));
        SETUP_STEPS.forEach(function (sd, i) {
          var s = (st.steps || []).filter(function (x) { return x.key === sd[0]; })[0] || {}, skipped = (st.skipped || []).indexOf(sd[0]) >= 0;
          var open = setup.open === sd[0];
          var card = h("div", { class: "card", id: "setup-" + sd[0] },
            h("div", { class: "row" }, h("span", { class: "chip", text: String(i + 1) }), h("h2", { class: "grow", style: "margin:0", text: sd[1] }),
              h("span", { class: "badge " + (s.done ? "ready" : skipped ? "held" : ""), text: s.done ? "Done" : skipped ? "Skipped" : "To do" })),
            h("p", { class: "small muted", text: sd[2] }));
          var acts = h("div", { class: "row" }, h("button", { class: open ? "ghost small" : "blue small", type: "button", onclick: function () { setup.open = open ? null : sd[0]; load(); } }, open ? "Close" : "Open"));
          if (!s.done) acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () {
            api.post("/setup", { step: sd[0], skip: !skipped }).then(function (x) { if (!x.ok) throw x; cardSay("setup", skipped ? "Back on your list." : "Skipped for now. It stays here for later."); load(); }).catch(gigFail);
          } }, skipped ? "Pick up again" : "Skip for now"));
          card.appendChild(acts);
          if (open) { var host = h("div", { style: "margin-top:10px" }); card.appendChild(host); setupStep(sd[0], host, load); }
          list.appendChild(card);
        });
      }).catch(function (e) { D.clear(list); list.appendChild(h("p", { class: "notice bad", text: D.errorText(e.message) })); });
    }
    load();
    return el;
  }
  function setupStep(key, host, reload) {
    if (key === "profile") { host.appendChild(profileView()); return; }
    if (key === "firm") {
      docFirm().then(function (f) { firmProfileForm(host, f, function () { cardSay("setup", "Firm profile saved."); reload(); }); }).catch(function (e) { host.appendChild(h("p", { class: "notice", text: gigErr(e) })); });
      return;
    }
    if (key === "playbook") { lib.pb = null; host.appendChild(libraryView()); return; }
    if (key === "gig") { host.appendChild(projectsView()); return; }
    api.get("/gigs").then(function (r) {
      if (key === "automate") {
        var docs = (r.playbooks || []);
        if (!docs.length) { host.appendChild(h("p", { class: "muted", text: "Approve an SOP or Workflow first (step 3)." })); return; }
        var pick = h("select", { "aria-label": "Approved document to review" }, docs.map(function (p) { return h("option", { value: p.id, text: (p.doc_id ? p.doc_id + " " : "") + p.title }); }));
        var slot = h("div");
        host.appendChild(field("Approved document to review", pick));
        host.appendChild(slot);
        function show() { D.clear(slot); api.post("/automate/dismiss", { playbook_id: pick.value, dismissed: false }).catch(function () {}).then(function () { slot.appendChild(automateCard(pick.value)); }); }
        pick.addEventListener("change", show);
        show();
        return;
      }
      var open = (r.gigs || []).filter(function (g) { return g.status === "open"; });
      if (!open.length) { host.appendChild(h("p", { class: "muted", text: "Post a gig first (step 5)." })); return; }
      open.forEach(function (g) {
        host.appendChild(h("div", { class: "row", style: "margin:4px 0" }, h("span", { class: "grow", text: g.title }), h("button", { class: "ghost small", type: "button", onclick: function () {
          var slot = h("div"); host.appendChild(slot); gigs.id = g.id; gigs.view = "matches"; gigPage(slot);
        } }, "Open matches")));
      });
    }).catch(function (e) { host.appendChild(h("p", { class: "notice", text: D.errorText(e.message) })); });
  }

  function drawDocument() {
    var P = lib.pb.playbook, d = docWork(), ck = lib.pb.check || { items: [], blocking: 0 };
    var locked = docLocked(P.id);
    var edit = can(3) && P.status !== "trash" && P.status !== "archived" && !locked;
    var AV = lib.pb.approved || null;
    // An approved document is only edited after "Edit a new draft"; otherwise the draft tab shows its approved version
    if (AV && AV.current && lib.editDraft !== P.id && (lib.view === "read" || lib.view === "edit")) lib.view = "approved";
    if (!AV && lib.view === "approved") lib.view = "read";
    D.clear(libEl);
    lockNotice(P.id);
    libEl.appendChild(h("div", { class: "row", style: "margin-top:14px" }, h("button", { class: "ghost small", onclick: function () { lib.doc = null; loadLibrary(); } }, "← Library")));
    libEl.appendChild(h("div", { class: "row", style: "margin:8px 0 4px" }, h("h1", { class: "grow", style: "margin:0", text: (P.doc_id ? P.doc_id + " " : "") + P.title }),
      h("span", { class: "badge", text: DOC_TYPE_WORDS[d.type] }), h("span", { class: "badge " + (P.status === "approved" ? "ready" : P.status === "in_review" ? "held" : ""), text: PB_STATUS[P.status] })));
    if (lib.view === "approved") { /* the approved page says which version is in use */ }
    else if (P.status !== "approved") libEl.appendChild(h("div", { class: "notice", role: "note", style: "font-weight:700" }, h("span", { text: "Draft, not approved. Do not use this as an approved procedure." + (P.approved_version ? " The approved version " + P.approved_version + " stays in use until this one is approved." : "") }),
      AV ? h("span", null, " ", h("button", { class: "ghost small", type: "button", onclick: function () { lib.view = "approved"; drawDocument(); } }, "View the approved version")) : null));
    else if (AV && lib.editDraft === P.id) libEl.appendChild(h("div", { class: "notice", role: "note", text: "New draft. Your first save makes version " + (P.version + 1) + " as a draft; the approved version " + P.approved_version + " stays in use until the draft is approved." }));
    if (P.converted) {
      var tsel = h("select", { "aria-label": "Change the type" }, ["sop", "workflow", "playbook", "policy"].map(function (t) { return h("option", { value: t, text: DOC_TYPE_WORDS[t], selected: d.type === t }); }));
      libEl.appendChild(h("div", { class: "notice ok" }, h("p", { style: "margin:0 0 6px", text: "DELA moved this to the document standard as " + DOC_TYPE_WORDS[d.type] + (P.conversion_note ? " (" + P.conversion_note + ")" : "") + ". Check it, then approve it again." }),
        h("div", { class: "row" }, tsel, h("button", { class: "blue small", type: "button", onclick: function () { changeType(tsel.value); } }, "Change type"),
          h("button", { class: "ghost small", type: "button", onclick: function () { api.post("/documents/conversion-seen", { id: P.id }).then(function () { openPlaybook(P.id); }).catch(pbFail); } }, "The type is right"))));
    }
    if (lib.suggested && lib.suggested.type !== d.type) libEl.appendChild(h("div", { class: "notice" }, h("span", { text: "DELA thinks this fits a " + DOC_TYPE_WORDS[lib.suggested.type] + " better: " + lib.suggested.reason + " " }),
      h("button", { class: "blue small", type: "button", onclick: function () { var t = lib.suggested.type; lib.suggested = null; changeType(t); } }, "Switch to " + DOC_TYPE_WORDS[lib.suggested.type]),
      h("button", { class: "ghost small", type: "button", onclick: function () { lib.suggested = null; drawDocument(); } }, "Keep " + DOC_TYPE_WORDS[d.type])));
    (lib.docNotices || []).forEach(function (n) { libEl.appendChild(h("p", { class: "notice ok", text: n })); });
    lib.docNotices = [];
    // Step 4d: the hint card above an approved SOP, Workflow or Playbook (it removes itself when the switch is off)
    if ((me.switches || {}).automate_delegate && P.approved_version && d.type !== "policy") libEl.appendChild(automateCard(P.id));
    // Header fields, always visible
    var ownerOpts = (d.roles || []).slice();
    if (d.owner_role && ownerOpts.indexOf(d.owner_role) < 0) ownerOpts.unshift(d.owner_role);
    var owner = h("select", { "aria-label": "Owner (role)", disabled: !edit }, ownerOpts.map(function (r) { return h("option", { value: r, text: r, selected: d.owner_role === r }); }));
    owner.addEventListener("change", function () { d.owner_role = owner.value; });
    var risk = h("input", { type: "checkbox", checked: !!d.high_risk, disabled: !edit, "aria-label": "High risk (trust, conflicts or deadlines)" });
    risk.addEventListener("change", function () { d.high_risk = risk.checked; });
    if (lib.view !== "approved") libEl.appendChild(h("div", { class: "kv" }, h("div", null, "Document ID", h("b", { text: P.doc_id || "Not given yet (given at the first save)" })), h("div", null, "Version", h("b", { text: String(P.version) })),
      h("div", null, "Owner (role)", owner), h("div", null, "Last reviewed", h("b", { text: P.last_reviewed_at ? D.date(P.last_reviewed_at) : P.approved_version ? "Never reviewed since approval" : "Not reviewed yet" })),
      h("div", null, "Next review", h("b", { text: P.next_review_at ? D.date(P.next_review_at) : (d.high_risk ? "3 months after approval" : "12 months after approval") })),
      h("div", null, "High risk", h("label", { style: "display:flex;gap:6px;font-weight:400" }, risk, h("span", { text: "Trust, conflicts or deadlines (reviewed every 3 months)" })))));
    var views = [["read", "Draft and review"], ["chat", "Chat"], ["suggestions", "Suggested edits (" + lib.pb.suggestions.length + ")"], ["comments", "Comments (" + lib.pb.comments.filter(function (c) { return !c.resolved; }).length + ")"],
      ["activity", "Activity"], ["versions", "Versions"], ["files", "Files (" + lib.pb.files.length + ")"]];
    if (AV) {
      if (AV.current && lib.editDraft !== P.id) views[0] = ["approved", "Approved version"];
      else views.splice(0, 1, ["approved", "Approved version"], ["read", AV.current ? "New draft" : "Draft (version " + P.version + ")"]);
    }
    libEl.appendChild(h("div", { class: "tabs", role: "tablist", style: "border-radius:14px;margin:10px 0" }, views.map(function (v) {
      return h("button", { role: "tab", "aria-selected": String((lib.view === "edit" ? "read" : lib.view) === v[0]), onclick: function () { lib.view = v[0]; drawDocument(); } }, v[1]);
    })));
    var area = h("div");
    libEl.appendChild(area);
    if (lib.view === "approved" && AV) approvedPage(area, d, AV, edit, ck);
    else if (lib.view === "read" || lib.view === "edit" || lib.view === "export") reviewScreen(area, d, ck, edit);
    else ({ chat: pbChatView, suggestions: docSuggestionsView, comments: commentsView, activity: activityView, versions: versionsView, files: pbFilesView })[lib.view](area, d);
    if (can(4)) {
      libEl.appendChild(h("div", { class: "row", style: "margin-top:18px" },
        P.status === "archived" ? h("button", { class: "ghost small", onclick: function () { status("unarchive", "Back in the library"); } }, "Bring back from the archive")
          : P.status !== "trash" ? h("button", { class: "ghost small", onclick: function () { status("archive", "Archived"); } }, "Archive") : null,
        // A draft that was never approved is deleted at once and for good (Stacey 2026-11-05); approved documents use Trash
        P.status === "draft" && !P.approved_version ? h("button", { class: "danger small", type: "button", onclick: function () {
          if (!confirm("Delete this draft for good? It was never approved, so it is removed at once with its versions and comments. This cannot be undone.")) return;
          api.post("/playbooks/delete-draft", { id: P.id }).then(okOr).then(function () { D.toast(app, "Draft deleted"); lib.pb = null; loadLibrary(); }).catch(pbFail);
        } }, "Delete draft") :
        P.status === "trash" ? h("button", { class: "ghost small", onclick: function () { status("restore", "Restored"); } }, "Restore from the trash")
          : h("button", { class: "danger small", onclick: function () { if (confirm("Move this document to the trash? You can restore it for 30 days.")) status("trash", "Moved to the trash"); } }, "Delete")));
    }
  }

  function changeType(t) {
    api.post("/documents/type", { id: lib.pb.playbook.id, type: t }).then(function (r) { if (!r.ok) throw r; lib.doc = null; openPlaybook(lib.pb.playbook.id, "read"); D.toast(app, "Now a " + DOC_TYPE_WORDS[t]); }).catch(pbFail);
  }

  function docSave(note, then) {
    var d = docWork();
    var payload = JSON.parse(JSON.stringify(d)); delete payload._id;
    return api.post("/playbooks/save", { id: lib.pb.playbook.id, base_version: lib.pb.playbook.version, body: payload, note: note || "" }).then(function (r) {
      if (!r.ok) throw r;
      lib.doc = null;
      lib.docNotices = r.notices || [];
      return then ? then(r) : openPlaybook(lib.pb.playbook.id, "read");
    }).catch(pbFail);
  }

  // Each fix button says what it fixes (UX review D03), for example "Fix it: Each step starts with a verb"
  function fixLabel(it) { var l = String(it.label || "").split(":")[0]; return "Fix it: " + (l.length > 48 ? l.slice(0, 46) + "..." : l); }

  // Phase 4 part A (UX review D01): the approved version, read-only. Gigs, standing arrangements and exports use it.
  function approvedPage(area, d, AV, edit, ck) {
    var P = lib.pb.playbook, draftOpen = !AV.current;
    var card = h("div", { class: "card", id: "approved-version" }, h("h2", { text: "Approved version " + AV.version }));
    card.appendChild(h("div", { class: "kv" },
      h("div", null, "Document ID", h("b", { text: P.doc_id || "Not recorded" })),
      h("div", null, "Version", h("b", { text: String(AV.version) })),
      h("div", null, "Approved", h("b", { text: AV.approved_at ? D.date(AV.approved_at) + (AV.approved_by ? " by " + AV.approved_by : "") : "Date not recorded" })),
      h("div", null, "Owner (role)", h("b", { text: d.owner_role || "Not set" })),
      h("div", null, "Last reviewed", h("b", { text: P.last_reviewed_at ? D.date(P.last_reviewed_at) : "Never reviewed since approval" })),
      h("div", null, "Next review", h("b", { text: P.next_review_at ? D.date(P.next_review_at) : "Not scheduled" }))));
    // An older document approved before IDs and review dates existed (step 8b, retest R07): say what is missing and how
    // to add it, never a made-up date
    if (!P.doc_id || !AV.approved_at || !P.next_review_at) card.appendChild(h("p", { class: "small muted", text: "Some details were not recorded when this version was approved. They are added when a new draft is approved." }));
    card.appendChild(h("p", { class: "small muted", text: "This is the version in use: new gigs, standing arrangements and exports use it." + (P.status === "archived" ? " The document is archived." : P.status === "trash" ? " The document is in the trash." : "") }));
    var acts = h("div", { class: "row", style: "flex-wrap:wrap" });
    if (draftOpen) {
      card.appendChild(h("p", { class: "notice", role: "note", text: "A draft (version " + P.version + ") is in progress. This approved version stays in use until the draft is approved." }));
      acts.appendChild(h("button", { class: "blue small", type: "button", onclick: function () { lib.view = "read"; drawDocument(); } }, "Open the draft"));
    } else if (edit) acts.appendChild(h("button", { class: "blue small", type: "button", onclick: function () { lib.editDraft = P.id; lib.view = "read"; drawDocument(); } }, "Edit a new draft"));
    if (!draftOpen && P.status === "approved" && (d.type === "sop" || d.type === "workflow") && (me.switches || {}).flex_gigs && can(4)) acts.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { gigs.id = null; gigs.newFrom = P.id; tab = "projects"; draw(); } }, "Post as a Flex Gig"));
    if (acts.children.length) card.appendChild(acts);
    card.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;margin-top:8px" }, h("span", { class: "small", text: "Export the approved version: " }),
      [["docx", "Word"], ["pdf", "PDF"], ["md", "Markdown"], ["html", "Web page"], ["csv", "Step checklist"]].map(function (f) { return h("button", { class: "ghost small", type: "button", onclick: function () { doExport(f[0], "approved"); } }, f[1]); })));
    area.appendChild(card);
    // The quality check's notes on the approved version, read-only (step 8b, retest R04 follow-up: the Library's
    // "N quality notes" link opens here for an approved document). Acting on them means a new draft.
    var notes = ((ck || {}).items || []).filter(function (it) { return it.status !== "pass"; });
    if (notes.length) {
      var qn = h("div", { class: "card", id: "quality-check" }, h("h2", { text: "Quality notes (" + notes.length + ")" }),
        h("p", { class: "small muted", text: "What the quality check suggests for this version. They do not block anything, and they do not confirm the document is legally correct. To act on them, start a new draft; the approved version stays in use until the new one is approved." }));
      notes.forEach(function (it) {
        qn.appendChild(h("div", { class: "qp-item " + it.status, style: "margin:6px 0" }, h("div", { class: "row" }, h("b", { class: "grow", text: (it.status === "blocking" ? "✕ " : "! ") + it.label }),
          h("span", { class: "badge " + (it.status === "blocking" ? "bad" : "held"), text: it.status === "blocking" ? "Required before approval" : "Suggestion" })), it.detail ? h("div", { class: "small", text: it.detail }) : null));
      });
      area.appendChild(qn);
    }
    // The document itself, laid out as the export (no boxes, no Save buttons)
    var doc = h("div", { class: "card", id: "approved-body" });
    (AV.blocks || []).forEach(function (b) {
      doc.appendChild(h("h3", { text: b.title }));
      if (b.paras) { var ps = b.paras.filter(Boolean); if (ps.length) ps.forEach(function (t) { doc.appendChild(h("p", { text: t })); }); else doc.appendChild(h("p", { class: "muted", text: "Not set" })); }
      if (b.items) {
        if (!b.items.length) doc.appendChild(h("p", { class: "muted", text: "Not set" }));
        else doc.appendChild(h(b.numbered ? "ol" : "ul", null, b.items.map(function (t, i) { return h("li", null, h("span", { style: "white-space:pre-line", text: t }), imagesRead((b.itemImages || [])[i])); })));
      }
      var cell = "border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top";
      if (b.table) doc.appendChild(h("div", { class: "scroll" }, h("table", { style: "width:100%;border-collapse:collapse;font-size:14px" },
        b.table.head.some(Boolean) ? h("tr", null, b.table.head.map(function (x) { return h("th", { style: cell, text: x }); })) : null,
        b.table.rows.map(function (r) { return h("tr", null, r.map(function (x) { return h("td", { style: cell, text: x }); })); }))));
      var ims = imagesRead(b.images); if (ims) doc.appendChild(ims);
    });
    area.appendChild(doc);
  }

  function reviewScreen(area, d, ck, edit) {
    var P = lib.pb.playbook;
    var grid = h("div", { class: "doc-grid" });
    var left = h("div", { class: "doc-left" }), right = h("div", { class: "doc-right" });
    grid.appendChild(left); grid.appendChild(right);
    area.appendChild(grid);
    // The quality panel
    var blocked = ck.blocking > 0;
    var qp = h("div", { class: "card", id: "quality-check" }, h("h2", null, D.term("Quality check", "quality_check")), h("p", { class: "small muted", text: "Items marked \"Required before approval\" must be fixed first. Items marked \"Suggestion\" are optional. These checks look at how the document is written; they do not confirm it is legally correct." }),
      h("p", { class: blocked ? "notice bad" : "small muted", text: blocked ? "Export, approval and Flex Gigs are blocked until the items marked \"Required before approval\" are fixed." : ck.attention ? "Nothing blocks this document. Look at the items marked \"Suggestion\"." : "Every check passes." }));
    var passed = (ck.items || []).filter(function (it) { return it.status === "pass"; });
    var passBox = h("details", { class: "small" }, h("summary", { text: passed.length + " checks passed" }));
    (ck.items || []).forEach(function (it) {
      var mark = it.status === "pass" ? "✓" : it.status === "blocking" ? "✕" : "!";
      var row = h("div", { class: "qp-item " + it.status, style: "margin:6px 0" }, h("div", { class: "row" }, h("b", { class: "grow", text: mark + " " + it.label }),
        h("span", { class: "badge " + (it.status === "pass" ? "ready" : it.status === "blocking" ? "bad" : "held"), text: it.status === "pass" ? "Passed" : it.status === "blocking" ? "Required before approval" : "Suggestion" })),
        it.detail ? h("div", { class: "small", text: it.detail }) : null);
      if (it.status !== "pass" && it.fix === "image" && edit) { row.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { fixImageItem(it, d); } }, fixLabel(it))); (it.status === "pass" ? passBox : qp).appendChild(row); return; }
      if (it.status !== "pass" && it.fix && edit) row.appendChild(h("button", { class: "ghost small", type: "button", onclick: function (e) {
        var b = e.target; b.disabled = true; b.textContent = it.fix === "split" ? "Splitting..." : "Fixing...";
        api.post("/documents/fix", { id: P.id, check_id: it.id }).then(function (r) {
          if (!r.ok) throw r;
          lib.doc = null; lib.docNotices = (r.notices || []).concat(r.created && r.created.length ? ["Split into linked SOPs. New: " + r.created.map(function (c) { return c.title; }).join(", ") + "."] : []);
          openPlaybook(P.id, "read");
        }).catch(function (x) { b.disabled = false; b.textContent = it.fix === "split" ? "Split into linked SOPs" : fixLabel(it); pbFail(x); });
      } }, it.fix === "split" ? "Split into linked SOPs" : fixLabel(it)));
      (it.status === "pass" ? passBox : qp).appendChild(row);
    });
    if (passed.length) qp.appendChild(passBox);
    // Actions
    var acts = h("div", { class: "row", style: "flex-wrap:wrap;margin-top:8px" });
    if (edit) acts.appendChild(h("button", { class: "blue small", type: "button", onclick: function () { docSave("", null); } }, "Save"));
    if (can(3) && P.status === "draft") acts.appendChild(h("button", { class: "ghost small", type: "button", disabled: blocked, onclick: function () { status("submit", "Sent to the administrator for review"); } }, "Send for review"));
    var imgDue = !!(lib.pb.images_due && lib.pb.images_due.due && (lib.pb.images_due.ids || []).length);
    if (can(4) && (P.status === "draft" || P.status === "in_review")) acts.appendChild(h("span", { title: blocked ? "Fix the blocking items first" : imgDue ? "Mark every image \"Still current\" or replace it in Check images first" : "" }, h("button", { class: "blue small", type: "button", disabled: blocked || imgDue, onclick: function () { status("approve", "Approved"); } }, "Approve")));
    if (P.status === "approved" && (d.type === "sop" || d.type === "workflow") && (me.switches || {}).flex_gigs && can(4)) acts.appendChild(h("button", { class: "blue small", type: "button", disabled: blocked, onclick: function () { gigs.id = null; gigs.newFrom = P.id; tab = "projects"; draw(); } }, "Post as a Flex Gig"));
    qp.appendChild(acts);
    var openItems = (ck.items || []).filter(function (it) { return it.status !== "pass"; });
    if (openItems.length) qp.appendChild(helperButton("explain_findings", "✦ Explain these findings", function () { return { playbook_id: P.id }; }, { render: function (out, y) {
      var byId = {}; openItems.forEach(function (it) { byId[it.id] = it; });
      (y.items || []).forEach(function (x) { var it = byId[x.id]; if (it) out.appendChild(h("div", { style: "margin:6px 0" }, h("b", { text: it.label + ": " }), h("span", { text: x.explain }))); });
      if (!(y.items || []).length) out.appendChild(h("p", { style: "margin:0", text: "DELA could not explain these. Read each item's own note above." }));
    } }));
    var draftEx = !!(lib.pb.approved && P.status !== "approved");
    var ex = h("div", { class: "row", style: "flex-wrap:wrap;margin-top:6px" }, h("span", { class: "small", text: draftEx ? "Export this draft (marked DRAFT on every page): " : "Export: " }),
      [["docx", "Word"], ["pdf", "PDF"], ["md", "Markdown"], ["html", "Web page"], ["csv", "Step checklist"]].map(function (f) { return h("button", { class: "ghost small", type: "button", disabled: blocked, onclick: function () { doExport(f[0], draftEx ? "draft" : ""); } }, f[1]); }));
    qp.appendChild(ex);
    right.appendChild(qp);
    var cic = checkImagesCard(d); if (cic) right.appendChild(cic);
    if (lib.questions && lib.questions.length && can(3)) right.appendChild(questionsCard());
    // The editable document, section by section
    left.appendChild(docEditor(d, edit));
    if (d.type === "sop" || d.type === "workflow") left.appendChild(raciGrid(d, edit));
    if (d.type === "workflow") left.appendChild(kpiCards(d, edit));
    left.appendChild(changeLogCard());
  }

  function changeLogCard() {
    var ch = lib.pb.changes || [];
    var appr = {};
    ch.forEach(function (c) { if (c.kind === "approval") appr[c.version] = c.by; });
    return h("details", { class: "card" }, h("summary", { text: "Change log (" + ch.filter(function (c) { return c.kind !== "approval"; }).length + ")" }),
      h("div", { class: "scroll" }, h("table", { class: "stack" }, h("thead", null, h("tr", null, ["Date", "What changed", "Who", "Approved by"].map(function (t) { return h("th", { text: t }); }))),
        h("tbody", null, ch.filter(function (c) { return c.kind !== "approval"; }).map(function (c) {
          return h("tr", null, h("td", { "data-label": "Date", text: D.date(c.at) }), h("td", { "data-label": "What changed", text: c.what }), h("td", { "data-label": "Who", text: c.by || "" }), h("td", { "data-label": "Approved by", text: appr[c.version] || "" }));
        })))));
  }

  // Inputs that write straight into the working copy
  function tIn(obj, key, label, opts) {
    opts = opts || {};
    var el = opts.rows ? h("textarea", { rows: opts.rows, style: "width:100%", "aria-label": label, disabled: opts.ro }) : h("input", { style: "width:100%", "aria-label": label, disabled: opts.ro, placeholder: opts.ph || "" });
    el.value = obj[key] || "";
    el.addEventListener("input", function () { obj[key] = el.value; });
    return el;
  }
  function lIn(obj, key, label, ro, hint) {
    var el = h("textarea", { rows: Math.min(Math.max((obj[key] || []).length + 1, 2), 8), style: "width:100%", "aria-label": label, disabled: ro, placeholder: "One per line" });
    el.value = (obj[key] || []).join("\n");
    el.addEventListener("input", function () { obj[key] = lines(el.value); });
    return field(label, el, hint);
  }
  function sec(title, kids) { var x = h("div", { class: "doc-sec" }, h("p", { class: "doc-h" }, h("b", { text: title }))); (kids || []).forEach(function (k) { if (k) x.appendChild(k); }); return x; }

  function imagesOn(d) { return imgCfg().on && d.type !== "policy"; }
  function sectionImages(d, key, label, ro) {
    d.section_images = d.section_images || {};
    var list = d.section_images[key] || (d.section_images[key] = []);
    if (!imagesOn(d) && !list.length) return null;
    var slot = imageSlot(list, label, !ro && imagesOn(d), imagesChanged);
    var wrap = h("div", { class: "img-section" }, !ro && imagesOn(d) ? h("div", { class: "row" }, h("span", { class: "grow small muted", text: list.length ? "" : "Images for " + label }), addImageButton(slot, label)) : null, slot.el);
    if (!ro && imagesOn(d)) slot.wire(wrap);
    return wrap;
  }
  function docEditor(d, edit) {
    var ro = !edit;
    var box = h("div", { class: "card" });
    box.appendChild(field("Title", tIn(d, "title", "Title", { ro: ro })));
    if (d.type === "sop" || d.type === "policy") {
      box.appendChild(sec("Purpose", [tIn(d, "purpose", "Purpose", { rows: 2, ro: ro })]));
      box.appendChild(sec("Scope", [tIn(d, "scope", "Scope", { rows: 2, ro: ro })]));
      if (!ro) box.appendChild(helperButton("improve_section", "✦ Improve this section", function () { return { playbook_id: lib.pb.playbook.id, purpose: d.purpose || "", scope: d.scope || "" }; },
        { apply: function (f) { d[f.field] = f.suggestion; drawDocument(); }, canApply: function (f) { return f.field === "purpose" || f.field === "scope"; } }));
    }
    if (d.type === "sop") {
      box.appendChild(sec("Trigger", [tIn(d, "trigger", "Trigger", { ro: ro })]));
      box.appendChild(sec("Roles", [rolesLine(d, ro)]));
      box.appendChild(sec("Before you start", [lIn(d, "before_you_start", "Before you start", ro), sectionImages(d, "before_you_start", "Before you start", ro)]));
      box.appendChild(sec("Steps", [stepsEditor(d, ro)]));
      if (!ro) box.appendChild(helperButton("check_steps", "✦ Check these steps", function () { return { playbook_id: lib.pb.playbook.id, trigger: d.trigger || "", timing: d.timing || "", steps: (d.steps || []).map(function (x) { return { text: x.text, role: x.role, attorney_decides: !!x.attorney_decides }; }) }; },
        { rowWord: "Step", apply: function (f) { if (d.steps[f.row - 1]) { d.steps[f.row - 1].text = f.suggestion; drawDocument(); } }, canApply: function (f) { return f.field === "step" && !!f.row; } }));
      box.appendChild(sec("Decision points and escalation", [decisionsEditor(d, ro)]));
      box.appendChild(sec("Timing", [tIn(d, "timing", "Timing", { rows: 2, ro: ro }), ruleFields(d, "timing_rule", ro)]));
      box.appendChild(sec("Quality check", [lIn(d, "quality_check", "Quality check", ro), field("Reviewed by (role)", tIn(d, "quality_reviewer_role", "Reviewed by (role)", { ro: ro }))]));
      box.appendChild(sec("Done when", [tIn(d, "done_when", "Done when", { rows: 2, ro: ro }), field("Saved in", tIn(d, "saved_in", "Saved in", { ro: ro }))]));
      box.appendChild(sec("Related links", [linksEditor(d, ro)]));
    } else if (d.type === "workflow") {
      box.appendChild(sec("Name and process owner", [field("Process owner (one role)", tIn(d, "process_owner_role", "Process owner", { ro: ro })), rolesLine(d, ro)]));
      box.appendChild(sec("Start and end points", [field("Starts when", tIn(d, "start_point", "Starts when", { ro: ro })), field("Finished when", tIn(d, "end_point", "Finished when", { ro: ro }))]));
      var chart = sectionImages(d, "chart", "Swimlane chart", ro);
      if (chart) box.appendChild(sec("Swimlane chart", [h("p", { class: "small muted", text: "Attach the chart of lanes and stages you drew elsewhere (for example in Visio or Lucidchart)." }), chart]));
      box.appendChild(sec("Stages, handoffs, target times and linked SOPs", [stepsEditor(d, ro)]));
      box.appendChild(sec("Decision points", [decisionsEditor(d, ro)]));
    } else if (d.type === "playbook") {
      box.appendChild(sec("Situations covered", [lIn(d, "situations", "Situations covered", ro)]));
      box.appendChild(sec("Guiding principles", [lIn(d, "principles", "Guiding principles", ro)]));
      box.appendChild(sec("Preferred approach", [tIn(d, "preferred", "Preferred approach", { rows: 3, ro: ro })]));
      box.appendChild(sec("Acceptable fallbacks", [lIn(d, "fallbacks", "Acceptable fallbacks", ro, "Options staff can use without asking")]));
      box.appendChild(sec("Hard limits", [lIn(d, "hard_limits", "Hard limits", ro, "What nobody agrees to without attorney or partner approval")]));
      box.appendChild(sec("Escalation", [escalationEditor(d, ro)]));
      box.appendChild(sec("Scripts and templates", [lIn(d, "scripts", "Scripts and templates", ro), sectionImages(d, "scripts", "Scripts and templates", ro)]));
      box.appendChild(sec("Examples", [lIn(d, "examples", "Examples", ro, "Short fictional scenarios. No client information."), sectionImages(d, "examples", "Examples", ro)]));
    } else {
      box.appendChild(sec("The rules", [lIn(d, "rules_must", "What must happen", ro), lIn(d, "rules_must_not", "What must not happen", ro)]));
      box.appendChild(sec("Exceptions and who approves them", [tIn(d, "exceptions", "Exceptions", { rows: 2, ro: ro }), field("Approved by (role)", tIn(d, "exceptions_role", "Approved by (role)", { ro: ro }))]));
      box.appendChild(sec("Related links", [linksEditor(d, ro)]));
    }
    if (edit) box.appendChild(h("div", { class: "row", style: "margin-top:10px" }, h("button", { class: "blue small", type: "button", onclick: function () { docSave("", null); } }, "Save")));
    return box;
  }

  function rolesLine(d, ro) {
    var el = h("input", { style: "width:100%", "aria-label": "Roles", disabled: ro, value: (d.roles || []).join(", ") });
    el.addEventListener("change", function () { d.roles = commas(el.value); });
    return field("Roles (from your firm profile; roles, never names)", el);
  }
  function ruleFields(o, key, ro) {
    var r = o[key] || { name: "", link: "", verify_by: "" };
    var name = h("input", { "aria-label": "Rule or statute", disabled: ro, value: r.name || "", placeholder: "Rule or statute" });
    var link = h("input", { "aria-label": "Link to the rule", disabled: ro, value: r.link || "", placeholder: "https:// link to the rule" });
    var by = h("input", { type: "date", "aria-label": "Verify by", disabled: ro, value: r.verify_by || "" });
    function upd() { o[key] = (name.value || link.value || by.value) ? { name: name.value, link: link.value, verify_by: by.value } : null; }
    [name, link, by].forEach(function (x) { x.addEventListener("input", upd); });
    return h("div", { class: "row", style: "flex-wrap:wrap;margin-top:4px" }, h("span", { class: "small muted", text: "Court rule, statute or filing deadline:" }), name, link, field("Verify by", by));
  }

  function stepsEditor(d, ro) {
    var wf = d.type === "workflow";
    var box = h("div");
    var anyImg = (d.steps || []).some(function (x) { return (x.images || []).length; }) || Object.keys(d.section_images || {}).some(function (k) { return d.section_images[k].length; });
    (d.steps || []).forEach(function (st, i) {
      var c = h("div", { class: "card step-card", style: "padding:10px;margin:6px 0" + (st.attorney_decides ? ";border-color:var(--brand)" : "") });
      st.images = st.images || [];
      var slot = imagesOn(d) || st.images.length ? imageSlot(st.images, (wf ? "stage " : "step ") + (i + 1), !ro && imagesOn(d), imagesChanged) : null;
      c.appendChild(h("div", { class: "row" }, h("b", { class: "grow", text: (wf ? "Stage " : "Step ") + (i + 1) }),
        st.attorney_decides ? h("span", { class: "badge bad", text: "Attorney decides" }) : null,
        ro ? null : h("button", { class: "ghost small", type: "button", "aria-label": "Move step " + (i + 1) + " up", disabled: i === 0, onclick: function () { var x = d.steps.splice(i, 1)[0]; d.steps.splice(i - 1, 0, x); drawDocument(); } }, "↑"),
        ro ? null : h("button", { class: "ghost small", type: "button", "aria-label": "Remove step " + (i + 1), onclick: function () { d.steps.splice(i, 1); drawDocument(); } }, "Remove"),
        slot && !ro && imagesOn(d) ? addImageButton(slot, (wf ? "stage " : "step ") + (i + 1)) : null));
      if (wf) c.appendChild(field("Stage name", tIn(st, "stage", "Stage name " + (i + 1), { ro: ro })));
      c.appendChild(field("What to do (one action, starting with a verb)", tIn(st, "text", "Step " + (i + 1), { rows: 2, ro: ro })));
      if (slot) { c.appendChild(slot.el); if (!ro && imagesOn(d)) slot.wire(c); }
      if (i === 0 && !anyImg && !ro && imagesOn(d)) c.appendChild(h("p", { class: "small muted img-tip", text: "Tip: Take a screenshot, click a step, and paste it here." }));
      var role = h("select", { "aria-label": "Responsible role for step " + (i + 1), disabled: ro }, [h("option", { value: "", text: "Choose" })].concat((d.roles || []).map(function (r) { return h("option", { value: r, text: r, selected: st.role === r }); })));
      role.addEventListener("change", function () { st.role = role.value; });
      c.appendChild(h("div", { class: "row", style: "flex-wrap:wrap" }, field(wf ? "Lane (role)" : "Role", role), field("System", tIn(st, "system", "System for step " + (i + 1), { ro: ro })), field("Menu path and buttons", tIn(st, "menu_path", "Menu path for step " + (i + 1), { ro: ro, ph: "[Add the menu path in your system]" }))));
      if (wf) c.appendChild(h("div", { class: "row", style: "flex-wrap:wrap" }, field("Handoff (what passes, where, how the next person is told)", tIn(st, "handoff", "Handoff " + (i + 1), { ro: ro })), field("Target time", tIn(st, "target_time", "Target time " + (i + 1), { ro: ro })), field("Linked SOP", tIn(st, "linked_sop", "Linked SOP " + (i + 1), { ro: ro, ph: "For example INT-01" }))));
      var ad = h("input", { type: "checkbox", checked: !!st.attorney_decides, disabled: ro, "aria-label": "Attorney decides, step " + (i + 1) });
      ad.addEventListener("change", function () { st.attorney_decides = ad.checked; if (ad.checked) st.not_judgment = false; drawDocument(); });
      var nj = h("input", { type: "checkbox", checked: !!st.not_judgment, disabled: ro, "aria-label": "Not a judgment step, step " + (i + 1) });
      nj.addEventListener("change", function () { st.not_judgment = nj.checked; });
      c.appendChild(h("div", { class: "row", style: "flex-wrap:wrap" }, h("label", { style: "display:flex;gap:6px;font-weight:400" }, ad, h("span", { text: "Attorney decides (the A must be an attorney role)" })),
        st.attorney_decides ? null : h("label", { style: "display:flex;gap:6px;font-weight:400" }, nj, h("span", { text: "Not a judgment step" }))));
      c.appendChild(ruleFields(st, "rule", ro));
      box.appendChild(c);
    });
    if (!ro) box.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { d.steps.push({ text: "", role: "", raci: {}, attorney_decides: false }); drawDocument(); } }, wf ? "Add a stage" : "Add a step"));
    return box;
  }
  function decisionsEditor(d, ro) {
    var box = h("div");
    (d.decisions || []).forEach(function (x, i) {
      var ad = h("input", { type: "checkbox", checked: !!x.attorney_decides, disabled: ro, "aria-label": "Attorney decides, decision " + (i + 1) });
      ad.addEventListener("change", function () { x.attorney_decides = ad.checked; });
      box.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;margin:4px 0" }, field("If", tIn(x, "if", "If, decision " + (i + 1), { ro: ro })), field("Then", tIn(x, "then", "Then, decision " + (i + 1), { ro: ro })),
        field("Escalate to (role)", tIn(x, "escalate_to", "Escalate to, decision " + (i + 1), { ro: ro })), h("label", { style: "display:flex;gap:6px;font-weight:400" }, ad, h("span", { text: "Attorney decides" })),
        ro ? null : h("button", { class: "ghost small", type: "button", onclick: function () { d.decisions.splice(i, 1); drawDocument(); } }, "Remove")));
    });
    if (!ro) box.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { d.decisions.push({ if: "", then: "", attorney_decides: false, escalate_to: "" }); drawDocument(); } }, "Add a decision point"));
    return box;
  }
  function linksEditor(d, ro) {
    var box = h("div");
    (d.related_links || []).forEach(function (l, i) {
      box.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;margin:4px 0" }, tIn(l, "label", "Link " + (i + 1), { ro: ro, ph: "Template, form, policy or SOP" }), tIn(l, "url", "Link address " + (i + 1), { ro: ro, ph: "https:// or a document ID such as INT-01" }),
        ro ? null : h("button", { class: "ghost small", type: "button", onclick: function () { d.related_links.splice(i, 1); drawDocument(); } }, "Remove")));
    });
    if (!ro) box.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { d.related_links.push({ label: "", url: "" }); drawDocument(); } }, "Add a link"));
    return box;
  }
  function escalationEditor(d, ro) {
    var box = h("div");
    (d.escalation || []).forEach(function (x, i) {
      box.appendChild(h("div", { class: "row", style: "flex-wrap:wrap;margin:4px 0" }, field("Issue", tIn(x, "issue", "Issue " + (i + 1), { ro: ro })), field("Who decides (role)", tIn(x, "decider_role", "Who decides " + (i + 1), { ro: ro })),
        field("How fast", tIn(x, "how_fast", "How fast " + (i + 1), { ro: ro })), ro ? null : h("button", { class: "ghost small", type: "button", onclick: function () { d.escalation.splice(i, 1); drawDocument(); } }, "Remove")));
    });
    if (!ro) box.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { d.escalation.push({ issue: "", decider_role: "", how_fast: "" }); drawDocument(); } }, "Add an escalation"));
    return box;
  }

  // The RACI grid: click a cell to set R, A, C or I (exactly one A per step)
  var RACI_OPTS = ["", "R", "A", "R,A", "C", "I"];
  function raciGrid(d, edit) {
    var roles = d.roles || [];
    var t = h("table", { class: "stack raci", style: "width:100%" }, h("thead", null, h("tr", null, [h("th", { text: d.type === "workflow" ? "Stage" : "Step" })].concat(roles.map(function (r) { return h("th", { text: r }); })))),
      h("tbody", null, (d.steps || []).map(function (st, i) {
        st.raci = st.raci || {};
        var aCount = Object.keys(st.raci).filter(function (k) { return String(st.raci[k]).indexOf("A") >= 0; }).length;
        return h("tr", { class: aCount === 1 ? "" : "raci-bad" }, [h("td", { "data-label": d.type === "workflow" ? "Stage" : "Step", text: (i + 1) + ". " + String(st.stage || st.text || "").slice(0, 60) + (aCount === 1 ? "" : " (needs exactly one A)") })].concat(roles.map(function (r) {
          var cur = st.raci[r] || "";
          var b = h("button", { class: "raci-cell", type: "button", disabled: !edit, "aria-label": "Step " + (i + 1) + ", " + r + ": " + (cur || "empty") }, cur.replace(",", "+") || "·");
          b.addEventListener("click", function () {
            var next = RACI_OPTS[(RACI_OPTS.indexOf(cur) + 1) % RACI_OPTS.length];
            if (next) st.raci[r] = next; else delete st.raci[r];
            drawDocument();
          });
          return h("td", { "data-label": r }, b);
        })));
      })));
    return h("div", { class: "card" }, h("h2", { text: "RACI" }), h("p", { class: "small muted", text: "R does the work, A owns the outcome and signs off (exactly one per step), C gives input before, I is told after. Keep C's to 2 or fewer. Click a cell to change it, then Save." }),
      h("div", { class: "scroll" }, t));
  }

  function kpiCards(d, edit) {
    var box = h("div", { class: "card" }, h("h2", { text: "KPIs (3 to 5)" }), h("p", { class: "small muted", text: "Each KPI needs a data source in a system you use: the exact report or field. No baseline yet? Write \"measure for 30 days first\"." }));
    (d.kpis || []).forEach(function (k, i) {
      var kind = h("select", { "aria-label": "Leading or lagging, KPI " + (i + 1), disabled: !edit }, [["", "Choose"], ["leading", "Leading"], ["lagging", "Lagging"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: k.kind === o[0] }); }));
      kind.addEventListener("change", function () { k.kind = kind.value; });
      box.appendChild(h("div", { class: "card", style: "padding:10px;margin:6px 0" }, field("KPI", tIn(k, "name", "KPI name " + (i + 1), { ro: !edit })), field("What it measures", tIn(k, "measures", "Measures " + (i + 1), { ro: !edit })),
        h("div", { class: "row", style: "flex-wrap:wrap" }, field("Leading or lagging", kind), field("Data source (report or field)", tIn(k, "source", "Source " + (i + 1), { ro: !edit })), field("Owner (role)", tIn(k, "owner_role", "KPI owner " + (i + 1), { ro: !edit }))),
        h("div", { class: "row", style: "flex-wrap:wrap" }, field("Baseline", tIn(k, "baseline", "Baseline " + (i + 1), { ro: !edit })), field("Target", tIn(k, "target", "Target " + (i + 1), { ro: !edit })), field("Review rhythm", tIn(k, "rhythm", "Rhythm " + (i + 1), { ro: !edit, ph: "weekly, monthly or quarterly" }))),
        edit ? h("button", { class: "ghost small", type: "button", onclick: function () { d.kpis.splice(i, 1); drawDocument(); } }, "Remove") : null));
    });
    if (edit && (d.kpis || []).length < 5) box.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { d.kpis.push({ name: "", measures: "", kind: "", source: "", owner_role: "", baseline: "", target: "", rhythm: "" }); drawDocument(); } }, "Add a KPI"));
    return box;
  }

  function docSuggestionsView(area) {
    var list = lib.pb.suggestions;
    if (!list.length) { area.appendChild(h("div", { class: "card" }, h("p", { class: "muted", style: "margin:0", text: "No suggestions waiting." }))); return; }
    list.forEach(function (sg) {
      area.appendChild(h("div", { class: "card" }, h("b", { text: sg.note || "A suggested change" }), h("div", { class: "small muted", text: sg.by + ", " + D.dateTime(sg.at) + (sg.removes_review ? ". It removes an attorney decision, so only the administrator can accept it." : "") }),
        can(3) ? h("div", { class: "row", style: "margin-top:6px" }, h("button", { class: "blue small", type: "button", onclick: function () { decideSuggestion(sg.id, true); } }, "Accept"), h("button", { class: "ghost small", type: "button", onclick: function () { decideSuggestion(sg.id, false); } }, "Reject")) : null));
    });
  }
  function decideSuggestion(id, accept) {
    api.post("/playbooks/decide", { suggestion_id: id, accept: accept }).then(okOr).then(function () { lib.doc = null; openPlaybook(lib.pb.playbook.id); D.toast(app, accept ? "Accepted" : "Rejected"); }).catch(pbFail);
  }

  // What a freelancer sees of a document on a gig (only their part), and reference documents
  function docGigView(b, gig) {
    var box = h("div");
    if (b.purpose) box.appendChild(h("p", null, h("b", { text: "Purpose: " }), b.purpose));
    if ((b.before_you_start || []).length) box.appendChild(h("div", null, h("p", { class: "doc-h" }, h("b", { text: "Before you start" })), h("ul", null, b.before_you_start.map(function (x) { return h("li", { text: x }); }))));
    var bi = imagesRead(b.before_images || (b.section_images || {}).before_you_start, gig); if (bi) box.appendChild(bi);
    box.appendChild(h("p", { class: "doc-h" }, h("b", { text: "Steps" })));
    box.appendChild(h("ol", null, (b.steps || []).map(function (st) {
      return h("li", null, (st.stage ? st.stage + ": " : "") + st.text, st.menu_path && st.menu_path.indexOf("[Add the menu path") < 0 ? h("div", { class: "small muted", text: "Where: " + st.menu_path }) : null,
        st.attorney_decides ? h("div", { class: "small", style: "color:var(--brand);font-weight:700", text: "Attorney decides: ask the attorney inside the engagement before you go on." }) : null, imagesRead(st.images, gig));
    })));
    if (b.timing) box.appendChild(h("p", null, h("b", { text: "Timing: " }), b.timing));
    if ((b.quality_check || []).length) box.appendChild(h("div", null, h("p", { class: "doc-h" }, h("b", { text: "Quality check" })), h("ul", null, b.quality_check.map(function (x) { return h("li", { text: x }); }))));
    if (b.done_when) box.appendChild(h("p", null, h("b", { text: "Done when: " }), b.done_when));
    return box;
  }
  function referencesBlock(refs) {
    if (!(refs || []).length) return null;
    return h("div", { class: "card" }, h("h2", { text: "Reference documents (read only)" }), refs.map(function (r) {
      var b = r.body || {};
      return h("details", null, h("summary", { text: (r.doc_id ? r.doc_id + " " : "") + r.title + " (" + (DOC_TYPE_WORDS[r.doc_type] || "") + ")" }),
        b.type === "playbook" ? h("div", null, h("p", { class: "small", text: "Preferred approach: " + (b.preferred || "") }), (b.hard_limits || []).length ? h("p", { class: "small", text: "Hard limits: " + b.hard_limits.join("; ") }) : null)
          : h("div", null, (b.rules_must || []).map(function (x) { return h("p", { class: "small", text: "Must: " + x }); }), (b.rules_must_not || []).map(function (x) { return h("p", { class: "small", text: "Must not: " + x }); })));
    }));
  }
  function referencesEditor(host, g, refs) {
    var c = h("div", { class: "card" }, h("h2", { text: "Reference documents" }), h("p", { class: "small muted", text: "Attach approved Policies and Playbooks the freelancer should follow. They read them; they cannot change them." }));
    (refs || []).forEach(function (r) {
      c.appendChild(h("div", { class: "row" }, h("span", { class: "grow", text: (r.doc_id ? r.doc_id + " " : "") + r.title }), h("button", { class: "ghost small", type: "button", onclick: function () {
        api.post("/gigs/reference", { gig_id: g.id, doc: r.id, on: false }).then(okOr).then(function () { draw(); }).catch(pbFail);
      } }, "Remove")));
    });
    var sel = h("select", { "aria-label": "Reference document to attach" }, h("option", { value: "", text: "Loading..." }));
    api.get("/library").then(function (x) {
      D.clear(sel);
      var docs = ((x.list || {}).playbooks || []).filter(function (p) { return p.status === "approved" && (p.doc_type === "policy" || p.doc_type === "playbook") && !(refs || []).some(function (r) { return r.id === p.id; }); });
      sel.appendChild(h("option", { value: "", text: docs.length ? "Choose an approved Policy or Playbook" : "No approved Policies or Playbooks yet" }));
      docs.forEach(function (p) { sel.appendChild(h("option", { value: p.id, text: (p.doc_id ? p.doc_id + " " : "") + p.title })); });
    }).catch(function () {});
    c.appendChild(h("div", { class: "row" }, sel, h("button", { class: "ghost small", type: "button", onclick: function () {
      if (!sel.value) return;
      api.post("/gigs/reference", { gig_id: g.id, doc: sel.value }).then(function (r) { if (!r.ok) { D.toast(app, DOC_ERR[r.reason] || failText(r), true); return; } draw(); D.toast(app, "Attached"); }).catch(pbFail);
    } }, "Attach")));
    host.appendChild(c);
  }

  // Attorney checkpoints inside an engagement
  function checkpointsCard(r) {
    var cps = r.checkpoints || [];
    if (!cps.length) return null;
    var att = r.role === "attorney";
    // A finished engagement takes no more decisions: show what happened, with no buttons (pilot live check 2026-11-11)
    var closed = ["completed", "canceled"].indexOf((r.agreement || {}).status) >= 0;
    var c = h("div", { class: "card" }, h("h2", { text: "Attorney decisions" }), h("p", { class: "small muted", text: closed ? "These steps were for the attorney to decide. The engagement is closed, so nothing more is needed here." : "These steps need the attorney's decision. The work waits at each one until the attorney approves it here." }));
    cps.forEach(function (cp) {
      var note = h("input", { style: "width:100%", "aria-label": "Note for step " + cp.step_no, placeholder: att ? "A note with your decision (optional)" : "Anything the attorney should know (optional)" });
      var st = cp.status === "approved" ? "Approved" + (cp.approved_by ? " by " + cp.approved_by : "") + (cp.approval_note ? ": " + cp.approval_note : "") : cp.status === "requested" ? "Waiting for the attorney" + (cp.requested_note ? ": " + cp.requested_note : "") : closed ? "Not used: the engagement closed without it" : "Not reached yet";
      var row = h("div", { style: "margin:6px 0" }, h("div", { class: "row" }, h("b", { class: "grow", text: "Step " + cp.step_no + ": " + cp.text }), h("span", { class: "badge " + (cp.status === "approved" ? "ready" : cp.status === "requested" ? "held" : ""), text: st })));
      if (!closed && !att && cp.status === "pending") row.appendChild(h("div", { class: "row" }, note, h("button", { class: "blue small", type: "button", onclick: function () {
        api.post("/engagements/checkpoint", { agreement_id: r.agreement.id, step_no: cp.step_no, note: note.value }).then(engOk).then(function () { engReload("The attorney was asked to decide."); }).catch(engFail);
      } }, "Ask the attorney to decide")));
      if (!closed && att && cp.status !== "approved") row.appendChild(h("div", { class: "row" }, note, h("button", { class: "blue small", type: "button", onclick: function () {
        api.post("/engagements/checkpoint", { agreement_id: r.agreement.id, step_no: cp.step_no, note: note.value }).then(engOk).then(function () { engReload("Approved. The freelancer can go on."); }).catch(engFail);
      } }, "Approve this step")));
      c.appendChild(row);
    });
    return c;
  }


  // ---------- Images in documents (docs/briefs/step-2e-document-images.md) ----------
  // Paste, drag or choose a screenshot; the review window reads its text in this browser (Tesseract), marks what looks like
  // client information, and burns the blur, boxes and arrows into the image before anything is uploaded.
  var OCR_SRC = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
  var OCR_OPTS = { workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js", corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1", langPath: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int" };
  var IMG = { urls: {}, ocr: null };
  Object.assign(DOC_ERR, {
    images_off: "Images are not open for your account yet.", policy_text_only: "Policies stay text only, so they have no images.", image_type: "Use a PNG or JPG image.",
    caption_needed: "Add a caption: what should the reader look at?", confirm_needed: "Tick the box to confirm the image has no client information, passwords or account numbers.",
    image_refused: "That file is not a real PNG or JPG image, so DELA did not keep it.", images_review_needed: "This document is due for review. In \"Check images\", mark every image \"Still current\" or replace it, then approve.",
    image_closed: "Images are hidden now that this engagement has ended.", fix_in_image_window: "Open the image to fix it.", storage_full: "Your firm's storage is full. Remove files you no longer need, or upgrade your plan.",
  });
  function imgCfg() { return (lib.pb && lib.pb.image_settings) || { on: false, max_mb: 5, per_step: 3, caption_max: 120, max_width_px: 2400 }; }
  function imgErrText(r) { return r && r.reason === "image_too_big" ? "This image is over " + imgCfg().max_mb + " MB. Try a smaller screenshot." : r && r.reason === "caption_too_long" ? "Keep the caption to " + imgCfg().caption_max + " characters." : DOC_ERR[r && r.reason] || failText(r || {}); }
  // A short-lived link to one image (cached for a few minutes); a freelancer opens it through the gig
  function imgUrl(id, gig) {
    var k = id + (gig || ""), c = IMG.urls[k];
    if (c && Date.now() - c.at < 180000) return Promise.resolve(c);
    return api.get("/documents/image?id=" + id + (gig ? "&gig=" + gig : "")).then(function (r) { var v = r.ok ? { url: r.url, at: Date.now() } : { error: r.reason, at: Date.now() }; IMG.urls[k] = v; return v; });
  }
  function fillImg(img, id, gig, onFail) {
    imgUrl(id, gig).then(function (v) { if (v.url) img.src = v.url; else if (onFail) onFail(v.error); }).catch(function () { if (onFail) onFail("not_found"); });
  }

  // Full screen: click to open, X or Esc to close, pinch to zoom on a phone
  function imgFull(src, caption) {
    var box = h("div", { class: "img-full", role: "dialog", "aria-label": "Image, full screen" });
    function close() { box.remove(); document.removeEventListener("keydown", key, true); }
    function key(e) { if (e.key === "Escape") { e.preventDefault(); close(); } }
    box.appendChild(h("button", { class: "img-x", "aria-label": "Close the image", onclick: close }, "✕"));
    box.appendChild(h("img", { src: src, alt: caption || "", draggable: "false", oncontextmenu: function (e) { e.preventDefault(); } }));
    if (caption) box.appendChild(h("p", { class: "img-cap", text: caption }));
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", key, true);
    app.appendChild(box);
    box.querySelector(".img-x").focus();
  }

  // Read-only images (reading a document, a freelancer's gig): full width, caption below, no download button
  function imagesRead(list, gig) {
    if (!(list || []).length) return null;
    var wrap = h("div", { class: "img-list" });
    list.forEach(function (im) {
      var img = h("img", { alt: im.caption || "Screenshot", draggable: "false", loading: "lazy", oncontextmenu: function (e) { e.preventDefault(); } });
      var fig = h("figure", { class: "img-fig" }, img, h("figcaption", { text: im.caption || "" }));
      img.addEventListener("click", function () { if (img.src) imgFull(img.src, im.caption); });
      fillImg(img, im.id, gig, function (why) { D.clear(fig); fig.appendChild(h("p", { class: "small muted", text: why === "image_closed" ? DOC_ERR.image_closed : "This image is not available." })); });
      wrap.appendChild(fig);
    });
    return wrap;
  }

  // An image slot on a step or section: the images, Edit, Replace and Remove, drag to reorder, paste, drop, errors and progress
  function imageSlot(list, where, edit, onChange) {
    var cfg = imgCfg();
    var slot = h("div", { class: "img-slot" });
    var err = h("p", { class: "small bad", role: "alert", style: "margin:4px 0" });
    var bar = h("div", { class: "bar img-bar", hidden: true }, h("span", { style: "width:0%" }));
    var figs = h("div", { class: "img-list" });
    var picker = h("input", { type: "file", accept: "image/png,image/jpeg", hidden: true, "aria-label": "Choose an image for " + where });
    var replaceAt = -1;
    picker.addEventListener("change", function () { var f = picker.files && picker.files[0]; picker.value = ""; if (f) take(f, replaceAt); replaceAt = -1; });
    function fail(t) { err.textContent = t; }
    function take(file, at) {
      err.textContent = "";
      var okType = file.type === "image/png" || file.type === "image/jpeg" || (!file.type && /\.(png|jpe?g)$/i.test(file.name || ""));
      if (!okType) { fail("Use a PNG or JPG image."); return; }
      if (file.size > cfg.max_mb * 1048576) { fail("This image is over " + cfg.max_mb + " MB. Try a smaller screenshot."); return; }
      if (at < 0 && list.length >= cfg.per_step) { fail("Each step can have " + cfg.per_step + " images. Split this step to add more."); return; }
      reviewImage({ file: file, caption: at >= 0 ? list[at].caption : "", progress: bar, onSaved: function (id, caption, f) {
        if (at >= 0) list[at] = { id: id, caption: caption }; else list.push({ id: id, caption: caption });
        showNow(id, f);
        onChange(at >= 0 ? "Replaced an image" : "Added an image");
      } });
    }
    // Show the new caption and check state at once, while the document saves
    function showNow(id, f) {
      if (lib.pb && f) { lib.pb.images = lib.pb.images || {}; var cur = lib.pb.images[id] || {}; lib.pb.images[id] = Object.assign({}, cur, f, { source: cur.source || "upload" }); }
      draw();
    }
    function draw() {
      D.clear(figs);
      list.forEach(function (im, i) {
        var img = h("img", { alt: im.caption || "Screenshot", draggable: "false" });
        var fact = (lib.pb && lib.pb.images || {})[im.id] || {};
        var tools = edit ? h("div", { class: "img-tools" },
          h("button", { class: "small", type: "button", onclick: function (e) { e.stopPropagation(); reviewImage({ existing: im, img: img, progress: bar, onSaved: function (id, caption, f) { list[i] = { id: id, caption: caption }; showNow(id, f); onChange("Edited an image"); } }); } }, "Edit"),
          h("button", { class: "small", type: "button", onclick: function (e) { e.stopPropagation(); replaceAt = i; picker.click(); } }, "Replace"),
          h("button", { class: "small danger", type: "button", onclick: function (e) { e.stopPropagation(); askRemove(function () { list.splice(i, 1); onChange("Removed an image"); }); } }, "Remove")) : null;
        var fig = h("figure", { class: "img-fig" + (edit ? " editable" : ""), draggable: edit && list.length > 1 ? "true" : "false", tabindex: edit ? "0" : null, "data-i": String(i) },
          tools, img, h("figcaption", { text: im.caption || (edit ? "No caption yet" : "") }),
          fact.held ? h("p", { class: "small bad", text: "DELA's check thinks this image may show client information. Click Edit to blur it or confirm it shows none." }) : !fact.confirmed && fact.source ? h("p", { class: "small bad", text: "No client-data check yet. Click Edit to confirm it." }) : fact.source === "import" ? h("p", { class: "small muted", text: "Confirmed at import" }) : null);
        img.addEventListener("click", function () { if (img.src) imgFull(img.src, im.caption); });
        fig.addEventListener("click", function () { fig.classList.toggle("show-tools"); });
        fig.addEventListener("dragstart", function (e) { e.dataTransfer.setData("text/x-dela-img", String(i)); e.dataTransfer.effectAllowed = "move"; });
        fig.addEventListener("dragover", function (e) { if ([].slice.call(e.dataTransfer.types || []).indexOf("text/x-dela-img") >= 0) e.preventDefault(); });
        fig.addEventListener("drop", function (e) {
          var from = e.dataTransfer.getData("text/x-dela-img");
          if (from === "") return;
          e.preventDefault(); e.stopPropagation();
          var f = Number(from);
          if (f === i) return;
          var x = list.splice(f, 1)[0]; list.splice(i, 0, x); onChange("Reordered images");
        });
        fillImg(img, im.id, null, function () { img.alt = "This image is not available."; });
        figs.appendChild(fig);
      });
    }
    draw();
    slot.appendChild(figs); slot.appendChild(bar); slot.appendChild(err); slot.appendChild(picker);
    return {
      el: slot,
      pick: function () { if (list.length >= cfg.per_step) { fail("Each step can have " + cfg.per_step + " images. Split this step to add more."); return; } replaceAt = -1; picker.click(); },
      take: function (f) { take(f, -1); },
      // Paste and drop on the whole step or section
      wire: function (host) {
        host.addEventListener("paste", function (e) {
          var items = e.clipboardData ? [].slice.call(e.clipboardData.items || []) : [];
          var it = items.filter(function (x) { return x.kind === "file"; })[0];
          if (!it) return;
          e.preventDefault();
          take(it.getAsFile(), -1);
        });
        host.addEventListener("dragover", function (e) { if ([].slice.call(e.dataTransfer.types || []).indexOf("Files") >= 0) { e.preventDefault(); host.classList.add("img-drop"); } });
        host.addEventListener("dragleave", function () { host.classList.remove("img-drop"); });
        host.addEventListener("drop", function (e) {
          host.classList.remove("img-drop");
          var f = e.dataTransfer.files && e.dataTransfer.files[0];
          if (!f) return;
          e.preventDefault();
          take(f, -1);
        });
      },
    };
  }
  function addImageButton(slot, where) { return h("button", { class: "ghost small img-add", type: "button", "aria-label": "Add image to " + where, onclick: function () { slot.pick(); } }, "🖼 Add image"); }

  function askRemove(yes) {
    var m = modal("Remove this image?");
    m.body.appendChild(h("p", { text: "It stays in older versions of this document." }));
    m.foot.appendChild(h("button", { class: "ghost", type: "button", onclick: m.close }, "Cancel"));
    m.foot.appendChild(h("button", { class: "danger", type: "button", onclick: function () { m.close(); yes(); } }, "Remove"));
  }

  // A centered pop-up window with a dimmed backdrop
  function modal(title) {
    var sc = h("div", { class: "dela-scrim" });
    var body = h("div", { class: "modal-body" }), foot = h("div", { class: "row modal-foot" });
    var box = h("div", { class: "dela-modal", role: "dialog", "aria-modal": "true", "aria-label": title }, h("div", { class: "row" }, h("h2", { class: "grow", style: "margin:0", text: title })), body, foot);
    function close() { sc.remove(); box.remove(); document.removeEventListener("keydown", key, true); }
    function key(e) { if (e.key === "Escape") { e.preventDefault(); close(); } }
    document.addEventListener("keydown", key, true);
    app.appendChild(sc); app.appendChild(box);
    return { box: box, body: body, foot: foot, close: close };
  }

  // What looks like client information in the text the browser read (patterns in code; names are two capitalized words
  // that are not common screen words)
  var SCREEN_WORDS = ("New Save Cancel Open Close File Edit View Help Home Search Settings Contacts Matters Matter Calendar Tasks Documents Billing Reports Dashboard Activity Activities " +
    "Bills Bill Time Entry Entries Client Clients Name Email Phone Address Notes Note Status Date Due Today Add Delete Remove Upload Download Print Share Export Import Next Back Submit " +
    "Practice Area Areas Firm Account Accounts User Users Admin Tools Window Insert Format Table Page Layout Review References Mailings Microsoft Word Outlook Google Chrome Clio MyCase PracticePanther " +
    "Smokeball LawPay QuickBooks Filevine Dropbox Drive OneDrive Court Courts Case Cases Number Type Select All None More Options Filter Sort Total Amount Balance Trust Operating Invoice Invoices Payment Payments " +
    "January February March April May June July August September October November December Monday Tuesday Wednesday Thursday Friday Saturday Sunday The And For With From Your Our This").split(" ");
  function ocrFlags(words) {
    var out = [];
    var clean = function (t) { return String(t || "").replace(/^[^\w@+(]+|[^\w)]+$/g, ""); };
    var isCap = function (t) { return /^[A-Z][a-z'’-]{1,}$/.test(t) && SCREEN_WORDS.indexOf(t) < 0; };
    var box = function (ws) { return { x0: Math.min.apply(null, ws.map(function (w) { return w.bbox.x0; })), y0: Math.min.apply(null, ws.map(function (w) { return w.bbox.y0; })), x1: Math.max.apply(null, ws.map(function (w) { return w.bbox.x1; })), y1: Math.max.apply(null, ws.map(function (w) { return w.bbox.y1; })) }; };
    var used = {};
    words.forEach(function (w, i) {
      var t = clean(w.text);
      var kind = /[\w.+-]+@[\w-]+\.[\w.]+/.test(t) ? "email" : /^\d{3}-\d{2}-\d{4}$/.test(t) ? "Social Security number" : /^\(?\d{3}\)?[-.\s]?\d{3}[-.]\d{4}$/.test(t) ? "phone number"
        : /^\d{1,2}:\d{2}-[a-z]{2,4}-\d{3,6}$/i.test(t) || /^\d{2,4}-[A-Z]{1,4}-\d{2,6}$/i.test(t) ? "case number" : /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t) ? "date" : /^[\d-]{8,}$/.test(t) && t.replace(/-/g, "").length >= 8 ? "account number" : "";
      if (kind) { out.push({ kind: kind, text: t, bbox: w.bbox }); used[i] = true; }
    });
    // A phone number read as two words: (555) 123-4567
    words.forEach(function (w, i) { var a = clean(w.text), b = words[i + 1] && clean(words[i + 1].text); if (!used[i] && b && /^\(\d{3}\)$/.test(a) && /^\d{3}-\d{4}$/.test(b)) { out.push({ kind: "phone number", text: a + " " + b, bbox: box([w, words[i + 1]]) }); used[i] = used[i + 1] = true; } });
    for (var i = 0; i < words.length - 1; i++) {
      var a = clean(words[i].text), b = clean(words[i + 1].text);
      if (used[i] || used[i + 1] || !isCap(a) || !isCap(b)) continue;
      if (Math.abs(words[i].bbox.y0 - words[i + 1].bbox.y0) > (words[i].bbox.y1 - words[i].bbox.y0)) continue;
      out.push({ kind: "name", text: a + " " + b, bbox: box([words[i], words[i + 1]]) }); used[i] = used[i + 1] = true; i++;
    }
    return out;
  }
  function loadOcr() {
    if (window.DELA_OCR) return Promise.resolve(window.DELA_OCR);
    if (IMG.ocr) return IMG.ocr;
    IMG.ocr = new Promise(function (ok, no) {
      if (window.Tesseract) { ok(window.Tesseract); return; }
      var sc = document.createElement("script");
      sc.src = OCR_SRC; sc.async = true;
      sc.onload = function () { window.Tesseract ? ok(window.Tesseract) : no(new Error("ocr_missing")); };
      sc.onerror = function () { IMG.ocr = null; no(new Error("ocr_missing")); };
      document.head.appendChild(sc);
    });
    return IMG.ocr;
  }

  // The review window: preview, Box, Arrow, Blur, Undo, flagged text in yellow, the caption and the checkbox.
  // o: { file } for a new image, or { existing: {id, caption}, img } to edit one; progress (a bar on the step); onSaved(id, caption)
  function reviewImage(o) {
    var cfg = imgCfg();
    var fact = o.existing ? ((lib.pb && lib.pb.images) || {})[o.existing.id] || {} : {};
    var m = modal("Review image");
    m.box.classList.add("img-review");
    var stage = h("div", { class: "img-stage" });
    var c = h("canvas", { class: "img-canvas", "aria-label": "The image. Drag on it to draw." });
    var over = h("canvas", { class: "img-over", "aria-hidden": "true" });
    stage.appendChild(c); stage.appendChild(over);
    var tool = "box", ops = [], flags = [], blurred = {}, base = null, jpeg = false;
    var toolsRow = h("div", { class: "row img-toolbar", role: "toolbar", "aria-label": "Drawing tools" });
    var toolBtns = {};
    [["box", "Box"], ["arrow", "Arrow"], ["blur", "Blur"]].forEach(function (t) {
      toolBtns[t[0]] = h("button", { class: "ghost small", type: "button", "aria-pressed": String(tool === t[0]), onclick: function () { tool = t[0]; Object.keys(toolBtns).forEach(function (k) { toolBtns[k].setAttribute("aria-pressed", String(k === tool)); }); } }, t[1]);
      toolsRow.appendChild(toolBtns[t[0]]);
    });
    toolsRow.appendChild(h("button", { class: "ghost small", type: "button", onclick: function () { var x = ops.pop(); if (x && x.flag !== undefined) delete blurred[x.flag]; paint(); } }, "Undo"));
    var flagBar = h("div", { class: "img-flagbar", hidden: true });
    var status = h("p", { class: "small muted", role: "status", style: "margin:4px 0" });
    var heldNote = fact.held ? h("p", { class: "notice bad", text: "DELA's check thinks this image may show client information. Blur it, or confirm below that it shows none." }) : null;
    var cap = h("input", { maxlength: String(cfg.caption_max), style: "width:100%", "aria-label": "Caption (what should the reader look at?)", value: o.existing ? o.existing.caption : o.caption || "" });
    var tick = h("input", { type: "checkbox", "aria-label": "This image contains no client information, passwords or account numbers." });
    var save = h("button", { class: "blue", type: "button", disabled: true }, "Save image");
    var saveWrap = h("span", { title: "Add a caption and confirm there is no client information." }, save);
    function ready() { var ok = cap.value.trim() && tick.checked; save.disabled = !ok; saveWrap.title = ok ? "" : "Add a caption and confirm there is no client information."; }
    cap.addEventListener("input", ready); tick.addEventListener("change", ready);
    m.body.appendChild(toolsRow); m.body.appendChild(flagBar); m.body.appendChild(status); if (heldNote) m.body.appendChild(heldNote); m.body.appendChild(h("div", { class: "img-center" }, stage));
    m.body.appendChild(field("Caption (what should the reader look at?)", cap, "Up to " + cfg.caption_max + " characters. It is also the text a screen reader reads."));
    m.body.appendChild(h("label", { style: "display:flex;gap:8px;align-items:flex-start;font-weight:600;margin-top:8px" }, tick, h("span", { text: "This image contains no client information, passwords or account numbers." })));
    m.foot.appendChild(h("span", { class: "grow" }));
    m.foot.appendChild(h("button", { class: "ghost grey", type: "button", onclick: m.close }, "Cancel"));
    m.foot.appendChild(saveWrap);

    function paint() {
      var g = c.getContext("2d");
      g.drawImage(base, 0, 0, c.width, c.height);
      ops.forEach(function (op) { drawOp(g, op); });
      var q = over.getContext("2d");
      q.clearRect(0, 0, over.width, over.height);
      q.lineWidth = Math.max(3, c.width / 300); q.strokeStyle = "#f5c518";
      flags.forEach(function (f, i) { if (!blurred[i]) q.strokeRect(f.bbox.x0 - 3, f.bbox.y0 - 3, f.bbox.x1 - f.bbox.x0 + 6, f.bbox.y1 - f.bbox.y0 + 6); });
      var left = flags.filter(function (f, i) { return !blurred[i]; }).length;
      flagBar.hidden = !flags.length;
      D.clear(flagBar);
      if (flags.length) flagBar.appendChild(left ? h("div", { class: "row" }, h("b", { class: "grow", text: "We found " + left + " item" + (left === 1 ? "" : "s") + " that may be client information." }),
        h("button", { class: "small", type: "button", onclick: function () { flags.forEach(function (f, i) { if (!blurred[i]) { blurred[i] = true; ops.push({ kind: "blur", x: f.bbox.x0 - 4, y: f.bbox.y0 - 4, w: f.bbox.x1 - f.bbox.x0 + 8, h: f.bbox.y1 - f.bbox.y0 + 8, flag: i }); } }); paint(); } }, "Blur all flagged"))
        : h("b", { text: "Every flagged item is blurred. Check the rest of the image yourself." }));
    }
    function drawOp(g, op) {
      var lw = Math.max(4, c.width / 250);
      if (op.kind === "blur") {
        var x = Math.max(0, op.x), y = Math.max(0, op.y), w = Math.min(c.width - x, op.w), hh = Math.min(c.height - y, op.h);
        if (w < 1 || hh < 1) return;
        var tiny = document.createElement("canvas"), k = 0.05;
        tiny.width = Math.max(1, Math.round(w * k)); tiny.height = Math.max(1, Math.round(hh * k));
        tiny.getContext("2d").drawImage(c, x, y, w, hh, 0, 0, tiny.width, tiny.height);
        g.imageSmoothingEnabled = false;
        g.drawImage(tiny, 0, 0, tiny.width, tiny.height, x, y, w, hh);
        g.imageSmoothingEnabled = true;
        g.fillStyle = "rgba(120,120,120,0.6)"; g.fillRect(x, y, w, hh);
      } else if (op.kind === "box") {
        g.lineWidth = lw; g.strokeStyle = "#c8102e"; g.strokeRect(op.x, op.y, op.w, op.h);
      } else {
        g.lineWidth = lw; g.strokeStyle = g.fillStyle = "#c8102e";
        var ang = Math.atan2(op.y2 - op.y1, op.x2 - op.x1), hl = lw * 4;
        g.beginPath(); g.moveTo(op.x1, op.y1); g.lineTo(op.x2 - Math.cos(ang) * hl * 0.6, op.y2 - Math.sin(ang) * hl * 0.6); g.stroke();
        g.beginPath(); g.moveTo(op.x2, op.y2); g.lineTo(op.x2 - hl * Math.cos(ang - 0.45), op.y2 - hl * Math.sin(ang - 0.45)); g.lineTo(op.x2 - hl * Math.cos(ang + 0.45), op.y2 - hl * Math.sin(ang + 0.45)); g.closePath(); g.fill();
      }
    }
    function pos(e) { var r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height }; }
    var start = null;
    c.addEventListener("pointerdown", function (e) { start = pos(e); c.setPointerCapture && c.setPointerCapture(e.pointerId); });
    c.addEventListener("pointerup", function (e) {
      if (!start) return;
      var end = pos(e), s0 = start; start = null;
      var w = Math.abs(end.x - s0.x), hh = Math.abs(end.y - s0.y);
      if (w < 6 && hh < 6) {
        // A click inside a yellow outline blurs just that item
        flags.forEach(function (f, i) { if (!blurred[i] && end.x >= f.bbox.x0 - 4 && end.x <= f.bbox.x1 + 4 && end.y >= f.bbox.y0 - 4 && end.y <= f.bbox.y1 + 4) { blurred[i] = true; ops.push({ kind: "blur", x: f.bbox.x0 - 4, y: f.bbox.y0 - 4, w: f.bbox.x1 - f.bbox.x0 + 8, h: f.bbox.y1 - f.bbox.y0 + 8, flag: i }); } });
        paint(); return;
      }
      if (tool === "arrow") ops.push({ kind: "arrow", x1: s0.x, y1: s0.y, x2: end.x, y2: end.y });
      else ops.push({ kind: tool, x: Math.min(s0.x, end.x), y: Math.min(s0.y, end.y), w: w, h: hh });
      paint();
    });

    function start2(src, revoke) {
      var pic = new Image();
      pic.crossOrigin = "anonymous";
      pic.onload = function () {
        var k = Math.min(1, cfg.max_width_px / pic.naturalWidth);
        c.width = over.width = Math.max(1, Math.round(pic.naturalWidth * k)); c.height = over.height = Math.max(1, Math.round(pic.naturalHeight * k));
        var b = document.createElement("canvas"); b.width = c.width; b.height = c.height; b.getContext("2d").drawImage(pic, 0, 0, b.width, b.height);
        base = b;
        if (revoke) URL.revokeObjectURL(src);
        paint();
        status.textContent = "Reading the image for names, emails, phone numbers, case numbers and account numbers...";
        loadOcr().then(function (T) { return T.recognize(base, "eng", OCR_OPTS); }).then(function (res) {
          var words = ((res && res.data && res.data.words) || []).filter(function (w) { return w && w.bbox && w.text; });
          flags = ocrFlags(words);
          status.textContent = flags.length ? "" : "DELA did not find anything that looks like client information. Check the image yourself before you save.";
          paint();
        }).catch(function () { status.textContent = "DELA could not read the text in this image. Check it yourself for client information before you save."; });
      };
      pic.onerror = function () { status.textContent = "This image could not be opened. Use a PNG or JPG image."; };
      pic.src = src;
    }
    if (o.file) { jpeg = o.file.type === "image/jpeg"; start2(URL.createObjectURL(o.file), true); }
    else if (o.img && o.img.src) start2(o.img.src, false);
    else imgUrl(o.existing.id).then(function (v) { if (v.url) start2(v.url, false); else status.textContent = "This image is not available."; });
    ready();

    save.addEventListener("click", function () {
      if (save.disabled || !base) return;
      var caption = cap.value.trim();
      save.disabled = true;
      // Nothing drawn on an image that is already saved: keep it, with the new caption, and confirm it if needed
      if (o.existing && !ops.length) {
        var done = function () { m.close(); o.onSaved(o.existing.id, caption, { confirmed: true, held: false }); };
        if (fact.confirmed) { done(); return; }
        api.post("/documents/images/confirm", { image_id: o.existing.id, confirmed: true }).then(function (r) { if (!r.ok) throw r; done(); }).catch(function (e) { ready(); D.toast(app, imgErrText(e), true); });
        return;
      }
      c.toBlob(function (blob) {
        if (!blob) { ready(); return; }
        if (blob.size > cfg.max_mb * 1048576) { ready(); D.toast(app, "This image is over " + cfg.max_mb + " MB. Try a smaller screenshot.", true); return; }
        m.close();
        D.toast(app, "Saving the image. It appears under the step in a few seconds.");
        uploadDocImage(blob, jpeg ? "Screenshot.jpg" : "Screenshot.png", caption, flags.length, Object.keys(blurred).length, o.progress).then(function (r) {
          if (r.held) D.toast(app, "Saved. DELA's check thinks this image may show client information, so the document is blocked until you blur it or confirm it shows none.", true);
          else D.toast(app, "Image saved");
          o.onSaved(r.id, caption, { confirmed: !r.held, held: !!r.held });
        }).catch(function (e) { D.toast(app, imgErrText(e), true); });
      }, jpeg ? "image/jpeg" : "image/png", 0.9);
    });
  }

  // Upload with a progress bar on the step, then the image record with its caption and checkbox
  function uploadDocImage(blob, name, caption, found, blurredN, bar) {
    var P = lib.pb.playbook;
    var setBar = function (pct) { if (!bar) return; bar.hidden = pct === null; if (pct !== null) bar.firstChild.style.width = pct + "%"; };
    setBar(5);
    return api.post("/documents/images/start", { playbook_id: P.id, name: name, size_bytes: blob.size, request_id: newId(), ticked: true }).then(function (r) {
      if (!r.ok) throw r;
      if (r.duplicate) return r;
      return new Promise(function (ok, no) {
        var x = new XMLHttpRequest();
        x.open("PUT", r.upload_url);
        x.setRequestHeader("content-type", r.content_type); x.setRequestHeader("x-upsert", "false");
        x.upload.onprogress = function (e) { if (e.lengthComputable) setBar(5 + Math.round(e.loaded * 80 / e.total)); };
        x.onload = function () { x.status < 300 ? ok(r) : no({ reason: "upload_failed" }); };
        x.onerror = function () { no({ reason: "upload_failed" }); };
        x.send(blob);
      });
    }).then(function (r) {
      setBar(90);
      return api.post("/documents/images/complete", { playbook_id: P.id, file_id: r.file_id, caption: caption, confirmed: true, flags_found: found, flags_blurred: blurredN });
    }).then(function (r) {
      setBar(null);
      if (!r.ok) throw r;
      if (lib.pb.images) lib.pb.images[r.id] = { confirmed: !!r.confirmed, held: !!r.held, source: "upload" };
      return r;
    }, function (e) { setBar(null); throw e; });
  }

  // Images join the document as soon as they are saved (a new version), so nothing is lost
  function imagesChanged(note) {
    docSave(note, null);
  }

  // The "Check images" step at a due review
  function checkImagesCard(d) {
    var due = lib.pb.images_due || {};
    if (!due.due) return null;
    var ids = due.ids || [];
    var all = placedImagesUi(d);
    var c = h("div", { class: "card" }, h("h2", { text: "Check images" }),
      h("p", { class: "small muted", text: ids.length ? "This document is due for review. Software screens change, so mark each image \"Still current\" or replace it. You can approve once every image is checked." : "Every image is checked." }));
    all.filter(function (p) { return ids.indexOf(p.id) >= 0; }).forEach(function (p) {
      var img = h("img", { class: "img-thumb", alt: p.caption || "Screenshot" });
      fillImg(img, p.id);
      c.appendChild(h("div", { class: "row", style: "margin:6px 0;flex-wrap:wrap" }, img, h("div", { class: "grow" }, h("b", { text: p.where }), h("div", { class: "small", text: p.caption || "No caption" })),
        h("button", { class: "blue small", type: "button", onclick: function () { api.post("/documents/images/current", { playbook_id: lib.pb.playbook.id, image_id: p.id }).then(okOr).then(function () { lib.doc = null; openPlaybook(lib.pb.playbook.id, "read"); }).catch(pbFail); } }, "Still current"),
        h("button", { class: "ghost small", type: "button", onclick: function () { var s = p.slot(); s.take ? pickFor(s) : null; } }, "Replace")));
    });
    return c;
  }
  function pickFor(slotApi) { var inp = h("input", { type: "file", accept: "image/png,image/jpeg" }); inp.addEventListener("change", function () { if (inp.files[0]) slotApi.replace(inp.files[0]); }); inp.click(); }
  // Every image in the working copy with where it sits, and a way to replace it in place
  function placedImagesUi(d) {
    var out = [], word = d.type === "workflow" ? "Stage " : "Step ";
    function add(list, where) {
      list.forEach(function (im, i) {
        out.push({ id: im.id, caption: im.caption, where: where, slot: function () { return { take: true, replace: function (file) { reviewImage({ file: file, caption: im.caption, onSaved: function (id, cap) { list[i] = { id: id, caption: cap }; imagesChanged("Replaced an image"); } }); } }; } });
      });
    }
    (d.steps || []).forEach(function (st, i) { add(st.images || (st.images = []), word + (i + 1)); });
    var labels = { before_you_start: "Before you start", chart: "Swimlane chart", scripts: "Scripts and templates", examples: "Examples" };
    Object.keys(d.section_images || {}).forEach(function (k) { add(d.section_images[k], labels[k] || k); });
    return out;
  }
  // "Fix it" on an image item opens the review window for the first image it names
  function fixImageItem(it, d) {
    var p = placedImagesUi(d).filter(function (x) { return (it.images || []).indexOf(x.id) >= 0; })[0];
    if (!p) return;
    var list = null, idx = -1;
    (d.steps || []).forEach(function (st) { st.images.forEach(function (im, i) { if (im.id === p.id && !list) { list = st.images; idx = i; } }); });
    Object.keys(d.section_images || {}).forEach(function (k) { d.section_images[k].forEach(function (im, i) { if (im.id === p.id && !list) { list = d.section_images[k]; idx = i; } }); });
    reviewImage({ existing: list[idx], onSaved: function (id, caption) { list[idx] = { id: id, caption: caption }; imagesChanged("Fixed an image"); } });
  }
  // Before a gig is created from a document with images
  function gigImageWarning(n, onContinue, onReview) {
    if (!n) { onContinue(); return; }
    var m = modal("Check the images");
    m.body.appendChild(h("p", { text: "The freelancer will see " + n + " image" + (n === 1 ? "" : "s") + " in this document. Check that none show client information." }));
    m.foot.appendChild(h("span", { class: "grow" }));
    m.foot.appendChild(h("button", { class: "ghost", type: "button", onclick: function () { m.close(); onReview(); } }, "Review images"));
    m.foot.appendChild(h("button", { class: "blue", type: "button", onclick: function () { m.close(); onContinue(); } }, "Continue"));
  }


  // How DELA looks (UX review Phase 4 part D): the person's choice; while the switch is off it follows the device
  function applyTheme() { if (me) D.setTheme(app, (me.appearance || {}).mode); }
  function appearanceItems() {
    var ap = (me && me.appearance) || {};
    if (!ap.on) return [];
    return [h("div", { class: "small muted", style: "padding:8px 12px 2px", text: "Appearance" })].concat([["device", "Match my device"], ["light", "Light"], ["dark", "Dark"]].map(function (o) {
      return h("button", { role: "menuitemradio", "aria-checked": String(ap.mode === o[0]), onclick: function () {
        api.post("/me/appearance", { mode: o[0] }).then(function (x) {
          if (!x.ok) throw x;
          me.appearance = { on: true, mode: x.mode }; applyTheme(); closeMenu(); D.toast(app, "Appearance: " + o[1]);
        }).catch(function (e) { D.toast(app, D.errorText(e && (e.reason || e.message)), true); });
      } }, (ap.mode === o[0] ? "✓ " : "") + o[1]);
    }));
  }
  function draw() {
    applyTheme();
    closeMenu();
    var main = h("div", { class: "wrap" });
    // The full client information notice shows on Ask DELA, the Library and the recorder (where people describe processes).
    // Not on Home, Files, Projects, Talent, Work, Earnings, Profile or Settings (Stacey 2026-11-05). Files and profile
    // documents keep their short reminder and tick box at the upload, and the client information check still runs on save.
    var noNotice = ["home", "files", "projects", "talent", "work", "earnings", "profile", "ai", "help", "usage"];
    if (me.notice && noNotice.indexOf(tab) < 0) main.appendChild(h("div", { class: "notice", role: "note", text: me.notice }));
    if (me.pause && me.pause.all) main.appendChild(h("div", { class: "notice bad", role: "alert", text: "DELA is paused for members right now. You can still use it because you are on the Lawfecta Team." }));
    if (me.on_hold) main.appendChild(h("div", { class: "notice bad", role: "alert", text: "Some actions are paused on your account. Contact the Lawfecta Team." }));
    if (!me.side) main.appendChild(noSide());
    else if (tab === "usage" && me.side === "attorney") main.appendChild(usageView());
    else if (tab === "home") main.appendChild(NL() ? homeNew() : me.side === "attorney" ? attorneyHome() : freelancerHome());
    else if (tab === "help" && NL()) main.appendChild(helpView());
    else if (tab === "ai") main.appendChild(aiSettingsView());
    else if ((tab === "delegate" || tab === "ask") && (me.switches || {}).ai_generation) main.appendChild(chatView());
    else if (tab === "files" && me.side === "attorney" && (me.switches || {}).file_uploads) main.appendChild(filesView());
    else if ((tab === "library" && canHire() || tab === "record" && me.side === "attorney") && (me.switches || {}).playbook_library) {
      // A direct link to the recorder (/dela?tab=record) opens the Record a Process page
      if (tab === "record") { tab = "library"; lib.startRecord = true; }
      main.appendChild(libraryView());
    }
    else if (tab === "setup" && me.side === "attorney" && (me.switches || {}).guided_setup) main.appendChild(setupView());
    else if (tab === "connect") main.appendChild(connectView());
    else if (tab === "profile" && (me.switches || {}).profiles) main.appendChild(profileView());
    else if (tab === "projects" && canHire() && (me.switches || {}).flex_gigs) main.appendChild(projectsView());
    else if (tab === "talent" && canHire() && (me.switches || {}).talent_search) main.appendChild(talentView());
    else if (tab === "work" && me.side === "freelancer" && (me.switches || {}).flex_gigs) main.appendChild(workView());
    else if (tab === "earnings" && me.side === "freelancer" && (me.switches || {}).engagements) main.appendChild(earningsView());
    else if (tab === "agency" && me.side === "freelancer" && (me.switches || {}).agency_team) main.appendChild(agencyView());
    else if (tab === "inbox" && me.side && (me.switches || {}).gig_chat) main.appendChild(inboxView());
    else if (tab === "meetings" && me.side && (me.switches || {}).meetings) main.appendChild(meetingsView());
    else if (wrongSideTab(tab)) main.appendChild(wrongSideView(tab));
    else if (SECTIONS[tab]) main.appendChild(sectionSoon(SECTIONS[tab][0], SECTIONS[tab][1] + (me.side === "attorney" && (tab === "projects" || tab === "talent") && (sideInfo() || {}).verification_state !== "verified" ? " Posting work and hiring need a verified license: open Profile and verification from your account menu." : "")));
    else { tab = "home"; main.appendChild(NL() ? homeNew() : me.side === "attorney" ? attorneyHome() : freelancerHome()); }
    if (me.side === "attorney") { usageBanner(main); usageMeter(main); }
    closeMore();
    app.classList.toggle("nl", NL());
    show(NL() ? shellNew(main) : h("div", null, header(), nav(), main));
    placeBar();
  }

  function refresh() {
    return api.get("/me").then(function (r) { me = r.me; draw(); });
  }

  // ---------- Step 9b: usage limits (docs/briefs/step-9b-attorney-usage-limits.md) ----------
  // Attorneys see what they have used: a yellow banner at 80% of any limit, a small meter at the bottom of DELA, the
  // Usage page, and a pop-up when an action hits a limit. Viewing, exporting, assigning, messaging, posting, hiring and
  // paying are never blocked by these limits.
  var usage = { data: null, at: 0 };
  function loadUsage(force) {
    if (me.side !== "attorney") return Promise.resolve(null);
    if (!force && usage.data && Date.now() - usage.at < 60000) return Promise.resolve(usage.data);
    return api.get("/usage").then(function (u) { if (u && u.ok) { usage.data = u; usage.at = Date.now(); } return usage.data; }).catch(function () { return usage.data; });
  }
  function usagePct(used, limit) { return limit ? Math.min(100, Math.round(used * 100 / limit)) : 0; }
  function gbText(b) { return b >= 1073741824 ? (Math.round(b / 107374182.4) / 10) + " GB" : Math.round(b / 1048576) + " MB"; }
  function usageLines(u) {
    return [
      { key: "playbooks", label: "Saved documents", used: u.playbooks.used, limit: u.playbooks.limit, text: u.playbooks.limit === null ? u.playbooks.used + " saved (no limit on your plan)" : u.playbooks.used + " of " + u.playbooks.limit + " saved" },
      { key: "actions", label: "DELA actions this month", used: u.actions.used, limit: u.actions.limit, text: u.actions.limit === null ? u.actions.used + " used (no limit)" : u.actions.used + " of " + u.actions.limit + " this month" + (u.actions.shared ? ", shared by your firm" : "") },
      { key: "storage", label: "Storage", used: u.storage.used_bytes, limit: u.storage.limit_bytes, text: u.storage.limit_bytes === null ? gbText(u.storage.used_bytes) + " used" : gbText(u.storage.used_bytes) + " of " + gbText(u.storage.limit_bytes) + " used" }
    ];
  }
  function upgradeButton(u, cls) {
    return h("a", { class: "btn " + (cls || "blue") + " small", href: (u && u.upgrade_url) || "/account/upgrade" }, u && u.next_plan ? "Upgrade to " + u.next_plan.replace("Attorney ", "") : "Upgrade");
  }
  function usageBanner(host) {
    loadUsage().then(function (u) {
      if (!u) return;
      var near = usageLines(u).filter(function (l) { return l.limit && usagePct(l.used, l.limit) >= (u.warn_pct || 80); });
      if (!near.length) return;
      var words = near.map(function (l) { return l.key === "actions" ? "You've used " + u.actions.used + " of " + u.actions.limit + " DELA actions this month." : l.key === "playbooks" ? "You've saved " + u.playbooks.used + " of " + u.playbooks.limit + " documents." : "You've used " + gbText(u.storage.used_bytes) + " of " + gbText(u.storage.limit_bytes) + " of storage."; }).join(" ");
      host.insertBefore(h("div", { class: "notice warn usage-banner", role: "status", style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#fff7d6;border-color:#e6c84f" },
        h("span", { class: "grow", text: words }), upgradeButton(u)), host.firstChild);
    });
  }
  function usageMeter(host) {
    loadUsage().then(function (u) {
      if (!u || u.actions.limit === null) return;
      host.appendChild(h("p", { class: "small muted usage-meter", style: "text-align:center;margin:18px 0 4px" },
        h("a", { href: "#", onclick: function (e) { e.preventDefault(); tab = "usage"; draw(); }, text: "DELA actions: " + u.actions.used + " of " + u.actions.limit + " this month" })));
    });
  }
  function usageView() {
    var el = h("div", null, h("h1", { text: "Usage" }), h("p", { class: "muted", text: "Loading..." }));
    loadUsage(true).then(function (u) {
      D.clear(el);
      el.appendChild(h("h1", { text: "Usage" }));
      if (!u) { el.appendChild(h("p", { class: "notice", text: "Usage is shown for the attorney workspace." })); return; }
      var card = h("div", { class: "card", id: "usage-card" }, h("div", { class: "row" }, h("h2", { class: "grow", style: "margin:0", text: "Your plan: " + u.plan }), upgradeButton(u)));
      usageLines(u).forEach(function (l) {
        var p = usagePct(l.used, l.limit);
        card.appendChild(h("div", { style: "margin:14px 0" }, h("div", { class: "row" }, h("b", { class: "grow" }, l.key === "actions" ? D.term(l.label, "dela_actions") : l.key === "playbooks" && (u.locked_ids || []).length ? D.term(l.label, "read_only") : l.label), h("span", { class: "small", text: l.text })),
          l.limit ? h("div", { class: "bar", role: "progressbar", "aria-label": l.label, "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(p) }, h("span", { style: "width:" + p + "%" + (p >= 100 ? ";background:var(--bad)" : p >= (u.warn_pct || 80) ? ";background:#d9a400" : "") })) : null));
      });
      card.appendChild(h("p", { class: "small muted", text: "DELA actions reset on " + D.date(u.resets_on) + ". A larger task, such as drafting a whole document, uses more than a short answer. Actions on your own AI key do not count. Viewing, exporting and assigning documents, messaging freelancers, posting gigs, hiring and paying are never limited." }));
      if ((u.locked_ids || []).length) card.appendChild(h("p", { class: "notice", text: "🔒 " + u.locked_ids.length + (u.locked_ids.length === 1 ? " document is" : " documents are") + " read-only because your plan saves fewer documents. You can still view, export and assign them. Upgrade to edit them, or archive others to make room." }));
      el.appendChild(card);
    });
    return el;
  }
  // The pop-up when an action hits a limit: Upgrade, or Not now (only that action stops)
  function limitPopup(kind) {
    loadUsage(true).then(function (u) {
      var m = modal("Limit reached");
      var text = kind === "playbooks" ? "You've saved " + (u ? u.playbooks.used + " of " + u.playbooks.limit : "all your") + " documents on " + (u ? u.plan.replace("Attorney ", "") : "your plan") + "." + (u && u.next_plan ? " Upgrade to " + u.next_plan.replace("Attorney ", "") + " to save more." : "")
        : kind === "read_only" ? "This document is read-only on your plan. Upgrade to edit it. You can still view, export and assign it."
        : kind === "storage" ? "Your storage is full. Delete files or upgrade for more space."
        : "You've used this month's DELA actions. They reset on " + (u ? D.date(u.resets_on) : "the 1st of next month") + ", or upgrade for more.";
      m.body.appendChild(h("p", { text: text }));
      m.foot.appendChild(upgradeButton(u));
      m.foot.appendChild(h("button", { class: "ghost", type: "button", onclick: m.close }, "Not now"));
    });
  }
  // Who hires: attorneys, and agencies on the freelancer side once switched on (Step 7d part 2c)
  function canHire() { return me.side === "attorney" || !!me.agency_client; }
  // The word freelancers see for whoever posted a gig
  function clientWord(g) { return g && g.client_kind === "agency" ? "agency" : "attorney"; }

  // A link to the other side's page (for example an attorney opening dela?tab=work) says so, instead of an empty page
  // (Stacey's standing arrangements report, 2026-11-06)
  function wrongSideTab(t) {
    if (me.side === "attorney") return ["work", "earnings", "agency", "ask"].indexOf(t) >= 0;
    if (me.side === "freelancer") return ["files", "setup", "delegate", "record", "usage"].indexOf(t) >= 0 || (!me.agency_client && ["library", "projects", "talent"].indexOf(t) >= 0);
    return false;
  }
  function wrongSideView(t) {
    var other = me.side === "attorney" ? "freelancer" : "attorney";
    var hasOther = (me.sides || []).some(function (x) { return x.side === other; });
    var who = ((me.person || {}).name ? " (" + me.person.name + ")" : "");
    return h("div", { class: "card", id: "wrong-side" }, h("h2", { text: "This page is for " + other + "s" }),
      h("p", { text: "This page is on the " + other + " workspace of DELA. You are signed in as " + (me.side === "attorney" ? "an attorney" : "a freelancer") + who + "." +
        (hasOther ? " Switch workspaces to open it." : " To use it, sign out and sign in with your " + other + " account.") }),
      h("div", { class: "row", style: "flex-wrap:wrap" },
        hasOther ? h("button", { class: "blue small", type: "button", onclick: function () { switchSide(other); } }, "Switch to the " + other + " workspace") : null,
        h("button", { class: hasOther ? "ghost small" : "blue small", type: "button", onclick: function () {
          // The address bar stops pointing at the other side's page
          try { var u = new URL(location.href); u.searchParams.delete("tab"); history.replaceState(null, "", u.toString()); } catch (e) { /* older browsers keep the address */ }
          tab = "home"; draw(); } }, "Go to Home")));
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
    // Unfinished recording parts and their notes leave this browser with the person (AI review 0.9.0, privacy 1).
    // A recording still uploading is named first, so it is never deleted without a warning (AI review 0.9.1, privacy 1).
    idb.mine().then(function (left) {
      if (left.length && !confirm("A recording has not finished uploading. Sign out and delete it from this browser?")) return;
      signOutNow();
    });
  }
  function signOutNow() {
    show(frame("Signing you out...", "One moment."));
    var clearLocal = idb.clear().then(function () { try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("dela.rec.") === 0) localStorage.removeItem(k); }); } catch (e) { /* private windows */ } });
    Promise.all([clearLocal, api.signOut()]).then(function () { location.href = logoutUrl; }, function () { location.href = logoutUrl; });
  }

  // A notice's own button (UX review N01): the stored link is a DELA page such as /dela?tab=projects&gig=ID&view=agreement.
  // It opens on this page's address, keeping the website's own parameters and replacing DELA's.
  var NOTICE_TABS = { home: "Open Home", projects: "Open Projects", work: "Open Work", library: "Open the Library", files: "Open Files", talent: "Open Talent",
    inbox: "Open Inbox", meetings: "Open Meetings", profile: "Open your profile", earnings: "Open Earnings", ai: "Open AI settings", agency: "Open Agency",
    delegate: "Open Ask DELA", setup: "Open Get set up", connect: "Open the connection page" };
  var NOTICE_KEYS = ["tab", "gig", "view", "pb", "thread", "meeting", "bench", "paid", "payout"];
  function noticeAction(link) {
    if (typeof link !== "string" || link.indexOf("/dela") !== 0) return null;
    var q;
    try { q = new URLSearchParams(link.split("?")[1] || ""); } catch (e) { return null; }
    var tabName = q.get("tab") || "home";
    var label = q.get("gig") ? (q.get("view") === "agreement" ? "Open the agreement" : "Open the gig") : q.get("pb") ? "Open the document" :
      q.get("meeting") ? "Open the meeting" : q.get("thread") ? "Open the conversation" : q.get("bench") ? "Open the bench agreement" : (tabName === "ai" ? "Open " + setName() : NOTICE_TABS[tabName]);
    if (!label) return null;
    var cur;
    try { cur = new URLSearchParams(location.search); } catch (e) { return null; }
    NOTICE_KEYS.forEach(function (k) { cur.delete(k); });
    q.forEach(function (v, k) { if (NOTICE_KEYS.indexOf(k) >= 0 && v) cur.set(k, v); });
    if (!cur.get("tab")) cur.set("tab", tabName);
    return { label: label, href: location.pathname + "?" + cur.toString() };
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
      function noticeLi(n, extra) {
        var go = noticeAction(n.link);
        return h("li", null, h("strong", { text: n.title }), n.read ? null : h("span", { class: "badge G", style: "margin-left:6px", text: "New" }),
          n.body ? h("p", { class: "small", text: n.body }) : null,
          h("div", { class: "row", style: "gap:8px;align-items:center" }, h("span", { class: "muted small grow", text: D.dateTime(n.created_at) }),
            go ? h("button", { class: "ghost small", type: "button", onclick: function () {
              var done = function () { location.assign(go.href); };
              (n.read ? Promise.resolve() : api.post("/notifications/read", { id: n.id })).then(done, done);
            } }, go.label) : null), extra || null);
      }
      // "Needs your action" first, checked against each job's current state; then "Updates", one line per job (UX review N01)
      // "Needs your action" is the same live list as Projects (step 8b, retest R02); every notice is listed under Updates
      var upd = r.items;
      var actBox = h("div", null, h("h3", { text: "Needs your action" }), h("p", { class: "muted small", text: "Checking your work..." }));
      nb.appendChild(actBox);
      liveActions().then(function (items) {
        D.clear(actBox);
        actBox.appendChild(h("h3", { text: "Needs your action (" + items.length + ")" }));
        if (items.length) actBox.appendChild(h("ul", { class: "list", id: "notices-action" }, items.map(function (x) {
          return h("li", { class: "row" }, h("span", { class: "grow", text: x.text }), h("button", { class: "ghost small", type: "button", onclick: function () { closeDrawer(); x.open(); } }, x.label));
        })));
        var openWork = h("button", { class: "linkish", type: "button", onclick: function () { closeDrawer(); tab = me.side === "attorney" ? "projects" : "work"; gigs.id = null; draw(); } }, me.side === "attorney" ? "Open Projects" : "Open Work");
        if (items.failed) actBox.appendChild(h("p", { class: "notice", id: "notices-check-failed", role: "status" }, "DELA could not check all your work just now, so something may still wait on you. ", openWork));
        else if (!items.length) actBox.appendChild(h("p", { class: "muted small" }, "Nothing waits on you right now. ", me.side === "attorney" ? openWork : null));
      });
      if (r.items.length) {
        nb.appendChild(h("h3", { text: "Updates" }));
        var seen = {}, groups = [];
        upd.forEach(function (n) {
          if (n.gig_id && seen[n.gig_id]) { seen[n.gig_id].more.push(n); return; }
          var g = { first: n, more: [] }; groups.push(g); if (n.gig_id) seen[n.gig_id] = g;
        });
        nb.appendChild(h("ul", { class: "list", id: "notices-updates" }, groups.map(function (g) {
          return noticeLi(g.first, g.more.length ? h("details", null, h("summary", { class: "small", text: g.more.length + " earlier " + (g.more.length === 1 ? "update" : "updates") + " about this job" }),
            h("ul", { class: "list" }, g.more.map(function (n) { return noticeLi(n); }))) : null);
        })));
      }
    }).catch(function () { D.clear(nb); nb.appendChild(h("p", { text: "Notices could not load." })); });
  }

  // Links in notices and emails can open a tab (for example /dela?tab=files)
  try {
    var want = new URLSearchParams(location.search).get("tab");
    if (want && /^[a-z]+$/.test(want)) tab = want;
    // The Usage page on the member dashboard (/account/usage) shows the usage view
    if (location.pathname.indexOf("/account/usage") >= 0) tab = "usage";
    // A document link from a notice or a test (dela?tab=library&pb=ID) opens that document
    var wantPb = new URLSearchParams(location.search).get("pb");
    if (tab === "library" && wantPb && /^[0-9a-f-]{36}$/.test(wantPb)) { lib.pb = { playbook: { id: wantPb } }; lib.view = "read"; }
  } catch (e) { /* older browsers open Home */ }

  var pastToken = null;
  try { pastToken = new URLSearchParams(location.search).get("past_review"); } catch (e) { /* older browsers */ }
  var conflict = D.loginConflict(root);
  if (pastToken && /^[A-Za-z0-9_-]{10,200}$/.test(pastToken)) show(h("div", null, h("div", { class: "top" }, brand()), pastReviewPage(pastToken)));
  else if (conflict) show(frame("Two website logins in this browser", D.LOGIN_CONFLICT_TEXT.join(" ")));
  else if (boot.route === "here" && me) draw();
  else if (boot.route === "paused") show(frame("DELA is paused for a moment", boot.message || "Please try again soon."));
  else if (boot.route === "denied") show(denied(boot.reason));
  else show(signedOut(false));
})();
