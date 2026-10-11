# CanvasCore 0.9.0 — Blog / Collezioni (parte 1)

## File NUOVI
- `canvascore-frontend/src/components/Collections.jsx`

## File da SOSTITUIRE
Backend: `canvascore-admin/api.php`, `rebuild_all.php`, `migrations.php`,
`version.json`
Frontend: `src/App.jsx`, `src/components/VisualEditor.jsx`,
`src/components/PageManager.jsx`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

## Migrazione DB (automatica)
Schema DB → **v4** (tabelle `collections`, `collection_items`). Si applica da sola
al primo caricamento. Verificata su DB nuovi ed esistenti.

## Come funziona
1. In dashboard apri **Collections** → crea una collezione (es. "Blog").
2. Dentro la collezione crea le **voci** (i post): ogni voce ha titolo, slug,
   excerpt, cover, data, stato (draft/published) e si **modifica con l'editor a
   blocchi**, come una pagina.
3. Pubblica: ogni voce pubblicata diventa `/<collezione>/<voce>/index.html`, con
   menu, header/footer globali, meta OpenGraph e voce in sitemap. Le bozze non
   vengono generate.

Gestione collezioni (crea/elimina) = admin; scrittura delle voci = qualsiasi
utente loggato (blocchi "codice" riservati agli admin, come per le pagine).

## Nota
Questa è la **parte 1**: modello dati + gestione + pagine delle voci. La
**parte 2** aggiungerà un **blocco "lista/archivio"** da mettere in qualsiasi
pagina per elencare le voci (card + excerpt + link) — è il pezzo che rende il
blog "navigabile". Per ora puoi linkare le voci dal menu o con i pulsanti.

## Verificato
Migrazione v4, CRUD collezioni/voci, generazione delle pagine voce (solo
pubblicate), header/footer + SEO. Build, lint (0 errori), parità verdi.
