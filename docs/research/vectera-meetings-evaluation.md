# Can Vectera host DELA meetings? (2026-11-04, no pricing)

The need (Stacey 2026-11-04): when an attorney books a freelancer, they meet on a Lawfecta-branded address (CNAME), join on their own with nobody from Lawfecta present, a note taker joins, DELA gets the transcript (to learn about both people and help with hiring after the meeting), and DELA catches talk or chat about paying off the platform.

Source: Vectera's own help center and security pages, read through search excerpts (this session's network blocks vectera.com, so pages could not be opened directly).

| Need | Vectera | Notes |
|---|---|---|
| DELA creates a room per booking | Yes | API: POST /api/v2/meetingRooms. API keys need an "API plan" requested from Vectera. |
| Both join by link, no account, nothing to install | Yes | Guest links with an access key open locked rooms. |
| Nobody from Lawfecta joins | Partly | Every room has an owner on Lawfecta's Vectera team. Whether a room runs with only guests is not documented. |
| meet.lawfecta.com (CNAME) and our branding | Yes | Custom domain and customization in team settings. |
| Recording | Partly | Saved in the host's browser (Chrome, Edge, Opera plus an extension), then downloaded or uploaded by hand. |
| Transcript and notes (AI Notes) | Partly | Only a host starts it; listed in a higher plan. |
| Our own note taker bot joins | Not found | Calls are peer to peer; no Recall.ai support found. |
| Transcript, recording and chat sent to DELA automatically | Not found | No webhooks or transcript or chat export found in the API. |
| Catch off-platform payment talk | Not possible as documented | Needs the transcript and chat text on our server. |
| Consent notice | Partly | A notice shows when transcription starts. DELA must collect consent from both people first (our rule). |
| Security | Encrypted peer to peer, GDPR, HIPAA with a BAA. ISO 27001 only for Google Cloud hosting. SOC 2 and data location unknown. |

Verdict: Vectera covers branded rooms and guest links, but not the core of this need. As documented, it cannot hand DELA the transcript and chat automatically, a note taker cannot join without a host, and so DELA cannot learn from meetings or catch off-platform payment talk.

Questions for Vectera (all 11 must be "yes" or answered for it to work):
1. Which plan includes API keys, the custom domain and AI Notes?
2. Can a room run with only the two guests, no team host, and still record and transcribe?
3. Can recording or AI Notes start automatically, from the API or a room setting?
4. Can we get recordings, transcripts and chat messages through the API? Which endpoints and formats?
5. Do you offer webhooks (meeting started or ended, recording ready, transcript ready)?
6. Can a room be embedded in our web app (iframe)? Which domains?
7. Is there a consent notice before recording, and can we change its wording?
8. Can outside bots join (Recall.ai or our own)?
9. Where are data, chat, recordings and transcripts stored? Can we choose the US?
10. SOC 2 or ISO 27001 for Vectera itself, a subprocessor list, a DPA?
11. How long are transcripts and recordings kept, and can we delete them through the API?

If Vectera says no: video services built for apps (for example Daily, Whereby Embedded or LiveKit) let our server create rooms on our own domain, start recording and transcription without a host, and send the transcript to DELA when the meeting ends. Meeting chat can live inside DELA, where DELA already reads it. To compare when Step 5 (booking and meetings) starts.

## Update 2026-11-13: Vectera's API, read from their own pages

Read in a browser on Stacey's Mac: the help articles "Overview: How to integrate Vectera in your app or website?", "Connecting and authenticating with Vectera REST API", "Guide: Generate meeting rooms", the API reference at https://www.vectera.com/docs/api/v2/reference/, and the pricing page https://go.vectera.com/pricing.

