# Feature brief: the fastest onboarding for attorneys, freelancers and agencies

Steps: 96 (the guided path, releases 96a to 96d) and 97 (fees and custom plans, releases 97a and 97b)
Status: plan approved by Stacey on 2026-11-28, after four rounds of her changes (edit in place, the Ask DELA look, the tools a firm runs on, one screen at a time). Release 97a is built first. The "Decisions for Stacey" are answered with the recommended choice in acceleration mode unless she says otherwise; each ships as a switch or a setting.

## Context

Stacey 2026-11-28: "Draft comprehensive details on what is easiest for onboarding for (1) attorneys (2) freelancers (3) agencies, and what info is most important to get them to complete their profiles, with a focus on conversion and ease. If it's too much they won't finish, so it needs to be easy and fast to get the profile complete. Using AI is helpful for them to create what's best to bring them value of the platform."

This plan says what onboarding asks today, where people will drop off, what the least each side must give, and what to build so a new member is set up in about two minutes and sees value in the first sitting. It is based on a read of the live code on 2026-11-28 (the three reports made for the onboarding handoffs), not on real drop-off numbers: DELA has 36 people and no funnel data yet.

## The one idea

**Ask for a few sentences, let DELA fill the form, and ask the member only to confirm.** Then give the first piece of value at once. Everything that is only needed later (license, billing address, payout account, team) is asked at the moment it is needed, with the reason.

Four rules follow from it:
1. **One screen first.** A new member sees one box, not a profile with five sections.
2. **Value before paperwork.** The attorney sees a drafted document; the freelancer sees their finished profile and the gigs that fit; the agency owner sees the agency page attorneys will read.
3. **Just in time.** A check that blocks an action is asked when the member tries that action, never before.
4. **Edit it where you read it** (Stacey 2026-11-28: "They need to be able to easily edit it. UI/UX needs to be clean and easy to follow. WYSIWYG is best for quick editing."). What DELA drafts is shown as the finished profile, exactly as an attorney or freelancer will see it. The member clicks any part and changes it right there. There is no separate form to switch to and no "edit mode".

## How editing works (clean, in place, what you see is what you get)

**The profile is the editor.** After DELA drafts it, the member sees their real profile page: name and headline at the top, summary, services as cards with prices, practice areas and tools as tags, experience. Nothing looks like a form.

- **Click to edit.** Clicking the headline, the summary, a service or the experience text puts the cursor in it. The text stays in the same place, same size, same look.
- **The same small bar as in Library documents.** DELA already has an in-place editor with a small bar that appears over the text being typed in (bold, italic, lists, undo), built for documents in steps 80 and 88 (`fmtShow`, `dpText` and their helpers in `app/dela-app.js`). Today it is tied to the Library, and the profile uses an older editor with its own Save button. This work lifts the document editor into a shared part and uses it for the profile's long texts (summary, experience, the agency summary), with only the tools that make sense in a profile: bold, bulleted list, undo, redo, and "✦ Rewrite with DELA". No headings, tables, pictures or video in a profile. The older profile editor is retired, so there is one editor in DELA.
- **Short things are single clicks.** Practice areas, tools and states are tags: click "+ Add" to pick from a list, click the × on a tag to remove it. Hours a week and availability are buttons. Time zone is one dropdown, pre-filled from the browser.
- **Services are cards.** Each card shows the service, who it is for and the price range as it will appear. Click a card to change it in place; "+ Add a service" adds an empty card; "✦ Suggest a service" has DELA add one that fits the profile.
- **It saves by itself.** Like documents: a quiet line "Saved 2:14 PM" near the top. No Save button to hunt for, nothing lost on a closed tab. "Undo" takes back the last change.
- **DELA is one click away on every part.** A small "✦" beside each part offers "Make it shorter", "Make it more specific", "Write it again". The member sees the new wording in place and can undo it.
- **What is missing is shown where it goes.** A part that is still needed shows as a soft outlined placeholder in its place on the page ("Add what you do in one line"), not as a red error list. A single line at the top counts down: "2 things left before attorneys can find you."
- **Contact details and client information** are still taken out on save, with the same notice as today, shown beside the text that changed.

## The guided path: one screen at a time, for each group

