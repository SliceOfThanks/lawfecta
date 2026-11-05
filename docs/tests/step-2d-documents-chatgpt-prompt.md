# ChatGPT test: the document standard (Policy, Workflow, SOP, Playbook)

Claude already tested all of this with the real api and database: 10 api tests, 8 engine tests and 29 browser checks. They cover:
- the firm profile asked once, with roles held by a member or an email
- drafting to the standard, with client names and passwords removed before the AI sees them
- the block on export, approval and gigs for a missing A or a missing "Attorney decides" flag
- Fix it, Split into linked SOPs and Change type
- IDs, the change log and review dates (3 months for high risk, 12 months otherwise)
- the 14-day reminder to the role's holder, and a bounce resent to the firm owner
- gigs from SOPs and Workflows only, a workflow handing over only the freelancer's steps
- attorney decisions inside an engagement
- converting older playbooks
- the phone screen

This test covers the real screens with the real AI.

Before you paste this:
1. The logins are filled in. Passwords are not kept on GitHub. Use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
2. The Lawfecta login has reCAPTCHA, which ChatGPT cannot pass. Each time ChatGPT reaches the login page:
   1. Click "Take over".
   2. Log in with the account it names.
   3. Hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.hirelegalhelp.com. Report every step as PASS or FAIL with what you saw. Take a screenshot of anything wrong or confusing. Never type real client information; use only made-up details.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.hirelegalhelp.com/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.

To sign out at the end of a group, click the initials in the top right of the DELA page, then "Sign out".

DELA now calls every Library item a "document". Note any place that still says "playbook" (screens, buttons, messages, emails, exports).

1. Attorney (ask me to log in as the test attorney)
1. Open www.hirelegalhelp.com/dela?tab=library. Expect "Document library" at the top, then tables grouped by stage, for example "INT | Intake and conflicts" or "DOC | Document drafting". Each table has the columns ID, Title, Type, Owner (role), Status and Next review.
2. Older items DELA converted show "Converted: check it" under the title. Click one.
   1. Expect a bold "Draft, not approved" notice near the top, and a green notice saying "DELA moved this to the document standard as ..." with a reason.
   2. Report the type DELA chose and whether the reason makes sense for the content.
   3. In that green notice, choose a different type in the box next to "Change type" and click "Change type". Expect "Now a ..." and the page redrawn with that type's sections.
   4. Change it back the same way to the type DELA first chose.
3. Click "← Library" at the top left. Open a second converted item and click "The type is right" in the green notice. Expect the notice to go away.
4. Back in the Library, click "New document" in the card near the top.
   1. Expect "Your firm profile for documents". Click "Save and continue" without choosing a size. Expect "Choose your firm size."
   2. Choose "2 to 5" in "Firm size". Type "Family law" in "Practice areas" and "Texas state courts" in "Jurisdictions".
   3. Under "Team roles", leave the roles ticked. For "Paralegal", choose "An email address" in the box next to it and type a made-up address such as paralegal@example.com. Leave the others as "Nobody yet".
   4. Under "Systems you use", type "Clio" in "Practice management".
   5. Click "Save and continue". Expect a message naming the roles with no one assigned, and then "Pick what to build" with four cards: SOP, Workflow, Playbook and Policy.
5. Under "Or start from a common process", open "INT | Intake and conflicts" and click "Start" next to "Run a conflict check".
   1. Expect "About this process" with the name, what starts it and what done looks like filled in.
   2. Tick "Attorney" and "Paralegal" under "Which roles touch it", and "Clio" under "Which systems it uses".
   3. Type "Within 1 business day of the request" in "Any deadline or time target".
   4. Type "Deciding whether we accept the matter" in "Steps you must personally decide or approve".
   5. Open "Rewrite something you already have (optional)" and paste: "Old checklist: search Jane Roe in Clio, case 2026-CV-0042, login password Winter2026!".
   6. Click "Draft it with DELA". Wait about a minute.
6. On the document page:
   1. Expect "Draft, not approved" at the top, an ID starting with INT-, and the header fields: Document ID, Version, Owner (role), Last reviewed, Next review, High risk.
   2. Expect a notice that client names, case numbers or passwords were removed. Search the page for "Jane Roe", "2026-CV-0042" and "Winter2026". None should appear.
   3. Expect these sections in order: Purpose, Scope, Trigger, Roles, Before you start, Steps, Decision points and escalation, Timing, Quality check, Done when, Related links.
   4. Expect the step that decides whether to accept the matter to show the red "Attorney decides" badge.
   5. On the right (on a phone, above the document) expect the "Quality check" card. Report each item marked "Blocking" or "Needs attention". Click "checks passed" to see the rest.
