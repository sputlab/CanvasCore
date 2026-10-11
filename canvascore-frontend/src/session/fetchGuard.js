// canvascore-frontend/src/session/fetchGuard.js
// Wraps fetch() for calls to the panel's API:
//  - injects the CSRF token (X-CSRF-Token) into same-origin requests
//  - 401 (session expired): shows the login, WAITS for re-login and RETRIES the request, so a
//    save/publish interrupted by the expiry completes without losing anything
//  - 403 "CSRF": tells an expired session apart from a token to refresh and retries if needed
// A request is retried only ONCE: no infinite loops.

const API_RE = /(?:^|\/)(?:api|rebuild_all)\.php(?:\?|$)/;
// Actions that must never be intercepted (no session required, or already handled separately).
const EXEMPT_ACTIONS = new Set(['login', 'logout', 'check_auth', 'session_status', 'version']);

const urlOf = (input) => {
  try { return typeof input === 'string' ? input : ((input && input.url) || ''); } catch { return ''; }
};
const isAbsolute = (u) => /^[a-z][a-z0-9+.-]*:\/\//i.test(u);

export function createGuardedFetch({ originalFetch, session, getToken, baseHref = 'http://localhost/' }) {
  const actionOf = (u) => {
    try { return new URL(u, baseHref).searchParams.get('action') || ''; } catch { return ''; }
  };

  const withToken = (init, url) => {
    const token = getToken();
    if (isAbsolute(url) || !token) return init;
    const headers = new Headers((init && init.headers) || {});
    if (!headers.has('X-CSRF-Token')) headers.set('X-CSRF-Token', token);
    return { ...init, headers };
  };

  return async function guardedFetch(input, init = {}) {
    const url = urlOf(input);
    // The token is re-read on every send: after a re-login the retry uses the NEW one.
    const send = () => originalFetch(input, withToken(init, url));
    const res = await send();

    const guarded = !isAbsolute(url) && API_RE.test(url) && !EXEMPT_ACTIONS.has(actionOf(url));
    if (!guarded) return res;

    if (res.status === 401) {
      const reauthenticated = await session.handleUnauthorized();
      return reauthenticated ? send() : res;
    }

    if (res.status === 403) {
      let message = '';
      try { message = (await res.clone().json()).message || ''; } catch { message = ''; }
      if (/csrf/i.test(message)) {
        const verdict = await session.handleCsrfFailure();
        if (verdict === 'refreshed' || verdict === 'reauthenticated') return send();
      }
    }
    return res;
  };
}
