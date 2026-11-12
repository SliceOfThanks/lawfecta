# Stacey's to-do list, in order

Last updated 2026-11-13. This replaces the list of 2026-11-04 (that one was written for two sites and the old address). The pilot runs on one site, https://www.lawfecta.co, for 10 to 50 invited members.

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

## 5. Stripe: the live account
Done 2026-11-12: payout schedule set to Manual; a new full-access key from the Stripe account "DELA" is in Supabase as STRIPE_SECRET_KEY; the webhook is added and its signing secret is in Supabase as STRIPE_WEBHOOK_SECRET. The key in Brilliant Directories was not touched.
Left to do:
1. Turn on live payments: open https://www.lawfecta.co/dela-admin?tab=switches (the page "Switches"), find the row "live_payments", and set it to "everyone". Until then DELA refuses to use the live key.
2. Open https://www.lawfecta.co/dela-admin?tab=pay. Tell Claude what the first card "Needs attention" lists and what the card "Payment overview" says about the Stripe balance.
The switch that charges the fee with each milestone stays on (your decision of 2026-11-10; it passed the sandbox tests).

## 6. Three small real payments
With your own card, on a small made-up job between your two test accounts: one payment, one payout, one refund. Claude gives you the exact steps when step 5 is done, and compares each with Stripe.

## 7. Mark the site as live
Tell Claude: "Mark the site live." What changes is listed in docs/PILOT_GO_LIVE.md, section 4 (the yellow "Test site" label goes, emails lose "[Test site]").

## 8. Before members are invited
1. Backups: on the Supabase Backups page from step 4, daily backups should be listed. Claude does one restore drill with you (docs/RUNBOOK.md).
2. An uptime monitor on https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api/health (any free monitor; Claude can suggest one and what to enter).
3. Add each pilot member: https://www.lawfecta.co/dela-admin?tab=access, the page "Access list", the box "BD member ID" near the top, then the button "Add" beside it. A member's ID is in the Brilliant Directories admin under Members.
4. One fuller ChatGPT test of what a pilot member does. Claude sends it after step 4.

## Later, not needed for the pilot
- The Brilliant Directories key permission for practice area categories.
- A real Scribe export to confirm the Scribe importer.
- Vectera's API access for meeting rooms.
- GitHub settings for auto-merge and the main branch rule.
