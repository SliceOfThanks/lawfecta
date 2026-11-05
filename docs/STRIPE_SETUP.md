# Stripe setup for the test site (test mode only)

Do this once, before the Step 6 test. Everything here is in Stripe's **test mode**, so no real money moves. Live payments stay off until you turn on the live_payments switch, after a lawyer approves the agreement terms.

You need about 20 minutes. You copy two secret values from Stripe into Supabase. Never paste them into chat, email or GitHub.

## Part 1. Make the Stripe account
1. Open https://dashboard.stripe.com/register and sign up with your Lawfecta email. If Lawfecta already has a Stripe account, log in at https://dashboard.stripe.com/login instead.
2. If Stripe asks to activate payments with business details, you can skip that for now. Test mode works without it.
3. Turn on test mode:
   - At the top right of the Stripe dashboard there is a switch named "Test mode" (on some accounts it is a menu named "Sandbox" at the top left).
   - Turn it on. The page shows an orange "Test mode" or "Sandbox" bar.
   - Keep it on for every step below.

## Part 2. Turn on Connect (so freelancers can be paid)
1. Open https://dashboard.stripe.com/test/connect/overview.
2. Click "Get started".
3. When Stripe asks how you will use Connect:
   - choose "Platform or marketplace"
   - choose that Lawfecta collects payments and pays out to others
4. If it asks which account type, choose "Express".
5. If Stripe asks for a platform profile or branding:
   - name: Lawfecta
   - website: https://www.hirelegalhelp.com
   - add your logo if it asks
6. Finish the steps. You do not need to add any connected accounts yourself; freelancers do that from DELA's Earnings tab.

## Part 3. Copy the test secret key into Supabase
1. Open https://dashboard.stripe.com/test/apikeys.
2. Find the card "Standard keys". In the row "Secret key", click "Reveal test key". It starts with sk_test_. Click it to copy it.
3. Open the Supabase secrets page for the test site: https://supabase.com/dashboard/project/ojshgsxgsypbywtqhkch/functions/secrets
   - This is the Lawfecta AI project. If it asks you to choose, pick the "Lawfecta AI" project, then "Edge Functions" in the left menu, then "Secrets".
4. Click "Add new secret" (or the empty row at the bottom of the list).
   - Name: STRIPE_SECRET_KEY
   - Value: paste the sk_test_ key
5. Click "Save".

DELA refuses any key that starts with sk_live_ while live payments are off, so a live key here would simply not work.

## Part 4. Tell Stripe where to send payment updates (the webhook)
1. Open https://dashboard.stripe.com/test/webhooks.
2. Click "Add endpoint" (on newer accounts the button is "Add destination"; then choose "Webhook endpoint").
3. If it asks whose events to listen to, choose "Your account". (DELA checks each freelancer's payout setup itself when they come back from Stripe.)
4. Endpoint URL: https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api/stripe/webhook
5. Click "Select events" and tick these 7:
   - checkout.session.completed
   - payment_intent.succeeded
   - payment_intent.processing
   - payment_intent.payment_failed
   - account.updated
   - charge.dispute.created
   - charge.dispute.closed
   (Type each name in the search box at the top of the list to find it.)
6. Click "Add endpoint" (or "Create destination").
7. On the endpoint's page, find "Signing secret" and click "Reveal". It starts with whsec_. Copy it.
8. Go back to https://supabase.com/dashboard/project/ojshgsxgsypbywtqhkch/functions/secrets and add a second secret:
   - Name: STRIPE_WEBHOOK_SECRET
   - Value: paste the whsec_ value
9. Click "Save".

## Part 5. Check it worked
1. Log in to https://www.hirelegalhelp.com/login as the owner (stacey@lawfecta.com).
2. Open https://www.hirelegalhelp.com/dela-admin and click "Payments" in the row of tabs near the top.
3. Under the heading "Money on DELA", expect: "Stripe is connected in test mode (no real money)".
4. If it still says "Stripe is not connected yet", check the two secret names are spelled exactly STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET, then tell Claude.

## Test cards and test details (test mode only)
- Card that pays and is available straight away: 4000 0000 0000 0077, any future date, any 3 digits, any ZIP.
- Card that is declined: 4000 0000 0000 0002.
- Freelancer payout setup on Stripe's page: phone 000 000 0000, code 000000, Social Security number 000 00 0000, bank routing 110000000, account 000123456789.

## Before live payments (later, not now)
- A lawyer reviews the agreement terms (docs/briefs/step-6-agreements-payments.md, answer 2) and the chargeback rule.
- Stripe asks for Lawfecta's business details and bank account to activate live payments.
- Live gets its own live keys and webhook on DELA Live, and you turn on the live_payments switch yourself.
