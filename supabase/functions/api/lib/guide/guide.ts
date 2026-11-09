// Step 13 (docs/briefs/step-13-dela-guide.md): the DELA guide on the Dashboard. The opening message and its buttons are
// built here from the member's real state (no AI, instant, free). A typed question goes to the AI, which may only
// offer one of the buttons already on screen; code checks that before anyone sees it.
import { STARTERS } from "../documents/model.ts";

export type Choice = { id: string; label: string; link?: string; starter?: string; gig?: string };
export type GuideState = { step: string; side: "attorney" | "freelancer"; facts: Record<string, any> };

const q = (s: unknown) => "“" + String(s ?? "").slice(0, 120) + "”";
const n = (x: unknown) => Number(x) || 0;
const plural = (k: number, one: string, many: string) => k + " " + (k === 1 ? one : many);

// Tasks that are good to hand to a freelancer first (low risk, clear steps), in order of how often firms delegate them
const DELEGABLE = ["doc-review", "int-inquiry", "eng-onboard", "mat-open", "eng-letter", "cls-close", "bil-invoice", "adm-hire"];

// Three suggestions, skipping the parts of the practice the firm already documented
export function pickStarters(lifecycles: string[] = [], limit = 3): Array<{ id: string; title: string }> {
  const have = new Set(lifecycles);
  const all = DELEGABLE.map((id) => STARTERS.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s && !s.high_risk);
  const fresh = all.filter((s) => !have.has(s.lifecycle));
  return (fresh.length >= limit ? fresh : [...fresh, ...all.filter((s) => !fresh.includes(s))]).slice(0, limit).map((s) => ({ id: s.id, title: s.title }));
}

const FIELD_WORDS: Record<string, string> = {
  first_name: "your first name", last_name: "your last name", headline: "a headline", summary: "a short summary", practice_areas: "practice areas",
  skills: "skills", software: "the software you use", timezone: "your time zone", capacity_hours_week: "hours you can take on each week", rate: "your rate",
  states_excluded: "states you do not work in", experience_years: "years of experience", photo: "a photo", everything: "your profile",
};
export const fieldWords = (k: string) => FIELD_WORDS[k] ?? k.replaceAll("_", " ");
const listWords = (xs: string[]) => xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];

