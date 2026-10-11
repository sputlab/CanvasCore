// tests/menu.mjs
// Menu themes and effects (src/menu/menuThemes.js) against the real compiler (render_menu_html):
//  - the effect catalog is the same in the editor and in compiler.php;
//  - effect helpers: single groups keep one effect, multi groups stack, legacy `effect` is migrated;
//  - every theme and every effect renders without PHP warnings and emits its CSS;
//  - user values cannot break out of the CSS/HTML;
//  - mobile bar: burger icons, burger side, logo visibility, desktop alignment does not leak into it.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_SETTINGS, BURGER_ICONS, BURGER_STYLES, EFFECT_GROUPS, EFFECT_IDS, THEMES, THEME_KEYS, cleanEffects, toggleEffect, normalizeSettings, applyTheme, matchingTheme,
} from '../src/menu/menuThemes.js';

const phpScript = fileURLToPath(new URL('./render_menu.php', import.meta.url));
let fails = 0, total = 0;
const check = (name, cond, extra = '') => {
  total++;
  if (cond) console.log('  ✓ ' + name);
  else { fails++; console.error('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
};
const php = (args, input = '') => {
  try {
    const out = execFileSync('php', ['-d', 'display_errors=stderr', '-d', 'error_reporting=E_ALL', phpScript, ...args],
      { input, stdio: ['pipe', 'pipe', 'pipe'] });
    return { out: out.toString(), err: '' };
  } catch (e) { return { out: (e.stdout || '').toString(), err: (e.stderr || e.message).toString() }; }
};
const ITEMS = [
  { id: 'a', title: 'Home', url: 'index.html', children: [] },
  { id: 'b', title: 'Services', url: '', children: [{ id: 'b1', title: 'Design', url: 'design/index.html', children: [] }] },
  { id: 'c', title: 'Contact', url: 'contact/index.html', children: [] },
];
const render = (settings, opts = {}) => php([JSON.stringify(opts)], JSON.stringify({ items: ITEMS, settings }));

console.log('MENU — effect catalog (editor ↔ compiler)');
{
  const cat = JSON.parse(php(['effects']).out);
  const phpIds = Object.keys(cat.effects);
  check('same effect ids in menuThemes.js and compiler.php', JSON.stringify([...phpIds].sort()) === JSON.stringify([...EFFECT_IDS].sort()),
    `only editor: ${EFFECT_IDS.filter((i) => !phpIds.includes(i))}; only compiler: ${phpIds.filter((i) => !EFFECT_IDS.includes(i))}`);
  const groupsOk = EFFECT_GROUPS.every((g) => g.effects.every((e) => cat.effects[e.id] === g.id));
  check('each effect is in the same group', groupsOk);
  const single = EFFECT_GROUPS.filter((g) => g.mode === 'single').map((g) => g.id).sort();
  check('the same groups are "pick one"', JSON.stringify(single) === JSON.stringify([...cat.single].sort()), cat.single.join(','));
  check('effect ids are unique', new Set(EFFECT_IDS).size === EFFECT_GROUPS.reduce((n, g) => n + g.effects.length, 0));
}

console.log('\nMENU — effect helpers');
check('toggle on in a single group replaces the sibling', JSON.stringify(toggleEffect(['underline', 'glass'], 'dot')) === '["glass","dot"]');
check('toggle on in a multi group stacks', JSON.stringify(toggleEffect(['glass'], 'glare')) === '["glass","glare"]');
check('toggle off removes it', JSON.stringify(toggleEffect(['glass', 'glare'], 'glass')) === '["glare"]');
check('effects from different groups combine', toggleEffect(toggleEffect(toggleEffect([], 'underline'), 'lift'), 'dd-fade').length === 3);
check('cleanEffects drops unknown ids, duplicates and single-group conflicts', JSON.stringify(cleanEffects(['lift', 'nope', 'lift', 'grow', 'glow'])) === '["lift","glow"]');
check('legacy `effect` is migrated to `effects`', JSON.stringify(normalizeSettings({ effect: 'glare' }).effects) === '["glare"]' && !('effect' in normalizeSettings({ effect: 'glare' })));
check('legacy effect "none" → no effects', normalizeSettings({ effect: 'none' }).effects.length === 0);
check('missing settings get the defaults', normalizeSettings(undefined).fontSize === DEFAULT_SETTINGS.fontSize);

console.log('\nMENU — themes');
check('at least 10 themes, unique ids', THEMES.length >= 10 && new Set(THEMES.map((t) => t.id)).size === THEMES.length);
for (const t of THEMES) {
  const missing = THEME_KEYS.filter((k) => !(k in t.settings));
  check(`${t.id}: sets every theme key, valid effects, name + description`, missing.length === 0 && !!t.name && !!t.description
    && JSON.stringify(cleanEffects(t.settings.effects)) === JSON.stringify(t.settings.effects), missing.join(','));
}
{
  const mine = { ...DEFAULT_SETTINGS, logoUrl: '/uploads/l.png', align: 'center', isSticky: true, mobileThreshold: '900' };
  const applied = applyTheme(mine, THEMES[1]);
  check('applying a theme keeps logo, alignment, sticky and mobile settings', applied.logoUrl === '/uploads/l.png' && applied.align === 'center' && applied.isSticky && applied.mobileThreshold === '900');
  check('the applied theme is recognized as the one in use', matchingTheme(applied)?.id === THEMES[1].id);
  check('…in any effect order', matchingTheme({ ...applied, effects: [...applied.effects].reverse() })?.id === THEMES[1].id);
  check('changing a color makes it "custom"', matchingTheme({ ...applied, textColor: '#123456' }) === null);
}

console.log('\nMENU — compiler rendering');
for (const t of THEMES) {
  const r = render(applyTheme(DEFAULT_SETTINGS, t));
  check(`theme ${t.id}: renders without PHP warnings`, r.err === '' && r.out.includes('cc-navigation'), r.err.slice(0, 200));
}
// One distinctive CSS fragment per effect (sticky-only effects are rendered with a sticky bar)
const MARK = {
  underline: 'transform-origin:left', 'underline-center': 'transform-origin:center', overline: 'top:-4px', highlight: 'transform:scaleY(1)',
  dot: 'border-radius:50%', lift: 'translateY(-2px)', grow: 'scale(1.06)', pop: 'cubic-bezier', glow: 'text-shadow:0 0 12px',
  halo: 'box-shadow:0 6px 18px', glass: 'backdrop-filter', glare: 'ccGlare', 'accent-line': '.cc-navigation::after',
  shrink: 'cc-scrolled .cc-nav-inner', 'hide-on-scroll': 'cc-nav-hidden { transform', 'shadow-on-scroll': '.cc-navigation.cc-scrolled {',
  'dd-fade': 'visibility:hidden', 'dd-slide': 'transform:translateY(-8px)', 'dd-zoom': 'transform:scale(.96)',
  'enter-slide': 'ccNavSlide', 'enter-fade': 'ccNavFade', 'enter-stagger': 'nth-child(3) { animation-delay',
};
check('every effect has a rendering check', EFFECT_IDS.every((id) => MARK[id]), EFFECT_IDS.filter((id) => !MARK[id]).join(','));
const plain = render({ ...DEFAULT_SETTINGS, isSticky: true }).out;
for (const id of EFFECT_IDS) {
  const r = render({ ...DEFAULT_SETTINGS, isSticky: true, effects: [id] });
  check(`effect ${id}: emitted, and absent without it`, r.err === '' && r.out.includes(MARK[id]) && !plain.includes(MARK[id]), r.err.slice(0, 200));
}
{
  const all = EFFECT_GROUPS.map((g) => g.effects[0].id).concat(['glare', 'accent-line', 'halo', 'hide-on-scroll', 'shadow-on-scroll']);
  const r = render({ ...DEFAULT_SETTINGS, isSticky: true, effects: all });
  check('one effect from every group plus all the stackable ones render together', r.err === '' && all.every((id) => r.out.includes(MARK[id])));
  const legacy = render({ effect: 'underline' }).out;
  check('legacy single `effect` still renders (menus saved before this change)', legacy.includes(MARK.underline));
  const conflict = render({ effects: ['lift', 'grow'] }).out;
  check('compiler keeps only the first effect of a "pick one" group', conflict.includes(MARK.lift) && !conflict.includes(MARK.grow));
  const scroll = render({ effects: ['shrink', 'hide-on-scroll'] }).out;
  check('scroll effects are skipped when the bar is not sticky', !scroll.includes('cc-scrolled') && !scroll.includes("addEventListener('scroll'"));
  const preview = render({ isSticky: true, effects: ['shrink'] }, { preview: true }).out;
  check('…and in the preview, where the bar is never fixed', !preview.includes("addEventListener('scroll'"));
  const sticky = render({ isSticky: true, effects: ['hide-on-scroll'] }).out;
  check('sticky + hide on scroll → scroll script with hide logic', sticky.includes("addEventListener('scroll'") && sticky.includes("classList.add('cc-nav-hidden')"));
  const dd = render({ effects: ['dd-slide'], mobileThreshold: '900' }).out;
  check('submenu animation applies only above the mobile breakpoint', dd.includes('@media (min-width: 901px)'));
  const accent = render({ effects: ['accent-line'] }).out;
  const z = (sel) => Number((accent.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^>]*?z-index:\\s*(-?\\d+)')) || [])[1]);
  check('accent line stays behind the open submenus (below .cc-nav-inner)', z('.cc-navigation::after {') < z('class="cc-nav-inner"'),
    `line ${z('.cc-navigation::after {')} vs inner ${z('class="cc-nav-inner"')}`);
  check('reduced-motion users get no animations', plain.includes('prefers-reduced-motion: reduce'));
}
{
  const r = render({ ...DEFAULT_SETTINGS, styleType: 'pill', buttonTextColor: '#831843', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' });
  check('button text color, font size/weight, letter case and spacing reach the CSS', r.out.includes('color:#831843 !important') && r.out.includes('font-size:13px')
    && r.out.includes('font-weight:700') && r.out.includes('text-transform:uppercase') && r.out.includes('letter-spacing:1px'));
  const bad = render({ fontWeight: '900;}body{display:none', textTransform: 'x;}', fontSize: '1px"><script>alert(1)</script>' }).out;
  check('invalid weight / letter case fall back to safe values', bad.includes('font-weight:600') && bad.includes('text-transform:none') && !bad.includes('body{'));
  check('user values are escaped (no injected tags)', !bad.includes('<script>alert(1)'));
  const cur = render({ highlightCurrent: true, effects: ['underline'] }).out;
  check('highlight current page: styled .cc-current, indicator stays visible on it', cur.includes('.cc-menu-link.cc-current {') && cur.includes('.cc-current::after'));
  check('without it .cc-current is not styled (aria-current is always set)', !plain.includes('.cc-menu-link.cc-current {') && plain.includes("aria-current"));
}

console.log('\nMENU — mobile bar');
{
  const cat = JSON.parse(php(['effects']).out);
  check('same burger icons (ids and SVG) in menuThemes.js and compiler.php',
    JSON.stringify(Object.fromEntries(BURGER_ICONS.map((b) => [b.id, b.svg]))) === JSON.stringify(cat.burgers));
  for (const id of BURGER_STYLES) {
    const r = render({ burgerStyle: id, burgerIcon: '✦' });
    const icon = (r.out.match(/<span class="cc-burger-icon">([\s\S]*?)<\/span><span class="cc-burger-close">/) || [])[1] || '';
    const want = id === 'custom' ? icon.includes('✦') : id === 'label' ? icon.includes('cc-burger-label') && icon.includes('<svg')
      : icon === BURGER_ICONS.find((b) => b.id === id).svg;
    check(`burger "${id}": renders without warnings`, r.err === '' && want, r.err.slice(0, 200) || icon.slice(0, 120));
  }
  check('legacy menu with a custom character keeps it', render({ burgerIcon: '≡' }).out.includes('<span class="cc-burger-glyph">≡</span>'));
  check('legacy menu with the default ☰ gets the classic SVG', render({ burgerIcon: '☰' }).out.includes(`<span class="cc-burger-icon">${BURGER_ICONS[0].svg}`));
  check('editor migrates the same way', normalizeSettings({ burgerIcon: '≡' }).burgerStyle === 'custom' && normalizeSettings({ burgerIcon: '☰' }).burgerStyle === 'lines' && normalizeSettings({ burgerStyle: 'dots' }).burgerStyle === 'dots');
  check('unknown burger style falls back to lines', render({ burgerStyle: 'nope' }).err === '' && render({ burgerStyle: 'nope' }).out.includes(BURGER_ICONS[0].svg));
  const base = render({ logoUrl: '/l.png' }).out;
  check('the toggle exposes aria-expanded and the script updates it', base.includes('aria-expanded="false"') && base.includes("toggle.setAttribute('aria-expanded'"));
  check('open menu shows a close (✕) icon', base.includes('cc-burger-close') && base.includes('[aria-expanded="true"] .cc-burger-close { display:inline-flex; }'));
  const mob = (out) => out.slice(out.indexOf('@media (max-width'));
  const right = mob(base), left = mob(render({ logoUrl: '/l.png', mobileBurgerSide: 'left' }).out);
  check('burger right (default): logo first, burger pushed right', /\.cc-logo \{[^}]*order:1 !important/.test(right) && /\.cc-mobile-toggle \{[^}]*order:2 !important;[^}]*margin-left:auto/.test(right));
  check('burger left: burger first, logo pushed to the right', /\.cc-mobile-toggle \{[^}]*order:1 !important;[^}]*margin-right:auto/.test(left) && /\.cc-logo \{[^}]*order:2 !important;[^}]*margin-left:auto/.test(left));
  check('logo shown on mobile by default', !/\.cc-logo \{[^}]*display:none/.test(right));
  check('logo can be hidden on mobile only', /\.cc-logo \{[^}]*display:none !important/.test(mob(render({ logoUrl: '/l.png', mobileShowLogo: false }).out)) && !/cc-logo \{[^}]*display:none/.test(render({ logoUrl: '/l.png', mobileShowLogo: false }).out.split('@media (max-width')[0]));
  for (const align of ['flex-start', 'center', 'flex-end']) {
    const m = mob(render({ logoUrl: '/l.png', align }).out);
    check(`desktop alignment "${align}" does not leak into the mobile bar (edges, static logo, menu below)`,
      m.includes('justify-content:space-between !important') && /\.cc-logo \{[^}]*position:static !important;[^}]*transform:none !important/.test(m) && /\.cc-main-menu \{[^}]*order:3 !important;[^}]*width:100%/.test(m));
  }
}

console.log(`\n${fails === 0 ? 'MENU OK' : fails + ' checks failed'} (${total} checks)`);
process.exit(fails === 0 ? 0 : 1);
