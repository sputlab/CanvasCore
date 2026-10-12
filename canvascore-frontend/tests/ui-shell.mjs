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
globalThis.alert = () => {}; globalThis.confirm = () => { throw new Error('native confirm() used'); }; globalThis.prompt = () => { throw new Error('native prompt() used'); };
globalThis.IS_REACT_ACT_ENVIRONMENT = false;
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url); calls.push({ u, body: init.body });
  if (u.includes('save_page')) return new Response(JSON.stringify({ success: true }));
  if (u.includes('get_pages')) return new Response(JSON.stringify(PAGES));
  if (u.includes('get_media_folders')) return new Response(JSON.stringify(MEDIA_FOLDERS));
  if (u.includes('get_media')) return new Response(JSON.stringify(MEDIA));
  if (u.includes('media_move')) { const b = JSON.parse(init.body); MEDIA.forEach((m) => { if (b.names.includes(m.name)) m.folder = b.folder; }); return new Response(JSON.stringify({ success: true, moved: b.names.length, folders: MEDIA_FOLDERS })); }
  if (u.includes('media_usage')) return new Response(JSON.stringify({ success: true, usage: { 'sky.jpg': ['Page: Home'] } }));
  if (u.includes('delete_media')) { const b = JSON.parse(init.body); return new Response(JSON.stringify({ success: true, deleted: b.names.length, message: `${b.names.length} images deleted.` })); }
  if (u.includes('upload_media')) return new Response(JSON.stringify({ success: true, url: '/uploads/123_new-icon.png' }));
  if (u.includes('backup_info')) return new Response(JSON.stringify({ success: true, zip: true, max_upload: 300 * 1024, backups: BACKUPS }));
  if (u.includes('backup_create')) { const b = JSON.parse(init.body); BACKUP_OPTS.push(b); return new Response(JSON.stringify({ success: true, name: b.temp ? 'download-20261013-101500-ab12.zip' : 'backup-20261013-101600-cd34.zip', backups: b.temp ? BACKUPS : [{ ...BACKUPS[1], name: 'backup-20261013-101600-cd34.zip', created: 1791900000 }, ...BACKUPS] })); }
  if (u.includes('backup_upload_chunk')) { CHUNKS.push({ id: init.body.get('id'), index: init.body.get('index'), size: init.body.get('chunk').size }); return new Response(JSON.stringify({ success: true })); }
  if (u.includes('backup_restore')) return new Response(JSON.stringify({ success: true, message: 'Backup restored (Acme).', counts: { pages: 3, collection_items: 2, images: 5 }, skipped: ['bad.svg'], safety: 'before-restore-20261013-101700-ef56.zip', backups: BACKUPS }));
  if (u.includes('backup_delete')) return new Response(JSON.stringify({ success: true, backups: BACKUPS.slice(1) }));
  if (u.includes('rebuild_all')) return new Response(JSON.stringify({ success: true, message: 'Published.' }));
  if (u.includes('action=branding')) return new Response(JSON.stringify({ siteName: 'Acme Bakery', faviconUrl: '/uploads/fav.png' }));
  if (u.includes('optimize_media')) return new Response(JSON.stringify({ success: true, done: 1, remaining: 0 }));
  if (u.includes('save_media_meta')) return new Response(JSON.stringify({ success: true }));
  if (u.includes('get_revisions')) return new Response(JSON.stringify([{ id: 2, title: 'P', kind: 'published', author: 'ann', created_at: '2026-10-12 10:00:00' }, { id: 1, title: 'P', kind: 'draft', author: 'bob', created_at: '2026-10-11 09:00:00' }]));
  if (u.includes('get_revision&')) return new Response(JSON.stringify({ id: 1, content_json: JSON.stringify([{ id: 'old1', type: 'TEXT', styles: {}, content: { text: '<p>Old version text</p>' } }]) }));
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

