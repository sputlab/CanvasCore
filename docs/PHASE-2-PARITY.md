# CanvasCore — Fase 2 (pass 1): parità editor ↔ pagina compilata

Obiettivo: ridurre le discrepanze tra il canvas editor (React, `SortableBlock.jsx`)
e la pagina compilata (PHP, `compiler.php`). Questo è il primo passo verso lo
schema di blocco unico.

## File da sostituire
Backend: `canvascore-admin/compiler.php`
Frontend: `src/components/SortableBlock.jsx`, `src/components/PropertyPanel.jsx`
→ poi `npm run build`.

Nessun cambio di formato dati: `content_schema` resta 1 (i nuovi campi
`aspectRatio` / `objectPosition` sono opzionali, con default retrocompatibili).

## Anomalie segnalate — risolte

### 1. Bottone: allineamento assente/diverso e padding/bordi ignorati
Causa doppia:
- **Strutture diverse.** Il compiler allineava col contenitore (`text-align`) e un
  bottone `inline-block` (giusto); l'editor rendeva un bottone a tutta larghezza
  con gli stili applicati due volte, quindi l'allineamento non aveva effetto.
- **Ordine degli stili.** Con `useGlobal` attivo (default) il compiler aggiungeva
  gli stili globali *dopo* i tuoi, sovrascrivendo padding/bordi modificati.

Correzione (identica nei due renderer): contenitore con `text-align` + `margin`,
bottone `inline-block`; stili globali applicati **prima**, stili utente **dopo**
(quindi vincono). Margin e text-align non vengono più applicati due volte.

### 2. Slider/immagini: il rapporto della prima immagine vincolava le altre
Causa: gli slide avevano `height:auto`, quindi l'altezza del box la dettava la
prima immagine.

Correzione: lo slider ora ha un **box con rapporto definito** (`aspect-ratio`,
default 16:9, configurabile) e ogni immagine lo riempie con `object-fit:cover` +
`object-position`. Così tutte le immagini mostrano lo stesso riquadro con lo zoom
corretto, a prescindere dal loro rapporto. Se imposti un'altezza esplicita sul
blocco, quella ha la precedenza sul rapporto.

Anche il blocco **IMAGE** ora ha `aspectRatio` (default Auto) + `object-position`,
così una singola immagine può essere inquadrata/zoomata in modo coerente.

Nuovi controlli nel pannello: Aspect Ratio, Image Fit, Focus/Object Position per
Slider e Immagine.

## Altre divergenze trovate nell'audit e sistemate
- **VIDEO**: l'editor usava uno split ingenuo dell'URL; ora usa lo stesso parsing
  robusto del compiler (YouTube/Vimeo), quindi l'anteprima coincide.
- **HERO**: il `min-height` in anteprima finiva solo sul wrapper esterno, non sul
  contenitore flex che centra verticalmente; ora è applicato come nel compiler.

## Verificato
- `box-sizing: border-box` globale già presente in `master.html`: padding e
  larghezze si calcolano allo stesso modo nei due renderer (nessuna divergenza).
- Tutti i 19 tipi di blocco vengono renderizzati dal compiler senza errori.
- Build del frontend pulita.

## Divergenze residue (per-anteprima, accettabili)
Alcuni blocchi, per natura, mostrano un'anteprima nell'editor diversa dall'output
finale, senza impatto sul risultato pubblicato:
- **MAPS**: in editor un segnaposto, in pagina l'iframe reale di Google Maps.
- **FORM**: in editor campi disabilitati (anteprima), in pagina il form reale.
- **VIDEO**: in editor l'anteprima ha i click disabilitati.

## Prossimo passo (pass 2): schema di blocco unico
Resta una divergenza strutturale di fondo: l'editor usa un wrapper per il drag &
drop che porta width/margin, mentre il compiler applica tutti gli stili a un
singolo elemento. Oggi i due risultati coincidono (grazie a `box-sizing` globale e
agli allineamenti sopra), ma ogni blocco nuovo richiede ancora due implementazioni
da tenere sincronizzate a mano.

Il pass 2 introdurrà un **contratto di rendering unico**: una descrizione del
blocco (tipo + stile root + markup interno) condivisa, da cui editor e compiler
producono lo stesso HTML per costruzione, con una suite di test che confronta i
due output blocco per blocco. Sarà anche il primo candidato per una migrazione
`content_schema` → 2.
