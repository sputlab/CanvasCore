// canvascore-frontend/src/session/sessionManager.js
// Gestione della sessione lato client. Il SERVER e' l'unica autorita' sulla scadenza: il client
// la rileva subito (non solo quando fallisce un salvataggio) e protegge il lavoro dell'utente.
//
//  - polling di sola lettura (session_status): non allunga la sessione
//  - keepalive: solo se l'utente e' stato attivo nell'interfaccia (cosi' chi lavora a lungo senza
//    salvare non viene disconnesso, e chi e' davvero inattivo scade puntualmente)
//  - avviso prima della scadenza
//  - alla scadenza: backup locale, schermata di login SOPRA l'app (che resta montata) e, dopo il
//    re-login, le richieste fallite vengono rieseguite
//  - un errore di rete NON e' una scadenza; un altro utente loggato in un'altra scheda NON viene
//    scambiato per il vecchio
//
// Nessuna dipendenza da React/DOM: tutto e' iniettabile, quindi testabile in Node.

export const DEFAULTS = {
  tickMs: 1000,
  statusPollMs: 30000,       // ogni quanto chiedere lo stato al server
  keepaliveMinMs: 60000,     // al massimo un keepalive al minuto, e solo se c'e' stata attivita'
  reauthPollMs: 4000,        // a login mostrato: controlla se l'utente ha gia' fatto login in un'altra scheda
  warnMs: 120000,            // avviso a 2 minuti dalla scadenza (al massimo 1/3 del timeout)
  localExpiryRecheckMs: 3000,
};

function makeDeferred() {
  let resolve; const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

export function createSessionManager(deps) {
  const {
    store,                                   // { getState(), setState(partial) }
    fetchFn,                                 // fetch NON protetto dalla guardia (evita ricorsione)
    now = () => Date.now(),
    setIntervalFn = (f, ms) => setInterval(f, ms),
    clearIntervalFn = (id) => clearInterval(id),
    onFlush = () => {},                      // salva subito i backup locali
    onExpired = () => {},                    // avviso persistente per la pagina di login
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

  // Un altro utente ha fatto login in un'altra scheda dello stesso browser: questa scheda NON deve
  // continuare ad agire a nome del vecchio utente.
  function userChanged(body) {
    const s = store.getState();
    return !!(body && body.authenticated && body.username && s.username && body.username !== s.username);
  }

  function expire(reason) {
    const s = store.getState();
    if (s.sessionExpired || !s.isAuthenticated) return false;
    try { onFlush(); } catch { /* il backup non deve impedire di mostrare il login */ }
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
        if (!body) return;                                  // risposta illeggibile: non e' una scadenza
        if (userChanged(body)) { reload(); return; }
        if (body.authenticated === false) { expire('status'); return; }
        if (body.authenticated) { applyTiming(body); evaluateWarning(); }
      } catch {
        lastStatusAt = now();                               // rete assente/errore: NON e' una scadenza
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
      } catch { /* rete assente: riproverà al prossimo giro */ } finally { keepaliveInFlight = null; }
    })();
    return keepaliveInFlight;
  }

  // A schermata di login mostrata: se la sessione e' tornata valida (login fatto in un'altra scheda) riprende da sola.
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
    if (!same) { reload(); return false; }                  // utente diverso: ripartire da zero, senza ereditare lo stato
    if (info.csrf) setCsrf(info.csrf);
    store.setState({ sessionExpired: false, expiredUser: null, expiredAt: null, expiredReason: null, sessionWarning: false });
    lastKeepaliveAt = now(); lastStatusAt = now(); activitySince = false;
    try { onReauthenticated(); } catch { /* noop */ }
    const d = deferred; deferred = null;
    if (d) d.resolve(true);                                 // riesegue le richieste rimaste in attesa
    pollStatus();
    return true;
  }

  // Richiesta API respinta con 401: mostra il login e attende il re-login.
  // Restituisce true se si e' ri-autenticato lo STESSO utente (la richiesta puo' essere rieseguita).
  function handleUnauthorized() {
    expire('401');
    return deferred ? deferred.promise : Promise.resolve(false);
  }

  // 403 "CSRF": puo' essere una sessione scaduta oppure solo un token da rinfrescare. Lo si verifica.
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
    if (s.sessionWarning && !s.sessionExpired) keepalive();   // "sono ancora qui": risposta immediata
  }

  function tick() {
    const s = store.getState();
    if (!s.isAuthenticated) return;
    const t = now();
    if (s.sessionExpired) { if (t - lastReauthPollAt >= cfg.reauthPollMs) checkReauth(); return; }
    if (activitySince && t - lastKeepaliveAt >= cfg.keepaliveMinMs) keepalive();
    else if (t - lastStatusAt >= cfg.statusPollMs) pollStatus();
    // scaduta secondo l'orologio locale: si CONFERMA col server (un'altra scheda potrebbe averla allungata)
    if (s.sessionExpiresAt && t >= s.sessionExpiresAt && !statusInFlight && t - lastStatusAt >= cfg.localExpiryRecheckMs) pollStatus();
    evaluateWarning();
  }

  // Al ritorno sulla scheda / ripresa dalla sospensione / rete tornata: controllo immediato.
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
