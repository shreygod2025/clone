/**
 * Stable per-browser visitor id for anonymous rate-limiting / analytics.
 *
 * Generated once per browser profile and persisted to localStorage.  The
 * backend uses this (via `X-Visitor-Id` header) to key its daily
 * 10-questions-per-day FAQ chat limit so visitors on different devices do
 * NOT share a bucket — a bug that showed up on the Emergent preview, where
 * every anonymous request comes through the same shared ingress IP.
 */
const KEY = 'oll_visitor_id';

export const getVisitorId = () => {
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      // crypto.randomUUID isn't in every mobile browser (older Safari);
      // fall back to a Math.random composite that is still unique enough.
      v =
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
          ? crypto.randomUUID()
          : `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    // localStorage disabled (private mode etc.) — fall back to an ephemeral
    // id so the request still has SOME per-tab identity.
    return `tmp-${Math.random().toString(36).slice(2, 12)}`;
  }
};