Stacey 2026-11-28: "For each group (attorneys, freelancers, agencies) it should take them through a seamless experience going through each screen to fill out relevant info."

A new member is not dropped on a profile. DELA walks them through a short set of screens, one topic per screen, each already filled in by DELA where it can be, so most screens are "read, fix a word, Continue".

**How every screen works (the same for all three groups)**
- **One topic, one main button.** The dark red button reads "Continue". Nothing else competes with it.
- **A progress line at the top:** "Step 2 of 5", with the step names as small dots the member can click to go back.
- **Already filled in.** After the first screen, DELA has drafted the rest. Each later screen shows its part ready to accept, editable in place.
- **"Back"** at the left, **"Skip for now"** beside Continue on any screen that is not required. A skipped screen comes back later as one nudge on Home.
- **It saves as you go.** Close the tab at step 3 and the next visit opens at step 3, with a line "Welcome back. You were here."
- **No dead ends and no waiting.** Where DELA is working (drafting, reading help pages), the member continues to the next screen and the result appears when ready.
- **Each screen says why in one line** under its title ("Attorneys choose by this", "This lets DELA write steps your team can follow").
- **The last screen is the reward,** not a form: what they now have and the one best next action.
- **Screens move without a page reload,** with the title announced to screen readers and focus on the new title.
- After the path, the same parts live on the profile page, edited in place, for whenever they want to change something.

### Attorney: 5 screens, about 3 minutes
| # | Screen | What they do | What DELA has done already |
|---|---|---|---|
| 1 | **"Tell DELA about your firm"** | Type or say two or three sentences, or paste the firm's website. Confirm name, firm name and state. | Name from the account |
| 2 | **"Your practice"** | Confirm practice areas and where you are licensed, shown as tags. Add or remove with one click. | Filled from screen 1 |
| 3 | **"What does your firm run on?"** | Tap the tools you use; paste a link for one that is not listed. | Tools found in screen 1 are pre-selected. DELA starts reading their help pages in the background |
| 4 | **"What would you like off your desk?"** | Pick one of three suggested tasks, or type your own. | Three suggestions for this practice and these tools |
| 5 | **"Your first document is ready"** | Read the draft. Buttons: "Open it", "Find someone to do this" (starts a gig from it), "Do this later". | The document, written with the firm's own tools named in the steps |

Asked later, in place, when needed: the bar license (at "Post the gig" or the first message to a freelancer), billing details and who signs (at the first signature).

### Freelancer: 5 screens, about 3 minutes
| # | Screen | What they do | What DELA has done already |
|---|---|---|---|
| 1 | **"Tell DELA about your work"** | Paste your LinkedIn "About" or resume, or type or say five lines. Confirm name. | Name from the account |
| 2 | **"What you do"** | Read the headline and summary DELA wrote. Fix a word or accept. Confirm practice areas and tools as tags. | Headline, summary, practice areas, tools |
| 3 | **"Your services and prices"** | Read two or three service cards with price ranges. Edit a price, remove one, or add one. | Services with prices typical for the work described |
| 4 | **"When you can work"** | Three buttons for hours a week, the time zone (pre-set), "Available for new work". Tick the agreement. | Time zone from the browser |
| 5 | **"Get verified, and you are ready"** | Paste your LinkedIn address. Then: your profile as attorneys see it, the gigs that fit, "See these gigs". | The LinkedIn check is sent and availability confirmed by this screen |

Asked later, as single nudges: a photo, education, meeting hours, documents. Asked when first hired: the payout account and the paid plan.

### Agency: 6 screens, about 4 minutes
| # | Screen | What they do | What DELA has done already |
|---|---|---|---|
| 1 | **"Tell DELA about your agency"** | Agency name and state, and a few lines about the team, or the agency's website. Confirm your own name. | Name from the account |
| 2 | **"What your agency does"** | Read the agency headline and summary. Confirm practice areas, states served and tools as tags. | Agency profile drafted |
| 3 | **"Your agency's services"** | Read the service cards. Edit, remove or add. | Services drafted |
| 4 | **"You, the owner"** | Read your own short profile, written from the same words. Hours a week, time zone, the agreement tick, your LinkedIn address. | Owner's profile drafted, so nothing is typed twice |
| 5 | **"Your team"** | Type or paste your team members' emails, several at once. "Skip for now" is fine. | Seats counted: "3 seats, 1 used" |
| 6 | **"Your agency is set up"** | See the agency as an attorney sees it on a proposal, and the gigs that fit. "See these gigs". | The LinkedIn check is sent; invitations are sent |

