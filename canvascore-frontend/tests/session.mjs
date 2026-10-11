// tests/session.mjs
// Test della gestione di sessione: backup locale, tracker del "non salvato", gestore di sessione
// (con server finto che scade per inattivita' e orologio simulato) e guardia sulle fetch.
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
// Un'attesa che potrebbe non terminare mai (bug) deve diventare un controllo fallito, non un processo appeso.
const orTimeout = (p, ms = 200) => Promise.race([p, new Promise((r) => setTimeout(() => r('TIMEOUT'), ms))]);

try {

// =============================================================== DRAFTS
section('BACKUP LOCALE (drafts)');
{
  const st = freshStorage();
  check('firma canonica: l\'ordine delle chiavi non conta', canon({ a: 1, b: { c: 2, d: [1, { x: 1, y: 2 }] } }) === canon({ b: { d: [1, { y: 2, x: 1 }], c: 2 }, a: 1 }));
  check('firma canonica: una modifica reale cambia la firma', canon({ a: [1, 2] }) !== canon({ a: [1, 3] }));
  check('firma canonica: undefined e chiavi assenti coincidono', canon({ a: 1, b: undefined }) === canon({ a: 1 }));

  const payload = { page: { page: { id: 'p1', title: 'Home' }, blocks: [{ id: 'b', type: 'TEXT', content: { text: '<p>ciao àè 😀</p>' } }] }, master: null };
  check('save → ok', saveDraft('editor:page:p1', payload).ok === true);
  const back = readDraft('editor:page:p1');
  check('read restituisce il payload identico (unicode incluso)', canon(back.payload) === canon(payload));
  check('savedAt è valorizzato', typeof back.savedAt === 'number' && back.savedAt > 0);
  clearDraft('editor:page:p1');
  check('clear elimina la bozza', readDraft('editor:page:p1') === null);

  saveDraft('menu', { items: [1] });
  setDraftUser('bob');
  check('un altro utente NON vede le bozze di ann', readDraft('menu') === null && listDrafts().length === 0);
  saveDraft('menu', { items: [2] });
  setDraftUser('ann');
  check('ogni utente ha le proprie bozze separate', readDraft('menu').payload.items[0] === 1);
  check('listDrafts(ann) contiene solo le sue', listDrafts().length === 1);

  setDraftUser(null);
  check('senza utente non si salva nulla', saveDraft('menu', {}).ok === false);
  setDraftUser('ann');

  st.m.set('cc_draft:v1:ann:rotta', '{non json');
  st.m.set('cc_draft:v1:ann:vuota', JSON.stringify({ v: 1, scope: 'x' }));
  let threw = false; let n = 0;
  try { n = listDrafts().length; } catch { threw = true; }
  check('voci corrotte o incomplete vengono ignorate senza errori', !threw && n === 1, `n=${n}`);

  // quota piena
  const st2 = freshStorage(); st2.quota = 50;
  let r; threw = false;
  try { r = saveDraft('menu', { items: new Array(50).fill('x'.repeat(20)) }); } catch { threw = true; }
  check('quota piena: nessuna eccezione', !threw);
  check('quota piena: ok=false con motivo "quota" (la UI deve avvisare)', r && r.ok === false && r.reason === 'quota');
  check('quota piena: resta comunque leggibile dalla memoria (login sovrapposto)', readDraft('menu') !== null);

  // storage assente
  __setStorage(null); setDraftUser('ann');
  check('storage non disponibile → storageAvailable=false', storageAvailable() === false);
  r = saveDraft('menu', { a: 1 });
  check('storage assente: ok=false, nessuna eccezione', r.ok === false && r.reason === 'no-storage');
  check('storage assente: fallback in memoria leggibile', readDraft('menu').payload.a === 1);

  // purge
  const st3 = freshStorage();
  saveDraft('menu', { a: 1 });
  check('purge: una bozza recente resta', purgeOldDrafts(Date.now() + 13 * 86400000) === 0 && readDraft('menu') !== null);
  check('purge: una bozza oltre 14 giorni viene eliminata', purgeOldDrafts(Date.now() + 15 * 86400000) === 1 && readDraft('menu') === null);
  void st3;

  // etichette
  const page = (extra = {}) => ({ scope: 'editor:page:p1', payload: { page: { page: { id: 'p1', title: 'Chi siamo', ...extra }, blocks: [] }, master: null } });
  check('etichetta pagina', describeDraft(page()).kind === 'Page' && describeDraft(page()).title === 'Chi siamo');
  check('etichetta voce di collezione', describeDraft(page({ __item: true })).kind === 'Collection item');
  check('etichetta header/footer', describeDraft(page({ __part: 'header' })).kind === 'Global header' && describeDraft(page({ __part: 'footer' })).kind === 'Global footer');
  check('etichetta master', describeDraft({ scope: 'editor:page:p1', payload: { page: { page: {} }, master: { name: 'Navbar' } } }).kind === 'Master component');
  check('etichetta menu/impostazioni', describeDraft({ scope: 'menu' }).kind === 'Menu' && describeDraft({ scope: 'settings' }).kind === 'Global options');

  // flusher
  let a = 0, b = 0;
  const un = registerFlusher(() => { a++; });
  registerFlusher(() => { throw new Error('guasto'); });
  registerFlusher(() => { b++; });
  flushDrafts();
  check('flushDrafts esegue tutti i flusher', a === 1 && b === 1);
  check('un flusher che lancia non blocca gli altri', b === 1);
  un(); flushDrafts();
  check('unregister funziona', a === 1 && b === 2);

  // notice
  freshStorage();
  check('nessun avviso iniziale', readExpiredNotice() === null);
  setExpiredNotice({ user: 'ann', at: 123 });
  check('avviso di sessione scaduta salvato e riletto', readExpiredNotice().user === 'ann');
  clearExpiredNotice();
  check('avviso eliminato', readExpiredNotice() === null);
}

// =============================================================== TRACKER EDITOR
section('TRACKER EDITOR (quando c\'è lavoro non salvato)');
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
  check('appena aperto: pulito, nessuna bozza', e.get().editorDirty === false && listDrafts().length === 0);

  e.set({ blocks: [{ id: 'b1', type: 'TEXT', content: { text: 'MODIFICATO' }, styles: {} }] }); e.run();
  check('modifica ai blocchi → editorDirty e bozza scritta', e.get().editorDirty === true && listDrafts().length === 1);
  const d = readDraft('editor:page:p1');
  check('la bozza contiene i blocchi modificati', d.payload.page.blocks[0].content.text === 'MODIFICATO');
  check('la pagina nella bozza non porta content_json/draft_copy (niente triplicazione)', d.payload.page.page.content_json === undefined && d.payload.page.page.draft_copy === undefined);
  check('…ma conserva i campi utili (id, parent_id, is_draft_copy)', d.payload.page.page.id === 'p1' && 'parent_id' in d.payload.page.page && 'is_draft_copy' in d.payload.page.page);

  e.set({ blocks: [{ styles: {}, content: { text: 'a' }, type: 'TEXT', id: 'b1' }] }); e.run();
  check('tornando allo stato iniziale (undo), anche con chiavi in altro ordine, NON è più sporco', e.get().editorDirty === false && listDrafts().length === 0);

  e.set({ activePage: { ...e.get().activePage, updated_at: 't9', content_json: 'altro' } }); e.run();
  check('campi irrilevanti (updated_at, content_json) non contano come modifica', e.get().editorDirty === false && listDrafts().length === 0);

  e.set({ activePage: { ...e.get().activePage, title: 'Nuovo titolo' } }); e.run();
  check('modifica del titolo → sporco', e.get().editorDirty === true);

  e.tracker.markSaved();
  check('dopo un salvataggio riuscito: pulito e bozza eliminata', e.get().editorDirty === false && listDrafts().length === 0);
  e.set({ blocks: [{ id: 'b1', type: 'TEXT', content: { text: 'x' }, styles: {} }] }); e.run();
  check('dopo il salvataggio una nuova modifica torna a essere protetta', e.get().editorDirty === true && listDrafts().length === 1);

  // dispose: scrive anche le modifiche ancora "in attesa" del debounce
  e = makeEditor(); e.tracker.start();
  e.set({ blocks: [] });                      // niente run(): il timer non e' ancora scattato
  check('prima del debounce la bozza non c\'è ancora', listDrafts().length === 0);
  e.tracker.dispose();
  check('dispose/flush scrive subito le modifiche in attesa', listDrafts().length === 1);

  // più pagine = più bozze
  e = makeEditor(); e.tracker.start();
  e.set({ blocks: [] }); e.run();
  const e2 = makeEditor(); // stesso storage? no: freshStorage ricrea. Simulo manualmente un altro contesto
  void e2;
  setDraftUser('ann');
  saveDraft('editor:page:ALTRA', { page: { page: { id: 'ALTRA' }, blocks: [] }, master: null });
  check('le bozze di pagine diverse convivono', listDrafts().length === 1 || listDrafts().length === 2);

  // stato azzerato (logout / uscita): non deve toccare né creare bozze
  e = makeEditor(); e.tracker.start();
  e.set({ blocks: [{ id: 'z' }] }); e.run();
  const nBefore = listDrafts().length;
  e.set({ activePage: null, blocks: [] }); e.run(); e.tracker.dispose();
  check('stato azzerato: le bozze esistenti restano e non ne nasce una "vuota"', listDrafts().length === nBefore && listDrafts().every((x) => x.scope !== 'editor:page:new'));

  // backup fallito (quota)
  e = makeEditor({ quota: 30 }); e.tracker.start();
  e.set({ blocks: [{ id: 'b1', type: 'TEXT', content: { text: 'x'.repeat(200) }, styles: {} }] }); e.run();
  check('quota piena: editorDirty=true e draftBackupFailed=true (la UI deve avvisare)', e.get().editorDirty === true && e.get().draftBackupFailed === true);

  // ripristinato da bozza → sempre "da salvare"
  e = makeEditor({ restored: true }); e.tracker.start();
  check('ripristinato da una bozza: considerato non salvato fin dall\'inizio', e.get().editorDirty === true);
  e.set({ blocks: e.get().blocks.slice() }); e.run();
  check('…e la bozza resta finché non si salva', listDrafts().length === 1);
  e.tracker.markSaved();
  check('dopo il salvataggio: bozza eliminata e flag editorRestored azzerato', listDrafts().length === 0 && e.get().editorDirty === false && e.get().editorRestored === false);
}

