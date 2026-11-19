# Inventory E: Talent, Work, Inbox, Meetings

Source: `app/dela-app.js`, lines 7018 to 8790 (new layout only). Every label in quotes is copied from the code.
Things defined outside this range but used here are marked "(outside range, line N)".

Menu facts (outside range, lines 21 to 46): attorneys always have "Talent" in the menu; "Meetings" shows for both sides only when switch `meetings` is on; freelancers always have "Work"; a freelancer whose agency hires (`me.agency_client`) also gets "Talent" when switch `talent_search` is on. "Inbox" is a button in the top bar (aria-label "Inbox"), not a menu tab.

---

## Talent: Search (attorney; also a freelancer whose agency hires)
- How to reach it: menu item "Talent", `?tab=talent`. `talentView()` line 7018, `talentForm()` line 7123, `talentResults()` line 7545.
- Purpose and primary focus: find match-ready freelancers. The one main thing: search or filter, then "View profile" or "Invite to gig" on a card.
- Shown when: side attorney (or agency that hires with switch `talent_search`). View pills depend on switch `bench` and on whether the website's bookmarks are on. DELA help section needs switch `ai_helpers` and the helpers service reporting on.
- Layout, top to bottom:
  1. Page heading "Talent".
  2. View pills (tablist, aria-label "Talent views"): "Search", "My bench" (only with switch `bench`), "Bookmarks" (becomes "Bookmarks (N)" when there are some; removed if bookmarks are off; the whole pill row is removed if fewer than 2 pills remain).
  3. Intro line: "Find verified legal professionals to support your practice."
  4. Help link button "What does match-ready mean?" with a small "i".
  5. Card "Find a freelancer": search box, a button row, and the folded Filters panel.
  6. Section "Find a freelancer with DELA" (accordion; only with `ai_helpers`). It is inserted between the search card and the results.
  7. Results: heading row (count, filter chips, "Clear all", sort), result cards, then "Showing X of N freelancers." and "Load more freelancers".
- Content and data shown (result card, one per freelancer): photo or initial; name; headline; trust line: "✓ Verified member" (only when verified; tooltip "The Lawfecta Team checked this member's identity and profile. It is not a check of qualifications."), "★ 4.8 (N reviews)" or "N review(s)" (only when there are reviews), "Bookmarked" (when bookmarked); summary text; up to 3 tags (first 2 practice areas, then software); facts line joined with " • ": "N hrs/week" plus " (limited right now)" when availability is limited, "<timezone> Time", "Availability confirmed <date>".
- Interactive elements:
  - View pills "Search" / "My bench" / "Bookmarks": switch the view.
  - "What does match-ready mean?": opens a small panel. On a mouse it opens on hover and focus; a click pins it; Escape closes it. On touch a tap toggles it.
  - Search box: label "Search roles, specialties, tasks and software"; placeholder "Search by role, practice area, skills or software (for example \"Family law paralegal\" or \"Clio\")". It is a combobox: typing shows up to 8 category suggestions (name plus its path, or " Category" for a top level); picking one sets the category filter and searches; Enter searches; arrow keys move; Escape closes the suggestions and keeps the words. (catSearchBox, outside range, line 6850.)
  - Button "Filters (N)" (filter icon; aria-label "Filters, N in use"): opens or closes the Filters panel; focus goes to the first dropdown; Escape inside the panel closes it.
  - Button "Search freelancers" (blue): runs the search.
  - Button "Clear filters": resets every filter and the search words, then searches.
  - Filters panel (each filter searches as soon as it changes):
    - Dropdown "Category": "Any category" plus the top-level categories (loaded from the website; names not in this code).
    - Dropdown "Practice area / Specialty": "Any specialty" plus specialties (grouped under category headings when no category is chosen).
    - Dropdown "Services / Tasks": "Any service or task" (or "Nothing more specific" when the chosen specialty has none) plus tasks (grouped when no specialty is chosen).
    - Dropdown "Software": "Any software" plus the software list (loaded; names not in this code).
    - Dropdown "State / Jurisdiction": "Any state" plus the US states. Hint: "Leaves out freelancers who do not take work for that state."
    - Checkbox " Bookmarked only (freelancers you saved)" (only if bookmarks are on).
    - Button "★ Your bookmarks" (only if bookmarks are on): clears the other filters, ticks Bookmarked only, searches.
    - Button "Apply filters" (blue): searches and closes the panel.
  - DELA help accordion header button: "✦", bold "Find a freelancer with DELA", sub-line "Use DELA to describe your project and get suggested search filters.", cost label "N DELA action(s)" or "Your own AI key" with an "i", caret "▾"/"▴". Opens or closes the panel.
    - Text box: label "What do you need help with?"; placeholder "For example: family law paralegal in Clio to help with e-filing motions." (2 rows, no length limit in this code).
    - Safety line (shield icon): "Don't enter confidential client information, personal identifiers, or passwords."
    - Button "✦ Suggest filters" (while working: "DELA is checking..."). If the text looks like client information, a browser OK/Cancel pop-up: "This may include client information (...). Use placeholders instead. Click OK only if it is not client information."
    - After suggestions: heading "DELA suggested filters"; button "Clear all suggestions"; line "Review or remove the suggestions below. Nothing is searched until you apply them."; chips worded "Practice area: X", "Skill: X", "Software: X", "State: X", each with "×" (aria-label "Remove suggestion: ..."); optional note from DELA; button "Apply filters & search" (blue); button "Edit filters manually" (fills the filters, opens the panel, toast "The filters are filled in. Change them, then click Search freelancers.").
  - Results heading row: chips for each filter in use with "×" (aria-label "Remove filter: ..."). Chip wording: the category path joined with " › ", the search words in quotes, "Practice area: X", "Skill: X", "Software: X", "Bookmarked", the state name. Button "Clear all" (only when chips exist). Dropdown "Sort by ": "Most relevant", "Most reviews", "Most hours a week", "Name, A to Z" (shown only when there are results).
  - Per card: "View profile" (opens the profile page), "Invite to gig" (blue; opens the invitation review step, outside range, line 6934; if the attorney has exactly one open gig it is preselected).
  - "Load more freelancers" (while loading: "Loading..."): adds the next page under the list; focus moves to the first new card.
- States:
  - Loading: "Loading the categories...", "Searching..." (also announced to screen readers).
  - Count heading: "N freelancer found" / "N freelancers found".
  - Empty: "No match-ready freelancers fit this search yet. Try a broader category or fewer words."
  - Categories failed: "The categories could not be loaded right now. You can still search by words, software and state." (only Software and State filters show).
  - Errors: "That category is no longer on the Lawfecta website. Choose another one."; "Your bookmarks could not be read, so nothing is shown. ..."; other errors through the shared gig error text; each with a "Try again" button. Screen reader line "The search did not work."
  - Load more errors: "More could not be loaded. Try again." / "More could not be loaded. Check your connection and try again."
  - DELA help: "Type a few words about the work first."; "DELA found no filters to suggest. Add a little more about the work, or use the filters above."; other errors from the shared helper error list.
