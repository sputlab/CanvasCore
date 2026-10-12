# CanvasCore

Block-based CMS that generates **static HTML** sites: a React visual editor (drag & drop)
and a PHP + SQLite backend that compiles pages into `.html` files ready to serve.

## Manuals

- [User Guide](docs/manuals/USER-GUIDE.md): building and editing the site
- [Block Reference](docs/manuals/BLOCK-REFERENCE.md): every block and its settings
- [Administrator Guide](docs/manuals/ADMIN-GUIDE.md): installing, hosting, accounts, backups, security
- [Developer Guide](docs/manuals/DEVELOPER-GUIDE.md): architecture, local setup, adding blocks, tests

## Structure

```
.
├── docs/                  Manuals (docs/manuals/), changelog, release notes and phase notes (PHASE-*.md)
├── canvascore-admin/      PHP backend (runs on the server, in the site's admin folder)
│   ├── api.php            Editor JSON API (auth, pages, media, menu, users…)
│   ├── compiler.php       PHP block renderer → HTML
│   ├── rebuild_all.php    Publishes the whole site into the parent folder
│   ├── submit_form.php    Public endpoint for form submissions
│   ├── install.php        Setup wizard (delete after use)
│   ├── config.php         Session, CSRF, data dir, HTML sanitizer
│   ├── migrations.php     DB schema and content migrations
│   ├── blocks.json        Block defaults (shared with the editor)
│   ├── starters.json      Starter page templates
│   ├── master.html        HTML template for published pages
│   └── version.json       Single source of the version (app, db_schema, build)
└── canvascore-frontend/   React 19 + Vite + Zustand editor
    ├── src/               Components, store, session handling, JS block renderer
    ├── tests/             JS↔PHP parity, blocks, session and panel tests
    └── scripts/bump.mjs   Increments the build number in version.json
```

## Requirements

- Node.js ≥ 20 (developed with 24) and npm
- PHP ≥ 8 with `pdo_sqlite` (`dom` recommended for the sanitizer); the PHP CLI is also needed for the tests

## Development

```bash
cd canvascore-frontend
npm install
npm run dev        # editor in development (needs a PHP server for api.php: see the Developer Guide)
npm run lint       # oxlint
npm test           # JS↔PHP parity, blocks, content, session, UI
npm run build      # build into dist/ (increments the build in canvascore-admin/version.json)
```

## Deploy

1. `npm run build` in `canvascore-frontend/`.
2. Upload `canvascore-admin/` to the server, inside the site's web root, **keeping the folder name**
   `canvascore-admin` (published forms post to `canvascore-admin/submit_form.php`).
3. Copy the contents of `canvascore-frontend/dist/` into that folder.
4. Open `install.php` in the browser (e.g. `https://www.example.com/canvascore-admin/install.php`): it checks the
   server requirements and creates the database, the administrator account (replacing the default
   `admin` / `admin`), the base settings and, if you like, a homepage from a starter. It leaves you
   signed in to the editor.
5. Delete `install.php` (the wizard offers a button for it). Once installation is complete the
   file locks itself anyway.

Without the wizard, the first login is `admin` / `admin` and a password change is required.

The published site is written to the folder **above** `canvascore-admin/`
(`index.html`, one folder per slug, `sitemap.xml`, `robots.txt`, `404.html`, `uploads/`).
Data (SQLite DB, settings, sessions) goes to `../../canvascore-data` if writable,
otherwise to `canvascore-admin/data/` (protected by `.htaccess` on Apache only: on Nginx
add a deny rule).

> Locally, the root of this repository is that same web root: the `.gitignore`
> ignores everything at the root except the files listed explicitly, so generated
> output never ends up in commits.

## Versioning

Semantic versioning; the version lives in `canvascore-admin/version.json` and is read
by both PHP and Vite. Changelog and release notes are in [`docs/`](docs/CHANGELOG.md).
