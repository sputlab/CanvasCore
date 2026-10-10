// canvascore-frontend/src/session/draftTrackers.js
// Logica (pura, senza React) che decide QUANDO c'e' lavoro non salvato e lo scrive nel backup locale.
//  - createEditorDraftTracker: editor a blocchi (pagine, voci di collezione, header/footer, master)
//  - createDraftChannel:       viste con stato locale (menu, impostazioni globali)
//  - applyDraftToStore:        ripristino di una bozza nello store

import { canon, saveDraft, clearDraft, readDraft } from './drafts.js';

// Campi della pagina che contano per "ho modificato qualcosa" (esclude updated_at, content_json, ...)
const PAGE_KEYS = ['id', 'title', 'slug', 'seo_title', 'seo_description', 'seo_image', 'layout', 'bg_color', 'boxed_width',
  'is_home', 'excerpt', 'cover_image', 'date', 'archived', 'status', 'collection_id', '__part', '__item'];

export function pickPage(p) {
  const r = {};
  if (!p) return r;
  for (const k of PAGE_KEYS) if (p[k] !== undefined) r[k] = p[k];
  return r;
}

// Pagina senza i campi pesanti (il contenuto sta in "blocks"): evita di triplicare la dimensione del backup.
export function slimPage(p) {
  if (!p) return p;
  const { content_json, draft_copy, ...rest } = p; // eslint-disable-line no-unused-vars
  return rest;
}

// In modalita' Master "blocks" contiene il master; la pagina vera sta in editingMaster.pageBackup.
export function editorSnapshot(s) {
  const master = !!(s.isEditingMaster && s.editingMaster);
  const page = master ? s.editingMaster.activePageBackup : s.activePage;
  const blocks = master ? s.editingMaster.pageBackup : s.blocks;
  return {
    page: { page: pickPage(page), blocks: blocks || [] },
    master: master ? { id: s.editingMaster.id, name: s.editingMaster.name, blocks: s.blocks || [] } : null,
  };
}

export function editorPayload(s) {
  const snap = editorSnapshot(s);
  const master = !!(s.isEditingMaster && s.editingMaster);
  const fullPage = master ? s.editingMaster.activePageBackup : s.activePage;
  return { page: { page: slimPage(fullPage), blocks: snap.page.blocks }, master: snap.master };
}

export function editorContextKey(s) {
  const master = !!(s.isEditingMaster && s.editingMaster);
  const page = master ? s.editingMaster.activePageBackup : s.activePage;
  return 'page:' + (page && page.id ? page.id : 'new');
}
export const editorScope = (s) => 'editor:' + editorContextKey(s);

const realSetTimeout = (f, ms) => setTimeout(f, ms);
const realClearTimeout = (t) => clearTimeout(t);

export function createEditorDraftTracker({ getState, setState, debounceMs = 600, setTimeoutFn = realSetTimeout, clearTimeoutFn = realClearTimeout }) {
  // base.x: undefined = baseline non ancora catturata | null = "considera sempre modificato"
  // (stato ripristinato da una bozza: la versione del server non e' nota) | string = firma dello stato salvato
  const base = { page: undefined, master: undefined };
  let timer = null;
  let lastMasterId = null;
  let started = false;

  const masterId = (s) => ((s.isEditingMaster && s.editingMaster) ? s.editingMaster.id : null);
  const sigPage = (s) => canon(editorSnapshot(s).page);
  const sigMaster = (s) => { const m = editorSnapshot(s).master; return m ? canon(m) : undefined; };

  function dirtyState(s) {
    const snap = editorSnapshot(s);
    const pageDirty = base.page === null || (base.page !== undefined && canon(snap.page) !== base.page);
    const masterDirty = !!snap.master && (base.master === null || (base.master !== undefined && canon(snap.master) !== base.master));
    return pageDirty || masterDirty;
  }

  function evaluate() {
    clearTimeoutFn(timer); timer = null;
    if (!started) return;
    const s = getState();
    if (!s.activePage) return;              // stato azzerato (logout/uscita dall'editor): non toccare le bozze
    const scope = editorScope(s);
    if (dirtyState(s)) {
      const r = saveDraft(scope, editorPayload(s));
      setState({ editorDirty: true, draftBackupFailed: !r.ok });
    } else {
      clearDraft(scope);                    // tornato allo stato salvato (salvataggio o undo): niente da proteggere
      setState({ editorDirty: false, draftBackupFailed: false });
    }
  }

  function start() {
    const s = getState();
    const restored = !!s.editorRestored;
    base.page = restored ? null : sigPage(s);
    lastMasterId = masterId(s);
    base.master = lastMasterId ? (restored ? null : sigMaster(s)) : undefined;
    started = true;
    setState({ editorDirty: restored });
  }

  // Da chiamare ad ogni cambio dello store (subscribe). Il lavoro pesante e' in debounce.
  function onChange(s, prev) {
    if (!started) return;
    if (s.blocks === prev.blocks && s.activePage === prev.activePage
      && s.isEditingMaster === prev.isEditingMaster && s.editingMaster === prev.editingMaster) return;
    const mid = masterId(s);
    if (mid !== lastMasterId) {             // ingresso/uscita dalla modifica di un master
      lastMasterId = mid;
      base.master = mid ? sigMaster(s) : undefined;
    }
    clearTimeoutFn(timer);
    timer = setTimeoutFn(evaluate, debounceMs);
  }

  // Dopo un salvataggio riuscito della pagina: lo stato corrente diventa la nuova baseline.
  function markSaved() {
    const s = getState();
    base.page = sigPage(s);
    if (s.editorRestored) setState({ editorRestored: false });
    evaluate();
  }

  // Scarta il lavoro non salvato ("annulla le modifiche ripristinate", "scarta bozza" sul server):
  // lo stato corrente diventa la baseline, quindi la bozza locale viene eliminata e non riscritta.
  function discard() {
    const s = getState();
    base.page = sigPage(s);
    base.master = (s.isEditingMaster && s.editingMaster) ? sigMaster(s) : undefined;
    if (s.editorRestored) setState({ editorRestored: false });
    evaluate();
  }

  return { start, onChange, evaluate, markSaved, discard, dispose: evaluate, _base: () => ({ ...base }) };
}

