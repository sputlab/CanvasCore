# CanvasCore 0.13.0 — 12 new blocks

Divider · Callout · Steps · Counters · Progress bars · Data table · Countdown · Timeline · Logo cloud ·
Team · Before/After · Business info

## Files to REPLACE
Backend: `canvascore-admin/compiler.php`, `blocks.json`, `version.json`
Frontend: `package.json`, `src/render/renderBlock.mjs`, `src/components/PropertyPanel.jsx`,
`VisualEditor.jsx`, `SortableBlock.jsx`, `tests/parity.mjs`
## NEW files
`tests/blocks-content.mjs`, `tests/panels-ui.mjs`
Plus `CHANGELOG.md`.

```
cd canvascore-frontend
npm install     # no new dependencies
npm run build
npm test        # 6 suites: parity, blocks, content, session, session UI, panels
```
No DB migration. The compiler **does not require mbstring**.

## Where to find them
ADD panel → **CONTENT BLOCKS**. With the block selected, the right-hand panel lets you edit the
content, add/reorder/remove items and adjust the layout.

## How they behave (useful things to know)
- **Counters / Progress / Countdown**: the final value is already in the HTML; the scripts only animate
  it if the browser allows it (not for people who prefer reduced motion). In the editor canvas you see
  the final state.
- **Countdown**: "visitor's local time" or a fixed UTC offset (it doesn't follow daylight saving time:
  choose the offset that applies on the expiry date).
- **Data table**: paste from Excel/Sheets (cells arrive separated by Tabs) or type `Name | Role | City`.
- **Scrolling logo cloud**: CSS only; it stops on mouse hover and for people who prefer reduced motion.
- **Before/After**: two images with the same size/framing; also usable from the keyboard (arrows).
- **Business info**: generates structured data for Google only if the block has a name. Days can be
  labeled in any language: Google always receives the standard names, in Monday → Sunday order.
  There is no "open now" indicator.
- **Callout / Team / etc.**: text is escaped; where HTML is allowed (Callout) it is sanitized.

## How it was verified
- Editor ↔ compiler parity on all variants and edge cases (including the **real defaults** from
  `blocks.json`), also comparing the `<style>` tags.
- 149 behavioral checks on the compiler: anti-injection validators for colors and numbers, number
  formatting **identical in PHP and JS** on tricky cases (2.675, 1.005, negatives…), JSON-LD (including a
  name that tries to close the `<script>`), and the scripts run in jsdom with a controlled clock,
  `requestAnimationFrame` and `IntersectionObserver` (countdown with +02:00 / −05:00 offsets, counters,
  bars, before/after).
- 71 checks on the editor with the real components (jsdom): `addBlock` → panel → edit → store, and every
  block drawn in the canvas.
- **Mutation testing**: 14 bugs planted on purpose (sanitization, JSON-LD, time zones, rounding,
  accessibility of the duplicated logos, email validation…), all caught.
- A real page published with `rebuild_all.php` (with `master.html`) and loaded in jsdom with scripts enabled.

## Found and fixed along the way
- `mb_strtoupper()` doesn't exist without mbstring: it would have made publishing fail on hosting
  without the extension. Initials now use PCRE and the CSS does the uppercasing.
- PHP and JS rounded differently (2.675 → 2.68 on the site, 2.67 in the editor): now identical.
- The property panel lost an edit if another one arrived before the re-render (a pre-existing flaw).

## Not verified
The real look in an actual browser: that's for you to judge on screen (spacing, colors, mobile rendering).
