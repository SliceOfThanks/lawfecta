# ChatGPT test: UI review of DELA (look only, light and dark)

A look-only review of how DELA looks on a computer screen: layout, alignment, spacing, text that is cut off or overlapping, buttons that look different for the same job, colors and contrast, in the light and the dark appearance. Phone widths are not part of agent tests (Claude's browser tests check those).

It changes one thing and puts it back: the attorney's own "Appearance" choice in the account menu (Dark for part of the test, then "Match my device" again).

Each account logs in once: attorney, then freelancer.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use hirelegalhelp.com in other tabs while it runs, and run it on its own.

Paste everything below the line into ChatGPT in agent mode.

---

You are reviewing DELA on the Lawfecta test site, www.hirelegalhelp.com, as an experienced visual (UI) designer. Your job is to find visual problems on a computer screen. You only look: you do not type, save, send, sign or pay anything, except the Appearance choice the steps name.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD

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
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

WHAT TO LOOK FOR ON EACH PAGE
Scroll from the top to the bottom once. Write PASS if you see none of these, or FAIL with each problem as "Problem: ... | Where: card heading, button or box name | Screenshot":
- Text cut off, overlapping, or running outside its card or button.
- Cards, headings or buttons that do not line up with the ones next to them, or uneven gaps.
- Two buttons doing the same kind of job that look different (color, size or shape), or a main action that does not look like the main action.
- Text that is hard to read: too small, too light, or low contrast on its background.
- Labels or badges with the same meaning but different wording or colors on different pages.
- Empty or loading states that look broken (a blank card, "Loading..." that never ends, an error).
- Anything that looks unfinished: a stray character, a broken icon, a link that looks like plain text, a missing space.

Steps

ATTORNEY, LIGHT APPEARANCE (log in once)

1. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the test attorney.
2. Do: click the round button with your initials at the far right of the dark top bar. In the menu under "Appearance", click "Light".
   Expect: the page turns light (white cards on a light grey background).
3. Look: https://www.hirelegalhelp.com/dela?tab=home
4. Look: https://www.hirelegalhelp.com/dela?tab=delegate
5. Look: https://www.hirelegalhelp.com/dela?tab=library (the cards, the category and status buttons, the bottom links and the "Not sure where to start?" card)
6. Look: https://www.hirelegalhelp.com/dela?tab=files
7. Look: https://www.hirelegalhelp.com/dela?tab=projects
8. Look: https://www.hirelegalhelp.com/dela?tab=projects&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement (do not click "Approve the change", "Decline", "Pay" or "Sign")
9. Look: https://www.hirelegalhelp.com/dela?tab=talent
10. Look: https://www.hirelegalhelp.com/dela?tab=profile (open the folded "Practice areas" and "Biography" lines; do not click "Save")
11. Look: https://www.hirelegalhelp.com/dela?tab=ai

ATTORNEY, DARK APPEARANCE (same login)

12. Do: click the round button with your initials, and under "Appearance" click "Dark".
    Expect: the page turns dark (dark cards on a near-black background), and all text is still easy to read.
13. Look again, in dark: https://www.hirelegalhelp.com/dela?tab=home
14. Look again, in dark: https://www.hirelegalhelp.com/dela?tab=library
15. Look again, in dark: https://www.hirelegalhelp.com/dela?tab=projects&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
16. Look again, in dark: https://www.hirelegalhelp.com/dela?tab=profile
17. Do: click the round button with your initials, and under "Appearance" click "Match my device" (this puts it back).
18. Sign out.

FREELANCER (log in once)

19. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the test freelancer.
20. Look: https://www.hirelegalhelp.com/dela?tab=home
21. Look: https://www.hirelegalhelp.com/dela?tab=profile (do not click "Save")
22. Look: https://www.hirelegalhelp.com/dela?tab=work
23. Look: https://www.hirelegalhelp.com/dela?tab=earnings
24. Look: https://www.hirelegalhelp.com/dela?tab=inbox&thread=4ad45c8e-ac59-4300-9577-48b42e50e3b4 (click the blue "Book a meeting" button near the top of the conversation and look at the booking card; do not click a time or "Review booking")
25. Sign out.

AT THE END
After the step lines, add:
- Top 10: the ten most visible problems, most visible first, each with the page and where.
- Consistency notes: places where the same thing looks different on two pages.
- Dark appearance: anything that is hard to read only in dark.
Put all of it in DELA-test-report.txt.
