// tests/blocks.mjs
// Test COMPORTAMENTALI dei blocchi Accordion, Tabs, Pricing, Gallery (lightbox).
// La parità (parity.mjs) verifica che editor e compiler producano la stessa struttura;
// qui si verifica che l'HTML prodotto dal compiler PHP *funzioni davvero*:
//  - i Tabs cambiano pannello (logica CSS con radio :checked, valutata con un motore di selettori);
//  - la lightbox si apre/chiude/naviga (script eseguito in jsdom);
//  - il contenuto ricco viene sanificato; l'accordion esclusivo/multiplo; gli URL del Pricing.

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
    // regole "pannello visibile" e "tab attiva" emesse per ciascun indice
    const panelRules = [...css.matchAll(/([^{}]+:checked ~ \.cc-tab-panels \.cc-tab-panel:nth-child\(\d+\))\{display:block\}/g)].map(m => m[1].trim());
    const tabRules = [...css.matchAll(/([^{}]+:checked ~ \.cc-tab-bar \.cc-tab:nth-child\(\d+\))\{[^}]*\}/g)].map(m => m[1].trim());
    check(`${variant}: una regola pannello e una regola tab per ogni scheda`, panelRules.length === 3 && tabRules.length === 3, `${panelRules.length}/${tabRules.length}`);
    check(`${variant}: di default solo il primo radio è selezionato`, $('input.cc-tab-input[checked]').length === 1 && $('input.cc-tab-input').first().is('[checked]'));
    // simulo il click su ogni tab: sposto "checked" e verifico QUALI ELEMENTI le regole CSS selezionano
    // (non basta sapere che una regola scatta: deve selezionare il pannello/la tab giusti)
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
      if (!okPanel || !okTab) { ok = false; detail += `scheda ${k + 1}: pannello mostrato=${shownPanels.map(e => panels.indexOf(e) + 1)} tab attiva=${activeTabs.map(e => labels.indexOf(e) + 1)}; `; }
    }
    check(`${variant}: selezionando la scheda k si mostrano esattamente il pannello k e la tab k`, ok, detail);
    check(`${variant}: ogni label punta al proprio radio (for/id)`, $('label.cc-tab').toArray().every((l, i) => $(l).attr('for') === $('input.cc-tab-input').eq(i).attr('id')));
    check(`${variant}: i pannelli sono nascosti di default`, /\.cc-tab-panel\{display:none\}/.test(css));
  }
}

// ---------------------------------------------------------------- SANIFICAZIONE (Accordion + Tabs)
console.log('SANIFICAZIONE contenuto ricco');
{
  const evil = '<p onclick="steal()">ok</p><script>alert(1)</script><a href="javascript:alert(2)">x</a><img src=x onerror="alert(3)">';
  for (const type of ['ACCORDION', 'TABS']) {
    const html = render({ id: 'sx', type, styles: {}, content: { items: [{ title: 'T', content: evil }] } });
    check(`${type}: rimossi <script>, on*, javascript:`, !/<script|onclick|onerror|javascript:/i.test(html), html.match(/<script|onclick|onerror|javascript:/i)?.[0]);
    check(`${type}: il testo legittimo resta`, html.includes('ok'));
  }
  const t = render({ id: 'sy', type: 'TABS', styles: {}, content: { items: [{ title: '<b>x</b>"&', content: '' }] } });
  check('TABS: il titolo viene escapato', t.includes('&lt;b&gt;x&lt;/b&gt;') && !t.includes('<b>x</b>'));
}

// ---------------------------------------------------------------- ACCORDION
console.log('ACCORDION');
{
  const items = [{ title: 'A', content: '<p>1</p>' }, { title: 'B', content: '<p>2</p>' }];
  const ex = load(`<div>${render({ id: 'ac', type: 'ACCORDION', styles: {}, content: { allowMultiple: false, openFirst: true, items } })}</div>`, null, false);
  check('esclusivo: tutti i <details> condividono lo stesso name', ex('details[name="ac"]').length === 2);
  check('openFirst: solo il primo è aperto', ex('details[open]').length === 1 && ex('details').first().is('[open]'));
  const mu = load(`<div>${render({ id: 'ac', type: 'ACCORDION', styles: {}, content: { allowMultiple: true, openFirst: false, items } })}</div>`, null, false);
  check('multiplo: nessun name (si possono aprire più voci)', mu('details[name]').length === 0);
  check('multiplo + openFirst=false: nessuna voce aperta', mu('details[open]').length === 0);
  const none = render({ id: 'ac', type: 'ACCORDION', styles: {}, content: { icon: 'none', items } });
  check('icon=none: nessuna icona', !none.includes('cc-acc-icon" aria-hidden'));
}

