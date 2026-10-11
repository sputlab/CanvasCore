# CanvasCore 0.6.1 — requested tweaks

## Files to replace
Frontend: `src/components/PageManager.jsx`, `src/components/Login.jsx`,
`src/components/PropertyPanel.jsx`
Backend: `canvascore-admin/version.json`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

## Changes
- "CanvasCore Pro" → "CanvasCore" (login) and "Custom Code (Pro)" → "Custom Code".
- Export/Import icons swapped in the dashboard toolbar.
- New ⧉ button in the page list to open the published page in a new tab.
  (It works for pages that are already published: it opens `../<slug>/` or the
  root for the homepage.)
- Actions column widened for the three buttons + hover on rows.

## Note
The full "premium" UI/UX restyle (design tokens + component library) is a
dedicated piece of work: see feature #6/#UI in the list of 30. This round
contains only safe tweaks and the requested changes.