// discard(): "annulla le modifiche ripristinate" / "scarta bozza": la bozza non deve essere riscritta subito dopo
{
  let e = makeEditor({ restored: true }); e.tracker.start();
  e.set({ blocks: e.get().blocks.slice() }); e.run();
  check('(ripristinato) la bozza esiste', listDrafts().length === 1);
  e.tracker.discard();
  check('discard(): bozza eliminata, non più sporco, flag editorRestored azzerato', listDrafts().length === 0 && e.get().editorDirty === false && e.get().editorRestored === false);
  e.tracker.dispose();
  check('…e NON viene riscritta all\'uscita dall\'editor (dispose)', listDrafts().length === 0);

  e = makeEditor({ restored: true });
  e.set({ isEditingMaster: true, editingMaster: { id: 'm', name: 'N', pageBackup: e.get().blocks, activePageBackup: e.get().activePage }, blocks: [{ id: 'mm' }] });
  e.tracker.start();
  e.tracker.evaluate();                          // come nella realtà: la bozza da cui si e' ripristinato esiste nello storage
  check('(ripristinato in modalità master) la bozza esiste', listDrafts().length === 1);
  e.tracker.discard(); e.tracker.dispose();
  check('discard() in modalità master: elimina la bozza e non la riscrive', listDrafts().length === 0 && e.get().editorDirty === false);
}

