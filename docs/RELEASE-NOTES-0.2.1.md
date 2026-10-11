# CanvasCore 0.2.1 — editor role fix + CSRF lifecycle

## Files to replace
- `canvascore-admin/api.php`
- `canvascore-admin/version.json`
- `CHANGELOG.md`

(No frontend rebuild is strictly required: the changes are backend-only.
If you want to update the build number shown, run `npm run build` anyway.)

## What changes
1. **Forced password change for new users.** `add_user` now sets
   `must_change_pw=1`: on first login the new editor/admin must choose a new
   password. A password reset from the Account area (`force_password`) also
   forces a change at the user's next login.

2. **Robust CSRF when switching users.** Login aligns the `cc_csrf` double-submit
   cookie with the freshly generated session token, and logout deletes it. So
   when switching from one user to another in the same browser, no "old" token
   is left behind that could cause POST requests to be rejected (page save,
   image upload, etc.).

## Note on bug 2 (some dashboard functions)
In server-side tests all editor operations (create page, save menu, delete
media) work correctly: it is not a permissions block. The most likely cause of
"some POSTs fail after signing in as a different user" is precisely the stale
CSRF token, now fixed by point 2.

After updating: **log out and log in again**, then hard refresh
(Ctrl/Cmd+Shift+R). If a function still fails, open DevTools → Network and look
at the response of the failing call (`save_page` or `upload_media`): the message
will state the exact cause (e.g. "Invalid CSRF token").
