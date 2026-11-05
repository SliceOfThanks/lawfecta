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
  D.limitText = function (e) {
    if (e.kind === "flag") return e.enabled ? "Included" : "Not in your plan";
    if (!e.enabled) return "Not in your plan";
    if (e.unlimited) return "No cap";
    var left = e.remaining === null ? e.limit : e.remaining;
    if (e.unit === "MB") return (e.limit >= 1000 ? (e.limit / 1000) + " GB" : e.limit + " MB");
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

  D.toast = function (app, text, bad) {
    var t = D.h("div", { class: "toast" + (bad ? " bad" : ""), role: "status", text: text });
    app.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
  };

  // Plain words for API error codes
  D.errorText = function (code) {
    var map = {
      forbidden: "Only the Lawfecta Team owner can do that.",
      wrong_type: "That value is the wrong kind (for example, words where a number goes).",
      bad_member_id: "Enter the member's BD member ID (a number).",
      never_signed_in: "That member has not opened DELA yet. Ask them to open DELA once, then try again.",
      last_owner: "DELA needs at least one owner.",
      bd_plan_in_use: "That BD plan ID is already linked to another DELA plan.",
      locked_setting: "That setting can only be changed at setup.",
      bad_value: "That value is not allowed.",
      not_a_draft: "That plan version is not a draft.",
      bad_plan: "That plan does not fit this side.",
      signed_out: "Your sign in ended. Refresh the page.",
      // AI and files (Step 2a)
      ai_off: "DELA's AI is not open for your account yet.",
      voice_off: "Talking to the AI is not open for your account yet. You can type instead.",
      paused: "This part of DELA is paused for a moment. Please try again soon.",
      on_hold: "Some actions are paused on your account. Contact the Lawfecta Team.",
      ai_not_set_up: "DELA's AI is still being set up. Please try again later.",
      no_credits_left: "You have used this month's included AI credits. Add your own AI key in AI settings, or upgrade your plan.",
      no_key: "You chose to use your own key, but no key is saved. Add one in AI settings, or switch back to Lawfecta's AI.",
      no_backup_credits: "Lawfecta credits cannot be used as a backup right now.",
      key_unreadable: "DELA could not read your saved key. Please add it again in AI settings.",
      encryption_not_set_up: "Adding your own key is not ready yet. Please try again later.",
      byok_off: "Adding your own key opens soon.",
      not_firm_owner: "Only the firm owner on a Business plan can add a key for the whole firm.",
      not_a_key: "That does not look like an AI key. Copy the whole key from your provider and paste it again.",
      bad_provider: "Choose OpenAI or Claude.",
      file_not_usable: "One of those files cannot go to the AI yet. Files waiting for your client information check, or still being checked, cannot be used.",
      too_many_files: "Attach up to 5 files at a time.",
      tick_needed: "Tick the box to confirm the file has no confidential client information.",
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
      no_side: "Choose your DELA side first.",
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
  D.CSS = [
    ":host{all:initial}",
    ".dela{--bg:#f4f5f7;--card:#ffffff;--ink:#1c2230;--muted:#5f6675;--line:#e6e7ec;--brand:#8b2146;--brand-ink:#ffffff;--blue:#0d83dd;--pink:#fbeef2;--pink-ink:#8b2146;",
    "--navy:#1d2030;--hero:linear-gradient(135deg,#1d2030 0%,#3a1a33 45%,#8b2146 100%);--hot:linear-gradient(120deg,#3a1238 0%,#8b2146 55%,#d23b62 100%);",
    "--ok:#2f7a4f;--warn:#a46a00;--bad:#b3261e;--soft:#f1f2f6;--shadow:0 10px 30px rgba(139,33,70,.10);--okbg:#e3f3ea;--okline:#b6dcc5;--bluebg:#eef6fd;",
    "font-family:Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:var(--ink);background:var(--bg);min-height:60vh;padding:0 0 88px;box-sizing:border-box;-webkit-font-smoothing:antialiased}",
    "@media (prefers-color-scheme:dark){.dela{--bg:#11131b;--card:#1a1d28;--ink:#eceef3;--muted:#a7adbb;--line:#2a2e3c;--brand:#c2416f;--pink:#2a1622;--pink-ink:#f19ab8;--soft:#222634;--shadow:none;--okbg:#17301f;--okline:#2b5a3b;--bluebg:#132233}}",
    ".dela *{box-sizing:border-box}",
    ".top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;background:linear-gradient(120deg,#1d1426,#3a1430);color:#fff;position:sticky;top:var(--dela-top,0px);z-index:5}",
    ".brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none}.brand img{width:34px;height:34px;border-radius:50%}",
    ".brand b{font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:20px;letter-spacing:.06em}.brand span{font-size:12px;font-weight:700;letter-spacing:.12em;opacity:.8;text-transform:uppercase}",
    ".grow{flex:1}",
    ".badge{display:inline-block;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:var(--soft);color:var(--ink);border:1px solid var(--line);white-space:nowrap}",
    ".badge.stage{background:#fff3d6;color:#7a5200;border-color:#e8c97a}.badge.C{background:#e3f3ea;color:#21613d;border-color:#b6dcc5}.badge.R{background:#e5f1fc;color:#0b5fa3;border-color:#b9d9f4}.badge.O{background:#fff3d6;color:#7a5200;border-color:#e8c97a}.badge.G{background:var(--pink);color:var(--pink-ink);border-color:#efc3d2}",
    ".avatar{width:36px;height:36px;border-radius:50%;background:#b8315e;color:#fff;font-weight:800;font-size:13px;display:inline-flex;align-items:center;justify-content:center;border:0;padding:0;cursor:pointer}",
    ".wrap{max-width:1040px;margin:0 auto;padding:16px}",
    "h1{font-size:28px;line-height:1.2;margin:18px 0 4px;font-weight:800;letter-spacing:-.01em}h2{font-size:19px;margin:0 0 8px;font-weight:800}h3{font-size:16px;margin:0 0 6px;font-weight:700}",
    "p{margin:0 0 10px}.muted{color:var(--muted)}.small{font-size:14px}",
    ".eyebrow{font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}",
    ".card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:20px;margin:14px 0;box-shadow:var(--shadow)}",
    ".hero{border-radius:24px;padding:24px;margin:16px 0;color:#fff;background:var(--hot);box-shadow:0 14px 34px rgba(139,33,70,.25)}.hero.navy{background:var(--hero)}",
    ".hero h2{font-size:30px;line-height:1.15;margin:8px 0 10px;color:#fff}.hero p{color:rgba(255,255,255,.9);max-width:560px}",
    ".hero .pill-white{background:#fff;color:var(--brand);border-color:#fff}",
    ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}",
    ".stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}@media (min-width:800px){.stats{grid-template-columns:repeat(4,1fr)}}",
    ".stat-tile{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;gap:12px;align-items:flex-start}",
    ".chip{width:38px;height:38px;border-radius:50%;background:var(--pink);color:var(--pink-ink);display:inline-flex;align-items:center;justify-content:center;font-weight:800;flex:none}",
    ".tile{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;gap:12px;align-items:flex-start}.tile.col{flex-direction:column;gap:2px}",
    ".soon{font-size:11px;font-weight:800;color:var(--blue);text-transform:uppercase;letter-spacing:.08em}",
    ".notice{border-left:4px solid var(--brand);background:var(--pink);color:var(--ink);padding:12px 14px;border-radius:12px;margin:12px 0;font-size:14px}",
    ".notice.bad{border-color:var(--bad);background:#fdeceb}.notice.ok{border-color:var(--ok);background:#e9f5ee}p.small.bad{color:var(--bad)}p.small.ok{color:var(--ok)}" +
    "@media (max-width:640px){table.stack thead{display:none}table.stack,table.stack tbody,table.stack tr,table.stack td{display:block;width:100%}table.stack tr{border-bottom:1px solid var(--line);padding:10px 0}table.stack td{border:0;padding:3px 0}table.stack td[data-label]:before{content:attr(data-label);display:block;font-size:12px;color:var(--muted);font-weight:700}}" +
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
    "table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:700}",
    ".scroll{overflow-x:auto}",
    ".tabs{display:flex;gap:4px;padding:8px 16px;background:var(--card);border-bottom:1px solid var(--line);overflow-x:auto}.tabs button{background:transparent;color:var(--ink);border-color:transparent;font-weight:700;white-space:nowrap}.tabs button[aria-selected=true]{background:var(--pink);color:var(--pink-ink);border-color:transparent}",
    ".stat{font-size:28px;font-weight:800;line-height:1.1}",
    ".list{list-style:none;padding:0;margin:0}.list li{padding:12px 0;border-bottom:1px solid var(--line)}",
    ".work{display:flex;gap:14px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px 16px;margin:10px 0}",
    ".bell{position:relative;background:transparent;color:#fff;border-color:rgba(255,255,255,.45)}.bell b{position:absolute;top:-6px;right:-6px;background:#d23b62;color:#fff;border-radius:999px;font-size:11px;padding:1px 6px}",
    ".drawer{position:fixed;top:0;right:0;bottom:0;width:min(380px,calc(100% - 48px));background:var(--card);border-left:1px solid var(--line);z-index:2147483001;padding:16px;padding-top:max(16px,env(safe-area-inset-top));overflow:auto;-webkit-overflow-scrolling:touch;box-shadow:-8px 0 30px rgba(0,0,0,.15)}",
    ".dela-scrim{position:fixed;inset:0;background:rgba(15,18,30,.28);z-index:2147483000}",
    ".drawer-top{position:sticky;top:0;height:0;z-index:3;display:flex;justify-content:flex-end;align-items:flex-start;overflow:visible}",
    ".drawer-x{background:var(--card)!important;flex:none;margin-top:2px}",
    ".menu{position:absolute;right:12px;top:calc(100% + 6px);background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.15);padding:8px;z-index:15;min-width:220px}.menu button,.menu a{display:flex;width:100%;background:transparent;color:var(--ink);border:0;border-radius:10px;padding:10px 12px;font-weight:600}.menu button:hover,.menu a:hover{background:var(--soft)}",
    ".nav{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);display:flex;justify-content:space-around;padding:6px 4px calc(6px + env(safe-area-inset-bottom));z-index:6}",
    ".nav button{flex:1;background:transparent;border:0;color:var(--muted);flex-direction:column;gap:2px;font-size:13px;font-weight:600;padding:6px 4px;border-radius:12px}.nav button i{font-style:normal;font-size:20px;line-height:1}.nav button[aria-current=page]{color:var(--brand)}",
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
    ".pills{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.pills button{background:var(--card);color:var(--ink);border:1px solid var(--line)}.pills button[aria-pressed=true]{background:var(--navy);color:#fff;border-color:var(--navy)}",
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
    "@media (prefers-color-scheme:dark){.problem{background:#3a1d1b;border-color:#6b2c27}.notice.bad{background:#3a1d1b}.notice.ok{background:#17301f}}" +
    ".pick{max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:6px 10px;margin:8px 0}.pick label{font-weight:400;display:flex;gap:8px;align-items:center}" +
    ".badge.held{background:#fff3d6;color:#7a5200;border-color:#e8c97a}.badge.ready{background:#e3f3ea;color:#21613d;border-color:#b6dcc5}",
    "@media (max-width:600px){h1{font-size:24px}.wrap{padding:12px}.card{padding:16px}.hero{padding:20px}.hero h2{font-size:26px}.brand span{display:none}.top{flex-wrap:nowrap;gap:6px;padding:10px 12px}.top .bell{padding:6px 10px;font-size:13px}.top .brand{min-width:0;overflow:hidden}.brand b{font-size:16px;letter-spacing:.04em}.brand img{width:30px;height:30px}.top .badge{font-size:11px;padding:2px 8px}.bell{padding:6px 10px}.gd-terms>div{grid-template-columns:1fr;gap:2px}}",
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
  D.LOGIN_CONFLICT_TEXT = [
    "This browser has more than one website login saved, so DELA cannot tell which account is yours and does not sign anyone in.",
    "To fix it: 1. Log out of the website. 2. Clear this website's cookies: in Chrome, click the icon left of the web address, then Cookies and site data, then Manage on-device site data, and delete every hirelegalhelp.com entry. In Safari or Firefox, open Settings, then Privacy, and remove the data for hirelegalhelp.com. 3. Log in again with your own account and reload this page.",
    "Tip: test accounts are easiest in a private window, so your own login stays separate.",
  ];
  D.asset = function (root, rel) { return (root.getAttribute("data-base") || "") + "/" + rel; };
})();
