// Behaviour of the blocks that need a script: Code Snippet (highlight + copy), Table of Contents, Share Bar,
// Pricing Calculator, Multi-step Form, Video Hero, Audio Player, Announcement Bar.
// The editor canvas runs these functions through the wrappers at the bottom; published pages run the SAME text
// from canvascore-admin/compiler.php (the CC_*_SCRIPT constants). Every function between a "cc-xxx:begin" and
// "cc-xxx:end" line is copied verbatim into the compiler (so no literal "<!--", "-->" or "</script" in them):
// edit both, and tests/blocks-content.mjs fails when the two texts differ. They are plain ES5 (var, function,
// optional catch binding), take their window and document from the element they work on, and never write HTML:
// tokens, links and amounts are built with createElement / textContent.
// cc-hl:begin
function ccTokens(code, lang) {
  var STR = /"(?:\\[\s\S]|[^"\\\n])*(?:"|$)|'(?:\\[\s\S]|[^'\\\n])*(?:'|$)/y;
  var NUM = /\b(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/y;
  var CSSNUM = /#[0-9a-fA-F]{3,8}\b|-?\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?|\.\d+(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?/y;
  var BLOCK = /\/\*[\s\S]*?(?:\*\/|$)/y;
  var RULES = {
    js: [['c', /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y], ['s', /`(?:\\[\s\S]|[^`\\])*(?:`|$)/y], ['s', STR], ['n', NUM],
      ['k', /\b(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|if|import|in|instanceof|let|new|of|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield|null|true|false|undefined)\b/y],
      ['f', /[A-Za-z_$][\w$]*(?=\()/y]],
    json: [['a', /"(?:\\[\s\S]|[^"\\\n])*"(?=\s*:)/y], ['s', STR], ['n', /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y], ['k', /\b(?:true|false|null)\b/y]],
    css: [['c', BLOCK], ['s', STR], ['k', /@[\w-]+/y], ['n', CSSNUM], ['a', /[\w-]+(?=\s*:)/y]],
    html: [['c', /<[!]--[\s\S]*?(?:--[>]|$)/y], ['t', /<\/?[A-Za-z][\w:-]*/y], ['t', /\/?>/y], ['s', STR], ['a', /[\w:-]+(?==)/y]],
    php: [['c', /\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y], ['k', /<\?php|<\?=|\?>/y], ['s', STR], ['v', /\$[A-Za-z_]\w*/y], ['n', NUM],
      ['k', /\b(?:abstract|and|array|as|break|case|catch|class|clone|const|continue|declare|default|do|echo|else|elseif|empty|extends|final|finally|fn|for|foreach|function|global|if|implements|include|include_once|instanceof|interface|isset|list|match|namespace|new|null|or|print|private|protected|public|require|require_once|return|static|switch|this|throw|trait|true|false|try|unset|use|var|while|yield)\b/y],
      ['f', /[A-Za-z_]\w*(?=\()/y]],
    shell: [['c', /#[^\n]*/y], ['s', STR], ['v', /\$\{[^}\n]*\}|\$[A-Za-z_]\w*/y], ['n', NUM],
      ['k', /\b(?:if|then|else|elif|fi|for|while|do|done|case|esac|function|in|return|exit|export|local|echo|cd|sudo)\b/y]]
  };
  var rules = RULES[lang], s = String(code), out = [], plain = '', pos = 0, n = s.length;
  if (!rules) return [[null, s]];
  while (pos < n) {
    var hit = null;
    for (var i = 0; i < rules.length; i++) {
      var re = rules[i][1];
      re.lastIndex = pos;
      var m = re.exec(s);
      if (m && m.index === pos && m[0].length > 0) { hit = [rules[i][0], m[0]]; break; }
    }
    if (hit) {
      if (plain) { out.push([null, plain]); plain = ''; }
      out.push(hit);
      pos += hit[1].length;
    } else { plain += s.charAt(pos); pos++; }
  }
  if (plain) out.push([null, plain]);
  return out;
}
// cc-hl:end

// cc-code:begin
function ccCodeInit(root) {
  var doc = root.ownerDocument, win = doc.defaultView, code = root.querySelector('.cc-code-code');
  if (!code) return;
  var text = code.textContent, toks = ccTokens(text, root.getAttribute('data-lang') || 'text'), frag = doc.createDocumentFragment();
  for (var i = 0; i < toks.length; i++) {
    if (toks[i][0]) { var sp = doc.createElement('span'); sp.className = 'cc-tk-' + toks[i][0]; sp.textContent = toks[i][1]; frag.appendChild(sp); }
    else frag.appendChild(doc.createTextNode(toks[i][1]));
  }
  code.textContent = '';
  code.appendChild(frag);
  var btn = root.querySelector('.cc-code-copy');
  if (!btn || btn.getAttribute('data-ready')) return;
  var label = btn.textContent;
  btn.setAttribute('data-ready', '1');
  btn.hidden = false;
  btn.addEventListener('click', function () {
    var done = function () { btn.textContent = 'Copied'; win.setTimeout(function () { btn.textContent = label; }, 1600); };
    if (win.navigator.clipboard && win.navigator.clipboard.writeText) { win.navigator.clipboard.writeText(code.textContent).then(done, function () {}); return; }
    var ta = doc.createElement('textarea');
    ta.value = code.textContent; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    doc.body.appendChild(ta); ta.select();
    try { if (doc.execCommand('copy')) done(); } catch { /* no clipboard access */ }
    doc.body.removeChild(ta);
  });
}
// cc-code:end

// cc-toc:begin
function ccTocInit(root, editor) {
  var doc = root.ownerDocument, win = doc.defaultView, scope = root.closest('main') || root.closest('.cc-canvas') || doc.body;
  var list = root.querySelector('.cc-toc-list'), empty = root.querySelector('.cc-toc-empty');
  var all = scope.querySelectorAll(root.getAttribute('data-levels') === 'h2h3' ? 'h2, h3' : 'h2'), heads = [], i;
  // the author's own headings only: in rich text (Text, Image + Text, Hero, Custom HTML) and without a design class
  // of their own (that leaves out the titles inside Scrollytelling, Cards, Team, Collection List...)
  for (i = 0; i < all.length; i++) {
    if (!all[i].closest('.cc-toc') && all[i].closest('.cc-text, .cc-hero, .cc-img-text, .cc-html-block') && !/(^|\s)cc-/.test(all[i].className) && all[i].textContent.trim()) heads.push(all[i]);
  }
  var numbered = root.getAttribute('data-numbered') === '1', offset = parseInt(root.getAttribute('data-offset'), 10) || 0;
  var used = {}, n2 = 0, n3 = 0, links = [];
  list.textContent = '';
  for (i = 0; i < heads.length; i++) {
    var h = heads[i], text = h.textContent.trim().replace(/\s+/g, ' '), l3 = h.tagName === 'H3', id = h.id;
    if (!id && !editor) {
      var base = (text.normalize ? text.normalize('NFD').replace(/[̀-ͯ]/g, '') : text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section', k = 2;
      id = base;
      while (doc.getElementById(id) || used[id]) { id = base + '-' + k; k++; }
      h.id = id;
    }
    used[id] = 1;
    if (!editor) h.style.scrollMarginTop = offset + 'px';
    if (l3) { n3++; } else { n2++; n3 = 0; }
    var li = doc.createElement('li'), a = doc.createElement('a');
    li.className = 'cc-toc-item ' + (l3 ? 'cc-toc-l3' : 'cc-toc-l2');
    a.href = '#' + (editor ? '' : id);
    if (numbered) { var num = doc.createElement('span'); num.className = 'cc-toc-num'; num.textContent = (l3 ? n2 + '.' + n3 : n2) + '. '; a.appendChild(num); }
    a.appendChild(doc.createTextNode(text));
    li.appendChild(a); list.appendChild(li); links.push(a);
  }
  root.hidden = !heads.length && !editor;
  if (empty) empty.hidden = heads.length > 0;
  if (editor || !heads.length || root.getAttribute('data-highlight') !== '1' || root.getAttribute('data-ready')) return;
  root.setAttribute('data-ready', '1');
  var busy = false, mark = function () {
    busy = false;
    var cur = -1;
    for (var j = 0; j < heads.length; j++) { if (heads[j].getBoundingClientRect().top <= offset + 24) cur = j; }
    // at the very end of the page the last heading may never reach the top: it counts as the one being read
    if (win.pageYOffset > 0 && win.pageYOffset + win.innerHeight >= doc.documentElement.scrollHeight - 2) cur = heads.length - 1;
    for (j = 0; j < links.length; j++) {
      links[j].parentNode.className = links[j].parentNode.className.replace(' is-active', '') + (j === cur ? ' is-active' : '');
      if (j === cur) links[j].setAttribute('aria-current', 'true'); else links[j].removeAttribute('aria-current');
    }
  };
  win.addEventListener('scroll', function () { if (!busy) { busy = true; win.requestAnimationFrame(mark); } }, { passive: true });
  mark();
}
// cc-toc:end

// cc-share:begin
function ccShareInit(root, editor) {
  var doc = root.ownerDocument, win = doc.defaultView;
  root.hidden = false;
  if (editor) return;
  var url = win.location.href.split('#')[0], msg = root.getAttribute('data-msg') || doc.title, e = win.encodeURIComponent;
  var hrefs = {
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + e(url),
    x: 'https://twitter.com/intent/tweet?url=' + e(url) + '&text=' + e(msg),
    linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + e(url),
    whatsapp: 'https://wa.me/?text=' + e(msg + ' ' + url),
    telegram: 'https://t.me/share/url?url=' + e(url) + '&text=' + e(msg),
    email: 'mailto:?subject=' + e(msg) + '&body=' + e(url)
  };
  var nets = root.querySelectorAll('a[data-net]'), acts = root.querySelectorAll('[data-act]'), i;
  for (i = 0; i < nets.length; i++) { var net = nets[i].getAttribute('data-net'); if (hrefs[net]) nets[i].href = hrefs[net]; }
  var flash = function (btn, text) {
    var lab = btn.querySelector('.cc-share-label') || btn, old = lab.textContent;
    lab.textContent = text;
    win.setTimeout(function () { lab.textContent = old; }, 1600);
  };
  var copy = function (btn) {
    var done = function () { flash(btn, 'Copied'); };
    if (win.navigator.clipboard && win.navigator.clipboard.writeText) { win.navigator.clipboard.writeText(url).then(done, function () {}); return; }
    var ta = doc.createElement('textarea');
    ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    doc.body.appendChild(ta); ta.select();
    try { if (doc.execCommand('copy')) done(); } catch { /* no clipboard access */ }
    doc.body.removeChild(ta);
  };
  var wire = function (btn) {
    var act = btn.getAttribute('data-act');
    if (act === 'share' && !win.navigator.share) { btn.hidden = true; return; }
    btn.addEventListener('click', function () {
      if (act === 'copy') copy(btn);
      else if (act === 'print') win.print();
      else if (act === 'share') win.navigator.share({ title: msg, url: url }).catch(function () {});
    });
  };
  for (i = 0; i < acts.length; i++) wire(acts[i]);
}
// cc-share:end

// cc-calc:begin
function ccPlain(v) {
  var s = v.toFixed(4);
  if (s.indexOf('.') > -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}
function ccCalcInit(root) {
  var dec = parseInt(root.getAttribute('data-dec'), 10) || 0, eu = root.getAttribute('data-fmt') === 'eu';
  var cur = root.getAttribute('data-cur') || '', after = root.getAttribute('data-pos') === 'after';
  var base = parseFloat(root.getAttribute('data-base')) || 0, disc = parseFloat(root.getAttribute('data-disc')) || 0;
  var perM = root.getAttribute('data-per-m') || '', perY = root.getAttribute('data-per-y') || '', saveTpl = root.getAttribute('data-save') || '';
  var ranges = root.querySelectorAll('.cc-calc-range'), addons = root.querySelectorAll('.cc-calc-addon'), radios = root.querySelectorAll('.cc-calc-billing input');
  var amount = root.querySelector('.cc-calc-amount'), per = root.querySelector('.cc-calc-per'), save = root.querySelector('.cc-calc-save'), i;
  var money = function (v) {
    var m = Math.pow(10, dec), r = Math.floor(Math.abs(v) * m + 0.5 + 1e-9) / m;
    if (v < 0) r = -r;
    if (r === 0) r = 0;
    var parts = r.toFixed(dec).split('.'), s;
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    s = parts.join('.');
    if (eu) s = s.replace(/[,.]/g, function (ch) { return ch === ',' ? '.' : ','; });
    return after ? s + ' ' + cur : cur + s;
  };
  var line = function (key, cost, f, show) {
    var li = root.querySelector('.cc-calc-line[data-line="' + key + '"]');
    if (!li) return;
    li.hidden = !show;
    li.querySelector('.cc-calc-line-amt').textContent = money(cost * f);
  };
  var update = function () {
    var yearly = false, total = base, f, k;
    for (k = 0; k < radios.length; k++) { if (radios[k].checked && radios[k].value === 'yearly') yearly = true; }
    f = yearly ? 12 * (1 - disc / 100) : 1;
    line('base', base, f, true);
    for (k = 0; k < ranges.length; k++) {
      var inp = ranges[k], val = parseFloat(inp.value) || 0, unit = inp.getAttribute('data-unit') || '';
      var cost = Math.max(0, val - (parseFloat(inp.getAttribute('data-incl')) || 0)) * (parseFloat(inp.getAttribute('data-price')) || 0);
      total += cost;
      var out = root.querySelector('.cc-calc-val[data-for="' + inp.id + '"]');
      if (out) out.textContent = ccPlain(val) + (unit ? ' ' + unit : '');
      line(inp.getAttribute('data-line'), cost, f, cost !== 0);
    }
    for (k = 0; k < addons.length; k++) {
      var price = parseFloat(addons[k].getAttribute('data-price')) || 0;
      if (addons[k].checked) total += price;
      line(addons[k].getAttribute('data-line'), price, f, addons[k].checked);
    }
    if (amount) amount.textContent = money(total * f);
    if (per) per.textContent = yearly ? perY : perM;
    if (save) {
      var saved = total * 12 - total * f;
      save.hidden = !(yearly && saved > 0);
      save.textContent = saveTpl.split('{amount}').join(money(saved));
    }
  };
  for (i = 0; i < ranges.length; i++) ranges[i].addEventListener('input', update);
  for (i = 0; i < addons.length; i++) addons[i].addEventListener('change', update);
  for (i = 0; i < radios.length; i++) radios[i].addEventListener('change', update);
  update();
}
// cc-calc:end

// cc-wizard:begin
function ccWizardInit(root, editor) {
  var form = root.querySelector('.cc-wz-form');
  if (!form || root.getAttribute('data-ready')) return;
  var steps = root.querySelectorAll('.cc-wz-step'), n = steps.length, cur = 0, i;
  var back = root.querySelector('.cc-wz-back'), next = root.querySelector('.cc-wz-next'), submit = root.querySelector('.cc-wz-submit');
  var prog = root.querySelector('.cc-wz-progress'), fill = root.querySelector('.cc-wz-fill'), count = root.querySelector('.cc-wz-count');
  var dots = root.querySelectorAll('.cc-wz-dot'), tpl = root.getAttribute('data-step-label') || 'Step {n} of {total}';
  root.setAttribute('data-ready', '1');
  form.setAttribute('novalidate', '');
  var groups = root.querySelectorAll('.cc-wz-group[data-req="1"]');
  var clear = function (boxes) { return function () { boxes[0].setCustomValidity(''); }; };
  for (i = 0; i < groups.length; i++) {
    var boxes = groups[i].querySelectorAll('input[type="checkbox"]');
    for (var b = 0; b < boxes.length; b++) boxes[b].addEventListener('change', clear(boxes));
  }
  if (n < 2) return;
  var show = function (k, focus) {
    cur = k;
    for (i = 0; i < n; i++) steps[i].hidden = i !== k;
    back.hidden = k === 0;
    next.hidden = k === n - 1;
    submit.hidden = k !== n - 1;
    if (prog) prog.hidden = false;
    if (fill) fill.style.width = (((k + 1) / n) * 100).toFixed(1) + '%';
    if (count) count.textContent = tpl.split('{n}').join(String(k + 1)).split('{total}').join(String(n));
    for (i = 0; i < dots.length; i++) {
      dots[i].className = 'cc-wz-dot' + (i < k ? ' is-done' : '') + (i === k ? ' is-current' : '');
      if (i === k) dots[i].setAttribute('aria-current', 'step'); else dots[i].removeAttribute('aria-current');
    }
    // the step itself takes the focus (it is announced with its title): Firefox ignores focus() on a <legend> that has just become visible
    if (focus && !editor) steps[k].focus();
  };
  var firstInvalid = function (k) {
    var gs = steps[k].querySelectorAll('.cc-wz-group[data-req="1"]'), g, bx, any, j;
    for (g = 0; g < gs.length; g++) {
      bx = gs[g].querySelectorAll('input[type="checkbox"]');
      any = false;
      for (j = 0; j < bx.length; j++) { if (bx[j].checked) any = true; }
      if (bx.length) bx[0].setCustomValidity(any ? '' : 'Please choose at least one option.');
    }
    var els = steps[k].querySelectorAll('input, select, textarea');
    for (j = 0; j < els.length; j++) { if (!els[j].checkValidity()) return els[j]; }
    return null;
  };
  back.addEventListener('click', function () { show(cur - 1, true); });
  next.addEventListener('click', function () {
    var bad = editor ? null : firstInvalid(cur);
    if (bad) { bad.reportValidity(); return; }
    show(cur + 1, true);
  });
  form.addEventListener('submit', function (e) {
    if (editor) { e.preventDefault(); return; }
    var bad, k;
    if (cur < n - 1) {
      e.preventDefault();
      bad = firstInvalid(cur);
      if (bad) bad.reportValidity(); else show(cur + 1, true);
      return;
    }
    for (k = 0; k < n; k++) {
      bad = firstInvalid(k);
      if (bad) { e.preventDefault(); show(k, false); bad.reportValidity(); return; }
    }
  });
  show(0, false);
}
// cc-wizard:end

// cc-video:begin
function ccVideoInit(root, editor) {
  var v = root.querySelector('.cc-vh-video'), btn = root.querySelector('.cc-vh-toggle');
  if (!v || root.getAttribute('data-ready')) return;
  var win = root.ownerDocument.defaultView, mq = function (q) { return !!(win.matchMedia && win.matchMedia(q).matches); };
  root.setAttribute('data-ready', '1');
  // the poster stays on the screen in the editor, and on phones unless the author chose video there
  if (editor || (root.getAttribute('data-mobile') !== '1' && mq('(max-width: 768px)'))) return;
  var pause = btn ? btn.querySelector('.cc-vh-i-pause') : null, play = btn ? btn.querySelector('.cc-vh-i-play') : null;
  var show = function (playing) {
    if (!btn) return;
    // (an SVG element ignores the hidden attribute, so the icons are shown and hidden with display)
    pause.style.display = playing ? '' : 'none';
    play.style.display = playing ? 'none' : '';
    btn.setAttribute('aria-label', playing ? 'Pause the background video' : 'Play the background video');
  };
  if (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function () {
      if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
    });
  }
  v.addEventListener('play', function () { show(true); });
  v.addEventListener('pause', function () { show(false); });
  show(false);
  // visitors who prefer reduced motion get the poster, and can start the video with the button
  if (mq('(prefers-reduced-motion: reduce)')) return;
  v.preload = 'auto';
  var started = v.play();
  if (started && started.catch) started.catch(function () {});
}
// cc-video:end

// cc-audio:begin
function ccAudioInit(root) {
  var a = root.querySelector('.cc-au-el'), ui = root.querySelector('.cc-au-ui');
  if (!a || !ui || root.getAttribute('data-ready')) return;
  var doc = root.ownerDocument, playBtn = root.querySelector('.cc-au-play'), seek = root.querySelector('.cc-au-seek');
  var cur = root.querySelector('.cc-au-cur'), dur = root.querySelector('.cc-au-dur'), speedBtn = root.querySelector('.cc-au-speed');
  var back = root.querySelector('.cc-au-back'), fwd = root.querySelector('.cc-au-fwd'), step = parseInt(root.getAttribute('data-skip'), 10) || 15;
  var rates = [1, 1.25, 1.5, 2, 0.75], ri = 0, drag = false;
  root.setAttribute('data-ready', '1');
  a.removeAttribute('controls');
  ui.hidden = false;
  var fmt = function (t) {
    t = isFinite(t) && t > 0 ? Math.floor(t) : 0;
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') + m : String(m)) + ':' + (s < 10 ? '0' : '') + s;
  };
  var paint = function () {
    var t = a.currentTime || 0, d = isFinite(a.duration) ? a.duration : 0;
    if (!drag) seek.value = String(t);
    cur.textContent = fmt(t);
    dur.textContent = fmt(d);
    seek.max = String(d || 0);
    seek.setAttribute('aria-valuetext', fmt(t) + ' of ' + fmt(d));
  };
  var state = function () {
    var playing = !a.paused && !a.ended;
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    playBtn.querySelector('.cc-au-i-play').style.display = playing ? 'none' : '';   // (display: an SVG ignores hidden)
    playBtn.querySelector('.cc-au-i-pause').style.display = playing ? '' : 'none';
  };
  playBtn.addEventListener('click', function () {
    if (a.paused) { var p = a.play(); if (p && p.catch) p.catch(function () {}); } else a.pause();
  });
  if (back) back.addEventListener('click', function () { a.currentTime = Math.max(0, (a.currentTime || 0) - step); });
  if (fwd) fwd.addEventListener('click', function () { a.currentTime = Math.min(isFinite(a.duration) ? a.duration : 1e9, (a.currentTime || 0) + step); });
  if (speedBtn) speedBtn.addEventListener('click', function () {
    ri = (ri + 1) % rates.length;
    a.playbackRate = rates[ri];
    speedBtn.textContent = rates[ri] + '×';
  });
  seek.addEventListener('input', function () { drag = true; a.currentTime = parseFloat(seek.value) || 0; cur.textContent = fmt(a.currentTime); });
  seek.addEventListener('change', function () { drag = false; });
  a.addEventListener('timeupdate', paint);
  a.addEventListener('loadedmetadata', paint);
  a.addEventListener('durationchange', paint);
  a.addEventListener('play', function () {
    state();
    var all = doc.querySelectorAll('.cc-au-el');
    for (var i = 0; i < all.length; i++) { if (all[i] !== a && !all[i].paused) all[i].pause(); }
  });
  a.addEventListener('pause', state);
  a.addEventListener('ended', state);
  state();
  paint();
}
// cc-audio:end

// cc-announce:begin
function ccAnnounceInit(root, editor) {
  var btn = root.querySelector('.cc-ann-close'), win = root.ownerDocument.defaultView, key = 'cc_ann_' + (root.getAttribute('data-key') || '');
  if (root.getAttribute('data-ready')) return;
  root.setAttribute('data-ready', '1');
  if (!editor) {
    var seen = false;
    try { seen = win.localStorage.getItem(key) === '1'; } catch { seen = false; }
    if (seen) { root.hidden = true; return; }
  }
  if (!btn) return;
  btn.hidden = false;
  btn.addEventListener('click', function () {
    if (editor) return;
    root.hidden = true;
    try { win.localStorage.setItem(key, '1'); } catch { /* it is not remembered */ }
  });
}
// cc-announce:end

// ---- the editor canvas (scripts injected into the canvas HTML don't run: these wrappers do the same work) ----

// Code Snippet: highlight and copy button
export function initCodeBlock(root) { if (root) ccCodeInit(root); }

// Share Bar: shown, but the links are inert in the editor
export function initShareBlock(root) { if (root) ccShareInit(root, true); }

// Table of Contents: lists the headings of the canvas and follows the page while it is edited. Returns a cleanup function.
export function initTocBlock(root) {
  if (!root) return () => {};
  const win = root.ownerDocument.defaultView;
  const scope = root.closest('.cc-canvas');
  let timer = null;
  const run = () => ccTocInit(root, true);
  run();
  if (!scope || !win.MutationObserver) return () => {};
  // the list itself changes on every run: look only at the page's own content
  const mo = new win.MutationObserver((records) => {
    if (records.every((r) => root.contains(r.target))) return;
    win.clearTimeout(timer);
    timer = win.setTimeout(run, 250);
  });
  mo.observe(scope, { childList: true, subtree: true, characterData: true });
  return () => { mo.disconnect(); win.clearTimeout(timer); };
}

// Pricing Calculator: live total
export function initCalcBlock(root) { if (root) ccCalcInit(root); }

// Multi-step Form: the steps can be walked through to design them; nothing is validated or sent from the editor
export function initWizardBlock(root) { if (root) ccWizardInit(root, true); }

// Video Hero: the editor shows the poster (nothing plays while you edit)
export function initVideoBlock(root) { if (root) ccVideoInit(root, true); }

// Audio Player: the custom player, with the audio loaded only when played
export function initAudioBlock(root) { if (root) ccAudioInit(root); }

// Announcement Bar: shown with its close button, which does nothing in the editor
export function initAnnounceBlock(root) { if (root) ccAnnounceInit(root, true); }

// For tests: the highlighter on its own
export { ccTokens, ccPlain };
