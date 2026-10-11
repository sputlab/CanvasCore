# CanvasCore 0.10.0 — Blog: archive, cover, list, "show all"

## Files to REPLACE
Backend: `canvascore-admin/api.php`, `compiler.php`, `migrations.php`,
`version.json`
Frontend: `src/components/PropertyPanel.jsx`, `VisualEditor.jsx`, `Collections.jsx`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

## DB migration (automatic)
Schema → **v5** (`collection_items.archived` column). It applies itself.

## Your requests, resolved
1. **Archive**: each item has an **Archived** flag. It stays published/visitable
   but leaves the main list. In Collections there is an "archived" badge and a
   quick archive/restore button. In the item editor, **Item Settings** panel.
2. **Cover image** (and excerpt/date/status/archived): now set in the item
   editor's **Item Settings** panel (with cover upload).
3. **List instead of cards**: **Layout** option = Grid / List in the Collection List.
4. **"Show all"**: **Show all** option (ignores the limit). So on an "Archive"
   page with Source=Archived + Show all you see the whole history; the limit is
   for "latest N" (e.g. 3 on the home page).

## Why NOT a separate ARCHIVE_LIST block
A single **Collection List** with **Source** (Active / Archived / All) does it all:
one block to maintain, more flexible. Real pagination (/2, /3…) is a possible
future step, but with "Show all" on an archive page the whole history is already
fully accessible.

## Verified
v5 migration, archived filter (active/archived/all), limit, show-all, list
layout. Build, lint (0 errors), parity green.
