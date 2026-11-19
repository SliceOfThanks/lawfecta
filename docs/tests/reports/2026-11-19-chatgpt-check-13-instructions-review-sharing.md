# ChatGPT check 13: DELA instructions, suggested edits, invitation sharing (2026-11-19)

Result: 11 PASS, 0 FAIL. Stacey sent the report the same day. Its wording notes were fixed in commit 3880a70 (a suggested edit is said as a suggestion; the comparison column says "Now, in this document").

```
DELA TEST REPORT
Test date: November 19, 2026 (America/Los_Angeles)
Site: https://www.lawfecta.co
Account: DELA Test Attorney
Result: 11 PASS; 0 FAIL; 0 could not check.

REGENERATION NOTE
This report reconstructs the completed browser test recorded in this chat. The live test was not rerun. The Step 4 screenshot was recovered from the original session. The original Step 9 and Step 10 screenshot files could not be recovered and are not included in the regenerated bundle.

LOGIN AND STARTING STATE
The login page already showed "You Are Currently Logged In As DELA Test Attorney". No login fields or CAPTCHA needed completion. No other account was used. Starting state: no existing firm guidance or personal preferences; Suggested edits (0) on INT-03.

STEP RESULTS
1. PASS - The right-column "DELA instructions" card showed "No firm guidance yet." and "Open DELA instructions".
2. PASS - The instructions screen showed the back button, introductory explanation, all three tabs, the Firm guidance card, input, proposal button, and administrator-approval explanation.
3. PASS - Empty submission displayed "Write at least a few words." without adding a line; the exact test instruction then appeared with "Proposed, not in use", Approve/Do not approve, the expected proposal message, and Firm guidance (1).
4. PASS - Approving the instruction showed "Approved, in use", Retire, "Approved. DELA follows it from the next message, for everyone in your firm.", and "1 line of firm guidance in use." Recovered screenshot: step-04-approved-guidance.jpg.
5. PASS - The exact preference "Give me checklists as numbered steps." saved with "In use", Remove, My preferences (1), and "1 line of firm guidance in use, 1 preference of your own."
6. PASS - The chat returned and DELA answered within 60 seconds; the completed answer was observed about 9 seconds after Send. (a) Yes: "Do not hand off the file until someone is assigned to confirm the missing documents." (b) Yes: numbered steps included "1. Gather the intake packet." and "2. Confirm who will chase the missing documents."
7. PASS - Retire showed "Retired. DELA no longer uses it. It stays in the change history." and no firm guidance; Remove showed "Removed. DELA no longer uses it." and no preferences; Change history retained both lines with grey Retired tags, proposer and date; returned to the chat.
8. PASS - On INT-03, sent the exact test request in Chat; DELA answered within 60 seconds, said the change was waiting on Suggested edits, and the tab changed from Suggested edits (0) to Suggested edits (1).
9. PASS - The acceptance/approval explanation was present; the Steps comparison showed grey NOW, IN THE DRAFT and PROPOSED boxes side by side, with New before the added email step and Accept/Reject buttons; Reject produced "Rejected", "No suggestions waiting." and Suggested edits (0), while the document remained marked Approved, version 2. The original screenshot is unavailable in this regenerated copy.
10. PASS - Selected "Client intake coordinator for new family law consults (QA)"; all seven sharing rows and expected tags appeared, together with the own-systems access explanation; Cancel returned to DELA Test Freelancer's profile, and no invitation was sent. The original screenshot is unavailable in this regenerated copy.
11. PASS - (a) Yes: the proposal tag, explanatory text and confirmation clearly distinguished proposed guidance from guidance in use. (b) Yes: the side-by-side boxes and New tag made the added step clear before acceptance. (c) Yes: all seven rows explicitly stated what was shared, conditionally shared, empty or not shared. (d) Minor wording and layout issues remain: past-tense "I added" and the draft label can momentarily suggest an applied change, repeated notices and recommendation cards require extra scrolling, and the QA gig's deadline precedes its proposal closing date.

FAIL LIST
None in the completed browser test. No FAIL screenshots were required.

CONFUSING MESSAGES AND USABILITY NOTES
- Document chat said "I added a final step to email the client a copy of the checklist and kept the rest of the SOP unchanged." This initially sounds applied; the following sentence, "This change is waiting on the \"Suggested edits\" tab.", clarifies that it is still a proposal.
- The comparison label "NOW, IN THE DRAFT" appeared while the document was marked Approved, version 2, and this test had not started a separate draft. The acceptance explanation clarified that accepting would save a new draft, but the current-state terminology could be clearer.
- Long sensitive-data notices repeat above the page content and at input fields. On the document screen, automation and freelancer recommendation cards also sit above the tabs, so the comparison requires substantial scrolling.
- At the browser's existing viewport width, the document tab row required horizontal scrolling to fully reveal its right edge. The two comparison columns themselves were readable.
- The invitation showed Deadline "Dec 2, 2026" and Proposals close "Dec 8, 2026". The closing date is after the delivery deadline. This is a QA gig data inconsistency; the sharing disclosure itself matched the test.

INVITATION SHARING ROWS OBSERVED
- The gig as freelancers see it: Shared.
- The steps for this gig, from your document: Shared; 4 of 4 steps, read only with a watermark naming the freelancer.
- Files attached to this gig: Nothing to share; no files attached.
- Your message: Shared if you write one.
- Your Library, your other gigs and your other documents: Not shared.
- Confidential materials: Not shared.
- Your payment details: Not shared.
The page also stated that an invitation gives no access to the attorney's own systems.

WAITS OVER 60 SECONDS
None observed. Both DELA replies completed within the permitted 60-second window.

BROWSER POP-UPS
None observed. No browser OK/Cancel dialogs opened.

CLEANUP AND FINAL STATE OF THE COMPLETED TEST
- Test firm guidance retired.
- Test personal preference removed.
- Both retired entries remained in Change history as expected.
- The suggested document edit was rejected; no suggestion was accepted and no document approval action was taken.
- Invitation cancelled; no freelancer message or invitation sent.
- Exactly the two specified DELA chat messages were sent.
- No real client information was typed.
- Signed out through Account menu > Sign out. The browser reached /login?action=loggedout and displayed the Member Login form.
- No login details were saved during this test.

REGENERATED BUNDLE CONTENTS
- DELA-test-report.txt
- step-04-approved-guidance.jpg
- README.txt
Missing original evidence: Step 9 and Step 10 screenshots.
```
