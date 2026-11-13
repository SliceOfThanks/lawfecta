# ChatGPT test: the Talent journey after the mockup 02 revision (steps 18 to 22, 2026-11-13)

What it covers: categories on the freelancer profile and the line that says whether attorneys can see the freelancer in Talent; who posted a gig, as the freelancer sees it; the Talent search with five filters that work on their own, keywords in any order, the match-ready help, DELA's suggested filters, the result cards and "Load more freelancers"; the full profile page and the browser's Back button; the invitation review step; a conversation before a gig; "Create a gig for this freelancer"; the freelancers DELA suggests for a document; bookmarks; and the team's checks. Three logins (freelancer, attorney, owner), 26 steps. Every step opens its page by a link.

What changes on the site: the test freelancer picks two categories and saves the profile; the test attorney uses 1 DELA action for suggested filters, may bookmark the test freelancer and removes the bookmark again; one conversation with no message in it is opened between the two test accounts. Nothing is paid, signed or posted. No new invitation goes out: the test freelancer was already invited to both of the test attorney's open gigs, so the invitation step ends with "Already invited".

What is on the site (checked 2026-11-13):
- The test attorney (BD 687, "DELA Test Attorney", firm "Example Lantern Legal") is verified and has two posted gigs open for proposals: "Preparing a Small Claims Filing Packet" (closes 2026-11-19) and "Build document checklist from questionnaire answers" (closes 2026-11-20). Run this test before 2026-11-19, or tell Claude so the dates are checked again.
- The test freelancer (BD 688, "DELA Test Freelancer") is verified, match-ready, has no reviews, no categories yet, and a ready-made picture.
- Talent lists 16 freelancers: the test freelancer and fifteen sample freelancers. Their availability lapses on 2026-11-27; after that the counts in this test are wrong.
- The approved document "Open a Matter in Clio" is a Family law SOP that uses Clio.
- Not in this test: uploading a firm logo (an agent cannot choose a file from your computer), and booking a call before a gig (it would put a real meeting on both test calendars; Stacey checks it by hand).

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are checking the Talent pages of DELA on the Lawfecta site, www.lawfecta.co. Everything here uses test accounts. Do only what the steps say. Do not post a gig, do not pay, do not sign, do not type a message to anyone.

Logins (I log in for you each time):
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- owner (admin area): stacey@lawfecta.com

HOW TO WORK (read this first; it saves time and credits)
1. Do only the numbered steps below, in order. Do not explore, do not open other menus, and do not look for other features.
2. When a step says "Go to", type that link into the browser's address bar and press Enter. Do not get there by clicking around.
3. Every button, box and link is named in quotes, exactly as the screen writes it, with where it is. First scroll to the card heading the step names, then look for the item.
4. If you cannot see it after scrolling to that heading: press Ctrl+F (Cmd+F on a Mac), type the name without the quotes, press Enter, and use the highlighted match. If it is still not there, take one screenshot, write FAIL for that step with what you saw, and go on to the next step. Never try more than this one other way.
5. When a step says DELA is writing or checking, wait up to 60 seconds without clicking anything else.
6. What every DELA page looks like:
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Profile" and "Subscription" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Files", "Get set up", "Profile", "Subscription", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name on the left; on the right an "Inbox" button, a bell (Notices) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

## Part 1: test freelancer

Log in as the test freelancer: go to https://www.lawfecta.co/login and ask me to log in as the test freelancer.

1. Go to: https://www.lawfecta.co/dela?tab=profile
   Find: the first card on the page. Its heading starts "Match-ready:".
   Expect: under the progress bar a green-edged box that starts "Attorneys can see you in Talent now."

2. Find: further down, the heading "What you support" about halfway down the profile card, then the line "Lawfecta categories" under "Practice areas". If its box is closed, click the line "Lawfecta categories" to open it.
   Expect: the sentence "Attorneys search Talent by these categories.", a box labelled "Find a category", the words "Or browse" with two lists "Category" and "Specialty", and "Your categories" with "None picked yet."

