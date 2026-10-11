# CanvasCore 0.11.0 — Accordion, Tabs, Pricing, Gallery with lightbox

## NEW files
- `canvascore-frontend/tests/blocks.mjs` — behavioral tests for the new blocks

## Files to REPLACE
Backend: `canvascore-admin/compiler.php`, `blocks.json`, `version.json`
Frontend: `package.json`, `src/render/renderBlock.mjs`,
`src/components/PropertyPanel.jsx`, `SortableBlock.jsx`, `VisualEditor.jsx`,
`tests/parity.mjs`
Plus: `CHANGELOG.md`
→ then:
```
cd canvascore-frontend
npm install          # brings in jsdom (devDependency, for the tests only)
npm run build
npm test             # parity + behavior
```
No DB migration.

## How to use them
In the ADD → PREMIUM panel you'll find **Accordion, Tabs, Pricing, Gallery**. With
the block selected, the right-hand panel lets you add, reorder (↑/↓) and remove
items/plans/images, and adjust style and layout.

- **Accordion** — rich content per item; Cards or Flat; icon; first item open;
  exclusive (only one open) or multiple. The **FAQ** block remains for
  plain-text questions/answers.
- **Tabs** — Underline or Pills, tab alignment. CSS only, no JS.
- **Pricing** — name, price, period, description, features (one per line),
  button (URL, `mailto:` or "Link to a page…"), highlighted plan with badge.
  Automatic columns (max 4); on mobile the plans stack.
- **Gallery** — Grid (uniform thumbnails, choice of ratio) or Masonry; 1–6
  columns; gap; captions; lightbox (←/→/Esc, swipe, click on the backdrop).
  Add images from the Media Manager ("+ Add image from media").

## Things to know (being honest)
- The content of Accordion/Tabs panels is written as **text/HTML** in the side
  panel (like Grid/Cards), not with the inline visual editor.
- Tabs are radio+label in CSS: they can be navigated with the keyboard arrows,
  but they don't implement the full ARIA "tabs" pattern (I avoided fake roles).
- In the editor the lightbox doesn't open (it is a behavior of the published
  page); Accordion and Tabs, however, are interactive in the canvas too.
- Pricing doesn't have a monthly/yearly switch yet.

## Verified
- Editor↔compiler parity (including the real defaults from `blocks.json`), also
  comparing the `<style>` tags for these blocks.
- Behavioral tests: Tabs (the CSS shows exactly panel/tab k), lightbox in jsdom
  (open, next/previous with looping, Esc, backdrop, two galleries on the same
  page), sanitization, exclusive/multiple accordion, Pricing URLs.
- **Mutation testing**: I deliberately planted bugs in the compiler (wrong tabs,
  broken Esc, unsanitized content) and the tests caught them. This surfaced and
  fixed a flaw in my own Tabs test.
- Final compiled page (with `master.html`) loaded in jsdom: blocks present, no
  unresolved placeholders, lightbox working.
- Build and lint (0 errors).
