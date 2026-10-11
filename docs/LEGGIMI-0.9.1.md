# CanvasCore 0.9.1 — Blog/Collezioni parte 2: blocco "Collection List"

## File da SOSTITUIRE
Backend: `canvascore-admin/compiler.php`, `blocks.json`, `version.json`
Frontend: `src/render/renderBlock.mjs`, `src/components/SortableBlock.jsx`,
`src/components/PropertyPanel.jsx`, `src/components/VisualEditor.jsx`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

(Nessuna migrazione DB: usa le tabelle della 0.9.0.)

## Come funziona
- Nell'editor, pannello blocchi → PREMIUM → **Collection List**.
- Selezionalo e nel pannello a destra scegli la **collezione**, quante voci
  mostrare, le **colonne** e se mostrare cover/data/excerpt.
- In pubblicazione il blocco elenca le voci **pubblicate** della collezione come
  card con link alla pagina della voce (`/<collezione>/<voce>/`), ordinate per
  data (più recenti prima). Responsive: 1 colonna su mobile.
- Nell'editor vedi un'**anteprima segnaposto** (il blocco è dinamico: le voci
  vere compaiono in build, come accade per i Master).

Flusso tipico del blog: crea la collezione "Blog" e le voci (0.9.0), poi metti un
**Collection List** nella home o in una pagina "Blog" per elencarle.

## Verificato
Rendering reale del compiler (card, link `/blog/<slug>/`, ordine per data, bozze
escluse, cover, griglia responsive, fallback "nessuna voce"). Build, lint
(0 errori) e parità verdi (il blocco dinamico è escluso dalla parità, come i
Master).
