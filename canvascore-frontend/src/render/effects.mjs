// Block effects (Advanced tab) and button hovers: the allowed values and the classes they add.
// Mirrored in compiler.php (cc_effect_classes / cc_button_hover); the CSS is canvascore-admin/effects.css.

export const REVEAL_ANIMATIONS = [
  ['none', 'None'], ['fade-in', 'Fade in'], ['fade-up', 'Fade up'], ['fade-down', 'Fade down'],
  ['fade-left', 'Slide in from the left'], ['fade-right', 'Slide in from the right'],
  ['zoom-in', 'Zoom in'], ['zoom-out', 'Zoom out'], ['flip-up', 'Flip up'], ['flip-left', 'Flip sideways'],
  ['rotate-in', 'Rotate in'], ['blur-in', 'Blur in'], ['bounce-in', 'Bounce in'],
];
export const DURATIONS = [['', 'Normal (0.8s)'], ['fast', 'Fast (0.5s)'], ['slow', 'Slow (1.2s)'], ['slower', 'Very slow (1.8s)']];
export const DELAYS = [['', 'No delay'], ['100', '0.1s'], ['200', '0.2s'], ['300', '0.3s'], ['500', '0.5s'], ['800', '0.8s'], ['1000', '1s'], ['1500', '1.5s']];
export const HOVER_EFFECTS = [
  ['', 'None'], ['lift', 'Lift'], ['grow', 'Grow'], ['shrink', 'Shrink'], ['shadow', 'Shadow'],
  ['glow', 'Glow (brand color)'], ['tilt', 'Tilt'], ['brighten', 'Brighten'], ['grayscale', 'Black & white → color'],
];
export const LOOP_EFFECTS = [
  ['', 'None'], ['float', 'Float'], ['pulse', 'Pulse'], ['bounce', 'Bounce'], ['swing', 'Swing'],
  ['heartbeat', 'Heartbeat'], ['shake', 'Shake (every few seconds)'], ['spin', 'Spin (slow)'],
];
export const BUTTON_EFFECTS = [
  ['', 'Color change only'], ['lift', 'Lift'], ['grow', 'Grow'], ['press', 'Press'], ['shadow', 'Shadow'],
  ['glow', 'Glow'], ['shine', 'Shine sweep'], ['ring', 'Outline ring'], ['pulse', 'Pulse'],
];

const allowed = (list) => new Set(list.map(([v]) => v).filter((v) => v && v !== 'none'));
const REVEAL = allowed(REVEAL_ANIMATIONS);
const DUR = allowed(DURATIONS);
const DELAY = allowed(DELAYS);
const HOVER = allowed(HOVER_EFFECTS);
const LOOP = allowed(LOOP_EFFECTS);
const BFX = allowed(BUTTON_EFFECTS);

// Classes of a block's effects, each with a leading space ('' when none). Unknown values are dropped.
export function effectClasses(styles = {}, content = {}) {
  let c = '';
  if (REVEAL.has(styles.animation)) {
    c += ` cc-reveal ${styles.animation}`;
    if (DUR.has(content.animDuration)) c += ` cc-dur-${content.animDuration}`;
    if (DELAY.has(String(content.animDelay ?? ''))) c += ` cc-delay-${content.animDelay}`;
  }
  if (HOVER.has(content.hoverEffect)) c += ` cc-hover-${content.hoverEffect}`;
  if (LOOP.has(content.loopEffect)) c += ` cc-loop-${content.loopEffect}`;
  return c;
}

// Hover of a button: { cls: ' cc-hbg cc-bfx-lift…', vars: '--cc-hover-bg:…; ' } (values are HTML-escaped by the caller).
export function buttonHover({ bg, color, border, effect } = {}) {
  let cls = '';
  let vars = '';
  const ok = (v) => typeof v === 'string' && v.trim() !== '';
  if (ok(bg)) { cls += ' cc-hbg'; vars += `--cc-hover-bg:${bg}; `; }
  if (ok(color)) { cls += ' cc-hcol'; vars += `--cc-hover-color:${color}; `; }
  if (ok(border)) { cls += ' cc-hbd'; vars += `--cc-hover-border:${border}; `; }
  if (BFX.has(effect)) cls += ` cc-bfx-${effect}`;
  return { cls, vars };
}
