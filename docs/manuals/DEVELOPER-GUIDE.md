# CanvasCore Developer Guide

For developers joining the project. It covers how the pieces fit together, how to run and test them
locally, and the conventions the code follows. Paths are relative to the repository root.

Related manuals: [User Guide](USER-GUIDE.md) (using the editor), [Block Reference](BLOCK-REFERENCE.md)
(every block and its settings), [Administrator Guide](ADMIN-GUIDE.md) (install, hosting, accounts, backups).
Release history: [CHANGELOG.md](../CHANGELOG.md) and GitHub Releases. Contributing: [CONTRIBUTING.md](../../CONTRIBUTING.md)
(pull requests, sign-off, license of contributions). Security reports: [SECURITY.md](../../SECURITY.md) (privately,
never in a public issue).

**Contents**

1. [Overview and architecture](#1-overview-and-architecture)
2. [Repository layout](#2-repository-layout)
3. [Local development](#3-local-development) (lint, tests, building)
4. [Data model](#4-data-model) (storage, tables, page states, revisions, redirects, migrations)
5. [Rendering](#5-rendering)
6. [Publishing pipeline](#6-publishing-pipeline-rebuild_allphp)
7. [Server helpers](#7-server-helpers) (`config.php`, `compiler.php`, `media.php`, `backup.php`)
8. [Adding a new block](#8-adding-a-new-block)
9. [Editor state](#9-editor-state-srcstoreusestorejs)
10. [Saving and sessions](#10-saving-and-sessions)
11. [UI conventions](#11-ui-conventions)
12. [Backend API conventions](#12-backend-api-conventions-canvascore-adminapiphp)
13. [Versioning, releases and git workflow](#13-versioning-releases-and-git-workflow)

---

## 1. Overview and architecture

CanvasCore is a block-based CMS that **publishes static HTML**. It has two halves:

- **`canvascore-frontend/`**: the editor, a single-page app built with React 19, Vite and Zustand
  (drag & drop with dnd-kit, icons from lucide-react).
- **`canvascore-admin/`**: the PHP 8 backend with SQLite. It serves the editor's JSON API, stores
  content, and compiles the published pages into `.html` files in the folder **above** itself (the web root).

```
  Browser (editor SPA, served from canvascore-admin/)
  ┌──────────────────────────────────────────────┐
  │ React components ── Zustand store (useStore) │
  │        │                                     │
  │   renderBlock.mjs  (canvas = site HTML)      │
  │        │  fetch() wrapped by fetchGuard.js    │
  └────────┼─────────────────────────────────────┘
           │ JSON  (X-CSRF-Token, session cookie)
           ▼
  canvascore-admin/api.php ──► SQLite (canvascore.sqlite) + settings.json / menu.json
           │                    in the data dir (../../canvascore-data or canvascore-admin/data)
           │
  "Publish" (POST)
           ▼
  canvascore-admin/rebuild_all.php
           │  master.html + effects.css + menu + header/footer + cookie banner
           ▼
  canvascore-admin/compiler.php  render_block()      canvascore-admin/media.php  cc_optimize_images()
           │
           ▼
  ../index.html, ../<slug>/index.html, ../<collection>/<item>/index.html,
  ../<collection>/feed.xml, ../search-index.json, redirect pages at old addresses,
  ../sitemap.xml, ../robots.txt, ../404.html, ../.htaccess   (static files, served by any web server)

  One rendering contract:
     src/render/renderBlock.mjs  ≡  compiler.php render_block()
     checked block by block by tests/parity.mjs (JS output vs PHP CLI output)
```

The key idea: the editor canvas shows each block with **the same HTML the site will get**. The JS renderer
(`renderBlock.mjs`) and the PHP compiler (`compiler.php`) are two implementations of one contract, kept
identical by an automated parity test rather than by sharing code across runtimes.

## 2. Repository layout

```
README.md                    Overview, requirements, deploy, license
LICENSE                      GNU AGPL v3 text (CanvasCore is AGPL-3.0-or-later)
CONTRIBUTING.md              How to report bugs and send pull requests
SECURITY.md                  Supported versions, private vulnerability reporting
docs/                        CHANGELOG.md, manuals/
docs/manuals/                These manuals
docs/dev/                    Local-only internal notes (git-ignored, not in the repository)
canvascore-admin/            PHP backend (deployed into the site's admin folder)
canvascore-frontend/         React editor
```

**`canvascore-admin/`**

| File | Purpose |
| --- | --- |
| `api.php` | The editor's JSON API: auth, branding, pages, collections and items (incl. bulk actions), parts, masters, templates, media and media folders, menu, settings, users, backup, revisions, redirects |
| `compiler.php` | `render_block()` (block → HTML), `render_menu_html()`, `cc_cookie_banner_html()`, shared helpers (`cc_int`, `build_inline_style`, `cc_effect_classes`…) |
| `rebuild_all.php` | Publishes the whole site (pages, collection items, feeds, search index, redirects, sitemap, robots, 404, `.htaccess`), removes stale files |
| `config.php` | Data dir, session boot, CSRF, client IP, login throttling, rate limits, code surfaces, re-linking, revisions, redirects, unpublishing deleted items/collections, public branding, SVG check, `cc_sanitize_html`, `cc_version`, slugs |
| `media.php` | Image optimization (WebP copies in `uploads/_cc/`, `srcset` on publish), the media metadata (`media.json`), media library folders (`media-folders.json`) and where images are used |
| `backup.php` | Whole-site backup as a ZIP, its checks and restore, saved copies and safety copies in `backups/` |
| `migrations.php` | Versioned DB migrations and content migrations |
| `submit_form.php` | Public endpoint for form submissions (rate-limited, recipients from `forms.json`) |
| `install.php` | Setup wizard (locks itself once installed) |
| `blocks.json` | Block defaults (`_baseStyles` + `types`), shared with the editor |
| `starters.json` | Starter page templates |
| `master.html` | HTML shell of every published page (`{{PAGE_CONTENT}}`, `{{MAIN_MENU}}`, `{{EFFECTS_CSS}}`…) |
| `effects.css` | Entrance/hover/loop effects and button hovers, inlined into pages and the canvas |
| `version.json` | Single source of the version (`app`, `db_schema`, `content_schema`, `build`, `built`) |

**`canvascore-frontend/`**

| Path | Purpose |
| --- | --- |
| `vite.config.js` | Injects `__APP_VERSION__`, `__APP_BUILD__`, `__BLOCK_DEFS__`, `__EFFECTS_CSS__` from `../canvascore-admin/` |
| `scripts/bump.mjs` | `prebuild` hook: increments `build` in `version.json`, syncs `package.json` version |
| `.oxlintrc.json` | Lint config (react + oxc plugins) |
| `src/main.jsx` | Entry: imports `apiClient.js` first (installs the fetch guard), then the CSS and `<App />` |
| `src/App.jsx` | Auth gate, view switch (`currentView`), overlays (session, drafts, toasts, dialogs) |
| `src/store/useStore.js` | The Zustand store: auth, pages, block tree, history, masters, templates |
| `src/render/renderBlock.mjs` | Canonical JS renderer (`renderBlock`, `blockRoot`, `buildInlineStyle`, `ccInt`, `escapeHtml`) |
| `src/render/effects.mjs` | Effect catalogs and `effectClasses()` / `buttonHover()` |
| `src/editor/blockCatalog.js` | Block names, icons, categories, keywords; `CONTAINER_TYPES` |
| `src/editor/RichText.jsx`, `commands.js`, `cleanHtml.js` | Rich text editor (in-place regions, toolbar, paste cleanup) |
| `src/editor/layerDrop.js`, `previewEffects.js` | Layers drop positions; "Preview animation" on the canvas |
| `src/editor/placeholder.js` | `placeholderImage(w, h)`: built-in placeholder image as a `data:` SVG (no outside service) |
| `src/editor/mediaInfo.js` | Media library / picker helpers (`formatBytes`) |
| `src/editor/upload.js` | `uploadImage(file, { folder, onProgress })` and `postForm(action, form, { onProgress })`: XHR uploads with progress and the CSRF header, retried once through `fetch` on 401/403 |
| `src/editor/useUploader.js` | `useUploader(onFinished)`: upload queue (one file at a time) with per-file progress and result; rendered by `UploadPanel.jsx` |
| `src/components/VisualEditor.jsx` | Page editor: top bar, save/publish, shortcuts, side panels |
| `src/components/RevisionHistory.jsx` | Version history panel (History button): list, preview and restore of saved versions |
| `src/components/RedirectsCard.jsx` | Global Options › Redirects (list, add, delete; admins change them) |
| `src/components/ChangePasswordDialog.jsx` | "Change your own password" dialog (sidebar key icon) |
| `src/components/AboutDialog.jsx` | "About CanvasCore" (the ⓘ next to the version): version, website, GitHub, Discord, bug email, donations |
| `src/components/MediaManager.jsx`, `MoveToFolderDialog.jsx`, `UploadPanel.jsx` | Media library: folders, selection and bulk actions, sorting, "Move to…" dialog, upload progress panel (also used by `MediaPickerModal.jsx`) |
| `src/components/ImageUrlField.jsx` | Image address field with Upload (with progress), Library and preview (Global Options › Favicon / Default social image) |
| `src/components/Backup.jsx` | Backup page: make/download/keep backups, list saved and safety copies, chunked upload and restore, legacy `.json` import |
| `src/components/Canvas.jsx`, `SortableBlock.jsx` | Canvas and the per-block frame (DnD, selection, in-place text) |
| `src/components/PropertyPanel.jsx` | Content / Style / Advanced tabs for the selected block |
| `src/components/panel/` | `StyleTab`, `AdvancedTab`, `PageSettings`, `fields.jsx`, `helpers.js`, `constants.js` |
| `src/components/panel/blocks/` | One Content panel per block (e.g. `FlexRowPanel.jsx`, `SearchPanel.jsx`); `index.js` maps type → panel (`CONTENT_PANELS`) |
| `src/components/*.jsx` | Admin screens: PageManager, Collections, Templates, MediaManager, MediaPickerModal, MenuBuilder, GlobalSettings, UserManager, Submissions, Backup, AdminLayout… |
| `src/session/` | Session manager, fetch guard, local draft backups and trackers |
| `src/ui/` | UI kit (`kit.jsx`, `kit.css`), `global.css`, `notify.js` + `toast.jsx`, `dialog.js` + `dialogHost.jsx`, `branding.js` (`useBrandingHead()`, `brandIconUrl()`) + `BrandLogo.jsx` (site favicon as the admin logo) |
| `src/menu/menuThemes.js` | Menu defaults, themes, effect groups (mirrored in `compiler.php`) |
| `tests/` | The 11 test suites (10 Node, plus `server.php` in PHP) and the `render_php.php` / `render_menu.php` CLI helpers |

## 3. Local development

Requirements: Node.js ≥ 20 (developed with 24), npm, PHP ≥ 8 with `pdo_sqlite` (`dom` recommended,
the sanitizer falls back to regexes without it; `gd` with WebP support for the optimized image copies, skipped
without it). The PHP CLI must be on `PATH` for the tests.

```bash
cd canvascore-frontend
npm install
```

### Running the editor against PHP

The editor calls **relative** URLs (`api.php?action=…`, `rebuild_all.php`), so it must be served from
the same folder as the PHP files. `vite.config.js` has **no dev proxy**, so `npm run dev` alone gives you
the UI but every API call hits Vite and fails. Two setups work:

**A. PHP built-in server + watched build (no config changes).** The repository root is the web root, the
same layout as production (the `.gitignore` ignores all generated output at the root).

```bash
# terminal 1, repo root: serve the site and the admin. Several workers: php -S otherwise answers one
# request at a time, and a publish (or any slow request) would hold up every other call from the editor.
PHP_CLI_SERVER_WORKERS=4 php -S 127.0.0.1:8000

# terminal 2, canvascore-frontend/: rebuild the editor into canvascore-admin/ on every change
npx vite build --watch --outDir ../canvascore-admin
```

`npx vite build` does **not** run the `prebuild` hook, so the build number is not bumped. Vite won't empty
an `outDir` outside the project root, so the PHP files stay untouched; the emitted `index.html`, `assets/`,
`favicon.svg` and `icons.svg` are git-ignored in `canvascore-admin/`. Open
`http://127.0.0.1:8000/canvascore-admin/install.php` once, then `http://127.0.0.1:8000/canvascore-admin/`.
Data goes to `../canvascore-data` next to the repository (outside it) when writable. Note that `php -S`
ignores `.htaccess`.

**B. Vite dev server with HMR + a local proxy.** Run `PHP_CLI_SERVER_WORKERS=4 php -S 127.0.0.1:8000` at the repo root as above and
add a proxy to your local `vite.config.js` (**don't commit it**):

```js
server: { proxy: {
  '/api.php': 'http://127.0.0.1:8000/canvascore-admin',
  '/rebuild_all.php': 'http://127.0.0.1:8000/canvascore-admin',
} },
```

Session and CSRF cookies use path `/`, so they work through the proxy. Publishing writes the site one
level above `canvascore-admin/`, i.e. the repo root.

### Lint

```bash
npm run lint                      # oxlint --max-warnings 0: the repo is kept at zero warnings
```

### Tests

`npm test` runs the 11 suites in sequence (each exits non-zero on failure):

| Script | File | Covers |
| --- | --- | --- |
| `test:parity` | `tests/parity.mjs` | JS ↔ PHP parity of structure, classes and inline styles for fixtures of every block (plus defaults from `blocks.json`) |
| `test:blocks` | `tests/blocks.mjs` | Behaviour of the compiled Accordion, Tabs, Pricing, Gallery (lightbox script run in jsdom), sanitizing |
| `test:content` | `tests/blocks-content.mjs` | Divider…Business blocks: safe and working PHP output (clock/rAF/IntersectionObserver controlled) |
| `test:session` | `tests/session.mjs` | Drafts, trackers, session manager with a fake expiring server and simulated clock, fetch guard |
| `test:session-ui` | `tests/session-ui.mjs` | Real `<App />` against a fake backend: expiry mid-save, login overlay, retry |
| `test:panels` | `tests/panels-ui.mjs` | `addBlock` → `PropertyPanel` field edits → store, and canvas rendering per block |
| `test:starters` | `tests/starters.mjs` | `starters.json`: known types, real content fields, unique ids, renders in JS and PHP |
| `test:menu` | `tests/menu.mjs` | Menu effect catalog in sync with `compiler.php`, every theme/effect rendered by PHP, escaping |
| `test:rich-text` | `tests/rich-text.mjs` | Paste cleanup, in-place editing keeps layout, toolbars, tidy on blur |
| `test:ui` | `tests/ui-shell.mjs` | Sidebar, Pages screen, editor top bar and shortcuts, Add panel, property tabs, effects, Layers, dialogs, media library (folders, selection, uploads), site branding and About, Backup page, Collections (rename, bulk actions) |
| `test:server` | `tests/server.php` (`php tests/server.php`) | Server helpers through the real PHP code: code surfaces kept on editors' saves, re-linking after a slug change, client IP behind trusted proxies, SVG upload check, sanitizer, `cc_int`, slider arrows and reduced motion, form fallbacks and field types, revision history, image copies and `srcset`, redirects (chains, loops, `.htaccess` block, redirect page), cookie banner, Site Search block, public branding, media folders and image usage, backup and restore (contents, refused files, newer versions, safety copies), deleted collections and items going offline |

How they work:

- **PHP side**: the tests pipe a block (or menu) as JSON to `php tests/render_php.php` /
  `tests/render_menu.php`, which `require` the real `compiler.php`. No web server is involved.
- **`tests/server.php`** is plain PHP: it `require`s `compiler.php` (which loads `config.php`), calls the helpers
  directly and prints the same `✓` / `✗` checks. It never touches the real data dir: files go to temp dirs
  (`sys_get_temp_dir()`), databases are in-memory SQLite (`new PDO('sqlite::memory:')`, tables created by
  running the real closures from `cc_db_migrations()`), and the media metadata file is redirected with
  `$GLOBALS['CC_MEDIA_META_FILE']`, which `cc_media_meta_file()` honours. The same goes for
  `CC_MEDIA_FOLDERS_FILE` (media folders), `CC_BACKUP_DATA_DIR`, `CC_UPLOADS_DIR` and `CC_BACKUP_DIR` (backup and
  restore) and `CC_SITE_ROOT` (`cc_unpublish_files()`). `cc_client_ip()` takes the trusted
  proxy list as an argument for the same reason.
- **Component tests** (`panels-ui`, `rich-text`, `session-ui`, `ui-shell`) create a `JSDOM`, expose its
  globals on `globalThis`, start Vite in middleware mode (`createServer({ server: { middlewareMode: true } })`)
  and load the real modules with `vite.ssrLoadModule('/src/...')`, then mount them with `react-dom` and drive
  them with DOM events. `__BLOCK_DEFS__` etc. are passed via `define`. `fetch` is stubbed or replaced by a
  fake backend.
- Output is a list of `✓` / `✗` checks and a final `… OK` line.

### Building

```bash
npm run build                                   # prebuild bumps build in version.json, output in dist/
npx vite build --outDir /tmp/cc-check           # build check WITHOUT bumping the build number
```

Deploying is described in the [README](../../README.md#deploy) and the [Administrator Guide](ADMIN-GUIDE.md):
the contents of `dist/` are copied into `canvascore-admin/`.

## 4. Data model

### Storage locations

`cc_data_dir()` (`config.php`) picks `../../canvascore-data` (outside the web root, preferred) or
`canvascore-admin/data/`, migrating files between them if needed. It contains:

| File | Content |
| --- | --- |
| `canvascore.sqlite` | All structured content (tables below) |
| `settings.json` | Global Options: `brandColor`, `fontFamily`, `siteName`, `siteSuffix`, `siteUrl`, `faviconUrl`, `defaultOgImage`, `robotsAllow`, `menuInheritTheme`, `headerEnabled`, `footerEnabled`, `cookieBanner` (`{ enabled, text, acceptLabel, declineLabel, privacyLabel, privacyUrl, position }`), `adminEmail`, `emailFrom`, `emailSubject`, `sessionTimeoutMinutes`, `trustedProxies` (the last five are admin-only: `get_settings` leaves them out for editors and an editor's save keeps the stored values) |
| `menu.json` | `{ "items": [...], "settings": {...} }`, nested items (`children`), legacy flat format still read |
| `forms.json` | Written by each publish: form id → recipient, so addresses never reach the client |
| `media.json` | Media metadata per uploaded file name: `alt`, `w`, `h`, `bytes`, `variants` (widths of the WebP copies), `optimized`, `folder` (media library folder path such as `Products/Shoes`, `''` = none; see `media.php`) |
| `media-folders.json` | Array of media folder paths, so empty folders exist too (parents of listed folders are implied) |
| `backups/` | Backup ZIPs: `backup-…zip` (kept by hand), `before-restore-…zip` (safety copies, newest 5), `download-…zip` and `upload-….part` (temporary, removed after an hour); deny-all `.htaccess` |
| `published_files.json` | Manifest of files the last successful publish wrote (`…/index.html` and `…/feed.xml`, relative to the site root); used to delete pages and feeds no longer published |
| `login_attempts.json`, `rate_*.json` | Login throttling and form rate limits |
| `sessions/` | PHP session files (dedicated folder) |

Outside the data dir, in the site root, a publish also writes `search-index.json` (the Site Search index,
public by design), and uploads get their optimized copies in `uploads/_cc/`.

### Tables

- **`pages`**: `id, parent_id, title, slug, clean_slug, seo_title, seo_description, seo_image, layout`
  (`boxed`/full), `bg_color, boxed_width, content_json, status, is_draft_copy, is_home, noindex, content_schema, author, updated_at`.
  `noindex = 1` (migration 7) adds `<meta name="robots" content="noindex">` and leaves the page out of the
  sitemap and the search index; `save_page` only touches it when the client sends the key.
- **`collections`** (`id, name, slug`) and **`collection_items`** (`id, collection_id, title, slug, excerpt,
  cover_image, date, content_json, status` draft/published, `archived, seo_*, content_schema, updated_at`).
  Items publish to `/<collection-slug>/<item-slug>/`; the `COLLECTION_LIST` block lists them at build time.
- **`master_components`** (`id, name, content_json`): one block (a subtree) reused by reference.
- **`templates`** (`id, name, content_json`): one block saved as a reusable **copy**.
- **`site_parts`** (`name` = `header`/`footer`, `content_json` = block array): global header/footer.
- **`page_revisions`** (migration 6: `id, owner, title, content_json, kind` draft/published, `author, created_at`,
  index on `(owner, id)`): version history. `owner` is the **live** page id (a draft copy's saves are recorded
  under its parent) or `item:<id>` for a collection item. See `cc_add_revision()`.
- **`redirects`** (migration 7: `from_path` primary key, `to_path, auto, created_at`): old addresses that
  forward elsewhere. Paths are site paths with slashes (`/old-page/`, `/blog/old-post/`); `to_path` may also be a
  full `http(s)://` address. `auto = 1` for redirects made by a rename, `0` for ones added in Global Options.
- **`admin`** (users: `username, password_hash, role` admin/editor, `must_change_pw`), **`form_submissions`**,
  **`cc_meta`** (key/value, holds the applied `db_schema`).

### Page states

| `status` | Meaning |
| --- | --- |
| `draft` | Never published; edited in place |
| `published` | Live; the row is the live version |
| `modified` | Live, with a **hidden draft copy** holding unpublished changes |

Saving a draft of a published page (`save_page` without `publish`) creates a row `draft-<uniqid>` with
`is_draft_copy = 1`, `parent_id = <live id>`, and sets the live row to `modified`; the response's `new_id`
is the copy, which the editor switches to. Further draft saves update the copy. Publishing the copy writes
its content onto the parent (status `published`), deletes the copy and returns the parent id.
`discard_draft` deletes the copies and resets the parent to `published`. `get_pages` returns only non-copy
rows, with the latest copy attached as `draft_copy` for `modified` pages.

`is_home` is exclusive (`apply_home()` in `api.php`) and only touched when the client sends the key.
Slugs are unique site-wide among live pages, collections and system folders (`cc_slug_owner()`), enforced
on publish; drafts may share a slug.

**Slug changes.** Publishing a page under a new slug calls `relink_slug_change()` (`api.php`), which:

- drops any redirect **from** the new address (`cc_drop_redirect_from()`: a live page must not be hidden by it);
- adds a redirect from the old address to the new one (`cc_add_redirect()`, `/` when the page became the home);
- re-links content: it decodes the JSON of every row of `pages`, `collection_items`, `site_parts` and
  `master_components`, plus `menu.json`, and runs `cc_relink_node()` on the decoded data (so escaped slashes in
  the stored JSON don't matter), writing back only the rows that changed.

A published collection item whose slug changes gets the same redirect treatment in `save_item`
(`/<collection>/<old>/` → `/<collection>/<new>/`). Renaming a collection's slug (`save_collection` with a new `slug`,
in a transaction) adds `/<old-col>/<item>/` → `/<new-col>/<item>/` for each of its published items, and moving a
published item to another collection (`bulk_items` `move`) adds its own redirect (after dropping any redirect from
the destination address). The files move at the next publish; the stale ones are removed by the manifest cleanup.

### Revisions

Every save (`save_page` draft or publish, `save_item`) calls `cc_add_revision($pdo, $owner, $title,
$content_json, $kind)`. It skips the insert when content and title equal the newest revision, keeps the newest
`CC_REVISIONS_KEEP` (40) per owner, and swallows exceptions (history must never block a save). The editor reads
them with `get_revisions` / `get_revision` and restores one with the store's `replaceBlocks()` as an unsaved,
undoable change.

### Block JSON

`content_json` of a page, item or part is an **array** of blocks; masters and templates store **one** block.

```json
{
  "id": "block-lx3k9a-1f4ab2",
  "type": "SECTION",
  "content": { "customId": "", "customClass": "", "customCss": "__THIS__ { … }",
               "hoverEffect": "lift", "animDuration": "slow", "animDelay": "300" },
  "styles":  { "padding": "80px 20px", "backgroundColor": "#ffffff", "width": "100%", "animation": "fade-up" },
  "children": [ { "id": "…", "type": "TEXT", "content": { "text": "<p>Hi</p>" }, "styles": {} } ]
}
```

- `styles` are camelCase CSS properties rendered inline; `styles.animation` holds the entrance effect and
  is never emitted as CSS.
- `children` exists only on containers (`SECTION`, `CONTAINER`, `FLEX_ROW`, `CSS_GRID`).
- A master reference is `{ id, type: "MASTER", content: { masterId, name }, styles: {} }`; the compiler
  resolves it from `master_components` (cycles are skipped).
- `content` fields per type: see `blocks.json` and the [Block Reference](BLOCK-REFERENCE.md).

### Migrations

`api.php` runs `cc_migrate($pdo)` and `cc_migrate_content($pdo)` on every request (`migrations.php`).

**DB schema** (currently 7; 6 = `page_revisions`, 7 = `redirects` + `pages.noindex`): add a numbered closure
to `cc_db_migrations()`, then bump `db_schema` in `version.json` and note it in the CHANGELOG. Each migration
runs once, in order, in a transaction, and the number is recorded in `cc_meta`.

```php
8 => function ($pdo) {
    cc_add_col($pdo, 'pages', 'canonical_url', "TEXT DEFAULT ''");   // idempotent, no exception
},
```

Use `cc_add_col()`; SQLite rejects non-constant defaults in `ALTER` (add the column without a default and
backfill with `UPDATE`).

**Content schema** (currently 1, no migrations yet): add `N => function ($blocks) { …; return $blocks; }`
to `cc_content_migrations()` and bump `content_schema`. Note: `cc_migrate_content()` only walks the `pages`
table today; a real format change must also migrate `collection_items`, `site_parts`, `master_components`
and `templates`, and `starters.json`.

## 5. Rendering

### The contract

`renderBlock(block, opts)` in `src/render/renderBlock.mjs` and `render_block($block)` in `compiler.php`
must return the same structure, classes and inline styles for every block. The canvas
(`SortableBlock.jsx`) injects `renderBlock()` output for unselected blocks, so what you see is the site.

Differences that are allowed (and ignored by the parity test):

- **Rich text** is passed through raw in JS; PHP runs it through `cc_sanitize_html()`.
- `<script>` nodes (slider arrows/autoplay, lightbox, counters, site search…) are emitted **only by the PHP
  compiler**; the JS renderer leaves them out (they wouldn't run on the canvas anyway) and the parity test
  drops every `<script>` before comparing.
- `<style>` behaviour nodes (responsive rules) are each renderer's own, except for the blocks in
  `STRICT_STYLE` in `tests/parity.mjs`, whose `<style>` text carries logic and is compared.
- `MASTER` and `COLLECTION_LIST` render a placeholder comment in JS; the editor draws them itself.
- Links to internal pages become `{{BASE_URL}}…`; the compiler substitutes the base path, the canvas `#`.

### `opts.fields` and in-place editing

`renderBlock(block, { fields: true })` adds `data-cc-field="<name>" contenteditable="true"
data-cc-placeholder="…"` to the elements that hold rich text, via the local `field(name, placeholder)`
helper. `SortableBlock.jsx` uses it for selected blocks listed in `TEXT_FIELDS`
(`TEXT.text`, `HERO.title/subtitle`, `IMAGE_TEXT.text`, `FORM.title`) and hands the HTML to
`InlineRegions` (`src/editor/RichText.jsx`), which commits each field on blur.

### Containers: `blockRoot`

The container types are listed once, in `CONTAINER_TYPES` (`src/editor/blockCatalog.js`:
`SECTION`, `CONTAINER`, `FLEX_ROW`, `CSS_GRID`); the store, `SortableBlock.jsx` (`CONTAINERS = CONTAINER_TYPES`),
`LayerNavigator`, `VisualEditor`, `PropertyPanel` and `Templates` all import it instead of keeping their own lists.
`blockRoot(block)` returns `{ tag, id, className, style }` for the four container types (and `null`
otherwise). The JS renderer uses it to build the container HTML; the canvas uses it to create the real
React element and render the children as sortable React nodes inside it. `CSS_GRID` adds
`display:grid`, `grid-template-columns: repeat(columns, 1fr)` and `gap`. The editor frame takes the
"sizing" properties (`width`, `margin`, `flex*`, `grid*`, `order`…, see `SIZING_KEYS`) so flex/grid
parents behave like on the site.

### Shared helpers (keep both sides identical)

| JS (`renderBlock.mjs`) | PHP (`compiler.php`) | Rule |
| --- | --- | --- |
| `buildInlineStyle(styles)` | `build_inline_style($styles)` | camelCase → kebab-case; skips `''`, `null`, `animation`, keys not matching `/^[a-zA-Z][a-zA-Z0-9-]*$/`, object/array values; values HTML-escaped |
| `ccInt(v, def, min, max)` | `cc_int($v, $def, $min, $max)` | leading integer like `parseInt` (`"7px"` → 7), clamped, default otherwise |
| `escapeHtml(s)` | `htmlspecialchars()` | every attribute and plain-text value |
| `ccColor`, `ccNum`, `ccFmtNum`, `ccExtUrl`, `ccLines`, `ccBr`, `ccInitials`, `ccEnc` | `cc_color`, `cc_num`, `cc_fmt_num`, `cc_ext_url`, `cc_lines`, `cc_br`, `cc_initials`, `cc_enc` | twins for the content blocks |
| `resolveBlockUrl` | `cc_block_url` | internal URL → `{{BASE_URL}}…`, `mailto:`/`tel:` intact |

Escaping rules:

- Every value interpolated into an attribute or text node is escaped. Ids are reduced to `[A-Za-z0-9_-]`.
- Enumerated values (form field types, effects, layouts) are checked against an allowlist; numbers go
  through `ccInt`/`cc_int` or `ccNum`/`cc_num`; colors through `ccColor`/`cc_color`.
- `customCss` replaces `__THIS__` with `#<id>` and strips `</style` / `</script`.
- Rich text is **only** made safe on the server: `cc_sanitize_html()` (`config.php`) is a DOM allowlist of
  tags and attributes, strips event handlers and `javascript:`/`vbscript:` URLs (including ones hidden by
  control characters) and has a regex fallback without `ext-dom`. Any new rich-text field must be wrapped in
  it in `compiler.php`.
- Non-admins can't add or change "code surfaces" (`HTML.code`, `customCss`/`customJs`, a `FORM`'s `email`), but
  they no longer wipe an admin's code either: `cc_keep_code_surfaces($blocks, $previous)` restores those fields
  from the stored version, matched by block id, in `save_page`, `save_item`, `save_part`, `save_master` and
  `save_template`; new blocks from an editor get empty code. (`cc_strip_code_surfaces()` still exists in
  `config.php` but no save uses it any more.)

### Effects

`effectClasses(styles, content)` (`src/render/effects.mjs`) ≡ `cc_effect_classes()` builds
` cc-reveal <animation> cc-dur-* cc-delay-* cc-hover-* cc-loop-*` from `styles.animation`,
`content.animDuration`, `animDelay`, `hoverEffect`, `loopEffect`. `buttonHover({bg,color,border,effect})` ≡
`cc_button_hover()` returns the classes (`cc-hbg`, `cc-hcol`, `cc-hbd`, `cc-bfx-*`) and CSS variables
(`--cc-hover-bg`…). Unknown values are dropped. The allowlists exist twice (the arrays in `effects.mjs`,
the `CC_FX_*` constants in `compiler.php`): change both.

The CSS lives in `canvascore-admin/effects.css`:

- published pages: `rebuild_all.php` replaces `{{EFFECTS_CSS}}` in `master.html` with the file; a small
  script in `master.html` adds `is-visible` via `IntersectionObserver`;
- canvas: `vite.config.js` injects it as `__EFFECTS_CSS__`; `Canvas.jsx` adds overrides so entrance and loop
  effects stay still while editing and play only on "Preview animation" (`previewEffects.js`).

## 6. Publishing pipeline (`rebuild_all.php`)

A POST to `rebuild_all.php` (login + CSRF, session released right away) rebuilds the whole site in one pass:

1. **Setup**: settings, menu HTML, header/footer parts, safe brand color/font/suffix, `$media_meta =
   cc_media_meta_all()`, and `$cookie_html = cc_cookie_banner_html($settings['cookieBanner'])`.
2. **`$write($path, $content)`**: every output file goes through this closure. It creates folders, records a
   failure in `$failed`, and adds the path (relative to the site root) to `$written`. Use it for any new output
   file, so the file is reported when it can't be written and lands in the manifest.
3. **Feeds** (only when `siteUrl` is set: feeds need absolute links): `$feeds` holds every collection with
   published, non-archived items; `$feed_links` is the `<link rel="alternate" type="application/rss+xml">` list
   added to every page's head.
4. **`$finish($html, $canonical, $noindex)`**: the finishing touches shared by pages, items and the 404: a
   `<link rel="canonical">` (when the absolute address is known), `<meta name="robots" content="noindex">`,
   the feed links before `</head>`, the cookie banner before `</body>` (`{{BASE_URL}}` substituted), then
   `cc_optimize_images()` (`srcset` of the WebP copies, lazy loading, `fetchpriority="high"` on the first image).
5. **Pages** (`published`/`modified`, live rows only): rendered into `master.html`, written to `/<slug>/index.html`
   and/or the root `index.html` (home routing). Pages without `noindex` go into the sitemap and the search
   index (`{ t, u, d, x }`: title, URL, description or first 160 characters, first 3000 characters of plain text).
6. **Collection items** (published) at `/<collection>/<item>/index.html`; non-archived ones go into the search
   index and their collection's feed.
7. **RSS**: `/<collection>/feed.xml` per feed, newest 50 items by `date` (or `updated_at`).
8. **Search index**: `search-index.json` at the site root, read by the Site Search block's script.
9. **Redirects**: for each row of `redirects`, if a page was written at `from_path` in this build the row is
   deleted (the page wins); otherwise a small page from `cc_redirect_page_html()` is written at the old address
   (works on any host) and a rule is collected for Apache.
10. `forms.json` (form recipients), `sitemap.xml`, `robots.txt`, `404.html` (finished with `noindex`).
11. **`.htaccess`** at the site root: `cc_htaccess_with_redirects()` replaces the marked
    `# BEGIN/END CanvasCore redirects` block with `Redirect 301` lines and leaves everything else (e.g. the
    `ErrorDocument 404` line) as it is; the file is only rewritten when it changed.
12. **Manifest cleanup**: when nothing failed, files listed in the previous `published_files.json` but not
    written now are deleted, only if they match `…/index.html` or `…/feed.xml` (never the root `index.html`),
    and their emptied folders removed. Then the manifest is replaced with `$written`.

The response is `{ success:false }` with the first unwritten file when anything failed, otherwise "Build
successful: N pages published", plus removed pages and non-fatal `$warnings` (feeds, collections, redirects).

## 7. Server helpers

### `config.php`

| Function | What it does |
| --- | --- |
| `cc_keep_code_surfaces(&$blocks, $previous)` | Editors' saves: restores `HTML.code`, `customCss`/`customJs` and `FORM.email` from the stored blocks (array or JSON), matched by id; new blocks get none. Replaces `cc_strip_code_surfaces()` for page/item/part/master (and template) saves |
| `cc_relink_node(&$node, $oldUrl, $newUrl, $oldBase, $newBase)` | Walks decoded JSON: link fields (`url`, `btnUrl`, `buttonUrl`, `href`, `link`) equal to `old/index.html` become `new/index.html`; `{{BASE_URL}}old/` inside any string becomes `{{BASE_URL}}new/`. Returns whether anything changed. Used by `relink_slug_change()` in `api.php` for all content tables and the menu |
| `cc_add_revision($pdo, $owner, $title, $content_json, $kind)` | Records a version (see [Revisions](#revisions)) |
| `cc_client_ip($trustedOverride = null)` | The visitor's address. If `REMOTE_ADDR` is in `trustedProxies` (Global Options › Security), returns the nearest untrusted valid IP from `X-Forwarded-For`; otherwise `REMOTE_ADDR`, so the header can't be faked. The argument sets the proxy list (tests) |
| `cc_redirect_path($p)` / `cc_redirect_target($t)` | Normalize and validate: a path becomes lowercase `/a/b/` (the home `/` can't be a source); a target may also be `/` or a full `http(s)://` address. `null` when invalid |
| `cc_add_redirect($pdo, $from, $to, $auto = 1)` | Upserts a redirect, **collapsing chains** (rows pointing to `$from` now point to `$to`) and **avoiding loops** (any redirect from `$to` is deleted: something lives there now; self-redirects removed) |
| `cc_drop_redirect_from($pdo, $path)` | Deletes the redirect from an address a published page now owns |
| `cc_redirect_page_html($href)` | The static page written at an old address: `noindex`, canonical, meta refresh and a `location.replace()` that keeps query and hash |
| `cc_htaccess_with_redirects($existing, $rules)` | Returns `.htaccess` content with the marked redirects block replaced (or removed when there are no rules) |
| `cc_rate_allow($bucket, $key, $max, $window)` | Sliding-window rate limit in `rate_<bucket>.json` (file lock); `submit_form.php` uses `('forms', cc_client_ip(), 8, 600)` |
| `cc_login_wait($username)` / `cc_login_result($username, $ok)` / `cc_login_key()` | Login throttling per account + client IP in `login_attempts.json`: 5 failures in 15 minutes → 15 minutes wait |
| `cc_svg_is_safe($path)` | Refuses SVG uploads with scripts, event handlers, `javascript:` links, `foreignObject`, entities |
| `cc_unpublish_files($data_dir, $prefix, $extra = [])` | Takes generated files offline at once: deletes the `…/index.html` / `…/feed.xml` under `$prefix` (`blog/` or `blog/post/`) that are in `published_files.json` (or in `$extra`), removes the emptied folders and updates the manifest. Never touches other files. Site root from `$GLOBALS['CC_SITE_ROOT']` (tests) |
| `cc_unpublish_item($pdo, $data_dir, $item)` | A deleted published item: `cc_unpublish_files()` for its folder, unless another published item of the collection owns the same address. Used by `delete_item` and `bulk_items` `delete`; `delete_collection` unpublishes the collection folder |
| `cc_public_branding($settings)` | What `api.php?action=branding` may return before sign-in: `siteName` (max 120 characters) and `faviconUrl` (dropped unless `http(s)://`, root-relative or a plain relative path) |

### `compiler.php`

- `cc_cookie_banner_html($cfg)`: the consent banner and its script for `settings.cookieBanner` (`''` unless
  `enabled`). Text escaped, privacy link through `{{BASE_URL}}`, choice in `localStorage` (`cc_consent`).
  `<script type="text/plain" data-cc-consent>` and `<iframe data-cc-consent-src>` are activated only after Accept;
  `data-cc-consent-open` reopens the banner.
- `case 'SEARCH'` + `CC_SEARCH_SCRIPT`: the Site Search block. The markup carries `data-index` (`{{BASE_URL}}search-index.json`),
  `data-empty` and `data-limit` (`cc_int`, 1–50); the nowdoc script (with `%ID%` replaced by the block id) loads
  the index on first use and handles `?q=`.
- `SLIDER`: with 2+ images it adds `cc-slider-prev` / `cc-slider-next` buttons; the script pauses autoplay on
  hover and doesn't autoplay under `prefers-reduced-motion`.

### `media.php`

Loaded by `api.php` and `rebuild_all.php`. Copies are `uploads/_cc/<name>-<width>.webp` for `CC_IMG_WIDTHS`
(480, 960, 1600) narrower than the original (never enlarged, EXIF orientation applied, skipped when GD or the
memory limit can't handle the image). The original is never changed.

| Function | What it does |
| --- | --- |
| `cc_media_process($uploads_dir, $name)` | Makes the copies and merges `{ w, h, bytes, variants, optimized }` into `media.json` (called by `upload_media` and `optimize_media`) |
| `cc_optimize_images($html, $uploads_url, $meta = null)` | Publish time: adds `srcset`/`sizes` to `<img>`s of uploaded files that have copies, `loading="lazy"` (except the first image, which gets `fetchpriority="high"`), `decoding="async"` |
| `cc_media_forget($uploads_dir, $name)` | Deletes a file's copies and metadata (`delete_media`) |
| `cc_media_meta_all()` / `cc_media_meta_update($fn)` | Read / locked update of `media.json`; `cc_media_meta_file()` honours `$GLOBALS['CC_MEDIA_META_FILE']` (tests) |
| `cc_media_folder_path($p)` | Normalizes a folder path (`" Products / Shoes "` → `"Products/Shoes"`); `''` = no folder, `null` = invalid (max 5 levels, segments of 1–50 letters, digits, spaces, `_ . ( ) & -`, no `.`/`..`) |
| `cc_media_folders()` | All folders, sorted: those in `media-folders.json`, those used in `media.json`, and every parent of them |
| `cc_media_folder_create($path)` / `cc_media_folder_rename($from, $to)` / `cc_media_folder_delete($path)` | Folder operations. Rename moves sub-folders and images' `folder` along (refused when the target exists or is inside the source); delete moves its images to the parent folder and deletes no file |
| `cc_media_move($names, $folder)` | Sets `folder` for the given files (creating the folder). **Folders are labels**: files never move on disk, so image URLs never change |
| `cc_media_usage($pdo, $names)` | Where each file is used: searches the stored content of pages, draft copies (`Page draft`), items (incl. `cover_image`), `site_parts`, `master_components`, and `settings.json` / `menu.json`, by bare file name; returns `name => ["Page: Home", …]` |

### `backup.php`

Loaded by `api.php`. A backup is a ZIP with `manifest.json` (`format: "canvascore-backup"`, `format_version`
`CC_BACKUP_FORMAT` = 1, `app`, `build`, `db_schema`, `content_schema`, `created_at`, `kind`, `site_name`,
`includes`, `counts`, `uploads`), `db/<table>.json` (every row of `CC_BACKUP_TABLES`: `pages` incl. draft copies,
`templates`, `master_components`, `site_parts`, `collections`, `collection_items`, `redirects`; plus the optional
`page_revisions` and `form_submissions`), `data/<file>.json` (`CC_BACKUP_DATA_FILES`: `settings.json`, `menu.json`,
`media.json`, `media-folders.json`) and `uploads/…` (images only, stored uncompressed). The `admin` and `cc_meta`
tables are never included.

| Function | What it does |
| --- | --- |
| `cc_backup_create($pdo, $dest, $opts)` | Writes the ZIP (`history`, `submissions`, `kind`); returns the manifest or throws |
| `cc_backup_inspect($path)` | Opens and checks a ZIP without changing anything: manifest, only allowed entries (`cc_backup_upload_path_ok()`: image extensions, plain names, no `..`), not newer than this install (`format_version`, `db_schema`), enough disk space |
| `cc_backup_restore($pdo, $path)` | Reads and validates every table and data file first; unpacks images into `.cc-restore-…` next to `uploads/`, drops unsafe SVGs / non-images, swaps the folders (`.cc-old-uploads-…` kept until the end); replaces the tables in one transaction (optional tables only when present; columns intersected with the current schema, so older backups load) and puts the old uploads back on failure; then writes settings (keeping the current `trustedProxies`), menu and media data, and runs `cc_migrate_content()` |
| `cc_backup_safety_copy($pdo)` | `before-restore-…zip` of the current site; keeps the newest `CC_BACKUP_KEEP_SAFETY` (5) |
| `cc_backup_list()` / `cc_backup_name_ok()` / `cc_backup_cleanup()` | Saved backups with their manifest info; strict file name check; removes temporary `download-*.zip` / `upload-*.part` older than an hour |
| `cc_backup_max_upload()` / `cc_backup_slug($name)` | Smaller of `upload_max_filesize` and `post_max_size` (chunk size for the client); download file name from the site name |

When adding a content table or a data file that belongs to the site, add it to `CC_BACKUP_TABLES` /
`CC_BACKUP_DATA_FILES` (both creation and the restore whitelist use them), and to the tests in `tests/server.php`.

## 8. Adding a new block

Example: a `QUOTE` block. Use a nearby block (e.g. `CALLOUT`) as a template at each step. The most recent
complete example is `SEARCH` (Site Search): catalog entry, `blocks.json` defaults, `SearchPanel.jsx`, both
renderers (with the script only in PHP) and the `s1`/`s2` parity fixtures.

1. **Catalog**: add `{ type: 'QUOTE', label: 'Quote', icon: …, category: 'sections', color, keywords }` to
   `BLOCKS` in `src/editor/blockCatalog.js`. Add `admin: true` to hide it from editors in the Add panel
   (UI only; enforce on the server if it matters).
2. **Defaults**: add `"QUOTE": { "content": {…}, "styles": {…} }` to `types` in `canvascore-admin/blocks.json`.
   `addBlock()` merges `_baseStyles` + `styles` and deep-clones `content`. Containers add `"children": true`.
   Keep the file's formatting: 2-space indentation and non-ASCII characters written as `\uXXXX` escapes (as
   Python's `json.dump(..., indent=2, ensure_ascii=True)` writes them, e.g. `"Search the site…"`), so diffs
   stay minimal.
3. **Panel**: create `src/components/panel/blocks/QuotePanel.jsx` with a default export
   `({ ctx }) => …`, built from `fields.jsx` (`PanelAccordion`, `TxtF`, `NumF`, `SelF`, `ChkF`, `ColorF`,
   `ImgF`, `ItemCard`). `ctx` provides `c` (content), `set(key, value)`, `patchContent`, `handleStyleChange`,
   `pick(type, index)` for the media picker, and list helpers (`lstOf`, `lstAdd`, `lstPatch`, `lstRemove`,
   `lstMove`). Register it in `CONTENT_PANELS` in `panel/blocks/index.js`. Style and Advanced tabs are shared;
   the Content tab is shown exactly when the type has an entry in `CONTENT_PANELS` (`PropertyPanel.jsx`), so a
   block without a panel opens on Style.
4. **JS renderer**: add `case 'QUOTE':` to `renderBlock()` in `src/render/renderBlock.mjs`. Root element:
   `id="${innerId}"`, `class="cc-quote${animClass}${innerClass}"`, `${styleString}` or `style="${styleAttr} …"`,
   prefixed with `customCss`. Escape everything that isn't rich text.
5. **PHP compiler**: add the mirror `case 'QUOTE':` to `render_block()` in `canvascore-admin/compiler.php`,
   using `htmlspecialchars`, `cc_int`/`cc_num`/`cc_color` and `cc_sanitize_html()` for rich text.
   Add CSS rules that carry logic in a `<style>` next to the block (and the type to `STRICT_STYLE`).
   Behaviour scripts go **only** here (`SEARCH` keeps its script in the `CC_SEARCH_SCRIPT` nowdoc with an `%ID%`
   placeholder); the JS renderer doesn't emit them and the parity test ignores `<script>` nodes.
6. **Parity fixtures**: add one or more fixtures to `fixtures` in `tests/parity.mjs` (edge cases too: empty
   values, out-of-range numbers, hostile strings), and the type to the "fixtures from the real defaults"
   list. Run `npm run test:parity`.
7. **In-place text (optional)**: mark rich-text elements with `${field('text', 'Type…')}` in
   `renderBlock.mjs` and add the type to `TEXT_FIELDS` in `src/components/SortableBlock.jsx`
   (`'full'` or `'basic'` toolbar).
8. **Canvas behaviour (optional)**: injected `<script>`s don't run in the editor. If the block needs JS
   on the canvas, wire it in a `useEffect` in `SortableBlock.jsx` (see `SLIDER`, `BEFORE_AFTER`); add it to
   `INTERACTIVE` if clicks must reach the canvas HTML.
9. **Tests**: behaviour of the compiled HTML in `tests/blocks-content.mjs` (or `blocks.mjs`), or a quick
   output check in `tests/server.php` (as for `SEARCH`); the panel in `tests/panels-ui.mjs`. Then `npm test` and lint.
10. **Docs**: the block's entry in [BLOCK-REFERENCE.md](BLOCK-REFERENCE.md), a CHANGELOG line under
    `[Unreleased]`, optionally use it in `starters.json` (checked by `test:starters`).

A new **container** type must be added to `CONTAINER_TYPES` (`blockCatalog.js`), which every editor module
uses (store, canvas, Layers, property panel, templates), and to `blockRoot()` (`renderBlock.mjs`) and the PHP
compiler. Whether it gets a Content tab depends only on `CONTENT_PANELS` (e.g. `FLEX_ROW` has
`FlexRowPanel.jsx`; `SECTION` and `CONTAINER` have none).

## 9. Editor state (`src/store/useStore.js`)

One Zustand store holds auth, the current view (`currentView`: `manager`, `editor`, `menu`, `media`,
`settings`, `users`, `templates`, `submissions`, `collections`, `backup`), `viewport`, the page list,
`activePage`, the block tree and session/draft flags. `branding` (`{ siteName, faviconUrl }`) is loaded by
`fetchBranding()` (public `api.php?action=branding`, awaited before the first screen so the sign-in page doesn't
change after it appears) and updated by `setBranding()` when Global Options are saved; `useBrandingHead()` keeps the
tab title (`<site name> · Admin`) and favicon in step. Components read it with `useStore()` /
selectors; non-React code uses `useStore.getState()` / `setState()`.

**Tree helpers** (module-private, immutable): `updateNode`, `removeNode`, `insertNode`, `findNodeById`,
`findInTree`, `nodeContainsId`.

- `newBlockId()` → `block-<time36>-<seq36><random>`: unique even for many blocks created in the same
  millisecond. Use it for every new block and when cloning (`addSavedBlock` regenerates all ids of a template).
- `addTo(blocks, parentId, block)` inserts inside `parentId` only if it exists **and** is a container
  (`children` array or a `CONTAINER_TYPES` type); otherwise it appends at the end of the page. A stale or
  non-container selection can never give a Text block children. `VisualEditor` passes the selected block as
  parent only when it is a container (`getValidParentId()`).
- `moveBlock(activeId, overId)` (canvas drag & drop): dropping onto an **empty** container moves inside it;
  same parent → reorder; different parents → insert before the target. No-op when it would create a cycle.
- `moveBlockTo(activeId, targetId, 'before' | 'after' | 'inside')` (Layers tab) uses the exported
  `placeInTree()`; `inside` appends to a container's children. `src/editor/layerDrop.js` decides the position.
- `moveBlockBy(id, -1 | 1)` swaps a block with its previous/next sibling (Alt+↑/↓, the panel's quick bar).

**Copies and the block clipboard**:

- `cloneWithNewIds(node)` (exported) deep-copies a block and gives it, every descendant and every Hero button a
  fresh `newBlockId()`. Any copy must go through it: a copy must never share an id with its original.
- `duplicateBlock(id)` inserts a clone right after the original (same parent) and selects it; returns the new id.
- `copyBlock(id)` stores `{ block, copiedAt }` in `localStorage` under `'cc_block_clipboard'` (so it survives
  page changes and works across tabs of the same browser) and bumps `blockClipboardAt` (a change signal for
  subscribers). `readBlockClipboard()` (exported) returns the entry or `null` (invalid JSON, no `type`, storage
  unavailable); the Add tab (`AddBlocksPanel.jsx`) uses it to offer "Paste copied …".
- `pasteBlock()` inserts a clone of the clipboard block inside the selected container, after the selected
  block, or at the end of the page, and selects it.
- `replaceBlocks(blocks)` replaces the whole tree as **one undoable step** and clears the selection (restoring a
  version from History); unlike `setBlocks()` it keeps the history, and it isn't saved until Save Draft / Publish.

**Shortcuts** (`VisualEditor.jsx`): one `keydown` listener on `window` in the **capture phase** (the in-place
text editor stops propagation; Ctrl/Cmd+S must still arrive). It does nothing while the session-expired login is
shown or a `.ui-dialog` is open. Ctrl/Cmd+S always works (it blurs the active text first so it commits); every
other shortcut is ignored while typing (`contentEditable`, `INPUT`, `TEXTAREA`, `SELECT`): undo/redo
(Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y), Ctrl/Cmd+D duplicate, Ctrl/Cmd+C copy block (only when no text is
selected), Ctrl/Cmd+V paste block (only when the clipboard holds one), Delete/Backspace delete, Alt+↑/↓ move,
Esc deselect. In master edit mode block shortcuts need a selected block.

**History**: `pastBlocks` / `futureBlocks` snapshots of `blocks` (max 30). Every structural change goes
through `pushHistory()`, which clears the redo stack. `updateBlock(id, updates)` merges quick successive
edits into **one** step, so typing in a field makes one undo step instead of one per key: same block, same keys
(and same nested keys for object values) — compared through a signature kept in the module-level `lastEdit`
— within 1.2 s, and no other change in between (`state.blocks` must still be the tree the last edit produced). `setBlocks()` resets history (opening a page). Always pass new objects to
`updateBlock`; mutating nested arrays in place breaks undo.

**Selection**: `selectedBlockId` / `setSelectedBlockId` (Esc deselects). `removeBlock` clears it when the
selected block is deleted; `duplicateBlock` and `pasteBlock` select the new block.

**Master edit mode**: `enterMasterEditMode(masterId)` saves the page (`editingMaster.pageBackup`,
`activePageBackup`) and loads the master as `blocks = [master]`. `exitMasterEditMode(true)` posts
`save_master` and only restores the page if it succeeded (on failure it stays, nothing lost);
`exitMasterEditMode(false)` cancels. While editing a master, page save, publish and Ctrl+S are disabled.
`saveAsMaster()` replaces the block with a `MASTER` pointer only after the server confirmed the save.

## 10. Saving and sessions

### Save flow (`VisualEditor.jsx`)

- `savePageRaw(publish)` reads the **latest** state with `useStore.getState()` and posts to `save_part`
  (`activePage.__part`), `save_item` (`activePage.__item`) or `save_page`, updating `activePage.id` from
  `new_id` when a draft copy is created or promoted.
- `savePage(publish)` enforces **one save at a time** (`saveInFlight` ref: a second click/Ctrl+S waits),
  snapshots what it sends (`sent = editorSnapshot(state).page`, `sentScope = editorScope(state)`) and, on
  success, calls `draft.markSaved(sent, sentScope)`. Only what was sent becomes "saved": edits made while
  the request was running stay dirty and backed up.
- Publish = `savePage(true)`, then `publishSiteAsync()` (POST `rebuild_all.php`), then the page list is
  refreshed. A failed save aborts the publish.

### Local backups (`src/session/drafts.js`, `draftTrackers.js`, `hooks.js`)

- `drafts.js`: per-user entries in `localStorage` under `cc_draft:v1:<user>:<scope>`, with an in-memory
  fallback; `saveDraft()` returns `{ ok:false }` instead of throwing (the UI shows `draftBackupFailed`).
  Entries older than 14 days are purged. `canon()` gives order-independent JSON for comparisons.
  `registerFlusher()` / `flushDrafts()` write pending backups on `pagehide`, logout and session expiry.
- `draftTrackers.js`: `createEditorDraftTracker()` compares the canonical snapshot of page + blocks (and
  master, in master mode) with the saved baseline, debounced 600 ms, and sets `editorDirty`. Scopes are
  `editor:page:<id>`; `createDraftChannel()` does the same for `menu` and `settings`.
  `applyDraftToStore()` restores an entry.
- `hooks.js`: `useEditorDraft()` (returns `{ markSaved, discard, restoreFound, dismissFound }`) and
  `useDraftSync(scope, value)` for the Menu and Global Options screens. Logic lives in the pure modules,
  tested in Node.
- Opening a page that has an older backup sets `editorDraftFound: { savedAt }`; `VisualEditor` shows an
  "Unsaved changes found" banner with Restore / Discard. It is never deleted silently.
- `DraftRestorePrompt.jsx` (mounted in `App.jsx`) lists the signed-in user's backups once per sign-in and
  offers to restore them.

### Fetch guard and session manager

`src/apiClient.js` (first import in `main.jsx`) calls `installSession()` (`session/runtime.js`), which
replaces `window.fetch` with `createGuardedFetch()` (`session/fetchGuard.js`):

- adds `X-CSRF-Token` to relative requests (token from `window.__CC_CSRF`, set by `check_auth`/`login`, or
  the `cc_csrf` cookie);
- for `api.php` / `rebuild_all.php` (except `login`, `logout`, `check_auth`, `session_status`, `version`):
  a **401** shows the login on top of the app (`SessionExpiredOverlay`, app kept mounted and `inert`), waits
  for re-login and **retries once**; a **403** whose message mentions CSRF refreshes the token and retries.

So components simply call `fetch('api.php?action=…', { method: 'POST', body: JSON.stringify(data) })`.

`session/sessionManager.js` polls `session_status` (read-only, doesn't extend the session) every 30 s,
sends `keepalive` at most once a minute and only after user activity, warns before expiry
(`SessionWarning`), and refuses to adopt a different user on re-login (`reauth`).

**Session lock**: PHP file sessions allow one request per session at a time. `api.php` calls
`session_write_close()` for every GET right after the auth gate (and in `session_status`), and
`rebuild_all.php` closes it before compiling. GET handlers therefore **must not write `$_SESSION`**.

## 11. UI conventions

- **Two class namespaces.** Admin UI uses the kit's `ui-*` classes (`src/ui/kit.css`, tokens `--ui-*`).
  The canvas renders the site's real HTML with `cc-*` classes; `global.css` has no rules on bare elements so
  nothing leaks into it, and `.cc-canvas` resets text to the published page's base. Don't style `cc-*` site
  classes from the admin, and don't use `ui-*` in rendered blocks. (The editor layout itself uses a few
  `cc-editor`, `cc-pp…` classes defined in `kit.css`.)
- **Components** (`src/ui/kit.jsx`): `Button` (variants, `icon`, `size`), `IconButton` (requires `label`,
  used as `aria-label`), `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `SearchInput`, `Segmented`,
  `Card`, `Badge`, `StatusBadge`, `EmptyState`, `PageHeader`, `Tabs`, `Section`. Admin screens are wrapped
  in `AdminLayout`. Property panels use `panel/fields.jsx`.
- **Messages**: `notify(message, 'success' | 'error' | 'info')` from `src/ui/notify.js`, shown by
  `<Toaster />`. No `alert()`.
- **Confirmations and input**: `await confirmDialog({ title, message, confirmLabel, danger })` → boolean and
  `await promptDialog({ title, label, defaultValue })` → string or `null` (`src/ui/dialog.js`, rendered by
  `<DialogHost />`). No `window.confirm` / `window.prompt`. Destructive actions: `danger: true`, a specific
  label ("Delete page"), and a message saying what happens.
- **Accessibility**: real `<button>`s and labelled fields, visible focus (`--ui-focus`), `role="tablist"` /
  `aria-selected` for tabs, `aria-current` in navigation; dialogs trap focus, Esc cancels, Enter confirms.
  Global shortcuts ignore keys while a `.ui-dialog` is open.
- **Theme**: colors, radii and fonts are tokens in `kit.css` `:root`; change them there, not inline.
  (Older panels still use inline style objects from `panel/helpers.js`.)

## 12. Backend API conventions (`canvascore-admin/api.php`)

- **Routing**: `?action=<name>`; a flat sequence of `if ($action === '…' && $_SERVER['REQUEST_METHOD'] === 'POST') { …; exit; }`
  blocks. Unknown actions fall through to `{"success":false,"message":"Invalid action."}`.
- **Order at the top**: JSON headers, `display_errors` off (warnings go to the log, never into JSON), DB
  open + migrations, then: POST without a session → **401** (`cc_unauthorized()`), CSRF check on every
  POST except `login` (`cc_verify_csrf_or_die()`, **403**), public actions (`version`, `branding`, `session_status`,
  `check_auth`, `login`, `logout`), the **auth gate**, `cc_session_touch()`, `session_write_close()` for GET.
- **Admin-only**: add the action to the `in_array($action, [...]) && !$is_admin` list near the top (users,
  backup actions, submissions), or check `$is_admin` inside the handler (collections, redirects, admin-only settings
  fields). Data an editor must not see is removed from read responses too: `get_settings` drops `adminEmail`,
  `emailFrom`, `emailSubject`, `sessionTimeoutMinutes` and `trustedProxies` for non-admins, and `save_settings`
  keeps their stored values.
- **Input**: `json_decode(file_get_contents('php://input'), true)`; validate types; slugs through
  `cc_safe_slug()`; prepared statements only.
- **Output**: mutations return `{ "success": bool, "message": "…" }` (plus `new_id`, `id`, `code` such as
  `slug_taken`); errors are normally HTTP 200 with `success:false`. Read actions return the data directly
  (arrays/objects).
- New state-changing actions must be POST so they get the CSRF check.

Recently added actions:

| Action | Method | Notes |
| --- | --- | --- |
| `get_revisions` | GET `?owner=` | Versions of a page (a draft copy id is mapped to its live page) or `item:<id>`: `id, title, kind, author, created_at, size`, newest first |
| `get_revision` | GET `?id=` | One version with its `content_json` |
| `get_redirects` | GET | All redirects (`from_path, to_path, auto, created_at`); any signed-in user |
| `save_redirect` / `delete_redirect` | POST `{ from, to }` / `{ from }` | Admins only; validated with `cc_redirect_path()` / `cc_redirect_target()`, saved through `cc_add_redirect(…, 0)`; effective at the next publish |
| `save_media_meta` | POST `{ name, alt }` | Alt text of a library image (max 300 characters) in `media.json` |
| `optimize_media` | POST | Makes the WebP copies of images not yet optimized, in ~20 s batches: returns `{ done, remaining }`; call again while `remaining > 0` |
| `change_own_password` | POST `{ current, password }` | Any role, own account; `current` is required unless `must_change_pw` is set (the forced first change); 8+ characters, not `admin`; clears `must_change_pw` |
| `branding` | GET | **Public** (no sign-in): `{ siteName, faviconUrl }` from `cc_public_branding()`, nothing else from the settings |
| `get_media_folders` | GET | Array of folder paths (`cc_media_folders()`) |
| `media_folder_create` / `media_folder_rename` / `media_folder_delete` | POST `{ path }` / `{ from, to }` / `{ path }` | Any signed-in user; returns `{ success, folders }` |
| `media_move` | POST `{ names, folder }` | Sets the folder of existing files (`''` = none); returns `{ moved, folders }` |
| `media_usage` | POST `{ names }` | `{ usage: { name: ["Page: Home", …] } }` (`cc_media_usage()`), shown before deleting |
| `bulk_items` | POST `{ op, ids, collection_id? }` | Any signed-in user. `op`: `move`, `archive`, `unarchive`, `delete`; max 1000 ids. Returns `{ done, skipped: [{ id, title, reason }], removed_files }`. `move` skips items already in the target and published items whose slug is taken by a published item there, and adds redirects for moved published items |
| `backup_info` | GET | `{ zip, max_upload, backups }` (admins) |
| `backup_create` | POST `{ history, submissions, temp }` | `temp: true` makes a one-time `download-…zip`; otherwise a `backup-…zip` kept in `backups/`. Errors come back as JSON before any download starts |
| `backup_download` | GET `?name=` | Streams a saved backup (or a `download-…` one, deleted after sending, named after the site) |
| `backup_delete` | POST `{ name }` | Deletes a saved backup or safety copy |
| `backup_upload_chunk` | POST multipart `{ id, index, chunk }` | Appends a piece to `backups/upload-<id>.part` (`id`: 16 hex characters; index 0 starts the file) |
| `backup_restore` / `backup_restore_saved` | POST `{ upload, size }` / `{ name }` | One at a time (`.restore.lock`): inspect, safety copy, `cc_backup_restore()`. Returns `{ success, message, counts, skipped, safety, backups }`; the client then republishes |

`upload_media` also returns `meta` (from `cc_media_process()`) and accepts an optional `folder` field;
`get_media` returns `folder, mtime, alt, w, h, bytes, optimized, variants` per file (the `_cc` folder isn't listed);
`delete_media` accepts `{ name }` or `{ names: [...] }` and calls `cc_media_forget()` for each.
`save_collection` (admins) renames: without an explicit `slug` the address is kept; it returns `{ id, name, slug,
moved }`. `delete_collection` and `delete_item` take the published files offline at once and return `removed_files`.
`export_site` / `import_site` (the pre-0.14 `.json` format) remain; the editor only uses `import_site`, for old
backups.

```php
if ($action === 'save_thing' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$is_admin) { echo json_encode(['success' => false, 'message' => 'Only admins can manage things.']); exit; }
    $d = json_decode(file_get_contents('php://input'), true);
    if (!is_array($d)) { echo json_encode(['success' => false, 'message' => 'Invalid payload.']); exit; }
    $pdo->prepare("UPDATE things SET name = ? WHERE id = ?")->execute([trim((string)($d['name'] ?? '')), $d['id'] ?? '']);
    echo json_encode(['success' => true, 'message' => 'Saved.']); exit;
}
```

`rebuild_all.php` follows the same rules (login, POST only, CSRF) and reports files it couldn't write
instead of claiming success.

## 13. Versioning, releases and git workflow

`canvascore-admin/version.json` is the single source of truth, read by PHP (`cc_version()`) and Vite:

```json
{ "app": "0.14.0", "db_schema": 7, "content_schema": 1, "build": 28, "built": "2026-10-13T08:08:55.709Z" }
```

- `build`/`built` are bumped by `scripts/bump.mjs` on every `npm run build` (it also syncs `version` in
  `package.json` / `package-lock.json` with `app`). The sidebar (`AdminLayout.jsx`) shows
  `CanvasCore v<app> · build <n>` (from `api.php?action=version`) and warns when the editor's built-in
  `app` version differs from the server's (reload needed after an update).
- Every published page carries `<meta name="generator" content="CanvasCore x.y.z">`.

Three versions live in that file: `app` (the product, SemVer), `db_schema` (the last DB migration) and
`content_schema` (the saved block format). Bump `db_schema` / `content_schema` together with a new migration (see
[Migrations](#migrations)); a content migration runs on the next request, `cc_migrate_content()` rewrites the stored
`content_json` (of `pages`, today) and stamps the new `content_schema`, and rows saved afterwards are already at the
current version.

Cutting a release:

1. Set `app` in `version.json` (SemVer; while `0.x`, MINOR = new features or format changes, PATCH = fixes only;
   1.0.0 once the API and formats are stable).
2. Move `[Unreleased]` in `docs/CHANGELOG.md` (Keep a Changelog format) to a dated `## [x.y.z] - YYYY-MM-DD` section.
3. `npm test` and `npm run lint` (zero warnings).
4. `npm run build`, and commit the bumped `version.json` on its own.
5. Tag the release `vX.Y.Z` and publish a GitHub release whose notes are that CHANGELOG section (plus update steps
   when needed). There are no release-notes files in the repository.

Contributions from outside follow [CONTRIBUTING.md](../../CONTRIBUTING.md) (focused pull requests, tests and a
CHANGELOG line, `Signed-off-by` per the DCO, contributions licensed AGPL-3.0-or-later). Vulnerabilities are reported
privately as described in [SECURITY.md](../../SECURITY.md) (bug@sputlab.com or GitHub private vulnerability
reporting); only the latest 0.x release gets security fixes.

Git workflow used in this repository:

- Work on a **feature branch** (`menu`, `text_editor`, `ui_reorg`, `bugfix`, `confirm_dialog`…), with
  descriptive commits that also update `[Unreleased]` in the CHANGELOG.
- Merge into `main` with `git merge --no-ff <branch>` so each feature stays a visible unit.
- Run `npm run build` on `main` and commit the bumped `canvascore-admin/version.json` **on its own**
  ("Bump build number to N").
- Never commit generated output: `dist/`, the editor build copied into `canvascore-admin/`, the data dir and
  the published site at the repo root are all git-ignored. A new root-level file must be whitelisted in
  `.gitignore`.
- Internal working notes (phase notes, old release notes, design notes) go in `docs/dev/`, which is git-ignored:
  they stay on your machine. Anything other developers need belongs in these manuals or the CHANGELOG.
