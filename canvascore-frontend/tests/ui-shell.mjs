// tests/ui-shell.mjs
// The reorganized admin UI, with the real components mounted in jsdom (Vite SSR):
//  - admin sidebar: sections, current section, admin-only group, navigation;
//  - Pages: search, status filters with counts, duplicate;
//  - editor: top bar (back, devices, save, publish), Ctrl+S, Esc, collapsible panels (remembered);
//  - Add panel: categories, search, admin-only blocks;
//  - property panel: block name from the catalog, tabs, spacing in Style, first section open;
//  - effects (Advanced tab), hero/button colors and hovers, cards count, Layers drop positions.
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
  check('Advanced has entrance / hover / looping effects and custom code', ['Entrance Animation', 'Hover Effect', 'Looping Motion', 'Custom Code'].every((t) => !!btnHas(t)) && !btnHas('Spacing (Margin & Padding)'));
  click($$('[role="tab"]').find((b) => b.textContent.trim() === 'Content')); await sleep(30);
  useStore.setState({ selectedBlockId: 's1' }); await sleep(30);
  check('a Section (no Content tab) falls back to Style', !$$('[role="tab"]').some((b) => b.textContent.trim() === 'Content') && $$('[role="tab"]').find((b) => b.getAttribute('aria-selected') === 'true').textContent.trim() === 'Style');
  useStore.setState({ selectedBlockId: null }); await sleep(30);
  check('no selection → page settings, Page Info open', !!btnHas('Page Info') && btnHas('Page Info').getAttribute('aria-expanded') === 'true');

  console.log('\nEFFECTS & BUTTONS');
  const pick = (el, v) => { Object.getOwnPropertyDescriptor(w.HTMLSelectElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const selByLabel = (txt) => { const l = $$('label').find((x) => x.textContent.trim() === txt); return l && l.parentElement.querySelector('select'); };
  const openSec = async (t) => { const b = btnHas(t); if (b && b.getAttribute('aria-expanded') !== 'true') { click(b); await sleep(30); } };
  const blk = (id) => (function find(list) { for (const b of list) { if (b.id === id) return b; const r = b.children && find(b.children); if (r) return r; } return null; })(st().blocks);
  useStore.setState({ selectedBlockId: 'h1' }); await sleep(30);
  click($$('[role="tab"]').find((b) => b.textContent.trim() === 'Advanced')); await sleep(30);
  pick(selByLabel('When the block scrolls into view'), 'bounce-in'); await sleep(30);
  check('entrance animation is saved', blk('h1').styles.animation === 'bounce-in');
  pick(selByLabel('Delay'), '300'); await sleep(30);
  pick(selByLabel('Speed'), 'slow'); await sleep(30);
  await openSec('Hover Effect'); pick(selByLabel('When the mouse is over the block'), 'lift'); await sleep(30);
  await openSec('Looping Motion'); pick(selByLabel('Keeps moving gently'), 'float'); await sleep(30);
  const hc = blk('h1').content;
  check('speed, delay, hover and loop are saved on the block', hc.animDelay === '300' && hc.animDuration === 'slow' && hc.hoverEffect === 'lift' && hc.loopEffect === 'float', JSON.stringify(hc));
  check('a Preview animation button is offered', !!btnHas('Preview animation'));
  click($$('[role="tab"]').find((b) => b.textContent.trim() === 'Content')); await sleep(30);
  await openSec('Hero Buttons');
  const card = () => $$('span').find((x) => x.textContent === 'Button 1').closest('div').parentElement;
  click(btn('Outline', card())); await sleep(30);
  let b0 = blk('h1').content.buttons[0];
  check('hero button Outline = transparent fill with a border', b0.bgColor === 'transparent' && !!b0.borderColor && b0.textColor === b0.borderColor, JSON.stringify(b0));
  click(btn('Solid', card())); await sleep(30);
  check('hero button Solid gets a fill again', blk('h1').content.buttons[0].bgColor !== 'transparent' && !blk('h1').content.buttons[0].borderColor);
  click(btn('Transparent', card())); await sleep(30);
  check('hero button background has a Transparent option', blk('h1').content.buttons[0].bgColor === 'transparent');
  pick($$('select', card()).find((x) => [...x.options].some((o) => o.value === 'shine')), 'shine'); await sleep(30);
  check('hero button hover effect is saved', blk('h1').content.buttons[0].effect === 'shine');

  const bt = { id: 'bt1', type: 'BUTTON', styles: {}, content: { text: 'Go', url: '#', useGlobal: true } };
  const cards = { id: 'c1', type: 'CARDS', styles: {}, content: { items: ['<h3>a</h3>', '<h3>b</h3>', '<h3>c</h3>'] } };
  useStore.setState({ blocks: [...st().blocks, bt, cards], selectedBlockId: 'bt1' }); await sleep(30);
  pick($$('select').find((x) => [...x.options].some((o) => o.value === 'lg')), 'lg'); await sleep(30);
  check('button size sets padding and font size together', blk('bt1').styles.padding === '18px 36px' && blk('bt1').styles.fontSize === '20px', JSON.stringify(blk('bt1').styles));
  await openSec('Hover');
  pick(selByLabel('Hover effect'), 'glow'); await sleep(30);
  check('button hover effect is saved', blk('bt1').content.btnEffect === 'glow');
  const { renderBlock } = await vite.ssrLoadModule('/src/render/renderBlock.mjs');
  const bh = renderBlock({ ...blk('bt1'), content: { ...blk('bt1').content, btnHoverBg: '#111111' } });
  check('rendered button carries the hover classes and color', bh.includes('class="cc-btn cc-hbg cc-bfx-glow"') && bh.includes('--cc-hover-bg:#111111'));
  useStore.setState({ selectedBlockId: 'c1' }); await sleep(30);
  check('a Cards block with 3 cards shows 3 on the slider', $$('label').some((l) => l.textContent.trim() === 'Number of cards: 3') && $('input[type="range"]').value === '3');

  console.log('\nLAYERS');
  const { placeInTree } = await vite.ssrLoadModule('/src/store/useStore.js');
  const { dropPosition } = await vite.ssrLoadModule('/src/editor/layerDrop.js');
  const tree = [{ id: 'a', children: [{ id: 'a1' }] }, { id: 'b' }, { id: 'c', children: [] }];
  const ids = (t) => JSON.stringify(t, (k, v) => (k === 'id' || k === 'children' || Array.isArray(v) || typeof v === 'object' ? v : undefined));
  check('drop before / after a row', ids(placeInTree(tree, 'b', 'a', 'before')) === ids([{ id: 'b' }, { id: 'a', children: [{ id: 'a1' }] }, { id: 'c', children: [] }]) && ids(placeInTree(tree, 'a1', 'c', 'after')) === ids([{ id: 'a', children: [] }, { id: 'b' }, { id: 'c', children: [] }, { id: 'a1' }]));
  check('drop inside an (empty) container', ids(placeInTree(tree, 'b', 'c', 'inside')) === ids([{ id: 'a', children: [{ id: 'a1' }] }, { id: 'c', children: [{ id: 'b' }] }]));
  check('a container cannot go inside itself or its children; inside a non-container is refused', placeInTree(tree, 'a', 'a1', 'after') === null && placeInTree(tree, 'b', 'a1', 'inside') === null);
  check('pointer height → before / inside / after', dropPosition(0.1, true) === 'before' && dropPosition(0.5, true) === 'inside' && dropPosition(0.9, true) === 'after' && dropPosition(0.4, false) === 'before' && dropPosition(0.6, false) === 'after');
  const LayerNavigator = (await vite.ssrLoadModule('/src/components/LayerNavigator.jsx')).default;
  mount(React.createElement(LayerNavigator)); await sleep(40);
  const countAll = (list) => list.reduce((n, b) => n + 1 + countAll(b.children || []), 0);
  check('layers list every block with a drag handle, rows keep their size (no transforms)', $$('[role="treeitem"]').length === countAll(st().blocks) && $$('[aria-label^="Move "]').length === countAll(st().blocks) && !$$('[role="treeitem"]').some((r) => /scale/.test(r.parentElement.getAttribute('style') || '')));
} catch (e) {
  failedRun = true; fails++; total++;
  console.error('  ✗ EXCEPTION: ' + ((e && e.stack) || e).toString().split('\n').slice(0, 6).join(' | '));
}
try { root?.unmount(); } catch { /* noop */ }
await vite.close();
console.log(`\n${fails === 0 ? 'UI SHELL OK' : fails + ' checks failed'} (${total} checks)${failedRun ? ' — aborted by an exception' : ''}`);
process.exit(fails === 0 ? 0 : 1);
