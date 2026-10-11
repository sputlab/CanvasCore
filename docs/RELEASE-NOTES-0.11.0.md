# CanvasCore 0.11.0 — Accordion, Tabs, Pricing, Gallery con lightbox

## File NUOVI
- `canvascore-frontend/tests/blocks.mjs` — test comportamentali dei nuovi blocchi

## File da SOSTITUIRE
Backend: `canvascore-admin/compiler.php`, `blocks.json`, `version.json`
Frontend: `package.json`, `src/render/renderBlock.mjs`,
`src/components/PropertyPanel.jsx`, `SortableBlock.jsx`, `VisualEditor.jsx`,
`tests/parity.mjs`
Più: `CHANGELOG.md`
→ poi:
```
cd canvascore-frontend
npm install          # porta jsdom (devDependency, solo per i test)
npm run build
npm test             # parità + comportamento
```
Nessuna migrazione DB.

## Come si usano
Nel pannello ADD → PREMIUM trovi **Accordion, Tabs, Pricing, Gallery**. Selezionato
il blocco, il pannello a destra permette di aggiungere, riordinare (↑/↓) e
rimuovere voci/piani/immagini, e di regolare stile e layout.

- **Accordion** — contenuto ricco per voce; Cards o Flat; icona; prima voce
  aperta; esclusivo (una sola aperta) o multiplo. Il blocco **FAQ** resta per
  domande/risposte in testo semplice.
- **Tabs** — Underline o Pills, allineamento delle schede. Solo CSS, niente JS.
- **Pricing** — nome, prezzo, periodo, descrizione, funzionalità (una per riga),
  pulsante (URL, `mailto:` o "Link to a page…"), piano evidenziato con badge.
  Colonne automatiche (max 4); su mobile i piani si impilano.
- **Gallery** — Grid (miniature uniformi, rapporto a scelta) o Masonry; 1–6
  colonne; gap; didascalie; lightbox (←/→/Esc, swipe, click sullo sfondo).
  Aggiungi le immagini dal Media Manager ("+ Add image from media").

## Cose da sapere (onestà)
- Il contenuto dei pannelli Accordion/Tabs si scrive come **testo/HTML** nel
  pannello laterale (come Grid/Cards), non con l'editor visuale inline.
- I Tabs sono radio+label in CSS: si navigano con le frecce da tastiera, ma non
  implementano il pattern ARIA "tabs" completo (ho evitato i ruoli finti).
- Nell'editor la lightbox non si apre (è un comportamento della pagina
  pubblicata); Accordion e Tabs invece sono interattivi anche nel canvas.
- Il Pricing non ha ancora un selettore mensile/annuale.

## Verificato
- Parità editor↔compiler (inclusi i default reali di `blocks.json`), con
  confronto anche dei tag `<style>` per questi blocchi.
- Test comportamentali: Tabs (la CSS mostra esattamente il pannello/tab k),
  lightbox in jsdom (apri, avanti/indietro con loop, Esc, sfondo, due gallerie
  nella stessa pagina), sanificazione, accordion esclusivo/multiplo, URL Pricing.
- **Test di mutazione**: ho piantato bug di proposito nel compiler (tab sbagliati,
  Esc rotto, contenuto non sanificato) e i test li hanno rilevati. Così è emerso
  e corretto un difetto nel mio stesso test dei Tabs.
- Pagina finale compilata (con `master.html`) caricata in jsdom: blocchi presenti,
  nessun segnaposto non risolto, lightbox funzionante.
- Build e lint (0 errori).
