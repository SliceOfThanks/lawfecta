# Inventory B: Ask DELA, Settings (top part), Profile, Connect, Client card, Files

Source: `app/dela-app.js`, lines 1855 to 2215 and 2428 to 3419 (helpers outside the range were read only to resolve labels, and are cited with their line).
All labels in quotes are copied from the code. "unclear from code" marks anything the code does not settle.

Routing facts used below (line 12224 to 12233, outside my range, read to confirm):
- `tab === "delegate"` or `"ask"` opens Ask DELA only when switch `ai_generation` is on.
- `tab === "files"` opens Files only for the attorney side with switch `file_uploads` on.
- `tab === "connect"` opens the Connect page for anyone with a side.
- `tab === "profile"` opens Profile only when switch `profiles` is on.
- The page-wide client information notice (`me.notice`) shows above Ask DELA and Connect; it is deliberately NOT shown above Files, Profile or Settings (line 12214).

---

## Ask DELA (both)

- How to reach it: menu item "Ask DELA". Attorney tab key `?tab=delegate`; freelancer tab key `?tab=ask`. Also from Home ("Open Ask DELA", "Ask DELA to plan a task", "What can I delegate?"), from Help, and from the Files page row button "Ask DELA" (opens with that file already attached). Functions `chatView()` line 1855, `drawChat()` line 1890, `composer()` line 1949.
- Purpose and primary focus: a chat with DELA's AI. The ONE main thing: type (or speak) a request and press "Send".
- Shown when: switch `ai_generation` on. File attaching only for attorney side with switch `file_uploads` on. The "● Talk" button only when the server says voice is on (`ai.voice_on`) and the browser supports the microphone.
- Layout, top to bottom:
  1. Header row: heading "Ask DELA" (h1), then two small ghost buttons on the right: "New chat" and a button labelled with the settings page name ("Settings" in the new layout).
  2. Intro line (muted). Attorney: "Describe a task you want to hand off, ask for a checklist, or attach a process write-up and ask DELA to turn it into an SOP. " followed by the credits line. Freelancer: "Plan your work, draft a checklist or tidy a process. " followed by the credits line.
  3. Earlier chats row (only when the member has at least one earlier chat): a dropdown, then for the open chat either the text "Saved to your library" or the button "Save to library", then "Delete this chat".
  4. Auto-delete line for the open unsaved chat, and a notice listing chats due to be deleted soon (both conditional).
  5. For a NEW chat (no messages): the composer comes first, then any problem box, then the message list holding only the example card. For a chat WITH messages: the message list, then any problem box, then the composer at the bottom.
  6. Composer (class "composer"), in order: sensitive data reminder line; attached file chips and the file picker (attorney, when open); the message text box; the "✦ Improve my request" helper row with its cost note; a button row: "● Talk", checkbox "Send when I stop talking", "Add a file" / "Close files", a status text, and "Send" on the right; then (when voice is on but the browser cannot record) a small line about microphone support.
- Content and data shown:
  - Credits line (`creditsLine()` line 1879), one of: "Using your <OpenAI or Claude> key ending <last4>." / "You chose your own key, but none is saved yet." / "Using Lawfecta's AI." / "Using Lawfecta's AI: <n> of <limit> included DELA actions left this month."
  - Message bubbles: user and assistant bubbles with plain text. Under a bubble: "Files: <names>" when files were attached. Under an assistant bubble, the source: "Answered with Lawfecta's AI" / "Answered with your firm's key" / "Answered with your own key".
  - A pending user message shows as a user bubble while sending, followed by an assistant-style placeholder "DELA is checking your message, then answering...".
  - Extra assistant note after long attachments: "Note: the attached files were long, so DELA read only the first part of them."
  - Earlier chats dropdown options: each "<title> (<date>)"; a chat title is the first 60 characters of its first message.