- Help: match-ready panel: bold "Match-ready freelancers"; bullets "Completed their required profile information", "Passed the Lawfecta Team's member check", "Confirmed their availability within the last N days" (or "Confirmed their availability recently"); footnote "Match-ready does not guarantee qualifications, fit or availability for a particular project." Cost tooltip on the DELA label: "\"Suggest filters\" uses N DELA action(s). No DELA action is used if you connect your own AI key. Opening this and typing use nothing." or "\"Suggest filters\" runs on your own AI key, so it uses no DELA action."
- Variations: "My bench" pill by switch `bench`; Bookmarks pill and the two bookmark controls by the website's bookmark setting; DELA help by `ai_helpers`; cost label by own AI key.
- Mobile/accessibility: pills are a tablist; live status region for counts; filter button has aria-expanded; result cards are `article` with aria-label of the name; scroll position is restored when coming back from a profile.
- UX observations (mine):
  - Three ways to run a search sit close together: "Search freelancers", "Apply filters" and the filters auto-searching on change. "Apply filters" is redundant with auto-search.
  - Two clear actions with different words: "Clear filters" (button row) and "Clear all" (chip row), plus "Clear all suggestions" in DELA help.
  - Bookmarks are reachable three ways: the "Bookmarks" pill, the "Bookmarked only" checkbox and the "★ Your bookmarks" button.
  - The trust wording differs between places: "✓ Verified member" on cards, "✓ Verified" on the profile.
  - The time zone reads "<timezone> Time" on cards and "<timezone> time" on the profile; hours read "hrs/week" on cards and "hours a week" on the profile.

## Talent: Bookmarks (attorney; agency that hires)
- How to reach it: Talent, pill "Bookmarks". `bookmarksView()` line 7056.
- Purpose and primary focus: see the freelancers saved for later and open or invite one.
- Shown when: the website's bookmarks are on.
- Layout, top to bottom: heading "Talent", pills, intro "Freelancers you saved for later. They are not told. To add one, open a profile from Search and click \"☆ Bookmark\".", then the same result cards as Search under the heading "Bookmarks (N)" (no sort dropdown, no chips), then a card "Not available right now (N)" when some bookmarked people are not listed.
- Content: result cards as in Search. The "Not available right now (N)" card has the line "You bookmarked these freelancers, and they are not listed in Talent at the moment. They show above again when they are available." and one row per person with the name.
- Interactive elements: per card "View profile", "Invite to gig". In the not-available card, per row "Remove bookmark" (aria-label "Remove the bookmark for <name>"); no confirm step.
- States: "Loading your bookmarks..."; empty: "Nobody yet. Open a freelancer's profile from Search and click \"☆ Bookmark\"."; screen reader lines "N bookmark(s)" / "Your bookmarks could not be read."; errors show as a red notice. Up to 50 are loaded (no "Load more" in practice).
- UX observations (mine): there is no way to remove a bookmark from an available person's card here; the member has to open the profile. No reason is given for "not available".

## Talent: My bench (attorney)
- How to reach it: Talent, pill "My bench" (switch `bench`). Drawn by `benchView()` (outside range, line 10510). Not inventoried here.

## Freelancer profile page (attorney; agency that hires)
- How to reach it: "View profile" on a Talent card, from Home, or from an introduction conversation; address `?tab=talent&person=<id>`. `talentProfilePage()` line 7360. The browser Back button returns to the search.
- Purpose and primary focus: judge one freelancer, then "Invite to gig" (or message, book a call, bookmark).
- Shown when: Talent is open and the address names a person.
- Layout, top to bottom:
  1. Button "← Back to Talent search".
  2. Header card: photo or initial; name (h1); headline; a line with "✓ Verified" or "Not verified yet", the review line ("No reviews yet", "★ 4.8 (N reviews)" or "N review(s)"), and badge "Not taking new work right now" when not available; a facts line joined with " | ": "N hours a week", "<timezone> time", "Based in <state>", "Works with <agencies>" or "Works through <company>". Right side: bookmark button, "Send message", "Book a call", and below them "Invite to gig".
  3. Tab bar (aria-label "Sections of <name>'s profile"): "Overview", "Services", "Experience and qualifications", "Portfolio", "Reviews" or "Reviews (N)".
  4. The tab panel.
- Tab "Overview" (two columns on a wide screen):
  - Left: card "Professional summary" (or "<name> has not written a summary yet."); card "Primary services" (first 6 service titles; only if any); card "Software expertise" (chips; only if any); card "Practice areas and categories" (practice-area chips, then category chips grouped under each top category name; only if any).
  - Right: card "Quick facts" with rows "Availability" ("N hours a week", plus " (limited right now)"), "Usual hours", "Time zone", "Agency affiliation", "Reviews" (empty rows are left out); card "Verification" ("✓ Verified" or "Not verified yet", a sentence, and an expandable "What does verified mean?"); card "Current promotion" / "Current promotions" (up to 2 titles with " Through <date>", and button "See promotions" which jumps to the Services tab).
- Tab "Services": card "Services offered" with note "Prices are the member's own starting points. The price of a job is set in the proposal and the agreement."; each service: title, price ("$X to $Y", "From $X", "$X", with " an hour" when hourly, or "No price given"), and who it is for. Then card "Promotions" (only if any): note "Offers this member posted on Lawfecta. The price and scope of a job are confirmed in the proposal and the agreement."; each: title, text, "Code: <code>", "Ends <date>" or "No end date given".
- Tab "Experience and qualifications": card "Professional experience" (list); card "Education and credentials" (list, note "Written by the member. Lawfecta does not check each item."); card "Practice and technology experience" with sub-headings "Practice areas", "Skills", "Software" (chips). If none: card "Experience and qualifications" with "<name> has not added experience or qualifications yet."
- Tab "Portfolio": card "Work samples"; note "Samples the member chose to show. Members confirm they hold no client information. They open inside Lawfecta for a few minutes at a time."; each sample: name, type and size ("PDF, 1.2 MB"), button "Open sample".
- Tab "Reviews": card "Reviews from completed engagements"; the list itself is drawn by `reviewsList()` (outside range, line 10374).
- Interactive elements:
  - "← Back to Talent search".
  - Bookmark toggle "☆ Bookmark" / "★ Bookmarked" (aria-pressed; aria-labels "Bookmark <name>" / "Remove the bookmark for <name>"); disabled until bookmarks load; removed if bookmarks are off. (outside range, line 6907.)
  - "Send message" (attorney side only): opens or creates the introduction conversation in the Inbox.
  - "Book a call" (blue; attorney side with switch `meetings`): opens the introduction conversation with the booking panel already open.
  - "Invite to gig" (blue; when the member can hire): opens the invitation review step.
  - The five tabs: click; arrow keys, Home and End move between them.
  - "What does verified mean?" (expandable).
  - "See promotions".
  - "Open sample" (aria-label "Open the sample <name>"): opens in a new browser tab.