Asked later, in place: business name and state for the check, who signs and the billing address (at the first gig or agency proposal).

### What the member sees if they stop part way
- Home shows one card: "Pick up where you left off: step 3 of 5, Your services and prices", with one button.
- The reminder emails of day 2 and day 7 name that step and open it directly.
- Nothing they entered is lost, and nothing half-finished is shown to other members.

## The look: the Ask DELA page, the Lawfecta colors and brand

Stacey 2026-11-28: "Use UX/UI/accessibility of the Ask DELA page, and colors and brand design." The new pages are built from the Ask DELA workspace's own parts, so they look and behave like it. Nothing new is invented where a part exists.

**Layout, from the Ask DELA page**
- **Page header** (`dwHead`): the small icon tile, a large title, one grey sentence, the page's one button at the right.
- **First screen**: the light blue band with the picture on the left and a "what DELA knows so far" card on the right (the band and the "Conversation context" card of Ask DELA), then **the message box itself as the one box** ("Tell DELA about your work..."), with the same "Add", "Talk" and "Send" buttons. Talking instead of typing already works there.
- **"Not sure where to start?"** with the three tinted cards (blue, teal, peach): here they become the three ways in: "Paste my LinkedIn About", "Paste my resume", "Describe it in my own words".
- **After the draft**: two columns (`dwCols`). The profile on the left as one white card per part; on the right the "What happens next?" card and a short checklist, as on the conversation screen. Below 760 pixels the right column goes under the left.

