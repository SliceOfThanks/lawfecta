// Step 93: every call DELA makes to an outside service has a time limit. Jobs run one after another, so a service that
// never answers used to hold up everything behind it, payments and emails included. A call that sets its own limit
// (Stripe, the AI providers, the meeting rooms) keeps it.
export const OUTSIDE_CALL_MS = 25000;
export function limited(f: typeof fetch, ms: number = OUTSIDE_CALL_MS): typeof fetch {
  return ((input: Parameters<typeof fetch>[0], init: RequestInit = {}) => f(input, init.signal ? init : { ...init, signal: AbortSignal.timeout(ms) })) as typeof fetch;
}
