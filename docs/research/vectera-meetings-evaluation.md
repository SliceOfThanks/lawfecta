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
