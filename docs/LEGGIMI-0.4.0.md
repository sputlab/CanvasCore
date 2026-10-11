# CanvasCore 0.4.0 — Fase 2 chiusa (editor sul renderer canonico)

## File da sostituire
Frontend: `src/components/SortableBlock.jsx`, `src/render/renderBlock.mjs`,
`tests/parity.mjs`
Backend: `canvascore-admin/version.json`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

## Cosa cambia
L'editor ora **non ha più una propria implementazione di rendering**: mostra i
blocchi con lo **stesso HTML del sito pubblicato** (il renderer canonico
`renderBlock.mjs`). I container usano `blockRoot`, la fonte unica condivisa con il
compiler per l'elemento radice. Resta React solo per l'editing inline (Jodit) dei
blocchi testuali quando selezionati — che è giusto così, è l'interfaccia di
modifica.

Risultato: l'anteprima nel canvas coincide con la pagina compilata — inclusi
allineamento dei pulsanti, aspect-ratio di slider/immagini, ecc. — e ogni blocco
nuovo d'ora in poi avrà un'unica implementazione da mantenere.

## Importante — cosa è garantito e cosa va testato
- **Garantito**: l'output pubblicato (compiler PHP) NON cambia; è coperto dal test
  di parità (`npm run test:parity`), verde su tutti i 19 blocchi.
- **Da validare da parte tua**: l'aspetto dell'EDITOR. Ho cambiato il modello
  della cornice di selezione/drag (ora "neutra", gli stili vivono sull'elemento
  del blocco), quindi il layout nel canvas potrebbe apparire leggermente diverso
  rispetto a prima — in genere più fedele al sito reale. Prova in particolare:
  blocchi dentro FLEX_ROW e CSS_GRID, selezione/trascinamento, ed editing inline
  del testo (TEXT/HERO/IMAGE_TEXT/FORM).

Se qualcosa nell'editor appare storto, segnalamelo: i siti pubblicati restano
comunque corretti, quindi possiamo iterare sull'editor senza rischi.

## Prossimo
Chiusa la Fase 2, si prosegue (come da tua scaletta) con lo **Step C**: template
di partenza + import/export dei siti.
