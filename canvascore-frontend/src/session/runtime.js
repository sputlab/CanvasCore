// canvascore-frontend/src/session/runtime.js
// Collega i moduli di sessione al browser: installa la guardia sulle fetch, ascolta l'attivita'
// dell'utente e i cambi di visibilita' della scheda. Una sola installazione per pagina.
import { useStore } from '../store/useStore';
import { createSessionManager } from './sessionManager';
import { createGuardedFetch } from './fetchGuard';
import { flushDrafts, setExpiredNotice, clearExpiredNotice } from './drafts';

export function installSession(win = window) {
  if (win.__CC_SESSION) return win.__CC_SESSION;

  const originalFetch = win.fetch.bind(win);
  const readCookie = (name) => {
    const m = win.document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[1]) : '';
  };
  // Token da memoria (impostato da login/check_auth) con fallback al cookie double-submit.
  const getToken = () => win.__CC_CSRF || readCookie('cc_csrf');

  const session = createSessionManager({
    store: useStore,
    fetchFn: originalFetch,                       // le chiamate del gestore NON passano dalla guardia
    onFlush: flushDrafts,
    onExpired: (info) => setExpiredNotice(info),
    onReauthenticated: () => clearExpiredNotice(),
    setCsrf: (t) => { win.__CC_CSRF = t; },
    reload: () => win.location.reload(),
  });

  win.fetch = createGuardedFetch({ originalFetch, session, getToken, baseHref: win.location.href });
  win.__CC_FETCH_WRAPPED = true;
  win.__CC_SESSION = session;

  // Attivita' dell'utente: tiene viva la sessione SOLO mentre si lavora davvero.
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach((ev) => {
    win.addEventListener(ev, () => session.noteActivity(), { passive: true, capture: true });
  });
  // Ritorno sulla scheda, ripresa dalla sospensione, rete tornata: controllo immediato (senza attendere i timer).
  win.document.addEventListener('visibilitychange', () => { if (win.document.visibilityState === 'visible') session.recheck(); });
  win.addEventListener('focus', () => session.recheck());
  win.addEventListener('online', () => session.recheck());
  // Chiusura/ricarica della scheda: ultimo salvataggio dei backup locali.
  win.addEventListener('pagehide', () => flushDrafts());

  return session;
}

export const getSession = () => (typeof window !== 'undefined' && window.__CC_SESSION) || installSession();
