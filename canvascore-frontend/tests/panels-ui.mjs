// tests/panels-ui.mjs
// Editor INTEGRATION tests for the 12 new blocks, with the REAL components mounted in jsdom
// (loaded through Vite in SSR mode): addBlock → PropertyPanel → field edits → store,
// and SortableBlock (canvas) for each block.
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, timeout = 3000) {
  const t0 = Date.now();
  for (;;) { let v; try { v = fn(); } catch { v = null; } if (v) return v; if (Date.now() - t0 > timeout) return null; await sleep(20); }
}

// ---- jsdom environment as the global "window"
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/canvascore-admin/', pretendToBeVisual: true });
const w = dom.window;
for (const k of ['document', 'localStorage', 'location', 'history', 'navigator', 'getComputedStyle', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'HTMLIFrameElement', 'Element', 'Node', 'Event', 'KeyboardEvent', 'MouseEvent', 'FocusEvent', 'InputEvent', 'CustomEvent', 'MutationObserver', 'SVGElement', 'DocumentFragment', 'Text']) {
  if (k in w) Object.defineProperty(globalThis, k, { configurable: true, get: () => w[k] });
}
Object.defineProperty(globalThis, 'window', { configurable: true, value: globalThis, writable: true });
globalThis.addEventListener = (...a) => w.addEventListener(...a);
globalThis.removeEventListener = (...a) => w.removeEventListener(...a);
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.alert = () => {}; globalThis.confirm = () => true;
globalThis.fetch = async () => new Response(JSON.stringify([]), { status: 200 });
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const vite = await createServer({
  root: PROJECT, configFile: false, logLevel: 'error', appType: 'custom', clearScreen: false,
  server: { middlewareMode: true, hmr: false, watch: null },
  plugins: [react()],
  resolve: { alias: { 'jodit-react': path.join(PROJECT, 'tests/stubs/jodit-react.jsx') } },
  define: { __APP_VERSION__: '"test"', __APP_BUILD__: '0', __BLOCK_DEFS__: JSON.stringify(blockDefs) },
  optimizeDeps: { noDiscovery: true, include: [] },
});