- States: "Loading the profile..."; "This profile could not be opened. The member may have closed their freelancer profile."; Portfolio: "Work samples are shown to members who hire.", "<name> has not shown any work samples yet.", "Opening...", "This sample is no longer shown."; Services: "<name> has not listed services yet."; Reviews: "Loading...", "No reviews yet. A review can only be left after a completed Lawfecta engagement, so a new member starts with none."
  - Message/call errors (toasts): "Conversations before a gig are not open yet."; "Only attorneys can start a conversation from Talent."; "Your account is on hold. Contact the Lawfecta Team from Help."; "Verify your bar license first. Open Profile to finish it; it is needed before you contact a freelancer or post a gig."; "This freelancer is not taking new conversations right now."; "This freelancer could not be found."; "You have started N new conversations in the last day, which is the limit. Try again tomorrow, or write in one you already have."
- Help: Verification card text: "The Lawfecta Team checked this member. Experience, education and skills are written by the member and are not checked one by one." or "This member's check is not finished. Experience, education and skills are written by the member."; inside the expander: the shared glossary text for "verified", then "Verified does not mean Lawfecta checked a license, a certificate or each job listed, and it does not promise the member fits your project."
- Variations: "Send message" and "Book a call" check `me.side === "attorney"`, while "Invite to gig" and the bookmark check `canHire()` (attorney or agency that hires). So an agency that hires sees Invite and Bookmark but no message or call button.
- Mobile/accessibility: full W3C tabs pattern; the panel is focusable; photos have alt "Photo of <name>".
- UX observations (mine): four actions in the header ("☆ Bookmark", "Send message", "Book a call", "Invite to gig") with two of them blue. Promotions appear in two places (Overview right column and under Services) and there is no "Promotions" tab, so "See promotions" lands on "Services". Software chips repeat on Overview and on Experience.

---

## Work (freelancer)
- How to reach it: menu item "Work", `?tab=work`. `workView()` line 7597.
- Purpose and primary focus: see invitations, matched gigs and proposals, and open a gig to send a proposal.
- Shown when: side freelancer. Engagements list needs switch `engagements`.
- Layout, top to bottom:
  1. Heading "Work".
  2. Notice (only when not match-ready): "You are not match-ready yet, so attorneys cannot find you. Finish your Profile and confirm your availability."
  3. Green notice with the proposal allowance and a help tip.
  4. "Your engagements" list (switch `engagements`; drawn outside range).
  5. Standing card (outside range, line 6703).
  6. Card "Invitations (N)".
  7. Card "Matches (N)".
  8. Card "Open gigs (N)" (only when there are any).
  9. Card "Drafts (N)".
  10. Card "Sent proposals (N)".
  11. Bench card for freelancers (outside range, line 10556).
- Content and data shown: allowance text is "No monthly cap on proposals on your plan (spam limits still apply)." or "N of M proposals left this month. Resets <date>. Invited proposals do not count." Each gig row: title; budget ("$X" or "$X to $Y") plus " | due <date>" and " | closes <date>"; "Why it fits: reason | reason"; "Invitation: <the attorney's note>"; a proposal status badge.
  - Proposal status words (outside range, line 4942): "Draft", "Sent", "Being checked", "Withdrawn", "Chosen", "Not chosen", "Closed". When the attorney changed the scope the badge adds ": please confirm" and turns amber.
- Interactive elements: each gig row is clickable (role button) and opens the gig page. Button "Open my profile and availability" (only in an empty Matches card). Help tip "What is the proposal allowance?".
- States: "Loading..."; "Flex Gigs are not open for your account yet."; empty texts: "No invitations right now."; "No matches right now. Keep your availability confirmed and your profile up to date."; "No saved drafts."; "Nothing sent yet."
- Help: tip text (shared, D.HELP.proposal_allowance): "How many proposals you can send this month on your plan. It resets on the 1st. Proposals to gigs you were invited to do not count."
- Mobile/accessibility: rows have role button and tabindex, but this code adds only a click handler here (no Enter/Space handler visible in this range).
- UX observations (mine): five to seven stacked cards with counts and no tabs or filters; empty cards still take space. The row has no visible "Open" button or arrow, only a pointer cursor.

## Gig page for a freelancer (freelancer)
- How to reach it: click a gig row on Work (or a deep link). `workGig()` line 7636.
- Purpose and primary focus: read the gig and send a proposal (or, once hired, reach the engagement).
- Layout, top to bottom:
  1. Button "← Work".
  2. Gig title with a status badge. Gig status words (outside range, line 4941): "Draft", "Open", "Paused by the Lawfecta Team", "Closed", "Filled", "Canceled".
  3. "Posted by <firm> (agency)." line.
  4. Button "Reviews of this attorney" / "Reviews of this agency" (switch `reviews`).
  5. Green invitation notice (when invited): "You are invited to send a proposal. An invited proposal does not use your monthly allowance." plus " The attorney wrote: <note>", with a "Decline" button.
  6. Engagement panel (when chosen or hired, switch `engagements`; outside range).
  7. Card with the public gig description (outside range, line 4999).
  8. Client card headed "Who posted this gig" or "Who you are working with" (outside range, line 3007).
  9. Button row: "Message the attorney" / "Message the agency" (switch `gig_chat`), "Your meetings" (switch `meetings`). Shown to invited, applicant or hired freelancers.
  10. Card "Milestones": numbered list of titles; note "DELA finalizes the milestones with the agreement. You review and sign before any work starts."
  11. Card "The work handed to you" (watermarked; when a playbook is shared).
  12. References block (outside range).
  13. Card "Files for this gig": note "Read only, for this gig only. Each file is open to you until the date shown or until the job is complete. Downloads are logged and shown to the attorney."; each file: name, " | until <date>", button "Open".
  14. Card "Questions": note "Answers are shown to every applicant. Keep everything on Lawfecta: no contact details or payment outside it."; each "Q: ..." with "A: ..." or "Being checked by the Lawfecta Team." or "Waiting for an answer."; a text box and "Ask the attorney" (only while the gig is open).
  15. Card "Your proposal" (see next section). Hidden when hired without a proposal of their own.
