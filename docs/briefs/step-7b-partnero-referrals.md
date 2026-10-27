# Feature brief: Affiliates and referrals with Partnero

Step: 7b (Phase 1, before launch readiness)   Spec references: added by Stacey 2026-10-27; ties to plans (Step 1), payments (Step 6)
Status: draft, waiting on Stacey's answers

## Who
- Affiliates: outside partners (for example legal tech bloggers, bar groups, consultants) who share a link and earn a commission.
- Members who refer a friend: attorneys refer attorneys or freelancers, freelancers refer freelancers or attorneys. Both people can get a reward.
- Lawfecta Team: approves partners, sees results, pays rewards.
- Attorney and freelancer referrals are tracked as separate programs, so rewards and rules can differ by side.

## What
- Every member gets a personal referral link and a simple "Refer and earn" card in DELA (Attorney and Freelancer sides each have their own).
- Affiliates get Partnero's partner portal: their link, clicks, sign ups, earnings and payouts.
- DELA tells Partnero when a referred person signs up, and when they pay (membership and, after Step 6, DELA project fees).
- Partnero works out the reward. DELA records every referral event in its own audit log.
- Rewards are paid only after the money has cleared and the refund window has passed. Refunds and chargebacks take rewards back.

## Where
- Partnero's tracking script: on lawfecta.com pages where people land and sign up (see question 5).
- DELA: a "Refer and earn" card on Home for each side, and a Referrals tab in the admin area (switches, settings, recent events, errors).
- Partnero: partner portal, program settings, payouts.
- Supabase: the Partnero API key is a secret Stacey enters herself (PARTNERO_API_KEY). Calls to Partnero go only from Supabase.

## When
- Click on a link: Partnero remembers the referrer in a cookie on lawfecta.com.
- Sign up in BD, then first DELA visit: DELA reads that cookie through the DELA-Auth widget and tells Partnero (once per person).
- Payment cleared: DELA sends the transaction to Partnero with the invoice ID, so refunds can be matched.
- Refund or chargeback: DELA tells Partnero to reverse the reward.
- Payouts: on Partnero's schedule (monthly suggested).

## Why
- Lawfecta grows through people who already trust it. Members bring members on both sides, which makes matching better.
- Partners and members can see exactly what they earned, so Lawfecta does not handle questions by hand.

## How it could go wrong
- Self-referral (a person refers their own second email): blocked by matching name, email, BD member ID and card where possible; Partnero fraud checks on.
- Referring someone who is already a member: no reward.
- Reward paid, then refunded or charged back: reward reversed; payouts wait past the refund window.
- Two sign up messages for the same person: sent once (idempotent by BD member ID).
- Partnero is down: events wait in DELA's job queue and retry; nothing is lost.
- Cookie blocked by the browser: the referred person can type the referrer's code at sign up (question 7).
- Attorney ethics: lawyers generally may not give anything of value for recommending their legal services. Rewards here are for referring someone to Lawfecta's software membership, not to a lawyer's services, and must never depend on a legal engagement. The program terms need a lawyer's review before launch.
- Tax: affiliates paid $600 or more in a year need a W-9 and a 1099. Partnero's payout tools can collect tax forms; confirm on the plan chosen.
- Switch off: the whole program ships behind a switch (referrals) that is off until Stacey turns it on.

## Settings and switches it uses
New settings (added to config/decisions.json when built, all Open until answered): reward per program and side, reward length (for example first 12 months), refund wait before payout, minimum payout, cookie length, self-referral rules.
Switch: referrals (off, staff, list, everyone).

## Questions to make it better
1. What earns a reward: a new paid BD membership, a DELA plan upgrade, DELA project fees (after Step 6), or all of these?
2. Do you want both programs: affiliates (outside partners, cash commission) and member refer-a-friend (credit or a free month for both people)? Or only one to start?
3. Reward amounts. Suggestion to react to: affiliates 20% of the first 12 months of membership; members get one free month for both people. You decide.
4. Who can be an affiliate: anyone who applies and you approve, members only, or invite only?
5. Partnero's tracking script needs to sit on the pages where people land and sign up on lawfecta.com. That is a small addition to the current site. Is that OK, and on which pages: all pages, or only the home page, pricing and sign up pages?
6. How are BD membership payments taken today: BD with your own Stripe account, or another gateway? If it is your Stripe account, Partnero can track membership payments by itself.
7. Should people be able to type a referral code at sign up, in case the link cookie is blocked?
8. Payouts: PayPal or Wise through Partnero, or Partnero pays partners and bills you once a month?
9. Do you already have a Partnero account, and which plan? (The API and partner portal are on all plans; check white-label portal and custom domain if you want them on your own address.)
10. Will your payments lawyer review the program terms with the Stripe review in Step 8?

## Success looks like
- A test partner's link, clicked by a new test member who then signs up and pays, shows one sign up and one reward in Partnero, once.
- Self-referral and an existing member give no reward.
- A refund reverses the reward.
- With Partnero switched off or down, DELA keeps working and catches up later.
- Attorney and freelancer referral cards show their own side's program only.
- The admin Referrals tab shows every event and any error in plain words.
