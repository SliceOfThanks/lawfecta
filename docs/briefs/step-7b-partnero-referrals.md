# Feature brief: Affiliates and referrals with Partnero

Step: 7b, now split in two (Stacey 2026-10-27: start now on the current site, then connect to DELA)
- Part 1 (now): Partnero on the current Lawfecta site in Brilliant Directories. Mostly setup, very little code.
- Part 2 (later): DELA connects to the same Partnero programs, so links, history and credit carry over.
Spec references: plans (Step 1), payments (Step 6), safety rules in CLAUDE.md (money in cents, append-only history, switches off)
Status: draft, waiting on Stacey's answers

## The one rule that joins Part 1 and Part 2
Partnero ties a sign up to a later payment through a "customer key". The key must be the same at sign up and at every payment.
We use the BD member ID as the key from day one. DELA already knows every member by BD member ID, so when DELA is ready it sends payments under the same key and every referral made today stays attached to the right person. No import, no re-linking.
(Email is the fallback only if BD cannot give us the member ID on the sign up thank-you page. Emails change; member IDs do not.)

## Who
- Affiliates: outside partners (legal tech bloggers, bar groups, consultants, educators) who share a link and earn cash commission.
- Members who refer a friend: attorneys and freelancers. Both the person who refers and the new member get credit.
- Lawfecta Team: approves affiliates, watches results, pays commission, handles disputes.
- Attorney and freelancer referrals are separate programs in DELA (Part 2), each with its own reward, because the two sides never mix.

## What

### Part 1: now, on the current site
1. Partnero account with two programs: an affiliate program (cash) and a refer-a-friend program (credit).
2. Partnero's tracking script added once to the site-wide header code in BD. This is an addition; no existing page or widget changes.
3. One small snippet on the BD sign up thank-you page tells Partnero "this person just joined" with their BD member ID.
4. Payments reach Partnero one of two ways (question 6 decides which):
   a. Partnero's Stripe connection, if BD charges members through Lawfecta's own Stripe account and Partnero can match those charges; or
   b. Zapier: BD "new membership payment" goes to Partnero "create transaction" with the same member ID and the payment ID (so refunds can be matched).
5. Members get their referral link and see their referrals and earned credit in Partnero's member portal, linked from the site (for example from the member dashboard menu).
6. Credit is "banked" now and spent later (see Credit below). Affiliates are paid cash through Partnero on a monthly schedule.

### Part 2: later, inside DELA
1. A referrals adapter in DELA (like the mail adapter), with Partnero as the provider. If Lawfecta ever leaves Partnero, only the adapter changes.
2. DELA sends DELA plan payments and, after Step 6, DELA project fees to Partnero, through the job queue, once each, with the invoice ID. Refunds and chargebacks send a reversal.
3. Partnero tells DELA when a reward is earned or reversed (signed webhook). DELA writes it to a credit ledger: integer cents, append-only, corrections are new records.
4. "Refer and earn" card on Home for each side, showing the link, referrals and credit balance.
5. Credit applies at DELA checkout (plans, and AI credits if you choose). Credit is never cash and is never paid out.
6. Admin Referrals tab: switch, settings, recent events, errors in plain words, manual credit corrections (with reason, audit logged).

## Credit (the part that builds excitement)
Partnero's built-in rewards for Stripe are coupons on Stripe subscriptions. BD runs its own billing, so a Stripe coupon would likely not reach a BD renewal. That is why credit is held as a balance and spent later:
- Before DELA opens: credit shows in Partnero's portal as earned. Message to members: "Your credit is saved and ready to use when DELA opens."
- Option for now: we also record each reward in DELA's own ledger from day one (Part 1b, a small build on Staging, then Live), so Lawfecta owns the record and nothing depends on Partnero exports. Recommended.
- Credit is a promise of future value, so it needs clear terms: cap per person, expiry, not cash, not transferable, ends if the account is closed for misuse.

## Where
- BD: site-wide header code (Partnero script), sign up thank-you page (one snippet), a menu link to the referral portal.
- Partnero: programs, partner and member portals, fraud checks, payouts, tax forms.
- Zapier (if 4b): one Zap, BD payment to Partnero transaction; a second for refunds if BD offers a refund trigger.
- DELA (Part 1b and 2): Supabase api endpoint for Partnero webhooks, credit ledger, Home card per side, admin Referrals tab.
- Secrets: PARTNERO_API_KEY and the webhook signing secret are entered by Stacey in Supabase. Never in BD, Zapier notes, chat or GitHub.

## When
- Click on a link: Partnero remembers the referrer in a cookie on lawfecta.com.
- Sign up in BD: thank-you page snippet records the new customer under the BD member ID, once.
- Payment: recorded with the payment ID, so the same payment is never counted twice.
- Refund or chargeback: reward reversed (automatic with Stripe; needs a Zap or a manual step otherwise).
- Rewards become final only after the refund window (question 3). Affiliate payouts monthly.
- DELA launch: banked credit becomes spendable.

