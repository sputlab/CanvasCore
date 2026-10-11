// HTML cleanup for the rich text editor.
//  - cleanPastedHtml(): content pasted from Word, Google Docs, web pages... keeps the structure
//    (headings, paragraphs, lists, links, tables, bold/italic/underline/strike) and drops the
//    formatting that would fight the site's theme (fonts, sizes, colors, classes, line heights).
//  - textToHtml(): plain text → paragraphs and line breaks.
//  - tidyHtml(): normalizes what the editor itself produces before it is saved.
// Uses DOMParser, so it runs in the browser and in jsdom (tests).

const KEEP = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'br', 'hr', 'strong', 'em', 'u', 's', 'sub', 'sup', 'mark']);
const RENAME = { b: 'strong', i: 'em', strike: 's', del: 's', ins: 'u', dfn: 'em', cite: 'em', var: 'em', tt: 'code', kbd: 'code', samp: 'code' };
const DROP = new Set(['script', 'style', 'meta', 'link', 'title', 'head', 'xml', 'iframe', 'object', 'embed', 'svg', 'math',
  'form', 'input', 'button', 'textarea', 'select', 'option', 'noscript', 'template', 'canvas', 'video', 'audio', 'picture', 'source']);
const BLOCKS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'ul', 'ol', 'li', 'table', 'hr', 'div']);
const ALIGNABLE = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'blockquote']);
const INLINE_MARKS = new Set(['strong', 'em', 'u', 's', 'sub', 'sup', 'mark', 'code', 'a']);

const safeUrl = (u, { image = false } = {}) => {
  const url = String(u || '').trim();
  if (!url) return '';
  if (/^(javascript|vbscript|file):/i.test(url)) return '';
  if (/^data:/i.test(url)) return '';                     // pasted inline images are huge: use the media library
  if (image && /^[a-z][a-z0-9+.-]*:/i.test(url) && !/^https?:/i.test(url)) return '';
  return url;
};

const parse = (html) => new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, 'text/html');

function unwrap(el) {
  const parent = el.parentNode;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function rename(doc, el, tag) {
  const n = doc.createElement(tag);
  while (el.firstChild) n.appendChild(el.firstChild);
  for (const a of [...el.attributes]) n.setAttribute(a.name, a.value);
  el.parentNode.replaceChild(n, el);
  return n;
}

// Wraps the children of `el` into the given inline marks (bold/italic... expressed with CSS)
function wrapChildren(doc, el, tags) {
  let inner = el;
  for (const t of tags) {
    const w = doc.createElement(t);
    while (inner.firstChild) w.appendChild(inner.firstChild);
    inner.appendChild(w);
    inner = w;
  }
}

// Marks expressed as inline CSS (Google Docs, Word, web pages)
function cssMarks(el) {
  const st = el.getAttribute('style') || '';
  const get = (p) => (st.match(new RegExp('(?:^|;)\\s*' + p + '\\s*:\\s*([^;]+)', 'i')) || [])[1]?.trim().toLowerCase() || '';
  const marks = [];
  const fw = get('font-weight');
  if (fw === 'bold' || fw === 'bolder' || parseInt(fw, 10) >= 600) marks.push('strong');
  if (get('font-style') === 'italic') marks.push('em');
  const deco = get('text-decoration') + ' ' + get('text-decoration-line');
  if (/underline/.test(deco)) marks.push('u');
  if (/line-through/.test(deco)) marks.push('s');
  const va = get('vertical-align');
  if (va === 'super') marks.push('sup');
  if (va === 'sub') marks.push('sub');
  return marks;
}

const textAlign = (el) => {
  const m = (el.getAttribute('style') || '').match(/text-align\s*:\s*(center|right|justify)/i) || [];
  const attr = (el.getAttribute('align') || '').toLowerCase();
  return (m[1] || (['center', 'right', 'justify'].includes(attr) ? attr : '')).toLowerCase();
};

// Word "list paragraphs" (<p class="MsoListParagraph">· item</p>) → real <ul>/<ol>
function convertWordLists(doc) {
  const isItem = (el) => el && el.nodeType === 1 && el.tagName === 'P'
    && (/MsoList/i.test(el.getAttribute('class') || '') || /mso-list/i.test(el.getAttribute('style') || ''));
  for (const p of [...doc.body.querySelectorAll('p')]) {
    if (!p.isConnected || !isItem(p)) continue;
    if (isItem(p.previousElementSibling)) continue;      // handled with the first of its run
    const run = [];
    for (let el = p; isItem(el); el = el.nextElementSibling) run.push(el);
    const firstText = run[0].textContent.replace(/ /g, ' ').trim();
    const ordered = /^(\d+|[a-z]|[ivx]+)[.)]\s/i.test(firstText);
    const list = doc.createElement(ordered ? 'ol' : 'ul');
    run[0].parentNode.insertBefore(list, run[0]);
    for (const item of run) {
      // drops Word's bullet marker (in a span with mso-list:Ignore, or as leading text)
      item.querySelectorAll('[style*="mso-list"]').forEach((s) => { if (/ignore/i.test(s.getAttribute('style'))) s.remove(); });
      const li = doc.createElement('li');
      while (item.firstChild) li.appendChild(item.firstChild);
      const first = li.firstChild;
      if (first && first.nodeType === 3) first.nodeValue = first.nodeValue.replace(/^[\s ]*([·•o§▪\-–*]|(\d+|[a-z]|[ivx]+)[.)])[\s ]+/i, '');
      list.appendChild(li);
      item.remove();
    }
  }
}