// ---------------------------------------------------------------- PRICING
console.log('PRICING');
{
  const plan = (n, extra = {}) => ({ name: 'P' + n, price: '$' + n, period: '/mo', description: '', features: ['f'], buttonText: 'Go', buttonUrl: '#', highlighted: false, badge: '', ...extra });
  const cols = (n, columns = 0) => render({ id: 'pr', type: 'PRICING', styles: {}, content: { columns, plans: Array.from({ length: n }, (_, i) => plan(i)) } }).match(/grid-template-columns:repeat\((\d+), 1fr\); gap:24px/)?.[1];
  check('colonne automatiche = numero di piani', cols(2) === '2' && cols(3) === '3');
  check('colonne automatiche limitate a 4', cols(6) === '4');
  check('colonne esplicite rispettate (e limitate a 4)', cols(5, 2) === '2' && cols(5, 9) === '4');
  const h = render({ id: 'pr', type: 'PRICING', styles: {}, content: { plans: [
    plan(1, { buttonUrl: 'mailto:info@example.com' }), plan(2, { buttonUrl: 'chi-siamo/index.html' }),
    plan(3, { buttonUrl: 'https://example.com/x' }), plan(4, { buttonUrl: '' }),
    plan(5, { highlighted: true, badge: 'Top', features: ['uno', '', '  ', 'due'] })] } });
  const $ = load(`<div>${h}</div>`, null, false);
  const hrefs = $('a.cc-plan-btn').map((_, a) => $(a).attr('href')).get();
  check('mailto: lasciato intatto', hrefs[0] === 'mailto:info@example.com', hrefs[0]);
  check('link interno risolto con BASE_URL', hrefs[1] === '{{BASE_URL}}chi-siamo/', hrefs[1]);
  check('link esterno invariato', hrefs[2] === 'https://example.com/x');
  check('URL vuoto → #', hrefs[3] === '#', hrefs[3]);
  check('piano evidenziato: classe + badge', $('.cc-plan-hl').length === 1 && $('.cc-plan-badge').text() === 'Top');
  check('feature vuote scartate', $('.cc-plan-hl .cc-plan-features li').length === 2);
  check('il badge non compare se vuoto', $('.cc-plan:not(.cc-plan-hl) .cc-plan-badge').length === 0);
}

// ---------------------------------------------------------------- GALLERY (struttura)
console.log('GALLERY');
const galleryBlock = (content) => ({ id: 'gl', type: 'GALLERY', styles: {}, content: { layout: 'grid', columns: 3, gap: 12, aspectRatio: '1 / 1', lightbox: true, showCaptions: false, images: [
  { src: '/u/a.jpg', alt: 'A', caption: 'Prima "foto"' }, { src: '/u/b.jpg', alt: 'B', caption: 'Seconda' }, { src: '/u/c.jpg', alt: 'C', caption: '' }], ...content } });
{
  const on = render(galleryBlock({}));
  const off = render(galleryBlock({ lightbox: false }));
  check('lightbox attiva: link all\'immagine (fallback senza JS), overlay e script', /<a href="\/u\/a\.jpg" class="cc-gal-item"/.test(on) && on.includes('cc-lightbox') && /<script>/.test(on));
  check('lightbox disattiva: niente link, overlay o script', !/<a href=/.test(off) && !off.includes('cc-lightbox') && !/<script>/.test(off));
  check('senza immagini: niente overlay né script', !/cc-lightbox|<script>/.test(render(galleryBlock({ images: [] }))));
  const m = render(galleryBlock({ layout: 'masonry', columns: 4 }));
  check('masonry: column-count e niente aspect-ratio', m.includes('column-count:4') && !m.includes('aspect-ratio'));
  check('mobile: massimo 2 colonne', render(galleryBlock({ columns: 5 })).includes('repeat(2, 1fr) !important'));
  check('colonne limitate a 6 e gap a 80', (() => { const h = render(galleryBlock({ columns: 99, gap: 999 })); return h.includes('repeat(6, 1fr); gap:80px'); })());
  check('didascalie solo se attivate', !off.includes('<figcaption') && render(galleryBlock({ showCaptions: true })).includes('<figcaption'));
  check('la didascalia con virgolette viene escapata nell\'attributo', on.includes('data-caption="Prima &quot;foto&quot;"'));
  check('aspectRatio=auto: niente aspect-ratio nel grid', !render(galleryBlock({ aspectRatio: 'auto' })).includes('aspect-ratio'));
}