7. Break the rules on purpose:
   1. Scroll to the "RACI" card. On step 1, click the empty cell under "Attorney" twice until it shows "A". Expect step 1 to say "(needs exactly one A)".
   2. Click "Save" (under the document, or in the "Quality check" card). Expect "Exactly one Accountable (A) for every step" marked "Blocking", and the notice "Export, approval and Flex Gigs are blocked".
   3. Expect "Approve", "Send for review" and every export button (Word, PDF, Markdown, Web page, Step checklist) greyed out.
   4. In the "Quality check" card, click "Fix it" under the blocking item. Expect the block to go away.
   5. In "Steps", untick "Attorney decides" on the accept-the-matter step and click "Save". Expect "Every judgment step is flagged "Attorney decides"" marked "Blocking". Click "Fix it". Expect the flag back.
8. Approve and export:
   1. Click "Approve" in the "Quality check" card. Expect "Approved", and the "Draft, not approved" notice gone. Expect "Next review" about 12 months away.
   2. Tick "High risk" in the header fields, click "Save", then "Approve" again. Expect "Next review" about 3 months away.
   3. Click "Word". Open the file. Expect the ID in the file name, bold section headings, a RACI table and a change log. Report anything that looks wrong in Word.
   4. Scroll to "Change log" near the bottom and open it. Expect one row per saved version with the date, what changed, who, and who approved it.
9. A Policy and a Playbook:
   1. Click "← Library", then "New document". Click the "Policy" card. Type "Client trust account rules" in "Process name" and click "Draft it with DELA".
   2. Expect sections: Purpose, Scope, The rules (What must happen, What must not happen), Exceptions and who approves them, Related links, and no RACI card.
   3. Approve it if nothing blocks. Expect no "Post as a Flex Gig" button.
   4. Make a Playbook the same way from the "Playbook" card, named "Handle an upset client". Expect Situations covered, Guiding principles, Preferred approach, Acceptable fallbacks, Hard limits, Escalation, Scripts and templates, Examples. Approve it.
10. A Workflow:
   1. New document, "Workflow" card, name "Intake to signed engagement". Draft it.
   2. Expect stages with a lane (role), handoff, target time and linked SOP, a RACI card and a "KPIs (3 to 5)" card. Report how many KPIs DELA wrote and whether each names a data source.
11. Gigs:
   1. Open the approved conflict check SOP and click "Post as a Flex Gig". Expect the Projects page with that SOP chosen in "Approved SOP or Workflow".
   2. Open that box. Expect only SOPs and Workflows, never the Policy or the Playbook.
   3. Click "Draft the gig with DELA" (do not post it). In the gig, find "Reference documents" and attach "Client trust account rules". Expect it listed with a "Remove" button.
12. Too long: open the conflict check SOP, add steps until it is long (or paste long text into a few steps), and click "Save". Expect a "Needs attention" item about 900 words with a "Split into linked SOPs" button, and that Approve still works. You do not need to split it.
13. Open www.hirelegalhelp.com/dela?tab=profile. Scroll to "Your firm profile for documents" near the bottom. Expect your saved answers and "No one assigned" next to roles nobody holds.
14. On your phone (or a narrow browser window), open the conflict check SOP. Nothing should run off the side of the screen.
15. Sign out.

2. Freelancer (ask me to log in as the test freelancer)
1. Open www.hirelegalhelp.com/dela?tab=work. Open the engagement from the earlier tests.
2. Expect "The work handed to you" with the steps. Report any place on this page that still says "playbook".
3. Expect no Library tab with the attorney's documents, and no way to see the attorney's other documents.
4. Sign out.

3. Owner (ask me to log in as the owner)
1. Open www.hirelegalhelp.com/dela-admin and click "AI and files" in the row of tabs.
2. Scroll to the "Documents (Policy, Workflow, SOP, Playbook)" card at the bottom. Expect counts by type, older playbooks waiting to convert (0), converted, converted but not yet checked by the owner, and blocked. Expect a table of recent conversions with the firm, ID, title, type and reason.
3. Click "Switches" in the row of tabs. Expect "document_standard" and "document_conversion" set to the access list.
4. Sign out.

4. Check the results
1. Log in as the test attorney and open www.hirelegalhelp.com/dela?tab=library. Expect the conflict check SOP, the Policy, the Playbook and the Workflow in the tables with their IDs, and the converted items you checked no longer marked "Converted: check it". Sign out.

At the end, list every FAIL, everything confusing, and every place that still says "playbook".
