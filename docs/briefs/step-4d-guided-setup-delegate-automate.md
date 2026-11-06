# Feature brief: Guided setup, and "Automate or delegate" for a playbook

Step: 4d   Spec references: Step 2 (playbooks), 2d (document standard: SOP, KPIs, RACI), 3 (profiles, firm profile), 4 (gigs, tech catalog)
Status: approved by Stacey 2026-11-06 (answers below). Build C and B now; A after the MVP launch.

Stacey asked for three things (2026-11-05):
- **A. An onboarding widget** for attorneys and freelancers. It goes at the end of Phase 1, after the MVP launch.
- **B. A guided sequence for attorneys on one screen:** create a playbook, teach DELA about the firm, post a gig, and so on, without moving between tabs.
- **C. "Automate or delegate".** DELA reviews a playbook and recommends specific sections (never the whole playbook) to:
  - automate with a tech tool, or
  - delegate to a freelancer.

  For a section to delegate, DELA walks the attorney through:
  1. the SOP for that task
  2. its metrics and KPIs
  3. posting the gig

## What exists today that this reuses
- Playbooks and the document standard: SOP, Workflow, Playbook and Policy, with sections, RACI, KPIs, a self-check, "split" into smaller SOPs, and exports.
- Steps can be marked "attorney decides", meaning they need legal judgment.
- The firm profile (systems the firm uses, practice areas) and the Files tab.
- The Lawfecta tech catalog, with partner labels. DELA already refuses to name tools outside the catalog. This was tightened after the "Microsoft 365" and "Google Workspace" answers in track B.
- Posting a gig from an approved document, with milestones, and the milestone check scoring against a rubric.
- Import from Scribe and the Process Recorder, for a first playbook.
- A "one clear next step" card on engagements.

## C. "✦ Automate or delegate" (the core of this brief)

