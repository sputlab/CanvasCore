# CanvasCore 0.6.0 — Step C: Templates + Import/Export

## NEW files
- `canvascore-admin/starters.json` — the starter templates (extensible)
- `canvascore-frontend/src/components/Templates.jsx` — the template gallery

## Files to REPLACE
Backend: `canvascore-admin/api.php`, `version.json`
Frontend: `src/App.jsx`, `src/components/PageManager.jsx`,
`src/render/renderBlock.mjs`  (the latter for a small lint cleanup)
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

## New
### Starter templates
New **Templates** button in the dashboard → gallery with Blank, Landing Page,
About, Contact. "Use template" creates a new draft page with those blocks, ready
to edit. To add more, just add entries to
`canvascore-admin/starters.json` (each entry: id, name, description, blocks[]).

### Export / Import site (admins only)
- **Export**: downloads a JSON file with the whole site (pages, menu, settings,
  masters, templates) + a media manifest. Great as a backup.
- **Import**: restores/replaces the site from an export file. It **replaces**
  pages, menu, settings, masters and templates; **user accounts are kept**.
  It runs in a transaction (if something goes wrong, it rolls back) and
  republishes the site.

## Note on media
Export/import cover structure and configuration, not the binaries. To move the
site to ANOTHER server, also copy the `uploads/` folder (the manifest in the
export lists the files in use). For backup/restore on the SAME server, the media
stay where they are: the restore is complete.

## Verified
- Round trip export → modify → import: site restored identically.
- Gate: only admins can export/import.
- Build, lint (0 errors) and parity tests green.
