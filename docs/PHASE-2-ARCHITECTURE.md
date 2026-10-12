# CanvasCore — Phase 2: single rendering contract + automatic versioning

> **Historical note.** This describes the project as it was at that phase. For the current architecture see
> the [Developer Guide](manuals/DEVELOPER-GUIDE.md).

Version: **0.2.0** (automatic incremental build number).

This round sets up the definitive architecture for editor ↔ compiled page
consistency, plus the automatic version bump.

## NEW files
- `canvascore-admin/blocks.json` — block defaults (single source of truth).
- `canvascore-frontend/scripts/bump.mjs` — automatic build number bump.
- `canvascore-frontend/src/render/renderBlock.mjs` — canonical renderer in JS.
- `canvascore-frontend/tests/parity.mjs` — JS ↔ PHP parity test.
- `canvascore-frontend/tests/render_php.php` — test helper (render via the compiler).

## Files to REPLACE
Backend: `canvascore-admin/version.json`, `config.php`, `compiler.php`
Frontend: `package.json`, `vite.config.js`, `src/store/useStore.js`,
`src/components/PageManager.jsx`
Plus, in the root: `CHANGELOG.md`.

After updating:
```
cd canvascore-frontend
npm install        # brings in cheerio (devDependency for the parity test)
npm run build      # prebuild auto-increments the build number
npm run test:parity
```

## 1. Automatic versioning
`version.json` now has `build` and `built`. On every `npm run build`, the
`prebuild` hook runs `scripts/bump.mjs`, which increments `build` and stamps
`built`. The semantic version (`app`) remains the source of truth for releases
and is bumped by hand when cutting a version (see VERSIONING.md). The panel
shows `v<app> · build <n>`, so you always know where you are.

## 2. Single rendering contract (foundations)
Long-standing problem: the editor (React) and the compiled page (PHP) were two
separate renderers that drifted apart (buttons, slider, etc.).

Since the two runtimes are different (editor in the browser, static build in PHP
on the server), they can't share the same code at runtime. The architecture
adopted — the standard for cross-runtime parity — is:

1. **A single source of truth for block defaults**: `blocks.json`, read by the
   editor (injected by Vite) and by PHP (`cc_block_defaults()`). No more
   duplicated defaults drifting apart.
2. **A canonical renderer** (`renderBlock.mjs`) that describes, once, in plain
   JS, how each block becomes HTML. The PHP compiler mirrors it.
3. **An automatic check** (`npm run test:parity`) that renders the same fixtures
   with the JS renderer and the PHP compiler and compares **structure and
   styles**, failing on any divergence. This is the guarantee: not "the same
   code", but "code proven identical".

The test compares the box and the layout styles (where bugs such as
alignment/aspect-ratio originate), ignoring the inner rich text (sanitized
server-side) and the behavior nodes `<script>`/`<style>` (autoplay, media
queries), which are each renderer's own business.

On its very first run the test found, and got fixed, a real bug: ICON_BOX had a
duplicated `style` attribute in the compiler, which made the text alignment
ineffective.

Current status: **19/19 blocks in parity.**

## How to add/change a block while keeping parity
1. Update the defaults in `blocks.json`.
2. Update the rendering in `renderBlock.mjs` (JS) and in `compiler.php` (PHP).
3. Add/update a fixture in `tests/parity.mjs`.
4. `npm run test:parity` must stay green before committing.

## Next step
Wire the editor to `renderBlock.mjs`: in the "not selected" state every block
will be shown with the canonical HTML (parity with the compiled page
guaranteed), while keeping the interactive overlays (inline text editing, media
picker, DnD) in the "selected" state. With parity already verified by the test,
this step becomes low-risk and will also close the last button-alignment
differences in the preview.
