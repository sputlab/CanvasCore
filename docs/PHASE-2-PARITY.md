# CanvasCore — Phase 2 (pass 1): editor ↔ compiled page parity

> **Historical note.** This describes the project as it was at that phase. For the current architecture see
> the [Developer Guide](manuals/DEVELOPER-GUIDE.md).

Goal: reduce the discrepancies between the editor canvas (React, `SortableBlock.jsx`)
and the compiled page (PHP, `compiler.php`). This is the first step towards the
single block schema.

## Files to replace
Backend: `canvascore-admin/compiler.php`
Frontend: `src/components/SortableBlock.jsx`, `src/components/PropertyPanel.jsx`
→ then `npm run build`.

No data format change: `content_schema` stays 1 (the new `aspectRatio` /
`objectPosition` fields are optional, with backward-compatible defaults).

## Reported issues — resolved

### 1. Button: missing/different alignment and ignored padding/borders
Two causes:
- **Different structures.** The compiler aligned via the container
  (`text-align`) and an `inline-block` button (correct); the editor rendered a
  full-width button with the styles applied twice, so alignment had no effect.
- **Style order.** With `useGlobal` on (the default) the compiler added the
  global styles *after* yours, overriding edited padding/borders.

Fix (identical in both renderers): container with `text-align` + `margin`,
`inline-block` button; global styles applied **first**, user styles **after**
(so they win). Margin and text-align are no longer applied twice.

### 2. Slider/images: the first image's ratio constrained the others
Cause: slides had `height:auto`, so the first image dictated the box height.

Fix: the slider now has a **box with a defined ratio** (`aspect-ratio`, default
16:9, configurable) and every image fills it with `object-fit:cover` +
`object-position`. This way all images show the same frame with the correct
zoom, whatever their own ratio. If you set an explicit height on the block, it
takes precedence over the ratio.

The **IMAGE** block now also has `aspectRatio` (default Auto) +
`object-position`, so a single image can be framed/zoomed consistently.

New panel controls: Aspect Ratio, Image Fit, Focus/Object Position for Slider
and Image.

## Other divergences found in the audit and fixed
- **VIDEO**: the editor used a naive URL split; it now uses the same robust
  parsing as the compiler (YouTube/Vimeo), so the preview matches.
- **HERO**: the preview's `min-height` ended up only on the outer wrapper, not on
  the flex container that centers vertically; it's now applied as in the
  compiler.

## Verified
- Global `box-sizing: border-box` already present in `master.html`: padding and
  widths are computed the same way in both renderers (no divergence).
- All 19 block types are rendered by the compiler without errors.
- Clean frontend build.

## Remaining divergences (preview-only, acceptable)
Some blocks, by their nature, show a preview in the editor that differs from the
final output, with no impact on the published result:
- **MAPS**: a placeholder in the editor, the real Google Maps iframe on the page.
- **FORM**: disabled fields in the editor (preview), the real form on the page.
- **VIDEO**: clicks are disabled in the editor preview.

## Next step (pass 2): single block schema
One underlying structural divergence remains: the editor uses a drag & drop
wrapper that carries width/margin, while the compiler applies all styles to a
single element. Today the two results match (thanks to global `box-sizing` and
the alignments above), but every new block still needs two implementations kept
in sync by hand.

Pass 2 will introduce a **single rendering contract**: a shared block description
(type + root style + inner markup) from which editor and compiler produce the
same HTML by construction, with a test suite comparing the two outputs block by
block. It will also be the first candidate for a `content_schema` → 2
migration.