What they say:
- API address: https://www.vectera.com/api/v2. Every request carries the header "Authorization: Token <token>". 100 requests a minute per user.
- The token: "API keys are part of the Vectera API plan. Get in touch to learn more." and "Request an API token at support@vectera.com". Once given, it shows "at the bottom of your profile in the Vectera dashboard". The pricing page lists "Full API access" under Enterprise; the help articles are marked Pro, Business, Enterprise. Which plan Lawfecta needs is for Vectera to say.
- A room: POST /meetingRooms with "key" or "preferredKey" (the room's address), optional "ownerId", "publicAccessLevel" and "teamAccessLevel" (should_knock, can_always_join, is_host). The answer has "id" and "url" (a public link for guests).
- A private link: POST /permissions with "meetingRoomId" and "accessLevel" (is_host or can_always_join). The answer has "url" and a 30-character "accessKey". Anyone holding that link can enter at any time.
- Custom domain (meet.yourdomain.com): listed under the Business plan.
- AI notes (called Smart Summary until August 2026): transcription and summary, on the Business plan, with unlimited transcription hours and at most 6 hours per transcription. The API reference lists recordings, transcriptions with action items, and meeting room sessions.
- Webhooks exist, but only for bookings made in Vectera's own scheduler (appointment.created, appointment.rescheduled, appointment.cancelled). None for "meeting ended" or "transcript ready".
- Nothing on any page read says an outside note taker bot (Happy Scribe, a personal note taker) can join a Vectera room.

What changed in DELA: the connection in supabase/functions/api/lib/meetings/meet.ts was written before these pages could be read and used the wrong header and field names. It now follows the reference: one room per meeting named "lawfecta-" plus 20 characters of the meeting number, public access "should_knock", then a host link for the attorney and an always-join link for the freelancer. The setting meeting.vectera_api_base is https://www.vectera.com (migration 0115). Not yet proven against the real service: that needs the token.

Still open from the 11 questions above: 2 (a room with only guests: the two private links are meant to cover this, to be proven), 3, 4 (recordings and transcriptions are in the API; the exact fields and whether chat is included are not confirmed), 5 (no meeting-ended webhook found), 6, 7, 8 (nothing found), 9, 10, 11.

## GoBrunch compared (2026-11-13, Stacey: "evaluate if gobrunch would be better - i have a lifetime plan there with api access")

Read in a browser on Stacey's Mac: https://gobrunch.com/plans, the knowledge base at https://knowledgebase.gobrunch.com/ (Zapier, iFrame embedding, recording, secret keys, live captions), and GoBrunch's page on Zapier.

What GoBrunch's pages say:
- What it is: virtual spaces with rooms and seats, for webinars, classes, co-working and communities. "One Single Link Forever for your Meetings."
- API: the pricing page lists "API" and "Custom Subdomain" under Enterprise only. No API reference is published. The only programmatic piece documented is a "User Key" and "Password Key" made on https://gobrunch.com/myaccount for Zapier, whose single action is "Register to Space" (register a person for an event). The Zapier article says meetings are not supported by it. Nothing documented creates a room, a private link or a key from a server.
- Private rooms: a room can be set Private with a "secret key" typed by hand in Room Settings. Attendees type the key to enter. No per-person links.
- Embedding: a room can sit in an iFrame on your own site, only with a custom subdomain that matches the site's main domain; screen sharing may not work in every browser inside the frame.
- Recording: an organizer or moderator starts it by hand from the room's menu; it records their browser tab; not available in Safari; downloaded by hand or shared by link. Nothing about automatic recording, transcripts or fetching recordings from a server.
- Captions: the article tells each person to turn on their own browser's Live Caption. No transcript is produced.
- Outside note takers: nothing found.

Against DELA's needs:
| Need | Vectera | GoBrunch |
|---|---|---|
| DELA makes a private room for each booking | Yes, documented (POST /meetingRooms) | Not documented |
| A private link for each of the two people | Yes, documented (POST /permissions) | No; one room link plus a typed secret key |
| Two people meet with nobody from Lawfecta present | Likely (host link for the attorney); to prove | Recording and moderation need an organizer or moderator |
| Lawfecta's own address | Business plan | Custom subdomain: Enterprise on the pricing page; Stacey's lifetime plan may differ |
| Recording | Local and cloud; in the API | By hand, by a moderator, tab recording |
| Transcript or notes | AI notes on the Business plan; transcriptions in the API | None; browser captions only |
| DELA fetches the transcript | Possibly (transcriptions in the API; no "ready" webhook) | No |
| Cost | A monthly plan per host, plus the API plan | Already paid (lifetime) |

Verdict: GoBrunch is not a better fit for DELA's meetings. It is built for standing rooms that a host runs, and nothing published lets DELA create a private room per booking or get a transcript. Its strength for Lawfecta would be something else: community rooms, webinars, office hours or training, where one standing room and a host are what you want. Unknown: what "API access" on Stacey's lifetime plan covers. If GoBrunch has unpublished API documentation for her plan that creates rooms and keys, this verdict should be looked at again.

## VideoSDK compared (2026-11-13, Stacey: "i also have this as a lifetime deal, see it would work better: https://www.videosdk.live/")

Read in a browser on Stacey's Mac: the API reference at https://docs.videosdk.live/api-reference/realtime-communication/ (introduction, Create a Room, Fetch a Post Transcription & Summary, Webhook Verification), the Prebuilt overview, and https://www.videosdk.live/pricing.

What VideoSDK's pages say:
- What it is: video calling built to be put inside another app. No Lawfecta staff, hosts or seats involved.
- A room: POST https://api.videosdk.live/v2/rooms. Options: a webhook address with the events wanted; "autoCloseConfig" (end the session after N minutes and, if wanted, allow only one session per room); "autoStartConfig" (start recording by itself, with transcription and a summary written to a prompt we give).
- Who gets in: our server signs a token per person with our API key and secret (permissions allow_join or ask_join, and it can be tied to one room and one participant). No public link that a stranger could use.
- The meeting screen: a ready-made one ("Prebuilt") that is embedded in our own page, or our own screen built on their SDK. Up to 50 people in a room.
- Recording: cloud recording, started by itself or by API; can be stored in our own S3, Azure or GCP bucket; recording encryption listed.
- Transcript and summary: after the call (and live if wanted). GET /ai/v1/post-transcriptions/{id} returns links to the transcript as txt, json, srt, vtt and to the summary. 100+ languages.
- Webhooks: session-started, session-ended, participant-joined, participant-left, recording-*, transcription-started, transcription-stopped, each signed (RSA-SHA256, header videosdk-signature, public key published).
- Price on the public page: pay as you go. Video HD $0.004 per participant minute, recording $0.015 per recorded minute, transcription after the call $0.004 per minute, summary $0.005 per request, storage $0.003 per stored minute per month. Data kept 3 days (free) or 7 days (pay as you go). Security certifications (SOC 2 Type 2, ISO 27001, HIPAA, GDPR) are listed as add-ons. What Stacey's lifetime deal includes is not on any public page.

Against DELA's needs:
| Need | Vectera | VideoSDK |
|---|---|---|
| DELA makes a private room for each booking | Yes | Yes |
| Each person gets in privately | A private link per person | A signed token per person, tied to the room; no link to pass around |
| Two people meet with nobody from Lawfecta present | Likely; to prove | Yes, by design |
| On Lawfecta's own address | Needs their Business plan and a custom domain | The meeting sits inside a DELA page, so it is on Lawfecta's address already |
| Recording only when both people consented | A person must start it | DELA starts it by API, only when both ticked consent |
| Transcript and summary | AI notes on the Business plan; fetching to confirm | Yes, documented, fetched by API |
| DELA is told when the meeting ends and the transcript is ready | No such webhook found | Yes, signed webhooks |
| Attendance proof (who joined, when) | Sessions in the API | participant-joined and participant-left webhooks |
| Catch off-platform payment talk | Only if transcripts can be fetched | Possible: the transcript reaches DELA |
| An outside note taker (Happy Scribe, a personal one) | Nothing found | Not needed for the transcript; nothing found about outside bots joining |
| Cost | Monthly plan plus API access, to ask | Lifetime deal already held; what it covers to check |
| Work to build | Small (done, unproven) | Larger: a meeting page inside DELA, tokens, webhooks, storing transcripts |

Verdict: VideoSDK fits DELA's meetings better than Vectera and far better than GoBrunch. It answers "yes" in its own documentation to the things Vectera could not confirm: no host, automatic recording and transcript, and telling DELA when they are ready.

To settle before building:
1. What the lifetime deal includes: minutes per month, recording, transcription, summaries, storage, how many calls at once. This is on Stacey's VideoSDK dashboard or deal page.
2. Data is kept 3 to 7 days on the public plans, so DELA must copy transcripts (and recordings, if kept at all) to its own storage. Transcripts of attorney and freelancer calls may contain client matters, so the sensitive-data rule and retention need Stacey's decision.
3. The security certifications are add-ons on the public page; ask what applies to the lifetime deal.
4. The meeting screen loads VideoSDK's script inside a DELA page. The version must be pinned, and the Brilliant Directories page must allow camera and microphone.
5. "Meetings stay on Vectera" is Stacey's decision of 2026-11-04 (docs/PLAN.md). Changing provider is her decision.
