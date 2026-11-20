# Feature brief: free for freelancers until they are hired

Step: 68   Spec references: config/decisions.json (freelancer plans and limits), step 6 (agreements and payments), step 9 (Pro trial)
Status: built in acceleration mode after Stacey's answer of 2026-11-20 to the eight questions below: "Yes, as recommended". Stacey 2026-11-20: "It is completely free for them to be on the platform and get visibility, etc., but once they get hired, they need to have a subscription. Based on our existing workflow, how can we make this a reality?"

## How it works today
- A freelancer joins on the website's plan "Free" and can do everything up to and including being hired: profile, Talent, 5 proposals a month, an agreement, payouts.
- Paid plans (Plus $12, Pro $29, Agency Business $59 a month) add higher limits. Nothing requires one.
- The hire has three moments, in this order: the attorney chooses a proposal, both sign the agreement, the attorney pays. The attorney is charged only after both have signed.
- Plans are bought on the website's checkout. DELA reads the member's plan at each visit.

## The proposal
Put one gate at the freelancer's signature.
1. A freelancer on Free does everything as today: profile, visibility, proposals, intro chats and calls. Free of charge.
2. The attorney chooses their proposal. The freelancer gets the notice "You were chosen" as today, with one new sentence: "Start your subscription to accept this job."
3. On the agreement page, a freelancer on Free sees, in place of the signing box: "You were chosen for this job. To accept it, start a subscription." with the plans, their prices and a button "Choose a plan", which opens the website's checkout. The page also says what they will earn on this job, so the price of the plan sits next to the money coming in.
4. They pay on the website. Back in DELA, their plan is read at the next page load and the signing box appears. They sign.
5. The attorney sees, while waiting: "Chosen. Waiting for the freelancer to start their subscription and sign, until <date>." The existing sign-by date applies: if it passes, the agreement closes and the attorney can choose again, as today.
6. The attorney is charged only after both signed, as today. So no attorney ever pays for a freelancer who did not subscribe.

In code this is one check where the freelancer signs (the same place that already checks the hold and the agency rules), one setting that says which plans may be hired, the card on the agreement page, and the waiting line for the attorney. No change to Stripe, to the website's plans or to how plans are bought.

## What happens after the hire
- The subscription must be running to sign a new agreement. An engagement already signed is never stopped by a lapsed plan: the work, the payouts and the attorney are protected.
- A freelancer who cancels after the job is back on Free with their profile and history, and subscribes again at the next hire.

## How it could go wrong
- A freelancer feels tricked: the rule is said up front, on the Subscription page, on the proposal form ("Sending proposals is free. You need a subscription only when you accept a job.") and in the "You were chosen" notice.
- The freelancer never subscribes and the attorney waits: the sign-by date ends it, and the attorney sees why.
- A freelancer subscribes, signs, then cancels and asks for a refund: the engagement stays; refunds are a website billing matter. Whether a minimum term applies is question 4.
- The plan is paid but DELA still shows Free: DELA reads the plan at each page load; the card has "I have paid, check again".
- Agencies: the agency's plan counts for work signed by the agency. Bench members already need Plus.

## Questions, and Stacey's answer ("Yes, as recommended", 2026-11-20)
1. Which plan is the least a freelancer needs to be hired? Recommended: **Plus ($12 a month)**.
2. Do Free freelancers keep today's allowances (5 proposals and 3 pitches a month, 3 services)? Recommended: **yes**, so "free to be visible" is true.
3. Must the plan stay active for the whole engagement? Recommended: **no, only to sign.** Nothing stops mid-job.
4. A minimum term, for example the plan cannot be cancelled before the engagement ends? Recommended: **no** at first; watch it in the pilot.
5. The Pro trial for new freelancers (step 9): keep it, or drop it now that Free is the way in? Recommended: **drop it for new members**, since "free until hired" replaces it. This one changes a business rule on the website.
6. The 5% platform fee on each side stays as it is? Recommended: **yes**.
7. Should attorneys see which freelancers already have a plan (a small "Ready to start" tag)? Recommended: **yes**, it rewards subscribers and sets the attorney's expectation.
8. Freelancers hired before this starts: Recommended: **their open engagements are untouched**; the rule applies from the next agreement.

## What was built
- Setting fl.hire_min_tier (empty is off; "plus" on the site) and fl.hire_gate_from (the first day; agreements started earlier are untouched). Migration 0149.
- The check sits in the signing function itself, so no page or connector can sign around it. Reason: plan_needed.
- Freelancer: on the agreement page, the card "Start your subscription to accept this job" with what the job pays, the plans from Plus up with their prices, "Choose a plan" (the website's plans, in a new tab) and "I have subscribed, check again". A notice and an email right after being chosen. A line on the proposal form and on the Subscription page saying it is free until hired.
- Attorney: after choosing, "the freelancer starts their subscription and signs first; you are not charged until you have both signed"; on the agreement page the waiting line with the sign-by date; on the proposal list a tag "Ready to start" or "Subscribes when hired".
- Not changed: the allowances on Free, the 5% fee, Stripe, the website's plans and checkout.
- The Pro trial (answer 5): DELA's own trial switch was already off and nobody is on a trial. Whether new freelancers land on Free or on a trial is set in the website's sign-up, which DELA does not control. See the note to Stacey.

## Success looks like
- A Free freelancer is chosen, sees "Choose a plan", subscribes on the website, comes back and signs.
- An attorney is never charged before the freelancer has subscribed and signed.
