// tests/ui-shell.mjs
// The reorganized admin UI, with the real components mounted in jsdom (Vite SSR):
//  - admin sidebar: sections, current section, admin-only group, navigation;
//  - Pages: search, status filters with counts, duplicate;
//  - editor: top bar (back, devices, save, publish), Ctrl+S, Esc, collapsible panels (remembered);
//  - Add panel: categories, search, admin-only blocks;
//  - property panel: block name from the catalog, tabs, spacing in Style, first section open.
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blockDefs = JSON.parse(readFileSync(path.join(PROJECT, '../canvascore-admin/blocks.json'), 'utf8'));
let fails = 0, total = 0;
const check = (name, cond, extra = '') => { total++; if (cond) console.log('  ✓ ' + name); else { fails++; console.error('  ✗ ' + name + (extra ? '  → ' + extra : '')); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, timeout = 3000) { const t0 = Date.now(); for (;;) { let v; try { v = fn(); } catch { v = null; } if (v) return v; if (Date.now() - t0 > timeout) return null; await sleep(20); } }

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/canvascore-admin/', pretendToBeVisual: true });
const w = dom.window;
for (const k of ['document', 'localStorage', 'location', 'history', 'navigator', 'getComputedStyle', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'HTMLIFrameElement', 'Element', 'Node', 'Event', 'KeyboardEvent', 'MouseEvent', 'FocusEvent', 'InputEvent', 'CustomEvent', 'MutationObserver', 'SVGElement', 'DocumentFragment', 'Text', 'DOMParser', 'Range']) {
  if (k in w) Object.defineProperty(globalThis, k, { configurable: true, get: () => w[k] });
}
Object.defineProperty(globalThis, 'window', { configurable: true, value: globalThis, writable: true });
globalThis.getSelection = () => w.getSelection();
globalThis.addEventListener = (...a) => w.addEventListener(...a);
globalThis.removeEventListener = (...a) => w.removeEventListener(...a);
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.innerWidth = 1280; globalThis.innerHeight = 800;
globalThis.alert = () => {}; globalThis.confirm = () => true;
globalThis.IS_REACT_ACT_ENVIRONMENT = false;
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url); calls.push({ u, body: init.body });
  if (u.includes('save_page')) return new Response(JSON.stringify({ success: true }));
  if (u.includes('get_pages')) return new Response(JSON.stringify(PAGES));
  return new Response(JSON.stringify([]));
};

const vite = await createServer({
  root: PROJECT, configFile: false, logLevel: 'error', appType: 'custom', clearScreen: false,
  server: { middlewareMode: true, hmr: false, watch: null }, plugins: [react()],
  define: { __APP_VERSION__: '"test"', __APP_BUILD__: '0', __BLOCK_DEFS__: JSON.stringify(blockDefs) },
  optimizeDeps: { noDiscovery: true, include: [] },
});
const doc = w.document;
const $ = (sel) => doc.querySelector(sel);
const $$ = (sel, root = doc) => [...root.querySelectorAll(sel)];
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const typeIn = (el, v) => { Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new w.Event('input', { bubbles: true })); };
const btn = (txt, root = doc) => $$('button', root).find((b) => b.textContent.trim() === txt);
const btnHas = (txt, root = doc) => $$('button', root).find((b) => b.textContent.includes(txt));

const PAGES = [
  { id: 'p1', title: 'Home', clean_slug: 'index', status: 'published', is_home: 1, updated_at: '2026-10-01 10:00:00', content_json: '[]' },
  { id: 'p2', title: 'About us', clean_slug: 'about', status: 'modified', updated_at: '2026-10-05 10:00:00', content_json: '[{"id":"b1","type":"TEXT","content":{"text":"<p>x</p>"},"styles":{}}]' },
  { id: 'p3', title: 'Contact', clean_slug: 'contact', status: 'draft', updated_at: '2026-10-03 10:00:00', content_json: '[]' },
];

const { useStore } = await vite.ssrLoadModule('/src/store/useStore.js');
const AdminLayout = (await vite.ssrLoadModule('/src/components/AdminLayout.jsx')).default;
const PageManager = (await vite.ssrLoadModule('/src/components/PageManager.jsx')).default;
const VisualEditor = (await vite.ssrLoadModule('/src/components/VisualEditor.jsx')).default;
const PropertyPanel = (await vite.ssrLoadModule('/src/components/PropertyPanel.jsx')).default;
const { Toaster } = await vite.ssrLoadModule('/src/ui/toast.jsx');
const { BLOCKS } = await vite.ssrLoadModule('/src/editor/blockCatalog.js');
const { CONTENT_PANELS } = await vite.ssrLoadModule('/src/components/panel/blocks/index.js');
const { createRoot } = await import('react-dom/client');
const React = await import('react');
let root = null;
const mount = (el) => { if (root) root.unmount(); doc.getElementById('root').innerHTML = ''; root = createRoot(doc.getElementById('root')); root.render(React.createElement(React.Fragment, null, el, React.createElement(Toaster))); };
const st = () => useStore.getState();

