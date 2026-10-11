# CanvasCore 0.7.3 — UI refresh pass 2: editor

## Files to REPLACE
Frontend: `src/components/VisualEditor.jsx`, `src/components/PropertyPanel.jsx`
Backend: `canvascore-admin/version.json`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

## What changes in the editor
- **Blocks in a 2-column grid**: the "ADD" panel now shows blocks as compact
  tiles (icon + short label), much denser and tidier. You see more without
  scrolling.
- **Narrower panels** (left 250px, right 300px) → more room for the canvas,
  useful on 14" screens.
- **Reduced spacing** everywhere: floating bar, accordions, property panel
  header, Save/Publish bar, and less padding around the canvas.
- Block labels shortened for readability.

## Important
The **rendering of blocks in the canvas has not been touched** (it is under the
parity test): only the editor's "frame" has changed. The preview stays identical
to the published site.

## To validate
Open the editor and look at: the block grid, the panel widths and the overall
density. Tell me whether it's the right balance or whether to tighten/loosen.
If you're convinced, the UI pass is essentially complete and we can move on to
**Step A** (license + installer + docs) to seal the project, or polish other
screens.
