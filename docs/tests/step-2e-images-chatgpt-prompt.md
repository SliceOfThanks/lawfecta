# ChatGPT test (track A, part 2): images in documents

> Layout note, 2026-11-13: DELA now has the menu on the left on every page (the compact workspace). The page description in "How to work" below is current. Steps written before that date may still name the old places (a row of tabs, a blue button, buttons in a dark top bar); line 6 of "How to work" says how to read them. Claude checks every step against the screen again before this test is next sent.

Claude already tested all of this with the real api and database: 9 api tests, the engine tests and 33 browser checks. They cover paste and drop, the blur burned in, reordering, the block, DELA's own check holding an image, the freelancer's view, another firm's images and the phone screen. This test covers the real screens, the real text reader and Word.

Run it after the document standard test (track A, part 1). It can run at the same time as the Claude test (track B).

Before you paste this:
1. Make two screenshots on your computer and save them as PNG files on your desktop:
   - **Screenshot A:** open a blank Word page and type these made-up details, each on its own line: Jane Roe, jane.roe@example.com, (555) 123-4567, 2026-CV-0042. Take a screenshot of the page.
   - **Screenshot B:** a screenshot of Word's menu bar only, with no names on it.
2. ChatGPT cannot pick files from your computer. When it asks for a file, click "Take over", choose the file in the window that opened, hand control back and type: done, continue.
3. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
4. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

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
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds.

When a step needs a file from my computer (Screenshot A or Screenshot B), stop and ask me to choose it. Wait until I say done.

How the parts you will use look:
- On a document page, the LEFT column is the document. Under the heading "Steps" each step is its own white box titled "Step 1", "Step 2" and so on. At the right end of each step box's top row are small outlined buttons: "↑", "Remove" and "🖼 Add image". Images appear inside the step box, under the box "What to do (one action, starting with a verb)".
- The RIGHT column starts with the card titled "Quality check", with the buttons "Save", "Approve" and "Post as a Flex Gig", and "Export:" with "Word".
- The image window is a pop-up in the middle of the screen titled "Review image". In it, from top to bottom: a row of four outlined buttons "Box", "Arrow", "Blur", "Undo"; a yellow bar (only when DELA found something) with the button "Blur all flagged" at its right end; the image; the box "Caption (what should the reader look at?)"; the checkbox "This image contains no client information, passwords or account numbers."; and at the bottom right the buttons "Cancel" (outlined) and "Save image" (blue).

1. Attorney (ask me to log in as the test attorney)

1. Go to: https://www.lawfecta.co/dela?tab=library
   Do: in the first card under "Document library", click the blue "New document". Click the box "SOP". In "Process name" (the first box in the card "About this process") type Open a matter in Clio. Click the blue "Draft it with DELA" at the bottom of that card.
   Expect: within 60 seconds, the document page.

2. Find: in the left column, the heading "Steps", then the box "Step 1".
   Expect: the outlined button "🖼 Add image" at the right end of the top row of each step box, and the grey line "Tip: Take a screenshot, click a step, and paste it here." at the bottom of the "Step 1" box.

3. Wrong file.
   The "🖼 Add image" file window shows only PNG and JPG files, so a wrong file is tested by dragging it in.
   Do: ask me to drag any PDF or Word file from my desktop and drop it on the "Step 1" box. Wait until I say done.
   Expect: the red line "Use a PNG or JPG image." inside the "Step 1" box, and no "Review image" pop-up.

4. Do: click "🖼 Add image" in the "Step 1" box again. Ask me to choose Screenshot A.
   Expect: the pop-up "Review image".
   Wait up to 20 seconds, then expect: the yellow bar "We found (number) items that may be client information." and yellow outlines on the image around the made-up name, email, phone number and case number. Report which of the four were outlined.

5. In the pop-up:
   Expect: "Save image" (bottom right) is greyed out. Move the mouse over it and report the message that appears.
   Do: click once inside one yellow outline on the image.
   Expect: only that item is blurred.
   Do: click "Blur all flagged" at the right end of the yellow bar.
   Expect: every outlined item is blurred and the bar says "Every flagged item is blurred. Check the rest of the image yourself."

6. Still in the pop-up:
   Do: click "Box" (first button of the top row), then press the mouse on an empty part of the image and drag to draw a box. Click "Arrow", then drag on the image to draw an arrow. Click "Undo".
   Expect: the arrow is gone and the box is still there.

7. Still in the pop-up:
   Do: click in the box "Caption (what should the reader look at?)" and type The New matter button
   Expect: "Save image" is still greyed out.
   Do: tick the checkbox "This image contains no client information, passwords or account numbers.", then click the blue "Save image".
   Expect: the pop-up closes and the message "Saving the image..." appears at the bottom of the screen. Wait up to 20 seconds. Then expect the message "Image saved" and the image inside the "Step 1" box at full width with "The New matter button" in grey italics below it. Do not mark FAIL before the 20 seconds are up.

