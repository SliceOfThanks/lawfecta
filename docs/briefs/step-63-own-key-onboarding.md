# Feature brief: own AI key in onboarding

Step: 63   Spec references: step 2a (AI keys), the Lapt workflow handoff of 2026-11-19 (it said to drop own keys; Stacey overruled it)
Status: built in acceleration mode. Stacey 2026-11-20: "We need BYOK. On onboarding it should ask them if they use ChatGPT or Claude and if so help them get API key and add it."

## Who
Every member, attorney and freelancer, on their first visits.

## What
Home shows one card, "Do you already use ChatGPT or Claude?", with four answers: "Yes, ChatGPT", "Yes, Claude", "No, use Lawfecta's AI" and "Not now".
- A yes opens Settings with a card "Get your OpenAI (ChatGPT) key" or "Get your Claude (Anthropic) key": five numbered steps, each with the link to the exact page (opening in a new tab), then the box to paste the key and "Save and test".
- "No" is remembered and the card does not come back.
- "Not now" hides the card for that visit.
Settings also has "Show me the steps to get a key" for anyone who wants it later.

## Where
- Home, right under the page heading.
- Settings, card "Which AI DELA uses" and below it.

## When
From the first visit until the member answers or adds a key. Never again after that.

## Why
Most members do not know that a ChatGPT or Claude subscription and an API key are two different things, or where to get the key. Without help they never add one, and every request runs on Lawfecta's AI.

## How it could go wrong
- A member thinks their ChatGPT Plus or Claude Pro subscription covers it: step 2 of each list says it does not, and that the key is billed on its own by use.
- A key is sent by email or pasted in chat: the card says never to send the key to anyone, the Lawfecta Team included.
- A wrong key is saved: as before, DELA tests the key first and saves it only if it works. A Claude key pasted under OpenAI is caught.
- The question nags: one answer ends it, and it never shows to someone who already has a key or is covered by a firm key.
- The provider changes its pages: the links and button names may go out of date. Listed in the pilot checks.
- DELA silently uses Lawfecta's key: unchanged rule, it never does.

## Settings and switches it uses
The existing "byok" switch. With it off, nobody is asked. Migration 0145 adds one small table for the answer.

## Questions, and how Claude answered them (acceleration mode)
1. Where is "onboarding"? **Home, for both sides**, because both land there first. The attorney's "Get set up" list keeps its six steps.
2. Ask once or keep asking? **Once per workspace.** "Not now" brings it back on the next visit.
3. Someone uses both? **They pick the one DELA should use**; they can change it in Settings.
4. Can DELA fetch the key for them? **No.** Only the member can create a key in their own OpenAI or Anthropic account. DELA shows each step and link.
5. Members covered by a firm key: **not asked.**
6. Gemini or others? **No**, only the two providers DELA supports.

## Success looks like
- A new member sees the card on Home. "Yes, Claude" opens Settings with the five Claude steps and the paste box set to Claude.
- Pasting a working key and "Save and test" shows the key card with its last 4 characters, and the steps close.
- "No, use Lawfecta's AI" removes the card for good.
