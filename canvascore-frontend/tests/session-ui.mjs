// tests/session-ui.mjs
// Session INTEGRATION tests on the real interface: the real <App /> mounted in jsdom
// (loaded through Vite in SSR mode) against a fake backend with inactivity expiry.
// The interface is driven the way a user would: type, press Save, the session expires,
// the login appears ON TOP of the app, the user re-authenticates and the save completes.
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
async function waitFor(fn, { timeout = 4000 } = {}) {
  const t0 = Date.now();
  for (;;) {
    let v; try { v = fn(); } catch { v = null; }
    if (v) return v;
    if (Date.now() - t0 > timeout) return null;
    await sleep(25);
  }
}

// ------------------------------------------------------------------ jsdom environment as the global "window"
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
  globalThis.confirm = () => { throw new Error('native confirm() used'); };
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

// ------------------------------------------------------------------ fake backend
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

// ------------------------------------------------------------------ UI helpers
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
// outcome messages: alert() dialogs and the non-blocking notifications (src/ui/toast.jsx)
const messages = () => [...alerts, ...$$('.ui-toast').map((t) => t.textContent)];

// ------------------------------------------------------------------ vite SSR
const vite = await createServer({
  root: PROJECT, configFile: false, logLevel: 'error', appType: 'custom', clearScreen: false,
  server: { middlewareMode: true, hmr: false, watch: null },
  plugins: [react()],
  define: { __APP_VERSION__: '"test"', __APP_BUILD__: '0', __BLOCK_DEFS__: JSON.stringify(blockDefs) },
  optimizeDeps: { noDiscovery: true, include: [] },
});

let root = null;
async function boot(backend, storageSnapshot = null) {
  installEnv(newDom(storageSnapshot));
  globalThis.fetch = backend.fetch;                         // as in a browser: window.fetch === fetch
  vite.moduleGraph.invalidateAll();                         // store and modules recreated: a real "refresh"
  await vite.ssrLoadModule('/src/apiClient.js');           // installs the guard BEFORE React
  const App = (await vite.ssrLoadModule('/src/App.jsx')).default;
  const { createRoot } = await import('react-dom/client');
  const React = await import('react');
  root = createRoot(dom.window.document.getElementById('root'));
  root.render(React.createElement(React.StrictMode, null, React.createElement(App)));   // StrictMode: effects run twice
}
async function shutdown() {
  try { globalThis.__CC_SESSION?.stop(); } catch { /* noop */ }
  try { root?.unmount(); } catch { /* noop */ }
  root = null;
  await sleep(30);
}

