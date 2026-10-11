# CanvasCore 0.3.1 — fix e rifiniture Menu Builder

## File da sostituire
Backend: `canvascore-admin/compiler.php`, `api.php`, `version.json`
Frontend: `src/components/MenuBuilder.jsx`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

## Bug risolti
1. **Colori del menu** (testo, testo/sfondo in hover) non cambiavano: erano
   sovrascritti da regole globali del template a specificità più alta. Ora le
   regole del menu sono prefissate con `.cc-navigation` e vincono.
2. **Sticky** non funzionante: `body { overflow-x: clip }` del template rompe
   `position: sticky`. Il menu sticky ora usa `position: fixed` e resta in alto
   (con compensazione automatica dell'altezza del contenuto).
3. **Glare** tagliava i sottomenu: ora il bagliore è su un overlay dedicato
   clippato solo alla barra; i dropdown non vengono più tagliati.

## Aggiunte
- **Item border**: menu a tendina con preset (none/thin/solid/dashed/dotted) +
  Custom.
- **Item radius**: regolabile con le frecce ↑/↓ della tastiera.
- **Logo**: oltre a incollare l'URL, ora puoi **caricare** l'immagine con un
  pulsante; il file viene salvato in /uploads ed è quindi disponibile nel
  Media Manager. L'endpoint di upload ora restituisce l'URL del file.

## Nota
Dopo l'aggiornamento, hard refresh (Ctrl/Cmd+Shift+R). Se avevi un menu già
salvato, riaprilo e salvalo di nuovo per applicare i fix di stile.
