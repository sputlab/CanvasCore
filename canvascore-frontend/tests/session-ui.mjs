// tests/session-ui.mjs
// Test di INTEGRAZIONE della sessione sull'interfaccia vera: la vera <App /> montata in jsdom
// (caricata con Vite in modalita' SSR) contro un backend finto con scadenza per inattivita'.
// Si guida l'interfaccia come farebbe un utente: si scrive, si preme Save, la sessione scade,
// compare il login SOPRA l'app, ci si ri-autentica e il salvataggio viene completato.
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blockDefs = JSON.parse(readFileSync(path.join(PROJECT, '../canvascore-admin/blocks.json'), 'utf8'));

let fails = 0, total = 0;
const check = (name, cond, extra = '') => {
  total++;
  if (cond) console.log('  ✓ ' + name);
  else { fails++; console.error('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
};
const section = (t) => console.log('\n' + t);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, { timeout = 4000, label = '' } = {}) {
  const t0 = Date.now();
  for (;;) {
    let v; try { v = fn(); } catch { v = null; }
    if (v) return v;
    if (Date.now() - t0 > timeout) return null;
    await sleep(25);
  }
}

// ------------------------------------------------------------------ ambiente jsdom come "window" globale
const reloads = [];
const alerts = [];
let dom = null;
const ENV_KEYS = ['document', 'localStorage', 'sessionStorage', 'location', 'history', 'navigator', 'getComputedStyle',
  'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'HTMLIFrameElement', 'Element', 'Node', 'NodeList',
  'Event', 'KeyboardEvent', 'MouseEvent', 'FocusEvent', 'InputEvent', 'CustomEvent', 'MutationObserver', 'DOMParser', 'Image', 'getSelection', 'SVGElement', 'ShadowRoot', 'DocumentFragment', 'Text', 'Comment'];
function installEnv(newDom) {
  dom = newDom;
  const w = dom.window;
  for (const k of ENV_KEYS) {
    if (!(k in w)) continue;
    Object.defineProperty(globalThis, k, { configurable: true, get: () => w[k] });
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: globalThis, writable: true });
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis, writable: true });
  globalThis.addEventListener = (...a) => w.addEventListener(...a);
  globalThis.removeEventListener = (...a) => w.removeEventListener(...a);
  globalThis.dispatchEvent = (...a) => w.dispatchEvent(...a);
  globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  globalThis.alert = (m) => { alerts.push(String(m)); };
  globalThis.confirm = () => true;
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  delete globalThis.__CC_SESSION; delete globalThis.__CC_FETCH_WRAPPED; delete globalThis.__CC_CSRF;
}
function newDom(storageSnapshot = null) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (/navigation/i.test(e.message)) reloads.push(e.message); });
  const d = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/canvascore-admin/', pretendToBeVisual: true, virtualConsole: vc });
  if (storageSnapshot) for (const [k, v] of storageSnapshot) d.window.localStorage.setItem(k, v);
  return d;
}
const snapshotStorage = () => { const out = []; const ls = dom.window.localStorage; for (let i = 0; i < ls.length; i++) { const k = ls.key(i); out.push([k, ls.getItem(k)]); } return out; };

