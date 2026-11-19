# Feature brief: the Profile page, rebuilt to Stacey's mockup

Step: 52   Spec references: step 3 (profiles), step 20 (match-ready), steps 49 to 51 (the live profile and its editor)
Status: built in acceleration mode. Source: Stacey's two mockups of 2026-11-19 ("Profile editor, proposed revisions", six numbered changes) and her screenshot of the page as it was. Her written brief (profile-page-design-revision-brief.md) could not be opened from the Codex folder, so this step follows the mockups; anything the written brief adds is a follow-up.

## Who
Freelancers and attorneys, on every plan. The mockup shows the freelancer page; the attorney page gets the same frame.

## What
The Profile page was one long form: the checklist, availability, meeting hours, the LinkedIn check and every profile box on one scroll. It is now:

1. **Compact readiness.** One line under the heading: a tag ("Not yet visible in Talent" or "Visible in Talent"), then one short state for each part ("Profile details incomplete · LinkedIn review not started · Availability unconfirmed"), and the link "View requirements", which opens the full checklist.
2. **Separate tasks.** Three tabs: "Public profile", "Matching & verification" (the checklist, availability, the LinkedIn check) and "Meeting schedule". For attorneys: "Profile" and "Firm & verification".
3. **Manageable sections.** A menu at the left, "Profile sections": Basics, Summary, Services & skills, Experience & education, Work hours & agreement, Contact details (optional). One section shows at a time, straight in its boxes.
4. **Persistent guidance.** The help under each box and the client information notice stay where they were, beside the box they explain. "Draft with DELA" sits in the Summary section.
5. **Clear saving.** One Save row at the foot of the card: the Save button, the words "Unsaved changes" when something changed, and "Next: ..." to the following section. Moving between sections keeps what was typed.
6. **Explicit publishing.** A column at the right: "Visibility & publishing" (whether attorneys can see the profile in Talent, and that Preview publishes nothing) and "Directory updates" (the box "Also update my Lawfecta directory listing" and what happened to the listing last time).

"Preview profile" at the top right opens the live profile of step 49.

## Where
https://www.lawfecta.co/dela?tab=profile, both workspaces.

## When
Any time. Links from Home and from the checklist ("Add it", "Confirm it") open the right tab and section.

## Why
Stacey, 2026-11-19: the page was too long and mixed three different jobs. A member should see at a glance whether attorneys can find them, and edit one part without scrolling past everything else.

## How it could go wrong
- A member edits two sections and saves once: the one Save button saves the whole profile, as before, so nothing typed in another section is lost.
- A member leaves a section with changes: the words "Unsaved changes" stay beside Save in every section until saved.
- A link from Home names a box that is in a hidden section or tab: the page opens that tab and section first. Tested through "View requirements".
- A required box sits in a section the member never opens: the readiness line says "Profile details incomplete", and the checklist's "Add it" links lead to each one.
- A narrow screen: the menu, the form and the cards stack; no sideways scroll. Tested at 390 wide.
- Keyboard and screen reader: real tabs (arrow keys, Home, End), the section menu marks the current section, and moving to a section puts focus on its heading.

## Settings and switches it uses
None new. The "Meeting schedule" tab shows with the meetings switch; the directory card shows the box only when directory updates are on.

## Questions, and how Claude answered them (acceleration mode)
1. Save each section on its own, or one Save for the whole profile? **One Save**, shown in every section, with "Unsaved changes" beside it. The profile is saved and checked as a whole (the client information check, match-readiness), and separate saves would leave it half checked. The mockup's "Save changes" sits in the same place.
2. The mockup has five sections; where do time zone, hours a week and the confidentiality agreement go? **A sixth section, "Work hours & agreement".** They are required for matching, so they cannot sit under "Contact details (optional)".
3. "Check publication status" for the directory listing? **The card says what happened to the listing last time** (updated when, being updated, or why it failed), which DELA already knows. A live check of the public page is a later step.
4. "Choose illustration"? **The ready-made pictures stay as the fold "Or choose a ready-made picture"** under the photo, in Basics.
5. Where do profile documents and reviews go? **Under the form on "Public profile"**, since attorneys see them.
6. The attorney page? **The same frame**, with the tabs "Profile" and "Firm & verification". The right column says what freelancers see about the attorney.
7. The wording of the Save button? **Unchanged**: it already says where the change goes ("Save and update my directory listing" or "Save to DELA only").
8. The breadcrumb "Profile / Public profile" in the top bar? **Not built.** The tabs already say where the member is, and the top bar is shared by every page.

## Success looks like
Freelancer login:
- The heading "Your profile", the readiness line with three states and "View requirements".
- Three tabs; "Public profile" is open; the checklist is not on it.
- The menu "Profile sections" at the left; Basics shows; choosing Summary shows only the summary.
- "Next: Services & skills →" moves on; a change shows "Unsaved changes".
- "View requirements" opens "Matching & verification" with the full checklist.
- The right column shows "Visibility & publishing" and "Directory updates".
- "Preview profile" opens the live profile.
Attorney login:
- Tabs "Profile" and "Firm & verification"; the right column says what freelancers see.