export function guideMessage(s: GuideState): { text: string; choices: Choice[] } {
  const f = s.facts ?? {};
  if (s.side === "attorney") {
    const og = f.open_gig ?? {}, dg = f.draft_gig ?? {}, dp = f.draft_playbook ?? {}, ap = f.approved_playbook ?? {}, dl = f.delegation ?? {};
    const tasks = (lim: number) => pickStarters(f.lifecycles ?? [], lim).map((t) => ({ id: "start_playbook", label: "Draft: " + t.title, starter: t.id }));
    switch (s.step) {
      case "review_proposals":
        return { text: plural(n(og.proposals), "proposal", "proposals") + " arrived for " + q(og.title) + ". Compare them side by side and choose one.",
          choices: [{ id: "open_gig", label: "Compare the proposals", link: `/dela?tab=projects&gig=${og.id}&view=proposals` }] };
      case "invite":
        return { text: "Your gig " + q(og.title) + " is live, and " + plural(n(og.matches), "freelancer fits", "freelancers fit") + " it. Invite the best ones. Invited freelancers usually answer first.",
          choices: [{ id: "open_gig", label: "See who fits", link: `/dela?tab=projects&gig=${og.id}&view=matches` }] };
      case "post_gig":
        return { text: "Your gig " + q(dg.title) + " is ready. Check the budget and the dates, then post it. Freelancers who fit are told right away.",
          choices: [{ id: "open_gig", label: "Review and post the gig", link: `/dela?tab=projects&gig=${dg.id}` }] };
      case "verify":
        return { text: "Your gig " + q(dg.title) + " is ready. Posting needs your license check first. It is on your profile and is usually done the same day.",
          choices: [{ id: "open_tab", label: "Finish the license check", link: "/dela?tab=profile" }, { id: "open_gig", label: "Look at the gig", link: `/dela?tab=projects&gig=${dg.id}` }] };
      case "continue_delegation":
        return { text: "You are part way through handing off " + q(dl.title) + " (step " + n(dl.stage) + " of 5). Pick up where you left off and DELA writes the gig with you.",
          choices: [{ id: "open_playbook", label: "Continue handing it off", link: `/dela?tab=library&pb=${dl.playbook_id}` }] };
      case "delegate":
        return { text: q(ap.title) + " is approved. DELA can find the steps a freelancer can take over, then write the gig for you.",
          choices: [{ id: "open_playbook", label: "Find steps to hand off", link: `/dela?tab=library&pb=${ap.id}` }] };
      case "approve_playbook":
        return { text: "Your playbook " + q(dp.title) + " is drafted. Read it, fix anything that is off, and approve it. Then DELA marks the steps a freelancer can do.",
          choices: [{ id: "open_playbook", label: "Open " + q(dp.title), link: `/dela?tab=library&pb=${dp.id}` }] };
      case "next_task":
        return { text: "Nice work. Want to hand off another task? These are good next ones.", choices: [...tasks(2), { id: "describe_task", label: "Something else" }] };
      default:
        return { text: "Let's take one task off your desk. Pick one and DELA drafts the playbook in a few minutes. You approve it, then DELA writes a gig so a freelancer can do the work.",
          choices: [...tasks(3), { id: "describe_task", label: "Something else" }] };
    }
  }
  const missing = (Array.isArray(f.missing) ? f.missing : []).map(String).filter(Boolean).slice(0, 3).map(fieldWords);
  switch (s.step) {
    case "restricted":
      return { text: "Your freelancer account is on hold, so attorneys cannot see you right now. The Lawfecta Team will email you; you can also ask them from the Inbox.", choices: [] };
    case "profile":
      return { text: "Attorneys only see complete profiles. You still need " + (missing.length ? listWords(missing) : "a few details") + ". DELA can draft them from what you tell it.",
        choices: [{ id: "open_tab", label: "Finish my profile", link: "/dela?tab=profile" }] };
    case "verify_linkedin":
      return { text: "One step before you show up in matches: the LinkedIn check. It takes about a minute.", choices: [{ id: "open_tab", label: "Do the LinkedIn check", link: "/dela?tab=profile" }] };
    case "availability":
      return { text: "Confirm you are taking new work so attorneys can match you. It takes one click and keeps you in matches.",
        choices: [{ id: "open_tab", label: "Confirm my availability", link: "/dela?tab=profile" }] };
    case "invitations":
      return { text: plural(n(f.invitations), "attorney invited", "attorneys invited") + " you to a gig. Answer soon; an invited proposal does not use your monthly allowance.",
        choices: [{ id: "open_tab", label: "See my invitations", link: "/dela?tab=work" }] };
    case "new_gigs": {
      const gigs = (Array.isArray(f.new_gigs) ? f.new_gigs : []) as Array<Record<string, any>>;
      const lines = gigs.map((g) => q(g.title) + ": " + (g.reasons ?? []).slice(0, 3).join("; ")).join(". ");
      return { text: plural(gigs.length, "new gig fits", "new gigs fit") + " you. " + lines + ".",
        choices: gigs.flatMap((g) => [{ id: "open_gig", label: "See " + q(g.title), link: `/dela?tab=work&gig=${g.id}`, gig: String(g.id) }, { id: "not_for_me", label: "Not for me", gig: String(g.id) }]) };
    }
    case "first_proposal":
      return { text: plural(n(f.matches), "gig fits", "gigs fit") + " you. Send your first proposal; DELA can draft it with you from your profile.",
        choices: [{ id: "open_tab", label: "See the gigs", link: "/dela?tab=work" }] };
    case "verify_waiting":
      return { text: "Your LinkedIn check is with the Lawfecta Team. Meanwhile, make your profile stronger so you rank higher when it clears.",
        choices: [{ id: "open_tab", label: "Improve my profile", link: "/dela?tab=profile" }] };
    default:
      return { text: "You are set. Teach DELA about your work so your proposals sound like you. New gigs that fit you will show up right here.",
        choices: [{ id: "open_tab", label: "Teach DELA about my work", link: "/dela?tab=ai" }, { id: "open_tab", label: "See open gigs", link: "/dela?tab=work" }] };
  }
}

// ---------- A typed question ----------
export const GUIDE_SYSTEM = "You are the DELA guide inside Lawfecta, a marketplace where attorneys hand legal operations work to vetted freelancers " +
  "(paralegals, legal assistants and similar). Answer the member's question in two to four short, plain sentences. Help them take the next step on Lawfecta. " +
  "Never give legal advice, never invent features, prices or rules, and never ask for client details or sensitive data. If a question needs a person, say the " +
  "Lawfecta Team can help from the Inbox. You may suggest one of the buttons listed as available, by its number, or none. " +
  "Answer only with JSON: {\"text\":\"...\",\"button\":number or null}.";

export function guidePrompt(s: GuideState, m: { text: string; choices: Choice[] }, question: string): string {
  return [
    "Member side: " + s.side,
    "Their next step: " + s.step,
    "What the guide just told them: " + m.text,
    "Buttons available: " + (m.choices.length ? m.choices.map((c, i) => (i + 1) + ". " + c.label).join("; ") : "none"),
    "Their question: " + question.replace(/\s+/g, " ").trim().slice(0, 1000),
  ].join("\n");
}

// Code decides what reaches the screen: plain text without ruling words, and only a button that was on offer
const RULING = /\b(legal advice|you must|liable|liability|breach of contract|lawsuit|sue)\b/i;
export function readGuideReply(j: Record<string, any> | null, choices: Choice[]): { text: string; choice: Choice | null } | null {
  if (!j) return null;
  const text = String(j.text ?? "").replace(/\s+/g, " ").trim().slice(0, 800);
  if (!text || RULING.test(text)) return null;
  const k = Math.round(Number(j.button));
  const choice = Number.isFinite(k) && k >= 1 && k <= choices.length ? choices[k - 1] : null;
  return { text, choice };
}
