# PlugThis prompt: the Lawfecta DELA Recorder (Chrome extension)

What this is: a prompt to paste into PlugThis (plugthis.ai), the AI builder for Chrome extensions. It builds a Chrome screen recorder and capture tool for attorneys and freelancers. It works when they are not logged in to DELA, keeps the captures on their own computer, and puts them into their DELA account later.

How it reaches DELA, in two stages:
- Stage 1 works with DELA today. The extension saves each capture as a file in the format DELA's "Import from Scribe" already reads (Library tab, "Import from Scribe"). The member uploads it once logged in, and DELA's review screen and "Build my playbook" take it from there.
- Stage 2 sends captures automatically after a one-time "Connect to DELA" pairing. DELA needs two new api routes for this (pairing and receiving a capture). Claude builds them after Stacey answers the questions at the end of this file. Until then, the extension's "Connect to DELA" button shows "Coming soon".

Paste everything below the line into PlugThis.

---

Build a Chrome extension (Manifest V3) called "Lawfecta DELA Recorder".

WHO IT IS FOR
Attorneys, small law firm staff, and freelance legal operations professionals. They use it to capture how they do a routine task in any web app (for example opening a matter in Clio, or sending an intake form), step by step with screenshots, so DELA can turn it into a written procedure (an SOP) they can hand to someone else. Many are not technical. Many work with confidential client information, so privacy rules below are strict and not optional.

WHAT IT DOES
1. Step capture (the main mode). The user clicks "Start capturing" in the extension's side panel. On each click in the page, the extension:
   - takes a screenshot of the visible tab
   - writes a plain step from the element clicked, for example: Click "Save", Open "Contacts", Select "New matter"
   - for typing, writes only: Type in "Client name" (never the text typed)
   - draws a small highlight circle where the click happened on the screenshot
   - records the site's host name (for example app.clio.com), never the full web address with query strings
   The user clicks "Pause", "Resume" or "Stop". A small red dot on the extension icon shows while it is capturing.
2. Screenshot only. A "Take a screenshot" button captures the visible tab as one step with an empty text the user can fill in.
3. Screen video (optional, off by default). A "Record a video" button records the current tab with chrome.tabCapture through an offscreen document and MediaRecorder (WebM). The video stays on the computer. It is never uploaded in stage 1. It can be saved by the user with "Save video". No microphone unless the user turns on "Record my voice" each time.

EDITING BEFORE ANYTHING LEAVES THE COMPUTER
In the side panel, a capture shows as a list of steps, each with its screenshot. The user can:
- give the capture a title (required before export, for example "Open a new matter in Clio")
- edit any step's text, add a "Why this step matters" note, reorder steps by drag and drop, and delete steps
- blur part of a screenshot by dragging a box over it. The blur is applied to the image pixels (a heavy pixelation), so the original is not kept anywhere
- delete a whole capture

PRIVACY RULES (all required)
- Never capture what the user types. Only the field's label.
- Never take a screenshot while the focused element is a password field, and skip any click inside input type="password", or a field whose name or autocomplete says it is a card number, card security code, bank account or routing number, social security number or one-time code.
- Before each screenshot, blur on the image every visible input whose type is password, and every input whose autocomplete is cc-number, cc-csc, or one-time-code.
- A "Never capture on these sites" list in the extension's settings. Ship it with common banking and email hosts filled in (for example mail.google.com, outlook.office.com, outlook.live.com), and let the user add more. Capturing stops on those hosts and the panel says why.
- Show this notice in the side panel above "Start capturing", every time: "Use test or made-up data where you can. Do not capture Social Security or ID numbers, financial account numbers, health information, or passwords. DELA asks you to check every screenshot before it is used."
- Store captures only in the extension's own IndexedDB on this computer. Encrypt each screenshot and step list with AES-GCM using the Web Crypto API and a key the extension generates on first run and keeps in chrome.storage.local.
- Delete a capture from the computer after it is exported or sent, unless the user ticks "Keep a copy on this computer".
- Unsent captures older than 30 days are deleted. Show a notice 3 days before.
- No analytics, no tracking, no third-party services, no remote code, no ads. The only network requests the extension makes are to the DELA server in stage 2.
- Ask for the fewest permissions: activeTab, scripting, storage, sidePanel, offscreen, tabCapture (only for video), downloads. Use optional host permissions requested at the moment capture starts on a site, not broad host access at install.
- Include a short privacy page in the extension (Options page, "Privacy") that says the above in plain words.

