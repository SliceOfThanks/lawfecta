# ChatGPT check 17, report of 2026-11-20 (steps 61 to 64)

Run in an in-app browser at a narrow width, then three steps retested at 1800 x 1250.

Result: 10 of 13 passed at the narrow width. The three fails came from the narrow layout:
- 01: the "Do you already use ChatGPT or Claude?" card sat below Home's cards. By design under 700px (step 33's first screen).
- 03: "Paste your key first." was below the visible part of the screen. Passed at desktop width.
- 08: Members was under "More" in the bottom menu, not in a left sidebar. Passed at desktop width.

Findings, and what was done (code_version bf6c3df):
- Ask DELA added "Practice area and jurisdiction: Needs your input" and a question about attorney review to a newsletter process. Fixed: those two parts are for legal work only (systemPrompt in app.ts; test in ai_files_test.ts).
- "Access list" and "No access" beside "DELA is open to every member". Fixed: with access.mode "everyone" the tags name only people on the list, and the member page says the list decides nothing right now.
- The Members page did not say which controls are the owner's. Fixed: a line under the member's name.
- "Small credit" gives no amount. Changed to "the smallest credit they offer".
- "Author (approves)" left open who else approves. A line under it says the author or the Library administrator.
- "Showing 0 to 0 of 0" on an empty search. Removed.
- An empty key gave no visible message at a narrow width. It now also shows at the bottom of the screen, and the box takes the cursor.

Not done: a link from a member's page to their record in the website's back end (the address format is not known).