function cleanNode(doc, node) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === 8) { child.remove(); continue; }          // comments (Word's conditional comments)
    if (child.nodeType === 3) continue;
    if (child.nodeType !== 1) { child.remove(); continue; }
    let el = child;
    let tag = el.tagName.toLowerCase();
    if (tag.includes(':') || DROP.has(tag)) { el.remove(); continue; }  // <o:p>, <w:...>, scripts...
    if (tag === 'br' && /Apple-interchange-newline/.test(el.className)) { el.remove(); continue; }

    const marks = cssMarks(el);
    const align = textAlign(el);
    // Google Docs wraps everything in <b style="font-weight:normal" id="docs-internal-guid-...">
    if (tag === 'b' && /font-weight\s*:\s*(normal|400)/i.test(el.getAttribute('style') || '')) { tag = 'span'; }
    if (RENAME[tag]) { el = rename(doc, el, RENAME[tag]); tag = RENAME[tag]; }
    if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'header' || tag === 'footer' || tag === 'main' || tag === 'aside') {
      // a div with only inline content is a paragraph, otherwise it's just a wrapper
      const hasBlock = [...el.children].some((c) => BLOCKS.has(c.tagName.toLowerCase()));
      if (!hasBlock && el.textContent.trim() !== '') { el = rename(doc, el, 'p'); tag = 'p'; } else tag = '';
    }
    if (tag === 'th' || tag === 'td') { /* keep */ }

    if (!KEEP.has(tag)) {
      // span, font, unknown tags: keep the content (and bold/italic... if they were CSS)
      if (marks.length) wrapChildren(doc, el, marks.filter((m) => !el.closest(m)));
      cleanNode(doc, el);
      unwrap(el);
      continue;
    }

    // attributes: only the meaningful ones
    const keep = {};
    if (tag === 'a') {
      const href = safeUrl(el.getAttribute('href'));
      if (href) keep.href = href;
      if (el.getAttribute('target') === '_blank') { keep.target = '_blank'; keep.rel = 'noopener'; }
      const rel = (el.getAttribute('rel') || '').split(/\s+/).filter((r) => ['nofollow', 'noopener', 'noreferrer', 'sponsored', 'ugc'].includes(r));
      if (rel.length) keep.rel = [...new Set([...(keep.rel ? [keep.rel] : []), ...rel])].join(' ');
    }
    if (tag === 'img') {
      const src = safeUrl(el.getAttribute('src'), { image: true });
      if (!src) { el.remove(); continue; }
      keep.src = src;
      keep.alt = el.getAttribute('alt') || '';
      keep.style = 'max-width:100%; height:auto;';
    }
    if (tag === 'td' || tag === 'th') {
      for (const a of ['colspan', 'rowspan']) { const v = parseInt(el.getAttribute(a), 10); if (v > 1) keep[a] = String(v); }
    }
    if (ALIGNABLE.has(tag) && align) keep.style = `text-align:${align};`;
    for (const a of [...el.attributes]) el.removeAttribute(a.name);
    for (const [k, v] of Object.entries(keep)) el.setAttribute(k, v);

    if (marks.length && !['strong', 'em', 'u', 's'].includes(tag)) wrapChildren(doc, el, marks.filter((m) => m !== tag && !el.closest(m)));
    cleanNode(doc, el);
    if (tag === 'table') applyTableStyle(el);
    if (tag === 'a' && !el.getAttribute('href')) unwrap(el);
  }
}

