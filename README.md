# CanvasCore

CMS a blocchi che genera siti **HTML statici**: un editor visuale React (drag & drop)
e un backend PHP + SQLite che compila le pagine in file `.html` pronti da servire.

## Struttura

```
.
├── docs/                  Changelog, note di rilascio (LEGGIMI-x.y.z) e di fase
├── canvascore-admin/      Backend PHP (gira sul server, nella cartella admin del sito)
│   ├── api.php            API JSON dell'editor (auth, pagine, media, menu, utenti…)
│   ├── compiler.php       Renderer PHP dei blocchi → HTML
│   ├── rebuild_all.php    Pubblica l'intero sito nella cartella superiore
│   ├── submit_form.php    Endpoint pubblico per l'invio dei form
│   ├── install.php        Wizard di installazione (da eliminare dopo l'uso)
│   ├── config.php         Sessione, CSRF, data dir, sanitizer HTML
│   ├── migrations.php     Migrazioni schema DB e contenuti
│   ├── blocks.json        Default dei blocchi (condivisi con l'editor)
│   ├── starters.json      Template di pagina iniziali
│   ├── master.html        Template HTML delle pagine pubblicate
│   └── version.json       Fonte unica della versione (app, db_schema, build)
└── canvascore-frontend/   Editor React 19 + Vite + Zustand
    ├── src/               Componenti, store, gestione sessione, renderer JS dei blocchi
    ├── tests/             Test di parità JS↔PHP, blocchi, sessione, pannelli
    └── scripts/bump.mjs   Incrementa il numero di build in version.json
```

## Requisiti

- Node.js ≥ 20 (sviluppato con 24) e npm
- PHP ≥ 8 con `pdo_sqlite` (e `dom` consigliato per il sanitizer); il PHP CLI serve anche per i test

## Sviluppo

```bash
cd canvascore-frontend
npm install
npm run dev        # editor in sviluppo (le chiamate ad api.php richiedono un server PHP)
npm run lint       # oxlint
npm test           # parità JS↔PHP, blocchi, contenuti, sessione, UI
npm run build      # build in dist/ (incrementa il build in canvascore-admin/version.json)
```

## Deploy

1. `npm run build` in `canvascore-frontend/`.
2. Carica `canvascore-admin/` sul server, dentro la webroot del sito (es. `/admin/`).
3. Copia il contenuto di `canvascore-frontend/dist/` dentro quella cartella.
4. Apri `install.php` nel browser (es. `https://www.example.com/admin/install.php`): verifica i requisiti
   del server, crea il database, l'account amministratore (al posto del default `admin` / `admin`),
   le impostazioni base e, se vuoi, una homepage da uno starter. Ti lascia già connesso all'editor.
5. Elimina `install.php` (il wizard offre un pulsante apposito). A installazione completata
   il file si blocca comunque da solo.

Senza wizard, al primo accesso l'utente è `admin` / `admin` e viene richiesto il cambio password.

Il sito pubblicato viene scritto nella cartella **sopra** `canvascore-admin/`
(`index.html`, una cartella per slug, `sitemap.xml`, `robots.txt`, `404.html`, `uploads/`).
I dati (DB SQLite, impostazioni, sessioni) vanno in `../../canvascore-data` se scrivibile,
altrimenti in `canvascore-admin/data/` (protetta da `.htaccess` solo su Apache: su Nginx
aggiungi una regola di deny).

> In locale la radice di questo repository coincide con quella webroot: il `.gitignore`
> ignora tutto in radice tranne i file elencati esplicitamente, così l'output generato
> non finisce mai nei commit.

## Versionamento

Versionamento semantico; la versione vive in `canvascore-admin/version.json` ed è letta
sia dal PHP sia da Vite. Changelog e note di rilascio sono in [`docs/`](docs/CHANGELOG.md).
