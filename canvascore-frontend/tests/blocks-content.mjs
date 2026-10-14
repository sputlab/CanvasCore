// tests/blocks-content.mjs
// BEHAVIORAL tests for the blocks: Divider, Callout, Steps, Counters, Progress, Table, Countdown,
// Timeline, Logos, Team, Before/After, Business. Parity (parity.mjs) checks that editor and compiler
// produce the same structure; here we check that the PHP compiler's HTML is SAFE and WORKS.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { JSDOM } from 'jsdom';
import { renderBlock } from '../src/render/renderBlock.mjs';
import { fillLogosMarquee, marqueeSpeed } from '../src/render/logosMarquee.mjs';

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

// ------------------------------------------------------------------ jsdom environment with controlled clock/rAF/IO
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
  check('unknown style → "line"', /<hr class="cc-divider-line"/.test(h));
  check('color with ";" / url() rejected → default color', !/evil|url\(/.test(h) && /#cbd5e1/.test(h));
  check('thickness and width capped (20 px, 10 %)', /border-top:20px solid/.test(h) && /width:10%/.test(h));
  for (const bad of ['red}body{display:none', 'javascript:alert(1)', 'expression(alert(1))', '#12', 'rgb(1,2,3);x', 'url(x)', '</style><script>x</script>']) {
    const o = php('DIVIDER', { style: 'wave', color: bad });
    check(`hostile color is rejected: ${bad.slice(0, 26)}`, !/display:none|javascript|expression|<script|<\/style>|url\(/.test(o) && /fill="#cbd5e1"/.test(o));
  }
  for (const ok of ['#fff', '#0F172AFF', 'tomato', 'rgb(1, 2, 3)', 'rgba(1,2,3,0.5)', 'hsl(120, 50%, 50%)', 'var(--brand-color, #3b82f6)']) {
    check(`valid color accepted: ${ok}`, php('DIVIDER', { style: 'wave', color: ok }).includes(`fill="${ok}"`));
  }
  check('flipped wave → scaleY(-1)', /transform:scaleY\(-1\)/.test(php('DIVIDER', { style: 'wave', flip: true })) && !/scaleY/.test(php('DIVIDER', { style: 'wave' })));
  check('spacer height capped at 400', /height:400px/.test(php('DIVIDER', { style: 'spacer', height: 9999 })));
  check('decorative shapes are hidden from screen readers', /aria-hidden="true"/.test(php('DIVIDER', { style: 'curve' })) && /aria-hidden="true"/.test(php('DIVIDER', { style: 'gradient' })));
}

// =============================================================== CALLOUT
section('CALLOUT');
{
  const evil = '<p onclick="x()">ok</p><script>alert(1)</script><a href="javascript:alert(2)">l</a><img src=x onerror="alert(3)">';
  const h = php('CALLOUT', { variant: 'info', title: '<b>T</b>', text: evil });
  check('rich content sanitized (script, on*, javascript:)', !/<script|onclick|onerror|javascript:/i.test(h) && h.includes('ok'));
  check('title escaped', h.includes('&lt;b&gt;T&lt;/b&gt;') && !h.includes('<b>T</b>'));
  check('role="note" (not "alert": it must not announce itself on load)', /role="note"/.test(h) && !/role="alert"/.test(h));
  check('unknown variant → info', /cc-callout-info/.test(php('CALLOUT', { variant: 'x', text: '' })));
  check('showIcon=false → no icon', !/cc-callout-icon/.test(php('CALLOUT', { variant: 'danger', showIcon: false, text: 'a' })));
  check('empty title → no title element', !/cc-callout-title/.test(php('CALLOUT', { variant: 'note', title: '', text: 'a' })));
}

// =============================================================== STEPS
section('STEPS');
{
  const items = [{ title: 'A', text: 'x' }, { title: 'B' }, { title: 'C', text: 'z' }, { title: 'D' }, { title: 'E' }];
  const hz = php('STEPS', { layout: 'horizontal', items }); const d = $(hz);
  check('numbering 1..n in order', d('.cc-step-num').map((_, e) => d(e).text()).get().join(',') === '1,2,3,4,5');
  check('it is an ordered list <ol> with one <li> per step', d('ol').length === 1 && d('li.cc-step').length === 5);
  check('horizontal: columns = min(4, n)', /repeat\(4, 1fr\)/.test(hz));
  check('horizontal: collapses on mobile and hides the connectors', /max-width:768px/.test(hz) && /display:none/.test(hz));
  const vt = php('STEPS', { layout: 'vertical', items: items.slice(0, 2) });
  check('vertical: no grid and no media query', !/grid-template-columns/.test(vt) && !/@media/.test(vt));
  check('step without text → no paragraph', $(php('STEPS', { items: [{ title: 'solo titolo' }] }))('.cc-step-text').length === 0);
  check('zero steps → a valid empty list, no errors', $(php('STEPS', { items: [] }))('ol').length === 1);
  check('the title is escaped', !php('STEPS', { items: [{ title: '<img src=x onerror=a>' }] }).includes('<img'));
}

// =============================================================== NUMBERS: PHP == JS
section('NUMBER FORMATTING — the site and the editor must show the same number');
{
  const cases = [[1234567, 0], [0, 0], [4.5, 1], [2.675, 2], [1.005, 2], [0.285, 2], [12.345, 2], [0.5, 0], [1.5, 0], [2.5, 0], [-1234.567, 2], [-0.001, 0], [999.995, 2], [1e6 + 0.5, 0], [3.14159, 2], [5, 2], [100, 1], [1234.5, 1]];
  const bad = [];
  for (const [v, dec] of cases) {
    const p = $(php('COUNTERS', { animate: false, items: [{ value: v, decimals: dec }] }))('.cc-counter-value').text();
    const j = $(js('COUNTERS', { animate: false, items: [{ value: v, decimals: dec }] }))('.cc-counter-value').text();
    if (p !== j) bad.push(`${v}/${dec}: PHP=${p} JS=${j}`);
  }
  check(`${cases.length} values (2.675, 1.005, 0.5, negatives, thousands…) identical in PHP and JS`, bad.length === 0, bad.join(' | '));
  const txt = (v, dec) => $(php('COUNTERS', { animate: false, items: [{ value: v, decimals: dec }] }))('.cc-counter-value').text();
  check('thousands with commas: 1234567 → 1,234,567', txt(1234567, 0) === '1,234,567');
  check('2.675 with 2 decimals → 2.68 (half rounded up, not 2.67)', txt(2.675, 2) === '2.68');
  check('-0.001 with 0 decimals → "0" (not "-0")', txt(-0.001, 0) === '0');
}

// =============================================================== COUNTERS
section('COUNTERS');
{
  const items = [{ value: 1234567, prefix: '$', suffix: '+', decimals: 0, label: 'Rev' }, { value: '4.5', decimals: 1, label: 'Rate' }, { value: 'abc', label: 'Bad' }, { value: 7, prefix: '<b>', label: '<i>x</i>' }];
  const h = php('COUNTERS', { items, animate: true, duration: 1000 }); const d = $(h);
  const vals = d('.cc-counter-value').map((_, e) => d(e).text()).get();
  check('final text already in the HTML (no JS, SEO): prefix + thousands + suffix', vals[0] === '$1,234,567+' && vals[1] === '4.5');
  check('non-numeric value → 0', vals[2] === '0');
  check('prefix/label escaped', !h.includes('<b>') && !h.includes('<i>'));
  check('automatic columns (max 4) and a 2-column grid on mobile', /repeat\(4, 1fr\)/.test(h) && /repeat\(2, 1fr\) !important/.test(h));
  check('animate=false → no script', !/<script/.test(php('COUNTERS', { items, animate: false })));
  check('duration capped (500..5000 ms)', /var dur=5000;/.test(php('COUNTERS', { items, animate: true, duration: 999999 })) && /var dur=500;/.test(php('COUNTERS', { items, animate: true, duration: 1 })));
  check('no script when there are no counters', !/<script/.test(php('COUNTERS', { items: [], animate: true })));

  // script in jsdom
  const single = php('COUNTERS', { animate: true, duration: 1000, items: [{ value: 1000, suffix: '+', label: 'x' }, { value: 4.5, decimals: 1 }] });
  let p = page(single);
  const els = () => [...p.doc.querySelectorAll('.cc-counter-value')];
  check('at start the counters begin at 0 (before entering the viewport)', els()[0].textContent === '0+' && els()[1].textContent === '0.0');
  p.see(); p.frame(0);
  p.frame(500);
  const mid = els()[0].textContent;
  check('mid-animation the value is intermediate (between 0 and 1,000)', /^\d{1,3}\+$/.test(mid) && mid !== '0+' && mid !== '1,000+', mid);
  p.frame(1500);
  check('at the end of the animation it returns EXACTLY the text computed by the server', els()[0].textContent === '1,000+' && els()[1].textContent === '4.5', els().map((e) => e.textContent).join(' | '));
  const tricky = php('COUNTERS', { animate: true, duration: 1000, items: [{ value: 2.675, decimals: 2 }] });
  p = page(tricky); p.see(); p.frame(0); p.frame(5000);
  check('at the end of the animation 2.675 stays "2.68" as computed by the server (toFixed would give 2.67)', p.doc.querySelector('.cc-counter-value').textContent === '2.68', p.doc.querySelector('.cc-counter-value').textContent);
  p = page(single, { reduced: true });
  check('prefers-reduced-motion: no animation, final value right away', [...p.doc.querySelectorAll('.cc-counter-value')][0].textContent === '1,000+');
  p = page(single, { withIO: false });
  check('without IntersectionObserver: final value (no counter stuck at 0)', [...p.doc.querySelectorAll('.cc-counter-value')][0].textContent === '1,000+');
  p = page(single);
  p.see(); p.frame(0);
  check('the animation runs only once per counter (unobserve)', p.pendingFrames() === 2);
}

// =============================================================== PROGRESS
section('PROGRESS');
{
  const h = php('PROGRESS', { height: 14, animate: true, items: [{ label: 'A', value: 90.55, color: '#10b981' }, { label: 'B', value: 150, color: 'bad;color' }, { label: 'C', value: -3 }, { label: 'D', value: 'x' }] });
  const d = $(h);
  const now = d('.cc-progress-track').map((_, e) => d(e).attr('aria-valuenow')).get();
  check('values clamped to 0–100 and rounded to 1 decimal', now.join(',') === '90.6,100,0,0', now.join(','));
  check('accessible bars: role=progressbar with valuemin/max/now and a label', d('[role="progressbar"]').length === 4 && d('[role="progressbar"]').first().attr('aria-label') === 'A' && d('[role="progressbar"]').first().attr('aria-valuemax') === '100');
  check('hostile color discarded, valid color kept', !/bad;color/.test(h) && /#10b981/.test(h));
  check('height clamped to 4..30', /height:30px/.test(php('PROGRESS', { height: 999, items: [{ label: 'x', value: 1 }] })) && /height:4px/.test(php('PROGRESS', { height: 0, items: [{ label: 'x', value: 1 }] })));
  check('showValue=false → no percentage', !/cc-progress-value/.test(php('PROGRESS', { showValue: false, items: [{ label: 'x', value: 5 }] })));
  const sc = php('PROGRESS', { animate: true, items: [{ label: 'A', value: 80 }, { label: 'B', value: 40 }] });
  let p = page(sc);
  const fills = () => [...p.doc.querySelectorAll('.cc-progress-fill')];
  check('with JS the bars start at 0%', fills().every((f) => f.style.width === '0%'));
  p.see(); p.frame(0);
  check('when they enter the viewport they fill to the real value', fills().map((f) => f.style.width).join(',') === '80%,40%', fills().map((f) => f.style.width).join(','));
  p = page(sc, { withIO: false });
  check('without IntersectionObserver: bars already at the real value', [...p.doc.querySelectorAll('.cc-progress-fill')].map((f) => f.style.width).join(',') === '80%,40%');
  p = page(sc, { reduced: true });
  check('prefers-reduced-motion: bars already at the real value', [...p.doc.querySelectorAll('.cc-progress-fill')].map((f) => f.style.width).join(',') === '80%,40%');
}

// =============================================================== TABLE
section('TABLE');
{
  const data = 'Nome | Età | Città\nAnna | 30 | Roma\nMarco | 41\nGiulia | 28 | Milano | extra';
  const h = php('TABLE', { data, caption: 'Persone', headerRow: true, striped: true, rowHeaders: true, stickyHeader: true, maxHeight: 300 }); const d = $(h);
  check('first row = header (<th scope="col">)', d('thead th[scope="col"]').map((_, e) => d(e).text()).get().join(',') === 'Nome,Età,Città,');
  check('ragged rows: all get the same number of cells (the widest wins)', d('tbody tr').map((_, e) => d(e).children().length).get().join(',') === '4,4,4');
  check('first column as row header (<th scope="row">)', d('tbody th[scope="row"]').length === 3);
  check('caption present', d('caption').text() === 'Persone');
  check('alternating (zebra) rows only on odd rows', d('tbody tr').map((_, e) => d(e).attr('style') || '').get().join('|') === '|background:#f8fafc;|');
  check('sticky header with max height → inner scroll', /max-height:300px/.test(h) && /position:sticky/.test(h));
  check('without maxHeight the sticky header doesn\'t create a scroll container', !/max-height/.test(php('TABLE', { data, stickyHeader: true, maxHeight: 0 })));
  check('wrapper with horizontal scroll (responsive)', /overflow-x:auto/.test(h));
  const tsv = $(php('TABLE', { data: 'a\tb\n\n  c | d  \n', headerRow: false }));
  check('mixed separators (| and tab), empty rows ignored, spaces trimmed', tsv('tbody tr').length === 2 && tsv('tr').first().children().first().text() === 'a' && tsv('tr').last().children().first().text() === 'c' && tsv('thead').length === 0);
  check('empty data → no table (and no error)', $(php('TABLE', { data: '' }))('table').length === 0);
  const xss = php('TABLE', { data: 'H\n<script>alert(1)</script> | <img src=x onerror=a>' });
  check('cells are escaped (no HTML injection)', !/<script|<img/.test(xss) && xss.includes('&lt;script&gt;'));
  check('zebra can be turned off / borders / compact', !/background:#f8fafc/.test(php('TABLE', { data: 'a\nb\nc\nd', headerRow: false, striped: false })) && /border:1px solid #e2e8f0/.test(php('TABLE', { data: 'a\nb', bordered: true })) && /padding:6px 10px/.test(php('TABLE', { data: 'a\nb', compact: true })));
}

// =============================================================== COUNTDOWN
section('COUNTDOWN');
{
  const t = (c) => $(php('COUNTDOWN', c))('.cc-countdown').attr('data-target');
  check('visitor\'s local time: date without time zone', t({ datetime: '2030-06-15T18:30', utcOffset: 'local' }) === '2030-06-15T18:30');
  check('fixed time zone: ISO with offset', t({ datetime: '2030-06-15T18:30', utcOffset: '+02:00' }) === '2030-06-15T18:30:00+02:00');
  check('invalid date → default date (no error)', t({ datetime: 'ieri' }) === '2030-01-01T00:00');
  check('invalid offset → local time', t({ datetime: '2030-06-15T18:30', utcOffset: '+2' }) === '2030-06-15T18:30');
  const inj = php('COUNTDOWN', { datetime: '2030-01-01T00:00', utcOffset: '"><script>x</script>' });
  check('injection in the time zone rejected: the hostile string doesn\'t appear and the zone falls back to "local"', !inj.includes('"><script>x') && !inj.includes('x</script>') && $(inj)('.cc-countdown').attr('data-target') === '2030-01-01T00:00');
  const d = $(php('COUNTDOWN', { datetime: '2030-06-15T18:30', utcOffset: '+02:00', showSeconds: false }));
  check('showSeconds=false → 3 units', d('.cc-cd-unit').length === 3 && d('[data-unit="seconds"]').length === 0);
  check('date readable without JS: <time datetime> with date and UTC', d('time').attr('datetime') === '2030-06-15T18:30:00+02:00' && d('time').text() === '2030-06-15 18:30 UTC+02:00');
  check('role="timer" and no live region (doesn\'t announce every second)', d('[role="timer"]').length === 1 && !/aria-live/.test(php('COUNTDOWN', {})));

  const html = php('COUNTDOWN', { datetime: '2030-01-01T00:00', utcOffset: 'local', endAction: 'message', endMessage: 'Fatto!' });
  const local = (y, mo, da, h, mi, s) => new Date(y, mo - 1, da, h, mi, s).getTime();
  let p = page(html, { now: local(2029, 12, 30, 22, 58, 57) });
  const num = (u) => p.doc.querySelector(`[data-unit="${u}"]`).textContent;
  check('correct computation: 1 d 1 h 1 m 3 s to New Year', [num('days'), num('hours'), num('minutes'), num('seconds')].join(':') === '01:01:01:03', [num('days'), num('hours'), num('minutes'), num('seconds')].join(':'));
  p.state.now += 1000; p.tick();
  check('after 1 second: 1 d 1 h 1 m 2 s', [num('days'), num('hours'), num('minutes'), num('seconds')].join(':') === '01:01:01:02');
  p.state.now = local(2029, 12, 31, 23, 59, 59); p.tick();
  check('day/hour/minute rollover: 00:00:00:01', [num('days'), num('hours'), num('minutes'), num('seconds')].join(':') === '00:00:00:01');
  check('before the deadline the final message is hidden', p.doc.querySelector('.cc-cd-done').hidden === true);
  p.state.now = local(2030, 1, 1, 0, 0, 0); p.tick();
  check('at the deadline: resets to zero, stops the timer, shows the message and hides the numbers', [num('days'), num('seconds')].join(':') === '00:00' && p.cleared() === 1 && p.doc.querySelector('.cc-cd-done').hidden === false && p.doc.querySelector('.cc-cd-units').style.display === 'none');
  p = page(html, { now: local(2031, 5, 5, 5, 5, 5) });
  check('page opened AFTER the deadline: final message right away', p.doc.querySelector('.cc-cd-done').hidden === false);
  p = page(php('COUNTDOWN', { datetime: '2030-01-01T00:00', endAction: 'hide', endMessage: 'x' }), { now: local(2031, 1, 1, 0, 0, 0) });
  check('endAction=hide: the block disappears', p.doc.querySelector('.cc-countdown').style.display === 'none');
  p = page(php('COUNTDOWN', { datetime: '2030-01-01T00:00', endAction: 'message', endMessage: '' }), { now: local(2031, 1, 1, 0, 0, 0) });
  check('empty final message: the zeros stay (no empty block)', p.doc.querySelector('.cc-cd-units').style.display !== 'none' && p.doc.querySelector('.cc-cd-done').hidden === true);
  // fixed time zone: independent of the visitor's time zone
  p = page(php('COUNTDOWN', { datetime: '2030-06-15T18:30', utcOffset: '+02:00' }), { now: Date.parse('2030-06-15T16:29:50Z') });
  check('fixed time zone: 18:30 at +02:00 = 16:30 UTC → 10 s left', [num('minutes'), num('seconds')].join(':') === '00:10');
  p = page(php('COUNTDOWN', { datetime: '2030-06-15T18:30', utcOffset: '-05:00' }), { now: Date.parse('2030-06-15T23:29:50Z') });
  check('negative time zone: 18:30 at -05:00 = 23:30 UTC → 10 s left', [num('minutes'), num('seconds')].join(':') === '00:10');
  p = page(php('COUNTDOWN', { datetime: '2030-06-15T18:30', utcOffset: '+00:00' }), { now: Date.parse('2030-06-14T18:30:00Z') });
  check('over 99 days/hours to a distant date: 3-digit days not truncated', num('days') === '01');
  p = page(php('COUNTDOWN', { datetime: '2030-01-01T00:00', utcOffset: '+00:00' }), { now: Date.parse('2029-01-01T00:00:00Z') });
  check('at 365 days: "365" (not truncated to 2 digits)', num('days') === '365');
}

// =============================================================== TIMELINE
section('TIMELINE');
{
  const items = [{ date: '2021', title: 'A', text: 'x' }, { date: '', title: 'B' }, { date: '2023', title: 'C', text: 'z' }];
  const left = php('TIMELINE', { layout: 'left', items }); const d = $(left);
  check('ordered list with one <li> per event, dots hidden from screen readers', d('ol.cc-timeline').length === 1 && d('li.cc-tl-item').length === 3 && d('.cc-tl-dot[aria-hidden="true"]').length === 3);
  check('date and text optional (omitted when empty)', d('.cc-tl-date').length === 2 && d('.cc-tl-text').length === 2);
  check('left layout: no alternating arrangement', !/min-width:769px/.test(left));
  check('alternating layout: only from 769px up (stays left on mobile)', /@media\(min-width:769px\)/.test(php('TIMELINE', { layout: 'alternate', items })));
  check('text escaped', !php('TIMELINE', { items: [{ title: '<img src=x onerror=a>' }] }).includes('<img'));
}

// =============================================================== LOGOS
section('LOGOS');
{
  const logos = [{ src: 'a.png', alt: 'A', href: 'https://a.example' }, { src: 'b.png', alt: 'B', href: '' }, { src: 'c.png', alt: 'C', href: 'chi-siamo/index.html' }];
  const g = php('LOGOS', { layout: 'grid', title: 'Clienti', logos }); const d = $(g);
  check('grid: no duplicates, one image per logo', d('img').length === 3 && d('[aria-hidden="true"]').length === 0);
  check('logos with a link are <a rel="noopener">, the others <div>', d('a.cc-logo-item[rel="noopener"]').length === 2 && d('div.cc-logo-item').length === 1);
  check('internal link resolved with BASE_URL', d('a.cc-logo-item').last().attr('href') === '{{BASE_URL}}chi-siamo/');
  check('title shown; columns on mobile capped at 3', d('.cc-logos-title').text() === 'Clienti' && /repeat\(3, 1fr\) !important/.test(php('LOGOS', { columns: 8, logos })));
  check('grayscale, back to color on hover/focus', /filter:grayscale\(1\)/.test(g) && /:hover img/.test(g) && /:focus-visible img/.test(g));
  const m = php('LOGOS', { layout: 'marquee', speed: 20, logos }); const dm = $(m);
  check('marquee: two sets, the second hidden from screen readers', dm('.cc-logos-set').length === 2 && dm('.cc-logos-set').last().attr('aria-hidden') === 'true');
  check('the duplicate set is not keyboard-reachable (tabindex=-1, empty alt)', dm('.cc-logos-set[aria-hidden="true"] a').toArray().every((a) => dm(a).attr('tabindex') === '-1') && dm('.cc-logos-set[aria-hidden="true"] img').toArray().every((i) => dm(i).attr('alt') === ''));
  check('CSS animation with a unique name per block and the chosen speed', /@keyframes ccMq_tb/.test(m) && /ccMq_tb 20s linear infinite/.test(m));
  check('pause on hover and prefers-reduced-motion (no motion, no duplicates)', /animation-play-state:paused/.test(m) && /prefers-reduced-motion:reduce/.test(m) && /\.cc-logos-set\[aria-hidden="true"\]\{display:none\}/.test(m));
  check('speed clamped to 10..120 s', /ccMq_tb 120s/.test(php('LOGOS', { layout: 'marquee', speed: 9999, logos })) && /ccMq_tb 10s/.test(php('LOGOS', { layout: 'marquee', speed: 1, logos })));
  check('the strip moves with CSS alone (its script only repeats logos to fill the line); the grid has no script', /@keyframes ccMq_/.test(m.replace(/<script>[\s\S]*?<\/script>/g, '')) && [...m.matchAll(/<script>/g)].length === 1 && !/<script/.test(g));
  check('a "javascript:" URL in the logo link does not become an executable link', !/href="javascript:/i.test(php('LOGOS', { logos: [{ src: 'a.png', alt: 'x', href: 'javascript:alert(1)' }] })));
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
  check('photo present → <img> with alt = name', d('img[src="anna.jpg"]').attr('alt') === 'Anna Rossi');
  const ini = d('.cc-member-initials').map((_, e) => d(e).text()).get();
  check('no photo: initials of the first two names (accented/emoji too, without mbstring)', ini.join('|') === 'ém|m||😀Z', ini.join('|'));
  check('initials are uppercased by CSS (not by PHP)', /text-transform:uppercase/.test(h));
  check('valid email → mailto:, invalid → no link', d('a[href="mailto:anna@example.com"]').length === 1 && !/non-una-email/.test(h));
  check('social link without scheme → https:// (linkedin.com/in/anna)', d('a[href="https://linkedin.com/in/anna"]').length === 1 && d('a[href="https://x.com/anna"]').length === 1 && d('a[href="https://example.com"]').length === 1);
  check('links with aria-label "Name - Service" and rel=noopener', d('a[aria-label="Anna Rossi - LinkedIn"][rel="noopener"]').length === 1);
  check('automatic columns max 4; 2 on mobile, 1 on small screens', /repeat\(4, 1fr\)/.test(h) && /repeat\(2, 1fr\) !important/.test(h) && /max-width:480px/.test(h));
  check('photo shape: circle/rounded/square', /border-radius:50%/.test(php('TEAM', { members: [{ name: 'a' }], photoShape: 'circle' })) && /border-radius:16px/.test(php('TEAM', { members: [{ name: 'a' }], photoShape: 'rounded' })) && /border-radius:0;/.test(php('TEAM', { members: [{ name: 'a' }], photoShape: 'square' })));
  check('"javascript:" in a social field does not become an executable link', !/href="javascript:/i.test(php('TEAM', { members: [{ name: 'a', linkedin: 'javascript:alert(1)', website: 'javascript:alert(2)' }] })));
  check('name/role/bio escaped', !php('TEAM', { members: [{ name: '<img src=x onerror=a>', role: '<b>', bio: '<script>' }] }).match(/<img|<b>|<script/));
}

// =============================================================== BEFORE / AFTER
section('BEFORE_AFTER');
{
  const h = php('BEFORE_AFTER', { startPosition: 30, aspectRatio: '4 / 3', before: { src: 'b.jpg', alt: 'Prima', label: 'Prima' }, after: { src: 'a.jpg', alt: 'Dopo', label: 'Dopo' } }); const d = $(h);
  check('start position in the CSS (--pos) and on the slider', /--pos:30%/.test(h) && d('input.cc-ba-range').attr('value') === '30');
  check('accessible slider: range input with a label, 0–100', d('input[type="range"][aria-label="Comparison slider"]').attr('min') === '0' && d('input[type="range"]').attr('max') === '100');
  check('"before" is the clipped part, "after" sits underneath', d('.cc-ba-before img').attr('src') === 'b.jpg' && d('img.cc-ba-after').attr('src') === 'a.jpg' && /clip-path:inset\(0 calc\(100% - var\(--pos\)\) 0 0\)/.test(h));
  check('Before/After labels (can be turned off)', d('.cc-ba-label').length === 2 && $(php('BEFORE_AFTER', { showLabels: false, before: { src: 'b' }, after: { src: 'a' } }))('.cc-ba-label').length === 0);
  check('start position clamped to 0–100', /--pos:100%/.test(php('BEFORE_AFTER', { startPosition: 999, before: { src: 'b' }, after: { src: 'a' } })) && /--pos:0%/.test(php('BEFORE_AFTER', { startPosition: -5, before: { src: 'b' }, after: { src: 'a' } })));
  check('the handle doesn\'t capture the mouse (you drag the slider underneath)', /pointer-events:none/.test(h));
  const p = page(h);
  const root = p.doc.querySelector('.cc-ba'); const r = p.doc.querySelector('.cc-ba-range');
  check('script: on start sets --pos from the slider', root.style.getPropertyValue('--pos') === '30%');
  r.value = '72.5'; r.dispatchEvent(new p.dom.window.Event('input', { bubbles: true }));
  check('script: moving the slider updates --pos', root.style.getPropertyValue('--pos') === '72.5%', root.style.getPropertyValue('--pos'));
  r.value = '0'; r.dispatchEvent(new p.dom.window.Event('input', { bubbles: true }));
  check('script: far left 0%', root.style.getPropertyValue('--pos') === '0%');
}

// =============================================================== BUSINESS
section('BUSINESS');
{
  const hours = [{ day: 'Lunedì', open: '08:00', close: '19:00' }, { day: 'Martedì', closed: true }, { day: 'Mercoledì', open: 'x', close: 'y' }, { day: 'Giovedì', open: '09:00', close: '13:30' }];
  const base = { name: 'Bar "Roma" & C.', businessType: 'CafeOrCoffeeShop', address: 'Via Roma 1\n00100 Roma', phone: '+39 (06) 123-4567', email: 'info@bar.example', website: 'bar.example/it', hours, closedLabel: 'Chiuso', directionsLabel: 'Indicazioni', note: 'Festivi chiuso' };
  const h = php('BUSINESS', base); const d = $(h);
  const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  check('exactly one JSON-LD block', ld.length === 1);
  const j = JSON.parse(ld[0][1]);
  check('valid JSON-LD: type, name, address, phone, email, url', j['@context'] === 'https://schema.org' && j['@type'] === 'CafeOrCoffeeShop' && j.name === 'Bar "Roma" & C.' && j.address.streetAddress === 'Via Roma 1, 00100 Roma' && j.telephone === '+39061234567' && j.email === 'info@bar.example' && j.url === 'https://bar.example/it', JSON.stringify(j));
  check('structured hours only for valid, open days (Mon and Thu), with the right day', JSON.stringify(j.openingHoursSpecification.map((s) => [s.dayOfWeek, s.opens, s.closes])) === JSON.stringify([['Monday', '08:00', '19:00'], ['Thursday', '09:00', '13:30']]), JSON.stringify(j.openingHoursSpecification));
  check('the day label is free text (Lunedì) but the JSON-LD uses schema.org names', d('th[scope="row"]').first().text() === 'Lunedì' && j.openingHoursSpecification[0].dayOfWeek === 'Monday');
  const cells = d('.cc-biz-table tr').map((_, e) => d(e).find('td').text()).get();
  check('rows: hours, closed, invalid hours → closed, hours', cells.join('|') === '08:00–19:00|Chiuso|Chiuso|09:00–13:30', cells.join('|'));
  check('phone: tel: link with digits and + only', d('a[href="tel:+39061234567"]').length === 1);
  check('multi-line address (<br>) in an <address>', d('address').html().includes('Via Roma 1<br>00100 Roma'));
  check('directions: encoded Google Maps URL', d('a.cc-biz-directions').attr('href') === 'https://www.google.com/maps/search/?api=1&query=Via%20Roma%201%2C%2000100%20Roma', d('a.cc-biz-directions').attr('href'));
  check('website without scheme → https://, shown without scheme', d('a[href="https://bar.example/it"]').text() === 'bar.example/it');
  check('note shown; hours title customizable', d('.cc-biz-note').text() === 'Festivi chiuso' && d('.cc-biz-hours-title').text() === 'Opening hours');

  // a name that tries to close the <script> must not be able to inject code
  const inj = php('BUSINESS', { name: '</script><script>alert(1)</script><img src=x onerror=a>', address: 'a', hours: [] });
  const scripts = [...inj.matchAll(/<script/g)].length;
  check('name with "</script><script>": a single <script> (no injection)', scripts === 1 && !/<script>alert/.test(inj), `script=${scripts}`);
  const ij = JSON.parse([...inj.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)][0][1]);
  check('…and the name stays intact in the JSON (only escaped)', ij.name === '</script><script>alert(1)</script><img src=x onerror=a>');
  check('…the visible text is escaped', !/<img src=x/.test(inj.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')));

  check('jsonLd=false → no script', !/<script/.test(php('BUSINESS', { ...base, jsonLd: false })));
  check('no name → no JSON-LD (incomplete data is not published)', !/<script/.test(php('BUSINESS', { address: 'x', hours })));
  check('type not in the list → LocalBusiness', JSON.parse([...php('BUSINESS', { ...base, businessType: 'Evil<Type>' }).matchAll(/ld\+json">([\s\S]*?)<\/script>/g)][0][1])['@type'] === 'LocalBusiness');
  const min = $(php('BUSINESS', { name: '', address: '', phone: '', email: 'sbagliata', hours: [] }));
  check('all empty/invalid: no links, no errors, no table', min('a').length === 0 && min('table').length === 0);
  check('mapsLink=false → no directions button', $(php('BUSINESS', { ...base, mapsLink: false }))('a.cc-biz-directions').length === 0);
  check('at most 7 days', $(php('BUSINESS', { name: 'x', hours: Array.from({ length: 12 }, (_, i) => ({ day: 'g' + i, open: '09:00', close: '10:00' })) }))('.cc-biz-table tr').length === 7);
  check('collapses to one column on mobile', /grid-template-columns:1fr !important/.test(h));
}

// =============================================================== BENTO
section('BENTO');
{
  const h = php('BENTO', { columns: 3, tiles: [
    { size: 'large', title: 'Big', image: 'big.jpg', alt: 'A photo', href: 'chi-siamo/index.html' },
    { size: 'wide', title: 'Wide' }, { size: 'tall', title: 'Tall' }, { size: 'evil', title: 'Normal' } ] });
  const d = $(h);
  const tiles = d('.cc-bento-tile');
  check('one tile per item, in order', tiles.length === 4 && tiles.map((_, e) => d(e).find('.cc-bento-title').text()).get().join() === 'Big,Wide,Tall,Normal');
  check('sizes become grid spans (large 2×2, wide 2×1, tall 1×2, unknown → 1×1)', ['span 2; grid-row:span 2', 'span 2; grid-row:span 1', 'span 1; grid-row:span 2', 'span 1; grid-row:span 1'].every((x, i) => (tiles.eq(i).attr('style') || '').includes('grid-column:' + x)));
  check('a tile with a link is an <a> to the internal page, the others are <div>', tiles.eq(0).is('a') && tiles.eq(0).attr('href') === '{{BASE_URL}}chi-siamo/' && tiles.eq(1).is('div'));
  check('an image tile has the photo with its alt text and white text over a shade', d('.cc-bento-img').attr('alt') === 'A photo' && d('.cc-bento-shade').length === 1 && /color:#ffffff/.test(tiles.eq(0).attr('style')));
  check('without an image the text is dark', /color:#0f172a/.test(tiles.eq(1).attr('style')));
  const bad = php('BENTO', { columns: 9, rowHeight: 20, gap: 500, hover: 'evil', tiles: [{ title: '<img src=x onerror=a>', image: 'javascript:alert(1)', href: 'javascript:alert(2)', bg: 'red;}x{', color: 'url(x)' }, 'junk', null] });
  check('out-of-range layout values are clamped (4 columns, 100px rows, 48px gap), unknown hover → lift', /repeat\(4, 1fr\)/.test(bad) && /minmax\(100px, auto\)/.test(bad) && /gap:48px/.test(bad) && /cc-bento-hover-lift/.test(bad));
  check('hostile tile: text escaped, no javascript: image or link, unsafe colors replaced', !/<img src=x/.test(bad) && !/src="javascript:/i.test(bad) && !/href="javascript:/i.test(bad) && !/red;\}/.test(bad) && !/url\(x\)/.test(bad));
  check('non-object tiles are skipped', $(bad)('.cc-bento-tile').length === 1);
  check('stacks to 2 columns on tablets and 1 on phones, without spans', /max-width:768px\)\{#tb \.cc-bento-grid\{grid-template-columns:repeat\(2, 1fr\)/.test(h) && /grid-column:auto !important;grid-row:auto !important/.test(h));
  check('hover motion is switched off for visitors who prefer reduced motion', /prefers-reduced-motion:reduce/.test(h));
}

// =============================================================== SPLIT_CTA
section('SPLIT_CTA');
{
  const d = $(php('SPLIT_CTA', { left: { title: 'L', text: 'Left text', buttonText: 'Go', buttonUrl: 'contatti/index.html' }, right: { title: 'R', buttonText: '' } }));
  check('two sides, left then right', d('.cc-split-cta-side').length === 2 && d('.cc-split-cta-side').eq(0).hasClass('cc-split-cta-left') && d('.cc-split-cta-side').eq(1).hasClass('cc-split-cta-right'));
  check('a button only where it has text, linking to the internal page', d('.cc-split-cta-btn').length === 1 && d('.cc-split-cta-btn').attr('href') === '{{BASE_URL}}contatti/');
  const bad = php('SPLIT_CTA', { gap: 999, left: { title: '<script>x</script>', bg: 'expression(alert(1))', buttonText: 'B', buttonUrl: 'javascript:alert(1)' }, right: 'junk' });
  check('hostile values: title escaped, unsafe color replaced by the default, no javascript: link, gap clamped', !/<script>x/.test(bad) && !/expression/.test(bad) && !/href="javascript:/i.test(bad) && /gap:48px/.test(bad) && /background:#0f172a/.test(bad));
  check('a side that is not an object still renders (empty, with its default colors)', $(bad)('.cc-split-cta-right').length === 1 && /background:#eff6ff/.test(bad));
  check('stacks vertically on mobile', /flex-direction:column !important/.test(bad));
}

// =============================================================== CASE_STUDY
section('CASE_STUDY');
{
  const full = { image: 'case.jpg', alt: 'The team', logo: 'logo.svg', client: 'ACME', metric: '+240%', metricLabel: 'traffic', title: 'T', text: 'S', quote: 'Great', quoteAuthor: 'Jane', linkText: 'Read', linkUrl: 'https://example.com/case', accent: '#10b981' };
  const d = $(php('CASE_STUDY', full));
  check('image with alt text, client logo and name, metric with label', d('.cc-case-media img').attr('alt') === 'The team' && d('.cc-case-client img').attr('src') === 'logo.svg' && d('.cc-case-client').text() === 'ACME' && d('.cc-case-metric-value').text() === '+240%' && d('.cc-case-metric-label').text() === 'traffic');
  check('quote with its author in a <cite>, and the link', d('blockquote.cc-case-quote cite').text() === '— Jane' && d('a.cc-case-link').attr('href') === 'https://example.com/case' && d('a.cc-case-link').text() === 'Read →');
  check('the accent color is used for the metric, the quote border and the link', (php('CASE_STUDY', full).match(/#10b981/g) || []).length === 3);
  const min = $(php('CASE_STUDY', { title: 'Only' }));
  check('only what is filled in is shown (no image, logo, metric, quote or link)', min('.cc-case-media, .cc-case-client, .cc-case-metric, .cc-case-quote, .cc-case-link').length === 0 && min('.cc-case-title').text() === 'Only');
  const bad = php('CASE_STUDY', { image: 'javascript:alert(1)', logo: 'data:text/html,x', accent: 'red;}', title: '<img src=x onerror=a>', linkText: 'L', linkUrl: 'javascript:alert(2)' });
  check('hostile values: no javascript:/data:text images, no javascript: link, text escaped, accent falls back to the brand color', !/javascript:/i.test(bad.replace(/\{\{BASE_URL\}\}javascript:alert\(2\)/, '')) && !/data:text/.test(bad) && !/<img src=x/.test(bad) && /var\(--brand-color, #3b82f6\)/.test(bad));
  check('image above the text with layout=vertical, and on mobile', /flex-direction:column; background:#fff/.test(php('CASE_STUDY', { ...full, layout: 'vertical' })) && /\.cc-case-card\{flex-direction:column !important\}/.test(php('CASE_STUDY', full)));
}

// =============================================================== AUTHOR_BIO
section('AUTHOR_BIO');
{
  const d = $(php('AUTHOR_BIO', { label: 'About', name: 'Alex Morgan', role: 'Editor', bio: 'Line one\nLine two', photo: 'alex.jpg', links: [{ label: 'Site', url: 'example.com' }, { label: 'Mail', url: 'alex@example.com' }, { label: '', url: 'nolabel.example' }, { label: 'Nothing', url: '' }] }));
  check('photo with the name as alt text, label, name and role', d('img.cc-author-photo').attr('alt') === 'Alex Morgan' && d('.cc-author-label').text() === 'About' && d('.cc-author-name').text() === 'Alex Morgan' && d('.cc-author-role').text() === 'Editor');
  check('bio keeps its line breaks', d('.cc-author-bio').html() === 'Line one<br>Line two');
  check('links: website → https://, email → mailto:, links without label or address are skipped', d('a.cc-author-link').map((_, e) => d(e).attr('href')).get().join() === 'https://example.com,mailto:alex@example.com');
  const init = $(php('AUTHOR_BIO', { name: 'Alex Morgan', photo: '' }));
  check('without a photo: initials', init('.cc-author-initials').text() === 'AM' && init('img').length === 0);
  const bad = php('AUTHOR_BIO', { name: '<b>x</b>', bio: '<script>a</script>', photo: 'vbscript:x', links: [{ label: 'Bad', url: 'javascript:alert(1)' }, 'junk'] });
  check('hostile values: escaped, no vbscript: photo, no javascript: link', !/<b>x/.test(bad) && !/<script>a/.test(bad) && !/vbscript/.test(bad) && !/href="javascript:/i.test(bad));
  check('centered layout without the card', (() => { const h = php('AUTHOR_BIO', { name: 'x', layout: 'centered', boxed: false }); return /flex-direction:column; align-items:center/.test(h) && !/background:#f8fafc/.test(h); })());
}

// =============================================================== LOGOS strip: direction and fading edges
section('LOGOS strip options');
{
  const logos = [{ src: 'a.png', alt: 'A' }, { src: 'b.png', alt: 'B' }];
  const old = php('LOGOS', { layout: 'marquee', speed: 30, logos });
  check('a strip saved before these options renders as before (left, no fade)', /linear infinite\}/.test(old) && !/mask-image/.test(old));
  const r = php('LOGOS', { layout: 'marquee', speed: 30, direction: 'right', fade: true, logos });
  check('direction right: the same loop plays in reverse', /linear infinite reverse\}/.test(r));
  check('fade: the edges are masked, and the mask is removed when motion is reduced', /\.cc-logos-marquee\{-webkit-mask-image:linear-gradient\(90deg/.test(r) && /prefers-reduced-motion:reduce\)\{[^@]*-webkit-mask-image:none;mask-image:none/.test(r));
  check('only the exact values switch the options on (direction "up", fade "yes" → off)', (() => { const h = php('LOGOS', { layout: 'marquee', direction: 'up', fade: 'yes', logos }); return !/reverse/.test(h) && !/mask-image/.test(h); })());
  check('the grid layout ignores both options', !/reverse|mask-image/.test(php('LOGOS', { layout: 'grid', direction: 'right', fade: true, logos })));
}

// =============================================================== LOGOS strip: logos repeat to cover the strip
section('LOGOS strip fill (published script and editor canvas)');
{
  // jsdom has no layout: every logo is 60px wide (+ the 40px gap = 100px), the strip is `box` px wide
  const stripPage = (html, { box = 1000, reduced = false, loaded = true, io = false } = {}) => {
    const ros = []; const ios = [];
    const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
      runScripts: 'dangerously',
      beforeParse(win) {
        win.matchMedia = () => ({ matches: reduced });
        win.ResizeObserver = class { constructor(cb) { this.cb = cb; ros.push(this); } observe() {} disconnect() {} };
        if (io) win.IntersectionObserver = class { constructor(cb, o) { this.cb = cb; this.o = o; ios.push(this); } observe() {} disconnect() { this.off = true; } };
        const rect = win.HTMLElement.prototype.getBoundingClientRect;
        win.HTMLElement.prototype.getBoundingClientRect = function () { return this.classList.contains('cc-logo-item') ? { width: win.__w, height: 48, left: 0, right: win.__w, top: 0, bottom: 48 } : rect.call(this); };
        win.__w = 60;
        Object.defineProperty(win.HTMLElement.prototype, 'clientWidth', { get() { return this.classList.contains('cc-logos-marquee') ? win.__box : 0; } });
        Object.defineProperty(win.HTMLImageElement.prototype, 'complete', { get() { return win.__loaded; } });   // jsdom never loads images
        win.__box = box; win.__loaded = loaded;
      },
    });
    return { win: dom.window, doc: dom.window.document, ros, ios };
  };
  const logos = [{ src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'A', href: 'https://a.example' }, { src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'B' }];
  const content = { layout: 'marquee', speed: 30, logos };
  const sets = (doc) => [...doc.querySelectorAll('.cc-logos-set')];

  const p = stripPage(php('LOGOS', content));
  const [s1, s2] = sets(p.doc);
  check('published: 2 logos in a 1000px strip are repeated until a set covers it (10 per set)', s1.children.length === 10 && s2.children.length === 10, `${s1.children.length}/${s2.children.length}`);
  check('…the loop time grows with the copies, so the speed stays the same (30s × 5 = 150s)', p.doc.querySelector('.cc-logos-track').style.animationDuration === '150s', p.doc.querySelector('.cc-logos-track').style.animationDuration);
  const copies = [...s1.querySelectorAll('.cc-logo-fill')];
  check('…the copies are hidden from screen readers and the keyboard, with empty alt text', copies.length === 8 && copies.every((c) => c.getAttribute('aria-hidden') === 'true' && c.querySelector('img').getAttribute('alt') === '') && copies.filter((c) => c.tagName === 'A').every((c) => c.getAttribute('tabindex') === '-1'));
  check('…copies load their image at once (not lazily), so they never pop in while moving', copies.every((c) => !c.querySelector('img').hasAttribute('loading')));
  const near = stripPage(php('LOGOS', content), { io: true });
  const lazyCount = (d) => d.querySelectorAll('.cc-logos-track img[loading="lazy"]').length;
  const lazyBefore = lazyCount(near.doc);
  near.ios[0].cb([{ isIntersecting: true }]);
  check('…the strip\'s logos stay lazy until it comes within 200px of the view, then all load at once (both sets)', lazyBefore === 4 && lazyCount(near.doc) === 0 && near.ios[0].o.rootMargin === '200px' && near.ios[0].off === true, `${lazyBefore} → ${lazyCount(near.doc)}`);
  check('…the original logos keep their alt text and order', s1.children[0].querySelector('img').getAttribute('alt') === 'A' && s1.children[1].querySelector('img').getAttribute('alt') === 'B');
  p.win.__box = 1500; p.ros[0].cb();
  check('…when the strip gets wider, more copies are added', sets(p.doc)[0].children.length === 16 && p.doc.querySelector('.cc-logos-track').style.animationDuration === '240s');
  p.win.__box = 300; p.ros[0].cb();
  check('…and when it gets narrower the extra copies are removed from both sets, with the speed adjusted', sets(p.doc)[0].children.length === 4 && sets(p.doc)[1].children.length === 4 && p.doc.querySelector('.cc-logos-track').style.animationDuration === '60s' && sets(p.doc)[0].children[0].querySelector('img').getAttribute('alt') === 'A');

  const slow = stripPage(php('LOGOS', content), { loaded: false });
  check('published: while the logos are still loading nothing is added (their width is unknown)', sets(slow.doc)[0].children.length === 2);
  slow.win.__loaded = true; slow.doc.querySelector('.cc-logos-set img').dispatchEvent(new slow.win.Event('load'));
  check('…and the strip is filled as soon as they have loaded', sets(slow.doc)[0].children.length === 10);
  // measured too early (logos without their size yet: groups look 80px wide → 13 copies), corrected when they load
  const early = stripPage(php('LOGOS', content), { loaded: true }, 0);
  early.win.__w = 0; early.ros[0].cb();
  const tooMany = sets(early.doc)[0].children.length;
  early.win.__w = 60; early.doc.querySelector('.cc-logos-set img').dispatchEvent(new early.win.Event('load'));
  check('published: copies added before the logos had their size are removed once they load (no slow crawl)', tooMany === 26 && sets(early.doc)[0].children.length === 10 && sets(early.doc)[1].children.length === 10 && early.doc.querySelector('.cc-logos-track').style.animationDuration === '150s', `${tooMany} → ${sets(early.doc)[0].children.length}`);

  const wide = stripPage(php('LOGOS', content), { box: 150 });
  check('published: logos that already cover the strip are not repeated', sets(wide.doc)[0].children.length === 2 && wide.doc.querySelector('.cc-logos-track').style.animationDuration === '30s');
  const still = stripPage(php('LOGOS', content), { reduced: true });
  check('published: nothing is added for visitors who prefer reduced motion', sets(still.doc)[0].children.length === 2);
  check('published: the grid layout has no script', !/<script/.test(php('LOGOS', { ...content, layout: 'grid' })));
  check('published: a strip without logos has no script', !/<script/.test(php('LOGOS', { ...content, logos: [] })));
  check('published: the speed in the script is the clamped number from the block', /var dur=120,/.test(php('LOGOS', { ...content, speed: '9999' })) && /var dur=30,/.test(php('LOGOS', { ...content, speed: 'x;alert(1)' })));

  // the editor canvas: renderBlock (no script) + fillLogosMarquee()
  const c = stripPage(js('LOGOS', content));
  const stop = fillLogosMarquee(c.doc.querySelector('.cc-logos'), 30);
  check('canvas: same result as the published page (10 per set, 150s)', sets(c.doc)[0].children.length === 10 && sets(c.doc)[1].children.length === 10 && c.doc.querySelector('.cc-logos-track').style.animationDuration === '150s');
  stop();
  fillLogosMarquee(c.doc.querySelector('.cc-logos'), 30);
  check('canvas: running again over a filled strip keeps the speed (copies are not counted as originals)', sets(c.doc)[0].children.length === 10 && c.doc.querySelector('.cc-logos-track').style.animationDuration === '150s', c.doc.querySelector('.cc-logos-track').style.animationDuration);
  check('canvas: speed values are read like the compiler does', marqueeSpeed('45') === 45 && marqueeSpeed(5) === 10 && marqueeSpeed(500) === 120 && marqueeSpeed('abc') === 30 && marqueeSpeed('') === 30 && marqueeSpeed(null) === 30);
}

// =============================================================== REVIEW_SUMMARY
section('REVIEW_SUMMARY');
{
  const dist = [{ stars: 5, count: 75 }, { stars: 4, count: 20 }, { stars: 3, count: 5 }, { stars: 2, count: 0 }, { stars: 1, count: 0 }];
  const d = $(php('REVIEW_SUMMARY', { title: 'Rating', average: 4.76, total: 1280, totalLabel: 'reviews', source: 'Google', distribution: dist }));
  check('average with one decimal, total with thousands separator, label and source', d('.cc-rs-average').text() === '4.8' && d('.cc-rs-total').text() === '1,280 reviews' && d('.cc-rs-source').text() === 'Google');
  check('stars: an accessible label and a fill proportional to the average (4.76/5 = 95.2%)', d('.cc-rs-stars').attr('role') === 'img' && d('.cc-rs-stars').attr('aria-label') === '4.8 out of 5 stars' && /width:95\.2%/.test(d('.cc-rs-stars-fill').attr('style')));
  check('one bar per row, widths are each row\'s share of all reviews', d('.cc-rs-row').length === 5 && /width:75\.0%/.test(d('.cc-rs-bar-fill').eq(0).attr('style')) && /width:0\.0%/.test(d('.cc-rs-bar-fill').eq(4).attr('style')));
  check('percentages next to the bars by default', d('.cc-rs-row-value').map((_, e) => d(e).text()).get().join() === '75%,20%,5%,0%,0%');
  check('…or the number of reviews, or nothing', $(php('REVIEW_SUMMARY', { distribution: dist, rowValue: 'count' }))('.cc-rs-row-value').eq(0).text() === '75' && $(php('REVIEW_SUMMARY', { distribution: dist, rowValue: 'none' }))('.cc-rs-row-value').length === 0);
  check('no reviews at all: empty bars, no division by zero', /width:0\.0%/.test(php('REVIEW_SUMMARY', { distribution: [{ stars: 5, count: 0 }] })));
  const bad = php('REVIEW_SUMMARY', { average: 99, total: -5, title: '<script>x</script>', color: 'red;}', linkText: 'L', linkUrl: 'javascript:alert(1)', distribution: [{ stars: 42, count: 'x' }, 'junk'] });
  check('out-of-range values are clamped (average 5.0, total 0, stars 5) and junk rows skipped', $(bad)('.cc-rs-average').text() === '5.0' && $(bad)('.cc-rs-total').text() === '0' && $(bad)('.cc-rs-row-label').text() === '5 ★' && $(bad)('.cc-rs-row').length === 1);
  check('hostile values: escaped title, unsafe color replaced, no javascript: link', !/<script>x/.test(bad) && !/red;\}/.test(bad) && !/href="javascript:/i.test(bad));
  check('no rating markup for search engines', !/application\/ld\+json|itemprop|AggregateRating/.test(php('REVIEW_SUMMARY', { average: 4.5, total: 10, distribution: dist })));
  check('breakdown can be hidden', $(php('REVIEW_SUMMARY', { distribution: dist, showDistribution: false }))('.cc-rs-dist').length === 0);
}

// =============================================================== TESTIMONIAL_WALL
section('TESTIMONIAL_WALL');
{
  const h = php('TESTIMONIAL_WALL', { columns: 3, items: [
    { quote: 'Line one\nLine two', name: 'Laura Bianchi', role: 'Owner', avatar: 'l.jpg', rating: 4 },
    { quote: 'Short', name: 'Tom Becker', role: '', avatar: '', rating: 0 } ] });
  const d = $(h);
  check('one card per testimonial, as <figure> with <blockquote> and <figcaption>', d('figure.cc-tw-card').length === 2 && d('figure blockquote').length === 2 && d('figure figcaption').length === 2);
  check('quote keeps its line breaks; name and role shown', d('.cc-tw-quote').eq(0).html() === 'Line one<br>Line two' && d('.cc-tw-name').eq(0).text() === 'Laura Bianchi' && d('.cc-tw-role').eq(0).text() === 'Owner');
  check('rating: an accessible label, 4 filled stars and 1 empty one; 0 = no stars', d('.cc-tw-rating').length === 1 && d('.cc-tw-rating').attr('aria-label') === '4 out of 5 stars' && d('.cc-tw-rating > span').text().length === 1);
  check('photo, or initials when there is none', d('img.cc-tw-avatar').attr('src') === 'l.jpg' && d('.cc-tw-initials').text() === 'TB');
  check('masonry columns: 3 on desktop, 2 on tablets, 1 on phones', /column-count:3;/.test(h) && /max-width:768px\)\{#tb \.cc-tw-grid\{column-count:2/.test(h) && /max-width:480px\)\{#tb \.cc-tw-grid\{column-count:1/.test(h));
  check('cards never split across columns', /break-inside:avoid/.test(h));
  const bad = php('TESTIMONIAL_WALL', { columns: 9, showRatings: false, items: [{ quote: '<img src=x onerror=a>', name: '<b>n</b>', avatar: 'javascript:x', rating: 99 }, 'junk', null] });
  check('hostile values: escaped, no javascript: photo, junk items skipped, columns clamped to 4', !/<img src=x|<b>n/.test(bad) && !/javascript:/.test(bad) && $(bad)('.cc-tw-card').length === 1 && /column-count:4;/.test(bad));
  check('ratings can be hidden', $(bad)('.cc-tw-rating').length === 0);
}

// =============================================================== HOVER_GRID
section('HOVER_GRID');
{
  const h = php('HOVER_GRID', { columns: 3, effect: 'slide', items: [
    { image: 'a.jpg', alt: 'Branding work', title: 'Branding', text: 'Logos', href: 'servizi/index.html' },
    { image: 'b.jpg', alt: '', title: 'No link', text: '' } ] });
  const d = $(h);
  check('items with a link are <a> to the page, the others <div>', d('.cc-hg-item').eq(0).is('a') && d('.cc-hg-item').eq(0).attr('href') === '{{BASE_URL}}servizi/' && d('.cc-hg-item').eq(1).is('div'));
  check('image with alt text, title and text in the reveal layer', d('.cc-hg-img').eq(0).attr('alt') === 'Branding work' && d('.cc-hg-reveal').eq(0).find('.cc-hg-title').text() === 'Branding' && d('.cc-hg-reveal').eq(1).find('.cc-hg-text').length === 0);
  check('revealed on hover and on keyboard focus', /\.cc-hg-item:hover \.cc-hg-reveal,#tb \.cc-hg-item:focus-within \.cc-hg-reveal,#tb \.cc-hg-item:focus \.cc-hg-reveal\{opacity:1;transform:none\}/.test(h));
  check('always visible on touch screens (no hover)', /@media\(hover:none\)\{#tb \.cc-hg-reveal\{opacity:1 !important/.test(h));
  check('no motion for visitors who prefer reduced motion', /prefers-reduced-motion:reduce\)\{#tb \.cc-hg-reveal,#tb \.cc-hg-img\{transition:none/.test(h));
  check('effect class: slide or fade (unknown → slide)', /cc-hg-slide/.test(h) && /cc-hg-fade/.test(php('HOVER_GRID', { effect: 'fade', items: [] })) && /cc-hg-slide/.test(php('HOVER_GRID', { effect: 'boom', items: [] })));
  const bad = php('HOVER_GRID', { columns: 0, aspectRatio: '99 / 1', overlay: 'url(x)', items: [{ image: 'javascript:alert(1)', href: 'javascript:alert(2)', title: '<img src=x>' }, 'junk'] });
  check('hostile values: shape and overlay fall back to defaults, no javascript: image or link, escaped, junk skipped', /aspect-ratio:4 \/ 3/.test(bad) && /rgba\(15,23,42,0\.72\)/.test(bad) && !/src="javascript:|href="javascript:/i.test(bad) && !/<img src=x>/.test(bad) && $(bad)('.cc-hg-item').length === 1 && /repeat\(1, 1fr\)/.test(bad));
}

console.log(`\n${fails === 0 ? 'BLOCK CONTENT OK' : fails + ' checks failed'} (${total} checks)`);
process.exit(fails === 0 ? 0 : 1);
