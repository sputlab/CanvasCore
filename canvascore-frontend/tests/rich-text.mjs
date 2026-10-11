// tests/rich-text.mjs
// The rich text editor (src/editor/), with the real components mounted in jsdom (Vite SSR):
//  - paste cleanup: Word, Google Docs and web pages keep structure, lose theme-fighting formatting;
//  - the canvas edits the block's OWN HTML in place: selected and unselected render the same elements
//    (so nothing moves when you start typing), and the toolbar floats outside the block;
//  - one toolbar everywhere: canvas and property panel, 'basic' for titles and 'full' for body text;
//  - edits are tidied and saved on blur; tables and links work on the DOM.
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
globalThis.alert = () => {}; globalThis.confirm = () => true;
globalThis.fetch = async () => new Response(JSON.stringify({ brandColor: '#ff5500' }), { status: 200 });
globalThis.IS_REACT_ACT_ENVIRONMENT = false;
globalThis.innerWidth = 1280; globalThis.innerHeight = 800;
w.document.execCommand = () => false; // jsdom has no editing commands: the editor's own fallbacks are exercised

const vite = await createServer({
  root: PROJECT, configFile: false, logLevel: 'error', appType: 'custom', clearScreen: false,
  server: { middlewareMode: true, hmr: false, watch: null },
  plugins: [react()],
  define: { __APP_VERSION__: '"test"', __APP_BUILD__: '0', __BLOCK_DEFS__: JSON.stringify(blockDefs) },
  optimizeDeps: { noDiscovery: true, include: [] },
});

const doc = w.document;
const $$ = (sel, root = doc) => [...root.querySelectorAll(sel)];
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const focus = (el) => { el.focus(); el.dispatchEvent(new w.FocusEvent('focusin', { bubbles: true })); };
const blurTo = (el, to = null) => { el.dispatchEvent(new w.FocusEvent('focusout', { bubbles: true, relatedTarget: to })); el.blur(); };
const caretIn = (node, offset = 0) => { const r = doc.createRange(); r.setStart(node, offset); r.collapse(true); const s = w.getSelection(); s.removeAllRanges(); s.addRange(r); };
const paste = (el, data) => {
  const e = new w.Event('paste', { bubbles: true, cancelable: true });
  e.clipboardData = { getData: (t) => data[t] || '' };
  el.dispatchEvent(e);
  return e;
};

const { cleanPastedHtml, textToHtml, tidyHtml } = await vite.ssrLoadModule('/src/editor/cleanHtml.js');
const { tableHtml, tableOp, TOOLSETS } = await vite.ssrLoadModule('/src/editor/commands.js');
const { renderBlock } = await vite.ssrLoadModule('/src/render/renderBlock.mjs');
const { useStore } = await vite.ssrLoadModule('/src/store/useStore.js');
const SortableBlock = (await vite.ssrLoadModule('/src/components/SortableBlock.jsx')).default;
const PropertyPanel = (await vite.ssrLoadModule('/src/components/PropertyPanel.jsx')).default;
const { createRoot } = await import('react-dom/client');
const React = await import('react');
const { DndContext } = await import('@dnd-kit/core');
const { SortableContext } = await import('@dnd-kit/sortable');

let root = null;
const mount = (el) => { if (root) root.unmount(); doc.getElementById('root').innerHTML = ''; root = createRoot(doc.getElementById('root')); root.render(el); };
const st = () => useStore.getState();

