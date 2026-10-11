# CanvasCore 0.8.1 — enable/disable and delete Header/Footer

## Files to REPLACE
Backend: `canvascore-admin/api.php`, `rebuild_all.php`, `version.json`
Frontend: `src/components/GlobalSettings.jsx`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

## What changes
In **Global Options** there is a new "Global Header & Footer" section with, for
both the header and the footer:
- an **Enabled** switch (when off, that part is not shown on any page, but its
  blocks stay saved);
- **Edit** (opens the editor on that part);
- **Delete** (deletes all the blocks of that part — this was what was missing).

Remember to save the Global Options after changing the switches (saving
republishes the site). Delete republishes automatically.

## Verified
delete_part removes the part; the enabled flags correctly suppress rendering
(default = shown). Build and lint green.
