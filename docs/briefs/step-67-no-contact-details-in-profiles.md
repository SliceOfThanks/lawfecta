# Feature brief: no contact details in freelancer profiles

Step: 67   Spec references: step 3 (profiles), step 5 (the check for plans to work outside Lawfecta)
Status: built in acceleration mode. Stacey 2026-11-20: "the freelancer should not be able to add emails, phone numbers, websites, booking links etc. Freelancers should get a notification stating that that was removed because it's a violation of the terms of service and inform them that a second violation may have them removed from the platform or suspended."

## Who
Freelancers and agencies, when they save a profile. The owner, when it happens a second time.

## What
When a freelancer saves their profile, DELA takes out email addresses (also written as "jane at gmail dot com"), phone numbers, websites and booking links, social media and chat names, and phrases such as "text me at". The rest is saved. Where something was taken out the text reads "[removed]".
- The page says at once what was removed and from which boxes.
- The freelancer gets a notice in DELA and an email: it was removed because it is a violation of the Terms of Service, and a second violation may lead to suspension or removal.
- Each time is recorded and cannot be deleted. From the second time the owner is alerted. The Members page shows the count on the member's record. The owner decides; DELA suspends nobody by itself.
The same rule covers the agency profile. A freelancer's phone, website, LinkedIn and booking link are no longer sent to the public website listing.

## Where
The Profile page and the live profile's in-place editing (https://www.lawfecta.co/dela?tab=profile), and the agency profile on the Agency page.

## Why
A contact detail in a profile lets an attorney hire the freelancer without Lawfecta.

## How it could go wrong
- Honest text is removed: product names that look like web addresses (Monday.com, Law.com), case numbers, ZIP codes, prices, years and Lawfecta's own links stay. Tested.
- A picture in the text is damaged: picture references are left alone. Tested.
- The freelancer is counted twice for one mistake: the page reloads the cleaned profile, so saving again adds nothing. Tested.
- The check can be talked out of its rule: it is code, not AI.
- An attorney's firm profile loses its phone number: the rule is for freelancers only. Tested.
- New tricks get through (a number written in words): the list of patterns will need care. Listed in the pilot checks.

## Settings and switches it uses
Switch profile_contact_rule (group "Gigs and hiring"). Migration 0148.

## Questions, and how Claude answered them (acceleration mode)
1. Refuse the save, or remove and save? **Remove and save**, as Stacey wrote ("that was removed").
2. Suspend automatically on the second time? **No.** The owner is alerted and decides on the Members page ("may have them removed").
3. The boxes "Website", "Booking link" and "Phone" on the freelancer's form? **They stay for now and stay private**: no attorney sees them in DELA, and they no longer go to the public listing. Removing the boxes is a separate small step if Stacey wants it.
4. LinkedIn? **Kept, private.** It is needed for the Lawfecta check.
5. Profiles saved before today? **Cleaned the next time they are saved.** A one-time sweep of all profiles would send every affected freelancer a violation notice for something that was allowed, so it waits for Stacey's word.
6. Proposals, messages and questions? Already checked by the existing rule (held for a look).

## Success looks like
Freelancer login: a summary with an email address and a phone number saves with "[removed]" in their place, a red note names the boxes, and a notice arrives. Owner login: the Members page shows "Contact details removed from their profile: 1 time".
