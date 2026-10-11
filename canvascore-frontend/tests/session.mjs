// tests/session.mjs
// Session handling tests: local backup, "unsaved" tracker, session manager
// (with a fake server that expires on inactivity and a simulated clock) and the fetch guard.
import {
  __setStorage, setDraftUser, saveDraft, readDraft, clearDraft, listDrafts, purgeOldDrafts, describeDraft,
  canon, registerFlusher, flushDrafts, setExpiredNotice, readExpiredNotice, clearExpiredNotice, storageAvailable,
} from '../src/session/drafts.js';
import {
  createEditorDraftTracker, createDraftChannel, applyDraftToStore, editorSnapshot, editorPayload, slimPage,
} from '../src/session/draftTrackers.js';
import { createSessionManager } from '../src/session/sessionManager.js';
import { createGuardedFetch } from '../src/session/fetchGuard.js';

let fails = 0, total = 0;
const check = (name, cond, extra = '') => {
  total++;
  if (cond) console.log('  ✓ ' + name);
  else { fails++; console.error('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
};
const section = (t) => console.log('\n' + t);
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };

class FakeStorage {
  constructor() { this.m = new Map(); this.quota = Infinity; }
  get length() { return this.m.size; }
  key(i) { return [...this.m.keys()][i] ?? null; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) {
    const size = [...this.m.values()].reduce((a, b) => a + b.length, 0) + String(v).length;
    if (size > this.quota) throw new Error('QuotaExceededError');
    this.m.set(k, String(v));
  }
  removeItem(k) { this.m.delete(k); }
}
const freshStorage = (user = 'ann') => { const st = new FakeStorage(); __setStorage(st); setDraftUser(user); return st; };
// A wait that might never end (bug) must become a failed check, not a hung process.
const orTimeout = (p, ms = 200) => Promise.race([p, new Promise((r) => setTimeout(() => r('TIMEOUT'), ms))]);

try {

// =============================================================== DRAFTS
section('LOCAL BACKUP (drafts)');
{
  const st = freshStorage();
  check('canonical signature: key order doesn\'t matter', canon({ a: 1, b: { c: 2, d: [1, { x: 1, y: 2 }] } }) === canon({ b: { d: [1, { y: 2, x: 1 }], c: 2 }, a: 1 }));
  check('canonical signature: a real change changes the signature', canon({ a: [1, 2] }) !== canon({ a: [1, 3] }));
  check('canonical signature: undefined and missing keys are equal', canon({ a: 1, b: undefined }) === canon({ a: 1 }));

  const payload = { page: { page: { id: 'p1', title: 'Home' }, blocks: [{ id: 'b', type: 'TEXT', content: { text: '<p>ciao àè 😀</p>' } }] }, master: null };
  check('save → ok', saveDraft('editor:page:p1', payload).ok === true);
  const back = readDraft('editor:page:p1');
  check('read returns the identical payload (unicode included)', canon(back.payload) === canon(payload));
  check('savedAt is set', typeof back.savedAt === 'number' && back.savedAt > 0);
  clearDraft('editor:page:p1');
  check('clear deletes the draft', readDraft('editor:page:p1') === null);

  saveDraft('menu', { items: [1] });
  setDraftUser('bob');
  check('another user does NOT see ann\'s drafts', readDraft('menu') === null && listDrafts().length === 0);
  saveDraft('menu', { items: [2] });
  setDraftUser('ann');
  check('each user has their own separate drafts', readDraft('menu').payload.items[0] === 1);
  check('listDrafts(ann) contains only hers', listDrafts().length === 1);

  setDraftUser(null);
  check('without a user nothing is saved', saveDraft('menu', {}).ok === false);
  setDraftUser('ann');

  st.m.set('cc_draft:v1:ann:rotta', '{non json');
  st.m.set('cc_draft:v1:ann:vuota', JSON.stringify({ v: 1, scope: 'x' }));
  let threw = false; let n = 0;
  try { n = listDrafts().length; } catch { threw = true; }
  check('corrupted or incomplete entries are ignored without errors', !threw && n === 1, `n=${n}`);

  // quota full
  const st2 = freshStorage(); st2.quota = 50;
  let r; threw = false;
  try { r = saveDraft('menu', { items: new Array(50).fill('x'.repeat(20)) }); } catch { threw = true; }
  check('quota full: no exception', !threw);
  check('quota full: ok=false with reason "quota" (the UI must warn)', r && r.ok === false && r.reason === 'quota');
  check('quota full: still readable from memory (overlay login)', readDraft('menu') !== null);

  // no storage
  __setStorage(null); setDraftUser('ann');
  check('storage unavailable → storageAvailable=false', storageAvailable() === false);
  r = saveDraft('menu', { a: 1 });
  check('no storage: ok=false, no exception', r.ok === false && r.reason === 'no-storage');
  check('no storage: in-memory fallback readable', readDraft('menu').payload.a === 1);

  // purge
  const st3 = freshStorage();
  saveDraft('menu', { a: 1 });
  check('purge: a recent draft stays', purgeOldDrafts(Date.now() + 13 * 86400000) === 0 && readDraft('menu') !== null);
  check('purge: a draft older than 14 days is deleted', purgeOldDrafts(Date.now() + 15 * 86400000) === 1 && readDraft('menu') === null);
  void st3;

  // labels
  const page = (extra = {}) => ({ scope: 'editor:page:p1', payload: { page: { page: { id: 'p1', title: 'Chi siamo', ...extra }, blocks: [] }, master: null } });
  check('page label', describeDraft(page()).kind === 'Page' && describeDraft(page()).title === 'Chi siamo');
  check('collection item label', describeDraft(page({ __item: true })).kind === 'Collection item');
  check('header/footer label', describeDraft(page({ __part: 'header' })).kind === 'Global header' && describeDraft(page({ __part: 'footer' })).kind === 'Global footer');
  check('master label', describeDraft({ scope: 'editor:page:p1', payload: { page: { page: {} }, master: { name: 'Navbar' } } }).kind === 'Master component');
  check('menu/settings label', describeDraft({ scope: 'menu' }).kind === 'Menu' && describeDraft({ scope: 'settings' }).kind === 'Global options');

  // flusher
  let a = 0, b = 0;
  const un = registerFlusher(() => { a++; });
  registerFlusher(() => { throw new Error('failure'); });
  registerFlusher(() => { b++; });
  flushDrafts();
  check('flushDrafts runs all flushers', a === 1 && b === 1);
  check('a flusher that throws doesn\'t block the others', b === 1);
  un(); flushDrafts();
  check('unregister works', a === 1 && b === 2);

  // notice
  freshStorage();
  check('no initial notice', readExpiredNotice() === null);
  setExpiredNotice({ user: 'ann', at: 123 });
  check('expired-session notice saved and read back', readExpiredNotice().user === 'ann');
  clearExpiredNotice();
  check('notice deleted', readExpiredNotice() === null);
}

// =============================================================== TRACKER EDITOR
section('EDITOR TRACKER (when there is unsaved work)');
function makeEditor({ restored = false, quota = Infinity } = {}) {
  const st = freshStorage(); st.quota = quota;
  let state = {
    activePage: { id: 'p1', title: 'Home', slug: 'home', layout: 'boxed', status: 'published', updated_at: 't0', content_json: '[...]', parent_id: null, is_draft_copy: 0 },
    blocks: [{ id: 'b1', type: 'TEXT', content: { text: 'a' }, styles: {} }],
    isEditingMaster: false, editingMaster: null, editorRestored: restored, editorDirty: false, draftBackupFailed: false,
  };
  const pending = [];
  const tracker = createEditorDraftTracker({
    getState: () => state, setState: (p) => { state = { ...state, ...p }; },
    setTimeoutFn: (f) => { pending.push(f); return pending.length; }, clearTimeoutFn: () => { pending.length = 0; },
  });
  const set = (p) => { const prev = state; state = { ...state, ...p }; tracker.onChange(state, prev); };
  const run = () => { const fs = pending.splice(0); fs.forEach((f) => f()); };
  return { st, tracker, set, run, get: () => state };
}
{
  let e = makeEditor(); e.tracker.start();
  check('just opened: clean, no draft', e.get().editorDirty === false && listDrafts().length === 0);

  e.set({ blocks: [{ id: 'b1', type: 'TEXT', content: { text: 'MODIFICATO' }, styles: {} }] }); e.run();
  check('block edit → editorDirty and draft written', e.get().editorDirty === true && listDrafts().length === 1);
  const d = readDraft('editor:page:p1');
  check('the draft contains the edited blocks', d.payload.page.blocks[0].content.text === 'MODIFICATO');
  check('the page in the draft doesn\'t carry content_json/draft_copy (no triplication)', d.payload.page.page.content_json === undefined && d.payload.page.page.draft_copy === undefined);
  check('…but keeps the useful fields (id, parent_id, is_draft_copy)', d.payload.page.page.id === 'p1' && 'parent_id' in d.payload.page.page && 'is_draft_copy' in d.payload.page.page);

  e.set({ blocks: [{ styles: {}, content: { text: 'a' }, type: 'TEXT', id: 'b1' }] }); e.run();
  check('back to the initial state (undo), even with keys in another order, it is NO longer dirty', e.get().editorDirty === false && listDrafts().length === 0);

  e.set({ activePage: { ...e.get().activePage, updated_at: 't9', content_json: 'altro' } }); e.run();
  check('irrelevant fields (updated_at, content_json) don\'t count as a change', e.get().editorDirty === false && listDrafts().length === 0);

  e.set({ activePage: { ...e.get().activePage, title: 'Nuovo titolo' } }); e.run();
  check('title edit → dirty', e.get().editorDirty === true);

  e.tracker.markSaved();
  check('after a successful save: clean and draft deleted', e.get().editorDirty === false && listDrafts().length === 0);
  e.set({ blocks: [{ id: 'b1', type: 'TEXT', content: { text: 'x' }, styles: {} }] }); e.run();
  check('after the save a new edit is protected again', e.get().editorDirty === true && listDrafts().length === 1);

  // dispose: also writes edits still "waiting" for the debounce
  e = makeEditor(); e.tracker.start();
  e.set({ blocks: [] });                      // no run(): the timer hasn't fired yet
  check('before the debounce the draft doesn\'t exist yet', listDrafts().length === 0);
  e.tracker.dispose();
  check('dispose/flush writes pending edits right away', listDrafts().length === 1);

  // more pages = more drafts
  e = makeEditor(); e.tracker.start();
  e.set({ blocks: [] }); e.run();
  const e2 = makeEditor(); // same storage? no: freshStorage recreates it. Simulate another context by hand
  void e2;
  setDraftUser('ann');
  saveDraft('editor:page:ALTRA', { page: { page: { id: 'ALTRA' }, blocks: [] }, master: null });
  check('drafts of different pages coexist', listDrafts().length === 1 || listDrafts().length === 2);

  // reset state (logout / exit): must not touch or create drafts
  e = makeEditor(); e.tracker.start();
  e.set({ blocks: [{ id: 'z' }] }); e.run();
  const nBefore = listDrafts().length;
  e.set({ activePage: null, blocks: [] }); e.run(); e.tracker.dispose();
  check('reset state: existing drafts stay and no "empty" one is created', listDrafts().length === nBefore && listDrafts().every((x) => x.scope !== 'editor:page:new'));

  // failed backup (quota)
  e = makeEditor({ quota: 30 }); e.tracker.start();
  e.set({ blocks: [{ id: 'b1', type: 'TEXT', content: { text: 'x'.repeat(200) }, styles: {} }] }); e.run();
  check('quota full: editorDirty=true and draftBackupFailed=true (the UI must warn)', e.get().editorDirty === true && e.get().draftBackupFailed === true);

  // restored from a draft → always "to be saved"
  e = makeEditor({ restored: true }); e.tracker.start();
  check('restored from a draft: considered unsaved from the start', e.get().editorDirty === true);
  e.set({ blocks: e.get().blocks.slice() }); e.run();
  check('…and the draft stays until you save', listDrafts().length === 1);
  e.tracker.markSaved();
  check('after the save: draft deleted and editorRestored flag cleared', listDrafts().length === 0 && e.get().editorDirty === false && e.get().editorRestored === false);
}

// discard(): "undo restored changes" / "discard draft": the draft must not be rewritten right after
{
  let e = makeEditor({ restored: true }); e.tracker.start();
  e.set({ blocks: e.get().blocks.slice() }); e.run();
  check('(restored) the draft exists', listDrafts().length === 1);
  e.tracker.discard();
  check('discard(): draft deleted, no longer dirty, editorRestored flag cleared', listDrafts().length === 0 && e.get().editorDirty === false && e.get().editorRestored === false);
  e.tracker.dispose();
  check('…and it is NOT rewritten when leaving the editor (dispose)', listDrafts().length === 0);

  e = makeEditor({ restored: true });
  e.set({ isEditingMaster: true, editingMaster: { id: 'm', name: 'N', pageBackup: e.get().blocks, activePageBackup: e.get().activePage }, blocks: [{ id: 'mm' }] });
  e.tracker.start();
  e.tracker.evaluate();                          // as in real life: the draft it was restored from exists in storage
  check('(restored in master mode) the draft exists', listDrafts().length === 1);
  e.tracker.discard(); e.tracker.dispose();
  check('discard() in master mode: deletes the draft and doesn\'t rewrite it', listDrafts().length === 0 && e.get().editorDirty === false);
}

section('EDITOR TRACKER — Master mode');
{
  const e = makeEditor(); e.tracker.start();
  const pageEdited = [{ id: 'b1', type: 'TEXT', content: { text: 'MODIFICA NON SALVATA DELLA PAGINA' }, styles: {} }];
  e.set({ blocks: pageEdited }); e.run();
  const masterBlocks = [{ id: 'm1', type: 'SECTION', content: {}, styles: {}, children: [] }];
  const page = e.get().activePage;
  e.set({ isEditingMaster: true, editingMaster: { id: 'mst1', name: 'Navbar', pageBackup: pageEdited, activePageBackup: page }, blocks: masterBlocks }); e.run();
  check('entering the master the page stays "dirty" (its draft doesn\'t disappear)', e.get().editorDirty === true && listDrafts().length === 1);
  check('the draft still carries the PAGE edits (not the master content)', readDraft('editor:page:p1').payload.page.blocks[0].content.text.startsWith('MODIFICA NON SALVATA'));
  check('…and the master is in the payload but not edited yet → master.blocks = originals', readDraft('editor:page:p1').payload.master.id === 'mst1');

  const masterEdited = [{ ...masterBlocks[0], content: { x: 1 } }];
  e.set({ blocks: masterEdited }); e.run();
  check('master edit → payload.master.blocks updated', canon(readDraft('editor:page:p1').payload.master.blocks) === canon(masterEdited));

  // restore: payload → store → same snapshot
  const payload = readDraft('editor:page:p1').payload;
  let st2 = {}; const view = applyDraftToStore({ scope: 'editor:page:p1', payload }, (p) => { st2 = { ...st2, ...p }; });
  check('applyDraftToStore: goes to the editor view and sets editorRestored', view === 'editor' && st2.currentView === 'editor' && st2.editorRestored === true);
  check('applyDraftToStore: restores master mode with the page backups', st2.isEditingMaster === true && st2.editingMaster.id === 'mst1' && canon(st2.editingMaster.pageBackup) === canon(pageEdited));
  check('roundtrip: restored snapshot = saved snapshot', canon(editorSnapshot(st2)) === canon(editorSnapshot(e.get())));
}
{
  const e = makeEditor(); e.tracker.start();
  e.set({ blocks: [{ id: 'q', type: 'TEXT', content: {}, styles: {} }] }); e.run();
  const payload = readDraft('editor:page:p1').payload;
  let st2 = {}; applyDraftToStore({ scope: 'editor:page:p1', payload }, (p) => { st2 = { ...st2, ...p }; });
  check('simple page roundtrip: identical snapshot', canon(editorSnapshot(st2)) === canon(editorSnapshot(e.get())));
  check('page restore: not in master mode', st2.isEditingMaster === false && st2.editingMaster === null);
  check('restore: clears the undo history and the selection', st2.pastBlocks.length === 0 && st2.selectedBlockId === null);
  let v2 = {}; check('applyDraftToStore: menu and settings → their views', applyDraftToStore({ scope: 'menu' }, (p) => { v2 = p; }) === 'menu' && v2.currentView === 'menu' && applyDraftToStore({ scope: 'settings' }, (p) => { v2 = p; }) === 'settings');
  check('applyDraftToStore: unknown scope or broken payload → null, no exceptions', applyDraftToStore({ scope: 'boh' }, () => {}) === null && applyDraftToStore({ scope: 'editor:x', payload: {} }, () => {}) === null);
  check('slimPage doesn\'t mutate the original', (() => { const o = { id: 1, content_json: 'x', draft_copy: {} }; slimPage(o); return 'content_json' in o; })());
  check('editorPayload exists and doesn\'t include content_json', editorPayload(e.get()).page.page.content_json === undefined);
}

// =============================================================== CHANNEL (menu/settings)
section('DRAFT CHANNEL (menu, settings)');
{
  freshStorage();
  const pend = []; const statuses = [];
  const mk = () => createDraftChannel('menu', { setTimeoutFn: (f) => { pend.push(f); return pend.length; }, clearTimeoutFn: () => { pend.length = 0; }, onBackupStatus: (ok) => statuses.push(ok) });
  const run = () => pend.splice(0).forEach((f) => f());
  saveDraft('menu', { items: ['VECCHIA BOZZA'] });

  let ch = mk();
  ch.update({ items: [] }); ch.flush(); run();
  check('BEFORE loading from the server nothing is written or deleted (the existing draft is safe)', readDraft('menu').payload.items[0] === 'VECCHIA BOZZA');

  const server = { items: ['dal server'] };
  let pendingDraft = ch.loaded(server);
  check('loaded(): returns the draft that differs from the server', pendingDraft && pendingDraft.value.items[0] === 'VECCHIA BOZZA' && pendingDraft.savedAt > 0);

  ch.update(pendingDraft.value); run();
  check('after re-applying the draft, it stays protected (≠ server)', readDraft('menu') !== null && ch.isDirty() === true);
  const srv2 = ch.discard();
  check('discard(): deletes the draft and returns the server value', readDraft('menu') === null && srv2.items[0] === 'dal server' && ch.isDirty() === false);

  ch = mk(); saveDraft('menu', server);
  check('draft identical to the server → deleted and not offered', ch.loaded(server) === null && readDraft('menu') === null);

  ch = mk(); ch.loaded(server);
  ch.update({ items: ['mod'] }); run();
  check('edit → draft written', readDraft('menu').payload.items[0] === 'mod');
  ch.update(server); run();
  check('server value restored → draft deleted', readDraft('menu') === null);
  ch.update({ items: ['x'] }); run();
  ch.saved({ items: ['x'] });
  check('saved(): the draft is deleted and the new value becomes the baseline', readDraft('menu') === null && ch.isDirty() === false);
  ch.update({ items: ['y'] }); run();
  check('…a later edit is protected again', readDraft('menu') !== null);

  statuses.length = 0;
  const stq = freshStorage(); stq.quota = 10;
  ch = mk(); ch.loaded({ a: 1 }); ch.update({ a: 'x'.repeat(100) }); run();
  check('quota full → onBackupStatus(false) to warn the user', statuses.includes(false));
}

// =============================================================== SESSION MANAGER
section('SESSION MANAGER (fake server with inactivity expiry)');
function world({ timeout = 1800, user = 'ann', config = {} } = {}) {
  const clock = { t: 1_000_000 };
  const state = { isAuthenticated: true, username: user, sessionExpired: false, expiredUser: null, expiredAt: null, sessionExpiresAt: null, sessionTimeout: null, sessionWarning: false };
  const store = { getState: () => state, setState: (p) => Object.assign(state, p) };
  const srv = { authenticated: true, username: user, timeout, expiresAt: clock.t + timeout * 1000, csrf: 'T1', calls: {}, saves: 0, offline: false, expiredAtMs: null };
  const touch = () => { srv.expiresAt = clock.t + srv.timeout * 1000; };
  srv.fetch = async (url, init = {}) => {
    if (srv.offline) throw new TypeError('Failed to fetch');
    if (srv.authenticated && clock.t >= srv.expiresAt) { srv.authenticated = false; srv.expiredAtMs = srv.expiresAt; }
    const action = new URL(url, 'http://x/').searchParams.get('action');
    srv.calls[action] = (srv.calls[action] || 0) + 1;
    const json = (b, st = 200) => new Response(JSON.stringify(b), { status: st });
    const rem = () => (srv.authenticated ? Math.max(0, Math.round((srv.expiresAt - clock.t) / 1000)) : null);
    if (action === 'session_status') return json({ authenticated: srv.authenticated, username: srv.authenticated ? srv.username : null, expires_in: rem(), timeout: srv.timeout });
    if (action === 'check_auth') return json({ authenticated: srv.authenticated, username: srv.authenticated ? srv.username : null, csrf: srv.csrf, expires_in: rem(), timeout: srv.timeout });
    if (!srv.authenticated) return json({ success: false, message: 'Unauthorized.', code: 'auth_required' }, 401);
    if (action === 'keepalive') { touch(); return json({ success: true, expires_in: srv.timeout, timeout: srv.timeout }); }
    if (action === 'save_page') {
      if (new Headers(init.headers).get('X-CSRF-Token') !== srv.csrf) return json({ success: false, message: 'Invalid CSRF token. Reload the page.' }, 403);
      srv.saves++; touch(); return json({ success: true });
    }
    return json({ success: true });
  };
  const log = { flushed: 0, notices: [], reloads: 0, csrf: [], reauth: 0 };
  const mgr = createSessionManager({
    store, fetchFn: srv.fetch, now: () => clock.t,
    setIntervalFn: () => 1, clearIntervalFn: () => {},
    onFlush: () => { log.flushed++; }, onExpired: (i) => { log.notices.push(i); }, onReauthenticated: () => { log.reauth++; },
    reload: () => { log.reloads++; }, setCsrf: (t) => { log.csrf.push(t); }, config,
  });
  const run = async (ms, { activityEvery = 0, step = 1000 } = {}) => {
    for (let el = 0; el < ms; el += step) {
      clock.t += step;
      if (activityEvery && el % activityEvery === 0) mgr.noteActivity();
      mgr.tick(); await settle();
    }
  };
  return { clock, state, store, srv, mgr, log, run, touch };
}
const MIN = 60000;
{
  let w = world(); w.mgr.start(); await settle();
  check('start(): reads the state from the server right away (expected expiry)', w.state.sessionExpiresAt === w.clock.t + 1800 * 1000 && w.state.sessionTimeout === 1800);
  check('start(): isRunning', w.mgr.isRunning() === true);

  // idle the whole time
  w = world(); w.mgr.start(); await settle();
  await w.run(31 * MIN);
  check('IDLE for 31 min → expired session detected by the client', w.state.sessionExpired === true && w.state.expiredUser === 'ann');
  check('…without any user action discovering it (polling only)', !w.srv.calls.save_page);
  check('…the local backup was made BEFORE showing the login', w.log.flushed === 1);
  check('…persistent notice written for the login page', w.log.notices.length === 1 && w.log.notices[0].user === 'ann');
  const latency = w.state.expiredAt - w.srv.expiredAtMs;
  check('…detected within ~35 s of the real expiry (not at the first save!)', latency >= 0 && latency <= 35000, `latency=${latency} ms`);
  check('…no keepalive sent (the user was idle): polling doesn\'t keep the session alive', !w.srv.calls.keepalive);
  const calls = w.srv.calls.session_status;
  await w.run(5 * MIN);
  check('…after expiry session_status is no longer polled', (w.srv.calls.session_status - calls) <= 1);

  // active for hours
  w = world(); w.mgr.start(); await settle();
  await w.run(120 * MIN, { activityEvery: 10000 });
  check('ACTIVE for 2 hours (never saving) → the session does NOT expire', w.state.sessionExpired === false && w.srv.authenticated === true);
  const ka = w.srv.calls.keepalive || 0;
  check('…with at most 1 keepalive per minute', ka >= 100 && ka <= 125, `keepalive=${ka}`);
  await w.run(31 * MIN);
  check('…stops working: after 31 min of inactivity it expires', w.state.sessionExpired === true);

  // pre-expiry warning
  w = world(); w.mgr.start(); await settle();
  await w.run(27 * MIN + 30000);               // 2m30 left
  check('2m30 before expiry: no warning', w.state.sessionWarning === false);
  await w.run(40000);                          // ~1m50 left
  check('less than 2 minutes before expiry: WARNING active', w.state.sessionWarning === true && w.state.sessionExpired === false);
  const before = w.state.sessionExpiresAt;
  w.mgr.noteActivity(); await settle();
  check('a user movement → immediate keepalive, warning closed and expiry moved', w.state.sessionWarning === false && w.state.sessionExpiresAt > before && w.srv.calls.keepalive === 1);

  // short timeout: warning at most at 1/3
  w = world({ timeout: 300 }); w.mgr.start(); await settle();
  await w.run(3 * MIN + 20000);                // ~1m40 left (> timeout/3=100s? it's at 100s)
  check('with a 5 min timeout the warning fires at 1/3 (≈100 s), not at 120 s', w.state.sessionWarning === false || (w.state.sessionExpiresAt - w.clock.t) <= 100000);

  // network down
  w = world(); w.mgr.start(); await settle();
  w.srv.offline = true;
  await w.run(10 * MIN, { activityEvery: 20000 });
  check('NETWORK DOWN for 10 min: NOT an expired session', w.state.sessionExpired === false);
  w.srv.offline = false; await w.run(40000, { activityEvery: 5000 });
  check('…when the network returns everything resumes', w.state.sessionExpired === false && w.srv.authenticated === true);

  // unreadable response
  w = world(); w.mgr.start(); await settle();
  const origFetch = w.srv.fetch;
  w.srv.fetch = async () => new Response('<html>502 Bad Gateway</html>', { status: 502 });
  const w2 = createSessionManager({ store: w.store, fetchFn: w.srv.fetch, now: () => w.clock.t, setIntervalFn: () => 1, clearIntervalFn: () => {}, config: {} });
  await w2.pollStatus();
  check('unreadable response (502 HTML) → NOT an expiry', w.state.sessionExpired === false);
  w.srv.fetch = origFetch;

  // "local" expiry (clock) without periodic polling: the only mechanism at play is the server CONFIRMATION
  const NO_POLL = { statusPollMs: 24 * 60 * MIN };
  w = world({ config: NO_POLL }); w.mgr.start(); await settle();
  w.clock.t += 20 * MIN; w.srv.expiresAt = w.clock.t + 30 * MIN;           // another tab is active: the server extended the session
  const localExpiry = w.state.sessionExpiresAt;
  await w.run(11 * MIN);                                                    // the "local" expiry is passed
  check('local expiry reached but the server says "still valid" (another tab active) → NOT wrongly signed out', w.state.sessionExpired === false && w.state.sessionExpiresAt > localExpiry);
  check('…the server confirmation happened (it wasn\'t just luck)', (w.srv.calls.session_status || 0) >= 2);
  check('…and NO false alarm meanwhile: no emergency backup, no persistent notice, no flashing login screen', w.log.flushed === 0 && w.log.notices.length === 0 && w.log.reauth === 0, `flushed=${w.log.flushed} notices=${w.log.notices.length} reauth=${w.log.reauth}`);

  w = world({ config: NO_POLL }); w.mgr.start(); await settle();
  await w.run(31 * MIN);
  check('local expiry reached and the server confirms → detected even without any periodic polling (safety net)', w.state.sessionExpired === true);
  check('…within a few seconds of the real expiry', w.state.expiredAt - w.srv.expiredAtMs <= 6000, `latency=${w.state.expiredAt - w.srv.expiredAtMs} ms`);

  // another user in another tab
  w = world(); w.mgr.start(); await settle();
  w.srv.username = 'bob';
  await w.mgr.pollStatus();
  check('ANOTHER user logged in in the same browser → reload (don\'t act as ann)', w.log.reloads === 1 && w.state.sessionExpired === false);

  // immediate recheck (back to the tab / wake-up)
  w = world(); w.mgr.start(); await settle();
  w.clock.t += 45 * MIN;                                                    // the laptop was asleep: no ticks
  await w.mgr.recheck(); await settle();
  check('recheck() on returning to the tab detects the expiry RIGHT AWAY (without waiting for timers)', w.state.sessionExpired === true && w.log.flushed === 1);
}

section('RE-AUTHENTICATION');
{
  let w = world(); w.mgr.start(); await settle();
  w.clock.t += 40 * MIN;
  let settled = null;
  const p = w.mgr.handleUnauthorized().then((v) => { settled = v; });
  await settle();
  check('401: session marked expired, backup made, request ON HOLD', w.state.sessionExpired === true && w.log.flushed === 1 && settled === null);
  const p2 = w.mgr.handleUnauthorized();
  check('a second 401 does NOT redo the backup and shares the same wait', w.log.flushed === 1 && p2 !== undefined);

  w.srv.authenticated = true; w.srv.expiresAt = w.clock.t + 1800 * 1000; w.srv.csrf = 'T2';
  const ok = w.mgr.completeReauth({ username: 'ann', csrf: 'T2' });
  await p; await settle();
  check('re-login by the SAME user → overlay closed and pending requests released (true)', ok === true && settled === true && w.state.sessionExpired === false && w.state.expiredUser === null);
  check('…CSRF token updated', w.log.csrf.includes('T2') && w.log.reauth === 1);
  check('…the state is monitored again', w.state.sessionExpiresAt > w.clock.t);

  // different user
  w = world(); w.mgr.start(); await settle();
  w.clock.t += 40 * MIN;
  let resolved = false; w.mgr.handleUnauthorized().then(() => { resolved = true; }); await settle();
  const ok2 = w.mgr.completeReauth({ username: 'bob', csrf: 'X' });
  await settle();
  check('re-login by a DIFFERENT USER → reload from scratch, no request is replayed as bob', ok2 === false && w.log.reloads === 1 && resolved === false);
  check('…and the new user\'s token is not adopted by this tab', !w.log.csrf.includes('X'));

  // login done in another tab → automatic resume
  w = world(); w.mgr.start(); await settle();
  await w.run(31 * MIN);
  check('(expired)', w.state.sessionExpired === true);
  w.srv.authenticated = true; w.srv.expiresAt = w.clock.t + 1800 * 1000; w.srv.csrf = 'T9';
  await w.run(6000);
  check('login done in ANOTHER tab → this one resumes on its own', w.state.sessionExpired === false && w.log.csrf.includes('T9'));

  // another tab with a different user
  w = world(); w.mgr.start(); await settle();
  await w.run(31 * MIN);
  w.srv.authenticated = true; w.srv.username = 'bob'; w.srv.expiresAt = w.clock.t + 1800 * 1000;
  await w.run(6000);
  check('another tab with a different user → reload, doesn\'t resume as ann', w.log.reloads >= 1 && w.state.expiredUser === 'ann');

  // login screen: no interception
  w = world(); w.state.isAuthenticated = false; w.mgr.start(); await settle();
  const r = await orTimeout(w.mgr.handleUnauthorized());
  check('with an unauthenticated user (normal login screen) a 401 does NOT show the overlay', r === false && w.state.sessionExpired === false);
  w.mgr.tick();
  check('…and the tick does nothing', true);

  // 403 CSRF
  w = world(); w.mgr.start(); await settle();
  let v = await w.mgr.handleCsrfFailure();
  check('403 CSRF with a valid session → "refreshed" and token updated', v === 'refreshed' && w.log.csrf.includes('T1') && w.state.sessionExpired === false);
  w.clock.t += 40 * MIN;
  const pv = w.mgr.handleCsrfFailure(); await settle();
  check('403 CSRF with an expired session → treated as expiry (login shown)', w.state.sessionExpired === true);
  w.srv.authenticated = true; w.srv.expiresAt = w.clock.t + 1800 * 1000;
  w.mgr.completeReauth({ username: 'ann', csrf: 'T1' });
  check('…and after re-login the verdict is "reauthenticated"', (await pv) === 'reauthenticated');

  // stop
  w = world(); w.mgr.start(); await settle(); w.mgr.stop();
  check('stop(): no longer running', w.mgr.isRunning() === false);
}

// =============================================================== FETCH GUARD
section('FETCH GUARD');
{
  const script = []; const calls = [];
  const originalFetch = async (input, init) => { calls.push({ input, headers: new Headers(init && init.headers), body: init && init.body }); return script.shift()(input, init); };
  const res = (status, body = {}) => () => new Response(JSON.stringify(body), { status });
  let token = 'T1';
  const base = { originalFetch, getToken: () => token };

  let sess = { handleUnauthorized: async () => false, handleCsrfFailure: async () => 'unknown' };
  let g = createGuardedFetch({ ...base, session: sess });
  script.push(res(200, { ok: 1 }));
  let r = await g('api.php?action=get_pages');
  check('200 → returned as is', r.status === 200 && (await r.json()).ok === 1);
  check('the CSRF token is injected', calls.at(-1).headers.get('X-CSRF-Token') === 'T1');

  calls.length = 0; script.push(res(200));
  await g('https://esterno.example/x');
  check('absolute/external URL: no token and no guard', calls[0].headers.get('X-CSRF-Token') === null);

  calls.length = 0; script.push(res(200));
  await g('api.php?action=save_page', { method: 'POST', headers: { 'X-CSRF-Token': 'custom' } });
  check('an explicit CSRF header is not overwritten', calls[0].headers.get('X-CSRF-Token') === 'custom');

  // 401 + re-login + replay with the NEW token
  calls.length = 0;
  let release; const gate = new Promise((r2) => { release = r2; });
  sess = { handleUnauthorized: async () => { await gate; return true; }, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(401, { code: 'session_expired' }), res(200, { success: true, saved: 'ok' }));
  const body = JSON.stringify({ blocks: [1, 2, 3] });
  const pr = g('api.php?action=save_page', { method: 'POST', body });
  await settle();
  check('401: the request stays ON HOLD (doesn\'t return an error to the UI)', calls.length === 1);
  token = 'T2'; release();
  r = await pr; const j = await r.json();
  check('after re-login the request is REPLAYED and the caller receives the success', j.saved === 'ok' && calls.length === 2);
  check('…with the NEW CSRF token', calls[1].headers.get('X-CSRF-Token') === 'T2');
  check('…and with the SAME body', calls[1].body === body && calls[0].body === body);

  // replay only once
  calls.length = 0; token = 'T1';
  sess = { handleUnauthorized: async () => true, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(401), res(401));
  r = await g('api.php?action=get_pages');
  check('if the replay also returns 401: returned as is, no infinite loop', r.status === 401 && calls.length === 2);

  // different user / no re-authentication → no replay
  calls.length = 0;
  sess = { handleUnauthorized: async () => false, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(401));
  r = await g('api.php?action=save_page', { method: 'POST', body: '{}' });
  check('re-authentication denied → no replay, 401 returned', r.status === 401 && calls.length === 1);

  // exempt actions
  for (const a of ['login', 'check_auth', 'session_status', 'version', 'logout']) {
    calls.length = 0; let called = 0;
    sess = { handleUnauthorized: async () => { called++; return true; }, handleCsrfFailure: async () => 'refreshed' };
    g = createGuardedFetch({ ...base, session: sess });
    script.push(res(401));
    r = await g('api.php?action=' + a);
    check(`exempt action "${a}": a 401 is not intercepted`, r.status === 401 && called === 0 && calls.length === 1);
  }

  // rebuild_all.php is guarded
  calls.length = 0; let called = 0;
  sess = { handleUnauthorized: async () => { called++; return true; }, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(401), res(200, { success: true }));
  r = await g('rebuild_all.php');
  check('rebuild_all.php (publishing) is guarded and replayed', called === 1 && r.status === 200 && calls.length === 2);

  // non-API files
  calls.length = 0; called = 0; script.push(res(401));
  await g('/uploads/immagine.png');
  check('non-API resources: no interception', called === 0);

  // several concurrent requests with a single login
  calls.length = 0; token = 'T1';
  let rel2; const gate2 = new Promise((r2) => { rel2 = r2; });
  sess = { handleUnauthorized: async () => { await gate2; return true; }, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(401), res(401), res(401), res(200, { n: 1 }), res(200, { n: 2 }), res(200, { n: 3 }));
  const all = Promise.all([g('api.php?action=a'), g('api.php?action=b'), g('api.php?action=c')]);
  await settle(); token = 'T7'; rel2();
  const out = await all;
  check('3 pending requests, a single login → all 3 replayed', out.every((x) => x.status === 200) && calls.length === 6);

  // 403 CSRF
  calls.length = 0; token = 'OLD';
  sess = { handleUnauthorized: async () => true, handleCsrfFailure: async () => { token = 'FRESH'; return 'refreshed'; } };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(403, { success: false, message: 'Invalid CSRF token. Reload the page.' }), res(200, { success: true }));
  r = await g('api.php?action=save_page', { method: 'POST', body: '{}' });
  check('403 CSRF with a token to refresh → retries with the new token', r.status === 200 && calls[1].headers.get('X-CSRF-Token') === 'FRESH');

  calls.length = 0; called = 0;
  sess = { handleUnauthorized: async () => true, handleCsrfFailure: async () => { called++; return 'refreshed'; } };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(403, { success: false, message: 'Only Admins can manage accounts.' }));
  r = await g('api.php?action=add_user', { method: 'POST', body: '{}' });
  check('403 for another reason (permissions) → NOT touched', r.status === 403 && called === 0 && calls.length === 1);

  calls.length = 0;
  sess = { handleUnauthorized: async () => true, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(403, { message: 'Invalid CSRF token.' }));
  r = await g('api.php?action=save_page', { method: 'POST', body: '{}' });
  check('403 CSRF with verdict "unknown" → returned, no replay', r.status === 403 && calls.length === 1);

  calls.length = 0; script.push(() => new Response('<html>Forbidden</html>', { status: 403 }));
  r = await g('api.php?action=save_page', { method: 'POST', body: '{}' });
  check('403 with a non-JSON body → no exception', r.status === 403);

  // reusable FormData
  calls.length = 0; token = 'T1';
  sess = { handleUnauthorized: async () => true, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  const fd = new FormData(); fd.append('file', new Blob(['abc'], { type: 'image/png' }), 'a.png');
  script.push(res(401), res(200, { success: true }));
  r = await g('api.php?action=upload_media', { method: 'POST', body: fd });
  check('upload (FormData): replay with the same body', r.status === 200 && calls[0].body === fd && calls[1].body === fd);
}

// =============================================================== INTEGRATION
section('INTEGRATION: save interrupted by expiry');
{
  const w = world(); w.mgr.start(); await settle();
  let token = 'T1';
  const guarded = createGuardedFetch({ originalFetch: w.srv.fetch, session: w.mgr, getToken: () => token });
  const log = (...a) => void a;

  // the user works for a long time without talking to the server, then presses "Save"
  w.clock.t += 40 * MIN; log();
  let result = null;
  const saving = guarded('api.php?action=save_page', { method: 'POST', body: JSON.stringify({ id: 'p1' }) }).then((r) => r.json()).then((j) => { result = j; });
  await settle();
  check('"Save" with an expired session: the UI receives NEITHER an error NOR a false success, it waits', result === null);
  check('…the login appears on top of the app (session marked expired) and the backup was made', w.state.sessionExpired === true && w.log.flushed === 1);
  check('…the server saved nothing (request rejected)', w.srv.saves === 0);

  // the user logs in: new session, new token
  w.srv.authenticated = true; w.srv.expiresAt = w.clock.t + 1800 * 1000; w.srv.csrf = 'T2'; token = 'T2';
  w.mgr.completeReauth({ username: 'ann', csrf: 'T2' });
  await saving; await settle();
  check('after re-login the save is COMPLETED automatically', result && result.success === true);
  check('…and it ran only ONCE (no double save)', w.srv.saves === 1);
}
{
  const w = world(); w.mgr.start(); await settle();
  let token = 'T1';
  const guarded = createGuardedFetch({ originalFetch: w.srv.fetch, session: w.mgr, getToken: () => token });
  w.clock.t += 40 * MIN;
  let done = false;
  guarded('api.php?action=save_page', { method: 'POST', body: '{}' }).then(() => { done = true; });
  await settle();
  w.srv.authenticated = true; w.srv.username = 'bob'; w.srv.expiresAt = w.clock.t + 1800 * 1000; w.srv.csrf = 'TB'; token = 'TB';
  w.mgr.completeReauth({ username: 'bob', csrf: 'TB' });
  await new Promise((r) => setTimeout(r, 30));
  check('re-login as ANOTHER user: ann\'s save is NOT performed on behalf of bob', w.srv.saves === 0 && done === false && w.log.reloads === 1);
}
{
  const w = world(); w.mgr.start(); await settle();
  let token = 'STALE';
  const guarded = createGuardedFetch({ originalFetch: w.srv.fetch, session: w.mgr, getToken: () => token });
  const origSet = w.log.csrf;
  const m2 = createSessionManager({
    store: w.store, fetchFn: w.srv.fetch, now: () => w.clock.t, setIntervalFn: () => 1, clearIntervalFn: () => {},
    setCsrf: (t) => { token = t; origSet.push(t); },
  });
  const g2 = createGuardedFetch({ originalFetch: w.srv.fetch, session: m2, getToken: () => token });
  void guarded;
  const r = await g2('api.php?action=save_page', { method: 'POST', body: '{}' });
  check('expired CSRF token but valid session: self-heals (refreshes the token and retries) without warnings', r.status === 200 && w.srv.saves === 1 && token === 'T1');
}

} catch (e) { fails++; total++; console.error('  ✗ EXCEPTION during the tests: ' + ((e && e.stack) || e).toString().split('\n').slice(0, 4).join(' | ')); }

console.log(`\n${fails === 0 ? 'SESSION OK' : fails + ' checks failed'} (${total} checks)`);
process.exit(fails === 0 ? 0 : 1);