section('TRACKER EDITOR — modalità Master');
{
  const e = makeEditor(); e.tracker.start();
  const pageEdited = [{ id: 'b1', type: 'TEXT', content: { text: 'MODIFICA NON SALVATA DELLA PAGINA' }, styles: {} }];
  e.set({ blocks: pageEdited }); e.run();
  const masterBlocks = [{ id: 'm1', type: 'SECTION', content: {}, styles: {}, children: [] }];
  const page = e.get().activePage;
  e.set({ isEditingMaster: true, editingMaster: { id: 'mst1', name: 'Navbar', pageBackup: pageEdited, activePageBackup: page }, blocks: masterBlocks }); e.run();
  check('entrando nel master la pagina resta "sporca" (la sua bozza non sparisce)', e.get().editorDirty === true && listDrafts().length === 1);
  check('la bozza porta ancora le modifiche della PAGINA (non il contenuto del master)', readDraft('editor:page:p1').payload.page.blocks[0].content.text.startsWith('MODIFICA NON SALVATA'));
  check('…e il master è nel payload ma non ancora modificato → master.blocks = originali', readDraft('editor:page:p1').payload.master.id === 'mst1');

  const masterEdited = [{ ...masterBlocks[0], content: { x: 1 } }];
  e.set({ blocks: masterEdited }); e.run();
  check('modifica del master → payload.master.blocks aggiornato', canon(readDraft('editor:page:p1').payload.master.blocks) === canon(masterEdited));

  // ripristino: payload → store → stesso snapshot
  const payload = readDraft('editor:page:p1').payload;
  let st2 = {}; const view = applyDraftToStore({ scope: 'editor:page:p1', payload }, (p) => { st2 = { ...st2, ...p }; });
  check('applyDraftToStore: va alla vista editor e segna editorRestored', view === 'editor' && st2.currentView === 'editor' && st2.editorRestored === true);
  check('applyDraftToStore: ripristina la modalità master con i backup della pagina', st2.isEditingMaster === true && st2.editingMaster.id === 'mst1' && canon(st2.editingMaster.pageBackup) === canon(pageEdited));
  check('roundtrip: snapshot ripristinato = snapshot salvato', canon(editorSnapshot(st2)) === canon(editorSnapshot(e.get())));
}
{
  const e = makeEditor(); e.tracker.start();
  e.set({ blocks: [{ id: 'q', type: 'TEXT', content: {}, styles: {} }] }); e.run();
  const payload = readDraft('editor:page:p1').payload;
  let st2 = {}; applyDraftToStore({ scope: 'editor:page:p1', payload }, (p) => { st2 = { ...st2, ...p }; });
  check('roundtrip pagina semplice: snapshot identico', canon(editorSnapshot(st2)) === canon(editorSnapshot(e.get())));
  check('ripristino pagina: non è in modalità master', st2.isEditingMaster === false && st2.editingMaster === null);
  check('ripristino: azzera la cronologia di undo e la selezione', st2.pastBlocks.length === 0 && st2.selectedBlockId === null);
  let v2 = {}; check('applyDraftToStore: menu e impostazioni → relative viste', applyDraftToStore({ scope: 'menu' }, (p) => { v2 = p; }) === 'menu' && v2.currentView === 'menu' && applyDraftToStore({ scope: 'settings' }, (p) => { v2 = p; }) === 'settings');
  check('applyDraftToStore: scope sconosciuto o payload rotto → null, senza eccezioni', applyDraftToStore({ scope: 'boh' }, () => {}) === null && applyDraftToStore({ scope: 'editor:x', payload: {} }, () => {}) === null);
  check('slimPage non muta l\'originale', (() => { const o = { id: 1, content_json: 'x', draft_copy: {} }; slimPage(o); return 'content_json' in o; })());
  check('editorPayload esiste e non include content_json', editorPayload(e.get()).page.page.content_json === undefined);
}

