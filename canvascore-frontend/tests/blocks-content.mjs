// tests/blocks-content.mjs
// Test COMPORTAMENTALI dei blocchi: Divider, Callout, Steps, Counters, Progress, Table, Countdown,
// Timeline, Logos, Team, Before/After, Business. La parità (parity.mjs) verifica che editor e compiler
// producano la stessa struttura; qui si verifica che l'HTML del compiler PHP sia SICURO e FUNZIONI.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { JSDOM } from 'jsdom';
import { renderBlock } from '../src/render/renderBlock.mjs';

const phpScript = fileURLToPath(new URL('./render_php.php', import.meta.url));
const php = (type, content, styles = {}) => execFileSync('php', [phpScript], { input: JSON.stringify({ id: 'tb', type, styles, content }) }).toString();
const js = (type, content, styles = {}) => renderBlock({ id: 'tb', type, styles, content });
const $ = (html) => load(`<div id="__r">${html}</div>`, null, false);

let fails = 0, total = 0;
const check = (name, cond, extra = '') => {
  total++;
  if (cond) console.log('  ✓ ' + name);
  else { fails++; console.error('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
};
const section = (t) => console.log('\n' + t);

// ------------------------------------------------------------------ ambiente jsdom con orologio/rAF/IO controllati
function page(html, { now = null, reduced = false, withIO = true } = {}) {
  const ticks = []; const frames = []; const ios = []; const state = { now };
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    runScripts: 'dangerously', pretendToBeVisual: false,
    beforeParse(win) {
      win.matchMedia = () => ({ matches: reduced });
      if (withIO) win.IntersectionObserver = class { constructor(cb) { this.cb = cb; this.t = []; ios.push(this); } observe(x) { this.t.push(x); } unobserve(x) { this.t = this.t.filter((y) => y !== x); } disconnect() {} };
      else delete win.IntersectionObserver;
      win.requestAnimationFrame = (cb) => { frames.push(cb); return frames.length; };
      win.setInterval = (fn) => { ticks.push(fn); return ticks.length; };
      win.clearInterval = () => { ticks.cleared = (ticks.cleared || 0) + 1; };
      if (now !== null) {
        const Real = win.Date;
        win.Date = class extends Real {
          constructor(...a) { if (a.length === 0) super(state.now); else super(...a); }
          static now() { return state.now; }
        };
      }
    },
  });
  return {
    dom, doc: dom.window.document, state,
    see: () => ios.forEach((io) => io.cb(io.t.map((t) => ({ isIntersecting: true, target: t })))),
    frame: (ts) => { const f = frames.splice(0); f.forEach((cb) => cb(ts)); },
    tick: () => ticks.forEach((f) => f()),
    cleared: () => ticks.cleared || 0,
    pendingFrames: () => frames.length,
  };
}

