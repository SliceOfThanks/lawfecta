# Feature brief: 5% on every plan, and custom plans that can lower it

Step: 97 (release 97a now; release 97b next)
Spec references: migration 0041 (one fee for everyone), the admin Plans page, docs/briefs/step-96-fast-onboarding.md (Part 2 holds the full plan)
Status: 97a built and released in acceleration mode. Stacey 2026-11-28: "Ensure all plans have all users at 5% fee on every transaction (we are not lowering for now), however we do need to make it easy to custom create plans that lower it."

## Who
Every member (what they are told the fee is), and the owner (the Plans page).

## What
- **97a:** every plan shows the fee that is charged. A plan version cannot be saved with another number. The six-hour check reports a plan that drifts.
- **97b (next):** a custom plan, made in a few clicks from a standard one, with its own lower fee that is really charged.

## Where
- Migration 0174: `dela_fee_charged`, new plan versions, a check in `dela_admin_plan_draft`, a line in `dela_health_db`.
- Admin area, Plans page: the "Fee percent" box is read only, with a note.

## When
From the release. The correction of the plan versions happens once, in the migration.

## Why
What was found on 2026-11-28: every member is charged 5% on each side, whatever their plan (the charge reads two settings and has ignored the plan since migration 0041). But the approved versions of the paid plans on the live site showed 4%, 3.5% and 3%, and the Subscription page showed those numbers. Members on paid plans were told a lower fee than they would be charged. No payment had been made, so nobody was charged against a wrong promise.

## How it could go wrong
- A member was already told the lower fee: possible for anyone who opened the Subscription page on a paid plan. Stacey decides whether to tell them; nothing was charged.
- The fee setting is changed later and the plans still show the old number: the six-hour check reports it.
- The owner wants a lower fee on one plan: refused with a plain sentence until custom plans exist (97b).
- One case is 0% and 10% on purpose: an agency hiring from its own bench (the agency pays both sides). Unchanged; listed as a decision in the step 96 brief.

## Settings and switches it uses
- Existing: `fee.client_bps`, `fee.freelancer_bps` (both 500), `fees.floor_cents_per_party`.
- No new number. The plans' own fee numbers are set to those settings.

## Questions Claude answered itself (acceleration mode, 2026-11-28)
1. Change what is charged, or what is shown? **What is shown.** The charge is already 5% for everyone.
2. Lock the fee box or remove it? **Lock it, with the reason,** so the place for the future custom plan fee is familiar.
3. Should the fee on a standard plan ever differ from the setting? **No.** A lower fee is a custom plan.

## Success looks like
- All eight approved plans show the charged fee.
- A draft with another fee is refused with "standard_fee"; a draft with the same fee, or with no fee named, is saved.
- With the fee setting changed, the six-hour check lists "4 plans show a fee that is not the fee charged".