8. Do: click the image.
   Expect: the image fills the screen on a dark background. Press Esc. Expect: it closes. Click the image again, then click the round "✕" in the top right corner of the screen. Expect: it closes.

9. Two more on step 1, then a fourth.
   Do: click "🖼 Add image" in the "Step 1" box, ask me to choose Screenshot B, type Shot two in the caption box, tick the checkbox, click "Save image". Do this once more with the caption Shot three.
   Expect: three images in the "Step 1" box.
   Do: click "🖼 Add image" in the "Step 1" box once more.
   Expect: the red line "Each step can have 3 images. Split this step to add more." inside the "Step 1" box, and no file window.

10. Edit, Remove and reorder.
    Do: move the mouse over the first image in the "Step 1" box.
    Expect: three small buttons in the image's top right corner: "Edit", "Replace", "Remove".
    Do: click "Edit". In the pop-up, clear the caption box and type The New matter button, top left. Tick the checkbox. Click "Save image".
    Expect: the new caption under the first image.
    Do: move the mouse over the third image and click its "Remove".
    Expect: a small window "Remove this image?" with "Cancel" and "Remove". Click "Remove". Expect: two images left.
    Do: drag the second image (press on it, move it up over the first image, let go).
    Expect: the two images swap places. Go to https://www.lawfecta.co/dela?tab=library, open "Open a matter in Clio" again (click its row) and check the order stayed.

11. Paste (ask me to do it).
    Ask me to: copy Screenshot B to the clipboard (open it, then Ctrl+C or Cmd+C), click inside the box "What to do (one action, starting with a verb)" in the "Step 2" box, and press Ctrl+V or Cmd+V. Wait until I say done.
    Expect: the pop-up "Review image". Type Pasted shot as the caption, tick the checkbox, click "Save image". Expect: the image inside the "Step 2" box.

12. The quality panel.
    Find: the card titled "Quality check" (right column).
    Expect: no image item marked "Blocking". If any image item is there, report its text, click its "Fix it", tick the checkbox in the pop-up, click "Save image", and report what happened.

13. Word.
    Do: in the "Quality check" card, after "Export:", click "Word". Open the file.
    Expect: each image at full page width under its step, with the caption below it in grey italics. Report anything that looks wrong.

14. The warning before a gig.
    Do: in the "Quality check" card, click the blue "Approve". Then click the blue "Post as a Flex Gig" in the same card.
    Expect: the Projects page with the card "Post a new gig"; its dropdown "Document" shows "Open a matter in Clio".
    Do: click the blue "Draft the gig with DELA" at the bottom of that card.
    Expect: a pop-up "Check the images" saying "The freelancer will see 3 images in this document. Check that none show client information." with the buttons "Review images" and "Continue".
    Do: click "Continue". Expect: within 60 seconds, the gig page. Do not post the gig.

15. A Policy has no images.
    Do: go to https://www.lawfecta.co/dela?tab=library, click the row "Client trust account rules" (made in the first test).
    Expect: no "🖼 Add image" button anywhere on the page (use Ctrl+F to search "Add image").

16. A Workflow has a swimlane chart.
    Do: go to https://www.lawfecta.co/dela?tab=library and click the row "Intake to signed engagement" (made in the first test).
    Expect: "🖼 Add image" on each stage box, and a section "Swimlane chart" (in the left column, after "Start and end points") with its own "🖼 Add image".
    Do: click the "🖼 Add image" in the "Swimlane chart" section, ask me to choose Screenshot B, type Our swimlane chart as the caption, tick the checkbox, click "Save image".
    Expect: the image under "Swimlane chart".

17. A Playbook.
    Do: go to https://www.lawfecta.co/dela?tab=library and click the row "Handle an upset client".
    Expect: a "🖼 Add image" button under "Scripts and templates" and another under "Examples". You do not need to add one.

18. Sign out.

2. Owner (ask me to log in as the owner)

1. Go to: https://www.lawfecta.co/dela-admin
   Do: in the menu on the left near the top, click "AI and files".
   Find: the card titled "Documents (Policy, Workflow, SOP, Playbook)" at the very bottom, and in it the heading "Images in documents".
   Expect: "Images in documents", "Waiting for a client-data check", "Held by DELA's check", "Items the text reader found" and "Items members blurred", with numbers. No images and no image links.

2. Do: in the menu on the left, click "Switches".
   Find: the row whose small grey code name is "document_images".
   Expect: its dropdown shows "Access list".

3. Sign out.

3. Check the results (test attorney)

1. Go to: https://www.lawfecta.co/dela?tab=library and click the row "Open a matter in Clio".
   Expect: two images in "Step 1" in the order you set, one in "Step 2", each with its caption.
2. Sign out.

At the end: list every FAIL, every message that was confusing, and which of the four made-up details in Screenshot A the text reader did not outline.
