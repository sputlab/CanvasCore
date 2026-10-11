# CanvasCore 0.7.0 — SEO/pubblicazione + Form avanzati

## File NUOVI
- `canvascore-frontend/src/components/Submissions.jsx`

## File da SOSTITUIRE
Backend: `canvascore-admin/api.php`, `rebuild_all.php`, `compiler.php`,
`submit_form.php`, `migrations.php`, `version.json`
Frontend: `src/App.jsx`, `src/render/renderBlock.mjs`,
`src/components/PageManager.jsx`, `GlobalSettings.jsx`, `PropertyPanel.jsx`,
`VisualEditor.jsx`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

## Migrazione DB (automatica)
Questa release porta lo schema DB a **v2** (colonna `seo_image` + tabella
`form_submissions`). La migrazione gira da sola al primo caricamento del pannello
(verificata su DB nuovi ed esistenti, idempotente). Non devi fare nulla a mano.

## SEO & pubblicazione (punto 2)
- Ad ogni "Publish" vengono generati `sitemap.xml`, `robots.txt`, `404.html` e un
  `.htaccess` con `ErrorDocument` (Apache; su Nginx configura il 404 a mano).
- Ogni pagina riceve meta OpenGraph/Twitter + favicon nel `<head>`.
- In **Global Options** → sezione "SEO & Publishing": Site URL, Site Name,
  Favicon URL, immagine social di default, toggle indicizzazione.
- Nel pannello SEO di ogni pagina puoi impostare l'immagine social (OG) specifica.
- Imposta **Site URL** per avere sitemap e og:url con URL assoluti.

## Form avanzati (punto 3)
- Ogni invio form viene archiviato nel database (anche senza email configurata).
- Nuova sezione **Submissions** (solo admin) in dashboard: elenco invii, **Export
  CSV**, elimina singolo / svuota tutto.
- **Honeypot** anti-spam integrato: gli invii dei bot vengono scartati in
  silenzio.

## Verificato
- Migrazione v1→v2 (dati preservati, idempotente).
- Archiviazione invii + honeypot (spam escluso) + export CSV.
- Generazione sitemap/robots/404 + meta OG/favicon.
- seo_image round-trip (save/get/export). Build, lint (0 errori), parità verdi.
