# Feature brief: the DELA guide (a proactive chat on the Dashboard)

Step: 13   Spec references: step 4d part A (the onboarding widget), step 8a part C (the first ten minutes), switch onboarding_widget
Status: questions answered (Stacey 2026-11-09); the open questions below ship as settings with the suggested answer

## Who
- Attorneys on every plan (att_free to att_business), including firm staff who can post.
- Freelancers on every plan (fl_free to fl_business), including agency owners.
- The Lawfecta Team sees how many people move through each step.

## What
When a member opens DELA, a chatbox on the Dashboard already has DELA's next suggestion in it, with buttons to act.
- Attorneys: DELA picks a good first task to hand off, drafts the playbook, the attorney approves it, DELA marks the steps a freelancer can do, writes the gig, and the attorney posts it and invites the best matches. Each step can be paused and picked up later.
- Freelancers: DELA walks them through what is missing from the profile (with "Let DELA draft it"), the LinkedIn check, confirming availability, and then new gigs that fit them, with why each fits and a button to write a proposal.
- Anyone can type a question to the guide. Guide answers are free (Lawfecta's key) up to a daily cap. The work it leads to (drafting a playbook, writing a gig, a proposal draft) counts DELA actions as usual.
- New gig alerts for freelancers go to three places, and each can be turned on or off: the guide chat, email and the Notices bell.

Done looks like: a new attorney posts a first gig in one sitting, and a new freelancer becomes match-ready and sends a first proposal, without hunting through tabs.

## Where
- The top of the Dashboard (Home) on the attorney and freelancer sides of https://www.hirelegalhelp.com/dela.
- Its buttons open the existing screens: the Library (new document, the document), Automate or delegate, the gig page, the profile, Work.
- Gig alert emails and notices link to the gig on the Work tab.
- Admin: a "DELA guide" card on the Overview tab.

## When
- Every time the Dashboard opens, unless the member paused it (it comes back after the pause, or sooner when there is something new, such as a new gig that fits).
- Gig alerts go out when a gig is posted, at most a few a day per freelancer.
- Reminder emails on days 2 and 7 after sign-up if the first steps are unfinished (onboarding.reminder_days), only while the member's email alerts are on.

## Why
- Members who reach a first result (a posted gig, a sent proposal) in the first visit come back; members who land on an empty page do not.
- For Lawfecta: more posted gigs, more proposals, more engagements, and members who see what their plan gives them.

## How it could go wrong
- Pushy: the chat must close in one click and stay closed for the pause time.
- Wrong step: the step is worked out from real data each time, so it never says "post your gig" after it is posted.
- Two tabs or double clicks: every guide step is saved once (request ids).
- Typing sensitive data into the guide: the same check as Ask DELA refuses SSNs, ID numbers, account numbers and so on.
- AI cost abuse: free guide replies stop at the daily cap, and then the guide says so.
- The AI suggesting something it should not: it can only offer buttons from a fixed list, checked in code; it never gives legal advice.
- Alert spam: one alert per gig per freelancer, a daily cap, only gigs with at least two match reasons, and each channel can be turned off.
- Two sides: a person with both sides gets each side's guide on that side only.
- Live: everything is behind switches that stay off on Live until Stacey turns them on.

## Settings and switches it uses
- Switches: onboarding_widget (the guide), gig_alerts (new gig alerts).
- guide.ai_replies_per_day 20, guide.snooze_hours 24, gig_alerts.max_per_day 3, gig_alerts.min_reasons 2, gig_alerts.default_on true, onboarding.reminder_days [2, 7].

## Questions to make it better
Answered by Stacey 2026-11-09:
1. How the guide shows: a chatbox on the Dashboard with a proactive prompt.
2. Guide AI replies: free for the guide (Lawfecta's key, daily cap); the real work counts as usual.
3. New gig alerts: in the guide chat, by email and in the Notices bell, each one on or off by the member.
4. The attorney path: all the way to a posted gig.

Open, shipped with the suggested answer as a setting:
5. Free guide replies a day: 20.
6. Gig alerts a day per freelancer: 3, only gigs with at least 2 match reasons.
7. Alerts start on for everyone (members can turn them off).
8. Pause length: 24 hours, or sooner when something new happens.

## Success looks like
- Freelancer: the guide opens with the missing profile items, drafts one, sends them to confirm availability, shows a new gig with its reasons, and the alert also arrives in Notices; turning alerts off stops the next one.
- Attorney: the guide suggests three tasks, drafts the playbook, the attorney approves it, marks steps to delegate, the gig is drafted and posted, and the guide then suggests inviting matches.
- Owner: the Overview shows the guide card with counts per step and gig alerts sent today.
