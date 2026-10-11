import { create } from 'zustand';
import { flushDrafts, setDraftUser } from '../session/drafts';

const pushHistory = (state, newBlocks) => {
  const past = [...state.pastBlocks, state.blocks];
  if (past.length > 30) past.shift();
  return { blocks: newBlocks, pastBlocks: past, futureBlocks: [] };
};

const updateNode = (blocks, id, updates) => {
  return blocks.map(block => {
    if (block.id === id) return { ...block, ...updates };
    if (block.children) return { ...block, children: updateNode(block.children, id, updates) };
    return block;
  });
};

const removeNode = (blocks, id) => {
  return blocks.filter(block => block.id !== id).map(block => {
    if (block.children) return { ...block, children: removeNode(block.children, id) };
    return block;
  });
};

const insertNode = (blocks, parentId, newBlock) => {
  return blocks.map(block => {
    if (block.id === parentId) {
      return { ...block, children: [...(block.children || []), newBlock] };
    }
    if (block.children) {
      return { ...block, children: insertNode(block.children, parentId, newBlock) };
    }
    return block;
  });
};

// Riordina due blocchi FRATELLI (stesso genitore) a qualsiasi profondità dell'albero.
// Restituisce { found, nodes }. Se active e over non sono fratelli, found = false (no-op).

// Spostamento generale nell'albero (cross-container, anti-ciclo)
const findInTree = (list, id) => {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return { list, index: i, node: list[i] };
    if (list[i].children) {
      const r = findInTree(list[i].children, id);
      if (r) return r;
    }
  }
  return null;
};
const nodeContainsId = (node, id) => {
  if (node.id === id) return true;
  if (node.children) for (const c of node.children) if (nodeContainsId(c, id)) return true;
  return false;
};
const arrayMoveImpl = (arr, from, to) => {
  const a = arr.slice();
  const [item] = a.splice(from, 1);
  a.splice(to, 0, item);
  return a;
};
const moveInTree = (roots, activeId, overId) => {
  if (!activeId || !overId || activeId === overId) return null;
  const tree = JSON.parse(JSON.stringify(roots));
  const a = findInTree(tree, activeId);
  if (!a) return null;
  if (nodeContainsId(a.node, overId)) return null; // no cicli
  const oPre = findInTree(tree, overId);
  if (!oPre) return null;
  // Stesso genitore: riordino direzionale (corregge il drag verso il basso)
  if (a.list === oPre.list) {
    const reordered = arrayMoveImpl(a.list, a.index, oPre.index);
    a.list.length = 0; a.list.push(...reordered);
    return tree;
  }
  // Cross-container
  const node = a.node;
  a.list.splice(a.index, 1);
  const o = findInTree(tree, overId);
  if (!o) return null;
  const emptyContainer = Array.isArray(o.node.children) && o.node.children.length === 0;
  if (emptyContainer) o.node.children.push(node);
  else o.list.splice(o.index, 0, node);
  return tree;
};