## Why
- Every member becomes a reason for the next member to join, on both sides, before DELA launches.
- Partners and members see exactly what they earned, so the Lawfecta Team does not answer it by hand.
- Banked credit gives people a concrete reason to come back on launch day.
- Cash only goes out for real, cleared revenue, so the program grows with income instead of ahead of it.

## How it could go wrong
- Self-referral (second email, same person): no reward; Partnero fraud checks on; DELA also checks name, email, BD member ID and card where it can.
- Referring someone already a member: no reward. The thank-you page snippet only runs on new sign ups.
- Free sign ups: reward only on a paid membership (or a DELA paid plan later), so fake free accounts earn nothing.
- Reward, then refund or chargeback: reward reversed; rewards wait past the refund window.
- Same sign up or payment sent twice (page reload, Zap retry): sent with the same key and payment ID, counted once.
- Cookie blocked: the new member can enter a referral code (question 7).
- Partnero or Zapier down: Part 1 may miss an event (Zapier retries, and we check a monthly report against BD). Part 2 queues and retries in DELA, nothing lost.
- Credit piles up as a liability: cap per person and expiry (question 3).
- One person on both sides: in DELA, credit belongs to one side unless you decide otherwise (question 11).
- Attorney ethics: lawyers generally may not give anything of value for recommending their legal services. Rewards here are for referring someone to Lawfecta's software membership, never for referring a client or a legal matter. The program terms need a lawyer's review before the program opens.
- Tax: affiliates paid $600 or more in a year need a W-9 and a 1099. Partnero can collect tax forms; confirm on the plan chosen. Non-cash credit is simpler, but ask your accountant.
- Privacy and cookies: the Partnero cookie needs to be listed in the CookieYes banner and the privacy policy.
- The program can be paused at any time in Partnero; in DELA it sits behind a switch that is off until you turn it on.

## Settings and switches it uses
Added to config/decisions.json when built, all Open until you answer: reward per program and side, credit cap, credit expiry, refund wait before rewards are final, minimum affiliate payout, cookie length, what credit can be spent on.
Switch: referrals (off, staff, list, everyone). Part 1 pieces in BD and Partnero are turned on in Partnero itself.

## Questions to make it better
1. What earns a reward now: a new paid BD membership only, or upgrades and renewals too? Later: DELA plans and DELA project fees as well?
2. Both programs from the start (affiliates for cash, members for credit), or members only first? Two programs likely needs Partnero's higher plan (reported around $199 a month; Starter, around $49 to $59, is one program). Please check the price on your account.
3. Amounts. Suggestion to react to: affiliates 20% of the first 12 months of paid membership; members get $25 credit each (referrer and new member) per paid sign up, cap $500 per person per year, credit expires 12 months after DELA opens, final after 30 days.
4. Who can be an affiliate: anyone who applies and you approve, members only, or invite only?
5. Is it OK to add Partnero's script to the site-wide header in BD and one snippet on the sign up thank-you page? Both are additions; nothing existing changes.
6. How do members pay today: BD with your own Stripe account, PayPal or Authorize.net? If Stripe, can you see BD's membership charges in your Stripe dashboard? This decides 4a or 4b.
7. Should new members be able to type a referral code at sign up in case the link cookie is blocked? (Needs one extra field on the BD sign up form.)
8. Affiliate payouts: PayPal or Wise through Partnero, or Partnero pays partners and bills you monthly?
9. Do you already have a Partnero account? If yes, which plan, and do you want the portal on your own address (for example partners.lawfecta.com)?
10. Record credit in DELA's own ledger from day one (Part 1b, recommended), or keep it only in Partnero until DELA launches?
11. In DELA, can credit earned on one side be spent on the other side, or does each side keep its own?
12. What can credit be spent on in DELA: plans only, or AI credits and Lawfecta fees too?
13. Will your lawyer review the program terms (with the Stripe review in Step 8, or now, since Part 1 starts now)?

## Success looks like
Part 1:
- A test affiliate link, clicked by a new test member who signs up and pays, shows one sign up and one reward in Partnero under the new member's BD member ID.
- Reloading the thank-you page or a Zap retry does not create a second sign up or reward.
- An existing member clicking a link and paying a renewal earns nothing (unless question 1 says renewals count).
- A refund reverses the reward.
- The member portal shows the link, referrals and credit; a self-referral earns nothing.
Part 2:
- The same test member's earlier referral appears in DELA without any import.
- A Partnero reward becomes one ledger entry in cents; a repeated webhook does not double it; a bad signature is refused.
- Credit applies at DELA checkout and never goes below zero; a reversal after spending shows as a negative entry and the next purchase pays it back.
- Attorney and freelancer cards show only their own side's program.
- With the switch off or Partnero down, DELA keeps working and catches up later.
- The admin Referrals tab shows every event and any error in plain words.