**Colors and brand (the existing tokens, nothing new)**
- Burgundy for the one main button and links (`--brand` #8b2146, the Ask DELA main color `--dw-brand` #922346); white cards on the light grey page; the light blue band (`--dw-hero`); the Lawfecta mark from `D.logo`.
- **State tags in the four colors already defined**: green "Complete", yellow "Needs you", blue "Being checked", grey "Optional", and red only for something blocked (`dwTag` with `ready`, `held`, `dw-blue`, `off`, `bad`).
- Blue "i" notes (`dwNote`) for explanations; no pink section backgrounds (Stacey 2026-11-17); practice areas and tools as the pink tags the profile mockup uses.
- Type: Inter, 15 pixels, the Ask DELA sizes for the title and card headings. Corners 16 pixels on cards, 10 on boxes and buttons.
- Light and dark: every part uses the tokens, so dark mode follows by itself.
- If Stacey sends a mockup for these pages, the mockup wins on colors, tags, icons and sizes (her standing rule).

**Accessibility, to the Ask DELA standard and checked**
- Every box has a real label (`field()`); icon buttons have a name; decorative pictures are hidden from screen readers.
- Targets are at least 44 pixels; the main buttons 48.
- Visible focus on everything; focus returns to where the member was after DELA redraws the page (`dwFocusBack`), and moves to the page title on a new page.
- Changes are announced: "Saved", "DELA filled in your profile", "2 things left" (`dwSay`, a polite live region).
- Keyboard: Tab moves part to part, Enter opens a part for editing, Escape leaves it; menus and dialogs behave as on Ask DELA (arrow keys, Escape, focus kept inside a dialog).
- Contrast: input borders at the darker grey used on Ask DELA; text at 4.5 to 1 in both themes; reduced motion respected.
- Not copied: the clickable `div`s elsewhere in the app that a keyboard cannot use. Every clickable thing here is a real button.
- **An automatic accessibility check (axe) runs on the new pages for each side.** Today no such check covers Ask DELA itself; this adds one for it too.

**What "clean and easy to follow" means on each screen:**
- One main action per screen, as one dark red button. Everything else is quiet.
- One column, generous spacing, no tabs inside tabs. Today's profile has three tabs and a five-section side list; the new page is one scroll.
- Plain labels in the member's words ("What you do", "Who you help", "What it costs"), with one line of example under each empty part.
- The same layout for all three sides, so an agency owner who edits their own profile and then the agency's is not learning two screens.
- Works with a keyboard and a screen reader: every in-place editor has a label, Tab moves part to part, Escape leaves the part.

## What onboarding asks today

### Attorney
- **To be "ready to post and hire": 7 profile boxes** (first name, last name, firm name, practice areas, where licensed, city, state) **plus a bar license checked by the Lawfecta Team.**
- **A second form, "Your firm profile for documents"**, asks again for practice areas and jurisdictions, plus firm size, team roles and systems. It is needed before the first document.
- **A third form, "Firm details"** (legal name, billing address, who signs, title, notice email), is needed before paid work.
- The DELA guide leads: tell DELA about the firm, pick a task, approve the document, post a gig, invite. A separate page "Get set up" lists six steps.
- **Where they will stop:** three forms that overlap, in three places (Profile, Library, Firm details); the license check comes before they have seen anything useful; nothing can be posted or messaged until a person at Lawfecta approves.

### Freelancer
- **To be shown to attorneys: 12 profile items** (first name, last name, headline, summary, practice areas, at least one service, experience, tools or "none", time zone, hours a week, LinkedIn address, the agreement tick), **plus the LinkedIn check by the Lawfecta Team, plus availability confirmed.**
- The form has five sections and three tabs. Helpers exist already: "Fill from my Lawfecta listing", "Draft with DELA" (headline, summary, services), "✦ Write with DELA" on single boxes.
- **Where they will stop:** twelve items before any reward; three long free-text boxes (summary, experience, services with prices); the helpers are inside the form, so a member must find them; "match-ready" needs three separate things on three screens (profile, check, availability); the wait for a person.

### Agency
- An agency is a freelancer on the paid plan "Agency Business". The owner must finish **their own 12-item freelancer profile and LinkedIn check first**, then the **agency profile** (headline, summary, practice areas, one service, states), then **business details** (checked by the Team), then **client details**, then the team.
- "✦ Let DELA draft it" exists on the agency profile.
- **Where they will stop:** two full profiles in a row (own, then agency) saying much the same thing; four cards before anything can be sent; two waits for a person.

## The least each side must give, and when

### Attorney
| When | What | How |
|---|---|---|
| **Minute 1** | Name, firm name, state | Name from the website account; firm and state typed, or read from the firm's website address |
| **Minute 1** | Two or three sentences about the firm, or the firm's website address | One box. DELA fills practice areas, jurisdictions, firm size and systems for **both** the profile and the firm profile for documents |
| **Minute 2** | One task they want off their desk | Three suggestions from DELA for their practice, or their own words. DELA drafts the document |
| **When they click "Post the gig"** | Bar license (state, number, name) | Asked in place, with the reason: "Freelancers only see gigs from verified attorneys" |
| **When they first sign or pay** | Billing address, who signs, notice email | Asked in place, pre-filled from what DELA already knows |
| **Never at sign-up** | Headline, summary, experience, education, tools, phone, website, logo | Optional; DELA drafts them later if the member wants a fuller profile |

**The single most important thing to get from an attorney:** the task they want to hand off. It produces the first document, which is the value. Everything else can be drafted from the firm description.

### Freelancer
| When | What | How |
|---|---|---|
| **Minute 1** | Their LinkedIn "About" text, or a resume pasted in, or five lines in their own words | One box. DELA drafts headline, summary, experience, practice areas, tools and **two or three services with price ranges** |
| **Minute 1** | Confirm name, time zone, hours a week | Name from the account; time zone from the browser; hours as three buttons (10, 20, 30+) |
| **Minute 2** | Review DELA's draft: accept all, or edit | One review screen with "Looks right" at the bottom; each part editable in place |
| **Minute 2** | LinkedIn address and the agreement tick | Asked on the same review screen; saving sends the LinkedIn check automatically and sets availability to "Available for new work" |
| **Later, prompted** | Photo, education, categories, meeting hours, documents | One nudge at a time on Home, each with what it gains ("Profiles with a photo get more invitations") |
| **When first hired** | Payout account, paid plan | Already works this way (step 68) |

**The single most important thing to get from a freelancer:** services with prices. Attorneys search and compare by what a person does and what it costs; a profile without them cannot be matched. It is also the part people find hardest to write, so DELA must write it.

### Agency
| When | What | How |
|---|---|---|
| **Minute 1** | The agency's name and state, and a few lines about the team (or the agency's website address) | One box. DELA drafts the agency profile **and** the owner's own profile from the same words, so nothing is typed twice |
| **Minute 2** | Review both drafts on one screen | "Looks right" saves both |
| **Minute 2** | Owner's LinkedIn address | Sends the check |
| **When they first want to post a gig or send an agency proposal** | Business name and state for the check; who signs, billing address, notice email | Asked in place |
| **When they want a team** | Team members' emails | One box that takes several emails |

