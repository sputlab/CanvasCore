# CanvasCore — Phase 0 (stable starting point)

> **Historical note.** This describes the project as it was at that phase. For the current architecture see
> the [Developer Guide](manuals/DEVELOPER-GUIDE.md).

This package makes the app **work end-to-end** and closes the security holes
that lived in the rewritten files. Below you'll find what to replace, what to
delete and how to verify.

## 1. Files to REPLACE

Backend (`public/canvascore-admin/`)
- `api.php`          → complete draft/publish schema, missing actions, hardening
- `rebuild_all.php`  → query consistent with the new schema, routing via clean_slug
- `submit_form.php`  → server-side recipient only (no open relay), escaped output

Frontend (`public/canvascore-frontend/`)
- `src/store/useStore.js`              → real moveBlock, isEditingMaster/exitMasterEditMode
- `src/components/SortableBlock.jsx`   → drag & drop working at every level
- `src/components/UserManager.jsx`     → JSX rebuilt (the original was truncated)
- `package.json`                       → removed the dead react-simple-wysiwyg dependency

NB: `compiler.php` and `master.html` were NOT touched (they work). They're
included here only for convenient reference.

## 2. Files to DELETE (dead code)

    public/canvascore-frontend/src/store/useEditorStore.js
    public/canvascore-frontend/src/components/MenuManager.jsx
    public/canvascore-frontend/src/components/SiteSettings.jsx

Then remove the dead dependency:

    cd canvascore-frontend
    npm remove react-simple-wysiwyg

## 3. Frontend rebuild

    cd canvascore-frontend
    npm install
    npm run build      # generates /dist

Upload the contents of `dist/` into the `canvascore-admin/` folder (where the
editor runs), or serve it wherever you prefer: the editor talks to `api.php` and
`rebuild_all.php` through relative paths.

## 4. First run

1. Open the editor in the browser.
2. Log in with **admin / admin** (created automatically on first run).
3. **Change the password right away** from "Account".
4. Create a page with slug `index`, drag in a few blocks, "Publish Online".
5. Check that `index.html` is generated in the site root.

## 5. What was fixed

### Blocking bugs
- Publishing no longer worked (missing `is_draft_copy`/`status` columns): the
  schema is now complete and migrated automatically.
- Draft → hidden copy → publish → discard flow: implemented server-side and
  aligned with what the frontend already expected (`new_id`, `clean_slug`,
  `draft_copy`, `discard_draft`, `force_password`).
- `moveBlock` was a no-op: block reordering now works (between siblings, at any
  level of the tree).
- `UserManager.jsx` didn't compile (truncated JSX): rebuilt.
- Removed dead code that could crash (`useEditorStore.js` uses Zustand syntax
  that is no longer valid).

### Security (included because it lives in these same files)
- **Upload RCE**: image-extension whitelist + `getimagesize` check + an
  `.htaccess` that disables PHP execution in `/uploads`.
- **SQL injection** in the slug rename: now a prepared statement.
- **Path traversal** in file generation: slug sanitized to `[a-z0-9-]`.
- **Open relay** in the form mailer: the recipient is taken ONLY from the
  server-side global settings, never from the client.
- **Reflected XSS** in the form mailer: messages escaped.
- `.htaccess` in `/data` so the DB can't be downloaded (Apache).
- `session_regenerate_id` on login (anti session fixation).

## 6. Known limits — left for Phases 1-2 (as agreed)

These things work but need hardening later:
- **Protecting `/data` and `/uploads` on Nginx**: the `.htaccess` files only
  apply on Apache. On Nginx, move `data/` outside the web root or add a deny
  `location`. **Until you do, the DB can be downloaded on Nginx.**
- **Stored XSS** in the HTML/GRID/CARDS/Custom CSS blocks: the compiler still
  outputs that content raw (intended behavior for the "HTML" block, but it
  needs to be encapsulated/filtered). To be tackled in Phase 1.
- **Per-form email**: to close the open relay the recipient is now global.
  Per-form recipients will return in Phase 1 via a server-side registry.
- **Drag & drop between different containers**: today reordering happens
  between siblings in the same container. Moving across containers requires
  dedicated droppables (Phase 2).
- **CSRF token**, forced password change on first login: Phase 1.
- ~1.1 MB bundle (heavy Jodit), inline styles, single editor/compiler block
  schema: Phase 2.
