# CanvasCore 0.5.0 — Drag & drop cross-container

## File da sostituire
Frontend: `src/store/useStore.js`, `src/components/LayerNavigator.jsx`
Backend: `canvascore-admin/version.json`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

(Il Canvas usa già `moveBlock`: non serve modificarlo, eredita automaticamente il
nuovo comportamento cross-container.)

## Novità
- **Canvas**: oltre a riordinare, ora puoi trascinare un elemento **dentro un
  altro container/sezione** o **in una cella di CSS Grid / Simple Grid**.
  - su un container **vuoto** → l'elemento entra dentro;
  - su un altro blocco → diventa suo fratello in quella posizione (quindi dentro
    lo stesso container del blocco di destinazione).
- **DOM Navigator** (pannello sinistro): ogni voce ha una maniglia ⋮⋮ per
  trascinare; puoi riordinare e ri-annidare tra container/sezioni direttamente
  dall'albero. È lo strumento più preciso per i ri-annidamenti.
- `moveBlock` è ora un'operazione unica sull'albero, **anti-ciclo** (non puoi
  spostare un blocco dentro un suo discendente).

## Verificato / da validare
- La logica di spostamento è stata testata in isolamento su tutti i casi.
- Build e test di parità verdi; l'output pubblicato non cambia.
- **Da provare da parte tua** nell'editor: trascinamenti nel canvas tra container
  e nelle grid, e nel Navigator. Se nel canvas un rilascio "atterra" nel punto
  sbagliato (dnd-kit sceglie il bersaglio più vicino), usa il Navigator per il
  ri-annidamento preciso — se capita spesso possiamo affinare il rilevamento
  collisioni.
