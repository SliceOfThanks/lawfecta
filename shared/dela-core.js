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
    // A missing or broken amount reads "-", never "$NaN"
    if (typeof cents !== "number" || !isFinite(cents)) return "-";
    var d = cents / 100;
    return "$" + (d % 1 === 0 ? d.toLocaleString("en-US") : d.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };
  D.pct = function (bps) { return (bps / 100).toString() + "%"; };
  D.date = function (iso) {
    if (!iso) return "";
    // A plain date (2027-11-04) is a calendar day, not midnight UTC, so it shows the same day in every US time zone
    var s = String(iso);
    var d = s.length === 10 && s.charAt(4) === "-" && s.charAt(7) === "-" ? new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) : new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  // Today's date as YYYY-MM-DD on the member's own clock (not UTC)
  D.today = function () {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  D.dateTime = function (iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };
  D.firstName = function (name) { return String(name || "").split(" ")[0] || "there"; };

  // How an allowance reads to a member
  // Storage allowances are kept in MB, 1024 to the GB: 51200 reads "50 GB" (Stacey's Subscription pictures, 2026-11-12)
  D.mbText = function (mb) { return mb >= 1024 ? (Math.round(mb / 1024 * 10) / 10) + " GB" : mb + " MB"; };
  // What members call a plan feature: the AI allowance is "DELA actions" everywhere
  D.featLabel = function (f) { return f && f.key === "ai.runs" ? "DELA actions a month on Lawfecta's AI" : (f && f.label) || ""; };
  D.limitText = function (e) {
    if (e.kind === "flag") return e.enabled ? "Included" : "Not in your plan";
    if (!e.enabled) return "Not in your plan";
    if (e.unlimited) return "No cap";
    var left = e.remaining === null ? e.limit : e.remaining;
    if (e.unit === "MB") return D.mbText(e.limit);
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
          if (r.status === 503 && j.error === "paused") { location.reload(); }
          if (!r.ok) { var e = new Error(j.error || "error_" + r.status); e.status = r.status; throw e; }
          return j;
        });
      });
    }
    return {
      boot: boot,
      get: function (p) { return req("GET", p); },
      post: function (p, b) { return req("POST", p, b || {}); },
      // Sends a recording or other raw body (talking to the AI)
      raw: function (p, blob, type) {
        var opts = { method: "POST", headers: { "content-type": type } , body: blob };
        if (token) opts.headers["x-dela-session"] = token;
        return fetch(base + p, opts).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (r.status === 401 && onSignedOut) onSignedOut();
            if (!r.ok && !j.reason) { var e = new Error(j.error || "error_" + r.status); e.status = r.status; throw e; }
            return j;
          });
        });
      },
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
    D.belowSiteHeader(host, app);
    return { shadow: shadow, app: app };
  };

  // The Lawfecta site has its own fixed header. DELA's sticky top bar sits just below it, so the header never covers it.
  D.belowSiteHeader = function (host, app) {
    if (typeof window === "undefined" || !document.elementsFromPoint) return;
    var last = -1, busy = false;
    function measure() {
      busy = false;
      var bottom = 0, seen = [];
      [8, window.innerWidth / 2, window.innerWidth - 8].forEach(function (x) {
        (document.elementsFromPoint(x, 1) || []).forEach(function (el) {
          for (var n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
            if (n === host || host.contains(n) || seen.indexOf(n) >= 0) continue;
            seen.push(n);
            var pos = getComputedStyle(n).position;
            if (pos !== "fixed" && pos !== "sticky") continue;
            var r = n.getBoundingClientRect();
            if (r.top <= 1 && r.bottom > bottom && r.bottom < window.innerHeight / 2) bottom = r.bottom;
          }
        });
      });
      bottom = Math.round(bottom);
      if (bottom !== last) { last = bottom; app.style.setProperty("--dela-top", bottom + "px"); }
    }
    function soon() { if (!busy) { busy = true; (window.requestAnimationFrame || setTimeout)(measure); } }
    window.addEventListener("scroll", soon, { passive: true });
    window.addEventListener("resize", soon);
    setTimeout(measure, 0);
  };

  // ---------- One accessible help tip for the member app and the admin (UX review part 3) ----------
  // A "?" button that opens a short note under it: by click, tap or keyboard (Enter or Space); Escape closes it and
  // returns focus to the button. The note is tied to the button with aria-controls and aria-describedby. Essential
  // money, privacy and legal text always stays on the page; a tip only explains a word.
  var tipN = 0;
  D.helpTip = function (text, label, onToggle, startOpen) {
    if (!text) return [null, null];
    var id = "dela-tip-" + (++tipN);
    var box = D.h("div", { class: "helpbox", role: "note", id: id, hidden: !startOpen, text: text });
    var btn = D.h("button", { class: "help-q", type: "button", "aria-label": label || "What does this mean?", "aria-expanded": String(!!startOpen), "aria-controls": id, "aria-describedby": id }, "?");
    function set(open) { box.hidden = !open; btn.setAttribute("aria-expanded", String(open)); if (onToggle) onToggle(open); }
    btn.addEventListener("click", function (e) { e.stopPropagation(); set(box.hidden); });
    function esc(e) { if (e.key === "Escape" && !box.hidden) { e.stopPropagation(); set(false); btn.focus(); } }
    btn.addEventListener("keydown", esc);
    box.addEventListener("keydown", esc);
    return [btn, box];
  };
  // Words members meet on many screens, each checked against what DELA really does (2026-11-06)
  D.HELP = {
    verified: "The Lawfecta Team checked this person: an attorney's bar license, or a freelancer's identity and LinkedIn profile. It does not rate the quality of their work.",
    match_ready: "A freelancer is match-ready when three things are true: every required profile item is filled, the Lawfecta Team's check has passed, and they confirmed in the last 14 days that they can take work. Only match-ready freelancers show in Talent and gig matches.",
    bench: "Freelancers an agency hires for its own clients' work under a signed bench agreement. They never use a team seat, and the attorney never sees the agency's share.",
    platform_fee: "Lawfecta's fee on each engagement: a percentage of the price, with a minimum. The client's fee is added to what they pay; the freelancer's fee comes out of their payouts.",
    milestone: "A portion of work with its own price, due date and review. Funds are released after acceptance.",
    checklist: "The points DELA checks in each milestone's completion statement before the client reviews it. It is agreed at signing. DELA's check is not a legal review.",
    dela_check: "DELA scores the completion statement against the checklist. A pass needs the agreed score and every required point. The client still reviews the work.",
    dispute: "A way to settle a problem with held money. You talk it through in Messages for the notice period, then the Lawfecta Team decides. It is not a court or arbitration.",
    weekly_units: "How a monthly engagement is checked and paid: the month splits into units, each accepted and paid out like a milestone. They are not a weekly limit.",
    billing_day: "The day of the month a monthly engagement renews, set by the day month 1 is paid. The saved payment method is charged once on that day.",
    dela_actions: "DELA's AI use on Lawfecta's AI each month. A larger task, such as drafting a whole document, uses more than a short answer. Your own AI key uses none.",
    read_only: "Your plan saves fewer documents than you have. The most recently edited ones stay editable; the rest can be viewed, exported and assigned, not edited.",
    sensitive: "Social Security and ID numbers, financial account numbers, health information, biometric data, and logins or passwords. Never upload them to DELA; link to your own storage.",
    confidential: "A private area on an engagement for client files and secure links, open only to the attorney and the hired freelancer, after signing and the first payment.",
    subcontractors: "Vetted Lawfecta freelancers an agency brings onto a job. The agency stays responsible for them, and everyone is listed under Who's working on this.",
    quality_check: "Checks DELA runs on how a document is written. Items marked Required before approval block export, approval and gigs until fixed. Items marked Suggestion do not block anything.",
    raci: "Who does each step: R does the work, A is accountable and approves (exactly one per step), C is consulted, I is kept informed.",
    doc_types: "Policy: a rule the firm follows. Workflow: steps across roles. SOP: one task, step by step. Playbook: how to handle a situation that needs judgment.",
    next_review: "The date the document should be checked again: 12 months after approval, or 3 months for high-risk documents about trust money, conflicts or deadlines.",
    proposal_allowance: "How many proposals you can send this month on your plan. It resets on the 1st. Proposals to gigs you were invited to do not count.",
    agency_share: "The part of the freelancer's payout an agency keeps on a bench job, agreed in the bench agreement. The attorney never sees it."
  };
  // One look for every AI action (UX review part 3): any button whose label starts with the ✦ sign gets the AI style,
  // including buttons drawn later. Members can always tell which actions use DELA's AI (and AI credits).
  D.markAi = function (root) {
    function mark(node) {
      if (!node || !node.querySelectorAll) return;
      var list = node.matches && node.matches("button") ? [node] : node.querySelectorAll("button");
      Array.prototype.forEach.call(list, function (b) { if ((b.textContent || "").trim().charAt(0) === "✦" && b.className.indexOf("ai-btn") < 0 && !(b.closest && b.closest(".nav"))) b.className += " ai-btn"; });
    }
    mark(root);
    if (window.MutationObserver) new MutationObserver(function (ms) { ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, mark); }); }).observe(root, { childList: true, subtree: true });
  };
  // A label for text DELA's AI wrote, so it is never mistaken for a person's words
  D.aiLabel = function () { return D.h("span", { class: "badge ai-label", text: "AI suggestion" }); };

  // A label with its help tip after it, for headings and short terms
  D.term = function (label, key, tag) {
    var m = /^what (.+) means$/i.exec(label); // "What match-ready means" is asked as "What does match-ready mean?" (UX review 2026-11-08)
    var t = D.helpTip(D.HELP[key], "What does " + (m ? m[1] : label).toLowerCase() + " mean?");
    return D.h("span", { class: "term" }, D.h(tag || "span", { text: label }), t[0] ? " " : null, t[0], t[1]);
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
      billing_not_allowed: "The Lawfecta website did not let DELA read your billing. The Lawfecta Team has been asked to allow it.", billing_unreachable: "The Lawfecta website's billing could not be reached just now.",
      bookmarks_off: "Bookmarks are not turned on.", bookmarks_unreachable: "The Lawfecta website's bookmarks could not be reached just now. Try again in a minute.", bookmarks_not_allowed: "The Lawfecta website did not let DELA use its bookmarks. The Lawfecta Team has been asked to allow it.",
      needs_completed_gig: "This opens after you have completed a gig with this freelancer. Canceled, refunded or disputed gigs do not count.",
      sensitive_data: "This looks like sensitive data (a Social Security number or ITIN, a government ID number, an account or card number, or a password). Sensitive data never goes in DELA. Keep it in your own storage and share a link instead.",
      note_required: "Add a note saying why.", bad_amount: "Enter a number of actions from 1 to 100,000.",
      document_read_only: "This document is read-only on your plan. Upgrade to edit it.", no_subscription_id: "Brilliant Directories did not say which plan this member is on.",
      bd_member_not_found: "Brilliant Directories has no member with this number.",
      wrong_type: "That value is the wrong kind (for example, words where a number goes).",
      bad_member_id: "Enter the member's BD member ID (a number).",
      never_signed_in: "That member has not opened DELA yet. Ask them to open DELA once, then try again.",
      last_owner: "DELA needs at least one owner.",
      bd_plan_in_use: "That BD plan ID is already linked to another DELA plan.",
      locked_setting: "That setting can only be changed at setup.",
      bad_value: "That value is not allowed.",
      not_a_draft: "That plan version is not a draft.",
      bad_plan: "That plan does not fit this workspace.",
      signed_out: "Your sign in ended. Refresh the page.",
      // AI and files (Step 2a)
      ai_off: "DELA's AI is not open for your account yet.",
      voice_off: "Talking to the AI is not open for your account yet. You can type instead.",
      paused: "This part of DELA is paused for a moment. Please try again soon.",
      on_hold: "Some actions are paused on your account. Contact the Lawfecta Team.",
      ai_not_set_up: "DELA's AI is still being set up. Please try again later.",
      no_credits_left: "You have used this month's included DELA actions. Add your own AI key in AI settings, or upgrade your plan.",
      no_key: "You chose to use your own key, but no key is saved. Add one in AI settings, or switch back to Lawfecta's AI.",
      no_backup_credits: "Lawfecta's DELA actions cannot be used as a backup right now.",
      key_unreadable: "DELA could not read your saved key. Please add it again in AI settings.",
      encryption_not_set_up: "Adding your own key is not ready yet. Please try again later.",
      byok_off: "Adding your own key opens soon.",
      not_firm_owner: "Only the firm owner on a Business plan can add a key for the whole firm.",
      not_a_key: "That does not look like an AI key. Copy the whole key from your provider and paste it again.",
      bad_provider: "Choose OpenAI or Claude.",
      file_not_usable: "One of those files cannot go to the AI yet. Files waiting for your client information check, or still being checked, cannot be used.",
      too_many_files: "Attach up to 5 files at a time.",
      tick_needed: "Tick the confirmation box above the upload first.",
      type_not_allowed: "That file type is not accepted. Use PDF, Word (.docx), text, Markdown, PNG or JPG.",
      file_too_big: "That file is too big.",
      empty_file: "That file is empty.",
      storage_full: "Your file storage is full. Delete files you no longer need, empty the trash by waiting for it to clear, or upgrade your plan.",
      too_big_after_upload: "That file turned out bigger than allowed, so it was not kept.",
      uploads_off: "File uploads are not open for your account yet.",
      attorneys_only: "File uploads are for attorneys for now.",
      bad_folder: "That folder no longer exists.",
      folder_not_empty: "Move or delete the files in this folder first.",
      name_taken: "A folder with that name already exists.",
      bad_name: "Please enter a name.",
      not_found: "That item is no longer here. Refresh the page.",
      not_available: "That file is not available right now.",
      storage_not_set_up: "File storage is still being set up. Please try again later.",
      not_uploaded: "The upload did not reach DELA. Check your connection and upload the file again.",
      upload_failed: "The upload did not finish. Check your connection and try again.",
      catalog_empty: "The file has no tools in it.",
      catalog_too_many: "The file has more tools than one upload allows.",
      photo_too_big: "That photo is too large. Use one under 3 MB.",
      not_an_image: "That file is not a PNG or JPG photo.",
      server_error: "Something went wrong. Please try again.",
      // Profiles and verification (Step 3)
      profiles_off: "Profiles open soon.",
      no_side: "Choose your DELA workspace first.",
      changed_elsewhere: "Your profile was changed in another tab or window. Refresh the page to see the latest, then make your change again.",
      looks_like_client_info: "This looks like it may include client information. Take it out, or tick that it is not client information.",
      verification_off: "Verification opens soon.",
      country_not_yet: "For now the Lawfecta Team checks US licenses. Your profile is saved and you can keep using DELA's planning tools.",
      bad_region: "Choose the state that issued the license.",
      bad_bar_number: "Enter the bar number as it appears on the state bar record.",
      name_needed: "Enter your name exactly as it appears on the state bar record.",
      bad_email: "Enter a full email address.",
      free_email: "Use the email on your state bar record or an email at your firm's own domain. Gmail, Yahoo and other free email services do not count. Or choose the video call.",
      already_added: "You already added this license.",
      too_many: "That is a lot of tries today. Please wait until tomorrow or contact the Lawfecta Team.",
      wait_a_little: "We sent a few emails already. Please wait an hour, and check your spam folder.",
      not_now: "That cannot change right now. Refresh the page.",
      link_not_valid: "That link is not valid for this account. Sign in to Lawfecta as the attorney who added the license, then click the link again.",
      link_expired: "That link ran out. Send a new one from Profile.",
      bad_linkedin: "Paste your LinkedIn profile address. It looks like linkedin.com/in/your-name.",
      documents_off: "Profile documents open soon.",
      too_many_documents: "You have the most documents allowed. Remove one first.",
      not_ready: "That file is still being checked.",
      not_held: "That file does not need a check.",
      firm_staff_only: "Only the firm owner or firm staff can change the firm's details.",
      owner_only: "Only the firm owner can do that.",
      verify_first: "Your license needs to be verified before you can name firm staff.",
      not_on_team: "Add that person to your team first (Library, Team).",
      freelancers_only: "That is for freelancers.",
      tell_us_more: "Tell DELA a little more about your work first (a few sentences).",
      directory_not_allowed: "DELA cannot read your Lawfecta listing yet. You can fill in the form yourself.",
      directory_not_found: "DELA could not find your Lawfecta listing. You can fill in the form yourself.",
      both_checks_needed: "Tick both: the name matches, and LinkedIn shows its verified badge.",
      identity_needed: "Choose how the attorney showed the license is theirs.",
      email_not_confirmed: "The attorney has not confirmed the email yet. Wait for it, or use the video call.",
      duplicate_needs_note: "This license number is on another account. Write why this account is the real one.",
      reason_needed: "Write a short reason the member will see.",
      not_your_own: "Someone else on the Lawfecta Team has to check your own profile.",
      not_verified_yet: "That license is not verified yet.",
      directory_unreachable: "Your Lawfecta listing could not be reached just now. Try again in a minute, or fill in the form yourself.",
    };
    return map[code] || "That did not work (" + code + ").";
  };

  // Lawfecta brand: deep navy to burgundy, burgundy and blue pill buttons, soft pink highlights, Inter type.
