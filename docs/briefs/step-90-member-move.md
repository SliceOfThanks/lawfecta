# Feature brief: moving the members of the old website to this one

Step: 90 (releases 90a and 90b), with step 91 (keeping the old site in step) and step 92 (the end of the free period) after it
Spec references: step 82c (claim listings created on the website), step 17 (the website's categories), the plan map (`plans.bd_plan_id`, `bd.plan_aliases`)
Status: approved to build. Stacey 2026-11-25: "We will be transferring BD data (users, etc) from the old BD site to this new one. What can we create that will help us do this transfer easy? And moving forward any and all users need to sync from Lawfecta DELA (this build) to the old build because our Apple app runs through the old one until we move it." Plan approved the same day.

## Who
The owner, in the DELA admin area. The members it is about: everyone on the old website, www.lawfecta.com (2,596 on 2026-11-25).

## What
Every member of the old site gets an account on the new site, www.lawfecta.co, on the plan the owner chose for their old plan, with their listing's details. Attorneys also get an example document in their Library. The owner sees what would happen before anything is made.

## Where
A new page in the admin area, "Move members", under "Members". Server: `supabase/functions/api/app.ts` (`moveRead`, `movePick`, the routes under `/admin/move`). Database: migration 0168. The old site's key is the Supabase secret `BD_OLD_API_KEY`.

## When
Once, when the owner is ready. Reading and previewing can be done any number of times before.

## Why
The new site is where DELA runs. Members of the old site should not have to sign up again, and the owner should not have to move 2,596 people by hand or trust a move she cannot check first.

## What cannot be moved by any tool
- Passwords. The website's API takes only a new password in plain words and never gives the old one. A test with the website's own export and import comes before the move; if it does not keep passwords, members set a new one from an email the owner sends.
- Cards, renewals and invoices. They live in the old site's billing and are not touched.
- Member numbers. A member gets a new number on the new site; DELA keeps the pair.

## How it could go wrong
- The wrong plan for hundreds of people: nothing is pre-chosen, the preview counts members per new plan, and three members can be moved first.
- Someone made twice: emails are compared without regard to capital letters; an email already on the new site is linked; of two old members with one email, the one who logged in last moves.
- Members get an email they did not expect: no call asks the website to send its welcome email.
- A password, a card or a login token ends up in DELA: the reading keeps an allow-list of fields and nothing else.
- A key leaks: both keys are Supabase secrets. The page is told only whether the old key exists.
- The old site is slow or refuses: a refusal stops the reading with its reason; "slow down" makes the job wait and try again.
- Someone other than the owner uses it: every function checks the owner role at the moment it runs, and the page is behind the switch `member_move`.

## Settings and switches it uses
- New switch `member_move`: off, then the Lawfecta Team.
- New setting `bd_old.site_url`: the old site's address.
- New secret `BD_OLD_API_KEY` (Supabase, typed by Stacey).
- Existing: `site.url`, `BD_API_KEY`, the plan map, the website's categories.
- No business number.

## Stacey's answers (2026-11-25)
1. Who moves? **Everyone, at once. She defines which new plan each old plan becomes.**
2. **"The platform is free for everyone until 2027, and then we need to be able to downgrade people and upsell them to the subscription plans."** (step 92)
3. Passwords? **First test whether the website's own import keeps a password; if not, a "set your password" email.**
4. Paying members? **The matching plan on the new site, nothing charged yet.**
5. What the Apple app needs from the old site: **login and profile.** (step 91)
6. An example document for moved attorneys: **ready-made examples she approves once, placed for all of them at the move.**

## Release 90a: the questions Claude answered itself (acceleration mode, 2026-11-25)
1. What does 90a do, and what waits for 90b? **90a reads and previews only.** It writes to neither website. The move, "try with 3 first", the examples and the password list are 90b.
2. Which fields are read? **Names, email, company, phone, address, website and social links, the listing's text, position, listing type, plan, status, category and sub-categories, sign-up date, last login, and picture addresses.** Nothing else: the old site holds hundreds of fields of its own bookkeeping, and none of them is read.
3. Two members of the old site with one email? **The one who logged in last moves; the other is listed with that member's number.**
4. How do categories match? **By name and place** (top category, the category above, the name), so "Westlaw" under "Civil Litigation" is not taken for "Westlaw" under "Employment Law". Only categories that members use and that have no match are shown.
5. Does a reading wipe the owner's choices? **No.** Plan choices and categories set by hand stay; categories matched by name are matched again.
6. Who may open the page? **The owner only.**

## Release 90b: the questions Claude answered itself (acceleration mode, 2026-11-25)
Stacey: "Build 90b now", before the first real reading of the old site.
1. Which way are members made, before the password test is done? **Through the website's API, with a long random password that is not kept or logged.** That path works whatever the test says. If the test shows that the website's own import keeps passwords, the import path is added then; members already made this way are simply linked.
2. How fast? **Fifteen members a turn, a turn about every 20 seconds**, which stays under the website's 100 calls a minute. 2,596 members take a little over an hour.
3. What makes sure nobody is made twice? **Three things:** the pair of member numbers DELA keeps; a question to the website before every create ("is this email there?"); and the count typed on the page, which must equal the number waiting.
4. What if the website refuses? **A refusal that would repeat for everyone (the key may not create members) pauses the move at once**, with the reason. A refusal for one member lists that member with the reason; they can be tried again. "Slow down" is not a failure: the turn is tried again.
5. Which example does an attorney get? **The one example the owner chose, after approving it.** The plan was a table from practice area to example, but the old site's attorney accounts carry no practice area (their category is empty), so there is nothing to choose by. One example for all of them is what the data allows.
6. Does the example count toward the documents a plan may save? **Yes, as one draft like any other.** The plan said it would not count; making an exception would have meant changing how every Library counts its documents, for one draft the attorney can delete. Said here so it is not a surprise.
7. Who gets an example? **Every moved member whose new plan is an attorney plan**, and an attorney who was already on this site only if their Library is empty. Freelancers, agencies and claim listings get none.
8. What does the attorney see? **A draft, never approved for them**, with a notice "Example from Lawfecta. Change it to fit your firm, or delete it." and every step tagged "DELA's suggestion".
9. What does "Try with 3 members first" need? **Their old member numbers**, from the first column of the preview's file. A member who would not move is refused with the reason.
10. The list for the "set your password" email? **A file with each moved member's email, first name, new plan and the login page**, and whether they have logged in since. DELA sends nothing.

## Success looks like
Owner login, switch on, key set:
- "Read the old site" ends with "Read 2,596 members".
- The plan table lists every old plan with its count, and nothing is chosen.
- After the choices, the preview's "Moves" count plus the other counts add up to 2,596, and the file has one line for each member.
- Neither website shows any change.
