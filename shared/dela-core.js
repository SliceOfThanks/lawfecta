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

  // ---------- One help tip for the member app and the admin (step 39, docs/briefs/step-39-help-tips.md) ----------
  // A small "?" beside a heading or label. Its tip is a small white box that floats by the icon and never moves the
  // page. With a mouse it opens when the pointer is on the icon and stays while the pointer is on the tip; a click
  // keeps it open. With the keyboard it opens on focus, and Enter or Space keeps it open. On a touch screen a tap
  // opens it. It closes with Escape, a click or tap anywhere else, the icon again, or its "×". One tip is open at a
  // time. The tip is tied to the button with aria-controls and aria-describedby. Money, privacy and legal text always
  // stays on the page; a tip only explains a word or a feature.
  var tipN = 0, tipNow = null;
  D.helpTip = function (text, label, onToggle, startOpen, title) {
    if (!text) return [null, null];
    var id = "dela-tip-" + (++tipN), pinned = false, timer = null, on = false;
    var x = D.h("button", { class: "tip-x", type: "button", tabindex: "-1", "aria-hidden": "true" }, "×");
    var box = D.h("div", { class: "tipbox", role: "tooltip", id: id, hidden: true }, x, title ? D.h("b", { class: "tip-h", text: title }) : null, typeof text === "string" ? D.h("span", { class: "tip-t", text: text }) : text);
    var btn = D.h("button", { class: "help-q", type: "button", "aria-label": label || "What does this mean?", "aria-expanded": "false", "aria-controls": id, "aria-describedby": id }, "?");
    // Where the tip may be drawn: the window, or the side panel or pop-up window the icon sits in
    function bounds() {
      var r = { left: 0, top: 0, right: document.documentElement.clientWidth || window.innerWidth, bottom: window.innerHeight };
      for (var n = btn.parentNode; n && n.nodeType === 1; n = n.parentNode) {
        var st = window.getComputedStyle(n);
        if (st.transform && st.transform !== "none") { var q = n.getBoundingClientRect(); return { left: Math.max(r.left, q.left), top: Math.max(r.top, q.top), right: Math.min(r.right, q.right), bottom: Math.min(r.bottom, q.bottom) }; }
      }
      return r;
    }
    function place() {
      if (box.hidden) return;
      if (!btn.isConnected || !box.isConnected) { set(false); return; }
      box.style.left = "0px"; box.style.top = "0px";
      var r = btn.getBoundingClientRect(), t = box.getBoundingClientRect(), lim = bounds();
      var left = Math.max(lim.left + 8, Math.min(r.left - 10, lim.right - 8 - t.width));
      var under = r.bottom + 6, over = r.top - 6 - t.height;
      var top = under + t.height > lim.bottom - 8 && over >= lim.top + 8 ? over : under;
      // t.left and t.top say where "0, 0" really is: inside a pop-up window it is that window's corner
      box.style.left = Math.round(left - t.left) + "px"; box.style.top = Math.round(top - t.top) + "px";
    }
    function away(e) { var p = e.composedPath ? e.composedPath() : [e.target]; if (p.indexOf(btn) < 0 && p.indexOf(box) < 0) set(false); }
    function esc(e) { if (e.key === "Escape" && !box.hidden) { e.stopPropagation(); set(false); } }
    function listen(yes) {
      if (yes === on) return;
      on = yes;
      var f = yes ? "addEventListener" : "removeEventListener", root = btn.getRootNode ? btn.getRootNode() : document;
      document[f]("pointerdown", away, true);
      document[f]("keydown", esc, true);
      window[f]("scroll", place, true);
      window[f]("resize", place);
      if (root !== document) root[f]("scroll", place, true);
    }
    function set(open, pin) {
      clearTimeout(timer);
      pinned = !!open && !!pin;
      if (box.hidden === !open) return;
      if (open && tipNow && tipNow !== set) tipNow(false);
      box.hidden = !open; btn.setAttribute("aria-expanded", String(!!open));
      if (open) { tipNow = set; listen(true); place(); } else { if (tipNow === set) tipNow = null; listen(false); }
      if (onToggle) onToggle(!!open);
    }
    function later() { clearTimeout(timer); if (!pinned) timer = setTimeout(function () { if (!pinned) set(false); }, 200); }
    var fine = false;
    try { fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (e) { fine = false; }
    if (fine) {
      btn.addEventListener("mouseenter", function () { clearTimeout(timer); if (box.hidden) set(true, false); });
      btn.addEventListener("mouseleave", later);
      box.addEventListener("mouseenter", function () { clearTimeout(timer); });
      box.addEventListener("mouseleave", later);
    }
    btn.addEventListener("focus", function () { var kb = false; try { kb = btn.matches(":focus-visible"); } catch (e) { kb = false; } if (kb && box.hidden) set(true, false); });
    btn.addEventListener("blur", function () { if (!pinned) later(); });
    btn.addEventListener("click", function (e) { e.stopPropagation(); if (!box.hidden && pinned) set(false); else set(true, true); });
    box.addEventListener("click", function (e) { e.stopPropagation(); });
    x.addEventListener("click", function () { set(false); });
    if (startOpen) setTimeout(function () { if (btn.isConnected) set(true, true); }, 0);
    return [btn, box];
  };
  // Words members meet on many screens, each checked against what DELA really does (2026-11-06)
  D.HELP = {
    verified: "The Lawfecta Team checked this person: an attorney's bar license, or a freelancer's identity and LinkedIn profile. It does not rate the quality of their work.",
    match_ready: "A freelancer is match-ready when three things are true: every required profile item is filled, the Lawfecta Team's check has passed, and they confirmed in the last 14 days that they can take work. Only match-ready freelancers show in Talent and gig matches. Match-ready does not guarantee qualifications, fit or availability for a particular project.",
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
    var t = D.helpTip(D.HELP[key], "What does " + (m ? m[1] : label).toLowerCase() + " mean?", null, false, m ? null : label);
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
      bookmarks_off: "Bookmarks are not turned on.", not_bookmarked: "Bookmark this freelancer first. Then you can add tags and a note.", bookmarks_unreachable: "The Lawfecta website's bookmarks could not be reached just now. Try again in a minute.", bookmarks_not_allowed: "The Lawfecta website did not let DELA use its bookmarks. The Lawfecta Team has been asked to allow it.",
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
      ai_busy: "DELA's AI could not start this time. No DELA action was used. Please try again.",
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
      not_an_image: "That file is not a PNG or JPG photo.", too_many_images: "A profile can show only a few pictures in its text. Take one out and save again.",
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
// The information notice that can be dismissed (Stacey's mockup of 2026-11-17). key names the notice; a dismissal is
// remembered in this browser until the words change. After dismissal a small link stays in its place and brings the
// notice back, so the guidance is always reachable. Dismissing changes nothing about what DELA checks or refuses.
D.infoNotice = function (text, key) {
  var h = D.h, k = "dela.notice." + key, mark = String(text.length) + ":" + text.slice(0, 24) + text.slice(-24);
  var gone = false;
  try { gone = localStorage.getItem(k) === mark; } catch (e) { gone = false; }
  var wrap = h("div", { class: "notice-wrap", "data-notice": key });
  function show(focus) {
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    if (gone) {
      var back = h("button", { type: "button", class: "notice-back" }, "Show the sensitive data notice");
      back.addEventListener("click", function () { gone = false; try { localStorage.removeItem(k); } catch (e) { /* storage is off */ } show("x"); });
      wrap.appendChild(back);
      if (focus) back.focus();
      return;
    }
    var x = h("button", { type: "button", class: "notice-x", "aria-label": "Dismiss notice" }, h("span", { "aria-hidden": "true", text: "×" }));
    x.addEventListener("click", function () { gone = true; try { localStorage.setItem(k, mark); } catch (e) { /* storage is off: it comes back on the next page */ } show(true); });
    wrap.appendChild(h("div", { class: "notice info", role: "note" }, h("span", { class: "notice-i", "aria-hidden": "true", text: "i" }), h("div", { class: "notice-words", text: text }), x));
    if (focus === "x") x.focus();
  }
  show(false);
  return wrap;
};
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
    ".dela{--bg:#f5f5f7;--card:#ffffff;--ink:#0b1220;--muted:#475569;--line:#dce3ea;--head:#e2e4e8;--sel:#e8ecf2;--brand:#8b2146;--brand-ink:#ffffff;--blue:#0b6fbd;--pink:#fbeef2;--pink-ink:#8b2146;",
    "--navy:#1d2030;--hero:linear-gradient(135deg,#1d2030 0%,#3a1a33 45%,#8b2146 100%);--hot:linear-gradient(120deg,#3a1238 0%,#8b2146 55%,#d23b62 100%);",
    "--ok:#2f7a4f;--warn:#a46a00;--bad:#b3261e;--soft:#f1f2f6;--shadow:0 10px 30px rgba(139,33,70,.10);--okbg:#e3f3ea;--okline:#b6dcc5;--bluebg:#eef6fd;",
    "font-family:Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:var(--ink);background:var(--bg);min-height:60vh;padding:0 0 88px;box-sizing:border-box;-webkit-font-smoothing:antialiased}",
    // Dark colors (UX review Phase 4 part D): on when the person chose Dark (data-theme=dark), or when they chose Match my
    // device and the device is dark (data-theme=auto). Light (data-theme=light) never turns dark.
    D.darkCss(".dela{--dw-hero:linear-gradient(180deg,#14263a 0%,#172c42 100%);--dw-hill:#173a45;--dw-teal:#4fd1c0;--dw-paper:#232838;--dw-artline:#475066;--dw-ico-bg:#2f1926;--dw-ico:#f19ab8;--dw-brand:#f19ab8;--dw-brand-d:#f6b3ca;--dw-b:#14263a;--dw-b-line:#254463;--dw-b-ic:#8cc4ff;--dw-t:#12302c;--dw-t-line:#1f4d46;--dw-t-ic:#6fdccc;--dw-p:#33261a;--dw-p-line:#56402a;--dw-p-ic:#f3b27a;--dw-ctx-ic:#8cc4ff;--dw-lock:#1c2130;--dw-lock-ic:#8cc4ff;--dw-sub:#c5cad6}.dw-wrap .dw-first button.dw-send,.dw-wrap .dw-2 button.dw-send{color:#1a0b12}.dw-wrap .dw-first .dw-send .ic,.dw-wrap .dw-2 .dw-send .ic{color:#1a0b12}.dw-menu{box-shadow:0 12px 32px rgba(0,0,0,.5)}.dw-wrap .dw-lock,.dw-wrap .dw-lock span{color:#eceef3}.dela{--dw-me:#1b3350;--dw-ok:#143024;--dw-ok-line:#215238;--dw-ok-ic:#2fb872;--dw-keep:#33261a;--dw-keep-line:#56402a;--dw-keep-ic:#f3b27a;--dw-src:#14263a;--dw-next:#33261a;--dw-next-line:#56402a;--dw-next-ic:#f3b27a;--dw-chip:#232838}.dw-num{color:#8fe0b4}.dw-head-acts button.dw-newchat.blue,.dw-wrap .dw-ans .dw-ans-acts>button.blue{color:#1a0b12}.dw-usage{border-left-color:#3a4a60}.dw-modal-back{background:rgba(0,0,0,.6)}.dela .dw-off[disabled]{color:#c5cad6;background:#262b39;border-color:#3a3f50}.dela .dw-wrap input,.dela .dw-wrap select,.dela .dw-wrap textarea,.dela .bm-edit input,.dela .bm-edit textarea,.dela .bm-f select{border-color:#7f8aa0}.dw-warn{background:#3a2f12;color:#f0c668;border-color:#5c4a1c}.dw-review{background:#3a2f12;color:#f0c668;border-color:#5c4a1c}.badge.dw-blue{background:#132233;color:#9cc9f0;border-color:#2c4a66}.dw-note{border-color:#2c4a66}.dela{--bg:#11131b;--card:#1a1d28;--ink:#eceef3;--muted:#a7adbb;--line:#2a2e3c;--head:#2b303c;--sel:#262b39;--brand:#c2416f;--pink:#2a1622;--pink-ink:#f19ab8;--soft:#222634;--shadow:none;--okbg:#17301f;--okline:#2b5a3b;--bluebg:#132233}.nl-side,.nl-bar,.nl-sheet{--ink:#eceef3;--muted:#a7adbb;--line:#2a2e3c}" +
      ".notice-tag{background:#132233;color:#8cc4ff}.notice-tag.action{background:#3a1d1b;color:#f5b3ad}.notice-tag.payments{background:#17301f;color:#7fd3a3}.notice-tag.disputes{background:#3a2f12;color:#f0c668}.notice-dot.on{background:#8cc4ff}" +
      "details.dmenu>summary.btn{color:#f19ab8}" +
      ".tp,.pf{--tp-band:linear-gradient(100deg,#132233 0%,#1a2f47 55%,#132233 100%);--tp-tint:#2f1926;--tp-tag:#3b2130;--tp-rule:#3a2a33}.dela .pf-head #prof-live{background:transparent;color:#eceef3}.pf-ready .badge.ready{color:#7fd3a3}.dela .tp-own-b.ghost{background:transparent;color:#eceef3}.dela .tp-photo{box-shadow:0 0 0 4px #1a1d28}.tp-meta>span{border-left-color:#2c4a66}" +
      ".inbox-kind.intro{background:#132233;color:#8cc4ff}.inbox-dot.on{background:#8cc4ff}" +
      ".notice{background:#132233;border-color:#2b4a66;color:#eceef3;box-shadow:none}.notice-i{border-color:#8cc4ff;color:#8cc4ff}.notice-x{color:#eceef3}.notice-back{color:#8cc4ff}" +
      ".problem{background:#3a1d1b;border-color:#6b2c27}.notice.bad{background:#3a1d1b;border-color:#e0685f}.notice.ok{background:#17301f;border-color:#4fa873}.talent-ver{color:#7fd3a3}" +
      ".msg.mine,.flow,.helpbox{border-color:#2b4a66}button.ai-btn{background:#2a1f33;color:#e6cdf2;border-color:#9a6bb0}.badge.ai-label{background:#2a1f33;color:#e6cdf2;border-color:#9a6bb0}" +
      ".oktxt{color:#7fd3a3}" +
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
      ".guide-msg{background:var(--sel);color:var(--ink);border-radius:4px 14px 14px 14px;padding:10px 14px;margin:10px 0 8px;max-width:680px}.guide-msg p{margin:0}" +
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
    // Stacey's notice mockup of 2026-11-17: an information notice is pale blue with an even border, no stripe at the
    // left, and a soft shadow. Problems (.bad) and confirmations (.ok) keep their own colors and their stripe: they are
    // a different kind of message and are not recolored.
    ".notice{background:#eaf4ff;border:1px solid #b8d8f8;color:#172b4d;padding:14px 16px;border-radius:12px;margin:12px 0;font-size:15px;line-height:1.55;box-shadow:0 2px 8px rgba(11,18,32,.08)}",
    ".notice.bad,.notice.ok{border:0;border-left:4px solid var(--bad);color:var(--ink);box-shadow:none;padding:12px 14px;font-size:14px;line-height:1.5}" +
    // The dismissible form (D.infoNotice): icon, words, and an X at the top right that never sits over the words
    ".notice.info{display:flex;gap:14px;align-items:flex-start;padding:14px 6px 14px 16px}.notice-i{flex:0 0 auto;width:24px;height:24px;margin-top:1px;border:2px solid #0d83dd;color:#0d83dd;border-radius:50%;font-weight:700;font-size:14px;line-height:20px;text-align:center;font-style:normal}" +
    ".notice-words{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}.dela .notice-x{flex:0 0 auto;width:44px;height:44px;min-height:44px;margin:-8px 0 -8px 0;padding:0;background:transparent;border:0;color:#172b4d;font-size:24px;line-height:1;border-radius:10px;cursor:pointer;justify-content:center}" +
    ".dela .notice-x:hover{background:rgba(13,131,221,.12)}.dela .notice-x:focus-visible{outline:2px solid #0d83dd;outline-offset:2px}.dela .notice-back{background:transparent;border:0;padding:6px 2px;min-height:0;color:var(--blue);font-weight:600;text-decoration:underline;cursor:pointer;font-size:13px}" +
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
    ".dela .help-q:focus-visible{outline:2px solid var(--blue);outline-offset:3px}" +
    // The help tip (step 39): a small icon whose click and tap area is larger than the picture, and a small white box that floats
    ".dela .help-q{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;box-sizing:border-box;width:18px;height:18px;min-width:18px;min-height:0;margin:0;padding:0;border-radius:50%;border:1.5px solid var(--muted);background:transparent;color:var(--muted);font-size:11px;font-weight:700;line-height:1;text-decoration:none;box-shadow:none;cursor:pointer;vertical-align:middle}" +
    ".dela .help-q:before{content:'';position:absolute;inset:-5px;border-radius:50%}@media (pointer:coarse){.dela .help-q:before{inset:-13px}}.dela .help-q:hover,.dela .help-q[aria-expanded=true]{color:var(--ink);border-color:var(--ink);background:transparent}" +
    ".tipbox{position:fixed;left:0;top:0;z-index:40;box-sizing:border-box;width:max-content;max-width:min(300px,calc(100vw - 16px));margin:0;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 32px 10px 12px;box-shadow:0 4px 14px rgba(11,18,32,.1);font-size:14px;font-weight:400;font-style:normal;line-height:1.45;color:var(--ink);text-align:left;text-transform:none;letter-spacing:0;white-space:normal;overflow-wrap:anywhere}.tipbox[hidden]{display:none}" +
    ".tip-h{display:block;margin:0 0 3px;font-weight:700}.tip-t{display:block}.dela .tip-x{position:absolute;top:4px;right:4px;width:24px;height:24px;min-width:0;min-height:0;padding:0;border:0;border-radius:6px;background:transparent;color:var(--muted);font-size:18px;font-weight:400;line-height:1;box-shadow:none;cursor:pointer}.dela .tip-x:hover{color:var(--ink);background:var(--sel)}",
    "button,.btn{font:inherit;font-weight:700;border-radius:999px;border:1.5px solid var(--brand);background:var(--brand);color:var(--brand-ink);padding:10px 20px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;line-height:1.2}",
    "button.blue,.btn.blue{background:var(--blue);border-color:var(--blue);color:#fff}",
    "button.ghost{background:transparent;color:var(--brand)}button.danger{background:var(--bad);border-color:var(--bad);color:#fff}button.small,.btn.small{padding:6px 14px;font-size:14px}",
    ".top button.ghost,.top .btn.ghost{color:#fff;border-color:rgba(255,255,255,.45)}",
    "button:disabled{opacity:.55;cursor:not-allowed}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--blue);outline-offset:2px}",
    "input,select,textarea{font:inherit;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:12px;padding:9px 12px;max-width:100%}",
    "label{display:block;font-size:14px;font-weight:700;margin:10px 0 4px}",
    ".row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}",
    ".seg{display:inline-flex;border:1px solid rgba(255,255,255,.35);border-radius:999px;overflow:hidden}.seg button{border:0;border-radius:999px;background:transparent;color:#fff;font-weight:700;padding:6px 14px;font-size:14px}.seg button[aria-pressed=true]{background:#fff;color:var(--brand)}",
    ".sub-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin:12px 0}.sub-plan{border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:6px;background:var(--card)}.sub-plan.current{border:2px solid var(--pink-ink);background:var(--sel)}.sub-mine{align-self:flex-start}.sub-price{font-size:17px;font-weight:700;margin:0}.sub-feats{margin:6px 0;padding-left:18px;font-size:13px;flex:1 1 auto}.sub-feats li{margin:2px 0}.sub-plan .btn{align-self:flex-start;margin-top:auto}.limit-banner{background:#fff7d6;border-color:#e6c84f;color:#3d2f00}.dela .sub-plan a.btn.ghost{background:transparent;color:var(--pink-ink);border:1px solid var(--pink-ink)}",
    // Step 17: category search (suggestions under the box), the three lists, the category line on a result, the profile picker
    ".cat-search{position:relative}.cat-suggest{position:absolute;left:0;right:0;top:100%;z-index:30;margin:4px 0 0;padding:4px;list-style:none;background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);max-height:320px;overflow:auto}" +
    ".cat-suggest li{padding:8px 10px;border-radius:8px;cursor:pointer;line-height:1.35}.cat-suggest li:hover,.cat-suggest li[aria-selected=true]{background:var(--sel)}" +
    ".talent-cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 12px}.talent-cats select{width:100%}.cat-line{color:var(--pink-ink);font-weight:600;margin:2px 0}" +
    // Step 18: Talent results in the mockup layout (photo or initial, who, about, then the two actions with the gig to invite for)
    ".talent-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:16px 0 8px}.talent-sort select{margin-left:6px}.talent-help{margin:12px 0;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:var(--sel)}.talent-help summary{cursor:pointer}" +
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
    "@media (max-width:700px){.dela #home-live-profile{display:none}}.pf-head{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}.pf-head .grow{flex:1 1 300px}.pf-ready{display:flex;gap:8px 14px;align-items:center;flex-wrap:wrap;background:var(--soft);border-radius:12px;padding:10px 14px;margin:12px 0 14px}.pf-ready .pf-states{flex:1 1 280px;color:var(--muted);font-size:14px}.pf-tabs{display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--line);margin:0 0 14px}.dela .pf-tabs button{background:transparent;border:0;border-bottom:3px solid transparent;border-radius:8px 8px 0 0;padding:10px 18px;min-height:44px;color:var(--muted);font-weight:600}.dela .pf-tabs button[aria-selected=true]{color:var(--pink-ink);border-bottom-color:var(--pink-ink);background:var(--sel)}.pf-grid{display:grid;grid-template-columns:220px minmax(0,1fr) 280px;gap:16px;align-items:start;margin:0 0 16px}.pf-grid>.card,.dela.nl .pf-grid>.card,.pf-rail>.card,.dela.nl .pf-rail>.card{margin:0}.pf-rail{display:flex;flex-direction:column;gap:12px}@media (max-width:1150px){.pf-grid{grid-template-columns:200px minmax(0,1fr)}.pf-rail{grid-column:1 / -1}}@media (max-width:800px){.pf-grid{grid-template-columns:minmax(0,1fr)}}.pf-nav-h{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:700;margin:0 0 6px}.dela .pf-nav button{display:block;width:100%;text-align:left;background:transparent;border:0;border-radius:8px;padding:10px 12px;min-height:44px;color:var(--ink);font-weight:500}.dela .pf-nav button[aria-current=true]{background:var(--sel);color:var(--pink-ink);font-weight:700}.pf-sec-h{gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 8px}.pf-sec-h h2{margin:0}.pf-sec-h h2:focus{outline:none}.pf-foot{border-top:1px solid var(--line);margin-top:14px;padding-top:12px}.pf-all .pf-sec+.pf-sec{border-top:1px solid var(--line);margin-top:14px;padding-top:14px}.pf-all .pf-panel+.pf-panel{margin-top:16px}.tp-ownbar{display:flex;gap:10px 12px;align-items:center;flex-wrap:wrap;background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:0 0 12px}.tp-ownbar .grow{flex:1 1 280px}.dela .tp-ownbar button{min-height:40px}.tp-headline{margin:2px 0 8px;font-size:17px}.tp-meta{display:flex;flex-wrap:wrap;gap:6px 0;font-size:14px;align-items:center}.tp-meta>span{padding:0 12px;border-left:1px solid var(--line)}.tp-meta>span:first-child{padding-left:0;border-left:0}.tp-meta .tp-check{font-weight:700;border-right:0}.tp-rows .tp-row{display:grid;grid-template-columns:140px minmax(0,1fr);gap:8px 14px;align-items:start;padding:10px 0;border-top:1px solid var(--line)}.tp-rows .tp-row:first-child{border-top:0;padding-top:0}.tp-rows .tp-row:last-child{padding-bottom:0}.tp-row-k{margin:4px 0 0;font-size:15px}@media (max-width:600px){.tp-rows .tp-row{grid-template-columns:minmax(0,1fr)}}.tp-svc{display:flex;gap:10px 16px;align-items:center;flex-wrap:wrap;border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:8px 0}.tp-svc .grow{flex:1 1 220px;min-width:0}.tp-svc-p{display:flex;flex-direction:column;align-items:flex-start;min-width:110px}.tp-timeline{list-style:none;margin:0;padding:0 0 0 22px;border-left:2px solid var(--pink-ink)}.tp-timeline li{position:relative;margin:0 0 14px}.tp-timeline li:last-child{margin-bottom:0}.tp-timeline li:before{content:'';position:absolute;left:-29px;top:6px;width:12px;height:12px;border-radius:50%;background:var(--pink-ink)}.tp-timeline b{display:block;font-size:16px}.tp-tl-sub{display:block;color:var(--muted)}.dela .card.tp-empty{border-style:dashed;display:flex;gap:10px 14px;align-items:center;flex-wrap:wrap}.tp-empty h2{margin:0}.tp-empty>div{display:flex;gap:8px 12px;align-items:center;flex-wrap:wrap}.dela .tp-empty .tp-edit{margin-top:0}.tp-blank,.tp-blank-acts{text-align:center}.tp-blank{padding:14px 0 0}.tp-rev-d summary{cursor:pointer;margin:0 0 8px}.tp-rev-one{margin:0 0 10px}.tp,.pf{--tp-band:linear-gradient(100deg,#eef6fd 0%,#dcecfa 55%,#f2f8fe 100%);--tp-tint:#f8e6ee;--tp-tag:#f6dce7;--tp-rule:#ecd3de}.dela .tp-ownbar{background:var(--tp-tint);border:0;border-radius:12px;padding:12px 16px}.tp-own-h{margin:0;font-size:18px;color:var(--pink-ink);display:flex;gap:8px;align-items:center}.tp-own-h svg.ic{width:20px;height:20px}.dela .tp-own-b{display:inline-flex;gap:8px;align-items:center;min-height:42px;padding:8px 16px;font-size:15px}.dela .tp-own-b.ghost{background:var(--card);border:1.5px solid var(--pink-ink);color:var(--ink)}.dela .tp-own-b[aria-pressed=true]{box-shadow:0 0 0 3px rgba(139,33,70,.18)}.tp-own-b svg.ic{width:18px;height:18px}.dela .card.tp-head{background:var(--tp-band);border:0;padding:22px 24px}.tp-head h1{font-size:32px;line-height:1.15;font-weight:800;letter-spacing:-.01em}.tp-headline{margin:4px 0 10px;font-size:19px;color:var(--muted)}.tp-head-grid{grid-template-columns:128px minmax(0,1fr) minmax(0,auto)}.dela .tp-photo{width:128px;height:128px;font-size:44px;box-shadow:0 0 0 4px #fff}.tp-meta{font-size:15px;gap:8px 0}.tp-meta>span{display:inline-flex;gap:6px;align-items:center;padding:0 14px;border-left:1px solid #b9d9f4}.tp-meta svg.ic{width:18px;height:18px}.tp-meta .tp-check{font-weight:700;color:var(--ink)}.tp-li{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:5px;background:#0a66c2;color:#fff;font-weight:800;font-size:13px;font-family:Arial,Helvetica,sans-serif;line-height:1;flex:none}.tp-okdot{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#2f9e5b;color:#fff;font-size:12px;font-weight:800}.tp .talent-star{color:#e8a713}.dela .tp .tp-tabs{gap:8px;margin:16px 0 14px}.dela .tp .tp-tabs button{font-size:17px;font-weight:500;color:var(--ink);padding:12px 18px}.dela .tp .tp-tabs button[aria-selected=true]{color:var(--pink-ink);font-weight:700;border-bottom-color:var(--pink-ink)}.tp .tp-panel .card{position:relative;border-radius:14px;padding:20px 22px}.tp .tp-panel .card>h2,.tp-check-h{font-size:22px;margin:0 0 10px}.tp-check-h{display:flex;gap:10px;align-items:center;font-size:19px}.tp-check-h .tp-li{width:30px;height:30px;font-size:18px;border-radius:6px}.dela .tp .tp-edit{display:inline-flex;gap:6px;align-items:center;background:transparent;border:0;color:var(--pink-ink);font-weight:600;padding:6px 8px;min-height:36px}.dela .tp .tp-edit:hover{background:var(--tp-tint)}.tp .tp-edit svg.ic,.tp-add svg.ic{width:17px;height:17px}.dela .tp .tp-panel .card .tp-edit{position:absolute;top:14px;right:14px;margin:0}.dela .tp .tp-panel .card.tp-rows .tp-edit,.dela .tp .tp-panel .card .tp-editor .tp-edit{position:static;margin-top:6px}.dela .tp .tp-head .tp-edit{margin:0 0 8px;padding-left:0}.dela .tp-add{display:inline-flex;gap:6px;align-items:center;background:var(--tp-tint);border:1.5px dashed #d59ab3;color:var(--pink-ink);font-weight:700;min-height:42px;padding:8px 16px;margin-top:8px}.dela .tp-empty .tp-add{margin-top:0}.tp .talent-tag{background:var(--tp-tag);color:var(--ink);font-size:14px;font-weight:500;padding:6px 14px}.tp-rows .tp-row{border-top-color:var(--tp-rule)}.tp-tile{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:12px;background:var(--tp-tint);color:var(--pink-ink);flex:none}.tp-tile svg.ic{width:28px;height:28px}.tp-tile.big{width:84px;height:84px;border-radius:16px;margin:0 0 12px}.tp-tile.big svg.ic{width:44px;height:44px}.tp-blank-h{margin:0 0 6px;font-size:26px}.tp-svc h3{font-size:18px}.tp-svc-p b{font-size:19px}.tp-glance{list-style:none;margin:0;padding:0}.tp-glance li{display:flex;gap:12px;align-items:center;padding:7px 0;font-size:16px}.tp-glance svg.ic{width:20px;height:20px;flex:none}.tp-rev-d,.tp-rev-one{border-radius:14px}.tp #tp-rev-sum h2{font-size:24px}.tp-timeline b{font-size:18px}@media (max-width:900px){.tp-head-grid{grid-template-columns:72px minmax(0,1fr)}.dela .tp-photo{width:72px;height:72px;font-size:28px}.tp-head h1{font-size:24px}.dela .tp .tp-panel .card .tp-edit,.dela .tp .tp-panel .card.tp-rows .tp-edit{position:static;margin-top:8px}}.pf-head h1{font-size:30px;font-weight:800;letter-spacing:-.01em}.dela .pf-head #prof-live{display:inline-flex;gap:8px;align-items:center;background:var(--card);border:1.5px solid var(--pink-ink);color:var(--pink-ink);font-weight:700;min-height:44px;padding:8px 18px}.pf-head #prof-live svg.ic{width:18px;height:18px}.dela .pf-ready{background:var(--tp-band);padding:12px 16px}.pf-ready .badge{background:var(--card);border-color:var(--tp-rule);color:var(--ink);font-weight:700;font-size:14px;padding:5px 12px}.pf-ready .badge.ready{background:var(--okbg);border-color:var(--okline);color:#21613d}.pf-ready .pf-states{color:var(--ink)}.dela .pf-ready .linkish{color:var(--pink-ink);font-weight:700}.dela .pf-tabs{gap:8px}.dela .pf-tabs button{font-size:17px;font-weight:500;color:var(--ink);padding:12px 20px}.dela .pf-tabs button[aria-selected=true]{background:var(--tp-tint);color:var(--pink-ink);font-weight:700}.pf .pf-grid>.card,.pf .pf-rail>.card{border-radius:14px}.pf-nav-h{color:var(--pink-ink)}.dela .pf-nav button{display:flex;gap:10px;align-items:center;font-size:16px}.pf-nav button svg.ic{width:19px;height:19px;flex:none;color:var(--muted)}.dela .pf-nav button[aria-current=true]{background:var(--tp-tint)}.pf-nav button[aria-current=true] svg.ic{color:var(--pink-ink)}.dela .pf-nav button:hover{background:var(--tp-tint)}.pf-sec-h h2{font-size:26px;font-weight:800}.pf-sec-h .badge{background:var(--tp-tag);border-color:var(--tp-rule);color:var(--ink);font-weight:600;padding:4px 12px}.pf-form h3{color:var(--pink-ink)}.pf-rail .card h2{font-size:19px;margin:0 0 8px}.pf-rail #pf-vis{background:var(--tp-tint);border-color:var(--tp-rule)}.pf-foot{border-top-color:var(--tp-rule)}.dela .pf-save #pf-next{font-weight:700}.pf #pf-unsaved{color:var(--pink-ink);font-weight:600}.rv-grid{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;margin:8px 0 0}.rv-left{flex:1 1 260px;max-width:420px;min-width:0}.rv-right{flex:2 1 420px;min-width:0}.dela .rv-grid .card,.dela.nl .rv-grid .card{margin:0 0 12px;border-radius:14px;padding:16px 18px}.rv-avg{margin:0;font-size:22px}.rv-avg b{font-weight:800}.rv-grid .talent-star{color:#e8a713}.rv-details summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center}.rv-details summary::-webkit-details-marker{display:none}.rv-details summary:after{content:'⌄';font-size:20px;color:var(--pink-ink)}.rv-details[open] summary:after{content:'⌃'}.rv-details-h{font-size:19px;font-weight:800}.rv-rows{margin:8px 0 0}.rv-rows div{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid var(--line)}.rv-rows div:first-child{border-top:0}.rv-rows dt{color:var(--ink)}.rv-rows dd{margin:0;font-weight:600;text-align:right}.rv-by{margin:0;font-size:18px;font-weight:800;overflow-wrap:anywhere}.rv-when{margin:2px 0 6px}.rv-body{margin:0;white-space:pre-wrap}.rv-resp{margin:8px 0 0;padding-left:10px;border-left:3px solid var(--line)}.rv-cat{margin:10px 0 0;padding-top:8px;border-top:1px solid var(--line)}.rv-cat summary{cursor:pointer;font-weight:700;min-height:28px}.rv-cat .rv-rows div{padding:6px 0}.dela .rv-all{display:block;width:100%;background:var(--pink);border:1px solid var(--line);color:var(--pink-ink);font-weight:700;min-height:46px;border-radius:12px}.rv-past-h{margin:14px 0 4px}.ready-steps{margin:10px 0 0;border-top:1px solid var(--line);padding-top:8px}.ready-steps>summary{cursor:pointer;min-height:32px;padding:4px 0}.ready-steps-h{font-weight:700}.pf-avail{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;background:var(--card);border:1px solid var(--tp-rule);border-radius:12px;padding:10px 16px;margin:0 0 14px}.pf-avail-h{margin:0;font-size:16px;font-weight:800}.pf-av-opts{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}.pf-av-opt{display:inline-flex;gap:6px;align-items:center}.dela .pf-av-opt>button:first-child{min-height:40px}.pf-avail-say{flex:1 1 260px;margin:0;color:var(--muted)}.nc-item{border-top:1px solid var(--line);padding:10px 0}.nc-item textarea{box-sizing:border-box}.ho-part{background:var(--soft);border-radius:10px;padding:10px 12px;margin:0 0 10px}.ho-need{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}.ho-need:first-child{border-top:0}.ho-need .grow{flex:1 1 220px;min-width:0}.ho-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}.ho-checks{border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin:8px 0 0}.ho-checks legend{font-weight:700;padding:0 6px}.ho-check{display:flex;gap:10px;align-items:flex-start;padding:6px 0}.ho-check.off{opacity:.7}.ho-check input{margin-top:4px}.wf-host:empty{display:none}.wf{list-style:none;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px;padding:0;margin:10px 0 0}.wf-step{display:flex;flex-direction:column;gap:6px;align-items:flex-start;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--card);min-width:0}.wf-n{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;border:1.5px solid var(--line);font-weight:800;font-size:13px;color:var(--muted);flex:none}.wf-b{min-width:0}.wf-t{display:block;font-size:14px;line-height:1.25}.wf-s{display:block;font-size:12px;color:var(--muted);line-height:1.3;margin-top:2px}.wf-done{background:var(--okbg);border-color:var(--okline)}.wf-done .wf-n{background:var(--ok);border-color:var(--ok);color:#fff}.wf-now{border:2px solid var(--pink-ink);background:var(--pink)}.wf-now .wf-n{background:var(--brand);border-color:var(--brand);color:#fff}.wf-next{border:2px dashed var(--pink-ink)}.wf-next .wf-n{border-color:var(--pink-ink);color:var(--pink-ink)}.wf-skip,.wf-na{border-style:dashed;opacity:.75}.wf-loop{border-style:dashed}.wf-loop.wf-now{border-style:solid}.wf-row{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}.wf-row:first-child{border-top:0;padding-top:0}.wf-row .grow{flex:1 1 180px;min-width:0}@media (max-width:1100px){.wf{grid-template-columns:repeat(4,minmax(0,1fr))}}@media (max-width:640px){.wf{grid-template-columns:minmax(0,1fr)}.wf-step{flex-direction:row;align-items:center}.wf-s{display:none}}.md>p{margin:0 0 8px}.md>:last-child{margin-bottom:0}.md .md-h{margin:12px 0 4px;font-size:16px}.md h4.md-h{font-size:15px}.md>.md-h:first-child{margin-top:0}.md .md-ol{margin:0 0 8px;padding-left:22px}.md .md-img{display:block;max-width:100%;max-height:420px;height:auto;border-radius:10px;margin:8px 0}.md-bar{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}.md-rich{min-height:150px;max-height:520px;overflow:auto;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);line-height:1.5}.md-rich:focus{outline:2px solid var(--ink);outline-offset:1px}.md-rich:empty:before{content:attr(data-ph);color:var(--muted)}.md-rich ul,.md-rich ol{margin:0 0 8px;padding-left:22px}.md-rich h3{margin:12px 0 4px;font-size:16px}.md-rich img{display:block;max-width:100%;max-height:320px;height:auto;border-radius:10px;margin:8px 0;cursor:pointer}.md-alt{margin:0 0 6px}.md-alt label{display:block;margin:0 0 2px}.dela .md-alt-in{width:100%;box-sizing:border-box}.dela .md-btn{min-height:36px;padding:4px 10px}.dela .md-b{font-weight:800}.dela .md-i{font-style:italic}.md-prev{margin:10px 0 0;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--soft)}.md-prev-h{margin:0 0 6px;font-weight:700}.tp-self-card{background:var(--sel);margin:0 0 12px}.dela .tp-edit{margin-top:8px}.tp-editor label{display:block;font-weight:700;margin:0 0 2px}.tp-editor textarea,.tp-editor input{box-sizing:border-box}" +
    ".tp-panel:focus-visible{outline:2px solid var(--pink-ink);outline-offset:4px}.tp-panel .card{margin:10px 0}.tp-item{padding:12px 0;border-top:1px solid var(--line)}.tp-item:first-of-type{border-top:0}" +
    ".tp-facts{margin:0}.tp-facts div{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--line)}.tp-facts div:first-child{border-top:0}.tp-facts dt{color:var(--muted)}.tp-facts dd{margin:0;font-weight:700;text-align:right}" +
    // Ready-made profile pictures: a compact grid, one choice, a clear ring on the chosen and the focused one
    ".av-box{margin:6px 0 10px}.av-grid{display:grid;grid-template-columns:repeat(auto-fill,52px);gap:6px;max-height:190px;overflow:auto;padding:4px}.dela .av-opt{width:52px;height:52px;min-height:0;padding:2px;border-radius:50%;border:2px solid transparent;background:transparent;line-height:0}" +
    ".av-opt img{width:44px;height:44px;border-radius:50%}.dela .av-opt[aria-checked=true]{border-color:var(--pink-ink);box-shadow:0 0 0 2px var(--pink)}.dela .av-opt:focus-visible{outline:2px solid var(--pink-ink);outline-offset:2px}" +
    ".talent-bm{display:inline-flex;align-items:center;gap:6px;margin:4px 0 8px;cursor:pointer}.talent-marked{font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}.dela .bm-btn[aria-pressed=true]{border-color:var(--pink-ink);background:var(--pink)}" +
    // Step 75a: the Ask DELA workspace as the workflow mockups draw it: one skeleton for every page
    ".dw-head{margin:18px 0 12px}.dw-head-row{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}.dw-head h1{font-size:28px;line-height:1.2}.dw-sub{margin:6px 0 0;max-width:820px}.dela .dw-back{display:none;margin-bottom:8px}@media (max-width:900px){.dela .dw-back{display:inline-flex}}" +
    ".dw-wrap{container-type:inline-size}.dw-cols,.dw-3{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:start}.dw-main,.dw-side{display:flex;flex-direction:column;gap:16px;min-width:0}.dw-main>.card,.dw-side>.card,.dw-3>.card,.dw-main>div>.card{margin:0}.dw-main>div:not(.row){display:flex;flex-direction:column;gap:16px}" +
    "@container (min-width:760px){.dw-cols{grid-template-columns:minmax(0,2.4fr) minmax(270px,1fr)}.dw-3{grid-template-columns:minmax(0,2fr) minmax(260px,1fr)}.dw-3>.dw-nav{grid-column:1 / -1}}@container (min-width:900px){.dw-3{grid-template-columns:208px minmax(0,1.9fr) minmax(236px,1fr)}.dw-3>.dw-nav{grid-column:auto}}@container (min-width:1120px){.dw-3{grid-template-columns:224px minmax(0,2.2fr) minmax(260px,1fr)}}" +
    ".dw-cap{font-size:12px;letter-spacing:.06em;text-transform:uppercase;font-weight:800;margin:0 0 8px}.dw-cap2{margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}.dw-chats{list-style:none;margin:0;padding:0}.dw-kept{margin:12px 0 0}" +
    ".dela .dw-item,.dela .dw-chat{display:block;width:100%;text-align:left;background:transparent;border:0;border-radius:10px;padding:9px 12px;min-height:40px;color:var(--ink);font-weight:600;font-size:14px}.dela .dw-item[aria-current=page]{background:var(--pink);color:var(--pink-ink)}.dela .dw-chat{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dela .dw-chat[aria-current=true]{background:var(--sel);font-weight:700}" +
    ".dw-ask{border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;align-items:flex-start;margin:8px 0}.dw-ask-h{color:var(--pink-ink);font-size:13px}.dw-chat-top{margin-bottom:8px}.dw-tablehead{margin-bottom:8px}.dw-tablehead input{flex:0 1 280px}" +
    ".dw-ctx{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:0 0 10px;display:flex;flex-direction:column;gap:4px;align-items:stretch}.dw-ctx .linkish{align-self:flex-start}.dela .dw-wide{width:100%;justify-content:center}.dw-tag{white-space:normal;max-width:100%;text-align:left}.dw-line>.dw-tag{flex:0 1 auto;max-width:55%}.badge.dw-blue{background:var(--bluebg);color:#0b5c9e;border-color:#b9d9f4}" +
    ".dela .dw-act{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:transparent;border:0;border-top:1px solid var(--line);border-radius:0;padding:12px 4px;color:var(--ink);font-weight:400}.dela .dw-act:first-of-type{border-top:0}.dw-act .hsub{display:block}.dw-chev{font-size:20px;color:var(--muted)}" +
    ".dw-note{display:flex;gap:10px;align-items:flex-start;background:var(--bluebg);border:1px solid #b9d9f4;border-radius:12px;padding:12px 14px;margin:0;font-size:14px;line-height:1.5}.dw-i{flex:none;width:18px;height:18px;border-radius:50%;background:#0d83dd;color:#fff;font-size:12px;font-weight:800;display:inline-flex;align-items:center;justify-content:center}" +
    ".dw-table th[scope=row] b{display:block}.dw-rowacts{display:flex;flex-direction:column;gap:4px;align-items:flex-end}.dela .dw-crumb{background:transparent;border:0;padding:0;min-height:0;font:inherit;color:var(--ink);font-weight:700;cursor:pointer;text-decoration:underline}.dw-crumb-sep{color:var(--muted);font-weight:400;margin:0 6px}" +
    // Step 75b: task cards to tick, lines with a state tag at the right, the yellow "needs a decision" note
    ".dw-task.on{border-color:var(--pink-ink);background:var(--pink)}.dw-task-l{display:flex;gap:10px;align-items:flex-start;font-size:17px;cursor:pointer}.dw-task-l input{margin-top:4px;flex:none}.dw-task-step{margin:4px 0 0 28px}.dw-task>.row:last-of-type{margin-left:28px}.dw-why{margin:8px 0 0 28px}" +
    ".dw-line{display:flex;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}.dw-line:first-of-type{border-top:0}h2+.dw-line,.row+.dw-line{border-top:0}.dw-count{border-top:1px solid var(--line);padding:12px 0 10px;margin-top:4px}.dw-list{margin:0 0 8px;padding-left:20px}" +
    ".dw-warn{border:1px solid #e8c97a;background:#fff3d6;color:#4a3200;border-radius:12px;padding:10px 14px;margin:10px 0;font-size:14px;line-height:1.5}" +
    // Step 75c: two fields side by side, small headings inside a card, the boxed sentence, the recipient's switched-off buttons
    ".dw-two{display:grid;grid-template-columns:minmax(0,1fr);gap:0 14px}@container (min-width:620px){.dw-two{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}.dw-h3{font-size:17px;margin:16px 0 6px}.dw-box{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:0 0 10px}.dw-acts{margin-top:4px}" +
    ".dela .dw-off[disabled]{background:var(--soft);color:#3f4a5a;border-color:var(--line);opacity:1}.dw-main .gs-field{margin:10px 0}.dw-main .gs-field input,.dw-main .gs-field select{width:100%}.dw-main .gs-field .row input{width:auto;flex:1 1 90px;min-width:0}" +
    // Step 75d: one proposed change inside the revision card, the rows of the decision queue
    ".dw-sg{border-top:1px solid var(--line);margin-top:14px;padding-top:14px}.dw-sg .sg-col:last-child{background:var(--pink);border-radius:10px;padding:8px 10px}.dw-sg .sg-col-h{text-transform:uppercase;letter-spacing:.06em;font-size:12px;color:var(--pink-ink)}.dw-cap3{font-size:14px}" +
    ".dela .dw-qrow{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:transparent;border:0;border-top:1px solid var(--line);border-radius:0;padding:12px 8px;color:var(--ink);font-weight:400}.dela .dw-qrow:first-of-type{border-top:0}.dela .dw-qrow[aria-pressed=true]{background:var(--sel);border-radius:10px}" +
    // Review of 2026-11-23. C5: boxes on the new forms have an outline that can be seen (3 to 1). C6: the chosen line
    // of the decision queue has a dark red bar. C8: small links are easier to hit. The confirm question. D1: on a narrow
    // page the second menu is one row of buttons above the chat, and the earlier chats are a list in the chat card.
    ".dela .dw-wrap input,.dela .dw-wrap select,.dela .dw-wrap textarea,.dela .bm-edit input,.dela .bm-edit textarea,.dela .bm-f select{border-color:#7b8698}.dela .dw-qrow[aria-pressed=true]{box-shadow:inset 4px 0 0 var(--pink-ink)}" +
    ".dela .dw-wrap .linkish,.dela .dw-side>.linkish{min-height:32px;padding:6px 0;display:inline-flex;align-items:center}.dela .bm-tag{min-height:28px}.dw-confirm{margin-top:8px}.dw-confirm .dw-wide{margin-top:0}.dw-chatsel{display:none;margin:0 0 10px}.dw-chatsel select{width:100%}" +
    "@container (max-width:759px){.dw-3>.dw-nav{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;padding:8px;-webkit-overflow-scrolling:touch}.dw-nav .dw-cap,.dw-nav .dw-chats,.dw-nav .dw-kept,.dw-nav #dw-chats-all,.dw-nav>.hsub{display:none}.dela .dw-nav .dw-item{flex:0 0 auto;width:auto;border:1px solid var(--line);border-radius:999px;padding:8px 14px;white-space:nowrap}.dw-chatsel{display:block}}" +
    // Fix (Stacey 2026-11-23: "recent conversations isn't formatted well and is cut off"): the menu card's two small
    // headings stay small and inside the card, and a chat's title may run over two lines before it is cut
    ".dela .dw-3>.dw-nav{padding:14px 12px}.dela .dw-nav .dw-cap{font-size:12px;line-height:1.35;letter-spacing:.05em;margin:0 0 8px;padding:0 6px;overflow-wrap:anywhere}.dela .dw-nav .dw-cap2{margin-top:14px;padding-top:14px}.dela .dw-nav .dw-item{padding:9px 10px}" +
    ".dela .dw-nav .dw-chat{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;padding:7px 10px;min-height:0;line-height:1.35;font-size:13.5px;overflow-wrap:anywhere}.dw-chats li{margin:2px 0}.dela .dw-nav .linkish,.dw-nav .dw-kept,.dw-nav>.hsub{margin-left:6px;margin-right:6px}.dw-nav .dw-kept{font-size:12.5px}" +
    // Stacey 2026-11-23 ("UI of this page doesn't look good"): the workspace pages follow the mockups' plain white
    // cards. No grey band behind a card's heading, even gaps between cards, and in "Working context" each playbook's
    // name on its own line with its tag and its action under it.
    ".dela.nl .dw-wrap .card{margin:0}.dela.nl .dw-wrap .card>h2:first-child,.dela.nl .dw-wrap .card>.row:first-child:has(>h2),.dela.nl .dw-wrap .card>.row:first-child:has(>h3){margin:0 0 10px;padding:0;background:transparent;border-bottom:0;border-radius:0}.dela.nl .dw-wrap .card>h2{font-size:19px}.dela.nl .dw-wrap .card>h2.dw-cap{font-size:12px;margin:0 0 8px;padding:0 6px}.dela.nl .dw-wrap .card>h2.dw-cap2{margin-top:14px;padding-top:14px}" +
    ".dela.nl .dw-wrap .card .card.soft{margin:0 0 10px}.dw-ctx>b{overflow-wrap:anywhere;line-height:1.3}.dw-ctx-foot{gap:8px;margin-top:4px;align-items:center}.dw-ctx.on{border-color:#b6dcc5;background:var(--okbg)}.dw-msgs{margin:0 0 12px}.dw-fresh .dw-msgs{margin:0}" +
    // Step 77: the Ask DELA first screen as Stacey's mockup of 2026-11-23 draws it. The colors are sampled from the mockup.
    ".dela{--dw-hero:linear-gradient(180deg,#dcedfe 0%,#e2f0fe 100%);--dw-hill:#cae8f5;--dw-teal:#12a596;--dw-paper:#fff;--dw-artline:#c9d3e0;--dw-ico-bg:#f5ebf1;--dw-ico:#9f254c;--dw-brand:#922346;--dw-brand-d:#7b1c3a;" +
    "--dw-b:#e8f1fe;--dw-b-line:#d5e5fb;--dw-b-ic:#1869c2;--dw-t:#e4f7f3;--dw-t-line:#cfeee7;--dw-t-ic:#078a80;--dw-p:#fff2e6;--dw-p-line:#fbe3cb;--dw-p-ic:#c2681c;--dw-ctx-ic:#0962b3;--dw-lock:#f6f8fa;--dw-lock-ic:#124f95;--dw-sub:#3d4654}" +
    ".dw-head-ask{margin:22px 0 18px}.dw-head-ask .dw-head-row{align-items:center;gap:16px}.dw-ico{width:64px;height:64px;border-radius:16px;background:var(--dw-ico-bg);display:flex;align-items:center;justify-content:center;flex:none}.dela.nl .dw-ico svg.ic{width:38px;height:38px;color:var(--dw-ico);stroke-width:1.6}" +
    ".dela.nl .dw-head-ask h1{font-size:38px;line-height:1.1;font-weight:800;letter-spacing:-.01em}.dela.nl .dw-head-ask .dw-sub{margin:4px 0 0;color:var(--dw-sub);font-size:16px}.dw-head-ask .dw-head-acts{align-items:center}" +
    ".dela .dw-newchat,.dela .dw-menu-wrap>button{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:8px 16px;border-radius:10px;background:var(--card);border:1px solid var(--line);font-weight:700}.dela .dw-newchat{color:var(--dw-brand)}.dela .dw-newchat .ic,.dela .dw-menu-wrap>button .ic{width:16px;height:16px;color:currentColor}" +
    ".dw-menu-wrap{position:relative;display:inline-block}.dw-menu{position:absolute;z-index:30;top:calc(100% + 6px);left:0;min-width:270px;max-width:min(340px,86vw);max-height:min(70vh,520px);overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 32px rgba(11,18,32,.16);padding:10px 8px}.dw-menu.right{left:auto;right:0}" +
    ".dela.nl .dw-menu h2.dw-cap{font-size:12px;margin:0 0 6px;padding:4px 12px;color:var(--muted)}.dela.nl .dw-menu h2.dw-cap2{margin-top:10px;padding-top:14px;border-top:1px solid var(--line)}.dw-menu .dw-kept{padding:0 12px;margin:6px 0 0}.dela .dw-menu .dw-chat{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}" +
    ".dela .dw-add-item{display:flex;gap:12px;align-items:flex-start;text-align:left}.dela .dw-add-item .ic{width:20px;height:20px;margin-top:2px;flex:none;color:var(--dw-ctx-ic)}.dw-add-item .dw-start-t b{font-size:15px}" +
    "@media (max-width:640px){.dela.nl .dw-head-ask h1{font-size:30px}.dw-ico{width:52px;height:52px}}.dw-first{display:flex;flex-direction:column;gap:20px}.dw-first-top{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;align-items:start}@container (min-width:820px){.dw-first-top{grid-template-columns:minmax(0,2.67fr) minmax(240px,1fr)}}" +
    ".dw-hero{position:relative;overflow:hidden;background:var(--dw-hero);border-radius:16px;min-height:170px;padding:28px 28px;display:flex;align-items:center}.dw-hero-t{position:relative;z-index:1;max-width:80%}.dela.nl .dw-wrap .dw-hero h2{margin:0 0 10px;font-size:27px;line-height:1.2;font-weight:800;color:var(--ink)}.dw-hero p{margin:0;font-size:16px;color:var(--ink)}" +
    ".dw-art{position:absolute;right:0;bottom:0;height:100%;max-width:30%}.dw-art-hill{fill:var(--dw-hill)}.dw-art-paper{fill:var(--dw-paper);filter:drop-shadow(0 6px 10px rgba(20,60,90,.12))}.dw-art-tick{fill:none;stroke:var(--dw-teal);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.dw-art-line{fill:none;stroke:var(--dw-artline);stroke-width:4;stroke-linecap:round}.dw-art-spark{fill:none;stroke:var(--dw-teal);stroke-width:3;stroke-linecap:round}" +
    "@container (max-width:560px){.dw-art{display:none}.dw-hero-t{max-width:none}.dela.nl .dw-wrap .dw-hero h2{font-size:22px}.dw-ico{width:52px;height:52px}}" +
    ".dela.nl .dw-wrap .dw-ctxcard{padding:18px 20px;border-radius:16px;box-shadow:0 6px 20px rgba(11,18,32,.07);border-color:transparent}.dw-ctx-top{display:flex;gap:12px;align-items:center;margin:0 0 10px}.dela.nl .dw-ctx-top svg.ic{width:28px;height:28px;color:var(--dw-ctx-ic);flex:none}.dela.nl .dw-wrap .dw-ctx-top h2{margin:0;font-size:18px;font-weight:800}" +
    ".dw-ctx-line{margin:0 0 12px;color:var(--dw-sub);font-size:15px;line-height:1.5}.dw-ctx-more{border-top:1px solid var(--line);padding-top:12px;margin:0 0 4px}.dela.nl .dw-wrap .dw-manage{text-decoration:none;display:flex;width:100%;gap:6px;align-items:center;border-top:1px solid var(--line);padding:12px 0 0;min-height:36px;color:var(--dw-brand);font-weight:700;background:transparent;border-left:0;border-right:0;border-bottom:0;border-radius:0}.dela .dw-manage .ic{width:16px;height:16px;color:currentColor}" +
    ".dela.nl .dw-wrap .dw-chat-card.dw-fresh{padding:20px;border-radius:16px;box-shadow:0 6px 20px rgba(11,18,32,.06);border-color:transparent}@container (min-width:820px){.dw-first>.dw-fresh{max-width:88%}}" +
    ".dela .dw-composer{padding:0;border:0;box-shadow:none;background:transparent}.dela .dw-composer textarea{min-height:118px;border-radius:12px;padding:14px 18px;font-size:16px;width:100%}.dw-composer-row{gap:12px;flex-wrap:wrap;margin-top:14px;align-items:center}.dw-composer-row>div{margin:0}" +
    ".dela .dw-addb,.dela .dw-talk{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:10px 20px;border-radius:10px;background:var(--card);border:1px solid var(--line);color:var(--ink);font-weight:600;font-size:16px}.dela .dw-addb .ic,.dela .dw-talk .ic{width:18px;height:18px;color:currentColor}.dela .dw-talk.on{border-color:var(--dw-brand);color:var(--dw-brand)}" +
    ".dela.nl .dw-wrap button.dw-send{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-width:130px;min-height:48px;font-size:16px;font-weight:700;border-radius:10px;background:var(--dw-brand);border-color:var(--dw-brand);color:#fff}.dela.nl .dw-wrap button.dw-send:hover:not([disabled]){background:var(--dw-brand-d)}.dela .dw-send .ic{width:20px;height:20px;color:#fff}" +
    ".dw-auto{margin:0;font-weight:600;display:flex;gap:6px;align-items:center}.dela.nl .dw-wrap .dw-composer .chips{margin:0 0 10px}.dela .dw-composer-row .dw-send{margin-left:auto}.dela .dw-composer-row .dw-addb,.dela .dw-composer-row .dw-talk{padding:10px 14px;white-space:nowrap}.dw-composer-row{gap:10px}@container (max-width:700px){.dela .dw-addb,.dela .dw-talk{padding:10px 14px;font-size:15px}.dw-composer-row{gap:8px}}.dw-improve{margin:12px 0 0}.dw-lock{display:flex;gap:10px;align-items:center;background:var(--dw-lock);border-radius:8px;padding:8px 14px;margin:14px 0 0;font-size:14px;color:var(--ink)}.dela .dw-lock .ic{width:18px;height:18px;color:var(--dw-lock-ic);flex:none}.dw-credits{margin:-10px 0 0}.dw-2 .dw-credits{margin:8px 0 0}" +
    ".dela.nl .dw-wrap .dw-start-h{margin:8px 0 0;font-size:24px;font-weight:800}.dw-starts{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}@container (min-width:820px){.dw-starts-3{grid-template-columns:repeat(3,minmax(0,1fr))}.dw-starts-2{grid-template-columns:repeat(2,minmax(0,1fr))}}" +
    ".dela .dw-start{display:flex;gap:16px;align-items:center;text-align:left;width:100%;min-height:132px;padding:22px 20px;border-radius:16px;border:1px solid;font-weight:400;color:var(--ink)}.dela .dw-start.c-blue{background:var(--dw-b);border-color:var(--dw-b-line)}.dela .dw-start.c-teal{background:var(--dw-t);border-color:var(--dw-t-line)}.dela .dw-start.c-peach{background:var(--dw-p);border-color:var(--dw-p-line)}" +
    ".dela.nl .dw-start>svg.ic:first-child{width:46px;height:46px;flex:none;align-self:flex-start;stroke-width:1.7}.dela .dw-start.c-blue>.ic:first-child{color:var(--dw-b-ic)}.dela .dw-start.c-teal>.ic:first-child{color:var(--dw-t-ic)}.dela .dw-start.c-peach>.ic:first-child{color:var(--dw-p-ic)}.dela .dw-start>.ic:last-child{width:20px;height:20px;flex:none;color:var(--ink)}" +
    ".dw-start-t{display:flex;flex-direction:column;gap:6px;flex:1;min-width:0}.dw-start-t b{font-size:19px;font-weight:800;line-height:1.25}.dw-start-t span{font-size:15px;line-height:1.5}.dela .dw-start:hover{filter:brightness(.98)}.dela .dw-start:focus-visible,.dela .dw-manage:focus-visible,.dela .dw-menu-wrap>button:focus-visible{outline:2px solid var(--pink-ink);outline-offset:2px}" +
    // Step 78: a conversation in progress, as Stacey's second mockup of 2026-11-23 draws it. Colors sampled from it.
    ".dela{--dw-me:#dcebfb;--dw-ok:#e3f4ea;--dw-ok-line:#cfe9da;--dw-ok-ic:#12a05c;--dw-keep:#fdf0e3;--dw-keep-line:#f8e2cb;--dw-keep-ic:#b8651b;--dw-src:#e3effc;--dw-next:#fdf1e4;--dw-next-line:#fbe6d0;--dw-next-ic:#d98324;--dw-chip:#f1f4f8}" +
    ".dela.nl .dw-wrap .dw-conv{padding:22px 22px 18px;border-radius:16px;box-shadow:0 6px 20px rgba(11,18,32,.06);border-color:transparent}.dela .dw-conv .dw-msgs{display:flex;flex-direction:column;gap:18px;margin:0 0 18px}" +
    ".dw-turn{display:flex;gap:14px;align-items:flex-start}.dw-turn.me{justify-content:flex-end}.dela .dw-turn.me .msg.user{background:var(--dw-me);border:0;border-radius:14px;padding:12px 18px;margin:0;max-width:78%;font-size:16px;color:var(--ink)}" +
    ".dela.nl .dw-2 .dw-conv .composer{position:static;padding-top:0}.dela .dw-turn>.dw-av{align-self:flex-start;height:40px;max-height:40px;padding:0}.dw-av{width:40px;height:40px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px}.dw-av.me{background:var(--dw-brand);color:#fff}.dw-av.ai{border-radius:12px;background:var(--dw-ico-bg)}.dela.nl .dw-av.ai svg.ic{width:24px;height:24px;color:var(--dw-ico)}" +
    ".dw-ans{flex:1;min-width:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:12px}.dw-ans-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:16px;line-height:1.5}.dw-ans .src{display:block;font-size:12px;color:var(--muted)}.dw-ans.muted{color:var(--muted)}" +
    ".dw-srcbar{display:flex;gap:14px;align-items:center;background:var(--dw-src);border-radius:10px;padding:10px 14px}.dela.nl .dw-srcbar>svg.ic{width:28px;height:28px;color:var(--dw-ctx-ic);flex:none}.dw-srcbar .dw-start-t{gap:2px}.dw-srcbar .dw-start-t b{font-size:16px}.dw-srcbar .dw-start-t span{font-size:14px;color:var(--dw-sub)}" +
    ".dela.nl .dw-wrap .dw-view{display:inline-flex;gap:6px;align-items:center;white-space:nowrap;font-size:14px;font-weight:600;color:var(--dw-brand);min-height:32px;flex:none}.dela.nl .dw-view svg.ic{width:15px;height:15px;color:currentColor}" +
    ".dw-tasks{border:1px solid var(--line);border-radius:12px;overflow:hidden}.dela.nl .dw-wrap .dw-tasks h3{display:flex;gap:12px;align-items:center;margin:0;padding:10px 14px;font-size:17px;font-weight:800}.dw-tasks.ok{border-color:var(--dw-ok-line)}.dw-tasks.ok h3{background:var(--dw-ok)}.dw-tasks.keep{border-color:var(--dw-keep-line);background:var(--dw-keep)}.dw-tasks.keep h3{background:transparent}" +
    ".dela.nl .dw-tasks h3 svg.ic{width:24px;height:24px;flex:none}.dela.nl .dw-tasks.ok h3 svg.ic{color:#fff;background:var(--dw-ok-ic);border-radius:50%;padding:4px;stroke-width:3}.dela.nl .dw-tasks.keep h3 svg.ic{color:var(--dw-keep-ic)}" +
    ".dw-task-list{list-style:none;margin:0;padding:0 14px}.dw-task-list li{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-top:1px solid var(--line);flex-wrap:wrap}.dw-task-list li:first-child{border-top:0}.dw-tasks.keep .dw-task-list li{border-top-color:var(--dw-keep-line);padding-left:36px}" +
    ".dw-task-list .dw-start-t{flex:1 1 240px;gap:3px}.dw-task-list .dw-start-t b{font-size:15px}.dw-task-list .dw-start-t span{font-size:13px;color:var(--dw-sub)}.dw-num{width:26px;height:26px;border-radius:50%;background:var(--dw-ok);color:#0b6b3d;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;flex:none}" +
    ".dw-chip{font-size:12px;background:var(--dw-chip);border:1px solid var(--line);border-radius:999px;padding:2px 10px;white-space:nowrap;color:var(--ink)}.dw-ans-acts{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:4px}" +
    ".dela.nl .dw-wrap .dw-ans-acts>button.blue,.dela.nl .dw-wrap .dw-ans-acts>button.ghost{display:inline-flex;gap:8px;align-items:center;min-height:44px;padding:8px 16px;border-radius:10px;font-weight:700}.dela.nl .dw-wrap .dw-ans-acts>button.blue{background:var(--dw-brand);border-color:var(--dw-brand);color:#fff}.dela.nl .dw-wrap .dw-ans-acts>button.ghost{background:var(--card);border:1px solid var(--dw-brand);color:var(--ink)}" +
    ".dela.nl .dw-ans-acts svg.ic{width:18px;height:18px;color:currentColor}.dela.nl .dw-wrap .dw-correct{display:inline-flex;gap:6px;align-items:center;color:var(--dw-brand);font-weight:600;min-height:44px}" +
    ".dela.nl .dw-wrap .dw-conv .dw-composer textarea{min-height:66px}.dw-lock2{background:var(--dw-src);align-items:center}.dela.nl .dw-lock2 svg.ic{width:24px;height:24px;color:var(--dw-ctx-ic)}.dw-usage{white-space:nowrap;border-left:1px solid #b9c6d6;padding-left:16px;margin-left:6px;font-size:14px}.dela.nl .dw-wrap .dw-usage .linkish{color:var(--dw-brand);font-weight:700;min-height:0;padding:0}" +
    ".dela.nl .dw-head-acts button.dw-newchat.blue{background:var(--dw-brand);border-color:var(--dw-brand);color:#fff}.dela.nl .dw-head-acts .dw-menu-wrap>button{border-color:var(--dw-brand);color:var(--dw-brand)}" +
    ".dw-srcsel{flex-direction:row;align-items:center;gap:12px;border-color:var(--dw-ok-line);background:var(--dw-ok)}.dela.nl .dw-srcsel>svg.ic{width:28px;height:28px;color:var(--dw-t-ic);flex:none}.dw-srcsel .dw-start-t{gap:2px}.dw-srcsel .dw-start-t b{font-size:15px;overflow-wrap:anywhere}" +
    ".dw-tick{width:24px;height:24px;border-radius:50%;background:var(--dw-ok-ic);display:flex;align-items:center;justify-content:center;flex:none}.dela.nl .dw-tick svg.ic{width:14px;height:14px;color:#fff;stroke-width:3.5}.dela.nl .dw-wrap .dw-manage-b{border:1px solid var(--dw-brand);color:var(--dw-brand);background:var(--card);font-weight:700;min-height:42px;border-radius:10px}" +
    ".dela.nl .dw-wrap .dw-next{background:var(--dw-next);border-color:var(--dw-next-line);border-radius:16px;padding:18px 20px}.dela.nl .dw-next .dw-ctx-top svg.ic{color:var(--dw-next-ic);width:30px;height:30px}.dw-next p{margin:0;font-size:15px;line-height:1.5}" +
    ".dw-modal-back{position:fixed;inset:0;z-index:60;background:rgba(11,18,32,.45);display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px 16px;overflow:auto}.dw-modal{background:var(--card);color:var(--ink);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:min(620px,100%);padding:22px;max-height:86vh;display:flex;flex-direction:column}" +
    ".dw-src-list{overflow:auto;min-height:120px;flex:1}.dw-modal .dw-cap{margin:12px 0 6px;color:var(--muted)}.dw-src-row{display:flex;gap:12px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:0 0 8px}.dw-src-row.on{background:var(--dw-ok);border-color:var(--dw-ok-line)}.dela .dw-src-row>svg.ic{width:22px;height:22px;color:var(--dw-ctx-ic);flex:none}.dw-src-row .dw-start-t{gap:2px}.dw-src-row .dw-start-t b{font-size:15px;overflow-wrap:anywhere}.dela .dw-modal input[type=search]{margin:0 0 10px;border-color:#7b8698;min-height:44px;border-radius:10px;padding:8px 12px}" +
    // Step 80: the document edited in place. A page of text that is typed into where it stands.
    ".nl-sub{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 4px;border-bottom:1px solid var(--line)}.dela .nl-sub-b{background:transparent;border:0;border-bottom:3px solid transparent;border-radius:0;color:var(--muted);font-weight:700;padding:8px 14px;min-height:40px}.dela .nl-sub-b[aria-current=page]{color:var(--pink-ink);border-bottom-color:var(--pink-ink)}.dela .nl-sub-b:focus-visible{outline:2px solid var(--pink-ink);outline-offset:-2px}" +
    ".dp-wrap{container-type:inline-size}.dp-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;align-items:start}@container (min-width:900px){.dp-grid{grid-template-columns:minmax(0,1fr) 300px}.dp-grid.panel{grid-template-columns:minmax(0,1fr) 380px}.dp-side{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto}}" +
    ".dp-main{min-width:0;display:flex;flex-direction:column;gap:14px}.dp-side{display:flex;flex-direction:column;gap:14px;min-width:0}.dela.nl .dp-side .card{margin:0}.dp-top{align-items:center}.dp-status{font-size:13px;color:var(--muted)}.dp-status.bad{color:var(--bad);font-weight:700}.dela .dp-top button.on{border-color:var(--pink-ink);color:var(--pink-ink)}.dela .dp-tabs{border-radius:14px;margin:10px 0}" +
    ".dp-panel{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px}.dela.nl .dp-panel .card{margin:0}.dp-kv{grid-template-columns:1fr}" +
    ".dp-page{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:36px 44px 44px;box-shadow:0 6px 20px rgba(11,18,32,.05);font-size:16px;line-height:1.6;color:var(--ink)}@container (max-width:640px){.dp-page{padding:20px 16px 28px}}" +
    ".dp-t{outline:0;border-radius:6px;padding:2px 6px;margin:0 -6px;min-height:1.6em;white-space:pre-wrap;overflow-wrap:anywhere;cursor:text;transition:background .12s}.dp-page:not(.ro) .dp-t:hover{background:var(--soft)}.dp-page:not(.ro) .dp-t:focus{background:var(--card);box-shadow:0 0 0 2px var(--pink-ink)}" +
    ".dp-t:empty::before{content:attr(data-ph);color:#6b7280;font-style:italic}.dp-empty{color:var(--muted);font-style:italic}.dela.nl .dp-page h1.dp-title{font-size:30px;line-height:1.2;font-weight:800;margin:0 0 6px;padding:4px 6px}" +
    ".dp-t.rich a,#approved-body a{color:var(--pink-ink);text-decoration:underline}.dp-t ul.dp-ul,#approved-body ul.dp-ul{margin:4px 0;padding:0 0 0 22px;list-style:disc}.dp-t ul.dp-ul li,#approved-body ul.dp-ul li{margin:1px 0}" +
    ".dp-fmt{position:fixed;z-index:70;background:var(--card);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px rgba(11,18,32,.18);padding:4px;font-size:14px;max-width:calc(100vw - 16px)}.dp-fmt-row{display:flex;gap:4px;align-items:center;flex-wrap:wrap}" +
    ".dela.nl .dp-fmt button.dp-fmt-b{background:transparent;border:1px solid transparent;border-radius:7px;min-width:34px;min-height:32px;padding:2px 9px;color:var(--ink);font-weight:600;font-size:14px;box-shadow:none}.dela.nl .dp-fmt button.dp-fmt-b:hover,.dela.nl .dp-fmt button.dp-fmt-b:focus-visible{background:var(--soft);border-color:var(--line)}" +
    ".dela.nl .dp-fmt button.dp-fmt-b.b{font-weight:800}.dela.nl .dp-fmt button.dp-fmt-b.i{font-style:italic;font-family:Georgia,serif}.dela.nl .dp-fmt button.dp-fmt-b.on{background:var(--pink-ink);color:#fff}.dela.nl .dp-fmt input.dp-fmt-url{width:260px;max-width:60vw;min-height:32px;padding:2px 8px;margin:0;font-size:14px}.dp-fmt-note{color:var(--bad);flex-basis:100%;padding:0 4px}.dp-fmt-note:empty{display:none}" +
    ".mp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px;margin:10px 0}.dela.nl .mp-grid .card.mp-card{margin:0;display:flex;flex-direction:column;gap:10px}.dela.nl .mp-card h3.mp-title{font-size:17px;line-height:1.3;margin:0;overflow-wrap:anywhere}.mp-text{margin:0;color:var(--ink);overflow-wrap:anywhere}.mp-price{font-weight:800;font-size:16px}" +
    ".mp-who{display:flex;gap:10px;align-items:center;margin-top:auto;padding-top:10px;border-top:1px solid var(--line)}.mp-face{width:40px;height:40px;border-radius:50%;object-fit:cover;flex:none;display:flex;align-items:center;justify-content:center}.mp-face.none{background:var(--pink);color:var(--pink-ink);font-weight:700}.mp-clip{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".dela.nl h2.mp-count{font-size:18px;margin:16px 0 0}.mp-foot{gap:12px;flex-wrap:wrap;align-items:center;margin:4px 0 10px}.mp-fresh{margin:8px 0}.mp-code{font-family:ui-monospace,Menlo,monospace}.mp-article p{margin:0 0 10px;overflow-wrap:anywhere}.mp-article .mp-who{margin:0 0 14px;padding:0 0 12px;border-top:0;border-bottom:1px solid var(--line)}" +
    ".ev-date{flex:none;width:52px;border:1px solid var(--line);border-radius:10px;overflow:hidden;text-align:center;background:var(--card)}.ev-mon{display:block;background:var(--pink-ink);color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 0}.ev-day{display:block;font-size:20px;font-weight:800;line-height:1.5;color:var(--ink)}" +
    ".ev-img{width:100%;height:140px;object-fit:cover;border-radius:10px}.ev-hero{width:100%;max-height:300px;object-fit:cover;border-radius:12px;margin-bottom:12px}.ev-rows{display:flex;flex-direction:column;margin:10px 0;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}" +
    ".ev-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid var(--line)}.ev-row:last-child{border-bottom:0}.dela.nl .ev-row .ev-title{font-weight:700;font-size:16px;text-align:left}.ev-rows>p{margin:12px 14px}" +
    ".ev-views{display:flex;gap:6px;align-items:center;margin-left:auto}.dela.nl .ev-views button.ev-view{background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:999px;min-height:36px;padding:4px 14px;font-weight:600;box-shadow:none}.dela.nl .ev-views button.ev-view[aria-pressed=true]{background:var(--pink);color:var(--pink-ink);border-color:var(--pink-ink)}" +
    ".ev-facts{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:0 0 12px}.ev-facts dt{font-weight:700;color:var(--muted)}.ev-facts dd{margin:0;overflow-wrap:anywhere}.dela.nl a.btn.blue{display:inline-flex;align-items:center;min-height:40px;padding:6px 16px;border-radius:10px;background:var(--pink-ink);color:#fff;font-weight:700;text-decoration:none}" +
    ".dp-sec{margin:26px 0 0}.dela.nl .dp-page h2.dp-h{font-size:19px;font-weight:800;margin:0 0 8px;padding:0 0 6px;border-bottom:2px solid var(--line);background:transparent;border-radius:0}.dela.nl .dp-page h3.dp-h3{font-size:16px;margin:14px 0 4px}" +
    ".dp-list{margin:0;padding:0 0 0 22px}.dp-list li{margin:2px 0;padding-left:2px}.dp-pair{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin:10px 0 0}.dp-pair-l{font-weight:700;font-size:14px;color:var(--muted)}.dp-pair .dp-t{flex:1;min-width:140px}" +
    ".dp-helper{margin-top:8px}.dp-imgsec{margin-top:10px}.dp-page .img-drop{outline:3px dashed var(--pink-ink);outline-offset:4px;border-radius:12px}" +
    ".dp-steps{display:flex;flex-direction:column}.dp-step{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border:1px solid transparent;border-radius:12px;position:relative}.dp-page:not(.ro) .dp-step:hover,.dp-step:focus-within{border-color:var(--line);background:rgba(11,18,32,.015)}.dp-step.attorney{border-left:4px solid var(--bad)}" +
    ".dp-step.dragging{opacity:.45}.dp-step.drop-before{box-shadow:0 -3px 0 0 var(--pink-ink)}.dp-step.drop-after{box-shadow:0 3px 0 0 var(--pink-ink)}" +
    ".dp-step-n{display:flex;align-items:center;gap:2px;flex:none;padding-top:2px}.dp-num{width:30px;height:30px;border-radius:50%;background:var(--pink);color:var(--pink-ink);font-weight:800;display:flex;align-items:center;justify-content:center;font-size:15px}" +
    ".dela .dp-handle{background:transparent;border:0;padding:4px 2px;min-height:30px;cursor:grab;color:var(--muted);opacity:.35;border-radius:6px}.dp-step:hover .dp-handle,.dp-step:focus-within .dp-handle,.dela .dp-handle:focus-visible{opacity:1}.dela .dp-handle .ic{width:16px;height:16px}.dp-page.ro .dp-step-n{padding-left:20px}" +
    ".dp-step-b{flex:1;min-width:0}.dp-step-text{font-size:16px}.dp-stage{font-weight:800}.dp-tags{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px}.dp-tags:empty{display:none}.dp-tag{font-size:12.5px;background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:2px 10px;color:var(--ink);overflow-wrap:anywhere}" +
    ".dp-meta{display:flex;gap:8px 12px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-top:4px;min-height:32px}.dp-meta .dp-tags{margin-top:0;flex:1 1 200px}.dp-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;opacity:.0;transition:opacity .12s}.dp-step:hover .dp-tools,.dp-step:focus-within .dp-tools{opacity:1}@media (hover:none){.dp-tools,.dela .dp-handle{opacity:1}}" +
    ".dela .dp-ic{background:transparent;border:1px solid var(--line);border-radius:8px;min-width:32px;min-height:32px;padding:2px 8px;color:var(--ink);font-weight:700}.dela .dp-ic.sure{border-color:var(--bad);color:var(--bad)}.dela .dp-ic[disabled]{opacity:.35}" +
    ".dp-details{margin-top:10px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--soft);display:flex;flex-direction:column;gap:8px}" +
    ".dela .dp-add{align-self:center;background:transparent;border:1px dashed transparent;color:var(--pink-ink);font-weight:700;font-size:12px;min-height:0;height:16px;line-height:14px;margin:-2px 0;padding:0 12px;border-radius:999px;opacity:0;transition:opacity .12s}.dp-steps:hover .dp-add,.dela .dp-add:focus-visible,.dela .dp-add.end{opacity:1}.dela .dp-add:hover,.dela .dp-add:focus-visible,.dela .dp-add.end{border-color:var(--pink-ink)}.dela .dp-add.end{min-height:40px;height:auto;line-height:1.3;margin:8px 0 0;align-self:flex-start;padding:6px 16px;font-size:14px}@media (hover:none){.dela .dp-add{opacity:1}}" +
    ".dela .img-move{font-size:12px;min-height:28px;padding:2px 6px;border-radius:8px;max-width:130px}" +
    ".dw-2{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;align-items:start}@container (min-width:820px){.dw-2{grid-template-columns:minmax(0,2.2fr) minmax(250px,1fr)}}.dw-2>.card{margin:0}.dw-chat-card .composer{bottom:8px}.dw-fresh .composer{position:static}.dela.nl .dw-2 .dw-chat-card .composer{background:var(--card);padding-top:10px}" +
    ".dw-review{border:1px solid #e8c97a;background:#fff3d6;color:#4a3200;border-radius:12px;padding:12px 14px;margin-top:10px}.dw-review .hsub{color:inherit}" +
    // Step 74: the member's own tags and private note on a bookmark (blue, so they do not read as the freelancer's own pink tags)
    ".bm-note{border-top:1px solid var(--line);margin-top:12px;padding-top:10px;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}.bm-away .bm-note{border-top:0;margin-top:0;padding-top:0;margin-bottom:10px}.bm-tags{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.bm-note-text{flex:1 1 260px;margin:0;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}" +
    ".dela .bm-tag{min-height:0;padding:3px 10px;border-radius:999px;border:1px solid #b9d9f4;background:var(--bluebg);color:var(--ink);font-size:12px;font-weight:600}.bm-edit{flex:1 1 100%;display:grid;gap:8px}.bm-edit label,.bm-f{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600}.bm-edit input,.bm-edit textarea{width:100%}" +
    ".bm-filter-row{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}.bm-cats{display:contents}.bm-f{flex:1 1 170px}.bm-f select{width:100%}" +
    // Step 19: the Subscription page (four areas as tabs; on a phone the tabs become four equal buttons with short names)
    ".sub-tabs{display:flex;flex-wrap:wrap;gap:4px;margin:10px 0;border-bottom:1px solid var(--line)}.dela .sub-tabs button{background:transparent;border:0;border-bottom:3px solid transparent;border-radius:8px 8px 0 0;color:var(--muted);font-weight:700;padding:10px 14px;min-height:44px}" +
    ".dela .sub-tabs button[aria-selected=true]{color:var(--pink-ink);border-bottom-color:var(--pink-ink);background:var(--pink)}.dela .sub-tabs button:focus-visible,.dela .sub-cycle button:focus-visible{outline:2px solid var(--pink-ink);outline-offset:2px}.st-short{display:none}" +
    ".sub-panel:focus-visible{outline:2px solid var(--pink-ink);outline-offset:4px}.sub-panel .card{margin:10px 0}.sub-hero{background:var(--sel)}.sub-eyebrow{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pink-ink);margin:0 0 4px}" +
    ".sub-group{font-size:15px;margin:16px 0 4px;padding:8px 10px;background:var(--sel);border-radius:8px}.sub-line{padding:10px 0;border-top:1px solid var(--line)}.sub-group + .sub-line{border-top:0}" +
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
    ".mr-i{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border:1.5px solid var(--muted);color:var(--muted);border-radius:50%;font-size:11px;font-weight:700;text-decoration:none}.dela .mr-btn:focus-visible{outline:2px solid var(--pink-ink);outline-offset:2px}" +
    ".mr-panel{position:absolute;left:0;top:100%;z-index:40;width:min(320px,86vw);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px;box-shadow:0 4px 14px rgba(11,18,32,.1);font-size:14px;color:var(--ink)}.mr-list{margin:6px 0 0;padding:0;list-style:none}" +
    ".mr-list li{padding:3px 0 3px 24px;position:relative}.mr-list li:before{content:'✓';position:absolute;left:2px;color:#21613d;font-weight:700}@media (max-width:720px),(hover:none){.mr-wrap{display:block}.mr-panel{width:min(320px,calc(100vw - 32px))}}" +
    ".tp-head-grid{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(240px,340px);gap:18px 26px;align-items:start}.tp-head .tp-meta{margin-top:12px;gap:10px 0;overflow:hidden}.tp-head .tp-meta>span:not(.badge),.tp-head .tp-meta>span:not(.badge):first-child{margin-left:-15px;padding:0 29px 0 14px;border-left:1px solid #b9d9f4}.tp-head .tp-photo{margin:4px}.tp-head-acts{display:flex;flex-direction:column;gap:10px}.tp-head-acts .tp-invite{margin:0;padding:0;border-top:0;flex-direction:column;align-items:stretch;gap:6px}" +
    ".tp-head-acts .talent-gig{flex:0 0 auto;flex-direction:column;align-items:stretch;gap:2px;padding-left:0;border-left:0}.tp-head-acts .talent-gig select{width:100%}.tp-head-acts button{min-height:44px}" +
    "@media (max-width:900px){.tp-head-grid{grid-template-columns:auto minmax(0,1fr);gap:14px 18px}.tp-head-acts{grid-column:1 / -1}.tp-head-acts .tp-top-acts{justify-content:flex-start}.tp-head-acts button{flex:1 1 auto}}" +
    // Stacey 2026-11-13: the ready-made pictures are see-through drawings, so every picture sits on the light pink of the initial circle
    "img.talent-photo,img.face,.av-opt img{background:#fbeef2}" +
    // Stacey 2026-11-13: the platform's colors changed (page #F5F5F7, text #0B1220, secondary text #475569, card border #DCE3EA,
    // card heading band #EAF1F8, changed the same day to the grey #E2E4E8, and #2B303C in the dark look); the menus keep the colors they had
    ".nl-side,.nl-bar,.nl-sheet{--ink:#1c2230;--muted:#5f6675;--line:#e6e7ec}" +
    ".dela .card.mt-card{padding:0;overflow:hidden}.mt-head{background:var(--head);color:var(--ink);padding:14px 20px;align-items:center;gap:10px}.mt-head h2{font-size:18px}.mt-body{padding:16px 20px 18px}.dela.nl .mt-head{padding:12px 16px}.dela.nl .mt-body{padding:14px 16px}" +
    // Step 29 (Stacey's review of 2026-11-13): the Filters panel, two-line summaries, and the action cost on the DELA bar
    ".talent-filters{border-top:1px solid var(--line);margin-top:10px;padding-top:10px}.talent-filters[hidden]{display:none}.dela .talent-go2 .talent-clear{min-height:44px}" +
    // Fix (ChatGPT check 4, 2026-11-17): a closed menu showed its empty white panel behind the button, and the button
    // was filled dark red. A closed menu shows nothing, and the button looks like the outlined buttons beside it.
    ".dela details.dmenu:not([open])>.menu-panel{display:none}.dela details.dmenu>summary.btn{background:var(--card);color:var(--brand);border:1.5px solid var(--line);border-radius:8px;padding:8px 14px;font-size:14px;font-weight:700}" +
    ".dela details.dmenu>summary.btn:hover{border-color:var(--brand)}.dela details.dmenu>summary.btn:focus-visible{outline:3px solid #0d83dd;outline-offset:2px}.dela details.dmenu{border:0;background:transparent;box-shadow:none;padding:0;margin:0}" +
    // Fix (Stacey's screenshot, 2026-11-17): an open menu lay under the "⋯" button of the row below it. The open menu
    // as a whole is lifted above the rows after it (the panel's own layer does not reach out of the menu in new browsers).
    // Fix (2026-11-17): these menus are "dmenu". They were "menu", the class of the older account menu, and took its
    // width (220 pixels), its box and its place, which is what drew a white box behind each button.
    ".dela details.dmenu[open]{z-index:30}" +
    ".dela details.dmenu{position:relative;display:inline-block}.dela details.dmenu>summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;min-height:40px}.dela details.dmenu>summary::-webkit-details-marker{display:none}" +
    ".menu-panel{position:absolute;z-index:5;left:0;top:calc(100% + 4px);min-width:230px;background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 24px rgba(11,18,32,.14);padding:6px;display:flex;flex-direction:column;gap:2px}" +
    ".thread-acts details.dmenu .menu-panel{left:auto;right:0}.dela .menu-item{background:transparent;border:0;color:var(--ink);text-align:left;justify-content:flex-start;padding:10px 12px;min-height:44px;border-radius:8px;font-weight:600;width:100%;white-space:normal}.dela .menu-item:hover,.dela .menu-item:focus-visible{background:var(--soft)}" +
    ".ai-suggest{margin-top:10px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--sel)}.ai-suggest[hidden]{display:none}.thread-head h1{overflow-wrap:anywhere}" +
    ".msg-day{display:flex;align-items:center;gap:10px;margin:10px 0;color:var(--muted);font-size:12px}.msg-day::before,.msg-day::after{content:'';flex:1 1 auto;border-top:1px solid var(--line)}" +
    // Stacey 2026-11-17: no pink behind unread rows. Every row is the card color (white in the light look, the dark card
    // in the dark look); unread is the blue dot and the bold title.
    // Step 32 (Stacey's second Inbox and messages mockups, 2026-11-17): a list with dividers and a quick preview; chat
    // bubbles as wide as their words; a compact removed line; the thread panel beside the conversation
    ".inbox-cols.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}.inbox-cols.two>.card{margin:12px 0}.inbox-list{list-style:none;margin:0;padding:0}.inbox-list>li+li{border-top:1px solid var(--line)}" +
    ".dela .inbox-list .inbox-row{border:0;border-radius:8px;margin:2px 0;padding:12px 8px;background:transparent}.dela .inbox-list .inbox-row:hover{background:var(--soft)}.dela .inbox-list .inbox-row.sel{background:var(--sel)}.inbox-chev{flex:0 0 auto;color:var(--muted);font-size:22px;line-height:1}" +
    ".inbox-context{padding:10px 12px;border-radius:10px;margin:12px 0}.inbox-label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0 0 4px}.peek-msg{margin:8px 0}" +
    ".peek-bubble{display:inline-block;max-width:100%;padding:8px 12px;border-radius:12px;background:var(--bluebg);border:1px solid var(--line);overflow-wrap:anywhere;white-space:pre-wrap}" +
    ".dela .privacy-link{display:inline-flex;gap:6px;align-items:center;font-weight:700;min-height:44px}.notice-i.small-i{width:16px;height:16px;line-height:12px;font-size:11px;border-width:1.5px;margin:0}" +
    ".thread-cols.replying{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(280px,1fr);gap:16px;align-items:start}.thread-cols.replying>.thread-side{margin:12px 0}.dela .thread-back{display:none}" +
    "@media (max-width:999px){.thread-cols.replying{display:block}.thread-cols.replying .thread-main{display:none}.dela .thread-back{display:inline-flex}}" +
    ".msg-wrap{display:flex;flex-direction:column;align-items:flex-start;margin:10px 0}.msg-wrap.mine{align-items:flex-end}.msg-wrap .msg{max-width:min(560px,85%);width:fit-content;margin:0;padding:8px 12px;border-radius:14px}" +
    ".msg-wrap.picked .msg{outline:2px solid #0d83dd;outline-offset:2px}.msg-meta{margin-top:3px}.msg-acts{margin-top:2px}.dela .msg-acts details.dmenu>summary.btn{min-height:32px;padding:2px 10px}.msg-wrap.mine .menu-panel{left:auto;right:0}" +
    ".msg-gone{text-align:center;margin:10px 0}.msg-gone-pill{display:inline-block;font-size:13px;color:var(--muted);background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:3px 12px}.dela .msg-file{margin-top:6px}" +
    ".thread-orig{background:var(--bluebg);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:10px 0}.thread-empty{text-align:center;padding:28px 12px}.thread-reply-box{border-top:1px solid var(--line);padding-top:12px;margin-top:10px}" +
    // Stacey 2026-11-17: no section of a page has a pink background (menus keep theirs). A chosen row, a highlighted
    // panel and DELA's suggestion boxes are a neutral grey (--sel), so the small colored tags inside them (pink "Gig",
    // blue "Introduction") stay easy to tell apart. Small things keep their own color: tags, chips, badges, initials.
    // Step 31: the Notifications page and the panel from the bell (Stacey's mockup of 2026-11-17)
    ".notices-tabs{margin:12px 0}.dela .notices-tabs button{min-height:44px}.notice-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:8px 0;min-height:60px}" +
    ".notice-row input[type=checkbox]{width:18px;height:18px;flex:0 0 auto}.notice-dot{flex:0 0 auto;width:10px;height:10px;border-radius:50%}.notice-dot.on{background:#0d6fd6}" +
    ".notice-main{flex:1 1 240px;min-width:0;display:flex;flex-direction:column;gap:2px}.notice-title{font-weight:600;overflow-wrap:anywhere}.notice-row.unread .notice-title{font-weight:800}.notice-body{color:var(--muted);overflow-wrap:anywhere}.notice-row.unread .notice-body{color:var(--ink)}" +
    ".notice-tag{flex:0 0 auto;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:#eaf4ff;color:#0b4f8f}.notice-tag.action{background:#fdeceb;color:#8a1c16}.notice-tag.payments{background:var(--okbg);color:#1f5c3a}.notice-tag.disputes{background:#fff3d6;color:#6b4700}.notice-tag.dismissed{background:var(--soft);color:var(--muted)}" +
    ".notice-when{flex:0 0 auto;white-space:nowrap}.notice-row .menu-panel{left:auto;right:0}.notice-line{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:2px 0}" +
    // Step 30: the Inbox list and the conversation view (Stacey's mockups of 2026-11-17)
    ".inbox-search label{display:block;font-weight:700;margin:8px 0 4px}.inbox-tabs{margin:12px 0}.dela .inbox-tabs button{min-height:44px}" +
    ".dela .inbox-row{display:flex;gap:12px;align-items:center;width:100%;text-align:left;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:8px 0;min-height:64px;font-weight:400;white-space:normal;cursor:pointer}" +
    ".dela .inbox-row:hover{border-color:var(--pink-ink)}.dela .inbox-row:focus-visible{outline:3px solid #0d83dd;outline-offset:2px}" +
    ".inbox-dot{flex:0 0 auto;width:10px;height:10px;border-radius:50%}.inbox-dot.on{background:#0d6fd6}.inbox-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:3px}" +
    ".inbox-top{display:flex;gap:10px;align-items:baseline}.inbox-name{flex:1 1 auto;min-width:0;font-weight:600;font-size:16px;overflow-wrap:anywhere}.inbox-row.unread .inbox-name{font-weight:800}.inbox-when{flex:0 0 auto;white-space:nowrap}" +
    ".inbox-about{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.inbox-kind{font-size:12px;font-weight:700;padding:2px 9px;border-radius:999px;background:var(--pink);color:var(--pink-ink);border:1px solid transparent}" +
    ".inbox-kind.intro{background:#eaf4ff;color:#0b4f8f}.inbox-title{font-size:14px;overflow-wrap:anywhere}.inbox-prev{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;color:var(--muted)}.inbox-row.unread .inbox-prev{color:var(--ink)}" +
    ".inbox-count{flex:0 0 auto;min-width:24px;height:24px;line-height:24px;text-align:center;border-radius:999px;background:var(--brand);color:#fff;font-size:12px;font-weight:700;padding:0 7px}" +
    ".talent-help-ico{font-size:22px;color:var(--pink-ink);line-height:1;flex:0 0 auto}.talent-cost-i{display:inline-block;width:15px;height:15px;line-height:13px;margin-left:6px;border:1px solid currentColor;border-radius:50%;font-size:11px;font-weight:700;text-align:center;font-style:normal}" +
    ".dela #talent-filters-btn{display:inline-flex;align-items:center;gap:8px}#talent-filters-btn .ic{width:18px;height:18px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}" +
    ".talent-help-safe{display:flex;gap:8px;align-items:center}.talent-help-safe .ic{width:18px;height:18px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}" +
    ".talent-sum{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.talent-facts{margin-top:6px}" +
    ".talent-help-btn .talent-cost{flex:0 0 auto}@media (max-width:560px){.dela .talent-help-btn{flex-wrap:wrap}.talent-help-btn .talent-cost{white-space:normal;border-radius:12px;order:3;flex:1 1 100%}}" +
    "@media (max-width:980px){.talent-card .talent-acts{flex-direction:row;flex-wrap:nowrap}.talent-card .talent-acts button{flex:1 1 0;width:auto}}" +
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
    ".steps li.done{background:var(--okbg);border-color:var(--okline)}.steps li.now{background:var(--sel);border:2px solid var(--brand)}",
    ".steps i{display:inline-flex;width:28px;height:28px;border-radius:50%;align-items:center;justify-content:center;font-style:normal;font-weight:800;background:var(--card);border:1px solid var(--line);margin-bottom:6px}",
    ".steps li.done i{background:var(--ok);color:#fff;border-color:var(--ok)}.steps li.now i{background:var(--brand);color:#fff;border-color:var(--brand)}",
    ".flow{border:1px solid #b9d9f4;background:var(--bluebg);border-radius:16px;padding:16px;margin-top:14px}.flow.strong{border:2px solid var(--brand);background:var(--sel)}",
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
    ".msg.user{align-self:flex-end;background:var(--bluebg);color:var(--ink);border-bottom-right-radius:6px}.msg.assistant{align-self:flex-start;background:var(--card);border:1px solid var(--line);border-bottom-left-radius:6px}" +
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
    ".dela.nl .card{border-radius:12px;padding:14px 16px;margin:12px 0;box-shadow:none}.dela.nl .soft{border-radius:10px}.dela.nl .notice.bad,.dela.nl .notice.ok{border-radius:10px}" +
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
    // Step 33: Home as widgets in the member's order, and the Customize panel
    ".home-top{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px}.home-top h1,.dela.nl .home-top h1{margin:0 0 2px}.home-top p{margin:0}.home-top .ic{width:18px;height:18px}" +
    ".home-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-items:stretch}.home-grid>.card,.dela.nl .home-grid>.card{margin:0;min-width:0}.hw{display:flex;flex-direction:column}.hw-foot{margin-top:auto;padding-top:10px}.hw-quick{display:flex;flex-wrap:wrap;gap:8px}" +
    "@media (min-width:1000px){.home-grid.cols{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-flow:row;gap:20px;align-items:start}.home-grid.cols.mz{grid-auto-flow:row dense;grid-auto-rows:4px;row-gap:0;margin-bottom:-20px}.home-grid.cols.mz>.card:nth-child(odd){grid-column:1}.home-grid.cols.mz>.card:nth-child(even){grid-column:2}}.home-grid .hrow{flex-wrap:wrap}.home-grid .hrow .what{flex:1 1 200px}.home-fixed>.card,.dela.nl .home-fixed>.card{margin:0 0 16px}#home-profile-bottom>.card,.dela.nl #home-profile-bottom>.card{margin:16px 0 0}" +
    "@media (min-width:1000px){.home-grid .hstats{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (min-width:1400px){.home-grid .hstats{grid-template-columns:repeat(4,minmax(0,1fr))}}.dela .cz-btn{min-width:40px;min-height:40px;padding:4px 8px;justify-content:center}.dela .cz-rm{min-height:40px;padding:4px 12px}" +
    ".usage-row{display:flex;align-items:center;gap:20px 28px;flex-wrap:wrap}.usage-ring{position:relative;width:148px;height:148px;flex:none;margin:4px auto}.usage-ring svg{width:100%;height:100%;display:block}" +
    ".usage-mid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.15}.usage-mid b{font-size:28px;font-weight:800;color:var(--ink)}.usage-mid span{font-size:13px;color:var(--muted)}" +
    ".acct-row .hstatus{flex-direction:column;align-items:flex-start;gap:10px;border:0;padding:0;background:transparent}.acct-row .hstatus>.hsub{margin-left:0 !important}.acct-row .usage-ring{width:120px;height:120px}.acct-row .usage-mid b{font-size:24px}" +
    ".usage-side{flex:1 1 200px;min-width:0;display:flex;flex-direction:column;gap:14px}.usage-side .bar{margin:6px 0 0}" +
    ".hstats.two,.home-grid .hstats.two{grid-template-columns:repeat(2,minmax(0,1fr))}.hw-line{gap:4px 10px;flex-wrap:wrap;align-items:baseline}.dela select.hw-period{width:auto;min-height:36px;padding:4px 28px 4px 10px;font-size:14px}.hw-tip{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:var(--sel);border-radius:10px;padding:10px 12px;font-size:14px}" +
    ".hw-bars{list-style:none;margin:0;padding:0;display:flex;gap:8px;align-items:flex-end;height:96px}.hw-bars li{flex:1 1 0;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;min-width:0}.hw-bar{flex:1 1 auto;width:100%;max-width:40px;display:flex;align-items:flex-end;background:var(--soft);border-radius:6px 6px 0 0;overflow:hidden}.hw-bar i{display:block;width:100%;background:var(--blue);border-radius:6px 6px 0 0}.hw-bar-l{font-size:12px;color:var(--muted)}" +
    "@media (max-width:480px){.cz-row{flex-wrap:wrap}.cz-row .cz-name{flex:1 1 55%}.cz-row.avail{flex-wrap:nowrap}}" +
    ".home-seg{display:inline-flex;border:1.5px solid var(--line);border-radius:10px;overflow:hidden;background:var(--card)}.home-seg[hidden]{display:none}.dela .home-seg button{border:0;border-radius:0;min-height:40px;padding:6px 14px;background:transparent;color:var(--ink);font-weight:600}.dela .home-seg button[aria-pressed=true]{background:var(--sel);color:var(--brand);font-weight:800;box-shadow:inset 0 -3px 0 var(--brand)}" +
    ".hw-team{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:10px}.hw-team li{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 14px;border-top:1px solid var(--line);min-height:44px}.hw-team li:first-child{border-top:0}.hw-bars.pair .hw-bar{gap:2px;background:transparent;align-items:flex-end}.hw-bars.pair .hw-bar i{width:50%}.hw-bar i.b,.hw-key i.b{background:var(--ok)}.hw-key i{display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--blue);vertical-align:baseline;margin-left:6px}" +
    ".ag-hours-box{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}.dela input.ag-hours{width:84px;min-height:36px;padding:4px 8px}" +
    ".dela-scrim.light{background:rgba(15,18,30,.16)}.cz-ask{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:14px 0 0;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;background:var(--sel)}.cz-ask[hidden]{display:none}.cz-def{display:inline-block;margin-left:8px;padding:1px 7px;border-radius:999px;background:var(--soft);color:var(--muted);font-size:11px;font-weight:600;vertical-align:middle}" +
    ".hw-amount{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.hw-amount b{font-size:30px;font-weight:800;line-height:1.1;color:var(--ink)}.hw-amount span{font-size:13px;color:var(--muted)}.hw-same{margin:0 0 8px}.hw-lines{display:flex;flex-direction:column;gap:14px}" +
    // The Customize panel: Close sits in its own bar, so rows never scroll under it; the bottom holds the question and the two buttons
    ".cz-panel .drawer-top{height:auto;background:var(--card);margin:-16px -16px 0;padding:10px 16px 6px}.cz-bottom{position:sticky;bottom:-16px;background:var(--card);margin-top:16px;padding-top:1px}.cz-bottom .cz-foot{position:static;margin-top:0}.cz-bottom .cz-ask{margin:10px 0}" +
    ".dela .home-dash .linkish,.dela.nl .home-dash .linkish{display:inline-flex;align-items:center;min-height:24px;padding:2px 0}.home-dash .hacts{gap:8px 16px}" +
    // Step 38: posting a gig in three steps
    ".gs-page [hidden],#gs-step2[hidden],#gs-step3[hidden]{display:none!important}" +
    ".gs-steps{list-style:none;display:flex;flex-wrap:wrap;gap:8px 22px;margin:0 0 14px;padding:12px 14px;background:var(--card);border:1px solid var(--line);border-radius:12px}.gs-steps li{display:flex;align-items:center;gap:8px;color:var(--muted);font-weight:600}.gs-steps li.now{color:var(--pink-ink);font-weight:800}.gs-steps li.done{color:var(--ink)}" +
    ".gs-n{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;border:2px solid currentColor;font-size:14px;flex:none}.gs-steps li.now .gs-n{background:var(--pink-ink);border-color:var(--pink-ink);color:#fff}" +
    ".gs-cols{display:grid;grid-template-columns:minmax(0,1fr);gap:0 20px;align-items:start}@media (min-width:1100px){.gs-cols{grid-template-columns:minmax(0,2fr) minmax(260px,1fr)}}.gs-main,.gs-side{min-width:0}.gs-page .card,.dela.nl .gs-page .card{margin:0 0 16px}" +
    ".gs-label{display:block;font-weight:700;margin:8px 0 4px}.gs-set{border:0;margin:0;padding:0;min-width:0}.gs-set legend{padding:0;margin-bottom:10px}.gs-kinds{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px}" +
    ".gs-kind{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border:1.5px solid var(--line);border-radius:12px;font-weight:400;cursor:pointer;min-height:44px}.gs-kind:has(input:checked){border-color:var(--pink-ink);box-shadow:inset 0 0 0 1px var(--pink-ink)}.gs-kind:focus-within{outline:2px solid #0d83dd;outline-offset:2px}.dela .gs-kind input{width:20px;height:20px;min-height:0;margin:2px 0 0;flex:none}" +
    ".gs-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));gap:4px 14px}.gs-field{min-width:0}.gs-money{display:flex;align-items:center;gap:6px}.gs-money input{flex:1 1 auto;min-width:0}.dela .gs-page input[type=number],.dela .gs-page input[type=date],.dela .gs-page select{width:100%;min-height:44px}" +
    ".gs-err{color:var(--bad);font-weight:600;font-size:14px;margin:6px 0 0}.gs-err[hidden]{display:none}.dela .gs-page [aria-invalid=true]{border-color:var(--bad);box-shadow:0 0 0 1px var(--bad)}.gs-protect{margin-top:14px;padding:12px 14px;border-radius:10px;background:#e8f2fc;color:#0b1220;border:1px solid #b9d7f3;font-size:14px}" +
    // Step 45: Ask DELA as a workspace. The chat at the left, "What DELA is using" beside it; one column when narrow
    ".aw-wrap{container-type:inline-size}.aw-cols{display:grid;grid-template-columns:minmax(0,1fr);gap:0 20px;align-items:start}@container (min-width:860px){.aw-cols{grid-template-columns:minmax(0,1.9fr) minmax(280px,1fr)}}.aw-main,.aw-side{min-width:0}.aw-side .card,.dela.nl .aw-side .card{margin:0 0 16px}.dela .aw-side h2{margin:0 0 6px;font-size:1.1rem}.dela .aw-h3{margin:12px 0 6px;font-size:.95rem}.aw-lead{margin:6px 0 0;font-size:1.25rem;font-weight:700;color:var(--ink)}" +
    ".aw-docs{list-style:none;margin:0 0 8px;padding:0}.aw-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 10px;padding:8px 0;border-top:1px solid var(--line)}.aw-docs .aw-row:first-child,#aw-firm{border-top:0}.aw-row-t{flex:1 1 150px;min-width:0;display:flex;flex-direction:column;gap:2px;overflow-wrap:anywhere}.dela .aw-x{min-height:32px}.aw-pick{border:0;margin:8px 0 0;padding:0;min-width:0;max-height:260px;overflow:auto}.aw-opt{display:flex;gap:8px;align-items:flex-start;font-weight:400;padding:8px 4px;border-top:1px solid var(--line);cursor:pointer}.dela .aw-opt input{width:20px;height:20px;min-height:0;margin:2px 0 0;flex:none}" +
    ".dela .aw-act{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;min-height:44px;margin:0 0 8px;padding:10px 12px;background:var(--card);color:var(--ink);border:1.5px solid var(--line);border-radius:10px;text-align:left;font-weight:400}.dela .aw-act:hover{background:var(--soft)}.dela .aw-act b{color:var(--pink-ink)}.aw-choices{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:2px 0 4px}.dela .aw-choices button{min-height:40px}" +
    // Step 47: a suggested edit, now and proposed side by side; one under the other when narrow
    ".sg-diff{margin:10px 0 4px;container-type:inline-size}.dela .sg-part{margin:10px 0 6px;font-size:.95rem}.sg-cols{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}@container (min-width:560px){.sg-cols{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}.sg-col{min-width:0;border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--soft)}.sg-col-h{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}.sg-lines{list-style:none;margin:0;padding:0}.sg-lines li{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:baseline;padding:4px 0;overflow-wrap:anywhere}.sg-lines li.sg-removed span:last-child{text-decoration:line-through}.sg-lines li.sg-new span:last-child,.sg-lines li.sg-changed span:last-child{font-weight:600}" +
    // Step 44: step 1 of a new gig is one form card with three headings and thin dividers
    ".gs-sec{padding:18px 0;border-top:1px solid var(--line)}.gs-sec:first-child{border-top:0;padding-top:0}.gs-sec:last-child{padding-bottom:0}.dela .gs-sec h2{margin:0 0 8px;font-size:1.25rem}.gs-set legend h2{margin:0}.gs-costhost{margin-top:12px;padding:10px 12px;border:1px solid var(--line);border-radius:10px}.gs-acts-note{flex:1 1 220px;margin:0;min-width:0}.gs-field[hidden],.gs-form p[hidden]{display:none}" +
    ".gs-costline{gap:10px;padding:6px 0;border-top:1px solid var(--line);font-size:14px}.gs-costline:first-child{border-top:0}.gs-costline.strong{font-size:16px;background:var(--sel);margin:6px -8px 0;padding:8px;border-radius:8px;border-top:0}.gs-next{margin:0;padding-left:20px;display:grid;gap:10px}.gs-next li.now b{color:var(--pink-ink)}" +
    ".gs-dl{margin:8px 0 12px;display:grid;gap:10px}.gs-dl dt{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}.gs-dl dd{margin:2px 0 0}.dela .gs-acts button,.dela #gs-step2 .row>button,.dela #gs-step3 .row>button{min-height:44px}@media (max-width:520px){.dela .gs-acts .row>button{flex:1 1 100%}.gs-acts .grow{display:none}}" +
    // Step 37: Projects as a workspace
    ".pj-top{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px}.pj-new .menu-panel{left:auto;right:0}.dela .pj-new>summary.btn{min-height:44px}" +
    ".pj-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0 0 14px}@media (min-width:1000px){.pj-tiles{grid-template-columns:repeat(4,minmax(0,1fr))}}@media (max-width:420px){.pj-tiles{grid-template-columns:minmax(0,1fr)}}" +
    ".dela .pj-tile{display:flex;align-items:center;gap:12px;min-height:64px;padding:12px 14px;background:var(--card);color:var(--ink);border:1.5px solid var(--line);border-radius:12px;text-align:left;font-weight:400}.dela .pj-tile:hover{background:var(--soft)}.dela .pj-tile.hot{border-color:var(--pink-ink)}" +
    ".pj-tile>span:nth-child(2){flex:1 1 auto;min-width:0;display:flex;flex-direction:column;line-height:1.2}.pj-tile b{font-size:24px;font-weight:800}.pj-tile svg.ic{width:18px;height:18px;color:var(--muted);flex:none}.pj-ic{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:var(--sel);color:var(--brand);flex:none}.pj-ic svg.ic{width:22px;height:22px;color:inherit}" +
    ".pj-tabs{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 14px;border-bottom:1px solid var(--line)}.dela .pj-tabs button{background:transparent;border:0;border-bottom:3px solid transparent;border-radius:0;color:var(--muted);font-weight:700;padding:10px 14px;min-height:44px}.dela .pj-tabs button[aria-selected=true]{color:var(--pink-ink);border-bottom-color:var(--pink-ink)}" +
    "#pj-panel:focus-visible{outline:2px solid var(--pink-ink);outline-offset:4px}#pj-panel .card,.dela.nl #pj-panel .card{margin:0 0 16px}.pj-cols{display:grid;grid-template-columns:minmax(0,1fr);gap:0 20px;align-items:stretch}.pj-colwrap{container-type:inline-size}@container (min-width:860px){.pj-cols{grid-template-columns:minmax(0,1.9fr) minmax(320px,1fr)}#pj-panel .pj-col .pj-quicks{flex:1 1 auto;max-height:260px;grid-auto-rows:minmax(56px,1fr)}}.pj-col{min-width:0;display:flex;flex-direction:column}#pj-panel .pj-col>.card{flex:1 1 auto;display:flex;flex-direction:column}.pj-col>.card>*{flex:0 0 auto}.dela .pj-col #pj-more{align-self:flex-start}.pj-uprow .pj-ups{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:12px;margin-top:12px}.dela .pj-uprow .pj-up .pj-up-b{flex-direction:column;flex-wrap:nowrap;align-items:flex-start;justify-content:flex-start;gap:8px;height:100%;padding:12px;border:1.5px solid var(--line);border-radius:10px}.pj-uprow .pj-up-t{flex:0 0 auto;width:100%}.pj-uprow .pj-up-d{margin-top:auto;flex-wrap:wrap;white-space:normal}.pj-full{container-type:inline-size;container-name:pjcol}.pj-table td:last-child button{white-space:nowrap}" +
    ".pj-cardhead{gap:8px;align-items:center;flex-wrap:wrap}.pj-list{list-style:none;margin:8px 0 0;padding:0}.pj-item{display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--line)}.pj-item:first-child{border-top:0}.pj-item .badge{white-space:nowrap}.dela .pj-item button{min-height:40px}#pj-more{margin-top:6px}" +
    ".pj-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:14px}.pj-table th,.pj-table td{text-align:left;padding:10px 8px;border-top:1px solid var(--line);vertical-align:middle;font-weight:400}.pj-table thead th{border-top:0;font-size:13px;color:var(--muted);font-weight:700;padding-top:4px}.pj-table td:last-child,.pj-table thead th:last-child{text-align:right}.pj-bar{display:block;height:6px;margin-top:4px;max-width:140px}" +
    // Step 40: upcoming milestones that keep a readable width, the always-visible note, column help and folded arrangements
    ".pj-ups{list-style:none;margin:8px 0 0;padding:0}.dela .pj-up-b{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;justify-content:space-between;width:100%;min-height:44px;padding:10px 4px;background:transparent;border:0;border-top:1px solid var(--line);border-radius:0;color:var(--ink);text-align:left;font-weight:400}.pj-up:first-child .pj-up-b{border-top:0}.dela .pj-up-b:hover{background:var(--soft)}" +
    // Step 43: Agreement and work. The next action, the milestone rows, the summary and the folded sections
    ".eg-wrap{container-type:inline-size}.eg-cols{display:grid;grid-template-columns:minmax(0,1fr);gap:0 20px;align-items:start}@container (min-width:820px){.eg-cols{grid-template-columns:minmax(0,1.75fr) minmax(300px,1fr)}}.eg-main,.eg-side{min-width:0}.eg-main>.card,.eg-side>.card,.dela.nl .eg-main>.card,.dela.nl .eg-side>.card{margin:0 0 16px}" +
    ".eg-next{border-left:4px solid var(--pink-ink)}.eg-kicker{margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pink-ink)}.eg-next-h{align-items:center;flex-wrap:wrap;gap:8px}.dela .eg-next-t{margin:0;font-size:1.35rem}.eg-next-s{margin:4px 0 8px;font-weight:700}" +
    ".eg-next .badge[hidden],.eg-sec-body[hidden],.eg-ms-body[hidden],.eg-review[hidden]{display:none}.eg-amts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr));gap:10px;margin:12px 0}.eg-amts>div{position:relative;background:var(--soft);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}.eg-amts b{font-size:1.25rem}.eg-amts .eg-amt-total{background:var(--sel)}.eg-amts .hsub{display:inline-flex;align-items:center;gap:6px}" +
    ".eg-review{margin-top:12px;padding:14px;border:1.5px solid var(--line);border-radius:12px;background:var(--card)}.eg-review h3:focus-visible{outline:2px solid var(--pink-ink);outline-offset:3px}.eg-line{position:relative;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:4px 12px;padding:8px 0;border-top:1px solid var(--line)}.eg-line-l{display:inline-flex;align-items:center;gap:6px;min-width:0}.eg-line b{overflow-wrap:anywhere}.eg-line.plain b{font-weight:600;text-align:right}" +
    ".eg-line.strong,.eg-line.due{font-weight:700;padding:8px 10px;border-radius:8px;border-top:0;background:var(--soft)}.eg-line.due{background:var(--sel);margin-top:6px}.eg-sum h2+.eg-line{border-top:0}.eg-how-l{margin:8px 0 0;padding-left:18px;font-size:14px}.eg-how-l li{margin:6px 0}" +
    ".eg-mss{list-style:none;margin:10px 0 0;padding:0}.eg-ms{border-top:1px solid var(--line);padding:12px 0}.eg-ms:first-child{border-top:0}.eg-ms-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}.eg-ms-i{flex:0 0 auto;width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;border:2px solid var(--line);background:var(--soft)}.eg-ms.done .eg-ms-i{border-color:var(--ok);color:var(--ok)}" +
    ".eg-ms-t{flex:1 1 220px;min-width:0;display:flex;flex-direction:column;gap:2px;overflow-wrap:break-word}.eg-ms-st{display:flex;flex-wrap:wrap;gap:2px 14px;font-size:13px}.eg-ms-body{margin:10px 0 0 44px}@container (max-width:560px){.eg-ms-body{margin-left:0}}.dela .eg-ms-b{min-height:40px;min-width:64px}" +
    ".dela .card.eg-sec{padding:0}.eg-sec-h{display:flex;align-items:center;gap:8px;padding:6px 14px 6px 6px}.dela .eg-sec-hd{flex:1 1 auto;margin:0;min-width:0;font-size:1rem}.dela .eg-sec-b{display:flex;width:100%;align-items:center;justify-content:space-between;gap:12px;min-height:56px;padding:10px 14px;background:transparent;border:0;color:var(--ink);text-align:left;font-weight:400;border-radius:12px}.dela .eg-sec-b:hover{background:var(--soft)}" +
    ".eg-sec-t{display:flex;flex-direction:column;gap:2px;min-width:0}.eg-sec-t b{font-size:1.05rem}.eg-chev{flex:0 0 auto}.eg-sec-b[aria-expanded=true] .eg-chev{transform:rotate(180deg)}.eg-sec-body{padding:0 20px 16px;border-top:1px solid var(--line)}.eg-sec-body>.card,.dela.nl .eg-sec-body>.card{border:0;box-shadow:none;padding:16px 0 0;margin:0;background:transparent;border-radius:0}.eg-sec-body>.card+.card{border-top:1px solid var(--line);margin-top:16px}" +
    ".pj-up-t{flex:1 1 150px;min-width:0;display:flex;flex-direction:column;gap:2px;overflow-wrap:break-word}.pj-up-d{flex:0 0 auto;display:inline-flex;gap:6px;align-items:center;font-size:13px;font-weight:700;white-space:nowrap}" +
    ".pj-table tbody th[scope=row]{min-width:130px}.pj-about{background:var(--sel);border-radius:10px;padding:10px 14px;margin:0 0 14px;font-size:14px;line-height:1.5;color:var(--ink)}.pj-table thead th .help-q{margin-left:2px}" +
    ".standing-fold{border:1px solid var(--line);border-radius:12px;margin:10px 0}.standing-fold>summary{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;min-height:44px;padding:8px 12px;cursor:pointer;list-style:none;border-radius:12px}.standing-fold>summary::-webkit-details-marker{display:none}.standing-fold>summary:focus-visible{outline:2px solid var(--blue);outline-offset:2px}" +
    ".standing-word:after{content:' ▾'}.standing-fold[open] .standing-word:after{content:' ▴'}.standing-fold>.standing{margin:0 8px 8px!important}" +
    "@media (max-width:820px){.pj-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.pj-table thead .help-q{display:none}.pj-table,.pj-table tbody,.pj-table tr,.pj-table th,.pj-table td{display:block}.pj-table tr{border-top:1px solid var(--line);padding:10px 0}.pj-table tbody tr:first-child{border-top:0}.pj-table th,.pj-table td{border:0;padding:3px 0}.pj-table td:before{content:attr(data-label) \": \";font-size:12px;color:var(--muted);font-weight:700;display:block}.pj-table td:last-child{text-align:left;padding-top:8px}.pj-table td:last-child:before{content:none}}" +
    "@container pjcol (max-width:700px){.pj-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.pj-table thead .help-q{display:none}.pj-table,.pj-table tbody,.pj-table tr,.pj-table th,.pj-table td{display:block}.pj-table tr{border-top:1px solid var(--line);padding:10px 0}.pj-table tbody tr:first-child{border-top:0}.pj-table th,.pj-table td{border:0;padding:3px 0}.pj-table td:before{content:attr(data-label) \": \";font-size:12px;color:var(--muted);font-weight:700;display:block}.pj-table td:last-child{text-align:left;padding-top:8px}.pj-table td:last-child:before{content:none}}" +
    ".pj-quicks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.dela .pj-quick{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:56px;padding:10px 12px;background:var(--card);color:var(--ink);border:1.5px solid var(--line);border-radius:10px;text-align:left;font-weight:400}.dela .pj-quick:hover{background:var(--soft)}.dela input.pj-find{width:min(280px,100%);min-height:40px}" +
    ".drawer.cz-panel{width:min(440px,100%)}.cz-head{align-items:center;gap:10px;margin:0 0 8px}.cz-head h3,.cz-panel h3{margin:0 0 8px}.cz-head h3{margin:0}" +
    ".cz-list{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:10px}.cz-row{display:flex;align-items:center;gap:10px;padding:6px 10px;border-top:1px solid var(--line);min-height:52px;background:var(--card)}.cz-row:first-child{border-top:0;border-radius:10px 10px 0 0}.cz-row:last-child{border-radius:0 0 10px 10px}.cz-row:only-child{border-radius:10px}" +
    ".cz-row.drag{background:var(--sel);box-shadow:0 4px 14px rgba(11,18,32,.18);position:relative;z-index:2}.cz-grip{cursor:grab;touch-action:none;display:inline-flex;align-items:center;justify-content:center;width:32px;height:44px;color:var(--muted);flex:none}.cz-ic{color:var(--brand);display:inline-flex;flex:none}.cz-name{font-weight:600;min-width:0}" +
    ".cz-row .menu-panel{left:auto;right:0}.dela .cz-row details.dmenu>summary.btn{min-height:40px;padding:4px 10px}" +
    ".dela input.cz-switch{-webkit-appearance:none;appearance:none;flex:none;width:42px;min-width:42px;height:24px;min-height:0;padding:0;margin:0;border:0;border-radius:999px;background:var(--muted);position:relative;cursor:pointer;transition:background .15s}.dela input.cz-switch:after{content:\"\";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .15s}" +
    ".dela input.cz-switch:checked{background:var(--brand)}.dela input.cz-switch:checked:after{left:21px}.dela input.cz-switch:focus-visible{outline:3px solid #0d83dd;outline-offset:2px}" +
    ".cz-foot{position:sticky;bottom:-16px;background:var(--card);display:flex;gap:10px;justify-content:flex-end;padding:12px 0;margin-top:16px;border-top:1px solid var(--line)}" +
    ".hhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}.hhead h2{margin:0}.hgap{display:flex;flex-direction:column;gap:10px}" +
    ".hl{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:10px;overflow:hidden}" +
    ".hrow{display:flex;align-items:center;gap:12px;min-height:44px;padding:8px 14px;border:0;border-top:1px solid var(--line);border-radius:0;background:transparent;color:var(--ink);font:inherit;font-weight:400;text-align:left;width:100%;cursor:pointer}" +
    ".hrow:first-child{border-top:0}.hrow:hover{background:var(--soft)}div.hrow{cursor:default}div.hrow:hover{background:transparent}.hrow .what{flex:1 1 auto;min-width:0}.hrow .what b{display:block;font-weight:600}.hrow .sub,.hsub{font-size:13px;color:var(--muted)}" +
    ".hrow .act{color:var(--pink-ink);font-weight:600;font-size:14px;white-space:nowrap}.hrow svg.ic{color:var(--muted);width:18px;height:18px}" +
    ".hrow .badge{white-space:nowrap}@media (max-width:899px){.hrow{flex-wrap:wrap}.hrow .what{flex:1 1 0;min-width:55%}.hrow .badge{order:3}.hrow .act{order:6;flex-basis:100%}.hrow .act+svg.ic{order:4}.helig .hrow .sub{display:none}.helig .hrow{padding:6px 14px;gap:4px 12px}.helig .hrow .act{flex-basis:auto;margin-left:auto}}" +
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
    ".dela.nl .card>.hhead:first-child h2,.dela.nl .card>.row:first-child:has(>h2) h2{margin:0}" +
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