STAGE 1: SAVE FOR DELA (works with no login)
A blue "Save for DELA" button on a finished capture downloads one Markdown file named after the title (for example open-a-new-matter-in-clio.md) in exactly this format:
- First line: # followed by the title
- Then one numbered line per step: 1. Click "Save" (the step text, then the "Why this step matters" note after " Why: " if there is one)
- Right after each step's line, its screenshot as a Markdown image with a data URI: ![Step 1](data:image/jpeg;base64,...)
- Screenshots as JPEG, at most 1600 pixels wide, quality 0.8, each under 1.5 MB. At most 100 steps per file.
After the download, the panel says: "Saved. In DELA, open the Library tab, click "Import from Scribe", tick the box, and choose this file. DELA shows every step and screenshot for you to check before it builds anything."

STAGE 2: SEND TO DELA (after a one-time pairing; build the screens now, the server comes later)
- Options page: a "DELA server" box (default https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api, the test site) and a "Connect to DELA" button.
- Pairing: the user gets a 6-character pairing code in DELA (shown on DELA's Library tab), types it into the extension, and clicks "Connect". The extension sends POST {server}/recorder-ext/pair with JSON { "code": "ABC123", "device_name": "Chrome on <operating system>" }. The answer is { "ok": true, "token": "...", "member_name": "...", "expires_at": "..." } or { "ok": false, "reason": "..." }. Store the token encrypted like the captures. Show "Connected as <member_name>" and a "Disconnect" button that deletes the token.
- Sending: a finished capture gets a "Send to DELA" button when connected. It sends POST {server}/recorder-ext/captures with the header Authorization: Bearer <token> and JSON { "request_id": "<a UUID made once per capture, reused on retries>", "title": "...", "captured_at": "<ISO time>", "steps": [ { "n": 1, "text": "Click \"Save\"", "why": "...", "host": "app.clio.com", "image": "data:image/jpeg;base64,..." } ] }. Success is { "ok": true, "import_id": "...", "review_url": "..." }: show "Sent. Open it in DELA to check and build it." with a button that opens review_url.
- If the user is not connected, or the computer is offline, or the server answers with an error: keep the capture, mark it "Waiting to send", and try again when the browser is online and the extension is opened. Never send twice: always reuse the same request_id.
- If the server answers 401, the connection has ended: delete the token, show "Connect to DELA again", and keep the capture.
- Until the server routes exist, the server answers 404: then show "Sending to DELA is coming soon. Use "Save for DELA" for now." and keep the capture.
- Never send video in stage 2.

LOOK AND FEEL
- Side panel (chrome.sidePanel), clean and simple: white cards with bold headings, one blue main button per screen, outlined buttons for the rest, grey hint text, at least 14 px text.
- Lawfecta brand: deep plum (#3B1736) for headings and the main button, white background, and a small "Lawfecta DELA" name at the top. Use plain words: "Start capturing", "Pause", "Stop", "Save for DELA", "Send to DELA", "Delete".
- Every button works with the keyboard, and every icon button has a text label for screen readers.
- After any action, a short message stays at the top of the panel until the next action (not a pop-up that disappears).

WHAT TO TEST BEFORE YOU HAND IT OVER
- A 5-step capture on any public site exports a Markdown file in the exact format above, with 5 numbered steps and 5 images.
- Typing in a field records only Type in "<label>", never the text.
- Clicking in a password field takes no screenshot.
- A blurred area stays blurred in the exported image.
- A site on the "Never capture on these sites" list does not capture.
- With no network, "Send to DELA" keeps the capture as "Waiting to send".
- A 404 from the server shows the "coming soon" message and keeps the capture.

Hand over the source code as a .zip, with a README that says how to load it unpacked in Chrome and the permissions it uses and why.

---

## For Stacey and Claude: what DELA needs for stage 2 (not part of the PlugThis prompt)
DELA builds, after Stacey answers these questions (a brief comes first, as for every build):
1. A pairing card on the Library tab: "Connect the Lawfecta DELA Recorder", which shows a 6-character code valid for 10 minutes.
2. POST /recorder-ext/pair: swaps the code for a device token that can only send captures (nothing else), shown and revocable in AI settings, like the ChatGPT and Claude connection.
3. POST /recorder-ext/captures: checks the token, the switch and the member's plan limits, runs the same checks as "Import from Scribe" (images checked for client information, blur review), and saves the capture as an import draft. Nothing is built or published until the member reviews it in DELA.

Questions for Stacey:
- Which plans get the recorder extension? (Suggested: every plan, the same as Import from Scribe.)
- Should freelancers get it too, to document how they work for their profile? (Suggested: yes, attorneys first.)
- How long does a device stay connected? (Suggested: 90 days, then pair again.)
- Should the extension be published on the Chrome Web Store under Lawfecta, or shared only with beta members as an unpacked .zip first? (Suggested: unpacked for beta testers first.)