// ---------------------------------------------------------------- LIGHTBOX (comportamento reale in jsdom)
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

  check('lo script è partito senza errori e ha spostato l\'overlay nel <body>', box.parentElement === doc.body);
  check('overlay chiusa all\'inizio', box.style.display === 'none');

  items[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  check('click su una miniatura: overlay aperta sull\'immagine giusta', box.style.display === 'flex' && img.getAttribute('src') === '/u/b.jpg', img.getAttribute('src'));
  check('la didascalia della voce viene mostrata', cap.textContent === 'Seconda');
  check('lo scroll della pagina viene bloccato', doc.documentElement.style.overflow === 'hidden');

  key('ArrowRight');
  check('freccia destra: immagine successiva', img.getAttribute('src') === '/u/c.jpg' && cap.textContent === '');
  key('ArrowRight');
  check('dopo l\'ultima si torna alla prima (loop)', img.getAttribute('src') === '/u/a.jpg' && cap.textContent === 'Prima "foto"');
  key('ArrowLeft');
  check('freccia sinistra dalla prima: va all\'ultima (loop)', img.getAttribute('src') === '/u/c.jpg');

  box.querySelector('.cc-lb-next').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  check('pulsante "next"', img.getAttribute('src') === '/u/a.jpg');
  box.querySelector('.cc-lb-prev').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  check('pulsante "prev"', img.getAttribute('src') === '/u/c.jpg');

  key('Escape');
  check('Esc chiude e ripristina lo scroll', box.style.display === 'none' && doc.documentElement.style.overflow === '');

  key('ArrowRight');
  check('a lightbox chiusa i tasti non fanno nulla', img.getAttribute('src') === '/u/c.jpg');

  items[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  box.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  check('click sullo sfondo chiude', box.style.display === 'none');

  items[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  box.querySelector('.cc-lb-close').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  check('pulsante chiudi', box.style.display === 'none');

  // click sull'immagine dentro l'overlay NON deve chiuderla (solo lo sfondo)
  items[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  img.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  check('click sull\'immagine ingrandita non chiude', box.style.display === 'flex');
  key('Escape');

  // due gallerie nella stessa pagina non si interferiscono
  const two = new JSDOM(`<!doctype html><body>${render({ ...galleryBlock({}), id: 'g1' })}${render({ ...galleryBlock({ images: [{ src: '/z/1.jpg', alt: '', caption: '' }, { src: '/z/2.jpg', alt: '', caption: '' }] }), id: 'g2' })}</body>`, { runScripts: 'dangerously' });
  const d2 = two.window.document;
  d2.querySelectorAll('#g2 a.cc-gal-item')[1].dispatchEvent(new two.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const boxes = [...d2.body.querySelectorAll(':scope > .cc-lightbox')];
  check('due gallerie: ciascuna ha la propria overlay', boxes.length === 2);
  check('due gallerie: si apre solo quella cliccata, con la sua immagine', boxes.filter(b => b.style.display === 'flex').length === 1 && boxes.find(b => b.style.display === 'flex').querySelector('.cc-lb-img').getAttribute('src') === '/z/2.jpg');
}

console.log(`\n${fails === 0 ? 'BLOCCHI OK' : fails + ' controlli falliti'}`);
process.exit(fails === 0 ? 0 : 1);