export const useStore = create((set, get) => ({
  isAuthenticated: false,
  userRole: 'editor',
  username: null,
  mustChangePw: false,
  appVersion: (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''),
  appBuild: (typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : 0),
  serverVersion: null,

  // ---- sessione (vedi src/session/) ----
  sessionExpired: false,        // true: login mostrato SOPRA l'app (che resta montata con tutto il suo stato)
  expiredUser: null,
  expiredAt: null,
  expiredReason: null,
  sessionExpiresAt: null,       // timestamp locale (ms) previsto di scadenza, dato dal server
  sessionTimeout: null,         // secondi di inattivita' consentiti
  sessionWarning: false,        // meno di ~2 minuti alla scadenza
  // ---- backup locale del lavoro non salvato ----
  editorDirty: false,
  editorRestored: false,        // l'editor e' stato ripristinato da una bozza locale
  draftBackupFailed: false,     // il backup locale non e' riuscito (storage pieno/non disponibile)

  fetchVersion: async () => {
    try {
      const res = await fetch('api.php?action=version');
      const data = await res.json();
      set({ serverVersion: data });
    } catch { /* noop */ }
  },

  checkAuth: async () => {
    try {
      const res = await fetch('api.php?action=check_auth');
      const data = await res.json();
      if (data.csrf) window.__CC_CSRF = data.csrf;
      setDraftUser(data.authenticated ? (data.username || null) : null);
      set({
        isAuthenticated: data.authenticated, userRole: data.role, username: data.username || null, mustChangePw: !!data.must_change_pw,
        sessionExpiresAt: data.authenticated && data.expires_in != null ? Date.now() + data.expires_in * 1000 : null,
        sessionTimeout: data.timeout ?? null,
      });
    } catch { /* offline: resta non autenticato */ }
  },
  login: async (username, password) => {
    try {
      const res = await fetch('api.php?action=login', { method: 'POST', body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (data.success) {
        if (data.csrf) window.__CC_CSRF = data.csrf;
        setDraftUser(data.username || null);
        set({
          isAuthenticated: true, userRole: data.role, username: data.username || null, mustChangePw: !!data.must_change_pw,
          sessionExpiresAt: data.expires_in != null ? Date.now() + data.expires_in * 1000 : null, sessionTimeout: data.timeout ?? null,
        });
      }
      return data;
    } catch { return { success: false, message: 'Server error' }; }
  },
  // Login dalla schermata "sessione scaduta". NON adotta l'identita' di un utente diverso: questa scheda contiene
  // il lavoro non salvato di un altro utente e non deve ne' ereditarlo ne' scrivere i suoi backup nell'altro account.
  reauth: async (username, password) => {
    try {
      const res = await fetch('api.php?action=login', { method: 'POST', body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!data.success) return data;
      const expected = get().expiredUser;
      if (expected && data.username && data.username !== expected) return { ...data, differentUser: true };
      if (data.csrf) window.__CC_CSRF = data.csrf;
      setDraftUser(data.username || null);
      set({
        isAuthenticated: true, userRole: data.role, username: data.username || null, mustChangePw: !!data.must_change_pw,
        sessionExpiresAt: data.expires_in != null ? Date.now() + data.expires_in * 1000 : null, sessionTimeout: data.timeout ?? null,
      });
      return data;
    } catch { return { success: false, message: 'Server error' }; }
  },
  logout: async () => {
    flushDrafts();                                   // backup del lavoro non salvato PRIMA di azzerare lo stato
    try { await fetch('api.php?action=logout'); } catch { /* senza rete si esce comunque dall'interfaccia */ }
    window.__CC_CSRF = null;
    setDraftUser(null);
    set({
      isAuthenticated: false, userRole: 'editor', username: null, mustChangePw: false,
      // nessuno stato di lavoro deve sopravvivere al logout (il prossimo utente non deve ereditarlo)
      currentView: 'manager', activePage: null, blocks: [], pastBlocks: [], futureBlocks: [], selectedBlockId: null,
      isEditingMaster: false, editingMaster: null, pages: [],
      sessionExpired: false, expiredUser: null, expiredAt: null, expiredReason: null, sessionExpiresAt: null, sessionWarning: false,
      editorDirty: false, editorRestored: false, draftBackupFailed: false,
    });
  },

  changeOwnPassword: async (password) => {
    try {
      const res = await fetch('api.php?action=change_own_password', { method: 'POST', body: JSON.stringify({ password }) });
      const data = await res.json();
      if (data.success) set({ mustChangePw: false });
      return data;
    } catch { return { success: false, message: 'Server error' }; }
  },

  publishSiteAsync: async () => {
    try {
      // Una sessione scaduta e' gestita dalla guardia sulle fetch: login sopra l'app e richiesta rieseguita.
      const res = await fetch('rebuild_all.php');
      const text = await res.text();
      return JSON.parse(text);
    } catch { return { success: false, message: 'Connection error.' }; }
  },

  currentView: 'manager', setView: (view) => set({ currentView: view }),
  viewport: 'desktop', setViewport: (vp) => set({ viewport: vp }),

  pages: [],
  setPages: (pages) => set({ pages: Array.isArray(pages) ? pages : [] }),
  activePage: null,
  updateActivePage: (updates) => set((state) => ({ activePage: { ...state.activePage, ...updates } })),
  setActivePage: (page) => set({ activePage: page }),

  blocks: [], pastBlocks: [], futureBlocks: [],
  setBlocks: (blocks) => set({
    blocks: Array.isArray(blocks) ? blocks : [],
    pastBlocks: [],
    futureBlocks: []
  }),
  selectedBlockId: null, setSelectedBlockId: (id) => set({ selectedBlockId: id }),

  templates: [],
  fetchTemplates: async () => {
    try {
      const res = await fetch('api.php?action=get_templates');
      const data = await res.json();
      set({ templates: Array.isArray(data) ? data : [] });
    } catch { /* noop */ }
  },
  addSavedBlock: (blockStr, parentId = null) => set((state) => {
    try {
      const blockData = JSON.parse(blockStr);
      const regenerateIds = (node) => {
        node.id = 'block-' + Date.now() + Math.floor(Math.random() * 10000);
        if (node.children) node.children = node.children.map(regenerateIds);
        return node;
      };
      const newBlock = regenerateIds(blockData);
      if (parentId) return pushHistory(state, insertNode(state.blocks, parentId, newBlock));
      return pushHistory(state, [...state.blocks, newBlock]);
    } catch { return state; }
  }),
  deleteTemplate: async (id) => {
    if (!window.confirm("Delete permanently?")) return;
    await fetch('api.php?action=delete_template', { method: 'POST', body: JSON.stringify({ id }) });
    get().fetchTemplates();
  },

  // ---- Master Components ----
  masters: [],
  editingMaster: null,
  isEditingMaster: false,

  fetchMasters: async () => {
    try {
      const res = await fetch('api.php?action=get_masters');
      const data = await res.json();
      set({ masters: Array.isArray(data) ? data : [] });
    } catch { /* noop */ }
  },

  saveAsMaster: async (blockId, name) => {
    const state = get();
    const findBlock = (nodes, id) => {
      for (let n of nodes) {
        if (n.id === id) return n;
        if (n.children) {
          const found = findBlock(n.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const blockToSave = findBlock(state.blocks, blockId);
    if (!blockToSave) return;

    const masterId = 'master-' + Date.now();
    try {
      await fetch('api.php?action=save_master', {
        method: 'POST',
        body: JSON.stringify({ id: masterId, name, content_json: JSON.stringify(blockToSave) })
      });
      await get().fetchMasters();

      const replaceWithPointer = (nodes, id) => {
        return nodes.map(n => {
          if (n.id === id) return { id: n.id, type: 'MASTER', content: { masterId, name }, styles: {} };
          if (n.children) return { ...n, children: replaceWithPointer(n.children, id) };
          return n;
        });
      };
      set(s => pushHistory(s, replaceWithPointer(s.blocks, blockId)));
      alert(`Master Component '${name}' saved and linked!`);
    } catch { alert("Error saving Master."); }
  },

  enterMasterEditMode: (masterId) => {
    const state = get();
    const master = state.masters.find(m => m.id === masterId);
    if (!master) return;
    let content;
    try { content = JSON.parse(master.content_json); } catch { return; }
    set({
      editingMaster: { id: master.id, name: master.name, pageBackup: state.blocks, activePageBackup: state.activePage },
      isEditingMaster: true,
      blocks: [content],
      pastBlocks: [], futureBlocks: [], selectedBlockId: null
    });
  },

  // save = true -> salva e chiude; save = false -> annulla e ripristina
  exitMasterEditMode: async (save = true) => {
    const state = get();
    if (!state.editingMaster) return;

    if (save && state.blocks.length > 0) {
      const updatedMasterBlock = state.blocks[0];
      try {
        const res = await fetch('api.php?action=save_master', {
          method: 'POST',
          body: JSON.stringify({ id: state.editingMaster.id, name: state.editingMaster.name, content_json: JSON.stringify(updatedMasterBlock) })
        });
        const data = await res.json();
        if (!data || !data.success) {
          alert('Master NOT saved: ' + ((data && data.message) || 'unknown error') + '\nYour changes are still here: try again.');
          return;                                      // resta in modifica: nessuna perdita
        }
        await get().fetchMasters();
      } catch {
        alert('Master NOT saved (connection problem). Your changes are still here: try again.');
        return;
      }
    }

    set({
      blocks: state.editingMaster.pageBackup || [],
      activePage: state.editingMaster.activePageBackup || null,
      editingMaster: null, isEditingMaster: false,
      pastBlocks: [], futureBlocks: [], selectedBlockId: null
    });
    if (save) alert("Master Component updated globally!");
  },

  deleteMaster: async (id) => {
    if (!window.confirm("Delete this Master Component globally? It will be removed from ALL pages!")) return;
    await fetch('api.php?action=delete_master', { method: 'POST', body: JSON.stringify({ id }) });
    get().fetchMasters();
    set((state) => {
      const purgeLocal = (nodes) => {
        return nodes.filter(n => !(n.type === 'MASTER' && n.content.masterId === id))
          .map(n => n.children ? { ...n, children: purgeLocal(n.children) } : n);
      };
      return pushHistory(state, purgeLocal(state.blocks));
    });
  },

  insertMaster: (masterId, name, parentId = null) => {
    const newBlock = { id: 'block-' + Date.now(), type: 'MASTER', content: { masterId, name }, styles: {} };
    set((state) => {
      if (parentId) return pushHistory(state, insertNode(state.blocks, parentId, newBlock));
      return pushHistory(state, [...state.blocks, newBlock]);
    });
  },

  // ---- History ----
  undo: () => set((state) => {
    if (state.pastBlocks.length === 0) return state;
    const previous = state.pastBlocks[state.pastBlocks.length - 1];
    return { pastBlocks: state.pastBlocks.slice(0, -1), futureBlocks: [state.blocks, ...state.futureBlocks], blocks: previous };
  }),
  redo: () => set((state) => {
    if (state.futureBlocks.length === 0) return state;
    const next = state.futureBlocks[0];
    return { pastBlocks: [...state.pastBlocks, state.blocks], futureBlocks: state.futureBlocks.slice(1), blocks: next };
  }),

  addBlock: (type, parentId = null) => {
    const defs = (typeof __BLOCK_DEFS__ !== 'undefined') ? __BLOCK_DEFS__ : { _baseStyles: {}, types: {} };
    const def = defs.types[type] || {};
    const styles = { ...(defs._baseStyles || {}), ...(def.styles || {}) };
    // clone profondo del content per non condividere riferimenti tra blocchi
    const content = def.content ? JSON.parse(JSON.stringify(def.content)) : {};
    if (type === 'HERO' && Array.isArray(content.buttons)) {
      content.buttons = content.buttons.map(b => ({ id: Date.now() + Math.floor(Math.random() * 1000), ...b }));
    }
    const newBlock = { id: 'block-' + Date.now() + Math.floor(Math.random() * 1000), type, content, styles };
    if (def.children) newBlock.children = [];

    set((state) => {
      if (parentId) return pushHistory(state, insertNode(state.blocks, parentId, newBlock));
      return pushHistory(state, [...state.blocks, newBlock]);
    });
  },

  updateBlock: (id, updates) => set((state) => pushHistory(state, updateNode(state.blocks, id, updates))),
  removeBlock: (id) => set((state) => {
    const historyState = pushHistory(state, removeNode(state.blocks, id));
    return { ...historyState, selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId };
  }),

  // Riordino reale: funziona tra fratelli a qualsiasi livello dell'albero.
  moveBlock: (activeId, overId) => set((state) => {
    const moved = moveInTree(state.blocks, activeId, overId);
    if (!moved) return state;
    return pushHistory(state, moved);
  })
}));