**The single most important thing to get from an agency:** who the team is and what it does as a unit (services, states, size). That is what an attorney reads on an agency proposal.

## What to build

### 1. The guided path for each side (the main piece)
The screens in "The guided path" above, replacing "here is your empty profile". It reuses and replaces the attorney page "Get set up" (six steps today) and the guide's first steps, so there is one path, not three. Its first screen:
- **One box**, with the three ways to fill it side by side: type a few lines, paste LinkedIn "About" or a resume, or give a website address.
- **DELA drafts every required box at once**, using the helpers that exist today (profile writer `profileDraft`, firm helper "✦ Help me describe my firm", agency "✦ Let DELA draft it"). These become one call per side that returns the whole profile.
- **The profile itself is the review screen**: every drafted part shown as the attorney or freelancer will see it, edited in place as described in "How editing works", with one button "Looks right".
- **Saving does the follow-ups by itself**: sends the LinkedIn check, confirms availability, saves the firm profile for documents from the same answers.
- **The same page is the profile editor from then on.** The existing five-section form is retired for members once the new page covers every box; until then it stays reachable as "All profile details".
- The draft does not cost the member's monthly DELA actions (onboarding is free, as the guide's answers are today).

### 1b. Attorneys: "What does your firm run on?" and DELA learns the tools (new)

Stacey 2026-11-28: "When attorneys onboard they should be able to quickly add links to what legal tech / tech products they use, and the AI finds the help docs to help DELA learn their firm at onboarding."

**What the attorney does (about twenty seconds):**
- One row in the start screen: **"What does your firm run on?"**
- **Tap the tools you use.** The common ones show as buttons with their names (Clio, MyCase, PracticePanther, Smokeball, Microsoft 365, Google Workspace, Dropbox, DocuSign, QuickBooks, LawPay, and the rest of DELA's Tech catalog). A search box finds the others.
- **Not listed? Paste a link.** A box "Paste the product's website" takes any address. DELA reads the name from the page and adds it as a tool.
- If the attorney gave the firm's website or a description in the first box, DELA pre-selects the tools it found mentioned there, and the attorney only confirms.

**What DELA does with it, while the attorney moves on:**
- For each tool, DELA **finds that product's own help center** (the help address kept with the tool in the Tech catalog; for a pasted link, the help, support or docs pages on that product's site).
- It reads the parts that matter for a law office (matters, contacts, documents, billing, calendars, intake forms, e-signature) and keeps **a short note for this firm**: what the tool calls things, where the main actions are, and **the links to the help pages it used**.
- A line on the screen says what it is doing and when it is done: "DELA is reading Clio's help pages... Done: DELA knows how Clio handles matters, documents and billing." Each tool gets the green "Complete" tag, or the yellow "Needs you" tag with "DELA could not find help pages for this one. Paste a link to its help site."

**Why it is worth the twenty seconds (the value the attorney sees at once):**
- **The first document names the real steps.** "Open the matter in Clio, go to Documents, click New from template" instead of "open your practice software". Each step that came from a help page shows where it came from, with the link, as steps already do for other sources (step 72).
- **Gigs ask for the right skills.** The gig's "Tools" box is filled from the firm's tools, so freelancers who know them are matched first.
- **DELA's suggestions fit.** "What can I delegate?" answers with tasks that the firm's tools make easy to hand over.
- **A new hire gets the links.** The handoff a freelancer receives lists the help pages for the tools on that job.

**Where the attorney sees and edits it later:** Profile, "Your firm's tools": each tool as a card with its tag, what DELA learned in three lines, the help links, "Read again" and "Remove". Edited in place like everything else.

