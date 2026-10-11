# CanvasCore 0.7.2 — high density + reorganized dashboard

## Files to REPLACE
Frontend: `src/components/PageManager.jsx`, `GlobalSettings.jsx`,
`MediaManager.jsx`, `MenuBuilder.jsx`, `Submissions.jsx`, `Templates.jsx`,
`UserManager.jsx`, `PropertyPanel.jsx`
Backend: `canvascore-admin/version.json`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

(Also requires `src/ui/global.css` from 0.7.1, if you haven't applied it already.)

## What changes
- **Much higher density**: tighter container padding and **more compact
  input/label fields** (less height, 12–13px font) on form screens. More useful
  content on screen on 14" FHD laptops.
- **Dashboard reorganized** as requested:
  - user pill (name + role) **at the top left**, with **Logout** next to it;
  - primary actions (New Page, Publish All) at the top right;
  - secondary navigation in a dedicated compact bar (smaller buttons);
  - "Account" → **"Accounts"**.

## To validate
Look at the dashboard on your monitor and tell me whether the density is right:
I can tighten it further or loosen it a touch. If you're happy with it, we move
on to **pass 2** with the redesign of the editor (bar, panels, canvas) along the
same lines of density and elegance.
