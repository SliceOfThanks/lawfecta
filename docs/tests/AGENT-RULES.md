# The "How to work" block for every ChatGPT and Claude test

Every test prompt starts with this block, word for word, right after the line. It stops the agent from searching and exploring, which uses up credits (Stacey 2026-11-05).

Rules for writing test steps:
- Each step has up to four lines: "Go to" (the exact link), "Find" (the card heading, how far down the page, left or right), "Do" (the exact button or box name in quotes and what it looks like), "Expect" (what should appear).
- Name every button exactly as the screen writes it, including symbols (for example "🖼 Add image", "← Library").
- Give the direct link whenever a page has one, so the agent types it instead of clicking around.
- No phone-width checks in agent tests. Claude's browser tests cover the phone.
- No step that asks the agent to "find" or "check" something without saying where it is.
- Tests that can run at the same time get separate items to work on (named in the prompt), so the two agents never change the same thing.
- Claude in Chrome uses Stacey's own Chrome and its logins. During a Claude test, nothing else in that Chrome may use hirelegalhelp.com: a page load in another tab switches the login for every tab (track B, 2026-11-05: a question went out as the owner and was lost). Best: a separate Chrome profile only for Claude tests.
- Claude in Chrome quietly cancels browser OK/Cancel pop-ups. Claude tests tell Claude to make the page answer OK by itself before a (POP-UP) step: it runs window.confirm = () => true and window.prompt = () => "Test" in the page. ChatGPT's browser handles these pop-ups itself.

---

HOW TO WORK (read this first; it saves time and credits)
1. Do only the numbered steps below, in order. Do not explore, do not open other menus, and do not look for other features.
2. When a step says "Go to", type that link into the browser's address bar and press Enter. Do not get there by clicking around.
3. Every button, box and link is named in quotes, exactly as the screen writes it, with where it is. First scroll to the card heading the step names, then look for the item.
4. If you cannot see it after scrolling to that heading: press Ctrl+F (Cmd+F on a Mac), type the name without the quotes, press Enter, and use the highlighted match. If it is still not there, take one screenshot, write FAIL for that step with what you saw, and go on to the next step. Never try more than this one other way.
5. When a step says DELA is writing or checking, wait up to 60 seconds without clicking anything else.
6. What every DELA page looks like:
   - A dark bar across the very top: the Lawfecta logo and a small yellow "Test site" label on the left; on the right, an "Inbox" button, a "Notices" button and a round button with your initials.
   - Just under the dark bar, a row of tabs. Attorneys see "⌂ Home", "✦ Ask DELA", "▥ Library", "▤ Files", "▣ Projects", "◌ Talent". Freelancers see "⌂ Home", "✦ Ask DELA", "☺ Profile", "▣ Work", "$ Earnings".
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Blue buttons are the main actions. Outlined buttons (white with a dark pink border) are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
7. To sign out: click the round button with your initials at the far right of the dark top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.hirelegalhelp.com/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds.
