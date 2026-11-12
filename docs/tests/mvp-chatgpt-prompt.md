# ChatGPT test: the DELA MVP (2026-11-09)

> Layout note, 2026-11-13: DELA now has the menu on the left on every page (the compact workspace). The page description in "How to work" below is current. Steps written before that date may still name the old places (a row of tabs, a blue button, buttons in a dark top bar); line 6 of "How to work" says how to read them. Claude checks every step against the screen again before this test is next sent.

One test across the MVP on the test site: the DELA guide on both sides, the new agency profile with DELA's help, DELA learning about a new firm first, delegation suggestions from a playbook, finding freelancers, agreements with milestones and fees, disputes, plan limits, and the owner's checks. Payments stay in Stripe test mode; no real money moves.

Each account logs in once: the test freelancer (who runs an agency on Freelancer Business), then the test attorney, then the new attorney hello@legalstacey.com, then the owner.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead. For hello@legalstacey.com use the password you chose at checkout.
2. Each time ChatGPT reaches the login page: click "Take over", type the email named by hand, log in, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co. Everything here is made up; type only the made-up words in the steps.

Logins (I log in for you each time):
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- new attorney: hello@legalstacey.com
- owner (admin area): stacey@lawfecta.com

HOW TO WORK (read this first; it saves time and credits)
1. Do only the numbered steps below, in order. Do not explore, do not open other menus, and do not look for other features.
2. When a step says "Go to", type that link into the browser's address bar and press Enter. Do not get there by clicking around.
3. Every button, box and link is named in quotes, exactly as the screen writes it, with where it is. First scroll to the card heading the step names, then look for the item.
4. If you cannot see it after scrolling to that heading: press Ctrl+F (Cmd+F on a Mac), type the name without the quotes, press Enter, and use the highlighted match. If it is still not there, take one screenshot, write FAIL for that step with what you saw, and go on to the next step. Never try more than this one other way.
5. When a step says DELA is writing or checking, wait up to 60 seconds without clicking anything else.
6. What every DELA page looks like:
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Profile" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Files", "Get set up", "Profile", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name and a small yellow "Test site" label on the left; on the right an "Inbox" button, a bell (Notices) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
   - The admin area (https://www.lawfecta.co/dela-admin) has the same kind of menu on the left: "Release Control" and "Guide", then five headings in capital letters that open and close when clicked: "MEMBERS", "PLANS AND SETTINGS", "MARKETPLACE", "PAYMENTS", "SAFETY". At the top right is one button with the owner's name and "(owner)".
   - Some steps were written for the earlier layout. Read them this way: "tab" or "row of tabs" means a line in the menu on the left; a name with a symbol in front (for example "⌂ Home") is the same name without the symbol; "dark red button" means the dark red main button; "AI settings" means "Settings". In the admin area a "tab" is a line in the left menu under its heading: MEMBERS (Overview, Access list, People, Lawfecta Team, Agencies), PLANS AND SETTINGS (Plans, Settings, Switches, AI and files, Tech catalog, Trials, Usage), MARKETPLACE (Verification, Gigs, Meetings and messages, Reviews and bench), PAYMENTS (Payments, Disputes, Recurring), SAFETY (Security, Holds, Audit log, Jobs). Click the heading first if its lines are not showing.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens. To sign out of the admin area: click the button with the owner's name at the top right, then "Sign out", the last line.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report in a plain text file named DELA-test-report.txt and give me a link to download it.

Steps

TEST FREELANCER, WHO RUNS AN AGENCY (log in once)
1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer. Then click the round button with the initials at the far right of the top bar: the first line must say "DELA Test Freelancer". If not, stop and tell me.
2. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the card "Ask DELA" at the top of the right column.
   Expect: under the heading, a line of text says attorneys who hire an agency read the agency profile first, and names what it still needs. Under it, a dark red button "Build my agency profile".
   Do: click "Build my agency profile".
   Expect: the Agency page opens.
3. Find: the card "Agency profile" near the top of the Agency page.
   Expect: a yellow line "Still missing:" with items such as "a headline" and "the states you serve", and a line with the team size.
4. Do: in the box "Tell DELA about your agency" (inside the "Agency profile" card) type: Fictional test agency: four paralegals in Austin doing family law discovery responses and case file organizing for small firms. We use Clio.
   Do: click "✦ Let DELA draft it".
   Expect: within 60 seconds the line "DELA filled in the boxes. Check every word, then click Save the agency profile." and the boxes "Headline", "Summary", "Practice areas", "Services", "Tools you use" and "States you serve" are filled.
5. Do: click "Save the agency profile" at the bottom of the card.
   Expect: a "Saved" message, and the card now says "Complete." (or names fewer missing items).
6. Find: further down the Agency page, the cards "Business details" and "Team".
   Expect: both are there. Write what each says in one line.
7. Go to: https://www.lawfecta.co/dela?tab=home
   Expect: the "Ask DELA" card (on Home, at the right; on a narrow window, below the other cards) has moved on to the next step (for example invitations or new gigs). Write the line of text at the top of that card.
8. Go to: https://www.lawfecta.co/dela?tab=earnings
   Expect: the Earnings page opens with no error. Write the heading of the first card.
9. Sign out.

TEST ATTORNEY (log in once)
10. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney. Check the first line of the round initials menu says "DELA Test Attorney".
11. Go to: https://www.lawfecta.co/dela?tab=home
    Expect: the "Ask DELA" card (on Home, at the right; on a narrow window, below the other cards) says proposals arrived for "Build document checklist from questionnaire answers", with a dark red button "Compare the proposals".
    Do: click "Compare the proposals".
    Expect: that gig opens on its proposals, each with a price and what it includes.
12. Go to: https://www.lawfecta.co/dela?tab=library
    Do: open any document whose status says "Approved" (click its title).
    Find: the card "✦ Automate or delegate" on the document page (scroll down).
    Expect: the card is there, offering to find steps to automate or hand to a freelancer. If it shows a review already, write how many suggestions it lists.
13. Go to: https://www.lawfecta.co/dela?tab=talent
    Do: in the box "Describe the task (for ✦ Help me find a fit)" type: Fictional test: draft discovery responses for a family law case in Texas. Click "✦ Help me find a fit".
    Expect: within 60 seconds DELA fills in the search filters (for example practice area and state). Then click "Search" and write how many freelancers are listed.
14. Go to: https://www.lawfecta.co/dela?tab=projects&gig=868796e2-adfc-46ef-a923-51d433ae53b0&view=agreement
    Expect: the signed agreement for "Test job: Dispute to open (prepared)" with its milestones, each with an amount, and the platform fee shown. At the bottom, the card "Problems, disputes and canceling".
15. Go to: https://www.lawfecta.co/dela?tab=usage
    Expect: the "Usage" page lists this plan's limits (for example saved documents and DELA actions) with how much is used.
16. Sign out.

NEW ATTORNEY (log in once)
17. Go to: https://www.lawfecta.co/login and ask me to log in as hello@legalstacey.com.
18. Go to: https://www.lawfecta.co/dela?tab=home
    Expect: the "Ask DELA" card (on Home, at the right; on a narrow window, below the other cards) starts "Welcome to DELA. First, tell DELA about your firm", with a dark red button "Tell DELA about my firm".
    Do: click "Tell DELA about my firm".
    Expect: the Library opens on the card "Your firm profile for documents".
19. Do: in the box "Describe your firm (optional)" type: Fictional test firm: two attorneys doing family law and estate planning in Texas state courts; we use Clio and Microsoft 365.
    Do: click "✦ Help me describe my firm".
    Expect: within 60 seconds DELA fills in "Firm size", "Practice areas" and "Jurisdictions" (and some systems).
    Do: click "Save and continue" at the bottom of the card.
    Expect: a "Saved" message.
20. Go to: https://www.lawfecta.co/dela?tab=home
    Expect: the line of text at the top of the "Ask DELA" card now says "Let's take one task off your desk. Based on your family law ... practice, these are good to hand off first." with three buttons that start with "Draft:" and a fourth, "Something else".
21. Do: click the first "Draft:" button.
    Expect: the Library opens on "New document" for that task.
22. Sign out.

OWNER, ADMIN AREA (log in once)
23. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.
24. Go to: https://www.lawfecta.co/dela-admin?tab=pay ("Payments" in the left menu, under the heading "PAYMENTS").
    Find: the second card on the page, "Payment overview" (the first card is "Needs attention").
    Expect: a line in it that starts "Stripe is connected in test mode" OR "Stripe is not connected yet". Copy that line word for word into your report.
25. Go to: https://www.lawfecta.co/dela-admin?tab=overview ("Overview" in the left menu, under the heading "MEMBERS").
    Find: the card "DELA guide" on the Overview page (scroll down).
    Expect: tiles with numbers, and a list of steps that includes "Tell DELA about the firm" and "Agency profile".
26. Go to: https://www.lawfecta.co/dela-admin?tab=disputes ("Disputes" in the left menu, under the heading "PAYMENTS").
    Expect: the Disputes page opens with numbers and lists, no error.
27. Sign out: click the button with the owner's name at the top right, then "Sign out".

AT THE END
Report one line per step (PASS or FAIL and a few words), the FAIL list, any confusing message, and anything that took longer than 60 seconds. Put it all in DELA-test-report.txt.
