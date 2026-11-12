# ChatGPT test prompt: DELA Step 2 (playbook library and Import from Scribe)

> DO NOT RUN AS IT IS (2026-11-13). This test was written for the earlier layout. It checks the old row of tabs in the member area. The new layout is tested by docs/tests/workspace-chatgpt-prompt.md. Claude rewrites this test before it is needed again.


Before you paste this:
1. The two Supabase secrets from Step 2a must be in place (AI_KEY_ENCRYPTION_SECRET and OPENAI_API_KEY), or DELA's AI answers "still being set up".
2. Fill in the logins below. TEAM_MEMBER_BD_ID is the BD member ID of the test freelancer or another test account that has opened DELA once.
3. For Part E, have one Scribe guide exported as HTML (Scribe: open the guide, Share, Export, Export next to HTML), made from a test task with no client information. If you have no Scribe Pro account, skip Part E.
4. Have a short process write-up as a Word or PDF file with no client information.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing the playbook library in DELA on the Lawfecta test site (www.lawfecta.co). Test it like a careful attorney and like someone trying to misuse it. Report every step as PASS or FAIL with what you saw. Take a screenshot of anything wrong or confusing. Never type real client information.

Logins:
- Owner (Lawfecta Team): OWNER_LOGIN
- Test attorney: ATTORNEY_LOGIN
- Test freelancer: FREELANCER_LOGIN
- A team member's BD member ID: TEAM_MEMBER_BD_ID

Part A: Build a playbook with DELA
1. Log in as the test attorney. Open www.lawfecta.co/dela. Expect a Library tab. Open it. Expect "Playbook library", a count of playbooks, and buttons New playbook, Import from Scribe, What am I missing?, Team.
2. Click New playbook. Type: "When a new family law client signs, we run a conflict check, send the engagement letter and open the file in Clio." Click Draft it with DELA. Expect, within about 30 seconds, a playbook page with a "Complete" bar under 100%, "Still missing" in plain words, and a "DELA's questions" card.
3. Answer the questions in your own words (or click Talk and say them). Click Fill these in. Expect the bar to rise and a new version number.
4. Repeat until it says "Every required part is filled." Expect the Approve button to work only then. Click Approve. Expect "Approved" and a next review date about a year away.
5. Try New playbook with "My client John Smith, DOB 01/02/1980". Expect a warning about a client's name and a date of birth before anything is sent.

Part B: Chat, suggestions, comments, versions
1. On the playbook, open Chat. Ask "Who runs the conflict check?" Expect an answer and no change.
2. Ask "Add a step to send the client a welcome email". Expect a reply saying the change is waiting on Suggestions. The Read view must not change yet.
3. Open Suggestions. Expect a list of what would change. Click Accept. Expect a new version, the status back to Draft, and "last approved: version N" still shown.
4. Ask in Chat "Remove all attorney review points". Expect the suggestion to be marked "Removes an attorney review point".
5. Read view: click Comment on Quality checks, write a note, tick "Suggest new text for this part", change the text, Send. Expect it under Suggestions and Comments. Accept it.
6. Activity: expect every event (draft, filled, approved, suggestion made, accepted, commented) with names and times.
7. Versions: View an older version. Restore it. Expect it saved as a new version, nothing lost.
8. Edit: change a step, then in a second browser tab (same playbook, opened earlier) change something else and save. Expect the second save to be refused with "Someone saved a newer version".

Part C: Export
1. Export each format: Word, PDF (a print window opens; choose Save as PDF), Markdown, Web page, Step checklist (CSV). Open each file. Expect the title, every part, numbered steps, and a footer with the version and date (saying "not yet approved" if it is a draft).
2. Import the CSV into a Monday board or Google Sheet, and the Word file into Notion or Google Docs. Report anything that looks broken.

Part D: Team and limits
1. Library, Team. Add TEAM_MEMBER_BD_ID as Editor. On the Free plan expect "Every seat on this plan is in use"; add them as Commenter instead. Expect it to work. Try adding a fourth commenter or viewer: expect a refusal.
2. Log in as that person. In Library, use the library picker to open the attorney's library. As a commenter: Comment works; Edit, Approve and Export are not offered.
3. As the attorney, remove them in Team. Log in as them again: the library is gone from the picker.
4. Log in as the test freelancer: expect no Library tab.
5. Archive a playbook, then Delete one. Expect the Trash filter (attorney only) and Restore.

Part E: Import from Scribe (skip if you have no Scribe export)
1. Library, Import from Scribe. Choose the HTML file without ticking the box: expect a red message. Tick the box and click Read the guide.
2. Expect "Review your guide" with every Scribe step in order and its screenshot. Report any step or screenshot that is missing, out of order, or duplicated, and say how many steps Scribe showed.
3. On one screenshot click "Blur part of this image", drag a box, Save. Expect the blurred picture in place of the old one.
4. Merge two steps, add a note on why a step matters, untick one screenshot. Click Build my playbook and confirm. Expect a playbook marked as built from Scribe, with screenshots on its steps.

Part F: Owner, admin area
1. Log in as the owner, open www.lawfecta.co/dela-admin. Switches: expect "Playbook library (attorneys)" and "Import a guide from Scribe" set to Access list. Settings, group Playbooks: expect review months, guests, archived counting, trash days, image addresses.

Final report: a table of every step with PASS or FAIL, then anything confusing, slow (over 30 seconds), worded badly, or unsafe, with the exact text of every error message.