**Kept safe:**
- DELA fetches only public https pages, from the product's own site or the address the attorney pasted, with limits on size, time and number of pages. Addresses inside private networks are refused.
- What a help page says is **material, never instructions**: a page cannot tell DELA to do anything (the same rule DELA uses for uploaded files).
- DELA keeps its own short notes and the links, not copies of the help pages.
- No client information is involved: this is about products, not matters.
- The attorney's login to those tools is never asked for and never stored. DELA reads public help pages only; it does not connect to the firm's Clio.
- Reading is free for the attorney at onboarding, with a cap per firm (a setting) so cost stays known.
- The Tech catalog's help addresses are checked by the Lawfecta Team once per product; DELA proposes one for a new product and the Team confirms it before it is reused for other firms.

**What already exists to build on:** the Tech catalog (admin page "Tech catalog", the tools list in profiles), the firm profile's "Systems you use", the "where each step comes from" marks on document steps, the rule and the code that treat outside text as material, and the time limit on outside calls from step 93.

### 2. One source for firm facts (attorney)
The profile's "Practice areas" and "Where you are licensed", and the document firm profile's "Practice areas" and "Jurisdictions", become one answer shown in both places. Asked once.

### 3. Just-in-time asks
- **License:** removed from the first-run path. "Post the gig", "Send message" and "Book a call" open the license form in place, then go on with what the attorney was doing once it is submitted. The gig waits as "Ready to go live when your license is verified" and goes live by itself.
- **Firm details:** asked at the first signature.
- **Agency business and client details:** asked at the first gig or agency proposal.

### 4. The first reward, on the same screen
- **Attorney:** after the firm description, three "Draft:" suggestions; one click drafts a document. (The guide does this today in the Ask DELA card; it moves to the start screen.)
- **Freelancer:** after "Looks right", their profile as attorneys see it, the open gigs that fit, and what happens next ("Your LinkedIn check usually takes one business day. You can send proposals now.").
- **Agency:** the agency page as attorneys see it on a proposal.

### 5. Nudges that finish the rest
- Home's "Complete your profile" card shows **one** next thing, with the gain in a few words and a button that does it in place.
- Reminder emails (they exist: day 2 and day 7) name that one thing and link straight to it.

### 6. Faster approval
- The Lawfecta Team's checks are the longest wait. Proposals: show the expected time on screen; let freelancers send proposals while the LinkedIn check is pending (the attorney sees "check in progress"); alert the Team at once when a check arrives (the six-hour check can list waiting checks).
- Whether any check can be relaxed is a business decision for Stacey, listed below.

### 7. Measure it
A small funnel in the admin area per side: signed up, started the box, saw the draft, saved, check sent, check passed, first value (document drafted, proposal sent, agency profile saved). Without this, the next round of changes is guesswork.

## Part 2: fees. 5% for everyone on every plan, and custom plans that can lower it

Stacey 2026-11-28: "Ensure all plans have all users at 5% fee on every transaction (we are not lowering for now), however we do need to make it easy to custom create plans that lower it."

### What is true today (read from the code and the live site)
- **Everyone is charged 5% on each side today, on every plan,** with a minimum of $10 per side. The charge reads two settings (`fee.client_bps` and `fee.freelancer_bps`, both 500) and ignores the plan (`dela_plan_fee_bps`, changed in migration 0041).
- **But the plans on the live site show a lower fee.** The approved plan versions hold 4% (Plus), 3.5% (Pro) and 3% (Business) for both sides; only Free holds 5%. The Subscription page and the plan comparison show these numbers ("Platform fee on jobs: 3.5%"), while the member is charged 5%. **Members on paid plans are being told a lower fee than they pay.** No payment has been made yet, so nobody has been charged against a wrong promise.
- **The admin Plans page has a "Fee percent" box that changes only what is shown,** never what is charged.
- **No custom plan can be made today.** The database allows exactly one plan per side per tier (free, plus, pro, business), and there is no "new plan" button or function.
- **One case is not 5% and 5% on purpose:** when an agency hires a freelancer from its own bench, the bench member pays 0% and the agency pays 10% in one fee. Lawfecta still receives the same 10%. This was an earlier decision (`agency.bench_fee_waiver`).

