# Feature brief: Images in documents

Step: 2e (an add-on to the document standard, docs/briefs/step-2d-document-standard.md)   Spec references: Stacey's "6. IMAGES" request (2026-11-05), safety rule "Confidential client data does not belong in DELA"
Status: answered (Stacey 2026-11-05: "Yes", read as all 13 suggested answers); building

## Who
- Attorneys and firm staff with editor rights in a firm library (every attorney plan). They add, edit and remove images.
- Readers in the firm (commenters and viewers) see images inline.
- Freelancers see the images in their part of a Flex Gig, read only, with no download button.
- The Lawfecta Team sees counts and held images in the admin area, never the images themselves unless one is reported.
- Policies stay text only.

## What
Adding a screenshot to a step takes a few seconds: paste, drag or choose a file. DELA marks any text that looks like client information and makes blurring it one click. Saving needs a caption and the "no client information" checkbox. Each image stays tied to its step, so it moves with the step when steps are reordered or split.

Done looks like:
- Each allowed step or section can have up to 3 PNG or JPG images of up to 5 MB, each with a caption that is also its alt text.
- Every image has a confirmed client-data check, or the document cannot be exported, approved or turned into a gig.
- Word, PDF and web page exports show the images at full width with captions.
- Reviews ask the owner to confirm each image is still current.

Where images are allowed:
- SOP: each step, and "Before you start".
- Workflow: each stage, and a new "Swimlane chart" section (see question 2).
- Playbook: "Scripts and templates" and "Examples".
- Policy: none.

## Where
- DELA, Library, the document's "Draft and review" screen: an "Add image" button at the right end of each step row and each image-enabled section, drag and drop onto a step, and paste into a step.
- The "Review image" window: preview, Box, Arrow, Blur, Undo, yellow outlines on flagged text, "Blur all flagged", the caption box, the checkbox, Cancel and "Save image".
- Under each step: the image at full column width with a grey italic caption; full screen on click (Esc or X to close; pinch to zoom on a phone); Edit, Replace and Remove on hover or tap; drag to reorder.
- The "Quality check" card: "Step N image is missing a caption." and "Step N image has no client-data check.", each with "Fix it".
- The review screen, when a document is due: a "Check images" section with thumbnails and "Still current" or "Replace".
- Projects: the warning before a gig is created from a document with images.
- The freelancer's gig view: images inline, read only, watermarked with the freelancer's name like the rest of the gig.
- Exports: Word (embedded at full page width, caption below), PDF and web page (same). Markdown and the step checklist get the caption only, as "[Image: caption]".
- Admin area, "AI and files" tab: the Documents card adds image counts and how many are waiting for a check.

## When
- Adding: any time a member edits a draft. A new image goes into the next saved version.
- Text recognition runs as soon as the image is chosen, before it is saved.
- The export block applies from the moment an image without a confirmed check is in the document.
- At the review date (3 months for high risk, 12 otherwise), the "Check images" step must be done before the review can be approved.
- Removing an image from a document keeps it for older versions (history is append-only). The file is deleted only when no version uses it and the document is deleted from the trash.

## Why
- For the member: screenshots make software steps much easier to follow, so new staff and freelancers make fewer mistakes. Making blur the easy path keeps client information out.
- For Lawfecta: better documents make better gigs (clearer work, fewer disputes) and keep firms building their library in DELA. Images in Word exports make DELA's exports worth using.

## How it could go wrong
- **A screenshot shows a client name, email, case number or account number.** Text recognition marks it, "Blur all flagged" covers it, the checkbox is required, and the export block catches anything not confirmed. The blur is burned into the saved image and the unblurred original is never kept, so it cannot be recovered.
- **Text recognition misses something** (small text, a photo of a screen, handwriting). The checkbox makes the uploader responsible, as for all DELA content. The server also runs the existing AI image check and holds the image if it finds client information.
- **A false alarm** (for example a button label that looks like a name). The member can leave a flag unblurred and still save after checking the box.
- **Someone ticks the box without looking.** We record who confirmed it and when. A reader can report an image, and the team can remove it.
- **A wrong file:**
  - Wrong type: "Use a PNG or JPG image."
  - Over 5 MB: "This image is over 5 MB. Try a smaller screenshot."
  - A fourth image on a step: "Each step can have 3 images. Split this step to add more."
  - A file renamed to .png that is not an image is refused by the same file check Files uses.
- **iPhone photos** are often HEIC. The phone's picker converts them to JPG when the page asks for PNG or JPG. If one still arrives as HEIC, it is refused with the wrong-type message.
- **Two people edit the same step.** The normal "Someone saved a newer version" rule applies. A pasted image is uploaded first and only joins the document when the version is saved, so nothing is lost or doubled.
- **A paste while the window is still open, or a double click on "Save image."** Each upload has a request id, so it is saved once.
- **Steps reordered, split or merged.** Images belong to the step itself, so they move with it. Split into linked SOPs keeps each step's images with that step.
- **A gig shows a screenshot to a freelancer.** The warning with the image count, the watermark, no download button, and short-lived image links that work only while the freelancer's access lasts. A determined person can still take a screenshot of their screen; no website can stop that.
- **Storage fills up.** Each image counts toward the firm's Files storage allowance (see question 9).
- **Older screenshots from Scribe and recorder imports** were confirmed when they were imported, but have no caption yet (see question 5).
- **Privacy of the text recognition.** It runs in the member's browser, so the image does not go anywhere to be read (see question 3).

