# CanvasCore 0.5.1 — fix editor (flex/grid, FAQ/FORM, slider, navigator)

## File da sostituire
Frontend: `src/components/SortableBlock.jsx`, `src/store/useStore.js`,
`src/render/renderBlock.mjs`, `tests/parity.mjs`
Backend: `canvascore-admin/version.json`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build` (e volendo `npm run test:parity`)

## Bug risolti
1. **FAQ e FORM non apparivano nel canvas editor** (ok sul sito pubblicato):
   mancavano nel renderer canonico JS. Aggiunti e messi sotto test di parità.
2. **Flex Row / CSS Grid nell'editor**: i figli non si dimensionavano/allineavano
   bene. Ora la cornice di selezione/drag porta le proprietà di sizing
   (width, flex, grid, margin, ...) e si comporta come l'item vero; il contenuto
   canonico le neutralizza al suo interno (niente doppia applicazione). Flex e
   grid nell'editor ora combaciano col sito.
3. **Slider nell'editor**: ora anima fade e slide (prima era statico).
4. **DOM Navigator**: il drag verso il basso non funzionava; ora il riordino è
   direzionale e funziona in entrambi i versi.

## Test incrociati (come richiesto)
Il test di parità (`npm run test:parity`) ora include FAQ, FORM e casi incrociati
con **Flex Row e CSS Grid che contengono blocchi annidati** (immagini, testo,
pulsanti, icon-box, flex dentro grid). 23 fixture, tutte verdi: l'HTML dell'editor
e quello del sito pubblicato coincidono.

## Da validare
Prova nell'editor: flex row e css grid con elementi dentro (dimensioni e
allineamenti), slider fade/slide, e il drag nel Navigator in entrambe le direzioni
e tra container. L'output pubblicato è garantito dai test; l'aspetto dell'editor
è ciò che conviene verificare a occhio.
