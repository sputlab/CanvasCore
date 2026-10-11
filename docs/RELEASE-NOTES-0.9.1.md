# CanvasCore 0.9.1 — Blog/Collections part 2: "Collection List" block

## Files to REPLACE
Backend: `canvascore-admin/compiler.php`, `blocks.json`, `version.json`
Frontend: `src/render/renderBlock.mjs`, `src/components/SortableBlock.jsx`,
`src/components/PropertyPanel.jsx`, `src/components/VisualEditor.jsx`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

(No DB migration: it uses the tables from 0.9.0.)

## How it works
- In the editor, blocks panel → PREMIUM → **Collection List**.
- Select it and in the right-hand panel choose the **collection**, how many items
  to show, the **columns** and whether to show cover/date/excerpt.
- When published, the block lists the collection's **published** items as cards
  linking to the item's page (`/<collection>/<item>/`), sorted by date (newest
  first). Responsive: 1 column on mobile.
- In the editor you see a **placeholder preview** (the block is dynamic: the real
  items appear at build time, as happens for Masters).

Typical blog workflow: create the "Blog" collection and its items (0.9.0), then
put a **Collection List** on the home page or on a "Blog" page to list them.

## Verified
Real compiler rendering (cards, `/blog/<slug>/` links, sorting by date, drafts
excluded, cover, responsive grid, "no items" fallback). Build, lint
(0 errors) and parity green (the dynamic block is excluded from parity, like
Masters).
