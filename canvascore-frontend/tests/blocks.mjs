// tests/blocks.mjs
// BEHAVIORAL tests for the Accordion, Tabs, Pricing and Gallery (lightbox) blocks.
// Parity (parity.mjs) checks that editor and compiler produce the same structure;
// here we check that the HTML produced by the PHP compiler *actually works*:
//  - Tabs switch panels (CSS logic with radio :checked, evaluated with a selector engine);
//  - the lightbox opens/closes/navigates (script run in jsdom);
//  - rich content is sanitized; exclusive/multiple accordion; Pricing URLs.

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { JSDOM } from 'jsdom';

const phpScript = fileURLToPath(new URL('./render_php.php', import.meta.url));
const render = (block) => execFileSync('php', [phpScript], { input: JSON.stringify(block) }).toString();

let fails = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log('  ✓ ' + name);
  else { fails++; console.error('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
};

// ---------------------------------------------------------------- TABS
console.log('TABS');
{
  const items = [{ title: 'Uno', content: '<p>a</p>' }, { title: 'Due', content: '<p>b</p>' }, { title: 'Tre', content: '<p>c</p>' }];
  for (const variant of ['underline', 'pills']) {
    const html = render({ id: 'tb', type: 'TABS', styles: {}, content: { variant, items } });
    const $ = load(`<div id="__r">${html}</div>`, null, false);
    const css = $('style').text();
    // "visible panel" and "active tab" rules emitted for each index
    const panelRules = [...css.matchAll(/([^{}]+:checked ~ \.cc-tab-panels \.cc-tab-panel:nth-child\(\d+\))\{display:block\}/g)].map(m => m[1].trim());
    const tabRules = [...css.matchAll(/([^{}]+:checked ~ \.cc-tab-bar \.cc-tab:nth-child\(\d+\))\{[^}]*\}/g)].map(m => m[1].trim());
    check(`${variant}: one panel rule and one tab rule per tab`, panelRules.length === 3 && tabRules.length === 3, `${panelRules.length}/${tabRules.length}`);
    check(`${variant}: by default only the first radio is checked`, $('input.cc-tab-input[checked]').length === 1 && $('input.cc-tab-input').first().is('[checked]'));
    // simulate a click on each tab: move "checked" and verify WHICH ELEMENTS the CSS rules select
    // (knowing that a rule fires is not enough: it must select the right panel/tab)
    const panels = $('.cc-tab-panel').toArray();
    const labels = $('label.cc-tab').toArray();
    let ok = true, detail = '';
    for (let k = 0; k < 3; k++) {
      $('input.cc-tab-input').removeAttr('checked');
      $('input.cc-tab-input').eq(k).attr('checked', 'checked');
      const shownPanels = panelRules.flatMap(sel => $(sel).toArray());
      const activeTabs = tabRules.flatMap(sel => $(sel).toArray());
      const okPanel = shownPanels.length === 1 && shownPanels[0] === panels[k];
      const okTab = activeTabs.length === 1 && activeTabs[0] === labels[k];
      if (!okPanel || !okTab) { ok = false; detail += `tab ${k + 1}: panel shown=${shownPanels.map(e => panels.indexOf(e) + 1)} active tab=${activeTabs.map(e => labels.indexOf(e) + 1)}; `; }
    }
    check(`${variant}: selecting tab k shows exactly panel k and tab k`, ok, detail);
    check(`${variant}: each label points to its own radio (for/id)`, $('label.cc-tab').toArray().every((l, i) => $(l).attr('for') === $('input.cc-tab-input').eq(i).attr('id')));
    check(`${variant}: panels are hidden by default`, /\.cc-tab-panel\{display:none\}/.test(css));
  }
}

// ---------------------------------------------------------------- SANITIZATION (Accordion + Tabs)
console.log('SANITIZATION of rich content');
{
  const evil = '<p onclick="steal()">ok</p><script>alert(1)</script><a href="javascript:alert(2)">x</a><img src=x onerror="alert(3)">';
  for (const type of ['ACCORDION', 'TABS']) {
    const html = render({ id: 'sx', type, styles: {}, content: { items: [{ title: 'T', content: evil }] } });
    check(`${type}: <script>, on* and javascript: removed`, !/<script|onclick|onerror|javascript:/i.test(html), html.match(/<script|onclick|onerror|javascript:/i)?.[0]);
    check(`${type}: legitimate text is kept`, html.includes('ok'));
  }
  const t = render({ id: 'sy', type: 'TABS', styles: {}, content: { items: [{ title: '<b>x</b>"&', content: '' }] } });
  check('TABS: the title is escaped', t.includes('&lt;b&gt;x&lt;/b&gt;') && !t.includes('<b>x</b>'));
}

