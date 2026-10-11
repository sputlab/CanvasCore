# CanvasCore 0.5.0 — Cross-container drag & drop

## Files to replace
Frontend: `src/store/useStore.js`, `src/components/LayerNavigator.jsx`
Backend: `canvascore-admin/version.json`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

(The Canvas already uses `moveBlock`: it doesn't need changes and automatically
inherits the new cross-container behavior.)

## New
- **Canvas**: besides reordering, you can now drag an element **into another
  container/section** or **into a CSS Grid / Simple Grid cell**.
  - onto an **empty** container → the element goes inside;
  - onto another block → it becomes that block's sibling at that position (so
    inside the same container as the target block).
- **DOM Navigator** (left panel): every item has a ⋮⋮ handle for dragging; you
  can reorder and re-nest between containers/sections directly from the tree. It
  is the most precise tool for re-nesting.
- `moveBlock` is now a single operation on the tree, **cycle-safe** (you cannot
  move a block into one of its descendants).

## Verified / to validate
- The move logic was tested in isolation on all cases.
- Build and parity tests green; the published output doesn't change.
- **For you to try** in the editor: dragging in the canvas between containers
  and in grids, and in the Navigator. If a drop in the canvas "lands" in the
  wrong place (dnd-kit picks the closest target), use the Navigator for precise
  re-nesting — if it happens often we can refine collision detection.
