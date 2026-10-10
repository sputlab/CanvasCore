// canvascore-frontend/src/session/drafts.js
// Backup LOCALE del lavoro non salvato (rete di sicurezza per refresh, chiusura scheda, crash).
//
// - Le bozze stanno nel localStorage del browser, separate per utente: non finiscono mai sul server
//   e un altro utente dello stesso computer non le vede.
// - Se il localStorage non e' disponibile o e' pieno NON si lancia nulla: saveDraft() restituisce
//   { ok:false } e la UI lo segnala (un backup che fallisce in silenzio sarebbe peggio di nessun backup).
// - Modulo senza dipendenze da React/store: e' testabile in Node con uno storage finto.

const NS = 'cc_draft:v1:';
const NOTICE_KEY = 'cc_expired_notice:v1';
export const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;   // le bozze piu' vecchie di 14 giorni vengono eliminate

let storage = null;
let user = null;
const mem = new Map();          // fallback in memoria (quota piena / storage assente)

function probe(s) {
  try { const k = '__cc_probe__'; s.setItem(k, '1'); s.removeItem(k); return s; } catch { return null; }
}
try { if (typeof window !== 'undefined' && window.localStorage) storage = probe(window.localStorage); } catch { storage = null; }

// Solo per i test: sostituisce lo storage (senza sonda, per poter simulare errori di quota).
export function __setStorage(s) { storage = s || null; mem.clear(); user = null; }
export function storageAvailable() { return !!storage; }
export function setDraftUser(u) { user = u || null; }
export function getDraftUser() { return user; }

// JSON canonico: chiavi ordinate, quindi lo stesso stato logico produce sempre la stessa stringa
// (evita falsi "modificato" quando cambia solo l'ordine delle chiavi).
export function canon(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v !== 'object') return String(JSON.stringify(v) ?? 'null');
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}

const keyOf = (scope, u) => NS + u + ':' + scope;

export function saveDraft(scope, payload, meta = {}) {
  if (!user) return { ok: false, reason: 'no-user' };
  const raw = JSON.stringify({ v: 1, user, scope, savedAt: Date.now(), ...meta, payload });
  const key = keyOf(scope, user);
  if (!storage) { mem.set(key, raw); return { ok: false, reason: 'no-storage', volatile: true }; }
  try {
    storage.setItem(key, raw);
    mem.delete(key);
    return { ok: true };
  } catch {
    mem.set(key, raw);            // almeno in memoria (utile con la schermata di login sovrapposta)
    return { ok: false, reason: 'quota', volatile: true };
  }
}

function parse(raw) {
  try {
    const e = JSON.parse(raw);
    return (e && e.v === 1 && e.scope && e.payload !== undefined) ? e : null;
  } catch { return null; }
}

export function readDraft(scope, u = user) {
  if (!u) return null;
  const key = keyOf(scope, u);
  let raw = null;
  try { raw = storage ? storage.getItem(key) : null; } catch { raw = null; }
  if (raw == null) raw = mem.get(key) ?? null;
  return raw ? parse(raw) : null;
}

export function clearDraft(scope, u = user) {
  if (!u) return;
  const key = keyOf(scope, u);
  try { if (storage) storage.removeItem(key); } catch { /* noop */ }
  mem.delete(key);
}

function allKeys() {
  const keys = new Set(mem.keys());
  if (storage) {
    try { for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k) keys.add(k); } } catch { /* noop */ }
  }
  return [...keys];
}

export function listDrafts(u = user) {
  if (!u) return [];
  const prefix = NS + u + ':';
  const out = [];
  for (const k of allKeys()) {
    if (!k.startsWith(prefix)) continue;
    let raw = null;
    try { raw = storage ? storage.getItem(k) : null; } catch { raw = null; }
    if (raw == null) raw = mem.get(k) ?? null;
    const e = raw ? parse(raw) : null;
    if (e) out.push(e);
  }
  return out.sort((a, b) => b.savedAt - a.savedAt);
}

export function purgeOldDrafts(nowMs = Date.now()) {
  let removed = 0;
  for (const k of allKeys()) {
    if (!k.startsWith(NS)) continue;
    let raw = null;
    try { raw = storage ? storage.getItem(k) : null; } catch { raw = null; }
    if (raw == null) raw = mem.get(k) ?? null;
    const e = raw ? parse(raw) : null;
    if (!e || nowMs - e.savedAt > MAX_AGE_MS) {
      try { if (storage) storage.removeItem(k); } catch { /* noop */ }
      mem.delete(k); removed++;
    }
  }
  return removed;
}

// Etichetta leggibile per la UI ("Page · Home", "Menu", ...).
export function describeDraft(entry) {
  const scope = entry.scope || '';
  if (scope === 'menu') return { kind: 'Menu', title: 'Navigation menu' };
  if (scope === 'settings') return { kind: 'Global options', title: 'Global options' };
  if (scope.startsWith('editor:')) {
    const pl = entry.payload || {};
    const page = (pl.page && pl.page.page) || {};
    if (pl.master) return { kind: 'Master component', title: pl.master.name || 'Master' };
    let kind = 'Page';
    if (page.__part === 'header') kind = 'Global header';
    else if (page.__part === 'footer') kind = 'Global footer';
    else if (page.__item) kind = 'Collection item';
    return { kind, title: page.title || 'Untitled' };
  }
  return { kind: 'Changes', title: scope };
}

// ---- registro dei "flusher": salvataggi sincroni dei backup, richiamati prima di mostrare il login
// per scadenza, alla chiusura della scheda e al logout ----
const flushers = new Set();
export function registerFlusher(fn) { flushers.add(fn); return () => flushers.delete(fn); }
export function flushDrafts() {
  for (const f of [...flushers]) { try { f(); } catch { /* un flusher guasto non deve bloccare gli altri */ } }
}

// ---- avviso persistente "la sessione e' scaduta" (mostrato dalla schermata di login dopo un refresh) ----
export function setExpiredNotice(info) {
  try { if (storage) storage.setItem(NOTICE_KEY, JSON.stringify({ user: info.user || null, at: info.at || Date.now() })); } catch { /* noop */ }
}
export function readExpiredNotice() {
  try {
    const raw = storage ? storage.getItem(NOTICE_KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function clearExpiredNotice() {
  try { if (storage) storage.removeItem(NOTICE_KEY); } catch { /* noop */ }
}
