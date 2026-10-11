# CanvasCore 0.10.1 — "Archived" state fix

## Files to REPLACE
Backend: `canvascore-admin/api.php`, `version.json`
Frontend: `src/components/Collections.jsx`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

(No DB migration.)

## What wasn't working
The flag was written correctly from the list, but:
1. the item editor **didn't load it** → the "Archived" checkbox started out
   empty, and the first save from the editor sent `archived: 0`, wiping the state
   (which is why it wasn't kept "after leaving and coming back");
2. a save that **didn't include** the flag reset it;
3. the toggle in the list used JS truthiness: with the string value `"0"`
   (which some PHP versions return) it never archived.

## What changes
- The editor loads the real value: the checkbox reflects the state and keeps it.
- The backend **preserves** the saved value if the flag isn't sent.
- `get_item`/`get_items` always return an integer; the toggle compares
  numerically. Archive and restore work in both directions.
- After archiving/restoring from the list a notice appears with **Publish now**:
  public Collection Lists update on the next publish (I don't republish
  automatically, so as not to push unconfirmed changes online).

## Verified (on the real api.php)
Archive from the list → editor opens and saves → the flag stays; a save that
omits the flag → it stays; restore from the list → back to 0; uncheck in the
editor → 0; string values "0"/"1" handled. Before the fix, the "editor saves" and
"save without flag" steps reset the flag.
