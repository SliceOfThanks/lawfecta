# Feature brief: Profiles and verification (both sides)

Step: 3   Spec references: 1A sections 7 (registration, verification and match readiness), 1A tables "Credentials / eligibility" and "Unverified attorney account", C-61 (enhanced attorney verification before paid work), Decision Sheet section 8 (availability every 14 days, activity window 30 days)
Status: questions answered by Stacey 2026-11-04, approved to build

## Stacey's answers (2026-11-04)
1. Yes: the Lawfecta Team checks each license by hand on the state bar's own lookup.
2. The confirming email must either match the email on the state bar record, or be at the law firm's own domain. Free email (Gmail, Yahoo and the like) never counts. Otherwise a 10 minute confirming video call.
3. No ID documents.
4. Freelancers: check their LinkedIn verification. Do not check or collect ID or passports.
5. Yes: firm staff can set up the firm profile once a verified attorney grants the role.
6. Yes: reuse name, firm or company, city and state, practice areas or services, website and photo from the Lawfecta profile.
7. Yes: availability every 14 days, reminder 2 days before.
8. "Yes". Built as: attorneys outside the US can sign up and keep their profile; the countries the Lawfecta Team verifies are a setting (verify.countries), starting with the US. To confirm with Stacey.
9. Every member in the Lawfecta directory is a DELA profile, so all show. Built as: the BD directory listing is the public profile. DELA fills from it, and after the member approves, sends changes back to the listing (switch bd_profile_sync). There is no second public profile.

## Who
- Attorneys on every plan (att_free to att_business), and firm owners whose staff act for the firm.
- Freelancers on every plan (fl_free to fl_business), including agency owners.
- Lawfecta Team: reviewers check attorney licenses and handle name changes, holds and appeals.
- One person can hold both sides. Each side has its own profile, its own checklist and its own verification. Nothing mixes.

## What
Attorney side
- Attorney profile: legal name, firm name and firm role, practice areas, states or courts where licensed, and a business email and phone for service. Existing Lawfecta profile details are offered to confirm, never copied silently.
- License verification: the attorney adds each license (state, bar number, name on the record). The Lawfecta Team checks it on that state bar's own public lookup, and records how, when and the next check date. Status: not started, pending, verified, needs more, not verified, expired.
- What verification unlocks: an unverified attorney keeps everything they have today (Ask DELA, playbooks, files, recorder, connector). Posting gigs and hiring (Step 4 and later) need a verified license. Paid work also needs the business details (billing address, who may sign for the firm).
- Identity to license match: a bar number alone is not proof. The attorney confirms one of: an email sent to the address on the bar record, or a short video call with the Lawfecta Team (question 2).

Freelancer side
- Freelancer profile: headline, summary, at least one clear service (what, for whom, typical price range), task-level skills, software they use (or "none"), experience, work preferences (time zone, hours, states they will not work for), and current availability and capacity.
- Profile documents (optional): a resume, certificates or samples, stored with the Step 2a file system and the same type, size and client information checks. Each document is private until the freelancer marks it to show to attorneys.
- Match-ready checklist: a plain list of exactly what is missing. States: incomplete, pending, match-ready, availability out of date, unavailable, restricted. A new freelancer with no reviews can be match-ready.
- Availability: the freelancer confirms it every 14 days (setting). After that the profile shows "availability out of date" and is left out of matches until they confirm. A daily reminder email goes 2 days before.
- Freelancer verification (question 4): email and the profile checklist only in Phase 1, with an optional ID check later.

Both sides
- DELA writes a first draft of the summary and services from what the member types or uploads, marked as a draft; nothing is published without the member approving it. DELA may not invent qualifications.
- Public profile visibility is separate from match readiness: a member can be match-ready and hidden, or visible and not yet ready.
- Connector tools (Step 2b): my profile, what is missing, verification status (read only).

## Where
- DELA page tabs: attorney "Profile" (in the account menu and Home), freelancer "Profile" tab (already a placeholder).
- Home on both sides: a readiness card with the next step.
- Emails and notices: verification result, needs more information, availability reminder, license check due.
- Admin area: a new "Verification" tab (queue, open the state bar lookup link, record result, reasons, history), and profile readiness counts.

