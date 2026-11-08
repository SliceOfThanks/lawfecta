// What the trial job needs from Brilliant Directories. The exact BD endpoints and API key permissions are confirmed by the
// read-only check (docs/handoff/bd-api-trial-check.md) before this connects to BD. Until then the job uses notConnected,
// which answers every call with "bd_trial_api_not_confirmed": a run then lists that, and changes nothing anywhere.
import type { TrialInvoice } from "./rules.ts";

export type TrialCandidate = { user_id: number; plan_id: number; signup_at: string | null; first_name: string; last_name: string; email: string };
export type TrialPost = { id: string; type: string; published: boolean };
export type Res<T> = { ok: true; data: T } | { ok: false; error: string };

export interface TrialBd {
  // Members on the given plans who signed up on or after the date (answer 2: DELA may search members by plan and signup date)
  search(plans: number[], signedUpSince: string): Promise<Res<TrialCandidate[]>>;
  member(userId: number): Promise<Res<TrialCandidate>>;
  meta(userId: number): Promise<Res<Record<string, string>>>;
  setMeta(userId: number, values: Record<string, string>): Promise<Res<true>>;
  invoices(userId: number): Promise<Res<TrialInvoice[]>>;
  // The downgrade steps, in the order of the developer notes
  changePlan(userId: number, planId: number): Promise<Res<true>>;
  cancelSubscription(userId: number, planId: number): Promise<Res<true>>;
  cancelInvoice(invoiceId: string): Promise<Res<true>>;
  setActive(userId: number): Promise<Res<true>>;
  // Content Free cannot have: hidden (unpublished), never deleted
  posts(userId: number): Promise<Res<TrialPost[]>>;
  setPublished(postId: string, published: boolean): Promise<Res<true>>;
  areas(userId: number): Promise<Res<string[]>>;
  setAreas(userId: number, shown: string[]): Promise<Res<true>>;
}

const NO = { ok: false as const, error: "bd_trial_api_not_confirmed" };
export const notConnected: TrialBd = {
  search: () => Promise.resolve(NO), member: () => Promise.resolve(NO), meta: () => Promise.resolve(NO), setMeta: () => Promise.resolve(NO),
  invoices: () => Promise.resolve(NO), changePlan: () => Promise.resolve(NO), cancelSubscription: () => Promise.resolve(NO), cancelInvoice: () => Promise.resolve(NO),
  setActive: () => Promise.resolve(NO), posts: () => Promise.resolve(NO), setPublished: () => Promise.resolve(NO), areas: () => Promise.resolve(NO), setAreas: () => Promise.resolve(NO),
};

// The post types Free cannot have (developer notes: videos, promotions and community articles)
export const HIDDEN_ON_FREE = ["video", "promotion", "article"];