// ---------------------------------------------------------------- ACCORDION
console.log('ACCORDION');
{
  const items = [{ title: 'A', content: '<p>1</p>' }, { title: 'B', content: '<p>2</p>' }];
  const ex = load(`<div>${render({ id: 'ac', type: 'ACCORDION', styles: {}, content: { allowMultiple: false, openFirst: true, items } })}</div>`, null, false);
  check('exclusive: all <details> share the same name', ex('details[name="ac"]').length === 2);
  check('openFirst: only the first one is open', ex('details[open]').length === 1 && ex('details').first().is('[open]'));
  const mu = load(`<div>${render({ id: 'ac', type: 'ACCORDION', styles: {}, content: { allowMultiple: true, openFirst: false, items } })}</div>`, null, false);
  check('multiple: no name (several items can be open)', mu('details[name]').length === 0);
  check('multiple + openFirst=false: no item open', mu('details[open]').length === 0);
  const none = render({ id: 'ac', type: 'ACCORDION', styles: {}, content: { icon: 'none', items } });
  check('icon=none: no icon', !none.includes('cc-acc-icon" aria-hidden'));
}

// ---------------------------------------------------------------- PRICING
console.log('PRICING');
{
  const plan = (n, extra = {}) => ({ name: 'P' + n, price: '$' + n, period: '/mo', description: '', features: ['f'], buttonText: 'Go', buttonUrl: '#', highlighted: false, badge: '', ...extra });
  const cols = (n, columns = 0) => render({ id: 'pr', type: 'PRICING', styles: {}, content: { columns, plans: Array.from({ length: n }, (_, i) => plan(i)) } }).match(/grid-template-columns:repeat\((\d+), 1fr\); gap:24px/)?.[1];
  check('automatic columns = number of plans', cols(2) === '2' && cols(3) === '3');
  check('automatic columns capped at 4', cols(6) === '4');
  check('explicit columns respected (and capped at 4)', cols(5, 2) === '2' && cols(5, 9) === '4');
  const h = render({ id: 'pr', type: 'PRICING', styles: {}, content: { plans: [
    plan(1, { buttonUrl: 'mailto:info@example.com' }), plan(2, { buttonUrl: 'chi-siamo/index.html' }),
    plan(3, { buttonUrl: 'https://example.com/x' }), plan(4, { buttonUrl: '' }),
    plan(5, { highlighted: true, badge: 'Top', features: ['uno', '', '  ', 'due'] })] } });
  const $ = load(`<div>${h}</div>`, null, false);
  const hrefs = $('a.cc-plan-btn').map((_, a) => $(a).attr('href')).get();
  check('mailto: left untouched', hrefs[0] === 'mailto:info@example.com', hrefs[0]);
  check('internal link resolved with BASE_URL', hrefs[1] === '{{BASE_URL}}chi-siamo/', hrefs[1]);
  check('external link unchanged', hrefs[2] === 'https://example.com/x');
  check('empty URL → #', hrefs[3] === '#', hrefs[3]);
  check('highlighted plan: class + badge', $('.cc-plan-hl').length === 1 && $('.cc-plan-badge').text() === 'Top');
  check('empty features discarded', $('.cc-plan-hl .cc-plan-features li').length === 2);
  check('the badge is not shown when empty', $('.cc-plan:not(.cc-plan-hl) .cc-plan-badge').length === 0);
}

// ---------------------------------------------------------------- GALLERY (structure)
console.log('GALLERY');
const galleryBlock = (content) => ({ id: 'gl', type: 'GALLERY', styles: {}, content: { layout: 'grid', columns: 3, gap: 12, aspectRatio: '1 / 1', lightbox: true, showCaptions: false, images: [
  { src: '/u/a.jpg', alt: 'A', caption: 'Prima "foto"' }, { src: '/u/b.jpg', alt: 'B', caption: 'Seconda' }, { src: '/u/c.jpg', alt: 'C', caption: '' }], ...content } });
{
  const on = render(galleryBlock({}));
  const off = render(galleryBlock({ lightbox: false }));
  check('lightbox on: link to the image (no-JS fallback), overlay and script', /<a href="\/u\/a\.jpg" class="cc-gal-item"/.test(on) && on.includes('cc-lightbox') && /<script>/.test(on));
  check('lightbox off: no link, overlay or script', !/<a href=/.test(off) && !off.includes('cc-lightbox') && !/<script>/.test(off));
  check('no images: no overlay or script', !/cc-lightbox|<script>/.test(render(galleryBlock({ images: [] }))));
  const m = render(galleryBlock({ layout: 'masonry', columns: 4 }));
  check('masonry: column-count and no aspect-ratio', m.includes('column-count:4') && !m.includes('aspect-ratio'));
  check('mobile: at most 2 columns', render(galleryBlock({ columns: 5 })).includes('repeat(2, 1fr) !important'));
  check('columns capped at 6 and gap at 80', (() => { const h = render(galleryBlock({ columns: 99, gap: 999 })); return h.includes('repeat(6, 1fr); gap:80px'); })());
  check('captions only when enabled', !off.includes('<figcaption') && render(galleryBlock({ showCaptions: true })).includes('<figcaption'));
  check('a caption with quotes is escaped in the attribute', on.includes('data-caption="Prima &quot;foto&quot;"'));
  check('aspectRatio=auto: no aspect-ratio in the grid', !render(galleryBlock({ aspectRatio: 'auto' })).includes('aspect-ratio'));
}

