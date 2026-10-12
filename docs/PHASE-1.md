# CanvasCore — Phase 1 (security hardening)

> **Historical note.** This describes the project as it was at that phase. For the current architecture see
> the [Developer Guide](manuals/DEVELOPER-GUIDE.md).

This round closes the security holes left after Phase 0. Everything has been
tested: XSS sanitizer, CSRF/same-origin, data dir migration, forced password
change, code stripping for non-admins, form email registry.

## 1. NEW files to add

Backend:
- `canvascore-admin/config.php`  ← shared module (session, CSRF, data dir, sanitizer)

Frontend:
- `canvascore-frontend/src/apiClient.js`                    ← fetch wrapper that injects the CSRF token
- `canvascore-frontend/src/components/ForcePasswordChange.jsx` ← forced password change screen

## 2. Files to REPLACE

Backend (`canvascore-admin/`)
- `api.php`         → includes config, CSRF gate, must_change_pw, change_own_password, code strip for non-admins
- `rebuild_all.php` → uses the shared data dir, writes the form registry
- `compiler.php`    → sanitizes rich-text content, locks down custom CSS, forms via registry (no email in the client)
- `submit_form.php` → server-side recipient only (per-form registry + global fallback)

Frontend (`canvascore-frontend/`)
- `src/main.jsx`                       → imports apiClient first
- `src/App.jsx`                        → forced password change gate
- `src/store/useStore.js`              → stores csrf, must_change_pw, changeOwnPassword action
- `src/components/VisualEditor.jsx`    → "Custom HTML" block visible to admins only
- `src/components/PropertyPanel.jsx`   → "Custom Code" panel visible to admins only

Then:

    cd canvascore-frontend && npm install && npm run build

## 3. IMPORTANT — the data dir moves outside the web root

On first load, `config.php` automatically moves the database and the
configuration files from `canvascore-admin/data/` to **`canvascore-data/`** one
level ABOVE the web root (i.e. next to `public/`, not inside it). The migration:
- copies `canvascore.sqlite`, `settings.json`, `menu.json`, `forms.json`;
- removes the DB from the old location inside the web root;
- if the outside folder isn't writable (hosting that blocks writes above the
  docroot), it stays in `data/` with the protective `.htaccess`.

Typical resulting structure:

    yoursite/
    ├── canvascore-data/        ← DB and config, NOT reachable from the web
    │   └── canvascore.sqlite
    └── public/                 ← web root
        ├── index.html
        ├── uploads/
        └── canvascore-admin/

If your web root isn't `public/` but the domain root, check where
`canvascore-data/` ends up and that it can't be reached via URL.

## 4. Nginx — protecting data and uploads

The `.htaccess` files only apply on Apache. On **Nginx** add to the server block:

    # Deny any direct access to the data folder (in case it stays in the web root)
    location ~* /canvascore-admin/data/ { deny all; return 404; }

    # Block execution of scripts uploaded as "images"
    location ~* /uploads/.*\.(php|phtml|phar|pl|py|cgi|sh)$ { deny all; return 404; }

If `canvascore-data/` is outside the web root (the default after the migration)
it can't be reached via URL and the first rule is just a safety net.

## 5. What was hardened

- **CSRF**: token bound to the session, sent by the client in the
  `X-CSRF-Token` header (injected automatically by `apiClient.js`). Every POST
  that changes state requires it; there's also a same-origin check.
  Tested: POST without token → 403; foreign Origin → 403.
- **Session**: `HttpOnly`, `SameSite=Lax` cookie, `Secure` over HTTPS; ID
  regenerated on login.
- **Forced password change**: the default admin (admin/admin) must set a new
  password (min 8 characters) on first access. This also applies to existing
  installations still using admin/admin.
- **Stored XSS**: rich-text content (text, hero, image+text, grid, cards, form
  title) goes through an allow-list sanitizer that removes
  `<script>`/`<iframe>`, `on*` handlers, `javascript:` URLs and
  `url(javascript:)` in styles. Custom CSS can no longer break out of the
  `<style>` tag.
- **"Code" blocks restricted to admins**: users with the *editor* role can no
  longer save HTML blocks or custom CSS — they're stripped server-side,
  regardless of the interface (the buttons are hidden for them anyway).
- **Safe form email**: the recipient no longer travels in the client. The build
  writes a `forms.json` registry (form id → email) and `submit_form.php`
  resolves the recipient from there, falling back to the global email. No more
  open relay, and per-form recipients are supported again.

## 6. Notes

- The sanitizer uses `ext-dom` (DOMDocument), available on virtually all PHP
  hosting. Without it there's a more conservative regex fallback.
- The "HTML" block remains a powerful tool for **admins** (like WordPress's
  Custom HTML / Elementor's HTML widget): it is trusted code by definition. For
  this reason it's reserved for admins and unavailable to editors.

## 7. Next steps (Phase 2 — foundations for scaling)

Not security, but technical debt to pay off before adding many features:
design tokens + UI library (replacing inline styles), a single block schema with
rendering shared between editor and compiler (duplicated today), bundle
code-splitting, reproducible dependency versions, LICENSE + README + tests.
