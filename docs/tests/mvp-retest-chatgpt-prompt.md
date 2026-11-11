# ChatGPT re-test: the 5 MVP fails (2026-11-09)

Checks the fixes for the MVP test's failed steps 4, 7, 13, 14 and 19, and the wording fixes. Short: three logins, 14 steps.

Notes on what changed:
- One click "Use all suggestions" for DELA's suggestions.
- The agency draft takes the state from a named city, never writes about missing facts in the summary, and names boxes still empty.
- Talent's skill filter also searches services, headline and summary.
- Step 14 of the first test used a prepared dispute job whose made-up agreement had no parties or fees; that was Claude's test data, not DELA. This re-test opens an agreement made the normal way.

Before you paste this: the passwords are filled in on the ready-to-paste copy in chat (this GitHub copy says TEST_PASSWORD). For hello@legalstacey.com use the password you chose at checkout. Each time ChatGPT reaches the login page, click "Take over", log in, hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are re-testing DELA on the Lawfecta test site, www.lawfecta.co. Everything here is made up.

Logins (I log in for you each time):
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- new attorney: hello@legalstacey.com

HOW TO WORK
1. Do only the numbered steps below, in order. Do not explore.
2. When a step says "Go to", type that link into the address bar and press Enter.
3. Every button and box is named in quotes, exactly as the screen writes it, with where it is. If you cannot see it after scrolling to that heading, press Ctrl+F (Cmd+F on a Mac), type the name and use the match. If it is still not there, take one screenshot, write FAIL with what you saw, and go on.
4. When DELA is writing, wait up to 60 seconds.
5. To sign out: click the round button with your initials at the far right of the dark top bar, then "Sign out".
6. At the login page, stop and ask me to log in, naming the account.
7. Report one line per step: number, PASS or FAIL, a few words. Screenshots only for FAILs. Put the report in a text file named DELA-retest-report.txt and give me the link.

Steps

TEST FREELANCER (log in once)
1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
2. Go to: https://www.lawfecta.co/dela?tab=agency
   Find: the card "Agency profile" near the top.
   Do: in the box "Tell DELA about your agency" type: Fictional test agency: four paralegals in Austin doing family law discovery responses and case file organizing for small firms. We use Clio.
   Do: click "✦ Let DELA draft it".
   Expect: within 60 seconds "DELA filled in the boxes...", and the box "States you serve" shows TX. If any box is still empty, a yellow line names it ("Still empty: ..."). The "Summary" box says nothing about "the notes" or what is missing.
3. Do: click "Save the agency profile" at the bottom of the card.
   Expect: "Saved", and the card says "Complete."
4. Go to: https://www.lawfecta.co/dela?tab=home
   Expect: the "DELA guide" card no longer asks for the agency profile. Write what it says now.
5. Look at the dark top bar: next to the round logo it reads "DELA" in full (not "DEL"). Sign out.

TEST ATTORNEY (log in once)
6. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
7. Go to: https://www.lawfecta.co/dela?tab=talent
   Do: in the box "Describe the task (for ✦ Help me find a fit)" type: Fictional test: build a document checklist for a family law case in Texas. Click "✦ Help me find a fit".
   Expect: within 60 seconds a box with DELA's suggestions and a blue button "Use all suggestions" above them.
   Do: click "Use all suggestions".
   Expect: the boxes "Practice area", "Skill" and "State you need" are filled at once, and a message says "Added to the filters. Check them, then click Search."
8. Do: change the "Skill" box to: checklist. Click "Search".
   Expect: at least one freelancer is listed (DELA Test Freelancer, whose service is about document checklists).
9. Go to: https://www.lawfecta.co/dela?tab=projects&gig=64ed7250-64b3-4423-a4f1-e0e890da40dc&view=agreement
   Expect: the agreement for "Repeat: Run a Conflict Check" shows the client firm, the freelancer's name, "Your total:" with an amount, and under "Fees" the price for the work and the platform fees as dollar amounts (no "-").
10. Go to: https://www.lawfecta.co/dela?tab=library
    Expect: approved documents say "Ready to use (approved)". Sign out.

NEW ATTORNEY (log in once)
11. Go to: https://www.lawfecta.co/login and ask me to log in as hello@legalstacey.com.
12. Go to: https://www.lawfecta.co/dela?tab=home
    Expect: the greeting has no ", there" at the end if the account has no name.
13. Go to: https://www.lawfecta.co/dela?tab=library
    Do: click "Create a document" (the blue button at the top right of the Library; the screen it opens is titled "New document"). If the card "Your firm profile for documents" shows, type in "Describe your firm (optional)": Fictional test firm: two attorneys doing family law and estate planning in Texas; we use Clio. Then click "✦ Help me describe my firm".
    Expect: DELA's suggestions with a blue "Use all suggestions" button. Click it; the boxes fill at once. (If the firm profile is already saved and the card does not show, write SKIPPED.)
14. Sign out.

At the end: the step lines, the FAIL list, and anything confusing, in DELA-retest-report.txt.
