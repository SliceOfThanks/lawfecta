# Getting ready for Live (lawfecta.com)

Checked by Claude on 2026-11-07. Live does not exist yet; nothing here changes the current Lawfecta site. This guide puts in one place what is ready, what Stacey does (in order), and what stays off on Live until a lawyer or a decision clears it. The detailed setup steps are in docs/STACEY_CHECKLIST.md (Parts C and D).

## 1. Where things stand

| Check | Result |
| --- | --- |
| Automatic tests (GitHub "Tests") | Passing on every recent version |
| Every database change applied to an empty database, in order | All 59 apply cleanly (checked on a fresh copy; the one Supabase-only change, the worker schedule, is handled by the push itself) |
| Switches on a new Live copy | Every switch starts Off. Live shows nothing to members until Stacey turns switches on |
| Settings on a new Live copy | Come from the Decision Sheet (config/decisions.json); the push sets Live's own site address (lawfecta.com), its environment name and Stacey as owner |
| The push (Release Control) | Needs Stacey's release password and a code; checks the tests passed for that exact version; applies only the database changes Live does not have yet; switches Live back by itself if a step fails; watches Live for 15 minutes |
| Version recorded for Live | 0.9.2, the first Live candidate, with the fixes from both AI reviews (Release Control on the test site). It replaces 0.9.1 and 0.9.0 |
| AI review of the version | Done for 0.9.0 (GitHub issue #9) and for the fixes (issue #10). Findings fixed or explained in 0.9.1 and 0.9.2 |
| Security scan (GitHub) | High finding fixed on the working branch (it closes when main is updated); Medium finding dismissed by Stacey as intended |

Differences between the test site and a new Live copy that matter:
- **Plan numbers.** On the test site the four attorney plans are linked to Brilliant Directories plan numbers by hand (Free 5, Plus 13, Pro 12, Business 14). On Live none are linked, and the freelancer plans are not linked anywhere yet. Live needs all eight linked to lawfecta.com's own plan numbers before real members come in (step C2).
- **Email.** The test site sends through Brevo. A new Live copy only records email until Brevo is set up there (step C3).
- **Virus scanner.** Off the test site, DELA refuses uploads to Confidential materials until a scanner is set up. Files and the Process Recorder are not affected. This is one of the gates in section 4.

## 2. Secrets Live needs (Supabase > dela-live > Edge Functions > Secrets)

Stacey types each one herself; none ever goes in chat.

| Secret | Needed for | Where the value comes from |
| --- | --- | --- |
| BD_SHARED_SECRET | Signing in from lawfecta.com | Make a new 40-character secret for Live and type the same value into the DELA-Auth widget on lawfecta.com. **Never** the test site's secret: with the same secret, someone who signs up on hirelegalhelp.com could sign in to Live as the lawfecta.com member who has the same number |
| DELA_ORIGINS | Which websites may call DELA | https://lawfecta.com,https://www.lawfecta.com |
| AI_KEY_ENCRYPTION_SECRET | Members' own AI keys | A new random value for Live (never the test site's). Changing it later makes saved member keys unreadable |
| OPENAI_API_KEY | DELA's AI | Lawfecta's OpenAI key for Live (with zero data retention, docs/RUNBOOK.md) |
| ANTHROPIC_API_KEY | Optional: Claude for DELA's AI | Lawfecta's Anthropic key, only if Claude is offered |
| BD_API_KEY | Plan sync and directory listing updates | lawfecta.com's Brilliant Directories API key |
| BREVO_API_KEY | Email and release codes | Brevo |
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | Payments | Stripe **test** keys first; live keys only when live payments are approved |
| VECTERA_API_KEY | Meeting rooms | Vectera |
| CONF_SCAN_URL, CONF_SCAN_TOKEN | Virus scanning of Confidential materials | The scanner chosen in section 4 |
| STAGING_API_URL | The push reports back to the test site | Claude gives it |
| RELEASE_CI_SECRET | The test site reads Live's health | The same value as in the GitHub environment |

## 3. Stacey's steps, in order

A. Set up Live (once): docs/STACEY_CHECKLIST.md steps 11 to 15b. The Supabase project must be in a United States region.

