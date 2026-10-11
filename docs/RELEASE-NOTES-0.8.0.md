# CanvasCore 0.8.0 — Global Header/Footer

## Files to REPLACE
Backend: `canvascore-admin/api.php`, `rebuild_all.php`, `migrations.php`,
`version.json`
Frontend: `src/components/VisualEditor.jsx`, `src/components/PageManager.jsx`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

## DB migration (automatic)
DB schema → **v3** (`site_parts` table). It applies itself on the first load of
the panel. Verified on new and existing DBs.

## How it works
- In the dashboard you'll find two new buttons: **Header** and **Footer**.
- They open the block editor on that global area: you build the header and
  footer the same way you build a page (section, logo, secondary menu, columns,
  text…).
- When you save and publish, the header and footer appear **on every page**:
  the header before the content, the footer after it, full width.
- "Code" blocks (custom HTML/CSS) remain reserved for admins here too.
- Site Export/Import now also includes the header and footer.

## Verified
- v3 migration, save/get endpoints, rendering and header→content→footer order,
  export/import round trip. Build, lint (0 errors) and parity green.

## Upcoming features (as per your list)
blog/collections → page revisions with rollback → new blocks (Accordion/Tabs,
Pricing, Gallery+lightbox) → per-block responsive breakpoints.
