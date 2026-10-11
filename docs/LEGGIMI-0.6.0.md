# CanvasCore 0.6.0 — Step C: Templates + Import/Export

## File NUOVI
- `canvascore-admin/starters.json` — i template di partenza (estendibili)
- `canvascore-frontend/src/components/Templates.jsx` — la galleria template

## File da SOSTITUIRE
Backend: `canvascore-admin/api.php`, `version.json`
Frontend: `src/App.jsx`, `src/components/PageManager.jsx`,
`src/render/renderBlock.mjs`  (quest'ultimo per una piccola pulizia lint)
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

## Novità
### Template di partenza
Nuovo pulsante **Templates** in dashboard → galleria con Blank, Landing Page,
About, Contact. "Use template" crea una nuova pagina-bozza con quei blocchi, già
modificabile. Per aggiungerne altri, basta aggiungere voci a
`canvascore-admin/starters.json` (ogni voce: id, name, description, blocks[]).

### Esporta / Importa sito (solo admin)
- **Export**: scarica un JSON con tutto il sito (pagine, menu, impostazioni,
  master, template) + manifest dei media. Ottimo come backup.
- **Import**: ripristina/sostituisce il sito da un file di export. **Sostituisce**
  pagine, menu, impostazioni, master e template; gli **account utente restano**.
  Gira in transazione (se qualcosa va storto, rollback) e ripubblica il sito.

## Nota sui media
Export/import coprono struttura e configurazione, non i binari. Per spostare il
sito su un ALTRO server, copia anche la cartella `uploads/` (il manifest
nell'export elenca i file usati). Per backup/ripristino sullo STESSO server, i
media restano al loro posto: il ripristino è completo.

## Verificato
- Round-trip export → modifica → import: sito ripristinato identico.
- Gate: solo gli admin possono esportare/importare.
- Build, lint (0 errori) e test di parità verdi.