B. Before the first push:
1. Add the secrets in section 2 to dela-live. BD_SHARED_SECRET must be a new one, never the test site's.
1a. Member numbers: hirelegalhelp.com and lawfecta.com number their members separately (member 1234 on one site can be a different person on the other). Everywhere Live asks for a member number (the GitHub variable OWNER_BD_MEMBER_ID, Live's Lawfecta Team and Live's access list), use the number from lawfecta.com's own Brilliant Directories admin > Members. Never copy a number from the test site.
1b. Agent tests (ChatGPT and Claude) run in a separate Chrome profile that is signed in only with the test accounts on hirelegalhelp.com. In Chrome: click your profile picture at the top right > "Add" > name it "DELA tests". Never sign in to lawfecta.com's admin or Live's /dela-admin in that profile, and keep your own owner login in your normal profile.
2. In GitHub, create the environment "live" (checklist step 14).
3. Done 2026-11-07: the ANTHROPIC_API_KEY secret is in GitHub and the AI review of 0.9.0 ran (issue #9).
4. Done 2026-11-07: the code scanning findings are fixed (High) or dismissed (Medium). The High one disappears from the list when main is updated.
5. Run the remaining ChatGPT tests on the test site (docs/PLAN.md, "What needs testing").

C. The first push and right after (only Stacey's account and the access list can see anything):
1. /dela-admin on the test site > Release Control: on version 0.9.2, tick "I tested this version", click "Push to Live", enter the release password and the code.
2. In Live's /dela-admin > Plans: type lawfecta.com's Brilliant Directories plan number next to each of the eight DELA plans.
3. In Live's /dela-admin > Settings: set email.sender to brevo, and alerts.sms_to to your mobile number.
4. In Brilliant Directories on lawfecta.com: create the pages /dela and /dela-admin (logged-in members only) and the widgets DELA-Auth, DELA-App and DELA-Admin, pointing at Live's address (checklist step 17).
5. In Live's /dela-admin > Switches: turn on the switches in section 5 for "Lawfecta Team only", try them yourself, then "Access list".
6. Finish section 6 (real payments), then add beta members to Live's access list in small groups.

## 4. Gates that are decisions, not code (each switch stays Off on Live until cleared)

| Gate | Keeps off | Who clears it |
| --- | --- | --- |
| A lawyer reviews the agreement terms template and the chargeback rule. **Required before the beta** (the beta uses real payments, section 6) | live_payments (real money) | Lawyer, then Stacey turns it on |
| A lawyer reviews the confidentiality clause, privacy policy and data handling, and a virus scanner is chosen | confidential_materials | Lawyer and Stacey |
| Counsel approves the standing arrangement wording | auto_repeat_hiring | Counsel |
| Consent wording for recording | meeting_recording, transcript_training_use | Lawyer |
| Automatic acceptance after 7 silent days | admin_acceptance_timeout | Lawyer and Stacey |
| The Pro trial answers (8 questions) | trials | Stacey |
| The usage limits test passes | usage_limits_enforced | Stacey's test |
| Google app review | calendar_sync | Google |
| Later or not in the MVP | tech_catalog, public_gigs, multiple_hires, onboarding_widget, engagement_export, consultation_export_grant, agency_extra_seats | Stacey decides later |
| Before real payments, so **before the beta** | Point-in-time recovery on dela-live, the uptime monitor, a restore drill (docs/RUNBOOK.md) | Stacey, with Claude's steps |

## 5. Switches to turn on for the beta (each after its test passed on the test site)

Turn on first for "Lawfecta Team only", check, then "Access list".

- **Accounts and profiles:** profiles, attorney_verification, freelancer_verification, bd_profile_sync (writes to the directory listing; try it on your own listing first), profile_documents
- **Documents:**
  - playbook_library, document_standard, document_conversion, document_images
  - recorder, scribe_import
  - approved_view (its test is still waiting)
- **AI:**
  - ai_generation, byok, voice_input, chat_assistant, conduct_review, member_insights, mcp_connector
  - ai_helpers (its tests passed with fixes; a re-run of two steps is optional)
- **Files:** file_uploads
- **Gigs and hiring:**
  - flex_gigs, talent_search, gig_chat, meetings
  - engagements, milestone_check, milestone_funding (Stripe test mode while testing; real payments for the beta once section 6 is done)
- **After the work:** reviews, past_client_reviews, bench, bench_suggestions, member_webhooks
- **Getting started:** guided_setup, automate_delegate
- **Agencies:** agency_team, agency_bench, agency_hiring, agency_subcontracting
- **Monthly work:** recurring_engagements (its test is still waiting)
- **Look:** appearance_choice (its test is still waiting)

## 6. Payments: test mode for testing, real payments for the pilot/beta (Stacey, 2026-11-07)

Testing (the test site, and Live before any real member is invited) stays in Stripe test mode. The pilot/beta runs with real payments, so these must be done before the first beta member is invited:
1. A lawyer reviews the agreement terms template and the chargeback rule (and the confidentiality clause if Confidential materials are on).
2. Stripe in live mode: Lawfecta's Stripe account verified for live payments with Connect, and the live STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in dela-live's secrets (docs/STRIPE_SETUP.md, the same steps with the live keys).
3. Point-in-time recovery turned on for dela-live, the uptime monitor running, and one restore drill done (docs/RUNBOOK.md).
4. One real payment end to end on Live by Stacey (a test gig between her own two accounts, then a refund), with Claude watching the Payments tab. It cannot be tiny: the smallest engagement is $250 plus the 5% client fee, and Stripe keeps its card processing fee when a payment is refunded, so the test costs that fee.
5. Then Stacey turns on live_payments in Live's /dela-admin > Switches, and invites the first beta members.
