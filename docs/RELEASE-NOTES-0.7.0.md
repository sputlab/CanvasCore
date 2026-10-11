# CanvasCore 0.7.0 — SEO/publishing + advanced Forms

## NEW files
- `canvascore-frontend/src/components/Submissions.jsx`

## Files to REPLACE
Backend: `canvascore-admin/api.php`, `rebuild_all.php`, `compiler.php`,
`submit_form.php`, `migrations.php`, `version.json`
Frontend: `src/App.jsx`, `src/render/renderBlock.mjs`,
`src/components/PageManager.jsx`, `GlobalSettings.jsx`, `PropertyPanel.jsx`,
`VisualEditor.jsx`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

## DB migration (automatic)
This release brings the DB schema to **v2** (`seo_image` column +
`form_submissions` table). The migration runs by itself on the first load of the
panel (verified on new and existing DBs, idempotent). You don't need to do
anything by hand.

## SEO & publishing (point 2)
- Every "Publish" generates `sitemap.xml`, `robots.txt`, `404.html` and a
  `.htaccess` with `ErrorDocument` (Apache; on Nginx configure the 404 by hand).
- Every page gets OpenGraph/Twitter meta tags + favicon in the `<head>`.
- In **Global Options** → "SEO & Publishing" section: Site URL, Site Name,
  Favicon URL, default social image, indexing toggle.
- In each page's SEO panel you can set a page-specific social (OG) image.
- Set **Site URL** to get absolute URLs in the sitemap and og:url.

## Advanced forms (point 3)
- Every form submission is stored in the database (even with no email configured).
- New **Submissions** section (admins only) in the dashboard: list of
  submissions, **Export CSV**, delete one / clear all.
- Built-in anti-spam **honeypot**: bot submissions are silently discarded.

## Verified
- v1→v2 migration (data preserved, idempotent).
- Submission storage + honeypot (spam excluded) + CSV export.
- sitemap/robots/404 generation + OG meta/favicon.
- seo_image round trip (save/get/export). Build, lint (0 errors), parity green.
