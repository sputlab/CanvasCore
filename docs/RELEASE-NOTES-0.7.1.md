# CanvasCore 0.7.1 — UI refresh (pass 1): density + premium base

## NEW files
- `canvascore-frontend/src/ui/global.css`

## Files to REPLACE
Frontend: `src/main.jsx` and the components
`PageManager, GlobalSettings, MediaManager, MenuBuilder, Submissions, Templates,
UserManager, VisualEditor, LayerNavigator, PropertyPanel`
Backend: `canvascore-admin/version.json`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

## What changes
- **Premium global base** (`global.css`): shared palette/spacing tokens,
  thin scrollbars, better text rendering, selection color, app fade-in. It is
  written so that it does NOT touch generic elements
  (button/input/a/h…): that way the canvas preview stays identical to the site.
- **Density** across the whole admin interface: padding of containers, the
  dashboard (title, toolbar, rows), the editor (top bar, panels) and the
  DOM Navigator reduced in moderation — more information on screen on a 14" FHD,
  without sacrificing readability.

## Note on approach (important)
This is a **first safe, incremental step**: global base + density. A deeper
"premium" restyle (a tokenized UI component library replacing all the inline
styles, consistent hover/focus states, micro-animations) is a separate job best
done surface by surface with your validation, so as not to introduce invisible
regressions. Try it and tell me whether the density suits you (I can tighten or
loosen it) and which screen to start from for pass 2.
