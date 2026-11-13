# Feature brief: meetings on VideoSDK, inside DELA

Step: 25   Spec references: Stacey 2026-11-13 ("Just use VideoSDK - best option even if paid"); replaces "Online meetings: Vectera" (2026-10-25, 2026-11-04). Comparison: docs/research/vectera-meetings-evaluation.md.
Status: part 1 built with the defaults below; part 2 waits for answers

## Who
Attorneys and freelancers who have a meeting on a gig or an introductory call. The Lawfecta Team sees the state in the admin area.

## What
Part 1 (built): DELA makes a VideoSDK room for each booking. At the meeting time each person presses "Join the meeting" on the meeting card and the room opens inside the DELA page, over the whole window. Nobody from Lawfecta is in the room. VideoSDK tells DELA when the session started and ended and who joined and left; that is kept with the meeting, and when both people joined the meeting's attendance shows evidence.
Part 2 (not built): recording with consent from both people, the transcript and summary brought into DELA, and what DELA does with them.

## Where
- "Your meetings": the "Join the meeting" button on a meeting card, from shortly before the start (setting meeting.join_early_minutes) until 30 minutes after the end.
- The room: a dark full-window layer with a bar on top, "Lawfecta meeting: NAME | TITLE", the line "Keep all work, contact and payment on Lawfecta." and the button "Leave and go back to DELA". Under it VideoSDK's ready-made meeting screen: a check of camera and microphone first, then the call with screen sharing.
- Admin area, "Meetings and messages": says whether VideoSDK is connected.

## When
The room is made when the meeting is confirmed. It can be joined only inside the join window. Leaving returns to DELA.

## Why
VideoSDK is made to sit inside another app: a room per booking, no host, and reports back to DELA. It is the base for transcripts, attendance proof and catching off-platform payment talk.

## How it could go wrong
- Someone outside the meeting wants in: the room number is given only to the two people, only inside the join window, by the same rule that shows them the meeting. There is no link to forward.
- The ready-made screen uses VideoSDK's public API key in the browser. To stop others using Lawfecta's account, the key's allowed website must be set in VideoSDK (Stacey's step). A stronger form, a signed pass per person with our own meeting screen, is possible later.
- A forged report "both joined": reports are accepted only with the address key (made from the secret) and VideoSDK's signature; a participant DELA does not know is recorded but does not count.
- The keys are missing or wrong: meetings show "Meeting room not connected yet"; the admin area says so; the room job retries.
- Credit runs out at VideoSDK: rooms may fail. To watch; Stacey adds credit ("Add Credit") before members book.
- In-call chat would escape DELA's off-platform check, so it is off, with polls, whiteboard and recording.
- The camera or microphone is blocked by the browser: VideoSDK's first screen shows it; the member can leave and come back.
- A new version of VideoSDK's screen breaks something: the version is pinned in Settings (meeting.videosdk_prebuilt_url) and changed only after a test.

## Settings and switches it uses
meetings.provider ("videosdk"; "vectera" brings the old connection back), meeting.videosdk_api_base, meeting.videosdk_prebuilt_url, meeting.join_early_minutes, the meetings switch. Secrets Stacey enters in Supabase: VIDEOSDK_API_KEY, VIDEOSDK_SECRET. No prices or limits are set in DELA.

## Questions to make it better
1. Recording: should meetings be recorded at all when both people consent, or only transcribed (audio to text, no video kept)?
2. Transcripts may hold client matters. How long should DELA keep a transcript, and who may read it: both people, or only the Lawfecta Team for safety checks?
3. Should DELA's AI read transcripts to suggest next steps and to flag talk about paying outside Lawfecta? Members would be told before they consent.
4. Should the meeting screen carry Lawfecta's logo and colors (VideoSDK allows branding)?
5. Is in-call chat off the right choice, or should it be on with a notice?

## Success looks like
- Attorney and freelancer: at the meeting time, "Join the meeting" opens the room inside DELA; both see and hear each other; screen sharing works; "Leave and go back to DELA" returns to the meeting card.
- Misuse: a third member asking for the room gets nothing; outside the join window the room does not open.
- Owner: the admin area says "VideoSDK is connected".
- Check the results: the meeting's events list who joined and when; attendance reads "evidence received" after both joined.
