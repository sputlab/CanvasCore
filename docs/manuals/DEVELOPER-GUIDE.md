# CanvasCore Developer Guide

For developers joining the project. It covers how the pieces fit together, how to run and test them
locally, and the conventions the code follows. Paths are relative to the repository root.

Related manuals: [User Guide](USER-GUIDE.md) (using the editor), [Block Reference](BLOCK-REFERENCE.md)
(every block and its settings), [Administrator Guide](ADMIN-GUIDE.md) (install, hosting, accounts, backups).
Release history: [CHANGELOG.md](../CHANGELOG.md).

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
           │  master.html + effects.css + menu + header/footer
           ▼
  canvascore-admin/compiler.php  render_block()
           │
           ▼
  ../index.html, ../<slug>/index.html, ../<collection>/<item>/index.html,
  ../sitemap.xml, ../robots.txt, ../404.html   (static files, served by any web server)

  One rendering contract:
     src/render/renderBlock.mjs  ≡  compiler.php render_block()
     checked block by block by tests/parity.mjs (JS output vs PHP CLI output)
```

The key idea: the editor canvas shows each block with **the same HTML the site will get**. The JS renderer
(`renderBlock.mjs`) and the PHP compiler (`compiler.php`) are two implementations of one contract, kept
identical by an automated parity test rather than by sharing code across runtimes.

## 2. Repository layout

```
README.md                    Overview, requirements, deploy
docs/                        CHANGELOG.md, RELEASE-NOTES-x.y.z.md, VERSIONING.md, PHASE-*.md, SAVE-FIX.md
docs/manuals/                These manuals
canvascore-admin/            PHP backend (deployed into the site's admin folder)
canvascore-frontend/         React editor
```

**`canvascore-admin/`**

| File | Purpose |
| --- | --- |
| `api.php` | The editor's JSON API: auth, pages, items, parts, masters, templates, media, menu, settings, users, backup |
| `compiler.php` | `render_block()` (block → HTML), `render_menu_html()`, shared helpers (`cc_int`, `build_inline_style`, `cc_effect_classes`…) |
| `rebuild_all.php` | Publishes the whole site (pages, collection items, sitemap, robots, 404), removes stale files |
| `config.php` | Data dir, session boot, CSRF, login throttling, rate limits, `cc_sanitize_html`, `cc_version`, slugs |
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
| `src/components/VisualEditor.jsx` | Page editor: top bar, save/publish, shortcuts, side panels |
| `src/components/Canvas.jsx`, `SortableBlock.jsx` | Canvas and the per-block frame (DnD, selection, in-place text) |
| `src/components/PropertyPanel.jsx` | Content / Style / Advanced tabs for the selected block |
| `src/components/panel/` | `StyleTab`, `AdvancedTab`, `PageSettings`, `fields.jsx`, `helpers.js`, `constants.js` |
| `src/components/panel/blocks/` | One Content panel per block; `index.js` maps type → panel (`CONTENT_PANELS`) |
| `src/components/*.jsx` | Admin screens: PageManager, Collections, Templates, MediaManager, MenuBuilder, GlobalSettings, UserManager, Submissions, Backup, AdminLayout… |
| `src/session/` | Session manager, fetch guard, local draft backups and trackers |
| `src/ui/` | UI kit (`kit.jsx`, `kit.css`), `global.css`, `notify.js` + `toast.jsx`, `dialog.js` + `dialogHost.jsx` |
| `src/menu/menuThemes.js` | Menu defaults, themes, effect groups (mirrored in `compiler.php`) |
| `tests/` | The 10 test suites plus `render_php.php` / `render_menu.php` CLI helpers |

## 3. Local development

Requirements: Node.js ≥ 20 (developed with 24), npm, PHP ≥ 8 with `pdo_sqlite` (`dom` recommended,
the sanitizer falls back to regexes without it). The PHP CLI must be on `PATH` for the tests.

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

`npm test` runs the 10 suites in sequence (each exits non-zero on failure):

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
| `test:ui` | `tests/ui-shell.mjs` | Sidebar, Pages screen, editor top bar and shortcuts, Add panel, property tabs, effects, Layers, dialogs |

How they work:

- **PHP side**: the tests pipe a block (or menu) as JSON to `php tests/render_php.php` /
  `tests/render_menu.php`, which `require` the real `compiler.php`. No web server is involved.
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
| `settings.json` | Global Options: `brandColor`, `fontFamily`, `siteName`, `siteSuffix`, `siteUrl`, `faviconUrl`, `defaultOgImage`, `robotsAllow`, `menuInheritTheme`, `headerEnabled`, `footerEnabled`, `adminEmail`, `emailFrom`, `emailSubject`, `sessionTimeoutMinutes` (the last four are admin-only: an editor's save keeps the stored values) |
| `menu.json` | `{ "items": [...], "settings": {...} }`, nested items (`children`), legacy flat format still read |
| `forms.json` | Written by each publish: form id → recipient, so addresses never reach the client |
| `published_files.json` | Manifest of files the last successful publish wrote; used to delete pages no longer published |
| `login_attempts.json`, `rate_*.json` | Login throttling and form rate limits |
| `sessions/` | PHP session files (dedicated folder) |

### Tables

- **`pages`**: `id, parent_id, title, slug, clean_slug, seo_title, seo_description, seo_image, layout`
  (`boxed`/full), `bg_color, boxed_width, content_json, status, is_draft_copy, is_home, content_schema, author, updated_at`.
- **`collections`** (`id, name, slug`) and **`collection_items`** (`id, collection_id, title, slug, excerpt,
  cover_image, date, content_json, status` draft/published, `archived, seo_*, content_schema, updated_at`).
  Items publish to `/<collection-slug>/<item-slug>/`; the `COLLECTION_LIST` block lists them at build time.
- **`master_components`** (`id, name, content_json`): one block (a subtree) reused by reference.
- **`templates`** (`id, name, content_json`): one block saved as a reusable **copy**.
- **`site_parts`** (`name` = `header`/`footer`, `content_json` = block array): global header/footer.
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
on publish; drafts may share a slug. Changing a published page's slug rewrites `"url"`/`"btnUrl"` links in
pages and `menu.json` (`relink_slug_change()`).

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

**DB schema** (currently 5): add a numbered closure to `cc_db_migrations()`, then bump `db_schema` in
`version.json` and note it in the CHANGELOG. Each migration runs once, in order, in a transaction, and the
number is recorded in `cc_meta`.

```php
6 => function ($pdo) {
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
- `<script>`/`<style>` behaviour nodes (autoplay, counters, responsive rules) are each renderer's own, except
  for the blocks in `STRICT_STYLE` in `tests/parity.mjs`, whose `<style>` text carries logic and is compared.
- `MASTER` and `COLLECTION_LIST` render a placeholder comment in JS; the editor draws them itself.
- Links to internal pages become `{{BASE_URL}}…`; the compiler substitutes the base path, the canvas `#`.

### `opts.fields` and in-place editing

`renderBlock(block, { fields: true })` adds `data-cc-field="<name>" contenteditable="true"
data-cc-placeholder="…"` to the elements that hold rich text, via the local `field(name, placeholder)`
helper. `SortableBlock.jsx` uses it for selected blocks listed in `TEXT_FIELDS`
(`TEXT.text`, `HERO.title/subtitle`, `IMAGE_TEXT.text`, `FORM.title`) and hands the HTML to
`InlineRegions` (`src/editor/RichText.jsx`), which commits each field on blur.

### Containers: `blockRoot`

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
- Non-admins can't save "code surfaces": `cc_strip_code_surfaces()` empties `HTML.code` and removes
  `customCss`/`customJs` in `save_page`, `save_item`, `save_part` and `save_master`.

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

## 6. Adding a new block

Example: a `QUOTE` block. Use a nearby block (e.g. `CALLOUT`) as a template at each step.

1. **Catalog**: add `{ type: 'QUOTE', label: 'Quote', icon: …, category: 'sections', color, keywords }` to
   `BLOCKS` in `src/editor/blockCatalog.js`. Add `admin: true` to hide it from editors in the Add panel
   (UI only; enforce on the server if it matters).
2. **Defaults**: add `"QUOTE": { "content": {…}, "styles": {…} }` to `types` in `canvascore-admin/blocks.json`.
   `addBlock()` merges `_baseStyles` + `styles` and deep-clones `content`. Containers add `"children": true`.
3. **Panel**: create `src/components/panel/blocks/QuotePanel.jsx` with a default export
   `({ ctx }) => …`, built from `fields.jsx` (`PanelAccordion`, `TxtF`, `NumF`, `SelF`, `ChkF`, `ColorF`,
   `ImgF`, `ItemCard`). `ctx` provides `c` (content), `set(key, value)`, `patchContent`, `handleStyleChange`,
   `pick(type, index)` for the media picker, and list helpers (`lstOf`, `lstAdd`, `lstPatch`, `lstRemove`,
   `lstMove`). Register it in `CONTENT_PANELS` in `panel/blocks/index.js`. Style and Advanced tabs are shared.
4. **JS renderer**: add `case 'QUOTE':` to `renderBlock()` in `src/render/renderBlock.mjs`. Root element:
   `id="${innerId}"`, `class="cc-quote${animClass}${innerClass}"`, `${styleString}` or `style="${styleAttr} …"`,
   prefixed with `customCss`. Escape everything that isn't rich text.
5. **PHP compiler**: add the mirror `case 'QUOTE':` to `render_block()` in `canvascore-admin/compiler.php`,
   using `htmlspecialchars`, `cc_int`/`cc_num`/`cc_color` and `cc_sanitize_html()` for rich text.
   Add CSS rules that carry logic in a `<style>` next to the block (and the type to `STRICT_STYLE`).
6. **Parity fixtures**: add one or more fixtures to `fixtures` in `tests/parity.mjs` (edge cases too: empty
   values, out-of-range numbers, hostile strings), and the type to the "fixtures from the real defaults"
   list. Run `npm run test:parity`.
7. **In-place text (optional)**: mark rich-text elements with `${field('text', 'Type…')}` in
   `renderBlock.mjs` and add the type to `TEXT_FIELDS` in `src/components/SortableBlock.jsx`
   (`'full'` or `'basic'` toolbar).
8. **Canvas behaviour (optional)**: injected `<script>`s don't run in the editor. If the block needs JS
   on the canvas, wire it in a `useEffect` in `SortableBlock.jsx` (see `SLIDER`, `BEFORE_AFTER`); add it to
   `INTERACTIVE` if clicks must reach the canvas HTML.
9. **Tests**: behaviour of the compiled HTML in `tests/blocks-content.mjs` (or `blocks.mjs`), the panel in
   `tests/panels-ui.mjs`. Then `npm test` and lint.
10. **Docs**: the block's entry in [BLOCK-REFERENCE.md](BLOCK-REFERENCE.md), a CHANGELOG line under
    `[Unreleased]`, optionally use it in `starters.json` (checked by `test:starters`).

A new **container** type must also be added to `CONTAINER_TYPES` (`blockCatalog.js`), `blockRoot()`
(`renderBlock.mjs`), `CONTAINERS` (`SortableBlock.jsx`) and, if it has no Content tab, the list in
`PropertyPanel.jsx` that hides it.

## 7. Editor state (`src/store/useStore.js`)

One Zustand store holds auth, the current view (`currentView`: `manager`, `editor`, `menu`, `media`,
`settings`, `users`, `templates`, `submissions`, `collections`, `backup`), `viewport`, the page list,
`activePage`, the block tree and session/draft flags. Components read it with `useStore()` /
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

**History**: `pastBlocks` / `futureBlocks` snapshots of `blocks` (max 30). Every structural change goes
through `pushHistory()`, which clears the redo stack. `updateBlock(id, updates)` merges quick successive
edits into **one** step: same block, same keys (and same nested keys for object values), within 1.2 s,
and no other change in between. `setBlocks()` resets history (opening a page). Always pass new objects to
`updateBlock`; mutating nested arrays in place breaks undo.

**Selection**: `selectedBlockId` / `setSelectedBlockId` (Esc deselects). `removeBlock` clears it when the
selected block is deleted.

**Master edit mode**: `enterMasterEditMode(masterId)` saves the page (`editingMaster.pageBackup`,
`activePageBackup`) and loads the master as `blocks = [master]`. `exitMasterEditMode(true)` posts
`save_master` and only restores the page if it succeeded (on failure it stays, nothing lost);
`exitMasterEditMode(false)` cancels. While editing a master, page save, publish and Ctrl+S are disabled.
`saveAsMaster()` replaces the block with a `MASTER` pointer only after the server confirmed the save.

## 8. Saving and sessions

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

## 9. UI conventions

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

## 10. Backend API conventions (`canvascore-admin/api.php`)

- **Routing**: `?action=<name>`; a flat sequence of `if ($action === '…' && $_SERVER['REQUEST_METHOD'] === 'POST') { …; exit; }`
  blocks. Unknown actions fall through to `{"success":false,"message":"Invalid action."}`.
- **Order at the top**: JSON headers, `display_errors` off (warnings go to the log, never into JSON), DB
  open + migrations, then: POST without a session → **401** (`cc_unauthorized()`), CSRF check on every
  POST except `login` (`cc_verify_csrf_or_die()`, **403**), public actions (`version`, `session_status`,
  `check_auth`, `login`, `logout`), the **auth gate**, `cc_session_touch()`, `session_write_close()` for GET.
- **Admin-only**: add the action to the `in_array($action, [...]) && !$is_admin` list near the top (users,
  backup, submissions), or check `$is_admin` inside the handler (collections, admin-only settings fields).
- **Input**: `json_decode(file_get_contents('php://input'), true)`; validate types; slugs through
  `cc_safe_slug()`; prepared statements only.
- **Output**: mutations return `{ "success": bool, "message": "…" }` (plus `new_id`, `id`, `code` such as
  `slug_taken`); errors are normally HTTP 200 with `success:false`. Read actions return the data directly
  (arrays/objects).
- New state-changing actions must be POST so they get the CSRF check.

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

## 11. Versioning, releases and git workflow

`canvascore-admin/version.json` is the single source of truth, read by PHP (`cc_version()`) and Vite:

```json
{ "app": "0.13.0", "db_schema": 5, "content_schema": 1, "build": 20, "built": "2026-10-12T12:02:50.558Z" }
```

- `build`/`built` are bumped by `scripts/bump.mjs` on every `npm run build` (it also syncs `version` in
  `package.json` / `package-lock.json` with `app`). The sidebar (`AdminLayout.jsx`) shows
  `CanvasCore v<app> · build <n>` (from `api.php?action=version`) and warns when the editor's built-in
  `app` version differs from the server's (reload needed after an update).
- Every published page carries `<meta name="generator" content="CanvasCore x.y.z">`.

Cutting a release (see also [VERSIONING.md](../VERSIONING.md)):

1. Set `app` (SemVer; while `0.x`, MINOR = features, PATCH = fixes).
2. Move `[Unreleased]` in `docs/CHANGELOG.md` (Keep a Changelog format) to a dated `## [x.y.z] - YYYY-MM-DD` section.
3. Write `docs/RELEASE-NOTES-x.y.z.md` (summary, files changed, update steps).
4. `npm test`, lint, `npm run build`, deploy.

Git workflow used in this repository:

- Work on a **feature branch** (`menu`, `text_editor`, `ui_reorg`, `bugfix`, `confirm_dialog`…), with
  descriptive commits that also update `[Unreleased]` in the CHANGELOG.
- Merge into `main` with `git merge --no-ff <branch>` so each feature stays a visible unit.
- Run `npm run build` on `main` and commit the bumped `canvascore-admin/version.json` **on its own**
  ("Bump build number to N").
- Never commit generated output: `dist/`, the editor build copied into `canvascore-admin/`, the data dir and
  the published site at the repo root are all git-ignored. A new root-level file must be whitelisted in
  `.gitignore`.