// Default look of tables made or pasted in the editor (inline: it travels with the content)
export const TABLE_STYLE = 'width:100%; border-collapse:collapse; margin:1em 0;';
export const CELL_STYLE = 'border:1px solid #cbd5e1; padding:8px 10px; text-align:left; vertical-align:top;';
function applyTableStyle(table) {
  table.setAttribute('style', TABLE_STYLE);
  table.querySelectorAll('td, th').forEach((c) => {
    const align = (c.getAttribute('style') || '').match(/text-align:(center|right|justify)/);
    c.setAttribute('style', CELL_STYLE + (align ? ` text-align:${align[1]};` : ''));
  });
}

function removeEmpties(root) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const el of [...root.querySelectorAll('strong, em, u, s, sub, sup, mark, code, a, span')]) {
      if (!el.textContent && !el.querySelector('img, br')) { el.remove(); changed = true; }
    }
    // nested duplicates: <strong><strong>x</strong></strong>
    for (const el of [...root.querySelectorAll('strong strong, em em, u u, s s')]) { unwrap(el); changed = true; }
  }
  // empty paragraphs/headings (Word adds <p>&nbsp;</p> between paragraphs)
  for (const el of [...root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote')]) {
    if (el.textContent.replace(/[\s ]/g, '') === '' && !el.querySelector('img, hr, table')) el.remove();
  }
}

// Plain text runs at the top level become paragraphs (only when the paste has block structure)
function wrapLooseInline(doc, root) {
  const hasBlocks = [...root.children].some((c) => BLOCKS.has(c.tagName.toLowerCase()));
  if (!hasBlocks) return;
  let p = null;
  for (const n of [...root.childNodes]) {
    const isBlock = n.nodeType === 1 && BLOCKS.has(n.tagName.toLowerCase());
    if (isBlock || (n.nodeType === 3 && !n.nodeValue.trim() && !p)) { p = null; if (!isBlock) n.remove(); continue; }
    if (!p) { p = doc.createElement('p'); root.insertBefore(p, n); }
    p.appendChild(n);
  }
}

export function cleanPastedHtml(html) {
  const doc = parse(String(html || '').replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, ''));
  const root = doc.body;
  convertWordLists(doc);
  cleanNode(doc, root);
  removeEmpties(root);
  wrapLooseInline(doc, root);
  return root.innerHTML.replace(/ /g, '&nbsp;').replace(/(&nbsp;){2,}/g, ' ').trim();
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Plain text → HTML: blank lines separate paragraphs, single newlines become <br>.
// `inline` (titles) keeps it on one paragraph-less run.
export function textToHtml(text, { inline = false } = {}) {
  const t = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!t) return '';
  if (inline) return esc(t).replace(/\n+/g, ' ');
  return t.split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, '<br>')}</p>`).join('');
}

// What the editor produced → what is saved: <b>/<i> from the browser become <strong>/<em>,
// <font> leftovers are removed, trailing <br>s dropped, an "empty" field becomes ''.
export function tidyHtml(html) {
  const doc = parse(String(html || ''));
  const root = doc.body;
  for (const el of [...root.querySelectorAll('b, i, strike, font')]) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'font') unwrap(el); else rename(doc, el, RENAME[tag]);
  }
  for (const el of [...root.querySelectorAll('[contenteditable], [data-cc-field]')]) { el.removeAttribute('contenteditable'); el.removeAttribute('data-cc-field'); }
  for (const el of [...root.querySelectorAll('span')]) if (!el.attributes.length) unwrap(el);
  for (const el of [...root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote')]) {
    while (el.lastChild && el.lastChild.nodeName === 'BR' && el.childNodes.length > 1) el.lastChild.remove();
  }
  while (root.lastChild && root.lastChild.nodeName === 'BR') root.lastChild.remove();
  const out = root.innerHTML.trim();
  const meaningful = root.textContent.replace(/[\s ]/g, '') !== '' || root.querySelector('img, hr, table');
  return meaningful ? out : '';
}

export const isInlineMark = (tag) => INLINE_MARKS.has(String(tag).toLowerCase());