let failedRun = false;
try {
  console.log('CATALOG');
  const types = Object.keys(blockDefs.types);
  check('every block type has a name, icon and category in the catalog', types.every((t) => BLOCKS.some((b) => b.type === t && b.label && b.icon && b.category)), types.filter((t) => !BLOCKS.some((b) => b.type === t)).join(','));
  check('every non-layout block has a Content panel', types.filter((t) => !['SECTION', 'CONTAINER', 'FLEX_ROW'].includes(t)).every((t) => CONTENT_PANELS[t]), types.filter((t) => !['SECTION', 'CONTAINER', 'FLEX_ROW'].includes(t) && !CONTENT_PANELS[t]).join(','));

  console.log('\nADMIN SIDEBAR');
  useStore.setState({ currentView: 'manager', userRole: 'admin', username: 'ann', pages: PAGES });
  mount(React.createElement(AdminLayout, null, React.createElement('p', null, 'child')));
  const nav = await waitFor(() => $('nav.ui-nav'));
  check('sections: Pages, Collections, Templates, Media, Menu, Global Options', ['Pages', 'Collections', 'Templates', 'Media', 'Menu', 'Global Options'].every((l) => btn(l, nav)));
  check('admins also see Submissions, Accounts and Backup', ['Submissions', 'Accounts', 'Backup'].every((l) => btn(l, nav)));
  check('the current section is marked (aria-current)', btn('Pages', nav).getAttribute('aria-current') === 'page');
  click(btn('Media', nav));
  check('clicking a section opens it', st().currentView === 'media');
  check('user, logout and version in the sidebar', /ann/.test($('.ui-sidebar__foot').textContent) && !!btnHas('Logout') && /CanvasCore v/.test($('.ui-sidebar__foot').textContent));
  useStore.setState({ userRole: 'editor' });
  await sleep(30);
  check('editors do not see the administration group', !btn('Accounts', $('nav.ui-nav')) && !btn('Backup', $('nav.ui-nav')));

  console.log('\nPAGES');
  useStore.setState({ currentView: 'manager', userRole: 'admin', pages: PAGES });
  mount(React.createElement(PageManager));
  const rows = () => $$('tbody tr');
  await waitFor(() => rows().length === 3);
  check('all pages listed, most recently updated first', rows().length === 3 && rows()[0].textContent.includes('About us'));
  check('status filters with counts', ['All 3', 'Published 1', 'Modified 1', 'Drafts 1'].every((l) => btn(l)));
  click(btn('Drafts 1')); await sleep(30);
  check('filter: drafts only', rows().length === 1 && rows()[0].textContent.includes('Contact'));
  click(btn('All 3')); await sleep(30);
  typeIn($('input[type="search"]'), 'abou'); await sleep(30);
  check('search by title', rows().length === 1 && rows()[0].textContent.includes('About us'));
  typeIn($('input[type="search"]'), 'contact'); await sleep(30);
  check('search by URL', rows().length === 1);
  typeIn($('input[type="search"]'), ''); await sleep(30);
  check('the homepage is marked', rows().some((r) => r.textContent.includes('Home') && r.querySelector('.ui-badge--accent')));
  click($('button[aria-label="Duplicate About us"]'));
  await waitFor(() => st().pages.length === 4);
  const copy = st().pages[0];
  const saved = calls.find((c) => c.u.includes('save_page'));
  check('duplicate: a new draft "(copy)" with a free slug and the same content', copy.title === 'About us (copy)' && copy.status === 'draft' && copy.slug !== 'about' && saved && JSON.parse(saved.body).blocks.length === 1, JSON.stringify([copy.title, copy.slug]));
  check('…and a notification instead of a blocking alert', !!(await waitFor(() => $('.ui-toast'))));

  console.log('\nEDITOR');
  localStorage.clear();
  const hero = { id: 'h1', type: 'HERO', styles: { ...blockDefs.types.HERO.styles }, content: { ...blockDefs.types.HERO.content } };
  const section = { id: 's1', type: 'SECTION', styles: {}, content: {}, children: [] };
  useStore.setState({ currentView: 'editor', activePage: { ...PAGES[2] }, blocks: [hero, section], selectedBlockId: null, isEditingMaster: false, editorRestored: false, pastBlocks: [], futureBlocks: [], templates: [], masters: [], userRole: 'editor', viewport: 'desktop' });
  calls.length = 0;
  mount(React.createElement(VisualEditor));
  const top = await waitFor(() => $('header.cc-ed-top'));
  check('top bar: back to Pages, page title and status', !!btnHas('Pages', top) && top.textContent.includes('Contact') && !!top.querySelector('.ui-badge--draft'));
  check('top bar: preview sizes, undo/redo, Save Draft and Publish', ['Desktop', 'Tablet', 'Mobile'].every((t) => top.querySelector(`button[title="${t}"]`)) && !!top.querySelector('[aria-label^="Undo"]') && !!btnHas('Save Draft', top) && !!btnHas('Publish', top));
  await sleep(60); // effects (keyboard shortcuts) are attached after the first paint
  click(top.querySelector('button[title="Mobile"]'));
  check('preview size switch', st().viewport === 'mobile');
  w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
  check('Ctrl+S saves the draft', !!(await waitFor(() => calls.some((c) => c.u.includes('save_page')))));
  check('…with a notification', !!(await waitFor(() => $$('.ui-toast').some((t) => /Draft saved/.test(t.textContent)))));
  st().setSelectedBlockId('h1'); await sleep(30);
  w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Esc deselects the block', st().selectedBlockId === null);
  const left = $('.cc-ed-left');
  click($('button[aria-label="Hide the left panel"]')); await sleep(30);
  check('the left panel can be hidden (canvas gets the space)', left.getAttribute('data-open') === 'false' && JSON.parse(localStorage.getItem('cc_editor_panels')).left === false);
  click($('button[aria-label="Show the left panel"]')); await sleep(30);

  console.log('\nADD PANEL');
  check('blocks grouped in categories', ['Layout', 'Basic', 'Sections', 'Interactive', 'Lists & data', 'Business & dynamic'].every((c) => $$('.cc-ed-left button').some((b) => b.textContent.startsWith(c))));
  check('admin-only blocks hidden for editors (Custom HTML)', !btnHas('Custom HTML', $('.cc-ed-left')));
  typeIn($('.cc-ed-left input[type="search"]'), 'map'); await sleep(30);
  const tiles = () => $$('.cc-add-tile').map((b) => b.textContent.trim());
  check('search finds blocks by name or keyword ("map" → Map)', tiles().includes('Map') && !tiles().includes('Hero'), tiles().join(','));
  typeIn($('.cc-ed-left input[type="search"]'), 'carousel'); await sleep(30);
  check('…by keyword ("carousel" → Slider)', tiles().join(',') === 'Slider', tiles().join(','));
  st().setSelectedBlockId('s1'); await sleep(30);
  check('tells where blocks will go (inside the selected Section)', /inside the selected Section/.test($('.cc-ed-left').textContent));
  click($$('.cc-add-tile').find((b) => b.textContent.trim() === 'Slider'));
  check('adding puts the block inside the selected container', st().blocks[1].children.length === 1 && st().blocks[1].children[0].type === 'SLIDER');

  console.log('\nPROPERTY PANEL');
  useStore.setState({ selectedBlockId: 'h1', userRole: 'admin' });
  mount(React.createElement(PropertyPanel));
  const head = await waitFor(() => $('.cc-pp-head'));
  check('header shows the block name from the catalog', !!head && head.textContent.includes('Hero'));
  check('tabs Content / Style / Advanced', ['Content', 'Style', 'Advanced'].every((t) => $$('[role="tab"]').some((b) => b.textContent.trim() === t)));
  check('the first Content section starts open', $$('.ui-section')[0].getAttribute('data-open') === 'true');
  click($$('[role="tab"]').find((b) => b.textContent.trim() === 'Style')); await sleep(30);
  check('Spacing (margin & padding) is in the Style tab', !!btnHas('Spacing (Margin & Padding)'));
  click($$('[role="tab"]').find((b) => b.textContent.trim() === 'Advanced')); await sleep(30);
  check('Advanced keeps animations and custom code', !!btnHas('Effects & Animations') && !!btnHas('Custom Code') && !btnHas('Spacing (Margin & Padding)'));
  click($$('[role="tab"]').find((b) => b.textContent.trim() === 'Content')); await sleep(30);
  useStore.setState({ selectedBlockId: 's1' }); await sleep(30);
  check('a Section (no Content tab) falls back to Style', !$$('[role="tab"]').some((b) => b.textContent.trim() === 'Content') && $$('[role="tab"]').find((b) => b.getAttribute('aria-selected') === 'true').textContent.trim() === 'Style');
  useStore.setState({ selectedBlockId: null }); await sleep(30);
  check('no selection → page settings, Page Info open', !!btnHas('Page Info') && btnHas('Page Info').getAttribute('aria-expanded') === 'true');
} catch (e) {
  failedRun = true; fails++; total++;
  console.error('  ✗ EXCEPTION: ' + ((e && e.stack) || e).toString().split('\n').slice(0, 6).join(' | '));
}
try { root?.unmount(); } catch { /* noop */ }
await vite.close();
console.log(`\n${fails === 0 ? 'UI SHELL OK' : fails + ' checks failed'} (${total} checks)${failedRun ? ' — aborted by an exception' : ''}`);
process.exit(fails === 0 ? 0 : 1);
