# CanvasCore 0.12.0 — Session expired: your work is safe

## What it fixes
Before, if the session expired while you were working, nothing happened until you tried to save; at
that point "Draft saved!" could appear even though nothing had been saved, or you were taken back to
the login and lost your state. Now:

1. **Expiry is predictable**: the server enforces it after N minutes of inactivity (default 30).
   Working in the interface counts as activity.
2. **You notice straight away**, not when saving: even when returning to a tab left in the background.
   Shortly before expiry a notice appears with "Stay signed in".
3. **The login appears on top of the app**, which stays intact: after signing in you pick up exactly
   where you were.
4. **The interrupted save is completed** by itself after login (only once).
5. **Automatic local backup** of unsaved work: even after a refresh or a closed tab you get it back
   ("Unsaved work found" → Restore/Discard).
6. **No more false successes**: the outcome of Save/Publish is the real one.

## NEW files
- `canvascore-frontend/src/session/` (drafts, draftTrackers, sessionManager, fetchGuard, runtime, hooks)
- `src/components/` SessionExpiredOverlay, SessionWarning, DraftRestorePrompt, EditorDraftStatus
- `tests/session.mjs`, `tests/session-ui.mjs`, `tests/stubs/jodit-react.jsx`

## Files to REPLACE
Backend: `canvascore-admin/config.php`, `api.php`, `rebuild_all.php`, `version.json`
Frontend: `package.json`, `src/apiClient.js`, `src/App.jsx`, `src/store/useStore.js`,
`src/components/Login.jsx`, `VisualEditor.jsx`, `MenuBuilder.jsx`, `GlobalSettings.jsx`
Plus `CHANGELOG.md`.

```
cd canvascore-frontend
npm install     # no new dependencies compared with 0.11.0 (jsdom was already there)
npm run build
npm test
```
No DB migration.

## Before you update
- **All users will have to log in again once**: sessions move to a dedicated folder
  (`<data dir>/sessions`, permissions 0700). On Nginx the data dir should already be protected as per
  the earlier instructions; no new rules are needed.
- **Timeout**: Global Options → Security → "Session timeout" (5–720 minutes).
- Backups live in the browser, **per user**: they don't follow the user to another device and are
  deleted after 14 days. If the browser blocks localStorage or it is full, the interface says so
  (in that case don't close the tab: the work is still in the window).
- There is no conflict detection: if someone else edits the same page in the meantime,
  the last save wins (as before).
- If a different user signs in at expiry, the tab reloads from scratch and does nothing on their behalf.

## How it was verified
- Server, on the real `api.php` with a simulated clock: exact expiry (1799 s yes, 1801 s no), `session_status`
  not extending the session, `keepalive`, 401 before CSRF, configurable and bounded timeout.
- Client: 150 checks on backups, trackers, the manager (hours of simulated session), the fetch guard.
- Integration: the real `App` in jsdom against a fake backend (49 checks): I type, the session expires,
  I press Save → login on top of the app → re-login → the save happens exactly once with the new token.
- **Mutation testing**: bugs planted on purpose, all caught. It revealed flaws in my own tests and a
  real bug (one user's work could end up in another user's backup).

## Not verified
The real look in an actual browser (in particular the behavior of the `inert` attribute that blocks
the app behind the login) and running on real hosting. In particular, try this: leave a tab idle past
the timeout, then come back to it and press Save.