// ------------------------------------------------------------------ backend finto
function makeBackend({ authenticated = true, username = 'ann' } = {}) {
  const b = { authenticated, username, passwords: { ann: 'pw', bob: 'pw2' }, csrf: 'T1', n: 1,
    menu: { items: [{ id: 'm1', title: 'Home', url: '', children: [] }], settings: {} },
    savedMenus: [], savedSettings: [], log: [], status401: 0 };
  b.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const u = new URL(url, 'http://localhost/canvascore-admin/');
    const action = u.searchParams.get('action');
    const method = (init.method || 'GET').toUpperCase();
    const hdr = new Headers(init.headers || {});
    b.log.push({ action: action || u.pathname.split('/').pop(), method, csrf: hdr.get('X-CSRF-Token'), body: init.body });
    const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st });
    const unauthorized = () => { b.status401++; return json({ success: false, message: 'Unauthorized.', code: 'auth_required' }, 401); };
    if (u.pathname.endsWith('rebuild_all.php')) return b.authenticated ? json({ success: true, message: 'Build successful' }) : unauthorized();
    switch (action) {
      case 'version': return json({ app: 'test', build: 0 });
      case 'check_auth': return json({ authenticated: b.authenticated, role: 'admin', username: b.authenticated ? b.username : null, csrf: b.csrf, must_change_pw: 0, expires_in: b.authenticated ? 1800 : null, timeout: 1800 });
      case 'session_status': return json({ authenticated: b.authenticated, username: b.authenticated ? b.username : null, expires_in: b.authenticated ? 1800 : null, timeout: 1800 });
      case 'login': {
        const d = JSON.parse(init.body);
        if (b.passwords[d.username] === d.password) { b.authenticated = true; b.username = d.username; b.csrf = 'T' + (++b.n); return json({ success: true, role: 'admin', username: d.username, csrf: b.csrf, must_change_pw: 0, expires_in: 1800, timeout: 1800 }); }
        return json({ success: false, message: 'Invalid credentials.' });
      }
      case 'logout': b.authenticated = false; return json({ success: true });
      default: break;
    }
    if (!b.authenticated) return unauthorized();
    if (method === 'POST' && hdr.get('X-CSRF-Token') !== b.csrf) return json({ success: false, message: 'Invalid CSRF token. Reload the page.' }, 403);
    switch (action) {
      case 'keepalive': return json({ success: true, expires_in: 1800, timeout: 1800 });
      case 'get_menu': return json(b.menu);
      case 'save_menu': { const d = JSON.parse(init.body); b.savedMenus.push(d); b.menu = d; return json({ success: true, message: 'Saved!' }); }
      case 'preview_menu': return json({ success: true, html: '' });
      case 'get_settings': return json({ brandColor: '#112233' });
      case 'save_settings': { b.savedSettings.push(JSON.parse(init.body)); return json({ success: true }); }
      case 'get_pages': case 'get_templates': case 'get_masters': case 'get_collections': return json([]);
      default: return json({ success: true });
    }
  };
  return b;
}

