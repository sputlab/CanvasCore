// canvascore-frontend/src/session/sessionManager.js
// Client-side session handling. The SERVER is the only authority on expiry: the client
// detects it right away (not only when a save fails) and protects the user's work.
//
//  - read-only polling (session_status): does not extend the session
//  - keepalive: only if the user has been active in the interface (so someone working for a long
//    time without saving is not signed out, and someone truly idle expires on time)
//  - warning before expiry
//  - on expiry: local backup, login screen ON TOP of the app (which stays mounted) and, after
//    re-login, the failed requests are retried
//  - a network error is NOT an expiry; another user signed in on another tab is NOT
//    mistaken for the old one
//
// No React/DOM dependency: everything is injectable, hence testable in Node.

export const DEFAULTS = {
  tickMs: 1000,
  statusPollMs: 30000,       // how often to ask the server for the status
  keepaliveMinMs: 60000,     // at most one keepalive per minute, and only if there was activity
  reauthPollMs: 4000,        // with the login shown: checks whether the user already signed in on another tab
  warnMs: 120000,            // warn 2 minutes before expiry (at most 1/3 of the timeout)
  localExpiryRecheckMs: 3000,
};

function makeDeferred() {
  let resolve; const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

export function createSessionManager(deps) {
  const {
    store,                                   // { getState(), setState(partial) }
    fetchFn,                                 // fetch NOT wrapped by the guard (avoids recursion)
    now = () => Date.now(),
    setIntervalFn = (f, ms) => setInterval(f, ms),
    clearIntervalFn = (id) => clearInterval(id),
    onFlush = () => {},                      // saves the local backups immediately
    onExpired = () => {},                    // persistent notice for the login page
    onReauthenticated = () => {},
    reload = () => { if (typeof window !== 'undefined') window.location.reload(); },
    setCsrf = () => {},
    config = {},
  } = deps;
  const cfg = { ...DEFAULTS, ...config };

  let timer = null;
  let lastStatusAt = 0;
  let lastKeepaliveAt = 0;
  let lastReauthPollAt = 0;
  let activitySince = false;
  let deferred = null;
  let statusInFlight = null;
  let keepaliveInFlight = null;
  let reauthInFlight = null;

  async function getJson(action) {
    const res = await fetchFn('api.php?action=' + action, { cache: 'no-store', credentials: 'same-origin' });
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status, body };
  }

  function applyTiming(body) {
    if (body && body.expires_in != null) {
      store.setState({ sessionExpiresAt: now() + body.expires_in * 1000, sessionTimeout: body.timeout ?? store.getState().sessionTimeout });
    }
  }

  function evaluateWarning() {
    const s = store.getState();
    let should = false;
    if (s.isAuthenticated && !s.sessionExpired && s.sessionExpiresAt) {
      const remaining = s.sessionExpiresAt - now();
      const warnAt = Math.min(cfg.warnMs, ((s.sessionTimeout || 1800) * 1000) / 3);
      should = remaining > 0 && remaining <= warnAt;
    }
    if (should !== !!s.sessionWarning) store.setState({ sessionWarning: should });
  }

  // Another user signed in on another tab of the same browser: this tab must NOT
  // keep acting on behalf of the old user.
  function userChanged(body) {
    const s = store.getState();
    return !!(body && body.authenticated && body.username && s.username && body.username !== s.username);
  }

  function expire(reason) {
    const s = store.getState();
    if (s.sessionExpired || !s.isAuthenticated) return false;
    try { onFlush(); } catch { /* the backup must not prevent showing the login */ }
    store.setState({ sessionExpired: true, expiredUser: s.username, expiredAt: now(), expiredReason: reason, sessionWarning: false });
    try { onExpired({ user: s.username, at: now(), reason }); } catch { /* noop */ }
    if (!deferred) deferred = makeDeferred();
    return true;
  }

  function pollStatus() {
    if (statusInFlight) return statusInFlight;
    statusInFlight = (async () => {
      try {
        const { body } = await getJson('session_status');
        lastStatusAt = now();
        if (!body) return;                                  // unreadable response: not an expiry
        if (userChanged(body)) { reload(); return; }
        if (body.authenticated === false) { expire('status'); return; }
        if (body.authenticated) { applyTiming(body); evaluateWarning(); }
      } catch {
        lastStatusAt = now();                               // no network/error: NOT an expiry
      } finally { statusInFlight = null; }
    })();
    return statusInFlight;
  }

  function keepalive() {
    if (keepaliveInFlight) return keepaliveInFlight;
    keepaliveInFlight = (async () => {
      try {
        const { status, body } = await getJson('keepalive');
        if (status === 401) { expire('keepalive'); return; }
        if (body && body.success) {
          lastKeepaliveAt = now(); lastStatusAt = now(); activitySince = false;
          applyTiming(body); evaluateWarning();
        }
      } catch { /* no network: will retry on the next round */ } finally { keepaliveInFlight = null; }
    })();
    return keepaliveInFlight;
  }

  // With the login screen shown: if the session is valid again (signed in on another tab) it resumes by itself.
  function checkReauth() {
    if (reauthInFlight) return reauthInFlight;
    lastReauthPollAt = now();
    reauthInFlight = (async () => {
      try {
        const { body } = await getJson('check_auth');
        if (body && body.authenticated) completeReauth({ username: body.username, csrf: body.csrf });
      } catch { /* noop */ } finally { reauthInFlight = null; }
    })();
    return reauthInFlight;
  }

  function completeReauth(info = {}) {
    const s = store.getState();
    if (!s.sessionExpired) return true;
    const same = !info.username || info.username === s.expiredUser;
    if (!same) { reload(); return false; }                  // different user: start from scratch, without inheriting the state
    if (info.csrf) setCsrf(info.csrf);
    store.setState({ sessionExpired: false, expiredUser: null, expiredAt: null, expiredReason: null, sessionWarning: false });
    lastKeepaliveAt = now(); lastStatusAt = now(); activitySince = false;
    try { onReauthenticated(); } catch { /* noop */ }
    const d = deferred; deferred = null;
    if (d) d.resolve(true);                                 // retries the requests left waiting
    pollStatus();
    return true;
  }

  // API request rejected with 401: shows the login and waits for the re-login.
  // Returns true if the SAME user re-authenticated (the request can be retried).
  function handleUnauthorized() {
    expire('401');
    return deferred ? deferred.promise : Promise.resolve(false);
  }

  // 403 "CSRF": may be an expired session or just a token to refresh. Check which.
  async function handleCsrfFailure() {
    let body = null;
    try { ({ body } = await getJson('check_auth')); } catch { return 'unknown'; }
    if (body && body.authenticated) {
      if (userChanged(body)) { reload(); return 'unknown'; }
      if (body.csrf) setCsrf(body.csrf);
      return 'refreshed';
    }
    expire('csrf');
    const ok = await (deferred ? deferred.promise : Promise.resolve(false));
    return ok ? 'reauthenticated' : 'unknown';
  }

  function noteActivity() {
    activitySince = true;
    const s = store.getState();
    if (s.sessionWarning && !s.sessionExpired) keepalive();   // "I'm still here": immediate response
  }

  function tick() {
    const s = store.getState();
    if (!s.isAuthenticated) return;
    const t = now();
    if (s.sessionExpired) { if (t - lastReauthPollAt >= cfg.reauthPollMs) checkReauth(); return; }
    if (activitySince && t - lastKeepaliveAt >= cfg.keepaliveMinMs) keepalive();
    else if (t - lastStatusAt >= cfg.statusPollMs) pollStatus();
    // expired by the local clock: CONFIRM with the server (another tab may have extended it)
    if (s.sessionExpiresAt && t >= s.sessionExpiresAt && !statusInFlight && t - lastStatusAt >= cfg.localExpiryRecheckMs) pollStatus();
    evaluateWarning();
  }

  // On return to the tab / resume from sleep / network restored: immediate check.
  function recheck() {
    const s = store.getState();
    if (!s.isAuthenticated) return;
    return s.sessionExpired ? checkReauth() : pollStatus();
  }

  function start() {
    if (timer) return;
    lastStatusAt = now(); lastKeepaliveAt = now(); activitySince = false;
    timer = setIntervalFn(tick, cfg.tickMs);
    pollStatus();
  }
  function stop() { if (timer) { clearIntervalFn(timer); timer = null; } }

  return { start, stop, tick, noteActivity, recheck, pollStatus, keepalive, checkReauth, completeReauth,
    handleUnauthorized, handleCsrfFailure, expire, evaluateWarning, isRunning: () => !!timer };
}