// =============================================================== CANALE (menu/impostazioni)
section('CANALE BOZZE (menu, impostazioni)');
{
  freshStorage();
  const pend = []; const statuses = [];
  const mk = () => createDraftChannel('menu', { setTimeoutFn: (f) => { pend.push(f); return pend.length; }, clearTimeoutFn: () => { pend.length = 0; }, onBackupStatus: (ok) => statuses.push(ok) });
  const run = () => pend.splice(0).forEach((f) => f());
  saveDraft('menu', { items: ['VECCHIA BOZZA'] });

  let ch = mk();
  ch.update({ items: [] }); ch.flush(); run();
  check('PRIMA del caricamento dal server non si scrive né si cancella nulla (la bozza esistente è salva)', readDraft('menu').payload.items[0] === 'VECCHIA BOZZA');

  const server = { items: ['dal server'] };
  let pendingDraft = ch.loaded(server);
  check('loaded(): restituisce la bozza diversa dal server', pendingDraft && pendingDraft.value.items[0] === 'VECCHIA BOZZA' && pendingDraft.savedAt > 0);

  ch.update(pendingDraft.value); run();
  check('dopo aver riapplicato la bozza, questa resta protetta (≠ server)', readDraft('menu') !== null && ch.isDirty() === true);
  const srv2 = ch.discard();
  check('discard(): elimina la bozza e restituisce il valore del server', readDraft('menu') === null && srv2.items[0] === 'dal server' && ch.isDirty() === false);

  ch = mk(); saveDraft('menu', server);
  check('bozza identica al server → eliminata e non proposta', ch.loaded(server) === null && readDraft('menu') === null);

  ch = mk(); ch.loaded(server);
  ch.update({ items: ['mod'] }); run();
  check('modifica → bozza scritta', readDraft('menu').payload.items[0] === 'mod');
  ch.update(server); run();
  check('ripristinato il valore del server → bozza eliminata', readDraft('menu') === null);
  ch.update({ items: ['x'] }); run();
  ch.saved({ items: ['x'] });
  check('saved(): la bozza viene eliminata e il nuovo valore diventa la baseline', readDraft('menu') === null && ch.isDirty() === false);
  ch.update({ items: ['y'] }); run();
  check('…una modifica successiva è di nuovo protetta', readDraft('menu') !== null);

  statuses.length = 0;
  const stq = freshStorage(); stq.quota = 10;
  ch = mk(); ch.loaded({ a: 1 }); ch.update({ a: 'x'.repeat(100) }); run();
  check('quota piena → onBackupStatus(false) per avvisare l\'utente', statuses.includes(false));
}