// ---------------------------------------------------------------------------
// Canale per viste con stato locale (menu, impostazioni): confronto col valore caricato dal server.
// ---------------------------------------------------------------------------
export function createDraftChannel(scope, { debounceMs = 600, setTimeoutFn = realSetTimeout, clearTimeoutFn = realClearTimeout, onBackupStatus = () => {} } = {}) {
  let ready = false;
  let base = '';
  let server;
  let current;
  let timer = null;

  function evaluate() {
    clearTimeoutFn(timer); timer = null;
    if (!ready) return;                     // prima del caricamento dal server NON si scrive (e non si cancella) nulla
    if (canon(current) === base) { clearDraft(scope); onBackupStatus(true); }
    else { const r = saveDraft(scope, current); onBackupStatus(r.ok); }
  }

  return {
    // Chiamare quando i dati arrivano dal server. Restituisce l'eventuale bozza da riapplicare.
    loaded(serverValue) {
      server = serverValue; current = serverValue; base = canon(serverValue); ready = true;
      const d = readDraft(scope);
      if (!d) return null;
      if (canon(d.payload) === base) { clearDraft(scope); return null; }   // coincide col server: inutile
      return { value: d.payload, savedAt: d.savedAt };
    },
    update(value) {
      current = value;
      if (!ready) return;
      clearTimeoutFn(timer);
      timer = setTimeoutFn(evaluate, debounceMs);
    },
    saved(value) { base = canon(value); current = value; evaluate(); },
    discard() { clearDraft(scope); current = server; base = canon(server); clearTimeoutFn(timer); timer = null; return server; },
    flush: evaluate,
    serverValue: () => server,
    isDirty: () => ready && canon(current) !== base,
  };
}

// ---------------------------------------------------------------------------
// Ripristino di una bozza nello store. Restituisce la vista di destinazione.
// ---------------------------------------------------------------------------
export function applyDraftToStore(entry, setState) {
  const scope = entry.scope || '';
  if (scope === 'menu') { setState({ currentView: 'menu' }); return 'menu'; }
  if (scope === 'settings') { setState({ currentView: 'settings' }); return 'settings'; }
  if (scope.startsWith('editor:')) {
    const pl = entry.payload || {};
    const page = pl.page && pl.page.page;
    const master = pl.master || null;
    if (!page) return null;
    setState({
      activePage: page,
      blocks: master ? master.blocks : (pl.page.blocks || []),
      isEditingMaster: !!master,
      editingMaster: master ? { id: master.id, name: master.name, pageBackup: pl.page.blocks || [], activePageBackup: page } : null,
      pastBlocks: [], futureBlocks: [], selectedBlockId: null,
      currentView: 'editor', editorRestored: true, editorDirty: true,
    });
    return 'editor';
  }
  return null;
}