// =============================================================== DIVIDER
section('DIVIDER');
{
  const h = php('DIVIDER', { style: 'inventato', color: 'red; background:url(http://evil)', thickness: 999, width: -5 });
  check('stile sconosciuto → "line"', /<hr class="cc-divider-line"/.test(h));
  check('colore con ";" / url() rifiutato → colore di default', !/evil|url\(/.test(h) && /#cbd5e1/.test(h));
  check('spessore e larghezza limitati (20 px, 10 %)', /border-top:20px solid/.test(h) && /width:10%/.test(h));
  for (const bad of ['red}body{display:none', 'javascript:alert(1)', 'expression(alert(1))', '#12', 'rgb(1,2,3);x', 'url(x)', '</style><script>x</script>']) {
    const o = php('DIVIDER', { style: 'wave', color: bad });
    check(`colore ostile non passa: ${bad.slice(0, 26)}`, !/display:none|javascript|expression|<script|<\/style>|url\(/.test(o) && /fill="#cbd5e1"/.test(o));
  }
  for (const ok of ['#fff', '#0F172AFF', 'tomato', 'rgb(1, 2, 3)', 'rgba(1,2,3,0.5)', 'hsl(120, 50%, 50%)', 'var(--brand-color, #3b82f6)']) {
    check(`colore valido accettato: ${ok}`, php('DIVIDER', { style: 'wave', color: ok }).includes(`fill="${ok}"`));
  }
  check('wave capovolta → scaleY(-1)', /transform:scaleY\(-1\)/.test(php('DIVIDER', { style: 'wave', flip: true })) && !/scaleY/.test(php('DIVIDER', { style: 'wave' })));
  check('altezza dello spacer limitata a 400', /height:400px/.test(php('DIVIDER', { style: 'spacer', height: 9999 })));
  check('le forme decorative sono nascoste agli screen reader', /aria-hidden="true"/.test(php('DIVIDER', { style: 'curve' })) && /aria-hidden="true"/.test(php('DIVIDER', { style: 'gradient' })));
}

// =============================================================== CALLOUT
section('CALLOUT');
{
  const evil = '<p onclick="x()">ok</p><script>alert(1)</script><a href="javascript:alert(2)">l</a><img src=x onerror="alert(3)">';
  const h = php('CALLOUT', { variant: 'info', title: '<b>T</b>', text: evil });
  check('contenuto ricco sanificato (script, on*, javascript:)', !/<script|onclick|onerror|javascript:/i.test(h) && h.includes('ok'));
  check('titolo escapato', h.includes('&lt;b&gt;T&lt;/b&gt;') && !h.includes('<b>T</b>'));
  check('role="note" (non "alert": non deve annunciarsi da solo al caricamento)', /role="note"/.test(h) && !/role="alert"/.test(h));
  check('variante sconosciuta → info', /cc-callout-info/.test(php('CALLOUT', { variant: 'x', text: '' })));
  check('showIcon=false → nessuna icona', !/cc-callout-icon/.test(php('CALLOUT', { variant: 'danger', showIcon: false, text: 'a' })));
  check('titolo vuoto → nessun elemento titolo', !/cc-callout-title/.test(php('CALLOUT', { variant: 'note', title: '', text: 'a' })));
}

// =============================================================== STEPS
section('STEPS');
{
  const items = [{ title: 'A', text: 'x' }, { title: 'B' }, { title: 'C', text: 'z' }, { title: 'D' }, { title: 'E' }];
  const hz = php('STEPS', { layout: 'horizontal', items }); const d = $(hz);
  check('numerazione 1..n nell\'ordine', d('.cc-step-num').map((_, e) => d(e).text()).get().join(',') === '1,2,3,4,5');
  check('è una lista ordinata <ol> con un <li> per passo', d('ol').length === 1 && d('li.cc-step').length === 5);
  check('orizzontale: colonne = min(4, n)', /repeat\(4, 1fr\)/.test(hz));
  check('orizzontale: collassa su mobile e nasconde i connettori', /max-width:768px/.test(hz) && /display:none/.test(hz));
  const vt = php('STEPS', { layout: 'vertical', items: items.slice(0, 2) });
  check('verticale: nessuna griglia e nessuna media query', !/grid-template-columns/.test(vt) && !/@media/.test(vt));
  check('passo senza testo → nessun paragrafo', $(php('STEPS', { items: [{ title: 'solo titolo' }] }))('.cc-step-text').length === 0);
  check('zero passi → una lista vuota valida, senza errori', $(php('STEPS', { items: [] }))('ol').length === 1);
  check('il titolo è escapato', !php('STEPS', { items: [{ title: '<img src=x onerror=a>' }] }).includes('<img'));
}

// =============================================================== NUMERI: PHP == JS
section('FORMATTAZIONE NUMERICA — il sito e l\'editor devono mostrare lo stesso numero');
{
  const cases = [[1234567, 0], [0, 0], [4.5, 1], [2.675, 2], [1.005, 2], [0.285, 2], [12.345, 2], [0.5, 0], [1.5, 0], [2.5, 0], [-1234.567, 2], [-0.001, 0], [999.995, 2], [1e6 + 0.5, 0], [3.14159, 2], [5, 2], [100, 1], [1234.5, 1]];
  const bad = [];
  for (const [v, dec] of cases) {
    const p = $(php('COUNTERS', { animate: false, items: [{ value: v, decimals: dec }] }))('.cc-counter-value').text();
    const j = $(js('COUNTERS', { animate: false, items: [{ value: v, decimals: dec }] }))('.cc-counter-value').text();
    if (p !== j) bad.push(`${v}/${dec}: PHP=${p} JS=${j}`);
  }
  check(`${cases.length} valori (2.675, 1.005, 0.5, negativi, migliaia…) identici in PHP e JS`, bad.length === 0, bad.join(' | '));
  const txt = (v, dec) => $(php('COUNTERS', { animate: false, items: [{ value: v, decimals: dec }] }))('.cc-counter-value').text();
  check('migliaia con virgola: 1234567 → 1,234,567', txt(1234567, 0) === '1,234,567');
  check('2.675 con 2 decimali → 2.68 (mezzo arrotondato per eccesso, non 2.67)', txt(2.675, 2) === '2.68');
  check('-0.001 con 0 decimali → "0" (non "-0")', txt(-0.001, 0) === '0');
}

// =============================================================== COUNTERS
section('COUNTERS');
{
  const items = [{ value: 1234567, prefix: '$', suffix: '+', decimals: 0, label: 'Rev' }, { value: '4.5', decimals: 1, label: 'Rate' }, { value: 'abc', label: 'Bad' }, { value: 7, prefix: '<b>', label: '<i>x</i>' }];
  const h = php('COUNTERS', { items, animate: true, duration: 1000 }); const d = $(h);
  const vals = d('.cc-counter-value').map((_, e) => d(e).text()).get();
  check('testo finale già nell\'HTML (no JS, SEO): prefisso + migliaia + suffisso', vals[0] === '$1,234,567+' && vals[1] === '4.5');
  check('valore non numerico → 0', vals[2] === '0');
  check('prefisso/etichetta escapati', !h.includes('<b>') && !h.includes('<i>'));
  check('colonne automatiche (max 4) e griglia a 2 colonne su mobile', /repeat\(4, 1fr\)/.test(h) && /repeat\(2, 1fr\) !important/.test(h));
  check('animate=false → nessuno script', !/<script/.test(php('COUNTERS', { items, animate: false })));
  check('durata limitata (500..5000 ms)', /var dur=5000;/.test(php('COUNTERS', { items, animate: true, duration: 999999 })) && /var dur=500;/.test(php('COUNTERS', { items, animate: true, duration: 1 })));
  check('nessuno script se non ci sono contatori', !/<script/.test(php('COUNTERS', { items: [], animate: true })));

  // script in jsdom
  const single = php('COUNTERS', { animate: true, duration: 1000, items: [{ value: 1000, suffix: '+', label: 'x' }, { value: 4.5, decimals: 1 }] });
  let p = page(single);
  const els = () => [...p.doc.querySelectorAll('.cc-counter-value')];
  check('all\'avvio i contatori partono da 0 (prima di entrare nello schermo)', els()[0].textContent === '0+' && els()[1].textContent === '0.0');
  p.see(); p.frame(0);
  p.frame(500);
  const mid = els()[0].textContent;
  check('a metà animazione il valore è intermedio (tra 0 e 1,000)', /^\d{1,3}\+$/.test(mid) && mid !== '0+' && mid !== '1,000+', mid);
  p.frame(1500);
  check('a fine animazione torna ESATTAMENTE il testo calcolato dal server', els()[0].textContent === '1,000+' && els()[1].textContent === '4.5', els().map((e) => e.textContent).join(' | '));
  const tricky = php('COUNTERS', { animate: true, duration: 1000, items: [{ value: 2.675, decimals: 2 }] });
  p = page(tricky); p.see(); p.frame(0); p.frame(5000);
  check('a fine animazione 2.675 resta "2.68" come calcolato dal server (toFixed darebbe 2.67)', p.doc.querySelector('.cc-counter-value').textContent === '2.68', p.doc.querySelector('.cc-counter-value').textContent);
  p = page(single, { reduced: true });
  check('prefers-reduced-motion: nessuna animazione, valore finale subito', [...p.doc.querySelectorAll('.cc-counter-value')][0].textContent === '1,000+');
  p = page(single, { withIO: false });
  check('senza IntersectionObserver: valore finale (nessun contatore bloccato a 0)', [...p.doc.querySelectorAll('.cc-counter-value')][0].textContent === '1,000+');
  p = page(single);
  p.see(); p.frame(0);
  check('l\'animazione parte una sola volta per contatore (unobserve)', p.pendingFrames() === 2);
}

// =============================================================== PROGRESS
section('PROGRESS');
{
  const h = php('PROGRESS', { height: 14, animate: true, items: [{ label: 'A', value: 90.55, color: '#10b981' }, { label: 'B', value: 150, color: 'bad;color' }, { label: 'C', value: -3 }, { label: 'D', value: 'x' }] });
  const d = $(h);
  const now = d('.cc-progress-track').map((_, e) => d(e).attr('aria-valuenow')).get();
  check('valori limitati a 0–100 e arrotondati a 1 decimale', now.join(',') === '90.6,100,0,0', now.join(','));
  check('barre accessibili: role=progressbar con valuemin/max/now e etichetta', d('[role="progressbar"]').length === 4 && d('[role="progressbar"]').first().attr('aria-label') === 'A' && d('[role="progressbar"]').first().attr('aria-valuemax') === '100');
  check('colore ostile scartato, colore valido mantenuto', !/bad;color/.test(h) && /#10b981/.test(h));
  check('altezza limitata 4..30', /height:30px/.test(php('PROGRESS', { height: 999, items: [{ label: 'x', value: 1 }] })) && /height:4px/.test(php('PROGRESS', { height: 0, items: [{ label: 'x', value: 1 }] })));
  check('showValue=false → nessuna percentuale', !/cc-progress-value/.test(php('PROGRESS', { showValue: false, items: [{ label: 'x', value: 5 }] })));
  const sc = php('PROGRESS', { animate: true, items: [{ label: 'A', value: 80 }, { label: 'B', value: 40 }] });
  let p = page(sc);
  const fills = () => [...p.doc.querySelectorAll('.cc-progress-fill')];
  check('con JS le barre partono da 0%', fills().every((f) => f.style.width === '0%'));
  p.see(); p.frame(0);
  check('quando entrano nello schermo si riempiono al valore reale', fills().map((f) => f.style.width).join(',') === '80%,40%', fills().map((f) => f.style.width).join(','));
  p = page(sc, { withIO: false });
  check('senza IntersectionObserver: barre già al valore reale', [...p.doc.querySelectorAll('.cc-progress-fill')].map((f) => f.style.width).join(',') === '80%,40%');
  p = page(sc, { reduced: true });
  check('prefers-reduced-motion: barre già al valore reale', [...p.doc.querySelectorAll('.cc-progress-fill')].map((f) => f.style.width).join(',') === '80%,40%');
}

// =============================================================== TABLE
section('TABLE');
{
  const data = 'Nome | Età | Città\nAnna | 30 | Roma\nMarco | 41\nGiulia | 28 | Milano | extra';
  const h = php('TABLE', { data, caption: 'Persone', headerRow: true, striped: true, rowHeaders: true, stickyHeader: true, maxHeight: 300 }); const d = $(h);
  check('prima riga = intestazione (<th scope="col">)', d('thead th[scope="col"]').map((_, e) => d(e).text()).get().join(',') === 'Nome,Età,Città,');
  check('righe irregolari: tutte con lo stesso numero di celle (la più larga comanda)', d('tbody tr').map((_, e) => d(e).children().length).get().join(',') === '4,4,4');
  check('prima colonna come intestazione di riga (<th scope="row">)', d('tbody th[scope="row"]').length === 3);
  check('caption presente', d('caption').text() === 'Persone');
  check('righe alternate (zebra) solo sulle dispari', d('tbody tr').map((_, e) => d(e).attr('style') || '').get().join('|') === '|background:#f8fafc;|');
  check('intestazione fissa con altezza massima → scroll interno', /max-height:300px/.test(h) && /position:sticky/.test(h));
  check('senza maxHeight l\'intestazione fissa non crea un contenitore con scroll', !/max-height/.test(php('TABLE', { data, stickyHeader: true, maxHeight: 0 })));
  check('wrapper con scroll orizzontale (responsive)', /overflow-x:auto/.test(h));
  const tsv = $(php('TABLE', { data: 'a\tb\n\n  c | d  \n', headerRow: false }));
  check('separatori misti (| e tab), righe vuote ignorate, spazi rimossi', tsv('tbody tr').length === 2 && tsv('tr').first().children().first().text() === 'a' && tsv('tr').last().children().first().text() === 'c' && tsv('thead').length === 0);
  check('dati vuoti → nessuna tabella (e nessun errore)', $(php('TABLE', { data: '' }))('table').length === 0);
  const xss = php('TABLE', { data: 'H\n<script>alert(1)</script> | <img src=x onerror=a>' });
  check('le celle sono escapate (nessuna iniezione HTML)', !/<script|<img/.test(xss) && xss.includes('&lt;script&gt;'));
  check('zebra disattivabile / bordi / compatto', !/background:#f8fafc/.test(php('TABLE', { data: 'a\nb\nc\nd', headerRow: false, striped: false })) && /border:1px solid #e2e8f0/.test(php('TABLE', { data: 'a\nb', bordered: true })) && /padding:6px 10px/.test(php('TABLE', { data: 'a\nb', compact: true })));
}

// =============================================================== COUNTDOWN
section('COUNTDOWN');
{
  const t = (c) => $(php('COUNTDOWN', c))('.cc-countdown').attr('data-target');
  check('ora locale del visitatore: data senza fuso', t({ datetime: '2030-06-15T18:30', utcOffset: 'local' }) === '2030-06-15T18:30');
  check('fuso fisso: ISO con offset', t({ datetime: '2030-06-15T18:30', utcOffset: '+02:00' }) === '2030-06-15T18:30:00+02:00');
  check('data non valida → data di default (nessun errore)', t({ datetime: 'ieri' }) === '2030-01-01T00:00');
  check('offset non valido → ora locale', t({ datetime: '2030-06-15T18:30', utcOffset: '+2' }) === '2030-06-15T18:30');
  const inj = php('COUNTDOWN', { datetime: '2030-01-01T00:00', utcOffset: '"><script>x</script>' });
  check('injection nel fuso rifiutata: la stringa ostile non compare e il fuso torna "locale"', !inj.includes('"><script>x') && !inj.includes('x</script>') && $(inj)('.cc-countdown').attr('data-target') === '2030-01-01T00:00');
  const d = $(php('COUNTDOWN', { datetime: '2030-06-15T18:30', utcOffset: '+02:00', showSeconds: false }));
  check('showSeconds=false → 3 unità', d('.cc-cd-unit').length === 3 && d('[data-unit="seconds"]').length === 0);
  check('data leggibile senza JS: <time datetime> con data e UTC', d('time').attr('datetime') === '2030-06-15T18:30:00+02:00' && d('time').text() === '2030-06-15 18:30 UTC+02:00');
  check('role="timer" e nessuna regione live (non annuncia ogni secondo)', d('[role="timer"]').length === 1 && !/aria-live/.test(php('COUNTDOWN', {})));

  const html = php('COUNTDOWN', { datetime: '2030-01-01T00:00', utcOffset: 'local', endAction: 'message', endMessage: 'Fatto!' });
  const local = (y, mo, da, h, mi, s) => new Date(y, mo - 1, da, h, mi, s).getTime();
  let p = page(html, { now: local(2029, 12, 30, 22, 58, 57) });
  const num = (u) => p.doc.querySelector(`[data-unit="${u}"]`).textContent;
  check('calcolo corretto: 1 g 1 h 1 m 3 s a Capodanno', [num('days'), num('hours'), num('minutes'), num('seconds')].join(':') === '01:01:01:03', [num('days'), num('hours'), num('minutes'), num('seconds')].join(':'));
  p.state.now += 1000; p.tick();
  check('dopo 1 secondo: 1 g 1 h 1 m 2 s', [num('days'), num('hours'), num('minutes'), num('seconds')].join(':') === '01:01:01:02');
  p.state.now = local(2029, 12, 31, 23, 59, 59); p.tick();
  check('cambio di giorno/ora/minuti: 00:00:00:01', [num('days'), num('hours'), num('minutes'), num('seconds')].join(':') === '00:00:00:01');
  check('prima della scadenza il messaggio finale è nascosto', p.doc.querySelector('.cc-cd-done').hidden === true);
  p.state.now = local(2030, 1, 1, 0, 0, 0); p.tick();
  check('alla scadenza: azzera, ferma il timer, mostra il messaggio e nasconde i numeri', [num('days'), num('seconds')].join(':') === '00:00' && p.cleared() === 1 && p.doc.querySelector('.cc-cd-done').hidden === false && p.doc.querySelector('.cc-cd-units').style.display === 'none');
  p = page(html, { now: local(2031, 5, 5, 5, 5, 5) });
  check('pagina aperta DOPO la scadenza: subito il messaggio finale', p.doc.querySelector('.cc-cd-done').hidden === false);
  p = page(php('COUNTDOWN', { datetime: '2030-01-01T00:00', endAction: 'hide', endMessage: 'x' }), { now: local(2031, 1, 1, 0, 0, 0) });
  check('endAction=hide: il blocco sparisce', p.doc.querySelector('.cc-countdown').style.display === 'none');
  p = page(php('COUNTDOWN', { datetime: '2030-01-01T00:00', endAction: 'message', endMessage: '' }), { now: local(2031, 1, 1, 0, 0, 0) });
  check('messaggio finale vuoto: restano gli zeri (nessun blocco vuoto)', p.doc.querySelector('.cc-cd-units').style.display !== 'none' && p.doc.querySelector('.cc-cd-done').hidden === true);
  // fuso fisso: indipendente dal fuso del visitatore
  p = page(php('COUNTDOWN', { datetime: '2030-06-15T18:30', utcOffset: '+02:00' }), { now: Date.parse('2030-06-15T16:29:50Z') });
  check('fuso fisso: 18:30 a +02:00 = 16:30 UTC → mancano 10 s', [num('minutes'), num('seconds')].join(':') === '00:10');
  p = page(php('COUNTDOWN', { datetime: '2030-06-15T18:30', utcOffset: '-05:00' }), { now: Date.parse('2030-06-15T23:29:50Z') });
  check('fuso negativo: 18:30 a -05:00 = 23:30 UTC → mancano 10 s', [num('minutes'), num('seconds')].join(':') === '00:10');
  p = page(php('COUNTDOWN', { datetime: '2030-06-15T18:30', utcOffset: '+00:00' }), { now: Date.parse('2030-06-14T18:30:00Z') });
  check('oltre 99 giorni/ore a una data lontana: giorni a 3 cifre non troncati', num('days') === '01');
  p = page(php('COUNTDOWN', { datetime: '2030-01-01T00:00', utcOffset: '+00:00' }), { now: Date.parse('2029-01-01T00:00:00Z') });
  check('a 365 giorni: "365" (non troncato a 2 cifre)', num('days') === '365');
}

// =============================================================== TIMELINE
section('TIMELINE');
{
  const items = [{ date: '2021', title: 'A', text: 'x' }, { date: '', title: 'B' }, { date: '2023', title: 'C', text: 'z' }];
  const left = php('TIMELINE', { layout: 'left', items }); const d = $(left);
  check('lista ordinata con un <li> per evento, pallini nascosti agli screen reader', d('ol.cc-timeline').length === 1 && d('li.cc-tl-item').length === 3 && d('.cc-tl-dot[aria-hidden="true"]').length === 3);
  check('data e testo opzionali (omessi se vuoti)', d('.cc-tl-date').length === 2 && d('.cc-tl-text').length === 2);
  check('layout sinistro: nessuna disposizione alternata', !/min-width:769px/.test(left));
  check('layout alternato: solo da 769px in su (su mobile resta a sinistra)', /@media\(min-width:769px\)/.test(php('TIMELINE', { layout: 'alternate', items })));
  check('testo escapato', !php('TIMELINE', { items: [{ title: '<img src=x onerror=a>' }] }).includes('<img'));
}

// =============================================================== LOGOS
section('LOGOS');
{
  const logos = [{ src: 'a.png', alt: 'A', href: 'https://a.example' }, { src: 'b.png', alt: 'B', href: '' }, { src: 'c.png', alt: 'C', href: 'chi-siamo/index.html' }];
  const g = php('LOGOS', { layout: 'grid', title: 'Clienti', logos }); const d = $(g);
  check('griglia: nessun duplicato, un\'immagine per logo', d('img').length === 3 && d('[aria-hidden="true"]').length === 0);
  check('i loghi con link sono <a rel="noopener">, gli altri <div>', d('a.cc-logo-item[rel="noopener"]').length === 2 && d('div.cc-logo-item').length === 1);
  check('link interno risolto con BASE_URL', d('a.cc-logo-item').last().attr('href') === '{{BASE_URL}}chi-siamo/');
  check('titolo mostrato; colonne su mobile limitate a 3', d('.cc-logos-title').text() === 'Clienti' && /repeat\(3, 1fr\) !important/.test(php('LOGOS', { columns: 8, logos })));
  check('scala di grigi con ritorno al colore su hover/focus', /filter:grayscale\(1\)/.test(g) && /:hover img/.test(g) && /:focus-visible img/.test(g));
  const m = php('LOGOS', { layout: 'marquee', speed: 20, logos }); const dm = $(m);
  check('marquee: due serie, la seconda nascosta agli screen reader', dm('.cc-logos-set').length === 2 && dm('.cc-logos-set').last().attr('aria-hidden') === 'true');
  check('la serie duplicata non è raggiungibile da tastiera (tabindex=-1, alt vuoto)', dm('.cc-logos-set[aria-hidden="true"] a').toArray().every((a) => dm(a).attr('tabindex') === '-1') && dm('.cc-logos-set[aria-hidden="true"] img').toArray().every((i) => dm(i).attr('alt') === ''));
  check('animazione CSS con nome univoco per blocco e velocità scelta', /@keyframes ccMq_tb/.test(m) && /ccMq_tb 20s linear infinite/.test(m));
  check('pausa al passaggio del mouse e prefers-reduced-motion (niente movimento, niente duplicati)', /animation-play-state:paused/.test(m) && /prefers-reduced-motion:reduce/.test(m) && /\.cc-logos-set\[aria-hidden="true"\]\{display:none\}/.test(m));
  check('velocità limitata 10..120 s', /ccMq_tb 120s/.test(php('LOGOS', { layout: 'marquee', speed: 9999, logos })) && /ccMq_tb 10s/.test(php('LOGOS', { layout: 'marquee', speed: 1, logos })));
  check('nessun JavaScript necessario', !/<script/.test(m) && !/<script/.test(g));
  check('url "javascript:" nel link del logo non diventa un link eseguibile', !/href="javascript:/i.test(php('LOGOS', { logos: [{ src: 'a.png', alt: 'x', href: 'javascript:alert(1)' }] })));
}

// =============================================================== TEAM
section('TEAM');
{
  const members = [
    { name: 'Anna Rossi', role: 'CEO', bio: 'Guida.', photo: 'anna.jpg', email: 'anna@example.com', linkedin: 'linkedin.com/in/anna', twitter: 'https://x.com/anna', website: '' },
    { name: 'élodie martin', role: '', bio: '', photo: '', email: 'non-una-email', website: 'example.com' },
    { name: 'marco', photo: '' }, { name: '', role: 'Ruolo' }, { name: '😀 Zed', photo: '' },
  ];
  const h = php('TEAM', { members, columns: 0 }); const d = $(h);
  check('foto presente → <img> con alt = nome', d('img[src="anna.jpg"]').attr('alt') === 'Anna Rossi');
  const ini = d('.cc-member-initials').map((_, e) => d(e).text()).get();
  check('senza foto: iniziali dei primi due nomi (anche accentate/emoji, senza mbstring)', ini.join('|') === 'ém|m||😀Z', ini.join('|'));
  check('le iniziali sono rese maiuscole dal CSS (non dal PHP)', /text-transform:uppercase/.test(h));
  check('email valida → mailto:, non valida → nessun link', d('a[href="mailto:anna@example.com"]').length === 1 && !/non-una-email/.test(h));
  check('social senza schema → https:// (linkedin.com/in/anna)', d('a[href="https://linkedin.com/in/anna"]').length === 1 && d('a[href="https://x.com/anna"]').length === 1 && d('a[href="https://example.com"]').length === 1);
  check('link con aria-label "Nome - Servizio" e rel=noopener', d('a[aria-label="Anna Rossi - LinkedIn"][rel="noopener"]').length === 1);
  check('colonne automatiche max 4; su mobile 2, su schermi piccoli 1', /repeat\(4, 1fr\)/.test(h) && /repeat\(2, 1fr\) !important/.test(h) && /max-width:480px/.test(h));
  check('forma foto: cerchio/arrotondata/quadrata', /border-radius:50%/.test(php('TEAM', { members: [{ name: 'a' }], photoShape: 'circle' })) && /border-radius:16px/.test(php('TEAM', { members: [{ name: 'a' }], photoShape: 'rounded' })) && /border-radius:0;/.test(php('TEAM', { members: [{ name: 'a' }], photoShape: 'square' })));
  check('"javascript:" in un campo social non diventa un link eseguibile', !/href="javascript:/i.test(php('TEAM', { members: [{ name: 'a', linkedin: 'javascript:alert(1)', website: 'javascript:alert(2)' }] })));
  check('nome/ruolo/bio escapati', !php('TEAM', { members: [{ name: '<img src=x onerror=a>', role: '<b>', bio: '<script>' }] }).match(/<img|<b>|<script/));
}

// =============================================================== BEFORE / AFTER
section('BEFORE_AFTER');
{
  const h = php('BEFORE_AFTER', { startPosition: 30, aspectRatio: '4 / 3', before: { src: 'b.jpg', alt: 'Prima', label: 'Prima' }, after: { src: 'a.jpg', alt: 'Dopo', label: 'Dopo' } }); const d = $(h);
  check('posizione iniziale nel CSS (--pos) e nel cursore', /--pos:30%/.test(h) && d('input.cc-ba-range').attr('value') === '30');
  check('cursore accessibile: input range con etichetta, 0–100', d('input[type="range"][aria-label="Comparison slider"]').attr('min') === '0' && d('input[type="range"]').attr('max') === '100');
  check('"prima" è la parte ritagliata, "dopo" sta sotto', d('.cc-ba-before img').attr('src') === 'b.jpg' && d('img.cc-ba-after').attr('src') === 'a.jpg' && /clip-path:inset\(0 calc\(100% - var\(--pos\)\) 0 0\)/.test(h));
  check('etichette Prima/Dopo (disattivabili)', d('.cc-ba-label').length === 2 && $(php('BEFORE_AFTER', { showLabels: false, before: { src: 'b' }, after: { src: 'a' } }))('.cc-ba-label').length === 0);
  check('posizione iniziale limitata a 0–100', /--pos:100%/.test(php('BEFORE_AFTER', { startPosition: 999, before: { src: 'b' }, after: { src: 'a' } })) && /--pos:0%/.test(php('BEFORE_AFTER', { startPosition: -5, before: { src: 'b' }, after: { src: 'a' } })));
  check('l\'handle non intercetta il mouse (si trascina il cursore sotto)', /pointer-events:none/.test(h));
  const p = page(h);
  const root = p.doc.querySelector('.cc-ba'); const r = p.doc.querySelector('.cc-ba-range');
  check('script: all\'avvio imposta --pos dal cursore', root.style.getPropertyValue('--pos') === '30%');
  r.value = '72.5'; r.dispatchEvent(new p.dom.window.Event('input', { bubbles: true }));
  check('script: muovere il cursore aggiorna --pos', root.style.getPropertyValue('--pos') === '72.5%', root.style.getPropertyValue('--pos'));
  r.value = '0'; r.dispatchEvent(new p.dom.window.Event('input', { bubbles: true }));
  check('script: estremo sinistro 0%', root.style.getPropertyValue('--pos') === '0%');
}

// =============================================================== BUSINESS
section('BUSINESS');
{
  const hours = [{ day: 'Lunedì', open: '08:00', close: '19:00' }, { day: 'Martedì', closed: true }, { day: 'Mercoledì', open: 'x', close: 'y' }, { day: 'Giovedì', open: '09:00', close: '13:30' }];
  const base = { name: 'Bar "Roma" & C.', businessType: 'CafeOrCoffeeShop', address: 'Via Roma 1\n00100 Roma', phone: '+39 (06) 123-4567', email: 'info@bar.example', website: 'bar.example/it', hours, closedLabel: 'Chiuso', directionsLabel: 'Indicazioni', note: 'Festivi chiuso' };
  const h = php('BUSINESS', base); const d = $(h);
  const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  check('esattamente un blocco JSON-LD', ld.length === 1);
  const j = JSON.parse(ld[0][1]);
  check('JSON-LD valido: tipo, nome, indirizzo, telefono, email, url', j['@context'] === 'https://schema.org' && j['@type'] === 'CafeOrCoffeeShop' && j.name === 'Bar "Roma" & C.' && j.address.streetAddress === 'Via Roma 1, 00100 Roma' && j.telephone === '+39061234567' && j.email === 'info@bar.example' && j.url === 'https://bar.example/it', JSON.stringify(j));
  check('orari strutturati solo per i giorni validi e aperti (Lun e Gio), con il giorno giusto', JSON.stringify(j.openingHoursSpecification.map((s) => [s.dayOfWeek, s.opens, s.closes])) === JSON.stringify([['Monday', '08:00', '19:00'], ['Thursday', '09:00', '13:30']]), JSON.stringify(j.openingHoursSpecification));
  check('l\'etichetta del giorno è libera (Lunedì) ma il JSON-LD usa i nomi schema.org', d('th[scope="row"]').first().text() === 'Lunedì' && j.openingHoursSpecification[0].dayOfWeek === 'Monday');
  const cells = d('.cc-biz-table tr').map((_, e) => d(e).find('td').text()).get();
  check('righe: orario, chiuso, orario non valido → chiuso, orario', cells.join('|') === '08:00–19:00|Chiuso|Chiuso|09:00–13:30', cells.join('|'));
  check('telefono: link tel: con sole cifre e +', d('a[href="tel:+39061234567"]').length === 1);
  check('indirizzo su più righe (<br>) in un <address>', d('address').html().includes('Via Roma 1<br>00100 Roma'));
  check('indicazioni: URL Google Maps codificato', d('a.cc-biz-directions').attr('href') === 'https://www.google.com/maps/search/?api=1&query=Via%20Roma%201%2C%2000100%20Roma', d('a.cc-biz-directions').attr('href'));
  check('sito senza schema → https://, mostrato senza schema', d('a[href="https://bar.example/it"]').text() === 'bar.example/it');
  check('nota mostrata; titolo orari personalizzabile', d('.cc-biz-note').text() === 'Festivi chiuso' && d('.cc-biz-hours-title').text() === 'Opening hours');

  // un nome che tenta di chiudere lo <script> non deve poter iniettare codice
  const inj = php('BUSINESS', { name: '</script><script>alert(1)</script><img src=x onerror=a>', address: 'a', hours: [] });
  const scripts = [...inj.matchAll(/<script/g)].length;
  check('nome con "</script><script>": un solo <script> (nessuna iniezione)', scripts === 1 && !/<script>alert/.test(inj), `script=${scripts}`);
  const ij = JSON.parse([...inj.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)][0][1]);
  check('…e il nome resta intatto nel JSON (solo escapato)', ij.name === '</script><script>alert(1)</script><img src=x onerror=a>');
  check('…il testo visibile è escapato', !/<img src=x/.test(inj.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')));

  check('jsonLd=false → nessuno script', !/<script/.test(php('BUSINESS', { ...base, jsonLd: false })));
  check('senza nome → nessun JSON-LD (dati incompleti non vengono pubblicati)', !/<script/.test(php('BUSINESS', { address: 'x', hours })));
  check('tipo non in elenco → LocalBusiness', JSON.parse([...php('BUSINESS', { ...base, businessType: 'Evil<Type>' }).matchAll(/ld\+json">([\s\S]*?)<\/script>/g)][0][1])['@type'] === 'LocalBusiness');
  const min = $(php('BUSINESS', { name: '', address: '', phone: '', email: 'sbagliata', hours: [] }));
  check('tutto vuoto/non valido: nessun link, nessun errore, nessuna tabella', min('a').length === 0 && min('table').length === 0);
  check('mapsLink=false → niente pulsante indicazioni', $(php('BUSINESS', { ...base, mapsLink: false }))('a.cc-biz-directions').length === 0);
  check('massimo 7 giorni', $(php('BUSINESS', { name: 'x', hours: Array.from({ length: 12 }, (_, i) => ({ day: 'g' + i, open: '09:00', close: '10:00' })) }))('.cc-biz-table tr').length === 7);
  check('collassa su una colonna su mobile', /grid-template-columns:1fr !important/.test(h));
}

console.log(`\n${fails === 0 ? 'BLOCCHI CONTENUTO OK' : fails + ' controlli falliti'} (${total} controlli)`);
process.exit(fails === 0 ? 0 : 1);