// ------------------------------------------------------------------ helpers UI
const $ = (sel) => dom.window.document.querySelector(sel);
const $$ = (sel) => [...dom.window.document.querySelectorAll(sel)];
const buttonByText = (txt) => $$('button').find((b) => b.textContent.trim().includes(txt));
const click = (el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
function setInput(el, value) {
  const proto = el instanceof dom.window.HTMLTextAreaElement ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
}
const submit = (form) => form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
const draftKeys = () => snapshotStorage().map(([k]) => k).filter((k) => k.startsWith('cc_draft:'));
const bodyText = () => dom.window.document.body.textContent;

// ------------------------------------------------------------------ vite SSR
const vite = await createServer({
  root: PROJECT, configFile: false, logLevel: 'error', appType: 'custom', clearScreen: false,
  server: { middlewareMode: true, hmr: false, watch: null },
  plugins: [react()],
  resolve: { alias: { 'jodit-react': path.join(PROJECT, 'tests/stubs/jodit-react.jsx') } },
  define: { __APP_VERSION__: '"test"', __APP_BUILD__: '0', __BLOCK_DEFS__: JSON.stringify(blockDefs) },
  optimizeDeps: { noDiscovery: true, include: [] },
});

let root = null;
async function boot(backend, storageSnapshot = null) {
  installEnv(newDom(storageSnapshot));
  globalThis.fetch = backend.fetch;                         // come in un browser: window.fetch === fetch
  vite.moduleGraph.invalidateAll();                         // store e moduli ricreati: e' un "refresh" vero
  await vite.ssrLoadModule('/src/apiClient.js');           // installa la guardia PRIMA di React
  const App = (await vite.ssrLoadModule('/src/App.jsx')).default;
  const { createRoot } = await import('react-dom/client');
  const React = await import('react');
  root = createRoot(dom.window.document.getElementById('root'));
  root.render(React.createElement(React.StrictMode, null, React.createElement(App)));   // StrictMode: effetti eseguiti due volte
}
async function shutdown() {
  try { globalThis.__CC_SESSION && globalThis.__CC_SESSION.stop(); } catch { /* noop */ }
  try { root && root.unmount(); } catch { /* noop */ }
  root = null;
  await sleep(30);
}

let failedRun = false;
try {
  // ================================================================== SCENARIO 1: scadenza durante la modifica del menu
  section('SCENARIO 1 — modifico il menu, la sessione scade, premo Save');
  const be = makeBackend();
  await boot(be);
  const dash = await waitFor(() => buttonByText('Menu') && bodyText().includes('Pages'));
  check('la dashboard si carica per l\'utente loggato', !!dash && bodyText().includes('ann'));

  click(buttonByText('Menu'));
  const labelInput = await waitFor(() => $('input[placeholder="Label"]'));
  check('Menu Builder aperto con i dati dal server', !!labelInput && labelInput.value === 'Home');

  setInput(labelInput, 'Modified');
  const hasDraft = await waitFor(() => draftKeys().some((k) => k.endsWith(':menu')), { timeout: 3000 });
  check('la modifica viene copiata nel backup locale (entro ~1 s)', !!hasDraft);
  check('il backup è nella chiave dell\'utente ann', draftKeys().includes('cc_draft:v1:ann:menu'));

  // la sessione scade lato server mentre l'utente non ha ancora salvato
  be.authenticated = false;
  click(buttonByText('Save & Publish'));
  const overlay = await waitFor(() => $('[role="alertdialog"]'));
  check('Save con sessione scaduta: compare il login SOPRA l\'app (overlay)', !!overlay && /Session expired/.test(overlay.textContent));
  check('NESSUN messaggio d\'errore o falso successo mostrato all\'utente', alerts.length === 0, JSON.stringify(alerts));
  check('l\'app NON è stata sostituita dalla pagina di login', !bodyText().includes('Enter your credentials'));
  const stillThere = $('input[placeholder="Label"]');
  check('il Menu Builder è ancora montato e conserva la modifica non salvata', !!stillThere && stillThere.value === 'Modified');
  const wrapper = [...dom.window.document.querySelectorAll('[inert]')][0];
  check('l\'app sottostante è resa inerte (non si può scrivere "dietro" il login)', !!wrapper && wrapper.contains(stillThere));
  check('l\'overlay elenca il backup del Menu', /Menu/.test(overlay.textContent) && /backed up/i.test(overlay.textContent));
  const userField = $('#cc-exp-user');
  check('lo username è precompilato con quello della sessione scaduta', userField && userField.value === 'ann');
  check('il salvataggio NON è stato eseguito dal server mentre è scaduta', be.savedMenus.length === 0);

  // password sbagliata
  setInput($('#cc-exp-pw'), 'sbagliata');
  submit($('[role="alertdialog"] form'));
  const err = await waitFor(() => $('[role="alertdialog"] [role="alert"]'));
  check('password sbagliata → errore mostrato, l\'overlay resta', !!err && /Invalid credentials/.test(err.textContent) && !!$('[role="alertdialog"]'));
  check('…e il lavoro è ancora lì', $('input[placeholder="Label"]').value === 'Modified');

  // password corretta
  setInput($('#cc-exp-pw'), 'pw');
  submit($('[role="alertdialog"] form'));
  const closed = await waitFor(() => !$('[role="alertdialog"]'), { timeout: 5000 });
  check('login corretto → l\'overlay sparisce', !!closed);
  const saved = await waitFor(() => be.savedMenus.length >= 1, { timeout: 5000 });
  check('il SALVATAGGIO INTERROTTO viene completato in automatico dopo il re-login', !!saved);
  await sleep(100);
  check('…è stato eseguito UNA sola volta', be.savedMenus.length === 1);
  check('…con la modifica dell\'utente ("Modified")', be.savedMenus[0] && be.savedMenus[0].items[0].title === 'Modified');
  const saveCalls = be.log.filter((l) => l.action === 'save_menu');
  check('…il primo tentativo con il token vecchio (rifiutato), la riesecuzione con quello NUOVO', saveCalls.length === 2 && saveCalls[0].csrf === 'T1' && saveCalls[1].csrf === be.csrf && be.csrf !== 'T1');
  const okAlert = await waitFor(() => alerts.length >= 1, { timeout: 4000 });
  check('l\'utente vede il successo vero ("Menu saved and site updated")', !!okAlert && /Menu saved and site updated/.test(alerts[0]) && !/NOT saved/.test(alerts[0]), JSON.stringify(alerts));
  check('il backup locale viene eliminato dopo il salvataggio riuscito', !(await waitFor(() => draftKeys().some((k) => k.endsWith(':menu')), { timeout: 1200 })));
  check('la modifica è ancora a schermo e l\'app non è inerte', $('input[placeholder="Label"]').value === 'Modified' && !$('[inert]'));

  // ================================================================== SCENARIO 2: ritorno sulla scheda dopo inattività
  section('SCENARIO 2 — torno sulla scheda dopo una lunga inattività (nessuna azione)');
  alerts.length = 0;
  setInput($('input[placeholder="Label"]'), 'Altra modifica');
  await waitFor(() => draftKeys().some((k) => k.endsWith(':menu')), { timeout: 3000 });
  be.authenticated = false;                                    // scaduta mentre la scheda era in background
  dom.window.dispatchEvent(new dom.window.Event('focus'));     // l'utente torna sulla scheda
  const ov2 = await waitFor(() => $('[role="alertdialog"]'), { timeout: 3000 });
  check('al ritorno sulla scheda la scadenza è rilevata SUBITO, senza premere nulla', !!ov2);
  check('…il lavoro non salvato è nel backup', draftKeys().some((k) => k.endsWith(':menu')));

  // login fatto in un'altra scheda: questa riprende da sola
  be.authenticated = true; be.username = 'ann'; be.csrf = 'TX';
  dom.window.dispatchEvent(new dom.window.Event('focus'));
  const gone = await waitFor(() => !$('[role="alertdialog"]'), { timeout: 3000 });
  check('login fatto in un\'altra scheda → l\'overlay si chiude da solo', !!gone);
  check('…senza perdere la modifica', $('input[placeholder="Label"]').value === 'Altra modifica');

  // ================================================================== SCENARIO 3: re-login come ALTRO utente
  section('SCENARIO 3 — alla scadenza fa login un utente diverso');
  be.savedMenus.length = 0; be.authenticated = false;
  click(buttonByText('Save & Publish'));
  await waitFor(() => $('[role="alertdialog"]'));
  setInput($('#cc-exp-user'), 'bob'); setInput($('#cc-exp-pw'), 'pw2');
  reloads.length = 0;
  submit($('[role="alertdialog"] form'));
  const reloaded = await waitFor(() => reloads.length >= 1, { timeout: 4000 });
  check('login di un altro utente → la pagina viene ricaricata da zero (non si eredita lo stato di ann)', !!reloaded);
  await sleep(150);
  check('…e il salvataggio di ann NON viene eseguito a nome di bob', be.savedMenus.length === 0);
  check('questa scheda NON ha adottato l\'identità di bob (resta bloccata fino al reload)', !!$('[role="alertdialog"]') && /different user/.test(bodyText()));
  dom.window.dispatchEvent(new dom.window.Event('pagehide'));       // è ciò che accade in un vero reload
  await sleep(150);
  check('il lavoro non salvato di ann NON finisce nell\'account di bob (nemmeno allo scaricamento della pagina)', !draftKeys().some((k) => k.includes(':bob:')), JSON.stringify(draftKeys()));
  check('…resta nel backup di ann', draftKeys().includes('cc_draft:v1:ann:menu'));
  await shutdown();

  // ================================================================== SCENARIO 4: refresh dopo la scadenza
  section('SCENARIO 4 — ricarico la pagina con lavoro non salvato nel backup');
  const be2 = makeBackend({ authenticated: false });        // sessione scaduta: dopo il refresh si va al login
  const stor = snapshotStorage();
  check('(prerequisito) il backup di ann esiste ancora dopo la scadenza', stor.some(([k]) => k === 'cc_draft:v1:ann:menu'));
  await boot(be2, stor);
  const loginPage = await waitFor(() => bodyText().includes('Enter your credentials'));
  check('dopo il refresh con sessione scaduta si arriva al login', !!loginPage);
  check('…che spiega chiaramente che la sessione è scaduta e che il lavoro è al sicuro', /Your session expired/.test(bodyText()) && /backed up on this device/.test(bodyText()));

  const inputs = $$('input');
  setInput(inputs[0], 'ann'); setInput(inputs[1], 'pw');
  submit($('form'));
  const prompt = await waitFor(() => $('[role="dialog"]#x') || $$('[role="dialog"]').find((d) => /Unsaved work found/.test(d.textContent)), { timeout: 5000 });
  check('dopo il login compare "Unsaved work found" con il backup da recuperare', !!prompt && /Menu/.test(prompt.textContent));
  check('l\'avviso persistente della scadenza è stato rimosso', !dom.window.localStorage.getItem('cc_expired_notice:v1'));

  click([...prompt.querySelectorAll('button')].find((b) => /Restore/.test(b.textContent)));
  const restoredInput = await waitFor(() => $('input[placeholder="Label"]'), { timeout: 4000 });
  check('Restore → si apre il Menu Builder', !!restoredInput);
  check('…con il contenuto non salvato ripristinato', restoredInput.value === 'Altra modifica', restoredInput && restoredInput.value);
  check('…e un banner avvisa che NON è ancora salvato sul sito', /Restored unsaved changes/.test(bodyText()) && /not saved to the site yet/.test(bodyText()));
  check('il backup resta finché non si salva', draftKeys().some((k) => k.endsWith(':menu')));

  click(buttonByText('Discard'));
  const reset = await waitFor(() => $('input[placeholder="Label"]') && $('input[placeholder="Label"]').value === 'Home');
  check('Discard → torna al menu salvato sul server', !!reset && !/Restored unsaved changes/.test(bodyText()));
  check('…e il backup viene eliminato (e non riscritto)', !(await waitFor(() => draftKeys().some((k) => k.endsWith(':menu')), { timeout: 1500 })));
  await shutdown();

  // ================================================================== SCENARIO 5: backup per utente
  section('SCENARIO 5 — i backup sono separati per utente');
  const stor5 = [['cc_draft:v1:ann:menu', JSON.stringify({ v: 1, user: 'ann', scope: 'menu', savedAt: Date.now(), payload: { items: [{ id: 'x', title: 'DI ANN', url: '', children: [] }], settings: {} } })]];
  const be5 = makeBackend({ authenticated: true, username: 'bob' });
  await boot(be5, stor5);
  await waitFor(() => bodyText().includes('Pages'));
  await sleep(300);
  check('un altro utente (bob) NON vede il backup di ann', !$$('[role="dialog"]').some((d) => /Unsaved work found/.test(d.textContent)));
  click(buttonByText('Menu'));
  const bobInput = await waitFor(() => $('input[placeholder="Label"]'));
  check('…né se lo ritrova applicato nel menu', bobInput && bobInput.value === 'Home' && !/Restored unsaved changes/.test(bodyText()));
  await shutdown();

  // ================================================================== SCENARIO 6: impostazioni globali
  section('SCENARIO 6 — impostazioni globali: salvataggio con esito reale');
  const be6 = makeBackend();
  await boot(be6);
  await waitFor(() => buttonByText('Global Options'));
  click(buttonByText('Global Options'));
  const brand = await waitFor(() => $$('input[type="text"]').find((i) => i.value === '#112233'));
  check('Global Options carica i dati dal server', !!brand);
  setInput(brand, '#abcdef');
  check('la modifica finisce nel backup locale', !!(await waitFor(() => draftKeys().some((k) => k.endsWith(':settings')), { timeout: 3000 })));
  alerts.length = 0; be6.authenticated = false;
  click(buttonByText('Save & Publish'));
  await waitFor(() => $('[role="alertdialog"]'));
  check('Save con sessione scaduta: overlay, nessun falso "saved successfully"', alerts.length === 0 && !!$('[role="alertdialog"]'));
  setInput($('#cc-exp-pw'), 'pw');
  submit($('[role="alertdialog"] form'));
  await waitFor(() => be6.savedSettings.length >= 1, { timeout: 5000 });
  check('dopo il re-login le impostazioni vengono salvate (una volta, con il valore dell\'utente)', be6.savedSettings.length === 1 && be6.savedSettings[0].brandColor === '#abcdef');
  await waitFor(() => alerts.length >= 1, { timeout: 4000 });
  check('esito mostrato: successo vero', /saved and site updated/.test(alerts[0] || ''), JSON.stringify(alerts));
  await shutdown();
} catch (e) {
  failedRun = true; fails++; total++;
  console.error('  ✗ ECCEZIONE durante i test UI: ' + ((e && e.stack) || e).toString().split('\n').slice(0, 6).join(' | '));
  try { await shutdown(); } catch { /* noop */ }
}

await vite.close();
console.log(`\n${fails === 0 ? 'SESSIONE UI OK' : fails + ' controlli falliti'} (${total} controlli)${failedRun ? ' — interrotto da un\'eccezione' : ''}`);
process.exit(fails === 0 ? 0 : 1);