- Interactive elements: "← Work"; "Reviews of this attorney/agency"; "Decline" (POP-UP: "Decline this invitation?"; toast "Declined"); "Message the attorney/agency"; "Your meetings"; file "Open" (new tab); question text box (aria-label "Your question", 2 rows, no placeholder); "Ask the attorney" (toast "Question sent", or the hold note).
- States: "This gig is not available to you."; errors as a red notice.
- UX observations (mine): a long single column with up to 12 blocks; the proposal form, the main action, sits last. The question box has no visible label. "Your meetings" goes to the whole meetings list, not to this gig's meetings.

## Your proposal: form and sent state (freelancer)
- How to reach it: bottom card of the gig page. `proposalCard()` line 7685.
- Purpose and primary focus: write and send one proposal for this gig.
- Sent state (proposal exists and is not a draft): status badge, price, and notes " | sent for your agency", " | used one of your proposals" / " | used one of the agency's proposals" / " | invited, did not use your allowance"; line "Includes: ..."; when held: "DELA is holding your proposal for a quick check by the Lawfecta Team, because it may plan contact or payment outside Lawfecta."
  - Buttons: "Confirm my proposal still stands" (blue; when the attorney changed the scope; toast "Confirmed. The attorney can choose it now."); "Withdraw" (POP-UP: "Withdraw your proposal? A withdrawn proposal does not give your monthly allowance back."; toast "Withdrawn").
- Closed gig: "This gig is not taking proposals."
- Form, top to bottom:
  - Small line: "You were invited, so this proposal does not use your allowance. " or the allowance text, then "Milestones are set after hiring. Keep everything on Lawfecta."
  - Agency box (only for a freelancer on an agency team): dropdown "Send as": "<Agency name> (agency)" for each agency, plus "Myself" when solo proposals are allowed. Then "Who will do this work (required). The attorney sees each person you pick, with their profile and reviews."; one row per team member: checkbox with "<name> (owner / manager / member)" and a text box with placeholder "Role on this job, for example Lead paralegal" (max 80 characters, disabled until ticked); line "Uses the agency's shared allowance. <allowance text>". Messages: "Nobody on your team has finished their own verification yet."; "Your agency already sent a proposal for this gig."
  - "Total price ($)" number box (min 0, step 1) and "Days to deliver" number box (1 to 365), side by side.
  - "What your price includes" (text area, 3 rows).
  - "What it leaves out" (text area, 2 rows). Hint: "Say it plainly, so the attorney compares complete proposals."
  - "Schedule" (one line). Placeholder "For example: draft in 3 days, final 2 days after comments".
  - "Your relevant qualifications" (text area, 4 rows). Hint: "From your profile. DELA never invents qualifications." Beside it the button "✦ Let DELA help with qualifications" (fills qualifications, and "includes" if empty; toast "DELA drafted this from your profile. Check it before sending.").
  - "Note to the attorney (optional)" (text area, 2 rows).
  - Button "✦ Check my proposal" (shared helper button, outside range, line 5708).
  - Buttons: "Save draft" (toast "Draft saved. It is not sent.") and "Send proposal (uses 1)" or "Send proposal (free: invited)" (blue).
- States: on send, if it looks like client information, POP-UP: "This may include client information (...). Click OK only if it is not." Toasts: "Proposal sent" plus the remaining allowance, or the hold note. Agency without people ticked: toast "Choose at least one person in \"Who will do this work\"." No length limits or required marks are set in this code; the server decides.
- UX observations (mine): seven fields with no required marks and no inline validation. The button label "Send proposal (uses 1)" does not say one of what. The agency version still says "(uses 1)". Field label "Note to the attorney (optional)" differs from its aria-label "A short note to the attorney (optional)".

## Card: What DELA has learned about you (both)
- How to reach it: a card placed on another page (the caller is outside this range). `insightsCard()` line 7783.
- Purpose: review and remove facts DELA keeps about how the member works.
- Layout: heading "What DELA has learned about you"; note "DELA notes useful facts about how you work from what you send on gigs, to help you better. It never keeps sensitive data. Removing a fact means DELA stops using it in its answers from now on; it does not change anything you already sent."; one row per fact: the fact, "Learned from <source>, <date>." and a "Remove" button.
- Source wording: "an invitation you sent", "a proposal you sent", "a question you asked on a gig", "an answer you gave on a gig", "a message you sent on a gig", fallback "what you sent on a gig".
- Interactive elements: "Remove" per row (aria-label "Remove: <fact>"; no confirm; toast "Removed").
- States: "Loading..."; "This is not open for your account yet."; "Nothing yet."; on a load failure the card goes blank.

---

## Inbox: conversation list (both)
- How to reach it: "Inbox" button in the top bar, `?tab=inbox`. `inboxView()` line 7888.
- Purpose and primary focus: find a conversation and open it.
- Shown when: messages are on for the account (otherwise "Messages are not open for your account yet."). The "Bench" filter shows only when the member has a bench conversation.
- Layout, top to bottom:
  1. Row: heading "Inbox" and the link "Privacy and secure sharing" with an "i".
  2. The privacy notice (opens in place under the heading).
  3. Intro: "Conversations about gigs, introductions and project work. Keep all work, contact and payment on Lawfecta."
  4. Search box, label "Search conversations".
  5. Row: filter pills (tablist "Conversations to show") on the left, "Sort " dropdown on the right.
  6. Two columns on screens 1000px and wider: left card "Conversations" with "N total", the list and a footer; right card "Quick preview". Under 1000px the preview card is hidden.
- Content and data shown (list row): unread dot; face (photo or initial); name (bold when unread); time (today: the time; yesterday: "Yesterday, <time>"; else the date and time); a kind tag "Gig", "Introduction" or "Bench"; the title (the gig title, or for an attorney's introduction "Your introduction to <name>"); a preview ("You: " prefix for the member's own message, or "No messages yet · Conversation started <when>"); an unread count; a "›" chevron.
- Quick preview card: heading "Quick preview" with "Selected conversation"; face, name, kind tag and title; a box "Conversation context" with "An introduction, before any gig", "Your ongoing bench conversation" or the gig title, and "Newest message <when>." or "No messages yet. The conversation started <when>."; buttons; "Recent messages" with bubbles and a line "You · <when>" or "<name> · <when>", plus " · in a thread" and " · being checked", and file counts " (N file(s))"; "The newest N of M messages."; the notice "For private client materials, add a secure link on the job. Never put sensitive data in a message."
- Interactive elements:
  - "Privacy and secure sharing": opens the blue notice in place; the notice has a "×" (aria-label "Close the privacy notice"). Notice text comes from the account, default "Never enter sensitive data in DELA. Keep it in your own storage and add a secure link to the job."
  - Search box: placeholder "Search people, gig titles and message text". Filters as the member types (150 ms delay); Escape clears it. Matches names, gig titles, the newest message and the kind word.
  - Filter pills, each with a count: "All (N)", "Unread (N)", "Gigs (N)", "Introductions (N)", "Bench (N)".
  - "Sort " dropdown: "Most recent", "Oldest first", "Name, A to Z".
  - A list row: on a wide screen the first click selects it and shows the preview; a second click or a double click opens the conversation. On a narrow screen one click opens it.
  - "Show more conversations" (20 at a time), with "Showing X of N conversation(s)."
  - In the preview: "Open conversation →" (blue), "View gig" (gig conversations only; goes to Projects for attorneys, Work for freelancers).
