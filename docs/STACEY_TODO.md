# Stacey's to-do list, in order

Last updated 2026-11-13 (section 9 added). This replaces the list of 2026-11-04 (that one was written for two sites and the old address). The pilot runs on one site, https://www.lawfecta.co, for 10 to 50 invited members.

Do these from top to bottom. Never paste a password, key or secret into chat. Type them only into Brilliant Directories, Stripe, Google or Supabase.

Everything Claude can build without you is built. What is left needs you: a test, a yes, or a setting in Stripe or Supabase.

## 1. The ChatGPT test of the new layout: done
You ran it on 2026-11-12. 20 of 21 steps passed. Step 17 was marked as failed only because ChatGPT's browser window was narrow (530 px), where the admin area shows the "Menu" button, as it should. The report is saved: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/reviews/test-reports/2026-11-12-new-layout.txt

## 2. Two quick checks by hand
1. On your phone, log in at https://www.lawfecta.co/login and open https://www.lawfecta.co/dela?tab=home. Scroll up and down. The bar at the bottom with "Home", "Work", "Ask DELA", "Earnings", "More" should stay on the screen the whole time. If it does not, record your screen while you scroll and send the recording.
2. Open https://www.lawfecta.co/dela?tab=ai. The first card is "Account and security". In the row "Sign-in email" click "Change email". In the row "Password" click "Change password". Each opens a page of the Lawfecta website in a new tab. Tell Claude whether each is the right page. Do not save anything there.

## 3. Two decisions
1. Answered 2026-11-12: the website changing a sign-in email without confirming the new address is fine for the pilot. A confirmation step is on the 2027 roadmap. Sign-in, email and password all run through the Lawfecta website (Brilliant Directories); DELA only opens those pages.
2. Done 2026-11-13: the new layout is on for everyone. To go back, tell Claude "turn the new layout off".

## 4. Clear the test money: done
You ran it on 2026-11-12 (Supabase SQL Editor). Checked afterwards: agreements 17 to 12, milestones 22 to 15; payments, payouts, refunds, ledger lines, disputes, payout accounts and stored Stripe events are all 0. Accounts (7), gigs (27), proposals (19), documents (17), files (16) and meetings (8) are unchanged.

## 5. Stripe: the live account: done
Done 2026-11-12: payout schedule Manual, the live key and the webhook signing secret are in Supabase, "live_payments" is on for everyone, and the Payments page says "Stripe is connected in LIVE mode (real money)" with every total at $0.

## 6. Real test payments: skipped
Your decision of 2026-11-12: "if staging payments worked we are fine". The first real payment by a member is therefore the first proof of the live key and the webhook. When it happens, tell Claude "The first real payment happened" and Claude compares it with Stripe.

## 7. Mark the site live: done
Done 2026-11-12. The yellow "Test site" label is gone and emails no longer start with "[Test site]". The switch for confidential materials is off, because Live refuses those uploads until a virus scanner is set up.

## 8. Before members are invited
1. Backups: on the Supabase Backups page from step 4, daily backups should be listed. Claude does one restore drill with you (docs/RUNBOOK.md).
2. An uptime monitor on https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api/health (any free monitor; Claude can suggest one and what to enter).
3. Add each pilot member: https://www.lawfecta.co/dela-admin?tab=access, the page "Access list", the box "BD member ID" near the top, then the button "Add" beside it. A member's ID is in the Brilliant Directories admin under Members.
4. One fuller ChatGPT test of what a pilot member does. Claude sends it after step 4.

## 9. Checks for what was built on 2026-11-13
Everything here is on the site. Do them in this order.
1. Talent, by hand. Log in as the test attorney and open https://www.lawfecta.co/dela?tab=talent. In the "Find a freelancer" card, set the "Software" list (fourth in the row of five) to "Clio": the heading should read "9 freelancers found". Press "Reset". Scroll to the bottom of the list and press "Load more freelancers": the line should read "Showing 16 of 16 freelancers."
2. A call before a gig, by hand. On the same page press "View profile" on the "DELA Test Freelancer" card. At the right of the header press "Book a call". On the card "Book an introductory call" pick a time under "Date", press "Review booking", press OK on the pop-up. The meeting should open, headed "DELA Test Freelancer: Introductory call". Press "Open the conversation": a green-edged line should say "An introductory call is booked for" with the time. Go back with "Open the meeting" and press "Cancel" when you are done.
3. The firm logo, by hand. Open https://www.lawfecta.co/dela?tab=profile as the test attorney. At the top of the "Firm details" card press "Add a logo" and choose a PNG or JPG. You should see "Logo saved. Nothing else to click."
4. The Talent ChatGPT check: paste the file talent-journey-chatgpt-prompt-READY-2.txt from the folder "Lawfecta DELA for Stacey" in your Documents into a new ChatGPT agent chat. Run it before 2026-11-19 (a test gig closes that day). Paste the report back to Claude.
5. The Subscription ChatGPT check: the file subscription-chatgpt-prompt-READY-3.txt from the same folder, in a new ChatGPT agent chat. Paste the report back to Claude.
6. Questions waiting for you, each in its brief on GitHub (https://github.com/SliceOfThanks/lawfecta/tree/claude/step-2a-ai-keys-voice-files/docs/briefs): step-21-firm-logo-client-face.md, step-22-talent-mockup-02.md, step-23-intro-calls.md.
7. Before real members arrive: tell Claude "take the sample freelancers out". They also drop out of Talent by themselves on 2026-11-27.

## Later, not needed for the pilot
- The Brilliant Directories key permission for practice area categories.
- A real Scribe export to confirm the Scribe importer.
- Vectera's API access for meeting rooms.
- GitHub settings for auto-merge and the main branch rule.
