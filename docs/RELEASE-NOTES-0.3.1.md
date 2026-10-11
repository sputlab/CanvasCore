# CanvasCore 0.3.1 — Menu Builder fixes and polish

## Files to replace
Backend: `canvascore-admin/compiler.php`, `api.php`, `version.json`
Frontend: `src/components/MenuBuilder.jsx`
Plus: `CHANGELOG.md`
→ then `cd canvascore-frontend && npm run build`

## Bugs fixed
1. **Menu colors** (text, hover text/background) did not change: they were
   overridden by global template rules with higher specificity. The menu rules
   are now prefixed with `.cc-navigation` and win.
2. **Sticky** not working: the template's `body { overflow-x: clip }` breaks
   `position: sticky`. The sticky menu now uses `position: fixed` and stays at
   the top (with automatic compensation for the content height).
3. **Glare** clipped the submenus: the glow now lives on a dedicated overlay
   clipped to the bar only; dropdowns are no longer cut off.

## Additions
- **Item border**: dropdown with presets (none/thin/solid/dashed/dotted) +
  Custom.
- **Item radius**: adjustable with the ↑/↓ arrow keys.
- **Logo**: besides pasting the URL, you can now **upload** the image with a
  button; the file is saved in /uploads and is therefore available in the
  Media Manager. The upload endpoint now returns the file URL.

## Note
After updating, hard refresh (Ctrl/Cmd+Shift+R). If you already had a saved
menu, open it and save it again to apply the style fixes.