3. Find: the box labelled "Find a category".
   Do: type family law discovery and wait for the list under the box. Click the line that says "Discovery Support" with the grey words "Paralegal Services › Family Law" after it.
   Expect: under "Your categories" a pink chip "Family Law › Discovery Support" with a small × on it, and the line now reads "Lawfecta categories (1 of 25 picked)".

4. Find: the lists "Category" and "Specialty" under "Or browse".
   Do: in "Category" choose "Paralegal Services". In "Specialty" choose "Family Law". A row of buttons appears; click the button "Clio".
   Expect: the "Clio" button turns dark red, a second chip "Family Law › Clio" shows under "Your categories", and the line reads "Lawfecta categories (2 of 25 picked)".

5. Find: the bottom of the same profile card. The dark red button there starts with the word "Save" (it reads "Save", "Save to DELA only" or "Save and update my directory listing"). It is NOT the button "Save availability" and NOT "Save my picture".
   Do: click that button.
   Expect: a small box at the bottom of the screen says "Profile saved".

6. Go to: https://www.lawfecta.co/dela?tab=work&gig=f44fb7f3-5760-42f2-ab23-1c35e8d56e4a
   Find: near the top of the gig "Build document checklist from questionnaire answers", under the first card, a card titled "Who posted this gig".
   Expect: in that card a round pink circle with the letter "D" or a picture, the name "DELA Test Attorney", "✓ Verified", the word "Attorney", and the firm name "Example Lantern Legal". No phone number or email address.

Sign out (rule 7).

## Part 2: test attorney

Log in as the test attorney: go to https://www.lawfecta.co/login and ask me to log in as the test attorney.

7. Go to: https://www.lawfecta.co/dela?tab=talent
   Find: the top of the page, above the first card.
   Expect: the sentence "Find verified legal professionals who are ready to take on new work.", an underlined control "What does match-ready mean?" with a small circled "i", and the sentence "You can message a freelancer and book an introductory call before hiring. A posted gig is required to invite a freelancer to submit a proposal."

8. Find: the control "What does match-ready mean?" at the top of the page.
   Do: click it once.
   Expect: a small panel titled "Match-ready freelancers" with three ticked lines, "Completed their required profile information", "Passed the Lawfecta Team's member check" and "Confirmed their availability within the last 14 days", and under them "Match-ready does not guarantee qualifications, fit or availability for a particular project."
   Do: press the Escape key.
   Expect: the panel closes.

9. Find: the card titled "Find a freelancer".
   Expect: a box labelled "Search roles, specialties, tasks and software"; under it five lists in a row, "Category", "Practice area / Specialty", "Services / Tasks", "Software" and "State / Jurisdiction"; two buttons, "Search freelancers" (dark red) and "Reset". None of the five lists is greyed out. Under the card a pink bar "✦ Find a freelancer with DELA". Under that the heading "16 freelancers found" and, on the same line at the right, "Sort by".

10. Find: the list "Software" in the "Find a freelancer" card. Leave the other lists alone.
    Do: choose "Clio".
    Expect: the heading changes to "9 freelancers found" and a pink chip "Software: Clio" with an × shows next to it, with the words "Clear all".
    Do: click "Reset" (next to "Search freelancers").
    Expect: "16 freelancers found" again and no chip.

11. Find: the list "Practice area / Specialty". Do not choose a category first.
    Do: open the list. It is grouped under category names. Under the group "Paralegal Services" choose "Family Law".
    Expect: the list "Category" now shows "Paralegal Services" by itself, and a chip "Paralegal Services › Family Law" shows next to the heading.
    Do: click "Clear all".
    Expect: "16 freelancers found" again.

12. Find: the box "Search roles, specialties, tasks and software".
    Do: click in it, type medical records and press Enter.
    Expect: "2 freelancers found": Denise Carter and Renee Baptiste, with a chip "medical records" in quotation marks.
    Do: clear the box, type records medical and press Enter.
    Expect: the same two freelancers. The order of the words does not matter.
    Do: click "Reset".

