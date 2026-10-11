# CanvasCore 0.3.2 — fix colori/gap menu + anteprima autentica

## File da sostituire
Backend: `canvascore-admin/compiler.php`, `api.php`, `rebuild_all.php`,
`master.html`, `version.json`
Frontend: `src/components/MenuBuilder.jsx`, `src/components/GlobalSettings.jsx`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

## Bug risolti
1. **Colori del menu** (testo e hover sulle voci di primo livello) e **sfondo in
   hover** non si applicavano: conflitto di specificità con le regole globali del
   tema. Ora il menu è autoritativo (usa `!important` sui propri colori) e le
   regole di menu legacy sono state **rimosse dal `master.html`**: i colori che
   imposti vincono sempre, sia sui menu sia sui sottomenu.
2. **Logo / buttons gap** non applicato nel menu reale: un `margin:0` nella lista
   azzerava il `margin-left` del gap. Corretto.

## Novità
- **Anteprima autentica**: il Menu Builder ora mostra il menu generato dal vero
  compiler, dentro un iframe isolato. È identico a ciò che vedrai sul sito
  (hover, effetti, logo, allineamenti), con i link resi inerti. Si aggiorna da
  sola mentre configuri.
- **Flag nelle Impostazioni Globali**: "Let the menu inherit the global brand
  color on hover" (default OFF). Spento → il menu usa solo i suoi colori; acceso
  → l'hover usa il colore brand globale. Come avevi proposto: in assenza del
  flag il componente usa le proprie regole e ignora lo stile globale.

## Importante
- Sostituisci anche `master.html`: è lì che vivevano le regole in conflitto.
  (Il fix con `!important` funziona comunque anche senza, ma è più pulito così.)
- Dopo l'update: riapri il Menu Builder e **salva** di nuovo per ripubblicare le
  pagine con il CSS aggiornato; poi hard refresh.