- States: "Loading..."; no conversations at all: attorney "No conversations yet. Invite a freelancer to a gig, or message someone who sent a proposal."; freelancer "No conversations yet. They start when an attorney invites you or when you send a proposal."; filtered empty: "No conversation matches \"<words>\". Try fewer words, or choose \"All\"."; "Nothing unread. You are up to date."; "No conversations here yet."; preview: "Choose a conversation to see its newest messages here.", "Loading...", "No messages yet.", "The messages could not be loaded. Open the conversation to read them."
- Mobile/accessibility: rows are buttons with a full aria-label (unread count, name, kind, title, preview, time, and "Shows a preview; choose it again to open the conversation."); live region announces "N conversation(s)"; the selected row has aria-current.
- UX observations (mine): the two-click pattern on wide screens (select, then open) is unusual; the preview's "Open conversation →" duplicates it. The search and filter state persist between visits; the search box and filters do not show at all when there are zero conversations. "N total" counts the filtered rows, so the word "total" can mislead.

## Inbox: a conversation (both)
- How to reach it: open a row in the Inbox, "Send message" on a profile, "Message the attorney" on a gig, or `?tab=inbox&thread=<id>`. `threadView()` line 8017.
- Purpose and primary focus: read the messages and send one.
- Layout, top to bottom:
  1. Row: "← Inbox" on the left, "Privacy and secure sharing" on the right (same notice as the Inbox).
  2. Header card: face, firm logo (when the other side is a client with one), the person's name (h1), for freelancers a line "✓ Verified" plus " · Attorney at <firm>" or " · Agency at <firm>", and what it is about: "Introduction, before any gig", "Bench conversation: <title>" or "Gig: <title>". Action buttons on the right.
  3. A grey explainer line (differs by kind, see States).
  4. Green notice when an introductory call is booked: "An introductory call is booked for <day, date, time, zone, (N minutes)>, <zone>. " with the link "Open the meeting".
  5. Booking panel (appears here when "Book a call" or "Book a meeting" is clicked; see the booking section).
  6. Messages card (aria-label "Messages"): date dividers ("November 17, 2026"), bubbles (the member's own on the right), a line under each: "You · <time>" or "<name> · <time>", plus " · edited" and, on the member's newest message, " · ✓ Seen <when>".
  7. Thread side panel "Thread" (opens beside the messages on a wide screen, in place of them on a narrow one).
  8. Composer card: label "Message", the text box, the rule line, draft warning, error line, attachment chips, then a row with "Attach a file" menu, "✦ AI tools" menu and "Send"; under it the attachment picker and the AI suggestion panel.
- Interactive elements:
  - "← Inbox".
  - Header actions: "View profile" and "Create a gig for <name>" (attorney in an introduction); "Open the gig" (gig conversations); "Book a call" (blue; attorney in an introduction, switch `meetings`, none booked yet); "Book a meeting" (blue; gig conversations, switch `meetings`); menu "More ▾" with "Report this conversation" (POP-UP text prompt: "What is wrong? The Lawfecta Team reads every report."; toast "Reported to the Lawfecta Team") and "Block this conversation" / "Unblock" (POP-UP on block: "Block this conversation? New messages and meetings stop, and upcoming meetings are canceled. The Lawfecta Team is told."; toasts "Blocked" / "Unblocked"). The block item is hidden when the other person did the blocking.
  - "Open the meeting" (link in the booked-call notice).
  - Per message: "Open <file name>" for each attachment (new tab); "↪ Reply in thread · N reply/replies" (opens the Thread panel); menu "⋯" on the member's own message for the first minutes (aria-label "Edit or remove what you sent at <time>") with "Edit message" (POP-UP text prompt: "Edit your message (the earlier text is kept for the Lawfecta Team):"; toast "Edited") and "Remove message" (POP-UP: "Remove this message? The other person sees \"Message removed\"."), and the note "Shown only within N minutes of sending."
  - Thread panel: "← Back to the conversation"; "×" (aria-label "Close the thread"); the original message under "Original message · <who> · <when>"; replies; text box labeled "Reply in thread" with placeholder "Write a reply..."; "Send reply →" (blue; toast "Reply sent in the thread.").
  - Composer text box: label "Message", placeholder "Write your message...", 3 rows, no length limit in this code. The draft is saved when the box loses focus.
  - Menu "Attach a file ▾" (not shown in introduction or bench conversations): "Upload a new file" (attorney with switch `file_uploads`) and "Choose from Lawfecta Files" (attorney) or "Choose from your profile documents" (freelancer).
    - Choose: a box headed the same words, a checkbox per ready file with its name and "(version N, added <date and time>)", and "Done".
    - Upload: the browser's file chooser, then a box "Upload \"<file name>\"" with the checkbox "This file has no sensitive data (SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords).", "Upload and attach" (disabled until ticked) and "Cancel".
    - Chosen files show as chips with "×" (aria-label "Remove attachment: <name>").
  - Menu "✦ AI tools ▾" (switch `chat_assistant`): "Draft a reply", "Suggest next steps", "Summarize conversation". Working lines: "Drafting your reply...", "Working out the next steps...", "Summarizing the conversation...". Result headings: "✦ Suggested draft", "✦ Suggested next steps", "✦ Summary of this conversation", with the shared AI label. Draft: note "A suggestion, not sent. Check it before you send it." and buttons "Use suggestion" (toast "Added to your message. Nothing is sent until you click Send."), "Edit" (puts it in the box and selects it), "Dismiss". Others: note "For reading only. It does not change the gig, a proposal or an agreement." and "Dismiss". On error: the reason, "Try again", "Dismiss".
  - "Send" (blue).
- States:
  - "This conversation is not available to you."
  - Explainer lines: introduction, attorney: "A conversation before any gig. Messages and an introductory call only: files come with a gig. Nobody is hired here. Keep all work, contact and payment on Lawfecta."; introduction, freelancer: "An attorney wrote to you before posting a gig. Messages and an introductory call only; nobody is hired here. Keep all work, contact and payment on Lawfecta."; bench: "<title>: your ongoing bench conversation. It shares no files and is not a contract; new work goes through a gig. Keep all work, contact and payment on Lawfecta."; gig: "About the gig \"<title>\". Keep all work, contact and payment on Lawfecta."
  - Empty: "No messages yet. Say hello and ask what you need to know." Thread empty: bold "No replies yet", "Reply to this specific message without interrupting the main conversation."
  - Removed message: a grey pill "⊘ Message removed · <time>" plus "Removed by the Lawfecta Team: it looked like a plan to work or pay outside Lawfecta.", "You removed this message." or "The sender removed this message."
  - On a bubble: "Being checked by the Lawfecta Team. The other person does not see it yet."; "Sent with a reminder: keep all work, contact and payment on Lawfecta."
  - Rule line under the box: "No sensitive data, contact details or payment outside Lawfecta." (switch `client_details_allowed` on) or "No client information, contact details or payment outside Lawfecta."
  - Draft warnings: "Before you send: this draft looks like it has sensitive data (...). DELA will not send it. Take that part out."; "Before you send: this draft looks like it plans contact or payment outside Lawfecta. A message like this is held for the Lawfecta Team to check. Keep everything on Lawfecta."; "Before you send: this draft may include client information (...). DELA will ask you to confirm when you click Send."
  - On send: sensitive data is refused with a red line that stays under the box; client information triggers a POP-UP: "This may include client information (...). Click OK only if it is not."; held or warned messages show the server's note as a toast.
  - Closed conversation (no composer), one of: "This conversation is blocked."; "This conversation closed 30 days after the gig closed."; "This bench conversation is closed, because the freelancer is no longer on the bench."; "This engagement is complete, so its conversation is read only. Use your bench conversation to keep in touch."; fallback "This conversation is closed." Thread on a removed message: "This message was removed, so it takes no new replies."
  - Other error toasts (TALK_ERR, line 7813): "A bench conversation does not share files. Share files on a gig."; "You are sending messages very fast. Wait a moment."; "A message can be edited or removed for 15 minutes after it is sent."; "That message is no longer there, so the reply was not sent."; "That edit looks like contact details or payment outside Lawfecta. Send it as a new message instead, so DELA can check it."; "DELA's help in messages is not open for your account yet."; "There are no messages yet."
  - Attachments: "Loading your files..."; "No ready files yet. Choose \"Upload a new file\", or upload on the Files page."; "No ready profile documents. Add one on your Profile first."; "Uploading <name>..."; "The file was not uploaded. Check your connection and try again."; "\"<name>\" is in your Lawfecta Files and is being checked. In a moment, choose it with \"Choose from Lawfecta Files\"."; toast "Attached. It is also saved in your Files."
- Variations: by kind (introduction, bench, gig) for the header actions, explainer and attachments; by side for the header (freelancers see the client's name, verified mark and firm) and for the attachment sources; by switches `meetings`, `chat_assistant`, `file_uploads`, `client_details_allowed`.
- Mobile/accessibility: menus are `details` elements that close on Escape and return focus; the Thread panel replaces the conversation on a narrow screen with "← Back to the conversation"; message lists use aria-live for replies.
- UX observations (mine): Edit, Report and Cancel-style inputs use the browser's plain prompt pop-up, which is hard to style and cannot hold a long edit comfortably. The header can hold up to five buttons plus "More". There is no Enter-to-send or character count. "Book a call" and "Book a meeting" insert a panel high in the page, away from the button. No "Send" disabled state for an empty box (the click is ignored silently).

---

## Booking panel: Book a meeting / Book an introductory call / Choose a new time (both; first booking is attorney only)
- How to reach it: "Book a call" or "Book a meeting" in a conversation; "Change the time" on a meeting card. `bookPanel()` line 8343. It is a card inserted into the current page (fourth block from the top), not a separate page.
- Purpose and primary focus: pick a length, a date and a time, then confirm.
- Shown when: switch `meetings`; the conversation is writable.
- Layout, top to bottom: heading "Book a meeting", "Book an introductory call" or "Choose a new time"; for a new introductory call the notice "An introductory call is a first conversation. It hires nobody, costs nothing and creates no gig. Keep all work, contact and payment on Lawfecta."; the line "Times are shown in your time zone (<zone>). Meetings are free and happen in a Lawfecta meeting room. The freelancer's time zone: <zone>." (freelancer sees "Your availability is set in <zone>."); dropdown "Length"; dropdown "Date"; the chosen day in bold with " | N minutes | times in <zone>"; time buttons; a summary box.
- Interactive elements:
  - Dropdown "Length": "N minutes" for each length the freelancer offers (the allowed set defaults to 15, 30, 45). Changing it reloads the times.
  - Dropdown "Date": each day as "Mon, Nov 23 (N open time(s))".
  - Time buttons (toggle, at least 96 by 44 px; aria-label "<time>, <full date>"): 8 at first, then "Show more times (N)".
  - Summary: "Selected: <day, date, time, zone (N minutes)>, <zone>" with the button "Review booking" or "Review the new time" (blue).
  - Clicking it holds the time, then a POP-UP: "Book <when>? Both of you get one confirmation with a calendar file." / "Book an introductory call on <when>? ..." / "Move the meeting to <when>? ...". Cancel releases the hold. OK confirms and opens the meeting's page with toast "Booked. A confirmation is on its way to both of you." or "Moved. One update went to both of you."
- States: "Loading open times..."; "Set your availability for meetings on your Profile first." (freelancer); "This freelancer has not set their availability for meetings yet. Send them a message." (attorney); "No open times in the next <N days> for this length."; errors: "Booking is not open for your account yet."; "Someone just took that time. Choose another."; "That is the meeting's current time. Choose a different time."; "The time was held for 10 minutes and ran out. Choose a time again."; "Calls before a gig are not open right now."; "An introductory call with this freelancer is already booked. Open Your meetings to change or cancel it."; "You have booked the most introductory calls allowed in one day. Try again tomorrow."; "Only the attorney can book the first call. You can change its time once it is booked."; "This freelancer is not available for meetings right now."
- UX observations (mine): the button says "Review booking" but the review is a plain browser pop-up, not a review screen. There is no close or cancel control on the panel itself. The time zone is stated three times in one small card.

## Meetings: list (both)
- How to reach it: menu item "Meetings" (switch `meetings`), `?tab=meetings`. `meetingsView()` line 8526.
- Purpose and primary focus: see what is scheduled and join at the right time.
- Layout, top to bottom: row with heading "Your meetings" and an "Inbox" button; the line "Times are in your time zone (<zone>). \"Join the meeting\" appears on a meeting N minutes before it starts."; heading "Scheduled (N)" with meeting cards; heading "Just ended (N)" with cards (meetings still waiting for a "did it happen" answer, or ended within the confirm window); an expandable "Past and canceled (N)" with cards.
- Interactive elements: "Inbox" (goes to the Inbox); in the empty card: "Find a freelancer in Talent" (blue; attorney, unless switch `talent_search` is off) or "Open my Profile" (freelancer, switch `profiles`); the "Past and canceled (N)" expander; everything on each meeting card (next section).
- States: "Loading..."; "Booking is not open for your account yet."; empty card: bold "Nothing scheduled yet." with, for attorneys, "Book an introductory call from a freelancer's profile in Talent, or a meeting from a gig's conversation." and for freelancers "Attorneys book meetings and introductory calls with you from your open times. Set them on your Profile, in the card \"Your availability for meetings\"."
- UX observations (mine): the page heading is "Your meetings" while the menu says "Meetings". The "Inbox" button in the heading row duplicates the top bar. There is no "Book a meeting" action on this page; booking always starts somewhere else.

## Meetings: one meeting's page and the meeting card (both)
- How to reach it: after booking, from "Open the meeting" links, or `?tab=meetings&meeting=<id>`; heading "Meeting" with the button "← All meetings". The same card is used in the list. `meetingCard()` line 8568.
- Purpose and primary focus: join the meeting; before it, change or cancel; after it, say whether it happened.
- Layout of a card, top to bottom:
  1. Tinted heading band: face, "<other person>: <gig title>", status badge.
  2. When: "<weekday, month day, year>, <time> <zone name> (N minutes)" plus " | new time" if it was moved.
  3. Before the start (status confirmed): "Join the meeting" (blue) or a room line; the transcription consent checkbox; the row "Add to my calendar (.ics)", "Change the time", "Cancel".
  4. After the start: "Join the meeting" stays while a join link exists.
  5. Box "Transcript": "Summary by DELA's AI" with its lines; "Next steps" list; the note "Text only: no video or audio was kept. Both of you can read it. It is deleted on <date>."; "Read the transcript" / "Hide the transcript" and "Delete transcript".
  6. Link "Report this meeting".
  7. Introductory call only: "An introductory call before any gig. Nobody is hired by it." with "Open the conversation" and, for the attorney, "Create a gig for <name>".
  8. After the start: "Attendance: <word>." then the follow-up box, or "You said: we met / they did not come" with ". The other person answered too." or ". Waiting for the other person."
  9. Box "DELA suggests": a list "Attorney: ..." / "Freelancer: ..." and "Suggestions only. Nothing changes until one of you changes it."
  10. Canceled: "Reason: <reason>" plus " (late)".
- Status words (MEET_STATUS, line 7811): "Held, not confirmed" (amber), "Time confirmed" (green), "Done" (green), "Canceled" (grey), "Moved" (plain), "Did not happen" (grey).
- Attendance words (ATTEND, line 7812): "Not confirmed yet", "One person confirmed", "Both confirmed: you met", "You disagree on whether it happened".
- Interactive elements:
  - "← All meetings".
  - "Join the meeting" (blue): opens the meeting room over the page (older rooms open a link in a new tab). While opening: "Opening the room...".
  - Consent checkbox: "Transcribe this meeting (no video or audio is kept). DELA's AI reads the transcript to write a summary and next steps, and to check for payment talk outside Lawfecta. Nothing is transcribed unless both of you tick this." plus " You both agreed." Saves on change; toasts "Saved. Nothing is recorded unless you both agree." / "Saved".
  - "Add to my calendar (.ics)": downloads a calendar file.
  - "Change the time": opens the booking panel as "Choose a new time".
  - "Cancel" (red): POP-UP text prompt "Why are you canceling? Both of you are told. Less than N hours before counts as a late cancel."; toasts "Canceled" / "Canceled (late)".
  - "Read the transcript" / "Hide the transcript": shows the text in a scrolling box (max height 320px).
  - "Delete transcript" (red): POP-UP "Delete this transcript for both of you? The summary and next steps stay. This cannot be undone."; toast "Transcript deleted for both of you".
  - "Report this meeting" (link): POP-UP text prompt "Tell the Lawfecta Team what happened in or around this meeting. They read your report and may read the meeting's transcript. The other person is not told who reported."; toasts "Write what happened first.", "Reported. The Lawfecta Team will look at it.", "You already reported this meeting. The Lawfecta Team has it."
  - "Open the conversation"; "Create a gig for <name>" (attorney, when confirmed or done).
  - Follow-up box: line "Did the meeting happen? Tell DELA within N hours. DELA suggests next steps from both summaries."; dropdown (aria-label "Did the meeting happen?"): "Choose what happened", "We met", "They did not come"; text area (aria-label "Short summary", placeholder "What you agreed, next steps, any change to the work or price. No client information.", 3 rows); "Send" (blue). Toasts: "Choose what happened first."; "Thank you. You both answered." / "Thank you. Waiting for the other person."; "This may include client information. Use placeholders instead."
- States (room lines before the start): "Your meeting room is being set up. This takes about a minute. \"Join the meeting\" appears here shortly before the meeting starts."; "Your meeting room could not be set up yet. DELA keeps trying and the Lawfecta Team has been told. \"Join the meeting\" appears here once the room is ready."; "Meeting room not connected yet. The link appears here once Lawfecta's meeting service is connected, and you both get it before the meeting."; "The room opens at <time> on <day>."
  - Transcript: "Loading..."; "The transcript is no longer kept."; "The transcript text was deleted on <date>. The summary and next steps stay with the meeting."; "Nothing was said that could be written down, so there is no transcript."; "The transcript is being prepared. It shows here a few minutes after the meeting."
  - Single meeting page: "This meeting is no longer listed."
  - Other: "You can confirm the meeting once it has started."
- Variations: introductory call versus gig meeting (extra block 7); attorney versus freelancer ("Create a gig for <name>" is attorney only; "Change the time" is open to both); by status and by whether the start time has passed.
- UX observations (mine):
  - Possible defect to check: the "Cancel" button builds its prompt from `r.rules` (line 8601), and `r` is not defined inside `meetingCard()`. If no outer `r` exists, clicking "Cancel" would fail before the prompt shows. I did not run it; this is from reading the code only.
  - The consent sentence on the card is very long for a checkbox label, and the toast says "recorded" while the label says "transcribed".
  - Three plain browser prompts (cancel reason, report, and the booking confirm) on one page.
  - "Cancel" here means cancel the meeting; the same word is used for dismissing a panel elsewhere.
  - The follow-up "Send" button has a generic label.

## Meeting room and "Before you join" consent step (both)
- How to reach it: "Join the meeting" on a meeting card. `openMeetingRoom()` line 8427. A full-window dark layer over the page (dialog, aria-label "Meeting room: <name>, <title>").
- Purpose and primary focus: hold the video meeting without leaving DELA.
- Layout: top bar with "Lawfecta meeting: <other person> | <title>", "Keep all work, contact and payment on Lawfecta.", "To share links or files, use your DELA messages.", a status pill, and buttons; below it the room.
- Step 1, only when transcription is offered: white panel "Before you join" with the checkbox "Transcribe this meeting (no video or audio is kept)", the sentence "DELA's AI reads the transcript to write a summary and next steps, and to check for payment talk outside Lawfecta.", the paragraph "The meeting is transcribed only when both of you tick this box. If either of you leaves it unticked, nothing is transcribed. Either of you can press \"Stop transcript\" at any time. The transcript is deleted N days after the meeting; the summary and next steps stay with the meeting." and the button "Continue to the camera and microphone check".
- Step 2: the ready-made video screen (VideoSDK) with its own join screen titled "Lawfecta meeting"; camera, microphone and screen sharing are on; in-call chat, whiteboard, polls, raise hand and recording are off. Its leave screen has a button "Back to DELA".
- Interactive elements: the consent checkbox; "Continue to the camera and microphone check"; "Stop transcript" (shows only while a transcript runs); "Leave and go back to DELA".
- States: status pill "This meeting is being transcribed" (green) / "This meeting is not being transcribed"; "Loading the meeting room..."; "Your choice could not be saved. Try again."; "Your choice could not be saved. Check your connection and try again."; toasts "The room is not open right now. It opens shortly before the meeting and closes 30 minutes after it."; "The meeting room could not start. Reload the page and try again."; "The meeting room could not be loaded. Check your connection and try again."
- Mobile/accessibility: aria-modal dialog; focus goes to the checkbox or the leave button; buttons are at least 44px tall. Colours and fonts here are hard-coded inline (dark navy #0f1320 and #192031, maroon #8b2146), outside the shared stylesheet.
- UX observations (mine): this screen does not use the app's design tokens, so a restyle must touch it separately. The video area's look is controlled by the third-party screen (theme "LIGHT") inside a dark frame.

---

## Card: Your availability for meetings (freelancer; sits on the Profile page)
- How to reach it: Profile page (the placement is outside this range). `meetingAvailabilityCard()` line 8682.
- Purpose and primary focus: set the weekly hours attorneys can book.
- Layout, top to bottom: heading "Your availability for meetings"; note "Attorneys book meetings with you inside a gig, or one introductory call before a gig, from these times, with N hours of notice and N minutes between meetings. Meetings are free. Times are in your time zone."; the fields; "Save availability".
- Interactive elements:
  - Dropdown "Time zone": "New York (America/New_York)", "Chicago (America/Chicago)", "Denver (America/Denver)", "Phoenix (America/Phoenix)", "Los Angeles (America/Los_Angeles)", "Anchorage (America/Anchorage)", "Honolulu (Pacific/Honolulu)", plus the saved zone and the browser's zone if they are not in the list.
  - "Meeting lengths you offer": checkboxes "15 minutes", "30 minutes", "45 minutes" (the allowed set comes from the server).
  - Seven day rows, "Monday" to "Sunday": a checkbox, a "from" time box and a "to" time box (defaults 09:00 and 17:00). One time range per day.
  - "Days off": text box, placeholder "For example 2026-11-26, 2026-12-24"; hint "Dates as YYYY-MM-DD, separated by commas. Or pick a date below and click Add."; a date picker and the button "Add day off".
  - "Save availability" (blue; toast "Availability saved").
  - Warning with link (when the profile's time zone differs): "Your profile says your time zone is <zone>, under \"How you work\". Meeting times use the one chosen here (<zone>). " and the link "Open my profile".
- States: "Loading..."; errors: "Choose your time zone."; "Choose at least one meeting length."; "Check the hours: each day needs a start before its end."; on a load failure the card goes blank.
- UX observations (mine): the hint says click "Add" but the button says "Add day off". Days off are typed as raw dates in a text box, with no chips or remove buttons. Only one block of hours per day is possible. Two separate time zone settings exist (this card and "How you work").

## Card: Messages (both; sits on the Settings page)
- `prefsCard()` line 8742. Heading "Messages"; one checkbox: "Show \"Seen\" when I read a message, and show me when others read mine. Turning it off turns it off both ways." Saves on change; toast "Saved". No loading or error text (the card stays empty under its heading if it fails).

## Card: Emails (both; sits on the Settings page)
- `emailsCard()` line 8755. Heading "Emails"; checkbox "Email me reminders and alerts, such as new gig alerts and next-step reminders."; note "Emails about your account, payments and signed work always arrive. They go to your sign-in email, shown under \"Account and security\" at the top of this page."; a status line: "Reminder and alert emails are on." or "Reminder and alert emails are off since <date>, turned off from the link in an email." (or ending "." without the link part).
- States: "Loading..."; toast "Saved"; toast "Not saved. Try again."; "This setting could not load. Reload the page to try again."

---

## Cross-page elements seen
- Pills as tabs (`.pills`, role tablist): Talent views, Inbox filters. A separate tab bar style (`.tp-tabs`) on the freelancer profile.
- Chips with "×" (`.cat-chip`): search filters in use, DELA's suggested filters, message attachments.
- Tags (`.talent-tag`): practice areas, skills, software.
- Badges (`.badge` with tones ready / held / off): gig status, proposal status, meeting status, "Not taking new work right now".
- Notices (`.notice`, `.notice ok`, `.notice bad`, `.notice info`) and the in-place "Privacy and secure sharing" link.
- Small dropdown menus built from `details` ("More", "Attach a file", "✦ AI tools", "⋯").
- Faces: photo or a round initial (`smallFace`, `talentAvatar`).
- DELA / AI controls marked with "✦" ("✦ Suggest filters", "✦ Let DELA help with qualifications", "✦ Check my proposal", "✦ AI tools"), each stating that nothing is sent or changed until the member acts.
- Browser pop-ups: OK/Cancel confirms (decline, withdraw, block, remove message, delete transcript, booking, client-information checks) and text prompts (report conversation, edit message, cancel meeting, report meeting).
- Toasts for results (`D.toast`), with errors in red.
- The repeated rule sentence "Keep all work, contact and payment on Lawfecta." and the sensitive-data reminder.
- Loading text "Loading..." and red error notices from `D.errorText`.
- "Verified" marks: "✓ Verified member" (cards), "✓ Verified" (profile, conversation header).
- Paging pattern: "Showing X of N ..." with "Load more freelancers" / "Show more conversations" / "Show more times (N)".
- Time zone shown in words next to every meeting time.
