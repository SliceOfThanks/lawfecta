# ChatGPT check 4, the Inbox and conversations, run by Stacey on 2026-11-17

12 of 14 passed. Stacey pasted the report with three screenshots.

## The two failures
- Steps 1 and 4: the freelancer's rows and header showed the firm's name, "Example Lantern Legal", where the check expected "DELA Test Attorney". The check was wrong about the list: a freelancer's Inbox has always listed the firm. It was right about the page: the attorney's name sat in a second card, "Who you are talking with". Changed: the header now names the person, "✓ Verified" and "Attorney at FIRM", and the second card is gone.

## Found in her screenshots, not in the numbered steps
- "More", "Attach a file" and "✦ AI tools" were filled dark red and had an empty white box behind them. Cause: the menu button took the filled button style, and a closed menu still drew its empty panel. Fixed, with a test of the rendered style in tests/pw/meetings-test.js.

## Notes
- Two files with the same name in "Choose from Lawfecta Files": each line now says its version and when it was added.
- "Message removed" with no reason on an old test message: older removed messages carry no reason (known, 2026-11-13).
- The attorney's box held an old unsent draft from "Draft an agenda", which has since left the conversation.
- The drafted reply mentioned Clio and Tyler Odyssey: both are in the test freelancer's own profile, which DELA gives the AI.
- On a narrow window the menu is the bottom bar with "More", as designed.

Everything else passed: search, the filters and their counts, the tag and preview, the attachment menu for both sides, the three AI tools, the suggested draft staying out of the box until "Use suggestion", "More", one sent message showing as "You: ..." in the Inbox.
