# ChatGPT test: Step 4, Flex Gigs, matching, proposals and the tech catalog

> **Replaced (2026-11-05).** Use the Claude test docs/tests/claude-track-b-gigs-messages-meetings.md instead. It covers Steps 4 and 5 step by step, with where to click.

Claude already tested all of this with the real api and database: 12 api tests and 28 browser checks for gigs (both sides, mistakes and misuse), 7 tests and admin checks for the tech catalog. It also checked on the test site that the test attorney can post and the test freelancer is match-ready. This test covers the real screens in a real browser.

Before you paste this:
1. The logins are filled in. Passwords are not kept on GitHub: use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
2. Upload the tech catalog first if you have not yet (owner, https://www.lawfecta.co/dela-admin, "Tech catalog" tab). Group 3 checks it.
3. The Lawfecta login has reCAPTCHA, which ChatGPT cannot pass. Each time ChatGPT reaches the login page:
   1. Click "Take over".
   2. Log in with the account it names.
   3. Hand control back and type: I'm logged in, continue.
4. The order is attorney, then freelancer, then owner, because the freelancer needs the attorney's gig. The last group is two short logins to check the results.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co. Report every step as PASS or FAIL with what you saw. Take a screenshot of anything wrong or confusing. Never type real client information; use only made-up details.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.

To sign out at the end of a group, click the initials in the top right of the DELA page, then "Sign out".

1. Attorney (ask me to log in as the test attorney)
1. Open www.lawfecta.co/dela?tab=projects. Expect "Projects" with a "Post a new gig" card at the top and "Your gigs" below it.
2. In the "Post a new gig" card:
   1. In "Playbook", choose "New Family Law Client Intake After Signature".
   2. Type 100 in "Budget from ($)" and 200 in "Budget to ($)".
   3. Click "Draft the gig with DELA". Expect, within 60 seconds, a gig page with a "Public version" card.
3. On the gig page, in the "Public version" card, check that DELA wrote a title, the task, the steps and the tools, with no client information. Change one word in "The task".
4. Scroll to the "Budget, deadline and milestones" card. Set "Deadline" to a date next month. In "Milestones (private)" type "Draft" and "Final" on two lines. Click "Post the gig" at the bottom. Expect a red message that the smallest gig budget is $250.
5. Change "Budget from ($)" to 300 and "Budget to ($)" to 600. Click "Post the gig" again. Expect "Your gig is open until" and the "Matches" view.
6. Report what the "Matches" view shows: names with a "Good fit" or "Fair fit" label and short reasons (for example "Family law" or "Uses Clio"). Expect no percentages. It may say no one fits yet; that is fine.
7. Click "Talent" in the row of tabs. Expect a search card with "Practice area", "Skill", "Tech tool" and "State" and a list of freelancers below. Find the test freelancer (DELA Test Freelancer or Fran) and, in their card, choose the new gig and click "Invite to this gig". Expect "Invited".
8. Click "Projects", then the gig under "Your gigs". Click "Files" in the row of views under the title, then "Share a file from Files", and "Share" on any file. Expect it in the list.
9. Click "Library", open "New Family Law Client Intake After Signature" and check that its top card has a "Post as a Flex Gig" button. You do not need to click it.
10. Sign out.

2. Freelancer (ask me to log in as the test freelancer)
1. Open www.lawfecta.co/dela?tab=work. Expect "Work" with a green line like "5 of 5 proposals left this month", then "Invitations (1)", "Matches", "Drafts" and "Sent proposals".
2. Click the gig under "Invitations". Expect the public version (task, budget, deadline, steps, tools), a "The full playbook" card with a faint "Shared with ..." watermark, and no milestones.
3. Under "Questions", type "Which intake form do you use?" and click "Ask the attorney". Expect "Question sent".
4. Type "Can you pay me on Venmo instead?" and click "Ask the attorney". Expect a message that DELA is holding it for a check by the Lawfecta Team.
5. In the "Your proposal" card at the bottom:
   1. Click "✦ Let DELA help with qualifications". Expect the qualifications box filled from your profile, with nothing made up. Report anything it invented.
   2. Fill in "Your total price ($)" with 450, "What your price includes", "What it leaves out" and "Schedule".
   3. Click "Send proposal (free: invited)" twice quickly. Expect one proposal, marked "Sent", and a line that it did not use your allowance.
6. Click "Files for this gig" "Open" on the shared file, if there is one. Expect it to open.
7. Click the initials in the top right, then "AI settings". Scroll to "What DELA has learned about you". Report what it lists, then click "Remove" on one item.
8. Narrow the window to phone width: nothing runs off the side on Work and on the gig page. Widen it again.
9. Sign out.

3. Owner (ask me to log in as the owner)
1. Open www.lawfecta.co/dela-admin and click "Gigs" in the row of tabs near the top. Expect:
   - "Held for a check (1)": the Venmo question, labeled "payment outside Lawfecta"
   - "Gigs": the new gig, with its proposals and matches
   - "Proposals sent this month, by plan"
2. On the held question, click "Do not deliver". Expect "Not delivered; the member was told".
3. In "Gigs", click "Pause" on the gig and give a reason. Expect "Paused". Click "Resume". Expect it open again.
4. Click "Tech catalog" in the row of tabs. Expect "Tools in the catalog now" with the tools listed. Click "Pause" on one tool, give a reason, then "Resume".
5. Sign out.

4. Check the results (two short logins)
1. Test attorney: open www.lawfecta.co/dela?tab=projects and click the gig.
   1. Click "Questions" in the row of views. Expect only "Which intake form do you use?" (not the Venmo one). Type an answer and click "Answer for everyone". Expect "Answered for every applicant".
   2. Click "Proposals". Expect the proposal with the price, "Within the budget", what it includes and leaves out, the schedule and qualifications.
   3. Click "Choose" and confirm. Expect the gig to say "Filled".
   4. Click "Ask DELA" in the row of tabs and ask: "Which practice management software should a solo family law firm use?" Expect an answer that names only tools from the Lawfecta catalog.
   5. Sign out.
2. Test freelancer: open www.lawfecta.co/dela?tab=work. Under "Sent proposals" the gig shows "Chosen". Click it: the milestones "Draft" and "Final" now show. Click "Notices" in the dark top bar: expect "You were chosen for a gig". Sign out.

Final report:
- a table of every step with PASS or FAIL
- anything confusing, slow (over 30 seconds) or worded badly
- the exact text of every error message
