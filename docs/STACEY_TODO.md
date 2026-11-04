# Stacey's to-do list, in order

Last updated 2026-11-04. Do these from top to bottom. Each one says where to go, what to click and what to have ready. Never paste a password, key or secret into chat. Type them only into BD, Google, Supabase, GitHub or ChatGPT on your own computer.

Already done: the Brevo key, Lawfecta's OpenAI key and the key lock secret in Supabase; US only for licenses; practice areas and tech tools on profiles.

## 1. Fix the test site login (do this first; every test waits on it)
Logging in at https://www.hirelegalhelp.com/login shows "Invalid recaptcha response or setup". reCAPTCHA is turned on in BD but has no working keys, so nobody can log in through that form. Pick one way:

Way A: turn reCAPTCHA off for the test site's login (quickest)
1. Log in to the hirelegalhelp.com BD admin.
2. In the admin search box, type: reCAPTCHA
3. Open the setting it finds and turn reCAPTCHA off for the member login form. Save.
4. Log out, then log in at https://www.hirelegalhelp.com/login as the test attorney to check it works.
Do this on hirelegalhelp.com only. Never change it on lawfecta.com.

Way B: set reCAPTCHA up properly
1. Open https://www.google.com/recaptcha/admin/create and sign in with Lawfecta's Google account.
2. Label: hirelegalhelp test site. Type: the one BD's reCAPTCHA setting asks for (BD shows v2 or v3 next to the key boxes). Domain: hirelegalhelp.com. Click Submit.
3. Google shows a site key and a secret key. Copy each one.
4. In the hirelegalhelp.com BD admin, search for "reCAPTCHA", paste the site key and the secret key into their boxes, and save.
5. Log out, then log in at https://www.hirelegalhelp.com/login to check it works.

With either way: if ChatGPT's agent is still stopped at the login, click "Take over" in ChatGPT, log in yourself, then click to hand control back and type: I'm logged in, continue the checklist. Do the same when it needs the freelancer or owner login.

## 2. Run the ChatGPT tests, in this order
For each test:
1. Use the ready-to-paste copy Claude sent you in chat (logins and passwords filled in). The GitHub copy has everything except the passwords.
2. Fill in any part still in capitals (for example YOUR_OPENAI_KEY).
3. Paste everything below the line into ChatGPT in agent mode.
4. Send Claude the report in this chat.
Claude fixes anything that fails, then tells you which part to run again.

### 2a. Step 3: profiles and verification
- Test: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-3-chatgpt-prompt.md
- Have ready:
  - the logins are filled in: test attorney stacey+dela-attorney@lawfecta.com, test freelancer stacey+dela-freelancer@lawfecta.com, owner stacey@lawfecta.com (passwords only in the copies Claude sends you in chat, never on GitHub)
  - the work email for the license check is hello@lawwurk.com: have that inbox open
  - a short resume as a PDF with no client information
  - any program file renamed to end in .pdf
- During the test, ChatGPT asks you to open that work email and click the button in it while logged in as the test attorney.

### 2b. Short screens test (Ask DELA, Files, library, exports, your own AI key)
- Test: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2-short-chatgpt-prompt.md
- Have ready:
  - a short process write-up as a Word file or PDF, with no client information
  - a program file renamed to end in .pdf
  - your own OpenAI key from https://platform.openai.com/api-keys
- Type the key only into ChatGPT on your own computer.
- After the test, delete that key at https://platform.openai.com/api-keys (click the key, then Revoke), or make a new one.

### 2c. DELA in Claude and ChatGPT (the connector)
- Test: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2b-connector-test.md
- Claude: open https://claude.ai/settings/connectors, click "Add custom connector", name it Lawfecta DELA, and paste this address: https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api/mcp
- ChatGPT: Settings, then Apps and Connectors, then Create. If there is no Create button, turn on Developer mode under Advanced settings first.
- Log in to https://www.hirelegalhelp.com as the test attorney first, in the same browser.

### 2d. Process Recorder check on a real computer
- Test: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2-recorder-chatgpt-prompt.md
- Direct link to the recorder: https://www.hirelegalhelp.com/dela?tab=record
- Use Chrome first, then Edge, then Firefox. Use a practice process with no client information on screen.

## 3. Answers Claude needs from you
1. Scribe add-on: answer the 6 questions, or reply "use suggestions": https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/briefs/step-2s-scribe-import-plus.md
2. One real Scribe guide with no client information:
   1. In Scribe, open the guide and click Share, then Export.
   2. Download it as HTML, then as Markdown, then as Word.
   3. Attach the three files in this chat.
3. Settings to confirm (reply "use suggestions" or give your numbers):
   - Playbooks per plan. Suggested: Free 10, Plus 40, Pro 90, Business 140.
   - AI credits per task. Today: chat 1, chat with files 2, talking 1, playbook draft 3.
   - Process Recorder. Today: longest recording per plan, days videos are kept, and credits per recording, as set in the admin area.
   - DELA in ChatGPT and Claude. Today: on every plan; posting or sending from ChatGPT and Claude is off.
   - Profile documents. Today: 10 per freelancer, 10 MB each.
   - License re-check every 12 months, with 30 days to catch up.
   - A booking link for the 10 minute license video call (TidyCal or Calendly). Until then the Lawfecta Team emails the attorney.
   You can see and change every setting at https://www.hirelegalhelp.com/dela-admin, Settings tab.

## 4. Let DELA put practice areas on the directory listing (about 2 minutes)
1. Log in to the hirelegalhelp.com BD admin.
2. In the admin search box, type: API, then open the API keys page.
3. Open the key DELA uses and click Permissions.
4. Turn on list_professions and the services list (top categories and sub categories). Save.
5. Tell Claude: done.

## 5. Ask Vectera the meeting questions
1. Open the 11 questions: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/research/vectera-meetings-evaluation.md
2. Email them to Vectera's sales or support team (from https://www.vectera.com, Contact).
3. Paste their answers in this chat.

## 6. GitHub safety settings (about 10 minutes; skip any you already did)
1. Security:
   1. Open https://github.com/SliceOfThanks/lawfecta/settings/security_analysis
   2. Turn on Dependabot alerts, Dependabot security updates, and Secret scanning with Push protection.
   3. Leave CodeQL default setup off.
2. Pull requests:
   1. Open https://github.com/SliceOfThanks/lawfecta/settings
   2. Under Pull Requests, tick "Allow auto-merge" and "Automatically delete head branches".
3. Rule for main:
   1. Open https://github.com/SliceOfThanks/lawfecta/settings/rules and click New ruleset, then New branch ruleset.
   2. Name it main protection. Target: the default branch.
   3. Tick "Require a pull request before merging" (0 approvals) and "Require status checks to pass". Add the check tests.
   4. Add nobody under bypass. Set it to Active and save.
4. AI review key:
   1. Make a key just for this at https://console.anthropic.com (API Keys), and set a monthly spend limit there (suggested 50 dollars).
   2. Open https://github.com/SliceOfThanks/lawfecta/settings/secrets/actions, click New repository secret, name it ANTHROPIC_API_KEY, and paste the key.
5. Tell Claude: GitHub done.

## 7. Later (not now)
- Before Step 6 (payments): a Stripe account in test mode. Claude sends the steps then.
- Before the beta (after Steps 4 to 6), set up Live (lawfecta.com). Steps: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/STACEY_CHECKLIST.md, Part C.
  - Supabase organization Lawfecta Live, upgraded to Pro.
  - The Live secrets.
  - The GitHub environment named live.
- A Chrome Web Store developer account in your name, only if we build the recorder's Chrome extension.

## Where things stand
The full plan: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/PLAN.md
