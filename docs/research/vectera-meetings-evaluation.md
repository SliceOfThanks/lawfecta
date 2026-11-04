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
