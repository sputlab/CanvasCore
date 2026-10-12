# CanvasCore — Versioning (SemVer)

Three coordinated versions, a single source of truth: `canvascore-admin/version.json`.

```json
{
  "app": "0.1.0",        // product version (MAJOR.MINOR.PATCH)
  "db_schema": 1,        // database schema version
  "content_schema": 1    // version of the saved block format
}
```

- **PHP** reads `version.json` at runtime (`cc_version()` in `config.php`).
- **Vite** reads the same file at build time (`vite.config.js` → `__APP_VERSION__`),
  so interface and server can't diverge.
- The panel shows the version and warns if build and server don't match
  (a sign that a hard refresh is needed after the update).
- Every compiled page carries `<meta name="generator" content="CanvasCore x.y.z">`.

## New files to add

- `canvascore-admin/version.json`
- `canvascore-admin/migrations.php`
- `docs/CHANGELOG.md`

## Files to replace

Backend: `canvascore-admin/config.php`, `api.php`, `rebuild_all.php`
Frontend: `vite.config.js`, `src/App.jsx`, `src/store/useStore.js`,
`src/components/PageManager.jsx`  → then `npm run build`.

## How to cut a release

1. Update `app` in `version.json` following SemVer:
   - **PATCH** (0.1.0 → 0.1.1): bug fixes only, no behavior change;
   - **MINOR** (0.1.0 → 0.2.0): new backward-compatible features;
   - **MAJOR** (0.x → 1.0.0): when the API/formats stabilize, or for
     incompatible breaking changes after 1.0.
2. Move the entries from `[Unreleased]` to a new dated section in the `CHANGELOG`.
3. `npm run build` the frontend and deploy.

## How to add a DB migration

1. In `migrations.php`, add a numbered entry to `cc_db_migrations()`:
   ```php
   2 => function ($pdo) {
       cc_add_col($pdo, 'pages', 'new_field', "TEXT DEFAULT ''");
   },
   ```
   Always use `cc_add_col()` (checks existence, no exceptions) and, for SQLite,
   **no non-constant defaults** in `ALTER` (e.g. `CURRENT_TIMESTAMP`): add the
   column without a default and backfill it with an `UPDATE`.
2. Bring `db_schema` in `version.json` to the new number.
3. Note the change in the `CHANGELOG`.

The runner applies, in order and in a transaction, every migration whose number
is higher than the one recorded in `cc_meta`. It works for both new and existing
installations.

## How to add a content migration (block format)

When the block format changes in Phase 2:

1. In `migrations.php`, add to `cc_content_migrations()`:
   ```php
   2 => function ($blocks) {
       // transform the block array from format 1 to format 2
       return $blocks;
   },
   ```
2. Bring `content_schema` in `version.json` to `2`.
3. On the next panel load, `cc_migrate_content()` automatically updates the
   `content_json` of every page and stamps the new version. Pages saved
   afterwards are created at the current version already.