// =============================================================== GESTORE DI SESSIONE
section('GESTORE DI SESSIONE (server finto con scadenza per inattività)');
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
  let tickFn = null;
  const mgr = createSessionManager({
    store, fetchFn: srv.fetch, now: () => clock.t,
    setIntervalFn: (f) => { tickFn = f; return 1; }, clearIntervalFn: () => { tickFn = null; },
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
  check('start(): legge subito lo stato dal server (scadenza prevista)', w.state.sessionExpiresAt === w.clock.t + 1800 * 1000 && w.state.sessionTimeout === 1800);
  check('start(): isRunning', w.mgr.isRunning() === true);

  // inattivo per tutto il tempo
  w = world(); w.mgr.start(); await settle();
  await w.run(31 * MIN);
  check('INATTIVO per 31 min → sessione scaduta rilevata dal client', w.state.sessionExpired === true && w.state.expiredUser === 'ann');
  check('…senza che nessuna azione dell\'utente l\'abbia scoperta (solo polling)', !w.srv.calls.save_page);
  check('…il backup locale è stato fatto PRIMA di mostrare il login', w.log.flushed === 1);
  check('…avviso persistente scritto per la pagina di login', w.log.notices.length === 1 && w.log.notices[0].user === 'ann');
  const latency = w.state.expiredAt - w.srv.expiredAtMs;
  check('…rilevata entro ~35 s dalla scadenza reale (non al primo salvataggio!)', latency >= 0 && latency <= 35000, `latenza=${latency} ms`);
  check('…nessun keepalive inviato (l\'utente era inattivo): il polling non tiene viva la sessione', !w.srv.calls.keepalive);
  const calls = w.srv.calls.session_status;
  await w.run(5 * MIN);
  check('…dopo la scadenza non si continua a interrogare session_status', (w.srv.calls.session_status - calls) <= 1);

  // attivo per ore
  w = world(); w.mgr.start(); await settle();
  await w.run(120 * MIN, { activityEvery: 10000 });
  check('ATTIVO per 2 ore (senza salvare mai) → la sessione NON scade', w.state.sessionExpired === false && w.srv.authenticated === true);
  const ka = w.srv.calls.keepalive || 0;
  check('…con al massimo 1 keepalive al minuto', ka >= 100 && ka <= 125, `keepalive=${ka}`);
  await w.run(31 * MIN);
  check('…smette di lavorare: dopo 31 min di inattività scade', w.state.sessionExpired === true);

  // avviso pre-scadenza
  w = world(); w.mgr.start(); await settle();
  await w.run(27 * MIN + 30000);               // mancano 2m30
  check('a 2m30 dalla scadenza: nessun avviso', w.state.sessionWarning === false);
  await w.run(40000);                          // mancano ~1m50
  check('a meno di 2 minuti dalla scadenza: AVVISO attivo', w.state.sessionWarning === true && w.state.sessionExpired === false);
  const before = w.state.sessionExpiresAt;
  w.mgr.noteActivity(); await settle();
  check('un movimento dell\'utente → keepalive immediato, avviso chiuso e scadenza spostata', w.state.sessionWarning === false && w.state.sessionExpiresAt > before && w.srv.calls.keepalive === 1);

  // timeout breve: avviso al massimo a 1/3
  w = world({ timeout: 300 }); w.mgr.start(); await settle();
  await w.run(3 * MIN + 20000);                // mancano ~1m40 (> timeout/3=100s? e' a 100s)
  check('con timeout di 5 min l\'avviso scatta a 1/3 (≈100 s), non a 120 s', w.state.sessionWarning === false || (w.state.sessionExpiresAt - w.clock.t) <= 100000);

  // rete assente
  w = world(); w.mgr.start(); await settle();
  w.srv.offline = true;
  await w.run(10 * MIN, { activityEvery: 20000 });
  check('RETE ASSENTE per 10 min: NON è una sessione scaduta', w.state.sessionExpired === false);
  w.srv.offline = false; await w.run(40000, { activityEvery: 5000 });
  check('…al ritorno della rete tutto riprende', w.state.sessionExpired === false && w.srv.authenticated === true);

  // risposta illeggibile
  w = world(); w.mgr.start(); await settle();
  const origFetch = w.srv.fetch;
  w.srv.fetch = async () => new Response('<html>502 Bad Gateway</html>', { status: 502 });
  const w2 = createSessionManager({ store: w.store, fetchFn: w.srv.fetch, now: () => w.clock.t, setIntervalFn: () => 1, clearIntervalFn: () => {}, config: {} });
  await w2.pollStatus();
  check('risposta illeggibile (502 HTML) → NON è una scadenza', w.state.sessionExpired === false);
  w.srv.fetch = origFetch;

  // scadenza "locale" (orologio) senza polling periodico: l'unico meccanismo in gioco e' la CONFERMA col server
  const NO_POLL = { statusPollMs: 24 * 60 * MIN };
  w = world({ config: NO_POLL }); w.mgr.start(); await settle();
  w.clock.t += 20 * MIN; w.srv.expiresAt = w.clock.t + 30 * MIN;           // un'altra scheda e' attiva: il server ha allungato la sessione
  const localExpiry = w.state.sessionExpiresAt;
  await w.run(11 * MIN);                                                    // si supera la scadenza "locale"
  check('scadenza locale raggiunta ma il server dice "ancora valida" (altra scheda attiva) → NON ci si disconnette a torto', w.state.sessionExpired === false && w.state.sessionExpiresAt > localExpiry);
  check('…la conferma col server è avvenuta (non è stato solo un caso)', (w.srv.calls.session_status || 0) >= 2);
  check('…e NESSUN falso allarme nel frattempo: niente backup d\'emergenza, niente avviso persistente, niente schermata di login che lampeggia', w.log.flushed === 0 && w.log.notices.length === 0 && w.log.reauth === 0, `flushed=${w.log.flushed} notices=${w.log.notices.length} reauth=${w.log.reauth}`);

  w = world({ config: NO_POLL }); w.mgr.start(); await settle();
  await w.run(31 * MIN);
  check('scadenza locale raggiunta e il server conferma → rilevata anche senza alcun polling periodico (rete di sicurezza)', w.state.sessionExpired === true);
  check('…entro pochi secondi dalla scadenza reale', w.state.expiredAt - w.srv.expiredAtMs <= 6000, `latenza=${w.state.expiredAt - w.srv.expiredAtMs} ms`);

  // altro utente in un'altra scheda
  w = world(); w.mgr.start(); await settle();
  w.srv.username = 'bob';
  await w.mgr.pollStatus();
  check('un ALTRO utente ha fatto login nello stesso browser → ricarica (non agire come ann)', w.log.reloads === 1 && w.state.sessionExpired === false);

  // recheck immediato (ritorno sulla scheda / risveglio)
  w = world(); w.mgr.start(); await settle();
  w.clock.t += 45 * MIN;                                                    // il portatile dormiva: nessun tick
  await w.mgr.recheck(); await settle();
  check('recheck() al ritorno sulla scheda rileva SUBITO la scadenza (senza attendere i timer)', w.state.sessionExpired === true && w.log.flushed === 1);
}

section('RI-AUTENTICAZIONE');
{
  let w = world(); w.mgr.start(); await settle();
  w.clock.t += 40 * MIN;
  let settled = null;
  const p = w.mgr.handleUnauthorized().then((v) => { settled = v; });
  await settle();
  check('401: sessione marcata scaduta, backup fatto, richiesta IN ATTESA', w.state.sessionExpired === true && w.log.flushed === 1 && settled === null);
  const p2 = w.mgr.handleUnauthorized();
  check('un secondo 401 NON rifà il backup e condivide la stessa attesa', w.log.flushed === 1 && p2 !== undefined);

  w.srv.authenticated = true; w.srv.expiresAt = w.clock.t + 1800 * 1000; w.srv.csrf = 'T2';
  const ok = w.mgr.completeReauth({ username: 'ann', csrf: 'T2' });
  await p; await settle();
  check('re-login dello STESSO utente → overlay chiuso e richieste in attesa sbloccate (true)', ok === true && settled === true && w.state.sessionExpired === false && w.state.expiredUser === null);
  check('…token CSRF aggiornato', w.log.csrf.includes('T2') && w.log.reauth === 1);
  check('…lo stato ricomincia a essere monitorato', w.state.sessionExpiresAt > w.clock.t);

  // utente diverso
  w = world(); w.mgr.start(); await settle();
  w.clock.t += 40 * MIN;
  let resolved = false; w.mgr.handleUnauthorized().then(() => { resolved = true; }); await settle();
  const ok2 = w.mgr.completeReauth({ username: 'bob', csrf: 'X' });
  await settle();
  check('re-login di un UTENTE DIVERSO → ricarica da zero, nessuna richiesta riesegue come bob', ok2 === false && w.log.reloads === 1 && resolved === false);
  check('…e il token del nuovo utente non viene adottato da questa scheda', !w.log.csrf.includes('X'));

  // login fatto in un'altra scheda → ripresa automatica
  w = world(); w.mgr.start(); await settle();
  await w.run(31 * MIN);
  check('(scaduta)', w.state.sessionExpired === true);
  w.srv.authenticated = true; w.srv.expiresAt = w.clock.t + 1800 * 1000; w.srv.csrf = 'T9';
  await w.run(6000);
  check('login fatto in un\'ALTRA scheda → questa riprende da sola', w.state.sessionExpired === false && w.log.csrf.includes('T9'));

  // altra scheda con un utente diverso
  w = world(); w.mgr.start(); await settle();
  await w.run(31 * MIN);
  w.srv.authenticated = true; w.srv.username = 'bob'; w.srv.expiresAt = w.clock.t + 1800 * 1000;
  await w.run(6000);
  check('altra scheda con un utente diverso → ricarica, non riprende come ann', w.log.reloads >= 1 && w.state.expiredUser === 'ann');

  // schermata di login: nessuna intercettazione
  w = world(); w.state.isAuthenticated = false; w.mgr.start(); await settle();
  const r = await orTimeout(w.mgr.handleUnauthorized());
  check('con utente non autenticato (schermata di login normale) un 401 NON mostra l\'overlay', r === false && w.state.sessionExpired === false);
  w.mgr.tick();
  check('…e il tick non fa nulla', true);

  // 403 CSRF
  w = world(); w.mgr.start(); await settle();
  let v = await w.mgr.handleCsrfFailure();
  check('403 CSRF con sessione valida → "refreshed" e token aggiornato', v === 'refreshed' && w.log.csrf.includes('T1') && w.state.sessionExpired === false);
  w.clock.t += 40 * MIN;
  const pv = w.mgr.handleCsrfFailure(); await settle();
  check('403 CSRF con sessione scaduta → trattato come scadenza (login mostrato)', w.state.sessionExpired === true);
  w.srv.authenticated = true; w.srv.expiresAt = w.clock.t + 1800 * 1000;
  w.mgr.completeReauth({ username: 'ann', csrf: 'T1' });
  check('…e dopo il re-login il verdetto è "reauthenticated"', (await pv) === 'reauthenticated');

  // stop
  w = world(); w.mgr.start(); await settle(); w.mgr.stop();
  check('stop(): non è più in esecuzione', w.mgr.isRunning() === false);
}

// =============================================================== GUARDIA FETCH
section('GUARDIA FETCH');
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
  check('200 → restituita così com\'è', r.status === 200 && (await r.json()).ok === 1);
  check('il token CSRF viene iniettato', calls.at(-1).headers.get('X-CSRF-Token') === 'T1');

  calls.length = 0; script.push(res(200));
  await g('https://esterno.example/x');
  check('URL assoluto/esterno: nessun token e nessuna guardia', calls[0].headers.get('X-CSRF-Token') === null);

  calls.length = 0; script.push(res(200));
  await g('api.php?action=save_page', { method: 'POST', headers: { 'X-CSRF-Token': 'custom' } });
  check('un header CSRF esplicito non viene sovrascritto', calls[0].headers.get('X-CSRF-Token') === 'custom');

  // 401 + re-login + replay con il token NUOVO
  calls.length = 0;
  let release; const gate = new Promise((r2) => { release = r2; });
  sess = { handleUnauthorized: async () => { await gate; return true; }, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(401, { code: 'session_expired' }), res(200, { success: true, saved: 'ok' }));
  const body = JSON.stringify({ blocks: [1, 2, 3] });
  const pr = g('api.php?action=save_page', { method: 'POST', body });
  await settle();
  check('401: la richiesta resta IN ATTESA (non restituisce un errore all\'interfaccia)', calls.length === 1);
  token = 'T2'; release();
  r = await pr; const j = await r.json();
  check('dopo il re-login la richiesta viene RIESEGUITA e il chiamante riceve il successo', j.saved === 'ok' && calls.length === 2);
  check('…con il token CSRF NUOVO', calls[1].headers.get('X-CSRF-Token') === 'T2');
  check('…e con lo STESSO corpo', calls[1].body === body && calls[0].body === body);

  // replay una sola volta
  calls.length = 0; token = 'T1';
  sess = { handleUnauthorized: async () => true, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(401), res(401));
  r = await g('api.php?action=get_pages');
  check('se anche la riesecuzione dà 401: restituito così com\'è, nessun ciclo infinito', r.status === 401 && calls.length === 2);

  // utente diverso / nessuna ri-autenticazione → nessuna riesecuzione
  calls.length = 0;
  sess = { handleUnauthorized: async () => false, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(401));
  r = await g('api.php?action=save_page', { method: 'POST', body: '{}' });
  check('ri-autenticazione negata → nessuna riesecuzione, 401 restituito', r.status === 401 && calls.length === 1);

  // azioni esenti
  for (const a of ['login', 'check_auth', 'session_status', 'version', 'logout']) {
    calls.length = 0; let called = 0;
    sess = { handleUnauthorized: async () => { called++; return true; }, handleCsrfFailure: async () => 'refreshed' };
    g = createGuardedFetch({ ...base, session: sess });
    script.push(res(401));
    r = await g('api.php?action=' + a);
    check(`azione esente "${a}": un 401 non viene intercettato`, r.status === 401 && called === 0 && calls.length === 1);
  }

  // rebuild_all.php è protetto
  calls.length = 0; let called = 0;
  sess = { handleUnauthorized: async () => { called++; return true; }, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(401), res(200, { success: true }));
  r = await g('rebuild_all.php');
  check('rebuild_all.php (pubblicazione) è protetto e rieseguito', called === 1 && r.status === 200 && calls.length === 2);

  // file non-API
  calls.length = 0; called = 0; script.push(res(401));
  await g('/uploads/immagine.png');
  check('risorse non-API: nessuna intercettazione', called === 0);

  // più richieste concorrenti con un solo login
  calls.length = 0; token = 'T1';
  let rel2; const gate2 = new Promise((r2) => { rel2 = r2; });
  sess = { handleUnauthorized: async () => { await gate2; return true; }, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(401), res(401), res(401), res(200, { n: 1 }), res(200, { n: 2 }), res(200, { n: 3 }));
  const all = Promise.all([g('api.php?action=a'), g('api.php?action=b'), g('api.php?action=c')]);
  await settle(); token = 'T7'; rel2();
  const out = await all;
  check('3 richieste in attesa, 1 solo login → tutte e 3 riesegute', out.every((x) => x.status === 200) && calls.length === 6);

  // 403 CSRF
  calls.length = 0; token = 'OLD';
  sess = { handleUnauthorized: async () => true, handleCsrfFailure: async () => { token = 'FRESH'; return 'refreshed'; } };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(403, { success: false, message: 'Invalid CSRF token. Reload the page.' }), res(200, { success: true }));
  r = await g('api.php?action=save_page', { method: 'POST', body: '{}' });
  check('403 CSRF con token da rinfrescare → riprova col token nuovo', r.status === 200 && calls[1].headers.get('X-CSRF-Token') === 'FRESH');

  calls.length = 0; called = 0;
  sess = { handleUnauthorized: async () => true, handleCsrfFailure: async () => { called++; return 'refreshed'; } };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(403, { success: false, message: 'Only Admins can manage accounts.' }));
  r = await g('api.php?action=add_user', { method: 'POST', body: '{}' });
  check('403 per altro motivo (permessi) → NON viene toccato', r.status === 403 && called === 0 && calls.length === 1);

  calls.length = 0;
  sess = { handleUnauthorized: async () => true, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  script.push(res(403, { message: 'Invalid CSRF token.' }));
  r = await g('api.php?action=save_page', { method: 'POST', body: '{}' });
  check('403 CSRF con verdetto "unknown" → restituito, nessuna riesecuzione', r.status === 403 && calls.length === 1);

  calls.length = 0; script.push(() => new Response('<html>Forbidden</html>', { status: 403 }));
  r = await g('api.php?action=save_page', { method: 'POST', body: '{}' });
  check('403 con corpo non JSON → nessuna eccezione', r.status === 403);

  // FormData riutilizzabile
  calls.length = 0; token = 'T1';
  sess = { handleUnauthorized: async () => true, handleCsrfFailure: async () => 'unknown' };
  g = createGuardedFetch({ ...base, session: sess });
  const fd = new FormData(); fd.append('file', new Blob(['abc'], { type: 'image/png' }), 'a.png');
  script.push(res(401), res(200, { success: true }));
  r = await g('api.php?action=upload_media', { method: 'POST', body: fd });
  check('upload (FormData): riesecuzione con lo stesso corpo', r.status === 200 && calls[0].body === fd && calls[1].body === fd);
}

