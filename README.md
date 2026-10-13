# CanvasCore

Block-based CMS that generates **static HTML** sites: a React visual editor (drag & drop)
and a PHP + SQLite backend that compiles pages into `.html` files ready to serve.

> **Status: public preview (0.x).** CanvasCore is feature-complete for everyday sites and well tested, but until
> 1.0 the API and data formats may still change between minor versions (database and content migrations run
> automatically on update). Take a backup before updating, and please
> [report what you find](https://github.com/sputlab/CanvasCore/issues).

## Manuals

- [User Guide](docs/manuals/USER-GUIDE.md): building and editing the site
- [Block Reference](docs/manuals/BLOCK-REFERENCE.md): every block and its settings
- [Administrator Guide](docs/manuals/ADMIN-GUIDE.md): installing, hosting, accounts, backups, security
- [Developer Guide](docs/manuals/DEVELOPER-GUIDE.md): architecture, local setup, adding blocks, tests

## Structure

```
.
├── docs/                  Manuals (docs/manuals/) and changelog (CHANGELOG.md)
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
by both PHP and Vite. See the [changelog](docs/CHANGELOG.md) and the
[GitHub releases](https://github.com/sputlab/CanvasCore/releases).

## Contributing and security

Bug reports, ideas and pull requests are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Please report security
vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

Community: [Discord](https://discord.gg/sD8KMc2kN) · Bugs and suggestions: bug@sputlab.com

## License

Copyright © 2026 Sputlab.

CanvasCore is free software: you can redistribute it and/or modify it under the terms of the
[GNU Affero General Public License](LICENSE) as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version. It is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; see the license for details.

In short: you can use CanvasCore for any purpose, including commercial sites. If you modify it and let other people
use your modified version over a network (for example, hosting the editor for clients), you must offer them its
source code under the same license. The sites and content you build with CanvasCore are yours and are not covered
by the AGPL.

**Additional permission (AGPL section 7):** the HTML, CSS and JavaScript that CanvasCore writes into a published
site (the page markup, `effects.css` and the block scripts included in published pages) may be used, copied,
modified and distributed as part of that site under terms of your choice, without the AGPL's requirements applying
to the site. This permission does not cover the editor or the backend in `canvascore-admin/`.
