# ChatGPT check 5, notifications, run by Stacey on 2026-11-17

13 of 13 passed. Stacey pasted the report with one screenshot of the panel.

## Found in the notes, and fixed
- The bell said 70 unread and the panel said "50 unread": the panel counted only the 50 notifications it had loaded. It now shows the member's true count, the same number as the bell.
- The bell stayed at 70 after one notification was dismissed, restored or marked unread on the page. The bell now follows what is done on the page.
- In the screenshot, "Close" sat over "4 pending" at the top of the panel. The panel's heading has more room under it.

## Not exercised
- One job's history from the panel ("View N earlier updates for this job"): none of the four updates shown had earlier ones. The browser test in tests/pw does not cover it either. Open.
- The exact words of the "Dismissed" message were not captured; the change itself was seen.