// Each dark rule twice: for data-theme=dark always, and for data-theme=auto when the device is dark. A rule for the root
// (".dela{...}") gets the attribute on .dela itself; every other rule is scoped inside it.
D.darkCss = function (css) {
  var dark = "", auto = "";
  css.split("}").forEach(function (rule) {
    if (!rule) return;
    var at = rule.indexOf("{"), sel = rule.slice(0, at), body = rule.slice(at);
    var one = function (attr) { return sel.split(",").map(function (x) { x = x.trim(); return x === ".dela" ? ".dela" + attr : ".dela" + attr + " " + x; }).join(",") + body + "}"; };
    dark += one("[data-theme=dark]"); auto += one("[data-theme=auto]");
  });
  return dark + "@media (prefers-color-scheme:dark){" + auto + "}";
};
// Open a file whose short-lived link comes from the server (AI review 0.9.0, tests finding 1): the tab opens during the
// click, so pop-up blockers (Safari above all) allow it, then it is sent to the link once the server answers. A blob link
// (a file shown from memory) is released a minute later, so the copy does not stay reachable (privacy finding 6).
D.openTab = function (getUrl, onFail, opts) {
  var w = window.open("", "_blank");
  return Promise.resolve().then(getUrl).then(function (url) {
    // Only a web address or a file held in memory is followed (AI review 0.9.1, security 1)
    // (plain http only for this computer's own test server)
    if (!url || !/^(https:|blob:|http:[/][/](127[.]0[.]0[.]1|localhost)[:/])/i.test(String(url))) { if (w) w.close(); if (url && onFail) onFail({ message: "That link cannot be opened." }); return; }
    if (!w) {
      // The browser blocked the tab: say so instead of leaving the page, so nothing typed is lost (privacy 4)
      if (onFail) onFail({ message: "Your browser blocked the new tab. Allow pop-ups for this site, then click again." });
      return;
    }
    try { w.opener = null; } catch (e) { /* some browsers keep it */ }
    if (opts && opts.noReferrer) {
      // The other site is not told which page sent the visitor (privacy 5)
      var safe = String(url).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
      w.document.write('<meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0;url=' + safe + '">');
      w.document.close();
    } else w.location.href = url;
    if (String(url).indexOf("blob:") === 0) setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { /* already gone */ } }, 60000);
  }).catch(function (e) { if (w) w.close(); if (onFail) onFail(e); });
};
// How DELA looks: "device" follows the computer or phone, "light" and "dark" are fixed
// Account and security, the same card in the member area and the admin area. Sign-in belongs to the Lawfecta website
  // (email and password, or Google), so DELA shows the email it was given at the last sign-in and opens the website's own
  // pages for changes. DELA never holds a password, so nothing here can show or store one.
  D.accountCard = function (me) {
    var h = D.h, a = (me && me.account) || {}, em = String(((me && me.person) || {}).email || "").trim();
    function link(href, text, main) { return href ? h("a", { class: "btn small " + (main ? "blue" : "ghost"), href: href, target: "_blank", rel: "noopener" }, text) : null; }
    function row(label, value, lines, acts) {
      return h("div", { class: "acct-row" }, h("div", { class: "acct-what" }, h("b", { text: label }), value ? h("span", { class: "acct-val", text: value }) : null,
        lines.map(function (x) { return h("span", { class: "small muted", text: x }); })), h("div", { class: "acct-acts" }, acts));
    }
    // Stacey 2026-11-12: the website's own "change email" and "change password" pages open the whole Brilliant
    // Directories member dashboard, which members should not be sent into. So by default (both page settings empty) the
    // card offers the website's password reset by email, and an email change goes through the Lawfecta Team.
    var card = h("div", { class: "card acct", id: "set-account" }, h("h2", { text: "Account and security" }),
      h("p", { class: "small muted", text: "You sign in to DELA with your Lawfecta website account. DELA never sees or stores your password." }));
    card.appendChild(row("Sign-in email", em || "Not known yet. Sign out and sign in again.",
      ["This is the address your Lawfecta account had when you last signed in. DELA sends your emails to it.",
        a.change_email ? "Your current address stays in use until you save a new one on the Lawfecta website. After that, sign out and sign in again and DELA shows the new address."
          : "To change it, ask the Lawfecta Team: open Help in the menu, then \"Contact the Lawfecta Team\". Your current address stays in use until the team confirms the change."],
      [link(a.change_email, "Change email", true)]));
    card.appendChild(row("Password", "",
      [a.change_password ? "DELA cannot show your password. You type the new one on the Lawfecta website, where your password manager can fill it in."
        : a.forgot_password ? "DELA cannot show your password. To set a new one, click \"Reset password by email\". The Lawfecta website emails you a link, and you choose the new password there."
          // The website's reset page only opens for someone who is signed out (Stacey 2026-11-12: signed in, it lands in
          // the member dashboard), so with no page set the card gives the steps and no button.
          : "DELA cannot show your password. To set a new one:"].concat(
        a.google ? ["If you sign in with Google, Google keeps your password. Change it in your Google account."] : []),
      [link(a.change_password, "Change password", true), link(a.forgot_password, a.change_password ? "Forgot password" : "Reset password by email", !a.change_password),
        a.google ? link("https://myaccount.google.com/security", "Google account security", false) : null]));
    if (!a.change_password && !a.forgot_password) {
      var pw = card.querySelectorAll(".acct-what")[1], steps = h("ol", { class: "small muted", style: "margin:4px 0 4px 18px;padding:0" },
        h("li", { text: "Sign out (the round button at the top right, then \"Sign out\")." }),
        h("li", { text: "On the login page click \"Forgot Password? Click to Reset Password\"." }),
        h("li", { text: "The Lawfecta website emails you a link to choose a new password." }));
      if (pw) pw.insertBefore(steps, pw.children[2] || null);
    }
    return card;
  };

  D.setTheme = function (app, mode) { if (app) app.setAttribute("data-theme", mode === "light" || mode === "dark" ? mode : "auto"); };

  D.CSS = [
    ":host{all:initial}",
    ".dela{--bg:#f4f5f7;--card:#ffffff;--ink:#1c2230;--muted:#5f6675;--line:#e6e7ec;--brand:#8b2146;--brand-ink:#ffffff;--blue:#0b6fbd;--pink:#fbeef2;--pink-ink:#8b2146;",
    "--navy:#1d2030;--hero:linear-gradient(135deg,#1d2030 0%,#3a1a33 45%,#8b2146 100%);--hot:linear-gradient(120deg,#3a1238 0%,#8b2146 55%,#d23b62 100%);",
    "--ok:#2f7a4f;--warn:#a46a00;--bad:#b3261e;--soft:#f1f2f6;--shadow:0 10px 30px rgba(139,33,70,.10);--okbg:#e3f3ea;--okline:#b6dcc5;--bluebg:#eef6fd;",
    "font-family:Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:var(--ink);background:var(--bg);min-height:60vh;padding:0 0 88px;box-sizing:border-box;-webkit-font-smoothing:antialiased}",
    // Dark colors (UX review Phase 4 part D): on when the person chose Dark (data-theme=dark), or when they chose Match my
    // device and the device is dark (data-theme=auto). Light (data-theme=light) never turns dark.
    D.darkCss(".dela{--bg:#11131b;--card:#1a1d28;--ink:#eceef3;--muted:#a7adbb;--line:#2a2e3c;--brand:#c2416f;--pink:#2a1622;--pink-ink:#f19ab8;--soft:#222634;--shadow:none;--okbg:#17301f;--okline:#2b5a3b;--bluebg:#132233}" +
      ".problem{background:#3a1d1b;border-color:#6b2c27}.notice.bad{background:#3a1d1b}.notice.ok{background:#17301f}.talent-ver{color:#7fd3a3}" +
      ".msg.mine,.flow,.helpbox{border-color:#2b4a66}button.ai-btn{background:#2a1f33;color:#e6cdf2;border-color:#9a6bb0}.badge.ai-label{background:#2a1f33;color:#e6cdf2;border-color:#9a6bb0}" +
      ".oktxt{color:#7fd3a3}" +
      ".dela{--head:var(--pink)}" +
      // Waiting and done badges are quiet on dark: a deep tint with light text, not a bright chip
      ".badge.held{background:#3a2f12;color:#f0c668;border-color:#5c4a1c}.badge.ready{background:#17301f;color:#7fd3a3;border-color:#2b5a3b}" +
      // Readable text on dark (at least 4.5 to 1): links, outlined buttons, the current tab, labels and blue buttons
      "a{color:#8cc4ff}.soon{color:#8cc4ff}button.ghost,button.mic{color:#f19ab8}.nav button[aria-current=page]{color:#f19ab8}button.blue,.btn.blue,button.ai-btn.blue{background:#1f6fb2;border-color:#1f6fb2;color:#fff}" +
      // UI review 2026-11-08: lighter text links, clear selected filters, visible fields and placeholders on dark cards
      ".linkish{color:#f19ab8}.pills button[aria-pressed=true],.pills button[aria-selected=true]{background:#f19ab8;color:#11131b;border-color:#f19ab8}" +
      "input,select,textarea{background:#11131b;border-color:#6b7389}input::placeholder,textarea::placeholder{color:#9aa1b2;opacity:1}" +
      ".badge.off{color:#a7adbb;border-color:#3a3f50}"),
    ".dela *{box-sizing:border-box}",
    ".top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;background:linear-gradient(120deg,#1d1426,#3a1430);color:#fff;position:sticky;top:var(--dela-top,0px);z-index:5}",
    ".brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none}.brand img{width:38px;height:38px;border-radius:50%;flex:0 0 auto}",
    ".brand span{font-size:12px;font-weight:700;letter-spacing:.12em;opacity:.8;text-transform:uppercase}",
    ".grow{flex:1}",
    ".badge{display:inline-block;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:var(--soft);color:var(--ink);border:1px solid var(--line);white-space:nowrap}",
    ".badge.stage{background:#fff3d6;color:#7a5200;border-color:#e8c97a}.badge.C{background:#e3f3ea;color:#21613d;border-color:#b6dcc5}.badge.R{background:#e5f1fc;color:#0b5fa3;border-color:#b9d9f4}.badge.O{background:#fff3d6;color:#7a5200;border-color:#e8c97a}.badge.G{background:var(--pink);color:var(--pink-ink);border-color:#efc3d2}",
    ".avatar{width:36px;height:36px;border-radius:50%;background:#b8315e;color:#fff;font-weight:800;font-size:13px;display:inline-flex;align-items:center;justify-content:center;border:0;padding:0;cursor:pointer}",
    ".wrap{max-width:1040px;margin:0 auto;padding:16px}",
    "h1{font-size:28px;line-height:1.2;margin:18px 0 4px;font-weight:800;letter-spacing:-.01em}h2{font-size:19px;margin:0 0 8px;font-weight:800}h3{font-size:16px;margin:0 0 6px;font-weight:700}",
    "p{margin:0 0 10px}.muted{color:var(--muted)}.small{font-size:14px}",
    ".eyebrow{font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}",
    ".guide{border-left:4px solid var(--brand)}.guide-head{align-items:center;gap:10px}.guide-head img{width:28px;height:28px;border-radius:50%}" +
      ".guide-msg{background:var(--pink);color:var(--ink);border-radius:4px 14px 14px 14px;padding:10px 14px;margin:10px 0 8px;max-width:680px}.guide-msg p{margin:0}" +
      ".guide-choices{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 4px}.guide-me{margin:10px 0 0 auto;max-width:520px;background:var(--soft);border-radius:14px 4px 14px 14px;padding:8px 12px;width:fit-content}" +
      ".guide-ask{margin-top:10px;gap:8px}.guide-ask input{flex:1;min-width:0}.guide-alerts{margin-top:8px}.guide-alerts summary{cursor:pointer;font-weight:600}.guide-toggle{display:inline-flex;align-items:center;gap:6px}",
    ".card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:20px;margin:14px 0;box-shadow:var(--shadow)}",
    ".hero{border-radius:24px;padding:24px;margin:16px 0;color:#fff;background:var(--hot);box-shadow:0 14px 34px rgba(139,33,70,.25)}.hero.navy{background:var(--hero)}",
    ".hero h2{font-size:30px;line-height:1.15;margin:8px 0 10px;color:#fff}.hero p{color:rgba(255,255,255,.9);max-width:560px}",
    ".hero .pill-white{background:#fff;color:var(--brand);border-color:#fff}",
    ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}",
    ".stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media (max-width:360px){.stats{grid-template-columns:minmax(0,1fr)}}@media (min-width:800px){.stats{grid-template-columns:repeat(4,minmax(0,1fr))}}",
    ".stat-tile{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;gap:12px;align-items:flex-start}",
    ".chip{width:38px;height:38px;border-radius:50%;background:var(--pink);color:var(--pink-ink);display:inline-flex;align-items:center;justify-content:center;font-weight:800;flex:none}",
    ".tile{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;gap:12px;align-items:flex-start}.tile.col{flex-direction:column;gap:2px}",
    ".soon{font-size:11px;font-weight:800;color:var(--blue);text-transform:uppercase;letter-spacing:.08em}",
    ".notice{border-left:4px solid var(--brand);background:var(--pink);color:var(--ink);padding:12px 14px;border-radius:12px;margin:12px 0;font-size:14px}",
    ".notice.bad{border-color:var(--bad);background:#fdeceb}.notice.ok{border-color:var(--ok);background:#e9f5ee}p.small.bad{color:var(--bad)}p.small.ok{color:var(--ok)}" +
    "@media (max-width:640px){table.stack thead{display:none}table.stack,table.stack tbody,table.stack tr,table.stack td{display:block;width:100%}table.stack tr{border-bottom:1px solid var(--line);padding:10px 0}table.stack td{border:0;padding:3px 0}table.stack td[data-label]:before{content:attr(data-label);display:block;font-size:12px;color:var(--muted);font-weight:700}}" +
    "@media (max-width:640px){table.stack tr.band th{display:block;width:100%}}" +
    ".watermarked{position:relative;overflow:hidden}.watermarked:after{content:attr(data-watermark);position:absolute;left:-10%;right:-10%;top:45%;text-align:center;font-size:22px;font-weight:700;color:var(--ink);opacity:.07;transform:rotate(-18deg);pointer-events:none;white-space:nowrap}" +
    ".doc-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:14px;align-items:start}.doc-right{position:sticky;top:10px}@media (max-width:900px){.doc-grid{grid-template-columns:1fr}.doc-right{position:static;order:-1}}" +
    ".doc-sec{margin:14px 0}.doc-h{margin:0 0 4px}.qp-item{border-left:4px solid var(--line);padding:4px 10px}.qp-item.blocking{border-color:var(--bad)}.qp-item.attention{border-color:var(--brand)}.qp-item.pass{border-color:var(--ok)}" +
    ".raci-cell{min-width:44px;padding:4px 8px;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:8px}tr.raci-bad td:first-child{color:var(--bad);font-weight:700}" +
    ".img-list{display:flex;flex-direction:column;gap:10px;margin:8px 0}.img-fig{position:relative;margin:0}.img-fig img{display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:10px;cursor:zoom-in;background:var(--bg)}.img-fig figcaption{font-style:italic;color:var(--muted);font-size:14px;margin-top:4px}" +
    ".img-tools{position:absolute;top:8px;right:8px;display:none;gap:6px;z-index:2}.img-fig.editable:hover .img-tools,.img-fig.editable:focus-within .img-tools,.img-fig.show-tools .img-tools{display:flex}.img-tools button{padding:4px 10px;font-size:13px}.img-bar{margin:6px 0}.img-drop{outline:3px dashed var(--blue);outline-offset:2px}.img-thumb{width:96px;height:64px;object-fit:cover;border:1px solid var(--line);border-radius:8px}" +
    ".img-full{position:fixed;inset:0;z-index:2147483003;background:rgba(15,18,25,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 12px 12px;touch-action:pinch-zoom;overflow:auto}.img-full img{max-width:100%;max-height:85vh;object-fit:contain;touch-action:pinch-zoom}.img-full .img-cap{color:#fff;font-style:italic;margin:8px 0 0}.img-x{position:fixed;top:10px;right:10px;background:#fff;color:#1c2230;border-color:#fff;min-width:44px;min-height:44px;justify-content:center}" +
    ".dela-modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(920px,calc(100% - 24px));max-height:calc(100% - 24px);overflow:auto;background:var(--card);border-radius:18px;padding:18px;z-index:2147483002;box-shadow:0 20px 60px rgba(0,0,0,.3)}.modal-foot{margin-top:12px;gap:8px;flex-wrap:wrap}button.ghost.grey{color:var(--muted);border-color:var(--line)}.conf-section{margin-top:18px;padding-top:12px;border-top:1px solid var(--line)}.conf-section h3{margin:0 0 6px}.conf-file{padding:8px 0;border-bottom:1px solid var(--line)}.conf-file:last-child{border-bottom:0}.conf-upload,.conf-link-form{margin:6px 0 10px}.conf-msg{padding:6px 10px;margin:6px 0;border-radius:10px;background:var(--soft,#f4f4f6)}.conf-msg.mine{margin-left:24px}.sens-box{margin:8px 0}.agency-box{border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin:6px 0}.badge.agency{background:#2b1834;color:#fff}.avatar-dot{display:inline-flex;width:32px;height:32px;border-radius:50%;background:var(--line);align-items:center;justify-content:center;font-weight:700}.img-toolbar button[aria-pressed=true]{background:var(--brand);color:var(--brand-ink)}.img-center{text-align:center}" +
    ".img-stage{position:relative;display:inline-block;margin:8px 0;max-width:100%;line-height:0}.img-canvas{display:block;max-width:100%;height:auto;cursor:crosshair;touch-action:none;border:1px solid var(--line);border-radius:10px}.img-over{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}.img-flagbar{background:#fff7cc;border:1px solid #f5c518;border-radius:10px;padding:8px 12px;margin:6px 0}.img-toolbar{gap:6px;flex-wrap:wrap}" +
    ".msg{max-width:80%;margin:8px 0;padding:10px 12px;border-radius:14px;background:var(--bg);border:1px solid var(--line)}.msg.mine{margin-left:auto;background:var(--bluebg);border-color:#b9d9f4}" +
    ".tool-group{border:1px solid var(--line);border-radius:12px;padding:8px 12px;margin:6px 0;background:var(--card)}.tool-group summary{cursor:pointer;list-style:revert}" +
    "button.ai-btn{border-color:#7a4b8c;color:#5a2d6b;background:#f7f0fa}button.ai-btn.blue{background:var(--blue);color:#fff;border-color:var(--blue)}.badge.ai-label{background:#f7f0fa;color:#5a2d6b;border:1px solid #d8c2e2}" +
    ".term .helpbox{display:block}.term .helpbox[hidden]{display:none}.help-q:focus-visible{outline:3px solid var(--blue);outline-offset:2px}" +
    ".help-q{width:22px;height:22px;min-height:0;padding:0;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--muted);font-size:12px;font-weight:700;line-height:1;cursor:pointer}.help-q:hover,.help-q[aria-expanded=true]{color:var(--ink);border-color:var(--ink)}",
    "button,.btn{font:inherit;font-weight:700;border-radius:999px;border:1.5px solid var(--brand);background:var(--brand);color:var(--brand-ink);padding:10px 20px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;line-height:1.2}",
    "button.blue,.btn.blue{background:var(--blue);border-color:var(--blue);color:#fff}",
    "button.ghost{background:transparent;color:var(--brand)}button.danger{background:var(--bad);border-color:var(--bad);color:#fff}button.small,.btn.small{padding:6px 14px;font-size:14px}",
    ".top button.ghost,.top .btn.ghost{color:#fff;border-color:rgba(255,255,255,.45)}",
    "button:disabled{opacity:.55;cursor:not-allowed}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--blue);outline-offset:2px}",
    "input,select,textarea{font:inherit;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:12px;padding:9px 12px;max-width:100%}",
    "label{display:block;font-size:14px;font-weight:700;margin:10px 0 4px}",
    ".row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}",
    ".seg{display:inline-flex;border:1px solid rgba(255,255,255,.35);border-radius:999px;overflow:hidden}.seg button{border:0;border-radius:999px;background:transparent;color:#fff;font-weight:700;padding:6px 14px;font-size:14px}.seg button[aria-pressed=true]{background:#fff;color:var(--brand)}",
    ".sub-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin:12px 0}.sub-plan{border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:6px;background:var(--card)}.sub-plan.current{border:2px solid var(--pink-ink);background:var(--pink)}.sub-mine{align-self:flex-start}.sub-price{font-size:17px;font-weight:700;margin:0}.sub-feats{margin:6px 0;padding-left:18px;font-size:13px;flex:1 1 auto}.sub-feats li{margin:2px 0}.sub-plan .btn{align-self:flex-start;margin-top:auto}.limit-banner{background:#fff7d6;border-color:#e6c84f;color:#3d2f00}.dela .sub-plan a.btn.ghost{background:transparent;color:var(--pink-ink);border:1px solid var(--pink-ink)}",
    // Step 17: category search (suggestions under the box), the three lists, the category line on a result, the profile picker
    ".cat-search{position:relative}.cat-suggest{position:absolute;left:0;right:0;top:100%;z-index:30;margin:4px 0 0;padding:4px;list-style:none;background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);max-height:320px;overflow:auto}" +
    ".cat-suggest li{padding:8px 10px;border-radius:8px;cursor:pointer;line-height:1.35}.cat-suggest li:hover,.cat-suggest li[aria-selected=true]{background:var(--pink)}" +
    ".talent-cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 12px}.talent-cats select{width:100%}.cat-line{color:var(--pink-ink);font-weight:600;margin:2px 0}" +
    // Step 18: Talent results in the mockup layout (photo or initial, who, about, then the two actions with the gig to invite for)
    ".talent-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:16px 0 8px}.talent-sort select{margin-left:6px}.talent-help{margin:12px 0;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:var(--pink)}.talent-help summary{cursor:pointer}" +
    ".talent-card{margin:8px 0}.talent-top{display:grid;grid-template-columns:96px minmax(180px,280px) 1fr;gap:18px;align-items:center}.talent-photo{width:96px;height:96px;border-radius:50%;object-fit:cover;display:flex;align-items:center;justify-content:center}" +
    ".talent-rule{border-left:1px solid var(--line);padding-left:18px;align-self:stretch}.talent-clear{background:transparent;border:0;color:var(--pink-ink);font-weight:700;text-decoration:underline;cursor:pointer;padding:6px 4px;min-height:0}" +
    ".talent-cats{align-items:end}.talent-go{margin:8px 0;display:flex}.talent-go button{width:100%;min-height:44px}.talent-gig-word{font-weight:700;white-space:nowrap}.talent-rev{white-space:nowrap}.talent-star{color:#b7791f}" +
    ".talent-photo.none{background:var(--pink);color:var(--pink-ink);font-size:32px;font-weight:700}.talent-trust{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;margin-top:6px;font-size:14px}.talent-ver{color:#21613d;font-weight:700;padding-right:12px;border-right:1px solid var(--line)}" +
    ".talent-tags{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.talent-tag{font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--pink);color:var(--pink-ink)}" +
    ".talent-acts{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}.talent-gig{display:flex;flex-direction:row;align-items:center;gap:10px;flex:1 1 320px;min-width:0;padding-left:14px;border-left:1px solid var(--line)}.talent-gig select{flex:1 1 auto;min-width:0;width:auto}.talent-acts{align-items:center}" +
    ".talent-acts button{min-height:40px}@media (max-width:720px){.talent-top{grid-template-columns:56px 1fr;align-items:start}.talent-photo{width:56px;height:56px;font-size:22px}.talent-about{grid-column:1 / -1}.talent-rule{border-left:0;padding-left:0}.talent-acts button{flex:1 1 100%}.talent-gig{flex-wrap:wrap;border-left:0;padding-left:0}}" +
    // Step 18 part 2: the full profile page (header, tabs with a clear selected and focused state, facts, items)
    ".tp-photo{width:84px;height:84px;font-size:30px}.tp-tabs{display:flex;flex-wrap:wrap;gap:4px;margin:14px 0 10px;border-bottom:1px solid var(--line)}" +
    ".dela .tp-tabs button{background:transparent;border:0;border-bottom:3px solid transparent;border-radius:0;color:var(--muted);font-weight:700;padding:10px 12px;min-height:44px}" +
    ".dela .tp-tabs button[aria-selected=true]{color:var(--pink-ink);border-bottom-color:var(--pink-ink)}.dela .tp-tabs button:focus-visible{outline:2px solid var(--pink-ink);outline-offset:-2px}" +
    ".tp-panel:focus-visible{outline:2px solid var(--pink-ink);outline-offset:4px}.tp-panel .card{margin:10px 0}.tp-item{padding:12px 0;border-top:1px solid var(--line)}.tp-item:first-of-type{border-top:0}" +
    ".tp-facts{margin:0}.tp-facts div{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--line)}.tp-facts div:first-child{border-top:0}.tp-facts dt{color:var(--muted)}.tp-facts dd{margin:0;font-weight:700;text-align:right}" +
    // Ready-made profile pictures: a compact grid, one choice, a clear ring on the chosen and the focused one
    ".av-box{margin:6px 0 10px}.av-grid{display:grid;grid-template-columns:repeat(auto-fill,52px);gap:6px;max-height:190px;overflow:auto;padding:4px}.dela .av-opt{width:52px;height:52px;min-height:0;padding:2px;border-radius:50%;border:2px solid transparent;background:transparent;line-height:0}" +
    ".av-opt img{width:44px;height:44px;border-radius:50%}.dela .av-opt[aria-checked=true]{border-color:var(--pink-ink);box-shadow:0 0 0 2px var(--pink)}.dela .av-opt:focus-visible{outline:2px solid var(--pink-ink);outline-offset:2px}" +
    ".talent-bm{display:inline-flex;align-items:center;gap:6px;margin:4px 0 8px;cursor:pointer}.talent-marked{font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}.dela .bm-btn[aria-pressed=true]{border-color:var(--pink-ink);background:var(--pink)}" +
    // Step 19: the Subscription page (four areas as tabs; on a phone the tabs become four equal buttons with short names)
    ".sub-tabs{display:flex;flex-wrap:wrap;gap:4px;margin:10px 0;border-bottom:1px solid var(--line)}.dela .sub-tabs button{background:transparent;border:0;border-bottom:3px solid transparent;border-radius:8px 8px 0 0;color:var(--muted);font-weight:700;padding:10px 14px;min-height:44px}" +
    ".dela .sub-tabs button[aria-selected=true]{color:var(--pink-ink);border-bottom-color:var(--pink-ink);background:var(--pink)}.dela .sub-tabs button:focus-visible,.dela .sub-cycle button:focus-visible{outline:2px solid var(--pink-ink);outline-offset:2px}.st-short{display:none}" +
    ".sub-panel:focus-visible{outline:2px solid var(--pink-ink);outline-offset:4px}.sub-panel .card{margin:10px 0}.sub-hero{background:var(--pink)}.sub-eyebrow{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pink-ink);margin:0 0 4px}" +
    ".sub-group{font-size:15px;margin:16px 0 4px;padding:8px 10px;background:var(--pink);border-radius:8px}.sub-line{padding:10px 0;border-top:1px solid var(--line)}.sub-group + .sub-line{border-top:0}" +
    ".sub-table{width:100%;border-collapse:collapse}.sub-table caption{text-align:left;padding:0 0 6px}.sub-table th,.sub-table td{text-align:left;padding:8px 10px;border-top:1px solid var(--line);vertical-align:top}.sub-table thead th{border-top:0;white-space:nowrap}.sub-table tbody th{font-weight:600}" +
    ".sub-cycle{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:3px;gap:2px;margin:6px 0}.dela .sub-cycle button{background:transparent;border:0;border-radius:999px;color:var(--ink);font-weight:700;padding:6px 16px;min-height:36px}.dela .sub-cycle button[aria-checked=true]{background:var(--brand);color:var(--brand-ink)}" +
    ".sub-here{font-weight:700;color:var(--pink-ink);margin:auto 0 0}.sub-plan button{align-self:flex-start;margin-top:auto;min-height:40px}" +
    "@media (max-width:720px){.sub-tabs{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);border-radius:12px;padding:4px;gap:4px}.dela .sub-tabs button{border-radius:8px;border-bottom:0;padding:10px 2px;font-size:14px}.dela .sub-tabs button[aria-selected=true]{background:var(--brand);color:var(--brand-ink)}" +
    ".st-full{display:none}.st-short{display:inline}.sub-plan button,.subp .btn{width:100%;justify-content:center}.subp .tp-facts div{flex-direction:column;gap:2px}.subp .tp-facts dd{text-align:left}}" +
    // Step 20: the progress to match-ready on the Profile page
    ".ready-bar{height:14px;margin:12px 0 8px}.ready-what{margin:6px 0 4px}.ready-group{font-size:15px;margin:14px 0 2px}.ready-list{list-style:none;margin:0;padding:0}.ready-list .check{align-items:center}.ready-list .linkish{white-space:nowrap}" +
    ".sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}" +
    // Step 22 (mockup 02): five filters in a row, the actions in a right-hand column of the card, the match-ready panel, DELA's accordion
    ".talent-cats{grid-template-columns:repeat(5,minmax(0,1fr));gap:0 10px;align-items:start}@media (max-width:1100px){.talent-cats{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:560px){.talent-cats{grid-template-columns:1fr}}" +
    ".talent-go2 button{min-height:44px}.talent-top{grid-template-columns:72px minmax(170px,240px) minmax(0,1fr) minmax(200px,240px)}.talent-card .talent-photo{width:72px;height:72px;font-size:26px}" +
    ".talent-top .talent-acts{flex-direction:column;flex-wrap:nowrap;align-items:stretch;gap:6px;margin:0;padding:0 0 0 18px;border-top:0;border-left:1px solid var(--line);align-self:stretch;justify-content:center}" +
    ".talent-top .talent-gig{flex:0 0 auto;flex-direction:column;align-items:stretch;gap:2px;padding-left:0;border-left:0}.talent-top .talent-gig select{width:100%}.talent-top .talent-acts button{width:100%;min-height:44px}" +
    "@media (max-width:980px){.talent-top{grid-template-columns:56px minmax(0,1fr);align-items:start}.talent-card .talent-photo{width:56px;height:56px;font-size:22px}.talent-top .talent-about,.talent-top .talent-acts{grid-column:1 / -1}.talent-top .talent-acts{border-left:0;padding:10px 0 0;border-top:1px solid var(--line)}.talent-rule{border-left:0;padding-left:0}}" +
    ".mr-wrap{position:relative;display:inline-block;margin:0 0 6px}.dela .mr-btn{background:transparent;border:0;color:var(--ink);font-weight:600;padding:6px 4px;min-height:32px;display:inline-flex;align-items:center;gap:8px;text-decoration:underline}" +
    ".mr-i{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:1.5px solid var(--ink);border-radius:50%;font-size:13px;font-weight:700;text-decoration:none}.dela .mr-btn:focus-visible{outline:2px solid var(--pink-ink);outline-offset:2px}" +
    ".mr-panel{position:absolute;left:0;top:100%;z-index:20;width:min(380px,86vw);background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,.14);font-size:14px}.mr-list{margin:6px 0 0;padding:0;list-style:none}" +
    ".mr-list li{padding:3px 0 3px 24px;position:relative}.mr-list li:before{content:'✓';position:absolute;left:2px;color:#21613d;font-weight:700}@media (max-width:720px),(hover:none){.mr-wrap{display:block}.mr-panel{position:static;width:auto;box-shadow:none;margin-top:4px}}" +
    ".tp-head-grid{display:grid;grid-template-columns:84px minmax(0,1fr) minmax(240px,340px);gap:18px;align-items:start}.tp-head-acts{display:flex;flex-direction:column;gap:10px}.tp-head-acts .tp-invite{margin:0;padding:0;border-top:0;flex-direction:column;align-items:stretch;gap:6px}" +
    ".tp-head-acts .talent-gig{flex:0 0 auto;flex-direction:column;align-items:stretch;gap:2px;padding-left:0;border-left:0}.tp-head-acts .talent-gig select{width:100%}.tp-head-acts button{min-height:44px}" +
    "@media (max-width:900px){.tp-head-grid{grid-template-columns:56px minmax(0,1fr)}.tp-head-acts{grid-column:1 / -1}.tp-head-acts #tp-bookmark{justify-content:flex-start}.tp-head-acts button{flex:1 1 auto}}" +
    // Stacey 2026-11-13: the ready-made pictures are see-through drawings, so every picture sits on the light pink of the initial circle
    "img.talent-photo,img.face,.av-opt img{background:#fbeef2}" +
    ".talent-help-h{margin:0;font-size:inherit}.dela .talent-help-btn{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;border:0;color:var(--ink);padding:4px 0;min-height:44px}.dela .talent-help-btn:focus-visible{outline:2px solid var(--pink-ink);outline-offset:2px}" +
    ".talent-cost{border:1px solid var(--line);border-radius:999px;padding:3px 10px;background:var(--card);white-space:nowrap}.dela .cat-chip button{min-width:24px;min-height:24px}" +
    ".fit-row .talent-photo{width:48px;height:48px;font-size:20px}" +
    ".client-card .client-photo{width:56px;height:56px;font-size:22px}.client-card .talent-ver{border-right:0;padding-right:0}.client-card h2{margin-top:0}" +
    ".firm-logo{width:44px;height:44px;object-fit:contain;border-radius:8px;border:1px solid var(--line);background:#fff}.firm-logo.big{width:72px;height:72px}.firm-logo.none{display:flex;align-items:center;justify-content:center;background:transparent;color:var(--ink);font-size:12px;border-style:dashed}" +
    ".tp-two{display:grid;grid-template-columns:minmax(0,2fr) minmax(220px,1fr);gap:14px;align-items:start}.tp-two .card{margin:0 0 12px}@media (max-width:860px){.tp-two{grid-template-columns:1fr}}" +
    ".tp-lines{margin:0;padding-left:18px}.tp-lines li{margin:6px 0}@media (max-width:720px){.tp-photo{width:56px;height:56px;font-size:22px}}" +
    ".cat-picked{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.cat-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 6px 4px 12px;border-radius:999px;background:var(--pink);border:1px solid var(--line);font-size:13px}" +
    ".cat-chip button{border:0;background:transparent;color:var(--ink);cursor:pointer;font-size:15px;line-height:1;padding:2px 6px;min-height:0}.cat-browse{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0 12px}.cat-browse select{width:100%}",
    ".sw-table thead th{background:var(--head,var(--pink));color:var(--ink)}.sw-band th{background:var(--head,var(--pink));color:var(--ink);padding:12px 10px;border-top:2px solid var(--line)}.sw-name{display:block;font-size:16px;font-weight:700}.sw-about{display:block;font-size:13px;font-weight:400;color:var(--muted);margin-top:2px}.sw-table tr[hidden]{display:none}",
    "table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:700}",
    ".scroll{overflow-x:auto}",
    ".tabs{display:flex;gap:4px;padding:8px 16px;background:var(--card);border-bottom:1px solid var(--line);overflow-x:auto}.tabs button{background:transparent;color:var(--ink);border-color:transparent;font-weight:700;white-space:nowrap}.tabs button[aria-selected=true]{background:var(--pink);color:var(--pink-ink);border-color:transparent}",
    ".stat{font-size:28px;font-weight:800;line-height:1.1}",
    ".list{list-style:none;padding:0;margin:0}.list li{padding:12px 0;border-bottom:1px solid var(--line)}",
    ".work{display:flex;gap:14px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px 16px;margin:10px 0}",
    // On a narrow screen a long status label ("Signed: waiting for the first payment") wraps instead of running off the card
    "@media (max-width:640px){.work{flex-wrap:wrap}.badge{white-space:normal;max-width:100%}.row>*{min-width:0}input,select,textarea{max-width:100%;min-width:0}}",
    ".bell{position:relative;background:transparent;color:#fff;border-color:rgba(255,255,255,.45)}.bell b{position:absolute;top:-6px;right:-6px;background:#d23b62;color:#fff;border-radius:999px;font-size:11px;padding:1px 6px}",
    ".drawer{position:fixed;top:0;right:0;bottom:0;width:min(380px,calc(100% - 48px));background:var(--card);border-left:1px solid var(--line);z-index:2147483001;padding:16px;padding-top:max(16px,env(safe-area-inset-top));overflow:auto;-webkit-overflow-scrolling:touch;box-shadow:-8px 0 30px rgba(0,0,0,.15)}",
    ".dela-scrim{position:fixed;inset:0;background:rgba(15,18,30,.28);z-index:2147483000}",
    ".drawer-top{position:sticky;top:0;height:0;z-index:3;display:flex;justify-content:flex-end;align-items:flex-start;overflow:visible}",
    ".drawer-x{background:var(--card)!important;flex:none;margin-top:2px}",
    ".menu{position:absolute;right:12px;top:calc(100% + 6px);background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.15);padding:8px;z-index:15;min-width:220px}.menu button,.menu a{display:flex;width:100%;background:transparent;color:var(--ink);border:0;border-radius:10px;padding:10px 12px;font-weight:600}.menu button:hover,.menu a:hover{background:var(--soft)}",
    ".nav{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);display:flex;justify-content:space-around;padding:6px 4px calc(6px + env(safe-area-inset-bottom));z-index:6}",
    // Every tab shares the width, so seven tabs fit a 290-pixel phone (Stacey's report 2026-11-06): long names wrap instead
    ".nav button{flex:1 1 0;min-width:0;background:transparent;border:0;color:var(--muted);flex-direction:column;gap:2px;font-size:13px;font-weight:600;padding:6px 2px;border-radius:12px;white-space:normal;line-height:1.15;text-align:center}@media (max-width:380px){.nav button{font-size:11px}.nav button i{font-size:18px}}.nav button i{font-style:normal;font-size:20px;line-height:1}.nav button[aria-current=page]{color:var(--brand)}",
    // More than seven tabs (a freelancer agency has nine): the bar scrolls sideways instead of squeezing the names together (UX review 2026-11-08)
    "@media (max-width:899px){.nav.many{overflow-x:auto;justify-content:flex-start}.nav.many button{flex:1 0 64px;min-width:64px}}",
    "@media (min-width:900px){.nav{position:static;justify-content:flex-start;gap:6px;border:0;background:transparent;padding:8px 16px;max-width:1040px;margin:0 auto}.nav button{flex:none;flex-direction:row;gap:8px;font-size:15px;padding:8px 14px}.nav button[aria-current=page]{background:var(--pink)}.dela{padding-bottom:48px}}",
    ".toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 18px;border-radius:999px;z-index:30;font-weight:700;max-width:90%}.toast.bad{background:var(--bad);color:#fff}",
    ".check{display:flex;gap:10px;align-items:flex-start;padding:6px 0}.check i{width:18px;height:18px;border-radius:50%;border:2px solid #d5aebb;flex:none;margin-top:3px;font-style:normal;font-size:12px;line-height:14px;text-align:center;color:#fff}.check.done i{background:#2f7a4f;border-color:#2f7a4f}.check.done span{color:var(--muted)}",
    // Release Control
    ".envs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px}.envs>.card{margin:0}",
    ".kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.kv div{background:var(--soft);border-radius:12px;padding:10px 12px}.kv b{display:block;font-size:18px;line-height:1.3;overflow-wrap:anywhere}",
    ".soft{background:var(--soft);border-radius:14px;padding:14px}",
    ".badge.bad{background:#fdeceb;color:#9b1c14;border-color:#f3b8b3}",
    ".steps{list-style:none;margin:14px 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}",
    ".steps li{border:1px solid var(--line);border-radius:14px;padding:10px 12px;background:var(--soft);font-size:14px;font-weight:700;line-height:1.35}",
    ".steps li.done{background:var(--okbg);border-color:var(--okline)}.steps li.now{background:var(--pink);border:2px solid var(--brand)}",
    ".steps i{display:inline-flex;width:28px;height:28px;border-radius:50%;align-items:center;justify-content:center;font-style:normal;font-weight:800;background:var(--card);border:1px solid var(--line);margin-bottom:6px}",
    ".steps li.done i{background:var(--ok);color:#fff;border-color:var(--ok)}.steps li.now i{background:var(--brand);color:#fff;border-color:var(--brand)}",
    ".flow{border:1px solid #b9d9f4;background:var(--bluebg);border-radius:16px;padding:16px;margin-top:14px}.flow.strong{border:2px solid var(--brand);background:var(--pink)}",
    ".bar{height:10px;border-radius:999px;background:var(--line);overflow:hidden;margin:8px 0}.bar span{display:block;height:100%;background:var(--blue);transition:width .4s}",
    ".tick{width:24px;height:24px;border-radius:50%;flex:none;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;border:1px solid var(--line);background:var(--card)}",
    ".tick.ok{background:var(--ok);border-color:var(--ok);color:#fff}.tick.now{background:var(--blue);border-color:var(--blue);color:#fff}.tick.bad{background:var(--bad);border-color:var(--bad);color:#fff}",
    ".dot{width:12px;height:12px;border-radius:50%;flex:none;margin-top:6px;background:var(--muted)}.dot.k-push{background:var(--ok)}.dot.k-back{background:var(--blue)}.dot.k-security{background:var(--bad)}.dot.k-health{background:#d23b62}.dot.k-settings{background:var(--warn)}.dot.k-pause{background:var(--brand)}",
    ".pills{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.pills button{background:var(--card);color:var(--ink);border:1px solid var(--line)}.pills button[aria-pressed=true],.pills button[aria-selected=true]{background:var(--navy);color:#fff;border-color:var(--navy)}",
    "button.big{padding:14px 28px;font-size:17px;font-weight:800}",
    "button.tip{width:24px;height:24px;min-width:24px;padding:0;border-radius:50%;font-size:13px;font-weight:800;line-height:1;justify-content:center;background:var(--card);color:var(--blue);border:1.5px solid var(--blue);vertical-align:middle}button.tip[aria-expanded=true]{background:var(--blue);color:#fff}",
    ".helpbox{background:var(--bluebg);border:1px solid #b9d9f4;border-radius:12px;padding:10px 12px;margin:8px 0;font-size:14px;font-weight:400;line-height:1.5;color:var(--ink);text-transform:none;letter-spacing:0}.helpbox[hidden],.secbody[hidden]{display:none}",
    ".gd{margin-top:4px}.gd-sub{margin:0 0 12px}.gd-p{line-height:1.6;margin:12px 0}.gd-note{margin:14px 0}" +
    ".gd-toc{margin:6px 0 0;padding-left:22px;display:grid;gap:8px}.gd-toc li{line-height:1.4}.gd-toc .linkish{font-weight:700;margin-right:8px}" +
    ".linkish{background:none;border:0;padding:0;color:var(--brand);font:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:3px}" +
    ".gd-terms{margin:8px 0;display:grid;gap:0}.gd-terms>div{display:grid;grid-template-columns:minmax(120px,190px) 1fr;gap:14px;padding:11px 0;border-top:1px solid var(--line)}.gd-terms>div:first-child{border-top:0}" +
    ".gd-terms dt{font-weight:700}.gd-terms dd{margin:0;line-height:1.55;color:var(--ink)}" +
    ".gd-steps{list-style:none;margin:12px 0;padding:0;display:grid;gap:10px}.gd-steps li{display:flex;gap:12px;align-items:flex-start;background:var(--soft);border-radius:14px;padding:12px 14px}" +
    ".gd-steps i,.gd-flow i{flex:none;width:28px;height:28px;border-radius:50%;background:var(--brand);color:#fff;font-style:normal;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center}" +
    ".gd-steps b{display:block;margin-bottom:2px}.gd-steps span{line-height:1.55}" +
    ".gd-flow{list-style:none;margin:12px 0 16px;padding:0;display:flex;flex-wrap:wrap;gap:8px;align-items:center}.gd-flow li{display:flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:999px;padding:6px 14px 6px 6px;font-weight:700;font-size:14px;background:var(--card)}" +
    ".gd-flow li:last-child{background:var(--okbg);border-color:var(--okline)}" +
    ".gd-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px;margin:12px 0}.gd-box{border-radius:14px;padding:14px 16px;border:1px solid var(--line);background:var(--soft)}" +
    ".gd-box.ok{background:var(--okbg);border-color:var(--okline)}.gd-box.live{background:var(--okbg);border-color:var(--okline)}.gd-box.stage{background:var(--bluebg);border-color:#b9d9f4}" +
    ".gd-box ul{margin:6px 0 0;padding-left:18px;display:grid;gap:6px;line-height:1.5}",
    // AI chat and files (Step 2a)
    ".chat{display:flex;flex-direction:column;gap:10px;margin:12px 0}.msg{max-width:min(720px,92%);padding:12px 14px;border-radius:18px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.55}" +
    ".msg.user{align-self:flex-end;background:var(--pink);color:var(--ink);border-bottom-right-radius:6px}.msg.assistant{align-self:flex-start;background:var(--card);border:1px solid var(--line);border-bottom-left-radius:6px}" +
    ".msg .src{display:block;margin-top:6px;font-size:12px;color:var(--muted);white-space:normal}" +
    ".composer{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:12px;box-shadow:var(--shadow)}@media (min-width:900px){.composer{position:sticky;bottom:12px}}" +
    ".composer textarea{width:100%;min-height:84px;resize:vertical;display:block}" +
    "button.mic{background:var(--card);color:var(--brand);border-color:var(--brand)}button.mic.on{background:var(--bad);border-color:var(--bad);color:#fff}" +
    ".chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.chips span{background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:13px;display:inline-flex;gap:6px;align-items:center}" +
    ".chips button{padding:0 6px;border:0;background:transparent;color:var(--muted);font-size:15px}" +
    ".problem{border:1px solid #f3b8b3;background:#fdeceb;color:var(--ink);border-radius:14px;padding:12px 14px;margin:10px 0}" +
    ".pick{max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:6px 10px;margin:8px 0}.pick label{font-weight:400;display:flex;gap:8px;align-items:center}" +
    ".badge.held{background:#fff3d6;color:#7a5200;border-color:#e8c97a}.badge.ready{background:#e3f3ea;color:#21613d;border-color:#b6dcc5}.badge.off{background:transparent;color:var(--muted);border-color:var(--line);font-weight:600}",
    // Team roles in the firm profile: one aligned row per role, whatever the length of its name (UI review 2026-11-08)
    ".role-row{display:grid;grid-template-columns:22px minmax(0,230px) minmax(0,190px) minmax(0,1fr);gap:8px;align-items:center;margin:4px 0}.role-row .role-extra{display:flex;gap:8px;align-items:center;flex-wrap:wrap;min-width:0}.role-row select{width:100%}@media (max-width:640px){.role-row{grid-template-columns:22px 1fr}.role-row select,.role-row .role-extra{grid-column:2}}",
    // The plain-language Library (step 8b Part B): two columns of cards on a computer, one on a phone, same order inside
    ".lib-head>.grow{flex:1 1 260px}.lib-search{margin:14px 0 10px}.lib-find{width:100%;font-size:17px;padding:12px 14px;border-radius:12px}" +
    ".lib-filters{display:flex;flex-direction:column;gap:8px;margin-bottom:6px}.lib-group h2{font-size:18px;margin:20px 0 8px}" +
    ".lib-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.lib-card{margin:0;display:flex;flex-direction:column;border-radius:16px}" +
    ".lib-card .lib-title{margin:0 0 6px;font-size:17px;line-height:1.3;overflow-wrap:anywhere}.lib-card .lib-purpose{margin:0 0 10px;color:var(--muted);font-size:14px;line-height:1.45}" +
    ".lib-card>.row:last-child{margin-top:auto !important;padding-top:10px}.lib-help{margin-top:16px}" +
    "@media (max-width:640px){.lib-filters .pills{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}.lib-filters .pills>button{flex:0 0 auto}.lib-cards{grid-template-columns:1fr;gap:10px}.lib-card{padding:14px}.lib-head h1{font-size:24px}.lib-card .lib-title{font-size:16px}}",
    "@media (max-width:600px){h1{font-size:24px}.wrap{padding:12px}.card{padding:16px}.hero{padding:20px}.hero h2{font-size:26px}.brand span{font-size:11px;letter-spacing:.08em}.top{flex-wrap:nowrap;gap:6px;padding:10px 12px}.top .bell{padding:6px 10px;font-size:13px}.top .brand{flex:0 0 auto;gap:6px}.brand img{width:32px;height:32px}.top .badge{font-size:10px;padding:2px 6px;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis}.bell{padding:6px 10px}.gd-terms>div{grid-template-columns:1fr;gap:2px}}",
    // Step 15, the compact workspace (switch new_layout): everything here applies only while .dela has the class "nl".
    // Colors come from the same variables as the rest, so light and dark follow the Appearance choice.
    ".dela.nl{padding:0;font-size:15px;--shadow:none}.nl-frame{display:flex;min-height:70vh}.nl-side{display:none}.nl-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;padding-bottom:calc(84px + env(safe-area-inset-bottom))}" +
    ".dela.nl svg.ic{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}" +
    ".dela.nl .top{background:var(--card);color:var(--ink);border-bottom:1px solid var(--line);padding:0 8px 0 14px;min-height:52px;gap:6px;flex-wrap:nowrap}" +
    ".dela.nl .top .where{font-size:16px;font-weight:700;display:none}.dela.nl .top .brand span{color:var(--ink);font-size:13px;letter-spacing:.14em}.dela.nl .top .brand img{width:28px;height:28px}" +
    ".dela.nl .top .bell{background:transparent;border:1px solid transparent;color:var(--ink);border-radius:8px;min-width:44px;height:44px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:8px;position:relative;font-size:14px;font-weight:600}" +
    ".dela.nl .top .bell .lbl{display:none}.dela.nl .top .bell b{position:absolute;top:4px;right:2px;background:var(--brand);color:#fff}.dela.nl .avatar{background:var(--brand);flex:none}" +
    ".dela.nl .top .seg{border-color:var(--line)}.dela.nl .top .seg button{color:var(--ink)}.dela.nl .top .seg button[aria-pressed=true]{background:var(--pink);color:var(--pink-ink)}" +
    ".dela.nl .wrap{max-width:1120px;width:100%;margin:0;padding:14px 16px}.dela.nl h1{font-size:22px;margin:4px 0 10px}.dela.nl h2{font-size:17px;font-weight:700}" +
    ".dela.nl .card{border-radius:12px;padding:14px 16px;margin:12px 0;box-shadow:none}.dela.nl .soft{border-radius:10px}.dela.nl .notice{border-radius:10px}" +
    ".dela.nl button.blue,.dela.nl .btn.blue{background:var(--brand);border-color:var(--brand);color:var(--brand-ink)}" +
    ".dela.nl button.blue,.dela.nl button.ghost,.dela.nl .btn{border-radius:8px}.dela.nl button.ghost{border-color:var(--line)}.dela.nl button.ghost.danger{border-color:var(--bad)}" +
    ".dela.nl button:focus-visible,.dela.nl a:focus-visible,.dela.nl input:focus-visible,.dela.nl select:focus-visible,.dela.nl textarea:focus-visible{outline:2px solid var(--ink);outline-offset:2px}" +
    // The menu items, shared by the sidebar and the More sheet
    ".nl-item{display:flex;align-items:center;gap:12px;min-height:44px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:var(--muted);font:inherit;font-size:15px;font-weight:500;text-align:left;width:100%;position:relative;cursor:pointer}" +
    ".nl-item:hover{background:var(--soft);color:var(--ink)}.nl-item[aria-current=page]{background:var(--pink);color:var(--pink-ink);font-weight:700}" +
    ".nl-item[aria-current=page]::before{content:'';position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:3px;background:var(--pink-ink)}" +
    ".nl-item .cnt{margin-left:auto;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:var(--brand);color:#fff;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}" +
    ".nl-sep{height:1px;background:var(--line);margin:8px 6px;flex:none}.nl-grow{flex:1 1 auto}" +
    ".nl-brand{display:flex;align-items:center;gap:10px;padding:4px 8px 14px}.nl-brand img{width:32px;height:32px;border-radius:50%}.nl-brand b{font-size:15px;letter-spacing:.14em}" +
    // Phones: five labeled items at the bottom; the fifth opens the More sheet
    ".nl-bar{position:fixed;left:0;right:0;bottom:var(--lift,0px);display:grid;grid-template-columns:repeat(5,minmax(0,1fr));background:var(--card);border-top:1px solid var(--line);padding-bottom:env(safe-area-inset-bottom);z-index:6}" +
    ".nl-bar button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;height:64px;padding:0 2px;border:0;border-radius:0;background:transparent;color:var(--muted);font:inherit;font-size:12px;font-weight:500;position:relative;cursor:pointer;min-width:0}" +
    ".nl-bar button[aria-current=page],.nl-bar button[aria-expanded=true]{color:var(--pink-ink);font-weight:700}" +
    ".nl-bar button[aria-current=page]::before,.nl-bar button[aria-expanded=true]::before{content:'';position:absolute;top:0;left:22%;right:22%;height:3px;border-radius:0 0 3px 3px;background:var(--pink-ink)}" +
    "@media (max-width:340px){.nl-bar button{font-size:11px}.dela.nl .top .brand span{display:none}}" +
    ".dela.nl.kb .nl-bar{display:none}.dela.nl.kb .nl-main{padding-bottom:16px}" +
    ".nl-scrim{position:fixed;inset:0;background:rgba(12,14,20,.55);z-index:2147483000}.dela.nl.sheet .nl-bar{z-index:2147483002}" +
    ".nl-sheet{position:fixed;left:0;right:0;bottom:calc(64px + var(--lift,0px) + env(safe-area-inset-bottom));background:var(--card);border:1px solid var(--line);border-bottom:0;border-radius:16px 16px 0 0;padding:8px 12px 12px;z-index:2147483001;max-height:calc(100% - 150px);max-height:calc(100dvh - 130px - env(safe-area-inset-bottom));overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:2px}" +
    ".nl-sheet .nl-item{min-height:48px;color:var(--ink);font-size:16px}.nl-grab{width:36px;height:4px;border-radius:2px;background:var(--line);align-self:center;margin:4px 0 8px}" +
    ".nl-sheethead{display:flex;align-items:center;gap:8px;padding:0 0 6px 12px}.nl-sheethead b{font-size:16px;flex:1 1 auto}.nl-x{width:44px;height:44px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--ink);display:inline-flex;align-items:center;justify-content:center;padding:0;cursor:pointer}" +
    // Home in the compact workspace
    ".hcols{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-items:start}.hcols .card,.dela.nl .hcols .card{margin:0}.hstack{display:flex;flex-direction:column;gap:12px}" +
    ".hhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}.hhead h2{margin:0}.hgap{display:flex;flex-direction:column;gap:10px}" +
    ".hl{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:10px;overflow:hidden}" +
    ".hrow{display:flex;align-items:center;gap:12px;min-height:44px;padding:8px 14px;border:0;border-top:1px solid var(--line);border-radius:0;background:transparent;color:var(--ink);font:inherit;font-weight:400;text-align:left;width:100%;cursor:pointer}" +
    ".hrow:first-child{border-top:0}.hrow:hover{background:var(--soft)}div.hrow{cursor:default}div.hrow:hover{background:transparent}.hrow .what{flex:1 1 auto;min-width:0}.hrow .what b{display:block;font-weight:600}.hrow .sub,.hsub{font-size:13px;color:var(--muted)}" +
    ".hrow .act{color:var(--pink-ink);font-weight:600;font-size:14px;white-space:nowrap}.hrow svg.ic{color:var(--muted);width:18px;height:18px}" +
    ".hrow .badge{white-space:nowrap}@media (max-width:899px){.hrow{flex-wrap:wrap}.hrow .what{flex:1 1 0;min-width:55%}.hrow .badge{order:5}.hrow .act{order:6;flex-basis:100%}.hrow .act+svg.ic{order:4}.helig .hrow .sub{display:none}.helig .hrow{padding:6px 14px;gap:4px 12px}.helig .hrow .act{flex-basis:auto;margin-left:auto}}" +
    ".hdot{width:10px;height:10px;border-radius:50%;flex:none;border:2px solid var(--muted)}.hdot.done{border-color:var(--ok);background:var(--ok)}.hdot.warn{border-color:var(--warn)}" +
    ".badge.pink{background:var(--pink);color:var(--pink-ink);border-color:transparent}a.hrow{box-sizing:border-box}.hneed .hrow:nth-child(n+2){display:none}.hall .hneed .hrow{display:flex}.dela.nl .top .nl-seg{display:none}.dela.nl .linkish{min-height:0}.hmini{font-size:13px;font-weight:700;margin:2px 0 0}.hbar{height:6px;border-radius:3px;background:var(--soft);overflow:hidden}.hbar span{display:block;height:100%;border-radius:3px;background:var(--brand)}" +
    ".hacts{display:flex;align-items:center;gap:8px 16px;flex-wrap:wrap}.hacts .blue{flex:1 1 100%;justify-content:center;text-align:center}" +
    ".hstats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.hstat{display:block;text-align:left;background:var(--soft);border:1px solid transparent;border-radius:10px;padding:10px 12px;color:var(--ink);font:inherit;font-weight:400;cursor:pointer;width:100%}" +
    ".hstat:hover{border-color:var(--line)}.hstat b{display:block;font-size:20px;line-height:1.2}.hstat span{display:block;font-size:13px;color:var(--muted)}.hstat small{display:block;font-size:12px;color:var(--muted)}" +
    ".hstatus{display:flex;align-items:center;gap:6px 16px;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px}.hpart{display:inline-flex;align-items:center;gap:8px;font-size:14px}.hpart.warn{color:var(--warn);font-weight:600}" +
    ".hask{display:flex;align-items:center;gap:8px;border:1.5px solid var(--line);border-radius:10px;padding:4px 4px 4px 12px;background:var(--card)}.hask input{flex:1 1 auto;min-width:0;border:0;outline:0;background:transparent;color:var(--ink);font:inherit;font-size:16px;height:40px;padding:0;margin:0}" +
    ".hask:focus-within{border-color:var(--pink-ink)}.hask .send{width:40px;height:40px;min-height:0;border-radius:8px;border:0;background:var(--brand);color:#fff;display:inline-flex;align-items:center;justify-content:center;padding:0;flex:none}" +
    ".hanswer{background:var(--soft);border-radius:10px;padding:10px 12px;font-size:15px;max-height:220px;overflow-y:auto}.hline{display:flex;align-items:center;gap:8px 10px;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px}" +
    "@media (prefers-reduced-motion:reduce){.dela.nl *{transition:none !important;animation:none !important}}" +
    ".oktxt{color:var(--ok);font-weight:700}" +
    // Account and security: a label and its explanation on the left, its actions on the right; stacked on a phone
    ".acct-row{display:flex;gap:10px 16px;align-items:flex-start;flex-wrap:wrap;padding:12px 0;border-top:1px solid var(--line)}.acct-what{flex:1 1 280px;min-width:0;display:flex;flex-direction:column;gap:3px}" +
    ".acct-val{font-size:16px;overflow-wrap:anywhere}.acct-acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.acct .btn{text-decoration:none}.dela .acct a.btn.ghost{background:transparent;color:var(--pink-ink);border:1px solid var(--line)}@media (max-width:600px){.acct-acts{flex:1 1 100%}.acct-acts .btn{flex:1 1 auto;text-align:center;min-height:44px;display:inline-flex;align-items:center;justify-content:center}}" +
    ".dela .top.atop{flex-wrap:wrap;row-gap:6px}@media (max-width:600px){.dela .top.atop .grow{flex-basis:100%;height:0}.dela .top.atop>.small{flex:1 1 100%}}" +
    ".hrow svg.ic{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none;color:var(--muted)}" +
    ".hacts.hsteps .blue,.hacts.hsteps .ghost{flex:0 1 auto;text-align:left}.hsuggest{color:var(--ink);font-size:14px}" +
    // Card headings sit on their own tinted band, edge to edge, so a heading is easy to tell from the content under it
    // (Stacey 2026-11-13). The band is the card's first heading, or the first row that holds it.
    ".dela.nl .card>h2:first-child,.dela.nl .card>.hhead:first-child,.dela.nl .card>.row:first-child:has(>h2),.dela.nl .card>.row:first-child:has(>h3){margin:-14px -16px 12px;padding:10px 16px;background:var(--head);border-bottom:1px solid var(--line);border-radius:11px 11px 0 0}" +
    ".dela.nl .card>.hhead:first-child h2,.dela.nl .card>.row:first-child:has(>h2) h2{margin:0}.dela{--head:var(--pink)}" +
    "@media (min-width:900px){.dela.nl .card>h2:first-child,.dela.nl .card>.hhead:first-child,.dela.nl .card>.row:first-child:has(>h2),.dela.nl .card>.row:first-child:has(>h3){margin:-18px -20px 14px;padding:11px 20px}}" +
    // The admin area in the compact workspace: groups in the sidebar, the account button, the "Menu" sheet on a phone
    ".aside-slot{display:none}.anav .nl-items{display:flex;flex-direction:column;gap:2px}.anav .nl-items[hidden]{display:none}.anav .nl-item{min-height:40px}" +
    ".nl-group{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:40px;margin-top:6px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:var(--ink);font:inherit;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;text-align:left}" +
    ".nl-group:hover{background:var(--soft)}.nl-group svg.ic{width:16px;height:16px;color:var(--muted)}.dela.nl .top .amenu,.dela.nl .top .acctbtn{color:var(--ink);border:1px solid var(--line);background:transparent;border-radius:8px;font-weight:600}.dela.nl .menu a{color:var(--ink);text-decoration:none}.dela.nl .top .amenu{min-height:40px}.dela.nl .top .acctbtn{min-height:40px;max-width:60vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".nl-sheet.full{bottom:0;max-height:88%;max-height:88dvh;padding-bottom:calc(12px + env(safe-area-inset-bottom))}.dela.nl .wrap.awide{max-width:none}.dela.nl .top{position:relative}" +
    "@media (min-width:900px){.aside-slot{display:block;flex:none;align-self:flex-start;position:sticky;top:var(--dela-top,0px)}.aside-slot .nl-side{position:static}.dela.nl .top .amenu{display:none}.nl-side.anav.mini .nl-brand b{display:none}}" +
    // The holder for a trapped phone bar: no size or color of its own
    ".dela.docked{min-height:0;padding:0;background:transparent}" +
    // While More is open it is the one marked item; the page's own item goes quiet until the sheet closes
    ".dela.nl.sheet .nl-bar button[aria-current=page]:not([aria-expanded=true]){color:var(--muted);font-weight:500}.dela.nl.sheet .nl-bar button[aria-current=page]:not([aria-expanded=true])::before{display:none}" +
    // One input surface for Ask DELA in both themes: the box draws the edge, the field inside has none
    ".dela .hask input,.dela .hask input:focus{border:0 !important;background:transparent !important;box-shadow:none !important;outline:0 !important}" +
    // Desktop: the sidebar replaces the bottom bar
    "@media (min-width:900px){.nl-side{display:flex;flex-direction:column;gap:2px;width:232px;flex:none;position:sticky;top:var(--dela-top,0px);align-self:flex-start;height:calc(100vh - var(--dela-top,0px));overflow-y:auto;background:var(--card);border-right:1px solid var(--line);padding:12px 10px;box-sizing:border-box}" +
    ".nl-side .nl-item{min-height:40px}.nl-side.mini{width:64px;align-items:center;overflow:visible}.nl-side.mini .nl-item{width:44px;padding:0;justify-content:center}.nl-side.mini .lbl,.nl-side.mini .cnt,.nl-side.mini .nl-brand b,.nl-side.mini .nl-brand .badge{display:none}.nl-side.mini .nl-brand{padding:4px 0 14px}" +
    ".nl-side.mini .nl-item:hover::after,.nl-side.mini .nl-item:focus-visible::after{content:attr(data-tip);position:absolute;left:54px;top:50%;transform:translateY(-50%);background:var(--ink);color:var(--card);font-size:13px;font-weight:600;padding:6px 10px;border-radius:6px;white-space:nowrap;z-index:20}" +
    ".nl-side.mini .nl-fold{border:1px solid var(--line)}.nl-bar{display:none}.nl-main{padding-bottom:40px}.dela.nl .top{min-height:56px;padding:0 24px;gap:10px}.dela.nl .top .where{display:block}.dela.nl .top .brand{display:none}" +
    ".dela.nl .top .bell{border-color:var(--line);height:38px}.dela.nl .top .bell .lbl{display:inline}.dela.nl .top .bell.icon{border-color:transparent}.dela.nl .top .bell b{top:-6px;right:-6px}.dela.nl .top .bell.icon b{top:2px;right:2px}" +
    ".dela.nl .wrap{padding:22px 28px}.dela.nl h1{font-size:24px;margin:2px 0 14px}.dela.nl .card{padding:18px 20px;margin:16px 0}.hcols{grid-template-columns:minmax(0,1fr) 320px;gap:20px}.hcols.capped{grid-template-columns:minmax(0,760px) 320px}.hstack{gap:20px}" +
    ".hneed .hrow:nth-child(-n+3){display:flex}.dela.nl .top .nl-seg{display:inline-flex}.hstats{grid-template-columns:repeat(4,minmax(0,1fr))}.hacts .blue{flex:none}.hask input{font-size:15px;height:36px}.hask .send{width:36px;height:36px}}",
  ].join("");

  // Inter for DELA. Fonts must load at the page level to reach inside the shadow root.
  if (!document.getElementById("dela-font")) {
    var l = document.createElement("link");
    l.id = "dela-font";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
    document.head.appendChild(l);
  }

  // Files that ship with this code version (logo and so on)
  // The widget found website logins for two different members saved in this browser (see DELA-App.php).
  // Returns the member IDs it saw, or null when there is no conflict.
  D.loginConflict = function (root) {
    var parts = String(root.getAttribute("data-why") || "").split(",");
    if (parts.indexOf("cookie_conflict") < 0) return null;
    var ids = parts.filter(function (p) { return p.indexOf("uids_") === 0; })[0];
    return ids ? ids.slice(5).split("_") : [];
  };
  // The site's own name in the help text, so it stays right when the address changes (lawfecta.co since 2026-11-11)
  var SITE_HOST = (typeof location !== "undefined" && location.hostname ? location.hostname : "this website").split("www.").join("");
  D.LOGIN_CONFLICT_TEXT = [
    "This browser has more than one website login saved, so DELA cannot tell which account is yours and does not sign anyone in.",
    "To fix it: 1. Log out of the website. 2. Clear this website's cookies: in Chrome, click the icon left of the web address, then Cookies and site data, then Manage on-device site data, and delete every " + SITE_HOST + " entry. In Safari or Firefox, open Settings, then Privacy, and remove the data for " + SITE_HOST + ". 3. Log in again with your own account and reload this page.",
    "Tip: test accounts are easiest in a private window, so your own login stays separate.",
  ];
  D.asset = function (root, rel) { return (root.getAttribute("data-base") || "") + "/" + rel; };
  // The Lawfecta logo (Stacey 2026-11-09: the round mark everywhere the name shows). Also sets the browser tab icon
  // when the page has none of its own, so BD's site-wide icon is never replaced.
  D.logo = function (root, size) {
    if (!document.querySelector("link[rel~='icon']")) {
      var l = document.createElement("link"); l.rel = "icon"; l.type = "image/png"; l.href = D.asset(root, "brand/lawfecta-mark-192.png");
      document.head.appendChild(l);
    }
    var img = document.createElement("img");
    img.src = D.asset(root, "brand/lawfecta-mark-192.png"); img.alt = "Lawfecta"; img.className = "logo";
    if (size) { img.width = size; img.height = size; }
    return img;
  };
})();
