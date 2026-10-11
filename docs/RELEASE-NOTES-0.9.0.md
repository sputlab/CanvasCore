# CanvasCore 0.9.0 — Blog / Collections (part 1)

## NEW files
- `canvascore-frontend/src/components/Collections.jsx`

## Files to REPLACE
Backend: `canvascore-admin/api.php`, `rebuild_all.php`, `migrations.php`,
`version.json`
Frontend: `src/App.jsx`, `src/components/VisualEditor.jsx`,
`src/components/PageManager.jsx`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

## DB migration (automatic)
DB schema → **v4** (`collections`, `collection_items` tables). It applies itself
on the first load. Verified on new and existing DBs.

## How it works
1. In the dashboard open **Collections** → create a collection (e.g. "Blog").
2. Inside the collection create the **items** (the posts): each item has a
   title, slug, excerpt, cover, date, status (draft/published) and is **edited
   with the block editor**, like a page.
3. Publish: each published item becomes `/<collection>/<item>/index.html`, with
   the menu, global header/footer, OpenGraph meta and a sitemap entry. Drafts are
   not generated.

Managing collections (create/delete) = admins; writing items = any signed-in
user ("code" blocks reserved for admins, as for pages).

## Note
This is **part 1**: data model + management + item pages. **Part 2** will add a
**"list/archive" block** to place on any page to list the items (cards +
excerpt + link) — the piece that makes the blog "navigable". For now you can
link to the items from the menu or with buttons.

## Verified
v4 migration, collection/item CRUD, generation of item pages (published only),
header/footer + SEO. Build, lint (0 errors), parity green.