let failedRun = false;
try {
  // ================================================================== SCENARIO 1: expiry while editing the menu
  section('SCENARIO 1 — I edit the menu, the session expires, I press Save');
  const be = makeBackend();
  await boot(be);
  const dash = await waitFor(() => buttonByText('Menu') && bodyText().includes('Pages'));
  check('the dashboard loads for the signed-in user', !!dash && bodyText().includes('ann'));

  click(buttonByText('Menu'));
  const labelInput = await waitFor(() => $('input[placeholder="Label"]'));
  check('Menu Builder open with the data from the server', !!labelInput && labelInput.value === 'Home');

  setInput(labelInput, 'Modified');
  const hasDraft = await waitFor(() => draftKeys().some((k) => k.endsWith(':menu')), { timeout: 3000 });
  check('the edit is copied to the local backup (within ~1 s)', !!hasDraft);
  check('the backup is under user ann\'s key', draftKeys().includes('cc_draft:v1:ann:menu'));

  // the session expires on the server while the user hasn't saved yet
  be.authenticated = false;
  click(buttonByText('Save & Publish'));
  const overlay = await waitFor(() => $('[role="alertdialog"]'));
  check('Save with an expired session: the login appears ON TOP of the app (overlay)', !!overlay && /Session expired/.test(overlay.textContent));
  check('NO error message or false success shown to the user', messages().length === 0, JSON.stringify(messages()));
  check('the app was NOT replaced by the login page', !bodyText().includes('Enter your credentials'));
  const stillThere = $('input[placeholder="Label"]');
  check('the Menu Builder is still mounted and keeps the unsaved edit', !!stillThere && stillThere.value === 'Modified');
  const wrapper = [...dom.window.document.querySelectorAll('[inert]')][0];
  check('the app underneath is made inert (you cannot type "behind" the login)', !!wrapper && wrapper.contains(stillThere));
  check('the overlay lists the Menu backup', /Menu/.test(overlay.textContent) && /backed up/i.test(overlay.textContent));
  const userField = $('#cc-exp-user');
  check('the username is prefilled with the one from the expired session', userField && userField.value === 'ann');
  check('the save was NOT performed by the server while expired', be.savedMenus.length === 0);

  // wrong password
  setInput($('#cc-exp-pw'), 'sbagliata');
  submit($('[role="alertdialog"] form'));
  const err = await waitFor(() => $('[role="alertdialog"] [role="alert"]'));
  check('wrong password → error shown, the overlay stays', !!err && /Invalid credentials/.test(err.textContent) && !!$('[role="alertdialog"]'));
  check('…and the work is still there', $('input[placeholder="Label"]').value === 'Modified');

  // correct password
  setInput($('#cc-exp-pw'), 'pw');
  submit($('[role="alertdialog"] form'));
  const closed = await waitFor(() => !$('[role="alertdialog"]'), { timeout: 5000 });
  check('correct login → the overlay disappears', !!closed);
  const saved = await waitFor(() => be.savedMenus.length >= 1, { timeout: 5000 });
  check('the INTERRUPTED SAVE is completed automatically after re-login', !!saved);
  await sleep(100);
  check('…it ran only ONCE', be.savedMenus.length === 1);
  check('…with the user\'s edit ("Modified")', be.savedMenus[0] && be.savedMenus[0].items[0].title === 'Modified');
  const saveCalls = be.log.filter((l) => l.action === 'save_menu');
  check('…the first attempt with the old token (rejected), the retry with the NEW one', saveCalls.length === 2 && saveCalls[0].csrf === 'T1' && saveCalls[1].csrf === be.csrf && be.csrf !== 'T1');
  const okAlert = await waitFor(() => messages().length >= 1, { timeout: 4000 });
  check('the user sees the real success ("Menu saved and site updated")', !!okAlert && /Menu saved and site updated/.test(messages()[0]) && !/NOT saved/.test(messages().join(' ')), JSON.stringify(messages()));
  check('the local backup is deleted after the successful save', !(await waitFor(() => draftKeys().some((k) => k.endsWith(':menu')), { timeout: 1200 })));
  check('the edit is still on screen and the app is not inert', $('input[placeholder="Label"]').value === 'Modified' && !$('[inert]'));

  // ================================================================== SCENARIO 2: back to the tab after inactivity
  section('SCENARIO 2 — I return to the tab after a long period of inactivity (no action)');
  alerts.length = 0;
  setInput($('input[placeholder="Label"]'), 'Altra modifica');
  await waitFor(() => draftKeys().some((k) => k.endsWith(':menu')), { timeout: 3000 });
  be.authenticated = false;                                    // expired while the tab was in the background
  dom.window.dispatchEvent(new dom.window.Event('focus'));     // the user returns to the tab
  const ov2 = await waitFor(() => $('[role="alertdialog"]'), { timeout: 3000 });
  check('on returning to the tab the expiry is detected RIGHT AWAY, without pressing anything', !!ov2);
  check('…the unsaved work is in the backup', draftKeys().some((k) => k.endsWith(':menu')));

  // login done in another tab: this one resumes on its own
  be.authenticated = true; be.username = 'ann'; be.csrf = 'TX';
  dom.window.dispatchEvent(new dom.window.Event('focus'));
  const gone = await waitFor(() => !$('[role="alertdialog"]'), { timeout: 3000 });
  check('login done in another tab → the overlay closes on its own', !!gone);
  check('…without losing the edit', $('input[placeholder="Label"]').value === 'Altra modifica');

  // ================================================================== SCENARIO 3: re-login as ANOTHER user
  section('SCENARIO 3 — a different user logs in at expiry');
  be.savedMenus.length = 0; be.authenticated = false;
  click(buttonByText('Save & Publish'));
  await waitFor(() => $('[role="alertdialog"]'));
  setInput($('#cc-exp-user'), 'bob'); setInput($('#cc-exp-pw'), 'pw2');
  reloads.length = 0;
  submit($('[role="alertdialog"] form'));
  const reloaded = await waitFor(() => reloads.length >= 1, { timeout: 4000 });
  check('login by another user → the page is reloaded from scratch (ann\'s state is not inherited)', !!reloaded);
  await sleep(150);
  check('…and ann\'s save is NOT performed on behalf of bob', be.savedMenus.length === 0);
  check('this tab did NOT adopt bob\'s identity (it stays blocked until the reload)', !!$('[role="alertdialog"]') && /different user/.test(bodyText()));
  dom.window.dispatchEvent(new dom.window.Event('pagehide'));       // this is what happens in a real reload
  await sleep(150);
  check('ann\'s unsaved work does NOT end up in bob\'s account (not even on page unload)', !draftKeys().some((k) => k.includes(':bob:')), JSON.stringify(draftKeys()));
  check('…it stays in ann\'s backup', draftKeys().includes('cc_draft:v1:ann:menu'));
  await shutdown();

  // ================================================================== SCENARIO 4: refresh after expiry
  section('SCENARIO 4 — I reload the page with unsaved work in the backup');
  const be2 = makeBackend({ authenticated: false });        // expired session: after the refresh you go to the login
  const stor = snapshotStorage();
  check('(prerequisite) ann\'s backup still exists after expiry', stor.some(([k]) => k === 'cc_draft:v1:ann:menu'));
  await boot(be2, stor);
  const loginPage = await waitFor(() => bodyText().includes('Enter your credentials'));
  check('after refreshing with an expired session you land on the login', !!loginPage);
  check('…which clearly explains that the session expired and the work is safe', /Your session expired/.test(bodyText()) && /backed up on this device/.test(bodyText()));

  const inputs = $$('input');
  setInput(inputs[0], 'ann'); setInput(inputs[1], 'pw');
  submit($('form'));
  const prompt = await waitFor(() => $('[role="dialog"]#x') || $$('[role="dialog"]').find((d) => /Unsaved work found/.test(d.textContent)), { timeout: 5000 });
  check('after login "Unsaved work found" appears with the backup to recover', !!prompt && /Menu/.test(prompt.textContent));
  check('the persistent expiry notice was removed', !dom.window.localStorage.getItem('cc_expired_notice:v1'));

  click([...prompt.querySelectorAll('button')].find((b) => /Restore/.test(b.textContent)));
  const restoredInput = await waitFor(() => $('input[placeholder="Label"]'), { timeout: 4000 });
  check('Restore → the Menu Builder opens', !!restoredInput);
  check('…with the unsaved content restored', restoredInput.value === 'Altra modifica', restoredInput && restoredInput.value);
  check('…and a banner warns that it is NOT saved to the site yet', /Restored unsaved changes/.test(bodyText()) && /not saved to the site yet/.test(bodyText()));
  check('the backup stays until you save', draftKeys().some((k) => k.endsWith(':menu')));

  click(buttonByText('Discard'));
  // the in-app confirmation dialog
  const dlg = await waitFor(() => $('[role="alertdialog"]'));
  check('Discard asks for confirmation in an in-app dialog', !!dlg && /Discard the restored changes\?/.test(dlg.textContent));
  click([...dlg.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Discard changes'));
  const reset = await waitFor(() => $('input[placeholder="Label"]') && $('input[placeholder="Label"]').value === 'Home');
  check('Discard → back to the menu saved on the server', !!reset && !/Restored unsaved changes/.test(bodyText()));
  check('…and the backup is deleted (and not rewritten)', !(await waitFor(() => draftKeys().some((k) => k.endsWith(':menu')), { timeout: 1500 })));
  await shutdown();

  // ================================================================== SCENARIO 5: per-user backups
  section('SCENARIO 5 — backups are kept separate per user');
  const stor5 = [['cc_draft:v1:ann:menu', JSON.stringify({ v: 1, user: 'ann', scope: 'menu', savedAt: Date.now(), payload: { items: [{ id: 'x', title: 'DI ANN', url: '', children: [] }], settings: {} } })]];
  const be5 = makeBackend({ authenticated: true, username: 'bob' });
  await boot(be5, stor5);
  await waitFor(() => bodyText().includes('Pages'));
  await sleep(300);
  check('another user (bob) does NOT see ann\'s backup', !$$('[role="dialog"]').some((d) => /Unsaved work found/.test(d.textContent)));
  click(buttonByText('Menu'));
  const bobInput = await waitFor(() => $('input[placeholder="Label"]'));
  check('…nor finds it applied to the menu', bobInput && bobInput.value === 'Home' && !/Restored unsaved changes/.test(bodyText()));
  await shutdown();

  // ================================================================== SCENARIO 6: global settings
  section('SCENARIO 6 — global settings: save with the real outcome');
  const be6 = makeBackend();
  await boot(be6);
  await waitFor(() => buttonByText('Global Options'));
  click(buttonByText('Global Options'));
  const brand = await waitFor(() => $$('input[type="text"]').find((i) => i.value === '#112233'));
  check('Global Options loads the data from the server', !!brand);
  setInput(brand, '#abcdef');
  check('the edit ends up in the local backup', !!(await waitFor(() => draftKeys().some((k) => k.endsWith(':settings')), { timeout: 3000 })));
  alerts.length = 0; be6.authenticated = false;
  click(buttonByText('Save & Publish'));
  await waitFor(() => $('[role="alertdialog"]'));
  check('Save with an expired session: overlay, no false "saved successfully"', !messages().some((m) => /saved/i.test(m)) && !!$('[role="alertdialog"]'));
  setInput($('#cc-exp-pw'), 'pw');
  submit($('[role="alertdialog"] form'));
  await waitFor(() => be6.savedSettings.length >= 1, { timeout: 5000 });
  check('after re-login the settings are saved (once, with the user\'s value)', be6.savedSettings.length === 1 && be6.savedSettings[0].brandColor === '#abcdef');
  await waitFor(() => messages().some((m) => /saved and site updated/.test(m)), { timeout: 4000 });
  check('outcome shown: real success', messages().some((m) => /saved and site updated/.test(m)), JSON.stringify(messages()));
  await shutdown();
} catch (e) {
  failedRun = true; fails++; total++;
  console.error('  ✗ EXCEPTION during the UI tests: ' + ((e && e.stack) || e).toString().split('\n').slice(0, 6).join(' | '));
  try { await shutdown(); } catch { /* noop */ }
}

await vite.close();
console.log(`\n${fails === 0 ? 'SESSION UI OK' : fails + ' checks failed'} (${total} checks)${failedRun ? ' — aborted by an exception' : ''}`);
process.exit(fails === 0 ? 0 : 1);
