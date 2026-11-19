# Feature brief: View my live profile, and edit it in place

Step: 49   Spec references: step 3 (profiles), step 17 and migration 0105 (the freelancer profile page attorneys see)
Status: built in acceleration mode (Stacey 2026-11-19: "each user should be able to view their live profile, and if we can do a WYSIWYG type of front end editor that would be ideal")

## Who
Freelancers, on every plan. Attorneys get a short card that says what freelancers see about them.

## What
A freelancer opens their own profile exactly as attorneys see it: the same page, the same tabs, the same wording. On that page the freelancer changes the text parts where they show: headline, professional summary, professional experience, education and credentials. "Done" is: the page shows the change at once, and nothing else in the profile moved.

An attorney has no profile page that freelancers can open. Freelancers see the firm name on a gig ("Posted by ...") and the reviews. The attorney's Profile page now says so in one card.

## Where
- Profile page (https://www.lawfecta.co/dela?tab=profile), freelancer workspace: a blue card at the top with the button "View my live profile".
- Home, in the "Complete your profile" card: the link "View my live profile", next to "Help me complete my profile" (on a computer; on a phone the card stays short and the button on the Profile page is the way in).
- The live profile page itself: a card "Your live profile, as attorneys see it" at the top, an "Edit" button next to each of the four text parts, and "← Back to the profile form".
- Profile page, attorney workspace: the card "What freelancers see about you".

## When
Any time. A change is saved when the member chooses "Save" in the box that opened. "Cancel" drops it.

## Why
Members could not see what attorneys see, so they could not judge their own profile. Editing where the text shows is faster than finding the box on a long form, and a better profile gets more invitations.

## How it could go wrong
- Client information or sensitive data typed into a part: the same check as the form runs on save. The page says what it found; the member takes it out or says it is not client information.
- The profile form has unsaved changes: the live page shows what is saved and turns editing off, with a sentence that says why, so the two never overwrite each other.
- The profile changed in another window: the save is refused with a plain sentence, and nothing is lost on the server.
- A member tries to open someone else's profile in edit mode: not possible. The editor only ever saves the signed-in member's own profile, through the same save the form uses.
- The profile is not match-ready: the page says attorneys cannot find it in search yet.
- Buttons that belong to attorneys (Invite to gig, Send message, Book a call, bookmark) are not shown on the member's own page.

## Settings and switches it uses
The "profiles" switch that already gates the Profile page. No new switch, setting or number. No change to the server or the database.

## Questions, and how Claude answered them (acceleration mode)
1. Which parts can be changed in place? **The four text parts: headline, summary, experience, education.** They are what an attorney reads first and they are plain text.
2. Picture, services with prices, skills, software, categories, availability? **Still on the profile form**, one click away. They have their own pickers, price rules and checks; putting each of them in place is a later step if Stacey wants it.
3. Rich text (bold, lists, links)? **No.** The profile holds plain text, and attorneys see plain text. One point per line becomes a list, as today.
4. Does saving in place also update the Lawfecta directory listing? **It follows the member's own choice** from the form ("Also update my Lawfecta directory listing"), the same as the form's Save.
5. What is a "live profile" for an attorney? **A card that says what freelancers see** (the firm name on gigs, the gig, reviews). DELA has no attorney page that freelancers open, and none is invented here.
6. A new switch? **No.** It shows a member their own data and saves through the existing save.
7. An agency's page? **Not in this step.** The agency profile has its own form.

## Success looks like
Freelancer login:
- "View my live profile" opens the page with the saved summary, the tabs, and no invite, message or call button.
- "Edit" next to the headline opens a box; Save shows the new headline at once.
- "Cancel" leaves a part as it was.
- Education is added on the "Experience and qualifications" tab.
- The rest of the profile (services, picture, summary) is unchanged after an edit.
- "← Back to the profile form" returns to the form with the new headline in it.
Attorney login:
- The Profile page shows "What freelancers see about you".

## Second part, the same day (Stacey 2026-11-19: "Yes, add them")
Also changed on the live profile now: the picture ("Change photo" beside the name, uploaded and saved in one go), services (the form's own editor, with prices), task skills (typed with commas) and tech tools (the form's own picker). Still on the profile form: ready-made pictures, categories, practice areas, availability, hours and time zone.

Questions, and how Claude answered them (acceleration mode):
1. Build new editors or reuse the form's? **Reuse the form's**, so prices, limits and the tool list behave the same in both places.
2. Does a new picture need a second "Save" click? **No.** Choosing the file uploads it and saves it. The old picture is replaced, as on the form.
3. Ready-made pictures on the live page? **No**, they stay on the form, where the grid of choices is.
4. Categories and practice areas in place? **Not yet.** Categories drive search matching and have their own tree picker; they stay on the form until Stacey asks.
