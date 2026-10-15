// Logo Cloud "scrolling strip": the track holds two identical sets and slides by one set's width. When a set is
// narrower than the strip, a gap opens before the second set comes in. This repeats the logos inside both sets
// until one set is at least as wide as the strip (again after images load and on resize), and stretches the
// loop time by the same factor so the speed chosen in the panel stays the same visually.
// The width of one group is measured on the original logos (copies may not have laid out yet), and copies load
// their image at once (same file, already in the cache) instead of lazily, so they never pop in while moving.
// Used by the editor canvas; the published page runs the same logic from CC_LOGOS_SCRIPT in compiler.php.

// Loop time in seconds, as the compiler reads it (10–120, 30 when missing or not a number).
export function marqueeSpeed(v) {
  if (v === '' || v === null || v === undefined || typeof v === 'boolean') return 30;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(Math.min(120, Math.max(10, n))) : 30;
}

const MAX_COPIES = 20;

// root: the .cc-logos element. Returns a cleanup function.
export function fillLogosMarquee(root, speed) {
  const noop = () => {};
  if (!root) return noop;
  const win = root.ownerDocument && root.ownerDocument.defaultView;
  const box = root.querySelector('.cc-logos-marquee');
  const track = root.querySelector('.cc-logos-track');
  if (!win || !box || !track) return noop;
  if (win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches) return noop;
  const sets = track.querySelectorAll('.cc-logos-set');
  if (sets.length < 2) return noop;
  const base = [...sets[0].children].filter((el) => !el.classList.contains('cc-logo-fill'));   // the originals, not earlier copies
  const n = base.length;
  if (!n) return noop;
  const dur = marqueeSpeed(speed);
  const imgs = base.map((el) => el.querySelector('img')).filter(Boolean);
  // Recomputed whenever a logo finishes loading (and on resize): a group measured before every image had its
  // size is corrected then, since fill() also removes copies that are no longer needed.
  const fill = () => {
    if (imgs.some((im) => !im.complete)) return;   // widths are unknown until every logo has loaded or failed
    const cs = win.getComputedStyle(sets[0]);
    const gap = parseFloat(cs.columnGap) || parseFloat(cs.gap) || 0;
    const unit = base.reduce((w, el) => w + el.getBoundingClientRect().width + gap, 0);   // one group: logos + gaps
    if (!(unit > 0)) return;
    const want = Math.min(MAX_COPIES, Math.max(1, Math.ceil(box.clientWidth / unit)));
    let have = Math.round(sets[0].children.length / n);
    for (; have > want; have--) {   // fewer copies needed (a narrower strip): drop the last group from both sets
      for (const set of sets) for (let k = 0; k < n && set.lastElementChild && set.lastElementChild.classList.contains('cc-logo-fill'); k++) set.lastElementChild.remove();
    }
    for (; have < want; have++) {
      for (const el of base) {
        const c = el.cloneNode(true);
        c.classList.add('cc-logo-fill');
        c.setAttribute('aria-hidden', 'true');
        if (c.tagName === 'A') c.setAttribute('tabindex', '-1');
        const im = c.querySelector('img');
        if (im) { im.setAttribute('alt', ''); im.removeAttribute('loading'); }
        sets[0].appendChild(c);
        sets[1].appendChild(c.cloneNode(true));
      }
    }
    track.style.animationDuration = (dur * Math.round(sets[0].children.length / n)) + 's';
  };

  for (const im of imgs) { im.addEventListener('load', fill); im.addEventListener('error', fill); }
  // Lazy loading never loads a logo that is out of view sideways (where half of the moving strip always is):
  // once the strip comes near the viewport, all of its logos load at once.
  const eager = () => { for (const im of track.querySelectorAll('img')) im.removeAttribute('loading'); };
  let io = null;
  if (win.IntersectionObserver) {
    io = new win.IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { eager(); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(box);
  } else eager();
  let ro = null;
  if (win.ResizeObserver) { ro = new win.ResizeObserver(fill); ro.observe(box); } else win.addEventListener('resize', fill);
  fill();
  return () => {
    for (const im of imgs) { im.removeEventListener('load', fill); im.removeEventListener('error', fill); }
    if (io) io.disconnect();
    if (ro) ro.disconnect(); else win.removeEventListener('resize', fill);
  };
}
