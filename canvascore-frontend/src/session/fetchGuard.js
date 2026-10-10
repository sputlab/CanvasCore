// canvascore-frontend/src/session/fetchGuard.js
// Avvolge fetch() per le chiamate all'API del pannello:
//  - inietta il token CSRF (X-CSRF-Token) nelle richieste same-origin
//  - 401 (sessione scaduta): mostra il login, ATTENDE il re-login e RIESEGUE la richiesta, cosi' un
//    salvataggio/pubblicazione interrotto dalla scadenza viene completato senza perdere nulla
//  - 403 "CSRF": distingue una sessione scaduta da un token da rinfrescare e, se serve, riprova
// Una richiesta viene rieseguita UNA sola volta: niente cicli infiniti.

const API_RE = /(?:^|\/)(?:api|rebuild_all)\.php(?:\?|$)/;
// Azioni che non devono mai essere intercettate (nessuna sessione richiesta o gia' gestite a parte).
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
    // Il token viene riletto ad ogni invio: dopo un re-login la riesecuzione usa quello NUOVO.
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
