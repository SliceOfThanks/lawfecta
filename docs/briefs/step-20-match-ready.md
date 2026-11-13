# Feature brief: what match-ready means, and a progress bar toward it

Step: 20 (after go-live)   Spec references: step 3 profiles and verification (the readiness states), step 18 Talent
Status: approved to build (Stacey 2026-11-13, in chat: "lets define what matchready means and show them a progress bar to get to match ready when they are completing their profile")

## Who
Freelancers (match-ready decides whether attorneys can find them) and attorneys (ready to post and hire).

## The definition, as DELA applies it today
A freelancer is match-ready when three things are true:
1. **Profile complete.** Every required item is filled: first name, last name, headline, summary, practice areas, at least one service, experience, software (or "none"), time zone, hours a week, LinkedIn address, and the marketplace acknowledgement (setting profile.required.freelancer).
2. **Checked.** The Lawfecta Team's LinkedIn check has passed (left out while the setting verify.freelancer_linkedin is off).
3. **Available.** They confirmed in the last 14 days (setting profile.availability_days) that they can take work, and are not marked "Not taking new work".
A paused or closed account is never match-ready. If any part lapses, the freelancer leaves Talent and gig matches until it is fixed; work already agreed is not affected.

An attorney is ready to post and hire with parts 1 and 2 (their own required items, setting profile.required.attorney, and a verified bar license).

## What is built
On the Profile page, the first card: "Match-ready: 9 of 14 steps done" with one progress bar, the state badge, how many steps are left, the definition under "What "match-ready" means", and the steps in three groups (profile, the team's check, availability). A step that is not done has a link that jumps to where it is filled in; a check in progress says there is nothing to do. Every step counts the same on the bar. Screens only; the rules are unchanged.

## Questions to make it better (defaults in use)
1. Should picking Lawfecta categories be a required step for match-ready? Default: no (nobody drops out of Talent today).
2. Should a profile photo or ready-made picture be required? Default: no.
3. Is 14 days the right window for confirming availability? It is a setting.