let failedRun = false;
try {
  console.log('PASTE CLEANUP');
  {
    const word = `<!--[if gte mso 9]><xml><w:WordDocument></w:WordDocument></xml><![endif]-->
      <p class="MsoNormal" style="margin-bottom:0cm;line-height:normal"><b><span style="font-size:14.0pt;font-family:'Calibri',sans-serif;color:#1F3864">Quarterly report</span></b><o:p></o:p></p>
      <p class="MsoNormal">&nbsp;<o:p></o:p></p>
      <p class="MsoListParagraphCxSpFirst" style="text-indent:-18.0pt;mso-list:l0 level1 lfo1"><span style="font-family:Symbol;mso-list:Ignore">·<span style="font:7.0pt 'Times New Roman'">&nbsp;&nbsp;</span></span>First point</p>
      <p class="MsoListParagraphCxSpLast" style="text-indent:-18.0pt;mso-list:l0 level1 lfo1"><span style="font-family:Symbol;mso-list:Ignore">·<span>&nbsp;</span></span>Second <i>point</i></p>
      <p class="MsoNormal" align="center" style="text-align:center"><span style="color:red">Centered</span></p>`;
    const out = cleanPastedHtml(word);
    check('Word: fonts, sizes, colors, classes and <o:p> are removed', !/font-family|font-size|color|class=|o:p|mso|MsoNormal/i.test(out), out);
    check('Word: bold is kept as <strong>', out.includes('<strong>Quarterly report</strong>'), out);
    check('Word: list paragraphs become a real <ul> without the bullet characters', /<ul><li>First point<\/li><li>Second <em>point<\/em><\/li><\/ul>/.test(out), out);
    check('Word: empty &nbsp; paragraphs are dropped', !/<p>(&nbsp;|\s)*<\/p>/.test(out), out);
    check('Word: alignment is kept (text-align only)', out.includes('<p style="text-align:center;">Centered</p>'), out);
    check('Word: conditional comments / XML are gone', !/xml|WordDocument|\[if/i.test(out));

    const gdocs = `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1234"><h2 dir="ltr" style="line-height:1.38;margin-top:18pt"><span style="font-size:16pt;font-family:Arial;color:#000000;font-weight:400">Heading</span></h2><p dir="ltr" style="line-height:1.38"><span style="font-size:11pt;font-family:Arial;font-weight:700">Bold</span><span style="font-size:11pt;font-family:Arial;font-weight:400"> and </span><span style="font-size:11pt;font-family:Arial;font-style:italic;text-decoration:underline">underlined italic</span></p></b><br class="Apple-interchange-newline">`;
    const g = cleanPastedHtml(gdocs);
    check('Google Docs: the docs-internal-guid wrapper is not turned into bold', !g.startsWith('<strong>') && !g.includes('docs-internal'), g);
    check('Google Docs: heading kept, inline styles removed', g.includes('<h2>Heading</h2>'), g);
    check('Google Docs: CSS bold/italic/underline become <strong>/<em>/<u>', g.includes('<strong>Bold</strong>') && /<em><u>underlined italic<\/u><\/em>|<u><em>underlined italic<\/em><\/u>/.test(g), g);
    check('Google Docs: no dir/line-height/meta/Apple newline left', !/dir=|line-height|meta|Apple/.test(g), g);

    const web = `<div class="post" style="color:#333;font-family:Georgia" onclick="steal()"><script>alert(1)</script><style>p{}</style>
      <div>Intro <span style="font-weight:bold">text</span> with <a href="javascript:alert(1)" onclick="x()">bad link</a> and
      <a href="https://example.com" target="_blank" class="btn" rel="nofollow">good link</a>.</div>
      <img src="data:image/png;base64,AAAA" alt="inline"><img src="https://example.com/a.jpg" alt="ok" width="900" class="wp-image">
      <table class="grid" border="1"><tr><td style="background:#eee;text-align:right" colspan="2">Cell</td></tr></table>
      <iframe src="https://evil"></iframe><button>Buy</button></div>`;
    const x = cleanPastedHtml(web);
    check('web: scripts, styles, iframes and buttons are removed', !/<script|<style|<iframe|<button|alert\(1\)|Buy/.test(x), x);
    check('web: no event handlers, classes or theme styles', !/onclick|class=|font-family|color:#333/.test(x), x);
    check('web: javascript: links lose the link but keep the text', !x.includes('javascript') && x.includes('bad link'), x);
    check('web: new-tab links get rel="noopener" (and keep nofollow)', /<a href="https:\/\/example.com" target="_blank" rel="noopener nofollow">good link<\/a>/.test(x), x);
    check('web: pasted data: images are dropped, real images kept responsive', !x.includes('data:image') && x.includes('<img src="https://example.com/a.jpg" alt="ok" style="max-width:100%; height:auto;">'), x);
    const td = (x.match(/<td[^>]*>Cell<\/td>/) || [''])[0];
    check('web: tables keep structure and colspan, with the editor table style', /<table style="width:100%;[^"]*"><tbody><tr><td[^>]*>Cell<\/td><\/tr><\/tbody><\/table>/.test(x)
      && td.includes('colspan="2"') && td.includes('border:1px solid') && td.includes('text-align:right') && !td.includes('#eee'), x);
    check('web: a div of inline content becomes a paragraph', /<p>Intro <strong>text<\/strong>/.test(x), x);

    check('plain text: blank lines → paragraphs, single newlines → <br>, HTML escaped', textToHtml('One\nline <b>\n\nTwo') === '<p>One<br>line &lt;b&gt;</p><p>Two</p>');
    check('plain text in a title: one line, no paragraphs', textToHtml('A\nB', { inline: true }) === 'A B');
    check('tidy: <b>/<i> → <strong>/<em>, empty spans and trailing <br> removed', tidyHtml('<p><b>a</b> <i>b</i><span>c</span><br></p><br>') === '<p><strong>a</strong> <em>b</em>c</p>');
    check('tidy: a field with only <br> / empty paragraphs is saved as empty', tidyHtml('<p><br></p>') === '' && tidyHtml('<br>') === '' && tidyHtml('<p><img src="x.jpg"></p>') !== '');
  }

  console.log('\nTABLES & TOOLBARS');
  {
    const host = doc.createElement('div'); host.contentEditable = 'true'; doc.body.appendChild(host);
    host.innerHTML = tableHtml(2, 3, true);
    check('insert table: 2×3 with a header row and the default style', host.querySelectorAll('tr').length === 2 && host.querySelectorAll('th').length === 3 && host.querySelectorAll('td').length === 3 && host.querySelector('table').getAttribute('style').includes('border-collapse'));
    caretIn(host.querySelector('td'));
    tableOp(host, 'row-below'); check('table: add row below', host.querySelectorAll('tr').length === 3);
    tableOp(host, 'col-right'); check('table: add column right', host.querySelectorAll('tr')[0].children.length === 4);
    tableOp(host, 'del-col'); check('table: delete column', host.querySelectorAll('tr')[0].children.length === 3);
    tableOp(host, 'header'); check('table: toggle header row (off)', host.querySelectorAll('th').length === 0);
    tableOp(host, 'del-row'); check('table: delete row', host.querySelectorAll('tr').length === 2);
    tableOp(host, 'del-table'); check('table: delete table', !host.querySelector('table'));
    host.remove();
    check('basic toolbar (titles) has no lists, images or tables', !['ul', 'ol', 'image', 'table', 'hr'].some((t) => TOOLSETS.basic.includes(t)));
    check('full toolbar has every feature', ['block', 'font', 'size', 'bold', 'italic', 'underline', 'strike', 'color', 'highlight', 'align', 'ul', 'ol', 'quote', 'hr', 'link', 'image', 'table', 'clear', 'undo', 'redo', 'source'].every((t) => TOOLSETS.full.includes(t)));
  }

  console.log('\nCANVAS — editing in place keeps the published layout');
  const strip = (html) => html.replace(/ data-cc-field="[^"]*"| contenteditable="true"| data-cc-placeholder="[^"]*"/g, '');
  for (const type of ['TEXT', 'IMAGE_TEXT', 'FORM']) {
    const b = { id: 'x1', type, styles: blockDefs.types[type].styles || {}, content: { ...blockDefs.types[type].content, text: '<p>Hello</p>', title: '<h3>Hi</h3>' } };
    check(`${type}: editable markup = published markup (only editing attributes added)`, strip(renderBlock(b, { fields: true })) === renderBlock(b));
  }
  {
    const b = { id: 'h1', type: 'HERO', styles: blockDefs.types.HERO.styles || {}, content: { ...blockDefs.types.HERO.content, title: '<h1>Big</h1>', subtitle: '<p>Small</p>' } };
    const ed = strip(renderBlock(b, { fields: true }));
    check('HERO: same markup, the title only gets a bare wrapper (no class, no style)', ed.replace('<div><h1>Big</h1></div>', '<h1>Big</h1>') === renderBlock(b));
  }

  const textBlock = { id: 't1', type: 'TEXT', styles: { padding: '24px', fontSize: '18px' }, content: { text: '<h2>Title</h2><p>Body text</p>' } };
  useStore.setState({ blocks: [textBlock], selectedBlockId: null, viewport: 'desktop', activePage: { id: 'p', title: 'T', slug: 't', layout: 'boxed' }, pages: [{ id: 'p2', title: 'About', clean_slug: 'about' }], masters: [] });
  const Canvasish = () => {
    const blocks = useStore((s) => s.blocks);
    return React.createElement('div', { className: 'cc-canvas' }, React.createElement(DndContext, null,
      React.createElement(SortableContext, { items: blocks.map((b) => b.id) }, blocks.map((b) => React.createElement(SortableBlock, { key: b.id, block: b })))));
  };
  mount(React.createElement(Canvasish));
  const unselected = await waitFor(() => doc.querySelector('.cc-canvas .cc-text'));
  const before = unselected.outerHTML;
  st().setSelectedBlockId('t1');
  const field = await waitFor(() => doc.querySelector('.cc-canvas [data-cc-field="text"]'));
  check('selecting a text block makes its OWN .cc-text element editable (no editor box around it)', !!field && field.classList.contains('cc-text') && field.getAttribute('contenteditable') === 'true');
  check('…with exactly the same markup as before selecting (padding, font size, children)', !!field && strip(field.outerHTML) === before, field && field.outerHTML.slice(0, 160));
  check('no Jodit anywhere', !doc.querySelector('.jodit, .jodit-container, [class*="jodit"]'));
  check('no toolbar until the text is focused', !doc.querySelector('[data-cc-rte-toolbar]'));
  focus(field);
  const bar = await waitFor(() => doc.querySelector('[data-cc-rte-toolbar]'));
  check('focusing the text shows the toolbar', !!bar);
  check('the toolbar floats (position: fixed, outside the block): it takes no space in the page', !!bar && bar.style.position === 'fixed' && !field.closest('.cc-canvas').contains(bar));
  check('TEXT uses the full toolbar (table, image, lists)', !!bar && ['Table', 'Image', 'Bulleted list', 'Numbered list', 'Quote', 'Horizontal line', 'Edit HTML'].every((l) => bar.querySelector(`[aria-label="${l}"]`)));

  // paste from Word into the text
  caretIn(field.querySelector('p').firstChild, 4);
  const ev = paste(field, { 'text/html': '<p class="MsoNormal"><span style="font-family:Calibri;font-size:20pt">Pasted <b>bold</b></span><o:p></o:p></p>', 'text/plain': 'Pasted bold' });
  check('paste is intercepted and cleaned', ev.defaultPrevented && field.innerHTML.includes('Pasted <strong>bold</strong>') && !/Calibri|20pt|MsoNormal/.test(field.innerHTML), field.innerHTML);
  check('nothing is saved while typing (no re-render under the caret)', st().blocks[0].content.text === '<h2>Title</h2><p>Body text</p>');
  blurTo(field);
  await sleep(30);
  const saved = st().blocks[0].content.text;
  check('leaving the text saves it, tidied', saved.includes('Pasted <strong>bold</strong>') && !saved.includes('contenteditable'), saved);
  check('the toolbar closes when the text loses focus', !(await waitFor(() => doc.querySelector('[data-cc-rte-toolbar]'), 150)));

  // Ctrl+Shift+V: plain text
  const f2 = doc.querySelector('.cc-canvas [data-cc-field="text"]');
  focus(f2); caretIn(f2.querySelector('h2').firstChild, 0);
  f2.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'V', ctrlKey: true, shiftKey: true, bubbles: true }));
  paste(f2, { 'text/html': '<b>rich</b>', 'text/plain': 'plain ' });
  check('Ctrl/Cmd+Shift+V pastes plain text, into the current line (no nested paragraph)', f2.querySelector('h2').textContent.startsWith('plain') && !f2.querySelector('h2 p') && !f2.innerHTML.includes('rich'), f2.innerHTML);
  blurTo(f2); await sleep(30);

  // the HERO uses the basic toolbar on both fields
  const hero = { id: 'h2', type: 'HERO', styles: { ...blockDefs.types.HERO.styles }, content: { ...blockDefs.types.HERO.content, title: '<h1>Hero</h1>', subtitle: '<p>Sub</p>' } };
  useStore.setState({ blocks: [hero], selectedBlockId: 'h2' });
  const ht = await waitFor(() => doc.querySelector('.cc-canvas [data-cc-field="title"]'));
  check('HERO: title and subtitle are editable in place', !!ht && !!doc.querySelector('.cc-canvas [data-cc-field="subtitle"]'));
  focus(ht);
  const hbar = await waitFor(() => doc.querySelector('[data-cc-rte-toolbar]'));
  check('HERO title: basic toolbar (styles, bold, colors, link — no tables or images)', !!hbar && !!hbar.querySelector('[aria-label="Text style"]') && !!hbar.querySelector('[aria-label="Link (Ctrl+K)"]') && !hbar.querySelector('[aria-label="Table"]') && !hbar.querySelector('[aria-label="Image"]'));
  // the link dialog: page list + options
  click(hbar.querySelector('[aria-label="Link (Ctrl+K)"]'));
  const dlg = await waitFor(() => hbar.querySelector('[role="dialog"][aria-label="Link"]'));
  check('link dialog: address, link to a page, new tab and nofollow', !!dlg && !!dlg.querySelector('[aria-label="Link address"]') && [...dlg.querySelectorAll('option')].some((o) => o.textContent === 'About' && o.value === '{{BASE_URL}}about/') && /new tab/.test(dlg.textContent) && /Nofollow/.test(dlg.textContent));
  click(hbar.querySelector('[aria-label="Text color"]'));
  const cdlg = await waitFor(() => hbar.querySelector('[role="dialog"][aria-label="Text color"]'));
  check('color palette offers the site color (follows the brand color)', !!cdlg && !!cdlg.querySelector('[aria-label="Site color"]'));
  blurTo(ht); await sleep(30);

  console.log('\nPROPERTY PANEL — same editor');
  mount(React.createElement(PropertyPanel));
  const accordion = await waitFor(() => $$('button').find((b) => b.textContent.includes('Background & Titles')));
  if (accordion) click(accordion);
  const boxes = await waitFor(() => { const b = $$('[role="textbox"][contenteditable]'); return b.length >= 2 ? b : null; });
  check('HERO panel: title and subtitle use the rich text field', !!boxes && boxes[0].getAttribute('aria-label') === 'Main title' && boxes[1].getAttribute('aria-label') === 'Subtitle');
  check('…showing the current content', !!boxes && boxes[0].innerHTML === '<h1>Hero</h1>');
  if (boxes) {
    focus(boxes[0]);
    const pbar = await waitFor(() => doc.querySelector('[data-cc-rte-toolbar]'));
    check('panel field: the same toolbar, docked above the box (not floating)', !!pbar && pbar.style.position === 'relative' && !!pbar.querySelector('[aria-label="Text style"]'));
    boxes[0].innerHTML = '<h1>Hero <b>edited</b></h1>';
    blurTo(boxes[0]);
    await sleep(30);
    check('panel field: saved on blur, tidied', st().blocks[0].content.title === '<h1>Hero <strong>edited</strong></h1>', st().blocks[0].content.title);
  }
  check('no Jodit in the panel', !doc.querySelector('[class*="jodit"]'));
} catch (e) {
  failedRun = true; fails++; total++;
  console.error('  ✗ EXCEPTION: ' + ((e && e.stack) || e).toString().split('\n').slice(0, 6).join(' | '));
}

try { root?.unmount(); } catch { /* noop */ }
await vite.close();
console.log(`\n${fails === 0 ? 'RICH TEXT OK' : fails + ' checks failed'} (${total} checks)${failedRun ? ' — aborted by an exception' : ''}`);
process.exit(fails === 0 ? 0 : 1);
