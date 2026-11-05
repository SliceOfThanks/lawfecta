# ChatGPT test: images in documents

Claude already tested all of this with the real api and database: 9 api tests, the engine tests and 33 browser checks. They cover:
- adding an image with the button, by pasting and by dropping a file
- a wrong file type, an image over 5 MB and a fourth image on one step
- flagged text, "Blur all flagged", Box, Arrow and Undo
- the blur burned into the saved image
- full screen, reordering, Edit and Remove
- the block with "Fix it"
- Word export with the images
- the warning before a gig
- "Check images" at a due review
- the freelancer's read-only view, and the images hidden after the gig closes
- Policies with no images
- the phone screen
- DELA's own check holding an image, including a hold that arrives later
- another firm's images refused

This test covers the real screens, the real text reader and Word.

Before you paste this:
1. Make two screenshots on your computer and save them as PNG files:
   - **Screenshot A:** a page with made-up details typed on it, for example a blank Word page where you type "Jane Roe", "jane.roe@example.com", "(555) 123-4567" and "2026-CV-0042" on separate lines.
   - **Screenshot B:** a plain screen with no names, for example the Clio or Word menu bar.
   - Never use a screenshot with real client information.
2. ChatGPT's agent may not be able to pick files from your computer or paste a screenshot. When the test asks for a file, ChatGPT will stop and ask you. Click "Take over", do that step yourself, then hand control back and type: done, continue.
3. The logins are filled in. Passwords are not kept on GitHub. Use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
4. The Lawfecta login has reCAPTCHA, which ChatGPT cannot pass. Each time ChatGPT reaches the login page:
   1. Click "Take over".
   2. Log in with the account it names.
   3. Hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.hirelegalhelp.com. Report every step as PASS or FAIL with what you saw. Take a screenshot of anything wrong or confusing. Never type real client information; use only made-up details.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.hirelegalhelp.com/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.

When a step needs a file from my computer (Screenshot A or Screenshot B) or a paste, stop and ask me to do it. Wait until I say done.

To sign out at the end of a group, click the initials in the top right of the DELA page, then "Sign out".

1. Attorney (ask me to log in as the test attorney)
1. Open www.hirelegalhelp.com/dela?tab=library. Click "New document" in the card near the top, click the "SOP" card, type "Open a matter in Clio" in "Process name" and click "Draft it with DELA". Wait about a minute.
2. On the document page, scroll to "Steps". Expect an "Add image" button at the right end of each step's top row, and the grey tip "Tip: Take a screenshot, click a step, and paste it here." under the first step.
3. Wrong files (ask me to choose the file): click "Add image" on step 1 and choose a PDF or a Word file. Expect "Use a PNG or JPG image." in red under the step. If I have an image over 5 MB, try it too and expect "This image is over 5 MB. Try a smaller screenshot."
4. Click "Add image" on step 1 and ask me to choose Screenshot A.
   1. Expect a pop-up titled "Review image" with the image in the middle and the buttons "Box", "Arrow", "Blur" and "Undo" above it.
   2. Within a few seconds, expect a yellow bar "We found ... items that may be client information." and yellow outlines around the made-up name, email, phone number and case number. Report which items were outlined and which were missed.
   3. Expect "Save image" greyed out. Hover over it and report the message.
   4. Click one yellow outline. Expect just that item blurred.
   5. Click "Blur all flagged". Expect every outlined item blurred.
   6. Click "Box" and drag a box around something on the image. Click "Arrow" and drag an arrow. Click "Undo" once. Expect the arrow gone and the box still there.
   7. Type "The New matter button" in "Caption (what should the reader look at?)". Expect "Save image" still greyed out.
   8. Tick "This image contains no client information, passwords or account numbers." Expect "Save image" to turn on. Click it.
5. Expect a progress bar on the step, then the image under step 1 at full width with "The New matter button" in grey italics below it.
6. Click the image. Expect it full screen. Press Esc. Expect it to close. Open it again and close it with the X in the top right.
7. Paste (ask me to do it): ask me to copy Screenshot B to the clipboard (open it, then Ctrl+C on Windows or Cmd+C on a Mac), click into the text of step 2, and press Ctrl+V or Cmd+V. Expect the same "Review image" window. Add a caption, tick the box and save. Expect it under step 2.
8. Drag and drop (ask me to do it): ask me to drag Screenshot B from my computer onto step 3. Expect the "Review image" window. Click "Cancel". Expect nothing added.
9. Add Screenshot B to step 1 twice more (caption, tick, save each time). Then click "Add image" on step 1 again. Expect "Each step can have 3 images. Split this step to add more." in red.
10. Hover over the first image on step 1. Expect "Edit", "Replace" and "Remove" in its top right corner.
    1. Click "Edit". Change the caption to "The New matter button, top left" and save (tick the box again). Expect the new caption.
    2. Click "Remove" on the third image. Expect "Remove this image?" with "Cancel" and "Remove". Click "Remove". Expect it gone.
    3. Drag the second image above the first. Expect the order to change and stay after you reload the page.
11. Scroll to the "Quality check" card on the right. Expect no image item marked "Blocking". If any image says "DELA's check thinks this image may show client information", click "Fix it" or "Edit" on it, blur more or confirm, and report what happened.
12. In the "Quality check" card, click "Word". Open the file in Word. Expect each image at full page width under its step with the caption below it. Report anything that looks wrong.
13. Click "Approve". Then click "Post as a Flex Gig". On the Projects page, click "Draft the gig with DELA". Expect "The freelancer will see 3 images in this document. Check that none show client information." with "Review images" and "Continue". Click "Continue". Leave the gig as a draft.
14. Policies: click "Library" at the top, then "New document", the "Policy" card, type "Client trust account rules", and click "Draft it with DELA". Expect no "Add image" button anywhere on the Policy.
15. A Workflow: make a new document from the "Workflow" card. Expect "Add image" on each stage and a "Swimlane chart" section with its own "Add image". Add Screenshot B to the swimlane chart.
16. A Playbook: make a new document from the "Playbook" card. Expect "Add image" under "Scripts and templates" and under "Examples".
17. On your phone (or a narrow window), open the SOP from step 1. Tap an image to see "Edit", "Replace" and "Remove". Tap "Add image" and report whether your phone offers to take a photo or choose from the library. Nothing should run off the side of the screen.
18. Sign out.

2. Freelancer (ask me to log in as the test freelancer)
1. If Claude has invited this freelancer to the gig from attorney step 13 (I will tell you), open www.hirelegalhelp.com/dela?tab=work, open that gig, and expect the images with captions under "The work handed to you". Click one for full screen.
2. Expect no download button on any image.
3. Sign out.

3. Owner (ask me to log in as the owner)
1. Open www.hirelegalhelp.com/dela-admin and click "AI and files" in the row of tabs.
2. Scroll to the "Documents (Policy, Workflow, SOP, Playbook)" card at the bottom. Expect image counts: images in documents, waiting for a check, held by DELA's check, and items found and blurred by the text reader. Expect no images or image links.
3. Click "Switches" in the row of tabs. Expect "document_images" set to the access list.
4. Sign out.

4. Check the results
1. Log in as the test attorney and open www.hirelegalhelp.com/dela?tab=library, then the SOP "Open a matter in Clio". Expect every image still under its step, in the order you set, with its caption. Sign out.

At the end, list every FAIL, everything confusing, and which made-up details the text reader missed.