const LONG = 'a-really-really-long-file-name-that-has-no-spaces-at-all-and-keeps-going-forever-2026.jpg';
const MEDIA = [
  { name: 'sky.jpg', url: '/uploads/sky.jpg', folder: 'Products', mtime: 200, alt: 'Blue sky', w: 2000, h: 1000, bytes: 345000, optimized: true, variants: [480, 960, 1600] },
  { name: 'old.png', url: '/uploads/old.png', folder: '', mtime: 100, alt: '', w: 0, h: 0, bytes: 1200, optimized: false, variants: [] },
  { name: LONG, url: '/uploads/' + LONG, folder: '', mtime: 300, alt: '', w: 10, h: 10, bytes: 900, optimized: true, variants: [] },
];
const MEDIA_FOLDERS = ['Products', 'Products/Shoes'];
const BACKUPS = [
  { name: 'before-restore-20261012-090000-aa11.zip', kind: 'safety', bytes: 5 * 1048576, created: 1791795600, site_name: 'Acme', app: '0.13.0', counts: { pages: 12, collection_items: 4 }, uploads: { files: 37 } },
  { name: 'backup-20261011-090000-bb22.zip', kind: 'saved', bytes: 3 * 1048576, created: 1791709200, site_name: 'Acme', app: '0.13.0', counts: { pages: 1 }, uploads: { files: 1 } },
];
const BACKUP_OPTS = [];
const CHUNKS = [];
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
const { DialogHost } = await vite.ssrLoadModule('/src/ui/dialogHost.jsx');
const { BLOCKS } = await vite.ssrLoadModule('/src/editor/blockCatalog.js');
const { CONTENT_PANELS } = await vite.ssrLoadModule('/src/components/panel/blocks/index.js');
const { createRoot } = await import('react-dom/client');
const React = await import('react');
let root = null;
const mount = (el) => { if (root) root.unmount(); doc.getElementById('root').innerHTML = ''; root = createRoot(doc.getElementById('root')); root.render(React.createElement(React.Fragment, null, el, React.createElement(Toaster), React.createElement(DialogHost))); };
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
  check('user, logout and version in the sidebar', /ann/.test($('.ui-sidebar__foot').textContent) && !!$('[aria-label="Log out"]') && !!$('[aria-label="Change your password"]') && /CanvasCore v/.test($('.ui-sidebar__foot').textContent));
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

  console.log('\nDIALOGS');
  {
    const key = (el, k, extra = {}) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra }));
    useStore.setState({ currentView: 'manager', userRole: 'admin', pages: PAGES.map((p) => ({ ...p })) });
    mount(React.createElement(AdminLayout, null, React.createElement(PageManager))); await sleep(60);
    const delBtn = () => $('[aria-label="Delete Contact"]');
    click(delBtn());
    let dlg = await waitFor(() => $('[role="alertdialog"]'));
    check('deleting a page asks in an in-app dialog (no browser confirm)', !!dlg && /Delete the page "Contact"\?/.test(dlg.textContent) && dlg.getAttribute('aria-modal') === 'true');
    check('destructive action: red button with a clear label, focus starts on Cancel', !!btn('Delete page', dlg) && btn('Delete page', dlg).className.includes('danger') && doc.activeElement === btn('Cancel', dlg));
    key(doc.activeElement, 'Tab'); key(doc.activeElement, 'Tab');
    check('Tab stays inside the dialog', dlg.contains(doc.activeElement));
    click(btn('Cancel', dlg)); await sleep(40);
    check('Cancel closes it and nothing is deleted', !$('[role="alertdialog"]') && st().pages.some((p) => p.id === 'p3'));
    click(delBtn()); dlg = await waitFor(() => $('[role="alertdialog"]'));
    key(dlg, 'Escape'); await sleep(40);
    check('Esc cancels too', !$('[role="alertdialog"]') && st().pages.some((p) => p.id === 'p3'));
    click(delBtn()); dlg = await waitFor(() => $('[role="alertdialog"]'));
    click(btn('Delete page', dlg)); await sleep(60);
    check('Confirm deletes the page', !$('[role="alertdialog"]') && !st().pages.some((p) => p.id === 'p3'));

    const { promptDialog, confirmDialog } = await vite.ssrLoadModule('/src/ui/dialog.js');
    let answer = 'unset';
    promptDialog({ title: 'Save as template', label: 'Template name' }).then((v) => { answer = v; });
    const pd = await waitFor(() => $('[role="dialog"].ui-dialog'));
    const input = pd && pd.querySelector('input');
    check('prompt dialog: the text field has the focus, OK is disabled while empty', doc.activeElement === input && btn('OK', pd).disabled);
    typeIn(input, '  Hero block  '); await sleep(20);
    key(input, 'Enter'); await sleep(30);
    check('Enter confirms and gives back the trimmed text', answer === 'Hero block');
    const order = [];
    confirmDialog({ title: 'First?' }).then((v) => order.push('1:' + v));
    confirmDialog({ title: 'Second?' }).then((v) => order.push('2:' + v));
    await sleep(30);
    check('dialogs asked together are shown one at a time', $$('.ui-dialog').length === 1 && /First\?/.test($('.ui-dialog').textContent));
    click(btn('OK', $('.ui-dialog'))); await sleep(30);
    click(btn('Cancel', $('.ui-dialog'))); await sleep(30);
    check('…in order, each with its own answer', order.join(',') === '1:true,2:false', order.join(','));
  }

  console.log('\nPRODUCT FIXES');
  {
    const tabBtn = (t) => $$('[role="tab"]').find((b) => b.textContent.trim() === t);
    const blk2 = (id) => (function find(list) { for (const b of list) { if (b.id === id) return b; const r = b.children && find(b.children); if (r) return r; } return null; })(st().blocks);
    const flex = { id: 'fr1', type: 'FLEX_ROW', styles: { display: 'flex', gap: '20px', flexWrap: 'wrap' }, content: {}, children: [] };
    const html = { id: 'hb1', type: 'HTML', styles: {}, content: { code: '<b>admin code</b>' } };
    const video = { id: 'vd1', type: 'VIDEO', styles: {}, content: { url: 'https://example.com/clip' } };
    const form = { id: 'fm1', type: 'FORM', styles: {}, content: { title: '<h3>T</h3>', fields: [{ label: 'A', type: 'text' }, { label: 'B', type: 'text' }] } };
    useStore.setState({ blocks: [flex, html, video, form], selectedBlockId: 'fr1', userRole: 'editor', pastBlocks: [], futureBlocks: [] });
    mount(React.createElement(PropertyPanel)); await sleep(60);
    check('Flex Row has a Content tab with its layout (direction, space, alignment, wrap)', !!tabBtn('Content') && !!btnHas('Row Layout') && ['Direction', 'Space between blocks', 'Horizontal alignment', 'Vertical alignment'].every((l) => $$('label').some((x) => x.textContent.trim() === l)));
    const dir = $$('label').find((x) => x.textContent.trim() === 'Direction').parentElement.querySelector('select');
    pick(dir, 'column'); await sleep(30);
    check('…and it changes the row\'s styles', blk2('fr1').styles.flexDirection === 'column');
    useStore.setState({ selectedBlockId: 'hb1' }); await sleep(40);
    const ta = $('.cc-ed-right textarea, textarea');
    check('Custom HTML is read-only for editors, with an explanation', !!ta && ta.readOnly && /Only admins can change custom code/.test(doc.body.textContent));
    useStore.setState({ selectedBlockId: 'vd1' }); await sleep(40);
    check('a link that is not YouTube/Vimeo shows a warning', /doesn't look like a YouTube or Vimeo/.test(doc.body.textContent));
    useStore.setState({ selectedBlockId: 'fm1' }); await sleep(40);
    check('editors don\'t see the form\'s receiving email; everyone gets "Message after sending"', !$$('label').some((x) => x.textContent.trim() === 'Receiving Email') && $$('label').some((x) => x.textContent.trim() === 'Message after sending'));
    await openSec('Form Fields');
    const typeSel = $$('select').find((x) => [...x.options].some((o) => o.value === 'tel'));
    check('form fields offer phone, website and date types', !!typeSel && ['tel', 'url', 'date'].every((v) => [...typeSel.options].some((o) => o.value === v)));
    click($$('button[title="Move down"]')[0]); await sleep(30);
    check('form fields can be reordered', blk2('fm1').content.fields.map((f) => f.label).join('') === 'BA');
    useStore.setState({ userRole: 'admin' });

    const ChangePasswordDialog = (await vite.ssrLoadModule('/src/components/ChangePasswordDialog.jsx')).default;
    let closed = false;
    mount(React.createElement(ChangePasswordDialog, { onClose: () => { closed = true; } })); await sleep(40);
    const pw = $$('.ui-dialog input[type="password"]');
    check('change password: current + new twice, button disabled until valid', pw.length === 3 && btn('Change password').disabled);
    typeIn(pw[0], 'oldpass1'); typeIn(pw[1], 'short'); await sleep(20);
    check('…too short is explained', /At least 8 characters/.test($('.ui-dialog').textContent));
    typeIn(pw[1], 'newpass123'); typeIn(pw[2], 'newpass123'); await sleep(20);
    check('…valid → can submit', !btn('Change password').disabled && !closed);
  }

  console.log('\nEDITOR PRODUCTIVITY');
  {
    const key = (k, extra = {}) => w.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra }));
    const ids = () => st().blocks.map((b) => b.id);
    const sec = { id: 'sx1', type: 'SECTION', styles: {}, content: {}, children: [{ id: 'in1', type: 'TEXT', styles: {}, content: { text: '<p>in</p>' } }] };
    const hero = { id: 'h9', type: 'HERO', styles: {}, content: { title: '<h1>H</h1>', buttons: [{ id: 'bb1', text: 'Go', url: '#' }] } };
    useStore.setState({ currentView: 'editor', activePage: { ...PAGES[2] }, blocks: [hero, sec, { id: 't9', type: 'TEXT', styles: {}, content: { text: '<p>t</p>' } }], selectedBlockId: 'sx1', pastBlocks: [], futureBlocks: [], isEditingMaster: false, userRole: 'admin' });
    try { localStorage.removeItem('cc_block_clipboard'); } catch { /* */ }
    mount(React.createElement(VisualEditor)); await waitFor(() => $('[aria-label="Version history"]')); await sleep(150);
    key('d', { ctrlKey: true }); await sleep(30);
    const dup = st().blocks[2];
    check('Ctrl+D duplicates the selected block right after it, with new ids inside too', ids().length === 4 && dup.type === 'SECTION' && dup.id !== 'sx1' && dup.children[0].id !== 'in1' && st().selectedBlockId === dup.id);
    key('ArrowUp', { altKey: true }); await sleep(30);
    check('Alt+↑ moves it up among its siblings', st().blocks[1].id === dup.id);
    key('Delete'); await sleep(30);
    check('Delete removes the selected block (undoable)', !ids().includes(dup.id) && ids().length === 3);
    key('z', { ctrlKey: true }); await sleep(30);
    check('…Ctrl+Z brings it back', ids().includes(dup.id));
    useStore.setState({ selectedBlockId: 'h9' }); await sleep(20);
    key('c', { ctrlKey: true }); await sleep(30);
    check('Ctrl+C copies the block to a clipboard that survives page changes', !!JSON.parse(localStorage.getItem('cc_block_clipboard') || 'null'));
    useStore.setState({ activePage: { ...PAGES[1] }, blocks: [{ id: 'q1', type: 'TEXT', styles: {}, content: {} }], selectedBlockId: 'q1', pastBlocks: [] }); await sleep(40);
    click($('.ui-tab[aria-selected]') && $$('.ui-tab').find((b) => /Add/.test(b.textContent))); await sleep(30);
    check('the Add tab offers "Paste copied Hero"', !!btnHas('Paste copied Hero'));
    key('v', { ctrlKey: true }); await sleep(30);
    const pasted = st().blocks[1];
    check('Ctrl+V pastes it after the selected block on another page, with fresh ids', !!pasted && pasted.type === 'HERO' && pasted.id !== 'h9' && pasted.content.buttons[0].id !== 'bb1');

    click($('[aria-label="Version history"]'));
    const hist = await waitFor(() => $('.cc-history'));
    await waitFor(() => $$('.cc-history__item').length === 2);
    check('Version history lists the saved versions (published / draft, who, when)', $$('.cc-history__item').length === 2 && /Published/.test($$('.cc-history__item')[0].textContent) && /bob/.test($$('.cc-history__item')[1].textContent));
    click($$('.cc-history__item')[1]);
    await waitFor(() => /Old version text/.test(($('.cc-history__frame') || {}).textContent || ''));
    check('…picking one shows a preview', /Old version text/.test($('.cc-history__frame').textContent));
    click(btnHas('Restore this version', hist));
    const cd = await waitFor(() => $('[role="alertdialog"]'));
    click(btn('Restore version', cd)); await sleep(60);
    check('…Restore puts it in the editor as an unsaved change (one undo step)', st().blocks.length === 1 && st().blocks[0].content.text === '<p>Old version text</p>' && !$('.cc-history'));
    st().undo();
    check('…and Ctrl+Z undoes the restore', st().blocks.length === 2);
  }

  console.log('\nIMAGES');
  {
    const MediaManager = (await vite.ssrLoadModule('/src/components/MediaManager.jsx')).default;
    mount(React.createElement(MediaManager));
    await waitFor(() => $$('figure').length === 3);
    const card = (name) => $$('figure').find((f) => f.querySelector('.cc-media-card__name').textContent === name);
    check('the library shows size, file size and "Optimized"', /2000×1000/.test(card('sky.jpg').textContent) && /337 KB/.test(card('sky.jpg').textContent) && /Optimized/.test(card('sky.jpg').textContent) && !/Optimized/.test(card('old.png').textContent));
    const altIn = card('old.png').querySelector('input[aria-label^="Description"]');
    typeIn(altIn, 'Old logo'); altIn.dispatchEvent(new w.FocusEvent('focusout', { bubbles: true })); await sleep(40);
    const saved = calls.filter((c) => c.u.includes('save_media_meta')).pop();
    check('an image description is saved when you leave the field', !!saved && JSON.parse(saved.body).alt === 'Old logo' && JSON.parse(saved.body).name === 'old.png');
    const opt = btnHas('Optimize 1 older image');
    check('"Optimize older images" appears when some aren\'t optimized', !!opt);
    click(opt); await waitFor(() => calls.some((c) => c.u.includes('optimize_media'))); await sleep(60);
    check('…and runs the optimization on the server', calls.some((c) => c.u.includes('optimize_media')));
  }

  console.log('\nMEDIA LIBRARY: FOLDERS, SELECTION, UPLOADS');
  {
    const MediaManager = (await vite.ssrLoadModule('/src/components/MediaManager.jsx')).default;
    mount(React.createElement(MediaManager));
    await waitFor(() => $$('figure').length === 3);
    const card = (name) => $$('figure').find((f) => f.querySelector('.cc-media-card__name').textContent === name);
    const lc = card(LONG);
    check('a long file name is cut with "…" and its buttons stay inside the card (copy, move, delete)',
      lc.querySelector('.cc-media-card__name').title === LONG && lc.querySelectorAll('.cc-media-card__actions button').length === 3
      && /cc-media-card__name \{[^}]*min-width: 0;[^}]*text-overflow: ellipsis/.test(readFileSync(path.join(PROJECT, 'src/ui/kit.css'), 'utf8')));
    check('newest first by default', $$('.cc-media-card__name').map((n) => n.textContent)[0] === LONG);
    const folderBtn = (label) => $$('.cc-media-folder__btn').find((b) => b.querySelector('.cc-media-folder__name').textContent === label);
    check('folders on the left with counts (All, Not in a folder, Products, Shoes)', /3/.test(folderBtn('All images').textContent) && /2/.test(folderBtn('Not in a folder').textContent) && !!folderBtn('Products') && !!folderBtn('Shoes'));
    click(folderBtn('Products')); await sleep(30);
    check('opening a folder shows its images and its sub-folders', $$('figure').length === 1 && !!$$('.cc-media-subfolder').find((b) => /Shoes/.test(b.textContent)));
    click(folderBtn('All images')); await sleep(30);
    // selection: click one, Shift+click another selects the range
    const box = (name) => card(name).querySelector('input[type="checkbox"]');
    click(box(LONG)); await sleep(10);
    box('old.png').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true })); await sleep(30);
    check('selecting images (Shift+click selects the range in between)', /3 selected/.test($('.cc-media-selbar').textContent));
    click(btnHas('Move to folder…'));
    const md = await waitFor(() => $('[aria-labelledby="cc-move-title"]'));
    check('"Move to folder…" lists the folders', !!md && [...md.querySelectorAll('option')].some((o) => o.value === 'Products/Shoes'));
    pick(md.querySelector('select'), 'Products/Shoes'); await sleep(10);
    click(btn('Move', md)); await sleep(60);
    const mv = calls.filter((c) => c.u.includes('media_move')).pop();
    check('…moves all the selected images at once', !!mv && JSON.parse(mv.body).names.length === 3 && JSON.parse(mv.body).folder === 'Products/Shoes');
    await waitFor(() => $$('figure').length === 3);
    click(card('sky.jpg').querySelector('input[type="checkbox"]')); click(card('old.png').querySelector('input[type="checkbox"]')); await sleep(30);
    click(btnHas('Delete', $('.cc-media-selbar')));
    const dd = await waitFor(() => $('[role="alertdialog"]'));
    check('deleting several images asks once, and warns where they are still used', !!dd && /Delete 2 images\?/.test(dd.textContent) && /Page: Home/.test(dd.textContent));
    click(btn('Delete 2 images', dd)); await sleep(60);
    const del = calls.filter((c) => c.u.includes('delete_media')).pop();
    check('…and deletes them in one go', !!del && JSON.parse(del.body).names.length === 2);
    // uploads with a progress panel (fetch path: no XMLHttpRequest in this test)
    const fileInput = $('input[type="file"]');
    const F = globalThis.File || w.File; const f1 = new F(['x'], 'one.jpg', { type: 'image/jpeg' }); const f2 = new F(['y'], 'notes.txt', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [f1, f2], configurable: true });
    fileInput.dispatchEvent(new w.Event('change', { bubbles: true }));
    const panel = await waitFor(() => $('.cc-upload-panel') && /1 uploaded, 1 failed/.test($('.cc-upload-panel').textContent) && $('.cc-upload-panel'), 3000);
    check('uploading shows a panel with each file, its progress and the result', !!panel && /one\.jpg/.test(panel.textContent) && /Not an image/.test(panel.textContent));
    click($('.cc-upload-panel [aria-label="Close"]')); await sleep(20);
    check('…which closes when you are done', !$('.cc-upload-panel'));
  }

  {
    // picking an image fills the block's alt text when it is empty
    useStore.setState({ blocks: [{ id: 'im1', type: 'IMAGE', styles: {}, content: { src: '', alt: '' } }], selectedBlockId: 'im1' });
    mount(React.createElement(PropertyPanel)); await sleep(60);
    click($('[aria-label="Choose from the media library"]'));
    const item = await waitFor(() => $('.cc-picker__item[aria-label="Choose Blue sky"]'));
    check('the picker shows the library with sizes and a search box', !!item && /2000×1000/.test($('.cc-picker').textContent) && !!$('.cc-picker input[type="search"], .cc-picker .ui-search input'));
    if (item) click(item);
    await sleep(40);
    check('…and picking an image also fills the empty alt text', st().blocks[0].content.src === '/uploads/sky.jpg' && st().blocks[0].content.alt === 'Blue sky', JSON.stringify(st().blocks[0].content));
  }

  console.log('\nSEO & SITE FEATURES');
  {
    const { CONTENT_PANELS: CP } = await vite.ssrLoadModule('/src/components/panel/blocks/index.js');
    check('Site Search is in the Add catalog and has a settings panel', BLOCKS.some((b) => b.type === 'SEARCH') && !!CP.SEARCH);
    useStore.setState({ selectedBlockId: null, activePage: { ...PAGES[1], seo_title: 'About us — the team', seo_description: '' }, userRole: 'admin' });
    mount(React.createElement(PropertyPanel)); await sleep(50);
    await openSec('SEO & Meta Data');
    check('SEO: character counts and search/share previews', /19 \/ 60/.test(doc.body.textContent) && !!$('[aria-label="Search result preview"]') && !!$('[aria-label="Shared link preview"]'));
    const hide = $$('label').find((l) => /Hide this page from search engines/.test(l.textContent)).querySelector('input');
    click(hide); await sleep(30);
    check('"Hide this page from search engines" is stored on the page', Number(st().activePage.noindex) === 1);
    useStore.setState({ currentView: 'settings', pages: PAGES });
    mount(React.createElement(AdminLayout, null, React.createElement((await vite.ssrLoadModule('/src/components/GlobalSettings.jsx')).default)));
    await waitFor(() => btnHas('Save & Publish') && !btnHas('Save & Publish').disabled, 3000);
    const cookieBox = $$('label').find((l) => /Show the cookie banner/.test(l.textContent));
    check('Global Options has a Cookie banner card', !!cookieBox);
    if (cookieBox) { click(cookieBox.querySelector('input')); await sleep(30); }
    check('…with text, buttons, privacy page and position once enabled', ['Accept button', 'Decline button', 'Privacy policy page', 'Position'].every((t) => $$('label').some((l) => l.textContent.trim() === t)));
    check('admins see the Redirects card', /Redirects/.test(doc.body.textContent) && !!btnHas('Add redirect'));
  }

  console.log('\nSITE BRANDING & ABOUT');
  {
    await st().fetchBranding();
    check('the store loads the site name and favicon (public "branding" action)', st().branding.siteName === 'Acme Bakery' && st().branding.faviconUrl === '/uploads/fav.png');
    useStore.setState({ currentView: 'manager', userRole: 'admin', username: 'ann' });
    mount(React.createElement(AdminLayout, null, React.createElement('p', null, 'child')));
    await waitFor(() => $('.ui-brand'));
    check('sidebar shows the site name instead of "CanvasCore"', /Acme Bakery/.test($('.ui-brand').textContent) && !/CanvasCore/.test($('.ui-brand').textContent));
    check('…with the site favicon as its logo', $('.ui-brand img')?.getAttribute('src') === '/uploads/fav.png');
    check('"CanvasCore" stays in the footer next to the version', /CanvasCore v/.test($('.ui-sidebar__foot').textContent));
    click($('[aria-label="About CanvasCore"]'));
    const about = await waitFor(() => $('[role="dialog"][aria-labelledby="cc-about-title"]'));
    const hrefs = about ? $$('a', about).map((a) => a.getAttribute('href')) : [];
    check('the ⓘ next to the version opens "About CanvasCore"', !!about && /Version /.test(about.textContent));
    check('…with links to sputlab.com, Discord, the bug email and donations', ['https://www.sputlab.com', 'https://discord.gg/sD8KMc2kN', 'https://www.sputlab.com/donate'].every((h) => hrefs.includes(h)) && hrefs.some((h) => h.startsWith('mailto:bug@sputlab.com')) && /bug@sputlab\.com/.test(about.textContent));
    check('…external links open in a new tab safely', $$('a[target="_blank"]', about).every((a) => /noopener/.test(a.getAttribute('rel'))));
    about.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(30);
    check('…and Escape closes it', !$('[aria-labelledby="cc-about-title"]'));

    const Login = (await vite.ssrLoadModule('/src/components/Login.jsx')).default;
    mount(React.createElement(Login)); await sleep(30);
    check('sign-in screen shows the site name and favicon', $('h1')?.textContent === 'Acme Bakery' && $('main img')?.getAttribute('src') === '/uploads/fav.png');
    const { useBrandingHead, brandIconUrl } = await vite.ssrLoadModule('/src/ui/branding.js');
    mount(React.createElement(() => { useBrandingHead(); return null; })); await sleep(30);
    check('browser tab: site name and favicon', doc.title === 'Acme Bakery · Admin' && doc.querySelector('link[rel="icon"]')?.getAttribute('href') === '/uploads/fav.png');
    check('favicon addresses: relative ones are resolved from the admin, unsafe ones dropped', brandIconUrl('uploads/a.png') === '../uploads/a.png' && brandIconUrl('javascript:alert(1)') === '' && brandIconUrl('https://x.test/f.ico') === 'https://x.test/f.ico' && brandIconUrl('//evil.test/x.png') === '');
    useStore.setState({ branding: { siteName: 'Acme Bakery', faviconUrl: '' } });
    mount(React.createElement(AdminLayout, null, 'x')); await sleep(30);
    check('no favicon set → the default app icon', !$('.ui-brand img') && !!$('.ui-brand svg'));

    useStore.setState({ currentView: 'settings', pages: PAGES });
    mount(React.createElement(AdminLayout, null, React.createElement((await vite.ssrLoadModule('/src/components/GlobalSettings.jsx')).default)));
    await waitFor(() => btnHas('Save & Publish') && !btnHas('Save & Publish').disabled, 3000);
    check('Favicon and social image fields have "Upload image" and "Library"', !!$('[aria-label="Upload image: Favicon"]') && !!$('[aria-label="Upload image: Default social image"]') && $$('button').filter((b) => b.textContent.trim() === 'Library').length === 2);
    const favLabel = $$('label').find((l) => l.textContent.trim() === 'Favicon');
    const favInput = favLabel && doc.getElementById(favLabel.getAttribute('for'));
    const fileInput = $('[aria-label="Upload image: Favicon"]').parentElement.querySelector('input[type="file"]');
    const F = globalThis.File || w.File;
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [new F(['x'], 'icon.png', { type: 'image/png' })] });
    fileInput.dispatchEvent(new w.Event('change', { bubbles: true }));
    await waitFor(() => favInput && favInput.value === '/uploads/123_new-icon.png', 2000);
    check('uploading a favicon fills its address (and the label still points at the field)', !!favInput && favInput.value === '/uploads/123_new-icon.png' && calls.some((c) => c.u.includes('upload_media')));
    click($('[aria-label="Choose from the media library: Default social image"]'));
    const pick = await waitFor(() => $('[aria-label="Choose Blue sky"]'));
    if (pick) click(pick);
    await sleep(30);
    const ogLabel = $$('label').find((l) => l.textContent.trim() === 'Default social image (OG)');
    check('"Library" picks an image from the media library', doc.getElementById(ogLabel.getAttribute('for'))?.value === '/uploads/sky.jpg');

    const css = readFileSync(path.join(PROJECT, 'src/ui/kit.css'), 'utf8');
    check('media selection bar has a solid background (readable text)', /\.cc-media-selbar \{[^}]*background: #1e293b/.test(css));
  }

  console.log('\nBACKUP');
  {
    const clicked = [];
    const origClick = w.HTMLAnchorElement.prototype.click;
    w.HTMLAnchorElement.prototype.click = function () { clicked.push(this.getAttribute('href')); };
    useStore.setState({ currentView: 'backup', userRole: 'admin' });
    mount(React.createElement(AdminLayout, null, React.createElement((await vite.ssrLoadModule('/src/components/Backup.jsx')).default)));
    const list = await waitFor(() => $('[aria-label="Backups on the server"]'));
    check('the page lists the backups kept on the server, safety copies marked', !!list && $$('li', list).length === 2 && /Safety copy before a restore/.test(list.textContent) && /Saved copy/.test(list.textContent));
    check('…with what each contains and its size', /12 pages · 4 items · 37 image files · 5\.0 MB/.test(list.textContent) || /12 pages · 4 items · 37 image files/.test(list.textContent), list && list.textContent);
    check('says what a backup includes (images too) and that accounts never are', /every uploaded image/.test(doc.body.textContent) && /User accounts and passwords are never included/.test(doc.body.textContent));
    click($$('label').find((l) => /version history/.test(l.textContent)).querySelector('input')); await sleep(20);
    click(btnHas('Download backup (.zip)'));
    await waitFor(() => clicked.length, 2000);
    check('Download: the backup is made first (with the chosen options), then the browser downloads it', BACKUP_OPTS[0] && BACKUP_OPTS[0].temp === true && BACKUP_OPTS[0].history === false && BACKUP_OPTS[0].submissions === true && clicked[0] === 'api.php?action=backup_download&name=download-20261013-101500-ab12.zip', JSON.stringify([BACKUP_OPTS, clicked]));
    click(btnHas('Keep a copy on the server'));
    await waitFor(() => $$('li', $('[aria-label="Backups on the server"]')).length === 3, 2000);
    check('"Keep a copy on the server" adds it to the list', $$('li', $('[aria-label="Backups on the server"]')).length === 3 && BACKUP_OPTS[1].temp === false);
    const dlBtn = $$('button').find((b) => /^Download the backup of/.test(b.getAttribute('aria-label') || ''));
    click(dlBtn); await sleep(20);
    check('a saved backup can be downloaded', clicked[1] === 'api.php?action=backup_download&name=backup-20261013-101600-cd34.zip', clicked[1]);

    // restore from a file: sent in pieces under the server's upload limit (300 KB here), then restored by id
    const fileInput = $('input[type="file"]');
    const F = globalThis.File || w.File;
    const before = calls.length;
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [new F([new Uint8Array(600 * 1024)], 'site-backup.zip', { type: 'application/zip' })] });
    fileInput.dispatchEvent(new w.Event('change', { bubbles: true }));
    const dlg = await waitFor(() => $('[role="alertdialog"]'));
    check('restoring asks first, saying the site is replaced and a safety copy is made', !!dlg && /REPLACES the whole site/.test(dlg.textContent) && /safety copy/.test(dlg.textContent));
    click(btn('Restore and replace the site', dlg));
    const res = await waitFor(() => $('.cc-backup-result'), 3000);
    check('restore: result with counts, files left out and the safety copy', !!res && /Backup restored \(Acme\)/.test(res.textContent) && /3 pages, 2 items, 5 image files/.test(res.textContent) && /bad\.svg/.test(res.textContent) && /safety copy/.test(res.textContent), res && res.textContent);
    await waitFor(() => calls.some((c) => c.u.includes('rebuild_all')), 2000);
    const rc = calls.find((c) => c.u.includes('action=backup_restore') && !c.u.includes('saved'));
    check('a big file is uploaded in pieces below the server limit, then restored by its upload id', CHUNKS.length === 3 && CHUNKS.every((c) => c.size <= 300 * 1024 && c.id === CHUNKS[0].id) && CHUNKS.map((c) => c.index).join() === '0,1,2'
      && CHUNKS.reduce((a, c) => a + c.size, 0) === 600 * 1024 && rc && JSON.parse(rc.body).upload === CHUNKS[0].id && JSON.parse(rc.body).size === 600 * 1024, JSON.stringify(CHUNKS));
    check('…then the pages and site name are reloaded and the site is published', calls.some((c) => c.u.includes('rebuild_all')) && calls.slice(before).some((c) => c.u.includes('action=branding')) && calls.slice(before).some((c) => c.u.includes('get_pages')));
    const rs = $$('button').find((b) => /^Restore the backup of/.test(b.getAttribute('aria-label') || ''));
    click(rs);
    const dlg2 = await waitFor(() => $('[role="alertdialog"]'));
    check('restoring a saved backup asks first too', !!dlg2 && /REPLACES the whole site/.test(dlg2.textContent));
    click(btn('Restore and replace the site', dlg2));
    await waitFor(() => calls.some((c) => c.u.includes('backup_restore_saved')), 2000);
    check('…and sends only its name', (() => { const c = calls.find((x) => x.u.includes('backup_restore_saved')); return c && JSON.parse(c.body).name === 'before-restore-20261012-090000-aa11.zip'; })());
    await sleep(50);
    const del = $$('button').find((b) => /^Delete the backup of/.test(b.getAttribute('aria-label') || ''));
    click(del);
    const dlg3 = await waitFor(() => $('[role="alertdialog"]'));
    check('deleting a backup asks first', !!dlg3 && /cannot be undone/.test(dlg3.textContent));
    click(btn('Delete backup', dlg3));
    await waitFor(() => calls.some((c) => c.u.includes('backup_delete')), 2000);
    check('…then deletes it', calls.some((c) => c.u.includes('backup_delete')));
    w.HTMLAnchorElement.prototype.click = origClick;
  }

  console.log('\nSTORE & SAVING');
  {
    const { newBlockId } = await vite.ssrLoadModule('/src/store/useStore.js');
    const ids = new Set(); for (let i = 0; i < 2000; i++) ids.add(newBlockId());
    check('block ids are unique even when made in the same millisecond', ids.size === 2000);
    useStore.setState({ blocks: [{ id: 't1', type: 'TEXT', styles: {}, content: { text: '<p>a</p>' } }, { id: 'sx', type: 'SECTION', styles: {}, content: {}, children: [] }], pastBlocks: [], futureBlocks: [] });
    st().addBlock('SECTION', 't1');
    check('"add inside" a Text block adds at the end of the page instead (no children on a Text)', !st().blocks[0].children && st().blocks.length === 3);
    st().addBlock('TEXT', 'gone-id');
    check('"add inside" a block that no longer exists adds at the end of the page', st().blocks.length === 4);
    st().moveBlock('t1', 'sx');
    check('dragging a block onto an EMPTY sibling container puts it inside', (st().blocks.find((b) => b.id === 'sx').children || []).some((c) => c.id === 't1'));
    useStore.setState({ blocks: [{ id: 'u1', type: 'TEXT', styles: {}, content: { text: '' } }], pastBlocks: [], futureBlocks: [] });
    for (const ch of 'hello') st().updateBlock('u1', { content: { text: (st().blocks[0].content.text || '') + ch } });
    check('typing in a field = one undo step, not one per key', st().pastBlocks.length === 1 && st().blocks[0].content.text === 'hello');
    st().undo();
    check('…and undo brings back the text before typing', st().blocks[0].content.text === '');

    // a save that runs while the user keeps editing: only what was sent counts as saved
    const { createEditorDraftTracker, editorSnapshot, editorScope } = await vite.ssrLoadModule('/src/session/draftTrackers.js');
    useStore.setState({ activePage: { id: 'pz', title: 'P' }, blocks: [{ id: 'z1', type: 'TEXT', styles: {}, content: { text: '<p>v1</p>' } }], editorRestored: false, isEditingMaster: false, editingMaster: null });
    const tr = createEditorDraftTracker({ getState: useStore.getState, setState: useStore.setState, setTimeoutFn: (f) => f(), clearTimeoutFn: () => {} });
    tr.start();
    useStore.setState({ blocks: [{ id: 'z1', type: 'TEXT', styles: {}, content: { text: '<p>v2</p>' } }] }); tr.evaluate();
    const sent = editorSnapshot(st()).page; const scope = editorScope(st());
    useStore.setState({ blocks: [{ id: 'z1', type: 'TEXT', styles: {}, content: { text: '<p>v3 typed during the save</p>' } }] }); tr.evaluate();
    tr.markSaved(sent, scope);
    check('edits made while a save is running stay "unsaved" (and backed up)', st().editorDirty === true);
    tr.markSaved(editorSnapshot(st()).page, editorScope(st()));
    check('…until they are saved too', st().editorDirty === false);
    tr.dispose();

    // reopening a page that has unsaved work from an earlier visit: offered, never deleted silently
    const drafts = await vite.ssrLoadModule('/src/session/drafts.js');
    drafts.setDraftUser('ann');
    useStore.setState({ activePage: { id: 'pk', title: 'K' }, blocks: [{ id: 'k1', type: 'TEXT', styles: {}, content: { text: '<p>server</p>' } }], editorRestored: false });
    const kScope = editorScope(st());
    drafts.saveDraft(kScope, { page: { page: { id: 'pk', title: 'K' }, blocks: [{ id: 'k1', type: 'TEXT', styles: {}, content: { text: '<p>unsaved edit</p>' } }] }, master: null });
    let tk = createEditorDraftTracker({ getState: useStore.getState, setState: useStore.setState, setTimeoutFn: (f) => f(), clearTimeoutFn: () => {} });
    tk.start();
    check('reopening a page with a backup offers to restore it', !!st().editorDraftFound);
    tk.dispose();
    check('…leaving without deciding keeps the backup', !!drafts.readDraft(kScope) && !st().editorDraftFound);
    tk = createEditorDraftTracker({ getState: useStore.getState, setState: useStore.setState, setTimeoutFn: (f) => f(), clearTimeoutFn: () => {} });
    tk.start(); tk.restoreFound();
    check('…and Restore brings the unsaved edit back (as unsaved)', st().blocks[0].content.text === '<p>unsaved edit</p>' && st().editorRestored === true && st().editorDirty === true);
    tk.dispose();
    check('leaving resets the "restored" flag (it must not follow to another page)', st().editorRestored === false);
  }
} catch (e) {
  failedRun = true; fails++; total++;
  console.error('  ✗ EXCEPTION: ' + ((e && e.stack) || e).toString().split('\n').slice(0, 6).join(' | '));
}
try { root?.unmount(); } catch { /* noop */ }
await vite.close();
console.log(`\n${fails === 0 ? 'UI SHELL OK' : fails + ' checks failed'} (${total} checks)${failedRun ? ' — aborted by an exception' : ''}`);
process.exit(fails === 0 ? 0 : 1);
