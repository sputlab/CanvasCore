# CanvasCore 0.7.1 — UI refresh (pass 1): densità + base premium

## File NUOVI
- `canvascore-frontend/src/ui/global.css`

## File da SOSTITUIRE
Frontend: `src/main.jsx` e i componenti
`PageManager, GlobalSettings, MediaManager, MenuBuilder, Submissions, Templates,
UserManager, VisualEditor, LayerNavigator, PropertyPanel`
Backend: `canvascore-admin/version.json`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

## Cosa cambia
- **Base globale premium** (`global.css`): token di palette/spaziatura condivisi,
  scrollbar sottili, migliore rendering del testo, colore di selezione, fade-in
  dell'app. È scritta in modo da NON toccare gli elementi generici
  (button/input/a/h…): così l'anteprima del canvas resta identica al sito.
- **Densità** su tutta l'interfaccia admin: padding dei contenitori, della
  dashboard (titolo, toolbar, righe), dell'editor (barra superiore, pannelli) e
  del DOM Navigator ridotti con misura — più informazioni a schermo su 14" FHD,
  senza sacrificare leggibilità.

## Nota di metodo (importante)
Questo è un **primo passo sicuro e incrementale**: base globale + densità. Un
restyle "premium" più profondo (libreria di componenti UI tokenizzata che
sostituisca tutti gli stili inline, stati hover/focus coerenti, micro-animazioni)
è un lavoro a parte che conviene fare superficie per superficie con la tua
validazione, per non introdurre regressioni invisibili. Provalo e dimmi se la
densità è a tuo gusto (posso stringere/allargare) e da quale schermata partire
per la pass 2.