13. Find: the box "Search roles, specialties, tasks and software".
    Do: type family law discovery and wait for the list under the box. Click the line "Discovery Support" that has "Paralegal Services › Family Law" after it.
    Expect: "Category" shows "Paralegal Services", "Practice area / Specialty" shows "Family Law", "Services / Tasks" shows "Discovery Support". A chip "Paralegal Services › Family Law › Discovery Support". "2 freelancers found": DELA Test Freelancer and Maria Delgado.
    Do: click "Clear all".

14. Find: the pink bar "✦ Find a freelancer with DELA" under the "Find a freelancer" card.
    Do: click it.
    Expect: it opens and shows a box labelled "What do you need help with?", a grey sentence starting "Don't include client names", a small label "Uses 1 DELA action (none on your own AI key)" and a button "✦ Suggest filters".
    Do: in the box type: I need a family law paralegal experienced in Clio to help prepare and e-file motions in Texas. Then click "✦ Suggest filters" and wait up to 60 seconds.
    Expect: a heading "DELA suggested filters" with pink chips under it (for example "Practice area: ...", "Software: Clio", "State: ..."), each with an ×, the sentence "Review or remove the suggestions below. Nothing is searched until you apply them.", and two buttons, "Apply filters & search" and "Edit filters manually". The heading above the results still reads "16 freelancers found": nothing was searched yet. Copy the chips into your report, word for word.

15. Find: the two buttons under the suggested chips.
    Do: click "Apply filters & search".
    Expect: the heading above the results changes and chips for the filters now show next to it. Write the number found in your report. Any number, including 0, is a PASS.
    Do: click "Reset" in the "Find a freelancer" card.
    Expect: "16 freelancers found".

16. Find: the first card under the heading "16 freelancers found". Any freelancer.
    Expect: on the left a round picture or a round pink circle with an initial; the name and a headline; "✓ Verified" and "No reviews yet" with NO star in front of it; in the middle a short description and pink tags; on the right, in a column, a button "View profile", the words "Invite for gig:" with a list that shows "Select one of your posted gigs", and a button "Invite to this gig" that is greyed out. The card has exactly two buttons. Under the card's content: "Inviting asks this freelancer to send a proposal for the gig you select. It does not hire them or award the work." There is no button named "Send message", "Book a call", "Reviews" or "Invite to my bench" on the card.

17. Find: the bottom of the list of cards.
    Expect: the line "Showing 10 of 16 freelancers." and a button "Load more freelancers".
    Do: click "Load more freelancers".
    Expect: six more cards appear on the same page, the line reads "Showing 16 of 16 freelancers." and the button is gone.

18. Find: the card for "DELA Test Freelancer" in the list (use Ctrl+F for the name).
    Expect: its round picture is a drawing on a light pink circle, not a drawing floating on white.
    Do: click "View profile" on that card.
    Expect: a full page, not a pop-up: at the top a button "← Back to Talent search"; the heading "DELA Test Freelancer", "✓ Verified", "No reviews yet"; on the right of the header "☆ Bookmark", "Send message" and "Book a call", and under them "Invite for gig:" with a list and "Invite to this gig"; then five tabs "Overview", "Services", "Experience and qualifications", "Portfolio", "Reviews". The address in the browser contains person=. On "Overview", two columns: on the left "Professional summary", "Primary services", "Software expertise"; on the right "Quick facts" and "Verification" with a line "What does verified mean?". No phone number, email address or website address anywhere on the page. Nothing reads "Not provided" or "Not given".

19. Do: press the browser's own Back button (the arrow at the top left of the browser window), not the button on the page.
    Expect: the Talent page again, with all 16 freelancers still loaded ("Showing 16 of 16 freelancers.").
    Do: click "View profile" on the DELA Test Freelancer card again.

20. Find: the row of tabs under the header.
    Do: click "Services", then "Experience and qualifications", then "Portfolio", then "Reviews".
    Expect: each opens on the same page with no pop-up or side panel: "Services offered"; then "Professional experience"; then "Work samples"; then "Reviews from completed engagements" with "No reviews yet. A review can only be left after a completed Lawfecta engagement, so a new member starts with none."