// ---------------------------------------------------------------- LIGHTBOX (real behavior in jsdom)
console.log('LIGHTBOX (jsdom)');
{
  const html = render(galleryBlock({ showCaptions: false }));
  const dom = new JSDOM(`<!doctype html><html><body><div id="page">${html}</div></body></html>`, { runScripts: 'dangerously', pretendToBeVisual: true });
  const { window } = dom;
  const doc = window.document;
  const key = (k) => doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true }));
  const items = [...doc.querySelectorAll('a.cc-gal-item')];
  const box = doc.querySelector('.cc-lightbox');
  const img = box.querySelector('.cc-lb-img');
  const cap = box.querySelector('.cc-lb-cap');

  check('the script ran without errors and moved the overlay into <body>', box.parentElement === doc.body);
  check('overlay closed at start', box.style.display === 'none');

  items[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  check('click on a thumbnail: overlay opens on the right image', box.style.display === 'flex' && img.getAttribute('src') === '/u/b.jpg', img.getAttribute('src'));
  check('the item caption is shown', cap.textContent === 'Seconda');
  check('page scrolling is locked', doc.documentElement.style.overflow === 'hidden');

  key('ArrowRight');
  check('right arrow: next image', img.getAttribute('src') === '/u/c.jpg' && cap.textContent === '');
  key('ArrowRight');
  check('after the last one it wraps to the first (loop)', img.getAttribute('src') === '/u/a.jpg' && cap.textContent === 'Prima "foto"');
  key('ArrowLeft');
  check('left arrow from the first: goes to the last (loop)', img.getAttribute('src') === '/u/c.jpg');

  box.querySelector('.cc-lb-next').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  check('"next" button', img.getAttribute('src') === '/u/a.jpg');
  box.querySelector('.cc-lb-prev').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  check('"prev" button', img.getAttribute('src') === '/u/c.jpg');

  key('Escape');
  check('Esc closes and restores scrolling', box.style.display === 'none' && doc.documentElement.style.overflow === '');

  key('ArrowRight');
  check('keys do nothing while the lightbox is closed', img.getAttribute('src') === '/u/c.jpg');

  items[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  box.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  check('click on the backdrop closes it', box.style.display === 'none');

  items[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  box.querySelector('.cc-lb-close').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  check('close button', box.style.display === 'none');

  // a click on the image inside the overlay must NOT close it (only the backdrop does)
  items[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  img.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  check('click on the enlarged image does not close it', box.style.display === 'flex');
  key('Escape');

  // two galleries on the same page don't interfere
  const two = new JSDOM(`<!doctype html><body>${render({ ...galleryBlock({}), id: 'g1' })}${render({ ...galleryBlock({ images: [{ src: '/z/1.jpg', alt: '', caption: '' }, { src: '/z/2.jpg', alt: '', caption: '' }] }), id: 'g2' })}</body>`, { runScripts: 'dangerously' });
  const d2 = two.window.document;
  d2.querySelectorAll('#g2 a.cc-gal-item')[1].dispatchEvent(new two.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const boxes = [...d2.body.querySelectorAll(':scope > .cc-lightbox')];
  check('two galleries: each has its own overlay', boxes.length === 2);
  check('two galleries: only the clicked one opens, with its own image', boxes.filter(b => b.style.display === 'flex').length === 1 && boxes.find(b => b.style.display === 'flex').querySelector('.cc-lb-img').getAttribute('src') === '/z/2.jpg');
}

console.log(`\n${fails === 0 ? 'BLOCKS OK' : fails + ' checks failed'}`);
process.exit(fails === 0 ? 0 : 1);
