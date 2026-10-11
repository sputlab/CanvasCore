# CanvasCore — Saving fix (post Phase 1)

On upgraded (non-clean) installations saves could fail while reads worked. Two
causes, both fixed in `config.php` (+ a small tweak to `apiClient.js`).

## Files to replace
- `canvascore-admin/config.php`
- `canvascore-frontend/src/apiClient.js`  → then `npm run build`

## What was fixed

1) **Robust CSRF (double submit).** Your session was created before Phase 1:
   with the changed cookie parameters, the token in the session could stop being
   visible in the save request → 403 on every POST. The token now also travels
   in a `cc_csrf` cookie (SameSite=Lax) and the check accepts a match on the
   session OR on the cookie. It's safe (SameSite + same-origin) and no longer
   depends on the session persisting perfectly.
   I also removed the strict Origin block (false positives behind proxies/CDNs):
   the defence stays solid thanks to token + SameSite.

2) **Data dir with a real write test + two-way migration.** If the outside
   `canvascore-data/` folder was readable but not writable by the web server
   user, reads worked and writes didn't. The data location is now chosen with an
   actual write test and, if needed, the data is moved back automatically to
   where it can be written (even returning to `canvascore-admin/data/`, protected
   by .htaccess). No data is lost.

## IMPORTANT after updating
- Rebuild the frontend (`npm run build`) and **reload with a hard refresh**
  (Ctrl/Cmd+Shift+R) to download the new bundle: if the browser still serves the
  old JS, saves will fail anyway because the old code doesn't send the CSRF
  token.
- If a save still fails, open the developer tools → Network and look at the
  `save_page` response: the message states the exact cause
  ("Invalid CSRF token" = old bundle in cache / missing token).