- Interactive elements:
  - "New chat" (button): clears the open chat, messages, problem box, attached files.
  - "Settings" (button; label is "AI settings" in the old layout): goes to tab `ai`.
  - Dropdown, aria-label "Earlier chats": first option "Open an earlier chat" (no chat open) or "Switch to another chat" (a chat open); then one option per earlier chat. Choosing one opens it.
  - "Save to library" (button, only on an open, unsaved chat): saves the chat; toast "Saved. This chat is kept until you delete it."; the button is replaced by the text "Saved to your library".
  - "Delete this chat" (button): replaces the row inline with the text "Delete this chat for good? This cannot be undone." plus "Cancel" and a red "Yes, delete". No browser pop-up. Success toast "Chat deleted".
  - Example card (new chat only): text 'Example: "Turn my notes on opening a new matter into a step by step checklist a paralegal can follow."' and button "Use this example" (puts the example into the message box and focuses it).
  - Message box: textarea, aria-label "Your message", placeholder "Type here, or press Talk and say it", max 8000 characters. Ctrl+Enter or Cmd+Enter sends.
  - "✦ Improve my request" (AI helper button, shown only when the helpers feature is on, `helperButton` line 5708): beside it the note "Uses <n> DELA action(s) on Lawfecta's AI (none on your own key)." While running the button reads "DELA is checking...". Results open in a soft panel below with an AI label, a "Dismiss" button, and a list of findings; each finding can have "Use suggestion", "Edit" and "Dismiss"; with more than one usable suggestion a "Use all suggestions" button appears; with no findings: "DELA found nothing to flag." Using a suggestion toasts "Added to your message. Nothing is sent until you click Send." If the text looks like client information, a browser OK/Cancel pop-up (confirm) appears: "This may include client information (<kinds>). Use placeholders instead. Click OK only if it is not client information." (or the server's own wording).
  - "● Talk" (button, class "mic", aria-pressed): starts recording; label changes to "■ Stop"; press again to stop. Recording stops by itself at the maximum (server value, default 120 seconds). The words are transcribed and appended to the message box.
  - Checkbox "Send when I stop talking" (remembered in the browser): when ticked, recording stops after about two seconds of quiet following speech, and the transcribed message is sent automatically.
  - "Add a file" / "Close files" (attorney with `file_uploads`): toggles the file picker. The picker is a list of checkboxes, one per ready file from the Files page (label = file name). Files saved from a job are never listed. If there are no ready files: "No files ready yet. Upload process documents on the Files page, then attach them here."
  - Attached file chips: file name plus a "×" button (aria-label "Remove <name>").
  - "Send" (blue button): disabled and labelled "Sending..." while busy.
  - Problem box buttons (see States): "Edit my message", "Continue", "Send anyway", "Send anyway, it has no client information", "Try again", "Fix my key", "Use Lawfecta's DELA actions this time", "Add my own key".
- States:
  - Loading: "Loading...". Load error: red notice with the error text.
  - While sending: user bubble plus "DELA is checking your message, then answering...".
  - Attach limit reached: toast "Attach up to 5 files at a time." (error text `too_many_files`; the actual limit comes from the server setting `chat_attach_max`).
  - Unsaved chat: "Unsaved chats are deleted after a set time without use. This one will be deleted on <date> unless you save it."
  - Chats due soon (notice, role status): "<n> chat is / chats are due to be deleted soon: <title (date)>, .... Open a chat and click "Save to library" to keep it."
  - Problem box (role alert, `problemBox()` line 2044), by reason:
    - Sensitive data: the server's message (or the standard sensitive data error text); only "Edit my message". There is no way to send anyway.
    - Looks like client information: "This message may include <kinds>. Confidential client information does not belong in DELA. Please replace names and numbers with placeholders such as [Client Name] or [Case Number]." (or the server's own note). Buttons "Edit my message" and one of "Continue" (AI-based reminder; then remembered for this conversation), "Send anyway" (rule-based), or "Send anyway, it has no client information" (older wording).
    - Own key failed: "Your <OpenAI or Claude> key did not work: <problem> Nothing was sent with Lawfecta's key." Buttons "Try again", "Fix my key", and (unless backup credits are off) the blue "Use Lawfecta's DELA actions this time".
    - Lawfecta AI failed: "DELA's AI could not answer: <problem> No DELA actions were used." Button "Try again".
    - No key saved or key unreadable: standard error text; buttons "Fix my key" and "Use Lawfecta's DELA actions this time".
    - No credits left: standard error text; blue button "Add my own key". For attorneys a "Limit reached" pop-up dialog also opens once (text: "You've used this month's DELA actions. They reset on <date>, or upgrade for more."; buttons: an upgrade button and "Not now").
    - Anything else: standard error text; "Try again".
    - Key problem wordings (`KEY_PROBLEM` line 1815): "the provider did not accept the key. It may have been deleted or typed wrong." / "your account with the provider is out of credit or has no billing set up." / "the provider is busy with too many requests on this key. Wait a minute and try again." / "the provider is not answering right now. Try again in a few minutes." / "this key cannot use the AI model DELA asked for." / "the AI declined to answer this request." / "the message and files are too long for one answer. Attach fewer files or ask about one part." / "the provider could not handle this request."
  - Voice status texts (beside "Send"): "Listening... <n>s (stops at <max>s)"; "No sound was recorded. Check your microphone."; "Turning your words into text..."; "Done. (Claude keys cannot turn speech into text, so Lawfecta's speech to text was used.)"; "Your browser blocked the microphone. Click the icon left of the web address, allow the microphone for this site, then press Talk again. On a Mac, also check System Settings, Privacy and Security, Microphone."; "No microphone was found. You can type instead."; "Your key could not turn speech into text: <problem> You can type instead."; "Speech to text did not work: <problem> You can type instead."; "That recording was too long. Keep each one under <max> seconds."; "Talking uses your included DELA actions, and they are used up this month. You can type instead."
  - Voice on but browser unsupported: "Talking needs a browser with microphone support. You can type instead."
- Help: composer reminder line (role note): "Never enter sensitive data: SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords. Keep it in your own storage. You are responsible for what you enter." No "?" help tips on this page.
- Variations: attorney intro text and file attaching versus freelancer (no files). Source label under answers differs by whose key answered. The page-wide client information notice shows above this page.
- Mobile/accessibility notes: the message list is `aria-live="polite"`; problem box `role="alert"`; status texts `role="status"`; Talk button uses `aria-pressed`; chip remove buttons have aria-labels; Ctrl/Cmd+Enter sends (plain Enter makes a new line).
- UX observations (mine):
  - The composer sits at the top for a new chat and at the bottom once the chat has messages, so its position jumps after the first send.
  - The earlier-chats control is a plain dropdown with no search; long histories will be hard to scan.
  - "Save to library" here means keeping the chat, while "Library" elsewhere is the document library. The wording may confuse.
  - Three AI-related affordances crowd the composer: "✦ Improve my request", "● Talk" and "Send", plus a cost note line. Hierarchy between them is weak.
  - The whole view is redrawn on many clicks (attach, pick a file); typed text is kept, but focus is lost.
  - There is no visible keyboard hint for Ctrl+Enter.

---

## Settings: top cards "Account", "Appearance", "Suggestions and alerts" (both)

- How to reach it: menu item "Settings" (tab key `?tab=ai`). `settingsTop()` line 2167 builds the first cards of the Settings page in the new layout; the heading "AI and messages" and the AI cards follow it (outside my range). Deep links can jump to `set-account` or `set-alerts`.
- Purpose and primary focus: personal settings that are not about AI: account details, light or dark look, and whether DELA suggests next steps and sends gig alerts.
- Shown when: new layout only. "Appearance" card only when `me.appearance.on`. "Suggestions and alerts" card only with switch `onboarding_widget`. The "New gig alerts" block only for freelancers when the server says alerts are on.
- Layout, top to bottom:
  1. Account card (shared component `D.accountCard(me)`; contents are in shared/dela-core.js, outside my range).
  2. Card "Appearance": "How DELA looks for you, on every device you sign in on." then a pill group.
  3. Card "Suggestions and alerts": a sentence, a pause button, and for freelancers the sub-heading "New gig alerts" with three checkboxes.
  4. The "Emails" card (`emailsCard()`, line 8755, outside my range).
- Interactive elements:
  - Appearance pills (group aria-label "Appearance", each with aria-pressed): "Match my device", "Light", "Dark". Saves at once; toast "Appearance: <choice>".
  - "Pause suggestions" / "Resume suggestions" (button): toggles DELA's suggestions on Home.
  - Checkboxes under "New gig alerts": "On Home", "By email", "In Notices". Each saves at once; toast "Saved"; on failure the box flips back with toast "Not saved. Try again."
- States:
  - Loading: "Loading...". Feature not on for the member: "Nothing to set here yet." Load failure: "These settings could not load. Reload the page to try again."
  - Not paused: "DELA suggests your next step on Home. Pausing hides the suggestions for a day." Paused: "DELA's suggestions on Home are paused. They come back tomorrow, or sooner when something new needs you."
  - Gig alerts intro: "When a gig that fits you is posted, DELA can tell you on Home, by email and in Notices. Turn off any of them."
  - Notice when reminder emails are off: "Reminder and alert emails are off, so gig alerts are not emailed. Turn them on in the card "Emails" below."
- Help: none.
- Variations: gig alerts block is freelancer only.
- Mobile/accessibility notes: jumping to the account card moves keyboard focus to its heading.
- UX observations (mine): the wording mixes "Notices" (here) and "Notifications" (menu item) for the same place. The "By email" checkbox can be on while emails are globally off; a notice explains it, but the control does not disable.

---

## Profile ("Profile and verification" for attorneys, "Profile" for freelancers) (both)

- How to reach it: account menu item "Profile and verification" (attorney) or "Profile" (freelancer); freelancer main menu "Profile"; tab key `?tab=profile`. Also from Home and Get set up buttons ("Open your profile", "Finish your profile", "Set up your profile and verification", "Update my profile", "View my reviews"). An attorney arriving from the license confirmation email lands here with `?confirm=<token>`. Functions `profileView()` line 2428, `drawProfile()` line 2500.
- Purpose and primary focus: fill in the member's DELA profile and pass the Lawfecta Team's check so the member becomes "Ready". The ONE main thing: complete the required items and click Save.
- Shown when: switch `profiles` on. Each side sees its own profile.
- Layout, top to bottom:
  1. Heading "Profile and verification" (attorney) or "Profile" (freelancer).
  2. Intro: "This is your <side> profile. Your Lawfecta directory listing is your public profile; DELA keeps them in step when you choose."
  3. Section pills (nav, aria-label "Profile sections"). Attorney: "Firm details", "License verification", "Your profile", and "Document preferences" (switch `document_standard`). Freelancer: "Availability", "LinkedIn check", "Your profile". Each scrolls to its card and focuses its first control.
  4. Readiness card (see its own section below).
  5. Attorney: "Firm details" card. Freelancer: "Your availability" card, then "Your availability for meetings" card (switch `meetings`).
  6. Attorney: "License verification" card. Freelancer: "LinkedIn check" card.
  7. "Your profile" card (the long form).
  8. Freelancer: "Profile documents" card (only when the server setting `documents_on` is on).
  9. Attorney: "Document preferences" block (switch `document_standard`; the form itself, `firmProfileForm`, is outside my range), then one extra "Firm details for <name> (you are firm staff)" card for each firm the attorney is staff of.
  10. "Your reviews" card (switch `reviews`; see below).
- States for the page: loading "Loading..."; load failure shows a notice with the error text. Coming from the license email: toast "Email confirmed. The Lawfecta Team will finish the check." or the error text. When another card reloads the page data (availability, license, LinkedIn), unsaved typing in the form is kept.
- UX observations (mine): this is one very long page with up to nine cards and four separate save actions ("Save firm details", "Save availability", the profile "Save", and instant-save buttons). The section pills do not list every card (meetings availability, profile documents, reviews and readiness have no pill). There is no sticky save bar and no unsaved-changes warning visible in this code.

### Readiness card: "Match-ready" / "Ready to post and hire" (both)

- How to reach it: top of the Profile page. `statusCard()` line 2549, `readinessSteps()` line 2534.
- Purpose and primary focus: show how many steps are left before the member is ready, and jump to each missing item.
- Layout, top to bottom:
  1. Heading "<goal>: <done> of <total> steps done", where goal is "Ready to post and hire" (attorney) or "Match-ready" (freelancer), with a status badge on the right.
  2. Progress bar (turns green when ready).
  3. One sentence: paused wording, ready wording, "One step to go." or "<n> steps to go."
  4. Freelancer only: a green or red notice that starts "Attorneys can see you in Talent now." or "Attorneys cannot see you in Talent yet."
  5. Expandable explainer: "What "ready to post and hire" means" (attorney) or "What "match-ready" means" (freelancer).
  6. Step groups with counts: "1. Your profile (<d> of <n>)", "2. The Lawfecta Team's check (<d> of <n>)", and for freelancers "3. Your availability (<d> of <n>)". Each is a checklist; each undone item has a link-style action.
  7. Attorney, not verified: "You can use Ask DELA, documents, files and the recorder before you are verified. Posting work and hiring need a verified license."
  8. Attorney, firm items missing: notice "Still needed before paid work: <items>. " with the link "Go to Firm details". Items: "Billing address", "Who may sign for the firm", "Email for formal notices".
- Content and data shown:
  - Status badge words (`STATE_BADGE` line 2361): "Not complete" (incomplete), "Waiting for a check" (verification_pending), "Ready" (match_ready), "Availability out of date" (availability_stale), "Not taking work" (unavailable), "Paused" (restricted).
  - Ready sentence (`READY_WORDS` line 2357). Attorney ready: "You are verified. You can post work and hire on DELA." Attorney paused: "Some actions are paused on your account. Contact the Lawfecta Team." Freelancer ready: "You are match-ready. Attorneys can find and invite you." Freelancer paused: "Matching is paused on your account. Contact the Lawfecta Team."
  - Profile steps: one per required item; the labels come from the server (`prof.data.labels`), so the exact words are unclear from code.
  - Check step label: "Bar license verified by the Lawfecta Team" (attorney) or "LinkedIn check passed by the Lawfecta Team" (freelancer). Notes: "Being checked by the Lawfecta Team. Nothing for you to do right now." / "The last check did not pass. Open it to see why and try again." / "The check is out of date. Renew it."
  - Availability step (freelancer): "Availability confirmed in the last <n> days" (default 14). Notes: "You are marked "Not taking new work", so attorneys do not see you." / "Your last confirmation is older than <n> days." / "Good until <date>."
  - Freelancer Talent notice, ready: "Attorneys can see you in Talent now. Your picture, headline and summary show on your Talent card." Not ready: "Attorneys cannot see you in Talent yet." then "The Lawfecta Team has paused matching on your account." or "Reason: <reasons>." or "Finish the steps below.", then "Everything you save here, your picture included, is kept and shows to attorneys as soon as you are match-ready." Reasons: "1 required profile item is still empty (<label>)" / "<n> required profile items are still empty"; "the Lawfecta Team is still doing your LinkedIn check" / "the Lawfecta Team's LinkedIn check has not passed yet"; "you are marked "Not taking new work"" / "your availability is not confirmed".
  - Explainer text, attorney: "You can post gigs, contact freelancers and hire when two things are true: every required profile item is filled, and the Lawfecta Team has verified your bar license. Until then you can still use Ask DELA, documents, files and the recorder." Freelancer: "Attorneys can find you on Talent, see you in gig matches and invite you only while you are match-ready. That takes three things: every required profile item is filled, the Lawfecta Team's check has passed, and you confirmed in the last <n> days that you can take work. If any one lapses, you drop out of Talent until it is fixed. Work you already have is not affected."
- Interactive elements:
  - Expandable summary (details): "What "ready to post and hire" means" / "What "match-ready" means".
  - Per undone step, a link-style button: "Add it" (profile items), "Start the license check" or "Start the LinkedIn check" (no button while the check is pending), "Confirm it" (availability). Each scrolls to the right card, opens it if folded, and focuses its first control.
  - "Go to Firm details" (link-style button, attorney).
- Mobile/accessibility notes: progress bar has `role="progressbar"` with value text "<done> of <total> steps done"; each step has screen-reader text " (done)" or " (not done yet)"; action buttons have aria-labels "<action>: <step>".
- UX observations (mine): the freelancer card states the same thing up to four ways (badge, sentence, Talent notice, checklist). The firm-missing notice repeats inside the Firm details card as "Still needed for paid work: ...".

### "Firm details" card (attorney)

- How to reach it: Profile page, first card after readiness; pill "Firm details". `firmCard()` line 3019. A second copy titled "Firm details for <name> (you are firm staff)" appears near the bottom for each firm the member is staff of.
- Purpose and primary focus: record what the firm needs before its first paid engagement, and its logo.
- Layout, top to bottom: heading "Firm details"; "Needed before your first paid engagement: the billing address, who may sign for the firm, and an email for formal notices."; logo row; "Still needed for paid work: <items>." (when anything is missing); seven fields; "Save firm details"; then, for the firm owner with team members, the sub-heading "Firm staff" and a list.
- Interactive elements:
  - Logo: image or a placeholder reading "Logo". Buttons "Add a logo" / "Change logo" (opens a file chooser, PNG or JPG; aria-label "Choose a firm logo") and "Remove logo". The logo saves the moment it is chosen: toast "Logo saved. Nothing else to click."; removing toasts "Logo removed". Hint: "PNG or JPG. A square or wide logo on a plain background works best." Status text: "Your firm's logo. Freelancers see it next to your firm's name on gigs, conversations and engagements." or "No logo yet. Freelancers see your firm's name only."; "Uploading..." while sending; errors replace the status text.
  - Text boxes (each with a "?" help icon that has no specific tip text): "Firm's legal name", "Firm website", "Billing address" (3-row text area), "Who may sign for the firm", "Their title", "Email for formal notices" (email type), "Firm phone".
  - "Save firm details" (blue): toast "Firm details saved"; errors show under the button.
  - Firm staff list (owner only): each row "<name> (<member id>)" plus ": firm staff" when named; button "Make firm staff" or red "Remove as firm staff". Toasts "Named firm staff" / "No longer firm staff". No confirm step.
- States: when the member may not edit, all boxes are disabled, logo buttons are hidden, and the text reads "The firm owner or firm staff can change these."
- Help: firm staff intro: "Firm staff can set up the firm's details for you. You can name firm staff once your license is verified. Add people to your team first in Library, Team."
- Variations: owner sees the staff list; staff see the same card for the other firm; read-only for others.
- UX observations (mine): no field is marked required even though three are required for paid work. The staff list shows a raw member ID next to the name. The logo saves instantly while the fields need a button, which is inconsistent within one card.

### "Your availability" card (freelancer)

- How to reach it: Profile page; pill "Availability". `availabilityCard()` line 2596.
- Purpose and primary focus: say whether you can take work, and re-confirm it on schedule.
- Layout: heading "Your availability"; one sentence; three buttons in a row.
- Content: "You said: <choice>, on <date>." plus " Confirm again by <date> to stay in matches." (not shown when not taking work); or, before the first confirmation, "Tell attorneys whether you can take work. Confirm it every <n> days to stay in matches."
- Interactive elements: three buttons, the current choice shown filled blue: "Available for new work", "Some hours only", "Not taking new work". One click saves and confirms; toast "Availability saved".
- UX observations (mine): there is no separate "confirm" button; clicking the already-selected choice again is how a member re-confirms, which is not stated.

### "Your availability for meetings" card (freelancer)

- How to reach it: Profile page, under "Your availability". `meetingAvailabilityCard()` line 8682 (outside my range, called from it).
- Shown when: freelancer with switch `meetings`.
- Purpose and primary focus: set the weekly hours attorneys can book meetings in.
- Layout and interactive elements, top to bottom:
  - Intro: "Attorneys book meetings with you inside a gig, or one introductory call before a gig, from these times, with <n hours> of notice and <n minutes> between meetings. Meetings are free. Times are in your time zone."
  - Dropdown "Time zone" (aria-label "Time zone for meetings"): options are city zones written "<City> (<zone id>)"; the full list (`TZS`) is defined outside my range.
  - Notice when it differs from the profile time zone: "Your profile says your time zone is <zone>, under "How you work". Meeting times use the one chosen here (<zone id>). " with link "Open my profile".
  - "Meeting lengths you offer": checkboxes "15 minutes", "30 minutes", "45 minutes" (defaults; the server can send others).
  - One row per weekday: a checkbox with the day name, a "from" time box (default 09:00), the word "to", and a "to" time box (default 17:00). Day names come from `WEEK`, outside my range.
  - "Days off" text box: placeholder "For example 2026-11-26, 2026-12-24"; hint "Dates as YYYY-MM-DD, separated by commas. Or pick a date below and click Add."
  - Date picker (aria-label "Pick a day off") and button "Add day off".
  - "Save availability" (blue): toast "Availability saved".
- States: "Loading..."; on load failure the card is emptied without a message.
- UX observations (mine): two cards with nearly the same title ("Your availability" and "Your availability for meetings") sit next to each other, and the profile has a third time zone setting under "How you work". Only one time range per day is possible.

### "License verification" card (attorney)

- How to reach it: Profile page; pill "License verification". `licenseCard()` line 2610, `licenseForm()` line 2641.
- Purpose and primary focus: add a bar license and prove it belongs to the member.
- Shown when: attorney. If license checks are not open: "License checks open soon. Your profile is saved meanwhile." and nothing else.
- Layout, top to bottom: heading "License verification"; intro "The Lawfecta Team checks your license on the state bar's own website, usually within <n> business days. To show the license is yours, confirm an email that is on your bar record or at your firm's own domain, or have a <n> minute video call with us. We never ask for ID documents."; one inner card per license; the foldable "Add a license" form (open by default when there are no licenses).
- Content per license: "<State> license <bar number>" with a badge; "Name on the record: <name>" plus ". Next yearly check: <date>" when verified; a notice with the team's reason, when there is one.
  - Badge words (`LIC_WORDS` line 2362): "Waiting for the Lawfecta Team" (pending), "We need a little more" (needs_more), "Verified", "Not verified", "Check out of date" (expired).
  - Email method lines: "Email <address> confirmed." / red notice "We could not deliver the email to <address>: <reason or 'their mail server refused it'>. Click "Send the email again" later, withdraw this license and add it again with another work email, or ask for a video call instead." / "Delivered to <address>. Click the link in it while signed in to Lawfecta. Check your spam folder too." / "We emailed <address>. Click the link in it while signed in to Lawfecta. Check your spam folder too."
  - Video call lines: "Book your <n> minute video call:" with link " choose a time" (opens a new tab), or "The Lawfecta Team will email you to set up a <n> minute video call."
- Interactive elements:
  - Per pending or needs-more license: "Send the email again" (toast "Email sent again"); "Ask for a video call instead" (toast "Video call requested"); red "Withdraw" (browser OK/Cancel pop-up: "Withdraw this license?").
  - "Add a license" (expandable):
    - Dropdown "Country" (only when more than one country is allowed; option "United States" for US, other codes shown as they are). Otherwise the text "For now we check US licenses. Attorneys elsewhere can keep their profile and use DELA's planning tools."
    - Dropdown "State that issued the license": first option "Choose the state", then the states sent by the server.
    - Text box "Bar number".
    - Text box "Name exactly as on the state bar record" (pre-filled with the profile first and last name).
    - Radio group "How to show the license is yours": "Confirm an email (on my bar record or at my firm's domain)" (default) and "A <n> minute video call with the Lawfecta Team".
    - Text box "Email for the check" (email type, placeholder "you@yourfirm.com", hint "The email on your state bar record, or an email at your firm's own domain. Gmail, Yahoo and other free email services do not count."). Hidden when the video call radio is chosen.
    - "Add the license" (blue): status "Saving..."; toast "License added. Check your email for the link." or "License added. We will set up the video call."; errors show under the button.
- Help: each field has a "?" icon with no specific tip text.
- UX observations (mine): "Withdraw" uses a browser pop-up while chat deletion uses an inline confirm. A verified license has no visible actions at all (no withdraw, no renew), so what a member does when a license expires is unclear from code.

### "LinkedIn check" card (freelancer)

- How to reach it: Profile page; pill "LinkedIn check". `linkedinCard()` line 2676.
- Purpose and primary focus: send a LinkedIn profile address for the Lawfecta Team to check.
- Layout: heading "LinkedIn check"; intro "The Lawfecta Team checks that the name on your LinkedIn profile matches your DELA profile, and that LinkedIn shows its verified badge. We never ask for ID documents or a passport."; the current address with a badge and the team's reason, when one was sent; a text box; one button.
- Content: badge uses the same words as licenses ("Waiting for the Lawfecta Team", "We need a little more", "Verified", "Not verified", "Check out of date").
- Interactive elements: text box "LinkedIn profile address" (placeholder "linkedin.com/in/your-name"; "https://" is added if missing). Button "Ask for the check" (first time) or "Send for a new check" (after one was sent). Toast "Sent to the Lawfecta Team" or "Already sent".
- States: checks not open: "LinkedIn checks open soon."
- UX observations (mine): the LinkedIn address can also appear as a field inside "Your profile" (when required), so the same value has two entry points.

### "Your profile" card: the profile form (both)

- How to reach it: Profile page; pill "Your profile". `formCard()` line 2698.
- Purpose and primary focus: the main profile form. Fill in the boxes and click the save button at the bottom.
- Layout, top to bottom:
  1. Heading "Your profile" and the notice "Profiles are seen by other members. Do not include confidential client information, client names or case details."
  2. "Fill from my Lawfecta listing" button with the note "Fills only empty boxes. Nothing is saved until you click Save. To change your listing from here, tick "Also update my Lawfecta directory listing" at the bottom before you save."
  3. Photo row, then the foldable "Or choose a ready-made picture (<n>)".
  4. Sub-heading "About you" and its fields.
  5. Sub-heading "Your practice" (attorney) or "What you support" (freelancer): practice areas, Lawfecta categories (freelancer), jurisdictions (attorney).
  6. Foldable "Biography: summary, experience and education".
  7. "Tech tools you use" picker and the checkbox "I do not use specific legal tech tools".
  8. Freelancer only: "Task skills", "Services", then sub-heading "How you work" with its fields and the agreement checkbox.
  9. Foldable "Let DELA draft your headline and summary" (attorney) or "Let DELA draft your headline, summary and services" (freelancer).
  10. Directory listing checkbox and status lines (when listing sync is on).
  11. The save button, and a status line under it.
- Field labelling rule: any field that is not required gets " (optional)" added to its label. Which fields are required comes from the server, so it can differ per side and setting. Every field label has a "?" help icon; the tip text is listed below where the code gives one.
- Interactive elements, in order:
  - "Fill from my Lawfecta listing" (button): copies listing values into empty boxes only; the photo always follows the listing. Toast "Filled <n> item(s) from your listing. Check it/them, then Save." or "Your listing had nothing new to add: the boxes it fills are already filled here. Change anything below and click Save. With "Also update my Lawfecta directory listing" ticked at the bottom, your listing changes too."
  - Photo: round picture, or a "?" placeholder when there is none. Buttons "Add a photo" / "Change photo" (file chooser, PNG or JPG, aria-label "Choose a profile photo") and "Use the default picture" (only when a DELA photo or ready-made picture is set). Status text, one of: "Your DELA profile photo." / "A ready-made picture. It is an illustration, not a photo of you." / "This photo comes from your Lawfecta listing." / "No photo yet. Members see your initial." / "Uploading...". After a change, a pending row appears: bold "Your new photo is not saved yet." or "The default picture is not saved yet." or "This picture is not saved yet.", the blue button "Save my picture", and "This saves your whole profile, the same as the Save button at the bottom of this page." Toasts: "New photo ready. Click "Save my picture" next to it to keep it." / "Back to the default picture. Click "Save my picture" next to it to keep it." / "Picture chosen. Click "Save my picture" next to it to keep it."
  - "Or choose a ready-made picture (<n>)" (expandable): note "A ready-made picture is an illustration. It is never treated as a photo of you or as proof of who you are. The same picture shows on Talent, your profile and your conversations." then a grid of picture buttons (radio group "Ready-made pictures", each named "Ready-made picture <i> of <n>").
  - "About you" fields:
    - "First name" (tip: "Your first name as you want members to see it.")
    - "Last name" (tip: "Your last name as you want members to see it.")
    - "Headline" (has "✦ Write with DELA"). Placeholder attorney "Family law attorney in Austin", freelancer "Litigation paralegal, e-filing and discovery". Tip: "One short line under your name: your role and the main kind of work you do. For example: Family law attorney for Texas families." (freelancer example: "Litigation paralegal for small firms.")
    - "Firm name" (attorney; tip "The firm name clients and courts know you by.") or "Company or agency" (freelancer; tip "Your business name, if you work through one. Leave empty if you work under your own name.")
    - "Your role at the firm" (attorney only; placeholder "Owner, partner, associate"; tip "For example owner, partner, associate or of counsel.")
    - "City" (tip "The city you work from.")
    - "State" (placeholder "TX"; tip "Two letters, for example TX or CA.")
    - "Business phone" (tip "A work number. Members contact you through Lawfecta, so this is shown only where your listing shows it.")
    - "Website" (tip "Your own or your firm's website, starting with https://")
    - "LinkedIn profile address" (attorney: always shown here, optional, no tip)
    - "Booking link" (tip "A Calendly, TidyCal or similar link, if you use one."; hint under the box "A page where people book time with you, if you have one.")
  - "Practice areas (<n> selected)" plus ", optional" when not required (expandable; opens by itself when it is required and empty): shows "Selected: <list>", a search box (placeholder "Find a practice area") that filters the chips as you type, and one toggle chip per practice area (selected ones first, filled blue, aria-pressed). The list of areas and the maximum (`practice_areas_max`) come from the server. Clicking past the maximum silently does nothing.
  - Freelancer: "Lawfecta categories (<n> picked)", becoming "Lawfecta categories (<n> of <max> picked)" once loaded (expandable, open when none are picked; `profileCats()` line 2365). Note: "Attorneys search Talent by these categories. Pick the specialties, tasks and software you work in. You show up under each one you pick and under the specialty and category above it." Inside: search box "Find a category" (placeholder "For example: discovery, medical chronology, Clio", hint "Type a few letters, then pick from the list."); label "Or browse"; dropdown "Category" (first option "Choose a category") and dropdown "Specialty" (first option "Choose a category first", then "Choose a specialty"; disabled until a category is chosen); toggle chips for the chosen specialty, the first reading "All of <specialty>"; label "Your categories" with removable chips (each "×", aria-label "Remove <name>") or "None picked yet." Toasts: "You can pick up to <max> categories. Remove one first." / "Now choose a specialty under <name>." / "<name> is already picked." States: "Loading the categories..." / "The categories could not be loaded right now. Reload the page to try again."
  - Attorney: "Where you are licensed or practice" (comma list; placeholder "TX, Western District of Texas"; hint "Separate them with commas.").
  - "Biography: summary, experience and education" (expandable; opens by itself when a required part is missing; the summary line adds " (not written yet)" when folded and the summary is empty). Three text areas, each with "✦ Write with DELA":
    - "Summary" (5 rows). Tip attorney: "A short paragraph about your practice: what you handle, for whom, and how you like to work with support staff." Freelancer: "A short paragraph about you: the work you do, for which kinds of firms, how you work and what you are known for. No client names or case details."
    - "Experience" (4 rows). Tip: "Your roles or kinds of work, newest first, one per line, with years. For example: Founding attorney, Smith Family Law, 2019 to now." (freelancer example: "Senior paralegal, family law firm, 2019 to now.")
    - "Education" (3 rows). Tip: "Degrees, certificates and courses, one per line, with the school and year. For example: J.D., University of Texas School of Law, 2012." (freelancer example: "Paralegal certificate, Austin Community College, 2018.")
  - "Tech tools you use" (plus " (optional)" when not required; `toolsPicker()` line 2866). Hint: "Open a group to choose the tools you use. DELA's AI uses them to tailor its answers, for example by naming your own tools in document steps." Tip: "Choose every tool you use day to day. Attorneys can search for freelancers by tool, and DELA names your tools in document steps." Contains one expandable group per kind of tool (group names and tool names come from the server; a single fallback group is named "Tools"); each group shows "<n> chosen" and holds toggle chips; a group with a chosen tool starts open. Below: a text box with placeholder "Other tools, separated by commas" (aria-label "Other tech tools"). The maximum (`software_max`) comes from the server; clicking past it silently does nothing.
  - Checkbox "I do not use specific legal tech tools".
  - Freelancer: "Task skills" (comma list; placeholder "E-filing, discovery requests, client intake"; tip "The tasks you do well, separated by commas."; hint "Separate them with commas.").
  - Freelancer: "Services" block (see "Services editor" below).
  - Freelancer, under "How you work":
    - Dropdown "Time zone": first option "Choose", then the zones sent by the server.
    - "Usual hours" (placeholder "Weekdays 9 to 5 Central"; tip "When you usually work, with your time zone.")
    - "Hours a week you can take on" (number; tip "About how many hours of new work you can take each week. DELA uses it for matching.")
    - "States you will not work for" (comma list; tip "Two-letter states where you will not take work, for example because of licensing rules. Leave empty if none."; hint "Leave empty if none. Separate them with commas.")
    - "LinkedIn profile address" (only when the server requires it; placeholder "linkedin.com/in/your-name")
    - Checkbox: "I agree to keep attorneys' work confidential, to work only on funded milestones through Lawfecta, and not to take Lawfecta clients off the platform."
  - "✦ Write with DELA" (small AI button under Headline, Summary, Experience and Education; only with switch `ai_generation`; `writeWithDela()` line 2462): opens a help box under the field (click again to close) with the text "DELA uses only the facts you give and what your profile says. It never invents a qualification. Uses DELA actions like Ask DELA.", a 3-row text area (placeholder "A few facts for DELA, for example where you worked, for how long, what you did. Leave empty to improve what the box says now."), and the blue button "Write it". Status texts: "DELA is writing..." / "Tell DELA a few facts first, or write a little in the box for DELA to improve." / "DELA wrote this from your facts. Check it, change anything, then click Save." (plus " DELA asks: <questions>" when it has questions) / an error text. A browser OK/Cancel pop-up can appear: "This may include client information. Click OK if it is not."
  - "Let DELA draft your headline and summary" / "Let DELA draft your headline, summary and services" (expandable; `draftHelper()` line 2931): note "DELA uses only what you write here and in the form. It does not invent qualifications. Uses DELA actions like Ask DELA."; a 4-row text area (aria-label "Tell DELA about your work", placeholder "A few sentences: what you do, for whom, for how long, the tools you use."); button "Draft with DELA". It fills the headline and summary (and for freelancers the skills, and the tools and services only when those are empty). Status "DELA is writing..."; toast "DELA filled in a draft. Check it, then Save." and then a second toast "DELA asks: <questions>". Same browser pop-up as above when the text looks like client information.
  - Checkbox "Also update my Lawfecta directory listing" (only when listing sync is on; ticked by default; members with both workspaces see the longer label "Also update my Lawfecta directory listing from this workspace (your listing is one page for both workspaces)").
  - Save button. Its label changes with the checkbox: "Save and update my directory listing" (ticked), "Save to DELA only" (not ticked, sync on), or "Save" (sync off). Above it, when ticked: "These boxes also change on your directory listing: <field list>."
- States:
  - Saving: "Saving..." under the button; button disabled.
  - Saved: toast "Profile saved", or "Profile saved, with your picture." when a picture was pending.
  - Save refused: the error text under the button; if a picture was pending, also toast "Not saved. <error>".
  - Client information check on save: browser OK/Cancel pop-up "This may include client information (<kinds>). Take it out and click Save, or click OK if it is not client information." (or the server's wording).
  - Listing status lines: "Your listing is being updated." / "Your listing was updated <date and time>." / "Your listing could not be updated: DELA is not allowed to change listings yet. Your DELA profile is saved." (or the raw error) and always "Clearing a box here does not clear it on your listing."
- Help: the "?" icon beside every label (shared `D.helpTip`, opens on hover or tap, closes with Escape); its accessible name is "What to enter in <label>". Fields with no tip text given in code: "LinkedIn profile address", "Where you are licensed or practice", "Time zone", and all firm, license and services fields.
- Variations: attorney-only fields: "Your role at the firm", "Where you are licensed or practice", always-visible LinkedIn field. Freelancer-only: Lawfecta categories, Task skills, Services, "How you work", the agreement checkbox. Headings differ: "Your practice" versus "What you support"; "Firm name" versus "Company or agency".
- Mobile/accessibility notes: every input has an aria-label; toggle chips use aria-pressed; the ready-made pictures are a radio group with arrow-key movement; status lines use `role="status"`.
- UX observations (mine):
  - Very long single form with one save button at the very bottom, plus a second "Save my picture" button near the top that saves the whole form.
  - Three different AI entry points do overlapping jobs: "✦ Write with DELA" per field, "Draft with DELA" for several fields, and Ask DELA itself.
  - Client information warnings use browser pop-ups here but an inline box in Ask DELA.
  - Limits on practice areas, tools and services fail silently (no message), while categories show a toast.
  - Comma-separated text boxes are used for lists (skills, states, jurisdictions) next to chip pickers for other lists.
  - "State" is a free text box here but a dropdown in the license form.
  - Optional fields are tagged "(optional)" but required ones carry no mark.

### Services editor (freelancer, inside "Your profile")

- How to reach it: inside the "Your profile" card, after "Task skills". `servicesEditor()` line 2900.
- Purpose and primary focus: list what the freelancer sells and the usual price.
- Layout: sub-heading "Services" (plus " (optional)" when not required); "What you do, for whom, and your usual price. Prices are a guide; each job is agreed in its proposal."; one small card per service; button "Add a service".
- Interactive elements per service: text box "Service" (placeholder "Draft discovery responses"); text box "For whom" (placeholder "Solo family law attorneys"); a price row reading "From $" [number box] "to $" [number box]; dropdown with options "per job" and "per hour"; red "Remove" (no confirm). "Add a service" adds an empty service, up to the server maximum (`services_max`); past it, nothing happens.
- States: no empty-state text; with no services only the button shows.
- UX observations (mine): removal is instant with no undo. Nothing is saved until the profile's main save button is clicked, which is far below.

### "Profile documents" card (freelancer)

- How to reach it: Profile page, after "Your profile". `docsCard()` line 2958.
- Shown when: freelancer and the server setting `documents_on` is on.
- Purpose and primary focus: upload a resume, certificates or work samples and choose which ones attorneys can see.
- Layout, top to bottom: heading "Profile documents"; "A resume, certificates or work samples with no client information. PDF, Word, PNG or JPG, up to <n> MB each, <n> at most. Each one stays private until you choose to show it to attorneys."; the confirmation checkbox; "Upload a document"; a status line; one row per document.
- Content per document: the file name in bold, then a status phrase: "Uploading", "Checking", "Ready, shown to attorneys", "Ready, private", "Held: please check", or "Not accepted". A held document may be followed by the notice "DELA thinks it may include client information (<reasons>)."
- Interactive elements:
  - Checkbox "This document has no confidential client information." (must be ticked before uploading).
  - "Upload a document" (button): opens a file chooser (accepts .pdf, .docx, .png, .jpg, .jpeg; one file at a time).
  - Per row: "Open" (ready or held; opens in a new tab); "Show to attorneys" / "Make private" (ready); "It has no client information" (held; browser OK/Cancel pop-up "Confirm this document has no confidential client information?"); red "Remove" (browser OK/Cancel pop-up "Remove "<name>"?"; not offered while uploading or checking).
- States: status line texts: "Tick the confirmation box above the upload first." / "Uploading <name>..." / "Checking <name>..." / "Ready." / "Held for your check: see below." / "Not accepted." / "Checking." / an error text.
- UX observations (mine): status is plain text here, while the Files page uses coloured badges with slightly different words for the same states ("Held: please check" versus "Needs your check"). No reason is shown for "Not accepted".

### "Your reviews" card (both)

- How to reach it: bottom of the Profile page. `profileReviewsCard()` line 10592 (outside my range, called from it).
- Shown when: switch `reviews` on. The "Ask a past client for a review" block: freelancer with switch `past_client_reviews`.
- Layout: heading "Your reviews"; "Only signed-in Lawfecta members can read reviews. You cannot remove a review, but you can post one response and report one that breaks the rules."; the reviews list (shared `reviewsList`, outside my range); for freelancers the sub-heading "Ask a past client for a review".
- Past client block: text "For attorneys you worked for outside Lawfecta. DELA sends a short, neutral email; you cannot add a message, and there is no reward for reviewing. They confirm they are an attorney with their state and bar number. Up to <n> requests a month and <n> in total (used: <n> this month, <n> in total)."; text boxes with placeholders "Their name" and "Their work email"; blue button "Send the request" (message "Request sent to <email>."); a list of earlier requests "<name> (<email>), <date>: <status>" with status words "Sent", "Reviewed", "Link expired", "Asked not to be asked".
- States: "Loading..."; if reviews cannot load the card is removed without a message.

---

## Connect DELA to ChatGPT or Claude: the approval page (both)

- How to reach it: tab key `?tab=connect`. ChatGPT or Claude sends the member here with `?tab=connect&req=<id>` when they add DELA as a connector. Without `req` the page is an explainer. There is no menu item. `connectView()` line 3114, `connectExplain()` line 3097.
- Purpose and primary focus: approve or deny an assistant's request to connect to the member's DELA workspace. The ONE main thing: click "Approve" or "Deny".
- Shown when: any member with a side. Approval is blocked when the connector is not open for the account or the plan does not include it.
- Layout, top to bottom: one centred card, at most 620 px wide.
  - Explainer mode (no request): heading "Connect DELA to ChatGPT or Claude"; the five explanation sections below; then "To connect: open ChatGPT or Claude and add DELA there. It brings you back to this page to approve. The steps are in Settings." and the button "Open Settings".
  - Approval mode: heading "<assistant name> wants to connect to DELA"; "It will use your <side> workspace." (members with both workspaces see "... workspace. To connect your other workspace instead, switch workspaces at the top of this page first."); small text "After you choose, you go back to <host>."; the five explanation sections; the sensitive data notice; a red notice if blocked; the buttons; a status line.
- Content and data shown: the five explanation sections (headings are h2):
  - "What <assistant> can access": read-only items. Attorney: "See your name, workspace, plan and DELA actions left"; "Read your profile and where your verification stands"; "List and read the documents in your library"; "Export a document as text, a web page or a checklist". Freelancer: "See your name, workspace, plan and DELA actions left"; "Read your profile and what is missing to be match-ready".
  - "What it can change": attorney: "Save new document drafts and suggest changes (you accept changes here, on the DELA website)"; "Have DELA's AI draft a document, using your DELA actions or your own key". Freelancer: "Nothing. It can only read."
  - "What stays private": "It cannot pay, hire, sign, send messages, delete anything or see your passwords or AI keys."
  - "What leaves DELA": "What <assistant> reads from DELA is processed by <OpenAI / Anthropic / OpenAI (ChatGPT) or Anthropic (Claude)> under your own account with them, and their terms apply to it. Disconnecting stops new reading right away, but it cannot recall what was already read."
  - "How to disconnect": "Open Settings, find the card "Use DELA in ChatGPT and Claude" and click "Disconnect". It stops working right away."
- Interactive elements:
  - "Open Settings" (explainer mode): goes to tab `ai`.
  - "Approve" (blue; disabled when the connector is off or not in the plan) and "Deny" (ghost). Both disable while working, then the browser leaves DELA for the assistant's site.
- States:
  - Loading: "Loading...".
  - Request problem: heading "Connect DELA" and a red notice, one of: "This connection request ran out or was already answered. Start again from ChatGPT or Claude." / "DELA in ChatGPT and Claude is not open for your account yet." / "Your plan does not include the ChatGPT and Claude connector." / "Some actions are paused on your account. Contact the Lawfecta Team."
  - Status line: "Connecting..." / "Saying no..." / "Connected. Taking you back to <assistant>..." / "Not connected. Taking you back...".
  - Notice (role note): "Never enter sensitive data in DELA, and that includes what you type in ChatGPT or Claude for DELA: SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords. Keep it in your own storage. You are responsible for what you enter."
- Help: none.
- Variations: the access and change lists differ by side; wording names the assistant when known.
- Mobile/accessibility notes: none specific beyond `role="status"` and `role="note"`.
- UX observations (mine): a consent screen with five headed sections before the two buttons, so "Approve" and "Deny" sit below a lot of reading. The page-wide client information notice also shows above this card, so two warnings appear on one small page. In explainer mode the only action is a plain unstyled button.

## "Use DELA in ChatGPT and Claude" card, in Settings (both)

- How to reach it: Settings page (tab key `?tab=ai`), a card further down that page. `connectionsCard()` line 3146.
- Purpose and primary focus: give the connector address and steps, and list and disconnect connected assistants.
- Layout, top to bottom: heading "Use DELA in ChatGPT and Claude"; one intro sentence; label "DELA connector address" with a read-only box and "Copy"; sub-heading "In Claude" with three numbered steps; sub-heading "In ChatGPT" with three numbered steps; a small note; sub-heading "Connected now" with the list.
- Content and data shown:
  - Intro, attorney: "Read your documents, save drafts and suggest changes from ChatGPT or Claude. Changes wait for you here before they count." Freelancer: "Connect ChatGPT or Claude to your DELA freelancer workspace. More freelancer tools come in a later update."
  - "In Claude" steps: "Open claude.ai, then Settings, then Connectors." / "Click Add custom connector. Name it Lawfecta DELA and paste the address above. Click Add." / "Click Connect next to Lawfecta DELA. This page opens: click Approve."
  - "In ChatGPT" steps: "Open chatgpt.com, then Settings, then Apps and Connectors. If you do not see a Create button, turn on Developer mode under Advanced settings." / "Click Create. Name it Lawfecta DELA, paste the address above, choose OAuth for sign in, and click Create." / "ChatGPT opens this page: click Approve."
  - Note: "Menu names in ChatGPT and Claude change from time to time. Look for Connectors or Apps. Some ChatGPT and Claude plans do not allow custom connectors."
  - Connected list rows: "<assistant name>" in bold, then " <side> workspace, connected <date>, last used <date>".
- Interactive elements: read-only text box (aria-label "DELA connector address"); "Copy" (toast "Address copied"); per connection a red "Disconnect" (browser OK/Cancel pop-up: "Disconnect <name>? It stops working with DELA right away. You can connect it again later."; toast "Disconnected").
- States: "Loading..."; not open and nothing connected: "Opens soon. You will be able to read and draft your DELA documents from ChatGPT or Claude."; empty list: "Nothing connected yet."; on load failure the card is emptied without a message.
- UX observations (mine): step 3 in both lists says "This page opens", but the page that opens is the Connect approval page, not Settings. Setup instructions and the management list share one long card.

---

## Client information card: "Who you are working with" / "Who posted this gig" (freelancer)

- How to reach it: not a page. A card shown to the freelancer on a gig page (heading "Who posted this gig", or "Who you are working with" once hired; line 7649) and on an engagement page inside the section "Who's working on this" (line 9212). `clientCard()` line 3007.
- Purpose and primary focus: tell the freelancer who the client is.
- Shown when: freelancer side, and the client has a name or a firm name; otherwise nothing is drawn.
- Layout: heading (default "Who you are working with"); one row: round picture (or a circle with the first letter), the person's name in bold, a "✓ Verified" mark when verified, a small line "Agency" or "Attorney"; then, on the right, the firm logo and firm name when there is a logo or the firm name differs from the person's name.
- Interactive elements: none.
- Mobile/accessibility notes: picture alt text "Picture of <name>"; logo alt text "Logo of <firm>"; the row wraps on narrow screens.
- UX observations (mine): display only; there is no link to the client's profile or to a conversation.

---

## Files (attorney)

- How to reach it: menu item "Files"; tab key `?tab=files`; Home button "Open Files". `filesView()` line 3185, `drawFiles()` line 3200.
- Purpose and primary focus: the firm's store of process documents, templates, forms and checklists. The ONE main thing: upload files, then open them or ask DELA about them.
- Shown when: attorney side with switch `file_uploads` on. Freelancers cannot open it.
- Layout, top to bottom:
  1. Heading "Files" and intro: "Keep your process documents, templates, forms and checklists here, and ask DELA about them. Files belong to your firm and only your firm can open them."
  2. Storage card: bold "Storage: <used> of <limit> used", small text "Files in the trash count until it empties after <n> days.", and a bar (red at 90 percent or more). The limit reads "no cap" when there is none.
  3. Card "Add files" (the upload card).
  4. Folder pills: "All files", one pill per folder, "Trash", then "+ New folder", and when a folder is selected "Rename or delete this folder".
  5. Search box.
  6. The file table in a scrolling card, or an empty-state card.
- Content and data shown:
  - Table columns: "Name", "Status", "Size", "Added", and an unnamed actions column.
  - Name cell: the file name in bold; "Version <n>, uploaded <date and time>"; plus info lines: "It may contain <kinds>. The AI will not use it until you check it." (held) / "Saved from a job. DELA's AI never reads files from a job." / "<reason> DELA did not keep it." (refused) / "No readable text was found, so the AI cannot read it." (ready, not an image).
  - Status badge words (`STATUS_WORDS` line 3182): "Ready", "Checking", "Needs your check" (held), "Not accepted" (refused), "In the trash", "Uploading". A ready file also shows "Available to your firm" under the badge.
  - Refusal reasons (`REFUSE_WORDS`): "It is not really the type its name says." / "It has scripts, macros or hidden files inside." / "It could not be opened." / "Your storage is full." / "It is over the size limit." / fallback "It could not be accepted."
  - Size cell: KB, MB or GB. Added cell: "<date and time> by <uploader>".
- Interactive elements:
  - Upload card "Add files" (`uploadCard()` line 3315):
    - Reminder: "Never enter sensitive data: SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords. Share a link from your own storage instead. You are responsible for what you enter."
    - Checkbox "These files have no sensitive data (no SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords)."
    - Text: "PDF, Word (.docx), text, Markdown, PNG or JPG, up to <n> MB each. DELA checks each file. A file that looks like it has client information is held until you check it."
    - A visible browser file input (several files allowed; accepted types come from the server).
    - "Upload" (blue). Toasts when it cannot start: "Choose a file first." / "Tick the confirmation box above the upload first."
    - Progress list: one line per file, "<name>: <state>", states "waiting", "starting", "uploading", "checking", "ready", "held: please check it below", "not accepted", "the upload did not finish. Check your connection and try again.", or an error text. Files upload one after another into the folder that is selected.
  - Folder pills (aria-pressed): "All files", each folder name, "Trash".
  - "+ New folder": browser text pop-up (prompt) "Folder name".
  - "Rename or delete this folder": browser text pop-up "Rename the folder, or leave it empty and press OK to delete it (only an empty folder can be deleted)", pre-filled with the name. Toasts "Folder renamed" / "Folder deleted".
  - Search box: placeholder "Search files by name" (aria-label "Search files"). Filters when the box loses focus or Enter is pressed, not on each keystroke.
  - Row actions (which ones show depends on status):
    - "Open" (ready, held): opens the file in a new tab.
    - "Download" (ready, not PNG or JPG).
    - "Ask DELA" (blue; ready, not from a job, switch `ai_generation`): opens Ask DELA with this file attached.
    - "It has no client information" (blue; held): browser OK/Cancel pop-up "Confirm that "<name>" has no confidential client information. You are responsible for what you upload."; toast "Thanks. The file is ready."
    - "New version" (ready, held): file chooser limited to the same file type, then a browser OK/Cancel pop-up "Upload a new version of "<name>"? Confirm it has no sensitive data (<kinds>)."
    - "Rename" (ready, held): browser text pop-up "New name"; toast "Renamed".
    - "Move" (ready, held; only when folders exist): browser text pop-up "Move to which folder? Type its number." followed by a numbered list starting "0. No folder"; toast "Moved", or "Type one of the numbers shown."
    - "Versions (<n>)" (when more than one version): opens the versions panel (below).
    - "Delete" (red; ready, held): browser OK/Cancel pop-up "Move "<name>" to the trash? You can restore it for <n> days."; toast "Moved to the trash".
    - "Clear" (refused): removes the row; toast "Cleared". No confirm.
    - "Restore" (in the trash): toast "Restored".
    - "Delete forever" (in the trash): browser OK/Cancel pop-up "Delete "<name>" forever? It is removed at once, with every version, and cannot be restored."; toast "Deleted forever".
- States: loading "Loading..."; load failure a red notice; empty folder "No files here yet."; empty trash "The trash is empty."; files being checked refresh on their own every 4 seconds; when storage is full during upload (attorney) a "Limit reached" dialog opens: "Your storage is full. Delete files or upgrade for more space." with an upgrade button and "Not now".
- Help: no "?" tips or glossary terms on this page.
- Variations: by file status as listed; files saved from a job cannot be sent to Ask DELA; image files have no "Download" button (they use "Open").
- Mobile/accessibility notes: the table has class "stack" and every cell carries a `data-label` (Name, Status, Size, Added), so it stacks into labelled blocks on narrow screens; the actions cell has no label. Pills use aria-pressed.
- UX observations (mine):
  - Up to eight buttons in one row ("Open", "Download", "Ask DELA", "New version", "Rename", "Move", "Versions", "Delete"), all the same small size. A row menu would reduce the density.
  - Folder creation, rename, delete and file move all use browser text pop-ups. "Move" asks the member to type a number, and deleting a folder is done by clearing its name. These are the least finished interactions in my ranges.
  - The search box does not filter as you type, and a search with no matches shows "No files here yet.", which reads as if the folder were empty.
  - The upload date appears twice per row (under the name and in "Added").
  - "Delete" means move to the trash; "Delete forever" is the permanent one; "Clear" is a third word for removing a refused file.
  - The upload card always sits above the list, pushing the files down the page.
  - The search text and selected folder persist while the page is redrawn; there is no sort control and no paging.

### Versions panel: "Versions of <file name>" (attorney)

- How to reach it: Files page, row button "Versions (<n>)". `showVersions()` line 3302.
- Purpose and primary focus: download an earlier version of a file.
- Layout: a side drawer (role dialog, aria-label "Versions") with the heading "Versions of <file name>" and a list. The close control comes from the shared drawer (outside my range).
- Content per item: "Version <n>" plus " (current)" on the current one; "<date and time>, <size>".
- Interactive elements: "Download" per version.
- States: no loading or empty text in the code.
- UX observations (mine): there is no way to restore an earlier version as the current one from here; only download.

---

## Cross-page elements seen

- Sensitive data reminder, two wordings: beside AI writing boxes "Never enter sensitive data: ... Keep it in your own storage. You are responsible for what you enter." (`aiNotice`), and beside uploads "... Share a link from your own storage instead. ..." (`notice`). The list of kinds is always "SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords".
- Client information check, three presentations of the same idea: an inline problem box with buttons (Ask DELA), a browser OK/Cancel pop-up (profile save, "Write with DELA", "Draft with DELA", "✦ Improve my request"), and a "held" file state with a confirm button (Files, Profile documents).
- "I confirm" tick box before upload (Files and Profile documents), with the shared message "Tick the confirmation box above the upload first."
- Upload flow shared by Files and Profile documents: start, upload, check, then ready, held or refused.
- File status words. Files page badges: "Ready", "Checking", "Needs your check", "Not accepted", "In the trash", "Uploading". Profile documents text: "Uploading", "Checking", "Ready", "Held: please check", "Not accepted".
- Verification status words shared by licenses and LinkedIn: "Waiting for the Lawfecta Team", "We need a little more", "Verified", "Not verified", "Check out of date".
- Readiness badge words: "Not complete", "Waiting for a check", "Ready", "Availability out of date", "Not taking work", "Paused".
- Badge colours by class: "ready" (good), "held" (waiting), "bad" (problem), plain (neutral).
- `field(label, input, hint, help)`: label row with a "?" help icon (`D.helpTip`), the input, and a small muted hint. Used on every profile, firm, license and services field.
- AI buttons carry a "✦" mark and class "ai-btn": "✦ Improve my request", "✦ Write with DELA". AI cost wording: "Uses DELA actions like Ask DELA." and "Uses <n> DELA action(s) on Lawfecta's AI (none on your own key)."
- Pills (class "pills") used as section jump links (Profile), as a choice group (Appearance) and as folder tabs (Files).
- Toggle chips (blue when on, ghost when off, aria-pressed) for practice areas, tech tools and categories; removable chips with "×" for attached files and picked categories.
- Expandable sections (native details/summary) throughout the profile: readiness explainer, "Add a license", ready-made pictures, practice areas, Lawfecta categories, biography, tool groups, "Let DELA draft...".
- Toasts (`D.toast`) for success and short errors; inline `role="status"` lines under buttons for form errors; red "notice bad" boxes for load failures.
- Browser pop-ups are still used for: withdraw license, remove or confirm a profile document, disconnect an assistant, every Files confirm, and all Files text entry (new folder, rename, move). Inline confirm is used only for deleting a chat.
- "Limit reached" dialog (`limitPopup`) with an upgrade button and "Not now": opened from Ask DELA (actions used up) and Files (storage full), attorney side.
- Loading text is always "Loading..." (or "Loading the categories...").
- Button styles: "blue" (primary), "ghost" (secondary), "danger" (red), "linkish" (text link), with "small" variants.
- Shared error wording for the library and AI (`failText`, line 3394, used by "Write with DELA" and "Draft with DELA"): for example "Your own AI key did not work: <problem> Nothing ran on Lawfecta's AI. Open Settings to fix it." and "DELA's AI could not finish: <problem> No DELA actions were used. Please try again."