## Settings and switches it uses
- Switch document_images (off until tested, then the access list).
- Settings documents.images.max_mb 5, documents.images.per_step 3, documents.images.types png,jpg, documents.images.caption_max 120, documents.images.max_width_px (question 8).
- The existing file storage allowance per plan, the client information check and the gig watermark.

## Questions to make it better
Stacey answered "Yes" on 2026-11-05, read as every suggested answer below. She can change any of them.

Built notes:
- Question 11 (gigs): images open to an invited freelancer while the gig is open, and to the hired freelancer until the engagement is completed or canceled. That is stricter than gig files, which stay open to the hired freelancer after completion, because the brief asked for images to be hidden after the engagement ends.

1. **Older images.** Today a step can hold one screenshot from a Scribe or recorder import. Should those become images in the new system, with up to 3 per step from now on?
   Suggested: yes. They keep their step and get the caption question below.
2. **The Workflow "swimlane chart".** DELA does not draw a swimlane chart yet. Should this step add a "Swimlane chart" section to Workflows, where the firm attaches a chart image it made elsewhere (for example in Visio or Lucidchart)? Drawing the chart automatically from the stages and lanes would be its own later step.
   Suggested: yes, an image section now; the automatic chart later.
3. **How text recognition works.** Choose one:
   - (a) In the member's browser with Tesseract (a free, well-known text reader). The image stays on their computer while it is read. It takes a few seconds and downloads about 5 MB the first time.
   - (b) An outside service such as Google Cloud Vision. Faster and more accurate, but the image goes to Google, and you would need a Google Cloud account and key.
   Suggested: (a). The server also runs DELA's existing AI image check after saving, on Lawfecta's key, with no member credits used.
4. **What counts as a flag.** Emails, phone numbers, case numbers (like 2026-CV-0042), account and card numbers, Social Security numbers and dates of birth are found by pattern. Names are harder. Choose one:
   - (a) Flag pairs of capitalized words that are not common screen words (more false alarms).
   - (b) Flag only names already known to DELA: the firm's team and anything typed in the document.
   Suggested: (a), because a client's name is the most likely thing on a screenshot. The member can ignore a false alarm.
5. **Images without a caption** (older imports). Should a missing caption block export like the client-data check, or only show under "Needs attention" in the "Quality check" card?
   Suggested: only "Needs attention". The block stays for the missing A, the attorney flag and an unconfirmed client-data check, as you listed.
6. **Older imported screenshots and the client-data check.** Those were confirmed at import (the Scribe and recorder review asked for it). Should that count as the check, or should owners confirm each one again?
   Suggested: count it, since the same person confirmed it. Show "Confirmed at import" on the image.
7. **Edit after saving.** The blur is burned in and the original is deleted when you click "Save image". So "Edit" reopens the saved image: you can add more boxes, arrows or blur, but you cannot undo a blur that was already saved. Is that right?
   Suggested: yes, safety first. "Replace" is there for a fresh image.
8. **Image size.** Should DELA shrink very large screenshots before upload (for example to 2400 pixels wide), so they load fast on phones and use less storage? Text stays readable at that size.
   Suggested: yes, 2400 pixels, as a setting.
9. **Storage.** Should images count toward the firm's Files storage allowance on its plan?
   Suggested: yes, the same allowance, so there is one number to understand.
10. **The review "Check images" step.** A review is finished today by approving the document again. Should "Approve" stay greyed out on a due document until every image is marked "Still current" or replaced?
    Suggested: yes, with the reason shown when hovering over the button.
11. **Freelancers and gigs.** Besides no download button and the watermark, should images in a gig be hidden after the engagement ends, like the gig's files?
    Suggested: yes, the same rule as gig files.
12. **ChatGPT and Claude connector, and the AI.** Should get_document and DELA's AI see only the captions (not the images)?
    Suggested: captions only for now. Letting the AI read screenshots costs more credits and can be its own setting later.
13. **Arrows and boxes.** One color (Lawfecta red) and one line weight to keep it simple, or a choice of colors?
    Suggested: one color, red, thick enough to see in Word.

## Success looks like
These become the ChatGPT test, grouped by login.

Attorney:
- Add an image three ways: the button, drag and drop, and paste. Each opens "Review image".
- A screenshot with a made-up name, email and case number shows yellow outlines and "We found 3 items that may be client information." "Blur all flagged" covers all three.
- "Save image" stays greyed out until the caption and checkbox are done, and shows the hover message.
- Errors appear for a PDF, a 6 MB image and a fourth image on one step.
- The image shows under its step with the caption. It opens full screen and closes with Esc. Edit, Replace and Remove work; Remove asks first; two images can be reordered.
- A Policy has no "Add image" button.
- Images stay with their step when the step moves up or is split.
- An image without a confirmed check blocks Word export, approval and gigs, and "Fix it" opens the review window.
- Word export shows the image at full page width with the caption below.
- The gig warning shows the image count, with "Review images" and "Continue".
- A due review shows "Check images", and "Approve" waits until each image is "Still current" or replaced.

Freelancer:
- The gig shows the images with captions and the watermark, with no download button.
- Images are hidden after the engagement ends.

Owner:
- The admin Documents card shows image counts and any held images.

Check the results:
- The 900-word count is the same before and after adding images and captions.
- The original of a blurred image cannot be opened anywhere.
