# CanvasCore 0.5.1 — editor fixes (flex/grid, FAQ/FORM, slider, navigator)

## Files to replace
Frontend: `src/components/SortableBlock.jsx`, `src/store/useStore.js`,
`src/render/renderBlock.mjs`, `tests/parity.mjs`
Backend: `canvascore-admin/version.json`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build` (and optionally `npm run test:parity`)

## Bugs fixed
1. **FAQ and FORM did not appear in the editor canvas** (fine on the published
   site): they were missing from the canonical JS renderer. Added and put under
   the parity test.
2. **Flex Row / CSS Grid in the editor**: children did not size/align properly.
   The selection/drag frame now carries the sizing properties
   (width, flex, grid, margin, ...) and behaves like the real item; the canonical
   content neutralizes them inside (no double application). Flex and grid in the
   editor now match the site.
3. **Slider in the editor**: it now animates fade and slide (it used to be static).
4. **DOM Navigator**: dragging downwards didn't work; reordering is now
   directional and works in both directions.

## Cross tests (as requested)
The parity test (`npm run test:parity`) now includes FAQ, FORM and cross cases
with **Flex Row and CSS Grid containing nested blocks** (images, text,
buttons, icon-box, flex inside grid). 23 fixtures, all green: the editor's HTML
and the published site's HTML match.

## To validate
Try in the editor: flex row and css grid with elements inside (sizes and
alignment), fade/slide slider, and dragging in the Navigator in both directions
and between containers. The published output is guaranteed by the tests; the
editor's appearance is what is worth checking by eye.
