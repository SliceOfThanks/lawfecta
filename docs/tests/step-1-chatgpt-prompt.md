# ChatGPT test prompt: DELA Step 1 (Foundation)

Paste everything below the line into ChatGPT with browsing or agent mode. Fill in the three test logins first.

---

You are testing a new members-only feature called DELA on the Lawfecta website (SITE_ADDRESS). DELA has two sides: Attorney DELA and Freelancer DELA. Test carefully, like a picky customer and like someone trying to break it. Report every step as PASS or FAIL with what you saw. Take a screenshot of anything that looks wrong. Do not enter real client information anywhere.

Logins:
- Owner (Lawfecta Team): OWNER_LOGIN
- Test attorney (on Attorney Pro): ATTORNEY_LOGIN
- Test freelancer (on Freelancer Free): FREELANCER_LOGIN

Part A: Logged out
1. Log out. Open SITE_ADDRESS/dela. Expect a message asking you to log in and a "Log in to Lawfecta" button. Open SITE_ADDRESS/dela-admin. Expect it not to show any admin data.

Part B: Owner, admin area
2. Log in as the owner. Open SITE_ADDRESS/dela-admin. Expect tabs: Overview, Access list, People, Plans, Settings, Switches, Lawfecta Team, Holds, Audit log, Jobs. A "Staging" or "Live" badge shows at the top.
3. Access list: make sure both test members are listed under "May open DELA". If not, add them by BD member ID with a note.
4. Plans: confirm there are separate Attorney plans and Freelancer plans, each with Free, Plus, Pro and Business. Confirm attorney limits (Open Flex Gigs, Saved playbooks) do not appear in the freelancer table and freelancer limits (Proposals sent per month, Published services) do not appear in the attorney table. Note any plan that says "Not linked".
5. Click Edit on Attorney Plus. Change the monthly price to 21. Click Save draft. Expect a note saying it is a draft. Then click "Throw draft away". Expect the price to stay as before.
6. Settings: find "Smallest engagement allowed". Click Change, then History. Expect at least one history line. Click Cancel. Try changing "How long a gig stays open" to the word "ten". Expect a clear error and no change.
7. Switches: set "DELA AI help" to "Lawfecta Team only", then back to "Off".
8. Overview: click "Send an in-app notice". Then open SITE_ADDRESS/dela and click Notices. Expect "DELA test notice".
9. Audit log: expect entries for the switch changes and your sign ins.

Part C: Test attorney
10. Log out, log in as the test attorney, open SITE_ADDRESS/dela. Expect "Welcome", the confidential information notice at the top, a Verification card, six "Coming soon" tiles, and "Your plan: Attorney Pro" with attorney limits only. There should be no mention of proposals per month.
11. Open SITE_ADDRESS/dela-admin as the attorney. Expect "Lawfecta Team only" and no data.
12. Refresh /dela five times quickly. Expect it to load correctly every time.

Part D: Test freelancer
13. Log in as the test freelancer and open /dela. Expect "Match readiness" with a checklist, and "Your plan: Freelancer Free" with "Proposals sent per month: 5 of 5 left this month". No attorney items such as "Open Flex Gigs".
14. Open /dela on a phone, or shrink the browser to phone width. Expect no sideways scrolling and readable text.

Part E: Access removal
15. As the owner, remove the test freelancer from the access list. As the freelancer, refresh /dela. Expect "DELA is not open for your account yet". Add them back afterward and confirm they can get in again.

Part F: Report
16. List every FAIL with steps to repeat it. List anything confusing, slow, misspelled, or that looks unprofessional. Suggest improvements for attorneys and for freelancers separately.
