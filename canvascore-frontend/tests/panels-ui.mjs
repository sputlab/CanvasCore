// tests/panels-ui.mjs
// Test di INTEGRAZIONE dell'editor sui 12 nuovi blocchi, con i componenti VERI montati in jsdom
// (caricati con Vite in modalità SSR): addBlock → PropertyPanel → modifica dei campi → store,
// e SortableBlock (canvas) per ogni blocco.
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

// ---- ambiente jsdom come "window" globale
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
// campo associato a un'etichetta: <div><label>testo</label><input/select/textarea></div>
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
  console.log('\nADD BLOCK — i default di blocks.json arrivano nell\'editor');
  for (const t of TYPES) {
    const b = addAndSelect(t);
    const def = blockDefs.types[t];
    check(`${t}: addBlock crea il blocco con il contenuto di default`, b.type === t && JSON.stringify(b.content) === JSON.stringify(def.content));
  }

  console.log('\nPANNELLI — montati e modificabili');
  for (const t of TYPES) {
    addAndSelect(t);
    mount(React.createElement(PropertyPanel));
    const ok = await waitFor(() => $$('button').some((b) => b.textContent.includes(PANEL[t])));
    check(`${t}: il pannello "${PANEL[t]}" compare (nessun errore di rendering)`, !!ok);
  }

  // --- interazioni per tipo
  addAndSelect('DIVIDER'); mount(React.createElement(PropertyPanel)); await waitFor(() => field('Style'));
  check('DIVIDER: con "line" non c\'è il campo altezza', !field('Height px'));
  setValue(field('Style'), 'wave'); await sleep(40);
  check('DIVIDER: cambiare stile aggiorna lo store', content().style === 'wave');
  check('DIVIDER: con "wave" compaiono altezza e capovolgi, scompare la larghezza', !!field('Height px') && !!checkbox('Flip vertically') && !field('Width %'));
  click(checkbox('Flip vertically')); await sleep(40);
  check('DIVIDER: la casella aggiorna lo store', content().flip === true);
  setValue(field('Color'), '#ff0000'); await sleep(40);
  check('DIVIDER: il colore aggiorna lo store', content().color === '#ff0000');

  addAndSelect('CALLOUT'); mount(React.createElement(PropertyPanel)); await waitFor(() => field('Text'));
  setValue(field('Text'), '<p>nuovo</p>'); setValue(field('Type'), 'danger'); await sleep(40);
  check('CALLOUT: testo e tipo aggiornano lo store', content().text === '<p>nuovo</p>' && content().variant === 'danger');

  addAndSelect('STEPS'); mount(React.createElement(PropertyPanel)); await waitFor(() => buttonByText('+ Add step'));
  click(buttonByText('+ Add step')); await sleep(40);
  check('STEPS: "+ Add step" aggiunge un passo', content().items.length === 4);
  const firstTitle = content().items[0].title;
  click($$('button[title="Move down"]')[0]); await sleep(40);
  check('STEPS: "Move down" scambia i primi due passi', content().items[1].title === firstTitle);
  click($$('button[title="Remove"]')[0]); await sleep(40);
  check('STEPS: "Remove" elimina il passo', content().items.length === 3);
  check('STEPS: i pulsanti ai bordi sono disattivati (non si esce dalla lista)', $$('button[title="Move up"]')[0].disabled === true);

  addAndSelect('COUNTERS'); mount(React.createElement(PropertyPanel)); await waitFor(() => buttonByText('+ Add counter'));
  const valInput = field('Value');
  setValue(valInput, '250'); await sleep(40);
  check('COUNTERS: il valore è salvato come NUMERO (non stringa)', content().items[0].value === 250);
  setValue(valInput, ''); await sleep(40);
  check('COUNTERS: campo svuotato → stringa vuota (il compiler la tratta come 0)', content().items[0].value === '');
  click(buttonByText('+ Add counter')); await sleep(40);
  check('COUNTERS: aggiunta di un contatore', content().items.length === 5);

  addAndSelect('PROGRESS'); mount(React.createElement(PropertyPanel)); await waitFor(() => buttonByText('+ Add bar'));
  setValue(field('Value %'), '42'); await sleep(40);
  check('PROGRESS: valore percentuale numerico', content().items[0].value === 42);
  click(buttonByText('+ Add bar')); await sleep(40);
  check('PROGRESS: aggiunta di una barra', content().items.length === 4);

  addAndSelect('TABLE'); mount(React.createElement(PropertyPanel)); await waitFor(() => field('Data'));
  setValue(field('Data'), 'A | B\n1 | 2'); await sleep(40);
  check('TABLE: i dati incollati finiscono nello store così come sono', content().data === 'A | B\n1 | 2');

  addAndSelect('COUNTDOWN'); mount(React.createElement(PropertyPanel)); await waitFor(() => field('Target date'));
  setValue(field('Target date'), '2031-02-03T04:05'); setValue(field('Time zone'), '+02:00'); await sleep(40);
  check('COUNTDOWN: data/ora e fuso aggiornano lo store nel formato atteso dal compiler', content().datetime === '2031-02-03T04:05' && content().utcOffset === '+02:00');
  check('COUNTDOWN: il menu dei fusi contiene "ora locale del visitatore" e offset da -12:00 a +14:00', (() => { const o = [...field('Time zone').options].map((x) => x.value); return o[0] === 'local' && o.includes('-12:00') && o.includes('+14:00') && o.includes('+05:30'); })());
  setValue(field('When it ends'), 'hide'); await sleep(40);
  check('COUNTDOWN: con "hide" scompare il campo messaggio', content().endAction === 'hide' && !field('Message'));

  addAndSelect('TIMELINE'); mount(React.createElement(PropertyPanel)); await waitFor(() => buttonByText('+ Add event'));
  click(buttonByText('+ Add event')); await sleep(40);
  check('TIMELINE: aggiunta di un evento', content().items.length === 4);

  addAndSelect('LOGOS'); mount(React.createElement(PropertyPanel)); await waitFor(() => buttonByText('+ Add empty slot'));
  click(buttonByText('+ Add empty slot')); await sleep(40);
  check('LOGOS: aggiunta di uno slot vuoto', content().logos.length === 6 && content().logos[5].src === '');
  check('LOGOS: il pulsante "da media" apre il selettore (non genera errori)', (() => { try { click(buttonByText('+ Add logo from media')); return true; } catch { return false; } })());
  await sleep(60);

  addAndSelect('TEAM'); mount(React.createElement(PropertyPanel)); await waitFor(() => buttonByText('+ Add member'));
  click(buttonByText('+ Add member')); await sleep(40);
  check('TEAM: aggiunta di un membro con tutti i campi previsti', content().members.length === 4 && ['name', 'role', 'bio', 'photo', 'email', 'linkedin', 'twitter', 'website'].every((k) => k in content().members[3]));

  addAndSelect('BEFORE_AFTER'); mount(React.createElement(PropertyPanel)); await waitFor(() => $$('button').some((b) => b.textContent.includes('Before / After')));
  const imgs = $$('input[placeholder="Image URL"]');
  setValue(imgs[0], 'https://x.example/prima.jpg'); setValue(imgs[1], 'https://x.example/dopo.jpg'); await sleep(40);
  check('BEFORE_AFTER: le due immagini vanno su before/after (senza perdere alt e label)', content().before.src === 'https://x.example/prima.jpg' && content().after.src === 'https://x.example/dopo.jpg' && content().before.label === 'Before' && content().after.label === 'After');

  addAndSelect('BUSINESS'); mount(React.createElement(PropertyPanel)); await waitFor(() => field('Business name'));
  setValue(field('Business name'), 'Bar Roma'); await sleep(40);
  check('BUSINESS: il nome aggiorna lo store', content().name === 'Bar Roma');
  click($$('button').find((b) => b.textContent.includes('Opening Hours'))); await sleep(60);
  const times = $$('input[type="time"]');
  check('BUSINESS: 7 righe di orari (14 campi ora)', times.length === 14);
  setValue(times[0], '07:30'); await sleep(40);
  check('BUSINESS: modificare l\'apertura del lunedì aggiorna solo quella riga', content().hours[0].open === '07:30' && content().hours[1].open === '09:00' && content().hours.length === 7);
  const closedBoxes = $$('input[type="checkbox"][title="Closed"]');
  check('BUSINESS: domenica segnata come chiusa, con i campi ora disattivati', closedBoxes[6].checked === true && times[12].disabled === true);
  click(closedBoxes[0]); await sleep(40);
  check('BUSINESS: spuntare "chiuso" sul lunedì', content().hours[0].closed === true);
  click(buttonByText('Remove opening hours')); await sleep(40);
  check('BUSINESS: "Remove opening hours" svuota gli orari', content().hours.length === 0 && !!buttonByText('+ Add weekly hours'));
  click(buttonByText('+ Add weekly hours')); await sleep(40);
  check('BUSINESS: "+ Add weekly hours" ripristina i 7 giorni', content().hours.length === 7 && content().hours[0].day === 'Monday');

  console.log('\nCANVAS — ogni blocco si disegna nell\'editor (renderer canonico)');
  const CLS = { DIVIDER: 'cc-divider', CALLOUT: 'cc-callout', STEPS: 'cc-steps', COUNTERS: 'cc-counters', PROGRESS: 'cc-progress', TABLE: 'cc-table-block', COUNTDOWN: 'cc-countdown', TIMELINE: 'cc-timeline', LOGOS: 'cc-logos', TEAM: 'cc-team', BEFORE_AFTER: 'cc-ba', BUSINESS: 'cc-business' };
  for (const t of TYPES) {
    const b = addAndSelect(t);
    mount(React.createElement(DndContext, null, React.createElement(SortableContext, { items: [b.id] }, React.createElement(SortableBlock, { block: b }))));
    const el = await waitFor(() => doc.querySelector('.' + CLS[t]));
    check(`${t}: disegnato nel canvas (.${CLS[t]}), senza "Unknown element"`, !!el && !/Unknown element/.test(doc.body.innerHTML));
  }
  // prima/dopo nel canvas: il cursore deve muovere la linea anche senza lo <script> pubblicato
  {
    const b = addAndSelect('BEFORE_AFTER');
    mount(React.createElement(DndContext, null, React.createElement(SortableContext, { items: [b.id] }, React.createElement(SortableBlock, { block: b }))));
    const range = await waitFor(() => doc.querySelector('.cc-ba-range'));
    const ba = doc.querySelector('.cc-ba');
    check('BEFORE_AFTER canvas: posizione iniziale 50%', ba.style.getPropertyValue('--pos') === '50%');
    range.value = '80'; range.dispatchEvent(new w.Event('input', { bubbles: true }));
    check('BEFORE_AFTER canvas: spostare il cursore aggiorna la posizione (anteprima fedele)', ba.style.getPropertyValue('--pos') === '80%', ba.style.getPropertyValue('--pos'));
    check('BEFORE_AFTER canvas: il blocco riceve i clic (cursore utilizzabile)', doc.querySelector('.cc-ba').parentElement.style.pointerEvents === 'auto');
  }
  // tabella/accordion come controllo: i blocchi statici non intercettano il mouse (si selezionano)
  {
    const b = addAndSelect('DIVIDER');
    mount(React.createElement(DndContext, null, React.createElement(SortableContext, { items: [b.id] }, React.createElement(SortableBlock, { block: b }))));
    await waitFor(() => doc.querySelector('.cc-divider'));
    check('DIVIDER canvas: non intercetta il mouse (si seleziona/trascina normalmente)', doc.querySelector('.cc-divider').parentElement.style.pointerEvents === 'none');
  }
} catch (e) {
  failedRun = true; fails++; total++;
  console.error('  ✗ ECCEZIONE: ' + ((e && e.stack) || e).toString().split('\n').slice(0, 6).join(' | '));
}

try { root && root.unmount(); } catch { /* noop */ }
await vite.close();
console.log(`\n${fails === 0 ? 'PANNELLI UI OK' : fails + ' controlli falliti'} (${total} controlli)${failedRun ? ' — interrotto da un\'eccezione' : ''}`);
process.exit(fails === 0 ? 0 : 1);
