# CanvasCore — Fase 2: contratto di rendering unico + versionamento automatico

Versione: **0.2.0** (build incrementale automatico).

Questo giro mette in piedi l'architettura definitiva per la coerenza
editor ↔ pagina compilata, e l'auto-bump della versione.

## File NUOVI
- `canvascore-admin/blocks.json` — default dei blocchi (unica fonte di verità).
- `canvascore-frontend/scripts/bump.mjs` — auto-bump del numero di build.
- `canvascore-frontend/src/render/renderBlock.mjs` — renderer canonico in JS.
- `canvascore-frontend/tests/parity.mjs` — test di parità JS ↔ PHP.
- `canvascore-frontend/tests/render_php.php` — helper del test (render via compiler).

## File da SOSTITUIRE
Backend: `canvascore-admin/version.json`, `config.php`, `compiler.php`
Frontend: `package.json`, `vite.config.js`, `src/store/useStore.js`,
`src/components/PageManager.jsx`
Più, nella root: `CHANGELOG.md`.

Dopo l'aggiornamento:
```
cd canvascore-frontend
npm install        # porta cheerio (devDependency per il test di parità)
npm run build      # il prebuild auto-incrementa il numero di build
npm run test:parity
```

## 1. Versionamento automatico
`version.json` ha ora `build` e `built`. A ogni `npm run build`, l'hook
`prebuild` esegue `scripts/bump.mjs` che incrementa `build` e marca `built`.
La versione semantica (`app`) resta la fonte di verità per le release e si
bumpa a mano quando si taglia una versione (vedi VERSIONING-LEGGIMI). Il
pannello mostra `v<app> · build <n>`, così si sa sempre a che punto si è.

## 2. Contratto di rendering unico (fondamenta)
Problema storico: editor (React) e pagina compilata (PHP) erano due renderer
separati che divergevano (bottoni, slider, ecc.).

Dato che i due runtime sono diversi (editor in browser, build statica in PHP sul
server), non possono condividere lo stesso codice a runtime. L'architettura
adottata — lo standard per la parità cross-runtime — è:

1. **Un'unica fonte di verità per i default** dei blocchi: `blocks.json`,
   letta dall'editor (iniettata da Vite) e dal PHP (`cc_block_defaults()`).
   Niente più default duplicati che divergono.
2. **Un renderer canonico** (`renderBlock.mjs`) che descrive, una volta sola in
   JS puro, come ogni blocco diventa HTML. Il compiler PHP ne è lo specchio.
3. **Una verifica automatica** (`npm run test:parity`) che renderizza le stesse
   fixture con il renderer JS e con il compiler PHP e confronta **struttura e
   stili**, fallendo in caso di divergenza. È questa la garanzia: non "stesso
   codice", ma "codice dimostrato identico".

Il test confronta il box e gli stili di layout (dove nascono i bug tipo
allineamento/aspect-ratio), ignorando il testo rich-text interno (sanitizzato
lato server) e i nodi di comportamento `<script>`/`<style>` (autoplay, media
query), che sono di competenza di ciascun renderer.

Già al primo giro il test ha trovato e fatto correggere un bug reale: ICON_BOX
aveva un attributo `style` duplicato nel compiler, che rendeva inefficace
l'allineamento del testo.

Stato attuale: **19/19 blocchi in parità.**

## Come aggiungere/modificare un blocco mantenendo la parità
1. Aggiorna i default in `blocks.json`.
2. Aggiorna il rendering in `renderBlock.mjs` (JS) e in `compiler.php` (PHP).
3. Aggiungi/aggiorna una fixture in `tests/parity.mjs`.
4. `npm run test:parity` deve restare verde prima del commit.

## Prossimo passo
Collegare l'editor a `renderBlock.mjs`: nello stato "non selezionato" ogni blocco
verrà mostrato con l'HTML canonico (parità garantita con la pagina compilata),
mantenendo gli overlay interattivi (editing testo inline, media picker, DnD)
nello stato "selezionato". Con la parità già verificata dal test, questo passo
diventa a basso rischio e chiuderà anche le ultime differenze di allineamento dei
pulsanti in anteprima.