### What to do now (release 97a, first, small)
1. **Set every plan to 5%.** A new approved version of att_plus, att_pro, att_business, fl_plus, fl_pro and fl_business with the fee at 5%, everything else copied as it is. The Subscription page, the comparison and the plan-change dialogs then all read 5%.
2. **A check that keeps it true:** the six-hour check gains a line "Fees": every listed plan shows the fee that is charged. A mismatch emails the owner.
3. **The admin "Fee percent" box** on standard plans is locked at 5% with the words "All standard plans charge 5%. To charge less, make a custom plan." until the next release makes the box real.
4. `config/decisions.json` already says 5% on every plan; a note is added that the live plan versions were corrected on this date.

### Custom plans that lower the fee (release 97b)
**In the admin area, Plans page: a button "New custom plan".** Four boxes and one click:
- **Start from:** one of the eight standard plans (its limits and price are copied).
- **Name:** for example "CoLab Partner" or "Founding attorney".
- **Fee on this side:** a percent from 0 to 5.
- **Who can see it:** "Only members I give it to" (the default) or "Listed with the standard plans".
- Optional: an end date, after which members on it go back to the standard plan of the same tier.

Then "Create". It is saved as a draft, and the existing "Approve" publishes it, with the same record in the audit log as every plan change.

**Giving it to members, three ways that already exist or need one small addition:**
- One member: People page, "Give a workspace and plan...", which now lists custom plans too.
- A group joining through the website: "Link to a BD plan" on the custom plan, so everyone on that website plan (for example plan 17, "CoLab Partner", which exists on the website today with no DELA plan behind it) gets it automatically.
- Later, if wanted: a code a member types. Not in this release.

**What makes the lower fee real (today nothing would):**
- `dela_plan_fee_bps` uses the member's plan fee when the plan is a custom plan, and the setting (5%) for every standard plan. So the eight standard plans can never drift from 5% by a typing mistake.
- The fee in a new agreement comes from the plan each side is on **when the agreement is drafted**, and stays fixed for that agreement, as today.
- The estimates members see before posting ("Platform fee (5%, at least $10)") follow the member's own plan.
- The $10 minimum per side stays for every plan unless a custom plan says otherwise (one more optional box, "Minimum fee").
- Custom plans keep the tier of the plan they were started from, so everything that depends on the tier (hiring needs Plus or higher, standing arrangements) keeps working.
- Bench hires: the agency's one fee is the client fee of the agency's plan plus the freelancer fee of the agency's plan. Said here so it is decided, not discovered.

**Tests:** a member on a custom 3% plan signs an agreement at 3% while the other side stays at 5%; a standard plan cannot be saved below 5%; a private plan does not show on another member's Subscription page; the end date moves the member back; the "Fees" line of the six-hour check catches a mismatch. The existing fee tests (5% each side "whatever the plan") stay as they are for standard plans.

## Decisions for Stacey (each ships as a setting or switch, off until she says)
0. **Bench hires stay as they are?** The bench member pays 0% and the agency pays 10% in one fee, so Lawfecta still gets 10%. Recommended: keep. Say if "5% for all users on every transaction" should change this.
1. **Freelancers send proposals before the LinkedIn check passes?** Recommended: yes, marked "check in progress" to the attorney.
2. **Attorneys draft and save a gig before the license check, with the gig going live by itself once verified?** Recommended: yes. (Drafting works today; the automatic go-live is new.)
3. **Required items for freelancers: keep all twelve?** Recommended: keep them as the standard for being shown, since DELA now writes most of them; do not add any.
4. **Onboarding drafts free of the monthly DELA action limit?** Recommended: yes, once per side.
5. **Reading a website address or LinkedIn text the member pastes:** pasted text is safe; fetching a website address from the server is new. Recommended: pasted text first, website fetch together with the tools reading below.
6. **DELA reads the public help pages of the firm's tools?** Recommended: yes, behind a switch, starting with the tools in the Tech catalog (their help addresses confirmed by the Team), then any pasted link. How many pages per tool and per firm is a setting.
7. **Freelancers and agencies get the same "tools you use" row?** Recommended: yes for the picking (it drives matching), no for the reading (their own value is being matched, not having DELA learn their office). Say if agencies should get the reading too.