const doc = w.document;
const $$ = (sel, root = doc) => [...root.querySelectorAll(sel)];
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
function setValue(el, value) {
  const proto = el instanceof w.HTMLTextAreaElement ? w.HTMLTextAreaElement.prototype : el instanceof w.HTMLSelectElement ? w.HTMLSelectElement.prototype : w.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(value));
  el.dispatchEvent(new w.Event(el instanceof w.HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}
// field tied to a label: <div><label>text</label><input/select/textarea></div>
const field = (labelText) => {
  const lab = $$('label').find((l) => l.textContent.trim().startsWith(labelText));
  return lab ? lab.parentElement.querySelector('input,select,textarea') : null;
};
const checkbox = (labelText) => { const lab = $$('label').find((l) => l.textContent.includes(labelText) && l.querySelector('input[type="checkbox"]')); return lab && lab.querySelector('input'); };
const buttonByText = (txt) => $$('button').find((b) => b.textContent.trim().includes(txt));

const { useStore } = await vite.ssrLoadModule('/src/store/useStore.js');
const PropertyPanel = (await vite.ssrLoadModule('/src/components/PropertyPanel.jsx')).default;
const SortableBlock = (await vite.ssrLoadModule('/src/components/SortableBlock.jsx')).default;
const { createRoot } = await import('react-dom/client');
const React = await import('react');
const { DndContext } = await import('@dnd-kit/core');
const { SortableContext } = await import('@dnd-kit/sortable');

let root = null;
const mount = (el) => { if (root) root.unmount(); doc.getElementById('root').innerHTML = ''; root = createRoot(doc.getElementById('root')); root.render(el); };
const st = () => useStore.getState();
const content = () => st().blocks[0].content;
function addAndSelect(type) {
  useStore.setState({ blocks: [], selectedBlockId: null, pastBlocks: [], futureBlocks: [], activePage: { id: 'p', title: 'T', slug: 't', layout: 'boxed' }, viewport: 'desktop', masters: [], templates: [], pages: [] });
  st().addBlock(type);
  const b = st().blocks[0];
  st().setSelectedBlockId(b.id);
  return b;
}

const TYPES = ['DIVIDER', 'CALLOUT', 'STEPS', 'COUNTERS', 'PROGRESS', 'TABLE', 'COUNTDOWN', 'TIMELINE', 'LOGOS', 'TEAM', 'BEFORE_AFTER', 'BUSINESS'];
const PANEL = { DIVIDER: 'Divider', CALLOUT: 'Callout', STEPS: 'Steps', COUNTERS: 'Counters', PROGRESS: 'Progress Bars', TABLE: 'Data Table', COUNTDOWN: 'Countdown', TIMELINE: 'Timeline', LOGOS: 'Logos', TEAM: 'Team Members', BEFORE_AFTER: 'Before / After', BUSINESS: 'Business Details' };
let failedRun = false;
try {
  console.log('\nADD BLOCK — the blocks.json defaults reach the editor');
  for (const t of TYPES) {
    const b = addAndSelect(t);
    const def = blockDefs.types[t];
    check(`${t}: addBlock creates the block with the default content`, b.type === t && JSON.stringify(b.content) === JSON.stringify(def.content));
  }

  console.log('\nPANELS — mounted and editable');
  for (const t of TYPES) {
    addAndSelect(t);
    mount(React.createElement(PropertyPanel));
    const ok = await waitFor(() => $$('button').some((b) => b.textContent.includes(PANEL[t])));
    check(`${t}: the "${PANEL[t]}" panel appears (no rendering error)`, !!ok);
  }

  // --- interactions per type
  addAndSelect('DIVIDER'); mount(React.createElement(PropertyPanel)); await waitFor(() => field('Style'));
  check('DIVIDER: with "line" there is no height field', !field('Height px'));
  setValue(field('Style'), 'wave'); await sleep(40);
  check('DIVIDER: changing the style updates the store', content().style === 'wave');
  check('DIVIDER: with "wave" height and flip appear, width disappears', !!field('Height px') && !!checkbox('Flip vertically') && !field('Width %'));
  click(checkbox('Flip vertically')); await sleep(40);
  check('DIVIDER: the checkbox updates the store', content().flip === true);
  setValue(field('Color'), '#ff0000'); await sleep(40);
  check('DIVIDER: the color updates the store', content().color === '#ff0000');

  addAndSelect('CALLOUT'); mount(React.createElement(PropertyPanel)); await waitFor(() => field('Text'));
  setValue(field('Text'), '<p>nuovo</p>'); setValue(field('Type'), 'danger'); await sleep(40);
  check('CALLOUT: text and type update the store', content().text === '<p>nuovo</p>' && content().variant === 'danger');

  addAndSelect('STEPS'); mount(React.createElement(PropertyPanel)); await waitFor(() => buttonByText('+ Add step'));
  click(buttonByText('+ Add step')); await sleep(40);
  check('STEPS: "+ Add step" adds a step', content().items.length === 4);
  const firstTitle = content().items[0].title;
  click($$('button[title="Move down"]')[0]); await sleep(40);
  check('STEPS: "Move down" swaps the first two steps', content().items[1].title === firstTitle);
  click($$('button[title="Remove"]')[0]); await sleep(40);
  check('STEPS: "Remove" deletes the step', content().items.length === 3);
  check('STEPS: the buttons at the edges are disabled (you cannot move out of the list)', $$('button[title="Move up"]')[0].disabled === true);

  addAndSelect('COUNTERS'); mount(React.createElement(PropertyPanel)); await waitFor(() => buttonByText('+ Add counter'));
  const valInput = field('Value');
  setValue(valInput, '250'); await sleep(40);
  check('COUNTERS: the value is saved as a NUMBER (not a string)', content().items[0].value === 250);
  setValue(valInput, ''); await sleep(40);
  check('COUNTERS: cleared field → empty string (the compiler treats it as 0)', content().items[0].value === '');
  click(buttonByText('+ Add counter')); await sleep(40);
  check('COUNTERS: adding a counter', content().items.length === 5);

  addAndSelect('PROGRESS'); mount(React.createElement(PropertyPanel)); await waitFor(() => buttonByText('+ Add bar'));
  setValue(field('Value %'), '42'); await sleep(40);
  check('PROGRESS: numeric percentage value', content().items[0].value === 42);
  click(buttonByText('+ Add bar')); await sleep(40);
  check('PROGRESS: adding a bar', content().items.length === 4);

  addAndSelect('TABLE'); mount(React.createElement(PropertyPanel)); await waitFor(() => field('Data'));
  setValue(field('Data'), 'A | B\n1 | 2'); await sleep(40);
  check('TABLE: pasted data ends up in the store as is', content().data === 'A | B\n1 | 2');

  addAndSelect('COUNTDOWN'); mount(React.createElement(PropertyPanel)); await waitFor(() => field('Target date'));
  setValue(field('Target date'), '2031-02-03T04:05'); setValue(field('Time zone'), '+02:00'); await sleep(40);
  check('COUNTDOWN: date/time and time zone update the store in the format the compiler expects', content().datetime === '2031-02-03T04:05' && content().utcOffset === '+02:00');
  check('COUNTDOWN: the time zone menu contains "visitor local time" and offsets from -12:00 to +14:00', (() => { const o = [...field('Time zone').options].map((x) => x.value); return o[0] === 'local' && o.includes('-12:00') && o.includes('+14:00') && o.includes('+05:30'); })());
  setValue(field('When it ends'), 'hide'); await sleep(40);
  check('COUNTDOWN: with "hide" the message field disappears', content().endAction === 'hide' && !field('Message'));

  addAndSelect('TIMELINE'); mount(React.createElement(PropertyPanel)); await waitFor(() => buttonByText('+ Add event'));
  click(buttonByText('+ Add event')); await sleep(40);
  check('TIMELINE: adding an event', content().items.length === 4);

  addAndSelect('LOGOS'); mount(React.createElement(PropertyPanel)); await waitFor(() => buttonByText('+ Add empty slot'));
  click(buttonByText('+ Add empty slot')); await sleep(40);
  check('LOGOS: adding an empty slot', content().logos.length === 6 && content().logos[5].src === '');
  check('LOGOS: the "from media" button opens the picker (no errors)', (() => { try { click(buttonByText('+ Add logo from media')); return true; } catch { return false; } })());
  await sleep(60);

  addAndSelect('TEAM'); mount(React.createElement(PropertyPanel)); await waitFor(() => buttonByText('+ Add member'));
  click(buttonByText('+ Add member')); await sleep(40);
  check('TEAM: adding a member with all expected fields', content().members.length === 4 && ['name', 'role', 'bio', 'photo', 'email', 'linkedin', 'twitter', 'website'].every((k) => k in content().members[3]));

  addAndSelect('BEFORE_AFTER'); mount(React.createElement(PropertyPanel)); await waitFor(() => $$('button').some((b) => b.textContent.includes('Before / After')));
  const imgs = $$('input[placeholder="Image URL"]');
  setValue(imgs[0], 'https://x.example/prima.jpg'); setValue(imgs[1], 'https://x.example/dopo.jpg'); await sleep(40);
  check('BEFORE_AFTER: the two images go to before/after (keeping alt and label)', content().before.src === 'https://x.example/prima.jpg' && content().after.src === 'https://x.example/dopo.jpg' && content().before.label === 'Before' && content().after.label === 'After');

  addAndSelect('BUSINESS'); mount(React.createElement(PropertyPanel)); await waitFor(() => field('Business name'));
  setValue(field('Business name'), 'Bar Roma'); await sleep(40);
  check('BUSINESS: the name updates the store', content().name === 'Bar Roma');
  click($$('button').find((b) => b.textContent.includes('Opening Hours'))); await sleep(60);
  const times = $$('input[type="time"]');
  check('BUSINESS: 7 rows of hours (14 time fields)', times.length === 14);
  setValue(times[0], '07:30'); await sleep(40);
  check('BUSINESS: changing Monday opening time updates only that row', content().hours[0].open === '07:30' && content().hours[1].open === '09:00' && content().hours.length === 7);
  const closedBoxes = $$('input[type="checkbox"][title="Closed"]');
  check('BUSINESS: Sunday marked as closed, with the time fields disabled', closedBoxes[6].checked === true && times[12].disabled === true);
  click(closedBoxes[0]); await sleep(40);
  check('BUSINESS: ticking "closed" on Monday', content().hours[0].closed === true);
  click(buttonByText('Remove opening hours')); await sleep(40);
  check('BUSINESS: "Remove opening hours" clears the hours', content().hours.length === 0 && !!buttonByText('+ Add weekly hours'));
  click(buttonByText('+ Add weekly hours')); await sleep(40);
  check('BUSINESS: "+ Add weekly hours" restores the 7 days', content().hours.length === 7 && content().hours[0].day === 'Monday');

  console.log('\nCANVAS — every block is drawn in the editor (canonical renderer)');
  const CLS = { DIVIDER: 'cc-divider', CALLOUT: 'cc-callout', STEPS: 'cc-steps', COUNTERS: 'cc-counters', PROGRESS: 'cc-progress', TABLE: 'cc-table-block', COUNTDOWN: 'cc-countdown', TIMELINE: 'cc-timeline', LOGOS: 'cc-logos', TEAM: 'cc-team', BEFORE_AFTER: 'cc-ba', BUSINESS: 'cc-business' };
  for (const t of TYPES) {
    const b = addAndSelect(t);
    mount(React.createElement(DndContext, null, React.createElement(SortableContext, { items: [b.id] }, React.createElement(SortableBlock, { block: b }))));
    const el = await waitFor(() => doc.querySelector('.' + CLS[t]));
    check(`${t}: drawn in the canvas (.${CLS[t]}), without "Unknown element"`, !!el && !/Unknown element/.test(doc.body.innerHTML));
  }
  // before/after in the canvas: the slider must move the line even without the published <script>
  {
    const b = addAndSelect('BEFORE_AFTER');
    mount(React.createElement(DndContext, null, React.createElement(SortableContext, { items: [b.id] }, React.createElement(SortableBlock, { block: b }))));
    const range = await waitFor(() => doc.querySelector('.cc-ba-range'));
    const ba = doc.querySelector('.cc-ba');
    check('BEFORE_AFTER canvas: start position 50%', ba.style.getPropertyValue('--pos') === '50%');
    range.value = '80'; range.dispatchEvent(new w.Event('input', { bubbles: true }));
    check('BEFORE_AFTER canvas: moving the slider updates the position (faithful preview)', ba.style.getPropertyValue('--pos') === '80%', ba.style.getPropertyValue('--pos'));
    check('BEFORE_AFTER canvas: the block receives clicks (usable slider)', doc.querySelector('.cc-ba').parentElement.style.pointerEvents === 'auto');
  }
  // table/accordion as a control: static blocks don't capture the mouse (they get selected)
  {
    const b = addAndSelect('DIVIDER');
    mount(React.createElement(DndContext, null, React.createElement(SortableContext, { items: [b.id] }, React.createElement(SortableBlock, { block: b }))));
    await waitFor(() => doc.querySelector('.cc-divider'));
    check('DIVIDER canvas: does not capture the mouse (selects/drags normally)', doc.querySelector('.cc-divider').parentElement.style.pointerEvents === 'none');
  }

  // Every block of every starter template, in every tab, as admin: the panel must never crash.
  // Template blocks may have no "content" at all (e.g. SECTION/CONTAINER): a crash unmounts the whole app.
  console.log('\nSTARTERS — every template block opens every tab (admin)');
  {
    const starters = JSON.parse(readFileSync(path.join(PROJECT, '../canvascore-admin/starters.json'), 'utf8'));
    const tick = () => new Promise((r) => setTimeout(r, 0));
    const panelAlive = () => $$('button').some((x) => x.textContent.trim() === 'Advanced');
    for (const stt of starters) {
      const all = [];
      const walk = (bs) => { for (const b of bs || []) { all.push(b); walk(b.children); } };
      walk(stt.blocks);
      if (!all.length) continue;
      const broken = [];
      for (const b of all) {
        useStore.setState({ blocks: structuredClone(stt.blocks), selectedBlockId: b.id, userRole: 'admin', pastBlocks: [], futureBlocks: [], activePage: { id: 'p', title: 'T', slug: 't', layout: 'boxed' }, viewport: 'desktop', masters: [], templates: [], pages: [] });
        mount(React.createElement(PropertyPanel));
        await waitFor(panelAlive);
        // layout blocks (SECTION/CONTAINER/FLEX_ROW) have no Content tab
        const tabs = ['SECTION', 'CONTAINER', 'FLEX_ROW'].includes(b.type) ? ['Style', 'Advanced'] : ['Content', 'Style', 'Advanced'];
        for (const tab of tabs) {
          const btn = $$('button').find((x) => x.textContent.trim() === tab);
          if (!btn) { broken.push(`${b.id} ${b.type} (no ${tab} tab)`); break; }
          click(btn); await tick();
          if (!panelAlive()) { broken.push(`${b.id} ${b.type} (${tab})`); break; }
        }
      }
      check(`${stt.id}: all ${all.length} blocks open every tab`, broken.length === 0, broken.join(', '));
    }
    // a SECTION with no "content" is still editable from Advanced (the write creates content)
    const cs = starters.find((s) => s.id === 'coming-soon');
    useStore.setState({ blocks: structuredClone(cs.blocks), selectedBlockId: cs.blocks[0].id, userRole: 'admin' });
    mount(React.createElement(PropertyPanel));
    click(await waitFor(() => buttonByText('Advanced'))); await tick();
    click(await waitFor(() => buttonByText('Custom Code'))); await tick();
    const idInput = await waitFor(() => field('CSS ID'));
    if (idInput) { setValue(idInput, 'launch'); await tick(); }
    const saved = st().blocks[0];
    check('content-less SECTION: setting the CSS ID in Advanced saves it', saved.content?.customId === 'launch' && saved.children.length === 1, JSON.stringify(saved.content));
  }
} catch (e) {
  failedRun = true; fails++; total++;
  console.error('  ✗ EXCEPTION: ' + ((e && e.stack) || e).toString().split('\n').slice(0, 6).join(' | '));
}

try { root?.unmount(); } catch { /* noop */ }
await vite.close();
console.log(`\n${fails === 0 ? 'PANELS UI OK' : fails + ' checks failed'} (${total} checks)${failedRun ? ' — aborted by an exception' : ''}`);
process.exit(fails === 0 ? 0 : 1);
