// DELA public security page (docs/briefs/step-6d-security-sensitive-data.md). Loaded by the DELA-Security widget on /security.
// Anyone can open it, with no login. Every number on the page comes from the api (GET /public/security), which reads
// the settings in the admin area, so nothing here is typed in by hand.
(function () {
  var D = window.DELA;
  var root = document.getElementById("dela-security");
  if (!D || !root) return;
  var h = D.h;
  var api = D.client(root);
  var mounted = D.mount(root);
  var app = mounted.app;
  var shadow = mounted.shadow;
  shadow.appendChild(h("style", { text:
    ".dela{padding-bottom:24px;min-height:0}.hero h1{color:#fff;margin:6px 0 8px}.hero .eyebrow{color:rgba(255,255,255,.85);margin:0}" +
    ".sec-brand{display:flex;align-items:center;gap:12px}.sec-brand img{width:48px;height:48px;border-radius:50%}" +
    ".sec-list{margin:6px 0 10px;padding-left:22px;display:grid;gap:6px;line-height:1.55}" +
    ".sec-toc{margin:6px 0 0;padding-left:22px;display:grid;gap:6px}" +
    ".sec-form{max-width:640px}.sec-form input,.sec-form textarea{width:100%;display:block}.sec-form textarea{min-height:140px;resize:vertical}" +
    ".sec-trap{position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden}" +
    ".sec-status{margin-top:12px}.sec-status:empty{display:none}.dela h2:focus{outline:none}" +
    ".gd-terms dd,.gd-terms dt,.sec-list li{overflow-wrap:anywhere}" +
    "@media (max-width:600px){.gd-terms>div{grid-template-columns:1fr;gap:2px}}"
  }));

  function plural(n, one, many) { return n + " " + (Number(n) === 1 ? one : many); }
  function days(n) { return plural(n, "day", "days"); }
  // [7, 14, 30] reads "7, 14 or 30 days"
  function choices(list) {
    var a = (Array.isArray(list) ? list : []).map(String);
    if (!a.length) return "";
    var words = a.length === 1 ? a[0] : a.slice(0, -1).join(", ") + " or " + a[a.length - 1];
    return words + (a.length === 1 && a[0] === "1" ? " day" : " days");
  }
  function list(items) { return h("ul", { class: "sec-list" }, items.map(function (t) { return h("li", { text: t }); })); }
  function terms(rows) {
    return h("dl", { class: "gd-terms" }, rows.map(function (r) { return h("div", null, h("dt", { text: r[0] }), h("dd", { text: r[1] })); }));
  }
  function section(id, title, kids) {
    return h("section", { class: "card", id: id, "aria-labelledby": id + "-h" }, h("h2", { id: id + "-h", tabindex: "-1", text: title }), kids);
  }

  function where(f) {
    return section("sec-where", "Where your data is stored", [
      terms([
        ["Location", f.data_location],
        ["While it travels", "Everything sent between your browser and DELA is encrypted with TLS. This is the HTTPS lock in your browser's address bar."],
        ["While it is stored", "Supabase encrypts DELA's database and file storage at rest, so the stored data cannot be read without the keys."],
      ]),
    ]);
  }

  function sensitive() {
    return section("sec-sensitive", "What counts as sensitive data", [
      h("p", { text: "Some information is too risky to keep in DELA. Sensitive data is never uploaded to DELA, typed into a chat or pasted into a job." }),
      h("div", { class: "gd-two" },
        h("div", { class: "gd-box" }, h("h3", { text: "Sensitive data (never upload it)" }), list([
          "Social Security numbers (SSNs) and ITINs",
          "Government ID numbers: driver's license, passport, state ID, and immigration documents such as A-numbers, visas and green cards",
          "Financial account numbers: bank accounts, credit and debit card numbers, and routing numbers",
          "Protected health information: medical records, diagnoses, treatment notes, prescriptions and health insurance member IDs",
          "Biometric data",
          "Logins and passwords",
        ])),
        h("div", { class: "gd-box ok" }, h("h3", { text: "Not sensitive (normal handling)" }), list([
          "Client names",
          "Dates of birth",
          "Addresses, phone numbers and email addresses",
          "Case numbers and court names",
          "Opposing party names",
          "General case facts and non-medical documents",
        ]))),
      h("h3", { text: "How to share sensitive data" }),
      h("p", { text: "Keep it in your own storage, such as Google Drive, Dropbox, OneDrive, Box, ShareFile, Clio or NetDocuments, and add a secure link to it on the job. DELA keeps only the link, never the file." }),
      h("h3", { text: "How DELA checks uploads" }),
      h("p", { text: "DELA checks text files (PDFs with text, Word, Excel, TXT and CSV) for Social Security number and card number patterns, and refuses a file that has them. Scanned images cannot be read this way, so the person uploading confirms with a checkbox that the file has no sensitive data." }),
    ]);
  }

  function expiry(f) {
    return section("sec-expiry", "Link and file expiration", [
      h("h3", { text: "Files shared with a freelancer" }),
      list([
        "Files and links shared with a freelancer expire after " + choices(f.expiry_choices) + ". The attorney chooses, and the default is " + days(f.expiry_default) + ".",
        "The attorney can extend access by " + days(f.extend_days) + ".",
        "The freelancer's access ends at the expiry date or when the job is complete, whichever comes first.",
        "Files are permanently deleted " + days(f.grace_days) + " after access ends.",
        "Each download link works for " + plural(f.link_minutes, "minute", "minutes") + ".",
        "Confidential materials need a login code, and the code lasts " + plural(f.login_hours, "hour", "hours") + ".",
        "Every view and download is logged and shown to the attorney.",
      ]),
      h("h3", { text: "Secure links to your own storage" }),
      list([
        "The attorney gets an email " + days(f.link_warn_days) + " before a link expires, and another when it expires.",
        "When a link expires, DELA erases the address it stored.",
        "DELA cannot change sharing in your firm's own storage. Turn sharing off there yourself, for example in Google Drive or Dropbox.",
      ]),
    ]);
  }

  function retention(f) {
    return section("sec-retention", "Retention and deletion", [
      list([
        "Ask DELA chats, drafts that were never approved, and files uploaded on a job are deleted " + days(f.drafts_days) + " after they were last used, unless they are saved to the library.",
        "You get a notice " + days(f.warn_days) + " before that happens.",
        "You can delete any draft, chat or upload at any time. Deleting is immediate and permanent.",
        "Library files go to Trash first. Clicking \"Delete forever\" in Trash deletes them immediately.",
      ]),
    ]);
  }

  function ai(f) {
    var openai = f.openai_zdr
      ? "DELA's AI features use OpenAI with Zero Data Retention. OpenAI keeps none of the inputs DELA sends."
      : "DELA's AI features use OpenAI. OpenAI may keep inputs for up to 30 days to monitor for abuse, and does not train its models on them.";
    return section("sec-ai", "AI and training", [
      list([
        "Files and links shared between attorneys and freelancers are never sent to the AI. They are never used for any AI training, personalization or firm customization.",
        "DELA never opens or reads secure links.",
        "DELA does not train AI models on anyone's content.",
        "Firm personalization uses only content the firm adds on purpose. Each firm's content is used only for that firm. It is never used for another firm, and no other firm can see it.",
        "Files you add to your own Files tab may be checked by AI before you share them.",
        "The milestone check reads only the freelancer's notes and checklist, never the files.",
      ]),
      h("h3", { text: "OpenAI" }),
      h("p", { "data-zdr": f.openai_zdr ? "on" : "off", text: openai }),
    ]);
  }

  function access() {
    return section("sec-access", "Who can access your data", [
      list([
        "Every table in DELA's database has row-level security, and no table can be read from a browser.",
        "All access goes through DELA's server, which checks every request.",
        "Files and links on a job are visible only to the attorney, the assigned freelancer, the firm's owners and managers, and staff the attorney adds to that job.",
        "The Lawfecta Team has no access to confidential materials. The one exception is a dispute, and only when both people agree. Every such opening is logged and shown to both people.",
      ]),
    ]);
  }

  function services() {
    return section("sec-services", "Services that handle data", [
      terms([
        ["Supabase", "Database and file storage, hosted on AWS in the United States."],
        ["OpenAI", "DELA's AI features."],
        ["Brevo", "Email."],
        ["Stripe", "Payments. DELA never sees card or bank details."],
        ["Vectera", "Meetings."],
        ["Anthropic", "AI features, only when a member uses their own Claude key."],
      ]),
    ]);
  }

  var MESSAGES = {
    sent: "Thank you. Your message was sent. The Lawfecta Team will reply by email.",
    bad_email: "Please check your email address. It needs to be a full email address.",
    message_needed: "Please write a message before you send.",
    too_many_messages: "Too many messages were sent from here. Please try again in an hour.",
    failed: "Something went wrong and your message was not sent. Please try again.",
  };

  function contact() {
    function field(id, label, input) {
      input.id = id;
      return h("div", null, h("label", { for: id, text: label }), input);
    }
    var name = h("input", { type: "text", name: "name", maxlength: "120", autocomplete: "name" });
    var email = h("input", { type: "email", name: "email", maxlength: "200", autocomplete: "email" });
    var topic = h("input", { type: "text", name: "topic", maxlength: "80" });
    var message = h("textarea", { name: "message", maxlength: "4000" });
    // The trap: hidden from people and screen readers, so only robots fill it in
    var trap = h("input", { type: "text", name: "website", id: "sec-website", tabindex: "-1", autocomplete: "off" });
    var status = h("p", { class: "sec-status", role: "status", "aria-live": "polite" });
    var send = h("button", { type: "submit", text: "Send message" });
    var busy = false;
    function show(key) {
      status.className = "sec-status notice " + (key === "sent" ? "ok" : "bad");
      status.setAttribute("data-result", key);
      status.textContent = MESSAGES[key];
    }
    var form = h("form", { class: "sec-form", novalidate: true, "aria-describedby": "sec-contact-note", onsubmit: function (e) {
      e.preventDefault();
      if (busy) return;
      busy = true;
      send.disabled = true;
      send.textContent = "Sending...";
      status.className = "sec-status";
      status.textContent = "";
      api.post("/public/security/contact", { name: name.value, email: email.value, topic: topic.value, message: message.value, website: trap.value })
        .then(function (r) {
          if (r && r.ok) { show("sent"); name.value = ""; email.value = ""; topic.value = ""; message.value = ""; }
          else show(MESSAGES[r && r.reason] ? r.reason : "failed");
        })
        .catch(function () { show("failed"); })
        .then(function () { busy = false; send.disabled = false; send.textContent = "Send message"; });
    } },
      field("sec-name", "Your name", name),
      field("sec-email", "Your email", email),
      field("sec-topic", "Topic (short)", topic),
      field("sec-message", "Your message", message),
      h("div", { class: "sec-trap", "aria-hidden": "true" }, h("label", { for: "sec-website", text: "Website (leave this empty)" }), trap),
      h("div", { class: "row", style: "margin-top:14px" }, send),
      status);
    return section("sec-contact", "Ask a security question", [
      h("p", { text: "Have a question about security or how DELA handles your data? Send it here, and the Lawfecta Team will reply by email." }),
      h("p", { class: "notice", id: "sec-contact-note", text: "Do not include client information or sensitive data in your message." }),
      form,
    ]);
  }

  function toc(items) {
    return h("nav", { class: "card", "aria-label": "On this page" }, h("h2", { text: "On this page" }),
      h("ol", { class: "sec-toc" }, items.map(function (it) {
        return h("li", null, h("button", { type: "button", class: "linkish", text: it[1], onclick: function () {
          var sec = shadow.getElementById ? shadow.getElementById(it[0] + "-h") : null;
          if (!sec) return;
          sec.scrollIntoView({ behavior: "smooth", block: "start" });
          sec.focus({ preventScroll: true });
        } }));
      })));
  }

  function render(f) {
    var wrap = h("main", { class: "wrap" },
      h("div", { class: "hero navy" },
        h("div", { class: "sec-brand" }, D.logo(root, 48), h("p", { class: "eyebrow", text: "Lawfecta DELA" })),
        h("h1", { text: "Security and your data" }),
        h("p", { text: "How DELA protects the work attorneys and freelancers share, what never belongs in DELA, and how long anything is kept." })),
      toc([
        ["sec-where", "Where your data is stored"],
        ["sec-sensitive", "What counts as sensitive data"],
        ["sec-expiry", "Link and file expiration"],
        ["sec-retention", "Retention and deletion"],
        ["sec-ai", "AI and training"],
        ["sec-access", "Who can access your data"],
        ["sec-services", "Services that handle data"],
        ["sec-contact", "Ask a security question"],
      ]),
      where(f), sensitive(), expiry(f), retention(f), ai(f), access(), services(), contact());
    D.clear(app).appendChild(wrap);
    if (unsubToken) wrap.insertBefore(unsubscribeCard(unsubToken), wrap.firstChild);
  }

  // The unsubscribe link in DELA's reminder and alert emails opens this page with a private token. One click stops
  // those emails; nobody has to log in.
  function unsubscribeCard(token) {
    var status = h("div", { class: "sec-status", role: "status", "aria-live": "polite" });
    var btn = h("button", { class: "blue", type: "button" }, "Unsubscribe");
    btn.onclick = function () {
      btn.disabled = true;
      api.post("/public/unsubscribe", { t: token }).then(function (r) {
        D.clear(status);
        if (r && r.ok) {
          btn.remove();
          status.appendChild(h("p", { class: "notice ok", text: "Done. You will no longer get reminder and alert emails from DELA. You will still get emails about your account, payments and signed work." }));
        } else {
          btn.disabled = false;
          status.appendChild(h("p", { class: "notice bad", text: "This unsubscribe link did not work. Open the link from your most recent DELA email, or write to us with the form at the bottom of this page." }));
        }
      }).catch(function () {
        btn.disabled = false; D.clear(status);
        status.appendChild(h("p", { class: "notice bad", text: "That did not go through. Please try again in a minute." }));
      });
    };
    return h("div", { class: "card", id: "sec-unsubscribe" },
      h("h2", { text: "Stop reminder and alert emails" }),
      h("p", { text: "Click the button to stop reminder and alert emails from DELA, such as new gig alerts and next-step reminders. Emails about your account, payments and signed work will still arrive." }),
      h("div", { class: "row" }, btn), status);
  }
  var unsubToken = "";
  try { unsubToken = new URLSearchParams(location.search).get("unsubscribe") || ""; } catch (e) { unsubToken = ""; }

  app.appendChild(h("main", { class: "wrap" }, h("p", { class: "muted", text: "Loading the security page..." })));
  api.get("/public/security").then(function (r) {
    if (!r || !r.ok || !r.facts) throw new Error("no_facts");
    render(r.facts);
  }).catch(function () {
    D.clear(app).appendChild(h("main", { class: "wrap" }, h("div", { class: "card" },
      h("h1", { text: "Security and your data" }),
      h("p", { text: "This page could not load. Please refresh the page." }))));
  });
})();