## Order of work
0. **97a, first:** every plan shows 5%, the check that keeps it true, the locked fee box. Small, and it stops members being shown a fee they are not charged.
0. **97b:** custom plans with a lower fee, in the admin area.
1. **96a:** the two-minute start for freelancers (largest group in the member move: about 520 "Free Membership" and 443 claim listings), with the funnel counts.
2. **96b:** the same for attorneys, with one source for firm facts, the license asked in place, and "What does your firm run on?" (picking tools and pasting links).
2. **96b-2:** DELA reads the tools' help pages and uses what it learned in documents, gigs and suggestions. Its own release, behind its own switch, because it is the one part that reaches out to other websites.
3. **96c:** the same for agencies (one box drafts both profiles), with business and client details asked in place.
4. **96d:** nudges, reminder emails that name one thing, and the Team's alert for waiting checks.

Each release gets its brief, tests, and a ChatGPT check. The three onboarding handoffs already written (check files 40 to 42) are the "before" picture: run them first, so the reports show where a new member really stalls today.

## Files this would touch
- `app/dela-app.js`: the first-visit screen per side; the profile page that is edited in place; the in-place license and details forms; Home's one-next-thing card. Reuses the in-place editor built for documents (`fmtShow`, `fmtInto`, `fmtRead` and the autosave pattern of `pbWorking`), the profile preview (what attorneys see today under "Preview profile"), the firm form (around 14495), the agency profile card (around 8721), the guide card.
- `supabase/functions/api/lib/documents/marks.ts`: its `cleanMarks` and `stripMarks` are reused so a profile text keeps only bold and lists, and plain words go wherever plain words are needed (search, the website listing, emails).
- `supabase/functions/api/app.ts` and `lib/profiles/`, `lib/guide/guide.ts`: one "draft my whole profile" call per side built on the existing profile writer; save that also sends the LinkedIn check and confirms availability.
- `supabase/migrations/`: settings and switches for the decisions above; funnel events; gig "goes live when verified".
- Tools reading: a new `supabase/functions/api/lib/tools/` (find a product's help pages, fetch them safely, write the firm's note), a job for the reading, a table for each firm's tools with what was learned and the links, the Tech catalog gaining a help address per product (`lib/catalog/`, admin page "Tech catalog"), and the document drafting prompt (`lib/documents/ai.ts`) given the firm's tool notes as material.
- `admin/dela-admin.js`: the funnel card; on the Plans page, "New custom plan", the locked fee box on standard plans, custom plans in "Give a workspace and plan...".
- Fees: `supabase/migrations/` (new plan versions at 5%; `plans` gains "custom", "listed", "ends on" and drops the one-plan-per-tier rule; `dela_plan_fee_bps`; `dela_admin_plan_create`; `dela_subscription` hides private plans), `supabase/functions/api/app.ts` (the fee estimates at the two places that read the setting directly; `/admin/plans/create`), `lib/engagements/agreement.ts` (unchanged maths, fed the plan's rate), `config/decisions.json` and `tools/decisions.py --check`.
- `config/decisions.json`: any new number (reminder timing, free onboarding drafts).
- `docs/briefs/step-96-fast-onboarding.md`; tests next to each piece.

## How it is checked
- Automatic tests: the draft call fills every required item from a short text; saving sends the check and sets availability; nothing is typed twice for attorneys and agencies; the license form opens in place and the action continues; the funnel counts each step once.
- Browser tests of the whole path for each side: every screen in order with only "Continue"; "Back" keeps what was entered; "Skip for now" moves on and leaves a nudge; closing at step 3 and coming back opens step 3; the last screen shows the reward; the step count and names match the tables above.
- Browser tests of editing on each screen, at desktop width: click a part, type, see "Saved", reload and find the change; add and remove a tag; add a service card; undo; "✦ Rewrite with DELA" changes the text in place; a placeholder shows where something is missing; keyboard only (Tab, Enter, Escape) reaches and edits every part; the accessibility check (axe) passes on the page.
- A picture of each side's page for Stacey to look at before the release goes out, since "clean" is hers to judge.
- ChatGPT, with the test accounts that approve themselves (step 95): time from first login to "profile complete" and to first value, before (handoffs 40 to 42 as they are) and after. Target: under three minutes and under ten clicks to a complete profile.
- On the live site: the funnel card after the first real sign-ups.