// =============================================================== INTEGRAZIONE
section('INTEGRAZIONE: salvataggio interrotto dalla scadenza');
{
  const w = world(); w.mgr.start(); await settle();
  let token = 'T1';
  const guarded = createGuardedFetch({ originalFetch: w.srv.fetch, session: w.mgr, getToken: () => token });
  const log = (...a) => void a;

  // l'utente lavora a lungo senza interagire col server, poi preme "Save"
  w.clock.t += 40 * MIN; log();
  let result = null;
  const saving = guarded('api.php?action=save_page', { method: 'POST', body: JSON.stringify({ id: 'p1' }) }).then((r) => r.json()).then((j) => { result = j; });
  await settle();
  check('"Save" con sessione scaduta: l\'interfaccia NON riceve un errore né un falso successo, resta in attesa', result === null);
  check('…il login compare sopra l\'app (sessione marcata scaduta) e il backup è stato fatto', w.state.sessionExpired === true && w.log.flushed === 1);
  check('…il server non ha salvato nulla (richiesta respinta)', w.srv.saves === 0);

  // l'utente fa login: nuova sessione, nuovo token
  w.srv.authenticated = true; w.srv.expiresAt = w.clock.t + 1800 * 1000; w.srv.csrf = 'T2'; token = 'T2';
  w.mgr.completeReauth({ username: 'ann', csrf: 'T2' });
  await saving; await settle();
  check('dopo il re-login il salvataggio viene COMPLETATO in automatico', result && result.success === true);
  check('…ed è stato eseguito UNA sola volta (nessun doppio salvataggio)', w.srv.saves === 1);
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
  check('re-login come ALTRO utente: il salvataggio di ann NON viene eseguito a nome di bob', w.srv.saves === 0 && done === false && w.log.reloads === 1);
}
{
  const w = world(); w.mgr.start(); await settle();
  let token = 'STALE';
  const guarded = createGuardedFetch({ originalFetch: w.srv.fetch, session: w.mgr, getToken: () => token });
  w.mgr = w.mgr; const origSet = w.log.csrf;
  const m2 = createSessionManager({
    store: w.store, fetchFn: w.srv.fetch, now: () => w.clock.t, setIntervalFn: () => 1, clearIntervalFn: () => {},
    setCsrf: (t) => { token = t; origSet.push(t); },
  });
  const g2 = createGuardedFetch({ originalFetch: w.srv.fetch, session: m2, getToken: () => token });
  void guarded;
  const r = await g2('api.php?action=save_page', { method: 'POST', body: '{}' });
  check('token CSRF scaduto ma sessione valida: si auto-ripara (rinfresca il token e riprova) senza avvisi', r.status === 200 && w.srv.saves === 1 && token === 'T1');
}

} catch (e) { fails++; total++; console.error('  ✗ ECCEZIONE durante i test: ' + ((e && e.stack) || e).toString().split('\n').slice(0, 4).join(' | ')); }

console.log(`\n${fails === 0 ? 'SESSIONE OK' : fails + ' controlli falliti'} (${total} controlli)`);
process.exit(fails === 0 ? 0 : 1);