21. Find: at the right of the header, the button "☆ Bookmark".
    Do: click it once.
    Expect: ONE of these two. Write in your report which one you saw, word for word. (a) The button reads "★ Bookmarked" and beside it "Saved to your bookmarks. DELA Test Freelancer is not told." (b) A sentence beside the button that starts "The Lawfecta website did not let DELA use its bookmarks" or "The Lawfecta website's bookmarks could not be reached". Both are a PASS for this step; (b) tells the Lawfecta Team a permission is missing.

22. Find: at the right of the header, "Invite for gig:".
    Do: in the list choose "Build document checklist from questionnaire answers". Click "Invite to this gig".
    Expect: a page with the heading "Invite DELA Test Freelancer to submit a proposal" and "Nobody is hired at this step."; three cards "1. Select an existing gig", "2. Review the gig" and "3. Invite to submit a proposal" with the buttons "Send invitation to submit a proposal" and "Cancel".
    Do: click "Send invitation to submit a proposal". Leave the message box empty.
    Expect: a card "Already invited" saying DELA Test Freelancer was already invited to "Build document checklist from questionnaire answers" and "Nothing was sent again."
    Do: click "Back to Talent search".

23. Do: click "View profile" on the DELA Test Freelancer card, then click "Send message" at the right of the header.
    Expect: a conversation page with the heading "DELA Test Freelancer" and the sentence "A conversation before any gig. Messages and an introductory call only: files come with a gig. Nobody is hired here." Buttons "View profile", "Create a gig for DELA Test Freelancer" and "Book a call". There is no button "Book a meeting" and no button "Open the gig". Do not type or send a message, and do not click "Book a call".
    Do: click "Create a gig for DELA Test Freelancer".
    Expect: the Projects page with a notice near the top: "You are creating a gig for DELA Test Freelancer. Post it, and the invitation to DELA Test Freelancer opens next." and the link "Not for a specific freelancer". Do NOT post a gig.
    Do: click "Not for a specific freelancer".
    Expect: that notice is gone.

24. Go to: https://www.lawfecta.co/dela?tab=library&pb=ef1e6db7-5f02-4e47-8107-ff8f5b991522
    Find: near the top of the document "Open a Matter in Clio", above its title, a card titled "Freelancers who fit this work". Wait up to 20 seconds for it.
    Expect: freelancers listed in that card, each with a line starting "Why:" and the buttons "View profile" and "Start a chat". "DELA Test Freelancer" is one of them. Do not click the buttons. If the card instead says the suggestions could not be loaded, copy that sentence into your report.

25. Go to: https://www.lawfecta.co/dela?tab=talent
    Find: under the two buttons in the "Find a freelancer" card, a tick box "Bookmarked only (freelancers you saved)".
    Do: tick it.
    Expect: if step 21 ended with (a): "1 freelancer found", DELA Test Freelancer, with a small grey label "Bookmarked", and a chip "Bookmarked" next to the heading. If step 21 ended with (b): a notice starting "Your bookmarks could not be read, so nothing is shown." with a button "Try again". Write which one you saw.
    Do: untick the box. Then, only if step 21 ended with (a): click "View profile" on the DELA Test Freelancer card and click the button "★ Bookmarked".
    Expect: the button reads "☆ Bookmark" again and beside it "Bookmark removed."

Sign out (rule 7).

## Part 3: owner (admin area)

Log in as the owner: go to https://www.lawfecta.co/login and ask me to log in as the owner.

26. Go to: https://www.lawfecta.co/dela-admin?tab=catalog
    Find: the first card, titled "Website categories".
    Expect: a bold line "10 categories, 306 specialties, 1227 tasks, case types and software." followed by a sentence that ends "picked categories."; a table with the last copies; the buttons "Refresh now" and "Check the website's bookmarks".
    Do: click "Check the website's bookmarks" and wait for a line of text to appear under the buttons.
    Expect: a line that starts "The website answered." or "The website refused" or "No answer the check could read". Copy that whole line into your report, word for word.

Sign out: click the button with the owner's name at the top right, then "Sign out", the last line.