## When
- Starts when a member opens Profile, or when they first try something that needs verification (the message says why and links to Profile).
- Verification requests: the Lawfecta Team answers within a target time (setting, suggested 2 business days); the member sees "pending" meanwhile.
- License re-check every 12 months (setting), and on any name change.
- Availability reconfirmation every 14 days.

## Why
- Attorneys hiring through Lawfecta need to know the other side is real, and Lawfecta must not let an unlicensed person act as an attorney.
- Freelancers get matched only when their profile says enough to be useful, which makes matches better and protects the marketplace.
- A clear checklist turns sign ups into ready profiles, which is the supply Step 4 needs.

## How it could go wrong
- Someone uses a real attorney's bar number: the name must match the record, plus the email or video identity check; a bar number already verified on another account is flagged for the team.
- Name differs from the bar record (marriage, initials): "needs more", handled by the team by hand.
- State bar website is down: stays pending; never a false pass or a fraud label.
- A license lapses: the yearly check, plus the member can report a change; expired removes hiring rights but keeps all data and active work readable.
- A freelancer leaves availability on and disappears: the 14 day reconfirmation takes them out of matches.
- A bot or the connector confirms availability for an absent freelancer: only a signed in website action counts.
- Client information in a profile or document: same notice and checks as Files.
- Two clicks on submit: one request (idempotent).
- Someone on hold, off the access list, or with an expired plan: refused with a plain message; their profile stays.
- Raw identity documents: not collected in Phase 1 (question 3), so they cannot leak.

## Settings and switches it uses
Switches: profiles, attorney_verification, freelancer_documents. Settings: profile.availability_days (14), profile.activity_days (30), profile.availability_reminder_days (2), verify.recheck_months (12), verify.target_business_days (2), verify.identity_methods, verify.states_enabled (all US states and DC), profile.required_fields per side, storage counts from Step 2a.

## Questions to make it better
1. Attorney license check method: the Lawfecta Team checks each state bar's public lookup by hand and records the result? Suggested: yes, by hand in Phase 1 (no scraping, no paid service).
2. Identity to license match: which proofs count? Suggested: an email link sent to the address on the bar record, or a 10 minute video call with the Lawfecta Team when the record has no email.
3. Should DELA collect ID documents (driver's license or passport) in Phase 1? Suggested: no. Add a paid ID check (for example Stripe Identity, about $1.50 per check) in Step 6 if needed.
4. Freelancer verification in Phase 1: email plus the match-ready checklist, with no ID check? Suggested: yes; an optional "ID checked" badge later.
5. Firm staff (paralegals, office managers): may they set up the firm profile and post gigs for a verified attorney once that attorney grants the role? Suggested: yes, set up the profile now; posting waits for Step 4 roles.
6. Which existing Lawfecta (BD) profile fields should DELA offer to reuse? Suggested: name, firm or company, city and state, practice areas or services, website, photo. This needs a read-only look at the BD profile fields through your BD MCP session.
7. Freelancer availability: reconfirm every 14 days, with a reminder 2 days before? Suggested: yes (Decision Sheet section 8 says 14 days).
8. Can attorneys outside the US join on the attorney side in Phase 1? Suggested: no; the fields are ready for later.
9. Public profiles: should DELA profiles show on the public Lawfecta directory (BD) in Phase 1, or stay inside DELA? Suggested: inside DELA only in Phase 1; the BD directory stays as it is.

## Success looks like
- A new attorney fills the profile, adds a license, and sees "pending"; the team marks it verified from the admin queue with the method and date; the attorney gets a notice and email.
- An unverified attorney can still use Ask DELA, playbooks, files and the recorder, and is told plainly that hiring needs verification.
- A bar number already verified on another account is flagged, not passed.
- A freelancer sees exactly what is missing, fills it, becomes match-ready, and drops to "availability out of date" after 14 days without confirming.
- A freelancer uploads a resume; a file with client information is held as in Files; a program renamed to .pdf is refused.
- A person with both sides has two separate profiles and checklists.
- The connector shows profile status and what is missing on each side.
- Nothing here works for someone off the access list, on hold, or while the switches are off.
