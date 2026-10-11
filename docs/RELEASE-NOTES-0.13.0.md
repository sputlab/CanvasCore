# CanvasCore 0.13.0 — 12 nuovi blocchi

Divider · Callout · Steps · Counters · Progress bars · Data table · Countdown · Timeline · Logo cloud ·
Team · Before/After · Business info

## File da SOSTITUIRE
Backend: `canvascore-admin/compiler.php`, `blocks.json`, `version.json`
Frontend: `package.json`, `src/render/renderBlock.mjs`, `src/components/PropertyPanel.jsx`,
`VisualEditor.jsx`, `SortableBlock.jsx`, `tests/parity.mjs`
## File NUOVI
`tests/blocks-content.mjs`, `tests/panels-ui.mjs`
Più `CHANGELOG.md`.

```
cd canvascore-frontend
npm install     # nessuna nuova dipendenza
npm run build
npm test        # 6 suite: parità, blocchi, contenuto, sessione, sessione-UI, pannelli
```
Nessuna migrazione DB. Il compiler **non richiede mbstring**.

## Dove si trovano
Pannello ADD → **CONTENT BLOCKS**. Selezionato il blocco, il pannello a destra permette di modificare
contenuti, aggiungere/riordinare/rimuovere voci e regolare il layout.

## Come si comportano (cose utili da sapere)
- **Counters / Progress / Countdown**: il valore finale c'è già nell'HTML; gli script lo animano solo se il
  browser lo permette (non per chi preferisce meno animazioni). Nel canvas dell'editor vedi lo stato finale.
- **Countdown**: "ora locale del visitatore" oppure UTC fisso (non segue l'ora legale: scegli l'offset valido
  alla data di scadenza).
- **Data table**: incolla da Excel/Sheets (le celle arrivano separate da Tab) o scrivi `Nome | Ruolo | Città`.
- **Logo cloud** a scorrimento: solo CSS, si ferma al passaggio del mouse e per chi preferisce meno movimento.
- **Before/After**: due immagini della stessa dimensione/inquadratura; si usa anche da tastiera (frecce).
- **Business info**: genera i dati strutturati per Google solo se il blocco ha un nome. I giorni si possono
  etichettare in qualsiasi lingua: a Google arrivano sempre i nomi standard, in ordine Lunedì → Domenica.
  Non c'è l'indicatore "aperto ora".
- **Callout / Team / ecc.**: i testi sono escapati; dove è previsto HTML (Callout) viene sanificato.

## Come è stato verificato
- Parità editor ↔ compiler su tutte le varianti e casi limite (compresi i **default reali** di `blocks.json`),
  con confronto anche dei tag `<style>`.
- 149 controlli comportamentali sul compiler: validatori anti-iniezione per colori e numeri, formattazione
  numerica **identica in PHP e JS** su casi difficili (2.675, 1.005, negativi…), JSON-LD (anche con un nome che
  tenta di chiudere lo `<script>`), e gli script eseguiti in jsdom con orologio, `requestAnimationFrame` e
  `IntersectionObserver` controllati (countdown con fusi +02:00 / −05:00, contatori, barre, prima/dopo).
- 71 controlli sull'editor con i componenti veri (jsdom): `addBlock` → pannello → modifica → store, e ogni
  blocco disegnato nel canvas.
- **Test di mutazione**: 14 bug piantati di proposito (sanificazione, JSON-LD, fusi, arrotondamenti,
  accessibilità dei loghi duplicati, validazione email…), tutti rilevati.
- Pagina reale pubblicata con `rebuild_all.php` (con `master.html`) e caricata in jsdom con gli script attivi.

## Trovato e corretto lungo la strada
- `mb_strtoupper()` non esiste senza mbstring: avrebbe fatto fallire la pubblicazione su hosting senza
  l'estensione. Ora le iniziali usano PCRE e la maiuscola la fa il CSS.
- PHP e JS arrotondavano diversamente (2,675 → 2.68 sul sito, 2.67 nell'editor): ora identici.
- Il pannello proprietà perdeva una modifica se ne arrivava un'altra prima del re-render (difetto preesistente).

## Non verificato
L'aspetto reale in un browser vero: lo giudichi tu a video (spaziature, colori, resa su mobile).
