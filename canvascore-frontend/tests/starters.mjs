// tests/starters.mjs
// Checks the starter page templates (canvascore-admin/starters.json):
//  - well-formed: unique starter ids, name/description present, unique block ids per starter;
//  - only known block types (blocks.json), children only on container types;
//  - content fields are ones the block actually has (catches typos such as "subtile");
//  - every starter renders in both the canonical JS renderer and the PHP compiler, with no
//    "Unknown element", no PHP warnings, and the same set of cc-* classes in both outputs.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderBlock } from '../src/render/renderBlock.mjs';

const read = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8'));
const starters = read('../../canvascore-admin/starters.json');
const { types } = read('../../canvascore-admin/blocks.json');
const phpScript = fileURLToPath(new URL('./render_php.php', import.meta.url));

let fails = 0, total = 0;
const check = (name, cond, extra = '') => {
  total++;
  if (cond) console.log('  ✓ ' + name);
  else { fails++; console.error('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
};

// Renders a block tree with the PHP compiler; stderr is captured so PHP warnings fail the test.
const renderPhp = (block) => {
  try {
    const out = execFileSync('php', ['-d', 'display_errors=stderr', '-d', 'error_reporting=E_ALL', phpScript],
      { input: JSON.stringify(block), stdio: ['pipe', 'pipe', 'pipe'] });
    return { html: out.toString(), err: '' };
  } catch (e) {
    return { html: (e.stdout || '').toString(), err: (e.stderr || e.message).toString() };
  }
};
const ccClasses = (html) => new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/)).filter(c => c.startsWith('cc-')));
const walk = (blocks, fn) => { for (const b of blocks || []) { fn(b); walk(b.children, fn); } };

console.log('STARTERS — structure');
const ids = starters.map(s => s.id);
check('starter ids are unique', new Set(ids).size === ids.length, ids.join(', '));
check('a "blank" starter exists and is empty', starters.some(s => s.id === 'blank' && s.blocks.length === 0));

for (const st of starters) {
  check(`${st.id}: has a name and a description`, !!st.name && !!st.description);
  const seen = new Set(), problems = [];
  walk(st.blocks, (b) => {
    if (seen.has(b.id)) problems.push(`duplicate id ${b.id}`);
    seen.add(b.id);
    const def = types[b.type];
    if (!def) { problems.push(`unknown type ${b.type}`); return; }
    if (b.children && !def.children) problems.push(`${b.id}: ${b.type} cannot have children`);
    const known = new Set(Object.keys(def.content || {}));
    for (const k of Object.keys(b.content || {})) if (!known.has(k)) problems.push(`${b.id}: ${b.type} has no "${k}" field`);
  });
  check(`${st.id}: valid blocks (${seen.size})`, problems.length === 0, problems.join('; '));
}

console.log('\nSTARTERS — rendering (JS editor vs PHP compiler)');
for (const st of starters) {
  if (!st.blocks.length) continue;
  const js = st.blocks.map(b => renderBlock(b)).join('');
  const php = st.blocks.map(b => renderPhp(b));
  const phpHtml = php.map(r => r.html).join('');
  const phpErr = php.map(r => r.err).filter(Boolean).join(' | ');
  check(`${st.id}: no unknown elements`, !/Unknown element/.test(js + phpHtml));
  check(`${st.id}: PHP renders without warnings`, phpErr === '' && phpHtml.length > 0, phpErr.slice(0, 300));
  const a = ccClasses(js), b = ccClasses(phpHtml);
  const onlyJs = [...a].filter(c => !b.has(c)), onlyPhp = [...b].filter(c => !a.has(c));
  check(`${st.id}: same block classes in editor and published page`, onlyJs.length === 0 && onlyPhp.length === 0,
    `only editor: ${onlyJs.join(' ')}; only compiler: ${onlyPhp.join(' ')}`);
}

console.log(`\n${fails === 0 ? 'STARTERS OK' : fails + ' checks failed'} (${total} checks)`);
process.exit(fails === 0 ? 0 : 1);