### How it would work
1. On any approved SOP, Workflow or Playbook, the attorney clicks "✦ Find what to automate or delegate".
2. DELA reads the document section by section. It returns a short list of specific step groups (for example "Steps 3 to 5: collect and log intake forms"). Each one is marked as one of:
   - **Automate.** A tool from the Lawfecta tech catalog, what it would do in those steps, whether the firm already has it (from the firm profile), and a partner label where it applies.
   - **Delegate.** Why the task suits a freelancer: repeatable, clear inputs and outputs, no legal judgment. Also the skills needed and a rough number of hours.
   - Each one has a plain "Why" line and an estimate of time saved per month (from the attorney's answer to "How often does this run?").
3. **What it never recommends:**
   - delegating a step marked "attorney decides"
   - delegating anything that needs a license or legal advice
   - a tool outside the catalog

   These are checked by code after the AI answers, not only asked of the AI.
4. **Delegate path, on one screen, as numbered steps the attorney can go back to:**
   1. Confirm which steps to delegate (tick or untick).
   2. DELA drafts a focused SOP for just that task. It uses the document standard, and links back to the parent playbook. The parent's steps then say "Delegated: see SOP ...".
   3. Metrics and KPIs: turnaround time, accuracy, a quality checklist and what "done" means. These become the milestone check's rubric, so the gig is scored against them.
   4. DELA's self-check and the attorney's approval.
   5. The gig draft: budget range, deadline and milestones from the KPIs. Then "Post the gig".

   Progress is saved, so the attorney can stop and come back.
5. **Automate path:**
   - "Add this tool to the step", which updates the step's system and the firm profile.
   - "Open in the tech catalog".
   - Optionally, "Hire a freelancer to set it up", which starts the delegate path with a setup task.
6. **Credits.** One review per document version, reused until the document changes. It uses the attorney's credits, or their own key (BYOK).

### How it could go wrong
- **The AI recommends delegating legal judgment** (a UPL risk). Code blocks "attorney decides" steps, and every delegated SOP keeps the supervising attorney as Accountable (A) in the RACI.
- **A tool not in the catalog, or a made-up feature.** Tools are checked against the catalog, and each tool's description comes from the catalog, not the AI.
- **Partner bias.** Partner tools are labeled "Lawfecta partner" and never ranked first only for being partners.
- **Too many recommendations.** At most 5, ranked by time saved.
- **The playbook changes after the review.** The review is tied to a version and marked "out of date" when a new version is approved.
- **Client information in a playbook.** The existing scrub and image checks still apply before anything becomes a gig.

## B. The guided sequence for attorneys (one screen)
A "Get set up" screen with steps in one column. Each step opens in place, so there is no tab hopping:
1. **Your profile and verification.** License and firm details.
2. **Teach DELA about your firm.** Firm profile: practice areas, the systems you use, your house style, and templates added to Files.
3. **Your first playbook.** Three ways:
   - import from Scribe
   - record a process
   - start from a starter document
4. **✦ Find what to automate or delegate** in that playbook (part C).
5. **Post your first gig** from the delegated SOP.
6. **Invite freelancers** from the matches.

Every step has "Skip for now". Progress shows on Home ("3 of 6 done") until all six are done or dismissed.

## A. Onboarding widget (end of Phase 1, after the MVP launch)
- **Attorneys:** the guided sequence in B, shown right after sign-up.
- **Freelancers**, step by step, each skippable:
  1. Profile basics and headline.
  2. Verification (license or LinkedIn).
  3. Skills, practice areas and tech tools.
  4. Availability and usual hours.
  5. Teach DELA about your work (your writing style and how you work, so drafts and proposals sound like you).
  6. Payouts (Stripe).
  7. A "visibility checklist" showing what makes them match-ready and ranked higher.
  8. A practice proposal with DELA's tips.
- **Gentle reminders by email** on day 2 and day 7 for steps not done (a setting that can be turned off).
- **The admin area shows the activation funnel:** how many people finish each step.

## A note on the words "train the AI"
DELA does not train an AI model on a firm's content, and the security page will promise that (step-6d). What DELA does is read the firm's profile, style and library each time it writes, and only for that firm. Suggested wording on screens: "Teach DELA about your firm", never "train". That keeps the screens and the security page consistent.

## Settings and switches it uses
New settings:
- automate.max_recommendations 5
- onboarding.reminder_days [2, 7]
- ai.credits.automate_review

New switches, off until tested:
- automate_delegate
- guided_setup
- onboarding_widget

## Questions to make it better (suggested answers in brackets)
1. **When should B and C be built?** [C and B before the beta launch, because they lead attorneys straight to posting gigs. The onboarding widget (A) waits until after the MVP launch, as you asked, and reuses B for attorneys.]
2. **Should "Automate or delegate" also run on its own on new playbooks?** [No. The attorney clicks it. A small hint on each approved playbook invites them.]
3. **Time saved.** Should DELA ask "How often does this run, and how long does it take?" to estimate hours saved? [Yes. Two optional boxes, and DELA estimates when they are empty.]
4. **Should DELA suggest a budget for the delegated gig?** [Yes, a range based on the hours and the freelancer rates on Lawfecta, clearly labeled as a suggestion.]
5. **Automate path.** Offer "Hire a freelancer to set it up"? [Yes.]
6. **Partner tools.** Show a "Lawfecta partner" label? [Yes, and never rank by partnership.]
7. **Freelancer onboarding.** Include a practice proposal that is not sent? [Yes.]
8. **Reminder emails for unfinished onboarding?** [Yes, day 2 and day 7, then stop.]
9. **Firm staff.** Can managers run "Automate or delegate", or only attorneys? [Attorneys and managers can run it. Only attorneys approve the delegated SOP and post the gig.]
10. **Wording.** Use "Teach DELA about your firm" instead of "train"? [Yes.]

## Success looks like
- On a 12-step SOP, DELA suggests 1 to 5 specific step groups, never the whole document.
- It never suggests delegating an "attorney decides" step, and never names a tool outside the catalog.
- Choosing "Delegate" leads, on one screen, to an approved SOP for just those steps, with KPIs, the parent playbook linked, and a posted gig whose milestone check uses those KPIs.
- The guided setup can be skipped at any step and picked up later from Home.
- Freelancer onboarding ends with the person match-ready.
- The admin funnel shows each step's completion.

## Stacey's answers (2026-11-06)

1. **When to build.** C ("✦ Automate or delegate") and B (the "Get set up" screen) before the beta launch. A (the onboarding widget) at the end of Phase 1, after the MVP launch; for attorneys it reuses the B screen. Reason: B and C lead attorneys straight to posting their first gig, and gigs are what the beta needs.
2. **Running it on its own.** Never. The attorney clicks "✦ Find what to automate or delegate". Every approved SOP, Workflow or Playbook shows a small hint card above the document: "DELA can find steps in this playbook to automate or hand to a freelancer." The card has the "✦ Find what to automate or delegate" button and a "Dismiss" link. Reason: each review uses credits, so the attorney decides when to spend them.
3. **Time saved.** Two optional boxes: "How often does this run?" (a dropdown: daily, weekly, monthly, quarterly) and "How long does it take each time?" (in minutes). If both are empty, DELA estimates and labels the numbers "Estimated by DELA". Each recommendation shows "Time saved: about X hours a month".
4. **Suggested budget.** Yes. On the gig draft step, DELA suggests a range from the estimated hours and the rates freelancers on Lawfecta charge for that skill, labeled "Suggested budget. You set the final amount." The gig draft also shows the 5% client-side fee, so the attorney sees the full cost before "Post the gig".
5. **"Hire a freelancer to set it up".** Yes, on the Automate path. It starts the Delegate path with a setup task for that tool, and matches freelancers who list that tool in their tech skills first.
6. **Partner tools.** A "Lawfecta partner" label. Ranked only by time saved; being a partner never moves a tool up.
7. **Practice proposal (A, freelancer onboarding).** Yes. Step 8 is a practice proposal for a sample gig, never sent. DELA gives tips on the draft. This one run is free on every plan, Free included, and uses no credits.
8. **Reminder emails (A).** Day 2 and day 7, then stop. Each email names only the steps not done and links straight to the next one. Subject lines in sentence case. Admins turn reminders off with the onboarding.reminder_days setting.
9. **Firm staff.** Attorneys and managers can run "✦ Find what to automate or delegate" and draft the delegated SOP. Only an attorney can approve the delegated SOP and click "Post the gig". The supervising attorney stays Accountable (A) in the RACI on every delegated SOP.
10. **Wording.** Screens say "Teach DELA about your firm" (attorneys) and "Teach DELA about your work" (freelancers). The word "train" never appears on any screen, email or help text about firm content.

**Plan tie-ins for freelancer onboarding (A).** Step 7, the visibility checklist, shows Free plan freelancers that DELA Member Match starts on Plus, with an "Upgrade to Plus" button. On Plus and higher, it shows what improves their placement in DELA Member Match.

### Build notes (Claude, 2026-11-06)
- While the tech catalog switch is off (the MVP), the Automate path names only tools the firm already lists in its firm profile, the same rule Ask DELA follows. With the catalog on, catalog tools are allowed too, with their descriptions and partner labels from the catalog.
- "The rates freelancers on Lawfecta charge": Lawfecta has no hourly rates yet, so the suggested range uses the settings automate.rate_low_cents and automate.rate_high_cents (status O) until enough hires exist.
- "Only an attorney" means an attorney with a verified license (the same check as posting a gig).
- "The parent's steps then say Delegated: see SOP ...": changing the parent would make it a draft that needs approving again, so the parent is not changed. Its "✦ Automate or delegate" card lists each delegation instead ("Delegated: Steps 1 to 3, ... See SOP ..."), and the delegated SOP links back to the parent.
- "Add this tool to the steps" does change the document, so it saves a new version that the attorney approves, as every change is.
