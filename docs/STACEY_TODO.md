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
1. The Lawfecta website changes a member's sign-in email as soon as they save it, without confirming the new address. Is that acceptable for the pilot? (DELA cannot add a confirmation; it would be a question for Brilliant Directories support.)
2. Done 2026-11-13: the new layout is on for everyone. To go back, tell Claude "turn the new layout off".

## 4. Clear the test money data (cannot be undone)
What it does and what it keeps: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/PILOT_GO_LIVE.md (section 1). Your account and the two test accounts stay (BD members 686, 687, 688); every test job, agreement, payment, payout, refund and dispute goes.
1. Check that a backup exists: open https://supabase.com/dashboard/project/ojshgsxgsypbywtqhkch/database/backups (Supabase, the project "Lawfecta AI", "Database" in the left menu, then "Backups"). There should be one from today or yesterday.
2. Tell Claude in chat: "A backup exists. Clear the test data now." Claude runs it and reports the counts.
Do this before step 5: the test jobs carry ids from Stripe's test mode that the live account does not know.

## 5. Stripe: the live account
The full steps with pictures of where to click: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/STRIPE_SETUP.md and https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/PILOT_GO_LIVE.md (section 2). In short:
1. In Stripe (https://dashboard.stripe.com), with "Test mode" switched OFF: open Settings (the gear, top right), then "Payouts" under "Business", then "Payout schedule", and choose "Manual". DELA holds each paid milestone on Lawfecta's Stripe balance until the attorney accepts it; with automatic payouts that money leaves for the bank and the freelancer's payout fails.
2. Still in Stripe, live mode: "Developers", then "API keys", then "Create restricted key" (or use the secret key). Copy it.
3. In Supabase: https://supabase.com/dashboard/project/ojshgsxgsypbywtqhkch/functions/secrets ("Edge Functions", then "Secrets"). Edit the secret named STRIPE_SECRET_KEY and paste the live key. Save.
4. In Stripe, live mode: "Developers", then "Webhooks", then "Add endpoint". The address is https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api/stripe/webhook and the seven events are listed in docs/STRIPE_SETUP.md. After saving, click "Reveal" under "Signing secret" and copy it.
5. In Supabase, the same Secrets page: edit STRIPE_WEBHOOK_SECRET and paste the signing secret. Save.
6. Tell Claude: "The live Stripe key and webhook are in." Claude turns off the switch that charges the fee with each milestone (your decision of 2026-11-11), checks the connection, and tells you when to turn on "live_payments" in the admin area: https://www.lawfecta.co/dela-admin?tab=switches, the row "live_payments".

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
