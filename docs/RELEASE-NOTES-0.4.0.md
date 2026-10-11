# CanvasCore 0.4.0 — Phase 2 complete (editor on the canonical renderer)

## Files to replace
Frontend: `src/components/SortableBlock.jsx`, `src/render/renderBlock.mjs`,
`tests/parity.mjs`
Backend: `canvascore-admin/version.json`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

## What changes
The editor **no longer has its own rendering implementation**: it shows the
blocks with the **same HTML as the published site** (the canonical renderer
`renderBlock.mjs`). Containers use `blockRoot`, the single source shared with the
compiler for the root element. React remains only for inline editing (Jodit) of
text blocks when selected — which is as it should be, since that is the editing
interface.

Result: the preview in the canvas matches the compiled page — including button
alignment, slider/image aspect-ratio, etc. — and from now on every new block will
have a single implementation to maintain.

## Important — what is guaranteed and what needs testing
- **Guaranteed**: the published output (PHP compiler) does NOT change; it is
  covered by the parity test (`npm run test:parity`), green on all 19 blocks.
- **For you to validate**: the look of the EDITOR. I changed the model of the
  selection/drag frame (now "neutral", with the styles living on the block's
  element), so the layout in the canvas may look slightly different from before —
  usually closer to the real site. In particular, try: blocks inside FLEX_ROW and
  CSS_GRID, selection/dragging, and inline text editing
  (TEXT/HERO/IMAGE_TEXT/FORM).

If something in the editor looks off, let me know: published sites remain
correct regardless, so we can iterate on the editor without risk.

## Next
With Phase 2 complete, we continue (as per your plan) with **Step C**: starter
templates + site import/export.
