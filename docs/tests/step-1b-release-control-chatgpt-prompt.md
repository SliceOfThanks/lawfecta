# ChatGPT test prompt: DELA 0.2.0 (Release Control, help tips and Guide)

Paste everything below the line into ChatGPT with browsing or agent mode. The website address is already filled in. Fill in the three test logins first (OWNER_LOGIN, ATTORNEY_LOGIN, FREELANCER_LOGIN).
Do not give ChatGPT your release password. Part D is done by you, not ChatGPT.

---

You are testing the Release Control dashboard in the DELA admin area on the Lawfecta website (www.hirelegalhelp.com). It controls when new versions go from Staging (test copy) to Live (real members). Test it like a careful owner and like someone trying to misuse it. Report every step as PASS or FAIL with what you saw. Take a screenshot of anything that looks wrong or confusing. Do not enter real client information anywhere. Never type a password unless the step says so.

Logins:
- Owner (Lawfecta Team): OWNER_LOGIN
- Test attorney: ATTORNEY_LOGIN
- Test freelancer: FREELANCER_LOGIN

Part A: Owner, first look
1. Log in as the owner. Open www.hirelegalhelp.com/dela-admin. Expect the first tab to be "Release Control" and to open by itself.
2. Expect two cards side by side (stacked on a phone): Staging and Live. Each shows a health label, the version running, when the worker last ran, problems in the last 24 hours and paused areas. Staging should say Healthy and "Worker last ran" should be a few minutes ago at most.
3. Expect a "Next version" card with six steps: Built on Staging, Automatic tests passed, ChatGPT report saved, You marked it tested, Pushed with your password (and code), Live and healthy. Done steps show a tick. The next step to do is highlighted.
4. Expect three boxes under the steps: What changes for members, Database changes, Proof it works. Click "Automatic tests: passed". It should open a GitHub page that says the run succeeded.
5. Under the Push to Live button, expect a plain list of anything still missing (for example "The ChatGPT test report is not saved yet" or "GitHub is not connected for pushes yet"). Push to Live must be greyed out while anything is listed.
6. Version history: expect each version with where it is (Live now, Was live before, Tested on Staging), what changed, and a "Going back" column. Only versions that were live before have a "Go back to this" button.
7. Activity: click each filter (All, Pushes, Go backs, Security, Health, Settings, Pauses). The list should change each time. Click "Show more" if it appears. Click "Open the full audit log" and confirm it opens the Audit log tab.
8. Live setup: expect a list with a count like "4 of 9 done". Lines that are done have a tick. Click "Check again". The page should refresh without errors.
9. Emergency pause on Live: expect a note saying what is paused on Live and that pausing is done from the Live admin area.

Part A2: Help tips, folding sections and the Guide
A1. On every tab (Release Control, Guide, Overview, Access list, People, Plans, Settings, Switches, Lawfecta Team, Holds, Audit log, Jobs) expect a round ? button next to the page title. Click it: a blue help box opens in plain words. Click it again: it closes. Report any tab without a ?, and any help text that is unclear or uses jargon.
A2. Click at least three ? buttons next to numbers (for example on Overview and on Release Control). Each should explain what the number means and what a good value looks like.
A3. Settings tab: expect the settings grouped in cards. Only the first card is open; the others show a Show button. Click Show on "Engagement money": the settings appear and the button says Hide. Click Hide: they fold away. Refresh the page: the card you opened is still open.
A4. Plans tab: expect two cards, Attorney plans and Freelancer plans, each with its own table and a Hide button.
A5. Guide tab (second tab): expect a title "Guide", an "On this page" list of nine topics, and the "Start here" section open. Click "What a push moves" in the list: that section opens and the page scrolls to it. It should show two boxes side by side ("Moves to Live" and "Stays on its own copy"), or stacked on a phone.
A6. Open "How a version gets to Live". Expect a row of six numbered steps and then the same six steps explained one by one. Read every Guide section and report anything a person new to DELA would not understand.

Part B: Mistakes and misuse (owner)
10. In Live setup, type ABC in the Live project ID box and click Save. Expect a clear message that the ID is 20 small letters and numbers, and no change.
11. Click Push to Live only if it is active. Type a wrong password and click Continue. Expect "That release password is not right" and no code sent. Do this only once.
12. Change tabs to Overview and back to Release Control in the middle of step 11's box. The password box should close and nothing should be pushed.
13. Leave the page open for two minutes. It should refresh by itself without losing your place and without errors.
14. Make the window narrow like a phone. Nothing should need sideways scrolling except the version table, which may scroll inside its own box.

Part C: Members cannot use it
15. Log out, log in as the test attorney, open www.hirelegalhelp.com/dela-admin. Expect "Lawfecta Team only" and no Release Control data.
16. Same for the test freelancer.
17. As the test attorney, open www.hirelegalhelp.com/dela. Expect Attorney DELA on the Attorney Pro plan, not the "Almost there" message.
17b. As the test freelancer, open www.hirelegalhelp.com/dela. Expect Freelancer DELA on the Freelancer Free plan.
17c. As the test attorney, look for any Guide, help tips or admin tabs in the member area. There should be none.

Part D: Stacey only (do not give these to ChatGPT)
18. When email or text is set up: click Push to Live, enter your password, click Continue. Expect a 6 digit code by email (and text). Enter a wrong code once: expect "That code is not right" and the code box stays open. Enter the right code. Expect "Push started" and the progress list to tick through each step.
19. After the push, expect "Live, being watched" with the minutes left. Push to Live should be off until the watch ends.
20. In Version history, click "Go back to this" on the earlier version. Enter your password (and code). Expect "Going back started", the watch to stop, and the earlier version to show Live now within a few minutes. You get an email (and text) each time.

Finish with a short summary: what passed, what failed, and anything confusing to a non-technical owner.
