# CanvasCore 0.3.0 — Advanced Menu Builder + user in the dashboard

## Files to replace
Backend: `canvascore-admin/compiler.php`, `api.php`, `version.json`
Frontend: `src/components/MenuBuilder.jsx`, `src/components/PageManager.jsx`,
`src/store/useStore.js`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

## Main changes
- **Submenu bug fixed**: the Menu Builder now uses a real nested tree.
  Reordering and nesting (⇥ nests under the previous item, ⇤ un-nests) are
  consistent and persist correctly. Items at the same level can also be
  reordered with **drag & drop**.
- **Item without a link**: leave the URL empty and the parent item will only open
  the submenu (no href), useful when there is no page for the parent level.
- **Multi-level submenus** with cascading dropdowns.
- **Visual customization**: item borders, spacing between items, text color,
  hover text/background color, bar height, background with **opacity**,
  shadow.
- **Logo**: image + height + alignment independent of the buttons, with a
  configurable gap. Priority logic as requested:
  - logo and buttons on the **same side** → side by side, separated by "Logo/Buttons gap";
  - on **opposite sides** → logo and buttons at the two ends (space-between).
- **Premium effects**: animated underline, lift, glassmorphism (blur), glare.
- **Live preview** of the menu in the builder.
- **Dashboard**: the signed-in user (name + role) is shown at the top.

## Compatibility
Menus saved in the old format (flat list with parentId) are automatically
converted into a nested tree by both the editor and the compiler: no data is
lost. The first time you open the Menu Builder, save to consolidate the new
format.

## Note on the effects
"Glass" looks best with a semi-transparent background (lower the background
opacity). "Glare" adds an animated reflection that sweeps across the bar.
